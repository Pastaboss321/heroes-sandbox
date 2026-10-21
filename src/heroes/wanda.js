// Scarlet Witch: sprite, palette, rig entry, powers and roster entry.
import './spiderman.js'; // evaluation order: runs after heroes/spiderman.js
import { ST } from '../state.js';
import { ACID, ASH, FIRE, GFIRE, GLASS, ICE, KIND, LAVA, NEON, OBSID, OIL, R, S, SAND, SMOKE, SNOW, STEAM, WATER, WOOD, rgb } from '../world/materials.js';
import { H, N, VH, VW, W, col, setc, t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { mix3 } from '../render/look.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxImpact, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd, sndLoop } from '../sfx.js';
import { pickC, shockFx, shots } from './powers.js';
import { ACT, freezeArea, iceAt } from './xmen.js';
import { gzones, ray, solidCells } from './wave2.js';
import { hurlBody } from './villains.js';
import { hand, mouse } from '../player.js';
import { damageEnemies, enemies, hitEnemy } from '../enemies/core.js';
import { OBJS, placeStruct } from '../ui/spawn.js';

const SPR_WANDA=[
"...M..M..M...",
"...MMMMMMM...",
"..HMfffFMHh..",
"..HHefeFHHh..",
"..HHfFFFHHh..",
"..HhHfFHhhh..",
"..ChDDfDDhC..",
"CPDHDDMDDhDdC",
"CPDHDMMMDhDdC",
"CPDhDDMDDhDdC",
"CPD.DDDDd.DdC",
"CMm.MMMMm.MmC",
"CPD.DDDDd.DdC",
"C...DD.Dd...C",
"C...DD.Dd...C",
"C..DD...Dd..C",
"c..DD...Dd..c",
"c..DD...Dd..c",
"c..MM...Mm..c",
"c.MMM...MMm.c",
"..MMM...MMm..",
"..mmm...mmm.."];
const PAL_WANDA={M:rgb(222,40,110),m:rgb(140,20,70),H:rgb(150,52,40),h:rgb(90,28,24),f:rgb(236,190,160),F:rgb(190,140,112),e:rgb(255,80,130),D:rgb(190,30,50),d:rgb(110,16,30),P:rgb(236,82,92),C:rgb(150,20,40),c:rgb(90,12,26)};

// animation rig entry (see render/rig.js)
ANIM.wanda={leg:13,mid:6,armC:'PDd',tipC:'MMm',aw:2,al:5,fs:2,sh:[10,7],hide:rect(10,11,7,12),blink:'e',lid:'f',cape:'Cc'};
const WANDA_POWERS=[
 // a chaos bolt: what it does when it lands is anyone's guess
 {n:'Hex Bolt',fn:(a,p,use)=>{if(!use(6))return;ST.cd=10;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'hex',life:120,col:[255,60,130],home:false,
   onHit:sh=>{const x=sh.x|0,y=sh.y|0,r=R();damageEnemies(x,y,10,18,0,-1);
     if(r<.25)explode(x,y,9,{col:[255,60,130]});else if(r<.5){for(let yy=-8;yy<=8;yy++)for(let xx=-8;xx<=8;xx++)if(xx*xx+yy*yy<64){const i=(y+yy)*W+x+xx;if(i>0&&i<N&&KIND[t[i]]===S&&y+yy<H-44){const c=col[i];setc(i,SAND);col[i]=c;}}fxWord(x,y-10,'CRUMBLE',.8,'#ff6fa8');}
     else if(r<.75){freezeArea(x,y,12,80,6);for(let k=0;k<10;k++)iceAt(x+(R()-.5)*10,y+(R()-.5)*10);}
     else{for(const e of enemies)if(Math.hypot(e.x-x,e.y-y)<30){e.vy=-7;e.vx+=(R()-.5)*6;}for(let k=0;k<20;k++)spawn(x,y,(R()-.5)*3,-R()*4,rgb(255,90,150),20,0,1,1);}}});snd('psi',a.h.x,a.h.y,{pitch:.9,v:.5});}},
 // reality warp: every solid thing in the circle becomes sand (buildings pour away)
 {n:'Transmute',fn:(a,p,use)=>{if(!use(26))return;ST.cd=40;const cx=mouse.wx|0,cy=mouse.wy|0,r=22;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(KIND[m]===S&&m!==OBSID){const c=col[i];setc(i,SAND);col[i]=mix3(c,[214,186,118],.35);}}
   rings.push({x:cx,y:cy,r:4,vr:3,life:10,c:[255,70,140]});flash(cx,cy,40,[255,60,130],6);fxWord(cx,cy-r-6,'TRANSMUTE',1.1,'#ff6fa8',true);snd('psi',cx,cy,{pitch:.6});}},
 // hold: a storm of hex lightning tears up everything around the cursor
 {n:'Hex Storm',fn:(a,p,use)=>{if(!use(.9))return;const cx=mouse.wx,cy=mouse.wy;if(ST.frame%4===0){const x=cx+(R()-.5)*90,r0=ray(x,cy-70,0,1,160,true),r=r0.hit?r0:{x,y:cy+(R()-.5)*40},h=hand();
     beams.push({pts:[[h.x,h.y],[(h.x+x)/2+(R()-.5)*20,(h.y+r.y)/2+(R()-.5)*20],[x,r.y]],life:3,c:[255,150,200],g:[255,40,120]});explode(x|0,r.y|0,5+(R()*4|0),{self:true,quiet:true,col:[255,60,130]});damageEnemies(x,r.y,12,8,0,-2,true);}
   if(ST.frame%3===0)rings.push({x:cx,y:cy,r:50,vr:-2,life:6,c:[255,60,130]});ST.shake=Math.max(ST.shake,2);sndLoop('hexf','arc',cx,cy,{v:.6});}},
 // "No more." Every weak enemy on screen simply stops existing; the rest are badly hurt
 {n:'No More',fn:(a,p,use)=>{if(!use(60))return;ST.cd=180;let gone=0;fxWord(p.x,p.y-ST.PH-12,'NO MORE.',1.8,'#ff6fa8',true);ST.hitstop=Math.max(ST.hitstop,5);fxImpact(p.x,p.y-ST.PH/2,5);shockFx(p.x,p.y-ST.PH/2,1.2);snd('screech',p.x,p.y,{pitch:.6});
   for(const e of enemies){if(e.x<ST.camX-20||e.x>ST.camX+VW+20||e.y<ST.camY-20||e.y>ST.camY+VH+20)continue;if(!e.def.title&&e.hp<=90){for(let k=0;k<30;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*1.5,-R()*2,rgb(255,40+R()*80|0,120),30,0,1,0,1);e.mem.noScore=false;e.hp=0;gone++;}else hitEnemy(e,e.def.hp*.25,0,0);}
   flash(p.x,p.y-ST.PH/2,200,[255,40,120],12);if(gone)fxWord(p.x,p.y-ST.PH-34,gone+' ERASED',1.1,'#ff6fa8',true);}},
 // a rupture in reality runs out from her hand, detonating everything along it
 {n:'Reality Rupture',fn:(a,p,use)=>{if(!use(34))return;ST.cd=55;const dx=a.dx,dy=a.dy,x0=a.h.x,y0=a.h.y;let k=0,x=x0,y=y0;fxWord(x+dx*40,y+dy*40-12,'RUPTURE!',1.3,'#ff6fa8',true);snd('screech',x,y,{pitch:.7,v:.6});
   ACT.push(()=>{k++;x+=dx*7;y+=dy*7;if(k%2===0){explode(x+(R()-.5)*6|0,y+(R()-.5)*6|0,8+(R()*4|0),{self:true,quiet:k%6!==0,col:[255,60,130]});damageEnemies(x,y,16,22,dx*3,-3,true);}
     beams.push({x0,y0,x1:x,y1:y,life:2,w:0,c:[255,170,210],g:[255,40,120]});ST.shake=Math.max(ST.shake,5);return k<40&&x>0&&x<W&&y<H;});}},
 // tear a ball of the city loose, hold it in a hex sphere over her head, then hurl it
 {n:'Hex Sphere',fn:(a,p,use)=>{const cx=mouse.wx|0,cy=mouse.wy|0,n=solidCells(cx,cy,16,false);if(n<40||!use(40))return;ST.cd=70;const b=makeBody(q,n,true);if(!b)return;let k=0;fxWord(cx,cy-24,'HEX SPHERE',1.2,'#ff6fa8',true);snd('rip',cx,cy);ST.shake+=6;
   ACT.push(()=>{k++;if(!bodies.includes(b))return false;b.tx=p.x;b.ty=p.y-ST.PH-b.rmax-10;if(k%2===0){const an=R()*6.283;spawn(b.x+Math.cos(an)*b.rmax,b.y+Math.sin(an)*b.rmax,0,0,rgb(255,60,130),10,0,1,0,1);}
     if(k<40)return true;b.held=false;b.tx=b.ty=undefined;hurlBody(b,mouse.wx,mouse.wy,11);b.safeP=ST.frame+30;fxWord(b.x,b.y-b.rmax,'BEGONE!',1,'#ff6fa8',true);snd('throw',b.x,b.y);return false;});}},
 // gravity runs backwards inside the hex for five seconds
 {n:'Gravity Hex',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;gzones.push({x:mouse.wx,y:mouse.wy,r:62,life:300});fxWord(mouse.wx,mouse.wy-66,'UPSIDE DOWN',1.1,'#ff6fa8',true);snd('psi',mouse.wx,mouse.wy,{pitch:.5});}},
 // swap the elements: water to lava, lava to water, fire to ice, ice to fire, sand to glass and back
 {n:'Elemental Inversion',fn:(a,p,use)=>{if(!use(28))return;ST.cd=45;const cx=mouse.wx|0,cy=mouse.wy|0,r=30;const SW2={[WATER]:LAVA,[LAVA]:WATER,[ICE]:FIRE,[FIRE]:ICE,[GFIRE]:ICE,[SAND]:GLASS,[GLASS]:SAND,[STEAM]:SMOKE,[SMOKE]:STEAM,[SNOW]:ASH,[OIL]:WATER,[ACID]:WATER};
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X,to=SW2[t[i]];if(to!==undefined)setc(i,to);}
   rings.push({x:cx,y:cy,r:r,vr:-2,life:10,c:[255,60,130]});fxWord(cx,cy-r-6,'INVERTED',1.1,'#ff6fa8',true);snd('psi',cx,cy,{pitch:1.1});}},
 // conjure random objects out of thin air above the cursor
 {n:'Conjure Chaos',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;const pool=['car','propane','boulder','crates','oil','girder','tree'];
   for(let k=0;k<4;k++){const id=pool[R()*pool.length|0],o=OBJS.find(z=>z.id===id)||OBJS[0];const x=Math.max(30,Math.min(W-30,mouse.wx+(k-1.5)*30|0)),y=(ST.camY|0)+30+(R()*20|0);if(y<40){shots.push({x,y,vx:(R()-.5),vy:3,type:'hex',life:160,boom:10,col:[255,60,130],ecol:[255,60,130]});continue;}placeStruct(o.place,x,y);}
   fxWord(mouse.wx,ST.camY+20,'ABRA-CHAOS!',1.2,'#ff6fa8',true);flash(mouse.wx,ST.camY+40,90,[255,60,130],8);snd('psi',mouse.wx,ST.camY+40,{pitch:.7});}},
 // chaos unleashed: everything around her turns into something else
 {n:'Chaos Unleashed',fn:(a,p,use)=>{if(!use(55))return;ST.cd=140;const cx=p.x|0,cy=p.y-ST.PH/2|0,r=62;fxWord(cx,cy-40,'CHAOS!',1.8,'#ff6fa8',true);ST.hitstop=Math.max(ST.hitstop,4);fxImpact(cx,cy,4);shockFx(cx,cy,1.3);
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d2=x*x+y*y;if(d2>r*r||d2<100)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(KIND[m]!==S)continue;const q2=R(),c=col[i];
     if(q2<.3){setc(i,SAND);col[i]=c;}else if(q2<.36)setc(i,WATER);else if(q2<.42)setc(i,GLASS);else if(q2<.44)setc(i,LAVA);else if(q2<.5)setc(i,R()<.5?WOOD:NEON);}
   damageEnemies(cx,cy,r+10,70,0,-4,true);flash(cx,cy,180,[255,40,120],12);rings.push({x:cx,y:cy,r:8,vr:5,life:16,c:[255,60,130]});ST.shake=22;snd('boom',cx,cy,{size:1.6});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_WANDA={id:'wanda',name:'Scarlet Witch',spr:SPR_WANDA,pal:PAL_WANDA,pw:7,ph:19,fly:true,fs:3.0,boost:2.0,run:1.9,jump:4.6,hp:300,armor:.8,glow:[255,60,130],cape:null,thrust:()=>pickC([255,70,140]),powers:WANDA_POWERS};
