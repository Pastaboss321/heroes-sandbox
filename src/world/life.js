// Ambient life (2026-10-28): civilians on the streets, people behind the windows, birds and planes in the sky.
// Everything lives around the camera only (spawned just off-screen, dropped once far away), so the long maps
// cost nothing extra. Nothing here is physical or takes damage: blasts knock civilians flying and they get up
// and run, enemies and fire send them fleeing, kills near the hero make them cheer. Each map picks its own
// mix in LIFE (counts, palettes, bird kind, aircraft).
// Hooks: maps/index.js regen() -> lifeReset(mapId) · loop.js tick (world running) -> updLife() ·
//        render/render.js after the terrain and chunks, before particles -> drawLife().
import { ST } from '../state.js';
import { ACID, FIRE, GLASS, LAVA, R, WATER, rgb } from './materials.js';
import { H, VH, VW, W, t } from './grid.js';
import { gnd } from './support.js';
import { solidAt, spawn } from './particles.js';
import { pix, pixA } from '../render/canvas.js';
import { fgL, lut } from '../render/look.js';
import { fxWord } from '../render/fx.js';
import { enemies } from '../enemies/core.js';
import { pl_ } from '../player.js';

const MOB=()=>window.HS_MOBILE?.6:1;
const URB={civ:34,birds:'pigeon',perch:10,planes:['air','air','prop','heli'],win:.3,pal:'city'};
export const LIFE={city:URB,nyc:URB,retro:URB,incursion:{...URB,civ:24},
  nyc2099:{civ:30,birds:'pigeon',perch:6,planes:['air','jet','heli'],win:.4,pal:'p2099'},
  forest:{civ:4,birds:'song',perch:0,planes:['air'],win:.3,pal:'hiker'},
  xmansion:{civ:14,birds:'song',perch:6,planes:['air','jet'],win:.4,pal:'student'},
  savage:{civ:0,birds:'ptero',planes:[]},
  arctic:{civ:3,birds:'gull',planes:['air'],win:.3,pal:'lab'},
  wakanda:{civ:26,birds:'song',perch:4,planes:['talon','talon','air'],win:.35,pal:'wakanda'},
  asgard:{civ:20,birds:'raven',perch:6,planes:[],win:.3,pal:'asgard'},
  sakaar:{civ:22,birds:null,planes:['junk'],win:.3,pal:'sakaar'},
  knowhere:{civ:12,birds:null,planes:['junk'],win:.3,pal:'miner'},
  titan:{civ:0},moon:{civ:0},dark:{civ:0}};
const C=a=>rgb(a[0],a[1],a[2]);
const SKIN=[[255,222,190],[236,188,150],[198,140,100],[150,100,66],[104,70,48]].map(C);
const HAIR=[[30,24,20],[70,46,30],[120,80,40],[220,190,120],[150,150,150],[160,50,30]].map(C);
const PALS={
  city:{shirt:[[200,50,50],[50,90,180],[240,200,60],[60,150,90],[230,230,230],[40,40,48],[230,120,40],[150,80,170],[90,180,200]],pants:[[40,60,110],[30,30,36],[150,130,90],[90,90,96]]},
  p2099:{shirt:[[255,60,200],[60,240,255],[200,255,60],[250,250,255],[40,40,60]],pants:[[30,30,50],[60,40,90],[20,20,30]],glow:true},
  hiker:{shirt:[[200,60,40],[60,120,60],[240,180,40]],pants:[[90,80,60],[40,50,70]]},
  student:{shirt:[[40,60,140],[240,200,40],[40,60,140],[230,230,230],[200,40,40]],pants:[[30,30,40],[40,50,90]]},
  lab:{shirt:[[235,238,242]],pants:[[60,60,70]]},
  wakanda:{shirt:[[130,40,160],[200,40,60],[230,170,40],[30,120,110],[240,120,40]],pants:[[60,30,80],[30,30,36],[120,50,40]],skin:[2,3,4]},
  asgard:{shirt:[[200,160,60],[150,30,30],[150,150,160],[60,80,140]],pants:[[70,50,30],[90,90,100]],skin:[0,1,2]},
  sakaar:{shirt:[[220,120,40],[40,160,160],[160,60,140],[200,200,60],[120,90,60]],pants:[[80,60,40],[60,60,70]],alien:[[110,170,220],[120,190,110],[200,110,160]]},
  miner:{shirt:[[200,110,40],[150,120,80],[100,100,90]],pants:[[70,60,50]],hat:[230,190,40]},
};
const pick=a=>a[R()*a.length|0];
const SCREAM=['AAH!','HELP!','RUN!','EEK!','LOOK OUT!','MOMMY!','NOPE!'],CHEER=['MY HERO!','YEAH!','WOO!','THANK YOU!',"GO GET 'EM!",'AMAZING!'];
const civs=[],birds=[],perch=[],planes=[];
ST.life={civs,birds,perch,planes}; // debug: GAME.ST.life
let cfg=LIFE.city,winX=null,winY=null,winW=null,winH=null,winS=null,buckets=[],wOut=new Set(),lastSay=-99,kills0=0;

// ---- reset and window scan (once per map: every pane of glass 1-6 wide and 5-16 tall is a window someone can stand behind)
export function lifeReset(id){
  cfg=LIFE[id]||{civ:0};civs.length=birds.length=perch.length=planes.length=0;wOut=new Set();kills0=ST.kills||0;
  const xs=[],ys=[],ws=[],hs=[];buckets=Array.from({length:(W>>5)+1},()=>[]);
  if(cfg.win){for(let y=1;y<H-1;y++){const r=y*W;for(let x=1;x<W-1;x++){const i=r+x;if(t[i]!==GLASS||t[i-1]===GLASS||t[i-W]===GLASS)continue;
    let w=0;while(w<8&&t[i+w]===GLASS)w++;let h=0;while(h<18&&t[i+h*W]===GLASS)h++;
    if(w<1||w>6||h<5||h>16)continue;buckets[x>>5].push(xs.length);xs.push(x);ys.push(y);ws.push(w);hs.push(h);}}}
  ST.life.nwin=xs.length;winX=Int32Array.from(xs);winY=Int32Array.from(ys);winW=Uint8Array.from(ws);winH=Uint8Array.from(hs);winS=Uint32Array.from(xs,(x,k)=>Math.imul(x*73856093^ys[k]*19349663,2654435761)>>>0);
}
const occupied=k=>{const s=winS[k],ep=(ST.frame+(s&4095))/(780+(s>>12&511))|0;return((Math.imul(s^ep*2246822519,2654435761)>>>0)&1023)/1024<cfg.win;};
const liquid=m=>m===WATER||m===LAVA||m===ACID||m===FIRE;

// ---- civilians
function makeCiv(x,y,air){const P=PALS[cfg.pal]||PALS.city;const kid=R()<.18;
  const sk=P.alien&&R()<.5?C(pick(P.alien)):SKIN[P.skin?pick(P.skin):R()*5|0];
  const c={x,y,dir:R()<.5?-1:1,sp:.22+R()*.18,fast:.9+R()*.4,kid,sk,hr:pick(HAIR),sh:C(pick(P.shirt)),pt:C(pick(P.pants)),hat:P.hat?C(P.hat):(R()<.12?C(pick(P.shirt)):0),glow:P.glow,
    t:R()*60|0,pan:0,idle:0,air:air?1:0,vx:0,vy:0,wet:0,cheer:0,bf:-1};civs.push(c);return c;}
function say(c,list,col){if(ST.frame-lastSay<45)return;if(c.x<ST.camX||c.x>ST.camX+VW||c.y<ST.camY||c.y>ST.camY+VH)return;lastSay=ST.frame;fxWord(c.x,c.y-14,pick(list),.55,col,true,true);}
function panic(c,fx){if(c.pan<=0&&R()<.35)say(c,SCREAM,'#fff4d0');c.pan=240+R()*120|0;c.idle=0;c.dir=c.x<fx?-1:1;}
// first open surface going down from y0 (feet stand on row y, body above it is clear); prefer streets over roofs
function groundAt(x,y0,y1){let roof=-1;for(let y=Math.max(10,y0|0);y<Math.min(H-1,y1|0);y++){if(!solidAt(x,y))continue;if(solidAt(x,y-1)){if(gnd&&gnd[y*W+x])break;continue;} // never below the first ground layer (no tunnels under buildings)
    let ok=true;for(let k=2;k<=10;k++)if(solidAt(x,y-k)){ok=false;break;}if(!ok||liquid(t[(y-1)*W+x]))continue;
    if(gnd&&gnd[y*W+x])return y;if(roof<0)roof=y;}
  return roof>=0&&R()<.25?roof:-1;}
function updCiv(c){c.t++;const b=ST.lastBoom;
  if(b&&ST.frame-b.f<2&&b.f!==c.bf){c.bf=b.f;const d=Math.hypot(c.x-b.x,c.y-5-b.y);
    if(d<b.r*2+10){c.air=1;c.vy=-2.2-R()*1.6;c.vx=(c.x<b.x?-1:1)*(1.2+R()*1.6);}if(d<b.r*8+100)panic(c,b.x);}
  if(c.t%15===0){for(const e of enemies){if(Math.abs(e.x-c.x)<80&&Math.abs(e.y-c.y)<50){panic(c,e.x);break;}}
    const m=t[((c.y-3)|0)*W+(c.x|0)];if(m===FIRE||m===LAVA){if(c.pan<=0)say(c,['HOT HOT HOT!','FIRE!'],'#ffb070');panic(c,c.x-c.dir);}
    if(m===WATER&&++c.wet>6)return false;}
  if(ST.kills>kills0&&c.pan<=0&&!c.air&&Math.abs(pl_.x-c.x)<150&&Math.abs(pl_.y-c.y)<80&&R()<.35){c.cheer=50;c.air=1;c.vy=-1.6;c.vx=0;c.dir=pl_.x<c.x?-1:1;say(c,CHEER,'#bfffb0');}
  if(c.cheer>0)c.cheer--;
  if(c.air){c.vy=Math.min(5,c.vy+.2*(ST.gk||1));const nx=c.x+c.vx,ny=c.y+c.vy;if(solidAt(nx,ny-4))c.vx*=-.3;else c.x=nx;
    if(c.vy>0&&solidAt(c.x,ny)){let y=ny|0;while(y>0&&solidAt(c.x,y-1))y--;c.y=y;c.air=0;c.vx=0;}else c.y=ny;return c.y<H-2;}
  if(!solidAt(c.x,c.y)){c.air=1;c.vy=0;c.vx=c.dir*.4;return true;}
  if(c.pan>0)c.pan--;else if(c.idle>0){c.idle--;return true;}else if(R()<.004)c.idle=60+R()*160|0;else if(R()<.002)c.dir=-c.dir;
  const sp=c.pan>0?c.fast:c.sp,nx=c.x+c.dir*sp,X=nx|0;
  if(X!==(c.x|0)){
    if(solidAt(X,c.y-1)){let k=1;while(k<=2&&solidAt(X,c.y-1-k))k++;if(k<=2&&!solidAt(X,c.y-7-k)){c.y-=k;c.x=nx;}else c.dir=-c.dir;return true;}
    if(solidAt(X,c.y-6)){c.dir=-c.dir;return true;}
    c.x=nx;if(!solidAt(X,c.y)){let k=1;while(k<=3&&!solidAt(X,c.y+k))k++;if(k<=3)c.y+=k;}
  }else c.x=nx;
  return true;}
function drawCiv(c,night){const L=v=>lut(fgL,v),x=c.x|0,y=c.y|0,d=c.dir,f=c.air?2:(c.pan>0||c.idle<=0)&&((c.t>>(c.pan>0?2:3))&1);
  const pt=L(c.pt),sh=L(c.sh),sk=L(c.sk),hr=L(c.hr),g=c.glow?sh:0;let yy=y-1;
  if(f===1){pix(x,yy,pt);pix(x,yy-1,pt);}else{pix(x-1,yy,pt);pix(x+1,yy,pt);if(!c.kid){pix(x-1,yy-1,pt);pix(x+1,yy-1,pt);}}
  yy-=c.kid?1:2;pix(x-1,yy,pt);pix(x,yy,pt);pix(x+1,yy,pt);yy--;
  const tr=c.kid?2:3;for(let k=0;k<tr;k++){pix(x-1,yy,sh,g);pix(x,yy,sh,g);pix(x+1,yy,sh,g);yy--;}
  const up=c.pan>0||c.cheer>0||c.air;if(up){const w=(c.t>>2)&1;pix(x-2,yy+1-w,sh);pix(x+2,yy+w,sh);pix(x-2,yy-w,sk);pix(x+2,yy-1+w,sk);}
  const h0=d<0?x-1:x;pix(h0,yy,sk);pix(h0+1,yy,sk);pix(h0,yy-1,sk);pix(h0+1,yy-1,sk);
  const hat=c.hat?L(c.hat):hr;pix(h0,yy-2,hat);pix(h0+1,yy-2,hat);pix(d<0?h0+1:h0,yy-1,hr);if(c.hat){pix(h0-1+(d>0?2:0),yy-2,hat);}
  if(night>.5&&c.glow){pix(x,yy-4,sh,sh);}}

// ---- birds: flocks crossing the sky, pigeons perched on roof edges that take off when something comes close
const BIRD={pigeon:[[92,96,108],[150,150,160]],song:[[60,48,40],[110,80,60]],gull:[[238,238,244],[150,156,170]],raven:[[22,22,30],[50,50,64]],ptero:[[140,92,60],[200,140,90]]};
function spawnFlock(){const dir=R()<.5?1:-1,n=cfg.birds==='ptero'?1+R()*2|0:4+R()*6|0,x0=dir>0?ST.camX-30:ST.camX+VW+30,y0=ST.camY+12+R()*VH*.35;
  if(solidAt(x0,y0))return;const sp=(cfg.birds==='ptero'?.7:1.1)+R()*.5;
  for(let k=0;k<n;k++){const row=(k+1)>>1,side=k&1?1:-1;birds.push({x:x0-dir*row*7,y:y0+row*4*side+(R()-.5)*2,vx:dir*sp,vy:0,ph:R()*6,big:cfg.birds==='ptero',kind:cfg.birds});}}
function updBird(b){b.ph+=b.big?.12:.32;const bm=ST.lastBoom;
  if(bm&&ST.frame-bm.f<2&&Math.hypot(b.x-bm.x,b.y-bm.y)<bm.r*6+120){b.vy-=1.2;b.vx*=1.6;}
  if(Math.hypot(b.x-pl_.x,b.y-pl_.y+8)<24){b.vy-=.6;b.vx+=Math.sign(b.x-pl_.x)*.3;}
  b.vy=b.vy*.96+Math.sin(b.ph*.21)*.02;if(solidAt(b.x+b.vx*6,b.y+4))b.vy-=.25;b.x+=b.vx;b.y+=b.vy;
  return b.x>ST.camX-VW&&b.x<ST.camX+VW*2&&b.y>ST.camY-VH&&b.y<H;}
function drawBird(b){const P=BIRD[b.kind]||BIRD.pigeon,c=lut(fgL,C(P[0])),x=b.x|0,y=b.y|0,up=Math.sin(b.ph)>0,s=b.big?2:1;
  pix(x,y,c);pix(x-s,y,c);pix(x+s,y,c);const wy=up?-1:1;
  if(b.big){pix(x-2,y+wy,c);pix(x+2,y+wy,c);pix(x-3,y+wy*2,c);pix(x+3,y+wy*2,c);pix(x+Math.sign(b.vx)*3,y,lut(fgL,C(P[1])));}
  else{pix(x-2,y+wy,c);pix(x+2,y+wy,c);}}
function spawnPerch(){const x=ST.camX+R()*VW|0;for(let y=Math.max(10,ST.camY|0);y<Math.min(H-1,ST.camY+VH);y++){if(!solidAt(x,y))continue;
  if(solidAt(x,y-1)||solidAt(x,y-2)||solidAt(x,y-3))return;if(gnd&&gnd[y*W+x])return;
  perch.push({x,y,dir:R()<.5?-1:1,t:R()*100|0,kind:cfg.birds});return;}}
function updPerch(p){p.t++;const bm=ST.lastBoom;let go=Math.hypot(p.x-pl_.x,p.y-pl_.y+8)<44||!solidAt(p.x,p.y);
  if(bm&&ST.frame-bm.f<2&&Math.hypot(p.x-bm.x,p.y-bm.y)<bm.r*6+120)go=true;
  if(!go&&p.t%20===0)for(const e of enemies)if(Math.abs(e.x-p.x)<50&&Math.abs(e.y-p.y)<40){go=true;break;}
  if(go){const d=p.x<pl_.x?-1:1;birds.push({x:p.x,y:p.y-2,vx:d*(1+R()*.6),vy:-1.2-R(),ph:0,kind:p.kind});return false;}
  if(R()<.004)p.dir=-p.dir;return p.x>ST.camX-VW&&p.x<ST.camX+VW*2;}
function drawPerch(p){const P=BIRD[p.kind]||BIRD.pigeon,c=lut(fgL,C(P[0])),c2=lut(fgL,C(P[1])),x=p.x,y=p.y-1,peck=((p.t>>4)%7)===0;
  pix(x,y,c);pix(x-p.dir,y,c);pix(x+p.dir,y-(peck?0:1),c2);}

// ---- aircraft
const SPR={
  air:{s:['#..............','##.............','#bbbbbbbbbbbbb.','bbbwbwbwbwbwbbn','.bbbbbbbbbbbbb.','.....ddd.......'],sp:.5,trail:true,lights:true},
  prop:{s:['#.......','#rrrrrrw','.rrrrrr.','...dd...'],sp:1.1,prop:true,lights:true},
  heli:{s:['..=======..','.....|.....','..kkkkkw...','tkkkkkkkw..','..k...k....','.kkkkkkkk..'],sp:.6,rotor:true,bob:true,lights:true,beam:true},
  jet:{s:['#.........','#kkkkkkkkn','..ddd.....'],sp:2.6,burn:[255,150,60]},
  talon:{s:['##..........','.vvvvvvvvvv.','vvvvvvvvvvvn','..ddddd.....'],sp:2.2,burn:[170,90,255]},
  junk:{s:['....oo......','.ggggggggg..','gogggogggoog','.ggggggggg..','..b....b....'],sp:.35,burn:[255,170,80],bob:true},
};
const APAL={'#':[200,40,50],b:[226,228,234],w:[40,60,100],n:[60,64,80],d:[150,154,166],r:[200,40,40],k:[48,52,60],t:[48,52,60],'|':[80,80,90],'=':[110,110,120],v:[60,40,90],g:[120,110,100],o:[220,130,40]};
function spawnPlane(){const kind=pick(cfg.planes),S=SPR[kind],dir=R()<.5?1:-1,x=dir>0?ST.camX-40:ST.camX+VW+40;
  let top=ST.camY+VH;for(let sx=0;sx<VW;sx+=8){const X=(ST.camX+sx)|0;for(let y=Math.max(0,ST.camY|0);y<top;y++)if(solidAt(X,y)){top=y;break;}}
  const y=Math.min(ST.camY+14+R()*34,top-34);if(y<ST.camY+6)return;planes.push({kind,x,y,y0:y,dir,t:0,sp:S.sp*(.85+R()*.3)});}
function drawPlane(p,night){const S=SPR[p.kind],s=S.s,h=s.length,w=s[0].length,x0=(p.x-w/2)|0,y0=(p.y-h/2)|0,fr=ST.frame;
  if(S.trail&&night<.7){const n=Math.min(160,p.t*.5|0),tx=p.dir>0?x0:x0+w,ty=y0+2;for(let k=0;k<n;k+=1){const a=.45*(1-k/n)*(1-night);if(a<.03)break;pixA(tx-p.dir*k,ty,rgb(250,250,255),a);if(k>40)pixA(tx-p.dir*k,ty+1,rgb(250,250,255),a*.5);}}
  if(S.beam&&night>.4){const bx=p.x,by=y0+h;for(let k=1;k<70;k+=1){const r=k*.35|0;for(let q=-r;q<=r;q+=2)pixA(bx+q+p.dir*k*.2,by+k,rgb(255,250,210),.18*(1-k/70)*night);}}
  for(let r=0;r<h;r++)for(let q=0;q<w;q++){const ch=s[r][p.dir>0?q:w-1-q];if(ch==='.')continue;if(ch==='='&&((q+fr)&1))continue;const c=APAL[ch];if(!c)continue;pix(x0+q,y0+r,lut(fgL,C(c)));}
  const nose=p.dir>0?x0+w:x0-1,tail=p.dir>0?x0-1:x0+w;
  if(S.prop&&fr&1){pix(nose,y0,rgb(200,200,200));pix(nose,y0+2,rgb(200,200,200));}
  if(S.burn){const c=C(S.burn);pix(tail,y0+1,c,c);if(fr&1)pix(tail-p.dir,y0+1,c,c);}
  if(S.lights&&night>.2){if((fr>>3)&1){const red=rgb(255,50,40);pix(x0+(w>>1),y0+h-1,red,red);}if(fr%40<3){const wht=rgb(255,255,255);pix(tail,y0,wht,wht);}}}

// ---- tick and draw
export function updLife(){if(!cfg)return;const m=MOB(),f=ST.frame;
  if(cfg.civ&&f%(civs.length<cfg.civ*m*.5?3:12)===0&&civs.length<cfg.civ*m){const fill=civs.length<cfg.civ*m*.5,x=(fill?ST.camX+(R()-.25)*VW*1.5:(R()<.5?ST.camX-12-R()*160:ST.camX+VW+12+R()*160))|0;
    if(x>4&&x<W-4){const y=groundAt(x,ST.camY-40,ST.camY+VH+260);if(y>0)makeCiv(x,y,false);}}
  for(let n=civs.length-1;n>=0;n--){const c=civs[n];if(!updCiv(c)||Math.abs(c.x-ST.camX-VW/2)>VW*1.6||Math.abs(c.y-ST.camY-VH/2)>VH*1.8){if(c.wet)for(let k=0;k<4;k++)spawn(c.x,c.y-4,(R()-.5),-.6,rgb(200,230,255),20,0,0,-.05,1);civs.splice(n,1);}}
  kills0=ST.kills;
  // a person behind a pane that gets smashed jumps out
  if(winX&&f%10===0){const b0=Math.max(0,(ST.camX>>5)-1),b1=Math.min(buckets.length-1,(ST.camX+VW>>5)+1);
    for(let b=b0;b<=b1;b++)for(const k of buckets[b]){if(wOut.has(k))continue;const x=winX[k],y=winY[k]+winH[k]-1;if(y<ST.camY||y>ST.camY+VH)continue;
      if(t[y*W+x]===0&&occupied(k)){wOut.add(k);if(civs.length<cfg.civ*m+8){const c=makeCiv(x+.5,y,true);c.vx=(R()-.5)*1.4;c.vy=-.8;c.pan=300;say(c,SCREAM,'#fff4d0');}}}}
  if(cfg.birds){if(f%200===0&&birds.length<(cfg.birds==='ptero'?4:24)*m)spawnFlock();if(cfg.perch&&f%30===0&&perch.length<cfg.perch*m)spawnPerch();}
  for(let n=birds.length-1;n>=0;n--)if(!updBird(birds[n]))birds.splice(n,1);
  for(let n=perch.length-1;n>=0;n--)if(!updPerch(perch[n]))perch.splice(n,1);
  if(cfg.planes&&cfg.planes.length&&!planes.length&&f%60===0&&R()<.12)spawnPlane();
  for(let n=planes.length-1;n>=0;n--){const p=planes[n];p.t++;p.x+=p.dir*p.sp;if(SPR[p.kind].bob)p.y=p.y0+Math.sin(p.t*.05)*2;if(Math.abs(p.x-ST.camX-VW/2)>VW*1.3)planes.splice(n,1);}
}
export function drawLife(){if(!cfg)return;const night=Math.max(0,Math.min(1,(235-(lut(fgL,0xffffffff)&255))/110));
  for(const p of planes)drawPlane(p,night);
  for(const b of birds)drawBird(b);
  for(const p of perch)drawPerch(p);
  // people behind the glass: a head and shoulders, tinted by the pane, backlit at night; they wave when the hero is close and duck after a blast
  if(winX){const b0=Math.max(0,(ST.camX>>5)-1),b1=Math.min(buckets.length-1,(ST.camX+VW>>5)+1),bm=ST.lastBoom,duck=bm&&ST.frame-bm.f<150;
    const sil=rgb(18,16,28);
    for(let b=b0;b<=b1;b++)for(const k of buckets[b]){const x=winX[k],y=winY[k],w=winW[k],h=winH[k];if(y+h<ST.camY||y>ST.camY+VH||!occupied(k))continue;
      if(duck&&Math.hypot(x-bm.x,y-bm.y)<bm.r*8+120)continue;const s=winS[k],sk=SKIN[s%5],sh=C(PALS.city.shirt[(s>>>3)%9]),hr=HAIR[(s>>>7)%6];
      const near=Math.abs(pl_.x-x)<70&&Math.abs(pl_.y-y)<70,cw=Math.min(2,w),cx=x+((w-cw)>>1)+(w>2?(((ST.frame+(s&511))>>7)&1)*(w-cw>>1):0),base=y+h;
      const put=(px,py,c,a)=>{if(py>=y&&py<base&&px>=x&&px<x+w&&t[py*W+px]===GLASS)pixA(px,py,night>.5?sil:c,a);};
      for(let q=0;q<cw;q++){for(let r=1;r<=3;r++)put(cx+q,base-r,sh,.7);put(cx+q,base-4,sk,.75);put(cx+q,base-5,sk,.75);put(cx+q,base-6,hr,.75);}
      if(near&&((ST.frame>>3)&1))put(cx+cw-1+(w>cw?1:0),base-7,sk,.8);}}
  for(const c of civs)drawCiv(c,night);
}
