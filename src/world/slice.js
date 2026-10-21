// MOLTYN-style slicing: blades, claws and cutting beams leave a thin kerf through every solid,
// natural ground included, instead of blasting a crater. Whatever the kerf walls off from the ground
// breaks loose as a crisp slab that slides down the cut face (see updBodies), and falling chunks the
// blade passes through are severed into separate pieces mid-air.
//   sliceLine(x0,y0,x1,y1,opt)   cut the grid and every chunk on the segment
//     opt.w      kerf half-width in cells (0 = one cell, the default)
//     opt.edge   [r,g,b] tint left on the fresh cut faces (red-hot for beams, bright steel for claws)
//     opt.push   how hard severed pieces are shoved apart (default 1)
//     opt.vx/vy  blade velocity, carried a little into severed pieces
//     opt.quiet  no sound / flash
import { ST } from '../state.js';
import { BACK, H, W, col, setc, t } from './grid.js';
import { GLASS, KIND, OBSID, R, RUBBLE, S, rgb } from './materials.js';
import { bodies } from './support.js';
import { finishBody } from './bodies.js';
import { MP, spawn } from './particles.js';
import { beams, flash } from '../render/fx.js';
import { snd } from '../sfx.js';

const mix=(c,e,k)=>rgb((c&255)*(1-k)+e[0]*k,((c>>8)&255)*(1-k)+e[1]*k,((c>>16)&255)*(1-k)+e[2]*k);
// the last few cuts: chunks that break loose right after a cut near it become sliding slabs
export const CUTS=[];
export function recentCut(x,y,r){for(const c of CUTS){if(ST.frame-c.f>12)continue;const dx=c.x1-c.x0,dy=c.y1-c.y0,L2=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((x-c.x0)*dx+(y-c.y0)*dy)/L2));if(Math.hypot(c.x0+dx*u-x,c.y0+dy*u-y)<r+8)return c;}return null;}

// cut a kerf into the grid. The cut is 4-connected, so it always walls the two sides apart.
export function kerf(x0,y0,x1,y1,o={}){
  const w=o.w|0,edge=o.edge,len=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.ceil(len));let cut=0;
  const nx=-(y1-y0)/(len||1),ny=(x1-x0)/(len||1);
  let px=Math.round(x0),py=Math.round(y0);
  const cell=(X,Y)=>{if(X<0||X>=W||Y<0||Y>=H-5)return;const i=Y*W+X,m=t[i];if(!m||KIND[m]!==S||m===OBSID&&!o.obsid)return;
    if(ST.np<MP-300&&R()<.3)spawn(X,Y,(o.vx||0)*.15+(R()-.5)*1.6,(o.vy||0)*.15-R()*1.6,R()<.5&&edge?rgb(edge[0],edge[1],edge[2]):col[i],18+R()*24,R()<.15?RUBBLE:0,1,R()<.5?1:0);
    setc(i,0);cut++;
    if(edge)for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<t.length&&KIND[t[j]]===S&&t[j]!==GLASS)col[j]=mix(col[j],edge,.45);};
  const put=(X,Y)=>{cell(X,Y);for(let k=1;k<=w;k++){cell(Math.round(X+nx*k),Math.round(Y+ny*k));cell(Math.round(X-nx*k),Math.round(Y-ny*k));}};
  put(px,py);
  for(let s=1;s<=n;s++){const X=Math.round(x0+(x1-x0)*s/n),Y=Math.round(y0+(y1-y0)*s/n);
    if(X!==px&&Y!==py)put(X,py); // diagonal step: fill the corner so no cell pair stays 4-connected across the cut
    if(X!==px||Y!==py)put(X,Y);px=X;py=Y;}
  return cut;
}

// sever every chunk the segment crosses: cells on the line become sparks, and each piece left
// over becomes its own chunk. Returns the number of chunks cut.
export function sliceBodies(x0,y0,x1,y1,o={}){
  const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy||1,L=Math.sqrt(L2),ux=dx/L,uy=dy/L,nx=-uy,ny=ux,hw=.75+(o.w|0);let cutN=0;
  for(let n=bodies.length-1;n>=0;n--){const b=bodies[n];if(b.held&&!o.held)continue;
    {const u=Math.max(0,Math.min(1,((b.x-x0)*dx+(b.y-y0)*dy)/L2));if(Math.hypot(x0+dx*u-b.x,y0+dy*u-b.y)>b.rmax+2)continue;}
    const lw=b.lw,lh=b.lh,lm=b.lm,c=Math.cos(b.a),s=Math.sin(b.a);
    const wx=(x,y)=>b.x+(x-b.cx)*c-(y-b.cy)*s, wy=(x,y)=>b.y+(x-b.cx)*s+(y-b.cy)*c;
    const side=new Int8Array(lw*lh);let hit=0;
    for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const o2=y*lw+x;if(!lm[o2])continue;const X=wx(x,y),Y=wy(x,y),rx=X-x0,ry=Y-y0,along=rx*ux+ry*uy,d=rx*nx+ry*ny;
      if(along>=-1&&along<=L+1&&Math.abs(d)<hw){side[o2]=-1;hit++;}else side[o2]=d<0?1:2;}
    if(!hit)continue;
    // label the pieces (4-connected) of what is left
    const lab=new Int32Array(lw*lh),stack=[];let nl=0;const sizes=[0];
    for(let o2=0;o2<lw*lh;o2++){if(side[o2]<=0||lab[o2])continue;nl++;let cnt=0;stack.push(o2);lab[o2]=nl;
      while(stack.length){const k=stack.pop(),x=k%lw,y=(k/lw)|0;cnt++;
        if(x>0&&side[k-1]>0&&!lab[k-1]){lab[k-1]=nl;stack.push(k-1);}if(x<lw-1&&side[k+1]>0&&!lab[k+1]){lab[k+1]=nl;stack.push(k+1);}
        if(y>0&&side[k-lw]>0&&!lab[k-lw]){lab[k-lw]=nl;stack.push(k-lw);}if(y<lh-1&&side[k+lw]>0&&!lab[k+lw]){lab[k+lw]=nl;stack.push(k+lw);}}
      sizes.push(cnt);}
    // kerf cells fly off as sparks and grit
    for(let o2=0;o2<lw*lh;o2++)if(side[o2]===-1&&ST.np<MP-200&&R()<.5){const x=o2%lw,y=(o2/lw)|0,m=lm[o2];
      spawn(wx(x,y),wy(x,y),b.vx+(o.vx||0)*.2+(R()-.5)*1.5,b.vy+(o.vy||0)*.2-R()*1.5,o.edge&&R()<.5?rgb(o.edge[0],o.edge[1],o.edge[2]):b.lc[o2],16+R()*20,m===BACK||KIND[m]===S?(R()<.2?RUBBLE:0):m,1,R()<.5?1:0);}
    bodies.splice(n,1);cutN++;
    const push=o.push??1;
    for(let k=1;k<=nl;k++){const cnt=sizes[k];
      if(cnt<10){for(let o2=0;o2<lw*lh;o2++)if(lab[o2]===k&&ST.np<MP-100){const x=o2%lw,y=(o2/lw)|0;spawn(wx(x,y),wy(x,y),b.vx+(R()-.5),b.vy-R(),b.lc[o2],90,b.lm[o2]===BACK||KIND[b.lm[o2]]===S?RUBBLE:b.lm[o2],0);}continue;}
      let mx=lw,my=lh,Mx=0,My=0,sx=0,sy=0;
      for(let o2=0;o2<lw*lh;o2++)if(lab[o2]===k){const x=o2%lw,y=(o2/lw)|0;if(x<mx)mx=x;if(y<my)my=y;if(x>Mx)Mx=x;if(y>My)My=y;sx+=x;sy+=y;}
      const w2=Mx-mx+1,h2=My-my+1,nlm=new Uint8Array(w2*h2),nlc=new Uint32Array(w2*h2);
      for(let o2=0;o2<lw*lh;o2++)if(lab[o2]===k){const x=o2%lw-mx,y=((o2/lw)|0)-my;nlm[y*w2+x]=lm[o2];nlc[y*w2+x]=b.lc[o2];
        if(o.edge&&(x===0||y===0||x===w2-1||y===h2-1))nlc[y*w2+x]=mix(b.lc[o2],o.edge,.3);}
      const gx=sx/cnt,gy=sy/cnt,X=wx(gx,gy),Y=wy(gx,gy);
      const nb=finishBody(nlm,nlc,w2,h2,gx-mx,gy-my,X,Y,b.a,cnt,false);
      const sd=((X-x0)*nx+(Y-y0)*ny)<0?-1:1,f=push*(.5+R()*.5)*Math.min(1.6,18/Math.sqrt(cnt));
      nb.vx=b.vx+nx*sd*f+(o.vx||0)*.12;nb.vy=b.vy+ny*sd*f+(o.vy||0)*.12;nb.va=b.va+(R()-.5)*.03+sd*.012*push;
      nb.gen=b.gen;nb.thrown=b.thrown;nb.chunk=b.chunk&&cnt<300;nb.slab=true;nb.safeP=b.safeP;nb.age=Math.max(0,b.age-6);}
  }
  return cutN;
}

export function sliceLine(x0,y0,x1,y1,o={}){
  CUTS.push({x0,y0,x1,y1,f:ST.frame});if(CUTS.length>16)CUTS.shift();
  const cells=kerf(x0,y0,x1,y1,o),cutB=sliceBodies(x0,y0,x1,y1,o);
  if(!o.quiet&&(cells>4||cutB)){
    const e=o.edge||[255,250,235];
    beams.push({x0,y0,x1,y1,life:3,w:0,c:[255,255,255],g:e});
    flash((x0+x1)/2,(y0+y1)/2,Math.min(60,Math.hypot(x1-x0,y1-y0)*.4),e,4);
    if(cutB)snd('slash',(x0+x1)/2,(y0+y1)/2,{v:.8,pitch:.8,gap:.05});
    if(cells>40)snd('crumble',(x0+x1)/2,(y0+y1)/2,{size:Math.min(1.5,cells/200),v:.5,gap:.1});
    ST.shake=Math.max(ST.shake,Math.min(6,1+cells/120+cutB));
  }
  return cells+cutB*50;
}
// a fan of parallel cuts (claws: 3 blades, a sword: 1)
export function clawSlice(x,y,ux,uy,len,blades,gap,o={}){
  const nx=-uy,ny=ux;let n=0;
  for(let k=0;k<blades;k++){const off=(k-(blades-1)/2)*gap;n+=sliceLine(x+nx*off-ux*len*.15,y+ny*off-uy*len*.15,x+nx*off+ux*len,y+ny*off+uy*len,k?{...o,quiet:true}:o);}
  return n;
}
