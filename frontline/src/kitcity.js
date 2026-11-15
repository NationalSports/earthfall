// Frontline modular buildings from the Quaternius Downtown City MegaKit (CC0). A building is a footprint, a number of
// floors and a style; this file turns it into wall, window, door, column, cornice and roof modules on a 2 m grid, and
// draws every module of the city as instances, grouped into 120 m cells so cells behind the camera are skipped.
import * as THREE from 'three';
import { onKit } from './glb.js';

// Each style: ground floor bay, door, upper bays (2 m and 4 m), plain filler, corner columns, cornice.
const STYLES = {
  brick: { ground: ['Trim_FirstFloor_Window_001', 'Trim_FirstFloor_Window_001', 'Trim_FirstFloor_Wall'], door: 'DoorFrame_Trim', up2: ['Brick_Window_Trim', 'Brick_Window_Trim_Single', 'Brick_Window_Trim'], up4: [], plain: 'Brick_Plain_3', top2: 'Brick_TopTrim', corner: ['Brick_CornerColumn_Bottom', 'Brick_CornerColumn_Center', 'Brick_CornerColumn_Top', 'Brick_CornerColumn_Cap'], cornice: 'Cornice_Trim_Center' },
  pale: { ground: ['Metal_FirstFloor_Window', 'Metal_FirstFloor_Window', 'Metal_FirstFloor_Wall'], door: 'DoorFrame_Wooden', up2: ['Brick_Window_Square_Single'], up4: ['Brick_Inset_Window', 'Brick_Inset_Window_Curved', 'Brick_RedWhite_DoubleWindow'], plain: 'Brick_Plain_3', top2: 'Brick_HalfTrim', corner: ['Brick_CornerColumn_Bottom', 'Brick_CornerColumn_Center', 'Brick_CornerColumn_Top', 'Brick_CornerColumn_Cap'], cornice: 'Cornice_Brick_Center' },
  arch: { ground: ['Trim_FirstFloor_Window_001', 'Trim_FirstFloor_Wall'], door: 'DoorFrame_Trim', up2: ['Brick_Window_Trim_Single'], up4: ['Brick_Window_CurvedDouble', 'Brick_Inset_Window_Curved'], plain: 'Brick_Plain_3', top2: 'Brick_TopTrim', corner: ['Trim_Column_Bottom', 'Trim_Column_Center', 'Trim_Column_Top', null], cornice: 'Cornice_Trim_Center' },
  metal: { ground: ['Metal_FirstFloor_Window', 'Metal_FirstFloor_Window'], door: 'DoorFrame_Metal_Single', up2: ['Metal_FullWindow', 'Metal_FullWindow', 'Metal_Window_Half'], up4: ['Metal_Window'], plain: 'Metal_Plain_3', top2: 'Metal_Plain_3', corner: ['Metal_Column_Bottom', 'Metal_Column_Center', 'Metal_Column_Top', null], cornice: 'Cornice_Metal_Center' } };
// Whole buildings the kit ships ready-made, with their footprint (w across the front, d deep) and height.
export const READY = { Building_Small_1: [12.5, 14.5, 17, -1.0, -4.96], Building_Medium_2_001: [15, 13, 25, 0, -5.96], Building_Large_2: [20.6, 16.6, 28, 1.0, -8.0] };
const CELL = 120, ROT = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export function createKitCity() {
  const list = []; // [module name, Matrix4]; a dark inner block per building stops you seeing through shop windows
  const CORE = new THREE.BoxGeometry(1, 1, 1), coreMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.95, emissive: 0x3a2412, emissiveIntensity: 0.25 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const put = (base, name, x, y, z, rot) => { if (!name) return; q.setFromAxisAngle(up, rot || 0); const m = new THREE.Matrix4().compose(p.set(x, y, z), q, one); list.push([name, new THREE.Matrix4().multiplyMatrices(base, m)]); };
  return {
    // A building centred on base (a Matrix4: position on the ground, local +Z facing the street).
    // w and d are rounded to the 2 m grid; returns the real footprint and height.
    building(base, w, d, floors, style, r) { const S = STYLES[style] || STYLES.brick; w = Math.max(8, Math.round(w / 4) * 4); d = Math.max(8, Math.round(d / 2) * 2); const H = floors * 3;
      // the four walls, walked corner to corner: front (+Z), right (+X), back, left
      const walls = [[0, d / 2, w, 0], [w / 2, 0, d, Math.PI / 2], [0, -d / 2, w, Math.PI], [-w / 2, 0, d, -Math.PI / 2]], doorBay = Math.floor(w / 4) - (r() < 0.5 ? 1 : 0);
      walls.forEach(([cx, cz, len, rot], wi) => { const ux = Math.cos(rot), uz = -Math.sin(rot), bays = Math.round(len / 2), wide = S.up4.length && r() < 0.65;
        for (let f = 0; f < floors; f++) { const y = f * 3, pick4 = S.up4.length ? S.up4[Math.floor(r() * S.up4.length)] : null, pick2 = S.up2[Math.floor(r() * S.up2.length)];
          for (let b = 0; b < bays; b++) { const t = -len / 2 + 1 + b * 2, x = cx + ux * t, z = cz + uz * t, edge = b === 0 || b === bays - 1;
            if (f === 0) { put(base, wi === 0 && b === doorBay ? S.door : edge && wi > 0 ? S.plain : S.ground[(b + wi) % S.ground.length], x, y, z, rot); continue; }
            if (edge && wi !== 0 && r() < 0.5) { put(base, S.plain, x, y, z, rot); continue; }
            if (wide && pick4 && !edge && b + 1 < bays - 1) { const t2 = t + 1; put(base, pick4, cx + ux * t2, y, cz + uz * t2, rot); b++; continue; }
            put(base, pick2, x, y, z, rot); }
          }
        for (let b = 0; b < bays; b++) { const t = -len / 2 + 1 + b * 2; put(base, S.cornice, cx + ux * t, H, cz + uz * t, rot); } });
      // corner columns cover the seams; the roof is asphalt tiles with some plant on it
      [[w / 2, d / 2, 0], [-w / 2, d / 2, -Math.PI / 2], [-w / 2, -d / 2, Math.PI], [w / 2, -d / 2, Math.PI / 2]].forEach(([x, z, rot]) => { for (let f = 0; f < floors; f++) put(base, f === 0 ? S.corner[0] : f === floors - 1 ? S.corner[2] : S.corner[1], x, f * 3, z, rot); if (S.corner[3]) put(base, S.corner[3], x, H - 2, z, rot); });
      list.push(['#core', new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(p.set(0, H / 2, 0), q.identity(), new THREE.Vector3(w - 0.55, H - 0.05, d - 0.55)))]);
      for (let x = -w / 2 + 2; x < w / 2; x += 4) for (let z = -d / 2 + 2; z < d / 2; z += 4) put(base, 'Roof_4x4', x, H - 0.02, z, 0);
      const ac = 1 + Math.floor(r() * 3); for (let i = 0; i < ac; i++) put(base, 'Prop_ACUnit', (r() - 0.5) * (w - 4), H, (r() - 0.5) * (d - 4), ROT[Math.floor(r() * 4)]);
      if (r() < 0.6) { put(base, 'Prop_Bollard', -1.6, 0, d / 2 + 1.2, 0); put(base, 'Prop_Bollard', 1.6, 0, d / 2 + 1.2, 0); }
      return { w, d, h: H + 1 }; },
    ready(base, name) { const R = READY[name]; put(base, name, -R[3], 0, -R[4], 0); return { w: R[0], d: R[1], h: R[2] }; },
    prop(base, name) { put(base, name, 0, 0, 0, 0); },
    get count() { return list.length; },
    // turn the list into instanced meshes, once the kit has loaded
    // far cells hide; every module is still in the solids, so nothing changes for play
    cells: [], cull(cam, far) { const fx = cam.position.x, fz = cam.position.z, f2 = far * far; for (const c of this.cells) { const dx = c.x - fx, dz = c.z - fz; const v = dx * dx + dz * dz < f2; for (const m of c.meshes) m.visible = v; } },
    draw(group) { const self = this; onKit(K => { const cells = {}; const ctr = new THREE.Vector3(), byCell = {};
      K.mods['#core'] = [{ geometry: CORE, material: coreMat }]; for (const [name, M] of list) { if (!K.mods[name]) continue; ctr.setFromMatrixPosition(M); const key = name + '|' + Math.floor(ctr.x / CELL) + ',' + Math.floor(ctr.z / CELL); (cells[key] = cells[key] || []).push(M); }
      for (const key in cells) { const [name, ck] = key.split('|'), mats = cells[key], [cx, cz] = ck.split(',').map(Number), C = byCell[ck] = byCell[ck] || { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, meshes: [] };
        for (const part of K.mods[name]) { const im = new THREE.InstancedMesh(part.geometry, part.material, mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); im.castShadow = !part.material.transparent && !/Glass|Interior|Ornament/.test(part.material.name); im.receiveShadow = true; im.computeBoundingSphere(); group.add(im); C.meshes.push(im); } }
      self.cells = Object.values(byCell); }); } };
}
