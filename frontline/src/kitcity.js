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

// Rooms behind the windows. The dark block inside every building is drawn with "interior mapping": for each pixel the view
// ray is traced into an imaginary room (2 m bays, 3 m floors, 3.4 m deep) behind the wall, and the shader paints the wall,
// floor or ceiling it hits. Shops on the ground floor get shelves of goods; upper rooms get furniture, curtains and lamps,
// some lit and some dark. It costs one box per building, and the rooms shift with parallax as you walk past.
export const INTERIOR = { uLit: { value: 0.45 }, uShop: { value: 0.85 }, uAmb: { value: new THREE.Color(0.05, 0.05, 0.06) }, uPow: { value: 1.6 } };
export function interiorMood(mood) { const night = mood === 'night', storm = mood === 'storm', dusk = mood === 'dusk';
  INTERIOR.uLit.value = night ? 0.5 : storm ? 0.42 : dusk ? 0.35 : 0.18; INTERIOR.uShop.value = night || storm ? 0.85 : 0.7;
  INTERIOR.uAmb.value.setRGB(...(night ? [0.03, 0.03, 0.04] : storm ? [0.05, 0.055, 0.065] : dusk ? [0.08, 0.07, 0.07] : [0.2, 0.2, 0.21])); INTERIOR.uPow.value = night ? 1.8 : storm ? 1.6 : dusk ? 1.3 : 0.8; }
function interiorMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, INTERIOR);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vIP; varying vec3 vIN; varying vec3 vIT; varying vec2 vUV2; flat varying float vId;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        mat4 M = modelMatrix;
        #ifdef USE_INSTANCING
        M = M * instanceMatrix;
        #endif
        mat3 m3 = mat3(M); vec3 ax = m3 * vec3(1.0, 0.0, 0.0), az = m3 * vec3(0.0, 0.0, 1.0); vec4 wp = M * vec4(position, 1.0);
        vIP = wp.xyz; vIN = normalize(m3 * normal); vIT = abs(normal.z) > 0.5 ? normalize(ax) * sign(normal.z) : -normalize(az) * sign(normal.x);
        float L = (abs(normal.z) > 0.5 ? length(ax) : length(az)) + 0.55; vec3 C = (M * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float base = (M * vec4(0.0, -0.5, 0.0, 1.0)).y;
        vUV2 = vec2(dot(wp.xyz - C, vIT) + L * 0.5, wp.y - base); vId = floor(fract(dot(C, vec3(0.0137, 0.0, 0.0271))) * 97.0) + dot(normal, vec3(1.0, 0.0, 3.0)) * 0.37; /* small and flat, so the room hash is the same over the whole face */`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vIP; varying vec3 vIN; varying vec3 vIT; varying vec2 vUV2; flat varying float vId; uniform float uLit, uShop, uPow; uniform vec3 uAmb;
      float rH(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 col = vec3(0.04);
        if (abs(vIN.y) < 0.5) {
          vec3 D = normalize(vIP - cameraPosition); float du = dot(D, vIT), dv = D.y, dn = max(0.02, -dot(D, vIN));
          vec2 cw = vec2(2.0, 3.0); vec2 cell = floor(vUV2 / cw); bool shop = cell.y < 0.5; float depth = shop ? 4.5 : 3.4;
          vec2 lo = cell * cw, hi = lo + cw;
          float tu = (du > 0.0 ? hi.x - vUV2.x : lo.x - vUV2.x) / (abs(du) < 1e-4 ? 1e-4 : du), tv = (dv > 0.0 ? hi.y - vUV2.y : lo.y - vUV2.y) / (abs(dv) < 1e-4 ? 1e-4 : dv), tn = depth / dn;
          float t = min(min(tu, tv), tn); vec3 h = vec3(vUV2 + vec2(du, dv) * t, dn * t); vec2 f = (h.xy - lo) / cw; float fz = h.z / depth;
          float r1 = rH(vec3(cell, vId)), r2 = rH(vec3(cell + 7.1, vId)), r3 = rH(vec3(cell - 3.3, vId));
          bool lit = shop ? r1 < uShop : r1 < uLit;
          vec3 wall = mix(vec3(0.5, 0.44, 0.37), vec3(0.36, 0.4, 0.43), r2) * (0.65 + 0.35 * r3), floorC = vec3(0.24, 0.19, 0.15), ceil = vec3(0.75);
          vec3 alb; float lightK;
          if (t == tn) { alb = wall; lightK = 0.75;                                                   // back wall
            if (shop) { float sh = fract(f.y * 4.0); float band = step(0.08, f.y) * step(f.y, 0.78); float gi = floor(f.x * 7.0) + floor(f.y * 4.0) * 7.0; vec3 goods = mix(vec3(0.55, 0.5, 0.45), vec3(rH(vec3(gi, 1.0, vId)), rH(vec3(gi, 2.0, vId)), rH(vec3(gi, 3.0, vId))), 0.55) * (0.6 + 0.4 * step(0.25, fract(f.x * 7.0)) * step(fract(f.x * 7.0), 0.92));
              alb = mix(alb, mix(vec3(0.15), goods * 0.9, step(0.18, sh)), band); }
            else { float sofa = step(0.15, f.x) * step(f.x, 0.85) * step(f.y, 0.28) * step(0.4, r3); alb = mix(alb, vec3(0.18, 0.14, 0.12) * (0.6 + r2), sofa);
              float art = step(0.35, f.x) * step(f.x, 0.62) * step(0.48, f.y) * step(f.y, 0.7) * step(0.5, r2); alb = mix(alb, vec3(r1, r3, r2) * 0.8, art); } }
          else if (t == tv) { if (dv < 0.0) { alb = floorC; lightK = 0.55; } else { alb = ceil; lightK = 0.95 - 0.7 * length(vec2(f.x - 0.5, fz - 0.45)); } }
          else { alb = wall * 0.85; lightK = 0.6; if (shop) { float sh = fract(f.y * 4.0); alb = mix(alb, vec3(0.2), step(0.85, sh) * step(f.y, 0.78)); } }
          vec3 lc = r2 < 0.55 ? vec3(1.0, 0.72, 0.42) : r2 < 0.8 ? vec3(1.0, 0.92, 0.8) : r2 < 0.93 ? vec3(0.75, 0.9, 1.05) : vec3(0.35, 0.55, 1.1);
          if (shop) lc = r2 < 0.5 ? vec3(1.0, 0.95, 0.88) : vec3(0.85, 0.95, 1.05);
          float fall = mix(1.0, 0.55, fz) * (0.75 + 0.25 * (1.0 - abs(f.x - 0.5) * 2.0));
          col = alb * (uAmb + (lit ? lc * uPow * (shop ? 0.55 : 0.7) * lightK * fall : vec3(0.0)));
          // curtains or blinds on some upper windows, glowing when the room is lit
          if (!shop && r3 < 0.32) { vec2 g = (vUV2 - lo) / cw; float side = step(g.x, 0.22 + 0.2 * r1) + step(0.78 - 0.2 * r2, g.x); float blinds = r3 < 0.12 ? step(0.5, fract(g.y * 14.0)) * 0.6 + 0.4 : 0.0;
            vec3 cur = mix(vec3(0.55, 0.48, 0.4), vec3(0.4, 0.45, 0.55), r1) * (uAmb * 2.0 + (lit ? lc * uPow * 0.7 : vec3(0.0)));
            col = mix(col, cur, max(min(side, 1.0), blinds)); }
        }
        diffuseColor.rgb = col;
      }`);
  };
  m.customProgramCacheKey = () => 'interior-rooms';
  return m;
}
const CELL = 80, ROT = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export function createKitCity() {
  const list = [], lods = [], signs = [], blds = []; // blds: every kit building, for the street dressing (citydress.js)
  const _sig = 0; // signs: [Matrix4, 'wide' | 'tall', w, h] for neon on the street fronts (signs.js) // [module name, Matrix4]; lods: [style, Matrix4] for the plain blocks drawn at a distance; a dark inner block per building stops you seeing through shop windows
  const CORE = new THREE.BoxGeometry(1, 1, 1), coreMat = interiorMaterial();
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
      // neon: a wide sign over most shopfronts and a tall blade sign on some corners (hashed from the position, so the city layout is unchanged)
      const e = base.elements, hs = k => { const v = Math.sin(e[12] * 12.9898 + e[14] * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); }, L = (x, y, z, rot) => new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(p.set(x, y, z), q.setFromAxisAngle(up, rot), one));
      if (hs(1) < 0.8) { const sw = Math.min(w - 2.4, 3 + Math.round(hs(2) * 4)), sx = (hs(3) - 0.5) * Math.max(0, w - sw - 2.4); signs.push([L(sx, 3.45, d / 2 + 0.2, 0), 'wide', sw, sw / 4]); }
      if (floors >= 3 && hs(4) < 0.5) { const sd = hs(5) < 0.5 ? -1 : 1, sh = Math.min(6, floors * 3 - 4); signs.push([L(sd * (w / 2 - 0.9), 3.2 + sh / 2, d / 2 + 0.75, Math.PI / 2), 'tall', sh / 4, sh]); }
      blds.push({ base: base.clone(), w, d, floors, style });
      return { w, d, h: H + 1 }; },
    ready(base, name) { const R = READY[name]; put(base, name, -R[3], 0, -R[4], 0); lods.push(['pale', new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(p.set(0, R[2] / 2, 0), q.identity(), new THREE.Vector3(R[0], R[2], R[1])))]); return { w: R[0], d: R[1], h: R[2] }; },
    prop(base, name) { put(base, name, 0, 0, 0, 0); },
    get count() { return list.length; }, signs, blds,
    // turn the list into instanced meshes, once the kit has loaded
    // far cells hide; every module is still in the solids, so nothing changes for play
    // near cells draw every module; further out a plain block per building stands in; beyond `far` nothing
    cells: [], cull(cam, far, near) { near = near || far * 0.5; const fx = cam.position.x, fz = cam.position.z; for (const c of this.cells) { const d = Math.hypot(c.x - fx, c.z - fz) - CELL * 0.7; const full = d < near, lod = !full && d < far; for (const m of c.meshes) m.visible = full; for (const m of c.lod) m.visible = lod; } },
    draw(group) { const self = this; onKit(K => { const cells = {}; const ctr = new THREE.Vector3(), byCell = {};
      K.mods['#core'] = [{ geometry: CORE, material: coreMat }]; for (const [name, M] of list) { if (!K.mods[name]) continue; ctr.setFromMatrixPosition(M); const key = name + '|' + Math.floor(ctr.x / CELL) + ',' + Math.floor(ctr.z / CELL); (cells[key] = cells[key] || []).push(M); }
      for (const key in cells) { const [name, ck] = key.split('|'), mats = cells[key], [cx, cz] = ck.split(',').map(Number), C = byCell[ck] = byCell[ck] || { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, meshes: [], lod: [] };
        for (const part of K.mods[name]) { const im = new THREE.InstancedMesh(part.geometry, part.material, mats.length); if (name === '#core') im.layers.enable(5); /* lit rooms reflect in wet streets (GLOW layer) */ mats.forEach((M, i) => im.setMatrixAt(i, M)); im.castShadow = !part.material.transparent && !/Glass|Interior|Ornament/.test(part.material.name); im.receiveShadow = true; im.computeBoundingSphere(); group.add(im); C.meshes.push(im); } }
      const lodCells = {}; for (const [st, M] of lods) { ctr.setFromMatrixPosition(M); const ck = Math.floor(ctr.x / CELL) + ',' + Math.floor(ctr.z / CELL); (lodCells[ck + '|' + st] = lodCells[ck + '|' + st] || []).push(M); }
      for (const key in lodCells) { const [ck, st] = key.split('|'), mats = lodCells[key], [cx, cz] = ck.split(',').map(Number), C = byCell[ck] = byCell[ck] || { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, meshes: [], lod: [] };
        const im = new THREE.InstancedMesh(LODBOX, LODMAT[st], mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.visible = false; group.add(im); C.lod.push(im); }
      self.cells = Object.values(byCell); }); } };
}
