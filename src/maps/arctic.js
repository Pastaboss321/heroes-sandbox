import './savage.js'; // evaluation order: runs after maps/savage.js
import { ST } from '../state.js';
import { CONC, DIRT, EMPTY, GLASS, ICE, KIND, LAVA, NEON, OBSID, OIL, PROPANE, R, S, SNOW, STEEL, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, VW, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { spawn } from '../world/particles.js';


// ---- Weapon X: the secret facility dug into a snowbound mountain. Snowfields that slide, a frozen lake,
// labs with experiment tanks behind a blast door, a fuel depot and a radio mast.
export function genArctic(){
  clearAll();
  const s=R()*100,GY=352;
  makeFar([118,150,198],[222,232,244],()=>{
    for(const [amp,base,c] of [[120,196,[196,208,228]],[72,240,[146,166,196]]])for(let x=0;x<ST.FW;x++){const ridge=Math.abs(((x*.0065+s+base)%1)-.5)*2,hh=base-amp*(1-ridge)-Math.sin(x*.05)*6|0;
      for(let y=Math.max(0,hh);y<H;y++){const k=y-hh;ST.far[y*ST.FW+x]=k<5+((x>>3)&1)*3?rgb(242,246,252):rgb(c[0]-k/5,c[1]-k/5,c[2]-k/6);}}
    for(let k=0;k<10;k++){const cx=R()*ST.FW|0,cy=30+R()*60|0;for(let y=-4;y<=4;y++)for(let x=-22;x<=22;x++)if(x*x/484+y*y/16<1&&cy+y>=0)ST.far[(cy+y)*ST.FW+((cx+x+ST.FW)%ST.FW)]=rgb(236,242,250);}
  });
  const hm=[];
  for(let x=0;x<W;x++){let h=GY+Math.sin(x*.011+s)*8+Math.sin(x*.043+s)*3;if(x<400)h-=(400-x)*.42+Math.sin(x*.09)*6;if(x>1000)h-=Math.min(190,(x-1000)*.6)-Math.sin(x*.07)*5;hm[x]=h|0;}
  for(let x=0;x<W;x++){const h=hm[x],sd=3+((Math.sin(x*.13+s)+1)*2|0),dd=h+sd+6;
    for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:y<h+sd?SNOW:y<dd?DIRT:STONE);}
    tint(x,h+sd,x+1,h+sd+6,92,84,80,8);tint(x,h+sd+6,x+1,Math.min(H,h+120),104,112,126,10);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(30-(y-h)/16,34-(y-h)/16,40-(y-h)/14);}
  bgD.set(bg);
  for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(y>hm[x]+60&&(x<1040||x>1520)&&noise2(x,y,s)>.4)setc(y*W+x,EMPTY);}
  for(let y=H-28;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0)setc(i,y>H-18?LAVA:EMPTY);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // glacier ice on the high slopes
  for(let x=0;x<W;x++)if(hm[x]<GY-80&&noise2(x,9,s)>.05)for(let y=hm[x]+4;y<hm[x]+10;y++)setc(y*W+x,ICE);
  // frozen lake: a basin of water under a crust of ice
  {const a=470,b=790,c=(a+b)/2,hw=(b-a)/2,top=Math.max(hm[a],hm[b-1])+1;for(let x=a;x<b;x++){const d=1-((x-c)/hw)**2,dep=Math.max(0,32*d|0);
      for(let y=Math.min(top,hm[x]);y<top+dep;y++)setc(y*W+x,y<top-1?EMPTY:y<top+3?ICE:WATER);}}
  // the facility inside the right-hand mountain
  const fx0=1090,fx1=1440,floors=[GY-18,GY+30,GY+78];
  for(const fy of floors){fill(fx0,fy-26,fx1,fy,EMPTY);bgRect(fx0,fy-26,fx1,fy,rgb(46,54,64));
    for(let x=fx0;x<fx1;x+=12)bgRect(x,fy-26,x+1,fy,rgb(34,40,48));bgRect(fx0,fy-24,fx1,fy-23,rgb(200,210,90));
    fill(fx0-3,fy,fx1+3,fy+3,CONC);tint(fx0-3,fy,fx1+3,fy+3,120,124,130,6);fill(fx0-3,fy-29,fx1+3,fy-26,CONC);tint(fx0-3,fy-29,fx1+3,fy-26,110,114,120,6);
    fill(fx0-3,fy-26,fx0,fy,CONC);fill(fx1,fy-26,fx1+3,fy,CONC);
    for(let px=fx0+40;px<fx1-30;px+=70){fill(px,fy-26,px+2,fy-10,CONC);tint(px,fy-26,px+2,fy-10,130,134,140,6);}
    for(let x=fx0+12;x<fx1-12;x+=40){const r=R();
      if(r<.3){fill(x,fy-20,x+8,fy,GLASS);fill(x+1,fy-18,x+7,fy-1,WATER);tint(x+1,fy-18,x+7,fy-1,90,220,120,14);fill(x-1,fy-22,x+9,fy-20,STEEL);fill(x-1,fy-1,x+9,fy,STEEL);} // experiment tank (green growth medium, not acid: it would eat through the floors)
      else if(r<.55){fill(x,fy-16,x+7,fy,STEEL);tint(x,fy-16,x+7,fy,60,66,76,4);for(let yy=fy-14;yy<fy-1;yy+=3){const i=yy*W+x+2;t[i]=NEON;col[i]=R()<.5?rgb(80,255,120):rgb(255,70,60);}} // server rack
      else if(r<.75){fill(x,fy-6,x+10,fy-5,WOOD);fill(x,fy-5,x+1,fy,WOOD);fill(x+9,fy-5,x+10,fy,WOOD);fill(x+3,fy-9,x+7,fy-6,STEEL);} // desk + terminal
      else {fill(x,fy-6,x+5,fy,STEEL);fill(x+1,fy-5,x+4,fy-1,OIL);}}}
  // the adamantium tank on the lowest floor
  {const tx=1250,fy=floors[2];fill(tx-10,fy-24,tx+10,fy,STEEL);tint(tx-10,fy-24,tx+10,fy,150,158,170,6);fill(tx-7,fy-21,tx+7,fy-2,WATER);tint(tx-7,fy-21,tx+7,fy-2,120,220,230,10);
    for(let yy=fy-21;yy<fy-2;yy+=4){const i=yy*W+tx-8;t[i]=NEON;col[i]=rgb(120,240,255);}}
  // elevator shaft through every floor, and the entrance tunnel with its blast door
  fill(fx1-24,floors[0]-26,fx1-14,floors[2],EMPTY);bgRect(fx1-24,floors[0]-26,fx1-14,floors[2],rgb(30,34,40));fill(fx1-25,floors[0]-26,fx1-24,floors[2],STEEL);fill(fx1-14,floors[0]-26,fx1-13,floors[2],STEEL);
  {const fy=floors[0];let ex=fx0;while(ex>900&&hm[ex]<fy-2)ex--;fill(ex,fy-26,fx0,fy,EMPTY);bgRect(ex,fy-26,fx0,fy,rgb(40,46,54));fill(ex-2,fy,fx0,fy+3,CONC);fill(ex-2,fy-29,fx0,fy-26,CONC);
    const dx=fx0-8;fill(dx,fy-26,dx+4,fy,STEEL);for(let yy=fy-26;yy<fy;yy++)for(let xx=dx;xx<dx+4;xx++)col[yy*W+xx]=((xx+yy)>>1)&1?rgb(220,190,40):rgb(30,30,34);}
  // fuel depot, helipad and radio mast outside
  {const dx=930,gy=hm[dx];fill(dx-6,gy-1,dx+64,gy+2,CONC);for(let k=0;k<3;k++){const x=dx+k*22;fill(x,gy-13,x+16,gy-1,STEEL);tint(x,gy-13,x+16,gy-1,200,60,50,10);fill(x+2,gy-11,x+14,gy-2,PROPANE);}}
  {const hx=1500,gy=hm[hx];fill(hx-30,gy-2,hx+30,gy+2,CONC);tint(hx-30,gy-2,hx+30,gy+2,90,92,96,6);for(let y=gy-1;y<gy;y++)for(const xx of [hx-6,hx+5])for(let k=-1;k<=1;k++){const i=y*W+xx;t[i]=NEON;col[i]=rgb(255,220,80);}
    const mx=1560,my=hm[mx];for(let y=my-70;y<my;y++){sxy(mx,y,STEEL);sxy(mx+6,y,STEEL);if((y-my)%6===0)fill(mx,y,mx+7,y+1,STEEL);}const i=(my-71)*W+mx+3;t[i]=NEON;col[i]=rgb(255,40,40);}
  // icicles under the overhangs
  for(let x=2;x<W-2;x++)for(let y=GY-200;y<H-40;y++){const i=y*W+x;if(t[i]===0&&KIND[t[i-W]]===S&&t[i-W]!==SNOW&&R()<.015){const L=3+R()*5|0;for(let k=0;k<L&&t[i+k*W]===0;k++){t[i+k*W]=ICE;col[i+k*W]=rgb(190,230,250);}}}
  ST.SPAWNX=140;
}

export function ambArctic(){ // steady snowfall; a little of it settles
  for(let k=0;k<3;k++){const x=ST.camX+R()*(VW+40)-20;spawn(x,ST.camY-2,(R()-.5)*.4-.25,.5+R()*.5,R()<.5?rgb(240,244,252):rgb(214,224,240),400,R()<.08?SNOW:0,0,0,1);}
}
