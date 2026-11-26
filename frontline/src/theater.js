import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The Orphea faces the first cross street. Build its repeated trim in material batches.
export function buildTheater(group, H, addSolid, lights, concrete) {
  const x = -17,
    z = 10,
    y = H(x, z) - 0.15;
  const batches = new Map();
  const stone = new THREE.MeshStandardMaterial({ color: 0xc8ad89, map: concrete, roughness: 0.85 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x655148, metalness: 0.62, roughness: 0.37 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x244444, metalness: 0.55, roughness: 0.17 });
  const bulbs = new THREE.MeshStandardMaterial({ emissive: 0xffb459, emissiveIntensity: 2.4, color: 0xe5bf84 });
  const box = (mat, w, h, d, px, py, pz) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(x + px, y + py, z + pz);
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geometry);
  };
  box(stone, 16, 11, 10, 0, 5.5, -1);
  box(bronze, 16.3, 0.3, 10.3, 0, 11, -1);
  for (const side of [-1, 1]) {
    box(stone, 2.3, 10, 3, side * 6.85, 5, 5);
    for (let i = 0; i < 3; i++) box(bronze, 0.2, 8.5, 0.3, side * (6.2 + i * 0.52), 4.8, 6.5);
  }
  for (let i = -2; i <= 2; i++) {
    box(glass, 1.75, 3.3, 0.16, i * 1.86, 1.75, 4.12);
    box(bronze, 0.08, 3.4, 0.3, i * 1.86 - 0.86, 1.75, 4.24);
    box(bulbs, 0.06, 0.5, 0.08, i * 1.86 + 0.42, 1.45, 4.27);
  }
  box(bronze, 16.5, 0.5, 5.6, 0, 4.2, 5.4);
  box(stone, 16, 1.45, 4.8, 0, 5, 5.6);
  for (const a of [4.35, 5.65]) box(bulbs, 16.2, 0.09, 4.95, 0, a, 5.65);
  for (let i = -6; i <= 6; i++) box(bulbs, 0.12, 0.08, 0.12, i * 1.14, 3.92, 7.83);
  for (let i = -2; i <= 2; i++) box(stone, 1.28, 3.7 - Math.abs(i) * 0.65, 1.3, i * 1.24, 11, 3.55);
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2f2927';
  ctx.fillRect(0, 0, 768, 96);
  ctx.fillStyle = '#ffdf96';
  ctx.textAlign = 'center';
  ctx.font = 'bold 67px Georgia';
  ctx.fillText('O R P H E A', 384, 73);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(15.7, 1.3),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffe2bb, emissiveIntensity: 0.85 }),
  );
  sign.position.set(x, y + 5, z + 8.03);
  group.add(sign);
  for (const [material, geos] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    geos.forEach((g) => g.dispose());
  }
  addSolid(x, z - 1, 16, 10, null, 11);
  for (const side of [-1, 1]) addSolid(x + side * 6.85, z + 5, 2.3, 3, null, 10);
  lights.push([x, z + 7, 4.2]);
}
