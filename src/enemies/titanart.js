// Titan art: the five titans drawn with the titan kit (render/titan.js) on one muscular anatomy rig - a
// small head (an eighth of the height), very broad shoulders, a V-tapered torso, long legs, pecs, abs,
// deltoids, biceps, quads and calves with dark seams - then each titan's costume on top: Galactus's
// crown and prongs, Thanos's gold yoke and grin, Dormammu's flaming skull and spiked armour, Surtur's
// horned crest and lava-cracked body, Knull's red sigil and streaming hair. titans.js keeps the behaviour;
// each draw stores its landmarks in e.mem.lm (head, eyes, mouth, core, hand) so think() can glue the weak
// points and aim attacks at what is drawn.
import { ST } from '../state.js';
import { rgb as C } from '../world/materials.js';
import { buf, gbuf } from '../render/canvas.js';
import { TK } from '../render/titan.js';
import { drawSprite } from '../render/sprites.js';
import { ARTS } from '../art/index.js';
const SPR_THANOS=ARTS.thanos.spr,PAL_THANOS=ARTS.thanos.pal;

const H01=(x,y)=>{let h=(x*374761393+y*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;};
const mixc=(a,b,k)=>C((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k);
function chain(pts,r0,r1,c,o){const n=pts.length-1;for(let k=0;k<n;k++)TK.cap(pts[k][0],pts[k][1],pts[k+1][0],pts[k+1][1],r0+(r1-r0)*k/n,r0+(r1-r0)*(k+1)/n,c,o);}
function crackle(x,y,len,c,sd){const T=ST.frame>>2;let px=x,py=y,a=H01(T,sd)*6.283;for(let k=0;k<6;k++){a+=(H01(T+k,sd*7+k)-.5)*1.6;const nx=px+Math.cos(a)*len/6,ny=py+Math.sin(a)*len/6;TK.line(px,py,nx,ny,c,{glow:c,ink:false});px=nx;py=ny;}}
const FIRE3=[C(214,52,18),C(255,138,30),C(255,228,120)];
const BLUEFIRE=[C(40,90,230),C(90,170,255),C(220,245,255)];

// ---------------- anatomy rig ----------------
// rig(x, footY, height, face): head units U = height/8; P(u,v) = world point u heads sideways (toward the
// face is +u) and v heads up from the feet.
function rig(x,fy,ht,f){const U=ht/8;return{U,f,x,fy,P:(u,v)=>[x+u*U*f,fy-v*U]};}
// two-bone reach: shoulder -> elbow -> hand; picks the elbow that bends away from the body and down
function ik(sx,sy,hx,hy,L1,L2,out,cx){const dx=hx-sx,dy=hy-sy,d=Math.hypot(dx,dy)||1,D=Math.min(d,L1+L2-.5),a=Math.acos(Math.max(-1,Math.min(1,(L1*L1+D*D-L2*L2)/(2*L1*D)))),b=Math.atan2(dy,dx);
  const e1=[sx+Math.cos(b+a)*L1,sy+Math.sin(b+a)*L1],e2=[sx+Math.cos(b-a)*L1,sy+Math.sin(b-a)*L1],s=v=>(v[0]-cx)*out+v[1]*.3,e=s(e1)>s(e2)?e1:e2;return[e[0],e[1],sx+dx/d*D,sy+dy/d*D];}
// the body. c: colours {torso,pec,abs,arm,delt,fore,fist,bfist,thigh,shin,knee,foot,neck,seam};
// pose: {fHand,bHand,stride,spread}; layers: {back(), mid(), front()} costume hooks between body parts.
function figure(R,c,pose,o,layers={}){const {P,U,f,x}=R,out={},sp=pose.spread||0,st=pose.stride||0;
  const arm=side=>{const sh=P(side*1.5,6.35),tg=(side>0?pose.fHand:pose.bHand)||P(side*1.9,3.85),L1=1.4*U,L2=1.32*U;
    const [ex,ey,hx,hy]=ik(sh[0],sh[1],tg[0],tg[1],L1,L2,side*f,x);
    TK.cap(sh[0],sh[1],ex,ey,.44*U,.32*U,c.arm,o);const mx=sh[0]+(ex-sh[0])*.45,my=sh[1]+(ey-sh[1])*.45;TK.ell(mx,my,.36*U,.38*U,c.arm,o); // biceps
    TK.cap(ex,ey,hx,hy,.37*U,.24*U,c.fore,o);TK.ell(ex+(hx-ex)*.25,ey+(hy-ey)*.25,.32*U,.32*U,c.fore,o); // forearm mass
    TK.line(sh[0],sh[1]+.1*U,mx,my+.2*U,c.seam,o);
    TK.ell(hx,hy,.32*U,.32*U,side>0?c.fist:(c.bfist||c.fist),o);TK.ell(sh[0],sh[1]+.05*U,.5*U,.45*U,c.delt||c.arm,o); // fist, deltoid
    out[side>0?'fh':'bh']=[hx,hy];out[side>0?'fe':'be']=[ex,ey];};
  const leg=side=>{const hp=P(side*.45,4.05),kn=P(side*(.62+sp)+st*side*.25,2.1),an=P(side*(.7+sp*1.5)+st*side*.5,.35);
    TK.cap(hp[0],hp[1],kn[0],kn[1],.62*U,.38*U,c.thigh,o);TK.ell(hp[0]+(kn[0]-hp[0])*.5,hp[1]+(kn[1]-hp[1])*.5,.52*U,.66*U,c.thigh,o); // quads
    TK.cap(kn[0],kn[1],an[0],an[1],.34*U,.2*U,c.shin,o);TK.ell(kn[0]+(an[0]-kn[0])*.3-side*f*.08*U,kn[1]+(an[1]-kn[1])*.3,.33*U,.5*U,c.shin,o); // calf
    TK.ell(kn[0],kn[1],.3*U,.28*U,c.knee||c.shin,o);TK.ell(an[0]+f*.25*U,an[1]+.12*U,.48*U,.22*U,c.foot,o);
    TK.line(hp[0]+(kn[0]-hp[0])*.3,hp[1]+(kn[1]-hp[1])*.3,kn[0]-side*f*.05*U,kn[1]-.3*U,c.seam,o);out[side>0?'fk':'bk']=kn;out[side>0?'fa':'ba']=an;};
  layers.back&&layers.back(out);
  arm(-1);leg(-1);leg(1);
  TK.poly([P(-.85,4.35),P(.85,4.35),P(.6,3.75),P(-.6,3.75)],c.abs,o); // pelvis
  TK.poly([P(-1.5,6.8),P(1.5,6.8),P(1.3,5.9),P(.72,4.7),P(.78,4.15),P(-.78,4.15),P(-.72,4.7),P(-1.3,5.9)],c.torso,o); // V-taper
  for(const s of [-1,1])TK.ell(...P(s*.56,6.05),.66*U,.44*U,c.pec,o);
  for(const v of [5.35,4.95,4.55])for(const s of [-1,1])TK.ell(...P(s*.22,v),.21*U,.17*U,c.abs,o);
  TK.poly([P(-.38,7.05),P(.38,7.05),P(.95,6.7),P(-.95,6.7)],c.torso,o);TK.cap(...P(0,7.1),...P(0,6.7),.3*U,.34*U,c.neck||c.torso,o);
  TK.line(...P(0,6.6),...P(0,5.75),c.seam,o);for(const s of [-1,1]){TK.line(...P(s*1.1,5.78),...P(s*.08,5.66),c.seam,o);TK.line(...P(s*.72,5.55),...P(s*.58,4.35),c.seam,o);}
  TK.line(...P(0,5.6),...P(0,4.3),c.seam,o);for(const v of [5.15,4.75])TK.line(...P(-.42,v),...P(.42,v),c.seam,o);
  layers.mid&&layers.mid(out);
  arm(1);
  layers.front&&layers.front(out);
  out.head=P(0,7.55);return out;}

// ================= GALACTUS =================
export function drawGalactus(e){const f=e.face,x=e.x,y=e.y,m=e.mem,o={flash:e.flash>0},sw=Math.sin((m.step||0)*.052);
  const A=C(124,62,176),A2=C(84,38,128),A3=C(176,118,226),SU=C(56,36,104),SKN=C(168,156,172),SKD=C(96,82,104),INK=C(24,12,34),GL=C(230,190,255);
  const R=rig(x,y+148,300,f),{P,U}=R,charge=m.act==='beam'?Math.min(1,m.t/40):0;
  const hand=m.hand,fHand=hand?[hand.x,hand.y]:m.act==='beam'?P(2.1,6.4):P(1.9,3.6);
  TK.aura(...P(0,6),140,C(140,70,255),.12+charge*.2);
  TK.begin();
  const L=figure(R,{torso:SU,pec:A,abs:A2,arm:A2,delt:A,fore:A,fist:A,thigh:SU,shin:A,knee:A3,foot:A2,neck:SU,seam:INK},{fHand,bHand:P(-1.95,3.6),stride:sw*.6,spread:.15},o,{
    mid(){ // chest plate with the glowing core, ribbed abdomen, belt and tabard, flared pauldrons
      TK.poly([P(-1.45,6.8),P(1.45,6.8),P(1.15,5.7),P(0,5.25),P(-1.15,5.7)],A,o);
      for(const s of [-1,1]){TK.line(...P(s*1.45,6.8),...P(0,5.25),A3,o);TK.line(...P(s*1.2,6.55),...P(s*.42,5.95),A2,o);}
      TK.ell(...P(0,6.05),.42*U,.42*U,A3,o);TK.ell(...P(0,6.05),.28*U,.28*U,C(250,230,255),{...o,glow:GL,flat:true});
      for(let v=5.1;v>4.35;v-=.17)TK.line(...P(-.58,v),...P(.58,v),A,o);
      TK.poly([P(-.88,4.42),P(.88,4.42),P(.85,4.08),P(-.85,4.08)],A3,o);TK.ell(...P(0,4.25),.2*U,.15*U,A2,o);
      TK.poly([P(-.5,4.08),P(.5,4.08),P(.42,1.85),P(0,1.6),P(-.42,1.85)],A,o);for(let v=3.7;v>2;v-=.45){TK.line(...P(-.36,v),...P(0,v-.25),A3,o);TK.line(...P(.36,v),...P(0,v-.25),A3,o);}
      for(const s of [-1,1]){TK.poly([P(s*.85,7.0),P(s*2.0,6.95),P(s*2.1,6.15),P(s*1.45,5.95),P(s*.95,6.4)],A,o);TK.line(...P(s*.85,7.0),...P(s*2.0,6.95),A3,o);TK.line(...P(s*1.15,6.6),...P(s*1.95,6.5),A2,o);}},
    front(L){const h=L.fh,e2=L.fe;TK.cap(e2[0]+(h[0]-e2[0])*.35,e2[1]+(h[1]-e2[1])*.35,h[0]+(e2[0]-h[0])*.1,h[1]+(e2[1]-h[1])*.1,.36*U,.34*U,A,o);}});
  // head: grim face framed by guards, the tall ribbed crown with a forehead gem, the great forked prongs
  for(const s of [-1,1]){TK.poly([P(s*.48,8.15),P(s*1.55,8.55),P(s*1.78,9.85),P(s*1.45,9.85),P(s*1.28,8.95),P(s*.48,8.75)],A,o);TK.line(...P(s*.5,8.45),...P(s*1.42,8.7),A3,o);TK.line(...P(s*1.5,8.75),...P(s*1.62,9.8),A3,o);}
  // the helmet encloses the head: a squared shell with a square face opening, ear disks, then the ribbed crown
  TK.poly([P(-.5,7.98),P(.5,7.98),P(.42,9.35),P(-.42,9.35)],A,o);for(const u of [-.27,-.09,.09,.27])TK.line(...P(u,8.1),...P(u,9.3),A2,o);TK.line(...P(-.42,9.35),...P(.42,9.35),A3,o);
  TK.poly([P(-.56,8.1),P(.56,8.1),P(.58,7.05),P(.36,6.82),P(-.36,6.82),P(-.58,7.05)],A,o);
  TK.poly([P(-.31,7.84),P(.31,7.84),P(.31,6.98),P(-.31,6.98)],SKN,o);
  TK.line(...P(-.33,7.86),...P(.33,7.86),A3,o);TK.line(...P(-.33,7.86),...P(-.33,6.96),A2,o);TK.line(...P(.33,7.86),...P(.33,6.96),A2,o);TK.line(...P(-.33,6.96),...P(.33,6.96),A2,o);
  TK.line(...P(-.56,8.1),...P(.56,8.1),A3,o);for(const s of [-1,1]){TK.ell(...P(s*.56,7.45),.13*U,.16*U,A3,o);TK.line(...P(s*.45,7.05),...P(s*.45,6.86),A2,o);}
  TK.poly([P(-.31,7.84),P(.31,7.84),P(.31,7.64),P(-.31,7.64)],SKD,{...o,flat:true}); // brow shadow over the eyes
  TK.line(...P(.02,7.52),...P(.05,7.3),SKD,o);TK.line(...P(-.13,7.16),...P(.13,7.16),INK,o);TK.line(...P(-.22,7.42),...P(-.2,7.08),SKD,o);TK.line(...P(.22,7.42),...P(.2,7.08),SKD,o);
  TK.end();
  TK.rim(C(200,150,255),1,0,C(70,30,120));TK.rim(C(220,190,255),0,-1);
  const ec=charge?C(255,240,255):C(200,160,255),er=charge?2:1;TK.glowDot(...P(-.13,7.62),er,ec);TK.glowDot(...P(.13,7.62),er,ec);TK.glowDot(...P(0,8.15),1+charge*2|0,GL);
  const fh=L.fh;TK.aura(fh[0],fh[1],50,C(170,110,255),.35+charge*.3);if(ST.frame%2===0)crackle(fh[0],fh[1],40,C(220,180,255),3);if(ST.frame%3===0)crackle(...L.bh,30,C(200,160,255),9);
  m.lm={head:P(0,7.6),core:P(0,6.05),hand:fh};}

// ================= THANOS =================
// hero-sized (the user wants "big hero size, not god size"): his playable sprite (heroes/wave5.js) drawn 1.35x,
// cosmic fire on both fists, the stones blazing when he calls on one. S = titans.js TS (feet at e.y+46*S).
export function drawThanos(e,STONES,S=1){const f=e.face,x=e.x,m=e.mem,raise=m.act?1:0,sc=1.17,by=e.y+46*S,c=m.act&&STONES[m.act]||[90,170,255];
  const sw=SPR_THANOS[0].length,sh=SPR_THANOS.length,at=(col,row)=>[x+f*(col+.5-sw/2)*sc,by-(sh-row)*sc];
  const fh=at(18.5,16.5),bh=at(2.5,16.5);
  TK.aura(fh[0],fh[1],raise?26:16,C(c[0],c[1],c[2]),raise?.6:.4);TK.aura(bh[0],bh[1],14,C(90,170,255),.35);
  drawSprite(x,by,0,f,false,SPR_THANOS,PAL_THANOS,e.flash>0?2:0,false,sc);
  for(const [h,k0,big] of [[fh,0,raise],[bh,20,0]])for(let k=0;k<5;k++)TK.flame(h[0]+(k-2)*1.4,h[1]-1,-Math.PI/2+(k-2)*.28,(big?9:5)+H01(k,k0+(ST.frame>>3))*4,big?2.6:1.8,k+k0,big?[C(c[0]*.5,c[1]*.5,c[2]*.5),C(c[0],c[1],c[2]),C(255,255,255)]:BLUEFIRE,{ink:false});
  if(raise){let k=0;for(const st of Object.values(STONES)){TK.glowDot(fh[0]-2+(k%3)*2,fh[1]-1+(k/3|0)*2,0,C(st[0],st[1],st[2]));k++;}if(ST.frame%2===0)crackle(fh[0],fh[1],14,C(c[0],c[1],c[2]),5);}
  m.lm={head:at(8,3.5),hand:fh};}

// ================= DORMAMMU =================
export function drawDormammu(e){const f=e.face,x=e.x,y=e.y,m=e.mem,o={flash:e.flash>0},T=ST.frame,breath=m.act==='breath'&&m.t>20;
  const BK=C(26,26,42),BK2=C(14,14,24),HL=C(70,76,112),RD=C(190,34,34),RD2=C(110,16,20),INK=C(10,6,12);
  const R=rig(x,y+120,240,f),{P,U}=R,sway=Math.sin(T*.03)*.15;
  TK.aura(...P(0,8),120,C(255,110,30),.3);
  TK.begin();
  const L=figure(R,{torso:BK,pec:BK,abs:BK2,arm:BK,delt:BK,fore:BK,fist:BK2,thigh:BK,shin:BK,foot:BK2,neck:BK2,seam:HL},{fHand:P(1.55+sway,8.4),bHand:P(-1.9,3.6),spread:.2},o,{
    back(){for(const s of [-1,1]){const w=Math.sin(T*.05+s)*.15;TK.poly([P(s*.55,4.25),P(s*1.0,4.1),P(s*(1.9+w),.7),P(s*(1.3+w),.95),P(s*(.9+w),.5),P(s*.4,2.6)],BK,o);TK.line(...P(s*1.0,4.1),...P(s*(1.9+w),.7),RD2,o);}},
    mid(){TK.poly([P(-.3,6.7),P(.3,6.7),P(.24,4.2),P(-.24,4.2)],RD,o);for(let v=6.55;v>4.25;v-=.16)TK.line(...P(-.28,v),...P(.28,v),RD2,o);TK.line(...P(0,6.7),...P(0,4.2),RD2,o);
      TK.poly([P(-.85,4.45),P(.85,4.45),P(.82,4.12),P(-.82,4.12)],BK2,o);TK.ell(...P(0,4.28),.16*U,.13*U,RD,o);
      for(const s of [-1,1]){TK.ell(...P(s*1.5,6.55),.62*U,.42*U,BK,o);TK.line(...P(s*.95,6.75),...P(s*2.05,6.45),HL,o);for(let k=0;k<3;k++)TK.cap(...P(s*(1.15+k*.38),6.85),...P(s*(1.3+k*.5),7.8+k*.15-(k===2?.5:0)),.12*U,.02*U,BK,o);}},
    front(L){const h=L.fh,e2=L.fe;for(let k=0;k<3;k++){const u=.3+k*.2;TK.cap(e2[0]+(h[0]-e2[0])*u,e2[1]+(h[1]-e2[1])*u,e2[0]+(h[0]-e2[0])*u-f*.35*U,e2[1]+(h[1]-e2[1])*u+.1*U,.08*U,.02*U,BK,o);}}});
  TK.end();
  // flaming skull: the fire first, then the dark skull face in it
  const hc=P(0,7.6);
  for(let k=0;k<16;k++){const a=-Math.PI+.25+k/15*(Math.PI-.5);TK.flame(hc[0]+Math.cos(a)*.35*U,hc[1]+Math.sin(a)*.42*U,a+(-Math.PI/2-a)*.55,1.0*U+H01(k,7)*.9*U,.28*U,k,FIRE3,{ink:false});}
  for(let k=0;k<5;k++)TK.flame(hc[0]+(k-2)*.15*U,hc[1]+.2*U,-Math.PI/2+(k-2)*.15,1.2*U,.3*U,k+30,FIRE3,{ink:false});
  TK.begin();TK.ell(hc[0],hc[1],.36*U,.46*U,C(120,40,26),o);TK.ell(...P(0,7.25),.26*U,.22*U,C(120,40,26),o);
  for(const s of [-1,1])TK.ell(...P(s*.15,7.65),.12*U,.1*U,INK,{...o,flat:true});TK.cap(...P(0,7.48),...P(0,7.38),.05*U,.07*U,INK,o);
  const mo=breath?.12:.04;TK.poly([P(-.2,7.22),P(.2,7.22),P(.14,7.22-mo),P(-.14,7.22-mo)],INK,o);for(let k=-2;k<=2;k++)TK.line(...P(k*.07,7.22),...P(k*.07,7.16),C(240,200,140),o);
  TK.end();
  TK.rim(C(255,150,60),0,-1,C(255,100,30));TK.rim(C(120,130,190),-1,0);
  for(const s of [-1,1])TK.glowDot(...P(s*.15,7.65),1,C(255,250,210));
  // the raised fist burns
  const fh=L.fh;TK.aura(fh[0],fh[1],44,C(255,130,40),.5);for(let k=0;k<7;k++)TK.flame(fh[0]+(k-3)*.1*U,fh[1]-.1*U,-Math.PI/2+(k-3)*.18,1.2*U+H01(k,9)*.8*U,.24*U,k+50,FIRE3,{ink:false});
  const hand=m.hand;if(hand){TK.begin();TK.ell(hand.x,hand.y,22,30,BK,o);for(let k=-2;k<=2;k++)TK.cap(hand.x+k*8,hand.y-20,hand.x+k*11,hand.y-52+Math.abs(k)*6,5,3,BK,o);TK.end();TK.rim(C(255,140,40),0,-1);for(let k=0;k<7;k++)TK.flame(hand.x+(k-3)*8,hand.y-10,-Math.PI/2+(k-3)*.2,30,7,k+40,FIRE3,{ink:false});}
  for(let k=0;k<30;k++){const a=T*.01+k/30*6.283;TK.glowDot(hc[0]+Math.cos(a)*1.6*U,hc[1]+.3*U+Math.sin(a)*.6*U,k%3?0:1,C(255,150+(k%3)*30,50));}
  m.lm={head:hc,eyes:[P(-.15,7.65),P(.15,7.65)],mouth:P(0,7.2),hand:fh};}

// ================= SURTUR =================
export function drawSurtur(e){const f=e.face,x=e.x,y=e.y,m=e.mem,o={flash:e.flash>0},sw=Math.sin((m.step||0)*.045),T=ST.frame;
  const RB=C(130,40,26),RB2=C(78,22,16),AR=C(34,26,28),AR2=C(70,56,54),HORN=C(56,40,36),LV=C(255,110,30),LY=C(255,214,100);
  const R=rig(x,y+116,232,f),{P,U}=R,sx=x+f*50,sy=y-56;
  TK.aura(...P(0,6),130,C(255,90,20),.3);
  TK.begin();
  const L=figure(R,{torso:RB,pec:RB,abs:RB2,arm:RB,delt:AR,fore:AR,fist:AR,bfist:AR,thigh:RB,shin:AR,knee:AR2,foot:AR,neck:RB2,seam:RB2},{fHand:[sx,sy],bHand:P(-1.95,3.7),stride:sw*.6,spread:.25},o,{
    mid(){for(const s of [-1,1]){TK.ell(...P(s*1.55,6.55),.7*U,.45*U,AR,o);for(let k=0;k<4;k++)TK.cap(...P(s*(1.0+k*.33),6.9),...P(s*(1.15+k*.45),7.7+(k%2)*.3),.13*U,.02*U,AR,o);}
      for(let k=0;k<7;k++){const u=-.8+k*.27;TK.poly([P(u-.13,4.15),P(u+.13,4.15),P(u+.02,3.2-(k%2)*.35)],AR,o);} // spiked war skirt
      for(const s of [-1,1])for(let k=0;k<3;k++)TK.cap(...P(s*.72,2.3-k*.4),...P(s*1.05,2.45-k*.4),.08*U,.02*U,AR2,o);},
    front(L){for(const [h,e2] of [[L.fh,L.fe],[L.bh,L.be]])for(let k=0;k<4;k++){const u=.2+k*.18,px=e2[0]+(h[0]-e2[0])*u,py=e2[1]+(h[1]-e2[1])*u;TK.cap(px,py,px-f*.4*U,py-.25*U,.09*U,.02*U,AR2,o);}}});
  // head: demon skull with fangs; the great horned crest
  for(const s of [-1,1]){chain([P(s*.3,7.85),P(s*.75,8.35),P(s*1.05,9.0),P(s*1.0,9.75),P(s*.8,10.2)],.2*U,.04*U,HORN,o);for(let k=1;k<4;k++){const p=P(s*(.35+k*.22),7.95+k*.5);TK.line(p[0]-.1*U,p[1],p[0]+.1*U,p[1]-.05*U,AR2,o);}}
  TK.ell(...P(0,7.55),.36*U,.44*U,RB2,o);TK.poly([P(-.28,7.35),P(.28,7.35),P(.18,6.95),P(-.18,6.95)],RB,o);TK.poly([P(-.36,7.8),P(.36,7.8),P(.3,7.65),P(-.3,7.65)],AR,o);
  for(let k=-2;k<=2;k++)TK.line(...P(k*.08,7.2),...P(k*.08,7.08),LY,o);
  TK.end();
  // lava cracks through the flesh (not the black armour), brighter toward the heart
  const hx0=P(0,6.0);TK.each((s,wx,wy)=>{if((buf[s]&255)<70)return;const lx=wx-x,ly=wy-y,v=Math.abs(Math.sin(lx*.23+Math.sin(ly*.11)*2.2)+Math.sin(ly*.19+Math.sin(lx*.13)*2.4)),d=Math.hypot(wx-hx0[0],wy-hx0[1]),th=.09+Math.max(0,.2-d*.002);
    if(v<th){const k=.5+.5*Math.sin(T*.08+d*.05),cc=v<th*.45?mixc(LV,LY,k):mixc(C(170,46,12),LV,k);buf[s]=o.flash?C(255,255,255):cc;gbuf[s]=cc;}});
  TK.rim(C(255,140,50),1,0,C(200,70,10));TK.rim(C(255,170,70),0,-1);
  const hc=P(0,7.55);for(let k=0;k<9;k++)TK.flame(hc[0]+(k-4)*.1*U,hc[1]-.35*U,-Math.PI/2+(k-4)*.14,.9*U+H01(k,5)*.8*U,.18*U,k,FIRE3,{ink:false});
  TK.glowDot(...P(-.14,7.6),1,C(255,245,170));TK.glowDot(...P(.14,7.6),1,C(255,245,170));TK.aura(...hx0,30,C(255,150,50),.5);
  // the Twilight Sword: a blade of living flame
  const tip=m.tip||[sx,sy-200],dx=tip[0]-sx,dy=tip[1]-sy,Lb=Math.hypot(dx,dy)||1,nx=-dy/Lb,ny=dx/Lb;
  TK.begin();TK.cap(sx-nx*16,sy-ny*16,sx+nx*16,sy+ny*16,4,4,HORN,{});
  TK.poly([[sx+nx*7,sy+ny*7],[sx+dx*.92+nx*4,sy+dy*.92+ny*4],[tip[0],tip[1]],[sx+dx*.92-nx*4,sy+dy*.92-ny*4],[sx-nx*7,sy-ny*7]],LV,{glow:C(255,120,30)});
  TK.poly([[sx+nx*3,sy+ny*3],[sx+dx*.95,sy+dy*.95],[sx-nx*3,sy-ny*3]],LY,{glow:C(255,220,140),flat:true});TK.line(sx,sy,sx+dx*.9,sy+dy*.9,C(255,255,230),{glow:C(255,255,200)});TK.end();
  for(let k=0;k<8;k++){const u=.1+k/8*.85;TK.flame(sx+dx*u,sy+dy*u,-Math.PI/2+Math.sin(T*.1+k)*.4,10+H01(k,T>>3)*10,4,k+60,FIRE3,{ink:false});}
  m.lm={head:P(0,7.55),core:hx0,hand:L.fh};}

// ================= KNULL =================
export function drawKnull(e,S=1){const f=e.face,x=e.x,y=e.y,m=e.mem,o={flash:e.flash>0},T=ST.frame;
  const BK=C(20,18,28),BK2=C(10,9,16),SM=C(58,54,74),SK=C(212,208,198),SKD=C(130,124,118),HAIR=C(232,222,180),RD=C(240,46,40);
  const R=rig(x,y-34*S+7.5*21.25,170,f),{P,U}=R;
  const necro=m.act==='necro'&&m.t>=30,ang=necro?Math.atan2(m.dy,m.dx):Math.PI/2-f*.5,fHand=necro?P(2.2,6.0):P(1.8,3.6);
  TK.begin();
  const L=figure(R,{torso:BK,pec:BK,abs:BK2,arm:BK,fore:BK,fist:BK2,thigh:BK,shin:BK,foot:BK2,neck:BK2,seam:SM},{fHand,bHand:P(-1.85,3.6),spread:.1},o,{
    back(){ // living symbiote: a crown of tendrils and a ragged cape
      for(let k=0;k<12;k++){const s=k%2?1:-1,j=k>>1,a=-Math.PI/2+s*(.35+j*.24)+Math.sin(T*.05+k)*.12,Ln=(3+j*.6+Math.sin(T*.07+k*2)*.4)*U,b=P(0,6.4),pts=[];
        for(let q=0;q<=4;q++){const u=q/4,w=Math.sin(T*.12+k+u*5)*.4*U*u;pts.push([b[0]+Math.cos(a)*Ln*u-Math.sin(a)*w,b[1]+Math.sin(a)*Ln*u*.8+Math.cos(a)*w-u*u*.6*U]);}
        chain(pts,.3*U,.06*U,BK,o);const tp=pts[4];TK.cap(tp[0],tp[1],tp[0]+Math.cos(a)*.4*U,tp[1]+Math.sin(a)*.4*U,.08*U,.02*U,SK,{...o,ink:false});}
      const hem=[];for(let k=0;k<=8;k++){const u=k/8;hem.push(P(-(.6+u*1.6)+Math.sin(T*.1+k)*.15,.6+Math.sin(T*.13+k*1.7)*.3+(k%2?.45:0)));}TK.poly([P(-.4,6.6),P(-1.1,6.6),...hem.reverse(),P(-.3,3)],BK,o);},
    mid(){for(const s of [-1,1])for(let k=0;k<3;k++)TK.cap(...P(s*(1.1+k*.3),6.75),...P(s*(1.15+k*.42),7.5+(k===1?.25:0)),.1*U,.02*U,BK,o);
      for(const s of [-1,1])TK.cap(...P(s*.65,2.15),...P(s*.65+.35,2.55),.08*U,.02*U,SM,o);}});
  // head: pale skull face, long pale hair streaming up and back
  const hp=[];for(let k=0;k<=6;k++){const u=k/6;hp.push(P(-(.1+u*1.4)+Math.sin(T*.1+u*4)*.15*u,7.9+u*1.0+Math.sin(T*.08+u*3)*.3*u));}chain(hp,.32*U,.06*U,HAIR,o);
  TK.ell(...P(-.05,7.6),.36*U,.44*U,HAIR,o);TK.ell(...P(.04,7.5),.3*U,.4*U,SK,o);TK.poly([P(-.24,7.3),P(.28,7.3),P(.04,6.98)],SK,o);
  for(const s of [-1,1])TK.ell(...P(.04+s*.13,7.58),.11*U,.09*U,BK2,{...o,flat:true});TK.cap(...P(.06,7.42),...P(.04,7.35),.04*U,.05*U,BK2,o);
  TK.line(...P(-.1,7.2),...P(.18,7.2),BK2,o);for(let k=-1;k<=2;k++)TK.line(...P(k*.07,7.24),...P(k*.07,7.16),SKD,o);
  TK.end();
  TK.rim(SM,-1,-1);TK.rim(C(110,104,140),1,0);
  // the red sigil burns on his chest
  const sg={glow:C(255,60,40)};TK.line(...P(-.85,6.6),...P(0,5.2),RD,sg);TK.line(...P(.85,6.6),...P(0,5.2),RD,sg);TK.line(...P(-.75,6.6),...P(0,5.4),RD,sg);TK.line(...P(.75,6.6),...P(0,5.4),RD,sg);TK.line(...P(0,5.2),...P(0,4.6),RD,sg);
  TK.aura(...P(0,5.8),26,C(255,50,40),.35);
  for(const s of [-1,1])TK.glowDot(...P(.04+s*.13,7.58),0,C(255,240,240));
  // the Necrosword (All-Black): a jagged black blade with a white-hot edge
  const h=L.fh,dx=Math.cos(ang),dy=Math.sin(ang),nx=-dy,ny=dx,Lb=3.4*U;
  TK.begin();TK.cap(h[0]-nx*.35*U,h[1]-ny*.35*U,h[0]+nx*.35*U,h[1]+ny*.35*U,.1*U,.1*U,SM,{});
  TK.poly([[h[0]+nx*3,h[1]+ny*3],[h[0]+dx*Lb*.4+nx*5,h[1]+dy*Lb*.4+ny*5],[h[0]+dx*Lb*.5+nx*3,h[1]+dy*Lb*.5+ny*3],[h[0]+dx*Lb*.62+nx*5,h[1]+dy*Lb*.62+ny*5],[h[0]+dx*Lb,h[1]+dy*Lb],[h[0]-nx*3,h[1]-ny*3]],BK2,{});
  TK.end();TK.line(h[0]+nx*2,h[1]+ny*2,h[0]+dx*Lb,h[1]+dy*Lb,C(240,240,255),{glow:C(200,200,255)});
  if(T%4===0)crackle(h[0]+dx*Lb*.7,h[1]+dy*Lb*.7,14,C(220,220,255),11);
  m.lm={head:P(0,7.55),hand:h};}
