// VFX themes: every hero's effects share one shape language so their powers read as theirs.
// An effect keeps the colours its power gave it; the theme decides how it is drawn (runes, hex
// rings, crackling arcs, frost shards, comic smoke...) and what the cast, the trail and the blast add.
import { ST } from '../state.js';

// shape languages. beam: how straight beams are shaded; ring: how expanding rings look; flare: spikes on
// flashes and impact flares (0 = round glow); spark: the particle the style sheds; boom: extra layer on
// explosions; cast: the flourish at the hand when a power fires; smoke: puff colour when a blast cools
export const STY = {
  arcane:     { beam: 'rune', ring: 'rune', flare: 8, spark: 'glyph', boom: 'sigil', cast: 'sigil', smoke: [70, 62, 60] },
  chaos:      { beam: 'wisp', ring: 'wisp', flare: 6, spark: 'wisp', boom: 'hexes', cast: 'hex', smoke: [90, 30, 50] },
  storm:      { beam: 'arc', ring: 'arc', flare: 4, spark: 'spark', boom: 'arcs', cast: 'crackle', smoke: [70, 76, 96] },
  bioelectric:{ beam: 'arc', ring: 'arc', flare: 4, spark: 'spark', boom: 'arcs', cast: 'crackle', smoke: [60, 60, 80] },
  tech:       { beam: 'pulse', ring: 'dash', flare: 2, spark: 'spark', boom: 'hexring', cast: 'ringflare', smoke: [76, 76, 84] },
  laser:      { beam: 'laser', ring: 'plain', flare: 2, spark: 'spark', boom: 'heat', cast: 'glare', smoke: [80, 70, 70] },
  frost:      { beam: 'crystal', ring: 'spike', flare: 6, spark: 'shard', boom: 'frost', cast: 'frost', smoke: [200, 225, 240] },
  psy:        { beam: 'ripple', ring: 'double', flare: 0, spark: 'mote', boom: 'ripples', cast: 'ripple', smoke: [90, 50, 90] },
  force:      { beam: 'ripple', ring: 'hex', flare: 0, spark: 'mote', boom: 'bubble', cast: 'ripple', smoke: [90, 110, 140] },
  flame:      { beam: 'flame', ring: 'fire', flare: 4, spark: 'ember', boom: 'fire', cast: 'flame', smoke: [70, 60, 56] },
  hellfire:   { beam: 'flame', ring: 'fire', flare: 4, spark: 'ember', boom: 'fire', cast: 'flame', smoke: [50, 40, 40] },
  brute:      { beam: 'plain', ring: 'dust', flare: 4, spark: 'spark', boom: 'dust', cast: 'dust', smoke: [120, 110, 96] },
  slash:      { beam: 'plain', ring: 'plain', flare: 4, spark: 'spark', boom: 'sparks', cast: 'slash', smoke: [90, 86, 80] },
  kinetic:    { beam: 'crackle', ring: 'dash', flare: 4, spark: 'spark', boom: 'kinetic', cast: 'kinetic', smoke: [70, 50, 80] },
  magnetic:   { beam: 'field', ring: 'field', flare: 4, spark: 'glint', boom: 'field', cast: 'field', smoke: [80, 70, 96] },
  cosmic:     { beam: 'stars', ring: 'stars', flare: 4, spark: 'star', boom: 'nebula', cast: 'starburst', smoke: [40, 50, 110] },
  photon:     { beam: 'pulse', ring: 'stars', flare: 6, spark: 'star', boom: 'nova', cast: 'starburst', smoke: [90, 70, 60] },
  infinity:   { beam: 'stars', ring: 'stars', flare: 6, spark: 'star', boom: 'nebula', cast: 'stone', smoke: [60, 30, 90] },
  goo:        { beam: 'goo', ring: 'splat', flare: 0, spark: 'goo', boom: 'splat', cast: 'goo', smoke: [30, 30, 40] },
  necro:      { beam: 'wisp', ring: 'thorn', flare: 6, spark: 'wisp', boom: 'necro', cast: 'necro', smoke: [24, 36, 28] },
  lunar:      { beam: 'plain', ring: 'plain', flare: 4, spark: 'crescent', boom: 'lunar', cast: 'crescent', smoke: [110, 116, 140] },
  rings:      { beam: 'pulse', ring: 'double', flare: 4, spark: 'mote', boom: 'rings', cast: 'rings', smoke: [80, 70, 90] },
  brimstone:  { beam: 'wisp', ring: 'smoke', flare: 0, spark: 'smoke', boom: 'bamf', cast: 'bamf', smoke: [60, 40, 90] },
  blaster:    { beam: 'pulse', ring: 'plain', flare: 4, spark: 'spark', boom: 'fire', cast: 'muzzle', smoke: [80, 74, 70] },
  quantum:    { beam: 'pulse', ring: 'implode', flare: 4, spark: 'mote', boom: 'quantum', cast: 'quantum', smoke: [70, 40, 90] },
  temporal:   { beam: 'pulse', ring: 'double', flare: 6, spark: 'mote', boom: 'rings', cast: 'ringflare', smoke: [64, 58, 92] }, // Kang: clock sigils, nested rings, violet and gold
  web:        { beam: 'plain', ring: 'plain', flare: 0, spark: 'spark', boom: 'dust', cast: 'none', smoke: [150, 150, 156] },
  shield:     { beam: 'plain', ring: 'plain', flare: 4, spark: 'star', boom: 'sparks', cast: 'glint', smoke: [100, 100, 110] },
  stretch:    { beam: 'plain', ring: 'plain', flare: 2, spark: 'spark', boom: 'dust', cast: 'none', smoke: [100, 110, 130] },
  foe:        { beam: 'pulse', ring: 'plain', flare: 2, spark: 'spark', boom: 'fire', cast: 'none', smoke: [74, 68, 64] },
  band:       { beam: 'flat', ring: 'plain', flare: 0, spark: 'spark', boom: 'sparks', cast: 'none', smoke: [100, 100, 110] },
};
// per hero: style plus the colours its signature flourishes use (core, hot, body, deep)
export const THEME = {
  doom: { st: 'arcane', pal: [[230, 255, 235], [140, 255, 170], [60, 220, 110], [10, 90, 50]], sig: 'octagram' },
  hulk: { st: 'brute', pal: [[235, 255, 215], [170, 255, 110], [90, 200, 60], [30, 90, 20]] },
  thor: { st: 'storm', pal: [[245, 250, 255], [190, 215, 255], [110, 150, 255], [40, 60, 170]], sig: 'norse' },
  iron: { st: 'tech', pal: [[255, 255, 255], [190, 245, 255], [90, 200, 255], [30, 80, 160]] },
  wolverine: { st: 'slash', pal: [[255, 255, 240], [255, 235, 150], [255, 200, 60], [150, 90, 10]] },
  cyclops: { st: 'laser', pal: [[255, 235, 230], [255, 140, 120], [255, 50, 40], [130, 10, 10]] },
  iceman: { st: 'frost', pal: [[245, 252, 255], [190, 235, 255], [120, 200, 250], [40, 100, 170]] },
  jean: { st: 'psy', pal: [[255, 240, 250], [255, 170, 220], [255, 90, 180], [140, 20, 90]], alt: [[255, 250, 220], [255, 200, 90], [255, 120, 30], [170, 40, 10]] },
  spidey: { st: 'web', pal: [[255, 255, 255], [235, 240, 250], [200, 210, 230], [120, 130, 160]] },
  wanda: { st: 'chaos', pal: [[255, 225, 235], [255, 120, 160], [230, 40, 100], [110, 10, 50]], sig: 'hexagram' },
  strange: { st: 'arcane', pal: [[255, 250, 220], [255, 210, 110], [255, 150, 40], [160, 60, 10]], sig: 'mandala' },
  antman: { st: 'quantum', pal: [[255, 235, 235], [255, 140, 130], [230, 60, 60], [90, 30, 140]], alt: [[220, 240, 255], [120, 190, 255], [60, 120, 255], [20, 40, 140]] },
  juggernaut: { st: 'brute', pal: [[255, 230, 210], [255, 150, 110], [200, 70, 40], [90, 25, 15]] },
  ultron: { st: 'tech', pal: [[255, 235, 230], [255, 130, 110], [255, 50, 40], [120, 10, 10]] },
  magneto: { st: 'magnetic', pal: [[250, 235, 255], [220, 160, 255], [170, 90, 240], [70, 20, 120]] },
  storm: { st: 'storm', pal: [[255, 255, 255], [220, 235, 255], [160, 200, 255], [70, 90, 160]] },
  venom: { st: 'goo', pal: [[240, 245, 255], [150, 160, 190], [40, 44, 60], [10, 10, 16]] },
  reed: { st: 'stretch', pal: [[235, 245, 255], [160, 200, 240], [80, 140, 210], [30, 60, 110]] },
  sue: { st: 'force', pal: [[240, 250, 255], [180, 225, 255], [110, 180, 240], [40, 90, 160]] },
  torch: { st: 'flame', pal: [[255, 255, 220], [255, 210, 90], [255, 120, 30], [170, 40, 10]] },
  thing: { st: 'brute', pal: [[255, 235, 200], [255, 180, 110], [220, 110, 50], [100, 45, 20]] },
  panther: { st: 'kinetic', pal: [[245, 235, 255], [200, 160, 255], [140, 80, 240], [50, 20, 110]] },
  cap: { st: 'shield', pal: [[255, 255, 255], [220, 230, 255], [120, 150, 240], [200, 40, 50]] },
  marvel: { st: 'photon', pal: [[255, 255, 235], [255, 220, 120], [255, 170, 60], [60, 90, 200]] },
  surfer: { st: 'cosmic', pal: [[250, 255, 255], [200, 240, 255], [120, 200, 255], [60, 70, 180]] },
  rider: { st: 'hellfire', pal: [[255, 250, 220], [255, 200, 80], [255, 110, 20], [120, 20, 5]] },
  pool: { st: 'blaster', pal: [[255, 250, 230], [255, 210, 120], [255, 120, 60], [150, 20, 30]] },
  thanos: { st: 'infinity', pal: [[250, 235, 255], [220, 160, 255], [170, 90, 240], [70, 20, 120]] },
  hela: { st: 'necro', pal: [[220, 255, 220], [120, 240, 140], [40, 160, 80], [10, 30, 20]], sig: 'thorn' },
  moon: { st: 'lunar', pal: [[255, 255, 255], [230, 235, 250], [180, 190, 220], [60, 70, 110]] },
  shang: { st: 'rings', pal: [[235, 250, 255], [140, 210, 255], [60, 140, 255], [20, 40, 140]], alt: [[255, 240, 200], [255, 200, 80], [230, 90, 40], [120, 20, 10]] },
  gambit: { st: 'kinetic', pal: [[255, 235, 250], [255, 150, 220], [240, 60, 170], [110, 10, 80]] },
  kurt: { st: 'brimstone', pal: [[230, 220, 255], [160, 130, 230], [90, 60, 170], [20, 10, 40]] },
  quill: { st: 'blaster', pal: [[255, 250, 230], [255, 200, 120], [255, 130, 60], [150, 40, 10]], alt: [[230, 250, 255], [140, 220, 255], [60, 160, 255], [20, 60, 140]] },
  miles: { st: 'bioelectric', pal: [[255, 255, 240], [255, 240, 140], [255, 210, 60], [120, 160, 255]] },
  kang: { st: 'temporal', pal: [[248, 240, 255], [190, 140, 255], [140, 80, 235], [58, 20, 116]], alt: [[255, 240, 190], [255, 214, 110], [226, 170, 60], [120, 60, 10]], sig: 'clock' },
  foe: { st: 'foe', pal: [[255, 235, 220], [255, 160, 110], [255, 80, 50], [120, 20, 10]] },
  // effect-only keys: lightning, crisp spikes, magnetic field loops
  zap: { st: 'storm', pal: [[255, 255, 255], [220, 235, 255], [160, 200, 255], [70, 90, 160]] },
  crisp: { st: 'laser', pal: [[255, 255, 255], [255, 255, 255], [200, 200, 200], [90, 90, 90]] },
  band: { st: 'band', pal: [[255, 255, 255], [255, 255, 255], [200, 200, 200], [90, 90, 90]] }, // flat colour bands laid side by side (Bifrost)
  field: { st: 'magnetic', pal: [[250, 235, 255], [220, 160, 255], [170, 90, 240], [70, 20, 120]] },
};
// infinity stones in snap order, for Thanos's flourishes: power, space, reality, soul, time, mind
export const STONES = [[190, 90, 255], [70, 140, 255], [255, 50, 60], [255, 150, 40], [60, 230, 110], [255, 220, 60]];
// whose effect is being made right now: the hero during its own tick, 'foe' while enemies, modes and the world run
export const curKey = () => (ST.pctx === false ? 'foe' : (ST.CH && ST.CH.id) || 'foe');
export const themeOf = (k) => THEME[k] || THEME.foe;
export const styleOf = (k) => STY[themeOf(k).st] || STY.foe;
