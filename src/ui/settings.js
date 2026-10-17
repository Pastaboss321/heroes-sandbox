// Settings panel.
import { setVolume, setMuted, initAudio } from '../audio.js';
import './menu.js'; // evaluation order: runs after ui/menu.js
import { ST } from '../state.js';
import { VH, VW } from '../world/grid.js';
import { SET, applyTOD, saveSet } from '../render/look.js';
import { snd } from '../sfx.js';
import { $, overlay } from '../modes/core.js';


// ---- settings panel
// setFrom: shared state (ST in state.js)

function openSettings(from){ST.setFrom=from;syncSettings();overlay('settings');}

export function closeSettings(){overlay(ST.setFrom);}

export function syncSettings(){$('svol').value=SET.vol;$('ssound').checked=SET.sound;$('sfx').checked=SET.fx;$('slight').checked=SET.light;setVolume(SET.vol/100*.9);setMuted(!SET.sound);$('sdim').value=SET.dim;$('sshake').value=SET.shake;$('swords').checked=SET.words;$('sink').checked=SET.ink;$('sbloom').checked=SET.bloom;$('sfps').checked=SET.fps;
  for(const b of document.querySelectorAll('.tod'))b.classList.toggle('on',b.dataset.tod===SET.tod);document.body.classList.toggle('showfps',SET.fps);}

for(const b of document.querySelectorAll('.tod'))b.onclick=()=>{SET.tod=b.dataset.tod;saveSet();applyTOD();syncSettings();};

$('sdim').oninput=e=>{SET.dim=+e.target.value;saveSet();applyTOD();};

$('sshake').oninput=e=>{SET.shake=+e.target.value;saveSet();};

for(const [id,k] of [['swords','words'],['sink','ink'],['sbloom','bloom'],['sfps','fps'],['ssound','sound'],['sfx','fx'],['slight','light']])$(id).onchange=e=>{SET[k]=e.target.checked;saveSet();syncSettings();};

$('svol').oninput=e=>{SET.vol=+e.target.value;saveSet();setVolume(SET.vol/100*.9);};

$('svol').onchange=()=>snd('ui',ST.camX+VW/2,ST.camY+VH/2);

// browsers only allow audio after a user gesture
addEventListener('pointerdown',()=>initAudio(),true);
addEventListener('keydown',()=>initAudio(),true);

document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button,.card,.chip'))snd('ui',ST.camX+VW/2,ST.camY+VH/2,{gap:.03});},true);

$('sback').onclick=closeSettings;
$('msettings').onclick=()=>openSettings('menu');
$('psettings').onclick=()=>openSettings('pause');
