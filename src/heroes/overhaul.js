// Kit overhaul (2026-10-30): no more than two heroes may share a mechanic.
// Every power in the game carries a mechanic tag (pw.m). Before this pass the same tag sat on up to 18 heroes: a
// straight-line dash charge, a leap-slam, a held beam, a radial nova, a summoned shooter. KIT below is each hero's
// whole kit in order (the ultimate last) with its tag; powers not listed are retired, and the new ones come from
// kits4a.js and kits4b.js (a new power with an old name replaces the old one). auditKits() checks the rule and warns
// in the console if a tag ever reaches a third hero or a power ships without one.
// A tag names what the power does, not how it looks: 'bolt' is a plain straight shot, 'beam' a held ray,
// 'leap-slam' a jump that lands as a shockwave. Tags used by one hero only are that hero's own trick.
import { ULTS } from './abilities.js';
import { EXTRA4A } from './kits4a.js';
import { EXTRA4B } from './kits4b.js';

const KIT={
 doom:['Eldritch Bolt|pierce-bolt','Mystic Fire|cone-fire','Gravity Well|vortex','Mystic Shield|shield','Doombots|drones','Octessence Sigil|rune-blast','Timeslip|rewind','Temporal Restoration|restore-terrain','Mystic Siphon|drain','Kneel Before Doom|kneel','That Was a Doombot|bot-swap','Orbital Strike|skybeam'],
 hulk:['Smash|punch','Thunderclap|clap-wave','Gamma Leap|leap-slam','Rip & Throw|carry-throw','Gamma Roar|cone-blast','Puny God|grapple-slam','Fault Line|groundwave','Wrecking Ball|ball-roll','The Madder Hulk Gets|anger-grow','Gamma Radiation|radiation-zone','Car Gloves|empower-strikes','Worldbreaker|rage'],
 thor:['Hammer Throw|boomerang','Lightning Call|skybolt','Lightning Dome|zap-dome','Storm Call|storm-cloud','Bifrost|bifrost','Mjolnir Spin|spin','Hammer Tow|dash','Mjolnir Pin|pin','Asgardian Uppercut|uppercut','Lightning Body|zap-aura','Asgardian Downpour|rain-wet','God Blast|charge-beam'],
 iron:['Repulsor|bolt','Unibeam|beam','Micro Missiles|missiles','Flares|flare-spray','Hulkbuster|mech-drop','Electromagnet|magnet-pull','EMP Burst|stun-burst','Thermite|sticky-burn','Nano Blades|slice-fan','Target Lock|lockon','Repulsor Field|repel','Proton Cannon|cannon'],
 wolverine:['Claw Fury|frenzy-claw','Berserker Rage|rage','Feral Pounce|pounce','Adamantium Drill|drill','Healing Factor|heal','Whirlwind|spin','Feral Senses|sense','Not Today|undying','Snikt Ball|ball-roll','X-Slash|x-cut','Berserker Barrage|enemy-hop'],
 cyclops:['Optic Blast|beam','Ricochet Shot|ricochet','Full Power|charge-beam','Optic Sweep|sweep','Leg Sweep|trip-beam','Optic Lift|rocket-jump','Tactical Focus|slowmo','Blackbird Strafe|jet-strafe','X-Formation|mark','Prism Burst|prism-split','Optic Pinball|chain','Uncontrolled Blast|beam-storm'],
 iceman:['Ice Beam|freeze-ray','Ice Wall|wall','Ice Shards|fan','Frost Nova|freeze-burst','Ice Prison|cage','Ice Golem|golem','Ice Bridge|platform','Ice Decoy|decoy','Icicle Drop|sky-shards','Shatter Point|shatter-frozen','Glacial Armor|thorns','Absolute Zero|deep-freeze'],
 jean:['Telekinesis|tk','Psi Bolts|homing','Psychic Wave|cone-blast','Levitate Crowd|levitate','Psionic Overload|stun-burst','Debris Storm|debris-storm','Puppet Master|mind-control','Stasis Field|stasis','Mind Swap|swap','Phoenix Rebirth|revive','Mind Link|link','Phoenix Force|nova'],
 spidey:['Web Shot|web-bind','Spider-Sense|auto-dodge','Web Net|net','Web Yank|pull','Web Trampoline|trampoline','Swing Kick|swing','Web Topple|topple','Web Wrecking Ball|wrecking-ball','Thwip Zip|grapple','Iron Spider Arms|extra-arms','Web Hang|hang','Maximum Spider|pinball-self'],
 wanda:['Hex Bolt|hex-bolt','Transmute|transmute','Hex Storm|hex-lightning','No More|depower','Reality Rupture|explosion-trail','Elemental Inversion|element-swap','Conjure Chaos|conjure','Gravity Flip|antigrav','Chaos Spears|orbit-launch','Westview|pacify-dome','Hex Chains|chains-root','Chaos Unleashed|chaos-transmute'],
 strange:['Bolts of Balthakk|split-bolt','Portals|portals','Crimson Bands|bind-drag','Eldritch Whip|whip','Mirror Fold|fold-terrain','Banish|banish','Ward of Vishanti|ward','Astral Projection|astral','Time Loop|loop','Cloak of Levitation|cloak-grab','Seraphim Disc|platform','Time Stands Still|time-freeze-bank'],
 antman:['Pym Punch|size-punch','Shrink|shrink','Giant-Man|grow','Ant Army|swarm','Giant Stomp|grow-stomp','Grow Disc|grow-object','Flying Ant|flight','Pym Bomb|implode-burst','Quantum Tunnel|banish','Inside Job|inside-job','Shrink Disc|shrink-enemy','Keychain Tank|drop-structure'],
 juggernaut:['Haymaker|momentum-punch','Unstoppable Charge|dash','Ground Pound|quake','Wall Rip|hurl-chunk','Structural Shatter|shatter-area','Juggernaut Suplex|grapple-slam','Crimson Aura|aura-damage','Immovable|immovable','Girder Bat|bat-swing','Gem of Cyttorak|gem-pull','Juggernaut Smash|crater-collapse'],
 ultron:['Encephalo Beam|sleep-ray','Concussion Blast|expanding-ring','Sentry Swarm|drones','Adamantium Shell|shell','Assimilate|assimilate','Upload|possess-machine','Turret Grid|turret','Ultron Clone Bomb|walking-bomb','Sokovia|lift-drop','Repulsor Lattice|levitate','Self-Upgrade|scrap-repair','Annihilation Sweep|sweep'],
 magneto:['Magnetic Bolts|magnetize','Scrap Ball|metal-gather','Polarity Shield|shield','Iron Maelstrom|debris-storm','Repulse|repel','Rail Shot|railgun','Magnetic Implosion|magnet-pull','Polarity Reverse|reflect','Metal Storm Armor|orbit-guard','Blood Iron|blood-iron','Coin Drill|drill','Asteroid M|lift-drop'],
 storm:['Chain Lightning|chain','Ball Lightning|ball-lightning','Conductor Strike|skybolt','Tornado|tornado','Gale Force|wind-push','Hailstorm|sky-shards','Flash Flood|flood','Lightning Rider|bolt-travel','Blizzard|blizzard','Monsoon|rain-wet','Fog Bank|fog','Eye of the Storm|eye-vortex'],
 venom:['Symbiote Form|blob-form','Tendril Lash|lash','Tendril Grab|tk','Devour|devour','Spike Harpoon|harpoon','Burrow|burrow','Klyntar Contagion|contagion','Morph Weapons|weapon-morph','Goo Trap|slow-puddle','Tear Apart|tear','We Are Venom|frenzy-form'],
 reed:['Long Arm Punch|stretch-punch','Hammer Fist|stretch-smash','Stretch Sweep|arm-sweep','Lasso Topple|topple','Pile Driver|pile-drive','Elastic Net|net','Weakness Analysis|mark','Bouncing Barrier|bounce-wall','Elastic Wrap|bundle','Inflate|balloon','Parachute|glide','Negative Zone Rift|rift-pull'],
 sue:['Force Blast|shove-splat','Crushing Bubble|crush','Force Geyser|geyser','Invisible Mines|mine','Force Blade|slice-line','Force Steps|air-walk','Inner Bubble|inner-bubble','Invisibility|stealth','Force Wedge|wedge','Force Piston|piston','Refraction Flash|blind','Force Nova|force-expand'],
 torch:['Fireball|bolt','Fire Tornado|tornado','Firebird|firebird','Comet Strike|meteor','Melt Down|melt','Sky Writing|sky-writing','Thermal Updraft|updraft','Flame Absorb|absorb-element','Heat Shield|shot-melt','Oxygen Burn|oxygen-burn','Supernova|nova'],
 thing:['Clobber Punch|punch','Rock Slam|quake','Slab Toss|hurl-chunk','Thunder Clap|clap-wave','Pummel Barrage|barrage','Rock Armor|shell','Bear Hug|squeeze','Sinkhole Stomp|pit-trap','Wind-Up Haymaker|charge-punch',"It's Clobberin' Time!|revenge-punch"],
 panther:['Vibranium Claws|slash','Pounce|pounce','Claw Storm|claw-storm','Ground Cleave|x-cut','Kinetic Pulse|kinetic-release','Habit Absorb|absorb-damage','Kimoyo Charges|sticky-bomb','Dora Spear|impale','Heart-Shaped Herb|first-strike','Ritual Combat|duel',"Bast's Wrath|spectral-claws"],
 cap:['Shield Throw|boomerang','Shield Bash|shield-bash','Edge Throw|ricochet','Star Strike|lunge','Frag Grenade|grenade','Vibranium Block|reflect','Uppercut|uppercut','All Day|undying','Worthy|lightning-spiral','Inspiring Rally|rally','Avengers Assemble|ally-strike'],
 marvel:['Photon Blast|stored-energy-shot','Go Binary|transform','Starforce Dive|lunge','Energy Absorb|absorb','Kree Sky Lance|skybeam','Energy Siphon Punch|absorb-element','Shatterpoint|radial-fissure','Goose the Flerken|pet','Seventh Sense|auto-counter','Photon Thrust|rocket-jump','Energy Overflow|overshield','Binary Supernova|absorb-release'],
 surfer:['Cosmic Bolt|crystal-bolt','Transmute Matter|transmute','Hand of Galactus|giant-hand','Singularity|vortex','Surface Grind|board-surf','Gravity Lift|antigrav','Sky Cleaver|slice-line','Starlight Barrier|wall','Phase Through|phase','Cosmic Awareness|sense','Sentinel of the Spaceways|multi-beam'],
 rider:['Hellfire Chain|whip','Penance Stare|penance','Hell Cycle|bike-ride','Spirit of Vengeance|fire-trail','Chain Grab|pull','Chains of Hell|chains-root','Hell Gate|hell-gate','Hellfire Breath|cone-fire','Chain Swing|swing','Retribution|retribution','Judgement|gather-detonate'],
 pool:['Katana Slash|slash','Dual Pistols|rapid-fire','Grenade Belt|grenade','Chimichanga|heal','Fourth Wall Break|fling-offscreen','Pouch Roulette|random-item','C4|timed-charge','Katana Pogo|pogo','Taunt|taunt','Unicorn Charge|beast-charge','Detached Arm|limb-toss','Deadpool Corps|corps'],
 thanos:['Titan Punch|launch-punch','Power Stone|empower-strikes','Space Stone|blink','Reality Stone|polymorph','Soul Stone|drain','Time Stone|decay-area','Mind Stone|fear','Moon Hurl|meteor','Black Order|melee-minions','Titan Leap|leap-slam','Gauntlet Crush|crush','The Snap|snap'],
 hela:['Necrosword Throw|necro-embed','Black Spike Field|groundwave','Death Touch|wither','Berserker Legion|melee-minions','Throne of Hel|throne','Blades of Hel|recall','Impaler|impale','Raise the Fallen|raise-dead','Fenris|mount','Sea of Swords|sword-sea'],
 moon:['Crescent Darts|curve-dart','Truncheon Combo|combo-finisher','Ankh Grapple|grapple','Cape Glide|glide','Eclipse|eclipse-mark','Phases of the Moon|phase-cycle','Weighing of the Heart|execute','Fist of Khonshu|giant-hand','Resurrection|revive','Avatar of Khonshu|avatar'],
 shang:['Ten Rings|ring-shot','Kung Fu Flurry|barrage','Ring Guard|orbit-guard','Palm Strike|force-cone','Great Protector|beast-charge','Ring Prison|cage','Wushu Counter|parry','Pressure Points|pressure-points','Wheel of Rings|wheel','Ten Rings Unleashed|lockon'],
 gambit:['Charged Card|kinetic-card','Royal Flush|fan','Bo Staff Vault|vault','Kinetic Charge|area-charge','Ace in the Hole|mine','Kinetic Throw|charge-object','Card Storm|rapid-fire','Hypnotic Charm|mind-control','Charged Bo Staff|staff-combo','Lady Luck|random-item','Full House|full-house'],
 kurt:['BAMF|blink','BAMF Strike|backstab','Teleport Drop|drop-enemy','Brimstone Cloud|poison-cloud','Tail Whip|tail-whip','Chain BAMF|enemy-hop','Swashbuckler|slice-fan','BAMF Swap|swap','Special Delivery|drop-on','Limbo Step|phase','BAMF Barrage|mass-ambush'],
 quill:['Element Gun: Fire|egun','Element Gun: Ice|egun','Gravity Mine|implode-burst','Milano Strafe|jet-strafe','Dance-Off|mirror-dance',"Rocket's Gift|missiles",'The Orb|orb','I Am Groot|grow-tree','Awesome Mix|music-buff',"Yondu's Arrow|homing",'Hadron Enforcer|cannon','Celestial Light|celestial-terraform'],
 miles:['Venom Strike|shock-punch','Venom Web|web-bind','Camouflage|stealth','Venom Blast|bio-burst','Glitch Trap|glitch-trap','Drop the Beat|turret','Web Tripwire|tripwire','Spider-Cat|pet','Conductor Web|conduct-line','Spider-Sense|auto-dodge','Mega Venom Blast|grid-shock'],
 kang:['Chrono Bolt|echo-bolt','Force Cascade|force-cone','Chrono Stasis|stasis','Entropy Ray|tether-burn','Chronal Rewind|rewind','Temporal Clones|time-clones','Damocles Base|carpet-bomb','Stasis Wall|time-wall','Haste|haste','Time Bomb|damage-replay','Kang Dynasty|dynasty'],
};
ULTS.strange='Time Stands Still'; // the Seraphim Disc is a platform again; Strange's ultimate stops time

// rebuild every kit from KIT: old powers by name, new ones (kits4a/b) win over old ones of the same name
export function applyOverhaul(CHARS){
  for(const c of CHARS){const list=KIT[c.id];if(!list)continue;const nu=[...(EXTRA4A[c.id]||[]),...(EXTRA4B[c.id]||[])],out=[];
    for(const s of list){const [n,m]=s.split('|');const pw=nu.find(o=>o.n===n)||c.powers.find(o=>o.n===n);if(!pw){console.warn('overhaul: no power',c.id,n);continue;}pw.m=m;out.push(pw);}
    for(const pw of out)if(ULTS[c.id])pw.ult=pw.n===ULTS[c.id];
    const u=out.findIndex(pw=>pw.ult||pw.n===ULTS[c.id]);if(u>=0&&u!==out.length-1)out.push(out.splice(u,1)[0]);
    c.powers=out;}
  auditKits(CHARS);}
// the rule: a mechanic tag on at most two heroes
export function auditKits(CHARS){const by={};let bad=0;
  for(const c of CHARS)for(const pw of c.powers){if(!pw.m){console.warn('overhaul: untagged',c.id,pw.n);bad++;continue;}(by[pw.m]=by[pw.m]||new Set()).add(c.id);}
  for(const [m,s] of Object.entries(by))if(s.size>2){console.warn('overhaul: "'+m+'" on '+s.size+' heroes: '+[...s].join(', '));bad++;}
  return {tags:Object.keys(by).length,bad};}
