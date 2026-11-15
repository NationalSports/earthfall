// Painted effect sheets (frontline/assets/r4/fx-*.webp): 8x8 frames played back on camera-facing quads from a fixed pool.
import * as THREE from 'three';
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = 'uniform sampler2D map; uniform float frame, fade, gain; varying vec2 vUv; void main(){ float f = floor(frame); vec2 cell = vec2(mod(f, 8.0), 7.0 - floor(f / 8.0)); vec2 uv = (cell * 128.0 + 16.0 + vUv * 96.0) / 1024.0; vec4 c = texture2D(map, uv); gl_FragColor = vec4(c.rgb * gain, c.a * fade); }';
const KIND = { explosion: { add: true, gain: 2.4 }, muzzle: { add: true, gain: 3 }, sparks: { add: true, gain: 2.5 }, jet: { add: true, gain: 2 }, smoke: { gain: 0.55 }, blood: { gain: 1 }, dust: { gain: 0.8 }, acid: { gain: 1.4 } };
export function createFlipbooks(scene, tex) {
  const geo = new THREE.PlaneGeometry(1, 1), pool = [], N = 56; let next = 0;
  for (let i = 0; i < N; i++) { const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { map: { value: null }, frame: { value: 0 }, fade: { value: 1 }, gain: { value: 1 } }, transparent: true, depthWrite: false }); const m = new THREE.Mesh(geo, mat); m.visible = false; m.frustumCulled = false; m.renderOrder = 5; scene.add(m); pool.push({ m, t: 0, d: 0 }); }
  const maps = {}; for (const k in KIND) { const t = tex('fx-' + k); if (t) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; maps[k] = t; } }
  // o: dur seconds, rise m/s, grow (size multiplier by the end), delay, frames (how many of the 64 to play), spin
  function spawn(kind, x, y, z, size, o) { const map = maps[kind]; if (!map) return false; o = o || {}; const p = pool[next]; next = (next + 1) % N; const K = KIND[kind], u = p.m.material.uniforms;
    u.map.value = map; u.gain.value = K.gain * (o.gain || 1); p.m.material.blending = K.add ? THREE.AdditiveBlending : THREE.NormalBlending; p.m.position.set(x, y, z); p.t = -(o.delay || 0); p.d = o.dur || 0.8; p.size = size; p.grow = o.grow || 1; p.rise = o.rise || 0; p.frames = o.frames || 64; p.roll = o.spin === false ? 0 : Math.random() * 6.28; p.m.visible = false; return true; }
  function update(dt, camera) { for (const p of pool) { if (p.d <= 0) continue; p.t += dt; if (p.t < 0) continue; const k = p.t / p.d; if (k >= 1) { p.d = 0; p.m.visible = false; continue; }
      const u = p.m.material.uniforms; u.frame.value = Math.min(p.frames - 1, k * p.frames); u.fade.value = k > 0.75 ? (1 - k) * 4 : 1; p.m.visible = true; p.m.position.y += p.rise * dt; p.m.quaternion.copy(camera.quaternion); p.m.rotateZ(p.roll); p.m.scale.setScalar(p.size * (1 + (p.grow - 1) * k)); } }
  return { spawn, update, has: k => !!maps[k] };
}
