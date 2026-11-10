// Green Goblin: roster entry, powers and trait. Art: src/art/goblin.js.
// Identity: a bomber on a glider who fills the street with hazards and then lights them. His pumpkins are thrown
// in arcs, not aimed in lines; his gas is real flammable gas and his oil is real oil, so the setup and the spark
// are separate powers. Every kill feeds the Goblin Formula.
import { ST } from '../state.js';
import { FIRE, OIL, PROPANE, R, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { zap } from './powers.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus } from './abilities.js';
import { ACT } from './xmen.js';
import { TRAITS, trOf } from './traits.js';
import { body, dash, dot, groundY, hitAround, mouse, paint, puffs, say, seg, shoot, spray, stun, tagd, zone } from './newkit.js';

const ORG = [255, 150, 50], GRN = [140, 230, 90], HEX = '#ff9a3c', OC = rgb(255, 140, 40), OD = rgb(200, 80, 20), GC = rgb(90, 190, 70), PUR = rgb(150, 70, 200);
// a pumpkin bomb: lobbed, with a lit grin. kind decides what comes out when it bursts
const BURST = {
  boom(x, y) { explode(x | 0, y | 0, 8, { self: true, fire: .5 }); },
  gas(x, y) { paint(x, y, 13, PROPANE, { p: .8, c: [150, 200, 110] }); hitAround(x, y, 34, 2, { stun: 60 }); puffs(x, y, 14, rgb(150, 210, 110), 2, 24); fxWord(x, y - 12, 'HSSSS', .8, '#b4e88c', true); },
  fire(x, y) { spray(x, y - 2, 16, OIL, rgb(50, 38, 30), 0, -1.6, 3.2, 160); paint(x, y, 4, FIRE); tagd('fire', () => hitAround(x, y, 18, 10, {})); },
};
const pumpkin = (x, y, vx, vy, kind = 'boom', o = {}) => shoot(Object.assign({ x, y, vx, vy, g: .16, life: 90, r: 2, onHit: s => BURST[kind](s.x, s.y), onEnd: s => BURST[kind](s.x, s.y),
  draw: s => { dot(s.x, s.y, 2, kind === 'gas' ? rgb(170, 200, 90) : OC, OD); dot(s.x, s.y - 3, 0, GC, 0); if ((s.t >> 1) & 1) { dot(s.x - 1, s.y, 0, rgb(255, 240, 150), rgb(255, 200, 80)); dot(s.x + 1, s.y, 0, rgb(255, 240, 150), rgb(255, 200, 80)); } } }, o));
const lob = (a, kind) => pumpkin(a.h.x, a.h.y, a.dx * 5.6, a.dy * 5.6 - 1.6, kind);
const bat = (x, y, vx, vy, o = {}) => shoot(Object.assign({ x, y, vx, vy, life: 110, dmg: 12, r: 2, pierce: true, home: { r: 220, k: .1 }, draw: s => { const w = (s.t >> 1) & 1 ? 2 : 1; seg(s.x - 3, s.y - w, s.x, s.y, PUR, 0); seg(s.x, s.y, s.x + 3, s.y - w, PUR, 0); dot(s.x, s.y, 0, rgb(230, 230, 240), 0); } }, o));

const GOBLIN_POWERS = [
 { n: 'Pumpkin Bomb', cost: 6, cd: 14, fn: (a, p) => { lob(a, 'boom'); p.throwF = 6; } },
 // three razor bats that hunt on their own and go through what they cut
 { n: 'Razor Bats', cost: 12, cd: 30, fn: (a, p) => { const an = Math.atan2(a.dy, a.dx); for (const d of [-.35, 0, .35]) bat(a.h.x, a.h.y, Math.cos(an + d) * 6, Math.sin(an + d) * 6); p.throwF = 6; snd('snikt', p.x, p.y, { v: .5 }); } },
 // the glider's prow through anything in the way
 { n: 'Glider Ram', kind: 'move', cost: 14, cd: 30, fn: (a, p) => { dash(p, a.dx, a.dy, 14, 9, { col: GRN, carve: 4, hit: { r: 12, dmg: 24, kx: 6 } }); } },
 // a pumpkin full of gas: it staggers whoever breathes it, and it is waiting for a spark
 { n: 'Gas Pumpkin', cost: 14, cd: 40, fn: (a, p) => { lob(a, 'gas'); p.throwF = 6; } },
 // a pumpkin full of burning oil
 { n: 'Incendiary Pumpkin', cost: 14, cd: 36, fn: (a, p) => { lob(a, 'fire'); p.throwF = 6; } },
 // sticks where it lands and waits fifteen seconds for company
 { n: 'Pumpkin Mine', cost: 10, cd: 24, fn: (a, p) => { pumpkin(a.h.x, a.h.y, a.dx * 5.6, a.dy * 5.6 - 1.6, 'boom', { onEnd: null, onHit: (s, e) => { if (e) return BURST.boom(s.x, s.y); zone({ x: s.x, y: s.y, r: 16, life: 900, tick: z => { for (const en of enemies) if (en.hp > 0 && Math.hypot(en.x - z.x, en.y - z.y) < z.r + en.def.w / 2) { BURST.boom(z.x, z.y); return false; } },
   draw: z => { dot(z.x, z.y - 1, 2, OC, 0); dot(z.x, z.y - 4, 0, GC, 0); if ((z.t >> 4) & 1) dot(z.x, z.y - 1, 0, rgb(255, 240, 150), rgb(255, 200, 80)); } }); } }); p.throwF = 6; } },
 // two rockets off the glider's rails
 { n: 'Glider Missiles', cost: 14, cd: 30, fn: (a, p) => { for (const d of [-3, 3]) shoot({ x: p.x - a.dy * d, y: p.y - 2 + a.dx * d, vx: a.dx * 8.5, vy: a.dy * 8.5, life: 70, r: 2, onHit: s => explode(s.x | 0, s.y | 0, 7, { self: true }), onEnd: s => explode(s.x | 0, s.y | 0, 7, { self: true }), trail: s => { if (s.t % 2) spawn(s.x - s.vx * .5, s.y - s.vy * .5, 0, 0, rgb(120, 116, 112), 14, 0, 0, 0, 1); },
   draw: s => { const d = Math.hypot(s.vx, s.vy) || 1; seg(s.x - s.vx / d * 4, s.y - s.vy / d * 4, s.x, s.y, PUR, 0); dot(s.x - s.vx / d * 5, s.y - s.vy / d * 5, 0, rgb(255, 220, 120), rgb(255, 160, 40)); } }); snd('whoosh', p.x, p.y, { v: .6 }); } },
 // held: sparks from his fingertips. Short range, and exactly what a cloud of gas is waiting for
 { n: 'Finger Sparks', cost: .6, fn: (a, p) => { const x = a.h.x + a.dx * (24 + R() * 22), y = a.h.y + a.dy * (24 + R() * 22) + (R() - .5) * 10; zap(a.h.x, a.h.y, x, y, [255, 255, 200], [200, 230, 80]); if (ST.frame % 2 === 0) tagd('shock', () => hitAround(x, y, 13, 3, {})); if (ST.frame % 5 === 0) paint(x, y, 1, FIRE, { p: .6 }); } },
 // a straight pass on the glider, a pumpkin over the side every few yards
 { n: 'Carpet Bomb', kind: 'move', cost: 22, cd: 60, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1; dash(p, f, -.05, 26, 6.5, { col: GRN, each: k => { if (k % 4 === 0) pumpkin(p.x, p.y + 2, f * 1.5, 1); } }); fxWord(p.x, p.y - ST.PH - 10, 'BOMBS AWAY!', 1, HEX, true); } },
 // eight pumpkins out of the sky over the cursor
 { n: 'Pumpkin Rain', cost: 24, cd: 70, fn: (a, p) => { const x0 = mouse.wx; let k = 0; ACT.push(() => { if (k % 5 === 0) pumpkin(x0 + (R() - .5) * 90, ST.camY - 6, (R() - .5) * 1.2, 2.5, k % 15 === 10 ? 'fire' : 'boom'); return ++k < 40; }); fxWord(x0, ST.camY + 30, 'TRICK OR TREAT!', 1, HEX, true); } },
 // the glider goes by itself: a bladed prow that finds a target near the cursor and goes straight through it
 { n: 'Remote Glider', cost: 16, cd: 44, fn: (a, p) => { const e = nearestEnemy(mouse.wx, mouse.wy, 120); shoot({ x: p.x, y: p.y, vx: a.dx * 7, vy: a.dy * 7, life: 80, dmg: 32, r: 4, pierce: true, target: e, home: { r: 300, k: .14 }, trail: s => { if (s.t % 26 === 0) s.hit.clear(); },
   draw: s => { const d = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / d, uy = s.vy / d; for (let k = -6; k <= 6; k++) dot(s.x - uy * k - ux * Math.abs(k) * .6, s.y + ux * k - uy * Math.abs(k) * .6, 0, Math.abs(k) > 4 ? rgb(190, 196, 210) : PUR, 0); dot(s.x + ux * 2, s.y + uy * 2, 0, rgb(230, 236, 250), 0); } }); snd('whoosh', p.x, p.y, { v: .6 }); } },
 // a jack-o'-lantern set on the ground: for ten seconds it breathes fire at whatever comes near
 { n: 'Jack O\'Lantern', cost: 20, cd: 80, fn: (a, p) => { const x = mouse.wx, y = groundY(x, mouse.wy - 8) - 1; zone({ x, y, life: 600, tick: z => { if (z.t % 40 !== 20) return; const e = nearestEnemy(z.x, z.y - 6, 96); if (!e) return; const d = Math.hypot(e.x - z.x, e.y - z.y) || 1; spray(z.x, z.y - 5, 8, FIRE, rgb(255, 150, 40), (e.x - z.x) / d * 4.5, (e.y - z.y) / d * 4.5 - .8, 1.2, 40, 1); tagd('fire', () => hitEnemy(e, 9, 0, 0)); snd('whoosh', z.x, z.y, { v: .4, gap: .1 }); },
   draw: z => { dot(z.x, z.y - 3, 3, OC, OD); dot(z.x, z.y - 7, 0, GC, 0); const lit = z.t % 40 > 14 && z.t % 40 < 28, c = lit ? rgb(255, 250, 200) : rgb(255, 200, 80); dot(z.x - 1, z.y - 4, 0, c, c); dot(z.x + 1, z.y - 4, 0, c, c); seg(z.x - 1, z.y - 2, z.x + 1, z.y - 2, c, c); } }); fxWord(x, y - 14, 'HEH HEH HEH', .7, HEX, true); } },
 // a slick of real oil sprayed along the aim. It does nothing at all until something lights it
 { n: 'Oil Slick', cost: 10, cd: 26, fn: (a, p) => { spray(a.h.x, a.h.y, 32, OIL, rgb(50, 38, 30), a.dx * 4.5, a.dy * 4.5, 1.6, 170); snd('rip', p.x, p.y, { v: .4 }); } },
 // the laugh: everything within 120 px freezes up and is marked, and he gets 20 energy back
 { n: 'Cackle', cost: 0, cd: 80, fn: (a, p) => { const [x, y] = body(p); for (const e of enemies) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 120) { stun(e, 60); applyStatus(e, 'mark', 300); } p.en = Math.min(100, p.en + 20); rings.push({ x, y, r: 6, vr: 6, life: 18, c: GRN }); fxWord(x, y - 24, 'HAHAHAHAHA!', 1.3, '#8dff6a', true); snd('screech', x, y, { v: .7 }); } },
 // the ultimate: the formula takes over. For eight seconds a pumpkin drops on the nearest enemy every eighth of a second
 { n: 'Goblin Frenzy', ult: true, cd: 30, fn: (a, p) => { let k = 0; fxWord(p.x, p.y - ST.PH - 22, 'GOBLIN FRENZY!', 1.6, '#8dff6a', true); ACT.push(() => { if (ST.CH.id !== 'goblin') return false; p.shell = 2; if (k % 8 === 0) { const e = nearestEnemy(p.x, p.y, 320), [x, y] = body(p);
     if (e) { const tt = 26, dx = e.x - x, dy = e.y - y; pumpkin(x, y, dx / tt, dy / tt - .16 * tt / 2, k % 32 === 24 ? 'fire' : 'boom'); } else pumpkin(x, y + 2, p.vx * .4 + (R() - .5), 1); } return ++k < 480; }); } },
];

// trait: the formula. Each kill is a stack (to five): +8% damage and faster energy, and the stacks drain away when the killing stops.
TRAITS.goblin = { n: 'Goblin Formula', c: '#8dff6a', d: 'Each kill adds a stack (max 5, one lost every 5 s): +8% damage per stack, and energy returns faster.',
  init(T) { T.st = 0; T.dec = 0; }, hud: (T) => [T.st / 5, T.st ? 'FORMULA x' + T.st + ' · +' + T.st * 8 + '%' : 'GOBLIN FORMULA'],
  tick(p, T) { if (T.st > 0) { p.en = Math.min(100, p.en + T.st * .03); if (++T.dec >= 300) { T.dec = 0; T.st--; } } },
  kill(e, T, p) { if (T.st < 5) { T.st++; if (T.st === 5) say(p, 'FORMULA PEAK!', '#8dff6a', .9); } T.dec = 0; },
  hit: (e, d, T) => d * (1 + T.st * .08),
  aw: { n: 'Madness', d: 'The formula stays at five stacks and every power costs half.', tick(p, T) { T.st = 5; T.dec = 0; }, cost: c => c * .5 } };

export const CHAR_GOBLIN = { id: 'goblin', name: 'Green Goblin', pw: 7, ph: 19, fly: true, fs: 3.6, boost: 2.6, run: 2.1, jump: 5, hp: 360, armor: .7, glow: GRN, cape: null, board: true, boardC: [rgb(120, 60, 170), rgb(70, 30, 110), rgb(255, 150, 40)], thrust: () => R() < .6 ? rgb(255, 150, 40) : rgb(120, 116, 112), powers: GOBLIN_POWERS };
