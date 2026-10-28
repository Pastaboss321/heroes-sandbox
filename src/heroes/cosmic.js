// Cosmic newcomers: Captain Marvel (photon powers, Binary mode) and the Silver Surfer (the Power Cosmic,
// a board that cuts through anything), plus Captain America (a shield that ricochets and slices).
import { ST } from '../state.js';
import { EMPTY, GLASS, ICE, KIND, R, S, STEEL, STONE, WATER, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { afters, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { beamCore, quake, scriptMove, shockFx, shots, surfaceY } from './powers.js';
import { ACT } from './xmen.js';
import { carve, mouse, pl_ } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';

// ================= CAPTAIN MARVEL =================
const SPR_MARVEL=[
"....hhhhH....",
"...hhhhhHH...",
"...hfeFeFH...",
"...HffffFH...",
"...Hh.fF.H...",
"...hBYYYBH...",
".BBBRRYRRBBb.",
".BBRRYYYRRBb.",
".BBRRRYRRrBb.",
".BB.RRYRr.Bb.",
".BB.BRRrb.Bb.",
".RR.YYYYy.Rr.",
".Rr.BRRrb.Rr.",
"....BRRrb....",
"....BR.rb....",
"....BR.rb....",
"....BR.rb....",
"...RR...Rr...",
"...RR...Rr...",
"...RR...Rr...",
"...RR...Rr...",
"..RRr...Rrr.."];
const PAL_MARVEL={h:rgb(248,216,124),H:rgb(200,160,72),f:rgb(236,190,160),F:rgb(196,150,120),e:rgb(255,240,200),R:rgb(208,40,50),r:rgb(132,22,30),B:rgb(40,62,150),b:rgb(24,36,96),Y:rgb(250,210,80),y:rgb(190,150,40)};
ANIM.marvel={leg:14,mid:6,armC:'BBb',tipC:'RRr',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const PH=[255,210,110],PHC=[255,245,200];
const binary=p=>p.binary>0;
const MARVEL_POWERS=[
 {n:'Photon Blast',fn:(a,p,use)=>{if(!use(4))return;ST.cd=binary(p)?4:8;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*8,vy:a.dy*8,type:'photon',life:90,boom:binary(p)?11:7,col:PH,ecol:PH});flash(a.h.x,a.h.y,10,PH,3);}},
 {n:'Binary Beam',fn:(a,p,use)=>{if(!use(binary(p)?.4:1))return;beamCore(a,{pow:binary(p)?320:180,rad:binary(p)?3:2,len:480,w:3+(ST.frame&1),c:PHC,g:[255,170,60],spark:()=>R()<.5?rgb(255,240,190):rgb(255,170,60),dmg:binary(p)?7:4});}},
 // a photon-charged fist dive: she punches straight through a building
 {n:'Photon Fist',fn:(a,p,use)=>{if(!use(14))return;ST.cd=28;const dx=a.dx,dy=a.dy;let k=0;fxWord(p.x,p.y-ST.PH-8,'HAH!',1,'#ffd36a',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{k++;p.vx=dx*10;p.vy=dy*10;p.script=2;const X=p.x+dx*7,Y=p.y-ST.PH/2+dy*7;carve(X,Y,8,dx*6,dy*6);scriptMove(p,p.vx,p.vy);damageEnemies(X,Y,12,12,dx*6,dy*6);if(k%2===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:12});
     if(k>=16){explode(X|0,Y|0,12,{self:true,col:PH});shockFx(X,Y,.8);p.vx*=.3;p.vy*=.3;return false;}return true;});}},
 // Binary: she ignites, flies faster, everything she fires hits harder
 {n:'Go Binary',fn:(a,p,use)=>{if(!use(40))return;ST.cd=60;p.binary=600;fxWord(p.x,p.y-ST.PH-10,'BINARY!',1.5,'#ffd36a',true);snd('charge',p.x,p.y,{pitch:.8});flash(p.x,p.y,90,PH,14);shockFx(p.x,p.y-8,1);
   ACT.push(()=>{p.binary--;if(ST.frame%2===0)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,(R()-.5),-1.2,R()<.5?rgb(255,240,190):rgb(255,150,50),14,0,1,0,1);p.en=Math.min(100,p.en+.15);return p.binary>0;});}},
 {n:'Photon Nova',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=p.x,cy=p.y-ST.PH/2;explode(cx|0,cy|0,binary(p)?24:16,{self:true,col:PH,word:'FWAAASH!'});shockFx(cx,cy,1.2);damageEnemies(cx,cy,70*ST.aoeC,30,0,0,true);}},
 // a meteor dive from wherever she is down onto the cursor
 {n:'Starforce Dive',fn:(a,p,use)=>{if(!use(28))return;ST.cd=60;const tx=mouse.wx,ty=mouse.wy;let k=0;fxWord(p.x,p.y-20,'HIGHER, FURTHER, FASTER!',1,'#ffd36a',true);
   ACT.push(()=>{k++;const dx=tx-p.x,dy=ty-(p.y-ST.PH/2),d=Math.hypot(dx,dy)||1;p.script=2;p.vx=dx/d*11;p.vy=dy/d*11;carve(p.x+p.vx,p.y-ST.PH/2+p.vy,7,p.vx,p.vy);scriptMove(p,Math.abs(dx)<11?dx:p.vx,Math.abs(dy)<11?dy:p.vy);if(k%2===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:14});
     if(d<12||k>60){explode(tx|0,ty|0,20,{self:true,col:PH,fire:.2,word:'KA-THOOM!'});shockFx(tx,ty,1.3);damageEnemies(tx,ty,30,50,0,-3);ST.hitstop=Math.max(ST.hitstop,5);p.vx*=.2;p.vy=-2;return false;}return true;});}},
 {n:'Energy Absorb',fn:(a,p,use)=>{ST.cd=50;p.drink=150;fxWord(p.x,p.y-ST.PH-8,'FEED ME',.9,'#ffd36a',true);snd('psi',p.x,p.y,{pitch:.7});
   ACT.push(()=>{p.drink--;for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-p.x,s.y-p.y+8)<40){shots.splice(n,1);p.en=Math.min(100,p.en+6);flash(s.x,s.y,6,PH,2);}}
     for(let k=0;k<3;k++){const an=R()*6.283;spawn(p.x+Math.cos(an)*30,p.y-8+Math.sin(an)*30,-Math.cos(an)*2,-Math.sin(an)*2,rgb(255,220,140),12,0,1,0,1);}p.en=Math.min(100,p.en+.2);return p.drink>0;});}},
 {n:'Photon Barrage',fn:(a,p,use)=>{if(!use(26))return;ST.cd=50;let k=0;ACT.push(()=>{if(k%2===0){const e=nearestEnemy(mouse.wx,mouse.wy,200),tx=e?e.x:mouse.wx+(R()-.5)*40,ty=e?e.y:mouse.wy+(R()-.5)*40,h=p,dx=tx-h.x,dy=ty-(h.y-ST.PH/2),d=Math.hypot(dx,dy)||1,an=Math.atan2(dy,dx)+(R()-.5)*.8;
     shots.push({x:p.x,y:p.y-ST.PH/2,vx:Math.cos(an)*6,vy:Math.sin(an)*6,type:'photon',life:120,boom:6,col:PH,ecol:PH,home:true});}return++k<30;});snd('charge',p.x,p.y,{pitch:1.4});}},
 // an orbital strike: a column of photon light from the top of the sky to the cursor
 {n:'Kree Sky Lance',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;const tx=mouse.wx;let k=0;fxWord(tx,mouse.wy-40,'LOCKED ON',1,'#ffd36a',true);
   ACT.push(()=>{k++;const gy=surfaceY(tx|0,Math.max(0,mouse.wy-200),600),top=Math.min(gy,mouse.wy)-400;
     if(k<30){if(k%4===0)rings.push({x:tx,y:Math.min(gy,mouse.wy+40),r:20,vr:-.5,life:6,c:PH});return true;}
     beamCore({h:{x:tx,y:top},dx:0,dy:1,d:600},{pow:400,rad:5*ST.aoeC|0,len:Math.max(10,gy-top+30),w:6,c:PHC,g:[255,160,40],spark:()=>rgb(255,230,160),dmg:9});
     if(k===30){explode(tx|0,gy|0,22,{self:true,col:PH});shockFx(tx,gy,1.4);}return k<70;});}},
 // she plows a straight line through the whole block at full speed
 {n:'Higher Further Faster',fn:(a,p,use)=>{if(!use(36))return;ST.cd=80;const dx=a.dx,dy=a.dy;let k=0;fxWord(p.x,p.y-ST.PH-8,'FASTER!',1.3,'#ffd36a',true);
   ACT.push(()=>{k++;p.vx=dx*14;p.vy=dy*14;p.script=2;carve(p.x+dx*8,p.y-ST.PH/2+dy*8,10,dx*8,dy*8);scriptMove(p,p.vx,p.vy);damageEnemies(p.x,p.y-ST.PH/2,16,16,dx*8,dy*8);afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:16});
     for(const b of bodies)if(Math.hypot(b.x-p.x,b.y-p.y)<b.rmax+10){b.vx+=dx*5;b.vy+=dy*5;b.thrown=true;}ST.shake=Math.max(ST.shake,5);if(k>=22){p.vx*=.2;p.vy*=.2;return false;}return true;});}},
 {n:'Photon Cage',fn:(a,p,use)=>{if(!use(20))return;ST.cd=50;const cx=mouse.wx,cy=mouse.wy,r=30*ST.aoeC;for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r&&!e.def.titan){e.frozen=Math.max(e.frozen||0,160);hitEnemy(e,10,0,0);}
   for(let k=0;k<24;k++){const an=k/24*6.283;rings.push({x:cx,y:cy,r,vr:0,life:40,c:PH});spawn(cx+Math.cos(an)*r,cy+Math.sin(an)*r,0,0,rgb(255,230,150),40,0,1,0,0);}snd('psi',cx,cy);}},
 // the ultimate: a full binary supernova around her
 {n:'Binary Supernova',fn:(a,p,use)=>{if(!use(70))return;ST.cd=200;const cx=p.x,cy=p.y-ST.PH/2;let k=0;p.binary=Math.max(p.binary||0,300);fxWord(cx,cy-40,'SUPERNOVA!',1.8,'#ffd36a',true);snd('charge',cx,cy,{pitch:.5});
   ACT.push(()=>{k++;if(k<30){flash(cx,cy,k*3,PH,2);return true;}const r=(k-29)*10;for(let j=0;j<8;j++){const an=R()*6.283;explode(cx+Math.cos(an)*r|0,cy+Math.sin(an)*r|0,10,{self:true,quiet:true,col:PH});}
     if(k===30){explode(cx|0,cy|0,30,{self:true,col:PH,word:'KRA-KA-BOOOM!'});shockFx(cx,cy,1.8);ST.hitstop=Math.max(ST.hitstop,8);}damageEnemies(cx,cy,r+14,10,0,0,true);ST.shake=Math.max(ST.shake,14);return k<46;});}},
];
export const CHAR_MARVEL={id:'marvel',name:'Captain Marvel',spr:SPR_MARVEL,pal:PAL_MARVEL,pw:7,ph:19,fly:true,fs:3.8,boost:2.6,run:2,jump:4.8,hp:380,armor:.65,glow:PH,cape:null,thrust:()=>R()<.6?rgb(255,210,110):rgb(255,250,220),powers:MARVEL_POWERS};

// ================= SILVER SURFER =================
const SPR_SURFER=[
".....wSs.....",
"....wSSSs....",
"....SeSes....",
"....wSSSs....",
".....SSs.....",
"...sSSSSSd...",
".wSSwSSwSSsd.",
".wSwwSdwwSsd.",
".wSSSSdSSSsd.",
".wS.wSdSs.sd.",
".wS.SwdSs.sd.",
".SS.sSSSd.ss.",
".Ss.SSdSs.sd.",
"....wSSSs....",
"....wS.Ss....",
"....wS.Ss....",
"....SS.sd....",
"...wS...Ss...",
"...wS...Ss...",
"...SS...sd...",
"...SS...sd...",
"..sSS...Ssd.."];
const PAL_SURFER={w:rgb(250,252,255),S:rgb(206,212,228),s:rgb(146,152,170),d:rgb(90,96,114),e:rgb(220,240,255)};
ANIM.surfer={leg:14,mid:6,armC:'wSs',tipC:'Sss',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const CO=[150,220,255],COW=[230,250,255];
const SURFER_POWERS=[
 {n:'Cosmic Bolt',fn:(a,p,use)=>{if(!use(4))return;ST.cd=7;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*9,vy:a.dy*9,type:'cosmic',life:90,boom:7,col:CO,ecol:CO});}},
 {n:'Power Cosmic',fn:(a,p,use)=>{if(!use(1))return;beamCore(a,{pow:220,rad:2,len:520,w:2+(ST.frame&1),c:COW,g:[90,180,255],spark:()=>R()<.5?rgb(220,245,255):rgb(120,200,255),dmg:5});}},
 // the board flies out ahead of him, slices everything on its path and comes back
 {n:'Board Slice',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;let x=a.h.x,y=a.h.y,vx=a.dx*9,vy=a.dy*9,k=0;snd('whoosh',x,y,{pitch:1.3});
   ACT.push(()=>{k++;const lx=x,ly=y;if(k>22){const dx=p.x-x,dy=p.y-8-y,d=Math.hypot(dx,dy)||1;vx+=(dx/d*10-vx)*.2;vy+=(dy/d*10-vy)*.2;if(d<10)return false;}x+=vx;y+=vy;
     sliceLine(lx,ly,x,y,{edge:COW,w:1,push:1.3,quiet:k%4!==0});const nx=-vy,ny=vx,nd=Math.hypot(nx,ny)||1;sliceLine(x-nx/nd*6,y-ny/nd*6,x+nx/nd*6,y+ny/nd*6,{edge:COW,quiet:true});
     damageLine(lx,ly,x,y,6,8);for(let j=0;j<3;j++)spawn(x,y,(R()-.5),(R()-.5),rgb(200,240,255),12,0,1,0,1);return k<80;});}},
 // rearrange matter: whatever is under the cursor turns to glass, ice or water
 {n:'Transmute Matter',fn:(a,p,use)=>{if(!use(1.4))return;const cx=mouse.wx|0,cy=mouse.wy|0,r=14*ST.aoeC|0;for(let j=0;j<40;j++){const an=R()*6.283,d=R()*r,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X,m=t[i];
     if(KIND[m]===S&&m!==GLASS&&m!==ICE){const nm=d<r*.4?WATER:R()<.5?GLASS:ICE;setc(i,nm);if(nm===GLASS)col[i]=rgb(180+R()*40,230,255);}}
   flash(cx,cy,r,CO,2);for(let j=0;j<4;j++)spawn(cx+(R()-.5)*r*2,cy+(R()-.5)*r*2,0,-.5,rgb(200,240,255),16,0,1,0,1);}},
 {n:'Cosmic Shield',fn:(a,p,use)=>{if(!use(.5))return;ST.shieldOn=true;const cx=p.x,cy=p.y-8;for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<22){s.owner='player';s.vx*=-1.4;s.vy*=-1.4;s.col=CO;}}
   if(ST.frame%2===0)for(let k=0;k<6;k++){const an=R()*6.283;spawn(cx+Math.cos(an)*18,cy+Math.sin(an)*18,0,0,rgb(190,235,255),4,0,1,0,0);}}},
 // a wave of cosmic force that rolls along the ground away from him
 {n:'Cosmic Wave',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const dir=a.dx<0?-1:1;let x=p.x,k=0;snd('boom',p.x,p.y,{size:.6});
   ACT.push(()=>{k++;x+=dir*7;const gy=surfaceY(x|0,Math.max(0,p.y-80),300);explode(x|0,gy,7,{self:true,quiet:k%3!==0,col:CO});damageEnemies(x,gy-10,16,8,dir*4,-4);return k<34;});}},
 // a herald calls down a meteor shower from the edge of space
 {n:"Herald's Call",fn:(a,p,use)=>{if(!use(34))return;ST.cd=80;const cx=mouse.wx;let k=0;fxWord(cx,ST.camY+30,'FROM THE VOID!',1.1,'#bfe8ff',true);
   ACT.push(()=>{if(k%4===0)shots.push({x:cx+(R()-.5)*160,y:ST.camY-20,vx:(R()-.5)*1.5,vy:6,type:'cosmic',life:200,boom:10,col:CO,ecol:CO,fire:.1});return++k<60;});}},
 // a black hole in the cursor that pulls everything in, then pops
 {n:'Singularity',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;ST.vortex={x:mouse.wx,y:mouse.wy,life:260,max:260,k:ST.aoeC};fxWord(mouse.wx,mouse.wy-30,'SINGULARITY',1.1,'#bfe8ff',true);}},
 {n:'Nova Burst',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=p.x,cy=p.y-ST.PH/2;for(let k=0;k<20;k++){const an=k/20*6.283;shots.push({x:cx,y:cy,vx:Math.cos(an)*7,vy:Math.sin(an)*7,type:'cosmic',life:60,boom:6,col:CO,ecol:CO});}shockFx(cx,cy,.9);snd('boom',cx,cy,{size:.7});}},
 // hold: lifts every loose chunk near the cursor into orbit around it
 {n:'Gravity Lift',fn:(a,p,use)=>{if(!use(.8))return;const cx=mouse.wx,cy=mouse.wy;for(const b of bodies){const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<120*ST.aoeC){b.vx+=dx/d*.4-dy/d*.3;b.vy+=dy/d*.4+dx/d*.3-.3;b.rest=0;b.thrown=true;}}
   for(const e of enemies)if(!e.def.titan&&Math.hypot(e.x-cx,e.y-cy)<80){e.vy-=.5;e.vx+=(cx-e.x)*.01;}if(ST.frame%3===0)rings.push({x:cx,y:cy,r:30,vr:-1,life:8,c:CO});}},
 // carve straight down through the crust with the board as a blade: a sheer, deep cut
 {n:'Sky Cleaver',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx;let k=0;
   ACT.push(()=>{k++;const y0=ST.camY-20+(k-1)*16,y1=y0+16;sliceLine(cx,y0,cx+(R()-.5)*2,y1,{edge:COW,w:1,push:1.6,quiet:k%3!==0});damageLine(cx,y0,cx,y1,8,10);for(let j=0;j<3;j++)spawn(cx,y1,(R()-.5)*3,-R()*2,rgb(210,240,255),14,0,1,0,1);return k<30;});
   fxWord(cx,ST.camY+30,'SHHHKK!',1.2,'#bfe8ff',true);}},
 // Sentinel of the Spaceways: everything in sight is hit by the Power Cosmic at once
 {n:'Sentinel of the Spaceways',fn:(a,p,use)=>{if(!use(70))return;ST.cd=200;fxWord(p.x,p.y-50,'THE POWER COSMIC!',1.7,'#bfe8ff',true);snd('charge',p.x,p.y,{pitch:.5});ST.hitstop=Math.max(ST.hitstop,6);
   for(const e of enemies){if(Math.abs(e.x-p.x)>260||Math.abs(e.y-p.y)>160)continue;beamCore({h:{x:p.x,y:p.y-ST.PH/2},dx:(e.x-p.x)/(Math.hypot(e.x-p.x,e.y-p.y+8)||1),dy:(e.y-p.y+8)/(Math.hypot(e.x-p.x,e.y-p.y+8)||1),d:1},{pow:200,rad:2,len:Math.hypot(e.x-p.x,e.y-p.y)+20,w:3,c:COW,g:[90,180,255],spark:()=>rgb(220,245,255),dmg:2});hitEnemy(e,90,0,-2);explode(e.x|0,e.y|0,9,{self:true,col:CO});}
   shockFx(p.x,p.y-8,1.6);flash(p.x,p.y,200,CO,14);}},
];
export const CHAR_SURFER={id:'surfer',name:'Silver Surfer',spr:SPR_SURFER,pal:PAL_SURFER,pw:7,ph:19,fly:true,fs:4.4,boost:2.6,run:2,jump:4.6,hp:360,armor:.6,glow:CO,cape:null,thrust:()=>R()<.5?rgb(200,240,255):rgb(120,200,255),powers:SURFER_POWERS,board:true};

// ================= CAPTAIN AMERICA =================
const SPR_CAP=[
"....VBBBb....",
"...wVBwBb....",
"...wBwBwb....",
"....ffffF....",
".....fFF.....",
"...bVBBBBb...",
".VVBBBwBBBBb.",
".VBBBwwwBBBb.",
".VBBBwBwBBbb.",
".VB.RWRWr.Bb.",
".VB.RWRWr.Bb.",
".RR.nnnnn.Rr.",
".Rr.VBBBb.Rr.",
"....VBBBb....",
"....VB.Bb....",
"....VB.Bb....",
"....VB.Bb....",
"...RR...Rr...",
"...RR...Rr...",
"...RR...Rr...",
"...RR...Rr...",
"..RRr...Rrr.."];
const PAL_CAP={V:rgb(86,126,216),B:rgb(44,74,160),b:rgb(24,40,100),w:rgb(246,246,252),W:rgb(226,226,234),R:rgb(202,36,46),r:rgb(140,24,32),f:rgb(232,188,156),F:rgb(190,140,112),n:rgb(112,76,42)};
ANIM.cap={leg:14,mid:6,armC:'VBb',tipC:'RRr',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const SH_R=[200,40,48];
export function drawShield(s,pix){const R0=4;for(let y=-R0;y<=R0;y++)for(let x=-R0;x<=R0;x++){const d=Math.hypot(x,y);if(d>R0+.3)continue;const c=d<1.3?rgb(236,236,244):d<2.2?rgb(44,74,160):d<3.2?rgb(196,40,48):d<3.9?rgb(236,236,244):rgb(196,40,48);pix(s.x+x,s.y+y,c);}}
function throwShield(p,a,bounces,cut){shots.push({x:a.h.x,y:a.h.y,vx:a.dx*8,vy:a.dy*8,type:'shield',life:200,boom:0,bounces,cut,hit:new Set(),
  draw:drawShield});snd('whoosh',a.h.x,a.h.y,{pitch:1.2});}
const CAP_POWERS=[
 {n:'Shield Throw',fn:(a,p,use)=>{if(!use(6))return;ST.cd=22;throwShield(p,a,4,false);}},
 {n:'Shield Bash',fn:(a,p,use)=>{if(!use(5))return;ST.cd=14;p.punchF=8;const x=p.x+p.face*8,y=p.y-ST.PH/2;carve(x,y,6,p.face*5,0);damageEnemies(x,y,12,22,p.face*7,-3);explode(x|0,y|0,4,{self:true,quiet:true,col:[230,230,240]});snd('clang',x,y);fxWord(x,y-10,'KLANG!',.9,'#e6e6f2',true);}},
 // leaps and slams the shield into the ground: a shockwave that tears up slabs
 {n:'Shield Slam',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;if(p.ground){p.vy=-5;p.ground=false;}p.slam=true;p.slamOpt={r:30,col:[230,230,245]};}},
 // the cut throw: the edge of the shield slices through whatever it passes
 {n:'Edge Throw',fn:(a,p,use)=>{if(!use(10))return;ST.cd=26;throwShield(p,a,2,true);}},
 {n:'Charge',fn:(a,p,use)=>{if(!use(10))return;ST.cd=24;const dir=a.dx<0?-1:1;let k=0;fxWord(p.x,p.y-ST.PH-8,'HYAAH!',.9,'#e6e6f2',true);
   ACT.push(()=>{k++;p.vx=dir*7;p.script=2;carve(p.x+dir*6,p.y-ST.PH/2,ST.PH*.5,dir*5,0,Math.floor(p.y));scriptMove(p,p.vx,0);damageEnemies(p.x+dir*8,p.y-ST.PH/2,12,8,dir*7,-3);return k<18;});}},
 {n:'Avengers Assemble',fn:(a,p,use)=>{if(!use(50))return;ST.cd=200;fxWord(p.x,p.y-50,'AVENGERS... ASSEMBLE!',1.6,'#e6e6f2',true);snd('wave',p.x,p.y,{v:1});
   const allies=[[255,210,110],[200,40,40],[90,140,255],[120,255,120]];let k=0;
   ACT.push(()=>{k++;if(k%15===0){const c=allies[(k/15|0)%4],x=p.x+(R()-.5)*200,y=ST.camY-10;shots.push({x,y,vx:(mouse.wx-x)*.02,vy:5,type:'ally',life:120,boom:16,col:c,ecol:c,fire:.2});}return k<120;});}},
 {n:'Star Strike',fn:(a,p,use)=>{if(!use(14))return;ST.cd=26;const e=nearestEnemy(mouse.wx,mouse.wy,140);if(!e){fxWord(mouse.wx,mouse.wy,'?',.7);return;}const tx=e.x,ty=e.y;let k=0;
   ACT.push(()=>{k++;const dx=tx-p.x,dy=ty-(p.y-ST.PH/2),d=Math.hypot(dx,dy)||1;p.script=2;p.vx=dx/d*9;p.vy=dy/d*9;scriptMove(p,Math.abs(dx)<9?dx:p.vx,Math.abs(dy)<9?dy:p.vy);if(d<10||k>30){hitEnemy(e,40,dx/d*6,-4);explode(tx|0,ty|0,8,{self:true,col:[230,230,245]});fxWord(tx,ty-12,'POW!',1.1,'#e6e6f2',true);p.vx*=-.3;p.vy=-3;return false;}return true;});}},
 {n:'Frag Grenade',fn:(a,p,use)=>{if(!use(10))return;ST.cd=24;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*5,vy:a.dy*5-1.5,type:'bomb',life:90,boom:12,fire:.3,grav:.18});}},
 // the shield as a buckler: blocks fire from the front and throws it back
 {n:'Vibranium Block',fn:(a,p,use)=>{if(!use(.4))return;const fx=p.x+p.face*7,fy=p.y-ST.PH/2;for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.abs(s.x-fx)<12&&Math.abs(s.y-fy)<12){s.owner='player';s.vx*=-1.5;s.vy*=-1.2;flash(s.x,s.y,6,[255,255,255],2);snd('clang',s.x,s.y,{v:.5});}}
   p.block=6;for(const e of enemies)if(Math.abs(e.x-fx)<10&&Math.abs(e.y-fy)<14){e.vx+=p.face*2;}}},
 {n:'Uppercut',fn:(a,p,use)=>{if(!use(8))return;ST.cd=18;p.punchF=8;const x=p.x+p.face*6,y=p.y-ST.PH/2;damageEnemies(x,y,10,26,p.face*2,-8);carve(x,y-6,5,0,-4);p.vy=-4;fxWord(x,y-14,'WHAM!',1,'#e6e6f2',true);snd('thud',x,y);}},
 // shield spin: whirling around him, slicing everything close
 {n:'Shield Cyclone',fn:(a,p,use)=>{if(!use(26))return;ST.cd=60;let k=0;ACT.push(()=>{k++;const an=k*.6,r=16,cx=p.x,cy=p.y-ST.PH/2,x=cx+Math.cos(an)*r,y=cy+Math.sin(an)*r,x2=cx+Math.cos(an+.6)*r,y2=cy+Math.sin(an+.6)*r;
     sliceLine(x,y,x2,y2,{edge:[235,235,245],quiet:k%5!==0});damageEnemies(x,y,8,6,Math.cos(an)*3,Math.sin(an)*3);drawSpin.push({x,y,life:2});return k<70;});}},
 // I can do this all day: unstoppable for a while, health back on every hit he lands
 {n:'All Day',fn:(a,p,use)=>{if(!use(40))return;ST.cd=240;p.grit=240;p.gritD=0;fxWord(p.x,p.y-ST.PH-10,'I CAN DO THIS ALL DAY',1.2,'#e6e6f2',true);snd('roar',p.x,p.y,{pitch:1.5});}},
];
export const drawSpin=[];
export const CHAR_CAP={id:'cap',name:'Captain America',spr:SPR_CAP,pal:PAL_CAP,pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.2,jump:5.4,hp:400,armor:.7,glow:[230,230,245],cape:null,thrust:()=>rgb(230,230,245),powers:CAP_POWERS};
// per tick: shields ricochet toward the next enemy and come home; edge throws slice as they fly
export function updCapShields(){
  for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.type!=='shield')continue;const lx=s.x,ly=s.y;
    if(s.home){const dx=pl_x()-s.x,dy=pl_y()-s.y,d=Math.hypot(dx,dy)||1;s.vx+=(dx/d*9-s.vx)*.25;s.vy+=(dy/d*9-s.vy)*.25;if(d<8){shots.splice(n,1);continue;}}
    const st=Math.ceil(Math.hypot(s.vx,s.vy));let bounced=false;
    for(let k=0;k<st&&!bounced;k++){s.x+=s.vx/st;s.y+=s.vy/st;if(s.x<1||s.x>=W-1||s.y>=H-2){s.vx*=-1;bounced=true;break;}
      if(s.y>=0&&!s.cut){const m=t[(s.y|0)*W+(s.x|0)];if(m&&KIND[m]===S){explode(s.x|0,s.y|0,5,{self:true,quiet:true,col:[230,230,240]});snd('clang',s.x,s.y,{v:.6});s.x-=s.vx/st;s.y-=s.vy/st;bounced=true;}}
      for(const e of enemies){if(s.hit.has(e)||Math.abs(e.x-s.x)>e.def.w/2+4||Math.abs(e.y-s.y)>e.def.h/2+4)continue;s.hit.add(e);hitEnemy(e,28,s.vx*.5,s.vy*.5);flash(s.x,s.y,10,[255,255,255],3);fxWord(s.x,s.y-10,'KLANG!',.8,'#e6e6f2',true);bounced=true;break;}}
    if(s.cut)sliceLine(lx,ly,s.x,s.y,{edge:[240,240,250],quiet:true,push:1.2});
    if(bounced&&!s.home){if(--s.bounces<0)s.home=true;else{const e=nearestUnhit(s);if(e){const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy)||1;s.vx=dx/d*8;s.vy=dy/d*8;}else{s.vx=-s.vx;s.vy=-s.vy;}}}
    if(--s.life<=0)s.home=true;}
  for(let n=drawSpin.length-1;n>=0;n--)if(--drawSpin[n].life<=0)drawSpin.splice(n,1);
}
const pl_x=()=>pl_.x,pl_y=()=>pl_.y-ST.PH/2;
function nearestUnhit(s){let b=null,bd=200;for(const e of enemies){if(s.hit.has(e))continue;const d=Math.hypot(e.x-s.x,e.y-s.y);if(d<bd){bd=d;b=e;}}return b;}
