// Shared mutable game state. Every top-level `let` that more than one module reads or writes lives here
// (ES module imports are read-only bindings, so cross-module reassignment needs a shared object).
// Fields marked "set in" get their first value where they used to be declared.
export const ST={
  // world/grid.js
  act:null, // set in world/grid.js
  nxt:null, // set in world/grid.js
  clock:1,
  frame:0,
  genMode:false,
  dx0:null, // set in world/grid.js
  dy0:null, // set in world/grid.js
  dx1:-1,
  dy1:-1,
  CAPT:null, // when set, setc records every solid it writes (spawn-menu structures register themselves as intact pieces)
  // world/support.js
  vgen:0,
  bgen:0,
  lastBoom:{x:0,y:0,f:-999,r:0},
  // render/look.js
  farBase:null, // farKeep: landmark pixels (the X-Mansion) that skip most of the background fade
  farSky:null,
  farKeep:null,
  // maps/gen.js
  far:null,
  FW:0,
  PIN2:null,
  // world/particles.js
  np:0,
  // render/fx.js
  shake:0,
  hitstop:0,
  impactF:0,
  impactX:0,
  impactY:0,
  hurtV:0,
  // sfx.js
  ambFire:0,
  ambLava:0,
  // heroes/powers.js
  cur:0,
  cd:0,
  cdMax:1,
  vortex:null,
  held:null,
  heldE:null,
  storm:null,
  decoy:null,
  stasis:null,
  slowT:0,
  heatZ:null,
  caPulse:0,
  AI_T:null,
  AI_TE:null,
  AI_ALLY:null,
  shieldOn:false,
  shieldC:[[170,255,190],[80,220,120],[60,255,100]],
  senseT:0,
  // player.js
  SPR:null, // set in player.js
  SPC:null, // set in player.js
  SW:9,
  SH:16,
  PW:7,
  PH:16,
  SPAWNX:50,
  CH:null, // current hero, set by setChar()
  camX:0,
  camY:0,
  // enemies/core.js
  wave:0,
  kills:0,
  score:0,
  // render/canvas.js
  scale:3,
  ox:0,
  oy:0,
  CX:0,
  CY:0,
  GL:false,
  // loop.js
  fps:60,
  simMs:0,
  frameMs:0,
  // modes/core.js
  MODE:null,
  MS:null,
  GS:'menu',
  RUN:null,
  // ui/settings.js
  setFrom:'menu',
  // ui/spawn.js
  spawnUI:null,
  slowTk:0,
};
