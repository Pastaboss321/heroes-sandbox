// Iron Fist: roster entry, powers and trait. Art: src/art/ironfist.js.
// Identity: one enormous punch. Everything he does builds chi (the trait bar); THE IRON FIST spends all of it on a
// single blow that scales from a jab to something that puts a tunnel through a building. Chi is also his
// currency for healing, stepping through space and sending a dragon out of his hands.
import { ST } from '../state.js';
import { KIND, OBSID, R, RUBBLE, S, STEEL, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { shots } from './powers.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus } from './abilities.js';
import { ACT } from './xmen.js';
import { TRAITS, trOf } from './traits.js';
import { carve } from '../player.js';
import { blink, body, convert, dash, dot, groundY, hitAround, melee, mouse, puffs, say, shoot, stun } from './newkit.js';

const GOLD = [255, 214, 90], HEX = '#ffd65a', GC = rgb(255, 220, 110), GD = rgb(255, 160, 40);
const chi = p => trOf(p);
const addChi = (p, v) => { const T = chi(p), was = T.chi; T.chi = Math.max(0, Math.min(100, T.chi + v)); if (was < 100 && T.chi >= 100) { say(p, 'CHI FULL', HEX, .9); snd('charge', p.x, p.y, { pitch: 1.5, v: .5 }); } };
// spend chi, unless it is locked full (the ultimate, the awakening). Returns false when there is not enough
const spend = (p, v) => { const T = chi(p); if (T.aw > 0 || T.lock > 0) return true; if (T.chi < v) { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; say(p, 'NEED ' + v + ' CHI', HEX, .7); } return false; } T.chi -= v; return true; };
const glow = (x, y, n) => { for (let k = 0; k < n; k++) { const an = R() * 6.283; spawn(x + Math.cos(an) * 5, y + Math.sin(an) * 5, Math.cos(an) * .4, -.6 - R() * .6, R() < .5 ? GC : GD, 14, 0, 1, 0, 1); } };

const FIST_POWERS = [
 // fast hands: every blow that lands is 8 chi
 { n: 'Jab Combo', cost: 3, cd: 8, fn: (a, p) => { const n = melee(p, a, { dmg: 9, r: 11, kx: 1.5 }).length; if (n) addChi(p, 8 * n); snd('punch', p.x, p.y, { v: .45, gap: .03 }); } },
 // held: stand and breathe. Chi climbs fast and wounds close slowly
 { n: 'Focus Chi', cost: .15, fn: (a, p) => { addChi(p, 1.3); p.hp = Math.min(ST.CH.hp, p.hp + .12); p.vx *= .6; const [x, y] = body(p); if (ST.frame % 2 === 0) glow(x, y, 1); if (ST.frame % 30 === 0) rings.push({ x, y, r: 16, vr: -1, life: 12, c: GOLD }); } },
 // all of his chi in one blow: 30 damage with none, 200 with a full bar, and a tunnel as long as the bar was full
 { n: 'THE IRON FIST', cost: 10, cd: 34, fn: (a, p) => { const T = chi(p), c = T.chi, [x, y] = body(p), cx = x + a.dx * 14, cy = y + a.dy * 14; if (!(T.aw > 0 || T.lock > 0)) T.chi = 0; p.punchF = 10; p.face = a.dx < 0 ? -1 : 1;
   for (let s = 0, n = 3 + c * .22 | 0; s <= n; s++) carve(cx + a.dx * s * 3, cy + a.dy * s * 3, 3.5 + c * .035, a.dx * 4, a.dy * 4);
   hitAround(cx, cy, 14 + c * .1, 30 + c * 1.7, { kx: a.dx * (4 + c * .06), ky: a.dy * 4 - 2 }); if (c >= 50) { explode(cx | 0, cy | 0, 5 + c * .06 | 0, { self: true, col: GOLD, quiet: c < 100 }); ST.shake += c * .08; }
   flash(cx, cy, 20 + c * .5, GOLD, 8); rings.push({ x: cx, y: cy, r: 4, vr: 2 + c * .04, life: 12, c: GOLD }); fxWord(cx, cy - 16, c >= 100 ? 'K\'UN-LUN STRIKE!' : c >= 50 ? 'IRON FIST!' : 'HA!', .9 + c * .008, HEX, true); ST.hitstop = Math.max(ST.hitstop, c * .08 | 0); snd('slam', cx, cy, { size: .3 + c / 90 }); } },
 // an uppercut that takes him and them off the ground: 10 chi for each enemy carried up
 { n: 'Rising Dragon', kind: 'move', cost: 10, cd: 26, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1, [x, y] = body(p); p.face = f; p.punchF = 10; const n = hitAround(x + f * 8, y - 4, 16, 20, { kx: f, ky: -7.5 }).length; addChi(p, 10 * n); p.vy = -7.2; p.ground = false; for (let s = 0; s < 8; s++) carve(x + f * 6, y - 6 - s * 3, 3, f, -3); glow(x + f * 6, y - 8, 8); fxWord(x, y - 20, 'RISING DRAGON!', .9, HEX, true); } },
 // a flying kick straight along the aim
 { n: 'Dragon Kick', kind: 'move', cost: 10, cd: 24, fn: (a, p) => { dash(p, a.dx, a.dy * .6, 10, 7.5, { col: GOLD, hit: { r: 12, dmg: 18, kx: 6, on: () => addChi(p, 10) } }); } },
 // 30 chi: a wave of force that runs along the ground
 { n: 'Chi Wave', cost: 6, cd: 30, fn: (a, p) => { if (!spend(p, 30)) return; const f = a.dx < 0 ? -1 : 1, seen = new Set(); let x = p.x + f * 8, k = 0; ACT.push(() => { x += f * 5; const y = groundY(x, p.y - 40); for (const e of enemies) if (e.hp > 0 && !seen.has(e) && Math.hypot(e.x - x, e.y - (y - 6)) < 11 + e.def.w / 2) { seen.add(e); hitEnemy(e, 28, f * 4, -4); }
     glow(x, y - 3, 3); if (k % 3 === 0) rings.push({ x, y: y - 2, r: 3, vr: 1.2, life: 6, c: GOLD }); return ++k < 26; }); } },
 // an open palm: little damage, but it throws them a long way and leaves them stunned
 { n: 'Palm Strike', cost: 8, cd: 22, fn: (a, p) => { const L = melee(p, a, { dmg: 12, r: 12, kx: 9, ky: -2.5, stun: 35 }); if (L.length) addChi(p, 6); const [x, y] = body(p); rings.push({ x: x + a.dx * 12, y: y + a.dy * 12, r: 3, vr: 2.4, life: 8, c: GOLD }); } },
 // 50 chi: closes 60 health
 { n: 'Chi Heal', cost: 0, cd: 60, fn: (a, p) => { if (!spend(p, 50)) { ST.cd = 0; return; } p.hp = Math.min(ST.CH.hp, p.hp + 60); const [x, y] = body(p); glow(x, y, 24); rings.push({ x, y, r: 4, vr: 2, life: 16, c: [140, 255, 170] }); say(p, '+60', '#8dffb0', .9); } },
 // held: a blur of punches. While there is chi to burn, each one hits nearly twice as hard
 { n: 'Hundred Fists', cost: .55, fn: (a, p) => { if (ST.frame % 2) return; const T = chi(p), hot = T.chi > 0 || T.aw > 0 || T.lock > 0; if (hot && !(T.aw > 0 || T.lock > 0)) T.chi = Math.max(0, T.chi - 1); melee(p, a, { dmg: hot ? 7 : 4, r: 11, reach: 12 + R() * 6, kx: 1 }); if (hot) glow(p.x + a.dx * 14, p.y - ST.PH / 2 + a.dy * 14, 1); } },
 // a punch into the ground: stone, brick and concrete under his feet break up into loose rubble
 { n: 'Stone Breaker', cost: 14, cd: 40, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1, x = p.x + f * 8, y = p.y + 10; p.punchF = 10; const n = convert(x, y, 15, m => KIND[m] === S && m !== OBSID && m !== STEEL ? RUBBLE : null); hitAround(x, p.y - 6, 30, 22, { ky: -4, radial: 2 }); ST.shake += 6; addChi(p, 6); fxWord(x, p.y - 20, n ? 'KRRRAK!' : 'THUD', 1, HEX, true); snd('crumble', x, y); } },
 // for most of a second, enemy shots that reach him are sent back the way they came
 { n: 'Deflect', cost: 10, cd: 50, fn: (a, p) => { let k = 0; say(p, 'DEFLECT', HEX, .8); ACT.push(() => { const [x, y] = body(p); for (const s of shots) if (s.owner === 'enemy' && Math.hypot(s.x - x, s.y - y) < 22) { s.vx = -s.vx * 1.3; s.vy = -s.vy * 1.3; s.owner = 'hero'; s.life = Math.max(s.life || 0, 60); puffs(s.x, s.y, 3, GC, 2, 8, 1); addChi(p, 4); } if (k % 5 === 0) rings.push({ x, y, r: 12, vr: .5, life: 5, c: GOLD }); p.shell = 2; return ++k < 45; }); } },
 // the dragon's mark: the marked enemy takes +50% from everything for eight seconds
 { n: 'Mark of Shou-Lao', fn: (a, p, use) => { const e = nearestEnemy(mouse.wx, mouse.wy, 80); if (!e) { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; fxWord(mouse.wx, mouse.wy, 'NO TARGET', .7, HEX, true); } return; } if (!use(8)) return; ST.cd = 30; applyStatus(e, 'mark', 480); rings.push({ x: e.x, y: e.y, r: 20, vr: -1.4, life: 12, c: GOLD }); fxWord(e.x, e.y - e.def.h / 2 - 8, 'MARKED', .9, HEX, true); } },
 // 20 chi: one step, and he is standing at the cursor
 { n: 'Meditative Step', kind: 'move', cost: 4, cd: 22, fn: (a, p) => { if (!spend(p, 20)) { ST.cd = 0; return; } const [x, y] = body(p); glow(x, y, 12); if (blink(p, mouse.wx, mouse.wy)) { glow(p.x, p.y - ST.PH / 2, 12); rings.push({ x: p.x, y: p.y - ST.PH / 2, r: 14, vr: -1.2, life: 10, c: GOLD }); p.dodge = 8; } } },
 // 40 chi: Shou-Lao himself, a dragon of light that swims after enemies and goes through them
 { n: 'Dragon Spirit', cost: 8, cd: 44, fn: (a, p) => { if (!spend(p, 40)) { ST.cd = 0; return; } shoot({ x: a.h.x, y: a.h.y, vx: a.dx * 5, vy: a.dy * 5, life: 110, dmg: 40, r: 5, pierce: true, ghost: true, home: { r: 220, k: .07 }, hist: [], trail: s => { s.hist.unshift([s.x, s.y]); if (s.hist.length > 14) s.hist.pop(); if (s.t % 30 === 0) s.hit.clear(); },
   draw: s => { s.hist.forEach((q, i) => dot(q[0], q[1] + Math.sin(s.t * .3 + i * .7) * 2, i < 2 ? 3 : i < 8 ? 2 : 1, i % 2 ? GD : GC, GD)); dot(s.x, s.y, 3, rgb(255, 250, 210), GC); } }); fxWord(a.h.x, a.h.y - 14, 'SHOU-LAO!', 1.1, HEX, true); } },
 // the ultimate: the heart of the dragon. A blast of chi around him, and for eight seconds the bar never empties
 { n: 'Heart of Shou-Lao', ult: true, cd: 30, fn: (a, p) => { const T = chi(p), [x, y] = body(p); T.chi = 100; T.lock = 480; explode(x | 0, y | 0, 10, { self: true, col: GOLD }); hitAround(x, y, 70, 60, { radial: 5, stun: 40 }); glow(x, y, 40); rings.push({ x, y, r: 6, vr: 6, life: 20, c: GOLD }); } },
];

// trait: chi. The bar is the damage of his next Iron Fist; it also adds up to +30% to everything else he lands.
TRAITS.ironfist = { n: 'Chi', c: '#ffd65a', d: 'Hits and Focus build chi (max 100). THE IRON FIST spends all of it on one blow. While it is banked, every other hit is up to 30% stronger.',
  init(T) { T.chi = 0; T.lock = 0; }, hud: (T) => [T.chi / 100, T.lock > 0 ? 'HEART OF THE DRAGON' : 'CHI ' + (T.chi | 0)],
  tick(p, T) { if (T.lock > 0) { T.lock--; T.chi = 100; } if (T.chi >= 100 && ST.frame % 6 === 0) glow(p.x + p.face * 5, p.y - ST.PH * .45, 1); },
  hit: (e, d, T) => d * (1 + T.chi * .003),
  aw: { n: 'Living Weapon', d: 'Chi stays at 100 and nothing he does spends it.', tick(p, T) { T.chi = 100; } } };

export const CHAR_IRONFIST = { id: 'ironfist', name: 'Iron Fist', pw: 7, ph: 19, fly: false, fs: 2.4, boost: 2, run: 2.4, jump: 5.8, hp: 380, armor: .65, glow: GOLD, cape: null, thrust: () => rgb(255, 214, 90), powers: FIST_POWERS };
