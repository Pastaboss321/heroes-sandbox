// Titan modes:
//  - Titan Duel: the titan who rules the chosen map (City: Galactus, Asgard: Surtur, Dark Dimension: Dormammu,
//    Knowhere: Knull, Titan: Thanos; anywhere else a random one) comes for you.
//  - Titan Gauntlet: all five, one realm after another. Beat a titan and a portal opens to the next realm.
//  - Multiverse Run: hop universe to universe through portals. Clear each world's waves to open the way on;
//    every third world is ruled by a titan. How far can you get?
import { ST } from '../state.js';
import { W } from '../world/grid.js';
import { R } from '../world/materials.js';
import { snd } from '../sfx.js';
import { pl_ } from '../player.js';
import { enemies, queueWave, spawnQ } from '../enemies/core.js';
import { TITAN_INFO, spawnTitan } from '../enemies/titans.js';
import { MAPDEFS, mapSel } from '../maps/index.js';
import { openPortal, portal } from '../world/travel.js';
import { banner, bossBar, defineMode, endRun } from './core.js';

const TITAN_OF={city:'galactus',nyc:'galactus',asgard:'surtur',dark:'dormammu',knowhere:'knull',titan:'thanos',sakaar:'thanos',moon:'galactus'};
const titanBoss=()=>enemies.find(e=>e.def.titan&&e.def.title)||null;
function arrive(s,id){s.boss=spawnTitan(id,pl_.x+(R()<.5?-1:1)*260);banner(s.boss?s.boss.def.title:'TITAN',TITAN_INFO[id].sub.toUpperCase());snd('boss',pl_.x,pl_.y,{v:1});}
defineMode('titanduel',{name:'Titan Duel',sub:'any map · one world-ender',
  desc:'The titan who rules your chosen map comes for you: Galactus over the City, Surtur in Asgard, Dormammu in the Dark Dimension, Knull on Knowhere, Thanos on Titan. Three phases each. 3 lives.',
  setup(s){s.lives=3;s.id=TITAN_OF[mapSel.value]||['galactus','thanos','dormammu','surtur','knull'][R()*5|0];s.timer=120;s.boss=null;banner('TITAN DUEL','something enormous is coming');},
  update(s){if(!s.boss){if(--s.timer===0)arrive(s,s.id);return;}s.boss=titanBoss();bossBar(s.boss);if(!s.boss&&!s.won){s.won=true;ST.score+=20000;s.end=200;banner('TITAN DOWN','+20000');}if(s.won&&--s.end<=0)endRun();},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('HERO DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return s.boss?`${s.boss.def.title} · phase ${s.boss.mem.ph||1}/3 · lives ${s.lives}`:'it approaches...';},
  result(s){return{title:s.won?'WORLD SAVED!':'WORLD ENDED',stats:[['TITAN',(TITAN_INFO[s.id]&&s.id.toUpperCase())||'?'],['TIME',Math.floor(s.t/60)+'s']]};}});
const GAUNTLET=['galactus','surtur','dormammu','knull','thanos'];
defineMode('gauntlet',{name:'Titan Gauntlet',sub:'five realms · five titans',travel:false,map:'city',
  desc:'Galactus, Surtur, Dormammu, Knull and Thanos, each in their own realm. Beat one and a portal opens to the next. Heal between fights. 3 lives.',
  setup(s){s.lives=3;s.idx=0;s.timer=140;s.boss=null;s.phase='wait';banner('TITAN GAUNTLET','five world-enders · five realms');},
  update(s){
    if(s.phase==='wait'){if(--s.timer<=0){arrive(s,GAUNTLET[s.idx]);s.phase='fight';}}
    else if(s.phase==='fight'){s.boss=titanBoss();bossBar(s.boss);if(!s.boss&&!spawnQ.length){ST.score+=10000*(s.idx+1);bossBar(null);pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.6);pl_.en=100;
        if(s.idx+1>=GAUNTLET.length){s.won=true;s.phase='done';s.timer=200;banner('THE MULTIVERSE IS SAFE','all five titans fall');return;}
        s.phase='portal';const next=TITAN_INFO[GAUNTLET[s.idx+1]].map;banner('TITAN DOWN','a portal opens to '+MAPDEFS[next].name.toUpperCase());
        openPortal(Math.max(40,Math.min(W-40,pl_.x+pl_.face*60)),pl_.y-20,next,()=>{s.idx++;s.phase='wait';s.timer=160;});}}
    else if(s.phase==='done'&&--s.timer<=0)endRun();},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('HERO DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `titan ${s.idx+1}/5${s.phase==='portal'?' · step through the portal':''} · lives ${s.lives}`;},
  result(s){return{title:s.won?'VICTORY!':'DEFEATED',stats:[['TITANS BEATEN',s.won?5:s.idx],['TIME',Math.floor(s.t/60)+'s']]};}});
const LOCALS={savage:[['brood',4],['hydra',2]],arctic:[['hydra',3],['sentinel_scout',2]],xmansion:[['sentinel_scout',3],['sentinel',1]],dark:[['mindless',4]],knowhere:[['symbiote_dragon',3],['chitauri',2]],
  titan:[['chitauri',4],['chitauri_glider',2]],sakaar:[['ultron',3],['chitauri',2]],asgard:[['chitauri_glider',3],['chitauri',3]],moon:[['ultron',3],['chitauri_glider',2]]};
defineMode('multiverse',{name:'Multiverse Run',sub:'universe-hopping roguelite',travel:false,
  desc:'Portal from universe to universe. Clear each world\'s invaders to open the way on; every third world is ruled by a titan. Score climbs with every world. 3 lives.',
  setup(s){s.lives=3;s.world=1;s.waves=0;s.phase='fight';s.timer=90;s.boss=null;banner('MULTIVERSE RUN','world 1 · '+MAPDEFS[mapSel.value].name.toUpperCase());},
  update(s){
    if(s.phase==='fight'){if(s.boss){s.boss=titanBoss();bossBar(s.boss);if(!s.boss){s.phase='clear';ST.score+=15000;}return;}
      if(!enemies.length&&!spawnQ.length&&--s.timer<=0){
        if(s.world%3===0&&s.waves===0){s.waves=99;arrive(s,TITAN_OF[mapSel.value]||['galactus','thanos','dormammu','surtur','knull'][R()*5|0]);return;}
        if(s.waves<2+Math.min(3,s.world/2|0)){s.waves++;const base=LOCALS[mapSel.value]||[['ultron',3],['chitauri',2]];queueWave(base.map(([t,c])=>[t,c+Math.floor(s.world/2)]));s.timer=80;}else s.phase='clear';}}
    else if(s.phase==='clear'){s.phase='portal';bossBar(null);ST.score+=2500*s.world;pl_.hp=Math.min(ST.CH.hp,pl_.hp+ST.CH.hp*.35);pl_.en=100;
      const pool=Object.keys(MAPDEFS).filter(id=>id!==mapSel.value),next=pool[R()*pool.length|0];banner('WORLD '+s.world+' CLEARED','the way opens to '+MAPDEFS[next].name.toUpperCase());
      openPortal(Math.max(40,Math.min(W-40,pl_.x+pl_.face*60)),pl_.y-20,next,()=>{s.world++;s.waves=0;s.phase='fight';s.timer=120;s.boss=null;});}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('HERO DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `world ${s.world}${s.phase==='portal'?' · enter the portal':s.boss?' · TITAN':' · wave '+Math.min(s.waves,9)}${''} · lives ${s.lives}`;},
  result(s){return{title:'RUN OVER',stats:[['WORLDS',s.world],['TIME',Math.floor(s.t/60)+'s']]};}});
export { portal };
