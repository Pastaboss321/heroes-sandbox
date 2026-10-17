// Ant-Man: sprite, palette, rig entry, powers and roster entry.
import './strange.js'; // evaluation order: runs after heroes/strange.js
import { ST } from '../state.js';
import { PROPANE, R, STEEL, rgb } from '../world/materials.js';
import { H, W } from '../world/grid.js';
import { q } from '../world/support.js';
import { fill, tint } from '../maps/gen.js';
import { spawn } from '../world/particles.js';
import { afters, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { pickC, shots } from './powers.js';
import { ACT } from './xmen.js';
import { ants, scaleChunk, solidCells } from './wave2.js';
import { boxHit, mouse } from '../player.js';
import { damageEnemies, damageLine, enemies, enemyAt, hitEnemy } from '../enemies/core.js';
import { placeStruct } from '../ui/spawn.js';

const SPR_ANT=[
"..a......a...",
"...aSSSSSa...",
"...SsSSSss...",
"...SeeSeeS...",
"...SsSSSsS...",
"....sSkSs....",
"..rRRkkkRRr..",
".kRRkRRRkRRk.",
".kRrkRRRkrRk.",
".kRrRkkkRrRk.",
".kRkRRRRRkRk.",
".kRkSSSSSkRk.",
".kk.kkRkk.kk.",
"....kR.Rk....",
"....RR.Rr....",
"...kR...Rk...",
"...RR...Rr...",
"...RR...Rr...",
"...kk...kk...",
"..kkk...kkk..",
"..kkk...kkk..",
"..kkk...kkk.."];
const PAL_ANT={a:rgb(60,60,70),S:rgb(200,206,214),s:rgb(130,136,148),e:rgb(255,60,50),R:rgb(190,30,30),r:rgb(120,18,20),k:rgb(24,22,26)};

// animation rig entry (see render/rig.js)
ANIM.antman={leg:13,mid:6,armC:'RRr',tipC:'kkk',aw:2,al:5,fs:2,sh:[10,7],hide:rect(10,11,7,12),blink:null};
const ANT_POWERS=[
 // a punch scaled to his current size: tiny = a bullet, giant = a wrecking ball
 {n:'Pym Punch',fn:(a,p,use)=>{if(!use(4))return;ST.cd=12;p.punchF=10;const x=a.h.x+a.dx*4*ST.SZ,y=a.h.y+a.dy*4*ST.SZ,r=ST.SZ>1.5?14:ST.SZ<.8?5:7;if(ST.SZ<.8){p.vx+=a.dx*4;p.vy+=a.dy*2;}
   explode(x|0,y|0,r,{self:true,quiet:ST.SZ<1.5,col:[255,120,90]});damageEnemies(x,y,r+6,ST.SZ>1.5?45:ST.SZ<.8?32:20,a.dx*5*ST.SZ,a.dy*5*ST.SZ-2);fxWord(x,y-10,ST.SZ>1.5?'KRA-THOOM!':ST.SZ<.8?'TIK!':'POW!',ST.SZ>1.5?1.4:.9,'#ffc93c',true);snd('punch',x,y,{pitch:ST.SZ>1.5?.6:ST.SZ<.8?1.8:1});}},
 {n:'Shrink',fn:(a,p,use)=>{if(!use(5))return;ST.cd=20;p.sizeT=p.sizeT<.9?1:.45;fxWord(p.x,p.y-ST.PH-6,p.sizeT<1?'SHRINK!':'BACK TO NORMAL',.8,'#ff6b5c',true);snd('charge',p.x,p.y,{pitch:p.sizeT<1?2:1.2});}},
 {n:'Giant-Man',fn:(a,p,use)=>{if(p.sizeT<=1.5&&!use(20))return;ST.cd=30;p.sizeT=p.sizeT>1.5?1:2.2;fxWord(p.x,p.y-ST.PH-10,p.sizeT>1?'GIANT-MAN!':'NORMAL SIZE',1.3,'#ff6b5c',true);snd('charge',p.x,p.y,{pitch:p.sizeT>1?.5:1.2});}},
 // call the ants: a swarm that crawls over the ground, bites enemies and eats anything leafy or wooden
 {n:'Ant Swarm',fn:(a,p,use)=>{if(!use(25))return;ST.cd=45;for(let k=0;k<70;k++)ants.push({x:p.x+(R()-.5)*20,y:p.y-2,vx:(R()-.5)*2,vy:-R()*2,life:600+R()*200|0});fxWord(p.x,p.y-ST.PH-8,'GO, MY ANTS!',1,'#ff6b5c',true);snd('crumble',p.x,p.y,{size:.4});}},
 // Pym disc: shrinks the enemy (and most of its strength) or the chunk of building it hits
 {n:'Shrink Disc',fn:(a,p,use)=>{if(!use(14))return;ST.cd=22;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'pym',life:110,col:[255,70,60],
   onHit:sh=>{const e=enemyAt(sh.x,sh.y,3);if(e){if(!(e.sc<1)){e.sc=e.def.title?.75:.5;e.hp*=e.def.title?.75:.4;fxWord(e.x,e.y-12,'SHRUNK!',1,'#ff6b5c',true);}else hitEnemy(e,15,0,0);snd('charge',e.x,e.y,{pitch:2});return;}
     const n=solidCells(sh.x,sh.y,9,false);if(n>=12){scaleChunk(q,n,.5);fxWord(sh.x,sh.y-12,'SHRUNK!',.9,'#ff6b5c',true);}}});}},
 // Pym disc: whatever chunk it hits grows to twice its size and comes crashing down
 {n:'Grow Disc',fn:(a,p,use)=>{if(!use(18))return;ST.cd=26;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'pym',life:110,col:[80,140,255],
   onHit:sh=>{const e=enemyAt(sh.x,sh.y,3);if(e){hitEnemy(e,12,0,0);return;}const n=solidCells(sh.x,sh.y,5,false);if(n>=10){const b=scaleChunk(q,n,2.2);if(b){b.vy=-1;b.thrown=true;b.safeP=ST.frame+30;fxWord(sh.x,sh.y-16,'ENLARGE!',1.2,'#7fb8ff',true);snd('crumble',sh.x,sh.y,{size:1});}}}});}},
 // go subatomic for a moment and dash straight through walls
 {n:'Quantum Dash',fn:(a,p,use)=>{if(!use(18))return;ST.cd=30;const dx=a.dx,dy=a.dy;let k=0;const s0=p.sizeT;p.size=.3;fxWord(p.x,p.y-ST.PH-6,'QUANTUM!',.9,'#7fb8ff',true);snd('whoosh',p.x,p.y,{pitch:1.8});
   ACT.push(()=>{k++;p.script=2;p.x=Math.max(5,Math.min(W-5,p.x+dx*9));p.y=Math.max(ST.PH+2,Math.min(H-8,p.y+dy*9));damageLine(p.x-dx*9,p.y-dy*9,p.x,p.y,4,8);afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});for(let q2=0;q2<4;q2++)spawn(p.x,p.y,(R()-.5)*2,(R()-.5)*2,rgb(120,170,255),10,0,1,0,1);
     if(k>=12){p.script=0;p.sizeT=s0;p.vx=dx*3;p.vy=dy*3;if(boxHit(p.x,p.y))punchOut(p);return false;}return true;});}},
 // ride a flying ant for eight seconds
 {n:'Flying Ant',fn:(a,p,use)=>{if(p.ant>0||!use(20))return;ST.cd=30;p.ant=480;p.fly=true;p.vy=-1.5;fxWord(p.x,p.y-ST.PH-6,'GOOD BOY, ANT-THONY!',.9,'#ff6b5c',true);snd('whoosh',p.x,p.y,{pitch:2});}},
 // a burst of Pym particles: every enemy around him shrinks
 {n:'Pym Burst',fn:(a,p,use)=>{if(!use(40))return;ST.cd=80;let n=0;for(const e of enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<90&&!(e.sc<1)){e.sc=e.def.title?.75:.55;e.hp*=e.def.title?.8:.5;n++;}
   rings.push({x:p.x,y:p.y-ST.PH/2,r:6,vr:6,life:16,c:[255,80,70]});flash(p.x,p.y-ST.PH/2,100,[255,80,70],8);fxWord(p.x,p.y-ST.PH-10,n?n+' SHRUNK':'PYM BURST',1.2,'#ff6b5c',true);snd('emp',p.x,p.y,{pitch:1.4});}},
 // the tank on Hank's keychain, enlarged mid-air over the cursor
 {n:'Keychain Tank',fn:(a,p,use)=>{if(!use(35))return;ST.cd=90;const x=Math.max(30,Math.min(W-30,mouse.wx|0)),y=Math.max(30,(ST.camY|0)+24);
   placeStruct((x0,y0)=>{fill(x0-16,y0-8,x0+16,y0,STEEL);tint(x0-16,y0-8,x0+16,y0,96,110,70,8);fill(x0-7,y0-14,x0+7,y0-8,STEEL);tint(x0-7,y0-14,x0+7,y0-8,110,124,80,8);fill(x0+7,y0-12,x0+24,y0-10,STEEL);tint(x0+7,y0-12,x0+24,y0-10,70,80,56,4);
     fill(x0-17,y0-2,x0+17,y0+3,STEEL);tint(x0-17,y0-2,x0+17,y0+3,40,40,36,4);fill(x0-5,y0-7,x0+5,y0-2,PROPANE);},x,y);
   fxWord(x,y-24,'ENLARGE!',1.3,'#7fb8ff',true);snd('charge',x,y,{pitch:.5});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_ANTMAN={id:'antman',name:'Ant-Man',spr:SPR_ANT,pal:PAL_ANT,pw:7,ph:19,fly:false,fs:2.6,boost:1,run:2.2,jump:5,hp:330,armor:.75,glow:[255,80,60],cape:null,thrust:()=>pickC([255,90,70]),powers:ANT_POWERS};
