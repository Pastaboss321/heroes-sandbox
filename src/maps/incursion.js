// Incursion New York: two universes touching, falling sky chunks.
import './retro.js'; // evaluation order: runs after maps/retro.js
import { ST } from '../state.js';
import { CONC, EMPTY, FIRE, GFIRE, GLASS, KIND, LAVA, P, R, RUBBLE, S, STEEL, mkcol, rgb } from '../world/materials.js';
import { H, N, VH, VW, W, col, setc, t } from '../world/grid.js';
import { bodies, gnd } from '../world/support.js';
import { finishBody } from '../world/bodies.js';
import { mix3 } from '../render/look.js';
import { disc, fill, makeFar } from './gen.js';
import { BLD, genCity } from './city.js';
import { spawn, spawnFlake } from '../world/particles.js';
import { shade } from '../world/destruction.js';
import { zap } from '../heroes/powers.js';

// ---- Incursion New York: two universes touching. A blood-red sky splitting along glowing cracks,
//      another city hanging upside down from the heavens, ruins floating loose, the streets cratered and burning
export function genIncursion(){
  genCity();
  const GY=330, GB=143+(GY-143)*.5|0;
  makeFar([92,18,40],[236,96,62],()=>{
    for(let x=0;x<ST.FW;){const w=8+R()*24|0,h=30+R()*120|0;for(let y=0;y<h;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++)ST.far[y*ST.FW+xx]=(xx%4===1&&y%6===3&&R()<.25)?rgb(255,170,110):y>h-3?rgb(255,120,90):rgb(70,22,44);x+=w+2+(R()*6|0);} // the other city, upside down, its broken edge glowing
    for(let k=0;k<70;k++){let x=R()*ST.FW;const y0=20+R()*120|0,L=40+R()*140|0;for(let y=y0;y<Math.min(H,y0+L);y++){x+=Math.sin(y*.05+k)*.35;if(R()<.85&&x>=0&&x<ST.FW)ST.far[y*ST.FW+(x|0)]=R()<.3?rgb(255,150,120):rgb(150,60,80);}} // strands pulled between the two cities
    for(let k=0;k<40;k++){const cx=R()*ST.FW|0,cy=120+R()*150|0,w=4+R()*16|0,h=3+R()*10|0;for(let y=cy;y<cy+h;y++)for(let xx=cx;xx<cx+w&&xx<ST.FW;xx++)if(R()<.92)ST.far[y*ST.FW+xx]=rgb(84,30,48);} // floating ruins
    for(let k=0;k<12;k++){let x=R()*ST.FW,y=60+R()*140;for(let st=0;st<220;st++){x+=(R()-.5)*3+(k%2?1:-1)*.9;y+=(R()-.5)*3.4;const X=x|0,Y=y|0;if(X>=1&&X<ST.FW-1&&Y>=1&&Y<H-2){ST.far[Y*ST.FW+X]=rgb(255,240,210);ST.far[Y*ST.FW+X+1]=rgb(255,200,150);ST.far[(Y+1)*ST.FW+X]=rgb(255,90,70);ST.far[(Y-1)*ST.FW+X]=rgb(255,120,90);ST.farKeep[Y*ST.FW+X]=1;}}} // cracks in the sky, kept bright
    for(const [base,c] of [[GB-10,rgb(60,20,28)],[GB+20,rgb(36,12,20)]])for(let x=0;x<ST.FW;){const w=8+R()*26|0,h=30+R()*150|0,top=base-h;for(let y=Math.max(0,top);y<H;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++){if(y<top+6&&R()<.5)continue;ST.far[y*ST.FW+xx]=(xx%4===1&&y%6===2&&R()<.15)?rgb(255,120,60):c;}x+=w+1+(R()*3|0);}
  });
  // ruin the street: torn-off tops, craters, rubble heaps, fissures and fires
  for(const [x0,x1,top] of BLD){if(R()<.85){const cut=top+(.2+R()*.5)*(GY-top);for(let x=x0;x<x1;x++){const c2=cut+Math.sin(x*.7)*6+R()*8;fill(x,top-30,x+1,c2,EMPTY);}}}
  for(let k=0;k<26;k++){const x=R()*W|0,y=GY-10-R()*160|0;disc(x,y,8+R()*18|0,EMPTY);}
  for(let k=0;k<5;k++){const x=40+R()*(W-80)|0;fill(x,GY-2,x+4,GY+18,EMPTY);fill(x,GY+14,x+4,GY+18,LAVA);}
  for(let k=0;k<22;k++){const x=R()*W|0,w=6+R()*16|0;for(let h=0;h<w/2;h++)fill(x+h,GY-1-h,x+w-h,GY-h,RUBBLE);}
  for(let i=0;i<N;i++){const m=t[i];if(m&&(KIND[m]===S||KIND[m]===P))col[i]=mix3(col[i],[118,70,70],.38);}
  for(let k=0;k<40;k++){const x=R()*W|0;let y=0;while(y<GY&&!t[y*W+x])y++;if(y>2&&y<GY&&t[(y-1)*W+x]===0)setc((y-1)*W+x,R()<.2?GFIRE:FIRE);}
}
export function skyChunk(x){ // a piece of the falling universe: a slab of building drops out of the sky
  if(bodies.length>120)return;const w=6+R()*10|0,h=5+R()*8|0,lm=new Uint8Array(w*h),lc=new Uint32Array(w*h);let n=0;
  for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){if((xx===0||xx===w-1||y===0||y===h-1)&&R()<.35)continue;const m=R()<.15?STEEL:R()<.15?GLASS:CONC;lm[y*w+xx]=m;lc[y*w+xx]=mix3(mkcol(m),[110,60,60],.3);n++;}
  const b=finishBody(lm,lc,w,h,w/2,h/2,x,ST.camY-24,R()*6,n,false);b.vx=(R()-.5)*2;b.vy=2+R()*2;b.va=(R()-.5)*.08;b.thrown=true;
  for(let k=0;k<6;k++)spawn(x+(R()-.5)*w,ST.camY-20,(R()-.5),1,rgb(255,140,90),30,0,1,0,1);
}
export function ambIncursion(){
  for(let k=0;k<2;k++)spawnFlake(ST.camX+R()*VW,ST.camY-2,(R()-.5)*.3,.6+R()*.5,R()<.5?rgb(90,80,80):rgb(140,120,110),300,0); // falling ash
  if(R()<.05)spawn(ST.camX+R()*VW,ST.camY+VH,(R()-.5)*.4,-.8-R(),rgb(255,120+R()*80|0,40),140,0,1,0,1); // embers rising
  // the city comes apart at the seams: exposed building cells peel off as threads drifting up into the broken sky
  for(let k=0;k<6;k++){const X=ST.camX+R()*VW|0,Y=ST.camY+R()*VH|0;if(X<1||X>=W-1||Y<1||Y>=H-50)continue;const i=Y*W+X,m=t[i];
    if(KIND[m]!==S||gnd[i]||m===STEEL)continue;const side=t[i-1]===0?-1:t[i+1]===0?1:0;if(t[i-W]!==0&&!side)continue;
    const c=col[i],vx=side*(.25+R()*.3)+(R()-.5)*.15,vy=-(.35+R()*.45);
    for(let j=0;j<5;j++)spawn(X,Y,vx*(1+j*.18),vy*(1+j*.22),j?shade(c,1-j*.08):mix3(c,[255,170,150],.4),150+R()*60,0,j===0?1:0,0,0);
    setc(i,EMPTY);}
  if(ST.frame%240===0&&R()<.5){const x=ST.camX+R()*VW;zap(x,ST.camY-10,x+(R()-.5)*60,ST.camY+40+R()*60,[255,200,190],[255,40,60]);}
  if(ST.frame%420===0&&ST.GS==='play'&&!(ST.MODE&&ST.MODE.id==='doomsday'))skyChunk(ST.camX+R()*VW);
}
