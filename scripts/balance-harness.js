// Balance harness. Paste into the browser console of a dev build (npm run dev) with a sink listening on :5199,
// or just read window.__BAL afterwards. For every power of every hero it regenerates the map, stands the hero on
// flat ground with two 10M-hp dummies (14px and 60px ahead), casts once (hold powers: 60 frames), runs 220 frames
// and records [power, kind, energy per cast, cooldown, damage near, damage far, casts, error].
// scripts/balance-report.mjs turns the result into src/heroes/balance.js.
(async () => {
  const G = window.GAME, ST = G.ST, BAL = window.__BAL = {};
  const yieldNow = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  if (!G.ENEMY_TYPES.dummy) G.defineEnemy('dummy', { hp: 1e7, w: 7, h: 13, fly: false, score: 0, boom: 0, sprite: G.ENEMY_TYPES.chitauri.sprite, pal: G.ENEMY_TYPES.chitauri.pal, think(e) { e.vx *= .5; } });
  G.startRun('sandbox', 0, 'city'); await new Promise(r => setTimeout(r, 800)); G.SPAWN.peace = true;
  for (let hi = 0; hi < G.CHARS.length; hi++) {
    const c = G.CHARS[hi], rows = BAL[c.id] = [];
    for (let i = 0; i < c.powers.length; i++) {
      const pw = c.powers[i]; if (pw.tk) { rows.push([pw.n, 'tk']); continue; }
      G.regen(); G.setChar(hi); G.clearEnemies(); const p = G.pl_; for (let f = 0; f < 20; f++) G.tick(); const x0 = p.x, y0 = p.y;
      G.spawnEnemy('dummy', x0 + 14, y0 - 8); G.spawnEnemy('dummy', x0 + 60, y0 - 8); for (let f = 0; f < 15; f++) G.tick();
      const E = G.enemies.filter(e => e.def === G.ENEMY_TYPES.dummy); for (const e of E) e.hp = 1e7;
      p.hp = c.hp; p.en = 100; ST.ult = 100; ST.ultT = 0; ST.cd = 0; p.script = 0; ST.cur = i; p.face = 1;
      let spent = 0, casts = 0, cd = 0, err = ''; const hold = pw.kindC === 'hold';
      try {
        for (let f = 0; f < (hold ? 90 : 220); f++) {
          G.mouse.wx = (E[1] || { x: x0 + 60 }).x; G.mouse.wy = (E[1] || { y: y0 - 8 }).y - 2;
          if (hold ? f < 60 : f === 0) { const e0 = p.en; if (hold) ST.cd = 0; G.mouse.down = true; G.cast(); if (p.en < e0 - .001 || ST.cd > 0) casts++; spent += e0 - p.en; if (f === 0) cd = ST.cd; p.en = 100; } else G.mouse.down = false;
          p.hp = c.hp; G.tick();
        }
      } catch (e) { err = e.message; }
      G.mouse.down = false; const d = E.map(e => 1e7 - e.hp);
      rows.push([pw.n, pw.kindC, +(spent / (casts || 1)).toFixed(2), cd | 0, Math.round(d[0] || 0), Math.round(d[1] || 0), casts, err]);
      await yieldNow();
    }
  }
  try { await fetch('http://127.0.0.1:5199/?name=balance.json', { method: 'POST', body: JSON.stringify(BAL) }); } catch (e) {}
  console.log('balance run done', BAL);
})();
