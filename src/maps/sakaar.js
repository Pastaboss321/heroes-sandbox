// Sakaar: the junk planet where the universe's garbage falls through wormholes. Mountains of scrap,
// the Grandmaster's tower, the great arena with its stands, and the Devil's Anus wormhole in the sky
// that keeps dropping junk. Space-side map: stars and wormholes in a hazy amber sky.
import { ST } from '../state.js';
import { CONC, DIRT, EMPTY, GLASS, NEON, OBSID, R, RUBBLE, SAND, STEEL, STONE, mkcol, rgb } from '../world/materials.js';
import { H, VW, W, bg, bgD, col, setc, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { bodies } from '../world/support.js';
import { finishBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { mix3 } from '../render/look.js';
import { dress, skMountain, skPylon, skShanty, skShip } from './realms.js';

const JUNK=[[150,70,60],[90,110,130],[180,150,70],[70,90,80],[160,160,170],[120,60,120]];
const junkCol=(x,y)=>{const c=JUNK[((noise2(x*.2,y*.2,3)+1)*3|0)%JUNK.length],n=R()*30-15;return rgb(Math.max(0,c[0]+n),Math.max(0,c[1]+n),Math.max(0,c[2]+n));};
function scrapHeap(cx,w,h,hm){for(let x=cx-w;x<cx+w;x++){if(x<0||x>=W)continue;const d=Math.abs(x-cx)/w,top=hm[x]-Math.round(h*(1-d*d)+noise2(x,0,9)*8);for(let y=top;y<hm[x];y++){const i=y*W+x,m=R()<.6?STEEL:R()<.5?CONC:R()<.3?GLASS:STONE;setc(i,m);col[i]=junkCol(x,y);}hm[x]=Math.min(hm[x],top);}}
function hulk(x,gy){ // a crashed starship hull half sunk in the junk
  const w=90+R()*70|0,h=26+R()*14|0;for(let y=0;y<h;y++)for(let k=0;k<w;k++){const e=((k-w/2)/(w/2))**2+((y-h/2)/(h/2))**2;if(e>1)continue;const i=(gy-h*.6+y|0)*W+x+k;if(e>.7||y%8===0){setc(i,STEEL);col[i]=rgb(110+R()*20,116+R()*20,128+R()*20);}else{t[i]=0;bg[i]=rgb(40,40,48);}}
  for(let k=8;k<w-8;k+=10){const i=(gy-h*.6+h*.35|0)*W+x+k;if(t[i]===STEEL){t[i]=NEON;col[i]=rgb(255,120,60);}}}
export function genSakaar(){
  clearAll();
  const GY=380,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([60,34,70],[230,150,80],()=>{
    for(let k=0;k<400;k++){const x=R()*ST.FW|0,y=R()*(GB-40)|0;ST.far[y*ST.FW+x]=rgb(230,210,200);}
    for(let k=0;k<5;k++){const cx=R()*ST.FW,cy=30+R()*90,r=14+R()*24; // wormholes
      for(let y=-r*2;y<r*2;y++)for(let x=-r*2;x<r*2;x++){const X=cx+x|0,Y=cy+y|0;if(X<0||X>=ST.FW||Y<0)continue;const d=Math.hypot(x,y)/r,an=Math.atan2(y,x)+d*3;if(d>2)continue;const sw=(Math.sin(an*4)+1)/2,a=Math.max(0,1-d/2)*(.4+sw*.6);const o=Y*ST.FW+X,f=ST.far[o];
        const c=d<.35?[10,0,20]:[255,120+sw*100,200];ST.far[o]=rgb((f&255)*(1-a)+c[0]*a,((f>>8)&255)*(1-a)+c[1]*a,((f>>16)&255)*(1-a)+c[2]*a);if(a>.4)ST.farKeep[o]=1;}}
    for(const [amp,base,c] of [[90,GB-10,[120,70,70]],[60,GB+20,[80,46,52]]])for(let x=0;x<ST.FW;x++){const hh=base-Math.abs(Math.sin(x*.013+s))*amp-noise2(x,0,s)*20|0;for(let y=Math.max(0,hh);y<H;y++)ST.far[y*ST.FW+x]=rgb(c[0]-(y-hh)/5,c[1]-(y-hh)/6,c[2]-(y-hh)/6);}
    {const tx=ST.FW*.55|0;for(let y=20;y<H;y++){const w=y<60?3:y<90?10:18;for(let x=tx-w;x<tx+w;x++)ST.far[y*ST.FW+x]=y%7===0?rgb(255,170,90):rgb(70,40,60);}} // the Grandmaster's tower on the horizon
  });
  const hm=new Int16Array(W);
  for(let x=0;x<W;x++)hm[x]=GY+Math.sin(x*.006+s)*14+noise2(x,0,s)*10|0;
  for(let x=0;x<W;x++){const h=hm[x];for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:y<h+3?SAND:y<h+40?(R()<.5?RUBBLE:DIRT):STONE);if(y<h+40&&R()<.25){setc(i,R()<.5?STEEL:CONC);col[i]=junkCol(x,y);}}
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(46-(y-h)/12,30-(y-h)/14,30-(y-h)/14);}
  bgD.set(bg);
  for(let y=GY+70;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&noise2(x,y,s+2)>.42)setc(i,EMPTY);}
  // the arena: a bowl with stepped stands and a sand floor, the champion's gate
  const AX=W*.45|0,AW=360;
  for(let x=AX-AW;x<AX+AW;x++){const d=Math.abs(x-AX)/AW;const floor=hm[AX]+10;if(d<.6){for(let y=hm[x]-10;y<floor;y++)setc(y*W+x,EMPTY);for(let y=floor;y<floor+4;y++)setc(y*W+x,SAND);hm[x]=floor;}
    else{const step=((d-.6)/.4*8|0),top=floor-20-step*16;for(let y=top;y<floor+4;y++){const i=y*W+x;setc(i,CONC);col[i]=(y-top)%16<3?rgb(200,170,120):rgb(150,120,90);}hm[x]=top;}}
  for(const side of [-1,1]){const gx=AX+side*AW*.6|0;fill(gx-6,hm[AX]-50,gx+6,hm[AX]+10,STEEL);tint(gx-6,hm[AX]-50,gx+6,hm[AX]+10,140,110,80,10);fill(gx-4,hm[AX]-30,gx+4,hm[AX]+10,EMPTY);bgRect(gx-4,hm[AX]-30,gx+4,hm[AX]+10,rgb(30,20,20));}
  for(let x=AX-AW;x<AX+AW;x+=4){const y=hm[x]-1;if(t[y*W+x]===0&&R()<.3){const i=y*W+x;setc(i,NEON);col[i]=[rgb(255,80,140),rgb(255,200,60),rgb(80,200,255)][R()*3|0];}}
  // the Grandmaster's tower
  {const tx=W*.78|0,gy=hm[tx];for(let y=gy-340;y<gy;y++){const f=(y-gy+340)/340,hw=(6+f*30)|0;for(let x=tx-hw;x<=tx+hw;x++){const i=y*W+x;setc(i,STEEL);col[i]=(y%24<2)?rgb(255,170,80):x<tx-hw+3?rgb(60,40,70):rgb(110,70,120);}}
    for(let y=gy-300;y<gy-4;y+=24){bgRect(tx-18,y,tx+18,y+18,rgb(50,30,50));fill(tx-18,y,tx+18,y+18,EMPTY);for(let x=tx-18;x<tx+18;x+=3){const i=(y+17)*W+x;t[i]=NEON;col[i]=rgb(255,90,200);}}
    disc(tx,gy-350,14,GLASS);for(let y=-14;y<=14;y++)for(let x=-14;x<=14;x++){const i=(gy-350+y)*W+tx+x;if(t[i]===GLASS)col[i]=rgb(255,150,220);}}
  // scrap mountains and crashed ships
  for(let k=0;k<14;k++){const cx=R()*W|0;if(Math.abs(cx-AX)<AW+80||Math.abs(cx-W*.78)<80)continue;scrapHeap(cx,60+R()*120|0,40+R()*120|0,hm);}
  for(let k=0;k<5;k++){const x=R()*(W-200)|0;if(Math.abs(x-AX)<AW+120)continue;hulk(x,hm[x+60]);}
  {const TAB=[[.32,skMountain],[.24,skShanty],[.14,skShip],[.14,skPylon],[.16,()=>0]];dress(hm,40,AX-AW-30,TAB,[10,50]);dress(hm,AX+AW+30,W-40,TAB,[10,50]);} // junk mountains, shanties, wrecks (maps/realms.js)
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  ST.SPAWNX=AX-AW*.4|0;
}
export function junkFall(x,y){ // something drops out of a wormhole
  if(bodies.length>120)return;const w=6+R()*16|0,h=4+R()*10|0,lm=new Uint8Array(w*h),lc=new Uint32Array(w*h);let n=0;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){if((xx===0||xx===w-1||yy===0||yy===h-1)&&R()<.4)continue;const m=R()<.6?STEEL:CONC;lm[yy*w+xx]=m;lc[yy*w+xx]=mix3(mkcol(m),JUNK[R()*JUNK.length|0],.5);n++;}
  const b=finishBody(lm,lc,w,h,w/2,h/2,x,y,R()*6,n,false);b.vx=(R()-.5)*2;b.vy=1+R()*2;b.va=(R()-.5)*.1;b.thrown=true;
  for(let k=0;k<14;k++)spawn(x+(R()-.5)*w,y,(R()-.5)*2,(R()-.5)*2,rgb(255,140+R()*80|0,220),20,0,1,0,1);
}
export function ambSakaar(){
  if(ST.frame%3===0)spawn(ST.camX+R()*VW,ST.camY+R()*80,(R()-.5)*.3,.1,rgb(230,170,110),120,0,0,0,1); // haze
  if(ST.frame%300===0&&ST.GS==='play'&&!(ST.MODE&&ST.MODE.boss))junkFall(ST.camX+R()*VW,ST.camY-20);
}
