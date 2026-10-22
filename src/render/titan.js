// Drawing kit for the titan bosses, which are far too big for hand-typed sprites. Shapes are drawn
// straight into the frame in world coordinates with the game's comic look: three-tone shading lit from
// the upper left, a dithered half-tone between tones, and a heavy ink outline.
//   TK.begin()                       start a figure (clears the coverage mask)
//   TK.ell(cx,cy,rx,ry,c,o)          filled ellipse     o: {glow, ink:false, flat}
//   TK.cap(x0,y0,x1,y1,r0,r1,c,o)    tapered capsule (limbs, horns, blades)
//   TK.poly(pts,c,o)                 filled polygon
//   TK.end()                         ink outline around everything drawn since begin()
import { ST } from '../state.js';
import { rgb } from '../world/materials.js';
import { VH, VW } from '../world/grid.js';
import { buf, gbuf } from './canvas.js';
import { SET } from './look.js';

const mask=new Uint8Array(VW*VH);
// optional scale about an anchor (TK.xf): lets a titan be drawn bigger than its coordinates are written
let XO=0,YO=0,XS=1;const tx=x=>XO+(x-XO)*XS,ty=y=>YO+(y-YO)*XS;let mx0=VW,my0=VH,mx1=-1,my1=-1;
const K=(c,k)=>rgb(Math.min(255,(c&255)*k),Math.min(255,((c>>8)&255)*k),Math.min(255,((c>>16)&255)*k));
export const TC=(r,g,b)=>rgb(r,g,b);
function put(X,Y,c,shade,o){ // X,Y screen
  if(X<0||X>=VW||Y<0||Y>=VH)return;const s=Y*VW+X;
  let k=o&&o.flat?1:shade>.45?1.22:shade>.18?((X+Y)&1?1.22:1):shade>-.25?1:shade>-.45?((X+Y)&1?1:.62):.62;
  if(o&&o.flash)c=rgb(255,255,255),k=1;
  buf[s]=K(c,k);if(o&&o.glow)gbuf[s]=o.glow===true?c:o.glow;
  if(o&&o.ink===false)return; // flames and energy: no outline, not part of the figure
  mask[s]=1;if(X<mx0)mx0=X;if(X>mx1)mx1=X;if(Y<my0)my0=Y;if(Y>my1)my1=Y;
}
export const TK={
  xf(ox,oy,s){XO=ox;YO=oy;XS=s;},
  begin(){mask.fill(0);mx0=VW;my0=VH;mx1=-1;my1=-1;},
  ell(cx,cy,rx,ry,c,o){if(XS!==1){cx=tx(cx);cy=ty(cy);rx*=XS;ry*=XS;}const X0=Math.max(0,cx-rx-ST.CX|0),X1=Math.min(VW-1,cx+rx-ST.CX|0),Y0=Math.max(0,cy-ry-ST.CY|0),Y1=Math.min(VH-1,cy+ry-ST.CY|0);
    for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++){const dx=(X+ST.CX-cx)/rx,dy=(Y+ST.CY-cy)/ry,d=dx*dx+dy*dy;if(d>1)continue;put(X,Y,c,(-dx*.7-dy*.7)*.8+(1-d)*.25-.1,o);}},
  cap(x0,y0,x1,y1,r0,r1,c,o){if(XS!==1){x0=tx(x0);y0=ty(y0);x1=tx(x1);y1=ty(y1);r0*=XS;r1*=XS;}const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy||1,rm=Math.max(r0,r1);
    const X0=Math.max(0,Math.min(x0,x1)-rm-ST.CX|0),X1=Math.min(VW-1,Math.max(x0,x1)+rm-ST.CX|0),Y0=Math.max(0,Math.min(y0,y1)-rm-ST.CY|0),Y1=Math.min(VH-1,Math.max(y0,y1)+rm-ST.CY|0);
    const L=Math.sqrt(L2),nx=-dy/L,ny=dx/L;
    for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++){const px=X+ST.CX-x0,py=Y+ST.CY-y0,u=Math.max(0,Math.min(1,(px*dx+py*dy)/L2)),r=r0+(r1-r0)*u,qx=px-dx*u,qy=py-dy*u,d=Math.hypot(qx,qy);if(d>r)continue;
      const side=(qx*nx+qy*ny)/r;put(X,Y,c,(side*(nx<0?.7:-.7)+(ny<0?-.2:.2)*side)-.05+(1-d/r)*.2,o);}},
  poly(pts,c,o){if(XS!==1)pts=pts.map(([x,y])=>[tx(x),ty(y)]);let a=1e9,b=-1e9,e=1e9,f=-1e9;for(const [x,y] of pts){a=Math.min(a,x);b=Math.max(b,x);e=Math.min(e,y);f=Math.max(f,y);}
    const Y0=Math.max(0,e-ST.CY|0),Y1=Math.min(VH-1,f-ST.CY|0),cx=(a+b)/2,cy=(e+f)/2,hw=(b-a)/2||1,hh=(f-e)/2||1;
    for(let Y=Y0;Y<=Y1;Y++){const wy=Y+ST.CY+.5,xs=[];for(let k=0;k<pts.length;k++){const [x0,y0]=pts[k],[x1,y1]=pts[(k+1)%pts.length];if((y0<=wy&&y1>wy)||(y1<=wy&&y0>wy))xs.push(x0+(wy-y0)/(y1-y0)*(x1-x0));}
      xs.sort((p,q)=>p-q);for(let k=0;k+1<xs.length;k+=2)for(let X=Math.max(0,xs[k]-ST.CX|0);X<=Math.min(VW-1,xs[k+1]-ST.CX|0);X++){const dx=(X+ST.CX-cx)/hw,dy=(wy-cy)/hh;put(X,Y,c,(-dx*.6-dy*.6)*.7,o);}}},
  end(){if(!SET.ink||mx1<0)return;const k0=rgb(16,12,14);
    for(let Y=Math.max(1,my0-1);Y<=Math.min(VH-2,my1+1);Y++)for(let X=Math.max(1,mx0-1);X<=Math.min(VW-2,mx1+1);X++){const s=Y*VW+X;if(mask[s])continue;if(mask[s-1]||mask[s+1]||mask[s-VW]||mask[s+VW])buf[s]=k0;}},
  // 1 px detail line (armour seams, chin ridges, cracks); o: {glow}
  line(x0,y0,x1,y1,c,o){if(XS!==1){x0=tx(x0);y0=ty(y0);x1=tx(x1);y1=ty(y1);}const d=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))|0;for(let k=0;k<=d;k++){const f=d?k/d:0,X=x0+(x1-x0)*f-ST.CX|0,Y=y0+(y1-y0)*f-ST.CY|0;if(X<0||X>=VW||Y<0||Y>=VH)continue;const s=Y*VW+X;buf[s]=o&&o.flash?rgb(255,255,255):c;if(o&&o.glow)gbuf[s]=o.glow===true?c:o.glow;mask[s]=1;}},
  // pattern pass over everything drawn since begin(): fn(s,wx,wy) may recolour buf[s] / gbuf[s]
  each(fn){if(mx1<0)return;for(let Y=my0;Y<=my1;Y++)for(let X=mx0;X<=mx1;X++){const s=Y*VW+X;if(mask[s])fn(s,X+ST.CX,Y+ST.CY);}},
  // rim light: figure pixels whose neighbour at (dx,dy) is outside the figure take colour c (and glow g)
  rim(c,dx,dy,g){if(mx1<0)return;const o=dy*VW+dx,n=[];for(let Y=Math.max(1,my0);Y<=Math.min(VH-2,my1);Y++)for(let X=Math.max(1,mx0);X<=Math.min(VW-2,mx1);X++){const s=Y*VW+X;if(mask[s]&&!mask[s+o])n.push(s);}
    for(const s of n){buf[s]=c;if(g)gbuf[s]=g;}},
  // soft additive glow (bloom source) around a point; k 0..1 strength
  aura(x,y,r,c,k=1){if(XS!==1){x=tx(x);y=ty(y);r=r*XS|0;}const X0=x-ST.CX|0,Y0=y-ST.CY|0,cr=(c&255)*k,cg=((c>>8)&255)*k,cb=((c>>16)&255)*k;
    for(let j=-r;j<=r;j+=1)for(let i=-r;i<=r;i+=1){const d=(i*i+j*j)/(r*r);if(d>=1)continue;const X=X0+i,Y=Y0+j;if(X<0||X>=VW||Y<0||Y>=VH)continue;const f=(1-d)*(1-d),s=Y*VW+X,o=gbuf[s];
      gbuf[s]=rgb(Math.min(255,(o&255)+cr*f),Math.min(255,((o>>8)&255)+cg*f),Math.min(255,((o>>16)&255)+cb*f));}},
  // a licking flame tongue from (x,y) toward angle a: outer / mid / core colours, flickers with seed
  flame(x,y,a,len,w,sd,cols,o){const T=ST.frame,n=5,pts=[];for(let k=0;k<=n;k++){const u=k/n,wob=Math.sin(T*.23+sd*1.7+u*4)*w*.7*u;pts.push([x+Math.cos(a)*len*u-Math.sin(a)*wob,y+Math.sin(a)*len*u+Math.cos(a)*wob]);}
    const L=len*(.85+.15*Math.sin(T*.31+sd));for(let c=0;c<cols.length;c++){const s=1-c*.33;for(let k=0;k<n;k++){const u0=k/n,u1=(k+1)/n;if(u1*len>L*s+2)break;
      TK.cap(pts[k][0],pts[k][1],pts[k+1][0],pts[k+1][1],w*s*(1-u0*.85),w*s*(1-u1*.85),cols[c],{...o,glow:true,flat:true,ink:false});}}},
  glowDot(x,y,r,c){if(XS!==1){x=tx(x);y=ty(y);r=Math.round(r*XS);}const X0=x-ST.CX|0,Y0=y-ST.CY|0;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){if(i*i+j*j>r*r)continue;const X=X0+i,Y=Y0+j;if(X<0||X>=VW||Y<0||Y>=VH)continue;const s=Y*VW+X;buf[s]=c;gbuf[s]=c;}},
};
