// Kit expansion, part B (2026-10-23): two new powers for every hero still on twelve, one for Silver Surfer and
// one for each hero already on fourteen or fifteen, so every kit ends at 14+ with something it lacked
// (a time loop, a Flerken, a suplex, Thomas the Tank Engine, a shared-pain mind link...). applyKits3() puts
// these and part A's (kits3a.js) on the bar, the ultimate staying last.
import { ST } from '../state.js';
import { EMBER, EMPTY, FIRE, GFIRE, KIND, LAVA, R, S, WATER, rgb } from '../world/materials.js';
import { H, W, t, setc } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { grabRegion, quake, scriptMove, shots, surfaceY, zap } from './powers.js';
import { ACT } from './xmen.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, markUlt, summons } from './abilities.js';
import { nearestN, tagged } from './kits2a.js';
import { TK } from '../render/titan.js';
import { fxDome, fxSigil, fxSlash } from '../render/vfxcore.js';
import { pix } from '../render/canvas.js';
import { EXTRA3A, atCursor, bodyImpact, chunkAt, noTarget } from './kits3a.js';

const fig8=(e)=>e.def.titan; // titans can't be grabbed, swapped, hung or thrown
// ---- drawings for the new summons
function drawCloak(s){const x=s.x,y=s.y,o={},wv=Math.sin(s.t*.3)*3;TK.begin();TK.poly([[x-5,y-8],[x+5,y-8],[x+9+wv,y+8],[x+3,y+5],[x-3,y+9],[x-9-wv,y+6]],rgb(196,30,40),o);TK.cap(x-6,y-9,x+6,y-9,2,2,rgb(230,190,60),o);TK.poly([[x-4,y-7],[x+4,y-7],[x,y+4]],rgb(120,16,24),o);TK.end();}
function drawTrain(s){const k=s.sz,x=s.x,y=s.y,f=s.face,o={},B=rgb(40,90,200),Rd=rgb(200,40,40),Kc=rgb(30,30,36);TK.begin();TK.cap(x-f*18*k,y-12*k,x+f*14*k,y-12*k,8*k,8*k,B,o);TK.cap(x-f*16*k,y-24*k,x-f*8*k,y-24*k,6*k,6*k,B,o);TK.cap(x+f*10*k,y-20*k,x+f*10*k,y-28*k,2.5*k,3*k,Kc,o);for(const w of [-12,-2,8])TK.ell(x+f*w*k,y-4*k,4*k,4*k,Rd,o);TK.ell(x+f*20*k,y-12*k,5*k,6*k,rgb(205,205,200),o);TK.end();}
function drawGoose(s){const x=s.x,y=s.y,f=s.face,o={},O=rgb(230,150,60);TK.begin();TK.ell(x,y-4,6,3.5,O,o);TK.ell(x+f*6,y-7,3.5,3,O,o);TK.cap(x+f*5,y-10,x+f*5,y-12,1,.4,O,o);TK.cap(x+f*8,y-10,x+f*8,y-12,1,.4,O,o);TK.cap(x-f*6,y-5,x-f*10,y-10,1,1,O,o);TK.end();}
function drawUni(s){const x=s.x,y=s.y,f=s.face,o={},Wc=rgb(250,250,255),st=Math.sin(s.t*.6)*4;TK.begin();TK.ell(x,y-14,12,6,Wc,o);TK.cap(x+f*8,y-16,x+f*14,y-26,3,2.5,Wc,o);TK.ell(x+f*17,y-26,5,3,Wc,o);TK.cap(x+f*18,y-29,x+f*22,y-38,1,.3,rgb(255,215,90),o);
  for(const [lx,ph] of [[-8,0],[-4,1],[5,0],[9,1]])TK.cap(x+lx,y-10,x+lx+(ph?st:-st),y,1.8,1.4,Wc,o);TK.cap(x-f*12,y-16,x-f*18,y-10,2,1,rgb(255,120,200),o);TK.end();}
function drawSnare(s){const c=rgb(30,30,44),g=rgb(70,60,110);for(let j=0;j<7;j++){const an=s.t*.05+j*.9,r=10+Math.sin(s.t*.1+j)*4;for(let m=0;m<=8;m++){const u=m/8;pix(s.x+Math.cos(an)*r*u,s.y-Math.abs(Math.sin(an))*r*u*.7,c,g);}}}

const EXTRA3B={
 // ================= SPIDER-MAN =================
 spidey:[
  // Iron Spider waldoes: four mechanical legs stab whatever gets close for six seconds
  {n:'Iron Spider Arms',fn:(a,p,use)=>{if(p.isp>0||!use(20))return;ST.cd=50;p.isp=360;fxWord(p.x,p.y-ST.PH-10,'IRON SPIDER, ENGAGE!',.9,'#ffd36a',true);snd('charge',p.x,p.y,{pitch:1.4});
    ACT.push(()=>{if(--p.isp<=0||ST.CH.id!=='spidey'){p.isp=0;return false;}const bx=p.x-p.face*2,by=p.y-ST.PH*.6,tg=nearestN(bx,by,50,4);
      for(let j=0;j<4;j++){const e=tg[j],side=j<2?-1:1,lift=j%2,ph=(ST.frame+j*3)%10;let ex,ey;if(e&&ph<3){ex=e.x;ey=e.y;if(ph===0)hitEnemy(e,9,(e.x-bx)*.08,-1);}else{ex=bx+side*(14+lift*4);ey=by-8+lift*10+Math.sin(ST.frame*.2+j)*2;}
        beams.push({pts:[[bx,by],[(bx+ex)/2+side*4,Math.min(by,ey)-8],[ex,ey]],life:1,c:[240,200,90],g:[200,40,40]});}return true;});}},
  // the enemy at the cursor is left hanging from a web line, the classic way
  {n:'Web Hang',fn:(a,p,use)=>{const e=atCursor(70);if(!e||fig8(e)||e.hang){noTarget('#ff6b6b');return;}if(!use(14))return;ST.cd=30;const X=e.x|0;let ay=e.y-e.def.h/2-1,found=false;
    for(let k=0;k<150;k++){const Y=ay|0;if(Y<1)break;if(KIND[t[Y*W+X]]===S){found=true;break;}ay--;}
    const top=found?ay+1:e.y-e.def.h/2-60,len=Math.max(10,Math.min(40,(e.y-e.def.h/2-top)*.5));e.hang={x:e.x,y:top,len,life:360};fxWord(e.x,e.y-e.def.h/2-8,'HANG AROUND!',.9,'#ff6b6b',true);snd('whoosh',e.x,e.y,{pitch:1.8});
    ACT.push(()=>{if(!e.hang||e.hp<=0)return false;beams.push({x0:e.hang.x,y0:e.hang.y,x1:e.x,y1:e.y-e.def.h/2,life:1,w:0,c:[240,240,246],g:[160,160,170]});return true;});}},
 ],
 // ================= SCARLET WITCH =================
 wanda:[
  // a Westview hex: inside the dome enemies wade through a sitcom, slowed and unable to attack
  {n:'Westview',fn:(a,p,use)=>{if(!use(30))return;ST.cd=80;const cx=mouse.wx,cy=mouse.wy,r=60*ST.aoeC;let k=0;fxDome(cx,cy,r,[255,80,120],{life:420});fxWord(cx,cy-r-8,'WELCOME TO WESTVIEW',1,'#ff5c8a',true);
    ACT.push(()=>{k++;for(const e of enemies){if(Math.hypot(e.x-cx,e.y-cy)>r)continue;e.vx*=.7;if(e.vy<0)e.vy*=.7;e.cd=Math.max(e.cd||0,3);if(k%40===0)hitEnemy(e,6,0,0);}
      for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r){shots.splice(n,1);flash(s.x,s.y,6,[255,80,120],2);}}
      if(k%90===0)fxWord(cx+(R()-.5)*r,cy-r*.5,['*LAUGH TRACK*',"HONEY, I'M HOME!",'*APPLAUSE*'][R()*3|0],.7,'#ffd6e0',true);return k<420;});}},
  // crimson chains bind everything near the cursor and smash them into each other
  {n:'Hex Chains',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,100,5).filter(e=>!fig8(e));if(!list.length){noTarget('#ff5c8a');return;}if(!use(20))return;ST.cd=40;const cx=mouse.wx,cy=mouse.wy;let k=0;
    ACT.push(()=>{k++;const h=hand();for(const e of list){if(e.hp<=0)continue;if(k%2===0)beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2+(R()-.5)*10,(h.y+e.y)/2+(R()-.5)*10],[e.x,e.y]],life:2,c:[255,120,150],g:[220,20,60]});
        if(k>12){const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*Math.min(7,d);e.y+=dy/d*Math.min(7,d);e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);}}
      if(k<34)return true;const n=list.filter(e=>e.hp>0).length;for(const e of list)if(e.hp>0)hitEnemy(e,16+n*8,(e.x-cx)*.3,-4);explode(cx|0,cy|0,6+n*2,{self:true,col:[255,40,90]});fxWord(cx,cy-20,n>2?'CRASH!':'BONK!',1,'#ff5c8a',true);return false;});}},
 ],
 // ================= DOCTOR STRANGE =================
 strange:[
  // the enemy is caught in a time loop: snapped back to the same spot and hurt again, six times over
  {n:'Time Loop',fn:(a,p,use)=>{const e=atCursor(70);if(!e||fig8(e)||e.loop){noTarget('#8dffb0');return;}if(!use(24))return;ST.cd=50;e.loop={x:e.x,y:e.y,k:0,n:0};fxSigil(e.x,e.y,e.def.w/2+14,[120,255,140],{kind:'clock',life:360,spin:.05});
    fxWord(e.x,e.y-e.def.h/2-10,"DORMAMMU, I'VE COME TO BARGAIN",.8,'#8dffb0',true);snd('psi',e.x,e.y,{pitch:.5});}},
  // the Cloak of Levitation flies off on its own and smothers enemies one after another
  {n:'Cloak of Levitation',fn:(a,p,use)=>{if(summons.some(s=>s.cloak)||!use(22))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'GO ON, THEN.',.9,'#ff8a5c',true);
    summons.push({cloak:true,x:p.x,y:p.y-ST.PH,life:480,tg:null,hold:0,upd(s){if(!s.tg||s.tg.hp<=0||s.hold>90){s.tg=nearestEnemy(s.x,s.y,260);s.hold=0;}const e=s.tg,tx=e?e.x:pl_.x-pl_.face*12,ty=e?e.y-e.def.h*.2:pl_.y-ST.PH-10,dx=tx-s.x,dy=ty-s.y,d=Math.hypot(dx,dy)||1;
      s.x+=dx/d*Math.min(4,d);s.y+=dy/d*Math.min(4,d);if(e&&d<8){s.hold++;if(!e.def.titan)e.frozen=Math.max(e.frozen||0,2);if(s.hold%15===0)hitEnemy(e,8,0,0);}},draw:drawCloak});}},
 ],
 // ================= ANT-MAN =================
 antman:[
  // a toy train, grown to full size, charging down the street
  {n:'Thomas the Tank Engine',fn:(a,p,use)=>{if(summons.some(s=>s.train)||!use(28))return;ST.cd=70;const dir=a.dx<0?-1:1;fxWord(p.x,p.y-ST.PH-10,'CHOO CHOO!',1.1,'#ff6b5c',true);
    summons.push({train:true,x:p.x+dir*10,y:p.y,face:dir,sz:.12,life:160,upd(s){s.sz=Math.min(1,s.sz+.06);s.y=groundBelow(s.x|0,s.y-30);if(s.sz<1)return;s.x+=s.face*5;carve(s.x+s.face*22,s.y-12,12,s.face*5,-1,s.y);damageEnemies(s.x+s.face*18,s.y-12,20,12,s.face*7,-4);
      if(s.t%10===0){ST.shake=Math.max(ST.shake,4);for(let j=0;j<4;j++)spawn(s.x+s.face*10,s.y-30,(R()-.5)*.6,-1,rgb(220,220,225),30,0,0,0,1);}if(s.x<4||s.x>W-4)return false;},draw:drawTrain});}},
  // he shrinks, slips inside the enemy, and grows back
  {n:'Inside Job',fn:(a,p,use)=>{const e=atCursor(90);if(!e||Math.hypot(e.x-p.x,e.y-p.y)>220){noTarget('#ff6b5c');return;}if(!use(24))return;ST.cd=50;p.sizeT=.45;let k=0;fxWord(p.x,p.y-ST.PH-8,'GOING IN!',.9,'#ff6b5c',true);
    ACT.push(()=>{k++;p.script=2;p.dodge=Math.max(p.dodge||0,2);if(e.hp<=0){p.sizeT=1;p.stealth=0;return false;}const dx=e.x-p.x,dy=e.y+e.def.h/2-p.y,d=Math.hypot(dx,dy)||1;
      if(k<=20&&d>4){scriptMove(p,dx/d*Math.min(9,d),dy/d*Math.min(9,d));return true;}p.x=e.x;p.y=e.y+e.def.h/2;p.stealth=3;if(k%6===0){e.flash=3;hitEnemy(e,3,0,0);}if(k<50)return true;
      p.sizeT=1;p.stealth=0;hitEnemy(e,e.def.titan?45:60,0,-5);explode(e.x|0,e.y|0,10,{self:true,col:[255,80,80]});fxWord(e.x,e.y-e.def.h/2-8,'SURPRISE!',1.1,'#ff6b5c',true);return false;});}},
 ],
 // ================= JUGGERNAUT =================
 juggernaut:[
  // he grabs the enemy in front, carries it over his head and drives it into the ground behind him
  {n:'Juggernaut Suplex',fn:(a,p,use)=>{const e=nearestEnemy(p.x+p.face*(ST.PW/2+8),p.y-ST.PH/2,ST.PW/2+30);if(!e||fig8(e)){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO GRAB',.7,'#ff7a5c',true);return;}if(!use(16))return;ST.cd=36;let k=0;const f=p.face;
    ACT.push(()=>{k++;p.script=2;if(e.hp<=0)return false;const an=Math.min(1,k/24)*Math.PI;e.x=p.x+Math.cos(an)*f*18;e.y=p.y-ST.PH/2-Math.sin(an)*26;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);if(k<24)return true;
      const gy=groundBelow(e.x|0,e.y);e.y=gy-e.def.h/2;hitEnemy(e,40,-f*2,-3);quake(e.x,gy,{r:24,col:[200,60,40]});explode(e.x|0,gy|0,8,{self:true,col:[200,60,40]});fxWord(e.x,gy-30,'SUPLEX!',1.1,'#ff7a5c',true);ST.shake=16;return false;});}},
  // the Crimson Gem flares: for four seconds everything is shoved away from him and enemy fire burns up
  {n:'Crimson Aura',fn:(a,p,use)=>{if(p.caura>0||!use(24))return;ST.cd=60;p.caura=240;fxWord(p.x,p.y-ST.PH-12,'THE CRIMSON GEM!',1,'#ff7a5c',true);
    ACT.push(()=>{if(--p.caura<=0||ST.CH.id!=='juggernaut'){p.caura=0;return false;}const cx=p.x,cy=p.y-ST.PH/2,r=36;
      for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+e.def.w/2){if(!e.def.titan){e.vx+=dx/d*1.2;e.vy+=dy/d*.8-.2;}if(ST.frame-(e.mem.caura||-99)>12){e.mem.caura=ST.frame;hitEnemy(e,8,0,0);}}}
      for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+b.rmax){b.vx+=dx/d*.6;b.vy+=dy/d*.6;b.rest=0;}}
      for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r){shots.splice(n,1);flash(s.x,s.y,6,[255,60,40],2);}}
      if(ST.frame%2===0){const an=R()*6.283;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r,Math.cos(an),Math.sin(an),rgb(220,40,30),10,0,1,0,1);}return true;});}},
 ],
 // ================= ULTRON =================
 ultron:[
  // Sokovia: the ground under the cursor tears loose, rises on thrusters, and comes down where he points
  {n:'Sokovia',fn:(a,p,use)=>{const n=grabRegion(mouse.wx|0,mouse.wy|0,10)||chunkAt(mouse.wx,mouse.wy,16);if(n<40){noTarget('#ff6060','NOTHING TO LIFT');return;}if(!use(32))return;ST.cd=80;const b=makeBody(q,n,false);if(!b)return;fxWord(b.x,b.y-30,'DO YOU SEE THE BEAUTY OF IT?',.9,'#ff6060',true);let k=0;
    ACT.push(()=>{k++;if(!bodies.includes(b))return false;b.rest=0;if(k<50){b.vy=-3.5;b.vx*=.8;for(let j=0;j<2;j++)spawn(b.x+(R()-.5)*b.rmax,b.y+b.rmax*.6,(R()-.5),1.5,R()<.5?rgb(150,200,255):rgb(255,120,90),10,0,1,0,1);return true;}
      if(k<80){b.vy=-.3;b.vx=0;return true;}b.vx=Math.max(-6,Math.min(6,(mouse.wx-b.x)*.05));b.vy=7;b.thrown=true;bodyImpact(b,45,[255,90,90]);return false;});}},
  // a lattice of beams lifts everything near the cursor, shocks it, and slams it back down
  {n:'Repulsor Lattice',fn:(a,p,use)=>{const cx=mouse.wx,cy=mouse.wy,r=70*ST.aoeC,list=enemies.filter(e=>!e.def.titan&&Math.hypot(e.x-cx,e.y-cy)<r);if(!list.length){noTarget('#ff6060');return;}if(!use(26))return;ST.cd=60;let k=0;fxWord(cx,cy-r,'NO STRINGS ON ME',1,'#ff6060',true);
    ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;if(k<60){e.vy=0;e.vx*=.8;e.frozen=Math.max(e.frozen||0,2);e.y-=.7*(1-k/60);if(k%3===0)beams.push({x0:e.x,y0:e.y+e.def.h/2+30,x1:e.x,y1:e.y,life:3,w:0,c:[255,220,220],g:[255,60,60]});if(k%15===0)tagged('shock',()=>hitEnemy(e,8,0,0));}
      else{e.frozen=0;e.vy=9;e.thrownT=60;hitEnemy(e,18,0,6);}}return k<60;});}},
 ],
 // ================= MAGNETO =================
 magneto:[
  // he takes hold of the iron in their blood: held up, shaking, hurt, then flung apart
  {n:'Blood Iron',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,100,6).filter(e=>!fig8(e));if(!list.length){noTarget('#c86bff');return;}if(!use(26))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy;let k=0;fxWord(cx,cy-40,'THE IRON IN YOUR BLOOD',.9,'#c86bff',true);
    rings.push({x:cx,y:cy,r:6,vr:3,life:20,c:[200,80,255]});
    ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;e.frozen=Math.max(e.frozen||0,2);if(k<20)e.y-=1;e.x+=(R()-.5)*1.2;if(k%10===0)hitEnemy(e,7,0,0);if(k%3===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(cx-e.x)*.03,(cy-e.y)*.03,rgb(200,30,40),10,0,1,0,1);}
      if(k<60)return true;for(const e of list)if(e.hp>0){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;e.frozen=0;e.vx=dx/d*6;e.vy=-4;e.thrownT=60;hitEnemy(e,14,0,0);}return false;});}},
  // one coin: it creeps toward the cursor, then accelerates through everything in its line
  {n:'Coin Drill',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;let x=a.h.x,y=a.h.y,k=0;const hit=new Set(),dx0=mouse.wx-x,dy0=mouse.wy-y,d0=Math.hypot(dx0,dy0)||1,ux=dx0/d0,uy=dy0/d0;fxWord(x,y-12,'*CLINK*',.7,'#ffd36a',true);
    ACT.push(()=>{k++;const sp=k<20?1.2:Math.min(14,1.2+(k-20)*1.5);x+=ux*sp;y+=uy*sp;carve(x,y,1.6,ux*2,uy*2);beams.push({x0:x-ux*3,y0:y-uy*3,x1:x,y1:y,life:2,w:0,c:[255,230,140],g:[200,120,40]});
      for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-x)<e.def.w/2+2&&Math.abs(e.y-y)<e.def.h/2+2){hit.add(e);hitEnemy(e,k<20?12:34,ux*3,uy*3);flash(x,y,8,[255,220,120],3);}return k<70&&x>1&&x<W-1&&y<H-2;});}},
 ],
 // ================= MISTER FANTASTIC =================
 reed:[
  // he coils down like a spring and launches himself at the cursor, bowling through what he hits
  {n:'Coil Spring',fn:(a,p,use)=>{if(!use(10))return;ST.cd=26;let k=0;const dx=a.dx,dy=a.dy;fxWord(p.x,p.y-ST.PH-6,'BOI-OI-OING!',.9,'#7fb0ff',true);
    const hit=new Set();ACT.push(()=>{k++;if(k<12){p.vx*=.5;p.crouch=4;return true;}p.script=2;carve(p.x+dx*9,p.y-ST.PH/2+dy*9,ST.PH*.45,dx*5,dy*5);scriptMove(p,dx*10,dy*10-(k<18?1.5:0));afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:6,col:[90,140,230]});
    for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-p.x)<e.def.w/2+ST.PW&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+ST.PH/2){hit.add(e);hitEnemy(e,22,dx*7,dy*7-3);}if(k<28)return true;p.vx=dx*4;p.vy=dy*4-1;return false;});}},
  // he stretches into an elastic wall: enemy shots bounce back, enemies bounce off
  {n:'Bouncing Barrier',fn:(a,p,use)=>{if(!use(18))return;ST.cd=50;const f=a.dx<0?-1:1,x=p.x+f*14,y0=p.y-ST.PH-14,y1=p.y+2;let k=0;fxWord(p.x,p.y-ST.PH-10,'STRETCH!',.9,'#7fb0ff',true);
    ACT.push(()=>{k++;const wob=Math.sin(k*.4)*2;beams.push({pts:[[x,y0],[x+wob,(y0+y1)/2],[x,y1]],life:1,c:[120,170,255],g:[40,80,200]});
      for(const s of shots)if(s.owner==='enemy'&&Math.abs(s.x-x)<5&&s.y>y0&&s.y<y1){s.vx=-s.vx*1.2;s.vy*=-.5;s.owner='player';s.col=[120,170,255];s.x=x+Math.sign(s.vx)*6;}
      for(const e of enemies)if(!e.def.titan&&Math.abs(e.x-x)<e.def.w/2+3&&e.y>y0-e.def.h/2&&e.y<y1+e.def.h/2){e.vx=(Math.sign(e.x-x)||f)*5;e.vy=-2;if(k%10===0)hitEnemy(e,5,0,0);}return k<240;});}},
 ],
 // ================= INVISIBLE WOMAN =================
 sue:[
  // invisible steps: for five seconds she can stand and jump on thin air (crouch to drop)
  {n:'Force Steps',fn:(a,p,use)=>{if(p.fsteps>0||!use(14))return;ST.cd=40;p.fsteps=300;fxWord(p.x,p.y-ST.PH-10,'INVISIBLE STAIRS',.9,'#9ec8ff',true);
    ACT.push(()=>{if(--p.fsteps<=0||ST.CH.id!=='sue'){p.fsteps=0;return false;}if(!p.ground&&p.vy>0&&!(p.crouch>0)){p.vy=0;p.ground=true;if(ST.frame%3===0)for(let x=-6;x<=6;x+=3)spawn(p.x+x,p.y+1,0,0,rgb(150,200,255),4,0,1,0,0);}return true;});}},
  // a force bubble inside the enemy, swelling until it bursts
  {n:'Inner Bubble',fn:(a,p,use)=>{const e=atCursor(60);if(!e){noTarget('#9ec8ff');return;}if(!use(24))return;ST.cd=50;let k=0;fxWord(e.x,e.y-e.def.h/2-8,'HOLD STILL.',.9,'#9ec8ff',true);
    ACT.push(()=>{k++;if(e.hp<=0)return false;if(!e.def.titan)e.frozen=Math.max(e.frozen||0,2);if(k%2===0)rings.push({x:e.x,y:e.y,r:2+k*.4,vr:0,life:2,c:[150,200,255]});if(k<40)return true;
      hitEnemy(e,e.def.titan?40:55,0,-3);damageEnemies(e.x,e.y,30,14,0,-3,true);rings.push({x:e.x,y:e.y,r:6,vr:4,life:12,c:[150,200,255]});flash(e.x,e.y,30,[150,200,255],8);snd('pop',e.x,e.y,{pitch:.4});return false;});}},
 ],
 // ================= HUMAN TORCH =================
 torch:[
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
 ],
 // ================= THING =================
 thing:[
  // a manhole cover thrown like a frisbee: it skips off walls and the floor
  {n:'Manhole Frisbee',fn:(a,p,use)=>{if(!use(10))return;ST.cd=22;let x=a.h.x,y=a.h.y,vx=a.dx*8,vy=a.dy*8,k=0,b=3;const hit=new Set();fxWord(p.x,p.y-ST.PH-6,'FORE!',.9,'#ffb070',true);
    ACT.push(()=>{k++;for(let s=0;s<4;s++){const nx=x+vx/4,ny=y+vy/4,solid=(X,Y)=>X<1||X>=W-1||Y>=H-2||Y>=0&&KIND[t[(Y|0)*W+(X|0)]]===S;
        if(solid(nx,ny)){carve(nx,ny,3,vx,vy);if(--b<0)return false;if(solid(nx,y))vx=-vx;else vy=-vy;snd('punch',nx,ny,{v:.4,pitch:1.6});break;}x=nx;y=ny;}
      vy+=.05;for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-x)<e.def.w/2+4&&Math.abs(e.y-y)<e.def.h/2+4){hit.add(e);hitEnemy(e,20,vx*.6,vy*.6-1);}
      const an=k*.5,c=Math.cos(an)*5;beams.push({x0:x-c,y0:y-1,x1:x+c,y1:y+1,life:2,w:1,c:[150,150,160],g:[90,90,100]});return k<120;});}},
  // a bear hug: squeezed until something cracks, then tossed
  {n:'Bear Hug',fn:(a,p,use)=>{const e=nearestEnemy(p.x+p.face*12,p.y-ST.PH/2,30);if(!e||fig8(e)){fxWord(p.x,p.y-ST.PH-6,"NOTHIN' TO HUG",.7,'#ffb070',true);return;}if(!use(14))return;ST.cd=40;let k=0;const f=p.face;fxWord(p.x,p.y-ST.PH-10,"C'MERE, YA BUM!",.9,'#ffb070',true);
    ACT.push(()=>{k++;p.script=2;if(e.hp<=0)return false;e.x=p.x+f*(ST.PW/2+e.def.w/2-2);e.y=p.y-ST.PH/2;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);p.punchF=4;
      if(k%10===0){hitEnemy(e,8,0,0);fxWord(e.x,e.y-e.def.h/2-4,'*CRACK*',.6,'#ffb070',true);ST.shake=Math.max(ST.shake,3);}if(k<60)return true;e.frozen=0;e.vx=f*8;e.vy=-5;e.thrownT=60;hitEnemy(e,16,0,0);return false;});}},
 ],
 // ================= SILVER SURFER =================
 surfer:[
  // he throws the board: it boomerangs through everything and comes back to his hand
  {n:'Board Throw',fn:(a,p,use)=>{if(p.boardOut||!use(14))return;ST.cd=30;p.boardOut=true;let x=a.h.x,y=a.h.y,vx=a.dx*10,vy=a.dy*10,k=0;const hit=new Set();
    ACT.push(()=>{k++;if(k>16){const h=hand(),dx=h.x-x,dy=h.y-y,d=Math.hypot(dx,dy)||1;vx+=(dx/d*11-vx)*.2;vy+=(dy/d*11-vy)*.2;if(k===17)hit.clear();if(d<10){p.boardOut=false;return false;}}
      const lx=x,ly=y;x+=vx;y+=vy;sliceLine(lx,ly,x,y,{edge:[230,250,255],quiet:true,push:1.2});const an=k*.6,c=Math.cos(an)*8,s=Math.sin(an)*2;beams.push({x0:x-c,y0:y-s,x1:x+c,y1:y+s,life:2,w:1,c:[235,245,255],g:[120,200,255]});
      for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-x)<e.def.w/2+5&&Math.abs(e.y-y)<e.def.h/2+5){hit.add(e);hitEnemy(e,24,vx*.4,vy*.4);}if(k>90){p.boardOut=false;return false;}return true;});}},
 ],
 // ================= one more each for the fourteen-power heroes =================
 doom:[
  {n:'Kneel Before Doom',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const r=130*ST.aoeC;let n=0;fxWord(p.x,p.y-ST.PH-14,'KNEEL BEFORE DOOM!',1.2,'#8dffb0',true);rings.push({x:p.x,y:p.y-8,r:6,vr:5,life:20,c:[120,255,160]});
    for(const e of enemies){if(e.def.titan||Math.hypot(e.x-p.x,e.y-p.y)>r)continue;n++;e.vy=8;e.vx=0;applyStatus(e,'stun',120);hitEnemy(e,12,0,6);for(let j=0;j<5;j++)spawn(e.x+(R()-.5)*e.def.w,e.y-e.def.h/2,0,1.5,rgb(120,255,160),12,0,1,0,1);}
    if(!n)fxWord(p.x,p.y-ST.PH-26,'...NO ONE? PATHETIC.',.7,'#8dffb0',true);}},
 ],
 hulk:[
  {n:'The Madder Hulk Gets',fn:(a,p,use)=>{if(p.madder>0||!use(22))return;ST.cd=80;p.madder=360;p.sizeT=1.3;ST.buffT=Math.max(ST.buffT||0,ST.frame+360);let hp0=p.hp;fxWord(p.x,p.y-ST.PH-14,'THE MADDER HULK GETS...',1.1,'#7fff6a',true);snd('roar',p.x,p.y,{pitch:.6});
    ACT.push(()=>{if(--p.madder<=0||ST.CH.id!=='hulk'){if(ST.CH.id==='hulk')p.sizeT=1;p.madder=0;return false;}if(p.hp<hp0){p.en=Math.min(100,p.en+(hp0-p.hp)*.6);ST.buffT=Math.max(ST.buffT,ST.frame+90);}hp0=p.hp;
      if(ST.frame%4===0)spawn(p.x+(R()-.5)*ST.PW*1.4,p.y-R()*ST.PH,(R()-.5)*.4,-.8,rgb(140,255,120),14,0,1,0,1);return true;});}},
 ],
 thor:[
  {n:'Lightning Body',fn:(a,p,use)=>{if(p.lbody>0||!use(24))return;ST.cd=70;p.lbody=300;fxWord(p.x,p.y-ST.PH-12,'GOD OF THUNDER!',1.1,'#9ec8ff',true);
    ACT.push(()=>{if(--p.lbody<=0||ST.CH.id!=='thor'){p.lbody=0;return false;}const cx=p.x,cy=p.y-ST.PH/2;if(ST.frame%8===0){const e=nearestEnemy(cx,cy,70);if(e){zap(cx,cy,e.x,e.y,[230,240,255],[120,170,255]);tagged('shock',()=>hitEnemy(e,10,0,0));}}
      if(ST.frame%3===0)zap(cx,cy,cx+(R()-.5)*16,cy+(R()-.5)*20,[230,240,255],[120,170,255]);return true;});}},
 ],
 iron:[
  {n:'Target Lock',fn:(a,p,use)=>{const list=nearestN(p.x,p.y,260,6);if(!list.length){noTarget('#ff7a5c');return;}if(!use(22))return;ST.cd=45;let k=0;fxWord(p.x,p.y-ST.PH-10,'TARGETS ACQUIRED',.9,'#bfe3ff',true);
    ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;if(k%3===0)rings.push({x:e.x,y:e.y,r:Math.max(3,Math.max(e.def.w,e.def.h)/2+6-k*.15),vr:0,life:3,c:[255,80,60]});}if(k<30)return true;
      const h=hand();for(const e of list){if(e.hp<=0)continue;beams.push({x0:h.x,y0:h.y,x1:e.x,y1:e.y,life:6,w:1,c:[255,255,255],g:[120,200,255]});hitEnemy(e,24,0,-1);flash(e.x,e.y,12,[150,220,255],4);}snd('zap',h.x,h.y);return false;});}},
 ],
 wolverine:[
  {n:'X-Slash',fn:(a,p,use)=>{if(!use(12))return;ST.cd=26;const f=p.face,cx=p.x+f*24,cy=p.y-ST.PH/2,L=34;let k=0;
    ACT.push(()=>{k++;if(k===1||k===6){const s=k===1?1:-1,x0=cx-L*.7,y0=cy-s*L*.7,x1=cx+L*.7,y1=cy+s*L*.7;sliceLine(x0,y0,x1,y1,{edge:[230,232,240],push:1.2});damageLine(x0,y0,x1,y1,6,16);fxSlash(cx,cy,Math.atan2(y1-y0,x1-x0),L,[230,232,240]);snd('slash',cx,cy);}
      if(k===6){damageLine(cx-L*.6,cy,cx+L*.6,cy,5,12);fxWord(cx,cy-24,'SNIKT-SNIKT!',1,'#ffd34a',true);}return k<8;});}},
 ],
 cyclops:[
  {n:'Optic Pinball',fn:(a,p,use)=>{const e0=atCursor(90);if(!e0){noTarget('#ff7a5c');return;}if(!use(18))return;ST.cd=36;let prev={x:a.h.x,y:a.h.y},e=e0,k=0;const hit=new Set();
    ACT.push(()=>{k++;if(k%4!==1)return k<40;if(!e||e.hp<=0)return false;beams.push({x0:prev.x,y0:prev.y,x1:e.x,y1:e.y,life:5,w:2,c:[255,220,200],g:[255,40,40]});hitEnemy(e,20,0,-1);flash(e.x,e.y,10,[255,60,60],3);hit.add(e);prev={x:e.x,y:e.y};
      e=nearestN(e.x,e.y,140,8).find(o=>!hit.has(o));return hit.size<7;});}},
 ],
 iceman:[
  {n:'Glacial Armor',fn:(a,p,use)=>{if(p.shell>0||!use(24))return;ST.cd=70;p.shell=300;fxWord(p.x,p.y-ST.PH-10,'ICE ARMOR!',1,'#bfe3ff',true);
    ACT.push(()=>{if(!(p.shell>0)||ST.CH.id!=='iceman')return false;const cx=p.x,cy=p.y-ST.PH/2;if(ST.frame%3===0)spawn(cx+(R()-.5)*12,cy+(R()-.5)*ST.PH,0,.2,rgb(200,240,255),12,0,1,0,1);
      if(ST.frame%10===0)tagged('ice',()=>{for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<24+e.def.w/2){applyStatus(e,'chill',40);hitEnemy(e,5,(e.x-cx)*.1,-1);}});return true;});}},
 ],
 jean:[
  // a psychic link: whatever one of them feels, the others feel too
  {n:'Mind Link',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,140,5);if(list.length<2){noTarget('#ff9ad8','NEED TWO MINDS');return;}if(!use(22))return;ST.cd=60;const hp=new Map(list.map(e=>[e,e.hp]));let k=0;fxWord(mouse.wx,mouse.wy-30,'ONE MIND',1,'#ff9ad8',true);
    ACT.push(()=>{k++;const loss=new Map();let pool=0;for(const e of list){const d=Math.max(0,hp.get(e)-e.hp);loss.set(e,d);pool+=d;}
      if(pool>0)for(const e of list)if(e.hp>0){const share=(pool-loss.get(e))*.6;if(share>0){e.hp-=share;e.flash=3;}}
      for(const e of list)hp.set(e,e.hp);if(k%4===0){const live=list.filter(e=>e.hp>0);for(let j=1;j<live.length;j++)beams.push({x0:live[j-1].x,y0:live[j-1].y,x1:live[j].x,y1:live[j].y,life:4,w:0,c:[255,190,230],g:[220,60,160]});}return k<420&&list.some(e=>e.hp>0);});}},
 ],
 storm:[
  {n:'Waterspout',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const cx=mouse.wx,gy=groundBelow(mouse.wx|0,mouse.wy),h=90;let k=0;fxWord(cx,gy-h-6,'WATERSPOUT!',1,'#bfe3ff',true);
    ACT.push(()=>{k++;for(let j=0;j<6;j++){const yy=gy-R()*h,w=4+(gy-yy)*.12;spawn(cx+(R()-.5)*w*2,yy,(R()-.5)*.5,-1.5-R(),R()<.6?rgb(120,170,240):rgb(220,235,255),16,0,0,0,1);}
      for(const e of enemies)if(Math.abs(e.x-cx)<16+e.def.w/2&&e.y>gy-h-20&&e.y<gy+4){applyStatus(e,'wet',300);if(!e.def.titan){e.vy=Math.min(e.vy,-1.6);e.vx+=(cx-e.x)*.05+Math.sin(k*.3)*.6;}if(k%12===0)hitEnemy(e,5,0,0);}
      if(k<120)return true;for(let j=0;j<50;j++){const X=cx+(R()-.5)*30|0,Y=gy-h+R()*20|0;if(X>=0&&X<W&&Y>=0&&Y<H&&!t[Y*W+X])setc(Y*W+X,WATER);}return false;});}},
 ],
 venom:[
  {n:'Symbiote Snare',fn:(a,p,use)=>{if(!use(16))return;ST.cd=36;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7-1,grav:.15,type:'goo',life:80,col:[40,40,60],boom:0,onHit:s=>{const x=s.x,y=s.y;fxWord(x,y-14,'GOTCHA.',.9,'#c8c8ff',true);
    summons.push({x,y,life:360,upd(o){for(const e of enemies){if(e.def.titan)continue;const dx=o.x-e.x,dy=o.y-e.y,d=Math.hypot(dx,dy)||1;if(d<34){e.vx+=dx/d*.4;e.vy+=dy/d*.3;e.webbed=Math.max(e.webbed||0,10);if(o.t%20===0)hitEnemy(e,4,0,0);}}
      if(o.t%3===0){const an=R()*6.283;spawn(o.x+Math.cos(an)*16,o.y+Math.sin(an)*6,-Math.cos(an)*.4,-Math.sin(an)*.2,rgb(30,30,44),14,0,0,0,1);}},draw:drawSnare});}});}},
 ],
 panther:[
  {n:'Panther Prowl',fn:(a,p,use)=>{if(p.prowl>0||!use(18))return;ST.cd=70;p.prowl=300;p.stealth=300;p.lastSeen={x:p.x,y:p.y-8};ST.buffT=Math.max(ST.buffT||0,ST.frame+300);fxWord(p.x,p.y-ST.PH-8,'*PROWLS*',.8,'#c8a0ff',true);
    ACT.push(()=>{if(--p.prowl<=0||ST.CH.id!=='panther'){p.prowl=0;return false;}if(p.ground&&Math.abs(p.vx)>1)p.vx=Math.max(-4.5,Math.min(4.5,p.vx*1.04));if(ST.frame%5===0)spawn(p.x,p.y-2,0,-.2,rgb(150,100,230),10,0,1,0,1);return true;});}},
 ],
 cap:[
  {n:'Shield Surf',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;const f=a.dx<0?-1:1,hit=new Set();let k=0;fxWord(p.x,p.y-ST.PH-8,'SHIELD SURF!',.9,'#e6e6f2',true);
    ACT.push(()=>{k++;p.script=2;p.face=f;carve(p.x+f*8,p.y-ST.PH/2,ST.PH*.4,f*4,-1);const gy=surfaceY(p.x+f*5|0,Math.max(0,p.y-24|0),60);scriptMove(p,f*5.5,Math.max(-6,Math.min(4,gy-1-p.y)));
      for(let j=0;j<2;j++)spawn(p.x-f*4,p.y+1,-f*2,-R(),rgb(255,230,160),8,0,1,0,1);for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-(p.x+f*6))<e.def.w/2+6&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+ST.PH/2){hit.add(e);hitEnemy(e,20,f*6,-4);}return k<70;});}},
 ],
 marvel:[
  {n:'Goose the Flerken',fn:(a,p,use)=>{if(summons.some(s=>s.goose)||!use(24))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'GOOSE!',1,'#ffd36a',true);
    summons.push({goose:true,x:p.x,y:p.y,vy:0,face:p.face,cd:0,tent:0,tg:null,life:480,upd(s){s.vy+=.35;s.y+=s.vy;const gy=groundBelow(s.x|0,s.y-10);if(s.y>=gy){s.y=gy;s.vy=0;}if(s.cd>0)s.cd--;
      if(s.tent>0&&s.tg){s.tent--;for(let j=0;j<3;j++)beams.push({pts:[[s.x+s.face*7,s.y-6],[(s.x+s.tg.x)/2+(j-1)*6,(s.y+s.tg.y)/2-6],[s.tg.x,s.tg.y]],life:1,c:[255,170,200],g:[180,60,120]});}
      const e=nearestEnemy(s.x,s.y-6,220);if(!e){s.x+=(pl_.x-pl_.face*16-s.x)*.06;return;}s.face=e.x>s.x?1:-1;const d=Math.hypot(e.x-s.x,e.y-(s.y-6));
      if(d>30)s.x+=s.face*2;else if(s.cd<=0){s.cd=50;s.tent=14;s.tg=e;if(!e.def.titan&&e.hp<=90){e.hp=0;fxWord(e.x,e.y-10,'*GULP*',1,'#ffd36a',true);}else hitEnemy(e,22,s.face*3,-2);}},draw:drawGoose});}},
 ],
 rider:[
  {n:'Flaming Skull',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;let x=a.h.x,y=a.h.y,vx=a.dx*5,vy=a.dy*5,k=0,n=0,cd=0;fxWord(p.x,p.y-ST.PH-8,'LOOK INTO MY EYES',.8,'#ff9a3c',true);
    ACT.push(()=>{k++;const e=nearestEnemy(x,y,240);if(e){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;vx+=(dx/d*6-vx)*.12;vy+=(dy/d*6-vy)*.12;if(d<8&&cd<=0){tagged('fire',()=>hitEnemy(e,18,vx*.5,vy*.5));applyStatus(e,'burn',200);n++;cd=14;vx=-vx;vy=-vy-2;fxWord(e.x,e.y-12,'CHOMP',.8,'#ff9a3c',true);}}
      if(cd>0)cd--;x+=vx;y+=vy;for(let j=0;j<3;j++)spawn(x+(R()-.5)*4,y-2,(R()-.5)*.5,-1,R()<.5?rgb(255,200,60):rgb(255,90,20),10,0,1,0,1);for(const [ox,oy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[0,1]])spawn(x+ox,y+oy,0,0,rgb(240,236,220),2,0,0,0,0);
      return n<4&&k<220;});}},
 ],
 pool:[
  {n:'Unicorn Charge',fn:(a,p,use)=>{if(summons.some(s=>s.uni)||!use(24))return;ST.cd=70;const dir=a.dx<0?-1:1;fxWord(p.x,p.y-ST.PH-10,'MAGICAL!',1.1,'#ff9ad8',true);const RB=[[255,60,60],[255,160,40],[255,240,60],[60,220,90],[60,140,255],[170,80,255]];
    summons.push({uni:true,x:Math.max(10,Math.min(W-10,p.x-dir*60)),y:p.y,face:dir,life:140,upd(s){s.x+=s.face*5.5;s.y=groundBelow(s.x|0,s.y-24);carve(s.x+s.face*14,s.y-12,9,s.face*4,-1,s.y);damageEnemies(s.x+s.face*12,s.y-14,16,14,s.face*7,-6);
      for(let j=0;j<6;j++)spawn(s.x-s.face*10,s.y-14+j*1.5,-s.face*.5,0,rgb(...RB[j]),30,0,1,0,0);if(s.x<4||s.x>W-4)return false;},draw:drawUni});}},
 ],
};

// put part A's and part B's powers on each hero's bar, ahead of the ultimate (which stays last for G)
export function applyKits3(CHARS){for(const c of CHARS){const ex=[...(EXTRA3A[c.id]||[]),...(EXTRA3B[c.id]||[])];if(!ex.length)continue;
  for(const pw of ex)if(!c.powers.some(o=>o.n===pw.n))c.powers.push(pw);
  markUlt(c);const u=c.powers.findIndex(pw=>pw.ult);if(u>=0&&u!==c.powers.length-1){const [pw]=c.powers.splice(u,1);c.powers.push(pw);}}}
