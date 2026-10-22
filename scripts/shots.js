// Heroes Sandbox screenshot helpers for art passes. Load in the dev server page:
//   const s=document.createElement('script');s.src='/scripts/shots.js?'+Date.now();document.body.appendChild(s);
// SHOTS.titan(id,map,dx,dy)  freeze a titan in view      SHOTS.map(map,fx,camY)  freeze the camera on a map
// SHOTS.lineup(ids,scale)    hero sprites side by side    SHOTS.over(maps)        whole-map overviews
// SHOTS.close()              remove the overlay canvas    (all of them hide the HUD; the game loop keeps rendering)
(() => {
  const G = window.GAME, ST = G.ST;
  let css = document.getElementById('shotcss');
  if (!css) { css = document.createElement('style'); css.id = 'shotcss'; document.head.appendChild(css); }
  css.textContent = '#hud,#wavebox,#scorebox,#fps,#top,#help,#powers,#toolchip,#aoechip,#banner,#bossbar{display:none!important}';
  const overlay = () => { let c = document.getElementById('lineup'); if (!c) { c = document.createElement('canvas'); c.id = 'lineup'; c.style.cssText = 'position:fixed;left:0;top:0;z-index:999;'; document.body.appendChild(c); } c.width = innerWidth; c.height = innerHeight; return c; };
  const run = (map, hero = 0) => { G.hitstop = 0; G.startRun('sandbox', hero, map); G.SPAWN.god = true; G.SPAWN.peace = true; document.body.classList.remove('cine'); };
  window.SHOTS = {
    titan(id, map, dx = 0, dy = 0, ticks = 60) { run(map); const p = G.pl_, e = G.spawnTitan(id, p.x + 160); for (let i = 0; i < ticks; i++) G.tick(); document.body.classList.remove('cine'); G.hitstop = 1e9; ST.GS = 'shot'; G.setCam(e.x - 240 + dx, e.y - 135 + dy); G.render(); return [e.x | 0, e.y | 0]; },
    map(map, fx, camY, hero = 0) { run(map, hero); for (let i = 0; i < 20; i++) G.tick(); ST.GS = 'shot'; const x = fx * G.W | 0; G.setCam(x - 240, camY); G.render(); return x; },
    hero(id, map = 'city', pose = null) { const h = G.CHARS.findIndex((c) => c.id === id); run(map, h); for (let i = 0; i < 30; i++) G.tick(); ST.GS = 'shot'; const p = G.pl_; G.setCam(p.x - 240, p.y - 160); G.render(); return [p.x | 0, p.y | 0]; },
    lineup(ids, S = 4) { const c = overlay(), g = c.getContext('2d'); g.fillStyle = '#3a4250'; g.fillRect(0, 0, c.width, c.height); g.font = '12px monospace'; let x = 10, y = 10, rowH = 0;
      for (const id of ids) { const ch = G.CHARS.find((q) => q.id === id); if (!ch) continue; const spr = ch.spr, pal = ch.pal, w = spr[0].length, h = spr.length; if (x + w * S > c.width - 10) { x = 10; y += rowH + 20; rowH = 0; }
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const k = spr[yy][xx]; if (k === '.') continue; const v = pal[k]; g.fillStyle = v === undefined ? '#f0f' : `rgb(${v & 255},${(v >> 8) & 255},${(v >> 16) & 255})`; g.fillRect(x + xx * S, y + yy * S, S, S); }
        g.fillStyle = '#fff'; g.fillText(id, x, y + h * S + 12); x += w * S + 18; rowH = Math.max(rowH, h * S); } },
    over(maps, x0 = 0, span = 0) { const c = overlay(), x2 = c.getContext('2d'), CW = c.width; x2.fillStyle = '#000'; x2.fillRect(0, 0, c.width, c.height); let oy = 0; const errs = [];
      for (const m of maps) { try { run(m); } catch (e) { errs.push(m + ': ' + e.message); continue; } const W = G.W, H = G.H, sc = CW / (span || W), h = Math.ceil(H * sc), im = x2.createImageData(CW, h), d = new Uint32Array(im.data.buffer), t = G.t, col = G.col, bg = G.bg, bgB = G.bgB;
        for (let Y = 0; Y < h; Y++) for (let X = 0; X < CW; X++) { const i = Math.floor(Y / sc) * W + x0 + Math.floor(X / sc), v = t[i] ? col[i] : (bgB[i] ? bg[i] : 0); d[Y * CW + X] = v ? (v | 0xff000000) : 0xff201418; }
        x2.putImageData(im, 0, oy); x2.fillStyle = '#fff'; x2.font = '12px monospace'; x2.fillText(m + ' ' + W + 'x' + H, 4, oy + 12); oy += h + 4; }
      return errs; },
    close() { const c = document.getElementById('lineup'); if (c) c.remove(); },
  };
})();
