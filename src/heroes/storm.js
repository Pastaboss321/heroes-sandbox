// Storm: sprite, palette, rig entry, powers and roster entry.
import './jean.js'; // evaluation order: runs after heroes/jean.js
import { ST } from '../state.js';
import { groundBelow } from '../ui/spawn.js';
import { ACID, EMPTY, F, FLAM, G, GLASS, HARD, ICE, KIND, L, P, R, RUBBLE, S, SAND, SNOW, STEAM, STEEL, WATER, rgb } from '../world/materials.js';
import { H, N, VH, W, col, markDirty, setc, t, wake } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { bodies } from '../world/support.js';
import { pvx, pvy, px, py, spawn, spawnFlake } from '../world/particles.js';
import { flash, fxBurst, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import '../render/rig.js'; // kept for evaluation order
import { snd, sndLoop } from '../sfx.js';
import { lightning, lightningStrike, pickC, shots, surfaceY, zap } from './powers.js';
import { ACT, iceAt } from './xmen.js';
import { boxHit, mouse, pl_, toggleFly } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { applyStatus } from './abilities.js';


const STORM_POWERS=[
 {n:'Chain Lightning',fn:(a,p,use)=>{if(!use(.8))return;lightning(a,{c:[245,248,255],g:[160,190,255],f:[205,220,255],spark:()=>pickC([200,220,255])});
   let e=nearestEnemy(a.h.x+a.dx*Math.min(a.d,200),a.h.y+a.dy*Math.min(a.d,200),60);const hitL=new Set();let lx=a.h.x+a.dx*Math.min(a.d,200),ly=a.h.y+a.dy*Math.min(a.d,200);
   for(let k=0;k<4&&e;k++){hitL.add(e);zap(lx,ly,e.x,e.y,[245,248,255],[160,190,255]);hitEnemy(e,2.2,0,0);lx=e.x;ly=e.y;e=enemies.filter(q2=>!hitL.has(q2)&&Math.hypot(q2.x-lx,q2.y-ly)<80).sort((u,v)=>Math.hypot(u.x-lx,u.y-ly)-Math.hypot(v.x-lx,v.y-ly))[0];}}},
 {n:'Ball Lightning',fn:(a,p,use)=>{if(!use(26))return;ST.cd=40;fxWord(a.h.x,a.h.y-14,'BZZZT!',1,'#d8e4ff',true);
   for(let k=0;k<3;k++){const o={x:a.h.x,y:a.h.y,vx:a.dx*1.6+(R()-.5),vy:a.dy*1.6+(R()-.5),life:260+k*20};
     ACT.push(()=>{o.vx+=(mouse.wx-o.x)*.0015+(R()-.5)*.15;o.vy+=(mouse.wy-o.y)*.0015+(R()-.5)*.15;o.vx*=.97;o.vy*=.97;o.x+=o.vx;o.y+=o.vy;
       for(let q2=0;q2<3;q2++){const an=R()*6.283;spawn(o.x+Math.cos(an)*3,o.y+Math.sin(an)*3,(R()-.5)*.4,(R()-.5)*.4,R()<.5?rgb(240,245,255):rgb(150,190,255),6,0,1,0,1);}flash(o.x,o.y,10,[150,190,255],2);
       if(ST.frame%10===0){const e=nearestEnemy(o.x,o.y,48);if(e){zap(o.x,o.y,e.x,e.y,[245,248,255],[150,190,255]);hitEnemy(e,9,0,0);}else if(R()<.3){const an=R()*6.283;zap(o.x,o.y,o.x+Math.cos(an)*20,o.y+Math.sin(an)*20,[235,240,255],[140,180,255]);}}
       const X=o.x|0,Y=o.y|0;if(X>=0&&X<W&&Y>=0&&Y<H){const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){explode(X,Y,6,{col:[150,190,255]});return false;}}
       if(--o.life<=0){explode(o.x|0,o.y|0,5,{col:[150,190,255],quiet:true});return false;}return true;});}}},
 {n:'Conductor Strike',fn:(a,p,use)=>{if(!use(30))return;ST.cd=45;lightningStrike(mouse.wx,mouse.wy,8);
   let sx=mouse.wx|0,sy=mouse.wy|0;while(sy<H-1&&(t[sy*W+sx]===0||KIND[t[sy*W+sx]]===G||KIND[t[sy*W+sx]]===F))sy++;
   const COND=m=>m===WATER||m===STEEL||m===ACID;const seen=new Set(),qq=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const i=(sy+dy)*W+sx+dx;if(i>=0&&i<N&&COND(t[i])){seen.add(i);qq.push(i);}}
   for(let h=0;h<qq.length&&qq.length<5000;h++){const i=qq[h];for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<N&&!seen.has(j)&&COND(t[j])){seen.add(j);qq.push(j);}}
   for(let k=0;k<Math.min(90,qq.length);k++){const i=qq[R()*qq.length|0];spawn(i%W,(i/W)|0,(R()-.5)*1.5,-R()*1.5,R()<.5?rgb(240,245,255):rgb(150,190,255),14,0,1,0,1);}
   for(const e of enemies){let hit=false;for(let dy=-e.def.h/2-1;dy<=e.def.h/2+1&&!hit;dy+=2)for(let dx=-e.def.w/2-1;dx<=e.def.w/2+1;dx+=2)if(seen.has(((e.y+dy)|0)*W+((e.x+dx)|0))){hit=true;break;}
     if(hit){hitEnemy(e,35,0,-2);e.frozen=Math.max(e.frozen||0,50);zap(sx,sy,e.x,e.y,[245,248,255],[150,190,255]);}}
   if(qq.length>20)fxWord(sx,sy-20,'KZZZRRT!',1.2,'#d8e4ff',true);}},
 {n:'Tornado',fn:(a,p,use)=>{if(!use(40))return;ST.cd=60;let tx=mouse.wx,life=380;fxWord(tx,mouse.wy-50,'WHOOOOSH!',1.4,'#d8e4ff',true);
   ACT.push(()=>{tx+=Math.sign(mouse.wx-tx)*Math.min(.9,Math.abs(mouse.wx-tx)*.02);let gy=groundBelow(tx|0,mouse.wy+45);
     const top=gy-90;
     for(let n=0;n<14;n++){const h=R(),y=gy-h*90,w=5+h*22,an=ST.frame*.3+R()*6.283;spawn(tx+Math.cos(an)*w,y,-Math.sin(an)*2.5,-1.2-R(),R()<.6?rgb(200,205,215):rgb(150,155,170),14,0,0,0,1);}
     for(let n=0;n<240;n++){const h=R(),y=(gy-h*90)|0,w=5+h*22,x=(tx+(R()*2-1)*w)|0;if(x<1||x>=W-1||y<1||y>=H-1)continue;const i=y*W+x,m=t[i];if(!m)continue;
       if(KIND[m]===P||KIND[m]===L){const an=R()*6.283;spawn(x,y,(tx-x)*.08+Math.cos(an)*2,-2-R()*2,col[i],60,m,0);t[i]=0;wake(i);}
       else if(KIND[m]===S&&m!==STEEL&&R()<.04/(1+HARD[m])){spawn(x,y,(R()-.5)*3,-2-R()*2,col[i],70,RUBBLE,0);t[i]=0;markDirty(i);wake(i);}}
     for(let n=0;n<ST.np;n++){const dx=tx-px[n],dy=py[n]-gy;if(dy<4&&dy>-110&&Math.abs(dx)<34){pvx[n]+=dx*.012-dy*.004*Math.sign(dx);pvy[n]-=.32;}}
     for(const b of bodies){if(b.held)continue;const dx=tx-b.x;if(Math.abs(dx)<40&&b.y>top-20&&b.y<gy+10){b.vx+=dx*.01;b.vy-=.55;b.va+=.01;}}
     for(const e of enemies){const dx=tx-e.x;if(Math.abs(dx)<34&&e.y>top-20&&e.y<gy+10){e.vx+=dx*.04+(R()-.5);e.vy-=.6;hitEnemy(e,.5,0,0);}}
     ST.shake=Math.max(ST.shake,1.5);return--life>0;});}},
 {n:'Gale Force',fn:(a,p,use)=>{if(!use(.6))return;const cx=a.h.x,cy=a.h.y,R0=130;
   for(let n=0;n<ST.np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<R0&&(dx*a.dx+dy*a.dy)/(d||1)>.6){pvx[n]+=a.dx*.7;pvy[n]+=a.dy*.7;}}
   for(let n=0;n<220;n++){const d=R()*R0,t2=Math.atan2(a.dy,a.dx)+(R()-.5)*.8,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if((KIND[m]===P||KIND[m]===L||KIND[m]===G||KIND[m]===F)&&R()<.5){spawn(X,Y,a.dx*5,a.dy*5-.5,col[i],50,KIND[m]===P||KIND[m]===L?m:0,0,KIND[m]===P||KIND[m]===L?1:0);t[i]=0;wake(i);}}
   for(const b of bodies){if(b.held)continue;const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*.35;b.vy+=a.dy*.35-.2;}}
   for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0&&(dx*a.dx+dy*a.dy)/d>.6){e.vx+=a.dx*.9;e.vy+=a.dy*.9;hitEnemy(e,.3,0,0);}}
   for(let k=0;k<5;k++){const an=Math.atan2(a.dy,a.dx)+(R()-.5)*.6;spawn(cx,cy,Math.cos(an)*(6+R()*3),Math.sin(an)*(6+R()*3),rgb(225,232,245),12,0,0,0);}
   if(ST.frame%24===0)fxWord(cx+a.dx*40,cy-10,'FWOOOSH!',.9,'#d8e4ff',true);}},
 {n:'Hailstorm',fn:(a,p,use)=>{if(!use(40))return;ST.cd=70;const cx=mouse.wx;let k=0;fxWord(cx,ST.camY+30,'KRAK-KRAK-KRAK!',1.2,'#d8e4ff',true);
   ACT.push(()=>{for(let n=0;n<3;n++)shots.push({x:cx+(R()-.5)*130,y:ST.camY-6,vx:(R()-.5)*.6,vy:4+R()*2,type:'hail',life:200,col:[220,240,255],grav:.08,
       onHit:sh=>{iceAt(sh.x,sh.y-1);if(R()<.5)iceAt(sh.x+(R()<.5?-1:1),sh.y-1);const X=sh.x|0,Y=sh.y|0;if(X>=0&&X<W&&Y>=0&&Y<H&&KIND[t[Y*W+X]]===S&&t[Y*W+X]!==ICE&&R()<.5){spawn(X,Y,(R()-.5)*2,-1.5,col[Y*W+X],50,RUBBLE,0);setc(Y*W+X,EMPTY);}
         damageEnemies(sh.x,sh.y,4,7,0,1);for(const e of enemies)if(Math.hypot(e.x-sh.x,e.y-sh.y)<5)e.frozen=Math.max(e.frozen||0,20);}});
     for(let n=0;n<6;n++)spawn(cx+(R()-.5)*200,ST.camY+R()*8,(R()-.5)*.4,.1,R()<.5?rgb(70,74,90):rgb(50,52,64),30,0,0,0,1);
     return++k<200;});}},
 {n:'Flash Flood',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;const cx=mouse.wx;let k=0;fxWord(cx,ST.camY+30,'SHHHHHHH',1.1,'#d8e4ff',true);
   ACT.push(()=>{for(let n=0;n<16;n++)spawn(cx+(R()-.5)*150,ST.camY-4,(R()-.5)*.4,3.5+R()*1.5,rgb(110,150,230),220,WATER,0,1);
     for(let n=0;n<5;n++)spawn(cx+(R()-.5)*190,ST.camY+R()*10,(R()-.5)*.3,.05,R()<.5?rgb(60,64,82):rgb(44,46,60),40,0,0,0,1);
     if(k%60===30)zap(cx+(R()-.5)*120,ST.camY,cx+(R()-.5)*120,ST.camY+40+R()*40,[240,245,255],[150,190,255]);return++k<240;});}},
 {n:'Lightning Rider',fn:(a,p,use)=>{if(!use(30))return;ST.cd=40;const x0=p.x,y0=p.y;let lx=x0,ly=y0;const dx=mouse.wx-x0,dy=mouse.wy-y0,d=Math.max(1,Math.hypot(dx,dy));
   for(let k=1;k<=d;k++){const x=x0+dx*k/d,y=y0+dy*k/d;if(boxHit(x,y))break;lx=x;ly=y;}
   for(let k=0;k<3;k++)zap(x0,y0-ST.PH/2,lx,ly-ST.PH/2,[245,248,255],[150,190,255]);damageLine(x0,y0-ST.PH/2,lx,ly-ST.PH/2,10,40);
   for(let k=0;k<12;k++){const f=R(),X=x0+(lx-x0)*f|0,Y=y0-ST.PH/2+(ly-y0)*f|0;if(X>=0&&X<W&&Y>=0&&Y<H&&FLAM[t[Y*W+X]]>0)ignite(Y*W+X);}
   p.x=lx;p.y=ly;p.vx=dx/d*3;p.vy=dy/d*3;if(!p.fly&&ST.CH.fly)toggleFly(true);flash(lx,ly-ST.PH/2,40,[150,190,255],8);fxWord(lx,ly-ST.PH-6,'KRAKOOOM!',1.3,'#d8e4ff',true);ST.shake+=8;}},
 {n:'Blizzard',fn:(a,p,use)=>{if(!use(40))return;ST.cd=70;const cx=mouse.wx,cy=mouse.wy,r=75,dir=p.face;let k=0;fxWord(cx,cy-40,'WHHOOOOO!',1.3,'#d8e4ff',true);
   ACT.push(()=>{for(let q2=0;q2<14;q2++)spawn(cx-dir*r+(R()-.5)*30,cy+(R()-.5)*r*1.6,dir*(3+R()*3),(R()-.5)*.8,R()<.7?rgb(240,246,255):rgb(200,215,235),40,R()<.03?ICE:0,0,0);
     for(let q2=0;q2<120;q2++){const X=cx+(R()-.5)*r*2|0,Y=cy+(R()-.5)*r*2|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(m===WATER&&R()<.3)setc(i,ICE);else if(KIND[m]===F)setc(i,EMPTY);}
     for(const e of enemies)if(Math.abs(e.x-cx)<r&&Math.abs(e.y-cy)<r){e.frozen=Math.max(e.frozen||0,15);e.vx+=dir*.2;hitEnemy(e,.4,0,0);}
     for(let n=0;n<ST.np;n++)if(Math.abs(px[n]-cx)<r&&Math.abs(py[n]-cy)<r)pvx[n]+=dir*.25;
     return++k<300;});}},
 // a column of air slams straight down: flyers are driven into the ground, fire and smoke blown out
 {n:'Downburst',fn:(a,p,use)=>{if(!use(30))return;ST.cd=50;const cx=mouse.wx,w=42;let k=0;fxWord(cx,ST.camY+40,'FWOOOOMP!',1.3,'#d8e4ff',true);
   ACT.push(()=>{k++;const top=ST.camY-10,gy=surfaceY(cx,ST.camY,VH+80);
     for(let n=0;n<12;n++)spawn(cx+(R()-.5)*w*2,top+R()*(gy-top),(R()-.5)*.3,6+R()*3,R()<.6?rgb(220,230,245):rgb(180,195,220),10,0,0,0);
     for(let n=0;n<ST.np;n++)if(Math.abs(px[n]-cx)<w&&py[n]<gy&&py[n]>top)pvy[n]+=.9;
     for(let n=0;n<220;n++){const X=cx+(R()-.5)*w*2|0,Y=top+R()*(gy-top+4)|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;
       if(KIND[m]===G||KIND[m]===F){t[i]=0;wake(i);}else if((KIND[m]===P||KIND[m]===L)&&R()<.3){spawn(X,Y,(R()-.5)*.6,4+R()*2,col[i],60,m,0);t[i]=0;wake(i);}}
     for(const e of enemies){if(e.grabbed||Math.abs(e.x-cx)>w+e.def.w/2||e.y>gy)continue;e.vy+=e.def.title?.3:1.3;e.vx*=.9;e.thrownT=Math.max(e.thrownT||0,4);hitEnemy(e,.25,0,0);}
     for(const b of bodies){if(b.held||Math.abs(b.x-cx)>w+b.rmax)continue;b.vy+=.7;b.rest=0;}
     if(k%6===0){for(let n=0;n<16;n++){const d=R()<.5?-1:1;spawn(cx+d*R()*w,gy-1,d*(2+R()*3),-R()*1.2,rgb(170,160,140),24,0,0,0,1);}ST.shake=Math.max(ST.shake,3);}
     sndLoop('downburst','wind',cx,(top+gy)/2,{v:1});return k<120;});}},
 // a dome of scorching air: dries water to steam, melts ice and snow, sets anything dry alight
 {n:'Heat Wave',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;const cx=mouse.wx,cy=mouse.wy,r=72;let k=0;ST.heatZ={x:cx,y:cy,r,life:260};fxWord(cx,cy-r-6,'SCORCHER!',1.3,'#ffb340',true);snd('fireburst',cx,cy);
   ACT.push(()=>{k++;for(let n=0;n<280;n++){const an=R()*6.283,d=Math.sqrt(R())*r,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];
       if(m===WATER){if(R()<.06)setc(i,STEAM);}else if(m===ICE||m===SNOW){if(R()<.18)setc(i,WATER);}else if(FLAM[m]>0&&R()<.015)ignite(i);else if(m===SAND&&R()<.0008)setc(i,GLASS);}
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+e.def.w/2){hitEnemy(e,.4,0,0);if(e.frozen&&!e.emp)e.frozen=0;if(ST.frame%5===0)spawn(e.x,e.y-e.def.h/2,(R()-.5),-1,rgb(255,150,60),14,0,1,0,1);}
     for(let n=0;n<5;n++){const an=R()*6.283,d=Math.sqrt(R())*r;spawn(cx+Math.cos(an)*d,cy+Math.sin(an)*d,(R()-.5)*.2,-.4-R()*.5,R()<.5?rgb(255,160,70):rgb(255,110,40),24,0,1,0,1);}
     if(k%3===0)flash(cx,cy,r*1.1,[255,110,30],3);if(ST.heatZ)ST.heatZ.life=260-k;
     if(k>=260){ST.heatZ=null;return false;}return true;});}},
 // a downpour over the cursor: everything there is soaked (and conducts her lightning: ELECTROCUTED)
 {n:'Monsoon',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const cx=mouse.wx,cy=mouse.wy,r=110*ST.aoeC;let k=0;fxWord(cx,ST.camY+30,'MONSOON!',1.1,'#d8e4ff',true);snd('splash',cx,cy,{v:.6});
   ACT.push(()=>{k++;for(let j=0;j<8;j++)spawn(cx+(R()-.5)*r*2,ST.camY-2,-.3,3.6+R(),rgb(120,150,220),80,0,0,1);if(k%3===0){const X=cx+(R()-.5)*r*2|0,Y=Math.max(1,ST.camY+4|0);if(X>0&&X<W&&Y<H&&t[Y*W+X]===0)setc(Y*W+X,WATER);}
     for(const e of enemies)if(Math.abs(e.x-cx)<r&&e.y>ST.camY)applyStatus(e,'wet',600);return k<150;});}},
 // she draws a fog bank around herself: enemies lose sight of her and everything in it is wet
 {n:'Fog Bank',fn:(a,p,use)=>{if(!use(20))return;ST.cd=60;p.stealth=360;p.lastSeen={x:p.x+(R()-.5)*120,y:p.y-8};let k=0;fxWord(p.x,p.y-ST.PH-8,'*HSSSSS*',.9,'#d8e4ff',true);
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2;for(let j=0;j<5;j++)spawnFlake(cx+(R()-.5)*160,cy+(R()-.5)*80,(R()-.5)*.2,(R()-.5)*.1,rgb(200,206,214),80,0);for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<110)applyStatus(e,'wet',200);return k<360;});}},
 {n:'Waterspout',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const cx=mouse.wx,gy=groundBelow(mouse.wx|0,mouse.wy),h=90;let k=0;fxWord(cx,gy-h-6,'WATERSPOUT!',1,'#bfe3ff',true);
    ACT.push(()=>{k++;for(let j=0;j<6;j++){const yy=gy-R()*h,w=4+(gy-yy)*.12;spawn(cx+(R()-.5)*w*2,yy,(R()-.5)*.5,-1.5-R(),R()<.6?rgb(120,170,240):rgb(220,235,255),16,0,0,0,1);}
      for(const e of enemies)if(Math.abs(e.x-cx)<16+e.def.w/2&&e.y>gy-h-20&&e.y<gy+4){applyStatus(e,'wet',300);if(!e.def.titan){e.vy=Math.min(e.vy,-1.6);e.vx+=(cx-e.x)*.05+Math.sin(k*.3)*.6;}if(k%12===0)hitEnemy(e,5,0,0);}
      if(k<120)return true;for(let j=0;j<50;j++){const X=cx+(R()-.5)*30|0,Y=gy-h+R()*20|0;if(X>=0&&X<W&&Y>=0&&Y<H&&!t[Y*W+X])setc(Y*W+X,WATER);}return false;});}},
 {n:'Eye of the Storm',ult:true,fn:(a,p,use)=>{if(p.eye>0||!use(40))return;p.eye=420;ST.cd=50;fxWord(p.x,p.y-ST.PH-10,'THE EYE!',1.3,'#d8e4ff',true);fxBurst(p.x,p.y-ST.PH/2,50,'#d8e4ff');
   ACT.push(()=>{if(pl_.eye<=0||ST.CH.id!=='storm')return false;const cx=pl_.x,cy=pl_.y-ST.PH/2;
     for(let n=0;n<ST.np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<70&&d>4){pvx[n]+=-dy/d*.5+(28-d)*dx/d*.01;pvy[n]+=dx/d*.5+(28-d)*dy/d*.01-.05;}}
     for(let q2=0;q2<5;q2++){const an=ST.frame*.25+q2*1.25;spawn(cx+Math.cos(an)*28,cy+Math.sin(an)*14,-Math.sin(an)*2,Math.cos(an),R()<.5?rgb(225,232,245):rgb(170,180,200),10,0,0,0);}
     for(let n=0;n<40;n++){const an=R()*6.283,d=20+R()*30,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(KIND[m]===P&&R()<.2){spawn(X,Y,-Math.sin(an)*2,Math.cos(an)*2,col[i],80,m,0,0,0);t[i]=0;wake(i);}}
     if(ST.frame%14===0){const e=nearestEnemy(cx,cy,100);if(e){zap(cx,cy,e.x,e.y,[245,248,255],[150,190,255]);hitEnemy(e,14,0,0);flash(e.x,e.y,14,[150,190,255],3);}}
     return true;});}}
];




// roster entry (CHARS in heroes/index.js)
export const CHAR_STORM={id:'storm',name:'Storm',pw:7,ph:19,fly:true,fs:3.2,boost:2.2,run:1.9,jump:4.6,hp:330,armor:.75,glow:[210,230,255],cape:null,thrust:()=>R()<.6?rgb(225,235,255):rgb(160,190,255),powers:STORM_POWERS};
