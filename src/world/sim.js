// Cellular-automaton step: powders, liquids, gases, fire, lava and acid reactions.
import { CS, CW, H, N, W, booms, canSink, life, markDirty, rn, setc, stamp, swap, t, vel, wake } from './grid.js';
import { ST } from '../state.js';
import { ACID, ASH, EMBER, EMPTY, F, FIRE, FLAM, G, GFIRE, GLASS, HARD, ICE, KIND, L, LAVA, OBSID, OIL, P, PROPANE, R, RUBBLE, S, SAND, SMOKE, SNOW, STEAM, STEEL, WATER, WOOD, rgb } from './materials.js';
import { PHYS } from './physics.js';
import { MP, spawn } from './particles.js';

export function step(){
  ST.clock=(ST.clock%255)+1; ST.frame++;
  const tmp=ST.act; ST.act=ST.nxt; ST.nxt=tmp; ST.nxt.fill(0);
  for(let y=H-1;y>=0;y--){
    const rowA=(y>>5)*CW, ltr=((ST.frame+y)&1)===0;
    for(let q=0;q<CW;q++){
      const cx=ltr?q:CW-1-q; if(!ST.act[rowA+cx])continue;
      const xs=cx*CS, xe=xs+CS>W?W:xs+CS;
      for(let k=xs;k<xe;k++){
        const x=ltr?k:xe-1-(k-xs), i=y*W+x, m=t[i];
        if(m===0||stamp[i]===ST.clock)continue;
        const kd=KIND[m];
        if(kd===S)continue;
        if(kd===P)updPowder(i,m,x,y);
        else if(kd===L)updLiquid(i,m,x,y);
        else if(kd===G)updGas(i,m,x,y);
        else reactFire(i,m,x,y);
      }
    }
  }
}
function updPowder(i,m,x,y){
  if(m===EMBER){ wake(i); if(--life[i]===0){setc(i,ASH);return;} const j=rn(i); if(j>=0&&FLAM[t[j]]>0&&R()<.08)ignite(j); }
  if(y>=H-1)return;
  const j=i+W, tj=t[j];
  if(canSink(m,tj)&&(KIND[tj]!==L||R()<.5)){
    let v=vel[i]; if(v<PHYS.powder.maxV)v++;
    let dest=j, yy=y+1;
    if(tj===0) for(let s=1;s<v&&yy<H-1;s++){const jj=dest+W;if(t[jj]===0){dest=jj;yy++;}else break;}
    swap(i,dest); vel[dest]=v; if(i>=W&&KIND[t[i-W]]===S)markDirty(i-W); return;
  }
  const hit=vel[i]; vel[i]=0;
  if(m===RUBBLE&&hit<2&&R()<.35)return;  // rubble piles steeper unless it lands hard
  const d=R()<.5?-1:1;
  if(x+d>=0&&x+d<W&&canSink(m,t[j+d])){swap(i,j+d);if(i>=W&&KIND[t[i-W]]===S)markDirty(i-W);return;}
  if(x-d>=0&&x-d<W&&canSink(m,t[j-d])){swap(i,j-d);if(i>=W&&KIND[t[i-W]]===S)markDirty(i-W);return;}
  if(hit>3&&x+d*2>=0&&x+d*2<W&&t[i+d]===0&&t[i+d*2]===0)swap(i,i+d); // impact scatter
}
function updLiquid(i,m,x,y){
  if(m===LAVA){ wake(i); if(reactLava(i))return; if(R()<.55)return; }
  else if(m===ACID){ if(reactAcid(i))return; }
  if(y<H-1){
    const j=i+W, tj=t[j];
    if(canSink(m,tj)){
      let v=vel[i]; if(v<PHYS.liquid.maxV)v++; let dest=j,yy=y+1;
      if(tj===0) for(let s=1;s<v&&yy<H-1;s++){const jj=dest+W;if(t[jj]===0){dest=jj;yy++;}else break;}
      swap(i,dest); vel[dest]=v; return;
    }
    vel[i]=0;
    const d=R()<.5?-1:1;
    if(x+d>=0&&x+d<W&&canSink(m,t[j+d])){swap(i,j+d);return;}
    if(x-d>=0&&x-d<W&&canSink(m,t[j-d])){swap(i,j-d);return;}
  }
  const d=R()<.5?-1:1; let best=-1; const reach=m===LAVA?2:5;
  for(let s=1;s<=reach;s++){const nx=x+d*s;if(nx<0||nx>=W)break;const j=i+d*s;if(canSink(m,t[j]))best=j;else break;}
  if(best>=0)swap(i,best);
}
function updGas(i,m,x,y){
  wake(i);
  if(m!==PROPANE&&--life[i]===0){ setc(i,(m===STEAM&&R()<.35)?WATER:EMPTY); return; }
  if(m===PROPANE&&R()<.6)return;
  if(y>0){
    const j=i-W, d=R()<.5?-1:1;
    if(m===PROPANE){ // heavy gas: drifts sideways and sinks a little
      const k=R()<.3?i+W:i+d; if(k>=0&&k<N&&t[k]===0&&Math.abs((k%W)-x)<=1)swap(i,k); return; }
    if(t[j]===0&&R()<.8){swap(i,j);return;}
    if(x+d>=0&&x+d<W&&t[j+d]===0){swap(i,j+d);return;}
    if(x+d>=0&&x+d<W&&t[i+d]===0){swap(i,i+d);return;}
  }
}
export function ignite(j){
  const m=t[j];
  if(m===PROPANE){ booms.push([j%W,(j/W)|0,7]); setc(j,FIRE); return; }
  if(m===OIL){setc(j,FIRE);life[j]=60+R()*60;return;}
  if(KIND[m]===S){ setc(j,R()<.25?EMBER:FIRE); if(m===WOOD)life[j]=200; }
  else setc(j,FIRE);
}
function reactFire(i,m,x,y){
  wake(i);
  const g=m===GFIRE;
  if(--life[i]===0){ setc(i,R()<(g?.2:.55)?SMOKE:EMPTY); return; }
  for(let n=0;n<2;n++){
    const j=rn(i); if(j<0)continue; const tm=t[j];
    if(tm===WATER){ setc(i,STEAM); if(R()<.3)setc(j,STEAM); return; }
    if(tm===ICE||tm===SNOW){ if(R()<(tm===SNOW?.5:.25))setc(j,WATER); continue; }
    if(tm===PROPANE){ ignite(j); continue; }
    if(g){
      if(FLAM[tm]>0&&R()<FLAM[tm]*2+.05)setc(j,GFIRE);
      else if(tm!==0&&tm!==STEEL&&tm!==GFIRE&&KIND[tm]!==G&&R()<.012/(1+HARD[tm])){ if(KIND[tm]===S){markDirty(j);t[j]=RUBBLE;wake(j);} else setc(j,GFIRE); }
    } else if(FLAM[tm]>0&&R()<FLAM[tm]) ignite(j);
  }
  if(y>0&&R()<.35){const d=((R()*3)|0)-1,j=i-W+d;if(x+d>=0&&x+d<W&&t[j]===0)swap(i,j);}
  if(!g&&R()<.0025&&ST.np<MP-4000)spawn(x,y-1,(R()-.5)*.5,-.5-R()*.9,rgb(255,140+R()*90|0,40),40+R()*50,0,1,0); // embers drift up from big fires
}
function reactLava(i){
  const j=rn(i); if(j<0)return false; const tm=t[j];
  if(tm===WATER){ setc(i,OBSID); setc(j,STEAM); return true; }
  if(tm===ICE||tm===SNOW){ setc(j,R()<.5?WATER:STEAM); return false; }
  if(FLAM[tm]>0&&R()<.3) ignite(j);
  if(tm===SAND&&R()<.01) setc(j,GLASS);
  if(R()<.0003){setc(i,OBSID);return true;}
  return false;
}
function reactAcid(i){
  const j=rn(i); if(j<0)return false; const tm=t[j];
  if(tm===0||tm===ACID||tm===GLASS||KIND[tm]===G||KIND[tm]===F)return false;
  wake(i);
  if(tm===STEEL&&R()>.03)return false;
  if(R()<.25){ setc(j,R()<.3?SMOKE:EMPTY); if(R()<.3){setc(i,EMPTY);return true;} }
  return false;
}
