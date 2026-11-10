// First-run coach: a small panel that teaches the controls by waiting for the player to use them.
// It shows once (localStorage), can be skipped, and Settings has a button to play it again.
import { ST } from '../state.js';
import { pl_ } from '../player.js';

const KEY = 'ironsorc.coach';
// each step: what to say, the keys to show, and when it counts as done (s = the coach's scratch state)
const STEPS = [
  { t: 'RUN AND JUMP', keys: ['A', 'D', 'SPACE'], d: 'Run with A and D. Jump with Space or W.', done: (s, p) => s.moved > 60 && s.jumped },
  { t: 'TAKE OFF', keys: ['SPACE', 'SPACE'], d: 'This hero flies. Double-tap jump (or press F) to take off, WASD to steer.', only: () => !!ST.CH.fly, done: (s, p) => p.fly },
  { t: 'USE A POWER', keys: ['CLICK'], d: 'Aim with the mouse and click. Hold the button for beams and streams.', done: s => s.casts >= 2 },
  { t: 'PICK ANOTHER POWER', keys: ['1-0', 'Q', 'E', 'WHEEL'], d: 'Every hero has 14 or more. The left stripe on a power tells you its kind: blue is hold, green moves you.', done: s => s.switched >= 2 },
  { t: 'BREAK SOMETHING', keys: ['CLICK'], d: 'Everything is made of pixels that fall. Blow a hole in a wall and watch what it was holding up.', done: s => s.t > 420 },
  { t: 'ULTIMATE', keys: ['G'], d: 'Damage fills the gold bar. When it is full, G fires your ultimate and wakes your trait for ten seconds.', done: s => s.ult || s.t > 1500 },
  { t: 'THE SPAWN MENU', keys: ['B'], d: 'In Sandbox, B opens enemies, props, terrain and tools. The Training Dummy never dies: use it to read your damage.', only: () => !!(ST.MODE && ST.MODE.sandbox), done: s => s.spawn || s.t > 900 },
];
let el = null, st = null, idx = -1;
const seen = () => { try { return localStorage.getItem(KEY) === 'done'; } catch (e) { return true; } };
function finish() { try { localStorage.setItem(KEY, 'done'); } catch (e) {} idx = -1; st = null; if (el) el.classList.remove('on'); }
function show(i) {
  idx = i; while (idx < STEPS.length && STEPS[idx].only && !STEPS[idx].only()) idx++;
  if (idx >= STEPS.length) { finish(); return; }
  const S = STEPS[idx], p = pl_; st = { t: 0, moved: 0, jumped: false, casts: 0, switched: 0, ult: false, spawn: false, x0: p.x, cur: ST.cur, cd: 0, en: p.en };
  if (!el) { el = document.createElement('div'); el.id = 'coach'; el.innerHTML = '<div class="cstep"></div><b class="ct"></b><div class="ck"></div><p class="cd"></p><button class="cskip">SKIP TUTORIAL</button>'; document.body.appendChild(el); el.querySelector('.cskip').onclick = e => { e.target.blur(); finish(); }; }
  const n = STEPS.filter(q => !q.only || q.only()).length, k = STEPS.slice(0, idx + 1).filter(q => !q.only || q.only()).length;
  el.querySelector('.cstep').textContent = 'HOW TO PLAY · ' + k + ' / ' + n; el.querySelector('.ct').textContent = S.t; el.querySelector('.cd').textContent = S.d;
  const ck = el.querySelector('.ck'); ck.innerHTML = ''; for (const key of S.keys) { const b = document.createElement('kbd'); b.textContent = key; ck.appendChild(b); }
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('on', 'pop');
}
// start (or restart) the coach for this run
export function startCoach(force) { if (!force && seen()) return; if (force) { try { localStorage.removeItem(KEY); } catch (e) {} } show(0); }
export const coachOn = () => idx >= 0;
// once a tick while playing
export function updCoach() {
  if (idx < 0 || ST.GS !== 'play') { if (el && idx >= 0) el.classList.toggle('on', ST.GS === 'play'); return; }
  if (el && !el.classList.contains('on')) el.classList.add('on'); // back from a pause
  const p = pl_, s = st; s.t++; s.moved += Math.abs(p.x - s.x0); s.x0 = p.x; if (!p.ground && p.vy < -1) s.jumped = true;
  if (ST.cd > s.cd || p.en < s.en - 2) s.casts++; s.cd = ST.cd; s.en = p.en; if (ST.cur !== s.cur) { s.switched++; s.cur = ST.cur; }
  if (ST.ultT > 0) s.ult = true; if (window.GAME && window.GAME.SPAWN.open) s.spawn = true;
  if (STEPS[idx].done(s, p)) show(idx + 1);
}

ST.coachHook = () => startCoach(false); ST.coachTick = updCoach; // modes/core.js starts it with a run, loop.js ticks it
