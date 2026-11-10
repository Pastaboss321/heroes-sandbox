// Juggernaut (playable): sprite, palette, rig entry, powers and roster entry.
import { crushAhead, hurlBody, wallChunk } from './villains.js';
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { bodies, q } from '../world/support.js';
import { afters, flash, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { crackCell, pickC, quake, shockFx, shots, surfaceY } from './powers.js';
import { ACT } from './xmen.js';
import { carve, mouse } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { sliceLine } from '../world/slice.js';
import { solidCells } from './wave2.js';
import { t } from '../world/grid.js';
import { makeBody } from '../world/bodies.js';
import { fig8 } from './kitlib.js';
import { groundBelow } from '../ui/spawn.js';
import { spawn } from '../world/particles.js';


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
   ACT.push(()=>{p.vx=dir*7;crushAhead(p.x+dir*ST.PW/2,p.y-ST.PH*.6,dir,ST.PH*.9,9);for(const e of enemies)if(Math.abs(e.x-(p.x+dir*8))<e.def.w/2+5&&Math.abs(e.y-(p.y-ST.PH*.7))<e.def.h/2+8){hitEnemy(e,22,dir*6,-3);e.frozen=Math.max(e.frozen||0,90);}return++k<16;});fxWord(p.x,p.y-ST.PH-6,'KLONNG!',1,'#e23b2e',true);snd('clang',p.x,p.y);}},
 // leap onto the cursor and come down like a demolition weight
 {n:'Body Slam',fn:(a,p,use)=>{if(!p.ground||!use(22))return;ST.cd=45;const dx=mouse.wx-p.x,s=Math.min(1,Math.abs(dx)/200);p.vx=Math.sign(dx)*(3+4*s);p.vy=-7;p.ground=false;p.slam=true;p.slamOpt={col:[214,184,130],dive:true};p.diveY=p.y-60;snd('leap',p.x,p.y,{size:.8});}},
 // the Crimson Gem: six seconds of invulnerability; anything that touches him gets hurt
 {n:'Crimson Surge',fn:(a,p,use)=>{if(p.surge>0||!use(35))return;ST.cd=60;p.surge=360;fxWord(p.x,p.y-ST.PH-10,'POWER OF CYTTORAK!',1.2,'#e23b2e',true);flash(p.x,p.y-ST.PH/2,50,[255,40,40],8);snd('roar',p.x,p.y,{pitch:.7});}},
 // arms out and spin: a whirlwind of fists that clears everything around him
 {n:'Wrecking Spin',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;let k=0;fxWord(p.x,p.y-ST.PH-8,'WHIRRRR!',1,'#e23b2e',true);
   ACT.push(()=>{const an=k*.6;carve(p.x+Math.cos(an)*12,p.y-ST.PH/2+Math.sin(an)*6,6,Math.cos(an)*3,0);damageEnemies(p.x,p.y-ST.PH/2,18,4,0,-1,true);p.face=Math.cos(an)<0?-1:1;p.punchF=4;if(k%4===0)snd('whoosh',p.x,p.y,{v:.5});return++k<36;});}},
 // a stampede: five earth-shaking strides, each one a quake, crushing everything ahead
 {n:'Seismic Stampede',fn:(a,p,use)=>{if(!p.ground||!use(30))return;ST.cd=60;const dir=a.dx<0?-1:1;let k=0;p.face=dir;fxWord(p.x,p.y-ST.PH-10,'STAMPEDE!',1.2,'#e23b2e',true);
   ACT.push(()=>{k++;p.vx=dir*3.4;p.face=dir;crushAhead(p.x+dir*ST.PW/2,p.y-ST.PH/2,dir,ST.PH+4,4);if(k%12===0){quake(p.x+dir*6,p.y,{col:[214,184,130],r:22});for(const e of enemies)if(Math.abs(e.x-p.x)<70&&!e.def.fly){e.vy=-5;hitEnemy(e,10,dir*3,0);}}return k<60;});}},
 // a headbutt that sends a shock through a whole structure: it splits along a dozen cracks
 {n:'Structural Shatter',fn:(a,p,use)=>{if(!use(28))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy,r=60*ST.aoeC;p.punchF=10;fxWord(cx,cy-20,'KRRRSSSHH!',1.3,'#e23b2e',true);ST.shake=14;snd('slam',cx,cy);
   for(let k=0;k<9;k++){const an=R()*Math.PI,ox=(R()-.5)*r,oy=(R()-.5)*r;sliceLine(cx+ox-Math.cos(an)*r,cy+oy-Math.sin(an)*r,cx+ox+Math.cos(an)*r,cy+oy+Math.sin(an)*r,{edge:[255,120,90],push:1.5,quiet:k>0});}
   explode(cx|0,cy|0,8,{self:true,col:[255,90,70]});damageEnemies(cx,cy,r,20,0,-2);}},
 // he tears a wedge out of the ground ahead and bowls it down the street
 {n:'Cyttorak Slab',fn:(a,p,use)=>{const dir=a.dx<0?-1:1,gx=p.x+dir*16,gy=surfaceY(gx|0,Math.max(0,p.y-6|0),30);if(!use(22))return;ST.cd=45;
   sliceLine(gx-dir*12,gy-2,gx+dir*4,gy+26,{edge:[255,120,90],quiet:true});sliceLine(gx+dir*30,gy-2,gx+dir*14,gy+26,{edge:[255,120,90],quiet:true});sliceLine(gx-dir*12,gy+26,gx+dir*30,gy+26,{edge:[255,120,90],quiet:true});
   const n0=solidCells(gx+dir*9,gy+12,12,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n<20)return;const b=makeBody(q,n,false);if(!b)return;b.vx=dir*8;b.vy=-4;b.va=dir*.08;b.thrown=true;b.safeP=ST.frame+30;fxWord(gx,gy-16,'OUT OF MY WAY!',1,'#e23b2e',true);snd('rip',gx,gy);}},
 // he grabs the enemy in front, carries it over his head and drives it into the ground behind him
  {n:'Juggernaut Suplex',fn:(a,p,use)=>{const e=nearestEnemy(p.x+p.face*(ST.PW/2+8),p.y-ST.PH/2,ST.PW/2+30);if(!e||fig8(e)){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO GRAB',.7,'#ff7a5c',true);return;}if(!use(16))return;ST.cd=36;let k=0;const f=p.face;
    ACT.push(()=>{k++;p.script=2;if(e.hp<=0)return false;const an=Math.min(1,k/24)*Math.PI;e.x=p.x+Math.cos(an)*f*18;e.y=p.y-ST.PH/2-Math.sin(an)*26;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);if(k<24)return true;
      const gy=groundBelow(e.x|0,e.y);e.y=gy-e.def.h/2;hitEnemy(e,40,-f*2,-3);quake(e.x,gy,{r:24,col:[200,60,40]});explode(e.x|0,gy|0,8,{self:true,col:[200,60,40]});fxWord(e.x,gy-30,'SUPLEX!',1.1,'#ff7a5c',true);ST.shake=16;return false;});}},
 // the Crimson Gem flares: for four seconds everything is shoved away from him and enemy fire burns up
  {n:'Crimson Aura',fn:(a,p,use)=>{if(p.caura>0||!use(24))return;ST.cd=60;p.caura=240;fxWord(p.x,p.y-ST.PH-12,'THE CRIMSON GEM!',1,'#ff7a5c',true);
    ACT.push(()=>{if(--p.caura<=0||ST.CH.id!=='juggernaut'){p.caura=0;return false;}const cx=p.x,cy=p.y-ST.PH/2,r=36;
      for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+e.def.w/2){if(!e.def.titan){e.vx+=dx/d*1.2;e.vy+=dy/d*.8-.2;}if(ST.frame-(e.mem.caura||-99)>12){e.mem.caura=ST.frame;hitEnemy(e,8,0,0);}}}
      for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+b.rmax){b.vx+=dx/d*.6;b.vy+=dy/d*.6;b.rest=0;}}
      for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r){shots.splice(n,1);flash(s.x,s.y,6,[255,60,40],2);}}
      if(ST.frame%2===0){const an=R()*6.283;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r,Math.cos(an),Math.sin(an),rgb(220,40,30),10,0,1,0,1);}return true;});}},
 // a double-fisted overhead smash: a huge crater and a crack running ahead
 {n:'Juggernaut Smash',ult:true,fn:(a,p,use)=>{if(!use(32))return;ST.cd=60;p.throwF=10;const dir=p.face,x=p.x+dir*12,y=p.y;explode(x|0,y|0,16,{self:true,col:[214,184,130],word:'KRA-KOOM!'});shockFx(x,y,1);for(let k=1;k<10;k++)crackCell(x+dir*k*4|0,y+(R()*6|0),dir);damageEnemies(x,y,40,50,dir*5,-4);ST.hitstop=Math.max(ST.hitstop,4);}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_JUGGERNAUT={id:'juggernaut',name:'Juggernaut',pw:9,ph:22,fly:false,fs:2.4,boost:1,run:2.0,jump:4.6,hp:600,armor:.35,glow:[255,60,40],cape:null,thrust:()=>pickC([255,80,50]),powers:JUGG_POWERS};
