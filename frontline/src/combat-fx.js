import * as THREE from 'three';

// Flash, burning ground and rising smoke have separate lifetimes. Geometry and lights are bounded pools.
export function createCombatEffects(scene, H, particles) {
  const sources = [], chunks = [], MAX_SOURCES = 16, MAX_CHUNKS = 144;
  const dummy = new THREE.Object3D(); let chunkI = 0;
  const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x4e4943, roughness: 0.87, metalness: 0.25 }), MAX_CHUNKS);
  debris.name = 'blast-debris'; debris.castShadow = debris.receiveShadow = true; debris.frustumCulled = false; scene.add(debris);
  for (let i = 0; i < MAX_CHUNKS; i++) { chunks.push({ life: 0 }); dummy.scale.setScalar(0); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix); }
  const lights = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xff7227, 0, 20, 2); scene.add(l); return l; });
  function burst(x, z, radius, profile = {}) {
    const y = H(x, z), r = Math.min(5, Math.max(1, radius * 0.4));
    if (sources.length >= MAX_SOURCES) sources.shift();
    sources.push({ x, y, z, r, age: 0, flameT: 0, smokeT: 0, fire: profile.space ? 1.2 : 4 + r * 0.8,
      end: profile.space ? 7 : 12 + r, wet: profile.rain || 0, space: !!profile.space, wind: profile.wind || [1.2, 0.4], seed: Math.random() * 20 });
    for (let i = 0; i < Math.min(28, Math.round(8 + radius * 1.5)); i++) {
      const p = chunks[chunkI++ % MAX_CHUNKS], a = Math.random() * Math.PI * 2, speed = 3 + Math.random() * radius * 1.5;
      Object.assign(p, { x, y: y + 0.5, z, vx: Math.cos(a) * speed, vy: 4 + Math.random() * radius * 1.3,
        vz: Math.sin(a) * speed, rx: Math.random() * 6, ry: Math.random() * 6, spin: 2 + Math.random() * 6,
        size: 0.06 + Math.random() * Math.min(0.4, radius * 0.045), life: 8 + Math.random() * 4,
        gravity: profile.space ? 3.2 : 16, settled: false });
    }
  }
  function update(dt) {
    for (let i = sources.length - 1; i >= 0; i--) {
      const s = sources[i]; s.age += dt; s.flameT -= dt; s.smokeT -= dt;
      if (s.age > s.end) { sources.splice(i, 1); continue; }
      if (s.age < s.fire && s.flameT <= 0) {
        s.flameT += 0.055; const fade = 1 - s.age / s.fire;
        for (let j = 0; j < 3; j++) { const a = s.seed + s.age * 2.7 + j * 2.1, spread = s.r * (0.2 + fade * 0.35);
          particles.emit(s.x + Math.cos(a) * spread, s.y + 0.2, s.z + Math.sin(a) * spread, {
            n: 1, flame: true, color: j === 0 ? 0xffce69 : 0xff5920, speed: 0.4, vel: [s.wind[0] * 0.22, 1.8 + fade * 2.4, s.wind[1] * 0.22],
            life: 0.55 + fade * 0.4, size: s.r * (0.25 + fade * 0.35), size1: 0.06, gravity: -1.2, bright: 1.8, alpha: fade * 0.85 });
        }
      }
      if (s.smokeT <= 0) {
        s.smokeT += 0.13; const fade = Math.min(1, (s.end - s.age) / 3), steam = s.wet > 0.5 && s.age < 2;
        particles.emit(s.x + (Math.random() - 0.5) * s.r, s.y + 0.5, s.z + (Math.random() - 0.5) * s.r, {
          n: 2, smoke: true, color: steam ? 0xa5a7a6 : s.space ? 0x756e68 : 0x343638,
          speed: 0.45, vel: [s.wind[0] * 0.6, s.space ? 1.5 : 2.8, s.wind[1] * 0.6],
          life: s.space ? 3.5 : 5.5, size: s.r * 0.5, size1: s.r * 1.9,
          gravity: s.space ? 0.2 : -0.15, drag: 0.1, alpha: fade * (steam ? 0.3 : 0.42), bright: 1 });
      }
    }
    for (let i = 0; i < chunks.length; i++) {
      const p = chunks[i]; p.life = Math.max(0, p.life - dt);
      if (p.life > 0) {
        if (!p.settled) {
          p.vy -= p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.spin * dt; p.ry += p.spin * 0.6 * dt;
          const floor = H(p.x, p.z) + p.size * 0.5;
          if (p.y < floor) { p.y = floor; if (Math.abs(p.vy) > 1.5) { p.vy *= -0.28; p.vx *= 0.48; p.vz *= 0.48; } else p.settled = true; }
        }
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ry, 0); dummy.scale.set(p.size, p.size * 0.6, p.size * 1.5).multiplyScalar(Math.min(1, p.life));
      } else dummy.scale.setScalar(0);
      dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
    const burning = sources.filter(s => s.age < s.fire).sort((a, b) => b.r - a.r);
    lights.forEach((light, i) => { const s = burning[i]; light.intensity = s ? (20 + s.r * 11) * (1 - s.age / s.fire) * (0.85 + Math.sin(s.age * 19 + s.seed) * 0.15) : 0; if (s) light.position.set(s.x, s.y + 1.5, s.z); });
  }
  function clear() { sources.length = 0; for (const p of chunks) p.life = 0; for (const l of lights) l.intensity = 0; update(0); }
  return { burst, update, clear, get activeSources() { return sources.length; }, get activeDebris() { return chunks.filter(p => p.life > 0).length; } };
}
