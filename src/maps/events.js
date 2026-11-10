// Map events: every map has one thing that happens to it now and then, built out of the sand sim so it leaves
// something behind: water that pools, lava that cools to stone, snow that drifts, acid that eats the floor.
//   EVENTS[mapId] = { name, col, dur, start(e), run(e, k) }    k = frames since the event began, e = its scratch state
// A banner names the event when it starts. The first one comes 25-40 s into a map, then every 45-75 s.
// SET.events (settings: MAP EVENTS) turns them off.
import { ST } from '../state.js';
import { ACID, FIRE, GFIRE, KIND, LAVA, NEON, R, RUBBLE, S, SAND, SNOW, WATER, rgb } from '../world/materials.js';
import { H, VH, VW, W, t } from '../world/grid.js';
import { pvy, px, py, spawn, spawnFlake } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { screenFlash } from '../render/vfxcore.js';
import { SET } from '../render/look.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { lightningStrike, zap } from '../heroes/powers.js';
import { enemies, hitEnemy } from '../enemies/core.js';
import { applyStatus } from '../heroes/abilities.js';
import { pl_ } from '../player.js';
import { SAV } from './savage.js';
import { XM } from './xmansion.js';
import { WAK } from './wakanda.js';

const vx = () => ST.camX + 20 + R() * (VW - 40);                       // a random column on screen
const near = (d = 110) => Math.max(8, Math.min(W - 8, pl_.x + (R() < .5 ? -1 : 1) * (40 + R() * d))); // a column near the hero, not on top of them
function gy(x, y0 = ST.camY) { x = Math.max(0, Math.min(W - 1, x | 0)); let y = Math.max(0, y0 | 0); for (; y < H - 1; y++) if (KIND[t[y * W + x]] === S) break; return y; }
const rain = (n, wet, c) => { for (let k = 0; k < n; k++) spawn(ST.camX - 20 + R() * (VW + 40), ST.camY - 3, -.5, 3.4 + R(), c || rgb(120, 150, 220), 110, R() < wet ? WATER : 0, 0, 0); };
const tagged = (tag, f) => { const o = ST.dmgTag; ST.dmgTag = tag; try { f(); } finally { ST.dmgTag = o; } };
// something heavy falling out of the sky: a clump of glowing debris that blows up where it lands
function meteor(x, col, r, mat) { const o = { x, y: ST.camY - 8, vx: (R() - .5) * 1.5, vy: 3 + R() * 2, k: 0 };
  FALLING.push(() => { o.x += o.vx; o.y += o.vy; o.k++; for (let j = 0; j < 3; j++) spawn(o.x + (R() - .5) * 4, o.y + (R() - .5) * 4, (R() - .5) * .6, -R(), col, 14, 0, 1, 0, 1);
    const X = o.x | 0, Y = o.y | 0; if (X < 2 || X >= W - 2 || Y >= H - 2) return false;
    if (Y > 0 && KIND[t[Y * W + X]] === S || o.k > 400) { ST.pctx = false; explode(X, Y, r, { fire: mat ? 0 : .5, col: [col & 255, (col >> 8) & 255, (col >> 16) & 255] }); if (mat) for (let j = 0; j < 14; j++) spawn(X + (R() - .5) * 6, Y - 3, (R() - .5) * 3, -1 - R() * 3, col, 200, mat, 1); return false; }
    return true; }); }
const FALLING = [];

export const EVENTS = {
  // a water main lets go under the street: a geyser for five seconds, a pond afterwards
  city: { name: 'WATER MAIN BREAK', col: '#7ab8ff', dur: 300, start(e) { e.x = near(); e.y = ST.streetY > 0 ? gy(e.x, ST.streetY - 6) : gy(e.x); ST.pctx = false; explode(e.x | 0, e.y + 2, 5, { quiet: true }); snd('boom', e.x, e.y, { size: .4 }); },
    run(e, k) { for (let j = 0; j < 3; j++) spawn(e.x + (R() - .5) * 4, e.y - 2, (R() - .5) * 1.6, -4.5 - R() * 2.5, R() < .6 ? rgb(90, 140, 230) : rgb(200, 225, 255), 140, WATER, 0, 1); if (k % 30 === 0) rings.push({ x: e.x, y: e.y, r: 3, vr: 1.5, life: 10, c: [150, 200, 255] }); } },
  // a summer squall: rain that pools in every crater and puts fires out, and lightning on the rooftops
  nyc: { name: 'SUMMER STORM', col: '#bfe3ff', dur: 620, start() { screenFlash([200, 220, 255], .2); },
    run(e, k) { rain(5, .3); if (k % 170 === 90) { ST.pctx = false; lightningStrike(vx(), ST.camY, 6); } } },
  // the neon grid overloads: every sign on screen arcs, and anything standing in water gets it worst
  nyc2099: { name: 'GRID OVERLOAD', col: '#ff5ae0', dur: 380, start() { screenFlash([255, 90, 230], .22); snd('zap', pl_.x, pl_.y, { v: .8 }); },
    run(e, k) { if (k % 9) return; for (let tr = 0; tr < 30; tr++) { const x = vx() | 0, y = ST.camY + R() * VH | 0; if (y < 1 || y >= H || t[y * W + x] !== NEON) continue;
      const tx = x + (R() - .5) * 70, ty = y + R() * 50; zap(x, y, tx, ty, [255, 220, 255], [255, 60, 220]); for (let j = 0; j < 4; j++) spawn(tx, ty, (R() - .5) * 3, (R() - .5) * 3, rgb(255, 150, 240), 10, 0, 1, 0, 1);
      ST.pctx = false; tagged('shock', () => { for (const en of enemies) if (en.hp > 0 && Math.hypot(en.x - tx, en.y - ty) < 34) hitEnemy(en, 7, 0, -1); }); break; } } },
  // dry lightning sets a tree alight; ten seconds later the rain arrives to put it out
  forest: { name: 'DRY LIGHTNING', col: '#ffd27a', dur: 980, start(e) { e.x = near(160); ST.pctx = false; lightningStrike(e.x, ST.camY, 5); const y = gy(e.x); explode(e.x | 0, y, 4, { fire: 1, quiet: true }); },
    run(e, k) { if (k === 560) fxWord(ST.camX + VW / 2, ST.camY + 40, 'RAIN', 1.3, '#9fc8ff', true); if (k > 560) rain(6, .35); else if (k % 3 === 0) spawnFlake(vx(), ST.camY - 2, -.4, .5 + R() * .4, rgb(200, 150, 60), 220, 0); } },
  // the groundskeeper's sprinklers come on across the lawn
  xmansion: { name: 'SPRINKLERS', col: '#9fd8ff', dur: 460, start(e) { e.xs = [-150, -60, 60, 150].map(d => XM.fx + d + (R() - .5) * 20); e.ys = e.xs.map(x => gy(x, XM.top || ST.camY)); },
    run(e, k) { for (let n = 0; n < 4; n++) { const a = Math.sin(k * .07 + n * 1.6) * 1.1; spawn(e.xs[n], e.ys[n] - 2, Math.sin(a) * 3.2, -3.4 - Math.cos(a), rgb(150, 200, 250), 120, k % 2 ? WATER : 0, 0, 1); } } },
  // the volcano erupts: lava bombs rain over the jungle and cool into black rock where they land
  savage: { name: 'ERUPTION', col: '#ff8a3c', dur: 260, start() { ST.shake += 10; snd('boom', SAV.VX, SAV.vtop, { size: 1 }); flash(SAV.VX, SAV.vtop, 120, [255, 140, 50], 12); },
    run(e, k) { ST.shake = Math.max(ST.shake, 2); if (k % 4 === 0) spawn(SAV.VX + (R() - .5) * 14, SAV.vtop - 2, (R() - .5) * 7, -5 - R() * 4.5, rgb(255, 120 + R() * 80, 30), 320, LAVA, 1);
      for (let j = 0; j < 2; j++) spawnFlake(SAV.VX + (R() - .5) * 60, SAV.vtop - 4, (R() - .5) * 1.5, -1 - R(), rgb(90, 86, 88), 260, 0);
      if (k % 50 === 20) meteor(near(200), rgb(255, 150, 40), 6, LAVA); } },
  // a whiteout: driven snow piles into drifts and anything out in it starts to freeze
  arctic: { name: 'WHITEOUT', col: '#e8f4ff', dur: 640, start() { screenFlash([230, 240, 255], .25); },
    run(e, k) { for (let j = 0; j < 7; j++) spawn(ST.camX + VW + 6, ST.camY + R() * VH, -4 - R() * 2.5, .6 + R() * .8, rgb(236, 242, 250), 160, R() < .22 ? SNOW : 0, 0, 0);
      if (k % 30 === 0) for (const en of enemies) if (en.hp > 0 && Math.abs(en.x - pl_.x) < VW) applyStatus(en, 'chill', 30); } },
  // a flying car loses power over the avenue
  retro: { name: 'ENGINE FAILURE', col: '#ffb0c0', dur: 260, start() {}, run(e, k) { if (k % 80 === 10) meteor(near(160), rgb(255, 170, 190), 6); } },
  // the other universe pushes through: red lightning walks down the street
  incursion: { name: 'UNIVERSES COLLIDE', col: '#ff5a5a', dur: 300, start() { screenFlash([255, 80, 80], .3); ST.shake += 8; },
    run(e, k) { if (k % 55 === 20) { ST.pctx = false; lightningStrike(near(150), ST.camY, 6); } if (k % 4 === 0) spawnFlake(vx(), ST.camY + R() * VH, (R() - .5), -.5, rgb(255, 80, 90), 60, 0); } },
  // the Great Mound rings like a bell: a vibranium pulse lifts loose rubble and staggers everything nearby
  wakanda: { name: 'VIBRANIUM RESONANCE', col: '#c88cff', dur: 240, start(e) { e.x = WAK.mx || pl_.x; e.y = gy(e.x) - 30; },
    run(e, k) { if (k % 40) return; const cx = Math.abs(e.x - pl_.x) < VW ? e.x : pl_.x, cy = Math.abs(e.x - pl_.x) < VW ? e.y : pl_.y - 20; rings.push({ x: cx, y: cy, r: 6, vr: 5, life: 26, c: [190, 130, 255] }, { x: cx, y: cy, r: 2, vr: 3.4, life: 26, c: [130, 80, 220] }); snd('psi', cx, cy, { pitch: .6 }); ST.shake += 3;
      for (let n = 0; n < ST.np; n++) if (Math.abs(px[n] - cx) < 170 && Math.abs(py[n] - cy) < 120) pvy[n] -= 2.5;
      for (const en of enemies) if (en.hp > 0 && Math.hypot(en.x - cx, en.y - cy) < 170 && !en.def.titan) { applyStatus(en, 'stun', 30); en.vy -= 2; } } },
  // the Bifrost discharges: a column of rainbow light that carries loose things up with it
  asgard: { name: 'BIFROST SURGE', col: '#ffe9a0', dur: 150, start(e) { e.x = near(120); screenFlash([255, 240, 200], .25); snd('charge', e.x, pl_.y, { pitch: .7 }); },
    run(e, k) { const RB = [[255, 70, 70], [255, 170, 60], [255, 240, 80], [90, 240, 110], [80, 170, 255], [170, 100, 255]], g = gy(e.x);
      RB.forEach((c, j) => beams.push({ x0: e.x + (j - 2.5) * 2, y0: ST.camY - 10, x1: e.x + (j - 2.5) * 2, y1: g, life: 2, w: 1, c, g: c, st: 'band' }));
      for (let n = 0; n < ST.np; n++) if (Math.abs(px[n] - e.x) < 12) pvy[n] -= 1.2;
      for (const en of enemies) if (en.hp > 0 && Math.abs(en.x - e.x) < 12 && !en.def.titan) { en.vy -= .9; if (k % 10 === 0) { ST.pctx = false; hitEnemy(en, 4, 0, 0); } } } },
  // the wormhole coughs: a load of scrap comes down
  sakaar: { name: 'JUNK FALL', col: '#ffc070', dur: 220, start() { ST.shake += 4; },
    run(e, k) { for (let j = 0; j < 2; j++) spawn(pl_.x + (R() - .5) * 260, ST.camY - 4, (R() - .5) * 1.5, 3 + R() * 3, R() < .5 ? rgb(150, 120, 96) : rgb(120, 128, 140), 300, RUBBLE, 0); if (k % 70 === 30) meteor(near(140), rgb(255, 170, 90), 5, RUBBLE); } },
  // the Celestial's marrow leaks through the roof: acid that eats a hole wherever it drips
  knowhere: { name: 'MARROW LEAK', col: '#8dffb0', dur: 260, start(e) { e.x = near(90); let y = Math.max(2, pl_.y - 30 | 0); const X = e.x | 0; while (y > ST.camY - 40 && y > 2 && KIND[t[y * W + X]] !== S) y--; e.y = y + 2; },
    run(e, k) { if (k % 3 === 0) spawn(e.x + (R() - .5) * 6, e.y, (R() - .5) * .4, .5 + R(), rgb(120, 240, 60), 240, ACID, 1); if (k % 20 === 0) rings.push({ x: e.x, y: e.y, r: 2, vr: 1, life: 8, c: [120, 255, 160] }); } },
  // Titan's broken sky: meteors
  titan: { name: 'METEOR SHOWER', col: '#ff9a5a', dur: 360, start() {}, run(e, k) { if (k % 55 === 5) meteor(near(200), rgb(255, 150, 60), 7); } },
  // a moonquake throws regolith up, and in this gravity it takes its time coming down
  moon: { name: 'MOONQUAKE', col: '#d8e4ff', dur: 200, start() { snd('crumble', pl_.x, pl_.y, { v: .8 }); },
    run(e, k) { ST.shake = Math.max(ST.shake, 3); if (k % 2 === 0) { const x = vx(), y = gy(x); if (y < H - 2) spawn(x, y - 2, (R() - .5) * 1.5, -2 - R() * 2.5, rgb(176, 178, 190), 400, SAND, 0); } } },
  // a geyser of hellfire from the nearest lava
  dark: { name: 'HELLFIRE GEYSER', col: '#ff6a3c', dur: 200, start(e) { e.x = near(120); e.y = gy(e.x); for (let tr = 0; tr < 80; tr++) { const x = vx() | 0, y = ST.camY + R() * VH | 0; if (y > 0 && y < H && t[y * W + x] === LAVA) { e.x = x; e.y = y; break; } } flash(e.x, e.y, 60, [255, 110, 40], 10); },
    run(e, k) { for (let j = 0; j < 2; j++) spawn(e.x + (R() - .5) * 5, e.y - 2, (R() - .5) * 2.2, -5 - R() * 3, rgb(255, 110 + R() * 90, 30), 220, R() < .35 ? LAVA : R() < .5 ? GFIRE : FIRE, 1); } },
};

let cur = null, k = 0, wait = 0, forMap = '';
export function resetEvents() { cur = null; FALLING.length = 0; wait = 1500 + R() * 900 | 0; }
// GAME.mapEvent(): start this map's event now (tests, and the spawn menu)
export function triggerEvent(mapId) { const E = EVENTS[mapId]; if (!E) return null; forMap = mapId; cur = { E, s: {} }; k = 0; const p0 = ST.pctx; E.start(cur.s); ST.pctx = p0; fxWord(ST.camX + VW / 2, ST.camY + 26, E.name, 1.5, E.col, true); return E.name; }
export function updEvents(mapId) {
  if (mapId !== forMap) { forMap = mapId; resetEvents(); }
  const p0 = ST.pctx; ST.pctx = false; // an event is the world acting, not the hero: no ultimate charge, the 'foe' effect theme
  for (let n = FALLING.length - 1; n >= 0; n--) if (!FALLING[n]()) FALLING.splice(n, 1);
  if (cur) { cur.E.run(cur.s, k); if (++k >= cur.E.dur) { cur = null; wait = 2700 + R() * 1800 | 0; } }
  else if (SET.events !== false && ST.GS === 'play' && EVENTS[mapId] && --wait <= 0) triggerEvent(mapId);
  ST.pctx = p0;
}
