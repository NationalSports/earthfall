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
const LODCOL = { brick: 0x7a4a3a, pale: 0xb8ab94, arch: 0x8a5a44, metal: 0x3c4650 }, LODBOX = new THREE.BoxGeometry(1, 1, 1), LODMAT = {};
// the far blocks get windows drawn by the shader from world position: 2 m bays, 3 m floors, some lit
for (const k in LODCOL) { const m = new THREE.MeshStandardMaterial({ color: LODCOL[k], roughness: 0.88 }); m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvec4 wpL = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwpL = instanceMatrix * wpL;\n#endif\nvWP = (modelMatrix * wpL).xyz; vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (abs(vWN.y) < 0.5) { float u = abs(vWN.x) > 0.5 ? vWP.z : vWP.x; float bu = fract(u / 2.0), bv = fract(vWP.y / 3.0); float win = step(0.22, bu) * step(bu, 0.82) * step(0.28, bv) * step(bv, 0.82) * step(3.0, mod(vWP.y + 600.0, 600.0) - 0.0);
        float cell = fract(sin(dot(floor(vec3(u / 2.0, vWP.y / 3.0, (abs(vWN.x) > 0.5 ? vWP.x : vWP.z))), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.1, 0.12), win * 0.85); totalEmissiveRadiance += win * step(0.72, cell) * vec3(1.0, 0.72, 0.42) * 0.9; }`); };
  m.customProgramCacheKey = () => 'kitlod'; LODMAT[k] = m; }
const CELL = 80, ROT = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export function createKitCity() {
  const list = [], lods = []; // [module name, Matrix4]; lods: [style, Matrix4] for the plain blocks drawn at a distance; a dark inner block per building stops you seeing through shop windows
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
      lods.push([style in LODCOL ? style : 'brick', new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(p.set(0, (H + 1) / 2, 0), q.identity(), new THREE.Vector3(w, H + 1, d)))]);
      list.push(['#core', new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(p.set(0, H / 2, 0), q.identity(), new THREE.Vector3(w - 0.55, H - 0.05, d - 0.55)))]);
      for (let x = -w / 2 + 2; x < w / 2; x += 4) for (let z = -d / 2 + 2; z < d / 2; z += 4) put(base, 'Roof_4x4', x, H - 0.02, z, 0);
      const ac = 1 + Math.floor(r() * 3); for (let i = 0; i < ac; i++) put(base, 'Prop_ACUnit', (r() - 0.5) * (w - 4), H, (r() - 0.5) * (d - 4), ROT[Math.floor(r() * 4)]);
      if (r() < 0.6) { put(base, 'Prop_Bollard', -1.6, 0, d / 2 + 1.2, 0); put(base, 'Prop_Bollard', 1.6, 0, d / 2 + 1.2, 0); }
      return { w, d, h: H + 1 }; },
    ready(base, name) { const R = READY[name]; put(base, name, -R[3], 0, -R[4], 0); lods.push(['pale', new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(p.set(0, R[2] / 2, 0), q.identity(), new THREE.Vector3(R[0], R[2], R[1])))]); return { w: R[0], d: R[1], h: R[2] }; },
    prop(base, name) { put(base, name, 0, 0, 0, 0); },
    get count() { return list.length; },
    // turn the list into instanced meshes, once the kit has loaded
    // far cells hide; every module is still in the solids, so nothing changes for play
    // near cells draw every module; further out a plain block per building stands in; beyond `far` nothing
    cells: [], cull(cam, far, near) { near = near || far * 0.5; const fx = cam.position.x, fz = cam.position.z; for (const c of this.cells) { const d = Math.hypot(c.x - fx, c.z - fz) - CELL * 0.7; const full = d < near, lod = !full && d < far; for (const m of c.meshes) m.visible = full; for (const m of c.lod) m.visible = lod; } },
    draw(group) { const self = this; onKit(K => { const cells = {}; const ctr = new THREE.Vector3(), byCell = {};
      K.mods['#core'] = [{ geometry: CORE, material: coreMat }]; for (const [name, M] of list) { if (!K.mods[name]) continue; ctr.setFromMatrixPosition(M); const key = name + '|' + Math.floor(ctr.x / CELL) + ',' + Math.floor(ctr.z / CELL); (cells[key] = cells[key] || []).push(M); }
      for (const key in cells) { const [name, ck] = key.split('|'), mats = cells[key], [cx, cz] = ck.split(',').map(Number), C = byCell[ck] = byCell[ck] || { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, meshes: [], lod: [] };
        for (const part of K.mods[name]) { const im = new THREE.InstancedMesh(part.geometry, part.material, mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); im.castShadow = !part.material.transparent && !/Glass|Interior|Ornament/.test(part.material.name); im.receiveShadow = true; im.computeBoundingSphere(); group.add(im); C.meshes.push(im); } }
      const lodCells = {}; for (const [st, M] of lods) { ctr.setFromMatrixPosition(M); const ck = Math.floor(ctr.x / CELL) + ',' + Math.floor(ctr.z / CELL); (lodCells[ck + '|' + st] = lodCells[ck + '|' + st] || []).push(M); }
      for (const key in lodCells) { const [ck, st] = key.split('|'), mats = lodCells[key], [cx, cz] = ck.split(',').map(Number), C = byCell[ck] = byCell[ck] || { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, meshes: [], lod: [] };
        const im = new THREE.InstancedMesh(LODBOX, LODMAT[st], mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.visible = false; group.add(im); C.lod.push(im); }
      self.cells = Object.values(byCell); }); } };
}
