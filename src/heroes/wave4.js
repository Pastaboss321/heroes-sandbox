// Wave 4 newcomers built around cutting: Ghost Rider (a hellfire chain that slices and burns, the Hell
// Cycle, the Penance Stare) and Deadpool (two katanas, two pistols, a teleport belt, and no shame).
import { ST } from '../state.js';
import { FIRE, FLAM, KIND, R, S, rgb } from '../world/materials.js';
import { H, W, setc, t } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { afters, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { scriptMove, shockFx, shots, surfaceY } from './powers.js';
import { ACT } from './xmen.js';
import { boxHit, carve, mouse } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';

const HF=[255,130,30],HFE=[255,170,60];
const burnAt=(x,y)=>{const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H-6)return;const i=Y*W+X;if(t[i]===0){if(R()<.4)setc(i,FIRE);}else if(FLAM[t[i]]>0)ignite(i);};
// ================= GHOST RIDER =================
const SPR_RIDER=[
"...@.*@*.@...",
"...@*@*@*@...",
"....w@w@g....",
"....wwwgg....",
".....kwk.....",
"...sLKKKKs...",
".sLKKsKKKKKs.",
".LKLKKsKKKKk.",
".LKLKKKsKKKk.",
".LK.LKKKs.Kk.",
".LK.LKKKK.Kk.",
".kk.nnsnn.kk.",
".kk.DDDDd.kk.",
"....DDDDd....",
"....DD.Dd....",
"....DD.Dd....",
"....DD.Dd....",
"...DD...Dd...",
"...KK...Kk...",
"...KK...Kk...",
"...KK...Kk...",
"..sKK...Kks.."];
const PAL_RIDER={'*':rgb(255,236,120),'@':rgb(255,140,30),w:rgb(240,234,214),g:rgb(170,160,140),k:rgb(18,16,18),K:rgb(52,46,48),L:rgb(96,88,90),s:rgb(200,200,210),n:rgb(100,70,40),D:rgb(42,46,62),d:rgb(26,28,40)};
ANIM.rider={leg:14,mid:6,armC:'LKk',tipC:'kkk',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
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
 {n:'Brimstone Rain',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx;let k=0;fxWord(cx,ST.camY+24,'BRIMSTONE!',1.1,'#ff9a3c',true);
   ACT.push(()=>{if(k%3===0)shots.push({x:cx+(R()-.5)*140,y:ST.camY-6,vx:(R()-.5)*.6,vy:5.5,type:'fire',life:160,boom:8,fire:.7,col:HF,ecol:HF,grav:.06});return++k<70;});}},
 // the gate of Hell opens under the cursor: pillars of hellfire burst up around it
 {n:'Hell Gate',fn:(a,p,use)=>{if(!use(34))return;ST.cd=70;const cx=mouse.wx,gy=groundBelow(cx|0,mouse.wy);let k=0;fxWord(cx,gy-40,'THE GATES OPEN',1.2,'#ff9a3c',true);
   ACT.push(()=>{k++;if(k<25){if(k%5===0)rings.push({x:cx,y:gy,r:40*ST.aoeC,vr:-1,life:8,c:HF});return true;}
     for(let j=-3;j<=3;j++){const x=cx+j*16*ST.aoeC;for(let q=0;q<3;q++)spawn(x+(R()-.5)*6,gy,(R()-.5),-5-R()*5,R()<.5?rgb(255,230,120):rgb(255,90,20),40,R()<.1?FIRE:0,1,1);damageEnemies(x,gy-40,10,2.2,0,-3);}
     if(k===25){explode(cx|0,gy|0,16,{self:true,fire:.7});shockFx(cx,gy,1);}return k<80;});}},
 {n:'Hellfire Breath',fn:(a,p,use)=>{if(!use(1.2))return;const h=a.h;for(let j=0;j<6;j++){const an=Math.atan2(a.dy,a.dx)+(R()-.5)*.5,sp=3+R()*3;spawn(h.x,h.y-4,Math.cos(an)*sp,Math.sin(an)*sp,R()<.5?rgb(255,220,90):rgb(255,90,20),30,R()<.08?FIRE:0,1,1);}
   damageCone(h.x,h.y,a.dx,a.dy,60,1.8,1);for(let j=0;j<2;j++){const d=R()*60;burnAt(h.x+a.dx*d+(R()-.5)*8,h.y+a.dy*d+(R()-.5)*8);}}},
 // Judgement: every enemy in sight is made to feel its sins
 {n:'Judgement',fn:(a,p,use)=>{if(!use(65))return;ST.cd=200;fxWord(p.x,p.y-50,'YOUR SOUL IS STAINED WITH INNOCENT BLOOD',1.1,'#ff9a3c',true);ST.hitstop=Math.max(ST.hitstop,8);flash(p.x,p.y,240,HF,16);
   for(const e of enemies){if(Math.abs(e.x-p.x)>260||Math.abs(e.y-p.y)>170)continue;hitEnemy(e,e.def.titan?140:120,0,-2);if(!e.def.titan)e.frozen=Math.max(e.frozen||0,90);for(let k=0;k<20;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*2,-1-R()*2,rgb(255,140+R()*100|0,40),30,0,1,0,1);}}},
];
export const CHAR_RIDER={id:'rider',name:'Ghost Rider',spr:SPR_RIDER,pal:PAL_RIDER,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.3,jump:5,hp:420,armor:.6,glow:HF,cape:null,thrust:()=>rgb(255,140,40),powers:RIDER_POWERS};

// ================= DEADPOOL =================
const SPR_POOL=[
"..g.LRRRr.g..",
"..g.LRRRr.g..",
"...gkwRwkg...",
"....kkRkk....",
".....RRr.....",
"...kLRRRrk...",
".LRRkRRRkRRr.",
".LRkkRRRkkRr.",
".LRkLRRRrkRr.",
".LR.kRRRk.Rr.",
".LR.kRRrk.Rr.",
".kk.nnOnn.kk.",
".kk.kRRrk.kk.",
"....kRRrk....",
"....kR.rk....",
"....nR.rn....",
"....kR.rk....",
"...kR...rk...",
"...kk...kk...",
"...kk...kk...",
"...kk...kk...",
"..kkk...kkk.."];
const PAL_POOL={R:rgb(200,32,42),r:rgb(124,18,26),L:rgb(236,84,84),k:rgb(22,20,22),w:rgb(250,250,250),n:rgb(90,70,50),O:rgb(220,180,60),g:rgb(96,90,84)};
ANIM.pool={leg:14,mid:6,armC:'LRr',tipC:'kkk',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const STEELC=[230,232,240];
const QUIPS=['MAXIMUM EFFORT!','CHIMICHANGAS!','HI, MOM!','THAT WAS AWESOME','*FOURTH WALL*','SAY MY NAME!','PEW PEW!','I FEEL A CRITICAL HIT COMING'];
const quip=(p,s)=>fxWord(p.x,p.y-ST.PH-10,s||QUIPS[R()*QUIPS.length|0],.85,'#ff6b5c',true);
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
 // healing factor, but louder
 {n:'Regenerate',fn:(a,p,use)=>{if(p.hp>=ST.CH.hp||!use(.4))return;p.hp=Math.min(ST.CH.hp,p.hp+2);if(ST.frame%3===0)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,0,-.7,rgb(255,120,120),18,0,1,0);if(ST.frame%70===0)quip(p,'GROWING BACK MY... EVERYTHING');}},
 // C4: plants a charge on the cursor that blows after a beat, with a countdown
 {n:'C4',fn:(a,p,use)=>{if(!use(24))return;ST.cd=50;const cx=mouse.wx,cy=mouse.wy;let k=0;
   ACT.push(()=>{k++;if(k%20===0){fxWord(cx,cy-12,String(3-k/20|0),1,'#ff6b5c',true);snd('deny',cx,cy,{v:.4,pitch:2});}if(ST.frame%6<3)spawn(cx,cy,0,0,rgb(255,40,40),4,0,1,0,0);
     if(k>=60){explode(cx|0,cy|0,20,{fire:.4,word:'KA-BLOOEY!'});shockFx(cx,cy,1.2);return false;}return true;});}},
 // the Deadpool Corps: a line of Deadpools from across the multiverse dashes across the screen, katanas out
 {n:'Deadpool Corps',fn:(a,p,use)=>{if(!use(60))return;ST.cd=200;quip(p,'THE CORPS! (LADYPOOL, DOGPOOL, HEADPOOL...)');snd('wave',p.x,p.y);
   const dir=p.face;let k=0;ACT.push(()=>{k++;if(k%6===0&&k<60){const y=ST.camY+40+R()*180,x0=dir>0?ST.camX-10:ST.camX+VW0+10;let x=x0,j=0;
       ACT.push(()=>{j++;const nx=x+dir*14;sliceLine(x,y,nx,y+(R()-.5)*4,{edge:STEELC,quiet:j%5!==0,push:1.2});damageLine(x,y,nx,y,8,10);afters.push({x:nx,y:y+ST.PH/2,ang:0,face:dir,life:8,col:[255,60,70]});x=nx;return j<40;});}return k<60;});}},
];
const VW0=480;
export const CHAR_POOL={id:'pool',name:'Deadpool',spr:SPR_POOL,pal:PAL_POOL,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.3,jump:5.4,hp:360,armor:.75,glow:[255,80,90],cape:null,thrust:()=>rgb(255,80,90),powers:POOL_POWERS};
// Ghost Rider's chain is drawn from these points for a few frames (render.js)
export function drawChain(pix){const c=ST.chain;if(!c||c.life<=0)return;c.life--;for(let k=1;k<c.pts.length;k++){const [x0,y0]=c.pts[k-1],[x1,y1]=c.pts[k],n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);
  for(let s=0;s<=n;s++){const u=s/n,X=x0+(x1-x0)*u,Y=y0+(y1-y0)*u;pix(X,Y,(s>>1)&1?rgb(200,200,210):rgb(120,120,130),rgb(255,120,30));}}}
