// Keyboard and mouse input.
import { MAPDEFS, mapSel, regen } from '../maps/index.js';
import { ST } from '../state.js';
import { SPAWN } from '../heroes/powers.js';
import { keys, mouse, pressed } from '../player.js';
import { CHARS, setChar } from '../heroes/index.js';
import { clearEnemies, startWave } from '../enemies/core.js';
import { cv } from '../render/canvas.js';
import { selPower } from './hud.js';
import { $, pauseRun, resumeRun } from '../modes/core.js';
import { playFromMenu } from './menu.js';
import { closeSettings } from './settings.js';


export const helpEl=document.getElementById('help');

document.getElementById('helpbtn').onclick=e=>{helpEl.style.display=helpEl.style.display==='none'?'':'none';e.target.blur();};

const KEYMAP={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Digit6:5,Digit7:6,Digit8:7,Digit9:8,Digit0:9,Minus:10,Equal:11};

const MAPS=Object.keys(MAPDEFS);

addEventListener('keydown',e=>{
  const setOpen=!$('settings').classList.contains('hidden');
  if(e.code==='Escape'){if(setOpen)closeSettings();else if(ST.GS==='play'&&ST.spawnUI&&ST.spawnUI.isOpen()){ST.spawnUI.close();}else if(ST.GS==='play')pauseRun();else if(ST.GS==='pause')resumeRun();e.preventDefault();return;}
  if(ST.GS==='menu'&&!setOpen&&e.code==='Enter'){playFromMenu();return;}
  if(ST.GS!=='play')return;
  if(!keys[e.code])pressed[e.code]=true;keys[e.code]=true;
  const sb=ST.MODE&&ST.MODE.sandbox;
  if(e.code in KEYMAP&&KEYMAP[e.code]<ST.CH.powers.length)selPower(KEYMAP[e.code]);
  if(sb&&e.code==='KeyC')setChar(CHARS.indexOf(ST.CH)+(e.shiftKey?-1:1));if(sb&&e.code==='KeyN')startWave();if(sb&&e.code==='KeyK')clearEnemies();
  if(sb&&e.code==='KeyB')ST.spawnUI.toggle();
  if(sb&&e.code==='BracketLeft'){SPAWN.brush=Math.max(1,SPAWN.brush-1);ST.spawnUI.setBrush(SPAWN.brush);}if(sb&&e.code==='BracketRight'){SPAWN.brush=Math.min(14,SPAWN.brush+1);ST.spawnUI.setBrush(SPAWN.brush);}
  if(e.code==='KeyQ')selPower(ST.cur-1);if(e.code==='KeyE')selPower(ST.cur+1);
  if(sb&&e.code==='KeyR')regen();if(sb&&e.code==='KeyM'){mapSel.value=MAPS[(MAPS.indexOf(mapSel.value)+1)%MAPS.length];regen();}
  if(e.code==='KeyH')helpEl.style.display=helpEl.style.display==='none'?'':'none';
  if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();});

addEventListener('keyup',e=>{keys[e.code]=false;});

addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.down=false;if(ST.GS==='play'&&ST.MODE&&!ST.MODE.sandbox)pauseRun();}); // never lose a run to an alt-tab
cv.addEventListener('mousemove',e=>{mouse.sx=(e.clientX-ST.ox)/ST.scale;mouse.sy=(e.clientY-ST.oy)/ST.scale;});

cv.addEventListener('mousedown',e=>{if(e.button===0)mouse.down=true;if(e.button===2)mouse.right=true;});

addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;if(e.button===2)mouse.right=false;});

cv.addEventListener('contextmenu',e=>e.preventDefault());

cv.addEventListener('wheel',e=>{selPower(ST.cur+(e.deltaY>0?1:-1));e.preventDefault();},{passive:false});
