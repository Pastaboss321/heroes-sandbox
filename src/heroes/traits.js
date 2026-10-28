// Hero traits (2026-10-28): one passive rule per hero that changes how the whole kit plays, so picking a
// hero picks a playstyle (Hulk's rage, Iron Man's heat, Strange's echoes, Thanos's stones...), plus an
// AWAKENED state the ultimate switches on for ten seconds (TRAITS[id].aw), built on the same rule.
// Per-hero state lives on pl_.tr (trOf), dropped by resetHeroTimers on regen and hero switch.
// Hooks:  cast() charges costs through traitCost, calls traitPre once per fresh cast (before damage) and
//         traitCast / traitUlt after it (heroes/index.js) · hitEnemy runs hero hits through the trait
//         (ST.hitHook chain below) · hurt() asks ST.hurtHook (player.js) · killEnemy calls ST.killHook
//         (enemies/core.js) · loop.js ticks traitTick and draws hudTrait.
// Trait fields: n, d, c, hud(T,p)->[0..1,label], init(T), tick(p,T), cost(c,pw,p,T)->c, pre(pw,p,c,T),
//         cast(pw,p,a,T), hit(e,d,T,p)->d (before statuses), after(e,d,T,p), hurt(d,p,T)->d, kill(e,T,p),
//         draw(T,p) (render time) · aw: {n, d, start, tick, end, cost, pre, cast, hit, after, hurt}.
import { ST } from '../state.js';
import { R, WATER, rgb } from '../world/materials.js';
import { W, t } from '../world/grid.js';
import { spawn } from '../world/particles.js';
import { beams, flash, fxWord, rings } from '../render/fx.js';
import { explode, punchOut } from '../world/destruction.js';
import { snd } from '../sfx.js';
import { damageEnemies, enemies, hitEnemy, nearestEnemy } from '../enemies/core.js';
import { boxHit, carve, hurt, mouse, pl_ } from '../player.js';
import { TSL, aim, quake, zap } from './powers.js';
import { ACT } from './xmen.js';
import { applyStatus, gainUlt, powerKind, stOf, summons } from './abilities.js';
import { venomSize } from './venom.js';
import { pix } from '../render/canvas.js';

const AWT=600; // awakened frames (10 s)
const cy=()=>pl_.y-ST.PH/2;
const say=(s,c,z=1,dy=0)=>fxWord(pl_.x,pl_.y-ST.PH-14-dy,s,z,c,true);
const near=r=>enemies.filter(e=>e.hp>0&&Math.hypot(e.x-pl_.x,e.y-cy())<r);
const randE=r=>{const l=near(r);return l.length?l[R()*l.length|0]:null;};
const line=(x0,y0,x1,y1,c,g,w=1,life=6)=>beams.push({x0,y0,x1,y1,life,w,c,g});
const glow=(x,y,c,n=1,s=1,l=12)=>{for(let k=0;k<n;k++){const a=R()*6.283,v=s*R();spawn(x,y,Math.cos(a)*v,Math.sin(a)*v,c,l,0,1,0,1);}};
const heal=v=>{pl_.hp=Math.min(ST.CH.hp,pl_.hp+v);};
const hurtSelf=v=>{pl_.hp=Math.max(1,pl_.hp-v);pl_.hurtF=8;};
const boost=(T,k,f)=>{T.bk=k;T.boostT=ST.frame+f;};
const hex=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
const tagged=(tag,f)=>{const tg=ST.dmgTag;ST.dmgTag=tag;f();ST.dmgTag=tg;};
const inWater=p=>{const X=p.x|0,Y=p.y-4|0;return X>=0&&X<W&&Y>=0&&t[Y*W+X]===WATER;};

// ---- shared effects
function strike(x,y,r,dmg){zap(x+(R()-.5)*30,ST.camY-10,x,y,[235,245,255],[120,170,255]);tagged('shock',()=>damageEnemies(x,y,r,dmg,0,-2,true));flash(x,y,18,[180,210,255],5);ST.shake=Math.max(ST.shake,5);snd('thunder',x,y,{gap:.12,v:.6});}
function missiles(p,n){for(let k=0;k<n;k++){const e=randE(320);if(!e)return;let x=p.x,y=p.y-ST.PH,j=0,mx=(R()-.5)*4,my=-3-R()*2;snd('missile',x,y,{v:.4,gap:.05});
  ACT.push(()=>{j++;const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;mx+=(dx/d*5-mx)*.18;my+=(dy/d*5-my)*.18;x+=mx;y+=my;spawn(x,y,-mx*.2,-my*.2,rgb(255,200,120),10,0,1,0,1);
    if(d<8||j>70||e.hp<=0&&j>20){explode(x|0,y|0,4,{self:true,quiet:true,col:[255,180,90]});if(e.hp>0)hitEnemy(e,14,mx*.3,my*.3-1);return false;}});}}
function phoenixBurst(x,y,r,dmg){explode(x|0,y|0,10,{self:true,fire:.8,col:[255,150,40]});tagged('fire',()=>damageEnemies(x,y,r,dmg,0,0,true));rings.push({x,y,r:4,vr:5,life:20,c:[255,160,60]});ST.shake=Math.max(ST.shake,10);}
function kinBlast(x,y,r,dmg){explode(x|0,y|0,6,{self:true,col:[180,120,255]});damageEnemies(x,y,r,dmg,0,0,true);rings.push({x,y,r:3,vr:4,life:16,c:[190,130,255]});fxWord(x,y-14,'KINETIC!',.9,'#c79bff',true);}
function plough(p,r){if(Math.abs(p.vx)<.8||ST.frame%3)return;const s=Math.sign(p.vx);carve(p.x+s*(ST.PW/2+2),p.y-ST.PH/2,r,p.vx,0);damageEnemies(p.x+s*6,p.y-ST.PH/2,r+6,6,s*4,-2);if(ST.frame%9===0)ST.shake=Math.max(ST.shake,3);}
function ricochet(p,n,dmg){let x=p.x,y=p.y-ST.PH/2;const hit=new Set();for(let k=0;k<n;k++){let b=null,bd=200;for(const e of enemies){if(hit.has(e)||e.hp<=0)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;b=e;}}if(!b)break;hit.add(b);
  line(x,y,b.x,b.y,[240,240,250],[60,90,220],2,8);hitEnemy(b,dmg,(b.x-x)*.03,-2);x=b.x;y=b.y;}if(hit.size)snd('clang',p.x,p.y,{v:.5});}
function venomArc(e){tagged('shock',()=>{hitEnemy(e,40,0,-2);if(!e.def.titan)stOf(e).stun=Math.max(stOf(e).stun,60);let n=0;
  for(const o of enemies){if(o===e||o.hp<=0||n>=3||Math.hypot(o.x-e.x,o.y-e.y)>90)continue;n++;line(e.x,e.y,o.x,o.y,[255,250,200],[255,220,40],1,6);hitEnemy(o,20,0,-1);if(!o.def.titan)stOf(o).stun=Math.max(stOf(o).stun,30);}});
  fxWord(e.x,e.y-e.def.h/2-10,'VENOM STRIKE!',1,'#ffe84a',true);snd('zap',e.x,e.y,{v:.7});}
function detonate(e){if(e.mem.det)return;e.mem.det=1;let k=0;snd('charge',e.x,e.y,{pitch:2,v:.4});
  ACT.push(()=>{k++;if(k%3===0)glow(e.x,e.y,rgb(255,90,200),2,1.2);if(k<30)return;e.mem.det=0;explode(e.x|0,e.y|0,6,{self:true,col:[255,90,200]});damageEnemies(e.x,e.y,36,30,0,-2,true);fxWord(e.x,e.y-12,'KA-BLAM!',1,'#ff70c0',true);return false;});}
const uCount=()=>summons.reduce((n,s)=>n+(s.ud?1:0),0);
function uDrone(x,y,life){summons.push({ud:true,x,y,life,ph:R()*6.283,cool:30,upd(s){if(ST.CH.id!=='ultron')return false;const fast=pl_.tr&&pl_.tr.aw>0,n=summons.indexOf(s);s.ph+=.04;
    const tx=pl_.x+Math.cos(s.ph+n)*26,ty=pl_.y-ST.PH-10+Math.sin(s.ph*1.3+n)*10;s.x+=(tx-s.x)*.12;s.y+=(ty-s.y)*.12;
    if(--s.cool<=0){const e=nearestEnemy(s.x,s.y,230);if(e){s.cool=fast?10:40;line(s.x,s.y,e.x,e.y,[255,220,210],[255,40,30],1,5);hitEnemy(e,fast?9:7,(e.x-s.x)*.01,0);}else s.cool=10;}},
  draw(s){for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(Math.abs(x)+Math.abs(y)<4)pix(s.x+x,s.y+y,y<0?rgb(150,156,170):rgb(100,104,116),0);const c=rgb(255,60,40);pix(s.x,s.y,c,c);}});}
// Strange's echoes: replay a power from where he stands now, aimed where he first cast it
const echoable=pw=>!pw.ult&&!pw.tk&&powerKind(pw)==='tap'&&!/Portal|Astral|Time Loop|Cloak|Mirror Fold|Ward|Shield|Stealth|Shrink|Giant|Form|Mode/.test(pw.n);
function replay(q,p){const sx=mouse.wx,sy=mouse.wy,cd=ST.cd,cm=ST.cdMax,en=p.en;mouse.wx=q.mx;mouse.wy=q.my;ST.echoK=q.k;
  try{q.pw.fn(aim(),p,()=>true);}catch(err){}
  mouse.wx=sx;mouse.wy=sy;ST.cd=cd;ST.cdMax=cm;p.en=en;ST.echoK=0;const h=aim().h;rings.push({x:h.x,y:h.y,r:3,vr:2,life:14,c:[255,200,90]});glow(h.x,h.y,rgb(255,210,90),8,1.5);}
const EL=['fire','ice','shock'],ELC={fire:'#ff8a3c',ice:'#aee8ff',shock:'#ffe84a'};
const STONEC={Power:'#c070ff',Space:'#5a8cff',Reality:'#ff4a4a',Soul:'#ffa040',Time:'#4aff7a',Mind:'#ffe04a'};
const has=(T,s)=>T.aw>0||T.st.has(s);
const phase=T=>T.aw>0?'FULL':['FULL','CRESCENT','NEW'][(T.t/900|0)%3];

export const TRAITS={
doom:{n:'Science & Sorcery',c:'#5fe08a',d:'Alternate tech and magic powers: each switch of school refunds half the cost and makes the next 0.75 s of hits 50% stronger.',
  hud:T=>[T.boostT>ST.frame?1:.3,T.school?(T.school==='magic'?'NEXT: TECH':'NEXT: MAGIC')+(T.boostT>ST.frame?' · +50%':''):'TECH ⇄ MAGIC'],
  pre(pw,p,c,T){const s=/Eldritch|Mystic|Octessence|Kneel|Gravity Well|Telekinesis/.test(pw.n)?'magic':'tech';if(T.school&&s!==T.school||T.aw>0){boost(T,1.5,45);p.en=Math.min(100,p.en+c*.5);if(!(T.aw>0))say(s==='magic'?'SORCERY!':'SCIENCE!','#7dffa8',.8);}T.school=s;},
  aw:{n:'God Emperor Doom',d:'Every power counts as a school switch, and an orbital laser burns the nearest foe every 2/3 s.',
    tick(p,T){if(T.aw%40===0){const e=nearestEnemy(p.x,p.y,340);if(e){line(e.x,ST.camY-20,e.x,e.y,[230,255,230],[60,255,120],4,10);explode(e.x|0,e.y|0,6,{self:true,col:[80,255,120]});hitEnemy(e,35,0,-2);snd('beam',e.x,e.y,{v:.5});}}}}},
hulk:{n:'Rage',c:'#7dff5a',d:'Getting hurt and smashing fill RAGE: up to +100% damage, 40% damage resistance and a bigger Hulk. Rage cools once he stops fighting.',
  hud:T=>[T.m/100,'RAGE '+(T.m|0)+'%'],
  tick(p,T){if(ST.frame-(T.lh??-999)>150)T.m=Math.max(0,T.m-.15);if(!(p.madder>0)&&!(T.aw>0))p.sizeT=1+T.m/100*.3;if(T.m>=80&&ST.frame%5===0)glow(p.x,p.y-ST.PH/2,rgb(120,255,90),1,1.5);},
  hit(e,d,T){T.m=Math.min(100,T.m+d*.12);T.lh=ST.frame;return d*(1+T.m/100);},
  hurt(d,p,T){T.m=Math.min(100,T.m+d*2.2);T.lh=ST.frame;if(T.m>=100&&ST.frame-(T.sw??-999)>180){T.sw=ST.frame;say('HULK ANGRIER!','#9dff6a',1.1);}return d*(1-T.m/250);},
  aw:{n:'Worldbreaker',d:'Rage locked at full, giant, +150% damage, 75% damage resistance, and every landing is a quake.',
    start(p,T){T.m=100;p.sizeT=1.45;},end(p){p.sizeT=1;},hit:(e,d)=>d*1.25,hurt:d=>d*.4,
    tick(p,T){T.m=100;T.lh=ST.frame;p.sizeT=1.45;if(p.ground&&!T.gr&&T.vy>3){quake(p.x|0,p.y|0,{r:22,col:[120,255,90]});damageEnemies(p.x,p.y-6,70,40,0,-5,true);}T.gr=p.ground;T.vy=p.vy;}}},
thor:{n:'Worthy',c:'#9fd0ff',d:'Every power stores storm charge; at full charge the next power also calls lightning down on the target. Hits within arm\'s reach deal +40%.',
  hud:T=>[T.m/100,T.m>=100?'STORM CHARGED':'STORM '+(T.m|0)+'%'],
  pre(pw,p,c,T){if(T.m>=100){T.m=0;strike(mouse.wx,mouse.wy,40,40);say('BY ODIN!','#bfe3ff',1);}else T.m=Math.min(100,T.m+22);},
  hit:(e,d)=>Math.hypot(e.x-pl_.x,e.y-cy())<60?d*1.4:d,
  aw:{n:'God of Thunder',d:'Every power is free, and lightning strikes a nearby enemy three times a second.',cost:()=>0,
    tick(p,T){T.m=100;if(T.aw%20===0){const e=randE(320);if(e)strike(e.x,e.y,22,30);}}}},
iron:{n:'Arc Reactor Heat',c:'#ffb050',d:'Powers cost no energy: they build HEAT, which vents fast once you stop. Hit 100 and the suit overheats: a steam blast, then 2 s locked out.',
  hud:T=>[T.oh>0?1:T.m/100,T.oh>0?'OVERHEATED':'HEAT '+(T.m|0)+'%'],
  cost(c,pw,p,T){if(T.oh>0)return 1e9;T.m+=c*1.1;T.lh=ST.frame;if(T.m>=100){T.m=100;T.oh=120;say('OVERHEAT!','#ff8a3c',1.2);explode(p.x|0,cy()|0,8,{self:true,col:[230,230,240]});damageEnemies(p.x,cy(),40,25,0,0,true);
      for(let k=0;k<30;k++)spawn(p.x,cy(),(R()-.5)*4,-R()*3,rgb(230,232,240),40,0,0,-.05,1);}return 0;},
  tick(p,T){if(T.oh>0){if(--T.oh===0)T.m=40;if(ST.frame%3===0)spawn(p.x+(R()-.5)*6,p.y-ST.PH,(R()-.5),-1-R(),rgb(220,224,232),30,0,0,-.03,1);}else if(ST.frame-(T.lh??-99)>20)T.m=Math.max(0,T.m-1.1);},
  aw:{n:'Mark 85 Nanotech',d:'No heat at all, and every power also launches four homing micro-missiles.',start(p,T){T.m=0;T.oh=0;},cost:()=>0,tick(p,T){T.m=0;},cast(pw,p){missiles(p,4);}}},
wolverine:{n:'Healing Factor',c:'#ffd23c',d:'Regenerates constantly. The lower his health, the harder he fights (up to +140% damage); under 40% health his cooldowns shrink by 40%.',
  hud:(T,p)=>{const f=Math.max(0,1-p.hp/ST.CH.hp);return[f,(f>.6?'BERSERK +':'FURY +')+(f*140|0)+'%'];},
  tick(p){if(p.hp>0)heal(ST.CH.hp*.0006);},
  hit:(e,d,T,p)=>d*(1+Math.max(0,1-p.hp/ST.CH.hp)*1.4),
  cast(pw,p){if(p.hp<ST.CH.hp*.4)ST.cd=Math.ceil(ST.cd*.6);},
  aw:{n:'Weapon X',d:'He cannot die, every slash heals him, cooldowns are halved and he regenerates ten times faster.',
    hit(e,d){heal(d*.25);return d*1.3;},hurt:(d,p)=>Math.min(d,Math.max(0,(p.hp-1)/ST.CH.armor)),cast(){ST.cd=Math.ceil(ST.cd*.5);},tick(){heal(ST.CH.hp*.002);}}},
cyclops:{n:'Precision Optics',c:'#ff5a4a',d:'Hits land harder the farther away the target is (70% point-blank, 150% at range). Stand still to build FOCUS: the next power crits for double damage and stuns.',
  hud:T=>[T.m/100,T.m>=100?'FOCUSED':'FOCUS '+(T.m|0)+'%'],
  tick(p,T){if(Math.abs(p.vx)<.4&&p.ground&&!(ST.cd>0))T.m=Math.min(100,T.m+1.1);if(T.m>=100&&ST.frame%8===0)glow(p.x+p.face*2,p.y-ST.PH+3,rgb(255,80,60),1,.6,8);},
  pre(pw,p,c,T){if(T.m>=100){boost(T,2,30);T.crit=ST.frame+30;say('FOCUSED!','#ff6b5c',.9);}T.m=0;},
  hit(e,d,T){if(T.crit>ST.frame&&!e.def.titan)stOf(e).stun=Math.max(stOf(e).stun,45);return d*(.7+Math.min(1,Math.hypot(e.x-pl_.x,e.y-cy())/260)*.8);},
  aw:{n:'Visor Off',d:'Permanent focus: every hit crits for double damage and stuns.',tick(p,T){T.m=100;T.crit=ST.frame+2;boost(T,2,2);}}},
iceman:{n:'Frostbite',c:'#aee8ff',d:'Every hit chills and the cold around him slows foes. Chilled enemies freeze solid, and a heavy hit on a frozen one SHATTERS for huge damage.',
  hud:T=>[Math.min(1,T.fz/5),'FROZEN NEARBY: '+T.fz],
  tick(p,T){if(ST.frame%10===0){T.fz=0;for(const e of near(160)){if(e.frozen>0)T.fz++;if(Math.hypot(e.x-p.x,e.y-cy())<55)applyStatus(e,'chill',12);}}if(ST.frame%4===0)spawn(p.x+(R()-.5)*20,p.y-R()*ST.PH,(R()-.5)*.3,.2,rgb(220,240,255),20,0,1,0,1);},
  after(e,d){if(!e.def.titan&&e.hp>0)applyStatus(e,'chill',Math.min(80,8+d*2));},
  aw:{n:'Absolute Zero',d:'Every enemy in range freezes solid each second, and frozen enemies take double damage.',hit:(e,d)=>e.frozen>0?d*2:d,
    tick(p,T){if(T.aw%60===0){for(const e of near(320))if(!e.def.titan)applyStatus(e,'chill',240);rings.push({x:p.x,y:cy(),r:6,vr:7,life:24,c:[200,240,255]});snd('freeze',p.x,p.y,{v:.6});}}}},
jean:{n:'Phoenix Heat',c:'#ff8a3c',d:'Every power stokes the Phoenix. Above half heat her hits burn and deal +40%; at full heat it erupts around her (scorching her too) and cools.',
  hud:T=>[T.m/100,(T.m>=50?'PHOENIX ':'HEAT ')+(T.m|0)+'%'],
  pre(pw,p,c,T){if(T.aw>0){phoenixBurst(mouse.wx,mouse.wy,40,30);return;}T.m+=14;T.lh=ST.frame;if(T.m>=100){T.m=25;phoenixBurst(p.x,cy(),90,45);hurtSelf(ST.CH.hp*.06);say('THE PHOENIX ERUPTS!','#ff9a3c',1.2);}},
  tick(p,T){if(ST.frame-(T.lh??-99)>60)T.m=Math.max(0,T.m-.2);if(T.m>=50&&ST.frame%4===0)glow(p.x,cy(),R()<.5?rgb(255,200,80):rgb(255,90,30),1,1.2);},
  hit(e,d,T){if(T.m>=50){ST.dmgTag=ST.dmgTag||'fire';return d*1.4;}return d;},
  aw:{n:'Dark Phoenix',d:'Heat held at the edge without erupting, and every power also detonates a firebird at the target.',tick(p,T){T.m=99;T.lh=ST.frame;}}},
spidey:{n:'Spider-Sense',c:'#ff4a4a',d:'Spider-sense dodges a quarter of all hits. Damage scales with how fast he is moving (up to +80%), and webbed enemies take +50%.',
  hud:(T,p)=>{const s=Math.min(1,Math.hypot(p.vx,p.vy)/7);return[s,'MOMENTUM +'+(s*80|0)+'%'];},
  hurt(d,p){if(R()<.25){p.vx+=(R()<.5?-1:1)*2;if(ST.frame-(p.dodgeW||-99)>30){p.dodgeW=ST.frame;say('SPIDER-SENSE!','#f3e9d2',.7);}return 0;}return d;},
  hit:(e,d,T,p)=>d*(1+Math.min(1,Math.hypot(p.vx,p.vy)/7)*.8)*(e.webbed>0?1.5:1),
  aw:{n:'Spider-Verse',d:'Spider-people from across the multiverse zip in and web-kick nearby foes several times a second.',
    tick(p,T){if(T.aw%15===0){const e=randE(300);if(e){const sx=e.x+(R()<.5?-60:60),sy=e.y-40;line(sx,sy,e.x,e.y,[255,255,255],[255,60,60],2,8);e.webbed=Math.max(e.webbed||0,90);hitEnemy(e,22,(e.x-sx)*.05,-2);
      for(let k=0;k<8;k++)spawn(e.x,e.y,(R()-.5)*3,(R()-.5)*3,R()<.5?rgb(255,60,60):rgb(60,90,255),12,0,1,0,1);}}}}},
wanda:{n:'Chaos Magic',c:'#ff3a6a',d:'Every hit rolls the dice: a crit for x2.5, a HEX (+50% damage taken) or a hurl into the air. Casting builds CHAOS, which raises the odds.',
  hud:T=>[T.m/100,'CHAOS '+(T.m|0)+'%'],
  pre(pw,p,c,T){T.m=Math.min(100,T.m+8);},
  tick(p,T){T.m=Math.max(0,T.m-.05);},
  hit(e,d,T){if(ST.frame-(e.mem.cx||-9)<6)return d;e.mem.cx=ST.frame;const k=1+T.m/100,r=R();
    if(r<.15*k||T.aw>0&&r<.5){glow(e.x,e.y,rgb(255,60,110),10,2.5);fxWord(e.x,e.y-e.def.h/2-8,'CHAOS!',.9,'#ff6b9a',true);return d*2.5;}
    if(r<.27*k){e.hex=Math.max(e.hex||0,240);fxWord(e.x,e.y-e.def.h/2-8,'HEXED!',.8,'#ff6b9a',true);}else if(r<.33*k&&!e.def.titan)e.vy-=6;return d;},
  aw:{n:'Scarlet Witch',d:'Reality bends to her: everything nearby is hexed, lifted and wrenched twice a second, and half of all hits crit.',
    tick(p,T){T.m=100;if(T.aw%30===0)for(const e of near(300)){e.hex=Math.max(e.hex||0,60);if(!e.def.titan)e.vy-=1.5;hitEnemy(e,9,0,0);glow(e.x,e.y,rgb(255,60,110),3,1.5);}}}},
strange:{n:'Eye of Agamotto',c:'#ffc85a',d:'Every spell echoes: 0.8 s later the Eye replays it from wherever he stands, at 60% power, aimed where he first cast it.',
  hud:T=>[Math.min(1,T.q.length/3),'ECHOES QUEUED: '+T.q.length],
  cast(pw,p,a,T){if(!echoable(pw))return;const n=T.aw>0?3:1;for(let k=1;k<=n;k++)T.q.push({pw,mx:mouse.wx,my:mouse.wy,t:ST.frame+k*(T.aw>0?18:48),k:T.aw>0?.7:.6});},
  tick(p,T){for(let n=T.q.length-1;n>=0;n--)if(ST.frame>=T.q[n].t)replay(T.q.splice(n,1)[0],p);},
  aw:{n:'Sorcerer Supreme',d:'Time slows for everything but Strange, every spell echoes three times, and the Bolts of Balthakk fire on their own.',
    tick(p,T){ST.slowT=Math.max(ST.slowT||0,2);if(T.aw%20===0){const e=randE(300);if(e){const h=aim().h;line(h.x,h.y,e.x,e.y,[255,240,190],[255,150,40],2,6);hitEnemy(e,18,(e.x-h.x)*.02,-1);glow(e.x,e.y,rgb(255,190,80),5,1.5);}}}}},
antman:{n:'Pym Particles',c:'#ff6b5c',d:'Size is power: damage scales with size (78% tiny, 148% giant). Tiny Ant-Man pays half energy and slips past 30% of hits.',
  hud:(T,p)=>[Math.min(1,(p.size||1)/2.2),'SIZE x'+(p.size||1).toFixed(2)],
  cost:(c,pw,p)=>(p.size||1)<.8?c*.5:c,
  hurt:(d,p)=>(p.size||1)<.8&&R()<.3?0:d,
  hit:(e,d,T,p)=>d*(.6+.4*(p.size||1)),
  aw:{n:'Giant-Man Rampage',d:'Full giant size with no particle drain; every stride shakes the ground and crushes nearby foes.',start(p){p.sizeT=2.2;},end(p){p.sizeT=1;},
    tick(p,T){p.sizeT=2.2;p.en=Math.min(100,p.en+.2);if(p.ground&&Math.abs(p.vx)>.6&&T.aw%24===0){damageEnemies(p.x,p.y-4,60,22,0,-4,true);ST.shake=Math.max(ST.shake,6);snd('stomp',p.x,p.y,{v:.6});
      for(let k=0;k<10;k++)spawn(p.x+(R()-.5)*30,p.y,(R()-.5)*2,-R()*2,rgb(150,130,110),20,0,0);}}}},
juggernaut:{n:'Unstoppable',c:'#ff7a4a',d:'Running builds MOMENTUM. Past 60% he shrugs off 70% of damage; at full momentum he ploughs through walls and enemies just by running, and his powers hit up to 60% harder.',
  hud:T=>[T.m/100,T.m>=100?'UNSTOPPABLE':'MOMENTUM '+(T.m|0)+'%'],
  tick(p,T){const run=Math.abs(p.vx)>1.1&&p.ground;T.m=run?Math.min(100,T.m+1.6):Math.max(0,T.m-(Math.abs(p.vx)<.3?3:.6));if(T.m>=100||T.aw>0)plough(p,T.aw>0?12:8);},
  hurt:(d,p,T)=>T.m>=60?d*.3:d,
  hit:(e,d,T)=>d*(1+T.m/100*.6),
  aw:{n:'Avatar of Cyttorak',d:'Momentum locked at full, giant and untouchable, crushing everything in his path.',start(p){p.sizeT=1.4;},end(p){p.sizeT=1;},tick(p,T){T.m=100;p.sizeT=1.4;},hurt:()=>0}},
ultron:{n:'Assimilation',c:'#ff5a4a',d:'Every kill builds a new Ultron drone (up to 6) that orbits him and fires on enemies. The drones stay until he switches out.',
  hud:()=>[uCount()/6,'DRONES '+uCount()],
  kill(e){if(uCount()<6){uDrone(e.x,e.y,1800);fxWord(e.x,e.y-12,'ASSIMILATED',.8,'#ff8a7a',true);}},
  aw:{n:'Age of Ultron',d:'Eight more drones roll off the line at once, and every drone fires four times faster.',start(p){for(let k=0;k<8;k++)uDrone(p.x,p.y-20,AWT+60);}}},
magneto:{n:'Magnetic Field',c:'#c070ff',d:'Metal shards orbit him: each power adds one, each kill two (up to 12). Shards fly at anything that comes close, and with 8 or more his powers hit 30% harder.',
  hud:T=>[T.m/12,'SHARDS '+(T.m|0)],
  cast(pw,p,a,T){T.m=Math.min(T.aw>0?24:12,T.m+1);},
  kill(e,T){T.m=Math.min(T.aw>0?24:12,T.m+2);},
  tick(p,T){const n=T.m|0;if(n>0&&ST.frame%(T.aw>0?5:12)===0){const e=nearestEnemy(p.x,cy(),T.aw>0?170:80);if(e){T.m--;const an=R()*6.283,x=p.x+Math.cos(an)*22,y=cy()+Math.sin(an)*14;line(x,y,e.x,e.y,[230,230,240],[180,90,255],1,5);hitEnemy(e,14,(e.x-x)*.04,-1);}}
    if(T.aw>0){if(T.aw%10===0)T.m=Math.min(24,T.m+1);for(const e of enemies){if(e.def.titan||e.hp<=0)continue;const dx=mouse.wx-e.x,dy=mouse.wy-e.y,d=Math.hypot(dx,dy)||1;if(d<260){e.vx+=dx/d*.35;e.vy+=dy/d*.35-.2;if(d<20&&ST.frame%10===0)hitEnemy(e,10,0,0);}}}},
  draw(T,p){const n=T.m|0;for(let k=0;k<n;k++){const an=ST.frame*.06+k/n*6.283,x=p.x+Math.cos(an)*22,y=p.y-ST.PH/2+Math.sin(an)*14,c=rgb(205,205,220);pix(x,y,c,0);pix(x+1,y,rgb(150,150,170),0);}},
  hit:(e,d,T)=>T.m>=8?d*1.3:d,
  aw:{n:'Master of Magnetism',d:'Shards regrow endlessly (up to 24) and fly twice as far, and every enemy is dragged to the cursor and crushed together.'}},
storm:{n:'Weather Witch',c:'#bfe3ff',d:'Rain follows her and soaks every enemy close by; wet enemies hit by lightning are ELECTROCUTED. Every two seconds a bolt finds a nearby target on its own.',
  hud:()=>[(ST.frame%120)/120,'NEXT BOLT'],
  tick(p,T){if(ST.frame%4===0)spawn(p.x+(R()-.5)*120,p.y-ST.PH-40-R()*20,0,3,rgb(120,160,230),24,0,0,.5);if(ST.frame%20===0)for(const e of near(110))applyStatus(e,'wet',200);
    if(ST.frame%(T.aw>0?15:120)===0){const e=randE(T.aw>0?320:220);if(e)strike(e.x,e.y,16,T.aw>0?28:20);}
    if(T.aw>0)for(const e of near(260))if(!e.def.titan)e.vx+=Math.sign(e.x-p.x)*.12;},
  aw:{n:'Goddess of the Storm',d:'Lightning hits a nearby enemy four times a second, and a gale hurls everything away from her.'}},
venom:{n:'Biomass',c:'#d0d0e8',d:'The symbiote feeds: every hit heals him, and kills can add biomass (bigger, +12% damage per stack, up to 4). Big hits knock biomass loose.',
  hud:(T,p)=>[(p.bm||0)/4,'BIOMASS '+(p.bm||0)+'/4'],
  hit(e,d,T,p){heal(d*.06*(T.aw>0?3:1));return d*(1+(p.bm||0)*.12);},
  kill(e,T,p){if((p.bm||0)<4&&R()<.5){p.bm=(p.bm||0)+1;venomSize(p);say('BIOMASS!','#d0d0e8',.7);}},
  hurt(d,p){if(d>=12&&(p.bm||0)>0&&R()<.3){p.bm--;venomSize(p);}return d;},
  aw:{n:'We Are Venom',d:'Biomass maxed, and feeding heals three times as much.',start(p){p.bm=4;venomSize(p);}}},
reed:{n:'Elastic Genius',c:'#6fb0ff',d:'His rubber body takes 40% less damage. Each hit ANALYZES the target; the third analysis exposes its weak point (+50% damage from everything).',
  hud:T=>[Math.min(1,T.an/3),'EXPOSED FOES: '+T.an],
  hurt:d=>d*.6,
  after(e){if(ST.frame-(e.mem.an2||-9)<8||e.hp<=0)return;e.mem.an2=ST.frame;e.mem.an=(e.mem.an||0)+1;if(e.mem.an>=3){e.mem.an=0;applyStatus(e,'mark',300);fxWord(e.x,e.y-e.def.h/2-8,'WEAKNESS FOUND!',.8,'#9fd8ff',true);}},
  tick(p,T){if(ST.frame%30===0)T.an=enemies.filter(e=>e.st&&e.st.mark>0).length;},
  aw:{n:'Smartest Man Alive',d:'Every enemy in sight is analyzed and exposed, and the rubber body ignores 90% of damage.',hurt:d=>d*.15,tick(p,T){if(T.aw%60===0)for(const e of near(340))applyStatus(e,'mark',120);}}},
sue:{n:'Force Field',c:'#9fd4ff',d:'A personal force field soaks damage and recharges after 1.5 s without being hit. While it holds, enemies that touch her are hurled away.',
  hud:T=>[T.m/100,'FIELD '+(T.m|0)+'%'],init(T){T.m=100;},
  tick(p,T){if(ST.frame-(T.lh??-999)>90)T.m=Math.min(100,T.m+(T.aw>0?5:.4));const r=T.aw>0?60:20;if(T.m>25&&ST.frame%6===0)for(const e of near(r)){const dx=e.x-p.x,d=Math.abs(dx)||1;hitEnemy(e,T.aw>0?14:5,dx/d*5,-3);glow(e.x,e.y,rgb(160,210,255),3,1);}},
  hurt(d,p,T){T.lh=ST.frame;if(T.m>0){const a=Math.min(T.m,d*2.5);T.m-=a;d-=a/2.5;glow(p.x,cy(),rgb(170,215,255),4,2);}return d;},
  draw(T,p){if(T.m<=0)return;const r=13*(p.size||1),n=24,c=rgb(170,215,255);for(let k=0;k<n;k++){if(k/n>T.m/100)break;const an=k/n*6.283+ST.frame*.02;pix(p.x+Math.cos(an)*r,p.y-ST.PH/2+Math.sin(an)*r*1.3,c,c);}},
  aw:{n:'Invisible Fortress',d:'The field never breaks, recharges instantly and blasts away anything within 60 px.',tick(p,T){T.m=100;},hurt:()=>0}},
torch:{n:'Flame On',c:'#ff9a3c',d:'Flying leaves a burning trail that scorches anything it touches; the longer he stays aloft, the hotter he burns (up to +80% fire damage). Water snuffs him out.',
  hud:T=>[T.m/100,'HEAT '+(T.m|0)+'%'],
  tick(p,T){if(p.fly){T.m=Math.min(100,T.m+.5);if(ST.frame%5===0)tagged('fire',()=>{const n=TSL.length,rr=T.aw>0?20:9;for(let k=6;k<36&&k<n;k+=6){const s=TSL[n-1-k];damageEnemies(s.x,s.y-ST.PH/2,rr,T.aw>0?9:3,0,0);spawn(s.x+(R()-.5)*4,s.y-ST.PH/2,(R()-.5)*.6,-.6,R()<.5?rgb(255,200,80):rgb(255,90,30),18,0,1,-.02,1);}});}
    else T.m=Math.max(0,T.m-.8);if(inWater(p)&&T.m>0){T.m=0;say('FLAME OFF!','#9fc8ff',.8);}},
  hit:(e,d,T)=>d*(1+T.m/100*(ST.dmgTag==='fire'?.8:.4)),
  aw:{n:'Nova Flame',d:'Nova heat: a trail twice as wide and three times as hot, and nothing can hurt him.',start(p){if(ST.CH.fly)p.fly=true;},tick(p,T){T.m=100;},hurt:()=>0}},
thing:{n:'Rock Solid',c:'#ffa060',d:'His rocky hide halves all damage. Taking hits fills CLOBBER; when it is full, his next power lands for triple damage with a shockwave.',
  hud:T=>[T.m/100,T.m>=100?"CLOBBERIN' READY":'CLOBBER '+(T.m|0)+'%'],
  hurt(d,p,T){T.m=Math.min(100,T.m+d*3);return d*.5;},
  after(e,d,T){if(!(T.boostT>ST.frame))T.m=Math.min(100,T.m+d*.15);},
  pre(pw,p,c,T){if(T.m>=100||T.aw>0){T.m=0;boost(T,3,25);const x=p.x+p.face*16,y=p.y-6;explode(x|0,y|0,10,{self:true,col:[214,150,90]});damageEnemies(x,y-ST.PH/2+6,50,30,p.face*7,-4);if(!(T.aw>0))say('CLOBBERED!','#ffb070',1.1);}},
  aw:{n:'Yancy Street Fury',d:'Nothing hurts him, and every single power is a triple-damage clobber with a shockwave.',hurt:()=>0}},
panther:{n:'Kinetic Vibranium',c:'#b07aff',d:'The suit softens blows by 25% and stores the force of every hit he takes or deals. At full charge his next power releases it as a kinetic blast.',
  hud:(T,p)=>[(p.kin||0)/100,'KINETIC '+Math.round(p.kin||0)+'%'],
  hurt:d=>d*.75,
  after(e,d,T,p){p.kin=Math.min(100,(p.kin||0)+d*.2);},
  pre(pw,p){if((p.kin||0)>=100&&pw.n!=='Kinetic Pulse'){p.kin=0;kinBlast(p.x,cy(),80,45);}},
  aw:{n:"Bast's Chosen",d:'Kinetic charge never runs out, and every hit he lands bursts with stored force.',tick(p){p.kin=100;},after(e,d,T){if(ST.frame-(T.kb||-9)>6){T.kb=ST.frame;kinBlast(e.x,e.y,24,14);}}}},
cap:{n:'Shield Guard',c:'#9fb8ff',d:'When he is not attacking the shield is up: 60% less damage. Every kill rallies him for 3 s (+30% damage).',
  hud:T=>{const g=ST.frame-(T.lc??-99)>40,r=ST.buffT>ST.frame;return[r?1:g?.6:.15,r?'RALLIED +30%':g?'GUARD UP':'ATTACKING'];},
  hurt(d,p,T){if(ST.frame-(T.lc??-99)>40){if(ST.frame-(T.bw||-99)>30){T.bw=ST.frame;say('BLOCKED!','#e6e6f2',.7);snd('clang',p.x,p.y,{v:.4});}return d*.4;}return d;},
  kill(){ST.buffT=Math.max(ST.buffT||0,ST.frame+180);},
  aw:{n:'Avengers Assemble',d:'Rallied the whole time, untouchable, and the shield ricochets between up to five enemies twice a second.',tick(p,T){ST.buffT=ST.frame+5;if(T.aw%30===0)ricochet(p,5,22);},hurt:()=>0}},
marvel:{n:'Energy Absorption',c:'#ffd23c',d:'Half of all damage she takes becomes energy and ultimate charge instead. Above 90 energy she burns BINARY and hits 50% harder.',
  hud:(T,p)=>[p.en/100,p.en>90?'BINARY +50%':'ABSORBING'],
  hurt(d,p){p.en=Math.min(100,p.en+d*1.5);gainUlt(d*.3);return d*.5;},
  hit:(e,d,T,p)=>p.en>90?d*1.5:d,
  tick(p){if(p.en>90&&ST.frame%4===0)glow(p.x,cy(),rgb(255,220,120),1,1.4);},
  aw:{n:'Binary',d:'Infinite energy, untouchable, double damage, and she takes to the air.',start(p){if(ST.CH.fly)p.fly=true;},cost:()=>0,tick(p){p.en=100;},hurt:()=>0,hit:(e,d)=>d*1.35}},
surfer:{n:'Power Cosmic',c:'#c8d4ff',d:'Speed is his weapon: damage rises with board speed (up to +100%), and flying through enemies fast rams them.',
  hud:(T,p)=>{const s=Math.min(1,Math.hypot(p.vx,p.vy)/6);return[s,'VELOCITY +'+(s*100|0)+'%'];},
  tick(p,T){const s=Math.hypot(p.vx,p.vy);if((s>3.5||T.aw>0)&&ST.frame%4===0){damageEnemies(p.x,cy(),T.aw>0?30:14,(T.aw>0?12:3)+s*1.5,p.vx*.6,p.vy*.6-1);spawn(p.x,cy(),-p.vx*.2,-p.vy*.2,rgb(220,230,255),16,0,1,0,1);}},
  hit:(e,d,T,p)=>d*(1+Math.min(1,Math.hypot(p.vx,p.vy)/6)),
  aw:{n:'Herald of Galactus',d:'Every power is free, nothing can touch him, and a cosmic wake shreds anything near the board.',cost:()=>0,hurt:()=>0}},
rider:{n:'Penance',c:'#ff8a2a',d:'Every hit sets enemies ablaze, burning enemies take +25%, and each kill feeds him a soul that heals 6%.',
  hud:T=>[Math.min(1,T.souls/10),'SOULS TAKEN: '+T.souls],
  hit:(e,d)=>e.st&&e.st.burn>0?d*1.25:d,
  after(e){if(e.hp>0)applyStatus(e,'burn',180);},
  kill(e,T){T.souls++;heal(ST.CH.hp*.06);glow(pl_.x,cy(),rgb(255,140,40),6,1.5);},
  aw:{n:'Spirit of Vengeance',d:'The Penance Stare burns every enemy in sight for its sins twice a second.',
    tick(p,T){if(T.aw%30===0)tagged('fire',()=>{for(const e of near(300)){line(p.x+p.face*2,p.y-ST.PH+3,e.x,e.y,[255,220,120],[255,90,20],1,4);hitEnemy(e,12,0,0);}});}}},
pool:{n:'Regeneration & Luck',c:'#ff4a5a',d:'Heals constantly and, once every 20 s, shrugs off a killing blow. Every power has a 20% chance to be MAXIMUM EFFORT: double damage.',
  hud:T=>{const r=Math.max(0,1200-(ST.frame-(T.dd??-9999)));return[1-r/1200,r>0?'HEALING FACTOR '+Math.ceil(r/60)+'s':"CAN'T DIE (ONCE)"];},
  tick(p){if(p.hp>0)heal(ST.CH.hp*.0009);},
  pre(pw,p,c,T){if(R()<.2||T.aw>0){boost(T,2,30);if(ST.frame-(T.mw||-99)>40){T.mw=ST.frame;say('MAXIMUM EFFORT!','#ff6b6b',1);}}},
  hurt(d,p,T){if(p.hp-d*ST.CH.armor<=0&&ST.frame-(T.dd??-9999)>1200){T.dd=ST.frame;p.hp=ST.CH.hp*.4;say(['NOT TODAY, SATAN','I GOT BETTER','HEALING FACTOR, BABY'][R()*3|0],'#ff6b6b',1.1);return 0;}return d;},
  aw:{n:'Deadpool Corps',d:'Every power is Maximum Effort, cooldowns all but vanish, and he regenerates five times faster.',cast(){ST.cd=Math.min(ST.cd,8);},tick(){heal(ST.CH.hp*.0045);}}},
thanos:{n:'Infinity Gauntlet',c:'#c080ff',d:'Casting a stone power sets that stone for good. POWER +40% damage · SPACE blinks him clear of 20% of hits · REALITY hexes · SOUL heals on kills · TIME cuts cooldowns 35% · MIND stuns.',
  hud:T=>[T.st.size/6,'STONES '+T.st.size+'/6'],init(T){T.st=new Set();},
  cast(pw,p,a,T){const m=/^(Power|Space|Reality|Soul|Time|Mind) Stone/.exec(pw.n);if(m&&!T.st.has(m[1])){T.st.add(m[1]);say(m[1].toUpperCase()+' STONE SET',STONEC[m[1]],1);}if(has(T,'Time'))ST.cd=Math.ceil(ST.cd*.65);},
  hit(e,d,T){if(has(T,'Reality')&&R()<.15)e.hex=Math.max(e.hex||0,180);if(has(T,'Mind')&&R()<.1&&!e.def.titan)stOf(e).stun=Math.max(stOf(e).stun,40);return has(T,'Power')?d*1.4:d;},
  hurt(d,p,T){if(has(T,'Space')&&R()<.2){p.x=Math.max(5,Math.min(W-5,p.x+(R()<.5?-1:1)*24));if(boxHit(p.x,p.y))punchOut(p);glow(p.x,cy(),rgb(90,140,255),8,2);return 0;}return d;},
  kill(e,T){if(has(T,'Soul'))heal(ST.CH.hp*.05);},
  aw:{n:'Perfectly Balanced',d:'All six stones blaze at once and his damage climbs another 50%.',hit:(e,d)=>d*1.5}},
hela:{n:'Goddess of Death',c:'#5aff8a',d:'Kills feed her souls (up to 10, +6% damage each). If a hit would kill her, five souls pay the price and she rises at half health.',
  hud:T=>[T.souls/10,'SOULS '+T.souls+'/10'],
  kill(e,T){T.souls=Math.min(10,T.souls+1);if(T.aw>0)heal(ST.CH.hp*.1);},
  hit:(e,d,T)=>d*(1+T.souls*.06),
  hurt(d,p,T){if(p.hp-d*ST.CH.armor<=0&&T.souls>=5){T.souls-=5;p.hp=ST.CH.hp*.5;say('DEATH CANNOT HOLD ME','#7dffa8',1.1);glow(p.x,cy(),rgb(90,255,140),20,2.5);return 0;}return d;},
  aw:{n:'Queen of Hel',d:'Souls maxed, a necrosword impales a nearby enemy three times a second, and every kill heals 10%.',start(p,T){T.souls=10;},
    tick(p,T){if(T.aw%20===0){const e=randE(300);if(e){line(e.x+(R()-.5)*20,e.y-70,e.x,e.y,[200,255,210],[40,200,90],2,8);hitEnemy(e,24,0,-1);glow(e.x,e.y,rgb(80,240,120),6,1.5);}}}}},
moon:{n:'Phases of Khonshu',c:'#e8ecf8',d:'The moon turns every 15 s. FULL: +60% damage. CRESCENT: cooldowns 40% shorter and faster energy. NEW: hits heal him and he takes 40% less damage.',
  hud:T=>[1-(T.t%900)/900,phase(T)+' MOON'],
  tick(p,T){T.t++;const ph=phase(T);if(ph!==T.ph){if(T.ph)say(ph+' MOON',ph==='FULL'?'#fff6c8':ph==='NEW'?'#8890b0':'#cfd8ff',1);T.ph=ph;}if(ph==='CRESCENT')p.en=Math.min(100,p.en+.15);},
  hit(e,d,T){const ph=phase(T);if(ph==='NEW')heal(d*.08);return ph==='FULL'?d*1.6:d;},
  hurt:(d,p,T)=>phase(T)==='NEW'?d*.6:d,
  cast(pw,p,a,T){if(phase(T)==='CRESCENT')ST.cd=Math.ceil(ST.cd*.6);},
  aw:{n:'Avatar of Khonshu',d:'A full moon that never sets, and crescent darts fly at nearby foes on their own, marking them.',
    tick(p,T){if(T.aw%12===0){const e=randE(280);if(e){line(p.x,cy(),e.x,e.y,[255,255,255],[200,210,255],1,5);hitEnemy(e,12,0,0);applyStatus(e,'mark',60);}}}}},
shang:{n:'Kung Fu Flow',c:'#ffcf5a',d:'Chain DIFFERENT powers within 2.5 s to build FLOW (+12% damage per step, up to x10). Repeating a power or pausing breaks it.',
  hud:T=>[T.cb/10,T.cb?'FLOW x'+T.cb:'FLOW'],
  pre(pw,p,c,T){if(T.aw>0){T.cb=10;return;}if(ST.frame-(T.lt??-999)>150||pw.n===T.last)T.cb=0;T.cb=Math.min(10,T.cb+1);T.last=pw.n;T.lt=ST.frame;if(T.cb>=3)fxWord(p.x,p.y-ST.PH-12,'FLOW x'+T.cb,.6+T.cb*.05,'#ffcf5a',true);},
  tick(p,T){if(!(T.aw>0)&&T.cb>0&&ST.frame-(T.lt??-999)>150)T.cb=0;},
  hit:(e,d,T)=>d*(1+T.cb*.12),
  aw:{n:'Master of the Ten Rings',d:'Flow locked at x10, and the rings strike nearby enemies on their own six times a second.',
    tick(p,T){T.cb=10;if(T.aw%10===0){const e=randE(260);if(e){const an=R()*6.283,x=p.x+Math.cos(an)*20,y=cy()+Math.sin(an)*20;line(x,y,e.x,e.y,[255,240,180],[255,180,40],2,6);hitEnemy(e,14,(e.x-x)*.03,-1);}}}}},
gambit:{n:'Kinetic Charge',c:'#ff70c0',d:'Every hit charges the target with kinetic energy; the third charge makes it DETONATE half a second later, blasting everything around it (and charging them in turn).',
  hud:T=>[Math.min(1,T.ch/5),'CHARGED FOES: '+T.ch],
  after(e){if(e.hp<=0||ST.frame-(e.mem.gk2||-9)<6)return;e.mem.gk2=ST.frame;e.mem.gk=(e.mem.gk||0)+1;glow(e.x,e.y,rgb(255,90,200),3,1);if(e.mem.gk>=3){e.mem.gk=0;detonate(e);}},
  tick(p,T){if(ST.frame%15===0)T.ch=enemies.filter(e=>(e.mem.gk||0)>0).length;if(T.aw>0&&T.aw%8===0){const e=randE(320);if(e)detonate(e);}},
  aw:{n:'Full House',d:'The whole room is the deck: a nearby enemy detonates every few frames.'}},
kurt:{n:'Ambush',c:'#7f8cff',d:'Teleporting leaves a burst of brimstone that hurts anything nearby, and for 1.25 s after any BAMF his hits deal double damage.',
  hud:T=>{const r=Math.max(0,(T.amb||0)-ST.frame);return[r/75,r>0?'AMBUSH x2':'BAMF TO AMBUSH'];},
  tick(p,T){if(T.px!=null&&Math.hypot(p.x-T.px,p.y-T.py)>26){T.amb=ST.frame+75;damageEnemies(T.px,T.py-ST.PH/2,22,14,0,-2,true);for(let k=0;k<14;k++)spawn(T.px+(R()-.5)*10,T.py-R()*ST.PH,(R()-.5)*1.5,-R(),R()<.5?rgb(60,40,90):rgb(40,30,60),30,0,0,-.03,1);}
    if(T.aw>0&&T.aw%14===0){const e=randE(300);if(e){const s=R()<.5?-1:1;p.x=Math.max(5,Math.min(W-5,e.x+s*12));p.y=e.y+e.def.h/2;p.face=-s;p.vx=p.vy=0;if(boxHit(p.x,p.y))punchOut(p);hitEnemy(e,26,-s*3,-2);snd('whoosh',p.x,p.y,{v:.4});}}
    T.px=p.x;T.py=p.y;},
  hit:(e,d,T)=>(T.amb||0)>ST.frame?d*2:d,
  aw:{n:'BAMF Storm',d:'Kurt blinks from foe to foe on his own, striking each with ambush damage.'}},
quill:{n:'Element Gun',c:'#ff7a5a',d:'Every power cycles his element (fire, ice, shock) and his hits carry it, so he sets up his own combos: chill then burn for THERMAL SHOCK, burn then shock for WILDFIRE.',
  hud:T=>[(T.el+1)/3,'ELEMENT: '+EL[T.el].toUpperCase()],
  cast(pw,p,a,T){T.el=(T.el+1)%3;say(EL[T.el].toUpperCase(),ELC[EL[T.el]],.6);},
  hit(e,d,T){ST.dmgTag=T.aw>0?EL[(ST.frame>>2)%3]:ST.dmgTag||EL[T.el];return d;},
  aw:{n:'Dance-Off',d:'Every enemy near him is too busy dancing to fight: the beat hits them twice a second, they take +50% damage, and his element shifts with every hit.',hit:(e,d)=>e.st&&e.st.stun>0?d*1.5:d,
    tick(p,T){if(T.aw%30===0)for(const e of near(220)){if(!e.def.titan)stOf(e).stun=Math.max(stOf(e).stun,32);hitEnemy(e,10,0,-1.5);for(let k=0;k<2;k++)spawn(e.x+(R()-.5)*10,e.y-e.def.h/2-4,(R()-.5),-1,R()<.5?rgb(255,120,200):rgb(120,220,255),20,0,1,0,1);}}}},
miles:{n:'Venom Charge',c:'#ffe84a',d:'Hits build bio-electric charge; when full, the next hit discharges for +40 damage, stuns and arcs to three more foes. Glitching lets 20% of hits phase through him.',
  hud:T=>[T.m/100,T.m>=100?'VENOM READY':'VENOM '+(T.m|0)+'%'],
  hurt(d,p){if(R()<.2){if(ST.frame-(p.dodgeW||-99)>30){p.dodgeW=ST.frame;say('GLITCH!','#ffe84a',.7);}return 0;}return d;},
  after(e,d,T){if(T.inner||e.hp<=0)return;if(T.m>=100||T.aw>0&&ST.frame-(T.vz||-9)>10){T.m=0;T.vz=ST.frame;T.inner=1;venomArc(e);T.inner=0;}else T.m=Math.min(100,T.m+d*.35);},
  aw:{n:'Venom Overload',d:'Glitching so hard nothing lands, and every hit (up to six a second) is a venom discharge.',hurt:()=>0}},
kang:{n:'Temporal Debt',c:'#a878ff',d:'Damage reaches Kang 3 s late: every hit is filed as DEBT and comes due later. Each kill he makes erases a third of what he owes.',
  hud:T=>{const s=T.dq.reduce((a,q)=>a+q.d,0);return[Math.min(1,s/(ST.CH.hp*.4)),'DEBT '+Math.round(s)];},init(T){T.dq=[];},
  hurt(d,p,T){if(T.paying)return d;T.dq.push({t:ST.frame+180,d});if(ST.frame-(T.dw||-99)>40){T.dw=ST.frame;say('DEFERRED','#c8a8ff',.6);}return 0;},
  tick(p,T){while(T.dq.length&&T.dq[0].t<=ST.frame){const q=T.dq.shift();T.paying=1;hurt(q.d);T.paying=0;}},
  kill(e,T){if(!T.dq.length)return;for(const q of T.dq)q.d*=.67;glow(pl_.x,cy(),rgb(170,120,255),6,1.5);},
  aw:{n:'Lord of Time',d:'His debt is wiped and nothing new comes due, cooldowns run 60% faster, and Kangs from other timelines fire chrono bolts at nearby foes.',start(p,T){T.dq.length=0;},cast(){ST.cd=Math.ceil(ST.cd*.4);},
    tick(p,T){T.dq.length=0;if(T.aw%24===0){const e=randE(300);if(e){const x=e.x+(R()-.5)*80,y=e.y-50-R()*30;line(x,y,e.x,e.y,[230,210,255],[168,120,255],2,6);hitEnemy(e,16,(e.x-x)*.02,-1);glow(x,y,rgb(170,120,255),5,1);}}}}},
};

// ---- state and hooks
const st0=()=>({m:0,aw:0,fz:0,an:0,souls:0,cb:0,el:0,ch:0,t:0,q:[]});
export function trOf(p=pl_){const id=ST.CH.id;if(!p.tr||p.tr.id!==id){p.tr=Object.assign(st0(),{id});const tr=TRAITS[id];if(tr&&tr.init)tr.init(p.tr);}return p.tr;}
const TR=()=>TRAITS[ST.CH.id];
export function traitCost(c,pw,p){const tr=TR();if(!tr)return c;const T=trOf(p);if(T.aw>0&&tr.aw.cost)return tr.aw.cost(c,pw,p,T);return tr.cost?tr.cost(c,pw,p,T):c;}
// once per fresh cast, after the energy is paid and before the power deals its damage
export function traitPre(pw,p,c){const tr=TR();if(!tr||pw.ult)return;const T=trOf(p),fresh=ST.frame-(T.lp??-9)>2;T.lp=ST.frame;if(!fresh)return;if(tr.pre)tr.pre(pw,p,c,T);if(T.aw>0&&tr.aw.pre)tr.aw.pre(pw,p,c,T);}
export function traitCast(pw,p,a){const tr=TR();if(!tr||pw.ult)return;const T=trOf(p),fresh=ST.frame-(T.lc??-9)>2;T.lc=ST.frame;if(!fresh)return;if(tr.cast)tr.cast(pw,p,a,T);if(T.aw>0&&tr.aw.cast)tr.aw.cast(pw,p,a,T);}
export function traitUlt(pw,p){const tr=TR();if(!tr||!tr.aw)return;const T=trOf(p);if(T.aw>0&&tr.aw.end)tr.aw.end(p,T);T.aw=AWT;if(tr.aw.start)tr.aw.start(p,T);
  const c=hex(tr.c);say('AWAKENED: '+tr.aw.n.toUpperCase(),tr.c,1.2,22);rings.push({x:p.x,y:cy(),r:4,vr:5,life:30,c},{x:p.x,y:cy(),r:34,vr:-1,life:30,c});flash(p.x,cy(),60,c,12);}
export function traitTick(){const p=pl_,tr=TR();if(!tr)return;const T=trOf(p);
  if(tr.draw&&!T.vis){T.vis=1;summons.push({x:0,y:0,life:1e9,upd(){if(pl_.tr!==T||ST.CH.id!==T.id)return false;},draw(){tr.draw(T,pl_);}});}
  if(tr.tick)tr.tick(p,T);
  if(T.aw>0){T.aw--;if(tr.aw.tick)tr.aw.tick(p,T);if(ST.frame%3===0){const c=hex(tr.c),an=R()*6.283;spawn(p.x+Math.cos(an)*10*(p.size||1),cy()+Math.sin(an)*14*(p.size||1),0,-.6,rgb(c[0],c[1],c[2]),16,0,1,0,1);}
    if(T.aw===0){if(tr.aw.end)tr.aw.end(p,T);say(tr.aw.n.toUpperCase()+' FADES','#8d84a8',.7);}}}
const baseHit=ST.hitHook;
ST.hitHook=(e,d)=>{const tr=ST.pctx&&TR();if(!tr)return baseHit(e,d);const p=pl_,T=trOf(p),tg=ST.dmgTag;
  if(ST.echoK>0)d*=ST.echoK;if(T.boostT>ST.frame)d*=T.bk||1;
  if(tr.hit)d=tr.hit(e,d,T,p);if(T.aw>0&&tr.aw.hit)d=tr.aw.hit(e,d,T,p);
  d=baseHit(e,d);ST.dmgTag=tg;
  if(tr.after)tr.after(e,d,T,p);if(T.aw>0&&tr.aw.after)tr.aw.after(e,d,T,p);return d;};
ST.hurtHook=d=>{const tr=TR();if(!tr)return d;const p=pl_,T=trOf(p);if(tr.hurt)d=tr.hurt(d,p,T);if(d>0&&T.aw>0&&tr.aw.hurt)d=tr.aw.hurt(d,p,T);return d;};
ST.killHook=e=>{const tr=TR();if(tr&&tr.kill)tr.kill(e,trOf(),pl_);};
// on hero switch: name the trait and put the whole rule in the hero label's tooltip
export function traitIntro(){const tr=TR();if(!tr)return;say(tr.n.toUpperCase(),tr.c,.8,10);const h=document.getElementById('hero');if(h)h.title=`${tr.n}: ${tr.d}\nUltimate awakens ${tr.aw.n}: ${tr.aw.d}`;}
// ---- HUD: the trait bar under the ultimate bar
{const hc=document.querySelector('#hud .hcol');if(hc&&!document.getElementById('trm')){const b=document.createElement('div');b.className='bar trb';b.innerHTML='<div id="trm"></div><b id="trK"></b>';hc.appendChild(b);}}
let hW='',hC='',hK='';
export function hudTrait(){const el=document.getElementById('trm');const tr=TR();if(!el||!tr)return;const p=pl_,T=trOf(p);let [f,lab]=tr.hud?tr.hud(T,p):[0,tr.n];
  if(T.aw>0){f=T.aw/AWT;lab=tr.aw.n.toUpperCase()+' '+Math.ceil(T.aw/60)+'s';}
  const w=Math.round(Math.max(0,Math.min(1,f||0))*100)+'%';if(w!==hW){hW=w;el.style.width=w;}if(tr.c!==hC){hC=tr.c;el.style.background=tr.c;el.parentNode.title=tr.n+': '+tr.d;}
  if(lab!==hK){hK=lab;document.getElementById('trK').textContent=lab;}el.parentNode.classList.toggle('aw',T.aw>0);}
