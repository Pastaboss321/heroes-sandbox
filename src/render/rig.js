// Procedural animation rig: arm modes, posePlayer. Hero entries of ANIM are added by src/heroes/<hero>.js.
import '../world/destruction.js'; // evaluation order: runs after world/destruction.js
import { ST } from '../state.js';
import { mouse } from '../player.js';

export const GLOWCH={e:1,'*':1,'@':1,V:1,'+':1};
// ---- procedural animation rig. The hero sprite is re-posed every frame before drawing:
//   leg   first leg row (rows below swing for walking / tuck for jumps / trail in flight)
//   mid   columns left of this belong to the back leg
//   armC, tipC  [light, mid, dark] chars for a posed arm and its glove / fist / palm
//   aw, al, fs  arm thickness, arm length and fist size in pixels (Hulk: thick arms, big fists)
//   sh    front shoulder [x,y] in sprite space (the sprite faces right)
//   hide  sprite pixels of the hanging front arm, removed while the arm is posed
//   blink eye char and the lid char that replaces it for a blink
//   cape  chars that hang from the shoulders and never move with the legs
export const rect=(x0,x1,y0,y1)=>{const r=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)r.push([x,y]);return r;};
export const ANIM={}; // per-hero rig entries: ANIM.<id> is set in src/heroes/<hero>.js
export const PP=8; // padding around the posed sprite for limbs that reach out
const ARM_UP=new Set(['Fire Rain','Comet Strike','Pile Driver','Force Geyser','Lift & Slam','Conjure Chaos','Chaos Unleashed','Gravity Hex','Ward of Vishanti','No More','Giant-Man','Downburst','Heat Wave','Icicle Drop','Mjolnir Pin','Ice Golem','Telekinetic Rip','Blizzard','Phoenix Wings','Storm Call','Lightning Call','Thunderbolt','Tornado','Hailstorm','Phoenix Force','Ice Wall','Ball Lightning','Conductor Strike','Flash Flood','Eye of the Storm','Bifrost','God Blast']);
const ARM_BOTH=new Set(['Force Burst','Force Nova','Crushing Bubble','Hammer Fist','Rock Slam','Supernova','Negative Zone Rift','Thunder Clap','Hex Sphere','Crimson Crush','Mirror Shatter','Magnetic Implosion','Hex Storm','Transmute','Elemental Inversion','Reweave','Crimson Bands','Mirror Fold','Banish','Pym Burst','Chaos Field','EMP Burst','Not Today','Stealth Mode','Adamantium Skeleton','Mystic Shield','Thunderclap','Gale Force','Psychic Wave','Frost Nova','Mind Shield','Levitate Crowd','Debris Storm','Gamma Roar','Energy Shield','Avalanche']);
const ARM_VISOR=new Set(['Annihilation Sweep','Bad Luck','Time Loop','Spider-Sense','Tactical Focus','Blackbird Strafe','Puppet Master','Optic Cage','Uncontrolled Blast','Optic Blast','Concussive Burst','Ricochet Shot','Full Power','Optic Sweep','Optic Barrage','Leg Sweep','Visor Overload']);
export function armMode(p){
  if(p.ball)return'clap';
  if(p.grip)return'grip';
  if(p.throwF>0)return'throw';
  if((ST.held&&ST.held.overhead)||(ST.heldE&&ST.CH.powers[ST.cur]&&ST.CH.powers[ST.cur].tk&&ST.CH.powers[ST.cur].tk.overhead))return'hold';
  if(p.slam)return'up';
  if(p.thrustF>0)return'visor';
  if(p.clapF>0)return'clap';
  if(p.cling)return'cling';
  if(p.crouch>6)return'back';
  if(p.leap)return'back';
  if(p.punchF>0)return'punch';
  if(p.charge>0)return'back';
  const pw=ST.CH.powers[ST.cur];
  if(mouse.down&&ST.GS==='play'&&pw){if(pw.n==='Unibeam')return'chest';if(ARM_BOTH.has(pw.n))return'both';if(ARM_UP.has(pw.n))return'up';if(ARM_VISOR.has(pw.n))return'visor';if(pw.n==='Healing Factor')return'back';return'aim';}
  if(p.castF>0)return'aim';
  if(p.fly&&ST.CH.id==='iceman')return'slide';
  if(p.fly&&(p.boost>0||Math.hypot(p.vx,p.vy)>2.6))return'super';
  return null;
}
// sprite-space direction from the front shoulder toward the mouse (undoes body tilt and facing)
export function aimLocal(p,tx=mouse.wx,ty=mouse.wy){
  const A=ANIM[ST.CH.id],sw=ST.SW,sh=ST.SH,ca=Math.cos(p.ang),sa=Math.sin(p.ang);
  const lx=(A.sh[0]+.5-sw/2)*p.face*ST.SZ,ly=(A.sh[1]+.5-sh/2)*ST.SZ;
  const shx=p.x+lx*ca-ly*sa,shy=p.y-sh/2*ST.SZ+lx*sa+ly*ca;
  let dx=tx-shx,dy=ty-shy;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
  const rx=dx*ca+dy*sa,ry=-dx*sa+dy*ca;
  return{shx,shy,wx:dx,wy:dy,lx:rx*p.face,ly:ry};
}
export function armLen(p,mode){const L=ANIM[ST.CH.id].al;return mode==='punch'?(p.punchF>6?L-1+(10-p.punchF)*1.5:L-1+p.punchF*.6):L-(p.recoilF>3?1.5:0);}
const POSE={g:[],rows:[]};
const LGX=-.7071,LGY=-.7071; // key light from the upper left, in sprite space
export function posePlayer(p){
  const A=ANIM[ST.CH.id],spr=ST.SPR,sw=ST.SW,sh=ST.SH,w=sw+PP*2,h=sh+PP*2,G=POSE.g;
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
    else if(mode==='up'){const o=Math.sin(ST.frame*.3)*.6;arm2(front,fx,fy,fx+1.5,fy-3,fx+1+o,fy-al-1,aw,fs);arm2(back,bx,fy,bx-1.5,fy-3,bx-1-o,fy-al-1,aw,fs);}
    else if(mode==='back'){arm1(front,fx,fy,fx-3,fy+al-2,aw,fs);arm1(back,bx,fy,bx-3,fy+al-2.5,aw,fs);}
    else if(mode==='super'){arm1(front,fx,fy,fx+2,fy-al,aw,fs);}
    else if(mode==='grip'){const L=aimLocal(p,p.grip.x,p.grip.y);arm1(front,fx,fy,fx+L.lx*al,fy+L.ly*al,aw,fs);arm1(back,bx,fy,bx+L.lx*(al-.5),fy+L.ly*(al-.5),aw,fs);}
    else if(mode==='clap'){arm1(front,fx,fy,fx+al-1,fy+1.5,aw,fs);arm1(back,bx,fy,fx+al-2.5,fy+1,aw,fs);}
    else if(mode==='cling'){const hx=fx+2.5,hy=fy-al+1.5;arm1(front,fx,fy,hx,hy,aw,fs);arm1(back,bx,fy,fx+1.5,fy+1,aw,fs);
      if(A.claws)front.push(()=>{for(let c=-1;c<=1;c++)for(let k=1;k<=3;k++)put(hx+k*.7,hy-1+c-k*.7,A.claws);});}
  }
  for(const f of back)f();
  const blink=A.blink&&(ST.frame%170)<5;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){let ch=spr[y][x];if(ch==='.'||hide.has(y*sw+x))continue;
    if(blink&&ch===A.blink)ch=A.lid;
    if(y<A.leg||(A.cape&&A.cape.includes(ch))){put(x,y+(y<A.leg?up:0),ch);continue;}
    const k=(y-A.leg+1)/n,side=x<A.mid?1:-1;let dx=0,dy=0;
    if(p.fly&&ST.CH.id==='iceman'){dx=-side*Math.round(k*1.2);dy=0;}                // surfing stance on the slide
    else if(p.fly){dx=-Math.round(k*2.4);dy=-Math.round(k*.6);}                       // legs trail behind in flight
    else if(air){if(p.vy<0){dx=-side*Math.round(k);dy=-Math.round(k*2.2);}           // tuck on the way up
                 else dx=-side*Math.round(k*1.6);}                                   // spread on the way down
    else if(walking){const lift=Math.max(0,Math.sin(ph)*side);if(k>.4){dy=-Math.round(lift*2*k);dx=-side*Math.round(lift*k*1.3);}} // alternate steps: one knee lifts and swings out (front leg forward, back leg back)
    else if(p.landF>0||p.crouch>6)dx=-side*Math.round(k*(p.crouch>6?2.2:1.4));
    put(x+dx,y+dy,ch);}
  for(const f of front)f();
  if(mode==='chest'){const cx=Math.floor(sw/2),cy=A.leg-4+up,c=(ST.frame>>1)&1?'@':'*';for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(Math.abs(a)+Math.abs(b)<2)put(cx+a,cy+b,c);}
  const R2=POSE.rows;R2.length=h;for(let y=0;y<h;y++)R2[y]=G.slice(y*w,(y+1)*w).join('');
  return R2;
}
