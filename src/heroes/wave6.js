// Wave 6 newcomers (2026-10-21): Gambit (kinetic charge: cards, his staff, anything he touches), Nightcrawler
// (teleportation in clouds of brimstone, two sabres), Star-Lord (element guns, jet boots, the Milano) and
// Miles Morales (venom strikes, camouflage, the glitch).
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { H, W, t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn, spawnFlake } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { beamCore, scriptMove, shockFx, shots, surfaceY, zap } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { boxHit, carve, hand, mouse, pl_ } from '../player.js';
import { damageCone, damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { nearestN, tagged } from './kits2a.js';
import { TK } from '../render/titan.js';

const melee=(p,r,dmg,kx,ky)=>{const x=p.x+p.face*(ST.PW/2+5),y=p.y-ST.PH/2;carve(x,y,r*.5,p.face*4,0);damageEnemies(x,y,r,dmg,p.face*kx,ky);p.punchF=8;return [x,y];};

// ================= GAMBIT =================
const SPR_GAMBIT=[
"...nnMMMn....",
"..nnMkkkM....",
"..n.MeFeM....",
"....MfffM....",
".....fFf.....",
"...cMMMMmc...",
".ccMMMMMMmcC.",
".cckMMMMmkcC.",
".cckkMMmkkcC.",
".cc.KkkkK.cC.",
".cc.Kkkkk.cC.",
".cc.bbbbb.c*.",
".kk.Kkkkk.kk.",
".T..Kkkkk..T.",
".T..Kk.kk..T.",
".T..Kk.kk..T.",
".T..Kk.kk..T.",
".T.Kk...kk.T.",
"...bb...bb...",
"...bb...bb...",
"...bb...bb...",
"..bbb...bbb.."];
const PAL_GAMBIT={n:rgb(120,64,40),M:rgb(208,72,148),m:rgb(140,40,100),k:rgb(30,30,40),K:rgb(54,54,70),f:rgb(232,188,156),F:rgb(190,146,116),e:rgb(255,40,40),c:rgb(134,88,52),C:rgb(88,56,32),T:rgb(110,72,42),'*':rgb(255,90,200),b:rgb(90,60,36)};
ANIM.gambit={leg:14,mid:6,armC:'ccC',tipC:'ff*',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null,cape:'T'};
const KC=[255,90,200];
const card=(x,y,vx,vy,boom=7)=>shots.push({x,y,vx,vy,type:'card',life:90,boom,col:KC,ecol:KC,fire:.1});
// a charged thing glows, then goes off: cells or a chunk
function charge(x,y,r,delay,big){let k=0;ACT.push(()=>{k++;if(k%4===0)for(let j=0;j<6;j++){const an=R()*6.283,d=R()*r;spawn(x+Math.cos(an)*d,y+Math.sin(an)*d,0,0,rgb(255,90+R()*80|0,200),6,0,1,0,1);}if(k<delay)return true;explode(x|0,y|0,big,{fire:.1,col:KC});shockFx(x,y,.8);return false;});}
const GAMBIT_POWERS=[
 {n:'Charged Card',fn:(a,p,use)=>{if(!use(4))return;ST.cd=8;card(a.h.x,a.h.y,a.dx*8,a.dy*8);snd('whoosh',a.h.x,a.h.y,{pitch:2});}},
 {n:'Royal Flush',fn:(a,p,use)=>{if(!use(14))return;ST.cd=26;const an=Math.atan2(a.dy,a.dx);for(let k=-2;k<=2;k++)card(a.h.x,a.h.y,Math.cos(an+k*.12)*8,Math.sin(an+k*.12)*8,8);fxWord(p.x,p.y-ST.PH-8,'ROYAL FLUSH',.9,'#ff9ad8',true);}},
 {n:'Bo Staff Vault',fn:(a,p,use)=>{if(!use(8))return;ST.cd=18;p.vy=-6.5;p.vx=p.face*4;p.ground=false;const [x,y]=melee(p,14,16,5,-4);sliceLine(x-p.face*8,y+8,x+p.face*12,y-8,{edge:[255,180,230],quiet:true});snd('whoosh',x,y);}},
 // kinetic charge: whatever is under the cursor glows pink, then detonates
 {n:'Kinetic Charge',fn:(a,p,use)=>{if(!use(18))return;ST.cd=30;charge(mouse.wx,mouse.wy,16*ST.aoeC,60,14);fxWord(mouse.wx,mouse.wy-20,'CHARGED',.8,'#ff9ad8',true);}},
 {n:'Ace in the Hole',fn:(a,p,use)=>{if(!use(10))return;ST.cd=20;const x=mouse.wx,y=groundBelow(mouse.wx|0,mouse.wy);summons.push({x,y,life:900,upd(s){for(const e of enemies)if(Math.abs(e.x-s.x)<10&&Math.abs(e.y+e.def.h/2-s.y)<12){explode(s.x|0,s.y-2|0,12,{col:KC});return false;}},draw(s){if((ST.frame>>3)&1)for(let k=-2;k<=2;k++)pixC(s.x+k,s.y-1,rgb(255,90,200));}});}},
 {n:'52 Pickup',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;for(let k=0;k<26;k++){const an=R()*6.283,sp=4+R()*4;card(p.x,p.y-ST.PH/2,Math.cos(an)*sp,Math.sin(an)*sp,5);}fxWord(p.x,p.y-ST.PH-10,'52 PICKUP!',1.1,'#ff9ad8',true);}},
 // he charges a chunk of the world and throws it: it goes off when it lands
 {n:'Kinetic Throw',fn:(a,p,use)=>{const n0=solidCells(mouse.wx,mouse.wy,8,false);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n<14){fxWord(mouse.wx,mouse.wy,'NOTHING TO CHARGE',.7,'#ff9ad8',true);return;}if(!use(20))return;ST.cd=36;
   const b=makeBody(q,n,false);if(!b)return;const dx=mouse.wx-p.x,dy=mouse.wy-p.y;b.vx=(p.x<b.x?1:-1)*0+(R()-.5);b.vy=-5;b.thrown=true;let k=0;ACT.push(()=>{k++;for(let j=0;j<2;j++)spawn(b.x+(R()-.5)*b.rmax,b.y+(R()-.5)*b.rmax,0,0,rgb(255,90,200),6,0,1,0,1);if(!bodies.includes(b)||k>200){explode(b.x|0,b.y|0,14,{col:KC,fire:.1});return false;}return true;});}},
 {n:'Staff Spin',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;let k=0;ACT.push(()=>{k++;const an=k*.7,cx=p.x,cy=p.y-ST.PH/2,x1=cx+Math.cos(an)*16,y1=cy+Math.sin(an)*16;damageLine(cx-Math.cos(an)*16,cy-Math.sin(an)*16,x1,y1,3,4);beams.push({x0:cx-Math.cos(an)*16,y0:cy-Math.sin(an)*16,x1,y1,life:2,w:0,c:[150,100,60],g:[255,90,200]});
   for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<18){s.owner='player';s.vx*=-1.2;s.vy*=-1.2;s.col=KC;}}return k<40;});}},
 {n:'Card Storm',kind:'hold',fn:(a,p,use)=>{if(!use(.6)||ST.frame%3)return;const an=Math.atan2(a.dy,a.dx)+Math.sin(ST.frame*.3)*.25;card(a.h.x,a.h.y,Math.cos(an)*8,Math.sin(an)*8,5);}},
 // full house: every loose chunk on screen and the buildings around him take a charge and go off
 {n:'Full House',ult:true,fn:(a,p,use)=>{ST.cd=200;fxWord(p.x,p.y-60,'FULL HOUSE, MON AMI',1.4,'#ff9ad8',true);let n=0;for(const b of bodies){if(Math.abs(b.x-p.x)>260)continue;charge(b.x,b.y,b.rmax,40+n*4,Math.min(16,6+b.rmax/2|0));n++;}
   for(let k=0;k<10;k++){const x=p.x+(R()-.5)*420,y=groundBelow(x|0,p.y-120)-R()*60;charge(x,y,14,30+k*6,12);}for(const e of enemies)if(Math.abs(e.x-p.x)<260)charge(e.x,e.y,8,50,10);}},
];
export const CHAR_GAMBIT={id:'gambit',name:'Gambit',spr:SPR_GAMBIT,pal:PAL_GAMBIT,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.2,jump:5.4,hp:360,armor:.7,glow:KC,cape:null,thrust:()=>rgb(255,90,200),powers:GAMBIT_POWERS};
import { pix } from '../render/canvas.js';
const pixC=(x,y,c)=>pix(x,y,c,c);

// ================= NIGHTCRAWLER =================
const SPR_KURT=[
"....hhhhh....",
"...bhhhhhb...",
"....BeBeb....",
"....BBBBb....",
".....BbB.....",
"...kRBBbRk...",
".KkRRkkkRRkk.",
".KkkRRkRRkkk.",
".KkkkRRRkkkk.",
".Kk.KkRkk.kk.",
".Kk.Kkkkk.kk.",
".BB.RRRRr.Bb.",
".Bb.Kkkkk.Bb.",
"..t.Kkkkk....",
".t..Kk.kk....",
"t...Kk.kk....",
"t...Kk.kk....",
".t.Kk...kk...",
"TT.KR...Rk...",
"T..Kk...kk...",
"...kk...kk...",
"..kkk...kkk.."];
const PAL_KURT={h:rgb(22,24,50),b:rgb(32,42,104),B:rgb(54,74,164),e:rgb(255,230,90),k:rgb(20,20,26),K:rgb(50,50,62),R:rgb(182,32,42),r:rgb(116,20,28),t:rgb(40,56,130),T:rgb(54,74,164)};
ANIM.kurt={leg:14,mid:6,armC:'Kkk',tipC:'BBb',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null,cape:'tT'};
const puff=(x,y)=>{for(let k=0;k<18;k++){const an=R()*6.283,sp=R()*2;spawn(x,y,Math.cos(an)*sp,Math.sin(an)*sp-.4,R()<.5?rgb(70,40,90):rgb(40,30,50),30+R()*20,0,0,0,1);}snd('pop',x,y,{pitch:.6,v:.6});};
function bamf(p,x,y){puff(p.x,p.y-ST.PH/2);x=Math.max(6,Math.min(W-6,x));y=Math.max(-800,Math.min(H-8,y));if(boxHit(x,y))carve(x,y-ST.PH/2,ST.PH*.6,0,0);p.x=x;p.y=y;p.vx=p.vy=0;puff(x,y-ST.PH/2);fxWord(x,y-ST.PH-6,'BAMF!',.8,'#c8a0ff',true);}
const KURT_POWERS=[
 {n:'BAMF',fn:(a,p,use)=>{if(!use(7))return;ST.cd=12;bamf(p,mouse.wx,mouse.wy+ST.PH/2);damageEnemies(p.x,p.y-ST.PH/2,14,8,0,-1);}},
 {n:'BAMF Strike',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,120);if(!e)return;if(!use(10))return;ST.cd=18;const side=e.x>p.x?1:-1;bamf(p,e.x+side*10,e.y+e.def.h/2);p.face=-side;clawSlice(p.x,p.y-ST.PH/2,-side,0,20,2,4,{edge:[220,220,240],quiet:true});hitEnemy(e,26,-side*5,-3);}},
 // he grabs the enemy and teleports it a hundred and fifty feet up
 {n:'Teleport Drop',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,60);if(!e||e.def.titan){fxWord(mouse.wx,mouse.wy,'TOO BIG',.7,'#c8a0ff',true);return;}if(!use(16))return;ST.cd=30;puff(e.x,e.y);e.y-=150;e.vy=2;e.thrownT=120;puff(e.x,e.y);fxWord(e.x,e.y-10,'AUF WIEDERSEHEN!',.8,'#c8a0ff',true);}},
 {n:'Sabre Flurry',fn:(a,p,use)=>{if(!use(6))return;ST.cd=10;const sw=(p.sbN=(p.sbN||0)+1)&1?.5:-.5,an=Math.atan2(a.dy,a.dx)+sw;clawSlice(a.h.x,a.h.y,Math.cos(an),Math.sin(an),26,2,3,{edge:[220,220,240],push:.9});damageCone(a.h.x,a.h.y,a.dx,a.dy,30,13,2);snd('slash',a.h.x,a.h.y,{pitch:1.3});}},
 // a cloud of brimstone at the cursor: it burns and chokes what's in it
 {n:'Brimstone Cloud',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;const cx=mouse.wx,cy=mouse.wy,r=34*ST.aoeC;let k=0;ACT.push(()=>{k++;for(let j=0;j<4;j++)spawnFlake(cx+(R()-.5)*r*2,cy+(R()-.5)*r,(R()-.5)*.2,-.1,R()<.5?rgb(90,60,100):rgb(60,50,40),80,0);if(k%15===0)tagged('fire',()=>damageEnemies(cx,cy,r,6,0,0));return k<240;});}},
 {n:'Tail Whip',fn:(a,p,use)=>{const e=nearestEnemy(p.x-p.face*8,p.y-ST.PH/2,34);if(!e)return;if(!use(8))return;ST.cd=18;if(!e.def.titan){e.vx=p.face*7;e.vy=-4;e.thrownT=40;}hitEnemy(e,18,0,0);fxWord(e.x,e.y-10,'THWAP!',.8,'#c8a0ff',true);}},
 {n:'Shadow Blend',fn:(a,p,use)=>{if(!use(14))return;ST.cd=60;p.stealth=300;p.lastSeen={x:p.x,y:p.y-8};fxWord(p.x,p.y-ST.PH-8,'*FADES*',.8,'#c8a0ff',true);}},
 // teleports from enemy to enemy, a sabre cut at each
 {n:'Chain BAMF',fn:(a,p,use)=>{const list=nearestN(p.x,p.y,220,6);if(!list.length)return;if(!use(24))return;ST.cd=50;let k=0;ACT.push(()=>{if(k%8===0){const e=list[k/8|0];if(e&&e.hp>0){bamf(p,e.x-10,e.y+e.def.h/2);p.face=1;clawSlice(p.x,p.y-ST.PH/2,1,0,22,2,4,{edge:[220,220,240],quiet:true});hitEnemy(e,24,4,-2);}}p.script=2;return++k<list.length*8;});}},
 {n:'Swashbuckler',fn:(a,p,use)=>{if(!use(12))return;ST.cd=24;let k=0;const an0=Math.atan2(a.dy,a.dx);ACT.push(()=>{const an=an0-1.4+k*.35,h=hand();sliceLine(h.x,h.y,h.x+Math.cos(an)*34,h.y+Math.sin(an)*34,{edge:[220,220,240],quiet:k>0});damageLine(h.x,h.y,h.x+Math.cos(an)*34,h.y+Math.sin(an)*34,4,8);return++k<9;});fxWord(p.x,p.y-ST.PH-8,'EN GARDE!',.8,'#c8a0ff',true);}},
 // a dozen teleports in a blink, a cut and a burst of brimstone at every one
 {n:'BAMF Barrage',ult:true,fn:(a,p,use)=>{ST.cd=200;fxWord(p.x,p.y-60,'BAMF BAMF BAMF!',1.4,'#c8a0ff',true);const list=nearestN(p.x,p.y,300,12);let k=0;ACT.push(()=>{if(k%5===0){const e=list[(k/5|0)%Math.max(1,list.length)];if(e&&e.hp>0){bamf(p,e.x+(R()<.5?-10:10),e.y+e.def.h/2);hitEnemy(e,30,0,-2);explode(e.x|0,e.y|0,6,{self:true,quiet:true,col:[170,110,220]});}}p.script=2;return++k<60;});}},
];
export const CHAR_KURT={id:'kurt',name:'Nightcrawler',spr:SPR_KURT,pal:PAL_KURT,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.3,jump:5.8,hp:320,armor:.75,glow:[170,110,220],cape:null,thrust:()=>rgb(120,80,160),powers:KURT_POWERS};

// ================= STAR-LORD =================
const SPR_QUILL=[
"....sssss....",
"...SsssssS...",
"....eeSee....",
"....SsSsS....",
".....gSg.....",
"...cLDDDcC...",
".LccLDDDccCC.",
".LcLcDDDcCcC.",
".LcLcDDDcCcC.",
".Lc.cDDDc.cC.",
".Lc.cDDDc.cC.",
".kk.nnYnn.GG.",
".kk.KkkkK.GK.",
".T..Kkkkk..T.",
".T..Kk.kk..T.",
".T..Kk.kk..T.",
"....Kk.kk....",
"...Kk...kk...",
"...bb...bb...",
"...bb...bb...",
"...ss...sS...",
"..sss...sSS.."];
const PAL_QUILL={s:rgb(192,192,202),S:rgb(130,130,142),e:rgb(255,60,50),g:rgb(80,80,90),c:rgb(150,56,42),C:rgb(96,34,26),L:rgb(192,88,66),D:rgb(62,42,42),k:rgb(28,28,32),K:rgb(54,54,62),n:rgb(110,74,40),Y:rgb(222,190,80),G:rgb(152,152,162),b:rgb(100,66,40),T:rgb(122,44,34)};
ANIM.quill={leg:14,mid:6,armC:'LcC',tipC:'GGK',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null,cape:'T'};
const egun=(a,c,el)=>{for(const o of pl_.mix>0?[0,.13,-.13]:[0]) // Awesome Mix (heroes/kits3a.js): three-way spread while the tape plays
  shots.push({x:a.h.x,y:a.h.y,vx:(a.dx-a.dy*o)*8,vy:(a.dy+a.dx*o)*8,type:'egun',life:70,col:c,ecol:c,boom:3,onHit:s=>{explode(s.x|0,s.y|0,4,{self:true,quiet:true,col:c,fire:el==='fire'?.4:0});tagged(el,()=>damageEnemies(s.x,s.y,10,12,0,0));}});};
function drawMilano(s){const x=s.x,y=s.y,f=s.face,o={},B=rgb(60,90,170),O=rgb(240,140,40),G=rgb(180,190,200);TK.begin();TK.ell(x,y,26,6,B,o);TK.poly([[x-f*20,y-4],[x-f*34,y-14],[x-f*10,y-4]],O,o);TK.poly([[x-f*20,y+4],[x-f*34,y+12],[x-f*10,y+4]],O,o);TK.ell(x+f*12,y-3,8,4,G,o);TK.end();for(let k=0;k<3;k++)spawn(x-f*28,y+(R()-.5)*4,-f*3,0,R()<.5?rgb(150,200,255):rgb(255,255,255),8,0,1,0,1);}
const QUILL_POWERS=[
 {n:'Element Gun: Fire',fn:(a,p,use)=>{if(!use(3))return;ST.cd=7;egun(a,[255,140,40],'fire');}},
 {n:'Element Gun: Ice',fn:(a,p,use)=>{if(!use(3))return;ST.cd=7;egun(a,[160,220,255],'ice');}},
 {n:'Element Gun: Shock',fn:(a,p,use)=>{if(!use(3))return;ST.cd=7;egun(a,[200,230,255],'shock');}},
 // a gravity mine: drags everything in, then pops
 {n:'Gravity Mine',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;const cx=mouse.wx,cy=mouse.wy;let k=0;ACT.push(()=>{k++;rings.push({x:cx,y:cy,r:30*(1-(k%15)/15),vr:0,life:2,c:[170,120,255]});for(const e of enemies){if(e.def.titan)continue;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;if(d<90){e.vx+=dx/d*.5;e.vy+=dy/d*.5;}}
   for(const b of bodies){const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<90){b.vx+=dx/d*.3;b.vy+=dy/d*.3-.2;b.rest=0;}}if(k===90){explode(cx|0,cy|0,14,{col:[170,120,255]});return false;}return true;});}},
 // the Milano makes a strafing run across the view
 {n:'Milano Strafe',fn:(a,p,use)=>{if(summons.some(s=>s.milano)||!use(32))return;ST.cd=80;const dir=p.face,y=Math.min(p.y-60,mouse.wy-40);fxWord(p.x,p.y-ST.PH-10,'HIT IT, ROCKET!',1,'#ff9a5c',true);snd('jet',p.x,p.y);
   summons.push({milano:true,x:dir>0?ST.camX-40:ST.camX+520,y,face:dir,life:170,upd(s){s.x+=s.face*5;if(s.t%4===0){const gx=s.x+s.face*20,gy=groundBelow(gx|0,s.y+10);beams.push({x0:s.x,y0:s.y+4,x1:gx,y1:gy,life:2,w:0,c:[200,230,255],g:[80,150,255]});explode(gx|0,gy,5,{self:true,quiet:s.t%12!==0,col:[150,200,255]});damageEnemies(gx,gy,10,12,0,-2);}},draw:drawMilano});}},
 // a dance-off: everything near him stops to dance
 {n:'Dance-Off',fn:(a,p,use)=>{if(!use(24))return;ST.cd=80;fxWord(p.x,p.y-ST.PH-10,'DANCE-OFF, BRO!',1.1,'#ff9a5c',true);let n=0;for(const e of enemies){if(e.def.titan||Math.hypot(e.x-p.x,e.y-p.y)>140)continue;applyStatus(e,'stun',180);n++;fxWord(e.x,e.y-e.def.h/2-6,'♪',1,'#ffd36a',true);}if(!n)fxWord(p.x,p.y-ST.PH-24,'...TOUGH CROWD',.7,'#ff9a5c',true);}},
 {n:"Rocket's Gift",fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;for(let k=0;k<6;k++)shots.push({x:a.h.x,y:a.h.y,vx:p.face*(.5+R()),vy:-1.5-R()*2,type:'missile',life:200,tx:mouse.wx+(R()-.5)*40,ty:mouse.wy+(R()-.5)*20,delay:k*4,wob:R()*6,boom:9,fire:.3});}},
 // the Orb: it cracks open and a wave of Power Stone energy rolls out
 {n:'The Orb',fn:(a,p,use)=>{if(!use(34))return;ST.cd=70;const s={x:a.h.x,y:a.h.y,vx:a.dx*5,vy:a.dy*5-1,type:'orb',life:80,grav:.12,col:[170,60,255],boom:0,onHit:s=>{let k=0;fxWord(s.x,s.y-20,'THE ORB!',1.1,'#c88cff',true);
   ACT.push(()=>{k++;const r=k*5*ST.aoeC;for(let j=0;j<10;j++){const an=R()*6.283;explode(s.x+Math.cos(an)*r|0,s.y+Math.sin(an)*r|0,5,{self:true,quiet:true,col:[170,60,255]});}damageEnemies(s.x,s.y,r+10,6,0,0,true);return k<14;});}};shots.push(s);}},
 {n:'Jet Boot Kick',fn:(a,p,use)=>{if(!use(10))return;ST.cd=20;const dx=a.dx,dy=a.dy;let k=0;ACT.push(()=>{k++;p.script=2;carve(p.x+dx*8,p.y-ST.PH/2+dy*8,6,dx*5,dy*5);scriptMove(p,dx*8,dy*8);damageEnemies(p.x,p.y-ST.PH/2,10,14,dx*6,dy*6-2);for(let j=0;j<2;j++)spawn(p.x,p.y,-dx*3,-dy*3+1,rgb(150,200,255),8,0,1,0,1);return k<12;});}},
 // a Celestial's light pours out of his hands: a beam and pillars of light along the ground
 {n:'Celestial Light',ult:true,kind:'hold',fn:(a,p,use)=>{beamCore(a,{pow:400,rad:4,len:520,w:5+(ST.frame&1),c:[255,255,240],g:[150,220,255],spark:()=>rgb(220,240,255),dmg:10,noAsh:true});if(ST.frame%8===0){const x=a.h.x+a.dx*(40+R()*200),gy=groundBelow(x|0,a.h.y);beamCore({h:{x,y:gy},dx:0,dy:-1,d:1},{pow:60,rad:2,len:120,w:2,c:[255,255,240],g:[150,220,255],spark:()=>rgb(220,240,255),dmg:6,noAsh:true});}}},
];
export const CHAR_QUILL={id:'quill',name:'Star-Lord',spr:SPR_QUILL,pal:PAL_QUILL,pw:7,ph:19,fly:true,fs:3.2,boost:2.4,run:2.1,jump:5,hp:340,armor:.75,glow:[255,140,80],cape:null,thrust:()=>R()<.5?rgb(150,200,255):rgb(255,255,255),powers:QUILL_POWERS};

// ================= MILES MORALES =================
const SPR_MILES=[
"....KkrkK....",
"....kkrkk....",
"....wwkww....",
"....kkrkk....",
".....krk.....",
"...KkkrkkK...",
".KkKkkrkkKkk.",
".KkkrkrkrkKk.",
".Kkkkrrrkkkk.",
".Kk.rkrkr.kk.",
".Kk.Kkkkk.kk.",
".Kk.Kkkkk.kk.",
".rr.Kkkkk.rr.",
"....Kkkkk....",
"....Kk.kk....",
"....Kk.kk....",
"....Kk.kk....",
"...Kk...kk...",
"...Kk...kk...",
"...Kk...kk...",
"...Kk...kk...",
"..rrr...rrr.."];
const PAL_MILES={k:rgb(18,18,24),K:rgb(50,50,64),r:rgb(216,32,46),R:rgb(150,20,32),w:rgb(244,244,252)};
ANIM.miles={leg:14,mid:6,armC:'Kkk',tipC:'rrR',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const VC=[255,230,120];
const venomZap=(x0,y0,x1,y1)=>zap(x0,y0,x1,y1,[255,250,200],[255,210,60]);
const MILES_POWERS=[
 {n:'Venom Strike',fn:(a,p,use)=>{if(!use(5))return;ST.cd=12;const [x,y]=melee(p,12,0,0,0);tagged('shock',()=>damageEnemies(x,y,12,20,p.face*4,-2));for(let k=0;k<3;k++)venomZap(x,y,x+(R()-.5)*20,y+(R()-.5)*20);snd('zap',x,y,{pitch:1.6});}},
 {n:'Venom Web',fn:(a,p,use)=>{if(!use(8))return;ST.cd=16;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'vweb',life:80,col:[255,240,170],boom:0,onHit:s=>{for(const e of enemies)if(Math.hypot(e.x-s.x,e.y-s.y)<12){e.webbed=Math.max(e.webbed||0,150);tagged('shock',()=>hitEnemy(e,10,0,0));venomZap(s.x,s.y,e.x,e.y);}}});}},
 // camouflage: invisible, and the first hit out of it lands twice as hard
 {n:'Camouflage',fn:(a,p,use)=>{if(!use(16))return;ST.cd=60;p.stealth=360;p.lastSeen={x:p.x+(R()-.5)*80,y:p.y-8};ST.buffT=ST.frame+360;fxWord(p.x,p.y-ST.PH-8,'*SHIMMER*',.8,'#ffd36a',true);}},
 {n:'Venom Blast',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;const cx=p.x,cy=p.y-ST.PH/2,r=40*ST.aoeC;for(let k=0;k<10;k++){const an=R()*6.283;venomZap(cx,cy,cx+Math.cos(an)*r,cy+Math.sin(an)*r);}tagged('shock',()=>damageEnemies(cx,cy,r,26,0,-2,true));shockFx(cx,cy,.8);fxWord(cx,cy-20,'ZZZRAKK!',1.1,'#ffd36a',true);}},
 {n:'Venom Dash',fn:(a,p,use)=>{if(!use(10))return;ST.cd=20;const dx=a.dx,dy=a.dy;let k=0;ACT.push(()=>{k++;p.script=2;carve(p.x+dx*8,p.y-ST.PH/2+dy*8,6,dx*5,dy*5);scriptMove(p,dx*9,dy*9);tagged('shock',()=>damageEnemies(p.x,p.y-ST.PH/2,10,9,dx*5,dy*5));if(k%2===0)venomZap(p.x,p.y-8,p.x-dx*20,p.y-8-dy*20);return k<12;});}},
 {n:'Spider Slam',fn:(a,p,use)=>{if(!use(14))return;ST.cd=30;if(p.ground){p.vy=-5;p.ground=false;}p.slam=true;p.slamOpt={col:VC,r:24};}},
 {n:'Venom Uppercut',fn:(a,p,use)=>{if(!use(8))return;ST.cd=18;const [x,y]=melee(p,10,0,0,0);tagged('shock',()=>damageEnemies(x,y,10,18,p.face*2,-9));p.vy=-4;venomZap(x,y+6,x,y-20);}},
 {n:'Web Strike',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,140);if(!e)return;if(!use(12))return;ST.cd=24;let k=0;ACT.push(()=>{k++;p.script=2;const dx=e.x-p.x,dy=e.y-(p.y-ST.PH/2),d=Math.hypot(dx,dy)||1;beams.push({x0:hand().x,y0:hand().y,x1:e.x,y1:e.y,life:1,w:0,c:[240,240,246],g:[160,160,170]});
   if(d<12||k>30||e.hp<=0){tagged('shock',()=>hitEnemy(e,28,dx/d*5,-3));venomZap(p.x,p.y-8,e.x,e.y);fxWord(e.x,e.y-10,'POW!',.9,'#ffd36a',true);return false;}scriptMove(p,dx/d*9,dy/d*9);return true;});}},
 // the glitch: Miles blinks a few metres ahead, straight through whatever is in the way
 {n:'Glitch Shift',fn:(a,p,use)=>{if(!use(9))return;ST.cd=18;const x0=p.x,y0=p.y,L=56;let tx=p.x+a.dx*L,ty=p.y+a.dy*L;for(let k=L;k>10&&boxHit(tx,ty);k-=4){tx=p.x+a.dx*k;ty=p.y+a.dy*k;}
   for(let k=0;k<6;k++)afters.push({x:x0+(tx-x0)*k/6,y:y0+(ty-y0)*k/6,ang:0,face:p.face,life:10,col:k&1?[255,40,90]:[60,220,255]});p.x=tx;p.y=ty;tagged('shock',()=>damageLine(x0,y0-8,tx,ty-8,6,10));fxWord(p.x,p.y-ST.PH-6,'*GLITCH*',.8,'#7fe8ff',true);}},
 // the Mega Venom Blast: everything around him is struck at once, and the current jumps on
 {n:'Mega Venom Blast',ult:true,fn:(a,p,use)=>{ST.cd=200;const cx=p.x,cy=p.y-ST.PH/2;fxWord(cx,cy-60,'MEGA VENOM BLAST!',1.5,'#ffd36a',true);explode(cx|0,cy|0,26,{self:true,col:VC});shockFx(cx,cy,1.6);
   for(let k=0;k<30;k++){const an=R()*6.283,r=40+R()*120;venomZap(cx,cy,cx+Math.cos(an)*r,cy+Math.sin(an)*r);}tagged('shock',()=>{for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<160){hitEnemy(e,60,0,-3);applyStatus(e,'stun',90);}});}},
];
export const CHAR_MILES={id:'miles',name:'Miles Morales',spr:SPR_MILES,pal:PAL_MILES,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.3,jump:5.6,hp:330,armor:.75,glow:VC,cape:null,thrust:()=>rgb(255,230,120),powers:MILES_POWERS,webs:true};
export { card, charge, bamf, puff as kpuff, venomZap, KC, VC };
