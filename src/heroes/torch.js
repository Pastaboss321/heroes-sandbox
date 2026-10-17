// Human Torch: sprite, palette, rig entry, powers and roster entry.
import './sue.js'; // evaluation order: runs after heroes/sue.js
import { ST } from '../state.js';
import { FIRE, FLAM, HARD, ICE, KIND, LAVA, OBSID, R, S, SNOW, STEAM, WATER, rgb } from '../world/materials.js';
import { H, W, setc, t } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd, sndLoop } from '../sfx.js';
import { beamCore, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { FC } from './f4.js';
import { carve, mouse } from '../player.js';
import { damageEnemies, enemies, hitEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';

const SPR_TORCH=[
".....*.o.....",
"...o.**O.o...",
"...O*YY*Oo...",
"...OYeYeYo...",
"...OYYYYYo...",
"....OYYYO....",
"..oOO*Y*OOo..",
".oOYO*Y*OYOo.",
".oOYO*Y*OYOo.",
".oOYOO*OOYOo.",
".oOYOOYOOYOo.",
".oOYOOOOOYOo.",
".**.OOOOO.**.",
".oo.OYYYO.oo.",
"....OY.YO....",
"....OY.YO....",
"...OY...YO...",
"...OY...YO...",
"...oO...Oo...",
"..oOO...OOo..",
"...o*...*o...",
"....o...o...."];
const PAL_TORCH={'*':rgb(255,250,220),e:rgb(255,255,255),Y:rgb(255,214,90),O:rgb(255,140,40),o:rgb(214,70,20)};

// animation rig entry (see render/rig.js)
ANIM.torch={leg:14,mid:6,armC:'YOo',tipC:'**O',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const TORCH_POWERS=[
 {n:'Fireball',fn:(a,p,use)=>{if(!use(5))return;ST.cd=8;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'fire',life:100,boom:8,fire:.5,col:FC,ecol:[255,140,40]});flash(a.h.x,a.h.y,8,FC,3);}},
 // hold: a jet of flame that cuts through walls and sets the block alight
 {n:'Flame Stream',fn:(a,p,use)=>{if(!use(.9))return;beamCore(a,{pow:140,rad:2,len:260,w:2+(ST.frame&1),c:[255,230,150],g:[255,110,20],spark:()=>rgb(255,120+R()*120,30),dmg:4});
   const L=Math.min(260,a.d);for(let j=0;j<4;j++){const d=R()*L,X=a.h.x+a.dx*d+(R()-.5)*8|0,Y=a.h.y+a.dy*d+(R()-.5)*8|0;if(X>=0&&X<W&&Y>=0&&Y<H){const i=Y*W+X;if(t[i]===0&&R()<.3)setc(i,FIRE);else if(FLAM[t[i]]>0)ignite(i);}}}},
 {n:'Nova Flare',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;const cx=p.x,cy=p.y-ST.PH/2;explode(cx|0,cy|0,16,{self:true,fire:.5,word:'FWOOOM!'});shockFx(cx,cy,1);for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<90){e.vx+=dx/d*6;e.vy+=dy/d*6-2;hitEnemy(e,14,0,0);}}}},
 // a burning dive: he becomes a missile and punches through buildings
 {n:'Blazing Dive',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;const dx=a.dx,dy=a.dy;let k=0;fxWord(p.x,p.y-ST.PH-8,'FWOOOSH!',1.1,'#ffb347',true);snd('fireburst',p.x,p.y);
   ACT.push(()=>{k++;p.vx=dx*8;p.vy=dy*8;p.script=2;const X=p.x+dx*6,Y=p.y-ST.PH/2+dy*6;carve(X,Y,7,dx*5,dy*5);for(let j=0;j<3;j++){const ix=X+(R()-.5)*14|0,iy=Y+(R()-.5)*14|0;if(ix>=0&&ix<W&&iy>=0&&iy<H&&t[iy*W+ix]===0)setc(iy*W+ix,FIRE);}
     damageEnemies(p.x,p.y-ST.PH/2,14,9,dx*6,dy*6-2);if(k>=20){explode(p.x|0,p.y-ST.PH/2|0,12,{self:true,fire:.5});p.vx*=.3;p.vy*=.3;return false;}return true;});}},
 // a spinning column of fire that follows the cursor and lifts wreckage
 {n:'Fire Tornado',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;let x=mouse.wx;const gy=groundBelow(x|0,mouse.wy);let k=0;fxWord(x,gy-60,'FIRESTORM!',1.2,'#ffb347',true);
   ACT.push(()=>{k++;x+=(mouse.wx-x)*.02;for(let j=0;j<6;j++){const h=R()*90,an=k*.5+h*.15,X=x+Math.cos(an)*(4+h*.18),Y=gy-h;spawn(X,Y,-Math.sin(an)*2,-1.5-R(),rgb(255,100+R()*130|0,30),14,0,1,0,1);}
     if(k%3===0)carve(x+(R()-.5)*16,gy-R()*80,5,(R()-.5)*3,-3);if(k%5===0){const X=x+(R()-.5)*20|0,Y=gy-R()*60|0;if(X>=0&&X<W&&Y>=0&&Y<H&&t[Y*W+X]===0)setc(Y*W+X,FIRE);}
     damageEnemies(x,gy-45,22,1.2,(R()-.5)*2,-2);for(const b of bodies)if(!b.held&&Math.abs(b.x-x)<30&&b.y>gy-100){b.vy-=.6;b.va+=.01;b.rest=0;}ST.shake=Math.max(ST.shake,2);return k<120;});}},
 {n:'Fire Rain',fn:(a,p,use)=>{if(!use(30))return;ST.cd=55;const cx=mouse.wx;let k=0;fxWord(cx,ST.camY+24,'FIRE RAIN!',1.1,'#ffb347',true);
   ACT.push(()=>{if(k%3===0)shots.push({x:cx+(R()-.5)*130,y:ST.camY-6,vx:(R()-.5)*.6,vy:5,type:'fire',life:140,boom:7,fire:.5,col:FC,ecol:[255,130,40],grav:.08});return++k<75;});}},
 // a comet of his own fire, dropped from the sky onto the cursor
 {n:'Comet Strike',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;const tx=mouse.wx,ty=mouse.wy,sx=tx-120,sy=ST.camY-10,d=Math.hypot(tx-sx,ty-sy)||1;fxWord(tx,ty-40,'INCOMING!',1.2,'#ffb347',true);
   shots.push({x:sx,y:sy,vx:(tx-sx)/d*7,vy:(ty-sy)/d*7,type:'fire',life:300,boom:20,fire:.6,col:[255,200,80],ecol:[255,120,30],onHit:s=>{explode(s.x|0,s.y|0,20,{fire:.6,word:'KRA-THOOM!'});shockFx(s.x,s.y,1.3);ST.hitstop=Math.max(ST.hitstop,4);}});}},
 // hold: white-hot heat turns walls into running lava
 {n:'Melt Down',fn:(a,p,use)=>{if(!use(.9))return;const cx=mouse.wx|0,cy=mouse.wy|0;for(let j=0;j<26;j++){const an=R()*6.283,d=R()*14,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];
     if(KIND[m]===S&&m!==OBSID&&R()<.25/(1+HARD[m]*.15))setc(i,FLAM[m]>0?FIRE:LAVA);else if(m===WATER||m===ICE||m===SNOW)setc(i,STEAM);}
   beams.push({x0:a.h.x,y0:a.h.y,x1:cx,y1:cy,life:1,w:1,c:[255,220,140],g:[255,100,20]});flash(cx,cy,16,[255,120,30],2);damageEnemies(cx,cy,16,1.5,0,0);sndLoop('melt','beam',cx,cy,{pitch:.6,v:.5});}},
 {n:'Flame Ring',fn:(a,p,use)=>{if(!use(26))return;ST.cd=45;const cx=p.x,cy=p.y-ST.PH/2;for(let j=0;j<14;j++){const an=j/14*6.283;shots.push({x:cx+Math.cos(an)*6,y:cy+Math.sin(an)*6,vx:Math.cos(an)*6,vy:Math.sin(an)*6,type:'fire',life:70,boom:7,fire:.5,col:FC,ecol:[255,140,40]});}fxWord(cx,cy-30,'RING OF FIRE!',1.1,'#ffb347',true);snd('fireburst',cx,cy);}},
 // he goes nova: a charge-up, then a wave of fire that rolls out over the block
 {n:'Supernova',fn:(a,p,use)=>{if(!use(60))return;ST.cd=160;const cx=p.x,cy=p.y-ST.PH/2;let k=0;fxWord(cx,cy-40,'FLAME ON!',1.6,'#ffb347',true);snd('charge',cx,cy,{pitch:.7});
   ACT.push(()=>{k++;if(k<24){for(let j=0;j<6;j++){const an=R()*6.283;spawn(cx+Math.cos(an)*40,cy+Math.sin(an)*40,-Math.cos(an)*2,-Math.sin(an)*2,rgb(255,200,80),18,0,1,0,1);}flash(cx,cy,k*2,[255,150,40],2);return true;}
     const r=(k-23)*8;for(let j=0;j<7;j++){const an=R()*6.283;explode(cx+Math.cos(an)*r|0,cy+Math.sin(an)*r|0,10,{self:true,quiet:true,fire:.5});}
     if(k===24){explode(cx|0,cy|0,22,{self:true,fire:.6,word:'SUPERNOVA!'});shockFx(cx,cy,1.8);ST.hitstop=Math.max(ST.hitstop,6);}damageEnemies(cx,cy,r+12,8,0,0,true);ST.shake=Math.max(ST.shake,12);return k<38;});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_TORCH={id:'torch',name:'Human Torch',spr:SPR_TORCH,pal:PAL_TORCH,pw:7,ph:19,fly:true,fs:3.4,boost:2.4,run:1.9,jump:4.6,hp:300,armor:.8,glow:FC,cape:null,thrust:()=>R()<.6?rgb(255,150+R()*90|0,40):rgb(255,240,180),powers:TORCH_POWERS};
