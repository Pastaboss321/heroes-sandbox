// Doom: sprite, palette, rig entry, powers and roster entry.
import { ACT } from './xmen.js';
import { ST } from '../state.js';
import { EMPTY, GFIRE, KIND, R, S, rgb } from '../world/materials.js';
import { gcol, spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import { posePlayer } from '../render/rig.js';
import { snd } from '../sfx.js';
import { TSL, beam, drones, nova, shield, shockFx, shots, strikes } from './powers.js';
import { boxHit, mouse, toggleFly } from '../player.js';
import { damageCone, enemies, hitEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { H, W, bg, col, markDirty, setc, t } from '../world/grid.js';
import { nearestN } from './kitlib.js';
import { applyStatus } from './abilities.js';

// ================= player / heroes =================
// Each hero: sprite + palette (glow chars: e * @), body size, movement tuning and a power list.
// ---- hero sprites: 3/4 front view, heroic proportions (small head, broad shoulders, V-taper, long legs),
//      light from the upper left, three tones per material plus spot blacks; ink outline added by the renderer

const G=[120,255,160];
const DOOM_POWERS=[
 {n:'Eldritch Bolt',fn:(a,p,use)=>{if(!use(5))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6.5,vy:a.dy*6.5,type:'bolt',life:140,boom:11,fire:.25,green:true});ST.cd=8;ST.shake+=1.2;flash(a.h.x,a.h.y,10,[80,255,120],4);}},
 {n:'Mystic Fire',fn:(a,p,use)=>{if(!use(.4))return;for(let k=0;k<8;k++){const s=2.6+R()*3,sp=(R()-.5)*.4;spawn(a.h.x,a.h.y,(a.dx-sp*a.dy)*s+(R()-.5)*.4,(a.dy+sp*a.dx)*s+(R()-.5)*.4,gcol(),35+R()*30,GFIRE,1,1);}
   if(ST.frame%2===0)spawn(a.h.x+a.dx*8,a.h.y+a.dy*8,a.dx*2,a.dy*2-.3,rgb(30,120,50),20,0,1,0,1);flash(a.h.x+a.dx*10,a.h.y+a.dy*10,14,[30,160,60],2);
   damageCone(a.h.x,a.h.y,a.dx,a.dy,60,.5,.8);}},
 {n:'Disintegrator',fn:(a,p,use)=>{if(!use(.7))return;beam(a);}},
 {n:'Gravity Well',fn:(a,p,use)=>{if(!use(35))return;ST.vortex={x:mouse.wx,y:mouse.wy,life:340,max:340};ST.cd=40;ST.shake+=3;flash(mouse.wx,mouse.wy,40,[60,255,110],10);}},
 {n:'Mystic Shield',fn:(a,p,use)=>{if(!use(.45))return;ST.shieldC=[[170,255,190],[80,220,120],[60,255,100]];shield();}},
 {n:'Gauntlet Swarm',fn:(a,p,use)=>{if(!use(22))return;for(let k=0;k<6;k++)shots.push({x:a.h.x,y:a.h.y,vx:p.face*(.5+R()*1.5),vy:-1.5-R()*2,type:'missile',life:220,tx:mouse.wx+(R()-.5)*30,ty:mouse.wy+(R()-.5)*20,delay:k*4,wob:R()*6,boom:13,fire:.35});ST.cd=45;ST.shake+=2;}},
 {n:'Doombots',fn:(a,p,use)=>{if(drones.length>=3||!use(28))return;drones.push({x:p.x,y:p.y-20,life:1500,cool:20,ph:R()*6});ST.cd=30;rings.push({x:p.x,y:p.y-20,r:2,vr:1.5,life:10,c:[150,255,180]});}},
 {n:'Seismic Slam',fn:(a,p,use)=>{if(!use(22))return;if(p.fly)toggleFly(false);if(p.ground){p.vy=-4.5;p.ground=false;}p.slam=true;p.slamOpt={};ST.cd=45;}},
 {n:'Octessence Sigil',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const cx=mouse.wx,cy=groundBelow(mouse.wx|0,mouse.wy),r=50*ST.aoeC;let k=0;fxWord(cx,cy-30,'BY THE OCTESSENCE!',1.1,'#8dffb0',true);snd('psi',cx,cy,{pitch:.5});
   ACT.push(()=>{k++;if(k<50){for(let j=0;j<3;j++){const an=R()*6.283;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r*.3,0,-.3,rgb(120,255,160),12,0,1,0,1);}if(k%8===0)rings.push({x:cx,y:cy,r,vr:0,life:6,c:G});return true;}
     if(k===50){explode(cx|0,cy|0,10,{self:true,green:true});shockFx(cx,cy,1);fxWord(cx,cy-20,'THE HANDS OF THE DAMNED',.9,'#8dffb0',true);}
     for(let j=0;j<5;j++){const hx=cx+(R()-.5)*r*2,hh=Math.min(70,(k-50)*4);for(let s=0;s<3;s++)spawn(hx,cy-R()*hh,(R()-.5),-1,R()<.5?rgb(60,255,110):rgb(20,140,60),10,0,1,0,1);}
     for(const e of enemies){if(Math.abs(e.x-cx)<r&&e.y>cy-100&&e.y<cy+20){if(!e.def.titan){e.vy=Math.max(e.vy,1.5);e.vx*=.6;}hitEnemy(e,1.6,0,0);}}return k<130;});}},
 {n:'Telekinesis',tk:{r:12,range:0,tether:true,throwMul:1.6}},
 {n:'Mystic Nova',fn:(a,p,use)=>{if(!use(30))return;nova();ST.cd=50;}},
 // Timeslip (Loki's time-slipping): Doom's body stretches out into threads of himself, snaps away, and the threads
 // knit back together where he stood five seconds ago, with the health he had then
 {n:'Timeslip',fn:(a,p,use)=>{if(TSL.length<30||p.slip||!use(30))return;ST.cd=90;const o=TSL[0];let k=0;
   p.slip={rows:posePlayer(p).slice(),face:p.face,x:p.x,y:p.y,t:0,dir:o.x<p.x?-1:1};
   fxWord(p.x,p.y-ST.PH-10,'TIMESLIP',1.2,'#ffb050',true);snd('psi',p.x,p.y,{pitch:.6});
   ACT.push(()=>{k++;const S=p.slip;if(!S)return false;p.script=3;p.vx=0;p.vy=0;ST.caPulse=Math.max(ST.caPulse,3);
     if(k<=18){S.t=k/18;p.x=S.x;p.y=S.y;if(k%4===0)ST.shake=Math.max(ST.shake,2);}
     else if(k===19){p.x=o.x;p.y=o.y;S.x=o.x;S.y=o.y;S.dir=-S.dir;p.hp=Math.max(p.hp,o.hp);TSL.length=0;flash(o.x,o.y-ST.PH/2,30,[255,150,40],6);snd('zap',o.x,o.y,{pitch:.5,v:.6});}
     else{S.t=Math.max(0,1-(k-19)/16);p.x=S.x;p.y=S.y;}
     if(k>=35){p.slip=null;rings.push({x:o.x,y:o.y-ST.PH/2,r:4,vr:3,life:12,c:[255,170,60]});if(boxHit(p.x,p.y))punchOut(p);return false;}
     return true;});}},
 // the world as it was: everything in a circle around the cursor is rebuilt from the untouched map
 {n:'Temporal Restoration',fn:(a,p,use)=>{if(!ST.T0||!use(30))return;ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,r=46*ST.aoeC|0;let k=0;fxWord(cx,cy-r-8,'TIME BENDS TO DOOM',1,'#8dffb0',true);snd('psi',cx,cy,{pitch:.4});
   ACT.push(()=>{k++;const rr=Math.min(r,k*3);for(let y=-rr;y<=rr;y++)for(let x=-rr;x<=rr;x++){const d2=x*x+y*y;if(d2>rr*rr||d2<(rr-3)*(rr-3))continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-4)continue;const i=Y*W+X,m0=ST.T0[i];
       if(m0&&t[i]!==m0&&KIND[m0]===S){setc(i,m0);col[i]=ST.C0[i];markDirty(i);if(R()<.08)spawn(X,Y,0,-.4,rgb(140,255,170),12,0,1,0,1);}else if(!m0&&KIND[t[i]]===S){setc(i,EMPTY);markDirty(i);}if(ST.B0)bg[i]=ST.B0[i];}
     if(k%4===0)rings.push({x:cx,y:cy,r:rr,vr:0,life:4,c:G});
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<rr){hitEnemy(e,.8,0,0);}return rr<r;});}},
 // hold: tethers drain the enemies near the cursor and feed Doom's armour
 {n:'Mystic Siphon',kind:'hold',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,70,4);if(!list.length)return;if(!use(.2))return;const h=a.h;
   for(const e of list){hitEnemy(e,1.1,0,0);p.en=Math.min(100,p.en+.35);if(ST.frame%2===0)beams.push({pts:[[e.x,e.y],[(e.x+h.x)/2+(R()-.5)*16,(e.y+h.y)/2+(R()-.5)*16],[h.x,h.y]],life:2,c:[200,255,210],g:[40,200,80]});if(R()<.4)spawn(e.x,e.y,(h.x-e.x)*.05,(h.y-e.y)*.05,rgb(120,255,160),20,0,1,0,0);}}},
 {n:'Kneel Before Doom',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const r=130*ST.aoeC;let n=0;fxWord(p.x,p.y-ST.PH-14,'KNEEL BEFORE DOOM!',1.2,'#8dffb0',true);rings.push({x:p.x,y:p.y-8,r:6,vr:5,life:20,c:[120,255,160]});
    for(const e of enemies){if(e.def.titan||Math.hypot(e.x-p.x,e.y-p.y)>r)continue;n++;e.vy=8;e.vx=0;applyStatus(e,'stun',120);hitEnemy(e,12,0,6);for(let j=0;j<5;j++)spawn(e.x+(R()-.5)*e.def.w,e.y-e.def.h/2,0,1.5,rgb(120,255,160),12,0,1,0,1);}
    if(!n)fxWord(p.x,p.y-ST.PH-26,'...NO ONE? PATHETIC.',.7,'#8dffb0',true);}},
 {n:'Orbital Strike',ult:true,fn:(a,p,use)=>{if(!use(40))return;strikes.push({x:mouse.wx|0,t:45,dig:0,beam:0});ST.cd=60;}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_DOOM={id:'doom',name:'Doom',pw:7,ph:19,fly:true,fs:2.9,boost:2.1,run:1.8,jump:4.3,hp:300,armor:1,glow:[80,255,130],cape:null,thrust:()=>R()<.6?gcol():rgb(255,210,120),powers:DOOM_POWERS};
