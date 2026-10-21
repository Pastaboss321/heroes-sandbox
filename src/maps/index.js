// Map registry (MAPDEFS), map select and regen().
import { ambIncursion, genIncursion } from './incursion.js';
import { ST } from '../state.js';
import { GRASS, KIND, LEAF, S, cl, rgb } from '../world/materials.js';
import { H, N, W, bg, bgB, bgD, booms, col, t } from '../world/grid.js';
import { NAT, gnd, pin, rcount, rid, str, supportCheck, unq } from '../world/support.js';
import { applyTOD } from '../render/look.js';
import { genCity, noise2 } from './city.js';
import { genForest } from './forest.js';
import { genNYC } from './nyc.js';
import { amb2099, genNYC2099 } from './nyc2099.js';
import { genXMansion } from './xmansion.js';
import { ambSavage, genSavageLand } from './savage.js';
import { ambArctic, genArctic } from './arctic.js';
import { afters, beams, comics, flashes, rings } from '../render/fx.js';
import { drones, jets, pins, shots, strikes, therm, waves } from '../heroes/powers.js';
import { ACT } from '../heroes/xmen.js';
import { slide } from '../heroes/iceman.js';
import { RW, ants, gzones, limbo, portals, tramps } from '../heroes/wave2.js';
import { pl_, spawnPlayer } from '../player.js';
import { clearEnemies } from '../enemies/core.js';
import { ambRetro, genRetro } from './retro.js';
import { ambAsgard, genAsgard } from './asgard.js';
import { ambWakanda, genWakanda } from './wakanda.js';
import { ambSakaar, genSakaar } from './sakaar.js';
import { ambKnowhere, ambMoon, ambTitan, genKnowhere, genMoon, genTitan } from './space.js';
import { ambDark, genDark } from './dark.js';
import { setWorld } from '../world/grid.js';

export const mapSel=document.getElementById('map');
// w: world width (heroes are fast, so maps are long); grav: gravity multiplier; space: an off-world destination
export const MAPDEFS={city:{name:'City',gen:genCity,w:3600},nyc:{name:'New York',gen:genNYC,w:4000},nyc2099:{name:'NYC 2099',gen:genNYC2099,amb:amb2099,rain:true,w:4000},forest:{name:'Forest',gen:genForest,w:3200},xmansion:{name:'X-Mansion',gen:genXMansion,w:2400},
  retro:{name:'Earth-828 NYC',gen:genRetro,amb:ambRetro,w:3600},
  incursion:{name:'Incursion NYC',gen:genIncursion,amb:ambIncursion,w:3600},
  savage:{name:'Savage Land',gen:genSavageLand,amb:ambSavage,w:4000},arctic:{name:'Weapon X',gen:genArctic,amb:ambArctic,wind:true,w:3200},
  wakanda:{name:'Wakanda',gen:genWakanda,amb:ambWakanda,w:4400},
  asgard:{name:'Asgard',gen:genAsgard,amb:ambAsgard,w:4400,space:true},
  sakaar:{name:'Sakaar',gen:genSakaar,amb:ambSakaar,w:4000,space:true,grav:.9},
  knowhere:{name:'Knowhere',gen:genKnowhere,amb:ambKnowhere,w:3600,space:true,grav:.7},
  titan:{name:'Titan',gen:genTitan,amb:ambTitan,w:4000,space:true,grav:.85},
  moon:{name:'The Moon',gen:genMoon,amb:ambMoon,w:4400,space:true,grav:.4},
  dark:{name:'Dark Dimension',gen:genDark,amb:ambDark,w:3600,space:true,grav:.8}};
// the phone build keeps worlds shorter (memory)
export const mapW=d=>{const w=d.w||1600;return window.HS_MOBILE?Math.max(1600,Math.round(w*.55/32)*32):w;};
for(const id in MAPDEFS){const o=document.createElement('option');o.value=id;o.textContent=MAPDEFS[id].name;mapSel.appendChild(o);}
function shadeWorld(){
  for(let x=0;x<W;x++){let depth=-1;
    for(let y=0;y<H;y++){const i=y*W+x,m=t[i];
      if(KIND[m]===S&&NAT[m]){depth++;const n=noise2(x,y,3.1);let k=1-Math.min(.45,depth/240)+n*.07;
        if((((y+(n*14|0))>>3)%5)===0)k*=.9; // strata bands
        if(m===GRASS&&depth<2)k*=1.18;
        const c=col[i];col[i]=rgb(cl((c&255)*k),cl(((c>>8)&255)*k),cl(((c>>16)&255)*k));}
      else if(m===0||KIND[m]!==S)depth=-1;}}
}
let R0gen=1; // pieces registered at generation time have rid < R0gen (Wrecking Crew counts what is still standing)
export function countBuilt(){let n=0;for(let i=0;i<N;i++){const m=t[i];if(KIND[m]===S&&!NAT[m]&&m!==LEAF&&rid[i]>0&&rid[i]<R0gen)n++;}return n;}
export function regen(){
  ST.np=0;ACT.length=0;slide.length=0;shots.length=0;drones.length=0;strikes.length=0;ST.vortex=null;ST.held=null;ST.heldE=null;ST.storm=null;clearEnemies();
  ants.length=0;tramps.length=0;gzones.length=0;limbo.length=0;portals.a=portals.b=null;RW.length=0;
  pins.length=0;therm.length=0;jets.length=0;waves.length=0;comics.length=0;ST.impactF=0;ST.hurtV=0;ST.decoy=null;ST.stasis=null;ST.slowT=0;ST.heatZ=null;
  Object.assign(pl_,{script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,dodge:0,sprint:0,leap:false,slam:false});ST.wave=0;ST.SPAWNX=50;booms.length=0;rings.length=0;flashes.length=0;beams.length=0;afters.length=0;
  const def=MAPDEFS[mapSel.value]||MAPDEFS.city;setWorld(mapW(def),def.h||640);ST.gk=def.grav||1;
  pin.fill(0);str.fill(10);rid.fill(0);rcount.length=1;ST.PIN2=null;ST.genMode=true;def.gen();ST.genMode=false;
  for(let i=0;i<N;i++)bgB[i]=bg[i]!==bgD[i]?1:0;
  // streets, decks and tunnel shells: built runs wider than any building act as ground, so buildings stand on them
  for(let i=0;i<N;i++)gnd[i]=NAT[t[i]];
  for(let y=0;y<H;y++){let a=0;for(let x=0;x<=W;x++){const ok=x<W&&KIND[t[y*W+x]]===S&&!NAT[t[y*W+x]]&&t[y*W+x]!==LEAF;if(ok)continue;if(x-a>200)for(let k=a;k<x;k++)gnd[y*W+k]=1;a=x+1;}}
  // drop generated specks: solid pixels with no solid neighbour would just hang in the air
  for(let i=W;i<N-W;i++){if(KIND[t[i]]!==S)continue;if(KIND[t[i-1]]!==S&&KIND[t[i+1]]!==S&&KIND[t[i-W]]!==S&&KIND[t[i+W]]!==S)t[i]=0;}
  shadeWorld();
  // generated floaters: specks vanish, bigger pieces drop as soon as play starts (anchor pass)
  unq.length=0;
  ST.nxt.fill(1);
  ST.dx0=0;ST.dy0=0;ST.dx1=W-1;ST.dy1=H-1;supportCheck(true);
  ST.dx0=0;ST.dy0=0;ST.dx1=W-1;ST.dy1=H-1; // whole map gets one runtime pass on the first tick: anything left floating falls
  R0gen=rcount.length;
  ST.T0=t.slice();ST.C0=col.slice();ST.B0=bg.slice(); // the untouched map, for Scarlet Witch's Reweave
  applyTOD();
  spawnPlayer();
}
document.getElementById('regen').onclick=e=>{regen();e.target.blur();};
mapSel.onchange=()=>{regen();mapSel.blur();};
