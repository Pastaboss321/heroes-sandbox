// Canvases, resize and pixel drawing primitives.
import '../enemies/bosses.js'; // evaluation order: runs after enemies/bosses.js
import { ST } from '../state.js';
import { rgb } from '../world/materials.js';
import { H, VH, VW, W, onWorldResize } from '../world/grid.js';

// ================= render =================
export const cv=document.getElementById('view'),ctx=cv.getContext('2d');
export const sim=document.createElement('canvas');
sim.width=VW;
sim.height=VH;
export const sctx=sim.getContext('2d');
export const img=sctx.createImageData(VW,VH),buf=new Uint32Array(img.data.buffer);
export const glc=document.createElement('canvas');
glc.width=VW;
glc.height=VH;
export const gctx=glc.getContext('2d');
export const gimg=gctx.createImageData(VW,VH),gbuf=new Uint32Array(gimg.data.buffer);
export const blur=document.createElement('canvas');
blur.width=VW/2;
blur.height=VH/2;
export const bctx=blur.getContext('2d');
export const mm=document.createElement('canvas');
export const mctx=mm.getContext('2d');
export let mimg,mbuf;
onWorldResize(()=>{mm.width=Math.ceil(W/8);mm.height=Math.ceil(H/8);mimg=mctx.createImageData(mm.width,mm.height);mbuf=new Uint32Array(mimg.data.buffer);});
// scale, ox, oy, CX, CY, GL: shared state (ST in state.js)
export function resize(){cv.width=innerWidth;cv.height=innerHeight;ST.scale=Math.max(1,Math.min(innerWidth/VW,innerHeight/VH));ST.ox=(innerWidth-VW*ST.scale)/2|0;ST.oy=(innerHeight-VH*ST.scale)/2|0;
  vig.width=cv.width;vig.height=cv.height;const g=vctx.createRadialGradient(cv.width/2,cv.height/2,Math.min(cv.width,cv.height)*.35,cv.width/2,cv.height/2,Math.max(cv.width,cv.height)*.72);
  g.addColorStop(0,'rgba(10,6,20,0)');g.addColorStop(1,'rgba(10,6,20,.6)');vctx.fillStyle=g;vctx.fillRect(0,0,vig.width,vig.height);}
export const vig=document.createElement('canvas'),vctx=vig.getContext('2d');
export function pix(x,y,c,glow){x=(x-ST.CX)|0;y=(y-ST.CY)|0;if(x<0||x>=VW||y<0||y>=VH)return;const o=y*VW+x;buf[o]=c;if(glow)gbuf[o]=glow;}
export function pixA(x,y,c,a){x=(x-ST.CX)|0;y=(y-ST.CY)|0;if(x<0||x>=VW||y<0||y>=VH)return;const o=y*VW+x,d=buf[o],e=1-a;buf[o]=rgb((c&255)*a+(d&255)*e,((c>>8)&255)*a+((d>>8)&255)*e,((c>>16)&255)*a+((d>>16)&255)*e);}
export function gaddS(x,y,r,g,b){if(x<0||x>=VW||y<0||y>=VH)return;const o=y*VW+x,c=gbuf[o];gbuf[o]=rgb(Math.min(255,(c&255)+r),Math.min(255,((c>>8)&255)+g),Math.min(255,((c>>16)&255)+b));}
export function line(x0,y0,x1,y1,c,g){const d=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))|0;for(let k=0;k<=d;k++){const f=d?k/d:0;pix(x0+(x1-x0)*f,y0+(y1-y0)*f,c,g);}}
export function circle(x,y,r,c,g){const n=Math.max(12,r*6|0);for(let k=0;k<n;k++){const a=k/n*6.283;pix(x+Math.cos(a)*r,y+Math.sin(a)*r,c,g);}}
