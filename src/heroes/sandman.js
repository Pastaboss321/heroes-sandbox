// Sandman: roster entry, powers and trait. Art: src/art/sandman.js.
// Identity: he is terrain. Every power moves real sand: he pours it, buries people in it, turns the street into
// it, bakes it back into stone, and travels through the ground as it. Damage he takes falls off him as sand, and
// sand under his feet puts him back together.
import { ST } from '../state.js';
import { GLASS, KIND, OBSID, R, S, SAND, STEEL, STONE, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { drawSprite } from '../render/sprites.js';
import { ARTS } from '../art/index.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { ACT } from './xmen.js';
import { TRAITS } from './traits.js';
import { blink, body, convert, dash, dot, groundY, hitAround, matAt, melee, mouse, paint, puffs, ray, say, spray, stun, zone } from './newkit.js';

const TAN = [226, 198, 130], HEX = '#e8d090', SC = rgb(214, 186, 118), SD = rgb(170, 140, 84), SCOL = [214, 186, 118];
const sc = () => R() < .7 ? SC : SD;
const soft = m => KIND[m] === S && m !== STEEL && m !== OBSID; // what he can grind into sand
const dust = (x, y, n) => puffs(x, y, n, sc(), 1.6, 18);
const deny = (p, s) => { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; fxWord(mouse.wx, mouse.wy, s, .7, HEX, true); } };
// the clone wears his sprite in sand colours
let SANDPAL = null; const sandPal = () => { if (SANDPAL) return SANDPAL; SANDPAL = {}; const P = ARTS.sandman.pal; for (const k in P) { const c = P[k], l = ((c & 255) * .3 + ((c >> 8) & 255) * .59 + ((c >> 16) & 255) * .11) / 255; SANDPAL[k] = rgb(120 + l * 120, 96 + l * 110, 50 + l * 90); } return SANDPAL; };

const SAND_POWERS = [
 // a fist the size of a mailbox; sand flies off it
 { n: 'Sand Fist', cost: 4, cd: 12, fn: (a, p) => { melee(p, a, { dmg: 15, reach: 16, r: 12, kx: 3.5, carve: 3 }); const [x, y] = body(p); spray(x + a.dx * 14, y + a.dy * 14, 6, SAND, sc(), a.dx * 3, a.dy * 3 - 1, 2.5, 160); snd('punch', p.x, p.y, { v: .6, pitch: .7, gap: .04 }); } },
 // held: a blast of real sand. It scours what it hits and piles up where it stops
 { n: 'Sand Blast', cost: .7, fn: (a, p) => { for (let k = 0; k < 4; k++) spray(a.h.x, a.h.y, 1, SAND, sc(), a.dx * 6.5, a.dy * 6.5, 1, 150); if (ST.frame % 4 === 0) { hitAround(a.h.x + a.dx * 24, a.h.y + a.dy * 24, 14, 4, { kx: a.dx * 2, ky: a.dy * 2 }); hitAround(a.h.x + a.dx * 50, a.h.y + a.dy * 50, 14, 3, { kx: a.dx * 2, ky: a.dy * 2 }); } if (ST.frame % 16 === 0) snd('wind', p.x, p.y, { v: .3, pitch: .7 }); } },
 // he pours himself into the ground and comes up under the cursor
 { n: 'Burrow', kind: 'move', cost: 14, cd: 40, fn: (a, p) => { const tx = mouse.wx; let k = 0; dust(p.x, p.y - 4, 14); ACT.push(() => { k++; p.script = 2; p.vx = p.vy = 0; if (k < 10) { p.y += .6; if (k % 2) dust(p.x, p.y - 2, 2); return true; }
   const gy = groundY(tx, Math.max(ST.camY, mouse.wy - 60)); blink(p, tx, gy); explode(p.x | 0, p.y | 0, 4, { self: true, quiet: true, col: TAN }); spray(p.x, p.y - 3, 26, SAND, SC, 0, -3.5, 5, 170); hitAround(p.x, p.y - 8, 30, 28, { ky: -6, radial: 2 }); p.vy = -3; fxWord(p.x, p.y - 26, 'FWUMP!', 1, HEX, true); return false; }); } },
 // he lets go and becomes a heap of sand: two seconds untouchable while 55 health runs back into him
 { n: 'Reform', cost: 12, cd: 90, fn: (a, p) => { p.dodge = 110; let k = 0; say(p, 'REFORMING', HEX, .8); ACT.push(() => { p.hp = Math.min(ST.CH.hp, p.hp + .5); p.vx *= .5; if (k % 3 === 0) dust(p.x + (R() - .5) * 10, p.y - R() * ST.PH, 1); return ++k < 110; }); } },
 // five seconds of driving sand around him: everything inside is blinded and scoured
 { n: 'Sandstorm', cost: 22, cd: 90, fn: (a, p) => { zone({ x: p.x, y: p.y, r: 64, life: 300, tick: z => { z.x = p.x; z.y = p.y - ST.PH / 2; if (z.t % 6 === 0) hitAround(z.x, z.y, z.r, 3, { stun: 14 }); for (let j = 0; j < 3; j++) { const an = R() * 6.283, d = R() * z.r; spawn(z.x + Math.cos(an) * d, z.y + Math.sin(an) * d * .7, -Math.sin(an) * 3, Math.cos(an) * 2, sc(), 16, 0, 0, 0, 1); } },
   draw: z => { for (let k = 0; k < 18; k++) { const an = z.t * .22 + k * .35, d = z.r * (.4 + (k % 5) * .15); dot(z.x + Math.cos(an) * d, z.y + Math.sin(an) * d * .6, 0, k % 2 ? SC : SD, 0); } } }); fxWord(p.x, p.y - ST.PH - 14, 'SANDSTORM', 1.1, HEX, true); snd('wind', p.x, p.y, { v: .8, pitch: .6 }); } },
 // a wall of packed sandstone, 40 px tall, where he points
 { n: 'Sand Wall', cost: 14, cd: 40, fn: (a, p) => { const x = mouse.wx, gy = groundY(x, mouse.wy - 10); for (let yy = 0; yy < 40; yy += 2) paint(x, gy - 2 - yy, 3, STONE, { c: [204, 176, 112] }); dust(x, gy - 20, 12); fxWord(x, gy - 46, 'SHHHK', .8, HEX, true); snd('crumble', x, gy, { v: .6 }); } },
 // the ground at the cursor turns to loose sand: buildings on it sag, and whoever stands there sinks
 { n: 'Quicksand', cost: 18, cd: 50, fn: (a, p) => { const x = mouse.wx, gy = groundY(x, mouse.wy - 10); const n = convert(x, gy + 8, 18, m => soft(m) && m !== GLASS ? SAND : null, SCOL); hitAround(x, gy - 4, 28, 6, { stun: 90 }); dust(x, gy, 14); fxWord(x, gy - 18, n ? 'QUICKSAND' : 'TOO HARD', .9, HEX, true); snd('crumble', x, gy); } },
 // bakes loose sand within 26 px of the cursor into stone: pour a ramp, then make it a bridge
 { n: 'Harden', cost: 10, cd: 30, fn: (a, p) => { const n = convert(mouse.wx, mouse.wy, 26, m => m === SAND ? STONE : null, [196, 170, 110]); rings.push({ x: mouse.wx, y: mouse.wy, r: 26, vr: -2, life: 10, c: TAN }); if (!n) { ST.cd = 6; p.en = Math.min(100, p.en + 8); deny(p, 'NO SAND HERE'); } else fxWord(mouse.wx, mouse.wy - 12, 'HARDENED', .8, HEX, true); } },
 // both arms become a hammer and come down in front of him
 { n: 'Sand Hammer', cost: 18, cd: 44, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1, x = p.x + f * 16, gy = groundY(x, p.y - 30); p.face = f; p.clapF = 10; explode(x | 0, gy | 0, 8, { self: true, col: TAN }); hitAround(x, gy - 6, 30, 36, { ky: -5, radial: 2 }); spray(x, gy - 4, 20, SAND, SC, 0, -3, 5, 170); ST.shake += 6; } },
 // a whirlwind of himself that flies where he points
 { n: 'Dust Devil', kind: 'move', cost: 14, cd: 36, fn: (a, p) => { dash(p, a.dx, a.dy, 22, 6.5, { col: TAN, hit: { r: 16, dmg: 12, stun: 24, kx: 2, ky: -3 }, each: k => { if (k % 2) dust(p.x + (R() - .5) * 12, p.y - R() * ST.PH, 2); } }); } },
 // sand pours out of the sky over the cursor for three seconds: it buries what is under it
 { n: 'Hourglass', cost: 24, cd: 80, fn: (a, p) => { zone({ x: mouse.wx, y: mouse.wy, life: 180, tick: z => { for (let j = 0; j < 5; j++) spawn(z.x + (R() - .5) * 22, ST.camY - 3, (R() - .5) * .5, 4 + R(), sc(), 320, SAND, 0, 1); if (z.t % 10 === 0) for (const e of enemies) if (e.hp > 0 && Math.abs(e.x - z.x) < 16 + e.def.w / 2) { hitEnemy(e, 6, 0, 1); stun(e, 24); } }, draw: () => {} }); fxWord(mouse.wx, ST.camY + 30, 'HOURGLASS', 1, HEX, true); } },
 // a second Sandman, made of the same stuff, who walks at the nearest enemy and hits it for eight seconds
 { n: 'Sand Clone', cost: 26, cd: 100, fn: (a, p) => { zone({ x: p.x + p.face * 14, y: p.y, face: p.face, life: 480, tick: z => { const e = nearestEnemy(z.x, z.y - 10, 260); if (e) { z.face = e.x < z.x ? -1 : 1; if (Math.abs(e.x - z.x) > 12) z.x += z.face * 1.3; if (z.t % 30 === 0 && Math.hypot(e.x - z.x, e.y - (z.y - 10)) < 22 + e.def.w / 2) { hitEnemy(e, 16, z.face * 3, -2); dust(e.x, e.y, 6); z.hitF = 6; } } z.y = groundY(z.x, z.y - 14); if (z.hitF > 0) z.hitF--; },
   draw: z => drawSprite(z.x + (z.hitF > 0 ? z.face * 2 : 0), z.y, 0, z.face, false, ARTS.sandman.spr, sandPal()), end: z => { spray(z.x, z.y - 8, 24, SAND, SC, 0, -1.5, 3, 160); } }); say(p, 'SAND CLONE', HEX, .8); } },
 // one enemy near the cursor is swallowed in a ball of sand: 30, and it stays buried
 { n: 'Engulf', fn: (a, p, use) => { const e = nearestEnemy(mouse.wx, mouse.wy, 60); if (!e) return deny(p, 'NO TARGET'); if (!use(16)) return; ST.cd = 40; paint(e.x, e.y, 9, SAND, { c: SCOL }); hitEnemy(e, 30, 0, 0); stun(e, 110); fxWord(e.x, e.y - e.def.h / 2 - 8, 'ENGULFED', .9, HEX, true); snd('crumble', e.x, e.y, { v: .6 }); } },
 // held: a sandblaster. Whatever the beam touches wears away into sand (steel and obsidian hold)
 { n: 'Erode', cost: .8, fn: (a, p) => { const q = ray(a.h.x, a.h.y, a.dx, a.dy, 90); for (let k = 0; k < 3; k++) { const u = R(); spawn(a.h.x + (q.x - a.h.x) * u, a.h.y + (q.y - a.h.y) * u, a.dx * 4 + (R() - .5), a.dy * 4 + (R() - .5), sc(), 8, 0, 0, 0, 1); }
   if (q.hit) { convert(q.x + a.dx * 3, q.y + a.dy * 3, 4, m => soft(m) ? SAND : null, SCOL); } if (ST.frame % 4 === 0) hitAround(q.x, q.y, 12, 4, {}); } },
 // the ultimate: a dune walks down the street. 100 to everything in its path, buried and stunned
 { n: 'Dune Sea', ult: true, cd: 30, fn: (a, p) => { const f = p.face, seen = new Set(); let x = p.x - f * 20, k = 0; fxWord(p.x, p.y - ST.PH - 22, 'DUNE SEA', 1.7, HEX, true); ST.shake += 10; snd('crumble', p.x, p.y, { v: 1 });
   ACT.push(() => { x += f * 6; const gy = groundY(x, ST.camY + 20); for (let j = 0; j < 10; j++) spray(x, gy - 4 - R() * 54, 1, SAND, sc(), f * (3.5 + R() * 2.5), -1 - R() * 1.5, 1.2, 300); ST.shake = Math.max(ST.shake, 3);
     for (const e of enemies) if (e.hp > 0 && !seen.has(e) && Math.abs(e.x - x) < 14 + e.def.w / 2 && e.y > gy - 76) { seen.add(e); hitEnemy(e, 100, f * 7, -3); stun(e, 100); } return ++k < 64; }); } },
];

// trait: he is made of sand. A third of every hit falls off him as sand instead of hurting, and sand under his feet heals him.
TRAITS.sandman = { n: 'Shifting Sands', c: '#e8d090', d: 'A third of all damage is shed as sand instead of taken. Standing on sand heals 0.25 health a tick.',
  hud: (T, p) => { const on = matAt(p.x, p.y + 1) === SAND || matAt(p.x, p.y) === SAND; return [on ? 1 : .33, on ? 'ON SAND · HEALING' : 'SHEDS 33% OF DAMAGE']; },
  tick(p) { if (matAt(p.x, p.y + 1) === SAND || matAt(p.x, p.y) === SAND) p.hp = Math.min(ST.CH.hp, p.hp + .25); },
  hurt(d, p) { spray(p.x, p.y - ST.PH / 2, Math.min(8, 2 + d * .3 | 0), SAND, SC, 0, -1.5, 3, 150); return d * .67; },
  aw: { n: 'Living Dune', d: 'He sheds 70% of all damage and heals as if he stood on sand.', tick(p) { p.hp = Math.min(ST.CH.hp, p.hp + .25); }, hurt: d => d * .45 } };

export const CHAR_SANDMAN = { id: 'sandman', name: 'Sandman', pw: 7, ph: 19, fly: false, fs: 2.4, boost: 2, run: 2, jump: 4.9, hp: 480, armor: .6, glow: TAN, cape: null, thrust: () => rgb(214, 186, 118), powers: SAND_POWERS };
