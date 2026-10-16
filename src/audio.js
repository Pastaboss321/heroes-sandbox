// Procedural sound effects: every sound is synthesised with WebAudio (noise bursts, filtered
// oscillators, metallic partials), so the game ships no audio files.
//
//   initAudio()            call from a user gesture (browsers block audio until then)
//   play(name, o)          one-shot. o: {v: volume 0..1, pan: -1..1, size: 0..1+, pitch: multiplier}
//   loop(id, name, o)      a sustained sound (beams, flames). Call every frame while it should
//                          keep sounding; it fades out ~0.1 s after the last call.
//   ambience(name, level)  background beds (rain, fire crackle, lava) mixed toward `level`
//   setVolume(v)           master volume 0..1
//   tickAudio()            once per frame: retires stale loops
let ctx = null, master = null, bus = null, noise = null, vol = 0.7, muted = false;
const lastPlay = Object.create(null), loops = Object.create(null), amb = Object.create(null);
let voices = 0;
const MAX_VOICES = 40;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25;
  master = ctx.createGain(); master.gain.value = muted ? 0 : vol;
  bus = ctx.createGain(); bus.gain.value = 1;
  bus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  // two seconds of white noise, reused by every noise voice
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setVolume(v) { vol = v; if (master) master.gain.value = muted ? 0 : v; }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : vol; }
export const audioReady = () => !!ctx && ctx.state === 'running';

// ---- building blocks
function out(o) { // per-voice output: gain -> stereo pan -> bus
  const g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  g.gain.value = 0;
  if (p) { p.pan.value = Math.max(-1, Math.min(1, o.pan || 0)); g.connect(p); p.connect(bus); g.__pan = p; } else g.connect(bus);
  return g;
}
function env(g, t, a, peak, dec, sus = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dec);
}
function nz(t, dur) {
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  voices++; s.onended = () => { voices--; s.disconnect(); };
  return s;
}
function osc(type, f, t, dur) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  o.start(t); o.stop(t + dur + 0.05);
  voices++; o.onended = () => { voices--; o.disconnect(); };
  return o;
}
function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
const dist = (() => { let c = null; return () => { if (c) return c; const n = 1024; c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(x * 3.2); } return c; }; })();

// noise burst through a filter, with an optional cutoff sweep
function burst(o, t, { type = 'lowpass', f0 = 2000, f1 = 200, q = 0.7, a = 0.004, dur = 0.3, peak = 0.6 }) {
  const s = nz(t, dur + a), b = filt(type, f0, q), g = out(o);
  b.frequency.setValueAtTime(f0, t); b.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + a + dur);
  s.connect(b); b.connect(g); env(g, t, a, peak * (o.v ?? 1), dur);
}
// pitched tone with a glide
function tone(o, t, { type = 'sine', f0 = 440, f1 = f0, a = 0.003, dur = 0.2, peak = 0.4, lp = 0 }) {
  const p = o.pitch || 1, s = osc(type, f0 * p, t, dur + a), g = out(o);
  s.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * p), t + a + dur);
  if (lp) { const b = filt('lowpass', lp); s.connect(b); b.connect(g); } else s.connect(g);
  env(g, t, a, peak * (o.v ?? 1), dur);
}
// struck metal: a few inharmonic partials that ring out
function metal(o, t, base, dur, peak, parts = [1, 2.76, 5.4, 8.93]) {
  parts.forEach((m, k) => tone(o, t, { type: 'sine', f0: base * m, f1: base * m * 0.995, dur: dur / (1 + k * 0.6), peak: peak / (1 + k * 0.8) }));
}
function grains(o, t, n, span, fn) { for (let k = 0; k < n; k++) fn(t + Math.random() * span, k); }

// ---- the sound set. Each takes (o, t) and schedules its voices.
const SND = {
  boom(o, t) {
    const s = Math.min(2.2, o.size ?? 1);
    burst(o, t, { f0: 900 + 1400 * s, f1: 60, dur: 0.35 + 0.45 * s, peak: 0.55 + 0.25 * s });
    tone(o, t, { f0: 120 - 25 * Math.min(1, s), f1: 32, dur: 0.3 + 0.35 * s, peak: 0.7 + 0.2 * s });
    if (s > 0.8) burst(o, t + 0.02, { type: 'highpass', f0: 2500, f1: 1200, dur: 0.12, peak: 0.25 });
    if (s > 1.2) grains(o, t + 0.1, 5, 0.5 * s, (tt) => burst(o, tt, { type: 'bandpass', f0: 500 + Math.random() * 900, f1: 300, q: 2, dur: 0.06, peak: 0.18 }));
  },
  pop(o, t) { burst(o, t, { f0: 2400, f1: 300, dur: 0.12, peak: 0.35 }); tone(o, t, { f0: 180, f1: 60, dur: 0.1, peak: 0.35 }); },
  crumble(o, t) {
    const s = Math.min(2, o.size ?? 1), n = 5 + (s * 8 | 0);
    for (let k = 0; k < n; k++) { const tt = t + Math.random() * (0.25 + 0.5 * s); burst(o, tt, { type: 'bandpass', f0: 250 + Math.random() * 1300, f1: 180 + Math.random() * 200, q: 1.5, dur: 0.05 + Math.random() * 0.12, peak: 0.16 + 0.1 * s }); }
    tone(o, t, { f0: 70, f1: 40, dur: 0.25 + 0.3 * s, peak: 0.25 * s });
  },
  glass(o, t) {
    grains(o, t, 6, 0.18, (tt) => tone(o, tt, { type: 'triangle', f0: 2200 + Math.random() * 3800, f1: 1800 + Math.random() * 2000, dur: 0.08 + Math.random() * 0.2, peak: 0.12 }));
    burst(o, t, { type: 'highpass', f0: 4000, f1: 2500, dur: 0.1, peak: 0.22 });
  },
  clang(o, t) { metal(o, t, 380 + Math.random() * 120, 0.7, 0.28); burst(o, t, { type: 'highpass', f0: 3000, f1: 2000, dur: 0.03, peak: 0.3 }); },
  thud(o, t) { tone(o, t, { f0: 95, f1: 40, dur: 0.16, peak: 0.6 }); burst(o, t, { f0: 1200, f1: 200, dur: 0.06, peak: 0.25 }); },
  punch(o, t) { tone(o, t, { f0: 140, f1: 50, dur: 0.12, peak: 0.6 }); burst(o, t, { f0: 3000, f1: 400, dur: 0.07, peak: 0.4 }); },
  slam(o, t) { SND.boom({ ...o, size: (o.size ?? 1) * 1.2 }, t); tone(o, t, { f0: 60, f1: 28, dur: 0.7, peak: 0.8 }); },
  stomp(o, t) { tone(o, t, { f0: 70, f1: 34, dur: 0.18, peak: 0.55 }); burst(o, t, { f0: 500, f1: 120, dur: 0.1, peak: 0.25 }); },
  step(o, t) { burst(o, t, { f0: 900, f1: 250, dur: 0.05, peak: 0.18 }); },
  jump(o, t) { burst(o, t, { type: 'bandpass', f0: 500, f1: 1400, q: 1, dur: 0.12, peak: o.heavy ? 0.35 : 0.2 }); if (o.heavy) tone(o, t, { f0: 90, f1: 50, dur: 0.15, peak: 0.4 }); },
  land(o, t) { tone(o, t, { f0: o.heavy ? 80 : 120, f1: 40, dur: 0.14, peak: 0.45 }); burst(o, t, { f0: 800, f1: 150, dur: 0.1, peak: 0.25 }); },
  leap(o, t) { SND.boom({ ...o, size: 0.5 + (o.size ?? 0) * 0.6 }, t); burst(o, t + 0.03, { type: 'bandpass', f0: 300, f1: 1600, q: 0.8, dur: 0.4, peak: 0.3 }); },
  whoosh(o, t) { burst(o, t, { type: 'bandpass', f0: 350, f1: 1800, q: 1.2, a: 0.04, dur: 0.3, peak: 0.35 }); },
  wind(o, t) { burst(o, t, { type: 'bandpass', f0: 250, f1: 900, q: 0.6, a: 0.12, dur: 0.9, peak: 0.4 }); },
  slash(o, t) { burst(o, t, { type: 'bandpass', f0: 3800, f1: 1200, q: 2, dur: 0.1, peak: 0.4 }); tone(o, t, { type: 'triangle', f0: 2600, f1: 2200, dur: 0.08, peak: 0.08 }); },
  snikt(o, t) { metal(o, t, 1500, 0.35, 0.2, [1, 1.5, 2.3]); burst(o, t, { type: 'highpass', f0: 5000, f1: 3000, dur: 0.05, peak: 0.35 }); },
  scrape(o, t) { burst(o, t, { type: 'bandpass', f0: 2600, f1: 1800, q: 4, dur: 0.12, peak: 0.25 }); },
  zap(o, t) { tone(o, t, { type: 'square', f0: 1400, f1: 300, dur: 0.12, peak: 0.12, lp: 3000 }); burst(o, t, { type: 'highpass', f0: 3000, f1: 1500, dur: 0.08, peak: 0.2 }); },
  crackle(o, t) { grains(o, t, 9, 0.22, (tt) => burst(o, tt, { type: 'highpass', f0: 3500 + Math.random() * 3000, f1: 2500, dur: 0.012, peak: 0.35 })); },
  thunder(o, t) {
    burst(o, t, { type: 'highpass', f0: 3000, f1: 1500, dur: 0.06, peak: 0.6 });
    burst(o, t + 0.02, { f0: 1600, f1: 90, dur: 1.4, peak: 0.6 });
    tone(o, t + 0.05, { f0: 55, f1: 30, dur: 1.2, peak: 0.5 });
    grains(o, t + 0.2, 6, 1.0, (tt) => burst(o, tt, { f0: 500, f1: 100, dur: 0.2, peak: 0.15 }));
  },
  repulsor(o, t) { tone(o, t, { f0: 260, f1: 1300, dur: 0.12, peak: 0.25 }); burst(o, t, { type: 'bandpass', f0: 1500, f1: 3000, q: 1, dur: 0.1, peak: 0.25 }); },
  missile(o, t) { burst(o, t, { type: 'bandpass', f0: 2500, f1: 900, q: 1.5, a: 0.02, dur: 0.45, peak: 0.25 }); tone(o, t, { type: 'triangle', f0: 1200, f1: 500, dur: 0.4, peak: 0.07 }); },
  bolt(o, t) { tone(o, t, { type: 'sawtooth', f0: 500, f1: 120, dur: 0.18, peak: 0.12, lp: 2500 }); burst(o, t, { type: 'bandpass', f0: 1200, f1: 400, q: 1, dur: 0.15, peak: 0.2 }); },
  psi(o, t) { const s = osc('sine', 520 * (o.pitch || 1), t, 0.5), m = osc('sine', 7, t, 0.5), mg = ctx.createGain(); mg.gain.value = 60; m.connect(mg); mg.connect(s.frequency); s.frequency.exponentialRampToValueAtTime(900, t + 0.45); const g = out(o); s.connect(g); env(g, t, 0.03, 0.22 * (o.v ?? 1), 0.45); },
  ice(o, t) { grains(o, t, 5, 0.12, (tt) => tone(o, tt, { type: 'triangle', f0: 1500 + Math.random() * 2500, dur: 0.06 + Math.random() * 0.1, peak: 0.12 })); burst(o, t, { type: 'highpass', f0: 6000, f1: 3000, dur: 0.18, peak: 0.25 }); },
  freeze(o, t) { burst(o, t, { type: 'highpass', f0: 7000, f1: 2500, a: 0.02, dur: 0.45, peak: 0.3 }); SND.glass({ ...o, v: (o.v ?? 1) * 0.6 }, t + 0.2); },
  fireburst(o, t) { burst(o, t, { f0: 1800, f1: 300, a: 0.03, dur: 0.5, peak: 0.4 }); },
  splash(o, t) { burst(o, t, { type: 'bandpass', f0: 900, f1: 400, q: 0.8, dur: 0.3, peak: 0.4 }); grains(o, t + 0.04, 5, 0.25, (tt) => tone(o, tt, { f0: 400 + Math.random() * 600, f1: 900 + Math.random() * 600, dur: 0.05, peak: 0.07 })); },
  eshot(o, t) { tone(o, t, { type: 'square', f0: 900, f1: 220, dur: 0.12, peak: 0.08, lp: 2200 }); },
  elaser(o, t) { tone(o, t, { type: 'sawtooth', f0: 240, f1: 1100, dur: 0.22, peak: 0.12, lp: 3000 }); },
  charge(o, t) { tone(o, t, { type: 'sawtooth', f0: 120, f1: 900, a: 0.05, dur: 0.6, peak: 0.12, lp: 2000 }); },
  roar(o, t) {
    const s = osc('sawtooth', 70, t, 0.9), s2 = osc('sawtooth', 93, t, 0.9), w = ctx.createWaveShaper(); w.curve = dist();
    s.frequency.linearRampToValueAtTime(58, t + 0.9); s2.frequency.linearRampToValueAtTime(80, t + 0.9);
    const b = filt('lowpass', 900), g = out(o); s.connect(w); s2.connect(w); w.connect(b); b.connect(g); env(g, t, 0.06, 0.45 * (o.v ?? 1), 0.85);
    burst(o, t, { f0: 700, f1: 300, a: 0.06, dur: 0.8, peak: 0.25 });
  },
  screech(o, t) { tone(o, t, { type: 'sawtooth', f0: 1400, f1: 2400, a: 0.05, dur: 0.7, peak: 0.1, lp: 4000 }); burst(o, t, { type: 'bandpass', f0: 2000, f1: 3500, q: 2, a: 0.05, dur: 0.6, peak: 0.2 }); },
  rip(o, t) { burst(o, t, { f0: 200, f1: 1400, a: 0.05, dur: 0.45, peak: 0.45 }); SND.crumble({ ...o, size: 0.6 }, t + 0.1); },
  throw(o, t) { SND.whoosh(o, t); tone(o, t, { f0: 160, f1: 70, dur: 0.15, peak: 0.3 }); },
  hurt(o, t) { tone(o, t, { type: 'square', f0: 140, f1: 70, dur: 0.14, peak: 0.12, lp: 900 }); burst(o, t, { f0: 1500, f1: 300, dur: 0.1, peak: 0.25 }); },
  kill(o, t) { metal(o, t, 300 + Math.random() * 200, 0.5, 0.18); SND.crumble({ ...o, size: 0.5 }, t); },
  stun(o, t) { tone(o, t, { type: 'square', f0: 1800, f1: 600, dur: 0.3, peak: 0.08, lp: 3500 }); SND.crackle(o, t); },
  wave(o, t) { // comic-book brass stab + timpani
    [220, 277, 330, 440].forEach((f, k) => tone(o, t + k * 0.012, { type: 'sawtooth', f0: f, f1: f * 0.98, a: 0.02, dur: 0.6, peak: 0.07, lp: 1800 }));
    tone(o, t, { f0: 110, f1: 55, dur: 0.5, peak: 0.5 });
  },
  boss(o, t) { for (let k = 0; k < 4; k++) tone(o, t + k * 0.3, { type: 'square', f0: k % 2 ? 450 : 620, dur: 0.26, peak: 0.07, lp: 2500 }); },
  ui(o, t) { tone(o, t, { type: 'triangle', f0: 900, f1: 1300, dur: 0.05, peak: 0.12 }); },
  deny(o, t) { tone(o, t, { type: 'square', f0: 150, f1: 140, dur: 0.12, peak: 0.08, lp: 1200 }); },
  place(o, t) { tone(o, t, { f0: 420, f1: 900, dur: 0.08, peak: 0.2 }); },
  emp(o, t) { tone(o, t, { type: 'sawtooth', f0: 2000, f1: 60, dur: 0.7, peak: 0.12, lp: 5000 }); burst(o, t, { f0: 5000, f1: 200, dur: 0.6, peak: 0.25 }); },
  jet(o, t) { burst(o, t, { type: 'bandpass', f0: 600, f1: 2400, q: 0.7, a: 0.3, dur: 1.6, peak: 0.4 }); tone(o, t, { type: 'sawtooth', f0: 90, f1: 140, a: 0.3, dur: 1.5, peak: 0.08, lp: 600 }); },
};

// sustained timbres for loop(): each returns {g, set(o)} with live parameters
const LOOP = {
  beam(o) { // humming energy beam; o.pitch shifts the colour of the hum
    const f = 110 * (o.pitch || 1), a = osc('sawtooth', f, ctx.currentTime, 600), b = osc('square', f * 1.5, ctx.currentTime, 600), l = osc('sine', 31, ctx.currentTime, 600);
    const lg = ctx.createGain(); lg.gain.value = 6; l.connect(lg); lg.connect(a.frequency);
    const bp = filt('bandpass', 1400, 1.2), g = out(o); a.connect(bp); b.connect(bp); bp.connect(g);
    return { g, nodes: [a, b, l], peak: 0.09 };
  },
  arc(o) { // crackling electric arc
    const s = nz(ctx.currentTime, 600), hp = filt('highpass', 2200, 0.8), g = out(o), am = ctx.createGain(), lfo = osc('square', 23, ctx.currentTime, 600), lg = ctx.createGain();
    lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); s.connect(hp); hp.connect(am); am.connect(g);
    return { g, nodes: [s, lfo], peak: 0.22 };
  },
  flame(o) { const s = nz(ctx.currentTime, 600), lp = filt('lowpass', 900, 0.5), g = out(o); s.connect(lp); lp.connect(g); return { g, nodes: [s], peak: 0.3 }; },
  drill(o) { const s = osc('sawtooth', 70, ctx.currentTime, 600), n = nz(ctx.currentTime, 600), bp = filt('bandpass', 1800, 2), g = out(o); s.connect(g); n.connect(bp); bp.connect(g); return { g, nodes: [s, n], peak: 0.12 }; },
  wind(o) { const s = nz(ctx.currentTime, 600), bp = filt('bandpass', 500, 0.7), g = out(o), l = osc('sine', 0.4, ctx.currentTime, 600), lg = ctx.createGain(); lg.gain.value = 250; l.connect(lg); lg.connect(bp.frequency); s.connect(bp); bp.connect(g); return { g, nodes: [s, l], peak: 0.35 }; },
  rain(o) { const s = nz(ctx.currentTime, 600), hp = filt('highpass', 1200, 0.5), lp = filt('lowpass', 7000, 0.5), g = out(o); s.connect(hp); hp.connect(lp); lp.connect(g); return { g, nodes: [s], peak: 0.16 }; },
  fire(o) { // crackling bed: low roar plus random pops from an amplitude-modulated hiss
    const s = nz(ctx.currentTime, 600), lp = filt('lowpass', 700, 0.5), s2 = nz(ctx.currentTime, 600), hp = filt('highpass', 2500), am = ctx.createGain(), l = osc('square', 13, ctx.currentTime, 600), lg = ctx.createGain(), g = out(o);
    lg.gain.value = 0.6; am.gain.value = 0.4; l.connect(lg); lg.connect(am.gain); s.connect(lp); lp.connect(g); s2.connect(hp); hp.connect(am); am.connect(g);
    return { g, nodes: [s, s2, l], peak: 0.28 };
  },
  lava(o) { const s = nz(ctx.currentTime, 600), lp = filt('lowpass', 220, 0.8), g = out(o), b = osc('sine', 48, ctx.currentTime, 600); s.connect(lp); lp.connect(g); b.connect(g); return { g, nodes: [s, b], peak: 0.25 }; },
  hum(o) { const s = osc('sine', 60, ctx.currentTime, 600), s2 = osc('sine', 120.5, ctx.currentTime, 600), g = out(o); s.connect(g); s2.connect(g); return { g, nodes: [s, s2], peak: 0.08 }; },
};

export function play(name, o = {}) {
  if (!ctx || muted || vol <= 0 || ctx.state !== 'running') return;
  const fn = SND[name]; if (!fn) return;
  const now = ctx.currentTime, gap = o.gap ?? 0.045;
  if (lastPlay[name] && now - lastPlay[name] < gap) return;
  if (voices > MAX_VOICES && !o.force) return;
  lastPlay[name] = now;
  try { fn(o, now + 0.005); } catch (e) { /* never let a sound break the game */ }
}

export function loop(id, name, o = {}) {
  if (!ctx || muted || ctx.state !== 'running') return;
  let L = loops[id];
  if (!L) {
    const mk = LOOP[name]; if (!mk) return;
    try { L = loops[id] = mk(o); } catch (e) { return; }
    L.until = 0; L.g.gain.setValueAtTime(0.0001, ctx.currentTime);
  }
  const now = ctx.currentTime;
  L.until = now + 0.12;
  const target = L.peak * (o.v ?? 1);
  L.g.gain.cancelScheduledValues(now); L.g.gain.setTargetAtTime(Math.max(0.0001, target), now, 0.03);
  if (o.pan !== undefined && L.g.__pan) L.g.__pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, o.pan)), now, 0.05);
}
export function ambience(name, level) {
  if (!ctx || ctx.state !== 'running') return;
  if (!amb[name]) { if (level < 0.01) return; const mk = LOOP[name]; if (!mk) return; try { amb[name] = mk({}); } catch (e) { return; } amb[name].g.gain.value = 0.0001; }
  const A = amb[name], now = ctx.currentTime;
  A.g.gain.setTargetAtTime(Math.max(0.0001, A.peak * level), now, 0.4);
}
export function tickAudio() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const id in loops) {
    const L = loops[id];
    if (now > L.until) {
      L.g.gain.cancelScheduledValues(now); L.g.gain.setTargetAtTime(0.0001, now, 0.04);
      if (now > L.until + 0.4) { for (const n of L.nodes) { try { n.stop(); } catch (e) {} } delete loops[id]; }
    }
  }
}
