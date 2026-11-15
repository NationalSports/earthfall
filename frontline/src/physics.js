// Frontline physics (Rapier): dead creatures become tumbling bodies thrown by the shot or blast that killed them,
// bouncing off the ground and anything solid before they settle. One world per mission.
import * as THREE from 'three';

let R = null, boot = null;
const ready = () => boot || (boot = (async () => { for (let i = 0; i < 100 && !window.RAPIER; i++) await new Promise(r => setTimeout(r, 100)); if (!window.RAPIER) return false; R = window.RAPIER; await R.init(); return true; })().catch(e => { console.warn('physics unavailable', e); return false; }));
ready();

export function createPhysics(scene) {
  let world = null, gen = 0; const bodies = [], box = new THREE.Box3(), size = new THREE.Vector3(), mid = new THREE.Vector3(), q = new THREE.Quaternion();
  return {
    // ground as a height grid, every solid box as a static block
    async setup(H, solids, half) { const g = ++gen; if (!(await ready())) return; if (g !== gen) return; this.clear(); if (world) world.free(); world = new R.World({ x: 0, y: -16, z: 0 });
      const N = 160, hs = new Float32Array((N + 1) * (N + 1)); for (let c = 0; c <= N; c++) for (let r = 0; r <= N; r++) { const x = -half + c * 2 * half / N, z = -half + r * 2 * half / N; hs[r + c * (N + 1)] = H(x, z); }
      world.createCollider(R.ColliderDesc.heightfield(N, N, hs, { x: half * 2, y: 1, z: half * 2 }).setFriction(0.9));
      for (const s of solids) { const h = isFinite(s.h) ? s.h : 30, cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, gy = H(cx, cz); world.createCollider(R.ColliderDesc.cuboid((s.x1 - s.x0) / 2, h / 2 + 0.5, (s.z1 - s.z0) / 2).setTranslation(cx, gy + h / 2 - 0.5, cz).setFriction(0.8)); } },
    // hand a dead model to physics: it keeps its pose and flies off along (ix, iy, iz), metres per second
    throw(m, ix, iy, iz, spin) { if (!world) return false; m.updateWorldMatrix(true, true); box.setFromObject(m); if (box.isEmpty()) return false; box.getSize(size); box.getCenter(mid);
      const pivot = new THREE.Group(); pivot.position.copy(mid); m.parent.add(pivot); pivot.updateMatrixWorld(true); pivot.attach(m);
      const hx = Math.max(0.15, size.x * 0.4), hy = Math.max(0.12, size.y * 0.38), hz = Math.max(0.15, size.z * 0.4), body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(mid.x, mid.y, mid.z).setLinearDamping(0.15).setAngularDamping(0.6).setCcdEnabled(true));
      world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setDensity(1.2).setFriction(0.9).setRestitution(0.15), body);
      body.setLinvel({ x: ix, y: iy, z: iz }, true); body.setAngvel({ x: (Math.random() - 0.5) * spin, y: (Math.random() - 0.5) * spin * 0.5, z: (Math.random() - 0.5) * spin }, true);
      bodies.push({ body, pivot, m, t: 0 }); if (bodies.length > 40) this.drop(bodies[0]); return true; },
    drop(b) { const i = bodies.indexOf(b); if (i >= 0) bodies.splice(i, 1); if (world) world.removeRigidBody(b.body); if (b.pivot.parent) b.pivot.parent.remove(b.pivot); },
    clear() { for (const b of bodies.slice()) this.drop(b); },
    // step and copy body poses onto the models; after a while they sink into the ground and go
    update(dt) { if (!world || !bodies.length) return; world.timestep = Math.min(dt, 1 / 30); world.step();
      for (const b of bodies.slice()) { b.t += dt; const p = b.body.translation(), r = b.body.rotation(); b.pivot.position.set(p.x, p.y - (b.t > 5 ? (b.t - 5) * 0.8 : 0), p.z); b.pivot.quaternion.set(r.x, r.y, r.z, r.w); if (b.t > 5 && !b.frozen) { b.frozen = true; b.body.setBodyType(R.RigidBodyType.Fixed, false); } if (b.t > 7) this.drop(b); } },
    get count() { return bodies.length; } }; }
