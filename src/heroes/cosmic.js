// Cosmic newcomers: Captain Marvel (photon powers, Binary mode) and the Silver Surfer (the Power Cosmic,
// a board that cuts through anything), plus Captain America (a shield that ricochets and slices).
import { ST } from '../state.js';
import { EMPTY, FIRE, GFIRE, GLASS, ICE, KIND, LAVA, NEON, R, S, STEEL, STONE, WATER, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { beamCore, lightningStrike, quake, scriptMove, shockFx, shots, surfaceY, zap } from './powers.js';
import { ACT } from './xmen.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { TK } from '../render/titan.js';
import { echo, nearestN, tagged } from './kitlib.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { solidCells } from './wave2.js';
import { makeBody } from '../world/bodies.js';

// ================= CAPTAIN MARVEL =================
const PH=[255,210,110],PHC=[255,245,200];
const binary=p=>p.binary>0;
function drawGoose(s){const x=s.x,y=s.y,f=s.face,o={},O=rgb(230,150,60);TK.begin();TK.ell(x,y-4,6,3.5,O,o);TK.ell(x+f*6,y-7,3.5,3,O,o);TK.cap(x+f*5,y-10,x+f*5,y-12,1,.4,O,o);TK.cap(x+f*8,y-10,x+f*8,y-12,1,.4,O,o);TK.cap(x-f*6,y-5,x-f*10,y-10,1,1,O,o);TK.end();}
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
 // photon energy leaps between up to six enemies near the cursor
 {n:'Binary Chain',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,120,6);if(!list.length)return;if(!use(20))return;ST.cd=35;let prev=a.h;
   for(const e of list){beams.push({pts:[[prev.x,prev.y],[(prev.x+e.x)/2+(R()-.5)*10,(prev.y+e.y)/2+(R()-.5)*10],[e.x,e.y]],life:8,c:[255,245,200],g:[255,170,60]});hitEnemy(e,p.binary>0?34:22,0,-1);flash(e.x,e.y,12,[255,200,90],3);prev=e;}snd('zap',a.h.x,a.h.y,{pitch:.8});}},
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
 // she drinks the fire, lava and neon around the cursor, then hits with all of it
 {n:'Energy Siphon Punch',fn:(a,p,use)=>{const cx=mouse.wx|0,cy=mouse.wy|0,r=34*ST.aoeC|0;let n=0;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if(m===FIRE||m===GFIRE||m===LAVA||m===NEON){setc(i,EMPTY);n++;if(R()<.15)spawn(X,Y,(a.h.x-X)*.06,(a.h.y-Y)*.06,rgb(255,200,90),24,0,1,0,0);}}
   if(!use(8))return;ST.cd=30;p.en=Math.min(100,p.en+n*.05);const big=Math.min(24,6+n/40|0);shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'photon',life:90,boom:big,col:[255,220,120],ecol:[255,200,90]});fxWord(p.x,p.y-ST.PH-8,n>60?'TOO MUCH POWER!':'ABSORBED',.9,'#ffd36a',true);}},
 // a photon blast into the ground cracks it open in a starburst of cuts
 {n:'Shatterpoint',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=mouse.wx,cy=groundBelow(cx|0,mouse.wy);explode(cx|0,cy|0,9,{self:true,col:[255,200,90]});
   for(let k=0;k<9;k++){const an=Math.PI*(k/8),L=(60+R()*40)*ST.aoeC;sliceLine(cx,cy,cx+Math.cos(an)*L,cy+Math.sin(an)*L*.9,{edge:[255,220,140],w:1,push:1.5,quiet:k>0});}damageEnemies(cx,cy,50,26,0,-3);fxWord(cx,cy-30,'KRAKKK!',1.2,'#ffd36a',true);shockFx(cx,cy,1);}},
 {n:'Goose the Flerken',fn:(a,p,use)=>{if(summons.some(s=>s.goose)||!use(24))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'GOOSE!',1,'#ffd36a',true);
    summons.push({goose:true,x:p.x,y:p.y,vy:0,face:p.face,cd:0,tent:0,tg:null,life:480,upd(s){s.vy+=.35;s.y+=s.vy;const gy=groundBelow(s.x|0,s.y-10);if(s.y>=gy){s.y=gy;s.vy=0;}if(s.cd>0)s.cd--;
      if(s.tent>0&&s.tg){s.tent--;for(let j=0;j<3;j++)beams.push({pts:[[s.x+s.face*7,s.y-6],[(s.x+s.tg.x)/2+(j-1)*6,(s.y+s.tg.y)/2-6],[s.tg.x,s.tg.y]],life:1,c:[255,170,200],g:[180,60,120]});}
      const e=nearestEnemy(s.x,s.y-6,220);if(!e){s.x+=(pl_.x-pl_.face*16-s.x)*.06;return;}s.face=e.x>s.x?1:-1;const d=Math.hypot(e.x-s.x,e.y-(s.y-6));
      if(d>30)s.x+=s.face*2;else if(s.cd<=0){s.cd=50;s.tent=14;s.tg=e;if(!e.def.titan&&e.hp<=90){e.hp=0;fxWord(e.x,e.y-10,'*GULP*',1,'#ffd36a',true);}else hitEnemy(e,22,s.face*3,-2);}},draw:drawGoose});}},
 // the ultimate: a full binary supernova around her
 {n:'Binary Supernova',ult:true,fn:(a,p,use)=>{if(!use(70))return;ST.cd=200;const cx=p.x,cy=p.y-ST.PH/2;let k=0;p.binary=Math.max(p.binary||0,300);fxWord(cx,cy-40,'SUPERNOVA!',1.8,'#ffd36a',true);snd('charge',cx,cy,{pitch:.5});
   ACT.push(()=>{k++;if(k<30){flash(cx,cy,k*3,PH,2);return true;}const r=(k-29)*10;for(let j=0;j<8;j++){const an=R()*6.283;explode(cx+Math.cos(an)*r|0,cy+Math.sin(an)*r|0,10,{self:true,quiet:true,col:PH});}
     if(k===30){explode(cx|0,cy|0,30,{self:true,col:PH,word:'KRA-KA-BOOOM!'});shockFx(cx,cy,1.8);ST.hitstop=Math.max(ST.hitstop,8);}damageEnemies(cx,cy,r+14,10,0,0,true);ST.shake=Math.max(ST.shake,14);return k<46;});}}
];
export const CHAR_MARVEL={id:'marvel',name:'Captain Marvel',pw:7,ph:19,fly:true,fs:3.8,boost:2.6,run:2,jump:4.8,hp:380,armor:.65,glow:PH,cape:null,thrust:()=>R()<.6?rgb(255,210,110):rgb(255,250,220),powers:MARVEL_POWERS};

// ================= SILVER SURFER =================
const CO=[150,220,255],COW=[230,250,255];
function drawHand(s){const x=s.x,y=s.y,P=rgb(118,44,150),B=rgb(44,66,160),o={};TK.begin();TK.cap(x,y-200,x,y-40,26,22,B,o);TK.ell(x,y-24,30,26,P,o);
  const cl=s.closed?1:0;for(let k=-2;k<=2;k++)TK.cap(x+k*12,y-14,x+k*(cl?6:16),y+(cl?6:22),6,5,P,o);TK.end();}
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
 // the Power Cosmic brands the enemies near the cursor: they take half again as much damage
 {n:'Power Cosmic Brand',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,80*ST.aoeC,10);if(!list.length)return;if(!use(18))return;ST.cd=40;for(const e of list){applyStatus(e,'mark',600);hitEnemy(e,8,0,0);for(let k=0;k<6;k++)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(200,240,255),14,0,1,0,1);}fxWord(mouse.wx,mouse.wy-24,'BRANDED',1,'#bfe8ff',true);}},
 // a wave of cosmic force that rolls along the ground away from him
 {n:'Cosmic Wave',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const dir=a.dx<0?-1:1;let x=p.x,k=0;snd('boom',p.x,p.y,{size:.6});
   ACT.push(()=>{k++;x+=dir*7;const gy=surfaceY(x|0,Math.max(0,p.y-80),300);explode(x|0,gy,7,{self:true,quiet:k%3!==0,col:CO});damageEnemies(x,gy-10,16,8,dir*4,-4);return k<34;});}},
 // his old master's hand reaches down out of the sky and takes a piece of the world
 {n:'Hand of Galactus',fn:(a,p,use)=>{if(summons.some(s=>s.ghand)||!use(40))return;ST.cd=90;const tx=mouse.wx,ty=mouse.wy;fxWord(tx,ST.camY+30,'GALACTUS HUNGERS',1.2,'#c88cff',true);snd('boss',tx,ty,{v:.7});
   summons.push({ghand:true,x:tx,y:ST.camY-60,life:400,ph:0,b:null,closed:false,upd(s){
     if(s.ph===0){s.y+=8;if(s.y>=ty){s.ph=1;s.closed=true;const n0=solidCells(tx,ty,24,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n>20){s.b=makeBody(q,n,true);if(s.b)s.b.overhead=true;}
         for(const e of enemies)if(Math.hypot(e.x-tx,e.y-ty)<34)hitEnemy(e,60,0,-3);ST.shake=14;snd('slam',tx,ty);}}
     else{s.y-=4;if(s.b&&bodies.includes(s.b)){s.b.x=s.x;s.b.y=s.y+10;s.b.vx=s.b.vy=0;}if(s.y<ST.camY-140){if(s.b&&bodies.includes(s.b)){s.b.held=false;s.b.overhead=false;s.b.vy=3;s.b.thrown=true;}return false;}}},draw:drawHand});}},
 // a black hole in the cursor that pulls everything in, then pops
 {n:'Singularity',fn:(a,p,use)=>{if(!use(40))return;ST.cd=90;ST.vortex={x:mouse.wx,y:mouse.wy,life:260,max:260,k:ST.aoeC};fxWord(mouse.wx,mouse.wy-30,'SINGULARITY',1.1,'#bfe8ff',true);}},
 // he grinds the board along the ground: the surface peels up in slabs behind him
 {n:'Surface Grind',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const dir=a.dx<0?-1:1;let k=0;p.fly=true;fxWord(p.x,p.y-ST.PH-8,'SHHHRRRRK!',1,'#bfe8ff',true);
   ACT.push(()=>{k++;p.script=2;const gy=surfaceY(p.x+dir*4|0,Math.max(0,p.y-20|0),60);scriptMove(p,dir*7,gy-1-p.y);sliceLine(p.x-dir*12,gy+5,p.x+dir*6,gy+5,{edge:[230,250,255],quiet:true,push:1.2});
     if(k%4===0){const n0=solidCells(p.x-dir*10,gy+3,6,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n>12){const b=makeBody(q,n,false);if(b){b.vx=-dir*2+(R()-.5);b.vy=-3-R()*2;b.va=(R()-.5)*.2;b.chunk=true;}}}
     damageEnemies(p.x,p.y-ST.PH/2,12,8,dir*5,-5);afters.push({x:p.x,y:p.y,ang:0,face:dir,life:8});return k<50;});}},
 // hold: lifts every loose chunk near the cursor into orbit around it
 {n:'Gravity Lift',fn:(a,p,use)=>{if(!use(.8))return;const cx=mouse.wx,cy=mouse.wy;for(const b of bodies){const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<120*ST.aoeC){b.vx+=dx/d*.4-dy/d*.3;b.vy+=dy/d*.4+dx/d*.3-.3;b.rest=0;b.thrown=true;}}
   for(const e of enemies)if(!e.def.titan&&Math.hypot(e.x-cx,e.y-cy)<80){e.vy-=.5;e.vx+=(cx-e.x)*.01;}if(ST.frame%3===0)rings.push({x:cx,y:cy,r:30,vr:-1,life:8,c:CO});}},
 // carve straight down through the crust with the board as a blade: a sheer, deep cut
 {n:'Sky Cleaver',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const cx=mouse.wx;let k=0;
   ACT.push(()=>{k++;const y0=ST.camY-20+(k-1)*16,y1=y0+16;sliceLine(cx,y0,cx+(R()-.5)*2,y1,{edge:COW,w:1,push:1.6,quiet:k%3!==0});damageLine(cx,y0,cx,y1,8,10);for(let j=0;j<3;j++)spawn(cx,y1,(R()-.5)*3,-R()*2,rgb(210,240,255),14,0,1,0,1);return k<30;});
   fxWord(cx,ST.camY+30,'SHHHKK!',1.2,'#bfe8ff',true);}},
 // a wall of starlight crystal rises out of the ground at the cursor
 {n:'Starlight Barrier',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;const cx=mouse.wx|0,gy=groundBelow(cx,mouse.wy),h=60*ST.aoeC|0;let k=0;
   ACT.push(()=>{k++;for(let y=gy-k*4;y<gy-k*4+4&&y>gy-h;y++)for(let x=cx-2;x<=cx+2;x++){if(x<0||x>=W||y<0||y>=H)continue;const i=y*W+x;if(t[i]===0){setc(i,GLASS);col[i]=(x+y)%5===0?rgb(255,255,255):rgb(190,230,255);}}
     for(const e of enemies)if(Math.abs(e.x-cx)<8&&e.y>gy-k*4-8&&e.y<gy)hitEnemy(e,10,Math.sign(e.x-cx)*5,-3);return k*4<h;});snd('ice',cx,gy);}},
 // he throws the board: it boomerangs through everything and comes back to his hand
  {n:'Board Throw',fn:(a,p,use)=>{if(p.boardOut||!use(14))return;ST.cd=30;p.boardOut=true;let x=a.h.x,y=a.h.y,vx=a.dx*10,vy=a.dy*10,k=0;const hit=new Set();
    ACT.push(()=>{k++;if(k>16){const h=hand(),dx=h.x-x,dy=h.y-y,d=Math.hypot(dx,dy)||1;vx+=(dx/d*11-vx)*.2;vy+=(dy/d*11-vy)*.2;if(k===17)hit.clear();if(d<10){p.boardOut=false;return false;}}
      const lx=x,ly=y;x+=vx;y+=vy;sliceLine(lx,ly,x,y,{edge:[230,250,255],quiet:true,push:1.2});const an=k*.6,c=Math.cos(an)*8,s=Math.sin(an)*2;beams.push({x0:x-c,y0:y-s,x1:x+c,y1:y+s,life:2,w:1,c:[235,245,255],g:[120,200,255]});
      for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-x)<e.def.w/2+5&&Math.abs(e.y-y)<e.def.h/2+5){hit.add(e);hitEnemy(e,24,vx*.4,vy*.4);}if(k>90){p.boardOut=false;return false;}return true;});}},
 // Sentinel of the Spaceways: everything in sight is hit by the Power Cosmic at once
 {n:'Sentinel of the Spaceways',ult:true,fn:(a,p,use)=>{if(!use(70))return;ST.cd=200;fxWord(p.x,p.y-50,'THE POWER COSMIC!',1.7,'#bfe8ff',true);snd('charge',p.x,p.y,{pitch:.5});ST.hitstop=Math.max(ST.hitstop,6);
   for(const e of enemies){if(Math.abs(e.x-p.x)>260||Math.abs(e.y-p.y)>160)continue;beamCore({h:{x:p.x,y:p.y-ST.PH/2},dx:(e.x-p.x)/(Math.hypot(e.x-p.x,e.y-p.y+8)||1),dy:(e.y-p.y+8)/(Math.hypot(e.x-p.x,e.y-p.y+8)||1),d:1},{pow:200,rad:2,len:Math.hypot(e.x-p.x,e.y-p.y)+20,w:3,c:COW,g:[90,180,255],spark:()=>rgb(220,245,255),dmg:2});hitEnemy(e,90,0,-2);explode(e.x|0,e.y|0,9,{self:true,col:CO});}
   shockFx(p.x,p.y-8,1.6);flash(p.x,p.y,200,CO,14);}}
];
export const CHAR_SURFER={id:'surfer',name:'Silver Surfer',pw:7,ph:19,fly:true,fs:4.4,boost:2.6,run:2,jump:4.6,hp:360,armor:.6,glow:CO,cape:null,thrust:()=>R()<.5?rgb(200,240,255):rgb(120,200,255),powers:SURFER_POWERS,board:true};

// ================= CAPTAIN AMERICA =================
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
 // he is worthy: Mjolnir answers, and lightning rings him
 {n:'Worthy',fn:(a,p,use)=>{if(!use(36))return;ST.cd=90;let k=0;fxWord(p.x,p.y-ST.PH-14,'I KNEW IT!',1.3,'#bfe3ff',true);
   ACT.push(()=>{k++;if(k%6===0){const an=k*.5,x=p.x+Math.cos(an)*(30+k)*ST.aoeC;lightningStrike(x,groundBelow(x|0,p.y-20),7);}return k<48;});}},
 // a rallying cry: he heals over five seconds and every hit he lands does 30% more
 {n:'Inspiring Rally',fn:(a,p,use)=>{if(!use(28))return;ST.cd=120;ST.buffT=ST.frame+480;let k=0;fxWord(p.x,p.y-ST.PH-12,'ON YOUR LEFT!',1.1,'#e6e6f2',true);rings.push({x:p.x,y:p.y-8,r:6,vr:3,life:16,c:[230,230,245]});
   ACT.push(()=>{k++;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.3/300);if(k%6===0)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,0,-.7,rgb(255,240,200),16,0,1,0,1);return k<300;});}},
 {n:'Shield Surf',fn:(a,p,use)=>{if(!use(12))return;ST.cd=30;const f=a.dx<0?-1:1,hit=new Set();let k=0;fxWord(p.x,p.y-ST.PH-8,'SHIELD SURF!',.9,'#e6e6f2',true);
    ACT.push(()=>{k++;p.script=2;p.face=f;carve(p.x+f*8,p.y-ST.PH/2,ST.PH*.4,f*4,-1);const gy=surfaceY(p.x+f*5|0,Math.max(0,p.y-24|0),60);scriptMove(p,f*5.5,Math.max(-6,Math.min(4,gy-1-p.y)));
      for(let j=0;j<2;j++)spawn(p.x-f*4,p.y+1,-f*2,-R(),rgb(255,230,160),8,0,1,0,1);for(const e of enemies)if(!hit.has(e)&&Math.abs(e.x-(p.x+f*6))<e.def.w/2+6&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+ST.PH/2){hit.add(e);hitEnemy(e,20,f*6,-4);}return k<70;});}},
 // the team arrives, one after another: Hulk lands, Thor strikes, Iron Man sweeps a beam, Black Widow's bites
 {n:'Avengers Assemble',ult:true,fn:(a,p,use)=>{if(!use(50))return;ST.cd=200;fxWord(p.x,p.y-50,'AVENGERS... ASSEMBLE!',1.6,'#e6e6f2',true);snd('wave',p.x,p.y,{v:1});let k=0;const pick=()=>nearestEnemy(mouse.wx,mouse.wy,300)||{x:mouse.wx,y:mouse.wy};
   ACT.push(()=>{k++;
     if(k===20){const e=pick(),gx=e.x,gy=groundBelow(gx|0,e.y);summons.push({x:gx,y:ST.camY-20,life:60,vy:6,upd(s){if(s.y<gy){s.y=Math.min(gy,s.y+s.vy);s.vy+=1;if(s.y>=gy){quake(gx,gy,{r:30,col:[120,255,90]});fxWord(gx,gy-40,'HULK SMASH!',1.4,'#bff07a',true);}}},draw(s){echo('hulk',s.x,s.y,1);}});}
     if(k===60){const e=pick();summons.push({x:e.x-30,y:e.y-20,life:40,draw(s){echo('thor',s.x,s.y,1);}});lightningStrike(e.x,e.y,12);fxWord(e.x,e.y-40,'FOR ASGARD!',1.2,'#bfe3ff',true);}
     if(k===100){const x0=ST.camX+20,y0=ST.camY+30;summons.push({x:x0,y:y0,life:60,draw(s){echo('iron',s.x,s.y,1);}});let j=0;ACT.push(()=>{j++;const e=pick(),an=Math.atan2(e.y-y0,e.x-x0)+(j-20)*.01;beams.push({x0,y0:y0-8,x1:x0+Math.cos(an)*500,y1:y0-8+Math.sin(an)*500,life:2,w:3,c:[230,250,255],g:[120,200,255]});damageLine(x0,y0-8,x0+Math.cos(an)*500,y0-8+Math.sin(an)*500,6,4);return j<40;});fxWord(x0+60,y0,'UNIBEAM!',1.1,'#ff6b5c',true);}
     if(k===150){for(const e of nearestN(p.x,p.y,260,4)){tagged('shock',()=>hitEnemy(e,24,0,0));applyStatus(e,'stun',90);zap(p.x,p.y-10,e.x,e.y,[255,240,180],[255,200,60]);}fxWord(p.x,p.y-40,"WIDOW'S BITE!",1.1,'#ff6b5c',true);}
     return k<160;});}}
];
export const drawSpin=[];
export const CHAR_CAP={id:'cap',name:'Captain America',pw:7,ph:19,fly:false,fs:2.4,boost:2,run:2.2,jump:5.4,hp:400,armor:.7,glow:[230,230,245],cape:null,thrust:()=>rgb(230,230,245),powers:CAP_POWERS};
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
