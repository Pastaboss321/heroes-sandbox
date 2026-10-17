// Particle pool (spawn/update) and solidAt.
import '../maps/arctic.js'; // evaluation order: runs after maps/arctic.js
import { ST } from '../state.js';
import { F, FLAM, G, GFIRE, KIND, LEAF, P, R, S, STEEL, rgb } from './materials.js';
import { H, W, col, life, lifeOf, setc, t, vel, wake } from './grid.js';

// ================= particles =================
export const MP=40000, px=new Float32Array(MP),py=new Float32Array(MP),pvx=new Float32Array(MP),pvy=new Float32Array(MP),pc=new Uint32Array(MP),pl=new Int16Array(MP),pm=new Uint8Array(MP),pg=new Uint8Array(MP);
// np: shared state (ST in state.js)
// flags: 1 glow, 2 gravity, 4 drag
export function spawn(x,y,vx,vy,c,l,m,glow,grav=1,drag=0){if(ST.np>=MP)return;px[ST.np]=x;py[ST.np]=y;pvx[ST.np]=vx;pvy[ST.np]=vy;pc[ST.np]=c;pl[ST.np]=l;pm[ST.np]=m;pg[ST.np]=(glow?1:0)|(grav?2:0)|(drag?4:0);ST.np++;}
export function solidAt(x,y){if(x<0||x>=W||y>=H)return true;if(y<0)return false;const m=t[(y|0)*W+(x|0)],k=KIND[m];return(k===S&&m!==LEAF)||k===P;}
export function updParticles(){
  const ss=ST.stasis;
  for(let n=0;n<ST.np;n++){
    if(ss){const dx=px[n]-ss.x,dy=py[n]-ss.y;if(dx*dx+dy*dy<ss.r*ss.r)continue;}
    const f=pg[n];
    if(f&2)pvy[n]+=.15;
    if(f&4){pvx[n]*=.9;pvy[n]*=.9;} else pvx[n]*=.99;
    const ox=px[n],oy=py[n],nx=ox+pvx[n],ny=oy+pvy[n];
    let dead=--pl[n]<=0;
    if(!(f&4)&&ox>=0&&ox<W&&oy>=0&&oy<H){const oi=(oy|0)*W+(ox|0),om=t[oi];if(om!==0&&(KIND[om]===S||KIND[om]===P)){
      if(pm[n]&&pm[n]!==GFIRE)for(let u=1;u<5;u++){const j=oi-u*W;if(j>=0&&t[j]===0){t[j]=pm[n];col[j]=pc[n];life[j]=lifeOf(pm[n]);wake(j);break;}}
      ST.np--;px[n]=px[ST.np];py[n]=py[ST.np];pvx[n]=pvx[ST.np];pvy[n]=pvy[ST.np];pc[n]=pc[ST.np];pl[n]=pl[ST.np];pm[n]=pm[ST.np];pg[n]=pg[ST.np];n--;continue;}}
    if(nx<0||nx>=W||ny>=H||ny<-60)dead=true;
    else if(ny>=0){
      const j=(ny|0)*W+(nx|0),tm=t[j];
      if(tm!==0&&KIND[tm]!==G&&KIND[tm]!==F&&!(f&4&&!pm[n])){
        if(pm[n]&&pm[n]!==GFIRE&&!(f&8)&&Math.abs(pvx[n])+Math.abs(pvy[n])>2.4&&!dead){
          pg[n]|=8; if(solidAt(ox,ny)){pvy[n]*=-.3;pvx[n]*=.7;}else pvx[n]*=-.45; continue; }
        if(pm[n]===GFIRE){if(tm!==STEEL&&(FLAM[tm]>0||R()<.3))setc(j,GFIRE);}
        else if(pm[n]){const oi=(oy|0)*W+(ox|0);if(oy>=0&&t[oi]===0){t[oi]=pm[n];col[oi]=pc[n];life[oi]=lifeOf(pm[n]);vel[oi]=2;wake(oi);}}
        dead=true;pm[n]=0;
      }
    }
    if(dead){
      if(pm[n]&&pm[n]!==GFIRE&&ny>=0&&ny<H&&nx>=0&&nx<W){const j=(ny|0)*W+(nx|0);if(t[j]===0){t[j]=pm[n];col[j]=pc[n];life[j]=lifeOf(pm[n]);wake(j);}}
      ST.np--;px[n]=px[ST.np];py[n]=py[ST.np];pvx[n]=pvx[ST.np];pvy[n]=pvy[ST.np];pc[n]=pc[ST.np];pl[n]=pl[ST.np];pm[n]=pm[ST.np];pg[n]=pg[ST.np];n--;continue;
    }
    px[n]=nx;py[n]=ny;
  }
}
const GREEN=[rgb(80,255,120),rgb(40,220,90),rgb(160,255,180),rgb(20,180,60),rgb(210,255,220)];
export const gcol=()=>GREEN[R()*5|0];
