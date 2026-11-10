// Kang the Conqueror: sprite, palette, rig entry, powers and roster entry.
// A time-travelling warlord from the 31st century: violet chrono energy and gold Damocles weaponry.
// His kit is built on time itself (a stasis bubble, a loop, a rewind, clones pulled out of other
// timelines, an aging ray) and on the raw power he is known for (a lance of chronal energy, force
// fields that throw enemy fire back, a personal aegis and a ground-shattering entropy nova).
import { ARTS } from '../art/index.js';
import { ST } from '../state.js';
import { EMPTY, KIND, L, OBSID, P, R, RUBBLE, S, STEEL, rgb } from '../world/materials.js';
import { H, W, col, setc, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { afters, beams, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import '../render/rig.js'; // kept for evaluation order
import { drawSprite } from '../render/sprites.js';
import { snd } from '../sfx.js';
import { TSL, beamCore, quake, shield, shieldAs, shots } from './powers.js';
import { ACT } from './xmen.js';
import { boxHit, carve, mouse, pl_ } from '../player.js';
import { damageCone, damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';
import { applyStatus, summons } from './abilities.js';
import { atCursor, noTarget } from './kitlib.js';
import { fxCone, fxDome, fxGlitch, fxPillar, fxSigil, screenFlash, zoomPunch } from '../render/vfxcore.js';

// ---- hero sprite: 3/4 front view, heroic proportions (small head, broad shoulders, V-taper, long legs),
//      light from the upper left, three tones per material plus spot blacks; ink outline added by the renderer
//      Kang: green armour plates over a purple tabard, gold belt, blue visored helmet, ragged purple cape


const TC=[168,120,255], GOLD=[255,214,110]; // chrono violet, Damocles gold

// ---- a temporal clone wears the same armour lit flat by chrono light (unpack a palette colour, tint it violet)
const tint=(c)=>rgb(Math.min(255,(c&255)*.45+70)|0,Math.min(255,((c>>8)&255)*.42+34)|0,Math.min(255,((c>>16)&255)*.5+132)|0);
const PAL_GHOST={};for(const k in ARTS.kang.pal)PAL_GHOST[k]=tint(ARTS.kang.pal[k]);
// more Kangs, out of other timelines: they hold their ground, pick targets and fire chrono bolts on their own
function timeClone(p,off,life,delay){
  summons.push({kclone:true,x:p.x+off,y:p.y,face:p.face,vy:0,cd:delay,life,
    upd(s){
      s.vy+=.32;s.y+=s.vy;const gy=groundBelow(s.x|0,s.y-10);if(s.y>=gy){s.y=gy;s.vy=0;}
      const e=nearestEnemy(s.x,s.y-10,260);
      if(e){s.face=e.x>s.x?1:-1;if(Math.abs(e.x-s.x)>64)s.x+=s.face*1.9;
        if(--s.cd<=0){s.cd=30+R()*22|0;shots.push({x:s.x+s.face*5,y:s.y-12,vx:s.face*8.5,vy:(e.y-(s.y-12))*.012,type:'bolt',life:110,boom:10,col:TC,ecol:[130,70,230]});flash(s.x+s.face*5,s.y-12,8,TC,3);}}
      else s.x+=(pl_.x-pl_.face*26-s.x)*.05;
      if(ST.frame%6===0)spawn(s.x,s.y-10,(R()-.5)*.6,-.3,rgb(170,120,255),14,0,1,0,1);},
    draw(s){drawSprite(s.x,s.y,0,s.face,false,ARTS.kang.spr,PAL_GHOST);}});
}

const KANG_POWERS=[
 {n:'Chrono Bolt',kind:'tap',fn:(a,p,use)=>{if(!use(5))return;ST.cd=7;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*9,vy:a.dy*9,type:'bolt',life:130,boom:12,fire:.05,col:TC,ecol:[130,70,230]});ST.shake+=1.2;flash(a.h.x,a.h.y,10,TC,4);}},
 // the lance: a held column of chronal energy that unmakes whatever it crosses
 {n:'Chronal Lance',kind:'hold',fn:(a,p,use)=>{if(!use(1))return;beamCore(a,{pow:150,rad:2,len:470,w:3+(ST.frame&1),c:[245,235,255],g:TC,spark:()=>R()<.5?rgb(190,140,255):rgb(255,255,255),dmg:5});}},
 // both palms out: a cone of raw force that also tears a trench through the terrain
 {n:'Force Cascade',kind:'tap',fn:(a,p,use)=>{if(!use(20))return;ST.cd=40;const cx=a.h.x+a.dx*10,cy=a.h.y+a.dy*10,ang=Math.atan2(a.dy,a.dx);
   fxCone(cx,cy,ang,1.1,110,[200,160,255],{life:16,n:4});damageCone(cx,cy,a.dx,a.dy,110,34,6);carve(cx,cy,12,a.dx*6,a.dy*6);
   for(let k=0;k<14;k++)spawn(cx,cy,a.dx*(3+R()*4)+(R()-.5)*2,a.dy*(3+R()*4)-1,R()<.5?rgb(200,150,255):rgb(255,240,255),14,0,1,0,1);
   explode(cx|0,cy|0,10,{col:TC,fire:.1});ST.shake=Math.min(22,ST.shake+7);}},
 // a field of chronal force around him: enemy fire comes back the way it came
 {n:'Energy Shield',kind:'hold',fn:(a,p,use)=>{if(!use(.5))return;shieldAs([[235,220,255],[170,120,255],[130,80,230]],true);}},
 // he stops time in a bubble: sand, water, fire and bullets all hang where they were
 {n:'Chrono Stasis',kind:'tap',fn:(a,p,use)=>{if(!use(34))return;ST.cd=90;const x=mouse.wx,y=mouse.wy,r=46*ST.aoeC;
   ST.stasis={x,y,r,life:280};fxSigil(x,y,r*1.15,TC,{kind:'clock',life:300,spin:.05});fxDome(x,y,r,TC,{life:280,runes:true});
   screenFlash(TC,.12);fxWord(x,y-r-12,'TIME STOPS',1.1,'#c8a8ff',true);snd('psi',x,y,{pitch:.4,v:.8});}},
 // the enemy is snapped back to the same instant, hurt again, six times over
 {n:'Time Loop',kind:'tap',fn:(a,p,use)=>{const e=atCursor(70);if(!e||e.def.titan||e.loop){noTarget('#c8a8ff');return;}if(!use(24))return;ST.cd=50;
   e.loop={x:e.x,y:e.y,k:0,n:0};fxSigil(e.x,e.y,e.def.w/2+14,[190,150,255],{kind:'clock',life:380,spin:.06});
   fxWord(e.x,e.y-e.def.h/2-12,'AGAIN',.9,'#c8a8ff',true);snd('psi',e.x,e.y,{pitch:.5});}},
 // a ray of accelerated time: the target ages where it stands, and the ground under it turns to dust
 {n:'Entropy Ray',kind:'tap',fn:(a,p,use)=>{const e=atCursor(90);if(!e){noTarget('#c8a8ff');return;}if(!use(22))return;ST.cd=45;
   fxWord(e.x,e.y-e.def.h/2-12,'MILLIONS OF YEARS',.9,'#c8a8ff',true);applyStatus(e,'mark',90);let k=0;
   ACT.push(()=>{k++;if(e.hp<=0||!enemies.includes(e))return false;
     beams.push({x0:p.x,y0:p.y-ST.PH/2,x1:e.x,y1:e.y,life:1,w:0,c:[230,205,255],g:TC});
     if(k%5===0)hitEnemy(e,6,0,0);
     if(k%3===0)spawn(e.x+(R()-.5)*e.def.w,e.y-e.def.h/2+R()*e.def.h,(R()-.5)*.5,-.4,rgb(190,150,255),14,0,1,0,1);
     if(k%10===0){const gy=groundBelow(e.x|0,e.y);if(gy>0)for(let j=0;j<4;j++){const X=e.x+(R()-.5)*16|0,Y=gy+(R()*3|0);if(X<1||X>=W||Y<1||Y>=H)continue;const i=Y*W+X,m=t[i];
       if(!m||KIND[m]!==S||m===STEEL||m===OBSID)continue;if(R()<.5){spawn(X,Y,(R()-.5)*2,-R()*2,col[i],70,RUBBLE,0);setc(i,EMPTY);}}}
     return k<120;});}},
 // he steps back along his own timeline to where he stood four seconds ago, with the health he had then
 {n:'Chronal Rewind',kind:'tap',fn:(a,p,use)=>{if(TSL.length<60||!use(30))return;ST.cd=100;const o=TSL[Math.min(TSL.length-1,180)];
   const hx=p.x,hy=p.y;let k=0;fxWord(p.x,p.y-ST.PH-10,'REWIND',1.1,'#c8a8ff',true);snd('psi',p.x,p.y,{pitch:.45});
   fxSigil(hx,hy-ST.PH/2,26,TC,{kind:'clock',life:40,spin:-.3});fxSigil(o.x,o.y-ST.PH/2,26,TC,{kind:'clock',life:40,spin:.3});
   fxGlitch(o.x,o.y-ST.PH/2,10,{life:14});
   ACT.push(()=>{k++;p.script=2;const f=Math.min(1,k/16);p.x=hx+(o.x-hx)*f;p.y=hy+(o.y-hy)*f;
     afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8,col:[170,120,255]});
     if(k<16)return true;p.hp=Math.max(p.hp,o.hp);if(boxHit(p.x,p.y))punchOut(p);
     rings.push({x:p.x,y:p.y-ST.PH/2,r:4,vr:3,life:12,c:[180,140,255]});flash(p.x,p.y-ST.PH/2,16,TC,4);return false;});}},
 // three more Kangs, out of three other timelines, holding the field for eight seconds
 {n:'Temporal Clones',kind:'tap',fn:(a,p,use)=>{if(summons.some(s=>s.kclone)||!use(30))return;ST.cd=90;p.chrono=480;
   fxWord(p.x,p.y-ST.PH-14,'KANG SEES ALL TIMES',1,'#c8a8ff',true);snd('charge',p.x,p.y,{pitch:.6});
   for(let i=0;i<3;i++){const off=(i-1)*22;timeClone(p,off,480,16+i*9);fxSigil(p.x+off,p.y-ST.PH/2,12,TC,{kind:'clock',life:26,spin:.2});}}},
 // the Damocles: his orbiting fortress fires straight down onto the mark
 {n:'Damocles Base',kind:'tap',fn:(a,p,use)=>{if(!use(38))return;ST.cd=80;const cx=mouse.wx|0,gy=groundBelow(cx,mouse.wy);
   fxWord(cx,gy-84,'DAMOCLES, FIRE!',1.1,'#ffd76a',true);snd('charge',cx,gy,{pitch:.4,v:.9});
   fxSigil(cx,gy,32,GOLD,{kind:'clock',sq:.4,life:70,spin:.1});let k=0;
   ACT.push(()=>{k++;
     fxPillar(cx,ST.camY-10,gy,5,[215,175,255],{life:4});
     for(let j=0;j<5;j++)spawn(cx+(R()-.5)*12,gy-R()*40,(R()-.5)*1.5,-2-R()*3,R()<.5?rgb(255,220,140):rgb(180,130,255),16,0,1,0,1);
     if(k<26)return true;
     if(k===26){flash(cx,gy,130,[225,190,255],10);screenFlash([205,165,255],.28);zoomPunch(cx,gy,.055);snd('boom',cx,gy,{v:.9});
       explode(cx,gy,22,{col:[195,150,255],fire:.2});damageEnemies(cx,gy,46*ST.aoeC,60,0,-4,true);carve(cx,gy+4,9,0,4);
       ST.shake=Math.min(24,ST.shake+16);ST.hitstop=Math.max(ST.hitstop,6);}
     if(k<46){beams.push({x0:cx,y0:ST.camY-10,x1:cx,y1:gy,life:1,w:6,c:[245,235,255],g:[160,115,255]});return true;}
     return false;});}},
 // a volley of chronal bolts that hunt their marks down on their own
 {n:'Chrono Barrage',kind:'tap',fn:(a,p,use)=>{if(!use(20))return;ST.cd=45;for(let i=0;i<6;i++)
   shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7+(R()-.5)*3,vy:a.dy*7-1-R()*1.5,type:'bolt',life:180,boom:10,home:true,col:TC,ecol:[130,70,230],delay:i*3});
   fxWord(p.x,p.y-ST.PH-10,'ALL AT ONCE',.9,'#c8a8ff',true);}},
 // a five-second aegis: he is untouchable, enemy fire turns around, and everything solid is shoved off him
 {n:'Chronal Aegis',kind:'tap',fn:(a,p,use)=>{if(p.chrono>0||!use(26))return;ST.cd=80;p.chrono=300;
   fxWord(p.x,p.y-ST.PH-14,'CHRONAL AEGIS',1,'#c8a8ff',true);snd('charge',p.x,p.y,{pitch:.9});
   ACT.push(()=>{if(--p.chrono<=0||ST.CH.id!=='kang'){p.chrono=0;return false;}const cx=p.x,cy=p.y-ST.PH/2,r=30;
     fxDome(cx,cy,r,[200,160,255],{life:3,runes:true});
     ST.shieldC=[[235,220,255],[170,120,255],[130,80,230]];shield();
     for(const e of enemies){const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy)||1;if(d<r+e.def.w/2){if(!e.def.titan){e.vx+=dx/d*.5;e.vy+=dy/d*.3;}if(ST.frame%20===0)hitEnemy(e,5,0,0);}}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.hypot(s.x-cx,s.y-cy)<r+4){shots.splice(n,1);flash(s.x,s.y,8,[205,170,255],3);}}
     return true;});}},
 // a wall of frozen time: nothing crosses it, and nothing on the far side ages
 {n:'Stasis Wall',kind:'tap',fn:(a,p,use)=>{if(!use(22))return;ST.cd=60;const x=mouse.wx|0,gy=groundBelow(x,mouse.wy),y0=gy-72;let k=0;
   fxWord(x,y0-12,'NOT ACROSS',.9,'#c8a8ff',true);snd('pop',x,y0,{pitch:.5});
   ACT.push(()=>{k++;const wob=Math.sin(k*.3)*2;
     beams.push({pts:[[x+wob,y0],[x-wob,(y0+gy)/2],[x+wob,gy]],life:2,c:[232,212,255],g:TC});
     if(k%4===0)for(let j=0;j<3;j++)spawn(x+(R()-.5)*6,y0+R()*(gy-y0),(R()-.5)*.3,-.4,rgb(200,165,255),12,0,1,0,1);
     for(const e of enemies)if(Math.abs(e.x-x)<8+e.def.w/2&&e.y>y0-e.def.h/2&&e.y<gy+e.def.h/2){if(!e.def.titan){e.vx*=.2;e.frozen=Math.max(e.frozen||0,2);}if(k%20===0)hitEnemy(e,4,0,0);}
     for(let n=shots.length-1;n>=0;n--){const s=shots[n];if(s.owner==='enemy'&&Math.abs(s.x-x)<6&&s.y>y0&&s.y<gy){shots.splice(n,1);flash(s.x,s.y,6,[212,175,255],2);}}
     return k<300;});}},
 // raw power: an expanding sphere of accelerated decay that ages the whole street to rubble
 {n:'Entropic Nova',kind:'tap',fn:(a,p,use)=>{if(!use(34))return;ST.cd=80;const cx=p.x,cy=p.y-ST.PH/2,r=52*ST.aoeC;
   fxSigil(cx,cy,r*1.1,[190,150,255],{kind:'clock',life:40,spin:-.16});screenFlash([195,155,255],.22);zoomPunch(cx,cy,.04);snd('boom',cx,cy,{v:.8});
   rings.push({x:cx,y:cy,r:4,vr:4,life:16,c:[205,165,255]},{x:cx,y:cy,r:2,vr:2.6,life:20,c:GOLD});
   for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const d=Math.hypot(xx,yy);if(d>r)continue;const X=cx+xx|0,Y=cy+yy|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];
     if(KIND[m]===S){if(m!==STEEL&&m!==OBSID&&R()<(1-d/r)*.5&&R()<.5){spawn(X,Y,xx/d*4,yy/d*4-1,col[i],80,RUBBLE,0);setc(i,EMPTY);}}
     else if((KIND[m]===P||KIND[m]===L)&&R()<.3){spawn(X,Y,xx/d*3,yy/d*3-1,col[i],70,m,0);setc(i,EMPTY);}}
   damageEnemies(cx,cy,r*1.25,46,0,-3,true);
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<r*1.5)applyStatus(e,'mark',180);
   for(let k=0;k<120;k++){const an=R()*6.283;spawn(cx,cy,Math.cos(an)*(3+R()*4),Math.sin(an)*(3+R()*4),R()<.5?rgb(190,140,255):rgb(255,220,150),18,0,1,0,1);}
   ST.shake=Math.min(24,ST.shake+12);ST.hitstop=Math.max(ST.hitstop,5);}},
 // the ultimate: time stops for everyone but him, and every Kang that could have been opens fire at once
 {n:'Kang Dynasty',ult:true,fn:(a,p,use)=>{ST.cd=200;const cx=p.x,cy=p.y-ST.PH/2;
   fxWord(p.x,p.y-64,'KANG DYNASTY',1.7,'#ffd76a',true);screenFlash([215,175,255],.4);zoomPunch(cx,cy,.07);snd('charge',cx,cy,{pitch:.3,v:1});
   fxSigil(cx,cy,80,[190,140,255],{kind:'clock',life:150,spin:.03,follow:()=>[cx,cy]});
   fxSigil(cx,cy,54,GOLD,{kind:'rings',life:150,spin:-.05,follow:()=>[cx,cy]});
   for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<460){if(!e.def.titan)e.frozen=Math.max(e.frozen||0,140);applyStatus(e,'stun',120);applyStatus(e,'mark',300);}
   for(let i=0;i<4;i++)timeClone(p,(i<2?-1:1)*(10+i*14),380,i*5);
   let k=0;ACT.push(()=>{k++;const r=k*7*ST.aoeC;
     for(let j=0;j<8;j++){const an=R()*6.283;explode(cx+Math.cos(an)*r|0,cy+Math.sin(an)*r|0,7,{self:true,quiet:true,col:[195,150,255],fire:.1});}
     damageEnemies(cx,cy,r+16,7,0,0,true);
     if(k%2===0){const an=R()*6.283;fxSigil(cx+Math.cos(an)*r*.8,cy+Math.sin(an)*r*.8*.6,10,TC,{kind:'clock',life:14,spin:.3});}
     if(k%6===0)ST.shake=Math.min(24,ST.shake+7);
     if(k>=22){ST.hitstop=Math.max(ST.hitstop,10);explode(cx|0,cy|0,30,{col:[215,175,255],fire:.2});quake(cx,p.y,{col:[195,150,255],r:40});
       screenFlash([230,200,255],.3);return false;}
     return true;});}}
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_KANG={id:'kang',name:'Kang',pw:7,ph:19,fly:true,fs:2.9,boost:2.2,run:1.9,jump:4.4,hp:340,armor:.85,glow:[170,120,255],cape:null,thrust:()=>R()<.6?rgb(170,120,255):rgb(255,214,110),powers:KANG_POWERS};
