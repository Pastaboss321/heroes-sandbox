// Game-mode framework: defineMode, runs, banner, overlays.
import '../loop.js'; // evaluation order: runs after loop.js
import { ST } from '../state.js';
import { VH, VW } from '../world/grid.js';
import { snd } from '../sfx.js';
import { keys, mouse, pl_, pressed } from '../player.js';
import { setChar } from '../heroes/index.js';
import { mapSel, regen } from '../maps/index.js';
import { helpEl } from '../ui/input.js';
import { resetSpawn } from '../ui/spawn.js';

// ================= game modes =================
// Framework. To add a mode, call defineMode(id, def) — the menu picks it up automatically:
//   name, sub, desc   menu text
//   map               fixed map id (omit to let the player choose)
//   sandbox           true: free-play keys stay on (N wave, K clear, M/R map, C hero)
//   setup(s)          once at start; s is this run's state ({t} ticks so far, add your own fields)
//   update(s)         every tick while playing
//   onKill(e,s)       an enemy died
//   onDeath(s)        the player died; return true to stop the normal respawn
//   hud(s)            HUD status line
//   result(s)         {title, lines:[...]} for the game-over screen (score is the global score)
// Helpers: queueWave([[type,count],...],gap), banner(title,sub), endRun(), bossBar(enemy|null),
//          bestOf(id), CH (current hero), kills, score
export const MODES={};
// MODE, MS, GS, RUN: shared state (ST in state.js)
export function defineMode(id,def){MODES[id]=Object.assign({id,name:id,sub:'',desc:''},def);}
export const $=id=>document.getElementById(id);
export function bestOf(id){try{return +(localStorage.getItem('ironsorc.best.'+id)||0);}catch(e){return 0;}}
function saveBest(id,v){try{localStorage.setItem('ironsorc.best.'+id,String(v));}catch(e){}}
let bannerT=0;
export function banner(ti,sub){snd('wave',ST.camX+VW/2,ST.camY+VH/2,{v:.8,gap:.5});const b=$('banner');$('bT').textContent=ti;$('bS').textContent=sub||'';b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');b.style.opacity=1;clearTimeout(bannerT);bannerT=setTimeout(()=>{b.style.opacity=0;},2400);}
ST.banner=banner;
export function bossBar(e){const el=$('bossbar');if(!e){el.style.display='none';return;}el.style.display='block';$('bossN').textContent=e.def.title||'ULTRON PRIME';$('bossF').style.width=Math.max(0,e.hp/e.def.hp*100)+'%';}
export function overlay(id){for(const o of ['menu','pause','over','settings'])$(o).classList.toggle('hidden',o!==id);document.body.classList.toggle('ui-off',id==='menu'||id==='over'||(id==='settings'&&ST.setFrom==='menu'));}
export function startRun(modeId,hero,map){
  ST.MODE=MODES[modeId];ST.RUN={mode:modeId,hero,map};
  resetSpawn();
  document.body.classList.toggle('sandbox',!!ST.MODE.sandbox);
  mapSel.value=ST.MODE.map||map||'city';regen();setChar(hero);pl_.hp=ST.CH.hp;pl_.en=100;
  ST.kills=0;ST.score=0;ST.wave=0;ST.MS={t:0};for(const k in pressed)pressed[k]=false;for(const k in keys)keys[k]=false;mouse.down=false;
  helpEl.style.display=ST.MODE.sandbox?'':'none'; // H still toggles it
  bossBar(null);if(ST.MODE.setup)ST.MODE.setup(ST.MS);
  overlay(null);ST.GS='play';
}
export function endRun(){
  ST.GS='over';const id=ST.MODE.id,res=ST.MODE.result?ST.MODE.result(ST.MS):{title:'RUN OVER',lines:[]},best=bestOf(id),nb=ST.score>best;
  if(nb)saveBest(id,ST.score);
  $('overT').textContent=res.title;
  const L=$('overL');L.innerHTML='';
  for(const [label,val,hot] of [...(res.stats||[]),['SCORE',ST.score.toLocaleString(),1]]){const d=document.createElement('div');d.className='stat';const b=document.createElement('b');b.textContent=val;if(hot)b.style.color='#e23b2e';const sp=document.createElement('span');sp.textContent=label;d.append(b,sp);L.appendChild(d);}
  $('overB').textContent=nb?'NEW BEST!':'BEST '+best.toLocaleString();
  overlay('over');
}
export function pauseRun(){ST.GS='pause';overlay('pause');}
export function resumeRun(){ST.GS='play';overlay(null);for(const k in keys)keys[k]=false;}
