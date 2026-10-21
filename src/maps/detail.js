// Detail pass (2026-10-21): runs after every map generator (regen) and dresses the world by theme.
//  - surface props on open ground: street furniture in cities (lamps, hydrants, benches, bus stops,
//    traffic lights, newsstands, planters, bikes, manholes), plants, rocks, logs, mushrooms and crystals in
//    the wild, junk on Sakaar, ore carts on Knowhere, rune stones and braziers in Asgard...
//  - every registered building (BLD): rooftop clutter (AC units, vents, antennas with beacon lights,
//    satellite dishes, solar panels, roof gardens, helipads), side fire escapes, shop signs over the ground
//    floor, and furnished interiors on every floor (desks with screens, plants, water coolers, sofas, TVs,
//    vending machines, server racks, aquariums, safes)
//  - underground: stalactites and stalagmites in caves, geodes, ore veins, fossils, buried chests, tree
//    roots, glowing cave fungus, and utility pipes under city streets
// Everything is made of real materials, so it all burns, breaks, falls and slices like the rest.
import { ST } from '../state.js';
import { BONE, CONC, DIRT, EMPTY, GLASS, GOLD, GRASS, ICE, KIND, LEAF, NEON, OBSID, OIL, R, S, SNOW, STEEL, STONE, VIBR, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, col, setc, t } from '../world/grid.js';
import { NAT } from '../world/support.js';
import { BLD } from './city.js';
import { sign } from './landmarks.js';

const C=(r,g,b)=>rgb(r,g,b);
const inb=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
// put material m at (x,y) only into empty space; c = colour (default: the material's own)
function put(x,y,m,c){x|=0;y|=0;if(!inb(x,y))return false;const i=y*W+x;if(t[i]!==0)return false;setc(i,m);if(c!==undefined)col[i]=c;return true;}
// overwrite whatever is there (used underground, inside rock)
function over(x,y,m,c){x|=0;y|=0;if(!inb(x,y))return;const i=y*W+x;setc(i,m);if(c!==undefined)col[i]=c;}
const box=(x0,y0,x1,y1,m,c)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)put(x,y,m,typeof c==='function'?c(x,y):c);};
const clear=(x0,y0,x1,y1)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(!inb(x,y)||t[y*W+x]!==0)return false;return true;};
const jitter=(c,v=14)=>{const n=(R()*2-1)*v;return C(Math.max(0,Math.min(255,((c&255)+n))),Math.max(0,Math.min(255,(((c>>8)&255)+n))),Math.max(0,Math.min(255,(((c>>16)&255)+n))));};
const pick=a=>a[R()*a.length|0];

// ---------------- surface scan: the first solid cell from the top, and whether it is open ground
function surfaces(){const top=new Int16Array(W);for(let x=0;x<W;x++){let y=0;while(y<H-1&&KIND[t[y*W+x]]!==S)y++;top[x]=y;}return top;}
const skyAbove=(x,y,h)=>{for(let k=1;k<=h;k++){if(!inb(x,y-k))return true;const i=(y-k)*W+x;if(t[i]!==0||bg[i])return false;}return true;};
const flatHere=(top,x,w)=>{for(let k=1;k<w;k++)if(Math.abs(top[x+k]-top[x])>1)return false;return true;};

// ---------------- props (x = left edge, gy = the surface row they stand on)
const P={
 lamp(x,gy,c=C(255,220,140)){for(let y=1;y<=18;y++)put(x,gy-y,STEEL,C(60,62,70));for(let k=1;k<=3;k++)put(x+k,gy-18,STEEL,C(60,62,70));put(x+3,gy-17,NEON,c);put(x+4,gy-17,NEON,c);},
 hydrant(x,gy){box(x,gy-4,x+3,gy,STEEL,C(196,40,40));put(x+1,gy-5,STEEL,C(160,30,30));put(x-1,gy-3,STEEL,C(160,30,30));put(x+3,gy-3,STEEL,C(160,30,30));},
 bench(x,gy){for(let k=0;k<7;k++){put(x+k,gy-3,WOOD,C(130,86,46));put(x+k,gy-6,WOOD,C(120,80,42));}for(const lx of [x,x+6])for(let y=1;y<=2;y++)put(lx,gy-y,STEEL,C(50,50,56));},
 trash(x,gy){box(x,gy-5,x+3,gy,STEEL,C(40,80,50));put(x+1,gy-6,STEEL,C(30,60,40));},
 mailbox(x,gy){box(x,gy-6,x+3,gy-1,STEEL,C(40,70,160));put(x+1,gy-1,STEEL,C(30,40,80));},
 busStop(x,gy){for(let y=1;y<=13;y++){put(x,gy-y,STEEL,C(80,84,96));put(x+14,gy-y,STEEL,C(80,84,96));}for(let k=0;k<=14;k++)put(x+k,gy-14,STEEL,C(90,94,106));box(x+2,gy-12,x+13,gy-3,GLASS,C(150,200,220));
   for(let k=3;k<12;k++)put(x+k,gy-3,WOOD,C(120,80,42));sign(x+3,gy-11,'BUS',[255,230,120],1);},
 planter(x,gy){box(x,gy-3,x+7,gy,CONC,C(140,136,128));for(let y=3;y<9;y++)put(x+3,gy-y,WOOD,C(96,66,40));for(let dy=-3;dy<=3;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=12)put(x+3+dx,gy-11+dy,LEAF,C(40+R()*30|0,120+R()*40|0,44));},
 traffic(x,gy){for(let y=1;y<=22;y++)put(x,gy-y,STEEL,C(50,52,60));box(x-1,gy-29,x+2,gy-22,STEEL,C(30,30,34));put(x,gy-28,NEON,C(255,50,40));put(x,gy-26,NEON,C(255,200,40));put(x,gy-24,NEON,C(60,255,110));},
 newsstand(x,gy){box(x,gy-9,x+9,gy,WOOD,C(40,90,140));for(let k=0;k<9;k++)put(x+k,gy-10,WOOD,C(200,60,50));box(x+1,gy-7,x+8,gy-4,GLASS,C(230,220,190));},
 bollards(x,gy){for(let k=0;k<3;k++)for(let y=1;y<=3;y++)put(x+k*3,gy-y,STEEL,k===1&&y===3?C(255,200,40):C(70,72,80));},
 bike(x,gy){for(let a=0;a<6.283;a+=.6){put(x+2+Math.cos(a)*2,gy-2+Math.sin(a)*2,STEEL,C(30,30,36));put(x+8+Math.cos(a)*2,gy-2+Math.sin(a)*2,STEEL,C(30,30,36));}for(let k=2;k<=8;k++)put(x+k,gy-4,STEEL,C(200,40,40));put(x+3,gy-5,STEEL,C(200,40,40));},
 streetSign(x,gy){for(let y=1;y<=15;y++)put(x,gy-y,STEEL,C(80,84,96));box(x-4,gy-18,x+5,gy-15,STEEL,C(30,120,60));},
 tuft(x,gy){const h=1+R()*3|0;for(let y=1;y<=h;y++)put(x,gy-y,GRASS,C(60+R()*30|0,150+R()*40|0,50));},
 flower(x,gy,c){const h=2+R()*3|0;for(let y=1;y<h;y++)put(x,gy-y,GRASS,C(60,140,50));const fc=c||pick([C(230,60,70),C(250,210,60),C(170,90,220),C(250,250,250),C(250,140,60)]);put(x,gy-h,LEAF,fc);put(x-1,gy-h,LEAF,fc);put(x+1,gy-h,LEAF,fc);put(x,gy-h-1,LEAF,fc);},
 rock(x,gy,m=STONE,c=C(110,110,118)){const r=2+R()*4|0;for(let dy=-r;dy<=1;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy*1.6<=r*r){const i=(gy+dy)*W+x+dx;if(inb(x+dx,gy+dy)&&t[i]===0){setc(i,m);col[i]=jitter(c,12);}}},
 bush(x,gy,c=C(46,120,44)){for(let k=0;k<3;k++){const cx=x+k*3,r=2+R()*2|0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)put(cx+dx,gy-r-1+dy,LEAF,jitter(c,20));}},
 log(x,gy){const L=10+R()*12|0;for(let k=0;k<L;k++)for(let y=1;y<=3;y++)put(x+k,gy-y,WOOD,y===2&&k%5===0?C(80,54,30):C(120,82,48));put(x,gy-2,WOOD,C(190,150,100));},
 mushroom(x,gy){for(let y=1;y<=2;y++)put(x,gy-y,WOOD,C(230,220,200));for(let dx=-2;dx<=2;dx++)put(x+dx,gy-3,LEAF,C(210,40,40));put(x-1,gy-4,LEAF,C(210,40,40));put(x,gy-4,LEAF,C(250,250,250));put(x+1,gy-4,LEAF,C(210,40,40));},
 crystal(x,gy,c,m=NEON){const h=4+R()*8|0,lean=(R()-.5)*.4;for(let y=1;y<=h;y++){const w=Math.max(0,Math.round((1-y/h)*2));for(let dx=-w;dx<=w;dx++)put(x+dx+Math.round(y*lean),gy-y,m,jitter(c,20));}},
 runeStone(x,gy,rc=C(120,190,255)){box(x,gy-9,x+5,gy,STONE,C(96,96,108));for(let k=0;k<4;k++){const i=(gy-7+k*2)*W+x+1+(k&1)*2;if(inb(x,gy)){t[i]=NEON;col[i]=rc;}}},
 brazier(x,gy){box(x,gy-6,x+1,gy,GOLD,C(200,160,60));box(x-2,gy-8,x+3,gy-6,GOLD,C(220,176,62));put(x-1,gy-9,NEON,C(255,170,50));put(x,gy-10,NEON,C(255,220,120));put(x+1,gy-9,NEON,C(255,120,30));},
 barrel(x,gy){box(x,gy-6,x+4,gy,STEEL,(xx,yy)=>yy===gy-4?C(60,60,60):C(150,60,40));put(x+1,gy-5,OIL);put(x+2,gy-5,OIL);put(x+1,gy-3,OIL);put(x+2,gy-3,OIL);},
 crate(x,gy){const s=5+R()*3|0;box(x,gy-s,x+s,gy,WOOD,(xx,yy)=>(xx-x===yy-(gy-s)||xx-x===gy-1-yy||xx===x||yy===gy-s)?C(110,74,40):C(160,116,64));},
 tire(x,gy){for(let a=0;a<6.283;a+=.4)put(x+Math.cos(a)*3,gy-3+Math.sin(a)*3,STEEL,C(28,28,30));},
 oreCart(x,gy){box(x,gy-6,x+10,gy-2,STEEL,C(90,80,70));for(const wx of [x+2,x+7])put(wx,gy-1,STEEL,C(30,30,30));for(let k=1;k<9;k++)put(x+k,gy-7,GOLD,C(230,190,70));for(let k=3;k<7;k++)put(x+k,gy-8,GOLD,C(240,200,80));},
 pillar(x,gy,c=C(140,120,100)){const h=8+R()*26|0;for(let y=1;y<=h;y++)for(let dx=0;dx<4;dx++)if(y<h-(dx*2+R()*3|0))put(x+dx,gy-y,STONE,jitter(c,10));},
 shard(x,gy,m=OBSID,c=C(30,24,40)){const h=6+R()*12|0;for(let y=1;y<=h;y++){const w=Math.round((1-y/h)*1.6);for(let dx=-w;dx<=w;dx++)put(x+dx,gy-y,m,jitter(c,8));}},
 snowPile(x,gy){for(let dx=-6;dx<=6;dx++){const h=Math.round(3*Math.cos(dx/6*1.57));for(let y=1;y<=h;y++)put(x+dx,gy-y,SNOW);}},
 deadShrub(x,gy){for(let y=1;y<=5;y++)put(x,gy-y,WOOD,C(90,70,50));put(x-1,gy-4,WOOD,C(90,70,50));put(x+1,gy-3,WOOD,C(90,70,50));put(x-2,gy-5,WOOD,C(90,70,50));put(x+2,gy-5,WOOD,C(90,70,50));},
 tent(x,gy){const c=pick([C(200,80,50),C(60,120,190),C(220,190,60)]);for(let y=1;y<=8;y++){const w=8-y;for(let dx=-w;dx<=w;dx++)put(x+dx,gy-y,WOOD,dx===0&&y<5?C(40,30,30):c);}},
 campfire(x,gy){for(let dx=-3;dx<=3;dx++)put(x+dx,gy-1,STONE,C(90,90,96));put(x,gy-2,NEON,C(255,160,40));put(x-1,gy-2,WOOD,C(110,70,40));put(x+1,gy-2,WOOD,C(110,70,40));},
 skull(x,gy){box(x,gy-4,x+4,gy,BONE,C(226,218,196));put(x+1,gy-3,EMPTY);},
};
// a grid of props along open ground, picked from a weighted list
function strew(top,list,step,opt={}){for(let x=4;x<W-24;){const gy=top[x];const ok=gy>6&&gy<H-10&&skyAbove(x,gy,opt.clear||10)&&(!opt.nat||NAT[t[gy*W+x]]||opt.any);
  if(ok){let r=R()*list.reduce((a,b)=>a+b[0],0);for(const [w,f] of list){if((r-=w)<=0){f(x,gy);break;}}}x+=step[0]+(R()*(step[1]-step[0])|0);}}

// ---------------- buildings: rooftops, fire escapes, shop signs, furnished floors
const SHOPS=['PIZZA','DELI','BAR','HOTEL','CAFE','BANK','GYM','TOYS','24H','DINER','COMICS','SUSHI','TACOS','BOOKS','RAMEN','LAUNDRY','PAWN','VIDEO'];
function rooftop(x0,x1,top,glass){const w=x1-x0;if(w<10||top<14)return;
  for(let x=x0+3;x<x1-6;){const r=R();
    if(r<.22){box(x,top-4,x+6,top,STEEL,C(150,154,160));put(x+1,top-5,STEEL,C(90,94,100));x+=8;} // AC unit
    else if(r<.36){for(let y=1;y<=4;y++)put(x,top-y,STEEL,C(110,114,120));put(x+1,top-4,STEEL,C(110,114,120));x+=4;} // vent pipe
    else if(r<.46){const h=10+R()*14|0;for(let y=1;y<=h;y++)put(x,top-y,STEEL,C(70,72,80));put(x,top-h-1,NEON,C(255,40,40));put(x-1,top-h+3,STEEL,C(70,72,80));put(x+1,top-h+3,STEEL,C(70,72,80));x+=5;} // antenna with a beacon
    else if(r<.54){for(let a=0;a<3.14;a+=.25)put(x+3+Math.cos(a)*3,top-4-Math.sin(a)*2,STEEL,C(210,212,220));put(x+3,top-1,STEEL,C(90,90,96));put(x+3,top-2,STEEL,C(90,90,96));x+=9;} // satellite dish
    else if(r<.64&&!glass){for(let k=0;k<10;k++){put(x+k,top-1-(k>>2),GLASS,C(40,70,150));}x+=12;} // solar panel
    else if(r<.72&&!glass){box(x,top-2,x+12,top,DIRT,C(90,64,40));for(let k=0;k<12;k+=3)P.flower(x+k,top-2);x+=14;} // roof garden
    else x+=4+(R()*6|0);}
  if(w>=40&&top>40&&R()<.25){box(x0+6,top-2,x1-6,top,CONC,C(120,124,130));sign(((x0+x1)>>1)-1,top-8,'H',[255,255,255],1);} // helipad
}
function fireEscape(x0,x1,top,GY){const side=R()<.5?-1:1,ex=side<0?x0-6:x1;if(!clear(ex,top,ex+6,GY-2))return; // only into an empty gap beside the building
  for(let y=top+12;y<GY-4;y+=16){for(let k=0;k<6;k++)put(ex+k,y,STEEL,C(60,60,68));for(let k=0;k<6;k++)put(ex+(side<0?k:5-k),y+k*2.6|0,STEEL,C(80,80,88));put(ex+(side<0?0:5),y-3,STEEL,C(60,60,68));}}
function shopSign(x0,x1,GY){if(x1-x0<26)return;const word=pick(SHOPS),w=word.length*4,sx=x0+((x1-x0-w)>>1);if(w>x1-x0-4)return;const c=pick([[255,80,170],[80,230,255],[255,200,60],[255,90,60],[140,255,120]]);
  let ok=true;for(let y=GY-21;y<GY-15;y++)for(let x=sx-1;x<sx+w;x++)if(!inb(x,y)||t[y*W+x]!==0)ok=false;if(ok)sign(sx,GY-20,word,c,1);}
const ITEMS=[
 (x,f)=>{box(x,f-4,x+8,f-3,WOOD,C(130,90,50));put(x,f-2,WOOD,C(90,60,30));put(x,f-1,WOOD,C(90,60,30));put(x+7,f-2,WOOD,C(90,60,30));put(x+7,f-1,WOOD,C(90,60,30));box(x+2,f-8,x+6,f-5,GLASS,C(80,180,255));put(x+3,f-7,NEON,C(120,220,255));return 9;}, // desk + screen
 (x,f)=>{box(x,f-3,x+3,f,CONC,C(170,90,60));for(let y=4;y<9;y++){put(x+1,f-y,LEAF,C(40,140,50));put(x+(y&1?0:2),f-y,LEAF,C(50,160,60));}return 4;}, // potted plant
 (x,f)=>{box(x,f-6,x+3,f,STEEL,C(220,220,226));box(x,f-10,x+3,f-6,GLASS,C(170,210,240));put(x+1,f-9,WATER);put(x+1,f-8,WATER);return 4;}, // water cooler
 (x,f)=>{box(x,f-4,x+10,f,WOOD,C(150,50,60));box(x,f-7,x+2,f-4,WOOD,C(130,40,50));box(x+8,f-7,x+10,f-4,WOOD,C(130,40,50));return 11;}, // sofa
 (x,f)=>{box(x,f-3,x+8,f,WOOD,C(70,50,40));box(x+1,f-8,x+7,f-3,GLASS,C(30,30,40));put(x+3,f-6,NEON,C(120,200,255));put(x+4,f-5,NEON,C(255,120,200));return 9;}, // TV
 (x,f)=>{box(x,f-12,x+5,f,STEEL,C(200,40,40));box(x+1,f-10,x+4,f-4,GLASS,C(220,240,250));put(x+2,f-8,NEON,C(255,230,80));return 6;}, // vending machine
 (x,f)=>{box(x,f-12,x+4,f,STEEL,C(40,40,48));for(let y=2;y<12;y+=2)put(x+1+(y&2?1:0),f-y,NEON,y%4?C(60,255,110):C(255,180,40));return 5;}, // server rack
 (x,f)=>{box(x,f-3,x+9,f,WOOD,C(80,60,40));box(x,f-9,x+9,f-3,GLASS,C(120,190,230));box(x+1,f-8,x+8,f-4,WATER);put(x+3,f-6,NEON,C(255,150,40));return 10;}, // aquarium
 (x,f)=>{box(x,f-6,x+5,f,STEEL,C(70,74,84));put(x+3,f-3,STEEL,C(200,200,60));return 6;}, // safe
];
function furnish(x0,x1,top,GY){for(let x=x0+4;x<x1-4;x+=2){for(let y=top+2;y<GY;y++){const i=y*W+x;if(KIND[t[i]]!==S||t[i-W]!==0)continue; // a floor surface inside the building
    if(R()<.09){let h=0;while(h<13&&y-h-1>top&&t[(y-h-1)*W+x]===0)h++;if(h>=12){const f=pick(ITEMS);x+=f(x,y)+2;break;}}}}}
function buildings(){const GY=ST.streetY||0;for(const [x0,x1,top,kind] of BLD){if(x1<=x0)continue;const glass=kind==='glass';rooftop(x0,x1,top,glass);
  if(!glass){if(R()<.45)fireEscape(x0,x1,top,GY||top+200);furnish(x0,x1,top,GY||H);}else furnish(x0,x1,top,GY||H);
  if(GY)shopSign(x0,x1,GY);}}

// ---------------- underground
function underground(theme,top){
  const ore={urban:[GOLD,C(230,190,70)],nature:[GOLD,C(230,190,70)],estate:[GOLD,C(230,190,70)],snow:[ICE,C(180,230,255)],realm:[NEON,C(120,190,255)],junk:[STEEL,C(150,150,160)],mine:[GOLD,C(240,200,80)],ruin:[NEON,C(200,90,255)],moon:[ICE,C(190,230,255)],hell:[NEON,C(255,130,40)],wakanda:[VIBR,C(150,90,230)]}[theme]||[GOLD,C(230,190,70)];
  const geodeC={realm:[120,190,255],ruin:[200,90,255],hell:[255,120,40],moon:[180,230,255],mine:[120,255,170],wakanda:[170,110,255]}[theme]||pick([[255,90,200],[90,230,255],[170,120,255],[120,255,170]]);
  const fungus=theme==='nature'||theme==='wakanda'||theme==='estate'||theme==='mine';
  let st=0,sg=0;
  for(let x=2;x<W-2;x++){const gy=top[x];for(let y=gy+12;y<H-8;y++){const i=y*W+x,m=t[i];if(m!==0)continue;const up=t[i-W],dn=t[i+W];
    if(NAT[up]&&KIND[up]===S&&R()<.05&&st<6000){st++;const L=2+R()*7|0,c=col[i-W];for(let k=0;k<L;k++){const w=k<L*.4?1:0;for(let dx=-w;dx<=w;dx++){const j=(y+k)*W+x+dx;if(inb(x+dx,y+k)&&t[j]===0){setc(j,up);col[j]=jitter(c,6);}}}} // stalactite
    else if(NAT[dn]&&KIND[dn]===S&&R()<.04&&sg<6000){sg++;if(fungus&&R()<.35){const c=pick([C(120,255,230),C(255,140,220),C(170,255,120)]);for(let k=0;k<3;k++)put(x,y-k,NEON,k===2?c:C(70,150,140));}
      else{const L=2+R()*5|0,c=col[i+W];for(let k=0;k<L;k++){const j=(y-k)*W+x;if(t[j]===0){setc(j,dn);col[j]=jitter(c,6);}}}}}} // stalagmite / glowing fungus
  const area=W*H;
  for(let n=0;n<area/60000;n++){const cx=R()*W|0,cy=(top[cx]||300)+60+R()*(H-(top[cx]||300)-90)|0,r=5+R()*7|0;if(cy>=H-10)continue;let solid=0;for(let a=0;a<8;a++){const X=cx+Math.cos(a)*r|0,Y=cy+Math.sin(a)*r|0;if(inb(X,Y)&&KIND[t[Y*W+X]]===S)solid++;}if(solid<8)continue;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const d=Math.hypot(dx,dy);if(d>r)continue;const X=cx+dx,Y=cy+dy;if(d>r-1.5)over(X,Y,GLASS,C(200,200,210));else if(d>r-3.5)over(X,Y,NEON,jitter(C(geodeC[0],geodeC[1],geodeC[2]),30));else over(X,Y,EMPTY);}} // geode
  for(let n=0;n<area/25000;n++){let x=R()*W,y=(top[x|0]||300)+40+R()*(H-(top[x|0]||300)-60);const a=R()*6.283;for(let k=0;k<12+R()*24;k++){x+=Math.cos(a)+(R()-.5);y+=Math.sin(a)*.5+(R()-.5);const X=x|0,Y=y|0;if(inb(X,Y)&&Y<H-6&&NAT[t[Y*W+X]])over(X,Y,ore[0],jitter(ore[1],20));}} // ore veins
  for(let n=0;n<area/220000;n++){const cx=R()*W|0,cy=(top[cx]||300)+30+R()*80|0;if(!inb(cx,cy)||!NAT[t[cy*W+cx]])continue;const bc=C(228,220,198);for(let k=0;k<26;k++){over(cx+k,cy+Math.sin(k*.3)*2|0,STONE,bc);if(k%4===0)for(let r=1;r<6;r++){over(cx+k,cy-r,STONE,bc);over(cx+k,cy+r,STONE,bc);}}
    for(let dy=-4;dy<=4;dy++)for(let dx=-6;dx<=0;dx++)if(dx*dx/36+dy*dy/16<1)over(cx-4+dx,cy+dy,STONE,bc);over(cx-6,cy-1,DIRT,C(60,40,30));} // fossil
  for(let n=0;n<area/400000;n++){const cx=R()*W|0,cy=(top[cx]||300)+20+R()*60|0;if(!inb(cx,cy)||!NAT[t[cy*W+cx]])continue;for(let dy=0;dy<5;dy++)for(let dx=0;dx<8;dx++)over(cx+dx,cy+dy,WOOD,dy===0?C(150,100,50):C(110,70,36));for(let dx=1;dx<7;dx++)over(cx+dx,cy+1,GOLD,C(240,200,80));} // buried chest
  for(let x=0;x<W;x++){const y=top[x];if(!inb(x,y-1))continue;const m=t[(y-1)*W+x];if(m!==WOOD)continue;let rx=x,ry=y;for(let k=0;k<14+R()*16;k++){ry++;rx+=R()<.3?(R()<.5?-1:1):0;if(!inb(rx,ry)||!NAT[t[ry*W+rx]])break;over(rx,ry,WOOD,C(84,58,34));}} // roots under trees
  if(theme==='urban'&&ST.streetY){const gy=ST.streetY;for(const py of [gy+38,gy+46,gy+62]){const c=pick([C(150,154,160),C(160,90,50),C(60,110,60)]);for(let x=0;x<W;x++){const i=py*W+x;if(!inb(x,py)||!NAT[t[i]])continue;over(x,py,STEEL,c);over(x,py+1,STEEL,c);if(x%40===0){over(x,py-1,STEEL,C(80,80,86));over(x,py+2,STEEL,C(80,80,86));}}}}} // utility pipes

// ---------------- surface by theme
const T={
 urban(top){const GY=ST.streetY;if(!GY)return;let lastLamp=-99;
   for(let x=6;x<W-20;x++){if(top[x]!==GY||!skyAbove(x,GY,24))continue;if(x-lastLamp>70){P.lamp(x,GY,ST.neonCity?C(80,240,255):undefined);lastLamp=x;x+=4;continue;}
     if(R()<.05&&flatHere(top,x,16)){const f=pick([P.hydrant,P.bench,P.trash,P.mailbox,P.planter,P.newsstand,P.bollards,P.bike,P.streetSign,P.traffic,P.busStop]);f(x,GY);x+=18;}}
   for(let x=0;x<W;x+=90+(R()*80|0)){const i=GY*W+x;if(t[i]===CONC)for(let dx=0;dx<5;dx++){const j=GY*W+x+dx;if(t[j]===CONC)col[j]=C(50,50,56);}} // manholes
 },
 nature(top){strew(top,[[30,P.tuft],[14,P.flower],[6,P.rock],[6,P.bush],[2,P.log],[3,P.mushroom],[.6,P.tent],[.6,P.campfire]],[4,14],{nat:true});},
 estate(top){strew(top,[[30,P.tuft],[16,P.flower],[4,P.bush],[2,P.lamp],[1,P.bench]],[5,16],{nat:true});},
 wakanda(top){strew(top,[[24,P.tuft],[14,P.flower],[5,P.rock],[5,P.bush],[4,(x,g)=>P.crystal(x,g,C(160,100,255),VIBR)],[1,P.campfire]],[4,14],{nat:true});},
 snow(top){strew(top,[[10,P.snowPile],[6,(x,g)=>P.rock(x,g,ICE,C(190,230,250))],[5,P.deadShrub],[4,P.rock],[2,(x,g)=>P.crystal(x,g,C(190,235,255),ICE)]],[8,22],{nat:true});},
 realm(top){strew(top,[[18,P.tuft],[14,(x,g)=>P.flower(x,g,C(255,210,90))],[4,P.runeStone],[3,P.brazier],[3,(x,g)=>P.crystal(x,g,C(120,190,255))]],[5,16],{nat:true});},
 junk(top){strew(top,[[8,P.tire],[8,P.crate],[6,P.barrel],[5,P.rock],[3,P.skull]],[6,18],{any:true});},
 mine(top){strew(top,[[8,P.crate],[5,P.oreCart],[6,P.barrel],[6,(x,g)=>P.lamp(x,g,C(120,255,190))],[5,(x,g)=>P.crystal(x,g,C(120,255,170))]],[8,24],{any:true});},
 ruin(top){strew(top,[[8,P.pillar],[8,P.rock],[5,(x,g)=>P.crystal(x,g,C(200,90,255))],[3,P.skull]],[8,22],{any:true});},
 moon(top){strew(top,[[10,(x,g)=>P.rock(x,g,STONE,C(150,150,158))],[3,(x,g)=>P.crystal(x,g,C(190,230,255),ICE)]],[8,24],{any:true});},
 hell(top){strew(top,[[8,P.shard],[6,(x,g)=>P.crystal(x,g,C(255,120,40))],[4,P.skull],[3,P.brazier]],[6,18],{any:true});},
};
export function detailPass(theme){if(!theme)return;const top=surfaces();
  if(theme==='urban')buildings();(T[theme]||(()=>{}))(top);underground(theme,top);}
export { P };
