import './sandbox.js'; // evaluation order: runs after modes/sandbox.js
import { ST } from '../state.js';
import { pl_ } from '../player.js';
import { enemies, queueWave, spawnQ } from '../enemies/core.js';
import { banner, bossBar, defineMode, endRun } from './core.js';



// ---- Robot Uprising: endless robot waves over NYC 2099
defineMode('robots2099',{name:'Robot Uprising',sub:'NYC 2099 · wave survival',map:'nyc2099',
  desc:'Rogue machines pour out of the neon skyline. Survive endless waves; Ultron Prime arrives every 5th. 3 lives, heal between waves.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=180;s.boss=null;banner('NYC 2099','ROBOT UPRISING · get ready');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0)nextRobotWave(s);}
    else if(enemies.length===0&&spawnQ.length===0){
      const bonus=100*s.wave;ST.score+=bonus;s.phase='break';s.timer=240;
      pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.35);pl_.en=100;
      banner('WAVE '+s.wave+' CLEARED','+'+bonus+' bonus · repairs applied');}
    s.boss=enemies.find(e=>e.def.name==='ultron_prime')||null;bossBar(s.boss);
  },
  onKill(e,s){if(e.def.name==='ultron_prime'){ST.score+=1000;ST.shake=22;banner('ULTRON PRIME DOWN','+1000');}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('ARMOR BREACHED',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?'next wave in '+Math.ceil(s.timer/60)+'s':'robots left '+(enemies.length+spawnQ.length)} · lives ${s.lives}`;},
  result(s){return{title:'THE MACHINES WIN',stats:[['WAVE REACHED',s.wave],['ROBOTS SCRAPPED',ST.kills]]};}
});

function nextRobotWave(s){
  s.wave++;ST.wave=s.wave;s.phase='fight';const n=s.wave;
  const list=[['swarmbot',2+n*2],['ultron',Math.ceil(n*.6)]];
  if(n>=2)list.push(['mech',Math.floor((n-1)/2)]);
  if(n%5===0)list.push(['ultron_prime',1]);
  queueWave(list,18);
  banner('WAVE '+n,n%5===0?'ULTRON PRIME INCOMING':['Swarm detected','Mechs on the avenue','Drones over the skyways'][n%3]);
}
