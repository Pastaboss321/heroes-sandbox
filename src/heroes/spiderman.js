// Spider-Man: sprite, palette, rig entry, powers and roster entry.
import { ray, solidCells, tramps, webCell, webEnemy, webLine } from './wave2.js';
import { ST } from '../state.js';
import { KIND, R, S, rgb } from '../world/materials.js';
import { H, W, t } from '../world/grid.js';
import { q } from '../world/support.js';
import { makeBody } from '../world/bodies.js';
import { spawn } from '../world/particles.js';
import { afters, beams, fxWord } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { ANIM, rect } from '../render/rig.js';
import { snd } from '../sfx.js';
import { grabRegion, shots } from './powers.js';
import { ACT } from './xmen.js';
import { mouse } from '../player.js';
import { damageEnemies, enemies, enemyAt, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { groundBelow } from '../ui/spawn.js';

const SPR_SPIDEY=[
"....rRRRr....",
"...rlRRRRr...",
"...rwwRwwr...",
"...rwwRwwr...",
"...rRkRkRr...",
"....rRRRr....",
"..rRRkRkRRr..",
".lRRbRkRbRRr.",
".lRrbRkRbrRr.",
".lRrbkkkbrRr.",
".lRbbRkRbbRr.",
".lRbbbRbbbRr.",
".RRbbbbbbbRR.",
".rr.bbbbb.rr.",
"....Bb.Bb....",
"....Bb.Bb....",
"...Bb...Bb...",
"...Bb...Bb...",
"...Bb...Bb...",
"..rRR...RRr..",
"..rRR...RRr..",
"..rrr...rrr.."];
const PAL_SPIDEY={R:rgb(200,30,40),r:rgb(120,16,24),l:rgb(240,96,96),B:rgb(44,74,176),b:rgb(28,44,120),w:rgb(240,244,250),k:rgb(20,20,26)};

// animation rig entry (see render/rig.js)
ANIM.spidey={leg:14,mid:6,armC:'lRr',tipC:'RRr',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:null};
const SPIDEY_POWERS=[
 // sticky web pellets: a hit enemy is wrapped up, a wall gets a splat of web
 {n:'Web Shot',fn:(a,p,use)=>{if(!use(4))return;ST.cd=9;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*7,vy:a.dy*7,type:'web',life:90,grav:.03,col:[236,236,242],
   onHit:sh=>{const e=enemyAt(sh.x,sh.y,3);if(e){webEnemy(e,150);fxWord(e.x,e.y-e.def.h/2-6,'THWIP!',.8,'#f3e9d2');}else for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(x*x+y*y<6&&R()<.8)webCell(sh.x-sh.vx*.3+x|0,sh.y-sh.vy*.3+y|0);}});snd('whoosh',a.h.x,a.h.y,{v:.4,pitch:1.6});}},
 // a tightrope of silk strung between the walls on either side of the aim line (it holds weight)
 {n:'Web Line',fn:(a,p,use)=>{const f=ray(a.h.x,a.h.y,a.dx,a.dy,240),b=ray(a.h.x,a.h.y,-a.dx,-a.dy,240);if(!f.hit){fxWord(p.x,p.y-ST.PH-6,'NOTHING TO STICK TO',.6,'#f3e9d2',true);return;}if(!use(10))return;ST.cd=16;
   const ax=b.hit?b.x:a.h.x,ay=b.hit?b.y:a.h.y;webLine(ax|0,ay|0,f.x|0,f.y|0);fxWord((ax+f.x)/2,(ay+f.y)/2-8,'THWIP!',.9,'#f3e9d2',true);snd('whoosh',p.x,p.y,{v:.5,pitch:1.8});}},
 // a net that bursts open on impact: a lattice of web that tangles everything inside it
 {n:'Web Net',fn:(a,p,use)=>{if(!use(18))return;ST.cd=30;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*5.5,vy:a.dy*5.5,type:'web',life:80,grav:.05,col:[236,236,242],
   onHit:sh=>{const cx=sh.x-sh.vx*.4|0,cy=sh.y-sh.vy*.4|0;for(let y=-9;y<=9;y++)for(let x=-14;x<=14;x++)if((x%4===0||y%4===0)&&x*x/196+y*y/81<1)webCell(cx+x,cy+y);
     for(const e of enemies)if(Math.abs(e.x-cx)<18+e.def.w/2&&Math.abs(e.y-cy)<13+e.def.h/2)webEnemy(e,260);fxWord(cx,cy-14,'GOTCHA!',1,'#f3e9d2',true);}});}},
 // web a target and yank it in: enemies get reeled to your feet, chunks of building get ripped loose
 {n:'Web Yank',fn:(a,p,use)=>{const r=ray(a.h.x,a.h.y,a.dx,a.dy,220,true);if(!r.hit)return;if(!use(12))return;ST.cd=20;beams.push({x0:a.h.x,y0:a.h.y,x1:r.x,y1:r.y,life:6,w:0,c:[240,240,246],g:[160,160,170]});snd('throw',r.x,r.y);
   const dx=p.x-r.x,dy=p.y-ST.PH/2-r.y,d=Math.hypot(dx,dy)||1;
   if(r.e){const e=r.e;if(!e.def.title){e.vx=dx/d*8;e.vy=dy/d*8-2.5;e.thrownT=40;}hitEnemy(e,10,0,0);fxWord(e.x,e.y-10,'GET OVER HERE!',.8,'#f3e9d2',true);return;}
   const n=solidCells(r.x,r.y,5,false);if(n>=12){const b=makeBody(q,n,false);if(b){b.vx=dx/d*7;b.vy=dy/d*7-2;b.thrown=true;b.safeP=ST.frame+30;}}}},
 // a sticky grenade that bursts into a cloud of webbing
 {n:'Web Bomb',fn:(a,p,use)=>{if(!use(20))return;ST.cd=36;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*4.5,vy:a.dy*4.5-1.5,type:'web',life:200,grav:.15,col:[236,236,242],
   onHit:sh=>{const cx=sh.x|0,cy=sh.y-2|0;for(let k=0;k<260;k++){const an=R()*6.283,d=Math.sqrt(R())*18;webCell(cx+Math.cos(an)*d|0,cy+Math.sin(an)*d|0);}
     for(const e of enemies)if(Math.hypot(e.x-cx,e.y-cy)<22+e.def.w/2)webEnemy(e,220);for(let k=0;k<30;k++)spawn(cx,cy,(R()-.5)*4,(R()-.5)*4,rgb(240,240,246),20,0,0,1);fxWord(cx,cy-16,'SPLORT!',1.1,'#f3e9d2',true);snd('pop',cx,cy);}});}},
 // danger sense: for seven seconds most hits are simply dodged
 {n:'Spider-Sense',fn:(a,p,use)=>{if(p.sense>0||!use(25))return;ST.cd=30;p.sense=420;fxWord(p.x,p.y-ST.PH-8,'MY SPIDER-SENSE!',1,'#f3e9d2',true);snd('charge',p.x,p.y,{pitch:1.8});}},
 // a springy web hammock: anything that lands on it is flung high
 {n:'Web Trampoline',fn:(a,p,use)=>{if(!use(15))return;ST.cd=24;const x=mouse.wx|0,gy=groundBelow(x,mouse.wy)-4;if(gy>=H-46)return;
   for(let k=-16;k<=16;k++)webCell(x+k,gy+Math.round(Math.abs(k)/16*2));for(const s of [-16,16])for(let y=gy;y<gy+4;y++)webCell(x+s,y+2);
   tramps.push({x0:x-15,x1:x+15,y:gy,life:900});fxWord(x,gy-12,'BOING!',.9,'#f3e9d2',true);}},
 // zip down a web line and dropkick whatever is at the end of it
 {n:'Swing Kick',fn:(a,p,use)=>{const r=ray(p.x,p.y-ST.PH/2,a.dx,a.dy,190,true);if(!use(16))return;ST.cd=30;const tx=r.x-a.dx*6,ty=r.y-a.dy*6+ST.PH/2,x0=p.x,y0=p.y;let k=0;
   ACT.push(()=>{p.script=2;k++;const u=k/9;p.x=x0+(tx-x0)*u;p.y=y0+(ty-y0)*u;p.grip={x:r.x,y:r.y};p.face=a.dx<0?-1:1;afters.push({x:p.x,y:p.y,ang:0,face:p.face,life:8});beams.push({x0:p.x,y0:p.y-ST.PH/2,x1:r.x,y1:r.y,life:1,w:0,c:[240,240,246],g:[160,160,170]});
     if(k>=9){p.script=0;p.grip=null;p.vx=a.dx*3;p.vy=-2;damageEnemies(p.x+a.dx*6,p.y-ST.PH/2,16,30,a.dx*7,a.dy*7-2);explode(p.x+a.dx*8|0,p.y-ST.PH/2|0,4,{self:true,quiet:true});fxWord(p.x,p.y-ST.PH-6,'THWAK!',1.2,'#f3e9d2',true);snd('punch',p.x,p.y);ST.shake+=4;return false;}return true;});}},
 // web a whole building and haul it over
 {n:'Web Topple',fn:(a,p,use)=>{const r=ray(a.h.x,a.h.y,a.dx,a.dy,260);if(!r.hit)return;let n=grabRegion(r.x|0,r.y|0,6);if(!n)n=solidCells(r.x,r.y,6,false);if(n<12)return;if(!use(30))return;ST.cd=60;
   const b=makeBody(q,n,false);if(!b)return;const dir=p.x<b.x?-1:1;b.vx=dir*3.5;b.vy=-1.5;b.va=dir*.03;b.topple=dir;b.thrown=true;b.safeP=ST.frame+40;
   for(let k=0;k<3;k++)beams.push({x0:a.h.x,y0:a.h.y,x1:r.x+(R()-.5)*6,y1:r.y+(R()-.5)*6,life:10,w:0,c:[240,240,246],g:[160,160,170]});fxWord(r.x,r.y-12,'HEAVE!',1.2,'#f3e9d2',true);snd('rip',r.x,r.y);}},
 // cocoon a foe and string it up from the nearest ceiling
 {n:'Gotcha!',fn:(a,p,use)=>{const e=nearestEnemy(mouse.wx,mouse.wy,44);if(!e||e.def.title||e.hang)return;if(!use(22))return;ST.cd=36;let top=-1;for(let d=e.def.h/2+2;d<140;d++){const Y=e.y-d|0;if(Y<2)break;const m=t[Y*W+(e.x|0)];if(m&&KIND[m]===S){top=Y+1;break;}}
   if(top<0)top=Math.max(4,(ST.camY|0)+4);e.hang={x:e.x,y:top,len:Math.min(40,Math.max(10,(e.y-top)*.5)),life:600};webEnemy(e,600);fxWord(e.x,e.y-14,'HANG AROUND!',.9,'#f3e9d2',true);snd('whoosh',e.x,e.y,{pitch:1.6});}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_SPIDEY={id:'spidey',name:'Spider-Man',spr:SPR_SPIDEY,pal:PAL_SPIDEY,pw:7,ph:19,fly:false,fs:2.6,boost:1,run:2.5,jump:5.6,hp:300,armor:.75,glow:[240,244,250],cape:null,thrust:()=>R()<.5?rgb(240,240,250):rgb(200,40,50),powers:SPIDEY_POWERS};
