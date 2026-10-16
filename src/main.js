import { initGL, presentGL } from './gl.js';
import { initAudio, play, loop as sfxLoop, ambience, setVolume, setMuted, tickAudio } from './audio.js';
import { createSpawnMenu } from './spawnmenu.js';
'use strict';
// ================= world size =================
const W=1600, H=640, N=W*H, VW=480, VH=270;
const CS=32, CW=Math.ceil(W/CS), CHN=Math.ceil(H/CS);
// ================= materials =================
const E=0,P=1,L=2,G=3,S=4,F=5;
const MATS=[
  // name, kind, density, flammability, hardness, r,g,b, variation
  ['empty',   E,0, 0,  0, 0,0,0,0],
  ['sand',    P,15,0,  1, 214,186,118,14],
  ['dirt',    S,20,0,  2, 104,72,44,12],
  ['stone',   S,30,0,  6, 104,104,112,10],
  ['concrete',S,25,0,  4, 150,148,142,8],
  ['steel',   S,40,0,  7, 118,128,142,6],
  ['glass',   S,22,0,  1, 150,205,225,10],
  ['wood',    S,8, .05,2, 118,78,40,10],
  ['leaves',  S,3, .25,1, 46,124,44,18],
  ['grass',   S,3, .2, 1, 70,160,52,16],
  ['water',   L,10,0,  0, 40,90,200,8],
  ['oil',     L,8, .4, 0, 50,38,30,5],
  ['acid',    L,11,0,  0, 120,230,40,15],
  ['lava',    L,14,0,  0, 240,90,20,15],
  ['fire',    F,0, 0,  0, 255,140,30,0],
  ['smoke',   G,1, 0,  0, 60,60,62,8],
  ['steam',   G,1, 0,  0, 190,200,210,10],
  ['ash',     P,5, 0,  0, 80,78,76,10],
  ['ember',   P,6, 0,  0, 255,120,30,0],
  ['greenfire',F,0,0,  0, 60,255,90,0],
  ['rubble',  P,18,0,  1, 120,120,120,10],
  ['propane', G,2, 1,  0, 150,170,120,6],
  ['obsidian',S,32,0,  7, 40,30,48,8],
  ['neon',    S,20,0,  1, 255,60,220,30],
  ['ice',     S,9, 0,  2, 186,228,250,14],
  ['snow',    P,4, 0,  0, 236,242,250,6],
];
const EMPTY=0,SAND=1,DIRT=2,STONE=3,CONC=4,STEEL=5,GLASS=6,WOOD=7,LEAF=8,GRASS=9,WATER=10,OIL=11,ACID=12,LAVA=13,FIRE=14,SMOKE=15,STEAM=16,ASH=17,EMBER=18,GFIRE=19,RUBBLE=20,PROPANE=21,OBSID=22,NEON=23,ICE=24,SNOW=25;
const NM=MATS.length;
const KIND=new Uint8Array(NM),DENS=new Uint8Array(NM),FLAM=new Float32Array(NM),HARD=new Uint8Array(NM);
MATS.forEach((m,i)=>{KIND[i]=m[1];DENS[i]=m[2];FLAM[i]=m[3];HARD[i]=m[4];});
const rgb=(r,g,b)=>((255<<24)|((b&255)<<16)|((g&255)<<8)|(r&255))>>>0;
const cl=v=>v<0?0:v>255?255:v|0;
function mkcol(m){const d=MATS[m];const v=(Math.random()*2-1)*d[8];return rgb(cl(d[5]+v),cl(d[6]+v),cl(d[7]+v));}
const R=Math.random;

// ================= grid =================
const t=new Uint8Array(N), col=new Uint32Array(N), life=new Uint8Array(N), stamp=new Uint8Array(N), vel=new Uint8Array(N);
const bg=new Uint32Array(N), bgD=new Uint32Array(N), bgB=new Uint8Array(N); // bgD: backdrop with no structures; bgB: pixel belongs to a structure's backdrop
const BACK=255; // chunk cell that is backdrop wall (drawn, no collision)           // 0 = open sky (parallax layer shows)
let act=new Uint8Array(CW*CHN), nxt=new Uint8Array(CW*CHN);
let clock=1, frame=0, genMode=false;
let dx0=W,dy0=H,dx1=-1,dy1=-1;          // dirty box for support checks
const booms=[];                         // deferred explosions (chain reactions)
function wake(i){
  const x=i%W,y=(i/W)|0,cx=x>>5,cy=y>>5;
  const xa=cx>0?cx-1:0,xb=cx<CW-1?cx+1:cx,ya=cy>0?cy-1:0,yb=cy<CHN-1?cy+1:cy;
  for(let yy=ya;yy<=yb;yy++)for(let xx=xa;xx<=xb;xx++)nxt[yy*CW+xx]=1;
}
function markDirty(i){const x=i%W,y=(i/W)|0;if(x<dx0)dx0=x;if(x>dx1)dx1=x;if(y<dy0)dy0=y;if(y>dy1)dy1=y;
  if(pin[i]===2||pin[i-1]===2||pin[i+1]===2||pin[i-W]===2||pin[i+W]===2)unq.push(i);}
function lifeOf(m){switch(m){case FIRE:return 15+R()*35;case GFIRE:return 40+R()*60;case SMOKE:return 50+R()*90;case STEAM:return 90+R()*120;case EMBER:return 80+R()*120;default:return 0;}}
let CAPT=null; // when set, setc records every solid it writes (spawn-menu structures register themselves as intact pieces)
function setc(i,m){
  if(!genMode){ if((KIND[t[i]]===S||KIND[m]===S)&&m!==t[i]){markDirty(i);if(KIND[m]!==S)obAdd(i%W,(i/W)|0);} wake(i); }
  if(CAPT!==null&&KIND[m]===S)CAPT.push(i);
  t[i]=m;col[i]=mkcol(m);life[i]=lifeOf(m);stamp[i]=clock;vel[i]=0;pin[i]=0;rid[i]=0;gnd[i]=NAT[m];
}
function sxy(x,y,m){if(x>=0&&x<W&&y>=0&&y<H)setc(y*W+x,m);}
function swap(i,j){
  const a=t[i];t[i]=t[j];t[j]=a;const c=col[i];col[i]=col[j];col[j]=c;
  const l=life[i];life[i]=life[j];life[j]=l;const v=vel[i];vel[i]=vel[j];vel[j]=v;
  stamp[j]=clock;stamp[i]=clock;wake(i);
}
function canSink(m,tm){if(tm===0)return true;const k=KIND[tm];if(k===G||k===F)return true;if(k===L&&DENS[tm]<DENS[m])return true;return false;}
const NB=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
function rn(i){const x=i%W,y=(i/W)|0,o=NB[(R()*8)|0],nx=x+o[0],ny=y+o[1];return(nx<0||nx>=W||ny<0||ny>=H)?-1:ny*W+nx;}

function step(){
  clock=(clock%255)+1; frame++;
  const tmp=act; act=nxt; nxt=tmp; nxt.fill(0);
  for(let y=H-1;y>=0;y--){
    const rowA=(y>>5)*CW, ltr=((frame+y)&1)===0;
    for(let q=0;q<CW;q++){
      const cx=ltr?q:CW-1-q; if(!act[rowA+cx])continue;
      const xs=cx*CS, xe=xs+CS>W?W:xs+CS;
      for(let k=xs;k<xe;k++){
        const x=ltr?k:xe-1-(k-xs), i=y*W+x, m=t[i];
        if(m===0||stamp[i]===clock)continue;
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
    let v=vel[i]; if(v<5)v++;
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
      let v=vel[i]; if(v<4)v++; let dest=j,yy=y+1;
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
function ignite(j){
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
  if(!g&&R()<.0025&&np<MP-4000)spawn(x,y-1,(R()-.5)*.5,-.5-R()*.9,rgb(255,140+R()*90|0,40),40+R()*50,0,1,0); // embers drift up from big fires
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

// ================= structural support → rotating rigid chunks =================
// Deep natural ground is "pinned" (bedrock-like). Anything not connected to pinned
// ground, the world floor, or resting on loose debris breaks off as a rigid chunk
// that falls, tips over its edge, and shatters on impact.
const vis=new Uint32Array(N), q=new Int32Array(N), bm=new Uint32Array(N), pin=new Uint8Array(N); let vgen=0, bgen=0;
const bodies=[]; const CAP=40000;
let lastBoom={x:0,y:0,f:-999,r:0};
// how much weight one supporting cell of a material can carry, and how heavy each cell is
const LOAD=new Float32Array(NM), MASS=new Float32Array(NM);
LOAD.fill(400);MASS.fill(1);
LOAD[STEEL]=900;LOAD[CONC]=450;LOAD[STONE]=700;LOAD[OBSID]=800;LOAD[WOOD]=250;LOAD[DIRT]=250;LOAD[GLASS]=120;LOAD[LEAF]=20;LOAD[GRASS]=120;
const NAT=new Uint8Array(NM);NAT[DIRT]=NAT[GRASS]=NAT[STONE]=NAT[OBSID]=1; // natural ground vs built structures
const gnd=new Uint8Array(N); // per cell: counts as ground (natural ground, plus streets/decks/tunnels wider than any building)
const str=new Uint8Array(N).fill(10); // per-structure strength (x0.1), set at generation for a 1.5x safety margin
MASS[STEEL]=1.5;MASS[STONE]=1.2;MASS[OBSID]=1.2;MASS[GLASS]=.8;MASS[WOOD]=.5;MASS[LEAF]=.2;MASS[GRASS]=.3;
let collapses=0;
const vis2=new Uint32Array(N), GCAP=150000; let ggen=0, gstart=0;
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
    if(np<MP-300&&R()<.7)spawn(x,y,(R()-.5)*1.2,-R()*.6,col[i],90+R()*60,R()<.25?0:RUBBLE,m===GLASS||m===NEON?1:0);
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
  shake=Math.min(22,shake+Math.min(6,Math.sqrt(n)/12));
}
const unq=[], stk=new Int32Array(N), rid=new Int32Array(N), rcount=[0]; let vstart=0;
// rid: which intact piece a cell belongs to (set at generation and when debris settles). Untouched pieces never topple.
function supportCheck(init){
  // hooks next to fresh damage let go: generated floating pieces only hang until touched
  while(unq.length){const s0=unq.pop();for(const j0 of [s0,s0-1,s0+1,s0-W,s0+W]){if(j0<0||j0>=N||pin[j0]!==2)continue;
    let h=0,tl=0;q[tl++]=j0;pin[j0]=0;while(h<tl){const i=q[h++];for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<N&&pin[j]===2){pin[j]=0;q[tl++]=j;}}}}
  if(dx1<0){if(!init)sweepBg();return;}
  const x0=Math.max(0,dx0-2),x1=Math.min(W-1,dx1+2),y0=Math.max(0,dy0-2),y1=Math.min(H-1,dy1+2);
  dx0=W;dy0=H;dx1=-1;dy1=-1; collapses=0;
  // 1) nothing may hang in the sky: every solid must connect, through solids of ANY material,
  //    to the world floor / bedrock or rest on loose debris. Whatever doesn't becomes chunks or dust.
  gstart=++ggen;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(KIND[t[i]]===S&&vis2[i]<gstart)anchorFlood(i,init);}
  // 2) structural strength: each structure (ground vs built) must carry its own weight
  vstart=++vgen;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(KIND[t[i]]===S&&vis[i]<vstart)flood(i,init);}
  if(!init){ // back walls are swept less often, one dirty area at a time
    sweepBg();}
}
const ob=[W,-1,H,-1]; // where structure was actually destroyed since the last back-wall sweep
function obAdd(x,y){if(x<ob[0])ob[0]=x;if(x>ob[1])ob[1]=x;if(y<ob[2])ob[2]=y;if(y>ob[3])ob[3]=y;}
function sweepBg(){if(frame%8!==0||ob[1]<0)return;orphanBg(ob[0]-70,ob[1]+70,ob[2]-70,ob[3]+70);ob[0]=W;ob[1]=-1;ob[2]=H;ob[3]=-1;}
const BLDS=m=>KIND[m]===S&&!NAT[m]&&m!==LEAF;
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
function dropBg(i,x,y){if(R()<.2&&np<MP-500)spawn(x,y,(R()-.5)*1.5,-R(),shade(bg[i],.8),90,RUBBLE,0);bg[i]=bgD[i];bgB[i]=0;}
function flood(s,init){
  // walk one connected structure (natural ground and built stuff are separate structures)
  // depth-first, diving down first: anything resting on the world floor is proven sound in a few hundred steps
  const id=++vgen; let sp=0,tl=0; stk[sp++]=s; q[tl++]=s; vis[s]=id; let sup=0, mass=0, My=0, Ty=H, smx=-1, smn=W, cmx=0, hook=false, r0=rid[s], mixed=false;
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
    shake=Math.min(22,shake+3+Math.sqrt(tl)/20);
    const b=makeBody(q,k2,false); if(b)b.vy=.8;
  }
}
function makeBody(list,n,held){
  if(n<10||bodies.length>=150){ for(let k=0;k<n;k++){const i=list[k];t[i]=RUBBLE;pin[i]=0;wake(i);} return null; }
  if(n>1200&&MODE&&MODE.onCollapse&&!genMode)MODE.onCollapse(n,MS);
  let mx=W,my=H,Mx=0,My=0,sx=0,sy=0;
  for(let k=0;k<n;k++){const i=list[k],x=i%W,y=(i/W)|0;if(x<mx)mx=x;if(y<my)my=y;if(x>Mx)Mx=x;if(y>My)My=y;sx+=x;sy+=y;}
  const lw=Mx-mx+1, lh=My-my+1, lm=new Uint8Array(lw*lh), lc=new Uint32Array(lw*lh); obAdd(mx,my);obAdd(Mx,My);
  const cx=sx/n-mx, cy=sy/n-my;
  for(let k=0;k<n;k++){const i=list[k],x=i%W-mx,y=((i/W)|0)-my;lm[y*lw+x]=t[i];lc[y*lw+x]=col[i];t[i]=0;pin[i]=0;wake(i);}
  // backdrop walls enclosed by this structure come along
  for(let y=0;y<lh;y++){let L=-1,Rr=-1;for(let x=0;x<lw;x++)if(lm[y*lw+x]){if(L<0)L=x;Rr=x;}
    for(let x=L+1;x<Rr;x++){const o=y*lw+x;if(lm[o])continue;const i=(my+y)*W+mx+x;if(!bgB[i])continue;lm[o]=BACK;lc[o]=shade(bg[i],.85);bg[i]=bgD[i];bgB[i]=0;}}
  const b=finishBody(lm,lc,lw,lh,cx,cy,mx+cx,my+cy,0,n,held);
  if(frame-lastBoom.f<20){ // fling + spin away from the blast that cut it loose
    const ddx=b.x-lastBoom.x,ddy=b.y-lastBoom.y,d=Math.hypot(ddx,ddy)||1;
    if(d<lastBoom.r*6){const f=Math.min(3.5,lastBoom.r*9/(d+10))*Math.min(1,400/n);b.vx+=ddx/d*f;b.vy+=ddy/d*f-.6;b.va+=(R()-.5)*f*.03;}
  }
  return b;
}
function finishBody(lm,lc,lw,lh,cx,cy,x,y,a,n,held){
  // edge cells are enough for collision
  const ex=[],ey=[];let rmax=1,ds=0;
  let gl2=0,st2=0;
  for(let yy=0;yy<lh;yy++)for(let xx=0;xx<lw;xx++){const o=yy*lw+xx,m=lm[o];if(!m)continue;ds+=m===BACK?20:DENS[m];if(m===GLASS||m===ICE)gl2++;if(m===STEEL)st2++;
    if(xx===0||yy===0||xx===lw-1||yy===lh-1||!lm[o-1]||!lm[o+1]||!lm[o-lw]||!lm[o+lw]){ex.push(xx-cx);ey.push(yy-cy);rmax=Math.max(rmax,Math.hypot(xx-cx,yy-cy));}}
  const b={x,y,a,vx:0,vy:0,va:(R()-.5)*.004,n,lw,lh,lm,lc,cx,cy,ex:Float32Array.from(ex),ey:Float32Array.from(ey),rmax,held,age:0,rest:0,w:lw,h:lh,dens:Math.max(1,ds/n),gen:0,hitP:-99,glassy:gl2>n*.5,st:st2/n};
  bodies.push(b); return b;
}
// a heavy chunk moving fast smashes through whatever it hits instead of stopping dead.
// returns the speed it loses, or 0 if what it hit is too strong.
function crush(b,x,y,a,v,ux,uy){
  const c=Math.cos(a),s=Math.sin(a),ex=b.ex,ey=b.ey;let cost=0;
  for(let k=0;k<ex.length;k++){const X=Math.round(x+ex[k]*c-ey[k]*s),Y=Math.round(y+ex[k]*s+ey[k]*c);
    if(X<0||X>=W||Y>=H-1)return 0;if(Y<0)continue;const m=t[Y*W+X];if(!m)continue;const kd=KIND[m];if(kd!==S&&kd!==P)continue;
    cost+=kd===P?.35:(1.2+HARD[m]*1.6)*(NAT[m]?3:1)*(m===STEEL?1.6:1);}
  const dv=cost*.9/Math.pow(b.n,.75);
  if(v-dv<2.5)return 0;
  for(let k=0;k<ex.length;k++){const X=Math.round(x+ex[k]*c-ey[k]*s),Y=Math.round(y+ex[k]*s+ey[k]*c);if(Y<0)continue;
    const j=Y*W+X,m=t[j];if(!m)continue;const kd=KIND[m];if(kd!==S&&kd!==P)continue;
    if(np<MP-200&&R()<.7){const sd=X<b.x?-1:1;
      spawn(X,Y,ux*v*(.3+R()*.4)+(uy?sd*(.4+R()*v*.45):(R()-.5)*1.5),uy*v*.15-R()*v*.45-(ux?R():0),col[j],80+R()*70,kd===S?RUBBLE:m,m===GLASS?1:0);}
    if(bgB[j]){bg[j]=bgD[j];bgB[j]=0;}
    setc(j,EMPTY);if(R()<.04)dust(X-ux*2|0,Y-uy*2|0);
  }
  shake=Math.max(shake,Math.min(9,cost*.03));
  return dv;
}
// a hard landing breaks a big chunk along jagged cracks into smaller chunks that bounce and tumble on
function fracture(b,impact){
  impact=Math.min(impact,10);
  if(b.n>400){fxWord(b.x,b.y-b.rmax*.6,R()<.5?'KRUNCH!':'KRASH!',Math.min(1.6,.8+b.n/4000),'#f3e9d2',true);hitstop=Math.max(hitstop,2);}
  const lw=b.lw,lh=b.lh,lm=b.lm,lc=b.lc,c=Math.cos(b.a),s=Math.sin(b.a);
  const K=Math.min(8,2+(Math.sqrt(b.n)/10|0)+(impact>8?1:0)),sx=[],sy=[];snd('crumble',b.x,b.y,{size:Math.min(2.2,.6+Math.sqrt(b.n)/30),gap:.08});snd('thud',b.x,b.y,{v:Math.min(1,impact/6)});
  for(let k=0;k<K;k++){let o=0,tries=0;do{o=R()*lw*lh|0;}while(!lm[o]&&++tries<60);sx.push(o%lw);sy.push(o/lw|0);}
  const own=new Int8Array(lw*lh).fill(-1),cnt=new Int32Array(K);
  const wx=(x,y)=>b.x+(x-b.cx)*c-(y-b.cy)*s, wy=(x,y)=>b.y+(x-b.cx)*s+(y-b.cy)*c;
  for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const o=y*lw+x,m=lm[o];if(!m)continue;
    let b1=1e9,b2=1e9,k1=0;for(let k=0;k<K;k++){const dx=x-sx[k],dy=y-sy[k],d=dx*dx+dy*dy;if(d<b1){b2=b1;b1=d;k1=k;}else if(d<b2)b2=d;}
    if(Math.sqrt(b2)-Math.sqrt(b1)<.8+R()*1.6){ // crack line crumbles into flying debris
      if(np<MP-300&&R()<.6)spawn(wx(x,y),wy(x,y),b.vx*.3+(R()-.5)*impact*.7,-R()*impact*.55,lc[o],90+R()*70,m===BACK||KIND[m]===S?RUBBLE:m,m===GLASS?1:0);
      continue;}
    own[o]=k1;cnt[k1]++;}
  for(let k=0;k<K;k++){
    if(cnt[k]<12){for(let o=0;o<lw*lh;o++)if(own[o]===k&&np<MP-100){const x=o%lw,y=o/lw|0;spawn(wx(x,y),wy(x,y),(R()-.5)*impact*.6,-R()*impact*.5,lc[o],100,lm[o]===BACK||KIND[lm[o]]===S?RUBBLE:lm[o],0);}continue;}
    let mx=lw,my=lh,Mx=0,My=0,sx2=0,sy2=0;
    for(let o=0;o<lw*lh;o++)if(own[o]===k){const x=o%lw,y=o/lw|0;if(x<mx)mx=x;if(y<my)my=y;if(x>Mx)Mx=x;if(y>My)My=y;sx2+=x;sy2+=y;}
    const w=Mx-mx+1,h=My-my+1,nlm=new Uint8Array(w*h),nlc=new Uint32Array(w*h);
    for(let o=0;o<lw*lh;o++)if(own[o]===k){const x=o%lw-mx,y=(o/lw|0)-my;nlm[y*w+x]=lm[o];nlc[y*w+x]=lc[o];}
    const gx=sx2/cnt[k],gy=sy2/cnt[k],X=wx(gx,gy),Y=wy(gx,gy);
    const nb=finishBody(nlm,nlc,w,h,gx-mx,gy-my,X,Y,b.a,cnt[k],false);
    const ox=X-b.x,oy=Y-b.y,od=Math.hypot(ox,oy)||1;
    nb.vx=b.vx*.45+ox/od*impact*(.12+R()*.14)+(R()-.5)*.6;
    nb.vy=-impact*(.12+R()*.18)+Math.min(0,oy/od)*impact*.1;
    nb.va=b.va*.5+(R()-.5)*.05+ox/od*.01;nb.gen=b.gen+1;nb.thrown=b.thrown;nb.safeP=b.safeP;
  }
  for(let k=0;k<Math.min(40,b.n/30);k++){const e=R()*b.ex.length|0;dust(wx(b.ex[e]+b.cx,b.ey[e]+b.cy)|0,wy(b.ex[e]+b.cx,b.ey[e]+b.cy)-2|0);}
  shake=Math.min(22,shake+Math.min(12,impact*Math.sqrt(b.n)/30));
  rings.push({x:b.x,y:b.y+b.rmax*.5,r:4,vr:2.5+impact*.4,life:20,c:[200,190,170]});
  flash(b.x,b.y+b.rmax*.5,b.rmax*1.2,[255,230,190],5);
  if(b.thrown&&impact>4)explode(b.x,b.y,Math.min(12,impact*1.3|0),{fire:.1});
}
function bodyHitPose(b,x,y,a){
  const c=Math.cos(a),s=Math.sin(a),ex=b.ex,ey=b.ey;
  for(let k=0;k<ex.length;k++){
    const X=Math.round(x+ex[k]*c-ey[k]*s), Y=Math.round(y+ex[k]*s+ey[k]*c);
    if(X<0||X>=W||Y>=H)return true; if(Y<0||b.held)continue;
    const m=t[Y*W+X]; if(m!==0){const kd=KIND[m];if(kd===S||kd===P)return true;}
  }
  return false;
}
function bodyHit(b,ox,oy){return bodyHitPose(b,b.x+ox,b.y+oy,b.a);}
function contacts(b){
  const c=Math.cos(b.a),s=Math.sin(b.a);let n=0,sum=0,mn=1e9,mxx=-1e9;
  for(let k=0;k<b.ex.length;k++){const X=Math.round(b.x+b.ex[k]*c-b.ey[k]*s),Y=Math.round(b.y+b.ex[k]*s+b.ey[k]*c)+1;
    if(X<0||X>=W||Y<0)continue;if(Y>=H||KIND[t[Y*W+X]]===S||KIND[t[Y*W+X]]===P){n++;sum+=X;if(X<mn)mn=X;if(X>mxx)mxx=X;}}
  return{n,avg:n?sum/n:0,min:mn,max:mxx};
}
function bodyAt(b,X,Y){ // local material under a world point
  const c=Math.cos(b.a),s=Math.sin(b.a),dx=X-b.x,dy=Y-b.y;
  const lx=Math.round(dx*c+dy*s+b.cx),ly=Math.round(-dx*s+dy*c+b.cy);
  return(lx<0||ly<0||lx>=b.lw||ly>=b.lh)?0:b.lm[ly*b.lw+lx];
}
function updBodies(){
  for(let n=bodies.length-1;n>=0;n--){
    const b=bodies[n]; b.age++;
    if(stasis&&inStasis(b.x,b.y))continue; // hangs in the air until the bubble pops
    if(b.held){ if(!b.overhead){b.vx=(b.vx+((b.tx??mouse.wx)-b.x)*.18)*.72; b.vy=(b.vy+((b.ty??mouse.wy)-b.y)*.18)*.72; b.va*=.9;} }
    else { b.vy+=.3; b.vx*=.996; b.va*=.997; if(b.topple&&b.age<90)b.va+=b.topple*.0015; }
    const sp=Math.hypot(b.vx,b.vy); if(sp>12){b.vx*=12/sp;b.vy*=12/sp;}
    if(Math.abs(b.va)>.12)b.va=Math.sign(b.va)*.12;
    const ns=Math.min(14,Math.max(1,Math.ceil(Math.max(Math.abs(b.vx),Math.abs(b.vy),Math.abs(b.va)*b.rmax))));
    let landed=false, impact=0, grounded=false;
    for(let s=0;s<ns&&!landed;s++){
      // vertical
      const ny=b.y+b.vy/ns;
      let dv=0;
      if(!bodyHitPose(b,b.x,ny,b.a))b.y=ny;
      else if(b.vy>3&&!b.held&&b.n>=30&&(dv=crush(b,b.x,ny,b.a,b.vy,0,1))){b.vy-=dv;b.y=ny;}
      else if(b.vy>0&&!b.held){
        grounded=true;
        const hit=b.vy+Math.abs(b.va)*b.rmax*.6, c=contacts(b);
        const off=b.x-c.avg, stable=c.n===0||(b.x>=c.min-1&&b.x<=c.max+1);
        if(hit>5||(stable&&Math.abs(b.va)<.01)){landed=true;impact=hit;break;}
        if(!stable){ // tip over the edge: torque from the overhanging centre of mass
          b.va+=Math.sign(off)*Math.min(.014,Math.abs(off)*.0009+.002); b.vx+=Math.sign(off)*.04;
        }
        if(hit>2.5)debrisBurst(b,hit*.5,4);
        b.vy*=-.08;
      } else b.vy=0;
      // horizontal
      const nx=b.x+b.vx/ns;
      if(!bodyHitPose(b,nx,b.y,b.a))b.x=nx;
      else if(Math.abs(b.vx)>3&&!b.held&&b.n>=30&&(dv=crush(b,nx,b.y,b.a,Math.abs(b.vx),Math.sign(b.vx),0))){b.vx-=Math.sign(b.vx)*dv;b.x=nx;}
      else{ if(Math.abs(b.vx)>4.5&&!b.held){landed=true;impact=Math.abs(b.vx);break;} b.vx*=-.25; }
      // rotation
      const na=b.a+b.va/ns;
      if(!bodyHitPose(b,b.x,b.y,na))b.a=na;
      else{ if(Math.abs(b.va)*b.rmax>5&&!b.held){landed=true;impact=Math.abs(b.va)*b.rmax;break;} b.va*=-.3; }
    }
    if(!landed&&!b.held){
      if(grounded&&Math.abs(b.vx)<.4&&Math.abs(b.vy)<.6&&Math.abs(b.va)<.006)b.rest++;else b.rest=Math.max(0,b.rest-1);
      if(b.rest>10||b.age>1200){landed=true;impact=Math.max(1,Math.abs(b.vy));}
    }
    // splash liquids / sweep gas the chunk overlaps, tear through back walls; shed dust while moving fast
    const c=Math.cos(b.a),s=Math.sin(b.a),spd=Math.hypot(b.vx,b.vy)+Math.abs(b.va)*b.rmax;let wet=0,wl=WATER;
    for(let k=0;k<b.ex.length;k++){const X=Math.round(b.x+b.ex[k]*c-b.ey[k]*s),Y=Math.round(b.y+b.ex[k]*s+b.ey[k]*c);if(X<0||X>=W||Y<0||Y>=H)continue;const j=Y*W+X,m=t[j];
      if(m===0){if(spd>3&&!b.held&&bgB[j]&&R()<.35){if(np<MP-200)spawn(X,Y,b.vx*.5+(R()-.5)*2,b.vy*.3-R(),shade(bg[j],.8),80,RUBBLE,0);bg[j]=bgD[j];bgB[j]=0;}continue;}
      const kd=KIND[m];if(kd===S||kd===P)continue;
      if(kd===L){wet++;wl=m;if(spd>1.5){if(np<MP-200)spawn(X,Y,(R()-.5)*2+b.vx*.4,-.6-R()*1.5-Math.abs(b.vy)*.4,col[j],70,m,0);setc(j,EMPTY);if(spd>3&&!b.splashed){b.splashed=1;snd('splash',X,Y,{v:Math.min(1,spd/6)});}}}
      else setc(j,EMPTY);}
    if(wet&&!b.held){const f=wet/b.ex.length;b.vy-=f*.7*DENS[wl]/b.dens;b.vx*=1-f*.12;b.vy*=1-f*.12;b.va*=1-f*.1;if(f>.15)b.rest=0;}
    if(!b.held&&!(b.safeP>frame)&&spd>3&&b.age>4&&frame-b.hitP>20&&Math.abs(pl_.x-b.x)<b.rmax+4&&Math.abs(pl_.y-PH/2-b.y)<b.rmax+8&&bodyAt(b,pl_.x,pl_.y-PH/2)){
      b.hitP=frame;hurt(Math.min(30,spd*Math.sqrt(b.n)/12));pl_.vx+=b.vx*.7;pl_.vy+=b.vy*.7;shake=Math.max(shake,6);}
    if(spd>1.5&&!b.held){const cnt=Math.min(8,(b.ex.length/120)*spd|0);for(let k=0;k<cnt;k++){const e=R()*b.ex.length|0;const X=b.x+b.ex[e]*c-b.ey[e]*s,Y=b.y+b.ex[e]*s+b.ey[e]*c;spawn(X,Y,b.vx*.6+(R()-.5)*1.5,b.vy*.4-R(),R()<.5?rgb(150,140,125):rgb(110,105,98),40+R()*40,0,0,1);}}
    if(landed){ landBody(b,impact); bodies.splice(n,1); }
    else if(b.y>H+80){ bodies.splice(n,1); }
  }
}
function debrisBurst(b,power,cnt){
  const c=Math.cos(b.a),s=Math.sin(b.a);
  for(let k=0;k<cnt;k++){const e=R()*b.ex.length|0;const X=b.x+b.ex[e]*c-b.ey[e]*s,Y=b.y+b.ex[e]*s+b.ey[e]*c;spawn(X,Y-1,(R()-.5)*power,-R()*power,rgb(160,150,135),50,0,0,1);}
}
function landBody(b,impact){
  impact*=1+Math.min(2.5,b.h/80); // heavy, tall chunks hit harder
  if(impact>4.5&&b.n>=100&&b.gen<2&&!b.held&&bodies.length<140){fracture(b,impact);return;}
  bgen++;
  const c=Math.cos(b.a),s=Math.sin(b.a),hw=b.lw/2+2,hh=b.lh/2+2;
  const ext=Math.ceil(Math.abs(hw*c)+Math.abs(hh*s))+2, eyt=Math.ceil(Math.abs(hw*s)+Math.abs(hh*c))+2;
  const ccx=b.x+((b.lw/2-b.cx)*c-(b.lh/2-b.cy)*s), ccy=b.y+((b.lw/2-b.cx)*s+(b.lh/2-b.cy)*c);
  const list=[];
  for(let Y=Math.max(0,ccy-eyt|0);Y<Math.min(H,ccy+eyt+1);Y++)for(let X=Math.max(0,ccx-ext|0);X<Math.min(W,ccx+ext+1);X++){
    const dx=X-b.x,dy=Y-b.y,lx=Math.round(dx*c+dy*s+b.cx),ly=Math.round(-dx*s+dy*c+b.cy);
    if(lx<0||ly<0||lx>=b.lw||ly>=b.lh)continue;const o=ly*b.lw+lx,m=b.lm[o];if(!m)continue;
    const j=Y*W+X;if(t[j]!==0&&KIND[t[j]]!==G&&KIND[t[j]]!==F)continue;
    if(m===BACK){ // backdrop wall smashes into a heap of wreckage
      if(R()<.5){if(impact>2&&R()<.4){spawn(X,Y,(R()-.5)*impact*.8,-R()*impact*.6,b.lc[o],90,RUBBLE,0);}else{t[j]=RUBBLE;col[j]=b.lc[o];life[j]=0;vel[j]=2;wake(j);}}
      else if(R()<.05)dust(X,Y);
      continue;}
    t[j]=m;col[j]=b.lc[o];life[j]=0;vel[j]=0;pin[j]=0;gnd[j]=NAT[m];str[j]=12;bm[j]=bgen;wake(j);markDirty(j);list.push(j);
  }
  const thrown=b.thrown&&impact>4;
  // crack lines across tall chunks so they keep breaking apart
  const cracks=[]; if(b.h>24&&impact>2.5)for(let k=0;k<Math.min(6,b.h/18|0);k++)cracks.push(R()*b.h|0);
  let burst=0;
  for(const j of list){
    const X=j%W,Y=(j/W)|0;if(Y>=H-1)continue;const m=t[j], bottom=bm[j+W]!==bgen;
    const ly=Math.round(-(X-b.x)*s+(Y-b.y)*c+b.cy);
    let p=m===GLASS||m===ICE&&b.icicle?(impact>1.2?1:.4):Math.max(0,(impact-1.4)*.16)*(bottom?2.4:1)/(1+HARD[m]*.08);
    if(cracks.includes(ly))p=Math.max(p,.9);
    if(R()<p){
      if(R()<.45&&impact>2.2&&burst<2500){burst++;const up=bottom?1.4:1;
        spawn(X,Y,(R()-.5)*impact*.9+b.vx*.4,-R()*impact*.7*up+b.vy*.2,col[j],90+R()*60,KIND[m]===S?RUBBLE:m,m===GLASS?1:0);t[j]=0;}
      else t[j]=m===LEAF||m===GRASS?(R()<.5?ASH:RUBBLE):RUBBLE;
      wake(j);
    }
    if(bottom&&impact>2.5&&R()<.12)dust(X,Y-2);
  }
  {const r=rcount.length;let c=0;for(const j of list)if(KIND[t[j]]===S){rid[j]=r;c++;}rcount.push(c);} // settled debris counts as an intact piece
  if(impact>1.8){snd(b.glassy?'glass':'crumble',b.x,b.y,{size:Math.min(2,Math.sqrt(b.n)/40),v:Math.min(1,impact/4),gap:.06});shake=Math.min(22,shake+Math.min(12,impact*Math.sqrt(b.n)/35)); rings.push({x:b.x,y:b.y+b.lh/2,r:3,vr:2+impact*.35,life:18,c:[190,180,160]});}
  if(thrown)explode(b.x,b.y,Math.min(12,impact*1.3|0),{fire:.1});
}
function dust(X,Y){if(X<0||X>=W||Y<0||Y>=H)return;const i=Y*W+X;if(t[i]!==0)return;setc(i,SMOKE);const v=(R()*20)|0;col[i]=rgb(150+v,135+v,115+v);life[i]=70+R()*80;}

// ================= look: settings, time of day, colour grading =================
const SET=Object.assign({tod:'auto',dim:55,shake:80,words:true,ink:true,bloom:true,fps:false,sound:true,vol:70,fx:true,light:true},(()=>{try{return JSON.parse(localStorage.getItem('ironsorc.settings')||'{}');}catch(e){return {};}})());
function saveSet(){try{localStorage.setItem('ironsorc.settings',JSON.stringify(SET));}catch(e){}}
// sky gradient top/bottom, haze (what distant things fade into), light on the foreground, window lights on/off
const TODS={
  dawn:{top:[64,86,170],bot:[250,170,120],haze:[214,160,150],light:[1.02,.92,.92],sun:[255,214,160],win:.5,stars:.15,clouds:[255,196,170]},
  day:{top:[64,140,226],bot:[196,228,246],haze:[176,204,228],light:[1.1,1.08,1.04],sun:[255,250,224],win:0,stars:0,clouds:[255,255,255]},
  dusk:{top:[52,34,104],bot:[244,128,78],haze:[170,100,120],light:[1.02,.84,.76],sun:[255,150,90],win:.9,stars:.35,clouds:[255,150,120]},
  night:{top:[6,8,26],bot:[36,32,78],haze:[30,32,66],light:[.62,.68,.92],moon:true,win:1,stars:1,clouds:null},
};
let farBase=null, farSky=null, farKeep=null; // farKeep: landmark pixels (the X-Mansion) that skip most of the background fade
const fgL=new Uint8Array(768), bgL=new Uint8Array(768), rimL=new Uint8Array(768), inkL=new Uint8Array(768), htL=new Uint8Array(768);
const lut=(L,c)=>((255<<24)|(L[512+((c>>16)&255)]<<16)|(L[256+((c>>8)&255)]<<8)|L[c&255])>>>0;
function buildLUT(){
  const T=TODS[SET.tod],Lc=T?T.light:[1,1,1],dim=SET.dim/100;
  for(let k=0;k<3;k++)for(let v=0;v<256;v++){const j=k*256+v;
    fgL[j]=cl(v*Lc[k]);bgL[j]=cl(v*Lc[k]*(1-dim*.55));rimL[j]=cl(v*1.22+12);inkL[j]=cl(v*.36);htL[j]=cl(v*.8);}
}
function mix3(c,t,k){return rgb((c&255)+(t[0]-(c&255))*k,((c>>8)&255)+(t[1]-((c>>8)&255))*k,((c>>16)&255)+(t[2]-((c>>16)&255))*k);}
function lumC(c){return((c&255)*.3+((c>>8)&255)*.59+((c>>16)&255)*.11);}
// regrade the parallax backdrop for the chosen time of day, and push it back (desaturate + haze) so gameplay reads first
function applyTOD(){
  buildLUT();
  if(!farBase)return;
  const T=TODS[SET.tod],dim=SET.dim/100;let seed=1234567;const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
  let haze;
  if(T)haze=T.haze;else{let r=0,g=0,b=0,n=0;const y=(H*.35)|0;for(let x=0;x<FW;x+=7){const c=farBase[y*FW+x];r+=c&255;g+=(c>>8)&255;b+=(c>>16)&255;n++;}haze=[r/n,g/n,b/n];}
  for(let y=0;y<H;y++){
    const f=Math.min(1,y/(H*.55));
    const sky=T?rgb(T.top[0]+(T.bot[0]-T.top[0])*f,T.top[1]+(T.bot[1]-T.top[1])*f,T.top[2]+(T.bot[2]-T.top[2])*f):0;
    for(let x=0;x<FW;x++){const i=y*FW+x;let c=farBase[i];
      if(farSky[i]){if(T){c=sky;if(T.stars&&y<H*.4&&rnd()<.004*T.stars)c=rgb(230,230,255);}c=mix3(c,haze,dim*.18);}
      else{
        const keep=farKeep&&farKeep[i];
        if(T&&lumC(c)>140&&T.win<1){c=keep?mix3(c,[64,74,96],(1-T.win*.7)*.8):mix3(c,haze,1-T.win*.7);} // lights off in daylight
        const l=lumC(c),k=keep?.1:.4;c=rgb((c&255)+(l-(c&255))*k,((c>>8)&255)+(l-((c>>8)&255))*k,((c>>16)&255)+(l-((c>>16)&255))*k);
        c=mix3(c,haze,keep?.04+dim*.12:.22+dim*.42);
      }
      far[i]=c;}
  }
  if(T){ // sun or moon with a halo, and a few flat comic clouds
    const sx=(FW*.72)|0,sy=(H*.13)|0,R0=T.moon?10:14;
    for(let y=-R0*4;y<=R0*4;y++)for(let x=-R0*4;x<=R0*4;x++){const X=sx+x,Y=sy+y;if(X<0||X>=FW||Y<0||Y>=H)continue;const i=Y*FW+X;if(!farSky[i])continue;const d=Math.hypot(x,y);
      if(d<R0){let c=T.moon?rgb(236,232,214):rgb(...T.sun);if(T.moon&&((x+4)*(x+4)+(y+2)*(y+2)<9||(x-3)*(x-3)+(y-4)*(y-4)<5))c=rgb(200,196,184);far[i]=d>R0-1.2?rgb(20,17,15):c;}
      else far[i]=mix3(far[i],T.moon?[120,130,170]:T.sun,Math.max(0,.45*(1-(d-R0)/(R0*3))));}
    if(T.clouds)for(let k=0;k<16;k++){const cx=rnd()*FW|0,cy=(H*.05+rnd()*H*.22)|0,w=20+rnd()*50,h=6+rnd()*8;
      for(let y=-h-1;y<=h+1;y++)for(let x=-w-1;x<=w+1;x++){const X=cx+x|0,Y=cy+y|0;if(X<0||X>=FW||Y<0||Y>=H)continue;const i=Y*FW+X;if(!farSky[i])continue;
        const e=(x*x)/(w*w)+(y*y)/(h*h)+Math.sin(x*.3+k)*.12;if(e<1)far[i]=mix3(far[i],y>h*.3?T.clouds.map(v=>v*.8):T.clouds,.75);else if(e<1.15&&y>0)far[i]=mix3(far[i],[20,17,15],.35);}}
  }
}

// ================= map generation =================
let far=null, FW=0; const PAR=.35; const SURF=new Int16Array(W); let PIN2=null;
function fill(x0,y0,x1,y1,m,p=1){for(let y=Math.max(0,y0|0);y<Math.min(H,y1|0);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x1|0);x++)if(p>=1||R()<p)setc(y*W+x,m);}
function disc(cx,cy,r,m,p=1){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r&&(p>=1||R()<p))sxy(cx+x|0,cy+y|0,m);}
function tint(x0,y0,x1,y1,r,g,b,v){for(let y=y0|0;y<y1;y++)for(let x=x0|0;x<x1;x++){if(x<0||x>=W||y<0||y>=H)continue;const n=(R()*2-1)*v;col[y*W+x]=rgb(cl(r+n),cl(g+n),cl(b+n));}}
function bgRect(x0,y0,x1,y1,c){for(let y=Math.max(0,y0|0);y<Math.min(H,y1|0);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x1|0);x++)bg[y*W+x]=c;}
function makeFar(top,bot,layer){
  FW=VW+Math.ceil((W-VW)*PAR)+2; far=new Uint32Array(FW*H); farKeep=new Uint8Array(FW*H);
  for(let y=0;y<H;y++){const f=y/H;const c=rgb(top[0]+(bot[0]-top[0])*f,top[1]+(bot[1]-top[1])*f,top[2]+(bot[2]-top[2])*f);far.fill(c,y*FW,(y+1)*FW);}
  const grad=far.slice();
  layer&&layer();
  farBase=far.slice();farSky=new Uint8Array(FW*H);for(let i=0;i<FW*H;i++)farSky[i]=far[i]===grad[i]?1:0;
}
function clearAll(){BLD.length=0;t.fill(0);life.fill(0);stamp.fill(0);vel.fill(0);bg.fill(0);bodies.length=0;}

function cityUnder(GY){
  // ground: asphalt, dirt, subway, bedrock
  fill(0,GY,W,GY+4,CONC); tint(0,GY,W,GY+4,45,45,50,5);
  for(let x=0;x<W;x+=14){fill(x,GY,x+6,GY+1,CONC);tint(x,GY,x+6,GY+1,200,190,90,10);}
  fill(0,GY+4,W,GY+20,DIRT); fill(0,GY+20,W,H,STONE);
  bgRect(0,GY+4,W,H,rgb(30,22,18));
  // subway tunnel with rails + a train
  fill(0,GY+8,W,GY+9,CONC); fill(0,GY+19,W,GY+21,CONC); fill(0,GY+9,W,GY+19,EMPTY); bgRect(0,GY+9,W,GY+19,rgb(26,26,32));
  for(let x=0;x<W;x+=40)fill(x,GY+9,x+3,GY+19,CONC);
  fill(0,GY+18,W,GY+19,STEEL);
  { const tx=300+R()*800|0; for(let c=0;c<3;c++){const x=tx+c*44; fill(x,GY+11,x+40,GY+18,STEEL); tint(x,GY+11,x+40,GY+18,170,175,185,6); for(let w=x+3;w<x+38;w+=7)fill(w,GY+12,w+4,GY+14,GLASS);} }
  // sewer with water under the tunnel
  fill(0,GY+27,W,GY+28,STEEL); fill(0,GY+28,W,GY+35,EMPTY); fill(0,GY+31,W,GY+35,WATER); fill(0,GY+35,W,GY+36,STEEL);
  bgRect(0,GY+28,W,GY+35,rgb(18,22,24));
  for(let x=20;x<W;x+=64)fill(x,GY+28,x+3,GY+35,CONC);
  // deep underground: clay, caverns, a buried lake, magma at the bottom, obsidian floor
  const s0=R()*100;
  fill(0,GY+36,W,GY+70,DIRT); tint(0,GY+36,W,GY+70,120,80,60,12);
  for(let y=GY+80;y<H-6;y++)for(let x=0;x<W;x++)if(noise2(x,y,s0)>.38)setc(y*W+x,EMPTY);
  for(let y=GY+36;y<H;y++)for(let x=0;x<W;x++)bg[y*W+x]=rgb(30-(y-GY)/20,22-(y-GY)/22,18-(y-GY)/24);
  { const lx=200+R()*1200|0; for(let y=GY+100;y<GY+150;y++)for(let x=lx-90;x<lx+90;x++)if(x>=0&&x<W&&((x-lx)/90)**2+((y-GY-125)/25)**2<1)setc(y*W+x,y>GY+118?WATER:EMPTY); }
  for(let y=H-34;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0||y>H-20&&R()<.8)setc(i,y>H-24?LAVA:EMPTY);}
  fill(0,H-4,W,H,OBSID);
  for(let y=H-60;y>GY+80;y--)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0&&t[i+W]===STONE&&R()<.01)disc(x,y-2,3,R()<.15?ACID:WATER);}
  SURF.fill(GY+40); PIN2=[GY,GY+8];
  bgD.set(bg);
}
function genCity(){
  clearAll();
  const GY=330, GB=143+(GY-143)*.5|0;
  makeFar([10,8,26],[90,46,64],()=>{
    // stars + moon + two skyline layers
    for(let k=0;k<500;k++){const x=R()*FW|0,y=R()*(GB-60)|0;far[y*FW+x]=rgb(200,200,220);}
    for(let y=-14;y<=14;y++)for(let x=-14;x<=14;x++)if(x*x+y*y<196)far[(60+y)*FW+120+x]=rgb(220,230,200);
    for(const [base,c,lit] of [[GB-20,rgb(30,24,50),.15],[GB+15,rgb(22,18,38),.35]]){
      for(let x=0;x<FW;){const w=8+R()*26|0,h=30+R()*160|0;for(let y=base-h;y<H;y++)for(let xx=x;xx<x+w&&xx<FW;xx++){const on=(xx%4===1&&y%6===2&&R()<lit);far[y*FW+xx]=on?rgb(150,130,70):c;}x+=w+1+(R()*3|0);}
    }
  });
  cityUnder(GY);
  // districts left→right
  let x=6;
  const zones=[];
  while(x<W-40){
    const r=R();
    if(r<.09&&!zones.includes('park')){ zones.push('park'); x=park(x,GY); }
    else if(r<.17&&!zones.includes('gas')){ zones.push('gas'); x=gasStation(x,GY); }
    else if(r<.25&&!zones.includes('bridge')&&x<W-320){ zones.push('bridge'); x=bridge(x,GY); }
    else if(r<.33&&!zones.includes('crane')){ zones.push('crane'); x=crane(x,GY); }
    else if(r<.5){ x=houseRow(x,GY); }
    else {
      const w=40+R()*50|0, h=70+R()*(r>.85?240:150)|0, x1=Math.min(W-2,x+w);
      R()<.3?glassTower(x,x1,Math.max(40,GY-h),GY):building(x,x1,Math.max(40,GY-h),GY);
      x=x1;
    }
    const gap=10+R()*24|0;
    if(gap>22&&x+gap<W)car(x+3,GY);
    else if(x+gap<W){const r2=R();if(r2<.35){fill(x+2,GY-7,x+12,GY,STEEL);tint(x+2,GY-7,x+12,GY,40,90,50,8);fill(x+3,GY-6,x+11,GY-1,ASH);}else if(r2<.7){for(let k=0;k<1+(R()*3|0);k++){const cy=GY-6*(k+1);fill(x+2,cy,x+8,cy+6,WOOD);tint(x+2,cy,x+8,cy+6,160,120,70,12);}}else{fill(x+4,GY-30,x+5,GY,STEEL);fill(x+4,GY-30,x+9,GY-29,STEEL);fill(x+8,GY-29,x+10,GY-27,GLASS);}}
    x+=gap;
  }
}
const BLD=[];
function building(x0,x1,top,GY){
  const fh=16;BLD.push([x0,x1,top]);
  const WCS=[[150,148,142],[140,90,70],[170,160,130],[110,115,125],[86,128,140],[176,96,72],[196,160,84],[120,96,140],[132,160,138],[188,120,110]],wc=WCS[R()*WCS.length|0];
  for(let y=top;y<GY;y++){
    const fy=(y-top)%fh, win=fy>=5&&fy<=12;
    for(const xx of [x0,x0+1,x0+2,x1-3,x1-2,x1-1]){ const isWin=win&&(xx!==x0&&xx!==x1-1); setc(y*W+xx,isWin?GLASS:CONC); if(!isWin)tint(xx,y,xx+1,y+1,wc[0],wc[1],wc[2],8);}
  }
  for(let y=top;y<GY;y+=fh){fill(x0,y,x1,y+3,CONC);tint(x0,y+2,x1,y+3,110,108,104,6);}
  // interior partition walls with doorways, plus a stairwell core
  for(let px=x0+12+(R()*8|0);px<x1-10;px+=20+(R()*10|0))for(let y=top+3;y<GY;y++){if((y-top)%fh>=fh-8&&(y-top)%fh<fh)continue;fill(px,y,px+2,y+1,CONC);tint(px,y,px+2,y+1,wc[0]-20,wc[1]-20,wc[2]-20,6);}
  for(let cx=x0;cx<x1;cx+=18)fill(cx,top,cx+1,GY,STEEL);
  fill(x1-1,top,x1,GY,STEEL);
  // interior backdrop: wallpaper, lit windows, doors
  const wall=[rgb(52,42,56),rgb(40,48,58),rgb(58,50,40),rgb(36,54,52),rgb(62,40,44)][R()*5|0];
  for(let y=top+2;y<GY;y++)for(let xx=x0+3;xx<x1-3;xx++){const i=y*W+xx,fy=(y-top)%fh;
    bg[i]=(fy>4&&fy<12&&(xx%11)<6)?(R()<.6?rgb(220,200,110):rgb(70,80,100)):wall;}
  for(let y=top+fh;y<=GY;y+=fh){
    for(let k=0;k<2+(R()*2|0);k++){
      const fx=x0+5+R()*(x1-x0-16)|0, fy=y-1;
      const r=R();
      if(r<.25){fill(fx,fy-4,fx+7,fy-3,WOOD);fill(fx,fy-3,fx+1,fy+1,WOOD);fill(fx+6,fy-3,fx+7,fy+1,WOOD);}
      else if(r<.4){fill(fx,fy-9,fx+4,fy+1,STEEL);tint(fx,fy-9,fx+4,fy+1,210,215,220,6);fill(fx,fy-5,fx+4,fy-4,STEEL);} // fridge
      else if(r<.45){fill(fx,fy-12,fx+8,fy+1,WOOD);tint(fx,fy-12,fx+8,fy+1,140,95,50,10);for(let s2=fy-10;s2<fy;s2+=4)fill(fx+1,s2,fx+7,s2+1,EMPTY);} // bookcase
      else if(r<.6){fill(fx,fy-5,fx+4,fy+1,STEEL);fill(fx+1,fy-4,fx+3,fy+1,OIL);}
      else if(r<.75){fill(fx,fy-9,fx+5,fy+1,WOOD);tint(fx,fy-9,fx+5,fy+1,90,60,35,10);for(let s=fy-7;s<fy;s+=3)fill(fx,s,fx+5,s+1,WOOD);}
      else {fill(fx,fy-5,fx+6,fy+1,WOOD);tint(fx,fy-5,fx+6,fy+1,150,40,40,15);}
    }
  }
  fill(x0,top-4,x0+3,top,CONC);fill(x1-3,top-4,x1,top,CONC); // parapets
  if(R()<.35){const bx=x0+6+R()*(x1-x0-30)|0;fill(bx,top-16,bx+22,top-6,WOOD);tint(bx,top-16,bx+22,top-6,200,60,50,20);fill(bx+3,top-6,bx+4,top,STEEL);fill(bx+18,top-6,bx+19,top,STEEL);} // billboard
  if(R()<.6){const tx=x0+4+R()*(x1-x0-16)|0;fill(tx,top-8,tx+10,top,STEEL);fill(tx+1,top-7,tx+9,top,WATER);fill(tx+1,top,tx+2,top,STEEL);}
  fill(x1-6,top-14,x1-5,top,STEEL);
}
function glassTower(x0,x1,top,GY){
  BLD.push([x0,x1,top,'glass']);
  for(let y=top;y<GY;y++)for(let xx=x0;xx<x1;xx++){
    const edge=xx===x0||xx===x1-1, floor=(y-top)%12<3, mull=(xx-x0)%8===0||(xx-x0)%8===1;
    if(edge||mull)setc(y*W+xx,STEEL); else if(floor)setc(y*W+xx,CONC); else if(xx<x0+2||xx>x1-3)setc(y*W+xx,GLASS);
  }
  for(let y=top;y<GY;y++)for(let xx=x0+2;xx<x1-2;xx++){const i=y*W+xx;if(t[i]===0)bg[i]=((y-top)%12>3&&R()<.7)?rgb(70,110,130):rgb(30,46,60);}
  for(let y=top+12;y<=GY;y+=12){const fx=x0+4+R()*(x1-x0-12)|0;fill(fx,y-4,fx+6,y,WOOD);}
  // spire
  const mx=(x0+x1)>>1; fill(mx-1,top-30,mx+1,top,STEEL); fill(mx-4,top-4,mx+4,top,STEEL);
}
function houseRow(x,GY){
  for(let k=0;k<2+(R()*3|0);k++){
    const w=26+R()*12|0, h=26+R()*20|0, top=GY-h, x1=x+w;
    const wc=[[150,80,60],[200,190,160],[120,140,160],[180,150,90]][R()*4|0];
    fill(x,top,x+3,GY,WOOD); fill(x1-3,top,x1,GY,WOOD); fill(x,top,x1,top+3,WOOD); fill(x,GY-h/2|0,x1,(GY-h/2|0)+3,WOOD);
    fill(x+8,GY-h/2-6|0,x+14,GY-h/2|0,WOOD); fill(x1-12,GY-6,x1-5,GY,WOOD); // furniture
    tint(x,top,x1,GY,wc[0],wc[1],wc[2],10);
    fill(x+1,top+5,x+2,top+10,GLASS); fill(x1-2,top+5,x1-1,top+10,GLASS);
    bgRect(x+2,top+2,x1-2,GY,rgb(60,46,40));
    for(let r=0;r<w/2+2;r++)fill(x-2+r,top-r*.6,x1+2-r,top-r*.6+1,WOOD),tint(x-2+r,top-r*.6,x1+2-r,top-r*.6+1,110,40,30,10);
    fill(x+4,GY-5,x+10,GY-4,WOOD);
    x=x1+3;
  }
  return x;
}
function park(x,GY){
  const w=150; fill(x,GY-2,x+w,GY,GRASS); fill(x,GY-1,x+w,GY,DIRT);
  // pond carved into street
  fill(x+50,GY,x+100,GY+6,EMPTY); fill(x+50,GY+1,x+100,GY+6,WATER); fill(x+49,GY+6,x+101,GY+7,CONC);
  for(let k=x+8;k<x+w-6;k+=22)if(k<x+46||k>x+104)tree(k,GY-2);
  fill(x+20,GY-6,x+34,GY-5,WOOD);fill(x+21,GY-5,x+22,GY-2,WOOD);fill(x+32,GY-5,x+33,GY-2,WOOD);
  return x+w;
}
function gasStation(x,GY){
  const w=110;
  fill(x,GY-36,x+w,GY-33,CONC); for(const px of [x+4,x+50,x+w-6])fill(px,GY-33,px+2,GY,STEEL);
  for(const px of [x+20,x+70]){fill(px,GY-12,px+6,GY,STEEL);tint(px,GY-12,px+6,GY,200,40,40,10);}
  // fuel tanks: steel shells filled with oil and propane
  for(let k=0;k<2;k++){const tx=x+12+k*46;fill(tx-2,GY+3,tx+34,GY+4,STEEL);
    fill(tx-1,GY-28-2,tx+21,GY-28+20+2,STEEL); fill(tx+1,GY-28,tx+19,GY-28+20,k?PROPANE:OIL);}
  return x+w;
}
function bridge(x,GY){
  const w=300, dy=GY-70;
  fill(x,dy,x+w,dy+4,CONC); fill(x,dy+4,x+w,dy+6,STEEL);
  for(let px=x+10;px<x+w;px+=70){fill(px,dy+6,px+6,GY,CONC);}
  // truss
  for(let k=0;k<w;k+=10){for(let s=0;s<10;s++){sxy(x+k+s,dy+6+s,STEEL);sxy(x+k+10-s,dy+6+s,STEEL);}}
  fill(x,dy+16,x+w,dy+17,STEEL);
  fill(x,dy-3,x+w,dy-2,STEEL); for(let k=0;k<w;k+=6)fill(x+k,dy-3,x+k+1,dy,STEEL);
  for(let k=0;k<3;k++)car(x+30+k*90+R()*20|0,dy);
  return x+w;
}
function crane(x,GY){
  const h=230, top=GY-h;
  for(let y=top;y<GY;y++){sxy(x,y,STEEL);sxy(x+8,y,STEEL);if((y-top)%8===0)fill(x,y,x+9,y+1,STEEL);if((y-top)%8<8){sxy(x+((y-top)%8),y,STEEL);}}
  fill(x-30,top,x+110,top+2,STEEL); for(let k=-30;k<110;k+=6)sxy(x+k+(k%12?3:0),top+2,STEEL); fill(x-30,top+3,x+110,top+4,STEEL);
  fill(x-28,top+4,x-14,top+14,CONC);
  fill(x+80,top+4,x+81,top+60,STEEL); fill(x+72,top+60,x+90,top+68,STEEL); fill(x+73,top+61,x+89,top+67,CONC);
  fill(x+20,GY-40,x+60,GY,EMPTY);
  for(let k=0;k<4;k++)fill(x+20,GY-10*k-2,x+60,GY-10*k,CONC);
  for(const px of [x+20,x+40,x+59])fill(px,GY-40,px+1,GY,STEEL);
  return x+110;
}
function car(x,GY,cc){
  const c=cc||[[180,30,30],[30,80,180],[200,170,40],[220,220,220],[40,140,60]][R()*5|0];
  fill(x,GY-6,x+16,GY-2,STEEL);tint(x,GY-6,x+16,GY-2,c[0],c[1],c[2],8);
  fill(x+3,GY-10,x+12,GY-6,STEEL);tint(x+3,GY-10,x+12,GY-6,c[0],c[1],c[2],8);
  fill(x+4,GY-9,x+7,GY-6,GLASS);fill(x+8,GY-9,x+11,GY-6,GLASS);
  fill(x+12,GY-5,x+14,GY-3,OIL); if(R()<.5)fill(x+1,GY-5,x+3,GY-3,PROPANE);
  for(const wx of [x+2,x+11]){fill(wx,GY-3,wx+4,GY,STEEL);tint(wx,GY-3,wx+4,GY,25,25,25,4);}
}
function noise2(x,y,s){return(Math.sin(x*.05+s)*Math.cos(y*.07+s*1.3)+Math.sin(x*.11-y*.06+s*2.1)*.6+Math.sin((x+y)*.033+s*.7)*.5+Math.sin(x*.021-s)*Math.sin(y*.043+s)*.5)/2.6;}
function genForest(){
  clearAll();
  const s=R()*100;
  makeFar([60,120,200],[200,225,235],()=>{
    for(const [amp,base,c] of [[60,180,[120,150,180]],[40,235,[80,120,110]]]){
      for(let x=0;x<FW;x++){const hh=base-Math.sin(x*.013+s)*amp-Math.sin(x*.041+s*2)*amp*.3|0;for(let y=Math.max(0,hh);y<H;y++)far[y*FW+x]=rgb(c[0]-(y-hh)/6,c[1]-(y-hh)/6,c[2]-(y-hh)/8);}
    }
    for(let k=0;k<12;k++){const cx=R()*FW|0,cy=20+R()*80|0;for(let y=-5;y<=5;y++)for(let x=-18;x<=18;x++)if(x*x/324+y*y/25<1&&cy+y>=0)far[(cy+y)*FW+((cx+x+FW)%FW)]=rgb(240,245,250);}
  });
  const hm=[];
  const mt=300+R()*1000|0; // mountain
  for(let x=0;x<W;x++){
    const m=Math.exp(-(((x-mt)/150)**2))*170;
    hm[x]=300+Math.sin(x*.009+s)*28+Math.sin(x*.031+s*2)*12+Math.sin(x*.11+s)*3-m|0;
  }
  const lakes=[]; for(let k=0;k<2;k++){let pc;do{pc=100+R()*(W-200)|0;}while(Math.abs(pc-mt)<200||lakes.some(l=>Math.abs(l-pc)<200));lakes.push(pc);
    for(let x=pc-60;x<pc+60;x++){const d=(x-pc)/60;hm[x]+=(1-d*d)*34|0;}}
  for(let x=0;x<W;x++){
    const h=hm[x], st=h+24+Math.sin(x*.07+s)*8|0;
    for(let y=h;y<H;y++)setc(y*W+x,y<h+2?GRASS:y<st?DIRT:STONE);
    if(R()<.5)for(let y=st;y<st+3;y++)if(y<H)setc(y*W+x,SAND);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,26-(y-h)/16,22-(y-h)/18);
  }
  bgD.set(bg);
  // caves
  for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(y>hm[x]+14&&noise2(x,y,s)>.36)setc(y*W+x,EMPTY);}
  // lava chambers
  for(let k=0;k<4;k++){const lx=R()*(W-100)+50|0;for(let y=H-90;y<H-50;y++)for(let x=lx-40;x<lx+40;x++)if(x>=0&&x<W&&(x-lx)**2/1600+(y-H+70)**2/144<1)setc(y*W+x,y>H-72?LAVA:EMPTY);}
  // underground pools + ore of sand
  for(let y=H-8;y>300;y--)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0&&t[i+W]===STONE&&R()<.012)disc(x,y-2,3,WATER);}
  // magma sea at the bottom + obsidian floor
  for(let y=H-30;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0)setc(i,y>H-20?LAVA:EMPTY);}
  fill(0,H-4,W,H,OBSID);
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // mountain reservoir behind a stone dam (breakable waterfall)
  { const rx=mt+40, ry=hm[mt]+20; for(let y=ry-12;y<ry+10;y++)for(let x=rx-30;x<rx+10;x++)if(x>=0&&x<W)setc(y*W+x,y<ry+8?WATER:STONE); fill(rx+10,ry-14,rx+14,ry+10,STONE); }
  // surface lakes
  for(const pc of lakes){const lvl=Math.min(hm[pc-60],hm[pc+59])+2;for(let x=pc-60;x<pc+60;x++)for(let y=lvl;y<hm[x];y++)setc(y*W+x,WATER);}
  // cabin
  { let cx; do{cx=60+R()*(W-120)|0;}while(lakes.some(l=>Math.abs(l-cx)<80)); const gy=hm[cx]; cabin(cx,gy); }
  // trees + boulders + grass tufts
  for(let x=8;x<W-8;){
    if(!lakes.some(l=>Math.abs(x-l)<64)){const r=R(); r<.4?pine(x,hm[x]):r<.85?tree(x,hm[x]):birch(x,hm[x]);}
    if(R()<.08)disc(x+6,hm[x+6]-1,3+R()*3|0,STONE,.95);
    x+=9+R()*14|0;
  }
  for(let x=0;x<W;x++){if(!lakes.some(l=>Math.abs(x-l)<62)&&R()<.35){const h=1+R()*3|0;for(let k=1;k<=h;k++)sxy(x,hm[x]-k,GRASS);}}
}
function cabin(x,gy){
  fill(x-2,gy-1,x+42,gy+2,STONE);
  for(let y=gy-22;y<gy;y+=3)fill(x,y,x+40,y+2,WOOD);
  fill(x+3,gy-22,x+37,gy-1,EMPTY); bgRect(x+3,gy-22,x+37,gy-1,rgb(70,50,32));
  fill(x,gy-22,x+3,gy,WOOD); fill(x+37,gy-22,x+40,gy,WOOD); fill(x+37,gy-16,x+40,gy-9,GLASS);
  for(let r=0;r<24;r++)fill(x-4+r,gy-22-r*.7,x+44-r,gy-21-r*.7,WOOD);
  fill(x+6,gy-5,x+14,gy-1,WOOD); fill(x+24,gy-6,x+30,gy-1,STEEL); fill(x+25,gy-5,x+29,gy-1,OIL);
  fill(x+32,gy-36,x+35,gy-22,STONE);
}
function tree(x,gy){
  const h=28+R()*44|0, tw=2+(R()<.5?1:0);
  fill(x,gy-h,x+tw,gy+4,WOOD);
  for(let b=0;b<3;b++){const by=gy-h+8+R()*(h-14)|0,d=R()<.5?-1:1,len=4+R()*8|0;
    for(let k=0;k<len;k++)sxy(x+(d>0?tw:-1)+d*k,by-(k>>1),WOOD);
    disc(x+d*(len+1)+(d>0?tw:0),by-(len>>1)-1,3+R()*3|0,LEAF,.85);}
  const r=7+R()*6|0; disc(x+1,gy-h-1,r,LEAF,.88); disc(x-r/2|0,gy-h+3,r-2,LEAF,.8); disc(x+r/2+2|0,gy-h+3,r-2,LEAF,.8);
  fill(x,gy-h,x+tw,gy-h+r,WOOD);
}
function pine(x,gy){
  const h=40+R()*50|0;
  fill(x,gy-h,x+2,gy+4,WOOD);
  for(let y=0;y<h-6;y++){const w=((y%10)+y*.22)|0;for(let k=-w;k<=w+1;k++)if(R()<.9){sxy(x+k,gy-h+y,LEAF);col[(gy-h+y)*W+x+k]=rgb(24+R()*20,80+R()*30,40+R()*14);}}
  fill(x,gy-h,x+2,gy,WOOD);
}
function birch(x,gy){
  const h=30+R()*30|0;
  fill(x,gy-h,x+2,gy+4,WOOD); tint(x,gy-h,x+2,gy,220,220,210,20);
  for(let y=gy-h;y<gy;y+=4)tint(x,y,x+2,y+1,30,30,30,5);
  disc(x+1,gy-h,6+R()*4|0,LEAF,.8); tint(x-10,gy-h-10,x+12,gy-h+10,0,0,0,0);
  for(let y=gy-h-10;y<gy-h+10;y++)for(let k=x-10;k<x+12;k++)if(k>=0&&k<W&&y>=0&&t[y*W+k]===LEAF)col[y*W+k]=rgb(110+R()*40,170+R()*30,50);
  fill(x,gy-h,x+2,gy-h+4,WOOD);
}

function genNYC(){
  clearAll();
  const GY=340, GB=143+(GY-143)*.5|0, RX=300;
  makeFar([30,20,48],[230,120,80],()=>{
    for(let k=0;k<200;k++){const x=R()*FW|0,y=R()*(GB-140)|0;far[y*FW+x]=rgb(230,210,230);}
    // dense, tall skyline in three layers
    for(const [base,c,lit,hmax] of [[GB-60,rgb(70,46,80),.1,240],[GB-20,rgb(46,30,60),.2,200],[GB+15,rgb(30,20,42),.4,170]]){
      for(let x=0;x<FW;){const w=6+R()*20|0,h=40+R()*hmax|0;for(let y=Math.max(0,base-h);y<H;y++)for(let xx=x;xx<x+w&&xx<FW;xx++){const on=(xx%3===1&&y%5===2&&R()<lit);far[y*FW+xx]=on?rgb(250,210,120):c;}
        if(R()<.15)for(let y=Math.max(0,base-h-20);y<base-h;y++)far[y*FW+x+(w>>1)]=c;x+=w+(R()*2|0);}
    }
  });
  cityUnder(GY);
  // East River: carve the channel, sandy bed, fill with water
  for(let x=0;x<RX;x++){const e=Math.min(1,(RX-x)/30),bed=GY+20+(70*e|0);
    for(let y=GY;y<bed;y++){const i=y*W+x;setc(i,y>=GY+8?WATER:EMPTY);bg[i]=y<GY+8?0:rgb(20,30,40);}
    for(let y=bed;y<bed+4;y++)setc(y*W+x,SAND);}
  bgD.set(bg);
  // suspension bridge: stone towers with arches, cables, suspenders, trussed deck
  const dY=GY-26, T1=70, T2=226, TT=GY-170, bed=GY+102; // footings sunk through the sand into the riverbed
  for(const tx of [T1,T2]){fill(tx,TT,tx+18,bed,STONE);tint(tx,TT,tx+18,bed,176,152,120,10);
    for(const ax of [tx+3,tx+11]){for(let y=dY-34;y<dY;y++){const half=y<dY-28?Math.max(0,(y-(dY-34))/2|0):2;fill(ax+2-half,y,ax+2+half+1,y+1,EMPTY);}}
    fill(tx-1,TT,tx+19,TT+3,STONE);tint(tx-1,TT,tx+19,TT+3,150,130,104,6);}
  fill(0,dY,RX+40,dY+4,CONC);tint(0,dY,RX+40,dY+4,90,90,96,6);
  for(let k=0;k<RX+40;k+=8){for(let s=0;s<8;s++){sxy(k+s,dY+4+(s>>1),STEEL);sxy(k+8-s,dY+4+(s>>1),STEEL);}}
  fill(0,dY+8,RX+40,dY+9,STEEL);
  fill(0,dY,12,bed,STONE);tint(0,dY,12,bed,160,140,110,8);
  for(let x=RX+40;x<RX+110;x++){const y=dY+((x-RX-40)/70*(GY-dY))|0;fill(x,y,x+1,GY,CONC);tint(x,y,x+1,y+3,90,90,96,6);}
  const cab=x=>{ // main cable height
    const a=T1+9,b=T2+9;
    if(x<a)return dY-14+(TT-(dY-14))*(x/a);
    if(x>b)return TT+(dY-12-TT)*((x-b)/(RX+40-b));
    const u=(x-a)/(b-a);return TT+(dY-6-TT)*(1-(2*u-1)**2);};
  for(let x=0;x<RX+40;x++){const y=cab(x)|0;fill(x,y,x+1,y+2,STEEL);if(x%5===0&&!(x>=T1&&x<T1+18)&&!(x>=T2&&x<T2+18))fill(x,y+2,x+1,dY,STEEL);}
  for(let k=0;k<3;k++)car(20+k*90+R()*30|0,dY,[230,190,30]);
  // Manhattan
  let x=RX+116;const placed={};
  while(x<W-30){
    const r=R();
    if(!placed.park&&x>650&&r<.18){placed.park=1;x=centralPark(x,GY);}
    else if(!placed.step&&x>420&&r<.32){placed.step=1;x=steppedTower(x,GY);}
    else if(!placed.deco&&x>420&&r<.46){placed.deco=1;x=decoTower(x,GY);}
    else{const w=34+R()*36|0,h=150+R()*170|0,x1=Math.min(W-2,x+w),top=Math.max(30,GY-h);
      if(R()<.35)glassTower(x,x1,top,GY);else{building(x,x1,top,GY);if(R()<.6)waterTower(x+6+R()*(w-20)|0,top-4);}
      x=x1;}
    const gap=10+R()*14|0;
    if(gap>19&&x+gap<W)car(x+2,GY,[230,190,30]);
    x+=gap;
  }
  SPAWNX=RX+130;
}
function waterTower(x,top){
  for(const lx of [x,x+9])fill(lx,top-6,lx+1,top+4,STEEL);
  fill(x-1,top-16,x+11,top-6,WOOD);tint(x-1,top-16,x+11,top-6,120,84,52,10);fill(x+1,top-15,x+9,top-7,WATER);
  for(let r=0;r<6;r++)fill(x-1+r,top-16-r,x+11-r,top-15-r,WOOD);
}
function steppedTower(x,GY){
  // setback tiers like a 1930s skyscraper, then a mast and antenna
  const tiers=[[96,110],[74,60],[54,46],[38,34],[24,22]];let bot=GY,top;
  for(const [w,h] of tiers){const x0=x+(96-w)/2|0;top=bot-h;building(x0,x0+w,top,bot);bot=top;}
  const mx=x+48;fill(mx-3,top-18,mx+3,top,STEEL);tint(mx-3,top-18,mx+3,top,200,205,215,6);fill(mx-1,top-60,mx+1,top-18,STEEL);fill(mx,Math.max(2,top-95),mx+1,top-60,STEEL);
  return x+96;
}
function decoTower(x,GY){
  const w=56,top=GY-235;building(x,x+w,top,GY);
  // terraced steel crown with triangular windows, then a needle spire
  let y=top;for(let k=0;k<6;k++){const ww=w-k*9,r=ww/2,cx=x+w/2;
    for(let a=0;a<=Math.PI;a+=.02){const X=cx+Math.cos(a)*r|0,Y=y-Math.sin(a)*Math.min(r,10)|0;fill(X,Y,X+1,Y+2,STEEL);}
    for(let a=.3;a<Math.PI-.2;a+=.5){const X=cx+Math.cos(a)*(r-3)|0,Y=y-Math.sin(a)*Math.min(r-3,7)|0;fill(X,Y,X+2,Y+2,GLASS);}
    tint(cx-r,y-11,cx+r,y+1,210,214,222,8);y-=8;}
  fill(x+w/2-1,y-60,x+w/2+1,y+14,STEEL); // spire sunk into the crown so it is attachedfill(x+w/2,Math.max(2,y-80),x+w/2+1,y-60,STEEL);
  return x+w;
}
function centralPark(x,GY){
  const w=210;
  fill(x,GY-3,x+w,GY,GRASS);fill(x,GY,x+w,GY+4,DIRT);
  fill(x,GY-6,x+3,GY-3,STONE);fill(x+w-3,GY-6,x+w,GY-3,STONE);
  // the lake
  fill(x+70,GY-3,x+150,GY+10,EMPTY);fill(x+70,GY-1,x+150,GY+10,WATER);fill(x+68,GY+10,x+152,GY+12,STONE);
  // rock outcrop + trees
  disc(x+30,GY-4,7,STONE,.95);tint(x+22,GY-12,x+38,GY,120,118,112,10);
  for(let k=x+8;k<x+w-6;k+=16+(R()*10|0))if(k<x+64||k>x+156){R()<.5?tree(k,GY-3):birch(k,GY-3);}
  fill(x+160,GY-7,x+172,GY-6,WOOD);fill(x+161,GY-6,x+162,GY-3,WOOD);fill(x+170,GY-6,x+171,GY-3,WOOD);
  return x+w;
}

// ---- NYC 2099: the same island seventy-five years on. Neon-banded towers, skyways strung between them,
// a violet smog sky full of traffic lanes, and steady acid-free rain.
function genNYC2099(){
  genNYC();
  const GY=340;
  makeFar([8,4,24],[118,26,100],()=>{
    for(let k=0;k<160;k++){const x=R()*FW|0,y=R()*(H*.3)|0;far[y*FW+x]=rgb(200,190,255);}
    for(const [base,c,lit,hmax] of [[190,rgb(42,22,72),.12,250],[230,rgb(28,14,50),.22,220],[270,rgb(16,8,30),.35,190]]){
      for(let x=0;x<FW;){const w=6+R()*18|0,h=50+R()*hmax|0,lc=R()<.5?rgb(80,240,255):rgb(255,80,220),y0=Math.max(0,base-h);
        for(let y=y0;y<H;y++)for(let xx=x;xx<x+w&&xx<FW;xx++){const on=(xx%3===1&&y%4===2&&R()<lit);far[y*FW+xx]=on?lc:c;}
        for(let xx=x;xx<x+w&&xx<FW;xx++)far[y0*FW+xx]=lc; // neon crown
        if(R()<.3)for(let y=Math.max(0,y0-24);y<y0;y++)far[y*FW+x+(w>>1)]=c;
        x+=w+(R()*3|0);}
    }
    for(const ly of [150,172,200])for(let x=0;x<FW;x++)if(((x>>2)%3)!==0&&R()<.5)far[ly*FW+x]=R()<.5?rgb(255,120,230):rgb(120,240,255);
  });
  const NC=[[60,240,255],[255,60,210],[170,90,255],[255,210,70]];
  const neonAt=(x,y,c)=>{if(x<0||x>=W||y<0||y>=H)return;const i=y*W+x;if(KIND[t[i]]!==S)return;t[i]=NEON;const v=(R()-.5)*30;col[i]=rgb(cl(c[0]+v),cl(c[1]+v),cl(c[2]+v));};
  for(const [x0,x1,top,kind] of BLD){const c=NC[R()*NC.length|0];
    if(kind==='glass'){for(let y=top;y<GY;y++){neonAt(x0,y,c);neonAt(x1-1,y,c);}for(let y=top;y<GY;y+=12)for(let x=x0;x<x1;x++)neonAt(x,y,c);}
    else{for(let y=top;y<GY;y+=16)for(let x=x0;x<x1;x++)neonAt(x,y+2,c);for(let y=top-4;y<top;y++){neonAt(x0,y,c);neonAt(x0+1,y,c);neonAt(x1-1,y,c);neonAt(x1-2,y,c);}}}
  // skyways: steel decks with a neon underglow, strung through the gaps between towers (never through rooms)
  for(const [sy,c] of [[GY-118,NC[0]],[GY-196,NC[1]]])for(let x=430;x<W-6;x++){
    const free=y=>{const i=y*W+x;return t[i]===0&&bg[i]===bgD[i];};
    if(!free(sy)||!free(sy+1)||!free(sy+2))continue;
    for(let y=sy;y<sy+2;y++){setc(y*W+x,STEEL);tint(x,y,x+1,y+1,150,158,178,6);}
    setc((sy+2)*W+x,NEON);col[(sy+2)*W+x]=rgb(c[0],c[1],c[2]);}
  // street-level neon: kerb strip along Manhattan
  for(let x=430;x<W;x++){const i=GY*W+x;if(KIND[t[i]]===S&&t[i-W]===0&&(x>>3)%2===0){t[i]=NEON;col[i]=rgb(...NC[(x>>6)%2]);}}
}
function amb2099(){ // sky traffic and rain
  if(frame%5===0){const dir=R()<.5?1:-1,y=camY+8+R()*80,x=dir>0?camX-4:camX+VW+4,sp=(2.5+R()*2.5)*dir,c=R()<.5?rgb(120,240,255):rgb(255,120,230);
    for(let k=0;k<3;k++)spawn(x-dir*k*2,y,sp,0,k?rgb(255,90,90):c,200,0,1,0);}
  for(let k=0;k<3;k++)spawn(camX+R()*VW,camY-2,-.4,3.2+R(),rgb(120,140,200),90,0,0,0);
}


// ---- X-Mansion: the Xavier Institute's courtyard. The mansion itself towers in the backdrop.
function genXMansion(){
  clearAll();
  const GY=356,s=R()*100,B=252; // B: lawn line of the mansion in far-layer rows (sits just above the courtyard on screen)
  makeFar([38,50,104],[246,170,118],()=>{
    // the mansion is drawn into its own buffer first, then pasted bigger and lower with forced perspective
    const mc=new Uint32Array(FW*H),mk=new Uint8Array(FW*H);
    const P=(x,y,c)=>{x|=0;y|=0;if(x<0||x>=FW||y<0||y>=H)return;mc[y*FW+x]=c;mk[y*FW+x]=1;};
    const Rf=(x0,y0,x1,y1,c,v=6)=>{for(let y=y0|0;y<y1;y++)for(let x=x0|0;x<x1;x++){if(x<0||x>=FW||y<0||y>=H)continue;const n=(R()*2-1)*v;mc[y*FW+x]=rgb(cl(c[0]+n),cl(c[1]+n),cl(c[2]+n));mk[y*FW+x]=1;}};
    // distant tree lines and lawns either side of the mansion
    for(let x=0;x<FW;x++){const hh=B-18-Math.abs(Math.sin(x*.07+s))*16-Math.sin(x*.023+s)*10|0;for(let y=hh;y<H;y++)far[y*FW+x]=rgb(34+(y-hh)/8,62+(y-hh)/10,52+(y-hh)/12);}
    for(let x=0;x<FW;x++)for(let y=B;y<H;y++)far[y*FW+x]=rgb(62-(y-B)/7,98-(y-B)/6,56-(y-B)/8);
    const cx=FW/2|0;
    const stone=(x,base)=>[base[0]-(x-cx)*.05,base[1]-(x-cx)*.05,base[2]-(x-cx)*.04];
    // wings
    for(const [x0,x1] of [[cx-182,cx-130],[cx+130,cx+182]]){for(let x=x0;x<x1;x++)Rf(x,B-58,x+1,B,stone(x,[162,152,138]),5);
      for(let y=B-72;y<B-58;y++){const ins=(y-(B-72))*.0;Rf(x0-2+ins,y,x1+2-ins,y+1,[58,62,82],5);} // wing roofs
      for(let wx=x0+6;wx<x1-6;wx+=12)for(const wy of [B-50,B-28])win(wx,wy,6,11);}
    // main block
    for(let x=cx-130;x<cx+130;x++)Rf(x,B-92,x+1,B,stone(x,[180,170,154]),5);
    for(let k=0;k<3;k++)Rf(cx-130,B-92+k*30,cx+130,B-90+k*30,[150,140,126],3); // string courses
    // mansard roof with dormers and chimneys
    for(let y=B-112;y<B-92;y++){const ins=(B-92-y)*.9;Rf(cx-132+ins,y,cx+132-ins,y+1,[56,60,82],5);}
    for(let x=cx-120;x<=cx+110;x+=34){if(Math.abs(x-cx)<40)continue;for(let y=0;y<10;y++)Rf(x+y*.5,B-110+y,x+11-y*.5,B-109+y,[150,140,126],3);Rf(x+3,B-104,x+8,B-96,[250,206,128],8);}
    for(const x of [cx-110,cx-70,cx+62,cx+102])Rf(x,B-126,x+7,B-108,[128,72,62],6);
    // corner towers with conical spires
    for(const tx of [cx-150,cx+122]){Rf(tx,B-118,tx+28,B,stone(tx,[172,162,146]),5);
      for(let y=0;y<34;y++){const w=14*(1-y/34);Rf(tx+14-w-1,B-118-y,tx+14+w+1,B-117-y,[52,56,78],4);}
      Rf(tx+13,B-158,tx+15,B-150,[200,190,150],3);
      for(const wy of [B-104,B-78,B-50])win(tx+10,wy,7,12);}
    // centre pavilion: pediment with the X emblem, portico, doors, steps
    for(let y=0;y<34;y++){const w=48*(y/34);Rf(cx-w,B-126+y,cx+w,B-125+y,y<2?[60,64,86]:[190,180,164],4);}
    for(let a=0;a<6.283;a+=.02)for(const r of [9,10,11])P(cx+Math.cos(a)*r,B-108+Math.sin(a)*r,rgb(206,40,40));
    for(let k=-6;k<=6;k++){for(const o of [-1,0,1]){P(cx+k+o,B-108+k,rgb(24,22,28));P(cx+k+o,B-108-k,rgb(24,22,28));}}
    Rf(cx-46,B-92,cx+46,B-86,[214,208,196],3);
    for(const kx of [-40,-22,14,32])Rf(cx+kx,B-86,cx+kx+7,B-10,[234,230,220],4);
    for(let y=B-40;y<B-10;y++){const a=y<B-34?Math.sqrt(36-(y-(B-34))**2):10;Rf(cx-a,y,cx+a,y+1,[78,48,32],5);}
    for(let k=0;k<4;k++)Rf(cx-52-k*6,B-10+k*3,cx+52+k*6,B-7+k*3,[200,194,180],4);
    for(const wy of [B-82,B-56])for(let wx=cx-122;wx<cx+122;wx+=16){if(Math.abs(wx+3-cx)<52)continue;win(wx,wy,7,13);}
    for(let wx=cx-122;wx<cx+122;wx+=16){if(Math.abs(wx+3-cx)<56)continue;win(wx,B-30,7,13);}
    // ivy on the lower walls
    for(let k=0;k<9;k++){const ix=cx-180+R()*360|0,r=6+R()*8;for(let n=0;n<160;n++){const a=R()*6.283,d=Math.sqrt(R())*r,x=ix+Math.cos(a)*d|0,y=B-1-Math.abs(Math.sin(a))*d*2.2|0;if(mk[y*FW+x])P(x,y,rgb(34+R()*18,74+R()*26,38));}}
    function win(x,y,w,h){Rf(x-1,y-1,x+w+1,y+h+1,[214,206,190],3);const lit=R()<.7;
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){if(yy<2&&(xx===0||xx===w-1))continue;const mull=xx===(w>>1)||yy===(h>>1)+1;P(x+xx,y+yy,mull?rgb(70,60,52):lit?rgb(250,206,128-yy*3):rgb(44,52,74));}}
    // gentle forced perspective: a bit taller, the base slightly wider and lower so the house sits right behind the courtyard
    const B1=B+8,KV=1.18;
    for(let y=0;y<H;y++){const sy=Math.round(B+(y-B1)/KV);if(sy<0||sy>=H)continue;const kh=1.1+.14*Math.max(0,Math.min(1,(sy-(B-160))/160));
      for(let x=0;x<FW;x++){const sx=Math.round(cx+(x-cx)/kh);if(sx<0||sx>=FW)continue;const si=sy*FW+sx;if(mk[si]){far[y*FW+x]=mc[si];farKeep[y*FW+x]=1;}}}
    // the gravel drive and hedge rows run from the door toward the viewer, filling the lawn
    // manicured grounds fill everything below the house (kept vivid, so flying up shows lawn and gardens, never bare earth)
    for(let y=B1;y<H;y++){const d=y-B1,hw=18+d*1.1,stripe=((d>>3)&1)?6:-4;
      for(let x=0;x<FW;x++){const i=y*FW+x;if(farKeep[i]&&d<2)continue;const ax=Math.abs(x-cx),n=(R()*2-1)*5,hedge=d%22<5&&ax>hw+6;
        far[i]=ax<hw?rgb(cl(180+n),cl(168+n),cl(140+n)):ax<hw+3?rgb(cl(40+n),cl(92+n),cl(44+n)):hedge?rgb(cl(34+n),cl(84+n),cl(40+n)):rgb(cl(74+stripe+n),cl(126+stripe+n),cl(62+stripe+n));farKeep[i]=1;}}
    for(const side of [-1,1])for(let k=0;k<5;k++){const tx=cx+side*(220+k*36),ty=B1+4+k*3,r=10+k*3; // trees framing the house
      for(let y=-r*2;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x/(r*r)+(y<0?y*y/(4*r*r):y*y/(r*r))>1)continue;const X=tx+x,Y=ty+y;if(X<0||X>=FW||Y<0||Y>=H)continue;const n=R()*14;far[Y*FW+X]=rgb(26+n,58+n,34+n/2);farKeep[Y*FW+X]=1;}}
  });
  const hm=[];
  for(let x=0;x<W;x++){const out=x<380?(380-x)/380:x>1220?(x-1220)/380:0;hm[x]=GY-Math.round(out*out*28+Math.sin(x*.02+s)*3*out);}
  for(let x=0;x<W;x++){
    const h=hm[x],st=h+42+Math.sin(x*.05+s)*6|0;
    for(let y=h;y<H;y++)setc(y*W+x,y<h+2?GRASS:y<st?DIRT:y>=H-4?OBSID:STONE);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,28-(y-h)/16,24-(y-h)/18);
  }
  bgD.set(bg);
  for(let y=0;y<H-8;y++)for(let x=0;x<W;x++){if(y>hm[x]+130&&noise2(x,y,s)>.4)setc(y*W+x,EMPTY);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // courtyard paving
  for(let x=380;x<1220;x++)for(let y=GY;y<GY+3;y++){setc(y*W+x,CONC);const j=(x%10===0)||y===GY+2;col[y*W+x]=j?rgb(150,140,122):rgb(196+R()*10,184+R()*10,160+R()*8);}
  // the fountain, with a glowing X on its column
  { const fx=800;fill(fx-32,GY-7,fx+32,GY,STONE);tint(fx-32,GY-7,fx+32,GY,200,196,186,6);fill(fx-28,GY-6,fx+28,GY-1,WATER);
    fill(fx-3,GY-24,fx+3,GY-6,STONE);tint(fx-3,GY-24,fx+3,GY-6,210,206,196,5);fill(fx-11,GY-27,fx+11,GY-24,STONE);tint(fx-11,GY-27,fx+11,GY-24,200,196,186,5);fill(fx-9,GY-26,fx+9,GY-25,WATER);
    for(let k=-3;k<=3;k++){for(const [x,y] of [[fx+k,GY-17+k],[fx+k,GY-17-k]]){const i=y*W+x;t[i]=NEON;col[i]=rgb(255,70,60);}} }
  // trimmed hedges
  for(const [a,b] of [[430,520],[560,650],[950,1040],[1080,1170]]){fill(a,GY-8,b,GY,LEAF);for(let x=a;x<b;x++)for(let y=GY-8;y<GY;y++){const i=y*W+x;if(t[i]===LEAF)col[i]=rgb(30+R()*20,96+R()*30,40+R()*14);}fill(a,GY-9,a+2,GY-8,EMPTY);fill(b-2,GY-9,b,GY-8,EMPTY);}
  // lamp posts
  for(const x of [410,700,900,1190]){fill(x,GY-20,x+1,GY,STEEL);tint(x,GY-20,x+1,GY,40,40,48,4);fill(x-1,GY-22,x+2,GY-20,NEON);tint(x-1,GY-22,x+2,GY-20,255,220,150,10);}
  // stone balustrade posts at the courtyard ends
  for(const x of [372,1214]){fill(x,GY-16,x+8,GY,STONE);tint(x,GY-16,x+8,GY,196,190,176,6);fill(x-1,GY-18,x+9,GY-16,STONE);tint(x-1,GY-18,x+9,GY-16,170,164,150,4);}
  // gazebo
  { const gx=200,gy=hm[gx];fill(gx-22,gy-2,gx+22,gy,WOOD);for(const px of [gx-20,gx-7,gx+6,gx+19])fill(px,gy-20,px+2,gy-2,WOOD);
    for(let r=0;r<12;r++)fill(gx-26+r*2,gy-21-r,gx+26-r*2,gy-20-r,WOOD);tint(gx-26,gy-33,gx+26,gy-20,236,232,224,8); }
  // basketball court
  { const bx=1290;fill(bx,hm[bx]-1,bx+170,hm[bx]+1,CONC);tint(bx,hm[bx]-1,bx+170,hm[bx]+1,176,96,60,8);for(let x=bx;x<bx+170;x+=42)tint(x,hm[bx]-1,x+1,hm[bx],240,240,240,0);
    const hx=bx+150,hy=hm[hx]-1;fill(hx,hy-34,hx+2,hy,STEEL);fill(hx-6,hy-36,hx+2,hy-26,GLASS);fill(hx-11,hy-28,hx-6,hy-27,STEEL);tint(hx-11,hy-28,hx-6,hy-27,230,90,40,0); }
  // trees on the lawns, wrought-iron fence and gate pillars at the estate edges
  for(let x=24;x<W-24;){if(x<360||x>1240){if(!(x>176&&x<228)&&!(x>1280&&x<1470)){const r=R();r<.35?pine(x,hm[x]):r<.8?tree(x,hm[x]):birch(x,hm[x]);}}x+=14+R()*18|0;}
  for(const [a,b] of [[0,40],[W-40,W]]){for(let x=a;x<b;x+=3)fill(x,hm[x]-16,x+1,hm[x],STEEL);fill(a,hm[a]-14,b,hm[a]-13,STEEL);fill(a,hm[a]-5,b,hm[a]-4,STEEL);tint(a,hm[a]-18,b,hm[a],30,30,36,4);}
  // beneath the courtyard: the Blackbird hangar
  { const x0=560,x1=1040,y0=GY+60,y1=GY+112;fill(x0-3,y0-3,x1+3,y1+3,STEEL);tint(x0-3,y0-3,x1+3,y1+3,70,76,88,6);fill(x0,y0,x1,y1,EMPTY);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)bg[y*W+x]=((x>>3)+(y>>3))%2&&y>y1-4?rgb(200,170,40):(y%16===0?rgb(70,84,108):rgb(48,58,78));
    for(let x=x0+20;x<x1;x+=60)bgRect(x,y0+2,x+10,y0+4,rgb(230,240,255));
    blackbird(700,y1); }
  SPAWNX=600;
}
function blackbird(x,fy){ // the X-Men's jet, parked on its gear
  const cy=fy-12;
  for(let k=0;k<160;k++){const th=k<24?k*.22:k<120?5:Math.max(1,5-(k-120)*.1);for(let y=cy-th|0;y<=cy+th;y++)sxy(x+k,y,STEEL);}
  for(let k=60;k<118;k++){const w=(k-60)*.12;fill(x+k,cy+2,x+k+1,cy+3+w,STEEL);}
  for(let k=126;k<158;k++){const h=(k-126)*.55;fill(x+k,cy-5-h,x+k+1,cy-4,STEEL);}
  tint(x,cy-24,x+160,cy+12,30,32,40,6);
  fill(x+14,cy-5,x+30,cy-3,GLASS);tint(x+14,cy-5,x+30,cy-3,120,170,210,10);
  for(const k of [34,96,108])fill(x+k,cy+5,x+k+1,fy,STEEL);
  tint(x+150,cy-14,x+156,cy-11,220,40,40,0);
}

// ---- Savage Land: a prehistoric jungle hidden in Antarctica. A live volcano with a lava lake, a waterfall
// off a plateau, a ruined step pyramid, a tar pit and a buried dinosaur.
const SAV={VX:820,CX:1300,src:0,pool:[0,0,0],vtop:196};
function jungleTree(x,gy){
  const h=46+R()*40|0,tw=3;fill(x,gy-h,x+tw,gy+4,WOOD);tint(x,gy-h,x+tw,gy,96,70,44,10);
  const r=10+R()*6|0,cx=x+1,cy=gy-h-2;
  for(const [ox,oy,rr] of [[0,0,r],[-r*.8,4,r*.75],[r*.8,4,r*.75],[0,-r*.5,r*.7]])disc(cx+ox|0,cy+oy|0,rr|0,LEAF,.9);
  for(let y=cy-r*1.6|0;y<cy+r;y++)for(let k=cx-r*2;k<cx+r*2;k++)if(k>=0&&k<W&&y>=0&&t[y*W+k]===LEAF)col[y*W+k]=rgb(30+R()*26,104+R()*44,30+R()*20);
  fill(x,gy-h,x+tw,gy-h+r,WOOD);
  for(let v=0;v<4;v++){const vx=cx+(R()-.5)*r*2.4|0;let y=cy;while(y<cy+r*2&&t[y*W+vx]===LEAF)y++;const len=8+R()*18|0;if(t[(y-1)*W+vx]!==LEAF)continue;for(let k=0;k<len;k++){if(t[(y+k)*W+vx])break;setc((y+k)*W+vx,LEAF);col[(y+k)*W+vx]=rgb(40+R()*20,120+R()*30,40);}}
}
function fern(x,gy){for(let k=-6;k<=6;k++){const hh=Math.round(7-Math.abs(k)*.9);for(let y=0;y<hh;y++){const X=x+k+(k<0?-(y>>2):(y>>2));sxy(X,gy-1-y,LEAF);if(X>=0&&X<W&&gy-1-y>=0)col[(gy-1-y)*W+X]=rgb(46+R()*24,136+R()*40,40);}}}
function genSavageLand(){
  clearAll();
  const s=R()*100,GY=372,VX=SAV.VX,VTOP=GY-176,CR=22,CX=SAV.CX;
  makeFar([96,176,170],[250,212,150],()=>{
    for(const [amp,base,c] of [[70,170,[110,128,132]],[46,214,[72,108,90]]])for(let x=0;x<FW;x++){const hh=base-Math.abs(Math.sin(x*.011+s))*amp-Math.sin(x*.037+s*2)*amp*.25|0;for(let y=Math.max(0,hh);y<H;y++)far[y*FW+x]=rgb(c[0]-(y-hh)/7,c[1]-(y-hh)/7,c[2]-(y-hh)/8);}
    const vx=FW*.22|0,vt=118;for(let y=vt;y<H;y++){const w=(y-vt)*1.4;for(let x=vx-w|0;x<vx+w;x++)if(x>=0&&x<FW)far[y*FW+x]=rgb(84-(y-vt)/9,72-(y-vt)/9,80-(y-vt)/9);}
    for(let x=vx-6;x<vx+6;x++)far[vt*FW+x]=rgb(255,140,60);
    for(let k=0;k<8;k++){const cx=vx-k*14+(R()-.5)*8,cy=vt-10-k*12,r=8+k*3;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<r*r){const X=cx+x|0,Y=cy+y|0;if(X>=0&&X<FW&&Y>=0)far[Y*FW+X]=rgb(150-k*4,146-k*4,150-k*4);}}
    for(let k=0;k<6;k++){const x=4+R()*(FW-8)|0,y=40+R()*70|0;for(const [dx,dy] of [[0,0],[-1,-1],[-2,-1],[1,-1],[2,-1]])far[(y+dy)*FW+x+dx]=rgb(40,40,50);} // pteranodons
  });
  const hm=[];
  for(let x=0;x<W;x++){let h=GY+Math.sin(x*.012+s)*12+Math.sin(x*.041+s*2)*5|0;const d=Math.abs(x-VX);if(d<250)h=Math.min(h,VTOP+(d<CR+6?0:(d-CR-6)*.78)|0);if(x>=CX)h=Math.min(h,GY-86);hm[x]=h;}
  for(let x=0;x<W;x++){const h=hm[x],volc=Math.abs(x-VX)<240&&h<GY-24,st=h+24+Math.sin(x*.07+s)*6|0;
    for(let y=h;y<H;y++)setc(y*W+x,y>=H-4?OBSID:volc?(y<h+2&&R()<.5?ASH:STONE):y<h+2?GRASS:y<st?DIRT:STONE);
    if(volc)tint(x,h,x+1,Math.min(H,GY+40),78,66,66,10);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(34-(y-h)/14,30-(y-h)/16,22-(y-h)/18);}
  bgD.set(bg);
  for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(y>hm[x]+34&&Math.abs(x-VX)>70&&noise2(x,y,s)>.37)setc(y*W+x,EMPTY);}
  for(let y=H-30;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0)setc(i,y>H-20?LAVA:EMPTY);}
  // crater lava lake and the conduit down to a sealed magma chamber
  for(let x=VX-CR;x<=VX+CR;x++){const dx=(x-VX)/CR,dep=5+22*(1-dx*dx)|0;for(let y=VTOP;y<VTOP+dep;y++)setc(y*W+x,y<VTOP+5?EMPTY:LAVA);}
  for(let y=VTOP+20;y<GY-30;y++)for(let x=VX-2;x<=VX+2;x++)setc(y*W+x,LAVA);
  for(let y=-12;y<=12;y++)for(let x=-34;x<=34;x++){const e=x*x/1156+y*y/144;if(e<1.3)setc((GY-30+y)*W+VX+x,e<1?LAVA:OBSID);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // plunge pool at the foot of the cliff; a river along the plateau feeds the waterfall (kept running by the ambience)
  for(let x=CX-74;x<CX-2;x++){const d=1-Math.abs(x-(CX-38))/36;for(let y=hm[x];y<hm[x]+10+d*12;y++)setc(y*W+x,y<hm[x]+3?EMPTY:WATER);}
  for(let x=CX;x<W-24;x++){const dep=5+3*((W-24-x)/(W-24-CX))|0;for(let y=hm[x];y<hm[x]+dep;y++)setc(y*W+x,y<hm[x]+1?EMPTY:WATER);fill(x,hm[x]+dep,x+1,hm[x]+dep+3,STONE);tint(x,hm[x]+dep,x+1,hm[x]+dep+3,96,96,104,8);} // the river bed deepens toward the cliff, so it always drains over it
  fill(CX-2,hm[CX]+1,CX+1,hm[CX]+6,EMPTY);
  SAV.src=hm[W-30];SAV.pool=[CX-60,CX-16,hm[CX-38]+14];SAV.vtop=VTOP;
  // ruined step pyramid with a golden idol in the shrine
  {const px=330,gy=hm[px];let y=gy;for(const [w,h] of [[124,14],[100,14],[76,14],[52,12]]){const x0=px-w/2|0;fill(x0,y-h,x0+w,y,STONE);
      for(let yy=y-h;yy<y;yy++)for(let xx=x0;xx<x0+w;xx++){const i=yy*W+xx;const j=((yy-(y-h))%5===0)||(((xx-x0)+((yy>>2)&1)*6)%12===0);col[i]=j?rgb(96,92,78):rgb(150+R()*16,140+R()*14,108+R()*10);}
      if(R()<.7)for(let k=0;k<6;k++){const bx=x0+R()*w|0;sxy(bx,y-h-1,STONE);}y-=h;}
    fill(px-8,y-16,px+8,y,STONE);tint(px-8,y-16,px+8,y,140,130,100,10);fill(px-4,y-12,px+4,y,EMPTY);bgRect(px-4,y-12,px+4,y,rgb(40,30,24));
    for(let yy=y-5;yy<y-1;yy++)for(let xx=px-1;xx<=px+1;xx++){const i=yy*W+xx;t[i]=NEON;col[i]=rgb(255,200,70);}
    for(let k=y;k<gy;k++)tint(px-5,k,px+5,k+1,112,104,86,6);
    for(const bx of [px-90,px+80]){const hh=14+R()*14|0;fill(bx,gy-hh,bx+5,gy,STONE);tint(bx,gy-hh,bx+5,gy,160,150,120,10);}}
  // tar pit
  {const tx=560;for(let x=tx-34;x<tx+34;x++){const d=1-Math.abs(x-tx)/34;for(let y=hm[x];y<hm[x]+3+d*10;y++)setc(y*W+x,y<hm[x]+2?EMPTY:OIL);}}
  // a buried tyrannosaur
  {const bx=1080,by=hm[bx]+12;for(let k=0;k<7;k++){const rx=bx+k*7;for(let a=0;a<=Math.PI;a+=.15){const X=rx+Math.cos(a)*4|0,Y=by-Math.sin(a)*7+k*.4|0;sxy(X,Y,STONE);if(X>=0&&X<W&&Y>=0)col[Y*W+X]=rgb(228,222,200);}}
    for(let k=-8;k<56;k++){sxy(bx+k,by,STONE);col[by*W+bx+k]=rgb(222,216,196);}for(let y=-4;y<=4;y++)for(let x=-6;x<=6;x++)if(x*x/36+y*y/16<1){sxy(bx-12+x,by-2+y,STONE);col[(by-2+y)*W+bx-12+x]=rgb(232,226,206);}}
  // jungle
  for(let x=10;x<W-10;){const nearV=Math.abs(x-VX)<255,nearP=Math.abs(x-330)<70,nearT=Math.abs(x-560)<40,nearC=x>CX-80&&x<CX+8;
    if(!nearV&&!nearP&&!nearT&&!nearC){R()<.6?jungleTree(x,hm[x]):fern(x+4,hm[x]);if(R()<.5)fern(x+10,hm[x+10]);}x+=12+R()*16|0;}
  for(let x=0;x<W;x++){if(Math.abs(x-VX)>250&&R()<.3&&t[(hm[x]-1)*W+x]===0){const h=1+R()*3|0;for(let k=1;k<=h;k++)sxy(x,hm[x]-k,GRASS);}}
  // glowing mushrooms in the caves
  for(let y=H-40;y>GY;y--)for(let x=0;x<W;x+=2){const i=y*W+x;if(t[i]===0&&KIND[t[i+W]]===S&&R()<.006){for(let k=0;k<3;k++){const j=i-k*W;t[j]=NEON;col[j]=k===2?rgb(120,255,230):rgb(70,170,160);}}}
  SPAWNX=150;
}
function ambSavage(){ // the waterfall keeps falling, the volcano keeps smoking
  for(let k=0;k<7;k++){const x=W-30+(R()*6|0),y=SAV.src+1,i=y*W+x;if(t[i]===0)setc(i,WATER);}
  const [a,b,y0]=SAV.pool,cx=SAV.CX,ty=SAV.src;
  if(t[(y0-9)*W+((a+b)>>1)]===WATER)for(let k=0;k<14;k++){const x=a+R()*(b-a)|0,y=y0+(R()*8|0),i=y*W+x;if(i>0&&i<N&&t[i]===WATER)setc(i,EMPTY);} // an underground outflow keeps the plunge pool from flooding the jungle
  for(let k=0;k<4;k++)spawn(cx-1-R()*3,ty+2+R()*3,-.3-R()*.5,R()*.5,R()<.6?rgb(90,140,230):rgb(200,225,255),60,0,0,1); // the falling sheet of the waterfall
  if(frame%2===0)spawn(cx-6-R()*30,y0-12,(R()-.5)*1.2,-.4-R()*.6,rgb(220,235,250),30,0,0,0,1); // mist at its foot
  const VX=SAV.VX;if(frame%3===0)spawn(VX+(R()-.5)*30,SAV.vtop-2,(R()-.5)*.4,-.4-R()*.6,R()<.8?rgb(110,104,106):rgb(255,140,60),160+R()*80,0,R()<.2?1:0,0,0);
  if(frame%400===0){for(let k=0;k<6;k++)spawn(VX+(R()-.5)*10,SAV.vtop,(R()-.5)*3,-3-R()*3,rgb(255,120,30),200,LAVA,1);fxWord(VX,SAV.vtop-24,'BLORP',.8,'#ffb340',true);snd('boom',VX,SAV.vtop,{size:.4});}
}
// ---- Weapon X: the secret facility dug into a snowbound mountain. Snowfields that slide, a frozen lake,
// labs with experiment tanks behind a blast door, a fuel depot and a radio mast.
function genArctic(){
  clearAll();
  const s=R()*100,GY=352;
  makeFar([118,150,198],[222,232,244],()=>{
    for(const [amp,base,c] of [[120,196,[196,208,228]],[72,240,[146,166,196]]])for(let x=0;x<FW;x++){const ridge=Math.abs(((x*.0065+s+base)%1)-.5)*2,hh=base-amp*(1-ridge)-Math.sin(x*.05)*6|0;
      for(let y=Math.max(0,hh);y<H;y++){const k=y-hh;far[y*FW+x]=k<5+((x>>3)&1)*3?rgb(242,246,252):rgb(c[0]-k/5,c[1]-k/5,c[2]-k/6);}}
    for(let k=0;k<10;k++){const cx=R()*FW|0,cy=30+R()*60|0;for(let y=-4;y<=4;y++)for(let x=-22;x<=22;x++)if(x*x/484+y*y/16<1&&cy+y>=0)far[(cy+y)*FW+((cx+x+FW)%FW)]=rgb(236,242,250);}
  });
  const hm=[];
  for(let x=0;x<W;x++){let h=GY+Math.sin(x*.011+s)*8+Math.sin(x*.043+s)*3;if(x<400)h-=(400-x)*.42+Math.sin(x*.09)*6;if(x>1000)h-=Math.min(190,(x-1000)*.6)-Math.sin(x*.07)*5;hm[x]=h|0;}
  for(let x=0;x<W;x++){const h=hm[x],sd=3+((Math.sin(x*.13+s)+1)*2|0),dd=h+sd+6;
    for(let y=h;y<H;y++){const i=y*W+x;setc(i,y>=H-4?OBSID:y<h+sd?SNOW:y<dd?DIRT:STONE);}
    tint(x,h+sd,x+1,h+sd+6,92,84,80,8);tint(x,h+sd+6,x+1,Math.min(H,h+120),104,112,126,10);
    for(let y=h+3;y<H;y++)bg[y*W+x]=rgb(30-(y-h)/16,34-(y-h)/16,40-(y-h)/14);}
  bgD.set(bg);
  for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(y>hm[x]+60&&(x<1040||x>1520)&&noise2(x,y,s)>.4)setc(y*W+x,EMPTY);}
  for(let y=H-28;y<H-4;y++)for(let x=0;x<W;x++){const i=y*W+x;if(t[i]===0)setc(i,y>H-18?LAVA:EMPTY);}
  for(let x=0;x<W;x++)SURF[x]=hm[x]+30;
  // glacier ice on the high slopes
  for(let x=0;x<W;x++)if(hm[x]<GY-80&&noise2(x,9,s)>.05)for(let y=hm[x]+4;y<hm[x]+10;y++)setc(y*W+x,ICE);
  // frozen lake: a basin of water under a crust of ice
  {const a=470,b=790,c=(a+b)/2,hw=(b-a)/2,top=Math.max(hm[a],hm[b-1])+1;for(let x=a;x<b;x++){const d=1-((x-c)/hw)**2,dep=Math.max(0,32*d|0);
      for(let y=Math.min(top,hm[x]);y<top+dep;y++)setc(y*W+x,y<top-1?EMPTY:y<top+3?ICE:WATER);}}
  // the facility inside the right-hand mountain
  const fx0=1090,fx1=1440,floors=[GY-18,GY+30,GY+78];
  for(const fy of floors){fill(fx0,fy-26,fx1,fy,EMPTY);bgRect(fx0,fy-26,fx1,fy,rgb(46,54,64));
    for(let x=fx0;x<fx1;x+=12)bgRect(x,fy-26,x+1,fy,rgb(34,40,48));bgRect(fx0,fy-24,fx1,fy-23,rgb(200,210,90));
    fill(fx0-3,fy,fx1+3,fy+3,CONC);tint(fx0-3,fy,fx1+3,fy+3,120,124,130,6);fill(fx0-3,fy-29,fx1+3,fy-26,CONC);tint(fx0-3,fy-29,fx1+3,fy-26,110,114,120,6);
    fill(fx0-3,fy-26,fx0,fy,CONC);fill(fx1,fy-26,fx1+3,fy,CONC);
    for(let px=fx0+40;px<fx1-30;px+=70){fill(px,fy-26,px+2,fy-10,CONC);tint(px,fy-26,px+2,fy-10,130,134,140,6);}
    for(let x=fx0+12;x<fx1-12;x+=40){const r=R();
      if(r<.3){fill(x,fy-20,x+8,fy,GLASS);fill(x+1,fy-18,x+7,fy-1,WATER);tint(x+1,fy-18,x+7,fy-1,90,220,120,14);fill(x-1,fy-22,x+9,fy-20,STEEL);fill(x-1,fy-1,x+9,fy,STEEL);} // experiment tank (green growth medium, not acid: it would eat through the floors)
      else if(r<.55){fill(x,fy-16,x+7,fy,STEEL);tint(x,fy-16,x+7,fy,60,66,76,4);for(let yy=fy-14;yy<fy-1;yy+=3){const i=yy*W+x+2;t[i]=NEON;col[i]=R()<.5?rgb(80,255,120):rgb(255,70,60);}} // server rack
      else if(r<.75){fill(x,fy-6,x+10,fy-5,WOOD);fill(x,fy-5,x+1,fy,WOOD);fill(x+9,fy-5,x+10,fy,WOOD);fill(x+3,fy-9,x+7,fy-6,STEEL);} // desk + terminal
      else {fill(x,fy-6,x+5,fy,STEEL);fill(x+1,fy-5,x+4,fy-1,OIL);}}}
  // the adamantium tank on the lowest floor
  {const tx=1250,fy=floors[2];fill(tx-10,fy-24,tx+10,fy,STEEL);tint(tx-10,fy-24,tx+10,fy,150,158,170,6);fill(tx-7,fy-21,tx+7,fy-2,WATER);tint(tx-7,fy-21,tx+7,fy-2,120,220,230,10);
    for(let yy=fy-21;yy<fy-2;yy+=4){const i=yy*W+tx-8;t[i]=NEON;col[i]=rgb(120,240,255);}}
  // elevator shaft through every floor, and the entrance tunnel with its blast door
  fill(fx1-24,floors[0]-26,fx1-14,floors[2],EMPTY);bgRect(fx1-24,floors[0]-26,fx1-14,floors[2],rgb(30,34,40));fill(fx1-25,floors[0]-26,fx1-24,floors[2],STEEL);fill(fx1-14,floors[0]-26,fx1-13,floors[2],STEEL);
  {const fy=floors[0];let ex=fx0;while(ex>900&&hm[ex]<fy-2)ex--;fill(ex,fy-26,fx0,fy,EMPTY);bgRect(ex,fy-26,fx0,fy,rgb(40,46,54));fill(ex-2,fy,fx0,fy+3,CONC);fill(ex-2,fy-29,fx0,fy-26,CONC);
    const dx=fx0-8;fill(dx,fy-26,dx+4,fy,STEEL);for(let yy=fy-26;yy<fy;yy++)for(let xx=dx;xx<dx+4;xx++)col[yy*W+xx]=((xx+yy)>>1)&1?rgb(220,190,40):rgb(30,30,34);}
  // fuel depot, helipad and radio mast outside
  {const dx=930,gy=hm[dx];fill(dx-6,gy-1,dx+64,gy+2,CONC);for(let k=0;k<3;k++){const x=dx+k*22;fill(x,gy-13,x+16,gy-1,STEEL);tint(x,gy-13,x+16,gy-1,200,60,50,10);fill(x+2,gy-11,x+14,gy-2,PROPANE);}}
  {const hx=1500,gy=hm[hx];fill(hx-30,gy-2,hx+30,gy+2,CONC);tint(hx-30,gy-2,hx+30,gy+2,90,92,96,6);for(let y=gy-1;y<gy;y++)for(const xx of [hx-6,hx+5])for(let k=-1;k<=1;k++){const i=y*W+xx;t[i]=NEON;col[i]=rgb(255,220,80);}
    const mx=1560,my=hm[mx];for(let y=my-70;y<my;y++){sxy(mx,y,STEEL);sxy(mx+6,y,STEEL);if((y-my)%6===0)fill(mx,y,mx+7,y+1,STEEL);}const i=(my-71)*W+mx+3;t[i]=NEON;col[i]=rgb(255,40,40);}
  // icicles under the overhangs
  for(let x=2;x<W-2;x++)for(let y=GY-200;y<H-40;y++){const i=y*W+x;if(t[i]===0&&KIND[t[i-W]]===S&&t[i-W]!==SNOW&&R()<.015){const L=3+R()*5|0;for(let k=0;k<L&&t[i+k*W]===0;k++){t[i+k*W]=ICE;col[i+k*W]=rgb(190,230,250);}}}
  SPAWNX=140;
}
function ambArctic(){ // steady snowfall; a little of it settles
  for(let k=0;k<3;k++){const x=camX+R()*(VW+40)-20;spawn(x,camY-2,(R()-.5)*.4-.25,.5+R()*.5,R()<.5?rgb(240,244,252):rgb(214,224,240),400,R()<.08?SNOW:0,0,0,1);}
}

// ================= particles =================
const MP=40000, px=new Float32Array(MP),py=new Float32Array(MP),pvx=new Float32Array(MP),pvy=new Float32Array(MP),pc=new Uint32Array(MP),pl=new Int16Array(MP),pm=new Uint8Array(MP),pg=new Uint8Array(MP);
let np=0;
// flags: 1 glow, 2 gravity, 4 drag
function spawn(x,y,vx,vy,c,l,m,glow,grav=1,drag=0){if(np>=MP)return;px[np]=x;py[np]=y;pvx[np]=vx;pvy[np]=vy;pc[np]=c;pl[np]=l;pm[np]=m;pg[np]=(glow?1:0)|(grav?2:0)|(drag?4:0);np++;}
function solidAt(x,y){if(x<0||x>=W||y>=H)return true;if(y<0)return false;const m=t[(y|0)*W+(x|0)],k=KIND[m];return(k===S&&m!==LEAF)||k===P;}
function updParticles(){
  const ss=stasis;
  for(let n=0;n<np;n++){
    if(ss){const dx=px[n]-ss.x,dy=py[n]-ss.y;if(dx*dx+dy*dy<ss.r*ss.r)continue;}
    const f=pg[n];
    if(f&2)pvy[n]+=.15;
    if(f&4){pvx[n]*=.9;pvy[n]*=.9;} else pvx[n]*=.99;
    const ox=px[n],oy=py[n],nx=ox+pvx[n],ny=oy+pvy[n];
    let dead=--pl[n]<=0;
    if(!(f&4)&&ox>=0&&ox<W&&oy>=0&&oy<H){const oi=(oy|0)*W+(ox|0),om=t[oi];if(om!==0&&(KIND[om]===S||KIND[om]===P)){
      if(pm[n]&&pm[n]!==GFIRE)for(let u=1;u<5;u++){const j=oi-u*W;if(j>=0&&t[j]===0){t[j]=pm[n];col[j]=pc[n];life[j]=lifeOf(pm[n]);wake(j);break;}}
      np--;px[n]=px[np];py[n]=py[np];pvx[n]=pvx[np];pvy[n]=pvy[np];pc[n]=pc[np];pl[n]=pl[np];pm[n]=pm[np];pg[n]=pg[np];n--;continue;}}
    if(nx<0||nx>=W||ny>=H||ny<-60)dead=true;
    else if(ny>=0){
      const j=(ny|0)*W+(nx|0),tm=t[j];
      if(tm!==0&&KIND[tm]!==G&&KIND[tm]!==F&&!(f&4&&!pm[n])){
        if(pm[n]&&pm[n]!==GFIRE&&!(f&8)&&Math.abs(pvx[n])+Math.abs(pvy[n])>2.4&&!dead){
          pg[n]|=8; if(solidAt(ox,ny)){pvy[n]*=-.3;pvx[n]*=.7;}else pvx[n]*=-.45; continue; }
        if(pm[n]===GFIRE){if(tm!==STEEL&&(FLAM[tm]>0||R()<.3))setc(j,GFIRE);}
        else if(pm[n]){const oi=(oy|0)*W+(ox|0);if(oy>=0&&t[oi]===0){t[oi]=pm[n];col[oi]=pc[n];life[oi]=lifeOf(pm[n]);vel[oi]=2;wake(oi);}}
        dead=true;pm[n]=0;
      }
    }
    if(dead){
      if(pm[n]&&pm[n]!==GFIRE&&ny>=0&&ny<H&&nx>=0&&nx<W){const j=(ny|0)*W+(nx|0);if(t[j]===0){t[j]=pm[n];col[j]=pc[n];life[j]=lifeOf(pm[n]);wake(j);}}
      np--;px[n]=px[np];py[n]=py[np];pvx[n]=pvx[np];pvy[n]=pvy[np];pc[n]=pc[np];pl[n]=pl[np];pm[n]=pm[np];pg[n]=pg[np];n--;continue;
    }
    px[n]=nx;py[n]=ny;
  }
}
const GREEN=[rgb(80,255,120),rgb(40,220,90),rgb(160,255,180),rgb(20,180,60),rgb(210,255,220)];
const gcol=()=>GREEN[R()*5|0];

// ================= VFX lists =================
let shake=0;
const rings=[], flashes=[], beams=[], afters=[];
function flash(x,y,r,c,life=6){flashes.push({x,y,r,c,life,max:life});}

// ================= comic fx: sound words, bursts, focus lines, impact frames =================
const comics=[]; let lastWord=-99, hitstop=0, impactF=0, impactX=0, impactY=0, hurtV=0;
const WORDS_S=['BLAM!','POW!','BANG!','KRAK!'],WORDS_M=['BOOM!','KA-BLAM!','KRAKOOM!','WHAMM!'],WORDS_L=['KA-BOOOM!','KRAKA-DOOM!','KABLOOEY!'];
// comic sound words double as the sound design: each onomatopoeia triggers the matching effect
const WORD_SND=[[/SNIKT|SHKK|SKRITCH|SHKRAKK|SHINK/,'snikt'],[/RAA+R?GH|R+A+G+H|HULK SMASH|HRRAAGH|PUNY/,'roar'],[/SKREE/,'screech'],[/WHOO|FWOO|WHHOO|WHOOSH/,'wind'],
  [/VWOOOM|VWAMM|VREEE|HNNN|RRRMM|GRRKK|MINE NOW|STASIS/,'psi'],[/KLANNNG|KA-CHUNK|KLONK|CLANK/,'clang'],[/BZZZT|KZZZRRT|ZZRAK|ZZZAP|FZZZT|ZZAAAK|ZWIP|PTANG|ZZT/,'zap'],[/CLAP/,'thud'],
  [/FFT-FFT|PEW/,'pop'],[/OVERLOAD|FULL POWER|VISOR OFF|ODINFORCE|MAX!|LOCKED/,'charge'],[/KRRSSHH|KRA-SHHH|TSING|SHRAKK|SHATTER|FSSHHK|KRRRK|FSSSHH|KRIK/,'ice'],
  [/RUMMMBLE|KRRRAAACK|RUMBLE|FAULT/,'crumble'],[/THOOM|STOMP/,'stomp'],[/GOTCHA|RRRIIP/,'rip'],[/YOINK|HUP!|HRK/,'throw'],[/\*SNIFF\*/,'whoosh'],[/EMP/,'emp'],[/SKRAKOOM|THOOOOM/,'boom']];
function fxWord(x,y,text,size=1,c='#ffc93c',force,quiet){
  if(!quiet&&SET.sound)for(const [re,nm] of WORD_SND)if(re.test(text)){snd(nm,x,y,{v:Math.min(1,.5+size*.35),gap:.08});break;}
  if(!SET.words)return;if(!force&&frame-lastWord<10)return;lastWord=frame;
  if(comics.length>10)comics.shift();
  comics.push({k:'w',x,y,text,size,c,life:42,max:42,rot:(R()-.5)*.45});
}
function fxBurst(x,y,r,c){if(comics.length>14)comics.shift();comics.push({k:'b',x,y,r,c:c||'#ffc93c',life:9,max:9,rot:R()*6.28});}
function fxImpact(x,y,frames){impactF=Math.max(impactF,frames);impactX=x;impactY=y;}
function fxBoom(cx,cy,r,opt){
  if(r>=7)fxBurst(cx,cy,r*2.6,opt.green?'#8dffb0':opt.col?`rgb(${opt.col[0]},${opt.col[1]},${opt.col[2]})`:'#ffc93c');
  const w=opt.word||(r<9?WORDS_S:r<14?WORDS_M:WORDS_L)[R()*3|0];
  fxWord(cx,cy-r-4,w,Math.min(1.6,.7+r/18),opt.green?'#8dffb0':'#ffc93c',r>=12||opt.word,true);
  if(r>=14){hitstop=Math.max(hitstop,3);fxImpact(cx,cy,4);}
}

// ================= destruction =================
function explode(cx,cy,r,opt={}){
  const fire=opt.fire||0, green=opt.green, ec=opt.col;
  lastBoom={x:cx,y:cy,f:frame,r};
  if(r>=6&&!opt.quiet)fxBoom(cx,cy,r,opt);
  if(!opt.quiet||r>=9)snd(r>=6?'boom':'pop',cx,cy,{size:r/12,gap:r>=10?.025:.05,v:Math.min(1,.45+r/14)});
  let parts=0,glassN=0,steelN=0;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
    const d2=x*x+y*y;if(d2>r*r)continue;
    const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;
    const i=Y*W+X,m=t[i];if(m===0)continue;
    const dn=Math.sqrt(d2)/r;
    if(HARD[m]>0&&R()*10<HARD[m]-(1-dn)*7)continue;
    if(m===STEEL&&R()<.25){if(R()<.3){steelN++;spawn(X,Y,(R()-.5)*4,-R()*3,rgb(255,210+R()*40|0,140),8+R()*10,0,1,1);}continue;}
    const k=KIND[m];if(m===GLASS)glassN++;
    if(m===PROPANE){booms.push([X,Y,7]);}
    if(R()<(k===S?.62:.45)&&parts<1800){parts++;
      const a=Math.atan2(y,x)+(R()-.5)*.9, sp=(1+R()*4.5*(1-dn))*(1+r/16);
      spawn(X,Y,Math.cos(a)*sp,Math.sin(a)*sp-1.8,col[i],90+R()*90,k===S?RUBBLE:(k===P||k===L)?m:0,m===GLASS?1:0);
    }
    if(m===OIL){setc(i,FIRE);continue;}
    setc(i,fire&&R()<fire?(green?GFIRE:FIRE):EMPTY);
  }
  bgHit(cx,cy,r*1.2|0);
  if(glassN>5)snd('glass',cx,cy,{v:Math.min(1,glassN/30)});if(steelN>3)snd('clang',cx,cy,{v:Math.min(1,steelN/12),gap:.12});
  // shockwave: the crater rim cracks into loose rubble, loose stuff gets thrown
  const r2=r*1.7;
  for(let n=0;n<r*r*3;n++){const a=R()*6.283,d=r+R()*(r2-r),X=cx+Math.cos(a)*d|0,Y=cy+Math.sin(a)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;
    const f=1-(d-r)/(r2-r);
    if(KIND[m]===S){if(m!==STEEL&&m!==OBSID&&R()<f*.4/(1+HARD[m]*.25)){if(R()<.4){spawn(X,Y,Math.cos(a)*2.5*f,Math.sin(a)*2.5*f-1.5,col[i],90,RUBBLE,0);t[i]=0;}else{t[i]=RUBBLE;vel[i]=3;}markDirty(i);wake(i);}}
    else if((KIND[m]===P||KIND[m]===L)&&R()<.6){spawn(X,Y,Math.cos(a)*3*f,Math.sin(a)*3*f-1.8,col[i],70,m,0);t[i]=0;wake(i);}}
  // flung embers spread fire; dust + smoke cloud
  if(fire&&!green)for(let n=0;n<r;n++){const a=R()*6.283,sp=1+R()*3;spawn(cx,cy,Math.cos(a)*sp,Math.sin(a)*sp-2,rgb(255,150,40),80,EMBER,1);}
  for(let n=0;n<r*4;n++){const a=R()*6.283,d=R()*r*1.3,X=cx+Math.cos(a)*d|0,Y=cy+Math.sin(a)*d|0;if(R()<.5)dust(X,Y);else if(X>=0&&X<W&&Y>=0&&Y<H&&t[Y*W+X]===0)setc(Y*W+X,SMOKE);}
  // sparks + flash + rings
  for(let n=0;n<r*6;n++){const a=R()*6.283,sp=R()*r*.45+.5;spawn(cx,cy,Math.cos(a)*sp,Math.sin(a)*sp,green?gcol():ec?pickC(ec):rgb(255,150+R()*100,40+R()*60),10+R()*22,0,1,R()<.5?1:0,1);}
  flash(cx,cy,r*3.2,green?[60,255,110]:ec||[255,170,60],9);
  rings.push({x:cx,y:cy,r:r*.5,vr:Math.max(1.5,r*.24),life:14,c:green?[120,255,160]:ec||[255,220,150]});
  if(r>7)rings.push({x:cx,y:cy,r:r*.3,vr:Math.max(1,r*.14),life:18,c:[200,190,170]});
  shake=Math.min(22,shake+r*.6);
  const dx=pl_.x-cx,dy=pl_.y-8-cy,dd=Math.hypot(dx,dy);
  if(dd<r*2.2&&dd>0&&!opt.self){pl_.vx+=dx/dd*3;pl_.vy+=dy/dd*3-1;}
  if(opt.enemy){if(dd<r*1.8)hurt(opt.dmg??5);if(decoy&&Math.hypot(decoy.x-cx,decoy.y-SH/2-cy)<r*2)decoy.hp-=(opt.dmg??5)*1.5;}else damageEnemies(cx,cy,r*1.7,r*3.2);
  if(r>=9&&!opt.quiet)shockFx(cx,cy,Math.min(1.4,r/18));
  if(r>=5)for(let n=0;n<r*r*1.6;n++){const an=R()*6.283,d=r*(.95+R()*.4),X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(KIND[t[i]]===S&&t[i]!==ICE&&t[i]!==NEON)col[i]=shade(col[i],.55+R()*.25);} // scorched crater rim
  for(const b of bodies){const ddx=b.x-cx,ddy=b.y-cy,d=Math.hypot(ddx,ddy)||1;if(d<r*4+b.rmax){const f=r*3/(d+8)*Math.min(1,300/b.n);b.vx+=ddx/d*f;b.vy+=ddy/d*f-.3;b.va+=(R()-.5)*f*.04;}}
}
function bgHit(cx,cy,r){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(!bgB[i])continue;
    if(R()<.3&&np<MP-500){const a=Math.atan2(y,x),sp=.5+R()*2.5;spawn(X,Y,Math.cos(a)*sp,Math.sin(a)*sp-1,shade(bg[i],.8),90,RUBBLE,0);}
    bg[i]=bgD[i];bgB[i]=0;}
}
const shade=(c,k)=>rgb((c&255)*k,((c>>8)&255)*k,((c>>16)&255)*k);
function punchOut(p){ // armour shoves its way out instead of teleporting
  for(let yy=Math.ceil(p.y-PH);yy<=Math.floor(p.y-1);yy++)for(let xx=Math.floor(p.x-PW/2);xx<=Math.floor(p.x+PW/2);xx++){
    if(!solidAt(xx,yy)||xx<0||xx>=W||yy<0||yy>=H)continue;const i=yy*W+xx,m=t[i],k=KIND[m];
    if(m===STEEL&&R()<.5)continue;
    spawn(xx,yy,(xx<p.x?-1:1)*(1+R()*2),-R()*2,col[i],70,k===S?RUBBLE:m,0);if(k===S)markDirty(i);t[i]=0;pin[i]=0;wake(i);}
}

// ================= player / heroes =================
// Each hero: sprite + palette (glow chars: e * @), body size, movement tuning and a power list.
// ---- hero sprites: 3/4 front view, heroic proportions (small head, broad shoulders, V-taper, long legs),
//      light from the upper left, three tones per material plus spot blacks; ink outline added by the renderer
const SPR_DOOM=[
"....hhhhh....",
"...hHjjHHh...",
"...hLkMknh...",
"...hLeMenh...",
"...hLMkMnh...",
"..chhnMnhhc..",
".cCGhHHHhGCc.",
"CGAuTTTTTtGaC",
"CAauTTtTTtAaC",
"CAakuTtTtkAaC",
"CAakuTtTtkAaC",
"CAakBBbBBkAaC",
"CGa.TTTTt.GaC",
"cGG.TTtTt.GGc",
"c...TT.Tt...c",
"c...Aa.Aa...c",
"c..Aa...Aa..c",
"c..Aa...Aa..c",
"...Aa...Aa...",
"..GAa...GAa..",
"..GAa...GAa..",
"..aaa...aaa.."];
const PAL_DOOM={h:rgb(18,70,34),H:rgb(30,110,52),j:rgb(64,160,84),M:rgb(150,158,170),L:rgb(205,212,222),n:rgb(86,92,104),e:rgb(140,255,170),k:rgb(14,16,18),C:rgb(12,50,26),c:rgb(24,90,44),A:rgb(122,130,144),a:rgb(62,68,82),G:rgb(196,204,216),T:rgb(28,102,50),t:rgb(14,60,30),u:rgb(52,146,72),B:rgb(196,150,48),b:rgb(84,58,34)};
const SPR_HULK=[
"......hhhhh......",
".....hhhhhhh.....",
".....hkGGGgh.....",
"....kGKKgKKgg....",
"...kGGeKGKegGg...",
"..kGGGgKwKgGGGg..",
".kGGGGGgKgGGGGGg.",
"kGGkGGGGGGGGGgGGg",
"kGGkkGGGgGGGGgGgg",
"kGGgkGGGgGGGgGggg",
"kGg.kGGgKgGGg.Ggg",
"kGg.GkGKGKGgg.Ggg",
"kGg.kGGKGKgGg.Ggg",
"kGg..kGgGgGg..Ggg",
"kGg..ppPppqq..Ggg",
"kGg.PpppqppPq.Ggg",
"kGG.Pppq.Pppq.GGg",
"gGg.Pppq.Pppq.Ggg",
"ggg.Pppq.Pppq.ggg",
"....Ppqq.Ppqq....",
"....pqpq.pqpq....",
"....kGGg.kGGg....",
"...kGGg...kGGg...",
"...GGgg...GGgg...",
"..kGGgg...GGGgg..",
"..ggggg...ggggg.."];
const PAL_HULK={h:rgb(18,20,16),G:rgb(84,150,58),g:rgb(44,96,34),k:rgb(140,200,96),K:rgb(26,58,22),e:rgb(220,255,190),w:rgb(232,228,204),p:rgb(98,50,130),q:rgb(56,26,80),P:rgb(140,84,172)};
const SPR_THOR=[
"....zyYYy....",
"...zyYYYyz...",
"...yYfffFz...",
"...yfefeFz...",
"...yffFfFz...",
"...yzfFFzyz..",
"..CyzDFDzyC..",
"CfFDDDdDDdfFC",
"CfFOoDdOodfFC",
"CfFOoDdOodfFC",
"CfFkDDdDdkfFC",
"CsSkbBbBbkSsC",
"CsS.dDddd.sSC",
"cfF.DDdDd.fFc",
"c...DD.Dd...c",
"c...DD.Dd...c",
"c..DD...Dd..c",
"c..bB...bB..c",
"...bB...bB...",
"...bB...bB...",
"..bbB...bbB..",
"..BBB...BBB.."];
const PAL_THOR={z:rgb(150,108,40),y:rgb(214,170,70),Y:rgb(246,218,128),f:rgb(226,178,140),F:rgb(168,118,88),e:rgb(150,206,255),d:rgb(26,30,46),D:rgb(54,62,90),o:rgb(146,154,170),O:rgb(214,222,234),C:rgb(158,22,28),c:rgb(98,12,18),b:rgb(110,80,46),B:rgb(60,42,26),s:rgb(204,210,222),S:rgb(116,122,138),k:rgb(14,16,24)};
const SPR_IRON=[
"....rQRRr....",
"...rQRRRRr...",
"...QGGGGgr...",
"...Q**G**r...",
"...QGGkGgr...",
"....rGGgr....",
"..QRrRRRrRr..",
".QRQRRRRRrRr.",
".QRQR*@*RrRr.",
".QrQRRRRRrRr.",
".GYkYGgGgkYg.",
".GYkrRrRrkYg.",
".Gg.RRrRr.Gg.",
".**.RR.Rr.**.",
"....QR.Rr....",
"....QR.Rr....",
"...GY...Gg...",
"...QR...Rr...",
"...QR...Rr...",
"..QRR...RRr..",
"..QRR...RRr..",
"..rrr...rrr.."];
const PAL_IRON={R:rgb(176,28,28),r:rgb(100,12,16),Q:rgb(232,72,58),G:rgb(214,164,50),Y:rgb(252,216,112),g:rgb(146,104,26),k:rgb(36,12,12),'*':rgb(205,242,255),'@':rgb(225,252,255)};
const SPR_WOLV=[
"..kk.....kk..",
"...kkYYYkk...",
"...kYLYYyk...",
"...kwkYkwk...",
"...hkkYkkh...",
"...hfFfFFh...",
"..BbhfFFhbB..",
"VBbBLYYYyBVBb",
"VBbkLYYYykVBb",
"VBbBkLYykBVBb",
"LYybkLYykbLYy",
"LYybrRrRrbLYy",
"VBb.BBbBb.VBb",
"Bbb.BB.Bb.Bbb",
"....LY.Yy....",
"...LY...Yy...",
"...VBb..VBb..",
"..VBb...VBb..",
"..BBb...BBb..",
"..bbbb..bbbb."];
const PAL_WOLV={k:rgb(18,18,24),Y:rgb(232,186,36),y:rgb(168,118,20),L:rgb(255,228,112),B:rgb(34,56,140),b:rgb(18,28,80),V:rgb(72,106,204),w:rgb(250,250,250),f:rgb(214,162,124),F:rgb(148,98,70),h:rgb(40,30,24),c:rgb(222,228,238),r:rgb(150,24,24),R:rgb(214,56,46)};
const SPR_CYC=[
"....hHHhh....",
"...hHHhhhh...",
"...hfffFFh...",
"...vVVVVVv...",
"...NffFFFN...",
"....NfFFN....",
"..MNNnNNNnN..",
".MNMYNNNyNNn.",
".MNMNYNyNnNn.",
".MNMNNYNNnNn.",
".MNkNyNYnkNn.",
".MNkYYyYykNn.",
".Yy.NNnNn.Yy.",
".Yy.NN.Nn.Yy.",
"....MN.Nn....",
"....MN.Nn....",
"...MN...Nn...",
"...YY...Yy...",
"...MN...Nn...",
"..MNN...NNn..",
"..MNN...NNn..",
"..nnn...nnn.."];
const PAL_CYC={h:rgb(80,50,28),H:rgb(132,92,56),N:rgb(30,46,110),n:rgb(14,22,60),M:rgb(62,86,162),Y:rgb(236,196,48),y:rgb(168,128,24),V:rgb(255,60,40),v:rgb(110,20,20),f:rgb(222,174,136),F:rgb(168,122,90),k:rgb(10,14,36)};
const SPR_ICE=[
"....iIIIi....",
"...iI+IIiJ...",
"...iIIIiJJ...",
"...iIeIeJJ...",
"...iIIiJJJ...",
"....iIJJJ....",
"..iIIiJJJJJ..",
".IiI+IIiJJiJ.",
".IiIIiIJJKiJ.",
".IiIiIIJJKiJ.",
".IiKIiIJKKiJ.",
".IiKiIJJKKiJ.",
".I+.IIJJK.+J.",
".++.IJ.JK.++.",
"....IJ.JK....",
"....Ii.JK....",
"...I+...JK...",
"...Ii...JK...",
"...Ii...JK...",
"..IIi...JJK..",
"..IIi...JJK..",
"..iiJ...JKK.."];
const PAL_ICE={i:rgb(128,188,234),I:rgb(200,236,255),J:rgb(68,128,194),K:rgb(38,80,146),'+':rgb(240,255,255),e:rgb(255,255,255)};
const SPR_JEAN=[
"....LHHHh....",
"...LHHHHHh...",
"..LHfffFHhh..",
"..HHefeFHhh..",
"..HHfFFFHhh..",
"..HhHfFHhhh..",
"..HhOOfOOhh..",
".PDHPDODdhDd.",
".PDHPOOOdhDd.",
".PDHPDODdhDd.",
".PDhPDDddkDd.",
".OokPOOodkOo.",
".Oo.PDDDd.Oo.",
"....PD.Dd....",
"....PD.Dd....",
"...PD...Dd...",
"...PD...Dd...",
"...OO...Oo...",
"...OO...Oo...",
"..OOO...OOo..",
"..OOO...OOo..",
"..ooo...ooo.."];
const PAL_JEAN={L:rgb(242,98,54),H:rgb(198,44,28),h:rgb(126,24,16),f:rgb(236,190,158),F:rgb(188,138,110),e:rgb(255,190,110),D:rgb(178,26,36),d:rgb(106,12,20),P:rgb(232,66,66),O:rgb(240,186,58),o:rgb(166,116,28),k:rgb(56,6,12)};
const SPR_STORM=[
"...wWWWWw....",
"..wWWOOOWWw..",
"..wWsssSWww..",
"..wWesesWww..",
"..wWsSsSWww..",
"..wWWsSWWww..",
".CwWKsSKWwwC.",
"CGKWGKKKkwKkC",
"CGKWGKKKkwKkC",
"CGKWGKKkkwKkC",
"CGKwGKkKkwKkC",
"CGKkOOOOokKkC",
"Css.GKKKk.sSC",
"c...GK.Kk...c",
"c...GK.Kk...c",
"c..GK...Kk..c",
"c..GK...Kk..c",
"c..GK...Kk..c",
"...GK...Kk...",
"..GKK...KKk..",
"..GKK...KKk..",
"..kkk...kkk.."];
const PAL_STORM={W:rgb(240,242,250),w:rgb(168,176,196),O:rgb(232,186,60),s:rgb(108,70,44),S:rgb(74,46,28),e:rgb(255,255,255),K:rgb(30,30,38),k:rgb(14,14,20),G:rgb(72,74,94),C:rgb(24,24,32),c:rgb(50,50,64),o:rgb(160,118,30)};
const GLOWCH={e:1,'*':1,'@':1,V:1,'+':1};
// ---- procedural animation rig. The hero sprite is re-posed every frame before drawing:
//   leg   first leg row (rows below swing for walking / tuck for jumps / trail in flight)
//   mid   columns left of this belong to the back leg
//   armC, tipC  [light, mid, dark] chars for a posed arm and its glove / fist / palm
//   aw, al, fs  arm thickness, arm length and fist size in pixels (Hulk: thick arms, big fists)
//   sh    front shoulder [x,y] in sprite space (the sprite faces right)
//   hide  sprite pixels of the hanging front arm, removed while the arm is posed
//   blink eye char and the lid char that replaces it for a blink
//   cape  chars that hang from the shoulders and never move with the legs
const rect=(x0,x1,y0,y1)=>{const r=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)r.push([x,y]);return r;};
const ANIM={
  doom:{leg:14,mid:6,armC:'GAa',tipC:'GGa',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:'e',lid:'M',cape:'Cc'},
  hulk:{leg:19,mid:8,armC:'kGg',tipC:'kGg',aw:3,al:9,fs:4,sh:[14,7],hide:rect(14,16,8,18),blink:'e',lid:'K'},
  thor:{leg:14,mid:6,armC:'ffF',tipC:'fFF',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:'e',lid:'f',cape:'Cc'},
  iron:{leg:14,mid:6,armC:'QRr',tipC:'**G',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null},
  wolverine:{leg:14,mid:6,armC:'LYy',tipC:'VBb',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,12,7,13),blink:'w',lid:'k',claws:'c'},
  cyclops:{leg:14,mid:6,armC:'MNn',tipC:'YYy',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null},
  iceman:{leg:14,mid:6,armC:'IiJ',tipC:'+Ii',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:'e',lid:'I'},
  jean:{leg:13,mid:6,armC:'PDd',tipC:'OOo',aw:2,al:5,fs:2,sh:[10,7],hide:rect(10,11,7,12),blink:'e',lid:'f',cape:'Hh'},
  storm:{leg:13,mid:6,armC:'GKk',tipC:'ssS',aw:2,al:5,fs:2,sh:[10,7],hide:rect(10,11,7,12),blink:'e',lid:'s',cape:'Cc'},
};
const PP=8; // padding around the posed sprite for limbs that reach out
const ARM_UP=new Set(['Downburst','Heat Wave','Icicle Drop','Mjolnir Pin','Ice Golem','Telekinetic Rip','Blizzard','Phoenix Wings','Storm Call','Lightning Call','Thunderbolt','Tornado','Hailstorm','Phoenix Force','Ice Wall','Ball Lightning','Conductor Strike','Flash Flood','Eye of the Storm','Bifrost','God Blast']);
const ARM_BOTH=new Set(['EMP Burst','Not Today','Stealth Mode','Adamantium Skeleton','Mystic Shield','Thunderclap','Gale Force','Psychic Wave','Frost Nova','Mind Shield','Levitate Crowd','Debris Storm','Gamma Roar','Energy Shield','Avalanche']);
const ARM_VISOR=new Set(['Tactical Focus','Blackbird Strafe','Puppet Master','Optic Cage','Uncontrolled Blast','Optic Blast','Concussive Burst','Ricochet Shot','Full Power','Optic Sweep','Optic Barrage','Leg Sweep','Visor Overload']);
function armMode(p){
  if(p.ball)return'clap';
  if(p.grip)return'grip';
  if(p.throwF>0)return'throw';
  if((held&&held.overhead)||(heldE&&CH.powers[cur]&&CH.powers[cur].tk&&CH.powers[cur].tk.overhead))return'hold';
  if(p.slam)return'up';
  if(p.thrustF>0)return'visor';
  if(p.clapF>0)return'clap';
  if(p.cling)return'cling';
  if(p.crouch>6)return'back';
  if(p.leap)return'back';
  if(p.punchF>0)return'punch';
  if(p.charge>0)return'back';
  const pw=CH.powers[cur];
  if(mouse.down&&GS==='play'&&pw){if(pw.n==='Unibeam')return'chest';if(ARM_BOTH.has(pw.n))return'both';if(ARM_UP.has(pw.n))return'up';if(ARM_VISOR.has(pw.n))return'visor';if(pw.n==='Healing Factor')return'back';return'aim';}
  if(p.castF>0)return'aim';
  if(p.fly&&CH.id==='iceman')return'slide';
  if(p.fly&&(p.boost>0||Math.hypot(p.vx,p.vy)>2.6))return'super';
  return null;
}
// sprite-space direction from the front shoulder toward the mouse (undoes body tilt and facing)
function aimLocal(p,tx=mouse.wx,ty=mouse.wy){
  const A=ANIM[CH.id],sw=SW,sh=SH,ca=Math.cos(p.ang),sa=Math.sin(p.ang);
  const lx=(A.sh[0]+.5-sw/2)*p.face,ly=A.sh[1]+.5-sh/2;
  const shx=p.x+lx*ca-ly*sa,shy=p.y-sh/2+lx*sa+ly*ca;
  let dx=tx-shx,dy=ty-shy;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
  const rx=dx*ca+dy*sa,ry=-dx*sa+dy*ca;
  return{shx,shy,wx:dx,wy:dy,lx:rx*p.face,ly:ry};
}
function armLen(p,mode){const L=ANIM[CH.id].al;return mode==='punch'?(p.punchF>6?L-1+(10-p.punchF)*1.5:L-1+p.punchF*.6):L-(p.recoilF>3?1.5:0);}
const POSE={g:[],rows:[]};
const LGX=-.7071,LGY=-.7071; // key light from the upper left, in sprite space
function posePlayer(p){
  const A=ANIM[CH.id],spr=SPR,sw=SW,sh=SH,w=sw+PP*2,h=sh+PP*2,G=POSE.g;
  G.length=w*h;G.fill('.');
  const put=(x,y,ch)=>{x=Math.round(x)+PP;y=Math.round(y)+PP;if(x>=0&&x<w&&y>=0&&y<h)G[y*w+x]=ch;};
  const n=sh-A.leg,air=!p.ground&&!p.fly,ph=p.walkPh||0,walking=ph>0&&p.ground&&!p.fly;
  const up=p.crouch>6?2:p.landF>0?1:walking&&Math.abs(Math.cos(ph*2))>.75?1:0; // squash on landing / crouch / weight on each step
  const mode=armMode(p),hide=new Set(),twoArms=mode&&!['aim','punch','super','visor','chest'].includes(mode);
  if(mode&&mode!=='chest'){for(const [x,y] of A.hide){hide.add(y*sw+x);if(twoArms)hide.add(y*sw+(sw-1-x));}}
  // posed arms are thick shaded limbs: shoulder -> (elbow ->) hand, plus a solid fist / glove.
  // The back arm is laid down before the body so the torso overlaps its shoulder; the front arm goes on top.
  const C=A.armC,T=A.tipC,aw=A.aw,fs=A.fs,front=[],back=[];
  const limb=(x0,y0,x1,y1,wd)=>{const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,lit=nx*LGX+ny*LGY>0,n=Math.ceil(L*2)+1,hw=(wd-1)/2;
    for(let k=0;k<=n;k++){const f=k/n,cx=x0+dx*f,cy=y0+dy*f;
      for(let o=-hw;o<=hw+.01;o+=.5){const s=o>.01?lit:o<-.01?!lit:null;put(cx+nx*o,cy+ny*o,s===null?C[1]:s?(wd>2?C[0]:C[1]):C[2]);}}};
  const fist=(x,y,s)=>{const h=s/2;for(let yy=-h;yy<h-.01;yy++)for(let xx=-h;xx<h-.01;xx++){const u=(xx+.5)/h,v=(yy+.5)/h,l=u*LGX+v*LGY;put(x+xx+.5,y+yy+.5,l>.45?T[0]:l<-.45?T[2]:T[1]);}};
  const arm2=(list,sx,sy,ex,ey,hx,hy,w0,fsz)=>list.push(()=>{limb(sx,sy,ex,ey,w0);limb(ex,ey,hx,hy,w0);if(fsz)fist(hx,hy,fsz);});
  const arm1=(list,sx,sy,hx,hy,w0,fsz)=>list.push(()=>{limb(sx,sy,hx,hy,w0);if(fsz)fist(hx,hy,fsz);});
  if(mode&&mode!=='chest'){
    const fx=A.sh[0],fy=A.sh[1]+up,bx=sw-1-A.sh[0],al=A.al;
    if(mode==='aim'||mode==='punch'){const L=aimLocal(p),len=armLen(p,mode),hx=fx+L.lx*len,hy=fy+L.ly*len;
      arm1(front,fx,fy,hx,hy,aw,A.claws?fs:mode==='punch'?fs+1:fs);
      if(A.claws)front.push(()=>{for(let c=-1;c<=1;c++)for(let k=1;k<=3;k++)put(hx+L.lx*(k+.5)-L.ly*c,hy+L.ly*(k+.5)+L.lx*c,A.claws);});}
    else if(mode==='visor'){arm2(front,fx,fy,fx+1.5,fy-2.5,fx-1.5,2.5,aw,fs);}
    else if(mode==='slide'){arm1(front,fx,fy,fx+3,fy+al-.5,aw,fs);arm1(back,bx,fy,bx-1,fy+al-1,aw,fs);}
    else if(mode==='hold'){ // overhead lift: elbows out at head height, fists just above the head, load resting on them
      arm2(front,fx,fy,fx+2.5,fy-4.5,fx-1.5,-2.5,aw,fs);arm2(back,bx,fy,bx-2.5,fy-4.5,bx+1.5,-2.5,aw,fs);}
    else if(mode==='throw'){const k=Math.max(0,Math.min(1,p.throwF/10)),lx=(a,b)=>a+(b-a)*(1-k); // heave: hands sweep from overhead to forward
      arm2(front,fx,fy,lx(fx+2.5,fx+al*.55),lx(fy-4.5,fy-1),lx(fx-1.5,fx+al),lx(-2.5,fy+1),aw,fs);
      arm2(back,bx,fy,lx(bx-2.5,bx+al*.5),lx(fy-4.5,fy-.5),lx(bx+1.5,bx+al*.9),lx(-2.5,fy+1.5),aw,fs);}
    else if(mode==='both'){const L=aimLocal(p);arm1(front,fx,fy,fx+L.lx*al,fy+L.ly*al,aw,fs);arm1(back,bx,fy,bx+L.lx*(al-1),fy+L.ly*(al-1),aw,fs);}
    else if(mode==='up'){const o=Math.sin(frame*.3)*.6;arm2(front,fx,fy,fx+1.5,fy-3,fx+1+o,fy-al-1,aw,fs);arm2(back,bx,fy,bx-1.5,fy-3,bx-1-o,fy-al-1,aw,fs);}
    else if(mode==='back'){arm1(front,fx,fy,fx-3,fy+al-2,aw,fs);arm1(back,bx,fy,bx-3,fy+al-2.5,aw,fs);}
    else if(mode==='super'){arm1(front,fx,fy,fx+2,fy-al,aw,fs);}
    else if(mode==='grip'){const L=aimLocal(p,p.grip.x,p.grip.y);arm1(front,fx,fy,fx+L.lx*al,fy+L.ly*al,aw,fs);arm1(back,bx,fy,bx+L.lx*(al-.5),fy+L.ly*(al-.5),aw,fs);}
    else if(mode==='clap'){arm1(front,fx,fy,fx+al-1,fy+1.5,aw,fs);arm1(back,bx,fy,fx+al-2.5,fy+1,aw,fs);}
    else if(mode==='cling'){const hx=fx+2.5,hy=fy-al+1.5;arm1(front,fx,fy,hx,hy,aw,fs);arm1(back,bx,fy,fx+1.5,fy+1,aw,fs);
      if(A.claws)front.push(()=>{for(let c=-1;c<=1;c++)for(let k=1;k<=3;k++)put(hx+k*.7,hy-1+c-k*.7,A.claws);});}
  }
  for(const f of back)f();
  const blink=A.blink&&(frame%170)<5;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){let ch=spr[y][x];if(ch==='.'||hide.has(y*sw+x))continue;
    if(blink&&ch===A.blink)ch=A.lid;
    if(y<A.leg||(A.cape&&A.cape.includes(ch))){put(x,y+(y<A.leg?up:0),ch);continue;}
    const k=(y-A.leg+1)/n,side=x<A.mid?1:-1;let dx=0,dy=0;
    if(p.fly&&CH.id==='iceman'){dx=-side*Math.round(k*1.2);dy=0;}                // surfing stance on the slide
    else if(p.fly){dx=-Math.round(k*2.4);dy=-Math.round(k*.6);}                       // legs trail behind in flight
    else if(air){if(p.vy<0){dx=-side*Math.round(k);dy=-Math.round(k*2.2);}           // tuck on the way up
                 else dx=-side*Math.round(k*1.6);}                                   // spread on the way down
    else if(walking){const lift=Math.max(0,Math.sin(ph)*side);if(k>.4){dy=-Math.round(lift*2*k);dx=-side*Math.round(lift*k*1.3);}} // alternate steps: one knee lifts and swings out (front leg forward, back leg back)
    else if(p.landF>0||p.crouch>6)dx=-side*Math.round(k*(p.crouch>6?2.2:1.4));
    put(x+dx,y+dy,ch);}
  for(const f of front)f();
  if(mode==='chest'){const cx=Math.floor(sw/2),cy=A.leg-4+up,c=(frame>>1)&1?'@':'*';for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(Math.abs(a)+Math.abs(b)<2)put(cx+a,cy+b,c);}
  const R2=POSE.rows;R2.length=h;for(let y=0;y<h;y++)R2[y]=G.slice(y*w,(y+1)*w).join('');
  return R2;
}
let SPR=SPR_DOOM, SPC=PAL_DOOM, SW=9, SH=16, PW=7, PH=16;
const pl_={x:60,y:100,vx:0,vy:0,face:1,hp:100,en:100,ground:false,slam:false,fly:false,coyote:0,buffer:0,lastJump:-99,jumpHeldF:0,boost:0,boostCd:0,bob:0,hist:[],airF:0,ang:0,charge:0,chargeCd:0,leap:false,slamOpt:null,hurtF:0};
function boxHit(x,y){for(let yy=Math.ceil(y-PH);yy<=Math.floor(y-1);yy++)for(let xx=Math.floor(x-PW/2);xx<=Math.floor(x+PW/2);xx++)if(solidAt(xx,yy))return true;return false;}
let SPAWNX=50;
function spawnPlayer(){
  const x=pl_.x=SPAWNX+R()*30|0;let y=0;while(y<H-1&&!solidAt(x,y))y++;pl_.y=y-1;pl_.vx=pl_.vy=0;pl_.hp=CH.hp;pl_.en=100;pl_.fly=false;pl_.slam=false;pl_.leap=false;
  camX=Math.max(0,Math.min(W-VW,pl_.x-VW/2));camY=Math.max(0,Math.min(H-VH,pl_.y-VH/2));
}
const keys={}, pressed={};
const mouse={sx:VW/2,sy:VH/2,wx:0,wy:0,down:false,right:false};
let CH=null; // current hero, set by setChar()
const glowRGB=()=>rgb(CH.glow[0],CH.glow[1],CH.glow[2]);
function toggleFly(on){const p=pl_;if(on&&!CH.fly)return;p.fly=on;p.slam=false;if(on){p.vy=Math.min(p.vy,-1.2);rings.push({x:p.x,y:p.y-PH/2,r:3,vr:1.6,life:12,c:CH.glow});for(let k=0;k<20;k++){const a=R()*6.283;spawn(p.x,p.y,Math.cos(a)*1.5,Math.sin(a)*.6+.5,CH.thrust(),14,0,1,0,1);}}}
// shared terrain carving used by boost-ramming, Hulk's charge and Thor's hammer
function carve(cx,cy,r,vx,vy,floorY=H){
  bgHit(cx,cy,r);
  const ri=Math.ceil(r);
  for(let y=-ri;y<=ri;y++)for(let x=-ri;x<=ri;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H||Y>=floorY)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F)continue;
    if(m===STEEL&&R()<.5||m===OBSID&&R()<.5)continue;
    if(R()<.4)spawn(X,Y,vx*.6+(R()-.5)*3,vy*.6+(R()-.5)*3-1,col[i],70,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);
    if(m===PROPANE)booms.push([X,Y,6]);
    setc(i,EMPTY);}
}
function bore(p,sp){
  const r=Math.min(9,6+(sp-CH.fs)*.8);
  carve(p.x+p.vx/sp*4,p.y-PH/2+p.vy/sp*4,r,p.vx,p.vy);
  damageEnemies(p.x,p.y-PH/2,r+6,3,p.vx*.5,p.vy*.5);
  if(frame%3===0)shake=Math.max(shake,2.5);
}
function hurt(d){
  const p=pl_;if(d<=0)return;
  if(p.dodge>0||p.script>0)return; // mid-dash, mid-leap, rolling: untouchable
  if(SPAWN.god)return;
  if(shieldOn){for(let k=0;k<4;k++)spawn(p.x+(R()-.5)*30,p.y-8+(R()-.5)*30,(R()-.5)*2,(R()-.5)*2,glowRGB(),10,0,1,0,1);return;}
  if(p.metal>0){for(let k=0;k<5;k++)spawn(p.x+(R()-.5)*8,p.y-R()*PH,(R()-.5)*3,-R()*2,rgb(255,240,200),8,0,1,1);return;}
  if(p.rage>0||p.eye>0)d*=.5;
  if(p.grit>0){const dd=d*CH.armor;p.gritD+=dd;p.hp=Math.max(1,p.hp-dd);p.hurtF=8;hurtV=Math.min(1,hurtV+dd/40);shake=Math.max(shake,2);snd('hurt',p.x,p.y,{gap:.14,v:.5});
    for(let k=0;k<4;k++)spawn(p.x+(R()-.5)*8,p.y-R()*PH,(R()-.5)*2,-R()*2,rgb(255,60+R()*60|0,40),12,0,1,0,1);return;}
  p.hp-=d*CH.armor;p.hurtF=8;hurtV=Math.min(1,hurtV+d*CH.armor/30);shake=Math.max(shake,2);snd('hurt',p.x,p.y,{gap:.14,v:Math.min(1,.4+d/20)});
}
function updPlayer(){
  const p=pl_;
  const ax=(keys.KeyD?1:0)-(keys.KeyA?1:0), ay=(keys.KeyS?1:0)-((keys.KeyW||keys.Space)?1:0);
  const jumpP=pressed.KeyW||pressed.Space, jumpH=keys.KeyW||keys.Space, shiftP=pressed.ShiftLeft||pressed.ShiftRight, shiftH=keys.ShiftLeft||keys.ShiftRight;
  const FS=CH.fs, BOOST=CH.boost;
  if(pressed.KeyF)toggleFly(!p.fly);
  if(CH.id==='cyclops')opticThrust(p,keys.KeyF,ax);
  if(p.boostCd>0)p.boostCd--; if(p.chargeCd>0)p.chargeCd--; if(p.hurtF>0)p.hurtF--;
  if(p.metal>0)p.metal--; if(p.wings>0)p.wings--;
  if(p.metal>0&&!p.ground&&p.vy>3)carve(p.x,p.y+2,4,0,p.vy,H); // adamantium cannonball through the floor
  if(p.wings>0){damageEnemies(p.x,p.y-PH/2,10,3,0,0,true);for(let k=0;k<4;k++){const side=k&1?1:-1,u=R(),wx=p.x-p.face*2+side*(4+u*16),wy=p.y-PH*.7-Math.sin(u*3)*6+u*4;spawn(wx,wy,side*.4-p.vx*.2,-.3,R()<.5?rgb(255,170,50):rgb(255,90,30),12,R()<.02?FIRE:0,1,0,1);}}
  if(p.thrustF>0)p.thrustF--; if(senseT>0)senseT--; if(p.spin>0)p.spin--; if(p.eye>0)p.eye--;
  if(p.dodge>0)p.dodge--; if(p.stealth>0)p.stealth--;
  if(p.grit>0){p.grit--;if(frame%3===0)spawn(p.x+(R()-.5)*10,p.y-R()*PH,(R()-.5)*.5,-.8,rgb(255,40+R()*80|0,30),14,0,1,0,1);
    if(p.grit===0&&CH.id==='wolverine'){const h=p.gritD*.6;p.hp=Math.min(CH.hp,p.hp+h);fxWord(p.x,p.y-PH-8,'+'+(h|0)+' HP',1,'#ffc93c',true);}}
  if(p.castF>0)p.castF--; if(p.recoilF>0)p.recoilF--; if(p.landF>0)p.landF--; if(p.punchF>0)p.punchF--; if(p.throwF>0)p.throwF--;
  if(CH.id==='wolverine'&&p.hp<CH.hp)p.hp=Math.min(CH.hp,p.hp+.12); // healing factor never stops
  if(p.rage>0){p.rage--;if(CH.id==='wolverine'&&frame%8===0){const e=nearestEnemy(p.x,p.y-PH/2,22);if(e){hitEnemy(e,14,p.face*2,-1);slashFx(e.x,e.y,Math.atan2(e.y-p.y,e.x-p.x));}}if(frame%2===0)spawn(p.x+(R()-.5)*12,p.y-R()*PH,(R()-.5)*.5,-.6,CH.id==='hulk'?pickC(GAMMA):rgb(255,60+R()*60,40),12,0,1,0);}
  if(p.script>0){p.script--;p.ground=false;p.hist.unshift([p.x,p.y]);if(p.hist.length>12)p.hist.pop();return;} // a power is steering the hero (Meteor Drop, Wrecking Ball, Puny God...)
  { // walk cycle phase; a puff of dust (and a thud for Hulk) on every footfall
    const w=p.ground&&!p.fly&&Math.abs(p.vx)>.3;const prev=p.walkPh||0;p.walkPh=w?prev+Math.abs(p.vx)*.3:0;
    if(w&&Math.floor(p.walkPh/Math.PI)!==Math.floor(prev/Math.PI)){for(let k=0;k<(CH.id==='hulk'?6:3);k++)spawn(p.x-p.face*2+(R()-.5)*4,p.y-1,(R()-.5)*1.2-p.vx*.2,-R()*.8,rgb(150,140,125),14+R()*8,0,0,0,1);if(CH.id==='hulk')shake=Math.max(shake,1.2);snd(CH.id==='hulk'?'stomp':'step',p.x,p.y,{v:CH.id==='hulk'?.8:.35});}
  }
  if(CH.fly&&shiftP&&p.boostCd===0){
    if(!p.fly)toggleFly(true);
    p.boost=22;p.boostCd=34;rings.push({x:p.x,y:p.y-PH/2,r:4,vr:3,life:14,c:CH.glow});flash(p.x,p.y-PH/2,30,CH.glow,6);shake+=3;
    const d=Math.hypot(ax,ay)||1, bx=ax||ay?ax/d:p.face, by=ax||ay?ay/d:0; p.vx=bx*FS*BOOST; p.vy=by*FS*BOOST;
  }
  if(!CH.fly&&shiftP&&p.chargeCd===0){p.charge=28;p.chargeCd=40;if(ax)p.face=ax;rings.push({x:p.x,y:p.y-PH/2,r:4,vr:2.5,life:12,c:CH.glow});shake+=3;}
  // holding Shift keeps the boost (and terrain boring) going indefinitely
  if(p.fly&&shiftH&&p.boost>0)p.boost=Math.max(p.boost,2);
  if(!CH.fly&&shiftH&&p.charge>0)p.charge=Math.max(p.charge,2);
  if(!p.fly)p.boost=0;
  if(p.fly){
    // free flight: velocity eases toward input direction; light easing on release = glide → hover
    let dx=ax,dy=ay;const mag=Math.hypot(dx,dy);if(mag>0){dx/=mag;dy/=mag;}
    const boosting=p.boost>0, spd=FS*(boosting?BOOST:1)*(p.wings>0?1.7:1);
    if(boosting&&mag===0){const s=Math.hypot(p.vx,p.vy)||1;dx=p.vx/s;dy=p.vy/s;}
    const k=boosting?.25:mag>0?.2:.06;
    p.vx+=(dx*spd-p.vx)*k; p.vy+=(dy*spd-p.vy)*k;
    if(mag===0&&!boosting&&Math.hypot(p.vx,p.vy)<.3){p.bob+=.09;p.vy+=Math.sin(p.bob)*.02;}
    if(ax)p.face=ax;
    if(boosting){p.boost--;if(frame%3===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:14});}
    const sp=Math.hypot(p.vx,p.vy);
    p.boring=sp>FS*1.25; if(p.boring)bore(p,sp);
    if(frame%2===0)spawn(p.x-p.vx*2+(R()-.5)*3,p.y-4-p.vy*2,-p.vx*.3+(R()-.5)*.5,-p.vy*.3+.4,CH.thrust(),8+R()*8,0,1,0,1);
    if(CH.id==='iron'&&frame%2===0)for(const fx of [-2,2])spawn(p.x+fx,p.y,(R()-.5)*.4+p.vx*-.2,1.5+R(),R()<.5?rgb(255,220,150):rgb(255,255,255),6,0,1,0);
    const target=CH.id==='iceman'?p.vx*.09:sp>1.2?Math.atan2(p.vx,-p.vy)*.85:p.vx*.15;
    if(CH.id==='iceman')iceSlideStep(p);
    p.ang+=(target-p.ang)*.2;
    if(ay>0&&p.ground&&!boosting){ // touch down
      if(sp>2.5)superLand(p,sp); toggleFly(false); p.ang=0;
    }
  } else {
    p.ang*=.7;
    if(p.ground)p.coyote=7;else if(p.coyote>0)p.coyote--;
    const wolf=CH.id==='wolverine',hulk=CH.id==='hulk';
    if(jumpP&&!(wolf&&p.cling)){
      if(CH.fly&&!p.ground&&frame-p.lastJump<16){toggleFly(true);}
      else p.buffer=8;
      p.lastJump=frame;
    }
    if(p.buffer>0)p.buffer--;
    if(!p.fly){
      if(p.ground){p.clap=1;p.airDash=1;}
      if(p.charge>0){ // Hulk shoulder-charge: plough through whatever is ahead
        p.charge--;p.vx=p.face*5.2;carve(p.x+p.face*5,p.y-PH/2,PH*.62,p.vx,0,p.ground||!keys.KeyS?Math.floor(p.y):H);damageEnemies(p.x+p.face*6,p.y-PH/2,14,4,p.face*4,-2);
        if(frame%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});shake=Math.max(shake,3);
      } else {
        // Wolverine's feral sprint: keep running and he keeps accelerating
        if(wolf){if(p.ground&&ax&&p.vx*ax>CH.run*.8)p.sprint=Math.min(90,(p.sprint||0)+1);else if(p.ground)p.sprint=Math.max(0,(p.sprint||0)-(ax?2:6));}
        const sk=wolf?1+.7*Math.max(0,Math.min(1,((p.sprint||0)-24)/40)):1;
        const target=ax*CH.run*sk*(held&&held.overhead?.6:1)*(p.rage>0?1.6:1)*(p.crouch>6?.15:1);
        if(p.ground)p.vx+=(target-p.vx)*(ax?.28:.35)*(p.onIce?.18:1);
        else if(p.leap)p.vx+=ax*.06; // big leaps keep their momentum; a little steering
        else if(ax&&!(Math.sign(p.vx)===ax&&Math.abs(p.vx)>Math.abs(target)))p.vx+=(target-p.vx)*(wolf?.2:hulk?.15:.12); // air control never brakes you below what you already have
        else if(!ax)p.vx*=.975;
        if(ax)p.face=ax;
        if(sk>1.3&&p.ground){if(frame%4===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});if(frame%2===0)spawn(p.x-p.face*3,p.y-1,-p.vx*.3+(R()-.5),-R()*.6,rgb(160,150,130),12,0,0,0,1);}
      }
      // ---- Hulk: hold S to crouch and charge, then jump = gamma leap toward the cursor; jump in mid-air = thunderclap double jump; S in mid-air = dive slam
      if(hulk&&!held){
        if(p.ground&&keys.KeyS&&!p.charge){p.crouch=Math.min(66,(p.crouch||0)+1);
          if(p.crouch>6){const k=Math.min(1,(p.crouch-6)/50);if(frame%3===0)rings.push({x:p.x,y:p.y-2,r:4+k*10,vr:-.4,life:6,c:GAMMA});if(frame%2===0)spawn(p.x+(R()-.5)*12,p.y-1,(R()-.5)*.6,-R()*1.6*k,pickC(GAMMA),14,0,1,0,1);if(p.crouch===56){fxWord(p.x,p.y-PH-6,'MAX!',.8,'#bff07a',true);snd('charge',p.x,p.y);}}}
        else if(!keys.KeyS)p.crouch=0;
        if(p.ground&&p.crouch>6&&jumpP){const k=Math.min(1,(p.crouch-6)/50),a=aimFrom({x:p.x,y:p.y-PH/2});let dx=a.dx,dy=Math.min(a.dy,-.35);const d=Math.hypot(dx,dy);dx/=d;dy/=d;
          p.vx=dx*(4.5+3.5*k);p.vy=Math.min(-4.2,dy*(6.2+2.6*k)-2);p.leap=true;p.leapPow=k;p.ground=false;p.crouch=0;p.buffer=0;p.coyote=0;
          explode(p.x,p.y+1,4+k*5|0,{self:true,quiet:true,col:[200,190,160]});shake+=3+k*5;for(let n=0;n<20+k*30;n++)spawn(p.x+(R()-.5)*10,p.y,(R()-.5)*4,-R()*2.5,rgb(160,150,130),24,0,0,0,1);
          fxWord(p.x,p.y-PH-6,k>.8?'GAMMA LEAP!':'HUP!',.8+k*.5,'#bff07a',true);snd('leap',p.x,p.y,{size:k});}
        if(!p.ground&&jumpP&&p.coyote===0&&p.clap&&!p.slam){p.clap=0;p.buffer=0;p.vy=Math.min(p.vy,-5.4);p.clapF=10;
          const cx=p.x,cy=p.y+4;rings.push({x:cx,y:cy,r:3,vr:3.2,life:12,c:[230,255,220]},{x:cx,y:cy,r:2,vr:2,life:14,c:GAMMA});flash(cx,cy,34,[220,255,200],6);fxBurst(p.x,p.y-PH*.6,26,'#bff07a');
          damageEnemies(cx,cy+6,26,16,0,5);for(let n=0;n<np;n++){const dx=px[n]-cx,dy=py[n]-cy;if(dy>-6&&dy<60&&Math.abs(dx)<40){pvy[n]+=2;pvx[n]+=dx*.02;}}
          for(let n=0;n<40;n++){const an=Math.PI*.15+R()*Math.PI*.7;spawn(cx,cy,Math.cos(an)*(2+R()*3),Math.sin(an)*(2+R()*3),R()<.5?rgb(230,240,220):rgb(170,160,140),16+R()*12,0,0,0,1);}
          fxWord(p.x,p.y-PH-4,'CLAP!',1,'#bff07a',true);shake+=4;}
        if(!p.ground&&pressed.KeyS&&p.airF>5&&!p.slam){p.slam=true;p.slamOpt={col:GAMMA,dive:true};p.diveY=p.y;p.vy=Math.max(p.vy,5);p.leap=false;fxWord(p.x,p.y-PH-6,'INCOMING!',.8,'#bff07a',true);}
      }
      // ---- Wolverine: claws into walls. Hold toward a wall in the air to cling; W climbs, S slides, Space kicks off
      if(wolf){
        const side=ax,touch=s=>boxHit(p.x+s*1.5,p.y-4)&&boxHit(p.x+s*1.5,p.y-PH+4);
        if(!p.cling&&!p.ground&&side&&p.vy>-3.5&&touch(side)){p.cling=side;p.vx=0;snd('snikt',p.x,p.y,{v:.5});for(let k=0;k<6;k++)spawn(p.x+side*4,p.y-PH*.6,-side*R()*1.5,(R()-.5)*1.5,rgb(255,240,200),8,0,1,1);}
        if(p.cling&&(p.ground||ax!==p.cling||!touch(p.cling)))p.cling=0;
        if(p.cling&&pressed.Space){p.vx=-p.cling*4.6;p.vy=-5.6;p.face=-p.cling;p.cling=0;p.buffer=0;p.sprint=40;
          fxWord(p.x,p.y-PH-4,'HUP!',.7,'#f3e9d2',true);snd('whoosh',p.x,p.y,{v:.5});afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});
          for(let k=0;k<10;k++)spawn(p.x-p.face*4,p.y-PH/2+(R()-.5)*8,-p.face*(1+R()*2),(R()-.5)*2,rgb(170,160,140),16,0,0,1);}
      }
      if(p.buffer>0&&p.coyote>0){p.vy=-CH.jump;p.buffer=0;p.coyote=0;p.ground=false;snd('jump',p.x,p.y,{v:hulk?.8:.4,heavy:hulk});if(hulk){shake+=2;for(let k=0;k<16;k++)spawn(p.x+(R()-.5)*8,p.y,(R()-.5)*3,-R()*1.5,rgb(160,150,130),20,0,0,0,1);}}
      if(!jumpH&&p.vy<-1.5&&!p.leap&&!p.clapF)p.vy*=.6; // jump cut
      if(CH.fly&&!p.ground&&jumpH&&p.vy>0){p.jumpHeldF++;if(p.jumpHeldF>10)toggleFly(true);}else p.jumpHeldF=0;
      p.vy+=p.vy<0&&(jumpH||p.leap||p.clapF)?.24:.42;
      if(p.slam)p.vy=Math.max(p.vy,8);
      p.vy=Math.min(p.slam?10:6.5,p.vy);
      if(p.cling){ // clinging: claws gouge the wall as he climbs
        p.vy=keys.KeyW?-1.8:keys.KeyS?2.4:.35;p.vx=0;p.airF=0;
        if(frame%(keys.KeyW||keys.KeyS?3:8)===0){const X=p.x+p.cling*(PW/2+1)|0;for(let c=-1;c<=1;c++){const Y=p.y-PH*.62+c*2.5|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
          if(m===STEEL||m===OBSID){spawn(X,Y,-p.cling*(R()*2),(R()-.5)*2,rgb(255,220,150),8,0,1,1);}
          else if(KIND[m]===S){if(m===GLASS||m===LEAF||m===WOOD&&R()<.5){spawn(X,Y,-p.cling*R(),R(),col[i],40,m===GLASS?0:RUBBLE,m===GLASS?1:0);setc(i,EMPTY);}else col[i]=shade(col[i],.62);}}
          if(keys.KeyW||keys.KeyS)snd('scrape',p.x,p.y,{v:.35});}}
      // ---- swimming: liquids buoy you and slow you down; hold jump to swim up, jump near the surface to leap out
      {let wet=0,liq=0;const nS=Math.max(1,Math.ceil((PH-2)/4));for(let yy=p.y-PH+2;yy<p.y;yy+=4){const i=(yy|0)*W+(p.x|0);if(i>=0&&i<N&&KIND[t[i]]===L){wet++;liq=t[i];}}
        const wf=wet/nS;
        if(wf>.2){if(!p.wet&&Math.abs(p.vy)>2){snd('splash',p.x,p.y-PH/2,{v:Math.min(1,Math.abs(p.vy)/6)});for(let k=0;k<26;k++)spawn(p.x+(R()-.5)*PW,p.y-PH/2,(R()-.5)*3,-1-R()*3.5,col[((p.y-PH/2)|0)*W+(p.x|0)]||rgb(60,110,210),40,0,0,1);}
          p.wet=1;const heavy=CH.id==='hulk'?.75:1;p.vy-=.52*wf*Math.min(1.2,DENS[liq]/10)*heavy*(liq===LAVA?.35:1);p.vx*=.9;p.vy*=.9;
          if(jumpH)p.vy-=.3;if(keys.KeyS)p.vy+=.25;if(jumpP&&wf<.75){p.vy=-CH.jump*.85;p.buffer=0;}p.airF=0;}
        else p.wet=0;}
      if(!p.ground)p.airF++;
    }
  }
  p.vx=Math.max(-8,Math.min(8,p.vx));p.vy=Math.max(-8,Math.min(10,p.vy));
  // move: x then y with step-up
  const wasGround=p.ground, fallV=p.vy;
  if(p.fly&&p.boring){p.x+=p.vx;p.y+=p.vy;p.ground=false;}else{
  let sx=Math.sign(p.vx),mx=Math.abs(p.vx);
  while(mx>0){const st=Math.min(1,mx),nx=p.x+sx*st;
    if(!boxHit(nx,p.y))p.x=nx;else if(!boxHit(nx,p.y-1))p.x=nx,p.y-=1;else if(!p.fly&&!boxHit(nx,p.y-2))p.x=nx,p.y-=2;
    else{ // Wolverine vaults anything up to waist-high instead of stopping dead
      if(CH.id==='wolverine'&&!p.fly&&!p.cling&&!(p.vaultT>frame)){for(let k=3;k<=13;k++)if(!boxHit(nx,p.y-k)&&!boxHit(p.x,p.y-k)){p.vy=Math.min(p.vy,-2.4-k*.22);p.vaultT=frame+8;p.landF=3;break;}}
      p.vx=p.fly?p.vx*.3:p.vaultT>frame?p.vx*.6:0;break;}
    mx-=st;}
  let sy=Math.sign(p.vy),my=Math.abs(p.vy);p.ground=false;
  while(my>0){const st=Math.min(1,my),ny=p.y+sy*st;
    if(!boxHit(p.x,ny))p.y=ny;else{if(sy>0)p.ground=true;p.vy=p.fly?p.vy*.3:0;break;}
    my-=st;}
  if(!p.ground&&p.vy>=0&&boxHit(p.x,p.y+1))p.ground=true;
  }
  if(p.ground&&!wasGround&&!p.fly){
    p.landF=fallV>3?8:4;p.clapF=0;
    if(p.metal>0&&fallV>4)quake(p.x,p.y,{col:[200,206,216],r:24});
    if(p.slam){p.slam=false;const o=Object.assign({},p.slamOpt||{});if(o.dive)o.r=Math.min(46,16+Math.max(0,p.y-p.diveY)*.16|0);quake(p.x,p.y,o);p.leap=false;}
    else if(p.leap){p.leap=false;quake(p.x,p.y,{col:CH.glow,r:p.leapPow!=null?18+p.leapPow*18|0:30});p.leapPow=null;}
    else if(fallV>(CH.id==='hulk'?4.2:5.8))superLand(p,fallV);
    else snd('land',p.x,p.y,{v:Math.min(1,fallV/6)*(CH.id==='hulk'?1:.5),heavy:CH.id==='hulk'});
    p.airF=0;
  }
  if(p.clapF>0)p.clapF--;
  {const fi=((p.y+1)|0)*W+(p.x|0);p.onIce=p.ground&&fi>=0&&fi<N&&(t[fi]===ICE||t[fi-1]===ICE||t[fi+1]===ICE);}
  if(p.fly&&p.boring)p.y=Math.min(H-2,p.y);
  else if(boxHit(p.x,p.y)){if(!boxHit(p.x,p.y-1))p.y-=1;else if(!boxHit(p.x,p.y-2))p.y-=2;else punchOut(p);}
  p.x=Math.max(4,Math.min(W-4,p.x));if(p.y<PH+1)p.y=PH+1,p.vy=Math.max(0,p.vy);
  if(p.y>H+20)p.hp=0;
  // hazards
  let dmg=0;
  for(let yy=p.y-PH|0;yy<p.y;yy+=3)for(let xx=p.x-3|0;xx<=p.x+3;xx+=2){if(yy<0||yy>=H)continue;const m=t[yy*W+xx];if(m===LAVA)dmg+=1.4;else if(m===ACID)dmg+=.6;else if(m===FIRE)dmg+=.25;}
  if(!shieldOn&&p.boost<=0&&p.charge<=0&&!SPAWN.god)p.hp-=dmg*CH.armor;
  if(p.grit>0&&p.hp<1)p.hp=1;
  if(SPAWN.inf)p.en=100;
  p.en=Math.min(100,p.en+(mouse.down?.12:.5));
  p.hp=Math.min(CH.hp,p.hp+CH.hp*.0003);
  if(p.hp<=0){flash(p.x,p.y-8,40,[255,80,60],12);if(!(MODE&&MODE.onDeath&&MODE.onDeath(MS)))spawnPlayer();}
  p.hist.unshift([p.x,p.y]); if(p.hist.length>12)p.hist.pop();
}
function superLand(p,v){
  fxWord(p.x,p.y-PH-8,'WHAM!',1.1,'#ffc93c',true);
  const big=CH.id==='hulk';
  const r=Math.min(big?12:7,(big?4:2)+v*(big?1:.6)|0);
  explode(p.x,p.y+1,r,{self:true,col:big?[200,190,160]:null});
  for(let k=0;k<(big?60:30);k++){const d=R()<.5?-1:1;spawn(p.x+d*R()*6,p.y-1,d*(1+R()*3),-R()*1.5,rgb(170,160,140),20+R()*20,0,0,0,1);}
  rings.push({x:p.x,y:p.y,r:3,vr:2.5,life:14,c:CH.glow});
  if(big)damageEnemies(p.x,p.y,r*3,20,0,-3);
  shake=Math.min(22,shake+v*(big?2:1.2));
}
function hand(){
  const p=pl_,mode=ANIM[CH.id]&&armMode(p);
  if(mode==='aim'||mode==='punch'||mode==='both'){const L=aimLocal(p),len=armLen(p,mode==='both'?'aim':mode);return{x:L.shx+L.wx*len,y:L.shy+L.wy*len};}
  return {x:p.x+p.face*(PW/2+.5),y:p.y-PH/2};
}

// ================= camera =================
let camX=0,camY=0;
function updCamera(){
  const p=pl_, a=aim();
  const sp=Math.hypot(p.vx,p.vy);
  const tx=p.x+a.dx*40+p.vx*14-VW/2, ty=p.y-8+a.dy*30+p.vy*12-VH/2;
  const k=Math.min(.35,.08*(1+sp/CH.fs*2.6));
  camX+=(tx-camX)*k; camY+=(ty-camY)*k;
  camX=Math.max(0,Math.min(W-VW,camX)); camY=Math.max(0,Math.min(H-VH,camY));
  mouse.wx=camX+mouse.sx; mouse.wy=camY+mouse.sy;
}

// ================= powers =================
// A power is {n:name, fn(a,p,use)} (a = aim from the hand, use(cost) spends energy) or
// {n, tk:{...}} for grab-and-throw powers handled by updTelekinesis.
let cur=0,cd=0,cdMax=1;
// spawn menu state (sandbox): tool = what the next click places; pause/slow/god/inf are its toggles
const SPAWN={open:false,tool:null,brush:4,snap:true,pause:false,slow:false,god:false,inf:false,peace:false};
// ---- sound: positional wrappers around the synth in audio.js (pan by screen x, fade with distance off screen)
const SHOT_SND={bolt:'bolt',missile:'missile',repulsor:'repulsor',hammer:'whoosh',psi:'psi',shard:'ice',optic:'zap',flare:'pop',bomb:'thud',proton:'charge',axe:'whoosh',pin:'whoosh',rocket:'missile',mbolt:'bolt'};
function sndAt(x,y,v){const dx=(x-(camX+VW/2))/(VW*.5),dy=(y-(camY+VH/2))/(VH*.5),d=Math.max(Math.abs(dx),Math.abs(dy));if(d>3.4)return null;return[(v??1)*(d>1?1/(1+(d-1)*1.5):1),Math.max(-1,Math.min(1,dx*.8))];}
function snd(name,x,y,o={}){if(!SET.sound)return;const a=sndAt(x,y,o.v);if(!a)return;o.v=a[0];o.pan=a[1];play(name,o);}
function sndLoop(id,name,x,y,o={}){if(!SET.sound)return;const a=sndAt(x,y,o.v);if(!a)return;o.v=a[0];o.pan=a[1];sfxLoop(id,name,o);}
let ambFire=0,ambLava=0;
const shots=[],drones=[],strikes=[]; let vortex=null, held=null, heldE=null, tkPrev=false, storm=null;
function aim(){const h=hand();const dx=mouse.wx-h.x,dy=mouse.wy-h.y,d=Math.hypot(dx,dy)||1;return{h,dx:dx/d,dy:dy/d,d};}
const CYAN=[150,235,255], BLUE=[160,205,255], GAMMA=[130,255,90];
const pickC=c=>rgb(c[0]*(.7+R()*.3),c[1]*(.7+R()*.3),c[2]*(.7+R()*.3));
const DOOM_POWERS=[
 {n:'Eldritch Bolt',fn:(a,p,use)=>{if(!use(5))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6.5,vy:a.dy*6.5,type:'bolt',life:140,boom:11,fire:.25,green:true});cd=8;shake+=1.2;flash(a.h.x,a.h.y,10,[80,255,120],4);}},
 {n:'Mystic Fire',fn:(a,p,use)=>{if(!use(.4))return;for(let k=0;k<8;k++){const s=2.6+R()*3,sp=(R()-.5)*.4;spawn(a.h.x,a.h.y,(a.dx-sp*a.dy)*s+(R()-.5)*.4,(a.dy+sp*a.dx)*s+(R()-.5)*.4,gcol(),35+R()*30,GFIRE,1,1);}
   if(frame%2===0)spawn(a.h.x+a.dx*8,a.h.y+a.dy*8,a.dx*2,a.dy*2-.3,rgb(30,120,50),20,0,1,0,1);flash(a.h.x+a.dx*10,a.h.y+a.dy*10,14,[30,160,60],2);
   damageCone(a.h.x,a.h.y,a.dx,a.dy,60,.5,.8);}},
 {n:'Disintegrator',fn:(a,p,use)=>{if(!use(.7))return;beam(a);}},
 {n:'Gravity Well',fn:(a,p,use)=>{if(!use(35))return;vortex={x:mouse.wx,y:mouse.wy,life:340,max:340};cd=40;shake+=3;flash(mouse.wx,mouse.wy,40,[60,255,110],10);}},
 {n:'Mystic Shield',fn:(a,p,use)=>{if(!use(.45))return;shieldC=[[170,255,190],[80,220,120],[60,255,100]];shield();}},
 {n:'Gauntlet Swarm',fn:(a,p,use)=>{if(!use(22))return;for(let k=0;k<6;k++)shots.push({x:a.h.x,y:a.h.y,vx:p.face*(.5+R()*1.5),vy:-1.5-R()*2,type:'missile',life:220,tx:mouse.wx+(R()-.5)*30,ty:mouse.wy+(R()-.5)*20,delay:k*4,wob:R()*6,boom:13,fire:.35});cd=45;shake+=2;}},
 {n:'Doombots',fn:(a,p,use)=>{if(drones.length>=3||!use(28))return;drones.push({x:p.x,y:p.y-20,life:1500,cool:20,ph:R()*6});cd=30;rings.push({x:p.x,y:p.y-20,r:2,vr:1.5,life:10,c:[150,255,180]});}},
 {n:'Seismic Slam',fn:(a,p,use)=>{if(!use(22))return;if(p.fly)toggleFly(false);if(p.ground){p.vy=-4.5;p.ground=false;}p.slam=true;p.slamOpt={};cd=45;}},
 {n:'Doom Lightning',fn:(a,p,use)=>{if(!use(.9))return;lightning(a);}},
 {n:'Orbital Strike',fn:(a,p,use)=>{if(!use(40))return;strikes.push({x:mouse.wx|0,t:45,dig:0,beam:0});cd=60;}},
 {n:'Telekinesis',tk:{r:12,range:0,tether:true,throwMul:1.6}},
 {n:'Mystic Nova',fn:(a,p,use)=>{if(!use(30))return;nova();cd=50;}},
];
const HULK_POWERS=[
 {n:'Smash',fn:(a,p,use)=>{if(!use(4))return;p.punchF=10;const x=a.h.x+a.dx*7,y=a.h.y+a.dy*7;explode(x,y,p.rage>0?16:10,{self:true,col:[210,200,170],word:'SMASH!'});damageEnemies(x,y,16,35,a.dx*6,a.dy*6-2);
   for(const b of bodies){const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy)||1;if(d<b.rmax+16){b.vx+=a.dx*7;b.vy+=a.dy*7-2;b.va+=(R()-.5)*.08;b.thrown=true;}}
   p.vx-=a.dx*1.5;cd=14;shake=Math.min(22,shake+5);rings.push({x,y,r:3,vr:3,life:10,c:GAMMA});}},
 {n:'Thunderclap',fn:(a,p,use)=>{if(!use(25))return;thunderclap(a);cd=50;}},
 {n:'Gamma Leap',fn:(a,p,use)=>{if(!use(10))return;if(!p.ground&&!p.leap){p.slam=true;p.slamOpt={col:GAMMA,r:40};cd=20;return;}
   const s=Math.min(1,a.d/120);p.vx=a.dx*(4+4*s);p.vy=Math.min(-3.5,a.dy*(5+3*s)-2.5);p.ground=false;p.leap=true;cd=30;shake+=4;
   for(let k=0;k<24;k++)spawn(p.x+(R()-.5)*8,p.y,(R()-.5)*4,-R()*2,rgb(160,150,130),20,0,0,0,1);}},
 {n:'Rip & Throw',tk:{r:14,range:26,tether:false,throwMul:0,overhead:true}},
 {n:'Gamma Quake',fn:(a,p,use)=>{if(!use(28))return;if(p.ground){p.vy=-5;p.ground=false;}p.slam=true;p.slamOpt={col:GAMMA,r:46};cd=50;}},
];
const THOR_POWERS=[
 {n:'Hammer Throw',fn:(a,p,use)=>{if(shots.some(s=>s.type==='hammer')||!use(8))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'hammer',life:400,out:Math.min(55,a.d/7+8),hitSet:new Set(),spin:0});cd=10;shake+=1.5;flash(a.h.x,a.h.y,12,BLUE,4);}},
 {n:'Lightning Call',fn:(a,p,use)=>{if(!use(16))return;lightningStrike(mouse.wx,mouse.wy,13);cd=22;}},
 {n:'Lightning Arc',fn:(a,p,use)=>{if(!use(.8))return;lightning(a,{c:[230,240,255],g:[120,170,255],f:[170,210,255],spark:()=>pickC(BLUE)});}},
 {n:'Thunder Slam',fn:(a,p,use)=>{if(!use(24))return;if(p.fly)toggleFly(false);if(p.ground){p.vy=-4.5;p.ground=false;}p.slam=true;p.slamOpt={col:BLUE,r:40,bolts:true};cd=45;}},
 {n:'Storm Call',fn:(a,p,use)=>{if(storm||!use(50))return;storm={x:mouse.wx,life:480};cd=60;flash(mouse.wx,camY,140,BLUE,12);shake+=4;}},
];
const IRON_POWERS=[
 {n:'Repulsor',fn:(a,p,use)=>{if(!use(3))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*8,vy:a.dy*8,type:'repulsor',life:90,boom:6,fire:.05,col:CYAN,ecol:CYAN});cd=7;flash(a.h.x,a.h.y,10,CYAN,3);shake+=.8;}},
 {n:'Unibeam',fn:(a,p,use)=>{if(!use(1.1))return;const c={x:p.x+p.face,y:p.y-PH+8};const dx=mouse.wx-c.x,dy=mouse.wy-c.y,d=Math.hypot(dx,dy)||1;
   beamCore({h:c,dx:dx/d,dy:dy/d},{pow:110,rad:2,len:460,w:3+((frame>>1)&1),c:[235,250,255],g:[110,210,255],spark:()=>pickC(CYAN),dmg:5});p.vx-=dx/d*.15;p.vy-=dy/d*.15;}},
 {n:'Micro Missiles',fn:(a,p,use)=>{if(!use(25))return;for(let k=0;k<10;k++)shots.push({x:p.x,y:p.y-PH+4,vx:(R()-.5)*3,vy:-2-R()*2,type:'missile',life:220,tx:mouse.wx+(R()-.5)*50,ty:mouse.wy+(R()-.5)*30,delay:k*3,wob:R()*6,boom:8,fire:.3,small:true});cd=50;shake+=2;}},
 {n:'Laser Cutter',fn:(a,p,use)=>{if(!use(.5))return;beamCore(a,{pow:240,rad:0,len:520,w:0,c:[255,170,160],g:[255,50,40],spark:()=>rgb(255,120+R()*100,60),dmg:3,noAsh:true});}},
 {n:'Pulse Bomb',fn:(a,p,use)=>{if(!use(20))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*4.5,vy:a.dy*4.5-1.5,type:'bomb',life:240,boom:17,fire:.3,grav:.15,ecol:[255,200,120]});cd=40;}},
];

// ================= X-Men =================
// ACT: per-tick updaters for timed powers (return false when done)
const ACT=[];
const eyes=()=>({x:pl_.x+pl_.face*1.5,y:pl_.y-SH+3.5});
function aimFrom(o){const dx=mouse.wx-o.x,dy=mouse.wy-o.y,d=Math.hypot(dx,dy)||1;return{h:o,dx:dx/d,dy:dy/d,d};}
function iceAt(x,y){x|=0;y|=0;if(x<0||x>=W||y<0||y>=H)return;const i=y*W+x,m=t[i];if(m===0||KIND[m]===G||KIND[m]===F||m===WATER||m===ACID)setc(i,ICE);else if(m===LAVA)setc(i,OBSID);}
function freezeArea(cx,cy,r,dur,dmg){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(m===WATER||m===ACID)setc(i,ICE);else if(m===LAVA)setc(i,OBSID);else if(KIND[m]===F||m===STEAM)setc(i,EMPTY);}
  for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+e.def.w/2){e.frozen=Math.max(e.frozen||0,dur);hitEnemy(e,dmg,0,0);}
}
function slashFx(x,y,ang){ // three claw arcs
  for(let c=-1;c<=1;c++){const pts=[];for(let k=0;k<=6;k++){const a=ang-.9+k*.3,r=9+c*2.2;pts.push([x+Math.cos(a)*r-Math.cos(ang)*6,y+Math.sin(a)*r-Math.sin(ang)*6]);}beams.push({pts,life:3,c:[250,252,255],g:[200,210,230]});}
}
function clawSlash(a,p){
  const ang=Math.atan2(a.dy,a.dx),cx=a.h.x+a.dx*6,cy=a.h.y+a.dy*6;
  for(let c=-1;c<=1;c++)for(let k=0;k<=14;k++){const t2=ang-.9+k*.13,r=10+c*2.2,X=cx+Math.cos(t2)*r|0,Y=cy+Math.sin(t2)*r|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(m&&KIND[m]!==G&&KIND[m]!==F&&!(m===STEEL&&R()<.3)){if(R()<.5)spawn(X,Y,a.dx*2+(R()-.5)*2,-R()*2,col[i],60,KIND[m]===S?RUBBLE:m,0);setc(i,EMPTY);if(R()<.4)spawn(X,Y,(R()-.5)*3,(R()-.5)*3,rgb(255,240,200),8,0,1,0,1);}}
  slashFx(cx,cy,ang);damageCone(a.h.x,a.h.y,a.dx,a.dy,24,16,3);bgHit(cx,cy,8);snd('slash',cx,cy,{gap:.06});
  p.punchF=7;shake=Math.max(shake,2);
}
const WOLV_POWERS=[
 {n:'Claw Fury',fn:(a,p,use)=>{if(!use(3))return;if(!p.clawT||frame-p.clawT>30)fxWord(a.h.x,a.h.y-14,'SNIKT!',1.1,'#f3e9d2',true);else if(R()<.3)fxWord(a.h.x+a.dx*14,a.h.y-8,R()<.5?'SHKK!':'SKRITCH!',.75,'#f3e9d2');p.clawT=frame;clawSlash(a,p);cd=7;}},
 {n:'Berserker Rage',fn:(a,p,use)=>{if(p.rage>0||!use(30))return;p.rage=300;cd=30;fxWord(p.x,p.y-PH-10,'RRAAAGH!',1.5,'#e23b2e',true);fxBurst(p.x,p.y-PH/2,40,'#e23b2e');shake+=8;flash(p.x,p.y-PH/2,40,[255,60,40],10);}},
 {n:'Feral Pounce',fn:(a,p,use)=>{if(!p.ground||!use(12))return;const s=Math.min(1,a.d/110);p.vx=a.dx*(5+3*s);p.vy=Math.min(-2.5,a.dy*5-2.5);p.ground=false;p.pounce=true;cd=26;fxWord(p.x,p.y-PH-6,'SNIKT!',1,'#f3e9d2',true);
   ACT.push(()=>{if(p.ground||!p.pounce){p.pounce=false;return false;}const h=hand();carve(h.x,h.y,4.5,p.vx,p.vy);damageEnemies(h.x,h.y,9,6,p.vx*.6,p.vy*.6);if(frame%3===0){afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:10});slashFx(h.x,h.y,Math.atan2(p.vy,p.vx));}return true;});}},
 {n:'Adamantium Drill',fn:(a,p,use)=>{if(!use(.6))return;p.drillD=Math.min(44,(p.drillT===frame-1?p.drillD||0:0)+2.5);p.drillT=frame;
   for(let d=4;d<p.drillD;d+=3){const X=a.h.x+a.dx*d,Y=a.h.y+a.dy*d;carve(X,Y,4.2,a.dx*3,a.dy*3);}
   const X=a.h.x+a.dx*p.drillD,Y=a.h.y+a.dy*p.drillD;for(let k=0;k<6;k++)spawn(X,Y,(R()-.5)*5-a.dx*2,(R()-.5)*5-a.dy*2,R()<.6?rgb(255,230,150):rgb(230,236,245),10+R()*10,0,1,1);
   damageLine(a.h.x,a.h.y,X,Y,6,2.5);if(frame%18===0)fxWord(X,Y-8,'KRRRSSH!',.8,'#f3e9d2',true);shake=Math.max(shake,2.5);}},
 {n:'Healing Factor',fn:(a,p,use)=>{if(p.hp>=CH.hp||!use(.5))return;p.hp=Math.min(CH.hp,p.hp+1.6);if(frame%3===0)spawn(p.x+(R()-.5)*8,p.y-R()*PH,0,-.7,R()<.5?rgb(255,220,120):rgb(255,255,220),20,0,1,0);if(frame%40===0)fxWord(p.x,p.y-PH-8,'HNNGH!',.8,'#ffc93c',true);}},
];
const CYC_POWERS=[
 {n:'Optic Blast',fn:(a,p,use)=>{if(!use(.9))return;const b=aimFrom(eyes());beamCore(b,{pow:90,rad:1,len:480,w:2+((frame>>1)&1),c:[255,210,200],g:[255,40,30],spark:()=>rgb(255,60+R()*120,40),dmg:4,noAsh:true});damageCone(b.h.x,b.h.y,b.dx,b.dy,200,0,.6);}},
 {n:'Concussive Burst',fn:(a,p,use)=>{if(!use(18))return;const b=aimFrom(eyes());beamCore(b,{pow:420,rad:4,len:100,w:5,c:[255,220,210],g:[255,50,40],spark:()=>rgb(255,90,60),dmg:30,noAsh:true});
   damageCone(b.h.x,b.h.y,b.dx,b.dy,110,10,9);for(const bd of bodies){const dx=bd.x-b.h.x,dy=bd.y-b.h.y,d=Math.hypot(dx,dy)||1;if(d<110+bd.rmax&&(dx*b.dx+dy*b.dy)/d>.6){bd.vx+=b.dx*7;bd.vy+=b.dy*7-1.5;bd.thrown=true;}}
   p.vx-=b.dx*2;fxWord(b.h.x+b.dx*40,b.h.y+b.dy*40-8,'BRAKOOM!',1.3,'#ff6b5c',true);fxBurst(b.h.x+b.dx*20,b.h.y+b.dy*20,30,'#ff6b5c');shake+=8;cd=26;}},
 {n:'Ricochet Shot',fn:(a,p,use)=>{if(!use(14))return;const o=eyes();let x=o.x,y=o.y,b=aimFrom(o),dx=b.dx,dy=b.dy,bounce=0;const pts=[[x,y]];
   for(let s2=0;s2<700&&bounce<5;s2++){const nx=x+dx,ny=y+dy,X=nx|0,Y=ny|0;if(X<1||X>=W-1||Y<1||Y>=H-1)break;const e=enemyAt(nx,ny,1);if(e)hitEnemy(e,20,dx*3,dy*3);
     const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L){pts.push([x,y]);explode(X,Y,3,{col:[255,60,40],quiet:true,self:true});
       const hx=t[(y|0)*W+X],hy=t[Y*W+(x|0)];if(hx&&KIND[hx]!==G&&KIND[hx]!==F)dx=-dx;if(hy&&KIND[hy]!==G&&KIND[hy]!==F)dy=-dy;if(!(hx&&KIND[hx]!==G)&&!(hy&&KIND[hy]!==G)){dx=-dx;dy=-dy;}bounce++;continue;}
     x=nx;y=ny;}
   pts.push([x,y]);beams.push({pts,life:6,c:[255,220,210],g:[255,40,30]});for(const pt of pts)flash(pt[0],pt[1],12,[255,60,40],4);fxWord(o.x+b.dx*30,o.y-12,'PTANG!',1,'#ff6b5c',true);cd=22;}},
 {n:'Full Power',fn:(a,p,use)=>{if(!use(.6))return;p.optic=Math.min(90,(p.opticT===frame-1?p.optic||0:0)+1.5);p.opticT=frame;const o=eyes();
   for(let k=0;k<3;k++){const an=R()*6.283,r=14+R()*10;spawn(o.x+Math.cos(an)*r,o.y+Math.sin(an)*r,-Math.cos(an)*1.6,-Math.sin(an)*1.6,rgb(255,70,50),9,0,1,0,1);}
   flash(o.x,o.y,6+p.optic*.15,[255,40,30],2);
   if(p.optic>=90){p.optic=0;cd=60;p.en=Math.max(0,p.en-25);let tf=26;fxWord(o.x,o.y-20,'FULL POWER!',1.4,'#ff6b5c',true);hitstop=Math.max(hitstop,3);fxImpact(o.x,o.y,4);
     ACT.push(()=>{const b=aimFrom(eyes());beamCore(b,{pow:1800,rad:4,len:700,w:6+((frame>>1)&1),c:[255,235,225],g:[255,30,20],spark:()=>rgb(255,60+R()*150,40),dmg:12,noAsh:true});pl_.vx-=b.dx*.25;shake=Math.max(shake,9);return--tf>0;});}}},
 {n:'Optic Sweep',fn:(a,p,use)=>{if(!use(26))return;const o=eyes(),base=Math.atan2(mouse.wy-o.y,mouse.wx-o.x);let k=0;fxWord(o.x,o.y-16,'ZWAAAARM!',1.1,'#ff6b5c',true);cd=40;
   ACT.push(()=>{const an=base-1.1+k/28*2.2,e=eyes();beamCore({h:e,dx:Math.cos(an),dy:Math.sin(an)},{pow:120,rad:1,len:360,w:2,c:[255,210,200],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:6,noAsh:true});return++k<28;});}},
];
const ICE_POWERS=[
 {n:'Ice Beam',fn:(a,p,use)=>{if(!use(.6))return;let x=a.h.x,y=a.h.y;
   for(let s2=0;s2<300;s2++){x+=a.dx;y+=a.dy;const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;const i=Y*W+X,m=t[i];
     if(m===WATER||m===ACID){setc(i,ICE);continue;}if(m===LAVA){setc(i,OBSID);break;}if(KIND[m]===F){setc(i,EMPTY);continue;}
     const e=enemyAt(x,y,1);if(e){e.frozen=Math.max(e.frozen||0,60);hitEnemy(e,1.5,0,0);break;}
     if(m&&KIND[m]!==G){for(let k=0;k<3;k++)iceAt(X-a.dx*(1+R()*3)+(R()-.5)*3,Y-a.dy*(1+R()*3)+(R()-.5)*3);break;}}
   beams.push({x0:a.h.x,y0:a.h.y,x1:x,y1:y,life:1,w:1,c:[235,250,255],g:[120,200,255]});
   for(let k=0;k<3;k++){const f=R();spawn(a.h.x+(x-a.h.x)*f,a.h.y+(y-a.h.y)*f,(R()-.5)*.6,(R()-.5)*.6,R()<.5?rgb(230,250,255):rgb(150,210,250),14,0,1,0,1);}
   flash(x,y,10,[150,210,255],2);if(frame%26===0)fxWord(x,y-8,'FSSSHH!',.8,'#bfe3ff',true);}},
 {n:'Ice Wall',fn:(a,p,use)=>{if(!use(20))return;let X=mouse.wx|0,Y=mouse.wy|0;while(Y<H-1&&(t[Y*W+X]===0||KIND[t[Y*W+X]]===G||KIND[t[Y*W+X]]===F))Y++;let h=0;cd=30;
   fxWord(X,Y-30,'KRRSSHH!',1.2,'#bfe3ff',true);shake+=4;
   ACT.push(()=>{for(let k=0;k<3&&h<44;k++,h++){const yy=Y-h;for(let xx=-4;xx<=4;xx++){if(Math.abs(xx)===4&&h>36)continue;iceAt(X+xx,yy);}
     for(let k2=0;k2<3;k2++)spawn(X+(R()-.5)*10,yy,(R()-.5)*2,-R()*2,rgb(220,245,255),14,0,1,1);}damageEnemies(X,Y-h,8,3,0,-3);return h<44;});}},
 {n:'Ice Shards',fn:(a,p,use)=>{if(!use(10))return;cd=16;const an=Math.atan2(a.dy,a.dx);fxWord(a.h.x+a.dx*20,a.h.y-8,'TSING!',.9,'#bfe3ff',true);
   for(let k=0;k<7;k++){const t2=an+(R()-.5)*.45,sp=6+R()*2;shots.push({x:a.h.x,y:a.h.y,vx:Math.cos(t2)*sp,vy:Math.sin(t2)*sp,type:'shard',life:90,col:[200,240,255],grav:.05,
     onHit:sh=>{for(let q2=0;q2<4;q2++)iceAt(sh.x-sh.vx*.3+(R()-.5)*3,sh.y-sh.vy*.3+(R()-.5)*3);damageEnemies(sh.x,sh.y,5,12,sh.vx*.3,sh.vy*.3);for(const e of enemies)if(Math.hypot(e.x-sh.x,e.y-sh.y)<6)e.frozen=Math.max(e.frozen||0,40);
       for(let q2=0;q2<6;q2++)spawn(sh.x,sh.y,(R()-.5)*3,-R()*2,rgb(220,245,255),16,0,1,1);}});}}},
 {n:'Frost Nova',fn:(a,p,use)=>{if(!use(30))return;cd=50;const cx=p.x,cy=p.y-PH/2,r=52;freezeArea(cx,cy,r,160,18);fxWord(cx,cy-30,'KRA-SHHH!',1.4,'#bfe3ff',true);fxBurst(cx,cy,70,'#bfe3ff');fxImpact(cx,cy,3);
   for(let k=0;k<40;k++){const an=R()*6.283;let x=cx,y=cy;for(let d=0;d<r;d++){x+=Math.cos(an);y+=Math.sin(an);const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;const m=t[Y*W+X];if(m&&KIND[m]===S){for(let s2=0;s2<5;s2++)iceAt(x-Math.cos(an)*s2,y-Math.sin(an)*s2);break;}}}
   for(let k=0;k<140;k++){const an=R()*6.283,s2=2+R()*4;spawn(cx,cy,Math.cos(an)*s2,Math.sin(an)*s2,R()<.5?rgb(230,250,255):rgb(140,200,250),20+R()*20,0,1,0,1);}
   rings.push({x:cx,y:cy,r:4,vr:4,life:14,c:[200,240,255]});flash(cx,cy,90,[150,210,255],10);shake+=10;}},
 {n:'Glacier Spikes',fn:(a,p,use)=>{if(!use(24))return;cd=40;const dir=a.dx<0?-1:1;let k=0,x=p.x+dir*8;fxWord(p.x+dir*30,p.y-PH-6,'SHRAKK!',1.2,'#bfe3ff',true);shake+=4;
   ACT.push(()=>{if(k%2===0){let y=Math.max(0,p.y-30|0);while(y<H-1&&y<p.y+60&&(t[y*W+(x|0)]===0||KIND[t[y*W+(x|0)]]!==S))y++;
       if(y<p.y+60){const h=10+R()*7|0;for(let yy=0;yy<h;yy++){const w=Math.round((1-yy/h)*3);for(let xx=-w;xx<=w;xx++)iceAt(x+xx,y-1-yy);}
         damageEnemies(x,y-h/2,9,22,dir*2,-5);for(const e of enemies)if(Math.abs(e.x-x)<9&&Math.abs(e.y-(y-h/2))<14)e.frozen=Math.max(e.frozen||0,50);
         for(let q2=0;q2<8;q2++)spawn(x+(R()-.5)*6,y-R()*h,(R()-.5)*3,-R()*3,rgb(225,245,255),16,0,1,1);flash(x,y-h/2,14,[150,210,255],3);}
       x+=dir*9;}return++k<20;});}},
];
const slide=[];
// Iceman's slide: he fires frost down at his feet, freezing a ramp along his path that crumbles away soon after
function iceSlideStep(p){
  const sp=Math.hypot(p.vx,p.vy),bx=sp>.6?p.x-p.vx*2.2:p.x,by=sp>.6?p.y+1-p.vy*2.2:p.y+1; // behind him when moving, so it never blocks the way ahead
  const lx=p.slideX??bx,ly=p.slideY??by,n=Math.max(1,Math.ceil(Math.hypot(bx-lx,by-ly)));
  for(let k=0;k<=n;k++){const X=lx+(bx-lx)*k/n|0,Y=ly+(by-ly)*k/n|0;
    for(let xx=-3;xx<=3;xx++)for(let yy=0;yy<2;yy++){const x=X+xx,y=Y+yy;if(x<0||x>=W||y<0||y>=H)continue;const i=y*W+x;if(t[i]!==0&&KIND[t[i]]!==G&&KIND[t[i]]!==F)continue;
      setc(i,ICE);const v=(R()*24)|0;col[i]=yy?rgb(150+v,205+v/2,240):rgb(205+v,238,255);pin[i]=3;slide.push([i,frame+70+(R()*40|0)+Math.abs(xx)*4]);}}
  p.slideX=bx;p.slideY=by;
  // the frost stream from his hands down to the ice
  const hx=p.x+p.face*3,hy=p.y-SH*.42;
  beams.push({pts:[[hx,hy],[(hx+bx)/2+(R()-.5)*3,(hy+by)/2],[bx,by]],life:1,c:[235,250,255],g:[120,200,255]});
  for(let k=0;k<3;k++)spawn(bx+(R()-.5)*8,by,(R()-.5)*1.5-p.vx*.2,-R()*.8,R()<.5?rgb(230,250,255):rgb(150,210,250),12+R()*10,0,1,0,1);
  if(frame%4===0)flash(bx,by,8,[150,210,255],2);
}
function updSlide(){
  if(!pl_.fly||CH.id!=='iceman'){pl_.slideX=pl_.slideY=undefined;}
  let k2=0;
  for(let k=0;k<slide.length;k++){const e=slide[k];if(e[1]>frame){slide[k2++]=e;continue;}
    const i=e[0];if(t[i]===ICE&&pin[i]===3){pin[i]=0;const x=i%W,y=(i/W)|0;
      if(np<MP-300&&R()<.6)spawn(x,y,(R()-.5)*.8,R()*.5,R()<.5?rgb(225,245,255):rgb(160,215,250),30+R()*30,R()<.25?WATER:0,1,1);
      setc(i,EMPTY);}}
  slide.length=k2;
}
const JEAN_POWERS=[
 {n:'Telekinesis',tk:{r:12,range:0,tether:true,throwMul:1.7}},
 {n:'Psi Bolts',fn:(a,p,use)=>{if(!use(9))return;cd=14;fxWord(a.h.x,a.h.y-12,'VREEE!',.8,'#ff9ad8',true);for(let k=0;k<3;k++)shots.push({x:a.h.x,y:a.h.y,vx:a.dx*4+(R()-.5)*3,vy:a.dy*4+(R()-.5)*3,type:'psi',life:160,col:[255,120,210],ecol:[255,120,210],boom:6,home:true,delay:k*3});}},
 {n:'Psychic Wave',fn:(a,p,use)=>{if(!use(22))return;cd=34;const cx=a.h.x,cy=a.h.y,R0=95,ang=Math.atan2(a.dy,a.dx);fxWord(cx+a.dx*30,cy-10,'VWAMM!',1.3,'#ff9ad8',true);fxBurst(cx+a.dx*20,cy+a.dy*20,40,'#ff9ad8');
   for(let n=0;n<5000;n++){const d=Math.sqrt(R())*R0,t2=ang+(R()-.5)*1.2,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;const f=1-d/R0;
     if(KIND[m]===P||KIND[m]===L){if(R()<f+.3){spawn(X,Y,Math.cos(t2)*7*f,Math.sin(t2)*7*f-1,col[i],80,m,0);t[i]=0;wake(i);}}
     else if(KIND[m]===S&&m!==STEEL&&R()<f*.25/(1+HARD[m]*.3)){spawn(X,Y,Math.cos(t2)*6*f,Math.sin(t2)*6*f-1,col[i],80,RUBBLE,0);t[i]=0;markDirty(i);wake(i);}
     else if(KIND[m]===G||KIND[m]===F){t[i]=0;wake(i);}}
   damageCone(cx,cy,a.dx,a.dy,R0,25,9);for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*9;b.vy+=a.dy*9-2;b.thrown=true;}}
   for(let n=0;n<np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<R0&&(dx*a.dx+dy*a.dy)/(d||1)>.5){pvx[n]+=a.dx*4;pvy[n]+=a.dy*4;}}
   for(let k=0;k<3;k++)rings.push({x:cx+a.dx*k*14,y:cy+a.dy*k*14,r:4+k*4,vr:3,life:12,c:[255,140,220]});flash(cx,cy,60,[255,110,200],8);shake+=8;}},
 {n:'Mind Crush',fn:(a,p,use)=>{if(!use(.7))return;const cx=mouse.wx,cy=mouse.wy,r=34;
   for(const e of enemies){const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy);if(d<r+e.def.w){e.vx+=dx/(d||1)*.6;e.vy+=dy/(d||1)*.6-.2;hitEnemy(e,1.4,0,0);}}
   for(let n=0;n<500;n++){const an=R()*6.283,d=Math.sqrt(R())*r,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(!m)continue;
     if(KIND[m]===S&&d<12&&m!==STEEL&&R()<.05){t[i]=RUBBLE;markDirty(i);wake(i);}else if(KIND[m]===P&&R()<.3){spawn(X,Y,(cx-X)*.06,(cy-Y)*.06,col[i],40,m,0,0,1);t[i]=0;wake(i);}}
   for(let k=0;k<4;k++){const an=R()*6.283,rr=r*(.6+R()*.4);spawn(cx+Math.cos(an)*rr,cy+Math.sin(an)*rr,-Math.cos(an)*1.5,-Math.sin(an)*1.5,rgb(255,120,210),14,0,1,0,1);}
   if(frame%2===0)rings.push({x:cx,y:cy,r:r*.9,vr:-2,life:6,c:[255,110,200]});if(frame%30===0)fxWord(cx,cy-r,'GRRKK!',.9,'#ff9ad8',true);const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+cx)/2+(R()-.5)*10,(h.y+cy)/2+(R()-.5)*10],[cx,cy]],life:1,c:[255,170,230],g:[255,80,190]});}},
 {n:'Phoenix Force',fn:(a,p,use)=>{if(!use(60))return;cd=120;const cx=p.x,cy=p.y-PH/2;let k=0;fxWord(cx,cy-40,'SKREEEEE!',1.7,'#ffb340',true);hitstop=Math.max(hitstop,4);fxImpact(cx,cy,5);
   ACT.push(()=>{const sc=k*2.2;for(let n=0;n<26;n++){const u=R()*2-1,wing=Math.sign(u)||1,wx=u*sc*1.6,wy=-Math.abs(Math.sin(Math.abs(u)*3.1))*sc*.55+Math.abs(u)*sc*.2;spawn(cx+wx,cy+wy,wx*.02+(R()-.5),wy*.02-.6,R()<.5?rgb(255,180,60):rgb(255,90,30),22+R()*10,R()<.04?FIRE:0,1,0,1);}
     for(let n=0;n<10;n++)spawn(cx+(R()-.5)*6,cy-sc*.5-R()*sc*.3,(R()-.5),-1.2,rgb(255,230,150),18,0,1,0,1);
     if(k===16){for(let s2=0;s2<3;s2++)explode(cx+(R()-.5)*60,cy+(R()-.5)*30,14,{fire:.6,col:[255,150,50],word:s2?undefined:'PHWOOOM!'});damageEnemies(cx,cy,110,90,0,-4,true);
       for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<140){b.vx+=dx/d*8;b.vy+=dy/d*8-3;}}flash(cx,cy,160,[255,150,50],14);shake=22;}
     flash(cx,cy,30+k*4,[255,120,40],2);return++k<26;});}},
];
const STORM_POWERS=[
 {n:'Lightning Lash',fn:(a,p,use)=>{if(!use(.8))return;lightning(a,{c:[245,248,255],g:[160,190,255],f:[205,220,255],spark:()=>pickC([200,220,255])});}},
 {n:'Thunderbolt',fn:(a,p,use)=>{if(!use(24))return;cd=36;const x=mouse.wx,y=mouse.wy;let k=0;ACT.push(()=>{if(k%7===0)lightningStrike(x+(R()-.5)*(k?50:0),y,k?9:15);return++k<21;});}},
 {n:'Tornado',fn:(a,p,use)=>{if(!use(40))return;cd=60;let tx=mouse.wx,life=380;fxWord(tx,mouse.wy-50,'WHOOOOSH!',1.4,'#d8e4ff',true);
   ACT.push(()=>{tx+=Math.sign(mouse.wx-tx)*Math.min(.9,Math.abs(mouse.wx-tx)*.02);let gy=Math.max(0,camY|0);while(gy<H-1&&(t[gy*W+(tx|0)]===0||KIND[t[gy*W+(tx|0)]]===G||KIND[t[gy*W+(tx|0)]]===F))gy++;
     const top=gy-90;
     for(let n=0;n<14;n++){const h=R(),y=gy-h*90,w=5+h*22,an=frame*.3+R()*6.283;spawn(tx+Math.cos(an)*w,y,-Math.sin(an)*2.5,-1.2-R(),R()<.6?rgb(200,205,215):rgb(150,155,170),14,0,0,0,1);}
     for(let n=0;n<240;n++){const h=R(),y=(gy-h*90)|0,w=5+h*22,x=(tx+(R()*2-1)*w)|0;if(x<1||x>=W-1||y<1||y>=H-1)continue;const i=y*W+x,m=t[i];if(!m)continue;
       if(KIND[m]===P||KIND[m]===L){const an=R()*6.283;spawn(x,y,(tx-x)*.08+Math.cos(an)*2,-2-R()*2,col[i],60,m,0);t[i]=0;wake(i);}
       else if(KIND[m]===S&&m!==STEEL&&R()<.04/(1+HARD[m])){spawn(x,y,(R()-.5)*3,-2-R()*2,col[i],70,RUBBLE,0);t[i]=0;markDirty(i);wake(i);}}
     for(let n=0;n<np;n++){const dx=tx-px[n],dy=py[n]-gy;if(dy<4&&dy>-110&&Math.abs(dx)<34){pvx[n]+=dx*.012-dy*.004*Math.sign(dx);pvy[n]-=.32;}}
     for(const b of bodies){if(b.held)continue;const dx=tx-b.x;if(Math.abs(dx)<40&&b.y>top-20&&b.y<gy+10){b.vx+=dx*.01;b.vy-=.55;b.va+=.01;}}
     for(const e of enemies){const dx=tx-e.x;if(Math.abs(dx)<34&&e.y>top-20&&e.y<gy+10){e.vx+=dx*.04+(R()-.5);e.vy-=.6;hitEnemy(e,.5,0,0);}}
     shake=Math.max(shake,1.5);return--life>0;});}},
 {n:'Gale Force',fn:(a,p,use)=>{if(!use(.6))return;const cx=a.h.x,cy=a.h.y,R0=130;
   for(let n=0;n<np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<R0&&(dx*a.dx+dy*a.dy)/(d||1)>.6){pvx[n]+=a.dx*.7;pvy[n]+=a.dy*.7;}}
   for(let n=0;n<220;n++){const d=R()*R0,t2=Math.atan2(a.dy,a.dx)+(R()-.5)*.8,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if((KIND[m]===P||KIND[m]===L||KIND[m]===G||KIND[m]===F)&&R()<.5){spawn(X,Y,a.dx*5,a.dy*5-.5,col[i],50,KIND[m]===P||KIND[m]===L?m:0,0,KIND[m]===P||KIND[m]===L?1:0);t[i]=0;wake(i);}}
   for(const b of bodies){if(b.held)continue;const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*.35;b.vy+=a.dy*.35-.2;}}
   for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0&&(dx*a.dx+dy*a.dy)/d>.6){e.vx+=a.dx*.9;e.vy+=a.dy*.9;hitEnemy(e,.3,0,0);}}
   for(let k=0;k<5;k++){const an=Math.atan2(a.dy,a.dx)+(R()-.5)*.6;spawn(cx,cy,Math.cos(an)*(6+R()*3),Math.sin(an)*(6+R()*3),rgb(225,232,245),12,0,0,0);}
   if(frame%24===0)fxWord(cx+a.dx*40,cy-10,'FWOOOSH!',.9,'#d8e4ff',true);}},
 {n:'Hailstorm',fn:(a,p,use)=>{if(!use(40))return;cd=70;const cx=mouse.wx;let k=0;fxWord(cx,camY+30,'KRAK-KRAK-KRAK!',1.2,'#d8e4ff',true);
   ACT.push(()=>{for(let n=0;n<3;n++)shots.push({x:cx+(R()-.5)*130,y:camY-6,vx:(R()-.5)*.6,vy:4+R()*2,type:'hail',life:200,col:[220,240,255],grav:.08,
       onHit:sh=>{iceAt(sh.x,sh.y-1);if(R()<.5)iceAt(sh.x+(R()<.5?-1:1),sh.y-1);const X=sh.x|0,Y=sh.y|0;if(X>=0&&X<W&&Y>=0&&Y<H&&KIND[t[Y*W+X]]===S&&t[Y*W+X]!==ICE&&R()<.5){spawn(X,Y,(R()-.5)*2,-1.5,col[Y*W+X],50,RUBBLE,0);setc(Y*W+X,EMPTY);}
         damageEnemies(sh.x,sh.y,4,7,0,1);for(const e of enemies)if(Math.hypot(e.x-sh.x,e.y-sh.y)<5)e.frozen=Math.max(e.frozen||0,20);}});
     for(let n=0;n<6;n++)spawn(cx+(R()-.5)*200,camY+R()*8,(R()-.5)*.4,.1,R()<.5?rgb(70,74,90):rgb(50,52,64),30,0,0,0,1);
     return++k<200;});}},
];

// ================= extra powers =================
function zap(x0,y0,x1,y1,c,g){const pts=[[x0,y0]],n=Math.max(2,Math.hypot(x1-x0,y1-y0)/7|0);for(let k=1;k<n;k++){const f=k/n;pts.push([x0+(x1-x0)*f+(R()-.5)*7,y0+(y1-y0)*f+(R()-.5)*7]);}pts.push([x1,y1]);beams.push({pts,life:2,c,g});}
function shieldAs(cols,reflect){shieldC=cols;shield();
  if(reflect)for(const s2 of shots)if(s2.owner==='enemy'&&Math.hypot(s2.x-pl_.x,s2.y-pl_.y+8)<26){s2.owner='player';s2.vx*=-1.3;s2.vy*=-1.3;s2.col=cols[0];s2.ecol=cols[0];flash(s2.x,s2.y,8,cols[2],3);}}
// Cyclops: hold F to aim the optic blast at the ground and ride it up. Barely scorches what it hits.
function opticThrust(p,on,ax){
  if(!on||p.en<=.8)return;p.en-=.8;p.thrustF=4; // net drain about 0.3/frame against regen: roughly 5 s of lift
  let dx=-ax*.35,dy=1;const d=Math.hypot(dx,dy);dx/=d;dy/=d;
  p.vy=Math.max(-3.2,p.vy-.78);p.vx-=dx*.18;p.ground=false;
  const o=eyes();let x=o.x,y=o.y,hit=false;
  for(let k=0;k<140;k++){x+=dx;y+=dy;const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){hit=true;
    if(R()<.08&&KIND[m]!==L&&m!==STEEL&&m!==OBSID){spawn(X,Y,(R()-.5)*2,-R()*2,col[Y*W+X],50,KIND[m]===S?RUBBLE:m,0);setc(Y*W+X,EMPTY);} break;}}
  beams.push({x0:o.x,y0:o.y,x1:x,y1:y,life:1,w:1+((frame>>1)&1),c:[255,215,205],g:[255,40,30]});
  if(hit){for(let k=0;k<4;k++)spawn(x,y-1,(R()-.5)*3,-R()*2.5,R()<.5?rgb(255,120,80):rgb(255,220,160),10+R()*8,0,1,1);flash(x,y,16,[255,60,40],2);if(frame%5===0)for(let k=0;k<3;k++)dust(x+(R()-.5)*8|0,y-2);}
  damageLine(o.x,o.y,x,y,3,1.5);shake=Math.max(shake,1.2);if(frame%30===0)fxWord(x,y-6,'FWOOM',.7,'#ff6b5c',true);
}
HULK_POWERS.push(
 {n:'Gamma Roar',fn:(a,p,use)=>{if(!use(20))return;cd=45;const cx=a.h.x,cy=a.h.y-6,R0=120,ang=Math.atan2(a.dy,a.dx);fxWord(cx+a.dx*30,cy-16,'RRRAAAARGH!',1.6,'#bff07a',true);fxImpact(cx,cy,3);hitstop=Math.max(hitstop,3);
   for(let n=0;n<5000;n++){const d=Math.sqrt(R())*R0,t2=ang+(R()-.5)*1.3,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if(m===GLASS){spawn(X,Y,Math.cos(t2)*4,Math.sin(t2)*4-1,col[i],60,0,1);setc(i,EMPTY);}else if((KIND[m]===P||KIND[m]===L)&&R()<.5){spawn(X,Y,Math.cos(t2)*4,Math.sin(t2)*4-1,col[i],60,m,0);t[i]=0;wake(i);}else if(KIND[m]===G||KIND[m]===F){t[i]=0;wake(i);}}
   for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0&&(dx*a.dx+dy*a.dy)/d>.5){e.frozen=Math.max(e.frozen||0,90);hitEnemy(e,8,a.dx*5,a.dy*5-2);}}
   for(let k=0;k<4;k++)rings.push({x:cx+a.dx*k*16,y:cy+a.dy*k*16,r:5+k*5,vr:3.5,life:12,c:GAMMA});shake=22;}},
 {n:'Boulder Toss',fn:(a,p,use)=>{if(!use(14))return;cd=30;const X0=p.x+p.face*6|0,Y0=p.y+4|0,r=7;let n=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r*(.7+R()*.3))continue;const X=X0+x,Y=Y0+y;if(X<0||X>=W||Y<0||Y>=H-40)continue;const i=Y*W+X,m=t[i];if(m&&(KIND[m]===S||KIND[m]===P)){q[n++]=i;markDirty(i);}}
   if(n<12)return;const b=makeBody(q,n,false);if(!b)return;b.x=p.x;b.y=p.y-SH-b.rmax;smashOverlap(b);
   const dx=mouse.wx-b.x,dy=mouse.wy-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*10;b.vy=dy/d*10-2.5;b.va=p.face*.08;b.thrown=true;b.safeP=frame+40;p.throwF=10;
   fxWord(b.x,b.y-10,'HUP!',1,'#bff07a',true);for(let k=0;k<30;k++)spawn(X0+(R()-.5)*12,Y0,(R()-.5)*3,-R()*3,rgb(150,140,125),25,0,0,1);shake+=5;}},
 {n:'Worldbreaker',fn:(a,p,use)=>{if(p.rage>0||!use(45))return;p.rage=420;cd=40;fxWord(p.x,p.y-PH-14,'HULK SMASH!!',1.7,'#bff07a',true);fxBurst(p.x,p.y-PH/2,60,'#bff07a');quake(p.x,p.y,{col:GAMMA,r:30});}},
);
THOR_POWERS.push(
 {n:'Bifrost',fn:(a,p,use)=>{if(!use(35))return;cd=60;let x=mouse.wx|0,y=mouse.wy|0;for(let k=0;k<60&&boxHit(x,y);k++)y--;if(boxHit(x,y))return;
   const RB=[[255,70,70],[255,170,60],[255,240,80],[90,240,110],[80,170,255],[170,100,255]];
   for(const [ox,c] of RB.map((c,k)=>[k-2.5,c])){beams.push({x0:p.x+ox,y0:p.y-PH/2,x1:p.x+ox,y1:camY-10,life:10,w:1,c,g:c});beams.push({x0:x+ox,y0:camY-10,x1:x+ox,y1:y,life:12,w:1,c,g:c});}
   p.x=x;p.y=y;p.vx=p.vy=0;explode(x,y,9,{col:[200,220,255],word:'VWOOOM!',self:true});damageEnemies(x,y,30,30,0,-4,true);flash(x,y-10,80,[220,230,255],10);rings.push({x,y:y-8,r:4,vr:4,life:14,c:[255,240,200]});}},
 {n:'Mjolnir Spin',fn:(a,p,use)=>{if(!use(.6))return;p.spin=6;
   damageEnemies(p.x,p.y-PH/2,16,2.5,0,0,true);for(let n=shots.length-1;n>=0;n--){const s2=shots[n];if(s2.owner==='enemy'&&Math.hypot(s2.x-p.x,s2.y-p.y+PH/2)<18){spawn(s2.x,s2.y,0,0,rgb(200,220,255),8,0,1,0);shots.splice(n,1);}}
   for(let n=0;n<np;n++){const dx=px[n]-p.x,dy=py[n]-p.y+PH/2,d=Math.hypot(dx,dy);if(d<30&&d>1){pvx[n]+=-dy/d*.6;pvy[n]+=dx/d*.6;}}
   if(p.fly){p.vx+=(mouse.wx>p.x?1:-1)*.12;}if(frame%20===0)fxWord(p.x,p.y-PH-6,'WHUM WHUM',.7,'#bfe3ff',true);}},
 {n:'God Blast',fn:(a,p,use)=>{if(!use(.6))return;p.god=Math.min(70,(p.godT===frame-1?p.god||0:0)+1.4);p.godT=frame;const h=hand();
   for(let k=0;k<3;k++){const an=R()*6.283,r=16+R()*10;spawn(h.x+Math.cos(an)*r,h.y+Math.sin(an)*r,-Math.cos(an)*1.8,-Math.sin(an)*1.8,pickC(BLUE),9,0,1,0,1);}if(frame%4===0)zap(h.x,h.y,h.x+(R()-.5)*30,h.y-20-R()*20,[230,240,255],[120,170,255]);
   if(p.god>=70){p.god=0;cd=70;p.en=Math.max(0,p.en-30);let tf=30;fxWord(h.x,h.y-24,'ODINFORCE!',1.5,'#bfe3ff',true);hitstop=Math.max(hitstop,4);fxImpact(h.x,h.y,4);
     ACT.push(()=>{const b=aimFrom(hand());beamCore(b,{pow:1600,rad:4,len:650,w:6+((frame>>1)&1),c:[240,248,255],g:[110,160,255],spark:()=>pickC(BLUE),dmg:12,noAsh:true});if(frame%3===0)zap(b.h.x,b.h.y,b.h.x+b.dx*120+(R()-.5)*40,b.h.y+b.dy*120+(R()-.5)*40,[230,240,255],[120,170,255]);shake=Math.max(shake,10);return--tf>0;});}}},
);
IRON_POWERS.push(
 {n:'Proton Cannon',fn:(a,p,use)=>{if(!use(30))return;cd=60;const o={x:p.x-p.face*2,y:p.y-PH+3};const b=aimFrom(o);shots.push({x:o.x,y:o.y,vx:b.dx*4.5,vy:b.dy*4.5,type:'proton',life:240,boom:22,fire:.35,col:[160,240,255],ecol:[160,240,255]});
   p.vx-=b.dx*2.5;p.vy-=b.dy*1.5;flash(o.x,o.y,30,[160,240,255],6);fxWord(o.x,o.y-12,'KA-CHUNK!',1.1,'#bfe3ff',true);shake+=6;}},
 {n:'Flares',fn:(a,p,use)=>{if(!use(18))return;cd=40;fxWord(p.x,p.y-PH-6,'FFT-FFT-FFT!',.9,'#ffc93c',true);
   for(let k=0;k<14;k++){const an=-Math.PI/2+(R()-.5)*2.6;shots.push({x:p.x,y:p.y-PH/2,vx:Math.cos(an)*(3+R()*3),vy:Math.sin(an)*(3+R()*3),type:'flare',life:70+R()*40|0,grav:.08,col:[255,170,70],boom:3,fire:.6,ecol:[255,170,70]});}
   for(let n=shots.length-1;n>=0;n--){const s2=shots[n];if(s2.owner==='enemy'&&Math.hypot(s2.x-p.x,s2.y-p.y)<90){flash(s2.x,s2.y,8,[255,170,70],3);shots.splice(n,1);}}
   for(const e of enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<110)e.frozen=Math.max(e.frozen||0,45);}},
 {n:'Energy Shield',fn:(a,p,use)=>{if(!use(.5))return;shieldAs([[200,245,255],[80,190,255],[60,170,255]],true);}},
);
WOLV_POWERS.push(
 {n:'Rising Slash',fn:(a,p,use)=>{if(!use(12))return;cd=30;p.vy=-6.2;p.ground=false;p.pounce=true;fxWord(p.x,p.y-PH-8,'SHKRAKK!',1.1,'#f3e9d2',true);let k=0;
   ACT.push(()=>{const h={x:p.x+p.face*3,y:p.y-PH*.6};clawSlash({h,dx:p.face*.3,dy:-1},p);for(const e of enemies)if(Math.abs(e.x-p.x)<14&&Math.abs(e.y-(p.y-PH/2))<20){e.vy=-5;}return++k<10&&!p.ground;});}},
 {n:'Whirlwind',fn:(a,p,use)=>{if(!use(16))return;cd=34;let k=0;fxWord(p.x,p.y-PH-8,'SNIKT-SNIKT!',1.1,'#f3e9d2',true);
   ACT.push(()=>{const an=k*.9,h={x:p.x,y:p.y-PH/2};clawSlash({h,dx:Math.cos(an),dy:Math.sin(an)},p);p.face=Math.cos(an)<0?-1:1;return++k<14;});}},
 {n:'Feral Senses',fn:(a,p,use)=>{if(senseT>0||!use(20))return;senseT=600;cd=30;fxWord(p.x,p.y-PH-8,'*SNIFF*',1,'#ffc93c',true);rings.push({x:p.x,y:p.y-PH/2,r:4,vr:6,life:20,c:[255,200,80]});}},
);
CYC_POWERS.push(
 {n:'Optic Barrage',fn:(a,p,use)=>{if(!use(16))return;cd=30;let k=0;fxWord(p.x,p.y-PH-6,'PEW-PEW-PEW!',1,'#ff6b5c',true);
   ACT.push(()=>{if(k%2===0){const o=eyes(),b=aimFrom(o),an=Math.atan2(b.dy,b.dx)+(R()-.5)*.25;shots.push({x:o.x,y:o.y,vx:Math.cos(an)*8,vy:Math.sin(an)*8,type:'optic',life:80,boom:5,col:[255,70,50],ecol:[255,70,50]});flash(o.x,o.y,8,[255,40,30],2);}return++k<16;});}},
 {n:'Leg Sweep',fn:(a,p,use)=>{if(!use(14))return;cd=26;const o={x:p.x+p.face*2,y:p.y-3};beamCore({h:o,dx:p.face,dy:0},{pow:160,rad:1,len:220,w:2,c:[255,215,205],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:14,noAsh:true});
   for(const e of enemies)if((e.x-p.x)*p.face>0&&Math.abs(e.x-p.x)<220&&Math.abs(e.y-p.y)<16){e.vy=-4.5;e.vx+=p.face*2;e.frozen=Math.max(e.frozen||0,30);}fxWord(p.x+p.face*40,p.y-14,'ZWIP!',1,'#ff6b5c',true);}},
 {n:'Visor Overload',fn:(a,p,use)=>{if(!use(35))return;cd=60;const o=eyes();fxWord(o.x,o.y-20,'OVERLOAD!',1.4,'#ff6b5c',true);hitstop=Math.max(hitstop,3);fxImpact(o.x,o.y,3);
   for(let k=0;k<16;k++){const an=k/16*6.283;beamCore({h:o,dx:Math.cos(an),dy:Math.sin(an)},{pow:70,rad:1,len:90,w:1,c:[255,215,205],g:[255,40,30],spark:()=>rgb(255,80,50),dmg:18,noAsh:true});}flash(o.x,o.y,80,[255,40,30],10);shake=18;}},
);
ICE_POWERS.push(
 {n:'Ice Prison',fn:(a,p,use)=>{if(!use(18))return;cd=30;const e=nearestEnemy(mouse.wx,mouse.wy,50);const cx=e?e.x:mouse.wx,cy=e?e.y:mouse.wy,r=e?Math.max(e.def.w,e.def.h)/2+2:6;
   for(let y=-r-2;y<=r+2;y++)for(let x=-r-2;x<=r+2;x++){const d=Math.hypot(x,y);if(d>r+2||(e&&d<r))continue;iceAt(cx+x,cy+y);}if(e){e.frozen=Math.max(e.frozen||0,360);hitEnemy(e,10,0,0);}
   fxWord(cx,cy-r-8,'KLONK!',1.1,'#bfe3ff',true);for(let k=0;k<30;k++)spawn(cx,cy,(R()-.5)*4,(R()-.5)*4,rgb(220,245,255),16,0,1,0,1);}},
 {n:'Avalanche',fn:(a,p,use)=>{if(!use(30))return;cd=60;const dir=a.dx<0?-1:1;let x=p.x,k=0;fxWord(p.x+dir*40,p.y-PH-8,'RUMMMBLE!',1.3,'#bfe3ff',true);
   ACT.push(()=>{x+=dir*4;let y=Math.max(0,p.y-40|0);while(y<H-1&&y<p.y+80&&(t[y*W+(x|0)]===0||KIND[t[y*W+(x|0)]]===G||KIND[t[y*W+(x|0)]]===F))y++;
     for(let n=0;n<16;n++)spawn(x-dir*R()*14,y-R()*14,dir*(2+R()*3),-1-R()*3,R()<.6?rgb(235,245,255):rgb(170,215,245),40+R()*30,R()<.12?ICE:0,0,1);
     damageEnemies(x,y-6,14,4,dir*4,-2);for(const b of bodies)if(Math.abs(b.x-x)<20+b.rmax&&Math.abs(b.y-y)<30)b.vx+=dir*.6;shake=Math.max(shake,3);return++k<45;});}},
 {n:'Absolute Zero',fn:(a,p,use)=>{if(!use(40))return;cd=70;const cx=mouse.wx|0,cy=mouse.wy|0,r=15,cells=[];
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-40)continue;const i=Y*W+X,m=t[i];if(m&&KIND[m]!==G&&KIND[m]!==F){setc(i,ICE);cells.push(i);}}
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+6)e.frozen=Math.max(e.frozen||0,60);fxWord(cx,cy-r-6,'KRRRK...',1,'#bfe3ff',true);let k=0;
   ACT.push(()=>{if(++k<45){if(k%5===0)flash(cx,cy,r*2,[160,220,255],3);return true;}
     for(const i of cells)if(t[i]===ICE){const x=i%W,y=(i/W)|0,d=Math.hypot(x-cx,y-cy)||1;if(np<MP-300&&R()<.7)spawn(x,y,(x-cx)/d*(2+R()*4),(y-cy)/d*(2+R()*4)-1,col[i],50+R()*40,R()<.2?ICE:0,1,1);setc(i,EMPTY);}
     damageEnemies(cx,cy,r+8,60,0,-3,true);fxWord(cx,cy-r-6,'SHATTER!',1.5,'#bfe3ff',true);fxBurst(cx,cy,50,'#bfe3ff');fxImpact(cx,cy,3);shake=16;return false;});}},
);
JEAN_POWERS.push(
 {n:'Levitate Crowd',fn:(a,p,use)=>{if(!use(28))return;cd=50;const cx=mouse.wx,cy=mouse.wy,list=enemies.filter(e=>Math.hypot(e.x-cx,e.y-cy)<90);let k=0;fxWord(cx,cy-30,'HNNNN...',1,'#ff9ad8',true);
   ACT.push(()=>{k++;for(const e of list){if(e.hp<=0)continue;if(k<40){e.vy=-1.6;e.vx*=.8;e.frozen=Math.max(e.frozen||0,2);if(frame%3===0)spawn(e.x,e.y,(R()-.5),(R()-.5),rgb(255,120,210),10,0,1,0,1);}else{e.vy=9;e.frozen=0;e.mem.slam=true;}}
     if(k===40)fxWord(cx,cy,'SLAM!',1.4,'#ff9ad8',true);if(k>40){for(const e of list)if(e.mem.slam&&e.ground){e.mem.slam=false;hitEnemy(e,40,0,-2);explode(e.x,e.y+e.def.h/2,5,{col:[255,110,200],quiet:true,self:true});}}
     return k<70;});}},
 {n:'Mind Shield',fn:(a,p,use)=>{if(!use(.45))return;shieldAs([[255,200,240],[255,110,200],[255,80,190]],false);}},
 {n:'Debris Storm',fn:(a,p,use)=>{if(!use(.4))return;if(p.debrisOn===frame-1||p.debrisOn===frame){p.debrisOn=frame;}else{p.debrisOn=frame;fxWord(p.x,p.y-PH-8,'RRRMMM',.9,'#ff9ad8',true);
     ACT.push(()=>{const holding=mouse.down&&CH.powers[cur]&&CH.powers[cur].n==='Debris Storm'&&pl_.debrisOn>=frame-1;const cx=pl_.x,cy=pl_.y-PH/2;
       if(holding){for(let n=0;n<np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<90&&d>1){const want=24+(n%5)*4;pvx[n]=pvx[n]*.85+(-dy/d*2.6+(dx/d)*(want-d)*-.06)*.15*6;pvy[n]=pvy[n]*.85+(dx/d*2.6+(dy/d)*(want-d)*-.06)*.15*6;pl[n]=Math.max(pl[n],30);}}
         for(let n=0;n<60;n++){const an=R()*6.283,d=R()*50,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(KIND[m]===P&&R()<.5){spawn(X,Y,0,-1,col[i],120,m,0,0,0);t[i]=0;wake(i);}}
         return true;}
       let shot=0;for(let n=0;n<np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<60){const tx=mouse.wx-px[n],ty=mouse.wy-py[n],td=Math.hypot(tx,ty)||1;pvx[n]=tx/td*8;pvy[n]=ty/td*8;pg[n]|=2;shot++;}}
       if(shot)fxWord(cx,cy-20,'FWAAM!',1.2,'#ff9ad8',true);damageLine(cx,cy,mouse.wx,mouse.wy,10,Math.min(60,shot*.4));return false;});}}},
);
STORM_POWERS.splice(0,STORM_POWERS.length,
 {n:'Chain Lightning',fn:(a,p,use)=>{if(!use(.8))return;lightning(a,{c:[245,248,255],g:[160,190,255],f:[205,220,255],spark:()=>pickC([200,220,255])});
   let e=nearestEnemy(a.h.x+a.dx*Math.min(a.d,200),a.h.y+a.dy*Math.min(a.d,200),60);const hitL=new Set();let lx=a.h.x+a.dx*Math.min(a.d,200),ly=a.h.y+a.dy*Math.min(a.d,200);
   for(let k=0;k<4&&e;k++){hitL.add(e);zap(lx,ly,e.x,e.y,[245,248,255],[160,190,255]);hitEnemy(e,2.2,0,0);lx=e.x;ly=e.y;e=enemies.filter(q2=>!hitL.has(q2)&&Math.hypot(q2.x-lx,q2.y-ly)<80).sort((u,v)=>Math.hypot(u.x-lx,u.y-ly)-Math.hypot(v.x-lx,v.y-ly))[0];}}},
 {n:'Ball Lightning',fn:(a,p,use)=>{if(!use(26))return;cd=40;fxWord(a.h.x,a.h.y-14,'BZZZT!',1,'#d8e4ff',true);
   for(let k=0;k<3;k++){const o={x:a.h.x,y:a.h.y,vx:a.dx*1.6+(R()-.5),vy:a.dy*1.6+(R()-.5),life:260+k*20};
     ACT.push(()=>{o.vx+=(mouse.wx-o.x)*.0015+(R()-.5)*.15;o.vy+=(mouse.wy-o.y)*.0015+(R()-.5)*.15;o.vx*=.97;o.vy*=.97;o.x+=o.vx;o.y+=o.vy;
       for(let q2=0;q2<3;q2++){const an=R()*6.283;spawn(o.x+Math.cos(an)*3,o.y+Math.sin(an)*3,(R()-.5)*.4,(R()-.5)*.4,R()<.5?rgb(240,245,255):rgb(150,190,255),6,0,1,0,1);}flash(o.x,o.y,10,[150,190,255],2);
       if(frame%10===0){const e=nearestEnemy(o.x,o.y,48);if(e){zap(o.x,o.y,e.x,e.y,[245,248,255],[150,190,255]);hitEnemy(e,9,0,0);}else if(R()<.3){const an=R()*6.283;zap(o.x,o.y,o.x+Math.cos(an)*20,o.y+Math.sin(an)*20,[235,240,255],[140,180,255]);}}
       const X=o.x|0,Y=o.y|0;if(X>=0&&X<W&&Y>=0&&Y<H){const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){explode(X,Y,6,{col:[150,190,255]});return false;}}
       if(--o.life<=0){explode(o.x|0,o.y|0,5,{col:[150,190,255],quiet:true});return false;}return true;});}}},
 {n:'Conductor Strike',fn:(a,p,use)=>{if(!use(30))return;cd=45;lightningStrike(mouse.wx,mouse.wy,8);
   let sx=mouse.wx|0,sy=mouse.wy|0;while(sy<H-1&&(t[sy*W+sx]===0||KIND[t[sy*W+sx]]===G||KIND[t[sy*W+sx]]===F))sy++;
   const COND=m=>m===WATER||m===STEEL||m===ACID;const seen=new Set(),qq=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const i=(sy+dy)*W+sx+dx;if(i>=0&&i<N&&COND(t[i])){seen.add(i);qq.push(i);}}
   for(let h=0;h<qq.length&&qq.length<5000;h++){const i=qq[h];for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<N&&!seen.has(j)&&COND(t[j])){seen.add(j);qq.push(j);}}
   for(let k=0;k<Math.min(90,qq.length);k++){const i=qq[R()*qq.length|0];spawn(i%W,(i/W)|0,(R()-.5)*1.5,-R()*1.5,R()<.5?rgb(240,245,255):rgb(150,190,255),14,0,1,0,1);}
   for(const e of enemies){let hit=false;for(let dy=-e.def.h/2-1;dy<=e.def.h/2+1&&!hit;dy+=2)for(let dx=-e.def.w/2-1;dx<=e.def.w/2+1;dx+=2)if(seen.has(((e.y+dy)|0)*W+((e.x+dx)|0))){hit=true;break;}
     if(hit){hitEnemy(e,35,0,-2);e.frozen=Math.max(e.frozen||0,50);zap(sx,sy,e.x,e.y,[245,248,255],[150,190,255]);}}
   if(qq.length>20)fxWord(sx,sy-20,'KZZZRRT!',1.2,'#d8e4ff',true);}},
 STORM_POWERS[2],STORM_POWERS[3],STORM_POWERS[4],
 {n:'Flash Flood',fn:(a,p,use)=>{if(!use(35))return;cd=60;const cx=mouse.wx;let k=0;fxWord(cx,camY+30,'SHHHHHHH',1.1,'#d8e4ff',true);
   ACT.push(()=>{for(let n=0;n<16;n++)spawn(cx+(R()-.5)*150,camY-4,(R()-.5)*.4,3.5+R()*1.5,rgb(110,150,230),220,WATER,0,1);
     for(let n=0;n<5;n++)spawn(cx+(R()-.5)*190,camY+R()*10,(R()-.5)*.3,.05,R()<.5?rgb(60,64,82):rgb(44,46,60),40,0,0,0,1);
     if(k%60===30)zap(cx+(R()-.5)*120,camY,cx+(R()-.5)*120,camY+40+R()*40,[240,245,255],[150,190,255]);return++k<240;});}},
 {n:'Eye of the Storm',fn:(a,p,use)=>{if(p.eye>0||!use(40))return;p.eye=420;cd=50;fxWord(p.x,p.y-PH-10,'THE EYE!',1.3,'#d8e4ff',true);fxBurst(p.x,p.y-PH/2,50,'#d8e4ff');
   ACT.push(()=>{if(pl_.eye<=0||CH.id!=='storm')return false;const cx=pl_.x,cy=pl_.y-PH/2;
     for(let n=0;n<np;n++){const dx=px[n]-cx,dy=py[n]-cy,d=Math.hypot(dx,dy);if(d<70&&d>4){pvx[n]+=-dy/d*.5+(28-d)*dx/d*.01;pvy[n]+=dx/d*.5+(28-d)*dy/d*.01-.05;}}
     for(let q2=0;q2<5;q2++){const an=frame*.25+q2*1.25;spawn(cx+Math.cos(an)*28,cy+Math.sin(an)*14,-Math.sin(an)*2,Math.cos(an),R()<.5?rgb(225,232,245):rgb(170,180,200),10,0,0,0);}
     for(let n=0;n<40;n++){const an=R()*6.283,d=20+R()*30,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(KIND[m]===P&&R()<.2){spawn(X,Y,-Math.sin(an)*2,Math.cos(an)*2,col[i],80,m,0,0,0);t[i]=0;wake(i);}}
     if(frame%14===0){const e=nearestEnemy(cx,cy,100);if(e){zap(cx,cy,e.x,e.y,[245,248,255],[150,190,255]);hitEnemy(e,14,0,0);flash(e.x,e.y,14,[150,190,255],3);}}
     return true;});}},
);

// ---- X-Men powers 9 and 10
const MPAL={};function metalPal(){if(MPAL[CH.id])return MPAL[CH.id];const o={};for(const k in SPC){const c=SPC[k],l=lumC(c);o[k]=rgb(cl(l*.8+60),cl(l*.82+64),cl(l*.9+74));}o.e=o['*']=rgb(255,255,255);return MPAL[CH.id]=o;}
WOLV_POWERS.push(
 {n:'Fastball Special',fn:(a,p,use)=>{if(!use(28))return;cd=60;const dx=a.dx,dy=a.dy;let k=0;fxWord(p.x,p.y-PH-10,'FASTBALL SPECIAL!',1.4,'#ffc93c',true);p.fly=false;shake+=6;
   ACT.push(()=>{p.vx=dx*8;p.vy=dy*8;const hx=p.x+dx*8,hy=p.y-PH/2+dy*8;carve(hx,hy,7,dx*6,dy*6);damageEnemies(hx,hy,12,30,dx*6,dy*6);if(k%2===0){afters.push({x:p.x,y:p.y,ang:Math.atan2(dx,-dy),face:p.face,life:12});slashFx(hx,hy,Math.atan2(dy,dx));}
     if(++k>=26){explode(hx|0,hy|0,12,{self:true,col:[255,220,80],word:'SNIKT!!'});p.vx*=.3;p.vy=Math.min(p.vy,0);return false;}return true;});}},
 {n:'Adamantium Skeleton',fn:(a,p,use)=>{if(p.metal>0||!use(35))return;p.metal=300;cd=40;fxWord(p.x,p.y-PH-10,'KLANNNG!',1.4,'#d8e4ff',true);flash(p.x,p.y-PH/2,40,[220,230,255],8);rings.push({x:p.x,y:p.y-PH/2,r:4,vr:3,life:12,c:[220,230,255]});}},
);
CYC_POWERS.push(
 {n:'Optic Cage',fn:(a,p,use)=>{if(!use(30))return;cd=60;const cx=mouse.wx,cy=mouse.wy,r=22;let k=0;fxWord(cx,cy-r-8,'OPTIC CAGE!',1.1,'#ff6b5c',true);
   ACT.push(()=>{const c=[[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r]];for(let q2=0;q2<4;q2++){const [x0,y0]=c[q2],[x1,y1]=c[(q2+1)%4];beams.push({x0,y0,x1,y1,life:1,w:1,c:[255,215,205],g:[255,40,30]});}
     for(const e of enemies)if(Math.abs(e.x-cx)<r+e.def.w/2&&Math.abs(e.y-cy)<r+e.def.h/2){hitEnemy(e,.9,0,0);e.vx*=.4;e.vy*=.4;if(Math.abs(Math.abs(e.x-cx)-r)<e.def.w/2+1||Math.abs(Math.abs(e.y-cy)-r)<e.def.h/2+1)hitEnemy(e,2,(cx-e.x)*.05,(cy-e.y)*.05);}
     return++k<120;});}},
 {n:'Uncontrolled Blast',fn:(a,p,use)=>{if(!use(55))return;cd=120;let k=0;fxWord(p.x,p.y-PH-12,'VISOR OFF!',1.6,'#ff6b5c',true);hitstop=Math.max(hitstop,4);fxImpact(p.x,p.y-PH/2,4);
   ACT.push(()=>{const o=eyes(),b=aimFrom(o),base=Math.atan2(b.dy,b.dx);for(let q2=-3;q2<=3;q2++){const an=base+q2*.09+(R()-.5)*.04;beamCore({h:o,dx:Math.cos(an),dy:Math.sin(an)},{pow:300,rad:2,len:520,w:3,c:[255,225,215],g:[255,30,20],spark:()=>rgb(255,60+R()*150,40),dmg:6,noAsh:true});}
     pl_.vx-=b.dx*.35;pl_.vy-=b.dy*.35;shake=Math.max(shake,14);return++k<40;});}},
);
ICE_POWERS.push(
 {n:'Ice Golem',fn:(a,p,use)=>{if(!use(45))return;cd=90;let gx=mouse.wx|0,gy=mouse.wy|0;while(gy<H-1&&(t[gy*W+gx]===0||KIND[t[gy*W+gx]]!==S))gy++;
   const cells=[],body=["..IIII..",".IeIIeI.","..IIII..","IIIIIIII","IIIIIIII","II.II.II","II.II.II","II.II.II","..II.II.","..II.II.","..II.II.",".III.III"];
   for(let y=0;y<body.length;y++)for(let x=0;x<8;x++){const ch=body[y][x];if(ch==='.')continue;for(let a2=0;a2<2;a2++)for(let b2=0;b2<2;b2++){const X=gx-8+x*2+a2,Y=gy-body.length*2+y*2+b2;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i]&&KIND[t[i]]===S)continue;
     setc(i,ch==='e'?NEON:ICE);if(ch==='e')col[i]=rgb(120,230,255);cells.push(i);}}
   const head=(gy-body.length*2+3)*W+gx;let k=0;fxWord(gx,gy-34,'KRRRAKK!',1.2,'#bfe3ff',true);
   ACT.push(()=>{k++;if(t[head]!==ICE&&t[head]!==NEON&&t[head-1]!==ICE)return false;
     if(k%28===0){const e=nearestEnemy(gx,gy-20,220);if(e){const dx=e.x-gx,dy=e.y-(gy-22),d=Math.hypot(dx,dy)||1;for(let q2=0;q2<2;q2++)shots.push({x:gx,y:gy-24,vx:dx/d*6+(R()-.5),vy:dy/d*6+(R()-.5),type:'shard',life:90,col:[200,240,255],grav:.03,
       onHit:sh=>{for(let q3=0;q3<3;q3++)iceAt(sh.x+(R()-.5)*3,sh.y+(R()-.5)*3);damageEnemies(sh.x,sh.y,6,14,sh.vx*.3,sh.vy*.3);for(const e2 of enemies)if(Math.hypot(e2.x-sh.x,e2.y-sh.y)<7)e2.frozen=Math.max(e2.frozen||0,40);}});}}
     if(k>=720){for(const i of cells)if(t[i]===ICE||t[i]===NEON){if(R()<.6)spawn(i%W,(i/W)|0,(R()-.5)*3,-R()*2,rgb(220,245,255),40,0,1,1);setc(i,EMPTY);}fxWord(gx,gy-30,'SHATTER',1,'#bfe3ff',true);return false;}return true;});}},
 {n:'Ice Bridge',fn:(a,p,use)=>{if(!use(22))return;cd=30;const x0=p.x,y0=p.y+1,x1=mouse.wx,y1=mouse.wy,n=Math.max(1,Math.hypot(x1-x0,y1-y0)|0);
   for(let k=0;k<=n;k++){const X=x0+(x1-x0)*k/n|0,Y=y0+(y1-y0)*k/n|0;for(let d=0;d<3;d++){const i=(Y+d)*W+X;if(i<0||i>=N||(t[i]&&KIND[t[i]]!==G&&KIND[t[i]]!==F))continue;setc(i,ICE);pin[i]=3;slide.push([i,frame+480+(k*.3|0)+(R()*40|0)]);}}
   fxWord((x0+x1)/2,(y0+y1)/2-10,'FSSHHK!',1,'#bfe3ff',true);for(let k=0;k<40;k++){const f=R();spawn(x0+(x1-x0)*f,y0+(y1-y0)*f,(R()-.5),-R(),rgb(220,245,255),20,0,1,0,1);}}},
);
JEAN_POWERS.push(
 {n:'Phoenix Wings',fn:(a,p,use)=>{if(p.wings>0||!use(40))return;p.wings=360;cd=40;if(!p.fly)toggleFly(true);fxWord(p.x,p.y-PH-12,'SKREEEE!',1.4,'#ffb340',true);fxBurst(p.x,p.y-PH/2,50,'#ffb340');flash(p.x,p.y-PH/2,60,[255,150,50],10);}},
 {n:'Telekinetic Rip',fn:(a,p,use)=>{if(!use(40))return;cd=70;const cx=mouse.wx|0,cy=mouse.wy|0,r=20;let n=0;
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r*(.8+R()*.2))continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-40)continue;const i=Y*W+X,m=t[i];if(m&&(KIND[m]===S||KIND[m]===P)){q[n++]=i;markDirty(i);}}
   if(n<20)return;const b=makeBody(q,n,true);if(!b)return;b.tx=b.x;b.ty=b.y-60;let k=0;fxWord(cx,cy-30,'RRRMMMM...',1.1,'#ff9ad8',true);shake+=6;
   ACT.push(()=>{k++;if(!bodies.includes(b))return false;for(let q2=0;q2<6;q2++){const j=R()*b.ex.length|0;spawn(b.x+b.ex[j],b.y+b.ey[j],(R()-.5)*.6,(R()-.5)*.6,rgb(255,120,210),10,0,1,0,1);}
     if(k<35){b.tx=cx;b.ty=cy-60;return true;}
     b.held=false;b.vx=0;b.vy=12;b.va=(R()-.5)*.05;b.thrown=true;b.safeP=frame+30;fxWord(cx,cy,'SLAM!',1.5,'#ff9ad8',true);return false;});}},
);
STORM_POWERS.push(
 {n:'Lightning Rider',fn:(a,p,use)=>{if(!use(30))return;cd=40;const x0=p.x,y0=p.y;let lx=x0,ly=y0;const dx=mouse.wx-x0,dy=mouse.wy-y0,d=Math.max(1,Math.hypot(dx,dy));
   for(let k=1;k<=d;k++){const x=x0+dx*k/d,y=y0+dy*k/d;if(boxHit(x,y))break;lx=x;ly=y;}
   for(let k=0;k<3;k++)zap(x0,y0-PH/2,lx,ly-PH/2,[245,248,255],[150,190,255]);damageLine(x0,y0-PH/2,lx,ly-PH/2,10,40);
   for(let k=0;k<12;k++){const f=R(),X=x0+(lx-x0)*f|0,Y=y0-PH/2+(ly-y0)*f|0;if(X>=0&&X<W&&Y>=0&&Y<H&&FLAM[t[Y*W+X]]>0)ignite(Y*W+X);}
   p.x=lx;p.y=ly;p.vx=dx/d*3;p.vy=dy/d*3;if(!p.fly&&CH.fly)toggleFly(true);flash(lx,ly-PH/2,40,[150,190,255],8);fxWord(lx,ly-PH-6,'KRAKOOOM!',1.3,'#d8e4ff',true);shake+=8;}},
 {n:'Blizzard',fn:(a,p,use)=>{if(!use(40))return;cd=70;const cx=mouse.wx,cy=mouse.wy,r=75,dir=p.face;let k=0;fxWord(cx,cy-40,'WHHOOOOO!',1.3,'#d8e4ff',true);
   ACT.push(()=>{for(let q2=0;q2<14;q2++)spawn(cx-dir*r+(R()-.5)*30,cy+(R()-.5)*r*1.6,dir*(3+R()*3),(R()-.5)*.8,R()<.7?rgb(240,246,255):rgb(200,215,235),40,R()<.03?ICE:0,0,0);
     for(let q2=0;q2<120;q2++){const X=cx+(R()-.5)*r*2|0,Y=cy+(R()-.5)*r*2|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(m===WATER&&R()<.3)setc(i,ICE);else if(KIND[m]===F)setc(i,EMPTY);}
     for(const e of enemies)if(Math.abs(e.x-cx)<r&&Math.abs(e.y-cy)<r){e.frozen=Math.max(e.frozen||0,15);e.vx+=dir*.2;hitEnemy(e,.4,0,0);}
     for(let n=0;n<np;n++)if(Math.abs(px[n]-cx)<r&&Math.abs(py[n]-cy)<r)pvx[n]+=dir*.25;
     return++k<300;});}},
);
// ================= overhaul powers: every hero but Doom gets a full 12-power kit =================
// Each new power is unique to its hero and does something no other power in the game does.
const pins=[],therm=[],jets=[],waves=[];let decoy=null,stasis=null,slowT=0,heatZ=null,caPulse=0,AI_T=null,AI_TE=null,AI_ALLY=null;
function surfaceY(x,y0,maxD=200){x=Math.max(0,Math.min(W-1,x|0));let y=Math.max(0,y0|0);const y1=Math.min(H-1,y+maxD);for(;y<y1;y++){const m=t[y*W+x];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L)break;}return y;}
function grabbable(x,y,r){let b=null,bd=r;for(const e of enemies){if(e.hp<=0||e.grabbed||e.def.title||e.def.w>20)continue;const d=Math.hypot(e.x-x,e.y-y)-e.def.w/2;if(d<bd){bd=d;b=e;}}return b;}
const isMetal=e=>e.def.metal!==false;
function crackCell(X,Y,vx){if(X<0||X>=W||Y<0||Y>=H-44)return;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F)return;if(m===OBSID||m===STEEL&&R()<.6)return;
  if(np<MP-400&&R()<.45)spawn(X,Y,vx*(.5+R())+(R()-.5)*1.5,-1.5-R()*3,col[i],80,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);setc(i,EMPTY);}
function shockFx(x,y,s=1){if(waves.length>5)waves.shift();waves.push({x,y,r:2,s,life:30});caPulse=Math.max(caPulse,s*3);} // GPU ring distortion + colour split
function updWaves(){for(let n=waves.length-1;n>=0;n--){const w=waves[n];w.r+=4+w.s*3;if(--w.life<=0)waves.splice(n,1);}caPulse*=.85;}
const DECOY_PAL=Object.assign({},PAL_ICE,{e:rgb(120,170,220),'+':rgb(200,240,255),J:rgb(120,170,220)});
HULK_POWERS.push(
 // grab a foe and smash it into the ground, side to side, five times
 {n:'Puny God',fn:(a,p,use)=>{const e=grabbable(p.x+p.face*10,p.y-PH/2,44);if(!e){if(frame-(p.denyT||-99)>20){p.denyT=frame;fxWord(p.x,p.y-PH-6,'HRRM?',.8,'#bff07a',true);snd('deny',p.x,p.y);}return;}
   if(!use(26))return;cd=80;e.grabbed=true;let k=0,side=p.face,hits=0;const N=5;fxWord(p.x,p.y-PH-10,'PUNY...',1.2,'#bff07a',true);snd('rip',p.x,p.y);
   ACT.push(()=>{if(!enemies.includes(e)||e.hp<=0){p.script=0;p.grip=null;return false;}
     p.script=2;k++;const f=(k%14)/14,R0=12+e.def.h/2+e.def.w*.2,cx=p.x,cy=p.y-PH*.72;
     const a0=side>0?Math.PI:0,a1=side>0?Math.PI*2:-Math.PI,ang=a0+(a1-a0)*(f*f*(3-2*f)); // up and over the head, then down hard on the other side
     e.x=cx+Math.cos(ang)*R0;e.y=cy+Math.sin(ang)*R0*.95;p.grip={x:e.x,y:e.y};p.face=Math.cos(ang)>=0?1:-1;
     if(k%14===13){hits++;side=-side;const gx=e.x|0,gy=surfaceY(gx,e.y-6,70);e.y=Math.min(e.y,gy-e.def.h/2-1);
       explode(gx,gy,7+hits,{self:true,quiet:true,col:[210,200,170]});hitEnemy(e,hits<N?20:45,0,0);snd('slam',gx,gy,{size:.6+hits*.1});shockFx(gx,gy,.5);
       shake=Math.min(22,shake+6);hitstop=Math.max(hitstop,hits<N?2:5);fxWord(gx,gy-14,hits<N?['WHAM!','KRAK!','SLAM!','THOOM!'][hits%4]:'PUNY GOD.',hits<N?1:1.6,'#bff07a',true);
       if(hits>=N){e.grabbed=false;e.vx=-side*2;e.vy=-2;p.script=0;p.grip=null;p.throwF=8;return false;}}
     return true;});}},
 // a fissure races along the ground; slabs of earth erupt from it as tumbling rigid chunks
 {n:'Fault Line',fn:(a,p,use)=>{if(!p.ground||!use(24))return;cd=50;const dir=a.dx<0?-1:1;p.face=dir;p.punchF=10;let x=p.x+dir*8,k=0;const y0=p.y;
   fxWord(p.x+dir*30,p.y-PH-8,'KRRRAAACK!',1.3,'#bff07a',true);explode(p.x+dir*6|0,p.y+1,6,{self:true,quiet:true,col:[200,190,160]});shake+=6;snd('slam',p.x,p.y,{size:.8});
   ACT.push(()=>{for(let s=0;s<2;s++){x+=dir*3;if(x<4||x>=W-4)return false;const sy=surfaceY(x,y0-40,120);if(sy>=H-46||sy>y0+60)return false;
       const depth=10+R()*16|0;for(let d=0;d<depth;d++){const X=x+(R()-.5)*3|0;for(let w=-1;w<=1;w++)if(R()<.75)crackCell(X+w,sy+d,dir);}
       for(let n=0;n<4;n++)spawn(x+(R()-.5)*4,sy-1,(R()-.5)*2,-1-R()*3,rgb(160,150,130),20+R()*14,0,0,1);
       for(const e of enemies)if(Math.abs(e.x-x)<8+e.def.w/2&&Math.abs(e.y+e.def.h/2-sy)<14){hitEnemy(e,6,dir,-1.5);if(!e.def.title)e.vy=Math.min(e.vy,-5);}}
     if(k%4===1){const px0=x+dir*5|0,sy=surfaceY(px0,y0-40,120);let n=0;
       for(let Y=sy;Y<sy+11;Y++)for(let X=px0-4;X<=px0+4;X++){if(X<0||X>=W||Y<0||Y>=H-46)continue;const i=Y*W+X,m=t[i];if(KIND[m]===S||KIND[m]===P){q[n++]=i;markDirty(i);}}
       if(n>=20){const b=makeBody(q,n,false);if(b){b.vy=-5.5-R()*3;b.vx=dir*R()*1.2;b.va=(R()-.5)*.08;b.safeP=frame+40;}}}
     shake=Math.max(shake,3);if(k%6===0)snd('crumble',x,y0,{size:.8});return++k<40;});}},
 // leap out of sight, then come down on the cursor like a meteor
 {n:'Meteor Drop',fn:(a,p,use)=>{if(!use(40))return;cd=100;const tx=Math.max(12,Math.min(W-12,mouse.wx));let k=0,ph=0;if(p.fly)toggleFly(false);p.slam=p.leap=false;
   explode(p.x|0,p.y+1,7,{self:true,col:[200,190,160]});fxWord(p.x,p.y-PH-10,'HULK LEAP!',1.2,'#bff07a',true);snd('leap',p.x,p.y,{size:1});
   ACT.push(()=>{k++;p.script=2;p.vx=0;
     if(ph===0){p.vy=-12;for(let s=0;s<4;s++){p.y-=3;carve(p.x,p.y-PH/2,7,0,-6);}if(k%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});spawn(p.x+(R()-.5)*6,p.y,(R()-.5),2,rgb(170,160,140),20,0,0,1);
       if(p.y<camY-PH-24||p.y<PH+4||k>45){ph=1;k=0;p.x=tx;p.y=Math.max(PH+4,camY-30);fxWord(tx,camY+30,'INCOMING!',1.3,'#ffc93c',true);snd('jet',tx,camY+40,{v:.8});}
       return true;}
     p.vy=11;let hitG=false;
     for(let s=0;s<11&&!hitG;s++){p.y+=1;if(p.y>=H-6){hitG=true;break;}const fi=((p.y+1)|0)*W+(p.x|0),m=t[fi];if(m&&KIND[m]===S&&(NAT[m]||m===OBSID)){hitG=true;break;}if(s%3===0)carve(p.x,p.y-PH/2+4,8,0,8);}
     for(let n=0;n<10;n++)spawn(p.x+(R()-.5)*10,p.y-PH*R(),(R()-.5)*1.5,-2-R()*2,R()<.5?rgb(255,170+R()*60|0,60):pickC(GAMMA),18+R()*12,R()<.02?FIRE:0,1,0,1);
     afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});damageEnemies(p.x,p.y-PH/2,14,10,0,4);flash(p.x,p.y-PH/2,24,[255,170,80],2);
     if(hitG||k>80){p.script=0;p.vy=0;p.landF=8;explode(p.x|0,p.y|0,20,{fire:.3,col:[255,170,80],word:'METEOR!'});quake(p.x,p.y,{col:GAMMA,r:46});damageEnemies(p.x,p.y,80,90,0,-6,true);
       fxImpact(p.x,p.y,5);hitstop=Math.max(hitstop,5);shockFx(p.x,p.y,1.3);return false;}
     return true;});}},
 // curl up and bounce through the city: smashes buildings, rebounds off bedrock and steel. A/D steer, S stops
 {n:'Wrecking Ball',fn:(a,p,use)=>{if(p.ball||!use(30))return;cd=70;let vx=a.dx*6,vy=Math.min(-1.5,a.dy*6),k=0;const r=11;if(p.fly)toggleFly(false);p.ball=1;fxWord(p.x,p.y-PH-10,'WRECKING BALL!',1.2,'#bff07a',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{k++;p.script=2;const ax=(keys.KeyD?1:0)-(keys.KeyA?1:0);vx+=ax*.2;vy+=.34;let sp=Math.hypot(vx,vy);if(sp>8.5){vx*=8.5/sp;vy*=8.5/sp;sp=8.5;}
     const n=Math.max(1,Math.ceil(sp/2));
     for(let s=0;s<n;s++){const cx=p.x+vx/n,cy=p.y-r+vy/n;let hx=0,hy=0,hit=0;
       for(let q2=0;q2<20;q2++){const an=q2/20*6.283,X=cx+Math.cos(an)*r|0,Y=cy+Math.sin(an)*r|0;
         if(X<2||X>=W-2||Y>=H-2){hx+=Math.cos(an);hy+=Math.sin(an);hit++;continue;}if(Y<0)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F||KIND[m]===L)continue;
         if(KIND[m]===S&&NAT[m]||m===OBSID||m===STEEL&&R()<.5){hx+=Math.cos(an);hy+=Math.sin(an);hit++;}
         else{if(np<MP-300&&R()<.6)spawn(X,Y,vx*.5+(R()-.5)*2,vy*.5-R()*2,col[i],70,KIND[m]===S?RUBBLE:m,m===GLASS?1:0);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}setc(i,EMPTY);}}
       if(hit){const d=Math.hypot(hx,hy)||1,nx=hx/d,ny=hy/d,vn=vx*nx+vy*ny;
         if(vn>0){vx-=1.6*vn*nx;vy-=1.6*vn*ny;vx*=.97;if(vn>2.5){const ix=cx+nx*r,iy=cy+ny*r;explode(ix|0,iy|0,4+Math.min(5,vn)|0,{self:true,quiet:vn<5,col:[200,190,160]});shake=Math.max(shake,vn*1.2);snd('thud',ix,iy,{v:Math.min(1,vn/6)});}}
         if(hit>5){p.x-=nx*1.2;p.y-=ny*1.2;}}
       else{p.x=cx;p.y=cy+r;}}
     bgHit(p.x,p.y-r,r);damageEnemies(p.x,p.y-r,r+5,4+sp*1.6,vx*.5,vy*.5-1);
     for(const b of bodies){if(b.held)continue;const dx=b.x-p.x,dy=b.y-(p.y-r),d=Math.hypot(dx,dy)||1;if(d<b.rmax+r&&bodyAt(b,p.x+dx/d*r,p.y-r+dy/d*r)){b.vx+=vx*.4;b.vy+=vy*.4-.5;b.thrown=true;}}
     p.ang+=vx*.11;p.face=vx<0?-1:1;if(k%2===0)afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:9});spawn(p.x,p.y-r,(R()-.5),(R()-.5),pickC(GAMMA),12,0,1,0,1);
     if(k>=240||(pressed.KeyS&&k>15)){p.ball=0;p.ang=0;p.script=0;p.vx=vx*.6;p.vy=Math.min(vy,0);explode(p.x|0,p.y-4|0,8,{self:true,col:GAMMA});return false;}
     return true;});}},
);
THOR_POWERS.push(
 // hurl Mjolnir and hang on: Thor is dragged along behind it, smashing through anything
 {n:'Hammer Tow',fn:(a,p,use)=>{if(p.tow||!use(20))return;cd=40;const dx=a.dx,dy=a.dy;let k=0;if(CH.fly&&!p.fly)toggleFly(true);p.tow={dx,dy};fxWord(p.x,p.y-PH-8,'HYAAAH!',1.1,'#bfe3ff',true);snd('whoosh',p.x,p.y);
   ACT.push(()=>{k++;p.script=2;p.fly=true;
     for(let s=0;s<3;s++){p.x+=dx*3;p.y+=dy*3;carve(p.x+dx*11,p.y-PH/2+dy*11,6.5,dx*6,dy*6);if(s===1)carve(p.x,p.y-PH/2,5,dx*4,dy*4);}
     p.x=Math.max(5,Math.min(W-5,p.x));p.y=Math.max(PH+2,Math.min(H-8,p.y));
     const hx=p.x+dx*11,hy=p.y-PH/2+dy*11;damageEnemies(hx,hy,12,14,dx*6,dy*6);
     for(const b of bodies){if(!b.held&&Math.hypot(b.x-hx,b.y-hy)<b.rmax+8){b.vx+=dx*2;b.vy+=dy*2;b.thrown=true;}}
     if(k%3===0)zap(hx,hy,hx+(R()-.5)*40,hy+(R()-.5)*40,[230,240,255],[120,170,255]);spawn(hx,hy,(R()-.5)*2,(R()-.5)*2,pickC(BLUE),12,0,1,0,1);
     afters.push({x:p.x,y:p.y,ang:p.ang,face:p.face,life:10});p.face=dx<0?-1:1;p.ang+=(Math.atan2(dx,-dy)*.85-p.ang)*.3;p.grip={x:hx,y:hy};sndLoop('tow','wind',p.x,p.y);shake=Math.max(shake,2.5);
     if(k>=32||p.x<=5||p.x>=W-5||p.y<=PH+2||p.y>=H-8){p.script=0;p.tow=null;p.grip=null;p.vx=dx*3;p.vy=dy*3;explode(hx|0,hy|0,10,{col:BLUE,self:true,word:'KRAKOOM!'});for(let q2=0;q2<4;q2++)zap(hx,hy,hx+(R()-.5)*70,hy+(R()-.5)*70,[230,240,255],[120,170,255]);return false;}
     return true;});}},
 // drop Mjolnir from the sky onto a foe: no one unworthy can move while it sits on them
 {n:'Mjolnir Pin',fn:(a,p,use)=>{if(pins.length||shots.some(s=>s.type==='hammer'||s.type==='pin')||!use(26))return;cd=50;const e=nearestEnemy(mouse.wx,mouse.wy,60);
   shots.push({x:e?e.x:mouse.wx,y:Math.max(2,camY-16),vx:0,vy:9,type:'pin',life:240,target:e});fxWord(p.x,p.y-PH-8,'ONLY THE WORTHY!',1.1,'#bfe3ff',true);flash(p.x,p.y-PH/2,30,BLUE,6);}},
 // launch everything in front skyward, then lightning finds each of them in the air
 {n:'Asgardian Uppercut',fn:(a,p,use)=>{if(!use(16))return;cd=34;const dir=a.dx<0?-1:1;p.face=dir;p.punchF=10;if(p.ground){p.vy=-3.5;p.ground=false;}const cx=p.x+dir*9,cy=p.y-PH/2;
   for(let s=0;s<=10;s++)carve(p.x+dir*(6+Math.sin(s/10*Math.PI)*7),p.y-4-s*2.6,3.5,dir,-3);
   const hitL=[];for(const e of enemies){const rx=(e.x-p.x)*dir;if(rx>-4&&rx<28+e.def.w/2&&e.y>p.y-PH-20&&e.y<p.y+6){hitL.push(e);hitEnemy(e,28,dir*1.5,-2);if(!e.def.title&&e.def.w<=20){e.vy=-8.5;e.ground=false;}}}
   for(const b of bodies){if(!b.held&&Math.abs(b.x-cx)<b.rmax+14&&Math.abs(b.y-cy)<b.rmax+16){b.vy-=6;b.vx+=dir;b.thrown=true;}}
   fxWord(cx,cy-16,'UPPERCUT!',1.2,'#bfe3ff',true);fxBurst(cx,cy-8,26,'#bfe3ff');snd('punch',cx,cy);shake+=5;let k=0;
   ACT.push(()=>{if(++k===20){for(const e of hitL)if(e.hp>0&&enemies.includes(e))lightningStrike(e.x,e.y,7);return false;}return true;});}},
 // the axe: flies straight and cleaves a razor-thin line through everything, so buildings split and fall
 {n:'Stormbreaker',fn:(a,p,use)=>{if(shots.some(s=>s.type==='axe')||!use(22))return;cd=40;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7.5,vy:a.dy*7.5,type:'axe',life:56,spin:0,hitSet:new Set()});fxWord(a.h.x,a.h.y-14,'STORMBREAKER!',1.1,'#bfe3ff',true);p.throwF=8;}},
);
IRON_POWERS.push(
 // hold: a magnetic field that only grips metal. Rips steel frames out of buildings, drags robots in
 {n:'Electromagnet',fn:(a,p,use)=>{if(!use(.55))return;const cx=a.h.x,cy=a.h.y,ang=Math.atan2(a.dy,a.dx),R0=170;
   for(let k=0;k<2;k++){const t2=ang+(R()-.5)*.6,d=60+R()*110,pts=[[cx,cy]];for(let s=1;s<=6;s++){const f=s/6,bend=Math.sin(f*Math.PI)*(R()-.5)*20;pts.push([cx+Math.cos(t2)*d*f-Math.sin(t2)*bend,cy+Math.sin(t2)*d*f+Math.cos(t2)*bend]);}beams.push({pts,life:1,c:[190,225,255],g:[70,130,255]});}
   for(let n=0;n<900;n++){const d=8+Math.sqrt(R())*R0,t2=ang+(R()-.5)*.75,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X;if(t[i]!==STEEL)continue;
     if(R()<.1*(1-d/R0)+.015){spawn(X,Y,(cx-X)/d*(3+R()*2),(cy-Y)/d*(3+R()*2)-.3,col[i],70,RUBBLE,0,0,0);setc(i,EMPTY);}}
   for(const e of enemies){if(!isMetal(e)||e.grabbed)continue;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;if(d<R0&&(-dx*a.dx-dy*a.dy)/d>.55){const k=e.def.title?.12:e.def.w>16?.25:.65;e.vx+=dx/d*k;e.vy+=dy/d*k-.05;if(d<16)hitEnemy(e,1.6,0,0);if(frame%4===0)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(170,215,255),8,0,1,0,1);}}
   for(const b of bodies){if(b.held||!(b.st>.12))continue;const dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(-dx*a.dx-dy*a.dy)/d>.5){const f=Math.min(1,400/b.n)*.5;b.vx+=dx/d*f;b.vy+=dy/d*f-.25;}}
   sndLoop('mag','hum',cx,cy,{v:.9});if(frame%30===0)fxWord(cx+a.dx*40,cy-10,'VRRRMMM',.8,'#bfe3ff',true);}},
 // knocks every machine nearby offline, fries enemy shots in the air and blows out neon
 {n:'EMP Burst',fn:(a,p,use)=>{if(!use(35))return;cd=70;const cx=p.x,cy=p.y-PH/2,r=150;fxWord(cx,cy-30,'EMP!',1.6,'#bfe3ff',true);fxImpact(cx,cy,3);hitstop=Math.max(hitstop,3);shockFx(cx,cy,.9);
   rings.push({x:cx,y:cy,r:4,vr:6,life:24,c:[150,235,255]},{x:cx,y:cy,r:2,vr:4,life:30,c:[60,140,255]});flash(cx,cy,r,[120,200,255],10);
   let stunned=0;for(const e of enemies){if(Math.hypot(e.x-cx,e.y-cy)>r||!isMetal(e))continue;e.frozen=Math.max(e.frozen||0,e.def.title?70:220);e.emp=e.frozen;hitEnemy(e,10,0,0);stunned++;}
   for(let n=shots.length-1;n>=0;n--){const s2=shots[n];if(s2.owner==='enemy'&&Math.hypot(s2.x-cx,s2.y-cy)<r){spawn(s2.x,s2.y,0,0,rgb(150,230,255),10,0,1,0);shots.splice(n,1);}}
   for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r)continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X;if(t[i]===NEON&&R()<.85){t[i]=GLASS;col[i]=rgb(40,44,58);if(R()<.04)spawn(X,Y,(R()-.5)*2,-R()*2,rgb(255,240,180),12,0,1,1);}}
   if(stunned)fxWord(cx,cy-46,stunned+' OFFLINE',1,'#bfe3ff',true);}},
 // optical camouflage: enemies lose track of you and fire at where you were. Attacking breaks it
 {n:'Stealth Mode',fn:(a,p,use)=>{if(p.stealth>0||!use(28))return;cd=30;p.stealth=420;p.lastSeen={x:p.x,y:p.y-PH/2};fxWord(p.x,p.y-PH-8,'CLOAKED',.9,'#bfe3ff',true);snd('charge',p.x,p.y,{pitch:1.5});
   for(let k=0;k<30;k++)spawn(p.x+(R()-.5)*10,p.y-R()*PH,(R()-.5)*.6,-R()*.6,rgb(150,230,255),14,0,1,0,1);}},
 // hold: sticky white-hot thermite. It clings where it lands and melts steel into molten metal
 {n:'Thermite',fn:(a,p,use)=>{if(!use(.5))return;for(let k=0;k<2;k++){const sp=4+R()*2.2,s2=(R()-.5)*.35;therm.push({x:a.h.x,y:a.h.y,vx:(a.dx-s2*a.dy)*sp,vy:(a.dy+s2*a.dx)*sp,life:70,stuck:false});}
   sndLoop('therm','flame',a.h.x,a.h.y,{v:.7});flash(a.h.x,a.h.y,10,[255,220,160],2);if(frame%30===0)fxWord(a.h.x+a.dx*30,a.h.y-10,'FSSSSST!',.8,'#ffc93c',true);}},
);
WOLV_POWERS.push(
 // a frenzy of dashes from foe to foe, a claw strike on each
 {n:'Berserker Barrage',fn:(a,p,use)=>{const pool=enemies.filter(e=>e.hp>0&&!e.grabbed&&Math.hypot(e.x-p.x,e.y-p.y)<220),list=[];let cx=p.x,cy=p.y;
   while(list.length<6&&pool.length){let bi=0,bd=1e9;pool.forEach((e,i)=>{const d=Math.hypot(e.x-cx,e.y-cy);if(d<bd){bd=d;bi=i;}});const e=pool.splice(bi,1)[0];list.push({e});cx=e.x;cy=e.y;}
   if(!list.length)for(let k=1;k<=3;k++)list.push({x:p.x+a.dx*k*40,y:p.y+a.dy*k*40});
   if(!use(30))return;cd=70;fxWord(p.x,p.y-PH-10,'BERSERKER BARRAGE!',1.2,'#e23b2e',true);snd('roar',p.x,p.y,{v:.6,pitch:1.3});let idx=0,f=0,from={x:p.x,y:p.y};
   ACT.push(()=>{p.script=2;p.dodge=4;const tg=list[idx];if(tg.e&&(tg.e.hp<=0||!enemies.includes(tg.e))){tg.x=tg.e.x;tg.y=tg.e.y+tg.e.def.h/2;tg.e=null;}
     const tx=tg.e?tg.e.x-Math.sign((tg.e.x-from.x)||1)*(tg.e.def.w/2+3):tg.x,ty=tg.e?tg.e.y+tg.e.def.h/2:tg.y;
     f++;const u=Math.min(1,f/6);p.x=from.x+(tx-from.x)*u;p.y=from.y+(ty-from.y)*u;p.face=tx>=from.x?1:-1;
     if(f%2===0)afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:10});spawn(p.x,p.y-PH/2,(R()-.5)*2,(R()-.5)*2,rgb(255,230,150),8,0,1,0,1);
     if(f>=6){const h={x:p.x+p.face*4,y:p.y-PH/2},ang=tg.e?Math.atan2(tg.e.y-h.y,tg.e.x-h.x):Math.atan2(a.dy,a.dx);clawSlash({h,dx:Math.cos(ang),dy:Math.sin(ang)},p);
       if(tg.e&&tg.e.hp>0)hitEnemy(tg.e,26,p.face*3,-3);fxWord(p.x,p.y-PH-6,['SNIKT!','SHKK!','RRAH!','SKRITCH!'][idx%4],.9,'#f3e9d2',true);hitstop=Math.max(hitstop,2);shake+=3;
       idx++;f=0;from={x:p.x,y:p.y};if(idx>=list.length){p.script=0;p.vy=-2.5;p.vx=0;p.dodge=12;p.punchF=6;return false;}}
     return true;});}},
 // for six seconds nothing can put him down; afterwards the healing factor repays most of the damage
 {n:'Not Today',fn:(a,p,use)=>{if(p.grit>0||!use(35))return;cd=60;p.grit=360;p.gritD=0;fxWord(p.x,p.y-PH-10,'NOT TODAY, BUB!',1.3,'#e23b2e',true);fxBurst(p.x,p.y-PH/2,40,'#e23b2e');flash(p.x,p.y-PH/2,40,[255,60,40],8);snd('roar',p.x,p.y,{v:.5,pitch:1.4});}},
);
CYC_POWERS.push(
 // bullet time: the whole world runs at half speed for five seconds, Cyclops doesn't
 {n:'Tactical Focus',fn:(a,p,use)=>{if(slowT>0||!use(30))return;cd=40;slowT=300;fxWord(p.x,p.y-PH-10,'TACTICAL FOCUS',1.2,'#bfe3ff',true);snd('charge',p.x,p.y,{pitch:.6});}},
 // call in the X-Jet: a strafing run with cannons and bombs along the cursor
 {n:'Blackbird Strafe',fn:(a,p,use)=>{if(jets.length||!use(40))return;cd=90;const dir=mouse.wx>=p.x?1:-1,y=Math.max(camY+14,Math.min(mouse.wy-70,camY+VH-60));
   jets.push({x:dir>0?camX-70:camX+VW+70,y,dir,tx:mouse.wx,t:0});fxWord(p.x,p.y-PH-8,'BLACKBIRD, ENGAGE!',1,'#ffc93c',true);snd('jet',p.x,p.y-60);}},
);
ICE_POWERS.push(
 // an ice statue of Bobby that every enemy targets until it shatters into shrapnel
 {n:'Ice Decoy',fn:(a,p,use)=>{if(decoy||!use(25))return;cd=40;const x=Math.max(8,Math.min(W-8,mouse.wx|0)),y=surfaceY(x,Math.max(2,mouse.wy-30),220);if(y>=H-6)return;
   decoy={x,y,hp:150,max:150,life:540,face:x<p.x?1:-1};fxWord(x,y-SH-6,'DECOY!',1,'#bfe3ff',true);snd('freeze',x,y);
   for(let k=0;k<40;k++)spawn(x+(R()-.5)*8,y-R()*SH,(R()-.5)*2,-R()*2,R()<.5?rgb(230,250,255):rgb(150,210,250),18,0,1,0,1);for(let k=0;k<9;k++)iceAt(x-4+k,y);}},
 // grow icicles under the nearest ceiling (or out of a frost cloud), then drop them as falling ice
 {n:'Icicle Drop',fn:(a,p,use)=>{if(!use(26))return;cd=45;const cx=mouse.wx|0,cy=mouse.wy|0,ics=[];
   for(let k=-3;k<=3;k++){const x=cx+k*8;if(x<3||x>=W-3)continue;let top=-1;for(let d=0;d<140;d++){const Y=cy-d;if(Y<2)break;const m=t[Y*W+x];if(m&&KIND[m]===S){top=Y+1;break;}}
     if(top<0)top=Math.max(3,(camY|0)+4);const h=8+R()*7|0,cells=[];
     for(let yy=0;yy<h;yy++){const w=Math.round((1-yy/h)*1.8);for(let xx=-w;xx<=w;xx++){const X=x+xx,Y=top+yy;if(Y>=H-44)continue;const i=Y*W+X;if(t[i]!==0&&KIND[t[i]]!==G)continue;setc(i,ICE);const v=R()*30|0;col[i]=rgb(170+v,225+v/3,255);pin[i]=3;cells.push(i);}}
     if(cells.length)ics.push(cells);}
   fxWord(cx,cy-30,'KRIK-KRIK...',1,'#bfe3ff',true);let k=0;
   ACT.push(()=>{k++;if(k%6===0)for(const c of ics){const i=c[R()*c.length|0];spawn(i%W,(i/W)|0,(R()-.5),R(),rgb(220,245,255),12,0,1,1);}
     if(k<26)return true;
     for(const c of ics){let n=0;for(const i of c)if(t[i]===ICE){pin[i]=0;q[n++]=i;}const b=makeBody(q,n,false);if(b){b.vy=1.5;b.icicle=true;}}
     snd('ice',cx,cy-30);fxWord(cx,cy-20,'SHRAKK!',1.1,'#bfe3ff',true);return false;});}},
);
JEAN_POWERS.push(
 // take over an enemy's mind: for ten seconds it fights for you, then the link snaps
 {n:'Puppet Master',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,50);if(!e||e.def.title||e.ally>0){if(frame-(p.denyT||-99)>20){p.denyT=frame;fxWord(mouse.wx,mouse.wy-10,e&&e.def.title?'TOO STRONG':'NO MIND HERE',.8,'#ff9ad8',true);snd('deny',p.x,p.y);}return;}
   if(!use(35))return;cd=60;e.ally=600;e.frozen=0;fxWord(e.x,e.y-e.def.h/2-8,'MINE NOW.',1.2,'#ff9ad8',true);snd('psi',e.x,e.y,{pitch:.7});
   const h=hand();for(let k=0;k<3;k++)beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2+(R()-.5)*20,(h.y+e.y)/2+(R()-.5)*20],[e.x,e.y]],life:8,c:[255,180,235],g:[255,80,190]});rings.push({x:e.x,y:e.y,r:e.def.w,vr:-1,life:16,c:[255,120,210]});}},
 // a bubble where time stops: falling sand, water, fire, debris, shots and enemies all hang frozen
 {n:'Stasis Field',fn:(a,p,use)=>{if(stasis||!use(40))return;cd=70;stasis={x:mouse.wx,y:mouse.wy,r:50,life:330,max:330};fxWord(mouse.wx,mouse.wy-56,'STASIS.',1.3,'#ff9ad8',true);rings.push({x:mouse.wx,y:mouse.wy,r:4,vr:4,life:12,c:[255,150,230]});}},
);
STORM_POWERS.push(
 // a column of air slams straight down: flyers are driven into the ground, fire and smoke blown out
 {n:'Downburst',fn:(a,p,use)=>{if(!use(30))return;cd=50;const cx=mouse.wx,w=42;let k=0;fxWord(cx,camY+40,'FWOOOOMP!',1.3,'#d8e4ff',true);
   ACT.push(()=>{k++;const top=camY-10,gy=surfaceY(cx,camY,VH+80);
     for(let n=0;n<12;n++)spawn(cx+(R()-.5)*w*2,top+R()*(gy-top),(R()-.5)*.3,6+R()*3,R()<.6?rgb(220,230,245):rgb(180,195,220),10,0,0,0);
     for(let n=0;n<np;n++)if(Math.abs(px[n]-cx)<w&&py[n]<gy&&py[n]>top)pvy[n]+=.9;
     for(let n=0;n<220;n++){const X=cx+(R()-.5)*w*2|0,Y=top+R()*(gy-top+4)|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;
       if(KIND[m]===G||KIND[m]===F){t[i]=0;wake(i);}else if((KIND[m]===P||KIND[m]===L)&&R()<.3){spawn(X,Y,(R()-.5)*.6,4+R()*2,col[i],60,m,0);t[i]=0;wake(i);}}
     for(const e of enemies){if(e.grabbed||Math.abs(e.x-cx)>w+e.def.w/2||e.y>gy)continue;e.vy+=e.def.title?.3:1.3;e.vx*=.9;e.thrownT=Math.max(e.thrownT||0,4);hitEnemy(e,.25,0,0);}
     for(const b of bodies){if(b.held||Math.abs(b.x-cx)>w+b.rmax)continue;b.vy+=.7;b.rest=0;}
     if(k%6===0){for(let n=0;n<16;n++){const d=R()<.5?-1:1;spawn(cx+d*R()*w,gy-1,d*(2+R()*3),-R()*1.2,rgb(170,160,140),24,0,0,0,1);}shake=Math.max(shake,3);}
     sndLoop('downburst','wind',cx,(top+gy)/2,{v:1});return k<120;});}},
 // a dome of scorching air: dries water to steam, melts ice and snow, sets anything dry alight
 {n:'Heat Wave',fn:(a,p,use)=>{if(!use(35))return;cd=60;const cx=mouse.wx,cy=mouse.wy,r=72;let k=0;heatZ={x:cx,y:cy,r,life:260};fxWord(cx,cy-r-6,'SCORCHER!',1.3,'#ffb340',true);snd('fireburst',cx,cy);
   ACT.push(()=>{k++;for(let n=0;n<280;n++){const an=R()*6.283,d=Math.sqrt(R())*r,X=cx+Math.cos(an)*d|0,Y=cy+Math.sin(an)*d|0;if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];
       if(m===WATER){if(R()<.06)setc(i,STEAM);}else if(m===ICE||m===SNOW){if(R()<.18)setc(i,WATER);}else if(FLAM[m]>0&&R()<.015)ignite(i);else if(m===SAND&&R()<.0008)setc(i,GLASS);}
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r+e.def.w/2){hitEnemy(e,.4,0,0);if(e.frozen&&!e.emp)e.frozen=0;if(frame%5===0)spawn(e.x,e.y-e.def.h/2,(R()-.5),-1,rgb(255,150,60),14,0,1,0,1);}
     for(let n=0;n<5;n++){const an=R()*6.283,d=Math.sqrt(R())*r;spawn(cx+Math.cos(an)*d,cy+Math.sin(an)*d,(R()-.5)*.2,-.4-R()*.5,R()<.5?rgb(255,160,70):rgb(255,110,40),24,0,1,0,1);}
     if(k%3===0)flash(cx,cy,r*1.1,[255,110,30],3);if(heatZ)heatZ.life=260-k;
     if(k>=260){heatZ=null;return false;}return true;});}},
);
// ---- updaters for the new powers
function updPins(){for(let n=pins.length-1;n>=0;n--){const P2=pins[n];P2.life--;
  if(P2.e&&(P2.e.hp<=0||!enemies.includes(P2.e)))P2.e=null;
  if(P2.e){const e=P2.e;e.frozen=Math.max(e.frozen||0,3);e.vx*=.5;P2.x=e.x;P2.y=e.y-e.def.h/2-1;hitEnemy(e,.45,0,0);if(frame%45===0)fxWord(e.x,e.y-e.def.h/2-14,'UNWORTHY!',.8,'#bfe3ff',true);}
  else{const gy=surfaceY(P2.x,P2.y-2,40);if(gy>P2.y+1)P2.y=Math.min(gy-1,P2.y+3);}
  if(frame%30===0){const o=nearestEnemy(P2.x,P2.y,70);if(o&&o!==P2.e){zap(P2.x,P2.y-4,o.x,o.y,[230,240,255],[120,170,255]);hitEnemy(o,8,(P2.x-o.x)*.03,(P2.y-o.y)*.03);snd('zap',o.x,o.y);}}
  if(R()<.3)spawn(P2.x+(R()-.5)*6,P2.y-2,(R()-.5)*.8,-R(),pickC(BLUE),10,0,1,0,1);
  if(P2.life<=0){flash(P2.x,P2.y,20,BLUE,4);shots.push({x:P2.x,y:P2.y-3,vx:0,vy:-4,type:'hammer',life:300,out:0,hitSet:new Set(),spin:0});pins.splice(n,1);}}}
function updTherm(){for(let n=therm.length-1;n>=0;n--){const b=therm[n];
  if(!b.stuck){b.vy+=.12;const st=Math.ceil(Math.hypot(b.vx,b.vy))||1;
    for(let k=0;k<st;k++){b.x+=b.vx/st;b.y+=b.vy/st;const X=b.x|0,Y=b.y|0;if(X<1||X>=W-1||Y<1||Y>=H-1){b.life=0;break;}const i=Y*W+X,m=t[i];
      if(m===WATER){setc(i,STEAM);b.life=0;break;}
      if(m&&(KIND[m]===S||KIND[m]===P)){b.stuck=true;b.x-=b.vx/st;b.y-=b.vy/st;b.life=110+R()*70|0;break;}
      const e=enemyAt(b.x,b.y,1);if(e){hitEnemy(e,7,0,0);b.life=0;for(let q2=0;q2<5;q2++)spawn(b.x,b.y,(R()-.5)*3,(R()-.5)*3,rgb(255,230,160),10,0,1,1);break;}}
    if(!b.stuck&&--b.life<=0){therm.splice(n,1);}continue;}
  // burning white-hot: melts steel into molten metal and sets everything else alight
  for(let k=0;k<3;k++){const X=b.x+(R()-.5)*4|0,Y=b.y+(R()-.5)*4|0;if(X<1||X>=W-1||Y<1||Y>=H-44)continue;const i=Y*W+X,m=t[i];if(!m)continue;
    if(m===STEEL){if(R()<.05){setc(i,LAVA);col[i]=rgb(255,200,140);}}
    else if(FLAM[m]>0){if(R()<.15)ignite(i);}
    else if((m===CONC||m===STONE||m===GLASS||m===ICE||m===SNOW)&&R()<.012)setc(i,m===ICE||m===SNOW?WATER:LAVA);
    else if(m===WATER&&R()<.3)setc(i,STEAM);}
  if(R()<.5)spawn(b.x,b.y,(R()-.5)*2.5,-R()*2.5,R()<.5?rgb(255,255,220):rgb(255,190,90),8+R()*10,0,1,1);
  if(R()<.04)spawn(b.x,b.y-1,(R()-.5)*.3,-.4,rgb(90,90,96),40,0,0,0);
  for(const e of enemies)if(Math.abs(e.x-b.x)<e.def.w/2+3&&Math.abs(e.y-b.y)<e.def.h/2+3)hitEnemy(e,.8,0,0);
  let near=false;for(let d=0;d<4&&!near;d++){const X=b.x+(d===0?1:d===1?-1:0)|0,Y=b.y+(d===2?1:d===3?-1:0)|0;if(X>=0&&X<W&&Y>=0&&Y<H){const m=t[Y*W+X];if(m&&(KIND[m]===S||KIND[m]===P||m===LAVA))near=true;}}
  if(!near){b.stuck=false;b.vx=0;b.vy=.5;b.life=60;} // what it clung to burned away: it drips
  else if(--b.life<=0)therm.splice(n,1);}}
const JET_SPR=["..........kk..........","........kkSSk.........","kk....kkSSggSSkkkkkk..","kSkkkkSSSSSSSSSSSSSSkk","kkSSSSSSSSSSSSSSSSSSSk","..kkkSSSSSSSSSSkkkkk..","......kkkkkkkk........"];
const JET_PAL={k:rgb(18,18,24),S:rgb(46,48,60),g:rgb(120,170,210)};
function updJets(){for(let n=jets.length-1;n>=0;n--){const j=jets[n];j.t++;j.x+=j.dir*5.5;const dx=(j.x-j.tx)*j.dir;
  if(dx>-150&&dx<150){if(j.t%5===0)shots.push({x:j.x,y:j.y+4,vx:j.dir*2,vy:1.5,type:'bomb',life:240,boom:11,fire:.3,grav:.15,ecol:[255,200,120]});
    if(j.t%3===0){const gx=j.x+j.dir*30+(R()-.5)*30|0,gy=surfaceY(gx,j.y+6,VH);beams.push({x0:j.x+j.dir*8,y0:j.y+3,x1:gx,y1:gy,life:2,w:0,c:[255,240,190],g:[255,180,80]});explode(gx,gy,3,{quiet:true,self:true,col:[255,200,120]});damageEnemies(gx,gy,8,10,0,-1);snd('pop',gx,gy,{v:.4,gap:.04});}}
  for(let k=0;k<3;k++)spawn(j.x-j.dir*12,j.y+2+(R()-.5)*2,-j.dir*(2+R()*2),(R()-.5)*.4,R()<.5?rgb(255,220,150):rgb(255,140,60),10,0,1,0,1);
  sndLoop('jet'+n,'wind',j.x,j.y,{v:.8});
  if(j.t>400||dx>220)jets.splice(n,1);}}
function updDecoy(){if(!decoy)return;const d=decoy;d.life--;if(frame%5===0)spawn(d.x+(R()-.5)*8,d.y-R()*SH,0,-.3,rgb(220,245,255),12,0,1,0,1);
  if(d.hp<=0||d.life<=0){const cx=d.x,cy=d.y-SH/2;fxWord(cx,cy-16,'SHATTER!',1.3,'#bfe3ff',true);snd('glass',cx,cy);
    for(let k=0;k<14;k++){const an=k/14*6.283;shots.push({x:cx,y:cy,vx:Math.cos(an)*5,vy:Math.sin(an)*5-1,type:'shard',life:50,col:[200,240,255],grav:.08,onHit:sh=>{for(let q2=0;q2<3;q2++)iceAt(sh.x+(R()-.5)*3,sh.y+(R()-.5)*3);damageEnemies(sh.x,sh.y,5,12,sh.vx*.3,sh.vy*.3);}});}
    damageEnemies(cx,cy,40,35,0,-2,true);for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<40)e.frozen=Math.max(e.frozen||0,120);decoy=null;}}
function inStasis(x,y){const s=stasis;return !!s&&(x-s.x)*(x-s.x)+(y-s.y)*(y-s.y)<s.r*s.r;}
function updStasis(){const s=stasis;if(!s)return;
  if(--s.life<=0){stasis=null;rings.push({x:s.x,y:s.y,r:s.r,vr:2,life:10,c:[255,150,230]});snd('psi',s.x,s.y,{pitch:1.4});
    for(let cy=Math.max(0,(s.y-s.r)>>5);cy<=Math.min(CHN-1,(s.y+s.r)>>5);cy++)for(let cx=Math.max(0,(s.x-s.r)>>5);cx<=Math.min(CW-1,(s.x+s.r)>>5);cx++)nxt[cy*CW+cx]=1;return;}
  const nc=(clock%255)+1,r=s.r|0; // pre-stamp the bubble so this tick's sim step skips it: sand, water and fire hang in place
  for(let y=-r;y<=r;y++){const Y=s.y+y|0;if(Y<0||Y>=H)continue;const hw=Math.sqrt(r*r-y*y)|0;for(let x=-hw;x<=hw;x++){const X=s.x+x|0;if(X<0||X>=W)continue;stamp[Y*W+X]=nc;}}}
function hurtTarget(e,d){if(AI_ALLY===e){if(AI_TE)hitEnemy(AI_TE,d*2,0,0);return;}if(SPAWN.peace)return;if(decoy){decoy.hp-=d;return;}hurt(d);}
const CHARS=[
 {id:'doom',name:'Doom',spr:SPR_DOOM,pal:PAL_DOOM,pw:7,ph:19,fly:true,fs:2.9,boost:2.1,run:1.8,jump:4.3,hp:300,armor:1,glow:[80,255,130],cape:null,thrust:()=>R()<.6?gcol():rgb(255,210,120),powers:DOOM_POWERS},
 {id:'hulk',name:'Hulk',spr:SPR_HULK,pal:PAL_HULK,pw:9,ph:23,fly:false,fs:2.6,boost:1,run:2.3,jump:6.2,hp:500,armor:.45,glow:GAMMA,cape:null,thrust:()=>pickC(GAMMA),powers:HULK_POWERS},
 {id:'thor',name:'Thor',spr:SPR_THOR,pal:PAL_THOR,pw:7,ph:19,fly:true,fs:3.2,boost:2.2,run:1.9,jump:4.6,hp:350,armor:.7,glow:BLUE,cape:null,thrust:()=>R()<.6?pickC(BLUE):rgb(255,255,255),powers:THOR_POWERS},
 {id:'iron',name:'Iron Man',spr:SPR_IRON,pal:PAL_IRON,pw:7,ph:19,fly:true,fs:3.4,boost:2.3,run:1.8,jump:4.3,hp:300,armor:.8,glow:CYAN,cape:null,thrust:()=>R()<.5?rgb(255,200,120):rgb(255,255,230),powers:IRON_POWERS},
 {id:'wolverine',name:'Wolverine',spr:SPR_WOLV,pal:PAL_WOLV,pw:7,ph:17,fly:false,fs:2.6,boost:1,run:2.4,jump:5.4,hp:420,armor:.6,glow:[255,220,80],cape:null,thrust:()=>pickC([255,220,80]),powers:WOLV_POWERS},
 {id:'cyclops',name:'Cyclops',spr:SPR_CYC,pal:PAL_CYC,pw:7,ph:19,fly:false,fs:2.6,boost:1,run:1.9,jump:4.7,hp:320,armor:.8,glow:[255,60,50],cape:null,thrust:()=>pickC([255,80,60]),powers:CYC_POWERS},
 {id:'iceman',name:'Iceman',spr:SPR_ICE,pal:PAL_ICE,pw:7,ph:19,fly:true,fs:3.0,boost:2.0,run:1.9,jump:4.6,hp:330,armor:.75,glow:[150,220,255],cape:null,thrust:()=>R()<.6?rgb(220,245,255):rgb(140,200,250),powers:ICE_POWERS},
 {id:'jean',name:'Jean Grey',spr:SPR_JEAN,pal:PAL_JEAN,pw:7,ph:19,fly:true,fs:3.0,boost:2.1,run:1.9,jump:4.6,hp:320,armor:.8,glow:[255,120,200],cape:null,thrust:()=>R()<.5?rgb(255,150,60):rgb(255,120,210),powers:JEAN_POWERS},
 {id:'storm',name:'Storm',spr:SPR_STORM,pal:PAL_STORM,pw:7,ph:19,fly:true,fs:3.2,boost:2.2,run:1.9,jump:4.6,hp:330,armor:.75,glow:[210,230,255],cape:null,thrust:()=>R()<.6?rgb(225,235,255):rgb(160,190,255),powers:STORM_POWERS},
];
CH=CHARS[0];
const HERO_UI={doom:'#2f8f4e',hulk:'#6aa84f',thor:'#3a6fd8',iron:'#c23a2b',wolverine:'#e8b21f',cyclops:'#1f3c8a',iceman:'#7cc8f0',jean:'#c42a3a',storm:'#2a2a33'};
const HERO_DARK=new Set(['hulk','wolverine','iceman']);
const MOVE_TAG={hulk:'GAMMA LEAPS',wolverine:'CLIMBS WALLS',cyclops:'OPTIC THRUST',iceman:'ICE SLIDES'};
function setChar(i){
  const p=pl_, prevH=PH, hpF=p.hp/CH.hp;
  CH=CHARS[(i+CHARS.length)%CHARS.length];p.hp=hpF*CH.hp;SPR=CH.spr;SPC=CH.pal;SW=SPR[0].length;SH=SPR.length;PW=CH.pw;PH=CH.ph;
  if(!CH.fly)p.fly=false;
  if(held){held.held=false;held=null;}
  Object.assign(p,{script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,sprint:0,ang:0});
  cur=0;cd=0;buildPowerBar();
  if(boxHit(p.x,p.y))punchOut(p);
  rings.push({x:p.x,y:p.y-PH/2,r:2,vr:2.5,life:16,c:CH.glow},{x:p.x,y:p.y-PH/2,r:12,vr:-.6,life:16,c:CH.glow});flash(p.x,p.y-PH/2,40,CH.glow,10);
  for(let k=0;k<40;k++){const a=R()*6.283;spawn(p.x,p.y-PH/2,Math.cos(a)*2,Math.sin(a)*2,CH.thrust(),20,0,1,0,1);}
  const sel=document.getElementById('char');if(sel)sel.value=CH.id;
  const bd=document.getElementById('badge');if(bd){bd.textContent=CH.name[0];bd.style.background=HERO_UI[CH.id]||'#2f8f4e';document.getElementById('hero').textContent=CH.name.toUpperCase();}
}
function cast(){
  const p=pl_;if(cd>0||p.script>0)return;const pw=CH.powers[cur];if(!pw||pw.tk)return;const a=aim();if(!p.fly||Math.abs(p.vx)<.5)p.face=a.dx<0?-1:1;
  if(p.stealth>0&&pw.n!=='Stealth Mode'&&pw.n!=='Energy Shield'){p.stealth=0;fxWord(p.x,p.y-PH-6,'DECLOAK',.7,'#bfe3ff',true);}
  let denied=false;const use=c=>{if(p.en<c){denied=true;return false;}p.en-=c;return true;};
  const c0=cd;pw.fn(a,p,use);p.castF=12;if(cd>c0)p.recoilF=6;
  if(denied&&frame-(p.denyT||-99)>20){p.denyT=frame;snd('deny',p.x,p.y,{v:.6});const d=pwDiv.children[cur];if(d){d.classList.remove('deny');void d.offsetWidth;d.classList.add('deny');}}
  if(cd>c0)cdMax=cd;
}
function beam(a){beamCore(a,{pow:48,rad:1,len:420,w:2+((frame>>1)&1),c:[230,255,235],g:[90,255,130],spark:()=>R()<.5?gcol():rgb(230,255,230),dmg:3});}
function beamCore(a,o){
  if(frame%26===0)fxWord(a.h.x+a.dx*34,a.h.y+a.dy*34-6,R()<.5?'ZZZAP!':'FZZZT!',.8,`rgb(${o.g[0]},${o.g[1]},${o.g[2]})`,true);
  let x=a.h.x,y=a.h.y,pow=o.pow;const x0=x,y0=y,rad=o.rad;
  for(let s=0;s<o.len&&pow>0;s++){
    x+=a.dx;y+=a.dy;if(x<0||x>=W||y<0||y>=H)break;
    for(let oy=-rad;oy<=rad;oy++)for(let ox=-rad;ox<=rad;ox++){
      const X=x+ox|0,Y=y+oy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(m===0||KIND[m]===G)continue;
      pow-=.4+HARD[m]*.35;
      if(R()<.3)spawn(X,Y,(R()-.5)*1.8-a.dx,-R()*1.8-a.dy,o.spark(),15+R()*25,0,1,0,1);
      if(m===PROPANE)booms.push([X,Y,6]);
      setc(i,!o.noAsh&&R()<.06?ASH:EMPTY);
    }
  }
  for(let k=0;k<=12;k++)bgHit(x0+(x-x0)*k/12,y0+(y-y0)*k/12,rad+1);
  damageLine(x0,y0,x,y,rad+3,o.dmg||2);
  beams.push({x0,y0,x1:x,y1:y,life:1,w:o.w,c:o.c,g:o.g});
  sndLoop('beam'+(o.g[0]>>6)+(o.g[1]>>6)+(o.g[2]>>6),'beam',x0,y0,{pitch:.75+o.g[0]/255*.55+o.g[2]/255*.25,v:Math.min(1,.5+o.pow/400)});
  flash(x,y,12,o.g,2); flash(x0,y0,8,o.g,2);
  shake=Math.max(shake,1.8);
}
let shieldOn=false, shieldC=[[170,255,190],[80,220,120],[60,255,100]], senseT=0;
function shield(){
  const cx=pl_.x,cy=pl_.y-8,r=17;
  for(let y=-r-1;y<=r+1;y++)for(let x=-r-1;x<=r+1;x++){const d2=x*x+y*y;if(d2>(r+1)*(r+1))continue;const X=cx+x|0,Y=cy+y|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(m===0||KIND[m]===S)continue;
    if(KIND[m]===F||KIND[m]===G||m===LAVA||m===ACID){setc(i,EMPTY);if(R()<.2)spawn(X,Y,0,-.5,gcol(),8,0,1,0);continue;}
    if(d2<r*r){const d=Math.sqrt(d2)||1;spawn(X,Y,x/d*2.5,y/d*2.5-1,col[i],60,m,0);t[i]=0;wake(i);}
  }
  for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+b.rmax){b.vx+=dx/d*.8;b.vy+=dy/d*.8;}}
  for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r+2){spawn(s.x,s.y,0,0,glowRGB(),10,0,1,0);shots.splice(n,1);}}
  shieldOn=true;
}
function quake(x,y,o={}){
  fxWord(x,y-18,'WHUDOOM!',1.5,'#ffc93c',true);snd('slam',x,y,{size:(o.r||36)/30});fxBurst(x,y,60,o.col?`rgb(${o.col[0]},${o.col[1]},${o.col[2]})`:'#8dffb0');hitstop=Math.max(hitstop,4);fxImpact(x,y,4);
  const r=o.r||36, gc=o.col||[120,255,160], green=!o.col;shake=22;
  for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const d=Math.hypot(xx,yy);if(d>r)continue;const X=x+xx|0,Y=y+yy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
    if(KIND[m]===S&&m!==STEEL&&R()<(1-d/r)*.9/(1+HARD[m]*.15)){if(R()<.25&&Y<=y+3){spawn(X,Y,xx*.07+(R()-.5),-2-R()*3.5*(1-d/r),col[i],90,RUBBLE,0);t[i]=0;}else t[i]=RUBBLE;markDirty(i);wake(i);}
    else if((KIND[m]===P||KIND[m]===L)&&R()<.35*(1-d/r)){spawn(X,Y,(R()-.5)*2,-2-R()*3.5,col[i],80,m,0);t[i]=0;wake(i);}
  }
  explode(x,y+2,7,{fire:.15,green,col:o.col,self:true});
  damageEnemies(x,y,r*1.3,45,0,-4);
  for(let k=0;k<3;k++)rings.push({x,y,r:4+k*4,vr:2.4+k*.6,life:18+k*3,c:gc});
  for(let k=0;k<120;k++){const a=Math.PI+R()*Math.PI;spawn(x,y,Math.cos(a)*5,Math.sin(a)*3.5,green?gcol():pickC(gc),20+R()*25,0,1,1);}
  if(o.bolts)for(let k=0;k<6;k++)lightningStrike(x+(R()-.5)*120,y,6);
  flash(x,y,70,gc,12);
}
function lightning(a,o={}){
  if(frame%22===0)fxWord(a.h.x+a.dx*40,a.h.y+a.dy*40,'ZZRAK!',.8,o.c?'#bfe3ff':'#8dffb0',true);
  const C=o.c||[230,255,240],Gc=o.g||[120,255,170],Fc=o.f||[160,255,190],spark=o.spark||(()=>R()<.5?rgb(230,255,240):gcol()),green=!o.c;
  // jagged arc toward cursor; stops at first solid; forks
  const pts=[[a.h.x,a.h.y]];let x=a.h.x,y=a.h.y;const len=Math.min(260,a.d);let hitX=-1,hitY=-1;
  for(let s=0;s<len;s+=6){
    x+=a.dx*6+(R()-.5)*6;y+=a.dy*6+(R()-.5)*6;pts.push([x,y]);
    const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){hitX=X;hitY=Y;break;}
    if(enemyAt(x,y,3)){hitX=X;hitY=Y;break;}
  }
  beams.push({pts,life:2,c:C,g:Gc});sndLoop('arc','arc',a.h.x,a.h.y);
  for(let k=1;k<pts.length;k++)damageEnemies(pts[k][0],pts[k][1],5,.8,0,0);
  for(let f=0;f<3;f++){const st=pts[(R()*pts.length)|0];const fp=[st];let fx=st[0],fy=st[1];const ang=Math.atan2(a.dy,a.dx)+(R()-.5)*2.2;for(let k=0;k<5;k++){fx+=Math.cos(ang)*5+(R()-.5)*5;fy+=Math.sin(ang)*5+(R()-.5)*5;fp.push([fx,fy]);}beams.push({pts:fp,life:2,c:Fc,g:Gc});
    const ex=fx|0,ey=fy|0;if(ex>=0&&ex<W&&ey>=0&&ey<H){const m=t[ey*W+ex];if(FLAM[m]>0)ignite(ey*W+ex);}}
  const ex=hitX>=0?hitX:x|0,ey=hitX>=0?hitY:y|0;
  if(frame%4===0)explode(ex,ey,4,{fire:.3,green,col:o.c?Gc:null,quiet:true});
  for(let k=0;k<6;k++)spawn(ex,ey,(R()-.5)*4,(R()-.5)*4-1,spark(),10+R()*10,0,1,1);
  flash(ex,ey,22,Gc,2);flash(a.h.x,a.h.y,12,Gc,2);
  shake=Math.max(shake,2);
}
function lightningStrike(x,ty,r){
  snd('thunder',x,ty,{gap:.12,v:Math.min(1,.5+r/16)});
  fxWord(x,ty-24,'KRAKKA-THOOM!',1.3,'#bfe3ff',true);hitstop=Math.max(hitstop,2);fxImpact(x,ty,3);
  // bolt from the sky to the first solid thing under x
  x=Math.max(2,Math.min(W-3,x|0));let y=Math.max(0,camY-10|0);
  for(;y<H-1;y++){const m=t[y*W+x];if(m&&KIND[m]!==G&&KIND[m]!==F)break;if(enemyAt(x,y,4))break;}
  const pts=[[x+(R()-.5)*30,camY-10]];let cx=pts[0][0],cy=pts[0][1];
  while(cy<y){cy+=8+R()*6;cx+=(x-cx)*.3+(R()-.5)*10;pts.push([cx,Math.min(cy,y)]);}
  beams.push({pts,life:4,c:[245,250,255],g:[130,180,255]});
  for(let f=0;f<2;f++){const st=pts[(R()*pts.length)|0];const fp=[st];let fx=st[0],fy=st[1];for(let k=0;k<4;k++){fx+=(R()-.5)*14;fy+=6+R()*4;fp.push([fx,fy]);}beams.push({pts:fp,life:3,c:[200,220,255],g:[90,140,255]});}
  explode(x,y,r,{fire:.25,col:BLUE});
  damageEnemies(x,y,r*2,30,0,-2);
  flash(x,y,r*5,[150,190,255],8);flash(x,camY+VH/2,200,[60,80,130],4);
  shake=Math.min(24,shake+r*.6);
}
function thunderclap(a){
  fxWord(a.h.x+a.dx*30,a.h.y-10,'CLAP!!',1.5,'#ffc93c',true);fxBurst(a.h.x+a.dx*20,a.h.y+a.dy*20,50,'#bff07a');hitstop=Math.max(hitstop,3);
  const cx=a.h.x,cy=a.h.y,R0=85,ang=Math.atan2(a.dy,a.dx);
  for(let n=0;n<6000;n++){const d=Math.sqrt(R())*R0,t2=ang+(R()-.5)*1.15,X=cx+Math.cos(t2)*d|0,Y=cy+Math.sin(t2)*d|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;const f=1-d/R0;
    const vx=Math.cos(t2)*6*f,vy=Math.sin(t2)*6*f-1;
    if(KIND[m]===S){if(m!==STEEL&&R()<f*.6/(1+HARD[m]*.3)){if(R()<.5){spawn(X,Y,vx,vy,col[i],90,RUBBLE,0);t[i]=0;}else t[i]=RUBBLE;markDirty(i);wake(i);}}
    else if(KIND[m]===P||KIND[m]===L){if(R()<f+.2){spawn(X,Y,vx*1.2,vy*1.2,col[i],80,m,0);t[i]=0;wake(i);}}
    else{t[i]=0;wake(i);}}
  for(let k=0;k<4;k++)bgHit(cx+a.dx*k*18,cy+a.dy*k*18,10);
  damageCone(cx,cy,a.dx,a.dy,R0,40,8);
  for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<R0+b.rmax&&(dx*a.dx+dy*a.dy)/d>.5){b.vx+=a.dx*8;b.vy+=a.dy*8-2;b.thrown=true;}}
  for(let k=0;k<4;k++)rings.push({x:cx+a.dx*k*10,y:cy+a.dy*k*10,r:4+k*3,vr:3,life:12,c:[230,255,220]});
  for(let k=0;k<120;k++){const t2=ang+(R()-.5)*1.1,s=3+R()*6;spawn(cx,cy,Math.cos(t2)*s,Math.sin(t2)*s,R()<.5?rgb(230,240,220):rgb(170,160,140),20+R()*20,0,0,0,1);}
  flash(cx,cy,70,[220,255,200],10);shake=Math.min(24,shake+14);
}
function updStorm(){
  if(!storm)return;const s=storm;
  if(--s.life<=0){storm=null;return;}
  if(R()<.07)lightningStrike(s.x+(R()-.5)*220,0,6+R()*6|0);
  for(let k=0;k<5;k++)spawn(s.x+(R()-.5)*300,camY-4,(R()-.5)*.3,3+R()*1.5,rgb(130,160,230),160,R()<.4?WATER:0,0,1);
}
function nova(){
  fxWord(pl_.x,pl_.y-34,'VWOOOM!',1.3,'#8dffb0',true);fxBurst(pl_.x,pl_.y-8,70,'#8dffb0');fxImpact(pl_.x,pl_.y-8,3);
  const p=pl_;rings.push({x:p.x,y:p.y-8,r:4,vr:4,life:12,c:[200,255,220]},{x:p.x,y:p.y-8,r:2,vr:3,life:15,c:[60,255,110]});
  flash(p.x,p.y-8,80,[80,255,130],10);shake=Math.min(22,shake+12);
  const cx=p.x,cy=p.y-8,r=44; bgHit(cx,cy,30);
  for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const d=Math.hypot(xx,yy);if(d>r||d<10)continue;const X=cx+xx|0,Y=cy+yy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m)continue;
    const f=1-d/r;
    if(KIND[m]===S){if(m!==STEEL&&R()<f*.8/(1+HARD[m]*.3)){if(R()<.5){spawn(X,Y,xx/d*5*f+R()-.5,yy/d*5*f-1,col[i],90,RUBBLE,0);t[i]=0;}else t[i]=RUBBLE;markDirty(i);wake(i);}}
    else if(KIND[m]===P||KIND[m]===L){if(R()<f+.2){spawn(X,Y,xx/d*6*f,yy/d*6*f-1,col[i],80,m,0);t[i]=0;wake(i);}}
    else{t[i]=0;wake(i);}
  }
  damageEnemies(cx,cy,r*1.3,40,0,0,true);
  for(let k=0;k<160;k++){const a=R()*6.283;spawn(cx,cy,Math.cos(a)*(4+R()*3),Math.sin(a)*(4+R()*3),gcol(),18+R()*15,0,1,0,1);}
  for(const b of bodies){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1;if(d<r*2){b.vx+=dx/d*6;b.vy+=dy/d*6-2;}}
}
// a chunk already in flight near the grab point
function grabBody(cx,cy,r){let best=null,bd=1e9;
  for(const b of bodies){if(b.held||Math.hypot(b.x-cx,b.y-cy)>b.rmax+r)continue;
    for(let k=0;k<24;k++){const a=k/24*6.283,d=(k&3)/3*r,X=cx+Math.cos(a)*d,Y=cy+Math.sin(a)*d;if(bodyAt(b,X,Y)){const dd=Math.hypot(b.x-cx,b.y-cy);if(dd<bd){bd=dd;best=b;}break;}}}
  return best;}
// the whole connected structure under the grab point (a building, a tree, a car...), unless it is the landscape itself
const GRABCAP=30000;
function grabRegion(cx,cy,r){
  let s=-1,sd=1e9;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const X=cx+x,Y=cy+y,d=x*x+y*y;if(d>r*r||X<0||X>=W||Y<0||Y>=H-1)continue;const m=t[Y*W+X];if(KIND[m]===S&&!gnd[Y*W+X]&&d<sd){sd=d;s=Y*W+X;}}
  if(s<0)return 0;
  // the street / deck it stands on stays behind: first row below that runs wider than any building
  const sx0=s%W;let gl=H;
  for(let y=(s/W)|0;y<H;y++){const m=t[y*W+sx0];if(KIND[m]!==S)continue;if(NAT[m]){gl=y;break;}
    let a=sx0,b=sx0;while(a>0&&BLDS(t[y*W+a-1])&&sx0-a<220)a--;while(b<W-1&&BLDS(t[y*W+b+1])&&b-sx0<220)b++;if(b-a>200){gl=y;break;}}
  if(((s/W)|0)>=gl)return 0;
  const id=++vgen;let h=0,n=0;q[n++]=s;vis[s]=id;
  while(h<n){const i=q[h++],x=i%W;if(n>GRABCAP)return 0;
    for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,i-W,i+W]){if(j<0||j>=N||vis[j]===id||((j/W)|0)>=gl)continue;const m=t[j];if(KIND[m]!==S||gnd[j])continue;vis[j]=id;q[n++]=j;}}
  for(let k=0;k<n;k++)markDirty(q[k]);
  return n;
}
// clear whatever world pixels a carried load overlaps (so it never starts a throw stuck inside terrain)
function smashOverlap(b){const c=Math.cos(b.a),s2=Math.sin(b.a);
  for(let k=0;k<b.ex.length;k++){const X=Math.round(b.x+b.ex[k]*c-b.ey[k]*s2),Y=Math.round(b.y+b.ex[k]*s2+b.ey[k]*c);if(X<0||X>=W||Y<0||Y>=H-40)continue;
    for(const i of [Y*W+X,Y*W+X+1,(Y+1)*W+X]){const m=t[i];if(KIND[m]===S||KIND[m]===P){if(np<MP-300&&R()<.5)spawn(i%W,(i/W)|0,(R()-.5)*2,-R()*1.5,col[i],70,KIND[m]===S?RUBBLE:m,0);setc(i,EMPTY);}}}}
function updTelekinesis(){
  const pw=CH.powers[cur], tk=pw&&pw.tk, want=mouse.down&&!!tk;
  if(want&&!tkPrev&&!held&&!heldE&&pl_.en>=15){
    // rip a chunk out of the world at the cursor (or within arm's reach)
    let cx=mouse.wx|0,cy=mouse.wy|0;
    if(tk.range){const a=aim(),d=Math.min(a.d,tk.range);cx=a.h.x+a.dx*d|0;cy=a.h.y+a.dy*d|0;}
    const r=tk.r;let n=0;
    // an enemy under the grab point gets lifted first (bosses are too heavy)
    let ge=null,gd=r+8;for(const e of enemies){if(e.def.title||e.hp<=0)continue;const d=Math.hypot(e.x-cx,e.y-cy)-e.def.w/2;if(d<gd){gd=d;ge=e;}}
    const fb=ge?null:grabBody(cx,cy,r);
    snd('rip',cx,cy,{v:.7});
    if(ge){heldE=ge;ge.grabbed=true;pl_.en-=15;rings.push({x:ge.x,y:ge.y,r:ge.def.w,vr:-1,life:12,c:CH.glow});fxWord(ge.x,ge.y-ge.def.h/2-6,'GOTCHA!',1,'#ff9ad8',true);}
    else if(fb){fb.held=true;fb.thrown=false;fb.topple=0;held=fb;pl_.en-=15;held.vy=-2;held.tk=tk;held.overhead=!!tk.overhead;held.lift=0;rings.push({x:fb.x,y:fb.y,r:fb.rmax,vr:-1,life:14,c:CH.glow});shake+=4;}
    else{
    n=grabRegion(cx,cy,r);
    if(!n)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r*(0.75+R()*.3))continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(m&&(KIND[m]===S||KIND[m]===P)){q[n++]=i;markDirty(i);}}
    if(n>=12){pl_.en-=15;held=makeBody(q,n,true);if(held){held.vy=-2;held.tk=tk;held.overhead=!!tk.overhead;held.lift=0;if(held.overhead){fxWord(cx,cy-10,'RRRIIP!',1.2,'#bff07a',true);pl_.landF=8;}rings.push({x:cx,y:cy,r:r,vr:-.6,life:14,c:CH.glow});shake+=4;for(let k=0;k<40;k++){const a=R()*6.283;spawn(cx+Math.cos(a)*r,cy+Math.sin(a)*r,(R()-.5)*2,-R()*2,rgb(140,130,120),30,0,0,1);}}}}
  }
  if(held){
    const b=held,t2=b.tk||tk||{};
    if(!bodies.includes(b))held=null;
    else if(!want||pl_.en<=0){
      b.held=false;b.thrown=true;b.tx=b.ty=undefined;snd('throw',b.x,b.y);
      if(b.overhead){ // heave it from above the head; never back through Hulk himself
        const a=aim();let dx=a.dx,dy=a.dy;if(Math.abs(dx)<.35){dx=(dx<0?-1:dx>0?1:pl_.face)*.35;const d=Math.hypot(dx,dy);dx/=d;dy/=d;}
        pl_.face=dx<0?-1:1;const v=4+9*Math.min(1,Math.sqrt(300/b.n));smashOverlap(b);
        b.vx=dx*v+pl_.vx*.5;b.vy=dy*v-1.8;b.va=pl_.face*.05;b.safeP=frame+40;b.overhead=false;
        if(dy>.2)b.x+=pl_.face*(b.lw/2+PW);
        pl_.throwF=10;pl_.vx+=pl_.face*1.2;shake+=6;fxWord(b.x,b.y-b.rmax,'HRRAAGH!',1.3,'#bff07a',true);
      }
      else if(t2.throwMul){b.vx*=t2.throwMul;b.vy*=t2.throwMul;}
      else{const a=aim();b.vx=a.dx*10;b.vy=a.dy*10-1.5;b.va=(R()-.5)*.1;shake+=4;}
      held=null;
    }
    else {pl_.en-=.2;
      if(b.overhead){ // resting on Hulk's raised hands: bottom of the load sits just above his fists
        const tx=pl_.x+(b.cx-b.lw/2),ty=pl_.y-SH-5-(b.lh-b.cy);b.lift=Math.min(1,b.lift+.09);
        const k=b.lift<1?.3:1;b.x+=(tx-b.x)*k;b.y+=(ty-b.y)*k;b.vx=pl_.vx;b.vy=pl_.vy;b.a*=.75;b.va=0;
        smashOverlap(b); // ceilings and trees in the way get smashed, never clipped
      }
      else if(t2.overhead){b.tx=pl_.x;b.ty=pl_.y-PH-b.rmax*.6-4;}else{b.tx=mouse.wx;b.ty=mouse.wy;}
      if(!b.overhead)for(let k=0;k<6;k++){const j=R()*b.ex.length|0;spawn(b.x+b.ex[j],b.y+b.ey[j],(R()-.5)*.5,(R()-.5)*.5,CH.thrust(),10,0,1,0,1);} // telekinetic shimmer (Hulk just carries it)
      else if(frame%5===0){const j=R()*b.ex.length|0;spawn(b.x+b.ex[j],b.y+b.ey[j],(R()-.5)*.6,.5,rgb(150,140,125),14,0,0,1);} // grit trickling off the load
      if(t2.tether){const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+b.x)/2+(R()-.5)*8,(h.y+b.y)/2+(R()-.5)*8],[b.x,b.y]],life:1,c:[100,220,140],g:[40,160,80]});}}
  }
  if(heldE){
    const e=heldE,t2=tk||{};
    if(e.hp<=0||!enemies.includes(e)){e.grabbed=false;heldE=null;}
    else if(!want||pl_.en<=0){ // fling it: it wrecks whatever it hits, including other enemies
      e.grabbed=false;snd('throw',e.x,e.y);const a=aim();let dx=a.dx,dy=a.dy;if(t2.overhead&&Math.abs(dx)<.35){dx=(dx<0?-1:1)*.35;const d=Math.hypot(dx,dy);dx/=d;dy/=d;}
      const sp=t2.overhead?9:11;e.vx=dx*sp;e.vy=dy*sp-1.5;e.thrownT=70;if(t2.overhead)pl_.throwF=10;heldE=null;shake+=4;fxWord(e.x,e.y-e.def.h/2-6,'YOINK!',1,'#ff9ad8',true);}
    else{pl_.en-=.15;let tx=mouse.wx,ty=mouse.wy;if(t2.overhead){tx=pl_.x;ty=pl_.y-SH-5-e.def.h/2;}
      e.vx=(tx-e.x)*.25;e.vy=(ty-e.y)*.25;e.x+=e.vx;e.y+=e.vy;e.face=pl_.x>e.x?1:-1;hitEnemy(e,.12,0,0);
      for(let k=0;k<3;k++)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,(R()-.5)*.5,(R()-.5)*.5,CH.thrust(),10,0,1,0,1);
      if(t2.tether){const h=hand();beams.push({pts:[[h.x,h.y],[(h.x+e.x)/2+(R()-.5)*8,(h.y+e.y)/2+(R()-.5)*8],[e.x,e.y]],life:1,c:[255,170,230],g:[200,90,190]});}}
  }
  tkPrev=want;
}
function updShots(world=true){
  for(let n=shots.length-1;n>=0;n--){
    const s=shots[n];
    if(s.delay>0){s.delay--;const h=hand();s.x=h.x;s.y=h.y;continue;}
    if(stasis&&inStasis(s.x,s.y))continue; // frozen mid-flight
    if(!world&&s.owner==='enemy')continue; // Tactical Focus: enemy fire crawls
    if(s.type==='pin'){ // Mjolnir falling from the sky onto its mark
      if(s.target&&s.target.hp>0&&enemies.includes(s.target))s.x+=(s.target.x-s.x)*.25;let hit=false;
      for(let k=0;k<9;k++){s.y+=1;const X=s.x|0,Y=s.y|0;if(Y>=H-2){hit=true;break;}if(Y<0)continue;const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F&&KIND[m]!==L){hit=true;break;}const e=enemyAt(s.x,s.y,1);if(e){hit=e;break;}}
      spawn(s.x+(R()-.5)*3,s.y-4,(R()-.5)*.5,-1,pickC(BLUE),10,0,1,0,1);
      if(hit||--s.life<=0){const e=hit&&hit!==true?hit:null;explode(s.x|0,s.y|0,8,{col:BLUE,self:true,word:'THOOOOM!'});lightningStrike(s.x,s.y,6);if(e)hitEnemy(e,40,0,2);pins.push({x:s.x,y:s.y,life:360,e});shots.splice(n,1);}
      continue;}
    if(s.type==='axe'){ // Stormbreaker: a razor-thin cut through everything on its line
      s.spin+=.6;const st=Math.ceil(Math.hypot(s.vx,s.vy)),sp=Math.hypot(s.vx,s.vy)||1,nx=-s.vy/sp,ny=s.vx/sp;
      for(let k=0;k<st;k++){s.x+=s.vx/st;s.y+=s.vy/st;if(s.x<1||s.x>=W-1||s.y<1||s.y>=H-1){s.life=0;break;}
        for(let w=-1;w<=1;w++){const X=s.x+nx*w|0,Y=s.y+ny*w|0;if(X<0||X>=W||Y<0||Y>=H-42)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G||KIND[m]===F)continue;if(m===OBSID&&R()<.7)continue;
          if(np<MP-300&&R()<.25)spawn(X,Y,s.vx*.2+(R()-.5)*2,s.vy*.2-R()*2,KIND[m]===S&&R()<.5?rgb(200,220,255):col[i],40,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,KIND[m]===S?1:0);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}setc(i,EMPTY);}}
      for(const e of enemies){if(!s.hitSet.has(e)&&Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-s.y)<e.def.h/2+4){s.hitSet.add(e);hitEnemy(e,45,s.vx*.6,s.vy*.6);flash(s.x,s.y,16,BLUE,4);snd('slash',s.x,s.y);}}
      spawn(s.x,s.y,(R()-.5)*1.5,(R()-.5)*1.5,pickC(BLUE),10,0,1,0,1);
      if(--s.life<=0){explode(s.x|0,s.y|0,8,{col:BLUE,self:true});for(let q2=0;q2<3;q2++)zap(s.x,s.y,s.x+(R()-.5)*60,s.y+(R()-.5)*60,[230,240,255],[120,170,255]);shots.splice(n,1);}
      continue;}
    if(!s.snd){s.snd=1;const nm=SHOT_SND[s.type];if(nm)snd(nm,s.x,s.y,{v:s.owner==='enemy'?.5:.7});}
    if(s.type==='hammer')sndLoop('hammer','wind',s.x,s.y,{v:.7});
    if(s.type==='hammer'){ // Mjolnir: ploughs out, then flies home
      s.spin+=.5;
      if(s.out>0){s.out--;}else{const h=hand(),dx=h.x-s.x,dy=h.y-s.y,d=Math.hypot(dx,dy)||1;s.vx+=(dx/d*8-s.vx)*.18;s.vy+=(dy/d*8-s.vy)*.18;if(!s.back){s.back=true;s.hitSet.clear();}if(d<8){shots.splice(n,1);flash(h.x,h.y,10,BLUE,3);continue;}}
      const st=Math.ceil(Math.hypot(s.vx,s.vy));
      for(let k=0;k<st;k++){s.x+=s.vx/st;s.y+=s.vy/st;if(k%2===0)carve(s.x,s.y,3.2,s.vx,s.vy);}
      for(const e of enemies){if(!s.hitSet.has(e)&&Math.abs(e.x-s.x)<e.def.w/2+4&&Math.abs(e.y-s.y)<e.def.h/2+4){s.hitSet.add(e);hitEnemy(e,30,s.vx*.8,s.vy*.8);flash(s.x,s.y,16,BLUE,4);}}
      for(const b of bodies){if(!b.held&&Math.hypot(b.x-s.x,b.y-s.y)<b.rmax+3&&bodyAt(b,s.x,s.y)){b.vx+=s.vx*.6;b.vy+=s.vy*.6;b.thrown=true;}}
      spawn(s.x,s.y,(R()-.5)*.6,(R()-.5)*.6,pickC(BLUE),10,0,1,0,1);
      if(frame%5===0)shake=Math.max(shake,1.5);
      if(--s.life<=0)shots.splice(n,1);
      continue;
    }
    if(s.grav)s.vy+=s.grav;
    if(s.home){const e=nearestEnemy(s.x,s.y,220);if(e){const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy)||1;s.vx+=(dx/d*5-s.vx)*.12;s.vy+=(dy/d*5-s.vy)*.12;}}
    if(s.type==='missile'){
      s.wob+=.3;const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy)||1;if(s.life<205){s.vx=s.vx*.9+(dx/d+Math.sin(s.wob)*.3*dy/d)*.75;s.vy=s.vy*.9+(dy/d-Math.sin(s.wob)*.3*dx/d)*.75;}
      const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx*=5.5/sp;s.vy*=5.5/sp;}
      spawn(s.x,s.y,(R()-.5)*.4,(R()-.5)*.4-.1,rgb(120+R()*40,120+R()*40,125+R()*40),35+R()*20,0,0,0,1);
      spawn(s.x,s.y,-s.vx*.4+(R()-.5)*.5,-s.vy*.4+(R()-.5)*.5,rgb(255,170+R()*60,60),7,0,1,0);
    } else if(s.type==='bolt'){
      for(let k=0;k<2;k++){const a=frame*.6+k*3.14;spawn(s.x+Math.cos(a)*2,s.y+Math.sin(a)*2,-s.vx*.1+(R()-.5)*.4,-s.vy*.1+(R()-.5)*.4,gcol(),14,0,1,0,1);}
    } else if(s.col){spawn(s.x,s.y,-s.vx*.1+(R()-.5)*.4,-s.vy*.1+(R()-.5)*.4,pickC(s.col),10,0,1,0,1);}
    else if(s.type==='bomb'&&frame%3===0)spawn(s.x,s.y,0,0,rgb(255,120,60),6,0,1,0);
    let hit=false;const steps=Math.ceil(Math.hypot(s.vx,s.vy))||1;
    for(let k=0;k<steps;k++){s.x+=s.vx/steps;s.y+=s.vy/steps;
      if(s.x<0||s.x>=W||s.y>=H||s.y<-60){hit='out';break;}
      if(s.y>=0){const m=t[(s.y|0)*W+(s.x|0)];if(m!==0&&KIND[m]!==G&&KIND[m]!==F){hit=true;break;}}
      if(s.owner==='enemy'){const p=pl_;if(Math.abs(s.x-p.x)<=PW/2+1&&s.y>=p.y-PH&&s.y<=p.y){hurt(s.dmg);hit='player';break;}
        if(decoy&&Math.abs(s.x-decoy.x)<=4&&s.y>=decoy.y-SH&&s.y<=decoy.y){decoy.hp-=s.dmg||7;hit='player';break;}}
      else{
        if(s.type!=='missile')for(const b of bodies){if(b.held)continue;if(Math.abs(s.x-b.x)<b.rmax+1&&Math.abs(s.y-b.y)<b.rmax+1&&bodyAt(b,s.x,s.y)){hit=true;break;}}
        const he=enemyAt(s.x,s.y,1);if(he&&he!==s.src)hit=true;
      }
      if(hit)break;
    }
    if(--s.life<=0)hit=true;
    if(hit){
      if(hit==='player'){flash(s.x,s.y,10,s.col||[255,80,60],4);for(let k=0;k<8;k++)spawn(s.x,s.y,(R()-.5)*3,(R()-.5)*3,pickC(s.col||[255,80,60]),10,0,1,1);}
      else if(hit===true&&s.onHit)s.onHit(s);
      else if(hit===true)explode(s.x,s.y,s.boom||4,{fire:s.fire||0,green:s.green,col:s.ecol,enemy:s.owner==='enemy',dmg:s.dmg});
      shots.splice(n,1);
    }
  }
}
function updDrones(){
  for(let n=drones.length-1;n>=0;n--){
    const d=drones[n];d.ph+=.05;const tx=pl_.x+Math.cos(d.ph+n*2.1)*22,ty=pl_.y-28+Math.sin(d.ph*1.3+n)*7;
    d.x+=(tx-d.x)*.08;d.y+=(ty-d.y)*.08;
    spawn(d.x+(R()-.5)*3,d.y+2,(R()-.5)*.3,.8+R(),R()<.5?rgb(255,200,90):gcol(),6,0,1,0);
    if(--d.cool<=0){ // laser ray: nearest enemy if any, else the cursor
      const e=nearestEnemy(d.x,d.y,240);const gx=e?e.x:mouse.wx,gy=e?e.y:mouse.wy;
      const dx=gx-d.x,dy=gy-d.y,dd=Math.hypot(dx,dy)||1;let x=d.x,y=d.y;
      for(let s=0;s<300;s++){x+=dx/dd;y+=dy/dd;const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;const hitE=enemyAt(x,y,1);if(hitE){hitEnemy(hitE,12,dx/dd*2,dy/dd*2);break;}const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){explode(X,Y,4,{fire:.15,green:true});break;}}
      beams.push({x0:d.x,y0:d.y,x1:x,y1:y,life:4,w:1,c:[255,120,90],g:[255,60,40]});
      d.cool=26+R()*12|0;
    }
    if(--d.life<=0){explode(d.x,d.y,6,{fire:.2,green:true});drones.splice(n,1);}
  }
}
function updVortex(){
  const v=vortex;if(!v)return;if(--v.life<=0){explode(v.x,v.y,14,{fire:.3,green:true});rings.push({x:v.x,y:v.y,r:40,vr:-2.5,life:14,c:[120,255,160]});vortex=null;return;}
  const r=48;
  for(let n=0;n<1100;n++){
    const a=R()*6.283,d=Math.sqrt(R())*r,X=v.x+Math.cos(a)*d|0,Y=v.y+Math.sin(a)*d|0;
    if(X<1||X>=W-1||Y<1||Y>=H-1)continue;const i=Y*W+X,m=t[i];if(m===0)continue;
    if(d<4){if(R()<.5)spawn(X,Y,(R()-.5)*2,(R()-.5)*2,col[i],12,0,1,0);setc(i,EMPTY);continue;}
    if(KIND[m]===S){if(m!==STEEL&&R()<.05*(1-d/r)*(6/(1+HARD[m]))){if(R()<.4){spawn(X,Y,(v.x-X)*.05,(v.y-Y)*.05,col[i],90,RUBBLE,0,1);t[i]=0;}else t[i]=RUBBLE;markDirty(i);wake(i);}continue;}
    const ux=(v.x-X)/d,uy=(v.y-Y)/d,sx=ux-uy*.8,sy=uy+ux*.8;
    const nx=X+Math.round(sx),ny=Y+Math.round(sy),j=ny*W+nx;
    if(t[j]===0)swap(i,j);
  }
  for(let n=0;n<np;n++){const dx=v.x-px[n],dy=v.y-py[n],d=Math.hypot(dx,dy);if(d<r*1.6&&d>1){pvx[n]+=dx/d*.35-dy/d*.15;pvy[n]+=dy/d*.35+dx/d*.15;}}
  for(const b of bodies){if(b.held)continue;const dx=v.x-(b.x),dy=v.y-(b.y),d=Math.hypot(dx,dy)||1;if(d<r*2){b.vx+=dx/d*.6;b.vy+=dy/d*.6-.3;}}
  for(const e of enemies){const dx=v.x-e.x,dy=v.y-e.y,d=Math.hypot(dx,dy)||1;if(d<r*1.5){e.vx+=dx/d*.5;e.vy+=dy/d*.5;if(d<8)hitEnemy(e,1.5,0,0);}}
  const dx=v.x-pl_.x,dy=v.y-pl_.y+8,d=Math.hypot(dx,dy);if(d<r&&d>8){pl_.vx+=dx/d*.12;pl_.vy+=dy/d*.12;}
  for(let k=0;k<8;k++){const a=R()*6.283,rr=r*(.5+R()*.5);spawn(v.x+Math.cos(a)*rr,v.y+Math.sin(a)*rr,-Math.sin(a)*2,Math.cos(a)*2,gcol(),16,0,1,0);}
  shake=Math.max(shake,1.2);
}

function updStrikes(){
  for(let n=strikes.length-1;n>=0;n--){
    const s=strikes[n];
    if(s.t>0){s.t--;if(s.t===0){s.beam=36;flash(s.x,camY+VH/2,120,[120,255,160],10);shake=Math.min(24,shake+10);}continue;}
    if(s.beam>0){
      s.beam--;
      // carve a deep shaft, deepest at the end
      let y=0;for(;y<H;y++){const m=t[y*W+s.x];if(m&&KIND[m]!==G&&KIND[m]!==F)break;}
      const by=Math.min(H-1,y+4);
      bgHit(s.x,by,9);
      for(let yy=y-2;yy<by+3;yy++)for(let xx=-7;xx<=7;xx++){const X=s.x+xx,Y=yy;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(!m||KIND[m]===G)continue;if(m===STEEL&&R()<.5)continue;
        if(R()<.3)spawn(X,Y,(R()-.5)*6,-2-R()*5,R()<.4?gcol():col[i],60,KIND[m]===S?RUBBLE:0,0);if(m===PROPANE)booms.push([X,Y,7]);setc(i,R()<.15?GFIRE:EMPTY);}
      beams.push({x0:s.x,y0:-10,x1:s.x,y1:by,life:1,w:5+((frame>>1)&1)*2,c:[235,255,240],g:[90,255,140]});
      flash(s.x,by,30,[100,255,150],2);damageLine(s.x,camY-10,s.x,by,8,4);
      for(let k=0;k<4;k++)spawn(s.x+(R()-.5)*14,by,(R()-.5)*5,-R()*5,gcol(),20,0,1,1);
      shake=Math.max(shake,5);
      if(s.beam===0){explode(s.x,by,20,{fire:.3,green:true});strikes.splice(n,1);}
    }
  }
}
function updFx(){
  for(let n=rings.length-1;n>=0;n--){const r=rings[n];r.r+=r.vr;if(--r.life<=0||r.r<1)rings.splice(n,1);}
  for(let n=flashes.length-1;n>=0;n--)if(--flashes[n].life<=0)flashes.splice(n,1);
  for(let n=afters.length-1;n>=0;n--)if(--afters[n].life<=0)afters.splice(n,1);
  for(let n=beams.length-1;n>=0;n--)if(--beams[n].life<0)beams.splice(n,1);
  // chain-reaction explosions queued by the sim
  let k=0;while(booms.length&&k++<6){const [x,y,r]=booms.shift();explode(x,y,r,{fire:.5});}
  if(booms.length>40)booms.length=40;
}

// ================= enemies =================
// Framework. To add an enemy type, call defineEnemy(name, def) — nothing else needs touching:
//   sprite  array of equal-length strings, '.' transparent; pal maps chars to rgb(); chars in
//           def.glow (default '*') also glow
//   hp, w, h        health and hitbox (centre-based, pixels)
//   fly             true: hovers (no gravity); false: walks, falls, steps up 2px ledges
//   score, boom     points on kill, death-explosion radius
//   think(e)        AI, called every tick. e has x,y,vx,vy,hp,face,t (age), cd (free timer), mem ({})
//                   Helpers: seek(e,x,y,speed,accel), pdist(e), player(), enemyShoot(e,opts),
//                   enemyBeam(e,opts), los(e,x,y)
//   onDeath(e)      optional extra effects (default death explosion + scrap always happens)
// Waves come from WAVES(n) → [[type,count],...]. spawnEnemy(type,x,y) spawns one directly.
const ENEMY_TYPES={}, enemies=[], spawnQ=[];
let wave=0, kills=0, score=0;
function defineEnemy(name,def){ENEMY_TYPES[name]=Object.assign({name,hp:30,w:7,h:7,fly:true,score:10,boom:5,glow:'*',think:null,onDeath:null},def);}
function spawnEnemy(name,x,y){
  const d=ENEMY_TYPES[name];if(!d||enemies.length>=48)return null;
  const e={def:d,x,y,vx:0,vy:0,hp:d.hp,face:-1,t:0,cd:30+R()*60|0,flash:0,ground:false,mem:{}};
  enemies.push(e);for(let k=0;k<12;k++)spawn(x,y,(R()-.5)*2,(R()-.5)*2,rgb(255,90,70),12,0,1,0,1);return e;
}
// what enemy AI aims at: a puppet's chosen victim, Iceman's decoy, where a cloaked Iron Man was last seen, or the hero
const player=()=>AI_T||(decoy?{x:decoy.x,y:decoy.y-PH/2}:pl_.stealth>0&&pl_.lastSeen?pl_.lastSeen:{x:pl_.x,y:pl_.y-PH/2});
function pdist(e){const p=player();return Math.hypot(p.x-e.x,p.y-e.y);}
function seek(e,x,y,sp,acc=.1){const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;e.vx+=(dx/d*sp-e.vx)*acc;e.vy+=(dy/d*sp-e.vy)*acc;}
function los(e,x,y){const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;for(let s=e.def.w/2+1;s<d;s+=2){const X=e.x+dx/d*s|0,Y=e.y+dy/d*s|0;if(X<0||X>=W||Y<0||Y>=H)return false;const k=KIND[t[Y*W+X]];if(k===S||k===P)return false;}return true;}
function enemyShoot(e,o={}){
  if(SPAWN.peace&&AI_ALLY!==e)return;
  const ex=e.x+(o.ox||0),ey=e.y+(o.oy||0),p=player(),lead=o.lead||0,tx=p.x+pl_.vx*lead,ty=p.y+pl_.vy*lead,dx=tx-ex,dy=ty-ey,d=Math.hypot(dx,dy)||1,sp=o.speed||3.5,spr=o.spread||.06;
  const a=Math.atan2(dy,dx)+(R()-.5)*spr*2,off=o.ox!==undefined||o.oy!==undefined?3:null;
  shots.push({x:off?ex+Math.cos(a)*3:e.x+Math.cos(a)*(e.def.w/2+2),y:off?ey+Math.sin(a)*3:e.y+Math.sin(a)*(e.def.h/2+2),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,type:'eshot',owner:AI_ALLY===e?'ally':'enemy',src:e,life:o.life||200,dmg:o.dmg||7,col:o.col||[255,80,60],boom:o.boom||3,fire:o.fire||0});
  flash(e.x,e.y,8,o.col||[255,80,60],3);snd('eshot',e.x,e.y,{v:.55,gap:.03});
}
function enemyBeam(e,o={}){
  if(SPAWN.peace&&AI_ALLY!==e)return false;
  const ox=e.x+(o.ox||0),oy=e.y+(o.oy||0),p=player(),dx=p.x-ox,dy=p.y-oy,a=o.ang??Math.atan2(dy,dx)+(R()-.5)*(o.spread||.08),c=o.col||[255,60,50];
  let x=ox,y=oy,hit=false;
  for(let s=0;s<(o.len||320);s++){x+=Math.cos(a);y+=Math.sin(a);const X=x|0,Y=y|0;if(X<0||X>=W||Y<0||Y>=H)break;
    if(AI_ALLY===e){const he=enemyAt(x,y,1);if(he&&he!==e){hitEnemy(he,(o.dmg||10)*1.5,Math.cos(a),Math.sin(a));hit=true;break;}}
    else{if(Math.abs(x-pl_.x)<=PW/2+1&&y>=pl_.y-PH&&y<=pl_.y){hurt(o.dmg||10);hit=true;break;}
      if(decoy&&Math.abs(x-decoy.x)<=4&&y>=decoy.y-SH&&y<=decoy.y){decoy.hp-=o.dmg||10;hit=true;break;}}
    const m=t[Y*W+X];if(m&&KIND[m]!==G&&KIND[m]!==F){explode(X,Y,o.boom||3,{enemy:AI_ALLY!==e,self:true,col:c,dmg:0,quiet:o.quiet});break;}}
  beams.push({x0:ox,y0:oy,x1:x,y1:y,life:5,w:o.w||1,c:[255,200,190],g:c});flash(x,y,10,c,3);snd('elaser',ox,oy,{v:.6,gap:.05});
  return hit;
}
function enemyAt(x,y,pad){for(const e of enemies){if(Math.abs(x-e.x)<=e.def.w/2+pad&&Math.abs(y-e.y)<=e.def.h/2+pad)return e;}return null;}
function nearestEnemy(x,y,r){let b=null,bd=r;for(const e of enemies){const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;b=e;}}return b;}
function hitEnemy(e,dmg,kx,ky){if(e.hp<=0)return;if(e.mem.shield>0)dmg*=.35;e.hp-=dmg;e.flash=5;e.vx+=kx||0;e.vy+=ky||0;
  if(dmg>=8&&np<MP-2000){for(let k=0;k<5;k++){const a=R()*6.283,s=1.5+R()*2.5;spawn(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s,R()<.5?rgb(255,250,230):rgb(255,210,120),6+R()*6,0,1,0,1);}if(dmg>=20)flash(e.x,e.y,10+dmg*.2,[255,230,180],3);}}
function damageEnemies(x,y,r,dmg,kx,ky,radial){
  for(const e of enemies){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy);if(d>r+e.def.w/2)continue;const f=Math.max(.25,1-d/(r+1));
    const kr=radial||(!kx&&!ky)?3*f:0;hitEnemy(e,dmg*f,(kx||0)*f+(d?dx/d*kr:0),(ky||0)*f+(d?dy/d*kr:0));}
}
function damageLine(x0,y0,x1,y1,r,dmg){
  const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy||1;
  for(const e of enemies){const u=Math.max(0,Math.min(1,((e.x-x0)*dx+(e.y-y0)*dy)/L2));const d=Math.hypot(x0+dx*u-e.x,y0+dy*u-e.y);if(d<r+e.def.w/2)hitEnemy(e,dmg,dx/Math.sqrt(L2)*.3,dy/Math.sqrt(L2)*.3);}
}
function damageCone(x,y,ux,uy,r,dmg,knock){
  for(const e of enemies){const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;if(d<r&&(dx*ux+dy*uy)/d>.6)hitEnemy(e,dmg*(1-d/r*.5),ux*knock,uy*knock-1);}
}
function eHit(e,x,y){const hw=e.def.w/2,hh=e.def.h/2;
  for(const [ox,oy] of [[-hw,-hh],[hw,-hh],[-hw,hh],[hw,hh],[0,hh],[0,-hh],[-hw,0],[hw,0]])if(solidAt(x+ox,y+oy))return true;return false;}
function updEnemies(){
  for(let n=spawnQ.length-1;n>=0;n--){const s=spawnQ[n];if(--s.delay>0)continue;spawnQ.splice(n,1);const pos=spawnPoint(ENEMY_TYPES[s.type]);if(pos)spawnEnemy(s.type,pos[0],pos[1]);}
  for(let n=enemies.length-1;n>=0;n--){
    const e=enemies[n],d=e.def;e.t++;if(e.cd>0)e.cd--;if(e.flash>0)e.flash--;
    if(e.grabbed){if(e.hp<=0){if(heldE===e)heldE=null;killEnemy(e);enemies.splice(n,1);}continue;} // held by telekinesis: no AI, no physics
    if(stasis&&inStasis(e.x,e.y)){if(frame%4===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,0,rgb(255,150,230),6,0,1,0,1);if(e.hp<=0){killEnemy(e);enemies.splice(n,1);}continue;}
    const preSp=Math.hypot(e.vx,e.vy);
    if(e.emp>0){e.emp--;if(frame%3===0){const a2=R()*6.283;spawn(e.x+Math.cos(a2)*e.def.w/2,e.y+Math.sin(a2)*e.def.h/2,(R()-.5)*2,-R()*2,R()<.5?rgb(255,240,160):rgb(150,230,255),8,0,1,1);}}
    if(e.frozen>0){e.frozen--;e.vx*=.7;if(d.fly)e.vy=Math.min(3,e.vy+.15);if(frame%6===0&&!e.emp)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,.3,rgb(200,240,255),12,0,1,0);}
    else if(d.think){
      if(e.ally>0){ // Jean's puppet: hunts the nearest other enemy, or trails the hero
        e.ally--;let tg=null,bd=320;for(const o of enemies){if(o===e||o.ally>0||o.hp<=0||o.grabbed)continue;const dd=Math.hypot(o.x-e.x,o.y-e.y);if(dd<bd){bd=dd;tg=o;}}
        AI_ALLY=e;AI_TE=tg;AI_T=tg?{x:tg.x,y:tg.y}:{x:pl_.x-pl_.face*24,y:pl_.y-PH/2-12};try{d.think(e);}finally{AI_T=AI_TE=AI_ALLY=null;}
        if(frame%4===0)spawn(e.x+(R()-.5)*e.def.w,e.y+(R()-.5)*e.def.h,0,-.4,rgb(255,120,210),12,0,1,0,1);
        if(e.ally===0){hitEnemy(e,e.def.hp*.3,0,0);fxWord(e.x,e.y-e.def.h/2-6,'SNAP!',1,'#ff9ad8',true);}}
      else d.think(e);}
    // physics
    if(d.fly){e.vx*=.97;e.vy*=.97;}else{e.vy=Math.min(6,e.vy+.35);e.vx*=e.ground?.8:.98;
      const wi=(e.y|0)*W+(e.x|0);if(wi>=0&&wi<N&&KIND[t[wi]]===L&&!d.title){e.vx*=.9;e.vy=e.vy*.88-.3;}} // walkers wade and float in liquids
    const nx=e.x+e.vx;
    if(!eHit(e,nx,e.y))e.x=nx;else if(!d.fly&&!eHit(e,nx,e.y-2)){e.x=nx;e.y-=2;}else{e.vx*=-.3;e.mem.blocked=e.t;}
    const ny=e.y+e.vy;e.ground=false;
    if(!eHit(e,e.x,ny))e.y=ny;else{if(e.vy>0)e.ground=true;e.vy*=d.fly?-.3:0;}
    let u=0;while(eHit(e,e.x,e.y)&&u++<6)e.y-=1;
    e.x=Math.max(2,Math.min(W-3,e.x));
    if(e.vx>.2)e.face=1;else if(e.vx<-.2)e.face=-1;
    // hazards + thrown chunks
    const ci=(e.y|0)*W+(e.x|0);if(ci>=0&&ci<N){const m=t[ci];if(m===LAVA)e.hp-=2;else if(m===ACID)e.hp-=1;else if(m===FIRE||m===GFIRE)e.hp-=.4;}
    for(const b of bodies){const spd=Math.hypot(b.vx,b.vy);if(spd<2.2||b.held)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<b.rmax+e.def.w/2&&bodyAt(b,e.x,e.y)){hitEnemy(e,spd*7,b.vx*.6,b.vy*.6);}}
    if(e.thrownT>0){e.thrownT--; // thrown enemies smash into others and splat on impact
      for(const o of enemies)if(o!==e&&!o.grabbed&&Math.abs(o.x-e.x)<(o.def.w+d.w)/2+1&&Math.abs(o.y-e.y)<(o.def.h+d.h)/2+1)hitEnemy(o,preSp*5,e.vx*.5,e.vy*.5);
      if(preSp>3&&(e.mem.blocked===e.t||e.ground)){hitEnemy(e,preSp*12,0,0);explode(e.x|0,e.y|0,Math.min(10,4+preSp*.6|0),{self:true});e.thrownT=0;}}
    if(e.y>H+20)e.hp=0;
    if(e.hp<=0){killEnemy(e);enemies.splice(n,1);}
  }
}
function killEnemy(e){
  const d=e.def;if(!e.mem.noScore){kills++;score+=d.score;}snd('kill',e.x,e.y,{v:Math.min(1,.5+d.boom/16)});
  explode(e.x,e.y,d.boom,{fire:.25,self:true,col:[255,140,80]});
  // scrap: the sprite's own pixels fly off and land as debris
  const sp=d.sprite,sw=sp[0].length,sh=sp.length,S=d.scale||1;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const ch=sp[y][x];if(ch==='.')continue;const c=d.pal[ch];if(c===undefined)continue;
    if(sw*sh>300&&R()<.4)continue;spawn(e.x+(x-sw/2)*S,e.y+(y-sh/2)*S,(x-sw/2)*.35+(R()-.5)*2+e.vx*.5,(y-sh/2)*.3-1.5-R()*2,c,120,R()<.5?RUBBLE:0,d.glow.includes(ch)?1:0);}
  if(d.onDeath)d.onDeath(e);
  fxWord(e.x,e.y-8,['SKRANCH!','KZZT!','KRAK!','SCRAP!'][R()*4|0],d.boom>=10?1.4:.75,'#f3e9d2',d.boom>=10);
  if(MODE&&MODE.onKill)MODE.onKill(e,MS);
}
function spawnPoint(d){ // giants (w>16) may spawn overlapping terrain: they smash their own way out
  if(!d)return null;
  for(let tries=0;tries<12;tries++){
    const side=R()<.5?-1:1;let x=pl_.x+side*(VW/2+10+R()*60);
    if(x<10||x>W-10)x=pl_.x-side*(VW/2+10+R()*60);
    x=Math.max(10,Math.min(W-10,x));
    if(d.fly){const y=Math.max(10,camY+10+R()*90);if(!eHit({def:d},x,y))return [x,y];}
    else{let y=0;while(y<H-1&&!solidAt(x,y))y++;const sy=y-d.h/2-1;if(sy>5&&(d.w>16||!eHit({def:d},x,sy))&&t[(y)*W+(x|0)]!==WATER)return [x,sy];}
  }
  return null;
}
const WAVES=n=>{const m=mapSel.value; // the sandbox's N key: each map has its own locals
  if(m==='savage')return[['brood',2+n*2],['hydra',Math.max(0,n-1)]];
  if(m==='arctic')return[['hydra',1+n],['sentinel_scout',Math.floor(n/2)],['brood',n]];
  if(m==='xmansion')return[['sentinel_scout',1+n],['sentinel',Math.floor(n/3)]];
  return[['ultron',1+n],['chitauri',n],['chitauri_glider',Math.max(0,n-1)]];};
function queueWave(list,gap=22){let k=0;for(const [type,c] of list)for(let i=0;i<c;i++)spawnQ.push({type,delay:20+(k++)*gap+R()*30|0});}
function startWave(){wave++;queueWave(WAVES(wave));}
function clearEnemies(){enemies.length=0;spawnQ.length=0;for(let n=shots.length-1;n>=0;n--)if(shots[n].owner==='enemy')shots.splice(n,1);}

// --- Ultron sentry drone: hovers at range, strafes, fires a red laser
defineEnemy('ultron',{hp:45,w:9,h:7,fly:true,score:15,boom:6,
  sprite:["..aaaaa..",".aAAAAAa.","aA*AAA*Aa","aAAAmAAAa",".aAmmmAa.","..a...a..",".a.....a."],
  pal:{a:rgb(92,98,112),A:rgb(176,182,196),m:rgb(40,40,48),'*':rgb(255,70,50)},
  think(e){
    const p=player(),ang=e.t*.012+(e.mem.ph??=R()*6.28),want=pdist(e)<45?140:95;
    seek(e,p.x+Math.cos(ang)*want,p.y-55+Math.sin(ang*1.7)*25,1.7,.06);
    e.face=p.x>e.x?1:-1;
    if(e.cd===0&&pdist(e)<300&&los(e,p.x,p.y)){e.mem.charge=30;e.cd=110+R()*60|0;}
    if(e.mem.charge>0){e.mem.charge--;e.vx*=.8;e.vy*=.8;if(e.mem.charge%3===0)spawn(e.x,e.y,(R()-.5)*2,(R()-.5)*2,rgb(255,80,60),8,0,1,0,1);if(e.mem.charge===0)enemyBeam(e,{dmg:9,col:[255,60,50]});}
    if(frame%3===0)spawn(e.x+(R()-.5)*4,e.y+4,(R()-.5)*.3,.8,rgb(255,120,80),6,0,1,0);
  }});
// --- Chitauri soldier: walks in, keeps distance, fires plasma bolts, hops obstacles
defineEnemy('chitauri',{hp:35,w:7,h:13,fly:false,score:10,boom:4,
  sprite:["..bbb..",".bgggb.",".g*g*g.",".bgggb.","..bbb..","bsssssb","bsgsgsb","bsssssb","w.sss.w","..s.s..","..s.s..",".bb.bb.",".bb.bb."],
  pal:{b:rgb(70,62,58),g:rgb(150,140,120),'*':rgb(120,220,255),s:rgb(110,104,96),w:rgb(200,170,80)},glow:'*w',
  think(e){
    const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>110)e.vx+=(e.face*1.1-e.vx)*.2;else if(dist<60)e.vx+=(-e.face*.8-e.vx)*.2;else e.vx*=.8;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-4.5;
    if(e.cd===0&&dist<260&&los(e,p.x,p.y)){enemyShoot(e,{speed:3.6,dmg:7,col:[140,200,255],lead:12,spread:.08});e.cd=60+R()*50|0;}
  }});
// --- Chitauri glider: fast swooping flyer on a hover-sled
defineEnemy('chitauri_glider',{hp:30,w:13,h:7,fly:true,score:20,boom:6,
  sprite:["....bbb......","...bg*gb.....","....sss......","..wsssssw....","sssssssssssss",".ccccccccccc.","..*.......*.."],
  pal:{b:rgb(70,62,58),g:rgb(150,140,120),'*':rgb(120,220,255),s:rgb(120,112,104),w:rgb(200,170,80),c:rgb(80,74,70)},glow:'*w',
  think(e){
    const p=player();e.mem.side??=R()<.5?-1:1;
    if(Math.abs(e.x-(p.x+e.mem.side*120))<20)e.mem.side*=-1;
    seek(e,p.x+e.mem.side*130,p.y-40+Math.sin(e.t*.05)*30,3,.05);
    if(e.cd===0&&pdist(e)<220){enemyShoot(e,{speed:4,dmg:6,col:[140,200,255],spread:.1});e.cd=45+R()*40|0;}
    if(frame%2===0)spawn(e.x-e.face*6,e.y+3,-e.vx*.3,.5,rgb(120,220,255),8,0,1,0);
  }});

// ---- NYC 2099 robots
// swarmbot: cheap kamikaze drone, comes in clouds
defineEnemy('swarmbot',{hp:14,w:5,h:5,fly:true,score:5,boom:3,glow:'*c',
  sprite:[".cAc.","cA*Ac","A***A","cA*Ac",".c.c."],
  pal:{A:rgb(150,160,182),c:rgb(60,220,255),'*':rgb(255,60,200)},
  think(e){
    const p=player();e.mem.ph??=R()*6.28;const o=e.t*.08+e.mem.ph;
    seek(e,p.x+Math.cos(o)*10,p.y+Math.sin(o)*10,e.t<40?1.5:2.8,.07);
    if(pdist(e)<7){hurtTarget(e,10);e.mem.noScore=true;e.hp=0;}
    if(frame%3===0)spawn(e.x,e.y,(R()-.5)*.4,.3,rgb(255,70,210),6,0,1,0);
  }});
// mech: heavy street walker, lobs rocket salvos that chew through buildings
defineEnemy('mech',{hp:140,w:11,h:14,fly:false,score:40,boom:9,glow:'*c',
  sprite:["...AAAAA...","..AA*A*AA..","..AAAAAAA..","cAAAAAAAAAc","cAmmAAAmmAc","c.AAAAAAA.c","..AmmAmmA..","...AA.AA...","..AA...AA..","..A.....A..",".AA.....AA.",".A.......A.","AA.......AA","cc.......cc"],
  pal:{A:rgb(110,116,134),m:rgb(48,50,62),'*':rgb(255,40,60),c:rgb(60,220,255)},
  think(e){
    const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(dist>140)e.vx+=(e.face*.7-e.vx)*.15;else if(dist<80)e.vx+=(-e.face*.5-e.vx)*.15;else e.vx*=.8;
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<4)e.vy=-5;
    if(e.ground&&Math.abs(e.vx)>.3&&e.t%18===0){shake=Math.max(shake,1.5);for(let k=0;k<4;k++)spawn(e.x+(R()-.5)*10,e.y+7,(R()-.5)*1.5,-R(),rgb(150,140,125),20,0,0,1);}
    if(e.cd===0&&dist<320&&los(e,p.x,p.y)){enemyShoot(e,{speed:2.8,dmg:12,col:[255,170,60],boom:7,fire:.3,lead:20,spread:.05});e.mem.salvo=(e.mem.salvo||0)+1;e.cd=e.mem.salvo%3?14:130;}
  }});
// Ultron Prime: boss. Beam bursts, missile rings, calls in swarms; enraged under half health
defineEnemy('ultron_prime',{hp:1400,w:15,h:13,fly:true,score:0,boom:16,glow:'*c',title:'ULTRON PRIME',
  sprite:["....AAAAAAA....","..AAAAAAAAAAA..",".AAA**AAA**AAA.","AAAA**AAA**AAAA","AAAAAAAAAAAAAAA","AAAAAmmmmmAAAAA",".AAAm*****mAAA.","..AAAmmmmmAAA..","...AAAAAAAAA...","..cA.aaaaa.Ac..",".c..a.aaa.a..c.","c....a...a....c",".....c...c....."],
  pal:{A:rgb(196,202,218),a:rgb(120,126,142),m:rgb(40,40,50),'*':rgb(255,50,40),c:rgb(255,90,60)},
  think(e){
    const p=player(),enr=e.hp<e.def.hp*.5;
    seek(e,p.x+Math.sin(e.t*.01)*90,p.y-95+Math.sin(e.t*.023)*20,enr?2.2:1.6,.04);
    e.face=p.x>e.x?1:-1;
    if(e.cd===0){const a=e.mem.atk=(e.mem.atk||0)+1;
      if(a%3===1){e.mem.beam=enr?5:3;e.mem.bt=0;}
      else if(a%3===2){for(let k=0;k<(enr?14:10);k++)enemyShoot(e,{speed:2.6+R()*.8,dmg:8,spread:.7,col:[255,90,60],boom:4,life:260});shake+=4;}
      else for(let k=0;k<(enr?4:3);k++)spawnEnemy('swarmbot',e.x+(R()-.5)*20,e.y+8);
      e.cd=enr?70:100;}
    if(e.mem.beam>0&&--e.mem.bt<=0){enemyBeam(e,{dmg:12,col:[255,40,40],len:420,spread:.15,boom:5});e.mem.beam--;e.mem.bt=8;}
    if(frame%2===0)spawn(e.x+(R()-.5)*10,e.y+7,(R()-.5)*.6,1.2,rgb(255,120,80),10,0,1,0);
  }});

// ---- Sentinels: mutant-hunting giants (X-Mansion siege)
const SENT_SPR=["......pPPPPPPp......", ".....pPPPPPPPPp.....", "....pPPPPPPPPPPp....", "....pPPFFFFFFPPp....", "....pFFFFFFFFFFp....", "....pF**FFFF**Fp....", "....pFFFFffFFFFp....", "....pFfKKKKKKfFp....", ".....pFFFFFFFFp.....", "......pppKKppp......", "..pPPPPPPKKPPPPPPp..", ".pPPPPPPPPPPPPPPPPp.", "pPPPMMPPPMMPPPMMPPPp", "pPPMMMMPPMMPPMMMMPPp", "pPPPMMPPMMMMPPMMPPPp", "pmmpPPPMMMMMMPPPpmmp", "MMm.pPPMooooMPPp.mMM", "MMm.pPPMooooMPPp.mMM", "MMm.pPPPMMMMPPPp.mMM", "mMm.ppPPPPPPPPpp.mMm", "MMm..pPPPPPPPPp..mMM", "KKK..pPPPPPPPPp..KKK", "MMm..ppPPPPPPpp..mMM", "MMm..KKKKKKKKKK..mMM", "MMm..pPPPPPPPPp..mMM", "mMm..pPPPPPPPPp..mMm", "HHH..pPPPppPPPp..HHH", "HHH...pPPppPPp...HHH", "hHh...pPPppPPp...hHh", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", ".....MMMm..mMMM.....", ".....MmMm..mMmM.....", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", ".....pPPp..pPPp.....", "....pPPPp..pPPPp....", "....pPPPp..pPPPp....", "....mMMMm..mMMMm....", "...pPPPPp..pPPPPp...", "..pPPPPPp..pPPPPPp..", "..pPPPPPP..PPPPPPp..", "..ppppppp..ppppppp.."], SCOUT_SPR=["..pPPPPp..", ".pPFFFFPp.", ".pF*FF*Fp.", ".pFFKKFFp.", "..ppKKpp..", "pPPPMMPPPp", "MmPMooMPmM", "Mm.PPPP.mM", "Mm.PPPP.mM", "H..KKKK..H", "...pPPp...", "...pPPp...", "..pP..Pp..", "..MM..MM..", "..pP..Pp..", ".ppP..Ppp.", ".**....**."];
// giants smash a path through anything above their feet
function smashAhead(e,reach){const d=e.def,hw=d.w/2,hh=d.h/2;
  for(let y=e.y-hh|0;y<=e.y+hh-1;y++)for(let k=1;k<=reach;k++){const x=e.x+e.face*(hw+k)|0;if(x<0||x>=W||y<0||y>=H-40)continue;const i=y*W+x,m=t[i];
    if(m&&KIND[m]!==G&&KIND[m]!==F){if(np<MP-300&&R()<.5)spawn(x,y,e.face*(1+R()*2),-R()*2,col[i],70,KIND[m]===S?RUBBLE:KIND[m]===L?m:0,0);setc(i,EMPTY);}}
  bgHit(e.x+e.face*(hw+reach/2),e.y,hh*.6|0);}
function sentinelThink(e){
  const d=e.def,S=d.scale||1,p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
  if(dist>70*S)e.vx+=(e.face*d.spd-e.vx)*.1;else e.vx*=.85;
  if(e.t%3===0)smashAhead(e,3*S);
  if(e.ground&&Math.abs(e.vx)>.12&&e.t%(S>1?44:28)===0){ // footfall
    shake=Math.max(shake,2.5*S);for(let k=0;k<10*S;k++)spawn(e.x+(R()-.5)*d.w,e.y+d.h/2,(R()-.5)*3,-R()*1.5,rgb(150,140,125),24,0,0,1);
    if(pl_.ground&&Math.abs(pl_.x-e.x)<40*S&&Math.abs(pl_.y-(e.y+d.h/2))<12){hurt(5*S);pl_.vy=-3;}
    if(S>1)fxWord(e.x,e.y+d.h/2-6,'THOOM',1,'#f3e9d2',true);}
  const head={ox:e.face*1*S,oy:-17*S},hand={ox:e.face*8.5*S,oy:5*S};
  if(e.cd===0&&dist<380&&!e.mem.charge&&!e.mem.sweep){e.mem.charge=40;e.cd=(S>1?140:170)+R()*60|0;}
  if(e.mem.charge>0){e.mem.charge--;for(const sx of [-3,3])spawn(e.x+head.ox+sx*S,e.y+head.oy,(R()-.5)*.6,(R()-.5)*.6,rgb(255,220,90),8,0,1,0,1);flash(e.x+head.ox,e.y+head.oy,10*S,[255,210,80],2);
    if(e.mem.charge===0){if(S>1){e.mem.sweep=36;e.mem.base=Math.atan2(p.y-(e.y+head.oy),p.x-(e.x+head.ox));fxWord(e.x,e.y+head.oy-12,'TARGET ACQUIRED',1,'#ff9ad8',true);}
      else{enemyBeam(e,{...head,dmg:16,col:[255,210,80],len:420,boom:7,spread:.04,w:2});fxWord(e.x+head.ox,e.y+head.oy-8,'ZZAAAK!',1,'#ffc93c',true);}}}
  if(e.mem.sweep>0){e.mem.sweep--;if(e.mem.sweep%2===0)enemyBeam(e,{...head,ang:e.mem.base-.7+(36-e.mem.sweep)/36*1.4,dmg:12,col:[255,210,80],len:520,boom:6,w:3,quiet:true});shake=Math.max(shake,4);}
  if(!e.mem.hb||e.t>e.mem.hb){e.mem.hb=e.t+(S>1?60:95)+R()*40;if(dist<320)enemyShoot(e,{...hand,speed:3.2,dmg:12,col:[255,110,200],boom:S>1?11:8,lead:15,spread:.08,fire:.2});}
  if(S>1&&e.t%600===300){for(let k=0;k<2;k++)spawnEnemy('sentinel_scout',e.x+(R()-.5)*30,e.y-d.h/2-10);banner('MASTER MOLD','deploying sentinels');}
}
defineEnemy('sentinel',{hp:900,w:18,h:42,fly:false,score:150,boom:18,spd:.45,glow:'*o',
  sprite:SENT_SPR,pal:{p:rgb(84,40,120),P:rgb(122,62,168),M:rgb(206,112,170),m:rgb(150,70,124),F:rgb(184,176,206),f:rgb(140,132,166),K:rgb(36,30,46),H:rgb(196,104,160),h:rgb(150,70,124),'*':rgb(255,222,90),o:rgb(255,80,80)},
  think:sentinelThink});
defineEnemy('master_mold',{hp:6500,w:36,h:84,fly:false,score:0,boom:32,spd:.26,scale:2,title:'MASTER MOLD',glow:'*o',
  sprite:SENT_SPR,pal:{p:rgb(58,40,78),P:rgb(92,70,120),M:rgb(150,92,140),m:rgb(104,60,98),F:rgb(150,146,170),f:rgb(108,104,130),K:rgb(26,22,34),H:rgb(150,92,140),h:rgb(104,60,98),'*':rgb(255,90,60),o:rgb(255,60,60)},
  think:sentinelThink});
defineEnemy('sentinel_scout',{hp:140,w:9,h:16,fly:true,score:40,boom:7,glow:'*o',
  sprite:SCOUT_SPR,pal:{p:rgb(84,40,120),P:rgb(122,62,168),M:rgb(206,112,170),m:rgb(150,70,124),F:rgb(184,176,206),K:rgb(36,30,46),H:rgb(196,104,160),'*':rgb(255,200,90),o:rgb(255,80,80)},
  think(e){const p=player();e.mem.ph??=R()*6.28;const ang=e.t*.02+e.mem.ph;
    seek(e,p.x+Math.cos(ang)*120,p.y-60+Math.sin(ang*1.3)*30,2.2,.05);e.face=p.x>e.x?1:-1;
    if(e.cd===0&&pdist(e)<280&&los(e,p.x,p.y)){for(const o of [-2,2])enemyShoot(e,{speed:4.2,dmg:6,col:[255,120,220],spread:.05,oy:o});e.cd=70+R()*40|0;}
    if(frame%2===0)spawn(e.x+(R()-.5)*3,e.y+9,(R()-.5)*.3,1.2,R()<.5?rgb(255,200,90):rgb(255,120,60),8,0,1,0);}});

// ---- Brood: alien hive-bugs. Fast, leap at you, climb walls, come in packs
defineEnemy('brood',{hp:30,w:9,h:7,fly:false,score:12,boom:3,metal:false,glow:'*',
  sprite:["....bBBb.","..bBBBBBb",".bBBBBg*B","bBBBBBBBm",".bbBBBBb.",".l.l.l.l.","l..l.l..l"],
  pal:{b:rgb(60,30,72),B:rgb(118,62,132),g:rgb(90,200,90),'*':rgb(190,255,120),m:rgb(226,214,184),l:rgb(40,20,48)},
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);e.face=dx>0?1:-1;
    if(e.ground)e.vx+=(e.face*1.7-e.vx)*.25;
    if(e.mem.blocked&&e.t-e.mem.blocked<3)e.vy=-2.6; // skitters straight up walls
    if(e.ground&&e.cd===0&&dist<80&&dist>14){e.vx=e.face*4.2;e.vy=-3.6;e.cd=50+R()*40|0;}
    if(pdist(e)<9&&!(e.mem.bit>e.t)){hurtTarget(e,8);e.mem.bit=e.t+30;spawn(e.x+e.face*4,e.y,(R()-.5)*2,-R()*2,rgb(190,255,120),10,0,1,1);}}});
// ---- Hydra jet-trooper: hovers on a jetpack, strafes and fires rocket pairs
defineEnemy('hydra',{hp:40,w:7,h:11,fly:true,score:18,boom:5,metal:false,glow:'Yf',
  sprite:["..gGg..","..gYg..","..kkk..",".gGGGg.","tgGGGgt","tgGGGg.",".gGGG..","..g.g..","..g.g..",".ff.ff.","..f..f."],
  pal:{g:rgb(40,66,40),G:rgb(72,108,62),k:rgb(20,20,22),Y:rgb(255,220,80),t:rgb(120,120,126),f:rgb(255,170,60)},
  think(e){const p=player();e.mem.ph??=R()*6.28;const ang=e.t*.015+e.mem.ph;if(e.t===1&&R()<.3)fxWord(e.x,e.y-12,'HAIL HYDRA!',.8,'#bff07a',true);
    seek(e,p.x+Math.cos(ang)*120,p.y-45+Math.sin(ang*1.4)*25,1.9,.05);e.face=p.x>e.x?1:-1;
    if(e.cd===0&&pdist(e)<300&&los(e,p.x,p.y)){enemyShoot(e,{speed:3,dmg:8,col:[255,160,60],boom:6,fire:.3,lead:10,spread:.08});e.mem.pair=(e.mem.pair||0)+1;e.cd=e.mem.pair%2?10:100+R()*40|0;}
    if(frame%2===0)spawn(e.x+(R()-.5)*3,e.y+6,(R()-.5)*.3,1.4,R()<.5?rgb(255,200,90):rgb(255,120,50),8,0,1,0);}});
// ---- Juggernaut (boss): walks through anything. Every few seconds he lowers his head and charges
defineEnemy('juggernaut',{hp:2600,w:16,h:24,fly:false,score:0,boom:18,metal:false,title:'JUGGERNAUT',glow:'',
  sprite:["....hhhhhhhh....","...hHHHHHHHHh...","..hHHHHHHHHHHh..","..hHHkkHHkkHHh..","..hHHHHHHHHHHh..","..hhHHHHHHHHhh..","...hhhHHHHhhh...",".rrrrRRRRRRrrrr.","rRRRRRRRRRRRRRRr","rRRRrRRRRRRrRRRr","rRRr.RRRRRR.rRRr","rRRr.RRbbRR.rRRr","sss..RRbbRR..sss","sss..RRRRRR..sss",".....RRRRRR.....",".....RR..RR.....","....rRR..RRr....","....rRR..RRr....","....rRR..RRr....","....rRR..RRr....","....hHH..HHh....","...hHHH..HHHh...","...hhhh..hhhh..."],
  pal:{h:rgb(70,42,30),H:rgb(132,82,52),k:rgb(20,16,14),R:rgb(150,40,40),r:rgb(90,20,24),s:rgb(204,154,112),b:rgb(204,160,60)},
  think(e){const p=player(),dx=p.x-e.x,dist=Math.abs(dx);if(e.frozen>0)e.frozen=Math.max(0,e.frozen-4); // nothing holds the Juggernaut for long
    if(e.mem.charge>0){e.mem.charge--;e.vx=e.mem.dir*4.6;smashAhead(e,6);if(e.t%4===0){shake=Math.max(shake,4);for(let k=0;k<6;k++)spawn(e.x-e.mem.dir*8,e.y+12,(R()-.5)*3,-R()*2,rgb(150,140,125),20,0,0,1);}
      if(Math.abs(pl_.x-e.x)<14&&Math.abs(pl_.y-PH/2-e.y)<18&&!(e.mem.hitT>e.t)){hurtTarget(e,26);pl_.vx=e.mem.dir*7;pl_.vy=-5;e.mem.hitT=e.t+30;shake=22;snd('slam',e.x,e.y);}
      if(e.mem.charge===0)e.cd=120+R()*80|0;return;}
    e.face=dx>0?1:-1;e.vx+=(e.face*.9-e.vx)*.12;if(e.t%3===0)smashAhead(e,3);
    if(e.ground&&Math.abs(e.vx)>.2&&e.t%30===0){shake=Math.max(shake,3);snd('stomp',e.x,e.y);}
    if(e.cd===0&&dist<260){e.mem.charge=70;e.mem.dir=e.face;fxWord(e.x,e.y-20,"NOTHING STOPS THE JUGGERNAUT!",1.1,'#e23b2e',true);snd('roar',e.x,e.y,{pitch:.8});}
    if(e.ground&&e.mem.blocked&&e.t-e.mem.blocked<3)e.vy=-4;}});
// ---- Magneto (boss): rips the city apart and throws it at you. Pulls metal heroes in. Raises a force field when hurt
defineEnemy('magneto',{hp:2200,w:9,h:16,fly:true,score:0,boom:16,metal:false,title:'MAGNETO',glow:'',
  sprite:["...RRR...","..RRRRR..","..RfffR..","..RfkfR..","..pRRRp..",".pRRRRRp.","pPRRRRRPp","pPRRRRRPp","pP.RRR.Pp","pP.RRR.Pp","pP.R.R.Pp","p..R.R..p","...R.R...","..RR.RR..","..rr.rr..","........."],
  pal:{R:rgb(184,32,44),r:rgb(110,18,24),f:rgb(224,182,150),k:rgb(30,20,24),p:rgb(90,40,112),P:rgb(132,72,152)},
  think(e){const p=player(),enr=e.hp<e.def.hp*.5;
    seek(e,p.x+Math.sin(e.t*.008)*120,p.y-90+Math.sin(e.t*.02)*16,enr?2:1.5,.04);e.face=p.x>e.x?1:-1;
    if(e.mem.shield>0){e.mem.shield--;if(e.t%2===0)for(let k=0;k<3;k++){const a=R()*6.283;spawn(e.x+Math.cos(a)*14,e.y+Math.sin(a)*14,0,0,rgb(200,120,255),6,0,1,0,1);}}
    if(e.mem.pull>0){e.mem.pull--;const dx=e.x-pl_.x,dy=e.y-(pl_.y-PH/2),d=Math.hypot(dx,dy)||1;pl_.vx+=dx/d*.35;pl_.vy+=dy/d*.35;if(e.t%3===0)beams.push({pts:[[e.x,e.y],[(e.x+pl_.x)/2+(R()-.5)*16,(e.y+pl_.y-PH/2)/2+(R()-.5)*16],[pl_.x,pl_.y-PH/2]],life:2,c:[230,170,255],g:[150,60,220]});}
    if(e.cd===0){const a=e.mem.atk=(e.mem.atk||0)+1;
      if(a%4===1){ // tear a chunk of building out and hurl it
        let n=0,cx=0,cy=0;for(let tries=0;tries<60&&!n;tries++){const X=e.x+(R()-.5)*180|0,Y=e.y+(R()-.2)*140|0;if(X<4||X>=W-4||Y<4||Y>=H-50)continue;const m=t[Y*W+X];if(KIND[m]===S&&!gnd[Y*W+X]){cx=X;cy=Y;}}
        if(cx){for(let y=-5;y<=5;y++)for(let x=-6;x<=6;x++){const X=cx+x,Y=cy+y,i=Y*W+X;if(X<0||X>=W||Y<0||Y>=H-50)continue;if(KIND[t[i]]===S&&!gnd[i]){q[n++]=i;markDirty(i);}}}
        const b=n>=20?makeBody(q,n,false):null;
        if(b){b.x=e.x;b.y=e.y-18;const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*8.5;b.vy=dy/d*8.5-1.5;b.va=(R()-.5)*.2;b.thrown=true;smashOverlap(b);fxWord(e.x,e.y-24,'RISE!',1,'#c88cff',true);snd('rip',e.x,e.y);}
        else for(let k=0;k<6;k++)enemyShoot(e,{speed:4,dmg:8,spread:.5,col:[210,130,255]});}
      else if(a%4===2){for(let k=0;k<8;k++)enemyShoot(e,{speed:3.6+R(),dmg:8,spread:.35,col:[210,130,255],boom:4});}
      else if(a%4===3&&(CH.id==='iron'||CH.id==='wolverine')){e.mem.pull=70;fxWord(e.x,e.y-24,CH.id==='iron'?'YOUR ARMOR IS MINE!':'ADAMANTIUM, HOW QUAINT.',1,'#c88cff',true);}
      else if(enr&&!(e.mem.shield>0)){e.mem.shield=180;fxWord(e.x,e.y-24,'FORCE FIELD',1,'#c88cff',true);}
      e.cd=enr?75:105;}}});

// ================= render =================
const cv=document.getElementById('view'),ctx=cv.getContext('2d');
const sim=document.createElement('canvas');sim.width=VW;sim.height=VH;const sctx=sim.getContext('2d');
const img=sctx.createImageData(VW,VH),buf=new Uint32Array(img.data.buffer);
const glc=document.createElement('canvas');glc.width=VW;glc.height=VH;const gctx=glc.getContext('2d');
const gimg=gctx.createImageData(VW,VH),gbuf=new Uint32Array(gimg.data.buffer);
const blur=document.createElement('canvas');blur.width=VW/2;blur.height=VH/2;const bctx=blur.getContext('2d');
const mm=document.createElement('canvas');mm.width=W/8;mm.height=H/8;const mctx=mm.getContext('2d');const mimg=mctx.createImageData(W/8,H/8),mbuf=new Uint32Array(mimg.data.buffer);
let scale=3,ox=0,oy=0,CX=0,CY=0,GL=false;
function resize(){cv.width=innerWidth;cv.height=innerHeight;scale=Math.max(1,Math.min(innerWidth/VW,innerHeight/VH));ox=(innerWidth-VW*scale)/2|0;oy=(innerHeight-VH*scale)/2|0;
  vig.width=cv.width;vig.height=cv.height;const g=vctx.createRadialGradient(cv.width/2,cv.height/2,Math.min(cv.width,cv.height)*.35,cv.width/2,cv.height/2,Math.max(cv.width,cv.height)*.72);
  g.addColorStop(0,'rgba(10,6,20,0)');g.addColorStop(1,'rgba(10,6,20,.6)');vctx.fillStyle=g;vctx.fillRect(0,0,vig.width,vig.height);}
const vig=document.createElement('canvas'),vctx=vig.getContext('2d');
// comic overlay drawn at screen resolution: focus lines, impact frames, starbursts, sound words, vignette, damage edge
function drawComics(sx,sy){
  const S=x=>ox+sx+(x-CX)*scale, T=y=>oy+sy+(y-CY)*scale, p=pl_;
  ctx.drawImage(vig,0,0);
  if(GS==='play'&&(p.boost>0||p.boring||p.charge>0||p.slam)){ // manga focus lines toward the hero
    const cx=S(p.x),cy=T(p.y-PH/2),R0=Math.max(cv.width,cv.height);ctx.strokeStyle='rgba(243,233,210,.22)';
    for(let k=0;k<22;k++){const a=R()*6.283,r1=90*scale/3+R()*60;ctx.lineWidth=1+R()*3;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*R0,cy+Math.sin(a)*R0);ctx.stroke();}}
  if(impactF>0){const k=impactF/4,cx=S(impactX),cy=T(impactY);ctx.fillStyle=`rgba(255,248,226,${.35*k})`;ctx.fillRect(0,0,cv.width,cv.height);
    ctx.strokeStyle=`rgba(20,17,15,${.55*k})`;for(let n=0;n<26;n++){const a=n/26*6.283+R()*.1,r1=40+R()*40;ctx.lineWidth=2+R()*4;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*2000,cy+Math.sin(a)*2000);ctx.stroke();}
    impactF--;}
  for(let n=comics.length-1;n>=0;n--){const f=comics[n],t=1-f.life/f.max;
    if(f.k==='b'){const r=f.r*scale/3*(.5+t*.9),cx=S(f.x),cy=T(f.y);ctx.save();ctx.translate(cx,cy);ctx.rotate(f.rot);ctx.globalAlpha=1-t*t;ctx.beginPath();
      for(let k=0;k<24;k++){const rr=k&1?r*.55:r,a=k/24*6.283;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=f.c;ctx.fill();ctx.lineWidth=Math.max(2,scale);ctx.strokeStyle='#14110f';ctx.stroke();ctx.restore();}
    else{const pop=t<.18?.3+t/.18*1.1:t<.3?1.4-(t-.18)/.12*.4:1,sz=f.size*16*scale*pop,cx=S(f.x),cy=T(f.y)-t*10*scale;
      ctx.save();ctx.translate(cx,cy);ctx.rotate(f.rot);ctx.globalAlpha=t>.7?1-(t-.7)/.3:1;ctx.font=`${sz|0}px Bangers, Impact, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineJoin='round';ctx.lineWidth=Math.max(3,sz*.16);ctx.strokeStyle='#14110f';ctx.fillStyle='#e23b2e';ctx.strokeText(f.text,sz*.07,sz*.07);ctx.fillText(f.text,sz*.07,sz*.07);
      ctx.strokeText(f.text,0,0);ctx.fillStyle=f.c;ctx.fillText(f.text,0,0);ctx.restore();}
    if(GS==='play')f.life--;if(f.life<=0)comics.splice(n,1);}
  ctx.globalAlpha=1;
  if(GS==='play'){ // arrows at the screen edge pointing to enemies you can't see (bosses get a bigger one)
    let shown=0;const cx=cv.width/2,cy=cv.height/2,mg=26;
    for(const e of enemies){if(shown>=14)break;const X=S(e.x),Y=T(e.y);if(X>ox&&X<ox+VW*scale&&Y>oy&&Y<oy+VH*scale)continue;shown++;
      const dx=X-cx,dy=Y-cy,k=Math.min((cx-mg)/Math.max(1,Math.abs(dx)),(cy-mg)/Math.max(1,Math.abs(dy))),ax=cx+dx*k,ay=cy+dy*k,an=Math.atan2(dy,dx),sz=e.def.title?14:8;
      ctx.save();ctx.translate(ax,ay);ctx.rotate(an);ctx.beginPath();ctx.moveTo(sz,0);ctx.lineTo(-sz*.7,-sz*.7);ctx.lineTo(-sz*.4,0);ctx.lineTo(-sz*.7,sz*.7);ctx.closePath();
      ctx.fillStyle=e.ally>0?'#ff9ad8':e.def.title?'#c88cff':'#e23b2e';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#14110f';ctx.stroke();ctx.restore();}}
  if(hurtV>.02){const g=ctx.createRadialGradient(cv.width/2,cv.height/2,Math.min(cv.width,cv.height)*.3,cv.width/2,cv.height/2,Math.max(cv.width,cv.height)*.7);
    g.addColorStop(0,'rgba(226,59,46,0)');g.addColorStop(1,`rgba(226,59,46,${.55*hurtV})`);ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);if(GS==='play')hurtV*=.92;}
}
addEventListener('resize',resize);
function pix(x,y,c,glow){x=(x-CX)|0;y=(y-CY)|0;if(x<0||x>=VW||y<0||y>=VH)return;const o=y*VW+x;buf[o]=c;if(glow)gbuf[o]=glow;}
function gaddS(x,y,r,g,b){if(x<0||x>=VW||y<0||y>=VH)return;const o=y*VW+x,c=gbuf[o];gbuf[o]=rgb(Math.min(255,(c&255)+r),Math.min(255,((c>>8)&255)+g),Math.min(255,((c>>16)&255)+b));}
function line(x0,y0,x1,y1,c,g){const d=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))|0;for(let k=0;k<=d;k++){const f=d?k/d:0;pix(x0+(x1-x0)*f,y0+(y1-y0)*f,c,g);}}
function circle(x,y,r,c,g){const n=Math.max(12,r*6|0);for(let k=0;k<n;k++){const a=k/n*6.283;pix(x+Math.cos(a)*r,y+Math.sin(a)*r,c,g);}}
function drawSprite(x,y,ang,face,tintG,spr,pal,hurtF,ghost){
  // rotate a sprite around its centre (nearest-neighbour inverse mapping)
  spr=spr||SPR;pal=pal||SPC;const sw=spr[0].length,sh=spr.length;
  const ca=Math.cos(ang),sa=Math.sin(ang),cx=x,cy=y-sh/2,RR=Math.ceil(Math.hypot(sw,sh)/2)+1;
  const gc=CH.glow;
  for(let yy=-RR;yy<=RR;yy++)for(let xx=-RR;xx<=RR;xx++){
    const u=xx*ca+yy*sa, v=-xx*sa+yy*ca;
    const sx=Math.round(u+sw/2-.5), sy=Math.round(v+sh/2-.5);
    if(sx<0||sx>=sw||sy<0||sy>=sh)continue;
    const ch=spr[sy][face>0?sx:sw-1-sx];if(ch==='.')continue;
    if(tintG){const X=(cx+xx-CX)|0,Y=(cy+yy-CY)|0;gaddS(X,Y,gc[0]*.15,gc[1]*.35,gc[2]*.15);continue;}
    SPX.push(cx+xx,cy+yy,ch);
  }
  if(tintG)return;
  if(ghost){ // optical camouflage: a faint refractive shimmer of the silhouette
    for(let k=0;k<SPX.length;k+=3){const X=(SPX[k]-CX)|0,Y=(SPX[k+1]-CY)|0;if(X<0||X>=VW||Y<0||Y>=VH)continue;const o=Y*VW+X,c=buf[o],edge=((X+Y+(frame>>1))%5)===0;
      buf[o]=edge?rgb(170,230,255):rgb(((c&255)*.8+40)|0,(((c>>8)&255)*.8+46)|0,(((c>>16)&255)*.8+56)|0);if(edge)gbuf[o]=rgb(40,90,120);}
    SPX.length=0;return;}
  if(SET.ink){const k0=rgb(20,17,15);for(let k=0;k<SPX.length;k+=3){const X=SPX[k],Y=SPX[k+1];pix(X-1,Y,k0);pix(X+1,Y,k0);pix(X,Y-1,k0);pix(X,Y+1,k0);pix(X+1,Y+1,k0);}}
  for(let k=0;k<SPX.length;k+=3){const ch=SPX[k+2];pix(SPX[k],SPX[k+1],hurtF&&(hurtF&2)?rgb(255,120,110):pal[ch],GLOWCH[ch]?pal[ch]:0);}
  SPX.length=0;
}
const SPX=[];
function drawHammer(x,y,a){const ca=Math.cos(a),sa=Math.sin(a); // a = direction the handle points from the head
  for(let k=-2;k<=2;k++)for(let w=-1;w<=1;w++){const X=x-sa*k+ca*w,Y=y+ca*k+sa*w;pix(X,Y,w===-1?rgb(214,220,232):w===1?rgb(120,126,140):rgb(170,176,186),rgb(60,90,170));}
  for(let k=2;k<7;k++)pix(x+ca*k,y+sa*k,k===6?rgb(70,50,30):rgb(116,84,50));}
function drawAxe(x,y,spin){const ca=Math.cos(spin),sa=Math.sin(spin);
  for(let k=-3;k<=4;k++)pix(x+ca*k,y+sa*k,rgb(110,80,50)); // haft
  for(let k=-3;k<=3;k++){const d=4.5+(3-Math.abs(k))*.5;for(let w=3;w<=d;w+=.5)pix(x+ca*w-sa*k,y+sa*w+ca*k,Math.abs(k)===3||w>=d-.4?rgb(230,238,255):rgb(170,184,206),rgb(90,140,255));}}
function drawEnemy(e){
  const d=e.def,sp=d.sprite,sw=sp[0].length,sh=sp.length,S=d.scale||1,x0=e.x-sw*S/2,y0=e.y-sh*S/2+(d.fly?Math.round(Math.sin(e.t*.12+e.x*.1)):0);
  const walk=!d.fly&&e.ground&&Math.abs(e.vx)>.12,ph=e.t*(S>1?.16:.32),legY=Math.floor(sh*.62);
  const off=(x,y)=>{if(!walk||y<legY)return 0;const side=x<sw/2?1:-1,k=(y-legY+1)/(sh-legY);return Math.round(Math.sin(ph)*side*k*1.8*S);};
  const bob=walk&&Math.abs(Math.cos(ph*2))>.75?S:0;
  if(SET.ink){const k0=rgb(20,17,15);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){if(sp[y][e.face>0?x:sw-1-x]==='.')continue;const X=x0+x*S+off(x,y),Y=y0+y*S+(y<legY?bob:0);
    for(let k=0;k<S;k++){pix(X-1,Y+k,k0);pix(X+S,Y+k,k0);pix(X+k,Y-1,k0);pix(X+k,Y+S,k0);}}}
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const ch=sp[y][e.face>0?x:sw-1-x];if(ch==='.')continue;const c=d.pal[ch];
    const cc=e.flash?rgb(255,255,255):e.frozen>0?rgb(((c&255)+380)/3,(((c>>8)&255)+460)/3,(((c>>16)&255)+500)/3):c,g=d.glow.includes(ch)?c:0,X=x0+x*S+off(x,y),Y=y0+y*S+(y<legY?bob:0);
    for(let a=0;a<S;a++)for(let b=0;b<S;b++)pix(X+a,Y+b,cc,g);}
  if(e.hp<d.hp&&!d.title){const w=Math.max(4,sw*S),f=Math.max(0,e.hp/d.hp);for(let k=0;k<w;k++)pix(x0+k,y0-3,k<w*f?rgb(255,70,60):rgb(60,20,20));}
}
const flick=new Float32Array(256);
const htm=new Uint8Array(VW*VH);for(let y=0;y<VH;y++)for(let x=0;x<VW;x++){const ox2=(y>>2)&1?2:0,dx=((x+ox2)&3)-1.5,dy=(y&3)-1.5;htm[y*VW+x]=dx*dx+dy*dy<1.8?1:0;}
function render(){
  CX=camX|0;CY=camY|0;
  gbuf.fill(0);const ink=SET.ink;let nFire=0,nLava=0;
  const fl=frame, fx0=(CX*PAR)|0, fyo=(CY*.5)|0;
  for(let i=0;i<256;i++)flick[i]=R();
  let fi=0;
  for(let sy=0;sy<VH;sy++){
    const wy=sy+CY;let i=wy*W+CX,o=sy*VW;const frow=(Math.min(H-1,sy+fyo))*FW+fx0;
    for(let sx=0;sx<VW;sx++,i++,o++){
      const m=t[i];
      if(m===0){const b=bg[i];if(b)buf[o]=lut(bgL,b);else{const f=far[frow+sx];buf[o]=ink&&!htm[o]&&!farKeep[frow+sx]?lut(htL,f):f;}continue;}
      switch(m){
        case FIRE:{nFire++;const l=life[i];const c=rgb(255,90+Math.min(160,l*4)+(flick[fi++&255]*30|0),20+(flick[fi++&255]*30|0));buf[o]=c;gbuf[o]=c;break;}
        case GFIRE:{nFire++;const f=flick[fi++&255];const c=f<.3?rgb(200,255,210):f<.7?rgb(60,255,100):rgb(20,180,60);buf[o]=c;gbuf[o]=c;break;}
        case LAVA:{nLava++;const f=Math.sin(i*.37+fl*.05)*25;buf[o]=rgb(240,90+f,20);gbuf[o]=rgb(200,60,10);break;}
        case EMBER:{const c=rgb(255,100+life[i]*.6,30);buf[o]=c;gbuf[o]=c;break;}
        case ICE:{let c=col[i];if(ink&&t[i-W]===0)c=lut(rimL,c);buf[o]=lut(fgL,c);if(((i*7+(fl>>2))&127)===0)gbuf[o]=rgb(120,180,230);break;}
        case NEON:{const c=col[i];buf[o]=c;gbuf[o]=rgb((c&255)*.7,((c>>8)&255)*.7,((c>>16)&255)*.7);break;}
        case ACID:{buf[o]=col[i];if((i+fl)%7===0)gbuf[o]=rgb(60,140,20);break;}
        case SMOKE:case STEAM:case PROPANE:{
          const a=m===PROPANE?.35:Math.min(1,life[i]/60),c=col[i],b0=bg[i],b=b0?b0:far[frow+sx];
          buf[o]=rgb((c&255)*a+(b&255)*(1-a),((c>>8)&255)*a+((b>>8)&255)*(1-a),((c>>16)&255)*a+((b>>16)&255)*(1-a));break;}
        case GLASS:{const c=col[i],b0=bg[i],b=b0?b0:far[frow+sx];buf[o]=rgb(((c&255)+(b&255))>>1,(((c>>8)&255)+((b>>8)&255))>>1,(((c>>16)&255)+((b>>16)&255))>>1);break;}
        default:{let c=col[i];
          if(ink){const k=KIND[m];if(k!==G){const up=t[i-W];
            if(up===0||KIND[up]===G||KIND[up]===F)c=lut(rimL,c); // lit top edge
            else if(k===S&&(t[i+W]===0||t[i-1]===0||t[i+1]===0))c=lut(inkL,c);}} // ink outline
          buf[o]=lut(fgL,c);}
      }
    }
  }
  ambFire=nFire;ambLava=nLava;
  if(storm){const k=Math.min(1,storm.life/60);for(let sy=0;sy<VH;sy++){const a=(1-sy/VH)*.45*k;if(a<.02)break;for(let sx=0;sx<VW;sx++){const o=sy*VW+sx,c=buf[o];buf[o]=rgb((c&255)*(1-a)+12*a,((c>>8)&255)*(1-a)+14*a,((c>>16)&255)*(1-a)+28*a);}}}
  // falling chunks
  for(const b of bodies){
    const rr=Math.ceil(b.rmax)+2;if(b.x-rr>CX+VW||b.y-rr>CY+VH||b.x+rr<CX||b.y+rr<CY)continue;
    const c=Math.cos(b.a),s=Math.sin(b.a);
    for(let Y=Math.max(CY,b.y-rr|0);Y<Math.min(CY+VH,b.y+rr+1);Y++)for(let X=Math.max(CX,b.x-rr|0);X<Math.min(CX+VW,b.x+rr+1);X++){
      const dx=X-b.x,dy=Y-b.y,lx=Math.round(dx*c+dy*s+b.cx),ly=Math.round(-dx*s+dy*c+b.cy);
      if(lx<0||ly<0||lx>=b.lw||ly>=b.lh)continue;const o=ly*b.lw+lx;if(!b.lm[o])continue;
      let bc=b.lc[o];if(ink&&(lx===0||ly===0||lx===b.lw-1||ly===b.lh-1||!b.lm[o-1]||!b.lm[o+1]||!b.lm[o-b.lw]||!b.lm[o+b.lw]))bc=lut(inkL,bc);
      const so=(Y-CY)*VW+(X-CX);buf[so]=lut(fgL,bc);if(b.held&&!b.overhead&&((lx+ly+frame)&7)===0)gbuf[so]=rgb(40,160,70);
    }
  }
  for(let n=0;n<np;n++){const c=pc[n],gl=pg[n]&1;pix(px[n],py[n],c,gl?c:0);const vx=pvx[n],vy=pvy[n];
    if(vx*vx+vy*vy>4.5){const c2=shade(c,.62);pix(px[n]-vx*.45,py[n]-vy*.45,c2,gl?c2:0);}} // motion streaks on fast debris and sparks
  // projectiles
  for(const s of shots){
    if(s.delay>0)continue;
    if(s.type!=='hammer'&&s.type!=='bomb'){const g=s.col?rgb(s.col[0]*.6,s.col[1]*.6,s.col[2]*.6):s.type==='missile'?rgb(255,150,60):rgb(60,200,90);line(s.x-s.vx*1.6,s.y-s.vy*1.6,s.x-s.vx*.3,s.y-s.vy*.3,g,g);}
    if(s.type==='missile'){pix(s.x,s.y,rgb(210,210,220));pix(s.x-s.vx*.3,s.y-s.vy*.3,rgb(140,140,150));pix(s.x-s.vx*.6,s.y-s.vy*.6,rgb(255,200,80),rgb(255,150,40));}
    else if(s.type==='hammer'){const ca=Math.cos(s.spin),sa=Math.sin(s.spin);for(let k=-2;k<=2;k++)for(let w=-1;w<=1;w++)pix(s.x+k*ca-w*sa,s.y+k*sa+w*ca,rgb(170,176,186),rgb(90,130,220));for(let k=2;k<5;k++)pix(s.x-k*sa,s.y+k*ca,rgb(110,80,50));}
    else if(s.type==='bomb'){for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)pix(s.x+xx,s.y+yy,rgb(70,70,80));pix(s.x,s.y-1,frame%10<5?rgb(255,80,60):rgb(80,20,20),frame%10<5?rgb(255,60,40):0);}
    else if(s.col){const c=rgb(s.col[0],s.col[1],s.col[2]),w=rgb(255,255,255);pix(s.x,s.y,w,c);pix(s.x+1,s.y,c,c);pix(s.x-1,s.y,c,c);pix(s.x,s.y+1,c,c);pix(s.x,s.y-1,c,c);}
    else{const c=rgb(220,255,225),r=s.type==='bolt'?2:1;for(let k=-r;k<=r;k++){pix(s.x+k,s.y,c,c);pix(s.x,s.y+k,c,c);}if(r>1){pix(s.x+1,s.y+1,c,c);pix(s.x-1,s.y-1,c,c);pix(s.x+1,s.y-1,c,c);pix(s.x-1,s.y+1,c,c);}}
  }
  // beams & arcs
  for(const b of beams){
    const c=rgb(b.c[0],b.c[1],b.c[2]),g=rgb(b.g[0],b.g[1],b.g[2]);
    if(b.pts){for(let k=1;k<b.pts.length;k++)line(b.pts[k-1][0],b.pts[k-1][1],b.pts[k][0],b.pts[k][1],c,g);}
    else{const w=b.w||1;const dx=b.x1-b.x0,dy=b.y1-b.y0,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
      for(let k=-w;k<=w;k++){const edge=Math.abs(k)===w;line(b.x0+nx*k,b.y0+ny*k,b.x1+nx*k,b.y1+ny*k,edge?g:c,g);}}
  }
  // drones
  for(const d of drones){for(let yy=0;yy<5;yy++)for(let xx=0;xx<7;xx++){const eye=yy===2&&(xx===2||xx===4);if((yy===0||yy===4)&&(xx===0||xx===6))continue;pix(d.x-3+xx,d.y-2+yy,eye?rgb(255,90,70):yy===0?rgb(150,158,170):rgb(100,108,120),eye?rgb(255,60,40):0);}}
  for(const e of enemies)drawEnemy(e);
  // ---- new power visuals: planted / falling / towed Mjolnir, Stormbreaker, thermite, the X-Jet, Iceman's decoy
  for(const P2 of pins)drawHammer(P2.x,P2.y-2,-Math.PI/2);
  for(const s of shots){if(s.type==='pin')drawHammer(s.x,s.y-2,-Math.PI/2);else if(s.type==='axe')drawAxe(s.x,s.y,s.spin);}
  if(pl_.tow&&pl_.grip)drawHammer(pl_.grip.x,pl_.grip.y,Math.atan2(-pl_.tow.dy,-pl_.tow.dx));
  for(const b of therm){const c=b.stuck?((frame+(b.x|0))&2?rgb(255,255,230):rgb(255,220,140)):rgb(255,240,200);pix(b.x,b.y,c,rgb(255,190,90));if(b.stuck){gaddS((b.x-CX)|0,(b.y-CY-1)|0,90,50,10);gaddS((b.x-CX+1)|0,(b.y-CY)|0,90,50,10);}}
  for(const j of jets)drawSprite(j.x,j.y+4,0,j.dir,false,JET_SPR,JET_PAL);
  if(decoy){drawSprite(decoy.x,decoy.y,0,decoy.face,false,SPR_ICE,DECOY_PAL);if(decoy.hp<decoy.max){const f=Math.max(0,decoy.hp/decoy.max);for(let k=-6;k<=6;k++)pix(decoy.x+k,decoy.y-SH-4,k+6<f*13?rgb(150,220,255):rgb(30,50,70));}}
  if(senseT>0)for(const e of enemies){const hw=e.def.w/2+3,hh=e.def.h/2+3,c=(frame>>2)&1?rgb(255,80,60):rgb(255,200,80);for(let k=-hw;k<=hw;k++){pix(e.x+k,e.y-hh,c,c);pix(e.x+k,e.y+hh,c,c);}for(let k=-hh;k<=hh;k++){pix(e.x-hw,e.y+k,c,c);pix(e.x+hw,e.y+k,c,c);}}
  if(pl_.spin>0){for(let k=0;k<3;k++){const an=frame*.7+k*2.09;for(let q2=0;q2<4;q2++){const a2=an-q2*.12;pix(pl_.x+Math.cos(a2)*13,pl_.y-PH/2+Math.sin(a2)*13,q2?rgb(120,170,255):rgb(200,206,216),rgb(90,130,220));}}}
  // gravity well: dark core + accretion ring
  if(vortex){const v=vortex,rr=7+Math.sin(frame*.2)*1.5;for(let y=-rr;y<=rr;y++)for(let x=-rr;x<=rr;x++)if(x*x+y*y<rr*rr)pix(v.x+x,v.y+y,rgb(4,10,6));
    for(let k=0;k<80;k++){const a=k/80*6.283+frame*.2;const r2=rr+1+Math.sin(a*3+frame*.3)*1.5;pix(v.x+Math.cos(a)*r2,v.y+Math.sin(a)*r2*.6,rgb(160,255,180),rgb(60,255,100));}}
  // orbital targeting
  for(const s of strikes)if(s.t>0){const r=6+s.t*.6;circle(s.x,mouse.wy,r,rgb(120,255,150),rgb(40,200,80));line(s.x,mouse.wy-r-4,s.x,mouse.wy+r+4,rgb(120,255,150),rgb(40,200,80));if(frame%6<3)line(s.x,CY,s.x,CY+VH,rgb(40,120,60),0);}
  // afterimages
  for(const a of afters)drawSprite(a.x,a.y,a.ang,a.face,true);
  // cape trail
  const p=pl_;
  if(CH.cape&&p.hist.length>3){const yo=PH-5;for(let k=1;k<Math.min(8,p.hist.length);k++){const [hx,hy]=p.hist[k];const wv=Math.sin(frame*.3+k)*1.2;pix(hx-p.face*(2+k*.4),hy-yo+k*.6+wv,k<4?CH.cape[0]:CH.cape[1]);pix(hx-p.face*(2+k*.4),hy-yo+1+k*.6+wv,CH.cape[1]);}}
  drawSprite(p.x,p.y+PP,p.ang,p.face,false,posePlayer(p),p.metal>0?metalPal():null,p.hurtF,p.stealth>0);
  const h=hand();
  if(CH.id==='thor'&&!p.tow&&!pins.length&&!shots.some(s=>s.type==='hammer'||s.type==='pin')){for(let yy=0;yy<3;yy++)pix(h.x,h.y+yy,rgb(110,80,50));for(let yy=-2;yy<0;yy++)for(let xx=-1;xx<=1;xx++)pix(h.x+xx,h.y+yy,rgb(160,166,176));}
  else if(CH.id!=='hulk')pix(h.x,h.y,glowRGB(),glowRGB());
  if(mouse.down&&GS==='play'&&CH.id!=='hulk'){const gc=CH.glow,c=rgb(gc[0],gc[1],gc[2]),rr=4.5+Math.sin(frame*.4);for(let k=0;k<6;k++){const a=k/6*6.283+frame*.18;pix(h.x+Math.cos(a)*rr,h.y+Math.sin(a)*rr,c,c);pix(h.x+Math.cos(a+.25)*rr,h.y+Math.sin(a+.25)*rr,c,c);}}
  if(shieldOn){const r=17;for(let k=0;k<120;k++){const a=k/120*6.283;const rr=r+Math.sin(a*8+frame*.4)*.7;const hex=(k+(frame>>2))%10<5;pix(p.x+Math.cos(a)*rr,p.y-8+Math.sin(a)*rr,hex?rgb(...shieldC[0]):rgb(...shieldC[1]),rgb(...shieldC[2]));}
    for(let k=0;k<12;k++){const a=R()*6.283,rr=R()*r;gaddS((p.x+Math.cos(a)*rr-CX)|0,(p.y-8+Math.sin(a)*rr-CY)|0,shieldC[2][0]/6,shieldC[2][1]/6,shieldC[2][2]/6);}}
  for(const r of rings){const a=Math.min(1,r.life/10),c=rgb(r.c[0]*a,r.c[1]*a,r.c[2]*a);if(ink&&r.r>5)circle(r.x,r.y,r.r+1,rgb(20,17,15),0);circle(r.x,r.y,r.r,c,c);if(r.r>8)circle(r.x,r.y,r.r-1,c,c);}
  for(const f of flashes){const k=f.life/f.max,rr=f.r|0,sx=(f.x-CX)|0,sy=(f.y-CY)|0;
    for(let y=-rr;y<=rr;y+=2)for(let x=-rr;x<=rr;x+=2){const d=Math.sqrt(x*x+y*y)/rr;if(d>=1)continue;const s=(1-d)*(1-d)*k*.9;const r=f.c[0]*s,g=f.c[1]*s,b=f.c[2]*s;gaddS(sx+x,sy+y,r,g,b);gaddS(sx+x+1,sy+y,r,g,b);gaddS(sx+x,sy+y+1,r,g,b);gaddS(sx+x+1,sy+y+1,r,g,b);}}
  if(stasis){const s=stasis,r=s.r,x0=Math.max(0,(s.x-r-CX)|0),x1=Math.min(VW-1,(s.x+r-CX)|0),y0=Math.max(0,(s.y-r-CY)|0),y1=Math.min(VH-1,(s.y+r-CY)|0),k=Math.min(1,s.life/30);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x+CX-s.x,dy=y+CY-s.y,d2=dx*dx+dy*dy;if(d2>r*r)continue;const o=y*VW+x,c=buf[o],l=lumC(c),a=.35*k;
      buf[o]=rgb((c&255)*(1-a)+(l*.7+90)*a,((c>>8)&255)*(1-a)+(l*.5+40)*a,((c>>16)&255)*(1-a)+(l*.7+110)*a);if(d2>(r-2)*(r-2)&&((x+y+(frame>>1))&3)){buf[o]=rgb(255,170,235);gbuf[o]=rgb(160,60,140);}}}
  if(SPAWN.tool&&GS==='play'){const T=SPAWN.tool,x=mouse.wx,y=mouse.wy,c=(frame>>3)&1?rgb(255,201,60):rgb(226,59,46);
    if(T.cat==='enemies'){const d=ENEMY_TYPES[T.id];if(d){const hw=d.w/2+1,hh=d.h/2+1;for(let k=-hw;k<=hw;k+=2){pix(x+k,y-hh,c,c);pix(x+k,y+hh,c,c);}for(let k=-hh;k<=hh;k+=2){pix(x-hw,y+k,c,c);pix(x+hw,y+k,c,c);}}}
    else if(T.cat==='objects'){const gy=SPAWN.snap?groundBelow(x,y):y;for(let k=-8;k<=8;k++)pix(x+k,gy,c,c);for(let yy=y;yy<gy;yy+=3)pix(x,yy,c,0);}
    else circle(x,y,SPAWN.brush+.5,c,0);}
  sctx.putImageData(img,0,0);if(SET.bloom||GL&&SET.light)gctx.putImageData(gimg,0,0);
  const sk=SET.shake/100,sx=(R()-.5)*shake*scale*.5*sk,sy=(R()-.5)*shake*scale*.5*sk;shake*=.88;if(shake<.2)shake=0;
  if(GL){presentGL(ox+sx,oy+sy,VW*scale,VH*scale,scale,{bloom:SET.bloom,light:SET.light,time:performance.now()/1000,ca:SET.fx?Math.min(4,caPulse):0,haze:SET.fx?.6:0,
      waves:SET.fx?waves.map(w=>({x:w.x-CX,y:w.y-CY,r:w.r,s:w.s*Math.min(1,w.life/12)})):null,tint:slowT>0?[.72,.88,1.3,.6]:SPAWN.pause?[.8,.86,1.05,.45]:null,
      heat:heatZ&&SET.fx?[heatZ.x-CX,heatZ.y-CY,heatZ.r*1.3,Math.min(1,heatZ.life/40)*1.2]:null});ctx.clearRect(0,0,cv.width,cv.height);} // WebGL draws the frame + bloom under the 2D overlay
  else{ // 2D-canvas fallback
    bctx.clearRect(0,0,VW/2,VH/2);bctx.filter='blur(3px)';bctx.drawImage(glc,0,0,VW/2,VH/2);bctx.filter='none';
    ctx.fillStyle='#050806';ctx.fillRect(0,0,cv.width,cv.height);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(sim,ox+sx,oy+sy,VW*scale,VH*scale);
    ctx.globalCompositeOperation='lighter';ctx.imageSmoothingEnabled=true;
    if(SET.bloom){ctx.globalAlpha=.95;ctx.drawImage(blur,ox+sx,oy+sy,VW*scale,VH*scale);ctx.globalAlpha=.35;ctx.drawImage(glc,ox+sx,oy+sy,VW*scale,VH*scale);}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
  drawComics(sx,sy);
  // minimap
  if(frame%15===0){for(let y=0;y<H/8;y++)for(let x=0;x<W/8;x++){const i=(y*8+4)*W+x*8+4,m=t[i];mbuf[y*(W/8)+x]=m?col[i]:(bg[i]?bg[i]:rgb(20,24,40));}mctx.putImageData(mimg,0,0);}
  const mw=W/8*1.2,mh=H/8*1.2,mx=cv.width-mw-16,my=100;
  if(GS==='menu'||GS==='over')return;
  ctx.fillStyle='#14110f';ctx.fillRect(mx+3,my+3,mw+4,mh+4);ctx.drawImage(mm,mx,my,mw,mh);ctx.strokeStyle='#ffc93c';ctx.lineWidth=2;ctx.strokeRect(mx+CX/8*1.2,my+CY/8*1.2,VW/8*1.2,VH/8*1.2);ctx.strokeStyle='#14110f';ctx.lineWidth=3;ctx.strokeRect(mx-1,my-1,mw+2,mh+2);
  for(const e of enemies){const b=!!e.def.title;ctx.fillStyle=e.ally>0?'#ff9ad8':b?'#c88cff':'#ff6b5c';const s2=b?4:2;ctx.fillRect(mx+e.x/8*1.2-s2/2,my+e.y/8*1.2-s2/2,s2,s2);} // enemies on the minimap
  ctx.fillStyle='#e23b2e';ctx.fillRect(mx+p.x/8*1.2-1.5,my+p.y/8*1.2-3,3,3);
}

// ================= HUD / input =================
const pwDiv=document.getElementById('powers');
const PKEYS=['1','2','3','4','5','6','7','8','9','0','-','='];
function buildPowerBar(){pwDiv.innerHTML='';CH.powers.forEach((pw,i)=>{const d=document.createElement('div');d.className='pw';const k=document.createElement('i');k.textContent=PKEYS[i];d.appendChild(k);d.appendChild(document.createTextNode(pw.n.toUpperCase()));const f=document.createElement('span');f.className='cdf';d.appendChild(f);pwDiv.appendChild(d);});selPower(cur);}
function selPower(i){const n=CH.powers.length;cur=((i%n)+n)%n;[...pwDiv.children].forEach((d,k)=>d.classList.toggle('on',k===cur));}
const charSel=document.getElementById('char');
CHARS.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;charSel.appendChild(o);});
charSel.onchange=()=>{setChar(CHARS.findIndex(c=>c.id===charSel.value));charSel.blur();};
setChar(0);
document.getElementById('wavebtn').onclick=e=>{startWave();e.target.blur();};
const mapSel=document.getElementById('map');
// maps: id -> {name, gen, amb (optional per-tick ambience)}
const MAPDEFS={city:{name:'City',gen:genCity},nyc:{name:'New York',gen:genNYC},nyc2099:{name:'NYC 2099',gen:genNYC2099,amb:amb2099,rain:true},forest:{name:'Forest',gen:genForest},xmansion:{name:'X-Mansion',gen:genXMansion},
  savage:{name:'Savage Land',gen:genSavageLand,amb:ambSavage},arctic:{name:'Weapon X',gen:genArctic,amb:ambArctic,wind:true}};
for(const id in MAPDEFS){const o=document.createElement('option');o.value=id;o.textContent=MAPDEFS[id].name;mapSel.appendChild(o);}
function shadeWorld(){
  for(let x=0;x<W;x++){let depth=-1;
    for(let y=0;y<H;y++){const i=y*W+x,m=t[i];
      if(KIND[m]===S&&NAT[m]){depth++;const n=noise2(x,y,3.1);let k=1-Math.min(.45,depth/240)+n*.07;
        if((((y+(n*14|0))>>3)%5)===0)k*=.9; // strata bands
        if(m===GRASS&&depth<2)k*=1.18;
        const c=col[i];col[i]=rgb(cl((c&255)*k),cl(((c>>8)&255)*k),cl(((c>>16)&255)*k));}
      else if(m===0||KIND[m]!==S)depth=-1;}}
}
let R0gen=1; // pieces registered at generation time have rid < R0gen (Wrecking Crew counts what is still standing)
function countBuilt(){let n=0;for(let i=0;i<N;i++){const m=t[i];if(KIND[m]===S&&!NAT[m]&&m!==LEAF&&rid[i]>0&&rid[i]<R0gen)n++;}return n;}
function regen(){
  np=0;ACT.length=0;slide.length=0;shots.length=0;drones.length=0;strikes.length=0;vortex=null;held=null;heldE=null;storm=null;clearEnemies();
  pins.length=0;therm.length=0;jets.length=0;waves.length=0;comics.length=0;impactF=0;hurtV=0;decoy=null;stasis=null;slowT=0;heatZ=null;
  Object.assign(pl_,{script:0,ball:0,tow:null,grip:null,cling:0,crouch:0,stealth:0,grit:0,dodge:0,sprint:0,leap:false,slam:false});wave=0;SPAWNX=50;booms.length=0;rings.length=0;flashes.length=0;beams.length=0;afters.length=0;
  pin.fill(0);str.fill(10);rid.fill(0);rcount.length=1;PIN2=null;genMode=true;(MAPDEFS[mapSel.value]||MAPDEFS.city).gen();genMode=false;
  for(let i=0;i<N;i++)bgB[i]=bg[i]!==bgD[i]?1:0;
  // streets, decks and tunnel shells: built runs wider than any building act as ground, so buildings stand on them
  for(let i=0;i<N;i++)gnd[i]=NAT[t[i]];
  for(let y=0;y<H;y++){let a=0;for(let x=0;x<=W;x++){const ok=x<W&&KIND[t[y*W+x]]===S&&!NAT[t[y*W+x]]&&t[y*W+x]!==LEAF;if(ok)continue;if(x-a>200)for(let k=a;k<x;k++)gnd[y*W+k]=1;a=x+1;}}
  // drop generated specks: solid pixels with no solid neighbour would just hang in the air
  for(let i=W;i<N-W;i++){if(KIND[t[i]]!==S)continue;if(KIND[t[i-1]]!==S&&KIND[t[i+1]]!==S&&KIND[t[i-W]]!==S&&KIND[t[i+W]]!==S)t[i]=0;}
  shadeWorld();
  // generated floaters: specks vanish, bigger pieces drop as soon as play starts (anchor pass)
  unq.length=0;
  nxt.fill(1);
  dx0=0;dy0=0;dx1=W-1;dy1=H-1;supportCheck(true);
  dx0=0;dy0=0;dx1=W-1;dy1=H-1; // whole map gets one runtime pass on the first tick: anything left floating falls
  R0gen=rcount.length;
  applyTOD();
  spawnPlayer();
}
document.getElementById('regen').onclick=e=>{regen();e.target.blur();};
mapSel.onchange=()=>{regen();mapSel.blur();};
const helpEl=document.getElementById('help');
document.getElementById('helpbtn').onclick=e=>{helpEl.style.display=helpEl.style.display==='none'?'':'none';e.target.blur();};
const KEYMAP={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Digit6:5,Digit7:6,Digit8:7,Digit9:8,Digit0:9,Minus:10,Equal:11};
const MAPS=Object.keys(MAPDEFS);
addEventListener('keydown',e=>{
  const setOpen=!$('settings').classList.contains('hidden');
  if(e.code==='Escape'){if(setOpen)closeSettings();else if(GS==='play'&&spawnUI&&spawnUI.isOpen()){spawnUI.close();}else if(GS==='play')pauseRun();else if(GS==='pause')resumeRun();e.preventDefault();return;}
  if(GS==='menu'&&!setOpen&&e.code==='Enter'){playFromMenu();return;}
  if(GS!=='play')return;
  if(!keys[e.code])pressed[e.code]=true;keys[e.code]=true;
  const sb=MODE&&MODE.sandbox;
  if(e.code in KEYMAP&&KEYMAP[e.code]<CH.powers.length)selPower(KEYMAP[e.code]);
  if(sb&&e.code==='KeyC')setChar(CHARS.indexOf(CH)+(e.shiftKey?-1:1));if(sb&&e.code==='KeyN')startWave();if(sb&&e.code==='KeyK')clearEnemies();
  if(sb&&e.code==='KeyB')spawnUI.toggle();
  if(sb&&e.code==='BracketLeft'){SPAWN.brush=Math.max(1,SPAWN.brush-1);spawnUI.setBrush(SPAWN.brush);}if(sb&&e.code==='BracketRight'){SPAWN.brush=Math.min(14,SPAWN.brush+1);spawnUI.setBrush(SPAWN.brush);}
  if(e.code==='KeyQ')selPower(cur-1);if(e.code==='KeyE')selPower(cur+1);
  if(sb&&e.code==='KeyR')regen();if(sb&&e.code==='KeyM'){mapSel.value=MAPS[(MAPS.indexOf(mapSel.value)+1)%MAPS.length];regen();}
  if(e.code==='KeyH')helpEl.style.display=helpEl.style.display==='none'?'':'none';
  if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.down=false;if(GS==='play'&&MODE&&!MODE.sandbox)pauseRun();}); // never lose a run to an alt-tab
cv.addEventListener('mousemove',e=>{mouse.sx=(e.clientX-ox)/scale;mouse.sy=(e.clientY-oy)/scale;});
cv.addEventListener('mousedown',e=>{if(e.button===0)mouse.down=true;if(e.button===2)mouse.right=true;});
addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;if(e.button===2)mouse.right=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{selPower(cur+(e.deltaY>0?1:-1));e.preventDefault();},{passive:false});

const waveTEl=document.getElementById('waveT'),scoreNEl=document.getElementById('scoreN'),scoreSEl=document.getElementById('scoreS'),waveEl=document.getElementById('wave'),hpEl=document.getElementById('hp'),enEl=document.getElementById('en'),fpsEl=document.getElementById('fps'),modeEl=document.getElementById('mode');
let last=performance.now(),acc=0,fpsT=0,fpsN=0,fps=60,simMs=0,frameMs=0;
function tick(){
  shieldOn=false;
  updCamera();
  if(mouse.right&&SPAWN.tool){SPAWN.tool=null;spawnUI&&spawnUI.select(null);}
  if(!mouse.down){SPAWN.latch=false;SPAWN.lx=SPAWN.ly=null;}
  if(mouse.down){if(SPAWN.tool)useTool();else cast();}if(cd>0)cd--;
  updTelekinesis();
  const world=!(slowT>0&&(slowT--&1))&&!SPAWN.pause; // Tactical Focus runs the world at half speed; the spawn menu can freeze it
  updPlayer();updShots(world);
  if(world){updDrones();updVortex();updStrikes();updStorm();updEnemies();updJets();}
  updPins();updTherm();updDecoy();
  for(let n=ACT.length-1;n>=0;n--)if(ACT[n]()===false)ACT.splice(n,1);
  if(world)updSlide();
  if(MODE&&MODE.update){MODE.update(MS);MS.t++;}
  const md=MAPDEFS[mapSel.value];if(md&&md.amb&&world)md.amb();
  const t0=performance.now();
  if(world){updStasis();step();updBodies();if(frame%4===0)supportCheck(false);}
  simMs=simMs*.95+(performance.now()-t0)*.05;
  if(world)updParticles();
  updFx();updWaves();
  for(const k in pressed)pressed[k]=false;
}
function loop(now){
  const dt=Math.min(100,now-last);last=now;acc+=dt;
  const a=performance.now();
  let n=0;if(GS==='play'){if(hitstop>0&&acc>=1000/60){hitstop--;acc=0;}else{while(acc>=1000/60&&n<2){if(!SPAWN.slow||(++slowTk&1))tick();acc-=1000/60;n++;}if(n===2)acc=0;}}else acc=0;
  render();
  tickAudio();
  if(SET.sound){const on=GS==='play'||GS==='menu',md=MAPDEFS[mapSel.value];
    ambience('fire',on?Math.min(1,ambFire/350):0);ambience('lava',on?Math.min(1,ambLava/1400):0);
    ambience('rain',on&&(storm||(md&&md.rain))?(storm?1:.6):0);ambience('wind',on&&md&&md.wind?.5:0);}
  else{ambience('fire',0);ambience('lava',0);ambience('rain',0);ambience('wind',0);}
  frameMs=frameMs*.95+(performance.now()-a)*.05;
  fpsN++;fpsT+=dt;if(fpsT>=500){fps=fpsN*1000/fpsT;fpsN=0;fpsT=0;}
  hpEl.style.width=Math.max(0,pl_.hp/CH.hp*100)+'%';enEl.style.width=Math.max(0,pl_.en)+'%';
  {const tc=$('toolchip'),T=SPAWN.tool,st=[SPAWN.pause&&'PHYSICS PAUSED',SPAWN.slow&&'SLOW MOTION',SPAWN.god&&'GOD MODE',SPAWN.inf&&'INFINITE ENERGY',SPAWN.peace&&'PEACEFUL'].filter(Boolean);
   const txt=T?'PLACING '+T.label.toUpperCase()+' · RIGHT-CLICK CANCELS'+(T.kind==='paint'||T.id==='boom'||T.id==='boulder'?' · [ ] BRUSH '+SPAWN.brush:''):st.join(' · ');tc.style.display=txt&&GS==='play'?'block':'none';if(tc.textContent!==txt)tc.textContent=txt;}
  {const d=pwDiv.children[cur],f=d&&d.lastChild;if(f&&f.className==='cdf')f.style.width=(cd>0?Math.min(100,cd/cdMax*100):0)+'%';}
  {const p=pl_;modeEl.textContent='· '+(p.ball?'WRECKING BALL':p.tow?'HAMMER TOW':p.stealth>0?'CLOAKED':p.grit>0?'UNKILLABLE':slowT>0?'FOCUS':p.cling?'CLIMB':p.crouch>6?(p.crouch>=56?'LEAP READY':'CHARGING'):
    p.fly?(CH.id==='iceman'?(p.boost>0?'ICE RUSH':'ICE SLIDE'):p.boost>0?'BOOST':'FLYING'):p.charge>0?'CHARGE':p.leap?'LEAP':p.slam?'SLAM':(p.sprint||0)>40?'SPRINT':'WALK');}
  waveTEl.textContent=wave>0?'WAVE '+wave:(MODE?MODE.name.toUpperCase():'');
  waveEl.textContent=MODE&&MODE.hud?MODE.hud(MS):`enemies ${enemies.length+spawnQ.length}`;
  scoreNEl.textContent=score.toLocaleString();scoreSEl.textContent=`SCORE · ${kills} KILLS`;
  fpsEl.textContent=`${fps.toFixed(0)} fps · sim ${simMs.toFixed(1)} ms · frame ${frameMs.toFixed(1)} ms · world ${W}x${H} · chunks falling ${bodies.length} · particles ${np}`;
  requestAnimationFrame(loop);
}

// ================= game modes =================
// Framework. To add a mode, call defineMode(id, def) — the menu picks it up automatically:
//   name, sub, desc   menu text
//   map               fixed map id (omit to let the player choose)
//   sandbox           true: free-play keys stay on (N wave, K clear, M/R map, C hero)
//   setup(s)          once at start; s is this run's state ({t} ticks so far, add your own fields)
//   update(s)         every tick while playing
//   onKill(e,s)       an enemy died
//   onDeath(s)        the player died; return true to stop the normal respawn
//   hud(s)            HUD status line
//   result(s)         {title, lines:[...]} for the game-over screen (score is the global score)
// Helpers: queueWave([[type,count],...],gap), banner(title,sub), endRun(), bossBar(enemy|null),
//          bestOf(id), CH (current hero), kills, score
const MODES={};let MODE=null,MS=null,GS='menu',RUN=null;
function defineMode(id,def){MODES[id]=Object.assign({id,name:id,sub:'',desc:''},def);}
const $=id=>document.getElementById(id);
function bestOf(id){try{return +(localStorage.getItem('ironsorc.best.'+id)||0);}catch(e){return 0;}}
function saveBest(id,v){try{localStorage.setItem('ironsorc.best.'+id,String(v));}catch(e){}}
let bannerT=0;
function banner(ti,sub){snd('wave',camX+VW/2,camY+VH/2,{v:.8,gap:.5});const b=$('banner');$('bT').textContent=ti;$('bS').textContent=sub||'';b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');b.style.opacity=1;clearTimeout(bannerT);bannerT=setTimeout(()=>{b.style.opacity=0;},2400);}
function bossBar(e){const el=$('bossbar');if(!e){el.style.display='none';return;}el.style.display='block';$('bossN').textContent=e.def.title||'ULTRON PRIME';$('bossF').style.width=Math.max(0,e.hp/e.def.hp*100)+'%';}
function overlay(id){for(const o of ['menu','pause','over','settings'])$(o).classList.toggle('hidden',o!==id);document.body.classList.toggle('ui-off',id==='menu'||id==='over'||(id==='settings'&&setFrom==='menu'));}
function startRun(modeId,hero,map){
  MODE=MODES[modeId];RUN={mode:modeId,hero,map};
  resetSpawn();
  document.body.classList.toggle('sandbox',!!MODE.sandbox);
  mapSel.value=MODE.map||map||'city';regen();setChar(hero);pl_.hp=CH.hp;pl_.en=100;
  kills=0;score=0;wave=0;MS={t:0};for(const k in pressed)pressed[k]=false;for(const k in keys)keys[k]=false;mouse.down=false;
  helpEl.style.display=MODE.sandbox?'':'none'; // H still toggles it
  bossBar(null);if(MODE.setup)MODE.setup(MS);
  overlay(null);GS='play';
}
function endRun(){
  GS='over';const id=MODE.id,res=MODE.result?MODE.result(MS):{title:'RUN OVER',lines:[]},best=bestOf(id),nb=score>best;
  if(nb)saveBest(id,score);
  $('overT').textContent=res.title;
  const L=$('overL');L.innerHTML='';
  for(const [label,val,hot] of [...(res.stats||[]),['SCORE',score.toLocaleString(),1]]){const d=document.createElement('div');d.className='stat';const b=document.createElement('b');b.textContent=val;if(hot)b.style.color='#e23b2e';const sp=document.createElement('span');sp.textContent=label;d.append(b,sp);L.appendChild(d);}
  $('overB').textContent=nb?'NEW BEST!':'BEST '+best.toLocaleString();
  overlay('over');
}
function pauseRun(){GS='pause';overlay('pause');}
function resumeRun(){GS='play';overlay(null);for(const k in keys)keys[k]=false;}
// ---- main menu
const SEL={mode:'robots2099',hero:0,map:'nyc'};
function buildMenu(){
  const mk=(parent,cls,parts,on,click,disabled,bgc,fg)=>{const d=document.createElement('button');d.className=cls+(on?' on':'');d.disabled=!!disabled;
    for(const [tag,cl2,txt] of parts){const e=document.createElement(tag);if(cl2)e.className=cl2;e.textContent=txt;d.appendChild(e);}
    if(bgc){d.style.background=bgc;d.style.color=fg||'#fff8e8';}d.onclick=click;parent.appendChild(d);};
  $('modes').innerHTML='';for(const id in MODES){const m=MODES[id],b=bestOf(id);
    mk($('modes'),'card mode',[['b','',m.name.toUpperCase()],['span','sub',m.sub.toUpperCase()],['span','desc',m.desc],...(b?[['span','best','BEST '+b.toLocaleString()]]:[])],SEL.mode===id,()=>{SEL.mode=id;buildMenu();});}
  $('heroes').innerHTML='';CHARS.forEach((c,i)=>mk($('heroes'),'card',[['b','',c.name.toUpperCase()],['span','sub',`${c.hp} HP · ${MOVE_TAG[c.id]||(c.fly?'FLIES':'LEAPS')}`]],SEL.hero===i,()=>{SEL.hero=i;buildMenu();},false,HERO_UI[c.id],HERO_DARK.has(c.id)?'#14110f':null));
  const fixed=MODES[SEL.mode].map;
  $('maps').innerHTML='';for(const id in MAPDEFS)mk($('maps'),'chip',[['span','',MAPDEFS[id].name.toUpperCase()]],fixed?fixed===id:SEL.map===id,()=>{SEL.map=id;buildMenu();},fixed&&fixed!==id);
}
// ---- settings panel
let setFrom='menu';
function openSettings(from){setFrom=from;syncSettings();overlay('settings');}
function closeSettings(){overlay(setFrom);}
function syncSettings(){$('svol').value=SET.vol;$('ssound').checked=SET.sound;$('sfx').checked=SET.fx;$('slight').checked=SET.light;setVolume(SET.vol/100*.9);setMuted(!SET.sound);$('sdim').value=SET.dim;$('sshake').value=SET.shake;$('swords').checked=SET.words;$('sink').checked=SET.ink;$('sbloom').checked=SET.bloom;$('sfps').checked=SET.fps;
  for(const b of document.querySelectorAll('.tod'))b.classList.toggle('on',b.dataset.tod===SET.tod);document.body.classList.toggle('showfps',SET.fps);}
for(const b of document.querySelectorAll('.tod'))b.onclick=()=>{SET.tod=b.dataset.tod;saveSet();applyTOD();syncSettings();};
$('sdim').oninput=e=>{SET.dim=+e.target.value;saveSet();applyTOD();};
$('sshake').oninput=e=>{SET.shake=+e.target.value;saveSet();};
for(const [id,k] of [['swords','words'],['sink','ink'],['sbloom','bloom'],['sfps','fps'],['ssound','sound'],['sfx','fx'],['slight','light']])$(id).onchange=e=>{SET[k]=e.target.checked;saveSet();syncSettings();};
$('svol').oninput=e=>{SET.vol=+e.target.value;saveSet();setVolume(SET.vol/100*.9);};
$('svol').onchange=()=>snd('ui',camX+VW/2,camY+VH/2);
// browsers only allow audio after a user gesture
addEventListener('pointerdown',()=>initAudio(),true);addEventListener('keydown',()=>initAudio(),true);
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button,.card,.chip'))snd('ui',camX+VW/2,camY+VH/2,{gap:.03});},true);
$('sback').onclick=closeSettings;$('msettings').onclick=()=>openSettings('menu');$('psettings').onclick=()=>openSettings('pause');
function playFromMenu(){startRun(SEL.mode,SEL.hero,SEL.map);}
function showMenu(){GS='menu';MODE=null;MS=null;resetSpawn();document.body.classList.remove('sandbox');bossBar(null);buildMenu();overlay('menu');}
$('play').onclick=playFromMenu;
$('resume').onclick=resumeRun;
$('restart').onclick=()=>startRun(RUN.mode,RUN.hero,RUN.map);
$('retry').onclick=()=>startRun(RUN.mode,RUN.hero,RUN.map);
$('tomenu').onclick=showMenu;$('tomenu2').onclick=showMenu;
$('menubtn').onclick=e=>{e.target.blur();if(GS==='play')pauseRun();};

// ---- Sandbox: the free-play toybox
defineMode('sandbox',{name:'Sandbox',sub:'free play',desc:'Any map, any hero. B opens the spawn menu (enemies, objects, terrain, tools). N spawns a wave, K clears enemies, M/R swap or rebuild the map, C swaps hero.',sandbox:true});

// ---- Robot Uprising: endless robot waves over NYC 2099
defineMode('robots2099',{name:'Robot Uprising',sub:'NYC 2099 · wave survival',map:'nyc2099',
  desc:'Rogue machines pour out of the neon skyline. Survive endless waves; Ultron Prime arrives every 5th. 3 lives, heal between waves.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=180;s.boss=null;banner('NYC 2099','ROBOT UPRISING · get ready');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0)nextRobotWave(s);}
    else if(enemies.length===0&&spawnQ.length===0){
      const bonus=100*s.wave;score+=bonus;s.phase='break';s.timer=240;
      pl_.hp=Math.min(CH.hp,pl_.hp+CH.hp*.35);pl_.en=100;
      banner('WAVE '+s.wave+' CLEARED','+'+bonus+' bonus · repairs applied');}
    s.boss=enemies.find(e=>e.def.name==='ultron_prime')||null;bossBar(s.boss);
  },
  onKill(e,s){if(e.def.name==='ultron_prime'){score+=1000;shake=22;banner('ULTRON PRIME DOWN','+1000');}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('ARMOR BREACHED',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?'next wave in '+Math.ceil(s.timer/60)+'s':'robots left '+(enemies.length+spawnQ.length)} · lives ${s.lives}`;},
  result(s){return{title:'THE MACHINES WIN',stats:[['WAVE REACHED',s.wave],['ROBOTS SCRAPPED',kills]]};}
});
function nextRobotWave(s){
  s.wave++;wave=s.wave;s.phase='fight';const n=s.wave;
  const list=[['swarmbot',2+n*2],['ultron',Math.ceil(n*.6)]];
  if(n>=2)list.push(['mech',Math.floor((n-1)/2)]);
  if(n%5===0)list.push(['ultron_prime',1]);
  queueWave(list,18);
  banner('WAVE '+n,n%5===0?'ULTRON PRIME INCOMING':['Swarm detected','Mechs on the avenue','Drones over the skyways'][n%3]);
}

// ---- Sentinel Siege: giant Sentinels march on the X-Mansion
defineMode('sentinels',{name:'Sentinel Siege',sub:'X-Mansion · giant waves',map:'xmansion',
  desc:'Giant Sentinels march on the Xavier Institute. Hold the courtyard; Master Mold arrives every 5th wave. 3 lives, heal between waves.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=200;s.boss=null;banner('X-MANSION','SENTINEL SIEGE · protect the school');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0)nextSentinelWave(s);}
    else if(enemies.length===0&&spawnQ.length===0){
      const bonus=150*s.wave;score+=bonus;s.phase='break';s.timer=260;
      pl_.hp=Math.min(CH.hp,pl_.hp+CH.hp*.4);pl_.en=100;
      banner('WAVE '+s.wave+' REPELLED','+'+bonus+' bonus · the students are safe');}
    s.boss=enemies.find(e=>e.def.name==='master_mold')||null;bossBar(s.boss);
  },
  onKill(e,s){if(e.def.name==='master_mold'){score+=2500;shake=22;banner('MASTER MOLD DESTROYED','+2500');}
    else if(e.def.name==='sentinel'){fxWord(e.x,e.y-30,'SENTINEL DOWN!',1.4,'#ffc93c',true);hitstop=Math.max(hitstop,3);}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('MUTANT DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?'next wave in '+Math.ceil(s.timer/60)+'s':'sentinels left '+(enemies.length+spawnQ.length)} · lives ${s.lives}`;},
  result(s){return{title:'THE SENTINELS WIN',stats:[['WAVE REACHED',s.wave],['SENTINELS SCRAPPED',kills]]};}
});
function nextSentinelWave(s){
  s.wave++;wave=s.wave;s.phase='fight';const n=s.wave;
  const list=[['sentinel_scout',1+n],['sentinel',Math.ceil(n/2)]];
  if(n%5===0)list.push(['master_mold',1]);
  queueWave(list,40);
  banner('WAVE '+n,n%5===0?'MASTER MOLD APPROACHES':['Sentinels on the lawn','Mutant detection active','They are coming for the students'][n%3]);
}

// ---- Wrecking Crew: two minutes to level as much of the city as possible. Destruction keeps a combo going
defineMode('demolition',{name:'Wrecking Crew',sub:'score attack · 2 minutes',
  desc:'Level the city before the clock runs out. Every pixel of building you destroy scores; keep the carnage going to push the combo to x8. Toppled towers pay a bonus.',
  setup(s){s.time=120*60;s.base=countBuilt();s.last=s.base;s.combo=1;s.best=1;s.heat=0;s.topples=0;banner('WRECKING CREW','two minutes · level everything');},
  update(s){s.time--;
    if(s.t%20===0){const now=countBuilt(),d=Math.max(0,s.last-now);s.last=now;
      if(d>0){s.heat=Math.min(100,s.heat+d/45);score+=Math.round(d*s.combo);}
      s.heat=Math.max(0,s.heat-2.4);const c=1+Math.min(7,Math.floor(s.heat/12));
      if(c>s.combo){fxWord(pl_.x,pl_.y-PH-16,'x'+c+' COMBO!',1+c*.06,'#ffc93c',true);snd('charge',pl_.x,pl_.y,{pitch:.8+c*.1});}
      s.combo=c;s.best=Math.max(s.best,c);}
    if(s.time===600)banner('10 SECONDS','finish it!');
    if(s.time<=0)endRun();},
  onCollapse(n,s){s.topples++;const b=Math.round(n/2)*s.combo;score+=b;fxWord(pl_.x,pl_.y-PH-26,'TIMBER! +'+b,1.2,'#ffc93c',true);},
  hud(s){const pct=s.base?100*(1-s.last/s.base):0;return `${Math.ceil(Math.max(0,s.time)/60)}s · ${pct.toFixed(1)}% flattened · combo x${s.combo}`;},
  result(s){const pct=s.base?100*(1-s.last/s.base):0;return{title:pct>55?'CITY FLATTENED':'TIME UP',stats:[['FLATTENED',pct.toFixed(1)+'%'],['BEST COMBO','x'+s.best],['TOPPLED',s.topples]]};}
});

// ---- Boss Rush: the four big ones, back to back
const BOSSES=['juggernaut','ultron_prime','magneto','master_mold'];
function spawnBoss(type){const d=ENEMY_TYPES[type];for(let k=0;k<6;k++){const pos=spawnPoint(d);if(pos){const e=spawnEnemy(type,pos[0],pos[1]);if(e)return e;}}return spawnEnemy(type,Math.max(20,Math.min(W-20,pl_.x+180)),Math.max(30,pl_.y-120));}
defineMode('bossrush',{name:'Boss Rush',sub:'any map · four bosses',
  desc:'Juggernaut, Ultron Prime, Magneto and Master Mold, one after another. Heal between fights. 3 lives.',
  setup(s){s.lives=3;s.idx=-1;s.phase='break';s.timer=160;s.boss=null;banner('BOSS RUSH','four of the worst · one at a time');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0){s.idx++;if(s.idx>=BOSSES.length){s.won=true;endRun();return;}
        const b=BOSSES[s.idx];s.boss=spawnBoss(b);s.phase='fight';banner(ENEMY_TYPES[b].title,'boss '+(s.idx+1)+' of '+BOSSES.length);snd('boss',pl_.x,pl_.y,{v:.9});}}
    else{s.boss=enemies.find(e=>e.def.title)||null;bossBar(s.boss);
      if(!s.boss&&!spawnQ.length){const bonus=1500*(s.idx+1);score+=bonus;s.phase='break';s.timer=260;pl_.hp=Math.min(CH.hp,pl_.hp+CH.hp*.5);pl_.en=100;bossBar(null);
        for(const e of enemies){e.mem.noScore=true;e.hp=0;} // the minions scatter with their master
        banner(s.idx+1<BOSSES.length?'BOSS DOWN':'ALL BOSSES DOWN','+'+bonus+(s.idx+1<BOSSES.length?' · next one incoming':''));}}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('HERO DOWN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?(s.idx+1<BOSSES.length?'next boss in '+Math.ceil(s.timer/60)+'s':'victory!'):'boss '+(s.idx+1)+' of '+BOSSES.length} · lives ${s.lives}`;},
  result(s){return{title:s.won?'VICTORY!':'DEFEATED',stats:[['BOSSES BEATEN',s.won?BOSSES.length:Math.max(0,s.idx)],['TIME',Math.floor(s.t/60)+'s']]};}
});

// ---- Savage Land Swarm: the Brood pour out of the volcano caves; Hydra strike teams and Magneto join in
defineMode('savage',{name:'Savage Land Swarm',sub:'Savage Land · brood waves',map:'savage',
  desc:'Brood hives have hatched beneath the volcano. Survive waves of leaping aliens and Hydra jet-troopers; Magneto descends every 5th wave. 3 lives, heal between waves.',
  setup(s){s.lives=3;s.wave=0;s.phase='break';s.timer=200;s.boss=null;banner('SAVAGE LAND','THE BROOD ARE HATCHING');},
  update(s){
    if(s.phase==='break'){if(--s.timer<=0){s.wave++;wave=s.wave;s.phase='fight';const n=s.wave,list=[['brood',3+n*2]];if(n>=3)list.push(['hydra',Math.floor((n-1)/2)]);if(n%5===0)list.push(['magneto',1]);
        queueWave(list,16);banner('WAVE '+n,n%5===0?'MAGNETO DESCENDS':['They come from the caves','Watch the trees','Hydra strike team inbound'][n%3]);}}
    else if(enemies.length===0&&spawnQ.length===0){const bonus=120*s.wave;score+=bonus;s.phase='break';s.timer=240;pl_.hp=Math.min(CH.hp,pl_.hp+CH.hp*.35);pl_.en=100;banner('WAVE '+s.wave+' SURVIVED','+'+bonus+' bonus');}
    s.boss=enemies.find(e=>e.def.name==='magneto')||null;bossBar(s.boss);},
  onKill(e,s){if(e.def.name==='magneto'){score+=2000;shake=22;banner('MAGNETO RETREATS','+2000');}},
  onDeath(s){s.lives--;if(s.lives<=0){endRun();return true;}banner('OVERRUN',s.lives+(s.lives===1?' life':' lives')+' left');return false;},
  hud(s){return `${s.phase==='break'?'next wave in '+Math.ceil(s.timer/60)+'s':'brood left '+(enemies.length+spawnQ.length)} · lives ${s.lives}`;},
  result(s){return{title:'THE HIVE WINS',stats:[['WAVE REACHED',s.wave],['BROOD SQUASHED',kills]]};}
});

// ================= spawn menu (sandbox): place enemies, objects and terrain =================
let spawnUI=null,slowTk=0;
const prettyName=s=>s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const css=c=>`rgb(${c&255},${(c>>8)&255},${(c>>16)&255})`;
function iconSprite(sp,pal){return(x,S)=>{const sw=sp[0].length,sh=sp.length,k=Math.min((S-2)/sw,(S-2)/sh,4),ox=(S-sw*k)/2,oy=(S-sh*k)/2;
  for(let y=0;y<sh;y++)for(let i=0;i<sw;i++){const ch=sp[y][i];if(ch==='.'||pal[ch]===undefined)continue;x.fillStyle=css(pal[ch]);x.fillRect(ox+i*k,oy+y*k,Math.max(1,k),Math.max(1,k));}};}
function iconMat(m){return(x,S)=>{const d=MATS[m];for(let y=0;y<S;y+=2)for(let i=0;i<S;i+=2){const v=(Math.random()*2-1)*d[8];x.fillStyle=`rgb(${cl(d[5]+v)},${cl(d[6]+v)},${cl(d[7]+v)})`;x.fillRect(i,y,2,2);}
  x.strokeStyle='#14110f';x.lineWidth=2;x.strokeRect(1,1,S-2,S-2);};}
function iconRects(list){return(x,S)=>{for(const [c,a,b,w,h] of list){x.fillStyle=c;x.fillRect(a*S/16,b*S/16,w*S/16,h*S/16);}};}
function house1(x,GY){const w=30,h=30,top=GY-h,x1=x+w,wc=[[150,80,60],[200,190,160],[120,140,160],[180,150,90]][R()*4|0];
  fill(x,top,x+3,GY,WOOD);fill(x1-3,top,x1,GY,WOOD);fill(x,top,x1,top+3,WOOD);fill(x,GY-h/2|0,x1,(GY-h/2|0)+3,WOOD);tint(x,top,x1,GY,wc[0],wc[1],wc[2],10);
  fill(x+1,top+5,x+2,top+10,GLASS);fill(x1-2,top+5,x1-1,top+10,GLASS);bgRect(x+3,top+3,x1-3,GY,rgb(60,46,40));
  for(let r=0;r<w/2+2;r++)fill(x-2+r,top-r*.6,x1+2-r,top-r*.6+1,WOOD),tint(x-2+r,top-r*.6,x1+2-r,top-r*.6+1,110,40,30,10);}
const OBJS=[
 {id:'car',label:'Car',place:(x,gy)=>car(x-8,gy),icon:iconRects([['#b42424',2,7,12,4],['#b42424',4,4,7,3],['#8ccbe0',5,5,2,2],['#8ccbe0',8,5,2,2],['#222',3,10,3,3],['#222',10,10,3,3]])},
 {id:'crates',label:'Crates',place:(x,gy)=>{for(let k=0;k<3;k++){const cy=gy-6*(k+1);fill(x-3,cy,x+3,cy+6,WOOD);tint(x-3,cy,x+3,cy+6,160,120,70,12);fill(x-3,cy,x+3,cy+1,WOOD);tint(x-3,cy,x+3,cy+1,110,78,42,6);}},icon:iconRects([['#a0784a',5,2,6,4],['#a0784a',5,7,6,4],['#a0784a',5,12,6,4],['#6e4e2a',5,6,6,1],['#6e4e2a',5,11,6,1]])},
 {id:'boulder',label:'Boulder',place:(x,gy)=>{const r=3+SPAWN.brush;disc(x,gy-r,r,STONE,.97);tint(x-r,gy-2*r-1,x+r+1,gy,120,118,112,10);},icon:iconRects([['#78766f',4,5,8,8],['#8e8c84',5,4,5,3],['#5e5c56',9,9,3,4]]),tip:'size = brush'},
 {id:'girder',label:'Steel Girder',place:(x,gy)=>{fill(x-1,gy-34,x+2,gy,STEEL);fill(x-4,gy-34,x+5,gy-32,STEEL);fill(x-4,gy-2,x+5,gy,STEEL);tint(x-4,gy-34,x+5,gy,150,158,170,6);},icon:iconRects([['#96a0aa',7,1,2,14],['#96a0aa',4,1,8,2],['#96a0aa',4,13,8,2]])},
 {id:'beam',label:'Steel Beam',place:(x,gy)=>{fill(x-24,gy-4,x+24,gy,STEEL);tint(x-24,gy-4,x+24,gy,150,158,170,6);fill(x-24,gy-3,x+24,gy-1,STEEL);tint(x-24,gy-3,x+24,gy-1,110,116,128,4);},icon:iconRects([['#96a0aa',1,6,14,4],['#6e7480',1,7,14,2]])},
 {id:'glass',label:'Glass Pane',place:(x,gy)=>{fill(x-1,gy-26,x+1,gy,GLASS);fill(x-3,gy-27,x+3,gy-26,STEEL);fill(x-3,gy-1,x+3,gy,STEEL);},icon:iconRects([['#9ccde0',7,2,2,12],['#96a0aa',5,1,6,1],['#96a0aa',5,14,6,1]])},
 {id:'propane',label:'Propane Tank',place:(x,gy)=>{fill(x-8,gy-12,x+8,gy,STEEL);tint(x-8,gy-12,x+8,gy,210,210,200,8);fill(x-6,gy-10,x+6,gy-1,PROPANE);},icon:iconRects([['#d2d2c8',2,5,12,8],['#e23b2e',4,8,8,2]]),tip:'explodes when it catches fire'},
 {id:'oil',label:'Oil Drum',place:(x,gy)=>{fill(x-3,gy-9,x+4,gy,STEEL);tint(x-3,gy-9,x+4,gy,60,90,160,8);fill(x-2,gy-8,x+3,gy-1,OIL);},icon:iconRects([['#3c5aa0',5,3,6,11],['#2a3e70',5,6,6,1],['#2a3e70',5,10,6,1]]),tip:'burns'},
 {id:'tree',label:'Oak Tree',place:(x,gy)=>tree(x,gy),icon:iconRects([['#2e7c2c',3,1,10,8],['#76502a',7,8,2,7]])},
 {id:'pine',label:'Pine',place:(x,gy)=>pine(x,gy),icon:iconRects([['#1e5a30',6,1,4,3],['#1e5a30',4,4,8,4],['#1e5a30',3,8,10,4],['#76502a',7,12,2,3]])},
 {id:'house',label:'House',place:(x,gy)=>house1(x-15,gy),icon:iconRects([['#6e2a1e',2,4,12,3],['#c8be9e',3,7,10,8],['#3c2e28',7,10,2,5]])},
 {id:'office',label:'Office Block',place:(x,gy)=>building(x-24,x+24,gy-96,gy),icon:iconRects([['#96948e',4,1,8,14],['#dcc86e',6,3,1,1],['#dcc86e',9,3,1,1],['#dcc86e',6,7,1,1],['#dcc86e',9,10,1,1]])},
 {id:'tower',label:'Glass Tower',place:(x,gy)=>glassTower(x-18,x+18,gy-150,gy),icon:iconRects([['#46708a',5,1,6,15],['#96a0aa',5,1,1,15],['#96a0aa',10,1,1,15]])},
 {id:'watertower',label:'Water Tower',place:(x,gy)=>waterTower(x-5,gy-4),icon:iconRects([['#78543a',4,3,8,6],['#5a3e2a',5,9,1,6],['#5a3e2a',10,9,1,6]])},
 {id:'lamp',label:'Lamp Post',place:(x,gy)=>{fill(x,gy-20,x+1,gy,STEEL);tint(x,gy-20,x+1,gy,40,40,48,4);fill(x-1,gy-22,x+2,gy-20,NEON);tint(x-1,gy-22,x+2,gy-20,255,220,150,10);},icon:iconRects([['#282830',7,4,2,11],['#ffdc96',6,2,4,2]])},
 {id:'wall',label:'Brick Wall',place:(x,gy)=>{for(let y=gy-24;y<gy;y++)for(let xx=x-12;xx<x+12;xx++){setc(y*W+xx,CONC);const mortar=(y-gy)%4===0||((xx+((y-gy)>>2&1)*4)%8===0);col[y*W+xx]=mortar?rgb(170,160,150):rgb(150+R()*20,64+R()*14,48);}},icon:iconRects([['#9a4030',2,4,12,10],['#aaa096',2,7,12,1],['#aaa096',2,10,12,1]])},
];
const TERRAIN=[SAND,DIRT,STONE,CONC,STEEL,GLASS,WOOD,LEAF,GRASS,ICE,SNOW,OBSID,NEON,RUBBLE,WATER,OIL,ACID,LAVA,FIRE,GFIRE,SMOKE,STEAM,PROPANE,EMBER,ASH];
const TOOLS=[
 {id:'erase',label:'Eraser',kind:'paint',icon:iconRects([['#f3e9d2',3,5,10,6],['#e23b2e',3,5,4,6]])},
 {id:'boom',label:'Explosion',kind:'place',icon:iconRects([['#ffc93c',3,3,10,10],['#e23b2e',5,5,6,6]]),tip:'size = brush'},
 {id:'bolt',label:'Lightning',kind:'place',icon:iconRects([['#d8e4ff',8,1,2,5],['#d8e4ff',6,6,2,4],['#d8e4ff',8,10,2,5]])},
 {id:'fire',label:'Ignite',kind:'paint',icon:iconRects([['#ff8c1e',4,6,8,8],['#ffd250',6,3,4,6]])},
 {id:'freeze',label:'Freeze',kind:'paint',icon:iconRects([['#bfe3ff',7,1,2,14],['#bfe3ff',1,7,14,2],['#ffffff',6,6,4,4]])},
 {id:'pause',label:'Pause Physics',kind:'toggle',icon:iconRects([['#f3e9d2',4,3,3,10],['#f3e9d2',9,3,3,10]]),tip:'freeze the world; the hero still moves'},
 {id:'slow',label:'Slow Motion',kind:'toggle',icon:iconRects([['#2ec4d6',3,3,10,10],['#14110f',7,5,2,4],['#14110f',7,8,4,2]])},
 {id:'god',label:'God Mode',kind:'toggle',icon:iconRects([['#ffc93c',4,2,8,12],['#14110f',7,5,2,6]]),tip:'no damage'},
 {id:'inf',label:'Infinite Energy',kind:'toggle',icon:iconRects([['#2ec4d6',2,6,12,4],['#14110f',7,6,2,4]])},
 {id:'peace',label:'Peaceful Enemies',kind:'toggle',icon:iconRects([['#8dffb0',3,3,10,10],['#14110f',5,6,2,2],['#14110f',9,6,2,2]]),tip:'enemies never attack'},
 {id:'clearE',label:'Clear Enemies',kind:'action',icon:iconRects([['#e23b2e',3,3,10,10],['#f3e9d2',5,7,6,2]])},
 {id:'clearD',label:'Clear Debris',kind:'action',icon:iconRects([['#8a8a8a',2,10,12,4],['#f3e9d2',4,4,8,2]]),tip:'removes flying chunks and particles'},
 {id:'respawn',label:'Respawn Hero',kind:'action',icon:iconRects([['#ffc93c',5,2,6,6],['#e23b2e',4,8,8,7]])},
];
function buildSpawnUI(){
  const tabs=[
    {id:'enemies',label:'ENEMIES',items:Object.keys(ENEMY_TYPES).map(k=>{const d=ENEMY_TYPES[k];return{id:k,cat:'enemies',kind:'place',label:d.label||(d.title?prettyName(d.title.toLowerCase()):prettyName(k)),icon:iconSprite(d.sprite,d.pal),tip:d.title?'boss':''};})},
    {id:'objects',label:'OBJECTS',items:OBJS.map(o=>Object.assign({cat:'objects',kind:'place'},o))},
    {id:'terrain',label:'TERRAIN',items:TERRAIN.map(m=>({id:'m'+m,cat:'terrain',kind:'paint',mat:m,label:prettyName(MATS[m][0]),icon:iconMat(m)}))},
    {id:'tools',label:'TOOLS',items:TOOLS.map(o=>Object.assign({cat:'tools'},o))},
  ];
  spawnUI=createSpawnMenu({tabs,
    onPick:it=>{SPAWN.tool=it;if(it)snd('ui',camX+VW/2,camY+VH/2);},
    onToggle:(it,on)=>{SPAWN[it.id]=on;snd('ui',camX+VW/2,camY+VH/2);},
    onAction:it=>{if(it.id==='clearE')clearEnemies();else if(it.id==='clearD'){np=0;bodies.length=0;}else if(it.id==='respawn'){spawnPlayer();}snd('place',camX+VW/2,camY+VH/2);},
    onBrush:n=>{SPAWN.brush=n;},onSnap:on=>{SPAWN.snap=on;}});
}
function resetSpawn(){Object.assign(SPAWN,{tool:null,pause:false,slow:false,god:false,inf:false,peace:false,latch:false});if(spawnUI){spawnUI.close();spawnUI.select(null);for(const id of ['pause','slow','god','inf','peace'])spawnUI.setToggle(id,false);}}
function groundBelow(x,y){x=Math.max(0,Math.min(W-1,x|0));let yy=Math.max(2,y|0);for(let k=0;k<200&&yy>2&&solidAt(x,yy-1);k++)yy--;return surfaceY(x,yy,H);}
function placeStruct(fn,x,gy){const x0=Math.max(0,x-150),x1=Math.min(W,x+150),y0=Math.max(0,gy-260),y1=Math.min(H,gy+16);
  CAPT=[];try{fn(x,gy);}finally{var cells=CAPT;CAPT=null;}
  const r=rcount.length;let n=0;for(const i of cells)if(KIND[t[i]]===S){rid[i]=r;str[i]=15;n++;}rcount.push(n);
  for(let y=y0;y<y1;y++)for(let xx=x0;xx<x1;xx++){const i=y*W+xx;bgB[i]=bg[i]!==bgD[i]?1:0;}return n;}
function paintDisc(cx,cy,r,m){const k=KIND[m];
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r+r*.5)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-1)continue;const i=Y*W+X,cur=t[i];
    if(m===EMPTY){if(cur)setc(i,EMPTY);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}continue;}
    if(k===S){if(cur!==m)setc(i,m);}
    else{if(cur&&KIND[cur]!==G&&KIND[cur]!==F)continue;if(R()<(k===L?.7:k===P?.6:.45))setc(i,m);}}}
function useTool(){const T=SPAWN.tool;if(!T||GS!=='play')return;const x=mouse.wx|0,y=mouse.wy|0,first=!SPAWN.latch;SPAWN.latch=true;
  if(T.cat==='enemies'){if(!first)return;const d=ENEMY_TYPES[T.id];if(!d)return;let yy=y;for(let k=0;k<80&&d.w<=16&&eHit({def:d},x,yy);k++)yy--;
    const e=spawnEnemy(T.id,x,yy);if(e)snd('place',x,y);else fxWord(x,y-10,'MAX ENEMIES',.7,'#e23b2e',true);return;}
  if(T.cat==='objects'){if(!first)return;const gy=SPAWN.snap?groundBelow(x,y):y;placeStruct(T.place,x,gy);snd('place',x,gy);rings.push({x,y:gy-6,r:3,vr:2,life:10,c:[255,201,60]});return;}
  const r=SPAWN.brush;
  if(T.cat==='terrain'||T.id==='erase'){const m=T.cat==='terrain'?T.mat:EMPTY,lx=SPAWN.lx??x,ly=SPAWN.ly??y,n=Math.max(1,Math.hypot(x-lx,y-ly)/Math.max(1,r*.5)|0);
    for(let k=1;k<=n;k++)paintDisc(lx+(x-lx)*k/n|0,ly+(y-ly)*k/n|0,r,m);SPAWN.lx=x;SPAWN.ly=y;if(frame%6===0)snd(m===EMPTY?'pop':'step',x,y,{v:.3});return;}
  if(T.id==='boom'){if(first)explode(x,y,r*2+3,{fire:.25});return;}
  if(T.id==='bolt'){if(first)lightningStrike(x,y,8);return;}
  if(T.id==='fire'){for(let n=0;n<r*r;n++){const X=x+(R()-.5)*r*2|0,Y=y+(R()-.5)*r*2|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(FLAM[m]>0)ignite(i);else if(!m&&R()<.3)setc(i,FIRE);}return;}
  if(T.id==='freeze'){if(frame%4===0)freezeArea(x,y,r*2+2,90,0);for(let n=0;n<r*r;n++){iceAt(x+(R()-.5)*r*2,y+(R()-.5)*r*2);}return;}}
resize();initGL(sim,glc,cv).then(ok=>{GL=ok;});buildSpawnUI();$('spawnbtn').onclick=e=>{spawnUI.toggle();e.target.blur();};syncSettings();mapSel.value='nyc2099';regen();showMenu();requestAnimationFrame(loop);
window.GAME={dbg:()=>({rid,rcount,gnd}),pose:()=>posePlayer(pl_).filter(r=>/[^.]/.test(r)).join('|'),set hitstop(v){hitstop=v},startRun,showMenu,MODES,defineMode,get GS(){return GS},get MS(){return MS},get dbox(){return[dx0,dy0,dx1,dy1]},explode:(x,y,r)=>explode(x,y,r),get pin(){return pin},supportCheck:()=>supportCheck(false),t,W,H,pl_,mouse,keys,pressed,selPower,cast:()=>cast(),regen,tick,render,bodies,shots,drones,strikes,get vortex(){return vortex},get held(){return held},get fps(){return fps},get simMs(){return simMs},get frameMs(){return frameMs},get np(){return np},get cam(){return[camX,camY]},count:m=>{let c=0;for(let i=0;i<N;i++)if(t[i]===m)c++;return c;},MATS,toggleFly,BLD,bodyHit,setChar,CHARS,get CH(){return CH},enemies,spawnEnemy,startWave,clearEnemies,ENEMY_TYPES,defineEnemy,get storm(){return storm},cut:(x0,x1,y0,y1)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)setc(y*W+x,EMPTY);},setCam:(x,y)=>{camX=x;camY=y;},comics,rings,flashes,waves,SET,SPAWN,get decoy(){return decoy},get stasis(){return stasis},pins,therm,jets,get slowT(){return slowT},placeStruct,OBJS,spawnUI:()=>spawnUI,MAPDEFS,mapSel};
