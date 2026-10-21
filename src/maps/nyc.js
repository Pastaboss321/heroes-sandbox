import { birch, tree } from './forest.js';
import { ST } from '../state.js';
import { CONC, DIRT, EMPTY, GLASS, GRASS, R, SAND, STEEL, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, bgD, setc, sxy } from '../world/grid.js';
import { clearAll, disc, fill, makeFar, tint } from './gen.js';
import { building, car, cityUnder, glassTower } from './city.js';
import { avengersTower, baxterBuilding, dailyBugle, sanctum } from './landmarks.js';
import { cathedral, construction, harbor, plaza, stadium, tenements, trainyard } from './districts.js';

export function genNYC(){
  clearAll();
  const GY=340+(ST.GYO|0), GB=143+(GY-143)*.5|0, RX=300;
  makeFar([30,20,48],[230,120,80],()=>{
    for(let k=0;k<200;k++){const x=R()*ST.FW|0,y=R()*(GB-140)|0;ST.far[y*ST.FW+x]=rgb(230,210,230);}
    // dense, tall skyline in three layers
    for(const [base,c,lit,hmax] of [[GB-60,rgb(70,46,80),.1,240],[GB-20,rgb(46,30,60),.2,200],[GB+15,rgb(30,20,42),.4,170]]){
      for(let x=0;x<ST.FW;){const w=6+R()*20|0,h=40+R()*hmax|0;for(let y=Math.max(0,base-h);y<H;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++){const on=(xx%3===1&&y%5===2&&R()<lit);ST.far[y*ST.FW+xx]=on?rgb(250,210,120):c;}
        if(R()<.15)for(let y=Math.max(0,base-h-20);y<base-h;y++)ST.far[y*ST.FW+x+(w>>1)]=c;x+=w+(R()*2|0);}
    }
  });
  cityUnder(GY);
  // East River: carve the channel, sandy bed, fill with water
  for(let x=0;x<RX;x++){const e=Math.min(1,(RX-x)/30),bed=GY+20+(70*e|0);
    for(let y=GY;y<bed;y++){const i=y*W+x;setc(i,y>=GY+8?WATER:EMPTY);bg[i]=y<GY+8?0:rgb(20,30,40);}
    for(let y=bed;y<bed+4;y++)setc(y*W+x,SAND);}
  bgD.set(bg);
  // suspension bridge: stone towers with arches, cables, suspenders, trussed deck
  const dY=GY-26, T1=70, T2=226, TT=GY-170, bed=GY+102; // footings sunk through the sand into the riverbed
  for(const tx of [T1,T2]){fill(tx,TT,tx+18,bed,STONE);tint(tx,TT,tx+18,bed,176,152,120,10);
    for(const ax of [tx+3,tx+11]){for(let y=dY-34;y<dY;y++){const half=y<dY-28?Math.max(0,(y-(dY-34))/2|0):2;fill(ax+2-half,y,ax+2+half+1,y+1,EMPTY);}}
    fill(tx-1,TT,tx+19,TT+3,STONE);tint(tx-1,TT,tx+19,TT+3,150,130,104,6);}
  fill(0,dY,RX+40,dY+4,CONC);tint(0,dY,RX+40,dY+4,90,90,96,6);
  for(let k=0;k<RX+40;k+=8){for(let s=0;s<8;s++){sxy(k+s,dY+4+(s>>1),STEEL);sxy(k+8-s,dY+4+(s>>1),STEEL);}}
  fill(0,dY+8,RX+40,dY+9,STEEL);
  fill(0,dY,12,bed,STONE);tint(0,dY,12,bed,160,140,110,8);
  for(let x=RX+40;x<RX+110;x++){const y=dY+((x-RX-40)/70*(GY-dY))|0;fill(x,y,x+1,GY,CONC);tint(x,y,x+1,y+3,90,90,96,6);}
  const cab=x=>{ // main cable height
    const a=T1+9,b=T2+9;
    if(x<a)return dY-14+(TT-(dY-14))*(x/a);
    if(x>b)return TT+(dY-12-TT)*((x-b)/(RX+40-b));
    const u=(x-a)/(b-a);return TT+(dY-6-TT)*(1-(2*u-1)**2);};
  for(let x=0;x<RX+40;x++){const y=cab(x)|0;fill(x,y,x+1,y+2,STEEL);if(x%5===0&&!(x>=T1&&x<T1+18)&&!(x>=T2&&x<T2+18))fill(x,y+2,x+1,dY,STEEL);}
  for(let k=0;k<3;k++)car(20+k*90+R()*30|0,dY,[230,190,30]);
  // Manhattan
  let x=RX+116;const placed={},end=W>4000?W-540:W-30;
  while(x<end){
    const r=R();
    if(!placed.site&&x>W*.25&&r<.15){placed.site=1;x=construction(x,GY);}
    else if(!placed.church&&x>W*.42&&r<.15){placed.church=1;x=cathedral(x,GY);}
    else if(!placed.yard&&x>W*.6&&r<.15){placed.yard=1;x=trainyard(x,GY);}
    else if(!placed.stadium&&x>W*.82&&r<.2){placed.stadium=1;x=stadium(x,GY);}
    else if(r<.06){x=tenements(x,GY);}
    else if(r<.08){x=plaza(x,GY);}
    else
    if(!placed.sanctum&&x>W*.16){placed.sanctum=1;x=sanctum(x,GY);} // the landmarks, spread along the island
    else if(!placed.baxter&&x>W*.34){placed.baxter=1;x=baxterBuilding(x,GY);}
    else if(!placed.avengers&&x>W*.52){placed.avengers=1;x=avengersTower(x,GY);}
    else if(!placed.bugle&&x>W*.7){placed.bugle=1;x=dailyBugle(x,GY);}
    else if(!placed.park2&&placed.park&&x>W*.8&&r<.3){placed.park2=1;x=centralPark(x,GY);}
    else if(!placed.park&&x>650&&r<.18){placed.park=1;x=centralPark(x,GY);}
    else if(!placed.step&&x>420&&r<.32){placed.step=1;x=steppedTower(x,GY);}
    else if(!placed.deco&&x>420&&r<.46){placed.deco=1;x=decoTower(x,GY);}
    else{const w=34+R()*36|0,h=150+R()*(R()<.3?GY-190:170)|0,x1=Math.min(end,x+w),top=Math.max(30,GY-h);
      if(R()<.35)glassTower(x,x1,top,GY);else{building(x,x1,top,GY);if(R()<.6)waterTower(x+6+R()*(w-20)|0,top-4);}
      x=x1;}
    const gap=10+R()*14|0;
    if(gap>19&&x+gap<W)car(x+2,GY,[230,190,30]);
    x+=gap;
  }
  if(W>4000)harbor(Math.max(x,end),GY); // the Hudson piers
  ST.SPAWNX=RX+130;
}
export function waterTower(x,top){
  for(const lx of [x,x+9])fill(lx,top-6,lx+1,top+4,STEEL);
  fill(x-1,top-16,x+11,top-6,WOOD);tint(x-1,top-16,x+11,top-6,120,84,52,10);fill(x+1,top-15,x+9,top-7,WATER);
  for(let r=0;r<6;r++)fill(x-1+r,top-16-r,x+11-r,top-15-r,WOOD);
}
function steppedTower(x,GY){
  // setback tiers like a 1930s skyscraper, then a mast and antenna
  const tiers=[[96,110],[74,60],[54,46],[38,34],[24,22]];let bot=GY,top;
  for(const [w,h] of tiers){const x0=x+(96-w)/2|0;top=bot-h;building(x0,x0+w,top,bot);bot=top;}
  const mx=x+48;fill(mx-3,top-18,mx+3,top,STEEL);tint(mx-3,top-18,mx+3,top,200,205,215,6);fill(mx-1,top-60,mx+1,top-18,STEEL);fill(mx,Math.max(2,top-95),mx+1,top-60,STEEL);
  return x+96;
}
function decoTower(x,GY){
  const w=56,top=GY-235;building(x,x+w,top,GY);
  // terraced steel crown with triangular windows, then a needle spire
  let y=top;for(let k=0;k<6;k++){const ww=w-k*9,r=ww/2,cx=x+w/2;
    for(let a=0;a<=Math.PI;a+=.02){const X=cx+Math.cos(a)*r|0,Y=y-Math.sin(a)*Math.min(r,10)|0;fill(X,Y,X+1,Y+2,STEEL);}
    for(let a=.3;a<Math.PI-.2;a+=.5){const X=cx+Math.cos(a)*(r-3)|0,Y=y-Math.sin(a)*Math.min(r-3,7)|0;fill(X,Y,X+2,Y+2,GLASS);}
    tint(cx-r,y-11,cx+r,y+1,210,214,222,8);y-=8;}
  fill(x+w/2-1,y-60,x+w/2+1,y+14,STEEL); // spire sunk into the crown so it is attachedfill(x+w/2,Math.max(2,y-80),x+w/2+1,y-60,STEEL);
  return x+w;
}
function centralPark(x,GY){
  const w=210;
  fill(x,GY-3,x+w,GY,GRASS);fill(x,GY,x+w,GY+4,DIRT);
  fill(x,GY-6,x+3,GY-3,STONE);fill(x+w-3,GY-6,x+w,GY-3,STONE);
  // the lake
  fill(x+70,GY-3,x+150,GY+10,EMPTY);fill(x+70,GY-1,x+150,GY+10,WATER);fill(x+68,GY+10,x+152,GY+12,STONE);
  // rock outcrop + trees
  disc(x+30,GY-4,7,STONE,.95);tint(x+22,GY-12,x+38,GY,120,118,112,10);
  for(let k=x+8;k<x+w-6;k+=16+(R()*10|0))if(k<x+64||k>x+156){R()<.5?tree(k,GY-3):birch(k,GY-3);}
  fill(x+160,GY-7,x+172,GY-6,WOOD);fill(x+161,GY-6,x+162,GY-3,WOOD);fill(x+170,GY-6,x+171,GY-3,WOOD);
  return x+w;
}
