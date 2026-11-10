# Heroes Sandbox overhaul changelog

Branch `art-overhaul-pilot`, one commit per stage. Every decision made without asking is recorded here, with the
numbers. Newest stage last.

## Stage 0: audit

- Start point: `6ef4b7e` (the revert of "Kit overhaul: no mechanic on more than two heroes").
- What the reverted commit did: it tagged every power with a "mechanic" and replaced or retired powers until no
  tag sat on more than two heroes (412 powers kept, about 110 retired or swapped for new ones in `kits4a/4b.js`).
  It was rejected as a change for the worse. Lesson applied to this overhaul: **no existing power is retired,
  renamed or replaced, and no quota is imposed on kits.** Kits keep their names, order and behaviour.
- Baseline measured before touching anything: 36 heroes, 523 powers. A hash of every hero's power list (names,
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
all 36 heroes (523 powers). Every power of every hero was then cast in a sandbox run with no exception thrown.

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
- Result: **95 of 523 powers adjusted** (50 cheaper or faster, 45 dearer or slower). No power changed by more
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
