// Earthfall: Frontline models. Everything here is built from code: jointed soldiers, the swarm, hives and turrets.
// Each model is a small skeleton of named joints. The pieces hanging off a joint are merged into one mesh per
// material, and the merged shapes are cached, so a hundred swarm on screen share the same geometry.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

class Kit {
  constructor() { this.by = {}; }
  add(mat, geo, p, r, s) { _o.position.set(0, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1); if (p) _o.position.set(p[0], p[1], p[2]); if (r) _o.rotation.set(r[0], r[1], r[2]); if (typeof s === 'number') _o.scale.setScalar(s); else if (s) _o.scale.set(s[0], s[1], s[2]); _o.updateMatrix(); const g = clean(geo); g.applyMatrix4(_o.matrix); (this.by[mat] = this.by[mat] || []).push(g); return this; }
  // a tapered limb between two points
  seg(mat, a, b, r0, r1, sides) { _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); const len = _a.distanceTo(_b), g = clean(cyl(r1, r0, len, sides || 6)); _q.setFromUnitVectors(UP, _b.clone().sub(_a).normalize()); g.applyQuaternion(_q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); (this.by[mat] = this.by[mat] || []).push(g); return this; }
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
function soldierDef(node) {
  let k = node('hips', null, [0, 1, 0]);
  k.add('under', rb(0.42, 0.22, 0.28, 0.06)).add('D', rb(0.46, 0.09, 0.32, 0.03), [0, 0.1, 0]).add('A', rb(0.16, 0.2, 0.08, 0.03), [0, -0.06, -0.15], [0.15, 0, 0])
    .add('D', rb(0.12, 0.16, 0.1, 0.03), [0.25, 0, 0.03]).add('D', rb(0.12, 0.16, 0.1, 0.03), [-0.25, 0, 0.03]).add('D', rb(0.2, 0.14, 0.09, 0.03), [0, 0, 0.17]).add('strip', bx(0.07, 0.025, 0.01), [0, 0.1, -0.165]);
  for (const s of [-1, 1]) { const side = s < 0 ? 'L' : 'R';
    k = node('leg' + side, 'hips', [s * 0.15, -0.08, 0]);
    k.add('under', cap(0.105, 0.26), [0, -0.2, 0]).add('A', rb(0.2, 0.3, 0.12, 0.04), [0, -0.2, -0.07], [-0.05, 0, 0]).add('D', rb(0.08, 0.24, 0.2, 0.03), [s * 0.1, -0.2, 0]);
    if (s > 0) k.add('gun', rb(0.07, 0.2, 0.12, 0.02), [0.15, -0.2, 0.02]);
    k = node('shin' + side, 'leg' + side, [0, -0.44, 0]);
    k.add('G', rb(0.16, 0.2, 0.1, 0.04), [0, 0, -0.07], [0.1, 0, 0]).add('under', cap(0.085, 0.26), [0, -0.22, 0.01]).add('A', rb(0.18, 0.32, 0.17, 0.05), [0, -0.22, -0.035]).add('strip', bx(0.03, 0.14, 0.012), [0, -0.2, -0.123])
      .add('D', rb(0.19, 0.13, 0.34, 0.04), [0, -0.415, -0.06]).add('gun', bx(0.2, 0.04, 0.36), [0, -0.47, -0.06]).add('D', rb(0.2, 0.1, 0.1, 0.03), [0, -0.36, 0.08]).add('G', rb(0.2, 0.09, 0.1, 0.03), [0, -0.435, -0.2]); }
  k = node('torso', 'hips', [0, 0.1, 0]);
  k.add('under', rb(0.36, 0.26, 0.24, 0.08), [0, 0.1, 0]).add('D', rb(0.3, 0.07, 0.06, 0.02), [0, 0.08, -0.12]).add('D', rb(0.26, 0.07, 0.06, 0.02), [0, 0.0, -0.115])
    .add('A', rb(0.6, 0.4, 0.36, 0.1), [0, 0.4, 0]).add('D', rb(0.44, 0.2, 0.1, 0.04), [0, 0.46, -0.17], [-0.2, 0, 0]).add('G', rb(0.2, 0.1, 0.06, 0.02), [0, 0.3, -0.18], [0.1, 0, 0]).add('G', rb(0.62, 0.05, 0.1, 0.02), [0, 0.22, -0.14])
    .add('strip', bx(0.1, 0.025, 0.02), [0.11, 0.5, -0.225]).add('strip', bx(0.1, 0.025, 0.02), [-0.11, 0.5, -0.225]).add('D', cyl(0.16, 0.21, 0.1, 12), [0, 0.63, 0.02])
    .add('A', rb(0.42, 0.46, 0.18, 0.05), [0, 0.4, 0.26]).add('G', rb(0.44, 0.05, 0.19, 0.02), [0, 0.2, 0.26]).add('A', rb(0.36, 0.1, 0.2, 0.04), [0, 0.66, 0.25]).add('A', rb(0.2, 0.2, 0.05, 0.02), [0, 0.42, 0.355])
    .add('gun', cyl(0.06, 0.06, 0.34, 8), [0.17, 0.36, 0.36]).add('gun', cyl(0.06, 0.06, 0.34, 8), [-0.17, 0.36, 0.36]).add('gun', cyl(0.05, 0.07, 0.08, 8), [0.17, 0.15, 0.36]).add('gun', cyl(0.05, 0.07, 0.08, 8), [-0.17, 0.15, 0.36])
    .add('strip', bx(0.025, 0.14, 0.012), [0.05, 0.42, 0.383]).add('strip', bx(0.025, 0.14, 0.012), [-0.05, 0.42, 0.383]).add('strip', bx(0.24, 0.02, 0.012), [0, 0.66, 0.352])
    .add('gun', cyl(0.008, 0.012, 0.5, 5), [0.17, 0.92, 0.3]).add('strip', sph(0.022, 6, 5), [0.17, 1.17, 0.3]);
  k = node('head', 'torso', [0, 0.74, 0]);
  k.add('under', cyl(0.07, 0.085, 0.1, 8), [0, -0.03, 0]).add('A', rb(0.36, 0.34, 0.42, 0.11), [0, 0.14, 0]).add('A', rb(0.3, 0.1, 0.36, 0.04), [0, 0.3, 0.01]).add('D', rb(0.28, 0.13, 0.26, 0.05), [0, 0.02, -0.06])
    .add('visor', rb(0.3, 0.11, 0.08, 0.03), [0, 0.14, -0.185]).add('visor', rb(0.05, 0.11, 0.16, 0.02), [0.165, 0.14, -0.12]).add('visor', rb(0.05, 0.11, 0.16, 0.02), [-0.165, 0.14, -0.12]).add('D', rb(0.38, 0.05, 0.14, 0.02), [0, 0.215, -0.17], [-0.2, 0, 0])
    .add('D', rb(0.06, 0.07, 0.36, 0.02), [0, 0.36, 0.02]).add('G', cyl(0.065, 0.065, 0.06, 10), [0.2, 0.1, 0.02], [0, 0, PI / 2]).add('G', cyl(0.065, 0.065, 0.06, 10), [-0.2, 0.1, 0.02], [0, 0, PI / 2])
    .add('strip', bx(0.1, 0.02, 0.02), [0, 0.06, 0.222]).add('D', rb(0.1, 0.08, 0.08, 0.02), [0, -0.01, -0.19]);
  for (const s of [-1, 1]) { const side = s < 0 ? 'L' : 'R';
    k = node('arm' + side, 'torso', [s * SHOULDER[0], SHOULDER[1], SHOULDER[2]]);
    k.add('A', rb(0.2, 0.15, 0.3, 0.05), [s * 0.03, 0.04, 0], [0, 0, s * -0.3]).add('G', rb(0.2, 0.05, 0.31, 0.02), [s * 0.065, -0.055, 0], [0, 0, s * -0.3]).add('D', sph(0.09, 8, 6), [0, -0.02, 0]).add('under', cap(0.075, 0.2), [0, -0.19, 0]);
    k = node('fore' + side, 'arm' + side, [0, -ARM1, 0]);
    k.add('D', sph(0.085), [0, 0, 0]).add('under', cap(0.065, 0.18), [0, -0.16, 0]).add('A', rb(0.14, 0.2, 0.15, 0.05), [0, -0.16, 0]).add('strip', bx(0.02, 0.1, 0.153), [0, -0.16, 0]).add('gun', sph(0.065), [0, -ARM2 + 0.02, 0], null, [1, 1.1, 1]); }
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
export function makeSoldier(M, main, accent, over) { const m = rig('soldier', soldierDef, M, Object.assign({ A: main || M.armor, D: accent || M.armorD, G: M.gold }, over || {})), J = m.userData.J; m.rotation.order = 'YXZ'; m.userData.gun = J.gun; m.userData.head = J.head; poseSoldier(m, {}); return m; }
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
function swarmDef(node) { const k = node('body', null, [0, 0.55, 0]);
  k.add('bug', sph(0.34), [0, 0, 0.1], null, [1.1, 0.8, 1.3]).add('plate', sph(0.3), [0, 0.19, 0.12], null, [1.2, 0.32, 1.05]).add('plate', sph(0.2), [0, 0.2, 0.42], null, [1.1, 0.3, 0.7]);
  [[-0.35, 0.06, 0.3], [-0.7, 0.14, 0.24], [-0.98, 0.22, 0.16]].forEach((a, i) => { k.add('bug', sph(a[2]), [0, a[1], a[0]], null, [1, 0.85, 1.15]).add('plate', sph(a[2]), [0, a[1] + a[2] * 0.5, a[0]], null, [1.05, 0.35, 0.9]); for (const s of [-1, 1]) k.add('bug', cone(0.07, 0.62 - i * 0.1, 5), [s * 0.17, a[1] + a[2] + 0.16, a[0] + 0.12], [0.75, 0, s * -0.25], [0.6, 1, 1.3]);
    for (const s of [-1, 1]) k.add('bugGlow', sph(0.05, 6, 5), [s * a[2] * 0.9, a[1], a[0]], null, [0.5, 0.9, 2]); });
  for (let i = 0; i < 7; i++) k.add('egg', sph(0.1 - (i % 3) * 0.012, 8, 6), [Math.cos(i * 1.05) * (i ? 0.11 : 0), 0.3 + (i ? 0 : 0.07) + (i % 2) * 0.03, -0.3 + Math.sin(i * 1.05) * (i ? 0.16 : 0)]);
  k.add('bugD', cone(0.06, 0.45, 5), [0, 0.26, -1.28], [-PI / 2 - 0.3, 0, 0]).add('bugD', sph(0.2), [0, -0.02, 0.55], null, [1.1, 0.8, 1.2]).add('plate', sph(0.16), [0, 0.08, 0.5], null, [1.2, 0.5, 1.2]);
  for (const s of [-1, 1]) k.add('plate', cone(0.05, 0.46, 5), [s * 0.14, -0.08, 0.86], [PI / 2, 0, s * 0.3]).add('plate', cone(0.03, 0.25, 4), [s * 0.06, -0.12, 0.8], [PI / 2 + 0.3, 0, s * -0.2]).add('bugGlow', sph(0.045, 6, 5), [s * 0.09, 0.07, 0.72]).add('bugGlow', sph(0.035, 6, 5), [s * 0.16, 0.04, 0.62]).add('bugD', cone(0.012, 0.5, 4), [s * 0.1, 0.25, 0.75], [0.9, 0, s * -0.5]);
  legs(node, LEGS.swarm = [], 3, 0.5, 0.3, [0.32, 0.02, -0.28], [0.42, 0.36], [0.8, 0], 0.08, 'bug'); }
function spitterDef(node) { let k = node('body', null, [0, 1.5, 0]);
  k.add('bug', sph(0.36), [0, 0.1, 0], null, [0.9, 1.3, 0.9]).add('plate', sph(0.3), [0, 0.3, -0.12], null, [1.05, 1.2, 0.6]).seg('bug', [0, 0.4, 0.1], [0, 0.88, 0.48], 0.17, 0.11, 8);
  for (let i = 0; i < 4; i++) k.add('bugD', cone(0.05, 0.4 - i * 0.05, 5), [0, 0.6 - i * 0.22, -0.3 - i * 0.02], [-1.0, 0, 0]);
  for (const s of [-1, 1]) k.add('bugGlow', sph(0.05, 6, 5), [s * 0.3, 0.2, 0.05], null, [0.5, 2, 1]).seg('bugD', [s * 0.25, 0.25, 0.2], [s * 0.3, -0.25, 0.55], 0.05, 0.02, 5).seg('plate', [s * 0.3, -0.25, 0.55], [s * 0.2, -0.5, 0.75], 0.03, 0.006, 4);
  k = node('sac', 'body', [0, -0.15, -0.5]); k.add('acid', sph(0.44, 14, 10), null, null, [1, 1.05, 1.15]).add('bugD', torus(0.45, 0.028), null, [0, 0, 0], [1, 1.05, 1]).add('bugD', torus(0.45, 0.028), null, [0, PI / 2, 0], [1.15, 1.05, 1]).add('bugD', torus(0.47, 0.028), null, [PI / 2, 0, 0], [1, 1.15, 1]).add('bugD', cone(0.07, 0.3, 5), [0, 0, -0.6], [-PI / 2, 0, 0]);
  k = node('head', 'body', [0, 0.9, 0.5]); k.add('bugD', sph(0.2), [0, 0, 0.1], null, [0.9, 0.8, 1.5]).add('plate', sph(0.17), [0, 0.07, 0.05], null, [1, 0.5, 1.4]).add('bugD', cyl(0.06, 0.1, 0.3, 7), [0, -0.02, 0.48], [PI / 2, 0, 0]).add('acid', sph(0.065, 7, 5), [0, -0.02, 0.63]);
  for (const s of [-1, 0, 1]) k.add('plate', cone(0.07, 0.55, 4), [s * 0.14, 0.22, -0.12], [-0.9, 0, s * -0.5]); for (const s of [-1, 1]) k.add('acid', sph(0.04, 6, 5), [s * 0.14, 0.06, 0.25]);
  legs(node, LEGS.spitter = [], 2, 1.35, 0.28, [0.26, -0.26], [0.5, 0.55], [0.95, 0], 0.075, 'bugD'); }
function bruteDef(boss) { return node => { let k = node('body', null, [0, 1.5, 0]);
  k.add('bug', sph(1, 16, 12), [0, 0, -0.1], null, [1.05, 0.85, 1.3]).add('bugGlow', sph(0.3, 8, 6), [0, -0.68, 0.1], null, [1, 0.4, 1.8]);
  for (let i = 0; i < 5; i++) { const z = 0.75 - i * 0.45, r = 0.95 - i * 0.09, y = 0.5 - i * 0.07; k.add('plate', sph(r, 14, 8), [0, y, z], [0.3 - i * 0.15, 0, 0], [1.15, 0.4, 0.3]).add('bug', cone(0.13, 0.6 - i * 0.06, 5), [0, y + r * 0.42, z - 0.05], [-0.5, 0, 0]); for (const s of [-1, 1]) k.add('bugD', cone(0.1, 0.55, 5), [s * (r * 1.12), y + 0.05, z], [0, 0, s * -1.15]).add('bugGlow', sph(0.07, 6, 5), [s * r * 0.9, y - 0.25, z + 0.1], null, [0.5, 1, 2]); }
  k.add('bugD', cone(0.16, 0.9, 6), [0, 0.2, -1.5], [-PI / 2 - 0.35, 0, 0]);
  if (boss) { for (let i = 0; i < 7; i++) k.add('bugGlow', cone(0.1, 1.2 - Math.abs(i - 3) * 0.14, 5), [(i - 3) * 0.24, 1.2 - Math.abs(i - 3) * 0.08, -0.1 + Math.abs(i - 3) * 0.1], [-0.2, 0, (i - 3) * -0.12]); for (const s of [-1, 1]) for (const z of [0.3, -0.5]) k.add('acid', sph(0.26, 9, 7), [s * 0.75, 0.75, z]); }
  k = node('head', 'body', [0, -0.2, 1.15]); k.add('bugD', sph(0.42), null, null, [1.1, 0.8, 1.1]).add('plate', sph(0.4), [0, 0.14, -0.05], null, [1.2, 0.5, 1.1]);
  for (const s of [-1, 1]) { k.add('plate', cone(0.12, boss ? 1.0 : 0.7, 6), [s * 0.36, 0.3, 0.25], [0.9, 0, s * -0.45]).add('plate', cone(0.09, 0.5, 5), [s * 0.2, -0.22, 0.48], [PI / 2 + 0.25, 0, s * 0.35]); for (let i = 0; i < 3; i++) k.add('bugGlow', sph(0.055 - i * 0.008, 6, 5), [s * (0.16 + i * 0.1), 0.02 + i * 0.05, 0.42 - i * 0.08]); }
  for (const s of [-1, 1]) { k = node('arm' + (s < 0 ? 'L' : 'R'), 'body', [s * 0.85, 0, 0.75]); k.seg('bugD', [0, 0, 0], [s * 0.4, -0.45, 0.5], 0.24, 0.19, 8).add('bugD', sph(0.22, 8, 6), [s * 0.4, -0.45, 0.5]).seg('plate', [s * 0.4, -0.45, 0.5], [s * 0.5, -1.45, 0.95], 0.21, 0.03, 5).add('plate', cone(0.1, 0.5, 4), [s * 0.5, -0.4, 0.3], [-0.9, 0, s * -0.6]); }
  legs(node, LEGS[boss ? 'boss' : 'brute'] = [], 2, 1.2, 0.8, [0.1, -0.85], [0.6, 0.4], [1.0, 0], 0.2, 'bugD'); }; }
const BUG = { swarm: swarmDef, leaper: node => { swarmDef(node); LEGS.leaper = LEGS.swarm; }, spitter: spitterDef, brute: bruteDef(false), boss: bruteDef(true) }, RATE = { swarm: 13, leaper: 16, spitter: 8, brute: 6, boss: 5 };
export function makeBug(M, kind, over) { const key = BUG[kind] ? kind : 'brute', m = rig('bug-' + key, BUG[key], M, over), J = m.userData.J; if (key === 'leaper') m.scale.setScalar(1.3); m.userData.kind = key; m.userData.legs = LEGS[key].map(l => ({ g: J[l.n], s: l.s, ph: l.ph, splay: l.splay })); m.userData.y0 = J.body.position.y; if (key === 'boss') m.scale.setScalar(1.7); return m; }
// s: t (seconds), move 0..1, atk 0..1
export function poseBug(m, s) { const U = m.userData, J = U.J, t = s.t || 0, mv = s.move === undefined ? 1 : s.move, atk = s.atk || 0, w = t * RATE[U.kind], big = U.kind === 'brute' || U.kind === 'boss';
  for (const l of U.legs) { const p = w + l.ph, f = Math.sin(p) * mv; l.g.rotation.y = l.s * (-(f * 0.5) - l.splay); l.g.rotation.z = l.s * Math.max(0, Math.cos(p)) * (big ? 0.22 : 0.4) * mv; }
  J.body.position.y = U.y0 + Math.sin(w * 2) * (big ? 0.07 : 0.035) * mv - atk * 0.08; J.body.rotation.set(Math.sin(w) * 0.03 * mv - atk * (big ? 0.18 : 0.3), 0, Math.cos(w) * (big ? 0.05 : 0.07) * mv);
  if (J.head) J.head.rotation.set(-atk * 0.4 + Math.sin(t * 2.3) * 0.06, Math.sin(t * 1.7) * 0.12, 0);
  if (J.sac) J.sac.scale.setScalar(1 + Math.sin(t * 3) * 0.05 + atk * 0.16);
  if (J.armL) { J.armL.rotation.x = Math.sin(w) * 0.25 * mv - atk * 1.2; J.armR.rotation.x = -Math.sin(w) * 0.25 * mv - atk * 1.2; }
}

// ---------- Hive, turret and the rest (built once each, so no cache needed beyond the rig)
function hiveDef(node) { let k = node('mound', null, [0, 0, 0]);
  k.add('bugD', lathe([[3.6, 0], [3.5, 0.7], [3.0, 1.7], [2.3, 2.6], [1.5, 3.3], [1.0, 4.0], [0.75, 4.6], [0.5, 4.7]], 18)).add('plate', torus(3.3, 0.22), [0, 1.0, 0], [PI / 2, 0, 0]).add('plate', torus(2.45, 0.18), [0, 2.4, 0], [PI / 2, 0, 0]).add('plate', torus(1.3, 0.14), [0, 3.6, 0], [PI / 2, 0, 0]);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 2.3 + (i % 3) * 0.35, h = 5 + (i * 37 % 5) * 0.9, c = Math.cos(a), z = Math.sin(a), p0 = [c * r, 0.5, z * r], p1 = [c * (r + 0.9), h * 0.45, z * (r + 0.9)], p2 = [c * (r + 0.8), h * 0.8, z * (r + 0.8)], p3 = [c * (r - 0.2), h, z * (r - 0.2)]; k.seg('bug', p0, p1, 0.6, 0.42, 7).add('bug', sph(0.42, 8, 6), p1).seg('bug', p1, p2, 0.42, 0.26, 7).add('bug', sph(0.26, 8, 6), p2).seg('plate', p2, p3, 0.26, 0.03, 6).add('plate', torus(0.5, 0.08), p1, [PI / 2, 0, 0]); }
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = 5.6 + (i % 3) * 1.4; k.seg('bugD', [Math.cos(a) * 3.2, 0.5, Math.sin(a) * 3.2], [Math.cos(a + 0.2) * r, 0.05, Math.sin(a + 0.2) * r], 0.4, 0.06, 5); }
  k = node('glow', null, [0, 0, 0], false); k.add('bugGlow', sph(0.8, 12, 9), [0, 4.9, 0], null, [1, 0.8, 1]);
  for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.4, y = 1.2 + (i % 3) * 0.9, r = 3.15 - (y - 1) * 0.55; k.add('bugGlow', sph(0.42 - (i % 3) * 0.06, 9, 7), [Math.cos(a) * r, y, Math.sin(a) * r], null, [1, 1.3, 1]); } }
export function makeHive(M) { const m = rig('hive', hiveDef, M), l = new THREE.PointLight(0xff3060, 110, 40, 2); l.position.y = 4.5; m.add(l); m.userData.legs = []; m.userData.glow = m.userData.J.glow; return m; }
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
