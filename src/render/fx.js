// VFX lists (rings, flashes, beams) and comic FX (sound words, bursts, impact frames).
import '../world/particles.js'; // evaluation order: runs after world/particles.js
import { ST } from '../state.js';
import { R } from '../world/materials.js';
import { SET } from './look.js';
import { snd } from '../sfx.js';



// ================= VFX lists =================
// shake: shared state (ST in state.js)

export const rings=[], flashes=[], beams=[], afters=[];

export function flash(x,y,r,c,life=6){flashes.push({x,y,r,c,life,max:life});}


// ================= comic fx: sound words, bursts, focus lines, impact frames =================
export const comics=[];
 let lastWord=-99;

const WORDS_S=['BLAM!','POW!','BANG!','KRAK!'],WORDS_M=['BOOM!','KA-BLAM!','KRAKOOM!','WHAMM!'],WORDS_L=['KA-BOOOM!','KRAKA-DOOM!','KABLOOEY!'];

// comic sound words double as the sound design: each onomatopoeia triggers the matching effect
const WORD_SND=[[/SNIKT|SHKK|SKRITCH|SHKRAKK|SHINK/,'snikt'],[/RAA+R?GH|R+A+G+H|HULK SMASH|HRRAAGH|PUNY/,'roar'],[/SKREE/,'screech'],[/WHOO|FWOO|WHHOO|WHOOSH/,'wind'],
  [/VWOOOM|VWAMM|VREEE|HNNN|RRRMM|GRRKK|MINE NOW|STASIS/,'psi'],[/KLANNNG|KA-CHUNK|KLONK|CLANK/,'clang'],[/BZZZT|KZZZRRT|ZZRAK|ZZZAP|FZZZT|ZZAAAK|ZWIP|PTANG|ZZT/,'zap'],[/CLAP/,'thud'],
  [/FFT-FFT|PEW/,'pop'],[/OVERLOAD|FULL POWER|VISOR OFF|ODINFORCE|MAX!|LOCKED/,'charge'],[/KRRSSHH|KRA-SHHH|TSING|SHRAKK|SHATTER|FSSHHK|KRRRK|FSSSHH|KRIK/,'ice'],
  [/RUMMMBLE|KRRRAAACK|RUMBLE|FAULT/,'crumble'],[/THOOM|STOMP/,'stomp'],[/GOTCHA|RRRIIP/,'rip'],[/YOINK|HUP!|HRK/,'throw'],[/\*SNIFF\*/,'whoosh'],[/EMP/,'emp'],[/SKRAKOOM|THOOOOM/,'boom']];

export function fxWord(x,y,text,size=1,c='#ffc93c',force,quiet){
  if(!quiet&&SET.sound)for(const [re,nm] of WORD_SND)if(re.test(text)){snd(nm,x,y,{v:Math.min(1,.5+size*.35),gap:.08});break;}
  if(!SET.words)return;if(!force&&ST.frame-lastWord<10)return;lastWord=ST.frame;
  if(comics.length>10)comics.shift();
  comics.push({k:'w',x,y,text,size,c,life:42,max:42,rot:(R()-.5)*.45});
}

export function fxBurst(x,y,r,c){if(comics.length>14)comics.shift();comics.push({k:'b',x,y,r,c:c||'#ffc93c',life:9,max:9,rot:R()*6.28});}

export function fxImpact(x,y,frames){ST.impactF=Math.max(ST.impactF,frames);ST.impactX=x;ST.impactY=y;}

export function fxBoom(cx,cy,r,opt){
  if(r>=7)fxBurst(cx,cy,r*2.6,opt.green?'#8dffb0':opt.col?`rgb(${opt.col[0]},${opt.col[1]},${opt.col[2]})`:'#ffc93c');
  const w=opt.word||(r<9?WORDS_S:r<14?WORDS_M:WORDS_L)[R()*3|0];
  fxWord(cx,cy-r-4,w,Math.min(1.6,.7+r/18),opt.green?'#8dffb0':'#ffc93c',r>=12||opt.word,true);
  if(r>=14){ST.hitstop=Math.max(ST.hitstop,3);fxImpact(cx,cy,4);}
}
