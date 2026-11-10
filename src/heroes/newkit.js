// Building blocks for hero powers: projectiles, melee arcs, dashes, zones, terrain painting. The eight heroes added
// in the 2026-11 overhaul are written with these, so a power reads as what it does.
// Projectiles and zones live in the summons list (heroes/abilities.js): they update and draw themselves.
import { ST } from '../state.js';
import { EMPTY, F, G, KIND, L, R, S, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { afters, beams, fxWord } from '../render/fx.js';
import { pix } from '../render/canvas.js';
import { snd } from '../sfx.js';
import { boxHit, carve, hand, mouse, pl_ } from '../player.js';
import { enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus, summons } from './abilities.js';
import { scriptMove } from './powers.js';
import { ACT } from './xmen.js';

export const inW = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
export const matAt = (x, y) => { x |= 0; y |= 0; return inW(x, y) ? t[y * W + x] : 255; };
export const solid = (x, y) => { x |= 0; y |= 0; if (!inW(x, y)) return true; return KIND[t[y * W + x]] === S; };
export const open = (x, y) => { x |= 0; y |= 0; if (!inW(x, y)) return false; const m = t[y * W + x]; return m === 0 || KIND[m] === G || KIND[m] === F; };
export const tagd = (tag, f) => { if (!tag) return f(); const o = ST.dmgTag; ST.dmgTag = tag; try { return f(); } finally { ST.dmgTag = o; } };
export const body = p => [p.x, p.y - ST.PH / 2];
export const say = (p, text, c, size = .9) => fxWord(p.x, p.y - ST.PH - 8, text, size, c, true);
export const stun = (e, f) => applyStatus(e, 'stun', f);
export const alive = e => e && e.hp > 0 && enemies.includes(e);
// ---- drawing (for projectiles and zones)
export function dot(x, y, r, c, g) { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + .5) pix(x + xx, y + yy, c, g); }
export function seg(x0, y0, x1, y1, c, g) { const n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) | 0); for (let k = 0; k <= n; k++) pix(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c, g); }
export function circ(x, y, r, c, g, n) { n = n || Math.max(8, r * 3 | 0); for (let k = 0; k < n; k++) { const a = k / n * 6.283; pix(x + Math.cos(a) * r, y + Math.sin(a) * r, c, g); } }
export const puffs = (x, y, n, c, sp = 1.5, life = 16, glow = 0) => { for (let k = 0; k < n; k++) { const a = R() * 6.283, v = sp * (.3 + R()); spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, c, life * (.6 + R() * .8), 0, glow, 0, 1); } };

// ---- hits
// everything within r of a point: returns the enemies hit. o: { tag, kx, ky, radial, stun, status:[kind, frames] }
export function hitAround(x, y, r, dmg, o = {}) { r *= ST.aoeC || 1; const out = [];
  for (const e of enemies) { if (e.hp <= 0 || e.host) continue; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r + e.def.w / 2) continue;
    const k = o.radial ? o.radial / (d || 1) : 0; tagd(o.tag, () => hitEnemy(e, dmg, (o.kx || 0) + dx * k, (o.ky || 0) + dy * k)); if (o.stun) stun(e, o.stun); if (o.status) applyStatus(e, o.status[0], o.status[1]); out.push(e); }
  return out; }
// a strike in front of the hero along the aim. o: { reach, r, dmg, kx, ky, tag, carve, stun }
export function melee(p, a, o) { const reach = o.reach ?? 14, x = p.x + a.dx * reach, y = p.y - ST.PH / 2 + a.dy * reach; p.punchF = 10; p.face = a.dx < 0 ? -1 : 1;
  if (o.carve) carve(x, y, o.carve, a.dx * 3, a.dy * 3);
  return hitAround(x, y, o.r ?? 11, o.dmg, { tag: o.tag, kx: a.dx * (o.kx ?? 2.5), ky: a.dy * (o.kx ?? 2.5) + (o.ky ?? -1), stun: o.stun }); }

// ---- projectiles. o: { x, y, vx, vy, life, g (gravity), r (hit radius), dmg, tag, kx, pierce, bounce, home:{r,k},
//   col, glow, size, trail(s), onHit(s, enemy|null), onBounce(s), onEnd(s), draw(s) }. Returns the projectile.
export function shoot(o) {
  const s = Object.assign({ life: 120, g: 0, r: 1.5, size: 1, col: rgb(255, 255, 255), glow: 0, bounce: 0 }, o, { hit: new Set(), proj: true });
  s.upd = () => {
    if (s.home) { const e = alive(s.target) ? s.target : (s.target = nearestEnemy(s.x, s.y, s.home.r || 140)); if (e) { const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy) || 1, k = s.home.k || .12; s.vx += (dx / d * sp - s.vx) * k; s.vy += (dy / d * sp - s.vy) * k; } }
    s.vy += s.g; const n = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy))), sx = s.vx / n, sy = s.vy / n;
    for (let k = 0; k < n; k++) { s.x += sx; s.y += sy;
      if (s.x < 1 || s.x >= W - 1 || s.y >= H - 1) { s.gone = true; return false; }
      if (s.y > 0 && solid(s.x, s.y) && !s.ghost) {
        if (s.bounce > 0) { s.bounce--; s.x -= sx; s.y -= sy; if (solid(s.x + sx, s.y)) s.vx = -s.vx; else s.vy = -s.vy * .9; if (s.onBounce) s.onBounce(s); break; }
        s.x -= sx; s.y -= sy; if (s.onHit) s.onHit(s, null); s.gone = true; return false; }
      for (const e of enemies) { if (e.hp <= 0 || e.host || s.hit.has(e)) continue; if (Math.abs(e.x - s.x) <= e.def.w / 2 + s.r && Math.abs(e.y - s.y) <= e.def.h / 2 + s.r) { s.hit.add(e);
        if (s.dmg) tagd(s.tag, () => hitEnemy(e, s.dmg, s.vx * (s.kx ?? .3), s.vy * (s.kx ?? .3))); if (s.onHit) s.onHit(s, e); if (!s.pierce) { s.gone = true; return false; } } } }
    if (s.trail) s.trail(s); };
  s.end = () => { if (!s.gone && s.onEnd) s.onEnd(s); };
  if (!s.draw) s.draw = () => dot(s.x, s.y, s.size, s.col, s.glow);
  summons.push(s); return s;
}
// a zone that lasts: o: { x, y, r, life, tick(z), draw(z) }
export function zone(o) { const z = Object.assign({ life: 120, r: 20 }, o); z.upd = () => { if (z.tick && z.tick(z) === false) return false; }; if (!z.draw) z.draw = () => {}; summons.push(z); return z; }

// ---- movement
// a scripted dash: the hero flies along (dx,dy) for `frames` at `speed`, untouchable. o: { hit:{r,dmg,...}, carve, onEnd, col, each(k) }
export function dash(p, dx, dy, frames, speed, o = {}) { let k = 0; const seen = new Set(); p.face = dx < 0 ? -1 : dx > 0 ? 1 : p.face;
  ACT.push(() => { k++; p.script = 2; p.vx = dx * speed; p.vy = dy * speed; const [bx, by] = body(p);
    if (o.carve) carve(bx + dx * 6, by + dy * 6, o.carve, dx * 4, dy * 4);
    const moved = scriptMove(p, p.vx, p.vy);
    if (o.hit) for (const e of enemies) { if (e.hp <= 0 || seen.has(e) || Math.hypot(e.x - bx, e.y - by) > (o.hit.r || 12) + e.def.w / 2) continue; seen.add(e); tagd(o.hit.tag, () => hitEnemy(e, o.hit.dmg, dx * (o.hit.kx ?? 4), dy * (o.hit.kx ?? 4) + (o.hit.ky ?? -1.5))); if (o.hit.stun) stun(e, o.hit.stun); if (o.hit.on) o.hit.on(e); }
    if (k % 2 === 0) afters.push({ x: p.x, y: p.y, ang: p.ang, face: p.face, life: 10, col: o.col });
    if (o.each) o.each(k);
    if (k >= frames || !moved && !o.carve) { p.vx = dx * 2; p.vy = Math.min(p.vy, dy * 2); if (o.onEnd) o.onEnd(seen); return false; } return true; }); }
// put the hero at (x,y) if there is room there or just above it
export function blink(p, x, y) { x = Math.max(8, Math.min(W - 8, x)); for (let k = 0; k < 40; k++) if (!boxHit(x, y - k)) { p.x = x; p.y = y - k; p.vx = p.vy = 0; return true; } return false; }
// first solid cell along a ray from (x,y); returns { x, y, hit, d }
export function ray(x, y, dx, dy, len) { for (let d = 0; d < len; d++) { const X = x + dx * d, Y = y + dy * d; if (Y > 0 && solid(X, Y)) return { x: X - dx, y: Y - dy, hit: true, d }; } return { x: x + dx * len, y: y + dy * len, hit: false, d: len }; }
// throw a line and reel in: zips the hero to the first solid thing along the aim. Returns false when nothing is in reach
export function grapple(p, a, range, c, g) { const h = hand(), q = ray(h.x, h.y, a.dx, a.dy, range); if (!q.hit) { beams.push({ x0: h.x, y0: h.y, x1: q.x, y1: q.y, life: 4, w: 0, c, g, st: 'crisp' }); return false; }
  const d = Math.max(4, q.d - 6), n = Math.ceil(d / 9); let k = 0; snd('throw', p.x, p.y, { v: .6 });
  ACT.push(() => { k++; p.script = 2; const hh = hand(); beams.push({ x0: hh.x, y0: hh.y, x1: q.x, y1: q.y, life: 2, w: 0, c, g, st: 'crisp' }); const ok = scriptMove(p, a.dx * 9, a.dy * 9); if (k >= n || !ok) { p.vx = a.dx * 3; p.vy = a.dy * 3 - 2; return false; } return true; }); return true; }
export const cloak = (p, frames) => { p.stealth = Math.max(p.stealth || 0, frames); p.lastSeen = { x: p.x, y: p.y - ST.PH / 2 }; };

// ---- terrain
// fill the open cells of a disc with a material. o: { p (chance per cell), c:[r,g,b] tint, over(m) (also replace these) }
export function paint(x, y, r, m, o = {}) { let n = 0; x |= 0; y |= 0; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { if (xx * xx + yy * yy > r * r) continue; const X = x + xx, Y = y + yy; if (!inW(X, Y) || Y >= H - 44) continue; const i = Y * W + X, cur = t[i];
    if (!(cur === 0 || KIND[cur] === G && cur !== m || o.over && o.over(cur))) continue; if (o.p && R() > o.p) continue; setc(i, m); if (o.c) { const v = (R() - .5) * 20; col[i] = rgb(o.c[0] + v, o.c[1] + v, o.c[2] + v); } n++; } return n; }
// turn cells of a disc into something else: to(m) returns the new material, or null to leave the cell alone
export function convert(x, y, r, to, c) { let n = 0; x |= 0; y |= 0; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { if (xx * xx + yy * yy > r * r) continue; const X = x + xx, Y = y + yy; if (!inW(X, Y) || Y >= H - 44) continue; const i = Y * W + X, cur = t[i], nm = to(cur); if (nm == null || nm === cur) continue; setc(i, nm); if (c && nm) { const v = (R() - .5) * 18; col[i] = rgb(c[0] + v, c[1] + v, c[2] + v); } n++; } return n; }
// a spray of grains that become real cells where they land. m: material, c: colour
export function spray(x, y, n, m, c, vx, vy, spread = 1, life = 160, glow = 0) { for (let k = 0; k < n; k++) spawn(x + (R() - .5) * 3, y + (R() - .5) * 3, vx + (R() - .5) * spread, vy + (R() - .5) * spread, c, life, m, glow, 1); }
export const groundY = (x, y0) => { x = Math.max(0, Math.min(W - 1, x | 0)); let y = Math.max(1, y0 | 0); for (; y < H - 1; y++) if (KIND[t[y * W + x]] === S) break; return y; };
export const liquidAt = (x, y) => KIND[matAt(x, y)] === L;
export { EMPTY, mouse, pl_ };
