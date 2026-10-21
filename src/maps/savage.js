import './xmansion.js'; // evaluation order: runs after maps/xmansion.js
import { ST } from '../state.js';
import { ASH, DIRT, EMPTY, GRASS, KIND, LAVA, LEAF, NEON, OBSID, OIL, R, S, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, N, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { spawn } from '../world/particles.js';
import { fxWord } from '../render/fx.js';
import { snd } from '../sfx.js';

// ---- Savage Land: a prehistoric jungle hidden in Antarctica. A live volcano with a lava lake, a waterfall
// off a plateau, a ruined step pyramid, a tar pit and a buried dinosaur.
const SAV={VX:820,CX:1300,src:0,pool:[0,0,0],vtop:196};
function jungleTree(x,gy){
  const h=46+R()*40|0,tw=3;fill(x,gy-h,x+tw,gy+4,WOOD);tint(x,gy-h,x+tw,gy,96,70,44,10);
  const r=10+R()*6|0,cx=x+1,cy=gy-h-2;
  for(const [ox,oy,rr] of [[0,0,r],[-r*.8,4,r*.75],[r*.8,4,r*.75],[0,-r*.5,r*.7]])disc(cx+ox|0,cy+oy|0,rr|0,LEAF,.9);
  for(let y=cy-r*1.6|0;y<cy+r;y++)for(let k=cx-r*2;k<cx+r*2;k++)if(k>=0&&k<W&&y>=0&&t[y*W+k]===LEAF)col[y*W+k]=rgb(30+R()*26,104+R()*44,30+R()*20);
  fill(x,gy-h,x+tw,gy-h+r,WOOD);
  for(let v=0;v<4;v++){const vx=cx+(R()-.5)*r*2.4|0;let y=cy;while(y<cy+r*2&&t[y*W+vx]===LEAF)y++;const len=8+R()*18|0;if(t[(y-1)*W+vx]!==LEAF)continue;for(let k=0;k<len;k++){if(t[(y+k)*W+vx])break;setc((y+k)*W+vx,LEAF);col[(y+k)*W+vx]=rgb(40+R()*20,120+R()*30,40);}}
}
function fern(x,gy){for(let k=-6;k<=6;k++){const hh=Math.round(7-Math.abs(k)*.9);for(let y=0;y<hh;y++){const X=x+k+(k<0?-(y>>2):(y>>2));sxy(X,gy-1-y,LEAF);if(X>=0&&X<W&&gy-1-y>=0)col[(gy-1-y)*W+X]=rgb(46+R()*24,136+R()*40,40);}}}
export function genSavageLand(){
  clearAll();
  SAV.VX=Math.round(W*.36);SAV.CX=Math.round(W*.86); // the volcano and the plateau cliff scale with the map
  const s=R()*100,GY=372,VX=SAV.VX,VTOP=GY-176,CR=22,CX=SAV.CX;
  makeFar([96,176,170],[250,212,150],()=>{
    for(const [amp,base,c] of [[70,170,[110,128,132]],[46,214,[72,108,90]]])for(let x=0;x<ST.FW;x++){const hh=base-Math.abs(Math.sin(x*.011+s))*amp-Math.sin(x*.037+s*2)*amp*.25|0;for(let y=Math.max(0,hh);y<H;y++)ST.far[y*ST.FW+x]=rgb(c[0]-(y-hh)/7,c[1]-(y-hh)/7,c[2]-(y-hh)/8);}
    const vx=ST.FW*.22|0,vt=118;for(let y=vt;y<H;y++){const w=(y-vt)*1.4;for(let x=vx-w|0;x<vx+w;x++)if(x>=0&&x<ST.FW)ST.far[y*ST.FW+x]=rgb(84-(y-vt)/9,72-(y-vt)/9,80-(y-vt)/9);}
    for(let x=vx-6;x<vx+6;x++)ST.far[vt*ST.FW+x]=rgb(255,140,60);
    for(let k=0;k<8;k++){const cx=vx-k*14+(R()-.5)*8,cy=vt-10-k*12,r=8+k*3;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<r*r){const X=cx+x|0,Y=cy+y|0;if(X>=0&&X<ST.FW&&Y>=0)ST.far[Y*ST.FW+X]=rgb(150-k*4,146-k*4,150-k*4);}}
    for(let k=0;k<6;k++){const x=4+R()*(ST.FW-8)|0,y=40+R()*70|0;for(const [dx,dy] of [[0,0],[-1,-1],[-2,-1],[1,-1],[2,-1]])ST.far[(y+dy)*ST.FW+x+dx]=rgb(40,40,50);} // pteranodons
  });
  const hm=[];
  for(let x=0;x<W;x++){let h=GY+Math.sin(x*.012+s)*12+Math.sin(x*.041+s*2)*5|0;const d=Math.abs(x-VX);if(d<250)h=Math.min(h,VTOP+(d<CR+6?0:(d-CR-6)*.78)|0);if(x>=CX)h=Math.min(h,GY-86);hm[x]=h;}
  for(let x=0;x<W;x++){const h=hm[x],volc=Math.abs(x-VX)<240&&h<GY-24,st=h+24+Math.sin(x*.07+s)*6|0;
    for(let y=h;y<H;y++)setc(y*W+x,y>=H-4?OBSID:volc?(y<h+2&&R()<.5?ASH:STONE):y<h+2?GRASS:y<st?DIRT:STONE);
    if(volc)tint(x,h,x+1,Math.min(H,GY+40),78,66,66,10);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,30-(y-h)/16,22-(y-h)/18);}
  bgD.set(bg);
  for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(y>hm[x]+34&&Math.abs(x-VX)>70&&noise2(x,y,s)>.37)setc(y*W+x,EMPTY);}
  for(let y=H-30;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0)setc(i,y>H-20?LAVA:EMPTY);}
  // crater lava lake and the conduit down to a sealed magma chamber
  for(let x=VX-CR;x<=VX+CR;x++){const dx=(x-VX)/CR,dep=5+22*(1-dx*dx)|0;for(let y=VTOP;y<VTOP+dep;y++)setc(y*W+x,y<VTOP+5?EMPTY:LAVA);}
  for(let y=VTOP+20;y<GY-30;y++)for(let x=VX-2;x<=VX+2;x++)setc(y*W+x,LAVA);
  for(let y=-12;y<=12;y++)for(let x=-34;x<=34;x++){const e=x*x/1156+y*y/144;if(e<1.3)setc((GY-30+y)*W+VX+x,e<1?LAVA:OBSID);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // plunge pool at the foot of the cliff; a river along the plateau feeds the waterfall (kept running by the ambience)
  for(let x=CX-74;x<CX-2;x++){const d=1-Math.abs(x-(CX-38))/36;for(let y=hm[x];y<hm[x]+10+d*12;y++)setc(y*W+x,y<hm[x]+3?EMPTY:WATER);}
  for(let x=CX;x<W-24;x++){const dep=5+3*((W-24-x)/(W-24-CX))|0;for(let y=hm[x];y<hm[x]+dep;y++)setc(y*W+x,y<hm[x]+1?EMPTY:WATER);fill(x,hm[x]+dep,x+1,hm[x]+dep+3,STONE);tint(x,hm[x]+dep,x+1,hm[x]+dep+3,96,96,104,8);} // the river bed deepens toward the cliff, so it always drains over it
  fill(CX-2,hm[CX]+1,CX+1,hm[CX]+6,EMPTY);
  SAV.src=hm[W-30];SAV.pool=[CX-60,CX-16,hm[CX-38]+14];SAV.vtop=VTOP;
  // ruined step pyramid with a golden idol in the shrine
  {const px=330,gy=hm[px];let y=gy;for(const [w,h] of [[124,14],[100,14],[76,14],[52,12]]){const x0=px-w/2|0;fill(x0,y-h,x0+w,y,STONE);
      for(let yy=y-h;yy<y;yy++)for(let xx=x0;xx<x0+w;xx++){const i=yy*W+xx;const j=((yy-(y-h))%5===0)||(((xx-x0)+((yy>>2)&1)*6)%12===0);col[i]=j?rgb(96,92,78):rgb(150+R()*16,140+R()*14,108+R()*10);}
      if(R()<.7)for(let k=0;k<6;k++){const bx=x0+R()*w|0;sxy(bx,y-h-1,STONE);}y-=h;}
    fill(px-8,y-16,px+8,y,STONE);tint(px-8,y-16,px+8,y,140,130,100,10);fill(px-4,y-12,px+4,y,EMPTY);bgRect(px-4,y-12,px+4,y,rgb(40,30,24));
    for(let yy=y-5;yy<y-1;yy++)for(let xx=px-1;xx<=px+1;xx++){const i=yy*W+xx;t[i]=NEON;col[i]=rgb(255,200,70);}
    for(let k=y;k<gy;k++)tint(px-5,k,px+5,k+1,112,104,86,6);
    for(const bx of [px-90,px+80]){const hh=14+R()*14|0;fill(bx,gy-hh,bx+5,gy,STONE);tint(bx,gy-hh,bx+5,gy,160,150,120,10);}}
  // tar pit
  {const tx=560;for(let x=tx-34;x<tx+34;x++){const d=1-Math.abs(x-tx)/34;for(let y=hm[x];y<hm[x]+3+d*10;y++)setc(y*W+x,y<hm[x]+2?EMPTY:OIL);}}
  // a buried tyrannosaur
  {const bx=1080,by=hm[bx]+12;for(let k=0;k<7;k++){const rx=bx+k*7;for(let a=0;a<=Math.PI;a+=.15){const X=rx+Math.cos(a)*4|0,Y=by-Math.sin(a)*7+k*.4|0;sxy(X,Y,STONE);if(X>=0&&X<W&&Y>=0)col[Y*W+X]=rgb(228,222,200);}}
    for(let k=-8;k<56;k++){sxy(bx+k,by,STONE);col[by*W+bx+k]=rgb(222,216,196);}for(let y=-4;y<=4;y++)for(let x=-6;x<=6;x++)if(x*x/36+y*y/16<1){sxy(bx-12+x,by-2+y,STONE);col[(by-2+y)*W+bx-12+x]=rgb(232,226,206);}}
  // jungle
  for(let x=10;x<W-10;){const nearV=Math.abs(x-VX)<255,nearP=Math.abs(x-330)<70,nearT=Math.abs(x-560)<40,nearC=x>CX-80&&x<CX+8;
    if(!nearV&&!nearP&&!nearT&&!nearC){R()<.6?jungleTree(x,hm[x]):fern(x+4,hm[x]);if(R()<.5)fern(x+10,hm[x+10]);}x+=12+R()*16|0;}
  for(let x=0;x<W;x++){if(Math.abs(x-VX)>250&&R()<.3&&t[(hm[x]-1)*W+x]===0){const h=1+R()*3|0;for(let k=1;k<=h;k++)sxy(x,hm[x]-k,GRASS);}}
  // glowing mushrooms in the caves
  for(let y=H-40;y>GY;y--)for(let x=0;x<W;x+=2){const i=y*W+x;if(t[i]===0&&KIND[t[i+W]]===S&&R()<.006){for(let k=0;k<3;k++){const j=i-k*W;t[j]=NEON;col[j]=k===2?rgb(120,255,230):rgb(70,170,160);}}}
  ST.SPAWNX=150;
}
export function ambSavage(){ // the waterfall keeps falling, the volcano keeps smoking
  for(let k=0;k<7;k++){const x=W-30+(R()*6|0),y=SAV.src+1,i=y*W+x;if(t[i]===0)setc(i,WATER);}
  const [a,b,y0]=SAV.pool,cx=SAV.CX,ty=SAV.src;
  if(t[(y0-9)*W+((a+b)>>1)]===WATER)for(let k=0;k<14;k++){const x=a+R()*(b-a)|0,y=y0+(R()*8|0),i=y*W+x;if(i>0&&i<N&&t[i]===WATER)setc(i,EMPTY);} // an underground outflow keeps the plunge pool from flooding the jungle
  for(let k=0;k<4;k++)spawn(cx-1-R()*3,ty+2+R()*3,-.3-R()*.5,R()*.5,R()<.6?rgb(90,140,230):rgb(200,225,255),60,0,0,1); // the falling sheet of the waterfall
  if(ST.frame%2===0)spawn(cx-6-R()*30,y0-12,(R()-.5)*1.2,-.4-R()*.6,rgb(220,235,250),30,0,0,0,1); // mist at its foot
  const VX=SAV.VX;if(ST.frame%3===0)spawn(VX+(R()-.5)*30,SAV.vtop-2,(R()-.5)*.4,-.4-R()*.6,R()<.8?rgb(110,104,106):rgb(255,140,60),160+R()*80,0,R()<.2?1:0,0,0);
  if(ST.frame%400===0){for(let k=0;k<6;k++)spawn(VX+(R()-.5)*10,SAV.vtop,(R()-.5)*3,-3-R()*3,rgb(255,120,30),200,LAVA,1);fxWord(VX,SAV.vtop-24,'BLORP',.8,'#ffb340',true);snd('boom',VX,SAV.vtop,{size:.4});}
}
