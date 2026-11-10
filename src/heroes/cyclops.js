// Cyclops: sprite, palette, rig entry, powers and roster entry.
import './wolverine.js'; // evaluation order: runs after heroes/wolverine.js
import { ST } from '../state.js';
import { EMPTY, F, G, KIND, L, OBSID, R, RUBBLE, S, STEEL, rgb } from '../world/materials.js';
import { H, VH, VW, W, col, setc, t } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { dust } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxBurst, fxImpact, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { beamCore, jets, pickC, shots, surfaceY } from './powers.js';
import { ACT, aimFrom, eyes } from './xmen.js';
import { SKY, hand, mouse, pl_ } from '../player.js';
import { damageCone, damageLine, enemies, enemyAt, hitEnemy } from '../enemies/core.js';
import { atCursor, nearestN, noTarget } from './kitlib.js';
import { applyStatus } from './abilities.js';

const SPR_CYC=[
"....hHHhh....",
"...hHHhhhh...",
"...hfffFFh...",
"...vVVVVVv...",
"...NffFFFN...",
"....NfFFN....",
"..MNNnNNNnN..",
".MNMYNNNyNNn.",
".MNMNYNyNnNn.",
".MNMNNYNNnNn.",
".MNkNyNYnkNn.",
".MNkYYyYykNn.",
".Yy.NNnNn.Yy.",
".Yy.NN.Nn.Yy.",
"....MN.Nn....",
"....MN.Nn....",
"...MN...Nn...",
"...YY...Yy...",
"...MN...Nn...",
"..MNN...NNn..",
"..MNN...NNn..",
"..nnn...nnn.."];
const PAL_CYC={h:rgb(80,50,28),H:rgb(132,92,56),N:rgb(30,46,110),n:rgb(14,22,60),M:rgb(62,86,162),Y:rgb(236,196,48),y:rgb(168,128,24),V:rgb(255,60,40),v:rgb(110,20,20),f:rgb(222,174,136),F:rgb(168,122,90),k:rgb(10,14,36)};

// animation rig entry (see render/rig.js)
ANIM.cyclops={leg:14,mid:6,armC:'MNn',tipC:'YYy',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
function bankShot(h,dx,dy,len,bounces,o){let x=h.x,y=h.y,b=0,sx=x,sy=y;const segs=[];
  for(let s=0;s<len;s++){const nx=x+dx,ny=y+dy,X=nx|0,Y=ny|0;if(nx<0||nx>=W||ny>=H){break;}
    const solid=(X,Y)=>Y>=0&&Y<H&&KIND[t[Y*W+X]]===S;
    if(solid(X,Y)){explode(X,Y,3,{self:true,quiet:true,col:[255,90,70]});if(++b>bounces)break;segs.push([sx,sy,x,y]);sx=x;sy=y;if(solid(nx|0,y|0))dx=-dx;if(solid(x|0,ny|0))dy=-dy;if(!solid(nx|0,y|0)&&!solid(x|0,ny|0)){dx=-dx;dy=-dy;}continue;}x=nx;y=ny;}
  segs.push([sx,sy,x,y]);for(const [a0,b0,a1,b1] of segs){beams.push({x0:a0,y0:b0,x1:a1,y1:b1,life:6,w:1,c:[255,220,210],g:[255,40,40]});damageLine(a0,b0,a1,b1,4,o.dmg);}}
const CYC_POWERS=[
 {n:'Optic Blast',fn:(a,p,use)=>{if(!use(.9))return;const b=aimFrom(eyes());beamCore(b,{pow:90,rad:1,len:480,w:2+((ST.frame>>1)&1),c:[255,210,200],g:[255,40,30],spark:()=>rgb(255,60+R()*120,40),dmg:4,noAsh:true});damageCone(b.h.x,b.h.y,b.dx,b.dy,200,0,.6);}},
 {n:'Bank Shot',fn:(a,p,use)=>{if(!use(10))return;ST.cd=20;p.thrustF=8;bankShot(a.h,a.dx,a.dy,700,6,{dmg:22});fxWord(a.h.x+a.dx*20,a.h.y-10,'BANK SHOT!',.8,'#ff6b5c',true);snd('zap',a.h.x,a.h.y,{pitch:1.4});}},
 {n:'Ricochet Shot',fn:(a,p,use)=>{if(!use(14))return;const o=eyes();let x=o.x,y=o.y,b=aimFrom(o),dx=b.dx,dy=b.dy,bounce=0;const pts=[[x,y]];
   for(let s2=0;s2<700&&bounce<5;s2++){const nx=x+dx,ny=y+dy,X=nx|0,Y=ny|0;if(X<1||X>=W-1||Y<1||Y>=H-1)break;const e=enemyAt(nx,ny,1);if(e)hitEnemy(e,20,dx*3,dy*3);
     const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L){pts.push([x,y]);explode(X,Y,3,{col:[255,60,40],quiet:true,self:true});
       const hx=t[(y|0)*W+X],hy=t[Y*W+(x|0)];if(hx&&KIND[hx]!==G&&KIND[hx]!==F)dx=-dx;if(hy&&KIND[hy]!==G&&KIND[hy]!==F)dy=-dy;if(!(hx&&KIND[hx]!==G)&&!(hy&&KIND[hy]!==G)){dx=-dx;dy=-dy;}bounce++;continue;}
     x=nx;y=ny;}
   pts.push([x,y]);beams.push({pts,life:6,c:[255,220,210],g:[255,40,30]});for(const pt of pts)flash(pt[0],pt[1],12,[255,60,40],4);fxWord(o.x+b.dx*30,o.y-12,'PTANG!',1,'#ff6b5c',true);ST.cd=22;}},
 {n:'Full Power',fn:(a,p,use)=>{if(!use(.6))return;p.optic=Math.min(90,(p.opticT===ST.frame-1?p.optic||0:0)+1.5);p.opticT=ST.frame;const o=eyes();
   for(let k=0;k<3;k++){const an=R()*6.283,r=14+R()*10;spawn(o.x+Math.cos(an)*r,o.y+Math.sin(an)*r,-Math.cos(an)*1.6,-Math.sin(an)*1.6,rgb(255,70,50),9,0,1,0,1);}
   flash(o.x,o.y,6+p.optic*.15,[255,40,30],2);
   if(p.optic>=90){p.optic=0;ST.cd=60;p.en=Math.max(0,p.en-25);let tf=26;fxWord(o.x,o.y-20,'FULL POWER!',1.4,'#ff6b5c',true);ST.hitstop=Math.max(ST.hitstop,3);fxImpact(o.x,o.y,4);
     ACT.push(()=>{const b=aimFrom(eyes());beamCore(b,{pow:1800,rad:4,len:700,w:6+((ST.frame>>1)&1),c:[255,235,225],g:[255,30,20],spark:()=>rgb(255,60+R()*150,40),dmg:12,noAsh:true});pl_.vx-=b.dx*.25;ST.shake=Math.max(ST.shake,9);return--tf>0;});}}},
 {n:'Optic Sweep',fn:(a,p,use)=>{if(!use(26))return;const o=eyes(),base=Math.atan2(mouse.wy-o.y,mouse.wx-o.x);let k=0;fxWord(o.x,o.y-16,'ZWAAAARM!',1.1,'#ff6b5c',true);ST.cd=40;
   ACT.push(()=>{const an=base-1.1+k/28*2.2,e=eyes();beamCore({h:e,dx:Math.cos(an),dy:Math.sin(an)},{pow:120,rad:1,len:360,w:2,c:[255,210,200],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:6,noAsh:true});return++k<28;});}},
 {n:'Optic Barrage',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;let k=0;fxWord(p.x,p.y-ST.PH-6,'PEW-PEW-PEW!',1,'#ff6b5c',true);
   ACT.push(()=>{if(k%2===0){const o=eyes(),b=aimFrom(o),an=Math.atan2(b.dy,b.dx)+(R()-.5)*.25;shots.push({x:o.x,y:o.y,vx:Math.cos(an)*8,vy:Math.sin(an)*8,type:'optic',life:80,boom:5,col:[255,70,50],ecol:[255,70,50]});flash(o.x,o.y,8,[255,40,30],2);}return++k<16;});}},
 {n:'Leg Sweep',fn:(a,p,use)=>{if(!use(14))return;ST.cd=26;const o={x:p.x+p.face*2,y:p.y-3};beamCore({h:o,dx:p.face,dy:0},{pow:160,rad:1,len:220,w:2,c:[255,215,205],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:14,noAsh:true});
   for(const e of enemies)if((e.x-p.x)*p.face>0&&Math.abs(e.x-p.x)<220&&Math.abs(e.y-p.y)<16){e.vy=-4.5;e.vx+=p.face*2;e.frozen=Math.max(e.frozen||0,30);}fxWord(p.x+p.face*40,p.y-14,'ZWIP!',1,'#ff6b5c',true);}},
 {n:'Optic Lift',fn:(a,p,use)=>{if(!use(14))return;ST.cd=34;p.vy=-8;p.ground=false;p.thrustF=10;const h=hand();beamCore({h:{x:p.x,y:p.y},dx:0,dy:1,d:100},{pow:120,rad:4,len:90,w:5,c:[255,220,210],g:[255,40,40],spark:()=>rgb(255,120,90),dmg:14});explode(p.x|0,surfaceY(p.x|0,p.y|0,90),10,{self:true,col:[255,60,50]});fxWord(p.x,p.y-ST.PH-8,'OPTIC LIFT!',.9,'#ff6b5c',true);}},
 {n:'Optic Cage',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy,r=22;let k=0;fxWord(cx,cy-r-8,'OPTIC CAGE!',1.1,'#ff6b5c',true);
   ACT.push(()=>{const c=[[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r]];for(let q2=0;q2<4;q2++){const [x0,y0]=c[q2],[x1,y1]=c[(q2+1)%4];beams.push({x0,y0,x1,y1,life:1,w:1,c:[255,215,205],g:[255,40,30]});}
     for(const e of enemies)if(Math.abs(e.x-cx)<r+e.def.w/2&&Math.abs(e.y-cy)<r+e.def.h/2){hitEnemy(e,.9,0,0);e.vx*=.4;e.vy*=.4;if(Math.abs(Math.abs(e.x-cx)-r)<e.def.w/2+1||Math.abs(Math.abs(e.y-cy)-r)<e.def.h/2+1)hitEnemy(e,2,(cx-e.x)*.05,(cy-e.y)*.05);}
     return++k<120;});}},
 // bullet time: the whole world runs at half speed for five seconds, Cyclops doesn't
 {n:'Tactical Focus',fn:(a,p,use)=>{if(ST.slowT>0||!use(30))return;ST.cd=40;ST.slowT=300;fxWord(p.x,p.y-ST.PH-10,'TACTICAL FOCUS',1.2,'#bfe3ff',true);snd('charge',p.x,p.y,{pitch:.6});}},
 // call in the X-Jet: a strafing run with cannons and bombs along the cursor
 {n:'Blackbird Strafe',fn:(a,p,use)=>{if(jets.length||!use(40))return;ST.cd=90;const dir=mouse.wx>=p.x?1:-1,y=Math.max(ST.camY+14,Math.min(mouse.wy-70,ST.camY+VH-60));
   jets.push({x:dir>0?ST.camX-70:ST.camX+VW+70,y,dir,tx:mouse.wx,t:0});fxWord(p.x,p.y-ST.PH-8,'BLACKBIRD, ENGAGE!',1,'#ffc93c',true);snd('jet',p.x,p.y-60);}},
 // field leader: he marks the target; everything near it takes half again as much damage
 {n:'X-Formation',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,70,8);if(!list.length)return;if(!use(16))return;ST.cd=40;for(const e of list){applyStatus(e,'mark',480);}fxWord(mouse.wx,mouse.wy-24,'X-MEN, ON MY MARK!',1,'#ffc93c',true);snd('wave',mouse.wx,mouse.wy,{v:.5});}},
 // a ruby-quartz prism at the cursor splits his beam into a star of six
 {n:'Prism Burst',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=mouse.wx,cy=mouse.wy;beams.push({x0:a.h.x,y0:a.h.y,x1:cx,y1:cy,life:6,w:2,c:[255,220,210],g:[255,40,40]});damageLine(a.h.x,a.h.y,cx,cy,4,10);
   for(let k=0;k<6;k++){const an=k/6*6.283+R()*.2;beamCore({h:{x:cx,y:cy},dx:Math.cos(an),dy:Math.sin(an),d:1},{pow:90,rad:1,len:120*ST.aoeC,w:2,c:[255,220,210],g:[255,40,40],spark:()=>rgb(255,120,90),dmg:10});}flash(cx,cy,30,[255,60,60],6);fxWord(cx,cy-20,'PRISM!',.9,'#ff6b5c',true);}},
 {n:'Optic Pinball',fn:(a,p,use)=>{const e0=atCursor(90);if(!e0){noTarget('#ff7a5c');return;}if(!use(18))return;ST.cd=36;let prev={x:a.h.x,y:a.h.y},e=e0,k=0;const hit=new Set();
    ACT.push(()=>{k++;if(k%4!==1)return k<40;if(!e||e.hp<=0)return false;beams.push({x0:prev.x,y0:prev.y,x1:e.x,y1:e.y,life:5,w:2,c:[255,220,200],g:[255,40,40]});hitEnemy(e,20,0,-1);flash(e.x,e.y,10,[255,60,60],3);hit.add(e);prev={x:e.x,y:e.y};
      e=nearestN(e.x,e.y,140,8).find(o=>!hit.has(o));return hit.size<7;});}},
 {n:'Uncontrolled Blast',ult:true,fn:(a,p,use)=>{if(!use(55))return;ST.cd=120;let k=0;fxWord(p.x,p.y-ST.PH-12,'VISOR OFF!',1.6,'#ff6b5c',true);ST.hitstop=Math.max(ST.hitstop,4);fxImpact(p.x,p.y-ST.PH/2,4);
   ACT.push(()=>{const o=eyes(),b=aimFrom(o),base=Math.atan2(b.dy,b.dx);for(let q2=-3;q2<=3;q2++){const an=base+q2*.09+(R()-.5)*.04;beamCore({h:o,dx:Math.cos(an),dy:Math.sin(an)},{pow:300,rad:2,len:520,w:3,c:[255,225,215],g:[255,30,20],spark:()=>rgb(255,60+R()*150,40),dmg:6,noAsh:true});}
     pl_.vx-=b.dx*.35;pl_.vy-=b.dy*.35;ST.shake=Math.max(ST.shake,14);return++k<40;});}}
];
// Cyclops: hold F to aim the optic blast at the ground and ride it up. Barely scorches what it hits.
export function opticThrust(p,on,ax){
  if(!on||p.en<=.8)return;p.en-=.8;p.thrustF=4; // net drain about 0.3/frame against regen: roughly 5 s of lift
  let dx=-ax*.35,dy=1;const d=Math.hypot(dx,dy);dx/=d;dy/=d;
  p.vy=Math.max(-3.2,p.vy-.78);p.vx-=dx*.18;p.ground=false;
  const o=eyes();let x=o.x,y=o.y,hit=false;
  for(let k=0;k<140;k++){x+=dx;y+=dy;const X=x|0,Y=y|0;if(X<0||X>=W||Y>=H||Y<-SKY)break;const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){hit=true;
    if(R()<.08&&KIND[m]!==L&&m!==STEEL&&m!==OBSID){spawn(X,Y,(R()-.5)*2,-R()*2,col[Y*W+X],50,KIND[m]===S?RUBBLE:m,0);setc(Y*W+X,EMPTY);} break;}}
  beams.push({x0:o.x,y0:o.y,x1:x,y1:y,life:1,w:1+((ST.frame>>1)&1),c:[255,215,205],g:[255,40,30]});
  if(hit){for(let k=0;k<4;k++)spawn(x,y-1,(R()-.5)*3,-R()*2.5,R()<.5?rgb(255,120,80):rgb(255,220,160),10+R()*8,0,1,1);flash(x,y,16,[255,60,40],2);if(ST.frame%5===0)for(let k=0;k<3;k++)dust(x+(R()-.5)*8|0,y-2);}
  damageLine(o.x,o.y,x,y,3,1.5);ST.shake=Math.max(ST.shake,1.2);if(ST.frame%30===0)fxWord(x,y-6,'FWOOM',.7,'#ff6b5c',true);
}




// roster entry (CHARS in heroes/index.js)
export const CHAR_CYCLOPS={id:'cyclops',name:'Cyclops',spr:SPR_CYC,pal:PAL_CYC,pw:7,ph:19,fly:false,fs:2.6,boost:1,run:1.9,jump:4.7,hp:320,armor:.8,glow:[255,60,50],cape:null,thrust:()=>pickC([255,80,60]),powers:CYC_POWERS};
