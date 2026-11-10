// Wave 4 newcomers built around cutting: Ghost Rider (a hellfire chain that slices and burns, the Hell
// Cycle, the Penance Stare) and Deadpool (two katanas, two pistols, a teleport belt, and no shame).
import { ST } from '../state.js';
import { FIRE, FLAM, KIND, R, S, rgb } from '../world/materials.js';
import { H, W, setc, t } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import '../render/rig.js'; // kept for evaluation order
import { snd } from '../sfx.js';
import { scriptMove, shockFx, shots, surfaceY } from './powers.js';
import { ACT } from './xmen.js';
import { boxHit, carve, mouse, pl_ } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { drawPix, nearestN, tagged } from './kitlib.js';
import { applyStatus, summons } from './abilities.js';
import { TK } from '../render/titan.js';

const HF=[255,130,30],HFE=[255,170,60];
const burnAt=(x,y)=>{const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H-6)return;const i=Y*W+X;if(t[i]===0){if(R()<.4)setc(i,FIRE);}else if(FLAM[t[i]]>0)ignite(i);};
// ================= GHOST RIDER =================
// the chain: a whip of segments from the hand that bends toward the cursor; every segment is a cut
function chainLash(a,p,len,o={}){const segs=12,ang0=Math.atan2(a.dy,a.dx),sw=(o.swing??.6)*(p.face||1);let x=a.h.x,y=a.h.y;const pts=[[x,y]];
  for(let k=1;k<=segs;k++){const u=k/segs,an=ang0+sw*(1-u)*Math.sin(ST.frame*.3)+(o.curl||0)*u,L=len/segs;const nx=x+Math.cos(an)*L,ny=y+Math.sin(an)*L;
    sliceLine(x,y,nx,ny,{edge:HFE,quiet:k!==segs,push:1.1});damageLine(x,y,nx,ny,4,o.dmg??3);if(R()<.5)burnAt(nx,ny);x=nx;y=ny;pts.push([x,y]);}
  for(let k=0;k<pts.length;k+=2)spawn(pts[k][0],pts[k][1],(R()-.5)*.6,-.6-R(),R()<.5?rgb(255,200,80):rgb(255,110,20),12,0,1,0,1);
  return pts;}
const RIDER_POWERS=[
 {n:'Hellfire Chain',fn:(a,p,use)=>{if(!use(5))return;ST.cd=12;p.punchF=8;const pts=chainLash(a,p,80,{dmg:6});ST.chain={pts,life:6};snd('slash',a.h.x,a.h.y,{pitch:.7});if(R()<.3)fxWord(pts[6][0],pts[6][1]-10,'KSSHHH!',.8,'#ff9a3c',true);}},
 // Penance Stare: the target burns with the pain it caused; held, it burns more
 {n:'Penance Stare',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,70);if(!e){if(ST.frame%30===0)fxWord(mouse.wx,mouse.wy,'NO SOUL HERE',.6,'#ff9a3c',true);return;}if(!use(.9))return;
   if(!e.def.titan)e.frozen=Math.max(e.frozen||0,4);hitEnemy(e,e.def.titan?2.2:3,0,0);const h=a.h;
   ST.beamsStare=1;for(let k=0;k<2;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5),-1-R(),rgb(255,150+R()*80|0,40),14,0,1,0,1);
   if(ST.frame%40===0)fxWord(e.x,e.y-e.def.h/2-10,'LOOK INTO MY EYES',.8,'#ff9a3c',true);
   for(let k=0;k<8;k++){const u=k/8;spawn(h.x+(e.x-h.x)*u,h.y+(e.y-h.y)*u,0,0,rgb(255,120,30),3,0,1,0,0);}}},
 {n:'Hellfire Blast',fn:(a,p,use)=>{if(!use(5))return;ST.cd=8;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6.5,vy:a.dy*6.5,type:'fire',life:100,boom:8,fire:.6,col:HF,ecol:HF});}},
 // the Hell Cycle: he rides through the block, leaving a road of fire
 {n:'Hell Cycle',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;const dir=a.dx<0?-1:1;let k=0;p.face=dir;fxWord(p.x,p.y-ST.PH-8,'VRRRROOOM!',1.2,'#ff9a3c',true);snd('jet',p.x,p.y);
   ACT.push(()=>{k++;p.script=2;p.vx=dir*7.5;carve(p.x+dir*8,p.y-ST.PH*.45,ST.PH*.55,dir*6,-1,Math.floor(p.y));scriptMove(p,p.vx,0);
     const gy=surfaceY(p.x|0,Math.max(0,p.y-4|0),20);for(let j=0;j<3;j++)burnAt(p.x-dir*(6+R()*10),gy-1-R()*2);damageEnemies(p.x+dir*8,p.y-ST.PH/2,14,9,dir*6,-3);
     for(let j=0;j<4;j++)spawn(p.x-dir*10,p.y-2-R()*6,-dir*(2+R()*2),-R(),R()<.5?rgb(255,200,80):rgb(255,90,20),14,0,1,0,1);ST.shake=Math.max(ST.shake,3);return k<40;});}},
 // the chain whirls round him: a ring of cuts
 {n:'Chain Storm',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;let k=0;fxWord(p.x,p.y-ST.PH-8,'WHIRRR!',1,'#ff9a3c',true);
   ACT.push(()=>{k++;const an=k*.55,r=36*ST.aoeC,cx=p.x,cy=p.y-ST.PH/2;const x1=cx+Math.cos(an)*r,y1=cy+Math.sin(an)*r;sliceLine(cx+Math.cos(an)*6,cy+Math.sin(an)*6,x1,y1,{edge:HFE,quiet:k%4!==0,push:1.2});damageLine(cx,cy,x1,y1,5,5);burnAt(x1,y1);ST.chain={pts:[[cx,cy],[x1,y1]],life:2};return k<36;});}},
 {n:'Hellfire Wave',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const dir=a.dx<0?-1:1;let x=p.x,k=0;
   ACT.push(()=>{k++;x+=dir*6;const gy=groundBelow(x|0,p.y-30);for(let j=0;j<8;j++)spawn(x+(R()-.5)*8,gy,(R()-.5)*1.2,-2-R()*4,R()<.5?rgb(255,220,90):rgb(255,100,20),26,R()<.08?FIRE:0,1,1);explode(x|0,gy,5,{self:true,quiet:true,fire:.8});damageEnemies(x,gy-12,16,7,dir*2,-4);return k<36;});}},
 // Spirit of Vengeance: hellfire everywhere he goes, fire can't touch him
 {n:'Spirit of Vengeance',fn:(a,p,use)=>{if(!use(35))return;ST.cd=100;p.vengeance=480;fxWord(p.x,p.y-ST.PH-10,'VENGEANCE!',1.5,'#ff9a3c',true);snd('roar',p.x,p.y,{pitch:.6});flash(p.x,p.y,60,HF,10);
   ACT.push(()=>{p.vengeance--;for(let j=0;j<3;j++)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,(R()-.5)*.6,-1-R(),R()<.5?rgb(255,200,80):rgb(255,90,20),16,0,1,0,1);burnAt(p.x+(R()-.5)*6,p.y);damageEnemies(p.x,p.y-ST.PH/2,12,1.5,0,0);return p.vengeance>0;});}},
 // the chain hooks the nearest thing (enemy or chunk) and yanks it in
 {n:'Chain Grab',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,60);let b=null;if(!e){let bd=60;for(const c of bodies){const d=Math.hypot(c.x-mouse.wx,c.y-mouse.wy);if(d<bd){bd=d;b=c;}}}if(!e&&!b)return;if(!use(12))return;ST.cd=24;
   const tx=e?e.x:b.x,ty=e?e.y:b.y,dx=p.x-tx,dy=p.y-8-ty,d=Math.hypot(dx,dy)||1;if(e&&!e.def.titan){e.vx=dx/d*9;e.vy=dy/d*9-2;e.thrownT=30;hitEnemy(e,12,0,0);}else if(e)hitEnemy(e,30,0,0);else{b.vx=dx/d*8;b.vy=dy/d*8-2;b.thrown=true;b.rest=0;}
   ST.chain={pts:[[a.h.x,a.h.y],[tx,ty]],life:10};fxWord(tx,ty-12,'GET OVER HERE',.9,'#ff9a3c',true);snd('whoosh',tx,ty,{pitch:.7});}},
 // chains burst out of the ground under every enemy near the cursor and drag them down, burning
 {n:'Chains of Hell',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,120*ST.aoeC,8);if(!list.length)return;if(!use(26))return;ST.cd=55;let k=0;fxWord(mouse.wx,mouse.wy-30,'CHAINS OF HELL!',1.1,'#ff9a3c',true);snd('rip',mouse.wx,mouse.wy);
   const roots=list.map(e=>[e,e.x+(R()-.5)*10,groundBelow(e.x|0,e.y)]);
   ACT.push(()=>{k++;for(const [e,x,g] of roots){if(e.hp<=0)continue;if(!e.def.titan){e.frozen=Math.max(e.frozen||0,2);e.vy+=.8;}beams.push({pts:[[x,g],[(x+e.x)/2+Math.sin(k*.3)*4,(g+e.y)/2],[e.x,e.y]],life:2,c:[200,200,210],g:[255,120,30]});if(k%20===0)tagged('fire',()=>hitEnemy(e,10,0,1));}return k<140;});}},
 // the gate of Hell opens under the cursor: pillars of hellfire burst up around it
 {n:'Hell Gate',fn:(a,p,use)=>{if(!use(34))return;ST.cd=70;const cx=mouse.wx,gy=groundBelow(cx|0,mouse.wy);let k=0;fxWord(cx,gy-40,'THE GATES OPEN',1.2,'#ff9a3c',true);
   ACT.push(()=>{k++;if(k<25){if(k%5===0)rings.push({x:cx,y:gy,r:40*ST.aoeC,vr:-1,life:8,c:HF});return true;}
     for(let j=-3;j<=3;j++){const x=cx+j*16*ST.aoeC;for(let q=0;q<3;q++)spawn(x+(R()-.5)*6,gy,(R()-.5),-5-R()*5,R()<.5?rgb(255,230,120):rgb(255,90,20),40,R()<.1?FIRE:0,1,1);damageEnemies(x,gy-40,10,2.2,0,-3);}
     if(k===25){explode(cx|0,gy|0,16,{self:true,fire:.7});shockFx(cx,gy,1);}return k<80;});}},
 {n:'Hellfire Breath',fn:(a,p,use)=>{if(!use(1.2))return;const h=a.h;for(let j=0;j<6;j++){const an=Math.atan2(a.dy,a.dx)+(R()-.5)*.5,sp=3+R()*3;spawn(h.x,h.y-4,Math.cos(an)*sp,Math.sin(an)*sp,R()<.5?rgb(255,220,90):rgb(255,90,20),30,R()<.08?FIRE:0,1,1);}
   damageCone(h.x,h.y,a.dx,a.dy,60,1.8,1);for(let j=0;j<2;j++){const d=R()*60;burnAt(h.x+a.dx*d+(R()-.5)*8,h.y+a.dy*d+(R()-.5)*8);}}},
 // the chain hooks the nearest overhang and he swings on it
 {n:'Chain Swing',fn:(a,p,use)=>{let ax=-1,ay=-1;for(let s=0;s<200;s++){const x=a.h.x+a.dx*s|0,y=a.h.y+a.dy*s|0;if(x<0||x>=W||y<0||y>=H)break;if(KIND[t[y*W+x]]===S){ax=x;ay=y;break;}}if(ax<0){fxWord(mouse.wx,mouse.wy,'NOTHING TO HOOK',.7,'#ff9a3c',true);return;}if(!use(8))return;ST.cd=20;
   const L=Math.max(20,Math.hypot(ax-p.x,ay-p.y+8));let k=0;ACT.push(()=>{k++;const dx=p.x-ax,dy=p.y-8-ay,d=Math.hypot(dx,dy)||1;if(d>L){const ux=dx/d,uy=dy/d,vr=p.vx*ux+p.vy*uy;p.x=ax+ux*L;p.y=ay+uy*L+8;if(vr>0){p.vx-=vr*ux;p.vy-=vr*uy;}}p.vx+=p.face*.12;
     ST.chain={pts:[[ax,ay],[p.x,p.y-8]],life:2};damageEnemies(p.x,p.y-8,10,2,p.vx,p.vy);if(R()<.4)spawn(p.x,p.y-4,(R()-.5),-.5,rgb(255,140,40),10,0,1,0,1);return k<110&&!p.ground;});}},
 // for eight seconds the souls of what he kills feed him
 {n:'Soul Harvest',fn:(a,p,use)=>{if(p.harvest>0||!use(28))return;ST.cd=70;p.harvest=480;fxWord(p.x,p.y-ST.PH-10,'YOUR SOUL IS MINE',1,'#ff9a3c',true);
   ACT.push(()=>{if(--p.harvest<=0)return false;if(ST.frame%8===0){for(const e of enemies){if(Math.hypot(e.x-p.x,e.y-p.y+8)>70)continue;tagged('fire',()=>hitEnemy(e,3,0,0));p.hp=Math.min(ST.CH.hp,p.hp+1.2);for(let k=0;k<3;k++)spawn(e.x,e.y,(p.x-e.x)*.04,(p.y-8-e.y)*.04,rgb(160,255,220),24,0,1,0,0);}}return true;});}},
 {n:'Flaming Skull',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;let x=a.h.x,y=a.h.y,vx=a.dx*5,vy=a.dy*5,k=0,n=0,cd=0;fxWord(p.x,p.y-ST.PH-8,'LOOK INTO MY EYES',.8,'#ff9a3c',true);
    ACT.push(()=>{k++;const e=nearestEnemy(x,y,240);if(e){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;vx+=(dx/d*6-vx)*.12;vy+=(dy/d*6-vy)*.12;if(d<8&&cd<=0){tagged('fire',()=>hitEnemy(e,18,vx*.5,vy*.5));applyStatus(e,'burn',200);n++;cd=14;vx=-vx;vy=-vy-2;fxWord(e.x,e.y-12,'CHOMP',.8,'#ff9a3c',true);}}
      if(cd>0)cd--;x+=vx;y+=vy;for(let j=0;j<3;j++)spawn(x+(R()-.5)*4,y-2,(R()-.5)*.5,-1,R()<.5?rgb(255,200,60):rgb(255,90,20),10,0,1,0,1);for(const [ox,oy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[0,1]])spawn(x+ox,y+oy,0,0,rgb(240,236,220),2,0,0,0,0);
      return n<4&&k<220;});}},
 // Judgement: every enemy in sight is made to feel its sins
 {n:'Judgement',ult:true,fn:(a,p,use)=>{if(!use(65))return;ST.cd=200;fxWord(p.x,p.y-50,'YOUR SOUL IS STAINED WITH INNOCENT BLOOD',1.1,'#ff9a3c',true);ST.hitstop=Math.max(ST.hitstop,8);flash(p.x,p.y,240,HF,16);
   for(const e of enemies){if(Math.abs(e.x-p.x)>260||Math.abs(e.y-p.y)>170)continue;hitEnemy(e,e.def.titan?140:120,0,-2);if(!e.def.titan)e.frozen=Math.max(e.frozen||0,90);for(let k=0;k<20;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*2,-1-R()*2,rgb(255,140+R()*100|0,40),30,0,1,0,1);}}}
];
export const CHAR_RIDER={id:'rider',name:'Ghost Rider',pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.3,jump:5,hp:420,armor:.6,glow:HF,cape:null,thrust:()=>rgb(255,140,40),powers:RIDER_POWERS};

// ================= DEADPOOL =================
const STEELC=[230,232,240];
const QUIPS=['MAXIMUM EFFORT!','CHIMICHANGAS!','HI, MOM!','THAT WAS AWESOME','*FOURTH WALL*','SAY MY NAME!','PEW PEW!','I FEEL A CRITICAL HIT COMING'];
const quip=(p,s)=>fxWord(p.x,p.y-ST.PH-10,s||QUIPS[R()*QUIPS.length|0],.85,'#ff6b5c',true);
const POUCH=[
 ['ROCKET LAUNCHER!',(a,p)=>shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'missile',life:120,tx:mouse.wx,ty:mouse.wy,wob:0,boom:14,fire:.4})],
 ['BEAR TRAP!',(a,p)=>{const x=mouse.wx,y=groundBelow(mouse.wx|0,mouse.wy);summons.push({x,y,life:600,upd(s){for(const e of enemies)if(Math.abs(e.x-s.x)<8&&Math.abs(e.y+e.def.h/2-s.y)<8&&!e.def.titan){e.frozen=Math.max(e.frozen||0,120);hitEnemy(e,30,0,0);fxWord(s.x,s.y-10,'SNAP!',.9,'#ff6b5c',true);return false;}},draw(s){for(let k=-4;k<=4;k++)drawPix(s.x+k,s.y-1-(Math.abs(k)%2),rgb(150,150,160));}});}],
 ['BOOMERANG KATANA!',(a,p)=>{let x=a.h.x,y=a.h.y,vx=a.dx*8,vy=a.dy*8,k=0;ACT.push(()=>{k++;const lx=x,ly=y;if(k>18){vx+=(pl_.x-x)*.03;vy+=(pl_.y-8-y)*.03;}x+=vx;y+=vy;sliceLine(lx,ly,x,y,{edge:[230,232,240],quiet:true,push:1});damageLine(lx,ly,x,y,5,8);return k<50&&Math.hypot(pl_.x-x,pl_.y-8-y)>8;});}],
 ['TACO! (HEALS)',(a,p)=>{p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.2);}],
 ['RUBBER CHICKEN?!',(a,p)=>{explode(mouse.wx|0,mouse.wy|0,18,{fire:.3,word:'BAWK!'});}],
];
function drawUni(s){const x=s.x,y=s.y,f=s.face,o={},Wc=rgb(250,250,255),st=Math.sin(s.t*.6)*4;TK.begin();TK.ell(x,y-14,12,6,Wc,o);TK.cap(x+f*8,y-16,x+f*14,y-26,3,2.5,Wc,o);TK.ell(x+f*17,y-26,5,3,Wc,o);TK.cap(x+f*18,y-29,x+f*22,y-38,1,.3,rgb(255,215,90),o);
  for(const [lx,ph] of [[-8,0],[-4,1],[5,0],[9,1]])TK.cap(x+lx,y-10,x+lx+(ph?st:-st),y,1.8,1.4,Wc,o);TK.cap(x-f*12,y-16,x-f*18,y-10,2,1,rgb(255,120,200),o);TK.end();}
const POOL_POWERS=[
 {n:'Katana Slash',fn:(a,p,use)=>{if(!use(3))return;ST.cd=8;p.punchF=8;const sw=(p.slashN=(p.slashN||0)+1)&1?.5:-.5,an=Math.atan2(a.dy,a.dx)+sw;
   clawSlice(a.h.x,a.h.y,Math.cos(an),Math.sin(an),30,2,4,{edge:STEELC,vx:a.dx*3,vy:a.dy*3,push:.9});damageCone(a.h.x,a.h.y,a.dx,a.dy,34,15,2.5);snd('slash',a.h.x,a.h.y,{pitch:1.1});}},
 {n:'Dual Pistols',fn:(a,p,use)=>{if(!use(.7)||ST.frame%3)return;for(const o of [-2,2])shots.push({x:a.h.x,y:a.h.y+o,vx:a.dx*9+(R()-.5)*.5,vy:a.dy*9+(R()-.5)*.5,type:'bullet',life:60,boom:2,col:[255,230,150],ecol:[255,200,120]});snd('eshot',a.h.x,a.h.y,{v:.4,pitch:1.4});if(R()<.02)quip(p,'PEW PEW!');}},
 {n:'Katana Whirlwind',fn:(a,p,use)=>{if(!use(16))return;ST.cd=34;let k=0;quip(p,'WHEEE!');
   ACT.push(()=>{k++;const an=k*.8,r=26*ST.aoeC,cx=p.x,cy=p.y-ST.PH/2;for(const s of [0,Math.PI]){const x1=cx+Math.cos(an+s)*r,y1=cy+Math.sin(an+s)*r;sliceLine(cx,cy,x1,y1,{edge:STEELC,quiet:k%4!==0,push:1});damageLine(cx,cy,x1,y1,4,5);}p.face=Math.cos(an)<0?-1:1;return k<20;});}},
 // teleport belt: blinks to the cursor and cuts whatever is there
 {n:'Teleport Belt',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;const tx=Math.max(8,Math.min(W-8,mouse.wx)),ty=mouse.wy+ST.PH/2;flash(p.x,p.y-8,30,[120,200,255],6);
   for(let k=0;k<20;k++)spawn(p.x,p.y-8,(R()-.5)*3,(R()-.5)*3,rgb(140,210,255),14,0,1,0,1);
   if(!boxHit(tx,ty)){p.x=tx;p.y=ty;}else{carve(tx,ty-ST.PH/2,ST.PH*.7,0,0);p.x=tx;p.y=ty;}p.vx=p.vy=0;
   fxWord(p.x,p.y-ST.PH-6,'*BAMF*... WAIT, WRONG GUY',.8,'#ff6b5c',true);clawSlice(p.x-14,p.y-ST.PH/2,1,0,28,3,6,{edge:STEELC});damageEnemies(p.x,p.y-ST.PH/2,20,20,0,-2);snd('psi',p.x,p.y,{pitch:1.5});}},
 {n:'Grenade Belt',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;for(let k=0;k<6;k++)shots.push({x:a.h.x,y:a.h.y,vx:a.dx*(3+R()*3)+(R()-.5)*2,vy:a.dy*(3+R()*3)-1.5-R()*2,type:'bomb',life:80+R()*20|0,boom:9,fire:.3,grav:.18});quip(p,'OOPS, ALL GRENADES');}},
 // Maximum Effort: a slicing sprint through everything ahead
 {n:'Maximum Effort',fn:(a,p,use)=>{if(!use(16))return;ST.cd=34;const dx=a.dx,dy=a.dy;let k=0,lx=p.x,ly=p.y-ST.PH/2;quip(p,'MAXIMUM EFFORT!');
   ACT.push(()=>{k++;p.script=2;p.vx=dx*9;p.vy=dy*9;carve(p.x+dx*8,p.y-ST.PH/2+dy*8,7,dx*5,dy*5);scriptMove(p,p.vx,p.vy);const cx=p.x,cy=p.y-ST.PH/2;
     for(const o of [-5,5])sliceLine(lx-dy*o,ly+dx*o,cx-dy*o,cy+dx*o,{edge:STEELC,quiet:true,push:1.2});lx=cx;ly=cy;damageEnemies(cx,cy,10,12,dx*5,dy*5);if(k%2===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:10,col:[255,60,70]});return k<16;});}},
 {n:'Chimichanga',fn:(a,p,use)=>{if(p.hp>=ST.CH.hp||!use(20))return;ST.cd=60;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.35);quip(p,'CHIMICHANGAS!');for(let k=0;k<20;k++)spawn(p.x,p.y-8,(R()-.5)*3,-R()*3,rgb(255,200+R()*55|0,120),30,0,1,0,1);snd('pop',p.x,p.y,{pitch:.8});}},
 // he talks to the player: every enemy on screen is hit by a comic panel border
 {n:'Fourth Wall Break',fn:(a,p,use)=>{if(!use(45))return;ST.cd=120;quip(p,'HEY, YOU. YES, YOU. WATCH THIS.');ST.hitstop=Math.max(ST.hitstop,10);
   for(const e of enemies){if(Math.abs(e.x-p.x)>250||Math.abs(e.y-p.y)>150)continue;hitEnemy(e,60,0,-3);fxWord(e.x,e.y-e.def.h/2-6,['WHAM!','BLAM!','KRAK!','THWIP?'][R()*4|0],1,'#ffc93c',true);}
   for(const [x0,y0,x1,y1] of [[ST.camX+6,ST.camY+6,ST.camX+474,ST.camY+6],[ST.camX+6,ST.camY+264,ST.camX+474,ST.camY+264],[ST.camX+6,ST.camY+6,ST.camX+6,ST.camY+264],[ST.camX+474,ST.camY+6,ST.camX+474,ST.camY+264]])sliceLine(x0,y0,x1,y1,{edge:[255,201,60],quiet:true});
   flash(p.x,p.y,240,[255,230,150],10);}},
 {n:'Katana Throw',fn:(a,p,use)=>{if(!use(9))return;ST.cd=18;let lx=a.h.x,ly=a.h.y;const s={x:a.h.x,y:a.h.y,vx:a.dx*10,vy:a.dy*10,type:'katana',life:50,col:STEELC,boom:4,ecol:STEELC};shots.push(s);
   ACT.push(()=>{if(!shots.includes(s))return false;sliceLine(lx,ly,s.x,s.y,{edge:STEELC,quiet:true,push:1.3});lx=s.x;ly=s.y;return true;});}},
 {n:'Pouch Roulette',fn:(a,p,use)=>{if(!use(14))return;ST.cd=28;const it=POUCH[R()*POUCH.length|0];it[1](a,p);fxWord(p.x,p.y-ST.PH-10,it[0],.9,'#ff6b5c',true);snd('pop',p.x,p.y,{pitch:1.3});}},
 // C4: plants a charge on the cursor that blows after a beat, with a countdown
 {n:'C4',fn:(a,p,use)=>{if(!use(24))return;ST.cd=50;const cx=mouse.wx,cy=mouse.wy;let k=0;
   ACT.push(()=>{k++;if(k%20===0){fxWord(cx,cy-12,String(3-k/20|0),1,'#ff6b5c',true);snd('deny',cx,cy,{v:.4,pitch:2});}if(ST.frame%6<3)spawn(cx,cy,0,0,rgb(255,40,40),4,0,1,0,0);
     if(k>=60){explode(cx|0,cy|0,20,{fire:.4,word:'KA-BLOOEY!'});shockFx(cx,cy,1.2);return false;}return true;});}},
 // a katana pogo: straight down, cutting, and back up off whatever it hits
 {n:'Katana Pogo',fn:(a,p,use)=>{if(!use(12))return;ST.cd=26;let k=0;fxWord(p.x,p.y-ST.PH-8,'BOING!',.9,'#ff6b5c',true);
   ACT.push(()=>{k++;p.script=2;const ox=p.x,oy=p.y;const moved=scriptMove(p,0,9);sliceLine(ox,oy,p.x,p.y+12,{edge:[230,232,240],quiet:true,push:1.2});damageEnemies(p.x,p.y,10,14,0,4);
     if(!moved||k>40){clawSlice(p.x,p.y+4,1,0,20,2,6,{edge:[230,232,240]});explode(p.x|0,p.y+4|0,8,{self:true});p.vy=-8;p.ground=false;return false;}return true;});}},
 // a taunt: everything comes for him, and he barely feels it for six seconds
 {n:'Taunt',fn:(a,p,use)=>{if(!use(18))return;ST.cd=80;p.shell=360;fxWord(p.x,p.y-ST.PH-12,'HEY! UGLIES! OVER HERE!',1,'#ff6b5c',true);
   for(const e of enemies)if(!e.def.titan&&Math.hypot(e.x-p.x,e.y-p.y)<220){e.vx+=(p.x-e.x)*.03;e.vy+=(p.y-e.y)*.02;e.cd=Math.min(e.cd,10);}}},
 {n:'Unicorn Charge',fn:(a,p,use)=>{if(summons.some(s=>s.uni)||!use(24))return;ST.cd=70;const dir=a.dx<0?-1:1;fxWord(p.x,p.y-ST.PH-10,'MAGICAL!',1.1,'#ff9ad8',true);const RB=[[255,60,60],[255,160,40],[255,240,60],[60,220,90],[60,140,255],[170,80,255]];
    summons.push({uni:true,x:Math.max(10,Math.min(W-10,p.x-dir*60)),y:p.y,face:dir,life:140,upd(s){s.x+=s.face*5.5;s.y=groundBelow(s.x|0,s.y-24);carve(s.x+s.face*14,s.y-12,9,s.face*4,-1,s.y);damageEnemies(s.x+s.face*12,s.y-14,16,14,s.face*7,-6);
      for(let j=0;j<6;j++)spawn(s.x-s.face*10,s.y-14+j*1.5,-s.face*.5,0,rgb(...RB[j]),30,0,1,0,0);if(s.x<4||s.x>W-4)return false;},draw:drawUni});}},
 // the Deadpool Corps: a line of Deadpools from across the multiverse dashes across the screen, katanas out
 {n:'Deadpool Corps',ult:true,fn:(a,p,use)=>{if(!use(60))return;ST.cd=200;quip(p,'THE CORPS! (LADYPOOL, DOGPOOL, HEADPOOL...)');snd('wave',p.x,p.y);
   const dir=p.face;let k=0;ACT.push(()=>{k++;if(k%6===0&&k<60){const y=ST.camY+40+R()*180,x0=dir>0?ST.camX-10:ST.camX+VW0+10;let x=x0,j=0;
       ACT.push(()=>{j++;const nx=x+dir*14;sliceLine(x,y,nx,y+(R()-.5)*4,{edge:STEELC,quiet:j%5!==0,push:1.2});damageLine(x,y,nx,y,8,10);afters.push({x:nx,y:y+ST.PH/2,ang:0,face:dir,life:8,col:[255,60,70]});x=nx;return j<40;});}return k<60;});}}
];
const VW0=480;
export const CHAR_POOL={id:'pool',name:'Deadpool',pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.3,jump:5.4,hp:360,armor:.75,glow:[255,80,90],cape:null,thrust:()=>rgb(255,80,90),powers:POOL_POWERS};
// Ghost Rider's chain is drawn from these points for a few frames (render.js)
export function drawChain(pix){const c=ST.chain;if(!c||c.life<=0)return;c.life--;for(let k=1;k<c.pts.length;k++){const [x0,y0]=c.pts[k-1],[x1,y1]=c.pts[k],n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);
  for(let s=0;s<=n;s++){const u=s/n,X=x0+(x1-x0)*u,Y=y0+(y1-y0)*u;pix(X,Y,(s>>1)&1?rgb(200,200,210):rgb(120,120,130),rgb(255,120,30));}}}
