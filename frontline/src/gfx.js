// Frontline graphics: everything visual that is generated in code.
// Renderer and post-processing, sky and image-based lighting, procedural textures, scattered scenery, particles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { atmosphereLighting } from './atmosphere.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Renderer and post-processing
export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement); return renderer;
}
// Final grade: tint, contrast, vignette, a little film grain, and a red pulse when you are hurt.
const GradeShader = { uniforms: { tDiffuse: { value: null }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uTime: { value: 0 }, uHurt: { value: 0 }, uVig: { value: 0.9 }, uSun: { value: new THREE.Vector2(0.5, 0.8) }, uSunVis: { value: 0 }, uRays: { value: 0.3 }, uPx: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uWet: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uTint; uniform float uTime; uniform float uHurt; uniform float uVig; uniform vec2 uSun; uniform float uSunVis; uniform float uRays; uniform vec2 uPx; uniform float uWet; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 hot(vec2 uv){ vec3 c = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb; return min(max(c - 2.4, 0.0), vec3(3.0)); }
    void main(){ vec2 d = vUv - 0.5; float r = dot(d, d);
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * r * 0.004).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * r * 0.004).b);
      // a light unsharp mask so textures stay crisp
      vec3 bl = (texture2D(tDiffuse, vUv + vec2(uPx.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uPx.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, uPx.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uPx.y)).rgb) * 0.25;
      c += clamp(c - bl, -0.25, 0.25) * 0.45;
      // light shafts: smear the brightest sky toward the viewer, so buildings and palms cut visible rays
      if (uSunVis > 0.01) { vec2 dir = uSun - vUv; float jit = hash(vUv * 700.0 + uTime) / 26.0; vec3 acc = vec3(0.0); float w = 1.0;
        for (int i = 0; i < 26; i++) { acc += hot(vUv + dir * (float(i) / 26.0 + jit) * 0.9) * w; w *= 0.95; }
        c += acc / 26.0 * uRays * uSunVis;
        vec2 gp = 0.5 + (0.5 - uSun) * 0.55; c += hot(gp + (vUv - gp) * 3.0) * vec3(0.5, 0.8, 1.0) * 0.012 * uSunVis; // one faint lens ghost
      }
      c *= uTint; float l = dot(c, vec3(0.299, 0.587, 0.114));
      c *= mix(vec3(0.93, 1.0, 1.07), vec3(1.07, 1.0, 0.92), smoothstep(0.05, 1.3, l)); // cool shadows, warm highlights
      c = mix(vec3(l), c, 1.12); c = (c - 0.5) * 1.06 + 0.5;
      c *= 1.0 - smoothstep(0.18, 0.75, r) * uVig; c += (hash(vUv * 900.0 + uTime) - 0.5) * 0.006;
      c = mix(c, vec3(0.9, 0.12, 0.08), uHurt * smoothstep(0.08, 0.6, r));
      gl_FragColor = vec4(max(c, 0.0), 1.0); }` };
export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.55, 1.35); composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader); composer.addPass(grade); composer.addPass(new OutputPass());
  const sv = new THREE.Vector3(), cd = new THREE.Vector3();
  return { composer, bloom, grade, resize(w, h) { composer.setSize(w, h); bloom.setSize(w, h); grade.uniforms.uPx.value.set(1 / w, 1 / h); },
    // where the sun sits on screen, and how strongly its shafts should show
    setSun(sunDir) { camera.getWorldDirection(cd); const f = cd.dot(sunDir); sv.copy(camera.position).addScaledVector(sunDir, 400).project(camera); const u = grade.uniforms; u.uSun.value.set(sv.x * 0.5 + 0.5, sv.y * 0.5 + 0.5); const off = Math.max(Math.abs(sv.x), Math.abs(sv.y)); u.uSunVis.value = f > 0.05 ? clamp(1.7 - off, 0, 1) * clamp(f * 3, 0, 1) : 0; } };
}

// Wear from position: grime, rain streaks and rust computed from where a pixel sits in the world, so surfaces never look freshly painted.
export function weather(mat, amt, rust) { mat.customProgramCacheKey = () => 'wx' + amt + '_' + rust; mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWxP; varying float vWxUp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWxP = (modelMatrix * vec4(position, 1.0)).xyz; vWxUp = abs(normalize(mat3(modelMatrix) * normal).y);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWxP; varying float vWxUp; float wxR = 0.0;
      float wxh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float wxn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(wxh(i), wxh(i + vec2(1, 0)), f.x), mix(wxh(i + vec2(0, 1)), wxh(i + vec2(1, 1)), f.x), f.y); }
      float wxf(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += wxn(p) * a; p = p * 2.07 + 13.1; a *= 0.5; } return v; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float g = smoothstep(0.38, 0.72, wxf(vWxP.xz * 0.55 + vWxP.y * 0.41)); float st = smoothstep(0.48, 0.78, wxf(vec2(vWxP.x * 2.9 + vWxP.z * 2.3, vWxP.y * 0.35))) * (1.0 - vWxUp); float ru = smoothstep(0.6, 0.7, wxf(vWxP.xy * 3.3 + vWxP.z * 2.9)) * smoothstep(0.3, 0.6, wxf(vWxP.zx * 0.8 + 5.0));
        diffuseColor.rgb *= 1.0 - (g * 0.4 + st * 0.35) * ${amt.toFixed(2)}; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.16, 0.08) * (0.7 + g * 0.6), ru * ${rust.toFixed(2)}); wxR = (g * 0.3 + ru * 0.4) * ${amt.toFixed(2)}; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + wxR, 0.0, 1.0);'); }; return mat; }

// ---------- Procedural textures (drawn on a canvas, never loaded from a file)
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function noiseField(size, seed) { const r = rng(seed), g = new Float32Array(size * size); for (let i = 0; i < g.length; i++) g[i] = r(); return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = g[((yi % size + size) % size) * size + ((xi % size + size) % size)], b = g[((yi % size + size) % size) * size + (((xi + 1) % size + size) % size)], c = g[(((yi + 1) % size + size) % size) * size + ((xi % size + size) % size)], d = g[(((yi + 1) % size + size) % size) * size + (((xi + 1) % size + size) % size)]; return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }; }
// Tileable fractal noise in 0..1 on a size x size grid.
function fbmGrid(size, seed, base, oct) { const out = new Float32Array(size * size), layers = []; for (let o = 0; o < oct; o++) layers.push(noiseField(base << o, seed + o * 17));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let v = 0, a = 0.5, t = 0; for (let o = 0; o < oct; o++) { const f = (base << o) / size; v += layers[o](x * f, y * f) * a; t += a; a *= 0.5; } out[y * size + x] = v / t; } return out; }
function canvasTex(size, draw, opts) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (!opts || opts.color !== false) t.colorSpace = THREE.SRGBColorSpace; return t; }
function pixelTex(size, fn, color) { return canvasTex(size, (g, S) => { const im = g.createImageData(S, S), d = im.data; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const p = fn(x, y), i = (y * S + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255; } g.putImageData(im, 0, 0); }, { color: color !== false }); }
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function makeTextures(world) {
  const S = 512, n1 = fbmGrid(S, 11, 4, 6), n2 = fbmGrid(S, 47, 16, 4), n3 = fbmGrid(S, 91, 2, 5), T = {};
  const pal = { la: [[94, 96, 62], [128, 112, 78], [70, 86, 52]], kepler: [[150, 82, 110], [196, 120, 132], [104, 60, 120]], ceres: [[112, 112, 118], [150, 148, 150], [78, 78, 86]] }[world] || [[94, 96, 62], [128, 112, 78], [70, 86, 52]];
  T.ground = pixelTex(S, (x, y) => { const a = n1[y * S + x], b = n2[y * S + x], c = n3[y * S + x]; let col = mixc(pal[0], pal[1], clamp((a - 0.38) * 3.2, 0, 1)); col = mixc(col, pal[2], clamp((c - 0.52) * 3, 0, 1)); const k = 0.82 + b * 0.36; return [col[0] * k, col[1] * k, col[2] * k]; });
  T.groundBump = pixelTex(S, (x, y) => { const v = (n1[y * S + x] * 0.5 + n2[y * S + x] * 0.5) * 255; return [v, v, v]; }, false);
  // Concrete with panel seams; used for walls and building bases.
  T.concrete = pixelTex(S, (x, y) => { const a = n1[y * S + x], b = n2[y * S + x]; let v = 118 + a * 50 + b * 22; if (x % 128 < 3 || y % 128 < 3) v *= 0.62; if ((x + 40) % 128 < 2 && b > 0.5) v *= 0.8; return [v, v * 0.98, v * 0.94]; });
  // Building facade: rows of windows, some lit; the lit ones glow through the emissive map.
  const lit = rng(world === 'kepler' ? 5 : 3), cols = 8, rows = 8, cell = S / cols, win = []; for (let i = 0; i < cols * rows; i++) win.push(lit() < 0.22 ? 1 : lit() < 0.3 ? 0.4 : 0);
  const inWin = (x, y) => { const cx = x % cell, cy = y % cell; return cx > cell * 0.2 && cx < cell * 0.8 && cy > cell * 0.22 && cy < cell * 0.74; };
  T.facade = pixelTex(S, (x, y) => { const a = n1[y * S + x], b = n2[y * S + x]; if (inWin(x, y)) { const w = win[Math.floor(y / cell) * cols + Math.floor(x / cell)]; return w ? [200 * w + 30, 170 * w + 30, 110 * w + 30] : [18 + b * 14, 26 + b * 16, 36 + b * 20]; } let v = 78 + a * 44 + b * 16; if (y % cell < 3) v *= 0.7; return [v * 0.95, v, v * 1.06]; });
  T.facadeGlow = pixelTex(S, (x, y) => { if (!inWin(x, y)) return [0, 0, 0]; const w = win[Math.floor(y / cell) * cols + Math.floor(x / cell)]; return [255 * w, 205 * w, 130 * w]; });
  // Armour plating: panel lines and scratches. One grayscale map drives roughness and bump for every painted metal.
  T.plate = canvasTex(S, (g, Z) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, Z, Z); const r = rng(7); for (let i = 0; i < 2600; i++) { const v = 120 + r() * 90; g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.35)'; g.lineWidth = r() * 1.2; const x = r() * Z, y = r() * Z, a = r() * 6.28, l = 4 + r() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.strokeStyle = '#3c3c3c'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * Z / 4, 0); g.lineTo(i * Z / 4, Z); g.stroke(); g.beginPath(); g.moveTo(0, i * Z / 4); g.lineTo(Z, i * Z / 4); g.stroke(); }
    g.fillStyle = '#555'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (const o of [[10, 10], [Z / 4 - 10, 10], [10, Z / 4 - 10], [Z / 4 - 10, Z / 4 - 10]]) { g.beginPath(); g.arc(i * Z / 4 + o[0], j * Z / 4 + o[1], 2.4, 0, 7); g.fill(); } }, { color: false });
  // Chitin: glossy shell with darker veins, for the swarm.
  T.chitin = pixelTex(256, (x, y) => { const a = n1[(y * 2 % S) * S + (x * 2 % S)], b = n2[(y * 2 % S) * S + (x * 2 % S)]; const vein = Math.abs(Math.sin((x + a * 60) * 0.11) * Math.sin((y + b * 60) * 0.09)); const v = 150 + vein * 90 - b * 50; return [v, v, v]; }, false);
  T.fabric = pixelTex(256, (x, y) => { const thread = (x + y) % 4 < 2 ? 152 : 112, grain = n2[(y * 2) * S + x * 2] * 22; return [thread + grain, thread + grain, thread + grain]; }, false);
  // Soft round sprite for particles, and a scorch mark for the ground.
  T.dot = canvasTex(64, (g, Z) => { const gr = g.createRadialGradient(Z / 2, Z / 2, 0, Z / 2, Z / 2, Z / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Z, Z); }); T.dot.wrapS = T.dot.wrapT = THREE.ClampToEdgeWrapping;
  T.scorch = canvasTex(128, (g, Z) => { const gr = g.createRadialGradient(Z / 2, Z / 2, 4, Z / 2, Z / 2, Z / 2); gr.addColorStop(0, 'rgba(8,6,5,0.92)'); gr.addColorStop(0.5, 'rgba(14,11,9,0.6)'); gr.addColorStop(1, 'rgba(14,11,9,0)'); g.fillStyle = gr; g.fillRect(0, 0, Z, Z); const r = rng(3); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(10,8,6,' + (0.2 + r() * 0.4) + ')'; g.lineWidth = 1 + r() * 2; const a = r() * 6.28, l = Z * (0.25 + r() * 0.24); g.beginPath(); g.moveTo(Z / 2, Z / 2); g.lineTo(Z / 2 + Math.cos(a) * l, Z / 2 + Math.sin(a) * l); g.stroke(); } }); T.scorch.wrapS = T.scorch.wrapT = THREE.ClampToEdgeWrapping;
  return T;
}

// ---------- Sky, sun and image-based lighting
const SKIES = {
  la: { elev: 4.5, azim: 206, turb: 9, ray: 2.6, mie: 0.012, sun: 0xff9a56, sunI: 2.1, hemi: [0x5870a0, 0x1c1814, 0.42], fog: 0x2a3444, fogD: 0.0058, tint: [1.05, 0.99, 0.96], exp: 0.62, env: 0.42, cloud: 0.72, rain: true, bloom: 0.55, rays: 0.5 },
  kepler: { elev: 13, azim: 325, turb: 8, ray: 3.0, mie: 0.012, sun: 0xffb0d8, sunI: 2.4, hemi: [0xc8a0ff, 0x402048, 0.5], fog: 0x6a4f88, fogD: 0.0038, tint: [1.14, 0.84, 1.22], exp: 0.42, env: 0.55 },
  ceres: { elev: 30, azim: 50, sun: 0xdcebff, sunI: 3.2, hemi: [0x5a6f96, 0x18181c, 0.35], fog: 0x05070b, fogD: 0.0016, tint: [0.96, 1.0, 1.08], exp: 0.8, env: 0.3, space: true } };
export function buildSky(renderer, scene, group, world, grade, atmosphere) { const K = Object.assign({}, SKIES[world] || SKIES.la, atmosphere ? atmosphereLighting(world, atmosphere) : {}), phi = THREE.MathUtils.degToRad(90 - K.elev), theta = THREE.MathUtils.degToRad(K.azim), sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  if (atmosphere) K.rain = atmosphere.rain > 0;
  let skyObj;
  if (K.space || K.night) { skyObj = new THREE.Group(); const n = K.space ? 2600 : 1300, pos = new Float32Array(n * 3), r = rng(99); for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u); pos[i * 3] = s * Math.cos(a) * 560; pos[i * 3 + 1] = Math.abs(u) * 560; pos[i * 3 + 2] = s * Math.sin(a) * 560; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); skyObj.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, toneMapped: false })));
    if (K.space) { const planet = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), new THREE.MeshStandardMaterial({ color: 0xc8905a, roughness: 1, emissive: 0x3a2412, emissiveIntensity: 0.6, fog: false })); planet.position.set(-260, 70, -470); skyObj.add(planet);
      const ring = new THREE.Mesh(new THREE.RingGeometry(150, 215, 96), new THREE.MeshBasicMaterial({ color: 0xd8c0a0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false })); ring.position.copy(planet.position); ring.rotation.set(1.25, 0.3, 0); skyObj.add(ring); scene.background = new THREE.Color(0x020308); }
    else { const dome = new THREE.Mesh(new THREE.SphereGeometry(610, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, fog: false, toneMapped: false, uniforms: { moon: { value: sunDir } }, vertexShader: 'varying vec3 vDirection; void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying vec3 vDirection; uniform vec3 moon; void main() { vec3 d = normalize(vDirection); vec3 c = mix(vec3(0.035, 0.055, 0.09), vec3(0.003, 0.008, 0.023), sqrt(max(0.0, d.y))); float disc = smoothstep(0.99965, 0.9998, dot(d, moon)); c += vec3(0.7, 0.8, 1.0) * disc; gl_FragColor = vec4(c, 1.0); }' })); skyObj.add(dome); scene.background = null; } }
  else if (K.storm) { skyObj = new THREE.Mesh(new THREE.SphereGeometry(620, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, fog: false, toneMapped: false,
    uniforms: { sun: { value: sunDir } }, vertexShader: 'varying vec3 vDirection; void main(){ vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vDirection; uniform vec3 sun; void main(){ vec3 d = normalize(vDirection); vec3 c = mix(vec3(0.13, 0.17, 0.22), vec3(0.025, 0.045, 0.075), sqrt(max(d.y, 0.0))); float opening = pow(max(dot(d, sun), 0.0), 48.0); c += vec3(0.35, 0.25, 0.13) * opening; gl_FragColor = vec4(c, 1.0); }' })); scene.background = null; }
  else { skyObj = new Sky(); skyObj.scale.setScalar(620); const u = skyObj.material.uniforms; u.turbidity.value = K.turb; u.rayleigh.value = K.ray; u.mieCoefficient.value = K.mie; u.mieDirectionalG.value = 0.82; u.sunPosition.value.copy(sunDir); skyObj.material.fog = false; scene.background = null; }
  group.add(skyObj); let clouds = null;
  if (!K.space) { // a drifting cloud deck, lit warm on the side facing the sun
    clouds = new THREE.Mesh(new THREE.SphereGeometry(590, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, toneMapped: false, uniforms: { uTime: { value: 0 }, uSun: { value: sunDir.clone() }, uLit: { value: new THREE.Color(K.sun).multiplyScalar(K.storm ? 0.14 : K.night ? 0.035 : 1) }, uDark: { value: new THREE.Color(K.hemi[0]).multiplyScalar(K.storm ? 0.18 : K.night ? 0.045 : 0.55) }, uCover: { value: K.cloud == null ? 0.5 : K.cloud } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vD; uniform float uTime; uniform vec3 uSun; uniform vec3 uLit; uniform vec3 uDark; uniform float uCover;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float f(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += n(p) * a; p = p * 2.03 + 7.1; a *= 0.5; } return v; }
        void main(){ vec3 d = normalize(vD); if (d.y < 0.015) discard; vec2 uv = d.xz / (d.y + 0.16) * 0.9 + vec2(uTime * 0.006, uTime * 0.002); float c = f(uv), c2 = f(uv + uSun.xz * 0.12);
          float a = smoothstep(1.0 - uCover - 0.08, 1.0 - uCover + 0.2, c) * smoothstep(0.015, 0.2, d.y); float lit = clamp((c - c2) * 4.0 + 0.55, 0.0, 1.0); float s = pow(max(dot(d, normalize(uSun)), 0.0), 6.0);
          vec3 col = mix(uDark, uLit * 1.5, lit) + uLit * s * 2.2; gl_FragColor = vec4(col, a * 0.92); }` })); clouds.renderOrder = 1; group.add(clouds);
    const fill = new THREE.DirectionalLight(K.hemi[0], K.rain ? 0.55 : 0.85); fill.position.set(-sunDir.x, 0.7, -sunDir.z); group.add(fill); }
  // Light the whole scene from the sky itself, so metal picks up real reflections.
  const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); if (K.space || K.night || K.storm) { envScene.background = new THREE.Color(K.storm ? 0x647284 : K.night ? 0x344760 : 0x0a0d14); const l = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), new THREE.MeshBasicMaterial({ color: K.storm ? 0xafb7c4 : K.night ? 0x9ab5db : 0xffffff })); l.position.copy(sunDir).multiplyScalar(200); envScene.add(l); } else { const s2 = new Sky(); s2.scale.setScalar(620); for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) s2.material.uniforms[k].value = skyObj.material.uniforms[k].value; s2.material.uniforms.sunPosition.value.copy(sunDir); envScene.add(s2); }
  const envTarget = pm.fromScene(envScene, 0.04), env = envTarget.texture; scene.environment = env; scene.environmentIntensity = K.env; pm.dispose();
  envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  scene.fog = new THREE.FogExp2(K.fog, K.fogD);
  group.add(new THREE.HemisphereLight(K.hemi[0], K.hemi[1], K.hemi[2]));
  const sun = new THREE.DirectionalLight(K.sun, K.sunI); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 320 }); sun.shadow.camera.updateProjectionMatrix(); group.add(sun, sun.target);
  renderer.toneMappingExposure = K.exp; if (grade) grade.uniforms.uTint.value.set(K.tint[0], K.tint[1], K.tint[2]);
  // The shadow box follows the action so shadows stay sharp near you.
  return { sunDir, K, dispose() { envTarget.dispose(); }, hideDome() { skyObj.visible = false; if (clouds) clouds.visible = false; }, tick(t) { if (clouds) clouds.material.uniforms.uTime.value = t; }, follow(x, y, z) { if (clouds) clouds.position.set(x, 0, z); sun.target.position.set(x, y, z); sun.position.set(x + sunDir.x * 150, y + sunDir.y * 150, z + sunDir.z * 150); } }; }

// ---------- Scenery scattered across the field (instanced, so thousands cost almost nothing)
export function scatter(group, world, H, ARENA, avoid, tex) { const r = rng(world.length * 31 + 5), dummy = new THREE.Object3D();
  const place = (mesh, count, minS, maxS, sink, tilt) => { let n = 0, guard = 0; while (n < count && guard++ < count * 6) { const x = (r() * 2 - 1) * (ARENA - 6), z = (r() * 2 - 1) * (ARENA - 6); if (avoid(x, z)) continue; const s = minS + r() * (maxS - minS); dummy.position.set(x, H(x, z) - sink * s, z); dummy.rotation.set((r() - 0.5) * tilt, r() * 6.283, (r() - 0.5) * tilt); dummy.scale.set(s * (0.7 + r() * 0.6), s * (0.6 + r() * 0.7), s * (0.7 + r() * 0.6)); dummy.updateMatrix(); mesh.setMatrixAt(n++, dummy.matrix); } mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); };
  const rockG = new THREE.IcosahedronGeometry(1, 1), p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.78 + r() * 0.44; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); } rockG.computeVertexNormals();
  const rockCol = { la: 0x6e675a, kepler: 0x7a4a78, ceres: 0x77777c }[world] || 0x6e675a;
  place(new THREE.InstancedMesh(rockG, new THREE.MeshStandardMaterial({ color: rockCol, roughness: 0.95, bumpMap: tex.groundBump, bumpScale: 0.6 }), 420), 420, 0.25, 1.7, 0.35, 0.8);
  if (world === 'la') { // grass tufts: a few thin blades each. Palms: a curved trunk and a crown of drooping fronds.
    const blades = []; for (let i = 0; i < 6; i++) { const h = 0.45 + r() * 0.5, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0, 0, 0.05, 0, 0, 0.02 + r() * 0.1, h, 0], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); g.rotateX((r() - 0.5) * 0.7); g.rotateY(i * 1.05 + r()); g.translate((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25); blades.push(g); }
    const tm = new THREE.InstancedMesh(mergeGeometries(blades), new THREE.MeshStandardMaterial({ color: 0x5d6b2c, roughness: 1, side: THREE.DoubleSide }), 9000); place(tm, 9000, 0.5, 1.5, 0.02, 0.3); tm.castShadow = false;
    const bg = []; for (let i = 0; i < 5; i++) { const g = new THREE.IcosahedronGeometry(0.5 + r() * 0.35, 1); g.scale(1, 0.75, 1); g.translate((r() - 0.5) * 1.1, 0.35 + r() * 0.3, (r() - 0.5) * 1.1); bg.push(g); } place(new THREE.InstancedMesh(mergeGeometries(bg), new THREE.MeshStandardMaterial({ color: 0x3f6a2a, roughness: 0.95, flatShading: true }), 420), 420, 0.6, 1.5, 0.05, 0.2);
    const parts = [], fronds = []; let px = 0; for (let i = 0; i < 6; i++) { const seg = new THREE.CylinderGeometry(0.2 - i * 0.012, 0.24 - i * 0.012, 1.35, 7).toNonIndexed(); seg.rotateZ(-0.06 * i); seg.translate(px, 0.65 + i * 1.3, 0); px += 0.08 * i; parts.push(seg); }
    const top = 6 * 1.3 + 0.2, tx = px - 0.25; for (let i = 0; i < 12; i++) { const L = 3.2 + (i % 3) * 0.5, f = new THREE.PlaneGeometry(0.9, 1, 2, 7), q = f.attributes.position; for (let j = 0; j < q.count; j++) { const t = q.getY(j) + 0.5, w = q.getX(j) * (1 - t * 0.8); q.setXYZ(j, w, L * (0.3 * t - 0.62 * t * t) + (i % 2) * 0.35 * t - Math.abs(w) * 0.45, L * t * 0.85); } f.computeVertexNormals(); const g = f.toNonIndexed(); g.rotateY(i * 0.5236 + (i % 2) * 0.15); g.translate(tx, top, 0); fronds.push(g); }
    const nut = new THREE.SphereGeometry(0.34, 7, 5).toNonIndexed(); nut.translate(tx, top - 0.1, 0); parts.push(nut);
    const palm = mergeGeometries([mergeGeometries(parts), mergeGeometries(fronds)], true);
    place(new THREE.InstancedMesh(palm, [new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: 1, bumpMap: tex.groundBump, bumpScale: 0.8 }), new THREE.MeshStandardMaterial({ color: 0x47702c, roughness: 0.8, side: THREE.DoubleSide })], 90), 90, 0.8, 1.35, 0.03, 0.12); }
  if (world === 'kepler') { const cr = new THREE.ConeGeometry(0.5, 2.6, 5); cr.translate(0, 1.2, 0); place(new THREE.InstancedMesh(cr, new THREE.MeshStandardMaterial({ color: 0x9a6cff, emissive: 0x5a2cd0, emissiveIntensity: 0.22, roughness: 0.38, metalness: 0.15 }), 520), 520, 0.4, 2.2, 0.1, 0.7); }
  if (world === 'ceres') { const cr = new THREE.TorusGeometry(1, 0.22, 6, 18); cr.rotateX(Math.PI / 2); place(new THREE.InstancedMesh(cr, new THREE.MeshStandardMaterial({ color: 0x5c5c62, roughness: 1 }), 90), 90, 1.2, 4.5, -0.02, 0.05); } }

// ---------- Particles: one pooled point cloud for sparks, smoke, fire and debris
export function createParticles(scene, tex) { const MAX = 3600, pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX), alpha = new Float32Array(MAX), type = new Float32Array(MAX), P = [];
  for (let i = 0; i < MAX; i++) P.push({ life: 0 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('psize', new THREE.BufferAttribute(size, 1)); geo.setAttribute('palpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('ptype', new THREE.BufferAttribute(type, 1));
  const mk = mode => new THREE.ShaderMaterial({ uniforms: { map: { value: tex.dot }, uScale: { value: 600 }, uMode: { value: mode }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: mode ? THREE.NormalBlending : THREE.AdditiveBlending, vertexColors: true,
    vertexShader: 'attribute float psize; attribute float palpha; attribute float ptype; varying vec3 vC; varying float vA; varying float vType; uniform float uScale; void main(){ vC = color; vA = palpha; vType = ptype; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(256.0, psize * uScale / max(0.1, -mv.z)); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform sampler2D map; uniform float uMode; uniform float uTime; varying vec3 vC; varying float vA; varying float vType;
      void main(){ if ((uMode > 0.5 ? abs(vType - 1.0) > 0.1 : abs(vType - 1.0) < 0.1) || vA <= 0.0) discard;
        vec4 t = texture2D(map, gl_PointCoord); vec3 c = vC;
        if (vType > 1.5) { float h = 1.0 - gl_PointCoord.y; float sway = sin(h * 13.0 + uTime * 17.0 + vC.r * 7.0) * 0.06 * h;
          float width = (1.0 - h) * 0.36 + 0.025; float edge = abs(gl_PointCoord.x - 0.5 + sway);
          t.a = (1.0 - smoothstep(width - 0.055, width, edge)) * smoothstep(0.0, 0.12, h) * (1.0 - h);
          c += vec3(0.5, 0.3, 0.06) * pow(1.0 - h, 3.0); }
        gl_FragColor = vec4(c, t.a * vA); }` });
  const pts = new THREE.Points(geo, mk(0)), smoke = new THREE.Points(geo, mk(1)); for (const p of [pts, smoke]) { p.frustumCulled = false; scene.add(p); } smoke.name = 'normal-blended-smoke'; smoke.renderOrder = 9; pts.renderOrder = 10;
  let cur = 0; const c = new THREE.Color();
  function emit(x, y, z, o) { const n = o.n || 1; for (let i = 0; i < n; i++) { const p = P[cur]; cur = (cur + 1) % MAX; const sp = o.speed || 0, a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), k = sp * (0.35 + Math.random() * 0.65);
      p.x = x + (Math.random() - 0.5) * (o.spread || 0); p.y = y + (Math.random() - 0.5) * (o.spread || 0); p.z = z + (Math.random() - 0.5) * (o.spread || 0); p.vx = s * Math.cos(a) * k + (o.vel ? o.vel[0] : 0); p.vy = Math.abs(u) * k * (o.up == null ? 1 : o.up) + (o.lift || 0) + (o.vel ? o.vel[1] : 0); p.vz = s * Math.sin(a) * k + (o.vel ? o.vel[2] : 0);
      p.life = p.max = (o.life || 0.5) * (0.6 + Math.random() * 0.8); p.s0 = o.size || 0.4; p.s1 = o.size1 == null ? p.s0 * 0.3 : o.size1; p.g = o.gravity == null ? 9 : o.gravity; p.drag = o.drag || 0; c.set(o.color || 0xffffff); p.r = c.r * (o.bright || 1); p.gc = c.g * (o.bright || 1); p.b = c.b * (o.bright || 1); p.a = o.alpha == null ? 1 : o.alpha; type[(cur + MAX - 1) % MAX] = o.smoke ? 1 : o.flame ? 2 : 0; } }
  function update(dt) { pts.material.uniforms.uTime.value += dt; for (let i = 0; i < MAX; i++) { const p = P[i]; if (p.life <= 0) { alpha[i] = 0; size[i] = 0; continue; } p.life -= dt; const k = 1 - Math.max(0, p.life) / p.max; p.vy -= p.g * dt; const dr = 1 - p.drag * dt; p.vx *= dr; p.vy *= dr; p.vz *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; col[i * 3] = p.r; col[i * 3 + 1] = p.gc; col[i * 3 + 2] = p.b; size[i] = p.s0 + (p.s1 - p.s0) * k; alpha[i] = p.a * (1 - k * k); }
    for (const n of ['position', 'color', 'psize', 'palpha', 'ptype']) geo.attributes[n].needsUpdate = true; }
  function clear() { for (const p of P) p.life = 0; }
  return { emit, update, clear, get active() { return P.filter(p => p.life > 0).length; }, setScale(h) { pts.material.uniforms.uScale.value = smoke.material.uniforms.uScale.value = h * 0.9; } }; }

// ---------- Ground decals (scorch marks), pooled
export function createDecals(scene, tex, H) { const pool = [], MAX = 60; let cur = 0; const mat = new THREE.MeshBasicMaterial({ map: tex.scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, fog: true });
  return { add(x, z, r) { let m = pool[cur]; if (!m) { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); pool[cur] = m; } cur = (cur + 1) % MAX; m.visible = true; m.position.set(x, H(x, z) + 0.06, z); m.scale.set(r * 2.2, r * 2.2, 1); m.rotation.z = Math.random() * 6.283; }, clear() { for (const m of pool) if (m) m.visible = false; } }; }
