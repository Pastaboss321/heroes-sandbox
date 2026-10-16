# Heroes Sandbox

A browser falling-sand superhero game: fully destructible pixel worlds, rigid-body collapse, and nine heroes (Doom, Hulk, Thor, Iron Man, Wolverine, Cyclops, Iceman, Jean Grey, Storm).

## Run

Needs Node.js. First time:

```bash
npm install
```

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
- `src/gl.js` - PixiJS WebGL presenter (scales the pixel frame, GPU bloom); falls back to 2D canvas without WebGL

## Controls

- A/D walk, W/Space jump, double-tap jump or F to fly, Shift boost
- Mouse aim, left click cast, 1-0 / Q E / wheel to pick a power
- Esc pause, H help
