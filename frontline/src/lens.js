// Rain on the camera lens: beads that sit on the glass and runners that slide down it, bending the picture behind them.
// Two steps each frame while it is wet: (1) draw a small "water field" (slope X, slope Y, water height) at half resolution,
// (2) a post-processing pass looks the scene up through that field, so neon and lamps smear through the drops.
// It wets faster at speed and dries slowly when the rain stops; with no water both steps are skipped.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const FIELD = `
varying vec2 vUv; uniform float uTime, uWet, uAspect; uniform vec2 uTexel;
float h1(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
vec3 h3(vec2 p) { return vec3(h1(p), h1(p + 17.17), h1(p + 51.91)); }
// sitting beads on a jittered grid; each appears, holds, and slowly shrinks away
float beads(vec2 p, float cell, float density, float seed) {
  vec2 q = p / cell, id = floor(q), f = fract(q) - 0.5; float h = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)), c = id + o; vec3 r = h3(c + seed);
    if (r.x > density) continue;
    float life = fract(uTime * (0.05 + r.y * 0.08) + r.z), size = (0.18 + 0.3 * r.y) * smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.7, 1.0, life));
    vec2 d = f - o - (r.yz - 0.5) * 0.6; d.y *= 1.15;
    float k = 1.0 - dot(d, d) / max(1e-4, size * size); h = max(h, sqrt(max(k, 0.0)) * size * 2.0);
  }
  return h;
}
// runners: a round head sliding down, a thin wavy tail above it, and a few beads left behind
float runners(vec2 p) {
  float w = 0.075, col = floor(p.x / w); vec3 r = h3(vec2(col, 7.0)); float h = 0.0;
  if (r.x > 0.2 + 0.3 * uWet) return 0.0;
  float speed = 0.12 + 0.35 * r.y, y = 1.25 - fract(uTime * speed * (0.5 + uWet) + r.z) * 1.6;
  float x = (col + 0.5 + (r.y - 0.5) * 0.5) * w + sin(p.y * 23.0 + r.z * 6.0) * 0.006;
  vec2 d = vec2((p.x - x) * 1.0, (p.y - y) * 0.8); float rh = 0.013 + 0.008 * r.z;
  h = max(h, sqrt(max(0.0, 1.0 - dot(d, d) / (rh * rh))) * rh * 2.4);
  float above = p.y - y; if (above > 0.0 && above < 0.22) { float tw = rh * 0.38 * (1.0 - above / 0.22); h = max(h, sqrt(max(0.0, 1.0 - pow((p.x - x) / max(tw, 1e-4), 2.0))) * tw * 1.6); }
  return h;
}
float field(vec2 uv) { vec2 p = vec2(uv.x * uAspect, uv.y); return max(max(beads(p, 0.06, 0.22 * uWet, 1.0), beads(p, 0.024, 0.16 * uWet, 9.0) * 0.6), runners(p)); }
void main() {
  float h = field(vUv), hx = field(vUv + vec2(uTexel.x, 0.0)), hy = field(vUv + vec2(0.0, uTexel.y));
  vec2 slope = vec2(hx - h, hy - h) / (uTexel.y * 40.0);
  gl_FragColor = vec4(0.5 + clamp(slope, -0.5, 0.5), clamp(h * 12.0, 0.0, 1.0), 1.0);
}`;

const COMPOSITE = `
varying vec2 vUv; uniform sampler2D tDiffuse, tField; uniform float uAmount;
void main() {
  vec4 f = texture2D(tField, vUv); vec2 n = (f.rg - 0.5) * 2.0; float wet = f.b * uAmount;
  // a bead acts like a small lens: it shows a squeezed, flipped view of what is behind it
  vec2 uv = vUv - n * 0.05 * uAmount - (vUv - 0.5) * wet * 0.02;
  vec3 c = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
  c *= 1.0 - 0.07 * smoothstep(0.2, 0.7, length(n)) * uAmount;            // dark rim where the glass curves away
  c += vec3(0.9, 0.95, 1.0) * pow(max(0.0, -n.y * 0.7 + n.x * 0.3), 6.0) * 0.12 * uAmount;  // a pinprick highlight on each bead
  gl_FragColor = vec4(c, texture2D(tDiffuse, vUv).a);
}`;

export function createLensRain(renderer) {
  const fieldRT = new THREE.WebGLRenderTarget(64, 64, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });
  const U = { uTime: { value: 0 }, uWet: { value: 0 }, uAspect: { value: 1 }, uTexel: { value: new THREE.Vector2() } };
  const quad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FIELD, depthTest: false, depthWrite: false }));
  const pass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, tField: { value: fieldRT.texture }, uAmount: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: COMPOSITE });
  pass.uniforms.tField.value = fieldRT.texture; // ShaderPass copies its uniforms and drops render-target textures, so set it after
  pass.enabled = false;
  let wet = 0, phase = 0; const size = new THREE.Vector2();
  return {
    pass,
    // rain 0..1, speed in m/s, exposed: false under cover
    update(dt, rain, speed, exposed) {
      dt = Math.min(dt, 0.1);
      const sp = Math.min(1, Math.max(0, (speed - 2) / 40)), target = exposed ? rain * (0.35 + 0.65 * sp) : 0, rate = target > wet ? 1.2 : 0.35;
      wet += (target - wet) * -Math.expm1(-rate * dt); if (target === 0 && wet < 0.002) wet = 0;
      phase += dt * (0.9 + 2.4 * wet);
      pass.enabled = wet > 0.002; if (!pass.enabled) return;
      renderer.getDrawingBufferSize(size); const w = Math.max(64, size.x >> 1), h = Math.max(64, size.y >> 1); if (fieldRT.width !== w || fieldRT.height !== h) fieldRT.setSize(w, h);
      U.uTime.value = phase; U.uWet.value = wet; U.uAspect.value = size.x / size.y; U.uTexel.value.set(1 / w, 1 / h);
      pass.uniforms.uAmount.value = Math.min(1, wet * 3);
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(fieldRT); quad.render(renderer); renderer.setRenderTarget(prev);
    },
    get wetness() { return wet; },
    dispose() { fieldRT.dispose(); quad.dispose(); }
  };
}
