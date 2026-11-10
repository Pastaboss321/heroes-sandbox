// Magneto (playable): sprite, palette, rig entry, powers and roster entry.
import './ultron.js'; // evaluation order: runs after heroes/ultron.js
import { ST } from '../state.js';
import { EMPTY, F, G, KIND, R, RUBBLE, S, STEEL, rgb } from '../world/materials.js';
import { H, W, col, markDirty, setc, t, wake } from '../world/grid.js';
import { bodies, gnd, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { disc, tint } from '../maps/gen.js';
import { pvx, pvy, px, py, spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { ANIM, rect } from '../render/rig.js';
import { snd, sndLoop } from '../sfx.js';
import { isMetal, pickC, shieldAs, shockFx, shots } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { hurlBody } from './villains.js';
import { carve, mouse } from '../player.js';
import { damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { fig8, nearestN, noTarget } from './kitlib.js';


const MAG_POWERS=[
 {n:'Magnetic Bolts',fn:(a,p,use)=>{if(!use(6))return;ST.cd=10;for(let k=-1;k<=1;k++){const an=Math.atan2(a.dy,a.dx)+k*.12;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(an)*6,vy:Math.sin(an)*6,type:'mbolt',life:110,col:[210,130,255],ecol:[210,130,255],boom:5});}}},
 // tear a chunk out of the nearest building (steel first) and hurl it at the cursor
 {n:'Rip Steel',fn:(a,p,use)=>{let n=0;for(let tries=0;tries<80&&n<16;tries++){const X=p.x+(R()-.5)*160|0,Y=p.y-ST.PH/2+(R()-.4)*120|0;if(X<4||X>=W-4||Y<4||Y>=H-50)continue;if(KIND[t[Y*W+X]]===S&&!gnd[Y*W+X])n=solidCells(X,Y,6,false);}
   if(n<16||!use(18))return;ST.cd=30;const b=makeBody(q,n,false);if(!b)return;b.x=p.x;b.y=p.y-ST.PH-b.rmax-4;hurlBody(b,mouse.wx,mouse.wy,9.5);b.safeP=ST.frame+40;fxWord(p.x,p.y-ST.PH-10,'RISE!',1,'#c88cff',true);snd('rip',p.x,p.y);}},
 // hold: enemy fire caught in his field is bent around and sent at the nearest enemy
 {n:'Polarity Shield',fn:(a,p,use)=>{if(!use(.5))return;shieldAs([[230,170,255],[150,70,220],[170,90,255]],false);
   for(const s2 of shots)if(s2.owner==='enemy'&&Math.hypot(s2.x-p.x,s2.y-p.y+8)<30){const e=nearestEnemy(s2.x,s2.y,300);s2.owner='player';s2.col=[210,130,255];s2.ecol=[210,130,255];if(e){const dx=e.x-s2.x,dy=e.y-s2.y,d=Math.hypot(dx,dy)||1;s2.vx=dx/d*6;s2.vy=dy/d*6;}else{s2.vx*=-1.2;s2.vy*=-1.2;}}}},
 // every scrap of steel and every robot near the cursor is crushed into one ball and thrown
 {n:'Scrap Ball',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;const cx=mouse.wx|0,cy=mouse.wy|0,r=34;let n=0;for(let y=-r;y<=r&&n<900;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X;if(t[i]===STEEL){t[i]=0;wake(i);markDirty(i);n++;}}
   let crushed=0;for(const e of enemies)if(isMetal(e)&&!e.def.title&&Math.hypot(e.x-cx,e.y-cy)<r+10){hitEnemy(e,60,0,0);crushed++;}
   const rr=Math.max(4,Math.min(12,Math.sqrt(n/3.1)|0));if(n>20){disc(cx,cy,rr,STEEL);tint(cx-rr,cy-rr,cx+rr+1,cy+rr+1,120,126,140,14);const m=solidCells(cx,cy,rr,true);const b=m>=12?makeBody(q,m,false):null;if(b){hurlBody(b,cx+(cx-p.x)*2,cy-20,7);}}
   fxWord(cx,cy-r,crushed?'CRUSHED':'COMPACTED',1.1,'#c88cff',true);snd('clang',cx,cy);ST.shake+=6;}},
 {n:'Iron Maelstrom',fn:(a,p,use)=>{const cx=mouse.wx,cy=mouse.wy,L=[];for(let k=0;k<5000&&L.length<90;k++){const X=cx+(R()-.5)*280|0,Y=cy+(R()-.5)*280|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X;if(t[i]===STEEL)L.push(i);}
   if(L.length<12){fxWord(cx,cy,'NO METAL',.8,'#c88cff',true);return;}if(!use(34))return;ST.cd=70;const sh=[];for(const i of L){const X=i%W,Y=(i/W)|0;setc(i,EMPTY);const s={x:X,y:Y,vx:0,vy:0,type:'spike',life:200,col:[170,176,190],boom:4,grav:0};shots.push(s);sh.push(s);}
   let k=0;fxWord(cx,cy-30,'IRON MAELSTROM!',1.2,'#c88cff',true);snd('rip',cx,cy);
   ACT.push(()=>{k++;for(const s of sh){if(!shots.includes(s))continue;if(k<50){const dx=s.x-cx,dy=s.y-cy,d=Math.hypot(dx,dy)||1,tr=20+(s.life%30);s.vx=-dy/d*4+(tr-d)*dx/d*.08;s.vy=dx/d*4+(tr-d)*dy/d*.08;s.life=200;}else if(k===50){s.home=true;const e=nearestEnemy(s.x,s.y,260);if(e){const d=Math.hypot(e.x-s.x,e.y-s.y)||1;s.vx=(e.x-s.x)/d*7;s.vy=(e.y-s.y)/d*7;}}}return k<60;});}},
 // a magnetic pulse that throws everything metal, and every enemy, away from him
 {n:'Repulse',fn:(a,p,use)=>{if(!use(22))return;ST.cd=36;const cx=p.x,cy=p.y-ST.PH/2;for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<120){const k=isMetal(e)?9:5;e.vx+=dx/d*k;e.vy+=dy/d*k-2;e.thrownT=40;hitEnemy(e,12,0,0);}}
   for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<140){b.vx+=dx/d*6;b.vy+=dy/d*6-1;b.thrown=true;}}rings.push({x:cx,y:cy,r:6,vr:6,life:14,c:[200,120,255]});shockFx(cx,cy,.8);fxWord(cx,cy-24,'REPULSE!',1.2,'#c88cff',true);}},
 // a steel rod fired at magnetic speed: pierces everything in a straight line
 {n:'Rail Shot',fn:(a,p,use)=>{if(!use(26))return;ST.cd=40;let x=a.h.x,y=a.h.y;for(let s=0;s<520;s++){x+=a.dx;y+=a.dy;const X=x|0,Y=y|0;if(X<1||X>=W-1||Y<1||Y>=H-44)break;const i=Y*W+X,m=t[i];if(m&&KIND[m]!==G&&KIND[m]!==F){if(R()<.3)spawn(X,Y,a.dx*3+(R()-.5)*2,a.dy*3-R()*2,col[i],40,KIND[m]===S?RUBBLE:m,0);setc(i,EMPTY);}}
   damageLine(a.h.x,a.h.y,x,y,4,60);beams.push({x0:a.h.x,y0:a.h.y,x1:x,y1:y,life:5,w:1,c:[240,230,255],g:[170,90,255]});fxWord(a.h.x+a.dx*40,a.h.y-10,'SHHHRAK!',1,'#c88cff',true);snd('zap',a.h.x,a.h.y,{pitch:.5});ST.shake+=5;}},
 // hold: a magnetic implosion. Debris, wreckage, loose steel and robots are dragged into one crushing point
 {n:'Magnetic Implosion',fn:(a,p,use)=>{if(!use(1))return;const cx=mouse.wx,cy=mouse.wy;
   for(const b of bodies){if(b.held)continue;const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<160){b.vx+=dx/d*.9;b.vy+=dy/d*.9-.4;b.thrown=true;}}
   for(let n=0;n<ST.np;n++){const dx=cx-px[n],dy=cy-py[n],d2=dx*dx+dy*dy;if(d2<25600){const d=Math.sqrt(d2)||1;pvx[n]+=dx/d*.5;pvy[n]+=dy/d*.5-.15;}}
   if(ST.frame%2===0)for(let k=0;k<6;k++){const X=cx+(R()-.5)*180|0,Y=cy+(R()-.5)*120|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X;if(t[i]===STEEL||(KIND[t[i]]===S&&!gnd[i]&&R()<.3)){const c=col[i];setc(i,EMPTY);const dx=cx-X,dy=cy-Y,d=Math.hypot(dx,dy)||1;spawn(X,Y,dx/d*3,dy/d*3,c,80,RUBBLE,0,0);}}
   for(const e of enemies){if(e.def.title)continue;const d=Math.hypot(e.x-cx,e.y-cy);if(d<90+e.def.w/2){e.vx+=(cx-e.x)*.02;e.vy+=(cy-e.y)*.02;if(isMetal(e))hitEnemy(e,1.6,0,0);}}
   if(ST.frame%2===0)rings.push({x:cx,y:cy,r:60,vr:-4,life:6,c:[200,120,255]});ST.shake=Math.max(ST.shake,2);sndLoop('crush','hum',cx,cy,{v:.8});}},
 // Asteroid M: rip a mountain of ground out from under the cursor and drop it from the sky
 // every girder and steel beam around him tears loose and flies at the cursor as a storm of spikes
 {n:'Girder Storm',fn:(a,p,use)=>{const L=[];for(let k=0;k<4000&&L.length<70;k++){const X=p.x+(R()-.5)*220|0,Y=p.y-ST.PH/2+(R()-.5)*220|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X;if(t[i]===STEEL||(KIND[t[i]]===S&&!gnd[i]&&R()<.1))L.push(i);}
   if(L.length<10){fxWord(p.x,p.y-ST.PH-8,'NO METAL',.8,'#c88cff',true);return;}if(!use(45))return;ST.cd=80;
   L.forEach((i,n)=>{const X=i%W,Y=(i/W)|0;setc(i,EMPTY);const dx=mouse.wx-X,dy=mouse.wy-Y,d=Math.hypot(dx,dy)||1,v=6+R()*2;shots.push({x:X,y:Y,vx:dx/d*v,vy:dy/d*v,type:'spike',life:120,col:[170,176,190],boom:5,grav:.05,delay:n>>1});});
   fxWord(p.x,p.y-ST.PH-12,'GIRDER STORM!',1.4,'#c88cff',true);snd('rip',p.x,p.y);ST.shake+=8;}},
 // every enemy shot on screen turns round and goes home
 {n:'Polarity Reverse',fn:(a,p,use)=>{let n=0;for(const s of shots){if(s.owner!=='enemy')continue;if(Math.abs(s.x-p.x)>260||Math.abs(s.y-p.y)>160)continue;n++;s.owner='player';const src=s.src&&s.src.hp>0?s.src:null;if(src){const d=Math.hypot(src.x-s.x,src.y-s.y)||1,v=Math.hypot(s.vx,s.vy)*1.4;s.vx=(src.x-s.x)/d*v;s.vy=(src.y-s.y)/d*v;}else{s.vx*=-1.4;s.vy*=-1.4;}s.col=[200,120,255];}
   if(!use(14))return;ST.cd=30;rings.push({x:p.x,y:p.y-8,r:10,vr:6,life:14,c:[200,120,255]});fxWord(p.x,p.y-ST.PH-8,n?'RETURN TO SENDER':'POLARITY REVERSED',.9,'#c88cff',true);}},
 // a storm of torn steel orbits him and shreds what comes close
 {n:'Metal Storm Armor',fn:(a,p,use)=>{if(p.mstorm>0||!use(30))return;ST.cd=60;p.mstorm=480;fxWord(p.x,p.y-ST.PH-10,'MASTER OF MAGNETISM',1,'#c88cff',true);
   ACT.push(()=>{if(--p.mstorm<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;for(let k=0;k<6;k++){const an=ST.frame*.15+k*1.047,r=20+Math.sin(ST.frame*.07+k)*4;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r*.8,0,0,k&1?rgb(170,176,190):rgb(120,126,140),3,0,0,0,0);}
     if(ST.frame%5===0){for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<28+e.def.w/2)hitEnemy(e,6,(e.x-cx)/(d||1)*2,(e.y-cy)/(d||1)*2);}carve(cx+(R()-.5)*44,cy+(R()-.5)*36,3,0,0);}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<26)shots.splice(n,1);}return true;});}},
 // he takes hold of the iron in their blood: held up, shaking, hurt, then flung apart
  {n:'Blood Iron',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,100,6).filter(e=>!fig8(e));if(!list.length){noTarget('#c86bff');return;}if(!use(26))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy;let k=0;fxWord(cx,cy-40,'THE IRON IN YOUR BLOOD',.9,'#c86bff',true);
    rings.push({x:cx,y:cy,r:6,vr:3,life:20,c:[200,80,255]});
    ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;e.frozen=Math.max(e.frozen||0,2);if(k<20)e.y-=1;e.x+=(R()-.5)*1.2;if(k%10===0)hitEnemy(e,7,0,0);if(k%3===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(cx-e.x)*.03,(cy-e.y)*.03,rgb(200,30,40),10,0,1,0,1);}
      if(k<60)return true;for(const e of list)if(e.hp>0){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;e.frozen=0;e.vx=dx/d*6;e.vy=-4;e.thrownT=60;hitEnemy(e,14,0,0);}return false;});}},
 // one coin: it creeps toward the cursor, then accelerates through everything in its line
  {n:'Coin Drill',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;let x=a.h.x,y=a.h.y,k=0;const hit=new Set(),dx0=mouse.wx-x,dy0=mouse.wy-y,d0=Math.hypot(dx0,dy0)||1,ux=dx0/d0,uy=dy0/d0;fxWord(x,y-12,'*CLINK*',.7,'#ffd36a',true);
    ACT.push(()=>{k++;const sp=k<20?1.2:Math.min(14,1.2+(k-20)*1.5);x+=ux*sp;y+=uy*sp;carve(x,y,1.6,ux*2,uy*2);beams.push({x0:x-ux*3,y0:y-uy*3,x1:x,y1:y,life:2,w:0,c:[255,230,140],g:[200,120,40]});
      for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-x)<e.def.w/2+2&&Math.abs(e.y-y)<e.def.h/2+2){hit.add(e);hitEnemy(e,k<20?12:34,ux*3,uy*3);flash(x,y,8,[255,220,120],3);}return k<70&&x>1&&x<W-1&&y<H-2;});}},
 {n:'Asteroid M',ult:true,fn:(a,p,use)=>{if(!use(55))return;ST.cd=140;const cx=mouse.wx|0,cy=groundBelow(cx,mouse.wy)+10,n=solidCells(cx,cy,18,true);if(n<60)return;const b=makeBody(q,n,true);if(!b)return;b.tx=cx;b.ty=Math.max(30,ST.camY+40);let k=0;
   fxWord(cx,cy-40,'ASTEROID M!',1.5,'#c88cff',true);snd('rip',cx,cy);ST.shake+=10;ACT.push(()=>{k++;if(!bodies.includes(b))return false;if(k<60){b.tx=mouse.wx;b.ty=Math.max(30,ST.camY+40);return true;}b.held=false;b.vx=0;b.vy=10;b.thrown=true;b.safeP=ST.frame+30;return false;});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_MAGNETO={id:'magneto',name:'Magneto',pw:7,ph:19,fly:true,fs:3.0,boost:2.0,run:1.8,jump:4.4,hp:330,armor:.75,glow:[200,120,255],cape:null,thrust:()=>pickC([210,140,255]),powers:MAG_POWERS};
