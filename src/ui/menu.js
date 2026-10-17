// Main menu.
import { $, MODES, bestOf, bossBar, overlay, pauseRun, resumeRun, startRun } from '../modes/core.js';
import { ST } from '../state.js';
import { CHARS, HERO_DARK, HERO_UI, MOVE_TAG } from '../heroes/index.js';
import { MAPDEFS } from '../maps/index.js';
import { resetSpawn } from './spawn.js';

// ---- main menu
const SEL={mode:'robots2099',hero:0,map:'nyc'};
function buildMenu(){
  const mk=(parent,cls,parts,on,click,disabled,bgc,fg)=>{const d=document.createElement('button');d.className=cls+(on?' on':'');d.disabled=!!disabled;
    for(const [tag,cl2,txt] of parts){const e=document.createElement(tag);if(cl2)e.className=cl2;e.textContent=txt;d.appendChild(e);}
    if(bgc){d.style.background=bgc;d.style.color=fg||'#fff8e8';}d.onclick=click;parent.appendChild(d);};
  $('modes').innerHTML='';for(const id in MODES){const m=MODES[id],b=bestOf(id);
    mk($('modes'),'card mode',[['b','',m.name.toUpperCase()],['span','sub',m.sub.toUpperCase()]],SEL.mode===id,()=>{SEL.mode=id;buildMenu();});}
  {const m=MODES[SEL.mode],b=bestOf(SEL.mode),el=$('mdesc');el.innerHTML='';const h=document.createElement('b');h.textContent=m.name.toUpperCase();el.append(h,m.desc+(b?' · BEST '+b.toLocaleString():''));} // the selected story's blurb, shown once instead of on every card
  $('heroes').innerHTML='';CHARS.forEach((c,i)=>mk($('heroes'),'card',[['b','',c.name.toUpperCase()],['span','sub',`${c.hp} HP · ${MOVE_TAG[c.id]||(c.fly?'FLIES':'LEAPS')}`]],SEL.hero===i,()=>{SEL.hero=i;buildMenu();},false,HERO_UI[c.id],HERO_DARK.has(c.id)?'#14110f':null));
  const fixed=MODES[SEL.mode].map;
  $('maps').innerHTML='';for(const id in MAPDEFS)mk($('maps'),'chip',[['span','',MAPDEFS[id].name.toUpperCase()]],fixed?fixed===id:SEL.map===id,()=>{SEL.map=id;buildMenu();},fixed&&fixed!==id);
}
export function playFromMenu(){startRun(SEL.mode,SEL.hero,SEL.map);}
export function showMenu(){ST.GS='menu';ST.MODE=null;ST.MS=null;resetSpawn();document.body.classList.remove('sandbox');bossBar(null);buildMenu();overlay('menu');}
$('play').onclick=playFromMenu;
$('resume').onclick=resumeRun;
$('restart').onclick=()=>startRun(ST.RUN.mode,ST.RUN.hero,ST.RUN.map);
$('retry').onclick=()=>startRun(ST.RUN.mode,ST.RUN.hero,ST.RUN.map);
$('tomenu').onclick=showMenu;
$('tomenu2').onclick=showMenu;
$('menubtn').onclick=e=>{e.target.blur();if(ST.GS==='play')pauseRun();};
