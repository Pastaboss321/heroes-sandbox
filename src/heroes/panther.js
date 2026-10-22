// Black Panther: vibranium claws that cut like MOLTYN blades. Every slash leaves a clean kerf through
// walls, ground and falling chunks, so he carves the city into slabs that slide off their cut faces.
// His suit stores the kinetic energy of hits he takes and lands, released as purple shockwaves.
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { afters, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { scriptMove, shockFx, shots, surfaceY } from './powers.js';
import { ACT } from './xmen.js';
import { carve, mouse } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';

const SPR_PANTHER=[
"....k...k....",
"....KKKKK....",
"....LeKeK....",
"....LKKKk....",
".....KKk.....",
"...KsSsSsk...",
".LKKKKsKKKKk.",
".LKLKVKVKKKk.",
".LKLKKVKKKKk.",
".LK.LKVKk.Kk.",
".LK.LKVKk.Kk.",
".ss.SsSsS.sS.",
".SS.LKKKk.SS.",
"....LKKKk....",
"....LK.Kk....",
"....LK.KV....",
"....LK.Kk....",
"...LK...Kk...",
"...LK...KV...",
"...LK...Kk...",
"...KK...Kk...",
"..KKK...KKk.."];
const PAL_PANTHER={k:rgb(14,14,20),K:rgb(38,38,52),L:rgb(78,80,102),s:rgb(204,208,224),S:rgb(132,136,154),V:rgb(170,100,255),e:rgb(232,232,255)};
ANIM.panther={leg:14,mid:6,armC:'LKk',tipC:'sSS',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const VIB=[180,120,255],EDGE=[200,170,255];
const kin=(p,v)=>{p.kin=Math.min(100,(p.kin||0)+v);};
const slashFx=(x,y,ux,uy,len)=>{for(let k=0;k<8;k++){const u=R()*len;spawn(x+ux*u,y+uy*u,(R()-.5)*1.5,(R()-.5)*1.5,R()<.5?rgb(230,220,255):rgb(170,120,255),10,0,1,0,1);}};
const PANTHER_POWERS=[
 // three claws: cuts a clean kerf through anything in reach, chunks included
 {n:'Vibranium Claws',fn:(a,p,use)=>{if(!use(3))return;ST.cd=9;const x=a.h.x,y=a.h.y,L=34;p.punchF=8;
   clawSlice(x,y,a.dx,a.dy,L,3,3,{edge:EDGE,vx:a.dx*3,vy:a.dy*3,push:.8});damageCone(x,y,a.dx,a.dy,L+6,16,2.5);slashFx(x,y,a.dx,a.dy,L);snd('slash',x,y,{pitch:1.2});kin(p,2);}},
 // a lunge at the cursor that slices everything on the way
 {n:'Pounce',fn:(a,p,use)=>{if(!use(10))return;ST.cd=26;const dx=a.dx,dy=a.dy;let k=0,lx=p.x,ly=p.y-ST.PH/2;fxWord(p.x,p.y-ST.PH-6,'HRRAAH!',.9,'#c8a0ff',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{k++;p.vx=dx*9;p.vy=dy*9-.4;p.script=2;sliceLine(p.x,p.y-ST.PH/2,p.x+dx*16,p.y-ST.PH/2+dy*16,{edge:EDGE,quiet:true});scriptMove(p,p.vx,p.vy);const cx=p.x,cy=p.y-ST.PH/2;sliceLine(lx,ly,cx+dx*8,cy+dy*8,{edge:EDGE,quiet:k%3!==0,push:1.2});lx=cx;ly=cy;
     damageLine(cx,cy,cx+dx*10,cy+dy*10,6,9);if(k>=12){clawSlice(cx,cy,dx,dy,30,3,4,{edge:EDGE});p.vx*=.4;p.vy*=.3;return false;}return true;});}},
 // hold: a whirl of slashes around the cursor that dices whatever is there into chunks
 {n:'Claw Storm',fn:(a,p,use)=>{if(!use(1.6))return;const cx=mouse.wx,cy=mouse.wy,r=26*ST.aoeC;if(ST.frame%3)return;
   const an=R()*Math.PI;sliceLine(cx-Math.cos(an)*r,cy-Math.sin(an)*r,cx+Math.cos(an)*r,cy+Math.sin(an)*r,{edge:EDGE,quiet:ST.frame%9!==0,push:1.1});
   damageEnemies(cx,cy,r,5,0,0);slashFx(cx-Math.cos(an)*r,cy-Math.sin(an)*r,Math.cos(an),Math.sin(an),r*2);kin(p,.5);}},
 // two long cuts in an X: the wedge between them lifts out of the street
 {n:'Ground Cleave',fn:(a,p,use)=>{if(!use(16))return;ST.cd=40;const cx=mouse.wx,cy=mouse.wy,L=70*ST.aoeC;
   sliceLine(cx-L*.7,cy-L*.7,cx+L*.7,cy+L*.7,{edge:EDGE,w:1,push:1.4});sliceLine(cx+L*.7,cy-L*.7,cx-L*.7,cy+L*.7,{edge:EDGE,w:1,push:1.4});
   for(let k=-2;k<=2;k++)sliceLine(cx-L,cy+k*12,cx+L,cy+k*12+(R()-.5)*8,{edge:EDGE,quiet:true});
   damageEnemies(cx,cy,L*.6,30,0,-2);fxWord(cx,cy-24,'SHKKRRK!',1.2,'#c8a0ff',true);ST.shake=Math.max(ST.shake,8);}},
 // the suit dumps everything it stored in one purple blast
 {n:'Kinetic Pulse',fn:(a,p,use)=>{if(!use(12))return;ST.cd=40;const k0=(p.kin||0),cx=p.x,cy=p.y-ST.PH/2,r=8+k0*.16|0;p.kin=0;
   explode(cx|0,cy|0,r,{self:true,col:VIB,word:k0>60?'KINETIC OVERLOAD!':'VMMMM!'});shockFx(cx,cy,.6+k0/100);damageEnemies(cx,cy,r*2.5,20+k0*.8,0,-2,true);
   for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r*4){b.vx+=dx/d*(2+k0*.05);b.vy+=dy/d*(2+k0*.05)-1;b.thrown=true;}}}},
 // spinning vibranium blade: slices along its whole flight, boomerangs back
 {n:'Vibranium Dagger',fn:(a,p,use)=>{if(!use(8))return;ST.cd=18;let lx=a.h.x,ly=a.h.y;const s={x:a.h.x,y:a.h.y,vx:a.dx*8,vy:a.dy*8,type:'dagger',life:70,col:VIB,boom:3,spin:0,
     onHit:sh=>{clawSlice(sh.x,sh.y,sh.vx/8,sh.vy/8,16,1,0,{edge:EDGE});explode(sh.x|0,sh.y|0,4,{col:VIB,self:true});}};
   shots.push(s);let k=0;ACT.push(()=>{if(!shots.includes(s))return false;k++;sliceLine(lx,ly,s.x,s.y,{edge:EDGE,quiet:true,push:.7});lx=s.x;ly=s.y;s.vy-=.02;return k<70;});snd('whoosh',a.h.x,a.h.y,{pitch:1.6});}},
 // habit absorb: the suit drinks hits for a few seconds and stores them
 {n:'Habit Absorb',fn:(a,p,use)=>{if(!use(18))return;ST.cd=80;p.absorb=180;fxWord(p.x,p.y-ST.PH-8,'ABSORBING',.9,'#c8a0ff',true);snd('psi',p.x,p.y,{pitch:1.6});
   let k=0;ACT.push(()=>{k++;p.absorb--;if(k%3===0){const an=R()*6.283;spawn(p.x+Math.cos(an)*10,p.y-ST.PH/2+Math.sin(an)*12,0,0,rgb(170,120,255),8,0,1,0,1);}if(p.absorb<=0)return false;return true;});}},
 // kimoyo beads: sticky charges that cling to what they hit, then go off together
 {n:'Kimoyo Charges',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;for(let k=0;k<4;k++){const an=Math.atan2(a.dy,a.dx)+(k-1.5)*.18;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(an)*5,vy:Math.sin(an)*5,type:'bead',life:120,boom:9,col:VIB,ecol:VIB,grav:.12,delay:k*3});}snd('pop',a.h.x,a.h.y);}},
 // the Royal Talon Fighter strafes the cursor's street
 {n:'Talon Strafe',fn:(a,p,use)=>{if(!use(30))return;ST.cd=90;const dir=p.face,tx=mouse.wx;let x=tx-dir*260,k=0;const y=ST.camY+30;fxWord(tx,y+10,'TALON INBOUND',1,'#c8a0ff',true);snd('missile',tx,y);
   ACT.push(()=>{k++;x+=dir*7;for(let j=0;j<3;j++)spawn(x-dir*10,y+(R()-.5)*3,-dir*3,(R()-.5)*.5,rgb(190,140,255),10,0,1,0,1);
     if(k%4===0&&Math.abs(x-tx)<180){const gx=x+dir*20,gy=surfaceY(gx|0,Math.max(0,y),500);sliceLine(x,y+4,gx,gy,{edge:EDGE,quiet:true});explode(gx|0,gy,6,{col:VIB,self:true,quiet:k%8!==0});damageEnemies(gx,gy,12,14,0,-2);}
     return k<80;});}},
 // a spear thrown hard enough to pin and split what it hits
 {n:'Dora Spear',fn:(a,p,use)=>{if(!use(12))return;ST.cd=24;let lx=a.h.x,ly=a.h.y;const s={x:a.h.x,y:a.h.y,vx:a.dx*10,vy:a.dy*10,type:'spear',life:60,col:[255,200,90],grav:.05,boom:6,ecol:[255,200,90]};shots.push(s);
   ACT.push(()=>{if(!shots.includes(s)){clawSlice(lx,ly,s.vx/10,s.vy/10,40,1,0,{edge:[255,220,140],push:1.5});return false;}sliceLine(lx,ly,s.x,s.y,{edge:[255,220,140],quiet:true});lx=s.x;ly=s.y;return true;});}},
 // cut the hero loose from gravity for a moment: a wall-running dash up and along whatever is ahead
 {n:'Panther Dash',fn:(a,p,use)=>{if(!use(9))return;ST.cd=20;const dir=a.dx<0?-1:1;let k=0;p.dodge=14;
   ACT.push(()=>{k++;p.vx=dir*8;p.vy=0;p.script=2;carve(p.x+dir*6,p.y-ST.PH/2,ST.PH*.45,dir*4,0,Math.floor(p.y));scriptMove(p,p.vx,0);sliceLine(p.x-dir*6,p.y-2,p.x+dir*10,p.y-2,{edge:EDGE,quiet:true});sliceLine(p.x-dir*6,p.y-ST.PH+1,p.x+dir*10,p.y-ST.PH+1,{edge:EDGE,quiet:true});
     if(k%2===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:12});damageLine(p.x-dir*8,p.y-ST.PH/2,p.x+dir*8,p.y-ST.PH/2,6,6);return k<14;});}},
 // Bast's wrath: a spectral panther the height of a tower bounds across the screen, cutting it to pieces
 {n:"Bast's Wrath",fn:(a,p,use)=>{if(!use(60))return;ST.cd=180;const dir=p.face,y0=p.y-ST.PH/2;let x=p.x-dir*40,k=0;fxWord(p.x,p.y-50,'WAKANDA FOREVER!',1.6,'#c8a0ff',true);snd('roar',p.x,p.y,{pitch:1.3});ST.hitstop=Math.max(ST.hitstop,6);
   ACT.push(()=>{k++;x+=dir*9;const hy=y0-40+Math.sin(k*.25)*30;
     for(let j=0;j<10;j++){const an=R()*6.283,r=R()*40;spawn(x+Math.cos(an)*r*1.4,hy+Math.sin(an)*r,dir*2,(R()-.5),R()<.5?rgb(200,160,255):rgb(120,80,220),14,0,1,0,1);}
     if(k%3===0){const an=(R()-.5)*1.2+(dir>0?.6:Math.PI-.6);sliceLine(x,hy-50,x+Math.cos(an)*110,hy-50+Math.sin(an)*110,{edge:EDGE,push:1.6,quiet:k%6!==0});}
     damageEnemies(x,hy,46,12,dir*4,-3);flash(x,hy,60,VIB,2);ST.shake=Math.max(ST.shake,6);return k<60;});}},
];
export const CHAR_PANTHER={id:'panther',name:'Black Panther',spr:SPR_PANTHER,pal:PAL_PANTHER,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.4,jump:5.6,hp:340,armor:.7,glow:VIB,cape:null,thrust:()=>rgb(170,120,255),powers:PANTHER_POWERS};
