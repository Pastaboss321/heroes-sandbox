// Camera zoom (2026-10-28): the − / + buttons by the area chip (and PageDown / PageUp) change how much of the world
// the camera shows. The frame stays pixel-exact: a wider view in world pixels drawn at a smaller screen scale
// (world/grid.js setView resizes every screen buffer). Phones stop at 720 px wide to keep the frame cheap.
import { ST } from '../state.js';
import { VH, VW, setView } from '../world/grid.js';
import { snapCam } from '../player.js';

const LV=[360,420,480,560,640,720,840,960]; // view widths; 480 is 100%
let zi=2;
try{const v=+localStorage.getItem('hs.zoom');if(LV.includes(v))zi=LV.indexOf(v);}catch(e){}
const maxI=()=>window.HS_MOBILE?LV.indexOf(720):LV.length-1;
function label(){const el=document.getElementById('zoomK');if(el)el.textContent='ZOOM '+Math.round(480/LV[zi]*100)+'%';
  const a=document.getElementById('zoomIn'),b=document.getElementById('zoomOut');if(a)a.disabled=zi<=0;if(b)b.disabled=zi>=maxI();}
function apply(){zi=Math.max(0,Math.min(maxI(),zi));const w=LV[zi],h=Math.round(w*9/16)&~1,cx=ST.camX+VW/2,cy=ST.camY+VH/2;
  if(setView(w,h)){ST.camX=cx-w/2;ST.camY=cy-h/2;if(ST.GS==='play')snapCam();}
  label();try{localStorage.setItem('hs.zoom',String(w));}catch(e){}}
// d = +1 zooms in (shows less), -1 zooms out (shows more)
export function zoom(d){zi-=d;apply();}
export function initZoom(){
  const el=document.getElementById('zoomctl');
  if(el){document.getElementById('zoomIn').onclick=e=>{zoom(1);e.currentTarget.blur();};document.getElementById('zoomOut').onclick=e=>{zoom(-1);e.currentTarget.blur();};}
  addEventListener('keydown',e=>{if(e.code==='PageUp'){zoom(1);e.preventDefault();}else if(e.code==='PageDown'){zoom(-1);e.preventDefault();}});
  apply();
}
