// Enemy drawing.
import './sprites.js'; // evaluation order: runs after render/sprites.js
import { rgb } from '../world/materials.js';
import { SET } from './look.js';
import { pix } from './canvas.js';


export function drawEnemy(e){
  const d=e.def,sp=d.sprite,sw=sp[0].length,sh=sp.length,S=d.scale||1,x0=e.x-sw*S/2,y0=e.y-sh*S/2+(d.fly?Math.round(Math.sin(e.t*.12+e.x*.1)):0);
  const walk=!d.fly&&e.ground&&Math.abs(e.vx)>.12,ph=e.t*(S>1?.16:.32),legY=Math.floor(sh*.62);
  const off=(x,y)=>{if(!walk||y<legY)return 0;const side=x<sw/2?1:-1,k=(y-legY+1)/(sh-legY);return Math.round(Math.sin(ph)*side*k*1.8*S);};
  const bob=walk&&Math.abs(Math.cos(ph*2))>.75?S:0;
  if(SET.ink){const k0=rgb(20,17,15);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){if(sp[y][e.face>0?x:sw-1-x]==='.')continue;const X=x0+x*S+off(x,y),Y=y0+y*S+(y<legY?bob:0);
    for(let k=0;k<S;k++){pix(X-1,Y+k,k0);pix(X+S,Y+k,k0);pix(X+k,Y-1,k0);pix(X+k,Y+S,k0);}}}
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const ch=sp[y][e.face>0?x:sw-1-x];if(ch==='.')continue;const c=d.pal[ch];
    const cc=e.flash?rgb(255,255,255):e.frozen>0?rgb(((c&255)+380)/3,(((c>>8)&255)+460)/3,(((c>>16)&255)+500)/3):c,g=d.glow.includes(ch)?c:0,X=x0+x*S+off(x,y),Y=y0+y*S+(y<legY?bob:0);
    for(let a=0;a<S;a++)for(let b=0;b<S;b++)pix(X+a,Y+b,cc,g);}
  if(e.hp<d.hp&&!d.title){const w=Math.max(4,sw*S),f=Math.max(0,e.hp/d.hp);for(let k=0;k<w;k++)pix(x0+k,y0-3,k<w*f?rgb(255,70,60):rgb(60,20,20));}
}
