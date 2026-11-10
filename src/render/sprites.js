// Sprite drawing (heroes, decoy, hammer, axe).
import './comic.js'; // evaluation order: runs after render/comic.js
import { ST } from '../state.js';
import { rgb } from '../world/materials.js';
import { VH, VW } from '../world/grid.js';
import { SET, mix3 } from './look.js';
import { GLOWCH, PP } from './rig.js';
import { buf, gaddS, gbuf, pix } from './canvas.js';
import { GLOW, inkOf, lit, shade } from '../art/kit.js';

let OCC=new Uint8Array(0); // which screen cells of the sprite being drawn are filled (for the outline and the lighting)

export function drawSprite(x,y,ang,face,tintG,spr,pal,hurtF,ghost,scl=1){
  // rotate a sprite around its centre (nearest-neighbour inverse mapping)
  spr=spr||ST.SPR;pal=pal||ST.SPC;const sw=spr[0].length,sh=spr.length;
  const ca=Math.cos(ang),sa=Math.sin(ang),cx=x,cy=y-sh*scl/2,RR=Math.ceil(Math.hypot(sw,sh)*scl/2)+1;
  const gc=ST.TG||ST.CH.glow,D=2*RR+3;
  if(!tintG){if(OCC.length<D*D)OCC=new Uint8Array(D*D);else OCC.fill(0,0,D*D);}
  for(let yy=-RR;yy<=RR;yy++)for(let xx=-RR;xx<=RR;xx++){
    const u=(xx*ca+yy*sa)/scl, v=(-xx*sa+yy*ca)/scl;
    const sx=Math.round(u+sw/2-.5), sy=Math.round(v+sh/2-.5);
    if(sx<0||sx>=sw||sy<0||sy>=sh)continue;
    const ch=spr[sy][face>0?sx:sw-1-sx];if(ch==='.')continue;
    if(tintG){const X=(cx+xx-ST.CX)|0,Y=(cy+yy-ST.CY)|0;gaddS(X,Y,gc[0]*.15,gc[1]*.35,gc[2]*.15);continue;}
    const o=(yy+RR+1)*D+xx+RR+1;OCC[o]=1;SPX.push(cx+xx,cy+yy,ch,o);
  }
  if(tintG)return;
  if(ghost){ // optical camouflage: a faint refractive shimmer of the silhouette
    for(let k=0;k<SPX.length;k+=4){const X=(SPX[k]-ST.CX)|0,Y=(SPX[k+1]-ST.CY)|0;if(X<0||X>=VW||Y<0||Y>=VH)continue;const o=Y*VW+X,c=buf[o],edge=((X+Y+(ST.frame>>1))%5)===0;
      buf[o]=edge?rgb(170,230,255):rgb(((c&255)*.8+40)|0,(((c>>8)&255)*.8+46)|0,(((c>>16)&255)*.8+56)|0);if(edge)gbuf[o]=rgb(40,90,120);}
    SPX.length=0;return;}
  // the outline takes a dark tint of the colour it wraps; then every pixel is lit from the upper left of the screen
  // (worked out here, after flipping and rotating, so the light never moves with the hero): open to the top or left
  // catches a rim light, open to the bottom or right falls into shade
  const gl=GLOW.get(pal);
  if(SET.ink)for(let k=0;k<SPX.length;k+=4){const X=SPX[k],Y=SPX[k+1],o=SPX[k+3],lf=!OCC[o-1],rt=!OCC[o+1],up=!OCC[o-D],dn=!OCC[o+D];
    if(lf||rt||up||dn||!OCC[o+D+1]){const c=inkOf(pal[SPX[k+2]]);if(lf)pix(X-1,Y,c);if(rt)pix(X+1,Y,c);if(up)pix(X,Y-1,c);if(dn)pix(X,Y+1,c);if(!OCC[o+D+1])pix(X+1,Y+1,c);}}
  const hurt=hurtF&&(hurtF&2);
  for(let k=0;k<SPX.length;k+=4){const ch=SPX[k+2],o=SPX[k+3];let c=pal[ch];const g=GLOWCH[ch]||(gl&&gl.has(ch));
    if(hurt)c=rgb(255,120,110);
    else if(!g){const up=!OCC[o-D],lf=!OCC[o-1];if(up||lf)c=lit(c,(up?.16:0)+(lf?.1:0));else if(!OCC[o+D]||!OCC[o+1])c=shade(c,.8);}
    pix(SPX[k],SPX[k+1],c,g?pal[ch]:0);}
  SPX.length=0;
}
// Timeslip render: every pixel of the posed sprite becomes a thread. t=0 is the whole body; as t rises each row
// smears out sideways into a long wavering strand that runs hot amber at its tip
export function drawSlip(S){const rows=S.rows,sw=rows[0].length,sh=rows.length,t=S.t,x0=S.x-sw/2,y0=S.y+PP-sh,amb=[255,190,120];
  for(let y=0;y<sh;y++){const wob=Math.sin(y*.9+ST.frame*.35)*t*5;
    for(let x=0;x<sw;x++){const ch=rows[y][S.face>0?x:sw-1-x];if(ch==='.')continue;const c=ST.SPC[ch];if(c===undefined)continue;
      const cc=mix3(c,amb,t*.3),hsh=((x*7+y*13)%11)/11,L=t*t*(50+hsh*100),dir=S.dir*((x+y)%5===0?-.35:1),X=x0+x,Y=y0+y+wob;
      const st=X+dir*L*.35*t,en=X+dir*L,n=Math.abs(en-st)|0;
      if(n<1){pix(X,Y,cc,GLOWCH[ch]?c:0);continue;}
      for(let k=0;k<=n;k++){const f=k/n;pix(st+(en-st)*f,Y+Math.sin(f*6+y+ST.frame*.2)*t*2.5,f>.9?rgb(255,200,140):cc,f>.9?rgb(200,90,20):0);}}}
}
const SPX=[];
// TG: shared state (ST in state.js)
export function drawHammer(x,y,a){const ca=Math.cos(a),sa=Math.sin(a); // a = direction the handle points from the head
  for(let k=-2;k<=2;k++)for(let w=-1;w<=1;w++){const X=x-sa*k+ca*w,Y=y+ca*k+sa*w;pix(X,Y,w===-1?rgb(214,220,232):w===1?rgb(120,126,140):rgb(170,176,186),rgb(60,90,170));}
  for(let k=2;k<7;k++)pix(x+ca*k,y+sa*k,k===6?rgb(70,50,30):rgb(116,84,50));}
export function drawAxe(x,y,spin){const ca=Math.cos(spin),sa=Math.sin(spin);
  for(let k=-3;k<=4;k++)pix(x+ca*k,y+sa*k,rgb(110,80,50)); // haft
  for(let k=-3;k<=3;k++){const d=4.5+(3-Math.abs(k))*.5;for(let w=3;w<=d;w+=.5)pix(x+ca*w-sa*k,y+sa*w+ca*k,Math.abs(k)===3||w>=d-.4?rgb(230,238,255):rgb(170,184,206),rgb(90,140,255));}}
