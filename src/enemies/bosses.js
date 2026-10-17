import './savage.js'; // evaluation order: runs after enemies/savage.js
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { H, W, markDirty, t } from '../world/grid.js';
import { gnd, q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { beams, fxWord } from '../render/fx.js';
import { snd } from '../sfx.js';
import { hurtTarget, smashOverlap } from '../heroes/powers.js';
import { pl_ } from '../player.js';
import { defineEnemy, enemyShoot, player, seek } from './core.js';
import { smashAhead } from './sentinels.js';


// ---- Juggernaut (boss): walks through anything. Every few seconds he lowers his head and charges
defineEnemy('juggernaut',{hp:2600,w:16,h:24,fly:false,score:0,boom:18,metal:false,title:'JUGGERNAUT',glow:'',
  sprite:["....hhhhhhhh....","...hHHHHHHHHh...","..hHHHHHHHHHHh..","..hHHkkHHkkHHh..","..hHHHHHHHHHHh..","..hhHHHHHHHHhh..","...hhhHHHHhhh...",".rrrrRRRRRRrrrr.","rRRRRRRRRRRRRRRr","rRRRrRRRRRRrRRRr","rRRr.RRRRRR.rRRr","rRRr.RRbbRR.rRRr","sss..RRbbRR..sss","sss..RRRRRR..sss",".....RRRRRR.....",".....RR..RR.....","....rRR..RRr....","....rRR..RRr....","....rRR..RRr....","....rRR..RRr....","....hHH..HHh....","...hHHH..HHHh...","...hhhh..hhhh..."],
  pal:{h:rgb(70,42,30),H:rgb(132,82,52),k:rgb(20,16,14),R:rgb(150,40,40),r:rgb(90,20,24),s:rgb(204,154,112),b:rgb(204,160,60)},
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);if(e.frozen>0)e.frozen=Math.max(0,e.frozen-4); // nothing holds the Juggernaut for long
    if(e.mem.charge>0){e.mem.charge--;e.vx=e.mem.dir*4.6;smashAhead(e,6);if(e.t%4===0){ST.shake=Math.max(ST.shake,4);for(let k=0;k<6;k++)spawn(e.x-e.mem.dir*8,e.y+12,(R()-.5)*3,-R()*2,rgb(150,140,125),20,0,0,1);}
      if(Math.abs(pl_.x-e.x)<14&&Math.abs(pl_.y-ST.PH/2-e.y)<18&&!(e.mem.hitT>e.t)){hurtTarget(e,26);pl_.vx=e.mem.dir*7;pl_.vy=-5;e.mem.hitT=e.t+30;ST.shake=22;snd('slam',e.x,e.y);}
      if(e.mem.charge===0)e.cd=120+R()*80|0;return;}
    e.face=dx>0?1:-1;e.vx+=(e.face*.9-e.vx)*.12;if(e.t%3===0)smashAhead(e,3);
    if(e.ground&&Math.abs(e.vx)>.2&&e.t%30===0){ST.shake=Math.max(ST.shake,3);snd('stomp',e.x,e.y);}
    if(e.cd===0&&dist<260){e.mem.charge=70;e.mem.dir=e.face;fxWord(e.x,e.y-20,"NOTHING STOPS THE JUGGERNAUT!",1.1,'#e23b2e',true);snd('roar',e.x,e.y,{pitch:.8});}
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<3)e.vy=-4;}});

// ---- Magneto (boss): rips the city apart and throws it at you. Pulls metal heroes in. Raises a force field when hurt
defineEnemy('magneto',{hp:2200,w:9,h:16,fly:true,score:0,boom:16,metal:false,title:'MAGNETO',glow:'',
  sprite:["...RRR...","..RRRRR..","..RfffR..","..RfkfR..","..pRRRp..",".pRRRRRp.","pPRRRRRPp","pPRRRRRPp","pP.RRR.Pp","pP.RRR.Pp","pP.R.R.Pp","p..R.R..p","...R.R...","..RR.RR..","..rr.rr..","........."],
  pal:{R:rgb(184,32,44),r:rgb(110,18,24),f:rgb(224,182,150),k:rgb(30,20,24),p:rgb(90,40,112),P:rgb(132,72,152)},
  think(e){const p=player(),enr=e.hp<e.def.hp*.5;
    seek(e,p.x+Math.sin(e.t*.008)*120,p.y-90+Math.sin(e.t*.02)*16,enr?2:1.5,.04);e.face=p.x>e.x?1:-1;
    if(e.mem.shield>0){e.mem.shield--;if(e.t%2===0)for(let k=0;k<3;k++){const a=R()*6.283;spawn(e.x+Math.cos(a)*14,e.y+Math.sin(a)*14,0,0,rgb(200,120,255),6,0,1,0,1);}}
    if(e.mem.pull>0){e.mem.pull--;const dx=e.x-pl_.x,dy=e.y-(pl_.y-ST.PH/2),d=Math.hypot(dx,dy)||1;pl_.vx+=dx/d*.35;pl_.vy+=dy/d*.35;if(e.t%3===0)beams.push({pts:[[e.x,e.y],[(e.x+pl_.x)/2+(R()-.5)*16,(e.y+pl_.y-ST.PH/2)/2+(R()-.5)*16],[pl_.x,pl_.y-ST.PH/2]],life:2,c:[230,170,255],g:[150,60,220]});}
    if(e.cd===0){const a=e.mem.atk=(e.mem.atk||0)+1;
      if(a%4===1){ // tear a chunk of building out and hurl it
        let n=0,cx=0,cy=0;for(let tries=0;tries<60&&!n;tries++){const X=e.x+(R()-.5)*180|0,Y=e.y+(R()-.2)*140|0;if(X<4||X>=W-4||Y<4||Y>=H-50)continue;const m=t[Y*W+X];if(KIND[m]===S&&!gnd[Y*W+X]){cx=X;cy=Y;}}
        if(cx){for(let y=-5;y<=5;y++)for(let x=-6;x<=6;x++){const X=cx+x,Y=cy+y,i=Y*W+X;if(X<0||X>=W||Y<0||Y>=H-50)continue;if(KIND[t[i]]===S&&!gnd[i]){q[n++]=i;markDirty(i);}}}
        const b=n>=20?makeBody(q,n,false):null;
        if(b){b.x=e.x;b.y=e.y-18;const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*8.5;b.vy=dy/d*8.5-1.5;b.va=(R()-.5)*.2;b.thrown=true;smashOverlap(b);fxWord(e.x,e.y-24,'RISE!',1,'#c88cff',true);snd('rip',e.x,e.y);}
        else for(let k=0;k<6;k++)enemyShoot(e,{speed:4,dmg:8,spread:.5,col:[210,130,255]});}
      else if(a%4===2){for(let k=0;k<8;k++)enemyShoot(e,{speed:3.6+R(),dmg:8,spread:.35,col:[210,130,255],boom:4});}
      else if(a%4===3&&(ST.CH.id==='iron'||ST.CH.id==='wolverine')){e.mem.pull=70;fxWord(e.x,e.y-24,ST.CH.id==='iron'?'YOUR ARMOR IS MINE!':'ADAMANTIUM, HOW QUAINT.',1,'#c88cff',true);}
      else if(enr&&!(e.mem.shield>0)){e.mem.shield=180;fxWord(e.x,e.y-24,'FORCE FIELD',1,'#c88cff',true);}
      e.cd=enr?75:105;}}});
