// Human Torch: sprite, palette, rig entry, powers and roster entry.
import './sue.js'; // evaluation order: runs after heroes/sue.js
import { ST } from '../state.js';
import { EMBER, EMPTY, FIRE, FLAM, GFIRE, HARD, ICE, KIND, LAVA, OBSID, R, S, SNOW, STEAM, WATER, rgb } from '../world/materials.js';
import { H, W, setc, t } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd, sndLoop } from '../sfx.js';
import { beamCore, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { FC } from './f4.js';
import { carve, mouse, pl_ } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { echo, tagged } from './kitlib.js';


const TORCH_POWERS=[
 {n:'Fireball',fn:(a,p,use)=>{if(!use(5))return;ST.cd=8;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'fire',life:100,boom:8,fire:.5,col:FC,ecol:[255,140,40]});flash(a.h.x,a.h.y,8,FC,3);}},
 // hold: a jet of flame that cuts through walls and sets the block alight
 {n:'Flame Stream',fn:(a,p,use)=>{if(!use(.9))return;beamCore(a,{pow:140,rad:2,len:260,w:2+(ST.frame&1),c:[255,230,150],g:[255,110,20],spark:()=>rgb(255,120+R()*120,30),dmg:4});
   const L=Math.min(260,a.d);for(let j=0;j<4;j++){const d=R()*L,X=a.h.x+a.dx*d+(R()-.5)*8|0,Y=a.h.y+a.dy*d+(R()-.5)*8|0;if(X>=0&&X<W&&Y>=0&&Y<H){const i=Y*W+X;if(t[i]===0&&R()<.3)setc(i,FIRE);else if(FLAM[t[i]]>0)ignite(i);}}}},
 // a doppelganger of living fire runs at the nearest enemy and goes up like a bomb
 {n:'Flame Clone',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-8,'TWO OF ME!',.9,'#ffb347',true);
   summons.push({x:p.x+p.face*8,y:p.y,life:240,face:p.face,upd(s){const e=nearestEnemy(s.x,s.y-8,300);if(e){s.face=e.x>s.x?1:-1;const dy=e.y-(s.y-8);s.x+=s.face*3.2;s.y+=Math.sign(dy)*Math.min(3,Math.abs(dy));if(Math.hypot(e.x-s.x,e.y-s.y+8)<12)s.life=1;}else s.x+=s.face*3;
     const X=s.x|0,Y=s.y-2|0;if(X>0&&X<W&&Y>0&&Y<H&&t[Y*W+X]===0&&R()<.4)setc(Y*W+X,FIRE);},
     end(s){explode(s.x|0,s.y-8|0,14,{fire:.6,self:true});},draw(s){echo('torch',s.x,s.y,s.face,[255,150,50]);}});}},
 // a burning dive: he becomes a missile and punches through buildings
 {n:'Blazing Dive',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;const dx=a.dx,dy=a.dy;let k=0;fxWord(p.x,p.y-ST.PH-8,'FWOOOSH!',1.1,'#ffb347',true);snd('fireburst',p.x,p.y);
   ACT.push(()=>{k++;p.vx=dx*8;p.vy=dy*8;p.script=2;const X=p.x+dx*6,Y=p.y-ST.PH/2+dy*6;carve(X,Y,7,dx*5,dy*5);for(let j=0;j<3;j++){const ix=X+(R()-.5)*14|0,iy=Y+(R()-.5)*14|0;if(ix>=0&&ix<W&&iy>=0&&iy<H&&t[iy*W+ix]===0)setc(iy*W+ix,FIRE);}
     damageEnemies(p.x,p.y-ST.PH/2,14,9,dx*6,dy*6-2);if(k>=20){explode(p.x|0,p.y-ST.PH/2|0,12,{self:true,fire:.5});p.vx*=.3;p.vy*=.3;return false;}return true;});}},
 // a spinning column of fire that follows the cursor and lifts wreckage
 {n:'Fire Tornado',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;let x=mouse.wx;const gy=groundBelow(x|0,mouse.wy);let k=0;fxWord(x,gy-60,'FIRESTORM!',1.2,'#ffb347',true);
   ACT.push(()=>{k++;x+=(mouse.wx-x)*.02;for(let j=0;j<6;j++){const h=R()*90,an=k*.5+h*.15,X=x+Math.cos(an)*(4+h*.18),Y=gy-h;spawn(X,Y,-Math.sin(an)*2,-1.5-R(),rgb(255,100+R()*130|0,30),14,0,1,0,1);}
     if(k%3===0)carve(x+(R()-.5)*16,gy-R()*80,5,(R()-.5)*3,-3);if(k%5===0){const X=x+(R()-.5)*20|0,Y=gy-R()*60|0;if(X>=0&&X<W&&Y>=0&&Y<H&&t[Y*W+X]===0)setc(Y*W+X,FIRE);}
     damageEnemies(x,gy-45,22,1.2,(R()-.5)*2,-2);for(const b of bodies)if(!b.held&&Math.abs(b.x-x)<30&&b.y>gy-100){b.vy-=.6;b.va+=.01;b.rest=0;}ST.shake=Math.max(ST.shake,2);return k<120;});}},
 // a bird of living flame circles the cursor, then dives into it
 {n:'Firebird',fn:(a,p,use)=>{if(!use(30))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy;let k=0,x=a.h.x,y=a.h.y;fxWord(cx,cy-40,'FIREBIRD!',1.2,'#ffb347',true);snd('fireburst',x,y);
   ACT.push(()=>{k++;let tx,ty;if(k<80){const an=k*.12;tx=cx+Math.cos(an)*50;ty=cy-30+Math.sin(an)*22;}else{tx=cx;ty=cy;}x+=(tx-x)*(k<80?.18:.35);y+=(ty-y)*(k<80?.18:.35);
     const f=Math.sin(k*.6);for(const s of [-1,1])for(let j=1;j<6;j++)spawn(x+s*j*2,y-f*j*.8+j*.4,(R()-.5)*.3,-.2,j<3?rgb(255,240,180):rgb(255,120,30),6,0,1,0,1);spawn(x,y,(R()-.5),(R()-.5),rgb(255,200,80),20,R()<.05?FIRE:0,1,1);
     tagged('fire',()=>damageEnemies(x,y,8,1.5,0,0));
     if(k>=80&&Math.hypot(x-cx,y-cy)<4){explode(cx|0,cy|0,16,{fire:.6,word:'SKRAAAW!'});shockFx(cx,cy,1);return false;}return k<120;});}},
 // a comet of his own fire, dropped from the sky onto the cursor
 {n:'Comet Strike',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;const tx=mouse.wx,ty=mouse.wy,sx=tx-120,sy=ST.camY-10,d=Math.hypot(tx-sx,ty-sy)||1;fxWord(tx,ty-40,'INCOMING!',1.2,'#ffb347',true);
   shots.push({x:sx,y:sy,vx:(tx-sx)/d*7,vy:(ty-sy)/d*7,type:'fire',life:300,boom:20,fire:.6,col:[255,200,80],ecol:[255,120,30],onHit:s=>{explode(s.x|0,s.y|0,20,{fire:.6,word:'KRA-THOOM!'});shockFx(s.x,s.y,1.3);ST.hitstop=Math.max(ST.hitstop,4);}});}},
 // hold: white-hot heat turns walls into running lava
 {n:'Melt Down',fn:(a,p,use)=>{if(!use(.9))return;const cx=mouse.wx|0,cy=mouse.wy|0;for(let j=0;j<26;j++){const an=R()*6.283,d=R()*14,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];
     if(KIND[m]===S&&m!==OBSID&&R()<.25/(1+HARD[m]*.15))setc(i,FLAM[m]>0?FIRE:LAVA);else if(m===WATER||m===ICE||m===SNOW)setc(i,STEAM);}
   beams.push({x0:a.h.x,y0:a.h.y,x1:cx,y1:cy,life:1,w:1,c:[255,220,140],g:[255,100,20]});flash(cx,cy,16,[255,120,30],2);damageEnemies(cx,cy,16,1.5,0,0);sndLoop('melt','beam',cx,cy,{pitch:.6,v:.5});}},
 {n:'Flame Ring',fn:(a,p,use)=>{if(!use(26))return;ST.cd=45;const cx=p.x,cy=p.y-ST.PH/2;for(let j=0;j<14;j++){const an=j/14*6.283;shots.push({x:cx+Math.cos(an)*6,y:cy+Math.sin(an)*6,vx:Math.cos(an)*6,vy:Math.sin(an)*6,type:'fire',life:70,boom:7,fire:.5,col:FC,ecol:[255,140,40]});}fxWord(cx,cy-30,'RING OF FIRE!',1.1,'#ffb347',true);snd('fireburst',cx,cy);}},
 // hold: write in fire in the sky; the letters burn whatever flies through them
 {n:'Sky Writing',kind:'hold',fn:(a,p,use)=>{if(!use(.5))return;const x=mouse.wx,y=mouse.wy,lx=p.skyX??x,ly=p.skyY??y;p.skyX=x;p.skyY=y;if(ST.frame-(p.skyF||0)>3){p.skyX=x;p.skyY=y;}p.skyF=ST.frame;
   const d=Math.hypot(x-lx,y-ly),n=Math.max(1,d|0);for(let k=0;k<=n;k++){const X=lx+(x-lx)*k/n|0,Y=ly+(y-ly)*k/n|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i]===0)setc(i,R()<.7?FIRE:GFIRE);}
   spawn(x,y,(R()-.5),(R()-.5)-.5,rgb(255,200,80),14,0,1,0,1);tagged('fire',()=>damageEnemies(x,y,6,1.2,0,0));}},
 // hot air: a column that lifts him, the wreckage and the enemies in it
 {n:'Thermal Updraft',fn:(a,p,use)=>{if(!use(20))return;ST.cd=45;const cx=p.x;let k=0;fxWord(p.x,p.y-ST.PH-8,'WHOOOSH!',.9,'#ffb347',true);
   ACT.push(()=>{k++;pl_.vy=Math.min(pl_.vy,-2.5);for(let j=0;j<6;j++)spawn(cx+(R()-.5)*30,pl_.y+20-R()*120,(R()-.5)*.4,-2-R()*2,R()<.5?rgb(255,200,120):rgb(255,120,40),18,0,1,0,1);
     for(const b of bodies)if(Math.abs(b.x-cx)<24&&b.y<pl_.y+80){b.vy-=.6;b.rest=0;}for(const e of enemies)if(!e.def.titan&&Math.abs(e.x-cx)<24&&e.y<pl_.y+80){e.vy-=.6;if(k%10===0)tagged('fire',()=>hitEnemy(e,4,0,0));}return k<60;});}},
 // he drinks in every flame around him: fires go out, burning enemies are scorched, his energy comes back
  {n:'Flame Absorb',fn:(a,p,use)=>{const cx=p.x,cy=p.y-ST.PH/2,r=70;let n=0;
    for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(m===FIRE||m===EMBER||m===GFIRE||m===LAVA){setc(i,EMPTY);n++;if(R()<.2)spawn(X,Y,(cx-X)*.08,(cy-Y)*.08,rgb(255,160,40),12,0,1,0,1);}}
    for(const e of enemies){const s=e.st;if(s&&s.burn>0&&Math.hypot(e.x-cx,e.y-cy)<r){s.burn=0;hitEnemy(e,12,0,0);n+=20;beams.push({pts:[[e.x,e.y],[(e.x+cx)/2,(e.y+cy)/2-8],[cx,cy]],life:6,c:[255,220,120],g:[255,100,20]});}}
    if(!n){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO ABSORB',.7,'#ff9a3c',true);return;}ST.cd=30;p.en=Math.min(100,p.en+Math.min(60,n*.15));p.hp=Math.min(ST.CH.hp,p.hp+Math.min(40,n*.05));
    rings.push({x:cx,y:cy,r,vr:-4,life:16,c:[255,150,40]});fxWord(cx,cy-24,'*FWOOMP*',1,'#ff9a3c',true);}},
 // a wall of flame at the cursor: it eats enemy fire and burns whoever walks through it
  {n:'Flame Wall',fn:(a,p,use)=>{if(!use(20))return;ST.cd=50;const x=mouse.wx,gy=groundBelow(mouse.wx|0,mouse.wy),h=56;let k=0;fxWord(x,gy-h-6,'WALL OF FLAME',.9,'#ff9a3c',true);
    ACT.push(()=>{k++;const hh=Math.min(h,k*4);for(let j=0;j<6;j++)spawn(x+(R()-.5)*8,gy-R()*hh,(R()-.5)*.4,-1-R(),R()<.5?rgb(255,200,60):rgb(255,90,20),14,0,1,0,1);
      for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.abs(s.x-x)<6&&s.y>gy-hh&&s.y<gy){shots.splice(n,1);flash(s.x,s.y,6,[255,140,40],2);}}
      if(k%6===0)tagged('fire',()=>{for(const e of enemies)if(Math.abs(e.x-x)<e.def.w/2+5&&e.y>gy-hh-e.def.h/2&&e.y<gy+4){hitEnemy(e,6,Math.sign(e.x-x)*3,-1);applyStatus(e,'burn',120);}});return k<300;});}},
 // he goes nova: a charge-up, then a wave of fire that rolls out over the block
 {n:'Supernova',ult:true,fn:(a,p,use)=>{if(!use(60))return;ST.cd=160;const cx=p.x,cy=p.y-ST.PH/2;let k=0;fxWord(cx,cy-40,'FLAME ON!',1.6,'#ffb347',true);snd('charge',cx,cy,{pitch:.7});
   ACT.push(()=>{k++;if(k<24){for(let j=0;j<6;j++){const an=R()*6.283;spawn(cx+Math.cos(an)*40,cy+Math.sin(an)*40,-Math.cos(an)*2,-Math.sin(an)*2,rgb(255,200,80),18,0,1,0,1);}flash(cx,cy,k*2,[255,150,40],2);return true;}
     const r=(k-23)*8;for(let j=0;j<7;j++){const an=R()*6.283;explode(cx+Math.cos(an)*r|0,cy+Math.sin(an)*r|0,10,{self:true,quiet:true,fire:.5});}
     if(k===24){explode(cx|0,cy|0,22,{self:true,fire:.6,word:'SUPERNOVA!'});shockFx(cx,cy,1.8);ST.hitstop=Math.max(ST.hitstop,6);}damageEnemies(cx,cy,r+12,8,0,0,true);ST.shake=Math.max(ST.shake,12);return k<38;});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_TORCH={id:'torch',name:'Human Torch',pw:7,ph:19,fly:true,fs:3.4,boost:2.4,run:1.9,jump:4.6,hp:300,armor:.8,glow:FC,cape:null,thrust:()=>R()<.6?rgb(255,150+R()*90|0,40):rgb(255,240,180),powers:TORCH_POWERS};
