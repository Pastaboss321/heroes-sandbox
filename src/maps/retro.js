// Earth-828 New York: retro-futurist pastel city with the Baxter Building.
import '../ui/hud.js'; // evaluation order: runs after ui/hud.js
import { ST } from '../state.js';
import { CONC, GLASS, KIND, NEON, R, S, STEEL, cl, rgb } from '../world/materials.js';
import { H, VW, W, bg, bgD, col, setc, t } from '../world/grid.js';
import { mix3 } from '../render/look.js';
import { clearAll, disc, fill, makeFar, tint } from './gen.js';
import { BLD, building, car, cityUnder, park } from './city.js';
import { spawn } from '../world/particles.js';

// maps: id -> {name, gen, amb (optional per-tick ambience)}
// ---- Earth-828 New York: a retro-futurist 1960s city in pastels, with the Baxter Building at its heart
const PASTEL=[[244,190,170],[168,214,196],[250,226,156],[176,204,232],[236,176,196],[206,190,232],[248,214,180]];
function pastelize(x0,x1,top,GY,c){
  const dk=[c[0]*.8,c[1]*.78,c[2]*.8];
  for(let y=Math.max(0,top-20);y<GY;y++)for(let x=Math.max(0,x0);x<Math.min(W,x1);x++){const i=y*W+x,m=t[i];
    if(m===CONC){const v=(R()-.5)*12;col[i]=rgb(cl(c[0]+v),cl(c[1]+v),cl(c[2]+v));}else if(m===STEEL)col[i]=rgb(234,228,214);else if(m===GLASS)col[i]=rgb(150,214,220);
    if(bg[i])bg[i]=mix3(bg[i],dk,.72);}
}
function googieTower(x,GY){ // a slim pastel column under a flying-saucer deck, sputnik antenna on top
  const cx=x+30,top=GY-150-R()*90|0,c=PASTEL[R()*PASTEL.length|0];BLD.push([cx-6,cx+6,top]);
  for(let y=top;y<GY;y++)for(let xx=cx-6;xx<cx+6;xx++)setc(y*W+xx,(y-top)%10<3||xx===cx-6||xx===cx+5?CONC:GLASS);
  for(let y=top+4;y<GY;y++)for(let xx=cx-5;xx<cx+5;xx++){const i=y*W+xx;if(t[i]===0)bg[i]=rgb(200,180,170);}
  for(let dy=-7;dy<=5;dy++){const hw=Math.round(30*Math.sqrt(Math.max(0,1-(dy/(dy<0?8:6))**2)));fill(cx-hw,top+dy,cx+hw,top+dy+1,dy<-2?GLASS:CONC);}
  fill(cx-30,top+1,cx+30,top+2,NEON);tint(cx-30,top+1,cx+30,top+2,255,170,150,10);
  fill(cx,top-24,cx+1,top-7,STEEL);disc(cx,top-26,2,NEON);tint(cx-2,top-28,cx+3,top-23,255,120,110,8);
  pastelize(cx-31,cx+31,top-30,GY,c);
  return x+60;
}
function baxter(x0,GY){ // the Baxter Building: the tallest tower on the skyline, the 4 on its crown
  const x1=x0+84,top=60,mx=(x0+x1)>>1;
  building(x0,x1,top,GY);pastelize(x0,x1,top,GY,[226,230,236]);
  for(let y=top;y<GY;y++)for(const xx of [x0+20,x0+21,x1-22,x1-21])if(t[y*W+xx])col[y*W+xx]=rgb(120,170,214); // blue piping up the facade
  // stepped crown with an observation dome and the antenna
  fill(x0+8,top-14,x1-8,top,CONC);tint(x0+8,top-14,x1-8,top,226,230,236,6);fill(x0+20,top-26,x1-20,top-14,CONC);tint(x0+20,top-26,x1-20,top-14,214,220,230,6);
  for(let dy=-12;dy<=0;dy++){const hw=Math.round(16*Math.sqrt(1-(dy/12)**2));fill(mx-hw,top-26+dy,mx+hw,top-25+dy,GLASS);tint(mx-hw,top-26+dy,mx+hw,top-25+dy,170,220,235,8);}
  fill(mx-1,top-60,mx+1,top-38,STEEL);disc(mx,top-62,2,NEON);tint(mx-2,top-64,mx+3,top-59,120,190,255,8);
  // the emblem: a blue neon ring with a white 4, high on the facade
  const ey=top+26,G4=['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'];
  for(let a=0;a<6.283;a+=.04){const X=mx+Math.round(Math.cos(a)*11),Y=ey+Math.round(Math.sin(a)*11);for(const [ox,oy] of [[0,0],[1,0]]){const i=(Y+oy)*W+X+ox;t[i]=NEON;col[i]=rgb(90,160,240);}}
  for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(G4[gy][gx]==='#')for(let s2=0;s2<2;s2++)for(let s3=0;s3<2;s3++){const i=(ey-7+gy*2+s3)*W+mx-5+gx*2+s2;t[i]=NEON;col[i]=rgb(244,248,255);}
  for(let y=ey-12;y<=ey+12;y++)for(let x=mx-12;x<=mx+12;x++){const i=y*W+x;if(t[i]===0&&(x-mx)**2+(y-ey)**2<=110)setc(i,CONC),col[i]=rgb(40,70,120);}
  return x1;
}
export function genRetro(){
  clearAll();
  const GY=340+(ST.GYO|0), GB=143+(GY-143)*.5|0;
  makeFar([138,196,224],[252,214,186],()=>{
    for(let y=-22;y<=22;y++)for(let x=-22;x<=22;x++)if(x*x+y*y<484){const X=(ST.FW*.7|0)+x;ST.far[(70+y)*ST.FW+X]=rgb(255,242,204);}
    for(const [base,c,lit] of [[GB-30,rgb(212,184,208),.08],[GB+10,rgb(178,160,204),.25]]){
      for(let x=0;x<ST.FW;){const w=10+R()*24|0,h=40+R()*170|0,y0=Math.max(4,base-h),round=R()<.5,hw=w/2;
        for(let y=y0;y<H;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++){if(round&&y<y0+hw){const dx=xx-x-hw,dy=y-y0-hw;if(dx*dx+dy*dy>hw*hw)continue;}ST.far[y*ST.FW+xx]=(xx%4===1&&y%6===2&&R()<lit)?rgb(255,238,176):c;}
        if(R()<.3){const ax=x+(w>>1);for(let y=Math.max(0,y0-18);y<y0;y++)ST.far[y*ST.FW+ax]=c;if(y0>=19)ST.far[(y0-19)*ST.FW+ax]=rgb(255,140,120);}
        x+=w+2+(R()*4|0);}
    }
    for(const ly of [GB-60,GB-20])for(let x=0;x<ST.FW;x++)if((x>>3)%5!==0)ST.far[ly*ST.FW+x]=rgb(236,226,214); // distant monorail lines
  });
  cityUnder(GY);
  let x=6,bax=false;
  while(x<W-40){
    if(!bax&&x>660){x=baxter(x+8,GY)+12;bax=true;continue;}
    const r=R();
    if(r<.22)x=googieTower(x,GY);
    else if(r<.36)x=park(x,GY);
    else{const w=36+R()*44|0,h=60+R()*140|0,x1=Math.min(W-2,x+w),top=Math.max(80,GY-h);building(x,x1,top,GY);pastelize(x,x1,top,GY,PASTEL[R()*PASTEL.length|0]);
      fill(x,top-3,x1,top-1,NEON);tint(x,top-3,x1,top-1,...PASTEL[R()*PASTEL.length|0],10);x=x1;} // neon crown line
    const gap=10+R()*24|0;if(gap>22&&x+gap<W)car(x+3,GY);x+=gap;
  }
  // the monorail: a cream deck strung between towers on slim pylons
  const MY=GY-96;
  for(let x2=4;x2<W-4;x2++){const free=y=>{const i=y*W+x2;return t[i]===0&&bg[i]===bgD[i];};if(!free(MY)||!free(MY+1)||!free(MY+2))continue;
    for(let y=MY;y<MY+2;y++){setc(y*W+x2,STEEL);col[y*W+x2]=rgb(238,230,214);}setc((MY+2)*W+x2,NEON);col[(MY+2)*W+x2]=rgb(130,210,200);
    if(x2%90===0)for(let y=MY+3;y<GY;y++){const i=y*W+x2;if(t[i]===0&&bg[i]===bgD[i]){setc(i,STEEL);col[i]=rgb(220,214,200);setc(i+1,STEEL);col[i+1]=rgb(200,194,182);}}}
  for(let x2=0;x2<W;x2++){const i=GY*W+x2;if(KIND[t[i]]===S&&t[i-W]===0&&(x2>>4)%3===0){t[i]=NEON;col[i]=rgb(...PASTEL[(x2>>6)%PASTEL.length]);}} // pastel kerb lights
}
export function ambRetro(){ // bubble-top flying cars cruising the skyline
  if(ST.frame%6===0){const dir=R()<.5?1:-1,y=ST.camY+10+R()*90,x=dir>0?ST.camX-4:ST.camX+VW+4,sp=(1.4+R()*1.6)*dir,c=PASTEL[R()*PASTEL.length|0];
    for(let k=0;k<3;k++)spawn(x-dir*k*2,y,sp,0,k===2?rgb(255,250,240):rgb(c[0],c[1],c[2]),260,0,k===2?1:0,0);}
}
