// Doom: sprite, palette, rig entry, powers and roster entry.
import './xmen.js'; // evaluation order: runs after heroes/xmen.js
import { ST } from '../state.js';
import { GFIRE, R, rgb } from '../world/materials.js';
import { gcol, spawn } from '../world/particles.js';
import { flash, rings } from '../render/fx.js';
import { ANIM, rect } from '../render/rig.js';
import { beam, drones, lightning, nova, shield, shots, strikes } from './powers.js';
import { mouse, toggleFly } from '../player.js';
import { damageCone } from '../enemies/core.js';

// ================= player / heroes =================
// Each hero: sprite + palette (glow chars: e * @), body size, movement tuning and a power list.
// ---- hero sprites: 3/4 front view, heroic proportions (small head, broad shoulders, V-taper, long legs),
//      light from the upper left, three tones per material plus spot blacks; ink outline added by the renderer
export const SPR_DOOM=[
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
export const PAL_DOOM={h:rgb(18,70,34),H:rgb(30,110,52),j:rgb(64,160,84),M:rgb(150,158,170),L:rgb(205,212,222),n:rgb(86,92,104),e:rgb(140,255,170),k:rgb(14,16,18),C:rgb(12,50,26),c:rgb(24,90,44),A:rgb(122,130,144),a:rgb(62,68,82),G:rgb(196,204,216),T:rgb(28,102,50),t:rgb(14,60,30),u:rgb(52,146,72),B:rgb(196,150,48),b:rgb(84,58,34)};

// animation rig entry (see render/rig.js)
ANIM.doom={leg:14,mid:6,armC:'GAa',tipC:'GGa',aw:2,al:6,fs:2,sh:[10,7],hide:rect(10,11,7,13),blink:'e',lid:'M',cape:'Cc'};
const DOOM_POWERS=[
 {n:'Eldritch Bolt',fn:(a,p,use)=>{if(!use(5))return;shots.push({x:a.h.x,y:a.h.y,vx:a.dx*6.5,vy:a.dy*6.5,type:'bolt',life:140,boom:11,fire:.25,green:true});ST.cd=8;ST.shake+=1.2;flash(a.h.x,a.h.y,10,[80,255,120],4);}},
 {n:'Mystic Fire',fn:(a,p,use)=>{if(!use(.4))return;for(let k=0;k<8;k++){const s=2.6+R()*3,sp=(R()-.5)*.4;spawn(a.h.x,a.h.y,(a.dx-sp*a.dy)*s+(R()-.5)*.4,(a.dy+sp*a.dx)*s+(R()-.5)*.4,gcol(),35+R()*30,GFIRE,1,1);}
   if(ST.frame%2===0)spawn(a.h.x+a.dx*8,a.h.y+a.dy*8,a.dx*2,a.dy*2-.3,rgb(30,120,50),20,0,1,0,1);flash(a.h.x+a.dx*10,a.h.y+a.dy*10,14,[30,160,60],2);
   damageCone(a.h.x,a.h.y,a.dx,a.dy,60,.5,.8);}},
 {n:'Disintegrator',fn:(a,p,use)=>{if(!use(.7))return;beam(a);}},
 {n:'Gravity Well',fn:(a,p,use)=>{if(!use(35))return;ST.vortex={x:mouse.wx,y:mouse.wy,life:340,max:340};ST.cd=40;ST.shake+=3;flash(mouse.wx,mouse.wy,40,[60,255,110],10);}},
 {n:'Mystic Shield',fn:(a,p,use)=>{if(!use(.45))return;ST.shieldC=[[170,255,190],[80,220,120],[60,255,100]];shield();}},
 {n:'Gauntlet Swarm',fn:(a,p,use)=>{if(!use(22))return;for(let k=0;k<6;k++)shots.push({x:a.h.x,y:a.h.y,vx:p.face*(.5+R()*1.5),vy:-1.5-R()*2,type:'missile',life:220,tx:mouse.wx+(R()-.5)*30,ty:mouse.wy+(R()-.5)*20,delay:k*4,wob:R()*6,boom:13,fire:.35});ST.cd=45;ST.shake+=2;}},
 {n:'Doombots',fn:(a,p,use)=>{if(drones.length>=3||!use(28))return;drones.push({x:p.x,y:p.y-20,life:1500,cool:20,ph:R()*6});ST.cd=30;rings.push({x:p.x,y:p.y-20,r:2,vr:1.5,life:10,c:[150,255,180]});}},
 {n:'Seismic Slam',fn:(a,p,use)=>{if(!use(22))return;if(p.fly)toggleFly(false);if(p.ground){p.vy=-4.5;p.ground=false;}p.slam=true;p.slamOpt={};ST.cd=45;}},
 {n:'Doom Lightning',fn:(a,p,use)=>{if(!use(.9))return;lightning(a);}},
 {n:'Orbital Strike',fn:(a,p,use)=>{if(!use(40))return;strikes.push({x:mouse.wx|0,t:45,dig:0,beam:0});ST.cd=60;}},
 {n:'Telekinesis',tk:{r:12,range:0,tether:true,throwMul:1.6}},
 {n:'Mystic Nova',fn:(a,p,use)=>{if(!use(30))return;nova();ST.cd=50;}},
];

// roster entry (CHARS in heroes/index.js)
export const CHAR_DOOM={id:'doom',name:'Doom',spr:SPR_DOOM,pal:PAL_DOOM,pw:7,ph:19,fly:true,fs:2.9,boost:2.1,run:1.8,jump:4.3,hp:300,armor:1,glow:[80,255,130],cape:null,thrust:()=>R()<.6?gcol():rgb(255,210,120),powers:DOOM_POWERS};
