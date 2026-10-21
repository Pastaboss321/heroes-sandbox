// Titans: screen-filling, multi-phase world-enders. Drawn with the titan kit (render/titan.js), not sprites.
// A titan def has titan:true (no grid collision, no knockback, immune to holds; think() places it), draw(e),
// and weak points: small linked 'part' enemies that pass damage to the titan multiplied (head, eyes, core).
// Each titan has three phases (at 66% and 33% health) that unlock new attacks and a phase banner.
//   Galactus  - the Devourer: Power Cosmic eye beams that slice the city, hand slams, devouring the ground
//   Thanos    - the Mad Titan: one attack per Infinity Stone, a thrown moon, and the Snap
//   Dormammu  - the Dark Dimension's burning face: flame breath, hellfire pillars, Mindless Ones
//   Surtur    - Ragnarok's fire giant: the Twilight Sword cuts whole districts in half
//   Knull     - the King in Black: Necrosword cuts, grasping tendrils, symbiote dragons, the dark
import { ST } from '../state.js';
import { EMPTY, FIRE, GLASS, KIND, LAVA, R, RUBBLE, S, STONE, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { bodies, gnd } from '../world/support.js';
import { finishBody } from '../world/bodies.js';
import { MP, spawn, spawnFlake } from '../world/particles.js';
import { beams, flash, fxImpact, fxWord, rings } from '../render/fx.js';
import { explode, ringChunks } from '../world/destruction.js';
import { sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { hurtTarget, shockFx, shots, surfaceY } from '../heroes/powers.js';
import { ACT } from '../heroes/xmen.js';
import { TK } from '../render/titan.js';
import { pl_ } from '../player.js';
import { defineEnemy, enemies, player, spawnEnemy } from './core.js';
const banner=(a,b)=>ST.banner&&ST.banner(a,b); // modes/core.js publishes it (keeps this module out of the mode import chain)

const C=rgb;
const gy=x=>surfaceY(x,0,H);
// where a giant's feet go: the ground or street under x, ignoring rooftops (it wades through buildings)
const floorY=x=>{x=Math.max(0,Math.min(W-1,x|0));for(let y=0;y<H-1;y++){const i=y*W+x;if(KIND[t[i]]===S&&gnd[i])return y;}return H-40;};
const phaseOf=e=>e.hp>e.def.hp*.66?1:e.hp>e.def.hp*.33?2:3;
// weak points: the titan's think() keeps them glued to the body
defineEnemy('titan_part',{hp:1e9,w:18,h:18,fly:true,titan:true,score:0,boom:0,metal:false,glow:'',sprite:['.'],pal:{},
  think(e){const h=e.host;if(!h||h.hp<=0||!enemies.includes(h)){e.mem.noScore=true;e.hp=0;}},
  draw(e){if(!e.host)return;const k=.5+.5*Math.sin(ST.frame*.15);if(e.flash>0||k>.8)TK.glowDot(e.x,e.y,2,C(255,240,200));}});
function part(host,w,h,mult){const p=spawnEnemy('titan_part',host.x,host.y);if(!p)return null;p.host=host;p.mult=mult;p.w=w;p.def=Object.assign({},p.def,{w,h});(host.mem.parts||(host.mem.parts=[])).push(p);return p;}
const place=(p,x,y)=>{if(p){p.x=x;p.y=y;}};
function phase(e,names){const ph=phaseOf(e);if(ph!==e.mem.ph){if(e.mem.ph){banner(e.def.title,names[ph-1]);fxImpact(e.x,e.y,6);snd('roar',e.x,e.y,{pitch:.5,v:1});ST.shake=22;shockFx(e.x,e.y,1.4);ST.hitstop=Math.max(ST.hitstop,8);}e.mem.ph=ph;}return ph;}
// a titan's beam: marches from (x0,y0) toward (tx,ty), carves where it lands, burns the hero on its line
function tBeam(e,x0,y0,tx,ty,o){const dx=tx-x0,dy=ty-y0,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;let x=x0,y=y0,hit=false;
  for(let s=0;s<(o.len||900);s++){x+=ux;y+=uy;if(x<0||x>=W||y>=H)break;
    if(y>=0){const m=t[(y|0)*W+(x|0)];if(m&&KIND[m]===S){hit=true;break;}}
    if(Math.abs(x-pl_.x)<ST.PW/2+o.w&&y>pl_.y-ST.PH-o.w&&y<pl_.y+o.w){hurtTarget(e,o.dmg);}}
  if(hit){explode(x|0,y|0,o.boom||5,{enemy:true,dmg:0,quiet:true,self:true,col:o.g});if(o.slice&&ST.frame%o.slice===0)sliceLine(x-ux*40,y-uy*40,x+ux*30,y+uy*30,{edge:o.g,w:1,quiet:true});}
  beams.push({x0,y0,x1:x,y1:y,life:2,w:o.w,c:o.c||[255,255,255],g:o.g});flash(x,y,14,o.g,2);return{x,y,hit};}
function smash(e,x,y,r,dmg,c){explode(x|0,y|0,r,{enemy:true,dmg,fire:.2,col:c});ringChunks(x,y+4,r,true);shockFx(x,y,Math.min(1.4,r/18));ST.shake=22;ST.hitstop=Math.max(ST.hitstop,4);}
function meteor(e,x,c,r){shots.push({x:x+(R()-.5)*40,y:ST.camY-30,vx:(R()-.5)*1.2,vy:4+R()*2,type:'eshot',owner:'enemy',src:e,life:300,dmg:16,col:c,boom:r||10,fire:.3});}
function moon(e,x){ // a slab of rock dropped from orbit
  if(bodies.length>130)return;const r=14+R()*8|0,w=r*2+1,lm=new Uint8Array(w*w),lc=new Uint32Array(w*w);let n=0;
  for(let y=0;y<w;y++)for(let k=0;k<w;k++){const dx=k-r,dy=y-r;if(dx*dx+dy*dy>r*r)continue;lm[y*w+k]=STONE;const v=R()*20;lc[y*w+k]=C(110+v,100+v,120+v);n++;}
  const b=finishBody(lm,lc,w,w,r,r,x,ST.camY-40,0,n,false);b.vx=(R()-.5)*2;b.vy=6;b.va=(R()-.5)*.1;b.thrown=true;b.chunk=false;fxWord(x,ST.camY+30,'INCOMING!',1,'#ff6b5c',true);}
function bigDeath(e,c){const x=e.x,y=e.y,h=e.def.h,w=e.def.w;let k=0;ST.hitstop=Math.max(ST.hitstop,20);fxWord(x,y-h*.3,e.def.title+' FALLS!',2,'#ffc93c',true);
  ACT.push(()=>{k++;if(k%5===0){const bx=x+(R()-.5)*w,by=y+(R()-.5)*h;explode(bx|0,by|0,10+R()*8|0,{self:true,quiet:k%15!==0,col:c,fire:.2,noK:true});}
    if(k===90){explode(x|0,y|0,34,{self:true,col:c,fire:.3,noK:true});shockFx(x,y,1.4);flash(x,y,240,[255,255,255],20);ST.shake=22;}
    return k<90;});}
const TITANS=['galactus','thanos','dormammu','surtur','knull'];
export const isTitan=e=>TITANS.includes(e.def.name);

// ================= GALACTUS =================
defineEnemy('galactus',{hp:9000,w:120,h:290,fly:true,titan:true,score:20000,boom:30,metal:false,title:'GALACTUS',glow:'',sprite:['.'],pal:{},
  think(e){const m=e.mem,ph=phase(e,['','THE POWER COSMIC UNLEASHED','HUNGER ETERNAL']),p=player();
    if(!m.init){m.init=1;m.head=part(e,30,34,2.5);m.core=part(e,34,30,1.6);m.dir=1;m.step=0;e.cd=120;}
    const dx=p.x-e.x;e.face=dx>0?1:-1;
    if(!m.act&&Math.abs(dx)>140){e.x+=Math.sign(dx)*(.22+ph*.06);m.step++;
      if(m.step%60===0){const fx=e.x+(m.step%120?-26:26),fy=e.y+146;smash(e,fx,fy,12,10,[200,170,255]);for(let k=0;k<3;k++)explode(fx+(R()-.5)*30|0,fy-20-R()*100|0,8,{enemy:true,dmg:0,quiet:true,self:true});snd('stomp',fx,fy,{v:1,pitch:.5});}}
    const g=floorY(e.x);e.y+=(g-150-e.y)*.08;
    const hx=e.x+e.face*6,hy=e.y-118;place(m.head,hx,hy);place(m.core,e.x,e.y-40);
    if(!m.act&&e.cd<=0){const opts=['beam','slam'];if(ph>=2)opts.push('devour','beam');if(ph>=3)opts.push('meteors','slam');m.act=opts[R()*opts.length|0];m.t=0;
      fxWord(e.x,e.y-170,{beam:'THE POWER COSMIC!',slam:'KNEEL!',devour:'I HUNGER!',meteors:'BURN, WORLD!'}[m.act],1.4,'#c88cff',true);}
    if(m.act){m.t++;const ex=hx+e.face*4,ey=hy-2;
      if(m.act==='beam'){if(m.t<40){if(m.t%4===0)flash(ex,ey,20+m.t,[180,140,255],3);}
        else{m.tx=(m.tx??p.x-e.face*120)+(p.x-(m.tx??p.x))*.03;m.ty=(m.ty??p.y+40)+(p.y-(m.ty??p.y))*.05;
          for(const o of [-6,6])tBeam(e,ex+o,ey,m.tx+o,m.ty,{w:3,dmg:.8,boom:6,g:[190,130,255],slice:5});sndLoopSafe(e);ST.shake=Math.max(ST.shake,4);}
        if(m.t>40+(ph>=3?150:110)){m.act=null;m.tx=m.ty=undefined;e.cd=100;}}
      else if(m.act==='slam'){const tx=p.x,hand=m.hand||(m.hand={x:e.x+e.face*60,y:e.y-60});
        if(m.t<55){hand.x+=(tx-hand.x)*.06;hand.y+=(Math.min(p.y-120,e.y-120)-hand.y)*.08;}else{hand.y+=14;const gg=gy(hand.x|0);
          if(hand.y>=gg-10){smash(e,hand.x,gg,24+ph*4,34,[200,160,255]);snd('slam',hand.x,gg,{size:2});m.act=null;m.hand=null;e.cd=90;}}}
      else if(m.act==='devour'){const mx=hx+e.face*2,my=hy+14;
        for(let k=0;k<60;k++){const X=p.x+(R()-.5)*160|0,Y=gy(X)+(R()*20|0);if(Y<=0||Y>=H-8)continue;const i=Y*W+X;if(KIND[t[i]]!==S)continue;
          if(ST.np<MP-400){const ddx=mx-X,ddy=my-Y,dd=Math.hypot(ddx,ddy)||1;spawn(X,Y,ddx/dd*3,ddy/dd*3,col[i],90,0,1,0,0);}setc(i,EMPTY);}
        const ddx=mx-pl_.x,ddy=my-pl_.y,dd=Math.hypot(ddx,ddy)||1;pl_.vx+=ddx/dd*.18;pl_.vy+=ddy/dd*.18;if(dd<40)hurtTarget(e,1.2);
        for(const b of bodies){const bx=mx-b.x,by=my-b.y,bd=Math.hypot(bx,by)||1;if(bd<400){b.vx+=bx/bd*.3;b.vy+=by/bd*.3;}}
        if(m.t%10===0)rings.push({x:mx,y:my,r:60,vr:-4,life:12,c:[200,150,255]});if(m.t>200){m.act=null;e.cd=120;}}
      else if(m.act==='meteors'){if(m.t%6===0)meteor(e,p.x,[200,140,255],12);if(m.t%40===0)moon(e,p.x+(R()-.5)*100);if(m.t>150){m.act=null;e.cd=110;}}}
  },
  draw(e){const f=e.face,x=e.x,y=e.y,fl=e.flash>0,m=e.mem,o={flash:fl},sw=Math.sin((m.step||0)*.052)*10;
    const PUR=C(118,44,150),BLU=C(44,66,160),DB=C(28,34,80),SKN=C(208,170,150),MAG=C(150,60,190);
    TK.begin();
    TK.cap(x-18,y+10,x-22+sw,y+140,18,14,PUR,o);TK.cap(x+18,y+10,x+22-sw,y+140,18,14,PUR,o);
    TK.ell(x-22+sw,y+140,16,8,DB,o);TK.ell(x+22-sw,y+140,16,8,DB,o);
    TK.ell(x,y-30,48,62,BLU,o);TK.poly([[x-40,y-80],[x+40,y-80],[x+20,y-10],[x-20,y-10]],PUR,o);
    TK.ell(x,y-40,14,12,MAG,{...o,glow:C(220,140,255)});
    TK.poly([[x-48,y+4],[x+48,y+4],[x+40,y+18],[x-40,y+18]],PUR,o);
    const hand=m.hand,ax=hand?hand.x:x+f*64,ay=hand?hand.y:y+30;
    TK.cap(x+f*50,y-80,(x+f*50+ax)/2+f*10,(y-80+ay)/2,16,13,PUR,o);TK.cap((x+f*50+ax)/2+f*10,(y-80+ay)/2,ax,ay,13,12,BLU,o);TK.ell(ax,ay,15,13,PUR,o);
    TK.cap(x-f*50,y-80,x-f*62,y-20,16,13,PUR,o);TK.cap(x-f*62,y-20,x-f*58,y+34,13,12,BLU,o);TK.ell(x-f*58,y+38,14,12,PUR,o);
    TK.ell(x-f*44,y-86,22,16,MAG,o);TK.ell(x+f*44,y-86,22,16,MAG,o);
    const hx=x+f*6,hy=y-118;TK.ell(hx,hy,24,28,PUR,o);TK.ell(hx+f*5,hy+6,15,18,SKN,o);TK.poly([[hx-12+f*5,hy-6],[hx+18+f*5,hy-6],[hx+14+f*5,hy-1],[hx-8+f*5,hy-1]],MAG,o);TK.ell(hx+f*1,hy+2,3,2,C(40,20,50),{...o,flat:true});TK.ell(hx+f*11,hy+2,3,2,C(40,20,50),{...o,flat:true});TK.cap(hx+f*1,hy+15,hx+f*10,hy+15,1,1,C(110,70,70),{...o,flat:true});TK.cap(hx+f*6,hy+4,hx+f*7,hy+10,1,1,C(170,130,120),{...o,flat:true});
    TK.cap(hx-18,hy-14,hx-30,hy-80,8,5,PUR,o);TK.cap(hx+18,hy-14,hx+30,hy-80,8,5,PUR,o);TK.poly([[hx-14,hy-24],[hx+14,hy-24],[hx+6,hy-6],[hx-6,hy-6]],MAG,o);
    TK.end();
    const charge=m.act==='beam'?Math.min(1,m.t/40):0;TK.glowDot(hx+f*11,hy+2,1+charge*3|0,charge?C(255,230,255):C(160,120,220));TK.glowDot(hx+f*1,hy+2,1+charge*3|0,charge?C(255,230,255):C(160,120,220));},
  onDeath(e){bigDeath(e,[200,140,255]);}});
let gLoop=0;function sndLoopSafe(e){if(ST.frame-gLoop>8){gLoop=ST.frame;snd('beam',e.x,e.y-118,{pitch:.5,v:.9,gap:.1});}}

// ================= THANOS =================
const STONES={power:[170,60,255],space:[60,140,255],reality:[255,40,50],soul:[255,150,30],time:[60,255,110],mind:[255,220,40]};
defineEnemy('thanos',{hp:6500,w:40,h:92,fly:false,titan:true,score:15000,boom:24,metal:false,title:'THANOS',glow:'',sprite:['.'],pal:{},
  think(e){const m=e.mem,ph=phase(e,['','ALL SIX STONES','PERFECTLY BALANCED']),p=player();
    if(!m.init){m.init=1;m.head=part(e,18,20,2.2);m.glove=part(e,16,16,1.8);m.vy=0;e.cd=90;m.used=0;}
    const dx=p.x-e.x;if(!m.act)e.face=dx>0?1:-1;
    // body physics of his own: walk, leap, land with a quake
    const g=gy(e.x|0)-46;
    if(e.y<g-1||m.vy<0){m.vy=Math.min(9,m.vy+.35);e.y+=m.vy;if(e.y>=g){e.y=g;if(m.vy>5){smash(e,e.x,g+46,14,18,STONES.power);snd('slam',e.x,g+46);}m.vy=0;}}else{e.y=g;
      if(!m.act){if(Math.abs(dx)>60)e.x+=Math.sign(dx)*(.9+ph*.2);if(p.y<e.y-80&&e.cd%50===0){m.vy=-9-R()*3;e.x+=Math.sign(dx)*2;}}}
    if(m.vy<0||e.y<g)e.x+=Math.sign(dx)*1.6;
    e.x=Math.max(30,Math.min(W-30,e.x));
    place(m.head,e.x+e.face*2,e.y-38);const gx=e.x+e.face*(m.act?26:20),gyv=e.y+(m.act?-30:4);place(m.glove,gx,gyv);
    if(!m.act&&e.cd<=0){const opts=['power','space','reality','soul','mind'];if(ph>=2)opts.push('moon','power','time');if(ph>=3&&!m.snapped&&e.hp<e.def.hp*.2)opts.length=0,opts.push('snap');
      m.act=opts[R()*opts.length|0];if(m.act==='time'&&m.used&1)m.act='power';m.t=0;const c=STONES[m.act]||[255,255,255];
      fxWord(e.x,e.y-70,{power:'POWER!',space:'SPACE!',reality:'REALITY!',soul:'SOUL!',time:'TIME!',mind:'MIND!',moon:'I WILL SHRED THIS UNIVERSE',snap:'I AM... INEVITABLE.'}[m.act],1.3,`rgb(${c[0]},${c[1]},${c[2]})`,true);}
    if(m.act){m.t++;const c=STONES[m.act]||[255,255,255];if(m.t%3===0)spawn(gx,gyv,(R()-.5)*2,(R()-.5)*2,C(c[0],c[1],c[2]),14,0,1,0,1);
      if(m.act==='power'){if(m.t===30){const r=tBeam(e,gx,gyv,p.x,p.y-8,{w:4,dmg:18,boom:16,g:c,len:500});smash(e,r.x,r.y,16+ph*2,22,c);}if(m.t>50){m.act=null;e.cd=70;}}
      else if(m.act==='space'){if(m.t===20){for(const k of [0,1])rings.push({x:k?p.x-p.face*40:e.x,y:k?p.y-20:e.y,r:30,vr:-2,life:14,c});e.x=Math.max(30,Math.min(W-30,p.x-(p.face||1)*50));e.y=gy(e.x|0)-46;snd('psi',e.x,e.y);}if(m.t===40){smash(e,e.x+e.face*30,e.y+20,12,20,c);}if(m.t>50){m.act=null;e.cd=50;}}
      else if(m.act==='reality'){const cx=m.cx??(m.cx=p.x),cy=m.cy??(m.cy=p.y);if(m.t<40){if(m.t%5===0)rings.push({x:cx,y:cy,r:70,vr:-1.5,life:10,c});}
        else if(m.t===40){for(let k=0;k<2500;k++){const a=R()*6.283,d=Math.sqrt(R())*70,X=cx+Math.cos(a)*d|0,Y=cy+Math.sin(a)*d|0;if(X<0||X>=W||Y<0||Y>=H-6)continue;const i=Y*W+X;if(KIND[t[i]]===S){t[i]=GLASS;col[i]=C(230+R()*25,40+R()*60,60+R()*60);}}
          if(Math.hypot(pl_.x-cx,pl_.y-cy)<70)hurtTarget(e,20);}else if(m.t===70){explode(cx|0,cy|0,22,{enemy:true,dmg:10,col:c});m.act=null;m.cx=m.cy=undefined;e.cd=80;}}
      else if(m.act==='soul'){beams.push({pts:[[gx,gyv],[(gx+p.x)/2+(R()-.5)*20,(gyv+p.y)/2-20],[p.x,p.y-8]],life:2,c:[255,220,160],g:c});if(m.t%6===0){hurtTarget(e,3);e.hp=Math.min(e.def.hp,e.hp+12);}if(m.t>110||Math.hypot(p.x-e.x,p.y-e.y)>300){m.act=null;e.cd=80;}}
      else if(m.act==='time'){if(m.t%8===0)rings.push({x:e.x,y:e.y,r:50,vr:-3,life:12,c});if(m.t===50){m.used|=1;e.hp=Math.min(e.def.hp,e.hp+e.def.hp*.06);fxWord(e.x,e.y-60,'REWIND',1,'#5cff7a',true);m.act=null;e.cd=70;}}
      else if(m.act==='mind'){if(m.t===20){ST.mindT=200;fxWord(pl_.x,pl_.y-30,'MIND CONTROLLED!',1,'#ffd84a',true);flash(pl_.x,pl_.y,50,c,10);}if(m.t>40){m.act=null;e.cd=70;}}
      else if(m.act==='moon'){if(m.t%30===1)moon(e,p.x+(R()-.5)*160);if(m.t%8===0)meteor(e,p.x,[200,120,255],8);if(m.t>120){m.act=null;e.cd=100;}}
      else if(m.act==='snap'){if(m.t===60){m.snapped=1;flash(e.x,e.y,600,[255,255,255],30);ST.hitstop=Math.max(ST.hitstop,30);snd('boom',e.x,e.y,{size:2.5});fxWord(e.x,e.y-80,'*SNAP*',2.4,'#ffc93c',true);
          let n=0;for(let Y=ST.camY|0;Y<ST.camY+270&&Y<H-6;Y++)for(let X=ST.camX|0;X<ST.camX+480&&X<W;X++){if(Y<0)continue;const i=Y*W+X;if(KIND[t[i]]===S&&R()<.5&&!(Y>gy(X)+20)){if(n++%9===0&&ST.np<MP-300)spawnFlake(X,Y,.3+R()*.6,-.2-R()*.4,col[i],200,0);setc(i,EMPTY);}}
          hurtTarget(e,Math.min(60,pl_.hp*.5));}if(m.t>110){m.act=null;e.cd=90;}}}
  },
  draw(e){const f=e.face,x=e.x,y=e.y,fl=e.flash>0,m=e.mem,o={flash:fl},walk=Math.sin(x*.12)*6;
    const SKN=C(150,96,170),GOLD=C(220,176,60),BLU=C(52,74,150),DG=C(150,110,40);
    TK.begin();
    TK.cap(x-9,y+6,x-12+walk,y+44,9,7,BLU,o);TK.cap(x+9,y+6,x+12-walk,y+44,9,7,BLU,o);TK.ell(x-12+walk,y+45,9,4,GOLD,o);TK.ell(x+12-walk,y+45,9,4,GOLD,o);
    TK.ell(x,y-12,22,24,BLU,o);TK.poly([[x-20,y-30],[x+20,y-30],[x+12,y],[x-12,y]],GOLD,o);TK.ell(x,y+6,18,5,DG,o);
    const raise=m.act?1:0,gx=x+f*(raise?26:20),gyv=y+(raise?-30:4);
    TK.cap(x+f*18,y-28,gx,gyv,8,7,BLU,o);TK.ell(gx,gyv,8,8,GOLD,o);
    TK.cap(x-f*18,y-28,x-f*22,y+4,8,7,BLU,o);TK.ell(x-f*22,y+6,6,6,SKN,o);
    TK.ell(x-f*18,y-30,9,7,GOLD,o);TK.ell(x+f*18,y-30,9,7,GOLD,o);
    const hx=x+f*2,hy=y-38;TK.ell(hx,hy,12,13,GOLD,o);TK.ell(hx+f*3,hy+3,8,9,SKN,o);TK.poly([[hx-10,hy-10],[hx+10,hy-10],[hx+6,hy-17],[hx-6,hy-17]],GOLD,o);
    TK.end();
    let k=0;for(const c of Object.values(STONES)){TK.glowDot(gx-3+(k%3)*3,gyv-2+(k/3|0)*3,0,C(c[0],c[1],c[2]));k++;}
    TK.glowDot(hx+f*5,hy+1,0,C(255,255,255));},
  onDeath(e){bigDeath(e,[170,60,255]);}});

// ================= DORMAMMU =================
defineEnemy('mindless',{hp:120,w:12,h:22,fly:false,score:60,boom:6,metal:false,glow:'*',
  sprite:["...oooooo...","..oOOOOOOo..","..oO*OO*Oo..","..oOOOOOOo..","...oooooo...","..kkkkkkkk..",".kKKKKKKKKk.","kKKKKKKKKKKk","kKK.KKKK.KKk","kK..KKKK..Kk","....KKKK....","....KKKK....","...KK..KK...","...KK..KK...","...KK..KK...","...KK..KK...","...KK..KK...","...KK..KK...","...KK..KK...","..KKK..KKK..","............","............"],
  pal:{o:C(200,60,20),O:C(255,150,40),'*':C(255,250,200),k:C(30,24,34),K:C(70,58,76)},
  think(e){const p=player(),dx=p.x-e.x;e.face=dx>0?1:-1;e.vx+=(e.face*.7-e.vx)*.1;if(Math.abs(dx)<14&&Math.abs(p.y-e.y)<20&&e.cd===0){hurtTarget(e,9);e.cd=40;}if(e.mem.blocked===e.t&&e.ground)e.vy=-4;}});
defineEnemy('dormammu',{hp:7000,w:170,h:190,fly:true,titan:true,score:18000,boom:30,metal:false,title:'DORMAMMU',glow:'',sprite:['.'],pal:{},
  think(e){const m=e.mem,ph=phase(e,['','THE DARK DIMENSION RISES','YOU WILL BEG']),p=player();
    if(!m.init){m.init=1;m.eyes=[part(e,22,14,2.6),part(e,22,14,2.6)];e.cd=100;m.bx=e.x;}
    const tx=p.x+Math.sin(e.t*.004)*200,ty=Math.min(p.y-150,gy(p.x|0)-220);e.x+=(tx-e.x)*.006*(1+ph*.3);e.y+=(ty-e.y)*.01;e.face=p.x>e.x?1:-1;
    place(m.eyes[0],e.x-34,e.y-20);place(m.eyes[1],e.x+34,e.y-20);
    if(R()<.6)spawn(e.x+(R()-.5)*e.def.w,e.y-e.def.h*.45+R()*20,(R()-.5)*1,-1-R()*2,R()<.5?C(255,200,60):C(255,100,20),30,0,1,0,1);
    if(!m.act&&e.cd<=0){const opts=['breath','pillars'];if(ph>=2)opts.push('mindless','hand');if(ph>=3)opts.push('rain','breath');m.act=opts[R()*opts.length|0];m.t=0;
      fxWord(e.x,e.y-110,{breath:'BURN!',pillars:'THE FLAMES OF FALTINE!',mindless:'MINDLESS ONES, FEAST!',hand:'COME TO ME!',rain:'BOW BEFORE DORMAMMU!'}[m.act],1.3,'#ff8c2a',true);}
    if(m.act){m.t++;
      if(m.act==='breath'){const mx=e.x,my=e.y+40;if(m.t>20){const dx2=p.x-mx,dy2=p.y-my,d=Math.hypot(dx2,dy2)||1;for(let k=0;k<6;k++){const a=Math.atan2(dy2,dx2)+(R()-.5)*.5,sp=4+R()*3;spawn(mx,my,Math.cos(a)*sp,Math.sin(a)*sp,R()<.5?C(255,220,80):C(255,90,20),40,R()<.1?FIRE:0,1,1);}
          tBeam(e,mx,my,p.x,p.y,{w:6,dmg:.7,boom:4,g:[255,120,30],c:[255,230,150],len:600});}if(m.t>130){m.act=null;e.cd=90;}}
      else if(m.act==='pillars'){if(m.t===1)m.ps=[0,1,2,3,4].map(k=>p.x+(k-2)*50+(R()-.5)*20);for(const x of m.ps){const g=gy(x|0);if(m.t<45){if(m.t%6===0)rings.push({x,y:g,r:14,vr:.5,life:6,c:[255,120,30]});}
          else if(m.t<75){for(let k=0;k<3;k++)spawn(x+(R()-.5)*10,g,(R()-.5),-6-R()*5,R()<.5?C(255,230,120):C(255,90,20),40,R()<.2?FIRE:0,1,1);if(Math.abs(pl_.x-x)<12&&pl_.y>g-200)hurtTarget(e,1.4);if(m.t===46)explode(x|0,g,10,{enemy:true,dmg:12,fire:.6});}}
        if(m.t>80){m.act=null;e.cd=70;}}
      else if(m.act==='mindless'){if(m.t%25===1){const x=p.x+(R()<.5?-1:1)*(80+R()*80);spawnEnemy('mindless',x,gy(x|0)-14);rings.push({x,y:gy(x|0),r:20,vr:1,life:12,c:[255,120,30]});}if(m.t>80){m.act=null;e.cd=100;}}
      else if(m.act==='hand'){const hand=m.hand||(m.hand={x:p.x,y:gy(p.x|0)+30});if(m.t<50){hand.x+=(p.x-hand.x)*.05;hand.y=gy(hand.x|0)+30-m.t*.2;if(m.t%5===0)spawn(hand.x,hand.y-10,(R()-.5)*3,-2,C(255,140,40),30,0,1,1);}
        else if(m.t<62){hand.y-=12;if(Math.abs(pl_.x-hand.x)<26&&pl_.y>hand.y-30&&pl_.y<hand.y+40){hurtTarget(e,26);pl_.vy=-8;}if(m.t===50)smash(e,hand.x,gy(hand.x|0),16,20,[255,120,30]);}
        else{m.act=null;m.hand=null;e.cd=80;}}
      else if(m.act==='rain'){if(m.t%4===0)meteor(e,p.x,[255,140,40],9);if(m.t>140){m.act=null;e.cd=100;}}}
  },
  draw(e){const x=e.x,y=e.y,fl=e.flash>0,m=e.mem,o={flash:fl},T=ST.frame;
    TK.begin();
    for(let k=0;k<14;k++){const a=-Math.PI+k/13*Math.PI,r=86+Math.sin(T*.12+k*1.7)*10,fx=x+Math.cos(a)*70,fy=y-20+Math.sin(a)*80;TK.cap(fx,fy,fx+Math.cos(a)*r*.5+Math.sin(T*.1+k)*8,fy+Math.sin(a)*r*.6-20,14,3,k%2?C(255,140,30):C(255,210,70),{...o,glow:true,flat:true});}
    TK.ell(x,y,80,92,C(250,120,30),o);TK.ell(x,y+6,64,78,C(40,14,46),o);TK.ell(x,y-30,40,26,C(64,24,70),o);
    TK.poly([[x-40,y+44],[x+40,y+44],[x+20,y+66],[x-20,y+66]],C(255,170,60),{...o,glow:true});
    const hand=m.hand;if(hand){TK.ell(hand.x,hand.y,22,30,C(255,130,30),{...o,glow:C(200,70,20)});for(let k=-2;k<=2;k++)TK.cap(hand.x+k*8,hand.y-20,hand.x+k*10,hand.y-50,5,3,C(255,170,60),{...o,glow:true});}
    TK.end();
    for(const ex of [-34,34])TK.ell(x+ex,y-20,14,7,C(255,250,220),{glow:C(255,230,160),flat:true});},
  onDeath(e){bigDeath(e,[255,140,40]);for(const o of enemies)if(o.def.name==='mindless'){o.mem.noScore=true;o.hp=0;}}});

// ================= SURTUR =================
defineEnemy('surtur',{hp:8000,w:110,h:230,fly:true,titan:true,score:19000,boom:30,metal:false,title:'SURTUR',glow:'',sprite:['.'],pal:{},
  think(e){const m=e.mem,ph=phase(e,['','THE ETERNAL FLAME','RAGNAROK']),p=player();
    if(!m.init){m.init=1;m.head=part(e,30,30,2.4);m.heart=part(e,30,30,1.5);e.cd=110;m.step=0;m.sa=-.6;}
    const dx=p.x-e.x;if(!m.act)e.face=dx>0?1:-1;
    if(!m.act&&Math.abs(dx)>120){e.x+=Math.sign(dx)*(.3+ph*.08);m.step++;if(m.step%70===0){const fx=e.x+(m.step%140?-24:24),fy=e.y+112;smash(e,fx,fy,10,10,[255,120,30]);for(let k=0;k<3;k++)explode(fx+(R()-.5)*30|0,fy-20-R()*90|0,7,{enemy:true,dmg:0,quiet:true,self:true,fire:.3});}}
    const g=floorY(e.x);e.y+=(g-115-e.y)*.08;place(m.head,e.x+e.face*4,e.y-92);place(m.heart,e.x,e.y-30);
    const sx=e.x+e.face*50,sy=e.y-56; // sword hand
    if(!m.act&&e.cd<=0){const opts=['sweep','chop'];if(ph>=2)opts.push('rain','chop');if(ph>=3)opts.push('sweep','erupt');m.act=opts[R()*opts.length|0];m.t=0;
      fxWord(e.x,e.y-150,{sweep:'TWILIGHT SWORD!',chop:'FALL, ASGARD!',rain:'BURN!',erupt:'THE WORLD ENDS IN FIRE!'}[m.act],1.4,'#ff6b2a',true);}
    let ang=m.act==='sweep'?(m.t<40?-1.9:-1.9+(m.t-40)/28*2.6):m.act==='chop'?(m.t<40?-2.3+m.t*.005:-2.3+(m.t-40)/10*2.1):-.6;
    ang=Math.min(ang,.9);m.sa+=(ang-m.sa)*.4;
    const L=200,tipx=sx+Math.cos(m.sa)*L*e.face,tipy=sy+Math.sin(m.sa)*L;m.tip=[tipx,tipy];
    if(m.act){m.t++;
      if(m.act==='sweep'||m.act==='chop'){const live=m.act==='sweep'?m.t>40&&m.t<68:m.t>40&&m.t<50;
        if(live){sliceLine(sx,sy,tipx,tipy,{edge:[255,150,50],w:1,push:1.6,quiet:m.t%3!==0});
          for(let k=0;k<6;k++){const u=R();spawn(sx+(tipx-sx)*u,sy+(tipy-sy)*u,(R()-.5)*2,-1-R()*2,R()<.5?C(255,220,90):C(255,90,20),24,R()<.1?FIRE:0,1,1);}
          const L2=(tipx-sx)**2+(tipy-sy)**2,u=Math.max(0,Math.min(1,((pl_.x-sx)*(tipx-sx)+(pl_.y-8-sy)*(tipy-sy))/L2));if(Math.hypot(sx+(tipx-sx)*u-pl_.x,sy+(tipy-sy)*u-pl_.y+8)<14&&!(m.hitT>e.t)){hurtTarget(e,30);m.hitT=e.t+20;pl_.vx+=e.face*6;pl_.vy=-4;}}
        if(m.act==='chop'&&m.t===50){smash(e,tipx,gy(tipx|0),18+ph*3,26,[255,110,30]);for(let k=-3;k<=3;k++)if(k)explode(tipx+k*30|0,gy(tipx+k*30|0),6,{enemy:true,dmg:6,fire:.8,quiet:true});}
        if(m.t>(m.act==='sweep'?80:70)){m.act=null;e.cd=80;}}
      else if(m.act==='rain'){if(m.t%5===0)meteor(e,p.x,[255,120,30],10);if(m.t>120){m.act=null;e.cd=90;}}
      else if(m.act==='erupt'){if(m.t%10===0){const x=p.x+(R()-.5)*200,g2=gy(x|0);explode(x|0,g2,12,{enemy:true,dmg:12,fire:.6,col:[255,120,30]});for(let k=0;k<20;k++)spawn(x,g2,(R()-.5)*3,-4-R()*5,C(255,110,20),80,R()<.4?LAVA:0,1,1);}if(m.t>100){m.act=null;e.cd=100;}}}
  },
  draw(e){const f=e.face,x=e.x,y=e.y,fl=e.flash>0,m=e.mem,o={flash:fl},sw=Math.sin((m.step||0)*.045)*9,T=ST.frame;
    const RK=C(48,36,40),LV=C(255,110,30),HR=C(36,26,30);
    TK.begin();
    TK.cap(x-16,y+20,x-20+sw,y+112,16,12,RK,o);TK.cap(x+16,y+20,x+20-sw,y+112,16,12,RK,o);
    TK.ell(x,y-24,42,54,RK,o);TK.ell(x,y-30,14,16,LV,{...o,glow:C(255,120,30)});
    TK.cap(x-f*40,y-66,x-f*54,y-10,13,11,RK,o);TK.ell(x-f*54,y-6,11,10,RK,o);
    const sx=x+f*50,sy=y-56;TK.cap(x+f*40,y-66,sx,sy,13,11,RK,o);TK.ell(sx,sy,12,11,RK,o);
    const hx=x+f*4,hy=y-92;TK.ell(hx,hy,20,22,HR,o);TK.cap(hx-14,hy-12,hx-34,hy-48,6,2,HR,o);TK.cap(hx+14,hy-12,hx+34,hy-48,6,2,HR,o);
    for(let k=0;k<7;k++){const a=-Math.PI*.15-k*.12;TK.cap(hx-24+k*8,hy-20,hx-24+k*8+Math.sin(T*.2+k)*4,hy-44-Math.sin(T*.15+k*2)*8,5,1,k%2?C(255,170,50):LV,{...o,glow:true,flat:true});}
    TK.end();
    const tip=m.tip||[sx,sy-200];TK.begin();TK.cap(sx,sy,tip[0],tip[1],5,2,C(255,200,90),{glow:C(255,140,40)});TK.end();
    for(let k=0;k<8;k++){const u=R();spawn(sx+(tip[0]-sx)*u+(R()-.5)*4,sy+(tip[1]-sy)*u,(R()-.5)*.6,-.8-R(),R()<.5?C(255,220,90):C(255,90,20),14,0,1,0,1);}
    TK.glowDot(hx+f*6,hy,1,C(255,240,150));TK.glowDot(hx-f*2,hy,1,C(255,240,150));
    for(let k=0;k<10;k++){const yy=y-60+k*14,xx=x+Math.sin(k*1.7)*24;TK.glowDot(xx,yy,0,LV);}},
  onDeath(e){bigDeath(e,[255,120,30]);}});

// ================= KNULL =================
defineEnemy('symbiote_dragon',{hp:160,w:22,h:10,fly:true,score:80,boom:6,metal:false,glow:'*',
  sprite:["......kkkk..........","....kkKKKKkk.....kk.","kk.kKKKKKKKKkkkkKKk.","kKkKKw*KKKKKKKKKKKKk","kKKKKKKKKKKKKKKKKKk.",".kKKKKKKKKKKKkkkkk..","..kkWWWkkKKKk.......","....kk..kkkk........","..........kk........","....................",],
  pal:{k:C(14,12,20),K:C(36,34,48),w:C(240,240,250),'*':C(255,255,255),W:C(230,230,240)},
  think(e){const p=player();const dx=p.x-e.x,dy=p.y-8-e.y,d=Math.hypot(dx,dy)||1;e.vx+=(dx/d*2.6-e.vx)*.05;e.vy+=(dy/d*2.6-e.vy)*.05;e.face=dx>0?1:-1;if(d<14&&e.cd===0){hurtTarget(e,8);e.cd=30;}}});
defineEnemy('knull',{hp:6500,w:40,h:84,fly:true,titan:true,score:17000,boom:24,metal:false,title:'KNULL',glow:'',sprite:['.'],pal:{},
  think(e){const m=e.mem,ph=phase(e,['','THE DARK DESCENDS','KING IN BLACK']),p=player();
    if(!m.init){m.init=1;m.head=part(e,18,18,2.4);e.cd=80;}
    const tx=p.x-(p.x>e.x?120:-120),ty=Math.min(p.y-40,gy(p.x|0)-60);if(!m.act){e.x+=(tx-e.x)*.012*(1+ph*.4);e.y+=(ty-e.y)*.02;e.face=p.x>e.x?1:-1;}
    place(m.head,e.x+e.face*2,e.y-34);ST.dark=ph>=2?Math.min(1,(ST.dark||0)+.01):Math.max(0,(ST.dark||0)-.02);
    if(!m.act&&e.cd<=0){const opts=['necro','tendrils'];if(ph>=2)opts.push('dragons','necro');if(ph>=3)opts.push('kingdom','tendrils');m.act=opts[R()*opts.length|0];m.t=0;
      fxWord(e.x,e.y-60,{necro:'ALL-BLACK!',tendrils:'JOIN THE HIVE',dragons:'MY DRAGONS!',kingdom:'THE KING IN BLACK!'}[m.act],1.3,'#e6e6f2',true);}
    if(m.act){m.t++;
      if(m.act==='necro'){if(m.t===1){m.dx=p.x-e.x;m.dy=p.y-8-e.y;}if(m.t<30){e.x-=Math.sign(m.dx)*.6;}else if(m.t<44){const d=Math.hypot(m.dx,m.dy)||1;e.x+=m.dx/d*14;e.y+=m.dy/d*14;e.x=Math.max(20,Math.min(W-20,e.x));
          sliceLine(e.x-m.dx/d*30,e.y-m.dy/d*30,e.x+m.dx/d*50,e.y+m.dy/d*50,{edge:[200,200,230],push:1.4,quiet:m.t%4!==0});if(Math.hypot(pl_.x-e.x,pl_.y-8-e.y)<26&&!(m.hitT>e.t)){hurtTarget(e,24);m.hitT=e.t+30;}}
        else{m.act=null;e.cd=50+(3-ph)*20;}}
      else if(m.act==='tendrils'){if(m.t===1)m.roots=[0,1,2,3,4,5].map(k=>p.x+(k-2.5)*40);for(const x of m.roots){const g=gy(x|0),h=Math.min(1,m.t/30)*120;const pts=[];for(let k=0;k<=8;k++){const u=k/8;pts.push([x+Math.sin(u*6+ST.frame*.2+x)*8*u,g-h*u]);}beams.push({pts,life:2,c:[60,60,80],g:[180,180,220]});
          if(m.t>30&&Math.abs(pl_.x-x)<10&&pl_.y>g-h&&pl_.y<g+10){hurtTarget(e,.9);pl_.vx*=.6;pl_.vy=Math.max(pl_.vy,1);}}if(m.t>130){m.act=null;e.cd=80;}}
      else if(m.act==='dragons'){if(m.t%30===1)spawnEnemy('symbiote_dragon',e.x+(R()-.5)*40,e.y-20);if(m.t>95){m.act=null;e.cd=120;}}
      else if(m.act==='kingdom'){if(m.t%12===0){const a=R()*6.283,L=160;sliceLine(p.x-Math.cos(a)*L,p.y-Math.sin(a)*L,p.x+Math.cos(a)*L,p.y+Math.sin(a)*L,{edge:[220,220,255],push:1.5});}if(m.t>110){m.act=null;e.cd=110;}}}
  },
  draw(e){const f=e.face,x=e.x,y=e.y,fl=e.flash>0,m=e.mem,o={flash:fl},T=ST.frame;
    const BK=C(22,20,30),GR=C(54,52,70),WH=C(236,236,244);
    TK.begin();
    for(let k=0;k<8;k++){const a=Math.PI*.2+k/7*Math.PI*.6,r=40+Math.sin(T*.08+k)*12;TK.cap(x,y-10,x+Math.cos(a+Math.sin(T*.05+k)*.3)*r*(k%2?1:-1),y-10-Math.sin(a)*r*.6,4,1,BK,o);}
    TK.cap(x-7,y+4,x-9,y+42,7,5,BK,o);TK.cap(x+7,y+4,x+9,y+42,7,5,BK,o);
    TK.ell(x,y-12,18,22,GR,o);TK.poly([[x-14,y-24],[x+14,y-24],[x,y+6]],BK,o);
    const sx=x+f*24,sy=y-14;TK.cap(x+f*14,y-26,sx,sy,6,5,GR,o);TK.cap(x-f*14,y-26,x-f*20,y+2,6,5,GR,o);
    const ang=m.act==='necro'&&m.t>=30?Math.atan2(m.dy,m.dx):-1.2*f+(f<0?Math.PI:0);
    TK.cap(sx,sy,sx+Math.cos(ang)*50,sy+Math.sin(ang)*50,3,1,C(30,30,40),o);
    const hx=x+f*2,hy=y-34;TK.ell(hx,hy,11,12,WH,o);TK.ell(hx,hy+3,9,8,BK,o);for(let k=-2;k<=2;k++)TK.cap(hx+k*4,hy-8,hx+k*7,hy-18-Math.abs(k)*2,2,1,WH,o);
    TK.end();TK.glowDot(hx-3,hy+2,1,WH);TK.glowDot(hx+3,hy+2,1,WH);},
  onDeath(e){bigDeath(e,[200,200,230]);ST.dark=0;for(const o of enemies)if(o.def.name==='symbiote_dragon'){o.mem.noScore=true;o.hp=0;}}});

// where each titan makes its stand, for modes and the spawn menu
export const TITAN_INFO={
  galactus:{map:'city',sub:'the Devourer of Worlds'},thanos:{map:'titan',sub:'the Mad Titan'},dormammu:{map:'dark',sub:'Lord of the Dark Dimension'},
  surtur:{map:'asgard',sub:'Ragnarok'},knull:{map:'knowhere',sub:'the King in Black'}};
export function spawnTitan(id,x){const d={galactus:[150,220],thanos:[46,60],dormammu:[0,260],surtur:[115,200],knull:[60,120]}[id]||[100,100];
  const sx=Math.max(80,Math.min(W-80,x)),e=spawnEnemy(id,sx,gy(sx|0)-d[0]-(id==='dormammu'?d[1]:0));
  if(e){rings.push({x:e.x,y:e.y,r:80,vr:4,life:20,c:[255,230,180]});ST.slowT=Math.max(ST.slowT,90);ST.shake=22;shockFx(e.x,e.y,1.4);snd('boom',e.x,e.y,{size:2.5});
    document.body.classList.add('cine');clearTimeout(cineT);cineT=setTimeout(()=>document.body.classList.remove('cine'),2600);}
  return e;}
let cineT=0;
