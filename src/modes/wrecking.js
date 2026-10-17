import './sentinel.js'; // evaluation order: runs after modes/sentinel.js
import { ST } from '../state.js';
import { fxWord } from '../render/fx.js';
import { snd } from '../sfx.js';
import { pl_ } from '../player.js';
import { countBuilt } from '../maps/index.js';
import { banner, defineMode, endRun } from './core.js';



// ---- Wrecking Crew: two minutes to level as much of the city as possible. Destruction keeps a combo going
defineMode('demolition',{name:'Wrecking Crew',sub:'score attack · 2 minutes',
  desc:'Level the city before the clock runs out. Every pixel of building you destroy scores; keep the carnage going to push the combo to x8. Toppled towers pay a bonus.',
  setup(s){s.time=120*60;s.base=countBuilt();s.last=s.base;s.combo=1;s.best=1;s.heat=0;s.topples=0;banner('WRECKING CREW','two minutes · level everything');},
  update(s){s.time--;
    if(s.t%20===0){const now=countBuilt(),d=Math.max(0,s.last-now);s.last=now;
      if(d>0){s.heat=Math.min(100,s.heat+d/45);ST.score+=Math.round(d*s.combo);}
      s.heat=Math.max(0,s.heat-2.4);const c=1+Math.min(7,Math.floor(s.heat/12));
      if(c>s.combo){fxWord(pl_.x,pl_.y-ST.PH-16,'x'+c+' COMBO!',1+c*.06,'#ffc93c',true);snd('charge',pl_.x,pl_.y,{pitch:.8+c*.1});}
      s.combo=c;s.best=Math.max(s.best,c);}
    if(s.time===600)banner('10 SECONDS','finish it!');
    if(s.time<=0)endRun();},
  onCollapse(n,s){s.topples++;const b=Math.round(n/2)*s.combo;ST.score+=b;fxWord(pl_.x,pl_.y-ST.PH-26,'TIMBER! +'+b,1.2,'#ffc93c',true);},
  hud(s){const pct=s.base?100*(1-s.last/s.base):0;return `${Math.ceil(Math.max(0,s.time)/60)}s · ${pct.toFixed(1)}% flattened · combo x${s.combo}`;},
  result(s){const pct=s.base?100*(1-s.last/s.base):0;return{title:pct>55?'CITY FLATTENED':'TIME UP',stats:[['FLATTENED',pct.toFixed(1)+'%'],['BEST COMBO','x'+s.best],['TOPPLED',s.topples]]};}
});
