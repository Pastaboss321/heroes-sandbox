import './robots.js'; // evaluation order: runs after modes/robots.js
import { ST } from '../state.js';
import { fxWord } from '../render/fx.js';
import { pl_ } from '../player.js';
import { enemies, queueWave, spawnQ } from '../enemies/core.js';
import { banner, bossBar, defineMode, endRun } from './core.js';



// ---- Sentinel Siege: giant Sentinels march on the X-Mansion
defineMode('sentinels',{name:'Sentinel Siege',sub:'X-Mansion · giant waves',map:'xmansion',
  desc:'Giant Sentinels march on the Xavier Institute. Hold the courtyard; Master Mold arrives every 5th wave. 3 lives, heal between waves.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=200;s.boss=null;banner('X-MANSION','SENTINEL SIEGE · protect the school');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0)nextSentinelWave(s);}
    else if(enemies.length===0&&spawnQ.length===0){
      const bonus=150*s.wave;ST.score+=bonus;s.phase='break';s.timer=260;
      pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.4);pl_.en=100;
      banner('WAVE '+s.wave+' REPELLED','+'+bonus+' bonus · the students are safe');}
    s.boss=enemies.find(e=>e.def.name==='master_mold')||null;bossBar(s.boss);
  },
  onKill(e,s){if(e.def.name==='master_mold'){ST.score+=2500;ST.shake=22;banner('MASTER MOLD DESTROYED','+2500');}
    else if(e.def.name==='sentinel'){fxWord(e.x,e.y-30,'SENTINEL DOWN!',1.4,'#ffc93c',true);ST.hitstop=Math.max(ST.hitstop,3);}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('MUTANT DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?'next wave in '+Math.ceil(s.timer/60)+'s':'sentinels left '+(enemies.length+spawnQ.length)} · lives ${s.lives}`;},
  result(s){return{title:'THE SENTINELS WIN',stats:[['WAVE REACHED',s.wave],['SENTINELS SCRAPPED',ST.kills]]};}
});

function nextSentinelWave(s){
  s.wave++;ST.wave=s.wave;s.phase='fight';const n=s.wave;
  const list=[['sentinel_scout',1+n],['sentinel',Math.ceil(n/2)]];
  if(n%5===0)list.push(['master_mold',1]);
  queueWave(list,40);
  banner('WAVE '+n,n%5===0?'MASTER MOLD APPROACHES':['Sentinels on the lawn','Mutant detection active','They are coming for the students'][n%3]);
}
