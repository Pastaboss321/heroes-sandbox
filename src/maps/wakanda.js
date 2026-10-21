// Wakanda: Birnin Zana, the Golden City. Afrofuturist towers with vibranium-lit crowns and hanging gardens,
// a maglev line through the city, Warrior Falls with its ritual pool on the left, the jungle beyond, and
// the Great Mound on the right: a mountain laced with glowing vibranium veins, mined by tunnels.
import { ST } from '../state.js';
import { CONC, DIRT, EMPTY, GLASS, GRASS, LEAF, NEON, OBSID, R, STEEL, STONE, VIBR, WATER, WOOD, rgb } from '../world/materials.js';
import { H, VH, VW, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { spawn } from '../world/particles.js';

export const WAK={fx:0,fy:0,pool:[0,0,0],mx:0};
const vib=(x,y)=>{const n=noise2(x,y,11);return rgb(120+n*40|0,70+n*30|0,210+n*40|0);};
function wTower(x,w,h,gy){ // tall tower: tiered ledges with gardens, a glass core, a glowing vibranium crown
  const top=gy-h,core=Math.max(4,w*.35|0),cx=x+(w>>1);
  fill(x,top+20,x+w,gy,CONC);tint(x,top+20,x+w,gy,176,150,118,10);
  for(let y=top+20;y<gy;y+=26){fill(x-4,y,x+w+4,y+3,CONC);tint(x-4,y,x+w+4,y+3,206,186,150,8);for(let k=x-4;k<x+w+4;k+=2)if(R()<.6){sxy(k,y-1,LEAF);col[(y-1)*W+k]=rgb(50+R()*30,140+R()*40,60);}}
  for(let y=top+24;y<gy-2;y++)for(let k=cx-(core>>1);k<cx+(core>>1);k++){const i=y*W+k;setc(i,GLASS);col[i]=rgb(140,200,210);}
  for(let y=top;y<top+20;y++){const hw=Math.max(1,(w/2)*((y-top)/20))|0;for(let k=cx-hw;k<=cx+hw;k++){const i=y*W+k;setc(i,VIBR);col[i]=vib(k,y);}}
  for(let k=0;k<10;k++){const i=(top-k)*W+cx;setc(i,NEON);col[i]=rgb(180,120,255);}
  bgRect(x+2,top+24,x+w-2,gy-1,rgb(70,58,52));
  for(let y=top+30;y<gy-4;y+=26)fill(x+2,y,x+w-2,y+16,EMPTY);
}
function hut(x,gy){const w=22;fill(x,gy-12,x+w,gy,DIRT);tint(x,gy-12,x+w,gy,150,96,60,12);for(let k=0;k<w+8;k++){const hh=Math.round(9*Math.sin(k/(w+8)*Math.PI));for(let y=0;y<hh;y++)sxy(x-4+k,gy-13-y,WOOD);}bgRect(x+3,gy-10,x+w-3,gy-1,rgb(60,40,26));fill(x+8,gy-9,x+14,gy,EMPTY);}
function palm(x,gy){const h=30+R()*30|0;for(let k=0;k<h;k++)sxy(x+Math.round(Math.sin(k*.06)*3),gy-k,WOOD);const tx=x+Math.round(Math.sin(h*.06)*3),ty=gy-h;
  for(let a=0;a<6;a++){const an=-Math.PI*(.1+a*.16);for(let r=0;r<14;r++){const X=tx+Math.round(Math.cos(an)*r),Y=ty+Math.round(Math.sin(an)*r*.6+r*r*.03);sxy(X,Y,LEAF);if(X>=0&&X<W&&Y>=0)col[Y*W+X]=rgb(40+R()*20,130+R()*40,50);}}}
export function genWakanda(){
  clearAll();
  const GY=356,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([250,160,90],[255,224,170],()=>{
    for(let y=0;y<120;y++)for(let x=0;x<ST.FW;x++){const o=y*ST.FW+x,a=(1-y/120)*.5,f=ST.far[o];ST.far[o]=rgb((f&255)*(1-a)+120*a,((f>>8)&255)*(1-a)+80*a,((f>>16)&255)*(1-a)+140*a);}
    {const cx=ST.FW*.7|0,cy=90;for(let y=-26;y<=26;y++)for(let x=-26;x<=26;x++)if(x*x+y*y<676)ST.far[(cy+y)*ST.FW+cx+x]=rgb(255,236,190);}
    for(const [amp,base,c] of [[60,GB-30,[170,110,110]],[40,GB,[120,84,90]]])for(let x=0;x<ST.FW;x++){const hh=base-Math.abs(Math.sin(x*.008+s))*amp-Math.sin(x*.03+s)*amp*.3|0;for(let y=Math.max(0,hh);y<H;y++)ST.far[y*ST.FW+x]=rgb(c[0]-(y-hh)/6,c[1]-(y-hh)/6,c[2]-(y-hh)/6);}
    for(let x=0;x<ST.FW;){const w=5+R()*12|0,h=40+R()*130|0,base=GB+20;for(let y=base-h;y<H;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++){const o=y*ST.FW+xx;ST.far[o]=y<base-h+6?rgb(170,120,230):(xx%3===1&&y%5===2&&R()<.3)?rgb(255,220,160):rgb(80,56,60);ST.farKeep[o]=y<base-h+6?1:0;}x+=w+4+(R()*18|0);}
  });
  const FX=W*.14|0,MX=W*.82|0,MR=W*.13|0;WAK.mx=MX;
  const hm=new Int16Array(W);
  for(let x=0;x<W;x++){let h=GY+Math.sin(x*.009+s)*5+Math.sin(x*.031)*2|0;if(x<FX)h=GY-90+Math.sin(x*.04)*6|0;const d=Math.abs(x-MX);if(d<MR)h=Math.min(h,GY-200+(d/MR)**1.4*200|0);hm[x]=h;}
  for(let x=0;x<W;x++){const h=hm[x],mound=Math.abs(x-MX)<MR;for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:y<h+2&&!mound?GRASS:y<h+16?DIRT:STONE);if(t[i]===STONE&&mound&&noise2(x*1.6,y*1.6,s+5)>.42){t[i]=VIBR;col[i]=vib(x,y);}}
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(52-(y-h)/12,36-(y-h)/14,30-(y-h)/16);}
  bgD.set(bg);
  for(let y=GY+60;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&t[i]!==VIBR&&noise2(x,y,s+1)>.4)setc(i,EMPTY);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // the mound's mine: switchback tunnels lit by vibranium, a cart rail
  for(let k=0;k<4;k++){const y0=GY-150+k*55,dir=k%2?1:-1;for(let j=0;j<MR*1.3;j++){const x=MX-dir*MR*.65+dir*j|0,y=y0+(j*.12|0);if(t[y*W+x]===0&&y<hm[x])continue;fill(x,y-9,x+1,y,EMPTY);bgRect(x,y-9,x+1,y,rgb(40,30,46));sxy(x,y,STEEL);if(j%30===0){const i=(y-8)*W+x;t[i]=NEON;col[i]=rgb(190,130,255);}}}
  // Warrior Falls: the river off the highland pours into the ritual pool; a stone stage in the pool
  WAK.fx=FX;WAK.fy=hm[FX-4];
  for(let x=0;x<FX;x++){const h=hm[x];for(let y=h;y<h+4;y++)setc(y*W+x,y<h+1?EMPTY:WATER);fill(x,h+4,x+1,h+7,STONE);}
  for(let x=FX;x<FX+170;x++){const d=1-Math.abs(x-(FX+85))/85;for(let y=hm[x];y<hm[x]+8+d*26;y++)setc(y*W+x,y<hm[x]+2?EMPTY:WATER);}
  fill(FX+66,hm[FX+85]-4,FX+104,hm[FX+85]+2,STONE);tint(FX+66,hm[FX+85]-4,FX+104,hm[FX+85]+2,140,126,110,10);
  WAK.pool=[FX+10,FX+160,hm[FX+85]+22];
  for(let y=hm[FX];y<GY;y++){fill(FX-2,y,FX,y+1,STONE);}
  // the Golden City
  for(let x=FX+200;x<MX-MR-40;){const r=R();
    if(r<.5){const w=30+R()*30|0,h=120+R()*200|0;wTower(x,w,h,hm[x+(w>>1)]);x+=w+16+(R()*24|0);}
    else if(r<.75){hut(x,hm[x]);x+=34;}else{palm(x+4,hm[x+4]);x+=20;}}
  // maglev: a thin elevated rail across the city with a sleek train
  {const ry=GY-64;for(let x=FX+190;x<MX-MR;x++){if(t[ry*W+x]||t[(ry+1)*W+x])continue;sxy(x,ry,STEEL);const i=(ry+1)*W+x;setc(i,NEON);col[i]=rgb(170,110,255);if(x%120===0)for(let y=ry+2;y<hm[x];y++)if(!t[y*W+x])sxy(x,y,STEEL);}
    const tx=FX+400+R()*600|0;for(let c=0;c<3;c++){const x=tx+c*40;for(let y=ry-8;y<ry;y++)for(let k=x;k<x+38;k++)if(!t[y*W+k]){setc(y*W+k,STEEL);col[y*W+k]=rgb(40,30,56);}for(let k=x+3;k<x+35;k+=6){const i=(ry-6)*W+k;if(t[i]===STEEL){t[i]=GLASS;col[i]=rgb(160,130,255);}}}}
  // the panther: a colossal statue on the slope of the mound
  {const sx=MX-MR-10,gy=hm[sx];for(let y=-80;y<0;y++)for(let x=-20;x<20;x++){const body=(x*x)/(400)+((y+40)*(y+40))/1600<1,head=(x+6)*(x+6)+(y+86)*(y+86)<120;if(body||head){const i=(gy+y)*W+sx+x;setc(i,STONE);col[i]=rgb(34,30,40);}}
    for(const ex of [-10,-2]){const i=(gy-88)*W+sx+ex;t[i]=NEON;col[i]=rgb(200,150,255);}}
  for(let x=FX+170;x<FX+200;x+=8)palm(x,hm[x]);
  for(let x=10;x<FX;x+=14+R()*20|0)if(R()<.7)palm(x,hm[x]);
  ST.SPAWNX=FX+230;
}
export function ambWakanda(){
  for(let k=0;k<6;k++){const x=1+(R()*4|0),i=(WAK.fy+1)*W+x;if(t[i]===0)setc(i,WATER);}
  const [a,b,y0]=WAK.pool;if(t[(y0-14)*W+((a+b)>>1)]===WATER)for(let k=0;k<12;k++){const x=a+R()*(b-a)|0,i=(y0+(R()*6|0))*W+x;if(t[i]===WATER)setc(i,EMPTY);}
  for(let k=0;k<3;k++)spawn(WAK.fx+1+R()*3,WAK.fy+2+R()*4,.3+R()*.4,R()*.5,R()<.6?rgb(80,140,220):rgb(200,225,255),60,0,0,1);
  if(ST.frame%3===0)spawn(WAK.fx+20+R()*60,WAK.pool[2]-24,(R()-.5)*1.2,-.4-R()*.5,rgb(220,235,250),30,0,0,0,1);
  if(ST.frame%4===0)spawn(WAK.mx+(R()-.5)*300,ST.camY+R()*VH,(R()-.5)*.2,-.2,rgb(190,140,255),60,0,1,0,0); // vibranium motes
}
