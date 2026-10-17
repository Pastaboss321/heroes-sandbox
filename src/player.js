// Player state (pl_), input state, movement, hurt, camera.
import './heroes/magneto.js'; // evaluation order: runs after heroes/magneto.js
import { ST } from './state.js';
import { ACID, DENS, EMPTY, F, FIRE, G, GLASS, ICE, KIND, L, LAVA, LEAF, OBSID, PROPANE, R, RUBBLE, S, STEEL, WOOD, rgb } from './world/materials.js';
import { H, N, VH, VW, W, booms, col, setc, t } from './world/grid.js';
import { pvx, pvy, px, py, solidAt, spawn } from './world/particles.js';
import { afters, flash, fxBurst, fxWord, rings } from './render/fx.js';
import { bgHit, explode, punchOut, shade } from './world/destruction.js';
import { ANIM, aimLocal, armLen, armMode } from './render/rig.js';
import { snd } from './sfx.js';
import { GAMMA, SPAWN, aim, pickC, quake } from './heroes/powers.js';
import { aimFrom, slashFx } from './heroes/xmen.js';
import { PAL_DOOM, SPR_DOOM } from './heroes/doom.js';
import { opticThrust } from './heroes/cyclops.js';
import { iceSlideStep } from './heroes/iceman.js';
import { ray } from './heroes/wave2.js';
import { damageEnemies, hitEnemy, nearestEnemy } from './enemies/core.js';

ST.SPR=SPR_DOOM;ST.SPC=PAL_DOOM; // SZ: Ant-Man's current size (1 = normal)
export const pl_={x:60,y:100,vx:0,vy:0,face:1,hp:100,en:100,ground:false,slam:false,fly:false,coyote:0,buffer:0,lastJump:-99,jumpHeldF:0,boost:0,boostCd:0,bob:0,hist:[],airF:0,ang:0,charge:0,chargeCd:0,leap:false,slamOpt:null,hurtF:0};
export function boxHit(x,y){for(let yy=Math.ceil(y-ST.PH);yy<=Math.floor(y-1);yy++)for(let xx=Math.floor(x-ST.PW/2);xx<=Math.floor(x+ST.PW/2);xx++)if(solidAt(xx,yy))return true;return false;}
// SPAWNX: shared state (ST in state.js)
export function spawnPlayer(){
  const x=pl_.x=ST.SPAWNX+R()*30|0;let y=0;while(y<H-1&&!solidAt(x,y))y++;pl_.y=y-1;pl_.vx=pl_.vy=0;pl_.hp=ST.CH.hp;pl_.en=100;pl_.fly=false;pl_.slam=false;pl_.leap=false;
  ST.camX=Math.max(0,Math.min(W-VW,pl_.x-VW/2));ST.camY=Math.max(0,Math.min(H-VH,pl_.y-VH/2));
}
export const keys={}, pressed={};
export const mouse={sx:VW/2,sy:VH/2,wx:0,wy:0,down:false,right:false};
// CH: shared state (ST in state.js)
export const glowRGB=()=>rgb(ST.CH.glow[0],ST.CH.glow[1],ST.CH.glow[2]);
export function toggleFly(on){const p=pl_;if(on&&!ST.CH.fly)return;p.fly=on;p.slam=false;if(on){p.vy=Math.min(p.vy,-1.2);rings.push({x:p.x,y:p.y-ST.PH/2,r:3,vr:1.6,life:12,c:ST.CH.glow});for(let k=0;k<20;k++){const a=R()*6.283;spawn(p.x,p.y,Math.cos(a)*1.5,Math.sin(a)*.6+.5,ST.CH.thrust(),14,0,1,0,1);}}}
// shared terrain carving used by boost-ramming, Hulk's charge and Thor's hammer
export function carve(cx,cy,r,vx,vy,floorY=H){
  bgHit(cx,cy,r);
  const ri=Math.ceil(r);
  for(let y=-ri;y<=ri;y++)for(let x=-ri;x<=ri;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H||Y>=floorY)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F)continue;
    if(m===STEEL&&R()<.5||m===OBSID&&R()<.5)continue;
    if(R()<.4)spawn(X,Y,vx*.6+(R()-.5)*3,vy*.6+(R()-.5)*3-1,col[i],70,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);
    if(m===PROPANE)booms.push([X,Y,6]);
    setc(i,EMPTY);}
}
function bore(p,sp){
  const r=Math.min(9,6+(sp-ST.CH.fs)*.8);
  carve(p.x+p.vx/sp*4,p.y-ST.PH/2+p.vy/sp*4,r,p.vx,p.vy);
  damageEnemies(p.x,p.y-ST.PH/2,r+6,3,p.vx*.5,p.vy*.5);
  if(ST.frame%3===0)ST.shake=Math.max(ST.shake,2.5);
}
export function hurt(d){
  const p=pl_;if(d<=0)return;
  if(p.dodge>0||p.script>0||p.surge>0)return; // mid-dash, mid-leap, rolling, Crimson Surge: untouchable
  if(p.shell>0)d*=.2; // Ultron's adamantium shell
  if(p.sense>0&&R()<.7){p.vx+=(R()<.5?-1:1)*2.2;for(let k=0;k<6;k++)spawn(p.x,p.y-ST.PH/2,(R()-.5)*3,(R()-.5)*3,rgb(240,240,250),8,0,1,0,1);if(ST.frame-(p.dodgeW||-99)>30){p.dodgeW=ST.frame;fxWord(p.x,p.y-ST.PH-6,'DODGED!',.7,'#f3e9d2',true);}return;}
  if(ST.SZ<.8)d*=.6;
  if(SPAWN.god)return;
  if(ST.shieldOn){for(let k=0;k<4;k++)spawn(p.x+(R()-.5)*30,p.y-8+(R()-.5)*30,(R()-.5)*2,(R()-.5)*2,glowRGB(),10,0,1,0,1);return;}
  if(p.metal>0){for(let k=0;k<5;k++)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,(R()-.5)*3,-R()*2,rgb(255,240,200),8,0,1,1);return;}
  if(p.rage>0||p.eye>0)d*=.5;
  if(p.grit>0){const dd=d*ST.CH.armor;p.gritD+=dd;p.hp=Math.max(1,p.hp-dd);p.hurtF=8;ST.hurtV=Math.min(1,ST.hurtV+dd/40);ST.shake=Math.max(ST.shake,2);snd('hurt',p.x,p.y,{gap:.14,v:.5});
    for(let k=0;k<4;k++)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,(R()-.5)*2,-R()*2,rgb(255,60+R()*60|0,40),12,0,1,0,1);return;}
  p.hp-=d*ST.CH.armor;p.hurtF=8;ST.hurtV=Math.min(1,ST.hurtV+d*ST.CH.armor/30);ST.shake=Math.max(ST.shake,2);snd('hurt',p.x,p.y,{gap:.14,v:Math.min(1,.4+d/20)});
}
export function updPlayer(){
  const p=pl_;
  const ax=(keys.KeyD?1:0)-(keys.KeyA?1:0), ay=(keys.KeyS?1:0)-((keys.KeyW||keys.Space)?1:0);
  const jumpP=pressed.KeyW||pressed.Space, jumpH=keys.KeyW||keys.Space, shiftP=pressed.ShiftLeft||pressed.ShiftRight, shiftH=keys.ShiftLeft||keys.ShiftRight;
  const FS=ST.CH.fs, BOOST=ST.CH.boost;
  if(pressed.KeyF&&ST.CH.id!=='spidey')toggleFly(!p.fly);
  if(ST.CH.id==='spidey'){ // F: shoot a web line at the cursor and swing on it; W/S reel in/out
    if(pressed.KeyF){const h=hand(),a=aimFrom(h),r=ray(h.x,h.y,a.dx,a.dy,180);if(r.hit){p.web={x:r.x,y:r.y,L:Math.max(14,Math.hypot(r.x-p.x,r.y-p.y+ST.PH/2))};snd('whoosh',r.x,r.y,{pitch:1.9,v:.4});}}
    if(!keys.KeyF&&p.web){p.web=null;p.grip=null;if(!p.ground)p.vy=Math.min(p.vy,p.vy-1);}}
  if(ST.CH.id==='cyclops')opticThrust(p,keys.KeyF,ax);
  if(p.boostCd>0)p.boostCd--; if(p.chargeCd>0)p.chargeCd--; if(p.hurtF>0)p.hurtF--;
  if(p.metal>0)p.metal--; if(p.wings>0)p.wings--;
  if(p.metal>0&&!p.ground&&p.vy>3)carve(p.x,p.y+2,4,0,p.vy,H); // adamantium cannonball through the floor
  if(p.wings>0){damageEnemies(p.x,p.y-ST.PH/2,10,3,0,0,true);for(let k=0;k<4;k++){const side=k&1?1:-1,u=R(),wx=p.x-p.face*2+side*(4+u*16),wy=p.y-ST.PH*.7-Math.sin(u*3)*6+u*4;spawn(wx,wy,side*.4-p.vx*.2,-.3,R()<.5?rgb(255,170,50):rgb(255,90,30),12,R()<.02?FIRE:0,1,0,1);}}
  if(p.thrustF>0)p.thrustF--; if(ST.senseT>0)ST.senseT--; if(p.spin>0)p.spin--; if(p.eye>0)p.eye--;
  if(p.dodge>0)p.dodge--; if(p.stealth>0)p.stealth--; if(p.sense>0)p.sense--; if(p.shell>0)p.shell--;
  if(p.surge>0){p.surge--;damageEnemies(p.x,p.y-ST.PH/2,ST.PW+6,1.2,p.face*1.5,-.5);if(ST.frame%2===0)spawn(p.x+(R()-.5)*14,p.y-R()*ST.PH,(R()-.5)*.5,-.8,rgb(255,40+R()*40|0,30),12,0,1,0,1);}
  if(p.ant>0){p.ant--;p.fly=true;if(p.ant===0){p.fly=false;fxWord(p.x,p.y-ST.PH-6,'BYE, ANT-THONY',.7,'#ff6b5c',true);}}
  if(ST.CH.id==='antman'){ // Pym particles: ease toward the target size, the hitbox follows
    const ts=p.sizeT||1;if(Math.abs((p.size||1)-ts)>.01){const grow=ts>(p.size||1);p.size=(p.size||1)+(ts-(p.size||1))*.15;if(Math.abs(p.size-ts)<.02)p.size=ts;
      ST.PW=Math.max(3,Math.round(ST.CH.pw*Math.min(1.6,p.size)));ST.PH=Math.max(8,Math.round(ST.CH.ph*p.size));if(grow&&boxHit(p.x,p.y))punchOut(p);}
    ST.SZ=p.size||1;if(ts>1.5){p.en-=.16;if(p.en<=1){p.sizeT=1;fxWord(p.x,p.y-ST.PH-6,'OUT OF PYM PARTICLES',.8,'#ff6b5c',true);}}
    if(ST.SZ>1.5&&p.ground&&Math.abs(p.vx)>.4&&ST.frame%3===0){carve(p.x+p.face*(ST.PW/2+3),p.y-ST.PH*.5,ST.PH*.32,p.vx,0,Math.floor(p.y));damageEnemies(p.x+p.face*ST.PW,p.y-ST.PH/2,ST.PH*.4,6,p.face*3,-2);if(ST.frame%18===0){ST.shake=Math.max(ST.shake,4);snd('stomp',p.x,p.y);}}}
  if(p.grit>0){p.grit--;if(ST.frame%3===0)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,(R()-.5)*.5,-.8,rgb(255,40+R()*80|0,30),14,0,1,0,1);
    if(p.grit===0&&ST.CH.id==='wolverine'){const h=p.gritD*.6;p.hp=Math.min(ST.CH.hp,p.hp+h);fxWord(p.x,p.y-ST.PH-8,'+'+(h|0)+' HP',1,'#ffc93c',true);}}
  if(p.castF>0)p.castF--; if(p.recoilF>0)p.recoilF--; if(p.landF>0)p.landF--; if(p.punchF>0)p.punchF--; if(p.throwF>0)p.throwF--;
  if(ST.CH.id==='wolverine'&&p.hp<ST.CH.hp)p.hp=Math.min(ST.CH.hp,p.hp+.12); // healing factor never stops
  if(p.rage>0){p.rage--;if(ST.CH.id==='wolverine'&&ST.frame%8===0){const e=nearestEnemy(p.x,p.y-ST.PH/2,22);if(e){hitEnemy(e,14,p.face*2,-1);slashFx(e.x,e.y,Math.atan2(e.y-p.y,e.x-p.x));}}if(ST.frame%2===0)spawn(p.x+(R()-.5)*12,p.y-R()*ST.PH,(R()-.5)*.5,-.6,ST.CH.id==='hulk'?pickC(GAMMA):rgb(255,60+R()*60,40),12,0,1,0);}
  if(p.script>0){p.script--;p.ground=false;p.hist.unshift([p.x,p.y]);if(p.hist.length>12)p.hist.pop();return;} // a power is steering the hero (Meteor Drop, Wrecking Ball, Puny God...)
  { // walk cycle phase; a puff of dust (and a thud for Hulk) on every footfall
    const w=p.ground&&!p.fly&&Math.abs(p.vx)>.3;const prev=p.walkPh||0;p.walkPh=w?prev+Math.abs(p.vx)*.3:0;
    if(w&&Math.floor(p.walkPh/Math.PI)!==Math.floor(prev/Math.PI)){for(let k=0;k<(ST.CH.id==='hulk'?6:3);k++)spawn(p.x-p.face*2+(R()-.5)*4,p.y-1,(R()-.5)*1.2-p.vx*.2,-R()*.8,rgb(150,140,125),14+R()*8,0,0,0,1);if(ST.CH.id==='hulk')ST.shake=Math.max(ST.shake,1.2);snd(ST.CH.id==='hulk'?'stomp':'step',p.x,p.y,{v:ST.CH.id==='hulk'?.8:.35});}
  }
  if(ST.CH.fly&&shiftP&&p.boostCd===0){
    if(!p.fly)toggleFly(true);
    p.boost=22;p.boostCd=34;rings.push({x:p.x,y:p.y-ST.PH/2,r:4,vr:3,life:14,c:ST.CH.glow});flash(p.x,p.y-ST.PH/2,30,ST.CH.glow,6);ST.shake+=3;
    const d=Math.hypot(ax,ay)||1, bx=ax||ay?ax/d:p.face, by=ax||ay?ay/d:0; p.vx=bx*FS*BOOST; p.vy=by*FS*BOOST;
  }
  if(!ST.CH.fly&&shiftP&&p.chargeCd===0){p.charge=28;p.chargeCd=40;if(ax)p.face=ax;rings.push({x:p.x,y:p.y-ST.PH/2,r:4,vr:2.5,life:12,c:ST.CH.glow});ST.shake+=3;}
  // holding Shift keeps the boost (and terrain boring) going indefinitely
  if(p.fly&&shiftH&&p.boost>0)p.boost=Math.max(p.boost,2);
  if(!ST.CH.fly&&shiftH&&p.charge>0)p.charge=Math.max(p.charge,2);
  if(!p.fly)p.boost=0;
  if(p.fly){
    // free flight: velocity eases toward input direction; light easing on release = glide → hover
    let dx=ax,dy=ay;const mag=Math.hypot(dx,dy);if(mag>0){dx/=mag;dy/=mag;}
    const boosting=p.boost>0, spd=FS*(boosting?BOOST:1)*(p.wings>0?1.7:1);
    if(boosting&&mag===0){const s=Math.hypot(p.vx,p.vy)||1;dx=p.vx/s;dy=p.vy/s;}
    const k=boosting?.25:mag>0?.2:.06;
    p.vx+=(dx*spd-p.vx)*k; p.vy+=(dy*spd-p.vy)*k;
    if(mag===0&&!boosting&&Math.hypot(p.vx,p.vy)<.3){p.bob+=.09;p.vy+=Math.sin(p.bob)*.02;}
    if(ax)p.face=ax;
    if(boosting){p.boost--;if(ST.frame%3===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:14});}
    const sp=Math.hypot(p.vx,p.vy);
    p.boring=sp>FS*1.25; if(p.boring)bore(p,sp);
    if(ST.frame%2===0)spawn(p.x-p.vx*2+(R()-.5)*3,p.y-4-p.vy*2,-p.vx*.3+(R()-.5)*.5,-p.vy*.3+.4,ST.CH.thrust(),8+R()*8,0,1,0,1);
    if(ST.CH.id==='iron'&&ST.frame%2===0)for(const fx of [-2,2])spawn(p.x+fx,p.y,(R()-.5)*.4+p.vx*-.2,1.5+R(),R()<.5?rgb(255,220,150):rgb(255,255,255),6,0,1,0);
    const target=ST.CH.id==='iceman'?p.vx*.09:sp>1.2?Math.atan2(p.vx,-p.vy)*.85:p.vx*.15;
    if(ST.CH.id==='iceman')iceSlideStep(p);
    p.ang+=(target-p.ang)*.2;
    if(ay>0&&p.ground&&!boosting){ // touch down
      if(sp>2.5)superLand(p,sp); toggleFly(false); p.ang=0;
    }
  } else {
    p.ang*=.7;
    if(p.ground)p.coyote=7;else if(p.coyote>0)p.coyote--;
    const wolf=ST.CH.id==='wolverine',hulk=ST.CH.id==='hulk';
    if(jumpP&&!(wolf&&p.cling)){
      if(ST.CH.fly&&!p.ground&&ST.frame-p.lastJump<16){toggleFly(true);}
      else p.buffer=8;
      p.lastJump=ST.frame;
    }
    if(p.buffer>0)p.buffer--;
    if(!p.fly){
      if(p.ground){p.clap=1;p.airDash=1;}
      if(p.charge>0){ // Hulk shoulder-charge: plough through whatever is ahead
        p.charge--;p.vx=p.face*5.2;carve(p.x+p.face*5,p.y-ST.PH/2,ST.PH*.62,p.vx,0,p.ground||!keys.KeyS?Math.floor(p.y):H);damageEnemies(p.x+p.face*6,p.y-ST.PH/2,14,4,p.face*4,-2);
        if(ST.frame%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});ST.shake=Math.max(ST.shake,3);
      } else {
        // Wolverine's feral sprint: keep running and he keeps accelerating
        if(wolf){if(p.ground&&ax&&p.vx*ax>ST.CH.run*.8)p.sprint=Math.min(90,(p.sprint||0)+1);else if(p.ground)p.sprint=Math.max(0,(p.sprint||0)-(ax?2:6));}
        const sk=wolf?1+.7*Math.max(0,Math.min(1,((p.sprint||0)-24)/40)):1;
        const target=ax*ST.CH.run*sk*(ST.held&&ST.held.overhead?.6:1)*(p.rage>0||p.surge>0?1.6:1)*(p.crouch>6?.15:1)*(ST.SZ>1.5?1.15:ST.SZ<.8?1.1:1);
        if(p.ground)p.vx+=(target-p.vx)*(ax?.28:.35)*(p.onIce?.18:1);
        else if(p.leap)p.vx+=ax*.06; // big leaps keep their momentum; a little steering
        else if(ax&&!(Math.sign(p.vx)===ax&&Math.abs(p.vx)>Math.abs(target)))p.vx+=(target-p.vx)*(wolf?.2:hulk?.15:.12); // air control never brakes you below what you already have
        else if(!ax)p.vx*=.975;
        if(ax)p.face=ax;
        if(sk>1.3&&p.ground){if(ST.frame%4===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});if(ST.frame%2===0)spawn(p.x-p.face*3,p.y-1,-p.vx*.3+(R()-.5),-R()*.6,rgb(160,150,130),12,0,0,0,1);}
      }
      // ---- Hulk: hold S to crouch and charge, then jump = gamma leap toward the cursor; jump in mid-air = thunderclap double jump; S in mid-air = dive slam
      if(hulk&&!ST.held){
        if(p.ground&&keys.KeyS&&!p.charge){p.crouch=Math.min(66,(p.crouch||0)+1);
          if(p.crouch>6){const k=Math.min(1,(p.crouch-6)/50);if(ST.frame%3===0)rings.push({x:p.x,y:p.y-2,r:4+k*10,vr:-.4,life:6,c:GAMMA});if(ST.frame%2===0)spawn(p.x+(R()-.5)*12,p.y-1,(R()-.5)*.6,-R()*1.6*k,pickC(GAMMA),14,0,1,0,1);if(p.crouch===56){fxWord(p.x,p.y-ST.PH-6,'MAX!',.8,'#bff07a',true);snd('charge',p.x,p.y);}}}
        else if(!keys.KeyS)p.crouch=0;
        if(p.ground&&p.crouch>6&&jumpP){const k=Math.min(1,(p.crouch-6)/50),a=aimFrom({x:p.x,y:p.y-ST.PH/2});let dx=a.dx,dy=Math.min(a.dy,-.35);const d=Math.hypot(dx,dy);dx/=d;dy/=d;
          p.vx=dx*(4.5+3.5*k);p.vy=Math.min(-4.2,dy*(6.2+2.6*k)-2);p.leap=true;p.leapPow=k;p.ground=false;p.crouch=0;p.buffer=0;p.coyote=0;
          explode(p.x,p.y+1,4+k*5|0,{self:true,quiet:true,col:[200,190,160]});ST.shake+=3+k*5;for(let n=0;n<20+k*30;n++)spawn(p.x+(R()-.5)*10,p.y,(R()-.5)*4,-R()*2.5,rgb(160,150,130),24,0,0,0,1);
          fxWord(p.x,p.y-ST.PH-6,k>.8?'GAMMA LEAP!':'HUP!',.8+k*.5,'#bff07a',true);snd('leap',p.x,p.y,{size:k});}
        if(!p.ground&&jumpP&&p.coyote===0&&p.clap&&!p.slam){p.clap=0;p.buffer=0;p.vy=Math.min(p.vy,-5.4);p.clapF=10;
          const cx=p.x,cy=p.y+4;rings.push({x:cx,y:cy,r:3,vr:3.2,life:12,c:[230,255,220]},{x:cx,y:cy,r:2,vr:2,life:14,c:GAMMA});flash(cx,cy,34,[220,255,200],6);fxBurst(p.x,p.y-ST.PH*.6,26,'#bff07a');
          damageEnemies(cx,cy+6,26,16,0,5);for(let n=0;n<ST.np;n++){const dx=px[n]-cx,dy=py[n]-cy;if(dy>-6&&dy<60&&Math.abs(dx)<40){pvy[n]+=2;pvx[n]+=dx*.02;}}
          for(let n=0;n<40;n++){const an=Math.PI*.15+R()*Math.PI*.7;spawn(cx,cy,Math.cos(an)*(2+R()*3),Math.sin(an)*(2+R()*3),R()<.5?rgb(230,240,220):rgb(170,160,140),16+R()*12,0,0,0,1);}
          fxWord(p.x,p.y-ST.PH-4,'CLAP!',1,'#bff07a',true);ST.shake+=4;}
        if(!p.ground&&pressed.KeyS&&p.airF>5&&!p.slam){p.slam=true;p.slamOpt={col:GAMMA,dive:true};p.diveY=p.y;p.vy=Math.max(p.vy,5);p.leap=false;fxWord(p.x,p.y-ST.PH-6,'INCOMING!',.8,'#bff07a',true);}
      }
      // ---- Wolverine: claws into walls. Hold toward a wall in the air to cling; W climbs, S slides, Space kicks off
      if(wolf){
        const side=ax,touch=s=>boxHit(p.x+s*1.5,p.y-4)&&boxHit(p.x+s*1.5,p.y-ST.PH+4);
        if(!p.cling&&!p.ground&&side&&p.vy>-3.5&&touch(side)){p.cling=side;p.vx=0;snd('snikt',p.x,p.y,{v:.5});for(let k=0;k<6;k++)spawn(p.x+side*4,p.y-ST.PH*.6,-side*R()*1.5,(R()-.5)*1.5,rgb(255,240,200),8,0,1,1);}
        if(p.cling&&(p.ground||ax!==p.cling||!touch(p.cling)))p.cling=0;
        if(p.cling&&pressed.Space){p.vx=-p.cling*4.6;p.vy=-5.6;p.face=-p.cling;p.cling=0;p.buffer=0;p.sprint=40;
          fxWord(p.x,p.y-ST.PH-4,'HUP!',.7,'#f3e9d2',true);snd('whoosh',p.x,p.y,{v:.5});afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});
          for(let k=0;k<10;k++)spawn(p.x-p.face*4,p.y-ST.PH/2+(R()-.5)*8,-p.face*(1+R()*2),(R()-.5)*2,rgb(170,160,140),16,0,0,1);}
      }
      if(p.buffer>0&&p.coyote>0){p.vy=-ST.CH.jump;p.buffer=0;p.coyote=0;p.ground=false;snd('jump',p.x,p.y,{v:hulk?.8:.4,heavy:hulk});if(hulk){ST.shake+=2;for(let k=0;k<16;k++)spawn(p.x+(R()-.5)*8,p.y,(R()-.5)*3,-R()*1.5,rgb(160,150,130),20,0,0,0,1);}}
      if(!jumpH&&p.vy<-1.5&&!p.leap&&!p.clapF)p.vy*=.6; // jump cut
      if(ST.CH.fly&&!p.ground&&jumpH&&p.vy>0){p.jumpHeldF++;if(p.jumpHeldF>10)toggleFly(true);}else p.jumpHeldF=0;
      p.vy+=p.vy<0&&(jumpH||p.leap||p.clapF)?.24:.42;
      if(p.slam)p.vy=Math.max(p.vy,8);
      p.vy=Math.min(p.slam?10:6.5,p.vy);
      if(p.cling){ // clinging: claws gouge the wall as he climbs
        p.vy=keys.KeyW?-1.8:keys.KeyS?2.4:.35;p.vx=0;p.airF=0;
        if(ST.frame%(keys.KeyW||keys.KeyS?3:8)===0){const X=p.x+p.cling*(ST.PW/2+1)|0;for(let c=-1;c<=1;c++){const Y=p.y-ST.PH*.62+c*2.5|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
          if(m===STEEL||m===OBSID){spawn(X,Y,-p.cling*(R()*2),(R()-.5)*2,rgb(255,220,150),8,0,1,1);}
          else if(KIND[m]===S){if(m===GLASS||m===LEAF||m===WOOD&&R()<.5){spawn(X,Y,-p.cling*R(),R(),col[i],40,m===GLASS?0:RUBBLE,m===GLASS?1:0);setc(i,EMPTY);}else col[i]=shade(col[i],.62);}}
          if(keys.KeyW||keys.KeyS)snd('scrape',p.x,p.y,{v:.35});}}
      // ---- swimming: liquids buoy you and slow you down; hold jump to swim up, jump near the surface to leap out
      {let wet=0,liq=0;const nS=Math.max(1,Math.ceil((ST.PH-2)/4));for(let yy=p.y-ST.PH+2;yy<p.y;yy+=4){const i=(yy|0)*W+(p.x|0);if(i>=0&&i<N&&KIND[t[i]]===L){wet++;liq=t[i];}}
        const wf=wet/nS;
        if(wf>.2){if(!p.wet&&Math.abs(p.vy)>2){snd('splash',p.x,p.y-ST.PH/2,{v:Math.min(1,Math.abs(p.vy)/6)});for(let k=0;k<26;k++)spawn(p.x+(R()-.5)*ST.PW,p.y-ST.PH/2,(R()-.5)*3,-1-R()*3.5,col[((p.y-ST.PH/2)|0)*W+(p.x|0)]||rgb(60,110,210),40,0,0,1);}
          p.wet=1;const heavy=ST.CH.id==='hulk'?.75:1;p.vy-=.52*wf*Math.min(1.2,DENS[liq]/10)*heavy*(liq===LAVA?.35:1);p.vx*=.9;p.vy*=.9;
          if(jumpH)p.vy-=.3;if(keys.KeyS)p.vy+=.25;if(jumpP&&wf<.75){p.vy=-ST.CH.jump*.85;p.buffer=0;}p.airF=0;}
        else p.wet=0;}
      if(!p.ground)p.airF++;
    }
  }
  p.vx=Math.max(-8,Math.min(8,p.vx));p.vy=Math.max(-8,Math.min(10,p.vy));
  // move: x then y with step-up
  const wasGround=p.ground, fallV=p.vy;
  if(p.fly&&p.boring){p.x+=p.vx;p.y+=p.vy;p.ground=false;}else{
  let sx=Math.sign(p.vx),mx=Math.abs(p.vx);
  while(mx>0){const st=Math.min(1,mx),nx=p.x+sx*st;
    if(!boxHit(nx,p.y))p.x=nx;else if(!boxHit(nx,p.y-1))p.x=nx,p.y-=1;else if(!p.fly&&!boxHit(nx,p.y-2))p.x=nx,p.y-=2;
    else{ // Wolverine vaults anything up to waist-high instead of stopping dead
      if(ST.CH.id==='wolverine'&&!p.fly&&!p.cling&&!(p.vaultT>ST.frame)){for(let k=3;k<=13;k++)if(!boxHit(nx,p.y-k)&&!boxHit(p.x,p.y-k)){p.vy=Math.min(p.vy,-2.4-k*.22);p.vaultT=ST.frame+8;p.landF=3;break;}}
      p.vx=p.fly?p.vx*.3:p.vaultT>ST.frame?p.vx*.6:0;break;}
    mx-=st;}
  let sy=Math.sign(p.vy),my=Math.abs(p.vy);p.ground=false;
  while(my>0){const st=Math.min(1,my),ny=p.y+sy*st;
    if(!boxHit(p.x,ny))p.y=ny;else{if(sy>0)p.ground=true;p.vy=p.fly?p.vy*.3:0;break;}
    my-=st;}
  if(!p.ground&&p.vy>=0&&boxHit(p.x,p.y+1))p.ground=true;
  }
  if(ST.CH.id==='spidey'&&p.web){const w=p.web,dx=p.x-w.x,dy=p.y-ST.PH/2-w.y,d=Math.hypot(dx,dy)||1;
    if(keys.KeyW)w.L=Math.max(12,w.L-1.8);if(keys.KeyS)w.L=Math.min(230,w.L+1.8);
    if(d>w.L){const nx=dx/d,ny=dy/d,tx=w.x+nx*w.L,ty=w.y+ny*w.L+ST.PH/2;if(!boxHit(tx,ty)){p.x=tx;p.y=ty;}const vn=p.vx*nx+p.vy*ny;if(vn>0){p.vx-=vn*nx;p.vy-=vn*ny;}p.ground=false;}
    p.grip={x:w.x,y:w.y};}
  if(ST.CH.id==='spidey'&&!p.fly&&!p.web){ // crawl: stick to walls (W/S climb) and to ceilings (hold W)
    const s=(keys.KeyD?1:0)-(keys.KeyA?1:0),touch=k=>boxHit(p.x+k*1.5,p.y-4)&&boxHit(p.x+k*1.5,p.y-ST.PH+4);
    if(!p.ground&&s&&touch(s)){p.cling=s;}else if(p.cling&&(p.ground||!touch(p.cling)))p.cling=0;
    if(p.cling){p.vy=keys.KeyW?-2.3:keys.KeyS?2.3:-.42;p.vx=0;if(pressed.Space){p.vx=-p.cling*4.4;p.vy=-5.4;p.face=-p.cling;p.cling=0;}}
    p.ceil=!p.ground&&!p.cling&&keys.KeyW&&boxHit(p.x,p.y-1)?1:0;
    if(p.ceil){p.vy=-.6;p.airF=0;}}
  if(p.ground&&!wasGround&&!p.fly){
    p.landF=fallV>3?8:4;p.clapF=0;
    if(p.metal>0&&fallV>4)quake(p.x,p.y,{col:[200,206,216],r:24});
    if(p.slam){p.slam=false;const o=Object.assign({},p.slamOpt||{});if(o.dive)o.r=Math.min(46,16+Math.max(0,p.y-p.diveY)*.16|0);quake(p.x,p.y,o);p.leap=false;}
    else if(p.leap){p.leap=false;quake(p.x,p.y,{col:ST.CH.glow,r:p.leapPow!=null?18+p.leapPow*18|0:30});p.leapPow=null;}
    else if(fallV>(ST.CH.id==='hulk'?4.2:5.8))superLand(p,fallV);
    else snd('land',p.x,p.y,{v:Math.min(1,fallV/6)*(ST.CH.id==='hulk'?1:.5),heavy:ST.CH.id==='hulk'});
    p.airF=0;
  }
  if(p.clapF>0)p.clapF--;
  {const fi=((p.y+1)|0)*W+(p.x|0);p.onIce=p.ground&&fi>=0&&fi<N&&(t[fi]===ICE||t[fi-1]===ICE||t[fi+1]===ICE);}
  if(p.fly&&p.boring)p.y=Math.min(H-2,p.y);
  else if(boxHit(p.x,p.y)){if(!boxHit(p.x,p.y-1))p.y-=1;else if(!boxHit(p.x,p.y-2))p.y-=2;else punchOut(p);}
  p.x=Math.max(4,Math.min(W-4,p.x));if(p.y<ST.PH+1)p.y=ST.PH+1,p.vy=Math.max(0,p.vy);
  if(p.y>H+20)p.hp=0;
  // hazards
  let dmg=0;
  for(let yy=p.y-ST.PH|0;yy<p.y;yy+=3)for(let xx=p.x-3|0;xx<=p.x+3;xx+=2){if(yy<0||yy>=H)continue;const m=t[yy*W+xx];if(m===LAVA)dmg+=1.4;else if(m===ACID)dmg+=.6;else if(m===FIRE)dmg+=.25;}
  if(!ST.shieldOn&&p.boost<=0&&p.charge<=0&&!SPAWN.god)p.hp-=dmg*ST.CH.armor;
  if(p.grit>0&&p.hp<1)p.hp=1;
  if(SPAWN.inf)p.en=100;
  p.en=Math.min(100,p.en+(mouse.down?.12:.5));
  p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.0003);
  if(p.hp<=0){flash(p.x,p.y-8,40,[255,80,60],12);if(!(ST.MODE&&ST.MODE.onDeath&&ST.MODE.onDeath(ST.MS)))spawnPlayer();}
  p.hist.unshift([p.x,p.y]); if(p.hist.length>12)p.hist.pop();
}
function superLand(p,v){
  fxWord(p.x,p.y-ST.PH-8,'WHAM!',1.1,'#ffc93c',true);
  const big=ST.CH.id==='hulk';
  const r=Math.min(big?12:7,(big?4:2)+v*(big?1:.6)|0);
  explode(p.x,p.y+1,r,{self:true,col:big?[200,190,160]:null});
  for(let k=0;k<(big?60:30);k++){const d=R()<.5?-1:1;spawn(p.x+d*R()*6,p.y-1,d*(1+R()*3),-R()*1.5,rgb(170,160,140),20+R()*20,0,0,0,1);}
  rings.push({x:p.x,y:p.y,r:3,vr:2.5,life:14,c:ST.CH.glow});
  if(big)damageEnemies(p.x,p.y,r*3,20,0,-3);
  ST.shake=Math.min(22,ST.shake+v*(big?2:1.2));
}
export function hand(){
  const p=pl_,mode=ANIM[ST.CH.id]&&armMode(p);
  if(mode==='aim'||mode==='punch'||mode==='both'){const L=aimLocal(p),len=armLen(p,mode==='both'?'aim':mode)*ST.SZ;return{x:L.shx+L.wx*len,y:L.shy+L.wy*len};}
  return {x:p.x+p.face*(ST.PW/2+.5),y:p.y-ST.PH/2};
}

// ================= camera =================
// camX, camY: shared state (ST in state.js)
export function updCamera(){
  const p=pl_, a=aim();
  const sp=Math.hypot(p.vx,p.vy);
  const tx=p.x+a.dx*40+p.vx*14-VW/2, ty=p.y-8+a.dy*30+p.vy*12-VH/2;
  const k=Math.min(.35,.08*(1+sp/ST.CH.fs*2.6));
  ST.camX+=(tx-ST.camX)*k; ST.camY+=(ty-ST.camY)*k;
  ST.camX=Math.max(0,Math.min(W-VW,ST.camX)); ST.camY=Math.max(0,Math.min(H-VH,ST.camY));
  mouse.wx=ST.camX+mouse.sx; mouse.wy=ST.camY+mouse.sy;
}
