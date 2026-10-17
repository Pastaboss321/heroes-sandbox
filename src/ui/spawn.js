// Sandbox spawn menu: objects, terrain, tools (UI in spawnmenu.js).
import { createSpawnMenu } from '../spawnmenu.js';
import '../modes/swarm.js'; // evaluation order: runs after modes/swarm.js
import { ST } from '../state.js';
import { ACID, ASH, CONC, DIRT, EMBER, EMPTY, F, FIRE, FLAM, G, GFIRE, GLASS, GRASS, ICE, KIND, L, LAVA, LEAF, MATS, NEON, OBSID, OIL, P, PROPANE, R, RUBBLE, S, SAND, SMOKE, SNOW, STEAM, STEEL, STONE, WATER, WOOD, cl, rgb } from '../world/materials.js';
import { H, VH, VW, W, bg, bgB, bgD, col, setc, t } from '../world/grid.js';
import { ignite } from '../world/sim.js';
import { bodies, rcount, rid, str } from '../world/support.js';
import { bgRect, disc, fill, tint } from '../maps/gen.js';
import { building, car, glassTower } from '../maps/city.js';
import { pine, tree } from '../maps/forest.js';
import { waterTower } from '../maps/nyc.js';
import { solidAt } from '../world/particles.js';
import { fxWord, rings } from '../render/fx.js';
import { explode } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { SPAWN, lightningStrike, surfaceY } from '../heroes/powers.js';
import { freezeArea, iceAt } from '../heroes/xmen.js';
import { mouse, spawnPlayer } from '../player.js';
import { ENEMY_TYPES, clearEnemies, eHit, spawnEnemy } from '../enemies/core.js';

// ================= spawn menu (sandbox): place enemies, objects and terrain =================
// spawnUI, slowTk: shared state (ST in state.js)
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
export const OBJS=[
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
export function buildSpawnUI(){
  const tabs=[
    {id:'enemies',label:'ENEMIES',items:Object.keys(ENEMY_TYPES).map(k=>{const d=ENEMY_TYPES[k];return{id:k,cat:'enemies',kind:'place',label:d.label||(d.title?prettyName(d.title.toLowerCase()):prettyName(k)),icon:iconSprite(d.sprite,d.pal),tip:d.title?'boss':''};})},
    {id:'objects',label:'OBJECTS',items:OBJS.map(o=>Object.assign({cat:'objects',kind:'place'},o))},
    {id:'terrain',label:'TERRAIN',items:TERRAIN.map(m=>({id:'m'+m,cat:'terrain',kind:'paint',mat:m,label:prettyName(MATS[m][0]),icon:iconMat(m)}))},
    {id:'tools',label:'TOOLS',items:TOOLS.map(o=>Object.assign({cat:'tools'},o))},
  ];
  ST.spawnUI=createSpawnMenu({tabs,
    onPick:it=>{SPAWN.tool=it;if(it)snd('ui',ST.camX+VW/2,ST.camY+VH/2);},
    onToggle:(it,on)=>{SPAWN[it.id]=on;snd('ui',ST.camX+VW/2,ST.camY+VH/2);},
    onAction:it=>{if(it.id==='clearE')clearEnemies();else if(it.id==='clearD'){ST.np=0;bodies.length=0;}else if(it.id==='respawn'){spawnPlayer();}snd('place',ST.camX+VW/2,ST.camY+VH/2);},
    onBrush:n=>{SPAWN.brush=n;},onSnap:on=>{SPAWN.snap=on;}});
}
export function resetSpawn(){Object.assign(SPAWN,{tool:null,pause:false,slow:false,god:false,inf:false,peace:false,latch:false});if(ST.spawnUI){ST.spawnUI.close();ST.spawnUI.select(null);for(const id of ['pause','slow','god','inf','peace'])ST.spawnUI.setToggle(id,false);}}
export function groundBelow(x,y){x=Math.max(0,Math.min(W-1,x|0));let yy=Math.max(2,y|0);for(let k=0;k<200&&yy>2&&solidAt(x,yy-1);k++)yy--;return surfaceY(x,yy,H);}
export function placeStruct(fn,x,gy){const x0=Math.max(0,x-150),x1=Math.min(W,x+150),y0=Math.max(0,gy-260),y1=Math.min(H,gy+16);
  ST.CAPT=[];try{fn(x,gy);}finally{var cells=ST.CAPT;ST.CAPT=null;}
  const r=rcount.length;let n=0;for(const i of cells)if(KIND[t[i]]===S){rid[i]=r;str[i]=15;n++;}rcount.push(n);
  for(let y=y0;y<y1;y++)for(let xx=x0;xx<x1;xx++){const i=y*W+xx;bgB[i]=bg[i]!==bgD[i]?1:0;}return n;}
function paintDisc(cx,cy,r,m){const k=KIND[m];
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r+r*.5)continue;const X=cx+x,Y=cy+y;if(X<0||X>=W||Y<0||Y>=H-1)continue;const i=Y*W+X,cur=t[i];
    if(m===EMPTY){if(cur)setc(i,EMPTY);if(bgB[i]){bg[i]=bgD[i];bgB[i]=0;}continue;}
    if(k===S){if(cur!==m)setc(i,m);}
    else{if(cur&&KIND[cur]!==G&&KIND[cur]!==F)continue;if(R()<(k===L?.7:k===P?.6:.45))setc(i,m);}}}
export function useTool(){const T=SPAWN.tool;if(!T||ST.GS!=='play')return;const x=mouse.wx|0,y=mouse.wy|0,first=!SPAWN.latch;SPAWN.latch=true;
  if(T.cat==='enemies'){if(!first)return;const d=ENEMY_TYPES[T.id];if(!d)return;let yy=y;for(let k=0;k<80&&d.w<=16&&eHit({def:d},x,yy);k++)yy--;
    const e=spawnEnemy(T.id,x,yy);if(e)snd('place',x,y);else fxWord(x,y-10,'MAX ENEMIES',.7,'#e23b2e',true);return;}
  if(T.cat==='objects'){if(!first)return;const gy=SPAWN.snap?groundBelow(x,y):y;placeStruct(T.place,x,gy);snd('place',x,gy);rings.push({x,y:gy-6,r:3,vr:2,life:10,c:[255,201,60]});return;}
  const r=SPAWN.brush;
  if(T.cat==='terrain'||T.id==='erase'){const m=T.cat==='terrain'?T.mat:EMPTY,lx=SPAWN.lx??x,ly=SPAWN.ly??y,n=Math.max(1,Math.hypot(x-lx,y-ly)/Math.max(1,r*.5)|0);
    for(let k=1;k<=n;k++)paintDisc(lx+(x-lx)*k/n|0,ly+(y-ly)*k/n|0,r,m);SPAWN.lx=x;SPAWN.ly=y;if(ST.frame%6===0)snd(m===EMPTY?'pop':'step',x,y,{v:.3});return;}
  if(T.id==='boom'){if(first)explode(x,y,r*2+3,{fire:.25});return;}
  if(T.id==='bolt'){if(first)lightningStrike(x,y,8);return;}
  if(T.id==='fire'){for(let n=0;n<r*r;n++){const X=x+(R()-.5)*r*2|0,Y=y+(R()-.5)*r*2|0;if(X<0||X>=W||Y<0||Y>=H)continue;const i=Y*W+X,m=t[i];if(FLAM[m]>0)ignite(i);else if(!m&&R()<.3)setc(i,FIRE);}return;}
  if(T.id==='freeze'){if(ST.frame%4===0)freezeArea(x,y,r*2+2,90,0);for(let n=0;n<r*r;n++){iceAt(x+(R()-.5)*r*2,y+(R()-.5)*r*2);}return;}}
