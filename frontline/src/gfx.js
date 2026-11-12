// Frontline graphics: everything visual that is generated in code.
// Renderer and post-processing, sky and image-based lighting, procedural textures, scattered scenery, particles.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

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
const GradeShader = { uniforms: { tDiffuse: { value: null }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uTime: { value: 0 }, uHurt: { value: 0 }, uVig: { value: 0.9 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uTint; uniform float uTime; uniform float uHurt; uniform float uVig; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 d = vUv - 0.5; float r = dot(d, d);
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * r * 0.004).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * r * 0.004).b);
      c *= uTint; c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.12); c = (c - 0.5) * 1.06 + 0.5;
      c *= 1.0 - smoothstep(0.18, 0.75, r) * uVig; c += (hash(vUv * 900.0 + uTime) - 0.5) * 0.035;
      c = mix(c, vec3(0.9, 0.12, 0.08), uHurt * smoothstep(0.08, 0.6, r));
      gl_FragColor = vec4(c, 1.0); }` };
export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.55, 1.35); composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader); composer.addPass(grade); composer.addPass(new OutputPass());
  return { composer, bloom, grade, resize(w, h) { composer.setSize(w, h); bloom.setSize(w, h); } };
}

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
  // Soft round sprite for particles, and a scorch mark for the ground.
  T.dot = canvasTex(64, (g, Z) => { const gr = g.createRadialGradient(Z / 2, Z / 2, 0, Z / 2, Z / 2, Z / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Z, Z); }); T.dot.wrapS = T.dot.wrapT = THREE.ClampToEdgeWrapping;
  T.scorch = canvasTex(128, (g, Z) => { const gr = g.createRadialGradient(Z / 2, Z / 2, 4, Z / 2, Z / 2, Z / 2); gr.addColorStop(0, 'rgba(8,6,5,0.92)'); gr.addColorStop(0.5, 'rgba(14,11,9,0.6)'); gr.addColorStop(1, 'rgba(14,11,9,0)'); g.fillStyle = gr; g.fillRect(0, 0, Z, Z); const r = rng(3); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(10,8,6,' + (0.2 + r() * 0.4) + ')'; g.lineWidth = 1 + r() * 2; const a = r() * 6.28, l = Z * (0.25 + r() * 0.24); g.beginPath(); g.moveTo(Z / 2, Z / 2); g.lineTo(Z / 2 + Math.cos(a) * l, Z / 2 + Math.sin(a) * l); g.stroke(); } }); T.scorch.wrapS = T.scorch.wrapT = THREE.ClampToEdgeWrapping;
  return T;
}

// ---------- Sky, sun and image-based lighting
const SKIES = {
  la: { elev: 22, azim: 38, turb: 5, ray: 1.6, mie: 0.004, sun: 0xffe2b8, sunI: 2.6, hemi: [0xbfd6f2, 0x4a4030, 0.5], fog: 0x7f95ad, fogD: 0.0034, tint: [1.03, 1.0, 0.96], exp: 0.42, env: 0.55 },
  kepler: { elev: 13, azim: 325, turb: 8, ray: 3.0, mie: 0.012, sun: 0xffb0d8, sunI: 2.4, hemi: [0xc8a0ff, 0x402048, 0.5], fog: 0x6a4f88, fogD: 0.0038, tint: [1.14, 0.84, 1.22], exp: 0.42, env: 0.55 },
  ceres: { elev: 30, azim: 50, sun: 0xdcebff, sunI: 3.2, hemi: [0x5a6f96, 0x18181c, 0.35], fog: 0x05070b, fogD: 0.0016, tint: [0.96, 1.0, 1.08], exp: 0.8, env: 0.3, space: true } };
export function buildSky(renderer, scene, group, world, grade) { const K = SKIES[world] || SKIES.la, phi = THREE.MathUtils.degToRad(90 - K.elev), theta = THREE.MathUtils.degToRad(K.azim), sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  let skyObj;
  if (K.space) { skyObj = new THREE.Group(); const n = 2600, pos = new Float32Array(n * 3), r = rng(99); for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u); pos[i * 3] = s * Math.cos(a) * 560; pos[i * 3 + 1] = Math.abs(u) * 560; pos[i * 3 + 2] = s * Math.sin(a) * 560; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); skyObj.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, toneMapped: false })));
    const planet = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), new THREE.MeshStandardMaterial({ color: 0xc8905a, roughness: 1, emissive: 0x3a2412, emissiveIntensity: 0.6, fog: false })); planet.position.set(-260, 70, -470); skyObj.add(planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(150, 215, 96), new THREE.MeshBasicMaterial({ color: 0xd8c0a0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false })); ring.position.copy(planet.position); ring.rotation.set(1.25, 0.3, 0); skyObj.add(ring); scene.background = new THREE.Color(0x020308); }
  else { skyObj = new Sky(); skyObj.scale.setScalar(620); const u = skyObj.material.uniforms; u.turbidity.value = K.turb; u.rayleigh.value = K.ray; u.mieCoefficient.value = K.mie; u.mieDirectionalG.value = 0.82; u.sunPosition.value.copy(sunDir); skyObj.material.fog = false; scene.background = null; }
  group.add(skyObj);
  // Light the whole scene from the sky itself, so metal picks up real reflections.
  const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); if (K.space) { envScene.background = new THREE.Color(0x0a0d14); const l = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); l.position.copy(sunDir).multiplyScalar(200); envScene.add(l); } else { const s2 = new Sky(); s2.scale.setScalar(620); for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) s2.material.uniforms[k].value = skyObj.material.uniforms[k].value; s2.material.uniforms.sunPosition.value.copy(sunDir); envScene.add(s2); }
  const env = pm.fromScene(envScene, 0.04).texture; scene.environment = env; scene.environmentIntensity = K.env; pm.dispose();
  scene.fog = new THREE.FogExp2(K.fog, K.fogD);
  group.add(new THREE.HemisphereLight(K.hemi[0], K.hemi[1], K.hemi[2]));
  const sun = new THREE.DirectionalLight(K.sun, K.sunI); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 320 }); sun.shadow.camera.updateProjectionMatrix(); group.add(sun, sun.target);
  renderer.toneMappingExposure = K.exp; if (grade) grade.uniforms.uTint.value.set(K.tint[0], K.tint[1], K.tint[2]);
  // The shadow box follows the action so shadows stay sharp near you.
  return { sunDir, follow(x, y, z) { sun.target.position.set(x, y, z); sun.position.set(x + sunDir.x * 150, y + sunDir.y * 150, z + sunDir.z * 150); } }; }

// ---------- Scenery scattered across the field (instanced, so thousands cost almost nothing)
export function scatter(group, world, H, ARENA, avoid, tex) { const r = rng(world.length * 31 + 5), dummy = new THREE.Object3D();
  const place = (mesh, count, minS, maxS, sink, tilt) => { let n = 0, guard = 0; while (n < count && guard++ < count * 6) { const x = (r() * 2 - 1) * (ARENA - 6), z = (r() * 2 - 1) * (ARENA - 6); if (avoid(x, z)) continue; const s = minS + r() * (maxS - minS); dummy.position.set(x, H(x, z) - sink * s, z); dummy.rotation.set((r() - 0.5) * tilt, r() * 6.283, (r() - 0.5) * tilt); dummy.scale.set(s * (0.7 + r() * 0.6), s * (0.6 + r() * 0.7), s * (0.7 + r() * 0.6)); dummy.updateMatrix(); mesh.setMatrixAt(n++, dummy.matrix); } mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); };
  const rockG = new THREE.IcosahedronGeometry(1, 1), p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.78 + r() * 0.44; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); } rockG.computeVertexNormals();
  const rockCol = { la: 0x6e675a, kepler: 0x7a4a78, ceres: 0x77777c }[world] || 0x6e675a;
  place(new THREE.InstancedMesh(rockG, new THREE.MeshStandardMaterial({ color: rockCol, roughness: 0.95, bumpMap: tex.groundBump, bumpScale: 0.6 }), 420), 420, 0.25, 1.7, 0.35, 0.8);
  if (world === 'la') { const tuft = new THREE.ConeGeometry(0.34, 0.9, 5); tuft.translate(0, 0.4, 0); place(new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: 0x7c8448, roughness: 1 }), 1800), 1800, 0.4, 1.1, 0.05, 0.5);
    const trunk = new THREE.CylinderGeometry(0.1, 0.22, 3.4, 6); trunk.translate(0, 1.7, 0); place(new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 1 }), 70), 70, 0.8, 1.6, 0.05, 0.25); }
  if (world === 'kepler') { const cr = new THREE.ConeGeometry(0.5, 2.6, 5); cr.translate(0, 1.2, 0); place(new THREE.InstancedMesh(cr, new THREE.MeshStandardMaterial({ color: 0x9a6cff, emissive: 0x5a2cd0, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2 }), 520), 520, 0.4, 2.2, 0.1, 0.7); }
  if (world === 'ceres') { const cr = new THREE.TorusGeometry(1, 0.22, 6, 18); cr.rotateX(Math.PI / 2); place(new THREE.InstancedMesh(cr, new THREE.MeshStandardMaterial({ color: 0x5c5c62, roughness: 1 }), 90), 90, 1.2, 4.5, -0.02, 0.05); } }

// ---------- Particles: one pooled point cloud for sparks, smoke, fire and debris
export function createParticles(scene, tex) { const MAX = 2600, pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX), alpha = new Float32Array(MAX), P = [];
  for (let i = 0; i < MAX; i++) P.push({ life: 0 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('psize', new THREE.BufferAttribute(size, 1)); geo.setAttribute('palpha', new THREE.BufferAttribute(alpha, 1));
  const mk = blend => new THREE.ShaderMaterial({ uniforms: { map: { value: tex.dot }, uScale: { value: 600 } }, transparent: true, depthWrite: false, blending: blend, vertexColors: true,
    vertexShader: 'attribute float psize; attribute float palpha; varying vec3 vC; varying float vA; uniform float uScale; void main(){ vC = color; vA = palpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = psize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); }' });
  const pts = new THREE.Points(geo, mk(THREE.AdditiveBlending)); pts.frustumCulled = false; pts.renderOrder = 10; scene.add(pts);
  let cur = 0; const c = new THREE.Color();
  function emit(x, y, z, o) { const n = o.n || 1; for (let i = 0; i < n; i++) { const p = P[cur]; cur = (cur + 1) % MAX; const sp = o.speed || 0, a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), k = sp * (0.35 + Math.random() * 0.65);
      p.x = x + (Math.random() - 0.5) * (o.spread || 0); p.y = y + (Math.random() - 0.5) * (o.spread || 0); p.z = z + (Math.random() - 0.5) * (o.spread || 0); p.vx = s * Math.cos(a) * k; p.vy = Math.abs(u) * k * (o.up == null ? 1 : o.up) + (o.lift || 0); p.vz = s * Math.sin(a) * k;
      p.life = p.max = (o.life || 0.5) * (0.6 + Math.random() * 0.8); p.s0 = o.size || 0.4; p.s1 = o.size1 == null ? p.s0 * 0.3 : o.size1; p.g = o.gravity == null ? 9 : o.gravity; p.drag = o.drag || 0; c.set(o.color || 0xffffff); p.r = c.r * (o.bright || 1); p.gc = c.g * (o.bright || 1); p.b = c.b * (o.bright || 1); p.a = o.alpha == null ? 1 : o.alpha; } }
  function update(dt) { for (let i = 0; i < MAX; i++) { const p = P[i]; if (p.life <= 0) { alpha[i] = 0; size[i] = 0; continue; } p.life -= dt; const k = 1 - Math.max(0, p.life) / p.max; p.vy -= p.g * dt; const dr = 1 - p.drag * dt; p.vx *= dr; p.vy *= dr; p.vz *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; col[i * 3] = p.r; col[i * 3 + 1] = p.gc; col[i * 3 + 2] = p.b; size[i] = p.s0 + (p.s1 - p.s0) * k; alpha[i] = p.a * (1 - k * k); }
    for (const n of ['position', 'color', 'psize', 'palpha']) geo.attributes[n].needsUpdate = true; }
  function clear() { for (const p of P) p.life = 0; }
  return { emit, update, clear, setScale(h) { pts.material.uniforms.uScale.value = h * 0.9; } }; }

// ---------- Ground decals (scorch marks), pooled
export function createDecals(scene, tex, H) { const pool = [], MAX = 60; let cur = 0; const mat = new THREE.MeshBasicMaterial({ map: tex.scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, fog: true });
  return { add(x, z, r) { let m = pool[cur]; if (!m) { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); pool[cur] = m; } cur = (cur + 1) % MAX; m.visible = true; m.position.set(x, H(x, z) + 0.06, z); m.scale.set(r * 2.2, r * 2.2, 1); m.rotation.z = Math.random() * 6.283; }, clear() { for (const m of pool) if (m) m.visible = false; } }; }
