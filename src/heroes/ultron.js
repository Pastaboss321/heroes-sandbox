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
import { aim, beamCore, drones, isMetal, shockFx, shots, zap } from './powers.js';
import { ACT, aimFrom, eyes } from './xmen.js';
import { boxHit, mouse } from '../player.js';
import { damageEnemies, enemies, hitEnemy } from '../enemies/core.js';

export const SPR_ULTRON=[
"....sSSSs....",
"...sSWSSSs...",
"..sSWSSSSSs..",
"..SW**S**Ss..",
"..SSSkSkSSs..",
"...SS***SS...",
"....sSSSs....",
".WSSsSSSsSSs.",
".WSSs*@*sSSs.",
".WSkSs*sSkSs.",
".WSkSSSSSkSs.",
".WSksSSSskSs.",
".SS.sSkSs.Ss.",
".**.sS.Ss.**.",
"....WS.Ss....",
"....WS.Ss....",
"...WS...Ss...",
"...Wk...ks...",
"...WS...Ss...",
"..WSS...SSs..",
"..WSS...SSs..",
"..sss...sss.."];
export const PAL_ULTRON={S:rgb(188,194,208),s:rgb(108,114,130),W:rgb(240,244,250),k:rgb(40,40,52),'*':rgb(255,40,40),'@':rgb(255,130,90)};

// animation rig entry (see render/rig.js)
ANIM.ultron={leg:14,mid:6,armC:'WSs',tipC:'SSs',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
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
     const y=Math.max(0,ST.camY|0)+(k-30)*9;for(let yy=y;yy<y+9;yy+=3)explode(x+(R()-.5)*4|0,yy,7,{self:true,quiet:true,fire:.15,col:[255,60,40]});damageEnemies(x,y,16,20,0,4,true);
     beams.push({x0:x,y0:ST.camY,x1:x,y1:y+9,life:2,w:3,c:[255,220,210],g:[255,30,20]});ST.shake=Math.max(ST.shake,8);if(k%6===0)snd('boom',x,y,{size:.8});return k<100&&y<H-44;});}},
 // an overload nova: arcs of electricity to everything nearby, robots get stunned
 {n:'Overload Pulse',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;const cx=p.x,cy=p.y-ST.PH/2;for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<120){zap(cx,cy,e.x,e.y,[255,200,190],[255,40,40]);hitEnemy(e,30*(1-d/160),0,-2);if(isMetal(e))e.frozen=Math.max(e.frozen||0,90);}}
   explode(cx|0,cy|0,10,{self:true,col:[255,60,40]});shockFx(cx,cy,1);flash(cx,cy,120,[255,50,40],10);fxWord(cx,cy-30,'OVERLOAD!',1.3,'#ff6b5c',true);}},
 // a sweeping arc of encephalo fire from his eyes that cuts the city in half
 {n:'Annihilation Sweep',fn:(a,p,use)=>{if(!use(38))return;ST.cd=70;const base=Math.atan2(a.dy,a.dx);let k=0;fxWord(p.x,p.y-ST.PH-10,'ANNIHILATION.',1.2,'#ff6b5c',true);
   ACT.push(()=>{k++;const an=base-.9+k/40*1.8;beamCore({h:eyes(),dx:Math.cos(an),dy:Math.sin(an)},{pow:900,rad:4,len:520,w:5,c:[255,220,210],g:[255,30,20],spark:()=>rgb(255,60+R()*120,40),dmg:10,noAsh:true});ST.shake=Math.max(ST.shake,8);return k<40;});}},
 // upload into the nearest robot: Ultron's mind jumps bodies, the old shell explodes
 {n:'Upload',fn:(a,p,use)=>{let tg=null,bd=170;for(const e of enemies){if(!isMetal(e)||e.def.title)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;tg=e;}}if(!tg){fxWord(p.x,p.y-ST.PH-6,'NO HOST',.8,'#ff6b5c',true);return;}if(!use(25))return;ST.cd=60;
   const ox=p.x,oy=p.y;zap(ox,oy-ST.PH/2,tg.x,tg.y,[255,200,190],[255,40,40]);p.x=tg.x;p.y=tg.y+tg.def.h/2;tg.hp=0;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.3);explode(ox|0,oy-ST.PH/2|0,8,{self:true,col:[255,80,60]});if(boxHit(p.x,p.y))punchOut(p);fxWord(p.x,p.y-ST.PH-8,'UPLOADED.',1.1,'#ff6b5c',true);snd('zap',p.x,p.y);}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_ULTRON={id:'ultron',name:'Ultron',spr:SPR_ULTRON,pal:PAL_ULTRON,pw:7,ph:19,fly:true,fs:3.1,boost:2.2,run:1.9,jump:4.4,hp:360,armor:.6,glow:[255,50,40],cape:null,thrust:()=>R()<.6?rgb(255,80,60):rgb(255,200,180),powers:ULTRON_POWERS};
