// Thor: sprite, palette, rig entry, powers and roster entry.
import './hulk.js'; // evaluation order: runs after heroes/hulk.js
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { H, VH, W } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { pvx, pvy, px, py, spawn } from '../world/particles.js';
import { afters, beams, flash, fxBurst, fxImpact, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import '../render/rig.js'; // kept for evaluation order
import { snd, sndLoop } from '../sfx.js';
import { BLUE, beamCore, lightningStrike, pickC, pins, shots, surfaceY, zap } from './powers.js';
import { ACT, aimFrom } from './xmen.js';
import { SKY, boxHit, carve, hand, mouse, pl_, toggleFly } from '../player.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { tagged } from './kitlib.js';
import { groundBelow } from '../ui/spawn.js';
import { drawHammer } from '../render/sprites.js';
import { summons } from './abilities.js';


const THOR_POWERS=[
 {n:'Hammer Throw',fn:(a,p,use)=>{if(shots.some(s=>s.type==='hammer')||!use(8))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'hammer',life:400,out:Math.min(55,a.d/7+8),hitSet:new Set(),spin:0});ST.cd=10;ST.shake+=1.5;flash(a.h.x,a.h.y,12,BLUE,4);}},
 {n:'Lightning Call',fn:(a,p,use)=>{if(!use(16))return;lightningStrike(mouse.wx,mouse.wy,13);ST.cd=22;}},
 {n:'Lightning Dome',fn:(a,p,use)=>{if(!use(28))return;ST.cd=60;let k=0;fxWord(p.x,p.y-30,'FOR ASGARD!',1.1,'#bfe3ff',true);snd('thunder',p.x,p.y,{v:.7});
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2,r=34*ST.aoeC;if(k%2===0){const an=R()*6.283,an2=an+(R()-.5)*1.4;zap(cx+Math.cos(an)*r,cy+Math.sin(an)*r,cx+Math.cos(an2)*r,cy+Math.sin(an2)*r,[230,240,255],[120,170,255]);}
     if(k%6===0)tagged('shock',()=>{for(const e of enemies){const d=Math.hypot(e.x-cx,e.y-cy);if(d<r+e.def.w/2)hitEnemy(e,7,(e.x-cx)/(d||1)*2,(e.y-cy)/(d||1)*2);}});
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r){shots.splice(n,1);flash(s.x,s.y,6,[150,190,255],2);}}return k<240;});}},
 {n:'Thunder Slam',fn:(a,p,use)=>{if(!use(24))return;if(p.fly)toggleFly(false);if(p.ground){p.vy=-4.5;p.ground=false;}p.slam=true;p.slamOpt={col:BLUE,r:40,bolts:true};ST.cd=45;}},
 {n:'Storm Call',fn:(a,p,use)=>{if(ST.storm||!use(50))return;ST.storm={x:mouse.wx,life:480};ST.cd=60;flash(mouse.wx,ST.camY,140,BLUE,12);ST.shake+=4;}},
 {n:'Bifrost',fn:(a,p,use)=>{if(!use(35))return;ST.cd=60;let x=mouse.wx|0,y=mouse.wy|0;for(let k=0;k<60&&boxHit(x,y);k++)y--;if(boxHit(x,y))return;
   const RB=[[255,70,70],[255,170,60],[255,240,80],[90,240,110],[80,170,255],[170,100,255]];
   for(const [ox,c] of RB.map((c,k)=>[k-2.5,c])){beams.push({x0:p.x+ox,y0:p.y-ST.PH/2,x1:p.x+ox,y1:ST.camY-10,life:10,w:1,c,g:c});beams.push({x0:x+ox,y0:ST.camY-10,x1:x+ox,y1:y,life:12,w:1,c,g:c});}
   p.x=x;p.y=y;p.vx=p.vy=0;explode(x,y,9,{col:[200,220,255],word:'VWOOOM!',self:true});damageEnemies(x,y,30,30,0,-4,true);flash(x,y-10,80,[220,230,255],10);rings.push({x,y:y-8,r:4,vr:4,life:14,c:[255,240,200]});}},
 {n:'Mjolnir Spin',fn:(a,p,use)=>{if(!use(.6))return;p.spin=6;
   damageEnemies(p.x,p.y-ST.PH/2,16,2.5,0,0,true);for(let n=shots.length-1;n>=0;n--){const s2=shots[n];if(s2.owner==='enemy'&&Math.hypot(s2.x-p.x,s2.y-p.y+ST.PH/2)<18){spawn(s2.x,s2.y,0,0,rgb(200,220,255),8,0,1,0);shots.splice(n,1);}}
   for(let n=0;n<ST.np;n++){const dx=px[n]-p.x,dy=py[n]-p.y+ST.PH/2,d=Math.hypot(dx,dy);if(d<30&&d>1){pvx[n]+=-dy/d*.6;pvy[n]+=dx/d*.6;}}
   if(p.fly){p.vx+=(mouse.wx>p.x?1:-1)*.12;}if(ST.frame%20===0)fxWord(p.x,p.y-ST.PH-6,'WHUM WHUM',.7,'#bfe3ff',true);}},
 // hurl Mjolnir and hang on: Thor is dragged along behind it, smashing through anything
 {n:'Hammer Tow',fn:(a,p,use)=>{if(p.tow||!use(20))return;ST.cd=40;const dx=a.dx,dy=a.dy;let k=0;if(ST.CH.fly&&!p.fly)toggleFly(true);p.tow={dx,dy};fxWord(p.x,p.y-ST.PH-8,'HYAAAH!',1.1,'#bfe3ff',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{k++;p.script=2;p.fly=true;
     for(let s=0;s<3;s++){p.x+=dx*3;p.y+=dy*3;carve(p.x+dx*11,p.y-ST.PH/2+dy*11,6.5,dx*6,dy*6);if(s===1)carve(p.x,p.y-ST.PH/2,5,dx*4,dy*4);}
     p.x=Math.max(5,Math.min(W-5,p.x));p.y=Math.max(ST.PH+2-SKY+VH/2,Math.min(H-8,p.y));
     const hx=p.x+dx*11,hy=p.y-ST.PH/2+dy*11;damageEnemies(hx,hy,12,14,dx*6,dy*6);
     for(const b of bodies){if(!b.held&&Math.hypot(b.x-hx,b.y-hy)<b.rmax+8){b.vx+=dx*2;b.vy+=dy*2;b.thrown=true;}}
     if(k%3===0)zap(hx,hy,hx+(R()-.5)*40,hy+(R()-.5)*40,[230,240,255],[120,170,255]);spawn(hx,hy,(R()-.5)*2,(R()-.5)*2,pickC(BLUE),12,0,1,0,1);
     afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:10});p.face=dx<0?-1:1;p.ang+=(Math.atan2(dx,-dy)*.85-p.ang)*.3;p.grip={x:hx,y:hy};sndLoop('tow','wind',p.x,p.y);ST.shake=Math.max(ST.shake,2.5);
     if(k>=32||p.x<=5||p.x>=W-5||p.y<=ST.PH+2||p.y>=H-8){p.script=0;p.tow=null;p.grip=null;p.vx=dx*3;p.vy=dy*3;explode(hx|0,hy|0,10,{col:BLUE,self:true,word:'KRAKOOM!'});for(let q2=0;q2<4;q2++)zap(hx,hy,hx+(R()-.5)*70,hy+(R()-.5)*70,[230,240,255],[120,170,255]);return false;}
     return true;});}},
 // drop Mjolnir from the sky onto a foe: no one unworthy can move while it sits on them
 {n:'Mjolnir Pin',fn:(a,p,use)=>{if(pins.length||shots.some(s=>s.type==='hammer'||s.type==='pin')||!use(26))return;ST.cd=50;const e=nearestEnemy(mouse.wx,mouse.wy,60);
   shots.push({x:e?e.x:mouse.wx,y:ST.camY-16,vx:0,vy:9,type:'pin',life:240,target:e});fxWord(p.x,p.y-ST.PH-8,'ONLY THE WORTHY!',1.1,'#bfe3ff',true);flash(p.x,p.y-ST.PH/2,30,BLUE,6);}},
 // launch everything in front skyward, then lightning finds each of them in the air
 {n:'Asgardian Uppercut',fn:(a,p,use)=>{if(!use(16))return;ST.cd=34;const dir=a.dx<0?-1:1;p.face=dir;p.punchF=10;if(p.ground){p.vy=-3.5;p.ground=false;}const cx=p.x+dir*9,cy=p.y-ST.PH/2;
   for(let s=0;s<=10;s++)carve(p.x+dir*(6+Math.sin(s/10*Math.PI)*7),p.y-4-s*2.6,3.5,dir,-3);
   const hitL=[];for(const e of enemies){const rx=(e.x-p.x)*dir;if(rx>-4&&rx<28+e.def.w/2&&e.y>p.y-ST.PH-20&&e.y<p.y+6){hitL.push(e);hitEnemy(e,28,dir*1.5,-2);if(!e.def.title&&e.def.w<=20){e.vy=-8.5;e.ground=false;}}}
   for(const b of bodies){if(!b.held&&Math.abs(b.x-cx)<b.rmax+14&&Math.abs(b.y-cy)<b.rmax+16){b.vy-=6;b.vx+=dir;b.thrown=true;}}
   fxWord(cx,cy-16,'UPPERCUT!',1.2,'#bfe3ff',true);fxBurst(cx,cy-8,26,'#bfe3ff');snd('punch',cx,cy);ST.shake+=5;let k=0;
   ACT.push(()=>{if(++k===20){for(const e of hitL)if(e.hp>0&&enemies.includes(e))lightningStrike(e.x,e.y,7);return false;}return true;});}},
 // the axe: flies straight and cleaves a razor-thin line through everything, so buildings split and fall
 {n:'Stormbreaker',fn:(a,p,use)=>{if(shots.some(s=>s.type==='axe')||!use(22))return;ST.cd=40;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7.5,vy:a.dy*7.5,type:'axe',life:56,spin:0,hitSet:new Set()});fxWord(a.h.x,a.h.y-14,'STORMBREAKER!',1.1,'#bfe3ff',true);p.throwF=8;}},
 // Mjolnir into the ground: the street itself carries the lightning for a few seconds
 {n:'Thunder Anvil',fn:(a,p,use)=>{if(!use(26))return;ST.cd=55;const cx=mouse.wx,gy=groundBelow(cx|0,mouse.wy),r=70*ST.aoeC;let k=0;lightningStrike(cx,gy,8);
   ACT.push(()=>{k++;for(let j=0;j<3;j++){const x=cx+(R()-.5)*r*2,y=surfaceY(x|0,Math.max(0,gy-30),60);zap(x,y-1,x+(R()-.5)*16,y-2-R()*6,[230,240,255],[120,170,255]);}
     if(k%10===0)tagged('shock',()=>{for(const e of enemies)if(Math.abs(e.x-cx)<r&&e.y>gy-30&&e.y<gy+10)hitEnemy(e,9,0,-2);});return k<300;});}},
 // the hammer circles him like a moon, smashing anything it meets
 {n:'Mjolnir Orbit',fn:(a,p,use)=>{if(!use(24))return;ST.cd=60;const s={x:p.x,y:p.y,life:360,an:0,hit:new Map(),
     upd(s){s.an+=.18;const cx=pl_.x,cy=pl_.y-ST.PH/2,r=26;s.x=cx+Math.cos(s.an)*r;s.y=cy+Math.sin(s.an)*r*.8;carve(s.x,s.y,3.5,0,0);
       for(const e of enemies){if(Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-s.y)<e.def.h/2+4&&ST.frame-(s.hit.get(e)||-99)>20){s.hit.set(e,ST.frame);hitEnemy(e,18,Math.cos(s.an)*4,Math.sin(s.an)*4-1);flash(s.x,s.y,10,[150,190,255],3);snd('clang',s.x,s.y,{v:.5});}}
       for(const b of bodies)if(Math.hypot(b.x-s.x,b.y-s.y)<b.rmax+3){b.vx+=Math.cos(s.an)*.6;b.vy+=Math.sin(s.an)*.6;b.thrown=true;}spawn(s.x,s.y,0,0,rgb(150,190,255),6,0,1,0,1);},
     draw(s){drawHammer(s.x,s.y,s.an+Math.PI);}};summons.push(s);fxWord(p.x,p.y-ST.PH-8,'MJOLNIR, TO ME!',1,'#bfe3ff',true);}},
 {n:'Lightning Body',fn:(a,p,use)=>{if(p.lbody>0||!use(24))return;ST.cd=70;p.lbody=300;fxWord(p.x,p.y-ST.PH-12,'GOD OF THUNDER!',1.1,'#9ec8ff',true);
    ACT.push(()=>{if(--p.lbody<=0||ST.CH.id!=='thor'){p.lbody=0;return false;}const cx=p.x,cy=p.y-ST.PH/2;if(ST.frame%8===0){const e=nearestEnemy(cx,cy,70);if(e){zap(cx,cy,e.x,e.y,[230,240,255],[120,170,255]);tagged('shock',()=>hitEnemy(e,10,0,0));}}
      if(ST.frame%3===0)zap(cx,cy,cx+(R()-.5)*16,cy+(R()-.5)*20,[230,240,255],[120,170,255]);return true;});}},
 {n:'God Blast',ult:true,fn:(a,p,use)=>{if(!use(.6))return;p.god=Math.min(70,(p.godT===ST.frame-1?p.god||0:0)+1.4);p.godT=ST.frame;const h=hand();
   for(let k=0;k<3;k++){const an=R()*6.283,r=16+R()*10;spawn(h.x+Math.cos(an)*r,h.y+Math.sin(an)*r,-Math.cos(an)*1.8,-Math.sin(an)*1.8,pickC(BLUE),9,0,1,0,1);}if(ST.frame%4===0)zap(h.x,h.y,h.x+(R()-.5)*30,h.y-20-R()*20,[230,240,255],[120,170,255]);
   if(p.god>=70){p.god=0;ST.cd=70;p.en=Math.max(0,p.en-30);let tf=30;fxWord(h.x,h.y-24,'ODINFORCE!',1.5,'#bfe3ff',true);ST.hitstop=Math.max(ST.hitstop,4);fxImpact(h.x,h.y,4);
     ACT.push(()=>{const b=aimFrom(hand());beamCore(b,{pow:1600,rad:4,len:650,w:6+((ST.frame>>1)&1),c:[240,248,255],g:[110,160,255],spark:()=>pickC(BLUE),dmg:12,noAsh:true});if(ST.frame%3===0)zap(b.h.x,b.h.y,b.h.x+b.dx*120+(R()-.5)*40,b.h.y+b.dy*120+(R()-.5)*40,[230,240,255],[120,170,255]);ST.shake=Math.max(ST.shake,10);return--tf>0;});}}}
];



// roster entry (CHARS in heroes/index.js)
export const CHAR_THOR={id:'thor',name:'Thor',pw:7,ph:19,fly:true,fs:3.2,boost:2.2,run:1.9,jump:4.6,hp:350,armor:.7,glow:BLUE,cape:null,thrust:()=>R()<.6?pickC(BLUE):rgb(255,255,255),powers:THOR_POWERS};
