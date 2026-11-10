// Invisible Woman: sprite, palette, rig entry, powers and roster entry.
import './reed.js'; // evaluation order: runs after heroes/reed.js
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import '../render/rig.js'; // kept for evaluation order
import { snd } from '../sfx.js';
import { beamCore, pickC, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { SUEC } from './f4.js';
import { carve, mouse } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { sliceLine } from '../world/slice.js';
import { atCursor, noTarget } from './kitlib.js';


const SUE_POWERS=[
 {n:'Force Blast',fn:(a,p,use)=>{if(!use(6))return;ST.cd=10;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'force',life:100,boom:10,col:SUEC,ecol:SUEC});flash(a.h.x,a.h.y,10,SUEC,3);}},
 // an invisible wall shoves forward, bulldozing everything in its path
 {n:'Force Ram',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;const dir=a.dx<0?-1:1;let x=p.x+dir*10,k=0;const y0=p.y-ST.PH/2;fxWord(p.x,p.y-ST.PH-8,'SHOVE!',1,'#aee0ff',true);snd('wave',p.x,p.y);
   ACT.push(()=>{k++;x+=dir*6;for(let yy=-26;yy<=26;yy+=8)carve(x,y0+yy,5,dir*6,-1);beams.push({x0:x,y0:y0-28,x1:x,y1:y0+28,life:1,w:2,c:[220,245,255],g:SUEC});
     for(const e of enemies)if(Math.abs(e.x-x)<10&&Math.abs(e.y-y0)<34)hitEnemy(e,5,dir*7,-2);for(const b of bodies)if(!b.held&&Math.abs(b.x-x)<b.rmax+6&&Math.abs(b.y-y0)<40){b.vx+=dir*3;b.thrown=true;}ST.shake=Math.max(ST.shake,3);return k<26;});}},
 // a force bubble closes on the cursor, crushing what is inside, then implodes
 {n:'Crushing Bubble',fn:(a,p,use)=>{if(!use(28))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy;let k=0;fxWord(cx,cy-36,'CRUSH!',1.1,'#aee0ff',true);
   ACT.push(()=>{k++;const r=34-k;rings.push({x:cx,y:cy,r,vr:0,life:2,c:SUEC});if(k%2===0)for(let j=0;j<10;j++){const an=R()*6.283;carve(cx+Math.cos(an)*r,cy+Math.sin(an)*r,3,-Math.cos(an)*2,-Math.sin(an)*2);}
     for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<r+6){e.vx+=(cx-e.x)*.05;e.vy+=(cy-e.y)*.05;hitEnemy(e,1.5,0,0);}}
     if(k>=28){explode(cx|0,cy|0,18,{self:true,col:SUEC,word:'IMPLODE!'});return false;}return true;});}},
 // a ring of force detonates all around her
 {n:'Force Burst',fn:(a,p,use)=>{if(!use(24))return;ST.cd=40;const cx=p.x,cy=p.y-ST.PH/2;for(let j=0;j<10;j++){const an=j/10*6.283;explode(cx+Math.cos(an)*30|0,cy+Math.sin(an)*30|0,8,{self:true,quiet:j>0,col:SUEC});}
   for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<110){e.vx+=dx/d*7;e.vy+=dy/d*7-2;hitEnemy(e,16,0,0);}}rings.push({x:cx,y:cy,r:8,vr:5,life:16,c:SUEC});shockFx(cx,cy,1);fxWord(cx,cy-30,'FWOOMPH!',1.2,'#aee0ff',true);}},
 {n:'Force Spikes',fn:(a,p,use)=>{if(!use(14))return;ST.cd=24;const base=Math.atan2(a.dy,a.dx);for(let j=-3;j<=3;j++){const an=base+j*.09;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(an)*8,vy:Math.sin(an)*8,type:'force',life:90,boom:6,col:SUEC,ecol:SUEC});}fxWord(a.h.x,a.h.y-14,'SHNK-SHNK!',.9,'#aee0ff',true);}},
 // lift a whole block of building into the air... and drop it
 {n:'Lift & Slam',fn:(a,p,use)=>{const cx=mouse.wx|0,cy=mouse.wy|0,n0=solidCells(cx,cy,18,false);if(n0<50||!use(32))return;ST.cd=60;const b=makeBody(q,n0,true);if(!b)return;b.tx=cx;b.ty=cy-70;let k=0;fxWord(cx,cy-30,'UP...',1,'#aee0ff',true);snd('psi',cx,cy);
   ACT.push(()=>{k++;if(!bodies.includes(b))return false;if(k<45){b.tx=cx;b.ty=cy-70;if(k%3===0)rings.push({x:b.x,y:b.y,r:b.rmax+4,vr:0,life:3,c:SUEC});return true;}b.held=false;b.vx=0;b.vy=11;b.thrown=true;b.safeP=ST.frame+40;fxWord(b.x,b.y-20,'...AND DOWN!',1.1,'#aee0ff',true);return false;});}},
 // a force wedge punches up from under the street, throwing slabs of it skyward
 {n:'Force Geyser',fn:(a,p,use)=>{if(!use(26))return;ST.cd=45;const cx=mouse.wx|0,gy=groundBelow(cx,mouse.wy);fxWord(cx,gy-30,'ERUPT!',1.2,'#aee0ff',true);snd('boom',cx,gy,{size:.8});
   for(let j=0;j<3;j++){const n0=solidCells(cx+(j-1)*16,gy+6,8,true);let n=0;for(let i=0;i<n0;i++)if(KIND[t[q[i]]]===S)q[n++]=q[i];const b=n>=14?makeBody(q,n,false):null;if(b){b.vy=-8-R()*3;b.vx=(j-1)*1.5;b.va=(R()-.5)*.2;b.thrown=true;b.safeP=ST.frame+40;}}
   explode(cx,gy|0,10,{self:true,col:SUEC});for(const e of enemies)if(Math.abs(e.x-cx)<40&&Math.abs(e.y-gy)<50){e.vy=-8;hitEnemy(e,20,0,-4);}beams.push({x0:cx,y0:gy,x1:cx,y1:gy-90,life:6,w:6,c:[220,245,255],g:SUEC});}},
 // six invisible force charges, set off one after another
 {n:'Invisible Mines',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy,ms=[];for(let j=0;j<6;j++)ms.push([cx+(R()-.5)*90,cy+(R()-.5)*50,30+j*8]);let k=0;fxWord(cx,cy-30,'NOW YOU SEE IT...',1,'#aee0ff',true);
   ACT.push(()=>{k++;for(const m of ms){if(m[2]===k)explode(m[0]|0,m[1]|0,11,{self:true,col:SUEC});else if(m[2]>k&&k%6===0)spawn(m[0],m[1],0,0,rgb(200,235,255),4,0,1,0,1);}return k<80;});}},
 // hold: a thin, unbreakable lance of force that bores through the city
 {n:'Force Lance',fn:(a,p,use)=>{if(!use(.8))return;beamCore(a,{pow:220,rad:2,len:420,w:2,c:[230,248,255],g:SUEC,spark:()=>rgb(200,235,255),dmg:4,noAsh:true});}},
 // a force field thin as a razor: one long clean cut through whatever is in front of her
 {n:'Force Blade',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;const h=a.h,L=260;sliceLine(h.x,h.y,h.x+a.dx*L,h.y+a.dy*L,{edge:[170,220,255],w:1,push:1.4});damageLine(h.x,h.y,h.x+a.dx*L,h.y+a.dy*L,5,26);snd('slash',h.x,h.y,{pitch:1.5});}},
 // rings of force ripple out from her and push everything away
 {n:'Force Ripples',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;let k=0;const cx=p.x,cy=p.y-ST.PH/2;
   ACT.push(()=>{k++;if(k%10===1){const r0=6;rings.push({x:cx,y:cy,r:r0,vr:3.4*ST.aoeC,life:24,c:[170,220,255]});}const band=(k%10)*3.4*ST.aoeC+6;
     for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(Math.abs(d-band)<b.rmax+6){b.vx+=dx/d*.9;b.vy+=dy/d*.9-.2;b.rest=0;}}
     if(k%10===5)for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<band+8&&d>band-30)hitEnemy(e,8,dx/d*4,dy/d*4-1);}return k<40;});}},
 // invisible steps: for five seconds she can stand and jump on thin air (crouch to drop)
  {n:'Force Steps',fn:(a,p,use)=>{if(p.fsteps>0||!use(14))return;ST.cd=40;p.fsteps=300;fxWord(p.x,p.y-ST.PH-10,'INVISIBLE STAIRS',.9,'#9ec8ff',true);
    ACT.push(()=>{if(--p.fsteps<=0||ST.CH.id!=='sue'){p.fsteps=0;return false;}if(!p.ground&&p.vy>0&&!(p.crouch>0)){p.vy=0;p.ground=true;if(ST.frame%3===0)for(let x=-6;x<=6;x+=3)spawn(p.x+x,p.y+1,0,0,rgb(150,200,255),4,0,1,0,0);}return true;});}},
 // a force bubble inside the enemy, swelling until it bursts
  {n:'Inner Bubble',fn:(a,p,use)=>{const e=atCursor(60);if(!e){noTarget('#9ec8ff');return;}if(!use(24))return;ST.cd=50;let k=0;fxWord(e.x,e.y-e.def.h/2-8,'HOLD STILL.',.9,'#9ec8ff',true);
    ACT.push(()=>{k++;if(e.hp<=0)return false;if(!e.def.titan)e.frozen=Math.max(e.frozen||0,2);if(k%2===0)rings.push({x:e.x,y:e.y,r:2+k*.4,vr:0,life:2,c:[150,200,255]});if(k<40)return true;
      hitEnemy(e,e.def.titan?40:55,0,-3);damageEnemies(e.x,e.y,30,14,0,-3,true);rings.push({x:e.x,y:e.y,r:6,vr:4,life:12,c:[150,200,255]});flash(e.x,e.y,30,[150,200,255],8);snd('pop',e.x,e.y,{pitch:.4});return false;});}},
 // everything she has: a force sphere that swells out and levels the block
 {n:'Force Nova',ult:true,fn:(a,p,use)=>{if(!use(55))return;ST.cd=140;const cx=p.x,cy=p.y-ST.PH/2;let k=0;fxWord(cx,cy-40,'ENOUGH!',1.5,'#aee0ff',true);snd('charge',cx,cy);
   ACT.push(()=>{k++;if(k<20){p.vx*=.5;p.vy*=.5;rings.push({x:cx,y:cy,r:50-k*2,vr:0,life:2,c:SUEC});return true;}
     const r=(k-19)*7;for(let j=0;j<8;j++){const an=R()*6.283;explode(cx+Math.cos(an)*r|0,cy+Math.sin(an)*r|0,9,{self:true,quiet:true,col:SUEC});}
     if(k===20){shockFx(cx,cy,1.6);flash(cx,cy,160,SUEC,12);ST.hitstop=Math.max(ST.hitstop,5);}damageEnemies(cx,cy,r+10,6,0,0,true);ST.shake=Math.max(ST.shake,10);return k<34;});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_SUE={id:'sue',name:'Invisible Woman',pw:7,ph:19,fly:false,fs:2.6,boost:1,run:2.0,jump:5.0,hp:310,armor:.75,glow:SUEC,cape:null,thrust:()=>pickC(SUEC),powers:SUE_POWERS};
