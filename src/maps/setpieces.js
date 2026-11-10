// Set pieces: physical props that give every map its own terrain to play with. They are placed at generation time
// (in generation pixels, before the world is scaled up) on open, level ground the scan finds, never on top of the
// spawn point or each other. Each one is built from sim materials, so it does something when it breaks: a tank
// floods the street, a silo leaks acid, a sand bin pours out, a crane drops its load.
//   PLAN[mapId] = [[piece, how many, options], ...]
import { ST } from '../state.js';
import { ACID, BONE, CONC, DIRT, EMPTY, GLASS, GOLD, GRASS, ICE, KIND, LAVA, LEAF, NEON, OBSID, OIL, PROPANE, R, S, SAND, SNOW, STEEL, STONE, VIBR, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, t } from '../world/grid.js';
import { bgRect, fill, tint } from './gen.js';

const GROUND0 = [DIRT, GRASS, STONE, OBSID, BONE, SAND, SNOW, ICE];
const EXTRA = { junk: [STEEL, CONC], realm: [GOLD], wakanda: [VIBR], mine: [STEEL] }; // what else counts as open ground on that kind of map
let GROUND = new Set(GROUND0);
const heap = (x, gy, w, h, m, c) => { for (let xx = 0; xx < w; xx++) { const hh = Math.max(1, h * (1 - Math.abs(xx - w / 2) / (w / 2)) + R() * 1.5) | 0; fill(x + xx, gy - hh, x + xx + 1, gy, m); if (c) tint(x + xx, gy - hh, x + xx + 1, gy, c[0], c[1], c[2], 8); } };
const basin = (x, gy, w, d, m) => { for (let xx = 0; xx < w; xx++) { const dd = Math.round(d * Math.sin(Math.PI * (xx + .5) / w)); if (dd > 0) fill(x + xx, gy, x + xx + 1, gy + dd, m); } };
const post = (x, y0, y1, m, c) => { fill(x, y0, x + 2, y1, m); tint(x, y0, x + 2, y1, c[0], c[1], c[2], 6); };

// w: level footprint needed; pad: clear sky needed either side (for arms that overhang); up: clear height
const PIECES = {
  // a tower crane with a concrete block on its cable: cut the cable or the mast and the load comes down
  crane: { w: 16, pad: 30, build(x, gy) { const Y = [222, 178, 40];
    fill(x + 1, gy - 3, x + 15, gy, CONC); post(x + 7, gy - 82, gy - 3, STEEL, Y); for (let y = gy - 78; y < gy - 6; y += 6) { fill(x + 5, y, x + 11, y + 1, STEEL); tint(x + 5, y, x + 11, y + 1, 190, 150, 30, 6); }
    fill(x - 16, gy - 84, x + 44, gy - 82, STEEL); tint(x - 16, gy - 84, x + 44, gy - 82, Y[0], Y[1], Y[2], 6);
    fill(x - 16, gy - 82, x - 8, gy - 75, CONC); fill(x + 4, gy - 81, x + 12, gy - 75, STEEL); tint(x + 4, gy - 81, x + 12, gy - 75, 60, 64, 72, 5); fill(x + 9, gy - 80, x + 12, gy - 77, GLASS);
    fill(x + 38, gy - 82, x + 39, gy - 44, STEEL); tint(x + 38, gy - 82, x + 39, gy - 44, 50, 50, 56, 4); fill(x + 33, gy - 44, x + 44, gy - 37, CONC); } },
  // oil drums and a propane tank behind a low fence: one spark and the whole yard goes
  fuel: { w: 46, build(x, gy) { for (let k = 0; k < 3; k++) { const a = x + 3 + k * 9; fill(a, gy - 9, a + 7, gy, STEEL); tint(a, gy - 9, a + 7, gy, 60, 90, 160, 8); fill(a + 1, gy - 8, a + 6, gy - 1, OIL); }
    fill(x + 31, gy - 12, x + 45, gy, STEEL); tint(x + 31, gy - 12, x + 45, gy, 214, 212, 200, 8); fill(x + 33, gy - 10, x + 43, gy - 1, PROPANE);
    post(x, gy - 6, gy, STEEL, [70, 70, 78]); fill(x + 28, gy - 16, x + 30, gy, STEEL); fill(x + 24, gy - 20, x + 34, gy - 16, STEEL); tint(x + 24, gy - 20, x + 34, gy - 16, 230, 190, 40, 6); } },
  // a builder's sand bin: knock out a wooden side and the sand pours across the street
  sandbin: { w: 42, build(x, gy, o) { const c = o.c || [214, 186, 118]; post(x, gy - 15, gy, WOOD, [130, 90, 50]); post(x + 40, gy - 15, gy, WOOD, [130, 90, 50]); for (let xx = 2; xx < 40; xx++) { const hh = (13 - Math.abs(xx - 21) * .12 + R() * 1.5) | 0; fill(x + xx, gy - hh, x + xx + 1, gy, o.m || SAND); tint(x + xx, gy - hh, x + xx + 1, gy, c[0], c[1], c[2], 10); } } },
  // an elevated road on concrete piers: a second street to fight on, and a long drop when the piers go
  overpass: { w: 126, build(x, gy) { for (const a of [8, 61, 114]) { fill(x + a, gy - 30, x + a + 5, gy, CONC); tint(x + a, gy - 30, x + a + 5, gy, 150, 148, 142, 8); fill(x + a - 2, gy - 32, x + a + 7, gy - 30, CONC); }
    fill(x, gy - 36, x + 126, gy - 32, CONC); tint(x, gy - 36, x + 126, gy - 32, 96, 96, 102, 6); fill(x, gy - 39, x + 126, gy - 38, STEEL); for (let a = 0; a < 126; a += 9) fill(x + a, gy - 39, x + a + 1, gy - 36, STEEL);
    for (let a = 6; a < 120; a += 16) tint(x + a, gy - 36, x + a + 7, gy - 35, 230, 200, 60, 4); } },
  // a lit billboard on steel legs
  billboard: { w: 28, build(x, gy, o) { const c = (o.cols || [[255, 70, 200], [70, 220, 255], [255, 210, 60], [120, 255, 140]])[R() * 4 | 0];
    post(x + 4, gy - 34, gy, STEEL, [60, 62, 70]); post(x + 22, gy - 34, gy, STEEL, [60, 62, 70]); fill(x, gy - 54, x + 28, gy - 34, STEEL); tint(x, gy - 54, x + 28, gy - 34, 40, 42, 50, 4);
    fill(x + 1, gy - 53, x + 27, gy - 35, NEON); tint(x + 1, gy - 53, x + 27, gy - 35, c[0], c[1], c[2], 22); for (let y = gy - 50; y < gy - 37; y += 4) tint(x + 4, y, x + 24, y + 1, 250, 250, 250, 4); } },
  // a timber watchtower with three decks
  tower: { w: 24, build(x, gy) { const Wc = [126, 86, 46]; post(x, gy - 52, gy, WOOD, Wc); post(x + 22, gy - 52, gy, WOOD, Wc); for (let k = 1; k <= 3; k++) { fill(x, gy - 16 * k - 2, x + 24, gy - 16 * k, WOOD); tint(x, gy - 16 * k - 2, x + 24, gy - 16 * k, 150, 106, 60, 8); }
    for (let k = 0; k < 14; k++) { fill(x + 2 + k, gy - 14 + k, x + 4 + k, gy - 13 + k, WOOD); fill(x + 20 - k, gy - 30 + k, x + 22 - k, gy - 29 + k, WOOD); }
    for (let r = 0; r < 8; r++) { fill(x - 3 + r * 1.6, gy - 54 - r, x + 27 - r * 1.6, gy - 53 - r, WOOD); tint(x - 3 + r * 1.6, gy - 54 - r, x + 27 - r * 1.6, gy - 53 - r, 96, 56, 36, 8); } } },
  // a raised steel tank full of water: breach it and the street floods
  tank: { w: 26, build(x, gy, o) { post(x + 2, gy - 22, gy, STEEL, [70, 72, 80]); post(x + 22, gy - 22, gy, STEEL, [70, 72, 80]); fill(x + 2, gy - 12, x + 24, gy - 11, STEEL);
    fill(x, gy - 42, x + 26, gy - 22, STEEL); tint(x, gy - 42, x + 26, gy - 22, 120, 84, 58, 8); fill(x + 2, gy - 40, x + 24, gy - 24, o.m || WATER); for (let r = 0; r < 5; r++) fill(x + r * 2.4, gy - 43 - r, x + 26 - r * 2.4, gy - 42 - r, STEEL); } },
  // a chemical silo: the acid inside eats whatever it reaches
  silo: { w: 18, build(x, gy) { fill(x, gy - 38, x + 18, gy, STEEL); tint(x, gy - 38, x + 18, gy, 96, 104, 110, 6); fill(x + 2, gy - 36, x + 16, gy - 2, ACID); for (let y = gy - 30; y < gy - 4; y += 10) tint(x, y, x + 18, y + 2, 230, 200, 40, 4);
    for (let r = 0; r < 4; r++) fill(x + r * 2, gy - 39 - r, x + 18 - r * 2, gy - 38 - r, STEEL); fill(x + 18, gy - 8, x + 24, gy - 6, STEEL); } },
  // a pond in a natural hollow, reeds at the edges
  pond: { w: 54, build(x, gy) { basin(x, gy, 54, 8, WATER); for (const a of [1, 3, 50, 52]) { fill(x + a, gy - 4 - (R() * 3 | 0), x + a + 1, gy, LEAF); } } },
  // a weathered stone arch to run under or bring down
  arch: { w: 48, build(x, gy, o) { const m = o.m || STONE, c = o.c || [122, 118, 112]; fill(x, gy - 24, x + 9, gy, m); fill(x + 39, gy - 24, x + 48, gy, m);
    for (let xx = 0; xx < 48; xx++) { const u = (xx - 24) / 24, top = gy - 38 + u * u * 10, th = 9 - Math.abs(u) * 2; fill(x + xx, top, x + xx + 1, top + th, m); }
    tint(x, gy - 40, x + 48, gy, c[0], c[1], c[2], 12); if (!o.bare) for (let xx = 6; xx < 42; xx += 2) if (R() < .6) { const u = (xx - 24) / 24, top = gy - 38 + u * u * 10; fill(x + xx, top - 1, x + xx + 2, top, GRASS); } } },
  // a colonnade, one column already fallen
  ruins: { w: 52, build(x, gy, o) { const m = o.m || STONE, c = o.c || [204, 198, 182]; for (const [a, hh] of [[0, 32], [14, 32], [28, 32], [44, 18]]) { fill(x + a, gy - hh, x + a + 4, gy, m); fill(x + a - 1, gy - hh - 2, x + a + 5, gy - hh, m); fill(x + a - 1, gy - 2, x + a + 5, gy, m); }
    fill(x - 1, gy - 37, x + 33, gy - 34, m); tint(x - 1, gy - 37, x + 52, gy, c[0], c[1], c[2], 9); fill(x + 36, gy - 4, x + 44, gy, m); tint(x + 36, gy - 4, x + 44, gy, c[0] * .85, c[1] * .85, c[2] * .85, 9); } },
  // a volcanic vent: a pool of lava in an obsidian cone
  vent: { w: 32, build(x, gy) { heap(x, gy, 32, 9, OBSID, [48, 36, 54]); fill(x + 11, gy - 9, x + 21, gy + 4, OBSID); fill(x + 12, gy - 7, x + 20, gy + 3, LAVA); } },
  // a frozen lake: break the ice and the water is right there
  icelake: { w: 62, build(x, gy) { basin(x, gy, 62, 9, WATER); for (let xx = 2; xx < 60; xx++) { fill(x + xx, gy, x + xx + 1, gy + 2, ICE); } } },
  // a deep drift of loose snow
  drift: { w: 44, build(x, gy) { heap(x, gy, 44, 12, SNOW, [236, 242, 250]); } },
  // a half-buried concrete bunker with a blast slit
  bunker: { w: 46, build(x, gy) { fill(x, gy - 17, x + 46, gy, CONC); tint(x, gy - 17, x + 46, gy, 128, 132, 130, 8); fill(x + 3, gy - 14, x + 43, gy, EMPTY); bgRect(x + 3, gy - 14, x + 43, gy, rgb(34, 36, 40));
    fill(x + 43, gy - 11, x + 46, gy, EMPTY); fill(x, gy - 10, x + 3, gy - 8, GLASS); for (let k = 0; k < 2; k++) { fill(x + 8 + k * 9, gy - 6, x + 14 + k * 9, gy, WOOD); tint(x + 8 + k * 9, gy - 6, x + 14 + k * 9, gy, 150, 116, 70, 10); } heap(x - 4, gy - 17, 54, 4, DIRT); } },
  // a cluster of glowing crystal shards
  crystal: { w: 26, build(x, gy, o) { const c = o.c || [170, 100, 255]; for (const [a, hh, hw] of [[6, 16, 3], [13, 28, 4], [20, 12, 2.5]]) for (let yy = 0; yy < hh; yy++) { const ww = hw * (1 - yy / hh), k = 1 - yy / hh * .35; fill(x + a - ww, gy - yy - 1, x + a + ww + 1, gy - yy, NEON); tint(x + a - ww, gy - yy - 1, x + a + ww + 1, gy - yy, c[0] * k, c[1] * k, c[2] * k, 14); } } },
  // stacked timber
  logs: { w: 32, build(x, gy) { for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) { const a = x + 2 + r * 4 + k * 8; fill(a, gy - 6 * (r + 1), a + 7, gy - 6 * r, WOOD); tint(a, gy - 6 * (r + 1), a + 7, gy - 6 * r, 136, 92, 50, 10); tint(a, gy - 6 * (r + 1) + 2, a + 2, gy - 6 * r - 2, 190, 150, 100, 6); } } },
};

export const PLAN = {
  city: [['crane', 2], ['fuel', 2], ['sandbin', 2], ['overpass', 1], ['billboard', 3]],
  nyc: [['overpass', 2], ['billboard', 3], ['tank', 2], ['fuel', 1], ['crane', 1]],
  nyc2099: [['silo', 3], ['billboard', 4, { cols: [[255, 60, 220], [60, 240, 255], [255, 60, 220], [160, 90, 255]] }], ['overpass', 1], ['crystal', 2, { c: [80, 240, 255] }]],
  forest: [['pond', 3], ['arch', 2], ['tower', 2], ['logs', 3]],
  xmansion: [['pond', 2], ['ruins', 1, { c: [226, 222, 208] }], ['tower', 1], ['logs', 1]],
  savage: [['vent', 3], ['arch', 3], ['pond', 2], ['logs', 1]],
  arctic: [['icelake', 2], ['drift', 4], ['bunker', 2], ['fuel', 2]],
  retro: [['billboard', 4, { cols: [[255, 150, 170], [130, 220, 230], [255, 220, 130], [170, 230, 170]] }], ['overpass', 1], ['tank', 2]],
  incursion: [['crane', 2], ['vent', 2], ['overpass', 1], ['fuel', 1]],
  wakanda: [['crystal', 4, { c: [170, 100, 255] }], ['pond', 2], ['ruins', 1, { c: [190, 160, 110] }], ['arch', 1]],
  asgard: [['ruins', 3, { c: [226, 196, 110] }], ['crystal', 2, { c: [255, 214, 110] }], ['pond', 1]],
  sakaar: [['sandbin', 3, { c: [150, 120, 96] }], ['silo', 2], ['crane', 2], ['fuel', 2]],
  knowhere: [['silo', 2], ['crystal', 4, { c: [110, 255, 190] }], ['tower', 2]],
  titan: [['ruins', 3, { c: [176, 130, 100] }], ['vent', 2], ['sandbin', 2, { c: [200, 130, 80] }], ['arch', 2, { c: [150, 100, 76], bare: true }]],
  moon: [['crystal', 3, { c: [220, 235, 255] }], ['sandbin', 2, { c: [170, 172, 184] }], ['ruins', 2, { c: [200, 204, 216] }], ['arch', 1, { c: [150, 152, 164], bare: true }]],
  dark: [['vent', 4], ['crystal', 4, { c: [200, 80, 255] }], ['arch', 2, { m: OBSID, c: [56, 40, 70], bare: true }]],
};

const ROOF = new Set(['billboard', 'tank', 'fuel', 'silo', 'crystal', 'sandbin']); // pieces that may also stand on a flat roof (urban maps)
const WILD = new Set(['nature', 'estate', 'wakanda']);                              // themes where trees are cleared for a piece instead of blocking it
// first solid cell from the sky in each column (-1: none); in the wild, trees do not count
// inside a cave map (Knowhere) the ground is the floor under the roof: skip the roof and the first open space
function tops(wild, cave) { const T = new Int16Array(W); for (let x = 0; x < W; x++) { let y = 12; const solid = () => { const m = t[y * W + x]; return KIND[m] === S && !(wild && (m === LEAF || m === WOOD)); };
  for (; y < H; y++) if (solid()) break; if (cave) { for (; y < H; y++) if (!solid()) break; for (; y < H; y++) if (solid()) break; } T[x] = y < H ? y : -1; } return T; }
export const PLACED = []; // what the last generation placed: [piece, x, groundY] in generation pixels (for tests)
export function setPieces(mapId, theme) {
  PLACED.length = 0; const plan = PLAN[mapId]; if (!plan) return; GROUND = new Set([...GROUND0, ...(EXTRA[theme] || [])]); const wild = WILD.has(theme), urban = theme === 'urban', cave = theme === 'mine', T = tops(wild, cave), used = [], sy = ST.streetY || 0;
  const deep = (x, gy) => { for (let k = 1; k <= 10; k++) if (KIND[t[Math.min(H - 1, gy + k) * W + x]] !== S) return false; return true; }; // real ground, not a roof or a floor slab
  for (const [name, count, opt] of plan) { const P = PIECES[name], pad = P.pad || 0, tol = wild ? 8 : theme === 'urban' ? 2 : theme === 'junk' || theme === 'hell' || theme === 'mine' ? 9 : 5; let placed = 0;
    for (let tries = 0; tries < 400 && placed < count; tries++) {
      const x = 60 + R() * (W - 120 - P.w) | 0, gy = T[x]; if (gy < 90 || gy > H - 40) continue;
      if (Math.abs(x + P.w / 2 - ST.SPAWNX) < 90 || used.some(u => x < u[1] + 14 && x + P.w > u[0] - 14)) continue;
      const m0 = t[gy * W + x], street = sy > 0 && Math.abs(gy - sy) <= 3, roof = urban && ROOF.has(name) && !street && !GROUND.has(m0) && gy < sy - 12;
      if (!roof && !street && !(GROUND.has(m0) && deep(x, gy) && deep(x + P.w - 1, T[x + P.w - 1]))) continue;
      let ok = true, lo = gy, hi = gy; for (let xx = x - pad; xx < x + P.w + pad && ok; xx++) { const ty = T[xx]; if (xx < 2 || xx >= W - 2 || ty < 0) ok = false; else if (xx >= x && xx < x + P.w) { lo = Math.min(lo, ty); hi = Math.max(hi, ty); ok = hi - lo <= (roof ? 0 : tol) && (roof || street || GROUND.has(t[ty * W + xx])); } else ok = ty >= gy - 3; }
      if (ok && cave) for (const xx of [x, x + (P.w >> 1), x + P.w - 1]) for (let y = hi - 50; y < lo; y++) if (KIND[t[Math.max(0, y) * W + xx]] === S) { ok = false; break; } // headroom under the roof
      if (!ok) continue;
      // level the footprint to its lowest point, and in the wild clear the trees standing on it
      for (let xx = x - (wild ? 3 : 0); xx < x + P.w + (wild ? 3 : 0); xx++) { if (wild) for (let y = 12; y < hi; y++) { const m = t[y * W + xx]; if (m === LEAF || m === WOOD) fill(xx, y, xx + 1, y + 1, EMPTY); } if (xx >= x && xx < x + P.w && T[xx] < hi) fill(xx, T[xx], xx + 1, hi, EMPTY); }
      P.build(x, hi, opt || {}); used.push([x - pad, x + P.w + pad]); PLACED.push([name, x, hi, roof ? 'roof' : street ? 'street' : 'ground']); placed++;
    } }
}
