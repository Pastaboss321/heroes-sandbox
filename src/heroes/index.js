// Hero roster (CHARS), setChar and cast.
import { boxHit, hand, pl_ } from '../player.js';
import { vfxCast } from '../render/vfxcore.js';
import { ST } from '../state.js';
import { R } from '../world/materials.js';
import { spawn } from '../world/particles.js';
import { flash, fxWord, rings } from '../render/fx.js';
import { punchOut } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { TSL, aim } from './powers.js';
import { CHAR_DOOM } from './doom.js';
import { CHAR_HULK } from './hulk.js';
import { CHAR_THOR } from './thor.js';
import { CHAR_IRON } from './ironman.js';
import { CHAR_WOLVERINE } from './wolverine.js';
import { CHAR_CYCLOPS } from './cyclops.js';
import { CHAR_ICEMAN } from './iceman.js';
import { CHAR_JEAN } from './jean.js';
import { CHAR_STORM } from './storm.js';
import { RW } from './wave2.js';
import { CHAR_SPIDEY } from './spiderman.js';
import { CHAR_WANDA } from './wanda.js';
import { CHAR_STRANGE } from './strange.js';
import { CHAR_ANTMAN } from './antman.js';
import { CHAR_JUGGERNAUT } from './juggernaut.js';
import { CHAR_ULTRON } from './ultron.js';
import { CHAR_MAGNETO } from './magneto.js';
import { CHAR_REED } from './reed.js';
import { CHAR_SUE } from './sue.js';
import { CHAR_TORCH } from './torch.js';
import { CHAR_THING } from './thing.js';
import { CHAR_VENOM } from './venom.js';
import { CHAR_PANTHER } from './panther.js';
import { CHAR_CAP, CHAR_MARVEL, CHAR_SURFER } from './cosmic.js';
import { CHAR_POOL, CHAR_RIDER } from './wave4.js';
import { finalizeKits } from './kit.js';
import { ARTS } from '../art/index.js';
import { ANIM } from '../render/rig.js';
import { CHAR_HELA, CHAR_MOON, CHAR_SHANG, CHAR_THANOS } from './wave5.js';
import { CHAR_GAMBIT, CHAR_KURT, CHAR_MILES, CHAR_QUILL } from './wave6.js';
import { CHAR_KANG } from './kang.js';
import { aoeCost } from './aoe.js';
import { resetHeroTimers } from './abilities.js';
import { SPAWN } from './powers.js';
import { buildPowerBar, pwDiv } from '../ui/hud.js';
import { traitCast, traitCost, traitIntro, traitPre, traitUlt } from './traits.js';
import { CHAR_DAREDEVIL } from './daredevil.js';
import { CHAR_HAWKEYE } from './hawkeye.js';
import { CHAR_WIDOW } from './widow.js';
import { CHAR_IRONFIST } from './ironfist.js';
import { CHAR_NAMOR } from './namor.js';
import { CHAR_SANDMAN } from './sandman.js';
import { CHAR_GOBLIN } from './goblin.js';
import { CHAR_MYSTERIO } from './mysterio.js';

export const CHARS=[CHAR_DOOM,CHAR_HULK,CHAR_THOR,CHAR_IRON,CHAR_WOLVERINE,CHAR_CYCLOPS,CHAR_ICEMAN,CHAR_JEAN,CHAR_SPIDEY,CHAR_WANDA,CHAR_STRANGE,CHAR_ANTMAN,CHAR_JUGGERNAUT,CHAR_ULTRON,CHAR_MAGNETO,CHAR_STORM,CHAR_VENOM,CHAR_REED,CHAR_SUE,CHAR_TORCH,CHAR_THING,CHAR_PANTHER,CHAR_CAP,CHAR_MARVEL,CHAR_SURFER,CHAR_RIDER,CHAR_POOL,CHAR_THANOS,CHAR_HELA,CHAR_MOON,CHAR_SHANG,CHAR_GAMBIT,CHAR_KURT,CHAR_QUILL,CHAR_MILES,CHAR_KANG,
  CHAR_DAREDEVIL,CHAR_HAWKEYE,CHAR_WIDOW,CHAR_IRONFIST,CHAR_NAMOR,CHAR_SANDMAN,CHAR_GOBLIN,CHAR_MYSTERIO]; // the eight added in the 2026-11 overhaul, written with heroes/newkit.js
// // entries live in src/heroes/<hero>.js
// every hero's look comes from its art file (src/art/<id>.js): frames, palette and rig numbers. The body grew with
// the redraw (13x22 -> 16x26, big bodies 17x26 -> 22x30), so the hit box grows by the same 16%.
for(const c of CHARS){const A=ARTS[c.id];if(!A){console.warn('no art for',c.id);continue;}c.art=A;c.spr=A.spr;c.pal=A.pal;ANIM[c.id]=A.anim;c.pw=A.body==='big'?10:8;c.ph=Math.round(c.ph*1.16);}
finalizeKits(CHARS); // checks every kit and stamps HUD kind, signature effect and balance (heroes/kit.js)
ST.CH=CHARS[0];ST.SPR=ST.CH.spr;ST.SPC=ST.CH.pal;ST.SW=ST.SPR[0].length;ST.SH=ST.SPR.length;ST.PW=ST.CH.pw;ST.PH=ST.CH.ph;
export const HERO_UI={daredevil:'#a81820',hawkeye:'#7a3aa8',widow:'#2c2c38',ironfist:'#2e9a4a',namor:'#2a9a6a',sandman:'#b89858',goblin:'#7a2aa8',mysterio:'#3aa060',juggernaut:'#7a2a1e',ultron:'#8a909e',magneto:'#5a2470',spidey:'#c8282f',wanda:'#a8183a',strange:'#2a52a0',antman:'#8a1c1c',doom:'#2f8f4e',hulk:'#6aa84f',thor:'#3a6fd8',iron:'#c23a2b',wolverine:'#e8b21f',cyclops:'#1f3c8a',iceman:'#7cc8f0',jean:'#c42a3a',storm:'#2a2a33',venom:'#1c1c28',reed:'#4f86b8',sue:'#7fb2d8',torch:'#e8731f',thing:'#d0702c',panther:'#2a2236',cap:'#2c4aa0',marvel:'#c8282f',surfer:'#9aa4b8',rider:'#e8731f',pool:'#9a1c24',thanos:'#6a3c8a',hela:'#1f5a34',moon:'#d8dce6',shang:'#a82a2a',gambit:'#7a4a2c',kurt:'#2c3c8a',quill:'#8a2a22',miles:'#1a1a22',kang:'#4a2a86'};
export const HERO_DARK=new Set(['sandman','hulk','wolverine','iceman','sue','surfer','moon']);
export const MOVE_TAG={daredevil:'WALL-RUNS · RADAR SENSE',hawkeye:'TRICK ARROWS',widow:'CLOAK & GADGETS',ironfist:'CHARGES THE IRON FIST',namor:'RULES THE WATER',sandman:'IS THE SAND',goblin:'GLIDER & PUMPKIN BOMBS',mysterio:'ILLUSIONS',juggernaut:'UNSTOPPABLE',spidey:'WEB-SWINGS',antman:'SHRINKS & GROWS',hulk:'GAMMA LEAPS',wolverine:'CLIMBS WALLS',cyclops:'OPTIC THRUST',iceman:'ICE SLIDES',venom:'CRAWLS WALLS',reed:'STRETCHES',sue:'FORCE FIELDS',torch:'FLAME ON',thing:'ROCK SOLID',panther:'CUTS ANYTHING',cap:'SHIELD RICOCHETS',marvel:'BINARY FLIGHT',surfer:'RIDES THE BOARD',rider:'HELLFIRE CHAIN',pool:'KATANAS & JOKES',thanos:'INFINITY STONES',hela:'NECROSWORDS',moon:'CRESCENTS & GLIDE',shang:'TEN RINGS',gambit:'KINETIC CARDS',kurt:'TELEPORTS',quill:'JET BOOTS',miles:'VENOM & WEBS',kang:'CONQUERS TIME'};
export function setChar(i){
  const p=pl_, prevH=ST.PH, hpF=p.hp/ST.CH.hp;
  ST.CH=CHARS[(i+CHARS.length)%CHARS.length];p.hp=hpF*ST.CH.hp;ST.SZ=1;RW.length=0;ST.SPR=ST.CH.spr;ST.SPC=ST.CH.pal;ST.SW=ST.SPR[0].length;ST.SH=ST.SPR.length;ST.PW=ST.CH.pw;ST.PH=ST.CH.ph;
  if(!ST.CH.fly)p.fly=false;
  if(ST.held){ST.held.held=false;ST.held=null;}
  TSL.length=0;resetHeroTimers(p);Object.assign(p,{slip:null,wav:0,biomassT:0,bm:0,blob:false,blobA:null,size:1,sizeT:1,ant:0,web:null,sense:0,ceil:0,shell:0,surge:0,jcharge:0,script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,sprint:0,ang:0});
  traitIntro();ST.cur=0;ST.cd=0;buildPowerBar();
  if(boxHit(p.x,p.y))punchOut(p);
  rings.push({x:p.x,y:p.y-ST.PH/2,r:2,vr:2.5,life:16,c:ST.CH.glow},{x:p.x,y:p.y-ST.PH/2,r:12,vr:-.6,life:16,c:ST.CH.glow});flash(p.x,p.y-ST.PH/2,40,ST.CH.glow,10);
  for(let k=0;k<40;k++){const a=R()*6.283;spawn(p.x,p.y-ST.PH/2,Math.cos(a)*2,Math.sin(a)*2,ST.CH.thrust(),20,0,1,0,1);}
  const sel=document.getElementById('char');if(sel)sel.value=ST.CH.id;
  const bd=document.getElementById('badge');if(bd){bd.textContent=ST.CH.name[0];bd.style.background=HERO_UI[ST.CH.id]||'#2f8f4e';document.getElementById('hero').textContent=ST.CH.name.toUpperCase();}
}
export { cast, castUlt, selPowerHook, setSelHook } from './kit.js'; // the cast pipeline lives in heroes/kit.js
