// PixiJS (WebGL) presenter. The simulation still draws into two small CPU canvases:
//   sim  - the 480x270 pixel frame
//   glow - emissive pixels only (fire, beams, eyes), used for bloom
// Each frame they are uploaded as textures and drawn scaled up on the GPU: the frame with
// nearest-neighbour filtering, the glow blurred and added on top. The 2D #view canvas stays
// above this for the comic overlay, HUD bits and minimap. If WebGL is unavailable, main.js
// falls back to its old 2D-canvas path.
import { Application, Sprite, Texture, BlurFilter } from 'pixi.js';

let app = null, simT, glowT, simS, blurS, glowS, blurF;

export async function initGL(simCanvas, glowCanvas, overlay) {
  try {
    app = new Application();
    await app.init({
      width: innerWidth, height: innerHeight, backgroundColor: 0x050806,
      antialias: false, autoStart: false, preference: 'webgl', resolution: 1,
    });
  } catch (e) {
    console.warn('PixiJS unavailable, using the 2D canvas renderer', e);
    app = null;
    return false;
  }
  const c = app.canvas;
  c.id = 'gl';
  overlay.parentNode.insertBefore(c, overlay);

  simT = Texture.from(simCanvas);
  simT.source.scaleMode = 'nearest';
  glowT = Texture.from(glowCanvas);
  glowT.source.scaleMode = 'linear';

  simS = new Sprite(simT);
  blurS = new Sprite(glowT);
  glowS = new Sprite(glowT);
  blurF = new BlurFilter({ strength: 8, quality: 3 });
  blurS.filters = [blurF];
  blurS.blendMode = 'add'; blurS.alpha = 0.95;
  glowS.blendMode = 'add'; glowS.alpha = 0.35;
  app.stage.addChild(simS, blurS, glowS);
  return true;
}

// x, y, w, h: where the scaled frame goes on screen (includes screen shake); scale: pixels per world pixel
export function presentGL(x, y, w, h, scale, bloom) {
  if (!app) return false;
  const r = app.renderer;
  if (r.width !== innerWidth || r.height !== innerHeight) r.resize(innerWidth, innerHeight);
  simT.source.update();
  for (const s of [simS, blurS, glowS]) { s.x = x; s.y = y; s.width = w; s.height = h; }
  blurS.visible = glowS.visible = bloom;
  if (bloom) { glowT.source.update(); blurF.strength = 3 * scale; }
  app.render();
  return true;
}
