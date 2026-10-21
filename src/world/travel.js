// Space and multiversal travel.
//  - Orbit: fly to the top of any sky and you leave the atmosphere: the game pauses on a star chart
//    and you pick where to go (the Moon, Knowhere, Titan, Sakaar, Asgard, the Dark Dimension, or back
//    to Earth). You arrive high above the new world and drop in.
//  - Multiverse: V tears open a portal in front of the hero; fly or walk into it to pick another
//    universe. Modes can also open portals themselves (openPortal) and route them (portal.to).
// Travel keeps the hero, health, energy and the run's score; it rebuilds the world (regen).
import { ST } from '../state.js';
import { R, rgb } from './materials.js';
import { VH, W } from './grid.js';
import { spawn } from './particles.js';
import { flash, fxWord, rings } from '../render/fx.js';
import { snd } from '../sfx.js';
import { SKY, keys, mouse, pl_, pressed, snapCam } from '../player.js';
import { MAPDEFS, mapSel, regen } from '../maps/index.js';
const banner=(a,b)=>ST.banner&&ST.banner(a,b);

export const UNIVERSE={city:'EARTH-616',nyc:'EARTH-616',forest:'EARTH-616',xmansion:'EARTH-616',savage:'EARTH-616',arctic:'EARTH-616',wakanda:'EARTH-616',
  nyc2099:'EARTH-928',retro:'EARTH-828',incursion:'EARTH-616 ∩ EARTH-1610',moon:'EARTH-616 · LUNA',knowhere:'KNOWHERE',titan:'TITAN',sakaar:'SAKAAR',asgard:'ASGARD',dark:'THE DARK DIMENSION'};
export const portal={on:null,to:null,cb:null};
export const canTravel=()=>ST.GS==='play'&&ST.MODE&&(ST.MODE.sandbox||ST.MODE.travel);
let panel=null,pick=[],how='orbit';
function ensurePanel(){if(panel)return panel;panel=document.createElement('div');panel.id='travel';panel.className='hidden';
  panel.innerHTML='<div class="tbox"><b id="travT">LEAVING ORBIT</b><span id="travS">PICK A DESTINATION</span><div id="travL"></div><button id="travX">STAY HERE · ESC</button></div>';
  document.body.appendChild(panel);panel.querySelector('#travX').onclick=closeTravel;return panel;}
export function openTravel(kind){
  if(ST.GS!=='play')return;how=kind;const P=ensurePanel(),L=P.querySelector('#travL');L.innerHTML='';
  P.querySelector('#travT').textContent=kind==='orbit'?'LEAVING ORBIT':'THE MULTIVERSE';
  P.querySelector('#travS').textContent=kind==='orbit'?'WHERE TO? · 1-9 OR CLICK':'CHOOSE A UNIVERSE · 1-9 OR CLICK';
  const cur=mapSel.value,ids=Object.keys(MAPDEFS).filter(id=>id!==cur);
  const order=kind==='orbit'?ids.sort((a,b)=>(MAPDEFS[b].space?1:0)-(MAPDEFS[a].space?1:0)):ids;
  pick=order;order.forEach((id,k)=>{const d=document.createElement('button');d.className='tcard'+(MAPDEFS[id].space?' sp':'');
    d.innerHTML=`<i>${k<9?k+1:''}</i><b>${MAPDEFS[id].name.toUpperCase()}</b><span>${UNIVERSE[id]||'EARTH-616'}</span>`;d.onclick=()=>go(id);L.appendChild(d);});
  ST.GS='travel';P.classList.remove('hidden');snd('wave',pl_.x,pl_.y,{v:.5});
}
export function closeTravel(){if(!panel)return;panel.classList.add('hidden');if(ST.GS==='travel'){ST.GS='play';pl_.vy=Math.max(pl_.vy,1.5);ST.orbitCd=120;}for(const k in keys)keys[k]=false;mouse.down=false;}
function go(id){panel.classList.add('hidden');ST.GS='play';travelTo(id,how);}
export function travelTo(id,kind='portal'){
  const p=pl_,keep={hp:p.hp,en:p.en,fx:p.x/W,score:ST.score,kills:ST.kills,wave:ST.wave};
  mapSel.value=id;regen();
  p.hp=keep.hp;p.en=keep.en;ST.score=keep.score;ST.kills=keep.kills;
  if(kind==='orbit'){p.x=Math.max(40,Math.min(W-40,keep.fx*W));p.y=-SKY+VH/2+80;p.vx=0;p.vy=3;p.fly=!!ST.CH.fly;}
  ST.orbitCd=150;
  snapCam();portal.on=null;
  for(let k=0;k<40;k++){const a=R()*6.283;spawn(p.x,p.y-8,Math.cos(a)*3,Math.sin(a)*3,rgb(255,230,180),24,0,1,0,1);}
  rings.push({x:p.x,y:p.y-8,r:6,vr:4,life:18,c:[255,230,180]});flash(p.x,p.y,120,[255,240,210],14);
  banner(MAPDEFS[id].name.toUpperCase(),(UNIVERSE[id]||'EARTH-616')+(kind==='orbit'?' · ARRIVING FROM ORBIT':' · THROUGH THE MULTIVERSE'));
  if(portal.cb){const cb=portal.cb;portal.cb=null;cb(id);}
}
export function openPortal(x,y,to,cb){portal.on={x,y,t:0};portal.to=to||null;portal.cb=cb||null;snd('psi',x,y,{pitch:.6,v:.9});fxWord(x,y-30,'*SHING*',1,'#ffb340',true);}
// per tick: the orbit trigger, the V key, the portal's sparks and whether the hero stepped through
export function updTravel(){
  if(ST.GS!=='play')return;const p=pl_;
  if(ST.orbitCd>0)ST.orbitCd--; // the hero can't fly above the top of the sky: pushing up against it leaves orbit
  else if(canTravel()&&p.y<=ST.PH+6-SKY+VH/2&&(keys.KeyW||keys.Space||p.vy<-.3))openTravel('orbit');
  if(canTravel()&&pressed.KeyV&&!portal.on)openPortal(p.x+p.face*40,p.y-14);
  const P=portal.on;if(!P)return;P.t++;
  const r=Math.min(18,P.t*.8);for(let k=0;k<6;k++){const a=R()*6.283;spawn(P.x+Math.cos(a)*r,P.y+Math.sin(a)*r*1.3,-Math.sin(a)*1.5,Math.cos(a)*1.5,R()<.5?rgb(255,200,80):rgb(255,140,40),10,0,1,0,1);}
  if(P.t%20===0)rings.push({x:P.x,y:P.y,r,vr:0,life:6,c:[255,190,90]});
  if(P.t>20&&Math.abs(p.x-P.x)<r*.8&&Math.abs(p.y-ST.PH/2-P.y)<r){if(portal.to){const to=portal.to;portal.to=null;travelTo(to,'portal');}else openTravel('multiverse');portal.on=null;}
  if(P.t>1200&&!portal.cb)portal.on=null;
}
addEventListener('keydown',e=>{if(ST.GS!=='travel')return;if(e.code==='Escape'){closeTravel();e.preventDefault();e.stopImmediatePropagation();return;}
  const k=+e.key;if(k>=1&&k<=9&&pick[k-1])go(pick[k-1]);},true);
