// Kit overhaul, part A (2026-10-21): powers that copied another hero's are reworked into something only
// that hero does, and every hero gets two new powers. applyKits() in kits2b.js swaps them into the roster.
// Heroes here: Doom, Hulk, Thor, Iron Man, Wolverine, Cyclops, Iceman, Jean Grey, Spider-Man, Scarlet
// Witch, Doctor Strange, Ant-Man, Juggernaut, Ultron, Magneto.
import { ST } from '../state.js';
import { EMPTY, ICE, KIND, R, S, STEEL, WEB, rgb } from '../world/materials.js';
import { H, W, bg, col, markDirty, setc, t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { finishBody, makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, kerf, sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { beamCore, lightningStrike, scriptMove, shockFx, shots, surfaceY, zap } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { TK } from '../render/titan.js';
import { drawHammer, drawSprite } from '../render/sprites.js';

export const tagged=(tag,f)=>{const o=ST.dmgTag;ST.dmgTag=tag;try{f();}finally{ST.dmgTag=o;}};
export const nearestN=(x,y,r,n,skip)=>(r*=ST.aoeC||1,enemies).filter(e=>e.hp>0&&!e.host&&e!==skip&&Math.hypot(e.x-x,e.y-y)<r).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,n);
const G=[120,255,160];
export const REWORK={},EXTRA={};

// ================= DOOM =================
REWORK.doom={'Doom Lightning':
 {n:'Octessence Sigil',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const cx=mouse.wx,cy=groundBelow(mouse.wx|0,mouse.wy),r=50*ST.aoeC;let k=0;fxWord(cx,cy-30,'BY THE OCTESSENCE!',1.1,'#8dffb0',true);snd('psi',cx,cy,{pitch:.5});
   ACT.push(()=>{k++;if(k<50){for(let j=0;j<3;j++){const an=R()*6.283;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r*.3,0,-.3,rgb(120,255,160),12,0,1,0,1);}if(k%8===0)rings.push({x:cx,y:cy,r,vr:0,life:6,c:G});return true;}
     if(k===50){explode(cx|0,cy|0,10,{self:true,green:true});shockFx(cx,cy,1);fxWord(cx,cy-20,'THE HANDS OF THE DAMNED',.9,'#8dffb0',true);}
     for(let j=0;j<5;j++){const hx=cx+(R()-.5)*r*2,hh=Math.min(70,(k-50)*4);for(let s=0;s<3;s++)spawn(hx,cy-R()*hh,(R()-.5),-1,R()<.5?rgb(60,255,110):rgb(20,140,60),10,0,1,0,1);}
     for(const e of enemies){if(Math.abs(e.x-cx)<r&&e.y>cy-100&&e.y<cy+20){if(!e.def.titan){e.vy=Math.max(e.vy,1.5);e.vx*=.6;}hitEnemy(e,1.6,0,0);}}return k<130;});}}};
EXTRA.doom=[
 // the world as it was: everything in a circle around the cursor is rebuilt from the untouched map
 {n:'Temporal Restoration',fn:(a,p,use)=>{if(!ST.T0||!use(30))return;ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,r=46*ST.aoeC|0;let k=0;fxWord(cx,cy-r-8,'TIME BENDS TO DOOM',1,'#8dffb0',true);snd('psi',cx,cy,{pitch:.4});
   ACT.push(()=>{k++;const rr=Math.min(r,k*3);for(let y=-rr;y<=rr;y++)for(let x=-rr;x<=rr;x++){const d2=x*x+y*y;if(d2>rr*rr||d2<(rr-3)*(rr-3))continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-4)continue;const i=Y*W+X,m0=ST.T0[i];
       if(m0&&t[i]!==m0&&KIND[m0]===S){setc(i,m0);col[i]=ST.C0[i];markDirty(i);if(R()<.08)spawn(X,Y,0,-.4,rgb(140,255,170),12,0,1,0,1);}else if(!m0&&KIND[t[i]]===S){setc(i,EMPTY);markDirty(i);}if(ST.B0)bg[i]=ST.B0[i];}
     if(k%4===0)rings.push({x:cx,y:cy,r:rr,vr:0,life:4,c:G});
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<rr){hitEnemy(e,.8,0,0);}return rr<r;});}},
 // hold: tethers drain the enemies near the cursor and feed Doom's armour
 {n:'Mystic Siphon',kind:'hold',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,70,4);if(!list.length)return;if(!use(.2))return;const h=a.h;
   for(const e of list){hitEnemy(e,1.1,0,0);p.en=Math.min(100,p.en+.35);if(ST.frame%2===0)beams.push({pts:[[e.x,e.y],[(e.x+h.x)/2+(R()-.5)*16,(e.y+h.y)/2+(R()-.5)*16],[h.x,h.y]],life:2,c:[200,255,210],g:[40,200,80]});if(R()<.4)spawn(e.x,e.y,(h.x-e.x)*.05,(h.y-e.y)*.05,rgb(120,255,160),20,0,1,0,0);}}},
];

// ================= HULK =================
EXTRA.hulk=[
 // grab the nearest enemy and swing it like a flail through the others, then hurl it
 {n:'Hulk Flail',fn:(a,p,use)=>{const e=nearestEnemy(p.x,p.y-ST.PH/2,46);if(!e||e.def.titan||e.def.title){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO GRAB',.7,'#bff07a',true);return;}if(!use(16))return;ST.cd=40;let k=0;fxWord(p.x,p.y-ST.PH-10,'PUNY THING!',1.1,'#bff07a',true);
   ACT.push(()=>{k++;if(e.hp<=0||!enemies.includes(e))return false;p.script=2;const an=k*.42,r=22,cx=p.x,cy=p.y-ST.PH/2;e.x=cx+Math.cos(an)*r;e.y=cy+Math.sin(an)*r*.7;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);
     for(const o of enemies)if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<o.def.w/2+e.def.w/2+3){hitEnemy(o,14,(o.x-cx)*.1,-2);hitEnemy(e,4,0,0);}carve(e.x,e.y,3,0,0);
     if(k>=36){const dx=mouse.wx-e.x,dy=mouse.wy-e.y,d=Math.hypot(dx,dy)||1;e.vx=dx/d*11;e.vy=dy/d*11;e.thrownT=60;hitEnemy(e,20,0,0);fxWord(e.x,e.y-10,'HULK THROW!',1,'#bff07a',true);return false;}return true;});}},
 // a punch into the ground opens a jagged fissure that runs ahead and splits the street into slabs
 {n:'Fault Fissure',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const dir=a.dx<0?-1:1;let x=p.x+dir*6,y=p.y+1,k=0;p.punchF=10;quake(p.x,p.y,{r:16,col:[130,255,90]});
   ACT.push(()=>{k++;const nx=x+dir*(6+R()*4),ny=surfaceY(nx|0,Math.max(0,y-20|0),50)+(R()*4|0);sliceLine(x,y,nx,ny+24,{edge:[150,255,110],w:1,push:1.4,quiet:k%3!==0});
     if(k%3===0)sliceLine(nx,ny-2,nx+dir*2,ny+30,{edge:[150,255,110],quiet:true});damageEnemies(nx,ny-6,12,9,dir,-5);if(R()<.5)spawn(nx,ny,(R()-.5)*2,-2-R()*3,rgb(150,140,125),30,0,0,1);ST.shake=Math.max(ST.shake,4);x=nx;y=ny;return k<36;});
   fxWord(p.x+dir*40,p.y-24,'KRRRAAAK!',1.3,'#bff07a',true);}},
];
import { quake } from './powers.js';

// ================= THOR =================
REWORK.thor={'Lightning Arc':
 {n:'Lightning Dome',fn:(a,p,use)=>{if(!use(28))return;ST.cd=60;let k=0;fxWord(p.x,p.y-30,'FOR ASGARD!',1.1,'#bfe3ff',true);snd('thunder',p.x,p.y,{v:.7});
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2,r=34*ST.aoeC;if(k%2===0){const an=R()*6.283,an2=an+(R()-.5)*1.4;zap(cx+Math.cos(an)*r,cy+Math.sin(an)*r,cx+Math.cos(an2)*r,cy+Math.sin(an2)*r,[230,240,255],[120,170,255]);}
     if(k%6===0)tagged('shock',()=>{for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<r+e.def.w/2)hitEnemy(e,7,(e.x-cx)/(d||1)*2,(e.y-cy)/(d||1)*2);}});
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r){shots.splice(n,1);flash(s.x,s.y,6,[150,190,255],2);}}return k<240;});}}};
EXTRA.thor=[
 // Mjolnir into the ground: the street itself carries the lightning for a few seconds
 {n:'Thunder Anvil',fn:(a,p,use)=>{if(!use(26))return;ST.cd=55;const cx=mouse.wx,gy=groundBelow(cx|0,mouse.wy),r=70*ST.aoeC;let k=0;lightningStrike(cx,gy,8);
   ACT.push(()=>{k++;for(let j=0;j<3;j++){const x=cx+(R()-.5)*r*2,y=surfaceY(x|0,Math.max(0,gy-30),60);zap(x,y-1,x+(R()-.5)*16,y-2-R()*6,[230,240,255],[120,170,255]);}
     if(k%10===0)tagged('shock',()=>{for(const e of enemies)if(Math.abs(e.x-cx)<r&&e.y>gy-30&&e.y<gy+10)hitEnemy(e,9,0,-2);});return k<300;});}},
 // the hammer circles him like a moon, smashing anything it meets
 {n:'Mjolnir Orbit',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const s={x:p.x,y:p.y,life:360,an:0,hit:new Map(),
     upd(s){s.an+=.18;const cx=pl_.x,cy=pl_.y-ST.PH/2,r=26;s.x=cx+Math.cos(s.an)*r;s.y=cy+Math.sin(s.an)*r*.8;carve(s.x,s.y,3.5,0,0);
       for(const e of enemies){if(Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-s.y)<e.def.h/2+4&&ST.frame-(s.hit.get(e)||-99)>20){s.hit.set(e,ST.frame);hitEnemy(e,18,Math.cos(s.an)*4,Math.sin(s.an)*4-1);flash(s.x,s.y,10,[150,190,255],3);snd('clang',s.x,s.y,{v:.5});}}
       for(const b of bodies)if(Math.hypot(b.x-s.x,b.y-s.y)<b.rmax+3){b.vx+=Math.cos(s.an)*.6;b.vy+=Math.sin(s.an)*.6;b.thrown=true;}spawn(s.x,s.y,0,0,rgb(150,190,255),6,0,1,0,1);},
     draw(s){drawHammer(s.x,s.y,s.an+Math.PI);}};summons.push(s);fxWord(p.x,p.y-ST.PH-8,'MJOLNIR, TO ME!',1,'#bfe3ff',true);}},
];

// ================= IRON MAN =================
function drawBuster(s){const x=s.x,y=s.y,f=s.face||1,RED=rgb(176,32,32),GLD=rgb(222,172,64),o={flash:s.fl>0};TK.begin();
  TK.cap(x-6,y-14,x-7,y,5,4,RED,o);TK.cap(x+6,y-14,x+7,y,5,4,RED,o);TK.ell(x,y-22,12,11,RED,o);TK.ell(x,y-22,5,4,GLD,{...o,glow:rgb(150,220,255)});
  const pa=s.punch>0?16:7;TK.cap(x+f*10,y-26,x+f*(10+pa),y-18,5,6,GLD,o);TK.cap(x-f*10,y-26,x-f*12,y-13,5,6,GLD,o);TK.ell(x,y-36,6,5,RED,o);TK.end();TK.glowDot(x+f*2,y-37,0,rgb(210,240,255));}
REWORK.iron={'Energy Shield':
 {n:'Hulkbuster',fn:(a,p,use)=>{if(summons.some(s=>s.buster)||!use(40))return;ST.cd=80;fxWord(mouse.wx,ST.camY+30,'VERONICA, DROP THE BUSTER',1,'#ff6b5c',true);snd('jet',mouse.wx,mouse.wy);
   summons.push({buster:true,x:mouse.wx,y:ST.camY-50,vy:4,life:900,landed:false,punch:0,face:1,cd:0,
     upd(s){if(!s.landed){s.vy+=.4;s.y+=s.vy;for(let k=0;k<3;k++)spawn(s.x+(R()-.5)*8,s.y,(R()-.5),2+R(),R()<.5?rgb(255,220,150):rgb(255,140,60),10,0,1,0,1);const g=groundBelow(s.x|0,Math.max(0,s.y-10));if(s.y>0&&s.y>=g){s.y=g;s.landed=true;explode(s.x|0,g,12,{self:true,col:[255,170,80]});shockFx(s.x,g,1);fxWord(s.x,g-50,'KRA-THOOM!',1.3,'#ff6b5c',true);}return;}
       const e=nearestEnemy(s.x,s.y-20,300);if(s.punch>0)s.punch--;if(--s.cd<0)s.cd=0;
       if(e){s.face=e.x>s.x?1:-1;if(Math.abs(e.x-s.x)>24){s.x+=s.face*1.3;carve(s.x+s.face*12,s.y-20,9,s.face*3,0,s.y);}else if(s.cd===0){s.cd=28;s.punch=8;const fx=s.x+s.face*24,fy=s.y-22;explode(fx|0,fy|0,6,{self:true,quiet:true,col:[255,200,120]});hitEnemy(e,34,s.face*7,-4);fxWord(fx,fy-10,'WHAM!',.9,'#ff6b5c',true);snd('punch',fx,fy);}}
       s.y=groundBelow(s.x|0,s.y-14);if(s.life===1)explode(s.x|0,s.y-20|0,14,{self:true,fire:.3});},
     draw:drawBuster});}}};
EXTRA.iron=[
 // nanotech blades unfold from the gauntlets: three long sweeping cuts
 {n:'Nano Blades',fn:(a,p,use)=>{if(!use(12))return;ST.cd=22;const an0=Math.atan2(a.dy,a.dx);let k=0;snd('slash',a.h.x,a.h.y,{pitch:1.3});
   ACT.push(()=>{const an=an0-.7+k*.35,h=hand();sliceLine(h.x,h.y,h.x+Math.cos(an)*52,h.y+Math.sin(an)*52,{edge:[255,90,70],w:0,push:1.2,quiet:k>0});damageLine(h.x,h.y,h.x+Math.cos(an)*52,h.y+Math.sin(an)*52,5,12);return++k<5;});}},
 // three Iron Legion drones fly escort and fire repulsors at whatever is closest
 {n:'Iron Legion',fn:(a,p,use)=>{if(summons.some(s=>s.legion)||!use(34))return;ST.cd=90;fxWord(p.x,p.y-ST.PH-10,'LEGION, DEPLOY',1,'#ff6b5c',true);
   for(let i=0;i<3;i++)summons.push({legion:true,i,x:p.x,y:p.y-20,life:720,cd:20+i*12,
     upd(s){const an=ST.frame*.04+s.i*2.09,tx=pl_.x+Math.cos(an)*30,ty=pl_.y-36+Math.sin(an*1.3)*8;s.x+=(tx-s.x)*.1;s.y+=(ty-s.y)*.1;spawn(s.x,s.y+3,(R()-.5)*.3,1,rgb(255,200,120),6,0,1,0);
       if(--s.cd<=0){const e=nearestEnemy(s.x,s.y,220);if(e){s.cd=36;const d=Math.hypot(e.x-s.x,e.y-s.y)||1;shots.push({x:s.x,y:s.y,vx:(e.x-s.x)/d*7,vy:(e.y-s.y)/d*7,type:'repulsor',life:60,boom:5,col:[255,220,150],ecol:[255,200,120]});}}},
     draw(s){for(let y=0;y<6;y++)for(let x=0;x<4;x++){const c=y<2?rgb(176,32,32):y<4?rgb(222,172,64):rgb(176,32,32);drawPix(s.x-2+x,s.y-3+y,c);}drawPix(s.x,s.y-2,rgb(200,240,255),true);}});}},
];
import { pix } from '../render/canvas.js';
const drawPix=(x,y,c,g)=>pix(x,y,c,g?c:0);

// ================= WOLVERINE =================
EXTRA.wolverine=[
 // curled into a spinning ball of claws he bounces off everything, cutting as he goes
 {n:'Snikt Ball',fn:(a,p,use)=>{if(!use(16))return;ST.cd=40;let vx=a.dx*7,vy=a.dy*7,k=0;fxWord(p.x,p.y-ST.PH-8,'SNIKT-SNIKT-SNIKT!',1,'#f3e9d2',true);
   ACT.push(()=>{k++;p.script=2;vy+=.25;const ox=p.x,oy=p.y;if(!scriptMove(p,vx,0))vx=-vx*.9;if(!scriptMove(p,0,vy)){vy=-vy*.85;if(Math.abs(vy)<2)vy=-4;}
     const cy=p.y-ST.PH/2,an=k*1.1;for(let j=0;j<2;j++){const b=an+j*Math.PI;sliceLine(p.x,cy,p.x+Math.cos(b)*14,cy+Math.sin(b)*14,{edge:[236,238,250],quiet:true,push:1});}
     damageEnemies(p.x,cy,12,7,vx*.5,vy*.5);if(k%3===0)afters.push({x:p.x,y:p.y,ang:an,face:p.face,life:8});return k<70;});}},
 // the claws go into the ground and he wrenches up the slab he is standing on
 {n:'Adamantium Anchor',fn:(a,p,use)=>{const gx=p.x+p.face*10,gy=surfaceY(gx|0,Math.max(0,p.y-4|0),20);const n0=solidCells(gx,gy+8,14,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n<30){fxWord(p.x,p.y-ST.PH-6,'NO GRIP',.7,'#f3e9d2',true);return;}if(!use(20))return;ST.cd=40;
   const b=makeBody(q,n,false);if(!b)return;const dx=mouse.wx-b.x,dy=mouse.wy-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*7;b.vy=dy/d*7-3;b.va=(R()-.5)*.2;b.thrown=true;b.safeP=ST.frame+30;fxWord(gx,gy-14,'HRRRAGH!',1.1,'#f3e9d2',true);snd('rip',gx,gy);ST.shake=Math.max(ST.shake,6);}},
];

// ================= CYCLOPS =================
function bankShot(h,dx,dy,len,bounces,o){let x=h.x,y=h.y,b=0,sx=x,sy=y;const segs=[];
  for(let s=0;s<len;s++){const nx=x+dx,ny=y+dy,X=nx|0,Y=ny|0;if(nx<0||nx>=W||ny>=H){break;}
    const solid=(X,Y)=>Y>=0&&Y<H&&KIND[t[Y*W+X]]===S;
    if(solid(X,Y)){explode(X,Y,3,{self:true,quiet:true,col:[255,90,70]});if(++b>bounces)break;segs.push([sx,sy,x,y]);sx=x;sy=y;if(solid(nx|0,y|0))dx=-dx;if(solid(x|0,ny|0))dy=-dy;if(!solid(nx|0,y|0)&&!solid(x|0,ny|0)){dx=-dx;dy=-dy;}continue;}x=nx;y=ny;}
  segs.push([sx,sy,x,y]);for(const [a0,b0,a1,b1] of segs){beams.push({x0:a0,y0:b0,x1:a1,y1:b1,life:6,w:1,c:[255,220,210],g:[255,40,40]});damageLine(a0,b0,a1,b1,4,o.dmg);}}
REWORK.cyclops={'Concussive Burst':
 {n:'Bank Shot',fn:(a,p,use)=>{if(!use(10))return;ST.cd=20;p.thrustF=8;bankShot(a.h,a.dx,a.dy,700,6,{dmg:22});fxWord(a.h.x+a.dx*20,a.h.y-10,'BANK SHOT!',.8,'#ff6b5c',true);snd('zap',a.h.x,a.h.y,{pitch:1.4});}},
 'Visor Overload':
 {n:'Optic Lift',fn:(a,p,use)=>{if(!use(14))return;ST.cd=34;p.vy=-8;p.ground=false;p.thrustF=10;const h=hand();beamCore({h:{x:p.x,y:p.y},dx:0,dy:1,d:100},{pow:120,rad:4,len:90,w:5,c:[255,220,210],g:[255,40,40],spark:()=>rgb(255,120,90),dmg:14});explode(p.x|0,surfaceY(p.x|0,p.y|0,90),10,{self:true,col:[255,60,50]});fxWord(p.x,p.y-ST.PH-8,'OPTIC LIFT!',.9,'#ff6b5c',true);}}};
EXTRA.cyclops=[
 // field leader: he marks the target; everything near it takes half again as much damage
 {n:'X-Formation',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,70,8);if(!list.length)return;if(!use(16))return;ST.cd=40;for(const e of list){applyStatus(e,'mark',480);}fxWord(mouse.wx,mouse.wy-24,'X-MEN, ON MY MARK!',1,'#ffc93c',true);snd('wave',mouse.wx,mouse.wy,{v:.5});}},
 // a ruby-quartz prism at the cursor splits his beam into a star of six
 {n:'Prism Burst',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=mouse.wx,cy=mouse.wy;beams.push({x0:a.h.x,y0:a.h.y,x1:cx,y1:cy,life:6,w:2,c:[255,220,210],g:[255,40,40]});damageLine(a.h.x,a.h.y,cx,cy,4,10);
   for(let k=0;k<6;k++){const an=k/6*6.283+R()*.2;beamCore({h:{x:cx,y:cy},dx:Math.cos(an),dy:Math.sin(an),d:1},{pow:90,rad:1,len:120*ST.aoeC,w:2,c:[255,220,210],g:[255,40,40],spark:()=>rgb(255,120,90),dmg:10});}flash(cx,cy,30,[255,60,60],6);fxWord(cx,cy-20,'PRISM!',.9,'#ff6b5c',true);}},
];

// ================= ICEMAN =================
EXTRA.iceman=[
 // every frozen or chilled enemy in range bursts at once (the SHATTER combo, everywhere)
 {n:'Shatter Point',fn:(a,p,use)=>{const list=enemies.filter(e=>(e.frozen>0||(e.st&&e.st.chill>40))&&Math.hypot(e.x-p.x,e.y-p.y)<240);if(!list.length){fxWord(p.x,p.y-ST.PH-6,'NOTHING FROZEN',.7,'#bfe3ff',true);return;}if(!use(20))return;ST.cd=40;
   for(const e of list){e.frozen=Math.max(e.frozen||0,2);hitEnemy(e,40,0,-2);}fxWord(p.x,p.y-ST.PH-12,'SHATTER POINT!',1.3,'#bfe3ff',true);snd('glass',p.x,p.y,{size:2});}},
 // packs a boulder of ice and throws it: a real chunk that crashes and breaks apart
 {n:'Ice Cannon',fn:(a,p,use)=>{if(!use(18))return;ST.cd=34;const r=7,w=r*2+1,lm=new Uint8Array(w*w),lc=new Uint32Array(w*w);let n=0;for(let y=0;y<w;y++)for(let x=0;x<w;x++){if((x-r)**2+(y-r)**2>r*r)continue;lm[y*w+x]=ICE;const v=R()*30|0;lc[y*w+x]=rgb(170+v,225,255);n++;}
   const b=finishBody(lm,lc,w,w,r,r,a.h.x+a.dx*10,a.h.y+a.dy*10,0,n,false);b.vx=a.dx*9;b.vy=a.dy*9-1;b.va=(R()-.5)*.3;b.thrown=true;b.safeP=ST.frame+20;b.icicle=true;snd('ice',a.h.x,a.h.y);fxWord(a.h.x,a.h.y-12,'FWOOMPH!',.8,'#bfe3ff',true);}},
];

// ================= JEAN GREY =================
REWORK.jean={'Mind Shield':
 {n:'Psionic Overload',fn:(a,p,use)=>{if(!use(26))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy,r=80*ST.aoeC;for(let k=0;k<3;k++)rings.push({x:cx,y:cy,r:6+k*8,vr:4+k,life:16,c:[255,110,200]});
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r){applyStatus(e,'stun',e.def.titan?20:150);hitEnemy(e,22,0,0);}fxWord(cx,cy-20,'OVERLOAD!',1.2,'#ff9ad8',true);snd('psi',cx,cy,{pitch:.6});shockFx(cx,cy,.8);}}};
EXTRA.jean=[
 // two minds trade places: the hero and the enemy under the cursor swap positions
 {n:'Mind Swap',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,50);if(!e||e.def.titan){fxWord(mouse.wx,mouse.wy,'NO MIND THERE',.7,'#ff9ad8',true);return;}if(!use(18))return;ST.cd=30;
   const px=p.x,py=p.y;p.x=e.x;p.y=e.y+e.def.h/2;e.x=px;e.y=py-e.def.h/2;applyStatus(e,'stun',60);hitEnemy(e,10,0,0);for(const [x,y] of [[px,py],[p.x,p.y]])rings.push({x,y:y-8,r:4,vr:2,life:14,c:[255,110,200]});snd('psi',p.x,p.y,{pitch:1.6});}},
 // the Phoenix keeps her: for 20 seconds a killing blow brings her back in fire
 {n:'Phoenix Rebirth',fn:(a,p,use)=>{if(p.rebirth>0||!use(45))return;ST.cd=60;p.rebirth=1200;fxWord(p.x,p.y-ST.PH-10,'THE PHOENIX REMEMBERS',1,'#ff9a3c',true);
   ACT.push(()=>{if(!(p.rebirth>0))return false;p.rebirth--;if(ST.frame%4===0)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,(R()-.5)*.4,-.8,rgb(255,150+R()*80|0,40),12,0,1,0,1);return true;});}},
];

// ================= SPIDER-MAN =================
EXTRA.spidey=[
 // webs a chunk of building to an anchor overhead: a wrecking ball on a line
 {n:'Web Wrecking Ball',fn:(a,p,use)=>{const n0=solidCells(mouse.wx,mouse.wy,9,false);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n<20){fxWord(mouse.wx,mouse.wy,'NEED SOMETHING HEAVY',.7,'#f3e9d2',true);return;}if(!use(26))return;ST.cd=50;
   const b=makeBody(q,n,false);if(!b)return;b.thrown=true;b.safeP=ST.frame+600;let ax=b.x+(p.x<b.x?-60:60),ay=b.y-90;for(let y=b.y-10;y>Math.max(0,b.y-200);y--){if(KIND[t[(y|0)*W+(ax|0)]]===S){ay=y+1;break;}}const L=Math.hypot(b.x-ax,b.y-ay);let k=0;
   b.vx=(p.x<b.x?3:-3);fxWord(b.x,b.y-14,'WRECKING BALL!',1.1,'#f3e9d2',true);
   ACT.push(()=>{k++;if(!bodies.includes(b))return false;const dx=b.x-ax,dy=b.y-ay,d=Math.hypot(dx,dy)||1;if(d>L){const ux=dx/d,uy=dy/d,vr=b.vx*ux+b.vy*uy;b.x=ax+ux*L;b.y=ay+uy*L;if(vr>0){b.vx-=vr*ux;b.vy-=vr*uy;}}b.rest=0;b.vx*=1.004;
     beams.push({x0:ax,y0:ay,x1:b.x,y1:b.y,life:1,w:0,c:[240,240,246],g:[160,160,170]});for(const e of enemies)if(Math.hypot(e.x-b.x,e.y-b.y)<b.rmax+e.def.w/2){hitEnemy(e,Math.hypot(b.vx,b.vy)*3,b.vx*.6,b.vy*.6);}return k<300;});}},
 // a web zip to the cursor that ends in a flying kick
 {n:'Thwip Zip',fn:(a,p,use)=>{if(!use(8))return;ST.cd=16;const tx=mouse.wx,ty=mouse.wy;let k=0;snd('whoosh',p.x,p.y,{pitch:1.9});
   ACT.push(()=>{k++;p.script=2;beams.push({x0:hand().x,y0:hand().y,x1:tx,y1:ty,life:1,w:0,c:[240,240,246],g:[160,160,170]});const dx=tx-p.x,dy=ty-(p.y-ST.PH/2),d=Math.hypot(dx,dy)||1;
     if(d<10||k>40){damageEnemies(p.x,p.y-ST.PH/2,14,20,dx/d*5,-3);fxWord(p.x,p.y-ST.PH-6,'THWIP-KICK!',.8,'#f3e9d2',true);p.vx=dx/d*3;p.vy=-2;return false;}scriptMove(p,dx/d*Math.min(9,d),dy/d*Math.min(9,d));return true;});}},
];

// ================= SCARLET WITCH =================
EXTRA.wanda=[
 // reality flips: inside the hex, up is down for wreckage, enemies and dust
 {n:'Gravity Flip',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy,r=70*ST.aoeC;let k=0;fxWord(cx,cy-r-8,'UP IS DOWN',1.1,'#ff6fa8',true);snd('psi',cx,cy,{pitch:.7});
   ACT.push(()=>{k++;if(k%6===0)rings.push({x:cx,y:cy,r,vr:0,life:6,c:[255,60,130]});for(const b of bodies)if(Math.hypot(b.x-cx,b.y-cy)<r){b.vy-=.62*(ST.gk||1);b.rest=0;b.thrown=true;}
     for(const e of enemies)if(!e.def.titan&&Math.hypot(e.x-cx,e.y-cy)<r){e.vy-=e.def.fly?.15:.7;if(e.y<cy-r+4)hitEnemy(e,1.5,0,0);}
     if(k===1){const n0=solidCells(cx,cy,r*.5|0,false);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n>20){const b=makeBody(q,n,false);if(b){b.vy=-1;b.thrown=true;}}}
     return k<240;});}},
 // three spears of chaos magic circle her, then hunt the nearest enemies
 {n:'Chaos Spears',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;for(let i=0;i<3;i++){let k=0,x=p.x,y=p.y-ST.PH/2;const c=[255,60,130];
     ACT.push(()=>{k++;if(k<30){const an=k*.25+i*2.09;x=pl_.x+Math.cos(an)*18;y=pl_.y-ST.PH/2+Math.sin(an)*18;spawn(x,y,0,0,rgb(255,90,150),6,0,1,0,1);return true;}
       if(k===30){const e=nearestEnemy(x,y,260)||{x:mouse.wx,y:mouse.wy},d=Math.hypot(e.x-x,e.y-y)||1;shots.push({x,y,vx:(e.x-x)/d*8,vy:(e.y-y)/d*8,type:'hex',life:90,boom:8,col:c,ecol:c,home:true});snd('psi',x,y,{pitch:1.4});}return false;});}}},
];

// ================= DOCTOR STRANGE =================
function ghost(x,y,face,c,a){ST.TG=c;drawSprite(x,y,0,face,true,ST.CH.spr,ST.CH.pal);ST.TG=null;}
EXTRA.strange=[
 // his astral self leaves his body, flies to the cursor and fights there
 {n:'Astral Projection',fn:(a,p,use)=>{if(summons.some(s=>s.astral)||!use(26))return;ST.cd=60;fxWord(p.x,p.y-ST.PH-10,'ASTRAL FORM',1,'#bfe3ff',true);
   summons.push({astral:true,x:p.x,y:p.y,life:360,cd:0,face:1,upd(s){const e=nearestEnemy(mouse.wx,mouse.wy,140);const tx=e?e.x:mouse.wx,ty=e?e.y+8:mouse.wy;s.x+=(tx-s.x)*.08;s.y+=(ty-s.y)*.08;s.face=tx>s.x?1:-1;
     if(--s.cd<=0&&e&&Math.hypot(e.x-s.x,e.y-s.y+8)<16){s.cd=12;hitEnemy(e,12,s.face*3,-2);flash(e.x,e.y,10,[200,230,255],3);snd('punch',e.x,e.y,{v:.5});}if(R()<.3)spawn(s.x,s.y-8,(R()-.5)*.5,-.4,rgb(200,230,255),12,0,1,0,1);},
     draw(s){ghost(s.x,s.y,s.face,[200,230,255]);}});}},
 // the Images of Ikonn: three mirror images orbit him and cast bolts of their own
 {n:'Images of Ikonn',fn:(a,p,use)=>{if(summons.some(s=>s.ikonn)||!use(28))return;ST.cd=80;fxWord(p.x,p.y-ST.PH-10,'IMAGES OF IKONN!',1,'#ffc93c',true);
   for(let i=0;i<3;i++)summons.push({ikonn:true,i,x:p.x,y:p.y,life:480,cd:30+i*15,face:1,upd(s){const an=ST.frame*.03+s.i*2.09;s.x=pl_.x+Math.cos(an)*34;s.y=pl_.y+Math.sin(an)*10-6;s.face=pl_.face;
     if(--s.cd<=0){const e=nearestEnemy(s.x,s.y,240);if(e){s.cd=50;const d=Math.hypot(e.x-s.x,e.y-s.y+8)||1;shots.push({x:s.x,y:s.y-8,vx:(e.x-s.x)/d*6,vy:(e.y-s.y+8)/d*6,type:'bolt',life:80,boom:5,col:[255,200,90],ecol:[255,200,90]});}}},
     draw(s){ghost(s.x,s.y,s.face,[255,210,120]);}});}},
];

// ================= ANT-MAN =================
EXTRA.antman=[
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
];

// ================= JUGGERNAUT =================
EXTRA.juggernaut=[
 // a headbutt that sends a shock through a whole structure: it splits along a dozen cracks
 {n:'Structural Shatter',fn:(a,p,use)=>{if(!use(28))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy,r=60*ST.aoeC;p.punchF=10;fxWord(cx,cy-20,'KRRRSSSHH!',1.3,'#e23b2e',true);ST.shake=14;snd('slam',cx,cy);
   for(let k=0;k<9;k++){const an=R()*Math.PI,ox=(R()-.5)*r,oy=(R()-.5)*r;sliceLine(cx+ox-Math.cos(an)*r,cy+oy-Math.sin(an)*r,cx+ox+Math.cos(an)*r,cy+oy+Math.sin(an)*r,{edge:[255,120,90],push:1.5,quiet:k>0});}
   explode(cx|0,cy|0,8,{self:true,col:[255,90,70]});damageEnemies(cx,cy,r,20,0,-2);}},
 // he tears a wedge out of the ground ahead and bowls it down the street
 {n:'Cyttorak Slab',fn:(a,p,use)=>{const dir=a.dx<0?-1:1,gx=p.x+dir*16,gy=surfaceY(gx|0,Math.max(0,p.y-6|0),30);if(!use(22))return;ST.cd=45;
   sliceLine(gx-dir*12,gy-2,gx+dir*4,gy+26,{edge:[255,120,90],quiet:true});sliceLine(gx+dir*30,gy-2,gx+dir*14,gy+26,{edge:[255,120,90],quiet:true});sliceLine(gx-dir*12,gy+26,gx+dir*30,gy+26,{edge:[255,120,90],quiet:true});
   const n0=solidCells(gx+dir*9,gy+12,12,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n<20)return;const b=makeBody(q,n,false);if(!b)return;b.vx=dir*8;b.vy=-4;b.va=dir*.08;b.thrown=true;b.safeP=ST.frame+30;fxWord(gx,gy-16,'OUT OF MY WAY!',1,'#e23b2e',true);snd('rip',gx,gy);}},
];

// ================= ULTRON =================
EXTRA.ultron=[
 // three laser turrets bolt themselves to the surface around the cursor
 {n:'Turret Grid',fn:(a,p,use)=>{if(summons.filter(s=>s.turret).length>=3||!use(26))return;ST.cd=50;for(let i=0;i<3;i++){const x=mouse.wx+(i-1)*30,y=groundBelow(x|0,mouse.wy);
   summons.push({turret:true,x,y,life:720,cd:20+i*10,upd(s){if(--s.cd<=0){const e=nearestEnemy(s.x,s.y-6,260);if(e){s.cd=30;const d=Math.hypot(e.x-s.x,e.y-s.y+6)||1;let x=s.x,y=s.y-6;for(let k=0;k<d;k+=2){x+=(e.x-s.x)/d*2;y+=(e.y-s.y+6)/d*2;}beams.push({x0:s.x,y0:s.y-6,x1:e.x,y1:e.y,life:3,w:0,c:[255,220,210],g:[255,30,20]});hitEnemy(e,10,0,0);snd('elaser',s.x,s.y,{v:.3});}}},
     draw(s){for(let y=0;y<6;y++)for(let x=-3;x<=3;x++)if(Math.abs(x)<=3-(y>>1))drawPix(s.x+x,s.y-y,y<2?rgb(80,84,96):rgb(160,166,180));drawPix(s.x,s.y-6,rgb(255,40,40),true);}});}
   fxWord(mouse.wx,mouse.wy-24,'GRID ONLINE.',.9,'#ff6b5c',true);}},
 // a copy of himself marches to the nearest enemy and self-destructs
 {n:'Ultron Clone Bomb',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-8,'THERE ARE NO STRINGS ON ME',.8,'#ff6b5c',true);
   summons.push({x:p.x+p.face*10,y:p.y,life:300,face:p.face,upd(s){const e=nearestEnemy(s.x,s.y-8,300);if(e){s.face=e.x>s.x?1:-1;s.x+=s.face*2;s.y=groundBelow(s.x|0,s.y-12);if(Math.hypot(e.x-s.x,e.y-s.y+8)<14)s.life=1;}},
     end(s){explode(s.x|0,s.y-8|0,16,{self:true,fire:.3,col:[255,60,40]});shockFx(s.x,s.y,1);},draw(s){ghost(s.x,s.y,s.face,[255,120,110]);}});}},
];

// ================= MAGNETO =================
REWORK.magneto={'Iron Rain':
 {n:'Iron Maelstrom',fn:(a,p,use)=>{const cx=mouse.wx,cy=mouse.wy,L=[];for(let k=0;k<5000&&L.length<90;k++){const X=cx+(R()-.5)*280|0,Y=cy+(R()-.5)*280|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X;if(t[i]===STEEL)L.push(i);}
   if(L.length<12){fxWord(cx,cy,'NO METAL',.8,'#c88cff',true);return;}if(!use(34))return;ST.cd=70;const sh=[];for(const i of L){const X=i%W,Y=(i/W)|0;setc(i,EMPTY);const s={x:X,y:Y,vx:0,vy:0,type:'spike',life:200,col:[170,176,190],boom:4,grav:0};shots.push(s);sh.push(s);}
   let k=0;fxWord(cx,cy-30,'IRON MAELSTROM!',1.2,'#c88cff',true);snd('rip',cx,cy);
   ACT.push(()=>{k++;for(const s of sh){if(!shots.includes(s))continue;if(k<50){const dx=s.x-cx,dy=s.y-cy,d=Math.hypot(dx,dy)||1,tr=20+(s.life%30);s.vx=-dy/d*4+(tr-d)*dx/d*.08;s.vy=dx/d*4+(tr-d)*dy/d*.08;s.life=200;}else if(k===50){s.home=true;const e=nearestEnemy(s.x,s.y,260);if(e){const d=Math.hypot(e.x-s.x,e.y-s.y)||1;s.vx=(e.x-s.x)/d*7;s.vy=(e.y-s.y)/d*7;}}}return k<60;});}}};
EXTRA.magneto=[
 // every enemy shot on screen turns round and goes home
 {n:'Polarity Reverse',fn:(a,p,use)=>{let n=0;for(const s of shots){if(s.owner!=='enemy')continue;if(Math.abs(s.x-p.x)>260||Math.abs(s.y-p.y)>160)continue;n++;s.owner='player';const src=s.src&&s.src.hp>0?s.src:null;if(src){const d=Math.hypot(src.x-s.x,src.y-s.y)||1,v=Math.hypot(s.vx,s.vy)*1.4;s.vx=(src.x-s.x)/d*v;s.vy=(src.y-s.y)/d*v;}else{s.vx*=-1.4;s.vy*=-1.4;}s.col=[200,120,255];}
   if(!use(14))return;ST.cd=30;rings.push({x:p.x,y:p.y-8,r:10,vr:6,life:14,c:[200,120,255]});fxWord(p.x,p.y-ST.PH-8,n?'RETURN TO SENDER':'POLARITY REVERSED',.9,'#c88cff',true);}},
 // a storm of torn steel orbits him and shreds what comes close
 {n:'Metal Storm Armor',fn:(a,p,use)=>{if(p.mstorm>0||!use(30))return;ST.cd=60;p.mstorm=480;fxWord(p.x,p.y-ST.PH-10,'MASTER OF MAGNETISM',1,'#c88cff',true);
   ACT.push(()=>{if(--p.mstorm<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;for(let k=0;k<6;k++){const an=ST.frame*.15+k*1.047,r=20+Math.sin(ST.frame*.07+k)*4;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r*.8,0,0,k&1?rgb(170,176,190):rgb(120,126,140),3,0,0,0,0);}
     if(ST.frame%5===0){for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<28+e.def.w/2)hitEnemy(e,6,(e.x-cx)/(d||1)*2,(e.y-cy)/(d||1)*2);}carve(cx+(R()-.5)*44,cy+(R()-.5)*36,3,0,0);}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<26)shots.splice(n,1);}return true;});}},
];
export { WEB };
