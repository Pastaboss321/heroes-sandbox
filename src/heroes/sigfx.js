// Signature visuals: each hero's showpiece powers get effects only they have (magic circles, phoenix
// fire, rainbow bridges, black holes, BAMF smoke...). SIG[heroId][powerName] is the effect; heroes/kit.js looks it
// up once per power (sigOf) and plays it after a cast that really fired. Power logic never lives here.
import { ST } from '../state.js';
import { R } from '../world/materials.js';
import { beams, rings } from '../render/fx.js';
import { CURL, DRAG, GRAV, K, RISE, fxBolt, fxCone, fxCrack, fxDome, fxEclipse, fxFlare, fxGlitch, fxHole, fxPillar, fxSigil, fxSlash, fxTask, mixW, pk, puff, screenFlash, sparks, vp, zoomPunch } from '../render/vfxcore.js';
import { STONES } from '../render/theme.js';
import { enemies } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { portals } from './wave2.js';
import { shots } from './powers.js';

const rnd = (a, b) => a + R() * (b - a);
const body = (p) => () => [p.x, p.y - ST.PH / 2];
// flames licking up along a wing curve (Phoenix, Firebird)
function wingFlames(cx, cy, sc, n) { for (let k = 0; k < n; k++) { const u = R() * 2 - 1, s = Math.sign(u) || 1, t = Math.abs(u), wx = s * t * sc * 1.6, wy = -Math.sin(t * 3.1) * sc * .55 + t * sc * .2;
  vp(K.FLAME, cx + wx, cy + wy, s * .3, -.5, rnd(10, 18), rnd(1.5, 3.2) * (1.2 - t * .6), 0, pk([255, 240, 170]), pk([230, 60, 10]), RISE); } }
function bamf(x, y, big = 1) { puff(x, y, 5 * big | 0, 3.5 * big, pk([120, 92, 170]), pk([36, 26, 56]), { sp: .9, life: 30, spread: 4 * big }); sparks(x, y, 4, pk([255, 236, 150]), pk([220, 140, 40]), 2); }
function wisps(x, y, n, c0, c1, sp = 1.6) { for (let k = 0; k < n; k++) { const a = R() * 6.283, v = sp * (.5 + R()); vp(K.WISP, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(16, 28), 1.5, .4, pk(c0), pk(c1), CURL | DRAG, a, (R() < .5 ? 1 : -1) * rnd(.08, .16)); } }
function stars(x, y, n, c, sp = 1.5, r = 0) { for (let k = 0; k < n; k++) { const a = R() * 6.283, d = R() * r, v = sp * R(); vp(K.STAR, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v, rnd(14, 26), 2, 0, pk([255, 255, 255]), pk(c), DRAG); } }
// keep an effect going for n ticks: f(k) each tick
const loop = (n, f) => { let k = 0; fxTask(() => { f(k); return ++k < n; }); };

// SIG[hero][power] = (c) => {...}; c: a, p, mx, my (cursor at cast), hx, hy (hand), ang (aim), ox, oy (hero before the cast), fresh
// SIG options: st = restyle the beams and rings the power made; every = run on every tick of a held power, not just its first
const SIG = {
  doom: {
    'Octessence Sigil': (c) => { const gy = groundBelow(c.mx | 0, c.my), r = 50 * ST.aoeC; fxSigil(c.mx, gy, r, [80, 255, 130], { kind: 'octagram', life: 120, sq: .32, spin: .04 }); loop(70, (k) => { if (k === 49) { for (let i = 0; i < 5; i++) fxPillar(c.mx + (i - 2) * r * .4, gy, gy - 60, 2, [90, 255, 140], { life: 30 }); screenFlash([80, 255, 130], .12); } }); },
    'Gravity Well': (c) => fxSigil(c.mx, c.my, 54, [60, 255, 110], { kind: 'octagram', life: 340, spin: -.05 }),
    'Temporal Restoration': (c) => fxSigil(c.mx, c.my, 46 * ST.aoeC, [130, 255, 170], { kind: 'clock', life: 100, spin: .03 }),
    'Orbital Strike': (c) => fxSigil(c.mx, groundBelow(c.mx | 0, c.my), 26, [90, 255, 140], { kind: 'tech', sq: .35, life: 80, spin: .1 }),
    'Timeslip': (c) => fxSigil(c.ox, c.oy - ST.PH / 2, 14, [120, 255, 160], { kind: 'clock', life: 30, spin: -.2 }),
  },
  hulk: {
    'Thunderclap': (c) => { fxCone(c.hx, c.hy, c.ang, 1.2, 110, [225, 255, 205], { life: 16, n: 4 }); puff(c.hx + Math.cos(c.ang) * 20, c.hy, 6, 4, pk([180, 170, 150]), pk([130, 122, 108]), { sp: 2, life: 34, rise: false }); },
    'Gamma Roar': (c) => fxCone(c.hx, c.hy - 6, c.ang, 1.4, 125, [170, 255, 110], { life: 22, n: 5 }),
    'Worldbreaker': (c) => { screenFlash([140, 255, 90], .22); zoomPunch(c.p.x, c.p.y - ST.PH / 2, .05); },
    'Fault Line': (c) => fxCrack(c.p.x + Math.sign(Math.cos(c.ang) || 1) * 8, c.p.y, 120, [170, 255, 110], { dir: Math.sign(Math.cos(c.ang) || 1), n: 3, life: 60 }),
    'Fault Fissure': (c) => fxCrack(c.p.x + Math.sign(Math.cos(c.ang) || 1) * 8, c.p.y, 120, [170, 255, 110], { dir: Math.sign(Math.cos(c.ang) || 1), n: 3, life: 60 }),
  },
  thor: {
    'Lightning Dome': (c) => fxDome(c.p.x, c.p.y - ST.PH / 2, 34 * ST.aoeC, [150, 190, 255], { life: 240, follow: body(c.p) }),
    'Thunder Anvil': (c) => fxSigil(c.mx, groundBelow(c.mx | 0, c.my), 70 * ST.aoeC, [140, 180, 255], { kind: 'norse', sq: .3, life: 300, spin: .03 }),
    'Bifrost': { st: 'band', f: (c) => { const RB = [[255, 70, 70], [255, 170, 60], [255, 240, 80], [90, 240, 110], [80, 170, 255], [170, 100, 255]];
      RB.forEach((col, k) => { fxPillar(c.ox + (k - 2.5) * 2, c.oy - ST.PH / 2, ST.camY - 10, .6, col, { life: 16, flat: true }); fxPillar(c.p.x + (k - 2.5) * 2, ST.camY - 10, c.p.y, .6, col, { life: 18, flat: true }); });
      fxSigil(c.p.x, c.p.y, 22, [220, 230, 255], { kind: 'norse', sq: .3, life: 30 }); screenFlash([230, 235, 255], .2); stars(c.p.x, c.p.y - 8, 12, [180, 200, 255], 2, 6); } },
    'Storm Call': (c) => loop(480, (k) => { if (k % 30 === 7 && ST.storm) { const x = ST.storm.x + rnd(-200, 200), y0 = ST.camY - 10; fxBolt(x, y0, x + rnd(-30, 30), y0 + rnd(40, 90), [240, 245, 255], [120, 160, 255], { life: 4, forks: 2 }); } }),
    'Asgardian Uppercut': (c) => { fxSlash(c.p.x, c.p.y - ST.PH / 2, -Math.PI / 2, 15, [200, 220, 255], { dir: c.p.face, blunt: true, th: 5, span: 1.8 }); fxBolt(c.hx, c.hy, c.hx + rnd(-8, 8), c.hy - 50, [240, 245, 255], [120, 160, 255], { life: 4, forks: 1 }); },
    'Stormbreaker': (c) => { const s = shots.find((q) => q.type === 'axe'); if (s) loop(56, () => { if (shots.includes(s) && R() < .4) fxBolt(s.x, s.y, s.x + rnd(-16, 16), s.y + rnd(-16, 16), [230, 240, 255], [120, 170, 255], { life: 2, forks: 0, w: .6 }); }); },
  },
  iron: {
    'EMP Burst': (c) => { const cx = c.p.x, cy = c.p.y - ST.PH / 2; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + R() * .4; fxBolt(cx, cy, cx + Math.cos(a) * rnd(40, 70), cy + Math.sin(a) * rnd(40, 70), [220, 245, 255], [80, 180, 255], { life: 4, forks: 1 }); } fxSigil(cx, cy, 30, [120, 210, 255], { kind: 'tech', life: 22, spin: .2 }); screenFlash([150, 220, 255], .18); },
    'Unibeam': { every: true, f: (c) => fxFlare(c.p.x + c.p.face, c.p.y - ST.PH + 8, 9, [200, 245, 255], { n: 2, life: 3, rot: 0 }) },
    'Stealth Mode': (c) => fxGlitch(c.p.x, c.p.y - ST.PH / 2, 9, { life: 14 }),
    'Proton Cannon': (c) => { screenFlash([180, 230, 255], .2); fxSigil(c.p.x - c.p.face * 2, c.p.y - ST.PH + 3, 12, [140, 220, 255], { kind: 'tech', life: 30, spin: .3 }); },
  },
  wolverine: {
    'Whirlwind': (c) => loop(14, (k) => { if (k % 2 === 0) fxSlash(c.p.x, c.p.y - ST.PH / 2, k * .9, 15, [255, 240, 190], { dir: 1, th: 3.5, life: 6 }); }),
    'Rising Slash': (c) => { fxSlash(c.p.x, c.p.y - ST.PH / 2, -Math.PI / 2, 17, [255, 240, 190], { dir: c.p.face, th: 4, span: 2.8, life: 9, follow: body(c.p) }); sparks(c.p.x, c.p.y - ST.PH, 8, pk([255, 255, 230]), pk([255, 200, 80]), 3); },
    'Snikt Ball': (c) => loop(40, (k) => { if (k % 3 === 0) fxSlash(c.p.x, c.p.y - ST.PH / 2, R() * 6.283, 12, [255, 240, 190], { dir: R() < .5 ? 1 : -1, th: 3, life: 5 }); }),
    'Berserker Rage': (c) => { screenFlash([255, 60, 40], .2); zoomPunch(c.p.x, c.p.y - ST.PH / 2, .04); },
    'Berserker Barrage': (c) => loop(70, (k) => { if (k % 4 === 0) fxSlash(c.p.x, c.p.y - ST.PH / 2, R() * 6.283, 16, [255, 230, 170], { dir: R() < .5 ? 1 : -1, th: 4, life: 6 }); }),
  },
  cyclops: {
    'Optic Cage': (c) => { for (const [dx, dy] of [[-22, -22], [22, -22], [22, 22], [-22, 22]]) fxFlare(c.mx + dx, c.my + dy, 6, [255, 120, 100], { n: 4, life: 120 }); },
    'X-Formation': (c) => fxSigil(c.mx, c.my, 30, [255, 200, 60], { kind: 'x', life: 40, spin: 0 }),
    'Optic Sweep': (c) => fxFlare(c.p.x + c.p.face * 2, c.p.y - ST.PH + 4, 16, [255, 140, 120], { n: 2, life: 20, rot: 0, follow: () => [c.p.x + c.p.face * 2, c.p.y - ST.PH + 4] }),
  },
  iceman: {
    'Frost Nova': (c) => { fxSigil(c.p.x, c.p.y - ST.PH / 2, 52, [190, 235, 255], { kind: 'snowflake', life: 30, spin: .05 }); puff(c.p.x, c.p.y - ST.PH / 2, 10, 5, pk([235, 248, 255]), pk([180, 215, 240]), { spread: 30, sp: 1.2, life: 40 }); },
    'Absolute Zero': (c) => { fxSigil(c.mx, c.my, 40, [200, 240, 255], { kind: 'snowflake', life: 70, spin: .03 }); puff(c.mx, c.my, 12, 5, pk([235, 248, 255]), pk([180, 215, 240]), { spread: 20, sp: .8, life: 60 }); screenFlash([200, 240, 255], .2); },
    'Ice Prison': (c) => fxSigil(c.mx, c.my, 16, [200, 240, 255], { kind: 'snowflake', life: 24, spin: .1 }),
    'Avalanche': (c) => loop(40, (k) => { if (k % 4 === 0) puff(c.p.x + Math.sign(Math.cos(c.ang) || 1) * k * 3, c.p.y - 2, 2, 4, pk([240, 250, 255]), pk([190, 220, 240]), { sp: 1, life: 36, rise: false }); }),
  },
  jean: {
    'Psychic Wave': (c) => fxCone(c.hx, c.hy, c.ang, 1.3, 95, [255, 140, 210], { life: 16, n: 4 }),
    'Phoenix Force': (c) => { screenFlash([255, 150, 50], .3); loop(36, (k) => wingFlames(c.p.x, c.p.y - ST.PH / 2, Math.min(60, k * 2.2), 14)); },
    'Phoenix Wings': (c) => { screenFlash([255, 160, 60], .15); wingFlames(c.p.x, c.p.y - ST.PH / 2, 24, 30); },
    'Stasis Field': (c) => fxSigil(c.mx, c.my, 52, [255, 150, 230], { kind: 'clock', life: 330, spin: .01 }),
    'Levitate Crowd': (c) => loop(60, () => { for (const e of enemies) if (Math.hypot(e.x - c.mx, e.y - c.my) < 90 && R() < .3) vp(K.MOTE, e.x + rnd(-4, 4), e.y + e.def.h / 2, 0, -.8, 14, 1.4, .4, pk([255, 200, 240]), pk([255, 90, 190]), 0); }),
    'Psionic Overload': (c) => fxSigil(c.mx, c.my, 40, [255, 120, 210], { kind: 'rings', life: 24, spin: .15 }),
    'Phoenix Rebirth': (c) => { fxSigil(c.p.x, c.p.y - ST.PH / 2, 22, [255, 170, 60], { kind: 'rune', life: 30, follow: body(c.p) }); wingFlames(c.p.x, c.p.y - ST.PH / 2, 20, 24); },
  },
  wanda: {
    'Hex Storm': (c) => { fxSigil(c.mx, c.my, 34, [255, 60, 130], { kind: 'hexagram', life: 50, spin: .08 }); wisps(c.mx, c.my, 14, [255, 140, 180], [200, 20, 80], 2); },
    'No More': (c) => { fxSigil(c.mx, c.my, 60, [255, 50, 110], { kind: 'hexagram', life: 50, spin: .05 }); screenFlash([255, 40, 100], .35); zoomPunch(c.mx, c.my, .05); },
    'Reality Rupture': (c) => { fxSigil(c.mx, c.my, 30, [255, 60, 130], { kind: 'hexagram', life: 30, spin: -.1 }); wisps(c.mx, c.my, 10, [255, 140, 180], [200, 20, 80]); },
    'Hex Sphere': (c) => fxDome(c.mx, c.my, 26, [255, 70, 140], { life: 300, runes: true }),
    'Gravity Flip': (c) => fxSigil(c.mx, c.my, 70 * ST.aoeC, [255, 60, 130], { kind: 'hexagram', life: 240, spin: .02 }),
    'Conjure Chaos': (c) => wisps(c.mx, c.my, 12, [255, 140, 180], [200, 20, 80], 2),
    'Transmute': (c) => wisps(c.mx, c.my, 8, [255, 140, 180], [200, 20, 80]),
    'Chaos Unleashed': (c) => loop(200, (k) => { if (k % 2 === 0) wisps(c.p.x + rnd(-60, 60), c.p.y - ST.PH / 2 + rnd(-40, 30), 1, [255, 140, 180], [200, 20, 80], 1.2); }),
  },
  strange: {
    'Ward of Vishanti': (c) => { fxDome(c.mx, c.my, 46, [255, 190, 70], { life: 480, runes: true }); fxSigil(c.mx, c.my, 46, [255, 160, 50], { kind: 'mandala', life: 480, spin: .015 }); },
    'Banish': (c) => fxSigil(c.mx, c.my, 50, [255, 190, 70], { kind: 'mandala', life: 26, spin: -.2 }),
    'Seraphim Disc': (c) => fxSigil(c.mx, c.my + 1, 17, [255, 190, 70], { kind: 'mandala', sq: .3, life: 480, spin: .04 }),
    'Mirror Shatter': (c) => fxSigil(c.mx, c.my, 34, [220, 235, 255], { kind: 'mandala', life: 34, spin: .1 }),
    'Mirror Fold': (c) => fxSigil(c.mx, c.my, 30, [255, 210, 120], { kind: 'mandala', life: 20, spin: .2 }),
    'Crimson Crush': (c) => fxSigil(c.mx, c.my, 48, [255, 60, 50], { kind: 'rune', life: 30, spin: -.12 }),
    // sling-ring portals: sparks race around the rim for as long as the portal stays open
    'Portals': (c) => { const P = portals.a && Math.hypot(portals.a.x - c.mx, portals.a.y - c.my) < 2 ? portals.a : portals.b; if (!P) return; const blue = P === portals.a;
      fxTask(() => { if ((portals.a !== P && portals.b !== P) || P.life <= 0) return false; if (ST.frame % 2) return true;
        for (let k = 0; k < 3; k++) { const an = R() * 6.283, x = P.x + Math.cos(an) * P.r, y = P.y + Math.sin(an) * P.r * 1.4; vp(K.SPARK, x, y, -Math.sin(an) * 2.2, Math.cos(an) * 2.2 * 1.4 + .3, rnd(6, 11), 1, 0, pk(blue ? [210, 240, 255] : [255, 240, 190]), pk(blue ? [90, 180, 255] : [255, 150, 40]), GRAV); }
        return true; }); },
  },
  antman: {
    'Quantum Tunnel': (c) => { fxSigil(c.mx, c.my, 46 * ST.aoeC, [150, 220, 255], { kind: 'rings', life: 160, spin: .1, c2: [255, 90, 80] }); loop(160, (k) => { if (k % 3 === 0) { const a = R() * 6.283; vp(K.MOTE, c.mx + Math.cos(a) * 46, c.my + Math.sin(a) * 46, -Math.cos(a) * 2, -Math.sin(a) * 2, 22, 1.5, .3, pk(R() < .5 ? [255, 120, 110] : [130, 200, 255]), pk([90, 40, 160]), 0); } }); },
    'Shrink': (c) => { rings.push({ x: c.p.x, y: c.p.y - 6, r: 14, vr: -1.4, life: 9, c: [255, 120, 110] }, { x: c.p.x, y: c.p.y - 6, r: 10, vr: -1, life: 9, c: [120, 190, 255] }); },
    'Giant-Man': (c) => { rings.push({ x: c.p.x, y: c.p.y - 10, r: 2, vr: 2.4, life: 12, c: [255, 120, 110] }, { x: c.p.x, y: c.p.y - 10, r: 4, vr: 1.8, life: 12, c: [120, 190, 255] }); },
  },
  ultron: {
    'Overload Pulse': (c) => { fxSigil(c.p.x, c.p.y - ST.PH / 2, 34, [255, 70, 50], { kind: 'tech', life: 20, spin: .25 }); for (let k = 0; k < 6; k++) { const a = R() * 6.283; fxBolt(c.p.x, c.p.y - ST.PH / 2, c.p.x + Math.cos(a) * 50, c.p.y - ST.PH / 2 + Math.sin(a) * 50, [255, 220, 210], [255, 50, 40], { life: 3, forks: 1 }); } },
    'Upload': (c) => fxGlitch(c.mx, c.my, 10, { life: 16 }),
    'Assimilate': (c) => fxGlitch(c.mx, c.my, 8, { life: 12 }),
  },
  magneto: {
    'Repulse': (c) => { const cx = c.p.x, cy = c.p.y - ST.PH / 2; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, pts = []; for (let q = 0; q <= 8; q++) { const f = q / 8, an = a + Math.sin(f * 3.14) * .4; pts.push([cx + Math.cos(an) * (8 + f * 60), cy + Math.sin(an) * (8 + f * 60)]); } beams.push({ pts, life: 7, c: [240, 210, 255], g: [170, 90, 240], st: 'field', w: .7 }); } },
    'Magnetic Implosion': (c) => { fxSigil(c.mx, c.my, 44, [200, 130, 255], { kind: 'rings', life: 24, spin: -.2 }); rings.push({ x: c.mx, y: c.my, r: 60, vr: -3.5, life: 16, c: [220, 160, 255] }); },
    'Polarity Reverse': (c) => screenFlash([200, 120, 255], .12),
    'Asteroid M': (c) => screenFlash([200, 140, 255], .2),
  },
  storm: {
    'Fog Bank': (c) => loop(360, (k) => { if (k % 6 === 0) puff(c.mx + rnd(-60, 60), c.my + rnd(-30, 20), 1, rnd(6, 9), pk([216, 224, 232]), pk([170, 180, 194]), { sp: .3, life: 70, spread: 1 }); }),
    'Blizzard': (c) => loop(300, (k) => { for (let q = 0; q < 2; q++) vp(K.STAR, c.mx + rnd(-90, 90), c.my - 70, rnd(-1.4, -.6), rnd(1, 2), 50, 1, 0, pk([255, 255, 255]), pk([190, 225, 255]), 0); }),
    'Eye of the Storm': (c) => { screenFlash([220, 235, 255], .25); loop(200, (k) => { if (k % 14 === 0) { const a = R() * 6.283; fxBolt(c.p.x + Math.cos(a) * 80, ST.camY - 10, c.p.x + Math.cos(a) * 60, c.p.y - 10, [255, 255, 255], [150, 190, 255], { life: 4, forks: 2 }); } }); },
    'Lightning Rider': (c) => loop(30, () => { if (R() < .5) fxBolt(c.p.x, c.p.y - ST.PH / 2, c.p.x + rnd(-20, 20), c.p.y - ST.PH / 2 + rnd(-20, 20), [255, 255, 255], [160, 200, 255], { life: 2, forks: 0, w: .6 }); }),
  },
  venom: {
    'Roar': (c) => fxCone(c.hx, c.hy - 4, c.ang, 1.3, 110, [235, 240, 250], { life: 18, n: 4 }),
  },
  sue: {
    'Crushing Bubble': (c) => fxDome(c.mx, c.my, 24, [140, 210, 255], { life: 40, hex: true }),
    'Force Nova': (c) => { fxDome(c.p.x, c.p.y - ST.PH / 2, 70, [150, 215, 255], { life: 24, hex: true }); screenFlash([170, 220, 255], .2); },
  },
  torch: {
    'Supernova': (c) => { screenFlash([255, 170, 60], .35); zoomPunch(c.p.x, c.p.y - ST.PH / 2, .06); loop(38, (k) => { for (let q = 0; q < 8; q++) { const a = R() * 6.283, d = k * 3 * R(); vp(K.FLAME, c.p.x + Math.cos(a) * d, c.p.y - ST.PH / 2 + Math.sin(a) * d, Math.cos(a) * 1.5, Math.sin(a) * 1.5 - .5, rnd(12, 22), rnd(2, 4), 0, pk([255, 250, 200]), pk([230, 60, 10]), RISE); } }); },
    'Comet Strike': (c) => loop(40, () => { for (let q = 0; q < 2; q++) vp(K.FLAME, c.p.x + rnd(-3, 3), c.p.y - ST.PH / 2 + rnd(-4, 4), rnd(-.4, .4), -.3, 14, rnd(2, 3), 0, pk([255, 250, 200]), pk([230, 60, 10]), RISE); }),
    'Firebird': (c) => loop(30, (k) => wingFlames(c.mx, c.my, 18 + k * .3, 6)),
  },
  panther: {
    'Kinetic Pulse': (c) => { const cx = c.p.x, cy = c.p.y - ST.PH / 2; fxDome(cx, cy, 50, [170, 110, 255], { life: 18, hex: true }); for (let k = 0; k < 7; k++) { const a = R() * 6.283; fxBolt(cx, cy, cx + Math.cos(a) * 55, cy + Math.sin(a) * 55, [240, 220, 255], [150, 80, 255], { life: 3, forks: 1, st: 'panther' }); } screenFlash([170, 110, 255], .15); },
    "Bast's Wrath": (c) => { fxSigil(c.p.x, c.p.y - ST.PH / 2, 40, [170, 110, 255], { kind: 'rune', life: 50, spin: .08, follow: body(c.p) }); screenFlash([160, 100, 255], .25); },
    'Ground Cleave': (c) => fxCrack(c.mx, groundBelow(c.mx | 0, c.my), 60, [190, 140, 255], { n: 4, life: 40 }),
    'Claw Storm': (c) => loop(24, (k) => { if (k % 3 === 0) fxSlash(c.p.x, c.p.y - ST.PH / 2, R() * 6.283, 14, [210, 180, 255], { dir: R() < .5 ? 1 : -1, th: 3, life: 6 }); }),
  },
  cap: {
    'Worthy': (c) => fxBolt(c.p.x + rnd(-10, 10), ST.camY - 10, c.p.x, c.p.y - ST.PH, [240, 245, 255], [120, 160, 255], { life: 6, forks: 2 }),
    'Inspiring Rally': (c) => { rings.push({ x: c.p.x, y: c.p.y - ST.PH / 2, r: 3, vr: 3, life: 18, c: [255, 220, 120] }); stars(c.p.x, c.p.y - ST.PH / 2, 14, [255, 220, 120], 2.2, 6); },
  },
  marvel: {
    'Go Binary': (c) => { screenFlash([255, 210, 110], .25); zoomPunch(c.p.x, c.p.y - ST.PH / 2, .04); },
    'Binary Supernova': (c) => { screenFlash([255, 220, 140], .35); fxSigil(c.p.x, c.p.y - ST.PH / 2, 50, [255, 200, 90], { kind: 'rings', life: 40, spin: .1, c2: [120, 160, 255] }); },
  },
  surfer: {
    'Singularity': (c) => fxHole(c.mx, c.my, 9, [150, 200, 255], { life: 260 }),
    'Sentinel of the Spaceways': (c) => { screenFlash([200, 235, 255], .25); stars(c.p.x, c.p.y - ST.PH / 2, 24, [150, 210, 255], 3, 10); },
    'Cosmic Wave': (c) => stars(c.hx, c.hy, 10, [150, 210, 255], 2.5),
  },
  rider: {
    'Penance Stare': (c) => fxFlare(c.p.x + c.p.face * 2, c.p.y - ST.PH + 4, 14, [255, 150, 40], { n: 4, life: 100, follow: () => [c.p.x + c.p.face * 2, c.p.y - ST.PH + 4] }),
    'Hellfire Wave': (c) => { fxCone(c.hx, c.hy, c.ang, 1.2, 100, [255, 150, 40], { life: 18, n: 4 }); for (let q = 0; q < 14; q++) { const a = c.ang + rnd(-.6, .6), v = rnd(1.5, 3.5); vp(K.FLAME, c.hx, c.hy, Math.cos(a) * v, Math.sin(a) * v - .3, rnd(14, 22), rnd(2, 3.5), 0, pk([255, 240, 170]), pk([220, 50, 10]), RISE); } },
    'Judgement': (c) => { fxPillar(c.mx, c.my + 20, ST.camY - 10, 5, [255, 120, 30], { life: 50 }); screenFlash([255, 120, 40], .3); },
    'Hell Gate': (c) => fxHole(c.mx, c.my, 12, [255, 110, 30], { life: 80 }),
  },
  pool: {
    'Katana Whirlwind': (c) => loop(18, (k) => { if (k % 2 === 0) fxSlash(c.p.x, c.p.y - ST.PH / 2, k * .8, 15, [235, 240, 255], { dir: 1, th: 3, life: 5 }); }),
    'Maximum Effort': (c) => { screenFlash([255, 60, 60], .22); zoomPunch(c.p.x, c.p.y - ST.PH / 2, .05); },
    'Fourth Wall Break': (c) => { for (let k = 0; k < 6; k++) fxGlitch(c.p.x + rnd(-60, 60), c.p.y + rnd(-60, 20), 18, { life: 30 }); screenFlash([255, 255, 255], .25); },
  },
  thanos: {
    'Power Stone': (c) => { fxFlare(c.hx, c.hy, 18, STONES[0], { n: 8, life: 12 }); screenFlash(STONES[0], .15); },
    'Space Stone': (c) => { fxHole(c.ox, c.oy - ST.PH / 2, 7, STONES[1], { life: 24 }); fxSigil(c.p.x, c.p.y - ST.PH / 2, 20, STONES[1], { kind: 'rings', life: 20 }); },
    'Reality Stone': (c) => { wisps(c.mx, c.my, 16, [255, 120, 120], [180, 10, 30], 2); fxGlitch(c.mx, c.my, 14, { life: 14 }); },
    'Soul Stone': (c) => wisps(c.mx, c.my, 14, [255, 210, 120], [220, 110, 20], 1.6),
    'Time Stone': (c) => fxSigil(c.mx, c.my, 36, STONES[4], { kind: 'clock', life: 60, spin: .05 }),
    'Mind Stone': (c) => fxCone(c.hx, c.hy, c.ang, 1, 110, STONES[5], { life: 18, n: 4 }),
    'The Snap': (c) => { screenFlash([255, 210, 110], .22); zoomPunch(c.hx, c.hy, .07); STONES.forEach((s, k) => { const a = k / 6 * 6.283; fxFlare(c.hx + Math.cos(a) * 5, c.hy + Math.sin(a) * 5, 10, s, { n: 4, life: 30 }); }); },
  },
  hela: {
    'Hel Pillar': (c) => fxPillar(c.mx, groundBelow(c.mx | 0, c.my), ST.camY - 10, 4, [60, 220, 110], { life: 60 }),
    'Black Spike Field': (c) => fxSigil(c.mx, groundBelow(c.mx | 0, c.my), 40, [60, 200, 100], { kind: 'thorn', sq: .3, life: 50, spin: .05 }),
    'Death Touch': (c) => wisps(c.mx, c.my, 12, [140, 255, 160], [20, 80, 40], 1.4),
    'Sea of Swords': (c) => screenFlash([60, 200, 100], .2),
  },
  moon: {
    'Eclipse': (c) => fxEclipse(c.mx, c.my, 14, [220, 230, 255], { life: 150 }),
    'Avatar of Khonshu': (c) => { fxSigil(c.p.x, c.p.y - ST.PH / 2, 44, [230, 235, 255], { kind: 'rune', life: 60, spin: .05 }); screenFlash([230, 235, 255], .25); },
  },
  shang: {
    'Ten Rings Unleashed': (c) => { screenFlash([130, 200, 255], .22); fxSigil(c.p.x, c.p.y - ST.PH / 2, 40, [120, 200, 255], { kind: 'rings', life: 50, spin: .12, c2: [255, 200, 80], follow: body(c.p) }); },
    'Ring Prison': (c) => fxSigil(c.mx, c.my, 18, [120, 200, 255], { kind: 'rings', life: 60, spin: .3, c2: [255, 200, 80] }),
  },
  gambit: {
    '52 Pickup': (c) => { for (let k = 0; k < 30; k++) { const a = R() * 6.283, v = rnd(1, 4); vp(K.CARD, c.hx, c.hy, Math.cos(a) * v, Math.sin(a) * v - 1, rnd(30, 50), 1, 0, pk([255, 150, 220]), pk([240, 60, 170]), GRAV, a, rnd(-.4, .4)); } },
    'Staff Spin': (c) => loop(20, (k) => { if (k % 2 === 0) fxSlash(c.p.x, c.p.y - ST.PH / 2, k * .9, 13, [255, 170, 230], { dir: 1, blunt: true, th: 3, life: 5 }); }),
    'Full House': (c) => screenFlash([255, 120, 210], .2),
  },
  kurt: {
    'BAMF': (c) => { bamf(c.ox, c.oy - ST.PH / 2); bamf(c.p.x, c.p.y - ST.PH / 2); },
    'Brimstone Cloud': (c) => loop(240, (k) => { if (k % 8 === 0) puff(c.mx + rnd(-30, 30), c.my + rnd(-14, 14), 1, rnd(5, 8), pk([110, 84, 150]), pk([40, 30, 60]), { sp: .2, life: 60, spread: 1 }); }),
    'Shadow Blend': (c) => bamf(c.p.x, c.p.y - ST.PH / 2, .7),
  },
  quill: {
    'Dance-Off': (c) => loop(120, (k) => { if (k % 10 === 0) { const col = [[255, 80, 160], [80, 200, 255], [255, 230, 80], [140, 255, 120]][(k / 10) % 4]; fxFlare(c.p.x + rnd(-50, 50), c.p.y - rnd(20, 60), 10, col, { n: 4, life: 10 }); } }),
    'The Orb': (c) => { fxFlare(c.hx, c.hy, 16, STONES[0], { n: 8, life: 14 }); screenFlash(STONES[0], .15); },
    'Celestial Light': (c) => { fxPillar(c.mx, c.my + 20, ST.camY - 10, 5, [255, 230, 150], { life: 50 }); screenFlash([255, 230, 150], .3); },
  },
  miles: {
    'Venom Strike': (c) => { for (let k = 0; k < 3; k++) fxBolt(c.hx, c.hy, c.hx + rnd(-12, 12) + Math.cos(c.ang) * 10, c.hy + rnd(-12, 12) + Math.sin(c.ang) * 10, [255, 255, 220], [255, 210, 60], { life: 2, forks: 0, w: .6 }); },
    'Venom Blast': (c) => { for (let k = 0; k < 5; k++) { const a = R() * 6.283; fxBolt(c.hx, c.hy, c.hx + Math.cos(a) * 24, c.hy + Math.sin(a) * 24, [255, 255, 220], [255, 210, 60], { life: 3, forks: 1 }); } },
    'Mega Venom Blast': (c) => { screenFlash([255, 230, 120], .3); for (let k = 0; k < 10; k++) { const a = R() * 6.283; fxBolt(c.p.x, c.p.y - ST.PH / 2, c.p.x + Math.cos(a) * 70, c.p.y - ST.PH / 2 + Math.sin(a) * 70, [255, 255, 220], [255, 210, 60], { life: 4, forks: 2 }); } },
    'Glitch Shift': (c) => { fxGlitch(c.ox, c.oy - ST.PH / 2, 12, { life: 14 }); fxGlitch(c.p.x, c.p.y - ST.PH / 2, 12, { life: 14 }); },
    'Camouflage': (c) => fxGlitch(c.p.x, c.p.y - ST.PH / 2, 9, { life: 12 }),
  },
  // Kang the Conqueror: clock faces, nested time rings and eclipse discs in chrono violet and Damocles gold
  kang: {
    'Chrono Bolt': (c) => fxSigil(c.hx, c.hy, 10, [190, 140, 255], { kind: 'clock', life: 16, spin: .3, follow: () => [c.hx, c.hy] }),
    // the lance: a clock face at the muzzle and rings of time racing down the beam
    'Chronal Lance': { every: true, f: (c) => { fxSigil(c.hx, c.hy, 12, [205, 165, 255], { kind: 'clock', life: 8, spin: .25, follow: () => [c.hx, c.hy] });
      loop(20, (k) => { if (k % 3 === 0) fxSigil(c.hx + c.a.dx * (40 + k * 16), c.hy + c.a.dy * (40 + k * 16), 9, [225, 190, 255], { kind: 'rings', sq: .5, life: 10, spin: .4 }); }); } },
    'Force Cascade': (c) => { screenFlash([200, 160, 255], .14);
      loop(20, (k) => { if (k % 4 === 0) fxSigil(c.hx + Math.cos(c.ang) * (k * 6), c.hy + Math.sin(c.ang) * (k * 6), 14, [205, 165, 255], { kind: 'clock', life: 12, spin: .3 }); }); },
    'Chrono Stasis': (c) => { fxEclipse(c.mx, c.my, 16, [190, 150, 255], { life: 150 }); screenFlash([180, 140, 255], .2); stars(c.mx, c.my, 18, [200, 160, 255], 2, 40); },
    'Time Loop': (c) => { fxSigil(c.mx, c.my, 20, [190, 150, 255], { kind: 'clock', life: 60, spin: .4 }); wisps(c.mx, c.my, 8, [210, 175, 255], [120, 60, 200]); },
    'Entropy Ray': (c) => { loop(40, (k) => { if (k % 4 === 0) { const x = c.hx + (c.mx - c.hx) * (k / 40), y = c.hy + (c.my - c.hy) * (k / 40);
      fxSigil(x, y, 10, [200, 160, 255], { kind: 'clock', life: 12, spin: .3 }); } }); },
    'Chronal Rewind': (c) => { screenFlash([180, 130, 255], .18); fxGlitch(c.ox, c.oy - ST.PH / 2, 14, { life: 22 }); },
    'Temporal Clones': (c) => { for (let k = -1; k <= 1; k++) fxSigil(c.p.x + k * 22, c.p.y - ST.PH / 2, 18, [190, 140, 255], { kind: 'clock', life: 40, spin: k * .08, follow: () => [c.p.x + k * 22, c.p.y - ST.PH / 2] });
      screenFlash([190, 150, 255], .2); loop(30, (k) => { if (k % 2 === 0) vp(K.MOTE, c.p.x + rnd(-30, 30), c.p.y - rnd(4, 30), 0, -.5, 16, 1.6, .5, pk([255, 236, 200]), pk([150, 90, 235]), 0); }); },
    'Damocles Base': (c) => { const gy = groundBelow(c.mx | 0, c.my);
      fxPillar(c.mx, ST.camY - 10, gy, 5, [255, 214, 110], { life: 60, flat: true }); fxSigil(c.mx, gy, 52, [255, 214, 110], { kind: 'clock', sq: .35, life: 70, spin: .08 });
      loop(60, (k) => { if (k % 10 === 0) fxSigil(c.mx, gy, 16 + k * .5, [220, 180, 255], { kind: 'rings', life: 18, spin: .2 }); }); },
    'Chrono Barrage': (c) => { fxSigil(c.hx, c.hy, 16, [205, 165, 255], { kind: 'clock', life: 20, spin: .35 }); stars(c.hx, c.hy, 10, [210, 175, 255], 2.4); },
    'Entropic Nova': (c) => { fxEclipse(c.p.x, c.p.y - ST.PH / 2, 22, [255, 214, 110], { life: 40 });
      loop(24, (k) => { if (k % 4 === 0) fxSigil(c.p.x, c.p.y - ST.PH / 2, 20 + k * 2, [195, 150, 255], { kind: 'clock', life: 20, spin: -.15 }); }); },
    // the ultimate: clock faces open across the whole street while the Dynasty comes down
    'Kang Dynasty': (c) => { screenFlash([255, 214, 110], .35); zoomPunch(c.p.x, c.p.y - ST.PH / 2, .07);
      loop(60, (k) => { if (k % 6 === 0) fxSigil(c.p.x + rnd(-140, 140), c.p.y - ST.PH / 2 + rnd(-70, 60), 22, k % 12 === 0 ? [255, 214, 110] : [195, 150, 255], { kind: 'clock', life: 26, spin: .1 }); }); },
  },
};
// Nightcrawler's chained teleports: smoke wherever he lands for a while after the cast
for (const n of ['BAMF Strike', 'Teleport Drop', 'Chain BAMF', 'BAMF Barrage']) SIG.kurt[n] = (c) => { let lx = c.ox, ly = c.oy; bamf(lx, ly - ST.PH / 2); loop(120, () => { const p = c.p; if (Math.hypot(p.x - lx, p.y - ly) > 18) { bamf(lx, ly - ST.PH / 2, .8); bamf(p.x, p.y - ST.PH / 2, .8); } lx = p.x; ly = p.y; }); };

// the signature effect for one power, or null (heroes/kit.js attaches it once and runs it after a cast that fired)
export function sigOf(id, n) { const d = SIG[id] && SIG[id][n]; if (!d) return null; return typeof d === 'function' ? { f: d, opt: {} } : { f: d.f, opt: d }; }
