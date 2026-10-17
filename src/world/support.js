// Structural support: anchor flood, support checks, back-wall orphan sweep, cluster flood into rigid bodies.
import './sim.js'; // evaluation order: runs after world/sim.js
import { ST } from '../state.js';
import { CONC, DIRT, GLASS, GRASS, KIND, LEAF, NEON, NM, OBSID, P, R, RUBBLE, S, STEEL, STONE, WEB, WOOD } from './materials.js';
import { H, N, W, bg, bgB, bgD, col, markDirty, t, vel, wake } from './grid.js';
import { dust, makeBody } from './bodies.js';
import { MP, spawn } from './particles.js';
import { shade } from './destruction.js';
import { snd } from '../sfx.js';

// ================= structural support → rotating rigid chunks =================
// Deep natural ground is "pinned" (bedrock-like). Anything not connected to pinned
// ground, the world floor, or resting on loose debris breaks off as a rigid chunk
// that falls, tips over its edge, and shatters on impact.
export const vis=new Uint32Array(N), q=new Int32Array(N), bm=new Uint32Array(N), pin=new Uint8Array(N);
 // vgen, bgen: shared state (ST in state.js)
export const bodies=[];
 const CAP=40000;
// lastBoom: shared state (ST in state.js)
// how much weight one supporting cell of a material can carry, and how heavy each cell is
const LOAD=new Float32Array(NM), MASS=new Float32Array(NM);
LOAD.fill(400);
MASS.fill(1);
LOAD[STEEL]=900;
LOAD[CONC]=450;
LOAD[STONE]=700;
LOAD[OBSID]=800;
LOAD[WOOD]=250;
LOAD[DIRT]=250;
LOAD[GLASS]=120;
LOAD[LEAF]=20;
LOAD[GRASS]=120;
export const NAT=new Uint8Array(NM);
NAT[DIRT]=NAT[GRASS]=NAT[STONE]=NAT[OBSID]=1; // natural ground vs built structures
export const gnd=new Uint8Array(N); // per cell: counts as ground (natural ground, plus streets/decks/tunnels wider than any building)
export const str=new Uint8Array(N).fill(10); // per-structure strength (x0.1), set at generation for a 1.5x safety margin
MASS[STEEL]=1.5;
MASS[STONE]=1.2;
MASS[OBSID]=1.2;
MASS[GLASS]=.8;
MASS[WOOD]=.5;
MASS[LEAF]=.2;
MASS[GRASS]=.3;
LOAD[WEB]=160;
MASS[WEB]=.05; // spider silk: featherweight and strong, so strands span gaps
let collapses=0;
const vis2=new Uint32Array(N), GCAP=150000;
 let ggen=0, gstart=0;
function anchorFlood(s,init){
  const id=++ggen;let sp=0,tl=0;stk[sp++]=s;q[tl++]=s;vis2[s]=id;
  while(sp>0){
    if(tl>GCAP)return; // the landscape itself
    const i=stk[--sp],y=(i/W)|0,x=i-y*W;
    if(y>=H-1||(y>=H-40&&gnd[i])||pin[i]===3)return;           // world floor / bedrock band / Iceman's fresh slide
    const b=t[i+W];if(KIND[b]===P)return;                       // sitting on a debris pile
    for(let d=0;d<4;d++){ // push down last so it is explored first
      let j;if(d===0){if(x===0)continue;j=i-1;}else if(d===1){if(x===W-1)continue;j=i+1;}else if(d===2){if(i<W)continue;j=i-W;}else j=i+W;
      if(KIND[t[j]]!==S)continue;
      if(vis2[j]>=gstart){if(vis2[j]!==id)return;continue;}       // touches something already proven anchored
      vis2[j]=id;q[tl++]=j;stk[sp++]=j;}
  }
  // fully walked and never reached the ground: it is floating
  if(init){let lf=0;for(let k=0;k<tl;k++)if(t[q[k]]===LEAF)lf++; // generator leftovers (detached canopies, specks) are simply removed
    if(tl<200||lf*2>tl){for(let k=0;k<tl;k++){t[q[k]]=0;wake(q[k]);}return;}}
  dropCluster(q,tl);
}
// a floating cluster comes down: tiny bits and loose whiskers crumble to dust, the rest falls as one rigid chunk
// (made of whatever materials it is built from) that tumbles and shatters on landing
function dropCluster(list,n){
  const dust1=(i)=>{const x=i%W,y=(i/W)|0,m=t[i];
    if(ST.np<MP-300&&R()<.7)spawn(x,y,(R()-.5)*1.2,-R()*.6,col[i],90+R()*60,R()<.25?0:RUBBLE,m===GLASS||m===NEON?1:0);
    else if(R()<.5)dust(x,y);
    if(bgB[i]&&R()<.5){bg[i]=bgD[i];bgB[i]=0;}
    markDirty(i);t[i]=0;pin[i]=0;wake(i);};
  if(n<=26){for(let k=0;k<n;k++)dust1(list[k]);return;}
  // mark membership so neighbour counts only see this cluster
  const id=++ggen;for(let k=0;k<n;k++)vis2[list[k]]=id;
  let k2=0;
  for(let k=0;k<n;k++){const i=list[k],m=t[i];let c=0;
    if(vis2[i-1]===id)c++;if(vis2[i+1]===id)c++;if(i>=W&&vis2[i-W]===id)c++;if(vis2[i+W]===id)c++;
    const fragile=m===LEAF||m===GLASS||m===GRASS;
    if(c<=1||(fragile&&R()<.45)||R()<.04)dust1(i);else list[k2++]=i;}
  if(k2>0){const b=makeBody(list,k2,false);if(b){b.vy=Math.max(b.vy,.4);b.va+=(R()-.5)*.01;}}
  ST.shake=Math.min(22,ST.shake+Math.min(6,Math.sqrt(n)/12));
}
export const unq=[], stk=new Int32Array(N), rid=new Int32Array(N), rcount=[0];
 let vstart=0;
// rid: which intact piece a cell belongs to (set at generation and when debris settles). Untouched pieces never topple.
export function supportCheck(init){
  // hooks next to fresh damage let go: generated floating pieces only hang until touched
  while(unq.length){const s0=unq.pop();for(const j0 of [s0,s0-1,s0+1,s0-W,s0+W]){if(j0<0||j0>=N||pin[j0]!==2)continue;
    let h=0,tl=0;q[tl++]=j0;pin[j0]=0;while(h<tl){const i=q[h++];for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<N&&pin[j]===2){pin[j]=0;q[tl++]=j;}}}}
  if(ST.dx1<0){if(!init)sweepBg();return;}
  const x0=Math.max(0,ST.dx0-2),x1=Math.min(W-1,ST.dx1+2),y0=Math.max(0,ST.dy0-2),y1=Math.min(H-1,ST.dy1+2);
  ST.dx0=W;ST.dy0=H;ST.dx1=-1;ST.dy1=-1; collapses=0;
  // 1) nothing may hang in the sky: every solid must connect, through solids of ANY material,
  //    to the world floor / bedrock or rest on loose debris. Whatever doesn't becomes chunks or dust.
  gstart=++ggen;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(KIND[t[i]]===S&&vis2[i]<gstart)anchorFlood(i,init);}
  // 2) structural strength: each structure (ground vs built) must carry its own weight
  vstart=++ST.vgen;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(KIND[t[i]]===S&&vis[i]<vstart)flood(i,init);}
  if(!init){ // back walls are swept less often, one dirty area at a time
    sweepBg();}
}
const ob=[W,-1,H,-1]; // where structure was actually destroyed since the last back-wall sweep
export function obAdd(x,y){if(x<ob[0])ob[0]=x;if(x>ob[1])ob[1]=x;if(y<ob[2])ob[2]=y;if(y>ob[3])ob[3]=y;}
function sweepBg(){if(ST.frame%8!==0||ob[1]<0)return;orphanBg(ob[0]-70,ob[1]+70,ob[2]-70,ob[3]+70);ob[0]=W;ob[1]=-1;ob[2]=H;ob[3]=-1;}
export const BLDS=m=>KIND[m]===S&&!NAT[m]&&m!==LEAF;
function orphanBg(x0,x1,y0,y1){
  const RCH=110;x0=Math.max(0,x0);x1=Math.min(W-1,x1);y0=Math.max(0,y0);y1=Math.min(H-1,y1);
  for(let y=y0;y<=y1;y++){const row=y*W;
    // left pass: distance to nearest structure on the left
    let last=-1e9;for(let x=Math.max(0,x0-RCH);x<x0;x++)if(BLDS(t[row+x]))last=x;
    for(let x=x0;x<=x1;x++){const i=row+x;if(BLDS(t[i])){last=x;continue;}if(bgB[i]&&x-last>RCH)dropBg(i,x,y);}
    last=1e9;for(let x=Math.min(W-1,x1+RCH);x>x1;x--)if(BLDS(t[row+x]))last=x;
    for(let x=x1;x>=x0;x--){const i=row+x;if(BLDS(t[i])){last=x;continue;}if(bgB[i]&&last-x>RCH)dropBg(i,x,y);}
  }
  for(let x=x0;x<=x1;x++){let last=-1e9;for(let y=Math.max(0,y0-RCH);y<y0;y++)if(BLDS(t[y*W+x]))last=y;
    for(let y=y0;y<=y1;y++){const i=y*W+x;if(BLDS(t[i])){last=y;continue;}if(bgB[i]&&y-last>RCH)dropBg(i,x,y);}}
}
function dropBg(i,x,y){if(R()<.2&&ST.np<MP-500)spawn(x,y,(R()-.5)*1.5,-R(),shade(bg[i],.8),90,RUBBLE,0);bg[i]=bgD[i];bgB[i]=0;}
function flood(s,init){
  // walk one connected structure (natural ground and built stuff are separate structures)
  // depth-first, diving down first: anything resting on the world floor is proven sound in a few hundred steps
  const id=++ST.vgen; let sp=0,tl=0; stk[sp++]=s; q[tl++]=s; vis[s]=id; let sup=0, mass=0, My=0, Ty=H, smx=-1, smn=W, cmx=0, hook=false, r0=rid[s], mixed=false;
  while(sp>0){
    if(tl>CAP)return; // part of the landscape itself: too big to fall
    if(sup>=1e9&&!init)return; // proven sound (cells walked so far count as sound for later floods)
    const i=stk[--sp], y=(i/W)|0, x=i-y*W, m=t[i];
    mass+=MASS[m]; cmx+=x*MASS[m]; if(rid[i]!==r0)mixed=true; if(y>My)My=y; if(y<Ty)Ty=y; if(pin[i]>=2)hook=true;
    if(y>=H-1||(y>=H-40&&gnd[i])){sup+=1e9;continue;} // world floor, or ground down in the bedrock band (lava lakes sit under it)
    for(let d=0;d<4;d++){
      let j; if(d===0){if(x===0)continue;j=i-1;}else if(d===1){if(x===W-1)continue;j=i+1;}else if(d===2){if(i<W)continue;j=i-W;}else j=i+W;
      const tj=t[j],kj=KIND[tj];
      if(kj===S){
        if(gnd[j]!==gnd[i]){ // the other kind is the foundation: ground under a building, or a slab under soil
          if(d===3){sup+=LOAD[m]*str[i]*.1;if(x<smn)smn=x;if(x>smx)smx=x;} else if(d<2&&!gnd[i]){sup+=LOAD[m]*.12*str[i]*.1;if(x<smn)smn=x;if(x>smx)smx=x;}
          else if(d===2){sup+=LOAD[m]*.3*str[i]*.1;if(x<smn)smn=x;if(x>smx)smx=x;} } // hanging from what is above it
        else if(vis[j]<vstart){vis[j]=id;q[tl++]=j;stk[sp++]=j;}
        else if(vis[j]!==id)sup+=1e9; // touches a region already judged sound this pass
      }
      else if(d===3&&kj===P){sup+=90;if(x<smn)smn=x;if(x>smx)smx=x;} // resting on loose debris: weak support
    }
  }
  if(hook)sup+=1e9;
  if(init){ // generated as-is: tiny floaters vanish, bigger ones hang on hooks until damaged; the rest get a 1.5x safety margin
    if(sup===0)return; // floating bits are the anchor pass's job
    const f=Math.max(10,Math.min(255,Math.ceil(15*mass/(sup/(str[s]*.1))))),r=rcount.length;rcount.push(tl);for(let k=0;k<tl;k++){str[q[k]]=f;rid[q[k]]=r;}return; }
  if(sup===0){makeBody(q,tl,false);return;}
  // leftover columns and lopsided remnants: too slender, or the weight hangs past the base -> topple over
  if(sup<1e9&&!gnd[s]&&mass<6000&&(mixed||!r0||tl!==rcount[r0])){
    const cx=cmx/mass, base=smx-smn+1, ht=My-Ty+1, over=cx<smn-2||cx>smx+2;
    if(over||(ht/base>12&&ht>14)){
      const dir=over?Math.sign(cx-(smn+smx)/2):(R()<.5?-1:1);
      const b=makeBody(q,tl,false);
      if(b){b.vx=dir*(.5+R()*.6);b.vy=-.6;b.va=dir*(.012+Math.min(.03,ht*.0004));b.topple=dir;}
      return;
    }
  }
  if(mass>sup&&collapses<3){ // overloaded: the base gives way, the rest drops and slams down
    collapses++;snd('crumble',cmx/mass,My,{size:Math.min(2.2,Math.sqrt(tl)/30)});
    const cut=My-Math.min(12,4+tl/900|0); let k2=0;
    for(let k=0;k<tl;k++){const i=q[k],y=(i/W)|0;
      if(y>=cut){ if(R()<.5){const x=i%W;spawn(x,y,(R()-.5)*4,-R()*2.5,col[i],90,RUBBLE,t[i]===GLASS?1:0);t[i]=0;}else{t[i]=RUBBLE;vel[i]=3;} wake(i); if(R()<.05)dust(i%W,y-1); }
      else q[k2++]=i; }
    ST.shake=Math.min(22,ST.shake+3+Math.sqrt(tl)/20);
    const b=makeBody(q,k2,false); if(b)b.vy=.8;
  }
}
