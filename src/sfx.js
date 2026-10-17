// Positional sound wrappers around audio.js.
import { play, loop as sfxLoop } from './audio.js';
import './render/rig.js'; // evaluation order: runs after render/rig.js
import { ST } from './state.js';
import { VH, VW } from './world/grid.js';
import { SET } from './render/look.js';


// ---- sound: positional wrappers around the synth in audio.js (pan by screen x, fade with distance off screen)
export const SHOT_SND={bolt:'bolt',missile:'missile',repulsor:'repulsor',hammer:'whoosh',psi:'psi',shard:'ice',optic:'zap',flare:'pop',bomb:'thud',proton:'charge',axe:'whoosh',pin:'whoosh',rocket:'missile',mbolt:'bolt'};

function sndAt(x,y,v){const dx=(x-(ST.camX+VW/2))/(VW*.5),dy=(y-(ST.camY+VH/2))/(VH*.5),d=Math.max(Math.abs(dx),Math.abs(dy));if(d>3.4)return null;return[(v??1)*(d>1?1/(1+(d-1)*1.5):1),Math.max(-1,Math.min(1,dx*.8))];}

export function snd(name,x,y,o={}){if(!SET.sound)return;const a=sndAt(x,y,o.v);if(!a)return;o.v=a[0];o.pan=a[1];play(name,o);}

export function sndLoop(id,name,x,y,o={}){if(!SET.sound)return;const a=sndAt(x,y,o.v);if(!a)return;o.v=a[0];o.pan=a[1];sfxLoop(id,name,o);}

// ambFire, ambLava: shared state (ST in state.js)
