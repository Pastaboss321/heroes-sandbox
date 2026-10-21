// City districts for the long maps (2026-10-21). Each takes the street x and ground y and returns the x
// after it. Used by genCity (and so by Incursion) and genNYC.
import { CONC, DIRT, EMPTY, GLASS, GRASS, NEON, OIL, PROPANE, R, STEEL, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, col, setc, sxy, t } from '../world/grid.js';
import { bgRect, fill, tint } from './gen.js';
import { BLD, building, car } from './city.js';
import { sign } from './landmarks.js';
import { tree } from './forest.js';

const C=rgb;
const paint=(x0,y0,x1,y1,c)=>{for(let y=Math.max(0,y0|0);y<Math.min(H,y1|0);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x1|0);x++){const i=y*W+x;if(t[i])col[i]=typeof c==='function'?c(x,y):c;}};
// stacked shipping containers, a cargo ship moored at a pier, a gantry crane
export function harbor(x,GY){const w=Math.min(W-x-4,520);if(w<200)return x+w;
  fill(x+w*.45,GY,x+w,GY+70,EMPTY);fill(x+w*.45,GY+10,x+w,GY+70,WATER);fill(x+w*.45,GY+70,x+w,GY+74,STONE);bgRect(x+w*.45,GY+10,x+w,GY+70,C(18,26,34));
  const px=x+w*.45|0;fill(px-3,GY,px,GY+76,STONE); // quay wall: keeps the harbour out of the subway
  for(let k=px;k<x+w*.7;k++){fill(k,GY-2,k+1,GY,WOOD);}for(let k=px;k<x+w*.7;k+=14)fill(k,GY,k+2,GY+72,WOOD); // pier on piles
  const CC=[[200,70,50],[40,110,170],[220,170,40],[60,140,80],[150,150,160],[170,60,130]];
  for(let s=0;s<3;s++){let cx=x+6;while(cx<x+w*.42-30){const h=1+R()*3|0;for(let k=0;k<h;k++){const c=CC[R()*CC.length|0],y1=GY-k*12,y0=y1-12;fill(cx,y0,cx+28,y1,STEEL);paint(cx,y0,cx+28,y1,(xx,yy)=>((xx-cx)%3===0)?C(c[0]*.7,c[1]*.7,c[2]*.7):C(c[0],c[1],c[2]));}cx+=30+(R()*4|0);}break;}
  // the ship: a steel hull sitting in the water, a bridge tower, a funnel
  const sx=x+w*.5|0,sw=w*.46|0,deck=GY-8;for(let k=0;k<sw;k++){const d=Math.min(1,k/20,(sw-k)/30);for(let y=deck;y<GY+40*d+10;y++)setc(y*W+sx+k,STEEL);}paint(sx,deck,sx+sw,GY+50,(xx,yy)=>yy<deck+3?C(200,200,205):yy<GY+14?C(40,60,110):C(150,40,40));
  for(let y=deck+4;y<GY+30;y++)for(let k=sx+4;k<sx+sw-4;k++){const i=y*W+k;if(t[i]&&(k-sx)%30>4&&(y-deck)%14>3){t[i]=0;bg[i]=C(30,34,44);}}
  fill(sx+sw-60,deck-36,sx+sw-24,deck,STEEL);paint(sx+sw-60,deck-36,sx+sw-24,deck,C(230,230,236));for(let y=deck-32;y<deck-4;y+=8)fill(sx+sw-56,y,sx+sw-28,y+3,GLASS);
  fill(sx+sw-80,deck-30,sx+sw-70,deck,STEEL);paint(sx+sw-80,deck-30,sx+sw-70,deck-24,C(200,50,40));
  for(let c=0;c<4;c++){const c0=CC[R()*CC.length|0],cx=sx+20+c*30;fill(cx,deck-12,cx+28,deck,STEEL);paint(cx,deck-12,cx+28,deck,C(c0[0],c0[1],c0[2]));}
  const gx=px+10;for(let y=GY-120;y<GY;y++){sxy(gx,y,STEEL);sxy(gx+40,y,STEEL);if((y-GY)%10===0)fill(gx,y,gx+41,y+1,STEEL);}fill(gx-20,GY-122,gx+120,GY-118,STEEL);paint(gx-20,GY-122,gx+120,GY-118,C(230,170,40));fill(gx+80,GY-118,gx+81,GY-70,STEEL);
  return x+w;}
// a stadium: stepped concrete stands round a green field, floodlight towers, a scoreboard
export function stadium(x,GY){const w=360;
  for(let k=0;k<w;k++){const d=Math.abs(k-w/2)/(w/2);if(d<.62){fill(x+k,GY-2,x+k+1,GY,GRASS);if((k>>4)&1)paint(x+k,GY-2,x+k+1,GY,C(70,170,60));continue;}
    const tier=((d-.62)/.38*6|0),topY=GY-12-tier*12;for(let y=topY;y<GY;y++){setc(y*W+x+k,CONC);col[y*W+x+k]=(y-topY)%12<2?C(210,60,60):C(150,146,140);}}
  for(let k=w*.2;k<w*.8;k+=40)fill(x+k,GY-3,x+k+1,GY-2,CONC); // yard lines
  for(const fx of [x+6,x+w-8]){for(let y=GY-150;y<GY-80;y++)fill(fx,y,fx+2,y+1,STEEL);fill(fx-8,GY-156,fx+10,GY-150,STEEL);for(let k=-6;k<9;k+=2)setc((GY-152)*W+fx+k,NEON),col[(GY-152)*W+fx+k]=C(255,255,230);}
  const sbx=x+w/2-30|0;fill(sbx,GY-130,sbx+60,GY-100,STEEL);paint(sbx,GY-130,sbx+60,GY-100,C(30,30,36));sign(sbx+6,GY-124,'HOME',[255,200,60],1);sign(sbx+32,GY-124,'00',[255,80,60],2);fill(sbx+28,GY-100,sbx+32,GY-84,STEEL);
  return x+w;}
// a skyscraper going up: a steel skeleton with floors poured on the lower half, scaffold, a tower crane
export function construction(x,GY){const w=90,h=260+R()*80|0,top=GY-h;BLD.push([x,x+w,top,'site']);
  for(let y=top;y<GY;y++){for(const k of [0,1,w-2,w-1,w>>1,(w>>1)+1])setc(y*W+x+k,STEEL);if((y-top)%18===0)fill(x,y,x+w,y+2,STEEL);}
  for(let y=top;y<GY;y+=18)for(let k=0;k<w-1;k+=6){sxy(x+k+((y/18|0)&1?0:3),y+9,STEEL);}
  for(let y=GY-h*.45|0;y<GY;y+=18)fill(x,y,x+w,y+3,CONC);
  for(let y=GY-h*.45|0;y<GY;y++)for(let k=2;k<w-2;k++){const i=y*W+x+k;if(!t[i])bg[i]=C(54,50,46);}
  for(let y=GY-100;y<GY;y+=10){fill(x-8,y,x,y+1,WOOD);sxy(x-8,y+5,STEEL);}for(let y=GY-100;y<GY;y++)sxy(x-8,y,STEEL);
  const cx=x+w+10;for(let y=top-40;y<GY;y++){sxy(cx,y,STEEL);sxy(cx+6,y,STEEL);if((y-top)%6===0)fill(cx,y,cx+7,y+1,STEEL);}fill(cx-60,top-42,cx+90,top-39,STEEL);paint(cx-60,top-42,cx+90,top-39,C(230,180,40));fill(cx+70,top-39,cx+71,top+40,STEEL);fill(cx+64,top+40,cx+78,top+46,STEEL);
  for(let k=0;k<3;k++){const px=x+w+24+k*16;fill(px,GY-6,px+12,GY,WOOD);paint(px,GY-6,px+12,GY,C(170,120,60));}
  return cx+30;}
// a rail yard: tracks on sleepers and a line of boxcars and tankers (some full of oil)
export function trainyard(x,GY){const w=300;for(let k=0;k<w;k++){fill(x+k,GY-1,x+k+1,GY,STEEL);if(k%6===0)fill(x+k,GY,x+k+2,GY+2,WOOD);}
  for(let c=0;c<w/50-1;c++){const cx=x+6+c*48,tank=R()<.4,cc=[[150,60,40],[60,90,130],[120,120,40],[70,70,74]][R()*4|0];
    if(tank){for(let y=GY-20;y<GY-4;y++)for(let k=0;k<44;k++){const e=((k-22)/22)**2+((y-GY+12)/8)**2;if(e<1){setc(y*W+cx+k,e>.7?STEEL:OIL);if(e>.7)col[y*W+cx+k]=C(40,40,44);}}}
    else{fill(cx,GY-24,cx+44,GY-4,STEEL);paint(cx,GY-24,cx+44,GY-4,(xx,yy)=>(xx-cx)%6===0?C(cc[0]*.7,cc[1]*.7,cc[2]*.7):C(cc[0],cc[1],cc[2]));fill(cx+16,GY-20,cx+28,GY-6,EMPTY);bgRect(cx+16,GY-20,cx+28,GY-6,C(30,24,20));}
    for(const wx of [cx+4,cx+36])fill(wx,GY-4,wx+5,GY-1,STEEL);}
  return x+w;}
// a gothic cathedral: stone nave, buttresses, a tall spire, a rose window in coloured glass
export function cathedral(x,GY){const w=150,top=GY-110;BLD.push([x,x+w,top,'church']);
  fill(x,top,x+w,GY,STONE);paint(x,top,x+w,GY,(xx,yy)=>((yy-top)%8===0||((xx-x)+((yy-top)>>3)*4)%14===0)?C(120,114,104):C(170,164,150));
  bgRect(x+6,top+8,x+w-6,GY-1,C(46,40,52));fill(x+6,top+8,x+w-6,GY-1,EMPTY);for(let k=x+14;k<x+w-8;k+=22)fill(k,top+8,k+4,GY-1,STONE);
  for(let k=x+18;k<x+w-12;k+=22){for(let y=top+14;y<top+50;y++)for(let s=0;s<6;s++){const i=y*W+k+4+s;if(!t[i]){setc(i,GLASS);col[i]=[C(200,40,50),C(40,80,200),C(230,180,40),C(60,170,80)][((y>>2)+s)&3];}}}
  for(let y=0;y<w*.5;y++){const hw=(w/2)*(1-y/(w*.5));fill(x+w/2-hw,top-y,x+w/2+hw,top-y+1,STONE);}
  const sx=x+20;for(let y=top-200;y<top;y++){const hw=y<top-150?Math.max(1,(y-(top-200))/50*6|0):10;fill(sx-hw,y,sx+hw,y+1,STONE);}for(let y=top-150;y<top-60;y+=16)fill(sx-4,y,sx+4,y+8,EMPTY);
  const rx=x+w/2|0,ry=top+30;for(let a=0;a<6.283;a+=.01)for(let r=0;r<14;r++){const X=rx+Math.cos(a)*r|0,Y=ry+Math.sin(a)*r|0,i=Y*W+X;if(t[i]===STONE||!t[i]){setc(i,GLASS);col[i]=r<4?C(255,220,120):((a*6/6.283|0)&1)?C(200,40,60):C(50,90,210);}}
  return x+w;}
// a row of tall brick tenements
export function tenements(x,GY){for(let k=0;k<3+(R()*3|0);k++){const w=36+R()*16|0,h=90+R()*120|0;building(x,x+w,GY-h,GY);paint(x,GY-h,x+w,GY,(xx,yy)=>{const i=yy*W+xx;return t[i]===STEEL||t[i]===GLASS?col[i]:((yy%4===0)||((xx+((yy>>2)&1)*3)%6===0))?C(110,56,40):C(160,76,54);});x+=w+2;}return x;}
// a little park with a fountain, trees and benches
export function plaza(x,GY){const w=160;fill(x,GY-2,x+w,GY,GRASS);const cx=x+w/2|0;fill(cx-16,GY-6,cx+16,GY,STONE);fill(cx-14,GY-5,cx+14,GY-1,WATER);fill(cx-1,GY-20,cx+2,GY-6,STONE);fill(cx-6,GY-22,cx+7,GY-20,STONE);
  for(const tx of [x+12,x+36,x+w-40,x+w-16])tree(tx,GY-2);return x+w;}
export { DIRT, PROPANE };
