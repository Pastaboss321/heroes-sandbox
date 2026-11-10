# Heroes Sandbox overhaul changelog

Branch `art-overhaul-pilot`, one commit per stage. Every decision made without asking is recorded here, with the
numbers. Newest stage last.

## Stage 0: audit

- Start point: `6ef4b7e` (the revert of "Kit overhaul: no mechanic on more than two heroes").
- What the reverted commit did: it tagged every power with a "mechanic" and replaced or retired powers until no
  tag sat on more than two heroes (412 powers kept, about 110 retired or swapped for new ones in `kits4a/4b.js`).
  It was rejected as a change for the worse. Lesson applied to this overhaul: **no existing power is retired,
  renamed or replaced, and no quota is imposed on kits.** Kits keep their names, order and behaviour.
- Baseline measured before touching anything: 36 heroes, 521 powers. A hash of every hero's power list (names,
  order, which one is the ultimate, which are held grabs) was recorded so later stages can prove nothing moved.
- The Obsidian vault named in `CLAUDE.md` was not used for this overhaul; the code and the brief are the source.

## Stage 1: one ability system

### What changed

- **One definition per power.** The patch layers are gone. `kits2a.js`, `kits2b.js`, `kits3a.js`, `kits3b.js`
  (which replaced and appended powers at load time through `applyKits` / `applyKits3`) were folded into each
  hero's own file by a codemod (`scripts/consolidate-kits.mjs`, kept for the record). Every hero file now holds
  its whole kit as one array, in bar order, the ultimate last. Storm's in-file `splice` rework was flattened the
  same way.
- **`src/heroes/kit.js` is the ability system.** `finalizeKits()` runs once: it checks each kit (unique names,
  exactly one ultimate, ultimate last), stamps each power with its hero, HUD kind, signature effect and balance
  multipliers, and builds a name index. `cast()` and `castUlt()` moved here from `heroes/index.js`; it is the only
  path from a key press to a power.
- **Ultimates are marked on the power** (`ult:true`). The `ULTS` name table and `markUlt()` are deleted.
- **Signature effects no longer wrap power functions.** `sigfx.js` used to replace `pw.fn` with a decorator;
  now `kit.js` looks the effect up once (`sigOf`) and plays it after a cast that fired.
- **`src/heroes/kitlib.js`** holds the 13 helpers more than one hero uses (`tagged`, `nearestN`, `echo`, `ghost`,
  `atCursor`, `noTarget`, `segD`, `boxE`, `bodyImpact`, `chunkAt`, `drawPix`, `fig8`, `heroOf`). The 19 helpers
  only one hero used moved into that hero's file.
- **`src/heroes/balance.js`** holds every tuning number: `BALANCE[hero][power] = {cost, cd}` multipliers applied
  by the cast pipeline, and `STATS[hero]` overrides for base stats.
- Powers may now declare `cost` and `cd` as data instead of calling `use()` and setting `ST.cd` themselves
  (the new heroes use this); old powers are untouched.

### Proof nothing moved

After the codemod the per-hero hash of power names, order, ultimate and grab flags is identical to the baseline for
all 36 heroes (521 powers). Every power of every hero was then cast in a sandbox run with no exception thrown.

### Dead code removed (18 power definitions that never reached the bar)

These were defined in a hero file and then overwritten at load by a rework with a different power. The reworked
power is what players already had; only the unreachable original is deleted.

| Hero | Unreachable definition removed | What the bar has (unchanged) |
|---|---|---|
| Doom | Doom Lightning | Octessence Sigil |
| Thor | Lightning Arc | Lightning Dome |
| Iron Man | Energy Shield | Hulkbuster |
| Cyclops | Concussive Burst, Visor Overload | Bank Shot, Optic Lift |
| Jean | Mind Shield | Psionic Overload |
| Magneto | Iron Rain | Iron Maelstrom |
| Storm | Lightning Lash, Thunderbolt | Chain Lightning, Ball Lightning |
| Torch | Nova Flare, Fire Rain | Flame Clone, Firebird |
| Captain America | Avengers Assemble (first version) | Avengers Assemble (team version) |
| Captain Marvel | Photon Nova | Binary Chain |
| Silver Surfer | Cosmic Shield, Herald's Call, Nova Burst | Power Cosmic Brand, Hand of Galactus, Surface Grind |
| Ghost Rider | Brimstone Rain | Chains of Hell |
| Deadpool | Regenerate | Pouch Roulette |

### Behaviour changes (all small, all listed)

1. **HUD power kinds are now right for showpiece powers.** The HUD decides tap / hold / move by reading the
   power's code. For the 137 powers with a signature effect it was reading the decorator instead, so they all
   showed as "hold". They now show their real kind (390 tap, 44 hold, 51 move, 36 ult).
2. **Doctor Strange's echo trait** replays "tap" powers. Because of (1) it skipped his showpiece taps; it now
   echoes them too. This is the trait working as written.
3. **Combos and status effects are unchanged**: burn, wet, shock, chill, mark, stun; SHATTER (+150%),
   ELECTROCUTED (+25, chain to 5 wet enemies within 70px), THERMAL SHOCK (+30), WILDFIRE (+18 and a blast);
   mark +50%; rally +30%; ultimate gain damage/22 (damage/40 on titans), +6 per combo.

### Rebalance

Method: an automated harness (`scripts/balance-harness.js`) cast every power once at two 10M-hp dummies (14px and
60px away) on a fresh map and recorded energy spent, cooldown and damage over 220 frames (hold powers: held 60
frames). Raw numbers: `docs/overhaul/balance-measured.json`; the full per-power table with the multiplier each
power got: `docs/overhaul/balance-table.md`.

- Roster medians: **2.67 damage per energy**, **1.31 damage per cooldown frame**; hold powers 3.33 damage per energy.
- Rule (in `scripts/balance-report.mjs`): a damaging power more than 3x off the median is pulled toward it.
  Weak powers get the full nudge: cost x0.8 (x0.65 beyond 5x), cooldown x0.85 (x0.7). Strong powers get half:
  cost x1.12 (x1.25), cooldown x1.1 (x1.2). **A hero's basic attack (first on the bar) is never made dearer.**
  Utility powers that deal no damage are not touched. Ultimates are not touched.
- Result: **95 of 521 powers adjusted** (50 cheaper or faster, 45 dearer or slower). No power changed by more
  than 35% down or 25% up. The list is `src/heroes/balance.js`.
- Hero stats: **Doom armor 1.0 -> 0.85.** He took full damage in plate armour and had the lowest effective health
  on the roster (300). All other base stats are unchanged.
- Known limit of the method: one scenario (two stationary dummies, flat street). Powers that need a crowd, a
  wall, water or a flying target are under-measured, which is why nudges are capped and one-sided.

### Cut

- Nothing playable was cut. Only the 18 unreachable definitions above and the patch-layer plumbing.

## Stage 2: sprites and animation

### What changed

- **Every hero redrawn by hand**, larger: 16x26 for standard bodies (was 13x22), 22x30 for the five big bodies
  (Hulk, Thing, Juggernaut, Venom, Thanos; was 17x26 / 15x24). Art for the eight new heroes is drawn in the same
  pass (they join the roster in stage 5). Contact sheet of all 44: `docs/overhaul/hero-art.png`.
- **Art lives in `src/art/<hero>.js`**, one file per hero: palette, idle frame, signature pose, optional back
  layer, leg colours and rig numbers. `src/art/kit.js` documents the format and validates every grid on load
  (row widths, palette chars). The old `SPR_*` / `PAL_*` / `ANIM.*` blocks are deleted from the hero files (72
  constants) and the roster takes its look from the art in one loop in `heroes/index.js`.
- **Hand-drawn frames.** Each hero has: idle, a signature pose, and the stance frames run (6-frame cycle), jump,
  fall, crouch / land and flight. The stance legs are drawn once per body type (standard and big) and coloured per
  hero from the `legs` entry (thigh, boot, hip; the far leg is dimmed 26%). The upper body and signature pose are
  unique to each hero.
- **The procedural rig keeps the secondary motion** (`render/rig.js`): posed arms that track the cursor, the
  breathing bob (1px for 16 of every 110 idle frames), the step bob, blinks, and a new **back layer** for capes,
  coats, Jean's and Sue's hair and Nightcrawler's tail. The back layer ripples on its own and trails when the
  hero runs, flies or falls. 14 heroes have one. The old per-pixel leg swing code is gone.
- **Signature pose trigger**: the ultimate holds the pose for 30 frames; a showpiece power (one with a signature
  effect, tap, cooldown 40+) holds it for 16.
- **Lighting and outlines** (`render/sprites.js`, shared with the tools through `art/kit.js`): after the sprite is
  flipped and rotated, pixels open to the top or left of the screen get a rim light (+16% / +10% toward white),
  pixels open to the bottom or right are shaded x0.8, and the outline is a dark tint of the colour it wraps
  instead of flat black. The light therefore stays put when the hero turns around.
- **Bosses reuse hero art**: boss Juggernaut, Ultron Prime and Magneto, and the Thanos titan, now draw the new
  sprites (scales changed 1.6 -> 1.25, 1.44 -> 1.2, 1.28 -> 1.08, titan 1.35 -> 1.17 so their size on screen is
  the same as before).

### Numbers

| | before | after |
|---|---|---|
| Standard sprite | 13x22 | 16x26 |
| Big sprite | 17x26 (Juggernaut 15x24) | 22x30 |
| Standard hit box (w x h) | 7x19 | 8x22 |
| Big hit box | 9x23 (Juggernaut 9x22) | 10x27 (Juggernaut 10x26) |
| Wolverine hit box | 7x17 | 8x20 |
| Sprite padding for posed limbs | 8 | 10 |

The hit box grew 16%, the same as the art, so heroes do not look larger than they collide.

### Decisions

- Shared leg frames per body type rather than six unique leg frames per hero: 44 heroes x 10 stance frames by hand
  was not going to be consistent. Every hero still has unique idle legs, upper body and signature pose.
- Dark eyes (one pixel) for unmasked human faces instead of the old glowing eye pixel; glow is kept for heroes
  whose eyes really glow (Doom, Storm, Iceman, Hela, Kurt, Panther, Kang, robots).
- Capes are a darker shade than the suit where they shared a colour (Doom, Magneto), and Storm's is silver-white,
  so the body reads against the cape.

### Tools added

- `scripts/artsheet.mjs`: renders any hero's frames to a PNG without running the game.
- `src/dev.js` (dev server only): `DEV.smoke()` casts every power, `DEV.strip()` photographs every stance.

### Known issues

- The Thing's rock texture is lost on his legs while he runs (the shared big-body leg frames are flat colour).
- Posed arms are still procedural limbs; on heroes with detailed sleeves (Thor's bracers) they are plain.

## Stage 3: VFX

The game already had a themed effect system (`render/theme.js`: 30 shape styles shared between the heroes; 137
powers with a bespoke effect in `heroes/sigfx.js`). This stage does not replace it. It makes each hero's language
unique, gives every power a signature, and makes hits bigger and easier to read.

### What changed

- **A unique language per hero.** `THEME[hero]` gains `hit` (how the hero's blows land) and `trail` (what the
  hero sheds at speed). Style + impact + trail + palette is now different for every hero. Heroes that shared a
  style are told apart by the new fields: Doom (sigil hits, glyph trail) vs Strange (sigil hits, spark trail);
  Thor (forked arcs, crackling trail) vs Storm (arcs, wind wisps); Hulk (dust) vs Thing and Juggernaut (rubble);
  Iron Man (glints, boot jets) vs Ultron; Torch vs Ghost Rider; Panther (slashes, kinetic motes) vs Gambit (cards).
- **Impact styles** (`vfxHit` in `render/vfxcore.js`), 20 of them: slash, arc, shard, sigil, hex, ember, dust (and a
  ground crack on heavy hits), ring, splat, glint, field, beamlet, starry, web, cresc, card, smoke, thorn, mote,
  plus sand and water for the new heroes.
- **Trails** (`vfxTrail`, called once a tick): 21 kinds. They only appear at speed: flying faster than 2.3,
  running faster than 2.5, scripted dashes, and boosts (boosts double the rate).
- **Every power signs its cast.** A power with no bespoke effect now gets the hero's default signature
  (`vfxSign`): the hero's emblem turns once around the body and the hero's own particles lift off it. It fires for
  powers with a cooldown of 30 frames or more, sized by the cooldown, so basic attacks stay clean.
- **Damage numbers** (`fxDmg` in `render/fx.js`, drawn in `render/comic.js`): hits on one enemy within a third of
  a second add into one number over its head, tinted by damage type (fire orange, shock yellow, ice blue) or the
  hero's colour. New setting: DAMAGE NUMBERS (on by default).
- **Comic words take the hero's colour** when the power did not ask for one (they were all the same yellow).
- **Bigger**: hit flares x1.3 with more sparks (`FXK.hit`), cast flare x1.3 (`FXK.cast`), comic words 16 -> 18 px
  per unit, explosion words up to 1.8 (was 1.6), starbursts r x3 (was x2.6), ring bands 1.4-5.5 px (was 1-4.5),
  flashes x1.15.

### Performance

Nothing new allocates per frame; trails emit one particle every other tick (two on a boost) and everything goes
through the existing particle budget (1400 soft cap, 700 on phones). Measured in a 25-enemy fight with the Torch
casting: tick 5.4 ms, of which effects 0.03 ms.

### Decisions

- Kept the existing style system and the 137 bespoke effects as they were; rewriting them risked the same
  "changed for the worse" outcome as the reverted kit overhaul.
- Damage numbers are aggregated, not per hit, so beams and rapid fire show one growing number instead of a stream.

## Stage 4: maps

All 16 maps in `src/maps/` are covered (City, New York, NYC 2099, Forest, X-Mansion, Earth-828 NYC, Incursion NYC,
Savage Land, Weapon X, Wakanda, Asgard, Sakaar, Knowhere, Titan, The Moon, Dark Dimension). The generators
themselves (184 KB of hand-tuned layout code) are kept; the overhaul is three new layers on top of them.

### 1. Set pieces: terrain you can use (`src/maps/setpieces.js`)

17 physical props built from sim materials, so each does something when it breaks. Placed at generation time on
open, level ground the scan finds; never within 90 px of the spawn or 14 px of each other.

| Piece | What it does in the sim |
|---|---|
| crane | steel mast and jib with a concrete block on a cable: cut it and the load drops |
| fuel | three oil drums and a propane tank: chain explosion |
| sandbin | sand behind wooden boards: break a board and it pours out |
| overpass | a second street on concrete piers |
| billboard | a lit neon sign on steel legs |
| tower | timber watchtower with three decks |
| tank | raised steel tank of water: floods the street when breached |
| silo | acid silo: the leak eats what it reaches |
| pond, icelake | water in a hollow (the lake under a crust of ice) |
| arch, ruins | stone to run under or bring down |
| vent | a pool of lava in an obsidian cone |
| drift | deep loose snow |
| bunker | half-buried concrete room with a blast slit |
| crystal | glowing shards, coloured per map |
| logs | stacked timber |

Each map has its own mix (`PLAN`), for example City: crane, fuel, sandbin, overpass, billboard; Weapon X: icelake,
drift, bunker, fuel; Dark Dimension: vent, crystal, obsidian arch. In the city maps, small pieces may also stand
on flat roofs; in the wild maps, trees on the footprint are cleared and the ground levelled to its lowest point;
in Knowhere pieces go on the cave floor where there is 50 px of headroom.

Measured placements per generation (they vary with the seed): City 7-8, New York 6, NYC 2099 9, Forest 7,
X-Mansion 5, Savage Land 9, Weapon X 10, Earth-828 6, Incursion 4, Wakanda 8, Asgard 4, Sakaar 2, Knowhere 1,
Titan 7, Moon 6, Dark Dimension 0-2.

### 2. Map events: one thing that happens to each map (`src/maps/events.js`)

A timed event per map, announced with a banner, made of sim materials so it leaves something behind. First one
25-40 s in, then every 45-75 s. New setting: MAP EVENTS (on by default). `GAME.mapEvent()` triggers one.

| Map | Event | Length | What it leaves |
|---|---|---|---|
| City | WATER MAIN BREAK | 5 s | a geyser from the street, then a pond |
| New York | SUMMER STORM | 10 s | rain that pools and douses fire; lightning on rooftops |
| NYC 2099 | GRID OVERLOAD | 6 s | neon signs arc; 7 shock damage to enemies near an arc |
| Forest | DRY LIGHTNING | 16 s | a tree set alight, then rain to put it out |
| X-Mansion | SPRINKLERS | 8 s | four sprinklers soak the lawn |
| Savage Land | ERUPTION | 4 s | lava bombs that cool to rock |
| Weapon X | WHITEOUT | 11 s | drifting snow; chills enemies |
| Earth-828 NYC | ENGINE FAILURE | 4 s | a flying car comes down |
| Incursion NYC | UNIVERSES COLLIDE | 5 s | red lightning down the street |
| Wakanda | VIBRANIUM RESONANCE | 4 s | pulses that lift rubble and stun enemies within 170 px |
| Asgard | BIFROST SURGE | 2.5 s | a rainbow column that carries loose things up |
| Sakaar | JUNK FALL | 4 s | scrap from the wormhole |
| Knowhere | MARROW LEAK | 4 s | acid dripping from the roof |
| Titan | METEOR SHOWER | 6 s | craters and fire |
| Moon | MOONQUAKE | 3 s | regolith thrown up in low gravity |
| Dark Dimension | HELLFIRE GEYSER | 3 s | lava and green fire from the nearest lava |

Events never charge the ultimate and use the neutral effect theme.

### 3. A colour grade per map (`look` in `MAPDEFS`, applied in `render/look.js`)

Light multipliers [r, g, b] on top of the time of day, so no two maps share a cast: City 1/1/1.02, New York
1.05/1.01/.95 (warm), NYC 2099 .94/1/1.1 (cold neon), Forest .98/1.06/.92, X-Mansion 1.07/1.01/.9 (autumn),
Earth-828 1.06/1.02/1, Incursion 1.1/.92/.94, Savage Land .96/1.08/.94, Weapon X .92/1/1.12, Wakanda
1.08/1.02/.9, Asgard 1.1/1.04/.9, Sakaar 1.1/1/.86, Knowhere .9/1.06/1.02, Titan 1.12/.96/.86, Moon .94/.98/1.1,
Dark Dimension 1.06/.9/1.12.

### Decisions and known issues

- The base layouts were not regenerated from scratch. They are long, hand-tuned and already distinct per map;
  rewriting sixteen of them blind was more likely to lose something than to gain it. The new terrain is additive.
- Overpasses rarely find 126 px of open street and usually do not appear. Sakaar, Knowhere and the Dark
  Dimension have little level ground and get few pieces.
- Events in sandbox can damage things the player built (lightning, meteors); the MAP EVENTS setting is the
  off switch.

## Stage 5: eight new heroes

Roster 36 -> 44. Each new hero has its own file in `src/heroes/`, art in `src/art/`, 15 powers (14 plus an
ultimate), a trait with an awakened state, a visual theme, a menu colour and a movement tag. They are written
with `src/heroes/newkit.js` (projectiles, melee arcs, dashes, zones, terrain painting) and use the declarative
`cost` / `cd` fields of the ability system, so a power reads as what it does.

No existing hero's kit was touched. The new kits were designed against each other and against the old roster so
they are not recolours: each one is built on a part of the sim nobody else owns.

| Hero | HP | Armor | Run | Jump | Flies | Identity | Trait |
|---|---|---|---|---|---|---|---|
| Daredevil | 340 | .70 | 2.5 | 5.9 | no (wall-clings) | marks targets by sound, single exact blows | Radar Sense: +60% on marked or stunned enemies; auto-marks every 4 s |
| Hawkeye | 320 | .80 | 2.2 | 5.4 | no | rotating quiver of trick arrows | Trick Quiver: every third arrow is free and +40% |
| Black Widow | 320 | .75 | 2.5 | 5.8 | no | cloak, smoke, gadgets, one killing blow | Red Room: a hit from the cloak is tripled |
| Iron Fist | 380 | .65 | 2.4 | 5.8 | no | builds chi, spends it all on one punch | Chi: 0-100, up to +30% on other hits |
| Namor | 440 | .60 | 2.1 | 5.4 | yes | pours real water; strong against anything wet | Child of the Sea: +50% on wet enemies, heals in water |
| Sandman | 480 | .60 | 2.0 | 4.9 | no | moves real sand; reshapes terrain | Shifting Sands: sheds a third of damage, heals on sand |
| Green Goblin | 360 | .70 | 2.1 | 5.0 | yes (glider) | lobbed bombs, gas and oil, then the spark | Goblin Formula: +8% per kill, five stacks |
| Mysterio | 300 | .80 | 2.0 | 5.0 | yes | copies, decoys, terrain that lies | Smoke and Mirrors: 30% of hits strike an illusion |

### Kits

- **Daredevil**: Billy Club (bounces three times), Radar Sense, Grapple Line, Wall Run, Flip Kick, Pressure Point
  (45, or 110 on a marked target), Baton Sweep, Ricochet Throw, Echo Clap (shatters glass within 70 px), Dive
  Strike, Counter Stance, Hell's Kitchen Shadows, Devil's Ladder, World on Fire (hold), ult Man Without Fear.
- **Hawkeye**: Loose Arrow (fires the nocked trick and turns the quiver: broadhead, explosive, net, shock, freeze,
  acid), Explosive / Net / Acid / Freeze / Shock Arrow, Grapple Arrow, Boomerang Arrow, Triple Shot, Rain of
  Arrows, Putty Arrow (sets into a 28 px bar: a step or a bridge), Flare Arrow, Pym Arrow (drills through
  buildings), Tumble Shot, ult Never Miss (18 homing trick arrows).
- **Black Widow**: Widow's Bite, Dual Pistols (hold), Cloak, Smoke Bomb (real smoke gas), Grapple Hook, Baton
  Flurry, Thigh Takedown, Garrote (28, or 95 from the cloak), Tripwire Mine, Flashbang, Taser Disc, Hologram,
  Slide, Hack (turns a machine for 10 s), ult Widow's Sting.
- **Iron Fist**: Jab Combo (+8 chi a hit), Focus Chi (hold), THE IRON FIST (30 + 1.7 per chi, a tunnel as long
  as the bar was full), Rising Dragon, Dragon Kick, Chi Wave (30 chi), Palm Strike, Chi Heal (50 chi for 60 hp),
  Hundred Fists (hold), Stone Breaker (turns the ground to rubble), Deflect, Mark of Shou-Lao, Meditative Step
  (20 chi), Dragon Spirit (40 chi), ult Heart of Shou-Lao (chi locked full for 8 s).
- **Namor**: Trident Thrust, Water Jet (hold; real water), Tidal Wave, Summon Spring, Whirlpool, Imperius Dive
  (bigger into water), Hydro Blade (cuts 90 px of terrain), Drown, Drink the Sea (heals from nearby water),
  Deluge, Giganto's Reach, Pressure Crush (48 to everything wet), Bubble Shield, Riptide, ult IMPERIUS REX! (a
  tsunami: 120 and a flooded street).
- **Sandman**: Sand Fist, Sand Blast (hold; real sand), Burrow, Reform, Sandstorm, Sand Wall, Quicksand (turns
  ground to sand), Harden (bakes sand to stone), Sand Hammer, Dust Devil, Hourglass, Sand Clone, Engulf, Erode
  (hold; grinds terrain into sand), ult Dune Sea.
- **Green Goblin**: Pumpkin Bomb, Razor Bats, Glider Ram, Gas Pumpkin (real flammable gas), Incendiary Pumpkin
  (burning oil), Pumpkin Mine, Glider Missiles, Finger Sparks (hold), Carpet Bomb, Pumpkin Rain, Remote Glider,
  Jack O'Lantern (a fire turret), Oil Slick, Cackle, ult Goblin Frenzy.
- **Mysterio**: Mist Bolt, Decoy, Mirror Images, Smoke Screen, Swap, False Floor (8 s of glass), Vanishing Act
  (15 px of terrain gone for 6 s, then back), Nightmare (turns an enemy), Illusory Monster, Holo-Drones, Fishbowl
  Flash, Gravity Trick, Pyrotechnics, Curtain Call, ult Grand Illusion.

### Engine changes the new heroes needed

- `climb: true` on a roster entry gives Wolverine's wall cling (Daredevil). Only Wolverine's claws gouge the wall.
- `ambush: true` keeps the cloak through a cast until a hit lands (Black Widow); everyone else still decloaks.
- Decoys can be holograms (`kind: 'holo'`, own sprite and palette); Iceman's ice decoy is unchanged.
- `board: true` plus `boardC` draws the Goblin's glider with the Surfer's board code.
- The HUD's tap / hold / move detection no longer depends on how the code is spaced.

### Balance of the new kits

Measured with the same harness as stage 1 (`docs/overhaul/balance-measured-new-heroes.json`). Against the
roster median of 2.67 damage per energy the new basic attacks sit at 2.5 to 5.0 and the heavy powers at 1.7 to
5.1, inside the 3x band, so none of them needed an entry in `balance.js`. One fix: Giganto's Reach did 185 for
26 energy (7.1); its slam went 26 -> 18 per hit. Flyers (Namor, Goblin, Mysterio) are under-measured: the
harness leaves them hovering above the dummies.

### Known issues

- The new heroes have themes and default signatures but no bespoke `sigfx.js` entries yet.
- Hawkeye's bow is only drawn in his signature pose; while aiming he uses the rig's bare arm.

## Stage 6: modes and enemies

### What changed

- **Every mode runs with the new roster.** All ten modes were started with a new hero and ticked through combat
  (Sandbox, Robots 2099, Doomsday, Sentinels, Demolition, Boss Rush, Savage Land Swarm, Titan Duel, Gauntlet,
  Multiverse): no errors. Nothing in the mode code depended on the roster size.
- **New enemies** (`src/enemies/sinister.js`):

| Enemy | HP | What it does |
|---|---|---|
| Hand ninja | 40 | runs at 1.9, leaps from 70 px, 9 melee; below half health it vanishes in smoke and reappears behind you |
| Pumpkin drone | 26 | hovers overhead and lobs bombs (8 damage, blast 5) |
| Illusion | 6 | a copy of Mysterio: one hit kills it, its bolts do 4; fades after 15 s |
| Training dummy | never dies | stands still so you can read your damage numbers (spawn menu) |

- **Three new bosses**, wearing the heroes' own art and using the same sim materials:

| Boss | HP | Attacks |
|---|---|---|
| Green Goblin | 2000 | pumpkin volley (3, or 5 enraged: 12 damage, blast 7), razor bats (6 x 6), a cloud of real gas that he ignites 70 ticks later, dive ram (22), up to 2-3 pumpkin drones |
| Mysterio | 1700 | fans of mist bolts (6-9 x 7), 3-5 illusions, a bank of real smoke on the hero, teleports when you close to 40 px |
| Sandman | 2800 | sand hammer (24 and a crater), sandblast (real sand piles up), burrows and erupts under you (26); every hit knocks real sand off him |

  Bosses enrage below 40% health.
- **New mode: Sinister Night** (`src/modes/sinister.js`): nine waves over New York with ninjas, Hydra and
  drones; the Goblin on wave 3, Mysterio on 6, Sandman on 9. Three lives, 40% heal between waves, +2500 per
  villain, +5000 for the win.
- **Boss Rush is seven bosses** (was four): Juggernaut, Green Goblin, Ultron Prime, Mysterio, Magneto, Sandman,
  Master Mold. Same three lives and 50% heal between fights.
- **Enemies now react to the materials the new heroes bring** (in the status tick, `heroes/abilities.js`):
  an enemy waist-deep in sand, snow or rubble wades (speed x0.6); an enemy in smoke or gas cannot fire (its
  attack timer is held at 24 ticks). Existing rules are unchanged: water wets, fire burns, ice and snow chill.

### Decisions

- Boss Rush got longer rather than getting a second variant: one mode, more to fight. Its record table is the
  same key, so an old best score stays (it is now easier to beat).
- The old boss versions of Juggernaut, Ultron and Magneto keep their AI; only their sprites changed (stage 2).

## Stage 7: UI and onboarding

### Hero select

- **Portraits.** Every hero card shows the hero's sprite, drawn from the same art and with the same outline and
  lighting as in game (`src/ui/portrait.js`). The eight new heroes carry a NEW tag.
- **Filters and search** above the grid: ALL, NEW, FLIERS, GROUND, HEAVY (420+ health), FAST (run 2.3+), and a
  name search. With 44 heroes the grid needed a way in.
- **Hero panel** under the grid for the selected hero: an animated figure (idle, run cycle, signature pose),
  bars for health, armour, speed and jump, the trait and its awakened state in full, and the whole kit as chips
  coloured by kind (tap, hold, move, ultimate). The trait used to be one line of small text on the card.

### Power bar

- Each power shows its **energy cost** (per second for hold powers), after the balance multipliers. Ultimates
  show none.
- Kind detection was fixed in stage 1 and 5, so the hold (blue) and move (green) stripes are now right on all
  641 powers.

### HUD

- The hero badge is the **hero's face** instead of an initial.
- (From stage 3) aggregated damage numbers, hero-coloured sound words.

### Spawn menu

- New tool **Map Event**: starts the current map's event on demand.
- New enemy **Training Dummy**: never dies, for reading damage numbers. The stage 6 enemies and bosses appear
  in the list automatically.

### Onboarding

- **First-run coach** (`src/ui/onboard.js`): a small panel above the power bar that teaches the controls by
  waiting for the player to use them. Steps: run and jump; take off (fliers only); use a power; pick another
  power; break something; ultimate; the spawn menu (sandbox only). It shows once, has a SKIP button, hides in
  menus and on pause, and Settings has REPLAY THE TUTORIAL.

### Settings added over the overhaul

DAMAGE NUMBERS, MAP EVENTS, REPLAY THE TUTORIAL. All default on; all saved with the others.

### Known issues

- Long hero names wrap to two lines on the narrow cards (Black Widow, Green Goblin).


## Stage 8: performance and cleanup

### Performance

- **The sim step visits only awake chunks** (`world/sim.js`). It used to test every chunk once per cell row:
  about 181,000 checks a tick on a city map (1080 rows x 168 chunk columns) even when nothing moved. It now picks
  out the awake chunks once per chunk row (34 x 168 = 5,700 checks) and the 32 cell rows inside visit only
  those. Order of updates is unchanged (bottom to top, alternating direction per row), so the sim behaves the
  same. A quiet Forest map steps in 0.45 ms.
- **No regression from the overhaul.** Same benchmark on the pre-overhaul build and this one (production
  builds, City, 25 enemies, the Torch casting every 20 ticks, 400 ticks, both run back to back):

| | tick | of which sim | render |
|---|---|---|---|
| Before (`6ef4b7e`) | 4.9 - 8.6 ms | 4.4 - 8.0 ms | 14.5 - 19.3 ms |
| After | 4.2 - 5.3 ms | 3.8 - 4.8 ms | 8.9 - 16.1 ms |

  The spread is the test browser (a throttled, software-rendered pane), not the game; with the pane in front
  the new build measured 1.7 - 2.2 ms a tick and 1.7 - 3.0 ms a render. The honest reading is "no slower".
- New per-frame work is small and bounded: sprite lighting touches the ~500 pixels of the hero; trails emit at
  most two particles a tick; damage numbers are capped at 40; events run one at a time.
- Build size: 1,372 kB -> 1,495 kB (gzip 456 -> 495 kB) for 8 heroes, 44 sets of art, set pieces, events,
  enemies, a mode and the UI.

### Cleanup

- `scripts/deadcode.mjs` (kept): removed **133 unused import names** across `src/` (an import whose names all
  went became a bare `import 'x'`, so module evaluation order did not change) and 2 unused constants.
- Removed the two boss definitions in `enemies/bosses.js` that a later `defineEnemy` with the same name
  overwrote (the first Juggernaut and the first Magneto never spawned).
- From earlier stages: 18 unreachable power definitions, the four patch-layer kit files, `ULTS` / `markUlt`,
  72 old sprite and palette constants and the per-hero rig entries, the per-pixel leg swing code.
- **Duplicate powers**: none found. No two heroes share a power function, and no power name appears twice in
  a kit (`finalizeKits` now warns if one ever does).
- The script lists 21 exports nothing imports (for example `aoeR`, `isTitan`, `HERO_DARK`). They are left in:
  several are debugging handles and none costs anything after tree-shaking.

### Verification at the end

- `npm run build` and `npm run build:mobile` succeed; the production build loads and runs with 44 heroes.
- Every power of all 44 heroes cast in a sandbox run: no exceptions.
- The 36 original kits hash identical to the pre-overhaul baseline (names, order, ultimates, grabs).
- All 11 modes started and fought; all 7 bosses fought; 16 maps generated with their events run.

## Summary

| Deliverable | State |
|---|---|
| Every hero redrawn, with frames and VFX | 44 heroes in `src/art`; idle + signature pose each, shared hand-drawn stance frames; per-hero impact, trail and default signature |
| Eight new heroes | Daredevil, Hawkeye, Black Widow, Iron Fist, Namor, Sandman, Green Goblin, Mysterio: 15 powers and a trait each |
| One ability system | `heroes/kit.js`, one definition per power, `heroes/balance.js` for tuning |
| Maps | 17 set pieces, one event and one colour grade per map, on all 16 maps |
| Modes, enemies, UI, HUD | Sinister Night, 7-boss Boss Rush, 4 enemies, 3 bosses; hero select, power costs, coach |
| Commits | eight, one per stage, on `art-overhaul-pilot` (not pushed) |

### Known issues and next steps

1. **Art is a first pass.** All of it was drawn in one sitting as character grids and checked on contact sheets,
   not animated by hand frame by frame per hero. Legs in motion are shared per body type. A second pass should
   give the most-played heroes their own run and attack frames, and Hawkeye a bow in the rig.
2. **Bespoke signature effects for the new heroes.** They use the default signature; the 36 older heroes have 137
   hand-made ones between them.
3. **Balance is measured in one scenario.** Two stationary dummies on flat ground. Powers that need crowds,
   walls, water or flying targets are under-measured, and fliers are measured hovering. Nudges were capped for
   that reason. The harness and report scripts are in `scripts/` to rerun after play-testing.
4. **Map layouts are the old generators plus set pieces.** Sakaar, Knowhere and the Dark Dimension get few
   pieces because they have little level ground; overpasses rarely fit.
5. **Bigger hit boxes.** Heroes are 16% taller. Nothing was found that they no longer fit through, but only the
   spawn areas of each map were walked.
6. **Not play-tested by a person.** Everything above was verified by scripts and screenshots. Feel, difficulty
   of the new bosses and whether the coach is paced right need a human run.
7. The Obsidian vault has one Dev Log entry pointing here; the per-system notes were not rewritten.
