import './savage.js'; // evaluation order: runs after enemies/savage.js
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { H, W, t } from '../world/grid.js';
import { gnd, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { afters, beams, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { hurtTarget, quake, shots, zap } from '../heroes/powers.js';
import { solidCells } from '../heroes/wave2.js';
import { crushAhead, hurlBody, wallChunk } from '../heroes/villains.js';
import { ARTS } from '../art/index.js'; // the boss versions wear the heroes' own art, scaled up
import { pl_ } from '../player.js';
import { defineEnemy, enemies, enemyBeam, enemyShoot, player, seek, spawnEnemy } from './core.js';
import './sentinels.js'; // kept for evaluation order


// ---- the big three, rebuilt from their playable versions: same sprites (scaled up), same moves aimed at you
function bossDist(e){return Math.hypot(pl_.x-e.x,pl_.y-ST.PH/2-e.y);}
function bossQuake(e,x,y,r,dmg){quake(x,y,{col:[214,184,130],r});if(Math.abs(pl_.x-x)<r*2.4&&Math.abs(pl_.y-y)<30){hurtTarget(e,dmg);pl_.vy=-5;pl_.vx+=Math.sign(pl_.x-x)*4;}}
defineEnemy('juggernaut',{hp:3200,w:22,h:37,fly:false,score:0,boom:20,metal:false,title:'JUGGERNAUT',glow:'',scale:1.25,sprite:ARTS.juggernaut.spr,pal:ARTS.juggernaut.pal,spd:.8,
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx),enr=e.hp<e.def.hp*.5,hw=e.def.w/2,hh=e.def.h/2;if(e.frozen>0)e.frozen=Math.max(0,e.frozen-4);
    if(e.mem.surge>0){e.mem.surge--;e.mem.shield=Math.max(e.mem.shield||0,1);if(e.t%2===0)spawn(e.x+(R()-.5)*hw*2,e.y+(R()-.5)*hh*2,0,-.8,rgb(255,40,30),14,0,1,0,1);}
    if(e.mem.charge>0){e.mem.charge--;e.vx=e.mem.dir*(enr?5.4:4.6);crushAhead(e.x+e.mem.dir*hw,e.y,e.mem.dir,e.def.h,7);if(e.t%4===0){ST.shake=Math.max(ST.shake,5);afters.length<40&&spawn(e.x-e.mem.dir*hw,e.y+hh,(R()-.5)*3,-R()*2,rgb(150,140,125),20,0,0,1);}
      if(Math.abs(pl_.x-e.x)<hw+4&&Math.abs(pl_.y-ST.PH/2-e.y)<hh+4&&!(e.mem.hitT>e.t)){hurtTarget(e,28);pl_.vx=e.mem.dir*8;pl_.vy=-5;e.mem.hitT=e.t+30;ST.shake=22;snd('slam',e.x,e.y);}
      if(e.mem.charge===0)e.cd=90+R()*60|0;return;}
    if(e.mem.slam){if(e.ground&&e.t>e.mem.slam+10){e.mem.slam=0;bossQuake(e,e.x,e.y+hh,30,24);}return;}
    e.face=dx>0?1:-1;e.vx+=(e.face*e.def.spd*(enr?1.3:1)-e.vx)*.1;if(e.t%3===0)crushAhead(e.x+e.face*hw,e.y,e.face,e.def.h,3);
    if(e.ground&&Math.abs(e.vx)>.2&&e.t%28===0){ST.shake=Math.max(ST.shake,3);snd('stomp',e.x,e.y);}
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<3)e.vy=-5;
    if(e.cd>0)return;const m=e.mem.atk=(e.mem.atk||0)+1;
    if(m%5===1&&dist<320){e.mem.charge=70;e.mem.dir=e.face;fxWord(e.x,e.y-hh-8,"NOTHING STOPS THE JUGGERNAUT!",1.2,'#e23b2e',true);snd('roar',e.x,e.y,{pitch:.7});} // Unstoppable Charge
    else if(m%5===2&&e.ground){e.vy=-8;e.vx=Math.sign(dx)*Math.min(6,dist/26);e.mem.slam=e.t;fxWord(e.x,e.y-hh-8,'BODY SLAM!',1.1,'#e23b2e',true);e.cd=80;} // Body Slam
    else if(m%5===3){const b=wallChunk(e.x,e.y,e.face,10);if(b){b.x=e.x;b.y=e.y-hh-b.rmax;hurlBody(b,p.x,p.y,9);fxWord(e.x,e.y-hh-8,'CATCH!',1,'#e23b2e',true);snd('rip',e.x,e.y);}e.cd=70;} // Wall Rip
    else if(m%5===4&&e.ground){bossQuake(e,e.x,e.y+hh,36,20);e.cd=90;} // Ground Pound
    else{if(enr){e.mem.surge=240;fxWord(e.x,e.y-hh-8,'POWER OF CYTTORAK!',1.2,'#e23b2e',true);}e.cd=60;}}}); // Crimson Surge
// flying bosses hold roughly the player's height (a little above, weaving up and down) and never leave the map
function bossAlt(e,p,wob){const hh=e.def.h*(e.def.scale||1)/2;return Math.max(hh+24,Math.min(H-60,p.y-ST.PH/2-18+wob));}
// extra vertical spring pulls them back after knockback; the top of the map is a hard ceiling
function bossFly(e,x,y,sp,acc){seek(e,x,y,sp,acc);e.vy+=(y-e.y)*.004;e.vy*=.97;const top=e.def.h*(e.def.scale||1)/2+6;if(e.y<top){e.y=top;if(e.vy<0)e.vy=0;}}
defineEnemy('ultron_prime',{hp:2000,w:18,h:30,fly:true,score:0,boom:18,glow:'*@',title:'ULTRON PRIME',scale:1.2,sprite:ARTS.ultron.spr,pal:ARTS.ultron.pal,
  think(e){const p=player(),enr=e.hp<e.def.hp*.5,hh=e.def.h/2;
    bossFly(e,p.x+Math.sin(e.t*.01)*110,bossAlt(e,p,Math.sin(e.t*.023)*34),enr?2.2:1.6,.04);e.face=p.x>e.x?1:-1;
    if(e.mem.shell>0){e.mem.shell--;e.mem.shield=Math.max(e.mem.shield||0,1);if(e.t%3===0)spawn(e.x+(R()-.5)*20,e.y+(R()-.5)*30,0,0,rgb(220,230,255),8,0,1,0,1);}
    if(e.mem.beam>0&&--e.mem.bt<=0){enemyBeam(e,{oy:-hh*.6,ang:e.mem.ang,dmg:12,col:[255,40,40],len:480,boom:5,w:2,quiet:true});e.mem.ang+=e.mem.dir*.05;e.mem.beam--;e.mem.bt=2;} // Encephalo Beam sweep
    if(ST.frame%2===0)spawn(e.x+(R()-.5)*8,e.y+hh,(R()-.5)*.6,1.4,rgb(255,120,80),10,0,1,0);
    if(e.cd>0)return;const a=e.mem.atk=(e.mem.atk||0)+1;
    if(a%6===1){e.mem.beam=24;e.mem.bt=0;e.mem.dir=R()<.5?-1:1;e.mem.ang=Math.atan2(p.y-(e.y-hh*.6),p.x-e.x)-e.mem.dir*.6;fxWord(e.x,e.y-hh-6,'ENCEPHALO BEAM',1,'#ff6b5c',true);e.cd=enr?60:90;}
    else if(a%6===2){for(let k=0;k<(enr?7:5);k++)enemyShoot(e,{speed:3.4+R(),dmg:9,spread:.4,col:[255,80,60],boom:6});e.cd=60;} // Concussion Blasts
    else if(a%6===3){for(let k=0;k<(enr?5:3);k++)spawnEnemy('swarmbot',e.x+(R()-.5)*20,e.y+hh);fxWord(e.x,e.y-hh-6,'MY CHILDREN.',1,'#ff6b5c',true);e.cd=80;} // Sentry Swarm
    else if(a%6===4){e.mem.shell=200;fxWord(e.x,e.y-hh-6,'ADAMANTIUM.',1,'#d8e4ff',true);snd('clang',e.x,e.y);e.cd=50;} // Adamantium Shell
    else if(a%6===5&&bossDist(e)<140){for(let k=0;k<6;k++){const an=k/6*6.283;zap(e.x,e.y,e.x+Math.cos(an)*60,e.y+Math.sin(an)*60,[255,200,190],[255,40,40]);}if(bossDist(e)<110)hurtTarget(e,18);explode(e.x|0,e.y|0,8,{self:true,enemy:true,dmg:0,col:[255,60,40]});fxWord(e.x,e.y-hh-6,'OVERLOAD!',1.2,'#ff6b5c',true);e.cd=70;} // Overload Pulse
    else{const host=enemies.find(o=>o.def.name==='swarmbot'&&Math.hypot(o.x-e.x,o.y-e.y)<150);if(host&&e.hp<e.def.hp*.9){zap(e.x,e.y,host.x,host.y,[255,200,190],[255,40,40]);host.mem.noScore=true;host.hp=0;e.hp=Math.min(e.def.hp,e.hp+e.def.hp*.06);fxWord(e.x,e.y-hh-6,'UPLOADED.',1,'#ff6b5c',true);}e.cd=40;}}}); // Upload: eats a drone to repair
defineEnemy('magneto',{hp:2400,w:16,h:27,fly:true,score:0,boom:16,metal:false,title:'MAGNETO',glow:'',scale:1.08,sprite:ARTS.magneto.spr,pal:ARTS.magneto.pal,
  think(e){const p=player(),enr=e.hp<e.def.hp*.5,hh=e.def.h/2;
    bossFly(e,p.x+Math.sin(e.t*.008)*130,bossAlt(e,p,Math.sin(e.t*.02)*30),enr?2:1.5,.04);e.face=p.x>e.x?1:-1;
    if(e.mem.shieldT>0){e.mem.shieldT--;e.mem.shield=1;if(e.t%2===0)for(let k=0;k<3;k++){const a=R()*6.283;spawn(e.x+Math.cos(a)*20,e.y+Math.sin(a)*24,0,0,rgb(200,120,255),6,0,1,0,1);}}else e.mem.shield=0;
    if(e.mem.pull>0){e.mem.pull--;const dx=e.x-pl_.x,dy=e.y-(pl_.y-ST.PH/2),d=Math.hypot(dx,dy)||1;pl_.vx+=dx/d*.35;pl_.vy+=dy/d*.35;if(e.t%3===0)beams.push({pts:[[e.x,e.y],[(e.x+pl_.x)/2+(R()-.5)*16,(e.y+pl_.y-ST.PH/2)/2+(R()-.5)*16],[pl_.x,pl_.y-ST.PH/2]],life:2,c:[230,170,255],g:[150,60,220]});}
    if(e.mem.rain>0){e.mem.rain--;if(e.mem.rain%3===0)shots.push({x:p.x+(R()-.5)*140,y:ST.camY-6,vx:(R()-.5)*.4,vy:5,type:'spike',owner:'enemy',life:140,dmg:8,col:[170,176,190],boom:4,grav:.1});}
    if(e.mem.rail>0){e.mem.rail--;const ox=e.x,oy=e.y-hh*.3;if(e.mem.rail>10)beams.push({x0:ox,y0:oy,x1:ox+Math.cos(e.mem.ang)*400,y1:oy+Math.sin(e.mem.ang)*400,life:1,w:0,c:[150,90,200],g:[90,40,140]});
      else if(e.mem.rail===10){enemyBeam(e,{oy:-hh*.3,ang:e.mem.ang,dmg:30,col:[200,120,255],len:520,boom:5,w:2});fxWord(e.x,e.y-hh-6,'SHHHRAK!',1.1,'#c88cff',true);}}
    if(e.cd>0)return;const a=e.mem.atk=(e.mem.atk||0)+1;
    if(a%6===1){let n=0,cx=0,cy=0;for(let tries=0;tries<60&&!n;tries++){const X=e.x+(R()-.5)*200|0,Y=e.y+(R()-.2)*150|0;if(X<4||X>=W-4||Y<4||Y>=H-50)continue;if(KIND[t[Y*W+X]]===S&&!gnd[Y*W+X]){cx=X;cy=Y;}}
      if(cx)n=solidCells(cx,cy,7,false);const b=n>=20?makeBody(q,n,false):null;if(b){b.x=e.x;b.y=e.y-hh-b.rmax;hurlBody(b,p.x,p.y,9);fxWord(e.x,e.y-hh-6,'RISE!',1,'#c88cff',true);snd('rip',e.x,e.y);}else for(let k=0;k<6;k++)enemyShoot(e,{speed:4,dmg:8,spread:.5,col:[210,130,255]});e.cd=enr?70:100;} // Rip Steel
    else if(a%6===2){for(let k=0;k<9;k++)enemyShoot(e,{speed:3.6+R(),dmg:8,spread:.35,col:[210,130,255],boom:4});e.cd=60;} // Magnetic Bolts
    else if(a%6===3){e.mem.rain=90;fxWord(p.x,ST.camY+20,'IRON RAIN',1.1,'#c88cff',true);e.cd=110;} // Iron Rain
    else if(a%6===4){e.mem.rail=50;e.mem.ang=Math.atan2(p.y-(e.y-hh*.3),p.x-e.x);fxWord(e.x,e.y-hh-6,'RAIL SHOT',1,'#c88cff',true);e.cd=80;} // Rail Shot (telegraphed)
    else if(a%6===5&&(ST.CH.id==='iron'||ST.CH.id==='wolverine'||ST.CH.id==='ultron')){e.mem.pull=70;fxWord(e.x,e.y-hh-6,ST.CH.id==='wolverine'?'ADAMANTIUM, HOW QUAINT.':'YOUR METAL IS MINE!',1,'#c88cff',true);e.cd=80;}
    else{if(enr){e.mem.shieldT=180;fxWord(e.x,e.y-hh-6,'POLARITY SHIELD',1,'#c88cff',true);}e.cd=60;}}});
