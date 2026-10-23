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
import { ambXMansion, genXMansion } from './xmansion.js';
import { ambSavage, genSavageLand } from './savage.js';
import { ambArctic, genArctic } from './arctic.js';
import { afters, beams, comics, flashes, rings } from '../render/fx.js';
import { clearVfx } from '../render/vfxcore.js';
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
import { detailPass } from './detail.js';

export const mapSel=document.getElementById('map');
// w: world width (heroes are fast, so maps are long); h: height (default 720: deep underground, and the
// urban maps sit their street lower for taller skylines, ST.GYO); grav: gravity multiplier; space: off-world
export const MAPDEFS={city:{name:'City',theme:'urban',gen:genCity,w:7200},nyc:{name:'New York',theme:'urban',gen:genNYC,w:8000},nyc2099:{name:'NYC 2099',theme:'urban',gen:genNYC2099,amb:amb2099,rain:true,w:8000},forest:{name:'Forest',theme:'nature',gen:genForest,w:6400},xmansion:{name:'X-Mansion',theme:'estate',gen:genXMansion,amb:ambXMansion,w:4800},
  retro:{name:'Earth-828 NYC',theme:'urban',gen:genRetro,amb:ambRetro,w:7200},
  incursion:{name:'Incursion NYC',theme:'urban',gen:genIncursion,amb:ambIncursion,w:7200},
  savage:{name:'Savage Land',theme:'nature',gen:genSavageLand,amb:ambSavage,w:8000},arctic:{name:'Weapon X',theme:'snow',gen:genArctic,amb:ambArctic,wind:true,w:6400},
  wakanda:{name:'Wakanda',theme:'wakanda',gen:genWakanda,amb:ambWakanda,w:8000},
  asgard:{name:'Asgard',theme:'realm',gen:genAsgard,amb:ambAsgard,w:8000,space:true},
  sakaar:{name:'Sakaar',theme:'junk',gen:genSakaar,amb:ambSakaar,w:7200,space:true,grav:.9},
  knowhere:{name:'Knowhere',theme:'mine',gen:genKnowhere,amb:ambKnowhere,w:6400,space:true,grav:.7},
  titan:{name:'Titan',theme:'ruin',gen:genTitan,amb:ambTitan,w:7200,space:true,grav:.85},
  moon:{name:'The Moon',theme:'moon',gen:genMoon,amb:ambMoon,w:8000,space:true,grav:.4},
  dark:{name:'Dark Dimension',theme:'hell',gen:genDark,amb:ambDark,w:6400,space:true,grav:.8}};
// the phone build keeps worlds shorter (memory)
export const mapW=d=>{const w=d.w||1600;return window.HS_MOBILE?Math.max(1600,Math.round(w*.36/32)*32):w;};
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
  Object.assign(pl_,{script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,dodge:0,sprint:0,leap:false,slam:false});ST.wave=0;ST.SPAWNX=50;ST.dark=0;ST.mindT=0;ST.chain=null;booms.length=0;rings.length=0;clearVfx();flashes.length=0;beams.length=0;afters.length=0;
  const def=MAPDEFS[mapSel.value]||MAPDEFS.city;setWorld(mapW(def),def.h||720);ST.gk=def.grav||1;ST.GYO=H-640; // extra rows: urban maps drop their street by this for taller skylines
  pin.fill(0);str.fill(10);rid.fill(0);rcount.length=1;ST.PIN2=null;ST.streetY=0;ST.neonCity=mapSel.value==='nyc2099';ST.genMode=true;def.gen();detailPass(def.theme);ST.genMode=false; // props, interiors and caves (maps/detail.js)
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
  ST.dfar=[];ST.dx0=0;ST.dy0=0;ST.dx1=W-1;ST.dy1=H-1;supportCheck(true);
  // whole map gets one runtime pass: anything left floating falls. Done here behind the loading card
  // (~100 ms on the long maps) rather than as a hitch on the first play tick.
  ST.dx0=0;ST.dy0=0;ST.dx1=W-1;ST.dy1=H-1;supportCheck(false);
  R0gen=rcount.length;
  ST.T0=t.slice();ST.C0=col.slice();ST.B0=bg.slice(); // the untouched map, for Scarlet Witch's Reweave
  applyTOD();
  spawnPlayer();
}
document.getElementById('regen').onclick=e=>{regen();e.target.blur();};
mapSel.onchange=()=>{regen();mapSel.blur();};
