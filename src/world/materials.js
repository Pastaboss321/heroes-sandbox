// Material table (MATS), material ids and per-material lookup arrays; colour helpers rgb/cl/mkcol and R = Math.random.
import '../state.js'; // evaluation order: runs after state.js


// ================= materials =================
export const E=0,P=1,L=2,G=3,S=4,F=5;

export const MATS=[
  // name, kind, density, flammability, hardness, r,g,b, variation
  ['empty',   E,0, 0,  0, 0,0,0,0],
  ['sand',    P,15,0,  1, 214,186,118,14],
  ['dirt',    S,20,0,  2, 104,72,44,12],
  ['stone',   S,30,0,  6, 104,104,112,10],
  ['concrete',S,25,0,  4, 150,148,142,8],
  ['steel',   S,40,0,  7, 118,128,142,6],
  ['glass',   S,22,0,  1, 150,205,225,10],
  ['wood',    S,8, .05,2, 118,78,40,10],
  ['leaves',  S,3, .25,1, 46,124,44,18],
  ['grass',   S,3, .2, 1, 70,160,52,16],
  ['water',   L,10,0,  0, 40,90,200,8],
  ['oil',     L,8, .4, 0, 50,38,30,5],
  ['acid',    L,11,0,  0, 120,230,40,15],
  ['lava',    L,14,0,  0, 240,90,20,15],
  ['fire',    F,0, 0,  0, 255,140,30,0],
  ['smoke',   G,1, 0,  0, 60,60,62,8],
  ['steam',   G,1, 0,  0, 190,200,210,10],
  ['ash',     P,5, 0,  0, 80,78,76,10],
  ['ember',   P,6, 0,  0, 255,120,30,0],
  ['greenfire',F,0,0,  0, 60,255,90,0],
  ['rubble',  P,18,0,  1, 120,120,120,10],
  ['propane', G,2, 1,  0, 150,170,120,6],
  ['obsidian',S,32,0,  7, 40,30,48,8],
  ['neon',    S,20,0,  1, 255,60,220,30],
  ['ice',     S,9, 0,  2, 186,228,250,14],
  ['snow',    P,4, 0,  0, 236,242,250,6],
];

export const EMPTY=0,SAND=1,DIRT=2,STONE=3,CONC=4,STEEL=5,GLASS=6,WOOD=7,LEAF=8,GRASS=9,WATER=10,OIL=11,ACID=12,LAVA=13,FIRE=14,SMOKE=15,STEAM=16,ASH=17,EMBER=18,GFIRE=19,RUBBLE=20,PROPANE=21,OBSID=22,NEON=23,ICE=24,SNOW=25;

export const NM=MATS.length;

export const KIND=new Uint8Array(NM),DENS=new Uint8Array(NM),FLAM=new Float32Array(NM),HARD=new Uint8Array(NM);

MATS.forEach((m,i)=>{KIND[i]=m[1];DENS[i]=m[2];FLAM[i]=m[3];HARD[i]=m[4];});

export const rgb=(r,g,b)=>((255<<24)|((b&255)<<16)|((g&255)<<8)|(r&255))>>>0;

export const cl=v=>v<0?0:v>255?255:v|0;

export function mkcol(m){const d=MATS[m];const v=(Math.random()*2-1)*d[8];return rgb(cl(d[5]+v),cl(d[6]+v),cl(d[7]+v));}

export const R=Math.random;
