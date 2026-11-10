// Entry point: imports every module in evaluation order (see the import chain note in state.js), then boots the game and exposes window.GAME for scripted tests.
import { initGL, resizeGL } from './gl.js';
import { OBJS, buildSpawnUI, placeStruct } from './ui/spawn.js';
import { ST } from './state.js';
import { EMPTY, MATS } from './world/materials.js';
import { H, N, VH, VW, W, bg, bgB, col, onViewResize, setc, t } from './world/grid.js';
import { bodies, gnd, pin, rcount, rid, supportCheck } from './world/support.js';
import { bodyHit } from './world/bodies.js';
import { SET } from './render/look.js';
import { BLD } from './maps/city.js';
import { comics, flashes, rings } from './render/fx.js';
import * as VFX from './render/vfxcore.js';
import { explode } from './world/destruction.js';
import { posePlayer } from './render/rig.js';
import { SPAWN, drones, jets, pins, shots, strikes, therm, waves } from './heroes/powers.js';
import { keys, mouse, pl_, pressed, snapCam, toggleFly } from './player.js';
import { CHARS, cast, setChar } from './heroes/index.js';
import { ENEMY_TYPES, clearEnemies, defineEnemy, enemies, spawnEnemy, startWave } from './enemies/core.js';
import { cv, glc, resize, sim } from './render/canvas.js';
import { step } from './world/sim.js';
import { render } from './render/render.js';
import { selPower } from './ui/hud.js';
import { MAPDEFS, mapSel, regen } from './maps/index.js';
import { loop, tick } from './loop.js';
import { $, MODES, defineMode, startRun } from './modes/core.js';
import { showMenu } from './ui/menu.js';
import { syncSettings } from './ui/settings.js';
import { spawnTitan } from './enemies/titans.js';
import './modes/titans.js';
import { openTravel, travelTo } from './world/travel.js';
import { sliceLine } from './world/slice.js';
import { setAoe } from './heroes/aoe.js';
import { summons } from './heroes/abilities.js';
import { drawSprite } from './render/sprites.js';
import { initZoom } from './ui/zoom.js'; // last: it pulls in player.js, which must load in its usual order
import { triggerEvent } from './maps/events.js';
import { PLACED } from './maps/setpieces.js';
import './enemies/sinister.js'; // Hand ninjas, pumpkin drones, illusions, the Goblin, Mysterio and Sandman bosses, the training dummy
import './modes/sinister.js';

resize();
onViewResize(()=>resizeGL(VW,VH)); // the zoom resized the sim canvas (ui/zoom.js)
initZoom();
initGL(sim,glc,cv).then(ok=>{ST.GL=ok;});
buildSpawnUI();
$('spawnbtn').onclick=e=>{ST.spawnUI.toggle();e.target.blur();};
syncSettings();
mapSel.value='nyc2099';
regen();
showMenu();
requestAnimationFrame(loop);
window.GAME={mapEvent:()=>triggerEvent(mapSel.value),get PLACED(){return PLACED},dbg:()=>({rid,rcount,gnd}),pose:()=>posePlayer(pl_).filter(r=>/[^.]/.test(r)).join('|'),set hitstop(v){ST.hitstop=v},startRun,showMenu,MODES,defineMode,get GS(){return ST.GS},get MS(){return ST.MS},get dbox(){return[ST.dx0,ST.dy0,ST.dx1,ST.dy1]},explode:(x,y,r)=>explode(x,y,r),get pin(){return pin},supportCheck:()=>supportCheck(false),get t(){return t},get col(){return col},get bg(){return bg},get bgB(){return bgB},get W(){return W},get H(){return H},pl_,mouse,keys,pressed,selPower,cast:()=>cast(),regen,tick,render,bodies,shots,drones,strikes,get vortex(){return ST.vortex},get held(){return ST.held},get fps(){return ST.fps},get simMs(){return ST.simMs},get frameMs(){return ST.frameMs},get np(){return ST.np},get cam(){return[ST.camX,ST.camY]},count:m=>{let c=0;for(let i=0;i<N;i++)if(t[i]===m)c++;return c;},MATS,toggleFly,BLD,bodyHit,setChar,CHARS,get CH(){return ST.CH},enemies,spawnEnemy,startWave,clearEnemies,ENEMY_TYPES,defineEnemy,get storm(){return ST.storm},cut:(x0,x1,y0,y1)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)setc(y*W+x,EMPTY);},setCam:(x,y)=>{ST.camX=x;ST.camY=y;ST.camVX=ST.camVY=0;ST.focX=x+VW/2;ST.focY=y+VH/2;},snapCam,get spaceA(){return ST.spaceA},comics,rings,flashes,waves,SET,SPAWN,get decoy(){return ST.decoy},get stasis(){return ST.stasis},pins,therm,jets,get slowT(){return ST.slowT},placeStruct,OBJS,spawnUI:()=>ST.spawnUI,MAPDEFS,mapSel,sliceLine,travelTo,openTravel,spawnTitan,setAoe,get aoeK(){return ST.aoeK},ST,step,summons,drawSprite,VFX};

if(import.meta.env.DEV)import('./dev.js'); // test helpers (window.DEV), dev server only
