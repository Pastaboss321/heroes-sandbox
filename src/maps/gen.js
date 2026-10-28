// Map generation helpers (fill, disc, tint, backdrop layers) and clearAll.
import '../render/look.js'; // evaluation order: runs after render/look.js
import { ST } from '../state.js';
import { R, cl, rgb } from '../world/materials.js';
import { H, VWMAX, W, bg, col, life, onWorldResize, setc, stamp, sxy, t, vel } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { BLD } from './city.js';

// ================= map generation =================
// far, FW: shared state (ST in state.js)
 export const PAR=.35;
 export let SURF=new Int16Array(W);
 onWorldResize(()=>{SURF=new Int16Array(W);});
 // PIN2: shared state (ST in state.js)
export function fill(x0,y0,x1,y1,m,p=1){for(let y=Math.max(0,y0|0);y<Math.min(H,y1|0);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x1|0);x++)if(p>=1||R()<p)setc(y*W+x,m);}
export function disc(cx,cy,r,m,p=1){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r&&(p>=1||R()<p))sxy(cx+x|0,cy+y|0,m);}
export function tint(x0,y0,x1,y1,r,g,b,v){for(let y=y0|0;y<y1;y++)for(let x=x0|0;x<x1;x++){if(x<0||x>=W||y<0||y>=H)continue;const n=(R()*2-1)*v;col[y*W+x]=rgb(cl(r+n),cl(g+n),cl(b+n));}}
export function bgRect(x0,y0,x1,y1,c){for(let y=Math.max(0,y0|0);y<Math.min(H,y1|0);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x1|0);x++)bg[y*W+x]=c;}
export function makeFar(top,bot,layer){
  ST.FW=VWMAX+Math.ceil(W*PAR)+2; /* wide enough for the widest zoomed-out view */ ST.far=new Uint32Array(ST.FW*H); ST.farKeep=new Uint8Array(ST.FW*H);
  for(let y=0;y<H;y++){const f=y/H;const c=rgb(top[0]+(bot[0]-top[0])*f,top[1]+(bot[1]-top[1])*f,top[2]+(bot[2]-top[2])*f);ST.far.fill(c,y*ST.FW,(y+1)*ST.FW);}
  const grad=ST.far.slice();
  layer&&layer();
  ST.farBase=ST.far.slice();ST.farSky=new Uint8Array(ST.FW*H);for(let i=0;i<ST.FW*H;i++)ST.farSky[i]=ST.far[i]===grad[i]?1:0;
}
export function clearAll(){BLD.length=0;t.fill(0);life.fill(0);stamp.fill(0);vel.fill(0);bg.fill(0);bodies.length=0;}
