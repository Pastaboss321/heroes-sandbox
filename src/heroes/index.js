// Hero roster (CHARS), setChar and cast.
import { boxHit, pl_ } from '../player.js';
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
import { applyKits } from './kits2b.js';
import { CHAR_HELA, CHAR_MOON, CHAR_SHANG, CHAR_THANOS } from './wave5.js';
import { CHAR_GAMBIT, CHAR_KURT, CHAR_MILES, CHAR_QUILL } from './wave6.js';
import { aoeCost } from './aoe.js';
import { markUlt } from './abilities.js';
import { SPAWN } from './powers.js';
import { buildPowerBar, pwDiv } from '../ui/hud.js';

export const CHARS=[CHAR_DOOM,CHAR_HULK,CHAR_THOR,CHAR_IRON,CHAR_WOLVERINE,CHAR_CYCLOPS,CHAR_ICEMAN,CHAR_JEAN,CHAR_SPIDEY,CHAR_WANDA,CHAR_STRANGE,CHAR_ANTMAN,CHAR_JUGGERNAUT,CHAR_ULTRON,CHAR_MAGNETO,CHAR_STORM,CHAR_VENOM,CHAR_REED,CHAR_SUE,CHAR_TORCH,CHAR_THING,CHAR_PANTHER,CHAR_CAP,CHAR_MARVEL,CHAR_SURFER,CHAR_RIDER,CHAR_POOL,CHAR_THANOS,CHAR_HELA,CHAR_MOON,CHAR_SHANG,CHAR_GAMBIT,CHAR_KURT,CHAR_QUILL,CHAR_MILES]; // entries live in src/heroes/<hero>.js
applyKits(CHARS); // reworked and new powers (heroes/kits2a.js, kits2b.js)
ST.CH=CHARS[0];
export const HERO_UI={juggernaut:'#7a2a1e',ultron:'#8a909e',magneto:'#5a2470',spidey:'#c8282f',wanda:'#a8183a',strange:'#2a52a0',antman:'#8a1c1c',doom:'#2f8f4e',hulk:'#6aa84f',thor:'#3a6fd8',iron:'#c23a2b',wolverine:'#e8b21f',cyclops:'#1f3c8a',iceman:'#7cc8f0',jean:'#c42a3a',storm:'#2a2a33',venom:'#1c1c28',reed:'#4f86b8',sue:'#7fb2d8',torch:'#e8731f',thing:'#d0702c',panther:'#2a2236',cap:'#2c4aa0',marvel:'#c8282f',surfer:'#9aa4b8',rider:'#e8731f',pool:'#9a1c24',thanos:'#6a3c8a',hela:'#1f5a34',moon:'#d8dce6',shang:'#a82a2a',gambit:'#7a4a2c',kurt:'#2c3c8a',quill:'#8a2a22',miles:'#1a1a22'};
export const HERO_DARK=new Set(['hulk','wolverine','iceman','sue','surfer','moon']);
export const MOVE_TAG={juggernaut:'UNSTOPPABLE',spidey:'WEB-SWINGS',antman:'SHRINKS & GROWS',hulk:'GAMMA LEAPS',wolverine:'CLIMBS WALLS',cyclops:'OPTIC THRUST',iceman:'ICE SLIDES',venom:'CRAWLS WALLS',reed:'STRETCHES',sue:'FORCE FIELDS',torch:'FLAME ON',thing:'ROCK SOLID',panther:'CUTS ANYTHING',cap:'SHIELD RICOCHETS',marvel:'BINARY FLIGHT',surfer:'RIDES THE BOARD',rider:'HELLFIRE CHAIN',pool:'KATANAS & JOKES',thanos:'INFINITY STONES',hela:'NECROSWORDS',moon:'CRESCENTS & GLIDE',shang:'TEN RINGS',gambit:'KINETIC CARDS',kurt:'TELEPORTS',quill:'JET BOOTS',miles:'VENOM & WEBS'};
export function setChar(i){
  const p=pl_, prevH=ST.PH, hpF=p.hp/ST.CH.hp;
  ST.CH=CHARS[(i+CHARS.length)%CHARS.length];p.hp=hpF*ST.CH.hp;ST.SZ=1;RW.length=0;ST.SPR=ST.CH.spr;ST.SPC=ST.CH.pal;ST.SW=ST.SPR[0].length;ST.SH=ST.SPR.length;ST.PW=ST.CH.pw;ST.PH=ST.CH.ph;
  if(!ST.CH.fly)p.fly=false;
  if(ST.held){ST.held.held=false;ST.held=null;}
  TSL.length=0;Object.assign(p,{slip:null,wav:0,biomassT:0,bm:0,blob:false,blobA:null,size:1,sizeT:1,ant:0,web:null,sense:0,ceil:0,shell:0,surge:0,jcharge:0,script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,sprint:0,ang:0});
  markUlt(ST.CH);ST.cur=0;ST.cd=0;buildPowerBar();
  if(boxHit(p.x,p.y))punchOut(p);
  rings.push({x:p.x,y:p.y-ST.PH/2,r:2,vr:2.5,life:16,c:ST.CH.glow},{x:p.x,y:p.y-ST.PH/2,r:12,vr:-.6,life:16,c:ST.CH.glow});flash(p.x,p.y-ST.PH/2,40,ST.CH.glow,10);
  for(let k=0;k<40;k++){const a=R()*6.283;spawn(p.x,p.y-ST.PH/2,Math.cos(a)*2,Math.sin(a)*2,ST.CH.thrust(),20,0,1,0,1);}
  const sel=document.getElementById('char');if(sel)sel.value=ST.CH.id;
  const bd=document.getElementById('badge');if(bd){bd.textContent=ST.CH.name[0];bd.style.background=HERO_UI[ST.CH.id]||'#2f8f4e';document.getElementById('hero').textContent=ST.CH.name.toUpperCase();}
}
let ultCine=0;
// G: fire the hero's ultimate whatever power is selected
export function castUlt(){const i=ST.CH.powers.findIndex(pw=>pw.ult);if(i<0)return;const k=ST.cur;ST.cur=i;ST.cd=0;cast();if(!(ST.ultT>0))ST.cur=k;else selPowerHook(i);}
export let selPowerHook=()=>{};export const setSelHook=f=>{selPowerHook=f;};
export function cast(){
  const p=pl_;if(ST.cd>0||p.script>0)return;const pw=ST.CH.powers[ST.cur];if(!pw||pw.tk)return;const a=aim();if(!p.fly||Math.abs(p.vx)<.5)p.face=a.dx<0?-1:1;
  if(p.stealth>0&&pw.n!=='Stealth Mode'&&pw.n!=='Energy Shield'){p.stealth=0;fxWord(p.x,p.y-ST.PH-6,'DECLOAK',.7,'#bfe3ff',true);}
  let denied=false;const ck=aoeCost();let use=c=>{c*=ck;if(p.en<c){denied=true;return false;}p.en-=c;return true;};
  if(pw.ult){ // ultimates cost the meter, not energy (heroes/abilities.js)
    if(!(ST.ultT>0)){if(ST.ult<100&&!SPAWN.inf){if(ST.frame-(p.denyT||-99)>30){p.denyT=ST.frame;fxWord(p.x,p.y-ST.PH-8,'ULTIMATE '+(ST.ult|0)+'%',.8,'#ffc93c',true);snd('deny',p.x,p.y,{v:.5});}return;}
      ST.ult=0;ST.ultT=200;ST.hitstop=Math.max(ST.hitstop,6);fxWord(p.x,p.y-ST.PH-18,pw.n.toUpperCase()+'!',1.7,'#ffc93c',true);snd('charge',p.x,p.y,{pitch:.5,v:1});
      document.body.classList.add('cine');clearTimeout(ultCine);ultCine=setTimeout(()=>document.body.classList.remove('cine'),1500);}
    use=()=>true;}
  const c0=ST.cd;pw.fn(a,p,use);p.castF=12;if(ST.cd>c0)p.recoilF=6;
  if(pw.ult&&ST.cd>c0)ST.ultT=0; // a one-shot ultimate is spent; a held one keeps going for a few seconds
  if(denied&&ST.frame-(p.denyT||-99)>20){p.denyT=ST.frame;snd('deny',p.x,p.y,{v:.6});const d=pwDiv.children[ST.cur];if(d){d.classList.remove('deny');void d.offsetWidth;d.classList.add('deny');}}
  if(ST.cd>c0)ST.cdMax=ST.cd;
}
