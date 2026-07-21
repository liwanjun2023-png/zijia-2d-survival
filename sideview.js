const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  hpMeter: document.querySelector("#hpMeter"),
  armorMeter: document.querySelector("#armorMeter"),
  staminaMeter: document.querySelector("#staminaMeter"),
  hpText: document.querySelector("#hpText"),
  armorText: document.querySelector("#armorText"),
  staminaText: document.querySelector("#staminaText"),
  phaseText: document.querySelector("#phaseText"),
  dayText: document.querySelector("#dayText"),
  clockText: document.querySelector("#clockText"),
  toolText: document.querySelector("#toolText"),
  rangedText: document.querySelector("#rangedText"),
  multiplayerText: document.querySelector("#multiplayerText"),
  message: document.querySelector("#message"),
  sharePanel: document.querySelector("#sharePanel"),
  roomCodeInput: document.querySelector("#roomCodeInput"),
  copyRoomBtn: document.querySelector("#copyRoomBtn"),
  copyLinkBtn: document.querySelector("#copyLinkBtn"),
  hideShareBtn: document.querySelector("#hideShareBtn"),
  startOverlay: document.querySelector("#startOverlay"),
  pauseBtn: document.querySelector("#pauseBtn"),
  woodText: document.querySelector("#woodText"),
  plankText: document.querySelector("#plankText"),
  dirtText: document.querySelector("#dirtText"),
  leafText: document.querySelector("#leafText"),
  stoneText: document.querySelector("#stoneText"),
  coalText: document.querySelector("#coalText"),
  ironOreText: document.querySelector("#ironOreText"),
  ironIngotText: document.querySelector("#ironIngotText"),
  diamondText: document.querySelector("#diamondText"),
  glassText: document.querySelector("#glassText"),
  brickText: document.querySelector("#brickText"),
  flowerBrickText: document.querySelector("#flowerBrickText"),
  lanternText: document.querySelector("#lanternText"),
  bannerText: document.querySelector("#bannerText"),
  woolText: document.querySelector("#woolText"),
  stringText: document.querySelector("#stringText"),
  rottenText: document.querySelector("#rottenText"),
  furnaceText: document.querySelector("#furnaceText"),
  doorText: document.querySelector("#doorText"),
  bedText: document.querySelector("#bedText"),
  campfireText: document.querySelector("#campfireText"),
  bucketText: document.querySelector("#bucketText"),
  waterBucketText: document.querySelector("#waterBucketText"),
  lavaBucketText: document.querySelector("#lavaBucketText"),
  fireballText: document.querySelector("#fireballText"),
  portalText: document.querySelector("#portalText"),
  toggleInventoryBtn: document.querySelector("#toggleInventoryBtn"),
  survivalBtn: document.querySelector("#survivalBtn"),
  creativeBtn: document.querySelector("#creativeBtn"),
  multiplayerBtn: document.querySelector("#multiplayerBtn"),
  newMultiplayerBtn: document.querySelector("#newMultiplayerBtn"),
  adminRoleBtn: document.querySelector("#adminRoleBtn"),
  guestRoleBtn: document.querySelector("#guestRoleBtn"),
  teleportPeerBtn: document.querySelector("#teleportPeerBtn"),
  voiceBtn: document.querySelector("#voiceBtn"),
};

const TILE = 32;
let COLS = 92;
const ROWS = 92;
const SURFACE = 27;
let WORLD_W = COLS * TILE;
let WORLD_ORIGIN_COL = 0;
const WORLD_H = ROWS * TILE;
const PHASE_SECONDS = 300;
const SAVE_PREFIX = "zijia-mining-survival-save";
const SAVE_KEY = "zijia-mining-survival-save-v1";
const MOBILE_KEYS_KEY = "zijia-mobile-key-layout-v1";
const ROLE_KEY = "zijia-multiplayer-role-v1";
const view = { w: 0, h: 0 };
const camera = { x: 0, y: 0 };
const keys = new Set();
const mouse = { x: 0, y: 0, down: false };
const mobileTap = { a: 0, d: 0, sprintTimer: 0 };
const mobileKeyEditor = { editing: false, drag: null };
const touchAction = { timer: 0, mining: false, moved: false };
const tiles = [];
const structures = [];
const enemies = [];
const animals = [];
const bolts = [];
const particles = [];
const remotePlayers = new Map();
const isTouchDevice = matchMedia("(hover: none), (pointer: coarse)").matches;
const perf = {
  low: localStorage.getItem("zijia-low-quality") !== "0",
};
let lastUiUpdate = 0;
const skyCache = { key: "", fill: "#77a7c6" };
let messageTimer = 0;
let entityIdCounter = 1;

const multiplayer = {
  enabled: false,
  online: false,
  inFlight: false,
  lastSync: 0,
  lastWsSend: 0,
  lastPing: 0,
  lastEntitySync: 0,
  lastMoveSent: null,
  serverOffset: 0,
  latency: 120,
  jitter: 40,
  lastPeerPacketAt: 0,
  ws: null,
  wsConnecting: false,
  hostId: "",
  room: new URLSearchParams(location.search).get("room") || "zijia",
  id: `p-${Math.random().toString(36).slice(2, 10)}`,
  blockSeq: 0,
  worldSeq: 0,
  pendingBlockEvents: [],
  pendingWorldEvents: [],
  role: localStorage.getItem(ROLE_KEY) === "admin" ? "admin" : "guest",
};

const voice = {
  enabled: false,
  stream: null,
  peers: new Map(),
  lastPoll: 0,
};

const p2p = {
  peers: new Map(),
};

const tileInfo = {
  grass: { name: "泥土", color: "#5f7a42", hp: 3, req: 0, drop: "dirt", amount: [1, 1] },
  dirt: { name: "泥土", color: "#7b5a38", hp: 3, req: 0, drop: "dirt", amount: [1, 1] },
  wood: { name: "树木", color: "#7a5130", hp: 4, req: 0, drop: "wood", amount: [1, 2] },
  leaf: { name: "树叶", color: "#3f8a4d", hp: 2, req: 0, drop: "leaf", amount: [1, 1] },
  plank: { name: "木板", color: "#b9824f", hp: 4, req: 0, drop: "plank", amount: [1, 1] },
  glass: { name: "玻璃", color: "rgba(139, 211, 226, .58)", hp: 2, req: 0, drop: "glass", amount: [1, 1] },
  brick: { name: "石砖", color: "#9a9b94", hp: 7, req: 1, drop: "brick", amount: [1, 1] },
  flowerBrick: { name: "花砖", color: "#aaa78f", hp: 6, req: 1, drop: "flowerBrick", amount: [1, 1] },
  lantern: { name: "灯笼", color: "#d49a42", hp: 2, req: 0, drop: "lantern", amount: [1, 1] },
  banner: { name: "蓝旗", color: "#3456a4", hp: 2, req: 0, drop: "banner", amount: [1, 1] },
  stone: { name: "石头", color: "#838781", hp: 6, req: 1, drop: "stone", amount: [1, 2] },
  coal: { name: "煤炭", color: "#303438", hp: 6, req: 1, drop: "coal", amount: [1, 2] },
  iron: { name: "铁矿", color: "#a96d53", hp: 8, req: 2, drop: "ironOre", amount: [1, 1] },
  diamond: { name: "钻石矿", color: "#50c6d2", hp: 10, req: 3, drop: "diamond", amount: [1, 1] },
  water: { name: "水", color: "rgba(60, 145, 230, .72)", hp: 1, req: 0, drop: null, amount: [0, 0], liquid: true },
  lava: { name: "岩浆", color: "#f06423", hp: 1, req: 0, drop: null, amount: [0, 0], liquid: true },
  netherrack: { name: "地狱岩", color: "#713042", hp: 5, req: 1, drop: "stone", amount: [1, 1] },
  hellstone: { name: "熔岩石", color: "#4d2632", hp: 7, req: 2, drop: "coal", amount: [1, 1] },
};

const pickPower = { none: 0, wood: 1, stone: 2, iron: 3 };
const pickNames = { none: "徒手", wood: "木镐", stone: "石镐", iron: "铁镐" };

const state = {
  started: false,
  paused: false,
  gameOver: false,
  won: false,
  downed: false,
  carriedBy: "",
  carryingId: "",
  reviveTargetId: "",
  reviveHold: 0,
  last: 0,
  isNight: false,
  phase: 1,
  phaseTimer: PHASE_SECONDS,
  spawnTimer: 0,
  attackCooldown: 0,
  rangedCooldown: 0,
  regenTimer: 0,
  placeMode: "table",
  mode: "survival",
  dimension: "overworld",
  inventoryHidden: false,
  inv: { wood: 0, plank: 0, dirt: 0, leaf: 0, stone: 0, coal: 0, ironOre: 0, ironIngot: 0, diamond: 0, glass: 0, brick: 0, flowerBrick: 0, lantern: 0, banner: 0, wool: 0, string: 0, rotten: 0, table: 0, furnace: 0, door: 0, bed: 0, campfire: 0, bucket: 0, waterBucket: 0, lavaBucket: 0, fireball: 0, portal: 0 },
};

const player = {
  x: 12 * TILE,
  y: (SURFACE - 2) * TILE,
  w: 24,
  h: 44,
  vx: 0,
  vy: 0,
  hp: 100,
  armor: 0,
  stamina: 100,
  facing: 1,
  onGround: false,
  pick: "none",
  ranged: false,
  sword: "none",
  diamondArmor: false,
  diamondBow: false,
};

function rand(min, max) { return min + Math.random() * (max - min); }
function irand(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function say(text) {
  ui.message.textContent = text;
  ui.message.classList.remove("gone");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => ui.message.classList.add("gone"), 1000);
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function multiplayerShareUrl() {
  const url = new URL(location.href);
  url.searchParams.set("room", multiplayer.room);
  url.searchParams.set("v", "admin-arrow-1");
  return url.toString();
}

function isAdmin() {
  return multiplayer.role === "admin";
}

function updateRoleUi() {
  ui.adminRoleBtn?.classList.toggle("active", isAdmin());
  ui.guestRoleBtn?.classList.toggle("active", !isAdmin());
  if (ui.teleportPeerBtn) ui.teleportPeerBtn.hidden = !multiplayer.enabled || !isAdmin();
}

function setRole(role) {
  multiplayer.role = role === "admin" ? "admin" : "guest";
  localStorage.setItem(ROLE_KEY, multiplayer.role);
  updateRoleUi();
  say(isAdmin() ? "已切换为管理员，可以按 Z 传送到队友处。" : "已切换为游客，不能使用传送。");
  sendMultiplayerMove(performance.now(), true);
}

function updateSharePanel() {
  ui.sharePanel.classList.toggle("hidden", !multiplayer.enabled || localStorage.getItem("zijia-hide-room-panel") === "1");
  ui.roomCodeInput.value = multiplayer.room;
  updateRoleUi();
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    ui.roomCodeInput.value = text;
    ui.roomCodeInput.focus();
    ui.roomCodeInput.select();
    document.execCommand("copy");
  }
  say(`${label}已复制。`);
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seedText) {
  let seed = hashString(seedText) || 1;
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
}

function seededInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function nextEntityId(prefix) {
  entityIdCounter += 1;
  return `${prefix}-${entityIdCounter}`;
}

function resize() {
  const dpr = perf.low ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
  const rect = canvas.getBoundingClientRect();
  view.w = rect.width;
  view.h = rect.height;
  canvas.width = Math.floor(view.w * dpr);
  canvas.height = Math.floor(view.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeTile(type, placed = false) {
  return { type, hp: tileInfo[type].hp, placed };
}

function isSolidTile(tile) {
  return tile && !tileInfo[tile.type]?.liquid;
}

function isLiquidTile(tile, type) {
  return tile && tileInfo[tile.type]?.liquid && (!type || tile.type === type);
}

function tileAt(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return makeTile("stone");
  return tiles[row]?.[col] || null;
}

function setTile(col, row, tile) {
  if (col >= 0 && row >= 0 && col < COLS && row < ROWS) tiles[row][col] = tile;
}

function localToWorldX(x) {
  return x + WORLD_ORIGIN_COL * TILE;
}

function worldToLocalX(x) {
  return x - WORLD_ORIGIN_COL * TILE;
}

function queueBlockChange(col, row, tile) {
  if (!multiplayer.enabled || !state.started) return;
  multiplayer.pendingBlockEvents.push({
    worldCol: WORLD_ORIGIN_COL + col,
    col,
    row,
    type: tile?.type || null,
    placed: !!tile?.placed,
  });
  if (multiplayer.pendingBlockEvents.length > 160) multiplayer.pendingBlockEvents.splice(0, multiplayer.pendingBlockEvents.length - 160);
}

function applyRemoteBlockEvents(events) {
  for (const event of events || []) {
    if (typeof event.seq === "number") multiplayer.blockSeq = Math.max(multiplayer.blockSeq, event.seq);
    const worldCol = Number.isFinite(Number(event.worldCol)) ? Number(event.worldCol) : Number(event.col) + WORLD_ORIGIN_COL;
    if (event.row < 0 || event.row >= ROWS) continue;
    while (worldCol < WORLD_ORIGIN_COL) extendWorldLeft(24);
    while (worldCol >= WORLD_ORIGIN_COL + COLS) extendWorldRight(24);
    const localCol = worldCol - WORLD_ORIGIN_COL;
    if (localCol < 0 || localCol >= COLS) continue;
    setTile(localCol, event.row, event.type ? makeTile(event.type, !!event.placed) : null);
  }
}

function queueWorldTime(kind = "time") {
  if (!multiplayer.enabled || !state.started || state.dimension !== "overworld") return;
  multiplayer.pendingWorldEvents.push({
    kind,
    dimension: state.dimension,
    isNight: state.isNight,
    phase: state.phase,
    phaseTimer: state.phaseTimer,
    spawnTimer: state.spawnTimer,
  });
  if (multiplayer.pendingWorldEvents.length > 40) multiplayer.pendingWorldEvents.splice(0, multiplayer.pendingWorldEvents.length - 40);
}

function applyRemoteWorldEvents(events) {
  for (const event of events || []) {
    if (typeof event.seq === "number") multiplayer.worldSeq = Math.max(multiplayer.worldSeq, event.seq);
    if (event.dimension !== state.dimension || state.dimension !== "overworld") continue;
    state.isNight = !!event.isNight;
    state.phase = Math.max(state.phase, Number(event.phase) || state.phase);
    state.phaseTimer = clamp(Number(event.phaseTimer) || PHASE_SECONDS, 0, PHASE_SECONDS);
    state.spawnTimer = Number(event.spawnTimer) || state.spawnTimer;
    if (!state.isNight) for (const enemy of [...enemies]) if (enemy.type !== "boss") killEnemy(enemy, false);
    say(event.kind === "sleep" ? "队友睡觉了，时间已同步。" : "联机时间已同步。");
  }
}

function serializeTiles() {
  const packed = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = tiles[row][col];
      packed.push(tile ? [tile.type, Math.round(tile.hp * 10) / 10, tile.placed ? 1 : 0] : null);
    }
  }
  return packed;
}

function hydrateTiles(packed) {
  tiles.length = 0;
  for (let row = 0; row < ROWS; row++) {
    const line = [];
    for (let col = 0; col < COLS; col++) {
      const data = packed[row * COLS + col];
      line.push(data ? { type: data[0], hp: data[1], placed: !!data[2] } : null);
    }
    tiles.push(line);
  }
}

function saveGame() {
  if (!state.started || state.gameOver || state.won) return;
  const save = {
    version: 1,
    savedAt: Date.now(),
    cols: COLS,
    originCol: WORLD_ORIGIN_COL,
    state: {
      isNight: state.isNight,
      phase: state.phase,
      phaseTimer: state.phaseTimer,
      spawnTimer: state.spawnTimer,
      inv: state.inv,
      placeMode: state.placeMode,
      mode: state.mode,
      dimension: state.dimension,
      multiplayer: { enabled: multiplayer.enabled, room: multiplayer.room, role: multiplayer.role },
    },
    player: {
      x: player.x,
      y: player.y,
      hp: player.hp,
      armor: player.armor,
      stamina: player.stamina,
      facing: player.facing,
      pick: player.pick,
      ranged: player.ranged,
      sword: player.sword,
      diamondArmor: player.diamondArmor,
      diamondBow: player.diamondBow,
    },
    tiles: serializeTiles(),
    structures: structures.map((s) => ({ type: s.type, x: s.x, y: s.y, w: s.w, h: s.h, hp: s.hp, open: !!s.open })),
    enemies: enemies.map((e) => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, bite: e.bite })),
    animals: animals.map((a) => ({ type: a.type, x: a.x, y: a.y, hp: a.hp, dir: a.dir })),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    say("存档空间不足，这次可能没有保存成功。");
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

function clearAllGameSaves() {
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SAVE_PREFIX)) localStorage.removeItem(key);
  }
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const save = JSON.parse(raw);
    if (!save || save.version !== 1 || !Array.isArray(save.tiles)) return false;
    COLS = save.cols || COLS;
    WORLD_ORIGIN_COL = Number(save.originCol) || 0;
    WORLD_W = COLS * TILE;
    hydrateTiles(save.tiles);
    structures.length = 0;
    structures.push(...(save.structures || []).map((s) => ({ ...s, open: !!s.open })));
    enemies.length = 0;
    enemies.push(...(save.enemies || []).map((e) => ({ ...makeEnemy(e.type, e.x, e.y), hp: e.hp, maxHp: e.maxHp, bite: e.bite || 0 })));
    animals.length = 0;
    animals.push(...(save.animals || []).map((a) => makeAnimal(a.type || "sheep", a.x, a.y, a.hp, a.dir)));
    bolts.length = 0;
    particles.length = 0;
    Object.assign(state, {
      started: true,
      paused: false,
      gameOver: false,
      won: false,
      downed: false,
      carriedBy: "",
      carryingId: "",
      reviveTargetId: "",
      reviveHold: 0,
      last: performance.now(),
      isNight: !!save.state.isNight,
      phase: save.state.phase || 1,
      phaseTimer: save.state.phaseTimer || PHASE_SECONDS,
      spawnTimer: save.state.spawnTimer || 3,
      attackCooldown: 0,
      rangedCooldown: 0,
      regenTimer: 0,
      placeMode: save.state.placeMode || "table",
      mode: save.state.mode || "survival",
      dimension: save.state.dimension || "overworld",
      inv: { ...freshInventory(), ...(save.state.inv || {}) },
    });
    Object.assign(player, {
      x: save.player.x,
      y: save.player.y,
      vx: 0,
      vy: 0,
      hp: save.player.hp,
      armor: save.player.armor,
      stamina: save.player.stamina,
      facing: save.player.facing || 1,
      onGround: false,
      pick: save.player.pick || "none",
      ranged: !!save.player.ranged,
      sword: save.player.sword || "none",
      diamondArmor: !!save.player.diamondArmor,
      diamondBow: !!save.player.diamondBow,
    });
    ui.startOverlay.classList.add("hidden");
    if (save.state.multiplayer?.enabled) {
      multiplayer.room = save.state.multiplayer.room || multiplayer.room;
      multiplayer.role = save.state.multiplayer.role === "admin" ? "admin" : "guest";
      localStorage.setItem(ROLE_KEY, multiplayer.role);
      startMultiplayer("已恢复联机存档");
      return true;
    }
    ui.pauseBtn.textContent = "暂停";
    say("已恢复上次关闭网页前的存档。");
    return true;
  } catch {
    clearSave();
    return false;
  }
}

function prepareSavedGame() {
  if (!localStorage.getItem(SAVE_KEY)) return false;
  ui.startOverlay.querySelector("strong").textContent = "继续上次游戏";
  ui.startOverlay.querySelector("span").textContent = "检测到本地存档。点击继续；如果想重开，通关或失败后会清除旧存档。";
  say("检测到存档，点击继续上次游戏。");
  return true;
}

function seedWorld() {
  state.dimension = "overworld";
  const rng = seededRandom(`world:${multiplayer.room}`);
  COLS = 92;
  WORLD_ORIGIN_COL = 0;
  WORLD_W = COLS * TILE;
  tiles.length = 0;
  for (let row = 0; row < ROWS; row++) tiles.push(Array(COLS).fill(null));
  for (let col = 0; col < COLS; col++) {
    const surface = terrainSurface(WORLD_ORIGIN_COL + col);
    for (let row = surface; row < ROWS; row++) {
      let type = row === surface ? "grass" : row < surface + 5 ? "dirt" : "stone";
      const depth = row - surface;
      const roll = rng();
      if (depth > 8 && roll < 0.055) type = "coal";
      if (depth > 18 && roll >= 0.055 && roll < 0.095) type = "iron";
      if (depth > 34 && roll >= 0.095 && roll < 0.112) type = "diamond";
      if (depth > 4 && row < surface + 7 && roll > 0.986) type = "water";
      if (depth > 22 && roll > 0.992) type = "lava";
      setTile(col, row, makeTile(type));
    }
  }

  for (let col = 5; col < COLS - 4; col += seededInt(rng, 5, 9)) {
    if (rng() > 0.78) continue;
    placeTreeAt(col, terrainSurface(WORLD_ORIGIN_COL + col));
  }

  structures.length = 0;
  enemies.length = 0;
  animals.length = 0;
  bolts.length = 0;
  particles.length = 0;
  spawnAnimalsInRange(6, COLS - 8, 4, rng);
}

function spawnAnimalsInRange(minCol, maxCol, count, rng = Math.random) {
  for (let i = 0; i < count; i++) {
    const col = Math.floor(minCol + rng() * (maxCol - minCol + 1));
    const x = col * TILE + TILE / 2;
    animals.push(makeAnimal("sheep", x, findSurfaceY(col) - 18, 26, rng() < 0.5 ? -1 : 1));
  }
}

function placeTreeAt(col, surface) {
  if (col < 3 || col >= COLS - 3 || surface < 8) return;
  let ground = Math.round(surface);
  if (tileAt(col, ground)?.type !== "grass") {
    ground = Math.floor(findSurfaceY(col) / TILE);
  }
  if (tileAt(col, ground)?.type !== "grass") return;
  for (let row = ground - 7; row < ground; row++) if (tileAt(col, row)) return;
  for (let trunk = 1; trunk <= 4; trunk++) setTile(col, ground - trunk, makeTile("wood"));
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -7; dy <= -4; dy++) {
      if (Math.abs(dx) + Math.abs(dy + 5) <= 4 && !tileAt(col + dx, ground + dy)) setTile(col + dx, ground + dy, makeTile("leaf"));
    }
  }
}

function shouldGrowTree(seed) {
  return Math.abs(Math.sin(seed * 3.9)) > 0.91;
}

function terrainSurface(col) {
  return SURFACE + Math.round(Math.sin(col * 0.23) * 2 + Math.sin(col * 0.07) * 2);
}

function generateColumn(colSeed) {
  const column = Array(ROWS).fill(null);
  if (state.dimension === "nether") {
    const surface = SURFACE + Math.round(Math.sin(colSeed * 0.17) * 3 + Math.sin(colSeed * 0.05) * 2);
    for (let row = surface; row < ROWS; row++) {
      const depth = row - surface;
      const roll = Math.abs(Math.sin(colSeed * 15.73 + row * 8.19)) % 1;
      let type = depth < 4 ? "netherrack" : roll > 0.82 ? "hellstone" : "netherrack";
      if (depth > 6 && roll < 0.045) type = "coal";
      if (depth > 12 && roll > 0.965) type = "lava";
      column[row] = makeTile(type);
    }
    return column;
  }
  const surface = terrainSurface(colSeed);
  for (let row = surface; row < ROWS; row++) {
    let type = row === surface ? "grass" : row < surface + 5 ? "dirt" : "stone";
    const depth = row - surface;
    const roll = Math.abs(Math.sin(colSeed * 19.17 + row * 7.31)) % 1;
    if (depth > 8 && roll < 0.055) type = "coal";
    if (depth > 18 && roll >= 0.055 && roll < 0.095) type = "iron";
    if (depth > 34 && roll >= 0.095 && roll < 0.112) type = "diamond";
    if (depth > 4 && row < surface + 7 && roll > 0.986) type = "water";
    if (depth > 22 && roll > 0.992) type = "lava";
    column[row] = makeTile(type);
  }
  return column;
}

function extendWorldRight(count = 24) {
  const start = COLS;
  for (let i = 0; i < count; i++) {
    const column = generateColumn(WORLD_ORIGIN_COL + start + i);
    for (let row = 0; row < ROWS; row++) tiles[row].push(column[row]);
  }
  COLS += count;
  WORLD_W = COLS * TILE;
  for (let col = start + 2; col < COLS - 2; col++) {
    const seed = WORLD_ORIGIN_COL + col;
    if (state.dimension === "overworld" && shouldGrowTree(seed)) placeTreeAt(col, terrainSurface(seed));
  }
  if (state.dimension === "overworld") spawnAnimalsInRange(start + 2, COLS - 2, 1);
}

function extendWorldLeft(count = 24) {
  const newOrigin = WORLD_ORIGIN_COL - count;
  for (let i = 0; i < count; i++) {
    const column = generateColumn(newOrigin + i);
    for (let row = 0; row < ROWS; row++) tiles[row].unshift(column[row]);
  }
  const shift = count * TILE;
  WORLD_ORIGIN_COL = newOrigin;
  COLS += count;
  WORLD_W = COLS * TILE;
  player.x += shift;
  for (const item of [...structures, ...enemies, ...animals, ...bolts, ...particles]) item.x += shift;
  for (const peer of remotePlayers.values()) {
    peer.x += shift;
    peer.tx = (peer.tx ?? peer.x) + shift;
    for (const sample of peer.samples || []) sample.x += shift;
  }
  camera.x += shift;
  for (let col = 2; col < count - 2; col++) {
    const seed = WORLD_ORIGIN_COL + col;
    if (state.dimension === "overworld" && shouldGrowTree(seed)) placeTreeAt(col, terrainSurface(seed));
  }
  if (state.dimension === "overworld") spawnAnimalsInRange(2, count - 2, 1);
}

function ensureWorldAroundPlayer() {
  if (player.x > WORLD_W - 900) extendWorldRight();
  if (player.x < 700) extendWorldLeft();
}

function freshInventory() {
  return { wood: 0, plank: 0, dirt: 0, leaf: 0, stone: 0, coal: 0, ironOre: 0, ironIngot: 0, diamond: 0, glass: 0, brick: 0, flowerBrick: 0, lantern: 0, banner: 0, wool: 0, string: 0, rotten: 0, table: 0, furnace: 0, door: 0, bed: 0, campfire: 0, bucket: 0, waterBucket: 0, lavaBucket: 0, fireball: 0, portal: 0 };
}

function creativeInventory() {
  const inv = freshInventory();
  for (const key of Object.keys(inv)) inv[key] = 99;
  return inv;
}

function resetGame(mode = "survival") {
  if (voice.enabled) toggleVoice();
  multiplayer.enabled = false;
  multiplayer.online = false;
  multiplayer.ws?.close();
  multiplayer.ws = null;
  multiplayer.wsConnecting = false;
  for (const entry of p2p.peers.values()) entry.pc.close();
  p2p.peers.clear();
  remotePlayers.clear();
  updateSharePanel();
  Object.assign(state, {
    started: true,
    paused: false,
    gameOver: false,
    won: false,
    downed: false,
    carriedBy: "",
    carryingId: "",
    reviveTargetId: "",
    reviveHold: 0,
    last: performance.now(),
    isNight: false,
    phase: 1,
    phaseTimer: PHASE_SECONDS,
    spawnTimer: 3,
    attackCooldown: 0,
    rangedCooldown: 0,
    regenTimer: 0,
    placeMode: "table",
    mode,
    dimension: "overworld",
    inv: mode === "creative" ? creativeInventory() : freshInventory(),
  });
  Object.assign(player, { x: 12 * TILE, y: (SURFACE - 3) * TILE, vx: 0, vy: 0, hp: 100, armor: 0, stamina: 100, facing: 1, onGround: false, pick: "none", ranged: false, sword: "none", diamondArmor: false, diamondBow: false });
  seedWorld();
  saveGame();
  ui.startOverlay.classList.add("hidden");
  ui.pauseBtn.textContent = "暂停";
  say(mode === "creative" ? "创造模式：资源充足，可以自由搭建。" : "地面在屏幕底部。A/D 移动，空格跳跃，左键砍树。");
}

function startMultiplayer(prefix = "联机模式已开启") {
  multiplayer.enabled = true;
  multiplayer.online = false;
  remotePlayers.clear();
  const shareUrl = multiplayerShareUrl();
  say(`${prefix}。房间：${multiplayer.room}，让朋友打开 ${shareUrl}`);
  updateSharePanel();
  updateUi();
  saveGame();
  connectMultiplayerSocket();
  syncMultiplayer(performance.now());
}

function startNewMultiplayerSave() {
  multiplayer.room = `zijia-${Date.now().toString(36).slice(-6)}`;
  const url = new URL(location.href);
  url.searchParams.set("room", multiplayer.room);
  url.searchParams.set("v", "admin-arrow-1");
  history.replaceState(null, "", url);
  clearAllGameSaves();
  resetGame("survival");
  startMultiplayer("新的联机存档已开启");
}

function wsReady() {
  return multiplayer.ws?.readyState === WebSocket.OPEN;
}

function connectMultiplayerSocket() {
  if (!multiplayer.enabled || multiplayer.wsConnecting || wsReady()) return;
  if (multiplayer.ws && multiplayer.ws.readyState === WebSocket.CONNECTING) return;
  multiplayer.wsConnecting = true;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws/multiplayer`);
  multiplayer.ws = ws;
  ws.addEventListener("open", () => {
    multiplayer.wsConnecting = false;
    multiplayer.online = true;
    sendMultiplayerMove(performance.now(), true);
  });
  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      const receivedAt = performance.now();
      if (data.serverT) {
        const offset = Number(data.serverT) - receivedAt;
        multiplayer.serverOffset = multiplayer.serverOffset ? multiplayer.serverOffset * 0.9 + offset * 0.1 : offset;
      }
      if (data.type === "pong" && data.clientT) {
        multiplayer.latency = multiplayer.latency * 0.82 + (receivedAt - Number(data.clientT)) * 0.18;
        return;
      }
      if (data.type === "peer" && data.peer?.id !== multiplayer.id) updateRemotePeer(data.peer);
      if (data.type === "peers") {
        if (multiplayer.lastPeerPacketAt) {
          const interval = receivedAt - multiplayer.lastPeerPacketAt;
          multiplayer.jitter = multiplayer.jitter * 0.88 + Math.abs(interval - 50) * 0.12;
        }
        multiplayer.lastPeerPacketAt = receivedAt;
        const liveIds = new Set();
        for (const peer of data.peers || []) {
          liveIds.add(peer.id);
          updateRemotePeer(peer);
        }
        if (liveIds.size !== remotePlayers.size) for (const id of remotePlayers.keys()) if (!liveIds.has(id)) remotePlayers.delete(id);
      }
    } catch {
      // Bad real-time packets are ignored; HTTP sync remains the fallback.
    }
  });
  ws.addEventListener("close", () => {
    multiplayer.wsConnecting = false;
    if (multiplayer.ws === ws) multiplayer.ws = null;
  });
  ws.addEventListener("error", () => {
    multiplayer.wsConnecting = false;
  });
}

function playerPacket() {
  const worldX = localToWorldX(player.x);
  return {
    id: multiplayer.id,
    room: multiplayer.room,
    t: performance.now(),
    x: worldX,
    worldX,
    localX: player.x,
    originCol: WORLD_ORIGIN_COL,
    y: player.y,
    vx: player.vx,
    vy: player.vy,
    downed: state.downed,
    carriedBy: state.carriedBy,
    carryingId: state.carryingId,
    reviveTargetId: state.reviveTargetId,
    hp: Math.ceil(player.hp),
    armor: Math.ceil(player.armor),
    role: multiplayer.role,
    facing: player.facing,
    dimension: state.dimension,
    mode: state.mode,
    pick: player.pick,
    ranged: player.ranged,
    diamondArmor: player.diamondArmor,
    sword: player.sword,
  };
}

function sendMultiplayerMove(now, force = false) {
  if (!multiplayer.enabled || !state.started || state.gameOver || state.won) return;
  if (!wsReady()) {
    connectMultiplayerSocket();
    return;
  }
  const last = multiplayer.lastMoveSent;
  const worldX = localToWorldX(player.x);
  const moved = !last || Math.abs(worldX - last.worldX) > 1.2 || Math.abs(player.y - last.y) > 1.2 || player.facing !== last.facing || state.dimension !== last.dimension;
  if (!force && now - multiplayer.lastWsSend < (moved ? 50 : 180)) return;
  multiplayer.lastWsSend = now;
  multiplayer.lastMoveSent = { worldX, y: player.y, facing: player.facing, dimension: state.dimension };
  multiplayer.ws.send(JSON.stringify({ type: "move", ...playerPacket() }));
}

function sendMultiplayerPing(now) {
  if (!multiplayer.enabled || !wsReady()) return;
  if (now - multiplayer.lastPing < 1500) return;
  multiplayer.lastPing = now;
  multiplayer.ws.send(JSON.stringify({ type: "ping", clientT: now }));
}

function normalizeRemotePeer(peer) {
  const worldX = Number.isFinite(Number(peer.worldX)) ? Number(peer.worldX) : Number(peer.x);
  return {
    ...peer,
    worldX,
    x: worldToLocalX(worldX),
    y: Number(peer.y) || 0,
    vx: Number(peer.vx) || 0,
    vy: Number(peer.vy) || 0,
  };
}

function updateRemotePeer(peer) {
  peer = normalizeRemotePeer(peer);
  const current = remotePlayers.get(peer.id);
  const remoteT = Number(peer.serverAt) || Number(peer.serverT) || Number(peer.t) || 0;
  if (current?.remoteT && remoteT && remoteT <= current.remoteT) return;
  const receivedAt = performance.now();
  const hugeJump = current && Math.hypot(peer.x - (current.tx ?? current.x), peer.y - (current.ty ?? current.y)) > TILE * 5;
  const samples = current?.samples ? current.samples.slice(-14) : [];
  const last = samples[samples.length - 1] || current;
  const dt = last?.remoteT ? Math.max(0.025, Math.min(0.35, (remoteT - last.remoteT) / 1000)) : last?.receivedAt ? Math.max(0.025, Math.min(0.35, (receivedAt - last.receivedAt) / 1000)) : 0.08;
  const vx = Number.isFinite(peer.vx) ? peer.vx : last ? (peer.x - last.x) / dt : 0;
  const vy = Number.isFinite(peer.vy) ? peer.vy : last ? (peer.y - last.y) / dt : 0;
  samples.push({ x: peer.x, y: peer.y, receivedAt, remoteT, vx, vy });
  remotePlayers.set(peer.id, current ? {
    ...peer,
    x: hugeJump ? peer.x : current.x,
    y: hugeJump ? peer.y : current.y,
    tx: peer.x,
    ty: peer.y,
    vx,
    vy,
    remoteT,
    receivedAt,
    samples: hugeJump ? [{ x: peer.x, y: peer.y, receivedAt, remoteT, vx: 0, vy: 0 }] : samples,
  } : { ...peer, x: peer.x, y: peer.y, tx: peer.x, ty: peer.y, vx, vy, remoteT, receivedAt, samples });
}

function entitySnapshot() {
  return {
    enemies: enemies.map((e) => ({ id: e.id, type: e.type, x: e.x, y: e.y, vx: e.vx, vy: e.vy, hp: e.hp, maxHp: e.maxHp, bite: e.bite, dir: e.dir })),
    animals: animals.map((a) => ({ id: a.id, type: a.type, x: a.x, y: a.y, vx: a.vx, vy: a.vy, hp: a.hp, dir: a.dir, moveTimer: a.moveTimer })),
  };
}

function applyEntitySnapshot(snapshot) {
  if (!snapshot || multiplayer.hostId === multiplayer.id || snapshot.dimension !== state.dimension) return;
  const enemyMap = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  const nextEnemies = [];
  for (const data of snapshot.enemies || []) {
    const id = data.id || "";
    const enemy = enemyMap.get(id) || makeEnemy(data.type || "zombie", Number(data.x) || 0, Number(data.y) || 0);
    Object.assign(enemy, {
      id: id || enemy.id,
      x: Number(data.x) || enemy.x,
      y: Number(data.y) || enemy.y,
      vx: Number(data.vx) || 0,
      vy: Number(data.vy) || 0,
      hp: Number(data.hp) || enemy.hp,
      maxHp: Number(data.maxHp) || enemy.maxHp,
      bite: Number(data.bite) || 0,
    });
    nextEnemies.push(enemy);
  }
  enemies.length = 0;
  enemies.push(...nextEnemies);
  const animalMap = new Map(animals.map((animal) => [animal.id, animal]));
  const nextAnimals = [];
  for (const data of snapshot.animals || []) {
    const id = data.id || "";
    const animal = animalMap.get(id) || makeAnimal(data.type || "sheep", Number(data.x) || 0, Number(data.y) || 0, Number(data.hp) || 26, Number(data.dir) || 1);
    Object.assign(animal, {
      id: id || animal.id,
      x: Number(data.x) || animal.x,
      y: Number(data.y) || animal.y,
      hp: Number(data.hp) || animal.hp,
      dir: Number(data.dir) || animal.dir,
      vx: Number(data.vx) || 0,
      vy: Number(data.vy) || 0,
      moveTimer: Number(data.moveTimer) || animal.moveTimer,
    });
    nextAnimals.push(animal);
  }
  animals.length = 0;
  animals.push(...nextAnimals);
}

async function syncMultiplayer(now) {
  if (!multiplayer.enabled || !state.started || state.gameOver || state.won) return;
  connectMultiplayerSocket();
  sendMultiplayerMove(now);
  sendMultiplayerPing(now);
  if (multiplayer.inFlight) return;
  const syncDelay = wsReady() ? 550 : 120;
  if (now - multiplayer.lastSync < syncDelay) return;
  multiplayer.lastSync = now;
  multiplayer.inFlight = true;
  const outgoingBlockEvents = multiplayer.pendingBlockEvents.splice(0);
  const outgoingWorldEvents = multiplayer.pendingWorldEvents.splice(0);
  try {
    const response = await fetch("/api/multiplayer/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...playerPacket(),
        sinceBlockSeq: multiplayer.blockSeq,
        sinceWorldSeq: multiplayer.worldSeq,
        blockEvents: outgoingBlockEvents,
        worldEvents: outgoingWorldEvents,
      }),
    });
    if (!response.ok) throw new Error("offline");
    const data = await response.json();
    multiplayer.online = true;
    if (data.self) {
      state.carriedBy = data.self.carriedBy || "";
      if (state.downed && !data.self.downed && Number(data.self.hp) > 0) {
        state.downed = false;
        player.hp = Number(data.self.hp) || 20;
        say("你被队友复活了，当前 20 血。");
      }
    }
    multiplayer.hostId = data.hostId || multiplayer.hostId || multiplayer.id;
    multiplayer.blockSeq = Math.max(multiplayer.blockSeq, data.blockSeq || 0);
    applyRemoteBlockEvents(data.blockEvents || []);
    multiplayer.worldSeq = Math.max(multiplayer.worldSeq, data.worldSeq || 0);
    applyRemoteWorldEvents(data.worldEvents || []);
    maintainVoicePeers(data.peers || []);
    if (voice.enabled && now - voice.lastPoll > 450) pollVoiceSignals(now);
  } catch {
    multiplayer.pendingBlockEvents.unshift(...outgoingBlockEvents);
    if (multiplayer.pendingBlockEvents.length > 160) multiplayer.pendingBlockEvents.splice(160);
    multiplayer.pendingWorldEvents.unshift(...outgoingWorldEvents);
    if (multiplayer.pendingWorldEvents.length > 40) multiplayer.pendingWorldEvents.splice(40);
    multiplayer.online = false;
  } finally {
    multiplayer.inFlight = false;
  }
}

async function sendVoiceSignal(to, signal) {
  if (!multiplayer.enabled) return;
  try {
    await fetch("/api/voice/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: multiplayer.room, from: multiplayer.id, to, signal }),
    });
  } catch {
    say("语音信令发送失败，网络可能不稳定。");
  }
}

function sendDirectMove() {
  const packet = JSON.stringify({ type: "peer", peer: playerPacket() });
  let sent = false;
  for (const entry of p2p.peers.values()) {
    if (entry.channel?.readyState === "open") {
      entry.channel.send(packet);
      sent = true;
    }
  }
  return sent;
}

function setupDataChannel(peerId, channel) {
  const entry = p2p.peers.get(peerId);
  if (!entry) return;
  entry.channel = channel;
  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "peer" && data.peer?.id !== multiplayer.id) updateRemotePeer({ ...data.peer, direct: true, serverT: performance.now() });
    } catch {
      // Ignore malformed direct packets.
    }
  };
}

function createDataPeer(peerId, initiator = false) {
  if (p2p.peers.has(peerId)) return p2p.peers.get(peerId);
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  const entry = { pc, channel: null, makingOffer: false };
  p2p.peers.set(peerId, entry);
  pc.onicecandidate = (event) => {
    if (event.candidate) sendVoiceSignal(peerId, { channel: "data", type: "candidate", candidate: event.candidate });
  };
  pc.ondatachannel = (event) => setupDataChannel(peerId, event.channel);
  pc.onconnectionstatechange = () => {
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      pc.close();
      p2p.peers.delete(peerId);
    }
  };
  if (initiator) {
    setupDataChannel(peerId, pc.createDataChannel("move", { ordered: false, maxRetransmits: 0 }));
    entry.makingOffer = true;
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => sendVoiceSignal(peerId, { channel: "data", ...pc.localDescription.toJSON() }))
      .finally(() => { entry.makingOffer = false; });
  }
  return entry;
}

async function handleDataSignal(from, signal) {
  if (!signal) return;
  const entry = createDataPeer(from, false);
  const pc = entry.pc;
  try {
    if (signal.type === "offer") {
      await pc.setRemoteDescription(signal);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendVoiceSignal(from, { channel: "data", ...pc.localDescription.toJSON() });
    } else if (signal.type === "answer") {
      await pc.setRemoteDescription(signal);
    } else if (signal.type === "candidate" && signal.candidate) {
      await pc.addIceCandidate(signal.candidate);
    }
  } catch {
    p2p.peers.delete(from);
  }
}

function maintainDataPeers(peers) {
  if (!multiplayer.enabled) return;
  const live = new Set(peers.map((peer) => peer.id));
  for (const peer of peers) if (multiplayer.id < peer.id) createDataPeer(peer.id, true);
  for (const [peerId, entry] of p2p.peers) {
    if (!live.has(peerId)) {
      entry.pc.close();
      p2p.peers.delete(peerId);
    }
  }
}

function makeRemoteAudio(peerId) {
  let audio = document.querySelector(`#voice-${peerId}`);
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = `voice-${peerId}`;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
  }
  return audio;
}

function createVoicePeer(peerId, initiator = false) {
  if (voice.peers.has(peerId)) return voice.peers.get(peerId);
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  const entry = { pc, makingOffer: false };
  voice.peers.set(peerId, entry);
  if (voice.stream) for (const track of voice.stream.getTracks()) pc.addTrack(track, voice.stream);
  pc.onicecandidate = (event) => {
    if (event.candidate) sendVoiceSignal(peerId, { type: "candidate", candidate: event.candidate });
  };
  pc.ontrack = (event) => {
    makeRemoteAudio(peerId).srcObject = event.streams[0];
  };
  pc.onconnectionstatechange = () => {
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      pc.close();
      voice.peers.delete(peerId);
      document.querySelector(`#voice-${peerId}`)?.remove();
    }
  };
  if (initiator) {
    entry.makingOffer = true;
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => sendVoiceSignal(peerId, pc.localDescription))
      .finally(() => { entry.makingOffer = false; });
  }
  return entry;
}

async function handleVoiceSignal(from, signal) {
  if (!voice.enabled || !signal) return;
  const entry = createVoicePeer(from, false);
  const pc = entry.pc;
  try {
    if (signal.type === "offer") {
      await pc.setRemoteDescription(signal);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendVoiceSignal(from, pc.localDescription);
    } else if (signal.type === "answer") {
      await pc.setRemoteDescription(signal);
    } else if (signal.type === "candidate" && signal.candidate) {
      await pc.addIceCandidate(signal.candidate);
    }
  } catch {
    say("语音连接协商失败，可以关掉麦克风再打开。");
  }
}

async function pollVoiceSignals(now = performance.now()) {
  if (!voice.enabled || !multiplayer.enabled) return;
  voice.lastPoll = now;
  try {
    const response = await fetch("/api/voice/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: multiplayer.room, id: multiplayer.id }),
    });
    const data = await response.json();
    for (const message of data.messages || []) handleVoiceSignal(message.from, message.signal);
  } catch {
    // Voice can miss a poll and recover on the next one.
  }
}

function maintainVoicePeers(peers) {
  if (!voice.enabled) return;
  const live = new Set((peers || []).map((peer) => peer.id));
  for (const peer of peers || []) {
    if (multiplayer.id < peer.id) createVoicePeer(peer.id, true);
  }
  for (const [peerId, entry] of voice.peers) {
    if (live.has(peerId)) continue;
    entry.pc.close();
    voice.peers.delete(peerId);
    document.querySelector(`#voice-${peerId}`)?.remove();
  }
}

async function toggleVoice() {
  if (voice.enabled) {
    for (const entry of voice.peers.values()) entry.pc.close();
    voice.peers.clear();
    voice.stream?.getTracks().forEach((track) => track.stop());
    voice.stream = null;
    voice.enabled = false;
    ui.voiceBtn.textContent = "麦克风";
    say("麦克风已关闭。");
    return;
  }
  if (!multiplayer.enabled) return say("先进入联机模式，再打开麦克风。");
  if (!navigator.mediaDevices?.getUserMedia) return say("当前浏览器不支持麦克风，或页面不是 HTTPS。");
  try {
    voice.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    voice.enabled = true;
    ui.voiceBtn.textContent = "关麦";
    say("麦克风已开启。浏览器询问权限时要点允许。");
    maintainVoicePeers([...remotePlayers.values()]);
    pollVoiceSignals();
  } catch {
    say("麦克风没有开启。请允许浏览器使用麦克风。");
  }
}

function spend(cost) {
  if (state.mode === "creative") return true;
  for (const [key, amount] of Object.entries(cost)) if (state.inv[key] < amount) return false;
  for (const [key, amount] of Object.entries(cost)) state.inv[key] -= amount;
  return true;
}

function hasNearStructure(type) {
  return structures.some((s) => s.type === type && Math.abs(s.x - player.x) < 90 && Math.abs(s.y - player.y) < 70);
}

function needTable() {
  if (!hasNearStructure("table")) {
    say("要站在合成台旁边才能制作工具。");
    return false;
  }
  return true;
}

function needFurnace() {
  if (!hasNearStructure("furnace")) {
    say("要站在熔炉旁边才能烧制铁矿。");
    return false;
  }
  return true;
}

function craftTable() {
  if (!spend({ wood: 4 })) return say("合成台需要 4 木头。");
  state.inv.table += 1;
  state.placeMode = "table";
  say("合成台做好了，右键或点按钮放在地面上。");
}

function craftPlank() {
  if (!spend({ wood: 1 })) return say("分解木板需要 1 个木头。");
  state.inv.plank += 4;
  state.placeMode = "plank";
  say("1 个木头分解成了 4 个木板，木板可以搭建。");
}

function craftDoor() {
  if (!needTable()) return;
  if (!spend({ plank: 6 })) return say("木门需要 6 个木板。");
  state.inv.door += 1;
  state.placeMode = "door";
  say("木门做好了。木门高两格，可以挡住通道。");
}

function craftWool() {
  if (!spend({ string: 4 })) return say("4 根线可以合成 1 个毛线。");
  state.inv.wool += 1;
  say("合成了 1 个毛线。");
}

function craftBed() {
  if (!needTable()) return;
  if (!spend({ wool: 3, plank: 3 })) return say("床需要 3 毛线和 3 木板。");
  state.inv.bed += 1;
  state.placeMode = "bed";
  say("床做好了。靠近床可以睡觉跳过当前昼夜。");
}

function craftBucket() {
  if (!needTable()) return;
  if (!spend({ ironIngot: 3 })) return say("铁桶需要 3 个铁锭。");
  state.inv.bucket += 1;
  say("铁桶做好了。对着水或岩浆点击装水/装岩浆。");
}

function craftCampfire() {
  if (!needTable()) return;
  if (!spend({ wood: 3, coal: 1 })) return say("篝火需要 3 木头和 1 煤。");
  state.inv.campfire += 1;
  state.placeMode = "campfire";
  say("篝火做好了，靠近它回血更快。");
}

function collectLiquid(type = null) {
  if (state.inv.bucket <= 0 && state.mode !== "creative") return say("需要一个空铁桶。");
  const target = worldMouse();
  const col = Math.floor(target.x / TILE);
  const row = Math.floor(target.y / TILE);
  if (Math.hypot(target.x - player.x, target.y - player.y) > TILE * 3) return say("太远了，3 格以内才能用铁桶装液体。");
  const tile = tileAt(col, row);
  if (!isLiquidTile(tile, type)) return say(type === "water" ? "鼠标要指着水方块。" : type === "lava" ? "鼠标要指着岩浆方块。" : "鼠标要指着水或岩浆方块。");
  type = tile.type;
  setTile(col, row, null);
  queueBlockChange(col, row, null);
  if (state.mode !== "creative") state.inv.bucket -= 1;
  state.inv[type === "water" ? "waterBucket" : "lavaBucket"] += 1;
  say(type === "water" ? "装满了一桶水。" : "装满了一桶岩浆。");
}

function tryCollectLiquidWithBucket() {
  if (state.inv.bucket <= 0 && state.mode !== "creative") return false;
  const target = worldMouse();
  const col = Math.floor(target.x / TILE);
  const row = Math.floor(target.y / TILE);
  if (!isLiquidTile(tileAt(col, row))) return false;
  collectLiquid();
  return true;
}

function craftPortal() {
  if (!needTable()) return;
  if (!spend({ waterBucket: 1, lavaBucket: 1, fireball: 1 })) return say("传送门需要 1 个水桶、1 个岩浆桶和 1 个火球。");
  if (state.mode !== "creative") state.inv.bucket += 2;
  state.inv.portal += 1;
  state.placeMode = "portal";
  say("传送门做好了。放下后触碰它就能进入地狱。");
}

function craftGlass() {
  if (!needFurnace()) return;
  if (!spend({ stone: 2, coal: 1 })) return say("玻璃需要 2 石头和 1 煤炭，并且要靠近熔炉。");
  state.inv.glass += 4;
  state.placeMode = "glass";
  say("烧出了 4 个玻璃方块。");
}

function craftBrick() {
  if (!needTable()) return;
  if (!spend({ stone: 4 })) return say("石砖需要 4 个石头。");
  state.inv.brick += 4;
  state.placeMode = "brick";
  say("做出了 4 个石砖方块。");
}

function craftFlowerBrick() {
  if (!needTable()) return;
  if (!spend({ brick: 2, leaf: 1 })) return say("花砖需要 2 石砖和 1 树叶。");
  state.inv.flowerBrick += 2;
  state.placeMode = "flowerBrick";
  say("做出了 2 个花砖，用来装饰墙面很漂亮。");
}

function craftLantern() {
  if (!needTable()) return;
  if (!spend({ coal: 1, ironIngot: 1 })) return say("灯笼需要 1 煤炭和 1 铁锭。");
  state.inv.lantern += 2;
  state.placeMode = "lantern";
  say("做出了 2 个灯笼。");
}

function craftBanner() {
  if (!needTable()) return;
  if (!spend({ leaf: 2, wood: 1 })) return say("蓝旗需要 2 树叶和 1 木头。");
  state.inv.banner += 2;
  state.placeMode = "banner";
  say("做出了 2 面蓝旗。");
}

function craftFurnace() {
  if (!needTable()) return;
  if (!spend({ stone: 8 })) return say("熔炉需要 8 石头。");
  state.inv.furnace += 1;
  state.placeMode = "furnace";
  say("熔炉做好了，放下后可以烧铁。");
}

function craftWoodPick() {
  if (!needTable()) return;
  if (pickPower[player.pick] >= 1) return say("你已经有木镐或更好的镐了。");
  if (!spend({ wood: 5 })) return say("木镐需要 5 木头。");
  player.pick = "wood";
  say("木镐完成，可以挖石头和煤炭。");
}

function craftStonePick() {
  if (!needTable()) return;
  if (pickPower[player.pick] >= 2) return say("你已经有石镐或更好的镐了。");
  if (!spend({ stone: 3, wood: 2 })) return say("石镐需要 3 石头和 2 木头。");
  player.pick = "stone";
  say("石镐完成，可以挖铁矿。");
}

function smeltIron() {
  if (!needFurnace()) return;
  if (!spend({ ironOre: 1, coal: 1 })) return say("烧铁需要 1 铁矿和 1 煤炭。");
  state.inv.ironIngot += 1;
  say("铁矿烧成铁锭了。");
}

function craftIronPick() {
  if (!needTable()) return;
  if (player.pick === "iron") return say("你已经有铁镐了。");
  if (!spend({ ironIngot: 3, wood: 2 })) return say("铁镐需要 3 铁锭和 2 木头。");
  player.pick = "iron";
  say("铁镐完成，可以挖钻石矿。");
}

function craftArmor() {
  if (!needTable()) return;
  if (!spend({ ironIngot: 6 })) return say("铁甲需要 6 铁锭。");
  player.armor = clamp(player.armor + 12, 0, 20);
  say("穿上铁甲，护甲会吸收伤害。");
}

function craftBow() {
  if (!needTable()) return;
  if (player.ranged) return say("你已经有弩了。");
  if (!spend({ wood: 4, ironIngot: 2, coal: 1 })) return say("弩需要 4 木头、2 铁锭、1 煤炭。");
  player.ranged = true;
  say("弩完成，按 F 远程攻击。");
}

function craftDiamondSword() {
  if (!needTable()) return;
  if (player.sword === "diamond") return say("你已经有钻石剑了。");
  if (!spend({ diamond: 2, wood: 1 })) return say("钻石剑需要 2 钻石和 1 木头。");
  player.sword = "diamond";
  say("钻石剑完成，近战伤害大幅提升。");
}

function craftDiamondArmor() {
  if (!needTable()) return;
  if (player.diamondArmor) return say("你已经穿着钻石甲了。");
  if (!spend({ diamond: 6 })) return say("钻石甲需要 6 个钻石。");
  player.diamondArmor = true;
  player.armor = clamp(player.armor + 28, 0, 40);
  ui.armorMeter.max = 40;
  say("钻石甲完成，护甲上限提高到 40。");
}

function craftDiamondBow() {
  if (!needTable()) return;
  if (!player.ranged) return say("需要先做普通弩。");
  if (player.diamondBow) return say("你的弩已经是钻石弩了。");
  if (!spend({ diamond: 3 })) return say("钻石弩升级需要 3 个钻石。");
  player.diamondBow = true;
  say("钻石弩升级完成，远程伤害和射速提升。");
}

function craftBoss() {
  if (!needTable()) return;
  if (enemies.some((e) => e.type === "boss")) return say("最终 BOSS 已经出现了。");
  if (!spend({ rotten: 8, furnace: 1, diamond: 3 })) return say("召唤最终 BOSS 需要 8 腐肉、1 个熔炉和 3 个钻石。");
  enemies.push(makeEnemy("boss", player.x + player.facing * 260, player.y - 20));
  say("最终 BOSS 出现了，击败它即可通关。");
}

function placeStructure(type = state.placeMode) {
  if (state.carryingId || state.downed) return say("背着队友或倒地时不能放置。");
  if (["wood", "plank", "dirt", "leaf", "glass", "brick", "flowerBrick", "lantern", "banner"].includes(type)) return placeBlock(type);
  if (type === "portal") return placePortal();
  if (state.inv[type] <= 0) return say(type === "table" ? "背包里没有合成台。" : type === "door" ? "背包里没有木门。" : type === "bed" ? "背包里没有床。" : "背包里没有熔炉。");
  const col = Math.floor((player.x + player.facing * 42) / TILE);
  const row = Math.floor((player.y + player.h / 2 + 8) / TILE);
  if (!tileAt(col, row) || tileAt(col, row - 1)) return say("要放在脚边的空地上。");
  if (type === "door" && tileAt(col, row - 2)) return say("木门高两格，上方空间不够。");
  if (type === "bed" && (!tileAt(col + 1, row) || tileAt(col + 1, row - 1))) return say("床需要两格宽的平地。");
  if (state.mode !== "creative") state.inv[type] -= 1;
  structures.push({
    type,
    x: type === "bed" ? (col + 1) * TILE : col * TILE + TILE / 2,
    y: type === "door" ? (row - 2) * TILE + TILE : (row - 1) * TILE + TILE / 2,
    w: type === "door" ? 24 : type === "bed" ? 64 : type === "campfire" ? 34 : 30,
    h: type === "door" ? 64 : type === "bed" ? 24 : type === "campfire" ? 26 : 30,
    hp: type === "table" ? 120 : type === "door" ? 90 : type === "bed" ? 80 : type === "campfire" ? 70 : 180,
    open: false,
  });
  say(type === "table" ? "合成台放好了。" : type === "door" ? "两格高木门放好了。" : type === "bed" ? "床放好了，靠近它可以睡觉。" : "熔炉放好了。");
}

function placePortal() {
  if (state.inv.portal <= 0) return say("背包里没有传送门。");
  const col = Math.floor((player.x + player.facing * 46) / TILE);
  const row = Math.floor((player.y + player.h / 2 + 8) / TILE);
  if (!isSolidTile(tileAt(col, row)) || tileAt(col, row - 1) || tileAt(col, row - 2) || tileAt(col, row - 3)) return say("传送门要放在脚边三格高的空地上。");
  if (state.mode !== "creative") state.inv.portal -= 1;
  structures.push({
    type: "portal",
    x: col * TILE + TILE / 2,
    y: (row - 3) * TILE + TILE * 1.5,
    w: 42,
    h: 90,
    hp: 260,
    open: false,
  });
  say("传送门放好了，触碰它就能进入地狱。");
}

function choosePlace(type) {
  state.placeMode = type;
  say(`已选择${label(type)}，在场景里右键放置。`);
}

function placeBlock(type) {
  if (state.inv[type] <= 0) return say(`背包里没有${label(type)}。`);
  const target = worldMouse();
  const col = Math.floor(target.x / TILE);
  const row = Math.floor(target.y / TILE);
  if (Math.hypot(target.x - player.x, target.y - player.y) > 150) return say("太远了，靠近一点再放方块。");
  if (tileAt(col, row)) return say("这里已经有方块了。");
  if (rectOverlapsPlayer(col * TILE + TILE / 2, row * TILE + TILE / 2, TILE, TILE)) return say("不能把方块放在自己身上。");
  if (state.mode !== "creative") state.inv[type] -= 1;
  const placedTile = makeTile(type, true);
  setTile(col, row, placedTile);
  queueBlockChange(col, row, placedTile);
  say(`放置了${label(type)}方块。`);
}

function worldMouse() {
  return { x: mouse.x + camera.x, y: mouse.y + camera.y };
}

function mineOrAttack() {
  if (!state.started || state.paused || state.gameOver || state.won || state.attackCooldown > 0 || state.carryingId || state.downed) return;
  state.attackCooldown = 0.22;
  const target = worldMouse();
  player.facing = target.x >= player.x ? 1 : -1;
  const enemy = enemies.find((e) => Math.abs(e.x - player.x) < 76 && Math.abs(e.y - player.y) < 62);
  if (enemy) return damageEnemy(enemy, meleeDamage());
  const animal = animals.find((a) => Math.abs(a.x - player.x) < 70 && Math.abs(a.y - player.y) < 56);
  if (animal) return damageAnimal(animal, meleeDamage());
  if (Math.hypot(target.x - player.x, target.y - player.y) > 145) return say("太远了，靠近一点再挖。");
  const structure = structures.find((s) => pointInRect(target.x, target.y, s.x, s.y, s.w, s.h));
  if (structure) return damageStructure(structure);
  const col = Math.floor(target.x / TILE);
  const row = Math.floor(target.y / TILE);
  const tile = tileAt(col, row);
  if (!tile) return;
  const info = tileInfo[tile.type];
  if (state.mode !== "creative" && pickPower[player.pick] < info.req) return say(`${info.name} 需要 ${toolName(info.req)} 才能挖。`);
  tile.hp -= 1 + pickPower[player.pick] * 0.6;
  burst(col * TILE + 16, row * TILE + 16, info.color, 5);
  if (tile.hp <= 0) breakTile(col, row, tile);
}

function toggleDoor(door) {
  if (Math.abs(door.x - player.x) > 95 || Math.abs(door.y - player.y) > 90) return say("离木门太远了。");
  door.open = !door.open;
  saveGame();
  say(door.open ? "木门打开了。" : "木门关上了。");
}

function toggleNearestDoor() {
  const door = structures
    .filter((s) => s.type === "door")
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
  if (!door || Math.hypot(door.x - player.x, door.y - player.y) > 115) return say("附近没有木门。");
  toggleDoor(door);
}

function sleepInBed() {
  if (state.dimension === "nether") return say("地狱里不能睡觉。");
  const bed = structures.find((s) => s.type === "bed" && Math.abs(s.x - player.x) < 115 && Math.abs(s.y - player.y) < 80);
  if (!bed) return say("附近没有床。");
  state.isNight = !state.isNight;
  state.phaseTimer = PHASE_SECONDS;
  if (!state.isNight) {
    state.phase += 1;
    for (const enemy of [...enemies]) if (enemy.type !== "boss") killEnemy(enemy, false);
    say("睡了一觉，黑夜过去了。");
  } else {
    say("睡了一觉，白天过去了，夜晚开始。");
    state.spawnTimer = 1;
  }
  queueWorldTime("sleep");
  saveGame();
}

function toolName(req) {
  return req === 1 ? "木镐" : req === 2 ? "石镐" : req === 3 ? "铁镐" : "徒手";
}

function breakTile(col, row, tile) {
  const info = tileInfo[tile.type];
  setTile(col, row, null);
  queueBlockChange(col, row, null);
  if (info.drop) {
    const amount = irand(info.amount[0], info.amount[1]);
    if (amount > 0) {
      state.inv[info.drop] += amount;
      say(`获得 ${amount} 个${label(info.drop)}。`);
    }
  }
}

function damageStructure(structure) {
  structure.hp -= 22 + pickPower[player.pick] * 8;
  burst(structure.x, structure.y, structure.type === "door" ? "#b9824f" : "#d8b16a", 6);
  if (structure.hp > 0) return;
  structures.splice(structures.indexOf(structure), 1);
  state.inv[structure.type] += 1;
  say(`${structureLabel(structure.type)}被挖掉并回到背包。`);
}

function structureLabel(type) {
  return type === "table" ? "合成台" : type === "door" ? "木门" : type === "bed" ? "床" : "熔炉";
}

function label(key) {
  return { wood: "木头", plank: "木板", dirt: "泥土", leaf: "树叶", glass: "玻璃", brick: "石砖", flowerBrick: "花砖", lantern: "灯笼", banner: "蓝旗", wool: "毛线", string: "线", stone: "石头", coal: "煤炭", ironOre: "铁矿", ironIngot: "铁锭", diamond: "钻石", rotten: "腐肉", table: "合成台", furnace: "熔炉", door: "木门", bed: "床" }[key] || key;
}

function shootBolt() {
  if (state.carryingId || state.downed) return say("背着队友或倒地时不能射击。");
  if (!player.ranged) return say("还没有弩，先在合成台制作远程武器。");
  if (state.rangedCooldown > 0 || state.paused || state.gameOver || state.won) return;
  state.rangedCooldown = player.diamondBow ? 0.38 : 0.6;
  bolts.push({ x: player.x, y: player.y - 10, vx: player.facing * (player.diamondBow ? 860 : 720), life: 1.1, damage: player.diamondBow ? 76 : 42 });
}

function meleeDamage() {
  return (player.sword === "diamond" ? 62 : 18) + pickPower[player.pick] * 8;
}

function makeEnemy(type, x, y) {
  if (type === "spider") return { id: nextEntityId("enemy"), type, x, y, w: 36, h: 24, vx: 0, vy: 0, hp: 42, maxHp: 42, speed: 118, bite: 0, color: "#2d2535" };
  if (type === "imp") return { id: nextEntityId("enemy"), type, x, y, w: 30, h: 42, vx: 0, vy: 0, hp: 84, maxHp: 84, speed: 105, bite: 0, color: "#d85633" };
  if (type === "netherBoss") return { id: nextEntityId("enemy"), type, x, y, w: 66, h: 86, vx: 0, vy: 0, hp: 900, maxHp: 900, speed: 82, bite: 0, color: "#5a1d30" };
  return type === "boss"
    ? { id: nextEntityId("enemy"), type, x, y, w: 56, h: 76, vx: 0, vy: 0, hp: 620, maxHp: 620, speed: 72, bite: 0, color: "#9d303c" }
    : { id: nextEntityId("enemy"), type: "zombie", x, y, w: 28, h: 44, vx: 0, vy: 0, hp: 58, maxHp: 58, speed: 70 + state.phase * 2, bite: 0, color: "#4b7f45" };
}

function makeAnimal(type, x, y, hp = 26, dir = Math.random() < 0.5 ? -1 : 1) {
  return { id: nextEntityId("animal"), type, x, y, w: 32, h: 26, vx: 0, vy: 0, hp, maxHp: 26, dir, moveTimer: rand(1, 4), color: "#f3efe4" };
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  burst(enemy.x, enemy.y, enemy.color, 8);
  if (enemy.hp > 0) return;
  if (enemy.type === "boss") {
    state.inv.fireball += 1;
    killEnemy(enemy, true);
    return say("主世界 BOSS 掉落了火球。用水桶、岩浆桶和火球可以合成传送门。");
  }
  if (enemy.type === "netherBoss") {
    state.won = true;
    clearSave();
    ui.startOverlay.classList.remove("hidden");
    ui.startOverlay.querySelector("strong").textContent = "通关成功";
    ui.startOverlay.querySelector("span").textContent = "地狱 BOSS 已经被打败。点生存或创造可以重新开始。";
    killEnemy(enemy, true);
    return say("通关！地狱 BOSS 被击败了。");
  }
  if (enemy.type === "boss") {
    state.won = true;
    clearSave();
    ui.startOverlay.classList.remove("hidden");
    ui.startOverlay.querySelector("strong").textContent = "通关成功";
    ui.startOverlay.querySelector("span").textContent = "最终 BOSS 已经被大败。点击可以重新开始。";
    say("通关！最终 BOSS 被击败。");
  }
  killEnemy(enemy, true);
}

function killEnemy(enemy, canDrop) {
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  if (canDrop && state.dimension === "nether" && (enemy.type === "zombie" || enemy.type === "imp") && Math.random() < 0.28) {
    state.inv.rotten += 1;
    say("地狱怪物掉落了腐肉。");
    return;
  }
  if (canDrop && enemy.type === "zombie" && Math.random() < 0.05) {
    state.inv.rotten += 1;
    say("僵尸掉落腐肉。");
  }
  if (canDrop && enemy.type === "spider") {
    state.inv.string += irand(1, 2);
    say("蜘蛛掉落了线。");
  }
}

function damageAnimal(animal, amount) {
  animal.hp -= amount;
  burst(animal.x, animal.y, "#f3efe4", 6);
  if (animal.hp > 0) return;
  animals.splice(animals.indexOf(animal), 1);
  state.inv.wool += irand(1, 2);
  say("羊掉落了毛线。");
}

function damagePlayer(amount) {
  if (state.mode === "creative") return;
  let damage = amount;
  if (player.armor > 0) {
    const blocked = Math.min(player.armor, Math.ceil(amount * (player.diamondArmor ? 0.7 : 0.45)));
    player.armor -= blocked;
    damage -= blocked;
  }
  player.hp = clamp(player.hp - damage, 0, 100);
}

function update(dt) {
  if (!state.started || state.paused || state.gameOver || state.won) return;
  state.attackCooldown = Math.max(0, state.attackCooldown - dt);
  state.rangedCooldown = Math.max(0, state.rangedCooldown - dt);
  if (player.hp <= 0 && multiplayer.enabled) state.downed = true;
  updatePhase(dt);
  ensureWorldAroundPlayer();
  updateRescue(dt);
  if (!state.downed) updatePlayer(dt);
  updateEnemies(dt);
  updateAnimals(dt);
  updateBolts(dt);
  updateParticles(dt);
  updateRegen(dt);
  updateLiquidHazards(dt);
  checkPortalTouch();
  if (mouse.down && !state.downed && !state.carryingId) mineOrAttack();
  if (player.hp <= 0 && !multiplayer.enabled) endGame();
}

function updatePhase(dt) {
  if (state.dimension === "nether") {
    state.isNight = true;
    state.phaseTimer = PHASE_SECONDS;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = clamp(player.x + side * rand(300, 520), 60, WORLD_W - 60);
      enemies.push(makeEnemy("imp", x, findSurfaceY(Math.floor(x / TILE)) - 42));
      state.spawnTimer = Math.max(1.1, 3.1 - state.phase * 0.16);
    }
    return;
  }
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    state.phaseTimer += PHASE_SECONDS;
    state.isNight = !state.isNight;
    if (state.isNight) {
      state.spawnTimer = 1;
      say("夜晚来了，僵尸会从地面两侧出现。");
    } else {
      state.phase += 1;
      for (const enemy of [...enemies]) if (enemy.type !== "boss") killEnemy(enemy, true);
      say("白天到了，僵尸被阳光消灭。");
    }
    queueWorldTime("phase");
  }
  if (state.isNight) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = clamp(player.x + side * rand(330, 500), 60, WORLD_W - 60);
      const type = Math.random() < 0.28 ? "spider" : "zombie";
      enemies.push(makeEnemy(type, x, findSurfaceY(Math.floor(x / TILE)) - (type === "spider" ? 24 : 44)));
      state.spawnTimer = Math.max(1.4, 4.2 - state.phase * 0.22);
    }
  }
}

function updateLiquidHazards(dt) {
  const left = Math.floor((player.x - player.w / 2) / TILE);
  const right = Math.floor((player.x + player.w / 2) / TILE);
  const top = Math.floor((player.y - player.h / 2) / TILE);
  const bottom = Math.floor((player.y + player.h / 2) / TILE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (tileAt(col, row)?.type === "lava") {
        damagePlayer(18 * dt);
        if (Math.random() < 0.18) burst(player.x, player.y, "#ff8a2b", 2);
        return;
      }
    }
  }
}

function checkPortalTouch() {
  if (state.dimension === "nether") return;
  const portal = structures.find((s) => s.type === "portal" && rectsOverlap(player.x, player.y, player.w, player.h, s.x, s.y, s.w, s.h));
  if (portal) enterNether();
}

function enterNether() {
  state.dimension = "nether";
  state.isNight = true;
  state.phaseTimer = PHASE_SECONDS;
  state.spawnTimer = 1.4;
  generateNetherWorld();
  player.x = 12 * TILE;
  player.y = (SURFACE - 4) * TILE;
  player.vx = 0;
  player.vy = 0;
  saveGame();
  say("你进入了地狱。这里没有白天，新的怪物会不断出现，深处有地狱 BOSS。");
}

function generateNetherWorld() {
  COLS = 92;
  WORLD_W = COLS * TILE;
  tiles.length = 0;
  for (let row = 0; row < ROWS; row++) tiles.push(Array(COLS).fill(null));
  for (let col = 0; col < COLS; col++) {
    const column = generateColumn(col);
    for (let row = 0; row < ROWS; row++) tiles[row][col] = column[row];
  }
  structures.length = 0;
  enemies.length = 0;
  animals.length = 0;
  bolts.length = 0;
  particles.length = 0;
  for (let i = 0; i < 5; i++) {
    const col = 18 + i * 10;
    enemies.push(makeEnemy("imp", col * TILE, findSurfaceY(col) - 42));
  }
  const bossCol = 62;
  enemies.push(makeEnemy("netherBoss", bossCol * TILE, findSurfaceY(bossCol) - 86));
}

function findSurfaceY(col) {
  for (let row = 0; row < ROWS; row++) if (isSolidTile(tileAt(col, row))) return row * TILE;
  return SURFACE * TILE;
}

function updateRegen(dt) {
  state.regenTimer += dt;
  while (state.regenTimer >= 1) {
    state.regenTimer -= 1;
    const nearCampfire = structures.some((s) => s.type === "campfire" && Math.hypot(s.x - player.x, s.y - player.y) < TILE * 4);
    player.hp = clamp(player.hp + (nearCampfire ? 4 : 1), 0, 100);
  }
}

function nearestDownedPeer(range = TILE * 3) {
  return [...remotePlayers.values()]
    .filter((peer) => peer.downed && peer.dimension === state.dimension && Math.hypot((peer.tx ?? peer.x) - player.x, (peer.ty ?? peer.y) - player.y) <= range)
    .sort((a, b) => Math.hypot((a.tx ?? a.x) - player.x, (a.ty ?? a.y) - player.y) - Math.hypot((b.tx ?? b.x) - player.x, (b.ty ?? b.y) - player.y))[0];
}

function peerDrawX(peer) {
  return peer.tx ?? peer.x;
}

function peerDrawY(peer) {
  return peer.ty ?? peer.y;
}

function nearestVisiblePeer() {
  return [...remotePlayers.values()]
    .filter((peer) => peer.dimension === state.dimension)
    .sort((a, b) => Math.hypot(peerDrawX(a) - player.x, peerDrawY(a) - player.y) - Math.hypot(peerDrawX(b) - player.x, peerDrawY(b) - player.y))[0];
}

function teleportToPeer() {
  if (!multiplayer.enabled) return say("只有联机时才能传送。");
  if (!isAdmin()) return say("游客不能传送，需要管理员权限。");
  const target = nearestVisiblePeer();
  if (!target) return say("没有可以传送的队友。");
  const targetWorldX = target.worldX ?? localToWorldX(peerDrawX(target));
  while (targetWorldX < WORLD_ORIGIN_COL * TILE) extendWorldLeft(24);
  while (targetWorldX >= (WORLD_ORIGIN_COL + COLS) * TILE) extendWorldRight(24);
  player.x = worldToLocalX(targetWorldX) - (target.facing || 1) * TILE;
  player.y = peerDrawY(target);
  player.vx = 0;
  player.vy = 0;
  ensureWorldAroundPlayer();
  sendMultiplayerMove(performance.now(), true);
  say("已传送到队友处。");
}

function tryCarryPeer(target = nearestDownedPeer()) {
  if (!multiplayer.enabled || state.downed) return false;
  if (state.carryingId) return false;
  if (!target) return false;
  state.carryingId = target.id;
  say("已背起队友，按 X 放下。");
  sendMultiplayerMove(performance.now(), true);
  return true;
}

function dropCarriedPeer() {
  if (!state.carryingId) return false;
  state.carryingId = "";
  say("已放下队友。");
  sendMultiplayerMove(performance.now(), true);
  return true;
}

function updateRescue(dt) {
  if (state.carriedBy) {
    const carrier = remotePlayers.get(state.carriedBy);
    if (carrier) {
      player.x = (carrier.tx ?? carrier.x) - (carrier.facing || 1) * 22;
      player.y = (carrier.ty ?? carrier.y) - 6;
      player.vx = 0;
      player.vy = 0;
    }
  }
  const target = nearestDownedPeer(TILE * 1.4);
  if (!state.downed && target && keys.has("n") && !state.carryingId) {
    state.reviveHold += dt;
    if (state.reviveHold >= 8) {
      state.reviveTargetId = target.id;
      state.reviveHold = 0;
      say("队友已复活，只有 20 血。");
      syncMultiplayer(performance.now());
      setTimeout(() => { state.reviveTargetId = ""; }, 300);
    }
  } else {
    state.reviveHold = 0;
  }
}

function updatePlayer(dt) {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const jump = keys.has(" ") || keys.has("w") || keys.has("arrowup");
  const sprint = keys.has("shift") && player.stamina > 4;
  const speed = sprint ? 245 : 175;
  player.vx = (right ? speed : 0) - (left ? speed : 0);
  if (left) player.facing = -1;
  if (right) player.facing = 1;
  if (jump && player.onGround) {
    player.vy = -520;
    player.onGround = false;
  }
  player.stamina = clamp(player.stamina + (sprint && (left || right) ? -28 : 20) * dt, 0, 100);
  player.vy += 1200 * dt;
  moveBody(player, dt);
}

function updateEnemies(dt) {
  for (const enemy of [...enemies]) {
    enemy.bite -= dt;
    enemy.vx = Math.sign(player.x - enemy.x) * enemy.speed;
    if (enemy.onGround && (Math.random() < 0.012 || Math.abs(player.y - enemy.y) > 30)) enemy.vy = -430;
    enemy.vy += 1200 * dt;
    moveBody(enemy, dt);
    if (Math.abs(enemy.x - player.x) < (enemy.type === "boss" ? 64 : 38) && Math.abs(enemy.y - player.y) < 58 && enemy.bite <= 0) {
      enemy.bite = enemy.type === "boss" ? 0.9 : 0.75;
      damagePlayer(enemy.type === "boss" ? 22 : 9);
      burst(player.x, player.y, "#ef6f6c", 7);
    }
  }
}

function updateAnimals(dt) {
  for (const animal of animals) {
    animal.moveTimer -= dt;
    if (animal.moveTimer <= 0) {
      animal.moveTimer = rand(1.5, 4.5);
      animal.dir = Math.random() < 0.5 ? -1 : 1;
    }
    animal.vx = animal.dir * 35;
    if (animal.onGround && Math.random() < 0.004) animal.vy = -260;
    animal.vy += 1200 * dt;
    moveBody(animal, dt);
  }
}

function moveBody(body, dt) {
  body.onGround = false;
  body.x += body.vx * dt;
  resolveTiles(body, "x");
  resolveStructures(body, "x");
  body.y += body.vy * dt;
  resolveTiles(body, "y");
  resolveStructures(body, "y");
  body.x = clamp(body.x, body.w / 2, WORLD_W - body.w / 2);
  body.y = clamp(body.y, body.h / 2, WORLD_H - body.h / 2);
}

function resolveTiles(body, axis) {
  const left = Math.floor((body.x - body.w / 2) / TILE);
  const right = Math.floor((body.x + body.w / 2) / TILE);
  const top = Math.floor((body.y - body.h / 2) / TILE);
  const bottom = Math.floor((body.y + body.h / 2) / TILE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (!isSolidTile(tileAt(col, row))) continue;
      const tx = col * TILE;
      const ty = row * TILE;
      if (axis === "x") {
        if (body.vx > 0) body.x = tx - body.w / 2 - 0.1;
        if (body.vx < 0) body.x = tx + TILE + body.w / 2 + 0.1;
        body.vx = 0;
      } else {
        if (body.vy > 0) {
          body.y = ty - body.h / 2 - 0.1;
          body.onGround = true;
        }
        if (body.vy < 0) body.y = ty + TILE + body.h / 2 + 0.1;
        body.vy = 0;
      }
    }
  }
}

function resolveStructures(body, axis) {
  for (const structure of structures) {
    if (structure.type === "portal") continue;
    if (structure.type === "door" && structure.open) continue;
    if (!rectsOverlap(body.x, body.y, body.w, body.h, structure.x, structure.y, structure.w, structure.h)) continue;
    if (axis === "x") {
      if (body.vx > 0) body.x = structure.x - structure.w / 2 - body.w / 2 - 0.1;
      if (body.vx < 0) body.x = structure.x + structure.w / 2 + body.w / 2 + 0.1;
      body.vx = 0;
    } else {
      if (body.vy > 0) {
        body.y = structure.y - structure.h / 2 - body.h / 2 - 0.1;
        body.onGround = true;
      }
      if (body.vy < 0) body.y = structure.y + structure.h / 2 + body.h / 2 + 0.1;
      body.vy = 0;
    }
  }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < aw / 2 + bw / 2 && Math.abs(ay - by) < ah / 2 + bh / 2;
}

function rectOverlapsPlayer(x, y, w, h) {
  return rectsOverlap(player.x, player.y, player.w, player.h, x, y, w, h);
}

function pointInRect(px, py, x, y, w, h) {
  return px >= x - w / 2 && px <= x + w / 2 && py >= y - h / 2 && py <= y + h / 2;
}

function updateBolts(dt) {
  for (const bolt of [...bolts]) {
    bolt.x += bolt.vx * dt;
    bolt.life -= dt;
    if (isSolidTile(tileAt(Math.floor(bolt.x / TILE), Math.floor(bolt.y / TILE)))) bolt.life = 0;
    for (const enemy of [...enemies]) {
      if (Math.abs(enemy.x - bolt.x) < enemy.w / 2 + 8 && Math.abs(enemy.y - bolt.y) < enemy.h / 2 + 8) {
        damageEnemy(enemy, bolt.damage);
        bolt.life = 0;
        break;
      }
    }
    for (const animal of [...animals]) {
      if (Math.abs(animal.x - bolt.x) < animal.w / 2 + 8 && Math.abs(animal.y - bolt.y) < animal.h / 2 + 8) {
        damageAnimal(animal, bolt.damage);
        bolt.life = 0;
        break;
      }
    }
    if (bolt.life <= 0) bolts.splice(bolts.indexOf(bolt), 1);
  }
}

function updateParticles(dt) {
  for (const p of [...particles]) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(particles.indexOf(p), 1);
  }
}

function endGame() {
  state.gameOver = true;
  clearSave();
  ui.startOverlay.classList.remove("hidden");
  ui.startOverlay.querySelector("strong").textContent = "生存失败";
  ui.startOverlay.querySelector("span").textContent = "你倒下了。点击重新开始。";
  say("生命归零。下次尽快做护甲和弩。");
}

function burst(x, y, color, count) {
  if (perf.low) count = Math.min(3, Math.ceil(count * 0.45));
  for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-90, 90), vy: rand(-120, 40), life: rand(0.25, 0.55), color });
}

function draw() {
  camera.x = clamp(player.x - view.w / 2, 0, Math.max(0, WORLD_W - view.w));
  camera.y = clamp(player.y - view.h * 0.72, 0, Math.max(0, WORLD_H - view.h));
  const visible = (item, pad = 96) => item.x > camera.x - pad && item.x < camera.x + view.w + pad && item.y > camera.y - pad && item.y < camera.y + view.h + pad;
  drawSky();
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawTiles();
  structures.forEach((item) => { if (visible(item, 160)) drawStructure(item); });
  bolts.forEach((item) => { if (visible(item, 80)) drawBolt(item); });
  animals.forEach((item) => { if (visible(item, 120)) drawAnimal(item); });
  enemies.forEach((item) => { if (visible(item, 160)) drawEnemy(item); });
  drawPlayer();
  drawRemotePlayers();
  particles.forEach((item) => { if (visible(item, 80)) drawParticle(item); });
  ctx.restore();
  drawNight();
  drawTeammateArrows();
  const now = performance.now();
  if (now - lastUiUpdate > 160) {
    lastUiUpdate = now;
    updateUi();
  }
}

function drawSky() {
  if (perf.low) {
    ctx.fillStyle = state.dimension === "nether" ? "#33151d" : state.isNight ? "#17181b" : "#77a7c6";
    ctx.fillRect(0, 0, view.w, view.h);
    return;
  }
  const key = `${state.dimension}-${state.isNight}-${Math.round(view.h)}`;
  if (skyCache.key === key) {
    ctx.fillStyle = skyCache.fill;
    ctx.fillRect(0, 0, view.w, view.h);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  if (state.dimension === "nether") {
    g.addColorStop(0, "#260b18");
    g.addColorStop(0.62, "#562033");
    g.addColorStop(1, "#33151d");
  } else {
    g.addColorStop(0, state.isNight ? "#121827" : "#77a7c6");
    g.addColorStop(0.62, state.isNight ? "#1d2130" : "#d8b06b");
    g.addColorStop(1, state.isNight ? "#17181b" : "#6f5434");
  }
  skyCache.key = key;
  skyCache.fill = g;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);
}

function drawTiles() {
  const startCol = Math.max(0, Math.floor(camera.x / TILE) - 1);
  const endCol = Math.min(COLS - 1, Math.ceil((camera.x + view.w) / TILE) + 1);
  const startRow = Math.max(0, Math.floor(camera.y / TILE) - 1);
  const endRow = Math.min(ROWS - 1, Math.ceil((camera.y + view.h) / TILE) + 1);
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = tileAt(col, row);
      if (!tile) continue;
      const info = tileInfo[tile.type];
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = info.color;
      ctx.fillRect(x, y, TILE, TILE);
      if (info.liquid) {
        ctx.fillStyle = tile.type === "lava" ? "rgba(255, 219, 84, .45)" : "rgba(190, 230, 255, .36)";
        ctx.fillRect(x + 3, y + 8 + (perf.low ? 0 : Math.sin((performance.now() / 180) + col) * 2), TILE - 6, 5);
      }
      if (!perf.low) {
        ctx.strokeStyle = "rgba(0,0,0,.16)";
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        drawOreMark(tile.type, x, y);
      } else if (tile.type === "coal" || tile.type === "iron" || tile.type === "diamond") {
        drawOreMark(tile.type, x, y);
      }
      if (tile.hp < info.hp) {
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 2;
        line(x + 8, y + 9, x + 24, y + 23);
        line(x + 24, y + 9, x + 8, y + 23);
      }
    }
  }
}

function drawOreMark(type, x, y) {
  if (type === "coal") ctx.fillStyle = "#111";
  else if (type === "iron") ctx.fillStyle = "#e1a07b";
  else if (type === "diamond") ctx.fillStyle = "#d5ffff";
  else if (type === "netherrack") {
    ctx.fillStyle = "#9a4153";
    circle(x + 11, y + 11, 3);
    circle(x + 23, y + 22, 4);
    return;
  } else if (type === "hellstone") {
    ctx.fillStyle = "#f06423";
    circle(x + 9, y + 22, 3);
    circle(x + 22, y + 12, 4);
    return;
  }
  else if (type === "leaf") ctx.fillStyle = "#56a35d";
  else if (type === "plank") {
    ctx.strokeStyle = "rgba(80, 42, 18, .45)";
    ctx.lineWidth = 2;
    line(x + 3, y + 11, x + 29, y + 11);
    line(x + 3, y + 22, x + 29, y + 22);
    return;
  } else if (type === "glass") {
    ctx.strokeStyle = "rgba(230, 255, 255, .8)";
    ctx.lineWidth = 2;
    line(x + 6, y + 24, x + 24, y + 6);
    line(x + 18, y + 26, x + 26, y + 18);
    return;
  } else if (type === "brick") {
    ctx.strokeStyle = "rgba(60, 60, 55, .45)";
    ctx.lineWidth = 2;
    line(x + 1, y + 11, x + 31, y + 11);
    line(x + 1, y + 22, x + 31, y + 22);
    line(x + 14, y + 1, x + 14, y + 11);
    line(x + 22, y + 11, x + 22, y + 22);
    line(x + 10, y + 22, x + 10, y + 31);
    return;
  } else if (type === "flowerBrick") {
    ctx.fillStyle = "#e09ab0";
    circle(x + 16, y + 16, 4);
    ctx.fillStyle = "#fff0b6";
    circle(x + 16, y + 10, 3);
    circle(x + 22, y + 16, 3);
    circle(x + 16, y + 22, 3);
    circle(x + 10, y + 16, 3);
    return;
  } else if (type === "lantern") {
    ctx.fillStyle = "rgba(255, 200, 88, .25)";
    circle(x + 16, y + 16, 15);
    ctx.fillStyle = "#ffca58";
    ctx.fillRect(x + 10, y + 9, 12, 15);
    ctx.strokeStyle = "#6a4a2a";
    ctx.strokeRect(x + 10, y + 9, 12, 15);
    return;
  } else if (type === "banner") {
    ctx.strokeStyle = "#2b2b30";
    ctx.lineWidth = 3;
    line(x + 10, y + 6, x + 10, y + 28);
    ctx.fillStyle = "#355fc5";
    ctx.fillRect(x + 11, y + 7, 15, 16);
    ctx.fillStyle = "#f2d36b";
    ctx.fillRect(x + 14, y + 10, 8, 3);
    return;
  }
  else return;
  circle(x + 10, y + 12, 4);
  circle(x + 22, y + 21, 5);
}

function drawStructure(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  if (s.type === "table") {
    ctx.fillStyle = "#8b5c35";
    ctx.fillRect(-15, -15, 30, 30);
    ctx.strokeStyle = "#3a2417";
    ctx.strokeRect(-15, -15, 30, 30);
  } else if (s.type === "furnace") {
    ctx.fillStyle = "#6f7374";
    ctx.fillRect(-15, -15, 30, 30);
    ctx.fillStyle = "#f19a38";
    ctx.fillRect(-9, -1, 18, 8);
  } else if (s.type === "door") {
    ctx.fillStyle = "#a8693b";
    if (s.open) {
      ctx.globalAlpha = 0.45;
      ctx.fillRect(-4, -32, 8, 64);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#d29b5b";
      ctx.fillRect(4, -30, 8, 60);
    } else {
      ctx.fillRect(-12, -32, 24, 64);
    }
    ctx.strokeStyle = "#57351f";
    ctx.lineWidth = 3;
    ctx.strokeRect(s.open ? -4 : -12, -32, s.open ? 8 : 24, 64);
    ctx.fillStyle = "#e2bd70";
    circle(s.open ? 9 : 6, 1, 3);
  } else if (s.type === "bed") {
    ctx.fillStyle = "#8b5c35";
    ctx.fillRect(-32, -4, 64, 12);
    ctx.fillStyle = "#d94b5c";
    ctx.fillRect(-28, -16, 56, 18);
    ctx.fillStyle = "#f2efe5";
    ctx.fillRect(-28, -16, 18, 18);
  } else if (s.type === "campfire") {
    ctx.fillStyle = "#5b3823";
    ctx.fillRect(-16, 2, 32, 8);
    ctx.fillStyle = "#ff9a2d";
    circle(0, -6, 10);
    ctx.fillStyle = "#ffd36c";
    circle(0, -9, 5);
  } else if (s.type === "portal") {
    ctx.strokeStyle = "#231833";
    ctx.lineWidth = 8;
    ctx.strokeRect(-18, -42, 36, 84);
    const pulse = 0.45 + Math.sin(performance.now() / 180) * 0.12;
    ctx.fillStyle = `rgba(144, 67, 215, ${pulse})`;
    ctx.fillRect(-14, -38, 28, 76);
    ctx.strokeStyle = "rgba(235, 189, 255, .75)";
    ctx.lineWidth = 2;
    line(-8, -26, 9, -12);
    line(8, 2, -9, 22);
  }
  ctx.restore();
}

function drawAnimal(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.fillStyle = "#f3efe4";
  ctx.fillRect(-a.w / 2, -a.h / 2, a.w, a.h);
  ctx.fillStyle = "#242424";
  ctx.fillRect(a.dir > 0 ? 8 : -14, -8, 8, 8);
  ctx.fillStyle = "#ddd6c8";
  circle(-8, -12, 5);
  circle(2, -13, 5);
  circle(11, -11, 5);
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = player.diamondArmor ? "#77e6ef" : player.armor > 0 ? "#aebfc8" : "#315c9c";
  ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
  ctx.fillStyle = "#f2c14e";
  ctx.fillRect(player.facing > 0 ? 2 : -12, -player.h / 2 - 10, 14, 14);
  ctx.strokeStyle = player.sword === "diamond" ? "#9ff7ff" : player.pick === "iron" ? "#d7d7e1" : player.pick === "stone" ? "#b7b7ad" : player.pick === "wood" ? "#8b5c35" : "#5b3a29";
  ctx.lineWidth = 4;
  line(player.facing * 8, -6, player.facing * 28, -16);
  ctx.restore();
}

function drawRemotePlayers() {
  if (!multiplayer.enabled) return;
  const now = performance.now();
  const remoteBuffer = clamp(190 + multiplayer.jitter * 2.1 + multiplayer.latency * 0.16, 210, 380);
  const renderServerAt = multiplayer.serverOffset ? now + multiplayer.serverOffset - remoteBuffer : 0;
  for (const peer of remotePlayers.values()) {
    if (peer.dimension !== state.dimension) continue;
    const renderAt = now - (wsReady() ? remoteBuffer : 240);
    const samples = peer.samples || [];
    let targetX = peer.tx ?? peer.x;
    let targetY = peer.ty ?? peer.y;
    let interpolated = false;
    if (renderServerAt) {
      if (samples[0] && renderServerAt <= samples[0].remoteT) {
        targetX = samples[0].x;
        targetY = samples[0].y;
        interpolated = true;
      }
      for (let i = 0; i < samples.length - 1; i += 1) {
        const a = samples[i];
        const b = samples[i + 1];
        if (a.remoteT <= renderServerAt && b.remoteT >= renderServerAt) {
          const mix = clamp((renderServerAt - a.remoteT) / Math.max(1, b.remoteT - a.remoteT), 0, 1);
          targetX = a.x + (b.x - a.x) * mix;
          targetY = a.y + (b.y - a.y) * mix;
          interpolated = true;
          break;
        }
      }
    } else {
      if (samples[0] && renderAt <= samples[0].receivedAt) {
        targetX = samples[0].x;
        targetY = samples[0].y;
        interpolated = true;
      }
      for (let i = 0; i < samples.length - 1; i += 1) {
        const a = samples[i];
        const b = samples[i + 1];
        if (a.receivedAt <= renderAt && b.receivedAt >= renderAt) {
          const mix = clamp((renderAt - a.receivedAt) / Math.max(1, b.receivedAt - a.receivedAt), 0, 1);
          targetX = a.x + (b.x - a.x) * mix;
          targetY = a.y + (b.y - a.y) * mix;
          interpolated = true;
          break;
        }
      }
    }
    const newest = samples[samples.length - 1];
    const newestAge = renderServerAt && newest?.remoteT ? (renderServerAt - newest.remoteT) / 1000 : newest ? (renderAt - newest.receivedAt) / 1000 : 0;
    if (!interpolated && newest && newestAge > 0) {
      const age = Math.min(0.12, newestAge);
      targetX = newest.x + clamp((newest.vx || 0) * age, -24, 24);
      targetY = newest.y + clamp((newest.vy || 0) * age, -16, 16);
    }
    const blend = wsReady() ? 0.34 : 0.28;
    peer.x += (targetX - peer.x) * blend;
    peer.y += (targetY - peer.y) * blend;
    const feetCol = Math.floor(peer.x / TILE);
    const groundY = findSurfaceY(feetCol) - 22;
    if (isSolidTile(tileAt(feetCol, Math.floor((peer.y + 20) / TILE))) && peer.y > groundY + TILE * 0.35) {
      peer.y += (groundY - peer.y) * 0.35;
    }
    ctx.save();
    const carrier = peer.carriedBy ? remotePlayers.get(peer.carriedBy) : null;
    const drawX = carrier ? (carrier.tx ?? carrier.x) - (carrier.facing || 1) * 22 : peer.x;
    const drawY = carrier ? (carrier.ty ?? carrier.y) - 6 : peer.y;
    ctx.translate(drawX, drawY);
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = peer.diamondArmor ? "#78eff2" : peer.armor > 0 ? "#d2d7dc" : "#7a66d8";
    if (peer.downed) {
      ctx.fillStyle = "#7b6b6b";
      ctx.fillRect(-22, 6, 44, 16);
    } else {
      ctx.fillRect(-12, -22, 24, 44);
    }
    ctx.fillStyle = "#ffd36c";
    ctx.fillRect(peer.downed ? -7 : peer.facing > 0 ? 2 : -12, peer.downed ? -7 : -32, 14, 14);
    ctx.strokeStyle = peer.sword === "diamond" ? "#a6fbff" : "#f5f0de";
    ctx.lineWidth = 4;
    line((peer.facing || 1) * 8, -6, (peer.facing || 1) * 28, -16);
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(-22, 29, 44, 6);
    ctx.fillStyle = "#70d26f";
    ctx.fillRect(-22, 29, 44 * clamp((peer.hp || 0) / 100, 0, 1), 6);
    ctx.fillStyle = "#fff8db";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("队友", 0, -39);
    ctx.restore();
  }
}

function drawTeammateArrows() {
  if (!multiplayer.enabled || remotePlayers.size === 0) return;
  const margin = 38;
  const centerX = view.w / 2;
  const centerY = view.h / 2;
  for (const peer of remotePlayers.values()) {
    if (peer.dimension !== state.dimension) continue;
    const sx = peerDrawX(peer) - camera.x;
    const sy = peerDrawY(peer) - camera.y;
    if (sx >= 0 && sx <= view.w && sy >= 0 && sy <= view.h) continue;
    const dx = sx - centerX;
    const dy = sy - centerY;
    const angle = Math.atan2(dy, dx);
    const edgeX = clamp(centerX + Math.cos(angle) * Math.min(centerX - margin, Math.abs(dx)), margin, view.w - margin);
    const edgeY = clamp(centerY + Math.sin(angle) * Math.min(centerY - margin, Math.abs(dy)), margin, view.h - margin);
    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(angle);
    ctx.fillStyle = peer.downed ? "rgba(239, 95, 95, .92)" : "rgba(255, 211, 108, .92)";
    ctx.strokeStyle = "rgba(20, 18, 14, .72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff8db";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(peer.downed ? "倒地队友" : "队友", edgeX, edgeY + 28);
  }
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.color;
  if (e.type === "spider") {
    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
    ctx.strokeStyle = "#1d1822";
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      line(side * 8, 0, side * 24, 12);
      line(side * 4, -4, side * 22, -14);
    }
  } else {
    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
  }
  ctx.fillStyle = "#f7f2e5";
  circle(-6, -e.h / 2 + 10, 3);
  circle(6, -e.h / 2 + 10, 3);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fillRect(-e.w / 2, e.h / 2 + 7, e.w, 5);
  ctx.fillStyle = e.type === "boss" ? "#ef6f6c" : "#73c267";
  ctx.fillRect(-e.w / 2, e.h / 2 + 7, e.w * Math.max(0, e.hp / e.maxHp), 5);
  ctx.restore();
}

function drawBolt(b) {
  ctx.strokeStyle = "#f7f2e5";
  ctx.lineWidth = 4;
  line(b.x - Math.sign(b.vx) * 14, b.y, b.x + Math.sign(b.vx) * 14, b.y);
}

function drawParticle(p) {
  ctx.globalAlpha = clamp(p.life * 2.5, 0, 1);
  ctx.fillStyle = p.color;
  circle(p.x, p.y, 3);
  ctx.globalAlpha = 1;
}

function drawNight() {
  if (!state.isNight || state.dimension === "nether") return;
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.fillRect(0, 0, view.w, view.h);
}

function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function updateUi() {
  ui.armorMeter.max = player.diamondArmor ? 40 : 20;
  ui.hpMeter.value = player.hp;
  ui.armorMeter.value = player.armor;
  ui.staminaMeter.value = player.stamina;
  ui.hpText.textContent = `${Math.ceil(player.hp)}/100`;
  ui.armorText.textContent = Math.ceil(player.armor);
  ui.staminaText.textContent = Math.ceil(player.stamina);
  ui.phaseText.textContent = `${state.mode === "creative" ? "创造" : "生存"} · ${state.isNight ? "夜晚 · 怪物在地面追击" : "白天 · 地面在屏幕底部，向下挖矿"}`;
  ui.dayText.textContent = `${state.isNight ? "夜晚" : "白天"} ${state.phase}`;
  if (state.dimension === "nether") {
    ui.phaseText.textContent = `${state.mode === "creative" ? "创造" : "生存"} · 地狱 · 怪物不会被白天清除`;
    ui.dayText.textContent = `地狱 ${state.phase}`;
  }
  const seconds = Math.max(0, Math.ceil(state.phaseTimer));
  ui.clockText.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  ui.toolText.textContent = pickNames[player.pick];
  ui.rangedText.textContent = player.diamondBow ? "钻石弩" : player.ranged ? "弩" : "无";
  ui.multiplayerText.textContent = multiplayer.enabled ? `${multiplayer.online ? "在线" : "连接中"} ${remotePlayers.size + 1}人` : "离线";
  ui.woodText.textContent = state.inv.wood;
  ui.plankText.textContent = state.inv.plank;
  ui.dirtText.textContent = state.inv.dirt;
  ui.leafText.textContent = state.inv.leaf;
  ui.stoneText.textContent = state.inv.stone;
  ui.coalText.textContent = state.inv.coal;
  ui.ironOreText.textContent = state.inv.ironOre;
  ui.ironIngotText.textContent = state.inv.ironIngot;
  ui.diamondText.textContent = state.inv.diamond;
  ui.glassText.textContent = state.inv.glass;
  ui.brickText.textContent = state.inv.brick;
  ui.flowerBrickText.textContent = state.inv.flowerBrick;
  ui.lanternText.textContent = state.inv.lantern;
  ui.bannerText.textContent = state.inv.banner;
  ui.woolText.textContent = state.inv.wool;
  ui.stringText.textContent = state.inv.string;
  ui.rottenText.textContent = state.inv.rotten;
  ui.furnaceText.textContent = state.inv.furnace;
  ui.doorText.textContent = state.inv.door;
  ui.bedText.textContent = state.inv.bed;
  ui.campfireText.textContent = state.inv.campfire;
  ui.bucketText.textContent = state.inv.bucket;
  ui.waterBucketText.textContent = state.inv.waterBucket;
  ui.lavaBucketText.textContent = state.inv.lavaBucket;
  ui.fireballText.textContent = state.inv.fireball;
  ui.portalText.textContent = state.inv.portal;
  if (ui.teleportPeerBtn) ui.teleportPeerBtn.hidden = !multiplayer.enabled || !isAdmin();
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.last) / 1000 || 0);
  state.last = now;
  update(dt);
  syncMultiplayer(now);
  maybeAutosave(now);
  draw();
  requestAnimationFrame(loop);
}

let lastAutosave = 0;
function maybeAutosave(now) {
  if (now - lastAutosave < 8000) return;
  lastAutosave = now;
  saveGame();
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === "f") shootBolt();
  if (event.key.toLowerCase() === "e") toggleNearestDoor();
  if (event.key.toLowerCase() === "x") dropCarriedPeer();
  if (event.key.toLowerCase() === "z") teleportToPeer();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
});

function setPointerAim(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = clamp(clientX - rect.left, 0, rect.width);
  mouse.y = clamp(clientY - rect.top, 0, rect.height);
}

function aimAhead(distance = 96) {
  mouse.x = player.x - camera.x + player.facing * distance;
  mouse.y = player.y - camera.y - 12;
}

canvas.addEventListener("mousedown", (event) => {
  setPointerAim(event.clientX, event.clientY);
  if (event.button === 1) shootBolt();
  if (event.button === 0) {
    const target = worldMouse();
    const downedPeer = [...remotePlayers.values()].find((peer) => peer.downed && Math.hypot((peer.tx ?? peer.x) - target.x, (peer.ty ?? peer.y) - target.y) < 42 && Math.hypot((peer.tx ?? peer.x) - player.x, (peer.ty ?? peer.y) - player.y) <= TILE * 3);
    if (downedPeer && tryCarryPeer(downedPeer)) return;
    mouse.down = true;
    mineOrAttack();
  }
});
canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (tryCollectLiquidWithBucket()) return;
  placeStructure();
});
window.addEventListener("mouseup", () => { mouse.down = false; });

canvas.addEventListener("touchstart", (event) => {
  if (event.target.closest(".mobile-controls")) return;
  event.preventDefault();
  const touch = event.changedTouches[0];
  if (!touch) return;
  setPointerAim(touch.clientX, touch.clientY);
  touchAction.mining = false;
  touchAction.moved = false;
  clearTimeout(touchAction.timer);
  touchAction.timer = setTimeout(() => {
    touchAction.mining = true;
    mouse.down = true;
    mineOrAttack();
  }, 260);
}, { passive: false });
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  if (touch) {
    touchAction.moved = true;
    setPointerAim(touch.clientX, touch.clientY);
  }
}, { passive: false });
canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  clearTimeout(touchAction.timer);
  if (!touchAction.mining && !touchAction.moved) {
    if (tryCollectLiquidWithBucket()) return;
    placeStructure();
  }
  mouse.down = false;
  touchAction.mining = false;
}, { passive: false });
canvas.addEventListener("touchcancel", () => {
  clearTimeout(touchAction.timer);
  mouse.down = false;
  touchAction.mining = false;
}, { passive: false });

function releaseMobileButton(button) {
  if (mobileKeyEditor.drag?.button === button) {
    stopMobileButtonDrag();
    return;
  }
  const key = button.dataset.key;
  if (key) keys.delete(key);
  if (button.dataset.action === "rescue") keys.delete("n");
  button.classList.remove("active");
}

function triggerMobileSprint() {
  keys.add("shift");
  clearTimeout(mobileTap.sprintTimer);
  mobileTap.sprintTimer = setTimeout(() => keys.delete("shift"), 900);
}

function pressMobileKey(key) {
  const now = performance.now();
  if ((key === "a" || key === "d") && now - mobileTap[key] < 300) triggerMobileSprint();
  if (key === "a" || key === "d") mobileTap[key] = now;
  keys.add(key);
}

function mobileButtonId(button) {
  return button.dataset.action || `key-${button.dataset.key || "blank"}`;
}

function applyMobileKeyLayout() {
  let layout = {};
  try {
    layout = JSON.parse(localStorage.getItem(MOBILE_KEYS_KEY) || "{}");
  } catch {
    layout = {};
  }
  document.querySelectorAll(".mobile-btn").forEach((button) => {
    const pos = layout[mobileButtonId(button)];
    if (!pos) return;
    button.style.transform = `translate(${Number(pos.x) || 0}px, ${Number(pos.y) || 0}px)`;
    button.dataset.moveX = Number(pos.x) || 0;
    button.dataset.moveY = Number(pos.y) || 0;
  });
}

function saveMobileKeyLayout() {
  const layout = {};
  document.querySelectorAll(".mobile-btn").forEach((button) => {
    layout[mobileButtonId(button)] = {
      x: Number(button.dataset.moveX) || 0,
      y: Number(button.dataset.moveY) || 0,
    };
  });
  localStorage.setItem(MOBILE_KEYS_KEY, JSON.stringify(layout));
}

function toggleMobileKeyEditor() {
  mobileKeyEditor.editing = !mobileKeyEditor.editing;
  document.querySelector(".mobile-controls").classList.toggle("editing", mobileKeyEditor.editing);
  say(mobileKeyEditor.editing ? "按键编辑已开启，拖动按钮调整位置。" : "按键位置已保存。");
  if (!mobileKeyEditor.editing) saveMobileKeyLayout();
}

function startMobileButtonDrag(button, event) {
  const x = Number(button.dataset.moveX) || 0;
  const y = Number(button.dataset.moveY) || 0;
  mobileKeyEditor.drag = { button, startX: event.clientX, startY: event.clientY, x, y };
}

function moveMobileButton(event) {
  const drag = mobileKeyEditor.drag;
  if (!drag) return;
  const x = drag.x + event.clientX - drag.startX;
  const y = drag.y + event.clientY - drag.startY;
  drag.button.dataset.moveX = x;
  drag.button.dataset.moveY = y;
  drag.button.style.transform = `translate(${x}px, ${y}px)`;
}

function stopMobileButtonDrag() {
  if (!mobileKeyEditor.drag) return;
  mobileKeyEditor.drag = null;
  saveMobileKeyLayout();
}

function toggleLowQuality() {
  perf.low = !perf.low;
  localStorage.setItem("zijia-low-quality", perf.low ? "1" : "0");
  resize();
  say(perf.low ? "低画质已开启，更流畅。" : "低画质已关闭，画面更清晰。");
}

function pressRescueKey() {
  if (state.carryingId) {
    dropCarriedPeer();
    return;
  }
  if (tryCarryPeer()) return;
  keys.add("n");
  say("按住救键 8 秒复活旁边倒地队友。");
}

document.querySelectorAll(".mobile-btn").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (button.dataset.action === "editKeys") {
      toggleMobileKeyEditor();
      return;
    }
    if (button.dataset.action === "quality") {
      toggleLowQuality();
      return;
    }
    if (mobileKeyEditor.editing) {
      startMobileButtonDrag(button, event);
      return;
    }
    button.classList.add("active");
    const key = button.dataset.key;
    if (key) {
      pressMobileKey(key);
      return;
    }
    const action = button.dataset.action;
    if (action === "shoot") {
      aimAhead(120);
      shootBolt();
    } else if (action === "door") {
      toggleNearestDoor();
    } else if (action === "rescue") {
      pressRescueKey();
    } else if (action === "inventory") {
      ui.toggleInventoryBtn.click();
    }
  });
  button.addEventListener("pointermove", (event) => {
    if (mobileKeyEditor.editing) moveMobileButton(event);
  });
  button.addEventListener("pointerup", () => releaseMobileButton(button));
  button.addEventListener("pointercancel", () => releaseMobileButton(button));
  button.addEventListener("lostpointercapture", () => releaseMobileButton(button));
});

applyMobileKeyLayout();

document.querySelector("#craftTableBtn").addEventListener("click", craftTable);
document.querySelector("#placeTableBtn").addEventListener("click", () => choosePlace("table"));
document.querySelector("#craftPlankBtn").addEventListener("click", craftPlank);
document.querySelector("#placePlankBtn").addEventListener("click", () => choosePlace("plank"));
document.querySelector("#placeDirtBtn").addEventListener("click", () => choosePlace("dirt"));
document.querySelector("#placeLeafBtn").addEventListener("click", () => choosePlace("leaf"));
document.querySelector("#placeWoodBtn").addEventListener("click", () => choosePlace("wood"));
document.querySelector("#craftDoorBtn").addEventListener("click", craftDoor);
document.querySelector("#craftFurnaceBtn").addEventListener("click", craftFurnace);
document.querySelector("#placeFurnaceBtn").addEventListener("click", () => choosePlace("furnace"));
document.querySelector("#placeDoorBtn").addEventListener("click", () => choosePlace("door"));
document.querySelector("#craftWoodPickBtn").addEventListener("click", craftWoodPick);
document.querySelector("#craftStonePickBtn").addEventListener("click", craftStonePick);
document.querySelector("#smeltIronBtn").addEventListener("click", smeltIron);
document.querySelector("#craftIronPickBtn").addEventListener("click", craftIronPick);
document.querySelector("#craftArmorBtn").addEventListener("click", craftArmor);
document.querySelector("#craftBowBtn").addEventListener("click", craftBow);
document.querySelector("#craftDiamondSwordBtn").addEventListener("click", craftDiamondSword);
document.querySelector("#craftDiamondArmorBtn").addEventListener("click", craftDiamondArmor);
document.querySelector("#craftDiamondBowBtn").addEventListener("click", craftDiamondBow);
document.querySelector("#craftGlassBtn").addEventListener("click", craftGlass);
document.querySelector("#placeGlassBtn").addEventListener("click", () => choosePlace("glass"));
document.querySelector("#craftBrickBtn").addEventListener("click", craftBrick);
document.querySelector("#placeBrickBtn").addEventListener("click", () => choosePlace("brick"));
document.querySelector("#craftFlowerBrickBtn").addEventListener("click", craftFlowerBrick);
document.querySelector("#placeFlowerBrickBtn").addEventListener("click", () => choosePlace("flowerBrick"));
document.querySelector("#craftLanternBtn").addEventListener("click", craftLantern);
document.querySelector("#placeLanternBtn").addEventListener("click", () => choosePlace("lantern"));
document.querySelector("#craftBannerBtn").addEventListener("click", craftBanner);
document.querySelector("#placeBannerBtn").addEventListener("click", () => choosePlace("banner"));
document.querySelector("#craftWoolBtn").addEventListener("click", craftWool);
document.querySelector("#craftBedBtn").addEventListener("click", craftBed);
document.querySelector("#placeBedBtn").addEventListener("click", () => choosePlace("bed"));
document.querySelector("#craftCampfireBtn").addEventListener("click", craftCampfire);
document.querySelector("#placeCampfireBtn").addEventListener("click", () => choosePlace("campfire"));
document.querySelector("#sleepBtn").addEventListener("click", sleepInBed);
document.querySelector("#craftBucketBtn").addEventListener("click", craftBucket);
document.querySelector("#collectWaterBtn").addEventListener("click", () => collectLiquid("water"));
document.querySelector("#collectLavaBtn").addEventListener("click", () => collectLiquid("lava"));
document.querySelector("#craftBossBtn").addEventListener("click", craftBoss);
document.querySelector("#craftPortalBtn").addEventListener("click", craftPortal);
document.querySelector("#placePortalBtn").addEventListener("click", () => choosePlace("portal"));
ui.voiceBtn.addEventListener("click", toggleVoice);
ui.adminRoleBtn.addEventListener("click", () => setRole("admin"));
ui.guestRoleBtn.addEventListener("click", () => setRole("guest"));
ui.teleportPeerBtn.addEventListener("click", teleportToPeer);
ui.survivalBtn.addEventListener("click", () => { clearSave(); resetGame("survival"); });
ui.creativeBtn.addEventListener("click", () => { clearSave(); resetGame("creative"); });
ui.multiplayerBtn.addEventListener("click", () => { clearSave(); resetGame("survival"); startMultiplayer(); });
ui.newMultiplayerBtn.addEventListener("click", startNewMultiplayerSave);
ui.copyRoomBtn.addEventListener("click", () => copyText(multiplayer.room, "房间号"));
ui.copyLinkBtn.addEventListener("click", () => copyText(multiplayerShareUrl(), "联机地址"));
ui.hideShareBtn.addEventListener("click", () => {
  localStorage.setItem("zijia-hide-room-panel", "1");
  updateSharePanel();
  say("房间号已隐藏，点状态栏的联机可重新显示。");
});
ui.multiplayerText.addEventListener("click", () => {
  if (!multiplayer.enabled) return;
  localStorage.removeItem("zijia-hide-room-panel");
  updateSharePanel();
});
ui.startOverlay.addEventListener("click", (event) => {
  if (event.target.closest(".mode-actions")) return;
  if (event.target.closest(".permission-actions")) return;
  if (!loadGame()) resetGame("survival");
});
ui.toggleInventoryBtn.addEventListener("click", () => {
  state.inventoryHidden = !state.inventoryHidden;
  document.querySelector(".inventory").classList.toggle("collapsed", state.inventoryHidden);
  ui.toggleInventoryBtn.textContent = state.inventoryHidden ? "显示" : "隐藏";
});
ui.pauseBtn.addEventListener("click", () => {
  if (!state.started || state.gameOver || state.won) return;
  state.paused = !state.paused;
  saveGame();
  ui.pauseBtn.textContent = state.paused ? "继续" : "暂停";
  say(state.paused ? "已暂停。" : "继续生存。");
});

updateRoleUi();
resize();
if (!prepareSavedGame()) seedWorld();
state.last = performance.now();
requestAnimationFrame(loop);
setInterval(() => {
  if (!multiplayer.enabled) return;
  syncMultiplayer(performance.now());
}, 60);
setInterval(() => {
  if (!multiplayer.enabled || !wsReady()) return;
  sendMultiplayerMove(performance.now());
}, 50);
window.addEventListener("beforeunload", saveGame);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveGame();
});
