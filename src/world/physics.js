// Physics tuning: fixed tick rate (TICK) and the PHYS table of per-tick constants.
import './materials.js'; // evaluation order: runs after world/materials.js

// ================= physics tuning =================
// The sim runs on a fixed 60 Hz tick (TICK); loop() advances it by real elapsed time, so behaviour
// does not depend on display frame rate. All values below are per tick at that rate.
export const TICK=1000/60;
export const PHYS={
  maxSteps:4,             // ticks loop() may run per rendered frame to catch up (real time down to 15 fps; slower than that the game slows down instead of spiralling)
  body:{                  // rigid falling chunks (collapsed structure, thrown boulders, explosion chunks)
    grav:.3, drag:.996, spinDrag:.997, maxV:12, maxSpin:.12,
    landBounce:.08,       // share of downward speed a big chunk keeps (upward) when it touches down without landing
    wallBounce:.25,       // share of sideways speed kept when it hits a wall
    spinBounce:.3,        // share of spin kept when rotating into something
    restTicks:10,         // ticks a chunk must sit still on support before it freezes into the grid
    maxAge:1200,         // a chunk that is on support but never quite settles freezes after this many ticks
    buoy:.45,
    grace:15,             // ticks after breaking free during which a chunk cannot shatter/smash (it is still touching what it broke off from)
    landV:9,              // impact speed (cells/tick) above which a chunk hitting the ground stops dead and may fracture; below it, it settles
    wallV:9,              // same for slamming sideways into a wall
    spinV:9,              // same for spinning into something (spin x radius)
    crushV:6,             // a heavy chunk faster than this smashes through what it hits
    fractureV:9,          // landing impact needed to split a big chunk into smaller ones
    crumbleV:5},          // landing impact below which no cells crumble off a chunk            // liquid lift, scaled by liquid density / chunk density: chunks denser than buoy/grav (1.5x) the liquid sink and settle, lighter ones float
  chunk:{                 // small solid chunks blown out by explosions
    bounce:.35,           // share of impact speed returned on each bounce
    friction:.25,         // share of sideways speed lost per ground contact
    minBounceV:1.2,       // below this downward speed a chunk stops bouncing and slides to rest
    roll:.04,             // how strongly ground speed turns into spin (tumbling)
    max:90,               // live explosion chunks allowed at once; past it blasts make dust only
    minR:4,               // explosions smaller than this radius make no chunks (dust only)
    perR:.9,              // chunks per unit of blast radius above minR
    perBoom:16,           // most chunks one explosion can make
    size:[4,8],           // chunk blob radius range, cells
    speed:.3},            // launch speed per unit of blast radius
  dust:{                  // light dust motes: no grid collision, cheap
    grav:.035, drag:.94,
    life:[25,55],         // lifetime range, ticks
    fade:20,              // final ticks spent fading out
    perR2:.8,             // motes per radius^2 of an explosion
    max:900,              // most motes one explosion can make
    budget:.7},           // no new dust once the particle pool is this full (leaves room for debris grains)
  part:{grav:.15, drag:.99, dragHeavy:.9}, // debris grains and sparks
  flake:{grav:.012, drag:.985, sway:.006},  // snow and ash: settles to ~0.8 cells/tick with a little side-to-side sway
  mix:{                   // how destruction splits between intact chunks, loose rubble and dust
    rubble:.03,           // share of rubble (flying grains and cells broken in place) that stays as loose sand; the rest vanishes into dust
    rimRubble:.06,        // share of cracked crater-rim cells that stay as loose rubble (rest blow away)
    landCrumble:.12,       // scales how much of a landing chunk crumbles to rubble (1 = old behaviour)
    ringChunks:.5,        // big chunks broken off the crater wall per unit of blast radius
    grey:.6},             // how far rubble colour is pulled toward grey concrete, so walls do not turn into neon sand
  powder:{maxV:5}, liquid:{maxV:4},        // fastest fall, cells per tick
};
