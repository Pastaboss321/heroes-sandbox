// Doctor Strange: sprite, palette, rig entry, powers and roster entry.
import './wanda.js'; // evaluation order: runs after heroes/wanda.js
import { ST } from '../state.js';
import { EMPTY, F, G, GLASS, KIND, NEON, OBSID, R, RUBBLE, S, rgb } from '../world/materials.js';
import { H, W, bg, bgB, bgD, col, setc, t } from '../world/grid.js';
import { bodies, pin, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { quake, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { slide } from './iceman.js';
import { limbo, portals, solidCells } from './wave2.js';
import { hand, mouse, pl_ } from '../player.js';
import { damageEnemies, enemies, enemyAt, hitEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';

const SPR_STRANGE=[
"....hhhhh....",
"...hhhhhgg...",
"...hfffFgg...",
"...hfkfkFg...",
"...hffFFFh...",
"...C.fFF.C...",
"..CCBBfBBCC..",
"CBbbBBeBBbBbC",
"CBbbBBBBBbBbC",
"CBbbBBBBBbBbC",
"CBb.yyyyy.BbC",
"Ckk.BBBBb.kkC",
"C...BBBBb...C",
"C...BB.Bb...C",
"C...bb.bb...C",
"C..bb...bb..C",
"c..bb...bb..c",
"c..bb...bb..c",
"c..bb...bb..c",
"c.kkk...kkk.c",
"..kkk...kkk..",
"..kkk...kkk.."];
const PAL_STRANGE={h:rgb(40,30,30),g:rgb(184,184,190),f:rgb(226,180,146),F:rgb(172,128,98),k:rgb(30,28,34),B:rgb(42,82,152),b:rgb(26,50,100),e:rgb(150,255,140),y:rgb(212,172,62),C:rgb(172,30,36),c:rgb(110,18,24)};

// animation rig entry (see render/rig.js)
ANIM.strange={leg:13,mid:6,armC:'BBb',tipC:'kkk',aw:2,al:5,fs:2,sh:[10,7],hide:rect(10,11,7,11),blink:null,cape:'Cc'};
const STRANGE_POWERS=[
 {n:'Bolts of Balthakk',fn:(a,p,use)=>{if(!use(7))return;ST.cd=12;for(let k=0;k<3;k++)shots.push({x:a.h.x,y:a.h.y,vx:a.dx*4.5+(R()-.5)*2.5,vy:a.dy*4.5+(R()-.5)*2.5,type:'mbolt',life:150,col:[255,190,70],ecol:[255,190,70],boom:5,home:true,delay:k*3});}},
 // a pair of sling-ring portals. Anything that falls, flows, flies or walks into the blue one comes out of the orange one
 {n:'Portals',fn:(a,p,use)=>{if(!use(15))return;ST.cd=14;const k=portals.next,P={x:mouse.wx,y:mouse.wy,r:11,life:1800};portals[k]=P;portals.next=k==='a'?'b':'a';
   fxWord(P.x,P.y-16,k==='a'?'IN':'OUT',.9,k==='a'?'#7fd6ff':'#ffb340',true);snd('psi',P.x,P.y,{pitch:k==='a'?1.4:1});for(let n=0;n<30;n++){const an=R()*6.283;spawn(P.x+Math.cos(an)*P.r,P.y+Math.sin(an)*P.r*1.4,(R()-.5),(R()-.5),k==='a'?rgb(110,200,255):rgb(255,170,60),20,0,1,0,1);}}},
 // the Crimson Bands of Cyttorak close on the cursor: everything inside is crushed to rubble
 {n:'Crimson Crush',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;const cx=mouse.wx,cy=mouse.wy;let k=0,r=46;fxWord(cx,cy-40,'BY THE CRIMSON BANDS!',1.1,'#ff6b5c',true);snd('clang',cx,cy,{v:.6});
   ACT.push(()=>{k++;r-=1.6;for(let n=0;n<3;n++)rings.push({x:cx,y:cy,r:r+n*2,vr:0,life:2,c:[255,60,50]});
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+e.def.w/2){e.vx+=(cx-e.x)*.05;e.vy+=(cy-e.y)*.05;e.frozen=Math.max(e.frozen||0,4);if(k%5===0)hitEnemy(e,6,0,0);}
     for(const b of bodies)if(!b.held&&Math.hypot(b.x-cx,b.y-cy)<r+b.rmax){b.vx+=(cx-b.x)*.04;b.vy+=(cy-b.y)*.04;}
     if(r>8)return true;quake(cx,cy,{col:[255,80,60],r:32});damageEnemies(cx,cy,40,50,0,-4,true);return false;});}},
 // a golden whip of eldritch energy that cuts a curved line and drags what it hits toward him
 {n:'Eldritch Whip',fn:(a,p,use)=>{if(!use(10))return;ST.cd=18;const h=hand(),base=Math.atan2(a.dy,a.dx);let k=0;snd('slash',h.x,h.y,{pitch:.7});
   ACT.push(()=>{k++;const hh=hand(),pts=[[hh.x,hh.y]],sw=base-.9+k/8*1.8;for(let s=1;s<=10;s++){const f=s/10,an=sw+Math.sin(f*Math.PI)*(.6-k*.08);pts.push([hh.x+Math.cos(an)*70*f,hh.y+Math.sin(an)*70*f]);}
     beams.push({pts,life:1,c:[255,230,150],g:[255,170,40]});for(const [x,y] of pts){const X=x|0,Y=y|0;if(X>0&&X<W-1&&Y>0&&Y<H-44){const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F&&m!==OBSID){if(R()<.4)spawn(X,Y,(R()-.5)*2,-R()*2,col[Y*W+X],40,KIND[m]===S?RUBBLE:m,0);setc(Y*W+X,EMPTY);}}
       const e=enemyAt(x,y,2);if(e&&!(e.mem.whipT>ST.frame)){e.mem.whipT=ST.frame+8;hitEnemy(e,18,(pl_.x-e.x)*.04,-1.5);}}
     return k<8;});}},
 // turn the city around the cursor into mirror-glass, then shatter it
 {n:'Mirror Shatter',fn:(a,p,use)=>{if(!use(34))return;ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,r=30;let k=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){setc(i,GLASS);col[i]=(x+y)&3?rgb(200,220,240):rgb(255,230,160);}}
   fxWord(cx,cy-r-6,'MIRROR DIMENSION',1.1,'#ffc93c',true);snd('psi',cx,cy,{pitch:.4});
   ACT.push(()=>{if(++k<30)return true;for(let n=0;n<10;n++){const an=R()*6.283,d=R()*r;explode(cx+Math.cos(an)*d|0,cy+Math.sin(an)*d|0,7,{self:true,quiet:n>0,col:[220,235,255]});}damageEnemies(cx,cy,r+10,45,0,-4,true);fxWord(cx,cy-r-6,'SHATTER!',1.4,'#d8e4ff',true);snd('glass',cx,cy,{size:2});ST.shake=Math.max(ST.shake,12);return false;});}},
 // a floating golden mandala you (and anything else) can stand on, for eight seconds
 {n:'Seraphim Disc',fn:(a,p,use)=>{if(!use(15))return;ST.cd=20;const cx=mouse.wx|0,cy=mouse.wy|0;
   for(let x=-14;x<=14;x++)for(let y=0;y<2;y++){const X=cx+x,Y=cy+y+(Math.abs(x)>11?1:0);if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X;if(t[i]&&KIND[t[i]]!==G&&KIND[t[i]]!==F)continue;setc(i,NEON);col[i]=(x+y)&1?rgb(255,200,80):rgb(255,150,40);pin[i]=3;slide.push([i,ST.frame+480+(R()*20|0)]);}
   fxWord(cx,cy-12,'SERAPHIM!',.9,'#ffc93c',true);snd('psi',cx,cy,{pitch:1.6});}},
 // fold space: the block under the cursor flips upside down, buildings and all
 {n:'Mirror Fold',fn:(a,p,use)=>{if(mouse.wy<-20||!use(32))return; // nothing to fold up in the open sky
  ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,R2=24,x0=Math.max(1,cx-R2),x1=Math.min(W-2,cx+R2),y0=Math.max(1,cy-R2),y1=Math.min(H-46,cy+R2);
   const w=x1-x0+1,h=y1-y0+1,tt=new Uint8Array(w*h),cc=new Uint32Array(w*h),bb=new Uint32Array(w*h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y0+y)*W+x0+x;tt[y*w+x]=t[i];cc[y*w+x]=col[i];bb[y*w+x]=bg[i];}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y0+y)*W+x0+x,o=(h-1-y)*w+(w-1-x);setc(i,tt[o]);col[i]=cc[o];bg[i]=bb[o];bgB[i]=bg[i]!==bgD[i]?1:0;}
   for(let k=0;k<4;k++)beams.push({x0:k<2?x0:x1,y0:y0,x1:k%2?x0:x1,y1:y1,life:8,w:0,c:[255,220,140],g:[255,170,40]});shockFx(cx,cy,.8);fxWord(cx,cy-R2-6,'MIRROR DIMENSION',1.1,'#ffc93c',true);snd('psi',cx,cy,{pitch:.4});}},
 // banish foes into another dimension for five seconds; they come back battered
 {n:'Banish',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy;let n=0;
   for(let k=enemies.length-1;k>=0;k--){const e=enemies[k];if(Math.hypot(e.x-cx,e.y-cy)>50+e.def.w/2||e.grabbed)continue;if(e.def.title){hitEnemy(e,120,0,0);continue;}limbo.push({e,t:300});enemies.splice(k,1);n++;
     for(let q2=0;q2<20;q2++){const an=R()*6.283;spawn(e.x,e.y,Math.cos(an)*2,Math.sin(an)*2,rgb(255,190,70),18,0,1,0,1);}}
   rings.push({x:cx,y:cy,r:50,vr:-4,life:12,c:[255,190,70]});fxWord(cx,cy-30,n?'BEGONE!':'...',1.2,'#ffc93c',true);snd('screech',cx,cy,{pitch:.8,v:.6});}},
 // golden pillars burst up out of the street across the cursor, launching everything above them
 {n:'Pillars of Vishanti',fn:(a,p,use)=>{if(!use(36))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy;let k=0;fxWord(cx,cy-30,'PILLARS OF VISHANTI!',1.1,'#ffc93c',true);
   ACT.push(()=>{if(k%6===0){const x=cx+(k/6-2)*22,gy=groundBelow(x,cy-40);if(gy<H-46){const n=solidCells(x,gy+6,8,false);if(n>=12){const b=makeBody(q,n,false);if(b){b.vy=-9-R()*3;b.vx=(R()-.5)*2;b.va=(R()-.5)*.2;b.thrown=true;b.safeP=ST.frame+20;}}
       explode(x|0,gy|0,7,{self:true,quiet:true,col:[255,200,80]});damageEnemies(x,gy-20,14,30,0,-8);beams.push({x0:x,y0:gy,x1:x,y1:gy-90,life:10,w:2,c:[255,240,180],g:[255,170,40]});ST.shake=Math.max(ST.shake,6);snd('slam',x,gy,{size:.7});}}
     return++k<30;});}},
 // a warded dome: enemy fire dies against it and enemies are thrown out of it
 {n:'Ward of Vishanti',fn:(a,p,use)=>{if(!use(35))return;ST.cd=70;const W0={x:mouse.wx,y:mouse.wy,r:46};let k=0;fxWord(W0.x,W0.y-50,'WARD OF VISHANTI',1,'#ffc93c',true);snd('charge',W0.x,W0.y,{pitch:1.2});
   ACT.push(()=>{k++;for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-W0.x,s.y-W0.y)<W0.r){flash(s.x,s.y,6,[255,200,80],2);shots.splice(n,1);}}
     for(const e of enemies){const dx=e.x-W0.x,dy=e.y-W0.y,d=Math.hypot(dx,dy)||1;if(d<W0.r+e.def.w/2){e.vx+=dx/d*1.2;e.vy+=dy/d*1.2;if(ST.frame%10===0)hitEnemy(e,3,0,0);}}
     if(k%2===0){const an=k*.2;for(let q2=0;q2<6;q2++){const a2=an+q2*1.047;spawn(W0.x+Math.cos(a2)*W0.r,W0.y+Math.sin(a2)*W0.r,0,0,rgb(255,200,80),6,0,1,0,1);}}return k<480;});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_STRANGE={id:'strange',name:'Doctor Strange',spr:SPR_STRANGE,pal:PAL_STRANGE,pw:7,ph:19,fly:true,fs:3.0,boost:2.1,run:1.9,jump:4.6,hp:310,armor:.8,glow:[255,190,70],cape:null,thrust:()=>R()<.5?rgb(255,190,80):rgb(255,120,40),powers:STRANGE_POWERS};
