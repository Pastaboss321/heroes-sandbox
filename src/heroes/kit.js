// The ability system. One place decides what a power is and how a cast runs.
//
//   A power is one object in its hero's own file (src/heroes/<hero>.js), in bar order, the ultimate last:
//     { n:'Name', fn(a,p,use){...},        the power: a = aim, p = player, use(cost) spends energy and returns a bool
//       ult:true,                          the hero's one ultimate (costs the meter, not energy; G fires it)
//       tk:{...},                          a held grab power handled by player.js instead of fn
//       kind:'tap'|'hold'|'move',          optional HUD hint; worked out from the code when absent
//       cost, cd }                         optional: declared energy cost and cooldown; the pipeline spends and sets them
//   finalizeKits() runs once over the roster: it checks every kit (unique names, one ultimate, ultimate last),
//   stamps each power with its hero, HUD kind, signature effect (heroes/sigfx.js) and balance multipliers (heroes/balance.js),
//   and builds the name index. Nothing patches a kit after that.
//   cast() is the only path from a key press to a power: energy pricing (area scale, trait, balance), the ultimate
//   meter, the power itself, then the hero's cast flare, signature effect and trait reaction.
import { hand, pl_ } from '../player.js';
import { vfxCast } from '../render/vfxcore.js';
import { ST } from '../state.js';
import { beams, fxWord, rings } from '../render/fx.js';
import { snd } from '../sfx.js';
import { SPAWN, aim } from './powers.js';
import { aoeCost } from './aoe.js';
import { sigOf } from './sigfx.js';
import { traitCast, traitCost, traitPre, traitUlt } from './traits.js';
import { pwDiv } from '../ui/hud.js';
import { setRoster } from './kitlib.js';
import { BALANCE, STATS } from './balance.js'; // every tuning number: cost and cooldown multipliers, hero stat overrides


export const KITS = new Map(); // hero id -> roster entry
const BY_NAME = new Map();     // 'heroId/Power Name' -> power

function kindOf(pw) {
  if (pw.ult) return 'ult'; if (pw.tk) return 'hold'; if (pw.kind) return pw.kind;
  const s = String(pw.fn);
  if (/p\.script=2|scriptMove|p\.slam=true/.test(s)) return 'move';
  if (pw.cd == null && !/ST\.cd=/.test(s)) return 'hold';
  return 'tap';
}
export function finalizeKits(CHARS) {
  setRoster(CHARS);
  for (const c of CHARS) {
    const seen = new Set(), bal = BALANCE[c.id] || {}, st = STATS[c.id];
    if (st) Object.assign(c, st);
    const ults = c.powers.filter(pw => pw.ult);
    if (ults.length !== 1) console.warn('kit', c.id, 'has', ults.length, 'ultimates');
    else if (c.powers[c.powers.length - 1] !== ults[0]) { c.powers.splice(c.powers.indexOf(ults[0]), 1); c.powers.push(ults[0]); }
    c.powers.forEach((pw, i) => {
      if (seen.has(pw.n)) console.warn('kit', c.id, 'defines', pw.n, 'twice'); seen.add(pw.n);
      if (pw.cost != null || pw.cd != null) { const f = pw.fn; pw.fn = (a, p, use) => { if (pw.cost != null && !use(pw.cost)) return; if (pw.cd != null) ST.cd = pw.cd; return f(a, p, use); }; pw.src = f; }
      pw.hero = c.id; pw.i = i; pw.kindC = kindOf(pw.src ? { ...pw, fn: pw.src } : pw); pw.sig = sigOf(c.id, pw.n);
      const b = bal[pw.n]; pw.costK = b && b.cost != null ? b.cost : 1; pw.cdK = b && b.cd != null ? b.cd : 1;
      BY_NAME.set(c.id + '/' + pw.n, pw);
    });
    for (const n in bal) if (!seen.has(n)) console.warn('balance entry for a missing power:', c.id, n);
    KITS.set(c.id, c);
  }
}
export const powerOf = (heroId, name) => BY_NAME.get(heroId + '/' + name);
// what the HUD shows for a power: 'ult', 'move' (steers the hero), 'hold' (no cooldown: hold the button) or 'tap'
export const powerKind = pw => pw.kindC || kindOf(pw);

// run a power's own code, then its signature effect if it really fired. Returns whether it fired.
export function firePower(pw, a, p, use) {
  const c0 = ST.cd, e0 = p.en, ult0 = pw.ult && ST.ultT === 200, b0 = beams.length, r0 = rings.length, ox = p.x, oy = p.y;
  pw.fn(a, p, use);
  if (ST.cd > c0 && pw.cdK !== 1) ST.cd = c0 + (ST.cd - c0) * pw.cdK;
  const fired = ST.cd > c0 || p.en < e0 - .01 || ult0;
  const g = pw.sig; if (!fired || !g) return fired;
  const fresh = ST.frame - (pw.sigT ?? -99) > 8; pw.sigT = ST.frame; if (!fresh && !g.opt.every) return fired;
  if (g.opt.st) { for (let i = b0; i < beams.length; i++) beams[i].st = g.opt.st; for (let i = r0; i < rings.length; i++) rings[i].st = g.opt.st; }
  try { g.f({ a, p, mx: a.h.x + a.dx * a.d, my: a.h.y + a.dy * a.d, hx: a.h.x, hy: a.h.y, ang: Math.atan2(a.dy, a.dx), ox, oy, fresh }); } catch (e) { console.warn('sigfx', pw.hero, pw.n, e); }
  return fired;
}

let ultCine = 0;
export let selPowerHook = () => {}; export const setSelHook = f => { selPowerHook = f; };
// G: fire the hero's ultimate whatever power is selected
export function castUlt() { const i = ST.CH.powers.findIndex(pw => pw.ult); if (i < 0) return; const k = ST.cur; ST.cur = i; ST.cd = 0; cast(); if (!(ST.ultT > 0)) ST.cur = k; else selPowerHook(i); }
export function cast() {
  const p = pl_; if (ST.cd > 0 || p.script > 0) return; const pw = ST.CH.powers[ST.cur]; if (!pw || pw.tk) return; const a = aim(); if (!p.fly || Math.abs(p.vx) < .5) p.face = a.dx < 0 ? -1 : 1;
  if (p.stealth > 0 && !pw.quiet && pw.n !== 'Stealth Mode' && pw.n !== 'Energy Shield') { p.stealth = 0; fxWord(p.x, p.y - ST.PH - 6, 'DECLOAK', .7, '#bfe3ff', true); }
  let denied = false; const ck = aoeCost() * pw.costK;
  let use = c => { c *= ck; c = traitCost(c, pw, p); if (p.en < c) { denied = true; return false; } p.en -= c; traitPre(pw, p, c); return true; }; // the hero's trait can reprice a power and react before it lands (heroes/traits.js)
  if (pw.ult) { // ultimates cost the meter, not energy (heroes/abilities.js)
    if (!(ST.ultT > 0)) {
      if (ST.ult < 100 && !SPAWN.inf) { if (ST.frame - (p.denyT || -99) > 30) { p.denyT = ST.frame; fxWord(p.x, p.y - ST.PH - 8, 'ULTIMATE ' + (ST.ult | 0) + '%', .8, '#ffc93c', true); snd('deny', p.x, p.y, { v: .5 }); } return; }
      ST.ult = 0; ST.ultT = 200; ST.hitstop = Math.max(ST.hitstop, 6); fxWord(p.x, p.y - ST.PH - 18, pw.n.toUpperCase() + '!', 1.7, '#ffc93c', true); snd('charge', p.x, p.y, { pitch: .5, v: 1 });
      document.body.classList.add('cine'); clearTimeout(ultCine); ultCine = setTimeout(() => document.body.classList.remove('cine'), 1500);
    }
    use = () => true;
  }
  const c0 = ST.cd, e0 = p.en, u0 = ST.ultT; const fired = firePower(pw, a, p, use); p.castF = 12; if (ST.cd > c0) p.recoilF = 6;
  if (fired) vfxCast(pw, a, p, hand); // the hand flares in the hero's style (render/vfxcore.js)
  if (pw.ult && u0 === 200) traitUlt(pw, p, a); else if (ST.cd > c0 || p.en < e0 - .01) traitCast(pw, p, a); // the ultimate awakens the trait for ten seconds
  if (pw.ult && ST.cd > c0) ST.ultT = 0; // a one-shot ultimate is spent; a held one keeps going for a few seconds
  if (denied && ST.frame - (p.denyT || -99) > 20) { p.denyT = ST.frame; snd('deny', p.x, p.y, { v: .6 }); const d = pwDiv.children[ST.cur]; if (d) { d.classList.remove('deny'); void d.offsetWidth; d.classList.add('deny'); } }
  if (ST.cd > c0) ST.cdMax = ST.cd;
}
