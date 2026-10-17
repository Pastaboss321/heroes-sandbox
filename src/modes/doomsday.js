import './robots.js'; // evaluation order: runs after modes/robots.js
import { ST } from '../state.js';
import { R } from '../world/materials.js';
import { VW } from '../world/grid.js';
import { ACT } from '../heroes/xmen.js';
import { pl_ } from '../player.js';
import { ENEMY_TYPES, enemies, spawnEnemy, spawnPoint } from '../enemies/core.js';
import { doomPortal, tvaDoor } from '../enemies/doomsday.js';
import { skyChunk } from '../maps/incursion.js';
import { banner, defineMode, endRun } from './core.js';

// ---- Doomsday: a three-way war in a collapsing New York
defineMode('doomsday',{name:'Doomsday',sub:'Incursion · three-way war',map:'incursion',
  desc:'Two universes are colliding over New York. The TVA steps out of time doors to prune everything; Doombots pour through green portals. They fight each other and you. 3 lives.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=200;s.q=[];banner('INCURSION','DOOMSDAY · the sky is breaking');},
  update(s){
    for(let n=s.q.length-1;n>=0;n--){const it=s.q[n];if(--it.d>0)continue;s.q.splice(n,1);arrive(it.type);}
    if(s.phase==='break'){if(--s.timer<=0)nextDoomWave(s);}
    else if(enemies.length===0&&s.q.length===0){const bonus=120*s.wave;ST.score+=bonus;s.phase='break';s.timer=240;pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.35);pl_.en=100;banner('WAVE '+s.wave+' SURVIVED','+'+bonus+' · the incursion worsens');}
    if(s.t%Math.max(90,300-s.wave*20)===0)skyChunk(ST.camX+R()*VW); // the sky keeps falling, faster every wave
  },
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('PRUNED',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){if(s.phase==='break')return `next wave in ${Math.ceil(s.timer/60)}s · lives ${s.lives}`;let tv=0,db=0;for(const e of enemies){if(e.team==='tva')tv++;else if(e.team==='doom')db++;}return `TVA ${tv} · Doombots ${db} · lives ${s.lives}`;},
  result(s){return{title:'UNIVERSE DESTROYED',stats:[['WAVE REACHED',s.wave],['KILLS',ST.kills]]};}
});
// an arrival: a time door (TVA) or a green portal (Doombots) opens, and the enemy steps out of it
function arrive(type){const d=ENEMY_TYPES[type],pos=spawnPoint(d);if(!pos)return;const [x,y]=pos;
  if(d.team==='tva')tvaDoor(x,y+d.h/2,60);else doomPortal(x,y,60);
  let k=0;ACT.push(()=>{if(++k<24)return true;const e=spawnEnemy(type,x,y);if(e)e.vx=(pl_.x>x?1:-1)*1.5;return false;});}
function nextDoomWave(s){s.wave++;ST.wave=s.wave;s.phase='fight';const n=s.wave;
  const L=[['tva_pruner',1+n],['tva_gunner',Math.ceil(n*.6)],['tva_jet',Math.floor(n/2)],['doombot',1+n],['doombot_jet',Math.ceil(n*.5)]];
  let k=0;for(const [type,c] of L)for(let i=0;i<c;i++)s.q.push({type,d:20+(k++)*16+R()*30|0});
  banner('WAVE '+n,n%2?'time doors opening':'Doombots incoming');}
