// Main menu.
import { $, MODES, bestOf, bossBar, overlay, pauseRun, resumeRun, startRun } from '../modes/core.js';
import { ST } from '../state.js';
import { CHARS, HERO_UI, MOVE_TAG } from '../heroes/index.js';
import { TRAITS } from '../heroes/traits.js';
import { MAPDEFS } from '../maps/index.js';
import { resetSpawn } from './spawn.js';
import { paintHero, portrait } from './portrait.js';
import { powerKind } from '../heroes/kit.js';

// ---- main menu
const SEL={mode:'robots2099',hero:0,map:'nyc',filter:'ALL',q:''};
const NEWH=new Set(['daredevil','hawkeye','widow','ironfist','namor','sandman','goblin','mysterio']);
const FILTERS={ALL:()=>true,NEW:c=>NEWH.has(c.id),FLIERS:c=>!!c.fly,GROUND:c=>!c.fly,HEAVY:c=>c.hp>=420,FAST:c=>c.run>=2.3};
// the selected hero's panel: an animated figure, the numbers, the trait, the whole kit
let animT=0,animK=0;
function heroPanel(){const c=CHARS[SEL.hero],el=$('hdesc');if(!el)return;el.innerHTML='';el.style.setProperty('--acc',HERO_UI[c.id]||'#2f8f4e');
  const A=c.art,k=4,cv=document.createElement('canvas');cv.width=((A?A.w:16)+8)*k;cv.height=((A?A.h:26)+8)*k;cv.className='hfig';el.appendChild(cv);
  const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;const SEQ=[...Array(10).fill('idle'),0,1,2,3,4,5,0,1,2,3,4,5,...Array(8).fill('sig')];
  const draw=()=>{cx.clearRect(0,0,cv.width,cv.height);paintHero(cx,c,4*k,6*k,k,{pose:SEQ[animK%SEQ.length]});animK++;};clearInterval(animT);animK=0;draw();animT=setInterval(()=>{if(ST.GS!=='menu'||!cv.isConnected){clearInterval(animT);return;}draw();},130);
  const col=document.createElement('div');col.className='hcolr';el.appendChild(col);const add=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;col.appendChild(e);return e;};
  add('b','hn',c.name.toUpperCase()+(NEWH.has(c.id)?'  · NEW':''));add('span','sub',(MOVE_TAG[c.id]||(c.fly?'FLIES':'LEAPS'))+(c.fly?' · FLIES':''));
  const bars=add('div','hbars');for(const [lab,v,txt] of [['HEALTH',c.hp/620,c.hp],['ARMOUR',1-(c.armor-.3)/.7,Math.round((1-c.armor)*100)+'% off'],['SPEED',(c.run-1.6)/.9,c.run.toFixed(1)],['JUMP',(c.jump-4)/2.2,c.jump.toFixed(1)]]){const r=document.createElement('div');r.className='hbar';r.innerHTML='<span></span><i><u></u></i><em></em>';r.children[0].textContent=lab;r.querySelector('u').style.width=Math.round(Math.max(.06,Math.min(1,v))*100)+'%';r.children[2].textContent=txt;bars.appendChild(r);}
  const tr=TRAITS[c.id];if(tr){const t=add('p','htr');const b=document.createElement('b');b.textContent='TRAIT · '+tr.n.toUpperCase()+'  ';t.append(b,tr.d);if(tr.aw){const a=add('p','htr aw');const b2=document.createElement('b');b2.textContent='ULTIMATE AWAKENS · '+tr.aw.n.toUpperCase()+'  ';a.append(b2,tr.aw.d);}}
  const pl=add('div','hpw');c.powers.forEach((pw,i)=>{const kd=powerKind(pw),d=document.createElement('span');d.className='k-'+kd;d.textContent=pw.n;d.title=kd==='ult'?'ultimate (G)':kd==='hold'?'hold':kd==='move'?'moves the hero':'tap';pl.appendChild(d);});
}
function fillHeroes(){const H=$('heroes'),flt=FILTERS[SEL.filter]||FILTERS.ALL,q=SEL.q.trim().toLowerCase();H.innerHTML='';let n=0;
  CHARS.forEach((c,i)=>{if(!flt(c)||q&&!c.name.toLowerCase().includes(q))return;n++;const d=document.createElement('button');d.className='card hero'+(SEL.hero===i?' on':'');d.style.setProperty('--acc',HERO_UI[c.id]||'#2f8f4e');
    d.appendChild(portrait(c,2,{back:false}));const tx=document.createElement('span');tx.className='htx';for(const [tag,cls,txt] of [['b','',c.name.toUpperCase()],['span','sub',`${c.hp} HP · ${MOVE_TAG[c.id]||(c.fly?'FLIES':'LEAPS')}`],['span','sub trt',TRAITS[c.id]?TRAITS[c.id].n.toUpperCase():'']]){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=txt;tx.appendChild(e);}d.appendChild(tx);
    if(NEWH.has(c.id)){const nb=document.createElement('i');nb.className='nb';nb.textContent='NEW';d.appendChild(nb);}
    d.onclick=()=>{SEL.hero=i;fillHeroes();heroPanel();};H.appendChild(d);});
  if(!n){const e=document.createElement('p');e.className='hnone';e.textContent='NO HERO MATCHES';H.appendChild(e);}}
function buildMenu(){
  const mk=(parent,cls,parts,on,click,disabled,acc)=>{const d=document.createElement('button');d.className=cls+(on?' on':'');d.disabled=!!disabled;
    for(const [tag,cl2,txt] of parts){const e=document.createElement(tag);if(cl2)e.className=cl2;e.textContent=txt;d.appendChild(e);}
    if(acc)d.style.setProperty('--acc',acc);d.onclick=click;parent.appendChild(d);};
  $('modes').innerHTML='';for(const id in MODES){const m=MODES[id],b=bestOf(id);
    mk($('modes'),'card mode',[['b','',m.name.toUpperCase()],['span','sub',m.sub.toUpperCase()]],SEL.mode===id,()=>{SEL.mode=id;buildMenu();});}
  {const m=MODES[SEL.mode],b=bestOf(SEL.mode),el=$('mdesc');el.innerHTML='';const h=document.createElement('b');h.textContent=m.name.toUpperCase();el.append(h,m.desc+(b?' · BEST '+b.toLocaleString():''));} // the selected story's blurb, shown once instead of on every card
  { // filter chips and a name search above the grid
    const fr=$('hfilter');fr.innerHTML='';for(const f in FILTERS)mk(fr,'chip',[['span','',f]],SEL.filter===f,()=>{SEL.filter=f;buildMenu();});
    const q=document.createElement('input');q.type='search';q.placeholder='SEARCH';q.value=SEL.q;q.className='hq';q.oninput=()=>{SEL.q=q.value;fillHeroes();};q.onkeydown=e=>e.stopPropagation();fr.appendChild(q);}
  fillHeroes();heroPanel();
  const fixed=MODES[SEL.mode].map;
  $('maps').innerHTML='';for(const id in MAPDEFS)mk($('maps'),'chip',[['span','',MAPDEFS[id].name.toUpperCase()]],fixed?fixed===id:SEL.map===id,()=>{SEL.map=id;buildMenu();},fixed&&fixed!==id);
}
// worlds are big: put up a card first so the browser paints it before the (blocking) generation
export function playFromMenu(){loading(true);setTimeout(()=>{try{startRun(SEL.mode,SEL.hero,SEL.map);}finally{loading(false);}},40);}
export function loading(on){let el=document.getElementById('loading');if(!el){el=document.createElement('div');el.id='loading';el.innerHTML='<b>BUILDING THE WORLD...</b><span>EVERY PIXEL IS SIMULATED</span>';document.body.appendChild(el);}el.classList.toggle('on',on);}
export function showMenu(){ST.GS='menu';ST.MODE=null;ST.MS=null;resetSpawn();document.body.classList.remove('sandbox');bossBar(null);buildMenu();overlay('menu');}
$('play').onclick=playFromMenu;
$('resume').onclick=resumeRun;
$('restart').onclick=()=>startRun(ST.RUN.mode,ST.RUN.hero,ST.RUN.map);
$('retry').onclick=()=>startRun(ST.RUN.mode,ST.RUN.hero,ST.RUN.map);
$('tomenu').onclick=showMenu;
$('tomenu2').onclick=showMenu;
$('menubtn').onclick=e=>{e.target.blur();if(ST.GS==='play')pauseRun();};
