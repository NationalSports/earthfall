// Frontline pathfinding (recast-navigation): a navigation mesh is baked for each mission from the terrain and every
// solid box (buildings, wrecks, rocks, the ship hull), and creatures and squadmates ask it for a route when the
// straight line to where they want to go is blocked.
import { init, NavMeshQuery } from 'recast-navigation';
import { generateTiledNavMesh } from 'recast-navigation/generators';

let ready = null;
export function initNav() { if (!ready) ready = init().then(() => true, e => { console.warn('pathfinding unavailable', e); return false; }); return ready; }

// H(x, z) is the ground height, solids the list of {x0, x1, z0, z1, h} boxes, half the half-width of the map.
export async function buildNav(H, solids, half, floorAt) {
  if (!(await initNav())) return null; const t0 = performance.now();
  const pos = [], idx = [], STEP = 4, n = Math.ceil(half * 2 / STEP);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = -half + i * STEP, z = -half + j * STEP; pos.push(x, H(x, z), z); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  // each solid becomes a closed box from below the ground to its top, so recast sees a wall (tall) or a step (low)
  for (const q of solids) { const h = isFinite(q.h) ? q.h : 30; if (h <= 0.05) continue; const gy = Math.min(H(q.x0, q.z0), H(q.x1, q.z1), H(q.x0, q.z1), H(q.x1, q.z0)) - 1, ty = Math.max(H(q.x0, q.z0), H(q.x1, q.z1), H(q.x0, q.z1), H(q.x1, q.z0)) + h, b = pos.length / 3;
    for (const [x, y, z] of [[q.x0, gy, q.z0], [q.x1, gy, q.z0], [q.x1, gy, q.z1], [q.x0, gy, q.z1], [q.x0, ty, q.z0], [q.x1, ty, q.z0], [q.x1, ty, q.z1], [q.x0, ty, q.z1]]) pos.push(x, y, z);
    for (const f of [[4, 6, 5], [4, 7, 6], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]) idx.push(b + f[0], b + f[1], b + f[2]); }
  const cs = 0.5, ch = 0.25, res = generateTiledNavMesh(pos, idx, { cs, ch, tileSize: 64, walkableSlopeAngle: 42, walkableHeight: Math.ceil(1.6 / ch), walkableClimb: Math.floor(0.7 / ch), walkableRadius: Math.ceil(0.6 / cs), maxEdgeLen: 24, maxSimplificationError: 1.3, minRegionArea: 8, mergeRegionArea: 20, maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1 });
  if (!res.success) { console.warn('navmesh failed', res.error); return null; }
  const query = new NavMeshQuery(res.navMesh), ext = { x: 4, y: 12, z: 4 }; console.info('navmesh built in ' + Math.round(performance.now() - t0) + ' ms');
  return {
    // the corners of a route from (ax, az) to (bx, bz), or null
    route(ax, az, bx, bz) { const r = query.computePath({ x: ax, y: H(ax, az), z: az }, { x: bx, y: H(bx, bz), z: bz }, { halfExtents: ext, maxPathPolys: 384 }); if (!r.success || !r.path || r.path.length < 2) return null; return r.path.map(p => [p.x, p.z]); },
    ms: performance.now() - t0 };
}
