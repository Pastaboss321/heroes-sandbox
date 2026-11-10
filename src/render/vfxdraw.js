// Draws render/vfxcore.js effects and the styled versions of beams, rings, flashes and projectiles into
// the CPU frame (buf) and the glow buffer (gbuf: bloom and light spill in gl.js). Energy is layered:
// a white-hot core, an opaque coloured body that reads on any background, and a soft additive halo.
import { ST } from '../state.js';
import { buf, gbuf } from './canvas.js';
import { VH, VW } from '../world/grid.js';
import { SET } from './look.js';
import { styleOf, themeOf } from './theme.js';
import { DRAG, EMIS, GRAV, K, RISE, V, fan, fc0, fc1, fk_, fl_, fm_, fs0, fs1, fvx, fvy, fx_, fxo, fy_, ff_, mixW, pk, sparks, vp } from './vfxcore.js';

// ---- pixel ops on buffer index o
function addO(o, r, g, b) { const c = buf[o], R = (c & 255) + r, G = ((c >> 8) & 255) + g, B = ((c >> 16) & 255) + b; buf[o] = (0xff000000 | ((B > 255 ? 255 : B) << 16) | ((G > 255 ? 255 : G) << 8) | (R > 255 ? 255 : R)) >>> 0; }
function gloO(o, r, g, b) { const c = gbuf[o], R = (c & 255) + r, G = ((c >> 8) & 255) + g, B = ((c >> 16) & 255) + b; gbuf[o] = (0xff000000 | ((B > 255 ? 255 : B) << 16) | ((G > 255 ? 255 : G) << 8) | (R > 255 ? 255 : R)) >>> 0; }
function mixO(o, r, g, b, a) { const c = buf[o], e = 1 - a; buf[o] = (0xff000000 | ((((c >> 16) & 255) * e + b * a) << 16) | ((((c >> 8) & 255) * e + g * a) << 8) | ((c & 255) * e + r * a)) >>> 0; }
const inb = (x, y) => x >= 0 && y >= 0 && x < VW && y < VH;
// screen-space light: k of the colour added to the frame, gk to the glow
function lit(x, y, r, g, b, k, gk) { x = x | 0; y = y | 0; if (!inb(x, y)) return; const o = y * VW + x; if (k > 0) addO(o, r * k, g * k, b * k); if (gk > 0) gloO(o, r * gk, g * gk, b * gk); }
function mixP(x, y, r, g, b, a, gk) { x = x | 0; y = y | 0; if (!inb(x, y)) return; const o = y * VW + x; mixO(o, r, g, b, a); if (gk > 0) gloO(o, r * gk, g * gk, b * gk); }
const ur = (p) => (p >> 16) & 255, ug = (p) => (p >> 8) & 255, ub = (p) => p & 255;
const NZ = new Float32Array(256); for (let i = 0; i < 256; i++) NZ[i] = Math.random();
const nz = (x) => { const i = Math.floor(x), f = x - i, a = NZ[i & 255], b = NZ[(i + 1) & 255]; return a + (b - a) * f * f * (3 - 2 * f); };
const hsh = (a, b) => ((Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0) % 1000 / 1000;

// soft additive disc (screen coords): bright centre falling to nothing at rad
function glowDisc(sx, sy, rad, r, g, b, k, gk) {
  const R0 = Math.ceil(rad), r2 = rad * rad, x0 = Math.max(0, (sx - R0) | 0), x1 = Math.min(VW - 1, (sx + R0) | 0), y0 = Math.max(0, (sy - R0) | 0), y1 = Math.min(VH - 1, (sy + R0) | 0);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + .5 - sx, dy = y + .5 - sy, d2 = dx * dx + dy * dy; if (d2 > r2) continue; let f = 1 - d2 / r2; f *= f; const o = y * VW + x;
    if (k > 0) addO(o, r * f * k, g * f * k, b * f * k); if (gk > 0) gloO(o, r * f * gk, g * f * gk, b * f * gk); }
}
function lineL(x0, y0, x1, y1, r, g, b, k, gk) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const f = n ? i / n : 0; lit(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, r, g, b, k, gk); } }
function circL(sx, sy, rad, r, g, b, k, gk, sq = 1, dash = 0, rot = 0) { const n = Math.max(8, rad * 6.283 | 0); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rot; if (dash && (i % dash) < dash / 2) continue; lit(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad * sq, r, g, b, k, gk); } }

// visits every pixel within hw of the segment once: cb(o, signed distance across, distance along)
function seg(x0, y0, x1, y1, hw, cb) {
  const ax = x0 - ST.CX, ay = y0 - ST.CY, bx = x1 - ST.CX, by = y1 - ST.CY, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  if (Math.max(ax, bx) < -hw || Math.min(ax, bx) > VW + hw || Math.max(ay, by) < -hw || Math.min(ay, by) > VH + hw) return;
  if (L < .01) { for (let y = Math.max(0, ay - hw | 0); y <= Math.min(VH - 1, ay + hw | 0); y++) for (let x = Math.max(0, ax - hw | 0); x <= Math.min(VW - 1, ax + hw | 0); x++) { const d = Math.hypot(x + .5 - ax, y + .5 - ay); if (d <= hw) cb(y * VW + x, d, 0); } return; }
  const ux = dx / L, uy = dy / L, xm = Math.abs(dx) >= Math.abs(dy);
  const lo = xm ? Math.max(0, Math.floor(Math.min(ax, bx) - hw)) : Math.max(0, Math.floor(Math.min(ay, by) - hw));
  const hi = xm ? Math.min(VW - 1, Math.ceil(Math.max(ax, bx) + hw)) : Math.min(VH - 1, Math.ceil(Math.max(ay, by) + hw));
  const sp = hw / Math.abs(xm ? ux : uy) + 1.5;
  for (let m = lo; m <= hi; m++) {
    const c = xm ? ay + dy * ((m + .5 - ax) / dx) : ax + dx * ((m + .5 - ay) / dy);
    const a = Math.max(0, Math.floor(c - sp)), b = Math.min(xm ? VH - 1 : VW - 1, Math.ceil(c + sp));
    for (let q = a; q <= b; q++) {
      const x = xm ? m : q, y = xm ? q : m, px = x + .5 - ax, py = y + .5 - ay, s = px * ux + py * uy;
      if (s < -hw || s > L + hw) continue;
      let d = px * -uy + py * ux;
      if (s < 0) d = Math.hypot(px, py) * (d < 0 ? -1 : 1); else if (s > L) d = Math.hypot(px - dx, py - dy) * (d < 0 ? -1 : 1);
      if (d > hw || d < -hw) continue;
      cb(y * VW + x, d, s < 0 ? 0 : s > L ? L : s);
    }
  }
}

// ---- beams
const GOO_D = (0xff000000 | (20 << 16) | (14 << 8) | 12) >>> 0, GOO_R = (0xff000000 | (200 << 16) | (196 << 8) | 190) >>> 0;
export function drawBeamFx(b) {
  const Sy = styleOf(b.st);
  if (b.pts) { drawRibbon(b, Sy); return; }
  const st = Sy.beam, c = b.c, g = b.g, f = ST.frame, w = b.w || 0, C = mixW(c, .55);
  if (st === 'flat') { seg(b.x0, b.y0, b.x1, b.y1, Math.max(.5, w * .5), (o) => { mixO(o, c[0], c[1], c[2], .9); gloO(o, c[0] * .2, c[1] * .2, c[2] * .2); }); return; }
  const core = w <= 0 ? .55 : .6 + w * .7, body = core + (w <= 0 ? .8 : 1.1 + w * .25), hw = body + 3 + w * .5;
  const L = Math.hypot(b.x1 - b.x0, b.y1 - b.y0), ph = f * 7;
  seg(b.x0, b.y0, b.x1, b.y1, hw + 1, (o, d, s) => {
    let wm = 1;
    switch (st) {
      case 'pulse': { const q = ((s - ph) % 26 + 26) % 26; if (q < 5) wm = 1.35; break; }
      case 'laser': wm = 1 + ((f >> 1) & 1) * .14; break;
      case 'flame': wm = .7 + .6 * nz(s * .21 - f * .45); break;
      case 'ripple': { const q = Math.sin(s * .33 - f * .55); if (q > .55) wm = 1 + (q - .55) * 1.8; break; }
      case 'crystal': { const q = (s * .45 + f * .25) % 4; wm = .75 + Math.abs(q - 2) * .2; break; }
      case 'stars': case 'crackle': wm = .8 + .4 * nz(s * .3 + f * .6); break;
      case 'wisp': wm = .75 + .4 * Math.sin(s * .25 + f * .3); break;
      case 'goo': wm = .8 + .45 * nz(s * .17 - f * .2); break;
    }
    const tp = Math.min(1, .4 + s / 9), cw = core * wm * tp, bw = body * wm * tp, a = d < 0 ? -d : d;
    if (st === 'goo') { if (a <= bw - .8) buf[o] = GOO_D; else if (a <= bw + .2) buf[o] = GOO_R; return; } // black symbiote ribbon with a pale rim
    if (a <= cw) { mixO(o, C[0], C[1], C[2], .95); gloO(o, g[0], g[1], g[2]); }
    else if (a <= bw) { const u = (a - cw) / (bw - cw + .001); mixO(o, c[0] + (g[0] - c[0]) * u, c[1] + (g[1] - c[1]) * u, c[2] + (g[2] - c[2]) * u, .9 - u * .25); gloO(o, g[0] * .8, g[1] * .8, g[2] * .8); }
    else { const u = (a - bw) / (hw + 1 - bw), m = (1 - u) * (1 - u) * .55; addO(o, g[0] * m, g[1] * m, g[2] * m); gloO(o, g[0] * m, g[1] * m, g[2] * m); }
  });
  const ux = (b.x1 - b.x0) / (L || 1), uy = (b.y1 - b.y0) / (L || 1), nx = -uy, ny = ux, X0 = b.x0 - ST.CX, Y0 = b.y0 - ST.CY;
  // strands and sparkle drawn over the body
  if (st === 'rune' || st === 'wisp' || st === 'field' || st === 'arc' || st === 'crackle' || st === 'stars') {
    const cc = mixW(g, .45);
    if (st === 'arc' || st === 'crackle') { let px = X0, py = Y0; for (let s = 6; s < L; s += 6) { const off = (Math.random() - .5) * (body * 2 + 6), qx = X0 + ux * s + nx * off, qy = Y0 + uy * s + ny * off; if (Math.random() < .55) lineL(px, py, qx, qy, cc[0], cc[1], cc[2], .7, .6); px = qx; py = qy; } }
    else for (let s = 2; s < L; s += 1) {
      if (st === 'rune') { if (((s + f) % 7) < 2) continue; for (const sg of [1, -1]) { const off = Math.sin(s * .2 - f * .35) * (body + 2.2) * sg; lit(X0 + ux * s + nx * off, Y0 + uy * s + ny * off, cc[0], cc[1], cc[2], .75, .5); } }
      else if (st === 'wisp') { for (let k = 0; k < 3; k++) { const off = Math.sin(s * (.16 + k * .05) - f * .28 + k * 2.1) * (body + 2.5) * (.6 + .4 * Math.sin(s * .05 + k)); lit(X0 + ux * s + nx * off, Y0 + uy * s + ny * off, cc[0], cc[1], cc[2], .45, .4); } }
      else if (st === 'field') { if (((s + (f >> 1)) % 5) < 2) continue; const bow = body + 2 + 3.5 * Math.abs(Math.sin(s * .11 - f * .12)); for (const sg of [1, -1]) lit(X0 + ux * s + nx * bow * sg, Y0 + uy * s + ny * bow * sg, cc[0], cc[1], cc[2], .6, .45); }
      else if (st === 'stars') { if (hsh(s, f >> 2) < .06) star(X0 + ux * s + nx * (Math.random() - .5) * body * 3, Y0 + uy * s + ny * (Math.random() - .5) * body * 3, 2, 255, 255, 255, .9); }
    }
  }
  // impact flare at the far end, glow at the source
  const E = mixW(g, .3);
  glowDisc(b.x1 - ST.CX, b.y1 - ST.CY, body * 2.6 + 3, E[0], E[1], E[2], .55, .5);
  glowDisc(X0, Y0, body * 1.8 + 1.5, C[0], C[1], C[2], .6, .4);
  if (Sy.flare && w >= 1) { const n = Sy.flare, rl = body * 3.5 + 3, ro = f * .05; for (let k = 0; k < n; k++) { const an = ro + k / n * 6.283; spike(b.x1 - ST.CX, b.y1 - ST.CY, an, rl * (k & 1 && n > 4 ? .55 : 1), C, .8); } }
  // particles shed once per beam object (a held beam makes a new one every tick)
  if (!b.shed && ST.GS === 'play') { b.shed = 1;
    const ex = b.x1, ey = b.y1;
    if (st === 'flame') for (let k = 0; k < 3; k++) { const s = Math.random() * L; vp(K.FLAME, b.x0 + ux * s, b.y0 + uy * s, (Math.random() - .5) * .5, -.3 - Math.random() * .5, 8 + Math.random() * 8, 1.5 + Math.random() * 1.5, 0, pk([255, 240, 170]), pk(g), RISE); }
    if (st === 'crystal' && Math.random() < .6) { const s = Math.random() * L; vp(K.SHARD, b.x0 + ux * s, b.y0 + uy * s, (Math.random() - .5) * 1.2, (Math.random() - .5) * 1.2, 16, 2.5, 1, pk([240, 250, 255]), pk(c), GRAV, Math.random() * 6, .2); }
    if (st === 'stars' && Math.random() < .7) { const s = Math.random() * L; vp(K.STAR, b.x0 + ux * s, b.y0 + uy * s, 0, 0, 14, 2, 0, pk([255, 255, 255]), pk(g), 0); }
    if (st === 'wisp' && Math.random() < .5) { const s = Math.random() * L; vp(K.WISP, b.x0 + ux * s, b.y0 + uy * s, nx * (Math.random() - .5) * 2, ny * (Math.random() - .5) * 2, 16, 1.4, .4, pk(mixW(g, .4)), pk(g), 8 | DRAG, 0, (Math.random() - .5) * .3); }
    if (L > 4 && w >= 1) sparks(ex, ey, 2, pk([255, 255, 240]), pk(g), 2.6, { ang: Math.atan2(-uy, -ux), spread: 2 });
  }
}
// polyline beams: lightning (forked, white-hot) or smooth energy ribbons (whips, tendrils)
function drawRibbon(b, Sy) {
  const st = Sy.beam, pts = b.pts, n = pts.length; if (n < 2) return;
  const elec = st === 'arc' || st === 'crackle' || st === 'pulse' || st === 'laser', base = b.w ?? 1, c = b.c, g = b.g, C = mixW(c, .55);
  let L = 0; for (let k = 1; k < n; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  let s0 = 0;
  for (let k = 1; k < n; k++) {
    const [xa, ya] = pts[k - 1], [xb, yb] = pts[k], sl = Math.hypot(xb - xa, yb - ya), tp = b.taper ? 1 - (s0 / (L || 1)) * .7 : 1;
    const cw = (elec ? .5 : .6) * base * tp, bw = cw + (elec ? .75 : 1) * Math.max(.5, base) * tp, hw = bw + (elec ? 2.4 : 2);
    if (st === 'goo') seg(xa, ya, xb, yb, bw + .3, (o, d) => { const a = d < 0 ? -d : d; buf[o] = a <= bw - .7 ? GOO_D : GOO_R; });
    else seg(xa, ya, xb, yb, hw, (o, d) => { const a = d < 0 ? -d : d;
      if (a <= cw) { mixO(o, C[0], C[1], C[2], .95); gloO(o, g[0], g[1], g[2]); }
      else if (a <= bw) { mixO(o, c[0], c[1], c[2], .85); gloO(o, g[0] * .8, g[1] * .8, g[2] * .8); }
      else { const u = (a - bw) / (hw - bw), m = (1 - u) * (1 - u) * .4; addO(o, g[0] * m, g[1] * m, g[2] * m); gloO(o, g[0] * m, g[1] * m, g[2] * m); } });
    s0 += sl;
  }
  if (st === 'arc' && !b.shed && ST.GS === 'play') { b.shed = 1; const e = pts[n - 1]; if (Math.random() < .5) sparks(e[0], e[1], 2, pk([255, 255, 255]), pk(g), 2.2); }
}
function spike(sx, sy, an, len, C, k) { const ca = Math.cos(an), sa = Math.sin(an); for (let t = 1; t < len; t++) { const f = 1 - t / len, m = f * f * k; lit(sx + ca * t, sy + sa * t, C[0], C[1], C[2], m, m * .7); } }
function star(sx, sy, s, r, g, b, k) { lit(sx, sy, r, g, b, k, k); for (let t = 1; t <= s; t++) { const m = k * (1 - t / (s + 1)); lit(sx + t, sy, r, g, b, m, m); lit(sx - t, sy, r, g, b, m, m); lit(sx, sy + t, r, g, b, m, m); lit(sx, sy - t, r, g, b, m, m); } }

// ---- rings: a thick band with a hot leading edge; the style shapes it (runes, dashes, spikes, dust...)
export function drawRingFx(r, lite) {
  const Sy = styleOf(r.st), st = Sy.ring, a = Math.min(1, r.life / 10), c = r.c, rad = r.r; if (rad < 1) return;
  if (lite) { circL(r.x - ST.CX, r.y - ST.CY, rad, c[0], c[1], c[2], .6 * a, .5 * a, st === 'dust' ? .38 : 1); return; }
  const f = ST.frame, th = Math.min(5.5, 1.4 + Math.abs(r.vr) * .5 + rad * .03), sx = r.x - ST.CX, sy = r.y - ST.CY, C = mixW(c, .6);
  const sq = st === 'dust' ? .38 : 1, amp = st === 'spike' || st === 'thorn' ? 1.5 + rad * .09 : st === 'wisp' ? 1.6 : 0, solid = st === 'dust' || st === 'smoke' || st === 'splat';
  const ink = SET.ink && rad > 6 && !solid && st !== 'wisp', Ro = rad + amp + (ink ? 2 : 1.5), Ri = Math.max(0, rad - th - amp - (st === 'double' ? th + 2 : 0) - 1);
  if (sx + Ro < 0 || sx - Ro > VW || sy + Ro * sq < 0 || sy - Ro * sq > VH) return;
  const angular = st !== 'plain' && st !== 'implode' && st !== 'arc' && st !== 'fire' && st !== 'dust' && st !== 'smoke' && st !== 'splat' && st !== 'field';
  const nd = Math.max(8, rad / 2.5 | 0), dc = solid ? (st === 'splat' ? [16, 14, 20] : st === 'smoke' ? [70, 52, 96] : [176, 164, 140]) : null;
  for (let y = Math.max(0, Math.floor(sy - Ro * sq)); y <= Math.min(VH - 1, Math.ceil(sy + Ro * sq)); y++) {
    const yy = (y + .5 - sy) / sq, ho = Ro * Ro - yy * yy; if (ho < 0) continue; const xo = Math.sqrt(ho), hi = Ri * Ri - yy * yy, xi = hi > 0 ? Math.sqrt(hi) : -1;
    for (let side = 0; side < 2; side++) {
      const xa = side ? Math.max(0, Math.floor(sx + Math.max(0, xi))) : Math.max(0, Math.floor(sx - xo)), xb = side ? Math.min(VW - 1, Math.ceil(sx + xo)) : Math.min(VW - 1, Math.ceil(sx - Math.max(0, xi)));
      for (let x = xa; x <= xb; x++) {
        if (side && xi < 0 && x < sx) continue; // the right half starts at the centre when the inner circle misses this row
        const xx = x + .5 - sx, d = Math.sqrt(xx * xx + yy * yy); let rl = rad;
        let an = 0; if (angular) an = Math.atan2(yy, xx);
        if (st === 'spike' || st === 'thorn') { const q = ((an / 6.283 * 14 + f * .02) % 1 + 1) % 1; rl += amp * (st === 'thorn' ? (q < .25 ? q * 4 : Math.max(0, 1 - (q - .25) * 2)) : 1 - Math.abs(q - .5) * 2); }
        else if (st === 'wisp') rl += amp * Math.sin(an * 5 + f * .25);
        else if (st === 'hex') { const q = ((an + f * .01) % 1.0472 + 1.0472) % 1.0472 - .5236; rl = rad * .9 / Math.cos(q); }
        let u = (rl - d) / th, band = u >= 0 && u <= 1;
        if (!band && st === 'double') { u = (rl - th - 2 - d) / (th * .7); band = u >= 0 && u <= 1; }
        const o = y * VW + x;
        if (!band) { if (ink && u < 0 && u > -1.6 / th - .25) mixO(o, 20, 17, 15, .5 * a); else if (!solid && u < 0 && u > -1.2) { const m = (1 + u / 1.2) * .25 * a; gloO(o, c[0] * m, c[1] * m, c[2] * m); } continue; }
        if (st === 'dash' && ((an / 6.283 * nd + f * .04) % 1 + 1) % 1 > .62) continue;
        if (solid) { mixO(o, dc[0], dc[1], dc[2], a * (1 - u) * .85); continue; }
        if (u < .3) { mixO(o, C[0], C[1], C[2], .92 * a); gloO(o, c[0] * a, c[1] * a, c[2] * a); }
        else { const m = (1 - (u - .3) / .7) * a; mixO(o, c[0], c[1], c[2], .75 * m); gloO(o, c[0] * m * .8, c[1] * m * .8, c[2] * m * .8); }
      }
    }
  }
  if (st === 'rune' && rad > 5) for (let k = 0; k < 12; k++) { const an = k / 12 * 6.283 + f * .03, r0 = rad + 2, r1 = rad + 2 + (k & 1 ? 2 : 4); lineL(sx + Math.cos(an) * r0, sy + Math.sin(an) * r0, sx + Math.cos(an) * r1, sy + Math.sin(an) * r1, C[0], C[1], C[2], .8 * a, .6 * a); }
  if (st === 'stars' && rad > 4) for (let k = 0; k < 6; k++) { const an = k * 1.047 + rad * .05; star(sx + Math.cos(an) * rad, sy + Math.sin(an) * rad, 2, 255, 255, 255, .8 * a); }
  if (!r.shed && ST.GS === 'play') { r.shed = 1;
    if (st === 'dust' && rad < 30) for (let k = 0; k < 4; k++) { const s = Math.random() < .5 ? -1 : 1; vp(K.SMOKE, r.x + s * rad, r.y, s * (.6 + Math.random()), -.1, 26 + Math.random() * 20, 1.5, 3 + Math.random() * 2, pk([176, 164, 140]), pk([130, 122, 108]), DRAG); }
    if (st === 'fire') for (let k = 0; k < 4; k++) { const an = Math.random() * 6.283; vp(K.FLAME, r.x + Math.cos(an) * rad, r.y + Math.sin(an) * rad, Math.cos(an) * r.vr * .4, Math.sin(an) * r.vr * .4 - .4, 12, 2.2, 0, pk([255, 240, 170]), pk(c), RISE); }
    if (st === 'smoke') for (let k = 0; k < 5; k++) { const an = Math.random() * 6.283; vp(K.SMOKE, r.x + Math.cos(an) * rad, r.y + Math.sin(an) * rad, Math.cos(an) * .6, Math.sin(an) * .6, 26, 1.5, 3.5, pk([110, 80, 160]), pk([40, 28, 60]), DRAG); }
  }
}

// ---- flashes: light for the bloom, a hot core in the frame while fresh, spikes for big ones
export function drawFlashFx(fl) {
  const k = fl.life / fl.max, R0 = fl.r, rr = R0 | 0, sx = (fl.x - ST.CX) | 0, sy = (fl.y - ST.CY) | 0, c = fl.c, step = R0 > 16 ? 2 : 1;
  if (sx + rr < 0 || sx - rr >= VW || sy + rr < 0 || sy - rr >= VH) return;
  const ya = Math.max(-rr, -sy - step) & ~1, yb = Math.min(rr, VH - sy), xa = Math.max(-rr, -sx - step) & ~1, xb = Math.min(rr, VW - sx); // only the part on screen (a huge flash once cost seconds)
  for (let y = ya; y <= yb; y += step) for (let x = xa; x <= xb; x += step) { const d = Math.sqrt(x * x + y * y) / R0; if (d >= 1) continue; const s = (1 - d) * (1 - d) * k * .9, r = c[0] * s, g = c[1] * s, b = c[2] * s;
    for (let q = 0; q < step * step; q++) { const X = sx + x + (q % step), Y = sy + y + (q / step | 0); if (inb(X, Y)) gloO(Y * VW + X, r, g, b); } }
  if (k > .5 && R0 >= 8) { const C = mixW(c, .5); glowDisc(fl.x - ST.CX, fl.y - ST.CY, Math.max(1.5, R0 * .16) * (k + .2), C[0], C[1], C[2], .45 * k, 0); }
  const Sy = styleOf(fl.st);
  if (Sy.flare && R0 >= 14 && k > .35) { const n = Sy.flare, C = mixW(c, .55), ro = (fl.x + fl.y) * .1; for (let q = 0; q < n; q++) spike(fl.x - ST.CX, fl.y - ST.CY, ro + q / n * 6.283, R0 * .75 * k * (q & 1 && n > 4 ? .55 : 1), C, .7 * k); }
}

// ---- projectiles (everything but missiles-with-sprites, hammers and bombs, which render.js keeps)
export function drawShotFx(s) {
  const tr = s.tr || (s.tr = []), lt = tr[tr.length - 1];
  if (!lt || lt[0] !== s.x || lt[1] !== s.y) { tr.push([s.x, s.y]); if (tr.length > 9) tr.shift(); }
  const Sy = styleOf(s.st), bst = Sy.beam, type = s.type, f = ST.frame;
  const col = s.col || (type === 'missile' ? [255, 170, 70] : [120, 255, 160]), C = mixW(col, .6), sx = s.x - ST.CX, sy = s.y - ST.CY, sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
  const play = ST.GS === 'play';
  switch (type) {
    case 'missile': { // grey body, a burning tail and comic smoke puffs
      trail(tr, [255, 170, 70], 1, .7); mixP(sx, sy, 220, 220, 228, 1); mixP(sx - ux, sy - uy, 150, 150, 160, 1);
      glowDisc(sx - ux * 2.5, sy - uy * 2.5, 3, 255, 190, 90, .7, .9);
      if (play && f % 2 === 0) vp(K.SMOKE, s.x - ux * 3, s.y - uy * 3, (Math.random() - .5) * .3, -.1, 24 + Math.random() * 14, 1, 2.2 + Math.random(), pk([255, 200, 120]), pk([150, 146, 140]), DRAG | RISE | EMIS);
      return true; }
    case 'web': case 'vweb': { for (let k = 1; k < tr.length; k++) lineMix(tr[k - 1], tr[k], 225, 230, 240, .7); mixP(sx, sy, 255, 255, 255, 1); mixP(sx + 1, sy, 235, 238, 245, 1); mixP(sx, sy + 1, 235, 238, 245, 1); return true; }
    case 'shard': case 'spike': case 'hail': { const L = type === 'hail' ? 2 : 4; trail(tr, col, .6, .35);
      for (let t = -L; t <= 1; t++) { const m = t >= 0 ? 1 : 1 + t / (L + 1) * .5; mixP(sx + ux * t, sy + uy * t, 230 * m + 25, 245 * m + 10, 255, .95, .25); }
      mixP(sx - uy, sy + ux, col[0] * .7, col[1] * .8, col[2], .8); return true; }
    case 'card': { trail(tr, col, .7, .5); const an = f * .5 + s.x * .1, ca = Math.cos(an), sa = Math.sin(an);
      for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 0; b2++) mixP(sx + a2 * ca - b2 * sa, sy + a2 * sa + b2 * ca, 250, 240, 245, 1, .2);
      glowDisc(sx, sy, 4, col[0], col[1], col[2], .5, .9); return true; }
    case 'goo': { for (let k = 1; k < tr.length; k++) lineMix(tr[k - 1], tr[k], 24, 22, 30, .8); for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (x * x + y * y < 2) mixP(sx + x, sy + y, 22, 20, 28, 1); mixP(sx - 1, sy - 1, 210, 210, 220, 1); return true; }
    case 'bullet': { for (let t = 0; t < 5; t++) mixP(sx - ux * t, sy - uy * t, 255, 240 - t * 20, 160 - t * 20, 1 - t * .17, .6); return true; }
    case 'katana': case 'dagger': case 'spear': case 'necro': case 'crescent': {
      trail(tr, col, .7, .6); const L = type === 'spear' ? 6 : type === 'dagger' ? 3 : 5, an = type === 'katana' || type === 'crescent' ? f * .7 : Math.atan2(uy, ux), ca = Math.cos(an), sa = Math.sin(an);
      if (type === 'crescent') { for (let t = 0; t < 7; t++) { const a2 = an + (t - 3) * .38; mixP(sx + Math.cos(a2) * 3, sy + Math.sin(a2) * 3, 245, 248, 255, 1, .5); } }
      else for (let t = -L; t <= L; t++) { const tip = Math.abs(t) > L - 2; mixP(sx + ca * t, sy + sa * t, tip ? C[0] : 225, tip ? C[1] : 232, tip ? C[2] : 245, 1, tip ? .7 : .2); }
      glowDisc(sx, sy, 4, col[0], col[1], col[2], .35, .8); return true; }
  }
  // energy bolt: a tapered glowing trail and an orb with a white-hot heart, plus the style's accent
  const size = Math.min(3.2, 1.3 + (s.boom || 3) * .12 + (type === 'bolt' || type === 'proton' ? .8 : 0));
  trail(tr, col, size * .55, .8);
  glowDisc(sx, sy, size * 2.6 + 1, col[0], col[1], col[2], .7, 1);
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) { const d = x * x + y * y; if (d <= (size > 2 ? 2 : 1)) mixP(sx + x, sy + y, d ? C[0] : 255, d ? C[1] : 255, d ? C[2] : 255, 1, .6); }
  const cc = mixW(col, .4);
  if (bst === 'rune') for (let k = 0; k < 3; k++) { const an = f * .3 + k * 2.094; lit(sx + Math.cos(an) * (size + 2.5), sy + Math.sin(an) * (size + 2.5), cc[0], cc[1], cc[2], .9, .7); }
  else if (bst === 'wisp') for (let k = 0; k < 2; k++) for (let t = 0; t < 6; t++) { const an = f * .35 + k * 3.14 + t * .5, rr = size + 1.5 - t * .2; lit(sx - ux * t * 1.2 + Math.cos(an) * rr, sy - uy * t * 1.2 + Math.sin(an) * rr, cc[0], cc[1], cc[2], .6 - t * .08, .5); }
  else if (bst === 'arc' || bst === 'crackle') { if (f % 2 === 0) { const an = Math.random() * 6.283, L = size + 3; lineL(sx, sy, sx + Math.cos(an) * L, sy + Math.sin(an) * L, cc[0], cc[1], cc[2], .8, .7); } }
  else if (bst === 'crystal') { for (let t = -3; t <= 3; t++) lit(sx + ux * t, sy + uy * t, 230, 248, 255, .5, .3); lit(sx - uy * 2, sy + ux * 2, 230, 248, 255, .5, .3); lit(sx + uy * 2, sy - ux * 2, 230, 248, 255, .5, .3); }
  else if (bst === 'stars') star(sx, sy, 3 + ((f >> 2) & 1), 255, 255, 255, .8);
  else if (bst === 'ripple') circL(sx, sy, size + 1.5 + (f % 6) * .5, cc[0], cc[1], cc[2], .6, .5);
  else if (bst === 'pulse' && f % 8 < 4) circL(sx, sy, size + 2, cc[0], cc[1], cc[2], .45, .4);
  if (play && (f & 1)) { const sk = Sy.spark;
    if (sk === 'glyph' && f % 6 === 1) vp(K.GLYPH, s.x, s.y, (Math.random() - .5) * .4, (Math.random() - .5) * .4, 18, 1, 0, pk(cc), pk(col), DRAG);
    else if (sk === 'ember' || bst === 'flame') vp(K.FLAME, s.x, s.y, -ux * .5 + (Math.random() - .5) * .4, -uy * .5 - .3, 10, 1.6 + Math.random(), 0, pk([255, 240, 170]), pk(col), RISE);
    else if (sk === 'star' && f % 4 === 1) vp(K.STAR, s.x + (Math.random() - .5) * 4, s.y + (Math.random() - .5) * 4, 0, 0, 12, 2, 0, pk([255, 255, 255]), pk(col), 0);
    else if (sk === 'wisp' && f % 4 === 1) vp(K.WISP, s.x, s.y, -ux + (Math.random() - .5), -uy + (Math.random() - .5), 14, 1.3, .3, pk(cc), pk(col), 8 | DRAG, 0, (Math.random() - .5) * .4);
    else if (sk === 'shard' && f % 4 === 1) vp(K.SHARD, s.x, s.y, -ux * .5 + (Math.random() - .5), -uy * .5, 14, 2, 1, pk([240, 250, 255]), pk(col), GRAV, Math.random() * 6, .3);
  }
  return true;
}
function trail(tr, col, w, k) { const n = tr.length; if (n < 2) return; for (let i = 1; i < n; i++) { const f = i / n, a = tr[i - 1], b = tr[i], hw = .4 + w * f + 1.5;
  seg(a[0], a[1], b[0], b[1], hw, (o, d) => { const q = (d < 0 ? -d : d) / hw, m = (1 - q) * (1 - q) * f * k; if (q < .35 * f) mixO(o, col[0] + (255 - col[0]) * .4, col[1] + (255 - col[1]) * .4, col[2] + (255 - col[2]) * .4, .8 * f); else addO(o, col[0] * m, col[1] * m, col[2] * m); gloO(o, col[0] * m, col[1] * m, col[2] * m); }); } }
function lineMix(a, b, r, g, bl, al) { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) | 0; for (let i = 0; i <= n; i++) { const f = n ? i / n : 0; mixP(a[0] + (b[0] - a[0]) * f - ST.CX, a[1] + (b[1] - a[1]) * f - ST.CY, r, g, bl, al); } }

// ---- particles
// comic smoke: every puff gets an ink outline first, then 2-tone fills, so overlapping puffs read as one cloud
export function drawFxBack() {
  const ink = SET.ink;
  if (V.smoke > 0) {
    if (ink) for (let n = 0; n < V.n; n++) { if (fk_[n] !== K.SMOKE) continue; const r = puffR(n); if (r < .8) continue; const c = fc1[n]; discMix(fx_[n] - ST.CX, fy_[n] - ST.CY, r + 1, ur(c) * .25, ug(c) * .22, ub(c) * .22, .9 * puffA(n)); }
    for (let n = 0; n < V.n; n++) { if (fk_[n] !== K.SMOKE) continue; const r = puffR(n); if (r < .8) continue; const u = 1 - fl_[n] / fm_[n], em = ff_[n] & EMIS, c0 = fc0[n], c1 = fc1[n];
      let R1, G1, B1, gl = 0;
      if (em) { // burning puff: its colour, then a darker redder middle, then smoke
        const r0 = ur(c0), g0 = ug(c0), b0 = ub(c0), rm = r0 * .92, gm = g0 * .42, bm = b0 * .3;
        if (u < .12) { R1 = r0; G1 = g0; B1 = b0; gl = .25; } else if (u < .32) { const q = (u - .12) / .2; R1 = r0 + (rm - r0) * q; G1 = g0 + (gm - g0) * q; B1 = b0 + (bm - b0) * q; gl = .25 - q * .18; }
        else if (u < .55) { const q = (u - .32) / .23; R1 = rm + (ur(c1) - rm) * q; G1 = gm + (ug(c1) - gm) * q; B1 = bm + (ub(c1) - bm) * q; gl = .1 * (1 - q); } else { R1 = ur(c1); G1 = ug(c1); B1 = ub(c1); } }
      else { const h = Math.max(0, 1 - u * 1.6); R1 = ur(c1) + (ur(c0) - ur(c1)) * h; G1 = ug(c1) + (ug(c0) - ug(c1)) * h; B1 = ub(c1) + (ub(c0) - ub(c1)) * h; }
      puffFill(fx_[n] - ST.CX, fy_[n] - ST.CY, r, R1, G1, B1, puffA(n), gl); }
  }
  for (let n = 0; n < V.n; n++) { const k = fk_[n]; if (k !== K.SHARD && k !== K.GOO) continue; const sx = fx_[n] - ST.CX, sy = fy_[n] - ST.CY, c0 = fc0[n], c1 = fc1[n], u = 1 - fl_[n] / fm_[n];
    if (k === K.SHARD) { const L = fs0[n], ca = Math.cos(fan[n]), sa = Math.sin(fan[n]); for (let t = -L / 2; t <= L / 2; t++) mixP(sx + ca * t, sy + sa * t, t > 0 ? ur(c0) : ur(c1), t > 0 ? ug(c0) : ug(c1), t > 0 ? ub(c0) : ub(c1), 1 - u * .5, .25); }
    else { const r = fs0[n] * (1 - u * .4); discMix(sx, sy, r, ur(c0), ug(c0), ub(c0), 1); mixP(sx - r * .4, sy - r * .4, 200, 200, 214, 1); }
  }
}
const puffR = (n) => { const u = 1 - fl_[n] / fm_[n], a = fs0[n], b = fs1[n]; return u < .2 ? a + (b - a) * (u / .2) : u > .65 ? b * (1 - (u - .65) / .35) : b; };
const puffA = (n) => Math.min(1, fl_[n] / 6);
function discMix(sx, sy, rad, r, g, b, a) { const R0 = Math.ceil(rad), r2 = rad * rad; for (let y = Math.max(0, (sy - R0) | 0); y <= Math.min(VH - 1, (sy + R0) | 0); y++) for (let x = Math.max(0, (sx - R0) | 0); x <= Math.min(VW - 1, (sx + R0) | 0); x++) { const dx = x + .5 - sx, dy = y + .5 - sy; if (dx * dx + dy * dy <= r2) mixO(y * VW + x, r, g, b, a); } }
function puffFill(sx, sy, rad, r, g, b, a, em) { const R0 = Math.ceil(rad), r2 = rad * rad, cut = rad * .35;
  for (let y = Math.max(0, (sy - R0) | 0); y <= Math.min(VH - 1, (sy + R0) | 0); y++) for (let x = Math.max(0, (sx - R0) | 0); x <= Math.min(VW - 1, (sx + R0) | 0); x++) { const dx = x + .5 - sx, dy = y + .5 - sy; if (dx * dx + dy * dy > r2) continue;
    const o = y * VW + x, sh = dx + dy > cut ? .72 : dx + dy < -rad * .55 ? 1.12 : 1; // 2-tone comic shading lit from the upper left
    mixO(o, Math.min(255, r * sh), Math.min(255, g * sh), Math.min(255, b * sh), a); if (em > 0) gloO(o, r * em, g * em, b * em); } }

const GLY3 = [[2, 7, 2], [5, 2, 5], [7, 5, 7], [6, 3, 6], [2, 5, 2], [7, 2, 2], [4, 7, 1]];
const GLY5 = [[14, 21, 31, 21, 14], [4, 14, 21, 4, 4], [17, 10, 4, 10, 17], [31, 4, 14, 4, 31], [4, 21, 14, 21, 4], [28, 16, 30, 2, 7], [21, 21, 31, 4, 4], [10, 31, 10, 31, 10]];
// additive particles and the shaped effects, drawn over enemies and the hero
export function drawFxFront() {
  const f = ST.frame;
  for (let n = 0; n < V.n; n++) {
    const k = fk_[n]; if (k === K.SMOKE || k === K.SHARD || k === K.GOO) continue;
    const sx = fx_[n] - ST.CX, sy = fy_[n] - ST.CY; if (sx < -8 || sy < -8 || sx > VW + 8 || sy > VH + 8) continue;
    const u = 1 - fl_[n] / fm_[n], c0 = fc0[n], c1 = fc1[n], R1 = ur(c0) + (ur(c1) - ur(c0)) * u, G1 = ug(c0) + (ug(c1) - ug(c0)) * u, B1 = ub(c0) + (ub(c1) - ub(c0)) * u, fade = Math.min(1, fl_[n] / 5);
    switch (k) {
      case K.SPARK: { const vx = fvx[n], vy = fvy[n], L = Math.min(7, Math.max(1, Math.hypot(vx, vy) * 1.6)), sp = Math.hypot(vx, vy) || 1;
        for (let t = 0; t <= L; t++) { const m = (1 - t / (L + 1)) * fade; mixP(sx - vx / sp * t, sy - vy / sp * t, t ? R1 : ur(c0), t ? G1 : ug(c0), t ? B1 : ub(c0), m, m * .45); } break; }
      case K.EMBER: { const fl = (f + n * 7) % 6 < 3 ? 1 : .6; mixP(sx, sy, R1 * fl + 30, G1 * fl, B1 * fl, fade, .9 * fade); break; }
      case K.ORB: glowDisc(sx, sy, fs0[n] + (fs1[n] - fs0[n]) * u + .5, R1, G1, B1, .8 * fade, .8 * fade); break;
      case K.MOTE: { const s = fs0[n] + (fs1[n] - fs0[n]) * u; mixP(sx, sy, R1, G1, B1, .9 * fade, fade); if (s > 1) { lit(sx + 1, sy, R1, G1, B1, .4 * fade, .5 * fade); lit(sx, sy + 1, R1, G1, B1, .4 * fade, .5 * fade); } break; }
      case K.STAR: { const tw = .5 + .5 * Math.sin(f * .6 + n), s = Math.round(fs0[n] * (.6 + tw * .6)); star(sx, sy, s, R1 + (255 - R1) * .5, G1 + (255 - G1) * .5, B1 + (255 - B1) * .5, fade * (.6 + tw * .4)); break; }
      case K.GLYPH: { const big = fs0[n] >= 2, gl = big ? GLY5[n % GLY5.length] : GLY3[n % GLY3.length], w = big ? 5 : 3, h = w >> 1;
        for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if ((gl[y] >> (w - 1 - x)) & 1) lit(sx + x - h, sy + y - h, R1, G1, B1, .6 * fade, .5 * fade); break; }
      case K.WISP: { const vx = fvx[n], vy = fvy[n]; let px = sx, py = sy, a = Math.atan2(vy, vx); for (let t = 0; t < 5; t++) { const m = (1 - t / 5) * fade; lit(px, py, R1, G1, B1, .8 * m, .8 * m); a -= .35; px -= Math.cos(a) * 1.2; py -= Math.sin(a) * 1.2; } break; }
      case K.RIPPLE: circL(sx, sy, fs0[n] + (fs1[n] - fs0[n]) * u, R1, G1, B1, .7 * fade, .6 * fade); break;
      case K.CRESC: { const r = fs0[n] + 1, a0 = fan[n]; for (let t = -3; t <= 3; t++) { const a = a0 + t * .42; lit(sx + Math.cos(a) * r, sy + Math.sin(a) * r, R1, G1, B1, .9 * fade, .8 * fade); } break; }
      case K.FLAME: { const r = Math.max(.6, fs0[n] * (1 - u * .7)), hr = r * 2; // teardrop licking upward: white, yellow, orange, red
        const R2 = u < .25 ? 255 : u < .55 ? 255 : 230 - u * 120, G2 = u < .25 ? 245 - u * 200 : u < .55 ? 190 - (u - .25) * 300 : 70 - u * 40, B2 = u < .25 ? 190 - u * 500 : 40 - u * 30;
        for (let y = -Math.ceil(hr); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) { const yy = y < 0 ? y / hr : y / r, e = (x * x) / (r * r) + yy * yy; if (e > 1) continue; const m = (1 - e * .6) * fade; mixP(sx + x, sy + y, R2, Math.max(0, G2), Math.max(0, B2), .85 * m, .7 * m); } break; }
      case K.GLINT: if ((f + n) % 4 < 2) star(sx, sy, 1, 255, 255, 255, fade); break;
      case K.CARD: { const ca = Math.cos(fan[n]), sa = Math.sin(fan[n]); for (let a2 = -1; a2 <= 1; a2++) mixP(sx + a2 * ca, sy + a2 * sa, 250, 240, 245, fade, .3); lit(sx, sy, R1, G1, B1, .4, .9); break; }
    }
  }
  for (const o of fxo) drawShape(o);
}

// ---- shaped effects
function drawShape(o) {
  const sx = o.x - ST.CX, sy = o.y - ST.CY, k = Math.min(1, o.life / Math.min(8, o.max * .5)), c = o.c;
  if (o.k === 'flare') { const r = o.r * (.6 + .4 * k), C = mixW(c, .45); glowDisc(sx, sy, r * .4, C[0], C[1], C[2], .65 * k, .5 * k); glowDisc(sx, sy, r, c[0], c[1], c[2], .12 * k, .4 * k);
    if (o.n === 2) { for (let t = 1; t < r * 2.2; t++) { const m = (1 - t / (r * 2.2)) * k * .8, ca = Math.cos(o.rot), sa = Math.sin(o.rot); lit(sx + ca * t, sy + sa * t, C[0], C[1], C[2], m, m); lit(sx - ca * t, sy - sa * t, C[0], C[1], C[2], m, m); } }
    else for (let q = 0; q < o.n; q++) spike(sx, sy, o.rot + q / o.n * 6.283, r * 1.3 * (q & 1 && o.n > 4 ? .5 : 1), C, .7 * k);
    return; }
  if (o.k === 'sigil') { drawSigil(o, sx, sy, k); return; }
  if (drawShape2(o, sx, sy, k)) return;
  if (o.k === 'slash') { drawSlash(o, sx, sy, k); return; }
  if (o.k === 'pillar') { const C = mixW(c, .6), y0 = Math.min(o.y0, o.y1) - ST.CY, y1 = Math.max(o.y0, o.y1) - ST.CY, w = o.w * (.7 + .3 * k);
    for (let y = Math.max(0, y0 | 0); y <= Math.min(VH - 1, y1 | 0); y++) { const fl = .85 + .15 * Math.sin(y * .3 + ST.frame * .8); if (o.flat) { for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) mixP(sx + x, y, c[0], c[1], c[2], .85 * k * fl, .22 * k); continue; }
      for (let x = -Math.ceil(w + 2); x <= Math.ceil(w + 2); x++) { const a = Math.abs(x) / w; if (a <= .4) mixP(sx + x, y, C[0], C[1], C[2], .9 * k, 1 * k); else if (a <= 1) mixP(sx + x, y, c[0], c[1], c[2], .7 * k * fl, .8 * k); else { const m = (1 - (a - 1) * w / 2.5) * .35 * k; if (m > 0) lit(sx + x, y, c[0], c[1], c[2], m, m); } } }
    return; }
  if (o.k === 'crack') { const grow = Math.min(1, o.age / 5), C = mixW(c, .5); for (const pts of o.arms) { const n = Math.max(2, Math.ceil(pts.length * grow)); for (let i = 1; i < n; i++) { const a = pts[i - 1], b = pts[i]; lineL(a[0] - ST.CX, a[1] - ST.CY, b[0] - ST.CX, b[1] - ST.CY, C[0], C[1], C[2], .85 * k, .9 * k); } } return; }
  if (o.k === 'dome') { const r = o.r * Math.min(1, .5 + o.age / 8), C = mixW(c, .5); circL(sx, sy, r, C[0], C[1], C[2], .8 * k, .8 * k); circL(sx, sy, r - 1, c[0], c[1], c[2], .4 * k, .5 * k);
    const R0 = Math.ceil(r); for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) { const d2 = x * x + y * y; if (d2 > (r - 1.5) * (r - 1.5)) continue; const X = sx + x | 0, Y = sy + y | 0;
      if (o.hex ? ((X + (Y >> 2) * 2) % 6 === 0 || (Y & 3) === 0 && (X % 6) < 3) : ((X + Y + ST.frame) % 9 === 0)) lit(X, Y, c[0], c[1], c[2], .22 * k, .25 * k); }
    if (o.runes) for (let q = 0; q < 10; q++) { const an = q / 10 * 6.283 + ST.frame * .03; star(sx + Math.cos(an) * (r - 3), sy + Math.sin(an) * (r - 3), 1, C[0], C[1], C[2], .9 * k); }
    return; }
}
function poly(sx, sy, r, n, step, rot, C, k, sq) { for (let i = 0; i < n; i++) { const a0 = rot + i / n * 6.283, a1 = rot + ((i + step) % n) / n * 6.283; lineL(sx + Math.cos(a0) * r, sy + Math.sin(a0) * r * sq, sx + Math.cos(a1) * r, sy + Math.sin(a1) * r * sq, C[0], C[1], C[2], k, k * .9); } }
function drawSigil(o, sx, sy, k) {
  const e = Math.min(1, o.age / 6), r = o.r * (1 - Math.pow(1 - e, 3)), rot = o.rot + o.age * o.spin, sq = o.sq, c = o.c, C = mixW(c, .35), D = o.c2 || c, kk = (o.r < 12 ? .55 : .8) * k;
  if (r < 2) return;
  if (o.r < 12) { circL(sx, sy, r, C[0], C[1], C[2], kk, kk, sq); poly(sx, sy, r * .9, o.kind === 'hexagram' ? 6 : o.kind === 'octagram' || o.kind === 'mandala' ? 8 : 5, 2, rot, D, kk, sq); return; } // small: ring and star only
  glowDisc(sx, sy, r * 1.1, c[0], c[1], c[2], 0, .18 * k);
  circL(sx, sy, r, C[0], C[1], C[2], kk, kk, sq);
  switch (o.kind) {
    case 'octagram': poly(sx, sy, r * .93, 8, 3, rot, C, kk, sq); circL(sx, sy, r * .42, D[0], D[1], D[2], kk, kk, sq); for (let i = 0; i < 8; i++) { const a = rot + i / 8 * 6.283; star(sx + Math.cos(a) * r * 1.12, sy + Math.sin(a) * r * 1.12 * sq, 1, C[0], C[1], C[2], kk); } break;
    case 'mandala': circL(sx, sy, r * .84, D[0], D[1], D[2], kk, kk, sq, 4, -rot); poly(sx, sy, r * .8, 4, 1, rot, C, kk, sq); poly(sx, sy, r * .8, 4, 1, rot + .785, C, kk, sq); circL(sx, sy, r * .4, C[0], C[1], C[2], kk, kk, sq);
      for (let i = 0; i < 8; i++) { const a = -rot * 1.5 + i / 8 * 6.283; circL(sx + Math.cos(a) * r * .92, sy + Math.sin(a) * r * .92 * sq, Math.max(1, r * .07), C[0], C[1], C[2], kk, kk, sq); } break;
    case 'hexagram': poly(sx, sy, r * .9, 6, 2, rot, C, kk, sq); circL(sx, sy, r * .5, D[0], D[1], D[2], kk, kk, sq, 3, rot); break;
    case 'norse': circL(sx, sy, r * .8, D[0], D[1], D[2], kk, kk, sq); for (let i = 0; i < 3; i++) { const a = rot + i * 2.094; circL(sx + Math.cos(a) * r * .32, sy + Math.sin(a) * r * .32 * sq, r * .34, C[0], C[1], C[2], kk, kk, sq); }
      for (let i = 0; i < 16; i++) { const a = -rot + i / 16 * 6.283; lineL(sx + Math.cos(a) * r * .82, sy + Math.sin(a) * r * .82 * sq, sx + Math.cos(a) * r * .97, sy + Math.sin(a) * r * .97 * sq, C[0], C[1], C[2], kk, kk); } break;
    case 'thorn': for (let i = 0; i < 14; i++) { const a = rot + i / 14 * 6.283; lineL(sx + Math.cos(a) * r, sy + Math.sin(a) * r * sq, sx + Math.cos(a + .12) * r * 1.35, sy + Math.sin(a + .12) * r * 1.35 * sq, C[0], C[1], C[2], kk, kk); } circL(sx, sy, r * .6, D[0], D[1], D[2], kk, kk, sq, 3, rot); break;
    case 'tech': poly(sx, sy, r * .85, 6, 1, rot, C, kk, sq); circL(sx, sy, r * .55, D[0], D[1], D[2], kk, kk, sq, 6, -rot); break;
    case 'snowflake': for (let i = 0; i < 6; i++) { const a = rot + i * 1.047, ca = Math.cos(a), sa = Math.sin(a) * sq; lineL(sx, sy, sx + ca * r * .95, sy + sa * r * .95, C[0], C[1], C[2], kk, kk);
        for (const t of [.45, .7]) for (const s of [-1, 1]) { const b = a + s * .6, bx = sx + ca * r * t, by = sy + sa * r * t; lineL(bx, by, bx + Math.cos(b) * r * .22, by + Math.sin(b) * r * .22 * sq, D[0], D[1], D[2], kk, kk); } } break;
    case 'clock': circL(sx, sy, r * .85, D[0], D[1], D[2], kk, kk, sq); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; lineL(sx + Math.cos(a) * r * .72, sy + Math.sin(a) * r * .72 * sq, sx + Math.cos(a) * r * .84, sy + Math.sin(a) * r * .84 * sq, C[0], C[1], C[2], kk, kk); }
      lineL(sx, sy, sx + Math.cos(rot * 4) * r * .65, sy + Math.sin(rot * 4) * r * .65 * sq, C[0], C[1], C[2], kk, kk); lineL(sx, sy, sx + Math.cos(rot * .5) * r * .45, sy + Math.sin(rot * .5) * r * .45 * sq, C[0], C[1], C[2], kk, kk); break;
    case 'x': lineL(sx - r * .7, sy - r * .7 * sq, sx + r * .7, sy + r * .7 * sq, C[0], C[1], C[2], kk, kk); lineL(sx + r * .7, sy - r * .7 * sq, sx - r * .7, sy + r * .7 * sq, C[0], C[1], C[2], kk, kk); break;
    case 'rings': circL(sx, sy, r * .78, D[0], D[1], D[2], kk, kk, sq, 5, rot); circL(sx, sy, r * .56, C[0], C[1], C[2], kk, kk, sq, 7, -rot); break;
    default: circL(sx, sy, r * .74, D[0], D[1], D[2], kk, kk, sq); poly(sx, sy, r * .7, 3, 1, -rot, C, kk, sq);
      for (let i = 0; i < 12; i++) { const a = rot + i / 12 * 6.283; lineL(sx + Math.cos(a) * r * .76, sy + Math.sin(a) * r * .76 * sq, sx + Math.cos(a) * r * .96, sy + Math.sin(a) * r * .96 * sq, C[0], C[1], C[2], kk, kk); }
  }
}
function drawSlash(o, sx, sy, k) {
  const p = Math.min(1, o.age / Math.max(1, o.max * .45)), span = o.span, a0 = o.ang - span / 2 * o.dir, r = o.r, c = o.c, C = mixW(c, .6);
  const n = Math.ceil(span * (r + o.th) * 1.3), lead = p;
  for (let i = 0; i <= n * lead; i++) {
    const q = i / n, an = a0 + q * span * o.dir, thick = o.th * Math.sin(Math.PI * q) * (o.blunt ? 1 : .5 + .5 * (q / Math.max(.01, lead))), ca = Math.cos(an), sa = Math.sin(an);
    for (let t = 0; t <= thick; t += .7) { const rr = r - t, edge = t < 1; const m = (1 - t / (thick + 1)) * k;
      if (edge && !o.blunt) mixP(sx + ca * rr, sy + sa * rr, 255, 255, 250, .95 * k, .7 * k); else mixP(sx + ca * rr, sy + sa * rr, edge ? C[0] : c[0], edge ? C[1] : c[1], edge ? C[2] : c[2], (o.blunt ? .55 : .7) * m, .6 * m); }
  }
}

// ---- the hero's shield bubble, drawn in its style: bright rim, a sweeping shimmer and a cell pattern inside
export function drawShieldFx(x, y, r, cols, key) {
  const Sy = styleOf(key), st = Sy.beam, sx = x - ST.CX, sy = y - ST.CY, f = ST.frame, c0 = cols[0], c1 = cols[1], g = cols[2], R0 = Math.ceil(r + 3);
  const sweep = (f * .09) % 6.283;
  for (let yy = -R0; yy <= R0; yy++) for (let xx = -R0; xx <= R0; xx++) {
    const d = Math.sqrt(xx * xx + yy * yy); if (d > r + 2.5) continue; const X = sx + xx | 0, Y = sy + yy | 0; if (!inb(X, Y)) continue; const o = Y * VW + X;
    if (d > r - 1.2 && d <= r + .6) { const an = Math.atan2(yy, xx), sh = Math.max(0, Math.cos(an - sweep)) ** 6; mixO(o, c0[0] + (255 - c0[0]) * sh, c0[1] + (255 - c0[1]) * sh, c0[2] + (255 - c0[2]) * sh, .9); gloO(o, g[0], g[1], g[2]); continue; }
    if (d > r + .6) { const m = (1 - (d - r - .6) / 1.9) * .35; addO(o, g[0] * m, g[1] * m, g[2] * m); gloO(o, g[0] * m, g[1] * m, g[2] * m); continue; }
    let on = false; // cell pattern by style
    if (st === 'pulse' || st === 'ripple' || st === 'laser') on = (X + ((Y >> 2) & 1) * 3) % 6 === 0 || Y % 4 === 0 && (X + 1) % 6 < 3; // hex cells
    else if (st === 'rune') on = hsh(X >> 1, (Y >> 1) + (f >> 3)) < .07;
    else if (st === 'arc' || st === 'crackle') on = hsh(X, Y + f) < .03;
    else if (st === 'crystal') on = (X + Y) % 7 === 0 || (X - Y) % 7 === 0;
    else on = (X + Y + (f >> 1)) % 8 === 0;
    const rim = d / r, m = (on ? .5 : .1) * (.4 + rim * .6);
    addO(o, c1[0] * m, c1[1] * m, c1[2] * m); if (on) gloO(o, g[0] * .3, g[1] * .3, g[2] * .3);
  }
  if ((st === 'arc' || st === 'crackle') && f % 3 === 0) { const a0 = Math.random() * 6.283, a1 = a0 + (Math.random() - .5) * 1.5; lineL(sx + Math.cos(a0) * r, sy + Math.sin(a0) * r, sx + Math.cos(a1) * r * .5, sy + Math.sin(a1) * r * .5, 255, 255, 255, .7, .6); }
}

// ---- status effects on enemies: flames on the burning, an ice shell on the frozen, sparks on the shocked,
// drips on the wet and comic dizzy stars on the stunned (the mark reticle stays in heroes/abilities.js)
export function drawStatusFx(list) {
  const f = ST.frame, play = ST.GS === 'play';
  for (const e of list) {
    const s = e.st, w = e.def.w, h = e.def.h, sx = e.x - ST.CX, sy = e.y - ST.CY; if (sx < -w || sx > VW + w || sy < -h || sy > VH + h) continue;
    if (e.frozen > 0 && w < 40) { const hw = w / 2 + 1, hh = h / 2 + 1; // a cracked ice shell with glints
      for (let y = -hh; y <= hh; y++) for (let x = -hw; x <= hw; x++) { const edge = Math.abs(x) >= hw - .5 || Math.abs(y) >= hh - .5; if (edge) mixP(sx + x, sy + y, 200, 235, 255, .85, .2); else if (((x * 3 + y * 5) & 7) === 0) mixP(sx + x, sy + y, 220, 245, 255, .35, 0); }
      if ((f >> 3) % 4 === 0) star(sx + hw - 1, sy - hh + 1, 1, 255, 255, 255, .9); }
    if (!s) continue;
    if (s.burn > 0 && play && f % 3 === 0) vp(K.FLAME, e.x + (Math.random() - .5) * w, e.y + (Math.random() - .2) * h * .5, (Math.random() - .5) * .3, -.5, 10 + Math.random() * 6, 1.4 + Math.random(), 0, pk([255, 240, 170]), pk([255, 90, 20]), RISE);
    if (s.shock > 0 && f % 4 === 0) { const x0 = sx + (Math.random() - .5) * w, y0 = sy + (Math.random() - .5) * h, x1 = sx + (Math.random() - .5) * w, y1 = sy + (Math.random() - .5) * h, mx = (x0 + x1) / 2 + (Math.random() - .5) * 4, my = (y0 + y1) / 2 + (Math.random() - .5) * 4;
      lineL(x0, y0, mx, my, 220, 235, 255, .9, .8); lineL(mx, my, x1, y1, 220, 235, 255, .9, .8); }
    if (s.wet > 0 && play && f % 7 === 0) vp(K.MOTE, e.x + (Math.random() - .5) * w, e.y + h / 2 - 1, 0, .3, 14, 1, 1, pk([150, 200, 255]), pk([90, 140, 230]), GRAV);
    if (s.chill > 0 && !(e.frozen > 0) && play && f % 5 === 0) vp(K.STAR, e.x + (Math.random() - .5) * w, e.y + (Math.random() - .5) * h, 0, .15, 14, 1, 0, pk([235, 248, 255]), pk([150, 210, 255]), 0);
    if (s.stun > 0) for (let k = 0; k < 3; k++) { const an = f * .15 + k * 2.094; star(sx + Math.cos(an) * (w / 2 + 3), sy - h / 2 - 3 + Math.sin(an) * 2, 1, 255, 230, 120, .9); }
  }
}

// ---- extra shapes: cones, black holes, eclipses, glitches
function drawShape2(o, sx, sy, k) {
  const c = o.c, C = mixW(c, .5);
  if (o.k === 'cone') { const t = o.age / o.max; for (let q = 0; q < o.n; q++) { const u = t * 1.2 - q * .18; if (u <= 0 || u > 1) continue; const r = o.r1 * u, m = (1 - u) * k, n = Math.max(6, o.span * r * 1.2 | 0);
      for (let i = 0; i <= n; i++) { const an = o.ang - o.span / 2 + o.span * i / n, e = Math.sin(Math.PI * i / n); for (let w = 0; w < 2; w++) { const rr = r - w; mixP(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr, w ? c[0] : C[0], w ? c[1] : C[1], w ? c[2] : C[2], .8 * m * e, .7 * m * e); } } } return true; }
  if (o.k === 'hole') { const r = o.r * Math.min(1, o.age / 10) * (o.life < 10 ? o.life / 10 : 1), f = ST.frame; if (r < 1) return true;
    glowDisc(sx, sy, r * 2.4, c[0], c[1], c[2], 0, .35 * k);
    for (let i = 0, n = Math.max(24, r * 14 | 0); i < n; i++) { const an = i / n * 6.283 + f * .08, rr = r * (1.35 + .15 * Math.sin(an * 3 + f * .2)), hot = Math.sin(an) > 0; // tilted accretion ring, the near side brighter
      mixP(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr * .32, hot ? 255 : c[0], hot ? 245 : c[1], hot ? 220 : c[2], .9 * k, .9 * k); }
    const R0 = Math.ceil(r); for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) { const d = Math.sqrt(x * x + y * y); if (d > r) continue; if (d > r - 1.1) mixP(sx + x, sy + y, C[0], C[1], C[2], .9 * k, .8 * k); else mixP(sx + x, sy + y, 4, 2, 10, .97 * k, 0); }
    return true; }
  if (o.k === 'eclipse') { const r = o.r * Math.min(1, o.age / 12), f = ST.frame; glowDisc(sx, sy, r * 2.2, c[0], c[1], c[2], .25 * k, .5 * k);
    for (let i = 0; i < 40; i++) { const an = i / 40 * 6.283 + f * .01, L = r * (1.15 + .35 * nz(i * 1.7 + f * .05)); spike(sx + Math.cos(an) * r, sy + Math.sin(an) * r, an, L - r, C, .7 * k); }
    const R0 = Math.ceil(r); for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) { const d = Math.sqrt(x * x + y * y); if (d > r) continue; const rim = d > r - 1; mixP(sx + x, sy + y, rim ? 255 : 6, rim ? 255 : 6, rim ? 255 : 12, .96 * k, rim ? .8 * k : 0); }
    return true; }
  if (o.k === 'glitch') { const r = o.r; for (let q = 0; q < 7; q++) { const bx = sx + (hsh(q, o.age + 3) - .5) * r * 2, by = sy + (hsh(q + 9, o.age) - .5) * r * 2, w = 2 + hsh(q, 7) * 7 | 0, h = 1 + hsh(q, 5) * 3 | 0, ch = q % 3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = bx + x | 0, Y = by + y | 0; if (!inb(X, Y)) continue; const o2 = Y * VW + X; if (ch === 0) addO(o2, 200 * k, 0, 40 * k); else if (ch === 1) addO(o2, 0, 160 * k, 220 * k); else mixO(o2, 255, 255, 255, .7 * k); } }
    return true; }
  return false;
}

// ---- hero-state auras drawn around the hero while a timed power runs
export function drawAuras(p, id) {
  const f = ST.frame, play = ST.GS === 'play', PH = ST.PH, cx = p.x, cy = p.y - PH / 2, sx = cx - ST.CX, sy = cy - ST.CY;
  const flames = (n, c0, c1, spread = 1) => { if (!play) return; for (let k = 0; k < n; k++) vp(K.FLAME, cx + (Math.random() - .5) * ST.PW * 1.4 * spread, p.y - Math.random() * PH, (Math.random() - .5) * .4, -.4 - Math.random() * .5, 9 + Math.random() * 7, 1.2 + Math.random() * 1.3, 0, pk(c0), pk(c1), RISE); };
  // each aura belongs to one hero: a timer left over from the hero before a switch shows nothing
  const is = (h) => id === h;
  if (p.rage > 0 && (is('hulk') || is('wolverine'))) { const g = id === 'hulk' ? [120, 255, 90] : [255, 60, 40]; glowDisc(sx, sy, PH * .9, g[0], g[1], g[2], .12, .35); if (play && f % 2 === 0) vp(K.MOTE, cx + (Math.random() - .5) * ST.PW * 2, p.y - Math.random() * PH, 0, -.6, 14, 1.5, .5, pk(mixW(g, .4)), pk(g), 0); }
  if (p.wings > 0 && is('jean')) { // Phoenix wings of fire
    const flap = Math.sin(f * .18) * 4;
    for (const s of [-1, 1]) { let px = sx + s * 2, py = sy - 3; for (let i = 1; i <= 22; i++) { const t = i / 22, qx = sx + s * (2 + t * 26), qy = sy - 3 - Math.sin(t * Math.PI) * (10 + flap) + t * t * 8 + flap * t;
      lineL(px, py, qx, qy, 255, 200 - t * 80, 90 - t * 60, .8 * (1 - t * .5), .9); px = qx; py = qy;
      if (play && i % 3 === 0 && Math.random() < .5) vp(K.FLAME, qx + ST.CX, qy + ST.CY, s * .2, -.3, 10, 1.5 + (1 - t) * 1.5, 0, pk([255, 235, 160]), pk([230, 70, 20]), RISE); }
      glowDisc(sx + s * 14, sy - 8, 14, 255, 170, 60, .08, .3); } }
  if (p.binary > 0 && is('marvel')) { flames(2, [255, 245, 200], [255, 160, 50]); glowDisc(sx, sy, PH, 255, 200, 90, .1, .4); if (play && f % 3 === 0) vp(K.STAR, cx + (Math.random() - .5) * 14, cy + (Math.random() - .5) * PH, 0, -.2, 12, 2, 0, pk([255, 255, 255]), pk([120, 160, 255]), 0); }
  if ((p.vengeance > 0 || p.harvest > 0) && is('rider')) flames(2, [255, 230, 140], [255, 80, 10], 1.2);
  if (p.carnage > 0 && is('venom') && play && f % 2 === 0) vp(K.WISP, cx + (Math.random() - .5) * 10, cy + (Math.random() - .5) * PH, (Math.random() - .5) * 2, (Math.random() - .5) * 2, 12, 1.4, .4, pk([255, 80, 70]), pk([140, 10, 10]), 8 | DRAG, 0, (Math.random() - .5) * .4);
  if (p.surge > 0 && is('juggernaut')) { glowDisc(sx, sy, PH, 220, 40, 30, .12, .4); flames(1, [255, 140, 110], [160, 20, 10]); }
  if (p.mstorm > 0 && is('magneto')) for (let k = 0; k < 6; k++) { const an = f * .12 + k * 1.047, rx = sx + Math.cos(an) * 16, ry = sy + Math.sin(an) * 9; mixP(rx, ry, 190, 196, 210, 1, .2); mixP(rx + 1, ry, 140, 146, 160, 1, 0); if ((f + k * 5) % 12 < 2) star(rx, ry, 1, 255, 255, 255, .9); }
  if (p.metal > 0 && is('wolverine') && (f % 40) < 10) { const yy = sy - PH / 2 + ((f % 40) / 10) * PH; for (let x = -ST.PW; x <= ST.PW; x++) lit(sx + x, yy - x * .5, 255, 255, 255, .5, .3); }
  if (p.nshield > 0 && is('hela') && play && f % 2 === 0) { const an = Math.random() * 6.283; vp(K.WISP, cx + Math.cos(an) * 14, cy + Math.sin(an) * 14, -Math.sin(an) * 1.2, Math.cos(an) * 1.2, 16, 1.4, .4, pk([140, 255, 160]), pk([20, 60, 30]), 8 | DRAG, 0, .2); }
  if (p.rguard > 0 && is('shang')) for (let k = 0; k < 10; k++) { const an = f * .1 + k * .628; circL(sx + Math.cos(an) * 15, sy + Math.sin(an) * 15 * .45, 1.5, k & 1 ? 255 : 120, 200, k & 1 ? 80 : 255, .8, .8); }
  if (p.eye > 0 && is('storm')) glowDisc(sx + p.face, sy - PH / 2 + 4, 6, 220, 235, 255, .5, .8);
  if (p.absorb > 0 && is('marvel') && play && f % 2 === 0) { const an = Math.random() * 6.283; vp(K.MOTE, cx + Math.cos(an) * 26, cy + Math.sin(an) * 26, -Math.cos(an) * 1.6, -Math.sin(an) * 1.6, 15, 1.5, .5, pk([255, 240, 170]), pk([255, 170, 60]), 0); }
  // Kang: a clock face turning around him with chrono motes rising, on while an aegis or his clones are out
  if (p.chrono > 0 && is('kang')) { const rr = 22 + Math.sin(f * .06) * 2, a0 = f * .035;
    for (let k = 0; k < 24; k++) { const an = a0 + k / 24 * 6.283, rad = rr + (k % 6 === 0 ? 2 : 0); mixP(sx + Math.cos(an) * rad, sy + Math.sin(an) * rad * .92, 190, 150, 255, .5, .55); }
    circL(sx, sy, rr * .58, 255, 214, 110, .35, .4, 1, 4, -a0);
    if (play && f % 3 === 0) vp(K.MOTE, cx + (Math.random() - .5) * 34, cy + (Math.random() - .5) * PH, 0, -.5, 14, 1.5, .4, pk([255, 236, 200]), pk([150, 90, 235]), 0); }
}
