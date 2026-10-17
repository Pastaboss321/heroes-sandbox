// Comic overlay: sound words, bursts, focus lines.
import { ctx, cv, resize, vig } from './canvas.js';
import { ST } from '../state.js';
import { R } from '../world/materials.js';
import { VH, VW } from '../world/grid.js';
import { comics } from './fx.js';
import { pl_ } from '../player.js';
import { enemies } from '../enemies/core.js';

// comic overlay drawn at screen resolution: focus lines, impact frames, starbursts, sound words, vignette, damage edge
export function drawComics(sx,sy){
  const S=x=>ST.ox+sx+(x-ST.CX)*ST.scale, T=y=>ST.oy+sy+(y-ST.CY)*ST.scale, p=pl_;
  if(vig.width&&vig.height)ctx.drawImage(vig,0,0);
  if(ST.GS==='play'&&(p.boost>0||p.boring||p.charge>0||p.slam)){ // manga focus lines toward the hero
    const cx=S(p.x),cy=T(p.y-ST.PH/2),R0=Math.max(cv.width,cv.height);ctx.strokeStyle='rgba(243,233,210,.22)';
    for(let k=0;k<22;k++){const a=R()*6.283,r1=90*ST.scale/3+R()*60;ctx.lineWidth=1+R()*3;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*R0,cy+Math.sin(a)*R0);ctx.stroke();}}
  if(ST.impactF>0){const k=ST.impactF/4,cx=S(ST.impactX),cy=T(ST.impactY);ctx.fillStyle=`rgba(255,248,226,${.35*k})`;ctx.fillRect(0,0,cv.width,cv.height);
    ctx.strokeStyle=`rgba(20,17,15,${.55*k})`;for(let n=0;n<26;n++){const a=n/26*6.283+R()*.1,r1=40+R()*40;ctx.lineWidth=2+R()*4;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*2000,cy+Math.sin(a)*2000);ctx.stroke();}
    ST.impactF--;}
  for(let n=comics.length-1;n>=0;n--){const f=comics[n],t=1-f.life/f.max;
    if(f.k==='b'){const r=f.r*ST.scale/3*(.5+t*.9),cx=S(f.x),cy=T(f.y);ctx.save();ctx.translate(cx,cy);ctx.rotate(f.rot);ctx.globalAlpha=1-t*t;ctx.beginPath();
      for(let k=0;k<24;k++){const rr=k&1?r*.55:r,a=k/24*6.283;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=f.c;ctx.fill();ctx.lineWidth=Math.max(2,ST.scale);ctx.strokeStyle='#14110f';ctx.stroke();ctx.restore();}
    else{const pop=t<.18?.3+t/.18*1.1:t<.3?1.4-(t-.18)/.12*.4:1,sz=f.size*16*ST.scale*pop,cx=S(f.x),cy=T(f.y)-t*10*ST.scale;
      ctx.save();ctx.translate(cx,cy);ctx.rotate(f.rot);ctx.globalAlpha=t>.7?1-(t-.7)/.3:1;ctx.font=`${sz|0}px Bangers, Impact, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineJoin='round';ctx.lineWidth=Math.max(3,sz*.16);ctx.strokeStyle='#14110f';ctx.fillStyle='#e23b2e';ctx.strokeText(f.text,sz*.07,sz*.07);ctx.fillText(f.text,sz*.07,sz*.07);
      ctx.strokeText(f.text,0,0);ctx.fillStyle=f.c;ctx.fillText(f.text,0,0);ctx.restore();}
    if(ST.GS==='play')f.life--;if(f.life<=0)comics.splice(n,1);}
  ctx.globalAlpha=1;
  if(ST.GS==='play'){ // arrows at the screen edge pointing to enemies you can't see (bosses get a bigger one)
    let shown=0;const cx=cv.width/2,cy=cv.height/2,mg=26;
    for(const e of enemies){if(shown>=14)break;const X=S(e.x),Y=T(e.y);if(X>ST.ox&&X<ST.ox+VW*ST.scale&&Y>ST.oy&&Y<ST.oy+VH*ST.scale)continue;shown++;
      const dx=X-cx,dy=Y-cy,k=Math.min((cx-mg)/Math.max(1,Math.abs(dx)),(cy-mg)/Math.max(1,Math.abs(dy))),ax=cx+dx*k,ay=cy+dy*k,an=Math.atan2(dy,dx),sz=e.def.title?14:8;
      ctx.save();ctx.translate(ax,ay);ctx.rotate(an);ctx.beginPath();ctx.moveTo(sz,0);ctx.lineTo(-sz*.7,-sz*.7);ctx.lineTo(-sz*.4,0);ctx.lineTo(-sz*.7,sz*.7);ctx.closePath();
      ctx.fillStyle=e.ally>0?'#ff9ad8':e.def.title?'#c88cff':'#e23b2e';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#14110f';ctx.stroke();ctx.restore();}}
  if(ST.hurtV>.02){const g=ctx.createRadialGradient(cv.width/2,cv.height/2,Math.min(cv.width,cv.height)*.3,cv.width/2,cv.height/2,Math.max(cv.width,cv.height)*.7);
    g.addColorStop(0,'rgba(226,59,46,0)');g.addColorStop(1,`rgba(226,59,46,${.55*ST.hurtV})`);ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);if(ST.GS==='play')ST.hurtV*=.92;}
}
addEventListener('resize',resize);
