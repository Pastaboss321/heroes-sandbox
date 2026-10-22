// Realm set pieces (2026-10-21): big, dense, themed structures that fill the newer maps (Wakanda, Asgard,
// Sakaar, Knowhere, Titan, the Moon, the Dark Dimension) so they read as places, not flat strips with a
// few props. Each piece takes (x, hm) - left edge and the map's ground heightmap - checks its footprint is
// open (free), levels a foundation into the ground, builds itself from real materials (so it burns,
// breaks, slices and topples like everything else) and returns the width it used (0 = didn't fit).
// dress(hm, x0, x1, table) walks across a stretch placing weighted pieces with small gaps.
// Everything must touch the ground: the anchor pass drops anything left hanging.
import { BONE, CONC, DIRT, EMPTY, GLASS, GOLD, GRASS, ICE, LAVA, LEAF, NEON, OBSID, R, SAND, STEEL, STONE, VIBR, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, col, setc, t } from '../world/grid.js';
import { noise2 } from './city.js';

const C=(r,g,b)=>rgb(Math.max(0,Math.min(255,r)),Math.max(0,Math.min(255,g)),Math.max(0,Math.min(255,b)));
const inb=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
const J=(c,v=12)=>{const n=(R()*2-1)*v;return C(c[0]+n,c[1]+n,c[2]+n);};
const pick=a=>a[R()*a.length|0];
// overwrite / put-into-empty / rectangle / hollow room (back wall b)
export function ov(x,y,m,c){x|=0;y|=0;if(!inb(x,y))return;const i=y*W+x;setc(i,m);if(c!==undefined)col[i]=typeof c==='function'?c(x,y):c;}
export function put(x,y,m,c){x|=0;y|=0;if(!inb(x,y))return;const i=y*W+x;if(t[i])return;setc(i,m);if(c!==undefined)col[i]=typeof c==='function'?c(x,y):c;}
export function rect(x0,y0,x1,y1,m,c){for(let y=y0|0;y<(y1|0);y++)for(let x=x0|0;x<(x1|0);x++)ov(x,y,m,c);}
// rooms big enough are dressed like the city's cross-section floors: wallpaper with a dado line, lit
// windows in the back wall, and a piece or two of furniture on the floor
export function room(x0,y0,x1,y1,b){x0|=0;y0|=0;x1|=0;y1|=0;const fancy=typeof b!=='function'&&x1-x0>=10&&y1-y0>=10,br=b&255,bgc=(b>>8)&255,bb=(b>>16)&255;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){if(!inb(x,y))continue;const i=y*W+x;setc(i,EMPTY);
    if(!fancy){bg[i]=typeof b==='function'?b(x,y):b;continue;}
    const k=(x-x0)%3===0?.92:1,dado=y===y1-6,win=(x-x0)%16>=5&&(x-x0)%16<11&&y>y0+2&&y<y1-8&&x<x1-4;
    bg[i]=win?C(255*.75,214*.75,150*.75+(y-y0)*2):dado?C(br*.6,bgc*.6,bb*.6):C(br*1.5*k,bgc*1.5*k,bb*1.5*k);}
  if(!fancy)return;const fy=y1-1;
  for(let x=x0+3;x<x1-6;x+=8+(R()*10|0)){const r=R();
    if(r<.3){for(let k=0;k<5;k++)put(x+k,fy-3,WOOD,C(130,90,50));put(x,fy-2,WOOD,C(110,74,40));put(x,fy-1,WOOD,C(110,74,40));put(x+4,fy-2,WOOD,C(110,74,40));put(x+4,fy-1,WOOD,C(110,74,40));put(x+2,fy-4,NEON,C(140,220,255));}
    else if(r<.5){put(x+1,fy-1,DIRT,C(150,80,50));put(x+1,fy-2,DIRT,C(150,80,50));for(let k=0;k<4;k++)put(x+(k&1)*2,fy-3-(k>>1),LEAF,C(50,140+R()*40,60));}
    else if(r<.65){for(let y=fy-6;y<=fy;y++)for(let k=0;k<3;k++)put(x+k,y,STEEL,y===fy-5?C(90,200,255):C(60,62,72));}}}
function disc(cx,cy,r,m,c,ry=r){for(let y=-ry;y<=ry;y++)for(let x=-r;x<=r;x++)if((x*x)/(r*r)+(y*y)/(ry*ry)<=1)ov(cx+x,cy+y,m,c);}
function seg(x0,y0,x1,y1,w,m,c){const d=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))|0;for(let k=0;k<=d;k++){const f=d?k/d:0,x=x0+(x1-x0)*f,y=y0+(y1-y0)*f;for(let a=-w/2;a<w/2;a++)for(let b=-w/2;b<w/2;b++)ov(x+a,y+b,m,c);}}
// open sky above flat-enough ground over [x0,x1) up to height h
export function free(x0,x1,hm,h){x0|=0;x1|=0;if(x0<10||x1>W-10)return false;const g0=hm[x0];
  for(let x=x0;x<x1;x+=2){const g=hm[x];if(Math.abs(g-g0)>36)return false;const gi=g*W+x;if(!t[gi]&&!t[gi+W]&&!t[gi+2*W])return false;
    for(let y=g-h;y<g-1;y+=3){if(y<4)return false;const i=y*W+x;if(t[i]||bg[i])return false;}}return true;}
// a foundation: fill under the span up to its highest ground row, return that row
export function level(x0,x1,hm,m,c){let gy=H;for(let x=x0|0;x<x1;x++)gy=Math.min(gy,hm[x]);for(let x=x0|0;x<x1;x++)for(let y=gy;y<hm[x]+3;y++)ov(x,y,m,c);return gy;}
// walk a stretch placing weighted pieces: table = [[weight, fn], ...]
export function dress(hm,x0,x1,table,gap=[10,40]){let tot=0;for(const [w] of table)tot+=w;
  for(let x=x0|0;x<x1;){let r=R()*tot,fn=table[0][1];for(const [w,f] of table){if((r-=w)<0){fn=f;break;}}
    const used=fn(x,hm,x1);x+=used>0?used+gap[0]+(R()*(gap[1]-gap[0])|0):16;}}

// ============================== WAKANDA ==============================
const SANDST=[196,170,128],WGOLD=[226,184,84];
const vibC=(x,y)=>{const n=noise2(x,y,11);return C(120+n*40,70+n*30,210+n*40);};
const sand=(x,y)=>{const n=noise2(x*.5,y*.5,4)*14;return C(SANDST[0]+n,SANDST[1]+n,SANDST[2]+n*.8);};
// a Birnin Zana skyscraper: curved taper, gold ring ledges with hanging gardens, glass strips, vibranium crown
export function wkTower(x,hm,x1){const w=40+R()*34|0,h=200+R()*130|0;if(x+w+8>x1||!free(x-6,x+w+6,hm,h+40))return 0;
  const gy=level(x,x+w,hm,CONC,sand),cx=x+(w>>1),top=gy-h,bulge=R()*.3;
  const hw=y=>{const f=(gy-y)/h;return Math.max(3,(w/2)*(1-.55*f*f+bulge*Math.sin(f*Math.PI)))|0;};
  for(let y=top;y<gy;y++){const a=hw(y);for(let k=cx-a;k<=cx+a;k++){const edge=k<cx-a+2,glass=Math.abs(k-cx)===(a*.45|0)||Math.abs(k-cx)===(a*.45|0)+1;ov(k,y,glass?GLASS:CONC,glass?C(120,196,206):edge?C(150,126,96):sand(k,y));}}
  for(let y=gy-26;y>top+30;y-=30){const a=hw(y)+4;rect(cx-a,y,cx+a+1,y+3,GOLD,(X,Y)=>J(WGOLD,10));for(let k=cx-a;k<=cx+a;k++)if(R()<.7)put(k,y-1,LEAF,C(50+R()*30,140+R()*40,60));
    for(let k=cx-a;k<=cx+a;k+=3)if(R()<.4)for(let d=1;d<4+R()*6;d++)put(k,y+3+d,LEAF,C(40,120+R()*40,50));
    const ra=hw(y)-3;if(ra>4)room(cx-ra,y+5,cx+ra+1,y+22,C(70,58,50));}
  for(let y=top-24;y<top+6;y++){const a=Math.max(0,(hw(top)+1)*(1-(top+6-y)/30))|0;for(let k=cx-a;k<=cx+a;k++)ov(k,y,VIBR,vibC);}
  for(let k=0;k<14;k++)ov(cx,top-24-k,k<10?STEEL:NEON,k<10?C(80,70,90):C(190,130,255));
  return w;}
// the royal palace: stepped sandstone tiers, a great central tower with a vibranium dome, two side towers, skybridges
export function wkPalace(x,hm,x1){const w=280;if(x+w>x1||!free(x,x+w,hm,300))return 0;
  const gy=level(x,x+w,hm,STONE,sand),cx=x+w/2|0;
  for(let s=0;s<3;s++){const a=w/2-s*40,y1=gy-s*22,y0=y1-22;rect(cx-a,y0,cx+a,y1,STONE,sand);rect(cx-a,y0,cx+a,y0+2,GOLD,()=>J(WGOLD,8));
    room(cx-a+8,y0+5,cx+a-8,y1-3,C(66,52,42));for(let k=cx-a+12;k<cx+a-10;k+=16)rect(k,y0+5,k+4,y1-3,STONE,sand);}
  const T=gy-66;
  for(const s of [-1,1]){const tx=cx+s*92,th=150;for(let y=T-th;y<T;y++)rect(tx-15,y,tx+16,y+1,CONC,sand);for(let y=T-th+20;y<T;y+=28){rect(tx-19,y,tx+20,y+3,GOLD,()=>J(WGOLD,8));room(tx-11,y+5,tx+12,y+22,C(70,58,50));}
    for(let y=T-th-18;y<T-th;y++){const a=(15*(y-T+th+18)/18)|0;rect(tx-a,y,tx+a+1,y+1,VIBR,vibC);}}
  for(let y=T-250;y<T;y++)rect(cx-24,y,cx+25,y+1,CONC,sand);
  for(let y=T-230;y<T;y+=30){rect(cx-29,y,cx+30,y+3,GOLD,()=>J(WGOLD,8));room(cx-18,y+5,cx+19,y+24,C(70,58,50));rect(cx-24,y+10,cx-21,y+20,GLASS,C(120,196,206));rect(cx+22,y+10,cx+25,y+20,GLASS,C(120,196,206));}
  disc(cx,T-252,28,VIBR,vibC,22);for(let k=0;k<26;k++)ov(cx,T-274-k,k<18?GOLD:NEON,k<18?C(230,190,90):C(200,150,255));
  for(const s of [-1,1]){const y=T-110;for(let k=Math.min(cx+s*25,cx+s*77);k<Math.max(cx+s*25,cx+s*77);k++){ov(k,y,STEEL,C(70,60,80));ov(k,y+5,STEEL,C(70,60,80));for(let d=1;d<5;d++)ov(k,y+d,GLASS,C(150,200,230));}}
  for(const s of [-1,1])for(let k=0;k<3;k++){const bx=cx+s*(40+k*36);for(let y=gy-62;y<gy-30;y++){ov(bx,y,WOOD,y%6<3?C(110,50,160):C(230,190,80));ov(bx+1,y,WOOD,y%6<3?C(90,40,140):C(200,160,60));}}
  return w;}
// a street market: stalls with bright awnings, goods, strings of lights
export function wkMarket(x,hm,x1){const n=3+R()*3|0,w=n*30;if(x+w>x1||!free(x,x+w,hm,40))return 0;const gy=level(x,x+w,hm,STONE,sand);
  for(let k=0;k<n;k++){const sx=x+k*30,c=pick([[200,60,50],[230,180,40],[40,150,150],[130,60,170],[60,140,70]]);
    for(let y=gy-20;y<gy;y++){ov(sx+1,y,WOOD,C(110,74,40));ov(sx+24,y,WOOD,C(110,74,40));}
    for(let j=0;j<28;j++){const sag=Math.round(Math.sin(j/27*Math.PI)*2);ov(sx-1+j,gy-21+sag,WOOD,j%6<3?C(c[0],c[1],c[2]):C(240,230,210));ov(sx-1+j,gy-20+sag,WOOD,C(c[0]*.7,c[1]*.7,c[2]*.7));}
    rect(sx+3,gy-8,sx+23,gy-6,WOOD,C(130,90,50));for(let j=sx+4;j<sx+22;j+=2)put(j,gy-9,STONE,pick([C(220,80,40),C(240,200,60),C(90,170,60),C(170,90,200)]));}
  for(let j=x;j<x+w;j+=3)put(j,gy-26+Math.round(Math.sin((j-x)*.2)*1.5),NEON,pick([C(255,220,140),C(200,150,255),C(255,140,90)]));
  return w;}
// a jungle giant: a kapok with a buttressed trunk, layered canopy and hanging vines
export function jungleTree(x,hm,x1){const h=90+R()*70|0,w=70+R()*40|0;if(x+w>x1||!free(x,x+w,hm,h+10))return 0;const cx=x+(w>>1),gy=hm[cx];
  for(let y=gy-h;y<gy+4;y++){const f=(y-gy+h)/h,a=3+(f>.85?(f-.85)*40:0)|0;for(let k=-a;k<=a;k++)ov(cx+k,y,WOOD,C(96+R()*16,70,44));}
  for(let L=0;L<3;L++){const ly=gy-h+L*18,lw=w/2*(1-L*.18);for(let y=-10;y<10;y++)for(let k=-lw;k<=lw;k++){if(k*k/(lw*lw)+y*y/100>1-R()*.15)continue;put(cx+k,ly+y,LEAF,C(30+R()*30,110+R()*50+L*10,40+R()*20));}}
  for(let k=0;k<6;k++){const vx=cx-w/2+R()*w|0;let y=gy-h+8;const L=10+R()*40;for(let d=0;d<L;d++)put(vx,y+d,LEAF,C(40,100+R()*30,40));}
  return w;}
// a round house with a conical thatched roof
export function roundHouse(x,hm,x1){const w=26;if(x+w>x1||!free(x-4,x+w+4,hm,34))return 0;const gy=level(x,x+w,hm,DIRT,C(150,100,64));
  rect(x,gy-14,x+w,gy,DIRT,(X,Y)=>C(160+R()*14,104,64));room(x+3,gy-11,x+w-3,gy,C(70,46,30));
  for(let y=0;y<16;y++){const a=(w/2+5)*(y/16)|0;for(let k=-a;k<=a;k++)ov(x+w/2+k,gy-30+y,WOOD,C(190-y*3+R()*10,150-y*2,70));}
  return w;}

// ============================== ASGARD ==============================
const AG=(x,y,k=1)=>{const n=noise2(x,y,7)*30;return C((214+n)*k,(168+n*.8)*k,(64+n*.3)*k);};
// a tall domed tower: ring balconies, lit windows, an onion dome with a golden needle
export function agDomeTower(x,hm,x1){const w=34+R()*24|0,h=200+R()*140|0;if(x+w+16>x1||!free(x-8,x+w+8,hm,h+50))return 0;
  const gy=level(x,x+w,hm,GOLD,AG),cx=x+(w>>1),top=gy-h,a=w>>1;
  for(let y=top;y<gy;y++)for(let k=-a;k<=a;k++)ov(cx+k,y,GOLD,AG(cx+k,y,k<-a*.4?.78:k>a*.5?1.1:1));
  for(let y=gy-30;y>top+10;y-=34){rect(cx-a-5,y,cx+a+6,y+3,GOLD,(X,Y)=>AG(X,Y,1.15));for(let k=cx-a+3;k<cx+a-2;k+=5)rect(k,y-12,k+2,y-4,NEON,C(255,224,150));room(cx-a+3,y+4,cx+a-2,y+24,C(90,64,30));}
  for(let y=-34;y<=0;y++){const f=(y+34)/34,ra=Math.round((a+6)*Math.sin(f*Math.PI*.85+.2));for(let k=-ra;k<=ra;k++)ov(cx+k,top+y,GOLD,AG(cx+k,top+y,k<0?.85:1.15));}
  for(let k=0;k<22;k++)ov(cx,top-34-k,GOLD,C(255,230,140));return w;}
// a great mead hall: long gabled roof with dragon-head finials, carved posts
export function agHall(x,hm,x1){const w=140+R()*60|0,h=46;if(x+w>x1||!free(x-10,x+w+10,hm,h+60))return 0;const gy=level(x,x+w,hm,STONE,C(120,110,100));
  rect(x,gy-h,x+w,gy,GOLD,AG);room(x+5,gy-h+6,x+w-5,gy,C(84,58,28));for(let k=x+14;k<x+w-10;k+=22)rect(k,gy-h+6,k+4,gy,WOOD,C(120,80,40));
  for(let k=x+10;k<x+w-10;k+=8)rect(k,gy-h+10,k+3,gy-h+16,NEON,C(255,200,120));
  for(let j=0;j<w+16;j++){const rh=Math.round(36*(1-Math.abs(j-(w+16)/2)/((w+16)/2)));for(let y=0;y<rh;y++)ov(x-8+j,gy-h-1-y,WOOD,y===rh-1?C(240,200,90):C(150+R()*10,96,40));}
  for(const s of [0,1]){const ex=s?x+w+6:x-6,ey=gy-h-2;seg(ex,ey,ex+(s?8:-8),ey-14,3,GOLD,C(240,200,90));ov(ex+(s?10:-10),ey-16,NEON,C(255,120,60));}
  return w;}
// a colossal statue of an Asgardian king with a spear
export function agColossus(x,hm,x1){const w=70,h=220;if(x+w>x1||!free(x-10,x+w+10,hm,h+20))return 0;const gy=level(x,x+w,hm,STONE,C(130,120,110)),cx=x+35;
  rect(cx-30,gy-20,cx+30,gy,STONE,C(150,140,120));
  for(let y=gy-120;y<gy-20;y++){const a=10+((gy-20-y)<40?(40-(gy-20-y))*.0:0)+(y-gy+120)*.12|0;rect(cx-a,y,cx+a,y+1,GOLD,AG);} // robe
  rect(cx-16,gy-170,cx+16,gy-120,GOLD,AG);rect(cx-24,gy-170,cx-16,gy-130,GOLD,(X,Y)=>AG(X,Y,.85));rect(cx+16,gy-170,cx+24,gy-140,GOLD,AG);
  disc(cx,gy-182,11,GOLD,AG);rect(cx-12,gy-194,cx+12,gy-186,GOLD,(X,Y)=>AG(X,Y,1.2));for(const s of [-1,1])seg(cx+s*12,gy-190,cx+s*24,gy-206,3,GOLD,C(250,220,120));
  rect(cx-6,gy-176,cx+6,gy-168,GOLD,C(170,130,50));for(let y=gy-176;y<gy-150;y++)for(let k=-5;k<=5;k++)if(R()<.6)ov(cx+k,y,GOLD,C(200,190,170));
  for(let y=gy-214;y<gy-18;y++)ov(cx+26,y,STEEL,C(170,176,190));for(let y=0;y<14;y++){const a=(7*(1-y/14))|0;for(let k=-a;k<=a;k++)ov(cx+26+k,gy-214-y,STEEL,C(220,226,240));}
  return w;}
// a training arena: stepped stone stands around a sand floor
export function agArena(x,hm,x1){const w=220;if(x+w>x1||!free(x,x+w,hm,70))return 0;const gy=level(x,x+w,hm,STONE,C(130,120,110));
  for(let k=0;k<w;k++){const d=Math.abs(k-w/2)/(w/2);if(d<.55){ov(x+k,gy-1,SAND,C(210,190,140));continue;}const st=((d-.55)/.45*5|0);for(let y=gy-6-st*10;y<gy;y++)ov(x+k,y,STONE,(y-(gy-6-st*10))<2?C(200,180,130):C(150,136,110));}
  for(const s of [0,1]){const px=s?x+w-6:x+2;rect(px,gy-80,px+5,gy-50,GOLD,AG);for(let y=gy-96;y<gy-80;y++)ov(px+2,y,NEON,C(255,150+R()*80,40));}
  return w;}
// Yggdrasil: the world tree, a vast trunk with glowing branches and a golden-green crown
export function yggdrasil(x,hm,x1){const w=300,h=320;if(x+w>x1||!free(x,x+w,hm,h-40))return 0;const cx=x+150,gy=hm[cx];
  for(let y=gy-h*.7|0;y<gy+6;y++){const f=(y-gy+h*.7)/(h*.7),a=12+f*f*26|0;for(let k=-a;k<=a;k++)ov(cx+k+Math.round(Math.sin(y*.04)*3),y,WOOD,C(100+noise2(cx+k,y,3)*20,76,50));}
  const br=(x0,y0,ang,len,wd,d)=>{let px=x0,py=y0;for(let s=0;s<len;s++){px+=Math.cos(ang);py+=Math.sin(ang);ang+=(R()-.5)*.08;for(let k=-wd/2;k<wd/2;k++)ov(px+k,py,WOOD,C(96,72,48));if(s%14===0&&d>2)ov(px,py-1,NEON,C(255,220,120));}
    if(d>0){br(px,py,ang-.5,len*.65,Math.max(2,wd*.6),d-1);br(px,py,ang+.4,len*.6,Math.max(2,wd*.6),d-1);}else for(let y=-14;y<14;y++)for(let k=-22;k<22;k++)if(k*k/484+y*y/196<1-R()*.2)put(px+k,py+y,LEAF,R()<.06?C(255,220,110):C(80+R()*50,150+R()*50,60));};
  for(let k=0;k<5;k++)br(cx,gy-h*.68,-Math.PI/2+(k-2)*.45,60+R()*30,10,3);
  return w;}

// ============================== SAKAAR ==============================
const JK=[[150,70,60],[90,110,130],[180,150,70],[70,90,80],[160,160,170],[120,60,120],[200,110,60],[60,130,150]];
const jc=()=>J(pick(JK),18);
// a mountain of scrap: slabs, hull plates, pipes and wrecks heaped high, neon junk lights
export function skMountain(x,hm,x1){const w=200+R()*180|0,h=150+R()*130|0;if(x+w>x1||!free(x,x+w,hm,60))return 0;const cx=x+w/2;
  for(let k=0;k<w;k++){const d=Math.abs(k-w/2)/(w/2),top=hm[x+k]-Math.round(h*(1-d*d*.9)*(1-d*.2)+noise2(x+k,0,9)*14);for(let y=top;y<hm[x+k]+2;y++){const n=noise2((x+k)*.15,y*.15,5);ov(x+k,y,n>.2?STEEL:n>-.2?CONC:STONE,J(JK[((n+1)*4|0)%JK.length],14));}}
  for(let s=0;s<36;s++){const px=x+20+R()*(w-40),d=Math.abs(px-cx)/(w/2),py=hm[px|0]-h*(1-d*d*.9)*(.2+R()*.7),a=(R()-.5)*1.4,L=10+R()*30,c=jc();for(let j=0;j<L;j++)for(let q=0;q<3+R()*3;q++)ov(px+Math.cos(a)*j-Math.sin(a)*q,py+Math.sin(a)*j+Math.cos(a)*q,STEEL,c);}
  for(let s=0;s<6;s++){const px=x+30+R()*(w-60),d=Math.abs(px-cx)/(w/2),py=hm[px|0]-h*(1-d*d*.9)*(.3+R()*.5);for(let j=0;j<20;j++){ov(px+j*.3,py-j,STEEL,C(90,90,100));}ov(px+6,py-21,NEON,pick([C(255,90,200),C(90,220,255),C(255,200,60)]));}
  return w;}
// a scrapper shanty tower: boxes of scrap stacked off-kilter, ladders, flags
export function skShanty(x,hm,x1){const w=56+R()*30|0;if(x+w>x1||!free(x-6,x+w+6,hm,200))return 0;const gy=level(x,x+w,hm,STEEL,C(80,70,70));let y=gy,off=0,n=4+R()*4|0;
  for(let k=0;k<n;k++){const bw=Math.max(20,w-8-R()*20|0),bh=16+R()*10|0,bx=x+4+off+(R()*(w-bw-8)|0)*.3|0,c=pick(JK);rect(bx,y-bh,bx+bw,y,STEEL,(X,Y)=>(X-bx)%5===0?C(c[0]*.7,c[1]*.7,c[2]*.7):J(c,8));room(bx+3,y-bh+3,bx+bw-3,y-1,C(40,30,30));
    for(let j=bx+5;j<bx+bw-5;j+=7)rect(j,y-bh+5,j+3,y-bh+9,GLASS,C(255,200,120));y-=bh;off=Math.round((R()-.5)*8);}
  for(let yy=y;yy<gy;yy+=3){ov(x+w-2,yy,STEEL,C(100,100,110));}for(let yy=y-18;yy<y;yy++)ov(x+w/2,yy,STEEL,C(90,90,100));for(let j=1;j<10;j++)for(let q=0;q<5;q++)ov(x+w/2+j,y-18+q,WOOD,pick([C(255,90,160),C(90,200,255)]));
  return w;}
// a big crashed starship nosed into the ground
export function skShip(x,hm,x1){const L=170+R()*80|0,w=L;if(x+w>x1||!free(x,x+w,hm,90))return 0;const gy=hm[x+(w>>1)],a=(R()<.5?1:-1)*(.18+R()*.15),hh=24+R()*10|0,cx=x+w/2,c=pick([[150,156,170],[170,120,80],[110,140,120]]);
  for(let u=-L/2;u<L/2;u++)for(let v=-hh;v<=hh;v++){const f=(u+L/2)/L,th=hh*(f<.2?f/.2*.6+.4:f>.85?(1-f)/.15:1);if(Math.abs(v)>th)continue;const X=cx+u*Math.cos(a)-v*Math.sin(a),Y=gy-hh*.6+u*Math.sin(a)+v*Math.cos(a);const shell=Math.abs(v)>th-3||(u|0)%26===0;
    if(shell)ov(X,Y,STEEL,J(c,10));else if(inb(X|0,Y|0)){const i=(Y|0)*W+(X|0);setc(i,EMPTY);bg[i]=C(40,40,50);}}
  for(let u=-L/2+20;u<L/2-30;u+=14){const X=cx+u*Math.cos(a)+(hh-6)*Math.sin(a),Y=gy-hh*.6+u*Math.sin(a)-(hh-6)*Math.cos(a);ov(X,Y,NEON,C(255,140,60));ov(X+1,Y,NEON,C(255,140,60));}
  for(const s of [-1,1]){const u=-L/2+20,X=cx+u*Math.cos(a)+s*hh*Math.sin(a)*-1,Y=gy-hh*.6+u*Math.sin(a)+s*hh*Math.cos(a);seg(X,Y,X-30*Math.cos(a)+s*20*Math.sin(a),Y-30*Math.sin(a)-s*20*Math.cos(a)*-1,4,STEEL,J(c,10));}
  return w;}
// a striped neon pylon in the Grandmaster's colours
export function skPylon(x,hm,x1){const h=120+R()*90|0,w=18;if(x+w>x1||!free(x-4,x+w+4,hm,h+20))return 0;const gy=level(x,x+w,hm,STEEL,C(60,50,60)),RB=[[255,80,90],[255,170,60],[255,230,80],[80,220,120],[80,170,255],[180,90,255]];
  for(let y=gy-h;y<gy;y++){const a=Math.max(3,9-((gy-y)/h*5|0));for(let k=-a;k<=a;k++){const c=RB[((gy-y)>>4)%6];ov(x+9+k,y,k===0&&(y&3)===0?NEON:STEEL,k===0&&(y&3)===0?C(c[0],c[1],c[2]):Math.abs(k)===a?C(40,30,50):C(c[0]*.75,c[1]*.75,c[2]*.75));}}
  disc(x+9,gy-h-6,7,GLASS,C(255,150,230));return w;}

// ============================== KNOWHERE ==============================
const boneC=(x,y)=>{const n=noise2(x*.3,y*.3,2)*20;return C(176+n,150+n,120+n*.8);};
// a stacked mining shanty: prefab modules, catwalks, ladders, neon signs
export function khTown(x,hm,x1){const w=70+R()*40|0,h=130+R()*110|0;if(x+w>x1||!free(x-6,x+w+6,hm,h+20))return 0;const gy=level(x,x+w,hm,STEEL,C(70,64,70));
  for(const px of [x,x+w-3])for(let y=gy-h;y<gy;y++)rect(px,y,px+3,y+1,STEEL,C(90,84,92));
  let y=gy;while(y>gy-h+20){const mh=18+R()*8|0,mx=x+3+(R()*8|0),mw=w-6-(R()*16|0),c=pick([[140,70,50],[70,100,130],[150,130,70],[90,90,100]]);
    rect(mx,y-mh,mx+mw,y,STEEL,(X,Y)=>(Y-y)%6===0?C(c[0]*.7,c[1]*.7,c[2]*.7):J(c,8));room(mx+3,y-mh+3,mx+mw-3,y-1,C(36,30,38));
    for(let j=mx+5;j<mx+mw-6;j+=8)rect(j,y-mh+5,j+4,y-mh+9,GLASS,C(255,210,140));
    rect(x-10,y-mh-2,x+w+10,y-mh,STEEL,C(110,104,110));for(let j=x-10;j<x+w+10;j+=4)ov(j,y-mh-3,STEEL,C(90,90,96));y-=mh+2;}
  const nc=pick([C(255,80,170),C(80,230,255),C(255,200,60),C(140,255,120)]);for(let j=0;j<w*.6;j++)for(let q=0;q<6;q++)if(q===0||q===5||j%5<3)ov(x+w*.2+j,gy-h-8+q,NEON,nc);
  for(let yy=gy-h-8;yy<gy-h;yy++)ov(x+w*.3,yy,STEEL,C(80,80,86));
  return w;}
// a drilling derrick: lattice tower with X bracing, a pulley at the top, a pipe sunk into the bone
export function khRig(x,hm,x1){const w=44,h=170+R()*90|0;if(x+w>x1||!free(x-6,x+w+6,hm,h+20))return 0;const gy=level(x,x+w,hm,STEEL,C(80,74,70)),cx=x+22;
  for(let y=gy-h;y<gy;y++){const a=Math.round(4+18*(y-gy+h)/h);ov(cx-a,y,STEEL,C(150,90,50));ov(cx+a,y,STEEL,C(150,90,50));}
  for(let y=gy-h+10;y<gy;y+=16){const a0=Math.round(4+18*(y-gy+h)/h),a1=Math.round(4+18*(y+16-gy+h)/h);seg(cx-a0,y,cx+a1,y+16,1,STEEL,C(130,80,46));seg(cx+a0,y,cx-a1,y+16,1,STEEL,C(130,80,46));rect(cx-a0,y,cx+a0+1,y+1,STEEL,C(160,100,56));}
  disc(cx,gy-h-4,5,STEEL,C(90,90,96));for(let y=gy-h;y<gy+60;y++)ov(cx,y,STEEL,C(110,110,120));for(let y=gy;y<gy+60;y++)for(const s of [-2,-1,1,2])ov(cx+s,y,EMPTY);
  ov(cx,gy-h-12,NEON,C(255,60,60));return w;}
// a bone spire: a ridged spike of Celestial bone
export function khSpire(x,hm,x1){const w=30+R()*24|0,h=120+R()*140|0;if(x+w>x1||!free(x-4,x+w+4,hm,h+10))return 0;const gy=hm[x+(w>>1)],cx=x+(w>>1),lean=(R()-.5)*.25;
  for(let y=0;y<h+6;y++){const a=Math.max(0,(w/2)*Math.pow(1-y/h,.8))|0;for(let k=-a;k<=a;k++){const X=cx+k+y*lean,ridge=(y+Math.abs(k)*2)%14<2;ov(X,gy+4-y,BONE,ridge?C(140,118,94):boneC(X,gy-y));}}
  return w;}
// the Collector's emporium: a long gallery of glass cases holding curiosities
export function khMuseum(x,hm,x1){const w=200,h=80;if(x+w>x1||!free(x-6,x+w+6,hm,h+30))return 0;const gy=level(x,x+w,hm,STEEL,C(60,50,60));
  rect(x,gy-h,x+w,gy,STEEL,C(60,46,64));room(x+4,gy-h+6,x+w-4,gy,C(30,22,36));rect(x+4,gy-h/2,x+w-4,gy-h/2+3,STEEL,C(70,56,76));
  for(let fl=0;fl<2;fl++)for(let k=x+10;k<x+w-20;k+=24){const y1=fl?gy-h/2:gy,y0=y1-28;rect(k,y0,k+16,y0+1,GLASS,C(200,230,255));rect(k,y0,k+1,y1,GLASS,C(200,230,255));rect(k+15,y0,k+16,y1,GLASS,C(200,230,255));disc(k+8,y1-8,3,pick([STONE,GOLD,ICE,NEON]),pick([C(255,90,90),C(90,255,140),C(230,200,80),C(150,120,255)]));}
  for(let k=x+20;k<x+w-20;k++)for(let q=0;q<5;q++)if(q===0||q===4||(k%6)<4)ov(k,gy-h-8+q,NEON,C(255,190,80));
  return w;}
// tanks of glowing Celestial ooze
export function khVats(x,hm,x1){const n=2+R()*3|0,w=n*22;if(x+w>x1||!free(x-4,x+w+4,hm,70))return 0;const gy=level(x,x+w,hm,STEEL,C(70,64,70));
  for(let k=0;k<n;k++){const vx=x+k*22,vh=34+R()*30|0;for(let y=gy-vh;y<gy;y++){ov(vx,y,STEEL,C(90,90,100));ov(vx+17,y,STEEL,C(90,90,100));for(let q=1;q<17;q++)ov(vx+q,y,y<gy-vh+3?STEEL:y<gy-vh*.25?NEON:GLASS,y<gy-vh+3?C(90,90,100):y<gy-vh*.25?C(110+R()*40,255,160):C(140,220,180));}
    for(let j=0;j<10;j++)ov(vx+8,gy-vh-1-j,STEEL,C(110,110,120));}
  return w;}

// ============================== TITAN ==============================
const rust=(x,y)=>{const n=noise2(x*.4,y*.4,6)*16;return C(128+n,76+n*.6,58+n*.4);};
// a ruined tower: leaning, half buried, window rows, a jagged broken top
export function ttTower(x,hm,x1){const w=30+R()*36|0,h=150+R()*180|0,lean=(R()-.5)*.6;if(x+w+Math.abs(lean*h)>x1||!free(Math.min(x,x+lean*h),Math.max(x+w,x+w+lean*h),hm,h*.8))return 0;const gy=hm[x+(w>>1)];
  const brk=[];for(let c=0;c<w;c++)brk.push(h-(R()*30+Math.abs(Math.sin(c*.4))*20|0));
  for(let y=0;y<h;y++)for(let c=0;c<w;c++){if(y>brk[c])continue;const X=x+c+Math.round(y*lean),Y=gy+16-y;const frame=c<3||c>w-4||y%22<3;ov(X,Y,frame?CONC:STONE,frame?C(150,100,80):rust(X,Y));}
  for(let y=24;y<h-10;y+=22)for(let c=5;c<w-5;c++){if(y+14>brk[c])continue;if((c-5)%10>6)continue;for(let q=0;q<12;q++){const X=x+c+Math.round((y+q)*lean),Y=gy+16-y-q;if(inb(X,Y)){const i=Y*W+X;setc(i,EMPTY);bg[i]=C(44,26,22);}}}
  return w+Math.abs(lean*h)|0;}
// a colossal ring structure standing in the sand, segments missing
export function ttRing(x,hm,x1){const r=90+R()*70|0,w=r*2+20;if(x+w>x1||!free(x,x+w,hm,r*1.6))return 0;const cx=x+w/2|0,gy=hm[cx],cy=gy-r*.75|0,gapA=R()*6.283;
  for(let a=0;a<6.283;a+=.6/r){if(Math.abs(Math.atan2(Math.sin(a-gapA),Math.cos(a-gapA)))<.35)continue;for(let q=0;q<16;q++){const X=cx+Math.cos(a)*(r-q),Y=cy+Math.sin(a)*(r-q);if(Y>gy+6)continue;ov(X,Y,q<3||q>12?CONC:STONE,q<3||q>12?C(160,110,86):((a*40|0)%6===0?C(80,50,40):rust(X,Y)));}}
  for(let a=0;a<6.283;a+=.25){const X=cx+Math.cos(a)*(r-8),Y=cy+Math.sin(a)*(r-8);if(Y<gy&&inb(X|0,Y|0)&&t[(Y|0)*W+(X|0)])ov(X,Y,NEON,C(255,150,80));}
  return w;}
// a cracked dome, hollow inside
export function ttDome(x,hm,x1){const r=50+R()*40|0,w=r*2+4;if(x+w>x1||!free(x,x+w,hm,r+10))return 0;const cx=x+w/2|0,gy=level(x,x+w,hm,STONE,rust);
  for(let y=-r;y<=0;y++)for(let k=-r;k<=r;k++){const d=Math.sqrt(k*k+y*y);if(d>r)continue;if(d<r-6){const i=(gy+y)*W+cx+k;if(inb(cx+k,gy+y)){setc(i,EMPTY);bg[i]=C(50,30,26);}continue;}if(noise2((cx+k)*.3,(gy+y)*.3,8)>.45)continue;ov(cx+k,gy+y,STONE,(Math.abs(k)+y)%12<2?C(90,56,44):rust(cx+k,gy+y));}
  return w;}
// a colonnade: broken columns of different heights on a platform, one fallen
export function ttColonnade(x,hm,x1){const n=4+R()*4|0,w=n*22+10;if(x+w>x1||!free(x,x+w,hm,120))return 0;const gy=level(x,x+w,hm,STONE,rust);rect(x,gy-6,x+w,gy,STONE,(X,Y)=>C(150,100,80));
  for(let k=0;k<n;k++){const cx=x+10+k*22,ch=R()<.25?10+R()*20:60+R()*70|0;for(let y=gy-6-ch;y<gy-6;y++)for(let q=-4;q<=4;q++)ov(cx+q,y,STONE,Math.abs(q)===4?C(110,70,56):(q+20)%3===0?C(160,110,90):rust(cx+q,y));rect(cx-6,gy-6-ch-4,cx+7,gy-6-ch,STONE,C(160,110,90));}
  return w;}

// ============================== MOON ==============================
const reg=(x,y)=>{const n=noise2(x*.4,y*.4,3)*16;return C(150+n,150+n,158+n);};
// a jagged pinnacle of lunar rock
export function mnSpire(x,hm,x1){const w=40+R()*40|0,h=100+R()*140|0;if(x+w>x1||!free(x,x+w,hm,h))return 0;const cx=x+(w>>1),gy=hm[cx];
  for(let y=0;y<h+6;y++){const a=(w/2)*Math.pow(1-y/h,.7)*(.8+.2*Math.sin(y*.3))|0;for(let k=-a;k<=a;k++)ov(cx+k+Math.round(Math.sin(y*.05)*4),gy+4-y,STONE,k<-a*.3?C(100,100,108):reg(cx+k,gy-y));}
  return w;}
// a moon base: pressurised domes joined by tubes, an antenna mast
export function mnBase(x,hm,x1){const w=180;if(x+w>x1||!free(x,x+w,hm,90))return 0;const gy=level(x,x+w,hm,CONC,C(170,170,178));
  for(const [dx,r] of [[30,26],[100,36],[160,20]]){for(let y=-r;y<=0;y++)for(let k=-r;k<=r;k++){const d=Math.hypot(k,y*1.2);if(d>r)continue;ov(x+dx+k,gy-2+y,d>r-3?CONC:GLASS,d>r-3?C(220,222,230):((k+y)%9===0?C(200,230,255):C(140,180,210)));}
    room(x+dx-r+5,gy-r*.6,x+dx+r-5,gy-3,C(50,56,70));}
  rect(x+52,gy-14,x+66,gy-4,CONC,C(200,200,210));rect(x+134,gy-12,x+142,gy-4,CONC,C(200,200,210));
  for(let y=gy-110;y<gy-36;y++)ov(x+100,y,STEEL,C(180,180,190));disc(x+100,gy-114,6,STEEL,C(220,220,230));ov(x+100,gy-122,NEON,C(255,60,60));
  for(let k=-14;k<=14;k++){const y=gy-88-Math.round(k*k/14);ov(x+120+k,y,STEEL,C(200,200,210));}for(let y=gy-88;y<gy-36;y++)ov(x+120,y,STEEL,C(160,160,170));
  return w;}
// a Kree obelisk: a dark monolith with glowing glyph bands
export function mnObelisk(x,hm,x1){const w=24,h=130+R()*80|0;if(x+w>x1||!free(x-4,x+w+4,hm,h+20))return 0;const gy=level(x,x+w,hm,OBSID,C(40,40,60));
  for(let y=gy-h;y<gy;y++){const a=y<gy-h+14?Math.max(1,(12*(y-gy+h)/14)|0):12;for(let k=-a;k<a;k++)ov(x+12+k,y,OBSID,C(30,32,52));}
  for(let y=gy-h+24;y<gy-10;y+=18)for(let k=-8;k<8;k+=2)if(R()<.7)ov(x+12+k,y,NEON,C(80,160,255));return w;}
// an old lunar lander on its legs
export function mnLander(x,hm,x1){const w=50;if(x+w>x1||!free(x,x+w,hm,50))return 0;const gy=hm[x+25];
  for(const s of [-1,1])seg(x+25+s*10,gy-22,x+25+s*22,gy,2,STEEL,C(200,200,210));rect(x+12,gy-34,x+38,gy-20,GOLD,(X,Y)=>(X+Y)%4===0?C(200,150,50):C(230,190,80));rect(x+16,gy-46,x+34,gy-34,STEEL,C(210,210,220));rect(x+20,gy-42,x+26,gy-38,GLASS,C(60,70,90));
  return w;}
// a crater rim crowded with ice crystals
export function mnCrystals(x,hm,x1){const w=70+R()*50|0;if(x+w>x1||!free(x,x+w,hm,70))return 0;
  for(let k=0;k<12;k++){const cx=x+8+R()*(w-16),gy=hm[cx|0],h=12+R()*50,a=(R()-.5)*.6,c=R()<.5?C(170,230,255):C(200,170,255);for(let y=0;y<h;y++){const ww=Math.max(.5,4*(1-y/h));for(let q=-ww;q<=ww;q++)ov(cx+q+y*a,gy+3-y,ICE,c);}}
  return w;}
// a Kree step pyramid in the Blue Area
export function mnPyramid(x,hm,x1){const w=160+R()*80|0;if(x+w>x1||!free(x,x+w,hm,w*.5))return 0;const gy=level(x,x+w,hm,STONE,reg),cx=x+w/2|0;
  for(let s=0;s<w/2;s+=10){rect(cx-w/2+s,gy-s-10,cx+w/2-s,gy-s,STONE,(X,Y)=>(Y%10===0)?C(90,100,130):C(110,120,150));}
  room(cx-16,gy-30,cx+16,gy,C(30,34,50));for(let k=-10;k<=10;k++)ov(cx+k,gy-w/2+4,NEON,C(80,170,255));return w;}

// ============================== DARK DIMENSION ==============================
const dkC=(x,y)=>{const n=noise2(x*.2,y*.2,13)*18;return C(46+n,28+n*.6,64+n);};
// a cluster of twisted obsidian spires with burning runes
export function dkSpires(x,hm,x1){const w=90+R()*60|0;if(x+w>x1||!free(x,x+w,hm,180))return 0;const n=3+R()*3|0;
  for(let s=0;s<n;s++){const bx=x+10+R()*(w-20)|0,h=100+R()*200|0,w0=6+R()*10,curl=(R()-.5)*.04;let cx=bx,a=-Math.PI/2+(R()-.5)*.3;const gy=hm[bx];
    for(let st=0;st<h;st++){a+=curl;cx+=Math.cos(a)*.6;const cy=gy+4-st,ww=w0*(1-st/h)+1;for(let k=-ww;k<=ww;k++)ov(cx+k,cy,OBSID,Math.abs(k)<1&&st%11===0&&st>6?C(255,140,40):dkC(cx+k,cy));if(st%11===0&&st>6)ov(cx,cy,NEON,C(255,140,40));}}
  return w;}
// the temple of Dormammu: a ziggurat with fire braziers and a portal at the top
export function dkTemple(x,hm,x1){const w=220;if(x+w>x1||!free(x,x+w,hm,200))return 0;const gy=level(x,x+w,hm,OBSID,dkC),cx=x+w/2|0;
  for(let s=0;s<6;s++){const a=w/2-s*16;rect(cx-a,gy-(s+1)*18,cx+a,gy-s*18,OBSID,(X,Y)=>(Y-(gy-(s+1)*18))<2?C(120,40,90):dkC(X,Y));}
  room(cx-20,gy-40,cx+20,gy,C(40,10,30));for(let k=-20;k<=20;k++)ov(cx+k,gy-41,NEON,C(255,120,40));
  const py=gy-108-30;for(let a=0;a<6.283;a+=.02)for(let q=0;q<3;q++)ov(cx+Math.cos(a)*(28-q),py+Math.sin(a)*(28-q),q===1?NEON:OBSID,q===1?C(255,150,60):C(60,20,50));
  for(let y=py+28;y<gy-108;y++)rect(cx-3,y,cx+4,y+1,OBSID,dkC);
  for(const s of [-1,1]){const bx=cx+s*(w/2-14);rect(bx-3,gy-50,bx+4,gy-18,OBSID,dkC);for(let y=gy-60;y<gy-50;y++)ov(bx,y,LAVA);}
  return w;}
// a colossal pointed arch, a portal of hellfire hanging in it
export function dkArch(x,hm,x1){const w=120+R()*60|0,h=160+R()*80|0;if(x+w>x1||!free(x,x+w,hm,h))return 0;const gy=hm[x+(w>>1)],cx=x+w/2;
  for(let y=0;y<h;y++){const f=y/h,half=w/2*Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,(f-.4)/.6),2))),th=10;for(const s of [-1,1])for(let q=0;q<th;q++)ov(cx+s*(half-q),gy+4-y,OBSID,q===4?C(150,40,110):dkC(cx+s*(half-q),gy-y));}
  for(let y=gy-h*.7|0;y<gy;y+=6)for(let k=-w/2+14;k<w/2-14;k+=7)if(noise2((cx+k)*.1,y*.1,3)>.15)put(cx+k,y,NEON,C(255,100+R()*80,40));
  return w;}
// a jagged fang of rock
export function dkFang(x,hm,x1){const w=30+R()*30|0,h=80+R()*120|0;if(x+w>x1||!free(x,x+w,hm,h))return 0;const cx=x+(w>>1),gy=hm[cx],lean=(R()-.5)*.6;
  for(let y=0;y<h+4;y++){const a=(w/2)*(1-y/h)|0;for(let k=-a;k<=a;k++)ov(cx+k+y*lean,gy+4-y,OBSID,dkC(cx+k,gy-y));if(y%17===5)ov(cx+y*lean,gy+4-y,LAVA);}
  return w;}
// impossible stairs: zig-zag flights climbing a twisted column
export function dkStairs(x,hm,x1){const w=90,h=170;if(x+w>x1||!free(x,x+w,hm,h))return 0;const gy=level(x,x+w,hm,OBSID,dkC),cx=x+45;
  for(let y=gy-h;y<gy;y++)rect(cx-5,y,cx+6,y+1,OBSID,dkC);
  for(let f=0;f<6;f++){const y0=gy-f*28,dir=f%2?1:-1;for(let s=0;s<10;s++){const sx=cx+dir*(s*4),sy=y0-s*2.8;rect(Math.min(sx,sx+dir*6),sy,Math.max(sx,sx+dir*6),sy+3,OBSID,(X,Y)=>Y===(sy|0)?C(140,60,120):dkC(X,Y));}}
  for(let k=0;k<6;k++)ov(cx,gy-h-1-k,NEON,C(255,120,40));return w;}
