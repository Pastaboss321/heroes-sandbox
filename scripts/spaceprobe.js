// Heroes Sandbox space probe. Runs inside the game page (dev server), drives window.GAME directly.
//   const s=document.createElement('script');s.src='/scripts/spaceprobe.js?'+Date.now();document.body.appendChild(s);
// then read window.PROBE (PROBE.done turns true at the end).
// For every hero and power it fires the power at two flying enemies, once standing on the ground
// and once hovering high in the sky (y = -300 by default, PROBE_Y to change), and records the damage dealt
// and how far the hero moved. A power that hurts enemies on the ground but barely touches them in the sky,
// or that throws the hero somewhere strange up there, is listed in PROBE.suspect.
(async () => {
  const G = window.GAME;
  const SKYY = window.PROBE_Y ?? -300;
  const out = { done: false, rows: [], suspect: [], errors: [] };
  window.PROBE = out;
  const yieldUI = () => new Promise((r) => setTimeout(r, 0));
  const aimAt = (x, y) => { const [cx, cy] = G.cam; G.mouse.sx = x - cx; G.mouse.sy = y - cy; G.mouse.wx = x; G.mouse.wy = y; };
  const only = window.PROBE_ONLY; // optional list of hero ids
  const trial = (k, space) => {
    const p = G.pl_;
    for (let i = 0; i < 40; i++) G.tick();
    G.clearEnemies();
    if (space) { p.y = SKYY; p.vy = 0; p.vx = 0; p.fly = !!G.CH.fly || p.fly; }
    G.snapCam();
    const e1 = G.spawnEnemy('chitauri', p.x + 50, p.y - 10), e2 = G.spawnEnemy('chitauri', p.x + 66, p.y - 16);
    for (const e of [e1, e2]) if (e) { e.hp = e.def.hp = 400; e.cd = 9999; }
    p.en = 100; G.selPower(k); aimAt(p.x + 50, p.y - 10);
    const hp0 = (e1 ? e1.hp : 0) + (e2 ? e2.hp : 0), x0 = p.x, y0 = p.y;
    let maxD = 0;
    G.mouse.down = true;
    for (let i = 0; i < 24; i++) { aimAt(x0 + 50, y0 - 10); if (space && !G.CH.fly) { p.vy = Math.min(p.vy, 0); } G.tick(); if (e1) { e1.x = x0 + 50; e1.y = y0 - 10; } if (e2) { e2.x = x0 + 66; e2.y = y0 - 16; } maxD = Math.max(maxD, Math.hypot(p.x - x0, p.y - y0)); }
    G.mouse.down = false;
    for (let i = 0; i < 90; i++) { aimAt(x0 + 50, y0 - 10); if (space && !G.CH.fly) { p.vy = Math.min(p.vy, 0); } G.tick(); if (e1 && e1.hp > 0) { e1.x = x0 + 50; e1.y = y0 - 10; } if (e2 && e2.hp > 0) { e2.x = x0 + 66; e2.y = y0 - 16; } maxD = Math.max(maxD, Math.hypot(p.x - x0, p.y - y0)); }
    const hp1 = (e1 && e1.hp > 0 ? e1.hp : 0) + (e2 && e2.hp > 0 ? e2.hp : 0);
    return { dmg: Math.round(hp0 - hp1), move: Math.round(maxD), endY: Math.round(p.y - y0) };
  };
  for (let h = 0; h < G.CHARS.length; h++) {
    const id = G.CHARS[h].id;
    if (only && !only.includes(id)) continue;
    G.startRun('sandbox', h, window.PROBE_MAP || 'city'); G.SPAWN.god = true; G.SPAWN.peace = true;
    for (let k = 0; k < G.CH.powers.length; k++) {
      const name = G.CH.powers[k].n;
      let g, s;
      try { G.startRun('sandbox', h, window.PROBE_MAP || 'city'); G.SPAWN.god = true; G.SPAWN.peace = true; g = trial(k, false); } catch (e) { out.errors.push(id + '/' + name + '/ground: ' + e.message); continue; }
      try { G.startRun('sandbox', h, window.PROBE_MAP || 'city'); G.SPAWN.god = true; G.SPAWN.peace = true; s = trial(k, true); } catch (e) { out.errors.push(id + '/' + name + '/space: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); continue; }
      const row = { id, name, g, s };
      out.rows.push(row);
      if ((g.dmg > 10 && s.dmg < g.dmg * 0.25) || (s.endY > 150) || (g.move > 20 && s.move < 4 && g.dmg < 5)) out.suspect.push(id + '/' + name + ' ground ' + JSON.stringify(g) + ' sky ' + JSON.stringify(s));
      await yieldUI();
    }
  }
  out.done = true;
  G.showMenu();
})();
