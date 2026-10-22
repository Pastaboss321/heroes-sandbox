// The Dark Dimension: Dormammu's realm. A violet-and-fire sky that churns, twisted obsidian spires and
// arches, rivers of hellfire lava, and his burning face filling the heavens.
import { ST } from '../state.js';
import { EMPTY, LAVA, NEON, OBSID, R, STONE, rgb } from '../world/materials.js';
import { H, VH, VW, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, clearAll, makeFar } from './gen.js';
import { noise2 } from './city.js';
import { spawn } from '../world/particles.js';
import { dkArch, dkFang, dkSpires, dkStairs, dkTemple, dress } from './realms.js';

const dk=(x,y,s)=>{const n=noise2(x*.2,y*.2,s)*18;return rgb(46+n,28+n*.6,64+n);};
export function genDark(){
  clearAll();const GY=380,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([24,6,40],[120,30,80],()=>{
    for(let y=0;y<H;y++)for(let x=0;x<ST.FW;x++){const n=noise2(x*.02,y*.03,s),m=noise2(x*.05,y*.05,s+3),o=y*ST.FW+x,f=ST.far[o];
      if(n>.15){const a=Math.min(.6,(n-.15)*1.6);ST.far[o]=rgb((f&255)*(1-a)+255*a,((f>>8)&255)*(1-a)+(90+m*60)*a,((f>>16)&255)*(1-a)+30*a);}else if(m>.3){const a=(m-.3)*.8;ST.far[o]=rgb((f&255)*(1-a)+150*a,((f>>8)&255)*(1-a)+60*a,((f>>16)&255)*(1-a)+220*a);}}
    // Dormammu's face: a flaming head with two burning eyes, kept vivid
    {const cx=ST.FW*.5|0,cy=110,r=80;for(let y=-r;y<r*1.1;y++)for(let x=-r;x<r;x++){const e=x*x/(r*r*.7)+y*y/(r*r);if(e>1)continue;const X=cx+x,Y=cy+y,o=Y*ST.FW+X,n=noise2(X*.15,Y*.15,s+9);
      ST.far[o]=e>.8?rgb(255,120+n*80,30):rgb(40+n*20,14,40);ST.farKeep[o]=1;}
      for(const ex of [-28,28])for(let y=-8;y<8;y++)for(let x=-16;x<16;x++)if(x*x/256+y*y/64<1){const o=(cy-10+y)*ST.FW+cx+ex+x;ST.far[o]=rgb(255,240,200);ST.farKeep[o]=1;}}
    for(let x=0;x<ST.FW;x++){const hh=GB+12-Math.abs(Math.sin(x*.03+s))*40|0;for(let y=hh;y<H;y++)ST.far[y*ST.FW+x]=rgb(30,12,40);}});
  const hm=new Int16Array(W);for(let x=0;x<W;x++)hm[x]=GY+Math.sin(x*.007+s)*18+noise2(x*.6,0,s)*8|0;
  for(let x=0;x<W;x++){const h=hm[x];for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4||y<h+3?OBSID:STONE);col[i]=dk(x,y,s);}for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(28-(y-h)/14,12,34-(y-h)/12);}
  bgD.set(bg);
  for(let y=GY+40;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&noise2(x,y,s+2)>.38)setc(i,y>H-60?LAVA:EMPTY);}
  // lava rivers in the surface
  for(let k=0;k<5;k++){const cx=R()*W|0,w=30+R()*60|0;for(let x=cx-w;x<cx+w;x++){if(x<0||x>=W)continue;const d=1-Math.abs(x-cx)/w;for(let y=hm[x];y<hm[x]+d*14;y++)setc(y*W+x,y<hm[x]+2?EMPTY:LAVA);}}
  // twisted spires that lean and curl, some joined at the top into arches
  for(let k=0;k<18;k++){const x0=R()*W|0,h=90+R()*220|0,w0=10+R()*14,curl=(R()-.5)*.03;let cx=x0,a=-Math.PI/2+(R()-.5)*.4;
    for(let st=0;st<h;st++){a+=curl;cx+=Math.cos(a);const cy=hm[x0]+4+Math.sin(a)*st*-.0+(-st),w=w0*(1-st/h)+1.5;
      for(let x=-w;x<=w;x++){const X=cx+x|0,Y=cy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;setc(i,OBSID);col[i]=dk(X,Y,s+1);if(Math.abs(x)<1&&st%9===0&&st>8){t[i]=NEON;col[i]=rgb(255,140,40);}}}}
  dress(hm,40,W-40,[[.3,dkSpires],[.1,dkTemple],[.14,dkArch],[.24,dkFang],[.1,dkStairs],[.12,()=>0]],[8,40]); // maps/realms.js
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;ST.SPAWNX=200;
}
export function ambDark(){
  if(ST.frame%2===0)spawn(ST.camX+R()*VW,ST.camY+VH,(R()-.5)*.4,-.6-R()*.6,R()<.5?rgb(255,120,40):rgb(200,80,255),120,0,1,0,0);
}
