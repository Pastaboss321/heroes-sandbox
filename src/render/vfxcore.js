// Render-only VFX: soft particles (sparks, embers, comic smoke, stars, runes, shards, wisps...) and shaped
// effects (magic circles, slash arcs, lens flares, light pillars, glowing cracks, domes). Nothing here
// touches the world grid; render/vfxdraw.js draws it all. explode() calls vfxBoom and cast() calls
// vfxCast, so every power gets the layers its hero's theme asks for (render/theme.js).
import { ST } from '../state.js';
import { KIND, R, S } from '../world/materials.js';
import { H, W, t } from '../world/grid.js';
import { beams, rings } from './fx.js';
import { SET } from './look.js';
import { STONES, curKey, styleOf, themeOf } from './theme.js';

// ---- particle pool (struct of arrays). Colours are packed 0xRRGGBB.
export const MFX = 6000;
export const fx_ = new Float32Array(MFX), fy_ = new Float32Array(MFX), fvx = new Float32Array(MFX), fvy = new Float32Array(MFX);
export const fs0 = new Float32Array(MFX), fs1 = new Float32Array(MFX), fan = new Float32Array(MFX), fva = new Float32Array(MFX);
export const fl_ = new Int16Array(MFX), fm_ = new Int16Array(MFX), fk_ = new Uint8Array(MFX), ff_ = new Uint8Array(MFX);
export const fc0 = new Uint32Array(MFX), fc1 = new Uint32Array(MFX);
export const V = { n: 0, smoke: 0 };
// kinds
export const K = { SPARK: 0, EMBER: 1, SMOKE: 2, ORB: 3, STAR: 4, GLYPH: 5, SHARD: 6, MOTE: 7, WISP: 8, RIPPLE: 9, CARD: 10, CRESC: 11, GOO: 12, FLAME: 13, GLINT: 14 };
// flags: gravity, drag, rise, curl (velocity turns by fva each tick), emissive (smoke that glows while hot)
export const GRAV = 1, DRAG = 2, RISE = 4, CURL = 8, EMIS = 16;
export const pk = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
export const mixW = (c, k) => [c[0] + (255 - c[0]) * k | 0, c[1] + (255 - c[1]) * k | 0, c[2] + (255 - c[2]) * k | 0];
export const mul = (c, k) => [Math.min(255, c[0] * k) | 0, Math.min(255, c[1] * k) | 0, Math.min(255, c[2] * k) | 0];
// budgets (phones get about half: window.HS_MOBILE is set by the phone build)
const SOFT = () => (window.HS_MOBILE ? 700 : 1400), SMOKE_CAP = () => (window.HS_MOBILE ? 160 : 300);
export function vp(k, x, y, vx, vy, life, s0, s1, c0, c1, fl = 0, an = 0, va = 0) {
  const soft = SOFT(); if (V.n >= MFX || V.n > soft && R() * (MFX - soft) < V.n - soft) return -1; // past the soft budget new particles thin out smoothly
  if (k === K.SMOKE) { if (V.smoke >= SMOKE_CAP()) return -1; V.smoke++; }
  const n = V.n++;
  fx_[n] = x; fy_[n] = y; fvx[n] = vx; fvy[n] = vy; fl_[n] = fm_[n] = Math.max(1, life | 0); fs0[n] = s0; fs1[n] = s1;
  fc0[n] = c0; fc1[n] = c1; fk_[n] = k; ff_[n] = fl; fan[n] = an; fva[n] = va;
  return n;
}
function kill(n) {
  if (fk_[n] === K.SMOKE) V.smoke--;
  const m = --V.n;
  fx_[n] = fx_[m]; fy_[n] = fy_[m]; fvx[n] = fvx[m]; fvy[n] = fvy[m]; fl_[n] = fl_[m]; fm_[n] = fm_[m]; fs0[n] = fs0[m]; fs1[n] = fs1[m];
  fc0[n] = fc0[m]; fc1[n] = fc1[m]; fk_[n] = fk_[m]; ff_[n] = ff_[m]; fan[n] = fan[m]; fva[n] = fva[m];
}

// ---- shaped effects: {k, x, y, life, max, age, ...}; follow() keeps one glued to the hero or the hand
export const fxo = [];
const add = (o) => { if (fxo.length > 90) fxo.shift(); o.max = o.life; o.age = 0; fxo.push(o); return o; };
// magic circle. kind: rune | octagram | mandala | hexagram | norse | thorn | tech | rings
export const fxSigil = (x, y, r, c, o = {}) => add({ k: 'sigil', x, y, r, c, life: o.life || 18, kind: o.kind || 'rune', spin: o.spin ?? .1, rot: R() * 6.28, sq: o.sq || 1, follow: o.follow, c2: o.c2 });
// crescent swept around (x,y) at angle ang. blunt = a wide smear (punches), dir = sweep direction
export const fxSlash = (x, y, ang, r, c, o = {}) => add({ k: 'slash', x, y, ang, r, c, life: o.life || 7, span: o.span || 2.3, th: o.th || 4, dir: o.dir || 1, blunt: !!o.blunt, follow: o.follow });
// star-shaped lens flare: n spikes (0 = round)
export const fxFlare = (x, y, r, c, o = {}) => add({ k: 'flare', x, y, r, c, life: o.life || 8, n: o.n ?? 4, rot: o.rot ?? (o.n === 2 ? 0 : R() * 3), follow: o.follow });
// column of light from y0 up/down to y1
export const fxPillar = (x, y0, y1, w, c, o = {}) => add({ k: 'pillar', x, y0, y1, w, c, life: o.life || 12, flat: !!o.flat }); // flat: no white core, little glow (side-by-side bands)
// glowing cracks spreading over the ground from (x,y)
export function fxCrack(x, y, r, c, o = {}) {
  const arms = [];
  for (let a = 0, n = o.n || 6; a < n; a++) { const pts = [[x, y]]; let px = x, py = y, an = (a / n) * Math.PI + (R() - .5) * .5 + (o.up ? Math.PI : 0); const ux = o.dir ? o.dir * (.7 + R() * .3) : Math.cos(an) * (R() < .5 ? -1 : 1); // dir: every arm runs one way along the ground
    for (let s = 0, m = 3 + R() * 3 | 0; s < m; s++) { px += ux * (r / m) * (.7 + R() * .6); py += (R() - .5) * 3; const gy = groundY(px, py - 4, 10); if (gy != null) py = gy; pts.push([px, py]); }
    arms.push(pts); }
  return add({ k: 'crack', x, y, c, arms, life: o.life || 40 });
}
// arcs racing outward in a cone (roars, psychic waves, sonic blasts)
export const fxCone = (x, y, ang, span, r1, c, o = {}) => add({ k: 'cone', x, y, ang, span, r1, c, life: o.life || 14, n: o.n || 3, follow: o.follow });
// a black hole: dark core, bright tilted accretion ring
export const fxHole = (x, y, r, c, o = {}) => add({ k: 'hole', x, y, r, c, life: o.life || 60, follow: o.follow });
// eclipse: a black disc with a ragged silver corona
export const fxEclipse = (x, y, r, c, o = {}) => add({ k: 'eclipse', x, y, r, c, life: o.life || 60 });
// digital glitch: offset RGB blocks around a point (Miles)
export const fxGlitch = (x, y, r, o = {}) => add({ k: 'glitch', x, y, r, c: [255, 255, 255], life: o.life || 10 });
// translucent dome (wards, force fields): hex = hex-cell pattern
export const fxDome = (x, y, r, c, o = {}) => add({ k: 'dome', x, y, r, c, life: o.life || 20, hex: !!o.hex, runes: !!o.runes, follow: o.follow });
// jagged lightning with forks, drawn by the beam renderer for a few frames
export function fxBolt(x0, y0, x1, y1, c, g, o = {}) {
  const pts = [[x0, y0], [x1, y1]], d = Math.hypot(x1 - x0, y1 - y0);
  for (let lvl = 0, dev = d * .22; lvl < 4 && pts.length < 40; lvl++, dev *= .55) {
    for (let k = pts.length - 1; k > 0; k--) { const a = pts[k - 1], b = pts[k], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, off = (R() - .5) * 2 * dev;
      pts.splice(k, 0, [(a[0] + b[0]) / 2 - dy / L * off, (a[1] + b[1]) / 2 + dx / L * off]); } }
  const life = o.life || 3, st = o.st || 'zap';
  beams.push({ pts, life, c, g, st, w: o.w || 1 });
  for (let f = 0, n = o.forks ?? 2; f < n; f++) { const s = pts[1 + (R() * (pts.length - 2)) | 0], an = Math.atan2(y1 - y0, x1 - x0) + (R() - .5) * 1.8, L = d * (.15 + R() * .2), fp = [s];
    let fx = s[0], fy = s[1]; for (let k = 0; k < 4; k++) { fx += Math.cos(an) * L / 4 + (R() - .5) * L * .25; fy += Math.sin(an) * L / 4 + (R() - .5) * L * .25; fp.push([fx, fy]); }
    beams.push({ pts: fp, life, c, g, st, w: .5 }); }
  return pts;
}
// screen pulses read by gl.js: a coloured flash and a radial zoom blur
export function screenFlash(c, k) { if (!SET.fx) return; if (k >= (ST.flashK || 0)) { ST.flashC = c; ST.flashK = k; } }
export function zoomPunch(x, y, k) { if (!SET.fx) return; if (k >= (ST.zoomK || 0)) { ST.zoomX = x; ST.zoomY = y; ST.zoomK = k; } }

// a new map or run: drop every effect still in flight
export function clearVfx() { V.n = 0; V.smoke = 0; fxo.length = 0; tasks.length = 0; ST.flashK = 0; ST.zoomK = 0; }
export function groundY(x, y, maxD) { x = x | 0; if (x < 0 || x >= W) return null; for (let yy = Math.max(0, y | 0), y1 = Math.min(H - 1, (y | 0) + maxD); yy < y1; yy++) { const m = t[yy * W + x]; if (m && KIND[m] === S) return yy; } return null; }

// per-tick visual scripts for long effects (return false when done); they run as the hero
export const tasks = [];
export const fxTask = (f) => { if (tasks.length < 60) tasks.push(f); };
export function updVfx() {
  if (tasks.length) { const pc = ST.pctx; ST.pctx = true; for (let n = tasks.length - 1; n >= 0; n--) { let keep = false; try { keep = tasks[n]() !== false; } catch (e) { keep = false; } if (!keep) tasks.splice(n, 1); } ST.pctx = pc; }
  for (let n = 0; n < V.n; n++) {
    if (--fl_[n] <= 0) { kill(n); n--; continue; }
    const f = ff_[n];
    if (f & GRAV) fvy[n] += .12 * (ST.gk || 1);
    if (f & RISE) fvy[n] -= .025;
    if (f & DRAG) { fvx[n] *= .9; fvy[n] *= .9; }
    if (f & CURL) { const c = Math.cos(fva[n]), s = Math.sin(fva[n]), vx = fvx[n]; fvx[n] = vx * c - fvy[n] * s; fvy[n] = vx * s + fvy[n] * c; }
    fan[n] += fva[n];
    fx_[n] += fvx[n]; fy_[n] += fvy[n];
  }
  for (let n = fxo.length - 1; n >= 0; n--) { const o = fxo[n]; o.age++; if (o.follow) { const q = o.follow(); if (q) { o.x = q[0]; o.y = q[1]; } } if (--o.life <= 0) fxo.splice(n, 1); }
  ST.flashK = (ST.flashK || 0) * .82; ST.zoomK = (ST.zoomK || 0) * .8;
}

// ---- spawn helpers used by the styles
const rnd = (a, b) => a + R() * (b - a);
export function sparks(x, y, n, c0, c1, sp = 3, o = {}) { for (let k = 0; k < n; k++) { const a = o.ang != null ? o.ang + (R() - .5) * (o.spread || 1.2) : R() * 6.283, v = sp * (.4 + R() * .8); vp(K.SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v - (o.up || 0), rnd(7, 16), 1, 0, c0, c1, GRAV | (o.drag ? DRAG : 0)); } }
function burstKind(kind, x, y, n, c0, c1, sp, life, fl = DRAG, s = 1) { for (let k = 0; k < n; k++) { const a = R() * 6.283, v = sp * (.3 + R() * .9); vp(kind, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(life * .6, life * 1.3), s, s * .4, c0, c1, fl, R() * 6.28, (R() - .5) * .3); } }
export function puff(x, y, n, r, c0, c1, o = {}) { for (let k = 0; k < n; k++) { const a = R() * 6.283, d = Math.sqrt(R()) * (o.spread ?? r), v = (o.sp ?? .4) * (.4 + R()); const s1 = r * rnd(.6, 1.1);
  vp(K.SMOKE, x + Math.cos(a) * d, y + Math.sin(a) * d * (o.flat || 1), Math.cos(a) * v * (o.vx ?? 1), Math.sin(a) * v * (o.flat || 1) - (o.up ?? .2), rnd(o.life || 30, (o.life || 30) * 1.6), s1 * .4, s1, c0, c1, DRAG | (o.rise === false ? 0 : RISE) | (o.emis ? EMIS : 0)); } }
// jagged loop of magnetic field line from (x,y) bowing out by r
function fieldArc(x, y, r, a, c, g) { const pts = []; for (let k = 0; k <= 10; k++) { const f = k / 10, an = a - .9 + f * 1.8, rr = r * Math.sin(f * Math.PI); pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr]); } beams.push({ pts, life: 5, c, g, st: 'field', w: .6 }); }

// ---- explosions: every explode() gets a comic fireball, sparks, a flare and its style's extra layer
// blasts stacked on one spot (homing volleys, chain reactions) share one set of extras instead of piling up into a white blob
const recent = [];
function crowd(x, y, r) { let n = 0; for (let i = recent.length - 1; i >= 0; i--) { const q = recent[i]; if (ST.frame - q[2] > 10) { recent.splice(i, 1); continue; } if (Math.abs(q[0] - x) < r + 10 && Math.abs(q[1] - y) < r + 10) n++; }
  recent.push([x, y, ST.frame]); if (recent.length > 48) recent.shift(); return n; }
export function vfxBoom(cx, cy, r, opt = {}) {
  if (r < 2 || !SET.fx && r < 6) return;
  const nb = crowd(cx, cy, r), lone = nb === 0, busy = Math.min(1, 700 / Math.max(700, V.n)); // a screen already full of effects gets lighter blasts
  const key = opt.enemy ? 'foe' : curKey(), Sy = styleOf(key), TH = themeOf(key), boom = Sy.boom;
  const base = opt.green ? [80, 255, 130] : opt.col || [255, 150, 50], fiery = !opt.green && !opt.col, hot = fiery ? [255, 228, 120] : base, big = Math.min(1, r / 16);
  const cool = Sy.smoke, mist = boom === 'frost' || boom === 'bamf' || boom === 'necro' || boom === 'splat' || boom === 'bubble' || boom === 'ripples';
  const q = (opt.quiet ? .5 : 1) / (1 + nb) * busy;
  // fireball: hot puffs that cool into inked smoke
  const np = Math.max(2, Math.min(20, 2 + r * 1.05) * q | 0);
  for (let k = 0; k < np; k++) { const a = R() * 6.283, d = Math.sqrt(R()) * r * .5, v = .2 + R() * .45 * (1 + big), s1 = Math.min(13, r * rnd(.3, .55) + 1.5);
    vp(K.SMOKE, cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - .2 - R() * .3, rnd(22, 40) + r * 1.4, s1 * .35, s1,
      pk(mist ? mixW(cool, .25) : hot), pk(cool), DRAG | RISE | (mist ? 0 : EMIS)); }
  sparks(cx, cy, Math.min(22, 3 + r * 1.2) * q | 0, pk(mixW(base, .45)), pk(base), 2 + r * .25, { up: 1 });
  if (r >= 5 && nb < 2 && fxo.length < 45) fxFlare(cx, cy, r * 1.5, hot, { n: Sy.flare || 4, life: 6 + r * .3 | 0 });
  if (!lone && r < 10 || fxo.length > 60 || V.n > 2400) return; // the first blast here already drew the style layer
  // dust thrown along the ground under the blast
  const gy = groundY(cx, cy - 2, r * 1.4 + 4);
  if (gy != null && r >= 4) { const dc = pk([150, 138, 120]); for (let k = 0, n = Math.min(10, r * .7 * q | 0); k < n; k++) { const s = R() < .5 ? -1 : 1;
    vp(K.SMOKE, cx + s * R() * r * .6, gy - 1, s * rnd(.6, 1.6) * (1 + big), -R() * .25, rnd(26, 50), 1.5, rnd(2.5, 3 + r * .3), dc, pk([110, 104, 96]), DRAG); } }
  const pal = TH.pal;
  switch (boom) {
    case 'sigil': fxSigil(cx, cy, r * 1.25 + 3, base, { kind: TH.sig || 'rune', life: 14 + r | 0, spin: .09 }); burstKind(K.GLYPH, cx, cy, Math.min(8, 2 + r * .4) | 0, pk(hot), pk(base), 1.4, 26); break;
    case 'hexes': for (let k = 0, n = Math.min(12, 3 + r * .6 | 0); k < n; k++) { const a = R() * 6.283, v = 1 + R() * 1.5; vp(K.WISP, cx, cy, Math.cos(a) * v, Math.sin(a) * v, rnd(18, 32), 1.5, .5, pk(hot), pk(base), CURL | DRAG, a, (R() < .5 ? 1 : -1) * rnd(.08, .16)); } break;
    case 'arcs': for (let k = 0, n = Math.min(5, 2 + r / 5 | 0); k < n; k++) { const a = R() * 6.283, d = r * rnd(1.2, 2.2); fxBolt(cx, cy, cx + Math.cos(a) * d, cy + Math.sin(a) * d, mixW(base, .7), base, { life: 3, forks: 1, st: key }); } if (r >= 9) screenFlash(mixW(base, .6), .12 * big); break;
    case 'hexring': rings.push({ x: cx, y: cy, r: r * .4, vr: Math.max(1.4, r * .2), life: 11, c: hot, st: key }); sparks(cx, cy, 8 * q | 0, pk([255, 255, 255]), pk(base), 3.5); break;
    case 'heat': sparks(cx, cy, 10 * q | 0, pk([255, 255, 240]), pk(base), 3); break;
    case 'frost': burstKind(K.SHARD, cx, cy, Math.min(16, 4 + r) | 0, pk([240, 250, 255]), pk([150, 210, 250]), 2.6, 30, GRAV, 2.5); burstKind(K.STAR, cx, cy, 6, pk([255, 255, 255]), pk([160, 220, 255]), 1.2, 22, DRAG, 2); break;
    case 'ripples': case 'bubble': for (let k = 0; k < 2; k++) rings.push({ x: cx, y: cy, r: 2 + k * 3, vr: 1.5 + k * .9 + r * .08, life: 14 + k * 4, c: hot, st: key }); burstKind(K.MOTE, cx, cy, Math.min(14, 4 + r * .6) | 0, pk(hot), pk(base), 1.8, 24); break;
    case 'fire': for (let k = 0, n = Math.min(10, 2 + r * .5 | 0); k < n; k++) vp(K.EMBER, cx + (R() - .5) * r, cy + (R() - .5) * r, (R() - .5) * 1.5, -R() * 2, rnd(30, 60), 1, 1, pk([255, 220, 120]), pk([255, 90, 20]), RISE | DRAG);
      for (let k = 0, n = Math.min(8, r * .5 | 0); k < n; k++) vp(K.FLAME, cx + (R() - .5) * r * .8, cy + (R() - .5) * r * .5, (R() - .5) * .6, -.4 - R() * .6, rnd(12, 22), rnd(2, 2 + r * .25), 0, pk([255, 240, 170]), pk([230, 60, 10]), RISE); break;
    case 'dust': if (gy != null) { fxCrack(cx, gy, r * 2 + 6, base, { life: 34 + r | 0 }); puff(cx, gy - 2, Math.min(10, 3 + r * .5) * q | 0, 3 + r * .3, pk([170, 160, 140]), pk([120, 112, 100]), { flat: .3, sp: 1.6, up: .05, life: 40, rise: false }); } break;
    case 'sparks': sparks(cx, cy, 10 * q | 0, pk([255, 255, 255]), pk(hot), 4); burstKind(K.STAR, cx, cy, 3, pk([255, 255, 255]), pk(hot), 1, 12, DRAG, 2); break;
    case 'kinetic': for (let k = 0, n = Math.min(5, 2 + r / 5 | 0); k < n; k++) { const a = R() * 6.283, d = r * rnd(.8, 1.5); fxBolt(cx, cy, cx + Math.cos(a) * d, cy + Math.sin(a) * d, mixW(base, .6), base, { life: 2, forks: 0, st: key, w: .6 }); } burstKind(K.MOTE, cx, cy, 8, pk(hot), pk(base), 2, 20); break;
    case 'field': for (let k = 0, n = Math.min(6, 2 + r / 4 | 0); k < n; k++) fieldArc(cx, cy, r * rnd(1, 1.8), R() * 6.283, mixW(base, .5), base); burstKind(K.GLINT, cx, cy, 6, pk([255, 255, 255]), pk(base), 2.5, 20, GRAV, 1); break;
    case 'nebula': { const cs = boom === 'nebula' && TH.st === 'infinity' ? STONES : [pal[2], pal[3], base];
      for (let k = 0, n = Math.min(8, 2 + r * .4 | 0); k < n; k++) { const c = cs[k % cs.length]; puff(cx, cy, 1, 3 + r * .35, pk(mixW(c, .3)), pk(mul(c, .3)), { spread: r * .7, sp: .5, emis: true, life: 30 }); }
      burstKind(K.STAR, cx, cy, Math.min(12, 3 + r * .6) | 0, pk([255, 255, 255]), pk(hot), 1.6, 26, DRAG, 2.5); break; }
    case 'nova': burstKind(K.STAR, cx, cy, Math.min(12, 3 + r * .6) | 0, pk([255, 255, 255]), pk(hot), 2, 22, DRAG, 3); rings.push({ x: cx, y: cy, r: 2, vr: 2 + r * .2, life: 12, c: mixW(base, .6), st: key }); break;
    case 'splat': burstKind(K.GOO, cx, cy, Math.min(14, 4 + r * .7) | 0, pk([40, 42, 56]), pk([12, 12, 18]), 3, 40, GRAV, 2); break;
    case 'necro': burstKind(K.WISP, cx, cy, Math.min(12, 3 + r * .6) | 0, pk(pal[1]), pk(pal[2]), 1.6, 26, CURL | DRAG, 1.5); for (let k = 0; k < Math.min(8, 3 + r / 3); k++) { const a = R() * 6.283, L = r * rnd(.8, 1.6); beams.push({ x0: cx, y0: cy, x1: cx + Math.cos(a) * L, y1: cy + Math.sin(a) * L, life: 6, w: 0, c: [200, 255, 210], g: [30, 140, 70], st: 'crisp' }); } break;
    case 'lunar': burstKind(K.CRESC, cx, cy, Math.min(10, 3 + r * .5) | 0, pk([255, 255, 255]), pk([180, 190, 230]), 2.2, 24, DRAG, 2); break;
    case 'rings': rings.push({ x: cx, y: cy, r: 2, vr: 1.8 + r * .15, life: 14, c: pal[1], st: key }, { x: cx, y: cy, r: 4, vr: 1.2 + r * .1, life: 16, c: TH.alt ? TH.alt[1] : pal[2], st: key }); break;
    case 'bamf': puff(cx, cy, Math.min(10, 3 + r * .5) | 0, 3 + r * .35, pk([120, 90, 170]), pk([40, 28, 60]), { spread: r * .6, sp: .8, life: 34 }); sparks(cx, cy, 6, pk([255, 230, 140]), pk([200, 120, 40]), 2); break;
    case 'quantum': rings.push({ x: cx, y: cy, r: r * 2 + 6, vr: -(r * .2 + 1.2), life: 10, c: pal[1], st: key }); burstKind(K.MOTE, cx, cy, 10, pk(pal[1]), pk(TH.alt ? TH.alt[2] : pal[2]), 2, 22); break;
  }
  if (r >= 14 && !opt.quiet) { screenFlash(mixW(base, .5), .1 + big * .12); zoomPunch(cx, cy, .025 + big * .03); }
}

// ---- hits: every hero's blows land in that hero's own way (THEME[id].hit): claws leave crossed slashes, lightning
// forks, ice shatters, magic stamps a sigil, rock throws dust and cracks the ground. FXK sizes all of it.
export const FXK = { hit: 1.3, cast: 1.3, trail: 1 };
const WHITE = pk([255, 255, 255]);
const spokes = (x, y, n, r, c, g) => { for (let k = 0; k < n; k++) { const an = R() * 6.283, L = r * rnd(.9, 1.6); beams.push({ x0: x, y0: y, x1: x + Math.cos(an) * L, y1: y + Math.sin(an) * L, life: 6, w: 0, c, g, st: 'crisp' }); } };
export function vfxHit(x, y, dmg) {
  const key = curKey(), TH = themeOf(key), pal = TH.pal, big = dmg >= 22, r = (3 + Math.min(10, dmg * .24)) * FXK.hit, n = 3 + Math.min(8, dmg / 5) | 0;
  const c0 = pk(pal[0]), c1 = pk(pal[1]), c2 = pk(pal[2]);
  fxFlare(x, y, r, mixW(pal[1], .4), { n: big ? 8 : 4, life: big ? 8 : 5 });
  switch (TH.hit) {
    case 'slash': { const an = R() * 3.14; fxSlash(x, y, an, r * 1.5, mixW(pal[1], .3), { th: 2.5, life: 6, span: 1.4 }); if (big) fxSlash(x, y, an + 1.57, r * 1.5, mixW(pal[1], .3), { th: 2.5, life: 6, span: 1.4, dir: -1 }); sparks(x, y, n, c0, c2, 3); break; }
    case 'arc': for (let k = 0; k < (big ? 4 : 2); k++) { const an = R() * 6.283, L = r * rnd(1, 1.8); fxBolt(x, y, x + Math.cos(an) * L, y + Math.sin(an) * L, pal[0], pal[2], { life: 3, forks: big ? 1 : 0, st: key, w: .5 }); } sparks(x, y, n, c0, c2, 3); break;
    case 'shard': burstKind(K.SHARD, x, y, n + 2, c0, c2, 2.4, 22, GRAV, 2); burstKind(K.STAR, x, y, 2, WHITE, c1, 1, 14, DRAG, 2); break;
    case 'sigil': fxSigil(x, y, r * .9, pal[2], { kind: TH.sig || 'rune', life: 10, spin: .25 }); burstKind(K.GLYPH, x, y, big ? 4 : 2, c1, c2, 1.2, 18); break;
    case 'hex': for (let k = 0; k < n; k++) { const an = R() * 6.283, v = 1 + R() * 1.4; vp(K.WISP, x, y, Math.cos(an) * v, Math.sin(an) * v, rnd(12, 22), 1.4, .4, c1, c2, CURL | DRAG, an, (R() < .5 ? 1 : -1) * .14); } break;
    case 'ember': for (let k = 0; k < n; k++) vp(K.EMBER, x + (R() - .5) * 4, y + (R() - .5) * 4, (R() - .5) * 2, -R() * 2, rnd(18, 34), 1, 1, pk([255, 230, 140]), c2, RISE | DRAG);
      for (let k = 0; k < (big ? 4 : 2); k++) vp(K.FLAME, x + (R() - .5) * 4, y, (R() - .5) * .6, -.5 - R() * .5, rnd(8, 14), rnd(2, 3.5), 0, pk([255, 240, 170]), c2, RISE); break;
    case 'dust': puff(x, y, big ? 4 : 2, 2.5 + r * .2, pk([186, 174, 150]), pk([120, 112, 100]), { sp: 1.2, life: 22 }); sparks(x, y, n, c0, c2, 2.4);
      if (big) { const gy = groundY(x, y, 14); if (gy != null && fxo.length < 50) fxCrack(x, gy, r * 1.6, pal[2], { life: 26 }); } break;
    case 'ring': rings.push({ x, y, r: 1, vr: 1.4 + (big ? .6 : 0), life: 9, c: pal[1], st: key }); if (big) rings.push({ x, y, r: 3, vr: 1, life: 11, c: (TH.alt || pal)[2], st: key }); burstKind(K.MOTE, x, y, n, c0, c2, 1.6, 18); break;
    case 'splat': burstKind(K.GOO, x, y, n + 2, pk([44, 46, 62]), pk([12, 12, 18]), 2.6, 30, GRAV, 2); break;
    case 'glint': burstKind(K.GLINT, x, y, n, WHITE, c1, 2.6, 16, GRAV, 1); sparks(x, y, n, c0, c2, 3.2); break;
    case 'field': for (let k = 0; k < (big ? 3 : 2); k++) fieldArc(x, y, r * rnd(.9, 1.5), R() * 6.283, mixW(pal[1], .5), pal[2]); burstKind(K.GLINT, x, y, n, WHITE, c1, 2.2, 16, GRAV, 1); break;
    case 'beamlet': spokes(x, y, big ? 6 : 3, r * 1.2, [255, 235, 230], pal[2]); sparks(x, y, n, WHITE, c2, 3.4); break;
    case 'starry': burstKind(K.STAR, x, y, n, WHITE, c1, 1.6, 20, DRAG, 2.5); break;
    case 'web': spokes(x, y, big ? 5 : 3, r, [255, 255, 255], [150, 160, 190]); break;
    case 'cresc': burstKind(K.CRESC, x, y, n, WHITE, c2, 2, 20, DRAG, 2); break;
    case 'card': burstKind(K.CARD, x, y, big ? 4 : 2, c0, c2, 2, 26, GRAV, 2); sparks(x, y, n, c0, c2, 2.6); break;
    case 'smoke': puff(x, y, big ? 4 : 2, 3, pk([120, 92, 170]), pk([40, 28, 60]), { sp: .8, life: 24 }); sparks(x, y, 3, pk([255, 236, 150]), pk([220, 140, 40]), 2); break;
    case 'thorn': spokes(x, y, big ? 6 : 4, r, [200, 255, 210], [30, 140, 70]); burstKind(K.WISP, x, y, 3, c1, c2, 1.2, 18, CURL | DRAG, 1.3); break;
    case 'mote': burstKind(K.MOTE, x, y, n + 2, c0, c2, 1.8, 20); rings.push({ x, y, r: 1, vr: 1.2, life: 8, c: pal[1], st: key }); break;
    case 'sand': burstKind(K.SHARD, x, y, n + 3, pk([240, 216, 150]), pk([170, 136, 80]), 2.2, 26, GRAV, 1.2); puff(x, y, 2, 3, pk([226, 204, 150]), pk([150, 124, 80]), { sp: 1, life: 20 }); break;
    case 'water': burstKind(K.GOO, x, y, n + 2, pk([190, 230, 255]), pk([50, 120, 220]), 2.6, 24, GRAV, 1.6); rings.push({ x, y, r: 1, vr: 1.3, life: 8, c: pal[1], st: key }); break;
    default: sparks(x, y, n, c0, c2, 2.6);
  }
  if (big) rings.push({ x, y, r: 2, vr: 1.8, life: 8, c: pal[1], st: key });
}

// ---- trails: what a hero sheds at speed (flight, boosts, dashes, a flat-out run). THEME[id].trail picks the row:
// particle kind, flags, start and end size, life, the two palette colours (negative = a fixed dust / goo / smoke
// pair), and where it leaves the body.
const DUSTC = [pk([176, 164, 140]), pk([120, 112, 100])], GOOC = [pk([44, 46, 62]), pk([12, 12, 18])], BAMFC = [pk([120, 92, 170]), pk([40, 28, 60])];
const TR = {
  jets: [K.FLAME, RISE, 2.8, 0, 12, 0, 2, 'feet'], flame: [K.FLAME, RISE, 3.2, 0, 16, 0, 2, 'body'], stars: [K.STAR, DRAG, 2.2, .8, 20, 0, 1, 'body'], motes: [K.MOTE, DRAG, 1.6, .3, 18, 0, 2, 'body'],
  wisps: [K.WISP, CURL | DRAG, 1.5, .4, 20, 1, 2, 'body'], glyphs: [K.GLYPH, DRAG, 1.6, 1, 22, 1, 2, 'body'], shards: [K.SHARD, GRAV, 2, 1, 20, 0, 2, 'feet'], dust: [K.SMOKE, DRAG, 1.5, 3.5, 24, -1, -1, 'feet'],
  rubble: [K.SHARD, GRAV, 1.6, 1, 22, 2, 3, 'feet'], goo: [K.GOO, GRAV, 1.6, 1, 26, -2, -2, 'body'], smoke: [K.SMOKE, DRAG | RISE, 1.5, 3.5, 24, -3, -3, 'body'], glints: [K.GLINT, DRAG, 1, .6, 14, 0, 1, 'body'],
  cresc: [K.CRESC, DRAG, 2, 1, 18, 0, 2, 'body'], cards: [K.CARD, GRAV, 2, 1.4, 22, 0, 2, 'body'], sparks: [K.SPARK, DRAG, 1, 0, 12, 0, 2, 'body'], embers: [K.EMBER, RISE | DRAG, 1, 1, 30, 0, 2, 'body'],
  ripples: [K.RIPPLE, 0, 2, 7, 14, 1, 1, 'body'], lines: [K.SPARK, DRAG, 1, 0, 9, 0, 1, 'body'], arcs: [K.SPARK, DRAG, 1, 0, 12, 0, 2, 'body'], sand: [K.SHARD, GRAV, 1.2, .8, 22, 1, 2, 'feet'], drops: [K.GOO, GRAV, 1.4, .8, 20, 1, 2, 'body'],
};
export function vfxTrail(p) {
  if (!SET.fx || p.slip || p.blob || ST.GS !== 'play') return;
  const sp = Math.hypot(p.vx, p.vy), fast = p.fly ? sp > 2.3 : Math.abs(p.vx) > 2.5 || p.script > 0 && sp > 2; if (!fast && !(p.boost > 0)) return;
  const key = ST.CH.id, TH = themeOf(key), T = TR[TH.trail]; if (!T) return;
  const every = p.boost > 0 ? 1 : 2; if (ST.frame % every) return;
  const pal = TH.pal, pair = T[5] === -1 ? DUSTC : T[5] === -2 ? GOOC : T[5] === -3 ? BAMFC : null, c0 = pair ? pair[0] : pk(pal[T[5]]), c1 = pair ? pair[1] : pk(pal[T[6]]);
  const d = sp || 1, bx = -p.vx / d, by = -p.vy / d, ph = ST.PH, feet = T[7] === 'feet';
  const x = p.x + bx * 3 + (R() - .5) * (feet ? 5 : 6), y = feet ? p.y - 1 - R() * 2 : p.y - ph * (.25 + R() * .55);
  if (TH.trail === 'lines') { beams.push({ x0: x, y0: y, x1: x + bx * (6 + sp * 2), y1: y + by * (6 + sp * 2), life: 4, w: 0, c: mixW(pal[1], .4), g: pal[2], st: 'crisp' }); return; }
  for (let k = 0, n = (p.boost > 0 ? 2 : 1) * FXK.trail; k < n; k++) vp(T[0], x, y, bx * (.4 + R() * .6) + (R() - .5) * .5, by * (.4 + R() * .6) + (R() - .5) * .5, rnd(T[4] * .7, T[4] * 1.3), T[2], T[3], c0, c1, T[1], R() * 6.28, (R() - .5) * .3);
  if (TH.trail === 'arcs' && ST.frame % 4 === 0) { const an = R() * 6.283, L = rnd(4, 9); fxBolt(x, y, x + Math.cos(an) * L, y + Math.sin(an) * L, pal[0], pal[2], { life: 2, forks: 0, st: key, w: .5 }); }
}

// ---- the default signature: a power with no bespoke effect in heroes/sigfx.js still signs its cast in the hero's
// language. The hero's emblem turns once around the body (a sigil for those who have one, nested rings otherwise),
// sized by how heavy the power is, and the hero's own particles lift off it.
export function vfxSign(pw, a, p, weight) {
  const key = ST.CH.id, TH = themeOf(key), pal = TH.pal, r = 10 + Math.min(16, weight * .22), body = () => [p.x, p.y - ST.PH / 2], T = TR[TH.trail];
  if (fxo.length < 50) fxSigil(p.x, p.y - ST.PH / 2, r, pal[2], { kind: TH.sig || 'rings', life: 16 + (weight * .15 | 0), spin: .12, follow: body, c2: pal[1] });
  if (T && T[5] >= 0) for (let k = 0, n = Math.min(10, 3 + weight * .1 | 0); k < n; k++) { const an = R() * 6.283; vp(T[0], p.x + Math.cos(an) * r, p.y - ST.PH / 2 + Math.sin(an) * r, Math.cos(an) * .5, Math.sin(an) * .5 - .3, rnd(T[4] * .7, T[4] * 1.3), T[2], T[3], pk(pal[T[5]]), pk(pal[T[6]]), T[1], an, .2); }
}

// ---- cast flourish: the hand flares in the hero's style when a power fires; a held power trickles motes
let lastCast = -99, lastPw = null;
const SHARP = /claw|slash|katana|blade|sword|sabre|saber|cleave|swipe|talon|snikt|whip|lash|cutter|necrosword|dagger|edge/i;
const BLUNT = /punch|haymaker|clobber|bash|uppercut|pummel|kick|fist|palm|flurry|truncheon|combo|staff|smash/i;
export function vfxCast(pw, a, p, handFn) {
  const key = ST.CH.id, TH = themeOf(key), Sy = styleOf(key), fresh = ST.frame - lastCast > 8 || lastPw !== pw;
  lastCast = ST.frame; lastPw = pw;
  const h = a.h, ang = Math.atan2(a.dy, a.dx), pal = TH.pal, c = pal[1], b = pal[2];
  let col = b;
  if (Sy.cast === 'stone') { const i = ['Power', 'Space', 'Reality', 'Soul', 'Time', 'Mind'].findIndex((s) => pw.n.includes(s)); col = STONES[i >= 0 ? i : (ST.frame >> 3) % 6]; }
  const atHand = () => { const q = handFn(); return [q.x, q.y]; }, atBody = () => [p.x, p.y - ST.PH / 2];
  if (!fresh) { if (ST.frame % 2 === 0) vp(K.MOTE, h.x + (R() - .5) * 5, h.y + (R() - .5) * 5, (R() - .5) * .5 - a.dx * .3, (R() - .5) * .5 - a.dy * .3 - .1, rnd(8, 14), 1.4, .3, pk(mixW(col, .4)), pk(col), DRAG); return; }
  fxFlare(h.x, h.y, 6 * FXK.cast, mixW(col, .3), { n: Sy.flare || 0, life: 7, follow: atHand });
  switch (Sy.cast) {
    case 'sigil': fxSigil(h.x, h.y, 8, b, { kind: TH.sig || 'rune', life: 20, spin: .16, follow: atHand }); burstKind(K.GLYPH, h.x, h.y, 3, pk(c), pk(b), 1, 20); break;
    case 'hex': for (let k = 0; k < 6; k++) { const an = k / 6 * 6.283; vp(K.WISP, h.x, h.y, Math.cos(an) * 1.4, Math.sin(an) * 1.4, rnd(14, 22), 1.4, .4, pk(c), pk(b), CURL | DRAG, an, .14); } fxSigil(h.x, h.y, 7, b, { kind: 'hexagram', life: 14, spin: -.2, follow: atHand }); break;
    case 'crackle': for (let k = 0; k < 3; k++) { const an = R() * 6.283, L = rnd(6, 12); fxBolt(h.x, h.y, h.x + Math.cos(an) * L, h.y + Math.sin(an) * L, pal[0], b, { life: 2, forks: 0, st: key, w: .5 }); } break;
    case 'ringflare': rings.push({ x: h.x, y: h.y, r: 2, vr: 1.2, life: 8, c, st: key }); fxFlare(h.x, h.y, 10, c, { n: 2, life: 6, rot: 0 }); break;
    case 'glare': fxFlare(p.x + p.face * 2, p.y - ST.PH + 4, 14, c, { n: 2, life: 7, rot: 0, follow: () => [p.x + p.face * 2, p.y - ST.PH + 4] }); break;
    case 'frost': puff(h.x, h.y, 3, 2.5, pk([235, 248, 255]), pk([190, 225, 245]), { sp: .7, life: 18, up: .05 }); burstKind(K.SHARD, h.x, h.y, 4, pk([240, 250, 255]), pk(b), 1.6, 18, DRAG, 2); break;
    case 'ripple': rings.push({ x: p.x, y: p.y - ST.PH + 3, r: 2, vr: 1.4, life: 10, c, st: key }, { x: h.x, y: h.y, r: 1, vr: 1.1, life: 9, c, st: key }); break;
    case 'flame': for (let k = 0; k < 5; k++) vp(K.FLAME, h.x + (R() - .5) * 3, h.y, a.dx * 1.2 + (R() - .5) * .6, a.dy * 1.2 - .5, rnd(8, 14), rnd(1.5, 3), 0, pk([255, 240, 170]), pk(b), RISE); break;
    case 'dust': puff(p.x, p.y - 1, 3, 3, pk([170, 160, 140]), pk([120, 112, 100]), { flat: .3, sp: 1.2, up: 0, life: 24, rise: false }); break;
    case 'kinetic': for (let k = 0; k < 2; k++) { const an = R() * 6.283, L = rnd(5, 9); fxBolt(h.x, h.y, h.x + Math.cos(an) * L, h.y + Math.sin(an) * L, pal[0], b, { life: 2, forks: 0, st: key, w: .5 }); } burstKind(K.MOTE, h.x, h.y, 4, pk(c), pk(b), 1.2, 14); break;
    case 'field': for (let k = 0; k < 2; k++) fieldArc(h.x, h.y, rnd(6, 10), R() * 6.283, c, b); break;
    case 'starburst': burstKind(K.STAR, h.x, h.y, 4, pk([255, 255, 255]), pk(c), 1.2, 16, DRAG, 2); fxFlare(h.x, h.y, 10, c, { n: 4, life: 7 }); break;
    case 'stone': fxFlare(h.x, h.y, 12, col, { n: 6, life: 9, follow: atHand }); burstKind(K.STAR, h.x, h.y, 4, pk(mixW(col, .6)), pk(col), 1.3, 16, DRAG, 2); break;
    case 'goo': burstKind(K.GOO, h.x, h.y, 4, pk([40, 42, 56]), pk([12, 12, 18]), 1.6, 20, GRAV, 1.5); break;
    case 'necro': burstKind(K.WISP, h.x, h.y, 5, pk(pal[1]), pk(pal[3]), 1.2, 18, CURL | DRAG, 1.3); fxSigil(h.x, h.y, 7, pal[2], { kind: 'thorn', life: 14, spin: .12, follow: atHand }); break;
    case 'crescent': burstKind(K.CRESC, h.x, h.y, 3, pk([255, 255, 255]), pk(b), 1.2, 16, DRAG, 2); break;
    case 'rings': rings.push({ x: h.x, y: h.y, r: 2, vr: 1.2, life: 9, c: pal[1], st: key }, { x: h.x, y: h.y, r: 4, vr: .8, life: 10, c: (TH.alt || pal)[1], st: key }); break;
    case 'bamf': puff(p.x, p.y - ST.PH / 2, 3, 3, pk([110, 80, 160]), pk([40, 28, 60]), { sp: .6, life: 18 }); break;
    case 'muzzle': fxFlare(h.x + a.dx * 3, h.y + a.dy * 3, 9, [255, 230, 160], { n: 2, life: 4, rot: ang }); sparks(h.x, h.y, 4, pk([255, 250, 200]), pk([255, 160, 60]), 3, { ang, spread: .7 }); break;
    case 'quantum': rings.push({ x: h.x, y: h.y, r: 9, vr: -1.1, life: 7, c: pal[1], st: key }); break;
    case 'glint': burstKind(K.STAR, h.x, h.y, 2, pk([255, 255, 255]), pk(c), .8, 12, DRAG, 2); break;
  }
  // melee: a slash arc for blades and claws, a smear for punches and kicks
  if (SHARP.test(pw.n)) fxSlash(p.x, p.y - ST.PH / 2, ang, 15, mixW(col, .2), { dir: p.face, th: 3.5, follow: atBody });
  else if (BLUNT.test(pw.n)) fxSlash(p.x, p.y - ST.PH / 2, ang, 11, mixW(col, .3), { dir: p.face, blunt: true, th: 5, span: 1.5, life: 6, follow: atBody });
  if (pw.ult) { fxSigil(p.x, p.y - ST.PH / 2, 34, b, { kind: TH.sig || (Sy.cast === 'sigil' ? 'rune' : 'rings'), life: 60, spin: .05, follow: atBody, c2: c }); screenFlash(mixW(col, .4), .28); zoomPunch(p.x, p.y - ST.PH / 2, .06); }
}
