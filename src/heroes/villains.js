// Helpers shared by the playable villains (and their boss versions in enemies/bosses.js).
import './antman.js'; // evaluation order: runs after heroes/antman.js
import { ST } from '../state.js';
import { EMPTY, F, G, KIND, L, R, RUBBLE, S } from '../world/materials.js';
import { H, W, bg, bgB, bgD, col, setc, t } from '../world/grid.js';
import { q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { MP, spawn } from '../world/particles.js';
import { smashOverlap } from './powers.js';
import { solidCells } from './wave2.js';

// ================= villains, playable: Juggernaut, Ultron, Magneto =================
// The same moves drive the boss versions (see the boss definitions next to the enemies), so fighting them
// means facing their actual kit.
export function wallChunk(x,y,dir,r){const n=solidCells(x+dir*(r+4),y,r,false);return n>=16?makeBody(q,n,false):null;}
export function hurlBody(b,tx,ty,sp){const dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*sp;b.vy=dy/d*sp-1.5;b.va=(R()-.5)*.2;b.thrown=true;smashOverlap(b);}
export function crushAhead(x,y,dir,h,reach){for(let yy=y-h/2|0;yy<y+h/2;yy++)for(let k=1;k<=reach;k++){const X=x+dir*k|0;if(X<0||X>=W||yy<0||yy>=H-44)continue;const i=yy*W+X,m=t[i];if(m&&KIND[m]!==G&&KIND[m]!==F){if(ST.np<MP-300&&R()<.4)spawn(X,yy,dir*(1+R()*2),-R()*2,col[i],60,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}setc(i,EMPTY);}}}
