// World size and the cell grid: material/colour/life arrays, chunk activity, cell writes (setc/swap) and the dirty box.
import './physics.js'; // evaluation order: runs after world/physics.js
import { ST } from '../state.js';
import { DENS, EMBER, F, FIRE, G, GFIRE, KIND, L, R, S, SMOKE, STEAM, mkcol } from './materials.js';
import { NAT, gnd, obAdd, pin, rid, unq } from './support.js';

// ================= world size =================
// Each map picks its own size (MAPDEFS[...].w/h); setWorld() reallocates every per-cell array and tells
// the modules that keep their own per-cell or per-column arrays (onWorldResize). Every module imports
// these as live bindings, so they always see the current world.
export const VW=480, VH=270, CS=32;
export let W=1600, H=640, N=W*H, CW=Math.ceil(W/CS), CHN=Math.ceil(H/CS);

// ================= grid =================
export let t, col, life, stamp, vel;
export let bg, bgD, bgB; // bgD: backdrop with no structures; bgB: pixel belongs to a structure's backdrop
export const BACK=255; // chunk cell that is backdrop wall (drawn, no collision)           // 0 = open sky (parallax layer shows)
// hooks live on ST so a module may register before or after this one has run; a hook registered after
// the first allocation runs at once
export function onWorldResize(f){(ST.rsz||(ST.rsz=[])).push(f);if(ST.worldN)f();}
export function setWorld(w,h){
  if(t&&w===W&&h===H)return false;
  W=w;H=h;N=W*H;CW=Math.ceil(W/CS);CHN=Math.ceil(H/CS);
  t=new Uint8Array(N);col=new Uint32Array(N);life=new Uint8Array(N);stamp=new Uint8Array(N);vel=new Uint8Array(N);
  bg=new Uint32Array(N);bgD=new Uint32Array(N);bgB=new Uint8Array(N);
  ST.act=new Uint8Array(CW*CHN);ST.nxt=new Uint8Array(CW*CHN);
  ST.dx0=W;ST.dy0=H;ST.dx1=-1;ST.dy1=-1;ST.dfar=[];          // dirty box for support checks
  ST.worldN=N;for(const f of ST.rsz||[])f();
  return true;
}
setWorld(1600,640);
// clock, frame, genMode: shared state (ST in state.js)
export const booms=[];                         // deferred explosions (chain reactions)
export function wake(i){
  const x=i%W,y=(i/W)|0,cx=x>>5,cy=y>>5;
  const xa=cx>0?cx-1:0,xb=cx<CW-1?cx+1:cx,ya=cy>0?cy-1:0,yb=cy<CHN-1?cy+1:cy;
  for(let yy=ya;yy<=yb;yy++)for(let xx=xa;xx<=xb;xx++)ST.nxt[yy*CW+xx]=1;
}
// dirty areas: one main box plus up to 8 far ones, so damage on opposite ends of a long map (a titan's
// footstep, lava crusting over somewhere deep) doesn't merge into one huge box for the support check
const DM=96;
export function markDirty(i){const x=i%W,y=(i/W)|0;
  if(ST.dx1<0||(x>ST.dx0-DM&&x<ST.dx1+DM&&y>ST.dy0-DM&&y<ST.dy1+DM)){if(x<ST.dx0)ST.dx0=x;if(x>ST.dx1)ST.dx1=x;if(y<ST.dy0)ST.dy0=y;if(y>ST.dy1)ST.dy1=y;}
  else{const L=ST.dfar||(ST.dfar=[]);let r=null;for(const b of L)if(x>b[0]-DM&&x<b[2]+DM&&y>b[1]-DM&&y<b[3]+DM){r=b;break;}
    if(!r){if(L.length<8)L.push(r=[x,y,x,y]);else r=L[L.length-1];}
    if(x<r[0])r[0]=x;if(x>r[2])r[2]=x;if(y<r[1])r[1]=y;if(y>r[3])r[3]=y;}
  if(pin[i]===2||pin[i-1]===2||pin[i+1]===2||pin[i-W]===2||pin[i+W]===2)unq.push(i);}
export function lifeOf(m){switch(m){case FIRE:return 15+R()*35;case GFIRE:return 40+R()*60;case SMOKE:return 50+R()*90;case STEAM:return 90+R()*120;case EMBER:return 80+R()*120;default:return 0;}}
// CAPT: shared state (ST in state.js)
export function setc(i,m){
  if(!ST.genMode){ if((KIND[t[i]]===S||KIND[m]===S)&&m!==t[i]){markDirty(i);if(KIND[m]!==S)obAdd(i%W,(i/W)|0);} wake(i); }
  if(ST.CAPT!==null&&KIND[m]===S)ST.CAPT.push(i);
  t[i]=m;col[i]=mkcol(m);life[i]=lifeOf(m);stamp[i]=ST.clock;vel[i]=0;pin[i]=0;rid[i]=0;gnd[i]=NAT[m];
}
export function sxy(x,y,m){if(x>=0&&x<W&&y>=0&&y<H)setc(y*W+x,m);}
export function swap(i,j){
  const a=t[i];t[i]=t[j];t[j]=a;const c=col[i];col[i]=col[j];col[j]=c;
  const l=life[i];life[i]=life[j];life[j]=l;const v=vel[i];vel[i]=vel[j];vel[j]=v;
  stamp[j]=ST.clock;stamp[i]=ST.clock;wake(i);
}
export function canSink(m,tm){if(tm===0)return true;const k=KIND[tm];if(k===G||k===F)return true;if(k===L&&DENS[tm]<DENS[m])return true;return false;}
const NB=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
export function rn(i){const x=i%W,y=(i/W)|0,o=NB[(R()*8)|0],nx=x+o[0],ny=y+o[1];return(nx<0||nx>=W||ny<0||ny>=H)?-1:ny*W+nx;}
