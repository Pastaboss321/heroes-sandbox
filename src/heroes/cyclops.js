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
import { beamCore, jets, pickC, shots } from './powers.js';
import { ACT, aimFrom, eyes } from './xmen.js';
import { SKY, mouse, pl_ } from '../player.js';
import { damageCone, damageLine, enemies, enemyAt, hitEnemy } from '../enemies/core.js';

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
const CYC_POWERS=[
 {n:'Optic Blast',fn:(a,p,use)=>{if(!use(.9))return;const b=aimFrom(eyes());beamCore(b,{pow:90,rad:1,len:480,w:2+((ST.frame>>1)&1),c:[255,210,200],g:[255,40,30],spark:()=>rgb(255,60+R()*120,40),dmg:4,noAsh:true});damageCone(b.h.x,b.h.y,b.dx,b.dy,200,0,.6);}},
 {n:'Concussive Burst',fn:(a,p,use)=>{if(!use(18))return;const b=aimFrom(eyes());beamCore(b,{pow:420,rad:4,len:100,w:5,c:[255,220,210],g:[255,50,40],spark:()=>rgb(255,90,60),dmg:30,noAsh:true});
   damageCone(b.h.x,b.h.y,b.dx,b.dy,110,10,9);for(const bd of bodies){const dx=bd.x-b.h.x,dy=bd.y-b.h.y,d=Math.hypot(dx,dy)||1;if(d<110+bd.rmax&&(dx*b.dx+dy*b.dy)/d>.6){bd.vx+=b.dx*7;bd.vy+=b.dy*7-1.5;bd.thrown=true;}}
   p.vx-=b.dx*2;fxWord(b.h.x+b.dx*40,b.h.y+b.dy*40-8,'BRAKOOM!',1.3,'#ff6b5c',true);fxBurst(b.h.x+b.dx*20,b.h.y+b.dy*20,30,'#ff6b5c');ST.shake+=8;ST.cd=26;}},
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
CYC_POWERS.push(
 {n:'Optic Barrage',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;let k=0;fxWord(p.x,p.y-ST.PH-6,'PEW-PEW-PEW!',1,'#ff6b5c',true);
   ACT.push(()=>{if(k%2===0){const o=eyes(),b=aimFrom(o),an=Math.atan2(b.dy,b.dx)+(R()-.5)*.25;shots.push({x:o.x,y:o.y,vx:Math.cos(an)*8,vy:Math.sin(an)*8,type:'optic',life:80,boom:5,col:[255,70,50],ecol:[255,70,50]});flash(o.x,o.y,8,[255,40,30],2);}return++k<16;});}},
 {n:'Leg Sweep',fn:(a,p,use)=>{if(!use(14))return;ST.cd=26;const o={x:p.x+p.face*2,y:p.y-3};beamCore({h:o,dx:p.face,dy:0},{pow:160,rad:1,len:220,w:2,c:[255,215,205],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:14,noAsh:true});
   for(const e of enemies)if((e.x-p.x)*p.face>0&&Math.abs(e.x-p.x)<220&&Math.abs(e.y-p.y)<16){e.vy=-4.5;e.vx+=p.face*2;e.frozen=Math.max(e.frozen||0,30);}fxWord(p.x+p.face*40,p.y-14,'ZWIP!',1,'#ff6b5c',true);}},
 {n:'Visor Overload',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;const o=eyes();fxWord(o.x,o.y-20,'OVERLOAD!',1.4,'#ff6b5c',true);ST.hitstop=Math.max(ST.hitstop,3);fxImpact(o.x,o.y,3);
   for(let k=0;k<16;k++){const an=k/16*6.283;beamCore({h:o,dx:Math.cos(an),dy:Math.sin(an)},{pow:70,rad:1,len:90,w:1,c:[255,215,205],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:18,noAsh:true});}flash(o.x,o.y,80,[255,40,30],10);ST.shake=18;}},
);
CYC_POWERS.push(
 {n:'Optic Cage',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy,r=22;let k=0;fxWord(cx,cy-r-8,'OPTIC CAGE!',1.1,'#ff6b5c',true);
   ACT.push(()=>{const c=[[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r]];for(let q2=0;q2<4;q2++){const [x0,y0]=c[q2],[x1,y1]=c[(q2+1)%4];beams.push({x0,y0,x1,y1,life:1,w:1,c:[255,215,205],g:[255,40,30]});}
     for(const e of enemies)if(Math.abs(e.x-cx)<r+e.def.w/2&&Math.abs(e.y-cy)<r+e.def.h/2){hitEnemy(e,.9,0,0);e.vx*=.4;e.vy*=.4;if(Math.abs(Math.abs(e.x-cx)-r)<e.def.w/2+1||Math.abs(Math.abs(e.y-cy)-r)<e.def.h/2+1)hitEnemy(e,2,(cx-e.x)*.05,(cy-e.y)*.05);}
     return++k<120;});}},
 {n:'Uncontrolled Blast',fn:(a,p,use)=>{if(!use(55))return;ST.cd=120;let k=0;fxWord(p.x,p.y-ST.PH-12,'VISOR OFF!',1.6,'#ff6b5c',true);ST.hitstop=Math.max(ST.hitstop,4);fxImpact(p.x,p.y-ST.PH/2,4);
   ACT.push(()=>{const o=eyes(),b=aimFrom(o),base=Math.atan2(b.dy,b.dx);for(let q2=-3;q2<=3;q2++){const an=base+q2*.09+(R()-.5)*.04;beamCore({h:o,dx:Math.cos(an),dy:Math.sin(an)},{pow:300,rad:2,len:520,w:3,c:[255,225,215],g:[255,30,20],spark:()=>rgb(255,60+R()*150,40),dmg:6,noAsh:true});}
     pl_.vx-=b.dx*.35;pl_.vy-=b.dy*.35;ST.shake=Math.max(ST.shake,14);return++k<40;});}},
);
CYC_POWERS.push(
 // bullet time: the whole world runs at half speed for five seconds, Cyclops doesn't
 {n:'Tactical Focus',fn:(a,p,use)=>{if(ST.slowT>0||!use(30))return;ST.cd=40;ST.slowT=300;fxWord(p.x,p.y-ST.PH-10,'TACTICAL FOCUS',1.2,'#bfe3ff',true);snd('charge',p.x,p.y,{pitch:.6});}},
 // call in the X-Jet: a strafing run with cannons and bombs along the cursor
 {n:'Blackbird Strafe',fn:(a,p,use)=>{if(jets.length||!use(40))return;ST.cd=90;const dir=mouse.wx>=p.x?1:-1,y=Math.max(ST.camY+14,Math.min(mouse.wy-70,ST.camY+VH-60));
   jets.push({x:dir>0?ST.camX-70:ST.camX+VW+70,y,dir,tx:mouse.wx,t:0});fxWord(p.x,p.y-ST.PH-8,'BLACKBIRD, ENGAGE!',1,'#ffc93c',true);snd('jet',p.x,p.y-60);}},
);

// roster entry (CHARS in heroes/index.js)
export const CHAR_CYCLOPS={id:'cyclops',name:'Cyclops',spr:SPR_CYC,pal:PAL_CYC,pw:7,ph:19,fly:false,fs:2.6,boost:1,run:1.9,jump:4.7,hp:320,armor:.8,glow:[255,60,50],cape:null,thrust:()=>pickC([255,80,60]),powers:CYC_POWERS};
