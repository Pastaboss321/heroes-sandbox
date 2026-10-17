import '../ui/settings.js'; // evaluation order: runs after ui/settings.js
import { defineMode } from './core.js';



// ---- Sandbox: the free-play toybox
defineMode('sandbox',{name:'Sandbox',sub:'free play',desc:'Any map, any hero. B opens the spawn menu (enemies, objects, terrain, tools). N spawns a wave, K clears enemies, M/R swap or rebuild the map, C swaps hero.',sandbox:true});
