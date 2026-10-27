# Heroes Sandbox

A browser falling-sand superhero game: fully destructible pixel worlds, rigid-body collapse, liquids, fire and snow, and 16 heroes: Doom, Hulk, Thor, Iron Man, Wolverine, Cyclops, Iceman, Jean Grey, Storm (12 powers each), Spider-Man, Scarlet Witch, Doctor Strange, Ant-Man, and the playable villains Juggernaut, Ultron and Magneto (10 each). The roster has since grown well past that original sixteen - every hero now carries 14 or more powers, and the newest arrival is the time-travelling villain Kang the Conqueror (`src/heroes/kang.js`), whose fifteen powers stop time in a bubble, loop and rewind it, pull fighting clones out of other timelines and call down his orbiting Damocles base.

- 7 maps: City, New York, NYC 2099, Forest, X-Mansion, Savage Land, Weapon X
- 6 modes: Sandbox (with a spawn menu for enemies, objects, terrain and tools), Robot Uprising, Sentinel Siege, Wrecking Crew, Boss Rush, Savage Land Swarm
- Procedural sound effects (WebAudio, no asset files) and a WebGL compositor (light spill, bloom, shockwaves, heat haze)

## Run

Needs Node.js. First time:

```bash
npm install
```

On Windows, double-click `Play.bat` for a one-click launch (it refreshes dependencies and opens the game).

Dev server with hot reload (http://localhost:5173):

```bash
npm run dev
```

Build one self-contained `dist/index.html` (PixiJS, CSS and game inlined; open it directly or host anywhere):

```bash
npm run build
```

## Layout

- `index.html` - page markup (HUD, menus)
- `src/style.css` - UI styles
- `src/main.js` - the game (simulation, heroes, enemies, modes, UI logic)
- `src/gl.js` - PixiJS WebGL compositor (pixel frame, light spill, bloom, shockwaves, heat haze); falls back to 2D canvas without WebGL
- `src/audio.js` - procedural sound effects (WebAudio synthesis)
- `src/spawnmenu.js` - the sandbox spawn menu UI

## Controls

- A/D walk, W/Space jump, double-tap jump or F to fly, Shift boost
- Mouse aim, left click cast, 1-0 / Q E / wheel to pick a power
- B spawn menu (sandbox), [ ] brush size, right-click cancels a spawn tool
- Hulk: hold S then Space for a gamma leap, jump in mid-air for a thunderclap jump, S in mid-air to dive-slam
- Wolverine: push into a wall in mid-air to cling (W climb, S slide, Space wall-jump); keep running to sprint
- Esc pause, H help
