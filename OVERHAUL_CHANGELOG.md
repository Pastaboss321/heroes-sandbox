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
