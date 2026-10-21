// Explosions, back-wall hits, punch-out.
import { flash, fxBoom, rings } from '../render/fx.js';
import { ST } from '../state.js';
import { EMBER, EMPTY, FIRE, GFIRE, GLASS, HARD, ICE, KIND, L, NEON, OBSID, OIL, P, PROPANE, R, RUBBLE, S, SMOKE, STEEL, rgb } from './materials.js';
import { PHYS } from './physics.js';
import { H, W, bg, bgB, bgD, booms, col, markDirty, setc, t, vel, wake } from './grid.js';
import { bodies, pin, q } from './support.js';
import { dust, finishBody, makeBody } from './bodies.js';
import { MP, dustCol, gcol, rubbleCol, solidAt, spawn, spawnDust } from './particles.js';
import { snd } from '../sfx.js';
import { pickC, shockFx } from '../heroes/powers.js';
import { solidCells } from '../heroes/wave2.js';
import { hurt, pl_ } from '../player.js';
import { damageEnemies } from '../enemies/core.js';
import { AOE_MAXR } from '../heroes/aoe.js';

// ================= destruction =================
export function explode(cx,cy,r,opt={}){
  if(!opt.enemy&&ST.aoeC!==1&&!opt.noK)r=Math.max(1,Math.min(AOE_MAXR,Math.round(r*ST.aoeC)));
  const fire=opt.fire||0, green=opt.green, ec=opt.col;
  ST.lastBoom={x:cx,y:cy,f:ST.frame,r};
  if(r>=6&&!opt.quiet)fxBoom(cx,cy,r,opt);
  if(!opt.quiet||r>=9)snd(r>=6?'boom':'pop',cx,cy,{size:r/12,gap:r>=10?.025:.05,v:Math.min(1,.45+r/14)});
  let parts=0,glassN=0,steelN=0;exN=0;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
    const d2=x*x+y*y;if(d2>r*r)continue;
    const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;
    const i=Y*W+X,m=t[i];if(m===0)continue;
    const dn=Math.sqrt(d2)/r;
    if(HARD[m]>0&&R()*10<HARD[m]-(1-dn)*7)continue;
    if(m===STEEL&&R()<.25){if(R()<.3){steelN++;spawn(X,Y,(R()-.5)*4,-R()*3,rgb(255,210+R()*40|0,140),8+R()*10,0,1,1);}continue;}
    const k=KIND[m];if(m===GLASS)glassN++;
    if(k===S&&exN<EXCAP){exI[exN]=i;exM[exN]=m;exC[exN++]=col[i];}
    if(m===PROPANE){booms.push([X,Y,7]);}
    if(R()<(k===S?.62:.45)&&parts<1800){parts++;
      const a=Math.atan2(y,x)+(R()-.5)*.9, sp=(1+R()*4.5*(1-dn))*(1+r/16);
      spawn(X,Y,Math.cos(a)*sp,Math.sin(a)*sp-1.8,col[i],90+R()*90,k===S?RUBBLE:(k===P||k===L)?m:0,m===GLASS?1:0);
    }
    if(m===OIL){setc(i,FIRE);continue;}
    setc(i,fire&&R()<fire?(green?GFIRE:FIRE):EMPTY);
  }
  if(!opt.quiet||r>=4)blastDebris(cx,cy,r);
  bgHit(cx,cy,r*1.2|0);
  if(glassN>5)snd('glass',cx,cy,{v:Math.min(1,glassN/30)});if(steelN>3)snd('clang',cx,cy,{v:Math.min(1,steelN/12),gap:.12});
  // shockwave: the crater rim cracks into loose rubble, loose stuff gets thrown
  const r2=r*1.7;
  for(let n=0;n<r*r*3;n++){const a=R()*6.283,d=r+R()*(r2-r),X=cx+Math.cos(a)*d|0,Y=cy+Math.sin(a)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;
    const f=1-(d-r)/(r2-r);
    if(KIND[m]===S){if(m!==STEEL&&m!==OBSID&&R()<f*.4/(1+HARD[m]*.25)){if(R()<.4){spawn(X,Y,Math.cos(a)*2.5*f,Math.sin(a)*2.5*f-1.5,col[i],90,RUBBLE,0);t[i]=0;}else if(R()<PHYS.mix.rimRubble){t[i]=RUBBLE;col[i]=rubbleCol(col[i]);vel[i]=3;}else{spawnDust(X,Y,Math.cos(a)*f,Math.sin(a)*f-.5,dustCol(col[i]));t[i]=0;}markDirty(i);wake(i);}}
    else if((KIND[m]===P||KIND[m]===L)&&R()<.6){spawn(X,Y,Math.cos(a)*3*f,Math.sin(a)*3*f-1.8,col[i],70,m,0);t[i]=0;wake(i);}}
  // flung embers spread fire; dust + smoke cloud
  if(fire&&!green)for(let n=0;n<r;n++){const a=R()*6.283,sp=1+R()*3;spawn(cx,cy,Math.cos(a)*sp,Math.sin(a)*sp-2,rgb(255,150,40),80,EMBER,1);}
  for(let n=0;n<r*4;n++){const a=R()*6.283,d=R()*r*1.3,X=cx+Math.cos(a)*d|0,Y=cy+Math.sin(a)*d|0;if(R()<.5)dust(X,Y);else if(X>=0&&X<W&&Y>=0&&Y<H&&t[Y*W+X]===0)setc(Y*W+X,SMOKE);}
  // sparks + flash + rings
  for(let n=0;n<r*6;n++){const a=R()*6.283,sp=R()*r*.45+.5;spawn(cx,cy,Math.cos(a)*sp,Math.sin(a)*sp,green?gcol():ec?pickC(ec):rgb(255,150+R()*100,40+R()*60),10+R()*22,0,1,R()<.5?1:0,1);}
  flash(cx,cy,r*3.2,green?[60,255,110]:ec||[255,170,60],9);
  rings.push({x:cx,y:cy,r:r*.5,vr:Math.max(1.5,r*.24),life:14,c:green?[120,255,160]:ec||[255,220,150]});
  if(r>7)rings.push({x:cx,y:cy,r:r*.3,vr:Math.max(1,r*.14),life:18,c:[200,190,170]});
  ST.shake=Math.min(22,ST.shake+r*.6);
  const dx=pl_.x-cx,dy=pl_.y-8-cy,dd=Math.hypot(dx,dy);
  if(dd<r*2.2&&dd>0&&!opt.self){pl_.vx+=dx/dd*3;pl_.vy+=dy/dd*3-1;}
  if(opt.enemy){if(dd<r*1.8)hurt(opt.dmg??5);if(ST.decoy&&Math.hypot(ST.decoy.x-cx,ST.decoy.y-ST.SH/2-cy)<r*2)ST.decoy.hp-=(opt.dmg??5)*1.5;}else{const tg=ST.dmgTag;if(fire>0&&!green)ST.dmgTag='fire';damageEnemies(cx,cy,r*1.7/(ST.aoeC||1),r*3.2);ST.dmgTag=tg;}
  if(r>=9&&!opt.quiet)shockFx(cx,cy,Math.min(1.4,r/18));
  if(r>=5)for(let n=0;n<r*r*1.6;n++){const an=R()*6.283,d=r*(.95+R()*.4),X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==ICE&&t[i]!==NEON)col[i]=shade(col[i],.55+R()*.25);} // scorched crater rim
  for(const b of bodies){const ddx=b.x-cx,ddy=b.y-cy,d=Math.hypot(ddx,ddy)||1;if(d<r*4+b.rmax){const f=r*3/(d+8)*Math.min(1,300/b.n);b.vx+=ddx/d*f;b.vy+=ddy/d*f-.3;b.va+=(R()-.5)*f*.04;}}
}
// what an explosion tears out leaves as two tiers of debris, scaled by blast size:
// a few solid chunks (big blasts only) that tumble, bounce and settle, plus a cloud of light dust
const EXCAP=1<<16, exI=new Int32Array(EXCAP), exM=new Uint8Array(EXCAP), exC=new Uint32Array(EXCAP);
 let exN=0;
function blastDebris(cx,cy,r){
  const CK=PHYS.chunk,D=PHYS.dust;
  if(r>=CK.minR&&exN>=12&&bodies.length<140){
    let live=0;for(const b of bodies)if(b.chunk)live++;
    const want=Math.min(CK.perBoom,CK.max-live,140-bodies.length,Math.round((r-CK.minR+1)*CK.perR*(.7+R()*.6)));
    const used=new Uint8Array(exN);
    for(let c=0;c<want;c++){
      const s0=R()*exN|0;if(used[s0])continue;
      const sx=exI[s0]%W,sy=exI[s0]/W|0,rc=CK.size[0]+R()*Math.min(CK.size[1]-CK.size[0],r/4),rr=rc*rc;
      const ids=[];let mx=W,my=H,Mx=0,My=0,gx=0,gy=0;
      for(let k=0;k<exN;k++){if(used[k])continue;const x=exI[k]%W,y=exI[k]/W|0,dx=x-sx,dy=y-sy;if(dx*dx+dy*dy>rr+R()*2)continue;
        ids.push(k);if(x<mx)mx=x;if(y<my)my=y;if(x>Mx)Mx=x;if(y>My)My=y;gx+=x;gy+=y;}
      if(ids.length<4)continue;
      const lw=Mx-mx+1,lh=My-my+1,lm=new Uint8Array(lw*lh),lc=new Uint32Array(lw*lh);
      for(const k of ids){used[k]=1;const o=(exI[k]/W-my|0)*lw+exI[k]%W-mx;lm[o]=exM[k];lc[o]=exC[k];}
      gx/=ids.length;gy/=ids.length;
      const b=finishBody(lm,lc,lw,lh,gx-mx,gy-my,gx,gy,0,ids.length,false);b.chunk=true;
      let dx=gx-cx,dy=gy-cy,d=Math.hypot(dx,dy);if(d<1){const a=R()*6.283;dx=Math.cos(a);dy=Math.sin(a);d=1;}
      const v=CK.speed*r*(.5+R()*.7)/(1+ids.length/60);
      b.vx=dx/d*v;b.vy=dy/d*v-1-R()*1.5;b.va=(R()-.5)*.2;
    }
  }
  ringChunks(cx,cy,r,false);
  const nd=Math.min(D.max,r*r*D.perR2|0);
  for(let k=0;k<nd;k++){const a=R()*6.283,d=R()*r*1.1,sp=.4+R()*(1+r*.12);
    spawnDust(cx+Math.cos(a)*d,cy+Math.sin(a)*d,Math.cos(a)*sp,Math.sin(a)*sp-.6-R()*.8,dustCol(exN?exC[R()*exN|0]:rgb(150,140,125)));}
}
// big intact chunks broken off around an impact and flung outward (blast push comes from makeBody).
// ground=true also tears slabs out of the street and terrain (ground slams)
export function ringChunks(cx,cy,r,ground){
  const M=PHYS.mix;if(r<M.ringMinR||bodies.length>=145)return;const K=Math.min(M.ringMax,Math.round(r*M.ringChunks*(.7+R()*.6)));
  for(let k=0;k<K&&bodies.length<145;k++){const a=ground?Math.PI*(.15+R()*.7):R()*6.283,d=r*(ground?.35+R()*.45:1.1+R()*.4),rc=(ground?4:6)+R()*Math.min(8,r/2);
    const n0=solidCells(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rc|0,ground);let n=0;
    for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j]; // solid cells only, no loose powder
    if(n<14)continue;
    const b=makeBody(q,n,false);if(!b)continue;b.chunk=true;
    if(ground){b.vx+=(b.x-cx)/(r||1)*2.5+(R()-.5);b.vy=-(3+R()*3.5);b.va=(R()-.5)*.15;}
    else{b.vx+=Math.cos(a)*(.8+R());b.vy+=Math.sin(a)*(.8+R())-1;}}
}
export function bgHit(cx,cy,r){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(!bgB[i])continue;
    if(R()<.3&&ST.np<MP-500){const a=Math.atan2(y,x),sp=.5+R()*2.5;spawn(X,Y,Math.cos(a)*sp,Math.sin(a)*sp-1,shade(bg[i],.8),90,RUBBLE,0);}
    bg[i]=bgD[i];bgB[i]=0;}
}
export const shade=(c,k)=>rgb((c&255)*k,((c>>8)&255)*k,((c>>16)&255)*k);
export function punchOut(p){ // armour shoves its way out instead of teleporting
  for(let yy=Math.ceil(p.y-ST.PH);yy<=Math.floor(p.y-1);yy++)for(let xx=Math.floor(p.x-ST.PW/2);xx<=Math.floor(p.x+ST.PW/2);xx++){
    if(!solidAt(xx,yy)||xx<0||xx>=W||yy<0||yy>=H)continue;const i=yy*W+xx,m=t[i],k=KIND[m];
    if(m===STEEL&&R()<.5)continue;
    spawn(xx,yy,(xx<p.x?-1:1)*(1+R()*2),-R()*2,col[i],70,k===S?RUBBLE:m,0);if(k===S)markDirty(i);t[i]=0;pin[i]=0;wake(i);}
}
