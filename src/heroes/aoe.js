// Area size: one multiplier the player picks with Z / X (or [ / ] when no spawn tool is held, or the
// phone's AREA buttons). Every area effect the hero causes (explosions, quakes, shockwaves, area damage,
// gravity wells, stasis bubbles...) is scaled by it; energy costs scale with it too.
// ST.aoeK is the chosen size. ST.aoeC is the size in effect right now: loop.js sets it to aoeK while
// the hero's powers run and back to 1 for enemies, the world sim and map ambience, so only the hero's
// own effects grow. Projectiles remember the size they were fired with (shot.k).
import { ST } from '../state.js';
import { rings } from '../render/fx.js';
import { mouse } from '../player.js';
import { snd } from '../sfx.js';

export const AOE_STEPS=[.4,.6,.8,1,1.25,1.5,2,2.5,3,4];
let idx=3;
try{const s=localStorage.getItem('hs.aoe'),v=s===null?NaN:+s;if(v>=0&&v<AOE_STEPS.length)idx=v|0;}catch(e){}
ST.aoeK=AOE_STEPS[idx];ST.aoeC=1;ST.aoeShow=0;
export function setAoe(i){
  idx=Math.max(0,Math.min(AOE_STEPS.length-1,i));ST.aoeK=AOE_STEPS[idx];ST.aoeShow=70;
  try{localStorage.setItem('hs.aoe',String(idx));}catch(e){}
  rings.push({x:mouse.wx,y:mouse.wy,r:24*ST.aoeK,vr:0,life:16,c:[255,230,120]});
  snd('pop',mouse.wx,mouse.wy,{v:.35,pitch:.7+idx*.12});
  const el=document.getElementById('aoechip');if(el){el.textContent='AREA ×'+ST.aoeK;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
}
{const el0=document.getElementById('aoechip');if(el0)el0.textContent='AREA ×'+ST.aoeK;}
export const aoeBigger=()=>setAoe(idx+1), aoeSmaller=()=>setAoe(idx-1);
// energy cost multiplier for the current size: bigger areas cost more, smaller ones a little less
export const aoeCost=()=>1+(ST.aoeK-1)*.55;
// radius helper for hero-built effects that keep their own radius (vortex, stasis, storms)
export const aoeR=r=>r*ST.aoeC;
// explosions get big fast (cost ~r²); keep the biggest manageable
export const AOE_MAXR=72;
