// Kit overhaul, part B (2026-10-30): the replacement powers for Captain Marvel, Silver Surfer, Ghost Rider, Deadpool,
// Thanos, Hela, Moon Knight, Star-Lord, Miles Morales and Kang. The enemy states they use (e.ov) live in kits4a.js.
import { ST } from '../state.js';
import { FIRE, GFIRE, GLASS, KIND, LAVA, OBSID, R, S, STEEL, WATER, rgb } from '../world/materials.js';
import { H, VH, VW, W, col, setc, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { beamCore, quake, shockFx, shots, zap } from './powers.js';
import { ACT } from './xmen.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy, spawnEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { nearestN, tagged } from './kits2a.js';
import { atCursor, boxE, noTarget } from './kits3a.js';
import { pix } from '../render/canvas.js';
import { screenFlash } from '../render/vfxcore.js';
import { DEAD, bolt, live, onScreen, ov, ring, solid, spiderSense, word } from './kits4a.js';

// ================= CAPTAIN MARVEL =================
const PH=[255,200,90];
const MARVEL=[
 // she fires what she has absorbed: each blast spends a quarter of her energy, and its size and damage grow with what it spent
 {n:'Photon Blast',fn:(a,p,use)=>{const sp=Math.max(4,p.en*.25);if(!use(sp))return;ST.cd=10;const b=sp>18;snd('zap',a.h.x,a.h.y,{pitch:b?.6:1.2,v:.6});
   shots.push({x:a.h.x,y:a.h.y,vx:a.dx*8,vy:a.dy*8,type:'photon',life:90,boom:5+sp*.35|0,col:PH,ecol:PH,dmg:8+sp*1.4});if(b)p.vx-=a.dx*1.5;}},
 // Seventh Sense: for six seconds every hit she takes is halved and answered at once with a photon counter-punch
 {n:'Seventh Sense',fn:(a,p,use)=>{if(p.seventh>0||!use(22))return;ST.cd=70;p.seventh=360;word(p.x,p.y-ST.PH-8,'SEVENTH SENSE','#ffcf6a');snd('psi',p.x,p.y,{pitch:1.2,v:.5});
   ACT.push(()=>{if(--p.seventh<=0||ST.CH.id!=='marvel'){p.seventh=0;return false;}if(ST.frame%8===0){const an=R()*6.283;spawn(p.x+Math.cos(an)*12,p.y-ST.PH/2+Math.sin(an)*14,0,0,rgb(255,220,140),10,0,1,0,1);}return true;});}},
 // a photon blast at the ground (or anything) throws her the other way: recoil flight, and the blast still hurts what it hits
 {n:'Photon Thrust',fn:(a,p,use)=>{if(!use(12))return;ST.cd=20;const x=a.h.x+a.dx*14,y=a.h.y+a.dy*14;explode(x|0,y|0,7,{self:true,col:PH});damageCone(a.h.x,a.h.y,a.dx,a.dy,40,20,5);p.vx=-a.dx*8;p.vy=-a.dy*8-1;p.ground=false;snd('jet',p.x,p.y,{pitch:1.3});}},
 // she banks her energy as a shield: everything above 20 energy becomes one and a half times as much damage soak
 {n:'Energy Overflow',fn:(a,p,use)=>{if(p.en<30||p.oshield>0){noTarget('#ffcf6a','NEED 30 ENERGY');return;}const s=(p.en-20)*1.5;p.en=20;p.oshield=s;ST.cd=50;word(p.x,p.y-ST.PH-8,'+'+(s|0)+' SHIELD','#ffcf6a');snd('charge',p.x,p.y,{pitch:1.4});
   ACT.push(()=>{if(!(p.oshield>0)||ST.CH.id!=='marvel'){p.oshield=0;return false;}if(ST.frame%3===0){const an=R()*6.283;spawn(p.x+Math.cos(an)*10,p.y-ST.PH/2+Math.sin(an)*13,0,0,rgb(255,200,90),8,0,1,0,1);}return true;});}},
 // the ultimate: she drinks every enemy shot, fire and pool of lava around her for a second, then lets it all out as one beam
 {n:'Binary Supernova',fn:(a,p,use)=>{if(!use(70))return;ST.cd=200;let k=0,n=0;p.binary=Math.max(p.binary||0,300);word(p.x,p.y-ST.PH-14,'BINARY SUPERNOVA','#ffcf6a',1.3);snd('charge',p.x,p.y,{pitch:.5,v:1});
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2;
     if(k<60){for(let i=shots.length-1;i>=0;i--){const s=shots[i];if(s.owner!=='enemy')continue;const dx=cx-s.x,dy=cy-s.y,d=Math.hypot(dx,dy)||1;s.vx=dx/d*6;s.vy=dy/d*6;if(d<8){shots.splice(i,1);n+=3;}}
       for(let j=0;j<60;j++){const X=cx+(R()-.5)*160|0,Y=cy+(R()-.5)*120|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(m===FIRE||m===GFIRE||m===LAVA){setc(i,0);n++;spawn(X,Y,(cx-X)*.05,(cy-Y)*.05,rgb(255,190,80),20,0,1,0,1);}}
       if(k%4===0)ring(cx,cy,40-k*.5,PH,6);return true;}
     if(k===60)word(cx,cy-ST.PH-8,'x'+n,'#ffcf6a');const h=hand(),dx=mouse.wx-h.x,dy=mouse.wy-h.y,d=Math.hypot(dx,dy)||1;
     beamCore({h,dx:dx/d,dy:dy/d,d},{pow:200+n*12,rad:3+Math.min(4,n*.05),len:520,w:5+(ST.frame&1),c:[255,250,230],g:PH,spark:()=>rgb(255,200+R()*55,90),dmg:6+Math.min(10,n*.12),noAsh:true});
     return k<130;});}},
];

// ================= SILVER SURFER =================
const SURFER=[
 // the Power Cosmic rearranges matter: the bolt turns the rock it strikes into crystal, which shatters a moment later into shrapnel
 {n:'Cosmic Bolt',fn:(a,p,use)=>{if(!use(5))return;ST.cd=9;snd('zap',a.h.x,a.h.y,{pitch:1.5,v:.5});
   bolt(a.h.x,a.h.y,a.dx*9,a.dy*9,60,(x,y)=>spawn(x,y,0,0,R()<.5?rgb(210,240,255):rgb(110,190,255),6,0,1,0,1),(e)=>hitEnemy(e,14,a.dx*2,a.dy*2),(x,y)=>{const cx=x|0,cy=y|0,r=7,cells=[];
     for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){if(xx*xx+yy*yy>r*r)continue;const X=cx+xx,Y=cy+yy;if(X<1||X>=W-1||Y<0||Y>=H-44)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){setc(i,GLASS);col[i]=rgb(170+R()*60|0,220+R()*35|0,255);cells.push(i);}}
     let k=0;ACT.push(()=>{if(++k<24)return true;explode(cx,cy,6,{self:true,quiet:true,col:[180,230,255]});damageEnemies(cx,cy,30,16,0,-2,true);
       for(let j=0;j<16;j++){const an=R()*6.283,sp=2+R()*3;spawn(cx,cy,Math.cos(an)*sp,Math.sin(an)*sp,rgb(200,240,255),20,0,1,1);}snd('glass',cx,cy,{v:.6});return false;});});}},
 // he goes intangible for three seconds: nothing touches him, and anything he passes through is burned by the Power Cosmic
 {n:'Phase Through',fn:(a,p,use)=>{if(p.dodge>0||!use(22))return;ST.cd=60;p.dodge=180;word(p.x,p.y-ST.PH-8,'PHASED','#cfe8ff');snd('whoosh',p.x,p.y,{pitch:1.6});
   ACT.push(()=>{if(!(p.dodge>0)||ST.CH.id!=='surfer')return false;if(ST.frame%6===0)for(const e of enemies)if(live(e)&&Math.abs(e.x-p.x)<e.def.w/2+6&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+ST.PH/2)hitEnemy(e,6,0,0);
     if(ST.frame%2===0)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,0,0,rgb(200,230,255),10,0,1,0,1);return true;});}},
 // cosmic awareness: every enemy on the map shows through walls for ten seconds
 {n:'Cosmic Awareness',fn:(a,p,use)=>{if(ST.senseT>0||!use(16))return;ST.senseT=600;ST.cd=40;ring(p.x,p.y-ST.PH/2,4,[170,220,255],24,7);word(p.x,p.y-ST.PH-8,'I SEE ALL','#cfe8ff');snd('psi',p.x,p.y,{pitch:1.5,v:.5});}},
];

// ================= GHOST RIDER =================
const RIDER=[
 // for five seconds he takes half damage and remembers all of it; when it ends, the sum comes back as hellfire on every enemy near him, two and a half times over
 {n:'Retribution',fn:(a,p,use)=>{if(p.retri>0||!use(20))return;ST.cd=80;p.retri=300;p.retriD=0;word(p.x,p.y-ST.PH-8,'YOUR SINS ARE MINE','#ff8a3c');snd('roar',p.x,p.y,{pitch:.6,v:.6});
   ACT.push(()=>{if(ST.CH.id!=='rider'){p.retri=0;return false;}if(--p.retri>0){if(ST.frame%4===0)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,0,-.6,R()<.5?rgb(255,140,40):rgb(255,220,120),14,0,1,0,1);return true;}
     const list=nearestN(p.x,p.y,220,8),d=p.retriD*2.5;if(list.length&&d>0){for(const e of list){tagged('fire',()=>hitEnemy(e,d/list.length+8,0,-2));zap(p.x,p.y-ST.PH/2,e.x,e.y,[255,220,140],[255,100,20]);}word(p.x,p.y-ST.PH-8,'RETRIBUTION '+(d|0),'#ff8a3c');snd('fireburst',p.x,p.y);}
     p.retriD=0;return false;});}},
 // the ultimate: the chain lashes every enemy around him, drags them all into one pile at his feet, and hellfire erupts under it
 {n:'Judgement',fn:(a,p,use)=>{if(!use(65))return;ST.cd=200;const list=enemies.filter(e=>live(e)&&Math.abs(e.x-p.x)<260&&Math.abs(e.y-p.y)<170);let k=0;ST.hitstop=Math.max(ST.hitstop,6);word(p.x,p.y-ST.PH-14,'JUDGEMENT','#ff8a3c',1.4);snd('roar',p.x,p.y,{pitch:.5,v:1});
   ACT.push(()=>{k++;const tx=p.x+p.face*40,ty=p.y-10;for(const e of list){if(!live(e))continue;if(!e.def.titan){ov(e).held=2;e.x+=(tx-e.x)*.08;e.y+=(ty-e.y)*.08;e.vx=e.vy=0;}if(k%3===0)beams.push({pts:[[p.x,p.y-ST.PH/2],[(p.x+e.x)/2,(p.y+e.y)/2-14],[e.x,e.y]],life:3,c:[255,200,120],g:[255,90,20]});}
     if(k<45)return true;for(const e of list)if(live(e)){tagged('fire',()=>hitEnemy(e,e.def.titan?80:120,0,-6));applyStatus(e,'burn',300);}
     for(let j=0;j<4;j++)explode(tx+(R()-.5)*20|0,ty-j*10|0,12,{self:true,fire:.8,col:[255,120,30]});shockFx(tx,ty,1.4);snd('boom',tx,ty,{v:1});return false;});}},
];

// ================= DEADPOOL =================
const POOL=[
 // he breaks the fourth wall: every enemy on screen is hauled toward the nearest edge of the screen and splats into whatever is in the way
 {n:'Fourth Wall Break',fn:(a,p,use)=>{if(!use(45))return;ST.cd=120;fxWord(p.x,p.y-ST.PH-14,'THE EDITOR WANTS YOU OUT OF FRAME',.8,'#ffc93c',true);ST.hitstop=Math.max(ST.hitstop,8);
   for(const e of enemies){if(!live(e)||!onScreen(e)||e.def.titan)continue;const l=e.x-ST.camX,r=ST.camX+VW-e.x,u=e.y-ST.camY,m=Math.min(l,r,u);
     if(m===l)e.vx=-12;else if(m===r)e.vx=12;else e.vy=-10;e.thrownT=60;hitEnemy(e,20,0,0);}snd('whoosh',p.x,p.y,{pitch:.5});}},
 // he pulls his own arm off and throws it: the arm crawls after enemies and stabs them for six seconds, and the stump regrows a little health
 {n:'Detached Arm',fn:(a,p,use)=>{if(summons.some(s=>s.arm)||!use(16))return;ST.cd=50;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.04);fxWord(p.x,p.y-ST.PH-10,'NEED A HAND?',.8,'#ffc93c',true);snd('rip',p.x,p.y,{pitch:1.3});
   summons.push({arm:true,x:a.h.x,y:a.h.y,vx:a.dx*5,vy:a.dy*5-2,life:360,cd:0,
     upd(s){s.vy+=.3;const nx=s.x+s.vx,ny=s.y+s.vy;if(solid(nx,s.y))s.vx*=-.4;else s.x=nx;if(solid(s.x,ny)){s.vy=0;s.vx*=.7;}else s.y=ny;
       const e=nearestEnemy(s.x,s.y,160);if(e){if(Math.abs(s.vy)<.1)s.vx+=(Math.sign(e.x-s.x)*1.6-s.vx)*.2;if(Math.abs(e.x-s.x)<e.def.w/2+3&&Math.abs(e.y-s.y)<e.def.h/2+4&&--s.cd<=0){s.cd=14;hitEnemy(e,8,Math.sign(e.x-s.x),-1);spawn(s.x,s.y,0,-1,rgb(200,30,40),10,0,0,1);if(Math.abs(s.vy)<.1)s.vy=-2;}}},
     draw(s){const c=rgb(160,24,34),k=rgb(30,20,20);for(let x=-3;x<=3;x++)pix(s.x+x,s.y,c,0);pix(s.x+4,s.y-1,k,0);pix(s.x+4,s.y,k,0);pix(s.x-4,s.y,rgb(220,200,180),0);}});}},
];

// ================= THANOS =================
const THANOS=[
 // a backhand that launches the nearest foe into a flight: it smashes through other enemies and splats on what it hits
 {n:'Titan Punch',fn:(a,p,use)=>{if(!use(5))return;ST.cd=16;p.punchF=10;const f=a.dx<0?-1:1,e=nearestEnemy(p.x+f*12,p.y-ST.PH/2,24);
   if(e&&!e.def.titan){hitEnemy(e,20,0,0);e.vx=f*10;e.vy=-4;e.thrownT=45;fxWord(e.x,e.y-e.def.h/2-8,'LAUNCHED',.7,'#c89bff',true);snd('punch',e.x,e.y,{pitch:.7});}
   else{const x=a.h.x+a.dx*8,y=a.h.y+a.dy*8;explode(x|0,y|0,7,{self:true,quiet:true,col:[170,110,220]});damageEnemies(x,y,12,22,a.dx*5,a.dy*5-2);}}},
 // the Power Stone floods the gauntlet: the next three casts are cones of purple ruin that erase rock and hurl foes
 {n:'Power Stone',fn:(a,p,use)=>{if(p.pstone>0&&ST.frame-p.pstT>480)p.pstone=0;
   if(!(p.pstone>0)){if(!use(22))return;ST.cd=20;p.pstone=3;p.pstT=ST.frame;fxWord(p.x,p.y-ST.PH-8,'POWER',1,'#c070ff',true);snd('charge',p.x,p.y,{pitch:.6});return;}
   ST.cd=18;p.pstone--;const h=a.h,an=Math.atan2(a.dy,a.dx);for(let s=6;s<64;s+=4)for(const o of [-.35,0,.35]){const d=s,aa=an+o*s/64;carve(h.x+Math.cos(aa)*d,h.y+Math.sin(aa)*d,2+s*.06,Math.cos(aa)*3,Math.sin(aa)*3);}
   damageCone(h.x,h.y,a.dx,a.dy,64,40,8);flash(h.x+a.dx*20,h.y+a.dy*20,30,[190,90,255],6);snd('boom',h.x,h.y,{pitch:1.3,v:.7});}},
 // the Reality Stone rewrites the enemies at the cursor as red bubbles: harmless, drifting up, and 50% easier to pop
 {n:'Reality Stone',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,56,8).filter(e=>!e.def.titan&&!e.def.title);if(!list.length){noTarget('#ff5070');return;}if(!use(26))return;ST.cd=50;
   for(const e of list){ov(e).poly=300;for(let k=0;k<10;k++)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(255,60+R()*80|0,90),20,0,1,0,1);}fxWord(mouse.wx,mouse.wy-20,'REALITY IS OFTEN DISAPPOINTING',.7,'#ff6080',true);snd('pop',mouse.wx,mouse.wy,{pitch:.7});}},
 // the Mind Stone fills every enemy near him with terror: they flee for five seconds, and their fear feeds him energy
 {n:'Mind Stone',fn:(a,p,use)=>{if(!use(20))return;ST.cd=60;let n=0;ring(p.x,p.y-ST.PH/2,6,[255,220,80],20,5);snd('psi',p.x,p.y,{pitch:.6});
   for(const e of enemies){if(e.def.titan||!live(e)||Math.hypot(e.x-p.x,e.y-p.y)>150)continue;ov(e).fear=300;n++;}p.en=Math.min(100,p.en+n*2);if(n)fxWord(p.x,p.y-ST.PH-8,'FEAR HIM',.9,'#ffd84a',true);}},
];

// ================= HELA =================
const HELA=[
 // the touch of death withers the foe in front of her: it slows and loses a share of its life every few frames for six seconds
 {n:'Death Touch',fn:(a,p,use)=>{const e=nearestEnemy(p.x+p.face*10,p.y-ST.PH/2,32);if(!e){noTarget('#8dffb0');return;}if(!use(12))return;ST.cd=30;ov(e).wither=360;hitEnemy(e,10,0,0);fxWord(e.x,e.y-e.def.h/2-8,'WITHER',.8,'#8dffb0',true);snd('psi',e.x,e.y,{pitch:.4});}},
 // the fallen get up again: up to three enemies killed in the last ten seconds rise near where they fell and fight for her
 {n:'Raise the Fallen',fn:(a,p,use)=>{const pool=DEAD.filter(d=>ST.frame-d.f<600&&Math.hypot(d.x-p.x,d.y-p.y)<260);if(!pool.length){noTarget('#8dffb0','NO FALLEN NEAR');return;}if(!use(26))return;ST.cd=70;let n=0;
   for(const d of pool.slice(-3)){const e=spawnEnemy(d.name,d.x,d.y-4);if(!e)continue;e.ally=600;e.mem.noScore=true;e.hp=e.def.hp*.6;n++;DEAD.splice(DEAD.indexOf(d),1);for(let k=0;k<16;k++)spawn(d.x+(R()-.5)*10,d.y,(R()-.5),-R()*2,rgb(90,255,150),24,0,1,0,1);}
   if(n)fxWord(p.x,p.y-ST.PH-10,'RISE',1.1,'#8dffb0',true);snd('roar',p.x,p.y,{pitch:.5,v:.6});}},
 // she rides Fenris: six seconds of running at half again her speed, and the wolf savages anyone in the way
 {n:'Fenris',fn:(a,p,use)=>{if(p.fenris>0||!use(22))return;ST.cd=70;p.fenris=360;fxWord(p.x,p.y-ST.PH-8,'FENRIS!',1,'#8dffb0',true);snd('roar',p.x,p.y,{pitch:.8});
   summons.push({x:p.x,y:p.y,life:360,upd(s){if(!(pl_.fenris>0)||ST.CH.id!=='hela'){pl_.fenris=0;return false;}pl_.fenris--;s.x=pl_.x;s.y=pl_.y;
       if(Math.abs(pl_.vx)>.3){const nx=pl_.x+pl_.vx*.5;if(!solid(nx,pl_.y-4))pl_.x=nx;}
       for(const e of enemies)if(live(e)&&Math.abs(e.x-s.x)<e.def.w/2+12&&Math.abs(e.y-(s.y-4))<e.def.h/2+6&&ST.frame-(e.mem.fenT||-99)>24){e.mem.fenT=ST.frame;hitEnemy(e,18,pl_.face*5,-3);snd('slash',e.x,e.y,{pitch:.6,v:.6});}},
     draw(s){const f=pl_.face,g=rgb(70,80,74),d=rgb(40,46,44),e=rgb(120,255,160);for(let x=-9;x<=9;x++)for(let y=-3;y<=0;y++)pix(s.x+x,s.y-3+y,(x+y)&1?g:d,0);for(let y=0;y<3;y++){pix(s.x-7,s.y-2+y,d,0);pix(s.x+7,s.y-2+y,d,0);}
       for(let y=-6;y<=-3;y++)for(let x=8;x<=12;x++)pix(s.x+x*f,s.y+y,g,0);pix(s.x+11*f,s.y-5,e,e);}});}},
];

// ================= MOON KNIGHT =================
const MOON=[
 // two crescent darts that curve in on the nearest enemy from either side; a hit marks it
 {n:'Crescent Darts',fn:(a,p,use)=>{if(!use(4))return;ST.cd=10;for(const sd of [-1,1]){let x=a.h.x,y=a.h.y,an=Math.atan2(a.dy,a.dx)+sd*.8,k=0;snd('throw',x,y,{pitch:1.5,v:.4});
   ACT.push(()=>{k++;const e=nearestEnemy(x,y,180);if(e){const ta=Math.atan2(e.y-y,e.x-x);let da=ta-an;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;an+=Math.max(-.12,Math.min(.12,da));}else an-=sd*.03;
     x+=Math.cos(an)*6;y+=Math.sin(an)*6;spawn(x,y,0,0,rgb(230,236,250),6,0,1,0,1);const h=boxE(x,y,2);if(h){hitEnemy(h,9,Math.cos(an)*2,Math.sin(an)*2);applyStatus(h,'mark',120);return false;}if(solid(x,y))return false;return k<60;});}}},
 // Khonshu's fist comes down out of the night sky on the cursor and crushes everything under it
 {n:'Fist of Khonshu',fn:(a,p,use)=>{if(!use(28))return;ST.cd=60;const cx=mouse.wx,g=groundBelow(mouse.wx|0,mouse.wy),w=16;let y=ST.camY-30,k=0;fxWord(cx,ST.camY+20,'KHONSHU',1,'#e8eeff',true);
   summons.push({x:cx,y,life:120,upd(s){k++;if(k<14){s.y=y;return true;}s.y+=11;if(s.y<g)return true;
       for(const e of enemies)if(live(e)&&Math.abs(e.x-cx)<w+e.def.w/2&&e.y>g-80&&e.y<g+6){hitEnemy(e,50,0,8);applyStatus(e,'stun',40);}
       for(let x=-w;x<=w;x+=2)carve(cx+x,g+2,3,0,2);quake(cx,g,{r:16,col:[220,226,240]});snd('slam',cx,g,{v:1});return false;},
     draw(s){const c=rgb(236,238,246),d=rgb(170,176,196);for(let y=-26;y<=0;y++)for(let x=-w;x<=w;x++){if(y<-18&&Math.abs(x)>w-4)continue;pix(s.x+x,s.y+y,(y>-4&&x%5===0)?d:c,0);}for(let y=-60;y<-26;y++)for(let x=-6;x<=6;x++)pix(s.x+x,s.y+y,d,0);}});}},
 // Khonshu will not let his fist die: for twenty seconds, a killing blow brings him back at full health
 {n:'Resurrection',fn:(a,p,use)=>{if(p.rebirth>0||!use(40))return;ST.cd=80;p.rebirth=1200;fxWord(p.x,p.y-ST.PH-10,'YOU ARE MY FIST',.9,'#e8eeff',true);snd('psi',p.x,p.y,{pitch:.5});
   ACT.push(()=>{if(!(p.rebirth>0)||ST.CH.id!=='moon')return false;p.rebirth--;if(ST.frame%6===0)spawn(p.x+(R()-.5)*8,p.y-R()*ST.PH,0,-.5,rgb(230,236,255),14,0,1,0,1);return true;});}},
];

// ================= STAR-LORD =================
const QUILL=[
 // a dance-off: for four seconds every enemy near him copies his every move instead of fighting, and the beat hurts them
 {n:'Dance-Off',fn:(a,p,use)=>{if(!use(24))return;ST.cd=80;let n=0,k=0;const list=[];for(const e of enemies){if(e.def.titan||!live(e)||Math.hypot(e.x-p.x,e.y-p.y)>150)continue;ov(e).dance=240;list.push(e);n++;}
   if(!n){noTarget('#ffd36a','NO ONE TO DANCE WITH');p.en+=24;ST.cd=0;return;}fxWord(p.x,p.y-ST.PH-10,'DANCE-OFF, BRO!',1,'#ffd36a',true);snd('ui',p.x,p.y,{pitch:1.5});
   ACT.push(()=>{k++;if(k%30===0){for(const e of list)if(live(e)&&e.ov.dance>0){hitEnemy(e,6,0,-1);spawn(e.x,e.y-e.def.h/2-4,0,-.6,rgb(255,220,80),20,0,1,0,1);}p.en=Math.min(100,p.en+2);snd('pop',p.x,p.y,{pitch:2,v:.3});}return k<240;});}},
 // the ultimate: Ego's light. The ground round the cursor turns to glowing blue planet-stuff that roots and burns every enemy in it, then erupts
 {n:'Celestial Light',ult:true,fn:(a,p,use)=>{ST.cd=200;const cx=mouse.wx|0,cy=mouse.wy|0,R0=Math.round(80*(ST.aoeC||1));let k=0;screenFlash([170,220,255],.3);fxWord(cx,cy-40,"I'M MARY POPPINS, Y'ALL",.8,'#9fd8ff',true);snd('charge',cx,cy,{pitch:.5,v:1});
   ACT.push(()=>{k++;const r=Math.min(R0,k*2);if(k<=R0/2)for(let j=0;j<120;j++){const an=R()*6.283,d=r-R()*3,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<0||Y>=H-44)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==OBSID){setc(i,GLASS);col[i]=rgb(60+R()*40|0,150+R()*60|0,255);}}
     for(const e of enemies){if(!live(e)||Math.hypot(e.x-cx,e.y-cy)>r)continue;if(!e.def.titan)ov(e).held=2;if(k%6===0)hitEnemy(e,4,0,0);}
     if(k%4===0)for(let j=0;j<4;j++){const an=R()*6.283,d=R()*r;spawn(cx+Math.cos(an)*d,cy+Math.sin(an)*d,0,-.5,rgb(150,220,255),16,0,1,0,1);}
     if(k<150)return true;for(let j=0;j<10;j++){const an=R()*6.283,d=R()*R0;explode(cx+Math.cos(an)*d|0,cy+Math.sin(an)*d|0,11,{self:true,col:[120,200,255]});}damageEnemies(cx,cy,R0,60,0,-5,true);shockFx(cx,cy,1.5);snd('boom',cx,cy,{v:1});return false;});}},
];

// ================= MILES MORALES =================
const MILES=[
 // a web line to the cursor that carries his venom: every third of a second a current runs down it, shocking whatever touches it
 {n:'Conductor Web',fn:(a,p,use)=>{if(!use(14))return;ST.cd=40;const x0=a.h.x,y0=a.h.y;let x1=x0,y1=y0;for(let s=0;s<220;s++){x1+=a.dx;y1+=a.dy;if(solid(x1,y1))break;if(Math.hypot(x1-x0,y1-y0)>=Math.hypot(mouse.wx-x0,mouse.wy-y0))break;}let k=0;snd('throw',x0,y0,{pitch:1.3});
   ACT.push(()=>{k++;beams.push({x0,y0,x1,y1,life:1,w:0,c:[240,240,246],g:[160,160,170]});for(const e of enemies)if(live(e)&&!e.def.titan){const dx=x1-x0,dy=y1-y0,L=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((e.x-x0)*dx+(e.y-y0)*dy)/L));if(Math.hypot(x0+dx*u-e.x,y0+dy*u-e.y)<e.def.w/2+2)e.webbed=Math.max(e.webbed||0,20);}
     if(k%20===0){beams.push({x0,y0,x1,y1,life:4,w:1,c:[255,250,200],g:[255,200,60]});tagged('shock',()=>damageLine(x0,y0,x1,y1,4,10));snd('zap',(x0+x1)/2,(y0+y1)/2,{v:.5});}return k<240;});}},
 spiderSense('miles'),
 // the ultimate: he electrifies every steel beam and pool of water on screen. Enemies wet or touching metal or water take the full jolt, the rest a share
 {n:'Mega Venom Blast',ult:true,fn:(a,p,use)=>{ST.cd=200;const cx=p.x,cy=p.y-ST.PH/2;explode(cx|0,cy|0,16,{self:true,col:[255,230,90]});shockFx(cx,cy,1.6);screenFlash([255,240,140],.35);let arcs=0;
   for(let j=0;j<4000&&arcs<40;j++){const X=ST.camX+R()*VW|0,Y=ST.camY+R()*VH|0;if(X<0||X>=W||Y<0||Y>=H)continue;const m=t[Y*W+X];if(m===STEEL||m===WATER){arcs++;zap(X,Y,X+(R()-.5)*20,Y+(R()-.5)*20,[255,250,200],[255,200,60]);}}
   tagged('shock',()=>{for(const e of enemies){if(!live(e)||!onScreen(e))continue;let near=e.st&&e.st.wet>0;for(let s=0;s<12&&!near;s++){const X=e.x+(R()-.5)*(e.def.w+12)|0,Y=e.y+(R()-.5)*(e.def.h+12)|0;if(X>=0&&X<W&&Y>=0&&Y<H){const m=t[Y*W+X];if(m===STEEL||m===WATER)near=true;}}
     hitEnemy(e,near?80:30,0,-2);if(near)applyStatus(e,'stun',120);}});fxWord(cx,cy-ST.PH,'MEGA VENOM BLAST!',1.3,'#ffe066',true);snd('emp',cx,cy,{v:1});}},
];

// ================= KANG =================
const KANG=[
 // a bolt that happens twice: wherever it strikes, the same blast strikes again a second later
 {n:'Chrono Bolt',fn:(a,p,use)=>{if(!use(5))return;ST.cd=9;snd('zap',a.h.x,a.h.y,{pitch:.9,v:.5});
   const boom=(x,y,echo)=>{explode(x|0,y|0,6,{self:true,quiet:true,col:echo?[255,214,110]:[195,150,255]});damageEnemies(x,y,14,14,0,-1,true);if(echo)return;let k=0;ACT.push(()=>{if(++k%12===0)ring(x,y,10-k/8,[255,214,110],4);if(k<60)return true;boom(x,y,true);return false;});};
   bolt(a.h.x,a.h.y,a.dx*9,a.dy*9,60,(x,y)=>spawn(x,y,0,0,R()<.5?rgb(215,180,255):rgb(150,100,240),6,0,1,0,1),(e,x,y)=>boom(x,y),(x,y)=>boom(x,y));}},
 // the Damocles walks a line of orbital shells along the ground from Kang toward the cursor
 {n:'Damocles Base',kind:'tap',fn:(a,p,use)=>{if(!use(34))return;ST.cd=80;const dir=mouse.wx>=p.x?1:-1;let x=p.x+dir*24,k=0;fxWord(p.x,ST.camY+20,'DAMOCLES: FIRE',.8,'#c8a8ff',true);
   ACT.push(()=>{k++;if(k%6!==0)return true;const g=groundBelow(x|0,Math.max(ST.camY,p.y-80));beams.push({x0:x,y0:ST.camY-10,x1:x,y1:g,life:4,w:1,c:[255,240,220],g:[195,150,255]});explode(x|0,g|0,9,{self:true,col:[195,150,255]});damageEnemies(x,g-6,18,22,0,-3,true);snd('boom',x,g,{v:.5});x+=dir*16;return k<72;});}},
 // he speeds up his own time: six seconds of moving half again as fast, with cooldowns and energy running double
 {n:'Haste',fn:(a,p,use)=>{if(p.haste>0||!use(22))return;ST.cd=60;p.haste=360;fxWord(p.x,p.y-ST.PH-8,'ACCELERATED',.9,'#c8a8ff',true);snd('whoosh',p.x,p.y,{pitch:1.8});
   ACT.push(()=>{if(--p.haste<=0||ST.CH.id!=='kang'){p.haste=0;return false;}if(ST.cd>0)ST.cd--;p.en=Math.min(100,p.en+.12);const nx=p.x+p.vx*.5;if(Math.abs(p.vx)>.3&&!solid(nx,p.y-4)&&!solid(nx,p.y-ST.PH+2))p.x=nx;
     if(ST.frame%2===0)spawn(p.x-p.face*4,p.y-R()*ST.PH,-p.vx*.2,0,rgb(200,170,255),10,0,1,0,1);return true;});}},
 // a temporal mine: when an enemy comes near (or after three seconds) every enemy around it relives all the damage it took in the last five seconds
 {n:'Time Bomb',fn:(a,p,use)=>{if(!use(24))return;ST.cd=50;const cx=mouse.wx,cy=mouse.wy;let k=0;snd('place',cx,cy);
   ACT.push(()=>{k++;if(k%10===0)ring(cx,cy,10,[255,214,110],8,-.5);const trig=k>180||k>30&&enemies.some(e=>live(e)&&Math.hypot(e.x-cx,e.y-cy)<24);if(!trig)return true;
     let tot=0;for(const e of enemies){if(!live(e)||Math.hypot(e.x-cx,e.y-cy)>64)continue;const L=e.mem.dlog||[];let d=10;for(let i=0;i<L.length;i+=2)if(L[i]>ST.frame-300)d+=L[i+1];e.mem.dlog=[];hitEnemy(e,d,0,-2);tot+=d;fxWord(e.x,e.y-e.def.h/2-8,'REPLAY '+(d|0),.7,'#ffd66e',true);}
     explode(cx|0,cy|0,8,{self:true,col:[255,214,110]});ring(cx,cy,4,[255,214,110],16,4);snd('boom',cx,cy,{pitch:1.4,v:.7});return false;});}},
];

export const EXTRA4B={marvel:MARVEL,surfer:SURFER,rider:RIDER,pool:POOL,thanos:THANOS,hela:HELA,moon:MOON,quill:QUILL,miles:MILES,kang:KANG};
