// Recon Scan: a survey pulse that sweeps out from where it was called. While it runs, the scene's depth is drawn once more
// at half resolution; a post-processing pass turns each pixel back into a world position, so the pulse can light every
// surface it crosses: a bright leading band, a grid of dots behind it and the edges of buildings traced in cyan.
// The game marks the bugs the front passes (see game.js).
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FRAG = `
varying vec2 vUv; uniform sampler2D tDiffuse, tDepth; uniform mat4 uProjInv, uCamWorld; uniform vec3 uOrigin; uniform float uFront, uFade, uAmount; uniform vec2 uTexel;
vec3 worldAt(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w; return (uCamWorld * vec4(v.xyz, 1.0)).xyz; }
void main() {
  vec4 base = texture2D(tDiffuse, vUv); float d = texture2D(tDepth, vUv).x;
  if (uAmount <= 0.0 || d >= 0.9999) { gl_FragColor = base; return; }
  vec3 p = worldAt(vUv); float dist = length(p.xz - uOrigin.xz), behind = uFront - dist;
  float lead = smoothstep(-2.5, 0.0, behind) * (1.0 - smoothstep(0.0, 1.2, behind));             // the bright front
  float trail = smoothstep(0.0, 3.0, behind) * (1.0 - smoothstep(6.0, 32.0, behind)) * uFade;     // what it has just passed
  // dots on a 1.5 m world grid (picked by the surface's dominant direction), and thin grid lines
  vec3 g = fract(p / 1.5) - 0.5; vec3 n = normalize(cross(dFdx(p), dFdy(p))); vec3 a = abs(n);
  vec2 q = a.y > max(a.x, a.z) ? g.xz : a.x > a.z ? g.zy : g.xy; float dots = 1.0 - smoothstep(0.05, 0.11, length(q));
  float lines = 1.0 - smoothstep(0.0, 0.035, min(abs(q.x), abs(q.y)));
  // building and prop outlines from jumps in depth
  float e = 0.0; vec3 px = worldAt(vUv + vec2(uTexel.x, 0.0)), py = worldAt(vUv + vec2(0.0, uTexel.y)); e = smoothstep(0.6, 2.5, max(length(px - p), length(py - p)) / max(1.0, length(p - uCamWorld[3].xyz) * 0.05));
  vec3 cyan = vec3(0.35, 0.95, 1.0);
  vec3 add = cyan * (lead * (1.4 + 2.0 * dots + e * 2.0) + trail * (dots * 0.9 + lines * 0.07 + e * 1.1));
  gl_FragColor = vec4(base.rgb * (1.0 - 0.25 * trail) + add * uAmount, base.a);
}`;

export function createScan(renderer) {
  const rt = new THREE.WebGLRenderTarget(64, 64, { depthBuffer: true }); rt.depthTexture = new THREE.DepthTexture(64, 64); rt.depthTexture.type = THREE.UnsignedIntType;
  const depthMat = new THREE.MeshDepthMaterial(), size = new THREE.Vector2();
  const pass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uOrigin: { value: new THREE.Vector3() }, uFront: { value: 0 }, uFade: { value: 1 }, uAmount: { value: 0 }, uTexel: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: FRAG });
  pass.uniforms.tDepth.value = rt.depthTexture; pass.enabled = false;
  const U = pass.uniforms; let t = -1, ox = 0, oz = 0, oy = 0;
  const RANGE = 190, DUR = 5.5;
  return {
    pass, RANGE,
    start(x, y, z) { t = 0; ox = x; oy = y; oz = z; },
    get active() { return t >= 0; },
    get front() { return t < 0 ? -1 : RANGE * Math.min(1, t / DUR) ** 0.8; },
    get origin() { return [ox, oz]; },
    update(dt, scene, camera) {
      if (t < 0) { pass.enabled = false; return; }
      t += dt; if (t > DUR + 2.5) { t = -1; pass.enabled = false; return; }
      renderer.getDrawingBufferSize(size); const w = Math.max(64, size.x >> 1), h = Math.max(64, size.y >> 1); if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
      // depth of the scene from the player's camera, at half resolution
      const prev = renderer.getRenderTarget(), ov = scene.overrideMaterial, bg = scene.background, auto = renderer.shadowMap.autoUpdate;
      scene.overrideMaterial = depthMat; scene.background = null; renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(prev); scene.overrideMaterial = ov; scene.background = bg; renderer.shadowMap.autoUpdate = auto;
      U.uProjInv.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld); U.uOrigin.value.set(ox, oy, oz); U.uTexel.value.set(1 / w, 1 / h);
      U.uFront.value = this.front; U.uFade.value = 1 - Math.max(0, (t - DUR) / 2.5); U.uAmount.value = 1; pass.enabled = true;
    },
    dispose() { rt.dispose(); depthMat.dispose(); }
  };
}
