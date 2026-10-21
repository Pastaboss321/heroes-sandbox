import { noise2 } from './city.js';
import { ST } from '../state.js';
import { DIRT, EMPTY, GLASS, GRASS, LAVA, LEAF, OBSID, OIL, R, SAND, STEEL, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';

export function genForest(){
  clearAll();
  const s=R()*100;
  makeFar([60,120,200],[200,225,235],()=>{
    for(const [amp,base,c] of [[60,180,[120,150,180]],[40,235,[80,120,110]]]){
      for(let x=0;x<ST.FW;x++){const hh=base-Math.sin(x*.013+s)*amp-Math.sin(x*.041+s*2)*amp*.3|0;for(let y=Math.max(0,hh);y<H;y++)ST.far[y*ST.FW+x]=rgb(c[0]-(y-hh)/6,c[1]-(y-hh)/6,c[2]-(y-hh)/8);}
    }
    for(let k=0;k<12;k++){const cx=R()*ST.FW|0,cy=20+R()*80|0;for(let y=-5;y<=5;y++)for(let x=-18;x<=18;x++)if(x*x/324+y*y/25<1&&cy+y>=0)ST.far[(cy+y)*ST.FW+((cx+x+ST.FW)%ST.FW)]=rgb(240,245,250);}
  });
  const hm=[];
  const mts=[];for(let mx=300+R()*600;mx<W-200;mx+=1200+R()*900)mts.push([mx,130+R()*80]); // a mountain every ~1.5 screens
  const mt=mts[0][0]|0; // the first one has the waterfall cave
  for(let x=0;x<W;x++){
    let m=0;for(const [mx,mh] of mts)m=Math.max(m,Math.exp(-(((x-mx)/150)**2))*mh);
    hm[x]=300+Math.sin(x*.009+s)*28+Math.sin(x*.031+s*2)*12+Math.sin(x*.11+s)*3-m|0;
  }
  const lakes=[]; for(let k=0;k<Math.max(2,W/1400|0);k++){let pc;do{pc=100+R()*(W-200)|0;}while(Math.abs(pc-mt)<200||lakes.some(l=>Math.abs(l-pc)<200));lakes.push(pc);
    for(let x=pc-60;x<pc+60;x++){const d=(x-pc)/60;hm[x]+=(1-d*d)*34|0;}}
  for(let x=0;x<W;x++){
    const h=hm[x], st=h+24+Math.sin(x*.07+s)*8|0;
    for(let y=h;y<H;y++)setc(y*W+x,y<h+2?GRASS:y<st?DIRT:STONE);
    if(R()<.5)for(let y=st;y<st+3;y++)if(y<H)setc(y*W+x,SAND);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,26-(y-h)/16,22-(y-h)/18);
  }
  bgD.set(bg);
  // caves
  for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(y>hm[x]+14&&noise2(x,y,s)>.36)setc(y*W+x,EMPTY);}
  // lava chambers
  for(let k=0;k<4;k++){const lx=R()*(W-100)+50|0;for(let y=H-90;y<H-50;y++)for(let x=lx-40;x<lx+40;x++)if(x>=0&&x<W&&(x-lx)**2/1600+(y-H+70)**2/144<1)setc(y*W+x,y>H-72?LAVA:EMPTY);}
  // underground pools + ore of sand
  for(let y=H-8;y>300;y--)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0&&t[i+W]===STONE&&R()<.012)disc(x,y-2,3,WATER);}
  // magma sea at the bottom + obsidian floor
  for(let y=H-30;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0)setc(i,y>H-20?LAVA:EMPTY);}
  fill(0,H-4,W,H,OBSID);
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // mountain reservoir behind a stone dam (breakable waterfall)
  { const rx=mt+40, ry=hm[mt]+20; for(let y=ry-12;y<ry+10;y++)for(let x=rx-30;x<rx+10;x++)if(x>=0&&x<W)setc(y*W+x,y<ry+8?WATER:STONE); fill(rx+10,ry-14,rx+14,ry+10,STONE); }
  // surface lakes
  for(const pc of lakes){const lvl=Math.min(hm[pc-60],hm[pc+59])+2;for(let x=pc-60;x<pc+60;x++)for(let y=lvl;y<hm[x];y++)setc(y*W+x,WATER);}
  // cabin
  { let cx; do{cx=60+R()*(W-120)|0;}while(lakes.some(l=>Math.abs(l-cx)<80)); const gy=hm[cx]; cabin(cx,gy); }
  // trees + boulders + grass tufts
  for(let x=8;x<W-8;){
    if(!lakes.some(l=>Math.abs(x-l)<64)){const r=R(); r<.4?pine(x,hm[x]):r<.85?tree(x,hm[x]):birch(x,hm[x]);}
    if(R()<.08)disc(x+6,hm[x+6]-1,3+R()*3|0,STONE,.95);
    x+=9+R()*14|0;
  }
  for(let x=0;x<W;x++){if(!lakes.some(l=>Math.abs(x-l)<62)&&R()<.35){const h=1+R()*3|0;for(let k=1;k<=h;k++)sxy(x,hm[x]-k,GRASS);}}
}
function cabin(x,gy){
  fill(x-2,gy-1,x+42,gy+2,STONE);
  for(let y=gy-22;y<gy;y+=3)fill(x,y,x+40,y+2,WOOD);
  fill(x+3,gy-22,x+37,gy-1,EMPTY); bgRect(x+3,gy-22,x+37,gy-1,rgb(70,50,32));
  fill(x,gy-22,x+3,gy,WOOD); fill(x+37,gy-22,x+40,gy,WOOD); fill(x+37,gy-16,x+40,gy-9,GLASS);
  for(let r=0;r<24;r++)fill(x-4+r,gy-22-r*.7,x+44-r,gy-21-r*.7,WOOD);
  fill(x+6,gy-5,x+14,gy-1,WOOD); fill(x+24,gy-6,x+30,gy-1,STEEL); fill(x+25,gy-5,x+29,gy-1,OIL);
  fill(x+32,gy-36,x+35,gy-22,STONE);
}
export function tree(x,gy){
  const h=28+R()*44|0, tw=2+(R()<.5?1:0);
  fill(x,gy-h,x+tw,gy+4,WOOD);
  for(let b=0;b<3;b++){const by=gy-h+8+R()*(h-14)|0,d=R()<.5?-1:1,len=4+R()*8|0;
    for(let k=0;k<len;k++)sxy(x+(d>0?tw:-1)+d*k,by-(k>>1),WOOD);
    disc(x+d*(len+1)+(d>0?tw:0),by-(len>>1)-1,3+R()*3|0,LEAF,.85);}
  const r=7+R()*6|0; disc(x+1,gy-h-1,r,LEAF,.88); disc(x-r/2|0,gy-h+3,r-2,LEAF,.8); disc(x+r/2+2|0,gy-h+3,r-2,LEAF,.8);
  fill(x,gy-h,x+tw,gy-h+r,WOOD);
}
export function pine(x,gy){
  const h=40+R()*50|0;
  fill(x,gy-h,x+2,gy+4,WOOD);
  for(let y=0;y<h-6;y++){const w=((y%10)+y*.22)|0;for(let k=-w;k<=w+1;k++)if(R()<.9){sxy(x+k,gy-h+y,LEAF);col[(gy-h+y)*W+x+k]=rgb(24+R()*20,80+R()*30,40+R()*14);}}
  fill(x,gy-h,x+2,gy,WOOD);
}
export function birch(x,gy){
  const h=30+R()*30|0;
  fill(x,gy-h,x+2,gy+4,WOOD); tint(x,gy-h,x+2,gy,220,220,210,20);
  for(let y=gy-h;y<gy;y+=4)tint(x,y,x+2,y+1,30,30,30,5);
  disc(x+1,gy-h,6+R()*4|0,LEAF,.8); tint(x-10,gy-h-10,x+12,gy-h+10,0,0,0,0);
  for(let y=gy-h-10;y<gy-h+10;y++)for(let k=x-10;k<x+12;k++)if(k>=0&&k<W&&y>=0&&t[y*W+k]===LEAF)col[y*W+k]=rgb(110+R()*40,170+R()*30,50);
  fill(x,gy-h,x+2,gy-h+4,WOOD);
}
