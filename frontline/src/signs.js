// Neon shop signs for LA's streets: wide signs over the shopfronts and tall blade signs on the corners.
// One canvas atlas of glowing words, one merged mesh for all the neon and one for the dark sign boxes behind it.
// The neon sits on the GLOW layer too, so wet streets can reflect it (see reflect.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const GLOW = 5;
const WIDE = ['LIQUOR', 'MOTEL', 'OPEN 24H', 'TACOS', 'PAWN', 'NOODLES', 'DINER', 'PHARMACY', 'DONUTS', 'KARAOKE', 'ARCADE', 'BURGERS', 'LAUNDRY', 'CHECKS CASHED', 'COCKTAILS', 'PIZZA'];
const TALL = ['HOTEL', 'BAR', 'CAFE', 'CLUB', 'GYM', 'JAZZ', 'RAMEN', 'BOWL'];
const COLS = ['#ff2d78', '#26e4ff', '#ffb02e', '#7dff4a', '#ff3b2b', '#b45cff', '#ffe14d', '#2effc0'];
const AW = 2048, AH = 2048, CW = 512, CH = 128, TW = 128, TH = 512; // wide signs: 4 x 8 cells of 512x128 at the top; blade signs: 16 cells of 128x512 below

let atlas = null, cells = null;
function buildAtlas() {
  const c = document.createElement('canvas'); c.width = AW; c.height = AH; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, AW, AH);
  const out = { wide: [], tall: [] };
  const neon = (txt, col, x, y, w, h, vertical) => {
    g.save(); g.translate(x, y);
    // the tube: a thick blurred stroke in the colour, then a thin near-white core
    g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const letters = vertical ? txt.split('') : [txt], fs = vertical ? Math.min(w * 0.72, h / (letters.length + 0.6)) : Math.min(h * 0.62, w / (txt.length * 0.62));
    g.font = `700 ${fs}px "Arial Black", Impact, sans-serif`;
    letters.forEach((t, i) => { const tx = w / 2, ty = vertical ? h / 2 + (i - (letters.length - 1) / 2) * fs * 1.02 : h / 2;
      g.shadowColor = col; g.shadowBlur = fs * 0.35; g.strokeStyle = col; g.lineWidth = fs * 0.13; g.strokeText(t, tx, ty); g.strokeText(t, tx, ty);
      g.shadowBlur = fs * 0.12; g.strokeStyle = '#fff6f0'; g.lineWidth = fs * 0.035; g.strokeText(t, tx, ty); });
    // a thin border tube
    g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = col; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
    g.restore();
  };
  let k = 0;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) { const txt = WIDE[k % WIDE.length], color = COLS[(k * 3 + row) % COLS.length]; neon(txt, color, col * CW, row * CH, CW, CH, false); out.wide.push([col * CW / AW, 1 - (row + 1) * CH / AH, CW / AW, CH / AH]); k++; }
  // tall blade signs below (16 x 128x512)
  for (let i = 0; i < 16; i++) { const col = i, txt = TALL[i % TALL.length], color = COLS[(i * 5 + 1) % COLS.length]; neon(txt, color, col * TW, 1024 + 0, TW, TH, true); out.tall.push([col * TW / AW, 1 - (1024 + TH) / AH, TW / AW, TH / AH]); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
  return [t, out];
}

// spots: [Matrix4 world (+Z out of the wall), kind 'wide' | 'tall', width, height]; level: 0 (day, signs off) .. 1 (night)
export function buildSigns(spots, level, time) {
  if (!spots.length) return null;
  if (!atlas) [atlas, cells] = buildAtlas();
  const neonG = [], boxG = [], v = new THREE.Vector3(), r = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  spots.forEach(([m4, kind, w, h], i) => {
    const set = kind === 'tall' ? cells.tall : cells.wide, cell = set[Math.floor(r(i, 1) * set.length)];
    const box = new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.22); box.translate(0, 0, -0.06); box.applyMatrix4(m4); boxG.push(box);
    const p = new THREE.PlaneGeometry(w, h); const uv = p.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, cell[0] + uv.getX(j) * cell[2], cell[1] + uv.getY(j) * cell[3]);
    p.translate(0, 0, 0.07); p.applyMatrix4(m4);
    // per-sign flicker: most burn steady, some buzz, a few are dying
    const seed = new Float32Array(p.attributes.position.count).fill(r(i, 2) < 0.12 ? 2 + r(i, 3) : r(i, 4) < 0.25 ? 1 + r(i, 5) : r(i, 6) * 0.9);
    p.setAttribute('seed', new THREE.BufferAttribute(seed, 1)); neonG.push(p);
  });
  const group = new THREE.Group();
  const boxes = new THREE.Mesh(mergeGeometries(boxG), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, metalness: 0.4 })); boxes.castShadow = true; boxes.receiveShadow = true; group.add(boxes);
  const U = { uTime: time, uLevel: { value: level } };
  const mat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float seed; varying float vSeed;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeed = seed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime, uLevel; varying float vSeed;\nfloat sHash(float n) { return fract(sin(n) * 43758.5453); }')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float f = 1.0, s = fract(vSeed);
        if (vSeed >= 2.0) { float t = floor(uTime * 9.0 + s * 50.0); f = sHash(t + s * 91.0) < 0.55 ? 0.08 : 1.0; }        // dying: drops out often
        else if (vSeed >= 1.0) { f = 0.82 + 0.18 * sin(uTime * 61.0 + s * 40.0); float t = floor(uTime * 3.0 + s * 20.0); f *= sHash(t + s * 7.0) < 0.06 ? 0.15 : 1.0; } // buzzing
        diffuseColor.rgb *= 2.6 * f * uLevel;`);
  };
  mat.customProgramCacheKey = () => 'neon-sign';
  const neon = new THREE.Mesh(mergeGeometries(neonG), mat); neon.layers.enable(GLOW); neon.frustumCulled = false; neon.renderOrder = 2; group.add(neon);
  group.userData.level = U.uLevel;
  return group;
}
