// Iron Man: sprite, palette, rig entry, powers and roster entry.
import './thor.js'; // evaluation order: runs after heroes/thor.js
import { ST } from '../state.js';
import { EMPTY, GLASS, NEON, R, RUBBLE, STEEL, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxImpact, fxWord, rings } from '../render/fx.js';
import { ANIM, rect } from '../render/rig.js';
import { snd, sndLoop } from '../sfx.js';
import { CYAN, beamCore, isMetal, pickC, shieldAs, shockFx, shots, therm } from './powers.js';
import { aimFrom } from './xmen.js';
import { mouse } from '../player.js';
import { enemies, hitEnemy } from '../enemies/core.js';

const SPR_IRON=[
"....rQRRr....",
"...rQRRRRr...",
"...QGGGGgr...",
"...Q**G**r...",
"...QGGkGgr...",
"....rGGgr....",
"..QRrRRRrRr..",
".QRQRRRRRrRr.",
".QRQR*@*RrRr.",
".QrQRRRRRrRr.",
".GYkYGgGgkYg.",
".GYkrRrRrkYg.",
".Gg.RRrRr.Gg.",
".**.RR.Rr.**.",
"....QR.Rr....",
"....QR.Rr....",
"...GY...Gg...",
"...QR...Rr...",
"...QR...Rr...",
"..QRR...RRr..",
"..QRR...RRr..",
"..rrr...rrr.."];
const PAL_IRON={R:rgb(176,28,28),r:rgb(100,12,16),Q:rgb(232,72,58),G:rgb(214,164,50),Y:rgb(252,216,112),g:rgb(146,104,26),k:rgb(36,12,12),'*':rgb(205,242,255),'@':rgb(225,252,255)};

// animation rig entry (see render/rig.js)
ANIM.iron={leg:14,mid:6,armC:'QRr',tipC:'**G',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const IRON_POWERS=[
 {n:'Repulsor',fn:(a,p,use)=>{if(!use(3))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*8,vy:a.dy*8,type:'repulsor',life:90,boom:6,fire:.05,col:CYAN,ecol:CYAN});ST.cd=7;flash(a.h.x,a.h.y,10,CYAN,3);ST.shake+=.8;}},
 {n:'Unibeam',fn:(a,p,use)=>{if(!use(1.1))return;const c={x:p.x+p.face,y:p.y-ST.PH+8};const dx=mouse.wx-c.x,dy=mouse.wy-c.y,d=Math.hypot(dx,dy)||1;
   beamCore({h:c,dx:dx/d,dy:dy/d},{pow:110,rad:2,len:460,w:3+((ST.frame>>1)&1),c:[235,250,255],g:[110,210,255],spark:()=>pickC(CYAN),dmg:5});p.vx-=dx/d*.15;p.vy-=dy/d*.15;}},
 {n:'Micro Missiles',fn:(a,p,use)=>{if(!use(25))return;for(let k=0;k<10;k++)shots.push({x:p.x,y:p.y-ST.PH+4,vx:(R()-.5)*3,vy:-2-R()*2,type:'missile',life:220,tx:mouse.wx+(R()-.5)*50,ty:mouse.wy+(R()-.5)*30,delay:k*3,wob:R()*6,boom:8,fire:.3,small:true});ST.cd=50;ST.shake+=2;}},
 {n:'Laser Cutter',fn:(a,p,use)=>{if(!use(.5))return;beamCore(a,{pow:240,rad:0,len:520,w:0,c:[255,170,160],g:[255,50,40],spark:()=>rgb(255,120+R()*100,60),dmg:3,noAsh:true});}},
 {n:'Pulse Bomb',fn:(a,p,use)=>{if(!use(20))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*4.5,vy:a.dy*4.5-1.5,type:'bomb',life:240,boom:17,fire:.3,grav:.15,ecol:[255,200,120]});ST.cd=40;}},
];
IRON_POWERS.push(
 {n:'Proton Cannon',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const o={x:p.x-p.face*2,y:p.y-ST.PH+3};const b=aimFrom(o);shots.push({x:o.x,y:o.y,vx:b.dx*4.5,vy:b.dy*4.5,type:'proton',life:240,boom:22,fire:.35,col:[160,240,255],ecol:[160,240,255]});
   p.vx-=b.dx*2.5;p.vy-=b.dy*1.5;flash(o.x,o.y,30,[160,240,255],6);fxWord(o.x,o.y-12,'KA-CHUNK!',1.1,'#bfe3ff',true);ST.shake+=6;}},
 {n:'Flares',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-6,'FFT-FFT-FFT!',.9,'#ffc93c',true);
   for(let k=0;k<14;k++){const an=-Math.PI/2+(R()-.5)*2.6;shots.push({x:p.x,y:p.y-ST.PH/2,vx:Math.cos(an)*(3+R()*3),vy:Math.sin(an)*(3+R()*3),type:'flare',life:70+R()*40|0,grav:.08,col:[255,170,70],boom:3,fire:.6,ecol:[255,170,70]});}
   for(let n=shots.length-1;n>=0;n--){const s2=shots[n];if(s2.owner==='enemy'&&Math.hypot(s2.x-p.x,s2.y-p.y)<90){flash(s2.x,s2.y,8,[255,170,70],3);shots.splice(n,1);}}
   for(const e of enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<110)e.frozen=Math.max(e.frozen||0,45);}},
 {n:'Energy Shield',fn:(a,p,use)=>{if(!use(.5))return;shieldAs([[200,245,255],[80,190,255],[60,170,255]],true);}},
);
IRON_POWERS.push(
 // hold: a magnetic field that only grips metal. Rips steel frames out of buildings, drags robots in
 {n:'Electromagnet',fn:(a,p,use)=>{if(!use(.55))return;const cx=a.h.x,cy=a.h.y,ang=Math.atan2(a.dy,a.dx),R0=170;
   for(let k=0;k<2;k++){const t2=ang+(R()-.5)*.6,d=60+R()*110,pts=[[cx,cy]];for(let s=1;s<=6;s++){const f=s/6,bend=Math.sin(f*Math.PI)*(R()-.5)*20;pts.push([cx+Math.cos(t2)*d*f-Math.sin(t2)*bend,cy+Math.sin(t2)*d*f+Math.cos(t2)*bend]);}beams.push({pts,life:1,c:[190,225,255],g:[70,130,255]});}
   for(let n=0;n<900;n++){const d=8+Math.sqrt(R())*R0,t2=ang+(R()-.5)*.75,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X;if(t[i]!==STEEL)continue;
     if(R()<.1*(1-d/R0)+.015){spawn(X,Y,(cx-X)/d*(3+R()*2),(cy-Y)/d*(3+R()*2)-.3,col[i],70,RUBBLE,0,0,0);setc(i,EMPTY);}}
   for(const e of enemies){if(!isMetal(e)||e.grabbed)continue;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;if(d<R0&&(-dx*a.dx-dy*a.dy)/d>.55){const k=e.def.title?.12:e.def.w>16?.25:.65;e.vx+=dx/d*k;e.vy+=dy/d*k-.05;if(d<16)hitEnemy(e,1.6,0,0);if(ST.frame%4===0)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(170,215,255),8,0,1,0,1);}}
   for(const b of bodies){if(b.held||!(b.st>.12))continue;const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(-dx*a.dx-dy*a.dy)/d>.5){const f=Math.min(1,400/b.n)*.5;b.vx+=dx/d*f;b.vy+=dy/d*f-.25;}}
   sndLoop('mag','hum',cx,cy,{v:.9});if(ST.frame%30===0)fxWord(cx+a.dx*40,cy-10,'VRRRMMM',.8,'#bfe3ff',true);}},
 // knocks every machine nearby offline, fries enemy shots in the air and blows out neon
 {n:'EMP Burst',fn:(a,p,use)=>{if(!use(35))return;ST.cd=70;const cx=p.x,cy=p.y-ST.PH/2,r=150;fxWord(cx,cy-30,'EMP!',1.6,'#bfe3ff',true);fxImpact(cx,cy,3);ST.hitstop=Math.max(ST.hitstop,3);shockFx(cx,cy,.9);
   rings.push({x:cx,y:cy,r:4,vr:6,life:24,c:[150,235,255]},{x:cx,y:cy,r:2,vr:4,life:30,c:[60,140,255]});flash(cx,cy,r,[120,200,255],10);
   let stunned=0;for(const e of enemies){if(Math.hypot(e.x-cx,e.y-cy)>r||!isMetal(e))continue;e.frozen=Math.max(e.frozen||0,e.def.title?70:220);e.emp=e.frozen;hitEnemy(e,10,0,0);stunned++;}
   for(let n=shots.length-1;n>=0;n--){const s2=shots[n];if(s2.owner==='enemy'&&Math.hypot(s2.x-cx,s2.y-cy)<r){spawn(s2.x,s2.y,0,0,rgb(150,230,255),10,0,1,0);shots.splice(n,1);}}
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i]===NEON&&R()<.85){t[i]=GLASS;col[i]=rgb(40,44,58);if(R()<.04)spawn(X,Y,(R()-.5)*2,-R()*2,rgb(255,240,180),12,0,1,1);}}
   if(stunned)fxWord(cx,cy-46,stunned+' OFFLINE',1,'#bfe3ff',true);}},
 // optical camouflage: enemies lose track of you and fire at where you were. Attacking breaks it
 {n:'Stealth Mode',fn:(a,p,use)=>{if(p.stealth>0||!use(28))return;ST.cd=30;p.stealth=420;p.lastSeen={x:p.x,y:p.y-ST.PH/2};fxWord(p.x,p.y-ST.PH-8,'CLOAKED',.9,'#bfe3ff',true);snd('charge',p.x,p.y,{pitch:1.5});
   for(let k=0;k<30;k++)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,(R()-.5)*.6,-R()*.6,rgb(150,230,255),14,0,1,0,1);}},
 // hold: sticky white-hot thermite. It clings where it lands and melts steel into molten metal
 {n:'Thermite',fn:(a,p,use)=>{if(!use(.5))return;for(let k=0;k<2;k++){const sp=4+R()*2.2,s2=(R()-.5)*.35;therm.push({x:a.h.x,y:a.h.y,vx:(a.dx-s2*a.dy)*sp,vy:(a.dy+s2*a.dx)*sp,life:70,stuck:false});}
   sndLoop('therm','flame',a.h.x,a.h.y,{v:.7});flash(a.h.x,a.h.y,10,[255,220,160],2);if(ST.frame%30===0)fxWord(a.h.x+a.dx*30,a.h.y-10,'FSSSSST!',.8,'#ffc93c',true);}},
);

// roster entry (CHARS in heroes/index.js)
export const CHAR_IRON={id:'iron',name:'Iron Man',spr:SPR_IRON,pal:PAL_IRON,pw:7,ph:19,fly:true,fs:3.4,boost:2.3,run:1.8,jump:4.3,hp:300,armor:.8,glow:CYAN,cape:null,thrust:()=>R()<.5?rgb(255,200,120):rgb(255,255,230),powers:IRON_POWERS};
