// Iconic New York landmarks for the Marvel Manhattan: Avengers Tower, the Baxter Building, the Sanctum
// Sanctorum and the Daily Bugle. Each takes the street x and ground y and returns the x after it.
import { CONC, EMPTY, GLASS, NEON, STEEL, STONE, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, col, setc, sxy, t } from '../world/grid.js';
import { bgRect, fill, tint } from './gen.js';
import { building, glassTower } from './city.js';

// a 3x5 pixel font for signs
const FONT={A:'010101111101101',B:'110101110101110',D:'110101101101110',E:'111100110100111',G:'011100101101011',I:'111010010010111',L:'100100100100111',U:'101101101101111',Y:'101101010010010',4:'101101111001001',V:'101101101101010',N:'101111111111101',R:'110101110101101',S:'011100010001110',' ':'000000000000000'};
function neon(x,y,c){if(x<0||x>=W||y<0||y>=H)return;const i=y*W+x;setc(i,NEON);col[i]=rgb(c[0],c[1],c[2]);}
export function sign(x,y,text,c,s=1){let cx=x;for(const ch of text){const g=FONT[ch]||FONT[' '];for(let r=0;r<5;r++)for(let k=0;k<3;k++)if(g[r*3+k]==='1')for(let a=0;a<s;a++)for(let b=0;b<s;b++)neon(cx+k*s+a,y+r*s+b,c);cx+=4*s;}return cx-x;}
// Avengers Tower: a glass shaft with steel bands, a crown that flares out, a landing pad, the big A
export function avengersTower(x,GY){
  const w=58,top=GY-330;glassTower(x,x+w,top+70,GY);
  for(let y=top+70;y>top;y--){const f=(top+70-y)/70,hw=(w/2)+f*12|0,cx=x+(w>>1);for(let k=cx-hw;k<=cx+hw;k++){const i=y*W+k;if(k<0||k>=W)continue;setc(i,(y-top)%9<2||Math.abs(k-cx)>hw-2?STEEL:GLASS);if(t[i]===GLASS)col[i]=rgb(150,200,225);}}
  for(let y=top+76;y<GY;y+=26)fill(x,y,x+w,y+2,STEEL);
  const px=x+w+2;fill(px-4,top+40,px+30,top+43,STEEL);tint(px-4,top+40,px+30,top+43,190,196,206,6);fill(px+26,top+36,px+30,top+40,STEEL); // landing pad
  for(let k=px;k<px+26;k+=6)neon(k,top+39,[255,80,60]);
  fill(x+(w>>1)-1,top-40,x+(w>>1)+1,top,STEEL);
  // the A, white neon in a circle
  const ax=x+(w>>1)-10,ay=top+12;for(let a=0;a<6.283;a+=.03)neon(ax+10+Math.cos(a)*13|0,ay+10+Math.sin(a)*13|0,[255,255,255]);sign(ax+2,ay+3,'A',[255,255,255],3);
  return x+w+34;
}
// the Baxter Building: the Fantastic Four's headquarters, a big blue 4 on the roof
export function baxterBuilding(x,GY){
  const w=74,top=GY-270;building(x,x+w,top,GY);
  fill(x+6,top-34,x+w-6,top,CONC);tint(x+6,top-34,x+w-6,top,200,206,214,6);fill(x+10,top-30,x+w-10,top-4,GLASS); // the penthouse labs
  for(let y=top-30;y<top-4;y++)for(let k=x+10;k<x+w-10;k++){const i=y*W+k;if(t[i]===GLASS)col[i]=rgb(120,170,220);}
  sign(x+(w>>1)-6,top-62,'4',[90,170,255],4);fill(x+(w>>1)-1,top-40,x+(w>>1)+1,top-34,STEEL);
  return x+w;
}
// the Sanctum Sanctorum, 177A Bleecker Street: a brownstone with the round Window of Worlds
export function sanctum(x,GY){
  const w=58,top=GY-84;fill(x,top,x+w,GY,STONE);tint(x,top,x+w,GY,120,70,50,10);
  for(let y=top;y<GY;y++)for(let k=x;k<x+w;k++)if((y-top)%6===0)col[y*W+k]=rgb(96,56,40);
  bgRect(x+3,top+4,x+w-3,GY-1,rgb(60,34,40));
  for(const fy of [top+4,top+32,top+58])fill(x+3,fy+3,x+w-3,fy+24,EMPTY);
  fill(x-2,top-4,x+w+2,top,STONE);tint(x-2,top-4,x+w+2,top,90,60,46,6);
  const cx=x+(w>>1),cy=top+22,r=11;for(let y=-r;y<=r;y++)for(let k=-r;k<=r;k++){const d=Math.hypot(k,y);if(d>r)continue;const X=cx+k,Y=cy+y,i=Y*W+X;setc(i,GLASS);col[i]=rgb(210,230,240);}
  for(let a=0;a<6.283;a+=.02){neon(cx+Math.cos(a)*r|0,cy+Math.sin(a)*r|0,[255,220,140]);const s=Math.sin(a*3);neon(cx+Math.cos(a)*r*.5*(1+s*.3)|0,cy+Math.sin(a)*r*.5*(1+s*.3)|0,[255,200,110]);}
  for(let k=0;k<4;k++)fill(x+18-k*2,GY-4+k,x+40+k*2,GY-3+k,STONE); // the front steps
  return x+w;
}
// the Daily Bugle with its rooftop sign
export function dailyBugle(x,GY){
  const w=66,top=GY-210;building(x,x+w,top,GY);
  for(const lx of [x+6,x+w-8])fill(lx,top-30,lx+2,top,STEEL);fill(x+2,top-30,x+w-2,top-28,STEEL);
  sign(x+4,top-26,'DAILY',[255,230,140],2);sign(x+4,top-14,'BUGLE',[255,230,140],2);
  return x+w;
}
