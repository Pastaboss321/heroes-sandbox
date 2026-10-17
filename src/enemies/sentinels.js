import './robots.js'; // evaluation order: runs after enemies/robots.js
import { ST } from '../state.js';
import { EMPTY, F, G, KIND, L, R, RUBBLE, S, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { MP, spawn } from '../world/particles.js';
import { flash, fxWord } from '../render/fx.js';
import { bgHit } from '../world/destruction.js';
import { hurt, pl_ } from '../player.js';
import { defineEnemy, enemyBeam, enemyShoot, los, pdist, player, seek, spawnEnemy } from './core.js';
import { banner } from '../modes/core.js';



// ---- Sentinels: mutant-hunting giants (X-Mansion siege)
const SENT_SPR=["......pPPPPPPp......", ".....pPPPPPPPPp.....", "....pPPPPPPPPPPp....", "....pPPFFFFFFPPp....", "....pFFFFFFFFFFp....", "....pF**FFFF**Fp....", "....pFFFFffFFFFp....", "....pFfKKKKKKfFp....", ".....pFFFFFFFFp.....", "......pppKKppp......", "..pPPPPPPKKPPPPPPp..", ".pPPPPPPPPPPPPPPPPp.", "pPPPMMPPPMMPPPMMPPPp", "pPPMMMMPPMMPPMMMMPPp", "pPPPMMPPMMMMPPMMPPPp", "pmmpPPPMMMMMMPPPpmmp", "MMm.pPPMooooMPPp.mMM", "MMm.pPPMooooMPPp.mMM", "MMm.pPPPMMMMPPPp.mMM", "mMm.ppPPPPPPPPpp.mMm", "MMm..pPPPPPPPPp..mMM", "KKK..pPPPPPPPPp..KKK", "MMm..ppPPPPPPpp..mMM", "MMm..KKKKKKKKKK..mMM", "MMm..pPPPPPPPPp..mMM", "mMm..pPPPPPPPPp..mMm", "HHH..pPPPppPPPp..HHH", "HHH...pPPppPPp...HHH", "hHh...pPPppPPp...hHh", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", ".....MMMm..mMMM.....", ".....MmMm..mMmM.....", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", "....pPPPp..pPPPp....", "....pPPPp..pPPPp....", "....mMMMm..mMMMm....", "...pPPPPp..pPPPPp...", "..pPPPPPp..pPPPPPp..", "..pPPPPPP..PPPPPPp..", "..ppppppp..ppppppp.."], SCOUT_SPR=["..pPPPPp..", ".pPFFFFPp.", ".pF*FF*Fp.", ".pFFKKFFp.", "..ppKKpp..", "pPPPMMPPPp", "MmPMooMPmM", "Mm.PPPP.mM", "Mm.PPPP.mM", "H..KKKK..H", "...pPPp...", "...pPPp...", "..pP..Pp..", "..MM..MM..", "..pP..Pp..", ".ppP..Ppp.", ".**....**."];

// giants smash a path through anything above their feet
export function smashAhead(e,reach){const d=e.def,hw=d.w/2,hh=d.h/2;
  for(let y=e.y-hh|0;y<=e.y+hh-1;y++)for(let k=1;k<=reach;k++){const x=e.x+e.face*(hw+k)|0;if(x<0||x>=W||y<0||y>=H-40)continue;const i=y*W+x,m=t[i];
    if(m&&KIND[m]!==G&&KIND[m]!==F){if(ST.np<MP-300&&R()<.5)spawn(x,y,e.face*(1+R()*2),-R()*2,col[i],70,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);setc(i,EMPTY);}}
  bgHit(e.x+e.face*(hw+reach/2),e.y,hh*.6|0);}

function sentinelThink(e){
  const d=e.def,S=d.scale||1,p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
  if(dist>70*S)e.vx+=(e.face*d.spd-e.vx)*.1;else e.vx*=.85;
  if(e.t%3===0)smashAhead(e,3*S);
  if(e.ground&&Math.abs(e.vx)>.12&&e.t%(S>1?44:28)===0){ // footfall
    ST.shake=Math.max(ST.shake,2.5*S);for(let k=0;k<10*S;k++)spawn(e.x+(R()-.5)*d.w,e.y+d.h/2,(R()-.5)*3,-R()*1.5,rgb(150,140,125),24,0,0,1);
    if(pl_.ground&&Math.abs(pl_.x-e.x)<40*S&&Math.abs(pl_.y-(e.y+d.h/2))<12){hurt(5*S);pl_.vy=-3;}
    if(S>1)fxWord(e.x,e.y+d.h/2-6,'THOOM',1,'#f3e9d2',true);}
  const head={ox:e.face*1*S,oy:-17*S},hand={ox:e.face*8.5*S,oy:5*S};
  if(e.cd===0&&dist<380&&!e.mem.charge&&!e.mem.sweep){e.mem.charge=40;e.cd=(S>1?140:170)+R()*60|0;}
  if(e.mem.charge>0){e.mem.charge--;for(const sx of [-3,3])spawn(e.x+head.ox+sx*S,e.y+head.oy,(R()-.5)*.6,(R()-.5)*.6,rgb(255,220,90),8,0,1,0,1);flash(e.x+head.ox,e.y+head.oy,10*S,[255,210,80],2);
    if(e.mem.charge===0){if(S>1){e.mem.sweep=36;e.mem.base=Math.atan2(p.y-(e.y+head.oy),p.x-(e.x+head.ox));fxWord(e.x,e.y+head.oy-12,'TARGET ACQUIRED',1,'#ff9ad8',true);}
      else{enemyBeam(e,{...head,dmg:16,col:[255,210,80],len:420,boom:7,spread:.04,w:2});fxWord(e.x+head.ox,e.y+head.oy-8,'ZZAAAK!',1,'#ffc93c',true);}}}
  if(e.mem.sweep>0){e.mem.sweep--;if(e.mem.sweep%2===0)enemyBeam(e,{...head,ang:e.mem.base-.7+(36-e.mem.sweep)/36*1.4,dmg:12,col:[255,210,80],len:520,boom:6,w:3,quiet:true});ST.shake=Math.max(ST.shake,4);}
  if(!e.mem.hb||e.t>e.mem.hb){e.mem.hb=e.t+(S>1?60:95)+R()*40;if(dist<320)enemyShoot(e,{...hand,speed:3.2,dmg:12,col:[255,110,200],boom:S>1?11:8,lead:15,spread:.08,fire:.2});}
  if(S>1&&e.t%600===300){for(let k=0;k<2;k++)spawnEnemy('sentinel_scout',e.x+(R()-.5)*30,e.y-d.h/2-10);banner('MASTER MOLD','deploying sentinels');}
}

defineEnemy('sentinel',{hp:900,w:18,h:42,fly:false,score:150,boom:18,spd:.45,glow:'*o',
  sprite:SENT_SPR,pal:{p:rgb(84,40,120),P:rgb(122,62,168),M:rgb(206,112,170),m:rgb(150,70,124),F:rgb(184,176,206),f:rgb(140,132,166),K:rgb(36,30,46),H:rgb(196,104,160),h:rgb(150,70,124),'*':rgb(255,222,90),o:rgb(255,80,80)},
  think:sentinelThink});

defineEnemy('master_mold',{hp:6500,w:36,h:84,fly:false,score:0,boom:32,spd:.26,scale:2,title:'MASTER MOLD',glow:'*o',
  sprite:SENT_SPR,pal:{p:rgb(58,40,78),P:rgb(92,70,120),M:rgb(150,92,140),m:rgb(104,60,98),F:rgb(150,146,170),f:rgb(108,104,130),K:rgb(26,22,34),H:rgb(150,92,140),h:rgb(104,60,98),'*':rgb(255,90,60),o:rgb(255,60,60)},
  think:sentinelThink});

defineEnemy('sentinel_scout',{hp:140,w:9,h:16,fly:true,score:40,boom:7,glow:'*o',
  sprite:SCOUT_SPR,pal:{p:rgb(84,40,120),P:rgb(122,62,168),M:rgb(206,112,170),m:rgb(150,70,124),F:rgb(184,176,206),K:rgb(36,30,46),H:rgb(196,104,160),'*':rgb(255,200,90),o:rgb(255,80,80)},
  think(e){const p=player();e.mem.ph??=R()*6.28;const ang=e.t*.02+e.mem.ph;
    seek(e,p.x+Math.cos(ang)*120,p.y-60+Math.sin(ang*1.3)*30,2.2,.05);e.face=p.x>e.x?1:-1;
    if(e.cd===0&&pdist(e)<280&&los(e,p.x,p.y)){for(const o of [-2,2])enemyShoot(e,{speed:4.2,dmg:6,col:[255,120,220],spread:.05,oy:o});e.cd=70+R()*40|0;}
    if(ST.frame%2===0)spawn(e.x+(R()-.5)*3,e.y+9,(R()-.5)*.3,1.2,R()<.5?rgb(255,200,90):rgb(255,120,60),8,0,1,0);}});
