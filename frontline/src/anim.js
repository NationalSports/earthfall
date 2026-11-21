// Moves clips from the Universal Animation Library (CC0, Quaternius; Unreal bone names) onto the soldier's Mixamo skeleton.
// Each bone copies how far its partner turned from the library's T-pose, measured in world space, so the two skeletons'
// different bone axes do not matter. The hips also copy their height change, scaled to the soldier's size.
import * as THREE from 'three';

const PAIRS = { pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', neck_01: 'Neck', Head: 'Head' };
for (const [u, m] of [['l', 'Left'], ['r', 'Right']]) Object.assign(PAIRS, { ['clavicle_' + u]: m + 'Shoulder', ['upperarm_' + u]: m + 'Arm', ['lowerarm_' + u]: m + 'ForeArm', ['hand_' + u]: m + 'Hand',
  ['thigh_' + u]: m + 'UpLeg', ['calf_' + u]: m + 'Leg', ['foot_' + u]: m + 'Foot', ['ball_' + u]: m + 'ToeBase' });

const bonesOf = root => { const b = {}; root.traverse(o => { b[o.name] = b[o.name] || o; }); return b; };
// Which way a skeleton faces: the average heel-to-toe direction, flattened.
function facing(b, foot, toe) { const v = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Vector3(); for (const s of ['l', 'r']) { b[foot(s)].getWorldPosition(a); b[toe(s)].getWorldPosition(c); v.add(c.sub(a)); } v.y = 0; return Math.atan2(v.x, v.z); }

// src: the library's scene and clips. dst: a fresh clone of the soldier's scene (left at its rest pose). Returns new clips by name.
export function retarget(src, clips, dst, want, prefix) {
  const S = bonesOf(src), T = bonesOf(dst), name = n => prefix + n, pairs = Object.entries(PAIRS).filter(([u, m]) => S[u] && T[name(m)]);
  src.updateMatrixWorld(true); dst.updateMatrixWorld(true);
  // the library's own rest is an A-pose; its T-pose clip matches the soldier's bind pose, so that is the reference
  const mixer = new THREE.AnimationMixer(src), tp = clips.find(c => c.name === 'A_TPose'); if (tp) { const a = mixer.clipAction(tp); a.play(); mixer.setTime(0); src.updateMatrixWorld(true); }
  const S0 = {}, T0 = {}; for (const [u, m] of pairs) { S0[u] = S[u].getWorldQuaternion(new THREE.Quaternion()); T0[m] = T[name(m)].getWorldQuaternion(new THREE.Quaternion()); }
  const sHip0 = S.pelvis.getWorldPosition(new THREE.Vector3()), tHip0 = T[name('Hips')].getWorldPosition(new THREE.Vector3()), k = tHip0.y / Math.max(0.01, sHip0.y);
  const turn = facing(T, s => name(s === 'l' ? 'LeftFoot' : 'RightFoot'), s => name(s === 'l' ? 'LeftToeBase' : 'RightToeBase')) - facing(S, s => 'foot_' + s, s => 'ball_' + s);
  const R = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), Ri = R.clone().invert();
  mixer.stopAllAction(); const out = {}, q = new THREE.Quaternion(), pq = new THREE.Quaternion(), d = new THREE.Vector3(), p = new THREE.Vector3();
  for (const [key, cname] of Object.entries(want)) { const clip = clips.find(c => c.name === cname); if (!clip) continue; mixer.stopAllAction(); const act = mixer.clipAction(clip); act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.play();
    const n = Math.max(2, Math.ceil(clip.duration * 30) + 1), times = new Float32Array(n), Q = {}, P = new Float32Array(n * 3); for (const [, m] of pairs) Q[m] = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const t = Math.min(clip.duration - 1e-3, i / 30); times[i] = t; mixer.setTime(t); src.updateMatrixWorld(true);
      for (const [u, m] of pairs) { const b = T[name(m)]; S[u].getWorldQuaternion(q); q.multiply(pq.copy(S0[u]).invert()); q.premultiply(R).multiply(Ri).multiply(T0[m]);
        b.parent.getWorldQuaternion(pq); b.quaternion.copy(pq.invert().multiply(q)); b.updateMatrixWorld(true); b.quaternion.toArray(Q[m], i * 4); }
      const hb = T[name('Hips')]; S.pelvis.getWorldPosition(d).sub(sHip0).multiplyScalar(k).applyQuaternion(R); p.copy(tHip0).add(d); hb.parent.worldToLocal(p); hb.position.copy(p); hb.updateMatrixWorld(true); p.toArray(P, i * 3); }
    const tracks = pairs.map(([, m]) => new THREE.QuaternionKeyframeTrack(name(m) + '.quaternion', times, Q[m])); tracks.push(new THREE.VectorKeyframeTrack(name('Hips') + '.position', times, P));
    out[key] = new THREE.AnimationClip(key, clip.duration, tracks); }
  mixer.stopAllAction(); return out;
}
