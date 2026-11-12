// Scanned models (frontline/public/assets/models/*.glb). The soldier is a skinned mesh on a Mixamo-named skeleton:
// its legs play the baked run cycle, its spine and arms are steered in code so it holds whatever the game puts in its hands.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const src = (typeof window !== 'undefined' && window.FRONTLINE_MODELS) || {}, ready = {}, waiting = [];
const HEIGHT = 1.9; // game soldier height in metres
function bytes(uri) { const s = atob(uri.slice(uri.indexOf(',') + 1)), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a.buffer; }
// Enemy troopers wear the same armour in red: the teal plates are re-tinted once into a second texture.
function redTexture(tex) { const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2]; if (gg > r * 1.12 && b > r * 1.05) { const l = (gg + b) * 0.5; p[i] = Math.min(255, l * 1.25); p[i + 1] = r * 0.55; p[i + 2] = r * 0.5; } }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = 4; return t; }
// A faint self-lit copy of the paint keeps the soldier readable at night; the cyan visor and lights glow outright.
function glowTexture(tex, red) { const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2], lit = b > 170 && gg > 140 && r < 130; if (lit) { p[i] = red ? 255 : r * 0.6; p[i + 1] = red ? 60 : gg; p[i + 2] = red ? 40 : b; } else { p[i] = r * 0.1; p[i + 1] = gg * 0.1; p[i + 2] = b * 0.1; } }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; return t; }
const load = uri => uri.startsWith('data:') ? Promise.resolve(bytes(uri)) : fetch(uri).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
if (src.soldier) load(src.soldier).then(buf => new GLTFLoader().parse(buf, '', g => {
  const scene = g.scene; let mat = null; scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; mat = o.material; } });
  mat.side = THREE.FrontSide; mat.envMapIntensity = 1.25; if (mat.map) { mat.map.anisotropy = 4; mat.emissiveMap = glowTexture(mat.map); mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 1; }
  const box = new THREE.Box3().setFromObject(scene), clips = {}; for (const c of g.animations) { if (c.name !== 'Dead') for (const t of c.tracks) if (/Hips\.position/.test(t.name)) for (let i = 0; i < t.values.length; i += 3) { t.values[i] = t.values[0]; t.values[i + 2] = t.values[2]; } clips[c.name] = c; }
  ready.soldier = { scene, clips, scale: HEIGHT / (box.max.y - box.min.y), mat, red: null };
  for (const w of waiting.splice(0)) w();
}, e => console.warn('soldier model failed to load', e))).catch(e => console.warn('soldier model failed to load', e));

const B = n => 'mixamorig' + n, _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _bq = new THREE.Quaternion(), _e = new THREE.Vector3(), _d = new THREE.Vector3(), _perp = new THREE.Vector3(), _ax = new THREE.Vector3();
// Turn a bone in world space by q, whatever its own axes are.
function turn(bone, q) { bone.parent.getWorldQuaternion(_pq); bone.getWorldQuaternion(_bq); bone.quaternion.copy(_pq.invert()).multiply(q).multiply(_bq); bone.updateWorldMatrix(false, true); }
// Swing a bone so its child lies along dir (world).
function aim(bone, child, dir) { bone.getWorldPosition(_a); child.getWorldPosition(_b); _b.sub(_a).normalize(); turn(bone, _q.setFromUnitVectors(_b, dir)); }
function reach(arm, fore, hand, T, pole, l1, l2) { arm.getWorldPosition(_c); _d.subVectors(T, _c); const len = Math.min(Math.max(_d.length(), 0.05), l1 + l2 - 0.004); _d.normalize();
  const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + len * len - l2 * l2) / (2 * l1 * len)))); _perp.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _e.copy(_d).multiplyScalar(Math.cos(a) * l1).addScaledVector(_perp, Math.sin(a) * l1); aim(arm, fore, _ax.copy(_e).normalize()); _ax.copy(_d).multiplyScalar(len).sub(_e).normalize(); aim(fore, hand, _ax); }

// Dress a code-built soldier rig in the scanned body. The rig stays underneath (hidden) and still carries the weapon.
export function dress(m, variant) {
  const go = () => { const S = ready.soldier, J = m.userData.J; if (!S || m.userData.body) return;
    m.traverse(o => { if (o.isMesh) { let p = o, gun = false; while (p) { if (p === J.gun) gun = true; p = p.parent; } if (!gun) o.visible = false; } });
    const body = cloneSkinned(S.scene), holder = new THREE.Group(); holder.rotation.y = Math.PI; holder.scale.setScalar(S.scale); holder.add(body); m.add(holder);
    if (variant === 'red') { if (!S.red) { S.red = S.mat.clone(); S.red.emissiveMap = glowTexture(S.mat.map, true); S.red.map = redTexture(S.mat.map); } body.traverse(o => { if (o.isMesh) o.material = S.red; }); }
    const bone = {}; body.traverse(o => { if (o.isBone) bone[o.name] = o; }); const U = { holder, body, bone, mixer: new THREE.AnimationMixer(body), act: {}, w: {}, rest: {}, last: null, lt: null, vx: 0, vz: 0, deadT: 0, chest: new THREE.Vector3() };
    for (const k in bone) U.rest[k] = bone[k].quaternion.clone();
    for (const [k, n] of Object.entries(CLIPS)) if (S.clips[n]) { const a = U.mixer.clipAction(S.clips[n]); a.setEffectiveWeight(0); a.play(); U.act[k] = a; U.w[k] = 0; }
    if (U.act.dead) { U.act.dead.setLoop(THREE.LoopOnce, 1); U.act.dead.clampWhenFinished = true; }
    m.updateWorldMatrix(true, true); const len = (a, b) => bone[B(a)].getWorldPosition(_a).distanceTo(bone[B(b)].getWorldPosition(_b)); U.l1 = len('RightArm', 'RightForeArm'); U.l2 = len('RightForeArm', 'RightHand'); U.mixer.update(0); pickChest(m, U, U.chest); m.userData.body = U; };
  if (ready.soldier) go(); else if (src.soldier) waiting.push(go);
}
const CLIPS = { walk: 'Walk_Forward_While_Shooting', run: 'Run_and_Shoot', back: 'Walk_Backward_with_Gun', left: 'Walk_Left_with_Gun', right: 'Walk_Left_with_Gun', dead: 'Dead' };
const X = new THREE.Vector3(), _T = new THREE.Vector3(), _pole = new THREE.Vector3(), _mq = new THREE.Quaternion(), _ch = new THREE.Vector3(), _want = {};
function pickChest(m, U, out) { m.updateWorldMatrix(true, true); return m.worldToLocal(U.bone[B('Spine2')].getWorldPosition(out)); }
// Called after the code rig has been posed: s is the same state, grips are the two hand targets in the gun's own space.
// Which clip plays is worked out from how the soldier is actually moving across the ground relative to where it faces.
export function poseBody(m, s, gripL, gripR) { const U = m.userData.body; if (!U) return; const J = m.userData.J, bn = U.bone, A = U.act, hang = s.air || s.dive;
  const t = s.t === undefined ? null : s.t, dt = t === null || U.lt === null ? 0 : Math.min(0.1, Math.max(0, t - U.lt)); U.lt = t;
  if (dt > 0 && U.last) { const k = Math.min(1, dt * 12); U.vx += ((m.position.x - U.last.x) / dt - U.vx) * k; U.vz += ((m.position.z - U.last.z) / dt - U.vz) * k; } (U.last || (U.last = new THREE.Vector3())).copy(m.position);
  const yaw = m.rotation.y, fwd = -(U.vx * Math.sin(yaw) + U.vz * Math.cos(yaw)), side = U.vx * Math.cos(yaw) - U.vz * Math.sin(yaw), sp = Math.hypot(fwd, side), mv = Math.min(1, sp / 2.2);
  for (const k in A) _want[k] = 0;
  if (s.dead) { _want.dead = 1; m.rotation.x = 0; U.holder.position.y = -0.3; }
  else { U.holder.position.y = 0; const f = Math.max(0, fwd) / (sp || 1), b = Math.max(0, -fwd) / (sp || 1), l = Math.max(0, -side) / (sp || 1), r = Math.max(0, side) / (sp || 1), n = f + b + l + r || 1, fast = Math.min(1, Math.max(0, (sp - 7) / 2));
    _want.idle = 1 - mv; _want.run = mv * f / n * fast; _want.walk = mv * f / n * (1 - fast); _want.back = mv * b / n; _want.left = mv * l / n; _want.right = mv * r / n; if (hang) { for (const k in _want) _want[k] = 0; _want.idle = 1; } }
  const kk = t === null ? 1 : Math.min(1, dt * 9); let idleW = 0, walkW = 0, leftW = 0, rightW = 0;
  for (const k in A) { U.w[k] += (_want[k] - U.w[k]) * kk; }
  // Clips that share one animation (idle and walk, left and right) share one action: its weight is the sum, its speed set by whichever leads.
  const cad = Math.min(1.5, Math.max(0.75, sp / 5));
  if (A.walk) { A.walk.setEffectiveWeight(U.w.walk); A.walk.timeScale = cad * 1.25; }
  if (A.run) { A.run.setEffectiveWeight(U.w.run); A.run.timeScale = Math.min(1.5, Math.max(0.85, sp / 8.5)); }
  if (A.back) { A.back.setEffectiveWeight(U.w.back); A.back.timeScale = cad; }
  if (A.left) { A.left.setEffectiveWeight(U.w.left + U.w.right); A.left.timeScale = U.w.right > U.w.left ? -cad : cad; }
  if (A.dead) { A.dead.setEffectiveWeight(U.w.dead); if (s.dead) { if (!U.deadT) A.dead.reset().play(); U.deadT += dt; if (t === null) A.dead.time = A.dead.getClip().duration; } else U.deadT = 0; }
  for (const k in U.rest) bn[k].quaternion.copy(U.rest[k]); U.mixer.update(dt);
  if (s.dead) { m.updateWorldMatrix(true, true); return; }
  // The weapon rides the chest, so it bobs and sways with the body instead of floating in front of it.
  pickChest(m, U, _ch).sub(U.chest); J.gun.position.x += _ch.x * 0.8; J.gun.position.y += _ch.y; J.gun.position.z += _ch.z * 0.8; m.updateWorldMatrix(true, true);
  m.getWorldQuaternion(_mq); X.set(1, 0, 0).applyQuaternion(_mq);
  const lean = (s.pitch || 0) * 0.45 - (s.kick || 0) * 0.03 + 0.06 + Math.sin((t || 0) * 1.9) * 0.012; turn(bn[B('Spine1')], _q.setFromAxisAngle(X, lean)); turn(bn[B('Head')], _q.setFromAxisAngle(X, (s.pitch || 0) * 0.3));
  if (hang) { for (const sd of ['Left', 'Right']) { turn(bn[B(sd + 'UpLeg')], _q.setFromAxisAngle(X, sd === 'Left' ? -0.5 : -0.15)); turn(bn[B(sd + 'Leg')], _q.setFromAxisAngle(X, sd === 'Left' ? 0.9 : 0.5)); } }
  for (const sd of ['Left', 'Right']) { const R = sd === 'Right'; J.gun.localToWorld(_T.copy(R ? gripR : gripL)); _pole.set(R ? 0.6 : -0.6, -1, 0.35).applyQuaternion(_mq); reach(bn[B(sd + 'Arm')], bn[B(sd + 'ForeArm')], bn[B(sd + 'Hand')], _T, _pole, U.l1, U.l2); }
}
