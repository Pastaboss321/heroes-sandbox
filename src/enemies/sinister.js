// The Sinister set (2026-11): foes for the new heroes. Hand ninjas, the Goblin's pumpkin drones, Mysterio's
// illusions, and three bosses that wear the heroes' own art and fight with the same sim materials their hero
// versions do: the Green Goblin (bombs, gas), Mysterio (copies, teleports) and Sandman (real sand, burrowing).
import { ST } from '../state.js';
import { KIND, PROPANE, R, S, SAND, SMOKE, rgb } from '../world/materials.js';
import { H, W, setc, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { pl_ } from '../player.js';
import { hurtTarget, shots } from '../heroes/powers.js';
import { ARTS } from '../art/index.js';
import { defineEnemy, enemies, enemyShoot, los, pdist, player, seek, spawnEnemy } from './core.js';

const puff = (x, y, n, c) => { for (let k = 0; k < n; k++) { const a = R() * 6.283, v = .4 + R() * 1.4; spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, c, 14 + R() * 12, 0, 0, 0, 1); } };
const gasAt = (x, y, r, m) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { if (xx * xx + yy * yy > r * r || R() > .7) continue; const X = x + xx | 0, Y = y + yy | 0; if (X < 1 || X >= W - 1 || Y < 1 || Y >= H - 44) continue; if (t[Y * W + X] === 0) setc(Y * W + X, m); } };
const groundUnder = (x, y) => { x = Math.max(1, Math.min(W - 2, x | 0)); let yy = Math.max(1, y | 0); for (; yy < H - 2; yy++) if (KIND[t[yy * W + x]] === S) break; return yy; };
const touch = (e, r) => Math.abs(pl_.x - e.x) < r + 4 && Math.abs(pl_.y - ST.PH / 2 - e.y) < r + 8;
// a lobbed bomb: an enemy shot with gravity that blows up where it lands
const lob = (e, tx, ty, o = {}) => { const tt = o.t || 40, g = .12, dx = tx - e.x, dy = ty - e.y; shots.push({ x: e.x, y: e.y, vx: dx / tt, vy: dy / tt - g * tt / 2, type: 'spike', owner: 'enemy', src: e, team: e.team, life: 160, dmg: o.dmg || 10, col: o.col || [255, 150, 50], boom: o.boom || 6, fire: o.fire || 0, grav: g }); };
const boss = (e) => { const s = e.def.scale || 1; return { hw: e.def.w / 2, hh: e.def.h / 2, enr: e.hp < e.def.hp * .4, s }; };
function hover(e, x, y, sp, acc) { seek(e, x, y, sp, acc); e.vy += (y - e.y) * .004; e.vy *= .97; const top = e.def.h / 2 + 6; if (e.y < top) { e.y = top; if (e.vy < 0) e.vy = 0; } }

// --- Hand ninja: runs in, leaps at the hero, cuts, and vanishes in smoke when hurt
defineEnemy('hand_ninja', { hp: 40, w: 7, h: 13, fly: false, score: 15, boom: 3, glow: 'e',
  sprite: ['..rrr..', '.rrrrr.', '.reere.', '.rrrrr.', '..rkr..', 'krrrrrk', 'krkrkrk', 'krrrrrk', 's.rkr..', 's.r.r..', '..r.r..', '.kk.kk.', '.kk.kk.'],
  pal: { r: rgb(150, 22, 26), k: rgb(24, 20, 24), e: rgb(255, 230, 120), s: rgb(214, 220, 232) },
  think(e) { const p = player(), dx = p.x - e.x, dist = Math.abs(dx); e.face = dx > 0 ? 1 : -1;
    e.vx += (e.face * 1.9 - e.vx) * .2; if (e.ground && e.mem.blocked && e.t - e.mem.blocked < 4) e.vy = -5;
    if (e.ground && dist < 70 && dist > 16 && e.cd === 0) { e.vy = -5.2; e.vx = e.face * 3.4; e.cd = 70 + R() * 40 | 0; }
    if (touch(e, 7) && !(e.mem.hitT > e.t)) { hurtTarget(e, 9); e.mem.hitT = e.t + 34; e.vx = -e.face * 2.5; snd('snikt', e.x, e.y, { v: .4 }); }
    if (e.hp < e.def.hp * .5 && !e.mem.fled) { e.mem.fled = 1; puff(e.x, e.y, 10, rgb(50, 44, 50)); const nx = Math.max(10, Math.min(W - 10, p.x - e.face * (60 + R() * 40))); e.x = nx; e.y = groundUnder(nx, p.y - 60) - 8; puff(e.x, e.y, 10, rgb(50, 44, 50)); } } });

// --- Pumpkin drone: one of the Goblin's remote bombs. It hangs above the hero and lobs smaller ones
defineEnemy('pumpkin_drone', { hp: 26, w: 9, h: 8, fly: true, score: 15, boom: 7, glow: 'e',
  sprite: ['...gg....', '.ooOOoo..', 'oOOOOOOo.', 'oeOOOeOo.', 'oOOeOOOo.', 'oOeeeOOo.', '.oOOOOo..', '..oooo...'],
  pal: { o: rgb(200, 90, 20), O: rgb(255, 150, 40), g: rgb(70, 150, 50), e: rgb(255, 240, 150) },
  think(e) { const p = player(), ang = e.t * .02 + (e.mem.ph ??= R() * 6.28); hover(e, p.x + Math.cos(ang) * 70, p.y - 70 + Math.sin(ang * 1.4) * 14, 1.9, .06); e.face = p.x > e.x ? 1 : -1;
    if (e.cd === 0 && pdist(e) < 260) { lob(e, p.x, p.y - 6, { dmg: 8, boom: 5 }); e.cd = 100 + R() * 60 | 0; } } });

// --- Illusion: a copy of Mysterio. One hit and it is gone; its bolts are real enough
defineEnemy('illusion', { hp: 6, w: 9, h: 24, fly: true, score: 0, boom: 0, glow: 'e', scale: 1, sprite: ARTS.mysterio.spr, pal: ARTS.mysterio.pal,
  think(e) { const p = player(), ang = e.t * .012 + (e.mem.ph ??= R() * 6.28); hover(e, p.x + Math.cos(ang) * 110, p.y - 40 + Math.sin(ang * 1.3) * 30, 1.4, .05); e.face = p.x > e.x ? 1 : -1; e.mem.noScore = true;
    if (e.t % 3 === 0) spawn(e.x + (R() - .5) * 8, e.y + (R() - .5) * 20, 0, -.3, rgb(110, 230, 150), 10, 0, 1, 0, 1);
    if (e.cd === 0 && pdist(e) < 280 && los(e, p.x, p.y)) { enemyShoot(e, { speed: 3.2, dmg: 4, col: [120, 240, 160], spread: .1 }); e.cd = 110 + R() * 70 | 0; }
    if (e.t > 900) e.hp = 0; },
  onDeath(e) { puff(e.x, e.y, 14, rgb(110, 230, 150)); } });

// --- GREEN GOBLIN: circles on the glider. Pumpkin volleys, a cloud of gas and then the spark, dive rams, drones
defineEnemy('goblin', { hp: 2000, w: 16, h: 30, fly: true, score: 0, boom: 16, metal: false, title: 'GREEN GOBLIN', glow: 'eO', scale: 1.25, sprite: ARTS.goblin.spr, pal: ARTS.goblin.pal,
  think(e) { const p = player(), { hh, enr } = boss(e); e.face = p.x > e.x ? 1 : -1;
    for (let k = -8; k <= 8; k += 2) if (e.t % 2 === 0) spawn(e.x + k, e.y + hh + 2, 0, .2, Math.abs(k) > 6 ? rgb(70, 30, 110) : rgb(120, 60, 170), 2, 0, 0, 0); // the glider under his feet
    if (e.mem.dive > 0) { e.mem.dive--; e.vx = e.mem.dx * 6.5; e.vy = e.mem.dy * 6.5; if (e.t % 2 === 0) spawn(e.x, e.y + hh, 0, 0, rgb(255, 150, 40), 10, 0, 1, 0, 1);
      if (touch(e, 12) && !(e.mem.hitT > e.t)) { hurtTarget(e, 22); pl_.vx = e.mem.dx * 7; pl_.vy = -4; e.mem.hitT = e.t + 30; ST.shake = 14; snd('slam', e.x, e.y); } if (e.mem.dive === 0) e.cd = 50; return; }
    hover(e, p.x + Math.sin(e.t * .011) * 150, Math.max(hh + 24, p.y - ST.PH / 2 - 70 + Math.sin(e.t * .03) * 24), enr ? 2.6 : 2.1, .045);
    if (e.mem.gas > 0) { e.mem.gas--; if (e.mem.gas === 0) { explode(e.mem.gx | 0, e.mem.gy | 0, 4, { fire: 1, enemy: true }); } }
    if (e.cd > 0) return; const a = e.mem.atk = (e.mem.atk || 0) + 1;
    if (a % 5 === 1) { for (let k = 0; k < (enr ? 5 : 3); k++) lob(e, p.x + (k - 1) * 22 + pl_.vx * 14, p.y - 4, { t: 36 + k * 5, dmg: 12, boom: 7, fire: .3 }); fxWord(e.x, e.y - hh - 6, 'TRICK OR TREAT!', 1, '#ff9a3c', true); e.cd = 80; }
    else if (a % 5 === 2) { for (let k = 0; k < 6; k++) enemyShoot(e, { speed: 4.6, dmg: 6, spread: .3, col: [170, 90, 220], boom: 2 }); fxWord(e.x, e.y - hh - 6, 'RAZOR BATS', .9, '#c88cff', true); e.cd = 60; }
    else if (a % 5 === 3) { const gx = p.x, gy = p.y - 10; gasAt(gx, gy, 13, PROPANE); puff(gx, gy, 14, rgb(150, 210, 110)); e.mem.gas = 70; e.mem.gx = gx; e.mem.gy = gy; fxWord(gx, gy - 20, 'GAS!', 1.1, '#b4e88c', true); e.cd = 100; }
    else if (a % 5 === 4) { const dx = p.x - e.x, dy = p.y - ST.PH / 2 - e.y, d = Math.hypot(dx, dy) || 1; e.mem.dive = 34; e.mem.dx = dx / d; e.mem.dy = dy / d; fxWord(e.x, e.y - hh - 6, 'HAHAHAHA!', 1.2, '#8dff6a', true); snd('screech', e.x, e.y, { v: .6 }); }
    else { const n = enemies.filter(o => o.def.name === 'pumpkin_drone').length; for (let k = n; k < (enr ? 3 : 2); k++) spawnEnemy('pumpkin_drone', e.x + (k ? 20 : -20), e.y - 10); e.cd = 70; } } });

// --- MYSTERIO: never where he was. Fans of mist bolts, a ring of illusions, smoke, and a teleport every time he is cornered
defineEnemy('mysterio', { hp: 1700, w: 16, h: 30, fly: true, score: 0, boom: 14, metal: false, title: 'MYSTERIO', glow: 'e', scale: 1.25, sprite: ARTS.mysterio.spr, pal: ARTS.mysterio.pal,
  think(e) { const p = player(), { hh, enr } = boss(e); e.face = p.x > e.x ? 1 : -1;
    hover(e, p.x + Math.sin(e.t * .009) * 120, Math.max(hh + 24, p.y - ST.PH / 2 - 44 + Math.sin(e.t * .025) * 26), 1.5, .04);
    if (e.t % 4 === 0) spawn(e.x + (R() - .5) * 14, e.y + hh, (R() - .5) * .4, .3, rgb(110, 230, 150), 16, 0, 1, 0, 1);
    const port = () => { puff(e.x, e.y, 16, rgb(110, 230, 150)); e.x = Math.max(20, Math.min(W - 20, p.x + (R() < .5 ? -1 : 1) * (90 + R() * 60))); e.y = Math.max(hh + 20, p.y - 50 - R() * 40); e.vx = e.vy = 0; puff(e.x, e.y, 16, rgb(110, 230, 150)); snd('psi', e.x, e.y, { pitch: 1.3, v: .5 }); };
    if (pdist(e) < 40 && !(e.mem.portT > e.t)) { e.mem.portT = e.t + 90; port(); fxWord(e.x, e.y - hh - 6, 'NOT THERE!', .9, '#7df0a0', true); }
    if (e.cd > 0) return; const a = e.mem.atk = (e.mem.atk || 0) + 1;
    if (a % 4 === 1) { for (let k = 0; k < (enr ? 9 : 6); k++) enemyShoot(e, { speed: 3.4 + R(), dmg: 7, spread: .45, col: [120, 240, 160], boom: 3 }); e.cd = 60; }
    else if (a % 4 === 2) { const n = enemies.filter(o => o.def.name === 'illusion').length; for (let k = n; k < (enr ? 5 : 3); k++) spawnEnemy('illusion', e.x + (R() - .5) * 60, e.y + (R() - .5) * 30); fxWord(e.x, e.y - hh - 6, 'WHICH ONE IS REAL?', 1, '#7df0a0', true); port(); e.cd = 90; }
    else if (a % 4 === 3) { gasAt(p.x, p.y - 12, 16, SMOKE); puff(p.x, p.y - 12, 16, rgb(80, 120, 100)); fxWord(p.x, p.y - 34, 'SMOKE AND MIRRORS', 1, '#7df0a0', true); e.cd = 70; }
    else { port(); for (let k = 0; k < 4; k++) enemyShoot(e, { speed: 4.4, dmg: 8, spread: .12, col: [200, 140, 255], boom: 3, lead: 10 }); e.cd = 70; } } });

// --- SANDMAN: a walking dune. He sheds sand when hit, hammers the ground, sandblasts, and comes up underneath you
defineEnemy('sandman', { hp: 2800, w: 20, h: 38, fly: false, score: 0, boom: 18, metal: false, title: 'SANDMAN', glow: '', scale: 1.5, spd: .9, sprite: ARTS.sandman.spr, pal: ARTS.sandman.pal,
  think(e) { const p = player(), { hw, hh, enr } = boss(e), dx = p.x - e.x, sc = () => R() < .7 ? rgb(214, 186, 118) : rgb(170, 140, 84);
    if (e.hp < (e.mem.lastHp ?? e.def.hp)) { const lost = e.mem.lastHp - e.hp; for (let k = 0; k < Math.min(6, 1 + lost * .15 | 0); k++) spawn(e.x + (R() - .5) * hw, e.y + (R() - .5) * hh, (R() - .5) * 3, -1 - R() * 2, sc(), 160, SAND, 0, 1); } e.mem.lastHp = e.hp;
    if (e.mem.under > 0) { e.mem.under--; e.vx = 0; if (e.mem.under === 30) { e.x = Math.max(20, Math.min(W - 20, p.x)); e.y = groundUnder(e.x, p.y - 40) - hh; }
      if (e.mem.under > 30) { e.y += 1.2; if (e.t % 2 === 0) puff(e.x, e.y + hh, 3, sc()); } else if (e.mem.under === 29) { explode(e.x | 0, e.y + hh | 0, 7, { enemy: true, col: [214, 186, 118] }); for (let k = 0; k < 30; k++) spawn(e.x + (R() - .5) * 20, e.y + hh - 4, (R() - .5) * 5, -2 - R() * 4, sc(), 200, SAND, 0, 1); if (touch(e, hw + 8)) { hurtTarget(e, 26); pl_.vy = -6; } ST.shake = 16; fxWord(e.x, e.y - hh - 6, 'FWUMP!', 1.2, '#e8d090', true); }
      if (e.mem.under === 0) e.cd = 70; return; }
    if (e.mem.blast > 0) { e.mem.blast--; e.vx *= .8; if (e.mem.blast % 3 === 0) { enemyShoot(e, { speed: 4.2, dmg: 5, spread: .16, col: [226, 198, 130], boom: 2, oy: -hh * .3 }); const d = Math.hypot(dx, p.y - e.y) || 1; for (let k = 0; k < 3; k++) spawn(e.x + e.face * hw, e.y - hh * .3, dx / d * 5 + (R() - .5), (p.y - e.y) / d * 5 + (R() - .5), sc(), 150, SAND, 0, 1); } if (e.mem.blast === 0) e.cd = 60; return; }
    if (e.mem.slam) { if (e.ground && e.t > e.mem.slam + 10) { e.mem.slam = 0; const gx = e.x + e.face * (hw + 8), gy = e.y + hh; explode(gx | 0, gy | 0, 9, { enemy: true, col: [214, 186, 118] }); for (let k = 0; k < 20; k++) spawn(gx + (R() - .5) * 16, gy - 4, (R() - .5) * 4, -2 - R() * 3, sc(), 180, SAND, 0, 1); if (Math.abs(pl_.x - gx) < 40 && Math.abs(pl_.y - gy) < 30) { hurtTarget(e, 24); pl_.vy = -5; pl_.vx += Math.sign(pl_.x - gx) * 4; } ST.shake = 14; e.cd = 60; } return; }
    e.face = dx > 0 ? 1 : -1; e.vx += (e.face * e.def.spd * (enr ? 1.4 : 1) - e.vx) * .1; if (e.ground && e.mem.blocked && e.t - e.mem.blocked < 4) e.vy = -5.5;
    if (touch(e, hw) && !(e.mem.hitT > e.t)) { hurtTarget(e, 16); pl_.vx = e.face * 6; pl_.vy = -3; e.mem.hitT = e.t + 40; snd('punch', e.x, e.y); }
    if (e.cd > 0) return; const a = e.mem.atk = (e.mem.atk || 0) + 1;
    if (a % 3 === 1 && Math.abs(dx) < 90) { e.vy = -5; e.mem.slam = e.t; fxWord(e.x, e.y - hh - 6, 'SAND HAMMER', 1, '#e8d090', true); }
    else if (a % 3 === 2 || Math.abs(dx) > 160) { e.mem.blast = enr ? 80 : 54; fxWord(e.x, e.y - hh - 6, 'SANDBLAST', 1, '#e8d090', true); }
    else { e.mem.under = 80; fxWord(e.x, e.y - hh - 6, 'YOU CAN\'T HIT SAND!', 1, '#e8d090', true); } } });

// --- Training dummy: stands where you put it and never dies. Hit it to read your damage numbers
defineEnemy('dummy', { label: 'Training Dummy', hp: 1e7, w: 9, h: 18, fly: false, score: 0, boom: 0, glow: '',
  sprite: ['...www...', '..wrrrw..', '..wrwrw..', '..wrrrw..', '...www...', '....n....', '.nnnnnnn.', 'n.wwwww.n', '..wrrrw..', '..wrwrw..', '..wrrrw..', '..wwwww..', '....n....', '....n....', '....n....', '....n....', '..nnnnn..', '.nnnnnnn.'],
  pal: { w: rgb(236, 230, 214), r: rgb(200, 50, 44), n: rgb(120, 86, 50) },
  think(e) { e.vx *= .5; e.mem.noScore = true; if (e.hp < 5e6) e.hp = 1e7; } });
