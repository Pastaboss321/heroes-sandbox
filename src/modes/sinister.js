// Sinister Night: the mode built around the 2026-11 villains (enemies/sinister.js).
// Nine waves over New York: Hand ninjas, Hydra troopers and pumpkin drones, with the Green Goblin, Mysterio and
// Sandman arriving on waves three, six and nine. Beat Sandman to win.
import { ST } from '../state.js';
import { pl_ } from '../player.js';
import { enemies, queueWave, spawnQ } from '../enemies/core.js';
import { banner, bossBar, defineMode, endRun } from './core.js';

const BOSS = { 3: 'goblin', 6: 'mysterio', 9: 'sandman' }, LAST = 9;
const LINES = ['The Hand owns these rooftops', 'Something is laughing up there', 'Do not trust what you see', 'The street is moving'];
defineMode('sinister', { name: 'Sinister Night', sub: 'New York · nine waves · three villains', map: 'nyc',
  desc: 'Hand ninjas on the rooftops, Hydra in the street, pumpkin drones overhead. The Green Goblin comes on wave 3, Mysterio on wave 6 and Sandman on wave 9. Beat all three. 3 lives, heal between waves.',
  setup(s) { s.lives = 3; s.wave = 0; s.phase = 'break'; s.timer = 200; s.boss = null; s.down = 0; banner('SINISTER NIGHT', 'three villains · nine waves'); },
  update(s) {
    if (s.phase === 'break') { if (--s.timer <= 0) { s.wave++; ST.wave = s.wave; s.phase = 'fight'; const n = s.wave, b = BOSS[n], list = [['hand_ninja', 2 + n]];
        if (n >= 2) list.push(['pumpkin_drone', 1 + (n >> 1)]); if (n >= 4) list.push(['hydra', (n >> 1) - 1]); if (b) list.push([b, 1]);
        queueWave(list, 18); banner('WAVE ' + n, b ? ({ goblin: 'THE GREEN GOBLIN', mysterio: 'MYSTERIO', sandman: 'SANDMAN' })[b] : LINES[n % LINES.length]); } }
    else if (enemies.length === 0 && spawnQ.length === 0) {
      if (s.wave >= LAST) { s.won = true; ST.score += 5000; endRun(); return; }
      const bonus = 150 * s.wave; ST.score += bonus; s.phase = 'break'; s.timer = 240; pl_.hp = Math.min(ST.CH.hp, pl_.hp + ST.CH.hp * .4); pl_.en = 100; banner('WAVE ' + s.wave + ' CLEARED', '+' + bonus + ' bonus'); }
    s.boss = enemies.find(e => e.def.title) || null; bossBar(s.boss); },
  onKill(e, s) { if (e.def.title) { s.down++; ST.score += 2500; ST.shake = 22; banner(e.def.title + ' DOWN', '+2500'); for (const o of enemies) if (o.def.name === 'illusion' || o.def.name === 'pumpkin_drone') { o.mem.noScore = true; o.hp = 0; } } },
  onDeath(s) { s.lives--; if (s.lives <= 0) { endRun(); return true; } banner('DOWN', s.lives + (s.lives === 1 ? ' life' : ' lives') + ' left'); return false; },
  hud(s) { return `${s.phase === 'break' ? 'next wave in ' + Math.ceil(s.timer / 60) + 's' : 'wave ' + s.wave + ' of ' + LAST + ' · ' + (enemies.length + spawnQ.length) + ' left'} · lives ${s.lives}`; },
  result(s) { return { title: s.won ? 'THE CITY SLEEPS' : 'A SINISTER NIGHT', stats: [['WAVE REACHED', s.wave], ['VILLAINS BEATEN', s.down + ' of 3']] }; },
});
