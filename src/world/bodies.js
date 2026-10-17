// Rotating rigid chunks: make, crush, fracture, collide, land.
import { NAT, bm, bodies, gnd, obAdd, pin, rcount, rid, str } from './support.js';
import { ST } from '../state.js';
import { ASH, DENS, EMPTY, F, G, GLASS, GRASS, HARD, ICE, KIND, L, LEAF, P, R, RUBBLE, S, SMOKE, STEEL, WATER, rgb } from './materials.js';
import { PHYS } from './physics.js';
import { BACK, H, W, bg, bgB, bgD, col, life, markDirty, setc, t, vel, wake } from './grid.js';
import { MP, crumble, dustCol, rubbleCol, spawn, spawnDust } from './particles.js';
import { flash, fxWord, rings } from '../render/fx.js';
import { explode, shade } from './destruction.js';
import { snd } from '../sfx.js';
import { inStasis } from '../heroes/powers.js';
import { hurt, mouse, pl_ } from '../player.js';

export function makeBody(list,n,held){
  if(n<10||bodies.length>=150){ for(let k=0;k<n;k++){const i=list[k];crumble(i);pin[i]=0;wake(i);} return null; }
  if(n>1200&&ST.MODE&&ST.MODE.onCollapse&&!ST.genMode)ST.MODE.onCollapse(n,ST.MS);
  let mx=W,my=H,Mx=0,My=0,sx=0,sy=0;
  for(let k=0;k<n;k++){const i=list[k],x=i%W,y=(i/W)|0;if(x<mx)mx=x;if(y<my)my=y;if(x>Mx)Mx=x;if(y>My)My=y;sx+=x;sy+=y;}
  const lw=Mx-mx+1, lh=My-my+1, lm=new Uint8Array(lw*lh), lc=new Uint32Array(lw*lh); obAdd(mx,my);obAdd(Mx,My);
  const cx=sx/n-mx, cy=sy/n-my;
  for(let k=0;k<n;k++){const i=list[k],x=i%W-mx,y=((i/W)|0)-my;lm[y*lw+x]=t[i];lc[y*lw+x]=col[i];t[i]=0;pin[i]=0;wake(i);}
  // backdrop walls enclosed by this structure come along
  for(let y=0;y<lh;y++){let L=-1,Rr=-1;for(let x=0;x<lw;x++)if(lm[y*lw+x]){if(L<0)L=x;Rr=x;}
    for(let x=L+1;x<Rr;x++){const o=y*lw+x;if(lm[o])continue;const i=(my+y)*W+mx+x;if(!bgB[i])continue;lm[o]=BACK;lc[o]=shade(bg[i],.85);bg[i]=bgD[i];bgB[i]=0;}}
  const b=finishBody(lm,lc,lw,lh,cx,cy,mx+cx,my+cy,0,n,held);
  if(ST.frame-ST.lastBoom.f<20){ // fling + spin away from the blast that cut it loose
    const ddx=b.x-ST.lastBoom.x,ddy=b.y-ST.lastBoom.y,d=Math.hypot(ddx,ddy)||1;
    if(d<ST.lastBoom.r*6){const f=Math.min(3.5,ST.lastBoom.r*9/(d+10))*Math.min(1,400/n);b.vx+=ddx/d*f;b.vy+=ddy/d*f-.6;b.va+=(R()-.5)*f*.03;}
  }
  return b;
}
export function finishBody(lm,lc,lw,lh,cx,cy,x,y,a,n,held){
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
    if(ST.np<MP-200&&R()<.7){const sd=X<b.x?-1:1;
      spawn(X,Y,ux*v*(.3+R()*.4)+(uy?sd*(.4+R()*v*.45):(R()-.5)*1.5),uy*v*.15-R()*v*.45-(ux?R():0),col[j],80+R()*70,kd===S?RUBBLE:m,m===GLASS?1:0);}
    if(bgB[j]){bg[j]=bgD[j];bgB[j]=0;}
    setc(j,EMPTY);if(R()<.04)dust(X-ux*2|0,Y-uy*2|0);
  }
  ST.shake=Math.max(ST.shake,Math.min(9,cost*.03));
  return dv;
}
// a hard landing breaks a big chunk along jagged cracks into smaller chunks that bounce and tumble on
function fracture(b,impact){
  impact=Math.min(impact,10);
  if(b.n>400){fxWord(b.x,b.y-b.rmax*.6,R()<.5?'KRUNCH!':'KRASH!',Math.min(1.6,.8+b.n/4000),'#f3e9d2',true);ST.hitstop=Math.max(ST.hitstop,2);}
  const lw=b.lw,lh=b.lh,lm=b.lm,lc=b.lc,c=Math.cos(b.a),s=Math.sin(b.a);
  const K=Math.min(8,2+(Math.sqrt(b.n)/10|0)+(impact>8?1:0)),sx=[],sy=[];snd('crumble',b.x,b.y,{size:Math.min(2.2,.6+Math.sqrt(b.n)/30),gap:.08});snd('thud',b.x,b.y,{v:Math.min(1,impact/6)});
  for(let k=0;k<K;k++){let o=0,tries=0;do{o=R()*lw*lh|0;}while(!lm[o]&&++tries<60);sx.push(o%lw);sy.push(o/lw|0);}
  const own=new Int8Array(lw*lh).fill(-1),cnt=new Int32Array(K);
  const wx=(x,y)=>b.x+(x-b.cx)*c-(y-b.cy)*s, wy=(x,y)=>b.y+(x-b.cx)*s+(y-b.cy)*c;
  for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const o=y*lw+x,m=lm[o];if(!m)continue;
    let b1=1e9,b2=1e9,k1=0;for(let k=0;k<K;k++){const dx=x-sx[k],dy=y-sy[k],d=dx*dx+dy*dy;if(d<b1){b2=b1;b1=d;k1=k;}else if(d<b2)b2=d;}
    if(Math.sqrt(b2)-Math.sqrt(b1)<.8+R()*1.6){ // crack line crumbles into flying debris
      if(ST.np<MP-300&&R()<.6)spawn(wx(x,y),wy(x,y),b.vx*.3+(R()-.5)*impact*.7,-R()*impact*.55,lc[o],90+R()*70,m===BACK||KIND[m]===S?RUBBLE:m,m===GLASS?1:0);
      continue;}
    own[o]=k1;cnt[k1]++;}
  for(let k=0;k<K;k++){
    if(cnt[k]<12){for(let o=0;o<lw*lh;o++)if(own[o]===k&&ST.np<MP-100){const x=o%lw,y=o/lw|0;spawn(wx(x,y),wy(x,y),(R()-.5)*impact*.6,-R()*impact*.5,lc[o],100,lm[o]===BACK||KIND[lm[o]]===S?RUBBLE:lm[o],0);}continue;}
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
  ST.shake=Math.min(22,ST.shake+Math.min(12,impact*Math.sqrt(b.n)/30));
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
export function bodyHit(b,ox,oy){return bodyHitPose(b,b.x+ox,b.y+oy,b.a);}
function contacts(b){
  const c=Math.cos(b.a),s=Math.sin(b.a);let n=0,sum=0,mn=1e9,mxx=-1e9;
  for(let k=0;k<b.ex.length;k++){const X=Math.round(b.x+b.ex[k]*c-b.ey[k]*s),Y=Math.round(b.y+b.ex[k]*s+b.ey[k]*c)+1;
    if(X<0||X>=W||Y<0)continue;if(Y>=H||KIND[t[Y*W+X]]===S||KIND[t[Y*W+X]]===P){n++;sum+=X;if(X<mn)mn=X;if(X>mxx)mxx=X;}}
  return{n,avg:n?sum/n:0,min:mn,max:mxx};
}
export function bodyAt(b,X,Y){ // local material under a world point
  const c=Math.cos(b.a),s=Math.sin(b.a),dx=X-b.x,dy=Y-b.y;
  const lx=Math.round(dx*c+dy*s+b.cx),ly=Math.round(-dx*s+dy*c+b.cy);
  return(lx<0||ly<0||lx>=b.lw||ly>=b.lh)?0:b.lm[ly*b.lw+lx];
}
export function updBodies(){
  const PB=PHYS.body,CK=PHYS.chunk;
  for(let n=bodies.length-1;n>=0;n--){
    const b=bodies[n];
    if(ST.stasis&&inStasis(b.x,b.y))continue; // hangs in the air until the bubble pops (and does not age, so it cannot freeze up there)
    b.age++;
    if(b.held){ if(!b.overhead){b.vx=(b.vx+((b.tx??mouse.wx)-b.x)*.18)*.72; b.vy=(b.vy+((b.ty??mouse.wy)-b.y)*.18)*.72; b.va*=.9;} }
    else { b.vy+=PB.grav; b.vx*=PB.drag; b.va*=PB.spinDrag; if(b.topple&&b.age<90)b.va+=b.topple*.0015; }
    const sp=Math.hypot(b.vx,b.vy); if(sp>PB.maxV){b.vx*=PB.maxV/sp;b.vy*=PB.maxV/sp;}
    if(Math.abs(b.va)>PB.maxSpin)b.va=Math.sign(b.va)*PB.maxSpin;
    const ns=Math.min(14,Math.max(1,Math.ceil(Math.max(Math.abs(b.vx),Math.abs(b.vy),Math.abs(b.va)*b.rmax))));
    let landed=false, impact=0, grounded=false;
    for(let s=0;s<ns&&!landed;s++){
      // vertical
      const ny=b.y+b.vy/ns;
      let dv=0;
      if(!bodyHitPose(b,b.x,ny,b.a))b.y=ny;
      else if(b.vy>PB.crushV&&b.age>PB.grace&&!b.held&&!b.chunk&&b.n>=30&&(dv=crush(b,b.x,ny,b.a,b.vy,0,1))){b.vy-=dv;b.y=ny;}
      else if(b.chunk&&b.vy>0&&!b.held){ // small chunk: bounce, skid and tumble, then rest
        grounded=true;
        if(b.vy>CK.minBounceV){b.vy*=-CK.bounce;b.vx*=1-CK.friction;b.va=b.va*.5+b.vx*CK.roll;if(b.vy<-.8)debrisBurst(b,1.2,2);}
        else{b.vy=0;b.vx*=1-CK.friction;b.va*=.6;}
      }
      else if(b.vy>0&&!b.held){
        grounded=true;
        const hit=b.vy+Math.abs(b.va)*b.rmax*.6, c=contacts(b);
        const off=b.x-c.avg, stable=c.n===0||(b.x>=c.min-1&&b.x<=c.max+1);
        if((hit>PB.landV&&b.age>PB.grace)||(stable&&Math.abs(b.va)<.01)){landed=true;impact=hit;break;}
        if(!stable){ // tip over the edge: torque from the overhanging centre of mass
          b.va+=Math.sign(off)*Math.min(.014,Math.abs(off)*.0009+.002); b.vx+=Math.sign(off)*.04;
        }
        if(hit>2.5)debrisBurst(b,hit*.5,4);
        b.vy*=-PB.landBounce;
      } else b.vy=0;
      // horizontal
      const nx=b.x+b.vx/ns;
      if(!bodyHitPose(b,nx,b.y,b.a))b.x=nx;
      else if(Math.abs(b.vx)>PB.crushV&&b.age>PB.grace&&!b.held&&!b.chunk&&b.n>=30&&(dv=crush(b,nx,b.y,b.a,Math.abs(b.vx),Math.sign(b.vx),0))){b.vx-=Math.sign(b.vx)*dv;b.x=nx;}
      else{ if(Math.abs(b.vx)>PB.wallV&&b.age>PB.grace&&!b.held&&!b.chunk){landed=true;impact=Math.abs(b.vx);break;} b.vx*=b.chunk?-CK.bounce:-PB.wallBounce; }
      // rotation
      const na=b.a+b.va/ns;
      if(!bodyHitPose(b,b.x,b.y,na))b.a=na;
      else{ if(Math.abs(b.va)*b.rmax>PB.spinV&&b.age>PB.grace&&!b.held&&!b.chunk){landed=true;impact=Math.abs(b.va)*b.rmax;break;} b.va*=-PB.spinBounce; }
    }
    if(!landed&&!b.held){
      if(grounded&&Math.abs(b.vx)<.4&&Math.abs(b.vy)<.6&&Math.abs(b.va)<.006)b.rest++;else b.rest=Math.max(0,b.rest-1);
      if(b.rest>PB.restTicks||(b.age>PB.maxAge&&grounded)){landed=true;impact=Math.max(1,Math.abs(b.vy));} // only ever freezes while on support
    }
    // splash liquids / sweep gas the chunk overlaps, tear through back walls; shed dust while moving fast
    const c=Math.cos(b.a),s=Math.sin(b.a),spd=Math.hypot(b.vx,b.vy)+Math.abs(b.va)*b.rmax;let wet=0,wl=WATER;
    for(let k=0;k<b.ex.length;k++){const X=Math.round(b.x+b.ex[k]*c-b.ey[k]*s),Y=Math.round(b.y+b.ex[k]*s+b.ey[k]*c);if(X<0||X>=W||Y<0||Y>=H)continue;const j=Y*W+X,m=t[j];
      if(m===0){if(spd>3&&!b.held&&bgB[j]&&R()<.35){if(ST.np<MP-200)spawn(X,Y,b.vx*.5+(R()-.5)*2,b.vy*.3-R(),shade(bg[j],.8),80,RUBBLE,0);bg[j]=bgD[j];bgB[j]=0;}continue;}
      const kd=KIND[m];if(kd===S||kd===P)continue;
      if(kd===L){wet++;wl=m;if(spd>1.5){if(ST.np<MP-200)spawn(X,Y,(R()-.5)*2+b.vx*.4,-.6-R()*1.5-Math.abs(b.vy)*.4,col[j],70,m,0);setc(j,EMPTY);if(spd>3&&!b.splashed){b.splashed=1;snd('splash',X,Y,{v:Math.min(1,spd/6)});}}}
      else setc(j,EMPTY);}
    if(wet&&!b.held){const f=wet/b.ex.length;b.vy-=f*PB.buoy*DENS[wl]/b.dens;b.vx*=1-f*.12;b.vy*=1-f*.12;b.va*=1-f*.1;if(f>.15&&b.dens<DENS[wl])b.rest=0;}
    if(!b.held&&!b.chunk&&!(b.safeP>ST.frame)&&spd>3&&b.age>4&&ST.frame-b.hitP>20&&Math.abs(pl_.x-b.x)<b.rmax+4&&Math.abs(pl_.y-ST.PH/2-b.y)<b.rmax+8&&bodyAt(b,pl_.x,pl_.y-ST.PH/2)){
      b.hitP=ST.frame;hurt(Math.min(30,spd*Math.sqrt(b.n)/12));pl_.vx+=b.vx*.7;pl_.vy+=b.vy*.7;ST.shake=Math.max(ST.shake,6);}
    if(spd>1.5&&!b.held){const cnt=Math.min(8,(b.ex.length/120)*spd|0);for(let k=0;k<cnt;k++){const e=R()*b.ex.length|0;const X=b.x+b.ex[e]*c-b.ey[e]*s,Y=b.y+b.ex[e]*s+b.ey[e]*c;spawnDust(X,Y,b.vx*.6+(R()-.5)*1.5,b.vy*.4-R(),R()<.5?rgb(150,140,125):rgb(110,105,98));}}
    if(landed){ landBody(b,impact); bodies.splice(n,1); }
    else if(b.y>H+80){ bodies.splice(n,1); }
  }
}
function debrisBurst(b,power,cnt){
  const c=Math.cos(b.a),s=Math.sin(b.a);
  for(let k=0;k<cnt;k++){const e=R()*b.ex.length|0;const X=b.x+b.ex[e]*c-b.ey[e]*s,Y=b.y+b.ex[e]*s+b.ey[e]*c;spawnDust(X,Y-1,(R()-.5)*power,-R()*power,rgb(160,150,135));}
}
function landBody(b,impact){
  impact*=1+Math.min(1,b.h/120); // heavy, tall chunks hit harder (was up to 3.5x, which shattered slow landings)
  if(impact>PHYS.body.fractureV&&b.n>=100&&b.gen<2&&!b.held&&bodies.length<140){fracture(b,impact);return;}
  ST.bgen++;
  const c=Math.cos(b.a),s=Math.sin(b.a),hw=b.lw/2+2,hh=b.lh/2+2;
  const ext=Math.ceil(Math.abs(hw*c)+Math.abs(hh*s))+2, eyt=Math.ceil(Math.abs(hw*s)+Math.abs(hh*c))+2;
  const ccx=b.x+((b.lw/2-b.cx)*c-(b.lh/2-b.cy)*s), ccy=b.y+((b.lw/2-b.cx)*s+(b.lh/2-b.cy)*c);
  const list=[];
  for(let Y=Math.max(0,ccy-eyt|0);Y<Math.min(H,ccy+eyt+1);Y++)for(let X=Math.max(0,ccx-ext|0);X<Math.min(W,ccx+ext+1);X++){
    const dx=X-b.x,dy=Y-b.y,lx=Math.round(dx*c+dy*s+b.cx),ly=Math.round(-dx*s+dy*c+b.cy);
    if(lx<0||ly<0||lx>=b.lw||ly>=b.lh)continue;const o=ly*b.lw+lx,m=b.lm[o];if(!m)continue;
    const j=Y*W+X;if(t[j]!==0&&KIND[t[j]]!==G&&KIND[t[j]]!==F)continue;
    if(m===BACK){ // backdrop wall stays with the wreck as back wall (only a hard landing breaks some of it up)
      if(impact>PHYS.body.crumbleV&&R()<.25){if(R()<.3)spawnDust(X,Y,(R()-.5)*1.5,-R(),dustCol(b.lc[o]));}
      else if(!bgB[j]){bg[j]=b.lc[o];bgB[j]=1;}
      continue;}
    t[j]=m;col[j]=b.lc[o];life[j]=0;vel[j]=0;pin[j]=0;gnd[j]=NAT[m];str[j]=12;bm[j]=ST.bgen;wake(j);markDirty(j);list.push(j);
  }
  const thrown=b.thrown&&impact>4;
  // crack lines across tall chunks so they keep breaking apart
  const cracks=[]; if(b.h>24&&impact>PHYS.body.crumbleV)for(let k=0;k<Math.min(6,b.h/18|0);k++)cracks.push(R()*b.h|0);
  let burst=0;
  for(const j of list){
    const X=j%W,Y=(j/W)|0;if(Y>=H-1)continue;const m=t[j], bottom=bm[j+W]!==ST.bgen;
    const ly=Math.round(-(X-b.x)*s+(Y-b.y)*c+b.cy);
    let p=m===GLASS||m===ICE&&b.icicle?(impact>1.2?1:.4):b.chunk?0:Math.max(0,(impact-PHYS.body.crumbleV)*.16)*(bottom?2.4:1)/(1+HARD[m]*.08)*PHYS.mix.landCrumble;
    if(cracks.includes(ly)&&!b.chunk)p=Math.max(p,.9*PHYS.mix.landCrumble*2);
    if(R()<p){
      if(R()<.45&&impact>2.2&&burst<2500){burst++;const up=bottom?1.4:1;
        spawn(X,Y,(R()-.5)*impact*.9+b.vx*.4,-R()*impact*.7*up+b.vy*.2,col[j],90+R()*60,KIND[m]===S?RUBBLE:m,m===GLASS?1:0);t[j]=0;}
      else{t[j]=m===LEAF||m===GRASS?(R()<.5?ASH:RUBBLE):RUBBLE;if(t[j]===RUBBLE)col[j]=rubbleCol(col[j]);}
      wake(j);
    }
    if(bottom&&impact>2.5&&R()<.12)dust(X,Y-2);
  }
  {const r=rcount.length;let c=0;for(const j of list)if(KIND[t[j]]===S){rid[j]=r;c++;}rcount.push(c);} // settled debris counts as an intact piece
  if(b.chunk){if(impact>1.5){for(let k=0;k<4;k++)spawnDust(b.x+(R()-.5)*b.lw,b.y+b.lh/2,(R()-.5)*1.5,-R()*.8,dustCol(b.lc[0]));if(R()<.3)snd('crumble',b.x,b.y,{size:.4,v:.3,gap:.12});}}
  else if(impact>1.8){snd(b.glassy?'glass':'crumble',b.x,b.y,{size:Math.min(2,Math.sqrt(b.n)/40),v:Math.min(1,impact/4),gap:.06});ST.shake=Math.min(22,ST.shake+Math.min(12,impact*Math.sqrt(b.n)/35)); rings.push({x:b.x,y:b.y+b.lh/2,r:3,vr:2+impact*.35,life:18,c:[190,180,160]});}
  if(thrown)explode(b.x,b.y,Math.min(12,impact*1.3|0),{fire:.1});
}
export function dust(X,Y){if(X<0||X>=W||Y<0||Y>=H)return;const i=Y*W+X;if(t[i]!==0)return;setc(i,SMOKE);const v=(R()*20)|0;col[i]=rgb(150+v,135+v,115+v);life[i]=70+R()*80;}
