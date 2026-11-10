// Wave 5 newcomers (2026-10-21): Thanos (playable: the Infinity Stones), Hela (necroswords that cut,
// the dead at her call), Moon Knight (crescents and the moon's light), Shang-Chi (the Ten Rings and kung fu).
// Every kit ends with an ultimate (pw.ult: G or the meter, heroes/abilities.js).
import { ARTS } from '../art/index.js';
import { ST } from '../state.js';
import { EMPTY, GLASS, KIND, OBSID, R, S, SAND, STONE, rgb } from '../world/materials.js';
import { H, W, col, markDirty, setc, t } from '../world/grid.js';
import { bodies, pin, q } from '../world/support.js';
import { finishBody, makeBody } from '../world/bodies.js';
import { spawn, spawnFlake } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import '../render/rig.js'; // kept for evaluation order
import { snd } from '../sfx.js';
import { beamCore, quake, scriptMove, shots, zap } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageCone, damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { nearestN } from './kitlib.js';
import { TK } from '../render/titan.js';
import { drawSprite } from '../render/sprites.js';
import { pix } from '../render/canvas.js';
import { atCursor, bodyImpact, boxE, noTarget, segD } from './kitlib.js';
import { fxEclipse, fxFlare, fxSigil } from '../render/vfxcore.js';

const ghostOf=(spr,pal,x,y,face,c)=>{ST.TG=c;drawSprite(x,y,0,face,true,spr,pal);ST.TG=null;};
const melee=(p,r,dmg,kx,ky)=>{const x=p.x+p.face*(ST.PW/2+5),y=p.y-ST.PH/2;carve(x,y,r*.5,p.face*4,0);damageEnemies(x,y,r,dmg,p.face*kx,ky);p.punchF=8;return [x,y];};

// ================= THANOS =================
const STONE_C={power:[170,60,255],space:[60,140,255],reality:[255,40,50],soul:[255,150,30],time:[60,255,110],mind:[255,220,40]};
const sc=k=>STONE_C[k];
const lineP=(x0,y0,x1,y1,c,g)=>{const n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);for(let k=0;k<=n;k++)pix(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c,g);};
function drawFig(s,B,A){const x=s.x,y=s.y,f=s.face,o={},st=s.mv?Math.sin(s.t*.4)*3:0;TK.begin();TK.cap(x-2,y-9,x-2-st,y,1.7,1.3,B,o);TK.cap(x+2,y-9,x+2+st,y,1.7,1.3,B,o);TK.ell(x,y-14,4.2,6,B,o);TK.ell(x,y-22,2.8,3.2,A,o);TK.cap(x+f*2,y-17,x+f*7,y-13,1.4,1.1,B,o);TK.end();}
const TP=[200,100,255];
const THANOS_POWERS=[
 {n:'Titan Punch',fn:(a,p,use)=>{if(!use(5))return;ST.cd=14;const [x,y]=melee(p,14,30,7,-3);explode(x|0,y|0,6,{self:true,quiet:true,col:sc('power')});snd('punch',x,y,{v:.9});if(R()<.3)fxWord(x,y-10,'KNEEL.',.8,'#c88cff',true);}},
 {n:'Power Stone',kind:'hold',fn:(a,p,use)=>{if(!use(1))return;beamCore(a,{pow:260,rad:3,len:420,w:4+(ST.frame&1),c:[240,200,255],g:sc('power'),spark:()=>rgb(200,100,255),dmg:6});}},
 {n:'Space Stone',fn:(a,p,use)=>{if(!use(14))return;ST.cd=28;const tx=Math.max(8,Math.min(W-8,mouse.wx)),ty=mouse.wy+ST.PH/2;rings.push({x:p.x,y:p.y-8,r:16,vr:-1,life:12,c:sc('space')});p.x=tx;p.y=ty;carve(p.x,p.y-ST.PH/2,ST.PH*.7,0,0);p.vx=p.vy=0;
   rings.push({x:p.x,y:p.y-8,r:2,vr:3,life:14,c:sc('space')});damageEnemies(p.x,p.y-8,22,18,0,-2);snd('psi',p.x,p.y,{pitch:.5});}},
 // everything solid around the cursor becomes red crystal, then shatters
 {n:'Reality Stone',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const cx=mouse.wx|0,cy=mouse.wy|0,r=40*ST.aoeC|0;let k=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){t[i]=GLASS;col[i]=rgb(230+R()*25,40+R()*60,60+R()*60);}}
   fxWord(cx,cy-r-6,'REALITY IS OFTEN DISAPPOINTING',.9,'#ff5050',true);ACT.push(()=>{if(++k<40)return true;explode(cx,cy,r*.6|0,{self:true,col:sc('reality')});damageEnemies(cx,cy,r,40,0,-2);snd('glass',cx,cy,{size:2});return false;});}},
 {n:'Soul Stone',kind:'hold',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,90,3);if(!list.length)return;if(!use(.3))return;for(const e of list){hitEnemy(e,1.2,0,0);p.hp=Math.min(ST.CH.hp,p.hp+.25);if(ST.frame%2===0)beams.push({pts:[[a.h.x,a.h.y],[(a.h.x+e.x)/2+(R()-.5)*14,(a.h.y+e.y)/2],[e.x,e.y]],life:2,c:[255,220,160],g:sc('soul')});}}},
 // the Time Stone ages what's around the cursor: walls crumble to sand, enemies wither
 {n:'Time Stone',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=mouse.wx|0,cy=mouse.wy|0,r=36*ST.aoeC|0;rings.push({x:cx,y:cy,r,vr:-1,life:18,c:sc('time')});
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r||R()<.25)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){const c=col[i];setc(i,SAND);col[i]=c;}}
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r){applyStatus(e,'chill',160);hitEnemy(e,20,0,0);}fxWord(cx,cy-r-6,'DUST.',1,'#5cff7a',true);snd('crumble',cx,cy,{size:1.5});}},
 {n:'Mind Stone',fn:(a,p,use)=>{if(!use(20))return;ST.cd=45;const r=140*ST.aoeC;for(const e of enemies){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d>r||e.def.titan)continue;applyStatus(e,'stun',90);e.vx+=dx/d*4;e.vy-=1;}rings.push({x:p.x,y:p.y-10,r:8,vr:5,life:16,c:sc('mind')});fxWord(p.x,p.y-ST.PH-12,'FEAR ME.',1.1,'#ffd84a',true);}},
 // he tears a moon out of the sky and drops it on the cursor
 {n:'Moon Hurl',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;const r=14+R()*6|0,w=r*2+1,lm=new Uint8Array(w*w),lc=new Uint32Array(w*w);let n=0;for(let y=0;y<w;y++)for(let x=0;x<w;x++){if((x-r)**2+(y-r)**2>r*r)continue;lm[y*w+x]=STONE;const v=R()*20;lc[y*w+x]=rgb(120+v,110+v,130+v);n++;}
   const b=finishBody(lm,lc,w,w,r,r,mouse.wx-60,ST.camY-40,0,n,false);const d=Math.hypot(60,mouse.wy-ST.camY+40)||1;b.vx=60/d*9;b.vy=(mouse.wy-ST.camY+40)/d*9;b.va=.05;b.thrown=true;fxWord(mouse.wx,ST.camY+30,'I WILL SHRED THIS UNIVERSE',1,'#c88cff',true);}},
 {n:'Double-Edged Blade',fn:(a,p,use)=>{if(!use(9))return;ST.cd=16;const sw=(p.bladeN=(p.bladeN||0)+1)&1?.6:-.6,an=Math.atan2(a.dy,a.dx)+sw;clawSlice(a.h.x,a.h.y,Math.cos(an),Math.sin(an),56,1,0,{edge:[220,220,240],push:1.4,vx:a.dx*3,vy:a.dy*3});damageCone(a.h.x,a.h.y,a.dx,a.dy,56,24,4);snd('slash',a.h.x,a.h.y,{pitch:.7});}},
 // the Black Order answers: Corvus Glaive cuts in close, Proxima Midnight throws her spear from range
 {n:'Black Order',fn:(a,p,use)=>{if(summons.some(s=>s.order)||!use(34))return;ST.cd=90;fxWord(p.x,p.y-ST.PH-12,'MY CHILDREN',1.1,'#c88cff',true);
   for(const [i,kind] of [[-1,'corvus'],[1,'proxima']]){const x=p.x+i*20;summons.push({order:true,kind,x,y:groundBelow(x|0,p.y-20),face:p.face,cd:20,mv:false,life:600,
     upd(s){const e=nearestEnemy(s.x,s.y-12,280);s.mv=false;if(s.cd>0)s.cd--;if(!e){const tx=pl_.x+(s.kind==='corvus'?-24:24);if(Math.abs(tx-s.x)>6){s.x+=Math.sign(tx-s.x)*2;s.mv=true;}s.y=groundBelow(s.x|0,s.y-14);return;}s.face=e.x>s.x?1:-1;const dx=Math.abs(e.x-s.x);
       if(s.kind==='corvus'){if(dx>12){s.x+=s.face*(s.cd<=0&&dx<80?6:2.2);s.mv=true;}else if(s.cd<=0){s.cd=22;hitEnemy(e,18,s.face*4,-2);clawSlice(s.x,s.y-12,s.face,0,18,1,0,{edge:[200,220,255],quiet:true});}}
       else{if(dx<60){s.x-=s.face*1.8;s.mv=true;}else if(dx>140){s.x+=s.face*1.8;s.mv=true;}if(s.cd<=0){s.cd=45;const sx=s.x,sy=s.y-18,ddx=e.x-sx,ddy=e.y-sy,d=Math.hypot(ddx,ddy)||1;shots.push({x:sx,y:sy,vx:ddx/d*8,vy:ddy/d*8,type:'spear',life:60,col:[255,210,120],ecol:[255,210,120],boom:5});}}
       s.y=groundBelow(s.x|0,s.y-14);},
     draw(s){if(s.kind==='corvus'){drawFig(s,rgb(60,64,80),rgb(150,156,170));const f=s.face;lineP(s.x+f*7,s.y-13,s.x+f*9,s.y-30,rgb(40,40,48),rgb(40,40,48));lineP(s.x+f*9,s.y-30,s.x+f*13,s.y-36,rgb(210,230,255),rgb(120,160,255));}
       else{drawFig(s,rgb(40,44,56),rgb(90,70,110));const f=s.face;lineP(s.x+f*5,s.y-24,s.x+f*9,s.y-4,rgb(255,210,120),rgb(220,150,40));}}});}}},
 // nothing stops him for five seconds: he barely feels a hit, and every stride shakes the ground
 {n:'I Am Inevitable',fn:(a,p,use)=>{if(p.shell>0||!use(26))return;ST.cd=80;p.shell=300;fxWord(p.x,p.y-ST.PH-14,'I AM INEVITABLE.',1.2,'#c88cff',true);let k=0;
   ACT.push(()=>{k++;if(!(p.shell>0)||ST.CH.id!=='thanos')return false;if(k%3===0)spawn(p.x+(R()-.5)*14,p.y-R()*ST.PH,(R()-.5)*.6,-.8,rgb(200,100,255),14,0,1,0,1);
     if(p.ground&&Math.abs(p.vx)>.8&&k%18===0)quake(p.x,p.y,{r:18,col:TP});if(k%8===0)for(const e of enemies)if(Math.abs(e.x-p.x)<e.def.w/2+8&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+12)hitEnemy(e,10,(e.x-p.x)*.3,-2);return true;});}},
 // a titan's leap toward the cursor, landing in a purple shockwave
 {n:'Titan Leap',fn:(a,p,use)=>{if(!p.ground||!use(16))return;ST.cd=40;const dx=Math.max(-220,Math.min(220,mouse.wx-p.x));p.vx=dx/60;p.vy=-8.5;p.ground=false;p.slam=true;p.slamOpt={col:TP,r:40};fxWord(p.x,p.y-ST.PH-8,'HRRAAH!',1,'#c88cff',true);}},
 // he closes the gauntlet: everything around the cursor is crushed into one dense ball of matter that drops
 {n:'Gauntlet Crush',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx|0,cy=mouse.wy|0,r=28*ST.aoeC|0;let k=0,n=0;fxWord(cx,cy-r-8,'DREAD IT. RUN FROM IT.',.9,'#c88cff',true);snd('psi',cx,cy,{pitch:.4});
   ACT.push(()=>{k++;const rr=r*(1-k/30);rings.push({x:cx,y:cy,r:Math.max(2,rr),vr:0,life:2,c:TP});
     for(let j=0;j<60;j++){const an=R()*6.283,d=rr+R()*4,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){const c=col[i];setc(i,EMPTY);n++;spawn(X,Y,(cx-X)*.08,(cy-Y)*.08,c,12,0,0,0,1);}}
     for(const e of enemies){if(e.def.titan)continue;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;if(d<r+20){e.x+=dx/d*Math.min(4,d);e.y+=dy/d*Math.min(4,d);e.vx=e.vy=0;if(k%6===0)hitEnemy(e,6,0,0);}}
     if(k<30)return true;
     const br=Math.max(4,Math.min(12,Math.sqrt(n/3.14)*.6|0)),w=br*2+1,lm=new Uint8Array(w*w),lc=new Uint32Array(w*w);let m=0;
     for(let y=0;y<w;y++)for(let x=0;x<w;x++){if((x-br)**2+(y-br)**2>br*br)continue;lm[y*w+x]=STONE;lc[y*w+x]=rgb(70+R()*30,44+R()*20,96+R()*40);m++;}
     const b=finishBody(lm,lc,w,w,br,br,cx,cy,0,m,false);if(b){b.vy=1;b.thrown=true;bodyImpact(b,30,TP);}
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+10)hitEnemy(e,40,0,-3);flash(cx,cy,40,TP,10);snd('crumble',cx,cy,{size:2});return false;});}},
 // the Snap: half of everything that isn't a titan simply ends
 {n:'The Snap',ult:true,fn:(a,p,use)=>{ST.cd=200;flash(p.x,p.y,600,[255,255,255],30);ST.hitstop=Math.max(ST.hitstop,30);snd('boom',p.x,p.y,{size:2.5});fxWord(p.x,p.y-60,'*SNAP*',2.4,'#ffc93c',true);
   for(const e of enemies){if(Math.abs(e.x-p.x)>300||Math.abs(e.y-p.y)>200)continue;if(e.def.titan){hitEnemy(e,e.def.hp*.15,0,0);continue;}if(R()<.5){for(let k=0;k<12;k++)spawnFlake(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,.4+R()*.6,-.3,rgb(120,100,80),160,0);e.hp=0;}else hitEnemy(e,60,0,0);}}}
];
export const CHAR_THANOS={id:'thanos',name:'Thanos',pw:9,ph:23,fly:false,fs:2.2,boost:2,run:1.7,jump:5.2,hp:620,armor:.5,glow:[200,100,255],cape:null,thrust:()=>rgb(200,100,255),powers:THANOS_POWERS};

// ================= HELA =================
const NG=[120,255,160],NGE=[150,255,190];
function necroShot(x,y,vx,vy){let lx=x,ly=y;const s={x,y,vx,vy,type:'necro',life:70,col:NG,boom:4,ecol:NG};shots.push(s);ACT.push(()=>{if(!shots.includes(s))return false;sliceLine(lx,ly,s.x,s.y,{edge:NGE,quiet:true,push:1.2});lx=s.x;ly=s.y;return true;});}
function drawWolf(s){const x=s.x,y=s.y,f=s.face,o={},F=rgb(70,74,84),D=rgb(40,42,50);TK.begin();TK.ell(x,y-16,20,9,F,o);TK.ell(x+f*20,y-22,9,7,F,o);TK.cap(x+f*26,y-22,x+f*32,y-19,4,2,D,o);TK.cap(x-f*18,y-18,x-f*30,y-24,3,1,D,o);
  const st=Math.sin(s.t*.4)*5;for(const [lx,ph] of [[-12,0],[-6,1],[8,0],[14,1]])TK.cap(x+lx,y-12,x+lx+(ph?st:-st),y,3,2,D,o);TK.end();TK.glowDot(x+f*22,y-24,0,rgb(120,255,160));}
const HB=[];
function drawThrone(s){const x=s.x,y=s.y,o={},Kc=rgb(20,26,24);TK.begin();TK.cap(x-10,y-4,x-10,y-30,2.2,1.6,Kc,o);TK.cap(x+10,y-4,x+10,y-30,2.2,1.6,Kc,o);TK.poly([[x-12,y-27],[x,y-46],[x+12,y-27]],Kc,o);for(const d of [-1,1])TK.cap(x+d*10,y-29,x+d*20,y-48,2,.5,Kc,o);TK.end();TK.glowDot(x,y-34,0,rgb(120,255,160));}
const HELA_POWERS=[
 {n:'Necrosword Throw',fn:(a,p,use)=>{if(!use(5))return;ST.cd=10;necroShot(a.h.x,a.h.y,a.dx*9,a.dy*9);snd('whoosh',a.h.x,a.h.y,{pitch:1.4});}},
 {n:'Sword Fan',fn:(a,p,use)=>{if(!use(14))return;ST.cd=26;const an0=Math.atan2(a.dy,a.dx);for(let k=-2;k<=2;k++)necroShot(a.h.x,a.h.y,Math.cos(an0+k*.14)*8,Math.sin(an0+k*.14)*8);fxWord(p.x,p.y-ST.PH-8,'KNEEL!',.9,'#8dffb0',true);}},
 // black spikes erupt out of the ground in a line ahead of her, cutting and lifting
 {n:'Black Spike Field',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;const dir=a.dx<0?-1:1;let x=p.x+dir*10,k=0;
   ACT.push(()=>{k++;x+=dir*8;const gy=groundBelow(x|0,p.y-20),h=14+R()*16;sliceLine(x,gy+8,x+dir*3,gy-h,{edge:NGE,quiet:true,push:1.5});for(let y=0;y<h;y++){const w=Math.max(0,2-y/h*2.5|0);for(let xx=-w;xx<=w;xx++){const X=x+xx|0,Y=gy-1-y|0;if(X>=0&&X<W&&Y>=0&&Y<H&&t[Y*W+X]===0){setc(Y*W+X,OBSID);col[Y*W+X]=rgb(20,24,28);}}}
     damageEnemies(x,gy-h/2,10,16,dir*2,-6);if(k%2===0)snd('rip',x,gy,{v:.4});return k<18;});}},
 {n:'Antler Charge',fn:(a,p,use)=>{if(!use(12))return;ST.cd=26;const dx=a.dx,dy=a.dy;let k=0,lx=p.x,ly=p.y-ST.PH;
   ACT.push(()=>{k++;p.script=2;carve(p.x+dx*8,p.y-ST.PH/2+dy*8,7,dx*5,dy*5);scriptMove(p,dx*8,dy*8);for(const o of [-ST.PH+2,-4])sliceLine(lx,ly-o-ST.PH,p.x,p.y+o,{edge:NGE,quiet:true});lx=p.x;ly=p.y;damageEnemies(p.x,p.y-ST.PH/2,12,12,dx*6,dy*6);return k<14;});}},
 // her touch is death: the enemy rots from inside (burns, marked)
 {n:'Death Touch',fn:(a,p,use)=>{const e=nearestEnemy(p.x+p.face*10,p.y-ST.PH/2,30);if(!e)return;if(!use(10))return;ST.cd=24;applyStatus(e,'mark',360);applyStatus(e,'burn',360);hitEnemy(e,24,p.face*2,-1);fxWord(e.x,e.y-e.def.h/2-8,'ROT.',.9,'#8dffb0',true);for(let k=0;k<14;k++)spawn(e.x,e.y,(R()-.5)*2,-R()*2,rgb(80,200,110),24,0,1,0,1);}},
 // the Berserkers of Hel rise and march on the nearest enemies
 {n:'Berserker Legion',fn:(a,p,use)=>{if(!use(30))return;ST.cd=80;fxWord(p.x,p.y-ST.PH-10,'RISE, MY WARRIORS',1,'#8dffb0',true);for(let i=0;i<4;i++){const x=p.x+(i-1.5)*18,y=groundBelow(x|0,p.y-20);summons.push({x,y:y+16,rise:16,life:480,cd:0,face:p.face,
   upd(s){if(s.rise>0){s.rise--;s.y--;if(R()<.5)spawn(s.x,s.y,(R()-.5),-1,rgb(80,200,110),14,0,1,0,1);return;}const e=nearestEnemy(s.x,s.y-8,260);if(!e)return;s.face=e.x>s.x?1:-1;if(Math.abs(e.x-s.x)>10){s.x+=s.face*1.4;s.y=groundBelow(s.x|0,s.y-12);}else if(--s.cd<=0){s.cd=26;hitEnemy(e,14,s.face*3,-2);clawSlice(s.x,s.y-10,s.face,0,16,1,0,{edge:NGE,quiet:true});}},
   draw(s){ghostOf(ARTS.hela.spr,ARTS.hela.pal,s.x,s.y,s.face,[90,190,120]);}});}}},
 // Fenris, her wolf, comes running through everything in its way
 {n:'Fenris',fn:(a,p,use)=>{if(summons.some(s=>s.wolf)||!use(32))return;ST.cd=80;const dir=a.dx<0?-1:1;fxWord(p.x,p.y-ST.PH-10,'FENRIS!',1.1,'#8dffb0',true);snd('roar',p.x,p.y,{pitch:.7});
   summons.push({wolf:true,x:p.x-dir*40,y:p.y,face:dir,life:150,upd(s){s.x+=s.face*5;s.y=groundBelow(s.x|0,s.y-20);carve(s.x+s.face*20,s.y-16,12,s.face*5,-1,s.y);damageEnemies(s.x+s.face*16,s.y-16,20,10,s.face*6,-4);if(s.t%10===0)ST.shake=Math.max(ST.shake,4);},draw:drawWolf});}},
 // a ring of necroswords orbits her: it blocks shots and cuts what comes close
 {n:'Necro Shield',fn:(a,p,use)=>{if(p.nshield>0||!use(22))return;ST.cd=50;p.nshield=360;
   ACT.push(()=>{if(--p.nshield<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;for(let k=0;k<6;k++){const an=ST.frame*.12+k*1.047,x=cx+Math.cos(an)*20,y=cy+Math.sin(an)*20;spawn(x,y,0,0,rgb(120,255,160),3,0,1,0,0);if(ST.frame%6===k)sliceLine(cx+Math.cos(an)*14,cy+Math.sin(an)*14,x,y,{edge:NGE,quiet:true});}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<24){shots.splice(n,1);flash(s.x,s.y,6,NG,2);}}if(ST.frame%8===0)for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<24+e.def.w/2)hitEnemy(e,7,0,0);return true;});}},
 // a pillar of black blades punches up from under the cursor and throws what stands there into the air
 {n:'Hel Pillar',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;const cx=mouse.wx,gy=groundBelow(cx|0,mouse.wy);for(const o of [-10,10])sliceLine(cx+o,gy+30,cx+o*1.2,gy-40,{edge:NGE,quiet:true,push:1.6});
   const n0=solidCells(cx,gy+12,10,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n>16){const b=makeBody(q,n,false);if(b){b.vy=-8;b.thrown=true;}}damageEnemies(cx,gy-20,24,30,0,-9);fxWord(cx,gy-40,'FROM HEL!',1,'#8dffb0',true);}},
 // she raises a throne of black blades and sits: necroswords fly at anything near, and she heals while seated
 {n:'Throne of Hel',fn:(a,p,use)=>{if(p.throne>0||!use(24))return;ST.cd=60;p.throne=360;fxWord(p.x,p.y-ST.PH-12,'BOW TO YOUR QUEEN',1,'#8dffb0',true);
   summons.push({x:p.x,y:p.y,life:360,upd(s){if(!(pl_.throne>0)||ST.CH.id!=='hela')return false;pl_.throne--;if(Math.abs(pl_.x-s.x)>16||Math.abs(pl_.y-s.y)>16){pl_.throne=0;return false;}
     pl_.hp=Math.min(ST.CH.hp,pl_.hp+.35);if(s.t%12===0){const e=nearestEnemy(s.x,s.y-20,280);if(e){const sx=s.x+(R()-.5)*30,sy=s.y-40-R()*10,dx=e.x-sx,dy=e.y-sy,d=Math.hypot(dx,dy)||1;necroShot(sx,sy,dx/d*9,dy/d*9);}}},end(){pl_.throne=0;},draw:drawThrone});}},
 // throw six blades that stay where they hit; use it again and they all tear back to her through everything
 {n:'Blades of Hel',fn:(a,p,use)=>{
   if(HB.length){if(!use(10))return;ST.cd=30;fxWord(p.x,p.y-ST.PH-10,'RETURN TO ME',.9,'#8dffb0',true);snd('whoosh',p.x,p.y,{pitch:.7});
     for(const b of HB.splice(0)){const hit=new Set();let k=0;ACT.push(()=>{k++;const dx=pl_.x-b.x,dy=pl_.y-ST.PH/2-b.y,d=Math.hypot(dx,dy)||1,st=Math.min(11,d),nx=b.x+dx/d*st,ny=b.y+dy/d*st;
       sliceLine(b.x,b.y,nx,ny,{edge:NGE,quiet:true,push:1.3});for(const e of enemies)if(!hit.has(e)&&segD(e.x,e.y,b.x,b.y,nx,ny)<e.def.w/2+3){hit.add(e);hitEnemy(e,26,dx/d*3,dy/d*3);}
       b.x=nx;b.y=ny;beams.push({x0:b.x-dx/d*8,y0:b.y-dy/d*8,x1:b.x,y1:b.y,life:2,w:0,c:[200,255,220],g:NG});return d>10&&k<90;});}return;}
   if(!use(16))return;ST.cd=24;const an0=Math.atan2(a.dy,a.dx);
   for(let j=0;j<6;j++){const an=an0+(j-2.5)*.09,b={x:a.h.x,y:a.h.y,ang:an,vx:Math.cos(an)*9,vy:Math.sin(an)*9},hit=new Set();let k=0,stuck=false;
     ACT.push(()=>{k++;for(let s=0;s<9;s++){b.x+=b.vx/9;b.y+=b.vy/9;const X=b.x|0,Y=b.y|0;if(X<1||X>=W-1||Y>=H-2)return false;if(Y>=0&&KIND[t[Y*W+X]]===S){stuck=true;break;}}
       for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-b.x)<e.def.w/2+2&&Math.abs(e.y-b.y)<e.def.h/2+2){hit.add(e);hitEnemy(e,14,b.vx*.3,b.vy*.3);}
       beams.push({x0:b.x-Math.cos(an)*7,y0:b.y-Math.sin(an)*7,x1:b.x,y1:b.y,life:1,w:0,c:[200,255,220],g:NG});if(stuck||k>40){if(HB.length<24)HB.push(b);return false;}return true;});}
   if(!summons.some(s=>s.hb))summons.push({hb:true,x:0,y:0,life:1e9,upd(){if(ST.CH.id!=='hela'){HB.length=0;return false;}},draw(){for(const b of HB){const c=Math.cos(b.ang),s=Math.sin(b.ang);for(let k=-7;k<=2;k++)pix(b.x+c*k,b.y+s*k,k>0?rgb(30,40,36):rgb(150,255,190),rgb(60,200,110));}}});}},
 // she closes her hand on the enemy at the cursor (as she did on Mjolnir): held, squeezed, shattered
 {n:'Crushing Grip',fn:(a,p,use)=>{const e=atCursor(60);if(!e){noTarget('#8dffb0');return;}if(!use(22))return;ST.cd=45;const hx=e.x,hy=e.y-6;let k=0;fxWord(e.x,e.y-e.def.h/2-10,'YOU HAVE NO IDEA WHAT I AM',.8,'#8dffb0',true);
   ACT.push(()=>{k++;if(e.hp<=0)return false;if(!e.def.titan){e.x+=(hx-e.x)*.2;e.y+=(hy-e.y)*.2;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);}const h=hand();if(k%2===0)beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2,(h.y+e.y)/2+(R()-.5)*8],[e.x,e.y]],life:2,c:NGE,g:NG});
     const an=k*.4,r=Math.max(3,e.def.w*.8-k*.3);spawn(e.x+Math.cos(an)*r,e.y+Math.sin(an)*r,0,0,rgb(120,255,160),4,0,1,0,0);
     if(k>=40){hitEnemy(e,e.def.titan?60:55,0,-2);for(let j=0;j<16;j++){const b=R()*6.283;spawn(e.x,e.y,Math.cos(b)*3,Math.sin(b)*3,rgb(150,255,190),20,0,1,1);}explode(e.x|0,e.y|0,8,{self:true,col:NG});fxWord(e.x,e.y-e.def.h/2-6,'*CRUNCH*',1,'#8dffb0',true);snd('glass',e.x,e.y);return false;}return true;});}},
 // a great necro-javelin: the first enemy it hits is carried along and pinned to the next wall
 {n:'Impaler',fn:(a,p,use)=>{if(!use(18))return;ST.cd=36;let x=a.h.x,y=a.h.y,k=0,e=null;const vx=a.dx*11,vy=a.dy*11;snd('whoosh',x,y,{pitch:.8});
   ACT.push(()=>{k++;let wall=false;for(let s=0;s<11;s++){x+=vx/11;y+=vy/11;if(x<1||x>=W-1||y>=H-2){wall=true;break;}if(y>=0&&KIND[t[(y|0)*W+(x|0)]]===S){wall=true;break;}if(!e){const o=boxE(x,y,2);if(o&&!o.def.titan)e=o;else if(o){hitEnemy(o,40,0,0);wall=true;break;}}}
     beams.push({x0:x-vx*1.4,y0:y-vy*1.4,x1:x,y1:y,life:2,w:1,c:[30,40,36],g:NG});if(e){e.x=x;e.y=y;e.vx=e.vy=0;}
     if(!wall&&k<=40)return true;
     for(let j=0;j<8;j++){const b=j/8*6.283;sliceLine(x,y,x+Math.cos(b)*16,y+Math.sin(b)*16,{edge:NGE,quiet:true});}snd('rip',x,y);
     if(e){hitEnemy(e,36,0,0);const pe=e,px=x,py=y;let m=0;fxWord(x,y-14,'PINNED.',.9,'#8dffb0',true);ACT.push(()=>{m++;if(pe.hp<=0)return false;pe.x=px;pe.y=py;pe.vx=pe.vy=0;pe.frozen=Math.max(pe.frozen||0,2);if(m%20===0)hitEnemy(pe,5,0,0);return m<180;});}
     else damageEnemies(x,y,18,20,0,-3);return false;});}},
 // Ragnarok: necroswords burst out of the ground across the whole view
 {n:'Sea of Swords',ult:true,fn:(a,p,use)=>{ST.cd=200;fxWord(p.x,p.y-60,'I AM HELA, GODDESS OF DEATH',1.4,'#8dffb0',true);let k=0;
   ACT.push(()=>{k++;for(let j=0;j<4;j++){const x=ST.camX+R()*480,gy=groundBelow(x|0,ST.camY+200),h=20+R()*40;sliceLine(x,gy+10,x+(R()-.5)*10,gy-h,{edge:NGE,quiet:true,push:1.6});damageEnemies(x,gy-h/2,12,18,0,-6);for(let s=0;s<3;s++)spawn(x,gy-R()*h,(R()-.5),-1,rgb(120,255,160),12,0,1,0,1);}ST.shake=Math.max(ST.shake,6);return k<60;});}}
];
export const CHAR_HELA={id:'hela',name:'Hela',pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2,jump:5.2,hp:400,armor:.65,glow:NG,cape:null,thrust:()=>rgb(120,255,160),powers:HELA_POWERS};

// ================= MOON KNIGHT =================
const ML=[220,232,255];
function crescent(x,y,vx,vy,back){let k=0;const s={x,y,vx,vy,type:'crescent',life:80,col:ML,boom:4,ecol:ML};shots.push(s);if(back)ACT.push(()=>{if(!shots.includes(s))return false;k++;if(k>22){const dx=pl_.x-s.x,dy=pl_.y-8-s.y,d=Math.hypot(dx,dy)||1;s.vx+=dx/d*.7;s.vy+=dy/d*.7;if(d<8){shots.splice(shots.indexOf(s),1);return false;}}return true;});}
function drawKhonshu(s){const x=s.x,y=s.y,o={},Wc=rgb(230,232,240),G=rgb(150,156,170);TK.begin();TK.cap(x-14,y-40,x-16,y,8,6,G,o);TK.cap(x+14,y-40,x+16,y,8,6,G,o);TK.ell(x,y-80,30,44,Wc,o);
  TK.ell(x,y-140,18,20,Wc,o);TK.cap(x+12,y-140,x+44,y-132,6,2,Wc,o);for(const d of [-1,1])TK.cap(x+d*26,y-110,x+d*50,y-60+Math.sin(s.t*.2)*6,7,5,Wc,o);TK.end();TK.glowDot(x+6,y-144,1,rgb(210,230,255));}
function drawCopter(s){const x=s.x,y=s.y,o={},Wc=rgb(230,232,240),G=rgb(140,146,160),r=Math.cos(s.t*.9)*18;TK.begin();TK.ell(x,y,12,6,Wc,o);TK.cap(x-10,y-1,x-26,y-3,3,1.5,G,o);TK.cap(x-26,y-3,x-27,y-9,1.5,1.5,G,o);TK.cap(x,y-6,x,y-9,1,1,G,o);TK.cap(x-r,y-10,x+r,y-10,1,1,G,o);TK.ell(x+6,y-1,5,3,rgb(120,150,200),o);TK.end();TK.glowDot(x+2,y+6,0,rgb(220,232,255));}
const MOON_POWERS=[
 {n:'Crescent Darts',fn:(a,p,use)=>{if(!use(4))return;ST.cd=10;const an=Math.atan2(a.dy,a.dx);for(const o of [-.1,0,.1])crescent(a.h.x,a.h.y,Math.cos(an+o)*7,Math.sin(an+o)*7,true);snd('whoosh',a.h.x,a.h.y,{pitch:1.6});}},
 {n:'Truncheon Combo',fn:(a,p,use)=>{if(!use(6))return;ST.cd=14;const hit=(p.tcN=(p.tcN||0)+1)%3===0;melee(p,12,hit?26:14,hit?6:2,hit?-4:-1);if(hit){for(const e of nearestN(p.x+p.face*10,p.y-8,22,3))applyStatus(e,'stun',40);fxWord(p.x+p.face*12,p.y-ST.PH-4,'CRACK!',.8,'#dce6ff',true);}snd('punch',p.x,p.y,{v:.7});}},
 // the ankh line: zip to the cursor, cape spread
 {n:'Ankh Grapple',fn:(a,p,use)=>{if(!use(7))return;ST.cd=14;const tx=mouse.wx,ty=mouse.wy;let k=0;ACT.push(()=>{k++;p.script=2;const h=hand();beams.push({x0:h.x,y0:h.y,x1:tx,y1:ty,life:1,w:0,c:[230,232,240],g:[160,170,190]});const dx=tx-p.x,dy=ty-(p.y-ST.PH/2),d=Math.hypot(dx,dy)||1;if(d<10||k>40){p.vx=dx/d*3;p.vy=-2;return false;}scriptMove(p,dx/d*Math.min(9,d),dy/d*Math.min(9,d));return true;});}},
 // hold: the moon's light comes down on the cursor in a column
 {n:"Moonlight Gaze",kind:'hold',fn:(a,p,use)=>{if(!use(1))return;const tx=mouse.wx,top=ST.camY-10,gy=groundBelow(tx|0,mouse.wy);beamCore({h:{x:tx,y:top},dx:0,dy:1,d:1},{pow:160,rad:3,len:Math.max(10,gy-top+12),w:4,c:[240,244,255],g:[150,170,230],spark:()=>rgb(220,230,255),dmg:4,noAsh:true});}},
 // cape spread: a long glide, slow to fall and quick forward
 {n:'Cape Glide',fn:(a,p,use)=>{if(p.glide>0||!use(8))return;ST.cd=20;p.glide=300;p.vy=Math.min(p.vy,-3);ACT.push(()=>{if(--p.glide<=0||p.ground)return false;p.vy=Math.min(p.vy,.8);p.vx+=(p.face*3.6-p.vx)*.08;if(ST.frame%3===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8,col:[220,232,255]});return true;});}},
 {n:'Mr. Knight',fn:(a,p,use)=>{const list=nearestN(p.x,p.y,220,5);if(!list.length)return;if(!use(18))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-10,'GOOD EVENING.',.9,'#dce6ff',true);list.forEach((e,i)=>{const d=Math.hypot(e.x-p.x,e.y-p.y)||1;crescent(p.x,p.y-ST.PH/2,(e.x-p.x)/d*8,(e.y-p.y)/d*8,false);});}},
 // the eclipse: the dark falls and every enemy in it is marked by Khonshu
 {n:'Eclipse',fn:(a,p,use)=>{if(!use(26))return;ST.cd=90;let k=0;fxWord(p.x,p.y-ST.PH-12,'KHONSHU SEES YOU',1,'#dce6ff',true);ACT.push(()=>{k++;ST.dark=Math.min(.85,k*.03);if(k===20)for(const e of enemies)if(Math.abs(e.x-p.x)<260&&Math.abs(e.y-p.y)<160)applyStatus(e,'mark',420);if(k>=300){ST.dark=0;return false;}return true;});}},
 // the crescent brand: a sigil at the cursor that cuts everything inside it over and over
 {n:'Crescent Brand',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const cx=mouse.wx,cy=mouse.wy,r=30*ST.aoeC;let k=0;ACT.push(()=>{k++;for(let j=0;j<20;j++){const an=Math.PI*.2+j/20*Math.PI*1.6;spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r,0,0,rgb(220,232,255),3,0,1,0,0);}
   if(k%15===0){const an=R()*Math.PI;sliceLine(cx-Math.cos(an)*r,cy-Math.sin(an)*r,cx+Math.cos(an)*r,cy+Math.sin(an)*r,{edge:ML,quiet:true});damageEnemies(cx,cy,r,12,0,0);}return k<150;});}},
 {n:'Lunar Leap',fn:(a,p,use)=>{if(!p.ground||!use(14))return;ST.cd=30;const s=Math.min(1,a.d/160);p.vx=a.dx*(4+4*s);p.vy=-6-3*s;p.ground=false;p.slam=true;p.slamOpt={col:ML,r:26};fxWord(p.x,p.y-ST.PH-6,'BY THE MOON!',.9,'#dce6ff',true);}},
 // each use turns the moon a phase: new (unseen), half (crescents all round), full (healing light that blinds)
 {n:'Phases of the Moon',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;const ph=p.mphase=((p.mphase||0)+1)%3,cx=p.x,cy=p.y-ST.PH/2;
   if(ph===1){p.stealth=240;p.lastSeen={x:p.x,y:p.y-8};fxEclipse(cx,cy-22,9,ML,{life:40});fxWord(cx,cy-30,'NEW MOON',.9,'#dce6ff',true);}
   else if(ph===2){for(let k=0;k<8;k++){const an=k/8*6.283;crescent(cx,cy,Math.cos(an)*7,Math.sin(an)*7,false);}fxWord(cx,cy-30,'HALF MOON',.9,'#dce6ff',true);}
   else{p.hp=Math.min(ST.CH.hp,p.hp+50);for(const e of nearestN(cx,cy,120,8))applyStatus(e,'stun',70);flash(cx,cy,90,ML,14);fxFlare(cx,cy-24,20,ML,{life:30});fxWord(cx,cy-30,'FULL MOON',1,'#dce6ff',true);}}},
 // Khonshu weighs the heart: a weakened enemy is found wanting and dies; a strong one is marked and stunned
 {n:'Weighing of the Heart',fn:(a,p,use)=>{const e=atCursor(70);if(!e){noTarget('#dce6ff');return;}if(!use(20))return;ST.cd=50;fxSigil(e.x,e.y,e.def.w/2+12,ML,{kind:'mandala',life:40,spin:.06});
   if(!e.def.titan&&e.hp/e.def.hp<.35){hitEnemy(e,e.hp+60,0,-3);flash(e.x,e.y,30,ML,8);fxWord(e.x,e.y-e.def.h/2-10,'FOUND WANTING.',1,'#dce6ff',true);snd('boom',e.x,e.y,{size:.6});}
   else{applyStatus(e,'mark',480);applyStatus(e,'stun',60);hitEnemy(e,e.def.titan?40:16,0,0);fxWord(e.x,e.y-e.def.h/2-10,'SPARED... FOR NOW',.8,'#dce6ff',true);}}},
 // the Mooncopter hangs over him and fires crescents at whatever comes close
 {n:'Mooncopter',fn:(a,p,use)=>{if(summons.some(s=>s.mcopter)||!use(28))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'MOONCOPTER, INBOUND',.9,'#dce6ff',true);snd('jet',p.x,p.y,{pitch:.7});
   summons.push({mcopter:true,x:p.x,y:p.y-80,life:480,upd(s){const tx=pl_.x-pl_.face*20,ty=pl_.y-70;s.x+=(tx-s.x)*.06;s.y+=(ty-s.y)*.06;if(s.t%18===0){const e=nearestEnemy(s.x,s.y+40,220);if(e){const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy)||1;crescent(s.x,s.y+4,dx/d*8,dy/d*8,false);}}},draw:drawCopter});}},
 // a truncheon on a cable: it hooks the enemy and reels it in to a stunning blow (or reels him to a titan)
 {n:'Truncheon Hook',fn:(a,p,use)=>{const e=atCursor(90);if(!e||Math.hypot(e.x-p.x,e.y-p.y)>230){noTarget('#dce6ff');return;}if(!use(10))return;ST.cd=22;let k=0;
   ACT.push(()=>{k++;if(e.hp<=0)return false;const h=hand();beams.push({x0:h.x,y0:h.y,x1:e.x,y1:e.y,life:1,w:0,c:[230,232,240],g:[160,170,190]});const dx=h.x+p.face*8-e.x,dy=h.y-e.y,d=Math.hypot(dx,dy)||1;
     if(e.def.titan){p.script=2;scriptMove(p,-dx/d*8,-dy/d*8);if(d<24||k>30){hitEnemy(e,24,0,0);return false;}return true;}
     if(d<14||k>30){e.vx=e.vy=0;hitEnemy(e,22,p.face*3,-3);applyStatus(e,'stun',60);fxWord(e.x,e.y-10,'GET OVER HERE.',.8,'#dce6ff',true);return false;}
     e.x+=dx/d*Math.min(10,d);e.y+=dy/d*Math.min(10,d);e.vx=e.vy=0;return true;});}},
 // the Avatar of Khonshu rises behind him and stamps the street flat
 {n:'Avatar of Khonshu',ult:true,fn:(a,p,use)=>{ST.cd=200;fxWord(p.x,p.y-80,'I AM THE FIST OF KHONSHU',1.3,'#dce6ff',true);const gy=groundBelow(p.x|0,p.y-10);
   summons.push({x:p.x-p.face*30,y:gy,life:200,upd(s){if(s.t%50===25){const x=s.x+(R()-.5)*160,g=groundBelow(x|0,s.y-40);quake(x,g,{r:30,col:ML});ST.shake=22;}},draw:drawKhonshu});}}
];
export const CHAR_MOON={id:'moon',name:'Moon Knight',pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.2,jump:5.4,hp:380,armor:.7,glow:ML,cape:[rgb(236,236,240),rgb(170,172,182)],thrust:()=>rgb(220,232,255),powers:MOON_POWERS};

// ================= SHANG-CHI =================
const RC=[120,220,255];
function ringShot(x,y,vx,vy,bounces){const s={x,y,vx,vy,type:'ring',life:120,col:RC,bounces,hit:new Set(),draw:drawRing};shots.push(s);return s;}
function drawRing(s,pix){const c=rgb(140,230,255),g=rgb(60,170,255);for(let k=0;k<10;k++){const an=k/10*6.283;pix(s.x+Math.cos(an)*2.6,s.y+Math.sin(an)*2.6,c,g);}}
// rings fly themselves: bounce off walls and hop to the next enemy
export function updRings(){for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.type!=='ring')continue;const st=Math.ceil(Math.hypot(s.vx,s.vy))||1;let bounce=false;
  for(let k=0;k<st&&!bounce;k++){s.x+=s.vx/st;s.y+=s.vy/st;if(s.x<1||s.x>=W-1||s.y>=H-2){bounce=true;break;}if(s.y>=0&&KIND[t[(s.y|0)*W+(s.x|0)]]===S){carve(s.x,s.y,2.5,0,0);s.x-=s.vx/st;s.y-=s.vy/st;bounce=true;break;}
    for(const e of enemies){if(s.hit.has(e)||Math.abs(e.x-s.x)>e.def.w/2+3||Math.abs(e.y-s.y)>e.def.h/2+3)continue;s.hit.add(e);hitEnemy(e,18,s.vx*.4,s.vy*.4);flash(s.x,s.y,8,RC,3);bounce=true;break;}}
  if(bounce){if(--s.bounces<0){shots.splice(n,1);continue;}let b=null,bd=180;for(const e of enemies){if(s.hit.has(e))continue;const d=Math.hypot(e.x-s.x,e.y-s.y);if(d<bd){bd=d;b=e;}}const v=Math.hypot(s.vx,s.vy)||7;if(b){s.vx=(b.x-s.x)/bd*v;s.vy=(b.y-s.y)/bd*v;}else{s.vx=-s.vx;s.vy=-s.vy;}}
  spawn(s.x,s.y,0,0,rgb(120,220,255),5,0,1,0,1);if(--s.life<=0)shots.splice(n,1);}}
function drawDragon(s){const o={},Wc=rgb(240,240,236),Rd=rgb(200,60,60),seg=s.pts;TK.begin();for(let k=seg.length-1;k>=0;k-=2){const [x,y]=seg[k];TK.ell(x,y,9-k*.18,7-k*.12,k%4===0?Rd:Wc,o);}const [hx,hy]=seg[0];TK.ell(hx+s.face*6,hy-2,9,6,Wc,o);TK.cap(hx+s.face*8,hy-6,hx+s.face*2,hy-16,2,1,Rd,o);TK.end();TK.glowDot(hx+s.face*9,hy-4,0,rgb(120,220,255));}
function drawWheel(s){const cx=s.x,cy=s.y-18;for(let j=0;j<10;j++){const an=s.spin+j*.628,x=cx+Math.cos(an)*14,y=cy+Math.sin(an)*14;for(let m=0;m<8;m++){const b=m/8*6.283;pix(x+Math.cos(b)*3,y+Math.sin(b)*3,rgb(160,235,255),rgb(60,170,255));}}}
const SHANG_POWERS=[
 {n:'Ten Rings',fn:(a,p,use)=>{if(!use(5))return;ST.cd=12;ringShot(a.h.x,a.h.y,a.dx*7,a.dy*7,3);snd('whoosh',a.h.x,a.h.y,{pitch:1.8});}},
 {n:'Kung Fu Flurry',fn:(a,p,use)=>{if(!use(10))return;ST.cd=24;let k=0;ACT.push(()=>{if(k%4===0){melee(p,11,9,2,-1);if(k%8===0)fxWord(p.x+p.face*12,p.y-ST.PH-4,['HAI!','HYA!','TAK!'][R()*3|0],.7,'#ffd36a',true);snd('punch',p.x,p.y,{v:.5});}return++k<24;});}},
 {n:'Dragon Kick',fn:(a,p,use)=>{if(!use(10))return;ST.cd=22;const dx=a.dx,dy=Math.min(.3,a.dy);let k=0;ACT.push(()=>{k++;p.script=2;carve(p.x+dx*8,p.y-ST.PH/2+dy*8,6,dx*5,dy*5);scriptMove(p,dx*9,dy*9);damageEnemies(p.x+dx*6,p.y-ST.PH/2,10,14,dx*7,-3);if(k%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8,col:[255,120,90]});return k<12;});}},
 // the rings circle him: they block shots and strike what comes near
 {n:'Ring Guard',fn:(a,p,use)=>{if(p.rguard>0||!use(18))return;ST.cd=40;p.rguard=300;ACT.push(()=>{if(--p.rguard<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;for(let k=0;k<10;k++){const an=ST.frame*.1+k*.628;spawn(cx+Math.cos(an)*16,cy+Math.sin(an)*16*.6,0,0,rgb(120,220,255),2,0,1,0,0);}
   for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<20){s.owner='player';s.vx*=-1.3;s.vy*=-1.3;s.col=RC;}}if(ST.frame%10===0)for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<20+e.def.w/2)hitEnemy(e,8,(e.x-cx)*.2,-1);return true;});}},
 {n:'Palm Strike',fn:(a,p,use)=>{if(!use(12))return;ST.cd=24;const h=a.h;damageCone(h.x,h.y,a.dx,a.dy,60,20,6);for(const b of bodies){const dx=b.x-h.x,dy=b.y-h.y,d=Math.hypot(dx,dy)||1;if(d<70&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*4;b.vy+=a.dy*4-1;b.thrown=true;}}
   for(let k=0;k<4;k++)rings.push({x:h.x+a.dx*k*10,y:h.y+a.dy*k*10,r:4+k*3,vr:1,life:8+k,c:[255,220,150]});carve(h.x+a.dx*10,h.y+a.dy*10,6,a.dx*5,a.dy*5);fxWord(h.x+a.dx*20,h.y-10,'HAAH!',.9,'#ffd36a',true);}},
 // the rings carry him: a flying dash along the line to the cursor, cutting as it goes
 {n:'Ring Surf',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;const tx=mouse.wx,ty=mouse.wy;let k=0,lx=p.x,ly=p.y;ACT.push(()=>{k++;p.script=2;const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1;scriptMove(p,dx/d*Math.min(8,d),dy/d*Math.min(8,d));sliceLine(lx,ly+1,p.x,p.y+1,{edge:[140,230,255],quiet:true});lx=p.x;ly=p.y;
   for(let j=0;j<3;j++)spawn(p.x+(R()-.5)*8,p.y+2,(R()-.5),.5,rgb(120,220,255),8,0,1,0,1);damageEnemies(p.x,p.y-ST.PH/2,10,6,dx/d*4,-2);return d>8&&k<50;});}},
 // the Great Protector: the dragon of Ta Lo swims across the sky, soaking and battering everything
 {n:'Great Protector',fn:(a,p,use)=>{if(summons.some(s=>s.dragon)||!use(34))return;ST.cd=90;const dir=a.dx<0?-1:1,y0=Math.min(p.y-60,mouse.wy);fxWord(p.x,p.y-ST.PH-12,'GREAT PROTECTOR!',1.1,'#bfe8ff',true);snd('roar',p.x,p.y,{pitch:1.4});
   const x0=dir>0?ST.camX-40:ST.camX+520,pts=[];for(let k=0;k<24;k++)pts.push([x0-dir*k*6,y0]);
   summons.push({dragon:true,x:x0,y:y0,face:dir,pts,life:220,upd(s){const [hx,hy]=s.pts[0];const nx=hx+s.face*4,ny=y0+Math.sin(s.t*.08)*30;s.pts.unshift([nx,ny]);s.pts.pop();
     for(const e of enemies)if(Math.hypot(e.x-nx,e.y-ny)<16){applyStatus(e,'wet',400);if(s.t%6===0)hitEnemy(e,10,s.face*4,-2);}for(let k=0;k<2;k++)spawn(nx,ny,(R()-.5),1+R(),rgb(140,190,240),30,0,0,1);carve(nx,ny,6,s.face*3,0);},draw:drawDragon});}},
 // rings close round the enemy at the cursor and crush it
 {n:'Ring Prison',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,60);if(!e){fxWord(mouse.wx,mouse.wy,'NO TARGET',.7,'#bfe8ff',true);return;}if(!use(20))return;ST.cd=40;let k=0;
   ACT.push(()=>{k++;if(e.hp<=0)return false;const r=Math.max(4,20-k*.3);if(!e.def.titan)e.frozen=Math.max(e.frozen||0,2);for(let j=0;j<10;j++){const an=j/10*6.283+k*.2;spawn(e.x+Math.cos(an)*r,e.y+Math.sin(an)*r*.7,0,0,rgb(120,220,255),2,0,1,0,0);}if(k%10===0)hitEnemy(e,10,0,0);if(k===50){hitEnemy(e,40,0,-3);explode(e.x|0,e.y|0,7,{self:true,col:RC});}return k<50;});}},
 // a moment's stillness: he parries everything that comes at him and answers each with a strike
 {n:'Wushu Counter',fn:(a,p,use)=>{if(!use(10))return;ST.cd=40;p.parry=60;fxWord(p.x,p.y-ST.PH-8,'...',.8,'#ffd36a',true);ACT.push(()=>{if(--p.parry<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;
   for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<18){shots.splice(n,1);const e=s.src;if(e&&e.hp>0){hitEnemy(e,22,0,0);zap(cx,cy,e.x,e.y,[255,240,200],[255,200,90]);}fxWord(cx,cy-14,'PARRY!',.8,'#ffd36a',true);}}
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<16+e.def.w/2&&ST.frame%6===0){hitEnemy(e,16,p.face*5,-3);}return true;});}},
 // three rings settle in the air as glowing footholds toward the cursor, then fade
 {n:'Ring Steps',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;const cells=[],tx=mouse.wx,ty=mouse.wy;
   for(let k=1;k<=3;k++){const x=p.x+(tx-p.x)*k/3|0,y=p.y+(ty-p.y)*k/3|0;for(let xx=-7;xx<=7;xx++)for(let yy=0;yy<2;yy++){const X=x+xx,Y=y+yy;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i])continue;setc(i,GLASS);col[i]=yy?rgb(60,150,230):rgb(150,230,255);pin[i]=3;cells.push(i);}rings.push({x,y,r:9,vr:0,life:20,c:RC});}
   let k=0;ACT.push(()=>{if(++k<360){if(k%12===0)for(const i of cells)if(t[i]===GLASS&&R()<.05)spawn(i%W,i/W|0,0,.3,rgb(120,220,255),10,0,1,0,1);return true;}for(const i of cells){if(t[i]===GLASS)setc(i,EMPTY);pin[i]=0;}return false;});}},
 // the rings chain round the enemy: he swings it overhead and slams it down, side to side, three times
 {n:'Ring Chain Slam',fn:(a,p,use)=>{const e=atCursor(80);if(!e||e.def.titan||Math.hypot(e.x-p.x,e.y-p.y)>200){noTarget('#bfe8ff');return;}if(!use(18))return;ST.cd=40;let k=0;fxWord(p.x,p.y-ST.PH-10,'HYAAAH!',1,'#ffd36a',true);
   ACT.push(()=>{k++;if(e.hp<=0)return false;const h=hand();for(let j=0;j<6;j++){const f=j/6;spawn(h.x+(e.x-h.x)*f,h.y+(e.y-h.y)*f,0,0,rgb(120,220,255),2,0,1,0,0);}
     const ph=(k-1)/16|0,u=((k-1)%16)/15,side=ph%2?-1:1,th=side*u*1.95,L=36;e.x=p.x+Math.sin(th)*L;e.y=p.y-ST.PH/2-Math.cos(th)*L;e.vx=e.vy=0;e.frozen=Math.max(e.frozen||0,2);
     if(u===1){carve(e.x,e.y,8,0,0);explode(e.x|0,e.y|0,6,{self:true,quiet:true,col:RC});hitEnemy(e,16,0,0);damageEnemies(e.x,e.y,18,8,0,-3);ST.shake=Math.max(ST.shake,6);snd('punch',e.x,e.y,{v:1});}
     if(k>=48){e.vx=side*6;e.vy=-3;e.thrownT=60;e.frozen=0;return false;}return true;});}},
 // light taps on up to three enemies; a moment later each one feels it
 {n:'Pressure Points',fn:(a,p,use)=>{const list=nearestN(p.x,p.y,90,3);if(!list.length){noTarget('#ffd36a');return;}if(!use(16))return;ST.cd=36;let k=0;
   for(const e of list){flash(e.x,e.y,8,[255,220,150],3);fxWord(e.x,e.y-e.def.h/2-4,'TAP',.6,'#ffd36a',true);hitEnemy(e,4,0,0);}
   ACT.push(()=>{k++;if(k%10===0)for(const e of list)if(e.hp>0)spawn(e.x,e.y-e.def.h/2,0,-.5,rgb(255,210,120),10,0,1,0,1);if(k<75)return true;
     for(const e of list){if(e.hp<=0)continue;hitEnemy(e,46,0,-2);applyStatus(e,'stun',80);flash(e.x,e.y,20,[255,220,150],6);fxWord(e.x,e.y-e.def.h/2-8,'...NOW.',.9,'#ffd36a',true);}snd('punch',p.x,p.y);return false;});}},
 // all ten rings lock into one great wheel that rolls away along the ground, flattening what's in front
 {n:'Wheel of Rings',fn:(a,p,use)=>{if(summons.some(s=>s.wheel)||!use(26))return;ST.cd=60;const dir=a.dx<0?-1:1,r=18;fxWord(p.x,p.y-ST.PH-10,'ROLL!',1,'#bfe8ff',true);
   summons.push({wheel:true,x:p.x+dir*20,y:p.y,life:150,dir,spin:0,upd(s){s.x+=s.dir*4;const gy=groundBelow(s.x|0,s.y-r*2);s.y=gy;s.spin+=s.dir*.22;carve(s.x+s.dir*r*.6,gy-r,r*.8,s.dir*4,-1);damageEnemies(s.x,gy-r,r+4,9,s.dir*6,-5);if(s.t%8===0)ST.shake=Math.max(ST.shake,3);if(s.x<4||s.x>W-4)return false;},draw:drawWheel});}},
 // the Ten Rings unleashed: every ring finds an enemy and calls down a column of light on it
 {n:'Ten Rings Unleashed',ult:true,fn:(a,p,use)=>{ST.cd=200;fxWord(p.x,p.y-70,'THE TEN RINGS!',1.5,'#bfe8ff',true);const list=nearestN(p.x,p.y,320,10);let k=0;
   ACT.push(()=>{k++;if(k%6===0){const e=list[(k/6|0)-1];if(e&&e.hp>0){beamCore({h:{x:e.x,y:ST.camY-10},dx:0,dy:1,d:1},{pow:200,rad:3,len:Math.max(10,e.y-ST.camY+30),w:4,c:[220,250,255],g:[60,170,255],spark:()=>rgb(160,230,255),dmg:30});hitEnemy(e,50,0,-4);explode(e.x|0,e.y|0,9,{self:true,col:RC});}}return k<66;});}}
];
export const CHAR_SHANG={id:'shang',name:'Shang-Chi',pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.4,jump:5.8,hp:360,armor:.7,glow:RC,cape:null,thrust:()=>rgb(120,220,255),powers:SHANG_POWERS};
export { EMPTY, markDirty };
export { necroShot, crescent, ringShot, NG, NGE, ML, RC, STONE_C };
