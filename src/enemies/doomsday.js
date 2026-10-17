// Doomsday enemies: TVA time doors, Doombot portals, TVA Minutemen and Doombots.
import './basic.js'; // evaluation order: runs after enemies/basic.js
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { H } from '../world/grid.js';
import { gcol, spawn } from '../world/particles.js';
import { beams, flash, fxWord } from '../render/fx.js';
import { snd } from '../sfx.js';
import { hurtTarget, zap } from '../heroes/powers.js';
import { ACT } from '../heroes/xmen.js';
import { pl_ } from '../player.js';
import { defineEnemy, enemyBeam, enemyShoot, los, pdist, player, seek } from './core.js';

// ---- Doomsday: the TVA and Doom's legions, both stepping into a dying New York
// a TVA time door: a tall glowing orange frame that grows open, holds, and closes
export function tvaDoor(x,y,life=40){let k=0;ACT.push(()=>{k++;const a=Math.max(0,Math.min(1,k/6,(life-k)/6)),hw=8*a+1,h=34*a+2,x0=x-hw,x1=x+hw,y0=y-h;
  beams.push({pts:[[x0,y],[x0,y0+3],[x0+3,y0],[x1-3,y0],[x1,y0+3],[x1,y]],life:1,c:[255,224,160],g:[255,120,30]});
  if(k%2===0)spawn(x+(R()-.5)*hw*2,y-R()*h,(R()-.5)*.4,-.3,rgb(255,180,80),14,0,1,0,1);flash(x,y-h/2,18,[255,140,40],1);return k<life;});}
// a Doombot portal: a spinning ring of green sorcery
export function doomPortal(x,y,life=40){let k=0;ACT.push(()=>{k++;const a=Math.max(0,Math.min(1,k/8,(life-k)/8)),rx=10*a+1,ry=16*a+1,pts=[];for(let j=0;j<=16;j++){const an=j/16*6.283+k*.1;pts.push([x+Math.cos(an)*rx,y+Math.sin(an)*ry]);}
  beams.push({pts,life:1,c:[200,255,210],g:[40,220,90]});for(let j=0;j<2;j++){const an=R()*6.283;spawn(x+Math.cos(an)*rx,y+Math.sin(an)*ry,-Math.cos(an)*.8,-Math.sin(an)*.8,gcol(),12,0,1,0,1);}flash(x,y,16,[60,255,110],1);return k<life;});}
const PAL_TVA={h:rgb(84,66,48),H:rgb(150,122,84),'*':rgb(255,150,50),U:rgb(178,148,98),u:rgb(118,94,60),b:rgb(60,44,30),f:rgb(70,56,44),k:rgb(40,32,26),j:rgb(128,132,140)};
const SPR_TVA=["..hhh..",".hHHHh.",".h***h.",".hHHHh.","..uUu..","uUUbUUu","uUUbUUu","uUbbbUu","f.UUU.f","..U.U..","..U.U..",".uu.uu.",".kk.kk."];
const SPR_TVAJ=["...hhh...","..hHHHh..","..h***h..","..hHHHh..","...uUu...","jjuUbUujj","jjUUbUUjj","jjUbbbUjj",".f.UUU.f.","...U.U...","...U.U...","..uu.uu..","..kk.kk.."];
const PAL_DBOT={m:rgb(70,76,84),M:rgb(150,156,166),'*':rgb(80,255,120),c:rgb(30,110,50),g:rgb(40,140,60)};
const SPR_DBOT=["..mmm..",".mMMMm.",".M*M*M.",".mMMMm.","c.mMm.c","cMMgMMc","cMgggMc","cMMgMMc","M.ggg.M","..M.M..","..M.M..",".mM.Mm.",".mm.mm."];
// the pruning stick: a glowing orange baton held out ahead
function pruneStick(e){beams.push({x0:e.x+e.face*3,y0:e.y,x1:e.x+e.face*11,y1:e.y-5,life:1,w:1,c:[255,200,120],g:[255,120,30]});}
function prune(e,p,dmg){zap(e.x+e.face*8,e.y-3,p.x,p.y,[255,224,160],[255,120,30]);hurtTarget(e,dmg);flash(p.x,p.y,16,[255,140,40],4);
  for(let k=0;k<10;k++)spawn(p.x+(R()-.5)*8,p.y+(R()-.5)*12,(R()-.5)*1.5,-R()*1.5,rgb(255,170+R()*60|0,60),18,0,1,0,1);
  if(ST.AI_ALLY!==e){pl_.vx+=e.face*3;pl_.vy-=2;}if(R()<.4)fxWord(p.x,p.y-14,'PRUNED!',.8,'#ffb050');snd('zap',p.x,p.y,{pitch:1.4,v:.5});}
const altAt=(e,ty)=>Math.max(20,Math.min(H-60,ty)); // flyers keep near the fight, never above the map
// TVA Minuteman with a pruning stick: rushes in and prunes at close range
defineEnemy('tva_pruner',{hp:40,w:7,h:13,fly:false,score:15,boom:4,team:'tva',sprite:SPR_TVA,pal:PAL_TVA,glow:'*',
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>12)e.vx+=(e.face*1.6-e.vx)*.2;else e.vx*=.6;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-4.8;
    if(e.ground&&dist<70&&dist>30&&e.cd===0&&R()<.03){e.vy=-4;e.vx=e.face*3.2;}
    pruneStick(e);if(e.cd===0&&dist<16&&Math.abs(p.y-e.y)<18){e.cd=50;prune(e,p,14);}
  }});
// TVA Minuteman with a time-stick blaster: holds range and fires orange bolts
defineEnemy('tva_gunner',{hp:35,w:7,h:13,fly:false,score:15,boom:4,team:'tva',sprite:SPR_TVA,pal:PAL_TVA,glow:'*',
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>130)e.vx+=(e.face*1.1-e.vx)*.2;else if(dist<70)e.vx+=(-e.face*.9-e.vx)*.2;else e.vx*=.8;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-4.5;
    if(e.cd===0&&dist<280&&los(e,p.x,p.y)){enemyShoot(e,{speed:4,dmg:8,col:[255,150,50],lead:10,spread:.07,boom:4});e.cd=55+R()*45|0;}
  }});
// TVA Minuteman on a jetpack: strafes from the air, dives in with the stick
defineEnemy('tva_jet',{hp:34,w:9,h:13,fly:true,score:20,boom:5,team:'tva',sprite:SPR_TVAJ,pal:PAL_TVA,glow:'*',
  think(e){const p=player();e.mem.side??=R()<.5?-1:1;e.face=p.x>e.x?1:-1;
    if(e.mem.dive>0){e.mem.dive--;seek(e,p.x,p.y,4.2,.2);pruneStick(e);if(Math.hypot(p.x-e.x,p.y-e.y)<14){prune(e,p,12);e.mem.dive=0;e.cd=70;}}
    else{if(Math.abs(e.x-(p.x+e.mem.side*110))<20)e.mem.side*=-1;seek(e,p.x+e.mem.side*110,altAt(e,p.y-30+Math.sin(e.t*.05)*24),2.4,.05);
      if(e.cd===0&&pdist(e)<240){if(R()<.35){e.mem.dive=40;}else enemyShoot(e,{speed:4.2,dmg:7,col:[255,150,50],spread:.09});e.cd=50+R()*40|0;}}
    if(ST.frame%2===0)spawn(e.x-e.face*4,e.y+4,(R()-.5)*.4,1.2,R()<.5?rgb(255,170,60):rgb(255,240,190),8,0,1,0);
  }});
// Doombot: Latverian infantry, holds range and blasts green; now and then a charged beam
defineEnemy('doombot',{hp:50,w:7,h:13,fly:false,score:15,boom:5,team:'doom',sprite:SPR_DBOT,pal:PAL_DBOT,glow:'*',
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>110)e.vx+=(e.face*1-e.vx)*.2;else if(dist<60)e.vx+=(-e.face*.8-e.vx)*.2;else e.vx*=.8;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-4.5;
    if(e.mem.charge>0){e.mem.charge--;e.vx*=.7;if(e.mem.charge%3===0)spawn(e.x,e.y-3,(R()-.5)*2,(R()-.5)*2,gcol(),8,0,1,0,1);if(e.mem.charge===0)enemyBeam(e,{dmg:11,col:[60,255,110],oy:-3});}
    else if(e.cd===0&&dist<270&&los(e,p.x,p.y)){if(R()<.25)e.mem.charge=28;else enemyShoot(e,{speed:3.8,dmg:8,col:[80,255,120],lead:8,spread:.07,boom:5});e.cd=60+R()*50|0;}
  }});
// Doombot with jet boots: hovers at the hero's height and keeps firing
defineEnemy('doombot_jet',{hp:44,w:7,h:13,fly:true,score:20,boom:5,team:'doom',sprite:SPR_DBOT,pal:PAL_DBOT,glow:'*',
  think(e){const p=player(),ang=e.t*.012+(e.mem.ph??=R()*6.28);e.face=p.x>e.x?1:-1;
    seek(e,p.x+Math.cos(ang)*120,altAt(e,p.y-24+Math.sin(ang*1.6)*26),1.9,.06);
    if(e.cd===0&&pdist(e)<260&&los(e,p.x,p.y)){enemyShoot(e,{speed:4,dmg:7,col:[80,255,120],spread:.08,boom:4});e.cd=50+R()*45|0;}
    if(ST.frame%2===0)spawn(e.x+(R()-.5)*3,e.y+7,(R()-.5)*.3,1.2,gcol(),8,0,1,0);
  }});
