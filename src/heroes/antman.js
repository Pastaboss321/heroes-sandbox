// Ant-Man: sprite, palette, rig entry, powers and roster entry.
import './strange.js'; // evaluation order: runs after heroes/strange.js
import { ST } from '../state.js';
import { PROPANE, R, STEEL, rgb } from '../world/materials.js';
import { H, VH, W } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { fill, tint } from '../maps/gen.js';
import { spawn } from '../world/particles.js';
import { afters, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { pickC, quake, scriptMove, shockFx, shots, zap } from './powers.js';
import { ACT } from './xmen.js';
import { ants, scaleChunk, solidCells } from './wave2.js';
import { SKY, boxHit, carve, mouse, pl_ } from '../player.js';
import { damageEnemies, damageLine, enemies, enemyAt, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow, placeStruct } from '../ui/spawn.js';
import { TK } from '../render/titan.js';
import { summons } from './abilities.js';
import { atCursor, drawPix, noTarget, tagged } from './kitlib.js';


function drawTrain(s){const k=s.sz,x=s.x,y=s.y,f=s.face,o={},B=rgb(40,90,200),Rd=rgb(200,40,40),Kc=rgb(30,30,36);TK.begin();TK.cap(x-f*18*k,y-12*k,x+f*14*k,y-12*k,8*k,8*k,B,o);TK.cap(x-f*16*k,y-24*k,x-f*8*k,y-24*k,6*k,6*k,B,o);TK.cap(x+f*10*k,y-20*k,x+f*10*k,y-28*k,2.5*k,3*k,Kc,o);for(const w of [-12,-2,8])TK.ell(x+f*w*k,y-4*k,4*k,4*k,Rd,o);TK.ell(x+f*20*k,y-12*k,5*k,6*k,rgb(205,205,200),o);TK.end();}
const ANT_POWERS=[
 // a punch scaled to his current size: tiny = a bullet, giant = a wrecking ball
 {n:'Pym Punch',fn:(a,p,use)=>{if(!use(4))return;ST.cd=12;p.punchF=10;const x=a.h.x+a.dx*4*ST.SZ,y=a.h.y+a.dy*4*ST.SZ,r=ST.SZ>1.5?14:ST.SZ<.8?5:7;if(ST.SZ<.8){p.vx+=a.dx*4;p.vy+=a.dy*2;}
   explode(x|0,y|0,r,{self:true,quiet:ST.SZ<1.5,col:[255,120,90]});damageEnemies(x,y,r+6,ST.SZ>1.5?45:ST.SZ<.8?32:20,a.dx*5*ST.SZ,a.dy*5*ST.SZ-2);fxWord(x,y-10,ST.SZ>1.5?'KRA-THOOM!':ST.SZ<.8?'TIK!':'POW!',ST.SZ>1.5?1.4:.9,'#ffc93c',true);snd('punch',x,y,{pitch:ST.SZ>1.5?.6:ST.SZ<.8?1.8:1});}},
 {n:'Shrink',fn:(a,p,use)=>{if(!use(5))return;ST.cd=20;p.sizeT=p.sizeT<.9?1:.45;fxWord(p.x,p.y-ST.PH-6,p.sizeT<1?'SHRINK!':'BACK TO NORMAL',.8,'#ff6b5c',true);snd('charge',p.x,p.y,{pitch:p.sizeT<1?2:1.2});}},
 {n:'Giant-Man',fn:(a,p,use)=>{if(p.sizeT<=1.5&&!use(20))return;ST.cd=30;p.sizeT=p.sizeT>1.5?1:2.2;fxWord(p.x,p.y-ST.PH-10,p.sizeT>1?'GIANT-MAN!':'NORMAL SIZE',1.3,'#ff6b5c',true);snd('charge',p.x,p.y,{pitch:p.sizeT>1?.5:1.2});}},
 // call the army: a swarm that chews straight through anything but steel, biting every enemy it reaches
 {n:'Ant Army',fn:(a,p,use)=>{if(!use(25))return;ST.cd=45;for(let k=0;k<120;k++)ants.push({x:p.x+(R()-.5)*20,y:p.y-2,vx:(R()-.5)*2,vy:-R()*2,life:500+R()*200|0});fxWord(p.x,p.y-ST.PH-8,'EAT IT ALL, ANTS!',1,'#ff6b5c',true);snd('crumble',p.x,p.y,{size:.4});}},
 // go full giant mid-step and bring a foot down: a crater and blasts rolling down the street
 {n:'Giant Stomp',fn:(a,p,use)=>{if(!use(28))return;ST.cd=50;p.sizeT=2.2;let k=0;p.vy=Math.min(p.vy,-4);p.ground=false;fxWord(p.x,p.y-ST.PH-12,'GIANT STOMP!',1.3,'#ff6b5c',true);snd('charge',p.x,p.y,{pitch:.5});
   ACT.push(()=>{k++;if(k<6)return true;if(!p.ground&&k<90){p.vy=Math.max(p.vy,6);return true;}quake(p.x,p.y,{col:[255,120,90],r:42});
     for(let n=1;n<=4;n++){const x=p.x+p.face*n*26;explode(x|0,groundBelow(x,p.y-20)|0,9,{self:true,quiet:true,col:[200,190,160]});}damageEnemies(p.x,p.y-10,90,40,0,-6,true);return false;});}},
 // Pym disc: whatever chunk it hits grows to twice its size and comes crashing down
 {n:'Grow Disc',fn:(a,p,use)=>{if(!use(18))return;ST.cd=26;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'pym',life:110,col:[80,140,255],
   onHit:sh=>{const e=enemyAt(sh.x,sh.y,3);if(e){hitEnemy(e,12,0,0);return;}const n=solidCells(sh.x,sh.y,5,false);if(n>=10){const b=scaleChunk(q,n,2.2);if(b){b.vy=-1;b.thrown=true;b.safeP=ST.frame+30;fxWord(sh.x,sh.y-16,'ENLARGE!',1.2,'#7fb8ff',true);snd('crumble',sh.x,sh.y,{size:1});}}}});}},
 // go subatomic for a moment and dash straight through walls
 {n:'Quantum Dash',fn:(a,p,use)=>{if(!use(18))return;ST.cd=30;const dx=a.dx,dy=a.dy;let k=0;const s0=p.sizeT;p.size=.3;fxWord(p.x,p.y-ST.PH-6,'QUANTUM!',.9,'#7fb8ff',true);snd('whoosh',p.x,p.y,{pitch:1.8});
   ACT.push(()=>{k++;p.script=2;p.x=Math.max(5,Math.min(W-5,p.x+dx*9));p.y=Math.max(ST.PH+2-SKY+VH/2,Math.min(H-8,p.y+dy*9));carve(p.x,p.y-ST.PH/2,6,dx*3,dy*3);damageLine(p.x-dx*9,p.y-dy*9,p.x,p.y,6,10);afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});for(let q2=0;q2<4;q2++)spawn(p.x,p.y,(R()-.5)*2,(R()-.5)*2,rgb(120,170,255),10,0,1,0,1);
     if(k>=12){p.script=0;p.sizeT=s0;p.vx=dx*3;p.vy=dy*3;if(boxHit(p.x,p.y))punchOut(p);return false;}return true;});}},
 // ride a flying ant for eight seconds
 {n:'Flying Ant',fn:(a,p,use)=>{if(p.ant>0||!use(20))return;ST.cd=30;p.ant=480;p.fly=true;p.vy=-1.5;fxWord(p.x,p.y-ST.PH-6,'GOOD BOY, ANT-THONY!',.9,'#ff6b5c',true);snd('whoosh',p.x,p.y,{pitch:2});}},
 // a Pym particle bomb: it pulls everything in for a moment, then goes off like a wrecking charge
 {n:'Pym Bomb',fn:(a,p,use)=>{if(!use(40))return;ST.cd=80;snd('whoosh',a.h.x,a.h.y,{pitch:1.6});shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'pym',life:110,col:[255,70,60],
   onHit:sh=>{const cx=sh.x,cy=sh.y;let k=0;fxWord(cx,cy-16,'PYM BOMB!',1.2,'#ff6b5c',true);snd('charge',cx,cy,{pitch:2});
     ACT.push(()=>{k++;rings.push({x:cx,y:cy,r:40-k*1.6,vr:0,life:2,c:[255,80,70]});for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<70){e.vx+=(cx-e.x)*.03;e.vy+=(cy-e.y)*.03;}
       for(const b of bodies)if(!b.held&&Math.hypot(b.x-cx,b.y-cy)<80){b.vx+=(cx-b.x)*.02;b.vy+=(cy-b.y)*.02;}
       if(k<22)return true;explode(cx|0,cy|0,18,{col:[255,90,70]});damageEnemies(cx,cy,50,70,0,-5,true);shockFx(cx,cy,1.2);return false;});}});}},
 // the Wasp zips enemy to enemy, stinging (it shocks)
 {n:'Wasp Assist',fn:(a,p,use)=>{if(summons.some(s=>s.wasp)||!use(24))return;ST.cd=60;fxWord(p.x,p.y-ST.PH-10,'JAN, NOW!',.9,'#ffc93c',true);
   summons.push({wasp:true,x:p.x,y:p.y-10,life:600,tgt:null,cd:0,upd(s){if(!s.tgt||s.tgt.hp<=0||!enemies.includes(s.tgt))s.tgt=nearestEnemy(s.x,s.y,260);const tx=s.tgt?s.tgt.x:pl_.x+14,ty=s.tgt?s.tgt.y:pl_.y-24;
     s.x+=Math.sign(tx-s.x)*Math.min(5,Math.abs(tx-s.x))+(R()-.5)*2;s.y+=Math.sign(ty-s.y)*Math.min(5,Math.abs(ty-s.y))+(R()-.5)*2;
     if(s.tgt&&--s.cd<=0&&Math.hypot(tx-s.x,ty-s.y)<8){s.cd=20;tagged('shock',()=>hitEnemy(s.tgt,9,0,0));zap(s.x,s.y,tx,ty,[255,240,150],[255,200,40]);s.tgt=null;}},
     draw(s){drawPix(s.x,s.y,rgb(255,210,40),true);drawPix(s.x-1,s.y,rgb(30,30,30));drawPix(s.x+1,s.y,rgb(30,30,30));const w=(ST.frame>>1)&1;drawPix(s.x-1,s.y-1-w,rgb(220,240,255));drawPix(s.x+1,s.y-1-w,rgb(220,240,255));}});}},
 // a tunnel to the Quantum Realm under the cursor: what's over it shrinks away
 {n:'Quantum Tunnel',fn:(a,p,use)=>{if(!use(32))return;ST.cd=70;const cx=mouse.wx,cy=mouse.wy,r=46*ST.aoeC;let k=0;fxWord(cx,cy-30,'INTO THE QUANTUM REALM',1,'#ff6b5c',true);snd('psi',cx,cy,{pitch:2});
   ACT.push(()=>{k++;rings.push({x:cx,y:cy,r:r*(1-(k%20)/20),vr:0,life:2,c:[150,220,255]});
     for(const e of enemies){if(e.def.titan||Math.hypot(e.x-cx,e.y-cy)>r)continue;e.sc=Math.max(.2,(e.sc||1)-.012);e.vx+=(cx-e.x)*.02;e.vy+=(cy-e.y)*.02;hitEnemy(e,.9,0,0);if(e.sc<=.25&&e.hp<120){e.hp=0;e.mem.noScore=false;flash(e.x,e.y,10,[150,220,255],3);}}
     return k<160;});}},
 // a toy train, grown to full size, charging down the street
  {n:'Thomas the Tank Engine',fn:(a,p,use)=>{if(summons.some(s=>s.train)||!use(28))return;ST.cd=70;const dir=a.dx<0?-1:1;fxWord(p.x,p.y-ST.PH-10,'CHOO CHOO!',1.1,'#ff6b5c',true);
    summons.push({train:true,x:p.x+dir*10,y:p.y,face:dir,sz:.12,life:160,upd(s){s.sz=Math.min(1,s.sz+.06);s.y=groundBelow(s.x|0,s.y-30);if(s.sz<1)return;s.x+=s.face*5;carve(s.x+s.face*22,s.y-12,12,s.face*5,-1,s.y);damageEnemies(s.x+s.face*18,s.y-12,20,12,s.face*7,-4);
      if(s.t%10===0){ST.shake=Math.max(ST.shake,4);for(let j=0;j<4;j++)spawn(s.x+s.face*10,s.y-30,(R()-.5)*.6,-1,rgb(220,220,225),30,0,0,0,1);}if(s.x<4||s.x>W-4)return false;},draw:drawTrain});}},
 // he shrinks, slips inside the enemy, and grows back
  {n:'Inside Job',fn:(a,p,use)=>{const e=atCursor(90);if(!e||Math.hypot(e.x-p.x,e.y-p.y)>220){noTarget('#ff6b5c');return;}if(!use(24))return;ST.cd=50;p.sizeT=.45;let k=0;fxWord(p.x,p.y-ST.PH-8,'GOING IN!',.9,'#ff6b5c',true);
    ACT.push(()=>{k++;p.script=2;p.dodge=Math.max(p.dodge||0,2);if(e.hp<=0){p.sizeT=1;p.stealth=0;return false;}const dx=e.x-p.x,dy=e.y+e.def.h/2-p.y,d=Math.hypot(dx,dy)||1;
      if(k<=20&&d>4){scriptMove(p,dx/d*Math.min(9,d),dy/d*Math.min(9,d));return true;}p.x=e.x;p.y=e.y+e.def.h/2;p.stealth=3;if(k%6===0){e.flash=3;hitEnemy(e,3,0,0);}if(k<50)return true;
      p.sizeT=1;p.stealth=0;hitEnemy(e,e.def.titan?45:60,0,-5);explode(e.x|0,e.y|0,10,{self:true,col:[255,80,80]});fxWord(e.x,e.y-e.def.h/2-8,'SURPRISE!',1.1,'#ff6b5c',true);return false;});}},
 // the tank on Hank's keychain, enlarged mid-air over the cursor
 {n:'Keychain Tank',ult:true,fn:(a,p,use)=>{if(!use(35))return;ST.cd=90;const x=Math.max(30,Math.min(W-30,mouse.wx|0)),y=Math.max(30,(ST.camY|0)+24);
   placeStruct((x0,y0)=>{fill(x0-16,y0-8,x0+16,y0,STEEL);tint(x0-16,y0-8,x0+16,y0,96,110,70,8);fill(x0-7,y0-14,x0+7,y0-8,STEEL);tint(x0-7,y0-14,x0+7,y0-8,110,124,80,8);fill(x0+7,y0-12,x0+24,y0-10,STEEL);tint(x0+7,y0-12,x0+24,y0-10,70,80,56,4);
     fill(x0-17,y0-2,x0+17,y0+3,STEEL);tint(x0-17,y0-2,x0+17,y0+3,40,40,36,4);fill(x0-5,y0-7,x0+5,y0-2,PROPANE);},x,y);
   fxWord(x,y-24,'ENLARGE!',1.3,'#7fb8ff',true);snd('charge',x,y,{pitch:.5});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_ANTMAN={id:'antman',name:'Ant-Man',pw:7,ph:19,fly:false,fs:2.6,boost:1,run:2.2,jump:5,hp:330,armor:.75,glow:[255,80,60],cape:null,thrust:()=>pickC([255,90,70]),powers:ANT_POWERS};
