import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { ST } from '../state.js';
import { ACID, ASH, CONC, DIRT, EMPTY, GLASS, GRASS, LAVA, OBSID, OIL, PROPANE, R, STEEL, STONE, WATER, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, bgD, setc, sxy, t } from '../world/grid.js';
import { tree } from './forest.js';

export function cityUnder(GY){
  // ground: asphalt, dirt, subway, bedrock
  fill(0,GY,W,GY+4,CONC); tint(0,GY,W,GY+4,45,45,50,5);
  for(let x=0;x<W;x+=14){fill(x,GY,x+6,GY+1,CONC);tint(x,GY,x+6,GY+1,200,190,90,10);}
  fill(0,GY+4,W,GY+20,DIRT); fill(0,GY+20,W,H,STONE);
  bgRect(0,GY+4,W,H,rgb(30,22,18));
  // subway tunnel with rails + a train
  fill(0,GY+8,W,GY+9,CONC); fill(0,GY+19,W,GY+21,CONC); fill(0,GY+9,W,GY+19,EMPTY); bgRect(0,GY+9,W,GY+19,rgb(26,26,32));
  for(let x=0;x<W;x+=40)fill(x,GY+9,x+3,GY+19,CONC);
  fill(0,GY+18,W,GY+19,STEEL);
  { const tx=300+R()*800|0; for(let c=0;c<3;c++){const x=tx+c*44; fill(x,GY+11,x+40,GY+18,STEEL); tint(x,GY+11,x+40,GY+18,170,175,185,6); for(let w=x+3;w<x+38;w+=7)fill(w,GY+12,w+4,GY+14,GLASS);} }
  // sewer with water under the tunnel
  fill(0,GY+27,W,GY+28,STEEL); fill(0,GY+28,W,GY+35,EMPTY); fill(0,GY+31,W,GY+35,WATER); fill(0,GY+35,W,GY+36,STEEL);
  bgRect(0,GY+28,W,GY+35,rgb(18,22,24));
  for(let x=20;x<W;x+=64)fill(x,GY+28,x+3,GY+35,CONC);
  // deep underground: clay, caverns, a buried lake, magma at the bottom, obsidian floor
  const s0=R()*100;
  fill(0,GY+36,W,GY+70,DIRT); tint(0,GY+36,W,GY+70,120,80,60,12);
  for(let y=GY+80;y<H-6;y++)for(let x=0;x<W;x++)if(noise2(x,y,s0)>.38)setc(y*W+x,EMPTY);
  for(let y=GY+36;y<H;y++)for(let x=0;x<W;x++)bg[y*W+x]=rgb(30-(y-GY)/20,22-(y-GY)/22,18-(y-GY)/24);
  { const lx=200+R()*1200|0; for(let y=GY+100;y<GY+150;y++)for(let x=lx-90;x<lx+90;x++)if(x>=0&&x<W&&((x-lx)/90)**2+((y-GY-125)/25)**2<1)setc(y*W+x,y>GY+118?WATER:EMPTY); }
  for(let y=H-34;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0||y>H-20&&R()<.8)setc(i,y>H-24?LAVA:EMPTY);}
  fill(0,H-4,W,H,OBSID);
  for(let y=H-60;y>GY+80;y--)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0&&t[i+W]===STONE&&R()<.01)disc(x,y-2,3,R()<.15?ACID:WATER);}
  SURF.fill(GY+40); ST.PIN2=[GY,GY+8]; ST.streetY=GY;
  bgD.set(bg);
}
import { cathedral, construction, harbor, plaza, stadium, tenements, trainyard } from './districts.js';
export function genCity(){
  clearAll();
  const GY=330+(ST.GYO|0), GB=143+(GY-143)*.5|0;
  makeFar([10,8,26],[90,46,64],()=>{
    // stars + moon + two skyline layers
    for(let k=0;k<500;k++){const x=R()*ST.FW|0,y=R()*(GB-60)|0;ST.far[y*ST.FW+x]=rgb(200,200,220);}
    for(let y=-14;y<=14;y++)for(let x=-14;x<=14;x++)if(x*x+y*y<196)ST.far[(60+y)*ST.FW+120+x]=rgb(220,230,200);
    for(const [base,c,lit] of [[GB-20,rgb(30,24,50),.15],[GB+15,rgb(22,18,38),.35]]){
      for(let x=0;x<ST.FW;){const w=8+R()*26|0,h=30+R()*160|0;for(let y=base-h;y<H;y++)for(let xx=x;xx<x+w&&xx<ST.FW;xx++){const on=(xx%4===1&&y%6===2&&R()<lit);ST.far[y*ST.FW+xx]=on?rgb(150,130,70):c;}x+=w+1+(R()*3|0);}
    }
  });
  cityUnder(GY);
  // districts left→right
  let x=6;
  const zones=[],end=W>4000?W-540:W-40; // long maps end in the harbour
  const once=(id,at)=>!zones.includes(id)&&x>W*at; // the big districts, each once, spread along the map
  while(x<end){
    const r=R();
    if(once('stadium',.3)&&r<.2){ zones.push('stadium'); x=stadium(x,GY); }
    else if(once('site',.15)&&r<.2){ zones.push('site'); x=construction(x,GY); }
    else if(once('yard',.5)&&r<.2&&x<end-320){ zones.push('yard'); x=trainyard(x,GY); }
    else if(once('church',.62)&&r<.2){ zones.push('church'); x=cathedral(x,GY); }
    else if(once('plaza',.75)&&r<.2){ zones.push('plaza'); x=plaza(x,GY); }
    else if(r<.07){ x=tenements(x,GY); }
    else if(r<.09&&!zones.includes('park')){ zones.push('park'); x=park(x,GY); }
    else if(r<.17&&!zones.includes('gas')){ zones.push('gas'); x=gasStation(x,GY); }
    else if(r<.25&&!zones.includes('bridge')&&x<W-320){ zones.push('bridge'); x=bridge(x,GY); }
    else if(r<.33&&!zones.includes('crane')){ zones.push('crane'); x=crane(x,GY); }
    else if(r<.5){ x=houseRow(x,GY); }
    else {
      const w=40+R()*50|0, h=70+R()*(r>.85?(GY-80):170)|0, x1=Math.min(end,x+w);
      R()<.3?glassTower(x,x1,Math.max(40,GY-h),GY):building(x,x1,Math.max(40,GY-h),GY);
      x=x1;
    }
    const gap=10+R()*24|0;
    if(gap>22&&x+gap<W)car(x+3,GY);
    else if(x+gap<W){const r2=R();if(r2<.35){fill(x+2,GY-7,x+12,GY,STEEL);tint(x+2,GY-7,x+12,GY,40,90,50,8);fill(x+3,GY-6,x+11,GY-1,ASH);}else if(r2<.7){for(let k=0;k<1+(R()*3|0);k++){const cy=GY-6*(k+1);fill(x+2,cy,x+8,cy+6,WOOD);tint(x+2,cy,x+8,cy+6,160,120,70,12);}}else{fill(x+4,GY-30,x+5,GY,STEEL);fill(x+4,GY-30,x+9,GY-29,STEEL);fill(x+8,GY-29,x+10,GY-27,GLASS);}}
    x+=gap;
  }
  if(W>4000)harbor(Math.max(x,end),GY);
}
export const BLD=[];
export function building(x0,x1,top,GY){
  const fh=16;BLD.push([x0,x1,top]);
  const WCS=[[150,148,142],[140,90,70],[170,160,130],[110,115,125],[86,128,140],[176,96,72],[196,160,84],[120,96,140],[132,160,138],[188,120,110]],wc=WCS[R()*WCS.length|0];
  for(let y=top;y<GY;y++){
    const fy=(y-top)%fh, win=fy>=5&&fy<=12;
    for(const xx of [x0,x0+1,x0+2,x1-3,x1-2,x1-1]){ const isWin=win&&(xx!==x0&&xx!==x1-1); setc(y*W+xx,isWin?GLASS:CONC); if(!isWin)tint(xx,y,xx+1,y+1,wc[0],wc[1],wc[2],8);}
  }
  for(let y=top;y<GY;y+=fh){fill(x0,y,x1,y+3,CONC);tint(x0,y+2,x1,y+3,110,108,104,6);}
  // interior partition walls with doorways, plus a stairwell core
  for(let px=x0+12+(R()*8|0);px<x1-10;px+=20+(R()*10|0))for(let y=top+3;y<GY;y++){if((y-top)%fh>=fh-8&&(y-top)%fh<fh)continue;fill(px,y,px+2,y+1,CONC);tint(px,y,px+2,y+1,wc[0]-20,wc[1]-20,wc[2]-20,6);}
  for(let cx=x0;cx<x1;cx+=18)fill(cx,top,cx+1,GY,STEEL);
  fill(x1-1,top,x1,GY,STEEL);
  // interior backdrop: wallpaper, lit windows, doors
  const wall=[rgb(52,42,56),rgb(40,48,58),rgb(58,50,40),rgb(36,54,52),rgb(62,40,44)][R()*5|0];
  for(let y=top+2;y<GY;y++)for(let xx=x0+3;xx<x1-3;xx++){const i=y*W+xx,fy=(y-top)%fh;
    bg[i]=(fy>4&&fy<12&&(xx%11)<6)?(R()<.6?rgb(220,200,110):rgb(70,80,100)):wall;}
  for(let y=top+fh;y<=GY;y+=fh){
    for(let k=0;k<2+(R()*2|0);k++){
      const fx=x0+5+R()*(x1-x0-16)|0, fy=y-1;
      const r=R();
      if(r<.25){fill(fx,fy-4,fx+7,fy-3,WOOD);fill(fx,fy-3,fx+1,fy+1,WOOD);fill(fx+6,fy-3,fx+7,fy+1,WOOD);}
      else if(r<.4){fill(fx,fy-9,fx+4,fy+1,STEEL);tint(fx,fy-9,fx+4,fy+1,210,215,220,6);fill(fx,fy-5,fx+4,fy-4,STEEL);} // fridge
      else if(r<.45){fill(fx,fy-12,fx+8,fy+1,WOOD);tint(fx,fy-12,fx+8,fy+1,140,95,50,10);for(let s2=fy-10;s2<fy;s2+=4)fill(fx+1,s2,fx+7,s2+1,EMPTY);} // bookcase
      else if(r<.6){fill(fx,fy-5,fx+4,fy+1,STEEL);fill(fx+1,fy-4,fx+3,fy+1,OIL);}
      else if(r<.75){fill(fx,fy-9,fx+5,fy+1,WOOD);tint(fx,fy-9,fx+5,fy+1,90,60,35,10);for(let s=fy-7;s<fy;s+=3)fill(fx,s,fx+5,s+1,WOOD);}
      else {fill(fx,fy-5,fx+6,fy+1,WOOD);tint(fx,fy-5,fx+6,fy+1,150,40,40,15);}
    }
  }
  fill(x0,top-4,x0+3,top,CONC);fill(x1-3,top-4,x1,top,CONC); // parapets
  if(R()<.35){const bx=x0+6+R()*(x1-x0-30)|0;fill(bx,top-16,bx+22,top-6,WOOD);tint(bx,top-16,bx+22,top-6,200,60,50,20);fill(bx+3,top-6,bx+4,top,STEEL);fill(bx+18,top-6,bx+19,top,STEEL);} // billboard
  if(R()<.6){const tx=x0+4+R()*(x1-x0-16)|0;fill(tx,top-8,tx+10,top,STEEL);fill(tx+1,top-7,tx+9,top,WATER);fill(tx+1,top,tx+2,top,STEEL);}
  fill(x1-6,top-14,x1-5,top,STEEL);
}
export function glassTower(x0,x1,top,GY){
  BLD.push([x0,x1,top,'glass']);
  for(let y=top;y<GY;y++)for(let xx=x0;xx<x1;xx++){
    const edge=xx===x0||xx===x1-1, floor=(y-top)%12<3, mull=(xx-x0)%8===0||(xx-x0)%8===1;
    if(edge||mull)setc(y*W+xx,STEEL); else if(floor)setc(y*W+xx,CONC); else if(xx<x0+2||xx>x1-3)setc(y*W+xx,GLASS);
  }
  for(let y=top;y<GY;y++)for(let xx=x0+2;xx<x1-2;xx++){const i=y*W+xx;if(t[i]===0)bg[i]=((y-top)%12>3&&R()<.7)?rgb(70,110,130):rgb(30,46,60);}
  for(let y=top+12;y<=GY;y+=12){const fx=x0+4+R()*(x1-x0-12)|0;fill(fx,y-4,fx+6,y,WOOD);}
  // spire
  const mx=(x0+x1)>>1; fill(mx-1,top-30,mx+1,top,STEEL); fill(mx-4,top-4,mx+4,top,STEEL);
}
function houseRow(x,GY){
  for(let k=0;k<2+(R()*3|0);k++){
    const w=26+R()*12|0, h=26+R()*20|0, top=GY-h, x1=x+w;
    const wc=[[150,80,60],[200,190,160],[120,140,160],[180,150,90]][R()*4|0];
    fill(x,top,x+3,GY,WOOD); fill(x1-3,top,x1,GY,WOOD); fill(x,top,x1,top+3,WOOD); fill(x,GY-h/2|0,x1,(GY-h/2|0)+3,WOOD);
    fill(x+8,GY-h/2-6|0,x+14,GY-h/2|0,WOOD); fill(x1-12,GY-6,x1-5,GY,WOOD); // furniture
    tint(x,top,x1,GY,wc[0],wc[1],wc[2],10);
    fill(x+1,top+5,x+2,top+10,GLASS); fill(x1-2,top+5,x1-1,top+10,GLASS);
    bgRect(x+2,top+2,x1-2,GY,rgb(60,46,40));
    for(let r=0;r<w/2+2;r++)fill(x-2+r,top-r*.6,x1+2-r,top-r*.6+1,WOOD),tint(x-2+r,top-r*.6,x1+2-r,top-r*.6+1,110,40,30,10);
    fill(x+4,GY-5,x+10,GY-4,WOOD);
    x=x1+3;
  }
  return x;
}
export function park(x,GY){
  const w=150; fill(x,GY-2,x+w,GY,GRASS); fill(x,GY-1,x+w,GY,DIRT);
  // pond carved into street
  fill(x+50,GY,x+100,GY+6,EMPTY); fill(x+50,GY+1,x+100,GY+6,WATER); fill(x+49,GY+6,x+101,GY+7,CONC);
  for(let k=x+8;k<x+w-6;k+=22)if(k<x+46||k>x+104)tree(k,GY-2);
  fill(x+20,GY-6,x+34,GY-5,WOOD);fill(x+21,GY-5,x+22,GY-2,WOOD);fill(x+32,GY-5,x+33,GY-2,WOOD);
  return x+w;
}
function gasStation(x,GY){
  const w=110;
  fill(x,GY-36,x+w,GY-33,CONC); for(const px of [x+4,x+50,x+w-6])fill(px,GY-33,px+2,GY,STEEL);
  for(const px of [x+20,x+70]){fill(px,GY-12,px+6,GY,STEEL);tint(px,GY-12,px+6,GY,200,40,40,10);}
  // fuel tanks: steel shells filled with oil and propane
  for(let k=0;k<2;k++){const tx=x+12+k*46;fill(tx-2,GY+3,tx+34,GY+4,STEEL);
    fill(tx-1,GY-28-2,tx+21,GY-28+20+2,STEEL); fill(tx+1,GY-28,tx+19,GY-28+20,k?PROPANE:OIL);}
  return x+w;
}
function bridge(x,GY){
  const w=300, dy=GY-70;
  fill(x,dy,x+w,dy+4,CONC); fill(x,dy+4,x+w,dy+6,STEEL);
  for(let px=x+10;px<x+w;px+=70){fill(px,dy+6,px+6,GY,CONC);}
  // truss
  for(let k=0;k<w;k+=10){for(let s=0;s<10;s++){sxy(x+k+s,dy+6+s,STEEL);sxy(x+k+10-s,dy+6+s,STEEL);}}
  fill(x,dy+16,x+w,dy+17,STEEL);
  fill(x,dy-3,x+w,dy-2,STEEL); for(let k=0;k<w;k+=6)fill(x+k,dy-3,x+k+1,dy,STEEL);
  for(let k=0;k<3;k++)car(x+30+k*90+R()*20|0,dy);
  return x+w;
}
function crane(x,GY){
  const h=230, top=GY-h;
  for(let y=top;y<GY;y++){sxy(x,y,STEEL);sxy(x+8,y,STEEL);if((y-top)%8===0)fill(x,y,x+9,y+1,STEEL);if((y-top)%8<8){sxy(x+((y-top)%8),y,STEEL);}}
  fill(x-30,top,x+110,top+2,STEEL); for(let k=-30;k<110;k+=6)sxy(x+k+(k%12?3:0),top+2,STEEL); fill(x-30,top+3,x+110,top+4,STEEL);
  fill(x-28,top+4,x-14,top+14,CONC);
  fill(x+80,top+4,x+81,top+60,STEEL); fill(x+72,top+60,x+90,top+68,STEEL); fill(x+73,top+61,x+89,top+67,CONC);
  fill(x+20,GY-40,x+60,GY,EMPTY);
  for(let k=0;k<4;k++)fill(x+20,GY-10*k-2,x+60,GY-10*k,CONC);
  for(const px of [x+20,x+40,x+59])fill(px,GY-40,px+1,GY,STEEL);
  return x+110;
}
export function car(x,GY,cc){
  const c=cc||[[180,30,30],[30,80,180],[200,170,40],[220,220,220],[40,140,60]][R()*5|0];
  fill(x,GY-6,x+16,GY-2,STEEL);tint(x,GY-6,x+16,GY-2,c[0],c[1],c[2],8);
  fill(x+3,GY-10,x+12,GY-6,STEEL);tint(x+3,GY-10,x+12,GY-6,c[0],c[1],c[2],8);
  fill(x+4,GY-9,x+7,GY-6,GLASS);fill(x+8,GY-9,x+11,GY-6,GLASS);
  fill(x+12,GY-5,x+14,GY-3,OIL); if(R()<.5)fill(x+1,GY-5,x+3,GY-3,PROPANE);
  for(const wx of [x+2,x+11]){fill(wx,GY-3,wx+4,GY,STEEL);tint(wx,GY-3,wx+4,GY,25,25,25,4);}
}
export function noise2(x,y,s){return(Math.sin(x*.05+s)*Math.cos(y*.07+s*1.3)+Math.sin(x*.11-y*.06+s*2.1)*.6+Math.sin((x+y)*.033+s*.7)*.5+Math.sin(x*.021-s)*Math.sin(y*.043+s)*.5)/2.6;}
