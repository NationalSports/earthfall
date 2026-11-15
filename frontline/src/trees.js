// Frontline trees: EZ-Tree models drawn as instances, split into 60 m cells so the cells behind the camera are skipped.
import * as THREE from 'three';
import { onTree } from './glb.js';
import { zoneOf } from './props.js';
import { outerZone } from './outer.js';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
const CELL = 60;

// What grows where, per world and district: [model, count, min height, max height, weight towards roadsides].
const PLAN = {
  la: { downtown: [['tree-ash', 14, 7, 10, 0.8], ['tree-aspen', 8, 7, 9, 0.8]], financial: [['tree-aspen', 12, 7, 10, 0.9]], westside: [['tree-ash', 34, 8, 12, 0.6], ['tree-oak', 18, 8, 12, 0.3], ['tree-bush', 30, 1.6, 2.6, 0.2]],
    coast: [['tree-bush', 16, 1.4, 2.4, 0.3], ['tree-aspen', 8, 7, 9, 0.6]], hills: [['tree-pine', 70, 9, 15, 0], ['tree-oak', 40, 8, 13, 0], ['tree-bush', 50, 1.5, 3, 0]], port: [], beach: [] },
  kepler: { settlement: [['tree-alien', 18, 9, 14, 0.2], ['tree-alien2', 12, 8, 12, 0.2]], highlands: [['tree-alien', 46, 10, 18, 0], ['tree-alien2', 30, 9, 15, 0]], lake: [['tree-alien2', 26, 8, 13, 0]], spires: [['tree-alien2', 12, 7, 11, 0]], grove: [], wreck: [['tree-alien', 10, 8, 12, 0]] },
  ceres: {} };

export function plantTrees(group, world, H, clear, ARENA, nearRoad) {
  const plan = PLAN[world]; if (!plan) return null; const r = rng(world.length * 4099 + 17), want = {};
  const zone = world === 'la' ? zoneOf : (x, z) => outerZone(world, x, z);
  // throw darts until each district has its share; roadside trees try spots near a road first
  for (let i = 0; i < 26000; i++) { const x = (r() * 2 - 1) * (ARENA - 8), z = (r() * 2 - 1) * (ARENA - 8), zn = zone(x, z), list = plan[zn]; if (!list || !list.length) continue; const pick = list[Math.floor(r() * list.length)], [name, n, h0, h1, road] = pick, key = zn + name;
    if ((want[key] || []).length >= n) continue; if (road && r() < road && !nearRoad(x, z)) continue; if (!clear(x, z, h1 * 0.18 + 1)) continue; (want[key] = want[key] || []).push({ name, x, z, h: h0 + r() * (h1 - h0), yaw: r() * 6.283 }); }
  const spots = [].concat(...Object.values(want)), byName = {}; for (const s of spots) (byName[s.name] = byName[s.name] || []).push(s);
  const meshes = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const name in byName) onTree(name, T => { const cells = {}; for (const s of byName[name]) { const k = Math.floor(s.x / CELL) + ',' + Math.floor(s.z / CELL); (cells[k] = cells[k] || []).push(s); }
    for (const k in cells) { const list = cells[k]; for (const part of T.parts) { const im = new THREE.InstancedMesh(part.geometry, part.material, list.length); list.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); const w = s.h * (0.9 + (s.yaw % 1) * 0.25); m4.compose(p.set(s.x, H(s.x, s.z) - 0.15, s.z), q, sc.set(w, s.h, w)); im.setMatrixAt(i, m4); });
        im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); group.add(im); meshes.push(im); } } });
  return { count: spots.length, meshes };
}
