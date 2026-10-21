// Ability system, part 2 (2026-10-21):
//  - Status effects on enemies (e.st): burn, wet, shock, chill, mark, stun. Fire blasts and burning
//    cells burn, water wets, lightning shocks, the cold chills; marked enemies take +50%.
//  - Combos, the payoff for mixing heroes' elements:
//      SHATTER      a heavy hit (>= 15) on a frozen enemy: +150%, ice bursts, the freeze ends
//      ELECTROCUTED shock on a wet enemy: +25, stunned, the current jumps to every wet enemy near it
//      THERMAL SHOCK fire on a frozen or chilled enemy: +30 and a burst of steam
//      WILDFIRE     shock on a burning enemy: the flames flare into a small blast
//  - Ultimate meter (ST.ult, 0-100): fills with damage the hero deals and kills; G fires the hero's
//    ultimate power for free (one per hero, pw.ult). Ultimates cost no energy, they cost the meter.
//  - Summons (summons[]): allies and constructs that live for a while: {x,y,life,upd(s),draw(s)}.
//  - Power kinds for the HUD (powerKind): tap / hold / move / ult.
// Damage is tagged through ST.dmgTag ('fire' | 'shock' | 'ice' | null) by the code that deals it.
import { ST } from '../state.js';
import { FIRE, GFIRE, LAVA, R, SNOW, WATER, ICE, rgb } from '../world/materials.js';
import { H, W, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { snd } from '../sfx.js';

export const summons=[];
const ST0=()=>({burn:0,wet:0,shock:0,chill:0,mark:0,stun:0});
export const stOf=e=>e.st||(e.st=ST0());
export function applyStatus(e,k,d){if(!e||e.hp<=0||e.host)return;const s=stOf(e);
  if(k==='burn'&&s.wet>0){s.wet=Math.max(0,s.wet-d);if(R()<.3)spawn(e.x,e.y-e.def.h/2,(R()-.5),-1,rgb(220,230,240),20,0,0,0,1);return;} // wet things don't catch
  if(k==='wet'&&s.burn>0)s.burn=0;
  if(k==='chill'){s.chill=Math.min(240,s.chill+d);if(s.chill>=200&&!e.def.titan){e.frozen=Math.max(e.frozen||0,90);s.chill=0;fxWord(e.x,e.y-e.def.h/2-8,'FROZEN!',.8,'#bfe3ff',true);}return;}
  s[k]=Math.max(s[k],d);}
// called from hitEnemy (enemies/core.js) through ST.hitHook: returns the damage to deal
function onHit(e,dmg){
  const s=stOf(e),player=ST.pctx,tag=ST.dmgTag||(ST.zapF===ST.frame&&Math.hypot(ST.zapX-e.x,ST.zapY-e.y)<20?'shock':null);let d=dmg,word=null,wc='#ffc93c';
  if(s.mark>0)d*=1.5;
  if(player&&ST.buffT>ST.frame)d*=1.3; // Captain America's rally
  if(!e.def.titan&&e.frozen>0&&!(s.stun>0)&&dmg>=15&&tag!=='ice'){d+=dmg*1.5;e.frozen=0;word='SHATTER!';wc='#bfe3ff';snd('glass',e.x,e.y,{v:.8});
    for(let k=0;k<24;k++){const a=R()*6.283,sp=1+R()*3;spawn(e.x,e.y,Math.cos(a)*sp,Math.sin(a)*sp-1,R()<.5?rgb(210,240,255):rgb(150,210,250),40,0,1,1);}}
  if(tag==='shock'){if(s.wet>0){d+=25;s.wet=0;s.stun=40;word='ELECTROCUTED!';wc='#9fd8ff';chain(e);}else if(s.burn>0){d+=18;s.burn=0;word='WILDFIRE!';wc='#ff9a3c';ST.blastQ.push([e.x,e.y]);}s.shock=Math.max(s.shock,30);}
  if(tag==='fire'){if(e.frozen>0||s.chill>60){d+=30;e.frozen=0;s.chill=0;word='THERMAL SHOCK!';wc='#ffd2a0';for(let k=0;k<20;k++)spawn(e.x+(R()-.5)*e.def.w,e.y,(R()-.5)*2,-1-R()*2,rgb(230,236,244),60,0,0,0,1);}else applyStatus(e,'burn',180);}
  if(tag==='ice')applyStatus(e,'chill',60);
  if(word&&ST.frame-(e.comboT||-99)>12){e.comboT=ST.frame;fxWord(e.x,e.y-e.def.h/2-10,word,1.1,wc,true);ST.hitstop=Math.max(ST.hitstop,2);if(player)gainUlt(6);}
  if(player)gainUlt(d/(e.def.titan?40:22));
  return d;}
function chain(src){let n=0;for(const o of ST.enemyList()){if(o===src||o.hp<=0||n>=5)continue;const so=stOf(o);if(so.wet<=0||Math.hypot(o.x-src.x,o.y-src.y)>70)continue;n++;so.wet=0;so.stun=30;
  beams.push({pts:[[src.x,src.y],[(src.x+o.x)/2+(R()-.5)*12,(src.y+o.y)/2+(R()-.5)*12],[o.x,o.y]],life:6,c:[220,240,255],g:[90,160,255]});o.hp-=18;o.flash=5;}}
// per tick for every enemy (enemies/core.js through ST.statusTick)
function tickStatus(e){const s=e.st;const X=e.x|0,Y=e.y|0;
  if(X>=0&&X<W&&Y>=0&&Y<H){const m=t[Y*W+X];if(m===WATER)applyStatus(e,'wet',240);else if(m===FIRE||m===GFIRE||m===LAVA)applyStatus(e,'burn',120);else if(m===ICE||m===SNOW)applyStatus(e,'chill',2);}
  if(!s)return;
  if(s.burn>0){s.burn--;if(!e.def.titan||ST.frame%2===0)e.hp-=.12;if(R()<.5)spawn(e.x+(R()-.5)*e.def.w,e.y-e.def.h/2+R()*e.def.h,(R()-.5)*.4,-.8-R(),R()<.5?rgb(255,200,80):rgb(255,100,30),14,0,1,0,1);}
  if(s.wet>0){s.wet--;if(R()<.15)spawn(e.x+(R()-.5)*e.def.w,e.y+e.def.h/2,0,.5,rgb(90,140,230),20,0,0,1);}
  if(s.shock>0){s.shock--;if(R()<.25)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*2,(R()-.5)*2,rgb(200,230,255),6,0,1,0,1);}
  if(s.chill>0){s.chill--;e.vx*=.9;if(R()<.1)spawn(e.x+(R()-.5)*e.def.w,e.y,(R()-.5)*.3,-.2,rgb(220,240,255),14,0,1,0,1);}
  if(s.stun>0){s.stun--;if(!e.def.titan)e.frozen=Math.max(e.frozen||0,2);if(ST.frame%8===0)spawn(e.x+(R()-.5)*8,e.y-e.def.h/2-3,0,-.3,rgb(255,240,120),12,0,1,0,1);}
  if(s.mark>0)s.mark--;}
export function drawStatus(pix,enemies){for(const e of enemies){const s=e.st;if(!s||!(s.mark>0))continue;const r=Math.max(e.def.w,e.def.h)/2+4,c=(ST.frame>>2)&1?rgb(255,60,60):rgb(255,200,80);
  for(let k=0;k<16;k++){if(k%4===3)continue;const a=k/16*6.283+ST.frame*.05;pix(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,c,c);}pix(e.x,e.y-r-2,c,c);pix(e.x,e.y+r+2,c,c);}}
// ---- ultimate meter
ST.ult=0;ST.ultT=0;
export function gainUlt(v){if(!(v>0))return;const was=ST.ult;ST.ult=Math.min(100,ST.ult+v);if(was<100&&ST.ult>=100){fxWord(ST.camX+240,ST.camY+60,'ULTIMATE READY · G',1.2,'#ffc93c',true);snd('charge',ST.camX+240,ST.camY+130,{pitch:1.6,v:.6});}}
// the one ultimate per hero (by power name); new heroes set pw.ult themselves
export const ULTS={doom:'Orbital Strike',hulk:'Worldbreaker',thor:'God Blast',iron:'Proton Cannon',wolverine:'Berserker Barrage',cyclops:'Uncontrolled Blast',iceman:'Absolute Zero',jean:'Phoenix Force',
  spidey:'Maximum Spider',wanda:'Chaos Unleashed',strange:'Seraphim Disc',antman:'Keychain Tank',juggernaut:'Juggernaut Smash',ultron:'Annihilation Sweep',magneto:'Asteroid M',storm:'Eye of the Storm',
  venom:'We Are Venom',reed:'Negative Zone Rift',sue:'Force Nova',torch:'Supernova',thing:"It's Clobberin' Time!",panther:"Bast's Wrath",cap:'Avengers Assemble',marvel:'Binary Supernova',
  surfer:'Sentinel of the Spaceways',rider:'Judgement',pool:'Deadpool Corps'};
export function markUlt(CH){const u=ULTS[CH.id];for(const pw of CH.powers){if(u&&pw.n===u)pw.ult=true;}}
// what the HUD shows for a power: 'ult', 'move' (steers the hero), 'hold' (no cooldown: hold the button) or 'tap'
export function powerKind(pw){if(pw.ult)return'ult';if(pw.tk)return'hold';if(pw.kind)return pw.kind;const s=String(pw.fn);if(/p\.script=2|scriptMove|p\.slam=true/.test(s))return'move';if(!/ST\.cd=/.test(s))return'hold';return'tap';}
// ---- summons: allies and constructs that act on their own for a while
export function updSummons(){for(let n=summons.length-1;n>=0;n--){const s=summons[n];s.t=(s.t||0)+1;if(s.upd&&s.upd(s)===false||--s.life<=0){if(s.end)s.end(s);summons.splice(n,1);}}}
export function drawSummons(){for(const s of summons)if(s.draw)s.draw(s);}
// ---- HUD: the ultimate bar under the energy bar
{const hc=document.querySelector('#hud .hcol');if(hc&&!document.getElementById('ult')){const b=document.createElement('div');b.className='bar ulb';b.innerHTML='<div id="ult"></div><b id="ultK">G ULT</b>';hc.appendChild(b);}}
export function hudUlt(){const el=document.getElementById('ult');if(!el)return;const w=Math.round(ST.ult)+'%';if(el.style.width!==w)el.style.width=w;el.parentNode.classList.toggle('ready',ST.ult>=100);}
ST.hitHook=onHit;ST.gainUlt=gainUlt;ST.statusTick=tickStatus;ST.blastQ=[];ST.dmgTag=null;
