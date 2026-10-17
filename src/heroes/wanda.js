// Scarlet Witch: sprite, palette, rig entry, powers and roster entry.
import './spiderman.js'; // evaluation order: runs after heroes/spiderman.js
import { ST } from '../state.js';
import { ACID, ASH, FIRE, GFIRE, GLASS, ICE, KIND, LAVA, NEON, OBSID, OIL, R, S, SAND, SMOKE, SNOW, STEAM, WATER, WOOD, rgb } from '../world/materials.js';
import { H, N, VH, VW, W, bg, bgB, bgD, col, setc, t } from '../world/grid.js';
import { rcount, rid, str } from '../world/support.js';
import { mix3 } from '../render/look.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxImpact, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd, sndLoop } from '../sfx.js';
import { pickC, shockFx, shots } from './powers.js';
import { freezeArea, iceAt } from './xmen.js';
import { gzones } from './wave2.js';
import { hand, mouse, pl_ } from '../player.js';
import { damageEnemies, enemies, enemyAt, hitEnemy } from '../enemies/core.js';
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
 // hold: a hex zone where enemy fire turns around and enemies fumble
 {n:'Chaos Field',fn:(a,p,use)=>{if(!use(.6))return;const cx=mouse.wx,cy=mouse.wy,r=42;
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+e.def.w/2){e.hex=Math.max(e.hex||0,30);if(R()<.04){e.vx+=(R()-.5)*4;e.vy-=R()*2;}}
   for(const s of shots)if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r){s.owner='player';s.vx*=-1.1;s.vy*=-1.1;s.col=[255,60,130];s.ecol=[255,60,130];}
   for(let k=0;k<5;k++){const an=R()*6.283,rr=r*(.4+R()*.6);spawn(cx+Math.cos(an)*rr,cy+Math.sin(an)*rr,-Math.sin(an)*1.2,Math.cos(an)*1.2,rgb(255,60+R()*60|0,140),12,0,1,0,1);}
   if(ST.frame%3===0)rings.push({x:cx,y:cy,r:r,vr:-1.5,life:6,c:[255,60,130]});const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+cx)/2+(R()-.5)*14,(h.y+cy)/2+(R()-.5)*14],[cx,cy]],life:1,c:[255,140,190],g:[255,40,120]});sndLoop('hexf','arc',cx,cy,{v:.5});}},
 // "No more." Every weak enemy on screen simply stops existing; the rest are badly hurt
 {n:'No More',fn:(a,p,use)=>{if(!use(60))return;ST.cd=180;let gone=0;fxWord(p.x,p.y-ST.PH-12,'NO MORE.',1.8,'#ff6fa8',true);ST.hitstop=Math.max(ST.hitstop,5);fxImpact(p.x,p.y-ST.PH/2,5);shockFx(p.x,p.y-ST.PH/2,1.2);snd('screech',p.x,p.y,{pitch:.6});
   for(const e of enemies){if(e.x<ST.camX-20||e.x>ST.camX+VW+20||e.y<ST.camY-20||e.y>ST.camY+VH+20)continue;if(!e.def.title&&e.hp<=90){for(let k=0;k<30;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*1.5,-R()*2,rgb(255,40+R()*80|0,120),30,0,1,0,1);e.mem.noScore=false;e.hp=0;gone++;}else hitEnemy(e,e.def.hp*.25,0,0);}
   flash(p.x,p.y-ST.PH/2,200,[255,40,120],12);if(gone)fxWord(p.x,p.y-ST.PH-34,gone+' ERASED',1.1,'#ff6fa8',true);}},
 // a hex of bad luck: weapons jam and backfire, they trip, every hit lands harder
 {n:'Bad Luck',fn:(a,p,use)=>{if(!use(24))return;ST.cd=40;const cx=mouse.wx,cy=mouse.wy;let n=0;for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<70+e.def.w/2){e.hex=Math.max(e.hex||0,480);n++;}
   rings.push({x:cx,y:cy,r:6,vr:5,life:14,c:[255,60,130]});fxWord(cx,cy-30,n?'JINXED':'...',1,'#ff6fa8',true);snd('psi',cx,cy,{pitch:1.3});}},
 // reweave reality: the city in the circle goes back to how it was before the fight
 {n:'Reweave',fn:(a,p,use)=>{if(!ST.T0||!use(30))return;ST.cd=50;const cx=mouse.wx|0,cy=mouse.wy|0,r=36,rr=rcount.length;let n=0;rcount.push(0);
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-2)continue;const i=Y*W+X;
     if(Math.abs(X-pl_.x)<=ST.PW/2+1&&Y>pl_.y-ST.PH-1&&Y<=pl_.y)continue;if(enemyAt(X,Y,0))continue;
     if(t[i]!==ST.T0[i]||col[i]!==ST.C0[i]){setc(i,ST.T0[i]);col[i]=ST.C0[i];if(KIND[t[i]]===S){rid[i]=rr;str[i]=15;n++;}}if(bg[i]!==ST.B0[i]){bg[i]=ST.B0[i];bgB[i]=bg[i]!==bgD[i]?1:0;}}
   rcount[rr]=n;for(let k=0;k<60;k++){const an=R()*6.283,d=R()*r;spawn(cx+Math.cos(an)*d,cy+Math.sin(an)*d,-Math.cos(an),-Math.sin(an),rgb(255,90,160),18,0,1,0,1);}fxWord(cx,cy-r-6,'REWOVEN',1.1,'#ff6fa8',true);snd('psi',cx,cy,{pitch:.8});}},
 // gravity runs backwards inside the hex for five seconds
 {n:'Gravity Hex',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;gzones.push({x:mouse.wx,y:mouse.wy,r:62,life:300});fxWord(mouse.wx,mouse.wy-66,'UPSIDE DOWN',1.1,'#ff6fa8',true);snd('psi',mouse.wx,mouse.wy,{pitch:.5});}},
 // swap the elements: water to lava, lava to water, fire to ice, ice to fire, sand to glass and back
 {n:'Elemental Inversion',fn:(a,p,use)=>{if(!use(28))return;ST.cd=45;const cx=mouse.wx|0,cy=mouse.wy|0,r=30;const SW2={[WATER]:LAVA,[LAVA]:WATER,[ICE]:FIRE,[FIRE]:ICE,[GFIRE]:ICE,[SAND]:GLASS,[GLASS]:SAND,[STEAM]:SMOKE,[SMOKE]:STEAM,[SNOW]:ASH,[OIL]:WATER,[ACID]:WATER};
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X,to=SW2[t[i]];if(to!==undefined)setc(i,to);}
   rings.push({x:cx,y:cy,r:r,vr:-2,life:10,c:[255,60,130]});fxWord(cx,cy-r-6,'INVERTED',1.1,'#ff6fa8',true);snd('psi',cx,cy,{pitch:1.1});}},
 // conjure random objects out of thin air above the cursor
 {n:'Conjure Chaos',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;const pool=['car','propane','boulder','crates','oil','girder','tree'];
   for(let k=0;k<4;k++){const id=pool[R()*pool.length|0],o=OBJS.find(z=>z.id===id)||OBJS[0];const x=Math.max(30,Math.min(W-30,mouse.wx+(k-1.5)*30|0)),y=Math.max(40,(ST.camY|0)+30+(R()*20|0));placeStruct(o.place,x,y);}
   fxWord(mouse.wx,ST.camY+20,'ABRA-CHAOS!',1.2,'#ff6fa8',true);flash(mouse.wx,ST.camY+40,90,[255,60,130],8);snd('psi',mouse.wx,ST.camY+40,{pitch:.7});}},
 // chaos unleashed: everything around her turns into something else
 {n:'Chaos Unleashed',fn:(a,p,use)=>{if(!use(55))return;ST.cd=140;const cx=p.x|0,cy=p.y-ST.PH/2|0,r=62;fxWord(cx,cy-40,'CHAOS!',1.8,'#ff6fa8',true);ST.hitstop=Math.max(ST.hitstop,4);fxImpact(cx,cy,4);shockFx(cx,cy,1.3);
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d2=x*x+y*y;if(d2>r*r||d2<100)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(KIND[m]!==S)continue;const q2=R(),c=col[i];
     if(q2<.3){setc(i,SAND);col[i]=c;}else if(q2<.36)setc(i,WATER);else if(q2<.42)setc(i,GLASS);else if(q2<.44)setc(i,LAVA);else if(q2<.5)setc(i,R()<.5?WOOD:NEON);}
   damageEnemies(cx,cy,r+10,70,0,-4,true);flash(cx,cy,180,[255,40,120],12);rings.push({x:cx,y:cy,r:8,vr:5,life:16,c:[255,60,130]});ST.shake=22;snd('boom',cx,cy,{size:1.6});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_WANDA={id:'wanda',name:'Scarlet Witch',spr:SPR_WANDA,pal:PAL_WANDA,pw:7,ph:19,fly:true,fs:3.0,boost:2.0,run:1.9,jump:4.6,hp:300,armor:.8,glow:[255,60,130],cape:null,thrust:()=>pickC([255,70,140]),powers:WANDA_POWERS};
