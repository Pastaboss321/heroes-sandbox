// Mysterio: roster entry, powers and trait. Art: src/art/mysterio.js.
// Identity: nothing he shows you is where it seems. Copies of himself that shoot, a decoy that takes the fire,
// enemies turned on each other, and tricks played on the terrain itself: a floor that is only there for eight
// seconds, a wall that is not there for six. He does little damage directly and is rarely where the hits land.
import { ST } from '../state.js';
import { FIRE, GLASS, KIND, R, S, SMOKE, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { snd } from '../sfx.js';
import { drawSprite } from '../render/sprites.js';
import { ARTS } from '../art/index.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { ACT } from './xmen.js';
import { TRAITS } from './traits.js';
import { alive, blink, body, circ, cloak, dot, groundY, hitAround, inW, mouse, paint, puffs, say, shoot, spray, stun, tagd, zone } from './newkit.js';

const MIST = [120, 240, 160], HEX = '#7df0a0', MC = rgb(110, 230, 150), MD = rgb(50, 130, 90), VIO = rgb(170, 110, 230);
const deny = (p, s) => { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; fxWord(mouse.wx, mouse.wy, s, .7, HEX, true); } };
const poof = (x, y, n = 12) => { puffs(x, y, n, MC, 1.8, 22, 1); puffs(x, y, n >> 1, rgb(60, 70, 66), 1.2, 26); };
// his copies: the sprite washed in green mist
let GHOST = null; const ghostPal = () => { if (GHOST) return GHOST; GHOST = {}; const P = ARTS.mysterio.pal; for (const k in P) { const c = P[k]; GHOST[k] = rgb((c & 255) * .45 + 50, ((c >> 8) & 255) * .5 + 110, ((c >> 16) & 255) * .45 + 70); } return GHOST; };
const bolt = (x, y, dx, dy, dmg = 10) => shoot({ x, y, vx: dx * 7, vy: dy * 7, life: 50, dmg, col: MC, glow: MC, size: 1, trail: s => { if (s.t % 2) spawn(s.x, s.y, (R() - .5) * .4, (R() - .5) * .4, MD, 10, 0, 1, 0, 1); }, onHit: s => puffs(s.x, s.y, 5, MC, 1.6, 10, 1) });
// a copy of him that orbits (or stands) and fires at the nearest enemy
const image = (p, k, n, life) => zone({ x: p.x, y: p.y, life, face: 1, tick: z => { const an = z.t * .03 + k / n * 6.283; z.x = p.x + Math.cos(an) * 30; z.y = p.y + Math.sin(an) * 12; const e = nearestEnemy(z.x, z.y - 10, 190); if (e) { z.face = e.x < z.x ? -1 : 1; if (z.t % 34 === k * 9 % 34) { const d = Math.hypot(e.x - z.x, e.y - (z.y - 12)) || 1; bolt(z.x, z.y - 12, (e.x - z.x) / d, (e.y - (z.y - 12)) / d, 8); } } },
  draw: z => { if ((z.t + k * 3) % 23 > 1) drawSprite(z.x, z.y, 0, z.face, false, ARTS.mysterio.spr, ghostPal()); }, end: z => poof(z.x, z.y - 12, 8) });

const MYST_POWERS = [
 { n: 'Mist Bolt', cost: 4, cd: 9, fn: (a, p) => { bolt(a.h.x, a.h.y, a.dx, a.dy); p.castF = 8; } },
 // he leaves an image of himself standing there and steps away unseen: enemies keep shooting at the image
 { n: 'Decoy', quiet: true, cost: 14, cd: 60, fn: (a, p) => { ST.decoy = { x: p.x, y: p.y, hp: 140, max: 140, life: 420, face: p.face, kind: 'holo', spr: ST.CH.spr, pal: ghostPal(), c: MIST }; cloak(p, 150); poof(p.x, p.y - ST.PH / 2); say(p, 'NOW YOU SEE ME', HEX, .8); } },
 // three more Mysterios circle him for eight seconds, each one firing
 { n: 'Mirror Images', cost: 22, cd: 90, fn: (a, p) => { for (let k = 0; k < 3; k++) image(p, k, 3, 480); poof(p.x, p.y - ST.PH / 2, 16); say(p, 'WHICH ONE?', HEX, .9); } },
 // a bank of real smoke at the cursor: enemies in it stand confused
 { n: 'Smoke Screen', quiet: true, cost: 14, cd: 50, fn: (a, p) => { paint(mouse.wx, mouse.wy, 18, SMOKE, { p: .75, c: [90, 150, 120] }); poof(mouse.wx, mouse.wy, 18); hitAround(mouse.wx, mouse.wy, 50, 1, { stun: 100 }); snd('pop', mouse.wx, mouse.wy, { v: .6 }); } },
 // trades places with his decoy if one is standing; otherwise he is simply at the cursor
 { n: 'Swap', kind: 'move', quiet: true, cost: 10, cd: 30, fn: (a, p) => { const d = ST.decoy && ST.decoy.kind === 'holo' ? ST.decoy : null, ox = p.x, oy = p.y; poof(ox, oy - ST.PH / 2); if (d) { blink(p, d.x, d.y); d.x = ox; d.y = oy; } else blink(p, mouse.wx, mouse.wy); poof(p.x, p.y - ST.PH / 2); p.dodge = 10; snd('psi', p.x, p.y, { pitch: 1.3, v: .5 }); } },
 // a floor that is real for eight seconds: 44 px of glass at the cursor, then gone
 { n: 'False Floor', cost: 12, cd: 40, fn: (a, p) => { const cells = [], x0 = mouse.wx | 0, y0 = mouse.wy | 0; for (let yy = 0; yy < 2; yy++) for (let xx = -22; xx <= 22; xx++) { const X = x0 + xx, Y = y0 + yy; if (!inW(X, Y) || Y >= H - 44) continue; const i = Y * W + X; if (t[i] === 0 || KIND[t[i]] !== S && t[i] !== 0 && KIND[t[i]] === 3) { setc(i, GLASS); col[i] = rgb(150 + R() * 20, 240, 190); cells.push(i); } }
   let k = 0; ACT.push(() => { if (++k < 480) return true; for (const i of cells) if (t[i] === GLASS) setc(i, 0); poof(x0, y0, 10); return false; }); fxWord(x0, y0 - 10, 'TA-DA', .8, HEX, true); } },
 // 15 px of whatever is at the cursor is not there for six seconds. Then it is again
 { n: 'Vanishing Act', cost: 18, cd: 60, fn: (a, p) => { const keep = [], x0 = mouse.wx | 0, y0 = mouse.wy | 0, r = 15; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { if (xx * xx + yy * yy > r * r) continue; const X = x0 + xx, Y = y0 + yy; if (!inW(X, Y) || Y >= H - 44) continue; const i = Y * W + X; if (KIND[t[i]] === S) { keep.push(i, t[i], col[i]); setc(i, 0); } }
   poof(x0, y0, 18); fxWord(x0, y0 - 20, keep.length ? 'GONE!' : 'NOTHING THERE', .9, HEX, true); let k = 0; ACT.push(() => { if (++k < 360) return true; for (let j = 0; j < keep.length; j += 3) { const i = keep[j]; if (t[i] === 0 || KIND[t[i]] === 3) { setc(i, keep[j + 1]); col[i] = keep[j + 2]; } } poof(x0, y0, 14); return false; }); } },
 // one enemy near the cursor sees monsters everywhere and fights its own side for eight seconds
 { n: 'Nightmare', fn: (a, p, use) => { const e = nearestEnemy(mouse.wx, mouse.wy, 80); if (!e || e.def.title || e.def.titan || e.ally > 0) return deny(p, e ? 'TOO STRONG A MIND' : 'NO TARGET'); if (!use(18)) return; ST.cd = 50; e.ally = 480; poof(e.x, e.y, 10); fxWord(e.x, e.y - e.def.h / 2 - 8, 'NIGHTMARE', 1, HEX, true); snd('psi', e.x, e.y, { pitch: .6 }); } },
 // a thing that is not there: a huge leering face at the cursor. Enemies near it cannot move for fear, and it hurts to look at
 { n: 'Illusory Monster', cost: 26, cd: 100, fn: (a, p) => { zone({ x: mouse.wx, y: mouse.wy, r: 70, life: 300, tick: z => { if (z.t % 15 === 0) hitAround(z.x, z.y, z.r, 5, { stun: 22 }); },
   draw: z => { const a2 = Math.min(1, z.t / 20, z.life / 20), w = Math.sin(z.t * .1) * 2; if ((z.t % 3) === 0 && a2 < 1) return; circ(z.x, z.y + w, 26, MD, MD, 60); circ(z.x, z.y + w, 24, MC, 0, 50); for (const s of [-1, 1]) { dot(z.x + s * 9, z.y - 6 + w, 4, rgb(20, 40, 30), 0); dot(z.x + s * 9 + Math.sin(z.t * .07) * 2, z.y - 6 + w, 1, rgb(255, 240, 120), rgb(255, 220, 80)); } for (let k = -12; k <= 12; k += 3) { dot(z.x + k, z.y + 10 + w + Math.abs(k) * -.25, 1, rgb(240, 250, 240), 0); } } }); fxWord(mouse.wx, mouse.wy - 40, 'BEHOLD!', 1.3, HEX, true); snd('roar', mouse.wx, mouse.wy, { v: .6, pitch: .7 }); } },
 // two projector drones circle him and put a beam into the nearest enemy every half second
 { n: 'Holo-Drones', cost: 20, cd: 90, fn: (a, p) => { for (const k of [0, 1]) zone({ x: p.x, y: p.y, life: 540, tick: z => { const an = z.t * .05 + k * Math.PI; z.x = p.x + Math.cos(an) * 34; z.y = p.y - ST.PH - 6 + Math.sin(an * 1.3) * 8; if (z.t % 30 === k * 15) { const e = nearestEnemy(z.x, z.y, 170); if (e) { beams.push({ x0: z.x, y0: z.y, x1: e.x, y1: e.y, life: 4, w: 0, c: [220, 255, 230], g: MIST, st: 'crisp' }); hitEnemy(e, 7, 0, 0); } } },
   draw: z => { dot(z.x, z.y, 2, rgb(150, 156, 170), 0); dot(z.x, z.y, 0, MC, MC); dot(z.x, z.y + 2, 0, MC, MC); } }); say(p, 'DRONES', HEX, .8); } },
 // the dome flares: everything in front of him within 90 px is blinded
 { n: 'Fishbowl Flash', cost: 12, cd: 44, fn: (a, p) => { const [x, y] = body(p); flash(x + a.dx * 10, y - 6, 90, [220, 255, 235], 10); for (const e of enemies) { if (e.hp <= 0) continue; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1; if (d < 90 * (ST.aoeC || 1) && (dx * a.dx + dy * a.dy) / d > .4) { hitEnemy(e, 6, a.dx * 2, -1); stun(e, 100); } } fxWord(x + a.dx * 20, y - 20, 'FLASH!', 1.1, '#ffffff', true); snd('pop', x, y, { v: .8 }); } },
 // which way is down? Everything near the cursor falls upward, then finds out the truth
 { n: 'Gravity Trick', cost: 18, cd: 56, fn: (a, p) => { const L = []; for (const e of enemies) if (e.hp > 0 && !e.def.titan && !e.def.title && Math.hypot(e.x - mouse.wx, e.y - mouse.wy) < 60 * (ST.aoeC || 1)) { e.vy = -7.5; e.ground = false; L.push(e); } rings.push({ x: mouse.wx, y: mouse.wy, r: 60, vr: -3, life: 14, c: MIST }); if (!L.length) return; let k = 0; ACT.push(() => { if (++k < 34) { for (const e of L) if (alive(e)) e.vy = Math.min(e.vy, -2); return true; } for (const e of L) if (alive(e)) { e.vy = 9; hitEnemy(e, 24, 0, 6); } return false; }); fxWord(mouse.wx, mouse.wy - 30, 'UP IS DOWN', 1, HEX, true); } },
 // stage flame jets: five of them in a row at the cursor, and these are real
 { n: 'Pyrotechnics', cost: 16, cd: 50, fn: (a, p) => { const x0 = mouse.wx, gy = groundY(x0, mouse.wy - 10); let k = 0; ACT.push(() => { for (let j = -2; j <= 2; j++) if ((k + j * 3) % 4 === 0) spray(x0 + j * 12, groundY(x0 + j * 12, gy - 14) - 2, 2, FIRE, rgb(255, 150 + R() * 80, 40), 0, -3.6, 1, 50, 1); if (k % 6 === 0) tagd('fire', () => hitAround(x0, gy - 12, 34, 6, { ky: -1 })); return ++k < 34; }); fxWord(x0, gy - 34, 'FWOOSH!', 1, '#ff9a3c', true); snd('whoosh', x0, gy, { v: .7 }); } },
 // exit in a clap of smoke, entrance at the cursor in another: everything near the entrance is thrown back
 { n: 'Curtain Call', kind: 'move', quiet: true, cost: 14, cd: 36, fn: (a, p) => { poof(p.x, p.y - ST.PH / 2, 16); if (!blink(p, mouse.wx, mouse.wy)) return; const [x, y] = body(p); poof(x, y, 18); paint(x, y, 8, SMOKE, { p: .6 }); hitAround(x, y, 32, 24, { radial: 4, stun: 30 }); rings.push({ x, y, r: 4, vr: 3, life: 12, c: MIST }); p.dodge = 12; snd('pop', x, y, { v: .7 }); } },
 // the ultimate: the whole street is his stage. Six more of him, every lesser enemy turned on its friends, and 60 to them all
 { n: 'Grand Illusion', ult: true, cd: 30, fn: (a, p) => { const [x, y] = body(p); fxWord(x, y - 30, 'THE GRAND ILLUSION', 1.6, HEX, true); flash(x, y, 200, MIST, 14); for (let k = 0; k < 6; k++) image(p, k, 6, 540);
   for (const e of enemies) { if (e.hp <= 0 || Math.hypot(e.x - x, e.y - y) > 440) continue; hitEnemy(e, 60, 0, -1); if (!e.def.title && !e.def.titan) { e.ally = 360; poof(e.x, e.y, 6); } else stun(e, 90); } snd('psi', x, y, { pitch: .5, v: 1 }); } },
];

// trait: you cannot be sure which one is him. Three hits in ten were only ever aimed at an image.
TRAITS.mysterio = { n: 'Smoke and Mirrors', c: '#7df0a0', d: '30% of the hits that reach him strike an illusion instead: no damage, and he reappears a step away.',
  hud: (T) => [T.fool > ST.frame ? 1 : .3, T.fool > ST.frame ? 'FOOLED THEM' : 'SMOKE AND MIRRORS'],
  hurt(d, p, T) { if (R() >= (T.aw > 0 ? .75 : .3)) return d; T.fool = ST.frame + 40; poof(p.x, p.y - ST.PH / 2, 8); blink(p, p.x + (R() < .5 ? -1 : 1) * (10 + R() * 10), p.y); if (ST.frame - (T.fw || -99) > 30) { T.fw = ST.frame; say(p, 'AN ILLUSION!', HEX, .7); } return 0; },
  aw: { n: 'Master of Illusion', d: 'Three hits in four are illusions.' } };

export const CHAR_MYSTERIO = { id: 'mysterio', name: 'Mysterio', pw: 7, ph: 19, fly: true, fs: 2.8, boost: 2, run: 2, jump: 5, hp: 300, armor: .8, glow: MIST, cape: null, thrust: () => R() < .6 ? rgb(110, 230, 150) : rgb(170, 110, 230), powers: MYST_POWERS };
