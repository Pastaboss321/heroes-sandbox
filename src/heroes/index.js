// Hero roster (CHARS), setChar and cast.
import { boxHit, pl_ } from '../player.js';
import { ST } from '../state.js';
import { R } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { flash, fxWord, rings } from '../render/fx.js';
import { punchOut } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { aim } from './powers.js';
import { CHAR_DOOM } from './doom.js';
import { CHAR_HULK } from './hulk.js';
import { CHAR_THOR } from './thor.js';
import { CHAR_IRON } from './ironman.js';
import { CHAR_WOLVERINE } from './wolverine.js';
import { CHAR_CYCLOPS } from './cyclops.js';
import { CHAR_ICEMAN } from './iceman.js';
import { CHAR_JEAN } from './jean.js';
import { CHAR_STORM } from './storm.js';
import { buildPowerBar, pwDiv } from '../ui/hud.js';


export const CHARS=[CHAR_DOOM,CHAR_HULK,CHAR_THOR,CHAR_IRON,CHAR_WOLVERINE,CHAR_CYCLOPS,CHAR_ICEMAN,CHAR_JEAN,CHAR_STORM]; // entries live in src/heroes/<hero>.js

ST.CH=CHARS[0];

export const HERO_UI={doom:'#2f8f4e',hulk:'#6aa84f',thor:'#3a6fd8',iron:'#c23a2b',wolverine:'#e8b21f',cyclops:'#1f3c8a',iceman:'#7cc8f0',jean:'#c42a3a',storm:'#2a2a33'};

export const HERO_DARK=new Set(['hulk','wolverine','iceman']);

export const MOVE_TAG={hulk:'GAMMA LEAPS',wolverine:'CLIMBS WALLS',cyclops:'OPTIC THRUST',iceman:'ICE SLIDES'};

export function setChar(i){
  const p=pl_, prevH=ST.PH, hpF=p.hp/ST.CH.hp;
  ST.CH=CHARS[(i+CHARS.length)%CHARS.length];p.hp=hpF*ST.CH.hp;ST.SPR=ST.CH.spr;ST.SPC=ST.CH.pal;ST.SW=ST.SPR[0].length;ST.SH=ST.SPR.length;ST.PW=ST.CH.pw;ST.PH=ST.CH.ph;
  if(!ST.CH.fly)p.fly=false;
  if(ST.held){ST.held.held=false;ST.held=null;}
  Object.assign(p,{script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,sprint:0,ang:0});
  ST.cur=0;ST.cd=0;buildPowerBar();
  if(boxHit(p.x,p.y))punchOut(p);
  rings.push({x:p.x,y:p.y-ST.PH/2,r:2,vr:2.5,life:16,c:ST.CH.glow},{x:p.x,y:p.y-ST.PH/2,r:12,vr:-.6,life:16,c:ST.CH.glow});flash(p.x,p.y-ST.PH/2,40,ST.CH.glow,10);
  for(let k=0;k<40;k++){const a=R()*6.283;spawn(p.x,p.y-ST.PH/2,Math.cos(a)*2,Math.sin(a)*2,ST.CH.thrust(),20,0,1,0,1);}
  const sel=document.getElementById('char');if(sel)sel.value=ST.CH.id;
  const bd=document.getElementById('badge');if(bd){bd.textContent=ST.CH.name[0];bd.style.background=HERO_UI[ST.CH.id]||'#2f8f4e';document.getElementById('hero').textContent=ST.CH.name.toUpperCase();}
}

export function cast(){
  const p=pl_;if(ST.cd>0||p.script>0)return;const pw=ST.CH.powers[ST.cur];if(!pw||pw.tk)return;const a=aim();if(!p.fly||Math.abs(p.vx)<.5)p.face=a.dx<0?-1:1;
  if(p.stealth>0&&pw.n!=='Stealth Mode'&&pw.n!=='Energy Shield'){p.stealth=0;fxWord(p.x,p.y-ST.PH-6,'DECLOAK',.7,'#bfe3ff',true);}
  let denied=false;const use=c=>{if(p.en<c){denied=true;return false;}p.en-=c;return true;};
  const c0=ST.cd;pw.fn(a,p,use);p.castF=12;if(ST.cd>c0)p.recoilF=6;
  if(denied&&ST.frame-(p.denyT||-99)>20){p.denyT=ST.frame;snd('deny',p.x,p.y,{v:.6});const d=pwDiv.children[ST.cur];if(d){d.classList.remove('deny');void d.offsetWidth;d.classList.add('deny');}}
  if(ST.cd>c0)ST.cdMax=ST.cd;
}
