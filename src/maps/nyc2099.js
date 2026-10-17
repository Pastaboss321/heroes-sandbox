import { genNYC } from './nyc.js';
import { ST } from '../state.js';
import { KIND, NEON, R, S, STEEL, cl, rgb } from '../world/materials.js';
import { H, VW, W, bg, bgD, col, setc, t } from '../world/grid.js';
import { makeFar, tint } from './gen.js';
import { BLD } from './city.js';
import { spawn } from '../world/particles.js';



// ---- NYC 2099: the same island seventy-five years on. Neon-banded towers, skyways strung between them,
// a violet smog sky full of traffic lanes, and steady acid-free rain.
export function genNYC2099(){
  genNYC();
  const GY=340;
  makeFar([8,4,24],[118,26,100],()=>{
    for(let k=0;k<160;k++){const x=R()*ST.FW|0,y=R()*(H*.3)|0;ST.far[y*ST.FW+x]=rgb(200,190,255);}
    for(const [base,c,lit,hmax] of [[190,rgb(42,22,72),.12,250],[230,rgb(28,14,50),.22,220],[270,rgb(16,8,30),.35,190]]){
      for(let x=0;x<ST.FW;){const w=6+R()*18|0,h=50+R()*hmax|0,lc=R()<.5?rgb(80,240,255):rgb(255,80,220),y0=Math.max(0,base-h);
        for(let y=y0;y<H;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++){const on=(xx%3===1&&y%4===2&&R()<lit);ST.far[y*ST.FW+xx]=on?lc:c;}
        for(let xx=x;xx<x+w&&xx<ST.FW;xx++)ST.far[y0*ST.FW+xx]=lc; // neon crown
        if(R()<.3)for(let y=Math.max(0,y0-24);y<y0;y++)ST.far[y*ST.FW+x+(w>>1)]=c;
        x+=w+(R()*3|0);}
    }
    for(const ly of [150,172,200])for(let x=0;x<ST.FW;x++)if(((x>>2)%3)!==0&&R()<.5)ST.far[ly*ST.FW+x]=R()<.5?rgb(255,120,230):rgb(120,240,255);
  });
  const NC=[[60,240,255],[255,60,210],[170,90,255],[255,210,70]];
  const neonAt=(x,y,c)=>{if(x<0||x>=W||y<0||y>=H)return;const i=y*W+x;if(KIND[t[i]]!==S)return;t[i]=NEON;const v=(R()-.5)*30;col[i]=rgb(cl(c[0]+v),cl(c[1]+v),cl(c[2]+v));};
  for(const [x0,x1,top,kind] of BLD){const c=NC[R()*NC.length|0];
    if(kind==='glass'){for(let y=top;y<GY;y++){neonAt(x0,y,c);neonAt(x1-1,y,c);}for(let y=top;y<GY;y+=12)for(let x=x0;x<x1;x++)neonAt(x,y,c);}
    else{for(let y=top;y<GY;y+=16)for(let x=x0;x<x1;x++)neonAt(x,y+2,c);for(let y=top-4;y<top;y++){neonAt(x0,y,c);neonAt(x0+1,y,c);neonAt(x1-1,y,c);neonAt(x1-2,y,c);}}}
  // skyways: steel decks with a neon underglow, strung through the gaps between towers (never through rooms)
  for(const [sy,c] of [[GY-118,NC[0]],[GY-196,NC[1]]])for(let x=430;x<W-6;x++){
    const free=y=>{const i=y*W+x;return t[i]===0&&bg[i]===bgD[i];};
    if(!free(sy)||!free(sy+1)||!free(sy+2))continue;
    for(let y=sy;y<sy+2;y++){setc(y*W+x,STEEL);tint(x,y,x+1,y+1,150,158,178,6);}
    setc((sy+2)*W+x,NEON);col[(sy+2)*W+x]=rgb(c[0],c[1],c[2]);}
  // street-level neon: kerb strip along Manhattan
  for(let x=430;x<W;x++){const i=GY*W+x;if(KIND[t[i]]===S&&t[i-W]===0&&(x>>3)%2===0){t[i]=NEON;col[i]=rgb(...NC[(x>>6)%2]);}}
}

export function amb2099(){ // sky traffic and rain
  if(ST.frame%5===0){const dir=R()<.5?1:-1,y=ST.camY+8+R()*80,x=dir>0?ST.camX-4:ST.camX+VW+4,sp=(2.5+R()*2.5)*dir,c=R()<.5?rgb(120,240,255):rgb(255,120,230);
    for(let k=0;k<3;k++)spawn(x-dir*k*2,y,sp,0,k?rgb(255,90,90):c,200,0,1,0);}
  for(let k=0;k<3;k++)spawn(ST.camX+R()*VW,ST.camY-2,-.4,3.2+R(),rgb(120,140,200),90,0,0,0);
}
