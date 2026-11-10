// Ultron (playable): sprite, palette, rig entry, powers and roster entry.
import './juggernaut.js'; // evaluation order: runs after heroes/juggernaut.js
import { ST } from '../state.js';
import { KIND, OBSID, R, S, STEEL, rgb } from '../world/materials.js';
import { H, VH, W, col, setc, t } from '../world/grid.js';
import { mix3 } from '../render/look.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { aim, beamCore, drones, grabRegion, isMetal, shockFx, shots, zap } from './powers.js';
import { ACT, aimFrom, eyes } from './xmen.js';
import { boxHit, mouse } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { summons } from './abilities.js';
import { groundBelow } from '../ui/spawn.js';
import { bodyImpact, chunkAt, drawPix, ghost, noTarget, tagged } from './kitlib.js';
import { makeBody } from '../world/bodies.js';
import { bodies, q } from '../world/support.js';
import { spawn } from '../world/particles.js';


const ULTRON_POWERS=[
 {n:'Encephalo Beam',fn:(a,p,use)=>{if(!use(.9))return;const b=aimFrom(eyes());beamCore(b,{pow:110,rad:1,len:460,w:2+((ST.frame>>1)&1),c:[255,200,190],g:[255,30,30],spark:()=>rgb(255,60+R()*100,50),dmg:5,noAsh:true});}},
 {n:'Concussion Blast',fn:(a,p,use)=>{if(!use(6))return;ST.cd=10;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'repulsor',life:100,boom:9,fire:.1,col:[255,80,60],ecol:[255,80,60]});flash(a.h.x,a.h.y,10,[255,60,40],3);}},
 // four Ultron sentries: they orbit him firing concussion rays, then dive-bomb the cursor
 {n:'Sentry Swarm',fn:(a,p,use)=>{if(drones.some(d=>d.red)||!use(30))return;ST.cd=60;for(let k=0;k<4;k++)drones.push({x:p.x+(R()-.5)*20,y:p.y-ST.PH-6,life:720,cool:10+k*6,ph:k*1.57,red:true});fxWord(p.x,p.y-ST.PH-10,'MY CHILDREN.',1,'#ff6b5c',true);snd('emp',p.x,p.y,{pitch:2,v:.5});}},
 // a five-punch vibranium combo, each one a shockwave
 {n:'Vibranium Barrage',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;let k=0;ACT.push(()=>{if(k%4===0){p.punchF=8;const A2=aim(),x=A2.h.x+A2.dx*8,y=A2.h.y+A2.dy*8;explode(x|0,y|0,6,{self:true,quiet:true,col:[255,120,90]});damageEnemies(x,y,12,14,A2.dx*4,A2.dy*4-1);snd('punch',x,y);}return++k<20;});fxWord(p.x,p.y-ST.PH-8,'BAM-BAM-BAM!',1,'#ff6b5c',true);}},
 // adamantium plating: for six seconds almost nothing gets through
 {n:'Adamantium Shell',fn:(a,p,use)=>{if(p.shell>0||!use(30))return;ST.cd=40;p.shell=360;fxWord(p.x,p.y-ST.PH-8,'ADAMANTIUM.',1,'#d8e4ff',true);flash(p.x,p.y-ST.PH/2,40,[220,230,255],8);snd('clang',p.x,p.y);}},
 // assimilate: the ground around him turns to machine steel, and nearby robots join him
 {n:'Assimilate',fn:(a,p,use)=>{if(!use(32))return;ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,r=28;let n=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==STEEL&&t[i]!==OBSID&&R()<.85){const c=col[i];setc(i,STEEL);col[i]=mix3(c,[150,158,176],.7);}}
   for(const e of enemies)if(isMetal(e)&&!e.def.title&&Math.hypot(e.x-cx,e.y-cy)<r+30){e.ally=900;n++;}
   fxWord(cx,cy-r-6,n?n+' ASSIMILATED':'ASSIMILATE',1.1,'#ff6b5c',true);rings.push({x:cx,y:cy,r:r,vr:-2,life:12,c:[255,60,50]});snd('emp',cx,cy);}},
 // a lance of red energy from orbit drills a shaft straight down through the cursor
 {n:'Orbital Lance',fn:(a,p,use)=>{if(!use(40))return;ST.cd=70;const x=mouse.wx|0;let k=0;fxWord(x,ST.camY+30,'TARGET ACQUIRED.',1,'#ff6b5c',true);snd('charge',x,mouse.wy,{pitch:.6});
   ACT.push(()=>{k++;if(k<30){if(k%4<2)beams.push({x0:x,y0:ST.camY,x1:x,y1:ST.camY+VH,life:1,w:0,c:[255,90,70],g:[160,20,20]});return true;}
     const y=(ST.camY|0)+(k-30)*9;for(let yy=y;yy<y+9;yy+=3)explode(x+(R()-.5)*4|0,yy,7,{self:true,quiet:true,fire:.15,col:[255,60,40]});damageEnemies(x,y,16,20,0,4,true);
     beams.push({x0:x,y0:ST.camY,x1:x,y1:y+9,life:2,w:3,c:[255,220,210],g:[255,30,20]});ST.shake=Math.max(ST.shake,8);if(k%6===0)snd('boom',x,y,{size:.8});return k<100&&y<H-44;});}},
 // an overload nova: arcs of electricity to everything nearby, robots get stunned
 {n:'Overload Pulse',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;const cx=p.x,cy=p.y-ST.PH/2;for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<120){zap(cx,cy,e.x,e.y,[255,200,190],[255,40,40]);hitEnemy(e,30*(1-d/160),0,-2);if(isMetal(e))e.frozen=Math.max(e.frozen||0,90);}}
   explode(cx|0,cy|0,10,{self:true,col:[255,60,40]});shockFx(cx,cy,1);flash(cx,cy,120,[255,50,40],10);fxWord(cx,cy-30,'OVERLOAD!',1.3,'#ff6b5c',true);}},
 // upload into the nearest robot: Ultron's mind jumps bodies, the old shell explodes
 {n:'Upload',fn:(a,p,use)=>{let tg=null,bd=170;for(const e of enemies){if(!isMetal(e)||e.def.title)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;tg=e;}}if(!tg){fxWord(p.x,p.y-ST.PH-6,'NO HOST',.8,'#ff6b5c',true);return;}if(!use(25))return;ST.cd=60;
   const ox=p.x,oy=p.y;zap(ox,oy-ST.PH/2,tg.x,tg.y,[255,200,190],[255,40,40]);p.x=tg.x;p.y=tg.y+tg.def.h/2;tg.hp=0;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.3);explode(ox|0,oy-ST.PH/2|0,8,{self:true,col:[255,80,60]});if(boxHit(p.x,p.y))punchOut(p);fxWord(p.x,p.y-ST.PH-8,'UPLOADED.',1.1,'#ff6b5c',true);snd('zap',p.x,p.y);}},
 // three laser turrets bolt themselves to the surface around the cursor
 {n:'Turret Grid',fn:(a,p,use)=>{if(summons.filter(s=>s.turret).length>=3||!use(26))return;ST.cd=50;for(let i=0;i<3;i++){const x=mouse.wx+(i-1)*30,y=groundBelow(x|0,mouse.wy);
   summons.push({turret:true,x,y,life:720,cd:20+i*10,upd(s){if(--s.cd<=0){const e=nearestEnemy(s.x,s.y-6,260);if(e){s.cd=30;const d=Math.hypot(e.x-s.x,e.y-s.y+6)||1;let x=s.x,y=s.y-6;for(let k=0;k<d;k+=2){x+=(e.x-s.x)/d*2;y+=(e.y-s.y+6)/d*2;}beams.push({x0:s.x,y0:s.y-6,x1:e.x,y1:e.y,life:3,w:0,c:[255,220,210],g:[255,30,20]});hitEnemy(e,10,0,0);snd('elaser',s.x,s.y,{v:.3});}}},
     draw(s){for(let y=0;y<6;y++)for(let x=-3;x<=3;x++)if(Math.abs(x)<=3-(y>>1))drawPix(s.x+x,s.y-y,y<2?rgb(80,84,96):rgb(160,166,180));drawPix(s.x,s.y-6,rgb(255,40,40),true);}});}
   fxWord(mouse.wx,mouse.wy-24,'GRID ONLINE.',.9,'#ff6b5c',true);}},
 // a copy of himself marches to the nearest enemy and self-destructs
 {n:'Ultron Clone Bomb',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-8,'THERE ARE NO STRINGS ON ME',.8,'#ff6b5c',true);
   summons.push({x:p.x+p.face*10,y:p.y,life:300,face:p.face,upd(s){const e=nearestEnemy(s.x,s.y-8,300);if(e){s.face=e.x>s.x?1:-1;s.x+=s.face*2;s.y=groundBelow(s.x|0,s.y-12);if(Math.hypot(e.x-s.x,e.y-s.y+8)<14)s.life=1;}},
     end(s){explode(s.x|0,s.y-8|0,16,{self:true,fire:.3,col:[255,60,40]});shockFx(s.x,s.y,1);},draw(s){ghost(s.x,s.y,s.face,[255,120,110]);}});}},
 // Sokovia: the ground under the cursor tears loose, rises on thrusters, and comes down where he points
  {n:'Sokovia',fn:(a,p,use)=>{const n=grabRegion(mouse.wx|0,mouse.wy|0,10)||chunkAt(mouse.wx,mouse.wy,16);if(n<40){noTarget('#ff6060','NOTHING TO LIFT');return;}if(!use(32))return;ST.cd=80;const b=makeBody(q,n,false);if(!b)return;fxWord(b.x,b.y-30,'DO YOU SEE THE BEAUTY OF IT?',.9,'#ff6060',true);let k=0;
    ACT.push(()=>{k++;if(!bodies.includes(b))return false;b.rest=0;if(k<50){b.vy=-3.5;b.vx*=.8;for(let j=0;j<2;j++)spawn(b.x+(R()-.5)*b.rmax,b.y+b.rmax*.6,(R()-.5),1.5,R()<.5?rgb(150,200,255):rgb(255,120,90),10,0,1,0,1);return true;}
      if(k<80){b.vy=-.3;b.vx=0;return true;}b.vx=Math.max(-6,Math.min(6,(mouse.wx-b.x)*.05));b.vy=7;b.thrown=true;bodyImpact(b,45,[255,90,90]);return false;});}},
 // a lattice of beams lifts everything near the cursor, shocks it, and slams it back down
  {n:'Repulsor Lattice',fn:(a,p,use)=>{const cx=mouse.wx,cy=mouse.wy,r=70*ST.aoeC,list=enemies.filter(e=>!e.def.titan&&Math.hypot(e.x-cx,e.y-cy)<r);if(!list.length){noTarget('#ff6060');return;}if(!use(26))return;ST.cd=60;let k=0;fxWord(cx,cy-r,'NO STRINGS ON ME',1,'#ff6060',true);
    ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;if(k<60){e.vy=0;e.vx*=.8;e.frozen=Math.max(e.frozen||0,2);e.y-=.7*(1-k/60);if(k%3===0)beams.push({x0:e.x,y0:e.y+e.def.h/2+30,x1:e.x,y1:e.y,life:3,w:0,c:[255,220,220],g:[255,60,60]});if(k%15===0)tagged('shock',()=>hitEnemy(e,8,0,0));}
      else{e.frozen=0;e.vy=9;e.thrownT=60;hitEnemy(e,18,0,6);}}return k<60;});}},
 // a sweeping arc of encephalo fire from his eyes that cuts the city in half
 {n:'Annihilation Sweep',ult:true,fn:(a,p,use)=>{if(!use(38))return;ST.cd=70;const base=Math.atan2(a.dy,a.dx);let k=0;fxWord(p.x,p.y-ST.PH-10,'ANNIHILATION.',1.2,'#ff6b5c',true);
   ACT.push(()=>{k++;const an=base-.9+k/40*1.8;beamCore({h:eyes(),dx:Math.cos(an),dy:Math.sin(an)},{pow:900,rad:4,len:520,w:5,c:[255,220,210],g:[255,30,20],spark:()=>rgb(255,60+R()*120,40),dmg:10,noAsh:true});ST.shake=Math.max(ST.shake,8);return k<40;});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_ULTRON={id:'ultron',name:'Ultron',pw:7,ph:19,fly:true,fs:3.1,boost:2.2,run:1.9,jump:4.4,hp:360,armor:.6,glow:[255,50,40],cape:null,thrust:()=>R()<.6?rgb(255,80,60):rgb(255,200,180),powers:ULTRON_POWERS};
