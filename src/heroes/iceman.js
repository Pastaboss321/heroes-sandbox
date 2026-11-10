// Iceman: sprite, palette, rig entry, powers and roster entry.
import './cyclops.js'; // evaluation order: runs after heroes/cyclops.js
import { ST } from '../state.js';
import { ACID, EMPTY, F, G, ICE, KIND, LAVA, NEON, OBSID, R, S, WATER, rgb } from '../world/materials.js';
import { H, N, W, col, setc, t } from '../world/grid.js';
import { bodies, pin, q } from '../world/support.js';
import { finishBody, makeBody } from '../world/bodies.js';
import { MP, spawn } from '../world/particles.js';
import { beams, flash, fxBurst, fxImpact, fxWord, rings } from '../render/fx.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { shots, surfaceY } from './powers.js';
import { ACT, freezeArea, iceAt } from './xmen.js';
import { SKY, mouse, pl_ } from '../player.js';
import { damageEnemies, enemies, enemyAt, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { tagged } from './kitlib.js';
import { applyStatus } from './abilities.js';

export const SPR_ICE=[
"....iIIIi....",
"...iI+IIiJ...",
"...iIIIiJJ...",
"...iIeIeJJ...",
"...iIIiJJJ...",
"....iIJJJ....",
"..iIIiJJJJJ..",
".IiI+IIiJJiJ.",
".IiIIiIJJKiJ.",
".IiIiIIJJKiJ.",
".IiKIiIJKKiJ.",
".IiKiIJJKKiJ.",
".I+.IIJJK.+J.",
".++.IJ.JK.++.",
"....IJ.JK....",
"....Ii.JK....",
"...I+...JK...",
"...Ii...JK...",
"...Ii...JK...",
"..IIi...JJK..",
"..IIi...JJK..",
"..iiJ...JKK.."];
const PAL_ICE={i:rgb(128,188,234),I:rgb(200,236,255),J:rgb(68,128,194),K:rgb(38,80,146),'+':rgb(240,255,255),e:rgb(255,255,255)};

// animation rig entry (see render/rig.js)
ANIM.iceman={leg:14,mid:6,armC:'IiJ',tipC:'+Ii',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:'e',lid:'I'};
const ICE_POWERS=[
 {n:'Ice Beam',fn:(a,p,use)=>{if(!use(.6))return;let x=a.h.x,y=a.h.y;
   for(let s2=0;s2<300;s2++){x+=a.dx;y+=a.dy;const X=x|0,Y=y|0;if(X<0||X>=W||Y>=H||Y<-SKY)break;const i=Y*W+X,m=t[i];
     if(m===WATER||m===ACID){setc(i,ICE);continue;}if(m===LAVA){setc(i,OBSID);break;}if(KIND[m]===F){setc(i,EMPTY);continue;}
     const e=enemyAt(x,y,1);if(e){e.frozen=Math.max(e.frozen||0,60);hitEnemy(e,1.5,0,0);break;}
     if(m&&KIND[m]!==G){for(let k=0;k<3;k++)iceAt(X-a.dx*(1+R()*3)+(R()-.5)*3,Y-a.dy*(1+R()*3)+(R()-.5)*3);break;}}
   beams.push({x0:a.h.x,y0:a.h.y,x1:x,y1:y,life:1,w:1,c:[235,250,255],g:[120,200,255]});
   for(let k=0;k<3;k++){const f=R();spawn(a.h.x+(x-a.h.x)*f,a.h.y+(y-a.h.y)*f,(R()-.5)*.6,(R()-.5)*.6,R()<.5?rgb(230,250,255):rgb(150,210,250),14,0,1,0,1);}
   flash(x,y,10,[150,210,255],2);if(ST.frame%26===0)fxWord(x,y-8,'FSSSHH!',.8,'#bfe3ff',true);}},
 {n:'Ice Wall',fn:(a,p,use)=>{if(!use(20))return;let X=mouse.wx|0,Y=mouse.wy|0;while(Y<H-1&&(t[Y*W+X]===0||KIND[t[Y*W+X]]===G||KIND[t[Y*W+X]]===F))Y++;let h=0;ST.cd=30;
   fxWord(X,Y-30,'KRRSSHH!',1.2,'#bfe3ff',true);ST.shake+=4;
   ACT.push(()=>{for(let k=0;k<3&&h<44;k++,h++){const yy=Y-h;for(let xx=-4;xx<=4;xx++){if(Math.abs(xx)===4&&h>36)continue;iceAt(X+xx,yy);}
     for(let k2=0;k2<3;k2++)spawn(X+(R()-.5)*10,yy,(R()-.5)*2,-R()*2,rgb(220,245,255),14,0,1,1);}damageEnemies(X,Y-h,8,3,0,-3);return h<44;});}},
 {n:'Ice Shards',fn:(a,p,use)=>{if(!use(10))return;ST.cd=16;const an=Math.atan2(a.dy,a.dx);fxWord(a.h.x+a.dx*20,a.h.y-8,'TSING!',.9,'#bfe3ff',true);
   for(let k=0;k<7;k++){const t2=an+(R()-.5)*.45,sp=6+R()*2;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(t2)*sp,vy:Math.sin(t2)*sp,type:'shard',life:90,col:[200,240,255],grav:.05,
     onHit:sh=>{for(let q2=0;q2<4;q2++)iceAt(sh.x-sh.vx*.3+(R()-.5)*3,sh.y-sh.vy*.3+(R()-.5)*3);damageEnemies(sh.x,sh.y,5,12,sh.vx*.3,sh.vy*.3);for(const e of enemies)if(Math.hypot(e.x-sh.x,e.y-sh.y)<6)e.frozen=Math.max(e.frozen||0,40);
       for(let q2=0;q2<6;q2++)spawn(sh.x,sh.y,(R()-.5)*3,-R()*2,rgb(220,245,255),16,0,1,1);}});}}},
 {n:'Frost Nova',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;const cx=p.x,cy=p.y-ST.PH/2,r=52;freezeArea(cx,cy,r,160,18);fxWord(cx,cy-30,'KRA-SHHH!',1.4,'#bfe3ff',true);fxBurst(cx,cy,70,'#bfe3ff');fxImpact(cx,cy,3);
   for(let k=0;k<40;k++){const an=R()*6.283;let x=cx,y=cy;for(let d=0;d<r;d++){x+=Math.cos(an);y+=Math.sin(an);const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;const m=t[Y*W+X];if(m&&KIND[m]===S){for(let s2=0;s2<5;s2++)iceAt(x-Math.cos(an)*s2,y-Math.sin(an)*s2);break;}}}
   for(let k=0;k<140;k++){const an=R()*6.283,s2=2+R()*4;spawn(cx,cy,Math.cos(an)*s2,Math.sin(an)*s2,R()<.5?rgb(230,250,255):rgb(140,200,250),20+R()*20,0,1,0,1);}
   rings.push({x:cx,y:cy,r:4,vr:4,life:14,c:[200,240,255]});flash(cx,cy,90,[150,210,255],10);ST.shake+=10;}},
 {n:'Glacier Spikes',fn:(a,p,use)=>{if(!use(24))return;ST.cd=40;const dir=a.dx<0?-1:1;let k=0,x=p.x+dir*8;fxWord(p.x+dir*30,p.y-ST.PH-6,'SHRAKK!',1.2,'#bfe3ff',true);ST.shake+=4;
   ACT.push(()=>{if(k%2===0){let y=Math.max(0,p.y-30|0);while(y<H-1&&y<p.y+60&&(t[y*W+(x|0)]===0||KIND[t[y*W+(x|0)]]!==S))y++;
       if(y>=p.y+60&&k%4===0){shots.push({x,y:p.y-ST.PH/2,vx:dir*6,vy:(R()-.5)*.6,type:'shard',life:50,col:[200,240,255],boom:5,onHit:sh=>{for(const e of enemies)if(Math.hypot(e.x-sh.x,e.y-sh.y)<10)e.frozen=Math.max(e.frozen||0,40);}});}
       if(y<p.y+60){const h=10+R()*7|0;for(let yy=0;yy<h;yy++){const w=Math.round((1-yy/h)*3);for(let xx=-w;xx<=w;xx++)iceAt(x+xx,y-1-yy);}
         damageEnemies(x,y-h/2,9,22,dir*2,-5);for(const e of enemies)if(Math.abs(e.x-x)<9&&Math.abs(e.y-(y-h/2))<14)e.frozen=Math.max(e.frozen||0,50);
         for(let q2=0;q2<8;q2++)spawn(x+(R()-.5)*6,y-R()*h,(R()-.5)*3,-R()*3,rgb(225,245,255),16,0,1,1);flash(x,y-h/2,14,[150,210,255],3);}
       x+=dir*9;}return++k<20;});}},
 {n:'Ice Prison',fn:(a,p,use)=>{if(!use(18))return;ST.cd=30;const e=nearestEnemy(mouse.wx,mouse.wy,50);const cx=e?e.x:mouse.wx,cy=e?e.y:mouse.wy,r=e?Math.max(e.def.w,e.def.h)/2+2:6;
   for(let y=-r-2;y<=r+2;y++)for(let x=-r-2;x<=r+2;x++){const d=Math.hypot(x,y);if(d>r+2||(e&&d<r))continue;iceAt(cx+x,cy+y);}if(e){e.frozen=Math.max(e.frozen||0,360);hitEnemy(e,10,0,0);}
   fxWord(cx,cy-r-8,'KLONK!',1.1,'#bfe3ff',true);for(let k=0;k<30;k++)spawn(cx,cy,(R()-.5)*4,(R()-.5)*4,rgb(220,245,255),16,0,1,0,1);}},
 {n:'Avalanche',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const dir=a.dx<0?-1:1;let x=p.x,k=0;fxWord(p.x+dir*40,p.y-ST.PH-8,'RUMMMBLE!',1.3,'#bfe3ff',true);
   ACT.push(()=>{x+=dir*4;let y=Math.max(0,p.y-40|0);while(y<H-1&&y<p.y+80&&(t[y*W+(x|0)]===0||KIND[t[y*W+(x|0)]]===G||KIND[t[y*W+(x|0)]]===F))y++;
     for(let n=0;n<16;n++)spawn(x-dir*R()*14,y-R()*14,dir*(2+R()*3),-1-R()*3,R()<.6?rgb(235,245,255):rgb(170,215,245),40+R()*30,R()<.12?ICE:0,0,1);
     damageEnemies(x,y-6,14,4,dir*4,-2);for(const b of bodies)if(Math.abs(b.x-x)<20+b.rmax&&Math.abs(b.y-y)<30)b.vx+=dir*.6;ST.shake=Math.max(ST.shake,3);return++k<45;});}},
 {n:'Ice Golem',fn:(a,p,use)=>{if(!use(45))return;ST.cd=90;let gx=mouse.wx|0,gy=mouse.wy|0;while(gy<H-1&&(t[gy*W+gx]===0||KIND[t[gy*W+gx]]!==S))gy++;
   const cells=[],body=["..IIII..",".IeIIeI.","..IIII..","IIIIIIII","IIIIIIII","II.II.II","II.II.II","II.II.II","..II.II.","..II.II.","..II.II.",".III.III"];
   for(let y=0;y<body.length;y++)for(let x=0;x<8;x++){const ch=body[y][x];if(ch==='.')continue;for(let a2=0;a2<2;a2++)for(let b2=0;b2<2;b2++){const X=gx-8+x*2+a2,Y=gy-body.length*2+y*2+b2;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i]&&KIND[t[i]]===S)continue;
     setc(i,ch==='e'?NEON:ICE);if(ch==='e')col[i]=rgb(120,230,255);cells.push(i);}}
   const head=(gy-body.length*2+3)*W+gx;let k=0;fxWord(gx,gy-34,'KRRRAKK!',1.2,'#bfe3ff',true);
   ACT.push(()=>{k++;if(t[head]!==ICE&&t[head]!==NEON&&t[head-1]!==ICE)return false;
     if(k%28===0){const e=nearestEnemy(gx,gy-20,220);if(e){const dx=e.x-gx,dy=e.y-(gy-22),d=Math.hypot(dx,dy)||1;for(let q2=0;q2<2;q2++)shots.push({x:gx,y:gy-24,vx:dx/d*6+(R()-.5),vy:dy/d*6+(R()-.5),type:'shard',life:90,col:[200,240,255],grav:.03,
       onHit:sh=>{for(let q3=0;q3<3;q3++)iceAt(sh.x+(R()-.5)*3,sh.y+(R()-.5)*3);damageEnemies(sh.x,sh.y,6,14,sh.vx*.3,sh.vy*.3);for(const e2 of enemies)if(Math.hypot(e2.x-sh.x,e2.y-sh.y)<7)e2.frozen=Math.max(e2.frozen||0,40);}});}}
     if(k>=720){for(const i of cells)if(t[i]===ICE||t[i]===NEON){if(R()<.6)spawn(i%W,(i/W)|0,(R()-.5)*3,-R()*2,rgb(220,245,255),40,0,1,1);setc(i,EMPTY);}fxWord(gx,gy-30,'SHATTER',1,'#bfe3ff',true);return false;}return true;});}},
 {n:'Ice Bridge',fn:(a,p,use)=>{if(!use(22))return;ST.cd=30;const x0=p.x,y0=p.y+1,x1=mouse.wx,y1=mouse.wy,n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);
   for(let k=0;k<=n;k++){const X=x0+(x1-x0)*k/n|0,Y=y0+(y1-y0)*k/n|0;for(let d=0;d<3;d++){const i=(Y+d)*W+X;if(i<0||i>=N||(t[i]&&KIND[t[i]]!==G&&KIND[t[i]]!==F))continue;setc(i,ICE);pin[i]=3;slide.push([i,ST.frame+480+(k*.3|0)+(R()*40|0)]);}}
   fxWord((x0+x1)/2,(y0+y1)/2-10,'FSSHHK!',1,'#bfe3ff',true);for(let k=0;k<40;k++){const f=R();spawn(x0+(x1-x0)*f,y0+(y1-y0)*f,(R()-.5),-R(),rgb(220,245,255),20,0,1,0,1);}}},
 // an ice statue of Bobby that every enemy targets until it shatters into shrapnel
 {n:'Ice Decoy',fn:(a,p,use)=>{if(ST.decoy||!use(25))return;ST.cd=40;const x=Math.max(8,Math.min(W-8,mouse.wx|0)),y=surfaceY(x,Math.max(2,mouse.wy-30),220);if(y>=H-6)return;
   ST.decoy={x,y,hp:150,max:150,life:540,face:x<p.x?1:-1};fxWord(x,y-ST.SH-6,'DECOY!',1,'#bfe3ff',true);snd('freeze',x,y);
   for(let k=0;k<40;k++)spawn(x+(R()-.5)*8,y-R()*ST.SH,(R()-.5)*2,-R()*2,R()<.5?rgb(230,250,255):rgb(150,210,250),18,0,1,0,1);for(let k=0;k<9;k++)iceAt(x-4+k,y);}},
 // grow icicles under the nearest ceiling (or out of a frost cloud), then drop them as falling ice
 {n:'Icicle Drop',fn:(a,p,use)=>{if(!use(26))return;ST.cd=45;const cx=mouse.wx|0,cy=mouse.wy|0,ics=[];
   if(cy<20){for(let k=-3;k<=3;k++)shots.push({x:cx+k*8,y:ST.camY-6-R()*20,vx:0,vy:7,type:'shard',life:120,col:[200,240,255],grav:.1,boom:6});fxWord(cx,cy-30,'ICICLES!',1.1,'#bfe3ff',true);return;}
   for(let k=-3;k<=3;k++){const x=cx+k*8;if(x<3||x>=W-3)continue;let top=-1;for(let d=0;d<140;d++){const Y=cy-d;if(Y<2)break;const m=t[Y*W+x];if(m&&KIND[m]===S){top=Y+1;break;}}
     if(top<0)top=Math.max(3,(ST.camY|0)+4);const h=8+R()*7|0,cells=[];
     for(let yy=0;yy<h;yy++){const w=Math.round((1-yy/h)*1.8);for(let xx=-w;xx<=w;xx++){const X=x+xx,Y=top+yy;if(Y>=H-44)continue;const i=Y*W+X;if(t[i]!==0&&KIND[t[i]]!==G)continue;setc(i,ICE);const v=R()*30|0;col[i]=rgb(170+v,225+v/3,255);pin[i]=3;cells.push(i);}}
     if(cells.length)ics.push(cells);}
   fxWord(cx,cy-30,'KRIK-KRIK...',1,'#bfe3ff',true);let k=0;
   ACT.push(()=>{k++;if(k%6===0)for(const c of ics){const i=c[R()*c.length|0];spawn(i%W,(i/W)|0,(R()-.5),R(),rgb(220,245,255),12,0,1,1);}
     if(k<26)return true;
     for(const c of ics){let n=0;for(const i of c)if(t[i]===ICE){pin[i]=0;q[n++]=i;}const b=makeBody(q,n,false);if(b){b.vy=1.5;b.icicle=true;}}
     snd('ice',cx,cy-30);fxWord(cx,cy-20,'SHRAKK!',1.1,'#bfe3ff',true);return false;});}},
 // every frozen or chilled enemy in range bursts at once (the SHATTER combo, everywhere)
 {n:'Shatter Point',fn:(a,p,use)=>{const list=enemies.filter(e=>(e.frozen>0||(e.st&&e.st.chill>40))&&Math.hypot(e.x-p.x,e.y-p.y)<240);if(!list.length){fxWord(p.x,p.y-ST.PH-6,'NOTHING FROZEN',.7,'#bfe3ff',true);return;}if(!use(20))return;ST.cd=40;
   for(const e of list){e.frozen=Math.max(e.frozen||0,2);hitEnemy(e,40,0,-2);}fxWord(p.x,p.y-ST.PH-12,'SHATTER POINT!',1.3,'#bfe3ff',true);snd('glass',p.x,p.y,{size:2});}},
 // packs a boulder of ice and throws it: a real chunk that crashes and breaks apart
 {n:'Ice Cannon',fn:(a,p,use)=>{if(!use(18))return;ST.cd=34;const r=7,w=r*2+1,lm=new Uint8Array(w*w),lc=new Uint32Array(w*w);let n=0;for(let y=0;y<w;y++)for(let x=0;x<w;x++){if((x-r)**2+(y-r)**2>r*r)continue;lm[y*w+x]=ICE;const v=R()*30|0;lc[y*w+x]=rgb(170+v,225,255);n++;}
   const b=finishBody(lm,lc,w,w,r,r,a.h.x+a.dx*10,a.h.y+a.dy*10,0,n,false);b.vx=a.dx*9;b.vy=a.dy*9-1;b.va=(R()-.5)*.3;b.thrown=true;b.safeP=ST.frame+20;b.icicle=true;snd('ice',a.h.x,a.h.y);fxWord(a.h.x,a.h.y-12,'FWOOMPH!',.8,'#bfe3ff',true);}},
 {n:'Glacial Armor',fn:(a,p,use)=>{if(p.shell>0||!use(24))return;ST.cd=70;p.shell=300;fxWord(p.x,p.y-ST.PH-10,'ICE ARMOR!',1,'#bfe3ff',true);
    ACT.push(()=>{if(!(p.shell>0)||ST.CH.id!=='iceman')return false;const cx=p.x,cy=p.y-ST.PH/2;if(ST.frame%3===0)spawn(cx+(R()-.5)*12,cy+(R()-.5)*ST.PH,0,.2,rgb(200,240,255),12,0,1,0,1);
      if(ST.frame%10===0)tagged('ice',()=>{for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<24+e.def.w/2){applyStatus(e,'chill',40);hitEnemy(e,5,(e.x-cx)*.1,-1);}});return true;});}},
 {n:'Absolute Zero',ult:true,fn:(a,p,use)=>{if(!use(40))return;ST.cd=70;const cx=mouse.wx|0,cy=mouse.wy|0,r=15,cells=[];
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-40)continue;const i=Y*W+X,m=t[i];if(m&&KIND[m]!==G&&KIND[m]!==F){setc(i,ICE);cells.push(i);}}
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+6)e.frozen=Math.max(e.frozen||0,60);fxWord(cx,cy-r-6,'KRRRK...',1,'#bfe3ff',true);let k=0;
   ACT.push(()=>{if(++k<45){if(k%5===0)flash(cx,cy,r*2,[160,220,255],3);return true;}
     for(const i of cells)if(t[i]===ICE){const x=i%W,y=(i/W)|0,d=Math.hypot(x-cx,y-cy)||1;if(ST.np<MP-300&&R()<.7)spawn(x,y,(x-cx)/d*(2+R()*4),(y-cy)/d*(2+R()*4)-1,col[i],50+R()*40,R()<.2?ICE:0,1,1);setc(i,EMPTY);}
     damageEnemies(cx,cy,r+8,60,0,-3,true);fxWord(cx,cy-r-6,'SHATTER!',1.5,'#bfe3ff',true);fxBurst(cx,cy,50,'#bfe3ff');fxImpact(cx,cy,3);ST.shake=16;return false;});}}
];
export const slide=[];
// Iceman's slide: he fires frost down at his feet, freezing a ramp along his path that crumbles away soon after
export function iceSlideStep(p){
  const sp=Math.hypot(p.vx,p.vy),bx=sp>.6?p.x-p.vx*2.2:p.x,by=sp>.6?p.y+1-p.vy*2.2:p.y+1; // behind him when moving, so it never blocks the way ahead
  const lx=p.slideX??bx,ly=p.slideY??by,n=Math.max(1,Math.ceil(Math.hypot(bx-lx,by-ly)));
  for(let k=0;k<=n;k++){const X=lx+(bx-lx)*k/n|0,Y=ly+(by-ly)*k/n|0;
    for(let xx=-3;xx<=3;xx++)for(let yy=0;yy<2;yy++){const x=X+xx,y=Y+yy;if(x<0||x>=W||y<0||y>=H)continue;const i=y*W+x;if(t[i]!==0&&KIND[t[i]]!==G&&KIND[t[i]]!==F)continue;
      setc(i,ICE);const v=(R()*24)|0;col[i]=yy?rgb(150+v,205+v/2,240):rgb(205+v,238,255);pin[i]=3;slide.push([i,ST.frame+70+(R()*40|0)+Math.abs(xx)*4]);}}
  p.slideX=bx;p.slideY=by;
  // the frost stream from his hands down to the ice
  const hx=p.x+p.face*3,hy=p.y-ST.SH*.42;
  beams.push({pts:[[hx,hy],[(hx+bx)/2+(R()-.5)*3,(hy+by)/2],[bx,by]],life:1,c:[235,250,255],g:[120,200,255]});
  for(let k=0;k<3;k++)spawn(bx+(R()-.5)*8,by,(R()-.5)*1.5-p.vx*.2,-R()*.8,R()<.5?rgb(230,250,255):rgb(150,210,250),12+R()*10,0,1,0,1);
  if(ST.frame%4===0)flash(bx,by,8,[150,210,255],2);
}
export function updSlide(){
  if(!pl_.fly||ST.CH.id!=='iceman'){pl_.slideX=pl_.slideY=undefined;}
  let k2=0;
  for(let k=0;k<slide.length;k++){const e=slide[k];if(e[1]>ST.frame){slide[k2++]=e;continue;}
    const i=e[0];if(t[i]&&pin[i]===3){pin[i]=0;const x=i%W,y=(i/W)|0,ice=t[i]===ICE;
      if(ST.np<MP-300&&R()<.6)spawn(x,y,(R()-.5)*.8,R()*.5,ice?(R()<.5?rgb(225,245,255):rgb(160,215,250)):col[i],30+R()*30,ice&&R()<.25?WATER:0,1,1);
      setc(i,EMPTY);}}
  slide.length=k2;
}


export const DECOY_PAL=Object.assign({},PAL_ICE,{e:rgb(120,170,220),'+':rgb(200,240,255),J:rgb(120,170,220)});


// roster entry (CHARS in heroes/index.js)
export const CHAR_ICEMAN={id:'iceman',name:'Iceman',spr:SPR_ICE,pal:PAL_ICE,pw:7,ph:19,fly:true,fs:3.0,boost:2.0,run:1.9,jump:4.6,hp:330,armor:.75,glow:[150,220,255],cape:null,thrust:()=>R()<.6?rgb(220,245,255):rgb(140,200,250),powers:ICE_POWERS};
