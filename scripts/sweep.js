// Heroes Sandbox regression sweep. Runs inside the game page (dev server), drives window.GAME directly.
// Load it in the browser console or via the Claude browser tool:
//   const s=document.createElement('script');s.src='/scripts/sweep.js?'+Date.now();document.body.appendChild(s);
// then read window.SWEEP (window.SWEEP.done turns true at the end).
// It fires every power of every hero on the ground and high above the map, regenerates every map,
// and runs every mode for a while, recording exceptions and the slowest sim steps.
(async () => {
  const G = window.GAME;
  const out = { done: false, errors: [], slow: [], heroes: {}, maps: {}, modes: {}, space: {}, t0: Date.now() };
  window.SWEEP = out;
  const errs = [];
  const onErr = (e) => errs.push(String(e.message || e.reason || e));
  addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
  const yieldUI = () => new Promise((r) => setTimeout(r, 0));
  const tick = (n, tag) => {
    for (let i = 0; i < n; i++) {
      const a = performance.now();
      try { G.tick(); } catch (e) { out.errors.push(tag + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); return false; }
      const ms = performance.now() - a;
      if (ms > 40) out.slow.push([tag, +ms.toFixed(1)]);
    }
    return true;
  };
  const aimAt = (x, y) => { // the game re-derives mouse.wx/wy from the screen position every tick
    const [cx, cy] = G.cam; G.mouse.sx = x - cx; G.mouse.sy = y - cy; G.mouse.wx = x; G.mouse.wy = y;
  };
  const mode0 = 'sandbox';
  const MAPS = Object.keys(G.MAPDEFS);
  // ---- every hero, every power, on the ground then 300 px above the map
  for (let h = 0; h < G.CHARS.length; h++) {
    const id = G.CHARS[h].id;
    G.startRun(mode0, h, 'city'); G.SPAWN.god = true; G.SPAWN.peace = false;
    const p = G.pl_, res = {}, sp = {};
    for (const space of [false, true]) {
      for (let k = 0; k < G.CH.powers.length; k++) {
        const name = G.CH.powers[k].n;
        tick(40, id + '/' + name + '/settle');
        G.clearEnemies();
        if (space) { p.y = -300; p.vy = 0; }
        const e1 = G.spawnEnemy('chitauri', p.x + 50, p.y - 8), e2 = G.spawnEnemy('ultron', p.x + 70, p.y - 40);
        p.en = 100; G.selPower(k); aimAt(p.x + 70, p.y - 24);
        const sh0 = G.shots.length, np0 = G.np, b0 = G.bodies.length, hp0 = (e1 ? e1.hp : 0) + (e2 ? e2.hp : 0), en0 = p.en, x0 = p.x, y0 = p.y;
        let fx = 0; const fxN = () => G.rings.length + G.flashes.length + G.comics.length + G.waves.length;
        const fx0 = fxN();
        const before = errs.length;
        G.mouse.down = true;
        let ok = true, minEn = p.en; // hold 20 ticks so held beams and shields register
        for (let i = 0; i < 20 && ok; i++) { ok = tick(1, id + '/' + name + (space ? '/space' : '')); minEn = Math.min(minEn, p.en); fx = Math.max(fx, fxN() - fx0); }
        G.mouse.down = false;
        ok = ok && tick(60, id + '/' + name + (space ? '/space' : '') + '/after');
        const hp1 = (e1 && e1.hp > 0 ? e1.hp : 0) + (e2 && e2.hp > 0 ? e2.hp : 0);
        const did = en0 - minEn > .5 || G.shots.length > sh0 || G.np > np0 + 5 || G.bodies.length > b0 || hp1 < hp0 || fx > 0 || Math.hypot(p.x - x0, p.y - y0) > 12;
        (space ? sp : res)[name] = ok && errs.length === before ? (did ? 'ok' : 'idle') : 'ERR';
        if (space) { p.y = -300; p.vy = 0; }
      }
      await yieldUI();
    }
    out.heroes[id] = res; out.space[id] = sp;
  }
  // ---- every map: generate and run the world for 5 s
  for (const m of MAPS) {
    const a = performance.now();
    try { G.startRun(mode0, 0, m); } catch (e) { out.maps[m] = 'ERR ' + e.message; continue; }
    const gen = performance.now() - a;
    const ok = tick(300, 'map/' + m);
    out.maps[m] = { ok, genMs: +gen.toFixed(0), bodies: G.bodies.length, particles: G.np };
    await yieldUI();
  }
  // ---- every mode: start it and let it play itself for 15 s (god mode so the run doesn't end)
  for (const id in G.MODES) {
    try { G.startRun(id, 0, 'city'); G.SPAWN.god = true; } catch (e) { out.modes[id] = 'ERR ' + e.message; continue; }
    const ok = tick(900, 'mode/' + id);
    out.modes[id] = { ok, enemies: G.enemies.length, hud: G.MODE && G.MODE.hud ? G.MODE.hud(G.MS) : '' };
    await yieldUI();
  }
  out.pageErrors = errs.slice(0, 40);
  out.secs = ((Date.now() - out.t0) / 1000).toFixed(0);
  out.done = true;
  removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr);
  G.showMenu();
})();
