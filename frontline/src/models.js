// Earthfall: Frontline models. Everything here is built from code: jointed soldiers, the swarm, hives and turrets.
// Each model is a small skeleton of named joints. The pieces hanging off a joint are merged into one mesh per
// material, and the merged shapes are cached, so a hundred swarm on screen share the same geometry.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PI = Math.PI, UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const _o = new THREE.Object3D(), _q = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

// ---------- Shapes
const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r || 0.03, w / 2, h / 2, d / 2));
const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sph = (r, ws, hs) => new THREE.SphereGeometry(r, ws || 12, hs || 9);
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 10);
const cyl = (r1, r2, h, seg) => new THREE.CylinderGeometry(r1, r2, h, seg || 10);
const cone = (r, h, seg) => new THREE.ConeGeometry(r, h, seg || 6);
const torus = (r, t) => new THREE.TorusGeometry(r, t, 5, 16);
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 14);
const clean = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k); return n; };

// ---------- Sculpting tools: faceted crystal hulls, chamfered armour blocks, and blades cut from a drawn outline
const withUv = g => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
// a faceted solid wrapped around a set of points; pass mirror=true to give only the +x half
const hull = (pts, mirror) => { const v = []; for (const p of pts) { v.push(new THREE.Vector3(p[0], p[1], p[2])); if (mirror && p[0] !== 0) v.push(new THREE.Vector3(-p[0], p[1], p[2])); } return withUv(new ConvexGeometry(v)); };
// a box with every edge cut back, so plates catch light on their bevels
const cham = (w, h, d, c) => { const x = w / 2, y = h / 2, z = d / 2, p = []; c = Math.min(c, x * 0.9, y * 0.9, z * 0.9); for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) p.push([sx * (x - c), sy * y, sz * (z - c)], [sx * x, sy * (y - c), sz * (z - c)], [sx * (x - c), sy * (y - c), sz * z]); return hull(p); };
// a curved blade hanging down from the origin: scythe legs, horns, back spikes
const blade = (len, w, curve, thick, tipX) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.quadraticCurveTo(w / 2 + curve, -len * 0.5, tipX || 0, -len); sh.quadraticCurveTo(-w / 2 + curve * 0.55, -len * 0.5, -w / 2, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.45, bevelSize: Math.min(w * 0.3, thick * 0.9), bevelSegments: 1, curveSegments: 5, steps: 1 }); g.translate(0, 0, -thick / 2); return g; };
// a flat plate cut from an outline in the XY plane and given thickness, with bevelled edges
const cut = (pts, thick, bev) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: bev || thick * 0.35, bevelSize: bev || thick * 0.35, bevelSegments: 1, steps: 1 }); g.translate(0, 0, -thick / 2); return g; };

class Kit {
  constructor() { this.by = {}; }
  add(mat, geo, p, r, s) { _o.position.set(0, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1); if (p) _o.position.set(p[0], p[1], p[2]); if (r) _o.rotation.set(r[0], r[1], r[2]); if (typeof s === 'number') _o.scale.setScalar(s); else if (s) _o.scale.set(s[0], s[1], s[2]); _o.updateMatrix(); const g = clean(geo); g.applyMatrix4(_o.matrix); (this.by[mat] = this.by[mat] || []).push(g); return this; }
  // a tapered limb between two points
  seg(mat, a, b, r0, r1, sides) { _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); const len = _a.distanceTo(_b), g = clean(cyl(r1, r0, len, sides || 6)); _q.setFromUnitVectors(UP, _b.clone().sub(_a).normalize()); g.applyQuaternion(_q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); (this.by[mat] = this.by[mat] || []).push(g); return this; }
  // a blade from point a aimed at point b (its length is the distance between them)
  blade(mat, a, b, w, curve, thick) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], hd = Math.hypot(dx, dz), len = Math.hypot(hd, dy), g = clean(blade(len, w, curve, thick, 0)); g.rotateZ(Math.atan2(hd, -dy)); g.rotateY(-Math.atan2(dz, dx)); g.translate(a[0], a[1], a[2]); (this.by[mat] = this.by[mat] || []).push(g); return this; }
  bake() { const out = {}; for (const k in this.by) out[k] = mergeGeometries(this.by[k]); return out; }
}

// ---------- Skeletons
const CACHE = {};
function rig(key, def, M, over) {
  if (!CACHE[key]) { const nodes = []; def((n, p, at, shadow) => { const kit = new Kit(); nodes.push({ n, p, at, kit, shadow: shadow !== false }); return kit; }); CACHE[key] = nodes.map(d => ({ n: d.n, p: d.p, at: d.at, shadow: d.shadow, geo: d.kit.bake() })); }
  const root = new THREE.Group(), J = {};
  for (const d of CACHE[key]) { const g = new THREE.Group(); g.position.set(d.at[0], d.at[1], d.at[2]); for (const k in d.geo) { const m = new THREE.Mesh(d.geo[k], (over && over[k]) || M[k]); m.castShadow = d.shadow && k !== 'strip' && k !== 'bugGlow' && k !== 'visor'; m.receiveShadow = true; g.add(m); } (d.p ? J[d.p] : root).add(g); J[d.n] = g; }
  root.userData.J = J; return root;
}

// ---------- Soldier (faces -z). Materials: A main armour, D dark armour, under, gun, visor, strip.
const ARM1 = 0.36, ARM2 = 0.35, SHOULDER = [0.33, 0.56, 0], GUN_AT = [0.06, 0.36, -0.22], GRIP_R = new THREE.Vector3(0, -0.12, 0.06), GRIP_L = new THREE.Vector3(0, -0.09, -0.4);
function soldierDef(node, red) { // layered armour over a dark under-suit: every plate is a faceted hull or a chamfered block
  const X = (pts, sx) => pts.map(p => [p[0] * sx, p[1], p[2]]);
  let k = node('hips', null, [0, 1, 0]);
  k.add('under', cham(0.36, 0.2, 0.24, 0.05)).add('D', cham(0.42, 0.08, 0.3, 0.02), [0, 0.1, 0]).add('G', cham(0.09, 0.07, 0.03, 0.01), [0, 0.1, -0.155]).add('D', cham(0.2, 0.12, 0.08, 0.02), [0, 0.02, 0.17])
    .add('A', hull([[0.09, 0.02, -0.15], [0.06, -0.16, -0.13], [0, -0.2, -0.11], [0, 0.03, -0.17], [0.07, 0.0, -0.1]], true));
  for (const s of [-1, 1]) k.add('D', cham(0.1, 0.13, 0.07, 0.02), [s * 0.15, 0.02, -0.16]).add('D', cham(0.07, 0.13, 0.1, 0.02), [s * 0.22, 0.02, 0.04]).add('A', cham(0.07, 0.2, 0.2, 0.02), [s * 0.235, -0.1, 0], [0, 0, s * 0.12]).add('strip', bx(0.012, 0.05, 0.08), [s * 0.275, -0.1, 0]);
  for (const s of [-1, 1]) { const side = s < 0 ? 'L' : 'R';
    k = node('leg' + side, 'hips', [s * 0.15, -0.08, 0]);
    k.seg('under', [0, 0, 0], [0, -0.44, 0], 0.105, 0.085, 6).add('A', hull([[0.1, -0.04, -0.1], [0.115, -0.2, -0.13], [0.085, -0.38, -0.11], [0, -0.03, -0.13], [0, -0.2, -0.16], [0, -0.4, -0.125], [0.1, -0.2, -0.04]], true))
      .add('A', cham(0.05, 0.3, 0.17, 0.02), [s * 0.118, -0.2, 0]).add('D', cham(0.16, 0.26, 0.05, 0.02), [0, -0.2, 0.1]).add('D', cham(0.23, 0.035, 0.23, 0.01), [0, -0.09, 0]).add('D', cham(0.035, 0.22, 0.02, 0.008), [0, -0.2, -0.158]);
    if (s > 0) k.add('gun', cham(0.06, 0.2, 0.11, 0.02), [0.16, -0.2, 0.03]).add('G', cham(0.065, 0.03, 0.115, 0.008), [0.16, -0.12, 0.03]); else k.add('D', cham(0.06, 0.14, 0.1, 0.02), [-0.16, -0.22, 0.02]);
    k = node('shin' + side, 'leg' + side, [0, -0.44, 0]);
    k.add('G', hull([[0.078, 0.07, -0.1], [0.095, 0, -0.118], [0.078, -0.085, -0.1], [0, 0.1, -0.112], [0, -0.105, -0.112], [0, 0, -0.14], [0.06, 0, -0.05]], true)).seg('under', [0, 0, 0], [0, -0.4, 0], 0.085, 0.07, 6)
      .add('A', hull([[0.09, -0.09, -0.09], [0.102, -0.2, -0.1], [0.086, -0.36, -0.08], [0, -0.08, -0.11], [0, -0.2, -0.132], [0, -0.37, -0.1], [0.09, -0.1, 0.03], [0.08, -0.34, 0.04]], true))
      .add('D', cham(0.03, 0.24, 0.02, 0.008), [0, -0.22, -0.128]).add('strip', bx(0.024, 0.1, 0.012), [0, -0.3, -0.118]).add('D', cham(0.15, 0.22, 0.06, 0.02), [0, -0.22, 0.078]).add('D', cham(0.17, 0.06, 0.2, 0.02), [0, -0.385, 0])
      .add('A', hull([[0.095, -0.4, -0.2], [0.1, -0.47, -0.24], [0.1, -0.47, 0.11], [0.09, -0.38, 0.1], [0.07, -0.36, -0.1], [0, -0.37, -0.22]], true)).add('G', hull([[0.096, -0.42, -0.2], [0.102, -0.47, -0.25], [0.06, -0.43, -0.275], [0.07, -0.47, -0.28], [0, -0.42, -0.285]], true))
      .add('gun', cham(0.21, 0.035, 0.4, 0.01), [0, -0.487, -0.075]).add('D', cham(0.18, 0.08, 0.08, 0.02), [0, -0.44, 0.1]); }
  k = node('torso', 'hips', [0, 0.1, 0]);
  k.add('under', cham(0.32, 0.24, 0.22, 0.05), [0, 0.1, 0]); for (let i = 0; i < 3; i++) k.add('D', cham(0.25 - i * 0.02, 0.055, 0.04, 0.012), [0, 0.17 - i * 0.07, -0.115 + i * 0.004]);
  k.add('A', hull([[0.3, 0.56, -0.12], [0.31, 0.3, -0.16], [0.2, 0.2, -0.17], [0.3, 0.58, 0.12], [0.29, 0.26, 0.14], [0, 0.6, -0.17], [0, 0.22, -0.2], [0, 0.42, -0.225], [0.18, 0.6, 0.16], [0, 0.24, 0.17]], true))
    .add('D', hull([[0.2, 0.565, -0.2], [0.23, 0.44, -0.215], [0, 0.42, -0.25], [0, 0.585, -0.215], [0.1, 0.61, -0.19]], true)).add('G', cham(0.5, 0.03, 0.04, 0.01), [0, 0.385, -0.212]).add('G', hull([[0.08, 0.3, -0.2], [0, 0.26, -0.21], [0, 0.34, -0.22], [0.06, 0.34, -0.205]], true))
    .add('strip', bx(0.09, 0.022, 0.02), [0.11, 0.5, -0.232]).add('strip', bx(0.09, 0.022, 0.02), [-0.11, 0.5, -0.232]).add('D', cham(0.3, 0.09, 0.3, 0.04), [0, 0.64, 0.02]).add('D', cham(0.5, 0.4, 0.06, 0.02), [0, 0.42, 0.16]);
  for (const s of [-1, 1]) k.add('A', cham(0.05, 0.18, 0.16, 0.02), [s * 0.165, 0.1, -0.02]).add('D', cham(0.07, 0.06, 0.36, 0.02), [s * 0.2, 0.615, 0.04]).add('D', cham(0.05, 0.3, 0.04, 0.015), [s * 0.2, 0.46, -0.2], [0.1, 0, 0])
    .add('gun', cyl(0.055, 0.055, 0.36, 8), [s * 0.2, 0.36, 0.37]).add('G', cyl(0.058, 0.058, 0.04, 8), [s * 0.2, 0.55, 0.37]).add('gun', cyl(0.045, 0.065, 0.08, 8), [s * 0.2, 0.14, 0.37]).add('strip', bx(0.022, 0.14, 0.012), [s * 0.05, 0.42, 0.378]);
  k.add('A', cham(0.34, 0.46, 0.18, 0.04), [0, 0.4, 0.28]).add('D', cham(0.3, 0.1, 0.2, 0.03), [0, 0.67, 0.27]).add('G', cham(0.36, 0.04, 0.19, 0.01), [0, 0.21, 0.28]).add('D', cyl(0.06, 0.06, 0.34, 8), [0, 0.11, 0.3], [0, 0, PI / 2]).add('strip', bx(0.2, 0.02, 0.012), [0, 0.67, 0.372])
    .add('gun', cyl(0.008, 0.012, 0.5, 5), [0.13, 0.95, 0.3]).add('strip', sph(0.022, 6, 5), [0.13, 1.2, 0.3]); for (let i = 0; i < 3; i++) k.add('gun', bx(0.2, 0.015, 0.02), [0, 0.56 - i * 0.035, 0.372]);
  k = node('head', 'torso', [0, 0.74, 0]);
  k.add('under', cyl(0.06, 0.075, 0.1, 8), [0, -0.03, 0]).add('under', cham(0.24, 0.2, 0.16, 0.04), [0, 0.1, -0.09])
    .add('A', hull([[0.17, 0.26, -0.1], [0.185, 0.14, -0.13], [0.19, 0.06, 0.02], [0.17, 0.26, 0.12], [0.16, 0.06, 0.17], [0.1, 0.34, 0.02], [0, 0.36, -0.02], [0, 0.3, -0.17], [0, 0.3, 0.19], [0.12, 0.3, -0.14], [0, 0.05, 0.2]], true))
    .add('D', hull([[0.19, 0.22, -0.14], [0.16, 0.23, -0.22], [0, 0.24, -0.25], [0, 0.265, -0.16], [0.19, 0.25, -0.1]], true)).add('visor', cham(0.3, 0.085, 0.07, 0.02), [0, 0.15, -0.172])
    .add('A', hull([[0.19, 0.1, -0.13], [0.16, 0.0, -0.14], [0.12, -0.02, -0.175], [0.19, 0.02, 0.0], [0.15, 0.08, -0.19], [0.13, 0.06, -0.12]], true)).add('D', cham(0.14, 0.07, 0.08, 0.02), [0, -0.01, -0.17]).add('D', cham(0.05, 0.05, 0.3, 0.015), [0, 0.37, 0])
    .add('strip', bx(0.1, 0.02, 0.02), [0, 0.1, 0.2]).add('strip', sph(0.02, 6, 5), [0.13, 0.3, -0.155]);
  for (const s of [-1, 1]) k.add('visor', cham(0.04, 0.085, 0.14, 0.015), [s * 0.165, 0.15, -0.11]).add('G', cyl(0.06, 0.06, 0.05, 8), [s * 0.2, 0.12, 0.03], [0, 0, PI / 2]).add('gun', cyl(0.035, 0.035, 0.06, 8), [s * 0.205, 0.12, 0.03], [0, 0, PI / 2]);
  if (red) k.add('A', cham(0.48, 0.07, 0.4, 0.02), [0, 0.27, -0.03]).add('A', cham(0.3, 0.07, 0.3, 0.02), [0, 0.37, 0.0]).add('A', cham(0.07, 0.18, 0.22, 0.02), [0.245, 0.17, 0.03]).add('A', cham(0.07, 0.18, 0.22, 0.02), [-0.245, 0.17, 0.03]).add('G', cham(0.12, 0.1, 0.06, 0.02), [0, 0.02, -0.21]);
  for (const s of [-1, 1]) { const side = s < 0 ? 'L' : 'R';
    k = node('arm' + side, 'torso', [s * SHOULDER[0], SHOULDER[1], SHOULDER[2]]);
    k.add('A', hull(X([[0.0, 0.12, -0.13], [0.16, 0.06, -0.14], [0.18, -0.06, -0.12], [0, 0.13, 0.13], [0.16, 0.06, 0.14], [0.18, -0.06, 0.12], [-0.06, 0.06, 0], [0.2, 0.0, 0], [0.08, 0.14, 0]], s)))
      .add('G', cham(0.05, 0.04, 0.3, 0.012), [s * 0.175, -0.075, 0], [0, 0, s * -0.25]).add('D', cham(0.14, 0.1, 0.22, 0.03), [s * 0.05, -0.1, 0]).seg('under', [0, -0.04, 0], [0, -ARM1, 0], 0.075, 0.065, 6).add('A', cham(0.06, 0.18, 0.14, 0.02), [s * 0.068, -0.21, 0]);
    k = node('fore' + side, 'arm' + side, [0, -ARM1, 0]);
    k.add('D', cham(0.13, 0.1, 0.13, 0.04)).seg('under', [0, 0, 0], [0, -0.3, 0], 0.065, 0.055, 6).add('A', hull([[0.075, -0.06, -0.08], [0.088, -0.16, -0.088], [0.07, -0.27, -0.07], [0.075, -0.06, 0.08], [0.088, -0.16, 0.088], [0.07, -0.27, 0.07]], true))
      .add('G', cham(0.16, 0.035, 0.16, 0.012), [0, -0.275, 0]).add('strip', bx(0.02, 0.09, 0.012), [s * 0.09, -0.16, 0]).add('gun', cham(0.1, 0.1, 0.09, 0.03), [0, -ARM2 + 0.02, 0]).add('D', cham(0.09, 0.05, 0.05, 0.015), [0, -ARM2 - 0.03, -0.02]); }
  k = node('gun', 'torso', GUN_AT);
  k.add('gun', rb(0.08, 0.14, 0.44, 0.02), [0, 0, -0.1]).add('gun', rb(0.06, 0.12, 0.26, 0.02), [0, -0.02, 0.24]).add('D', rb(0.07, 0.16, 0.05, 0.02), [0, -0.03, 0.38]).add('A', rb(0.09, 0.1, 0.34, 0.03), [0, 0.01, -0.48])
    .add('gun', cyl(0.022, 0.022, 0.3, 8), [0, 0.02, -0.78], [PI / 2, 0, 0]).add('gun', cyl(0.035, 0.035, 0.08, 8), [0, 0.02, -0.93], [PI / 2, 0, 0]).add('gun', rb(0.06, 0.2, 0.1, 0.02), [0, -0.16, -0.12], [0.15, 0, 0])
    .add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('D', rb(0.05, 0.1, 0.06, 0.02), [0, -0.08, -0.4]).add('G', rb(0.095, 0.04, 0.12, 0.015), [0, 0.065, -0.5]).add('gun', rb(0.04, 0.05, 0.14, 0.015), [0, 0.1, -0.12])
    .add('strip', bx(0.028, 0.028, 0.01), [0, 0.1, -0.048]).add('strip', bx(0.006, 0.02, 0.2), [0.047, 0.03, -0.48]).add('strip', bx(0.006, 0.02, 0.2), [-0.047, 0.03, -0.48]);
}
const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _d = new THREE.Vector3(), _perp = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(), _qi = new THREE.Quaternion(), _pole = new THREE.Vector3();
function reach(arm, fore, S, T, pole) { // two-bone reach: bend the elbow so the hand lands on T
  _d.subVectors(T, S); const len = clamp(_d.length(), 0.08, ARM1 + ARM2 - 0.004); _d.normalize();
  const a = Math.acos(clamp((ARM1 * ARM1 + len * len - ARM2 * ARM2) / (2 * ARM1 * len), -1, 1));
  _perp.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize(); _e.copy(_d).multiplyScalar(Math.cos(a) * ARM1).addScaledVector(_perp, Math.sin(a) * ARM1);
  arm.quaternion.setFromUnitVectors(DOWN, _f.copy(_e).normalize()); _f.copy(_d).multiplyScalar(len).sub(_e).normalize().applyQuaternion(_qi.copy(arm.quaternion).invert()); fore.quaternion.setFromUnitVectors(DOWN, _f);
}
export function makeSoldier(M, main, accent, over, variant) { const m = rig('soldier' + (variant || ''), variant === 'red' ? node => soldierDef(node, true) : soldierDef, M, Object.assign({ A: main || M.armor, D: accent || M.armorD, G: M.gold }, over || {})), J = m.userData.J; m.rotation.order = 'YXZ'; m.userData.gun = J.gun; m.userData.head = J.head; poseSoldier(m, {}); return m; }
// s: walk (cycle angle), move 0..1, run 0..1, pitch, t (seconds), kick 0..1, dead, relaxed
export function poseSoldier(m, s) { const J = m.userData.J, mv = s.move || 0, w = s.walk || 0, t = s.t || 0, pitch = s.pitch || 0, kick = s.kick || 0, run = s.run || 0;
  if (s.dead) { m.rotation.x = -1.45; J.torso.rotation.set(0, 0, 0.1); J.legL.rotation.set(0.25, 0, -0.2); J.legR.rotation.set(-0.1, 0, 0.25); J.shinL.rotation.x = -0.5; J.shinR.rotation.x = -0.15; return; }
  const dv = s.dive || 0, air = s.air ? 1 : 0; m.rotation.x = -1.15 * dv; const sw = Math.sin(w), cw = Math.cos(w), amp = (0.6 + run * 0.25) * mv;
  J.hips.position.y = 0.97 - mv * Math.abs(cw) * 0.05 - (1 - mv) * 0.0; J.hips.rotation.set(0, sw * 0.1 * mv, 0);
  J.legL.rotation.set(sw * amp, 0, -0.06); J.legR.rotation.set(-sw * amp, 0, 0.06);
  J.shinL.rotation.x = -(0.12 + (0.25 + 0.85 * Math.max(0, cw)) * mv); J.shinR.rotation.x = -(0.12 + (0.25 + 0.85 * Math.max(0, -cw)) * mv);
  if (air || dv) { J.legL.rotation.set(0.5 - dv * 0.7, 0, -0.1); J.legR.rotation.set(0.15 - dv * 0.4, 0, 0.1); J.shinL.rotation.x = -0.9 + dv * 0.6; J.shinR.rotation.x = -0.5 + dv * 0.3; }
  J.torso.position.y = 0.1 + Math.sin(t * 2.1) * 0.006; J.torso.rotation.set(pitch * 0.45 - 0.08 * mv - 0.1 * run * mv - kick * 0.03, -sw * 0.14 * mv + 0.22, 0);
  J.head.rotation.set(pitch * 0.3, -0.2 + Math.sin(t * 0.7) * 0.03, 0);
  const lower = s.relaxed ? 1 : 0; J.gun.position.set(GUN_AT[0], GUN_AT[1] - lower * 0.08 + Math.sin(w * 2) * 0.012 * mv, GUN_AT[2] + kick * 0.07); J.gun.rotation.set(pitch * 0.35 + kick * 0.06 - lower * 0.45, -0.22 + lower * 0.35, 0);
  for (const s2 of [-1, 1]) { const R = s2 > 0; _T.copy(R ? GRIP_R : GRIP_L).applyEuler(J.gun.rotation).add(J.gun.position); _S.set(s2 * SHOULDER[0], SHOULDER[1], SHOULDER[2]); _pole.set(s2 * 0.6, -1, 0.35); reach(R ? J.armR : J.armL, R ? J.foreR : J.foreL, _S, _T, _pole); }
}

// ---------- The swarm (faces +z). Materials: bug, bugD, plate, bugGlow, acid.
function legs(node, list, n, hipY, hipX, zs, knee, foot, r, mat) { // jointed legs, one mesh each, pivoting at the hip
  for (const s of [-1, 1]) zs.forEach((z, i) => { const name = 'leg' + (s < 0 ? 'L' : 'R') + i, k = node(name, null, [s * hipX, hipY, z], false);
    const K = [s * knee[0], knee[1], 0], F = [s * foot[0], -hipY, 0]; k.seg(mat, [0, 0, 0], K, r, r * 0.75).add(mat, sph(r * 0.95, 7, 5), K).seg(mat, K, [F[0] * 0.98, F[1] * 0.55, 0], r * 0.72, r * 0.45).seg('plate', [F[0] * 0.98, F[1] * 0.55, 0], F, r * 0.8, r * 0.06, 4);
    list.push({ n: name, s, ph: (i % 2 ? PI : 0) + (s > 0 ? PI : 0), splay: n > 2 ? (i - (n - 1) / 2) * -0.42 : (i ? 0.3 : -0.3) }); });
}
const LEGS = {};
// Swarmling, from the style sheet: a low crystal body, a toothed wedge head with swept-back horns, an egg cluster ringed by curved
// spikes, and four scythe legs. Everything is faceted.
function swarmDef(node) { let k = node('body', null, [0, 0.62, 0]);
  k.add('bug', hull([[0.22, 0.2, 0.46], [0.18, -0.12, 0.5], [0.37, 0.26, 0.02], [0.31, -0.2, 0.0], [0.28, 0.22, -0.46], [0.2, -0.14, -0.46], [0, 0.34, 0.06], [0, -0.27, 0.05]], true))
    .add('bugD', hull([[0.26, 0.2, -0.38], [0.2, -0.12, -0.4], [0.17, 0.24, -0.86], [0.1, -0.03, -0.86], [0, 0.2, -1.16], [0, 0.34, -0.6], [0, -0.1, -1.0]], true))
    .add('plate', hull([[0.3, 0.25, 0.3], [0.2, 0.3, -0.05], [0, 0.4, 0.2], [0, 0.36, -0.1], [0.34, 0.2, 0.05]], true)).add('bugGlow', hull([[0.33, 0.04, 0.3], [0.36, -0.06, 0.0], [0.33, 0.0, -0.3], [0.3, -0.12, 0.1]], true)).add('bugGlow', hull([[0.12, -0.26, 0.3], [0.14, -0.27, -0.3], [0, -0.3, 0]], true));
  for (let i = 0; i < 3; i++) k.add('plate', hull([[0.22 - i * 0.04, 0.24, -0.5 - i * 0.2], [0, 0.34 - i * 0.02, -0.46 - i * 0.2], [0.16 - i * 0.04, 0.27, -0.76 - i * 0.2], [0, 0.31, -0.82 - i * 0.2]], true));
  k.blade('plate', [0, 0.22, -1.08], [0, 0.42, -1.62], 0.16, 0.06, 0.07);
  // egg cluster and the ring of spikes that guards it
  for (let i = 0; i < 8; i++) k.add('egg', sph(i ? 0.105 - (i % 3) * 0.014 : 0.14, 9, 7), [i ? Math.cos(i * 0.9) * 0.15 : 0, 0.36 + (i ? (i % 2) * 0.05 : 0.1), -0.2 + (i ? Math.sin(i * 0.9) * 0.17 : 0)]);
  for (const [x, z, tx, ty, tz, w] of [[0, -0.5, 0, 1.12, -1.0, 0.24], [0.22, -0.36, 0.52, 0.98, -0.8, 0.2], [-0.22, -0.36, -0.52, 0.98, -0.8, 0.2], [0.3, -0.08, 0.66, 0.8, -0.38, 0.18], [-0.3, -0.08, -0.66, 0.8, -0.38, 0.18], [0.25, 0.2, 0.5, 0.66, 0.02, 0.15], [-0.25, 0.2, -0.5, 0.66, 0.02, 0.15]]) k.blade('bug', [x, 0.24, z], [tx, ty, tz], w, 0.16, 0.08);
  k = node('head', 'body', [0, 0.02, 0.5]);
  k.add('bug', hull([[0.2, 0.15, 0.0], [0.25, -0.02, 0.05], [0.17, 0.17, 0.3], [0.13, 0.0, 0.44], [0, 0.07, 0.6], [0, 0.24, 0.12], [0.1, -0.08, 0.3], [0, 0.18, 0.36]], true)).add('bugD', hull([[0.16, -0.09, 0.04], [0.11, -0.2, 0.3], [0, -0.17, 0.48], [0.13, -0.22, 0.08], [0, -0.1, 0.2]], true)).add('plate', hull([[0.19, 0.17, 0.02], [0.12, 0.22, 0.3], [0, 0.28, 0.14], [0, 0.2, 0.42]], true));
  for (const sx of [-1, 1]) { k.add('bugGlow', hull([[sx * 0.2, 0.1, 0.2], [sx * 0.16, 0.13, 0.36], [sx * 0.21, 0.05, 0.3], [sx * 0.17, 0.06, 0.24]])).blade('plate', [sx * 0.13, 0.2, 0.04], [sx * 0.34, 0.5, -0.5], 0.15, 0.1, 0.06).blade('bug', [sx * 0.2, 0.06, -0.02], [sx * 0.48, 0.2, -0.36], 0.11, 0.06, 0.05);
    for (let i = 0; i < 4; i++) k.add('tooth', cone(0.022, 0.1 - i * 0.012, 4), [sx * (0.12 - i * 0.022), -0.05, 0.3 + i * 0.07], [PI, 0, 0]).add('tooth', cone(0.02, 0.085 - i * 0.01, 4), [sx * (0.1 - i * 0.02), -0.13, 0.27 + i * 0.065]); }
  k.blade('plate', [0, 0.25, 0.06], [0, 0.6, -0.46], 0.14, 0.1, 0.06);
  LEGS.swarm = [];
  for (const s of [-1, 1]) [[0.3, 0.64, 0.28, 0.5, 0.36, 0.14, 0.98, 0.34, 0.24, 0.11], [0.28, 0.62, -0.3, 0.46, 0.3, -0.12, 0.86, -0.3, 0.2, 0.095]].forEach((q, i) => { const name = 'leg' + (s < 0 ? 'L' : 'R') + i, lk = node(name, null, [s * q[0], q[1], q[2]], false), K = [s * q[3], q[4], q[5]], F = [s * q[6], -q[1], q[7]];
    lk.seg('bug', [0, 0, 0], K, q[9], q[9] * 0.82, 5).add('bugD', hull([[K[0] - 0.09, K[1] - 0.06, K[2] - 0.07], [K[0] + 0.09, K[1] - 0.05, K[2] - 0.07], [K[0], K[1] + 0.12, K[2]], [K[0] - 0.09, K[1] - 0.06, K[2] + 0.07], [K[0] + 0.09, K[1] - 0.05, K[2] + 0.07], [K[0] + s * 0.12, K[1] + 0.04, K[2]]])).blade('bug', [K[0], K[1] + 0.02, K[2]], F, q[8], s * 0.14, 0.085).blade('plate', [K[0] + s * 0.02, K[1] - 0.25, K[2]], [F[0] + s * 0.02, F[1] + 0.02, F[2]], q[8] * 0.5, s * 0.08, 0.1);
    LEGS.swarm.push({ n: name, s, ph: (i ? PI : 0) + (s > 0 ? PI : 0), splay: i ? 0.25 : -0.25 }); }); }
const dod = r => new THREE.DodecahedronGeometry(r, 0), fac = (r, w, h) => sph(r, w || 7, h || 5);
// a tapering limb that follows a list of points: necks, horns, ribs
function chain(k, mat, pts, r0, r1, sides) { for (let i = 0; i < pts.length - 1; i++) { const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1); k.seg(mat, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, sides || 5); if (i) k.add(mat, fac((r0 + (r1 - r0) * t0) * 0.98, 6, 4), pts[i]); } }
// Spitter: a tall stilt-walker with a long neck and a green acid sac on its back
function spitterDef(node) { let k = node('body', null, [0, 1.25, 0]);
  k.add('bug', fac(0.42), [0, 0, 0], null, [0.95, 0.85, 1.5]).add('bugD', cone(0.3, 0.55, 4), [0, -0.12, 0.55], [2.2, 0, 0]).add('bugGlow', fac(0.07, 5, 4), [0, -0.3, 0.62], null, [1.4, 0.6, 1]).add('bugGlow', fac(0.09, 5, 4), [0, -0.33, 0], null, [2.2, 0.4, 3]);
  for (const sx of [-1, 1]) { k.seg('bugD', [sx * 0.34, 0.2, 0.25], [sx * 0.62, 0.75, -0.25], 0.16, 0.02, 4).seg('bugD', [sx * 0.36, 0.1, -0.2], [sx * 0.6, 0.6, -0.85], 0.15, 0.02, 4).seg('bugD', [sx * 0.2, 0.5, -0.75], [sx * 0.3, 0.95, -1.25], 0.13, 0.02, 4); } k.seg('bugD', [0, 0.25, -0.85], [0, 0.6, -1.45], 0.14, 0.02, 4);
  chain(k, 'bug', [[0, 0.15, 0.5], [0, 0.55, 0.86], [0, 0.92, 0.84], [0, 1.14, 0.66]], 0.17, 0.1, 6); chain(k, 'acid', [[0, 0.12, 0.6], [0, 0.55, 0.97], [0, 0.94, 0.94], [0, 1.1, 0.78]], 0.06, 0.04, 5);
  k = node('sac', 'body', [0, 0.36, -0.28]); k.add('acid', sph(0.5, 12, 9), null, null, [0.95, 0.85, 1.25]);
  k = node('head', 'body', [0, 1.2, 0.62]); k.add('bug', cone(0.17, 0.56, 4), [0, 0.02, 0.22], [PI / 2, 0, PI / 4], [1.2, 1, 0.8]).add('bugD', cone(0.1, 0.4, 4), [0, -0.1, 0.18], [PI / 2 + 0.4, 0, PI / 4]).add('acid', fac(0.05, 5, 4), [0, -0.05, 0.2]);
  for (const [x, y, l] of [[0, 0.1, 0.55], [-0.11, 0.06, 0.4], [0.11, 0.06, 0.4]]) k.seg('bugD', [x, y, -0.02], [x * 1.6, y + 0.16, -l], 0.07, 0.01, 4); for (const sx of [-1, 1]) k.add('bugGlow', fac(0.035, 5, 4), [sx * 0.09, 0.05, 0.18]);
  legs(node, LEGS.spitter = [], 2, 1.2, 0.3, [0.36, -0.36], [0.55, 0.28], [0.9, 0], 0.075, 'bug'); }
// Brute and Warlord: six limbs. Four thick legs, two crusher arms with boulder fists, and a dome of overlapping crystal plates.
function bruteDef(boss) { return node => { let k = node('body', null, [0, 1.45, 0]);
  k.add('bugD', fac(0.95, 8, 6), [0, -0.1, -0.05], null, [1.15, 0.85, 1.45]).add('bugGlow', fac(0.3, 6, 4), [0, -0.72, 0.1], null, [1.2, 0.3, 2]);
  for (let row = 0; row < 4; row++) for (let i = -2; i <= 2; i++) { const a = i * 0.44, z = 0.75 - row * 0.5, px = Math.sin(a) * (1.0 - row * 0.04), py = Math.cos(a) * 0.72 - 0.02, len = 1.15 - Math.abs(i) * 0.1 + row * 0.08; k.seg('bug', [px, py, z], [px + Math.sin(a) * 0.55 * len, py + 0.3 * len * Math.cos(a), z - 0.95 * len], 0.36 - Math.abs(i) * 0.03, 0.02, 4);
    if (i && row < 3) k.add('bugGlow', fac(0.07, 5, 4), [px * 1.02, py - 0.12, z - 0.28], null, [1, 0.5, 2.6]); }
  k.seg('bug', [0, 0.1, -1.2], [0, 0.35, -2.0], 0.3, 0.02, 4);
  if (boss) { for (let i = -2; i <= 2; i++) chain(k, i === 0 ? 'egg' : 'bug', [[i * 0.34, 0.75, 0.2 - Math.abs(i) * 0.12], [i * 0.42, 1.45 - Math.abs(i) * 0.2, 0.1 - Math.abs(i) * 0.1], [i * 0.46, 2.0 - Math.abs(i) * 0.34, 0.3 - Math.abs(i) * 0.1]], 0.16, 0.02, 4); for (let i = -2; i <= 2; i++) k.add('egg', cone(0.07, 0.4, 4), [i * 0.46, 2.1 - Math.abs(i) * 0.34, 0.34 - Math.abs(i) * 0.1], [0.3, 0, i * -0.1]);
    for (const [x, y, z, r2] of [[0.5, 0.78, -0.35, 0.3], [-0.5, 0.78, -0.35, 0.3], [0, 0.86, -0.6, 0.34], [0.3, 0.8, -0.85, 0.24], [-0.3, 0.8, -0.85, 0.24], [0.85, 0.5, 0.35, 0.22], [-0.85, 0.5, 0.35, 0.22]]) k.add('egg', sph(r2, 10, 8), [x, y, z]); }
  k = node('head', 'body', [0, -0.3, 1.3]); k.add('bug', cone(0.45, 0.95, 4), [0, 0.02, 0.1], [PI / 2 + 0.3, 0, PI / 4], [1.25, 1, 0.75]).add('bugD', cone(0.3, 0.6, 4), [0, -0.2, 0.05], [PI / 2 + 0.7, 0, PI / 4]).seg('bug', [0, 0.3, -0.2], [0, 0.6, -0.65], 0.25, 0.02, 4);
  for (const s of [-1, 1]) k.add('bugGlow', fac(0.06, 5, 4), [s * 0.2, 0.06, 0.32], [0, 0, s * 0.5], [1.6, 0.5, 1]).seg('bugD', [s * 0.3, 0.15, -0.1], [s * 0.6, 0.4, -0.5], 0.14, 0.02, 4);
  for (const s of [-1, 1]) { k = node('arm' + (s < 0 ? 'L' : 'R'), 'body', [s * 1.05, 0.08, 0.72]); k.add('bug', fac(0.44, 6, 4), null, null, [1, 0.9, 1.1]).seg('bugD', [0, -0.05, 0.05], [s * 0.22, -0.62, 0.42], 0.3, 0.26, 6).add('bugGlow', torus(0.27, 0.07), [s * 0.2, -0.56, 0.38], [PI / 2 - 0.5, 0, 0]).add('bug', dod(0.58), [s * 0.28, -1.0, 0.72], [0.4, s * 0.6, 0]).seg('bug', [s * 0.1, 0.3, 0], [s * 0.45, 0.75, -0.5], 0.2, 0.02, 4); }
  legs(node, LEGS[boss ? 'boss' : 'brute'] = [], 2, 1.1, 0.72, [0.2, -0.85], [0.34, 0.16], [0.52, 0], 0.27, 'bugD'); }; }
const BUG = { swarm: swarmDef, leaper: node => { swarmDef(node); LEGS.leaper = LEGS.swarm; }, spitter: spitterDef, brute: bruteDef(false), boss: bruteDef(true) }, RATE = { swarm: 13, leaper: 16, spitter: 8, brute: 6, boss: 5 };
export function makeBug(M, kind, over) { const key = BUG[kind] ? kind : 'brute', m = rig('bug-' + key, BUG[key], M, over), J = m.userData.J; if (key === 'leaper') m.scale.setScalar(1.3); m.userData.kind = key; m.userData.legs = LEGS[key].map(l => ({ g: J[l.n], s: l.s, ph: l.ph, splay: l.splay })); m.userData.y0 = J.body.position.y; if (key === 'boss') m.scale.setScalar(1.83); return m; }
// s: t (seconds), move 0..1, atk 0..1
export function poseBug(m, s) { const U = m.userData, J = U.J, t = s.t || 0, mv = s.move === undefined ? 1 : s.move, atk = s.atk || 0, w = t * RATE[U.kind], big = U.kind === 'brute' || U.kind === 'boss';
  for (const l of U.legs) { const p = w + l.ph, f = Math.sin(p) * mv; l.g.rotation.y = l.s * (-(f * 0.5) - l.splay); l.g.rotation.z = l.s * Math.max(0, Math.cos(p)) * (big ? 0.22 : 0.4) * mv; }
  J.body.position.y = U.y0 + Math.sin(w * 2) * (big ? 0.07 : 0.035) * mv - atk * 0.08; J.body.rotation.set(Math.sin(w) * 0.03 * mv - atk * (big ? 0.18 : 0.3), 0, Math.cos(w) * (big ? 0.05 : 0.07) * mv);
  if (J.head) J.head.rotation.set(-atk * 0.4 + Math.sin(t * 2.3) * 0.06, Math.sin(t * 1.7) * 0.12, 0);
  if (J.sac) J.sac.scale.setScalar(1 + Math.sin(t * 3) * 0.05 + atk * 0.16);
  if (J.armL) { J.armL.rotation.x = Math.sin(w) * 0.25 * mv - atk * 1.2; J.armR.rotation.x = -Math.sin(w) * 0.25 * mv - atk * 1.2; }
}

// ---------- Hive, turret and the rest (built once each, so no cache needed beyond the rig)
// Hive: a low mound of woven roots, a cluster of glowing eggs, and rib horns that arch up and curl in over them
function hiveDef(node) { let k = node('mound', null, [0, 0, 0]);
  k.add('plate', fac(2.0, 9, 5), [0, 0.7, 0], null, [1.3, 0.62, 1.05]);
  for (let i = 0; i < 16; i++) { const a = i * 0.3927 + (i % 2) * 0.12, c = Math.cos(a), z = Math.sin(a), far = 3.5 - Math.abs(z) * 0.9 + (i % 3) * 0.25; chain(k, i % 2 ? 'bugD' : 'plate', [[c * 0.9, 1.25 - (i % 2) * 0.3, z * 0.9], [c * 1.9, 0.85, z * 1.8], [c * far * 0.85, 0.3, z * far * 0.8], [c * far, 0.03, z * far * 0.95]], 0.52, 0.1, 5); }
  [[0, 2.5, 5.0, 1], [2.6, 2.3, 4.1, 1], [-2.6, 2.3, 4.1, 1], [1.1, 1.9, 3.5, 0.75], [-1.1, 1.9, 3.5, 0.75], [3.6, 1.7, 3.0, 0.6], [-3.6, 1.7, 3.0, 0.6]].forEach(q => { const side = q[0] === 0 ? 0 : Math.sign(q[0]), ang = side === 0 ? -PI / 2 : (side > 0 ? 0 : PI) + (Math.abs(q[0]) > 2 ? side * 0.5 : Math.abs(q[0]) > 1.05 && Math.abs(q[0]) < 1.2 ? side * -0.9 : 0), c = Math.cos(ang), z = Math.sin(ang), R = q[1], Ht = q[2];
    chain(k, 'bug', [[c * R, 0.5, z * R], [c * R * 1.22, Ht * 0.38, z * R * 1.22], [c * R * 1.05, Ht * 0.72, z * R * 1.05], [c * R * 0.62, Ht * 0.93, z * R * 0.62], [c * R * 0.22, Ht, z * R * 0.22]], 0.55 * q[3], 0.05, 5); });
  k = node('glow', null, [0, 0, 0], false); k.add('egg', sph(1.0, 16, 12), [0, 2.25, 0]);
  for (let i = 0; i < 11; i++) { const a = i * 0.571 + 0.2, rr = 1.25 + (i % 3) * 0.22, y = 1.35 + (i % 4) * 0.22; k.add('egg', sph(0.42 - (i % 3) * 0.07, 10, 8), [Math.cos(a) * rr, y, Math.sin(a) * rr * 0.85], null, [1, 1.15, 1]); } }
export function makeHive(M) { const m = rig('hive', hiveDef, M), l = new THREE.PointLight(0xff5a20, 120, 40, 2); l.position.y = 3.2; m.add(l); m.userData.legs = []; m.userData.glow = m.userData.J.glow; return m; }
function turretDef(node) { let k = node('base', null, [0, 0, 0]);
  k.add('gun', cyl(0.42, 0.5, 0.4, 10), [0, 0.62, 0]).add('D', cyl(0.56, 0.56, 0.12, 12), [0, 0.86, 0]).add('strip', cyl(0.57, 0.57, 0.025, 16), [0, 0.78, 0]).add('gun', cyl(0.2, 0.2, 0.3, 8), [0, 0.35, 0]);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + PI / 3, c = Math.cos(a), z = Math.sin(a); k.seg('A', [c * 0.38, 0.62, z * 0.38], [c * 1.1, 0.16, z * 1.1], 0.17, 0.13, 4).add('G', rb(0.3, 0.12, 0.3, 0.03), [c * 0.95, 0.27, z * 0.95], [0, -a, -0.55]).add('gun', rb(0.42, 0.14, 0.36, 0.03), [c * 1.18, 0.07, z * 1.18], [0, -a, 0]).add('gun', sph(0.14, 8, 6), [c * 0.38, 0.62, z * 0.38]); }
  k = node('top', null, [0, 1.3, 0]);
  k.add('A', rb(0.85, 0.62, 1.0, 0.1)).add('D', rb(0.5, 0.5, 0.2, 0.05), [0, 0, -0.52]).add('G', rb(0.9, 0.08, 0.5, 0.03), [0, 0.3, 0.1]).add('G', rb(0.08, 0.3, 0.6, 0.03), [0.42, -0.1, 0.1]).add('G', rb(0.08, 0.3, 0.6, 0.03), [-0.42, -0.1, 0.1])
    .add('visor', rb(0.02, 0.1, 0.3, 0.008), [0.435, 0.12, -0.15]).add('visor', rb(0.02, 0.1, 0.3, 0.008), [-0.435, 0.12, -0.15]).add('gun', rb(0.3, 0.42, 0.5, 0.04), [0, -0.05, 0.62]).add('strip', bx(0.2, 0.03, 0.01), [0, 0.05, 0.875])
    .add('G', torus(0.2, 0.035), [0, 0.42, 0.1], [0, PI / 2, 0], [1.3, 0.8, 1]).add('gun', cyl(0.015, 0.02, 0.6, 5), [-0.3, 0.6, 0.35]).add('G', cyl(0.025, 0.025, 0.08, 6), [-0.3, 0.92, 0.35]);
  k = node('barrels', 'top', [0, 0, -0.6]);
  k.add('gun', cyl(0.2, 0.2, 0.25, 12), [0, 0, -0.1], [PI / 2, 0, 0]).add('gun', cyl(0.19, 0.19, 0.12, 12), [0, 0, -0.6], [PI / 2, 0, 0]).add('D', cyl(0.21, 0.21, 0.16, 12), [0, 0, -1.02], [PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; k.add('gun', cyl(0.06, 0.06, 1.1, 8), [Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.6], [PI / 2, 0, 0]); } }
export function makeTurret(M) { const m = rig('turret', turretDef, M, { A: M.armor, D: M.armorD, G: M.gold }); m.userData.top = m.userData.J.top; m.userData.barrels = m.userData.J.barrels; return m; }
function podDef(node) { const k = node('pod', null, [0, 0, 0]);
  k.add('pod', lathe([[0.01, 0], [0.45, 0.25], [0.85, 1.0], [0.9, 2.6], [0.7, 3.3], [0.3, 3.8], [0.01, 3.9]], 10)).add('D', cyl(0.92, 0.92, 0.2, 10), [0, 1.3, 0]).add('D', cyl(0.92, 0.92, 0.2, 10), [0, 2.5, 0]).add('strip', cyl(0.93, 0.93, 0.04, 12), [0, 1.9, 0]).add('gun', cone(0.5, 0.5, 8), [0, 0.2, 0], [PI, 0, 0]);
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; k.add('A', rb(0.08, 1.4, 0.8, 0.03), [Math.cos(a) * 1.05, 2.9, Math.sin(a) * 1.05], [0, -a, 0.18]).add('visor', rb(0.3, 0.5, 0.04, 0.02), [Math.cos(i * PI / 2) * 0.9, 1.9, Math.sin(i * PI / 2) * 0.9], [0, -i * PI / 2 + PI / 2, 0]); } }
export function makePod(M) { return rig('pod', podDef, M, { A: M.armor, D: M.armorD, G: M.gold }); }

// ---------- Weapons. Each sits on the soldier's gun joint with the same grip points as the rifle, barrel toward -z.
const WPN = {
  1: k => { k.add('gun', rb(0.09, 0.15, 0.5, 0.02), [0, 0, -0.08]).add('gun', rb(0.07, 0.13, 0.3, 0.02), [0, -0.03, 0.28]).add('D', rb(0.08, 0.17, 0.05, 0.02), [0, -0.04, 0.44]).add('gun', cyl(0.035, 0.035, 0.62, 10), [0, 0.035, -0.6], [PI / 2, 0, 0]).add('gun', cyl(0.03, 0.03, 0.5, 10), [0, -0.04, -0.55], [PI / 2, 0, 0]).add('G', rb(0.085, 0.085, 0.22, 0.03), [0, -0.045, -0.42]).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('gun', cyl(0.042, 0.042, 0.04, 10), [0, 0.035, -0.92], [PI / 2, 0, 0]).add('strip', bx(0.03, 0.02, 0.12), [0, 0.085, -0.1]); for (let i = 0; i < 4; i++) k.add('bugGlow', cyl(0.018, 0.018, 0.06, 6), [0.055, 0.02, -0.2 + i * 0.07], [PI / 2, 0, 0]); },
  2: k => { k.add('gun', rb(0.07, 0.12, 0.5, 0.02), [0, 0, -0.1]).add('A', rb(0.065, 0.1, 0.34, 0.02), [0, -0.01, 0.3]).add('D', rb(0.075, 0.16, 0.05, 0.02), [0, -0.03, 0.48]).add('gun', cyl(0.018, 0.02, 0.85, 8), [0, 0.02, -0.75], [PI / 2, 0, 0]).add('gun', cyl(0.032, 0.032, 0.16, 8), [0, 0.02, -1.2], [PI / 2, 0, 0]).add('gun', cyl(0.04, 0.04, 0.36, 12), [0, 0.13, -0.12], [PI / 2, 0, 0]).add('gun', cyl(0.05, 0.04, 0.08, 12), [0, 0.13, -0.33], [PI / 2, 0, 0]).add('visor', cyl(0.042, 0.042, 0.01, 12), [0, 0.13, 0.065], [PI / 2, 0, 0]).add('gun', rb(0.03, 0.06, 0.05, 0.01), [0, 0.08, -0.2]).add('gun', rb(0.03, 0.06, 0.05, 0.01), [0, 0.08, -0.02]).add('gun', rb(0.055, 0.16, 0.08, 0.02), [0, -0.14, -0.14], [0.1, 0, 0]).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('G', rb(0.075, 0.03, 0.2, 0.01), [0, 0.065, -0.45]).seg('gun', [0.03, -0.03, -0.55], [0.09, -0.22, -0.62], 0.012, 0.01, 5).seg('gun', [-0.03, -0.03, -0.55], [-0.09, -0.22, -0.62], 0.012, 0.01, 5); },
  3: k => { k.add('gun', rb(0.11, 0.17, 0.56, 0.03), [0, 0, -0.08]).add('gun', rb(0.07, 0.12, 0.26, 0.02), [0, -0.02, 0.3]).add('D', rb(0.08, 0.16, 0.05, 0.02), [0, -0.03, 0.44]).add('D', rb(0.2, 0.2, 0.22, 0.04), [-0.08, -0.17, -0.12]).add('G', bx(0.205, 0.04, 0.225), [-0.08, -0.17, -0.12]).add('gun', cyl(0.028, 0.028, 0.7, 10), [0, 0.02, -0.7], [PI / 2, 0, 0]).add('gun', cyl(0.05, 0.05, 0.1, 10), [0, 0.02, -1.06], [PI / 2, 0, 0]).add('gun', rb(0.03, 0.05, 0.3, 0.01), [0, 0.15, -0.1]).seg('gun', [0, 0.09, -0.24], [0, 0.15, -0.24], 0.012, 0.012, 5).seg('gun', [0, 0.09, 0.04], [0, 0.15, 0.04], 0.012, 0.012, 5).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('D', rb(0.05, 0.1, 0.06, 0.02), [0, -0.09, -0.4]); for (let i = 0; i < 5; i++) k.add('D', cyl(0.045, 0.045, 0.03, 10), [0, 0.02, -0.5 - i * 0.09], [PI / 2, 0, 0]); for (let i = 0; i < 5; i++) k.add('G', cyl(0.014, 0.014, 0.07, 6), [-0.02 - i * 0.012, -0.05 - i * 0.015, -0.04 - i * 0.012], [0, 0, PI / 2]); },
  4: k => { k.add('gun', rb(0.09, 0.13, 0.5, 0.03), [0, 0, -0.1]).add('gun', rb(0.06, 0.11, 0.24, 0.02), [0, -0.02, 0.28]).add('bugGlow', cyl(0.07, 0.07, 0.42, 12), [0.07, -0.14, -0.1], [PI / 2, 0, 0]).add('G', cyl(0.07, 0.07, 0.42, 12), [-0.07, -0.14, -0.1], [PI / 2, 0, 0]).add('gun', sph(0.07, 10, 6), [0.07, -0.14, -0.31]).add('gun', sph(0.07, 10, 6), [-0.07, -0.14, -0.31]).add('gun', cyl(0.03, 0.03, 0.55, 10), [0, 0.02, -0.6], [PI / 2, 0, 0]).add('D', cyl(0.07, 0.04, 0.2, 12), [0, 0.02, -0.95], [PI / 2, 0, 0]).add('egg', sph(0.022, 6, 5), [0, -0.05, -1.02]).add('gun', cyl(0.008, 0.008, 0.3, 5), [0, -0.04, -0.88], [PI / 2, 0, 0]).seg('gun', [0.07, -0.08, 0.1], [0, 0.0, 0.2], 0.018, 0.018, 6).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('D', rb(0.05, 0.1, 0.06, 0.02), [0, -0.09, -0.4]).add('strip', bx(0.02, 0.02, 0.2), [0, 0.07, -0.1]); },
  5: k => { k.add('A', cyl(0.085, 0.085, 1.25, 14), [0.02, 0.2, -0.05], [PI / 2, 0, 0]).add('D', cyl(0.11, 0.09, 0.14, 14), [0.02, 0.2, -0.72], [PI / 2, 0, 0]).add('D', cyl(0.09, 0.12, 0.16, 14), [0.02, 0.2, 0.62], [PI / 2, 0, 0]).add('G', cyl(0.09, 0.09, 0.05, 14), [0.02, 0.2, -0.3], [PI / 2, 0, 0]).add('G', cyl(0.09, 0.09, 0.05, 14), [0.02, 0.2, 0.3], [PI / 2, 0, 0]).add('bugGlow', cone(0.06, 0.16, 10), [0.02, 0.2, -0.82], [-PI / 2, 0, 0]).add('gun', rb(0.06, 0.2, 0.3, 0.02), [0, 0.03, -0.05]).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('gun', rb(0.05, 0.14, 0.06, 0.02), [0, -0.07, -0.4]).add('gun', rb(0.07, 0.1, 0.12, 0.02), [-0.1, 0.3, -0.2]).add('visor', bx(0.05, 0.07, 0.01), [-0.1, 0.3, -0.135]).add('strip', bx(0.01, 0.02, 0.5), [0.108, 0.2, 0]); },
  6: k => { k.add('gun', rb(0.09, 0.15, 0.46, 0.03), [0, 0, -0.05]).add('A', rb(0.07, 0.12, 0.26, 0.02), [0, -0.02, 0.3]).add('D', rb(0.08, 0.16, 0.05, 0.02), [0, -0.03, 0.44]).add('gun', rb(0.03, 0.035, 0.95, 0.01), [0, 0.075, -0.72]).add('gun', rb(0.03, 0.035, 0.95, 0.01), [0, -0.035, -0.72]).add('strip', bx(0.012, 0.05, 0.9), [0, 0.02, -0.72]).add('D', rb(0.12, 0.14, 0.2, 0.03), [0, -0.15, -0.08]).add('strip', bx(0.125, 0.03, 0.12), [0, -0.15, -0.08]).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('D', rb(0.05, 0.1, 0.06, 0.02), [0, -0.09, -0.4]); for (let i = 0; i < 6; i++) k.add('G', rb(0.07, 0.16, 0.03, 0.01), [0, 0.02, -0.34 - i * 0.15]); },
  7: k => { k.add('gun', rb(0.09, 0.14, 0.42, 0.03), [0, 0, -0.02]).add('A', rb(0.07, 0.12, 0.24, 0.02), [0, -0.02, 0.3]).add('D', rb(0.08, 0.16, 0.05, 0.02), [0, -0.03, 0.44]).add('plasma', sph(0.085, 12, 9), [0, 0.02, -0.34]).add('D', torus(0.09, 0.016), [0, 0.02, -0.34]).add('D', torus(0.09, 0.016), [0, 0.02, -0.34], [0, PI / 2, 0]).add('gun', cyl(0.035, 0.05, 0.3, 10), [0, 0.02, -0.58], [PI / 2, 0, 0]).add('plasma', cyl(0.02, 0.02, 0.05, 8), [0, 0.02, -0.75], [PI / 2, 0, 0]).add('gun', rb(0.05, 0.13, 0.07, 0.02), [0, -0.12, 0.05], [-0.25, 0, 0]).add('D', rb(0.05, 0.1, 0.06, 0.02), [0, -0.09, -0.42]).add('G', rb(0.095, 0.03, 0.2, 0.01), [0, 0.085, -0.05]); for (let i = 0; i < 3; i++) k.add('G', torus(0.045, 0.01), [0, 0.02, -0.48 - i * 0.08]); for (const s of [-1, 1]) k.add('D', rb(0.02, 0.1, 0.2, 0.01), [s * 0.07, 0.03, -0.3], [0, 0, s * 0.5]); } };
export function setWeapon(m, M, idx) { const U = m.userData, J = U.J; if (U.wIdx === idx) return; U.wIdx = idx; if (!U.wp) { U.wp = {}; U.rifle = J.gun.children.slice(); } for (const c of U.rifle) c.visible = !WPN[idx]; for (const k in U.wp) U.wp[k].visible = false;
  if (WPN[idx]) { if (!U.wp[idx]) { U.wp[idx] = rig('wpn' + idx, node => WPN[idx](node('w', null, [0, 0, 0])), M, { A: M.armor, D: M.armorD, G: M.gold }); J.gun.add(U.wp[idx]); } U.wp[idx].visible = true; } }
export { Kit, rb, bx, sph, cap, cyl, cone, torus, lathe };

// The extraction shuttle: a blunt dropship with four engine pods and a rear ramp.
function shipDef(node) { const k = node('ship', null, [0, 0, 0]);
  k.add('A', rb(3.4, 2.0, 8, 0.5), [0, 2.2, 0]).add('D', rb(3.0, 1.2, 3, 0.4), [0, 3.0, -1.5]).add('visor', rb(2.4, 0.7, 0.3, 0.1), [0, 2.9, -3.95], [0.35, 0, 0]).add('D', rb(3.5, 0.3, 8.2, 0.1), [0, 1.2, 0]).add('G', rb(3.45, 0.14, 6, 0.04), [0, 2.9, 0.8]).add('D', rb(2.6, 0.12, 2.6, 0.03), [0, 0.6, 5.0], [-0.42, 0, 0]).add('strip', bx(2.2, 0.06, 0.06), [0, 1.3, 4.05]);
  for (const s of [-1, 1]) { k.add('D', rb(3.2, 0.25, 2.4, 0.08), [s * 3.2, 2.9, 0.3], [0, 0, s * -0.12]).add('gun', cyl(0.7, 0.8, 1.6, 12), [s * 4.4, 2.6, -0.6]).add('gun', cyl(0.7, 0.8, 1.6, 12), [s * 4.4, 2.6, 1.6]).add('strip', cyl(0.55, 0.55, 0.08, 12), [s * 4.4, 1.78, -0.6]).add('strip', cyl(0.55, 0.55, 0.08, 12), [s * 4.4, 1.78, 1.6]).add('D', rb(0.2, 1.6, 1.4, 0.05), [s * 1.2, 3.9, 3.2], [0, 0, s * -0.3]).add('strip', bx(0.05, 0.3, 1.2), [s * 1.72, 2.4, 0])
    .seg('gun', [s * 1.3, 1.1, -2], [s * 1.6, 0.1, -2.2], 0.1, 0.08, 6).seg('gun', [s * 1.3, 1.1, 2.4], [s * 1.6, 0.1, 2.6], 0.1, 0.08, 6).add('D', rb(0.6, 0.12, 1.0, 0.03), [s * 1.6, 0.06, -2.2]).add('D', rb(0.6, 0.12, 1.0, 0.03), [s * 1.6, 0.06, 2.6]); } }
export function makeShip(M) { return rig('ship', shipDef, M, { A: M.pod, D: M.armorD, G: M.gold }); }
