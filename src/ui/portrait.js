// Paints a hero's hand-drawn art onto a 2D canvas (menu cards, the hero panel, the HUD badge).
// The same outline and lighting as in game (art/kit.js), at any whole-number scale.
import { inkOf, lit, shade, GLOW } from '../art/kit.js';

const css = c => `rgb(${c & 255},${(c >> 8) & 255},${(c >> 16) & 255})`;
// rows for a pose: 'idle', 'sig' (signature pose) or a run frame index 0-5
export function heroRows(hero, pose = 'idle') {
  const A = hero.art; if (!A) return { rows: hero.spr, up: 0 };
  if (pose === 'sig' && A.sig) return { rows: [...A.sig, ...A.spr.slice(A.anim.leg)], up: A.sigUp };
  if (typeof pose === 'number') { const F = A.frames, i = pose % 6, bob = F.bob[i]; const top = A.spr.slice(0, A.anim.leg); return { rows: [...(bob ? [''.padEnd(A.w, '.')] : []), ...top.slice(0, top.length - (bob ? 1 : 0)), ...F.run[i]], up: 0 }; }
  return { rows: A.spr, up: 0 };
}
// draw at (x,y) = top-left of the idle frame's box; k = pixel size. o: { pose, flip, back: true, crop: rows }
export function paintHero(ctx, hero, x, y, k, o = {}) {
  const A = hero.art, pal = hero.pal, { rows, up } = heroRows(hero, o.pose), w = rows[0].length, glow = GLOW.get(pal), cells = new Map();
  const put = (cx, cy, ch) => { if (ch !== '.' && pal[ch] !== undefined) cells.set(cx + ',' + cy, ch); };
  if (A && A.back && o.back !== false) A.back.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) put(xx, yy, r[xx]); });
  rows.forEach((r, yy) => { for (let xx = 0; xx < w; xx++) put(xx, yy - up, r[xx]); });
  const has = (cx, cy) => cells.has(cx + ',' + cy), X = cx => x + (o.flip ? w - 1 - cx : cx) * k;
  for (const [key, ch] of cells) { const [cx, cy] = key.split(',').map(Number); ctx.fillStyle = css(inkOf(pal[ch])); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!has(cx + dx, cy + dy)) ctx.fillRect(X(cx + dx), y + (cy + dy) * k, k, k); }
  for (const [key, ch] of cells) { const [cx, cy] = key.split(',').map(Number); let c = pal[ch];
    if (!('e*@V+'.includes(ch) || glow && glow.has(ch))) { const upO = !has(cx, cy - 1), lf = !has(cx + (o.flip ? 1 : -1), cy); if (upO || lf) c = lit(c, (upO ? .16 : 0) + (lf ? .1 : 0)); else if (!has(cx, cy + 1) || !has(cx + (o.flip ? -1 : 1), cy)) c = shade(c, .8); }
    ctx.fillStyle = css(c); ctx.fillRect(X(cx), y + cy * k, k, k); }
}
// a canvas with the hero standing in it
export function portrait(hero, k = 2, o = {}) {
  const A = hero.art, w = (A ? A.w : hero.spr[0].length) + 2, h = (A ? A.h : hero.spr.length) + 2 + (o.head || 0), c = document.createElement('canvas'); c.width = w * k; c.height = h * k; c.className = 'port';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; paintHero(x, hero, k, k * (1 + (o.head || 0)), k, o); return c;
}
