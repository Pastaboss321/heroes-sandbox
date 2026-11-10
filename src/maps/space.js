// Off-world maps: Titan (Thanos's ruined homeworld), Knowhere (a mining town inside a severed Celestial
// head), the Moon's Blue Area (the Watcher's citadel and the Inhumans' ruined Attilan). These are the
// destinations of space travel: fly to the top of any sky to leave orbit. Each has its own gravity
// (MAPDEFS[...].grav) and a black starfield sky.
import { ST } from '../state.js';
import { BONE, CONC, DIRT, EMPTY, GLASS, GOLD, ICE, LAVA, NEON, OBSID, R, RUBBLE, SAND, STEEL, STONE, rgb } from '../world/materials.js';
import { H, VH, VW, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { spawn, spawnFlake } from '../world/particles.js';
import { dress, free, khMuseum, khRig, khSpire, khTown, khVats, mnBase, mnCrystals, mnLander, mnObelisk, mnPyramid, mnSpire, ttColonnade, ttDome, ttRing, ttTower } from './realms.js';

function stars(n,c=[220,225,255]){for(let k=0;k<n;k++){const x=R()*ST.FW|0,y=R()*H|0,b=.4+R()*.6;ST.far[y*ST.FW+x]=rgb(c[0]*b,c[1]*b,c[2]*b);}}
function planet(cx,cy,r,c0,c1,ring){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=x*x+y*y;if(d>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;
    const lit=Math.max(0,(-x*.6-y*.5)/r+.5),n=noise2(X*.08,Y*.08,cx)*.5+.5,k=Math.min(1,.25+lit);
    ST.far[Y*ST.FW+X]=rgb((c0[0]*(1-n)+c1[0]*n)*k,(c0[1]*(1-n)+c1[1]*n)*k,(c0[2]*(1-n)+c1[2]*n)*k);ST.farKeep[Y*ST.FW+X]=1;}
  if(ring)for(let a=0;a<6.283;a+=.002){const X=cx+Math.cos(a)*r*1.8|0,Y=cy+Math.sin(a)*r*.35|0;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;if(Math.sin(a)<0&&(X-cx)**2+(Y-cy)**2<r*r)continue;ST.far[Y*ST.FW+X]=rgb(200,180,150);ST.farKeep[Y*ST.FW+X]=1;}
}
// ---- Titan: orange dust sky, toppled ring-structures, a cratered plain, half-buried towers
export function genTitan(){
  clearAll();const GY=370,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([70,34,24],[220,120,60],()=>{stars(160,[255,220,200]);
    for(let k=0;k<4;k++){const cx=R()*ST.FW|0,cy=GB-20-R()*40|0,r=60+R()*80|0; // broken rings standing on the horizon
      for(let a=Math.PI;a<Math.PI*2+.6*R();a+=.004){for(let w=0;w<5;w++){const X=cx+Math.cos(a)*(r-w)|0,Y=cy+Math.sin(a)*(r-w)|0;if(X>=0&&X<ST.FW&&Y>=0&&Y<H)ST.far[Y*ST.FW+X]=rgb(90,50,40);}}}
    for(const [amp,base,c] of [[40,GB,[130,64,44]],[24,GB+24,[96,46,32]]])for(let x=0;x<ST.FW;x++){const hh=base-Math.abs(Math.sin(x*.02+s))*amp|0;for(let y=hh;y<H;y++)ST.far[y*ST.FW+x]=rgb(c[0]-(y-hh)/5,c[1]-(y-hh)/6,c[2]-(y-hh)/7);}
    planet(ST.FW*.3|0,60,26,[120,140,170],[200,210,230],true);});
  const hm=new Int16Array(W);for(let x=0;x<W;x++)hm[x]=GY+Math.sin(x*.004+s)*20+noise2(x*.5,0,s)*8|0;
  for(let k=0;k<16;k++){const cx=R()*W|0,r=20+R()*60|0;for(let x=cx-r;x<cx+r;x++){if(x<0||x>=W)continue;const d=(x-cx)/r;hm[x]+=Math.round(Math.sqrt(Math.max(0,1-d*d))*r*.35)-(Math.abs(d)>.8?4:0);}}
  for(let x=0;x<W;x++){const h=hm[x];for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:y<h+3?(R()<.5?SAND:RUBBLE):y<h+30?DIRT:STONE);col[i]=y<h+30?rgb(150+R()*20,80+R()*14,50):col[i];}
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(50-(y-h)/12,28-(y-h)/16,22-(y-h)/16);}
  bgD.set(bg);
  for(let y=GY+60;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&noise2(x,y,s+4)>.42)setc(i,y>H-40?LAVA:EMPTY);}
  // a fallen ring arch, then a dead city of leaning towers, standing rings, domes and colonnades (maps/realms.js)
  if(0)for(let k=0;k<9;k++){const x=150+R()*(W-300)|0,w=20+R()*30|0,h=60+R()*160|0,lean=(R()-.5)*.5,gy=hm[x];
    for(let y=0;y<h;y++)for(let c=0;c<w;c++){const X=x+c+Math.round(y*lean),Y=gy-y+10;const i=Y*W+X;if(X<0||X>=W||Y<0)continue;setc(i,c<2||c>w-3||y%18<2?CONC:STONE);col[i]=rgb(120+R()*16,70+R()*10,56);}
    for(let y=14;y<h-6;y+=18)for(let c=3;c<w-3;c++){const X=x+c+Math.round(y*lean),Y=gy-y;const i=Y*W+X;if(X>=0&&X<W&&Y>=0){t[i]=0;bg[i]=rgb(44,26,22);}}}
  {const cx=W*.6|0,r=170,gy=hm[cx];for(let a=Math.PI*1.05;a<Math.PI*1.95;a+=.002)for(let w=0;w<12;w++){const X=cx+Math.cos(a)*(r-w)|0,Y=gy+12+Math.sin(a)*(r-w)|0;sxy(X,Y,STEEL);if(X>=0&&X<W&&Y>=0&&Y<H)col[Y*W+X]=rgb(110,90,80);}}
  dress(hm,40,W-40,[[.36,ttTower],[.12,ttRing],[.14,ttDome],[.16,ttColonnade],[.22,()=>0]],[8,40]);
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;ST.SPAWNX=200;
}
export function ambTitan(){for(let k=0;k<2;k++)spawnFlake(ST.camX+R()*VW,ST.camY+R()*VH,.6+R()*.4,(R()-.5)*.2,rgb(200,120,70),200,0);}
// ---- Knowhere: inside the Celestial's skull. Bone floor and ribs of skull overhead, the mining town's
// scaffolds and neon bars, the eye socket opening onto space, glowing Celestial fluid in the pits
export function genKnowhere(){
  clearAll();const GY=390,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([4,4,14],[30,16,50],()=>{stars(900);
    for(let k=0;k<3;k++){const cx=R()*ST.FW,cy=40+R()*120,r=50+R()*60;for(let y=-r;y<r;y++)for(let x=-r*1.6;x<r*1.6;x++){const X=cx+x|0,Y=cy+y|0;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;const d=(x*x/2.56+y*y)/(r*r),n=noise2(X,Y,s+k);if(d<1&&n>0){const a=(1-d)*.4*n,o=Y*ST.FW+X,f=ST.far[o];ST.far[o]=rgb((f&255)+(200-(f&255))*a,((f>>8)&255)+(80-((f>>8)&255))*a,((f>>16)&255)+(220-((f>>16)&255))*a);}}}
    // the skull's outline against space: brow and cheek arcs
    for(let x=0;x<ST.FW;x++){const y0=30+Math.sin(x*.01)*20|0;for(let y=0;y<y0;y++){const o=y*ST.FW+x;ST.far[o]=rgb(84,70,60);ST.farKeep[o]=1;}}});
  const hm=new Int16Array(W);for(let x=0;x<W;x++)hm[x]=GY+Math.sin(x*.005+s)*10+Math.sin(x*.023)*4|0;
  const bone=(x,y)=>{const n=noise2(x*.3,y*.3,s)*20;return rgb(176+n,150+n,120+n*.8);};
  for(let x=0;x<W;x++){const h=hm[x];for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:BONE);col[i]=bone(x,y);}for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(60-(y-h)/10,46-(y-h)/12,40-(y-h)/12);}
  bgD.set(bg);
  for(let y=GY+50;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&noise2(x,y,s+1)>.4)setc(i,EMPTY);}
  // pits of glowing Celestial ooze (acid-green neon pools)
  for(let k=0;k<6;k++){const cx=100+R()*(W-200)|0,r=24+R()*30|0;for(let x=cx-r;x<cx+r;x++){const d=1-Math.abs(x-cx)/r;for(let y=hm[x];y<hm[x]+d*20;y++){const i=y*W+x;if(y<hm[x]+2)setc(i,EMPTY);else{setc(i,NEON);col[i]=rgb(120+R()*30,255,170);}}}}
  // the mining town (maps/realms.js), plus the old scaffolds, bars and containers in between
  {const scaf=(x,h,x1)=>{const w=30+R()*30|0,hh=60+R()*90|0;if(x+w>x1||!free(x-2,x+w+2,h,hh+4))return 0;const gy=h[x];for(let y=gy-hh;y<gy;y++){sxy(x,y,STEEL);sxy(x+w,y,STEEL);}for(let y=gy-hh;y<gy;y+=14){for(let c=x;c<=x+w;c++)sxy(c,y,STEEL);for(let c=0;c<w;c+=2)sxy(x+c,y+(c*14/w|0),STEEL);}return w;};
    dress(hm,120,W-120,[[.3,khTown],[.14,khRig],[.16,khSpire],[.06,khMuseum],[.12,khVats],[.14,scaf],[.08,()=>0]],[8,30]);}
  // ribs arching overhead
  for(let k=0;k<8;k++){const cx=200+k*(W-400)/7|0,r=150+R()*60|0,gy=hm[cx];for(let a=Math.PI*1.02;a<Math.PI*1.98;a+=.0025)for(let w=0;w<10;w++){const X=cx+Math.cos(a)*(r-w)*1.4|0,Y=gy+8+Math.sin(a)*(r-w)|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;setc(i,BONE);col[i]=bone(X,Y);}}
  // the mining town: scaffold towers, a bar with neon signs, cargo containers
  for(let x=120;x<W-120;){const r=R();const gy=hm[x];if(!free(x-2,x+92,hm,70)){x+=30;continue;}
    if(r<.4){const w=30+R()*30|0,h=60+R()*90|0;for(let y=gy-h;y<gy;y++){sxy(x,y,STEEL);sxy(x+w,y,STEEL);}for(let y=gy-h;y<gy;y+=14){for(let c=x;c<=x+w;c++)sxy(c,y,STEEL);for(let c=0;c<w;c+=2){sxy(x+c,y+(c*14/w|0),STEEL);}}x+=w+30;}
    else if(r<.65){const w=50+R()*40|0,h=26+R()*16|0;fill(x,gy-h,x+w,gy,STEEL);tint(x,gy-h,x+w,gy,70,60,74,8);bgRect(x+3,gy-h+3,x+w-3,gy-1,rgb(40,30,46));fill(x+3,gy-h+3,x+w-3,gy-1,EMPTY);
      const nc=[rgb(255,80,170),rgb(80,230,255),rgb(255,200,60)][R()*3|0];for(let c=x+6;c<x+w-6;c++){const i=(gy-h-3)*W+c;setc(i,NEON);col[i]=nc;}x+=w+24;}
    else if(r<.85){const w=24+R()*16|0,h=12+R()*6|0,c0=[[160,60,40],[60,110,150],[200,160,50]][R()*3|0];fill(x,gy-h,x+w,gy,STEEL);tint(x,gy-h,x+w,gy,c0[0],c0[1],c0[2],8);for(let c=x;c<x+w;c+=3)fill(c,gy-h,c+1,gy,STEEL);x+=w+10;}
    else x+=40;}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;ST.SPAWNX=160;
}
export function ambKnowhere(){if(ST.frame%4===0)spawn(ST.camX+R()*VW,ST.camY+VH,(R()-.5)*.2,-.3-R()*.3,rgb(140,255,190),160,0,1,0,0);}
// ---- the Moon's Blue Area: grey regolith, craters, the Watcher's citadel, Attilan's ruins under a glass
// dome, Earth hanging in the black sky. Low gravity.
export function genMoon(){
  clearAll();const GY=380,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([0,0,4],[8,10,24],()=>{stars(1200);planet(ST.FW*.62|0,90,46,[40,90,200],[90,170,90]);
    for(let x=0;x<ST.FW;x++){const hh=GB+10-Math.abs(Math.sin(x*.015+s))*30|0;for(let y=hh;y<H;y++)ST.far[y*ST.FW+x]=rgb(70-(y-hh)/6,72-(y-hh)/6,82-(y-hh)/6);}});
  const hm=new Int16Array(W);for(let x=0;x<W;x++)hm[x]=GY+Math.sin(x*.003+s)*14+noise2(x*.4,0,s)*6|0;
  const crater=(cx,r)=>{for(let x=cx-r*1.3|0;x<cx+r*1.3;x++){if(x<0||x>=W)continue;const d=(x-cx)/r;hm[x]+=Math.abs(d)<1?Math.round(Math.sqrt(1-d*d)*r*.4):-Math.round((1.3-Math.abs(d))*r*.12);}};
  for(let k=0;k<22;k++)crater(R()*W|0,10+R()*70|0);
  for(let x=0;x<W;x++){const h=hm[x];for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:y<h+4?SAND:STONE);const v=noise2(x*.4,y*.4,s)*16;col[i]=y<h+4?rgb(170+v,170+v,176+v):rgb(110+v,110+v,118+v);}
    for(let y=h+4;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/16,34-(y-h)/16,40-(y-h)/14);}
  bgD.set(bg);
  for(let y=GY+60;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&noise2(x,y,s+6)>.45)setc(i,EMPTY);else if(t[i]===STONE&&noise2(x*2,y*2,s)>.6){t[i]=ICE;col[i]=rgb(180,220,250);}}
  // the Watcher's citadel: a stark pale fortress with a tall observation tower
  {const cx=W*.25|0,gy=hm[cx];fill(cx-120,gy-60,cx+120,gy,CONC);tint(cx-120,gy-60,cx+120,gy,210,214,222,6);bgRect(cx-110,gy-54,cx+110,gy-2,rgb(60,62,72));fill(cx-110,gy-54,cx+110,gy-2,EMPTY);fill(cx-110,gy-28,cx+110,gy-26,CONC);
    for(let y=gy-220;y<gy-60;y++){const hw=y<gy-200?6:12;fill(cx-hw,y,cx+hw,y+1,CONC);}for(let y=gy-196;y<gy-70;y+=16)fill(cx-8,y,cx+8,y+8,GLASS);disc(cx,gy-226,10,GLASS);
    for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){const i=(gy-226+y)*W+cx+x;if(t[i]===GLASS)col[i]=rgb(200,230,255);}}
  // Attilan: ruined Inhuman city under a cracked glass dome
  {const cx=W*.7|0,gy=hm[cx],r=260;for(let a=Math.PI;a<Math.PI*2;a+=.0015){const X=cx+Math.cos(a)*r|0,Y=gy+Math.sin(a)*r*.7|0;if(R()<.85)for(let w=0;w<2;w++)sxy(X,Y+w,GLASS);}
    for(let x=cx-220;x<cx+220;){const w=14+R()*22|0,h=30+R()*130*(1-Math.abs(x-cx)/240)|0,g=hm[x];for(let y=g-h;y<g;y++)for(let c=x;c<x+w;c++){const i=y*W+c;setc(i,y<g-h+4?GOLD:CONC);col[i]=y<g-h+4?rgb(220,180,90):rgb(170+R()*14,180+R()*14,200);}
      for(let y=g-h+8;y<g-4;y+=10)fill(x+3,y,x+w-3,y+5,EMPTY);x+=w+6+(R()*10|0);}}
  dress(hm,40,W-40,[[.25,mnSpire],[.12,mnBase],[.14,mnObelisk],[.07,mnLander],[.12,mnCrystals],[.12,mnPyramid],[.18,()=>0]],[10,50]); // maps/realms.js
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;ST.SPAWNX=W*.25+160|0;
}
export function ambMoon(){}
