// Street life on LA's kit buildings: striped awnings over shopfronts, lit vending machines, piles of trash bags,
// window air-conditioners and iron fire escapes. Everything is placed from a hash of the building's position, so the city
// stays the same each visit, and merged into a handful of meshes (one per material).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLOW } from './signs.js';

const AWN = [['#b3242a', '#efe6d6'], ['#1f5a3a', '#e8e2cf'], ['#203a6b', '#f0ece0'], ['#8a5a1a', '#efe2c0'], ['#2a2a2a', '#c9b48a'], ['#7a1f4f', '#ead9e0']];
let tex = null;
function textures() {
  if (tex) return tex;
  // awning stripes: one column per colour scheme
  const a = document.createElement('canvas'); a.width = 256; a.height = 64; const g = a.getContext('2d');
  AWN.forEach(([c1, c2], k) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(k * 256 / AWN.length + i * 256 / AWN.length / 8, 0, 256 / AWN.length / 8 + 1, 64); } });
  // vending machine fronts: rows of bottles and cans under a lit panel, three colour schemes
  const v = document.createElement('canvas'); v.width = 384; v.height = 256; const h = v.getContext('2d');
  ['#d01c22', '#1d4fb0', '#e8e8e8'].forEach((col, k) => { const x0 = k * 128; h.fillStyle = '#0a0d12'; h.fillRect(x0, 0, 128, 256); h.fillStyle = col; h.fillRect(x0 + 6, 6, 116, 40);
    h.fillStyle = '#fff'; h.font = '700 22px Arial'; h.textAlign = 'center'; h.fillText(['COLA', 'SODA', 'COFFEE'][k], x0 + 64, 34);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { h.fillStyle = ['#e33', '#3a6', '#fc3', '#39f', '#f80', '#ddd'][(r * 3 + c + k) % 6]; h.fillRect(x0 + 10 + c * 16, 60 + r * 36, 10, 26); h.fillStyle = 'rgba(255,255,255,0.35)'; h.fillRect(x0 + 12 + c * 16, 62 + r * 36, 3, 22); }
    h.fillStyle = '#222'; h.fillRect(x0 + 106, 60, 14, 140); h.fillStyle = '#4f4'; h.fillRect(x0 + 108, 64, 10, 6); h.fillStyle = '#111'; h.fillRect(x0 + 10, 212, 108, 34); });
  tex = { awn: new THREE.CanvasTexture(a), vend: new THREE.CanvasTexture(v) }; tex.awn.colorSpace = tex.vend.colorSpace = THREE.SRGBColorSpace; tex.awn.anisotropy = 4;
  return tex;
}

// blds: [{ base: Matrix4 (+Z faces the street), w, d, floors, style }]
export function buildDress(blds) {
  if (!blds.length) return null;
  const T = textures(), G = { awn: [], metal: [], vendBody: [], vendFace: [], bags: [], ac: [] }, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const place = (list, geo, base, x, y, z, rot, rx) => { const g = geo.clone(); if (rx) g.rotateX(rx); g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromAxisAngle(up, rot || 0), one)); g.applyMatrix4(base); list.push(g); };
  const bar = (list, base, a, b, t) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.BoxGeometry(t, t, len); g.lookAt(d); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); g.applyMatrix4(base); list.push(g); };
  for (const B of blds) {
    const { base, w, d, floors, style } = B, e = base.elements, hs = k => { const v = Math.sin(e[12] * 12.9898 + e[14] * 78.233 + k * 91.37) * 43758.5453; return v - Math.floor(v); }, fz = d / 2;
    // awning over part of the shopfront, sloping down toward the street
    if (hs(1) < 0.55) { const aw = Math.min(w - 2, 3 + Math.round(hs(2) * 4)), ax = (hs(3) - 0.5) * Math.max(0, w - aw - 2), deep = 1.3, scheme = Math.floor(hs(4) * AWN.length);
      const g = new THREE.PlaneGeometry(aw, deep, 1, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (scheme + 0.02 + uv.getX(i) * 0.96 * Math.max(0.4, aw / 6)) / AWN.length);
      const top = 2.99, drop = deep * Math.sin(0.42), reach = deep * Math.cos(0.42);
      place(G.awn, g, base, ax, top - drop / 2, fz + reach / 2, 0, -Math.PI / 2 + 0.42);
      const val = new THREE.PlaneGeometry(aw, 0.28); const vu = val.attributes.uv; for (let i = 0; i < vu.count; i++) vu.setX(i, (scheme + 0.02 + vu.getX(i) * 0.96 * Math.max(0.4, aw / 6)) / AWN.length);
      place(G.awn, val, base, ax, top - drop - 0.14, fz + reach, 0);
      for (const sx of [-1, 1]) bar(G.metal, base, new THREE.Vector3(ax + sx * aw / 2, top, fz), new THREE.Vector3(ax + sx * aw / 2, top - drop, fz + reach), 0.04); }
    // a vending machine against the wall near one corner
    if (hs(5) < 0.32) { const vx = (hs(6) < 0.5 ? -1 : 1) * (w / 2 - 1.1), k = Math.floor(hs(7) * 3); place(G.vendBody, new THREE.BoxGeometry(0.95, 1.9, 0.75), base, vx, 0.95, fz + 0.42, 0);
      const f = new THREE.PlaneGeometry(0.82, 1.7); const uv = f.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 3); place(G.vendFace, f, base, vx, 0.98, fz + 0.8, 0); }
    // trash bags piled by the wall
    if (hs(8) < 0.5) { const tx = (hs(9) - 0.5) * (w - 3), n = 3 + Math.floor(hs(10) * 4); for (let i = 0; i < n; i++) { const s = new THREE.SphereGeometry(0.34 + hs(11 + i) * 0.14, 9, 7); s.scale(1, 0.72, 0.9); place(G.bags, s, base, tx + (hs(20 + i) - 0.5) * 1.6, 0.22 + (i > 3 ? 0.35 : 0), fz + 0.45 + hs(30 + i) * 0.5, hs(40 + i) * 6); } }
    // window air-conditioners on the upper floors
    for (let f = 1; f < floors; f++) for (let b = 0; b < Math.round(w / 2); b++) if (hs(100 + f * 17 + b) < 0.07) place(G.ac, new THREE.BoxGeometry(0.62, 0.42, 0.5), base, -w / 2 + 1 + b * 2, f * 3 + 0.95, fz + 0.22, 0);
    // iron fire escape: a platform per floor, railings and a stair between floors
    if ((style === 'brick' || style === 'arch') && floors >= 4 && hs(60) < 0.6) {
      const fx = (hs(61) - 0.5) * Math.max(0, w - 6), L = 3.6, D = 1.1;
      for (let f = 1; f < floors; f++) { const y = f * 3 - 0.05;
        place(G.metal, new THREE.BoxGeometry(L, 0.05, D), base, fx, y, fz + D / 2, 0);
        for (const [ax, az, bx2, bz] of [[-L / 2, fz + D, L / 2, fz + D], [-L / 2, fz, -L / 2, fz + D], [L / 2, fz, L / 2, fz + D]]) { bar(G.metal, base, new THREE.Vector3(fx + ax, y + 0.95, az), new THREE.Vector3(fx + bx2, y + 0.95, bz), 0.035); }
        for (let k = 0; k <= 6; k++) { const x = fx - L / 2 + k * L / 6; bar(G.metal, base, new THREE.Vector3(x, y, fz + D), new THREE.Vector3(x, y + 0.95, fz + D), 0.025); }
        if (f < floors - 1) { const s = f % 2 ? 1 : -1; bar(G.metal, base, new THREE.Vector3(fx - s * (L / 2 - 0.4), y, fz + D * 0.55), new THREE.Vector3(fx + s * (L / 2 - 0.4), y + 3, fz + D * 0.55), 0.09); } } }
  }
  const group = new THREE.Group(), add = (list, mat, shadow, glow) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = shadow; m.receiveShadow = true; if (glow) m.layers.enable(GLOW); group.add(m); };
  add(G.awn, new THREE.MeshStandardMaterial({ map: T.awn, roughness: 0.85, side: THREE.DoubleSide }), true);
  add(G.metal, new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.55, metalness: 0.7 }), true);
  add(G.vendBody, new THREE.MeshStandardMaterial({ color: 0x8a1a1e, roughness: 0.4, metalness: 0.3 }), true);
  add(G.vendFace, new THREE.MeshStandardMaterial({ map: T.vend, emissiveMap: T.vend, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.2 }), false, true);
  add(G.bags, new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.25, metalness: 0.1 }), true);
  add(G.ac, new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.6, metalness: 0.4 }), true);
  return group;
}
