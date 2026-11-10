// Wolverine: sprite, palette, rig entry, powers and roster entry.
import './ironman.js'; // evaluation order: runs after heroes/ironman.js
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { afters, flash, fxBurst, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { pickC, scriptMove, surfaceY } from './powers.js';
import { ACT, clawSlash, slashFx } from './xmen.js';
import { carve, hand, mouse } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy } from '../enemies/core.js';
import { sliceLine } from '../world/slice.js';
import { solidCells } from './wave2.js';
import { t } from '../world/grid.js';
import { q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { fxSlash } from '../render/vfxcore.js';


const WOLV_POWERS=[
 {n:'Claw Fury',fn:(a,p,use)=>{if(!use(3))return;if(!p.clawT||ST.frame-p.clawT>30)fxWord(a.h.x,a.h.y-14,'SNIKT!',1.1,'#f3e9d2',true);else if(R()<.3)fxWord(a.h.x+a.dx*14,a.h.y-8,R()<.5?'SHKK!':'SKRITCH!',.75,'#f3e9d2');p.clawT=ST.frame;clawSlash(a,p);ST.cd=7;}},
 {n:'Berserker Rage',fn:(a,p,use)=>{if(p.rage>0||!use(30))return;p.rage=300;ST.cd=30;fxWord(p.x,p.y-ST.PH-10,'RRAAAGH!',1.5,'#e23b2e',true);fxBurst(p.x,p.y-ST.PH/2,40,'#e23b2e');ST.shake+=8;flash(p.x,p.y-ST.PH/2,40,[255,60,40],10);}},
 {n:'Feral Pounce',fn:(a,p,use)=>{if(!p.ground||!use(12))return;const s=Math.min(1,a.d/110);p.vx=a.dx*(5+3*s);p.vy=Math.min(-2.5,a.dy*5-2.5);p.ground=false;p.pounce=true;ST.cd=26;fxWord(p.x,p.y-ST.PH-6,'SNIKT!',1,'#f3e9d2',true);
   ACT.push(()=>{if(p.ground||!p.pounce){p.pounce=false;return false;}const h=hand();carve(h.x,h.y,4.5,p.vx,p.vy);damageEnemies(h.x,h.y,9,6,p.vx*.6,p.vy*.6);if(ST.frame%3===0){afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:10});slashFx(h.x,h.y,Math.atan2(p.vy,p.vx));}return true;});}},
 {n:'Adamantium Drill',fn:(a,p,use)=>{if(!use(.6))return;p.drillD=Math.min(44,(p.drillT===ST.frame-1?p.drillD||0:0)+2.5);p.drillT=ST.frame;
   for(let d=4;d<p.drillD;d+=3){const X=a.h.x+a.dx*d,Y=a.h.y+a.dy*d;carve(X,Y,4.2,a.dx*3,a.dy*3);}
   const X=a.h.x+a.dx*p.drillD,Y=a.h.y+a.dy*p.drillD;for(let k=0;k<6;k++)spawn(X,Y,(R()-.5)*5-a.dx*2,(R()-.5)*5-a.dy*2,R()<.6?rgb(255,230,150):rgb(230,236,245),10+R()*10,0,1,1);
   damageLine(a.h.x,a.h.y,X,Y,6,2.5);if(ST.frame%18===0)fxWord(X,Y-8,'KRRRSSH!',.8,'#f3e9d2',true);ST.shake=Math.max(ST.shake,2.5);}},
 {n:'Healing Factor',fn:(a,p,use)=>{if(p.hp>=ST.CH.hp||!use(.5))return;p.hp=Math.min(ST.CH.hp,p.hp+1.6);if(ST.frame%3===0)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,0,-.7,R()<.5?rgb(255,220,120):rgb(255,255,220),20,0,1,0);if(ST.frame%40===0)fxWord(p.x,p.y-ST.PH-8,'HNNGH!',.8,'#ffc93c',true);}},
 {n:'Rising Slash',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;p.vy=-6.2;p.ground=false;p.pounce=true;fxWord(p.x,p.y-ST.PH-8,'SHKRAKK!',1.1,'#f3e9d2',true);let k=0;
   ACT.push(()=>{const h={x:p.x+p.face*3,y:p.y-ST.PH*.6};clawSlash({h,dx:p.face*.3,dy:-1},p);for(const e of enemies)if(Math.abs(e.x-p.x)<14&&Math.abs(e.y-(p.y-ST.PH/2))<20){e.vy=-5;}return++k<10&&!p.ground;});}},
 {n:'Whirlwind',fn:(a,p,use)=>{if(!use(16))return;ST.cd=34;let k=0;fxWord(p.x,p.y-ST.PH-8,'SNIKT-SNIKT!',1.1,'#f3e9d2',true);
   ACT.push(()=>{const an=k*.9,h={x:p.x,y:p.y-ST.PH/2};clawSlash({h,dx:Math.cos(an),dy:Math.sin(an)},p);p.face=Math.cos(an)<0?-1:1;return++k<14;});}},
 {n:'Feral Senses',fn:(a,p,use)=>{if(ST.senseT>0||!use(20))return;ST.senseT=600;ST.cd=30;fxWord(p.x,p.y-ST.PH-8,'*SNIFF*',1,'#ffc93c',true);rings.push({x:p.x,y:p.y-ST.PH/2,r:4,vr:6,life:20,c:[255,200,80]});}},
 {n:'Fastball Special',fn:(a,p,use)=>{if(!use(28))return;ST.cd=60;const dx=a.dx,dy=a.dy;let k=0;fxWord(p.x,p.y-ST.PH-10,'FASTBALL SPECIAL!',1.4,'#ffc93c',true);p.fly=false;ST.shake+=6;
   ACT.push(()=>{p.vx=dx*8;p.vy=dy*8;const hx=p.x+dx*8,hy=p.y-ST.PH/2+dy*8;carve(hx,hy,7,dx*6,dy*6);damageEnemies(hx,hy,12,30,dx*6,dy*6);if(k%2===0){afters.push({x:p.x,y:p.y,ang:Math.atan2(dx,-dy),face:p.face,life:12});slashFx(hx,hy,Math.atan2(dy,dx));}
     if(++k>=26){explode(hx|0,hy|0,12,{self:true,col:[255,220,80],word:'SNIKT!!'});p.vx*=.3;p.vy=Math.min(p.vy,0);return false;}return true;});}},
 {n:'Adamantium Skeleton',fn:(a,p,use)=>{if(p.metal>0||!use(35))return;p.metal=300;ST.cd=40;fxWord(p.x,p.y-ST.PH-10,'KLANNNG!',1.4,'#d8e4ff',true);flash(p.x,p.y-ST.PH/2,40,[220,230,255],8);rings.push({x:p.x,y:p.y-ST.PH/2,r:4,vr:3,life:12,c:[220,230,255]});}},
 // for six seconds nothing can put him down; afterwards the healing factor repays most of the damage
 {n:'Not Today',fn:(a,p,use)=>{if(p.grit>0||!use(35))return;ST.cd=60;p.grit=360;p.gritD=0;fxWord(p.x,p.y-ST.PH-10,'NOT TODAY, BUB!',1.3,'#e23b2e',true);fxBurst(p.x,p.y-ST.PH/2,40,'#e23b2e');flash(p.x,p.y-ST.PH/2,40,[255,60,40],8);snd('roar',p.x,p.y,{v:.5,pitch:1.4});}},
 // curled into a spinning ball of claws he bounces off everything, cutting as he goes
 {n:'Snikt Ball',fn:(a,p,use)=>{if(!use(16))return;ST.cd=40;let vx=a.dx*7,vy=a.dy*7,k=0;fxWord(p.x,p.y-ST.PH-8,'SNIKT-SNIKT-SNIKT!',1,'#f3e9d2',true);
   ACT.push(()=>{k++;p.script=2;vy+=.25;const ox=p.x,oy=p.y;if(!scriptMove(p,vx,0))vx=-vx*.9;if(!scriptMove(p,0,vy)){vy=-vy*.85;if(Math.abs(vy)<2)vy=-4;}
     const cy=p.y-ST.PH/2,an=k*1.1;for(let j=0;j<2;j++){const b=an+j*Math.PI;sliceLine(p.x,cy,p.x+Math.cos(b)*14,cy+Math.sin(b)*14,{edge:[236,238,250],quiet:true,push:1});}
     damageEnemies(p.x,cy,12,7,vx*.5,vy*.5);if(k%3===0)afters.push({x:p.x,y:p.y,ang:an,face:p.face,life:8});return k<70;});}},
 // the claws go into the ground and he wrenches up the slab he is standing on
 {n:'Adamantium Anchor',fn:(a,p,use)=>{const gx=p.x+p.face*10,gy=surfaceY(gx|0,Math.max(0,p.y-4|0),20);const n0=solidCells(gx,gy+8,14,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n<30){fxWord(p.x,p.y-ST.PH-6,'NO GRIP',.7,'#f3e9d2',true);return;}if(!use(20))return;ST.cd=40;
   const b=makeBody(q,n,false);if(!b)return;const dx=mouse.wx-b.x,dy=mouse.wy-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*7;b.vy=dy/d*7-3;b.va=(R()-.5)*.2;b.thrown=true;b.safeP=ST.frame+30;fxWord(gx,gy-14,'HRRRAGH!',1.1,'#f3e9d2',true);snd('rip',gx,gy);ST.shake=Math.max(ST.shake,6);}},
 {n:'X-Slash',fn:(a,p,use)=>{if(!use(12))return;ST.cd=26;const f=p.face,cx=p.x+f*24,cy=p.y-ST.PH/2,L=34;let k=0;
    ACT.push(()=>{k++;if(k===1||k===6){const s=k===1?1:-1,x0=cx-L*.7,y0=cy-s*L*.7,x1=cx+L*.7,y1=cy+s*L*.7;sliceLine(x0,y0,x1,y1,{edge:[230,232,240],push:1.2});damageLine(x0,y0,x1,y1,6,16);fxSlash(cx,cy,Math.atan2(y1-y0,x1-x0),L,[230,232,240]);snd('slash',cx,cy);}
      if(k===6){damageLine(cx-L*.6,cy,cx+L*.6,cy,5,12);fxWord(cx,cy-24,'SNIKT-SNIKT!',1,'#ffd34a',true);}return k<8;});}},
 // a frenzy of dashes from foe to foe, a claw strike on each
 {n:'Berserker Barrage',ult:true,fn:(a,p,use)=>{const pool=enemies.filter(e=>e.hp>0&&!e.grabbed&&Math.hypot(e.x-p.x,e.y-p.y)<220),list=[];let cx=p.x,cy=p.y;
   while(list.length<6&&pool.length){let bi=0,bd=1e9;pool.forEach((e,i)=>{const d=Math.hypot(e.x-cx,e.y-cy);if(d<bd){bd=d;bi=i;}});const e=pool.splice(bi,1)[0];list.push({e});cx=e.x;cy=e.y;}
   if(!list.length)for(let k=1;k<=3;k++)list.push({x:p.x+a.dx*k*40,y:p.y+a.dy*k*40});
   if(!use(30))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'BERSERKER BARRAGE!',1.2,'#e23b2e',true);snd('roar',p.x,p.y,{v:.6,pitch:1.3});let idx=0,f=0,from={x:p.x,y:p.y};
   ACT.push(()=>{p.script=2;p.dodge=4;const tg=list[idx];if(tg.e&&(tg.e.hp<=0||!enemies.includes(tg.e))){tg.x=tg.e.x;tg.y=tg.e.y+tg.e.def.h/2;tg.e=null;}
     const tx=tg.e?tg.e.x-Math.sign((tg.e.x-from.x)||1)*(tg.e.def.w/2+3):tg.x,ty=tg.e?tg.e.y+tg.e.def.h/2:tg.y;
     f++;const u=Math.min(1,f/6);p.x=from.x+(tx-from.x)*u;p.y=from.y+(ty-from.y)*u;p.face=tx>=from.x?1:-1;
     if(f%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});spawn(p.x,p.y-ST.PH/2,(R()-.5)*2,(R()-.5)*2,rgb(255,230,150),8,0,1,0,1);
     if(f>=6){const h={x:p.x+p.face*4,y:p.y-ST.PH/2},ang=tg.e?Math.atan2(tg.e.y-h.y,tg.e.x-h.x):Math.atan2(a.dy,a.dx);clawSlash({h,dx:Math.cos(ang),dy:Math.sin(ang)},p);
       if(tg.e&&tg.e.hp>0)hitEnemy(tg.e,26,p.face*3,-3);fxWord(p.x,p.y-ST.PH-6,['SNIKT!','SHKK!','RRAH!','SKRITCH!'][idx%4],.9,'#f3e9d2',true);ST.hitstop=Math.max(ST.hitstop,2);ST.shake+=3;
       idx++;f=0;from={x:p.x,y:p.y};if(idx>=list.length){p.script=0;p.vy=-2.5;p.vx=0;p.dodge=12;p.punchF=6;return false;}}
     return true;});}}
];




// roster entry (CHARS in heroes/index.js)
export const CHAR_WOLVERINE={id:'wolverine',name:'Wolverine',pw:7,ph:17,fly:false,fs:2.6,boost:1,run:2.4,jump:5.4,hp:420,armor:.6,glow:[255,220,80],cape:null,thrust:()=>pickC([255,220,80]),powers:WOLV_POWERS};
