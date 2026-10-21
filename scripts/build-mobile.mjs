// Builds dist/mobile.html: the single-file game wrapped for phones, tuned for iOS Safari.
// Run after `vite build` (npm run build:mobile does both). Open it from a web host in Safari,
// then Share > Add to Home Screen to play it full screen like an app.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// ---- home-screen icon: a 180x180 PNG drawn here so the file stays self-contained
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function icon() {
  const S = 180, raw = Buffer.alloc((S * 3 + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (S * 3 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      const o = y * (S * 3 + 1) + 1 + x * 3, dx = x - 90, dy = y - 90, r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx), spike = 62 + Math.sin(ang * 9) * 14; // comic "POW" burst
      let c = [36, 28, 60]; // ink-purple ground
      if (r < spike + 6) c = [20, 17, 15];
      if (r < spike) c = [255, 201, 60];
      if (r < 30) c = [226, 59, 46];
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}

const ICON = icon();
const head = `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Heroes Sandbox">
<meta name="theme-color" content="#0d0a18">
<link rel="apple-touch-icon" href="${ICON}">
<style>
  html,body{position:fixed;inset:0;overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;background:#0d0a18}
  #tc{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:flex-end;z-index:99;pointer-events:none;
      padding:0 max(12px,env(safe-area-inset-right)) calc(max(8px,env(safe-area-inset-bottom)) + 40px) max(12px,env(safe-area-inset-left))} /* room underneath for the power chip */
  #tc .pad{display:flex;gap:10px;pointer-events:auto}
  #tc button{width:62px;height:62px;border:3px solid #14110f;border-radius:50%;background:rgba(255,201,60,.82);color:#14110f;font:700 18px sans-serif;touch-action:none;box-shadow:3px 3px 0 #14110f}
  #tc button.on{background:#ff6b5c}
  #tc .small button{width:48px;height:48px;font-size:14px}
  body.menu-open #tc{display:none}
  /* only the selected power shows, centred along the bottom edge under the thumb buttons (Q/E switch powers) */
  #powers{bottom:max(6px,env(safe-area-inset-bottom))!important;width:auto!important;z-index:100}
  #powers .pw:not(.on){display:none}
  #powers .pw.on{transform:none!important;font-size:17px!important;padding:3px 12px!important}
  /* phone HUD: no keyboard help, no desktop-only sandbox controls (hero and map are picked in the menu) */
  #help,#helpbtn,#top #char,#top #map,#top #regen,#wavebtn,#menubtn,#fps{display:none!important}
  #aoechip{right:auto!important;bottom:auto!important;left:max(12px,env(safe-area-inset-left));top:calc(max(8px,env(safe-area-inset-top)) + 96px);font-size:15px!important;padding:1px 8px 0!important}
  /* left thumb: a floating joystick (left/right walk, up jumps or climbs, down drops / slams) */
  #joy{position:relative;width:118px;height:118px;border-radius:50%;border:3px solid #14110f;background:rgba(255,201,60,.22);box-shadow:3px 3px 0 #14110f;pointer-events:auto;touch-action:none}
  #knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;border:3px solid #14110f;background:rgba(255,201,60,.9);box-shadow:2px 2px 0 #14110f}
  /* pause menu: sandbox tools for phones (hero and map pickers, wave, rebuild) */
  #msb{display:none;flex-direction:column;gap:8px;padding-top:8px;border-top:3px solid #14110f}
  body.sandbox #msb{display:flex}
  #msb label{font:700 12px sans-serif;letter-spacing:1px;display:flex;flex-direction:column;gap:4px}
  #msb select,#msb button{font:16px sans-serif;padding:8px;border:3px solid #14110f;background:#fff8e8;color:#14110f;width:100%}
  #msb .row{display:flex;gap:8px}
  /* landscape phones are short: the pause panel goes wide, buttons on the left, sandbox tools on the right */
  body.sandbox #pause .panel{width:min(640px,94vw)!important;display:grid!important;grid-template-columns:1fr 1fr;column-gap:16px;row-gap:8px;max-height:94vh;overflow:auto;transform:none!important;padding:14px!important}
  #pause .ptitle{grid-column:1/-1}
  #pause .cbtn{font-size:18px!important;padding:6px 12px!important}
  body.sandbox #msb{grid-column:2;grid-row:2/span 4;border-top:0;padding-top:0}
  body.menu-open #powers{display:none!important}
  #top{right:max(10px,env(safe-area-inset-right))!important;gap:6px!important}
  #top .sb{padding:6px 10px!important;font-size:12px!important}
  /* top-right: minimap in the corner, score and kills beside it, the Spawn button below the map */
  #scorebox{top:max(6px,env(safe-area-inset-top))!important;right:calc(max(10px,env(safe-area-inset-right)) + 262px)!important}
  #top{top:118px!important}
  /* spawn menu: centred between the HUD and the thumb controls, bigger touch targets, a close button */
  #spawn{left:50%!important;right:auto!important;transform:translateX(-50%)!important;top:max(54px,env(safe-area-inset-top))!important;bottom:150px!important;width:min(560px,70vw)!important;z-index:101!important}
  #spawn .sp-head span{display:none}
  #spawn .sp-grid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}
  #spawn .sp-item{min-height:58px;font-size:10px}
  #spclose{font:18px Bangers,Impact,sans-serif;letter-spacing:1px;border:3px solid #fff8e8;background:#e23b2e;color:#fff8e8;padding:2px 12px}
  /* while placing something: a big cancel button at the top */
  #spcancel{position:fixed;left:50%;top:max(54px,env(safe-area-inset-top));transform:translateX(-50%);z-index:101;display:none;font:20px Bangers,Impact,sans-serif;letter-spacing:2px;border:3px solid #14110f;background:#e23b2e;color:#fff8e8;padding:6px 18px;box-shadow:3px 3px 0 #14110f}
  body.placing #spcancel{display:block}
  body.menu-open #spcancel{display:none}
  #toolchip{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 112px)!important}
  #hud{left:max(10px,env(safe-area-inset-left))!important;top:max(8px,env(safe-area-inset-top))!important;transform:scale(.85);transform-origin:top left}
  #rot{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:#0d0a18;color:#ffc93c;font:28px Bangers,Impact,sans-serif;letter-spacing:2px;text-align:center}
  #rot span{font:14px sans-serif;color:#d8cfe8;letter-spacing:0}
  @media (orientation:portrait){#rot{display:flex}}
</style>`;
const body = `
<div id="rot">TURN YOUR PHONE SIDEWAYS<span>Heroes Sandbox plays in landscape</span></div>
<div id="tc">
  <div class="pad"><div id="joy" aria-label="Move"><div id="knob"></div></div></div>
  <div class="pad">
    <div class="pad small" style="flex-direction:column"><button data-k="KeyX" data-c="x" aria-label="Bigger area powers">A+</button><button data-k="KeyZ" data-c="z" aria-label="Smaller area powers">A&#8722;</button></div>
    <div class="pad small" style="flex-direction:column"><button data-k="KeyQ" data-c="q" aria-label="Previous power">Q</button><button data-k="KeyE" data-c="e" aria-label="Next power">E</button></div>
    <button data-k="ShiftLeft" data-c="Shift" aria-label="Boost">&#8679;</button>
    <div class="pad small" style="flex-direction:column;justify-content:flex-end"><button data-k="Escape" data-c="Escape" aria-label="Pause">II</button></div>
  </div>
</div>
<script>
window.HS_MINIMAP_Y=8; // minimap at the top edge on phones
window.HS_MOBILE=true; // shorter worlds (memory) - maps/index.js mapW()
(function(){
  // on-screen buttons press and release real keys, so the game needs no changes
  for(const b of document.querySelectorAll('#tc button')){
    let held=false;
    const send=t=>dispatchEvent(new KeyboardEvent(t,{code:b.dataset.k,key:b.dataset.c,bubbles:true}));
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(held)return;held=true;b.classList.add('on');try{b.setPointerCapture(e.pointerId);}catch(_){}send('keydown');});
    const up=e=>{if(!held)return;held=false;b.classList.remove('on');send('keyup');};
    b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
  }
  // joystick: thumb offset becomes held keys. Pushing up again after letting go re-taps W (double-tap flies)
  const key=(c,k,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:c,key:k,bubbles:true}));
  const joy=document.getElementById('joy'),knob=document.getElementById('knob'),J={KeyA:0,KeyD:0,KeyW:0,KeyS:0},K={KeyA:'a',KeyD:'d',KeyW:'w',KeyS:'s'};
  let jid=null;
  const setJ=(dx,dy)=>{const R=42,d=Math.hypot(dx,dy)||1,f=Math.min(1,R/d);knob.style.transform='translate('+dx*f+'px,'+dy*f+'px)';
    const nx=dx/R,ny=dy/R,want={KeyA:nx<-.35,KeyD:nx>.35,KeyW:ny<-.55,KeyS:ny>.6};
    for(const c in want)if(!!J[c]!==want[c]){J[c]=want[c]?1:0;key(c,K[c],want[c]);}};
  const centre=()=>{const r=joy.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];};
  joy.addEventListener('pointerdown',e=>{e.preventDefault();jid=e.pointerId;try{joy.setPointerCapture(jid);}catch(_){}const [cx,cy]=centre();setJ(e.clientX-cx,e.clientY-cy);});
  joy.addEventListener('pointermove',e=>{if(e.pointerId!==jid)return;const [cx,cy]=centre();setJ(e.clientX-cx,e.clientY-cy);});
  const rel=e=>{if(e.pointerId!==jid)return;jid=null;setJ(0,0);};
  // holding up keeps hopping: each time the hero is back on the ground (and not flying), W is pressed again.
  // grounded-only, so it never trips the in-air double-tap that turns on flight
  setInterval(()=>{const G=window.GAME,p=G&&G.pl_;if(J.KeyW&&p&&!p.fly&&p.ground&&G.GS==='play'){key('KeyW','w',false);key('KeyW','w',true);}},50);
  joy.addEventListener('pointerup',rel);joy.addEventListener('pointercancel',rel);joy.addEventListener('lostpointercapture',rel);
  // pause menu gains a sandbox section: the game's own hero and map pickers move in here
  const panel=document.querySelector('#pause .panel');
  if(panel){const box=document.createElement('div');box.id='msb';
    box.innerHTML='<label>HERO<span id="msbH"></span></label><label>MAP<span id="msbM"></span></label><div class="row"><button id="msbW">SPAWN WAVE</button><button id="msbR">NEW MAP</button></div>';
    panel.appendChild(box);
    const ch=document.getElementById('char'),mp=document.getElementById('map');
    if(ch)document.getElementById('msbH').appendChild(ch);if(mp)document.getElementById('msbM').appendChild(mp);
    document.getElementById('msbW').onclick=()=>{document.getElementById('resume').click();document.getElementById('wavebtn').click();};
    document.getElementById('msbR').onclick=()=>{document.getElementById('regen').click();};}
  // spawn menu on phones: close button in its header; picking something to place closes the menu so the
  // next tap lands in the world; a CANCEL button stays up while a tool is armed
  const cancel=document.createElement('button');cancel.id='spcancel';cancel.textContent='✕ CANCEL PLACING';document.body.appendChild(cancel);
  const ui=()=>window.GAME&&GAME.spawnUI&&GAME.spawnUI();
  cancel.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();GAME.SPAWN.tool=null;const u=ui();u&&u.select(null);});
  const hookSpawn=()=>{const sp=document.getElementById('spawn');if(!sp||sp.dataset.m)return;sp.dataset.m=1;
    const head=sp.querySelector('.sp-head'),x=document.createElement('button');x.id='spclose';x.textContent='CLOSE';head.appendChild(x);
    x.onclick=()=>{const u=ui();u&&u.close();};
    for(const ev of ['pointerdown','touchstart'])sp.addEventListener(ev,e=>e.stopPropagation());
    sp.addEventListener('click',e=>{if(e.target.closest('.sp-item'))setTimeout(()=>{if(GAME.SPAWN.tool){const u=ui();u&&u.close();}},0);});};
  setInterval(()=>{hookSpawn();document.body.classList.toggle('placing',!!(window.GAME&&GAME.SPAWN&&GAME.SPAWN.tool));},150);
  // hide the buttons while a menu is up
  const ov=['menu','pause','over','settings'].map(id=>document.getElementById(id)).filter(Boolean);
  const sync=()=>document.body.classList.toggle('menu-open',ov.some(o=>!o.classList.contains('hidden')));
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});sync();
  // iOS: no long-press callout, no double-tap zoom, no rubber-band scroll
  document.addEventListener('contextmenu',e=>e.preventDefault());
  let lastT=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-lastT<300&&!e.target.closest('button'))e.preventDefault();lastT=n;},{passive:false});
  document.addEventListener('touchmove',e=>{if(!e.target.closest('#mright,.ov'))e.preventDefault();},{passive:false});
})();
</script>`;

let html = readFileSync('dist/index.html', 'utf8');
html = html.replace(/<meta name="viewport"[^>]*>/, '');
html = html.replace('</head>', head + '\n</head>').replace('</body>', body + '\n</body>');
writeFileSync('dist/mobile.html', html);
console.log('dist/mobile.html', (html.length / 1024).toFixed(0) + ' kB');
