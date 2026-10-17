import './wrecking.js'; // evaluation order: runs after modes/wrecking.js
import { ST } from '../state.js';
import { W } from '../world/grid.js';
import { snd } from '../sfx.js';
import { pl_ } from '../player.js';
import { ENEMY_TYPES, enemies, spawnEnemy, spawnPoint, spawnQ } from '../enemies/core.js';
import { banner, bossBar, defineMode, endRun } from './core.js';

// ---- Boss Rush: the four big ones, back to back
const BOSSES=['juggernaut','ultron_prime','magneto','master_mold'];
function spawnBoss(type){const d=ENEMY_TYPES[type];for(let k=0;k<6;k++){const pos=spawnPoint(d);if(pos){const e=spawnEnemy(type,pos[0],pos[1]);if(e)return e;}}return spawnEnemy(type,Math.max(20,Math.min(W-20,pl_.x+180)),Math.max(30,pl_.y-120));}
defineMode('bossrush',{name:'Boss Rush',sub:'any map · four bosses',
  desc:'Juggernaut, Ultron Prime, Magneto and Master Mold, one after another. Heal between fights. 3 lives.',
  setup(s){s.lives=3;s.idx=-1;s.phase='break';s.timer=160;s.boss=null;banner('BOSS RUSH','four of the worst · one at a time');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0){s.idx++;if(s.idx>=BOSSES.length){s.won=true;endRun();return;}
        const b=BOSSES[s.idx];s.boss=spawnBoss(b);s.phase='fight';banner(ENEMY_TYPES[b].title,'boss '+(s.idx+1)+' of '+BOSSES.length);snd('boss',pl_.x,pl_.y,{v:.9});}}
    else{s.boss=enemies.find(e=>e.def.title)||null;bossBar(s.boss);
      if(!s.boss&&!spawnQ.length){const bonus=1500*(s.idx+1);ST.score+=bonus;s.phase='break';s.timer=260;pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.5);pl_.en=100;bossBar(null);
        for(const e of enemies){e.mem.noScore=true;e.hp=0;} // the minions scatter with their master
        banner(s.idx+1<BOSSES.length?'BOSS DOWN':'ALL BOSSES DOWN','+'+bonus+(s.idx+1<BOSSES.length?' · next one incoming':''));}}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('HERO DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?(s.idx+1<BOSSES.length?'next boss in '+Math.ceil(s.timer/60)+'s':'victory!'):'boss '+(s.idx+1)+' of '+BOSSES.length} · lives ${s.lives}`;},
  result(s){return{title:s.won?'VICTORY!':'DEFEATED',stats:[['BOSSES BEATEN',s.won?BOSSES.length:Math.max(0,s.idx)],['TIME',Math.floor(s.t/60)+'s']]};}
});
