// Helpers shared by the X-Men kits.
import './powers.js'; // evaluation order: runs after heroes/powers.js
import { ST } from '../state.js';
import { clawSlice } from '../world/slice.js';
import { ACID, EMPTY, F, G, ICE, KIND, LAVA, OBSID, STEAM, WATER, cl, rgb } from '../world/materials.js';
import { H, W, setc, t } from '../world/grid.js';
import { lumC } from '../render/look.js';
import '../world/particles.js'; // kept for evaluation order
import { beams } from '../render/fx.js';
import { bgHit } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { mouse, pl_ } from '../player.js';
import { damageCone, enemies, hitEnemy } from '../enemies/core.js';

// ================= X-Men =================
// ACT: per-tick updaters for timed powers (return false when done)
export const ACT=[];
export const eyes=()=>({x:pl_.x+pl_.face*2.5*ST.SZ,y:pl_.y-(ST.SH-4.5)*ST.SZ});
export function aimFrom(o){const dx=mouse.wx-o.x,dy=mouse.wy-o.y,d=Math.hypot(dx,dy)||1;return{h:o,dx:dx/d,dy:dy/d,d};}
export function iceAt(x,y){x|=0;y|=0;if(x<0||x>=W||y<0||y>=H)return;const i=y*W+x,m=t[i];if(m===0||KIND[m]===G||KIND[m]===F||m===WATER||m===ACID)setc(i,ICE);else if(m===LAVA)setc(i,OBSID);}
export function freezeArea(cx,cy,r,dur,dmg){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(m===WATER||m===ACID)setc(i,ICE);else if(m===LAVA)setc(i,OBSID);else if(KIND[m]===F||m===STEAM)setc(i,EMPTY);}
  for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+e.def.w/2){e.frozen=Math.max(e.frozen||0,dur);hitEnemy(e,dmg,0,0);}
}
export function slashFx(x,y,ang){ // three claw arcs
  for(let c=-1;c<=1;c++){const pts=[];for(let k=0;k<=6;k++){const a=ang-.9+k*.3,r=9+c*2.2;pts.push([x+Math.cos(a)*r-Math.cos(ang)*6,y+Math.sin(a)*r-Math.sin(ang)*6]);}beams.push({pts,life:3,c:[250,252,255],g:[200,210,230]});}
}
export function clawSlash(a,p){
  const ang=Math.atan2(a.dy,a.dx),cx=a.h.x+a.dx*6,cy=a.h.y+a.dy*6;
  // three adamantium blades: clean kerfs (MOLTYN-style) through walls, ground and falling chunks; what they wall off slides away
  clawSlice(a.h.x,a.h.y,a.dx,a.dy,28,3,3,{edge:[236,238,250],vx:a.dx*3,vy:a.dy*3,quiet:true,push:.9});
  slashFx(cx,cy,ang);damageCone(a.h.x,a.h.y,a.dx,a.dy,24,16,3);bgHit(cx,cy,8);snd('slash',cx,cy,{gap:.06});
  p.punchF=7;ST.shake=Math.max(ST.shake,2);
}

// ---- X-Men powers 9 and 10
const MPAL={};
export function metalPal(){if(MPAL[ST.CH.id])return MPAL[ST.CH.id];const o={};for(const k in ST.SPC){const c=ST.SPC[k],l=lumC(c);o[k]=rgb(cl(l*.8+60),cl(l*.82+64),cl(l*.9+74));}o.e=o['*']=rgb(255,255,255);return MPAL[ST.CH.id]=o;}
