// Venom (Carrion blob form, tendrils, biomass): sprite, palette, rig entry, powers and roster entry.
import './thing.js'; // evaluation order: runs after heroes/thing.js
import { ST } from '../state.js';
import { EMPTY, F, G, GLASS, KIND, LEAF, OBSID, R, RUBBLE, S, STEEL, WEB, WOOD, rgb } from '../world/materials.js';
import { H, W, bg, bgB, bgD, col, setc, t } from '../world/grid.js';
import { bodies, gnd } from '../world/support.js';
import { solidAt, spawn } from '../world/particles.js';
import { beams, fxWord } from '../render/fx.js';
import { explode, punchOut, ringChunks } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { pickC, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { ray } from './wave2.js';
import { SKY, boxHit, carve, keys, mouse } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { pix } from '../render/canvas.js';
import { groundBelow } from '../ui/spawn.js';
import { summons } from './abilities.js';
import { drawPix } from './kitlib.js';
import { sliceLine } from '../world/slice.js';

// ---- Venom: hulking black symbiote, white eyes and spider, a mouthful of fangs

// ================= Venom: the symbiote hunts like the creature from Carrion =================
// tendrils: wavering black ropes from the body to a point
// Venom's size: blob form is small enough to squeeze through gaps; each devoured victim adds bulk
export function venomSize(p){p.sizeT=p.wav>0?1.45:(p.blob?.7:1)+(p.bm||0)*.11;}
// The Carrion form: a writhing mass that clings to any surface within its tendrils' reach and crawls in every
// direction (walls, ceilings), crushing weak material it squeezes through; loose in the air, it falls
export function blobMove(p,ax,ay){
  const sz=p.size||1,cx=p.x,cy=p.y-ST.PH/2,reach=16+12*sz;
  if(ST.frame%6===0||!p.blobA){p.blobA=[];for(let k=0;k<14;k++){const an=k/14*6.283+R()*.3,r=ray(cx,cy,Math.cos(an),Math.sin(an),reach*1.5);if(r.hit)p.blobA.push([r.x,r.y]);}}
  // it only holds on when the mass is actually touching something (no hovering in mid-air)
  let grip=0;const gr=6+6*sz;for(let k=0;k<12&&!grip;k++){const an=k/12*6.283;for(const d of [gr,gr+4])if(solidAt(cx+Math.cos(an)*d,cy+Math.sin(an)*d)){grip=1;break;}}
  let dx=ax,dy=ay;const mag=Math.hypot(dx,dy);if(mag>0){dx/=mag;dy/=mag;}
  const spd=2.7*(.85+.15*sz)*(keys.ShiftLeft||keys.ShiftRight?1.7:1);
  if(grip>0){p.vx+=(dx*spd-p.vx)*.22;p.vy+=(dy*spd-p.vy)*.22;if(!mag){p.vx*=.75;p.vy*=.75;}}
  else{p.vx+=dx*.08;p.vy=Math.min(6,p.vy+.32);}
  if(ax)p.face=ax;p.ang=0;p.airF=0;
  // tendrils: anchored ones to the surfaces it grips, plus a couple feeling the air
  const sh=p.blobA.slice(0,7);for(const [x,y] of sh)tendril(cx,cy,x+(R()-.5)*2,y+(R()-.5)*2,1,3);
  for(let k=0;k<2;k++){const an=ST.frame*.05+k*3.1,l=10+6*Math.sin(ST.frame*.1+k);tendril(cx,cy,cx+Math.cos(an)*l*sz,cy+Math.sin(an)*l*sz,1,4);}
  // it squeezes through and smashes weak stuff; once it has fed it tears through walls too
  const sp=Math.hypot(p.vx,p.vy);
  if(sp>1.4&&ST.frame%2===0){const r=4+3*sz|0,fx=cx+p.vx/sp*(r+3),fy=cy+p.vy/sp*(r+3);
    for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=fx+x|0,Y=fy+y|0;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]!==S)continue;
      if(m===GLASS||m===LEAF||m===WOOD||m===WEB||((p.bm||0)>=2&&m!==STEEL&&m!==OBSID&&!gnd[i]&&R()<.3)){if(R()<.3)spawn(X,Y,p.vx*.4+(R()-.5),p.vy*.4-R(),col[i],50,m===GLASS?0:RUBBLE,m===GLASS?1:0);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}setc(i,EMPTY);}}}
  // anything in reach gets snatched at by a tendril
  if(ST.frame%10===0){const e=nearestEnemy(cx,cy,40+20*sz);if(e){tendril(cx,cy,e.x,e.y,4,6);hitEnemy(e,5+3*(p.bm||0),(cx-e.x)*.05,(cy-e.y)*.05);}}
}
// the Carrion form, drawn: a dark heaving mass with a pair of white eyes and a fanged mouth
export function drawBlob(p){const sz=p.size||1,cx=p.x,cy=p.y-ST.PH/2,R0=5+5*sz,dk=rgb(18,18,28),md=rgb(40,40,60),hl=rgb(90,92,126),ink=rgb(6,6,10);
  for(let y=-R0-3;y<=R0+3;y++)for(let x=-R0-3;x<=R0+3;x++){const a=Math.atan2(y,x),rr=R0*(.84+.1*Math.sin(a*5+ST.frame*.21)+.07*Math.sin(a*9-ST.frame*.33)),d=Math.hypot(x,y);if(d>rr+1)continue;
    pix(cx+x,cy+y,d>rr?ink:(x+y<-R0*.7&&d>rr-3?hl:(d>rr-2?md:dk)));}
  const f=p.face||1,ex=cx+f*R0*.3,ey=cy-R0*.3;
  for(const o of [-1,1])for(let k=0;k<3;k++)pix(ex+o*2+f*k*.6,ey-k*.4*o*f,rgb(244,244,255),rgb(110,110,160));
  for(let k=-3;k<=3;k++){pix(ex+f*k,ey+3,rgb(196,40,70));if(k%2===0)pix(ex+f*k,ey+2,rgb(232,230,220));}
}
function tendril(x0,y0,x1,y1,life=2,wig=6){const n=Math.max(3,Math.hypot(x1-x0,y1-y0)/10|0),pts=[],nx=-(y1-y0),ny=x1-x0,L=Math.hypot(nx,ny)||1;
  for(let k=0;k<=n;k++){const f=k/n,w=Math.sin(f*Math.PI)*Math.sin(f*7+ST.frame*.4)*wig;pts.push([x0+(x1-x0)*f+nx/L*w,y0+(y1-y0)*f+ny/L*w]);}
  beams.push({pts,life,c:[44,44,64],g:[70,70,120]});}
const VC=[150,150,200];
function drawSnare(s){const c=rgb(30,30,44),g=rgb(70,60,110);for(let j=0;j<7;j++){const an=s.t*.05+j*.9,r=10+Math.sin(s.t*.1+j)*4;for(let m=0;m<=8;m++){const u=m/8;pix(s.x+Math.cos(an)*r*u,s.y-Math.abs(Math.sin(an))*r*u*.7,c,g);}}}
const VENOM_POWERS=[
 // switch between the hulking Venom and the Carrion form: a crawling mass that clings to walls and ceilings
 {n:'Symbiote Form',fn:(a,p,use)=>{if(!use(4))return;ST.cd=20;p.blob=!p.blob;p.blobA=null;venomSize(p);if(p.blob){p.vy=0;}
   fxWord(p.x,p.y-ST.PH-8,p.blob?'*SHLLLRRK*':'WE ARE VENOM',1,'#c8c8ff',true);snd(p.blob?'rip':'roar',p.x,p.y,{pitch:p.blob?.7:1.2});
   for(let k=0;k<24;k++){const an=R()*6.283;spawn(p.x,p.y-ST.PH/2,Math.cos(an)*2.5,Math.sin(an)*2.5,rgb(30,30,46),24,0,0,1);}}},
 // a tendril whipped out at the cursor: tears a line through the block and cracks the end open
 {n:'Tendril Lash',fn:(a,p,use)=>{if(!use(6))return;ST.cd=14;const L=Math.min(140,Math.max(30,a.d)),x=a.h.x+a.dx*L,y=a.h.y+a.dy*L;tendril(a.h.x,a.h.y,x,y,6);
   for(let k=14;k<L;k+=7)carve(a.h.x+a.dx*k,a.h.y+a.dy*k,3,a.dx*4,a.dy*4);explode(x|0,y|0,8+(p.bm||0),{self:true,col:VC,word:'THWAK!'});damageLine(a.h.x,a.h.y,x,y,5,14);snd('slash',x,y);}},
 // hold: tendrils seize a chunk of building or an enemy, swing it around, let go to fling it
 {n:'Tendril Grab',tk:{r:12,range:170,tether:true,throwMul:1.7}},
 // drag a victim in and consume it: health back and a level of biomass (bigger, stronger, tears through walls)
 {n:'Devour',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,90)||nearestEnemy(p.x,p.y,170);if(!e||e.def.title){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO EAT',.8,'#c8c8ff',true);return;}if(!use(16))return;ST.cd=36;let k=0;
   fxWord(e.x,e.y-14,'GET OVER HERE',.9,'#c8c8ff',true);snd('rip',e.x,e.y);
   ACT.push(()=>{k++;if(e.hp<=0||!enemies.includes(e))return false;const hx=p.x,hy=p.y-ST.PH*.6;tendril(hx,hy,e.x,e.y,1,4);tendril(hx,hy,e.x+(R()-.5)*6,e.y+(R()-.5)*6,1,7);e.vx=(hx-e.x)*.25;e.vy=(hy-e.y)*.25;e.frozen=2;
     if(Math.hypot(hx-e.x,hy-e.y)<14||k>30){hitEnemy(e,9999,0,0);p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.15);p.bm=Math.min(4,(p.bm||0)+1);p.biomassT=1200;venomSize(p);
       for(let j=0;j<24;j++)spawn(hx+(R()-.5)*10,hy+(R()-.5)*10,(R()-.5)*3,(R()-.5)*3,R()<.4?rgb(196,40,70):rgb(40,40,60),24,0,0,1);fxWord(hx,hy-18,'*CRUNCH* BIOMASS '+p.bm,1.1,'#ff6b8a',true);snd('punch',hx,hy);return false;}return true;});}},
 // the whole mass rams toward the cursor, bursting through walls (bigger = further, harder)
 {n:'Biomass Charge',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;const dx=a.dx,dy=a.dy;let k=0;p.ground=false;fxWord(p.x,p.y-ST.PH-8,'SKRAAAH!',1.1,'#c8c8ff',true);snd('roar',p.x,p.y,{pitch:1.3});const bm=p.bm||0;
   ACT.push(()=>{k++;p.vx=dx*7.5;p.vy=dy*7.5;p.script=2;carve(p.x+dx*6,p.y-ST.PH/2+dy*6,8+bm*1.5,dx*5,dy*5);damageEnemies(p.x,p.y-ST.PH/2,16,10+bm*3,dx*7,dy*7-2);
     if(k%2===0)tendril(p.x,p.y-ST.PH/2,p.x+dx*20+(R()-.5)*20,p.y-ST.PH/2+dy*20+(R()-.5)*20,2);if(k>=18+bm*3){explode(p.x|0,p.y-ST.PH/2|0,11+bm*2,{self:true,col:VC});p.vx*=.3;p.vy*=.3;return false;}return true;});}},
 // a bone spike fired on a tendril: pierces everything in a line, then rips back dragging wreckage and enemies to him
 {n:'Spike Harpoon',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;let x=a.h.x,y=a.h.y;for(let s2=0;s2<300;s2++){x+=a.dx;y+=a.dy;const X=x|0,Y=y|0;if(X<1||X>=W-1||Y>=H-44||Y<-SKY)break;if(Y<0)continue;const i=Y*W+X,m=t[i];if(m&&KIND[m]!==G&&KIND[m]!==F){if(R()<.3)spawn(X,Y,a.dx*3,a.dy*3-1,col[i],40,KIND[m]===S?RUBBLE:m,0);setc(i,EMPTY);}}
   damageLine(a.h.x,a.h.y,x,y,4,40);tendril(a.h.x,a.h.y,x,y,8,3);fxWord(a.h.x+a.dx*30,a.h.y-10,'SHUNK!',1,'#c8c8ff',true);snd('snikt',a.h.x,a.h.y);
   for(const b of bodies)if(!b.held&&Math.hypot(b.x-x,b.y-y)<b.rmax+50){b.vx+=(p.x-b.x)*.04;b.vy+=(p.y-b.y)*.04-2;b.thrown=true;b.safeP=ST.frame+40;}
   for(const e of enemies){const u=((e.x-a.h.x)*a.dx+(e.y-a.h.y)*a.dy);if(u>0&&u<300&&Math.abs((e.x-a.h.x)*a.dy-(e.y-a.h.y)*a.dx)<8){e.vx+=-a.dx*6;e.vy+=-a.dy*6-2;}}}},
 // the roar: stuns everything around and shakes chunks off the buildings
 {n:'Roar',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const cx=p.x,cy=p.y-ST.PH*.7;fxWord(cx,cy-30,'SKREEEEEE!',1.4,'#ff6b8a',true);snd('screech',cx,cy,{pitch:.6});shockFx(cx,cy,1.3);
   for(let j=0;j<10;j++){const an=j/10*6.283,d=34+R()*20;explode(cx+Math.cos(an)*d|0,cy+Math.sin(an)*d|0,6,{self:true,quiet:true,col:VC});}ringChunks(cx,cy,22,false);
   for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<160){e.frozen=Math.max(e.frozen||0,80);hitEnemy(e,10,(e.x-cx)/(d||1)*5,-3);}}
   for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<150){b.vx+=dx/d*5;b.vy+=dy/d*5-2;b.thrown=true;}}}},
 // spit webs of biomass: they cocoon what they hit, then burst
 {n:'Web Cocoon',fn:(a,p,use)=>{if(!use(10))return;ST.cd=18;for(let j=-1;j<=1;j++){const an=Math.atan2(a.dy,a.dx)+j*.12;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(an)*5.5,vy:Math.sin(an)*5.5-.6,grav:.08,type:'goo',life:120,col:[60,60,90],ecol:VC,boom:6,
   onHit:s2=>{explode(s2.x|0,s2.y|0,7,{self:true,col:VC});for(const e of enemies)if(Math.hypot(e.x-s2.x,e.y-s2.y)<26)e.webbed=Math.max(e.webbed||0,150);for(let k=0;k<10;k++)spawn(s2.x,s2.y,(R()-.5)*3,-R()*2,rgb(40,40,60),40,0,0,1);}});}snd('splash',a.h.x,a.h.y,{v:.5});}},
 // thrash: tendrils lashing in every direction, gouging out a sphere around him
 {n:'Thrash',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;let k=0;fxWord(p.x,p.y-ST.PH-8,'THRASH!',1.1,'#c8c8ff',true);
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2,R2=(30+(p.bm||0)*5)*(p.size||1);for(let j=0;j<3;j++){const an=R()*6.283,x=cx+Math.cos(an)*R2,y=cy+Math.sin(an)*R2;tendril(cx,cy,x,y,2,7);carve(x,y,5,Math.cos(an)*4,Math.sin(an)*4);}
     damageEnemies(cx,cy,R2+8,3,0,0,true);if(k%5===0){ST.shake=Math.max(ST.shake,4);snd('whoosh',cx,cy,{v:.4});}return k<36;});}},
 // parasite: a tendril burrows into an enemy and takes it over; it turns on its friends
 {n:'Parasite',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,60)||nearestEnemy(p.x,p.y,150);if(!e||e.def.title||e.ally>0){fxWord(p.x,p.y-ST.PH-6,'NO HOST',.8,'#c8c8ff',true);return;}if(!use(28))return;ST.cd=50;
   e.ally=600;e.frozen=0;tendril(p.x,p.y-ST.PH/2,e.x,e.y,14,6);fxWord(e.x,e.y-e.def.h/2-8,'INFESTED',1.1,'#c8c8ff',true);snd('psi',e.x,e.y,{pitch:.5});
   for(let k=0;k<14;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*1.5,-R(),rgb(30,30,46),26,0,0,1);}},
 // squeeze into the ground and tunnel toward the cursor, then erupt in a burst of street
 {n:'Burrow',fn:(a,p,use)=>{if(!use(26))return;ST.cd=55;const tx=mouse.wx;let k=0,x=p.x,y=p.y+10;fxWord(p.x,p.y-ST.PH-6,'*SHLRRK*',1,'#c8c8ff',true);snd('crumble',p.x,p.y);
   ACT.push(()=>{k++;const dir=Math.sign(tx-x)||1;x+=dir*4;const gy=groundBelow(x|0,y-20);y=gy+8;carve(x,y,6,dir*2,0);p.x=x;p.y=gy+30;p.vx=p.vy=0;p.script=3;p.stealth=Math.max(p.stealth||0,2);
     if(k%3===0)spawn(x,gy-1,(R()-.5)*2,-1-R()*2,rgb(120,110,100),30,0,0,1);damageEnemies(x,gy,14,1.5,0,-2);
     if(Math.abs(tx-x)<6||k>70){p.y=gy;p.vy=-6;explode(x|0,gy|0,14,{self:true,col:VC,word:'ERUPT!'});ringChunks(x,gy+4,20,true);damageEnemies(x,gy,40,40,0,-6);p.stealth=0;if(boxHit(p.x,p.y))punchOut(p);return false;}return true;});}},
 // three little symbiotes split off and hunt
 {n:'Symbiote Spawn',fn:(a,p,use)=>{if(!use(24))return;ST.cd=50;fxWord(p.x,p.y-ST.PH-8,'GO, CHILDREN!',.9,'#e6e6f2',true);for(let i=0;i<3;i++)summons.push({x:p.x+(i-1)*6,y:p.y,vy:0,life:480,cd:0,face:1,
   upd(s){const e=nearestEnemy(s.x,s.y,300);s.vy+=.35*(ST.gk||1);const g=groundBelow(s.x|0,s.y-6);if(s.y+s.vy>=g){s.y=g;s.vy=0;if(e&&Math.abs(e.x-s.x)<40&&--s.cd<=0){s.cd=30;s.vy=-5;}}else s.y+=s.vy;
     if(e){s.face=e.x>s.x?1:-1;s.x+=s.face*1.6;if(Math.hypot(e.x-s.x,e.y-s.y)<e.def.w/2+5&&ST.frame%10===0){hitEnemy(e,9,0,0);spawn(e.x,e.y,(R()-.5)*2,-1,rgb(30,30,40),14,0,0,1);}}},
   draw(s){const w=(ST.frame>>2)&1;for(let y=0;y<4;y++)for(let x=-3;x<=3;x++)if(Math.abs(x)<=3-(y===0?1:0))drawPix(s.x+x,s.y-y-1,y===3?rgb(40,38,52):rgb(18,16,24));drawPix(s.x+s.face,s.y-3,rgb(240,240,250));drawPix(s.x+s.face*2,s.y-3,rgb(240,240,250));if(w)drawPix(s.x-s.face*4,s.y-1,rgb(18,16,24));}});}},
 // Carnage takes over for a while: red tendril-axes lash out at anything near
 {n:'Carnage Mode',fn:(a,p,use)=>{if(p.carnage>0||!use(34))return;ST.cd=60;p.carnage=480;fxWord(p.x,p.y-ST.PH-10,'CARNAGE RULES!',1.2,'#ff3b3b',true);snd('roar',p.x,p.y,{pitch:1.2});
   ACT.push(()=>{if(--p.carnage<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;if(ST.frame%3===0)spawn(cx+(R()-.5)*10,cy+(R()-.5)*14,(R()-.5),-1,rgb(200+R()*55|0,20,30),14,0,1,0,1);
     if(ST.frame%12===0){const e=nearestEnemy(cx,cy,70);const an=e?Math.atan2(e.y-cy,e.x-cx):R()*6.283,L=e?Math.min(70,Math.hypot(e.x-cx,e.y-cy)+8):40;sliceLine(cx,cy,cx+Math.cos(an)*L,cy+Math.sin(an)*L,{edge:[220,30,40],quiet:true,push:1.2});
       if(e)hitEnemy(e,14,Math.cos(an)*3,Math.sin(an)*3);beams.push({pts:[[cx,cy],[cx+Math.cos(an+.3)*L*.5,cy+Math.sin(an+.3)*L*.5],[cx+Math.cos(an)*L,cy+Math.sin(an)*L]],life:4,c:[255,80,80],g:[200,20,30]});}return true;});}},
 {n:'Symbiote Snare',fn:(a,p,use)=>{if(!use(16))return;ST.cd=36;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7-1,grav:.15,type:'goo',life:80,col:[40,40,60],boom:0,onHit:s=>{const x=s.x,y=s.y;fxWord(x,y-14,'GOTCHA.',.9,'#c8c8ff',true);
    summons.push({x,y,life:360,upd(o){for(const e of enemies){if(e.def.titan)continue;const dx=o.x-e.x,dy=o.y-e.y,d=Math.hypot(dx,dy)||1;if(d<34){e.vx+=dx/d*.4;e.vy+=dy/d*.3;e.webbed=Math.max(e.webbed||0,10);if(o.t%20===0)hitEnemy(e,4,0,0);}}
      if(o.t%3===0){const an=R()*6.283;spawn(o.x+Math.cos(an)*16,o.y+Math.sin(an)*6,-Math.cos(an)*.4,-Math.sin(an)*.2,rgb(30,30,44),14,0,0,0,1);}},draw:drawSnare});}});}},
 // WE ARE VENOM: the symbiote swells to full size and tendrils tear at everything around it
 {n:'We Are Venom',ult:true,fn:(a,p,use)=>{if(p.wav>0||!use(50))return;ST.cd=150;p.wav=420;venomSize(p);fxWord(p.x,p.y-ST.PH-16,'WE ARE VENOM!',1.6,'#ff6b8a',true);snd('roar',p.x,p.y,{pitch:.55});ST.shake=22;
   ACT.push(()=>{if(--p.wav<=0){venomSize(p);return false;}const cx=p.x,cy=p.y-ST.PH/2;
     if(p.wav%5===0){const e=nearestEnemy(cx,cy,150);let tx,ty;if(e&&R()<.6){tx=e.x;ty=e.y;hitEnemy(e,14,(e.x-cx)*.03,-2);}else{const an=R()*6.283,d=50+R()*80;tx=cx+Math.cos(an)*d;ty=cy+Math.sin(an)*d;}
       tendril(cx,cy,tx,ty,5,8);explode(tx|0,ty|0,8,{self:true,quiet:true,col:VC});}
     if(p.wav%3===0)spawn(cx+(R()-.5)*16,cy+(R()-.5)*20,(R()-.5),-R(),rgb(30,30,46),20,0,0,1);return true;});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_VENOM={id:'venom',name:'Venom',pw:9,ph:23,fly:false,fs:2.4,boost:1,run:2.3,jump:5.6,hp:520,armor:.5,glow:VC,cape:null,thrust:()=>pickC([60,60,90]),tetherC:[44,44,64],tetherG:[80,80,130],powers:VENOM_POWERS};
