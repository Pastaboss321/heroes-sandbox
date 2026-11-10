// Daredevil: roster entry, powers and trait. Art: src/art/daredevil.js.
// Identity: a wall-clinging acrobat who sees by sound. He marks what his radar touches, moves faster than he can be
// hit, and puts single, exact blows into marked or stunned targets. No beams, no blasts: a club, a cable and his hands.
import { ST } from '../state.js';
import { GLASS, R, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { shots } from './powers.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus, stOf } from './abilities.js';
import { nearestN } from './kitlib.js';
import { ACT } from './xmen.js';
import { TRAITS } from './traits.js';
import { alive, blink, body, cloak, convert, dash, grapple, hitAround, melee, mouse, puffs, say, seg, shoot, stun } from './newkit.js';

const RED = [255, 70, 60], WH = rgb(240, 232, 224), RC = rgb(220, 50, 44), HEX = '#ff5a4a';
const marked = e => stOf(e).mark > 0 || stOf(e).stun > 0;
// the billy club: a spinning baton
const club = o => shoot(Object.assign({ r: 2, life: 70, col: WH, draw: s => { const an = (s.t || 0) * .7, cx = Math.cos(an) * 2.5, cy = Math.sin(an) * 2.5; seg(s.x - cx, s.y - cy, s.x + cx, s.y + cy, WH, 0); seg(s.x + cx * .6, s.y + cy * .6, s.x + cx, s.y + cy, RC, 0); } }, o));
const ping = (p, r) => { const [x, y] = body(p); rings.push({ x, y, r: 4, vr: r / 14, life: 14, c: RED }, { x, y, r: 2, vr: r / 20, life: 20, c: [255, 190, 180] }); snd('psi', x, y, { pitch: 1.5, v: .5 }); };

const DD_POWERS = [
 // the club comes off walls: three bounces, a short stun on whoever it finds
 { n: 'Billy Club', cost: 4, cd: 10, fn: (a, p) => { club({ x: a.h.x, y: a.h.y, vx: a.dx * 7.5, vy: a.dy * 7.5, dmg: 12, bounce: 3, g: .05, onHit: (s, e) => { if (e) stun(e, 12); puffs(s.x, s.y, 4, WH, 2, 8); } }); p.throwF = 6; } },
 // a sonar ping: everything within 240 px is marked for six seconds (marked targets take +50%) and he dodges most of what comes next
 { n: 'Radar Sense', cost: 14, cd: 50, fn: (a, p) => { ping(p, 240); p.sense = 240; let n = 0; const [x, y] = body(p); for (const e of enemies) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 240 * (ST.aoeC || 1)) { applyStatus(e, 'mark', 360); n++; } say(p, n ? 'RADAR SENSE: ' + n : 'RADAR SENSE', HEX); } },
 // the club's cable: zip to the first solid thing along the aim
 { n: 'Grapple Line', kind: 'move', fn: (a, p, use) => { if (!use(8)) return; ST.cd = grapple(p, a, 190, [240, 232, 224], [150, 40, 40]) ? 14 : 8; } },
 // straight up the nearest wall, or a rising run in the air
 { n: 'Wall Run', kind: 'move', cost: 8, cd: 22, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1; dash(p, f * .28, -.96, 14, 7, { hit: { r: 11, dmg: 10 }, col: RED }); } },
 // a somersault that kicks everything around him upward and carries him over their heads
 { n: 'Flip Kick', cost: 10, cd: 24, fn: (a, p) => { const [x, y] = body(p), f = a.dx < 0 ? -1 : 1; hitAround(x, y, 20, 18, { kx: f * 2, ky: -6.5 }); p.vy = -5.6; p.vx += f * 1.5; p.ground = false; p.clapF = 8; fxWord(x, y - 14, 'THWACK!', 1, HEX, true); snd('punch', x, y); } },
 // one exact blow to the nearest enemy: 45, or 110 on a marked or stunned one, and it stuns
 { n: 'Pressure Point', fn: (a, p, use) => { const [x, y] = body(p), e = nearestEnemy(x, y, 36); if (!e) { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; say(p, 'NO ONE IN REACH', HEX, .7); } return; } if (!use(16)) return; ST.cd = 40;
   const big = marked(e); p.face = e.x < p.x ? -1 : 1; p.punchF = 10; hitEnemy(e, big ? 110 : 45, p.face * 2, -1); stun(e, 70); flash(e.x, e.y, 20, RED, 6); fxWord(e.x, e.y - e.def.h / 2 - 8, big ? 'PRESSURE POINT!' : 'CRACK!', big ? 1.3 : .9, HEX, true); ST.hitstop = Math.max(ST.hitstop, big ? 5 : 2); } },
 // a low sweep that takes the legs out from under a whole line of enemies
 { n: 'Baton Sweep', cost: 9, cd: 22, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1; p.face = f; for (const d of [12, 26]) hitAround(p.x + f * d, p.y - 5, 13, 8, { kx: f * 1.5, ky: -2.5, stun: 45 }); p.punchF = 10; fxWord(p.x + f * 16, p.y - 12, 'SWEEP!', .8, HEX, true); } },
 // the club thrown so it finds up to five enemies in turn, nearest to the cursor first
 { n: 'Ricochet Throw', fn: (a, p, use) => { const L = nearestN(mouse.wx, mouse.wy, 170, 5); if (!L.length) { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; fxWord(mouse.wx, mouse.wy, 'NO TARGET', .7, HEX, true); } return; } if (!use(16)) return; ST.cd = 40; p.throwF = 8;
   let k = 0, n = 0, px = a.h.x, py = a.h.y; ACT.push(() => { if (k++ % 5) return true; const e = L[n++]; if (!e) return false; if (alive(e)) { beams.push({ x0: px, y0: py, x1: e.x, y1: e.y, life: 5, w: 0, c: [240, 232, 224], g: [200, 60, 50], st: 'crisp' }); hitEnemy(e, 18, (e.x - px) * .03, -1); stun(e, 20); px = e.x; py = e.y; snd('clang', px, py, { v: .5, gap: .03 }); } return n < L.length; }); } },
 // clubs struck together: the note staggers everything close and shatters every pane of glass within 70 px
 { n: 'Echo Clap', cost: 14, cd: 45, fn: (a, p) => { const [x, y] = body(p); ping(p, 80); p.clapF = 10; hitAround(x, y, 70, 6, { stun: 70 }); const n = convert(x, y, 70, m => m === GLASS ? 0 : null); for (let k = 0; k < Math.min(40, n); k++) { const an = R() * 6.283, d = R() * 70; spawn(x + Math.cos(an) * d, y + Math.sin(an) * d, (R() - .5) * 2, R() * 2, rgb(190, 230, 245), 30, 0, 1, 1); } if (n) snd('glass', x, y); fxWord(x, y - 18, 'KLANNNG!', 1.1, HEX, true); } },
 // out of the air onto the cursor
 { n: 'Dive Strike', kind: 'move', cost: 16, cd: 36, fn: (a, p) => { if (p.ground) { p.y -= 2; p.ground = false; } dash(p, a.dx, a.dy, 16, 8.5, { hit: { r: 12, dmg: 20 }, col: RED, onEnd: () => { explode(p.x | 0, p.y | 0, 5, { self: true, col: RED, quiet: true }); hitAround(p.x, p.y - 6, 26, 22, { radial: 3 }); } }); } },
 // for most of a second nothing can touch him, and whoever is close enough to have tried is thrown and stunned
 { n: 'Counter Stance', cost: 12, cd: 60, fn: (a, p) => { p.dodge = 50; const seen = new Set(); let k = 0; say(p, 'COUNTER', HEX, .8); ACT.push(() => { const [x, y] = body(p); for (const e of enemies) if (e.hp > 0 && !seen.has(e) && Math.hypot(e.x - x, e.y - y) < 22 + e.def.w / 2) { seen.add(e); hitEnemy(e, 32, (e.x < x ? -1 : 1) * 5, -3); stun(e, 50); fxWord(e.x, e.y - 12, 'COUNTERED!', .9, HEX, true); } if (k % 6 === 0) rings.push({ x, y, r: 10, vr: .6, life: 6, c: RED }); return ++k < 50; }); } },
 // gone into the dark: enemies lose him for four seconds
 { n: 'Hell\'s Kitchen Shadows', quiet: true, cost: 15, cd: 70, fn: (a, p) => { cloak(p, 260); puffs(p.x, p.y - ST.PH / 2, 14, rgb(40, 20, 24), 1.4, 24); say(p, 'GONE', HEX, .8); } },
 // three kicks off thin air, zig-zagging upward through whatever is in the way
 { n: 'Devil\'s Ladder', kind: 'move', cost: 18, cd: 50, fn: (a, p) => { const f = a.dx < 0 ? -1 : 1, leg = (d, n) => dash(p, d * .72, -.7, 8, 7.5, { hit: { r: 12, dmg: 14, kx: 3 }, col: RED, onEnd: () => { if (n < 2) leg(-d, n + 1); } }); leg(f, 0); } },
 // held: the world on fire. Enemy shots near him are swatted out of the air and everything close stays marked
 { n: 'World on Fire', cost: .5, fn: (a, p) => { const [x, y] = body(p); for (let n = shots.length - 1; n >= 0; n--) { const s = shots[n]; if (s.owner === 'enemy' && Math.hypot(s.x - x, s.y - y) < 42) { puffs(s.x, s.y, 3, WH, 2, 6); shots.splice(n, 1); } }
   if (ST.frame % 20 === 0) { ping(p, 150); for (const e of enemies) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 200) applyStatus(e, 'mark', 50); } } },
 // the ultimate: he goes through every enemy near him, one blow each, too fast to follow
 { n: 'Man Without Fear', ult: true, cd: 30, fn: (a, p) => { const [x, y] = body(p), L = nearestN(x, y, 420, 12); if (!L.length) { hitAround(x, y, 60, 40, { radial: 5, stun: 60 }); ping(p, 120); return; }
   let k = 0, n = 0; p.dodge = L.length * 5 + 20; ACT.push(() => { if (k++ % 5) return true; const e = L[n++]; if (!e) return false; if (alive(e)) { const f = e.x < p.x ? -1 : 1; blink(p, e.x - f * 8, e.y + e.def.h / 2); p.face = f; p.punchF = 6; hitEnemy(e, 40, f * 4, -2); stun(e, 40); flash(e.x, e.y, 16, RED, 4); fxWord(e.x, e.y - 14, ['CRACK!', 'THWACK!', 'WHAM!'][n % 3], .9, HEX, true); snd('punch', e.x, e.y, { gap: .03 }); } return n < L.length; }); } },
];

// trait: precision. His hits land 60% harder on marked or stunned targets, and every fourth second his radar marks the nearest enemy by itself.
TRAITS.daredevil = { n: 'Radar Sense', c: '#ff5a4a', d: 'Hits on marked or stunned enemies are 60% stronger. Every 4 s the radar marks the nearest enemy within 150 px by itself.',
  hud: (T, p) => { const e = nearestEnemy(p.x, p.y - ST.PH / 2, 150); return [e && marked(e) ? 1 : .25, e ? (marked(e) ? 'TARGET MARKED · +60%' : 'LISTENING') : 'RADAR SENSE']; },
  tick(p) { if (ST.frame % 240 === 0) { const e = nearestEnemy(p.x, p.y - ST.PH / 2, 150); if (e && e.hp > 0) { applyStatus(e, 'mark', 300); rings.push({ x: e.x, y: e.y, r: 14, vr: -1, life: 12, c: RED }); } } },
  hit: (e, d) => marked(e) ? d * 1.6 : d,
  aw: { n: 'No Fear', d: 'Nothing can touch him while he keeps moving: he dodges every attack, and every hit counts as marked.', hit: (e, d) => marked(e) ? d : d * 1.6, hurt: () => 0 } };

export const CHAR_DAREDEVIL = { id: 'daredevil', name: 'Daredevil', pw: 7, ph: 19, fly: false, fs: 2.6, boost: 1, run: 2.5, jump: 5.9, hp: 340, armor: .7, glow: RED, cape: null, climb: true, thrust: () => rgb(255, 80, 60), powers: DD_POWERS };
