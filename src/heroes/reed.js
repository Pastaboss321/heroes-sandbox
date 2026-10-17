// Mister Fantastic: sprite, palette, rig entry, powers and roster entry.
import { F4C, stretchFx } from './f4.js';
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { H } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { pvx, pvy, px, py, spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { crackCell, pickC, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { hurlBody } from './villains.js';
import { carve, hand, mouse } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';

// ---- Fantastic Four (Earth-828): pale-blue retro suits with the white 4; Johnny is all flame; Ben is orange rock in blue trunks
const SPR_REED=[
"....hhhhh....",
"...hhhhhhh...",
"...gffffFg...",
"...ffkfkFF...",
"...fffFFFF...",
"....ffFFF....",
"..bBBNNNBBb..",
".bBBBNWNBBBb.",
".bBBNWNWNBBb.",
".bBBBNWNBBBb.",
".bBBBBNBBBBb.",
".bBBBBBBBBBb.",
".ffNNNNNNNff.",
".FF.BBBBB.FF.",
"....Bb.Bb....",
"....Bb.Bb....",
"...Bb...Bb...",
"...Bb...Bb...",
"...Bb...Bb...",
"..NNN...NNN..",
"..NNN...NNN..",
"..NNN...NNN.."];
const PAL_REED={h:rgb(84,58,40),g:rgb(176,176,182),f:rgb(232,190,156),F:rgb(186,140,110),k:rgb(30,26,30),B:rgb(118,168,206),b:rgb(72,112,156),N:rgb(34,48,82),W:rgb(240,242,248)};

// animation rig entry (see render/rig.js)
ANIM.reed={leg:14,mid:6,armC:'BBb',tipC:'fFF',aw:2,al:7,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const REED_POWERS=[
 // a fist on a forty-foot arm: everything along the reach is punched out and the end explodes
 {n:'Long Arm Punch',fn:(a,p,use)=>{if(!use(8))return;ST.cd=18;p.punchF=10;const L=Math.min(150,Math.max(40,a.d)),x=a.h.x+a.dx*L,y=a.h.y+a.dy*L;
   for(let k=20;k<L;k+=6)carve(a.h.x+a.dx*k,a.h.y+a.dy*k,3,a.dx*4,a.dy*4);stretchFx(a.h.x,a.h.y,x,y,6);
   explode(x|0,y|0,10,{self:true,col:F4C,word:'WHAPP!'});damageLine(a.h.x,a.h.y,x,y,6,18);damageEnemies(x,y,16,30,a.dx*8,a.dy*8-2);snd('punch',x,y);}},
 // both hands swell into one giant mallet and come down on the cursor
 {n:'Hammer Fist',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;const L=Math.min(160,a.d),x=a.h.x+a.dx*L,y=a.h.y+a.dy*L;stretchFx(a.h.x,a.h.y,x,y,10);
   explode(x|0,y|0,16,{self:true,col:F4C,word:'KA-THWOMP!'});for(let k=1;k<8;k++)crackCell(x+(R()-.5)*40|0,y+R()*20|0,R()<.5?-1:1);shockFx(x,y,1);damageEnemies(x,y,34,45,a.dx*6,-4);ST.hitstop=Math.max(ST.hitstop,3);}},
 // an arm whipped through a wide arc, scything through walls
 {n:'Stretch Sweep',fn:(a,p,use)=>{if(!use(18))return;ST.cd=34;const base=Math.atan2(a.dy,a.dx);let k=0;fxWord(p.x,p.y-ST.PH-8,'SWOOSH-KRAK!',1,'#9fd0f0',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{const h=hand(),an=base-1.1+k/16*2.2,L=85,x=h.x+Math.cos(an)*L,y=h.y+Math.sin(an)*L,tx=Math.cos(an+1.57),ty=Math.sin(an+1.57);stretchFx(h.x,h.y,x,y,2);
     for(let r=30;r<=L;r+=11)carve(h.x+Math.cos(an)*r,h.y+Math.sin(an)*r,5,tx*4,ty*4);
     damageEnemies(x,y,14,8,tx*6,-3);for(const b of bodies)if(!b.held&&Math.hypot(b.x-x,b.y-y)<b.rmax+10){b.vx+=tx*5;b.vy-=2;b.thrown=true;}
     ST.shake=Math.max(ST.shake,4);return++k<=16;});}},
 // anchor, stretch back, let go: Reed fires himself through anything in the way
 {n:'Elastic Slingshot',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;let k=0;const dx=a.dx,dy=a.dy;p.ground=false;fxWord(p.x,p.y-ST.PH-8,'BOINNNG!',1.1,'#9fd0f0',true);snd('leap',p.x,p.y);
   ACT.push(()=>{k++;p.vx=dx*8;p.vy=dy*8;p.script=2;carve(p.x+dx*6,p.y-ST.PH/2+dy*6,8,dx*5,dy*5);damageEnemies(p.x,p.y-ST.PH/2,14,10,dx*7,dy*7-2);if(k%3===0)afters.push({x:p.x,y:p.y,ang:0,face:dx<0?-1:1,life:10});
     if(k>=22){explode(p.x|0,p.y-ST.PH/2|0,12,{self:true,col:F4C});p.vx*=.3;p.vy*=.3;return false;}return true;});}},
 // reach out, tear a piece of building off and throw it at the nearest enemy
 {n:'Giant Hands',fn:(a,p,use)=>{const cx=mouse.wx|0,cy=mouse.wy|0;if(Math.hypot(cx-p.x,cy-p.y)>220)return;const n0=solidCells(cx,cy,14,false);if(n0<30||!use(24))return;ST.cd=40;const b=makeBody(q,n0,false);if(!b)return;
   stretchFx(a.h.x,a.h.y,cx,cy,12);b.vy=-6;b.va=(R()-.5)*.2;b.safeP=ST.frame+60;let k=0;fxWord(cx,cy-20,'GOT IT!',1,'#9fd0f0',true);snd('rip',cx,cy);
   ACT.push(()=>{if(!bodies.includes(b))return false;if(++k===14){const e=nearestEnemy(b.x,b.y,400),tx=e?e.x:mouse.wx,ty=e?e.y:mouse.wy;hurlBody(b,tx,ty,10);b.safeP=ST.frame+40;return false;}const h=hand();stretchFx(h.x,h.y,b.x,b.y,1);return true;});}},
 // bounce sky-high and come down flat as a pancake, cratering the street
 {n:'Rubber Crash',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;p.vy=-8;p.vx=Math.sign(mouse.wx-p.x)*Math.min(5,Math.abs(mouse.wx-p.x)/40);p.ground=false;p.slam=true;p.slamOpt={col:F4C,dive:true};p.diveY=p.y-70;fxWord(p.x,p.y-ST.PH-8,'BOING-SPLAT!',1,'#9fd0f0',true);snd('leap',p.x,p.y);}},
 // lasso the top of a building and pull it over
 {n:'Lasso Topple',fn:(a,p,use)=>{const cx=mouse.wx|0,cy=mouse.wy|0;if(Math.hypot(cx-p.x,cy-p.y)>260)return;const n0=solidCells(cx,cy,22,false);if(n0<60||!use(30))return;ST.cd=55;const b=makeBody(q,n0,false);if(!b)return;
   const dir=p.x<b.x?-1:1;b.vx=dir*4;b.vy=-2;b.va=dir*.06;b.thrown=true;b.safeP=ST.frame+60;stretchFx(a.h.x,a.h.y,cx,cy,14);fxWord(cx,cy-30,'TIMBERRR!',1.2,'#9fd0f0',true);snd('rip',cx,cy);ST.shake+=6;}},
 // a stretched fist hammers straight down, again and again, drilling a shaft
 {n:'Pile Driver',fn:(a,p,use)=>{if(!use(28))return;ST.cd=50;const x=mouse.wx|0;let y=Math.max(0,mouse.wy|0)-30,k=0;fxWord(x,y-20,'PILE DRIVER!',1.2,'#9fd0f0',true);
   ACT.push(()=>{if(k%3===0){explode(x+(R()-.5)*4|0,y|0,9,{self:true,quiet:k%9!==0,col:F4C});damageEnemies(x,y,14,14,0,5);const h=hand();stretchFx(h.x,h.y,x,y,3);y+=10;}ST.shake=Math.max(ST.shake,5);return++k<36&&y<H-46;});}},
 // a rift to the Negative Zone drinks in wreckage and enemies, then blows
 {n:'Negative Zone Rift',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;const cx=mouse.wx,cy=mouse.wy;let k=0;fxWord(cx,cy-30,'NEGATIVE ZONE!',1.3,'#c8a0ff',true);snd('psi',cx,cy);
   ACT.push(()=>{k++;for(const b of bodies){if(b.held)continue;const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<170){b.vx+=dx/d*.7;b.vy+=dy/d*.7-.3;b.rest=0;}}
     for(let n=0;n<ST.np;n++){const dx=cx-px[n],dy=cy-py[n],d2=dx*dx+dy*dy;if(d2<28900){const d=Math.sqrt(d2)||1;pvx[n]+=dx/d*.4;pvy[n]+=dy/d*.4-.15;}}
     for(const e of enemies){if(e.def.title)continue;const d=Math.hypot(e.x-cx,e.y-cy);if(d<120){e.vx+=(cx-e.x)*.015;e.vy+=(cy-e.y)*.015;hitEnemy(e,.8,0,0);}}
     if(k%2===0){carve(cx+(R()-.5)*30,cy+(R()-.5)*30,5,0,0);rings.push({x:cx,y:cy,r:40,vr:-3,life:8,c:[170,120,255]});}
     flash(cx,cy,26,[120,60,255],2);if(k>=100){explode(cx|0,cy|0,24,{self:true,col:[170,120,255],word:'KRA-VOOM!'});shockFx(cx,cy,1.2);return false;}return true;});}},
 // the Fantasti-Car makes a bombing run across the cursor
 {n:'Fantasti-Car Run',fn:(a,p,use)=>{if(!use(45))return;ST.cd=120;const dir=mouse.wx>p.x?1:-1;let x=mouse.wx-dir*200,k=0;const y=Math.max(ST.camY+16,mouse.wy-90);fxWord(mouse.wx,y-10,'FANTASTI-CAR!',1.3,'#9fd0f0',true);snd('jet',x,y);
   ACT.push(()=>{k++;x+=dir*7;for(let j=0;j<4;j++)spawn(x-dir*(4+j*3),y+(R()-.5)*3,-dir*2,(R()-.5)*.5,R()<.5?rgb(150,200,240):rgb(255,255,255),12,0,1,0,1);
     beams.push({x0:x-dir*8,y0:y,x1:x+dir*8,y1:y,life:1,w:3,c:[230,236,244],g:[120,180,230]});
     if(k%5===0)shots.push({x,y:y+4,vx:dir*1.5,vy:3,type:'bomb',life:200,boom:12,fire:.2,grav:.2,col:[150,200,240],ecol:[150,200,240]});return k<58;});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_REED={id:'reed',name:'Mr. Fantastic',spr:SPR_REED,pal:PAL_REED,pw:7,ph:19,fly:false,fs:2.6,boost:1,run:2.1,jump:5.2,hp:320,armor:.75,glow:F4C,cape:null,thrust:()=>pickC(F4C),powers:REED_POWERS};
