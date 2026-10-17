import './sentinels.js'; // evaluation order: runs after enemies/sentinels.js
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { fxWord } from '../render/fx.js';
import { hurtTarget } from '../heroes/powers.js';
import { defineEnemy, enemyShoot, los, pdist, player, seek } from './core.js';

// ---- Brood: alien hive-bugs. Fast, leap at you, climb walls, come in packs
defineEnemy('brood',{hp:30,w:9,h:7,fly:false,score:12,boom:3,metal:false,glow:'*',
  sprite:["....bBBb.","..bBBBBBb",".bBBBBg*B","bBBBBBBBm",".bbBBBBb.",".l.l.l.l.","l..l.l..l"],
  pal:{b:rgb(60,30,72),B:rgb(118,62,132),g:rgb(90,200,90),'*':rgb(190,255,120),m:rgb(226,214,184),l:rgb(40,20,48)},
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(e.ground)e.vx+=(e.face*1.7-e.vx)*.25;
    if(e.mem.blocked&&e.t-e.mem.blocked<3)e.vy=-2.6; // skitters straight up walls
    if(e.ground&&e.cd===0&&dist<80&&dist>14){e.vx=e.face*4.2;e.vy=-3.6;e.cd=50+R()*40|0;}
    if(pdist(e)<9&&!(e.mem.bit>e.t)){hurtTarget(e,8);e.mem.bit=e.t+30;spawn(e.x+e.face*4,e.y,(R()-.5)*2,-R()*2,rgb(190,255,120),10,0,1,1);}}});
// ---- Hydra jet-trooper: hovers on a jetpack, strafes and fires rocket pairs
defineEnemy('hydra',{hp:40,w:7,h:11,fly:true,score:18,boom:5,metal:false,glow:'Yf',
  sprite:["..gGg..","..gYg..","..kkk..",".gGGGg.","tgGGGgt","tgGGGg.",".gGGG..","..g.g..","..g.g..",".ff.ff.","..f..f."],
  pal:{g:rgb(40,66,40),G:rgb(72,108,62),k:rgb(20,20,22),Y:rgb(255,220,80),t:rgb(120,120,126),f:rgb(255,170,60)},
  think(e){const p=player();e.mem.ph??=R()*6.28;const ang=e.t*.015+e.mem.ph;if(e.t===1&&R()<.3)fxWord(e.x,e.y-12,'HAIL HYDRA!',.8,'#bff07a',true);
    seek(e,p.x+Math.cos(ang)*120,p.y-45+Math.sin(ang*1.4)*25,1.9,.05);e.face=p.x>e.x?1:-1;
    if(e.cd===0&&pdist(e)<300&&los(e,p.x,p.y)){enemyShoot(e,{speed:3,dmg:8,col:[255,160,60],boom:6,fire:.3,lead:10,spread:.08});e.mem.pair=(e.mem.pair||0)+1;e.cd=e.mem.pair%2?10:100+R()*40|0;}
    if(ST.frame%2===0)spawn(e.x+(R()-.5)*3,e.y+6,(R()-.5)*.3,1.4,R()<.5?rgb(255,200,90):rgb(255,120,50),8,0,1,0);}});
