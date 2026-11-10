// Frame render: world, bodies, particles, player, enemies, FX, minimap; hands the frame to gl.js.
import { presentGL } from '../gl.js';
import { drawEnemy } from './drawEnemy.js';
import { ST } from '../state.js';
import { ACID, EMBER, F, FIRE, G, GFIRE, GLASS, ICE, KIND, LAVA, NEON, PROPANE, R, S, SMOKE, STEAM, VIBR, rgb } from '../world/materials.js';
import { PHYS } from '../world/physics.js';
import { H, VH, VW, VWMAX, W, bg, col, life, onViewResize, t } from '../world/grid.js';
import { bodies } from '../world/support.js';
import { SET, bgL, fgL, htL, inkL, lumC, lut, rimL } from './look.js';
import { PAR } from '../maps/gen.js';
import { pc, pg, pl, pvx, pvy, px, py } from '../world/particles.js';
import { afters, beams, flashes, rings } from './fx.js';
import { shade } from '../world/destruction.js';
import { PP, posePlayer } from './rig.js';
import { JET_PAL, JET_SPR, SPAWN, drones, jets, pins, shots, strikes, therm, waves } from '../heroes/powers.js';
import { metalPal } from '../heroes/xmen.js';
import { DECOY_PAL } from '../heroes/iceman.js';
import { ARTS } from '../art/index.js';
import { FANT_A, FANT_B, FANT_PAL, drawWave2 } from '../heroes/wave2.js';
import { drawBlob } from '../heroes/venom.js';
import { glowRGB, hand, mouse, pl_ } from '../player.js';
import { ENEMY_TYPES, enemies } from '../enemies/core.js';
import { bctx, blur, buf, circle, ctx, cv, gaddS, gbuf, gctx, gimg, glc, img, line, mbuf, mctx, mimg, mm, pix, pixA, sctx, sim } from './canvas.js';
import { drawComics } from './comic.js';
import { drawAxe, drawHammer, drawSlip, drawSprite } from './sprites.js';
import { groundBelow } from '../ui/spawn.js';
import { drawChain } from '../heroes/wave4.js';
import { drawStatus, drawSummons } from '../heroes/abilities.js';
import { drawLife } from '../world/life.js';
import { drawAuras, drawBeamFx, drawFlashFx, drawFxBack, drawFxFront, drawRingFx, drawShieldFx, drawShotFx, drawStatusFx } from './vfxdraw.js';

const flick=new Float32Array(256);
let SPACE_ROW,htm; // screen-sized: rebuilt when the zoom changes the view (world/grid.js setView)
function viewBufs(){SPACE_ROW=new Uint32Array(VH);htm=new Uint8Array(VW*VH);
  for(let y=0;y<VH;y++){const k=Math.pow(y/VH,3);SPACE_ROW[y]=rgb(3+k*22|0,4+k*38|0,12+k*70|0);}
  for(let y=0;y<VH;y++)for(let x=0;x<VW;x++){const ox2=(y>>2)&1?2:0,dx=((x+ox2)&3)-1.5,dy=(y&3)-1.5;htm[y*VW+x]=dx*dx+dy*dy<1.8?1:0;}}
viewBufs();onViewResize(viewBufs);
export function render(){
  ST.CX=ST.camX|0;ST.CY=ST.camY|0;
  gbuf.fill(0);const ink=SET.ink;let nFire=0,nLava=0;
  const fl=ST.frame, fx0=((ST.CX+VW/2)*PAR-VW/2+VWMAX/2)|0, /* parallax anchored at the screen centre, so every zoom sees the same skyline behind the same spot */ fyo=(ST.CY*.5)|0, sa=ST.spaceA, sa1=1-sa;
  for(let i=0;i<256;i++)flick[i]=R();
  let fi=0;
  // space: near-black with a thin blue limb toward the horizon, and a slow-parallax star field
  const spc=SPACE_ROW, stX=(ST.CX*.04)|0, stY=(ST.CY*.04)|0;
  const toSpace=(f,sx,sy)=>{const s=spc[sy];let r=(f&255)*sa1+(s&255)*sa,g=((f>>8)&255)*sa1+((s>>8)&255)*sa,b=((f>>16)&255)*sa1+((s>>16)&255)*sa;
    const X=sx+stX,Y=sy+stY,h=Math.imul(X*73856093^Y*19349663,2654435761)>>>0;
    if((h&1023)<3){const tw=(h>>>10&255)/255,v=(130+tw*125)*(.75+.25*Math.sin(fl*.05+h))*sa*sa;r+=v;g+=v;b+=v*1.05;}
    return rgb(r>255?255:r,g>255?255:g,b>255?255:b);};
  for(let sy=0;sy<VH;sy++){
    const wy=sy+ST.CY;let i=wy*W+ST.CX,o=sy*VW;const frow=(Math.max(0,Math.min(H-1,sy+fyo)))*ST.FW+fx0; // above the map the skyline sinks away at half speed
    if(wy<0){for(let sx=0;sx<VW;sx++,o++){let f=ST.far[frow+sx];if(sa>0)f=toSpace(f,sx,sy);buf[o]=ink&&!htm[o]&&!ST.farKeep[frow+sx]?lut(htL,f):f;}continue;}
    for(let sx=0;sx<VW;sx++,i++,o++){
      const m=t[i];
      if(m===0){const b=bg[i];if(b)buf[o]=lut(bgL,b);else{let f=ST.far[frow+sx];if(sa>0)f=toSpace(f,sx,sy);buf[o]=ink&&!htm[o]&&!ST.farKeep[frow+sx]?lut(htL,f):f;}continue;}
      switch(m){
        case FIRE:{nFire++;const l=life[i];const c=rgb(255,90+Math.min(160,l*4)+(flick[fi++&255]*30|0),20+(flick[fi++&255]*30|0));buf[o]=c;gbuf[o]=c;break;}
        case GFIRE:{nFire++;const f=flick[fi++&255];const c=f<.3?rgb(200,255,210):f<.7?rgb(60,255,100):rgb(20,180,60);buf[o]=c;gbuf[o]=c;break;}
        case LAVA:{nLava++;const f=Math.sin(i*.37+fl*.05)*25;buf[o]=rgb(240,90+f,20);gbuf[o]=rgb(200,60,10);break;}
        case EMBER:{const c=rgb(255,100+life[i]*.6,30);buf[o]=c;gbuf[o]=c;break;}
        case ICE:{let c=col[i];if(ink&&t[i-W]===0)c=lut(rimL,c);buf[o]=lut(fgL,c);if(((i*7+(fl>>2))&127)===0)gbuf[o]=rgb(120,180,230);break;}
        case VIBR:{let c=col[i];if(ink&&t[i-W]===0)c=lut(rimL,c);buf[o]=lut(fgL,c);if(((i*13+(fl>>2))&31)===0)gbuf[o]=rgb(110,60,200);break;} // vibranium hums with a faint violet glow
        case NEON:{const c=col[i];buf[o]=c;gbuf[o]=rgb((c&255)*.7,((c>>8)&255)*.7,((c>>16)&255)*.7);break;}
        case ACID:{buf[o]=col[i];if((i+fl)%7===0)gbuf[o]=rgb(60,140,20);break;}
        case SMOKE:case STEAM:case PROPANE:{
          const a=m===PROPANE?.35:Math.min(1,life[i]/60),c=col[i],b0=bg[i],b=b0?b0:ST.far[frow+sx];
          buf[o]=rgb((c&255)*a+(b&255)*(1-a),((c>>8)&255)*a+((b>>8)&255)*(1-a),((c>>16)&255)*a+((b>>16)&255)*(1-a));break;}
        case GLASS:{const c=col[i],b0=bg[i],b=b0?b0:ST.far[frow+sx];buf[o]=rgb(((c&255)+(b&255))>>1,(((c>>8)&255)+((b>>8)&255))>>1,(((c>>16)&255)+((b>>16)&255))>>1);break;}
        default:{let c=col[i];
          if(ink){const k=KIND[m];if(k!==G){const up=t[i-W];
            if(up===0||KIND[up]===G||KIND[up]===F)c=lut(rimL,c); // lit top edge
            else if(k===S&&(t[i+W]===0||t[i-1]===0||t[i+1]===0))c=lut(inkL,c);}} // ink outline
          buf[o]=lut(fgL,c);}
      }
    }
  }
  ST.ambFire=nFire;ST.ambLava=nLava;
  if(ST.storm){const k=Math.min(1,ST.storm.life/60);for(let sy=0;sy<VH;sy++){const a=(1-sy/VH)*.45*k;if(a<.02)break;for(let sx=0;sx<VW;sx++){const o=sy*VW+sx,c=buf[o];buf[o]=rgb((c&255)*(1-a)+12*a,((c>>8)&255)*(1-a)+14*a,((c>>16)&255)*(1-a)+28*a);}}}
  // falling chunks
  for(const b of bodies){
    const rr=Math.ceil(b.rmax)+2;if(b.x-rr>ST.CX+VW||b.y-rr>ST.CY+VH||b.x+rr<ST.CX||b.y+rr<ST.CY)continue;
    const c=Math.cos(b.a),s=Math.sin(b.a);
    for(let Y=Math.max(ST.CY,b.y-rr|0);Y<Math.min(ST.CY+VH,b.y+rr+1);Y++)for(let X=Math.max(ST.CX,b.x-rr|0);X<Math.min(ST.CX+VW,b.x+rr+1);X++){
      const dx=X-b.x,dy=Y-b.y,lx=Math.round(dx*c+dy*s+b.cx),ly=Math.round(-dx*s+dy*c+b.cy);
      if(lx<0||ly<0||lx>=b.lw||ly>=b.lh)continue;const o=ly*b.lw+lx;if(!b.lm[o])continue;
      let bc=b.lc[o];if(ink&&(lx===0||ly===0||lx===b.lw-1||ly===b.lh-1||!b.lm[o-1]||!b.lm[o+1]||!b.lm[o-b.lw]||!b.lm[o+b.lw]))bc=lut(inkL,bc);
      const so=(Y-ST.CY)*VW+(X-ST.CX);buf[so]=lut(fgL,bc);if(b.held&&!b.overhead&&((lx+ly+ST.frame)&7)===0)gbuf[so]=rgb(40,160,70);
    }
  }
  drawLife(); // civilians, window people, birds, planes (world/life.js)
  for(let n=0;n<ST.np;n++){const c=pc[n],gl=pg[n]&1;if(pg[n]&16){pixA(px[n],py[n],c,Math.min(1,pl[n]/PHYS.dust.fade)*.55);continue;}pix(px[n],py[n],c,gl?c:0);const vx=pvx[n],vy=pvy[n];
    if(vx*vx+vy*vy>4.5){const c2=shade(c,.62);pix(px[n]-vx*.45,py[n]-vy*.45,c2,gl?c2:0);}} // motion streaks on fast debris and sparks
  const VT=ST.vfxT||(ST.vfxT={});let vt=performance.now();const vlap=k=>{const n=performance.now();VT[k]=n-vt;vt=n;}; // debug: VFX ms per part (GAME.ST.vfxT)
  drawFxBack(); // comic smoke, shards, goo (render/vfxdraw.js)
  vlap('back');
  // projectiles
  for(const s of shots){
    if(s.delay>0)continue;
    if(s.draw){s.draw(s,pix);continue;} // shots that draw themselves (Cap's shield)
    if(s.type!=='hammer'&&s.type!=='bomb'&&s.type!=='pin'&&s.type!=='axe'){drawShotFx(s);continue;} // energy bolts, shards, cards, blades... in the shooter's style
    if(s.type!=='hammer'&&s.type!=='bomb'){const g=s.col?rgb(s.col[0]*.6,s.col[1]*.6,s.col[2]*.6):s.type==='missile'?rgb(255,150,60):rgb(60,200,90);line(s.x-s.vx*1.6,s.y-s.vy*1.6,s.x-s.vx*.3,s.y-s.vy*.3,g,g);}
    if(s.type==='missile'){pix(s.x,s.y,rgb(210,210,220));pix(s.x-s.vx*.3,s.y-s.vy*.3,rgb(140,140,150));pix(s.x-s.vx*.6,s.y-s.vy*.6,rgb(255,200,80),rgb(255,150,40));}
    else if(s.type==='hammer'){const ca=Math.cos(s.spin),sa=Math.sin(s.spin);for(let k=-2;k<=2;k++)for(let w=-1;w<=1;w++)pix(s.x+k*ca-w*sa,s.y+k*sa+w*ca,rgb(170,176,186),rgb(90,130,220));for(let k=2;k<5;k++)pix(s.x-k*sa,s.y+k*ca,rgb(110,80,50));}
    else if(s.type==='bomb'){for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)pix(s.x+xx,s.y+yy,rgb(70,70,80));pix(s.x,s.y-1,ST.frame%10<5?rgb(255,80,60):rgb(80,20,20),ST.frame%10<5?rgb(255,60,40):0);}
    else if(s.col){const c=rgb(s.col[0],s.col[1],s.col[2]),w=rgb(255,255,255);pix(s.x,s.y,w,c);pix(s.x+1,s.y,c,c);pix(s.x-1,s.y,c,c);pix(s.x,s.y+1,c,c);pix(s.x,s.y-1,c,c);}
    else{const c=rgb(220,255,225),r=s.type==='bolt'?2:1;for(let k=-r;k<=r;k++){pix(s.x+k,s.y,c,c);pix(s.x,s.y+k,c,c);}if(r>1){pix(s.x+1,s.y+1,c,c);pix(s.x-1,s.y-1,c,c);pix(s.x+1,s.y-1,c,c);pix(s.x-1,s.y+1,c,c);}}
  }
  // beams & arcs
  vlap('shots');
  for(const b of beams)drawBeamFx(b); // layered beams and arcs (render/vfxdraw.js)
  vlap('beams');
  // drones
  for(const d of drones){for(let yy=0;yy<5;yy++)for(let xx=0;xx<7;xx++){const eye=yy===2&&(xx===2||xx===4);if((yy===0||yy===4)&&(xx===0||xx===6))continue;pix(d.x-3+xx,d.y-2+yy,eye?rgb(255,90,70):yy===0?rgb(150,158,170):rgb(100,108,120),eye?rgb(255,60,40):0);}}
  for(const e of enemies)drawEnemy(e);
  drawSummons();drawStatus(pix,enemies);drawStatusFx(enemies);
  drawWave2();
  // ---- new power visuals: planted / falling / towed Mjolnir, Stormbreaker, thermite, the X-Jet, Iceman's decoy
  for(const P2 of pins)drawHammer(P2.x,P2.y-2,-Math.PI/2);
  for(const s of shots){if(s.type==='pin')drawHammer(s.x,s.y-2,-Math.PI/2);else if(s.type==='axe')drawAxe(s.x,s.y,s.spin);}
  if(pl_.tow&&pl_.grip)drawHammer(pl_.grip.x,pl_.grip.y,Math.atan2(-pl_.tow.dy,-pl_.tow.dx));
  for(const b of therm){const c=b.stuck?((ST.frame+(b.x|0))&2?rgb(255,255,230):rgb(255,220,140)):rgb(255,240,200);pix(b.x,b.y,c,rgb(255,190,90));if(b.stuck){gaddS((b.x-ST.CX)|0,(b.y-ST.CY-1)|0,90,50,10);gaddS((b.x-ST.CX+1)|0,(b.y-ST.CY)|0,90,50,10);}}
  for(const j of jets)drawSprite(j.x,j.y+4,0,j.dir,false,JET_SPR,JET_PAL);
  if(ST.decoy){if(ST.decoy.kind!=='holo'||(ST.frame+(ST.frame>>3))%9>0)drawSprite(ST.decoy.x,ST.decoy.y,0,ST.decoy.face,false,ST.decoy.spr||ARTS.iceman.spr,ST.decoy.pal||DECOY_PAL);if(ST.decoy.hp<ST.decoy.max){const f=Math.max(0,ST.decoy.hp/ST.decoy.max);for(let k=-6;k<=6;k++)pix(ST.decoy.x+k,ST.decoy.y-ST.SH-4,k+6<f*13?rgb(150,220,255):rgb(30,50,70));}}
  if(ST.senseT>0)for(const e of enemies){const hw=e.def.w/2+3,hh=e.def.h/2+3,c=(ST.frame>>2)&1?rgb(255,80,60):rgb(255,200,80);for(let k=-hw;k<=hw;k++){pix(e.x+k,e.y-hh,c,c);pix(e.x+k,e.y+hh,c,c);}for(let k=-hh;k<=hh;k++){pix(e.x-hw,e.y+k,c,c);pix(e.x+hw,e.y+k,c,c);}}
  if(pl_.spin>0){for(let k=0;k<3;k++){const an=ST.frame*.7+k*2.09;for(let q2=0;q2<4;q2++){const a2=an-q2*.12;pix(pl_.x+Math.cos(a2)*13,pl_.y-ST.PH/2+Math.sin(a2)*13,q2?rgb(120,170,255):rgb(200,206,216),rgb(90,130,220));}}}
  // gravity well: dark core + accretion ring
  if(ST.vortex){const v=ST.vortex,rr=7+Math.sin(ST.frame*.2)*1.5;for(let y=-rr;y<=rr;y++)for(let x=-rr;x<=rr;x++)if(x*x+y*y<rr*rr)pix(v.x+x,v.y+y,rgb(4,10,6));
    for(let k=0;k<80;k++){const a=k/80*6.283+ST.frame*.2;const r2=rr+1+Math.sin(a*3+ST.frame*.3)*1.5;pix(v.x+Math.cos(a)*r2,v.y+Math.sin(a)*r2*.6,rgb(160,255,180),rgb(60,255,100));}}
  // orbital targeting
  for(const s of strikes)if(s.t>0){const r=6+s.t*.6;circle(s.x,mouse.wy,r,rgb(120,255,150),rgb(40,200,80));line(s.x,mouse.wy-r-4,s.x,mouse.wy+r+4,rgb(120,255,150),rgb(40,200,80));if(ST.frame%6<3)line(s.x,ST.CY,s.x,ST.CY+VH,rgb(40,120,60),0);}
  // afterimages
  for(const a of afters){ST.TG=a.col||null;drawSprite(a.x,a.y,a.ang,a.face,true);}ST.TG=null;
  // cape trail
  const p=pl_;
  if(ST.CH.cape&&p.hist.length>3){const yo=ST.PH-5;for(let k=1;k<Math.min(8,p.hist.length);k++){const [hx,hy]=p.hist[k];const wv=Math.sin(ST.frame*.3+k)*1.2;pix(hx-p.face*(2+k*.4),hy-yo+k*.6+wv,k<4?ST.CH.cape[0]:ST.CH.cape[1]);pix(hx-p.face*(2+k*.4),hy-yo+1+k*.6+wv,ST.CH.cape[1]);}}
  if(p.ant>0)drawSprite(p.x,p.y+5,0,p.face,false,(ST.frame>>2)&1?FANT_A:FANT_B,FANT_PAL);
  if(ST.CH.board&&p.fly){const c=Math.cos(p.ang),s2=Math.sin(p.ang),bx=p.x-s2*1,by=p.y+1;for(let k=-9;k<=9;k++){const X=bx+k*c,Y=by+k*s2,edge=Math.abs(k)>7;const bc=ST.CH.boardC;pix(X,Y,bc?(edge?bc[1]:bc[0]):edge?rgb(150,156,172):rgb(226,232,244),edge?0:bc?bc[2]:rgb(90,160,230));if(Math.abs(k)<8)pix(X,Y+1,bc?bc[1]:rgb(110,116,130));}} // the Surfer's board, the Goblin's glider
  if(!p.slip&&!p.blob)drawAuras(p,ST.CH.id); // phoenix wings, binary flame, rage... (render/vfxdraw.js)
  if(p.slip)drawSlip(p.slip);else if(p.blob)drawBlob(p);else drawSprite(p.x,p.y+PP*ST.SZ,p.ang,p.face,false,posePlayer(p),p.metal>0?metalPal():null,p.hurtF,p.stealth>0,ST.SZ);
  const h=hand();
  if(ST.CH.id==='thor'&&!p.tow&&!pins.length&&!shots.some(s=>s.type==='hammer'||s.type==='pin')){for(let yy=0;yy<3;yy++)pix(h.x,h.y+yy,rgb(110,80,50));for(let yy=-2;yy<0;yy++)for(let xx=-1;xx<=1;xx++)pix(h.x+xx,h.y+yy,rgb(160,166,176));}
  else if(ST.CH.id!=='hulk')pix(h.x,h.y,glowRGB(),glowRGB());
  if(mouse.down&&ST.GS==='play'&&ST.CH.id!=='hulk'){const gc=ST.CH.glow,c=rgb(gc[0],gc[1],gc[2]),rr=4.5+Math.sin(ST.frame*.4);for(let k=0;k<6;k++){const a=k/6*6.283+ST.frame*.18;pix(h.x+Math.cos(a)*rr,h.y+Math.sin(a)*rr,c,c);pix(h.x+Math.cos(a+.25)*rr,h.y+Math.sin(a+.25)*rr,c,c);}}
  if(ST.shieldOn)drawShieldFx(p.x,p.y-8,17,ST.shieldC,ST.CH.id); // the bubble in the hero's style (render/vfxdraw.js)
  vt=performance.now();
  {const n0=rings.length-40;for(let i=0;i<rings.length;i++)drawRingFx(rings[i],i<n0);} // past the newest 40, rings draw as thin lines (chain blasts can leave 300)
  vlap('rings');
  for(const f of flashes)drawFlashFx(f);
  vlap('flashes');
  drawFxFront(); // sparks, embers, stars, runes, sigils, slashes, flares (render/vfxdraw.js)
  vlap('front');
  if(ST.stasis){const s=ST.stasis,r=s.r,x0=Math.max(0,(s.x-r-ST.CX)|0),x1=Math.min(VW-1,(s.x+r-ST.CX)|0),y0=Math.max(0,(s.y-r-ST.CY)|0),y1=Math.min(VH-1,(s.y+r-ST.CY)|0),k=Math.min(1,s.life/30);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x+ST.CX-s.x,dy=y+ST.CY-s.y,d2=dx*dx+dy*dy;if(d2>r*r)continue;const o=y*VW+x,c=buf[o],l=lumC(c),a=.35*k;
      buf[o]=rgb((c&255)*(1-a)+(l*.7+90)*a,((c>>8)&255)*(1-a)+(l*.5+40)*a,((c>>16)&255)*(1-a)+(l*.7+110)*a);if(d2>(r-2)*(r-2)&&((x+y+(ST.frame>>1))&3)){buf[o]=rgb(255,170,235);gbuf[o]=rgb(160,60,140);}}}
  if(SPAWN.tool&&ST.GS==='play'){const T=SPAWN.tool,x=mouse.wx,y=mouse.wy,c=(ST.frame>>3)&1?rgb(255,201,60):rgb(226,59,46);
    if(T.cat==='enemies'){const d=ENEMY_TYPES[T.id];if(d){const hw=d.w/2+1,hh=d.h/2+1;for(let k=-hw;k<=hw;k+=2){pix(x+k,y-hh,c,c);pix(x+k,y+hh,c,c);}for(let k=-hh;k<=hh;k+=2){pix(x-hw,y+k,c,c);pix(x+hw,y+k,c,c);}}}
    else if(T.cat==='objects'){const gy=SPAWN.snap?groundBelow(x,y):y;for(let k=-8;k<=8;k++)pix(x+k,gy,c,c);for(let yy=y;yy<gy;yy+=3)pix(x,yy,c,0);}
    else circle(x,y,SPAWN.brush+.5,c,0);}
  drawChain(pix); // Ghost Rider's chain
  // area-size preview: a ring at the cursor for a moment after Z / X
  if(ST.aoeShow>0&&ST.GS==='play'){const r=24*ST.aoeK,a=Math.min(1,ST.aoeShow/20),c=rgb(255*a,220*a,110*a);for(let k=0,n=Math.max(24,r*5|0);k<n;k++){if((k+(ST.frame>>1))%4===0)continue;const an=k/n*6.283;pix(mouse.wx+Math.cos(an)*r,mouse.wy+Math.sin(an)*r,c,c);}}
  // Knull's dark: everything but a pool of light around the hero sinks to black
  if(ST.dark>0){const k=ST.dark,cx=p.x-ST.CX,cy=p.y-ST.PH/2-ST.CY;for(let y=0;y<VH;y++)for(let x=0;x<VW;x++){const d=Math.hypot(x-cx,y-cy),a=Math.min(.92,Math.max(0,(d-50)/90))*k;if(a<=0)continue;const o=y*VW+x,c=buf[o];buf[o]=rgb((c&255)*(1-a),((c>>8)&255)*(1-a),((c>>16)&255)*(1-a)+6*a);}}
  sctx.putImageData(img,0,0);if(SET.bloom||ST.GL&&SET.light)gctx.putImageData(gimg,0,0);
  // shake: trauma curve (small rumbles barely register, big hits still land) driven by smooth noise, not per-frame random jumps
  const sk=SET.shake/100,tr=Math.min(1,ST.shake/22),amp=tr*Math.sqrt(tr)*22*ST.scale*.3*sk,sf=ST.frame;
  let sx=amp*(Math.sin(sf*.93)*.6+Math.sin(sf*1.71+1.3)*.4),sy=amp*(Math.sin(sf*1.07+2.1)*.6+Math.sin(sf*1.93+.4)*.4);ST.shake*=.88;if(ST.shake<.2)ST.shake=0;
  sx-=(ST.camX-ST.CX)*ST.scale;sy-=(ST.camY-ST.CY)*ST.scale; // sub-pixel camera: the frame glides instead of stepping a whole pixel at a time
  if(ST.GL){presentGL(ST.ox+sx,ST.oy+sy,VW*ST.scale,VH*ST.scale,ST.scale,{bloom:SET.bloom,light:SET.light,time:performance.now()/1000,ca:SET.fx?Math.min(4,ST.caPulse):0,haze:SET.fx?.6:0,
      waves:SET.fx?waves.map(w=>({x:w.x-ST.CX,y:w.y-ST.CY,r:w.r,s:w.s*Math.min(1,w.life/12)})):null,tint:ST.slowT>0?[.72,.88,1.3,.6]:SPAWN.pause?[.8,.86,1.05,.45]:null,
      heat:ST.heatZ&&SET.fx?[ST.heatZ.x-ST.CX,ST.heatZ.y-ST.CY,ST.heatZ.r*1.3,Math.min(1,ST.heatZ.life/40)*1.2]:null,
      flash:SET.fx&&ST.flashK>.01&&ST.flashC?[ST.flashC[0]/255,ST.flashC[1]/255,ST.flashC[2]/255,ST.flashK]:null,zoom:SET.fx&&ST.zoomK>.003?[ST.zoomX-ST.CX,ST.zoomY-ST.CY,ST.zoomK]:null});ctx.clearRect(0,0,cv.width,cv.height);} // WebGL draws the frame + bloom under the 2D overlay
  else{ // 2D-canvas fallback
    bctx.clearRect(0,0,VW/2,VH/2);bctx.filter='blur(3px)';bctx.drawImage(glc,0,0,VW/2,VH/2);bctx.filter='none';
    ctx.fillStyle='#050806';ctx.fillRect(0,0,cv.width,cv.height);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(sim,ST.ox+sx,ST.oy+sy,VW*ST.scale,VH*ST.scale);
    ctx.globalCompositeOperation='lighter';ctx.imageSmoothingEnabled=true;
    if(SET.bloom){ctx.globalAlpha=.95;ctx.drawImage(blur,ST.ox+sx,ST.oy+sy,VW*ST.scale,VH*ST.scale);ctx.globalAlpha=.35;ctx.drawImage(glc,ST.ox+sx,ST.oy+sy,VW*ST.scale,VH*ST.scale);}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
  drawComics(sx,sy);
  // minimap
  const MW=mm.width,MH=mm.height;
  if(ST.frame%15===0){for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=Math.min(H-1,y*8+4)*W+Math.min(W-1,x*8+4),m=t[i];mbuf[y*MW+x]=m?col[i]:(bg[i]?bg[i]:rgb(20,24,40));}mctx.putImageData(mimg,0,0);}
  // the minimap shows at most 1600 px of world around the camera at 1.2 screen px per 8 world px; wider maps scroll inside it
  const span=Math.min(W,1600),sx0=Math.max(0,Math.min(W-span,ST.CX+VW/2-span/2)),k=1.2/8,mw=span*k,mh=H*k,mx=cv.width-mw-16,my=window.HS_MINIMAP_Y??100; // the phone build lifts it to the top edge
  if(ST.GS==='menu'||ST.GS==='over')return;
  ctx.fillStyle='#14110f';ctx.fillRect(mx+3,my+3,mw+4,mh+4);ctx.drawImage(mm,sx0/8,0,span/8,MH,mx,my,mw,mh);ctx.strokeStyle='#ffc93c';ctx.lineWidth=2;ctx.strokeRect(mx+(ST.CX-sx0)*k,my+ST.CY*k,VW*k,VH*k);ctx.strokeStyle='#14110f';ctx.lineWidth=3;ctx.strokeRect(mx-1,my-1,mw+2,mh+2);
  if(W>span){ctx.fillStyle='#ffc93c';ctx.fillRect(mx+sx0/W*mw,my+mh+4,Math.max(4,span/W*mw),3);} // where this window sits in the whole map
  for(const e of enemies){if(e.x<sx0||e.x>sx0+span||e.def.name==='titan_part')continue;const b=!!e.def.title;ctx.fillStyle=e.ally>0?'#ff9ad8':b?'#c88cff':'#ff6b5c';const s2=b?(e.def.titan?7:4):2;ctx.fillRect(mx+(e.x-sx0)*k-s2/2,my+e.y*k-s2/2,s2,s2);} // enemies on the minimap
  ctx.fillStyle='#e23b2e';ctx.fillRect(mx+(p.x-sx0)*k-1.5,my+p.y*k-3,3,3);
}
