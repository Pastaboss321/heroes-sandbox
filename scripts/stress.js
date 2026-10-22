// Heroes Sandbox support-check stress test. Runs inside the game page (dev server), drives window.GAME.
// Fires every power of a few heavy heroes in one spot on City without rebuilding the map (like the sweep),
// and records every slow tick with its phase times (ST.ph), support-check split (ST.scT, ST.scN) and dirty boxes.
//   const s=document.createElement('script');s.src='/scripts/stress.js?'+Date.now();document.body.appendChild(s);
// then read window.STRESS (window.STRESS.done turns true at the end).
(async () => {
  const G = window.GAME, ST = G.ST;
  const out = { done: false, slow: [], ticks: 0, sum: 0, max: 0, errors: [], t0: Date.now() };
  window.STRESS = out;
  const HEROES = (window.STRESS_HEROES || ['hulk', 'thor', 'doom', 'thanos']).map((id) => G.CHARS.findIndex((c) => c.id === id)).filter((h) => h >= 0);
  const yieldUI = () => new Promise((r) => setTimeout(r, 0));
  const tick = (n, tag) => {
    for (let i = 0; i < n; i++) {
      ST.scT = null; ST.scN = null; ST.lastBoxes = null;
      const a = performance.now();
      try { G.tick(); } catch (e) { out.errors.push(tag + ': ' + e.message); return; }
      const ms = performance.now() - a;
      out.ticks++; out.sum += ms; out.max = Math.max(out.max, ms);
      if (ms > 25) out.slow.push({ tag, ms: +ms.toFixed(1), ph: Object.fromEntries(Object.entries(ST.ph || {}).filter(([, v]) => v > 2).map(([k, v]) => [k, +v.toFixed(1)])), scT: ST.scT && ST.scT.map((v) => +v.toFixed(1)), scN: ST.scN && ST.scN.slice(), boxes: ST.lastBoxes && ST.lastBoxes.map((b) => b.slice()), prof: ST.prof && { step: +ST.prof.step.toFixed(1), bodies: +ST.prof.bodies.toFixed(1), support: +ST.prof.support.toFixed(1) }, bodies: G.bodies.length, np: G.np });
    }
  };
  const aimAt = (x, y) => { const [cx, cy] = G.cam; G.mouse.sx = x - cx; G.mouse.sy = y - cy; G.mouse.wx = x; G.mouse.wy = y; };
  const a0 = performance.now();
  G.startRun('sandbox', HEROES[0], 'city'); G.SPAWN.god = true; G.SPAWN.peace = false;
  out.genMs = +(performance.now() - a0).toFixed(0);
  { const a = performance.now(); tick(1, 'first'); out.firstTick = +(performance.now() - a).toFixed(1); }
  for (const h of HEROES) {
    G.setChar(h);
    const p = G.pl_;
    for (let k = 0; k < G.CH.powers.length; k++) {
      const tag = G.CH.id + '/' + G.CH.powers[k].n;
      tick(40, tag + '/settle');
      G.clearEnemies();
      G.spawnEnemy('chitauri', p.x + 50, p.y - 8);
      p.en = 100; G.selPower(k); aimAt(p.x + 70, p.y - 24);
      G.mouse.down = true; tick(20, tag); G.mouse.down = false;
      tick(60, tag + '/after');
      await yieldUI();
    }
  }
  out.avg = +(out.sum / out.ticks).toFixed(2); out.max = +out.max.toFixed(1);
  out.secs = ((Date.now() - out.t0) / 1000).toFixed(0);
  out.done = true;
  G.showMenu();
})();
