// Power system core: cast state, projectiles, shared power helpers and updaters.
import { SHOT_SND, snd, sndLoop } from '../sfx.js';
import { ST } from '../state.js';
import { ACID, ASH, CONC, EMPTY, F, FLAM, G, GFIRE, GLASS, HARD, ICE, KIND, L, LAVA, OBSID, P, PROPANE, R, RUBBLE, S, SNOW, STEAM, STEEL, STONE, WATER, rgb } from '../world/materials.js';
import { CHN, CW, H, N, VH, W, bg, bgB, bgD, booms, col, markDirty, setc, stamp, swap, t, wake } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { BLDS, NAT, bodies, gnd, q, rid, vis } from '../world/support.js';
import { bodyAt, makeBody } from '../world/bodies.js';
import { MP, crumble, gcol, pvx, pvy, px, py, solidAt, spawn } from '../world/particles.js';
import { afters, beams, flash, flashes, fxBurst, fxImpact, fxWord, rings } from '../render/fx.js';
import { bgHit, explode, ringChunks } from '../world/destruction.js';
import { iceAt } from './xmen.js';
import { SKY, boxHit, carve, glowRGB, hand, hurt, mouse, pl_ } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, enemyAt, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { AOE_MAXR } from './aoe.js';
import { sliceLine } from '../world/slice.js';

// ================= powers =================
// A power is {n:name, fn(a,p,use)} (a = aim from the hand, use(cost) spends energy) or
// {n, tk:{...}} for grab-and-throw powers handled by updTelekinesis.
// cur, cd, cdMax: shared state (ST in state.js)
// spawn menu state (sandbox): tool = what the next click places; pause/slow/god/inf are its toggles
export const SPAWN={open:false,tool:null,brush:4,snap:true,pause:false,slow:false,god:false,inf:false,peace:false};
export const shots=[],drones=[],strikes=[];
 let tkPrev=false;
export function aim(){const h=hand();const dx=mouse.wx-h.x,dy=mouse.wy-h.y,d=Math.hypot(dx,dy)||1;return{h,dx:dx/d,dy:dy/d,d};}
export const CYAN=[150,235,255], BLUE=[160,205,255], GAMMA=[130,255,90];
export const pickC=c=>rgb(c[0]*(.7+R()*.3),c[1]*(.7+R()*.3),c[2]*(.7+R()*.3));
export const TSL=[]; // the hero's last five seconds (300 ticks) of position and health, for Doom's Timeslip

// ================= extra powers =================
export function zap(x0,y0,x1,y1,c,g){ST.zapF=ST.frame;ST.zapX=x1;ST.zapY=y1;const pts=[[x0,y0]],n=Math.max(2,Math.hypot(x1-x0,y1-y0)/7|0);for(let k=1;k<n;k++){const f=k/n;pts.push([x0+(x1-x0)*f+(R()-.5)*7,y0+(y1-y0)*f+(R()-.5)*7]);}pts.push([x1,y1]);beams.push({pts,life:2,c,g});}
export function shieldAs(cols,reflect){ST.shieldC=cols;shield();
  if(reflect)for(const s2 of shots)if(s2.owner==='enemy'&&Math.hypot(s2.x-pl_.x,s2.y-pl_.y+8)<26){s2.owner='player';s2.vx*=-1.3;s2.vy*=-1.3;s2.col=cols[0];s2.ecol=cols[0];flash(s2.x,s2.y,8,cols[2],3);}}
// ================= overhaul powers: every hero but Doom gets a full 12-power kit =================
// Each new power is unique to its hero and does something no other power in the game does.
export const pins=[],therm=[],jets=[],waves=[];
// decoy, stasis, slowT, heatZ, caPulse, AI_T, AI_TE, AI_ALLY: shared state (ST in state.js)
export function surfaceY(x,y0,maxD=200){x=Math.max(0,Math.min(W-1,x|0));let y=Math.max(0,y0|0);const y1=Math.min(H-1,y+maxD);for(;y<y1;y++){const m=t[y*W+x];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L)break;}return y;}
// the ground under (x,y) if it is within maxD, otherwise y itself: aimed effects land in the open sky
// instead of travelling all the way down to the street
export function groundNear(x,y,maxD=120){x=x|0;if(x<0||x>=W)return y;const y1=Math.min(H-1,(y|0)+maxD);for(let yy=Math.max(0,y|0);yy<y1;yy++){const m=t[yy*W+x];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L)return yy;}return y;}
// moves the hero for powers that steer it (p.script > 0 skips normal movement): slides along what it can't enter
export function scriptMove(p,vx,vy){const top=ST.PH+2-SKY+VH/2,nx=Math.max(5,Math.min(W-5,p.x+vx)),ny=Math.max(top,Math.min(H-8,p.y+vy));
  if(!boxHit(nx,ny)){p.x=nx;p.y=ny;return true;}if(!boxHit(nx,p.y)){p.x=nx;return true;}if(!boxHit(p.x,ny)){p.y=ny;return true;}return false;}
export function grabbable(x,y,r){let b=null,bd=r;for(const e of enemies){if(e.hp<=0||e.grabbed||e.def.title||e.def.titan||e.def.w>20)continue;const d=Math.hypot(e.x-x,e.y-y)-e.def.w/2;if(d<bd){bd=d;b=e;}}return b;}
export const isMetal=e=>e.def.metal!==false;
export function crackCell(X,Y,vx){if(X<0||X>=W||Y<0||Y>=H-44)return;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F)return;if(m===OBSID||m===STEEL&&R()<.6)return;
  if(ST.np<MP-400&&R()<.45)spawn(X,Y,vx*(.5+R())+(R()-.5)*1.5,-1.5-R()*3,col[i],80,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);setc(i,EMPTY);}
export function shockFx(x,y,s=1){s*=Math.min(2,Math.sqrt(ST.aoeC||1));if(waves.length>5)waves.shift();waves.push({x,y,r:2,s,life:30});ST.caPulse=Math.max(ST.caPulse,s*3);} // GPU ring distortion + colour split
export function updWaves(){for(let n=waves.length-1;n>=0;n--){const w=waves[n];w.r+=4+w.s*3;if(--w.life<=0)waves.splice(n,1);}ST.caPulse*=.85;}
// ---- updaters for the new powers
export function updPins(){for(let n=pins.length-1;n>=0;n--){const P2=pins[n];P2.life--;
  if(P2.e&&(P2.e.hp<=0||!enemies.includes(P2.e)))P2.e=null;
  if(P2.e){const e=P2.e;e.frozen=Math.max(e.frozen||0,3);e.vx*=.5;P2.x=e.x;P2.y=e.y-e.def.h/2-1;hitEnemy(e,.45,0,0);if(ST.frame%45===0)fxWord(e.x,e.y-e.def.h/2-14,'UNWORTHY!',.8,'#bfe3ff',true);}
  else{const gy=surfaceY(P2.x,P2.y-2,40);if(gy>P2.y+1)P2.y=Math.min(gy-1,P2.y+3);}
  if(ST.frame%30===0){const o=nearestEnemy(P2.x,P2.y,70);if(o&&o!==P2.e){zap(P2.x,P2.y-4,o.x,o.y,[230,240,255],[120,170,255]);hitEnemy(o,8,(P2.x-o.x)*.03,(P2.y-o.y)*.03);snd('zap',o.x,o.y);}}
  if(R()<.3)spawn(P2.x+(R()-.5)*6,P2.y-2,(R()-.5)*.8,-R(),pickC(BLUE),10,0,1,0,1);
  if(P2.life<=0){flash(P2.x,P2.y,20,BLUE,4);shots.push({x:P2.x,y:P2.y-3,vx:0,vy:-4,type:'hammer',life:300,out:0,hitSet:new Set(),spin:0});pins.splice(n,1);}}}
export function updTherm(){for(let n=therm.length-1;n>=0;n--){const b=therm[n];
  if(!b.stuck){b.vy+=.12;const st=Math.ceil(Math.hypot(b.vx,b.vy))||1;
    for(let k=0;k<st;k++){b.x+=b.vx/st;b.y+=b.vy/st;const X=b.x|0,Y=b.y|0;if(X<1||X>=W-1||Y<-SKY||Y>=H-1){b.life=0;break;}const i=Y*W+X,m=Y>=0?t[i]:0;
      if(m===WATER){setc(i,STEAM);b.life=0;break;}
      if(m&&(KIND[m]===S||KIND[m]===P)){b.stuck=true;b.x-=b.vx/st;b.y-=b.vy/st;b.life=110+R()*70|0;break;}
      const e=enemyAt(b.x,b.y,1);if(e){hitEnemy(e,7,0,0);b.life=0;for(let q2=0;q2<5;q2++)spawn(b.x,b.y,(R()-.5)*3,(R()-.5)*3,rgb(255,230,160),10,0,1,1);break;}}
    if(!b.stuck&&--b.life<=0){therm.splice(n,1);}continue;}
  // burning white-hot: melts steel into molten metal and sets everything else alight
  for(let k=0;k<3;k++){const X=b.x+(R()-.5)*4|0,Y=b.y+(R()-.5)*4|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(!m)continue;
    if(m===STEEL){if(R()<.05){setc(i,LAVA);col[i]=rgb(255,200,140);}}
    else if(FLAM[m]>0){if(R()<.15)ignite(i);}
    else if((m===CONC||m===STONE||m===GLASS||m===ICE||m===SNOW)&&R()<.012)setc(i,m===ICE||m===SNOW?WATER:LAVA);
    else if(m===WATER&&R()<.3)setc(i,STEAM);}
  if(R()<.5)spawn(b.x,b.y,(R()-.5)*2.5,-R()*2.5,R()<.5?rgb(255,255,220):rgb(255,190,90),8+R()*10,0,1,1);
  if(R()<.04)spawn(b.x,b.y-1,(R()-.5)*.3,-.4,rgb(90,90,96),40,0,0,0);
  for(const e of enemies)if(Math.abs(e.x-b.x)<e.def.w/2+3&&Math.abs(e.y-b.y)<e.def.h/2+3)hitEnemy(e,.8,0,0);
  let near=false;for(let d=0;d<4&&!near;d++){const X=b.x+(d===0?1:d===1?-1:0)|0,Y=b.y+(d===2?1:d===3?-1:0)|0;if(X>=0&&X<W&&Y>=0&&Y<H){const m=t[Y*W+X];if(m&&(KIND[m]===S||KIND[m]===P||m===LAVA))near=true;}}
  if(!near){b.stuck=false;b.vx=0;b.vy=.5;b.life=60;} // what it clung to burned away: it drips
  else if(--b.life<=0)therm.splice(n,1);}}
export const JET_SPR=["..........kk..........","........kkSSk.........","kk....kkSSggSSkkkkkk..","kSkkkkSSSSSSSSSSSSSSkk","kkSSSSSSSSSSSSSSSSSSSk","..kkkSSSSSSSSSSkkkkk..","......kkkkkkkk........"];
export const JET_PAL={k:rgb(18,18,24),S:rgb(46,48,60),g:rgb(120,170,210)};
export function updJets(){for(let n=jets.length-1;n>=0;n--){const j=jets[n];j.t++;j.x+=j.dir*5.5;const dx=(j.x-j.tx)*j.dir;
  if(dx>-150&&dx<150){if(j.t%5===0)shots.push({x:j.x,y:j.y+4,vx:j.dir*2,vy:1.5,type:'bomb',life:240,boom:11,fire:.3,grav:.15,ecol:[255,200,120]});
    if(j.t%3===0){const gx=j.x+j.dir*30+(R()-.5)*30|0,gy=surfaceY(gx,j.y+6,VH);beams.push({x0:j.x+j.dir*8,y0:j.y+3,x1:gx,y1:gy,life:2,w:0,c:[255,240,190],g:[255,180,80]});explode(gx,gy,3,{quiet:true,self:true,col:[255,200,120]});damageEnemies(gx,gy,8,10,0,-1);snd('pop',gx,gy,{v:.4,gap:.04});}}
  for(let k=0;k<3;k++)spawn(j.x-j.dir*12,j.y+2+(R()-.5)*2,-j.dir*(2+R()*2),(R()-.5)*.4,R()<.5?rgb(255,220,150):rgb(255,140,60),10,0,1,0,1);
  sndLoop('jet'+n,'wind',j.x,j.y,{v:.8});
  if(j.t>400||dx>220)jets.splice(n,1);}}
export function updDecoy(){if(!ST.decoy)return;const d=ST.decoy;d.life--;if(ST.frame%5===0)spawn(d.x+(R()-.5)*8,d.y-R()*ST.SH,0,-.3,rgb(220,245,255),12,0,1,0,1);
  if(d.hp<=0||d.life<=0){const cx=d.x,cy=d.y-ST.SH/2;fxWord(cx,cy-16,'SHATTER!',1.3,'#bfe3ff',true);snd('glass',cx,cy);
    for(let k=0;k<14;k++){const an=k/14*6.283;shots.push({x:cx,y:cy,vx:Math.cos(an)*5,vy:Math.sin(an)*5-1,type:'shard',life:50,col:[200,240,255],grav:.08,onHit:sh=>{for(let q2=0;q2<3;q2++)iceAt(sh.x+(R()-.5)*3,sh.y+(R()-.5)*3);damageEnemies(sh.x,sh.y,5,12,sh.vx*.3,sh.vy*.3);}});}
    damageEnemies(cx,cy,40,35,0,-2,true);for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<40)e.frozen=Math.max(e.frozen||0,120);ST.decoy=null;}}
export function inStasis(x,y){const s=ST.stasis;return !!s&&(x-s.x)*(x-s.x)+(y-s.y)*(y-s.y)<s.r*s.r;}
export function updStasis(){const s=ST.stasis;if(!s)return;
  if(--s.life<=0){ST.stasis=null;rings.push({x:s.x,y:s.y,r:s.r,vr:2,life:10,c:[255,150,230]});snd('psi',s.x,s.y,{pitch:1.4});
    for(let cy=Math.max(0,(s.y-s.r)>>5);cy<=Math.min(CHN-1,(s.y+s.r)>>5);cy++)for(let cx=Math.max(0,(s.x-s.r)>>5);cx<=Math.min(CW-1,(s.x+s.r)>>5);cx++)ST.nxt[cy*CW+cx]=1;return;}
  const nc=(ST.clock%255)+1,r=s.r|0; // pre-stamp the bubble so this tick's sim step skips it: sand, water and fire hang in place
  for(let y=-r;y<=r;y++){const Y=s.y+y|0;if(Y<0||Y>=H)continue;const hw=Math.sqrt(r*r-y*y)|0;for(let x=-hw;x<=hw;x++){const X=s.x+x|0;if(X<0||X>=W)continue;stamp[Y*W+X]=nc;}}}
export function hurtTarget(e,d){if(ST.AI_ALLY===e){if(ST.AI_TE)hitEnemy(ST.AI_TE,d*2,0,0);return;}if(SPAWN.peace)return;if(ST.decoy){ST.decoy.hp-=d;return;}hurt(d);}
export function beam(a){beamCore(a,{pow:48,rad:1,len:420,w:2+((ST.frame>>1)&1),c:[230,255,235],g:[90,255,130],spark:()=>R()<.5?gcol():rgb(230,255,230),dmg:3});}
export function beamCore(a,o){
  if(ST.frame%26===0)fxWord(a.h.x+a.dx*34,a.h.y+a.dy*34-6,R()<.5?'ZZZAP!':'FZZZT!',.8,`rgb(${o.g[0]},${o.g[1]},${o.g[2]})`,true);
  let x=a.h.x,y=a.h.y,pow=o.pow;const x0=x,y0=y,rad=o.rad;
  for(let s=0;s<o.len&&pow>0;s++){
    x+=a.dx;y+=a.dy;if(x<0||x>=W||y>=H||y<-SKY)break; // beams keep going through the open sky above the map
    for(let oy=-rad;oy<=rad;oy++)for(let ox=-rad;ox<=rad;ox++){
      const X=x+ox|0,Y=y+oy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(m===0||KIND[m]===G)continue;
      pow-=.4+HARD[m]*.35;
      if(R()<.3)spawn(X,Y,(R()-.5)*1.8-a.dx,-R()*1.8-a.dy,o.spark(),15+R()*25,0,1,0,1);
      if(m===PROPANE)booms.push([X,Y,6]);
      setc(i,!o.noAsh&&R()<.06?ASH:EMPTY);
    }
  }
  for(let k=0;k<=12;k++)bgHit(x0+(x-x0)*k/12,y0+(y-y0)*k/12,rad+1);
  damageLine(x0,y0,x,y,rad+3,o.dmg||2);
  beams.push({x0,y0,x1:x,y1:y,life:1,w:o.w,c:o.c,g:o.g});
  sndLoop('beam'+(o.g[0]>>6)+(o.g[1]>>6)+(o.g[2]>>6),'beam',x0,y0,{pitch:.75+o.g[0]/255*.55+o.g[2]/255*.25,v:Math.min(1,.5+o.pow/400)});
  flash(x,y,12,o.g,2); flash(x0,y0,8,o.g,2);
  ST.shake=Math.max(ST.shake,1.8);
}
// shieldOn, shieldC, senseT: shared state (ST in state.js)
export function shield(){
  const cx=pl_.x,cy=pl_.y-8,r=17;
  for(let y=-r-1;y<=r+1;y++)for(let x=-r-1;x<=r+1;x++){const d2=x*x+y*y;if(d2>(r+1)*(r+1))continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(m===0||KIND[m]===S)continue;
    if(KIND[m]===F||KIND[m]===G||m===LAVA||m===ACID){setc(i,EMPTY);if(R()<.2)spawn(X,Y,0,-.5,gcol(),8,0,1,0);continue;}
    if(d2<r*r){const d=Math.sqrt(d2)||1;spawn(X,Y,x/d*2.5,y/d*2.5-1,col[i],60,m,0);t[i]=0;wake(i);}
  }
  for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+b.rmax){b.vx+=dx/d*.8;b.vy+=dy/d*.8;}}
  for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r+2){spawn(s.x,s.y,0,0,glowRGB(),10,0,1,0);shots.splice(n,1);}}
  ST.shieldOn=true;
}
export function quake(x,y,o={}){
  fxWord(x,y-18,'WHUDOOM!',1.5,'#ffc93c',true);snd('slam',x,y,{size:(o.r||36)/30});fxBurst(x,y,60,o.col?`rgb(${o.col[0]},${o.col[1]},${o.col[2]})`:'#8dffb0');ST.hitstop=Math.max(ST.hitstop,4);fxImpact(x,y,4);
  const r=Math.min(AOE_MAXR,(o.r||36)*(ST.aoeC||1))|0, gc=o.col||[120,255,160], green=!o.col;ST.shake=22;
  for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const d=Math.hypot(xx,yy);if(d>r)continue;const X=x+xx|0,Y=y+yy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(KIND[m]===S&&m!==STEEL&&R()<(1-d/r)*.9/(1+HARD[m]*.15)){if(R()<.25&&Y<=y+3){spawn(X,Y,xx*.07+(R()-.5),-2-R()*3.5*(1-d/r),col[i],90,RUBBLE,0);t[i]=0;}else crumble(i);markDirty(i);wake(i);}
    else if((KIND[m]===P||KIND[m]===L)&&R()<.35*(1-d/r)){spawn(X,Y,(R()-.5)*2,-2-R()*3.5,col[i],80,m,0);t[i]=0;wake(i);}
  }
  explode(x,y+2,7,{fire:.15,green,col:o.col,self:true});ringChunks(x,y+4,r*.6,true);
  damageEnemies(x,y,r*1.3/(ST.aoeC||1),45,0,-4);
  for(let k=0;k<3;k++)rings.push({x,y,r:4+k*4,vr:2.4+k*.6,life:18+k*3,c:gc});
  for(let k=0;k<120;k++){const a=Math.PI+R()*Math.PI;spawn(x,y,Math.cos(a)*5,Math.sin(a)*3.5,green?gcol():pickC(gc),20+R()*25,0,1,1);}
  if(o.bolts)for(let k=0;k<6;k++)lightningStrike(x+(R()-.5)*120,y,6);
  flash(x,y,70,gc,12);
}
export function lightning(a,o={}){
  if(ST.frame%22===0)fxWord(a.h.x+a.dx*40,a.h.y+a.dy*40,'ZZRAK!',.8,o.c?'#bfe3ff':'#8dffb0',true);
  const C=o.c||[230,255,240],Gc=o.g||[120,255,170],Fc=o.f||[160,255,190],spark=o.spark||(()=>R()<.5?rgb(230,255,240):gcol()),green=!o.c;
  // jagged arc toward cursor; stops at first solid; forks
  const pts=[[a.h.x,a.h.y]];let x=a.h.x,y=a.h.y;const len=Math.min(260,a.d);let hitX=-1,hitY=-1;
  for(let s=0;s<len;s+=6){
    x+=a.dx*6+(R()-.5)*6;y+=a.dy*6+(R()-.5)*6;pts.push([x,y]);
    const X=x|0,Y=y|0;if(X<0||X>=W||Y>=H||Y<-SKY)break;const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){hitX=X;hitY=Y;break;}
    if(enemyAt(x,y,3)){hitX=X;hitY=Y;break;}
  }
  beams.push({pts,life:2,c:C,g:Gc});sndLoop('arc','arc',a.h.x,a.h.y);
  ST.dmgTag='shock';for(let k=1;k<pts.length;k++)damageEnemies(pts[k][0],pts[k][1],5,.8,0,0);ST.dmgTag=null;
  for(let f=0;f<3;f++){const st=pts[(R()*pts.length)|0];const fp=[st];let fx=st[0],fy=st[1];const ang=Math.atan2(a.dy,a.dx)+(R()-.5)*2.2;for(let k=0;k<5;k++){fx+=Math.cos(ang)*5+(R()-.5)*5;fy+=Math.sin(ang)*5+(R()-.5)*5;fp.push([fx,fy]);}beams.push({pts:fp,life:2,c:Fc,g:Gc});
    const ex=fx|0,ey=fy|0;if(ex>=0&&ex<W&&ey>=0&&ey<H){const m=t[ey*W+ex];if(FLAM[m]>0)ignite(ey*W+ex);}}
  const ex=hitX>=0?hitX:x|0,ey=hitX>=0?hitY:y|0;
  if(ST.frame%4===0)explode(ex,ey,4,{fire:.3,green,col:o.c?Gc:null,quiet:true});
  for(let k=0;k<6;k++)spawn(ex,ey,(R()-.5)*4,(R()-.5)*4-1,spark(),10+R()*10,0,1,1);
  flash(ex,ey,22,Gc,2);flash(a.h.x,a.h.y,12,Gc,2);
  ST.shake=Math.max(ST.shake,2);
}
export function lightningStrike(x,ty,r){
  snd('thunder',x,ty,{gap:.12,v:Math.min(1,.5+r/16)});
  fxWord(x,ty-24,'KRAKKA-THOOM!',1.3,'#bfe3ff',true);ST.hitstop=Math.max(ST.hitstop,2);fxImpact(x,ty,3);
  // bolt from the sky to the first solid thing under x
  x=Math.max(2,Math.min(W-3,x|0));let y=ST.camY-10|0;const yEnd=groundNear(x,ty,160);
  for(;y<yEnd&&y<H-1;y++){if(y>=0){const m=t[y*W+x];if(m&&KIND[m]!==G&&KIND[m]!==F)break;}if(enemyAt(x,y,4))break;}
  const pts=[[x+(R()-.5)*30,ST.camY-10]];let cx=pts[0][0],cy=pts[0][1];
  while(cy<y){cy+=8+R()*6;cx+=(x-cx)*.3+(R()-.5)*10;pts.push([cx,Math.min(cy,y)]);}
  beams.push({pts,life:4,c:[245,250,255],g:[130,180,255]});
  for(let f=0;f<2;f++){const st=pts[(R()*pts.length)|0];const fp=[st];let fx=st[0],fy=st[1];for(let k=0;k<4;k++){fx+=(R()-.5)*14;fy+=6+R()*4;fp.push([fx,fy]);}beams.push({pts:fp,life:3,c:[200,220,255],g:[90,140,255]});}
  explode(x,y,r,{col:BLUE});
  ST.dmgTag='shock';damageEnemies(x,y,r*2,30,0,-2);ST.dmgTag=null;
  flash(x,y,r*5,[150,190,255],8);flash(x,ST.camY+VH/2,200,[60,80,130],4);
  ST.shake=Math.min(24,ST.shake+r*.6);
}
export function thunderclap(a){
  fxWord(a.h.x+a.dx*30,a.h.y-10,'CLAP!!',1.5,'#ffc93c',true);fxBurst(a.h.x+a.dx*20,a.h.y+a.dy*20,50,'#bff07a');ST.hitstop=Math.max(ST.hitstop,3);
  const cx=a.h.x,cy=a.h.y,R0=85,ang=Math.atan2(a.dy,a.dx);
  for(let n=0;n<6000;n++){const d=Math.sqrt(R())*R0,t2=ang+(R()-.5)*1.15,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;const f=1-d/R0;
    const vx=Math.cos(t2)*6*f,vy=Math.sin(t2)*6*f-1;
    if(KIND[m]===S){if(m!==STEEL&&R()<f*.6/(1+HARD[m]*.3)){if(R()<.5){spawn(X,Y,vx,vy,col[i],90,RUBBLE,0);t[i]=0;}else crumble(i);markDirty(i);wake(i);}}
    else if(KIND[m]===P||KIND[m]===L){if(R()<f+.2){spawn(X,Y,vx*1.2,vy*1.2,col[i],80,m,0);t[i]=0;wake(i);}}
    else{t[i]=0;wake(i);}}
  for(let k=0;k<4;k++)bgHit(cx+a.dx*k*18,cy+a.dy*k*18,10);
  damageCone(cx,cy,a.dx,a.dy,R0,40,8);
  for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*8;b.vy+=a.dy*8-2;b.thrown=true;}}
  for(let k=0;k<4;k++)rings.push({x:cx+a.dx*k*10,y:cy+a.dy*k*10,r:4+k*3,vr:3,life:12,c:[230,255,220]});
  for(let k=0;k<120;k++){const t2=ang+(R()-.5)*1.1,s=3+R()*6;spawn(cx,cy,Math.cos(t2)*s,Math.sin(t2)*s,R()<.5?rgb(230,240,220):rgb(170,160,140),20+R()*20,0,0,0,1);}
  flash(cx,cy,70,[220,255,200],10);ST.shake=Math.min(24,ST.shake+14);
}
export function updStorm(){
  if(!ST.storm)return;const s=ST.storm;
  if(--s.life<=0){ST.storm=null;return;}
  if(R()<.07)lightningStrike(s.x+(R()-.5)*220,0,6+R()*6|0);
  for(let k=0;k<5;k++)spawn(s.x+(R()-.5)*300,ST.camY-4,(R()-.5)*.3,3+R()*1.5,rgb(130,160,230),160,R()<.4?WATER:0,0,1);
}
export function nova(){
  fxWord(pl_.x,pl_.y-34,'VWOOOM!',1.3,'#8dffb0',true);fxBurst(pl_.x,pl_.y-8,70,'#8dffb0');fxImpact(pl_.x,pl_.y-8,3);
  const p=pl_;rings.push({x:p.x,y:p.y-8,r:4,vr:4,life:12,c:[200,255,220]},{x:p.x,y:p.y-8,r:2,vr:3,life:15,c:[60,255,110]});
  flash(p.x,p.y-8,80,[80,255,130],10);ST.shake=Math.min(22,ST.shake+12);
  const cx=p.x,cy=p.y-8,r=44; bgHit(cx,cy,30);
  for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const d=Math.hypot(xx,yy);if(d>r||d<10)continue;const X=cx+xx|0,Y=cy+yy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;
    const f=1-d/r;
    if(KIND[m]===S){if(m!==STEEL&&R()<f*.8/(1+HARD[m]*.3)){if(R()<.5){spawn(X,Y,xx/d*5*f+R()-.5,yy/d*5*f-1,col[i],90,RUBBLE,0);t[i]=0;}else crumble(i);markDirty(i);wake(i);}}
    else if(KIND[m]===P||KIND[m]===L){if(R()<f+.2){spawn(X,Y,xx/d*6*f,yy/d*6*f-1,col[i],80,m,0);t[i]=0;wake(i);}}
    else{t[i]=0;wake(i);}
  }
  damageEnemies(cx,cy,r*1.3,40,0,0,true);
  for(let k=0;k<160;k++){const a=R()*6.283;spawn(cx,cy,Math.cos(a)*(4+R()*3),Math.sin(a)*(4+R()*3),gcol(),18+R()*15,0,1,0,1);}
  for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r*2){b.vx+=dx/d*6;b.vy+=dy/d*6-2;}}
}
// a chunk already in flight near the grab point
function grabBody(cx,cy,r){let best=null,bd=1e9;
  for(const b of bodies){if(b.held||Math.hypot(b.x-cx,b.y-cy)>b.rmax+r)continue;
    for(let k=0;k<24;k++){const a=k/24*6.283,d=(k&3)/3*r,X=cx+Math.cos(a)*d,Y=cy+Math.sin(a)*d;if(bodyAt(b,X,Y)){const dd=Math.hypot(b.x-cx,b.y-cy);if(dd<bd){bd=dd;best=b;}break;}}}
  return best;}
// the whole connected structure under the grab point (a building, a tree, a car...), unless it is the landscape itself
const GRABCAP=30000;
export function grabRegion(cx,cy,r,maxR=1e9){ // maxR: tear off only a chunk this far from where it was grabbed
  let s=-1,sd=1e9;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const X=cx+x,Y=cy+y,d=x*x+y*y;if(d>r*r||X<0||X>=W||Y<0||Y>=H-1)continue;const m=t[Y*W+X];if(KIND[m]===S&&!gnd[Y*W+X]&&d<sd){sd=d;s=Y*W+X;}}
  if(s<0)return 0;
  // the street / deck it stands on stays behind: first row below that runs wider than any building
  const sx0=s%W;let gl=H;
  for(let y=(s/W)|0;y<H;y++){const m=t[y*W+sx0];if(KIND[m]!==S)continue;if(NAT[m]){gl=y;break;}
    let a=sx0,b=sx0;while(a>0&&BLDS(t[y*W+a-1])&&sx0-a<220)a--;while(b<W-1&&BLDS(t[y*W+b+1])&&b-sx0<220)b++;if(b-a>200){gl=y;break;}}
  if(((s/W)|0)>=gl)return 0;
  const id=++ST.vgen,sr=rid[s],sx=s%W,sy=(s/W)|0,ph=R()*6.283;let h=0,n=0;q[n++]=s;vis[s]=id;
  const inR=j=>{if(maxR>=1e9)return true;const dx=j%W-sx,dy=((j/W)|0)-sy,a=Math.atan2(dy,dx),lim=maxR*(.78+.22*Math.sin(a*5+ph)+.08*Math.sin(a*11));return dx*dx+dy*dy<=lim*lim;}; // ragged, torn edge // only the piece grabbed: never the wreckage piled against it
  while(h<n){const i=q[h++],x=i%W;if(n>GRABCAP)return 0;
    for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,i-W,i+W]){if(j<0||j>=N||vis[j]===id||((j/W)|0)>=gl)continue;const m=t[j];if(KIND[m]!==S||gnd[j]||(sr&&rid[j]!==sr)||!inR(j))continue;vis[j]=id;q[n++]=j;}}
  for(let k=0;k<n;k++)markDirty(q[k]);
  return n;
}
// clear whatever world pixels a carried load overlaps (so it never starts a throw stuck inside terrain)
export function smashOverlap(b){const c=Math.cos(b.a),s2=Math.sin(b.a);
  for(let k=0;k<b.ex.length;k++){const X=Math.round(b.x+b.ex[k]*c-b.ey[k]*s2),Y=Math.round(b.y+b.ex[k]*s2+b.ey[k]*c);if(X<0||X>=W||Y<0||Y>=H-40)continue;
    for(const i of [Y*W+X,Y*W+X+1,(Y+1)*W+X]){const m=t[i];if(KIND[m]===S||KIND[m]===P){if(ST.np<MP-300&&R()<.5)spawn(i%W,(i/W)|0,(R()-.5)*2,-R()*1.5,col[i],70,KIND[m]===S?RUBBLE:m,0);setc(i,EMPTY);}}}}
export function updTelekinesis(){
  const pw=ST.CH.powers[ST.cur], tk=pw&&pw.tk, want=mouse.down&&!!tk;
  if(want&&!tkPrev&&!ST.held&&!ST.heldE&&pl_.en>=15){
    // rip a chunk out of the world at the cursor (or within arm's reach)
    let cx=mouse.wx|0,cy=mouse.wy|0;
    if(tk.range){const a=aim(),d=Math.min(a.d,tk.range);cx=a.h.x+a.dx*d|0;cy=a.h.y+a.dy*d|0;}
    const r=tk.r;let n=0;
    // an enemy under the grab point gets lifted first (bosses are too heavy)
    let ge=null,gd=r+8;for(const e of enemies){if(e.def.title||e.hp<=0)continue;const d=Math.hypot(e.x-cx,e.y-cy)-e.def.w/2;if(d<gd){gd=d;ge=e;}}
    const fb=ge?null:grabBody(cx,cy,r);
    snd('rip',cx,cy,{v:.7});
    if(ge){ST.heldE=ge;ge.grabbed=true;pl_.en-=15;rings.push({x:ge.x,y:ge.y,r:ge.def.w,vr:-1,life:12,c:ST.CH.glow});fxWord(ge.x,ge.y-ge.def.h/2-6,'GOTCHA!',1,'#ff9ad8',true);}
    else if(fb){fb.held=true;fb.thrown=false;fb.topple=0;ST.held=fb;pl_.en-=15;ST.held.vy=-2;ST.held.tk=tk;ST.held.overhead=!!tk.overhead;ST.held.lift=0;rings.push({x:fb.x,y:fb.y,r:fb.rmax,vr:-1,life:14,c:ST.CH.glow});ST.shake+=4;}
    else{
    n=grabRegion(cx,cy,r);
    if(!n)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r*(0.75+R()*.3))continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(m&&(KIND[m]===S||KIND[m]===P)){q[n++]=i;markDirty(i);}}
    if(n>=12){pl_.en-=15;ST.held=makeBody(q,n,true);if(ST.held){ST.held.vy=-2;ST.held.tk=tk;ST.held.overhead=!!tk.overhead;ST.held.lift=0;if(ST.held.overhead){fxWord(cx,cy-10,'RRRIIP!',1.2,'#bff07a',true);pl_.landF=8;}rings.push({x:cx,y:cy,r:r,vr:-.6,life:14,c:ST.CH.glow});ST.shake+=4;for(let k=0;k<40;k++){const a=R()*6.283;spawn(cx+Math.cos(a)*r,cy+Math.sin(a)*r,(R()-.5)*2,-R()*2,rgb(140,130,120),30,0,0,1);}}}}
  }
  if(ST.held){
    const b=ST.held,t2=b.tk||tk||{};
    if(!bodies.includes(b))ST.held=null;
    else if(!want||pl_.en<=0){
      b.held=false;b.thrown=true;b.tx=b.ty=undefined;snd('throw',b.x,b.y);
      if(b.overhead){ // heave it from above the head; never back through Hulk himself
        const a=aim();let dx=a.dx,dy=a.dy;if(Math.abs(dx)<.35){dx=(dx<0?-1:dx>0?1:pl_.face)*.35;const d=Math.hypot(dx,dy);dx/=d;dy/=d;}
        pl_.face=dx<0?-1:1;const v=4+9*Math.min(1,Math.sqrt(300/b.n));smashOverlap(b);
        b.vx=dx*v+pl_.vx*.5;b.vy=dy*v-1.8;b.va=pl_.face*.05;b.safeP=ST.frame+40;b.overhead=false;
        if(dy>.2)b.x+=pl_.face*(b.lw/2+ST.PW);
        pl_.throwF=10;pl_.vx+=pl_.face*1.2;ST.shake+=6;fxWord(b.x,b.y-b.rmax,'HRRAAGH!',1.3,'#bff07a',true);
      }
      else if(t2.throwMul){b.vx*=t2.throwMul;b.vy*=t2.throwMul;}
      else{const a=aim();b.vx=a.dx*10;b.vy=a.dy*10-1.5;b.va=(R()-.5)*.1;ST.shake+=4;}
      ST.held=null;
    }
    else {pl_.en-=.2;
      if(b.overhead){ // resting on Hulk's raised hands: bottom of the load sits just above his fists
        const tx=pl_.x+(b.cx-b.lw/2),ty=pl_.y-ST.SH-5-(b.lh-b.cy);b.lift=Math.min(1,b.lift+.09);
        const k=b.lift<1?.3:1;b.x+=(tx-b.x)*k;b.y+=(ty-b.y)*k;b.vx=pl_.vx;b.vy=pl_.vy;b.a*=.75;b.va=0;
        smashOverlap(b); // ceilings and trees in the way get smashed, never clipped
      }
      else if(t2.overhead){b.tx=pl_.x;b.ty=pl_.y-ST.PH-b.rmax*.6-4;}else{b.tx=mouse.wx;b.ty=mouse.wy;}
      if(!b.overhead)for(let k=0;k<6;k++){const j=R()*b.ex.length|0;spawn(b.x+b.ex[j],b.y+b.ey[j],(R()-.5)*.5,(R()-.5)*.5,ST.CH.thrust(),10,0,1,0,1);} // telekinetic shimmer (Hulk just carries it)
      else if(ST.frame%5===0){const j=R()*b.ex.length|0;spawn(b.x+b.ex[j],b.y+b.ey[j],(R()-.5)*.6,.5,rgb(150,140,125),14,0,0,1);} // grit trickling off the load
      if(t2.tether){const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+b.x)/2+(R()-.5)*8,(h.y+b.y)/2+(R()-.5)*8],[b.x,b.y]],life:1,c:ST.CH.tetherC||[100,220,140],g:ST.CH.tetherG||[40,160,80]});}}
  }
  if(ST.heldE){
    const e=ST.heldE,t2=tk||{};
    if(e.hp<=0||!enemies.includes(e)){e.grabbed=false;ST.heldE=null;}
    else if(!want||pl_.en<=0){ // fling it: it wrecks whatever it hits, including other enemies
      e.grabbed=false;snd('throw',e.x,e.y);const a=aim();let dx=a.dx,dy=a.dy;if(t2.overhead&&Math.abs(dx)<.35){dx=(dx<0?-1:1)*.35;const d=Math.hypot(dx,dy);dx/=d;dy/=d;}
      const sp=t2.overhead?9:11;e.vx=dx*sp;e.vy=dy*sp-1.5;e.thrownT=70;if(t2.overhead)pl_.throwF=10;ST.heldE=null;ST.shake+=4;fxWord(e.x,e.y-e.def.h/2-6,'YOINK!',1,'#ff9ad8',true);}
    else{pl_.en-=.15;let tx=mouse.wx,ty=mouse.wy;if(t2.overhead){tx=pl_.x;ty=pl_.y-ST.SH-5-e.def.h/2;}
      e.vx=(tx-e.x)*.25;e.vy=(ty-e.y)*.25;e.x+=e.vx;e.y+=e.vy;e.face=pl_.x>e.x?1:-1;hitEnemy(e,.12,0,0);
      for(let k=0;k<3;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*.5,(R()-.5)*.5,ST.CH.thrust(),10,0,1,0,1);
      if(t2.tether){const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2+(R()-.5)*8,(h.y+e.y)/2+(R()-.5)*8],[e.x,e.y]],life:1,c:[255,170,230],g:[200,90,190]});}}
  }
  tkPrev=want;
}
export function updShots(world=true){
  for(let n=shots.length-1;n>=0;n--){
    const s=shots[n];
    if(s.k==null)s.k=s.owner==='enemy'?1:ST.aoeK;ST.aoeC=s.k; // a shot keeps the area size it was fired with
    if(s.type==='shield')continue; // Captain America's shield flies itself (heroes/cosmic.js)
    if(s.delay>0){s.delay--;const h=hand();s.x=h.x;s.y=h.y;continue;}
    if(ST.stasis&&inStasis(s.x,s.y))continue; // frozen mid-flight
    if(!world&&s.owner==='enemy')continue; // Tactical Focus: enemy fire crawls
    if(s.type==='pin'){ // Mjolnir falling from the sky onto its mark
      if(s.target&&s.target.hp>0&&enemies.includes(s.target))s.x+=(s.target.x-s.x)*.25;let hit=false;
      for(let k=0;k<9;k++){s.y+=1;const X=s.x|0,Y=s.y|0;if(Y>=H-2){hit=true;break;}if(Y<0)continue;const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L){hit=true;break;}const e=enemyAt(s.x,s.y,1);if(e){hit=e;break;}}
      spawn(s.x+(R()-.5)*3,s.y-4,(R()-.5)*.5,-1,pickC(BLUE),10,0,1,0,1);
      if(hit||--s.life<=0){const e=hit&&hit!==true?hit:null;explode(s.x|0,s.y|0,8,{col:BLUE,self:true,word:'THOOOOM!'});lightningStrike(s.x,s.y,6);if(e)hitEnemy(e,40,0,2);pins.push({x:s.x,y:s.y,life:360,e});shots.splice(n,1);}
      continue;}
    if(s.type==='axe'){ // Stormbreaker: a razor-thin cut through everything on its line
      s.spin+=.6;const st=Math.ceil(Math.hypot(s.vx,s.vy)),sp=Math.hypot(s.vx,s.vy)||1,nx=-s.vy/sp,ny=s.vx/sp;sliceLine(s.x,s.y,s.x+s.vx,s.y+s.vy,{edge:[200,220,255],quiet:true,push:1.3}); // the edge severs chunks and leaves a clean cut
      for(let k=0;k<st;k++){s.x+=s.vx/st;s.y+=s.vy/st;if(s.x<1||s.x>=W-1||s.y<-SKY||s.y>=H-1){s.life=0;break;}
        for(let w=-1;w<=1;w++){const X=s.x+nx*w|0,Y=s.y+ny*w|0;if(X<0||X>=W||Y<0||Y>=H-42)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F)continue;if(m===OBSID&&R()<.7)continue;
          if(ST.np<MP-300&&R()<.25)spawn(X,Y,s.vx*.2+(R()-.5)*2,s.vy*.2-R()*2,KIND[m]===S&&R()<.5?rgb(200,220,255):col[i],40,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,KIND[m]===S?1:0);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}setc(i,EMPTY);}}
      for(const e of enemies){if(!s.hitSet.has(e)&&Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-s.y)<e.def.h/2+4){s.hitSet.add(e);hitEnemy(e,45,s.vx*.6,s.vy*.6);flash(s.x,s.y,16,BLUE,4);snd('slash',s.x,s.y);}}
      spawn(s.x,s.y,(R()-.5)*1.5,(R()-.5)*1.5,pickC(BLUE),10,0,1,0,1);
      if(--s.life<=0){explode(s.x|0,s.y|0,8,{col:BLUE,self:true});for(let q2=0;q2<3;q2++)zap(s.x,s.y,s.x+(R()-.5)*60,s.y+(R()-.5)*60,[230,240,255],[120,170,255]);shots.splice(n,1);}
      continue;}
    if(!s.snd){s.snd=1;const nm=SHOT_SND[s.type];if(nm)snd(nm,s.x,s.y,{v:s.owner==='enemy'?.5:.7});}
    if(s.type==='hammer')sndLoop('hammer','wind',s.x,s.y,{v:.7});
    if(s.type==='hammer'){ // Mjolnir: ploughs out, then flies home
      s.spin+=.5;
      if(s.out>0){s.out--;}else{const h=hand(),dx=h.x-s.x,dy=h.y-s.y,d=Math.hypot(dx,dy)||1;s.vx+=(dx/d*8-s.vx)*.18;s.vy+=(dy/d*8-s.vy)*.18;if(!s.back){s.back=true;s.hitSet.clear();}if(d<8){shots.splice(n,1);flash(h.x,h.y,10,BLUE,3);continue;}}
      const st=Math.ceil(Math.hypot(s.vx,s.vy));
      for(let k=0;k<st;k++){s.x+=s.vx/st;s.y+=s.vy/st;if(k%2===0)carve(s.x,s.y,3.2,s.vx,s.vy);}
      for(const e of enemies){if(!s.hitSet.has(e)&&Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-s.y)<e.def.h/2+4){s.hitSet.add(e);hitEnemy(e,30,s.vx*.8,s.vy*.8);flash(s.x,s.y,16,BLUE,4);}}
      for(const b of bodies){if(!b.held&&Math.hypot(b.x-s.x,b.y-s.y)<b.rmax+3&&bodyAt(b,s.x,s.y)){b.vx+=s.vx*.6;b.vy+=s.vy*.6;b.thrown=true;}}
      spawn(s.x,s.y,(R()-.5)*.6,(R()-.5)*.6,pickC(BLUE),10,0,1,0,1);
      if(ST.frame%5===0)ST.shake=Math.max(ST.shake,1.5);
      if(--s.life<=0)shots.splice(n,1);
      continue;
    }
    if(s.grav)s.vy+=s.grav;
    if(s.home){const e=nearestEnemy(s.x,s.y,220);if(e){const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy)||1;s.vx+=(dx/d*5-s.vx)*.12;s.vy+=(dy/d*5-s.vy)*.12;}}
    if(s.type==='missile'){
      s.wob+=.3;const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy)||1;if(s.life<205){s.vx=s.vx*.9+(dx/d+Math.sin(s.wob)*.3*dy/d)*.75;s.vy=s.vy*.9+(dy/d-Math.sin(s.wob)*.3*dx/d)*.75;}
      const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx*=5.5/sp;s.vy*=5.5/sp;}
      spawn(s.x,s.y,(R()-.5)*.4,(R()-.5)*.4-.1,rgb(120+R()*40,120+R()*40,125+R()*40),35+R()*20,0,0,0,1);
      spawn(s.x,s.y,-s.vx*.4+(R()-.5)*.5,-s.vy*.4+(R()-.5)*.5,rgb(255,170+R()*60,60),7,0,1,0);
    } else if(s.type==='bolt'){
      for(let k=0;k<2;k++){const a=ST.frame*.6+k*3.14;spawn(s.x+Math.cos(a)*2,s.y+Math.sin(a)*2,-s.vx*.1+(R()-.5)*.4,-s.vy*.1+(R()-.5)*.4,gcol(),14,0,1,0,1);}
    } else if(s.col){spawn(s.x,s.y,-s.vx*.1+(R()-.5)*.4,-s.vy*.1+(R()-.5)*.4,pickC(s.col),10,0,1,0,1);}
    else if(s.type==='bomb'&&ST.frame%3===0)spawn(s.x,s.y,0,0,rgb(255,120,60),6,0,1,0);
    let hit=false;const steps=Math.ceil(Math.hypot(s.vx,s.vy))||1;
    for(let k=0;k<steps;k++){s.x+=s.vx/steps;s.y+=s.vy/steps;
      if(s.x<0||s.x>=W||s.y>=H||s.y<-SKY-60){hit='out';break;}
      if(s.y>=0){const m=t[(s.y|0)*W+(s.x|0)];if(m!==0&&KIND[m]!==G&&KIND[m]!==F){hit=true;break;}}
      if(s.owner==='enemy'){const p=pl_;if(Math.abs(s.x-p.x)<=ST.PW/2+1&&s.y>=p.y-ST.PH&&s.y<=p.y){hurt(s.dmg);hit='player';break;}
        if(ST.decoy&&Math.abs(s.x-ST.decoy.x)<=4&&s.y>=ST.decoy.y-ST.SH&&s.y<=ST.decoy.y){ST.decoy.hp-=s.dmg||7;hit='player';break;}}
      else{
        if(s.type!=='missile')for(const b of bodies){if(b.held)continue;if(Math.abs(s.x-b.x)<b.rmax+1&&Math.abs(s.y-b.y)<b.rmax+1&&bodyAt(b,s.x,s.y)){hit=true;break;}}
        const he=enemyAt(s.x,s.y,1);if(he&&he!==s.src&&!(s.team&&he.team===s.team))hit=true;
        else if((s.boom||0)>=5||s.onHit&&s.prox!==false){const ne=nearestEnemy(s.x,s.y,(s.boom||6)*.7*s.k);if(ne&&ne!==s.src)hit=true;} // proximity fuse: blasts go off beside a target, so they work in open sky too
      }
      if(hit)break;
    }
    if(--s.life<=0)hit=true;
    if(hit){
      if(hit==='player'){flash(s.x,s.y,10,s.col||[255,80,60],4);for(let k=0;k<8;k++)spawn(s.x,s.y,(R()-.5)*3,(R()-.5)*3,pickC(s.col||[255,80,60]),10,0,1,1);}
      else if(hit===true&&s.onHit)s.onHit(s);
      else if(hit===true)explode(s.x,s.y,s.boom||4,{fire:s.fire||0,green:s.green,col:s.ecol,enemy:s.owner==='enemy',dmg:s.dmg});
      shots.splice(n,1);
    }
  }
}
export function updDrones(){
  for(let n=drones.length-1;n>=0;n--){
    const d=drones[n];d.ph+=.05;const tx=pl_.x+Math.cos(d.ph+n*2.1)*22,ty=pl_.y-28+Math.sin(d.ph*1.3+n)*7;
    d.x+=(tx-d.x)*.08;d.y+=(ty-d.y)*.08;
    spawn(d.x+(R()-.5)*3,d.y+2,(R()-.5)*.3,.8+R(),d.red?rgb(255,60+R()*90|0,40):R()<.5?rgb(255,200,90):gcol(),6,0,1,0);
    if(d.red&&d.life<45){const dx=mouse.wx-d.x,dy=mouse.wy-d.y,dd=Math.hypot(dx,dy)||1;d.x+=dx/dd*6;d.y+=dy/dd*6;if(--d.life<=0||solidAt(d.x,d.y)||enemyAt(d.x,d.y,2)){explode(d.x|0,d.y|0,11,{fire:.25,col:[255,60,40]});damageEnemies(d.x,d.y,24,40,0,-3,true);drones.splice(n,1);}continue;}
    if(--d.cool<=0){ // laser ray: nearest enemy if any, else the cursor
      const e=nearestEnemy(d.x,d.y,240);const gx=e?e.x:mouse.wx,gy=e?e.y:mouse.wy;
      const dx=gx-d.x,dy=gy-d.y,dd=Math.hypot(dx,dy)||1;let x=d.x,y=d.y;
      for(let s=0;s<300;s++){x+=dx/dd;y+=dy/dd;const X=x|0,Y=y|0;if(X<0||X>=W||Y>=H||Y<-SKY)break;const hitE=enemyAt(x,y,1);if(hitE){hitEnemy(hitE,12,dx/dd*2,dy/dd*2);break;}const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){explode(X,Y,d.red?7:4,d.red?{fire:.15,col:[255,60,40]}:{fire:.15,green:true});break;}}
      beams.push({x0:d.x,y0:d.y,x1:x,y1:y,life:4,w:1,c:[255,120,90],g:[255,60,40]});
      d.cool=26+R()*12|0;
    }
    if(--d.life<=0){explode(d.x,d.y,6,d.red?{fire:.2,col:[255,60,40]}:{fire:.2,green:true});drones.splice(n,1);}
  }
}
export function updVortex(){
  const v=ST.vortex;if(!v)return;if(v.k==null)v.k=ST.aoeC||1;const k0=ST.aoeC;ST.aoeC=v.k;try{updVortex1(v);}finally{ST.aoeC=k0;}}
function updVortex1(v){
  if(--v.life<=0){explode(v.x,v.y,14,{fire:.3,green:true});rings.push({x:v.x,y:v.y,r:40*v.k,vr:-2.5*v.k,life:14,c:[120,255,160]});ST.vortex=null;return;}
  const r=48*v.k;
  for(let n=0,nn=Math.min(4000,1100*v.k*v.k|0);n<nn;n++){
    const a=R()*6.283,d=Math.sqrt(R())*r,X=v.x+Math.cos(a)*d|0,Y=v.y+Math.sin(a)*d|0;
    if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(m===0)continue;
    if(d<4){if(R()<.5)spawn(X,Y,(R()-.5)*2,(R()-.5)*2,col[i],12,0,1,0);setc(i,EMPTY);continue;}
    if(KIND[m]===S){if(m!==STEEL&&R()<.05*(1-d/r)*(6/(1+HARD[m]))){if(R()<.4){spawn(X,Y,(v.x-X)*.05,(v.y-Y)*.05,col[i],90,RUBBLE,0,1);t[i]=0;}else crumble(i);markDirty(i);wake(i);}continue;}
    const ux=(v.x-X)/d,uy=(v.y-Y)/d,sx=ux-uy*.8,sy=uy+ux*.8;
    const nx=X+Math.round(sx),ny=Y+Math.round(sy),j=ny*W+nx;
    if(t[j]===0)swap(i,j);
  }
  for(let n=0;n<ST.np;n++){const dx=v.x-px[n],dy=v.y-py[n],d=Math.hypot(dx,dy);if(d<r*1.6&&d>1){pvx[n]+=dx/d*.35-dy/d*.15;pvy[n]+=dy/d*.35+dx/d*.15;}}
  for(const b of bodies){if(b.held)continue;const dx=v.x-(b.x),dy=v.y-(b.y),d=Math.hypot(dx,dy)||1;if(d<r*2){b.vx+=dx/d*.6;b.vy+=dy/d*.6-.3;}}
  for(const e of enemies){const dx=v.x-e.x,dy=v.y-e.y,d=Math.hypot(dx,dy)||1;if(d<r*1.5){e.vx+=dx/d*.5;e.vy+=dy/d*.5;if(d<8)hitEnemy(e,1.5,0,0);}}
  const dx=v.x-pl_.x,dy=v.y-pl_.y+8,d=Math.hypot(dx,dy);if(d<r&&d>8){pl_.vx+=dx/d*.12;pl_.vy+=dy/d*.12;}
  for(let k=0;k<8;k++){const a=R()*6.283,rr=r*(.5+R()*.5);spawn(v.x+Math.cos(a)*rr,v.y+Math.sin(a)*rr,-Math.sin(a)*2,Math.cos(a)*2,gcol(),16,0,1,0);}
  ST.shake=Math.max(ST.shake,1.2);
}

export function updStrikes(){
  for(let n=strikes.length-1;n>=0;n--){
    const s=strikes[n];
    if(s.t>0){s.t--;if(s.t===0){s.beam=36;flash(s.x,ST.camY+VH/2,120,[120,255,160],10);ST.shake=Math.min(24,ST.shake+10);}continue;}
    if(s.beam>0){
      s.beam--;
      // carve a deep shaft, deepest at the end
      let y=0;for(;y<H;y++){const m=t[y*W+s.x];if(m&&KIND[m]!==G&&KIND[m]!==F)break;}
      const by=Math.min(H-1,y+4);
      bgHit(s.x,by,9);
      for(let yy=y-2;yy<by+3;yy++)for(let xx=-7;xx<=7;xx++){const X=s.x+xx,Y=yy;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G)continue;if(m===STEEL&&R()<.5)continue;
        if(R()<.3)spawn(X,Y,(R()-.5)*6,-2-R()*5,R()<.4?gcol():col[i],60,KIND[m]===S?RUBBLE:0,0);if(m===PROPANE)booms.push([X,Y,7]);setc(i,R()<.15?GFIRE:EMPTY);}
      beams.push({x0:s.x,y0:-10,x1:s.x,y1:by,life:1,w:5+((ST.frame>>1)&1)*2,c:[235,255,240],g:[90,255,140]});
      flash(s.x,by,30,[100,255,150],2);damageLine(s.x,ST.camY-10,s.x,by,8,4);
      for(let k=0;k<4;k++)spawn(s.x+(R()-.5)*14,by,(R()-.5)*5,-R()*5,gcol(),20,0,1,1);
      ST.shake=Math.max(ST.shake,5);
      if(s.beam===0){explode(s.x,by,20,{fire:.3,green:true});strikes.splice(n,1);}
    }
  }
}
export function updFx(){
  for(let n=rings.length-1;n>=0;n--){const r=rings[n];r.r+=r.vr;if(--r.life<=0||r.r<1)rings.splice(n,1);}
  for(let n=flashes.length-1;n>=0;n--)if(--flashes[n].life<=0)flashes.splice(n,1);
  for(let n=afters.length-1;n>=0;n--)if(--afters[n].life<=0)afters.splice(n,1);
  for(let n=beams.length-1;n>=0;n--)if(--beams[n].life<0)beams.splice(n,1);
  // chain-reaction explosions queued by the sim
  let k=0;while(booms.length&&k++<6){const [x,y,r]=booms.shift();explode(x,y,r,{fire:.5});}
  if(booms.length>40)booms.length=40;
}
