from pathlib import Path
import re
import shutil
import subprocess
import time

ROOT = Path.cwd()
STAMP = time.strftime('%Y%m%d%H%M%S')


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def write(name, text):
    path = ROOT / name
    backup = ROOT / f'{name}.bak-{STAMP}'
    if not backup.exists():
        shutil.copyfile(path, backup)
    path.write_text(text, encoding='utf-8')
    print(f'patched {name}')


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'missing patch point: {label}')
    return text.replace(old, new, 1)

side = read('sideview.js')
side = side.replace('china-mobile-7', 'china-mobile-8')
side = replace_once(side, '  dimension: "overworld",\n  homeBed: null,\n  inventoryHidden: false,', '  dimension: "overworld",\n  homeBed: null,\n  overworldSnapshot: null,\n  inventoryHidden: false,', 'state overworldSnapshot')
side = replace_once(side, '      dimension: state.dimension,\n      homeBed: state.homeBed,\n      inventoryHidden: state.inventoryHidden,', '      dimension: state.dimension,\n      homeBed: state.homeBed,\n      overworldSnapshot: state.overworldSnapshot,\n      inventoryHidden: state.inventoryHidden,', 'save overworldSnapshot')
side = replace_once(side, '      dimension: save.state.dimension || "overworld",\n      homeBed: save.state.homeBed || null,\n      inventoryHidden: !!save.state.inventoryHidden,', '      dimension: save.state.dimension || "overworld",\n      homeBed: save.state.homeBed || null,\n      overworldSnapshot: save.state.overworldSnapshot || null,\n      inventoryHidden: !!save.state.inventoryHidden,', 'load overworldSnapshot')
side = replace_once(side, '    dimension: "overworld",\n    homeBed: null,\n    inventoryHidden: false,', '    dimension: "overworld",\n    homeBed: null,\n    overworldSnapshot: null,\n    inventoryHidden: false,', 'reset overworldSnapshot')

resize_new = '''function resize() {
  applyViewportSize();
  const dpr = perf.low ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
  const rect = canvas.getBoundingClientRect();
  view.w = document.body.classList.contains("portrait-phone") ? canvas.offsetWidth : rect.width;
  view.h = document.body.classList.contains("portrait-phone") ? canvas.offsetHeight : rect.height;
  canvas.width = Math.floor(view.w * dpr);
  canvas.height = Math.floor(view.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyViewportSize() {
  const visual = window.visualViewport;
  const width = Math.floor(visual ? visual.width : window.innerWidth);
  const height = Math.floor(visual ? visual.height : window.innerHeight);
  document.documentElement.style.setProperty("--app-width", `${width}px`);
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.body.classList.toggle("portrait-phone", isMobileBuild && height > width);
}'''
if 'function applyViewportSize()' not in side:
    side = re.sub(r'function resize\(\) \{.*?ctx\.setTransform\(dpr, 0, 0, dpr, 0, 0\);\n\}', resize_new, side, count=1, flags=re.S)

snapshot_funcs = '''
function snapshotCurrentWorld() {
  return {
    cols: COLS,
    originCol: WORLD_ORIGIN_COL,
    tiles: serializeTiles(),
    structures: structures.map((s) => ({ id: s.id || "", type: s.type, x: s.x, y: s.y, w: s.w, h: s.h, hp: s.hp, open: !!s.open, ownerId: s.ownerId || "", color: s.color || "" })),
    enemies: enemies.filter((e) => e.type !== "boss" && e.type !== "netherBoss").map((e) => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, bite: e.bite })),
    animals: animals.map((a) => ({ type: a.type, x: a.x, y: a.y, hp: a.hp, dir: a.dir })),
  };
}

function restoreWorldSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.tiles)) return false;
  COLS = snapshot.cols || COLS;
  WORLD_ORIGIN_COL = Number(snapshot.originCol) || 0;
  WORLD_W = COLS * TILE;
  hydrateTiles(snapshot.tiles);
  structures.length = 0;
  structures.push(...(snapshot.structures || []).map((s) => ({ ...s, open: !!s.open })));
  enemies.length = 0;
  enemies.push(...(snapshot.enemies || []).map((e) => ({ ...makeEnemy(e.type, e.x, e.y), hp: e.hp, maxHp: e.maxHp, bite: e.bite || 0 })));
  animals.length = 0;
  animals.push(...(snapshot.animals || []).map((a) => makeAnimal(a.type || "sheep", a.x, a.y, a.hp, a.dir)));
  bolts.length = 0;
  particles.length = 0;
  return true;
}
'''
if 'function snapshotCurrentWorld()' not in side:
    marker = '\nfunction returnToHomeBedAfterVictory() {'
    if marker not in side:
        raise SystemExit('missing patch point: snapshot funcs')
    side = side.replace(marker, snapshot_funcs + marker, 1)

old_return = '  state.carryingId = "";\n  seedWorld();\n  if (home) {'
new_return = '  state.carryingId = "";\n  if (!restoreWorldSnapshot(state.overworldSnapshot)) seedWorld();\n  state.dimension = "overworld";\n  state.overworldSnapshot = null;\n  if (home) {'
side = replace_once(side, old_return, new_return, 'boss return restore')
side = replace_once(side, 'function enterNether() {\n  rememberHomeBed();\n  state.dimension = "nether";', 'function enterNether() {\n  rememberHomeBed();\n  state.overworldSnapshot = snapshotCurrentWorld();\n  state.dimension = "nether";', 'enter nether snapshot')

pointer_new = '''function setPointerAim(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (document.body.classList.contains("portrait-phone")) {
    mouse.x = clamp(clientY - rect.top, 0, view.w || rect.height);
    mouse.y = clamp(rect.width - (clientX - rect.left), 0, view.h || rect.width);
    return;
  }
  mouse.x = clamp(clientX - rect.left, 0, rect.width);
  mouse.y = clamp(clientY - rect.top, 0, rect.height);
}'''
if 'document.body.classList.contains("portrait-phone")' not in side:
    side = re.sub(r'function setPointerAim\(clientX, clientY\) \{.*?\n\}', pointer_new, side, count=1, flags=re.S)

side = replace_once(side, 'window.addEventListener("orientationchange", () => setTimeout(applyMobileKeyLayout, 250));', 'if (window.visualViewport) window.visualViewport.addEventListener("resize", () => {\n  resize();\n  applyMobileKeyLayout();\n});\nwindow.addEventListener("orientationchange", () => setTimeout(() => {\n  resize();\n  applyMobileKeyLayout();\n}, 250));', 'visual viewport listener')
side = replace_once(side, '  const pad = 6;\n  return {\n    x: clamp(x, pad - baseLeft, window.innerWidth - pad - baseRight),\n    y: clamp(y, pad - baseTop, window.innerHeight - pad - baseBottom),\n  };', '  const pad = 6;\n  const visual = window.visualViewport;\n  const limitW = visual ? visual.width : window.innerWidth;\n  const limitH = visual ? visual.height : window.innerHeight;\n  return {\n    x: clamp(x, pad - baseLeft, limitW - pad - baseRight),\n    y: clamp(y, pad - baseTop, limitH - pad - baseBottom),\n  };', 'mobile key viewport clamp')
write('sideview.js', side)

css = read('styles.css')
if '--app-height' not in css:
    css = css.replace('  --accent: #e8bd55;\n}', '  --accent: #e8bd55;\n  --app-width: 100vw;\n  --app-height: 100vh;\n}', 1)
if 'html {' not in css[:200]:
    css = css.replace('* { box-sizing: border-box; }', '* { box-sizing: border-box; }\nhtml {\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n}', 1)
css = css.replace('  min-height: 100vh;', '  width: var(--app-width);\n  min-height: var(--app-height);', 1)
css = css.replace('  width: 100vw;\n  height: 100vh;', '  width: var(--app-width);\n  height: var(--app-height);', 1)
css = css.replace('    width: 100vw;\n    height: 100vh;', '    width: var(--app-width);\n    height: var(--app-height);', 1)
portrait_block = '''
body.mobile-build.portrait-phone .game-shell {
  width: var(--app-height);
  height: var(--app-width);
  transform-origin: top left;
  transform: rotate(90deg) translateY(-100%);
}
body.mobile-build.portrait-phone #game { cursor: default; }
body.mobile-build.portrait-phone .mobile-controls { display: flex; left: 8px; right: 8px; bottom: 8px; gap: 14px; }
body.mobile-build.portrait-phone .help { display: none; }
body.mobile-build.portrait-phone .hud { top: 8px; left: 8px; right: 8px; grid-template-columns: minmax(150px, .65fr) minmax(260px, 1fr) auto; gap: 8px; padding: 7px 8px; }
body.mobile-build.portrait-phone .brand h1 { font-size: 16px; }
body.mobile-build.portrait-phone .brand p { margin-top: 2px; font-size: 11px; }
body.mobile-build.portrait-phone .meters { gap: 5px; }
body.mobile-build.portrait-phone .meters label { font-size: 11px; gap: 5px; }
body.mobile-build.portrait-phone meter { height: 10px; }
body.mobile-build.portrait-phone .scoreline { gap: 4px 9px; font-size: 11px; }
body.mobile-build.portrait-phone .message { left: 50%; right: auto; bottom: 82px; transform: translateX(-50%); max-width: min(460px, calc(var(--app-height) - 320px)); padding: 8px 12px; font-size: 13px; }
body.mobile-build.portrait-phone .share-panel { left: 8px; right: auto; bottom: 118px; flex-wrap: nowrap; max-width: calc(var(--app-height) - 320px); padding: 7px; }
body.mobile-build.portrait-phone .share-panel label { flex: 0 1 auto; }
body.mobile-build.portrait-phone .share-panel input { width: 112px; }
body.mobile-build.portrait-phone .share-panel button { min-height: 32px; font-size: 12px; }
body.mobile-build.portrait-phone .inventory { top: 72px; right: 8px; bottom: 82px; width: min(330px, 42vh); padding: 8px; }
body.mobile-build.portrait-phone .hud, body.mobile-build.portrait-phone .inventory, body.mobile-build.portrait-phone .share-panel { backdrop-filter: none; }
body.mobile-build.portrait-phone .inventory.collapsed { bottom: auto; }
body.mobile-build.portrait-phone .resource-grid { grid-template-columns: repeat(2, 1fr); gap: 5px; }
body.mobile-build.portrait-phone .resource-grid span { padding: 5px 7px; font-size: 11px; }
body.mobile-build.portrait-phone .crafting { gap: 5px; }
body.mobile-build.portrait-phone .crafting button { min-height: 30px; font-size: 11px; }
body.mobile-build.portrait-phone .panel-title { margin-bottom: 7px; }
body.mobile-build.portrait-phone .panel-title h2 { font-size: 16px; }
body.mobile-build.portrait-phone .panel-title button { min-height: 30px; font-size: 12px; }
body.mobile-build.portrait-phone .mobile-move { grid-template-columns: repeat(2, 64px); grid-template-rows: 46px; }
body.mobile-build.portrait-phone .mobile-actions { grid-template-columns: repeat(2, 58px); }
body.mobile-build.portrait-phone .mobile-actions .wide { grid-column: 1 / -1; }
body.mobile-build.portrait-phone .mobile-btn { min-height: 46px; font-size: 14px; box-shadow: none; }
'''
if 'body.mobile-build.portrait-phone .game-shell' not in css:
    css = css.replace('@media (hover: none) and (orientation: landscape)', portrait_block + '@media (hover: none) and (orientation: landscape)', 1)
write('styles.css', css)

html = read('index.html')
html = html.replace('width=device-width, initial-scale=1, viewport-fit=cover', 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content')
html = html.replace('china-mobile-7', 'china-mobile-8')
write('index.html', html)

server = read('server.mjs').replace('china-mobile-7', 'china-mobile-8')
write('server.mjs', server)

subprocess.run(['node', '--check', 'sideview.js'], check=True)
subprocess.run(['node', '--check', 'server.mjs'], check=True)
subprocess.run(['pm2', 'restart', 'zijia-game'], check=False)
subprocess.run(['pm2', 'save'], check=False)
print('hotfix complete: boss return keeps overworld, mobile viewport updated to china-mobile-8')
