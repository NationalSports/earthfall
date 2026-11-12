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
if (src.soldier) new GLTFLoader().parse(bytes(src.soldier), '', g => {
  const scene = g.scene; let mat = null; scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; mat = o.material; } });
  mat.side = THREE.FrontSide; mat.envMapIntensity = 0.9; if (mat.map) mat.map.anisotropy = 4;
  const box = new THREE.Box3().setFromObject(scene); ready.soldier = { scene, clip: g.animations[0] || null, scale: HEIGHT / (box.max.y - box.min.y), mat, red: null };
  for (const w of waiting.splice(0)) w();
}, e => console.warn('soldier model failed to load', e));

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
    if (variant === 'red') { if (!S.red) { S.red = S.mat.clone(); S.red.map = redTexture(S.mat.map); } body.traverse(o => { if (o.isMesh) o.material = S.red; }); }
    const bone = {}; body.traverse(o => { if (o.isBone) bone[o.name] = o; }); const U = { holder, body, bone, mixer: null, act: null, dur: 1, rest: {} };
    for (const k in bone) U.rest[k] = bone[k].quaternion.clone();
    if (S.clip) { U.mixer = new THREE.AnimationMixer(body); const clip = S.clip.clone(); clip.tracks = clip.tracks.filter(t => !/Hips\.position/.test(t.name)); U.act = U.mixer.clipAction(clip); U.act.play(); U.dur = clip.duration; }
    m.updateWorldMatrix(true, true); const len = (a, b) => bone[B(a)].getWorldPosition(_a).distanceTo(bone[B(b)].getWorldPosition(_b)); U.l1 = len('RightArm', 'RightForeArm'); U.l2 = len('RightForeArm', 'RightHand'); m.userData.body = U; };
  if (ready.soldier) go(); else if (src.soldier) waiting.push(go);
}
const X = new THREE.Vector3(), _T = new THREE.Vector3(), _pole = new THREE.Vector3(), _mq = new THREE.Quaternion();
// Called after the code rig has been posed: s is the same state, grips are the two hand targets in the gun's own space.
export function poseBody(m, s, gripL, gripR) { const U = m.userData.body; if (!U) return; const J = m.userData.J, bn = U.bone, mv = s.move || 0, run = s.run || 0, hang = s.dead || s.air || s.dive;
  for (const k in U.rest) bn[k].quaternion.copy(U.rest[k]);
  if (U.mixer) { U.act.setEffectiveWeight(hang ? 0 : Math.min(1, mv * (0.6 + 0.4 * run))); const ph = ((s.walk || 0) / (Math.PI * 2)) % 1; U.mixer.setTime((ph < 0 ? ph + 1 : ph) * U.dur); }
  U.holder.position.y = -mv * 0.02; m.updateWorldMatrix(true, true); if (s.dead) return;
  m.getWorldQuaternion(_mq); X.set(1, 0, 0).applyQuaternion(_mq);
  const lean = (s.pitch || 0) * 0.45 - 0.06 * mv - (s.kick || 0) * 0.03; turn(bn[B('Spine1')], _q.setFromAxisAngle(X, lean)); turn(bn[B('Head')], _q.setFromAxisAngle(X, (s.pitch || 0) * 0.3));
  if (hang) { for (const sd of ['Left', 'Right']) { turn(bn[B(sd + 'UpLeg')], _q.setFromAxisAngle(X, sd === 'Left' ? -0.5 : -0.15)); turn(bn[B(sd + 'Leg')], _q.setFromAxisAngle(X, sd === 'Left' ? 0.9 : 0.5)); } }
  for (const sd of ['Left', 'Right']) { const R = sd === 'Right'; J.gun.localToWorld(_T.copy(R ? gripR : gripL)); _pole.set(R ? 0.6 : -0.6, -1, 0.35).applyQuaternion(_mq); reach(bn[B(sd + 'Arm')], bn[B(sd + 'ForeArm')], bn[B(sd + 'Hand')], _T, _pole, U.l1 * 1, U.l2); }
}
