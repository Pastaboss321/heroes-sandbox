// Shared kit helpers: small tools several heroes' powers use (targeting, damage tags, thrown-body impacts,
// sprite echoes). Each hero's powers live in that hero's own file; this file holds no powers.
import { ST } from '../state.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { pix } from '../render/canvas.js';
import { drawSprite } from '../render/sprites.js';
import { mouse } from '../player.js';
import { flash, fxWord } from '../render/fx.js';
import { ACT } from './xmen.js';
import { bodies, q } from '../world/support.js';
import { solidCells } from './wave2.js';
import { t } from '../world/grid.js';
import { KIND, OBSID, S } from '../world/materials.js';

export const tagged=(tag,f)=>{const o=ST.dmgTag;ST.dmgTag=tag;try{f();}finally{ST.dmgTag=o;}};
export const nearestN=(x,y,r,n,skip)=>(r*=ST.aoeC||1,enemies).filter(e=>e.hp>0&&!e.host&&e!==skip&&Math.hypot(e.x-x,e.y-y)<r).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,n);
export const drawPix=(x,y,c,g)=>pix(x,y,c,g?c:0);
export function ghost(x,y,face,c,a){ST.TG=c;drawSprite(x,y,0,face,true,ST.CH.spr,ST.CH.pal);ST.TG=null;}
let ROSTER=[];
export const setRoster=r=>{ROSTER=r;}; // heroes/kit.js hands the roster over once the kits are final
export const heroOf=id=>ROSTER.find(c=>c.id===id);
export function echo(id,x,y,face,c){const h=heroOf(id);if(!h)return;ST.TG=c||null;drawSprite(x,y,0,face,!!c,h.spr,h.pal);ST.TG=null;}
export const atCursor=(r=60)=>nearestEnemy(mouse.wx,mouse.wy,r);
export const noTarget=(c,w='NO TARGET')=>fxWord(mouse.wx,mouse.wy,w,.7,c,true);
export const segD=(px,py,x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,l=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((px-x0)*dx+(py-y0)*dy)/l));return Math.hypot(px-x0-dx*u,py-y0-dy*u);};
export const boxE=(x,y,m=3)=>enemies.find(e=>e.hp>0&&Math.abs(e.x-x)<e.def.w/2+m&&Math.abs(e.y-y)<e.def.h/2+m);
export function bodyImpact(b,dmg,c){const hit=new Set();let k=0,fell=0;ACT.push(()=>{k++;const gone=!bodies.includes(b);if(!gone){if(b.vy>2)fell++;for(const e of enemies)if(!hit.has(e)&&Math.hypot(e.x-b.x,e.y-b.y)<b.rmax+e.def.w/2+2){hit.add(e);hitEnemy(e,dmg,b.vx*.5,b.vy*.4);}}
  if(gone||fell>4&&Math.abs(b.vy)<.6||k>200){if(fell>4||gone){damageEnemies(b.x,b.y,(b.rmax||8)+10,dmg*.5,0,-3,true);ST.shake=Math.max(ST.shake,8);flash(b.x,b.y,20,c,4);}return false;}return true;});}
export function chunkAt(x,y,r){const n0=solidCells(x,y,r,false);let n=0;for(let j=0;j<n0;j++){const m=t[q[j]];if(KIND[m]===S&&m!==OBSID)q[n++]=q[j];}return n;}
export const fig8=(e)=>e.def.titan;
