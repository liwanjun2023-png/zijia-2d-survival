import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 8767);
const rooms = new Map();
const roomEvents = new Map();
const worldEvents = new Map();
const voiceSignals = new Map();
const sockets = new Set();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 262144) throw new Error("body too large");
  }
  return JSON.parse(body || "{}");
}

function cleanRoom(room) {
  const players = rooms.get(room);
  if (!players) return [];
  const now = Date.now();
  for (const [id, player] of players) {
    if (now - player.lastSeen > 7000) players.delete(id);
  }
  if (players.size === 0) rooms.delete(room);
  return players ? [...players.values()] : [];
}

function pushBlockEvents(room, events) {
  if (!Array.isArray(events) || events.length === 0) return;
  if (!roomEvents.has(room)) roomEvents.set(room, { seq: 0, events: [] });
  const bucket = roomEvents.get(room);
  for (const event of events.slice(0, 80)) {
    bucket.seq += 1;
    bucket.events.push({
      seq: bucket.seq,
      by: String(event.by || "").slice(0, 40),
      worldCol: Number.isFinite(Number(event.worldCol)) ? Number(event.worldCol) : Number(event.col) || 0,
      col: Number(event.col) || 0,
      row: Number(event.row) || 0,
      type: event.type ? String(event.type).slice(0, 32) : null,
      placed: !!event.placed,
    });
  }
  if (bucket.events.length > 1200) bucket.events.splice(0, bucket.events.length - 1200);
}

function getBlockEvents(room, since, selfId) {
  const bucket = roomEvents.get(room);
  if (!bucket) return { seq: 0, events: [] };
  const seq = Number(since) || 0;
  return {
    seq: bucket.seq,
    events: bucket.events.filter((event) => event.seq > seq && event.by !== selfId).slice(-220),
  };
}

function pushWorldEvents(room, events) {
  if (!Array.isArray(events) || events.length === 0) return;
  if (!worldEvents.has(room)) worldEvents.set(room, { seq: 0, events: [] });
  const bucket = worldEvents.get(room);
  for (const event of events.slice(0, 20)) {
    bucket.seq += 1;
    bucket.events.push({
      seq: bucket.seq,
      by: String(event.by || "").slice(0, 40),
      kind: String(event.kind || "time").slice(0, 24),
      dimension: event.dimension === "nether" ? "nether" : "overworld",
      isNight: !!event.isNight,
      phase: Number(event.phase) || 1,
      phaseTimer: Math.max(0, Math.min(300, Number(event.phaseTimer) || 0)),
      spawnTimer: Math.max(0, Number(event.spawnTimer) || 0),
    });
  }
  if (bucket.events.length > 300) bucket.events.splice(0, bucket.events.length - 300);
}

function getWorldEvents(room, since, selfId) {
  const bucket = worldEvents.get(room);
  if (!bucket) return { seq: 0, events: [] };
  const seq = Number(since) || 0;
  return {
    seq: bucket.seq,
    events: bucket.events.filter((event) => event.seq > seq && event.by !== selfId).slice(-80),
  };
}

function signalKey(room, id) {
  return `${room}:${id}`;
}

function makePlayer(data, id, room) {
  return {
    id,
    room,
    x: Number(data.x) || 0,
    y: Number(data.y) || 0,
    vx: Number(data.vx) || 0,
    vy: Number(data.vy) || 0,
    t: Number(data.t) || Date.now(),
    serverAt: Date.now(),
    downed: !!data.downed,
    carriedBy: String(data.carriedBy || "").slice(0, 40),
    carryingId: String(data.carryingId || "").slice(0, 40),
    hp: Number(data.hp) || 0,
    armor: Number(data.armor) || 0,
    facing: Number(data.facing) || 1,
    dimension: data.dimension === "nether" ? "nether" : "overworld",
    mode: data.mode === "creative" ? "creative" : "survival",
    pick: String(data.pick || "none").slice(0, 16),
    ranged: !!data.ranged,
    diamondArmor: !!data.diamondArmor,
    sword: String(data.sword || "none").slice(0, 16),
    lastSeen: Date.now(),
  };
}

function encodeWs(data) {
  const payload = Buffer.from(JSON.stringify(data));
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  return Buffer.concat([Buffer.from([0x81, 126, payload.length >> 8, payload.length & 255]), payload]);
}

function sendWs(client, data) {
  if (client.socket.destroyed) return;
  client.socket.write(encodeWs(data));
}

function broadcastPeer(client, player) {
  const { lastSeen, ...peer } = player;
  for (const other of sockets) {
    if (other !== client && other.room === player.room) sendWs(other, { type: "peer", peer });
  }
}

function broadcastRoomPeers() {
  const now = Date.now();
  const byRoom = new Map();
  for (const client of sockets) {
    if (!client.room || !client.id) continue;
    if (!byRoom.has(client.room)) byRoom.set(client.room, []);
    byRoom.get(client.room).push(client);
  }
  for (const [room, clients] of byRoom) {
    const players = cleanRoom(room).map(({ lastSeen, ...peer }) => ({ ...peer, serverT: now }));
    for (const client of clients) {
      const peers = players.filter((peer) => peer.id !== client.id);
      sendWs(client, { type: "peers", peers, at: now });
    }
  }
}

function handleWsMessage(client, data) {
  if (data.type === "ping") {
    sendWs(client, { type: "pong", clientT: Number(data.clientT) || 0, serverT: Date.now() });
    return;
  }
  if (data.type !== "move") return;
  const id = String(data.id || "").slice(0, 40);
  const room = String(data.room || "zijia").slice(0, 40);
  if (!id) return;
  client.id = id;
  client.room = room;
  if (!rooms.has(room)) rooms.set(room, new Map());
  const player = makePlayer(data, id, room);
  rooms.get(room).set(id, player);
}

function decodeWsFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);
  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (client.buffer.length < 4) return;
      length = client.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      client.socket.end();
      return;
    }
    const maskOffset = offset;
    if (masked) offset += 4;
    if (client.buffer.length < offset + length) return;
    const payload = Buffer.from(client.buffer.subarray(offset, offset + length));
    if (masked) {
      const mask = client.buffer.subarray(maskOffset, maskOffset + 4);
      for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
    }
    client.buffer = client.buffer.subarray(offset + length);
    if (opcode === 0x8) {
      client.socket.end();
      return;
    }
    if (opcode === 0x9) {
      client.socket.write(Buffer.from([0x8a, 0]));
      continue;
    }
    if (opcode !== 0x1) continue;
    try {
      handleWsMessage(client, JSON.parse(payload.toString("utf8")));
    } catch {
      // Ignore malformed real-time packets; HTTP sync remains the fallback.
    }
  }
}

function handleUpgrade(req, socket) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (url.pathname !== "/ws/multiplayer") return socket.destroy();
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));
  const client = { socket, id: "", room: "", buffer: Buffer.alloc(0) };
  sockets.add(client);
  socket.on("data", (chunk) => decodeWsFrames(client, chunk));
  socket.on("close", () => sockets.delete(client));
  socket.on("error", () => sockets.delete(client));
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/multiplayer/state" && req.method === "POST") {
    const data = await readJson(req);
    const id = String(data.id || "").slice(0, 40);
    const room = String(data.room || "zijia").slice(0, 40);
    if (!id) return json(res, 400, { ok: false, error: "missing id" });
    pushBlockEvents(room, (data.blockEvents || []).map((event) => ({ ...event, by: id })));
    pushWorldEvents(room, (data.worldEvents || []).map((event) => ({ ...event, by: id })));
    if (!rooms.has(room)) rooms.set(room, new Map());
    const player = makePlayer(data, id, room);
    for (const other of rooms.get(room).values()) if (other.carriedBy === id) other.carriedBy = "";
    rooms.get(room).set(id, player);
    if (player.carryingId && rooms.get(room).has(player.carryingId)) rooms.get(room).get(player.carryingId).carriedBy = id;
    if (data.reviveTargetId && rooms.get(room).has(String(data.reviveTargetId))) {
      const target = rooms.get(room).get(String(data.reviveTargetId));
      target.hp = 20;
      target.downed = false;
      target.carriedBy = "";
    }
    const players = cleanRoom(room);
    const hostId = players.map((peer) => peer.id).sort()[0] || id;
    const peers = players
      .filter((peer) => peer.id !== id)
      .map(({ lastSeen, ...peer }) => peer);
    const blockFeed = getBlockEvents(room, data.sinceBlockSeq, id);
    const worldFeed = getWorldEvents(room, data.sinceWorldSeq, id);
    const { lastSeen, ...self } = rooms.get(room).get(id) || player;
    return json(res, 200, { ok: true, id, room, hostId, self, peers, blockSeq: blockFeed.seq, blockEvents: blockFeed.events, worldSeq: worldFeed.seq, worldEvents: worldFeed.events });
  }

  if (url.pathname === "/api/voice/signal" && req.method === "POST") {
    const data = await readJson(req);
    const room = String(data.room || "zijia").slice(0, 40);
    const from = String(data.from || "").slice(0, 40);
    const to = String(data.to || "").slice(0, 40);
    if (!from || !to || !data.signal) return json(res, 400, { ok: false, error: "bad signal" });
    const key = signalKey(room, to);
    if (!voiceSignals.has(key)) voiceSignals.set(key, []);
    voiceSignals.get(key).push({ from, signal: data.signal, at: Date.now() });
    if (voiceSignals.get(key).length > 120) voiceSignals.get(key).splice(0, voiceSignals.get(key).length - 120);
    return json(res, 200, { ok: true });
  }

  if (url.pathname === "/api/voice/poll" && req.method === "POST") {
    const data = await readJson(req);
    const room = String(data.room || "zijia").slice(0, 40);
    const id = String(data.id || "").slice(0, 40);
    if (!id) return json(res, 400, { ok: false, error: "missing id" });
    const key = signalKey(room, id);
    const messages = voiceSignals.get(key) || [];
    voiceSignals.set(key, []);
    return json(res, 200, { ok: true, messages });
  }

  if (url.pathname === "/api/multiplayer/status") {
    const counts = {};
    for (const room of rooms.keys()) counts[room] = cleanRoom(room).length;
    return json(res, 200, { ok: true, rooms: counts });
  }

  json(res, 404, { ok: false, error: "not found" });
}

async function handleStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not file");
    res.writeHead(200, {
      "Content-Type": mime[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await handleStatic(req, res, url);
  } catch (error) {
    json(res, 500, { ok: false, error: error.message });
  }
});

server.on("upgrade", handleUpgrade);

setInterval(broadcastRoomPeers, 50);

server.listen(port, "0.0.0.0", () => {
  console.log(`2D survival multiplayer server running at http://127.0.0.1:${port}/`);
});
