// Dev-only test helpers (loaded by main.js under `npm run dev`, never in a build). window.DEV:
//   smoke(from,to)       cast every power of heroes [from,to) in the running sandbox; returns the errors
//   shot(name,...)       crop the view around the hero, upscale it, POST it as a PNG to a local sink on :5199
//   strip(name,heroIdx)  one image of the hero in every stance: idle, run x4, jump, fall, crouch, fly, signature, aim, punch
const G = () => window.GAME;
const post = async (name, body) => { try { const r = await fetch('http://127.0.0.1:5199/?name=' + name, { method: 'POST', body }); return await r.text(); } catch (e) { return 'no sink: ' + e.message; } };
const view = () => document.getElementById(G().ST.GL ? 'gl' : 'view');
function smokeHero(hi, frames = 25) {
  const g = G(), ST = g.ST, errs = [], c = g.CHARS[hi]; try { g.setChar(hi); } catch (e) { return [c.id + ' setChar ' + e.message]; }
  const p = g.pl_, en = Object.keys(g.ENEMY_TYPES)[0];
  for (let i = 0; i < c.powers.length; i++) { const pw = c.powers[i]; try {
    p.hp = c.hp; p.en = 100; ST.ult = 100; ST.ultT = 0; ST.cd = 0; p.script = 0; ST.cur = i; g.mouse.wx = p.x + 60; g.mouse.wy = p.y - 20;
    if (g.enemies.length < 2) { try { g.spawnEnemy(en, p.x + 50, p.y - 10); } catch (e) {} }
    g.mouse.down = true; for (let f = 0; f < frames; f++) { if (f < 6) { ST.cd = Math.min(ST.cd, 0); g.cast(); } if (f === 6) g.mouse.down = false; g.tick(); if (f % 6 === 0) g.render(); }
  } catch (e) { errs.push(c.id + ' / ' + pw.n + ': ' + e.message + ' @' + String(e.stack).split('\n')[1]); g.mouse.down = false; } }
  return errs;
}
window.DEV = {
  // stand next to the first placed set piece of a kind and photograph it
  async goto(name, file, dx = 20, n = 0) { const g = G(), p = g.pl_, pc = g.PLACED.filter(q => q[0] === name)[n]; if (!pc) return 'none'; p.x = pc[1] * 1.5 + dx; p.y = pc[2] * 1.5 - 30; p.vx = p.vy = 0; g.SPAWN.peace = true; for (let f = 0; f < 50; f++) g.tick(); g.snapCam && g.snapCam(); for (let f = 0; f < 5; f++) g.tick(); return this.shot(file, 200, 130, 4, 10, -40); },
  mapTest(ids) { const g = G(), out = {}; for (const id of ids) { try { g.startRun('sandbox', 0, id); const pc = {}; for (const p of g.PLACED) pc[p[0] + ':' + p[3][0]] = (pc[p[0] + ':' + p[3][0]] || 0) + 1; let err = ''; g.mapEvent(); try { for (let f = 0; f < 330; f++) { g.tick(); if (f % 30 === 0) g.render(); } } catch (e) { err = e.message + String(e.stack).split('\n')[1]; } out[id] = { placed: pc, n: g.PLACED.length, err }; } catch (e) { out[id] = { fatal: e.message + String(e.stack).split('\n')[1] }; } } return out; },
  smoke(a = 0, b = G().CHARS.length) { const out = []; for (let i = a; i < b; i++) out.push(...smokeHero(i)); for (let f = 0; f < 200; f++) { try { G().tick(); if (f % 10 === 0) G().render(); } catch (e) { out.push('late ' + e.message + String(e.stack).split('\n')[1]); break; } } return out; },
  async shot(name, wW = 90, wH = 70, S = 6, ox = 0, oy = -12) { const g = G(), p = g.pl_; g.render(); const k = g.ST.scale, c = document.createElement('canvas'); c.width = wW * S; c.height = wH * S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(view(), (p.x + ox - g.ST.CX - wW / 2) * k, (p.y + oy - g.ST.CY - wH / 2) * k, wW * k, wH * k, 0, 0, wW * S, wH * S); return post(name, c.toDataURL('image/png')); },
  async full(name, S = 1) { const g = G(); g.render(); const v = view(), c = document.createElement('canvas'); c.width = v.width * S; c.height = v.height * S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(v, 0, 0, c.width, c.height); return post(name, c.toDataURL('image/png')); },
  async strip(name, hs, S = 4, wW = 44, wH = 52) { const g = G(), p = g.pl_; hs = [].concat(hs);
    const st = [{}, { walkPh: .6, ground: true, vx: 1.5 }, { walkPh: 1.7, ground: true, vx: 1.5 }, { walkPh: 2.8, ground: true, vx: 1.5 }, { walkPh: 3.9, ground: true, vx: 1.5 }, { ground: false, vy: -3 }, { ground: false, vy: 3 }, { crouch: 10 }, { fly: true, vx: 3, ground: false }, { sigF: 10 }, { castF: 8 }, { punchF: 8 }];
    const k = g.ST.scale, c = document.createElement('canvas'); c.width = wW * S * st.length; c.height = wH * S * hs.length; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    hs.forEach((hi, r) => { g.setChar(hi); g.SPAWN.peace = true; for (let f = 0; f < 30; f++) g.tick(); const keep = { ...p }; g.mouse.wx = p.x + 60; g.mouse.wy = p.y - 30;
      st.forEach((o, i) => { Object.assign(p, keep, { walkPh: 0, castF: 0, sigF: 0, punchF: 0, crouch: 0, landF: 0, hist: [] }, o); g.render(); x.drawImage(view(), (p.x - g.ST.CX - wW / 2) * k, (p.y - 10 - g.ST.CY - wH / 2) * k, wW * k, wH * k, i * wW * S, r * wH * S, wW * S, wH * S); });
      Object.assign(p, keep); });
    return post(name, c.toDataURL('image/png')); },
};
