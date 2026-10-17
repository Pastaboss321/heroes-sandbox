import './basic.js'; // evaluation order: runs after enemies/basic.js
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { hurtTarget } from '../heroes/powers.js';
import { defineEnemy, enemyBeam, enemyShoot, los, pdist, player, seek, spawnEnemy } from './core.js';



// ---- NYC 2099 robots
// swarmbot: cheap kamikaze drone, comes in clouds
defineEnemy('swarmbot',{hp:14,w:5,h:5,fly:true,score:5,boom:3,glow:'*c',
  sprite:[".cAc.","cA*Ac","A***A","cA*Ac",".c.c."],
  pal:{A:rgb(150,160,182),c:rgb(60,220,255),'*':rgb(255,60,200)},
  think(e){
    const p=player();e.mem.ph??=R()*6.28;const o=e.t*.08+e.mem.ph;
    seek(e,p.x+Math.cos(o)*10,p.y+Math.sin(o)*10,e.t<40?1.5:2.8,.07);
    if(pdist(e)<7){hurtTarget(e,10);e.mem.noScore=true;e.hp=0;}
    if(ST.frame%3===0)spawn(e.x,e.y,(R()-.5)*.4,.3,rgb(255,70,210),6,0,1,0);
  }});

// mech: heavy street walker, lobs rocket salvos that chew through buildings
defineEnemy('mech',{hp:140,w:11,h:14,fly:false,score:40,boom:9,glow:'*c',
  sprite:["...AAAAA...","..AA*A*AA..","..AAAAAAA..","cAAAAAAAAAc","cAmmAAAmmAc","c.AAAAAAA.c","..AmmAmmA..","...AA.AA...","..AA...AA..","..A.....A..",".AA.....AA.",".A.......A.","AA.......AA","cc.......cc"],
  pal:{A:rgb(110,116,134),m:rgb(48,50,62),'*':rgb(255,40,60),c:rgb(60,220,255)},
  think(e){
    const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>140)e.vx+=(e.face*.7-e.vx)*.15;else if(dist<80)e.vx+=(-e.face*.5-e.vx)*.15;else e.vx*=.8;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-5;
    if(e.ground&&Math.abs(e.vx)>.3&&e.t%18===0){ST.shake=Math.max(ST.shake,1.5);for(let k=0;k<4;k++)spawn(e.x+(R()-.5)*10,e.y+7,(R()-.5)*1.5,-R(),rgb(150,140,125),20,0,0,1);}
    if(e.cd===0&&dist<320&&los(e,p.x,p.y)){enemyShoot(e,{speed:2.8,dmg:12,col:[255,170,60],boom:7,fire:.3,lead:20,spread:.05});e.mem.salvo=(e.mem.salvo||0)+1;e.cd=e.mem.salvo%3?14:130;}
  }});

// Ultron Prime: boss. Beam bursts, missile rings, calls in swarms; enraged under half health
defineEnemy('ultron_prime',{hp:1400,w:15,h:13,fly:true,score:0,boom:16,glow:'*c',title:'ULTRON PRIME',
  sprite:["....AAAAAAA....","..AAAAAAAAAAA..",".AAA**AAA**AAA.","AAAA**AAA**AAAA","AAAAAAAAAAAAAAA","AAAAAmmmmmAAAAA",".AAAm*****mAAA.","..AAAmmmmmAAA..","...AAAAAAAAA...","..cA.aaaaa.Ac..",".c..a.aaa.a..c.","c....a...a....c",".....c...c....."],
  pal:{A:rgb(196,202,218),a:rgb(120,126,142),m:rgb(40,40,50),'*':rgb(255,50,40),c:rgb(255,90,60)},
  think(e){
    const p=player(),enr=e.hp<e.def.hp*.5;
    seek(e,p.x+Math.sin(e.t*.01)*90,p.y-95+Math.sin(e.t*.023)*20,enr?2.2:1.6,.04);
    e.face=p.x>e.x?1:-1;
    if(e.cd===0){const a=e.mem.atk=(e.mem.atk||0)+1;
      if(a%3===1){e.mem.beam=enr?5:3;e.mem.bt=0;}
      else if(a%3===2){for(let k=0;k<(enr?14:10);k++)enemyShoot(e,{speed:2.6+R()*.8,dmg:8,spread:.7,col:[255,90,60],boom:4,life:260});ST.shake+=4;}
      else for(let k=0;k<(enr?4:3);k++)spawnEnemy('swarmbot',e.x+(R()-.5)*20,e.y+8);
      e.cd=enr?70:100;}
    if(e.mem.beam>0&&--e.mem.bt<=0){enemyBeam(e,{dmg:12,col:[255,40,40],len:420,spread:.15,boom:5});e.mem.beam--;e.mem.bt=8;}
    if(ST.frame%2===0)spawn(e.x+(R()-.5)*10,e.y+7,(R()-.5)*.6,1.2,rgb(255,120,80),10,0,1,0);
  }});
