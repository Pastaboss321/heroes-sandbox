import './bossrush.js'; // evaluation order: runs after modes/bossrush.js
import { ST } from '../state.js';
import { pl_ } from '../player.js';
import { enemies, queueWave, spawnQ } from '../enemies/core.js';
import { banner, bossBar, defineMode, endRun } from './core.js';

// ---- Savage Land Swarm: the Brood pour out of the volcano caves; Hydra strike teams and Magneto join in
defineMode('savage',{name:'Savage Land Swarm',sub:'Savage Land · brood waves',map:'savage',
  desc:'Brood hives have hatched beneath the volcano. Survive waves of leaping aliens and Hydra jet-troopers; Magneto descends every 5th wave. 3 lives, heal between waves.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=200;s.boss=null;banner('SAVAGE LAND','THE BROOD ARE HATCHING');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0){s.wave++;ST.wave=s.wave;s.phase='fight';const n=s.wave,list=[['brood',3+n*2]];if(n>=3)list.push(['hydra',Math.floor((n-1)/2)]);if(n%5===0)list.push(['magneto',1]);
        queueWave(list,16);banner('WAVE '+n,n%5===0?'MAGNETO DESCENDS':['They come from the caves','Watch the trees','Hydra strike team inbound'][n%3]);}}
    else if(enemies.length===0&&spawnQ.length===0){const bonus=120*s.wave;ST.score+=bonus;s.phase='break';s.timer=240;pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.35);pl_.en=100;banner('WAVE '+s.wave+' SURVIVED','+'+bonus+' bonus');}
    s.boss=enemies.find(e=>e.def.name==='magneto')||null;bossBar(s.boss);},
  onKill(e,s){if(e.def.name==='magneto'){ST.score+=2000;ST.shake=22;banner('MAGNETO RETREATS','+2000');}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('OVERRUN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?'next wave in '+Math.ceil(s.timer/60)+'s':'brood left '+(enemies.length+spawnQ.length)} · lives ${s.lives}`;},
  result(s){return{title:'THE HIVE WINS',stats:[['WAVE REACHED',s.wave],['BROOD SQUASHED',ST.kills]]};}
});
