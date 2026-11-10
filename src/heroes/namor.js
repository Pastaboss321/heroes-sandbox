// Namor: roster entry, powers and trait. Art: src/art/namor.js.
// Identity: the king of the sea brings the sea with him. His powers pour real water into the sim, and water is
// what makes him dangerous: wet enemies take more from him, standing in it heals him, and several powers only
// reach their full size when there is water under them. He floods the street first and fights second.
import { ST } from '../state.js';
import { FIRE, GFIRE, KIND, L, R, WATER, rgb } from '../world/materials.js';
import { VH, VW } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus, stOf } from './abilities.js';
import { ACT } from './xmen.js';
import { TRAITS } from './traits.js';
import { body, circ, convert, dash, dot, groundY, hitAround, liquidAt, melee, mouse, paint, say, seg, spray, stun, zone } from './newkit.js';

const SEA = [90, 170, 255], HEX = '#6ab4ff', WC = rgb(70, 130, 230), FOAM = rgb(210, 235, 255), GRN = rgb(50, 150, 110);
const wc = () => R() < .75 ? WC : FOAM;
const wet = e => stOf(e).wet > 0 || liquidAt(e.x, e.y + e.def.h / 2 - 1) || liquidAt(e.x, e.y);
const inSea = p => liquidAt(p.x, p.y - 2) || liquidAt(p.x, p.y - ST.PH / 2) || liquidAt(p.x, p.y + 1);
const soak = (x, y, r, dmg, o = {}) => hitAround(x, y, r, dmg, Object.assign({ status: ['wet', 300] }, o));

const NAMOR_POWERS = [
 { n: 'Trident Thrust', cost: 4, cd: 10, fn: (a, p) => { melee(p, a, { dmg: 14, reach: 18, r: 9, kx: 3 }); const [x, y] = body(p); beams.push({ x0: x + a.dx * 6, y0: y + a.dy * 6, x1: x + a.dx * 26, y1: y + a.dy * 26, life: 4, w: 0, c: [255, 230, 140], g: [200, 150, 40], st: 'crisp' }); snd('snikt', p.x, p.y, { v: .4, gap: .04 }); } },
 // held: a jet of real water. It pushes, it soaks, and it stays where it lands
 { n: 'Water Jet', cost: .65, fn: (a, p) => { for (let k = 0; k < 3; k++) spray(a.h.x, a.h.y, 1, WATER, wc(), a.dx * 6.5, a.dy * 6.5, .9, 130); if (ST.frame % 4 === 0) { soak(a.h.x + a.dx * 22, a.h.y + a.dy * 22, 14, 3.5, { kx: a.dx * 2.5, ky: a.dy * 2.5 }); soak(a.h.x + a.dx * 48, a.h.y + a.dy * 48, 14, 2.5, { kx: a.dx * 2, ky: a.dy * 2 }); } if (ST.frame % 20 === 0) snd('wind', p.x, p.y, { v: .3 }); } },
 // a wall of water thrown along the ground
 { n: 'Tidal Wave', cost: 26, cd: 60, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1, seen = new Set(); let x = p.x + f * 8, k = 0; fxWord(p.x + f * 20, p.y - 30, 'FWOOOSH!', 1.2, HEX, true); snd('wind', p.x, p.y, { v: .8 });
   ACT.push(() => { x += f * 5; const gy = groundY(x, p.y - 50); for (let j = 0; j < 4; j++) spray(x, gy - 2 - R() * 22, 1, WATER, wc(), f * (3.5 + R() * 2), -1 - R() * 1.5, 1, 170);
     for (const e of enemies) if (e.hp > 0 && !seen.has(e) && Math.abs(e.x - x) < 10 + e.def.w / 2 && Math.abs(e.y - (gy - 12)) < 26) { seen.add(e); hitEnemy(e, 22, f * 6.5, -2.5); applyStatus(e, 'wet', 360); } return ++k < 30; }); } },
 // a spring opens in the ground at the cursor and runs for four seconds
 { n: 'Summon Spring', cost: 18, cd: 50, fn: (a, p) => { const x = mouse.wx, y = groundY(x, mouse.wy - 8); rings.push({ x, y, r: 3, vr: 2, life: 12, c: SEA }); zone({ x, y, life: 230, tick: z => { spray(z.x, z.y - 2, 2, WATER, wc(), 0, -4.6, 1.5, 150); }, draw: z => circ(z.x, z.y, 3 + (z.t % 10) * .3, FOAM, 0, 8) }); fxWord(x, y - 20, 'SPRING', .8, HEX, true); } },
 // a whirlpool: it drags enemies to its centre and grinds them, twice as hard if they are in water
 { n: 'Whirlpool', cost: 22, cd: 70, fn: (a, p) => { zone({ x: mouse.wx, y: mouse.wy, r: 60, life: 240, tick: z => { for (const e of enemies) { if (e.hp <= 0 || e.def.titan) continue; const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1; if (d > z.r) continue; e.vx += dx / d * .55 - dy / d * .25; e.vy += dy / d * .4 + dx / d * .25; if (z.t % 12 === 0) { hitEnemy(e, wet(e) ? 8 : 4, 0, 0); applyStatus(e, 'wet', 120); } } },
   draw: z => { for (let j = 0; j < 3; j++) for (let k = 0; k < 14; k++) { const u = k / 14, an = z.t * .14 + j * 2.1 + u * 5; dot(z.x + Math.cos(an) * z.r * u, z.y + Math.sin(an) * z.r * u * .55, 0, k % 3 ? WC : FOAM, 0); } } }); snd('wind', mouse.wx, mouse.wy, { v: .6 }); } },
 // a dive along the aim. Into water it lands as a far bigger splash
 { n: 'Imperius Dive', kind: 'move', cost: 18, cd: 40, fn: (a, p) => { dash(p, a.dx, a.dy, 14, 9, { col: SEA, hit: { r: 12, dmg: 22 }, onEnd: () => { const w = inSea(p); explode(p.x | 0, p.y | 0, w ? 4 : 6, { self: true, quiet: true, col: SEA }); spray(p.x, p.y - 4, w ? 70 : 22, WATER, WC, 0, -3.5, 6, 170); soak(p.x, p.y - 6, w ? 48 : 26, w ? 42 : 24, { radial: 4 }); if (w) fxWord(p.x, p.y - 26, 'KA-SPLOOSH!', 1.3, HEX, true); } }); } },
 // water under pressure: a cut clean through 90 px of whatever is in front of him
 { n: 'Hydro Blade', cost: 16, cd: 36, fn: (a, p) => { const h = a.h, x1 = h.x + a.dx * 90, y1 = h.y + a.dy * 90; sliceLine(h.x, h.y, x1, y1, { edge: [170, 220, 255], w: 1, push: 1.2 }); damageLine(h.x, h.y, x1, y1, 6, 30); beams.push({ x0: h.x, y0: h.y, x1, y1, life: 6, w: 1, c: [230, 245, 255], g: SEA }); for (let k = 0; k < 12; k++) spray(h.x + a.dx * k * 7, h.y + a.dy * k * 7, 1, WATER, wc(), a.dx * 2, a.dy * 2, 1.5, 90); snd('snikt', p.x, p.y, { v: .6, pitch: .7 }); } },
 // a sphere of water closes round one enemy
 { n: 'Drown', fn: (a, p, use) => { const e = nearestEnemy(mouse.wx, mouse.wy, 70); if (!e) { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; fxWord(mouse.wx, mouse.wy, 'NO TARGET', .7, HEX, true); } return; } if (!use(14)) return; ST.cd = 36; paint(e.x, e.y, 8, WATER); hitEnemy(e, 22, 0, 0); stun(e, 80); applyStatus(e, 'wet', 480); rings.push({ x: e.x, y: e.y, r: 14, vr: -1, life: 12, c: SEA }); fxWord(e.x, e.y - e.def.h / 2 - 8, 'GLUB', .9, HEX, true); } },
 // he drinks in the water within 40 px: every four cells is a point of health and some energy back
 { n: 'Drink the Sea', cost: 0, cd: 40, fn: (a, p) => { const [x, y] = body(p), n = convert(x, y, 40, m => m === WATER ? 0 : null); if (!n) { ST.cd = 0; if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; say(p, 'NO WATER NEAR', HEX, .7); } return; } const hp = Math.min(80, n / 4); p.hp = Math.min(ST.CH.hp, p.hp + hp); p.en = Math.min(100, p.en + n / 6); rings.push({ x, y, r: 40, vr: -3, life: 12, c: SEA }); say(p, '+' + (hp | 0), '#8dffb0', .9); } },
 // five seconds of hard rain over the cursor: everything under it is soaked and every fire goes out
 { n: 'Deluge', cost: 24, cd: 80, fn: (a, p) => { zone({ x: mouse.wx, y: mouse.wy, r: 60, life: 300, tick: z => { for (let j = 0; j < 5; j++) spawn(z.x + (R() - .5) * 120, ST.camY - 3, -.3, 3.6 + R(), wc(), 110, R() < .3 ? WATER : 0, 0, 0); if (z.t % 20 === 0) { for (const e of enemies) if (e.hp > 0 && Math.abs(e.x - z.x) < 64) applyStatus(e, 'wet', 300); convert(z.x + (R() - .5) * 100, groundY(z.x, ST.camY) - 6, 14, m => m === FIRE || m === GFIRE ? 0 : null); } }, draw: () => {} }); fxWord(mouse.wx, ST.camY + 30, 'DELUGE', 1.1, HEX, true); } },
 // one of Giganto's arms comes up through the ground at the cursor and beats on whatever is near for six seconds
 { n: 'Giganto\'s Reach', cost: 26, cd: 90, fn: (a, p) => { const x = mouse.wx, y = groundY(x, mouse.wy - 8); explode(x | 0, y | 0, 4, { self: true, quiet: true, col: SEA }); zone({ x, y, life: 360, tick: z => { if (z.t % 45 === 20) { const e = nearestEnemy(z.x, z.y - 20, 60); z.dir = e ? (e.x < z.x ? -1 : 1) : (z.dir || 1); soak(z.x + z.dir * 16, z.y - 12, 30, 18, { kx: z.dir * 4, ky: -5 }); ST.shake += 3; snd('slam', z.x, z.y, { size: .4 }); } },
   draw: z => { const sw = Math.sin(z.t * .14) * (z.t % 45 > 20 && z.t % 45 < 32 ? 16 : 4) * (z.dir || 1), rise = Math.min(1, z.t / 12) * Math.min(1, z.life / 14); for (let k = 0; k < 44 * rise; k++) { const u = k / 44, w = 4 - u * 2.5 | 0, cx = z.x + sw * u * u; for (let q = -w; q <= w; q++) dot(cx + q, z.y - k, 0, q === -w || (k % 6 === 0 && q > 0) ? rgb(120, 200, 160) : GRN, 0); } } }); fxWord(x, y - 50, 'GIGANTO!', 1.2, HEX, true); } },
 // the sea closes its fist: everything that is wet or standing in water within 260 px is crushed
 { n: 'Pressure Crush', cost: 20, cd: 50, fn: (a, p) => { const [x, y] = body(p); let n = 0; for (const e of enemies) { if (e.hp <= 0 || Math.hypot(e.x - x, e.y - y) > 260 || !wet(e)) continue; n++; hitEnemy(e, 48, 0, 0); stun(e, 50); rings.push({ x: e.x, y: e.y, r: 18, vr: -2, life: 9, c: SEA }); } if (!n) { say(p, 'NOTHING IS WET', HEX, .8); p.en = Math.min(100, p.en + 14); ST.cd = 12; } else fxWord(x, y - 24, 'CRUSH! x' + n, 1.1, HEX, true); } },
 // a skin of water: three seconds at one fifth damage, and it puts out every fire it touches
 { n: 'Bubble Shield', cost: 16, cd: 90, fn: (a, p) => { let k = 0; ACT.push(() => { const [x, y] = body(p); p.shell = 2; if (k % 8 === 0) convert(x, y, 26, m => m === FIRE || m === GFIRE ? 0 : null); return ++k < 190; }); zone({ x: p.x, y: p.y, life: 190, tick: z => { z.x = p.x; z.y = p.y - ST.PH / 2; }, draw: z => circ(z.x, z.y, 15 + Math.sin(z.t * .2), z.t % 2 ? WC : FOAM, 0, 26) }); say(p, 'BUBBLE', HEX, .8); } },
 // a burst of speed that leaves a trail of water behind it
 { n: 'Riptide', kind: 'move', cost: 10, cd: 22, fn: (a, p) => { dash(p, a.dx, a.dy, 10, 8.5, { col: SEA, hit: { r: 10, dmg: 14, on: e => applyStatus(e, 'wet', 300) }, each: () => spray(p.x, p.y - 6, 2, WATER, wc(), 0, 0, 1.6, 110) }); } },
 // the ultimate: the ocean comes ashore. A tsunami crosses the screen, 120 to everything on the ground, and the street stays flooded
 { n: 'IMPERIUS REX!', ult: true, cd: 30, fn: (a, p) => { const f = p.face, seen = new Set(); let x = p.x - f * 40, k = 0; fxWord(p.x, p.y - ST.PH - 22, 'IMPERIUS REX!', 1.7, HEX, true); ST.shake += 10; snd('boom', p.x, p.y, { size: 1 });
   ACT.push(() => { x += f * 7; const gy = groundY(x, ST.camY + 20); for (let j = 0; j < 9; j++) spray(x, gy - 4 - R() * 60, 1, WATER, wc(), f * (4 + R() * 3), -1.5 - R() * 2, 1.2, 220); ST.shake = Math.max(ST.shake, 3);
     for (const e of enemies) if (e.hp > 0 && !seen.has(e) && Math.abs(e.x - x) < 14 + e.def.w / 2 && e.y > gy - 80) { seen.add(e); hitEnemy(e, 120, f * 9, -4); applyStatus(e, 'wet', 600); } return ++k < 70; }); } },
];

// trait: the sea. Wet enemies take half again as much from him; water under him heals him and refills his energy.
TRAITS.namor = { n: 'Child of the Sea', c: '#6ab4ff', d: 'Hits on wet enemies are 50% stronger. Standing in water heals 0.3 health and 0.15 energy a tick.',
  hud: (T, p) => [inSea(p) ? 1 : .2, inSea(p) ? 'IN THE WATER · HEALING' : 'DRY LAND'],
  tick(p) { if (inSea(p)) { p.hp = Math.min(ST.CH.hp, p.hp + .3); p.en = Math.min(100, p.en + .15); if (ST.frame % 10 === 0) spawn(p.x + (R() - .5) * 8, p.y - R() * ST.PH, 0, -.5, FOAM, 14, 0, 1, 0, 1); } },
  hit: (e, d) => wet(e) ? d * 1.5 : d,
  aw: { n: 'Imperius Rex', d: 'Everything counts as wet, and he heals as if he never left the sea.', tick(p) { p.hp = Math.min(ST.CH.hp, p.hp + .3); }, hit: (e, d) => wet(e) ? d : d * 1.5 } };

export const CHAR_NAMOR = { id: 'namor', name: 'Namor', pw: 7, ph: 19, fly: true, fs: 3.2, boost: 2.3, run: 2.1, jump: 5.4, hp: 440, armor: .6, glow: SEA, cape: null, thrust: () => R() < .6 ? rgb(90, 170, 255) : rgb(230, 245, 255), powers: NAMOR_POWERS };
