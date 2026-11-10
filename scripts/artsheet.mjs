// Renders hero art (src/art) to a PNG contact sheet so sprites can be reviewed without running the game.
//   node scripts/artsheet.mjs out.png [--full] [heroId ...]      (no ids = every hero)
// Default: idle, signature pose and a run frame, four heroes to a row.
// --full: one hero per row with every frame: idle, signature, six run frames, jump, fall, crouch, fly.
import fs from 'fs'; import zlib from 'zlib'; import path from 'path'; import { pathToFileURL } from 'url';
import { ARTS, lit, shade, inkOf } from '../src/art/kit.js';
const args = process.argv.slice(2), FULL = args.includes('--full'), out = args.find(a => a.endsWith('.png')) || 'artsheet.png', want = args.filter(a => !a.startsWith('--') && !a.endsWith('.png')), dir = path.resolve('src/art');
for (const f of fs.readdirSync(dir)) if (f.endsWith('.js') && f !== 'kit.js' && f !== 'index.js') await import(pathToFileURL(path.join(dir, f)).href);
const ids = want.length ? want : Object.keys(ARTS);
const S = FULL ? 5 : 6, CW = FULL ? 30 : 25, CH = 38, PER = FULL ? 1 : 4, CELLS = FULL ? 12 : 3, COLS = PER * CELLS, ROWS = Math.ceil(ids.length / PER);
const W = COLS * CW * S, H = ROWS * CH * S, px = new Uint8Array(W * H * 4);
const BG = [[92, 120, 160], [70, 84, 110]];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const b = BG[(Math.floor(y / (CH * S)) + (FULL ? 0 : Math.floor(x / (CELLS * CW * S)))) & 1], o = (y * W + x) * 4; px[o] = b[0]; px[o + 1] = b[1]; px[o + 2] = b[2]; px[o + 3] = 255; }
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W / S || y >= H / S) return; for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = ((y * S + j) * W + x * S + i) * 4; px[o] = c & 255; px[o + 1] = (c >> 8) & 255; px[o + 2] = (c >> 16) & 255; } };
// compose a frame: back layer, body rows above the leg line (dy = bob), legs from a stance frame or the base
function compose(A, o = {}) {
  const g = new Map(), set = (x, y, ch) => { if (ch !== '.') g.set(x + ',' + y, ch); };
  if (A.back) A.back.forEach((r, y) => [...r].forEach((ch, x) => set(x + Math.round(Math.sin(y * .5) * (y / A.h) * (o.sway || 0)), y, ch)));
  const up = o.upper || A.spr, dy = o.dy || 0, legRows = o.legs;
  const off = o.upper ? A.sigUp : 0;
  for (let y = -off; y < A.h; y++) { const isLeg = y >= A.anim.leg; const row = isLeg ? (legRows ? legRows[y - A.anim.leg] : A.spr[y]) : up[y + off]; [...row].forEach((ch, x) => set(x, y + (isLeg ? 0 : dy), ch)); }
  return g;
}
function draw(A, g, cx, cy) {
  const has = (x, y) => g.has(x + ',' + y), glow = new Set(['e', '*', '@', 'V', '+', ...A.glow]);
  for (const [k, ch] of g) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) if (!has(x + dx, y + dy)) put(cx + x + dx, cy + y + dy, inkOf(A.pal[ch])); }
  for (const [k, ch] of g) { const [x, y] = k.split(',').map(Number); let c = A.pal[ch];
    if (!glow.has(ch)) { const up = !has(x, y - 1), lf = !has(x - 1, y), dn = !has(x, y + 1), rt = !has(x + 1, y); if (up || lf) c = lit(c, (up ? .16 : 0) + (lf ? .1 : 0)); else if (dn || rt) c = shade(c, .8); }
    put(cx + x, cy + y, c); }
}
ids.forEach((id, n) => { const A = ARTS[id]; if (!A) { console.log('no art for', id); return; } const r = Math.floor(n / PER), oy = r * CH + (CH - A.h - 2), F = A.frames; let c = (n % PER) * CELLS;
  const cell = (g) => { draw(A, g, c * CW + ((CW - A.w) >> 1), oy); c++; };
  cell(compose(A));
  cell(compose(A, { upper: A.sig || A.spr, sway: 2 }));
  if (FULL) { F.run.forEach((lg, i) => cell(compose(A, { legs: lg, dy: F.bob[i], sway: 2 }))); cell(compose(A, { legs: F.jump })); cell(compose(A, { legs: F.fall, sway: 2 })); cell(compose(A, { legs: F.crouch, dy: 2 })); cell(compose(A, { legs: F.fly, sway: 3 })); }
  else cell(compose(A, { legs: F.run[0], sway: 2 }));
});
const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const chunk = (t, d) => { const b = Buffer.alloc(8 + d.length + 4); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(t), d])) >>> 0, 8 + d.length); return b; };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out, W + 'x' + H, ids.join(' '));
