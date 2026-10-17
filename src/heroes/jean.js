// Jean Grey: sprite, palette, rig entry, powers and roster entry.
import './iceman.js'; // evaluation order: runs after heroes/iceman.js
import { ST } from '../state.js';
import { F, FIRE, G, HARD, KIND, L, P, R, RUBBLE, S, STEEL, rgb } from '../world/materials.js';
import { H, W, col, markDirty, t, wake } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { pg, pl, pvx, pvy, px, py, spawn } from '../world/particles.js';
import { beams, flash, fxBurst, fxImpact, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { shieldAs, shots } from './powers.js';
import { ACT } from './xmen.js';
import { hand, mouse, pl_, toggleFly } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';


const SPR_JEAN=[
"....LHHHh....",
"...LHHHHHh...",
"..LHfffFHhh..",
"..HHefeFHhh..",
"..HHfFFFHhh..",
"..HhHfFHhhh..",
"..HhOOfOOhh..",
".PDHPDODdhDd.",
".PDHPOOOdhDd.",
".PDHPDODdhDd.",
".PDhPDDddkDd.",
".OokPOOodkOo.",
".Oo.PDDDd.Oo.",
"....PD.Dd....",
"....PD.Dd....",
"...PD...Dd...",
"...PD...Dd...",
"...OO...Oo...",
"...OO...Oo...",
"..OOO...OOo..",
"..OOO...OOo..",
"..ooo...ooo.."];

const PAL_JEAN={L:rgb(242,98,54),H:rgb(198,44,28),h:rgb(126,24,16),f:rgb(236,190,158),F:rgb(188,138,110),e:rgb(255,190,110),D:rgb(178,26,36),d:rgb(106,12,20),P:rgb(232,66,66),O:rgb(240,186,58),o:rgb(166,116,28),k:rgb(56,6,12)};

// animation rig entry (see render/rig.js)
ANIM.jean={leg:13,mid:6,armC:'PDd',tipC:'OOo',aw:2,al:5,fs:2,sh:[10,7],hide:rect(10,11,7,12),blink:'e',lid:'f',cape:'Hh'};

const JEAN_POWERS=[
 {n:'Telekinesis',tk:{r:12,range:0,tether:true,throwMul:1.7}},
 {n:'Psi Bolts',fn:(a,p,use)=>{if(!use(9))return;ST.cd=14;fxWord(a.h.x,a.h.y-12,'VREEE!',.8,'#ff9ad8',true);for(let k=0;k<3;k++)shots.push({x:a.h.x,y:a.h.y,vx:a.dx*4+(R()-.5)*3,vy:a.dy*4+(R()-.5)*3,type:'psi',life:160,col:[255,120,210],ecol:[255,120,210],boom:6,home:true,delay:k*3});}},
 {n:'Psychic Wave',fn:(a,p,use)=>{if(!use(22))return;ST.cd=34;const cx=a.h.x,cy=a.h.y,R0=95,ang=Math.atan2(a.dy,a.dx);fxWord(cx+a.dx*30,cy-10,'VWAMM!',1.3,'#ff9ad8',true);fxBurst(cx+a.dx*20,cy+a.dy*20,40,'#ff9ad8');
   for(let n=0;n<5000;n++){const d=Math.sqrt(R())*R0,t2=ang+(R()-.5)*1.2,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;const f=1-d/R0;
     if(KIND[m]===P||KIND[m]===L){if(R()<f+.3){spawn(X,Y,Math.cos(t2)*7*f,Math.sin(t2)*7*f-1,col[i],80,m,0);t[i]=0;wake(i);}}
     else if(KIND[m]===S&&m!==STEEL&&R()<f*.25/(1+HARD[m]*.3)){spawn(X,Y,Math.cos(t2)*6*f,Math.sin(t2)*6*f-1,col[i],80,RUBBLE,0);t[i]=0;markDirty(i);wake(i);}
     else if(KIND[m]===G||KIND[m]===F){t[i]=0;wake(i);}}
   damageCone(cx,cy,a.dx,a.dy,R0,25,9);for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*9;b.vy+=a.dy*9-2;b.thrown=true;}}
   for(let n=0;n<ST.np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<R0&&(dx*a.dx+dy*a.dy)/(d||1)>.5){pvx[n]+=a.dx*4;pvy[n]+=a.dy*4;}}
   for(let k=0;k<3;k++)rings.push({x:cx+a.dx*k*14,y:cy+a.dy*k*14,r:4+k*4,vr:3,life:12,c:[255,140,220]});flash(cx,cy,60,[255,110,200],8);ST.shake+=8;}},
 {n:'Mind Crush',fn:(a,p,use)=>{if(!use(.7))return;const cx=mouse.wx,cy=mouse.wy,r=34;
   for(const e of enemies){const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy);if(d<r+e.def.w){e.vx+=dx/(d||1)*.6;e.vy+=dy/(d||1)*.6-.2;hitEnemy(e,1.4,0,0);}}
   for(let n=0;n<500;n++){const an=R()*6.283,d=Math.sqrt(R())*r,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(!m)continue;
     if(KIND[m]===S&&d<12&&m!==STEEL&&R()<.05){t[i]=RUBBLE;markDirty(i);wake(i);}else if(KIND[m]===P&&R()<.3){spawn(X,Y,(cx-X)*.06,(cy-Y)*.06,col[i],40,m,0,0,1);t[i]=0;wake(i);}}
   for(let k=0;k<4;k++){const an=R()*6.283,rr=r*(.6+R()*.4);spawn(cx+Math.cos(an)*rr,cy+Math.sin(an)*rr,-Math.cos(an)*1.5,-Math.sin(an)*1.5,rgb(255,120,210),14,0,1,0,1);}
   if(ST.frame%2===0)rings.push({x:cx,y:cy,r:r*.9,vr:-2,life:6,c:[255,110,200]});if(ST.frame%30===0)fxWord(cx,cy-r,'GRRKK!',.9,'#ff9ad8',true);const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+cx)/2+(R()-.5)*10,(h.y+cy)/2+(R()-.5)*10],[cx,cy]],life:1,c:[255,170,230],g:[255,80,190]});}},
 {n:'Phoenix Force',fn:(a,p,use)=>{if(!use(60))return;ST.cd=120;const cx=p.x,cy=p.y-ST.PH/2;let k=0;fxWord(cx,cy-40,'SKREEEEE!',1.7,'#ffb340',true);ST.hitstop=Math.max(ST.hitstop,4);fxImpact(cx,cy,5);
   ACT.push(()=>{const sc=k*2.2;for(let n=0;n<26;n++){const u=R()*2-1,wing=Math.sign(u)||1,wx=u*sc*1.6,wy=-Math.abs(Math.sin(Math.abs(u)*3.1))*sc*.55+Math.abs(u)*sc*.2;spawn(cx+wx,cy+wy,wx*.02+(R()-.5),wy*.02-.6,R()<.5?rgb(255,180,60):rgb(255,90,30),22+R()*10,R()<.04?FIRE:0,1,0,1);}
     for(let n=0;n<10;n++)spawn(cx+(R()-.5)*6,cy-sc*.5-R()*sc*.3,(R()-.5),-1.2,rgb(255,230,150),18,0,1,0,1);
     if(k===16){for(let s2=0;s2<3;s2++)explode(cx+(R()-.5)*60,cy+(R()-.5)*30,14,{fire:.6,col:[255,150,50],word:s2?undefined:'PHWOOOM!'});damageEnemies(cx,cy,110,90,0,-4,true);
       for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<140){b.vx+=dx/d*8;b.vy+=dy/d*8-3;}}flash(cx,cy,160,[255,150,50],14);ST.shake=22;}
     flash(cx,cy,30+k*4,[255,120,40],2);return++k<26;});}},
];

JEAN_POWERS.push(
 {n:'Levitate Crowd',fn:(a,p,use)=>{if(!use(28))return;ST.cd=50;const cx=mouse.wx,cy=mouse.wy,list=enemies.filter(e=>Math.hypot(e.x-cx,e.y-cy)<90);let k=0;fxWord(cx,cy-30,'HNNNN...',1,'#ff9ad8',true);
   ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;if(k<40){e.vy=-1.6;e.vx*=.8;e.frozen=Math.max(e.frozen||0,2);if(ST.frame%3===0)spawn(e.x,e.y,(R()-.5),(R()-.5),rgb(255,120,210),10,0,1,0,1);}else{e.vy=9;e.frozen=0;e.mem.slam=true;}}
     if(k===40)fxWord(cx,cy,'SLAM!',1.4,'#ff9ad8',true);if(k>40){for(const e of list)if(e.mem.slam&&e.ground){e.mem.slam=false;hitEnemy(e,40,0,-2);explode(e.x,e.y+e.def.h/2,5,{col:[255,110,200],quiet:true,self:true});}}
     return k<70;});}},
 {n:'Mind Shield',fn:(a,p,use)=>{if(!use(.45))return;shieldAs([[255,200,240],[255,110,200],[255,80,190]],false);}},
 {n:'Debris Storm',fn:(a,p,use)=>{if(!use(.4))return;if(p.debrisOn===ST.frame-1||p.debrisOn===ST.frame){p.debrisOn=ST.frame;}else{p.debrisOn=ST.frame;fxWord(p.x,p.y-ST.PH-8,'RRRMMM',.9,'#ff9ad8',true);
     ACT.push(()=>{const holding=mouse.down&&ST.CH.powers[ST.cur]&&ST.CH.powers[ST.cur].n==='Debris Storm'&&pl_.debrisOn>=ST.frame-1;const cx=pl_.x,cy=pl_.y-ST.PH/2;
       if(holding){for(let n=0;n<ST.np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<90&&d>1){const want=24+(n%5)*4;pvx[n]=pvx[n]*.85+(-dy/d*2.6+(dx/d)*(want-d)*-.06)*.15*6;pvy[n]=pvy[n]*.85+(dx/d*2.6+(dy/d)*(want-d)*-.06)*.15*6;pl[n]=Math.max(pl[n],30);}}
         for(let n=0;n<60;n++){const an=R()*6.283,d=R()*50,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(KIND[m]===P&&R()<.5){spawn(X,Y,0,-1,col[i],120,m,0,0,0);t[i]=0;wake(i);}}
         return true;}
       let shot=0;for(let n=0;n<ST.np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<60){const tx=mouse.wx-px[n],ty=mouse.wy-py[n],td=Math.hypot(tx,ty)||1;pvx[n]=tx/td*8;pvy[n]=ty/td*8;pg[n]|=2;shot++;}}
       if(shot)fxWord(cx,cy-20,'FWAAM!',1.2,'#ff9ad8',true);damageLine(cx,cy,mouse.wx,mouse.wy,10,Math.min(60,shot*.4));return false;});}}},
);

JEAN_POWERS.push(
 {n:'Phoenix Wings',fn:(a,p,use)=>{if(p.wings>0||!use(40))return;p.wings=360;ST.cd=40;if(!p.fly)toggleFly(true);fxWord(p.x,p.y-ST.PH-12,'SKREEEE!',1.4,'#ffb340',true);fxBurst(p.x,p.y-ST.PH/2,50,'#ffb340');flash(p.x,p.y-ST.PH/2,60,[255,150,50],10);}},
 {n:'Telekinetic Rip',fn:(a,p,use)=>{if(!use(40))return;ST.cd=70;const cx=mouse.wx|0,cy=mouse.wy|0,r=20;let n=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r*(.8+R()*.2))continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-40)continue;const i=Y*W+X,m=t[i];if(m&&(KIND[m]===S||KIND[m]===P)){q[n++]=i;markDirty(i);}}
   if(n<20)return;const b=makeBody(q,n,true);if(!b)return;b.tx=b.x;b.ty=b.y-60;let k=0;fxWord(cx,cy-30,'RRRMMMM...',1.1,'#ff9ad8',true);ST.shake+=6;
   ACT.push(()=>{k++;if(!bodies.includes(b))return false;for(let q2=0;q2<6;q2++){const j=R()*b.ex.length|0;spawn(b.x+b.ex[j],b.y+b.ey[j],(R()-.5)*.6,(R()-.5)*.6,rgb(255,120,210),10,0,1,0,1);}
     if(k<35){b.tx=cx;b.ty=cy-60;return true;}
     b.held=false;b.vx=0;b.vy=12;b.va=(R()-.5)*.05;b.thrown=true;b.safeP=ST.frame+30;fxWord(cx,cy,'SLAM!',1.5,'#ff9ad8',true);return false;});}},
);

JEAN_POWERS.push(
 // take over an enemy's mind: for ten seconds it fights for you, then the link snaps
 {n:'Puppet Master',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,50);if(!e||e.def.title||e.ally>0){if(ST.frame-(p.denyT||-99)>20){p.denyT=ST.frame;fxWord(mouse.wx,mouse.wy-10,e&&e.def.title?'TOO STRONG':'NO MIND HERE',.8,'#ff9ad8',true);snd('deny',p.x,p.y);}return;}
   if(!use(35))return;ST.cd=60;e.ally=600;e.frozen=0;fxWord(e.x,e.y-e.def.h/2-8,'MINE NOW.',1.2,'#ff9ad8',true);snd('psi',e.x,e.y,{pitch:.7});
   const h=hand();for(let k=0;k<3;k++)beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2+(R()-.5)*20,(h.y+e.y)/2+(R()-.5)*20],[e.x,e.y]],life:8,c:[255,180,235],g:[255,80,190]});rings.push({x:e.x,y:e.y,r:e.def.w,vr:-1,life:16,c:[255,120,210]});}},
 // a bubble where time stops: falling sand, water, fire, debris, shots and enemies all hang frozen
 {n:'Stasis Field',fn:(a,p,use)=>{if(ST.stasis||!use(40))return;ST.cd=70;ST.stasis={x:mouse.wx,y:mouse.wy,r:50,life:330,max:330};fxWord(mouse.wx,mouse.wy-56,'STASIS.',1.3,'#ff9ad8',true);rings.push({x:mouse.wx,y:mouse.wy,r:4,vr:4,life:12,c:[255,150,230]});}},
);

// roster entry (CHARS in heroes/index.js)
export const CHAR_JEAN={id:'jean',name:'Jean Grey',spr:SPR_JEAN,pal:PAL_JEAN,pw:7,ph:19,fly:true,fs:3.0,boost:2.1,run:1.9,jump:4.6,hp:320,armor:.8,glow:[255,120,200],cape:null,thrust:()=>R()<.5?rgb(255,150,60):rgb(255,120,210),powers:JEAN_POWERS};
