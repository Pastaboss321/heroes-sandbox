// Fantastic Four shared colours and the stretch-arm FX.
import './magneto.js'; // evaluation order: runs after heroes/magneto.js
import { beams } from '../render/fx.js';

// ================= Fantastic Four =================
export const F4C=[150,196,232], SUEC=[170,225,255], FC=[255,150,40], TC=[230,140,70];
// Reed's arm drawn as a stretched band of suit blue
export function stretchFx(x0,y0,x1,y1,life=4){beams.push({x0,y0,x1,y1,life,w:2,c:[150,196,232],g:[40,70,120]});}
