// Kit expansion, part A (2026-10-23): the eight newest heroes had ten powers each, most of them variations on
// one trick (Nightcrawler: four teleports and two sabre cuts). Each gets four more that do something the kit
// couldn't: swap places, ride enemies' heads, sit a throne, pin a foe to a wall, collapse matter into a ball.
// applyKits3() in kits3b.js puts them on the bar before the ultimate.
import { ST } from '../state.js';
import { EMPTY, GLASS, KIND, LEAF, OBSID, R, S, STONE, WEB, WOOD, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { bodies, pin, q } from '../world/support.js';
import { finishBody, makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { quake, scriptMove, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { nearestN, tagged } from './kits2a.js';
import { TK } from '../render/titan.js';
import { pix } from '../render/canvas.js';
import { DRAG, K, fxEclipse, fxFlare, fxGlitch, fxSigil, pk, vp } from '../render/vfxcore.js';
import { ML, NG, NGE, RC, crescent, necroShot } from './wave5.js';
import { KC, VC, bamf, card, charge, kpuff, venomZap } from './wave6.js';

// ---- shared helpers (kits3b.js uses them too)
export const atCursor=(r=60)=>nearestEnemy(mouse.wx,mouse.wy,r);
export const noTarget=(c,w='NO TARGET')=>fxWord(mouse.wx,mouse.wy,w,.7,c,true);
export const segD=(px,py,x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,l=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((px-x0)*dx+(py-y0)*dy)/l));return Math.hypot(px-x0-dx*u,py-y0-dy*u);};
export const boxE=(x,y,m=3)=>enemies.find(e=>e.hp>0&&Math.abs(e.x-x)<e.def.w/2+m&&Math.abs(e.y-y)<e.def.h/2+m);
// a dropped or thrown body: hits each enemy it touches once, and thumps the ground where it lands
export function bodyImpact(b,dmg,c){const hit=new Set();let k=0,fell=0;ACT.push(()=>{k++;const gone=!bodies.includes(b);if(!gone){if(b.vy>2)fell++;for(const e of enemies)if(!hit.has(e)&&Math.hypot(e.x-b.x,e.y-b.y)<b.rmax+e.def.w/2+2){hit.add(e);hitEnemy(e,dmg,b.vx*.5,b.vy*.4);}}
  if(gone||fell>4&&Math.abs(b.vy)<.6||k>200){if(fell>4||gone){damageEnemies(b.x,b.y,(b.rmax||8)+10,dmg*.5,0,-3,true);ST.shake=Math.max(ST.shake,8);flash(b.x,b.y,20,c,4);}return false;}return true;});}
export const lineP=(x0,y0,x1,y1,c,g)=>{const n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);for(let k=0;k<=n;k++)pix(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c,g);};
// a solid chunk near (x, y) as a list in q[0..n): only solid cells, never bedrock
export function chunkAt(x,y,r){const n0=solidCells(x,y,r,false);let n=0;for(let j=0;j<n0;j++){const m=t[q[j]];if(KIND[m]===S&&m!==OBSID)q[n++]=q[j];}return n;}
// a little figure for summoned allies (the Black Order): legs, body, head, one arm
function drawFig(s,B,A){const x=s.x,y=s.y,f=s.face,o={},st=s.mv?Math.sin(s.t*.4)*3:0;TK.begin();TK.cap(x-2,y-9,x-2-st,y,1.7,1.3,B,o);TK.cap(x+2,y-9,x+2+st,y,1.7,1.3,B,o);TK.ell(x,y-14,4.2,6,B,o);TK.ell(x,y-22,2.8,3.2,A,o);TK.cap(x+f*2,y-17,x+f*7,y-13,1.4,1.1,B,o);TK.end();}

// ================= NIGHTCRAWLER =================
const KP=[200,160,255];
const KURT3=[
 // he and the enemy at the cursor trade places; it arrives dazed
 {n:'BAMF Swap',fn:(a,p,use)=>{const e=atCursor(80);if(!e||e.def.titan){noTarget('#c8a0ff');return;}if(!use(14))return;ST.cd=26;
   const px=p.x,py=p.y;bamf(p,e.x,e.y+e.def.h/2);kpuff(px,py-ST.PH/2);e.x=px;e.y=py-e.def.h/2;e.vx=e.vy=0;applyStatus(e,'stun',70);hitEnemy(e,10,0,-1);fxWord(e.x,e.y-e.def.h/2-6,'WAS?!',.8,'#c8a0ff',true);}},
 // a loose chunk (or a piece of the ground beside him) vanishes and reappears over the enemy's head
 {n:'Special Delivery',fn:(a,p,use)=>{const e=atCursor(160);if(!e){noTarget('#c8a0ff');return;}let b=null,bd=90,n=0;for(const o of bodies){const d=Math.hypot(o.x-p.x,o.y-p.y);if(d<bd&&!o.held){bd=d;b=o;}}
   if(!b){n=chunkAt(p.x+p.face*16,p.y+6,9);if(n<14){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO SEND',.7,'#c8a0ff',true);return;}}if(!use(18))return;ST.cd=30;if(!b)b=makeBody(q,n,false);if(!b)return;
   kpuff(b.x,b.y);b.x=e.x;b.y=e.y-e.def.h/2-70;b.vx=0;b.vy=4;b.va=(R()-.5)*.2;b.rest=0;b.thrown=true;kpuff(b.x,b.y);bodyImpact(b,30,KP);fxWord(b.x,b.y-14,'SPECIAL DELIVERY!',.9,'#c8a0ff',true);}},
 // the circus acrobat: flips from head to head, a stomp on each, up to five
 {n:'The Amazing Nightcrawler',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;const hit=new Set();let n=0;fxWord(p.x,p.y-ST.PH-8,'WUNDERBAR!',.9,'#c8a0ff',true);
   const next=()=>{const e=nearestN(p.x,p.y,170,6).find(o=>!hit.has(o)&&!o.def.titan);return {e,x0:p.x,y0:p.y,k:0,N:16,tx:p.x+(a.dx<0?-1:1)*60};};let leg=next();
   ACT.push(()=>{p.script=2;leg.k++;const u=leg.k/leg.N,e=leg.e,tx=e?e.x:leg.tx,ty=e?e.y-e.def.h/2-1:groundBelow(leg.tx|0,leg.y0-30);
     const x=leg.x0+(tx-leg.x0)*u,y=leg.y0+(ty-leg.y0)*u-Math.sin(u*Math.PI)*40;scriptMove(p,x-p.x,y-p.y);p.face=tx>leg.x0?1:-1;if(leg.k%2===0)afters.push({x:p.x,y:p.y,ang:leg.k*.4,face:p.face,life:8,col:KP});
     if(u<1)return true;
     if(e&&e.hp>0){hit.add(e);hitEnemy(e,22,0,3);applyStatus(e,'stun',40);fxWord(e.x,e.y-e.def.h/2-8,'BOING!',.8,'#c8a0ff',true);snd('punch',e.x,e.y,{v:.7,pitch:1.4});if(++n<5){const nl=next();if(nl.e){leg=nl;return true;}}}
     p.vy=-3;p.vx=p.face*2;return false;});}},
 // into Limbo: gone and untouchable for a moment, then back at the cursor in a burst of burning brimstone
 {n:'Limbo Step',fn:(a,p,use)=>{if(!use(20))return;ST.cd=50;kpuff(p.x,p.y-ST.PH/2);p.stealth=50;let k=0;fxWord(p.x,p.y-ST.PH-8,'INTO LIMBO...',.8,'#ff6060',true);
   ACT.push(()=>{k++;p.script=2;p.vx=p.vy=0;p.dodge=Math.max(p.dodge||0,2);if(k%3===0)spawn(p.x+(R()-.5)*12,p.y-R()*ST.PH,(R()-.5)*.6,-.7,R()<.5?rgb(200,40,50):rgb(90,30,70),24,0,1,0,1);if(k<40)return true;
     bamf(p,mouse.wx,mouse.wy+ST.PH/2);p.stealth=0;const cx=p.x,cy=p.y-ST.PH/2;explode(cx|0,cy|0,9,{self:true,fire:.3,col:[220,60,80]});
     tagged('fire',()=>{for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<42){hitEnemy(e,28,(e.x-cx)*.1,-3);applyStatus(e,'burn',240);}});fxWord(cx,cy-24,'BAMF!!',1.2,'#ff6060',true);return false;});}},
];

// ================= GAMBIT =================
const GAMBIT3=[
 // he charges a line of ground ahead: it goes off one stretch after another
 {n:'Domino Effect',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;const dir=a.dx<0?-1:1,pts=[];for(let k=1;k<=10;k++){const x=p.x+dir*k*16;pts.push([x,groundBelow(x|0,p.y-30)]);}let k=0;fxWord(p.x,p.y-ST.PH-8,'DOMINOES, CHER',.9,'#ff9ad8',true);
   ACT.push(()=>{k++;if(k%2===0)for(const [x,y] of pts)if(R()<.4)spawn(x+(R()-.5)*8,y-1,0,-.5,rgb(255,90+R()*80|0,200),8,0,1,0,1);
     if(k>=30&&(k-30)%5===0){const [x,y]=pts[(k-30)/5];explode(x|0,y|0,9,{col:KC,fire:.1});damageEnemies(x,y-6,16,16,dir*3,-5);}return k<30+(pts.length-1)*5;});}},
 // his charm: the enemy at the cursor fights for him for a while
 {n:'Hypnotic Charm',fn:(a,p,use)=>{const e=atCursor(70);if(!e||e.def.titan||e.ally>0){noTarget('#ff9ad8');return;}if(!use(22))return;ST.cd=60;e.ally=420;e.frozen=0;fxWord(e.x,e.y-e.def.h/2-8,'BONJOUR, CHER',.9,'#ff9ad8',true);snd('psi',e.x,e.y,{pitch:1.6});
   for(let k=0;k<10;k++)vp(K.STAR,e.x,e.y-e.def.h/2,(R()-.5)*1.5,-R()*1.5,24,2,0,pk([255,255,255]),pk(KC),DRAG);}},
 // three staff blows, the last one charged: sweep, rising strike, a slam that detonates
 {n:'Charged Bo Staff',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;let k=0;
   ACT.push(()=>{if(k%8===0&&k<=16){const s=k/8,f=p.face,x=p.x+f*18,y=p.y-ST.PH/2;p.punchF=6;snd('whoosh',x,y,{pitch:1.2+s*.2});
       if(s===0){sliceLine(p.x,y+4,x+f*12,y-2,{edge:[255,180,230],quiet:true});damageEnemies(x,y,17,12,f*5,-1);beams.push({x0:p.x,y0:y+2,x1:x+f*12,y1:y-2,life:4,w:0,c:[150,100,60],g:KC});}
       if(s===1){sliceLine(x,y+10,x+f*4,y-18,{edge:[255,180,230],quiet:true});damageEnemies(x,y,17,12,f,-8);beams.push({x0:x,y0:y+10,x1:x+f*4,y1:y-18,life:4,w:0,c:[150,100,60],g:KC});}
       if(s===2){const gy=groundBelow(x|0,y);sliceLine(x-f*4,y-16,x+f*10,gy,{edge:[255,180,230],quiet:true});beams.push({x0:x-f*4,y0:y-16,x1:x+f*10,y1:gy,life:5,w:1,c:[150,100,60],g:KC});charge(x+f*6,gy,10,10,11);damageEnemies(x,gy-6,16,18,f*3,-4);fxWord(x,gy-24,'KA-BOOM!',1,'#ff9ad8',true);}}
     return ++k<18;});}},
 // he cuts the deck: what he draws decides what happens
 {n:'Lady Luck',fn:(a,p,use)=>{if(!use(16))return;ST.cd=36;const r=R(),cx=mouse.wx,cy=mouse.wy;vp(K.CARD,p.x,p.y-ST.PH-6,0,-.5,40,4,4,pk([255,255,255]),pk(KC),DRAG,0,.12);
   if(r<.3){fxWord(cx,cy-24,'ACE OF SPADES!',1.1,'#ff9ad8',true);explode(cx|0,cy|0,18,{col:KC,fire:.1});shockFx(cx,cy,1);}
   else if(r<.55){fxWord(p.x,p.y-ST.PH-14,'KING OF HEARTS',1,'#ff6b8a',true);p.hp=Math.min(ST.CH.hp,p.hp+60);p.en=Math.min(100,p.en+30);for(let k=0;k<12;k++)spawn(p.x+(R()-.5)*14,p.y-R()*ST.PH,0,-.8,rgb(255,90,130),20,0,1,0,1);}
   else if(r<.8){fxWord(p.x,p.y-ST.PH-14,'QUEEN OF DIAMONDS',1,'#ff9ad8',true);for(const e of nearestN(p.x,p.y,180,8)){applyStatus(e,'stun',90);fxWord(e.x,e.y-e.def.h/2-6,'♦',1,'#ff9ad8',true);}}
   else{fxWord(p.x,p.y-ST.PH-14,'JOKER!',1.2,'#c06bff',true);for(let k=0;k<16;k++){const an=k/16*6.283;card(p.x,p.y-ST.PH/2,Math.cos(an)*7,Math.sin(an)*7,6);}}}},
];

// ================= MOON KNIGHT =================
function drawCopter(s){const x=s.x,y=s.y,o={},Wc=rgb(230,232,240),G=rgb(140,146,160),r=Math.cos(s.t*.9)*18;TK.begin();TK.ell(x,y,12,6,Wc,o);TK.cap(x-10,y-1,x-26,y-3,3,1.5,G,o);TK.cap(x-26,y-3,x-27,y-9,1.5,1.5,G,o);TK.cap(x,y-6,x,y-9,1,1,G,o);TK.cap(x-r,y-10,x+r,y-10,1,1,G,o);TK.ell(x+6,y-1,5,3,rgb(120,150,200),o);TK.end();TK.glowDot(x+2,y+6,0,rgb(220,232,255));}
const MOON3=[
 // each use turns the moon a phase: new (unseen), half (crescents all round), full (healing light that blinds)
 {n:'Phases of the Moon',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;const ph=p.mphase=((p.mphase||0)+1)%3,cx=p.x,cy=p.y-ST.PH/2;
   if(ph===1){p.stealth=240;p.lastSeen={x:p.x,y:p.y-8};fxEclipse(cx,cy-22,9,ML,{life:40});fxWord(cx,cy-30,'NEW MOON',.9,'#dce6ff',true);}
   else if(ph===2){for(let k=0;k<8;k++){const an=k/8*6.283;crescent(cx,cy,Math.cos(an)*7,Math.sin(an)*7,false);}fxWord(cx,cy-30,'HALF MOON',.9,'#dce6ff',true);}
   else{p.hp=Math.min(ST.CH.hp,p.hp+50);for(const e of nearestN(cx,cy,120,8))applyStatus(e,'stun',70);flash(cx,cy,90,ML,14);fxFlare(cx,cy-24,20,ML,{life:30});fxWord(cx,cy-30,'FULL MOON',1,'#dce6ff',true);}}},
 // Khonshu weighs the heart: a weakened enemy is found wanting and dies; a strong one is marked and stunned
 {n:'Weighing of the Heart',fn:(a,p,use)=>{const e=atCursor(70);if(!e){noTarget('#dce6ff');return;}if(!use(20))return;ST.cd=50;fxSigil(e.x,e.y,e.def.w/2+12,ML,{kind:'mandala',life:40,spin:.06});
   if(!e.def.titan&&e.hp/e.def.hp<.35){hitEnemy(e,e.hp+60,0,-3);flash(e.x,e.y,30,ML,8);fxWord(e.x,e.y-e.def.h/2-10,'FOUND WANTING.',1,'#dce6ff',true);snd('boom',e.x,e.y,{size:.6});}
   else{applyStatus(e,'mark',480);applyStatus(e,'stun',60);hitEnemy(e,e.def.titan?40:16,0,0);fxWord(e.x,e.y-e.def.h/2-10,'SPARED... FOR NOW',.8,'#dce6ff',true);}}},
 // the Mooncopter hangs over him and fires crescents at whatever comes close
 {n:'Mooncopter',fn:(a,p,use)=>{if(summons.some(s=>s.mcopter)||!use(28))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'MOONCOPTER, INBOUND',.9,'#dce6ff',true);snd('jet',p.x,p.y,{pitch:.7});
   summons.push({mcopter:true,x:p.x,y:p.y-80,life:480,upd(s){const tx=pl_.x-pl_.face*20,ty=pl_.y-70;s.x+=(tx-s.x)*.06;s.y+=(ty-s.y)*.06;if(s.t%18===0){const e=nearestEnemy(s.x,s.y+40,220);if(e){const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy)||1;crescent(s.x,s.y+4,dx/d*8,dy/d*8,false);}}},draw:drawCopter});}},
 // a truncheon on a cable: it hooks the enemy and reels it in to a stunning blow (or reels him to a titan)
 {n:'Truncheon Hook',fn:(a,p,use)=>{const e=atCursor(90);if(!e||Math.hypot(e.x-p.x,e.y-p.y)>230){noTarget('#dce6ff');return;}if(!use(10))return;ST.cd=22;let k=0;
   ACT.push(()=>{k++;if(e.hp<=0)return false;const h=hand();beams.push({x0:h.x,y0:h.y,x1:e.x,y1:e.y,life:1,w:0,c:[230,232,240],g:[160,170,190]});const dx=h.x+p.face*8-e.x,dy=h.y-e.y,d=Math.hypot(dx,dy)||1;
     if(e.def.titan){p.script=2;scriptMove(p,-dx/d*8,-dy/d*8);if(d<24||k>30){hitEnemy(e,24,0,0);return false;}return true;}
     if(d<14||k>30){e.vx=e.vy=0;hitEnemy(e,22,p.face*3,-3);applyStatus(e,'stun',60);fxWord(e.x,e.y-10,'GET OVER HERE.',.8,'#dce6ff',true);return false;}
     e.x+=dx/d*Math.min(10,d);e.y+=dy/d*Math.min(10,d);e.vx=e.vy=0;return true;});}},
];

// ================= SHANG-CHI =================
function drawWheel(s){const cx=s.x,cy=s.y-18;for(let j=0;j<10;j++){const an=s.spin+j*.628,x=cx+Math.cos(an)*14,y=cy+Math.sin(an)*14;for(let m=0;m<8;m++){const b=m/8*6.283;pix(x+Math.cos(b)*3,y+Math.sin(b)*3,rgb(160,235,255),rgb(60,170,255));}}}
const SHANG3=[
 // three rings settle in the air as glowing footholds toward the cursor, then fade
 {n:'Ring Steps',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;const cells=[],tx=mouse.wx,ty=mouse.wy;
   for(let k=1;k<=3;k++){const x=p.x+(tx-p.x)*k/3|0,y=p.y+(ty-p.y)*k/3|0;for(let xx=-7;xx<=7;xx++)for(let yy=0;yy<2;yy++){const X=x+xx,Y=y+yy;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i])continue;setc(i,GLASS);col[i]=yy?rgb(60,150,230):rgb(150,230,255);pin[i]=3;cells.push(i);}rings.push({x,y,r:9,vr:0,life:20,c:RC});}
   let k=0;ACT.push(()=>{if(++k<360){if(k%12===0)for(const i of cells)if(t[i]===GLASS&&R()<.05)spawn(i%W,i/W|0,0,.3,rgb(120,220,255),10,0,1,0,1);return true;}for(const i of cells){if(t[i]===GLASS)setc(i,EMPTY);pin[i]=0;}return false;});}},
 // the rings chain round the enemy: he swings it overhead and slams it down, side to side, three times
 {n:'Ring Chain Slam',fn:(a,p,use)=>{const e=atCursor(80);if(!e||e.def.titan||Math.hypot(e.x-p.x,e.y-p.y)>200){noTarget('#bfe8ff');return;}if(!use(18))return;ST.cd=40;let k=0;fxWord(p.x,p.y-ST.PH-10,'HYAAAH!',1,'#ffd36a',true);
   ACT.push(()=>{k++;if(e.hp<=0)return false;const h=hand();for(let j=0;j<6;j++){const f=j/6;spawn(h.x+(e.x-h.x)*f,h.y+(e.y-h.y)*f,0,0,rgb(120,220,255),2,0,1,0,0);}
     const ph=(k-1)/16|0,u=((k-1)%16)/15,side=ph%2?-1:1,th=side*u*1.95,L=36;e.x=p.x+Math.sin(th)*L;e.y=p.y-ST.PH/2-Math.cos(th)*L;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);
     if(u===1){carve(e.x,e.y,8,0,0);explode(e.x|0,e.y|0,6,{self:true,quiet:true,col:RC});hitEnemy(e,16,0,0);damageEnemies(e.x,e.y,18,8,0,-3);ST.shake=Math.max(ST.shake,6);snd('punch',e.x,e.y,{v:1});}
     if(k>=48){e.vx=side*6;e.vy=-3;e.thrownT=60;e.frozen=0;return false;}return true;});}},
 // light taps on up to three enemies; a moment later each one feels it
 {n:'Pressure Points',fn:(a,p,use)=>{const list=nearestN(p.x,p.y,90,3);if(!list.length){noTarget('#ffd36a');return;}if(!use(16))return;ST.cd=36;let k=0;
   for(const e of list){flash(e.x,e.y,8,[255,220,150],3);fxWord(e.x,e.y-e.def.h/2-4,'TAP',.6,'#ffd36a',true);hitEnemy(e,4,0,0);}
   ACT.push(()=>{k++;if(k%10===0)for(const e of list)if(e.hp>0)spawn(e.x,e.y-e.def.h/2,0,-.5,rgb(255,210,120),10,0,1,0,1);if(k<75)return true;
     for(const e of list){if(e.hp<=0)continue;hitEnemy(e,46,0,-2);applyStatus(e,'stun',80);flash(e.x,e.y,20,[255,220,150],6);fxWord(e.x,e.y-e.def.h/2-8,'...NOW.',.9,'#ffd36a',true);}snd('punch',p.x,p.y);return false;});}},
 // all ten rings lock into one great wheel that rolls away along the ground, flattening what's in front
 {n:'Wheel of Rings',fn:(a,p,use)=>{if(summons.some(s=>s.wheel)||!use(26))return;ST.cd=60;const dir=a.dx<0?-1:1,r=18;fxWord(p.x,p.y-ST.PH-10,'ROLL!',1,'#bfe8ff',true);
   summons.push({wheel:true,x:p.x+dir*20,y:p.y,life:150,dir,spin:0,upd(s){s.x+=s.dir*4;const gy=groundBelow(s.x|0,s.y-r*2);s.y=gy;s.spin+=s.dir*.22;carve(s.x+s.dir*r*.6,gy-r,r*.8,s.dir*4,-1);damageEnemies(s.x,gy-r,r+4,9,s.dir*6,-5);if(s.t%8===0)ST.shake=Math.max(ST.shake,3);if(s.x<4||s.x>W-4)return false;},draw:drawWheel});}},
];

// ================= STAR-LORD =================
const putC=(x,y,m,c)=>{x|=0;y|=0;if(x<0||x>=W||y<0||y>=H)return;const i=y*W+x;if(t[i])return;setc(i,m);col[i]=c;};
const QUILL3=[
 // Groot grows out of the ground at the cursor: trunk and branches, roots holding what stands there
 {n:'I Am Groot',fn:(a,p,use)=>{if(!use(26))return;ST.cd=60;const cx=mouse.wx|0,gy=groundBelow(cx,mouse.wy);let k=0;fxWord(cx,gy-50,'I AM GROOT!',1.1,'#b8e07a',true);snd('crumble',cx,gy,{pitch:.6});
   ACT.push(()=>{k++;const h=Math.min(42,k*1.5)|0;for(let y=gy-h;y<gy;y++)for(let x=cx-2;x<=cx+2;x++)putC(x,y,WOOD,rgb(110+R()*20,74+R()*14,44));
     if(k%5===0){const by=gy-(R()*h|0),d=R()<.5?-1:1,len=6+R()*14|0;for(let j=0;j<len;j++)putC(cx+d*(3+j),by-(j>>1),WOOD,rgb(100,70,40));for(let j=0;j<14;j++)putC(cx+d*(3+len)+(R()-.5)*8,by-(len>>1)+(R()-.5)*7,LEAF,rgb(60+R()*30,130+R()*40,50));}
     for(const e of enemies)if(!e.def.titan&&Math.abs(e.x-cx)<30&&Math.abs(e.y-(gy-20))<34){e.frozen=Math.max(e.frozen||0,4);if(k%10===0){hitEnemy(e,6,0,0);beams.push({pts:[[cx,gy],[(cx+e.x)/2,gy-4],[e.x,e.y]],life:10,c:[150,110,60],g:[90,140,50]});}}
     return k<60;});}},
 // the tape plays: his element guns fire three-way and his energy keeps topping up
 {n:'Awesome Mix',fn:(a,p,use)=>{if(p.mix>0||!use(18))return;ST.cd=60;p.mix=600;fxWord(p.x,p.y-ST.PH-12,'AWESOME MIX VOL. 1',1,'#ff9a5c',true);
   ACT.push(()=>{if(--p.mix<=0||ST.CH.id!=='quill'){p.mix=0;return false;}p.en=Math.min(100,p.en+.12);if(ST.frame%16===0)fxWord(p.x+(R()-.5)*20,p.y-ST.PH-6,R()<.5?'♪':'♫',.8,'#ffd36a',true);return true;});}},
 // Yondu's arrow: it whistles from one enemy to the next, straight through walls
 {n:"Yondu's Arrow",fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-8,'*WHISTLE*',.9,'#ff5050',true);let x=a.h.x,y=a.h.y,vx=a.dx*7,vy=a.dy*7,k=0,n=0;const hit=new Set();
   ACT.push(()=>{k++;const e=nearestN(x,y,260,8).find(o=>!hit.has(o));if(e){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;vx+=(dx/d*9-vx)*.3;vy+=(dy/d*9-vy)*.3;if(d<9){hit.add(e);n++;hitEnemy(e,24,vx*.4,vy*.4);flash(x,y,10,[255,80,60],3);}}
     const lx=x,ly=y;x+=vx;y+=vy;beams.push({x0:lx,y0:ly,x1:x,y1:y,life:6,w:0,c:[255,140,110],g:[220,30,30]});return !(k>200||n>=6||!e&&k>60||x<0||x>W);});}},
 // the Hadron Enforcer: a slow heavy round that bores through anything, then goes off big
 {n:'Hadron Enforcer',fn:(a,p,use)=>{if(!use(28))return;ST.cd=60;p.vx-=a.dx*3;p.vy-=a.dy*2;let x=a.h.x,y=a.h.y,k=0;const vx=a.dx*4.5,vy=a.dy*4.5;fxWord(p.x,p.y-ST.PH-10,'HADRON ENFORCER!',1,'#ff9a5c',true);snd('boom',x,y,{size:.5});
   ACT.push(()=>{k++;x+=vx;y+=vy;carve(x,y,5,vx,vy);for(let j=0;j<3;j++)spawn(x,y,(R()-.5)*1.5-vx*.2,(R()-.5)*1.5-vy*.2,R()<.5?rgb(255,240,200):rgb(255,140,40),10,0,1,0,1);rings.push({x,y,r:6,vr:0,life:2,c:[255,180,90]});
     if(boxE(x,y,4)||k>=55||x<2||x>W-2||y>H-4){explode(x|0,y|0,22,{col:[255,150,60],fire:.3});shockFx(x,y,1.2);damageEnemies(x,y,40,40,0,-4,true);ST.shake=14;return false;}return true;});}},
];

// ================= MILES MORALES =================
function drawBox(s){const x=s.x,y=s.y,o={},B=rgb(40,40,48),pu=s.t%30<4?1.5:0;TK.begin();TK.cap(x-9,y-6,x+9,y-6,5+pu,5+pu,B,o);TK.ell(x-5,y-6,3+pu*.5,3+pu*.5,rgb(200,30,40),o);TK.ell(x+5,y-6,3+pu*.5,3+pu*.5,rgb(200,30,40),o);TK.cap(x-6,y-13,x+6,y-13,1,1,rgb(120,120,130),o);TK.end();}
function drawCat(s){const x=s.x,y=s.y,f=s.face,o={},Kc=rgb(24,24,30),Rd=rgb(200,30,44);TK.begin();TK.ell(x,y-4,6,3,Kc,o);TK.ell(x+f*6,y-7,3,3,Rd,o);TK.cap(x+f*5,y-9,x+f*5,y-11,1,.3,Kc,o);TK.cap(x+f*8,y-9,x+f*8,y-11,1,.3,Kc,o);TK.cap(x-f*6,y-5,x-f*10,y-10,1,.8,Kc,o);for(const lx of [-4,4])TK.cap(x+lx,y-3,x+lx,y,1,1,Kc,o);TK.end();TK.glowDot(x+f*7,y-7,0,rgb(250,250,255));}
const MILES3=[
 // the glitch takes hold of the enemy at the cursor: stuck flickering in place, crackling, then it pops
 {n:'Glitch Trap',fn:(a,p,use)=>{const e=atCursor(70);if(!e){noTarget('#7fe8ff');return;}if(!use(16))return;ST.cd=36;const ox=e.x,oy=e.y;let k=0;fxGlitch(e.x,e.y,e.def.w,{life:90});
   ACT.push(()=>{k++;if(e.hp<=0)return false;if(!e.def.titan){e.frozen=Math.max(e.frozen||0,2);e.x=ox+((k>>2)%3-1)*4;e.y=oy;}if(k%6===0)tagged('shock',()=>hitEnemy(e,4,0,0));
     if(k%3===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*2,0,R()<.5?rgb(255,40,90):rgb(60,220,255),6,0,1,0,1);
     if(k>=90){tagged('shock',()=>hitEnemy(e,26,0,-3));applyStatus(e,'stun',40);fxWord(e.x,e.y-e.def.h/2-6,'*GLITCH*',.9,'#7fe8ff',true);return false;}return true;});}},
 // a boombox on the ground: every beat sends out a venom pulse
 {n:'Drop the Beat',fn:(a,p,use)=>{if(summons.some(s=>s.bbox)||!use(22))return;ST.cd=60;const x=mouse.wx,y=groundBelow(mouse.wx|0,mouse.wy);fxWord(x,y-30,"WHAT'S UP, DANGER?",1,'#ffd36a',true);
   summons.push({bbox:true,x,y,life:300,upd(s){if(s.t%30===0){const r=50*ST.aoeC;rings.push({x:s.x,y:s.y-5,r:4,vr:4,life:12,c:VC});tagged('shock',()=>{for(const e of enemies)if(Math.hypot(e.x-s.x,e.y-(s.y-5))<r){hitEnemy(e,10,(e.x-s.x)*.05,-2);applyStatus(e,'stun',14);}});
     for(let j=0;j<3;j++)venomZap(s.x,s.y-6,s.x+(R()-.5)*60,s.y-6-R()*30);snd('punch',s.x,s.y,{v:.5,pitch:.6});}},draw:drawBox});}},
 // a live web line from his hand to the cursor: anything that walks into it is stuck and shocked
 {n:'Web Tripwire',fn:(a,p,use)=>{if(!use(12))return;ST.cd=26;const x0=a.h.x,y0=a.h.y,x1=mouse.wx,y1=mouse.wy,n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0),cells=[];
   for(let k=0;k<=n;k++){const X=x0+(x1-x0)*k/n|0,Y=y0+(y1-y0)*k/n|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i])continue;setc(i,WEB);col[i]=rgb(255,240,170);pin[i]=3;cells.push(i);}
   let k=0;ACT.push(()=>{k++;if(k%6===0){if(!cells.some(i=>t[i]===WEB))return false;for(const e of enemies){if(e.webbed>0||segD(e.x,e.y,x0,y0,x1,y1)>e.def.h/2+2)continue;e.webbed=120;tagged('shock',()=>hitEnemy(e,12,0,0));venomZap(e.x,e.y,e.x+(R()-.5)*20,e.y-10);}}
     if(k>=600){for(const i of cells){if(t[i]===WEB)setc(i,EMPTY);pin[i]=0;}return false;}return true;});}},
 // Spider-Cat: pounces on enemies and webs them up
 {n:'Spider-Cat',fn:(a,p,use)=>{if(summons.some(s=>s.cat)||!use(20))return;ST.cd=60;fxWord(p.x,p.y-ST.PH-10,'SPIDER-CAT!',1,'#ffd36a',true);
   summons.push({cat:true,x:p.x,y:p.y,vx:0,vy:0,face:p.face,cd:0,life:420,upd(s){s.vy+=.35;s.y+=s.vy;s.x+=s.vx;const gy=groundBelow(s.x|0,s.y-12);if(s.y>=gy){s.y=gy;s.vy=0;s.vx*=.6;}if(s.cd>0)s.cd--;
     const e=nearestEnemy(s.x,s.y-6,240);if(!e){s.x+=(pl_.x-pl_.face*14-s.x)*.08;return;}s.face=e.x>s.x?1:-1;
     if(Math.abs(e.x-s.x)>26&&s.vy===0)s.x+=s.face*2.4;else if(s.cd<=0&&s.vy===0){s.vy=-4;s.vx=s.face*3;s.cd=40;}
     if(s.cd>30&&Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-(s.y-4))<e.def.h/2+4){hitEnemy(e,12,s.face*2,-2);e.webbed=Math.max(e.webbed||0,60);s.cd=29;fxWord(e.x,e.y-e.def.h/2-4,'MRRAOW!',.7,'#ffd36a',true);}},draw:drawCat});}},
];

// ================= HELA =================
const HB=[]; // necroswords she has left stuck in the world (Blades of Hel)
function drawThrone(s){const x=s.x,y=s.y,o={},Kc=rgb(20,26,24);TK.begin();TK.cap(x-10,y-4,x-10,y-30,2.2,1.6,Kc,o);TK.cap(x+10,y-4,x+10,y-30,2.2,1.6,Kc,o);TK.poly([[x-12,y-27],[x,y-46],[x+12,y-27]],Kc,o);for(const d of [-1,1])TK.cap(x+d*10,y-29,x+d*20,y-48,2,.5,Kc,o);TK.end();TK.glowDot(x,y-34,0,rgb(120,255,160));}
const HELA3=[
 // she raises a throne of black blades and sits: necroswords fly at anything near, and she heals while seated
 {n:'Throne of Hel',fn:(a,p,use)=>{if(p.throne>0||!use(24))return;ST.cd=60;p.throne=360;fxWord(p.x,p.y-ST.PH-12,'BOW TO YOUR QUEEN',1,'#8dffb0',true);
   summons.push({x:p.x,y:p.y,life:360,upd(s){if(!(pl_.throne>0)||ST.CH.id!=='hela')return false;pl_.throne--;if(Math.abs(pl_.x-s.x)>16||Math.abs(pl_.y-s.y)>16){pl_.throne=0;return false;}
     pl_.hp=Math.min(ST.CH.hp,pl_.hp+.35);if(s.t%12===0){const e=nearestEnemy(s.x,s.y-20,280);if(e){const sx=s.x+(R()-.5)*30,sy=s.y-40-R()*10,dx=e.x-sx,dy=e.y-sy,d=Math.hypot(dx,dy)||1;necroShot(sx,sy,dx/d*9,dy/d*9);}}},end(){pl_.throne=0;},draw:drawThrone});}},
 // throw six blades that stay where they hit; use it again and they all tear back to her through everything
 {n:'Blades of Hel',fn:(a,p,use)=>{
   if(HB.length){if(!use(10))return;ST.cd=30;fxWord(p.x,p.y-ST.PH-10,'RETURN TO ME',.9,'#8dffb0',true);snd('whoosh',p.x,p.y,{pitch:.7});
     for(const b of HB.splice(0)){const hit=new Set();let k=0;ACT.push(()=>{k++;const dx=pl_.x-b.x,dy=pl_.y-ST.PH/2-b.y,d=Math.hypot(dx,dy)||1,st=Math.min(11,d),nx=b.x+dx/d*st,ny=b.y+dy/d*st;
       sliceLine(b.x,b.y,nx,ny,{edge:NGE,quiet:true,push:1.3});for(const e of enemies)if(!hit.has(e)&&segD(e.x,e.y,b.x,b.y,nx,ny)<e.def.w/2+3){hit.add(e);hitEnemy(e,26,dx/d*3,dy/d*3);}
       b.x=nx;b.y=ny;beams.push({x0:b.x-dx/d*8,y0:b.y-dy/d*8,x1:b.x,y1:b.y,life:2,w:0,c:[200,255,220],g:NG});return d>10&&k<90;});}return;}
   if(!use(16))return;ST.cd=24;const an0=Math.atan2(a.dy,a.dx);
   for(let j=0;j<6;j++){const an=an0+(j-2.5)*.09,b={x:a.h.x,y:a.h.y,ang:an,vx:Math.cos(an)*9,vy:Math.sin(an)*9},hit=new Set();let k=0,stuck=false;
     ACT.push(()=>{k++;for(let s=0;s<9;s++){b.x+=b.vx/9;b.y+=b.vy/9;const X=b.x|0,Y=b.y|0;if(X<1||X>=W-1||Y>=H-2)return false;if(Y>=0&&KIND[t[Y*W+X]]===S){stuck=true;break;}}
       for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-b.x)<e.def.w/2+2&&Math.abs(e.y-b.y)<e.def.h/2+2){hit.add(e);hitEnemy(e,14,b.vx*.3,b.vy*.3);}
       beams.push({x0:b.x-Math.cos(an)*7,y0:b.y-Math.sin(an)*7,x1:b.x,y1:b.y,life:1,w:0,c:[200,255,220],g:NG});if(stuck||k>40){if(HB.length<24)HB.push(b);return false;}return true;});}
   if(!summons.some(s=>s.hb))summons.push({hb:true,x:0,y:0,life:1e9,upd(){if(ST.CH.id!=='hela'){HB.length=0;return false;}},draw(){for(const b of HB){const c=Math.cos(b.ang),s=Math.sin(b.ang);for(let k=-7;k<=2;k++)pix(b.x+c*k,b.y+s*k,k>0?rgb(30,40,36):rgb(150,255,190),rgb(60,200,110));}}});}},
 // she closes her hand on the enemy at the cursor (as she did on Mjolnir): held, squeezed, shattered
 {n:'Crushing Grip',fn:(a,p,use)=>{const e=atCursor(60);if(!e){noTarget('#8dffb0');return;}if(!use(22))return;ST.cd=45;const hx=e.x,hy=e.y-6;let k=0;fxWord(e.x,e.y-e.def.h/2-10,'YOU HAVE NO IDEA WHAT I AM',.8,'#8dffb0',true);
   ACT.push(()=>{k++;if(e.hp<=0)return false;if(!e.def.titan){e.x+=(hx-e.x)*.2;e.y+=(hy-e.y)*.2;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);}const h=hand();if(k%2===0)beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2,(h.y+e.y)/2+(R()-.5)*8],[e.x,e.y]],life:2,c:NGE,g:NG});
     const an=k*.4,r=Math.max(3,e.def.w*.8-k*.3);spawn(e.x+Math.cos(an)*r,e.y+Math.sin(an)*r,0,0,rgb(120,255,160),4,0,1,0,0);
     if(k>=40){hitEnemy(e,e.def.titan?60:55,0,-2);for(let j=0;j<16;j++){const b=R()*6.283;spawn(e.x,e.y,Math.cos(b)*3,Math.sin(b)*3,rgb(150,255,190),20,0,1,1);}explode(e.x|0,e.y|0,8,{self:true,col:NG});fxWord(e.x,e.y-e.def.h/2-6,'*CRUNCH*',1,'#8dffb0',true);snd('glass',e.x,e.y);return false;}return true;});}},
 // a great necro-javelin: the first enemy it hits is carried along and pinned to the next wall
 {n:'Impaler',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;let x=a.h.x,y=a.h.y,k=0,e=null;const vx=a.dx*11,vy=a.dy*11;snd('whoosh',x,y,{pitch:.8});
   ACT.push(()=>{k++;let wall=false;for(let s=0;s<11;s++){x+=vx/11;y+=vy/11;if(x<1||x>=W-1||y>=H-2){wall=true;break;}if(y>=0&&KIND[t[(y|0)*W+(x|0)]]===S){wall=true;break;}if(!e){const o=boxE(x,y,2);if(o&&!o.def.titan)e=o;else if(o){hitEnemy(o,40,0,0);wall=true;break;}}}
     beams.push({x0:x-vx*1.4,y0:y-vy*1.4,x1:x,y1:y,life:2,w:1,c:[30,40,36],g:NG});if(e){e.x=x;e.y=y;e.vx=e.vy=0;}
     if(!wall&&k<=40)return true;
     for(let j=0;j<8;j++){const b=j/8*6.283;sliceLine(x,y,x+Math.cos(b)*16,y+Math.sin(b)*16,{edge:NGE,quiet:true});}snd('rip',x,y);
     if(e){hitEnemy(e,36,0,0);const pe=e,px=x,py=y;let m=0;fxWord(x,y-14,'PINNED.',.9,'#8dffb0',true);ACT.push(()=>{m++;if(pe.hp<=0)return false;pe.x=px;pe.y=py;pe.vx=pe.vy=0;pe.frozen=Math.max(pe.frozen||0,2);if(m%20===0)hitEnemy(pe,5,0,0);return m<180;});}
     else damageEnemies(x,y,18,20,0,-3);return false;});}},
];

// ================= THANOS =================
const TP=[200,100,255];
const THANOS3=[
 // the Black Order answers: Corvus Glaive cuts in close, Proxima Midnight throws her spear from range
 {n:'Black Order',fn:(a,p,use)=>{if(summons.some(s=>s.order)||!use(34))return;ST.cd=90;fxWord(p.x,p.y-ST.PH-12,'MY CHILDREN',1.1,'#c88cff',true);
   for(const [i,kind] of [[-1,'corvus'],[1,'proxima']]){const x=p.x+i*20;summons.push({order:true,kind,x,y:groundBelow(x|0,p.y-20),face:p.face,cd:20,mv:false,life:600,
     upd(s){const e=nearestEnemy(s.x,s.y-12,280);s.mv=false;if(s.cd>0)s.cd--;if(!e){const tx=pl_.x+(s.kind==='corvus'?-24:24);if(Math.abs(tx-s.x)>6){s.x+=Math.sign(tx-s.x)*2;s.mv=true;}s.y=groundBelow(s.x|0,s.y-14);return;}s.face=e.x>s.x?1:-1;const dx=Math.abs(e.x-s.x);
       if(s.kind==='corvus'){if(dx>12){s.x+=s.face*(s.cd<=0&&dx<80?6:2.2);s.mv=true;}else if(s.cd<=0){s.cd=22;hitEnemy(e,18,s.face*4,-2);clawSlice(s.x,s.y-12,s.face,0,18,1,0,{edge:[200,220,255],quiet:true});}}
       else{if(dx<60){s.x-=s.face*1.8;s.mv=true;}else if(dx>140){s.x+=s.face*1.8;s.mv=true;}if(s.cd<=0){s.cd=45;const sx=s.x,sy=s.y-18,ddx=e.x-sx,ddy=e.y-sy,d=Math.hypot(ddx,ddy)||1;shots.push({x:sx,y:sy,vx:ddx/d*8,vy:ddy/d*8,type:'spear',life:60,col:[255,210,120],ecol:[255,210,120],boom:5});}}
       s.y=groundBelow(s.x|0,s.y-14);},
     draw(s){if(s.kind==='corvus'){drawFig(s,rgb(60,64,80),rgb(150,156,170));const f=s.face;lineP(s.x+f*7,s.y-13,s.x+f*9,s.y-30,rgb(40,40,48),rgb(40,40,48));lineP(s.x+f*9,s.y-30,s.x+f*13,s.y-36,rgb(210,230,255),rgb(120,160,255));}
       else{drawFig(s,rgb(40,44,56),rgb(90,70,110));const f=s.face;lineP(s.x+f*5,s.y-24,s.x+f*9,s.y-4,rgb(255,210,120),rgb(220,150,40));}}});}}},
 // nothing stops him for five seconds: he barely feels a hit, and every stride shakes the ground
 {n:'I Am Inevitable',fn:(a,p,use)=>{if(p.shell>0||!use(26))return;ST.cd=80;p.shell=300;fxWord(p.x,p.y-ST.PH-14,'I AM INEVITABLE.',1.2,'#c88cff',true);let k=0;
   ACT.push(()=>{k++;if(!(p.shell>0)||ST.CH.id!=='thanos')return false;if(k%3===0)spawn(p.x+(R()-.5)*14,p.y-R()*ST.PH,(R()-.5)*.6,-.8,rgb(200,100,255),14,0,1,0,1);
     if(p.ground&&Math.abs(p.vx)>.8&&k%18===0)quake(p.x,p.y,{r:18,col:TP});if(k%8===0)for(const e of enemies)if(Math.abs(e.x-p.x)<e.def.w/2+8&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+12)hitEnemy(e,10,(e.x-p.x)*.3,-2);return true;});}},
 // a titan's leap toward the cursor, landing in a purple shockwave
 {n:'Titan Leap',fn:(a,p,use)=>{if(!p.ground||!use(16))return;ST.cd=40;const dx=Math.max(-220,Math.min(220,mouse.wx-p.x));p.vx=dx/60;p.vy=-8.5;p.ground=false;p.slam=true;p.slamOpt={col:TP,r:40};fxWord(p.x,p.y-ST.PH-8,'HRRAAH!',1,'#c88cff',true);}},
 // he closes the gauntlet: everything around the cursor is crushed into one dense ball of matter that drops
 {n:'Gauntlet Crush',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,r=28*ST.aoeC|0;let k=0,n=0;fxWord(cx,cy-r-8,'DREAD IT. RUN FROM IT.',.9,'#c88cff',true);snd('psi',cx,cy,{pitch:.4});
   ACT.push(()=>{k++;const rr=r*(1-k/30);rings.push({x:cx,y:cy,r:Math.max(2,rr),vr:0,life:2,c:TP});
     for(let j=0;j<60;j++){const an=R()*6.283,d=rr+R()*4,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){const c=col[i];setc(i,EMPTY);n++;spawn(X,Y,(cx-X)*.08,(cy-Y)*.08,c,12,0,0,0,1);}}
     for(const e of enemies){if(e.def.titan)continue;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;if(d<r+20){e.x+=dx/d*Math.min(4,d);e.y+=dy/d*Math.min(4,d);e.vx=e.vy=0;if(k%6===0)hitEnemy(e,6,0,0);}}
     if(k<30)return true;
     const br=Math.max(4,Math.min(12,Math.sqrt(n/3.14)*.6|0)),w=br*2+1,lm=new Uint8Array(w*w),lc=new Uint32Array(w*w);let m=0;
     for(let y=0;y<w;y++)for(let x=0;x<w;x++){if((x-br)**2+(y-br)**2>br*br)continue;lm[y*w+x]=STONE;lc[y*w+x]=rgb(70+R()*30,44+R()*20,96+R()*40);m++;}
     const b=finishBody(lm,lc,w,w,br,br,cx,cy,0,m,false);if(b){b.vy=1;b.thrown=true;bodyImpact(b,30,TP);}
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+10)hitEnemy(e,40,0,-3);flash(cx,cy,40,TP,10);snd('crumble',cx,cy,{size:2});return false;});}},
];

export const EXTRA3A={kurt:KURT3,gambit:GAMBIT3,moon:MOON3,shang:SHANG3,quill:QUILL3,miles:MILES3,hela:HELA3,thanos:THANOS3};
