// Kit overhaul, part B: Storm, Venom, Mister Fantastic, Invisible Woman, Human Torch, the Thing, Black
// Panther, Captain America, Captain Marvel, Silver Surfer, Ghost Rider, Deadpool. applyKits() swaps the
// reworks (REWORK[id][old name]) in and appends the new powers (EXTRA[id]); the ultimate moves to the end
// of the bar since G fires it.
import { ST } from '../state.js';
import { EMPTY, FIRE, GFIRE, GLASS, KIND, LAVA, NEON, R, S, WATER, WEB, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { bodies, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn, spawnFlake } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode, ringChunks } from '../world/destruction.js';
import { clawSlice, sliceLine } from '../world/slice.js';
import { snd } from '../sfx.js';
import { lightningStrike, quake, scriptMove, shockFx, shots, surfaceY } from './powers.js';
import { ACT } from './xmen.js';
import { solidCells } from './wave2.js';
import { carve, hand, mouse, pl_ } from '../player.js';
import { damageEnemies, damageLine, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, markUlt, summons } from './abilities.js';
import { EXTRA, REWORK, nearestN, tagged } from './kits2a.js';
import { TK } from '../render/titan.js';
import { pix } from '../render/canvas.js';
import { drawSprite } from '../render/sprites.js';

const drawPix=(x,y,c,g)=>pix(x,y,c,g?c:0);
let ROSTER=[];const heroOf=id=>ROSTER.find(c=>c.id===id);
function echo(id,x,y,face,c){const h=heroOf(id);if(!h)return;ST.TG=c||null;drawSprite(x,y,0,face,!!c,h.spr,h.pal);ST.TG=null;}

// ================= STORM =================
EXTRA.storm=[
 // a downpour over the cursor: everything there is soaked (and conducts her lightning: ELECTROCUTED)
 {n:'Monsoon',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const cx=mouse.wx,cy=mouse.wy,r=110*ST.aoeC;let k=0;fxWord(cx,ST.camY+30,'MONSOON!',1.1,'#d8e4ff',true);snd('splash',cx,cy,{v:.6});
   ACT.push(()=>{k++;for(let j=0;j<8;j++)spawn(cx+(R()-.5)*r*2,ST.camY-2,-.3,3.6+R(),rgb(120,150,220),80,0,0,1);if(k%3===0){const X=cx+(R()-.5)*r*2|0,Y=Math.max(1,ST.camY+4|0);if(X>0&&X<W&&Y<H&&t[Y*W+X]===0)setc(Y*W+X,WATER);}
     for(const e of enemies)if(Math.abs(e.x-cx)<r&&e.y>ST.camY)applyStatus(e,'wet',600);return k<150;});}},
 // she draws a fog bank around herself: enemies lose sight of her and everything in it is wet
 {n:'Fog Bank',fn:(a,p,use)=>{if(!use(20))return;ST.cd=60;p.stealth=360;p.lastSeen={x:p.x+(R()-.5)*120,y:p.y-8};let k=0;fxWord(p.x,p.y-ST.PH-8,'*HSSSSS*',.9,'#d8e4ff',true);
   ACT.push(()=>{k++;const cx=p.x,cy=p.y-ST.PH/2;for(let j=0;j<5;j++)spawnFlake(cx+(R()-.5)*160,cy+(R()-.5)*80,(R()-.5)*.2,(R()-.5)*.1,rgb(200,206,214),80,0);for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<110)applyStatus(e,'wet',200);return k<360;});}},
];

// ================= VENOM =================
EXTRA.venom=[
 // three little symbiotes split off and hunt
 {n:'Symbiote Spawn',fn:(a,p,use)=>{if(!use(24))return;ST.cd=50;fxWord(p.x,p.y-ST.PH-8,'GO, CHILDREN!',.9,'#e6e6f2',true);for(let i=0;i<3;i++)summons.push({x:p.x+(i-1)*6,y:p.y,vy:0,life:480,cd:0,face:1,
   upd(s){const e=nearestEnemy(s.x,s.y,300);s.vy+=.35*(ST.gk||1);const g=groundBelow(s.x|0,s.y-6);if(s.y+s.vy>=g){s.y=g;s.vy=0;if(e&&Math.abs(e.x-s.x)<40&&--s.cd<=0){s.cd=30;s.vy=-5;}}else s.y+=s.vy;
     if(e){s.face=e.x>s.x?1:-1;s.x+=s.face*1.6;if(Math.hypot(e.x-s.x,e.y-s.y)<e.def.w/2+5&&ST.frame%10===0){hitEnemy(e,9,0,0);spawn(e.x,e.y,(R()-.5)*2,-1,rgb(30,30,40),14,0,0,1);}}},
   draw(s){const w=(ST.frame>>2)&1;for(let y=0;y<4;y++)for(let x=-3;x<=3;x++)if(Math.abs(x)<=3-(y===0?1:0))drawPix(s.x+x,s.y-y-1,y===3?rgb(40,38,52):rgb(18,16,24));drawPix(s.x+s.face,s.y-3,rgb(240,240,250));drawPix(s.x+s.face*2,s.y-3,rgb(240,240,250));if(w)drawPix(s.x-s.face*4,s.y-1,rgb(18,16,24));}});}},
 // Carnage takes over for a while: red tendril-axes lash out at anything near
 {n:'Carnage Mode',fn:(a,p,use)=>{if(p.carnage>0||!use(34))return;ST.cd=60;p.carnage=480;fxWord(p.x,p.y-ST.PH-10,'CARNAGE RULES!',1.2,'#ff3b3b',true);snd('roar',p.x,p.y,{pitch:1.2});
   ACT.push(()=>{if(--p.carnage<=0)return false;const cx=p.x,cy=p.y-ST.PH/2;if(ST.frame%3===0)spawn(cx+(R()-.5)*10,cy+(R()-.5)*14,(R()-.5),-1,rgb(200+R()*55|0,20,30),14,0,1,0,1);
     if(ST.frame%12===0){const e=nearestEnemy(cx,cy,70);const an=e?Math.atan2(e.y-cy,e.x-cx):R()*6.283,L=e?Math.min(70,Math.hypot(e.x-cx,e.y-cy)+8):40;sliceLine(cx,cy,cx+Math.cos(an)*L,cy+Math.sin(an)*L,{edge:[220,30,40],quiet:true,push:1.2});
       if(e)hitEnemy(e,14,Math.cos(an)*3,Math.sin(an)*3);beams.push({pts:[[cx,cy],[cx+Math.cos(an+.3)*L*.5,cy+Math.sin(an+.3)*L*.5],[cx+Math.cos(an)*L,cy+Math.sin(an)*L]],life:4,c:[255,80,80],g:[200,20,30]});}return true;});}},
];

// ================= MISTER FANTASTIC =================
EXTRA.reed=[
 // he stretches into a rubber net between his hand and the cursor: it holds whatever hits it
 {n:'Elastic Net',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;const h=a.h,tx=mouse.wx,ty=mouse.wy,d=Math.hypot(tx-h.x,ty-h.y)||1,n=Math.min(200,d)|0;
   for(let k=0;k<n;k++){const x=h.x+(tx-h.x)*k/d+Math.sin(k*.4)*1.5|0,y=h.y+(ty-h.y)*k/d+Math.cos(k*.3)*1.5|0;for(const [ox,oy] of [[0,0],[0,1]]){const X=x+ox,Y=y+oy;if(X<0||X>=W||Y<0||Y>=H-44)continue;const i=Y*W+X;if(t[i]===0){setc(i,WEB);col[i]=rgb(80,130+R()*30|0,200);}}}
   for(const e of enemies){const u=Math.max(0,Math.min(1,((e.x-h.x)*(tx-h.x)+(e.y-h.y)*(ty-h.y))/(d*d)));if(Math.hypot(h.x+(tx-h.x)*u-e.x,h.y+(ty-h.y)*u-e.y)<10&&!e.def.titan)e.webbed=Math.max(e.webbed||0,180);}fxWord((h.x+tx)/2,(h.y+ty)/2-12,'BOINNNG!',.9,'#9fd0f0',true);snd('whoosh',h.x,h.y,{pitch:.8});}},
 // he works out every enemy's weak point: all marked for eight seconds
 {n:'Weakness Analysis',fn:(a,p,use)=>{if(!use(22))return;ST.cd=80;let n=0;for(const e of enemies){if(Math.abs(e.x-p.x)>260||Math.abs(e.y-p.y)>160)continue;applyStatus(e,'mark',480);n++;}fxWord(p.x,p.y-ST.PH-10,n?'FASCINATING... '+n+' WEAK POINTS':'NOTHING TO ANALYSE',.9,'#9fd0f0',true);}},
];

// ================= INVISIBLE WOMAN =================
EXTRA.sue=[
 // a force field thin as a razor: one long clean cut through whatever is in front of her
 {n:'Force Blade',fn:(a,p,use)=>{if(!use(16))return;ST.cd=30;const h=a.h,L=260;sliceLine(h.x,h.y,h.x+a.dx*L,h.y+a.dy*L,{edge:[170,220,255],w:1,push:1.4});damageLine(h.x,h.y,h.x+a.dx*L,h.y+a.dy*L,5,26);snd('slash',h.x,h.y,{pitch:1.5});}},
 // rings of force ripple out from her and push everything away
 {n:'Force Ripples',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;let k=0;const cx=p.x,cy=p.y-ST.PH/2;
   ACT.push(()=>{k++;if(k%10===1){const r0=6;rings.push({x:cx,y:cy,r:r0,vr:3.4*ST.aoeC,life:24,c:[170,220,255]});}const band=(k%10)*3.4*ST.aoeC+6;
     for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(Math.abs(d-band)<b.rmax+6){b.vx+=dx/d*.9;b.vy+=dy/d*.9-.2;b.rest=0;}}
     if(k%10===5)for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<band+8&&d>band-30)hitEnemy(e,8,dx/d*4,dy/d*4-1);}return k<40;});}},
];

// ================= HUMAN TORCH =================
REWORK.torch={'Fire Rain':
 // a bird of living flame circles the cursor, then dives into it
 {n:'Firebird',fn:(a,p,use)=>{if(!use(30))return;ST.cd=55;const cx=mouse.wx,cy=mouse.wy;let k=0,x=a.h.x,y=a.h.y;fxWord(cx,cy-40,'FIREBIRD!',1.2,'#ffb347',true);snd('fireburst',x,y);
   ACT.push(()=>{k++;let tx,ty;if(k<80){const an=k*.12;tx=cx+Math.cos(an)*50;ty=cy-30+Math.sin(an)*22;}else{tx=cx;ty=cy;}x+=(tx-x)*(k<80?.18:.35);y+=(ty-y)*(k<80?.18:.35);
     const f=Math.sin(k*.6);for(const s of [-1,1])for(let j=1;j<6;j++)spawn(x+s*j*2,y-f*j*.8+j*.4,(R()-.5)*.3,-.2,j<3?rgb(255,240,180):rgb(255,120,30),6,0,1,0,1);spawn(x,y,(R()-.5),(R()-.5),rgb(255,200,80),20,R()<.05?FIRE:0,1,1);
     tagged('fire',()=>damageEnemies(x,y,8,1.5,0,0));
     if(k>=80&&Math.hypot(x-cx,y-cy)<4){explode(cx|0,cy|0,16,{fire:.6,word:'SKRAAAW!'});shockFx(cx,cy,1);return false;}return k<120;});}},
 'Nova Flare':
 // a doppelganger of living fire runs at the nearest enemy and goes up like a bomb
 {n:'Flame Clone',fn:(a,p,use)=>{if(!use(22))return;ST.cd=40;fxWord(p.x,p.y-ST.PH-8,'TWO OF ME!',.9,'#ffb347',true);
   summons.push({x:p.x+p.face*8,y:p.y,life:240,face:p.face,upd(s){const e=nearestEnemy(s.x,s.y-8,300);if(e){s.face=e.x>s.x?1:-1;const dy=e.y-(s.y-8);s.x+=s.face*3.2;s.y+=Math.sign(dy)*Math.min(3,Math.abs(dy));if(Math.hypot(e.x-s.x,e.y-s.y+8)<12)s.life=1;}else s.x+=s.face*3;
     const X=s.x|0,Y=s.y-2|0;if(X>0&&X<W&&Y>0&&Y<H&&t[Y*W+X]===0&&R()<.4)setc(Y*W+X,FIRE);},
     end(s){explode(s.x|0,s.y-8|0,14,{fire:.6,self:true});},draw(s){echo('torch',s.x,s.y,s.face,[255,150,50]);}});}}};
EXTRA.torch=[
 // hold: write in fire in the sky; the letters burn whatever flies through them
 {n:'Sky Writing',kind:'hold',fn:(a,p,use)=>{if(!use(.5))return;const x=mouse.wx,y=mouse.wy,lx=p.skyX??x,ly=p.skyY??y;p.skyX=x;p.skyY=y;if(ST.frame-(p.skyF||0)>3){p.skyX=x;p.skyY=y;}p.skyF=ST.frame;
   const d=Math.hypot(x-lx,y-ly),n=Math.max(1,d|0);for(let k=0;k<=n;k++){const X=lx+(x-lx)*k/n|0,Y=ly+(y-ly)*k/n|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i]===0)setc(i,R()<.7?FIRE:GFIRE);}
   spawn(x,y,(R()-.5),(R()-.5)-.5,rgb(255,200,80),14,0,1,0,1);tagged('fire',()=>damageEnemies(x,y,6,1.2,0,0));}},
 // hot air: a column that lifts him, the wreckage and the enemies in it
 {n:'Thermal Updraft',fn:(a,p,use)=>{if(!use(20))return;ST.cd=45;const cx=p.x;let k=0;fxWord(p.x,p.y-ST.PH-8,'WHOOOSH!',.9,'#ffb347',true);
   ACT.push(()=>{k++;pl_.vy=Math.min(pl_.vy,-2.5);for(let j=0;j<6;j++)spawn(cx+(R()-.5)*30,pl_.y+20-R()*120,(R()-.5)*.4,-2-R()*2,R()<.5?rgb(255,200,120):rgb(255,120,40),18,0,1,0,1);
     for(const b of bodies)if(Math.abs(b.x-cx)<24&&b.y<pl_.y+80){b.vy-=.6;b.rest=0;}for(const e of enemies)if(!e.def.titan&&Math.abs(e.x-cx)<24&&e.y<pl_.y+80){e.vy-=.6;if(k%10===0)tagged('fire',()=>hitEnemy(e,4,0,0));}return k<60;});}},
];

// ================= THE THING =================
EXTRA.thing=[
 // his rock hide bristles: almost nothing gets through and what touches him gets clobbered
 {n:'Rock Armor',fn:(a,p,use)=>{if(p.shell>0||!use(26))return;ST.cd=60;p.shell=420;fxWord(p.x,p.y-ST.PH-10,'ROCK HARD!',1,'#ffb070',true);
   ACT.push(()=>{if(!(p.shell>0))return false;if(ST.frame%6===0){for(const e of enemies){if(Math.abs(e.x-p.x)<e.def.w/2+ST.PW&&Math.abs(e.y-(p.y-ST.PH/2))<e.def.h/2+ST.PH/2)hitEnemy(e,8,(e.x-p.x)*.3,-2);}spawn(p.x+(R()-.5)*12,p.y-R()*ST.PH,(R()-.5),-R(),rgb(218,118,50),20,0,0,1);}return true;});}},
 // he stamps and the whole street jumps: cars, wreckage and enemies thrown in the air
 {n:'Yancy Street Shake',fn:(a,p,use)=>{if(!use(30))return;ST.cd=60;const r=220*ST.aoeC;quake(p.x,p.y,{r:22,col:[218,118,50]});fxWord(p.x,p.y-ST.PH-12,'YANCY STREET SHAKE!',1.2,'#ffb070',true);ST.shake=22;
   for(const b of bodies)if(Math.abs(b.x-p.x)<r){b.vy-=4+R()*3;b.vx+=(R()-.5)*3;b.va+=(R()-.5)*.1;b.rest=0;b.thrown=true;}
   for(const e of enemies)if(!e.def.titan&&Math.abs(e.x-p.x)<r&&!e.def.fly){e.vy=-5-R()*2;hitEnemy(e,12,0,0);}
   for(let k=0;k<5;k++){const x=p.x+(R()-.5)*r*1.6,y=surfaceY(x|0,Math.max(0,p.y-40|0),100);ringChunks(x,y+4,7,true);}}},
];

// ================= BLACK PANTHER =================
EXTRA.panther=[
 // the ancestral plane opens: three spirit panthers run down the nearest enemies
 {n:'Ancestral Plane',fn:(a,p,use)=>{if(!use(30))return;ST.cd=70;fxWord(p.x,p.y-ST.PH-10,'MY ANCESTORS RUN WITH ME',1,'#c8a0ff',true);for(let i=0;i<3;i++)summons.push({x:p.x-p.face*10*i,y:p.y,vy:0,life:360,cd:0,face:p.face,
   upd(s){const e=nearestEnemy(s.x,s.y-8,320);s.vy+=.3;const g=groundBelow(s.x|0,s.y-6);if(s.y+s.vy>=g){s.y=g;s.vy=0;}else s.y+=s.vy;
     if(e){s.face=e.x>s.x?1:-1;s.x+=s.face*3;if(Math.abs(e.x-s.x)<30&&s.vy===0&&e.y<s.y-6)s.vy=-5;if(Math.hypot(e.x-s.x,e.y-s.y+8)<14&&--s.cd<=0){s.cd=16;hitEnemy(e,16,s.face*3,-2);clawSlice(s.x,s.y-8,s.face,0,20,3,3,{edge:[200,170,255],quiet:true});}}},
   draw(s){echo('panther',s.x,s.y,s.face,[180,130,255]);}});}},
 // Shuri's panther gauntlets: two sonic blasts that stun what they hit
 {n:'Shuri Gauntlets',fn:(a,p,use)=>{if(!use(10))return;ST.cd=20;for(const o of [-.08,.08]){const an=Math.atan2(a.dy,a.dx)+o;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(an)*7,vy:Math.sin(an)*7,type:'sonic',life:70,col:[190,140,255],boom:5,
   onHit:s=>{explode(s.x|0,s.y|0,6,{self:true,col:[190,140,255]});tagged('shock',()=>damageEnemies(s.x,s.y,14,16,0,-1));}});}snd('zap',a.h.x,a.h.y,{pitch:.7});}},
];

// ================= CAPTAIN AMERICA =================
REWORK.cap={'Avengers Assemble':
 // the team arrives, one after another: Hulk lands, Thor strikes, Iron Man sweeps a beam, Black Widow's bites
 {n:'Avengers Assemble',fn:(a,p,use)=>{if(!use(50))return;ST.cd=200;fxWord(p.x,p.y-50,'AVENGERS... ASSEMBLE!',1.6,'#e6e6f2',true);snd('wave',p.x,p.y,{v:1});let k=0;const pick=()=>nearestEnemy(mouse.wx,mouse.wy,300)||{x:mouse.wx,y:mouse.wy};
   ACT.push(()=>{k++;
     if(k===20){const e=pick(),gx=e.x,gy=groundBelow(gx|0,e.y);summons.push({x:gx,y:ST.camY-20,life:60,vy:6,upd(s){if(s.y<gy){s.y=Math.min(gy,s.y+s.vy);s.vy+=1;if(s.y>=gy){quake(gx,gy,{r:30,col:[120,255,90]});fxWord(gx,gy-40,'HULK SMASH!',1.4,'#bff07a',true);}}},draw(s){echo('hulk',s.x,s.y,1);}});}
     if(k===60){const e=pick();summons.push({x:e.x-30,y:e.y-20,life:40,draw(s){echo('thor',s.x,s.y,1);}});lightningStrike(e.x,e.y,12);fxWord(e.x,e.y-40,'FOR ASGARD!',1.2,'#bfe3ff',true);}
     if(k===100){const x0=ST.camX+20,y0=ST.camY+30;summons.push({x:x0,y:y0,life:60,draw(s){echo('iron',s.x,s.y,1);}});let j=0;ACT.push(()=>{j++;const e=pick(),an=Math.atan2(e.y-y0,e.x-x0)+(j-20)*.01;beams.push({x0,y0:y0-8,x1:x0+Math.cos(an)*500,y1:y0-8+Math.sin(an)*500,life:2,w:3,c:[230,250,255],g:[120,200,255]});damageLine(x0,y0-8,x0+Math.cos(an)*500,y0-8+Math.sin(an)*500,6,4);return j<40;});fxWord(x0+60,y0,'UNIBEAM!',1.1,'#ff6b5c',true);}
     if(k===150){for(const e of nearestN(p.x,p.y,260,4)){tagged('shock',()=>hitEnemy(e,24,0,0));applyStatus(e,'stun',90);zap(p.x,p.y-10,e.x,e.y,[255,240,180],[255,200,60]);}fxWord(p.x,p.y-40,"WIDOW'S BITE!",1.1,'#ff6b5c',true);}
     return k<160;});}}};
import { zap } from './powers.js';
EXTRA.cap=[
 // he is worthy: Mjolnir answers, and lightning rings him
 {n:'Worthy',fn:(a,p,use)=>{if(!use(36))return;ST.cd=90;let k=0;fxWord(p.x,p.y-ST.PH-14,'I KNEW IT!',1.3,'#bfe3ff',true);
   ACT.push(()=>{k++;if(k%6===0){const an=k*.5,x=p.x+Math.cos(an)*(30+k)*ST.aoeC;lightningStrike(x,groundBelow(x|0,p.y-20),7);}return k<48;});}},
 // a rallying cry: he heals over five seconds and every hit he lands does 30% more
 {n:'Inspiring Rally',fn:(a,p,use)=>{if(!use(28))return;ST.cd=120;ST.buffT=ST.frame+480;let k=0;fxWord(p.x,p.y-ST.PH-12,'ON YOUR LEFT!',1.1,'#e6e6f2',true);rings.push({x:p.x,y:p.y-8,r:6,vr:3,life:16,c:[230,230,245]});
   ACT.push(()=>{k++;p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.3/300);if(k%6===0)spawn(p.x+(R()-.5)*10,p.y-R()*ST.PH,0,-.7,rgb(255,240,200),16,0,1,0,1);return k<300;});}},
];

// ================= CAPTAIN MARVEL =================
REWORK.marvel={'Photon Nova':
 // photon energy leaps between up to six enemies near the cursor
 {n:'Binary Chain',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,120,6);if(!list.length)return;if(!use(20))return;ST.cd=35;let prev=a.h;
   for(const e of list){beams.push({pts:[[prev.x,prev.y],[(prev.x+e.x)/2+(R()-.5)*10,(prev.y+e.y)/2+(R()-.5)*10],[e.x,e.y]],life:8,c:[255,245,200],g:[255,170,60]});hitEnemy(e,p.binary>0?34:22,0,-1);flash(e.x,e.y,12,[255,200,90],3);prev=e;}snd('zap',a.h.x,a.h.y,{pitch:.8});}}};
EXTRA.marvel=[
 // she drinks the fire, lava and neon around the cursor, then hits with all of it
 {n:'Energy Siphon Punch',fn:(a,p,use)=>{const cx=mouse.wx|0,cy=mouse.wy|0,r=34*ST.aoeC|0;let n=0;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if(m===FIRE||m===GFIRE||m===LAVA||m===NEON){setc(i,EMPTY);n++;if(R()<.15)spawn(X,Y,(a.h.x-X)*.06,(a.h.y-Y)*.06,rgb(255,200,90),24,0,1,0,0);}}
   if(!use(8))return;ST.cd=30;p.en=Math.min(100,p.en+n*.05);const big=Math.min(24,6+n/40|0);shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'photon',life:90,boom:big,col:[255,220,120],ecol:[255,200,90]});fxWord(p.x,p.y-ST.PH-8,n>60?'TOO MUCH POWER!':'ABSORBED',.9,'#ffd36a',true);}},
 // a photon blast into the ground cracks it open in a starburst of cuts
 {n:'Shatterpoint',fn:(a,p,use)=>{if(!use(24))return;ST.cd=45;const cx=mouse.wx,cy=groundBelow(cx|0,mouse.wy);explode(cx|0,cy|0,9,{self:true,col:[255,200,90]});
   for(let k=0;k<9;k++){const an=Math.PI*(k/8),L=(60+R()*40)*ST.aoeC;sliceLine(cx,cy,cx+Math.cos(an)*L,cy+Math.sin(an)*L*.9,{edge:[255,220,140],w:1,push:1.5,quiet:k>0});}damageEnemies(cx,cy,50,26,0,-3);fxWord(cx,cy-30,'KRAKKK!',1.2,'#ffd36a',true);shockFx(cx,cy,1);}},
];

// ================= SILVER SURFER =================
function drawHand(s){const x=s.x,y=s.y,P=rgb(118,44,150),B=rgb(44,66,160),o={};TK.begin();TK.cap(x,y-200,x,y-40,26,22,B,o);TK.ell(x,y-24,30,26,P,o);
  const cl=s.closed?1:0;for(let k=-2;k<=2;k++)TK.cap(x+k*12,y-14,x+k*(cl?6:16),y+(cl?6:22),6,5,P,o);TK.end();}
REWORK.surfer={'Cosmic Shield':
 // the Power Cosmic brands the enemies near the cursor: they take half again as much damage
 {n:'Power Cosmic Brand',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,80*ST.aoeC,10);if(!list.length)return;if(!use(18))return;ST.cd=40;for(const e of list){applyStatus(e,'mark',600);hitEnemy(e,8,0,0);for(let k=0;k<6;k++)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(200,240,255),14,0,1,0,1);}fxWord(mouse.wx,mouse.wy-24,'BRANDED',1,'#bfe8ff',true);}},
 'Nova Burst':
 // he grinds the board along the ground: the surface peels up in slabs behind him
 {n:'Surface Grind',fn:(a,p,use)=>{if(!use(22))return;ST.cd=45;const dir=a.dx<0?-1:1;let k=0;p.fly=true;fxWord(p.x,p.y-ST.PH-8,'SHHHRRRRK!',1,'#bfe8ff',true);
   ACT.push(()=>{k++;p.script=2;const gy=surfaceY(p.x+dir*4|0,Math.max(0,p.y-20|0),60);scriptMove(p,dir*7,gy-1-p.y);sliceLine(p.x-dir*12,gy+5,p.x+dir*6,gy+5,{edge:[230,250,255],quiet:true,push:1.2});
     if(k%4===0){const n0=solidCells(p.x-dir*10,gy+3,6,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n>12){const b=makeBody(q,n,false);if(b){b.vx=-dir*2+(R()-.5);b.vy=-3-R()*2;b.va=(R()-.5)*.2;b.chunk=true;}}}
     damageEnemies(p.x,p.y-ST.PH/2,12,8,dir*5,-5);afters.push({x:p.x,y:p.y,ang:0,face:dir,life:8});return k<50;});}},
 "Herald's Call":
 // his old master's hand reaches down out of the sky and takes a piece of the world
 {n:'Hand of Galactus',fn:(a,p,use)=>{if(summons.some(s=>s.ghand)||!use(40))return;ST.cd=90;const tx=mouse.wx,ty=mouse.wy;fxWord(tx,ST.camY+30,'GALACTUS HUNGERS',1.2,'#c88cff',true);snd('boss',tx,ty,{v:.7});
   summons.push({ghand:true,x:tx,y:ST.camY-60,life:400,ph:0,b:null,closed:false,upd(s){
     if(s.ph===0){s.y+=8;if(s.y>=ty){s.ph=1;s.closed=true;const n0=solidCells(tx,ty,24,true);let n=0;for(let j=0;j<n0;j++)if(KIND[t[q[j]]]===S)q[n++]=q[j];if(n>20){s.b=makeBody(q,n,true);if(s.b)s.b.overhead=true;}
         for(const e of enemies)if(Math.hypot(e.x-tx,e.y-ty)<34)hitEnemy(e,60,0,-3);ST.shake=14;snd('slam',tx,ty);}}
     else{s.y-=4;if(s.b&&bodies.includes(s.b)){s.b.x=s.x;s.b.y=s.y+10;s.b.vx=s.b.vy=0;}if(s.y<ST.camY-140){if(s.b&&bodies.includes(s.b)){s.b.held=false;s.b.overhead=false;s.b.vy=3;s.b.thrown=true;}return false;}}},draw:drawHand});}}};
EXTRA.surfer=[
 // a wall of starlight crystal rises out of the ground at the cursor
 {n:'Starlight Barrier',fn:(a,p,use)=>{if(!use(18))return;ST.cd=40;const cx=mouse.wx|0,gy=groundBelow(cx,mouse.wy),h=60*ST.aoeC|0;let k=0;
   ACT.push(()=>{k++;for(let y=gy-k*4;y<gy-k*4+4&&y>gy-h;y++)for(let x=cx-2;x<=cx+2;x++){if(x<0||x>=W||y<0||y>=H)continue;const i=y*W+x;if(t[i]===0){setc(i,GLASS);col[i]=(x+y)%5===0?rgb(255,255,255):rgb(190,230,255);}}
     for(const e of enemies)if(Math.abs(e.x-cx)<8&&e.y>gy-k*4-8&&e.y<gy)hitEnemy(e,10,Math.sign(e.x-cx)*5,-3);return k*4<h;});snd('ice',cx,gy);}},
];

// ================= GHOST RIDER =================
REWORK.rider={'Brimstone Rain':
 // chains burst out of the ground under every enemy near the cursor and drag them down, burning
 {n:'Chains of Hell',fn:(a,p,use)=>{const list=nearestN(mouse.wx,mouse.wy,120*ST.aoeC,8);if(!list.length)return;if(!use(26))return;ST.cd=55;let k=0;fxWord(mouse.wx,mouse.wy-30,'CHAINS OF HELL!',1.1,'#ff9a3c',true);snd('rip',mouse.wx,mouse.wy);
   const roots=list.map(e=>[e,e.x+(R()-.5)*10,groundBelow(e.x|0,e.y)]);
   ACT.push(()=>{k++;for(const [e,x,g] of roots){if(e.hp<=0)continue;if(!e.def.titan){e.frozen=Math.max(e.frozen||0,2);e.vy+=.8;}beams.push({pts:[[x,g],[(x+e.x)/2+Math.sin(k*.3)*4,(g+e.y)/2],[e.x,e.y]],life:2,c:[200,200,210],g:[255,120,30]});if(k%20===0)tagged('fire',()=>hitEnemy(e,10,0,1));}return k<140;});}}};
EXTRA.rider=[
 // the chain hooks the nearest overhang and he swings on it
 {n:'Chain Swing',fn:(a,p,use)=>{let ax=-1,ay=-1;for(let s=0;s<200;s++){const x=a.h.x+a.dx*s|0,y=a.h.y+a.dy*s|0;if(x<0||x>=W||y<0||y>=H)break;if(KIND[t[y*W+x]]===S){ax=x;ay=y;break;}}if(ax<0){fxWord(mouse.wx,mouse.wy,'NOTHING TO HOOK',.7,'#ff9a3c',true);return;}if(!use(8))return;ST.cd=20;
   const L=Math.max(20,Math.hypot(ax-p.x,ay-p.y+8));let k=0;ACT.push(()=>{k++;const dx=p.x-ax,dy=p.y-8-ay,d=Math.hypot(dx,dy)||1;if(d>L){const ux=dx/d,uy=dy/d,vr=p.vx*ux+p.vy*uy;p.x=ax+ux*L;p.y=ay+uy*L+8;if(vr>0){p.vx-=vr*ux;p.vy-=vr*uy;}}p.vx+=p.face*.12;
     ST.chain={pts:[[ax,ay],[p.x,p.y-8]],life:2};damageEnemies(p.x,p.y-8,10,2,p.vx,p.vy);if(R()<.4)spawn(p.x,p.y-4,(R()-.5),-.5,rgb(255,140,40),10,0,1,0,1);return k<110&&!p.ground;});}},
 // for eight seconds the souls of what he kills feed him
 {n:'Soul Harvest',fn:(a,p,use)=>{if(p.harvest>0||!use(28))return;ST.cd=70;p.harvest=480;fxWord(p.x,p.y-ST.PH-10,'YOUR SOUL IS MINE',1,'#ff9a3c',true);
   ACT.push(()=>{if(--p.harvest<=0)return false;if(ST.frame%8===0){for(const e of enemies){if(Math.hypot(e.x-p.x,e.y-p.y+8)>70)continue;tagged('fire',()=>hitEnemy(e,3,0,0));p.hp=Math.min(ST.CH.hp,p.hp+1.2);for(let k=0;k<3;k++)spawn(e.x,e.y,(p.x-e.x)*.04,(p.y-8-e.y)*.04,rgb(160,255,220),24,0,1,0,0);}}return true;});}},
];

// ================= DEADPOOL =================
const POUCH=[
 ['ROCKET LAUNCHER!',(a,p)=>shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6,vy:a.dy*6,type:'missile',life:120,tx:mouse.wx,ty:mouse.wy,wob:0,boom:14,fire:.4})],
 ['BEAR TRAP!',(a,p)=>{const x=mouse.wx,y=groundBelow(mouse.wx|0,mouse.wy);summons.push({x,y,life:600,upd(s){for(const e of enemies)if(Math.abs(e.x-s.x)<8&&Math.abs(e.y+e.def.h/2-s.y)<8&&!e.def.titan){e.frozen=Math.max(e.frozen||0,120);hitEnemy(e,30,0,0);fxWord(s.x,s.y-10,'SNAP!',.9,'#ff6b5c',true);return false;}},draw(s){for(let k=-4;k<=4;k++)drawPix(s.x+k,s.y-1-(Math.abs(k)%2),rgb(150,150,160));}});}],
 ['BOOMERANG KATANA!',(a,p)=>{let x=a.h.x,y=a.h.y,vx=a.dx*8,vy=a.dy*8,k=0;ACT.push(()=>{k++;const lx=x,ly=y;if(k>18){vx+=(pl_.x-x)*.03;vy+=(pl_.y-8-y)*.03;}x+=vx;y+=vy;sliceLine(lx,ly,x,y,{edge:[230,232,240],quiet:true,push:1});damageLine(lx,ly,x,y,5,8);return k<50&&Math.hypot(pl_.x-x,pl_.y-8-y)>8;});}],
 ['TACO! (HEALS)',(a,p)=>{p.hp=Math.min(ST.CH.hp,p.hp+ST.CH.hp*.2);}],
 ['RUBBER CHICKEN?!',(a,p)=>{explode(mouse.wx|0,mouse.wy|0,18,{fire:.3,word:'BAWK!'});}],
];
REWORK.pool={'Regenerate':
 {n:'Pouch Roulette',fn:(a,p,use)=>{if(!use(14))return;ST.cd=28;const it=POUCH[R()*POUCH.length|0];it[1](a,p);fxWord(p.x,p.y-ST.PH-10,it[0],.9,'#ff6b5c',true);snd('pop',p.x,p.y,{pitch:1.3});}}};
EXTRA.pool=[
 // a katana pogo: straight down, cutting, and back up off whatever it hits
 {n:'Katana Pogo',fn:(a,p,use)=>{if(!use(12))return;ST.cd=26;let k=0;fxWord(p.x,p.y-ST.PH-8,'BOING!',.9,'#ff6b5c',true);
   ACT.push(()=>{k++;p.script=2;const ox=p.x,oy=p.y;const moved=scriptMove(p,0,9);sliceLine(ox,oy,p.x,p.y+12,{edge:[230,232,240],quiet:true,push:1.2});damageEnemies(p.x,p.y,10,14,0,4);
     if(!moved||k>40){clawSlice(p.x,p.y+4,1,0,20,2,6,{edge:[230,232,240]});explode(p.x|0,p.y+4|0,8,{self:true});p.vy=-8;p.ground=false;return false;}return true;});}},
 // a taunt: everything comes for him, and he barely feels it for six seconds
 {n:'Taunt',fn:(a,p,use)=>{if(!use(18))return;ST.cd=80;p.shell=360;fxWord(p.x,p.y-ST.PH-12,'HEY! UGLIES! OVER HERE!',1,'#ff6b5c',true);
   for(const e of enemies)if(!e.def.titan&&Math.hypot(e.x-p.x,e.y-p.y)<220){e.vx+=(p.x-e.x)*.03;e.vy+=(p.y-e.y)*.02;e.cd=Math.min(e.cd,10);}}},
];

// put the reworks and new powers into each hero's kit; the ultimate goes last on the bar (G fires it)
export function applyKits(CHARS){ROSTER=CHARS;for(const c of CHARS){const rw=REWORK[c.id],ex=EXTRA[c.id];if(!rw&&!ex)continue;
  if(rw)for(let i=0;i<c.powers.length;i++){const n=rw[c.powers[i].n];if(n)c.powers[i]=n;}
  if(ex)for(const pw of ex)if(!c.powers.some(o=>o.n===pw.n))c.powers.push(pw);
  markUlt(c);const u=c.powers.findIndex(pw=>pw.ult);if(u>=0&&u!==c.powers.length-1){const [pw]=c.powers.splice(u,1);c.powers.push(pw);}}}
export { echo };
