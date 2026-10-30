// Kit overhaul, part A (2026-10-30): powers that replace the duplicates. The audit in overhaul.js found the same
// mechanic on up to 18 heroes (a straight-line dash charge, a leap-slam, a held beam, a radial nova, a summoned
// helper). Each power here is something only its hero does, taken from the comics: Doom swaps places with a
// Doombot, Ultron's encephalo-ray puts foes into a coma, Sue splats enemies against walls, Juggernaut plants his
// feet and nothing moves him.
// This file also holds the enemy states those powers need (e.ov): sleep, fear, blind, depowered, polymorphed,
// shrunk, dancing, held, time-stopped, magnetized, infected, withered. They sit on top of the status effects in
// abilities.js and take over the enemy's AI through a wrapper on def.think.
import { ST } from '../state.js';
import { EMPTY, GLASS, KIND, OBSID, P, R, RUBBLE, S, STEEL, WATER, CONC, rgb } from '../world/materials.js';
import { H, VH, VW, W, setc, t } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { solidAt, spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import { sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { SPAWN, crackCell, drones, quake, shockFx, shots, zap } from './powers.js';
import { ACT, clawSlash, eyes } from './xmen.js';
import { boxHit, carve, hand, mouse, pl_ } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { HERO_TIMERS, applyStatus, summons } from './abilities.js';
import { nearestN, tagged } from './kits2a.js';
import { atCursor, boxE, noTarget, segD } from './kits3a.js';
import { pix } from '../render/canvas.js';
import { screenFlash } from '../render/vfxcore.js';

// ================= enemy states (e.ov) =================
export const ov=e=>e.ov||(e.ov={});
const live=e=>e.hp>0&&!e.host;
const onScreen=e=>e.x>ST.camX-20&&e.x<ST.camX+VW+20&&e.y>ST.camY-20&&e.y<ST.camY+VH+20;
export const solid=(x,y)=>{const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)return false;const k=KIND[t[Y*W+X]];return k===S||k===P;};
// a state can take the enemy's turn: true means its own AI does not run this tick
function ovThink(e,th){const o=e.ov,p=pl_;if(e.def.titan)return false;
  if(o.tstop>0){e.vx=0;e.vy=e.def.fly?0:-.35*(ST.gk||1);return true;} // frozen in Strange's moment
  if(o.held>0){if(!e.def.fly)e.vy-=.35*(ST.gk||1);return true;} // bound and steered by a power
  if(o.sleep>0){e.vx*=.85;return true;}
  if(o.poly>0){e.vx*=.92;e.vy=Math.max(-1.1,e.vy*.9-.4);return true;} // a bubble: it floats
  if(o.dance>0){e.vx+=(p.vx*1.2-e.vx)*.3;if(p.vy<-2&&e.ground)e.vy=-3.5;e.face=p.face;return true;} // mirrors Star-Lord's moves
  if(o.fear>0){const d=Math.sign(e.x-p.x)||1;e.vx+=(d*2.4-e.vx)*.15;e.face=d;if(e.def.fly)e.vy+=(-.5-e.vy)*.1;return true;}
  if(o.tiny>0){if(e.t%24===0)e.vx=(R()-.5)*3;return true;} // a shrunk enemy only scurries
  if(o.blind>0||o.depow>0){const t0=ST.AI_T,pc=SPAWN.peace;if(o.blind>0){if(!o.bt||e.t%45===0)o.bt={x:e.x+(R()-.5)*220,y:e.y+(R()-.5)*80};ST.AI_T=o.bt;}if(o.depow>0)SPAWN.peace=true; // blind: it fights a random spot; depowered: it cannot shoot
    try{if(th)th(e);}finally{ST.AI_T=t0;SPAWN.peace=pc;}return true;}
  return false;}
const TINT={tstop:rgb(150,255,170),sleep:rgb(120,140,210),poly:rgb(255,110,150),fear:rgb(160,90,230),blind:rgb(255,255,220),depow:rgb(140,140,150),tiny:rgb(120,200,255),mag:rgb(200,110,255),goo:rgb(20,20,30),wither:rgb(110,150,100),irr:rgb(140,255,90)};
function tickOv(e){const o=e.ov;let tc=0;
  if(!e.def.ovW){const th=e.def.think;e.def.think=function(x){if(x.ov&&ovThink(x,th))return;if(th)th(x);};e.def.ovW=1;}
  for(const k in TINT){if(o[k]>0){o[k]--;if(!tc)tc=TINT[k];}}
  if(o.dance>0)tc=rgb(...[[255,90,90],[255,220,60],[90,230,120],[90,160,255]][(ST.frame>>3)&3]);
  o.tc=tc;
  if(o.tiny===0&&e.sc!==undefined&&e.sc<1){e.sc=1;o.tiny=-1;}
  if(o.sleep>0&&ST.frame%40===0)fxWord(e.x+4,e.y-e.def.h/2-6,'z',.6,'#b8c8ff');
  if(o.goo>0){if(e.def.titan||ST.frame%2===0)e.hp-=.1;if(ST.CH.id==='venom')pl_.hp=Math.min(ST.CH.hp,pl_.hp+.03); // Klyntar: it feeds him
    if(o.goo%30===0){const n=nearestN(e.x,e.y,50,3,e).find(x=>!(x.ov&&x.ov.goo>0));if(n){ov(n).goo=240;beams.push({x0:e.x,y0:e.y,x1:n.x,y1:n.y,life:6,w:0,c:[60,60,80],g:[10,10,20]});}}}
  if(o.wither>0){e.vx*=.9;if(ST.frame%3===0)hitEnemy(e,e.def.titan?.3:e.def.hp*.006,0,0);if(R()<.2)spawn(e.x+(R()-.5)*e.def.w,e.y,0,-.4,rgb(90,140,90),18,0,0,0,1);}
  if(o.mag>0){for(const n of enemies){if(n===e||!(n.ov&&n.ov.mag>0)||n.def.titan)continue;const dx=n.x-e.x,dy=n.y-e.y,d=Math.hypot(dx,dy)||1;if(d>170)continue; // magnetized foes slam into each other
    e.vx+=dx/d*.5;e.vy+=dy/d*.5;if(d<(e.def.w+n.def.w)/2+1){const rv=Math.hypot(e.vx-n.vx,e.vy-n.vy);if(rv>2.5&&ST.frame-(e.mem.magT||-99)>15){e.mem.magT=n.mem.magT=ST.frame;hitEnemy(e,rv*6,-dx/d,-1);hitEnemy(n,rv*6,dx/d,-1);applyStatus(e,'stun',30);applyStatus(n,'stun',30);
      for(let k=0;k<14;k++)spawn((e.x+n.x)/2,(e.y+n.y)/2,(R()-.5)*4,(R()-.5)*4,rgb(210,140,255),12,0,1,0,1);snd('clang',e.x,e.y,{v:.7});}}}}}
{const st0=ST.statusTick;ST.statusTick=e=>{st0(e);if(e.ov)tickOv(e);};}
// the states change what a hit does; the log feeds Kang's Time Bomb
{const hh0=ST.hitHook;ST.hitHook=(e,d)=>{d=hh0?hh0(e,d):d;const o=e.ov,p=pl_;
  if(o){if(o.tstop>0){o.bank=(o.bank||0)+d;e.flash=3;return 0;}
    if(o.sleep>0){d*=2;o.sleep=0;fxWord(e.x,e.y-e.def.h/2-8,'WAKE-UP CALL!',.8,'#b8c8ff',true);}
    if(o.poly>0)d*=1.5;if(o.depow>0)d*=1.5;if(o.tiny>0)d*=3;if(o.irr>0)d*=1.25;}
  if(ST.pctx){if(p.herb>0&&ST.CH.id==='panther'&&e.mem.herb!==p.herbId){e.mem.herb=p.herbId;d*=3;applyStatus(e,'stun',30);fxWord(e.x,e.y-e.def.h/2-8,'WEAK POINT!',.8,'#c89bff',true);}
    if(p.duel&&p.duel.e===e)d*=1.5;
    const L=e.mem.dlog||(e.mem.dlog=[]);L.push(ST.frame,d);while(L.length&&L[0]<ST.frame-300)L.splice(0,2);}
  return d;};}
// what the hero's new defensive powers do to incoming damage
{const hu0=ST.hurtHook;ST.hurtHook=d=>{d=hu0?hu0(d):d;if(!(d>0))return d;const p=pl_,cx=p.x,cy=p.y-ST.PH/2;
  if(ST.CH.id==='thing'){const L=p.took||(p.took=[]);L.push(ST.frame,d);while(L.length&&L[0]<ST.frame-480)L.splice(0,2);}
  if(p.immov>0)d*=.1;
  if(p.duel&&p.duel.k>0)d*=.5;
  if(p.balloon>0)d*=.3;
  if(p.vshield>0)d*=.4;
  if(p.plate>0)d*=.7;
  if(p.retri>0){p.retriD+=d;d*=.5;}
  if(p.seventh>0&&ST.frame-(p.sevT||-99)>20){const e=nearestEnemy(cx,cy,150);if(e){p.sevT=ST.frame;d*=.5;const f=Math.sign(e.x-cx)||1; // Seventh Sense: she saw it coming and hits back
    beams.push({x0:cx,y0:cy,x1:e.x,y1:e.y,life:6,w:2,c:[255,240,200],g:[255,160,60]});hitEnemy(e,30,f*7,-3);flash(e.x,e.y,16,[255,200,90],5);fxWord(cx,cy-ST.PH,'COUNTER!',.8,'#ffcf6a',true);snd('punch',e.x,e.y,{v:.8});}}
  if(p.oshield>0){const s=Math.min(p.oshield,d);p.oshield-=s;d-=s;if(ST.frame%4===0)spawn(cx+(R()-.5)*14,cy+(R()-.5)*20,(R()-.5)*2,(R()-.5)*2,rgb(255,210,110),10,0,1,0,1);}
  return d;};}
// kills are remembered for a few seconds: Hela raises them
export const DEAD=[];
{const kh0=ST.killHook;ST.killHook=e=>{if(kh0)kh0(e);if(!e.def.titan&&!e.def.title&&!e.ally){DEAD.push({name:e.def.name,x:e.x,y:e.y,f:ST.frame});if(DEAD.length>12)DEAD.shift();}};}
HERO_TIMERS.push('immov','balloon','vshield','plate','retri','seventh','oshield','herb','chute','hshield','gloves','pstone','fenris','haste','wind');
// overlay: lines for the held, the magnetized and the duel ring (called from drawStatus in abilities.js)
ST.drawOv=(px,list)=>{for(const e of list){const o=e.ov;if(!o)continue;
  if(o.poly>0){const r=Math.max(e.def.w,e.def.h)/2+3,c=rgb(255,170,200);for(let k=0;k<20;k++){const a=k/20*6.283;px(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,c,c);}}
  if(o.tstop>0&&(ST.frame>>3)&1)px(e.x,e.y-e.def.h/2-3,rgb(150,255,170),rgb(150,255,170));}
  const du=pl_.duel;if(du&&du.k>0){const c=rgb(200,150,255);for(let k=0;k<48;k++){const a=k/48*6.283+ST.frame*.01;px(du.x+Math.cos(a)*du.r,du.y+Math.sin(a)*du.r*.6,c,c);}}};

// ================= shared bits =================
// a projectile run by ACT: step(x,y,k) returns false to stop; hits(e) is called on the first enemy it touches
function bolt(x,y,vx,vy,life,trail,hitE,hitWall){let k=0;ACT.push(()=>{k++;for(let s=0;s<2;s++){x+=vx/2;y+=vy/2;const e=boxE(x,y,2);if(e){hitE(e,x,y);return false;}if(solid(x,y)){if(hitWall)hitWall(x,y);return false;}}trail(x,y,k);return k<life&&x>0&&x<W&&y>-300&&y<H;});}
const ring=(x,y,r,c,life=12,vr=0)=>rings.push({x,y,r,vr,life,c});
const word=(x,y,s,c,z=.9)=>fxWord(x,y,s,z,c,true);
// does the current power still have the button held? (charge-and-release powers)
const held=n=>mouse.down&&ST.CH.powers[ST.cur]&&ST.CH.powers[ST.cur].n===n;

// ================= DOCTOR DOOM =================
const DOOM=[
 // a sorcerous bolt that bores through stone and steel, through every enemy on its line, and grows with each one
 {n:'Eldritch Bolt',fn:(a,p,use)=>{if(!use(6))return;ST.cd=12;let x=a.h.x,y=a.h.y,k=0,n=0;const vx=a.dx*6,vy=a.dy*6,hit=new Set();snd('psi',x,y,{pitch:.7,v:.6});
   ACT.push(()=>{k++;for(let s=0;s<2;s++){x+=vx/2;y+=vy/2;const r=2.5+n*.8;carve(x,y,r,vx*.2,vy*.2);
     for(const e of enemies)if(!hit.has(e)&&live(e)&&Math.hypot(e.x-x,e.y-y)<e.def.w/2+r){hit.add(e);n++;tagged('fire',()=>hitEnemy(e,12+n*5,vx*.3,vy*.3));flash(e.x,e.y,8+n*3,[90,255,130],3);}}
     for(let j=0;j<2+n;j++)spawn(x+(R()-.5)*(3+n),y+(R()-.5)*(3+n),(R()-.5)*.6,(R()-.5)*.6,R()<.5?rgb(130,255,160):rgb(40,200,90),10,0,1,0,1);
     return k<70&&x>0&&x<W&&y>-300&&y<H;});}},
 // "That was a Doombot": Doom trades places with the Doombot nearest the cursor, and the one left behind explodes
 {n:'That Was a Doombot',fn:(a,p,use)=>{if(!drones.length){noTarget('#7cff9a','NO DOOMBOT OUT');return;}if(!use(16))return;ST.cd=40;let bi=0,bd=1e9;
   drones.forEach((d,i)=>{const dd=Math.hypot(d.x-mouse.wx,d.y-mouse.wy);if(dd<bd){bd=dd;bi=i;}});
   const d=drones.splice(bi,1)[0],ox=p.x,oy=p.y-ST.PH/2;p.x=d.x;p.y=d.y+ST.PH/2;p.vx=p.vy=0;if(boxHit(p.x,p.y))punchOut(p);
   explode(ox|0,oy|0,13,{self:true,col:[90,255,130],word:'A DOOMBOT!'});damageEnemies(ox,oy,36,42,0,-3,true);ring(p.x,p.y-ST.PH/2,3,[150,255,180],12,2);snd('boom',ox,oy,{v:.8});}},
];

// ================= HULK =================
const HULK=[
 // he pours out gamma radiation: a glowing zone that eats at every enemy in it and leaves them weakened (+25% damage taken)
 {n:'Gamma Radiation',fn:(a,p,use)=>{if(!use(24))return;ST.cd=70;const cx=p.x,cy=p.y-6,r=64*(ST.aoeC||1);let k=0;ring(cx,cy,6,[140,255,90],20,3);snd('wave',cx,cy,{pitch:.6});
   ACT.push(()=>{k++;if(k%3===0)for(let j=0;j<4;j++){const an=R()*6.283,d=Math.sqrt(R())*r;spawn(cx+Math.cos(an)*d,cy+Math.sin(an)*d*.5,0,-.3-R()*.4,R()<.5?rgb(150,255,90):rgb(70,200,50),26,0,1,0,1);}
     if(k%20===0){ring(cx,cy,r*.3,[120,255,80],16,1.6);for(const e of enemies)if(live(e)&&Math.hypot(e.x-cx,(e.y-cy)*1.6)<r){hitEnemy(e,4,0,0);ov(e).irr=Math.max(ov(e).irr||0,60);}}
     return k<480;});}},
 // he rips two cars' worth of metal round his fists: the next three casts are colossal punches
 {n:'Car Gloves',fn:(a,p,use)=>{if(p.gloves>0&&ST.frame-p.glovT>480)p.gloves=0;
   if(!(p.gloves>0)){if(!use(22))return;ST.cd=20;p.gloves=3;p.glovT=ST.frame;word(p.x,p.y-ST.PH-8,'CAR GLOVES!','#ff8a5c');snd('clang',p.x,p.y,{pitch:.6});for(let k=0;k<20;k++)spawn(p.x+(R()-.5)*20,p.y-R()*ST.PH,(R()-.5)*2,-R()*2,R()<.5?rgb(200,50,40):rgb(170,170,180),16,0,0,1);return;}
   ST.cd=16;p.gloves--;p.punchF=10;const x=a.h.x+a.dx*10,y=a.h.y+a.dy*10;explode(x|0,y|0,18,{self:true,col:[200,70,50],word:'KRUNCH!'});damageEnemies(x,y,28,55,a.dx*9,a.dy*9-3);ST.hitstop=Math.max(ST.hitstop,3);
   for(let k=0;k<10;k++)spawn(x,y,(R()-.5)*5,(R()-.5)*5-1,R()<.5?rgb(200,50,40):rgb(190,190,200),30,0,0,1);}},
];

// ================= THOR =================
const THOR=[
 // Asgard's rain: a thunderhead soaks everything under it (wet foes are ELECTROCUTED by lightning), and Thor's bolts fall on the soaked
 {n:'Asgardian Downpour',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const cx=mouse.wx,top=Math.max(ST.camY+10,Math.min(mouse.wy-70,groundBelow(mouse.wx|0,mouse.wy)-90)),w=70*(ST.aoeC||1);let k=0;snd('thunder',cx,top,{v:.5});
   ACT.push(()=>{k++;for(let j=0;j<5;j++)spawn(cx+(R()-.5)*w*2,top+R()*6,(R()-.5)*.2,3+R(),rgb(120,160,230),80,k%3===0&&j===0?WATER:0,0,1);
     if(k%3===0)for(let j=0;j<3;j++)spawn(cx+(R()-.5)*w*2,top-4+(R()-.5)*8,(R()-.5)*.3,0,R()<.5?rgb(80,86,100):rgb(110,116,130),30,0,0,0);
     for(const e of enemies)if(Math.abs(e.x-cx)<w&&e.y>top)applyStatus(e,'wet',90);
     if(k%40===0){const tg=enemies.find(e=>live(e)&&Math.abs(e.x-cx)<w&&e.y>top);if(tg)tagged('shock',()=>{zap(tg.x,top,tg.x,tg.y,[230,240,255],[120,170,255]);hitEnemy(tg,12,0,0);snd('zap',tg.x,tg.y,{v:.6});});}
     return k<360;});}},
];

// ================= IRON MAN =================
const IRON=[
 // hold: the repulsors fire in every direction at once, a field that shoves enemies and bends shots away
 {n:'Repulsor Field',kind:'hold',fn:(a,p,use)=>{if(!use(.6))return;const cx=p.x,cy=p.y-ST.PH/2,r=62*(ST.aoeC||1);
   for(const e of enemies){if(e.def.titan)continue;const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<r){e.vx+=dx/d*.8;e.vy+=dy/d*.6-.1;if(ST.frame%10===0)hitEnemy(e,2,0,0);}}
   for(const s of shots)if(s.owner==='enemy'){const dx=s.x-cx,dy=s.y-cy,d=Math.hypot(dx,dy)||1;if(d<r*.7){s.vx+=dx/d*.6;s.vy+=dy/d*.6;}}
   for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r&&!b.held){b.vx+=dx/d*.3;b.vy+=dy/d*.3;b.rest=0;}}
   if(ST.frame%3===0)ring(cx,cy,6,[120,220,255],10,3);}},
];

// ================= WOLVERINE =================
const WOLV=[
 // claws that speed up: every slash within half a second of the last stacks the frenzy (up to 6); from 3 on, both hands cut
 {n:'Claw Fury',fn:(a,p,use)=>{if(!use(3))return;p.fury=ST.frame-(p.furyT||-99)<30?Math.min(6,(p.fury||0)+1):0;p.furyT=ST.frame;clawSlash(a,p);
   if(p.fury>=3)clawSlash({h:a.h,dx:a.dx*.9-a.dy*.4,dy:a.dy*.9+a.dx*.4},p);ST.cd=Math.max(3,8-p.fury);
   if(p.fury===6&&ST.frame-(p.furyW||-99)>60){p.furyW=ST.frame;word(p.x,p.y-ST.PH-8,'FRENZY!','#ffcf3c');}}},
];

// ================= SPIDER-MAN & MILES =================
const spiderSense=id=>({n:'Spider-Sense',fn:(a,p,use)=>{if(p.sense>0||!use(20))return;ST.cd=80;p.sense=360;word(p.x,p.y-ST.PH-10,'MY SPIDER-SENSE!','#f3e9d2');snd('psi',p.x,p.y,{pitch:1.4,v:.5});}});
const SPIDEY=[spiderSense('spidey')];

// ================= SCARLET WITCH =================
const WANDA=[
 // "No more": every enemy on screen loses its powers (no shots, +50% damage taken) and the weakest are written out of reality
 {n:'No More',fn:(a,p,use)=>{if(!use(50))return;ST.cd=160;let n=0;ST.hitstop=Math.max(ST.hitstop,6);screenFlash([255,60,120],.35);shockFx(p.x,p.y-ST.PH/2,1.2);word(p.x,p.y-ST.PH-14,'NO MORE.','#ff5c8a',1.4);
   for(const e of enemies){if(!live(e)||!onScreen(e))continue;if(e.def.titan){hitEnemy(e,40,0,0);continue;}ov(e).depow=480;n++;
     if(!e.def.title&&e.hp<e.def.hp*.2){e.hp=0;for(let k=0;k<16;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*.6,-R(),rgb(255,60+R()*80|0,130),30,0,1,0,1);}}
   snd('psi',p.x,p.y,{pitch:.5,v:.9});}},
];

// ================= DOCTOR STRANGE =================
// a bolt of Balthakk splits in three when it strikes, and each of those splits once more
function balthakk(x,y,vx,vy,g){bolt(x,y,vx,vy,90-g*20,(x,y)=>{if(R()<.8)spawn(x,y,(R()-.5)*.4,(R()-.5)*.4,R()<.5?rgb(255,190,90):rgb(255,120,40),8,0,1,0,1);},
  (e,x,y)=>{hitEnemy(e,13-g*3,vx*.3,vy*.3);split(x-vx,y-vy);},(x,y)=>{carve(x,y,3-g,vx*.2,vy*.2);split(x-vx,y-vy);});
  function split(x,y){flash(x,y,8-g*2,[255,170,70],3);if(g>=2)return;const an=Math.atan2(vy,vx)+Math.PI,sp=Math.hypot(vx,vy)*.85;for(const o of [-.7,0,.7])balthakk(x,y,Math.cos(an+o)*sp,Math.sin(an+o)*sp,g+1);}}
const STRANGE=[
 {n:'Bolts of Balthakk',fn:(a,p,use)=>{if(!use(8))return;ST.cd=16;balthakk(a.h.x,a.h.y,a.dx*5.5,a.dy*5.5,0);snd('psi',a.h.x,a.h.y,{pitch:1.1,v:.5});}},
 // the Crimson Bands of Cyttorak bind one foe; for three seconds it goes wherever the cursor goes, smashing into whatever it meets
 {n:'Crimson Bands',fn:(a,p,use)=>{const e=atCursor(60);if(!e||e.def.titan){noTarget('#ff5050');return;}if(!use(24))return;ST.cd=50;let k=0;const hit=new Map();word(e.x,e.y-e.def.h/2-8,'BOUND!','#ff6060');snd('rip',e.x,e.y,{pitch:1.3});
   ACT.push(()=>{k++;if(!live(e)||!enemies.includes(e))return false;ov(e).held=2;e.bound=2;e.vx+=(mouse.wx-e.x)*.05-e.vx*.12;e.vy+=(mouse.wy-e.y)*.05-e.vy*.12;
     const sp=Math.hypot(e.vx,e.vy);if(sp>2.5){for(const o of enemies)if(o!==e&&live(o)&&Math.hypot(o.x-e.x,o.y-e.y)<(o.def.w+e.def.w)/2+2&&ST.frame-(hit.get(o)||-99)>20){hit.set(o,ST.frame);hitEnemy(o,sp*5,e.vx*.6,e.vy*.6);hitEnemy(e,sp*2,0,0);snd('punch',o.x,o.y,{v:.6});}
       if(e.mem.blocked===e.t-1){hitEnemy(e,sp*4,0,0);carve(e.x,e.y,4,e.vx,e.vy);}}
     if(k%3===0){const h=hand();beams.push({x0:h.x,y0:h.y,x1:e.x,y1:e.y,life:3,w:0,c:[255,150,150],g:[220,30,40]});}
     return k<180;});}},
 // the ultimate: time stops for everything on screen but Strange. Every hit he lands is banked and paid out, half again, when it restarts
 {n:'Time Stands Still',ult:true,fn:(a,p,use)=>{ST.cd=200;const list=enemies.filter(e=>live(e)&&onScreen(e)&&!e.def.titan),frz=[];let k=0;screenFlash([140,255,170],.4);word(p.x,p.y-ST.PH-14,'TIME STANDS STILL','#9dffb0',1.3);snd('charge',p.x,p.y,{pitch:.4,v:1});
   for(const e of list){ov(e).tstop=200;e.ov.bank=0;}
   ACT.push(()=>{k++;for(const s of shots)if(s.owner==='enemy'&&!s.fz){s.fz=[s.vx,s.vy];s.vx=s.vy=0;frz.push(s);}for(const s of frz)if(s.fz)s.life++;
     if(k%10===0)for(const e of list)if(live(e))spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,0,rgb(150,255,170),10,0,1,0,1);
     if(k<200)return true;
     for(const s of frz)if(s.fz){s.vx=s.fz[0];s.vy=s.fz[1];s.fz=null;}
     for(const e of list){if(!e.ov)continue;e.ov.tstop=0;const b=e.ov.bank||0;e.ov.bank=0;if(b>0&&live(e)){hitEnemy(e,b*1.5,0,-2);flash(e.x,e.y,10+Math.min(30,b*.2),[150,255,170],5);word(e.x,e.y-e.def.h/2-8,''+Math.round(b*1.5),'#9dffb0',.8);}}
     screenFlash([255,255,255],.3);snd('boom',p.x,p.y,{v:.9});return false;});}},
];

// ================= ANT-MAN =================
const ANT=[
 // a red Pym disc: whatever it hits shrinks to half size for eight seconds, cannot fight, and takes triple damage
 {n:'Shrink Disc',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;snd('throw',a.h.x,a.h.y,{pitch:1.4});
   bolt(a.h.x,a.h.y,a.dx*6.5,a.dy*6.5,80,(x,y)=>spawn(x,y,0,0,rgb(255,80,70),6,0,1,0,1),(e)=>{hitEnemy(e,8,0,0);if(!e.def.titan&&!e.def.title){ov(e).tiny=480;e.sc=.5;word(e.x,e.y-12,'TINY!','#ff8070');}snd('pop',e.x,e.y,{pitch:1.6});});}},
];

// ================= JUGGERNAUT =================
const JUGG=[
 // the punch carries all of his momentum: the faster he is moving, the bigger it lands
 {n:'Haymaker',fn:(a,p,use)=>{if(!use(5))return;ST.cd=16;p.punchF=10;const sp=Math.min(6,Math.hypot(p.vx,p.vy)),x=a.h.x+a.dx*8,y=a.h.y+a.dy*8;
   explode(x|0,y|0,9+sp*1.4|0,{self:true,col:[214,184,130],word:sp>3?'MOMENTUM!':'HAYMAKER!'});damageEnemies(x,y,14+sp*2,24+sp*9,a.dx*(5+sp),a.dy*(5+sp)-2);if(sp>3)ST.hitstop=Math.max(ST.hitstop,3);}},
 // nothing moves the Juggernaut: he plants his feet, takes a tenth of all damage, and everything that runs into him bounces off
 {n:'Immovable',fn:(a,p,use)=>{if(p.immov>0||!use(22))return;ST.cd=70;p.immov=240;word(p.x,p.y-ST.PH-10,'I\'M THE JUGGERNAUT!','#ff7a4a');snd('slam',p.x,p.y,{pitch:.6});quake(p.x,p.y,{r:14,col:[214,184,130]});
   ACT.push(()=>{if(--p.immov<=0||ST.CH.id!=='juggernaut'){p.immov=0;return false;}p.vx*=.2;const cx=p.x,cy=p.y-ST.PH/2;
     for(const e of enemies){if(e.def.titan||!live(e))continue;const dx=e.x-cx,dy=e.y-cy;if(Math.abs(dx)<ST.PW/2+e.def.w/2+3&&Math.abs(dy)<ST.PH/2+e.def.h/2){e.vx=(Math.sign(dx)||p.face)*7;e.vy=-3;e.thrownT=20;hitEnemy(e,14,0,0);snd('clang',e.x,e.y,{v:.5});}}
     for(const b of bodies){if(b.held)continue;const dx=b.x-cx,dy=b.y-cy;if(Math.abs(dx)<b.rmax+6&&Math.abs(dy)<b.rmax+ST.PH/2&&dx*b.vx<0){b.vx=-b.vx*1.3;b.vy=-Math.abs(b.vy)-1;}}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.abs(s.x-cx)<8&&Math.abs(s.y-cy)<ST.PH/2+3){shots.splice(n,1);spawn(s.x,s.y,0,-1,rgb(255,120,90),10,0,1,0,1);}}
     if(ST.frame%4===0)spawn(cx+(R()-.5)*ST.PW*1.6,cy+(R()-.5)*ST.PH,0,-.5,rgb(220,60,40),14,0,1,0,1);return true;});}},
 // he tears out a girder and swings it like a bat: a wide arc that sends everything it touches flying into everything else
 {n:'Girder Bat',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;const f=a.dx<0?-1:1,base=Math.atan2(a.dy,a.dx);let k=0;const hit=new Set();p.face=f;snd('whoosh',p.x,p.y,{pitch:.6});
   ACT.push(()=>{k++;const an=base-1.2*f+k/10*2.4*f,cx=p.x,cy=p.y-ST.PH/2,L=46,tx=cx+Math.cos(an)*L,ty=cy+Math.sin(an)*L;
     beams.push({x0:cx,y0:cy,x1:tx,y1:ty,life:2,w:2,c:[180,184,194],g:[90,90,104]});carve(tx,ty,4,Math.cos(an+f*1.57)*4,Math.sin(an+f*1.57)*4);
     for(const e of enemies)if(!hit.has(e)&&live(e)&&segD(e.x,e.y,cx,cy,tx,ty)<e.def.w/2+3){hit.add(e);hitEnemy(e,30,f*9,-5);if(!e.def.titan)e.thrownT=40;snd('clang',e.x,e.y,{pitch:.8});}
     return k<10;});}},
 // the Crimson Gem flares: every enemy near him is dragged in and smashes against him as if into a wall
 {n:'Gem of Cyttorak',fn:(a,p,use)=>{const list=nearestN(p.x,p.y-ST.PH/2,150,8).filter(e=>!e.def.titan);if(!list.length){noTarget('#ff5040');return;}if(!use(24))return;ST.cd=55;let k=0;ring(p.x,p.y-ST.PH/2,40,[255,60,40],14,-2.5);snd('charge',p.x,p.y,{pitch:.5});
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2;for(let i=list.length-1;i>=0;i--){const e=list[i];if(!live(e)){list.splice(i,1);continue;}const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;e.vx+=dx/d*1.1;e.vy+=dy/d*1.1-.2;
     if(k%2===0)beams.push({x0:cx,y0:cy,x1:e.x,y1:e.y,life:2,w:0,c:[255,140,120],g:[200,30,20]});
     if(d<ST.PW/2+e.def.w/2+4){hitEnemy(e,30,-dx/d*8,-4);e.thrownT=25;flash(e.x,e.y,12,[255,90,60],4);snd('punch',e.x,e.y,{v:.7});list.splice(i,1);}}
     return list.length&&k<60;});}},
 // the ultimate: both fists into the ground. The earth around him caves into a crater and every enemy near him goes down with it
 {n:'Juggernaut Smash',fn:(a,p,use)=>{if(!use(32))return;ST.cd=80;p.throwF=10;const cx=p.x|0,cy=p.y+2|0,r=Math.round(36*(ST.aoeC||1));word(cx,cy-ST.PH-16,'KRA-KOOM!','#ff7a4a',1.5);ST.hitstop=Math.max(ST.hitstop,6);
   for(let y=-6;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y*1.6>r*r)continue;const X=cx+x,Y=cy+y;if(X<1||X>=W-1||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(KIND[m]===S&&m!==OBSID&&R()<.85)setc(i,RUBBLE);}
   explode(cx,cy-2,14,{self:true,col:[214,184,130]});quake(cx,cy,{r:40,col:[214,184,130]});shockFx(cx,cy,1.4);
   for(const e of enemies){if(!live(e)||Math.hypot(e.x-cx,e.y-cy)>110)continue;hitEnemy(e,e.def.titan?50:60,0,6);if(!e.def.titan)e.frozen=Math.max(e.frozen||0,90);}
   snd('boom',cx,cy,{v:1,size:2});}},
];

// ================= ULTRON =================
const ULTRON=[
 // hold on one target: the encephalo-ray fills its coma meter; full, it drops asleep for seven seconds. The first hit wakes it for double damage
 {n:'Encephalo Beam',kind:'hold',fn:(a,p,use)=>{const e=atCursor(70);if(!e||Math.hypot(e.x-p.x,e.y-p.y)>300){if(ST.frame%30===0)noTarget('#ff6060');return;}if(!use(.7))return;const o=eyes();
   beams.push({x0:o.x,y0:o.y,x1:e.x,y1:e.y,life:2,w:1+((ST.frame>>1)&1),c:[255,210,200],g:[255,30,30]});if(e.ov&&e.ov.sleep>0)return; // the ray keeps it under; no damage to wake it
   if(ST.frame%6===0)hitEnemy(e,1.5,0,0);
   if(e.def.titan)return;e.mem.coma=(e.mem.coma||0)+1.4;if(ST.frame%8===0)spawn(e.x,e.y-e.def.h/2,(R()-.5),-.6,rgb(255,120,110),14,0,1,0,1);
   if(e.mem.coma>=100){e.mem.coma=0;ov(e).sleep=420;word(e.x,e.y-e.def.h/2-8,'COMA','#b8c8ff');snd('psi',e.x,e.y,{pitch:.5});}}},
 // a concussion ring that widens as it flies, battering everything its rim passes over
 {n:'Concussion Blast',fn:(a,p,use)=>{if(!use(7))return;ST.cd=14;let x=a.h.x,y=a.h.y,k=0;const vx=a.dx*4,vy=a.dy*4,hit=new Set();snd('wave',x,y,{pitch:1.3,v:.6});
   ACT.push(()=>{k++;x+=vx;y+=vy;const r=3+k*.5;ring(x,y,r,[255,90,70],2);for(const e of enemies){if(hit.has(e)||!live(e))continue;const d=Math.hypot(e.x-x,e.y-y);if(Math.abs(d-r)<e.def.w/2+3){hit.add(e);hitEnemy(e,14,(e.x-x)/(d||1)*5,(e.y-y)/(d||1)*5-1);}}
     if(k%3===0)carve(x+a.dy*r,y-a.dx*r,2,0,0),carve(x-a.dy*r,y+a.dx*r,2,0,0);return k<46;});}},
 // he strips steel, concrete and rubble around him to rebuild himself: health back, and three seconds of extra plating per 40 pieces
 {n:'Self-Upgrade',fn:(a,p,use)=>{if(!use(18))return;ST.cd=60;const cx=p.x|0,cy=p.y-ST.PH/2|0,r=60;let n=0;
   for(let k=0;k<5000&&n<240;k++){const X=cx+(R()-.5)*r*2|0,Y=cy+(R()-.5)*r*2|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(m!==STEEL&&m!==RUBBLE&&m!==CONC)continue;setc(i,EMPTY);n++;
     if(n%2===0)spawn(X,Y,(cx-X)*.06,(cy-Y)*.06,m===STEEL?rgb(170,176,190):rgb(150,140,130),18,0,0,0);}
   if(!n){noTarget('#ff6060','NO SCRAP NEAR');p.en+=18;ST.cd=0;return;}p.hp=Math.min(ST.CH.hp,p.hp+n*.25);p.plate=Math.max(p.plate||0,n/40*180|0);
   word(p.x,p.y-ST.PH-10,'UPGRADED +'+(n*.25|0),'#ff8a7a');ring(cx,cy,30,[255,90,70],14,-2);snd('clang',cx,cy,{pitch:.7});
   ACT.push(()=>{if(!(p.plate>0)||ST.CH.id!=='ultron'){p.plate=0;return false;}p.plate--;if(ST.frame%6===0)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,0,-.3,rgb(190,196,210),10,0,1,0,1);return true;});}},
];

// ================= MAGNETO =================
const MAGNETO=[
 // a magnetic bolt: whatever it hits is magnetized for five seconds, and magnetized enemies are hauled into one another
 {n:'Magnetic Bolts',fn:(a,p,use)=>{if(!use(6))return;ST.cd=12;snd('zap',a.h.x,a.h.y,{pitch:.8,v:.5});
   bolt(a.h.x,a.h.y,a.dx*6.5,a.dy*6.5,80,(x,y)=>spawn(x,y,(R()-.5)*.5,(R()-.5)*.5,R()<.5?rgb(210,140,255):rgb(150,70,230),8,0,1,0,1),(e)=>{hitEnemy(e,9,0,0);if(!e.def.titan){ov(e).mag=300;word(e.x,e.y-e.def.h/2-6,'MAGNETIZED','#d28cff',.7);}});}},
];

// ================= VENOM =================
const VENOM=[
 // a spore of the Klyntar hive: the infected enemy rots, feeds Venom, and every half second passes the symbiote on to a neighbour
 {n:'Klyntar Contagion',fn:(a,p,use)=>{if(!use(14))return;ST.cd=36;snd('splash',a.h.x,a.h.y,{pitch:.6});
   bolt(a.h.x,a.h.y,a.dx*6,a.dy*6,70,(x,y)=>spawn(x,y,(R()-.5)*.4,.2,rgb(30,30,44),10,0,0,1),(e)=>{hitEnemy(e,6,0,0);ov(e).goo=360;word(e.x,e.y-e.def.h/2-6,'INFECTED','#9a9ab0',.7);});}},
 // the symbiote reshapes his arm: each cast cycles axe (a cleaving arc), mace (a blast that pops foes up) and shield (60% less damage for 4 s)
 {n:'Morph Weapons',fn:(a,p,use)=>{if(!use(12))return;ST.cd=22;const m=p.vmorph=((p.vmorph??-1)+1)%3,h=a.h;
   if(m===0){word(p.x,p.y-ST.PH-8,'AXE','#c0c0d8',.8);for(const o of [-.5,0,.5]){const an=Math.atan2(a.dy,a.dx)+o;sliceLine(h.x,h.y,h.x+Math.cos(an)*40,h.y+Math.sin(an)*40,{edge:[60,60,80],w:1,push:1.2,quiet:o!==0});}damageEnemies(h.x+a.dx*20,h.y+a.dy*20,24,34,a.dx*5,a.dy*5-1);snd('slash',h.x,h.y,{pitch:.7});}
   else if(m===1){word(p.x,p.y-ST.PH-8,'MACE','#c0c0d8',.8);const x=h.x+a.dx*14,y=h.y+a.dy*14;explode(x|0,y|0,12,{self:true,col:[40,40,56]});damageEnemies(x,y,22,28,a.dx*3,-8);snd('punch',x,y,{pitch:.6});}
   else{word(p.x,p.y-ST.PH-8,'SHIELD','#c0c0d8',.8);p.vshield=240;snd('clang',p.x,p.y,{pitch:.5});ACT.push(()=>{if(!(p.vshield>0)||ST.CH.id!=='venom'){p.vshield=0;return false;}p.vshield--;const fx=p.x+p.face*7,fy=p.y-ST.PH/2;
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.abs(s.x-fx)<6&&Math.abs(s.y-fy)<ST.PH/2+2){shots.splice(n,1);spawn(s.x,s.y,0,-1,rgb(60,60,80),10,0,0,1);}}
     if(ST.frame%3===0)for(let y=-ST.PH/2;y<ST.PH/2;y+=3)pix(fx,fy+y,rgb(30,30,44),0);return true;});}}},
 // a glob of symbiote goo: it spreads into a puddle that bogs down anything in it (slow, grounded, chewed) for eight seconds
 {n:'Goo Trap',fn:(a,p,use)=>{if(!use(16))return;ST.cd=45;let x=a.h.x,y=a.h.y,vx=a.dx*5,vy=a.dy*5-1.5,k=0;snd('throw',x,y,{pitch:.7});
   ACT.push(()=>{k++;vy+=.2;x+=vx;y+=vy;spawn(x,y,0,0,rgb(20,20,30),6,0,0,0);if(!solid(x,y+2)&&k<120)return true;
     const cx=x,gy=groundBelow(x|0,y-6),w=34*(ST.aoeC||1);let j=0;snd('splash',cx,gy,{pitch:.5});
     ACT.push(()=>{j++;if(j%2===0)for(let q=0;q<3;q++)spawn(cx+(R()-.5)*w*2,gy-1,(R()-.5)*.2,-R()*.4,R()<.5?rgb(20,20,32):rgb(46,46,64),20,0,0,0);
       for(const e of enemies){if(e.def.titan||!live(e))continue;if(Math.abs(e.x-cx)<w&&Math.abs(e.y+e.def.h/2-gy)<10){e.vx*=.5;e.vy=Math.max(e.vy,.6);if(j%20===0)hitEnemy(e,3,0,0);}}
       return j<480;});return false;});}},
 // tendrils seize the nearest foe from both sides and tear: huge damage, and a kill feeds him
 {n:'Tear Apart',fn:(a,p,use)=>{const e=nearestEnemy(p.x+p.face*10,p.y-ST.PH/2,50);if(!e){noTarget('#9a9ab0');return;}if(!use(22))return;ST.cd=50;let k=0;snd('roar',p.x,p.y,{pitch:.8});
   ACT.push(()=>{k++;if(!live(e))return false;if(!e.def.titan){ov(e).held=2;e.vx=e.vy=0;}const cx=p.x,cy=p.y-ST.PH/2,w=e.def.w/2+4+k*.3;
     beams.push({pts:[[cx,cy],[e.x-w,e.y-6],[e.x-w,e.y]],life:2,c:[60,60,80],g:[10,10,20]},{pts:[[cx,cy],[e.x+w,e.y-6],[e.x+w,e.y]],life:2,c:[60,60,80],g:[10,10,20]});
     if(k<30){if(k%6===0)hitEnemy(e,3,0,0);return true;}
     hitEnemy(e,e.def.titan?30:70,0,-3);for(let j=0;j<20;j++)spawn(e.x,e.y,(R()-.5)*4,(R()-.5)*4-1,R()<.5?rgb(30,30,44):rgb(220,220,235),24,0,0,1);
     if(e.hp<=0)p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.15);snd('rip',e.x,e.y,{v:.9});ST.hitstop=Math.max(ST.hitstop,4);return false;});}},
];

// ================= MISTER FANTASTIC =================
const REED=[
 // he wraps around up to four enemies near the cursor, cinches them into one bundle, and pile-drives it into the ground
 {n:'Elastic Wrap',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,90,4).filter(e=>!e.def.titan);if(!list.length){noTarget('#8fc0ff');return;}if(!use(24))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy;let k=0;snd('rip',cx,cy,{pitch:1.5});
   ACT.push(()=>{k++;const al=list.filter(live);if(!al.length)return false;const h=hand();
     for(const e of al){ov(e).held=2;e.x+=(cx-e.x)*.15;e.y+=(cy-e.y)*.15;e.vx=e.vy=0;beams.push({x0:h.x,y0:h.y,x1:e.x,y1:e.y,life:2,w:1,c:[120,170,230],g:[40,80,160]});}
     if(k<40)return true;const g=groundBelow(cx|0,cy);for(const e of al){e.y=Math.min(e.y+30,g-e.def.h/2);hitEnemy(e,18+al.length*10,0,6);}
     explode(cx|0,g|0,10,{self:true,col:[120,170,230],word:al.length>2?'BUNDLED!':undefined});snd('slam',cx,g,{v:.8});return false;});}},
 // he inflates into a balloon: 70% less damage, a slow float, and anything that touches him bounces off
 {n:'Inflate',fn:(a,p,use)=>{if(p.balloon>0||!use(20))return;ST.cd=60;p.balloon=300;p.sizeT=1.6;snd('whoosh',p.x,p.y,{pitch:.5});
   ACT.push(()=>{if(--p.balloon<=0||ST.CH.id!=='reed'){p.balloon=0;if(ST.CH.id==='reed')p.sizeT=1;return false;}if(p.vy>.8)p.vy=.8;const cx=p.x,cy=p.y-ST.PH/2;
     for(const e of enemies){if(e.def.titan||!live(e))continue;const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<ST.PH*.8+e.def.w/2){e.vx=dx/d*6;e.vy=dy/d*4-2;if(ST.frame-(e.mem.balT||-99)>20){e.mem.balT=ST.frame;hitEnemy(e,6,0,0);snd('pop',e.x,e.y,{pitch:.6,v:.5});}}}
     return true;});}},
 // he flattens into a parachute: falling slows to a drift and the cursor steers him
 {n:'Parachute',fn:(a,p,use)=>{if(p.chute>0||!use(8))return;ST.cd=20;p.chute=360;if(p.ground){p.vy=-4;p.ground=false;}
   ACT.push(()=>{if(--p.chute<=0||p.ground&&p.chute<340||ST.CH.id!=='reed'){p.chute=0;return false;}if(p.vy>.6)p.vy=.6;p.vx+=(Math.sign(mouse.wx-p.x)*2.4-p.vx)*.05;
     const c=rgb(90,140,220);for(let x=-10;x<=10;x++)pix(p.x+x,p.y-ST.PH-4+Math.abs(x)*Math.abs(x)/25,c,0);return true;});}},
];

// ================= INVISIBLE WOMAN =================
const SUE=[
 // an invisible wedge: it barely scratches, but the enemy it hits is shoved hard, and a wall at the end of the shove SPLATS it
 {n:'Force Blast',fn:(a,p,use)=>{if(!use(6))return;ST.cd=12;snd('wave',a.h.x,a.h.y,{pitch:1.6,v:.5});
   bolt(a.h.x,a.h.y,a.dx*9,a.dy*9,40,(x,y)=>{if(R()<.5)spawn(x,y,0,0,rgb(200,230,255),4,0,1,0,1);},(e)=>{hitEnemy(e,6,0,0);if(e.def.titan)return;e.vx=a.dx*9;e.vy=a.dy*9-1.5;let k=0;
     ACT.push(()=>{k++;if(!live(e))return false;const sp=Math.hypot(e.vx,e.vy);if(k>1&&(e.mem.blocked===e.t||e.ground&&e.vy===0&&k>3)&&sp+Math.abs(e.mem.lastSp||0)>2){hitEnemy(e,30+(e.mem.lastSp||sp)*5,0,0);explode(e.x|0,e.y|0,6,{self:true,quiet:true,col:[170,215,255]});word(e.x,e.y-e.def.h/2-8,'SPLAT!','#a8d4ff',.8);snd('slam',e.x,e.y,{v:.7});return false;}
       e.mem.lastSp=sp;return k<40;});},(x,y)=>carve(x,y,3,a.dx*4,a.dy*4));}},
 // she turns invisible: enemies lose her for seven seconds
 {n:'Invisibility',fn:(a,p,use)=>{if(p.stealth>0||!use(20))return;ST.cd=60;p.stealth=420;p.lastSeen={x:p.x+(R()-.5)*100,y:p.y-8};word(p.x,p.y-ST.PH-8,'*FWIP*','#cfe6ff',.8);for(let k=0;k<24;k++)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,(R()-.5)*1.5,(R()-.5)*1.5,rgb(200,230,255),14,0,1,0,1);}},
 // a wedge of force driven down at the cursor: it splits the ground and shoves everything to either side apart
 {n:'Force Wedge',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const cx=mouse.wx,cy=mouse.wy,h=70;let k=0;snd('rip',cx,cy,{pitch:1.6});
   ACT.push(()=>{k++;const w=k*.8;sliceLine(cx-w*.2,cy-h/2,cx-w*.2,cy+h/2,{edge:[170,215,255],w:0,push:1,quiet:true});sliceLine(cx+w*.2,cy-h/2,cx+w*.2,cy+h/2,{edge:[170,215,255],w:0,push:1,quiet:true});
     for(const e of enemies){if(e.def.titan||!live(e))continue;if(Math.abs(e.y-cy)<h/2&&Math.abs(e.x-cx)<w+30){const s=Math.sign(e.x-cx)||1;e.vx+=s*1.3;if(k%10===0)hitEnemy(e,5,0,0);}}
     for(const b of bodies)if(Math.abs(b.y-cy)<h/2&&Math.abs(b.x-cx)<w+40){b.vx+=(Math.sign(b.x-cx)||1)*.5;b.rest=0;}
     beams.push({x0:cx,y0:cy-h/2,x1:cx-w,y1:cy+h/2,life:2,w:0,c:[200,230,255],g:[110,170,230]},{x0:cx,y0:cy-h/2,x1:cx+w,y1:cy+h/2,life:2,w:0,c:[200,230,255],g:[110,170,230]});
     return k<30;});}},
 // an invisible piston: a plate of force forms over the cursor and slams straight down on whatever is under it
 {n:'Force Piston',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;const cx=mouse.wx,g=groundBelow(mouse.wx|0,mouse.wy),w=26*(ST.aoeC||1);let k=0,y=g-80;
   ACT.push(()=>{k++;if(k<16){beams.push({x0:cx-w,y0:y,x1:cx+w,y1:y,life:2,w:1,c:[220,240,255],g:[110,170,230]});return true;}y+=12;beams.push({x0:cx-w,y0:y,x1:cx+w,y1:y,life:2,w:2,c:[230,245,255],g:[130,190,255]});
     if(y<g)return true;for(const e of enemies)if(live(e)&&Math.abs(e.x-cx)<w+e.def.w/2&&e.y<g+4&&e.y>g-90){hitEnemy(e,45,0,8);applyStatus(e,'stun',40);}
     for(let x=-w;x<=w;x+=3)crackCell(cx+x|0,g+1,0);quake(cx,g,{r:12,col:[170,215,255]});snd('slam',cx,g,{v:.9});return false;});}},
 // she bends the light into a blinding flare: enemies near her lose track of her and fight empty air for five seconds
 {n:'Refraction Flash',fn:(a,p,use)=>{if(!use(22))return;ST.cd=60;const cx=p.x,cy=p.y-ST.PH/2;let n=0;flash(cx,cy,70,[255,255,240],10);screenFlash([255,255,245],.25);snd('glass',cx,cy,{pitch:1.6});
   for(const e of enemies){if(e.def.titan||!live(e)||Math.hypot(e.x-cx,e.y-cy)>140)continue;ov(e).blind=300;n++;}if(n)word(cx,cy-ST.PH,'BLINDED x'+n,'#fff6c8',.8);}},
];

// ================= HUMAN TORCH =================
const TORCH=[
 // he turns his heat outward: incoming shots melt before they reach him, and anything touching him catches
 {n:'Heat Shield',fn:(a,p,use)=>{if(p.hshield>0||!use(20))return;ST.cd=60;p.hshield=300;snd('fireburst',p.x,p.y,{v:.6});
   ACT.push(()=>{if(--p.hshield<=0||ST.CH.id!=='torch'){p.hshield=0;return false;}const cx=p.x,cy=p.y-ST.PH/2;
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<30){shots.splice(n,1);for(let k=0;k<4;k++)spawn(s.x,s.y,(R()-.5),-R()-.3,rgb(230,236,244),20,0,0,0,1);}}
     if(ST.frame%10===0)tagged('fire',()=>damageEnemies(cx,cy,18,3,0,0,true));if(ST.frame%2===0){const an=R()*6.283;spawn(cx+Math.cos(an)*24,cy+Math.sin(an)*24,0,-.4,R()<.5?rgb(255,200,80):rgb(255,110,30),10,0,1,0,1);}return true;});}},
 // he burns all the air at the cursor: fires go out and enemies suffocate (no attacks, slow damage), then the vacuum collapses into a fireball
 {n:'Oxygen Burn',fn:(a,p,use)=>{if(!use(26))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy,r=56*(ST.aoeC||1);let k=0;snd('fireburst',cx,cy,{pitch:.5});
   ACT.push(()=>{k++;if(k<150){if(k%4===0)ring(cx,cy,r,[255,150,60],4);for(const e of enemies){if(!live(e)||Math.hypot(e.x-cx,e.y-cy)>r)continue;if(!e.def.titan)ov(e).depow=Math.max(ov(e).depow||0,6);if(k%10===0)hitEnemy(e,2,0,0);}
       if(k%3===0)for(let j=0;j<3;j++){const an=R()*6.283,d=r*(.6+R()*.4);spawn(cx+Math.cos(an)*d,cy+Math.sin(an)*d,-Math.cos(an)*.8,-Math.sin(an)*.8,rgb(255,190,110),12,0,1,0,1);}return true;}
     for(const e of enemies){if(e.def.titan||!live(e))continue;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;if(d<r*1.5){e.vx+=dx/d*3;e.vy+=dy/d*3;}}
     explode(cx|0,cy|0,16,{self:true,fire:.7,col:[255,140,40],word:'WHOOMPH!'});tagged('fire',()=>damageEnemies(cx,cy,r,40,0,-3,true));return false;});}},
];

// ================= THE THING =================
const THING=[
 // a stomp that opens the ground under the four nearest enemies: they drop into the pit and the walls cave in on them
 {n:'Sinkhole Stomp',fn:(a,p,use)=>{if(!p.ground){return;}const list=nearestN(p.x,p.y,140,4).filter(e=>!e.def.titan&&!e.def.fly);if(!list.length){noTarget('#ffa060');return;}if(!use(24))return;ST.cd=50;p.throwF=10;quake(p.x,p.y,{r:16,col:[218,118,50]});snd('stomp',p.x,p.y);
   for(const e of list){const X0=e.x|0,Y0=e.y+e.def.h/2|0;for(let y=0;y<16;y++)for(let x=-8;x<=8;x++){const X=X0+x,Y=Y0+y;if(X<1||X>=W-1||Y<0||Y>=H-44)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID)setc(i,y<4?RUBBLE:EMPTY);}
     e.vy=4;e.frozen=Math.max(e.frozen||0,90);hitEnemy(e,25,0,4);}word(p.x,p.y-ST.PH-8,'WHAT A REVOLTIN\' DEVELOPMENT','#ffa060',.7);}},
 // hold to wind up, release to throw it: the longer the wind-up, the bigger the punch
 {n:'Wind-Up Haymaker',fn:(a,p,use)=>{if(p.wind>0)return;if(!use(12))return;p.wind=1;snd('charge',p.x,p.y,{pitch:.7,v:.5});
   ACT.push(()=>{if(ST.CH.id!=='thing'){p.wind=0;return false;}if(held('Wind-Up Haymaker')&&p.wind<100){p.wind=Math.min(100,p.wind+1.6);p.vx*=.8;if(ST.frame%4===0)spawn(p.x+p.face*6,p.y-ST.PH/2,(R()-.5),-R(),rgb(255,180,90),10,0,1,0,1);return true;}
     const w=p.wind,A=aimNow(),x=A.h.x+A.dx*9,y=A.h.y+A.dy*9;p.wind=0;ST.cd=24;p.punchF=10;explode(x|0,y|0,8+w*.12|0,{self:true,col:[218,118,50],word:w>95?'KLOBBER-POW!':'POW!'});damageEnemies(x,y,14+w*.15,20+w*1.1,A.dx*(4+w*.07),A.dy*(4+w*.07)-2);if(w>60)ST.hitstop=Math.max(ST.hitstop,4);return false;});}},
 // the ultimate: every point of damage he took in the last eight seconds goes into one colossal clobber that flattens the street
 {n:"It's Clobberin' Time!",fn:(a,p,use)=>{if(!use(45))return;ST.cd=110;let tot=0;const L=p.took||[];for(let i=1;i<L.length;i+=2)tot+=L[i];p.took=[];const dir=p.face,x=p.x+dir*12,y=p.y-ST.PH/2;p.punchF=10;
   word(p.x,p.y-ST.PH-16,"IT'S CLOBBERIN' TIME!",'#ffa060',1.3);explode(x|0,y|0,14+Math.min(14,tot*.1)|0,{self:true,col:[218,118,50]});damageEnemies(x,y,30,60+tot*3,dir*10,-5);ST.hitstop=Math.max(ST.hitstop,8);shockFx(x,y,1.5);
   for(const e of enemies)if(live(e)&&Math.abs(e.x-p.x)<220&&Math.abs(e.y-p.y)<30)hitEnemy(e,(60+tot*3)*.4,Math.sign(e.x-p.x)*5,-5);quake(p.x,p.y,{r:44,col:[218,118,50]});snd('boom',x,y,{v:1});}},
];
const aimNow=()=>{const h=hand(),dx=mouse.wx-h.x,dy=mouse.wy-h.y,d=Math.hypot(dx,dy)||1;return{h,dx:dx/d,dy:dy/d};};

// ================= BLACK PANTHER =================
const PANTHER=[
 // the heart-shaped herb: for six seconds the first strike on each enemy finds its weak point (triple damage and a stun)
 {n:'Heart-Shaped Herb',fn:(a,p,use)=>{if(p.herb>0||!use(20))return;ST.cd=70;p.herb=360;p.herbId=ST.frame;word(p.x,p.y-ST.PH-8,'WAKANDA FOREVER','#c89bff');snd('psi',p.x,p.y,{pitch:.9,v:.5});
   ACT.push(()=>{if(--p.herb<=0||ST.CH.id!=='panther'){p.herb=0;return false;}if(ST.frame%5===0)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,0,-.5,rgb(190,130,255),12,0,1,0,1);return true;});}},
 // ritual combat: a challenge ring closes round him and one foe. Others are thrown out, the challenger cannot leave, he takes half damage and deals 50% more; winning heals 25%
 {n:'Ritual Combat',fn:(a,p,use)=>{const e=atCursor(70);if(!e||e.def.titan||p.duel){noTarget('#c89bff');return;}if(!use(24))return;ST.cd=60;const du=p.duel={e,k:480,x:(p.x+e.x)/2,y:(p.y-ST.PH/2+e.y)/2,r:70};word(du.x,du.y-40,'I ACCEPT YOUR CHALLENGE','#c89bff');snd('roar',p.x,p.y,{pitch:1.2,v:.6});
   ACT.push(()=>{if(ST.CH.id!=='panther'||--du.k<=0||!live(e)){if(!live(e)&&du.k>0&&ST.CH.id==='panther'){p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.25);word(p.x,p.y-ST.PH-8,'VICTORY','#c89bff');}p.duel=null;return false;}
     for(const o of enemies){if(o===e||!live(o)||o.def.titan)continue;const dx=o.x-du.x,dy=(o.y-du.y)/.6,d=Math.hypot(dx,dy)||1;if(d<du.r+6){o.vx+=dx/d*1.5;o.vy+=dy/d*.8;}}
     {const dx=e.x-du.x,dy=(e.y-du.y)/.6,d=Math.hypot(dx,dy)||1;if(d>du.r-6){e.vx-=dx/d*1.5;e.vy-=dy/d*.8;}}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&s.src!==e&&Math.hypot(s.x-du.x,(s.y-du.y)/.6)<du.r)shots.splice(n,1);}return true;});}},
 // the ultimate: Bast's claws. For five seconds a giant three-line claw mark rips across the nearest enemy every fifth of a second
 {n:"Bast's Wrath",fn:(a,p,use)=>{if(!use(60))return;ST.cd=180;let k=0;ST.hitstop=Math.max(ST.hitstop,6);screenFlash([170,110,255],.3);word(p.x,p.y-ST.PH-14,"BAST'S WRATH",'#c89bff',1.4);snd('roar',p.x,p.y,{pitch:.7,v:1});
   ACT.push(()=>{k++;if(k%12===0){const e=nearestN(p.x,p.y,240,1)[0],cx=e?e.x:mouse.wx,cy=e?e.y:mouse.wy,an=-.9+(R()-.5)*.5,L=70,ux=Math.cos(an),uy=Math.sin(an),nx=-uy,ny=ux;
       for(const o of [-8,0,8])sliceLine(cx-ux*L/2+nx*o,cy-uy*L/2+ny*o,cx+ux*L/2+nx*o,cy+uy*L/2+ny*o,{edge:[200,140,255],w:1,push:1.6,quiet:o!==0});
       for(const o of enemies)if(live(o)&&segD(o.x,o.y,cx-ux*L/2,cy-uy*L/2,cx+ux*L/2,cy+uy*L/2)<o.def.w/2+10)hitEnemy(o,30,ux*4,uy*4-2);flash(cx,cy,30,[190,130,255],6);snd('slash',cx,cy,{pitch:.5,v:.9});}
     return k<300;});}},
];

export const EXTRA4A={doom:DOOM,hulk:HULK,thor:THOR,iron:IRON,wolverine:WOLV,spidey:SPIDEY,wanda:WANDA,strange:STRANGE,antman:ANT,juggernaut:JUGG,ultron:ULTRON,magneto:MAGNETO,venom:VENOM,reed:REED,sue:SUE,torch:TORCH,thing:THING,panther:PANTHER};
export { bolt, ring, word, live, onScreen, spiderSense, held, aimNow };
