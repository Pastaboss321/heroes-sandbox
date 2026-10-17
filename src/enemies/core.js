// Enemy framework: defineEnemy, spawning, AI helpers, damage, waves.
import '../heroes/index.js'; // evaluation order: runs after heroes/index.js
import { ST } from '../state.js';
import { ACID, F, FIRE, G, GFIRE, KIND, L, LAVA, P, R, RUBBLE, S, WATER, rgb } from '../world/materials.js';
import { H, N, VW, W, t } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { bodyAt } from '../world/bodies.js';
import { MP, solidAt, spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { SPAWN, inStasis, shots } from '../heroes/powers.js';
import { SKY, hurt, pl_ } from '../player.js';
import { mapSel } from '../maps/index.js';

// ================= enemies =================
// Framework. To add an enemy type, call defineEnemy(name, def) — nothing else needs touching:
//   sprite  array of equal-length strings, '.' transparent; pal maps chars to rgb(); chars in
//           def.glow (default '*') also glow
//   hp, w, h        health and hitbox (centre-based, pixels)
//   fly             true: hovers (no gravity); false: walks, falls, steps up 2px ledges
//   score, boom     points on kill, death-explosion radius
//   think(e)        AI, called every tick. e has x,y,vx,vy,hp,face,t (age), cd (free timer), mem ({})
//                   Helpers: seek(e,x,y,speed,accel), pdist(e), player(), enemyShoot(e,opts),
//                   enemyBeam(e,opts), los(e,x,y)
//   onDeath(e)      optional extra effects (default death explosion + scrap always happens)
// Waves come from WAVES(n) → [[type,count],...]. spawnEnemy(type,x,y) spawns one directly.
export const ENEMY_TYPES={}, enemies=[], spawnQ=[];
// wave, kills, score: shared state (ST in state.js)
export function defineEnemy(name,def){ENEMY_TYPES[name]=Object.assign({name,hp:30,w:7,h:7,fly:true,score:10,boom:5,glow:'*',think:null,onDeath:null},def);}
export function spawnEnemy(name,x,y){
  const d=ENEMY_TYPES[name];if(!d||enemies.length>=48)return null;
  const e={def:d,x,y,vx:0,vy:0,hp:d.hp,face:-1,t:0,cd:30+R()*60|0,flash:0,ground:false,mem:{},team:d.team||null};
  enemies.push(e);for(let k=0;k<12;k++)spawn(x,y,(R()-.5)*2,(R()-.5)*2,rgb(255,90,70),12,0,1,0,1);return e;
}
// what enemy AI aims at: a puppet's chosen victim, Iceman's decoy, where a cloaked Iron Man was last seen, or the hero
export const player=()=>ST.AI_T||(ST.decoy?{x:ST.decoy.x,y:ST.decoy.y-ST.PH/2}:pl_.stealth>0&&pl_.lastSeen?pl_.lastSeen:{x:pl_.x,y:pl_.y-ST.PH/2});
export function pdist(e){const p=player();return Math.hypot(p.x-e.x,p.y-e.y);}
export function seek(e,x,y,sp,acc=.1){const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;e.vx+=(dx/d*sp-e.vx)*acc;e.vy+=(dy/d*sp-e.vy)*acc;}
export function los(e,x,y){const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;for(let s=e.def.w/2+1;s<d;s+=2){const X=e.x+dx/d*s|0,Y=e.y+dy/d*s|0;if(X<0||X>=W||Y>=H||Y<-SKY)return false;const k=KIND[t[Y*W+X]];if(k===S||k===P)return false;}return true;}
export function enemyShoot(e,o={}){
  if(SPAWN.peace&&ST.AI_ALLY!==e)return;
  if(e.hex>0&&R()<.45){explode(e.x|0,e.y|0,3,{quiet:true,self:true,col:[255,60,130]});hitEnemy(e,6,0,0);if(R()<.3)fxWord(e.x,e.y-10,'*JAM*',.6,'#ff6fa8');return;} // Bad Luck: the gun backfires
  const ex=e.x+(o.ox||0),ey=e.y+(o.oy||0),p=player(),lead=o.lead||0,tx=p.x+pl_.vx*lead,ty=p.y+pl_.vy*lead,dx=tx-ex,dy=ty-ey,d=Math.hypot(dx,dy)||1,sp=o.speed||3.5,spr=o.spread||.06;
  const a=Math.atan2(dy,dx)+(R()-.5)*spr*2,off=o.ox!==undefined||o.oy!==undefined?3:null;
  shots.push({x:off?ex+Math.cos(a)*3:e.x+Math.cos(a)*(e.def.w/2+2),y:off?ey+Math.sin(a)*3:e.y+Math.sin(a)*(e.def.h/2+2),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,type:'eshot',owner:ST.AI_ALLY===e?'ally':'enemy',src:e,team:e.team,life:o.life||200,dmg:o.dmg||7,col:o.col||[255,80,60],boom:o.boom||3,fire:o.fire||0});
  flash(e.x,e.y,8,o.col||[255,80,60],3);snd('eshot',e.x,e.y,{v:.55,gap:.03});
}
export function enemyBeam(e,o={}){
  if(SPAWN.peace&&ST.AI_ALLY!==e)return false;
  const ox=e.x+(o.ox||0),oy=e.y+(o.oy||0),p=player(),dx=p.x-ox,dy=p.y-oy,a=o.ang??Math.atan2(dy,dx)+(R()-.5)*(o.spread||.08),c=o.col||[255,60,50];
  let x=ox,y=oy,hit=false;
  for(let s=0;s<(o.len||320);s++){x+=Math.cos(a);y+=Math.sin(a);const X=x|0,Y=y|0;if(X<0||X>=W||Y>=H||Y<-SKY)break;
    if(ST.AI_ALLY===e){const he=enemyAt(x,y,1);if(he&&he!==e&&!(e.team&&he.team===e.team)){hitEnemy(he,(o.dmg||10)*1.5,Math.cos(a),Math.sin(a));hit=true;break;}}
    else{if(Math.abs(x-pl_.x)<=ST.PW/2+1&&y>=pl_.y-ST.PH&&y<=pl_.y){hurt(o.dmg||10);hit=true;break;}
      if(ST.decoy&&Math.abs(x-ST.decoy.x)<=4&&y>=ST.decoy.y-ST.SH&&y<=ST.decoy.y){ST.decoy.hp-=o.dmg||10;hit=true;break;}}
    const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){explode(X,Y,o.boom||3,{enemy:ST.AI_ALLY!==e,self:true,col:c,dmg:0,quiet:o.quiet});break;}}
  beams.push({x0:ox,y0:oy,x1:x,y1:y,life:5,w:o.w||1,c:[255,200,190],g:c});flash(x,y,10,c,3);snd('elaser',ox,oy,{v:.6,gap:.05});
  return hit;
}
// a teamed enemy's current enemy-of-choice: the nearest member of another team, when it is closer than the hero
function rivalOf(e){
  if(e.t%20===0||(e.mem.rv&&e.mem.rv.hp<=0)){e.mem.rv=null;let bd=240,b=null;for(const o of enemies){if(!o.team||o.team===e.team||o.hp<=0||o.grabbed)continue;const d=Math.hypot(o.x-e.x,o.y-e.y);if(d<bd){bd=d;b=o;}}
    if(b&&(bd<pdist(e)*.85||R()<.3))e.mem.rv=b;}
  return e.mem.rv&&e.mem.rv.hp>0?e.mem.rv:null;
}
export function enemyAt(x,y,pad){for(const e of enemies){if(Math.abs(x-e.x)<=e.def.w/2+pad&&Math.abs(y-e.y)<=e.def.h/2+pad)return e;}return null;}
export function nearestEnemy(x,y,r){let b=null,bd=r;for(const e of enemies){const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;b=e;}}return b;}
export function hitEnemy(e,dmg,kx,ky){if(e.hp<=0)return;if(e.mem.shield>0)dmg*=.35;if(e.hex>0)dmg*=1.5;e.hp-=dmg;e.flash=5;e.vx+=kx||0;e.vy+=ky||0;
  if(dmg>=8&&ST.np<MP-2000){for(let k=0;k<5;k++){const a=R()*6.283,s=1.5+R()*2.5;spawn(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s,R()<.5?rgb(255,250,230):rgb(255,210,120),6+R()*6,0,1,0,1);}if(dmg>=20)flash(e.x,e.y,10+dmg*.2,[255,230,180],3);}}
export function damageEnemies(x,y,r,dmg,kx,ky,radial){
  for(const e of enemies){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy);if(d>r+e.def.w/2)continue;const f=Math.max(.25,1-d/(r+1));
    const kr=radial||(!kx&&!ky)?3*f:0;hitEnemy(e,dmg*f,(kx||0)*f+(d?dx/d*kr:0),(ky||0)*f+(d?dy/d*kr:0));}
}
export function damageLine(x0,y0,x1,y1,r,dmg){
  const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy||1;
  for(const e of enemies){const u=Math.max(0,Math.min(1,((e.x-x0)*dx+(e.y-y0)*dy)/L2));const d=Math.hypot(x0+dx*u-e.x,y0+dy*u-e.y);if(d<r+e.def.w/2)hitEnemy(e,dmg,dx/Math.sqrt(L2)*.3,dy/Math.sqrt(L2)*.3);}
}
export function damageCone(x,y,ux,uy,r,dmg,knock){
  for(const e of enemies){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;if(d<r&&(dx*ux+dy*uy)/d>.6)hitEnemy(e,dmg*(1-d/r*.5),ux*knock,uy*knock-1);}
}
export function eHit(e,x,y){const hw=e.def.w/2,hh=e.def.h/2;
  for(const [ox,oy] of [[-hw,-hh],[hw,-hh],[-hw,hh],[hw,hh],[0,hh],[0,-hh],[-hw,0],[hw,0]])if(solidAt(x+ox,y+oy))return true;return false;}
export function updEnemies(){
  for(let n=spawnQ.length-1;n>=0;n--){const s=spawnQ[n];if(--s.delay>0)continue;spawnQ.splice(n,1);const pos=spawnPoint(ENEMY_TYPES[s.type]);if(pos)spawnEnemy(s.type,pos[0],pos[1]);}
  for(let n=enemies.length-1;n>=0;n--){
    const e=enemies[n],d=e.def;e.t++;if(e.cd>0)e.cd--;if(e.flash>0)e.flash--;
    if(e.grabbed){if(e.hp<=0){if(ST.heldE===e)ST.heldE=null;killEnemy(e);enemies.splice(n,1);}continue;} // held by telekinesis: no AI, no physics
    if(ST.stasis&&inStasis(e.x,e.y)){if(ST.frame%4===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,0,rgb(255,150,230),6,0,1,0,1);if(e.hp<=0){killEnemy(e);enemies.splice(n,1);}continue;}
    const preSp=Math.hypot(e.vx,e.vy);
    if(e.webbed>0)e.webbed--;if(e.bound>0)e.bound--;if(e.hex>0)e.hex--;
    if(e.hang){const hg=e.hang;e.x=hg.x;e.y=hg.y+hg.len+e.def.h/2;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);if(ST.frame%30===0)hitEnemy(e,3,0,0);if(--hg.life<=0)e.hang=null;if(e.hp<=0){killEnemy(e);enemies.splice(n,1);}continue;}
    if(e.loop){const L2=e.loop;if(++L2.k>=60){L2.k=0;L2.n++;e.x=L2.x;e.y=L2.y;e.vx=e.vy=0;hitEnemy(e,14,0,0);rings.push({x:e.x,y:e.y,r:e.def.w,vr:-1,life:10,c:[120,255,140]});if(L2.n>=6)e.loop=null;}}
    if(e.emp>0){e.emp--;if(ST.frame%3===0){const a2=R()*6.283;spawn(e.x+Math.cos(a2)*e.def.w/2,e.y+Math.sin(a2)*e.def.h/2,(R()-.5)*2,-R()*2,R()<.5?rgb(255,240,160):rgb(150,230,255),8,0,1,1);}}
    if(e.frozen>0){e.frozen--;e.vx*=.7;if(d.fly)e.vy=Math.min(3,e.vy+.15);if(ST.frame%6===0&&!e.emp)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,.3,rgb(200,240,255),12,0,1,0);}
    else if(d.think){
      if(e.ally>0){ // Jean's puppet: hunts the nearest other enemy, or trails the hero
        e.ally--;let tg=null,bd=320;for(const o of enemies){if(o===e||o.ally>0||o.hp<=0||o.grabbed)continue;const dd=Math.hypot(o.x-e.x,o.y-e.y);if(dd<bd){bd=dd;tg=o;}}
        ST.AI_ALLY=e;ST.AI_TE=tg;ST.AI_T=tg?{x:tg.x,y:tg.y}:{x:pl_.x-pl_.face*24,y:pl_.y-ST.PH/2-12};try{d.think(e);}finally{ST.AI_T=ST.AI_TE=ST.AI_ALLY=null;}
        if(ST.frame%4===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,-.4,rgb(255,120,210),12,0,1,0,1);
        if(e.ally===0){hitEnemy(e,e.def.hp*.3,0,0);fxWord(e.x,e.y-e.def.h/2-6,'SNAP!',1,'#ff9ad8',true);}}
      else if(e.team){const rv=rivalOf(e); // faction war: TVA and Doombots attack each other as readily as the hero
        if(rv){ST.AI_ALLY=e;ST.AI_TE=rv;ST.AI_T={x:rv.x,y:rv.y};try{d.think(e);}finally{ST.AI_T=ST.AI_TE=ST.AI_ALLY=null;}}else d.think(e);}
      else d.think(e);}
    // physics
    if(d.fly){e.vx*=.97;e.vy*=.97;}else{e.vy=Math.min(6,e.vy+.35);e.vx*=e.ground?.8:.98;
      const wi=(e.y|0)*W+(e.x|0);if(wi>=0&&wi<N&&KIND[t[wi]]===L&&!d.title){e.vx*=.9;e.vy=e.vy*.88-.3;}} // walkers wade and float in liquids
    const nx=e.x+e.vx;
    if(!eHit(e,nx,e.y))e.x=nx;else if(!d.fly&&!eHit(e,nx,e.y-2)){e.x=nx;e.y-=2;}else{e.vx*=-.3;e.mem.blocked=e.t;}
    const ny=e.y+e.vy;e.ground=false;
    if(!eHit(e,e.x,ny))e.y=ny;else{if(e.vy>0)e.ground=true;e.vy*=d.fly?-.3:0;}
    let u=0;while(eHit(e,e.x,e.y)&&u++<6)e.y-=1;
    e.x=Math.max(2,Math.min(W-3,e.x));
    if(e.vx>.2)e.face=1;else if(e.vx<-.2)e.face=-1;
    // hazards + thrown chunks
    const ci=(e.y|0)*W+(e.x|0);if(ci>=0&&ci<N){const m=t[ci];if(m===LAVA)e.hp-=2;else if(m===ACID)e.hp-=1;else if(m===FIRE||m===GFIRE)e.hp-=.4;}
    for(const b of bodies){const spd=Math.hypot(b.vx,b.vy);if(spd<2.2||b.held)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<b.rmax+e.def.w/2&&bodyAt(b,e.x,e.y)){hitEnemy(e,spd*7,b.vx*.6,b.vy*.6);}}
    if(e.thrownT>0){e.thrownT--; // thrown enemies smash into others and splat on impact
      for(const o of enemies)if(o!==e&&!o.grabbed&&Math.abs(o.x-e.x)<(o.def.w+d.w)/2+1&&Math.abs(o.y-e.y)<(o.def.h+d.h)/2+1)hitEnemy(o,preSp*5,e.vx*.5,e.vy*.5);
      if(preSp>3&&(e.mem.blocked===e.t||e.ground)){hitEnemy(e,preSp*12,0,0);explode(e.x|0,e.y|0,Math.min(10,4+preSp*.6|0),{self:true});e.thrownT=0;}}
    if(e.y>H+20)e.hp=0;
    if(e.hp<=0){killEnemy(e);enemies.splice(n,1);}
  }
}
function killEnemy(e){
  const d=e.def;if(!e.mem.noScore){ST.kills++;ST.score+=d.score;}snd('kill',e.x,e.y,{v:Math.min(1,.5+d.boom/16)});
  explode(e.x,e.y,d.boom,{fire:.25,self:true,col:[255,140,80]});
  // scrap: the sprite's own pixels fly off and land as debris
  const sp=d.sprite,sw=sp[0].length,sh=sp.length,S=d.scale||1;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const ch=sp[y][x];if(ch==='.')continue;const c=d.pal[ch];if(c===undefined)continue;
    if(sw*sh>300&&R()<.4)continue;spawn(e.x+(x-sw/2)*S,e.y+(y-sh/2)*S,(x-sw/2)*.35+(R()-.5)*2+e.vx*.5,(y-sh/2)*.3-1.5-R()*2,c,120,R()<.5?RUBBLE:0,d.glow.includes(ch)?1:0);}
  if(d.onDeath)d.onDeath(e);
  fxWord(e.x,e.y-8,['SKRANCH!','KZZT!','KRAK!','SCRAP!'][R()*4|0],d.boom>=10?1.4:.75,'#f3e9d2',d.boom>=10);
  if(ST.MODE&&ST.MODE.onKill)ST.MODE.onKill(e,ST.MS);
}
export function spawnPoint(d){ // giants (w>16) may spawn overlapping terrain: they smash their own way out
  if(!d)return null;
  for(let tries=0;tries<12;tries++){
    const side=R()<.5?-1:1;let x=pl_.x+side*(VW/2+10+R()*60);
    if(x<10||x>W-10)x=pl_.x-side*(VW/2+10+R()*60);
    x=Math.max(10,Math.min(W-10,x));
    if(d.fly){const y=Math.max(10,ST.camY+10+R()*90);if(!eHit({def:d},x,y))return [x,y];}
    else{let y=0;while(y<H-1&&!solidAt(x,y))y++;const sy=y-d.h/2-1;if(sy>5&&(d.w>16||!eHit({def:d},x,sy))&&t[(y)*W+(x|0)]!==WATER)return [x,sy];}
  }
  return null;
}
const WAVES=n=>{const m=mapSel.value; // the sandbox's N key: each map has its own locals
  if(m==='savage')return[['brood',2+n*2],['hydra',Math.max(0,n-1)]];
  if(m==='arctic')return[['hydra',1+n],['sentinel_scout',Math.floor(n/2)],['brood',n]];
  if(m==='xmansion')return[['sentinel_scout',1+n],['sentinel',Math.floor(n/3)]];
  return[['ultron',1+n],['chitauri',n],['chitauri_glider',Math.max(0,n-1)]];};
export function queueWave(list,gap=22){let k=0;for(const [type,c] of list)for(let i=0;i<c;i++)spawnQ.push({type,delay:20+(k++)*gap+R()*30|0});}
export function startWave(){ST.wave++;queueWave(WAVES(ST.wave));}
export function clearEnemies(){enemies.length=0;spawnQ.length=0;for(let n=shots.length-1;n>=0;n--)if(shots[n].owner==='enemy')shots.splice(n,1);}
