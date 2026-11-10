// Black Widow: roster entry, powers and trait. Art: src/art/widow.js.
// Identity: stealth and gadgets. She fights from a cloak: smoke that is real gas in the sim, a hologram that takes
// the enemy's fire, mines, tasers, a hacked robot at her side, and a single killing blow for whoever never saw her.
import { ST } from '../state.js';
import { R, SMOKE, rgb } from '../world/materials.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { isMetal, zap } from './powers.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { nearestN } from './kitlib.js';
import { ACT } from './xmen.js';
import { TRAITS } from './traits.js';
import { alive, blink, body, circ, cloak, dash, dot, grapple, groundY, hitAround, melee, mouse, paint, puffs, say, shoot, stun, tagd, zone } from './newkit.js';

const BLU = [120, 200, 255], HEX = '#78c8ff', BC = rgb(120, 200, 255), RED = '#ff4a5a', DARK = rgb(34, 34, 44);
const deny = (p, s) => { if (ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; say(p, s, HEX, .7); } };
const grenade = (a, onBoom, c) => shoot({ x: a.h.x, y: a.h.y, vx: a.dx * 5.5, vy: a.dy * 5.5 - 1.6, g: .16, life: 70, r: 2, size: 1, col: c, onHit: s => onBoom(s.x, s.y), onEnd: s => onBoom(s.x, s.y) });
const smoke = (x, y, r) => { paint(x, y, r, SMOKE, { p: .75 }); puffs(x, y, 16, rgb(70, 70, 80), 2, 26); hitAround(x, y, r * 2.4, 1, { stun: 90 }); snd('pop', x, y, { v: .7 }); };

const WIDOW_POWERS = [
 // the gauntlet dart: short range, a jolt and a short stun (and it electrocutes anything wet)
 { n: 'Widow\'s Bite', cost: 4, cd: 9, fn: (a, p) => { shoot({ x: a.h.x, y: a.h.y, vx: a.dx * 10, vy: a.dy * 10, life: 13, dmg: 10, tag: 'shock', col: BC, glow: BC, onHit: (s, e) => { if (e) stun(e, 22); puffs(s.x, s.y, 4, BC, 2, 8, 1); }, trail: s => { if (s.t % 2) puffs(s.x, s.y, 1, BC, .3, 6, 1); } }); p.castF = 8; } },
 // held: two pistols, fast and light
 { n: 'Dual Pistols', cost: .45, fn: (a, p) => { if (ST.frame % 3) return; const an = Math.atan2(a.dy, a.dx) + (R() - .5) * .08; shoot({ x: a.h.x, y: a.h.y + (ST.frame % 6 ? -1 : 1), vx: Math.cos(an) * 11, vy: Math.sin(an) * 11, life: 30, dmg: 5, col: rgb(255, 240, 180), glow: rgb(255, 200, 90) }); if (ST.frame % 6 === 0) snd('pop', p.x, p.y, { v: .35, gap: .03 }); } },
 // optical camouflage for five seconds
 { n: 'Cloak', quiet: true, cost: 14, cd: 60, fn: (a, p) => { cloak(p, 300); say(p, 'CLOAKED', HEX, .8); snd('psi', p.x, p.y, { pitch: 1.4, v: .4 }); } },
 // a canister of real smoke: it drifts, it hides her, and anything standing in it loses its bearings
 { n: 'Smoke Bomb', quiet: true, cost: 12, cd: 40, fn: (a, p) => { grenade(a, (x, y) => { smoke(x, y, 14); cloak(p, 150); }, rgb(60, 60, 70)); p.throwF = 6; } },
 { n: 'Grapple Hook', kind: 'move', fn: (a, p, use) => { if (!use(8)) return; ST.cd = grapple(p, a, 210, [180, 190, 210], [60, 70, 100]) ? 14 : 8; } },
 // four baton strikes in under half a second
 { n: 'Baton Flurry', cost: 10, cd: 26, fn: (a, p) => { let k = 0; ACT.push(() => { if (k % 4 === 0) { melee(p, a, { dmg: 9, r: 12, kx: 1.2, tag: k === 12 ? 'shock' : null }); snd('punch', p.x, p.y, { v: .5, gap: .02 }); } return ++k < 16; }); } },
 // she is on the nearest enemy's shoulders before it turns round: 40, a long stun, and she lands behind it
 { n: 'Thigh Takedown', kind: 'move', fn: (a, p, use) => { const e = nearestEnemy(mouse.wx, mouse.wy, 60) || nearestEnemy(p.x, p.y - ST.PH / 2, 80); if (!e || Math.hypot(e.x - p.x, e.y - p.y) > 150) return deny(p, 'NO TARGET'); if (!use(14)) return; ST.cd = 34;
   const f = e.x < p.x ? -1 : 1; puffs(p.x, p.y - ST.PH / 2, 6, DARK, 1.5, 12); blink(p, e.x + f * (e.def.w / 2 + 6), e.y + e.def.h / 2); p.face = -f; p.vy = -3; p.dodge = 12; hitEnemy(e, 40, f * 3, 3); stun(e, 80); fxWord(e.x, e.y - e.def.h / 2 - 8, 'TAKEDOWN!', 1, HEX, true); snd('slam', e.x, e.y, { size: .4 }); } },
 // one blow at arm's length: 28, or 95 from the cloak
 { n: 'Garrote', quiet: true, fn: (a, p, use) => { const [x, y] = body(p), e = nearestEnemy(x, y, 26); if (!e) return deny(p, 'NO ONE IN REACH'); if (!use(14)) return; ST.cd = 30; const big = p.stealth > 0; p.punchF = 10; p.face = e.x < p.x ? -1 : 1; if (big) p.stealth = 0;
   hitEnemy(e, big ? 95 : 28, 0, -1); stun(e, 40); fxWord(e.x, e.y - e.def.h / 2 - 8, big ? 'SILENCED' : 'HRK!', big ? 1.2 : .8, big ? RED : HEX, true); if (big) ST.hitstop = Math.max(ST.hitstop, 5); } },
 // a mine on the ground at the cursor: it waits fifteen seconds for someone to walk over it
 { n: 'Tripwire Mine', quiet: true, cost: 12, cd: 26, fn: (a, p) => { const x = mouse.wx, y = groundY(x, mouse.wy - 6) - 1; zone({ x, y, r: 15, life: 900, tick: z => { for (const e of enemies) if (e.hp > 0 && Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.def.w / 2) { explode(z.x | 0, z.y | 0, 9, { self: true }); return false; } },
   draw: z => { dot(z.x, z.y, 1, DARK, 0); if ((z.t >> 4) & 1) dot(z.x, z.y - 2, 0, rgb(255, 60, 60), rgb(255, 60, 60)); } }); fxWord(x, y - 8, 'ARMED', .6, RED, true); } },
 // blinds and stuns everything within 90 px of where it lands
 { n: 'Flashbang', cost: 12, cd: 44, fn: (a, p) => { grenade(a, (x, y) => { flash(x, y, 120, [255, 255, 255], 12); rings.push({ x, y, r: 6, vr: 7, life: 14, c: [255, 255, 255] }); hitAround(x, y, 90, 3, { stun: 110 }); fxWord(x, y - 12, 'FLASH!', 1.2, '#ffffff', true); snd('pop', x, y, { v: 1 }); }, rgb(220, 220, 230)); p.throwF = 6; } },
 // a disc that sticks and keeps shocking its host, arcing to whoever stands next to it
 { n: 'Taser Disc', cost: 12, cd: 30, fn: (a, p) => { shoot({ x: a.h.x, y: a.h.y, vx: a.dx * 8, vy: a.dy * 8, life: 60, dmg: 6, tag: 'shock', col: BC, glow: BC, size: 1, onHit: (s, e) => { if (!e) return; let k = 0; ACT.push(() => { if (!alive(e)) return false; if (k % 10 === 0) { tagd('shock', () => hitEnemy(e, 3.5, 0, 0)); stun(e, 6);
     const o = nearestN(e.x, e.y, 54, 1, e)[0]; if (o) { zap(e.x, e.y, o.x, o.y, [220, 240, 255], BLU); tagd('shock', () => hitEnemy(o, 2.5, 0, 0)); } puffs(e.x, e.y, 3, BC, 2, 8, 1); } return ++k < 160; }); } }); p.throwF = 6; } },
 // a hologram of herself: enemies shoot at it while she slips away cloaked
 { n: 'Hologram', quiet: true, cost: 14, cd: 70, fn: (a, p) => { ST.decoy = { x: p.x, y: p.y, hp: 140, max: 140, life: 420, face: p.face, kind: 'holo', spr: ST.CH.spr, pal: ST.CH.pal, c: BLU }; cloak(p, 120); p.vx = -p.face * 3; say(p, 'HOLOGRAM', HEX, .8); } },
 // a low slide through their legs: untouchable, and it trips whatever it passes
 { n: 'Slide', kind: 'move', cost: 8, cd: 20, fn: (a, p) => { dash(p, a.dx < 0 ? -1 : 1, 0, 9, 7, { hit: { r: 10, dmg: 8, stun: 45, ky: -3, kx: 1 }, col: BLU }); p.crouch = 12; } },
 // a machine near the cursor fights for her for ten seconds
 { n: 'Hack', quiet: true, fn: (a, p, use) => { let b = null, bd = 130; for (const e of enemies) { if (e.hp <= 0 || e.ally > 0 || e.def.title || e.def.titan || !isMetal(e)) continue; const d = Math.hypot(e.x - mouse.wx, e.y - mouse.wy); if (d < bd) { bd = d; b = e; } } if (!b) return deny(p, 'NO MACHINE'); if (!use(18)) return; ST.cd = 60;
   b.ally = 600; beams.push({ x0: a.h.x, y0: a.h.y, x1: b.x, y1: b.y, life: 8, w: 0, c: [200, 240, 255], g: BLU, st: 'crisp' }); fxWord(b.x, b.y - b.def.h / 2 - 8, 'HACKED', 1, HEX, true); snd('emp', b.x, b.y, { v: .6 }); } },
 // the ultimate: the lights go out and she is everywhere. Up to eight enemies take 70 each, and she ends it cloaked
 { n: 'Widow\'s Sting', ult: true, cd: 30, fn: (a, p) => { const [x, y] = body(p), L = nearestN(x, y, 420, 8); smoke(x, y, 12); cloak(p, 360); if (!L.length) return; let k = 0, n = 0; p.dodge = L.length * 6 + 20;
   ACT.push(() => { if (k++ % 6) return true; const e = L[n++]; if (!e) return false; if (alive(e)) { const f = e.x < p.x ? -1 : 1; puffs(p.x, p.y - ST.PH / 2, 5, DARK, 1.5, 12); blink(p, e.x - f * 8, e.y + e.def.h / 2); p.face = f; p.punchF = 6; tagd('shock', () => hitEnemy(e, 70, f * 2, -2)); stun(e, 60); circ(e.x, e.y, 10, BC, BC); fxWord(e.x, e.y - 14, 'STING!', .9, HEX, true); snd('zap', e.x, e.y, { v: .6, gap: .03 }); } return n < L.length; }); } },
];

// trait: the first hit out of the cloak. A hit landed while she is cloaked is tripled and ends the cloak; hits on stunned enemies are 30% stronger.
TRAITS.widow = { n: 'Red Room', c: '#78c8ff', d: 'A hit landed from the cloak does triple damage (once per cloak). Hits on stunned enemies are 30% stronger.',
  hud: (T, p) => [p.stealth > 0 ? Math.min(1, p.stealth / 300) : 0, p.stealth > 0 ? 'CLOAKED · NEXT HIT x3' : 'IN THE OPEN'],
  hit(e, d, T, p) { if (p.stealth > 0 && d >= 8 && T.aw <= 0) { p.stealth = 0; fxWord(e.x, e.y - e.def.h / 2 - 16, 'AMBUSH! x3', 1.1, RED, true); return d * 3; } return e.st && e.st.stun > 0 ? d * 1.3 : d; },
  aw: { n: 'Ghost', d: 'She stays cloaked for the whole ten seconds, and every hit is doubled.', tick(p) { cloak(p, 3); }, hit: (e, d) => d * 2 } };

export const CHAR_WIDOW = { id: 'widow', name: 'Black Widow', pw: 7, ph: 19, fly: false, fs: 2.4, boost: 2, run: 2.5, jump: 5.8, hp: 320, armor: .75, glow: BLU, cape: null, ambush: true, thrust: () => rgb(120, 200, 255), powers: WIDOW_POWERS };
