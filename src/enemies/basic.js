import { defineEnemy, enemyBeam, enemyShoot, los, pdist, player, seek } from './core.js';
import { ST } from '../state.js';
import { R, rgb } from '../world/materials.js';
import { spawn } from '../world/particles.js';



// --- Ultron sentry drone: hovers at range, strafes, fires a red laser
defineEnemy('ultron',{hp:45,w:9,h:7,fly:true,score:15,boom:6,
  sprite:["..aaaaa..",".aAAAAAa.","aA*AAA*Aa","aAAAmAAAa",".aAmmmAa.","..a...a..",".a.....a."],
  pal:{a:rgb(92,98,112),A:rgb(176,182,196),m:rgb(40,40,48),'*':rgb(255,70,50)},
  think(e){
    const p=player(),ang=e.t*.012+(e.mem.ph??=R()*6.28),want=pdist(e)<45?140:95;
    seek(e,p.x+Math.cos(ang)*want,p.y-55+Math.sin(ang*1.7)*25,1.7,.06);
    e.face=p.x>e.x?1:-1;
    if(e.cd===0&&pdist(e)<300&&los(e,p.x,p.y)){e.mem.charge=30;e.cd=110+R()*60|0;}
    if(e.mem.charge>0){e.mem.charge--;e.vx*=.8;e.vy*=.8;if(e.mem.charge%3===0)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(255,80,60),8,0,1,0,1);if(e.mem.charge===0)enemyBeam(e,{dmg:9,col:[255,60,50]});}
    if(ST.frame%3===0)spawn(e.x+(R()-.5)*4,e.y+4,(R()-.5)*.3,.8,rgb(255,120,80),6,0,1,0);
  }});

// --- Chitauri soldier: walks in, keeps distance, fires plasma bolts, hops obstacles
defineEnemy('chitauri',{hp:35,w:7,h:13,fly:false,score:10,boom:4,
  sprite:["..bbb..",".bgggb.",".g*g*g.",".bgggb.","..bbb..","bsssssb","bsgsgsb","bsssssb","w.sss.w","..s.s..","..s.s..",".bb.bb.",".bb.bb."],
  pal:{b:rgb(70,62,58),g:rgb(150,140,120),'*':rgb(120,220,255),s:rgb(110,104,96),w:rgb(200,170,80)},glow:'*w',
  think(e){
    const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>110)e.vx+=(e.face*1.1-e.vx)*.2;else if(dist<60)e.vx+=(-e.face*.8-e.vx)*.2;else e.vx*=.8;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-4.5;
    if(e.cd===0&&dist<260&&los(e,p.x,p.y)){enemyShoot(e,{speed:3.6,dmg:7,col:[140,200,255],lead:12,spread:.08});e.cd=60+R()*50|0;}
  }});

// --- Chitauri glider: fast swooping flyer on a hover-sled
defineEnemy('chitauri_glider',{hp:30,w:13,h:7,fly:true,score:20,boom:6,
  sprite:["....bbb......","...bg*gb.....","....sss......","..wsssssw....","sssssssssssss",".ccccccccccc.","..*.......*.."],
  pal:{b:rgb(70,62,58),g:rgb(150,140,120),'*':rgb(120,220,255),s:rgb(120,112,104),w:rgb(200,170,80),c:rgb(80,74,70)},glow:'*w',
  think(e){
    const p=player();e.mem.side??=R()<.5?-1:1;
    if(Math.abs(e.x-(p.x+e.mem.side*120))<20)e.mem.side*=-1;
    seek(e,p.x+e.mem.side*130,p.y-40+Math.sin(e.t*.05)*30,3,.05);
    if(e.cd===0&&pdist(e)<220){enemyShoot(e,{speed:4,dmg:6,col:[140,200,255],spread:.1});e.cd=45+R()*40|0;}
    if(ST.frame%2===0)spawn(e.x-e.face*6,e.y+3,-e.vx*.3,.5,rgb(120,220,255),8,0,1,0);
  }});
