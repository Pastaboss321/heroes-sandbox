// Fixed-step tick and the requestAnimationFrame loop with HUD updates.
import { tickAudio, ambience } from './audio.js';
import './ui/input.js'; // evaluation order: runs after ui/input.js
import { ST } from './state.js';
import { PHYS, TICK } from './world/physics.js';
import { H, W } from './world/grid.js';
import { step } from './world/sim.js';
import { bodies, supportCheck } from './world/support.js';
import { updBodies } from './world/bodies.js';
import { SET } from './render/look.js';
import { updParticles } from './world/particles.js';
import { SPAWN, TSL, updDecoy, updDrones, updFx, updJets, updPins, updShots, updStasis, updStorm, updStrikes, updTelekinesis, updTherm, updVortex, updWaves } from './heroes/powers.js';
import { ACT } from './heroes/xmen.js';
import { updSlide } from './heroes/iceman.js';
import { updWave2 } from './heroes/wave2.js';
import { mouse, pl_, pressed, updCamera, updPlayer } from './player.js';
import { cast } from './heroes/index.js';
import { enemies, spawnQ, updEnemies } from './enemies/core.js';
import { render } from './render/render.js';
import { pwDiv } from './ui/hud.js';
import { MAPDEFS, mapSel } from './maps/index.js';
import { $ } from './modes/core.js';
import { useTool } from './ui/spawn.js';

const waveTEl=document.getElementById('waveT'),scoreNEl=document.getElementById('scoreN'),scoreSEl=document.getElementById('scoreS'),waveEl=document.getElementById('wave'),hpEl=document.getElementById('hp'),enEl=document.getElementById('en'),fpsEl=document.getElementById('fps'),modeEl=document.getElementById('mode');
let last=performance.now(),acc=0,fpsT=0,fpsN=0;
export function tick(){
  ST.shieldOn=false;
  updCamera();
  if(mouse.right&&SPAWN.tool){SPAWN.tool=null;ST.spawnUI&&ST.spawnUI.select(null);}
  if(!mouse.down){SPAWN.latch=false;SPAWN.lx=SPAWN.ly=null;}
  if(mouse.down){if(SPAWN.tool)useTool();else cast();}if(ST.cd>0)ST.cd--;
  updTelekinesis();
  const world=!(ST.slowT>0&&(ST.slowT--&1))&&!SPAWN.pause; // Tactical Focus runs the world at half speed; the spawn menu can freeze it
  updPlayer();if(!pl_.slip){TSL.push({x:pl_.x,y:pl_.y,hp:pl_.hp,face:pl_.face});if(TSL.length>300)TSL.shift();}updShots(world);
  if(world){updDrones();updVortex();updStrikes();updStorm();updEnemies();updJets();}
  updPins();updTherm();updDecoy();if(world)updWave2();
  for(let n=ACT.length-1;n>=0;n--)if(ACT[n]()===false)ACT.splice(n,1);
  if(world)updSlide();
  if(ST.MODE&&ST.MODE.update){ST.MODE.update(ST.MS);ST.MS.t++;}
  const md=MAPDEFS[mapSel.value];if(md&&md.amb&&world)md.amb();
  const t0=performance.now();
  if(world){updStasis();step();updBodies();if(ST.frame%4===0)supportCheck(false);}
  ST.simMs=ST.simMs*.95+(performance.now()-t0)*.05;
  if(world)updParticles();
  updFx();updWaves();
  for(const k in pressed)pressed[k]=false;
}
export function loop(now){
  const dt=Math.min(100,now-last);last=now;acc+=dt;
  const a=performance.now();
  let n=0;if(ST.GS==='play'){if(ST.hitstop>0&&acc>=TICK){ST.hitstop--;acc=0;}else{while(acc>=TICK&&n<PHYS.maxSteps){if(!SPAWN.slow||(++ST.slowTk&1))tick();acc-=TICK;n++;}if(n===PHYS.maxSteps)acc=0;}}else acc=0;
  render();
  tickAudio();
  if(SET.sound){const on=ST.GS==='play'||ST.GS==='menu',md=MAPDEFS[mapSel.value];
    ambience('fire',on?Math.min(1,ST.ambFire/350):0);ambience('lava',on?Math.min(1,ST.ambLava/1400):0);
    ambience('rain',on&&(ST.storm||(md&&md.rain))?(ST.storm?1:.6):0);ambience('wind',on&&md&&md.wind?.5:0);}
  else{ambience('fire',0);ambience('lava',0);ambience('rain',0);ambience('wind',0);}
  ST.frameMs=ST.frameMs*.95+(performance.now()-a)*.05;
  fpsN++;fpsT+=dt;if(fpsT>=500){ST.fps=fpsN*1000/fpsT;fpsN=0;fpsT=0;}
  hpEl.style.width=Math.max(0,pl_.hp/ST.CH.hp*100)+'%';enEl.style.width=Math.max(0,pl_.en)+'%';
  {const tc=$('toolchip'),T=SPAWN.tool,st=[SPAWN.pause&&'PHYSICS PAUSED',SPAWN.slow&&'SLOW MOTION',SPAWN.god&&'GOD MODE',SPAWN.inf&&'INFINITE ENERGY',SPAWN.peace&&'PEACEFUL'].filter(Boolean);
   const txt=T?'PLACING '+T.label.toUpperCase()+' · RIGHT-CLICK CANCELS'+(T.kind==='paint'||T.id==='boom'||T.id==='boulder'?' · [ ] BRUSH '+SPAWN.brush:''):st.join(' · ');tc.style.display=txt&&ST.GS==='play'?'block':'none';if(tc.textContent!==txt)tc.textContent=txt;}
  {const d=pwDiv.children[ST.cur],f=d&&d.lastChild;if(f&&f.className==='cdf')f.style.width=(ST.cd>0?Math.min(100,ST.cd/ST.cdMax*100):0)+'%';}
  {const p=pl_;modeEl.textContent='· '+(p.ball?'WRECKING BALL':p.tow?'HAMMER TOW':p.stealth>0?'CLOAKED':p.grit>0?'UNKILLABLE':ST.slowT>0?'FOCUS':p.cling?'CLIMB':p.crouch>6?(p.crouch>=56?'LEAP READY':'CHARGING'):
    p.fly?(ST.CH.id==='iceman'?(p.boost>0?'ICE RUSH':'ICE SLIDE'):p.boost>0?'BOOST':'FLYING'):p.charge>0?'CHARGE':p.leap?'LEAP':p.slam?'SLAM':(p.sprint||0)>40?'SPRINT':'WALK');}
  waveTEl.textContent=ST.wave>0?'WAVE '+ST.wave:(ST.MODE?ST.MODE.name.toUpperCase():'');
  waveEl.textContent=ST.MODE&&ST.MODE.hud?ST.MODE.hud(ST.MS):`enemies ${enemies.length+spawnQ.length}`;
  scoreNEl.textContent=ST.score.toLocaleString();scoreSEl.textContent=`SCORE · ${ST.kills} KILLS`;
  fpsEl.textContent=`${ST.fps.toFixed(0)} fps · sim ${ST.simMs.toFixed(1)} ms · frame ${ST.frameMs.toFixed(1)} ms · world ${W}x${H} · chunks falling ${bodies.length} · particles ${ST.np}`;
  requestAnimationFrame(loop);
}
