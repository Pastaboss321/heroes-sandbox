// The Thing: sprite, palette, rig entry, powers and roster entry.
import './torch.js'; // evaluation order: runs after heroes/torch.js
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { afters, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { aim, pickC, quake, shockFx } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { crushAhead, hurlBody, wallChunk } from './villains.js';
import { TC } from './f4.js';
import { carve, mouse } from '../player.js';
import { damageCone, damageEnemies, enemies, hitEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';

const SPR_THING=[
"......kkkkk......",
"....kkLLlLLkk....",
"...kLlRRdRRlRk...",
"...kRRdRRRdRrk...",
"..kddddddddddrk..",
"..kRkcckRkcckRk..",
"..kRRRRdRdRRRrk..",
"..krRdkkkkkdRrk..",
"...krRRdRRRRrk...",
".kkkRRdRRRdRRkkk.",
"kLlRdRRlRRdRRlLRk",
"kRRrdRRRdRRRdRRrk",
"klRddRlRRdRlRddRk",
"kRrdRRRdRRRRdRrrk",
"klRdkRRRdRRRkdRrk",
"kRrk.BBBBBBB.kRrk",
"klRk.NNNWNNN.kRrk",
"kRRk.BBBBBBB.kRRk",
"LlRRkBBBbBBBkRRlL",
"lRRrkBBB.BBBkrRRl",
"kddk.bBB.BBb.kddk",
"...kRlRk.kRlRk...",
"...kRRdk.kdRRk...",
"...klRrk.kRlrk...",
"..kRRdRk.kRdRRk..",
"..kkkkkk.kkkkkk.."];
const PAL_THING={k:rgb(48,20,10),d:rgb(128,56,22),r:rgb(172,82,34),R:rgb(218,118,50),l:rgb(244,162,88),L:rgb(255,204,136),c:rgb(130,205,255),B:rgb(62,108,172),b:rgb(38,68,122),N:rgb(24,36,66),W:rgb(240,244,250)};

// animation rig entry (see render/rig.js)
ANIM.thing={leg:21,mid:8,armC:'lRr',tipC:'lRd',aw:3,al:9,fs:4,sh:[14,10],hide:rect(13,16,10,20),blink:null};
const THING_POWERS=[
 {n:'Clobber Punch',fn:(a,p,use)=>{if(!use(5))return;ST.cd=16;p.punchF=10;const x=a.h.x+a.dx*8,y=a.h.y+a.dy*8;explode(x|0,y|0,11,{self:true,col:TC,word:'KLOBBER!'});damageEnemies(x,y,18,40,a.dx*9,a.dy*9-3);
   for(const b of bodies)if(Math.hypot(b.x-x,b.y-y)<b.rmax+18){b.vx+=a.dx*9;b.vy+=a.dy*9-2;b.thrown=true;}ST.shake+=6;}},
 {n:'Rock Slam',fn:(a,p,use)=>{if(!p.ground||!use(24))return;ST.cd=45;p.throwF=10;quake(p.x,p.y,{col:TC,r:34});for(const e of enemies)if(Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<40&&!e.def.fly){e.vy=-6;hitEnemy(e,18,Math.sign(e.x-p.x)*3,0);}}},
 // tear up a slab of street and throw it
 {n:'Slab Toss',fn:(a,p,use)=>{const dir=p.face,gx=p.x+dir*16|0,gy=groundBelow(gx,p.y-4),n0=solidCells(gx,gy+5,10,true);let n=0;for(let i=0;i<n0;i++)if(KIND[t[q[i]]]===S)q[n++]=q[i];if(n<30||!use(22))return;ST.cd=38;const b=makeBody(q,n,false);if(!b)return;
   b.x=p.x;b.y=p.y-ST.PH-b.rmax-2;hurlBody(b,mouse.wx,mouse.wy,10);b.safeP=ST.frame+40;p.throwF=10;fxWord(p.x,p.y-ST.PH-8,'HEADS UP!',1,'#ffb070',true);snd('rip',p.x,p.y);ST.shake+=5;}},
 {n:'Shoulder Charge',fn:(a,p,use)=>{if(p.jcharge>0||!use(20))return;ST.cd=40;const dir=a.dx<0?-1:1;p.face=dir;p.jcharge=45;fxWord(p.x,p.y-ST.PH-10,'OUTTA MY WAY!',1.1,'#ffb070',true);snd('roar',p.x,p.y,{pitch:.9});
   ACT.push(()=>{if(--p.jcharge<=0)return false;p.vx=dir*5.2;p.face=dir;crushAhead(p.x+dir*ST.PW/2,p.y-ST.PH/2,dir,ST.PH+4,6);damageEnemies(p.x+dir*8,p.y-ST.PH/2,14,9,dir*7,-3);if(ST.frame%3===0){ST.shake=Math.max(ST.shake,4);afters.push({x:p.x,y:p.y,ang:0,face:dir,life:10});}return true;});}},
 // an uppercut that launches everything overhead
 {n:'Rock Uppercut',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;p.throwF=10;const x=p.x+p.face*8,y=p.y-ST.PH;explode(x|0,y|0,11,{self:true,col:TC,word:'UPPERCUT!'});for(let k=1;k<6;k++)carve(x,y-k*10,6,0,-5);
   for(const e of enemies)if(Math.abs(e.x-x)<30&&Math.abs(e.y-y)<50){e.vy=-9;hitEnemy(e,30,p.face*2,-6);}for(const b of bodies)if(!b.held&&Math.abs(b.x-x)<b.rmax+20&&Math.abs(b.y-y)<60){b.vy-=8;b.va+=(R()-.5)*.2;b.thrown=true;}}},
 // a clap of rock hands: a cone of blasts rolls out ahead
 {n:'Thunder Clap',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;p.throwF=10;let k=0;const dx=a.dx,dy=a.dy,x0=a.h.x,y0=a.h.y;fxWord(x0,y0-20,'KLAPP!',1.3,'#ffb070',true);snd('thud',x0,y0);shockFx(x0,y0,1);
   ACT.push(()=>{k++;const d=k*12,w=6+k*1.5;for(let j=-1;j<=1;j++)explode(x0+dx*d-dy*j*w|0,y0+dy*d+dx*j*w|0,6+k*.5|0,{self:true,quiet:true,col:TC});damageCone(x0,y0,dx,dy,d+10,6,5);return k<9;});}},
 // leap onto the cursor and land like a falling statue
 {n:'Rock Drop',fn:(a,p,use)=>{if(!p.ground||!use(22))return;ST.cd=45;const dx=mouse.wx-p.x,s2=Math.min(1,Math.abs(dx)/200);p.vx=Math.sign(dx)*(3+4*s2);p.vy=-7.5;p.ground=false;p.slam=true;p.slamOpt={col:TC,dive:true};p.diveY=p.y-70;snd('leap',p.x,p.y,{size:.8});}},
 {n:'Pummel Barrage',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;let k=0;ACT.push(()=>{if(k%4===0){p.punchF=8;const A2=aim(),x=A2.h.x+A2.dx*8,y=A2.h.y+A2.dy*8;explode(x|0,y|0,7,{self:true,quiet:true,col:TC});damageEnemies(x,y,12,14,A2.dx*4,A2.dy*4-1);snd('punch',x,y);}return++k<24;});fxWord(p.x,p.y-ST.PH-8,'WHAM-WHAM-WHAM!',1,'#ffb070',true);}},
 // punch a whole section of wall clean off and send it flying
 {n:'Wall Wrecker',fn:(a,p,use)=>{const dir=a.dx<0?-1:1,b=wallChunk(p.x,p.y-ST.PH/2,dir,11);if(!b)return;if(!use(18)){b.vx=0;return;}ST.cd=32;p.punchF=10;b.vx=dir*9;b.vy=-1.5;b.va=dir*.08;b.thrown=true;b.safeP=ST.frame+40;fxWord(p.x,p.y-ST.PH-8,'KRAKK!',1.1,'#ffb070',true);snd('punch',p.x,p.y);ST.shake+=5;}},
 // four escalating haymakers walking forward, then one that flattens the block
 {n:"It's Clobberin' Time!",fn:(a,p,use)=>{if(!use(45))return;ST.cd=110;const dir=p.face;let k=0;fxWord(p.x,p.y-ST.PH-12,"IT'S CLOBBERIN' TIME!",1.4,'#ffb070',true);snd('roar',p.x,p.y,{pitch:.75});
   ACT.push(()=>{k++;p.vx=dir*2;if(k%10===0&&k<=40){p.punchF=10;const st=k/10,x=p.x+dir*(10+st*4),y=p.y-ST.PH/2;explode(x|0,y|0,8+st*2,{self:true,col:TC});damageEnemies(x,y,20,20,dir*6,-3);crushAhead(p.x+dir*ST.PW/2,p.y-ST.PH/2,dir,ST.PH+6,8);}
     if(k===52){p.throwF=12;const x=p.x+dir*16,y=p.y-4;explode(x|0,y|0,20,{self:true,col:TC,word:'KA-KLOBBER!'});quake(x,p.y,{col:TC,r:30});shockFx(x,y,1.3);damageEnemies(x,y,50,60,dir*8,-6);ST.hitstop=Math.max(ST.hitstop,6);return false;}return true;});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_THING={id:'thing',name:'The Thing',spr:SPR_THING,pal:PAL_THING,pw:9,ph:23,fly:false,fs:2.4,boost:1,run:2.0,jump:4.8,hp:620,armor:.35,glow:TC,cape:null,thrust:()=>pickC(TC),powers:THING_POWERS};
