// PixiJS (WebGL) presenter. The simulation still draws into two small CPU canvases:
//   sim  - the 480x270 pixel frame
//   glow - emissive pixels only (fire, beams, eyes), used for bloom and lighting
// Each frame both are uploaded as textures. The glow is blurred on the GPU into a light map, and one
// full-screen compositor shader combines everything:
//   - the frame, scaled up nearest-neighbour (pixel art stays crisp)
//   - light spill: surfaces near fire, lava, beams and neon pick up their colour
//   - bloom on top
//   - shockwave rings that bend the image around big explosions
//   - heat haze above hot things, chromatic aberration on heavy impacts, a colour tint (bullet time)
// The 2D #view canvas stays above this for the comic overlay, HUD bits and minimap.
// If WebGL or the shader is unavailable, it falls back to plain sprites, and main.js to its 2D path.
import { Application, Sprite, Texture, BlurFilter, RenderTexture, Container, Geometry, Mesh, Shader, UniformGroup } from 'pixi.js';

let app = null, simT, glowT, lightRT, blurS, blurC, quad = null, U = null;
let simS = null, bloomS = null, glowS = null; // fallback sprites when the compositor can't be built

const VERT = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main(){
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;
const FRAG = `
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uSim;
uniform sampler2D uLight;
uniform sampler2D uGlow;
uniform vec2 uRes;
uniform float uTime;
uniform float uCA;
uniform float uLit;
uniform float uBloom;
uniform float uHaze;
uniform vec4 uTint;
uniform vec4 uHeat;
uniform vec4 uW0;
uniform vec4 uW1;
uniform vec4 uW2;
uniform vec4 uW3;
uniform vec4 uW4;
uniform vec4 uW5;
vec2 wave(vec2 p, vec4 w){
  if (w.w <= 0.0) return vec2(0.0);
  vec2 d = p - w.xy;
  float r = length(d);
  float th = 7.0 + w.z * 0.12;
  float x = (r - w.z) / th;
  if (abs(x) > 1.0) return vec2(0.0);
  float f = 1.0 - x * x;
  return d / max(r, 0.001) * sin(x * 3.14159) * f * f * w.w * 5.0;
}
void main(){
  vec2 p = vUV * uRes;
  vec2 off = wave(p, uW0) + wave(p, uW1) + wave(p, uW2) + wave(p, uW3) + wave(p, uW4) + wave(p, uW5);
  vec3 L0 = texture(uLight, vUV).rgb;
  float hot = clamp(L0.r * 1.4 - L0.b * 0.9, 0.0, 1.0) * uHaze;
  if (uHeat.z > 0.0) { float hd = length(p - uHeat.xy) / uHeat.z; hot += clamp(1.0 - hd, 0.0, 1.0) * uHeat.w; }
  off += vec2(sin(p.y * 0.42 + uTime * 7.0), cos(p.x * 0.37 + uTime * 5.3)) * hot * 1.1;
  vec2 uv = clamp((p + off) / uRes, vec2(0.0), vec2(1.0));
  vec3 c;
  if (uCA > 0.01) {
    vec2 ca = (uv - 0.5) * uCA / uRes;
    c = vec3(texture(uSim, uv + ca).r, texture(uSim, uv).g, texture(uSim, uv - ca).b);
  } else c = texture(uSim, uv).rgb;
  vec3 L = texture(uLight, uv).rgb;
  vec3 g = texture(uGlow, uv).rgb;
  c += c * L * uLit;                       // light spill onto nearby surfaces
  c += L * uBloom * 0.95 + g * uBloom * 0.35; // bloom
  c = mix(c, c * uTint.rgb, uTint.a);
  finalColor = vec4(c, 1.0);
}`;

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
  try {
    // glow -> blurred light map at sim resolution (cheap), sampled by the compositor
    lightRT = RenderTexture.create({ width: simCanvas.width, height: simCanvas.height });
    blurS = new Sprite(glowT);
    blurS.filters = [new BlurFilter({ strength: 6, quality: 3 })];
    blurC = new Container(); blurC.addChild(blurS);
    U = new UniformGroup({
      uRes: { value: new Float32Array([simCanvas.width, simCanvas.height]), type: 'vec2<f32>' },
      uTime: { value: 0, type: 'f32' }, uCA: { value: 0, type: 'f32' }, uLit: { value: 0.8, type: 'f32' },
      uBloom: { value: 1, type: 'f32' }, uHaze: { value: 0.6, type: 'f32' },
      uTint: { value: new Float32Array([1, 1, 1, 0]), type: 'vec4<f32>' },
      uHeat: { value: new Float32Array(4), type: 'vec4<f32>' },
      uW0: { value: new Float32Array(4), type: 'vec4<f32>' }, uW1: { value: new Float32Array(4), type: 'vec4<f32>' },
      uW2: { value: new Float32Array(4), type: 'vec4<f32>' }, uW3: { value: new Float32Array(4), type: 'vec4<f32>' },
      uW4: { value: new Float32Array(4), type: 'vec4<f32>' }, uW5: { value: new Float32Array(4), type: 'vec4<f32>' },
    });
    const shader = Shader.from({
      gl: { vertex: VERT, fragment: FRAG, name: 'hs-composite' },
      resources: { uSim: simT.source, uLight: lightRT.source, uGlow: glowT.source, comp: U },
    });
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1], aUV: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    quad = new Mesh({ geometry, shader });
    app.stage.addChild(quad);
    // render once now: a shader that fails to compile throws or logs here instead of mid-game
    app.renderer.render({ container: blurC, target: lightRT, clear: true });
    app.render();
    const gl = app.renderer.gl;
    if (gl && gl.getError && gl.getError() !== 0) throw new Error('GL error after compositor test render');
  } catch (e) {
    console.warn('Compositor shader unavailable, using plain sprites', e);
    if (quad) { app.stage.removeChild(quad); quad = null; }
    simS = new Sprite(simT);
    bloomS = new Sprite(glowT); bloomS.filters = [new BlurFilter({ strength: 8, quality: 3 })];
    bloomS.blendMode = 'add'; bloomS.alpha = 0.95;
    glowS = new Sprite(glowT); glowS.blendMode = 'add'; glowS.alpha = 0.35;
    app.stage.addChild(simS, bloomS, glowS);
  }
  return true;
}

// x, y, w, h: where the scaled frame goes on screen (includes screen shake); scale: pixels per world pixel
// fx: {bloom, light, waves:[{x,y,r,s}] in sim pixels, ca, haze, tint:[r,g,b,a], heat:[x,y,r,k] in sim pixels, time}
export function presentGL(x, y, w, h, scale, fx = {}) {
  if (!app) return false;
  const r = app.renderer;
  if (r.width !== innerWidth || r.height !== innerHeight) r.resize(innerWidth, innerHeight);
  simT.source.update();
  const bloom = fx.bloom !== false;
  if (quad) {
    glowT.source.update();
    r.render({ container: blurC, target: lightRT, clear: true });
    const u = U.uniforms;
    u.uTime = fx.time || 0;
    u.uBloom = bloom ? 1 : 0;
    u.uLit = fx.light === false ? 0 : 0.85;
    u.uCA = fx.ca || 0;
    u.uHaze = fx.haze ?? 0.6;
    const T = fx.tint || [1, 1, 1, 0]; u.uTint[0] = T[0]; u.uTint[1] = T[1]; u.uTint[2] = T[2]; u.uTint[3] = T[3];
    const Hh = fx.heat; u.uHeat[0] = Hh ? Hh[0] : 0; u.uHeat[1] = Hh ? Hh[1] : 0; u.uHeat[2] = Hh ? Hh[2] : 0; u.uHeat[3] = Hh ? Hh[3] : 0;
    const ws = fx.waves || [];
    for (let k = 0; k < 6; k++) {
      const a = u['uW' + k], wv = ws[k];
      if (wv) { a[0] = wv.x; a[1] = wv.y; a[2] = wv.r; a[3] = wv.s; } else a[3] = 0;
    }
    U.update();
    quad.x = x; quad.y = y; quad.scale.set(w, h);
  } else {
    for (const s of [simS, bloomS, glowS]) { s.x = x; s.y = y; s.width = w; s.height = h; }
    bloomS.visible = glowS.visible = bloom;
    if (bloom) { glowT.source.update(); bloomS.filters[0].strength = 3 * scale; }
  }
  app.render();
  return true;
}
