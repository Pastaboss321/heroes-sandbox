// Hulk: sprite, palette, rig entry, powers and roster entry.
import './doom.js'; // evaluation order: runs after heroes/doom.js
import { ST } from '../state.js';
import { EMPTY, F, FIRE, G, GLASS, KIND, L, OBSID, P, R, RUBBLE, S, STEEL, rgb } from '../world/materials.js';
import { H, W, bg, bgB, bgD, col, markDirty, setc, t, wake } from '../world/grid.js';
import { NAT, bodies, q } from '../world/support.js';
import { bodyAt, makeBody } from '../world/bodies.js';
import { MP, spawn } from '../world/particles.js';
import { afters, flash, fxBurst, fxImpact, fxWord, rings } from '../render/fx.js';
import { bgHit, explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { GAMMA, crackCell, grabbable, pickC, quake, shockFx, smashOverlap, surfaceY, thunderclap } from './powers.js';
import { ACT } from './xmen.js';
import { carve, keys, mouse, pressed, toggleFly } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { sliceLine } from '../world/slice.js';

const SPR_HULK=[
"......hhhhh......",
".....hhhhhhh.....",
".....hkGGGgh.....",
"....kGKKgKKgg....",
"...kGGeKGKegGg...",
"..kGGGgKwKgGGGg..",
".kGGGGGgKgGGGGGg.",
"kGGkGGGGGGGGGgGGg",
"kGGkkGGGgGGGGgGgg",
"kGGgkGGGgGGGgGggg",
"kGg.kGGgKgGGg.Ggg",
"kGg.GkGKGKGgg.Ggg",
"kGg.kGGKGKgGg.Ggg",
"kGg..kGgGgGg..Ggg",
"kGg..ppPppqq..Ggg",
"kGg.PpppqppPq.Ggg",
"kGG.Pppq.Pppq.GGg",
"gGg.Pppq.Pppq.Ggg",
"ggg.Pppq.Pppq.ggg",
"....Ppqq.Ppqq....",
"....pqpq.pqpq....",
"....kGGg.kGGg....",
"...kGGg...kGGg...",
"...GGgg...GGgg...",
"..kGGgg...GGGgg..",
"..ggggg...ggggg.."];
const PAL_HULK={h:rgb(18,20,16),G:rgb(84,150,58),g:rgb(44,96,34),k:rgb(140,200,96),K:rgb(26,58,22),e:rgb(220,255,190),w:rgb(232,228,204),p:rgb(98,50,130),q:rgb(56,26,80),P:rgb(140,84,172)};

// animation rig entry (see render/rig.js)
ANIM.hulk={leg:19,mid:8,armC:'kGg',tipC:'kGg',aw:3,al:9,fs:4,sh:[14,7],hide:rect(14,16,8,18),blink:'e',lid:'K'};
const HULK_POWERS=[
 {n:'Smash',fn:(a,p,use)=>{if(!use(4))return;p.punchF=10;const x=a.h.x+a.dx*7,y=a.h.y+a.dy*7;explode(x,y,p.rage>0?16:10,{self:true,col:[210,200,170],word:'SMASH!'});damageEnemies(x,y,16,35,a.dx*6,a.dy*6-2);
   for(const b of bodies){const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy)||1;if(d<b.rmax+16){b.vx+=a.dx*7;b.vy+=a.dy*7-2;b.va+=(R()-.5)*.08;b.thrown=true;}}
   p.vx-=a.dx*1.5;ST.cd=14;ST.shake=Math.min(22,ST.shake+5);rings.push({x,y,r:3,vr:3,life:10,c:GAMMA});}},
 {n:'Thunderclap',fn:(a,p,use)=>{if(!use(25))return;thunderclap(a);ST.cd=50;}},
 {n:'Gamma Leap',fn:(a,p,use)=>{if(!use(10))return;if(!p.ground&&!p.leap){p.slam=true;p.slamOpt={col:GAMMA,r:40};ST.cd=20;return;}
   const s=Math.min(1,a.d/120);p.vx=a.dx*(4+4*s);p.vy=Math.min(-3.5,a.dy*(5+3*s)-2.5);p.ground=false;p.leap=true;ST.cd=30;ST.shake+=4;
   for(let k=0;k<24;k++)spawn(p.x+(R()-.5)*8,p.y,(R()-.5)*4,-R()*2,rgb(160,150,130),20,0,0,0,1);}},
 {n:'Rip & Throw',tk:{r:14,range:26,tether:false,throwMul:0,overhead:true}},
 {n:'Gamma Quake',fn:(a,p,use)=>{if(!use(28))return;if(p.ground){p.vy=-5;p.ground=false;}p.slam=true;p.slamOpt={col:GAMMA,r:46};ST.cd=50;}},
 {n:'Gamma Roar',fn:(a,p,use)=>{if(!use(20))return;ST.cd=45;const cx=a.h.x,cy=a.h.y-6,R0=120,ang=Math.atan2(a.dy,a.dx);fxWord(cx+a.dx*30,cy-16,'RRRAAAARGH!',1.6,'#bff07a',true);fxImpact(cx,cy,3);ST.hitstop=Math.max(ST.hitstop,3);
   for(let n=0;n<5000;n++){const d=Math.sqrt(R())*R0,t2=ang+(R()-.5)*1.3,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if(m===GLASS){spawn(X,Y,Math.cos(t2)*4,Math.sin(t2)*4-1,col[i],60,0,1);setc(i,EMPTY);}else if((KIND[m]===P||KIND[m]===L)&&R()<.5){spawn(X,Y,Math.cos(t2)*4,Math.sin(t2)*4-1,col[i],60,m,0);t[i]=0;wake(i);}else if(KIND[m]===G||KIND[m]===F){t[i]=0;wake(i);}}
   for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0&&(dx*a.dx+dy*a.dy)/d>.5){e.frozen=Math.max(e.frozen||0,90);hitEnemy(e,8,a.dx*5,a.dy*5-2);}}
   for(let k=0;k<4;k++)rings.push({x:cx+a.dx*k*16,y:cy+a.dy*k*16,r:5+k*5,vr:3.5,life:12,c:GAMMA});ST.shake=22;}},
 {n:'Boulder Toss',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;const X0=p.x+p.face*6|0,Y0=p.y+4|0,r=7;let n=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r*(.7+R()*.3))continue;const X=X0+x,Y=Y0+y;if(X<0||X>=W||Y<0||Y>=H-40)continue;const i=Y*W+X,m=t[i];if(m&&(KIND[m]===S||KIND[m]===P)){q[n++]=i;markDirty(i);}}
   if(n<12)return;const b=makeBody(q,n,false);if(!b)return;b.x=p.x;b.y=p.y-ST.SH-b.rmax;smashOverlap(b);
   const dx=mouse.wx-b.x,dy=mouse.wy-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*10;b.vy=dy/d*10-2.5;b.va=p.face*.08;b.thrown=true;b.safeP=ST.frame+40;p.throwF=10;
   fxWord(b.x,b.y-10,'HUP!',1,'#bff07a',true);for(let k=0;k<30;k++)spawn(X0+(R()-.5)*12,Y0,(R()-.5)*3,-R()*3,rgb(150,140,125),25,0,0,1);ST.shake+=5;}},
 // grab a foe and smash it into the ground, side to side, five times
 {n:'Puny God',fn:(a,p,use)=>{const e=grabbable(p.x+p.face*10,p.y-ST.PH/2,44);if(!e){if(ST.frame-(p.denyT||-99)>20){p.denyT=ST.frame;fxWord(p.x,p.y-ST.PH-6,'HRRM?',.8,'#bff07a',true);snd('deny',p.x,p.y);}return;}
   if(!use(26))return;ST.cd=80;e.grabbed=true;let k=0,side=p.face,hits=0;const N=5;fxWord(p.x,p.y-ST.PH-10,'PUNY...',1.2,'#bff07a',true);snd('rip',p.x,p.y);
   ACT.push(()=>{if(!enemies.includes(e)||e.hp<=0){p.script=0;p.grip=null;return false;}
     p.script=2;k++;const f=(k%14)/14,R0=12+e.def.h/2+e.def.w*.2,cx=p.x,cy=p.y-ST.PH*.72;
     const a0=side>0?Math.PI:0,a1=side>0?Math.PI*2:-Math.PI,ang=a0+(a1-a0)*(f*f*(3-2*f)); // up and over the head, then down hard on the other side
     e.x=cx+Math.cos(ang)*R0;e.y=cy+Math.sin(ang)*R0*.95;p.grip={x:e.x,y:e.y};p.face=Math.cos(ang)>=0?1:-1;
     if(k%14===13){hits++;side=-side;const gx=e.x|0,gy=surfaceY(gx,e.y-6,70);e.y=Math.min(e.y,gy-e.def.h/2-1);
       explode(gx,gy,7+hits,{self:true,quiet:true,col:[210,200,170]});hitEnemy(e,hits<N?20:45,0,0);snd('slam',gx,gy,{size:.6+hits*.1});shockFx(gx,gy,.5);
       ST.shake=Math.min(22,ST.shake+6);ST.hitstop=Math.max(ST.hitstop,hits<N?2:5);fxWord(gx,gy-14,hits<N?['WHAM!','KRAK!','SLAM!','THOOM!'][hits%4]:'PUNY GOD.',hits<N?1:1.6,'#bff07a',true);
       if(hits>=N){e.grabbed=false;e.vx=-side*2;e.vy=-2;p.script=0;p.grip=null;p.throwF=8;return false;}}
     return true;});}},
 // a fissure races along the ground; slabs of earth erupt from it as tumbling rigid chunks
 {n:'Fault Line',fn:(a,p,use)=>{if(!p.ground||!use(24))return;ST.cd=50;const dir=a.dx<0?-1:1;p.face=dir;p.punchF=10;let x=p.x+dir*8,k=0;const y0=p.y;
   fxWord(p.x+dir*30,p.y-ST.PH-8,'KRRRAAACK!',1.3,'#bff07a',true);explode(p.x+dir*6|0,p.y+1,6,{self:true,quiet:true,col:[200,190,160]});ST.shake+=6;snd('slam',p.x,p.y,{size:.8});
   ACT.push(()=>{for(let s=0;s<2;s++){x+=dir*3;if(x<4||x>=W-4)return false;const sy=surfaceY(x,y0-40,120);if(sy>=H-46||sy>y0+60)return false;
       const depth=10+R()*16|0;for(let d=0;d<depth;d++){const X=x+(R()-.5)*3|0;for(let w=-1;w<=1;w++)if(R()<.75)crackCell(X+w,sy+d,dir);}
       for(let n=0;n<4;n++)spawn(x+(R()-.5)*4,sy-1,(R()-.5)*2,-1-R()*3,rgb(160,150,130),20+R()*14,0,0,1);
       for(const e of enemies)if(Math.abs(e.x-x)<8+e.def.w/2&&Math.abs(e.y+e.def.h/2-sy)<14){hitEnemy(e,6,dir,-1.5);if(!e.def.title)e.vy=Math.min(e.vy,-5);}}
     if(k%4===1){const px0=x+dir*5|0,sy=surfaceY(px0,y0-40,120);let n=0;
       for(let Y=sy;Y<sy+11;Y++)for(let X=px0-4;X<=px0+4;X++){if(X<0||X>=W||Y<0||Y>=H-46)continue;const i=Y*W+X,m=t[i];if(KIND[m]===S||KIND[m]===P){q[n++]=i;markDirty(i);}}
       if(n>=20){const b=makeBody(q,n,false);if(b){b.vy=-5.5-R()*3;b.vx=dir*R()*1.2;b.va=(R()-.5)*.08;b.safeP=ST.frame+40;}}}
     ST.shake=Math.max(ST.shake,3);if(k%6===0)snd('crumble',x,y0,{size:.8});return++k<40;});}},
 // leap out of sight, then come down on the cursor like a meteor
 {n:'Meteor Drop',fn:(a,p,use)=>{if(!use(40))return;ST.cd=100;const tx=Math.max(12,Math.min(W-12,mouse.wx));let k=0,ph=0;if(p.fly)toggleFly(false);p.slam=p.leap=false;
   explode(p.x|0,p.y+1,7,{self:true,col:[200,190,160]});fxWord(p.x,p.y-ST.PH-10,'HULK LEAP!',1.2,'#bff07a',true);snd('leap',p.x,p.y,{size:1});
   ACT.push(()=>{k++;p.script=2;p.vx=0;
     if(ph===0){p.vy=-12;for(let s=0;s<4;s++){p.y-=3;carve(p.x,p.y-ST.PH/2,7,0,-6);}if(k%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});spawn(p.x+(R()-.5)*6,p.y,(R()-.5),2,rgb(170,160,140),20,0,0,1);
       if(p.y<ST.camY-ST.PH-24||p.y<ST.PH+4||k>45){ph=1;k=0;p.x=tx;p.y=Math.max(ST.PH+4,ST.camY-30);fxWord(tx,ST.camY+30,'INCOMING!',1.3,'#ffc93c',true);snd('jet',tx,ST.camY+40,{v:.8});}
       return true;}
     p.vy=11;let hitG=false;
     for(let s=0;s<11&&!hitG;s++){p.y+=1;if(p.y>=H-6){hitG=true;break;}const fi=((p.y+1)|0)*W+(p.x|0),m=t[fi];if(m&&KIND[m]===S&&(NAT[m]||m===OBSID)){hitG=true;break;}if(s%3===0)carve(p.x,p.y-ST.PH/2+4,8,0,8);}
     for(let n=0;n<10;n++)spawn(p.x+(R()-.5)*10,p.y-ST.PH*R(),(R()-.5)*1.5,-2-R()*2,R()<.5?rgb(255,170+R()*60|0,60):pickC(GAMMA),18+R()*12,R()<.02?FIRE:0,1,0,1);
     afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});damageEnemies(p.x,p.y-ST.PH/2,14,10,0,4);flash(p.x,p.y-ST.PH/2,24,[255,170,80],2);
     if(hitG||k>80){p.script=0;p.vy=0;p.landF=8;explode(p.x|0,p.y|0,20,{fire:.3,col:[255,170,80],word:'METEOR!'});quake(p.x,p.y,{col:GAMMA,r:46});damageEnemies(p.x,p.y,80,90,0,-6,true);
       fxImpact(p.x,p.y,5);ST.hitstop=Math.max(ST.hitstop,5);shockFx(p.x,p.y,1.3);return false;}
     return true;});}},
 // curl up and bounce through the city: smashes buildings, rebounds off bedrock and steel. A/D steer, S stops
 {n:'Wrecking Ball',fn:(a,p,use)=>{if(p.ball||!use(30))return;ST.cd=70;let vx=a.dx*6,vy=Math.min(-1.5,a.dy*6),k=0;const r=11;if(p.fly)toggleFly(false);p.ball=1;fxWord(p.x,p.y-ST.PH-10,'WRECKING BALL!',1.2,'#bff07a',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{k++;p.script=2;const ax=(keys.KeyD?1:0)-(keys.KeyA?1:0);vx+=ax*.2;vy+=.34;let sp=Math.hypot(vx,vy);if(sp>8.5){vx*=8.5/sp;vy*=8.5/sp;sp=8.5;}
     const n=Math.max(1,Math.ceil(sp/2));
     for(let s=0;s<n;s++){const cx=p.x+vx/n,cy=p.y-r+vy/n;let hx=0,hy=0,hit=0;
       for(let q2=0;q2<20;q2++){const an=q2/20*6.283,X=cx+Math.cos(an)*r|0,Y=cy+Math.sin(an)*r|0;
         if(X<2||X>=W-2||Y>=H-2){hx+=Math.cos(an);hy+=Math.sin(an);hit++;continue;}if(Y<0)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F||KIND[m]===L)continue;
         if(KIND[m]===S&&NAT[m]||m===OBSID||m===STEEL&&R()<.5){hx+=Math.cos(an);hy+=Math.sin(an);hit++;}
         else{if(ST.np<MP-300&&R()<.6)spawn(X,Y,vx*.5+(R()-.5)*2,vy*.5-R()*2,col[i],70,KIND[m]===S?RUBBLE:m,m===GLASS?1:0);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}setc(i,EMPTY);}}
       if(hit){const d=Math.hypot(hx,hy)||1,nx=hx/d,ny=hy/d,vn=vx*nx+vy*ny;
         if(vn>0){vx-=1.6*vn*nx;vy-=1.6*vn*ny;vx*=.97;if(vn>2.5){const ix=cx+nx*r,iy=cy+ny*r;explode(ix|0,iy|0,4+Math.min(5,vn)|0,{self:true,quiet:vn<5,col:[200,190,160]});ST.shake=Math.max(ST.shake,vn*1.2);snd('thud',ix,iy,{v:Math.min(1,vn/6)});}}
         if(hit>5){p.x-=nx*1.2;p.y-=ny*1.2;}}
       else{p.x=cx;p.y=cy+r;}}
     bgHit(p.x,p.y-r,r);damageEnemies(p.x,p.y-r,r+5,4+sp*1.6,vx*.5,vy*.5-1);
     for(const b of bodies){if(b.held)continue;const dx=b.x-p.x,dy=b.y-(p.y-r),d=Math.hypot(dx,dy)||1;if(d<b.rmax+r&&bodyAt(b,p.x+dx/d*r,p.y-r+dy/d*r)){b.vx+=vx*.4;b.vy+=vy*.4-.5;b.thrown=true;}}
     p.ang+=vx*.11;p.face=vx<0?-1:1;if(k%2===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:9});spawn(p.x,p.y-r,(R()-.5),(R()-.5),pickC(GAMMA),12,0,1,0,1);
     if(k>=240||(pressed.KeyS&&k>15)){p.ball=0;p.ang=0;p.script=0;p.vx=vx*.6;p.vy=Math.min(vy,0);explode(p.x|0,p.y-4|0,8,{self:true,col:GAMMA});return false;}
     return true;});}},
 // grab the nearest enemy and swing it like a flail through the others, then hurl it
 {n:'Hulk Flail',fn:(a,p,use)=>{const e=nearestEnemy(p.x,p.y-ST.PH/2,46);if(!e||e.def.titan||e.def.title){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO GRAB',.7,'#bff07a',true);return;}if(!use(16))return;ST.cd=40;let k=0;fxWord(p.x,p.y-ST.PH-10,'PUNY THING!',1.1,'#bff07a',true);
   ACT.push(()=>{k++;if(e.hp<=0||!enemies.includes(e))return false;p.script=2;const an=k*.42,r=22,cx=p.x,cy=p.y-ST.PH/2;e.x=cx+Math.cos(an)*r;e.y=cy+Math.sin(an)*r*.7;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);
     for(const o of enemies)if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<o.def.w/2+e.def.w/2+3){hitEnemy(o,14,(o.x-cx)*.1,-2);hitEnemy(e,4,0,0);}carve(e.x,e.y,3,0,0);
     if(k>=36){const dx=mouse.wx-e.x,dy=mouse.wy-e.y,d=Math.hypot(dx,dy)||1;e.vx=dx/d*11;e.vy=dy/d*11;e.thrownT=60;hitEnemy(e,20,0,0);fxWord(e.x,e.y-10,'HULK THROW!',1,'#bff07a',true);return false;}return true;});}},
 // a punch into the ground opens a jagged fissure that runs ahead and splits the street into slabs
 {n:'Fault Fissure',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const dir=a.dx<0?-1:1;let x=p.x+dir*6,y=p.y+1,k=0;p.punchF=10;quake(p.x,p.y,{r:16,col:[130,255,90]});
   ACT.push(()=>{k++;const nx=x+dir*(6+R()*4),ny=surfaceY(nx|0,Math.max(0,y-20|0),50)+(R()*4|0);sliceLine(x,y,nx,ny+24,{edge:[150,255,110],w:1,push:1.4,quiet:k%3!==0});
     if(k%3===0)sliceLine(nx,ny-2,nx+dir*2,ny+30,{edge:[150,255,110],quiet:true});damageEnemies(nx,ny-6,12,9,dir,-5);if(R()<.5)spawn(nx,ny,(R()-.5)*2,-2-R()*3,rgb(150,140,125),30,0,0,1);ST.shake=Math.max(ST.shake,4);x=nx;y=ny;return k<36;});
   fxWord(p.x+dir*40,p.y-24,'KRRRAAAK!',1.3,'#bff07a',true);}},
 {n:'The Madder Hulk Gets',fn:(a,p,use)=>{if(p.madder>0||!use(22))return;ST.cd=80;p.madder=360;p.sizeT=1.3;ST.buffT=Math.max(ST.buffT||0,ST.frame+360);let hp0=p.hp;fxWord(p.x,p.y-ST.PH-14,'THE MADDER HULK GETS...',1.1,'#7fff6a',true);snd('roar',p.x,p.y,{pitch:.6});
    ACT.push(()=>{if(--p.madder<=0||ST.CH.id!=='hulk'){if(ST.CH.id==='hulk')p.sizeT=1;p.madder=0;return false;}if(p.hp<hp0){p.en=Math.min(100,p.en+(hp0-p.hp)*.6);ST.buffT=Math.max(ST.buffT,ST.frame+90);}hp0=p.hp;
      if(ST.frame%4===0)spawn(p.x+(R()-.5)*ST.PW*1.4,p.y-R()*ST.PH,(R()-.5)*.4,-.8,rgb(140,255,120),14,0,1,0,1);return true;});}},
 {n:'Worldbreaker',ult:true,fn:(a,p,use)=>{if(p.rage>0||!use(45))return;p.rage=420;ST.cd=40;fxWord(p.x,p.y-ST.PH-14,'HULK SMASH!!',1.7,'#bff07a',true);fxBurst(p.x,p.y-ST.PH/2,60,'#bff07a');quake(p.x,p.y,{col:GAMMA,r:30});}}
];



// roster entry (CHARS in heroes/index.js)
export const CHAR_HULK={id:'hulk',name:'Hulk',spr:SPR_HULK,pal:PAL_HULK,pw:9,ph:23,fly:false,fs:2.6,boost:1,run:2.3,jump:6.2,hp:500,armor:.45,glow:GAMMA,cape:null,thrust:()=>pickC(GAMMA),powers:HULK_POWERS};
