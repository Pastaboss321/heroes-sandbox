// Hero wave 2 shared state and helpers: ants, tramps, gravity zones, limbo, portals, Reweave snapshot (T0/C0/B0), web helpers; updWave2/updPortals/drawWave2.
import './storm.js'; // evaluation order: runs after heroes/storm.js
import { ST } from '../state.js';
import { EMPTY, G, GRASS, KIND, LEAF, P, R, S, WEB, WOOD, rgb } from '../world/materials.js';
import { H, N, W, col, life, markDirty, setc, t, wake } from '../world/grid.js';
import { bodies, gnd, pin, q } from '../world/support.js';
import { finishBody } from '../world/bodies.js';
import { pvx, pvy, px, py, solidAt, spawn } from '../world/particles.js';
import { fxWord, rings } from '../render/fx.js';
import { snd } from '../sfx.js';
import { shots, smashOverlap } from './powers.js';
import { hand, pl_ } from '../player.js';
import { enemies, enemyAt, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { line, pix } from '../render/canvas.js';

// ================= new hero wave: Spider-Man, Scarlet Witch, Doctor Strange, Ant-Man =================
export const ants=[],tramps=[],gzones=[],limbo=[],portals={a:null,b:null,next:'a'},RW=[];
// T0, C0, B0: shared state (ST in state.js)
export const FANT_A=["..w...w..",".wwwkwww.","..kRRRk..","kk.kkk.kk"],FANT_B=["w.......w","ww.kkk.ww","..kRRRk..",".k.kkk.k."],FANT_PAL={w:rgb(200,220,240),k:rgb(30,24,22),R:rgb(150,40,30)};
export function webEnemy(e,t){e.frozen=Math.max(e.frozen||0,t);e.webbed=Math.max(e.webbed||0,t);hitEnemy(e,4,0,0);}
export function webCell(X,Y){if(X<0||X>=W||Y<0||Y>=H-44)return;const i=Y*W+X;if(t[i]===0||KIND[t[i]]===G){setc(i,WEB);const v=R()*14|0;col[i]=rgb(222+v,222+v,228+v);}}
export function webLine(x0,y0,x1,y1){const n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);for(let k=0;k<=n;k++)webCell(x0+(x1-x0)*k/n|0,y0+(y1-y0)*k/n|0);}
export function ray(x0,y0,dx,dy,max,enemiesToo){let x=x0,y=y0;for(let s=0;s<max;s++){x+=dx;y+=dy;const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)return{x,y,hit:false};if(enemiesToo){const e=enemyAt(x,y,1);if(e)return{x,y,e,hit:true};}const m=t[Y*W+X];if(m&&(KIND[m]===S||KIND[m]===P))return{x,y,hit:true,i:Y*W+X};}return{x,y,hit:false};}
export function scaleChunk(list,n,f){let mx=W,my=H,Mx=0,My=0;for(let k=0;k<n;k++){const i=list[k],x=i%W,y=(i/W)|0;if(x<mx)mx=x;if(y<my)my=y;if(x>Mx)Mx=x;if(y>My)My=y;}
  const lw=Mx-mx+1,lh=My-my+1,src=new Uint8Array(lw*lh),sc=new Uint32Array(lw*lh);
  for(let k=0;k<n;k++){const i=list[k],x=i%W-mx,y=((i/W)|0)-my;src[y*lw+x]=t[i];sc[y*lw+x]=col[i];t[i]=0;pin[i]=0;wake(i);markDirty(i);}
  const W2=Math.max(2,Math.round(lw*f)),H2=Math.max(2,Math.round(lh*f)),lm=new Uint8Array(W2*H2),lc=new Uint32Array(W2*H2);let cnt=0,sx=0,sy=0;
  for(let y=0;y<H2;y++)for(let x=0;x<W2;x++){const X=Math.min(lw-1,x/f|0),Y=Math.min(lh-1,y/f|0),m=src[Y*lw+X];if(!m)continue;lm[y*W2+x]=m;lc[y*W2+x]=sc[Y*lw+X];cnt++;sx+=x;sy+=y;}
  if(cnt<6)return null;const b=finishBody(lm,lc,W2,H2,sx/cnt,sy/cnt,mx+lw/2,my+lh/2,0,cnt,false);smashOverlap(b);return b;}
export function solidCells(cx,cy,r,ground){let n=0;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X;if((KIND[t[i]]===S||KIND[t[i]]===P)&&(ground||!gnd[i])){q[n++]=i;markDirty(i);}}return n;}
export function updWave2(){
  // ants crawl along surfaces toward the nearest enemy, biting and eating anything organic
  for(let n=ants.length-1;n>=0;n--){const a=ants[n];if(--a.life<=0){ants.splice(n,1);continue;}const e=nearestEnemy(a.x,a.y,160);const tx=e?e.x:pl_.x+(n%20-10)*3;
    a.vx+=(Math.sign(tx-a.x)*1.4-a.vx)*.1;a.vy+=.25;let nx=a.x+a.vx,ny=a.y+a.vy;if(solidAt(nx,a.y)){if(!solidAt(nx,a.y-2)){a.y-=2;}else{a.vy=-1.2;nx=a.x;}}
    if(solidAt(nx,ny)){a.vy=0;ny=a.y;const bi=(ny+1|0)*W+(nx|0);if(bi>0&&bi<N){const m=t[bi];if((m===LEAF||m===GRASS||m===WOOD||m===WEB)&&R()<.01)setc(bi,EMPTY);}}a.x=nx;a.y=ny;
    if(e&&Math.abs(e.x-a.x)<e.def.w/2+1&&Math.abs(e.y-a.y)<e.def.h/2+1){hitEnemy(e,.25,0,0);if(R()<.05)a.life=0;}}
  for(let n=tramps.length-1;n>=0;n--){const tr=tramps[n];if(--tr.life<=0||t[tr.y*W+((tr.x0+tr.x1)>>1)]!==WEB){tramps.splice(n,1);continue;}
    const p=pl_;if(p.x>=tr.x0&&p.x<=tr.x1&&Math.abs(p.y-tr.y)<=2&&p.vy>=0&&!p.fly){p.vy=-9.5;p.ground=false;p.y-=2;snd('jump',p.x,p.y,{pitch:1.6});fxWord(p.x,p.y-ST.PH-4,'BOING!',.7,'#f3e9d2');}
    for(const e of enemies)if(e.x>=tr.x0&&e.x<=tr.x1&&Math.abs(e.y+e.def.h/2-tr.y)<3&&!e.def.fly){e.vy=-8;e.ground=false;}
    for(const b of bodies)if(!b.held&&b.x>tr.x0&&b.x<tr.x1&&Math.abs(b.y+b.lh/2-tr.y)<4&&b.vy>0)b.vy=-Math.max(4,b.vy*1.1);}
  for(let n=gzones.length-1;n>=0;n--){const z=gzones[n];if(--z.life<=0){gzones.splice(n,1);continue;}const r2=z.r*z.r;
    for(let k=0;k<ST.np;k++){const dx=px[k]-z.x,dy=py[k]-z.y;if(dx*dx+dy*dy<r2)pvy[k]-=.34;}
    for(const b of bodies)if(!b.held&&(b.x-z.x)**2+(b.y-z.y)**2<r2){b.vy-=.66;b.rest=0;}
    for(const e of enemies)if((e.x-z.x)**2+(e.y-z.y)**2<r2){e.vy-=e.def.fly?.15:.8;}
    const p=pl_;if((p.x-z.x)**2+(p.y-ST.PH/2-z.y)**2<r2&&!p.fly)p.vy-=.6;
    if(ST.frame%2===0){const an=R()*6.283,d=Math.sqrt(R())*z.r;spawn(z.x+Math.cos(an)*d,z.y+Math.sin(an)*d,0,-1.2,rgb(255,70,140),14,0,1,0,0);}}
  for(let n=limbo.length-1;n>=0;n--){const L=limbo[n];if(--L.t>0)continue;limbo.splice(n,1);const e=L.e;if(enemies.length<48){enemies.push(e);e.hp*=.6;e.frozen=60;rings.push({x:e.x,y:e.y,r:12,vr:-1,life:12,c:[255,190,70]});fxWord(e.x,e.y-12,'RETURNED',.8,'#ffc93c',true);}}
  updPortals();
  if(ST.CH.id==='strange'){RW.push({x:pl_.x,y:pl_.y,hp:pl_.hp,en:pl_.en});if(RW.length>240)RW.shift();}
}
function updPortals(){
  for(const k of ['a','b']){const P=portals[k];if(P&&--P.life<=0)portals[k]=null;}
  const A=portals.a,B=portals.b;if(!A||!B)return;
  const pass=(P,Q,o,vx,vy)=>{const s=Math.hypot(vx,vy)||1;return[Q.x+vx/s*(Q.r+2),Q.y+vy/s*(Q.r*1.4+2)];};
  const inP=(P,x,y)=>{const dx=(x-P.x)/P.r,dy=(y-P.y)/(P.r*1.4);return dx*dx+dy*dy<1;};
  for(let n=0;n<ST.np;n++)for(const [P,Q] of [[A,B],[B,A]])if(inP(P,px[n],py[n])){const s=Math.hypot(pvx[n],pvy[n])||1;px[n]=Q.x+pvx[n]/s*(Q.r+1);py[n]=Q.y+pvy[n]/s*(Q.r*1.4+1);break;}
  for(const b of bodies){if(b.held||b.portT>ST.frame)continue;for(const [P,Q] of [[A,B],[B,A]])if(inP(P,b.x,b.y)){[b.x,b.y]=pass(P,Q,b,b.vx||.01,b.vy||1);b.portT=ST.frame+25;break;}}
  for(const e of enemies){if(e.portT>ST.frame||e.grabbed)continue;for(const [P,Q] of [[A,B],[B,A]])if(inP(P,e.x,e.y)){[e.x,e.y]=pass(P,Q,e,e.vx||.01,e.vy||1);e.portT=ST.frame+30;break;}}
  for(const s of shots){if(s.portT>ST.frame)continue;for(const [P,Q] of [[A,B],[B,A]])if(inP(P,s.x,s.y)){[s.x,s.y]=pass(P,Q,s,s.vx,s.vy);s.portT=ST.frame+10;break;}}
  const p=pl_;if(!(p.portT>ST.frame))for(const [P,Q] of [[A,B],[B,A]])if(inP(P,p.x,p.y-ST.PH/2)){const [x,y]=pass(P,Q,p,p.vx||.01,p.vy||1);p.x=x;p.y=y+ST.PH/2;p.portT=ST.frame+30;snd('whoosh',x,y,{pitch:1.5});break;}
  // sand, water, fire and smoke that flow into the blue portal pour out of the orange one
  let moved=0;const r=A.r;for(let y=-Math.ceil(r*1.4);y<=r*1.4&&moved<90;y++)for(let x=-r;x<=r&&moved<90;x++){const X=A.x+x|0,Y=A.y+y|0;if(X<1||X>=W-1||Y<1||Y>=H-1||!inP(A,X,Y))continue;const i=Y*W+X,m=t[i],k=KIND[m];
    if(!m||k===S)continue;for(let tr=0;tr<4;tr++){const ox=(R()-.5)*B.r*1.6|0,oy=(R()*B.r*1.2)|0,j=((B.y+oy)|0)*W+((B.x+ox)|0);if(j>0&&j<N&&t[j]===0){t[j]=m;col[j]=col[i];life[j]=life[i];t[i]=0;wake(i);wake(j);moved++;break;}}}
}
export function drawWave2(){
  for(const a of ants)pix(a.x,a.y,rgb(110,30,20));
  for(const k of ['a','b']){const P=portals[k];if(!P)continue;const c1=k==='a'?rgb(110,200,255):rgb(255,170,60),c2=k==='a'?rgb(40,90,200):rgb(220,90,20);
    for(let n=0;n<48;n++){const an=n/48*6.283+ST.frame*.08,w=1+Math.sin(an*6+ST.frame*.3)*.08;pix(P.x+Math.cos(an)*P.r*w,P.y+Math.sin(an)*P.r*1.4*w,n&1?c1:c2,c1);}
    for(let n=0;n<10;n++){const an=ST.frame*.15+n*.63,d=P.r*.6*((n%3)/3+.3);pix(P.x+Math.cos(an)*d,P.y+Math.sin(an)*d*1.4,c2,c2);}}
  for(const z of gzones)for(let n=0;n<36;n++){const an=n/36*6.283-ST.frame*.05;if(n%3)pix(z.x+Math.cos(an)*z.r,z.y+Math.sin(an)*z.r,rgb(255,70,140),rgb(140,20,70));}
  for(const e of enemies){if(e.hang){line(e.hang.x,e.hang.y,e.x,e.y-e.def.h/2,rgb(236,236,242),0);}}
  const p=pl_;if(p.web){const h=hand();line(h.x,h.y,p.web.x,p.web.y,rgb(236,236,242),0);}
  if(p.sense>0&&(ST.frame>>2)&1){const hx=p.x,hy=p.y-ST.PH-2;for(const [a2,b2] of [[-5,-3],[0,-5],[5,-3]])line(hx,hy,hx+a2,hy+b2,rgb(240,240,250),rgb(120,120,140));}
}
