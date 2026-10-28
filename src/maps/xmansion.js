import './nyc2099.js'; // evaluation order: runs after maps/nyc2099.js
import { ST } from '../state.js';
import { CONC, DIRT, EMPTY, GLASS, GRASS, LEAF, NEON, OBSID, R, STEEL, STONE, WATER, WOOD, cl, rgb } from '../world/materials.js';
import { H, W, bg, bgD, col, setc, sxy, t } from '../world/grid.js';
import { SURF, bgRect, clearAll, disc, fill, makeFar, tint } from './gen.js';
import { noise2 } from './city.js';
import { birch, pine, tree } from './forest.js';
import { spawn } from '../world/particles.js';

// ---- X-Mansion: the Xavier Institute. The courtyard and its fountain sit dead centre, right under the mansion
// in the backdrop (the far layer is centred on the map, so the house lines up with x = W/2). Both sides are old
// forest full of the wrecks of giant Sentinels from some long-ago siege: heads, hands, arms, torsos and legs,
// half-buried and grown over with moss.
export const XM={fx:0,top:0};
export const XFB=252; // the mansion's lawn line in far-layer rows (maps/index.js keeps the backdrop at native size around it)
export function genXMansion(){
  clearAll();
  const GY=356,s=R()*100,B=XFB; // B: lawn line of the mansion in far-layer rows (sits just above the courtyard on screen)
  makeFar([38,50,104],[246,170,118],()=>{
    // the mansion is drawn into its own buffer first, then pasted bigger and lower with forced perspective
    const mc=new Uint32Array(ST.FW*H),mk=new Uint8Array(ST.FW*H);
    const P=(x,y,c)=>{x|=0;y|=0;if(x<0||x>=ST.FW||y<0||y>=H)return;mc[y*ST.FW+x]=c;mk[y*ST.FW+x]=1;};
    const Rf=(x0,y0,x1,y1,c,v=6)=>{for(let y=y0|0;y<y1;y++)for(let x=x0|0;x<x1;x++){if(x<0||x>=ST.FW||y<0||y>=H)continue;const n=(R()*2-1)*v;mc[y*ST.FW+x]=rgb(cl(c[0]+n),cl(c[1]+n),cl(c[2]+n));mk[y*ST.FW+x]=1;}};
    const FP=(x,y,c)=>{x|=0;y|=0;if(x<0||x>=ST.FW||y<0||y>=H)return;ST.far[y*ST.FW+x]=c;};
    const cx=ST.FW/2|0,fz=x=>Math.min(1,Math.max(0,(Math.abs(x-cx)-240)/120)); // 0 by the house, 1 out in the side forests
    // distant tree line: low behind the house, rising into old forest on the sides
    const ridge=new Int16Array(ST.FW);
    for(let x=0;x<ST.FW;x++){const hh=B-18-Math.abs(Math.sin(x*.07+s))*16-Math.sin(x*.023+s)*10-fz(x)*(26+Math.abs(Math.sin(x*.11+s*3))*14+Math.sin(x*.031)*8)|0;ridge[x]=hh;
      for(let y=hh;y<H;y++)ST.far[y*ST.FW+x]=rgb(34+(y-hh)/8,62+(y-hh)/10,52+(y-hh)/12);}
    // hazy wrecks of giant Sentinels towering over the far forest
    const hz=(k)=>rgb(cl(50+k*22),cl(40+k*16),cl(70+k*22)),eye=rgb(190,70,80);
    const fEll=(x0,y0,rx,ry,a,f)=>{const ca=Math.cos(a),sa=Math.sin(a),r=Math.max(rx,ry)+1;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const u=x*ca+y*sa,v=-x*sa+y*ca,e=u*u/(rx*rx)+v*v/(ry*ry);if(e<=1)FP(x0+x,y0+y,f(u,v,e));}};
    // colossal and hazy, so they stand well clear of the foreground forest's canopy
    const Z=2.2,farWreck=[
      (x)=>{const y=B-30*Z,a=(R()-.5)*.5; fEll(x,y,24*Z,21*Z,a,(u,v,e)=>e>.85&&v<0?hz(1):(Math.abs(u)<14*Z&&v>-4*Z)?hz(.6):hz(0)); // tilted head: helmet, face plate, one eye still lit
        fEll(x-7*Z|0,y+2*Z|0,4*Z,2*Z,a,()=>eye);fEll(x+7*Z|0,y+2*Z|0,4*Z,2*Z,a,()=>hz(-.6));},
      (x)=>{const y=B-26*Z,d=R()<.5?-1:1; for(let k=0;k<4;k++){const fx=x+(k-1.5)*7*Z,L=[30,38,36,26][k]*Z;for(let j=0;j<L;j++){const q=j/L,ux=fx+d*q*q*8*Z|0;for(let w=-2*Z|0;w<=2*Z;w++)FP(ux+w,y-22*Z-j,hz(w<0?.5:0));}} // a hand reaching out of the trees
        for(let yy=y-24*Z|0;yy<B+4;yy++)for(let xx=x-15*Z|0;xx<x+15*Z;xx++)FP(xx,yy,hz(xx<x-8*Z?.5:0));},
      (x)=>{fEll(x,B-20*Z|0,62*Z,17*Z,(R()-.5)*.14,(u,v)=>v<-11*Z?hz(1):Math.abs(u+8*Z)<9*Z&&Math.abs(v)<7*Z?hz(-.5):hz(0));fEll(x+56*Z|0,B-30*Z|0,15*Z,15*Z,0,(u,v)=>v<-8*Z?hz(1):hz(.3));}, // a toppled body with its shoulder up
      (x)=>{const a=(R()-.5)*.3,Lg=92*Z,wd=8*Z|0;for(let j=0;j<Lg;j++)for(let w=-wd;w<=wd;w++){const xx=x+w+Math.sin(a)*j|0,yy=B-j|0;if(j>Lg-6-Math.abs(w)%4*3)continue;FP(xx,yy,hz(w<-3*Z?.6:0));}fEll(x+Math.sin(a)*Lg*.52|0,B-Lg*.52|0,10*Z,10*Z,0,()=>hz(.4));}, // a broken leg still standing
    ];
    for(const side of [-1,1]){let k=side>0?2:0;for(let d=330+R()*40;d<ST.FW/2-40;d+=230+R()*90)farWreck[k++%farWreck.length](cx+side*d|0);}
    // nearer canopy on the sides covers the wrecks' feet
    for(let x=0;x<ST.FW;x++){const f=fz(x);if(f<=0)continue;const top=B-6-f*(10+Math.abs(Math.sin(x*.19+s))*9+Math.sin(x*.05)*4)|0;
      for(let y=top;y<B+4;y++){const n=(R()*2-1)*4,k=(y-top)/14;FP(x,y,rgb(cl(28+k*6+n),cl(60+k*8+n),cl(38+k*4+n)));}}
    for(let x=0;x<ST.FW;x++)for(let y=B;y<H;y++)ST.far[y*ST.FW+x]=rgb(62-(y-B)/7,98-(y-B)/6,56-(y-B)/8);
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
    // the gravel drive and hedge rows run from the door toward the viewer; the side forests carry on below the house line
    for(let y=B1;y<H;y++){const d=y-B1,hw=18+d*1.1,stripe=((d>>3)&1)?6:-4;
      for(let x=0;x<ST.FW;x++){const i=y*ST.FW+x;if(ST.farKeep[i]&&d<2)continue;const ax=Math.abs(x-cx),n=(R()*2-1)*5,hedge=d%22<5&&ax>hw+6,f=fz(x);
        let c=ax<hw?[180,168,140]:ax<hw+3?[40,92,44]:hedge?[34,84,40]:[74+stripe,126+stripe,62+stripe];
        if(f>0){const g=.5+.5*noise2(x*1.7,y*1.7,s),fc=[24+g*14,52+g*22,32+g*8];c=c.map((v,j)=>v+(fc[j]-v)*f);}
        ST.far[i]=rgb(cl(c[0]+n),cl(c[1]+n),cl(c[2]+n));ST.farKeep[i]=1;}}
    const blob=(tx,ty,r,k)=>{for(let y=-r*2;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x/(r*r)+(y<0?y*y/(4*r*r):y*y/(r*r))>1)continue;const X=tx+x,Y=ty+y;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;const n=R()*14,l=y<-r?8:0;ST.far[Y*ST.FW+X]=rgb(26+n+l+k,58+n+l+k,34+n/2);ST.farKeep[Y*ST.FW+X]=1;}};
    for(const side of [-1,1]){for(let k=0;k<5;k++)blob(cx+side*(220+k*36),B1+4+k*3,10+k*3,0); // trees framing the house
      for(let d=380;d<ST.FW/2+20;d+=14+R()*16)blob(cx+side*d|0,B1+6+R()*26|0,9+R()*9|0,-6);} // and the forest canopy beyond
  });
  const cx=W/2|0,CH=Math.min(420,W*.17|0),FZ=CH+300; // courtyard half-width; the forests start FZ from the centre
  XM.fx=cx;XM.top=GY-74;
  const hm=[];
  for(let x=0;x<W;x++){const u=Math.min(1,Math.max(0,Math.abs(x-cx)-CH-40)/260),e=u*u*(3-2*u);hm[x]=GY-Math.round(e*(12+Math.sin(x*.006+s)*9+Math.sin(x*.019+s*2)*4));}
  for(let x=0;x<W;x++){
    const h=hm[x],st=h+42+Math.sin(x*.05+s)*6|0;
    for(let y=h;y<H;y++)setc(y*W+x,y<h+2?GRASS:y<st?DIRT:y>=H-4?OBSID:STONE);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,28-(y-h)/16,24-(y-h)/18);
  }
  // deep woods: dark trunks and canopy on the back wall behind the side forests
  for(let x=0;x<W;x++){const d=Math.abs(x-cx)-FZ+60;if(d<0)continue;const f=Math.min(1,d/120),top=hm[x]-60-Math.abs(Math.sin(x*.045+s))*34-Math.sin(x*.013)*14|0;
    const trunk=((x+(s|0))%23<3)&&R()<.98;for(let y=Math.max(0,top);y<hm[x]+3;y++){if(R()>f)continue;const i=y*W+x,k=(y-top)/80;if(y<top+26||trunk)bg[i]=trunk&&y>=top+20?rgb(30+k*6,24+k*4,22):rgb(cl(22+k*10+R()*6),cl(44+k*12+R()*8),cl(30+k*6));}}
  bgD.set(bg);
  for(let y=0;y<H-8;y++)for(let x=0;x<W;x++){if(y>hm[x]+130&&noise2(x,y,s)>.4)setc(y*W+x,EMPTY);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // courtyard paving
  for(let x=cx-CH;x<cx+CH;x++)for(let y=GY;y<GY+3;y++){setc(y*W+x,CONC);const j=(x%10===0)||y===GY+2;col[y*W+x]=j?rgb(150,140,122):rgb(196+R()*10,184+R()*10,160+R()*8);}
  fountain(cx,GY);
  // trimmed hedges, mirrored either side of the fountain
  for(const sd of [-1,1])for(const [p,q] of [[.88,.66],[.56,.34]]){const a=Math.min(cx+sd*CH*p,cx+sd*CH*q)|0,b=Math.max(cx+sd*CH*p,cx+sd*CH*q)|0;
    fill(a,GY-8,b,GY,LEAF);for(let x=a;x<b;x++)for(let y=GY-8;y<GY;y++){const i=y*W+x;if(t[i]===LEAF)col[i]=rgb(30+R()*20,96+R()*30,40+R()*14);}fill(a,GY-9,a+2,GY-8,EMPTY);fill(b-2,GY-9,b,GY-8,EMPTY);}
  // lamp posts
  for(const x of [cx-CH+12,cx-96,cx+96,cx+CH-12]){fill(x,GY-20,x+1,GY,STEEL);tint(x,GY-20,x+1,GY,40,40,48,4);fill(x-1,GY-22,x+2,GY-20,NEON);tint(x-1,GY-22,x+2,GY-20,255,220,150,10);}
  // stone balustrade posts at the courtyard ends
  for(const x of [cx-CH-8,cx+CH]){fill(x,GY-16,x+8,GY,STONE);tint(x,GY-16,x+8,GY,196,190,176,6);fill(x-1,GY-18,x+9,GY-16,STONE);tint(x-1,GY-18,x+9,GY-16,170,164,150,4);}
  // gazebo on the west lawn
  const gx=cx-CH-150;
  { const gy=hm[gx];fill(gx-22,gy-2,gx+22,gy,WOOD);for(const px of [gx-20,gx-7,gx+6,gx+19])fill(px,gy-20,px+2,gy-2,WOOD);
    for(let r=0;r<12;r++)fill(gx-26+r*2,gy-21-r,gx+26-r*2,gy-20-r,WOOD);tint(gx-26,gy-33,gx+26,gy-20,236,232,224,8); }
  // basketball court on the east lawn
  const bx=cx+CH+60;
  { fill(bx,hm[bx]-1,bx+170,hm[bx]+1,CONC);tint(bx,hm[bx]-1,bx+170,hm[bx]+1,176,96,60,8);for(let x=bx;x<bx+170;x+=42)tint(x,hm[bx]-1,x+1,hm[bx],240,240,240,0);
    const hx=bx+150,hy=hm[hx]-1;fill(hx,hy-34,hx+2,hy,STEEL);fill(hx-6,hy-36,hx+2,hy-26,GLASS);fill(hx-11,hy-28,hx-6,hy-27,STEEL);tint(hx-11,hy-28,hx-6,hy-27,230,90,40,0); }
  // a few trees on the lawns; thick old forest past them
  for(let x=24;x<W-24;){const ax=Math.abs(x-cx);
    if(ax>FZ){const r=R();r<.12?bigTree(x,hm[x]):r<.45?pine(x,hm[x]):r<.82?tree(x,hm[x]):birch(x,hm[x]);x+=7+R()*11|0;}
    else{if(ax>CH+40&&!(x>gx-34&&x<gx+34)&&!(x>bx-14&&x<bx+184)){R()<.6?tree(x,hm[x]):birch(x,hm[x]);}x+=36+R()*50|0;}}
  // the Sentinel graveyard: giant wrecks scattered through both forests, the trees growing up around them
  const wrecks=[sHead,sHand,sArm,sTorso,sLeg];
  for(const sd of [-1,1]){let k=sd>0?2:0;for(let d=FZ+150+R()*60;d<W/2-150;d+=400+R()*200){const x=cx+sd*d|0;wrecks[k++%wrecks.length](x,hm[x],sd,s);}}
  // wrought-iron fence and gate pillars at the estate edges
  for(const [a,b] of [[0,40],[W-40,W]]){for(let x=a;x<b;x+=3)fill(x,hm[x]-16,x+1,hm[x],STEEL);fill(a,hm[a]-14,b,hm[a]-13,STEEL);fill(a,hm[a]-5,b,hm[a]-4,STEEL);tint(a,hm[a]-18,b,hm[a],30,30,36,4);}
  // beneath the courtyard: the Blackbird hangar
  { const x0=cx-240,x1=cx+240,y0=GY+60,y1=GY+112;fill(x0-3,y0-3,x1+3,y1+3,STEEL);tint(x0-3,y0-3,x1+3,y1+3,70,76,88,6);fill(x0,y0,x1,y1,EMPTY);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)bg[y*W+x]=((x>>3)+(y>>3))%2&&y>y1-4?rgb(200,170,40):(y%16===0?rgb(70,84,108):rgb(48,58,78));
    for(let x=x0+20;x<x1;x+=60)bgRect(x,y0+2,x+10,y0+4,rgb(230,240,255));
    blackbird(cx-100,y1); }
  ST.SPAWNX=cx-150;
}
// the fountain keeps running: droplets arc from the top bowl into the middle one, and from there into the basin
export function ambXMansion(){
  const fx=XM.fx,ty=XM.top;if(!fx||t[(ty+6)*W+fx]!==STONE)return; // dry once its column is knocked down
  for(let k=0;k<3;k++){const d=R()<.5?-1:1,hi=R()<.45;
    spawn(fx+d*(hi?2:20),hi?ty-1:ty+29,d*(hi?.55+R()*.25:.7+R()*.35),-.6-R()*.5,R()<.6?rgb(120,170,240):rgb(215,235,255),40,0,0,1);}
}
function fountain(fx,GY){
  const st=(x0,y0,x1,y1,c=200)=>{fill(x0,y0,x1,y1,STONE);tint(x0,y0,x1,y1,c,c-4,c-14,5);};
  const bowl=(y,hw)=>{for(let r=0;r<5;r++)st(fx-hw+10-r*2,y-r,fx+hw-10+r*2,y-r+1,206);st(fx-hw,y-6,fx-hw+2,y-4,214);st(fx+hw-2,y-6,fx+hw,y-4,214);fill(fx-hw+2,y-5,fx+hw-2,y-4,WATER);};
  // wide basin with a raised lip, full of water
  st(fx-66,GY-9,fx+66,GY);st(fx-68,GY-10,fx+68,GY-9,214);fill(fx-62,GY-8,fx+62,GY-1,WATER);
  // pedestal with the X-Men emblem inlaid and glowing
  st(fx-9,GY-40,fx+9,GY-9,204);st(fx-11,GY-12,fx+11,GY-9,190);st(fx-11,GY-42,fx+11,GY-39,190);
  for(let a=0;a<6.283;a+=.05){const x=fx+Math.round(Math.cos(a)*7)-(Math.cos(a)<0?1:0),y=GY-25+Math.round(Math.sin(a)*7);col[y*W+x]=rgb(70,66,64);}
  for(let k=-4;k<=4;k++)for(const [x,y] of [[fx+k,GY-25+k],[fx+k,GY-25-k],[fx+k-1,GY-25+k],[fx+k-1,GY-25-k]]){const i=y*W+x;t[i]=NEON;col[i]=rgb(255,64,56);}
  bowl(GY-40,30); // middle bowl
  st(fx-3,GY-64,fx+3,GY-44,210); // upper column, down through the water onto the bowl
  bowl(GY-64,14); // top bowl
  st(fx-2,GY-74,fx+2,GY-68,214);disc(fx,GY-74,2,STONE);tint(fx-3,GY-77,fx+3,GY-71,226,222,210,4); // finial and spout
}
// ---- Sentinel wrecks. Each is drawn in a local frame (u across, v down) rotated by a, then weathered: grimy
// blotches, rust streaks, moss and grass on whatever faces up.
const SPU=[104,56,146],SMG=[186,74,138],SGR=[120,116,132],SDK=[22,16,28];
function wreck(ax,ay,r,a,s,f){
  const ca=Math.cos(a),sa=Math.sin(a),x0=Math.max(0,ax-r|0),x1=Math.min(W,ax+r+1|0),y0=Math.max(0,ay-r|0),y1=Math.min(H,ay+r+1|0);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const dx=x-ax,dy=y-ay,c=f(dx*ca+dy*sa,-dx*sa+dy*ca);if(!c)continue;const i=y*W+x;
    if(c===1){setc(i,EMPTY);bg[i]=rgb(34+R()*6,24+R()*4,44+R()*6);continue;} // broken open: a dark hollow you can climb into
    if(c[3]){t[i]=c[3];col[i]=rgb(c[0],c[1],c[2]);continue;}
    setc(i,STEEL);const g=.74+.26*noise2(x*2.2,y*2.2,s+5)+(R()-.5)*.1,rs=((x*37)%29<2&&y>ay-r*.4)?.45:0;
    col[i]=rgb(cl((c[0]*(1-rs)+126*rs)*g),cl((c[1]*(1-rs)+70*rs)*g),cl((c[2]*(1-rs)+44*rs)*g));}
  // moss and grass on the upward faces
  for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++){const i=y*W+x;if(t[i]!==STEEL)continue;if(y>0&&t[i-W]===EMPTY&&R()<.6){const n=1+R()*3|0;for(let k=1;k<=n;k++){const j=i-k*W;if(j<0||t[j]!==EMPTY)break;setc(j,R()<.4?GRASS:LEAF);col[j]=rgb(34+R()*24,86+R()*40,36+R()*12);}if(R()<.05){const len=4+R()*10|0;for(let k=1;k<len;k++){const j=i+k*W+(R()<.5?-1:1);if(j<W*H&&t[j]===EMPTY){setc(j,LEAF);col[j]=rgb(30+R()*16,78+R()*30,34);}}}}break;}
}
const sh=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
function sHead(x,gy,sd,s){ // a head lying where it fell, tipped over and sunk to the cheeks, one eye still glowing
  const z=52+R()*12,a=sd*(.25+R()*.3),lit=R()<.7;
  wreck(x,gy+z*.3,z*1.25,a,s,(u,v)=>{const e=u*u/(z*z)+v*v/(z*z*.92);if(e>1)return null;
    if(Math.abs(u-z*.48+v*.35)<2.2&&v<-z*.1)return SDK; // a crack across the crown
    const ey=v+z*.08;for(const ex of [-z*.3,z*.3]){const q=(u-ex)**2/(z*z*.03)+ey*ey/(z*z*.008);if(q<1)return lit&&ex<0&&q<.35?[255,46,40,NEON]:SDK;}
    if(Math.abs(u)<z*.3&&v>z*.3&&v<z*.5)return (u|0)%4===0?sh(SMG,1.1):SDK; // mouth grille
    if(Math.abs(v+z*.26)<z*.05&&Math.abs(u)<z*.68)return sh(SPU,.7); // brow ridge
    if(Math.abs(u)<z*.64&&v>-z*.22&&e<.84)return Math.abs(Math.abs(u)-z*.62)<1.2?sh(SMG,.7):SMG; // face plate
    if(Math.abs(u)>z*.8&&Math.abs(v)<z*.2)return SGR; // ear bolts
    return e>.9?sh(SPU,.8):v<-z*.5?sh(SPU,1.15):SPU;});
}
function sHand(x,gy,sd,s){ // a hand reaching up out of the ground, fingers curled
  const z=46+R()*10,a=sd*(R()*.25),dir=-sd;
  wreck(x,gy,z*2.1,a,s,(u,v)=>{
    if(Math.abs(u)<z*.5&&v>-z*.9&&v<z*.5)return Math.abs(v+z*.55)<1.5?sh(SMG,.7):(u>z*.36?sh(SMG,.85):SMG); // palm
    const fx=[-.36,-.12,.12,.36],fl=[.62,.85,.8,.56];
    for(let j=0;j<4;j++){const L=fl[j]*z,q=(-z*.9-v)/L;if(q<0||q>1)continue;const uc=fx[j]*z+dir*q*q*z*.3;if(Math.abs(u-uc)<z*.1)return Math.abs(q-.36)<.05||Math.abs(q-.7)<.05?SGR:Math.abs(u-uc)>z*.07?sh(SMG,.8):SMG;}
    const tx0=-dir*z*.5,ty0=-z*.25,tx1=-dir*z*.9,ty1=-z*.8,lx=tx1-tx0,ly=ty1-ty0,p=Math.max(0,Math.min(1,((u-tx0)*lx+(v-ty0)*ly)/(lx*lx+ly*ly))); // thumb
    if(Math.hypot(u-tx0-lx*p,v-ty0-ly*p)<z*.11)return p>.5&&p<.56?SGR:SMG;
    if(Math.abs(u)<z*.42&&v>=z*.5&&v<z*1.4)return Math.abs(v-z*.62)<z*.08?SGR:SPU; // wrist into the dirt
    return null;});
}
function sArm(x,gy,sd,s){ // a fallen forearm, wrist joint at one end, torn wiring at the other
  const L=220+R()*80,r=19+R()*4,a=(R()-.5)*.08,cy=gy-r*.6;
  wreck(x,cy,L/2+r+2,a,s,(u,v)=>{const w=u*sd+L/2;if(w<0||w>L+r||Math.abs(v)>r)return null;
    if(w>L)return (w-L)**2+v*v<r*r?SGR:null; // wrist ball
    if(w<5+Math.sin(v*.9)*3+(Math.abs(v)<r*.5?4:0))return Math.abs(v)<r*.55?1:null; // torn, hollow end
    const band=(w|0)%18<3;return v<-r*.5?sh(SPU,band?.8:1.2):band?sh(SPU,.7):Math.abs(v)<r*.35&&w>L*.55?SMG:SPU;});
  const ex=x-sd*L/2|0; // wires spilling out of the torn end
  for(let k=0;k<4;k++){const c=[[200,60,50],[60,110,210],[200,140,60],[90,90,100]][k];let wx=ex,wy=cy-r*.4+k*3|0;
    for(let j=0;j<40&&wy<gy;j++){wx-=sd*(R()<.6?1:0);wy+=j>6?1:R()<.3?1:0;if(wx<0||wx>=W||t[wy*W+wx]!==EMPTY)continue;const i=wy*W+wx;setc(i,STEEL);col[i]=rgb(...c);}}
}
function sTorso(x,gy,sd,s){ // a toppled torso half sunk in the forest floor, its chest torn open
  const z=64+R()*12,Lh=z*1.3,Hh=z*.62,a=(R()-.5)*.1,cy=gy-Hh*.55;
  wreck(x,cy,Lh+Hh+4,a,s,(u,v)=>{const w=u*sd;
    const sx=w-Lh,sd2=sx*sx+(v+Hh*.15)**2;if(sx>-Hh*.3&&sd2<(Hh*.85)**2)return sd2>(Hh*.72)**2?sh(SGR,.8):v<-Hh*.4?sh(SPU,1.15):SPU; // shoulder dome
    if(Math.abs(w)>Lh||Math.abs(v)>Hh)return null;const cr=Math.max(0,Math.abs(w)-Lh+10)**2+Math.max(0,Math.abs(v)-Hh+10)**2;if(cr>100)return null; // rounded box
    const hx=w+Lh*.4,ho=hx*hx/(z*z*.16)+(v-Hh*.05)**2/(z*z*.1);if(ho<1)return ho>.7?SDK:1; // the chest blown open
    const ex=w-Lh*.25,ed=Math.hypot(ex,v);if(ed<z*.3)return ed>z*.24?SDK:ed<z*.12?[255,80,170,NEON]:SMG; // chest emblem, a faint light still on
    if(v<-Hh+3)return sh(SPU,1.2);if(Math.abs(v-Hh*.55)<Hh*.25&&(w|0)%8<2)return SDK; // vents low on the flank
    return Math.abs(w+Lh*.05)<1.5?sh(SPU,.7):SPU;});
  if(R()<.8)tree(x+sd*(z*.3)|0,cy-Hh+2|0); // a tree has taken root on top
}
function sLeg(x,gy,sd,s){ // a broken leg still standing, snapped off above the knee
  const z=40+R()*8,a=sd*(.05+R()*.15);
  wreck(x,gy-z,z*2.6,a,s,(u,v)=>{
    if(v>z*.9&&v<z*1.6&&u*sd>-z*.4&&u*sd<z*.75)return v<z*1?sh(SPU,1.15):SPU; // foot, sunk in
    const kn=u*u+(v+z*.2)**2;if(kn<(z*.36)**2)return kn>(z*.28)**2?sh(SGR,.75):SGR; // knee
    if(v>-z*.2&&v<=z*.95&&Math.abs(u)<z*.24)return (v|0)%14<2?sh(SPU,.7):u<-z*.14?sh(SPU,1.15):SPU; // shin
    const top=-z*1.9+Math.sin(u*.8)*z*.1+(((u*7)|0)%3)*2;
    if(v<-z*.2&&v>top&&Math.abs(u)<z*.28)return v<top+3?SDK:u<-z*.16?sh(SMG,1.1):SMG; // thigh, jagged top
    return null;});
}
function bigTree(x,gy){ // an old forest giant: thick trunk, root flare, a broad crown
  const h=80+R()*40|0,tw=4+(R()*2|0);
  fill(x,gy-h,x+tw,gy+4,WOOD);fill(x-2,gy-6,x+tw+2,gy+2,WOOD);fill(x-4,gy-2,x+tw+4,gy+2,WOOD);tint(x-4,gy-h,x+tw+4,gy+2,74,52,36,8);
  for(let b=0;b<4;b++){const by=gy-h+10+R()*(h*.5)|0,d=b%2?1:-1,len=10+R()*14|0;for(let k=0;k<len;k++)fill(x+(d>0?tw:-2)+d*k,by-(k>>1),x+(d>0?tw:-2)+d*k+2,by-(k>>1)+2,WOOD);
    disc(x+d*(len+2)+(d>0?tw:0),by-(len>>1)-3,6+R()*4|0,LEAF,.9);}
  const r=14+R()*6|0;disc(x+2,gy-h-2,r,LEAF,.9);disc(x-r*.6|0,gy-h+5,r-4,LEAF,.85);disc(x+r*.7+3|0,gy-h+5,r-4,LEAF,.85);
  for(let y=gy-h-r-3;y<gy-h+r+4;y++)for(let k=x-r*2;k<x+r*2;k++){if(k<0||k>=W||y<0)continue;const i=y*W+k;if(t[i]===LEAF)col[i]=rgb(22+R()*18,62+R()*28,30+R()*10);}
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
