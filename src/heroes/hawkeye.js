// Hawkeye: roster entry, powers and trait. Art: src/art/hawkeye.js.
// Identity: an archer with a rotating quiver. Loose Arrow fires whatever trick is nocked and turns the quiver, so
// the basic attack is never the same twice; the rest of the bar picks a trick on purpose. Several of them build or
// eat terrain: nets of web, a putty bridge, acid, ice, a line burned straight through a building.
import { ST } from '../state.js';
import { ACID, FIRE, R, WEB, rgb } from '../world/materials.js';
import { fxWord, flash, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { zap } from './powers.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus } from './abilities.js';
import { nearestN } from './kitlib.js';
import { ACT, freezeArea } from './xmen.js';
import { webCell, webEnemy } from './wave2.js';
import { TRAITS, trOf } from './traits.js';
import { carve } from '../player.js';
import { dash, dot, grapple, hitAround, mouse, paint, puffs, say, seg, shoot, spray, stun } from './newkit.js';

const PUR = [190, 120, 255], HEX = '#c88cff', SHAFT = rgb(214, 214, 224), FLETCH = rgb(160, 96, 208);
// what each trick arrow does where it lands: (x, y, enemy or null)
const TRICK = {
  broadhead: { c: rgb(230, 230, 240), dmg: 20, hit() {} },
  explosive: { c: rgb(255, 150, 50), g: rgb(255, 120, 30), dmg: 6, hit(x, y) { explode(x | 0, y | 0, 9, { self: true }); } },
  net: { c: rgb(240, 240, 246), dmg: 4, hit(x, y) { for (let yy = -7; yy <= 7; yy++) for (let xx = -7; xx <= 7; xx++) if (xx * xx + yy * yy <= 49 && (xx + yy) % 2 === 0) webCell(x + xx | 0, y + yy | 0); for (const e of enemies) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 20) webEnemy(e, 120); fxWord(x, y - 10, 'THWIP!', .8, '#f0f0f6', true); } },
  shock: { c: rgb(140, 220, 255), g: rgb(90, 180, 255), dmg: 6, tag: 'shock', hit(x, y) { for (const e of hitAround(x, y, 44, 10, { tag: 'shock', stun: 30 })) zap(x, y, e.x, e.y, [220, 240, 255], [90, 170, 255]); snd('zap', x, y, { v: .6 }); } },
  freeze: { c: rgb(190, 235, 255), g: rgb(120, 200, 255), dmg: 6, tag: 'ice', hit(x, y) { freezeArea(x, y, 16, 120, 8); } },
  acid: { c: rgb(140, 240, 60), g: rgb(90, 200, 40), dmg: 6, hit(x, y) { spray(x, y - 2, 18, ACID, rgb(120, 230, 40), 0, -1.2, 3, 200, 1); fxWord(x, y - 10, 'FSSSS', .8, '#8dffb0', true); } },
};
const ORDER = ['broadhead', 'explosive', 'net', 'shock', 'freeze', 'acid'];
// an arrow: a shaft with fletching, a coloured head. o.trick names what it does on impact
function arrow(a, trick, o = {}) { const T = TRICK[trick], sp = o.sp || 9.5;
  return shoot(Object.assign({ x: a.h.x, y: a.h.y, vx: a.dx * sp, vy: a.dy * sp, g: .05, life: 110, dmg: T.dmg, tag: T.tag, r: 1.5,
    onHit: (s, e) => T.hit(s.x, s.y, e), draw: s => { const d = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / d, uy = s.vy / d; seg(s.x - ux * 6, s.y - uy * 6, s.x, s.y, SHAFT, 0); seg(s.x - ux * 6, s.y - uy * 6, s.x - ux * 4.5, s.y - uy * 4.5, FLETCH, 0); dot(s.x, s.y, 0, T.c, T.g || 0); if (T.g) dot(s.x - ux, s.y - uy, 0, T.c, T.g); } }, o)); }
const loose = (p) => { p.throwF = 6; snd('throw', p.x, p.y, { v: .5, pitch: 1.6, gap: .04 }); };
const tap = (n, trick, cost, cd, o) => ({ n, cost, cd, fn: (a, p) => { arrow(a, trick, o); loose(p); } });

const HAWK_POWERS = [
 // fires whatever is nocked, then the quiver turns: broadhead, explosive, net, shock, freeze, acid
 { n: 'Loose Arrow', cost: 4, cd: 9, fn: (a, p) => { const T = trOf(p), k = ORDER[T.q % 6]; arrow(a, k); T.q++; loose(p); if (k !== 'broadhead') fxWord(a.h.x, a.h.y - 12, k.toUpperCase(), .7, HEX, true); } },
 tap('Explosive Arrow', 'explosive', 12, 26),
 // a net of web that sticks to whatever it hits and roots anything inside it
 tap('Net Arrow', 'net', 10, 28),
 // a line to pull himself along
 { n: 'Grapple Arrow', kind: 'move', fn: (a, p, use) => { if (!use(8)) return; ST.cd = grapple(p, a, 230, [214, 214, 224], [120, 70, 170]) ? 14 : 8; loose(p); } },
 // a vial of acid: it eats a hole wherever it splashes
 tap('Acid Arrow', 'acid', 12, 30),
 tap('Freeze Arrow', 'freeze', 12, 30),
 // a capacitor head: chains to everything within 44 px (and electrocutes anything wet)
 tap('Shock Arrow', 'shock', 12, 28),
 // flies out, turns round and comes back through whatever it missed
 { n: 'Boomerang Arrow', cost: 10, cd: 24, fn: (a, p) => { arrow(a, 'broadhead', { pierce: true, g: 0, life: 46, dmg: 16, trail: s => { if (s.t === 22) { s.vx = -s.vx; s.vy = -s.vy; s.hit.clear(); } } }); loose(p); } },
 { n: 'Triple Shot', cost: 10, cd: 20, fn: (a, p) => { const an = Math.atan2(a.dy, a.dx); for (const d of [-.14, 0, .14]) arrow({ h: a.h, dx: Math.cos(an + d), dy: Math.sin(an + d) }, 'broadhead', { dmg: 15 }); loose(p); } },
 // a volley lobbed high that comes down on the cursor
 { n: 'Rain of Arrows', cost: 22, cd: 60, fn: (a, p) => { const x0 = mouse.wx; let k = 0; loose(p); fxWord(x0, ST.camY + 30, 'RAIN OF ARROWS', 1, HEX, true); ACT.push(() => { if (k % 3 === 0) arrow({ h: { x: x0 + (R() - .5) * 70, y: ST.camY - 6 }, dx: (R() - .5) * .12, dy: 1 }, 'broadhead', { dmg: 14, sp: 8 }); return ++k < 42; }); } },
 // sets into a bar of hard putty 28 px long: a step, a bridge, a plug for a hole
 { n: 'Putty Arrow', cost: 10, cd: 26, fn: (a, p) => { arrow(a, 'broadhead', { dmg: 4, onHit: s => { const d = Math.hypot(s.vx, s.vy) || 1, nx = -s.vy / d, ny = s.vx / d; for (let k = -14; k <= 14; k++) paint(s.x + nx * k, s.y + ny * k, 1, WEB, { c: [226, 140, 200] }); fxWord(s.x, s.y - 10, 'SPLORCH', .8, '#ff9ad8', true); } }); loose(p); } },
 // a magnesium flare: lights fires, and every enemy within 120 px of it is marked
 { n: 'Flare Arrow', cost: 12, cd: 36, fn: (a, p) => { arrow(a, 'explosive', { dmg: 4, onHit: s => { paint(s.x, s.y, 3, FIRE); flash(s.x, s.y, 90, [255, 240, 200], 10); rings.push({ x: s.x, y: s.y, r: 6, vr: 6, life: 18, c: [255, 220, 150] }); for (const e of enemies) if (e.hp > 0 && Math.hypot(e.x - s.x, e.y - s.y) < 120) applyStatus(e, 'mark', 360); } }); loose(p); } },
 // a Pym-particle head: the arrow grows as it flies and goes straight through buildings
 { n: 'Pym Arrow', cost: 22, cd: 56, fn: (a, p) => { shoot({ x: a.h.x, y: a.h.y, vx: a.dx * 8, vy: a.dy * 8, life: 44, dmg: 60, r: 5, pierce: true, ghost: true, kx: .6, trail: s => carve(s.x, s.y, Math.min(6, 2 + s.t * .25), s.vx, s.vy),
   draw: s => { const d = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / d, uy = s.vy / d, k = Math.min(3, 1 + s.t * .12); for (let w = -k; w <= k; w++) seg(s.x - ux * 16 - uy * w, s.y - uy * 16 + ux * w, s.x - uy * w, s.y + ux * w, Math.abs(w) > k - 1 ? rgb(150, 150, 164) : SHAFT, 0); dot(s.x + ux * 3, s.y + uy * 3, k + 1 | 0, rgb(255, 80, 70), rgb(160, 30, 30)); } }); loose(p); fxWord(a.h.x, a.h.y - 14, 'PYM ARROW!', 1, HEX, true); } },
 // a roll through danger that ends with a shot at the nearest enemy
 { n: 'Tumble Shot', kind: 'move', cost: 10, cd: 26, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1; dash(p, f, -.15, 9, 6.5, { col: PUR, onEnd: () => { const [x, y] = [p.x, p.y - ST.PH / 2], e = nearestEnemy(x, y, 220); if (!e) return; const d = Math.hypot(e.x - x, e.y - y) || 1; arrow({ h: { x, y }, dx: (e.x - x) / d, dy: (e.y - y) / d }, 'broadhead', { dmg: 26 }); } }); } },
 // the ultimate: eighteen arrows, every trick in the quiver, each one finding its own target
 { n: 'Never Miss', ult: true, cd: 30, fn: (a, p) => { let k = 0; fxWord(p.x, p.y - ST.PH - 20, 'NEVER MISS', 1.3, HEX, true); ACT.push(() => { if (k % 3 === 0) { const n = k / 3, an = -Math.PI / 2 + (n % 6 - 2.5) * .22, L = nearestN(p.x, p.y, 460, 18), e = L.length ? L[n % L.length] : null;
     arrow({ h: { x: p.x, y: p.y - ST.PH }, dx: Math.cos(an), dy: Math.sin(an) }, ORDER[n % 6], { g: 0, life: 150, sp: 7.5, target: e, home: { r: 460, k: .16 }, dmg: TRICK[ORDER[n % 6]].dmg + 14 }); snd('throw', p.x, p.y, { v: .4, pitch: 1.4 + n * .03, gap: .02 }); } return ++k < 54; }); } },
];

// trait: the quiver. Every third arrow power cast in a row is free and flies 40% harder.
TRAITS.hawkeye = { n: 'Trick Quiver', c: '#c88cff', d: 'Every third arrow in a row costs nothing and hits 40% harder. Loose Arrow shows which trick is nocked.',
  init(T) { T.q = 0; T.n3 = 0; }, hud: (T) => [(T.n3 % 3 + 1) / 3, 'NOCKED: ' + ORDER[T.q % 6].toUpperCase() + (T.n3 % 3 === 2 ? ' · FREE SHOT' : '')],
  cost: (c, pw, p, T) => T.n3 % 3 === 2 && !pw.kind ? 0 : c, pre(pw, p, c, T) { if (pw.kind) return; if (T.n3 % 3 === 2) { T.boostT = ST.frame + 40; T.bk = 1.4; } T.n3++; },
  aw: { n: 'Hawk\'s Eye', d: 'Every arrow is free and every hit is 40% stronger.', cost: () => 0, hit: (e, d) => d * 1.4 } };

export const CHAR_HAWKEYE = { id: 'hawkeye', name: 'Hawkeye', pw: 7, ph: 19, fly: false, fs: 2.4, boost: 2, run: 2.2, jump: 5.4, hp: 320, armor: .8, glow: PUR, cape: null, thrust: () => rgb(190, 120, 255), powers: HAWK_POWERS };
