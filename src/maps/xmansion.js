import './nyc2099.js'; // evaluation order: runs after maps/nyc2099.js
import { ST } from '../state.js';
import { CONC, DIRT, EMPTY, GLASS, GRASS, LEAF, NEON, OBSID, R, STEEL, STONE, WATER, WOOD, cl, rgb } from '../world/materials.js';
import { H, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { birch, pine, tree } from './forest.js';

// ---- X-Mansion: the Xavier Institute's courtyard. The mansion itself towers in the backdrop.
export function genXMansion(){
  clearAll();
  const GY=356,s=R()*100,B=252; // B: lawn line of the mansion in far-layer rows (sits just above the courtyard on screen)
  makeFar([38,50,104],[246,170,118],()=>{
    // the mansion is drawn into its own buffer first, then pasted bigger and lower with forced perspective
    const mc=new Uint32Array(ST.FW*H),mk=new Uint8Array(ST.FW*H);
    const P=(x,y,c)=>{x|=0;y|=0;if(x<0||x>=ST.FW||y<0||y>=H)return;mc[y*ST.FW+x]=c;mk[y*ST.FW+x]=1;};
    const Rf=(x0,y0,x1,y1,c,v=6)=>{for(let y=y0|0;y<y1;y++)for(let x=x0|0;x<x1;x++){if(x<0||x>=ST.FW||y<0||y>=H)continue;const n=(R()*2-1)*v;mc[y*ST.FW+x]=rgb(cl(c[0]+n),cl(c[1]+n),cl(c[2]+n));mk[y*ST.FW+x]=1;}};
    // distant tree lines and lawns either side of the mansion
    for(let x=0;x<ST.FW;x++){const hh=B-18-Math.abs(Math.sin(x*.07+s))*16-Math.sin(x*.023+s)*10|0;for(let y=hh;y<H;y++)ST.far[y*ST.FW+x]=rgb(34+(y-hh)/8,62+(y-hh)/10,52+(y-hh)/12);}
    for(let x=0;x<ST.FW;x++)for(let y=B;y<H;y++)ST.far[y*ST.FW+x]=rgb(62-(y-B)/7,98-(y-B)/6,56-(y-B)/8);
    const cx=ST.FW/2|0;
    const stone=(x,base)=>[base[0]-(x-cx)*.05,base[1]-(x-cx)*.05,base[2]-(x-cx)*.04];
    // wings
    for(const [x0,x1] of [[cx-182,cx-130],[cx+130,cx+182]]){for(let x=x0;x<x1;x++)Rf(x,B-58,x+1,B,stone(x,[162,152,138]),5);
      for(let y=B-72;y<B-58;y++){const ins=(y-(B-72))*.0;Rf(x0-2+ins,y,x1+2-ins,y+1,[58,62,82],5);} // wing roofs
      for(let wx=x0+6;wx<x1-6;wx+=12)for(const wy of [B-50,B-28])win(wx,wy,6,11);}
    // main block
    for(let x=cx-130;x<cx+130;x++)Rf(x,B-92,x+1,B,stone(x,[180,170,154]),5);
    for(let k=0;k<3;k++)Rf(cx-130,B-92+k*30,cx+130,B-90+k*30,[150,140,126],3); // string courses
    // mansard roof with dormers and chimneys
    for(let y=B-112;y<B-92;y++){const ins=(B-92-y)*.9;Rf(cx-132+ins,y,cx+132-ins,y+1,[56,60,82],5);}
    for(let x=cx-120;x<=cx+110;x+=34){if(Math.abs(x-cx)<40)continue;for(let y=0;y<10;y++)Rf(x+y*.5,B-110+y,x+11-y*.5,B-109+y,[150,140,126],3);Rf(x+3,B-104,x+8,B-96,[250,206,128],8);}
    for(const x of [cx-110,cx-70,cx+62,cx+102])Rf(x,B-126,x+7,B-108,[128,72,62],6);
    // corner towers with conical spires
    for(const tx of [cx-150,cx+122]){Rf(tx,B-118,tx+28,B,stone(tx,[172,162,146]),5);
      for(let y=0;y<34;y++){const w=14*(1-y/34);Rf(tx+14-w-1,B-118-y,tx+14+w+1,B-117-y,[52,56,78],4);}
      Rf(tx+13,B-158,tx+15,B-150,[200,190,150],3);
      for(const wy of [B-104,B-78,B-50])win(tx+10,wy,7,12);}
    // centre pavilion: pediment with the X emblem, portico, doors, steps
    for(let y=0;y<34;y++){const w=48*(y/34);Rf(cx-w,B-126+y,cx+w,B-125+y,y<2?[60,64,86]:[190,180,164],4);}
    for(let a=0;a<6.283;a+=.02)for(const r of [9,10,11])P(cx+Math.cos(a)*r,B-108+Math.sin(a)*r,rgb(206,40,40));
    for(let k=-6;k<=6;k++){for(const o of [-1,0,1]){P(cx+k+o,B-108+k,rgb(24,22,28));P(cx+k+o,B-108-k,rgb(24,22,28));}}
    Rf(cx-46,B-92,cx+46,B-86,[214,208,196],3);
    for(const kx of [-40,-22,14,32])Rf(cx+kx,B-86,cx+kx+7,B-10,[234,230,220],4);
    for(let y=B-40;y<B-10;y++){const a=y<B-34?Math.sqrt(36-(y-(B-34))**2):10;Rf(cx-a,y,cx+a,y+1,[78,48,32],5);}
    for(let k=0;k<4;k++)Rf(cx-52-k*6,B-10+k*3,cx+52+k*6,B-7+k*3,[200,194,180],4);
    for(const wy of [B-82,B-56])for(let wx=cx-122;wx<cx+122;wx+=16){if(Math.abs(wx+3-cx)<52)continue;win(wx,wy,7,13);}
    for(let wx=cx-122;wx<cx+122;wx+=16){if(Math.abs(wx+3-cx)<56)continue;win(wx,B-30,7,13);}
    // ivy on the lower walls
    for(let k=0;k<9;k++){const ix=cx-180+R()*360|0,r=6+R()*8;for(let n=0;n<160;n++){const a=R()*6.283,d=Math.sqrt(R())*r,x=ix+Math.cos(a)*d|0,y=B-1-Math.abs(Math.sin(a))*d*2.2|0;if(mk[y*ST.FW+x])P(x,y,rgb(34+R()*18,74+R()*26,38));}}
    function win(x,y,w,h){Rf(x-1,y-1,x+w+1,y+h+1,[214,206,190],3);const lit=R()<.7;
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){if(yy<2&&(xx===0||xx===w-1))continue;const mull=xx===(w>>1)||yy===(h>>1)+1;P(x+xx,y+yy,mull?rgb(70,60,52):lit?rgb(250,206,128-yy*3):rgb(44,52,74));}}
    // gentle forced perspective: a bit taller, the base slightly wider and lower so the house sits right behind the courtyard
    const B1=B+8,KV=1.18;
    for(let y=0;y<H;y++){const sy=Math.round(B+(y-B1)/KV);if(sy<0||sy>=H)continue;const kh=1.1+.14*Math.max(0,Math.min(1,(sy-(B-160))/160));
      for(let x=0;x<ST.FW;x++){const sx=Math.round(cx+(x-cx)/kh);if(sx<0||sx>=ST.FW)continue;const si=sy*ST.FW+sx;if(mk[si]){ST.far[y*ST.FW+x]=mc[si];ST.farKeep[y*ST.FW+x]=1;}}}
    // the gravel drive and hedge rows run from the door toward the viewer, filling the lawn
    // manicured grounds fill everything below the house (kept vivid, so flying up shows lawn and gardens, never bare earth)
    for(let y=B1;y<H;y++){const d=y-B1,hw=18+d*1.1,stripe=((d>>3)&1)?6:-4;
      for(let x=0;x<ST.FW;x++){const i=y*ST.FW+x;if(ST.farKeep[i]&&d<2)continue;const ax=Math.abs(x-cx),n=(R()*2-1)*5,hedge=d%22<5&&ax>hw+6;
        ST.far[i]=ax<hw?rgb(cl(180+n),cl(168+n),cl(140+n)):ax<hw+3?rgb(cl(40+n),cl(92+n),cl(44+n)):hedge?rgb(cl(34+n),cl(84+n),cl(40+n)):rgb(cl(74+stripe+n),cl(126+stripe+n),cl(62+stripe+n));ST.farKeep[i]=1;}}
    for(const side of [-1,1])for(let k=0;k<5;k++){const tx=cx+side*(220+k*36),ty=B1+4+k*3,r=10+k*3; // trees framing the house
      for(let y=-r*2;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x/(r*r)+(y<0?y*y/(4*r*r):y*y/(r*r))>1)continue;const X=tx+x,Y=ty+y;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;const n=R()*14;ST.far[Y*ST.FW+X]=rgb(26+n,58+n,34+n/2);ST.farKeep[Y*ST.FW+X]=1;}}
  });
  const hm=[];
  for(let x=0;x<W;x++){const out=x<380?(380-x)/380:x>1220?(x-1220)/380:0;hm[x]=GY-Math.round(out*out*28+Math.sin(x*.02+s)*3*out);}
  for(let x=0;x<W;x++){
    const h=hm[x],st=h+42+Math.sin(x*.05+s)*6|0;
    for(let y=h;y<H;y++)setc(y*W+x,y<h+2?GRASS:y<st?DIRT:y>=H-4?OBSID:STONE);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,28-(y-h)/16,24-(y-h)/18);
  }
  bgD.set(bg);
  for(let y=0;y<H-8;y++)for(let x=0;x<W;x++){if(y>hm[x]+130&&noise2(x,y,s)>.4)setc(y*W+x,EMPTY);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // courtyard paving
  for(let x=380;x<1220;x++)for(let y=GY;y<GY+3;y++){setc(y*W+x,CONC);const j=(x%10===0)||y===GY+2;col[y*W+x]=j?rgb(150,140,122):rgb(196+R()*10,184+R()*10,160+R()*8);}
  // the fountain, with a glowing X on its column
  { const fx=800;fill(fx-32,GY-7,fx+32,GY,STONE);tint(fx-32,GY-7,fx+32,GY,200,196,186,6);fill(fx-28,GY-6,fx+28,GY-1,WATER);
    fill(fx-3,GY-24,fx+3,GY-6,STONE);tint(fx-3,GY-24,fx+3,GY-6,210,206,196,5);fill(fx-11,GY-27,fx+11,GY-24,STONE);tint(fx-11,GY-27,fx+11,GY-24,200,196,186,5);fill(fx-9,GY-26,fx+9,GY-25,WATER);
    for(let k=-3;k<=3;k++){for(const [x,y] of [[fx+k,GY-17+k],[fx+k,GY-17-k]]){const i=y*W+x;t[i]=NEON;col[i]=rgb(255,70,60);}} }
  // trimmed hedges
  for(const [a,b] of [[430,520],[560,650],[950,1040],[1080,1170]]){fill(a,GY-8,b,GY,LEAF);for(let x=a;x<b;x++)for(let y=GY-8;y<GY;y++){const i=y*W+x;if(t[i]===LEAF)col[i]=rgb(30+R()*20,96+R()*30,40+R()*14);}fill(a,GY-9,a+2,GY-8,EMPTY);fill(b-2,GY-9,b,GY-8,EMPTY);}
  // lamp posts
  for(const x of [410,700,900,1190]){fill(x,GY-20,x+1,GY,STEEL);tint(x,GY-20,x+1,GY,40,40,48,4);fill(x-1,GY-22,x+2,GY-20,NEON);tint(x-1,GY-22,x+2,GY-20,255,220,150,10);}
  // stone balustrade posts at the courtyard ends
  for(const x of [372,1214]){fill(x,GY-16,x+8,GY,STONE);tint(x,GY-16,x+8,GY,196,190,176,6);fill(x-1,GY-18,x+9,GY-16,STONE);tint(x-1,GY-18,x+9,GY-16,170,164,150,4);}
  // gazebo
  { const gx=200,gy=hm[gx];fill(gx-22,gy-2,gx+22,gy,WOOD);for(const px of [gx-20,gx-7,gx+6,gx+19])fill(px,gy-20,px+2,gy-2,WOOD);
    for(let r=0;r<12;r++)fill(gx-26+r*2,gy-21-r,gx+26-r*2,gy-20-r,WOOD);tint(gx-26,gy-33,gx+26,gy-20,236,232,224,8); }
  // basketball court
  { const bx=1290;fill(bx,hm[bx]-1,bx+170,hm[bx]+1,CONC);tint(bx,hm[bx]-1,bx+170,hm[bx]+1,176,96,60,8);for(let x=bx;x<bx+170;x+=42)tint(x,hm[bx]-1,x+1,hm[bx],240,240,240,0);
    const hx=bx+150,hy=hm[hx]-1;fill(hx,hy-34,hx+2,hy,STEEL);fill(hx-6,hy-36,hx+2,hy-26,GLASS);fill(hx-11,hy-28,hx-6,hy-27,STEEL);tint(hx-11,hy-28,hx-6,hy-27,230,90,40,0); }
  // trees on the lawns, wrought-iron fence and gate pillars at the estate edges
  for(let x=24;x<W-24;){if(x<360||x>1240){if(!(x>176&&x<228)&&!(x>1280&&x<1470)){const r=R();r<.35?pine(x,hm[x]):r<.8?tree(x,hm[x]):birch(x,hm[x]);}}x+=14+R()*18|0;}
  for(const [a,b] of [[0,40],[W-40,W]]){for(let x=a;x<b;x+=3)fill(x,hm[x]-16,x+1,hm[x],STEEL);fill(a,hm[a]-14,b,hm[a]-13,STEEL);fill(a,hm[a]-5,b,hm[a]-4,STEEL);tint(a,hm[a]-18,b,hm[a],30,30,36,4);}
  // beneath the courtyard: the Blackbird hangar
  { const x0=560,x1=1040,y0=GY+60,y1=GY+112;fill(x0-3,y0-3,x1+3,y1+3,STEEL);tint(x0-3,y0-3,x1+3,y1+3,70,76,88,6);fill(x0,y0,x1,y1,EMPTY);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)bg[y*W+x]=((x>>3)+(y>>3))%2&&y>y1-4?rgb(200,170,40):(y%16===0?rgb(70,84,108):rgb(48,58,78));
    for(let x=x0+20;x<x1;x+=60)bgRect(x,y0+2,x+10,y0+4,rgb(230,240,255));
    blackbird(700,y1); }
  ST.SPAWNX=600;
}
function blackbird(x,fy){ // the X-Men's jet, parked on its gear
  const cy=fy-12;
  for(let k=0;k<160;k++){const th=k<24?k*.22:k<120?5:Math.max(1,5-(k-120)*.1);for(let y=cy-th|0;y<=cy+th;y++)sxy(x+k,y,STEEL);}
  for(let k=60;k<118;k++){const w=(k-60)*.12;fill(x+k,cy+2,x+k+1,cy+3+w,STEEL);}
  for(let k=126;k<158;k++){const h=(k-126)*.55;fill(x+k,cy-5-h,x+k+1,cy-4,STEEL);}
  tint(x,cy-24,x+160,cy+12,30,32,40,6);
  fill(x+14,cy-5,x+30,cy-3,GLASS);tint(x+14,cy-5,x+30,cy-3,120,170,210,10);
  for(const k of [34,96,108])fill(x+k,cy+5,x+k+1,fy,STEEL);
  tint(x+150,cy-14,x+156,cy-11,220,40,40,0);
}
