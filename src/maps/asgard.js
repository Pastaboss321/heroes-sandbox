// Asgard: the Realm Eternal. Heimdall's observatory at the end of the Bifrost, the rainbow bridge strung
// over the edge of the world, the golden city with Odin's palace at its heart, and the ocean pouring off
// the far rim into the cosmos. A nebula sky with Yggdrasil's branches behind it.
import { ST } from '../state.js';
import { DIRT, EMPTY, GLASS, GOLD, GRASS, NEON, OBSID, R, STEEL, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, N, VW, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { tree } from './forest.js';
import { spawn } from '../world/particles.js';

export const ASG={gy:360,b0:0,b1:0,falls:0};
const RAIN=[[255,70,70],[255,160,60],[255,230,80],[90,230,110],[70,170,255],[150,90,255]];
function goldCol(x,y,k=1){const n=noise2(x,y,7)*30;return rgb(Math.min(255,(214+n)*k),Math.min(255,(168+n*.8)*k),Math.min(255,(64+n*.3)*k));}
// a golden spire: stepped base, tall tapering shaft, pointed crown, warm lit windows, a hall inside
function spire(cx,w,h,gy){
  const top=gy-h;
  for(let y=top;y<gy;y++){const f=(y-top)/h,hw=Math.max(1,(w/2)*(.25+.75*Math.pow(f,.45)))|0;
    for(let x=cx-hw;x<=cx+hw;x++){const i=y*W+x;if(x<0||x>=W)continue;setc(i,GOLD);col[i]=goldCol(x,y,x<cx-hw*.4?.78:x>cx+hw*.5?1.12:1);}}
  for(let k=0;k<14;k++)sxy(cx,top-k,GOLD);
  for(let y=top+10;y<gy-6;y+=9)for(let x=cx-(w*.3|0);x<=cx+(w*.3|0);x+=4){const i=y*W+x;if(t[i]===GOLD&&t[i+W]===GOLD){t[i]=NEON;col[i]=rgb(255,224,150);}}
  if(h>200)return; // the tallest spires stay solid: a hollow base can't carry them
  const hw=w*.3|0;bgRect(cx-hw,gy-Math.min(h*.5,60),cx+hw,gy-1,rgb(96,70,30));fill(cx-hw,gy-Math.min(h*.5,60)|0,cx+hw,gy-1,EMPTY);
  for(let y=gy-Math.min(h*.5,60)|0;y<gy;y+=20)fill(cx-hw,y,cx+hw,y+2,GOLD);
}
function palace(cx,gy){ // Odin's palace: a crown of spires around one huge central tower
  for(let s=0;s<4;s++){const w=360-s*80,hh=26;fill(cx-w/2,gy-hh*(s+1),cx+w/2,gy-hh*s,GOLD);tint(cx-w/2,gy-hh*(s+1),cx+w/2,gy-hh*s,200,156,60,14);
    for(let x=cx-w/2;x<cx+w/2;x+=10)fill(x,gy-hh*(s+1)+6,x+3,gy-hh*s-4,NEON);}
  for(let y=gy-104;y<gy;y++)for(let x=cx-170;x<cx+170;x++){const i=y*W+x;if(t[i]===NEON)col[i]=rgb(255,226,160);}
  bgRect(cx-150,gy-100,cx+150,gy-2,rgb(80,58,26));fill(cx-150,gy-50,cx+150,gy-2,EMPTY);
  for(let x=cx-146;x<cx+150;x+=28)fill(x,gy-50,x+9,gy-2,GOLD); // a colonnade under the tiers
  fill(cx-14,gy-22,cx+14,gy-2,GOLD);for(let y=gy-40;y<gy-22;y++)fill(cx-4,y,cx+4,y+1,GOLD); // the throne
  spire(cx,96,300,gy-104);for(const d of [-1,1]){spire(cx+d*92,46,190,gy-104);spire(cx+d*150,30,130,gy-78);}
}
export function genAsgard(){
  clearAll();
  const GY=ASG.gy,GB=143+(GY-143)*.5|0,s=R()*100;
  makeFar([6,8,34],[70,40,110],()=>{
    for(let k=0;k<900;k++){const x=R()*ST.FW|0,y=R()*H|0;ST.far[y*ST.FW+x]=R()<.2?rgb(255,220,180):rgb(190,200,255);}
    for(let k=0;k<6;k++){const cx=R()*ST.FW,cy=30+R()*150,rr=40+R()*80,c=[[150,70,200],[60,120,220],[220,90,150]][k%3]; // nebula clouds
      for(let y=-rr;y<rr;y++)for(let x=-rr*2;x<rr*2;x++){const X=cx+x|0,Y=cy+y|0;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;const d=(x*x/4+y*y)/(rr*rr),n=noise2(X,Y,s+k);if(d<1&&n>-.1){const a=(1-d)*.35*(n+.3),o=Y*ST.FW+X,f=ST.far[o];ST.far[o]=rgb((f&255)*(1-a)+c[0]*a,((f>>8)&255)*(1-a)+c[1]*a,((f>>16)&255)*(1-a)+c[2]*a);}}}
    for(let k=0;k<5;k++){let x=R()*ST.FW,y=0,a=1.2+R()*.6;for(let st=0;st<260;st++){x+=Math.cos(a)*1.4;y+=Math.sin(a)*1.1;a+=(R()-.5)*.12;const X=x|0,Y=y|0;if(X<1||X>=ST.FW-1||Y<0||Y>=H)break;for(let w=-2;w<=2;w++){const o=Y*ST.FW+X+w;if(o>=0&&o<ST.far.length)ST.far[o]=rgb(46,30,58);}}} // Yggdrasil's branches
    for(const [base,c,lit,gap] of [[GB-24,rgb(72,58,46),.12,70],[GB+8,rgb(50,40,32),.25,40]])for(let x=R()*40|0;x<ST.FW;){const w=6+R()*12|0,h=30+R()*(gap>50?140:90)|0,cx=x+(w>>1);
      for(let y=base-h;y<H;y++){const f=Math.min(1,(y-base+h)/h),hw=Math.max(0,(w/2)*Math.pow(f,.5))|0;for(let xx=cx-hw;xx<=cx+hw&&xx<ST.FW;xx++){if(xx<0)continue;const o=y*ST.FW+xx;if(o<0)continue;const on=xx%3===1&&y%5===2&&R()<lit;ST.far[o]=on?rgb(255,214,130):c;if(on)ST.farKeep[o]=1;}}
      x+=w+gap*(.5+R());}
    for(let x=0;x<ST.FW;x++){const hh=GB+24+Math.sin(x*.02)*4|0;for(let y=hh;y<H;y++)ST.far[y*ST.FW+x]=rgb(40,32,30);} // the realm's far shore
  });
  // the land: a cliff at each end over the void; the Bifrost spans the left gap
  const b0=W*.08|0,b1=W*.3|0;ASG.b0=b0;ASG.b1=b1;
  const hm=new Int16Array(W);
  for(let x=0;x<W;x++){let h=GY+Math.sin(x*.01+s)*6+Math.sin(x*.033+s*2)*3|0;if(x>W*.8)h=GY-40-((x-W*.8)*.12|0)+Math.sin(x*.05)*8|0;hm[x]=h;}
  for(let x=0;x<W;x++){const gap=x>b0&&x<b1;const h=hm[x];
    if(gap){for(let y=H-6;y<H;y++)setc(y*W+x,OBSID);for(let y=H-40;y<H-6;y++)bg[y*W+x]=0;continue;}
    const cliff=x<b0?Math.min(1,(b0-x)/30):x>b1?Math.min(1,(x-b1)/30):1;
    for(let y=h;y<H;y++){const i=y*W+x;if(cliff<1&&y>h+cliff*(H-h-10)+noise2(x,y,s)*10)continue;setc(i,y>=H-4?OBSID:y<h+2?GRASS:y<h+18?DIRT:STONE);}
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(40-(y-h)/12,34-(y-h)/14,46-(y-h)/12);}
  bgD.set(bg);
  for(let y=GY+50;y<H-8;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]&&noise2(x,y,s+3)>.4)setc(i,EMPTY);else if(t[i]===STONE&&noise2(x*2,y*2,s+9)>.55){t[i]=NEON;col[i]=rgb(120,190,255);}} // caverns + uru crystal veins
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // the Bifrost: a rainbow deck on a golden spine
  {const y=GY-6;for(let x=b0-20;x<b1+20;x++){fill(x,y+6,x+1,y+10,GOLD);for(let k=0;k<6;k++){const i=(y+k)*W+x,c=RAIN[k];setc(i,NEON);col[i]=rgb(c[0],c[1],c[2]);}}
    for(let x=b0;x<b1;x+=90){for(let k=0;k<26;k++)fill(x-1+(k>>3),y+10+k,x+2-(k>>3),y+11+k,GOLD);}}
  // Heimdall's observatory on the outer cliff
  {const ox=b0*.45|0,gy=hm[ox];for(let y=-46;y<=0;y++)for(let x=-50;x<=50;x++){if(x*x/2500+y*y/2116>1)continue;const i=(gy+y)*W+ox+x;setc(i,GOLD);col[i]=goldCol(ox+x,gy+y);}
    for(let y=-40;y<0;y++)for(let x=-42;x<=42;x++){if(x*x/1764+y*y/1600<1){const i=(gy+y)*W+ox+x;t[i]=0;bg[i]=rgb(70,50,24);}}
    fill(ox-30,gy-8,ox+30,gy,GOLD);for(let x=ox-6;x<ox+6;x++)for(let y=gy-30;y<gy-8;y++){const i=y*W+x;setc(i,NEON);col[i]=rgb(255,240,200);}fill(ox-4,gy-34,ox+4,gy-30,STEEL);}
  // the city: halls and spires; the palace near the middle
  const PX=W*.55|0;
  for(let x=b1+60;x<W*.8;){if(Math.abs(x-PX)<230){x=PX+230;continue;}
    const r=R();if(r<.55){const w=24+R()*40|0,h=70+R()*170|0;spire(x+w/2|0,w,h,hm[x+(w>>1)]);x+=w+10+(R()*20|0);}
    else if(r<.8){const w=50+R()*60|0,h=24+R()*20|0,gy=hm[x];fill(x,gy-h,x+w,gy,GOLD);tint(x,gy-h,x+w,gy,190,146,58,12);bgRect(x+3,gy-h+5,x+w-3,gy-1,rgb(90,64,30));fill(x+3,gy-h+5,x+w-3,gy-1,EMPTY);for(let k=x;k<x+w;k++){const hh=Math.round(10*Math.sin((k-x)/w*Math.PI));for(let y=0;y<hh;y++)sxy(k,gy-h-1-y,GOLD);}x+=w+12;}
    else{tree(x+6,hm[x+6]);x+=26;}}
  palace(PX,Math.min(hm[PX-180],hm[PX+180]));
  // golden statues of the old kings along the river, a river that runs to the rim and pours off it
  for(const sx of [W*.82|0,W*.86|0]){const gy=hm[sx];fill(sx-5,gy-60,sx+5,gy,GOLD);disc(sx,gy-66,6,GOLD);fill(sx-14,gy-50,sx+14,gy-44,GOLD);fill(sx+12,gy-90,sx+15,gy-44,STEEL);for(let y=gy-90;y<gy;y++)for(let x=sx-14;x<=sx+15;x++)if(t[y*W+x]===GOLD)col[y*W+x]=goldCol(x,y,.9);}
  for(let x=W*.8|0;x<W;x++){const h=hm[x];for(let y=h;y<h+5;y++)setc(y*W+x,y<h+1?EMPTY:WATER);fill(x,h+5,x+1,h+8,STONE);}
  ASG.falls=hm[W-2];
  for(let x=W*.8|0;x<W-30;x+=24+R()*30|0)if(R()<.5)tree(x,hm[x]);
  for(let x=b1+20;x<W*.8;x+=60)if(t[(hm[x]-1)*W+x]===0&&R()<.4)for(let k=1;k<4;k++)sxy(x,hm[x]-k,GRASS);
  ST.SPAWNX=b1+80;
}
export function ambAsgard(){ // the rim waterfall into the void and drifting motes of light
  const y=ASG.falls;for(let k=0;k<3;k++)spawn(W-2-R()*3,y+R()*4,.6+R()*.6,R(),R()<.6?rgb(90,150,240):rgb(210,230,255),120,0,0,1);
  for(let k=0;k<6;k++){const x=W-4-R()*4|0,i=(y+2)*W+x;if(t[i]===0)setc(i,WATER);}
  for(let k=0;k<4;k++){const X=W-1-(R()*3|0),i=(H-8-(R()*30|0))*W+X;if(t[i]===WATER)setc(i,EMPTY);}
  for(let x=ASG.b0+2;x<ASG.b1-2;x+=3){const i=(H-7)*W+x;if(t[i]===WATER)setc(i,EMPTY);} // the void swallows what falls off the bridge
  if(ST.frame%3===0)spawn(ST.camX+R()*VW,ST.camY+R()*200,(R()-.5)*.2,-.15,R()<.5?rgb(255,230,160):rgb(180,200,255),90,0,1,0,0);
}
