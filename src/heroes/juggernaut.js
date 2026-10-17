// Juggernaut (playable): sprite, palette, rig entry, powers and roster entry.
import { crushAhead, hurlBody, wallChunk } from './villains.js';
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { bodies } from '../world/support.js';
import { afters, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { crackCell, pickC, quake, shockFx } from './powers.js';
import { ACT } from './xmen.js';
import { carve, mouse } from '../player.js';
import { damageEnemies, enemies, hitEnemy } from '../enemies/core.js';

export const SPR_JUGG=[
".....hhhhh.....",
"...hhHHHHHhh...",
"..hHHjHHHjHHh..",
".hHHHHHHHHHHHh.",
".hHHkkkkkkkHHh.",
".hHjkfffffkjHh.",
".hHHkfefefkHHh.",
".hHHHkfFfkHHHh.",
"..hHHHHHHHHHh..",
".rrhhhHHHhhhrr.",
"rRRRRrRRRrRRRRr",
"rRRRRrRbRrRRRRr",
"rRRRr.RbR.rRRRr",
"rRRRr.RBR.rRRRr",
"rRRr.bbBbb.rRRr",
"sss..RRRRR..sss",
"sss..RR.RR..sss",
"....rRR.RRr....",
"....rRR.RRr....",
"....rRR.RRr....",
"....hHH.HHh....",
"...hHHH.HHHh...",
"...hHHH.HHHh...",
"...hhhh.hhhh..."];
export const PAL_JUGG={h:rgb(84,48,30),H:rgb(146,90,56),j:rgb(214,184,130),k:rgb(30,20,16),f:rgb(212,162,122),e:rgb(40,24,20),F:rgb(160,114,84),r:rgb(92,22,26),R:rgb(152,42,42),b:rgb(196,156,66),B:rgb(240,204,104),s:rgb(84,56,38)};

// animation rig entry (see render/rig.js)
ANIM.juggernaut={leg:17,mid:7,armC:'RRr',tipC:'sss',aw:3,al:8,fs:4,sh:[12,10],hide:rect(11,14,10,16),blink:null};
const JUGG_POWERS=[
 {n:'Haymaker',fn:(a,p,use)=>{if(!use(5))return;ST.cd=16;p.punchF=10;const x=a.h.x+a.dx*8,y=a.h.y+a.dy*8;explode(x|0,y|0,11,{self:true,col:[214,184,130],word:'HAYMAKER!'});damageEnemies(x,y,18,40,a.dx*9,a.dy*9-3);
   for(const b of bodies){if(Math.hypot(b.x-x,b.y-y)<b.rmax+18){b.vx+=a.dx*9;b.vy+=a.dy*9-2;b.thrown=true;}}ST.shake+=6;}},
 // nothing stops the Juggernaut: a straight-line charge through anything, steel included
 {n:'Unstoppable Charge',fn:(a,p,use)=>{if(p.jcharge>0||!use(20))return;ST.cd=40;const dir=a.dx<0?-1:1;p.face=dir;p.jcharge=60;fxWord(p.x,p.y-ST.PH-10,"NOTHING STOPS THE JUGGERNAUT!",1.1,'#e23b2e',true);snd('roar',p.x,p.y,{pitch:.8});
   ACT.push(()=>{if(--p.jcharge<=0)return false;p.vx=dir*5.6;p.face=dir;crushAhead(p.x+dir*ST.PW/2,p.y-ST.PH/2,dir,ST.PH+4,6);damageEnemies(p.x+dir*8,p.y-ST.PH/2,14,9,dir*7,-3);if(ST.frame%3===0){ST.shake=Math.max(ST.shake,4);afters.push({x:p.x,y:p.y,ang:0,face:dir,life:10});}return true;});}},
 // both fists into the ground: the shockwave throws everything nearby into the air
 {n:'Ground Pound',fn:(a,p,use)=>{if(!p.ground||!use(24))return;ST.cd=45;p.throwF=10;quake(p.x,p.y,{col:[214,184,130],r:34});for(const e of enemies)if(Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<40&&!e.def.fly){e.vy=-6;hitEnemy(e,18,Math.sign(e.x-p.x)*3,0);}}},
 // tear the wall in front off its frame and throw it
 {n:'Wall Rip',fn:(a,p,use)=>{const dir=a.dx<0?-1:1,b=wallChunk(p.x,p.y-ST.PH/2,dir,9);if(!b)return;if(!use(16)){b.vx=0;return;}ST.cd=30;b.x=p.x;b.y=p.y-ST.PH-b.rmax;hurlBody(b,mouse.wx,mouse.wy,10);b.safeP=ST.frame+40;p.throwF=10;fxWord(p.x,p.y-ST.PH-8,'RRRAH!',1,'#e23b2e',true);snd('rip',p.x,p.y);}},
 // a short head-first dash: whatever it hits is stunned
 {n:'Helmet Bash',fn:(a,p,use)=>{if(!use(10))return;ST.cd=22;const dir=a.dx<0?-1:1;let k=0;p.face=dir;
   ACT.push(()=>{p.vx=dir*7;crushAhead(p.x+dir*ST.PW/2,p.y-ST.PH*.75,dir,10,5);for(const e of enemies)if(Math.abs(e.x-(p.x+dir*8))<e.def.w/2+5&&Math.abs(e.y-(p.y-ST.PH*.7))<e.def.h/2+8){hitEnemy(e,22,dir*6,-3);e.frozen=Math.max(e.frozen||0,90);}return++k<16;});fxWord(p.x,p.y-ST.PH-6,'KLONNG!',1,'#e23b2e',true);snd('clang',p.x,p.y);}},
 // leap onto the cursor and come down like a demolition weight
 {n:'Body Slam',fn:(a,p,use)=>{if(!p.ground||!use(22))return;ST.cd=45;const dx=mouse.wx-p.x,s=Math.min(1,Math.abs(dx)/200);p.vx=Math.sign(dx)*(3+4*s);p.vy=-7;p.ground=false;p.slam=true;p.slamOpt={col:[214,184,130],dive:true};p.diveY=p.y-60;snd('leap',p.x,p.y,{size:.8});}},
 // the Crimson Gem: six seconds of invulnerability; anything that touches him gets hurt
 {n:'Crimson Surge',fn:(a,p,use)=>{if(p.surge>0||!use(35))return;ST.cd=60;p.surge=360;fxWord(p.x,p.y-ST.PH-10,'POWER OF CYTTORAK!',1.2,'#e23b2e',true);flash(p.x,p.y-ST.PH/2,50,[255,40,40],8);snd('roar',p.x,p.y,{pitch:.7});}},
 // arms out and spin: a whirlwind of fists that clears everything around him
 {n:'Wrecking Spin',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;let k=0;fxWord(p.x,p.y-ST.PH-8,'WHIRRRR!',1,'#e23b2e',true);
   ACT.push(()=>{const an=k*.6;carve(p.x+Math.cos(an)*12,p.y-ST.PH/2+Math.sin(an)*6,6,Math.cos(an)*3,0);damageEnemies(p.x,p.y-ST.PH/2,18,4,0,-1,true);p.face=Math.cos(an)<0?-1:1;p.punchF=4;if(k%4===0)snd('whoosh',p.x,p.y,{v:.5});return++k<36;});}},
 // shrug off whatever is on him and keep coming
 {n:'Shrug Off',fn:(a,p,use)=>{if(!use(25))return;ST.cd=60;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.2);damageEnemies(p.x,p.y-ST.PH/2,40,10,0,-2,true);rings.push({x:p.x,y:p.y-ST.PH/2,r:6,vr:4,life:12,c:[255,80,60]});fxWord(p.x,p.y-ST.PH-8,'IS THAT ALL?',1,'#e23b2e',true);}},
 // a double-fisted overhead smash: a huge crater and a crack running ahead
 {n:'Juggernaut Smash',fn:(a,p,use)=>{if(!use(32))return;ST.cd=60;p.throwF=10;const dir=p.face,x=p.x+dir*12,y=p.y;explode(x|0,y|0,16,{self:true,col:[214,184,130],word:'KRA-KOOM!'});shockFx(x,y,1);for(let k=1;k<10;k++)crackCell(x+dir*k*4|0,y+(R()*6|0),dir);damageEnemies(x,y,40,50,dir*5,-4);ST.hitstop=Math.max(ST.hitstop,4);}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_JUGGERNAUT={id:'juggernaut',name:'Juggernaut',spr:SPR_JUGG,pal:PAL_JUGG,pw:9,ph:22,fly:false,fs:2.4,boost:1,run:2.0,jump:4.6,hp:600,armor:.35,glow:[255,60,40],cape:null,thrust:()=>pickC([255,80,50]),powers:JUGG_POWERS};
