// Frontline world detail: streets, vehicles, street furniture, cover and wreckage, all built in code.
// Every prop is modelled once, then stamped into the world and merged into one mesh per material,
// so a whole district costs about twenty draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit, rb, bx, sph, cyl, cone, torus } from './models.js';
import { weather } from './gfx.js';
import { wetSurface } from './weather.js';
import { detailedProps } from './prop-details.js';

const PI = Math.PI;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

function poster() { const c = document.createElement('canvas'); c.width = 1024; c.height = 424; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 1024, 424); gr.addColorStop(0, '#0d2a44'); gr.addColorStop(1, '#16506a'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 424);
  g.strokeStyle = '#e8be60'; g.lineWidth = 10; g.strokeRect(14, 14, 996, 396); g.fillStyle = '#e8be60'; g.beginPath(); g.arc(170, 212, 96, 0, 6.283); g.fill(); g.fillStyle = '#0d2a44'; g.beginPath(); g.arc(170, 212, 70, 0, 6.283); g.fill(); g.fillStyle = '#46d6d0'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(120, 250 - i * 34); g.lineTo(170, 214 - i * 34); g.lineTo(220, 250 - i * 34); g.lineTo(220, 266 - i * 34); g.lineTo(170, 230 - i * 34); g.lineTo(120, 266 - i * 34); g.fill(); }
  g.fillStyle = '#f4e6c4'; g.font = '900 104px "Arial Narrow", Impact, sans-serif'; g.fillText('HOLD THE LINE', 310, 210); g.fillStyle = '#46d6d0'; g.font = '700 48px "Arial Narrow", Arial, sans-serif'; g.fillText('EARTH COALITION  ·  ENLIST TODAY', 314, 300); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
export function propMaterials(TEX) {
  const m = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.1 }, o || {})), paint = c => weather(m(c, { roughness: 0.36, metalness: 0.55, bumpMap: TEX.plate, bumpScale: 0.25 }), 0.75, 0.55), pm = poster();
  return { poster: m(0xffffff, { map: pm, emissive: 0xffffff, emissiveMap: pm, emissiveIntensity: 0.35, roughness: 0.5 }), roof: weather(m(0x3a3c40, { roughness: 0.9 }), 0.8, 0), carA: paint(0xb8352a), carB: paint(0x2f5f9a), carC: paint(0xd8d4c8), carD: paint(0x2a2d31), carE: paint(0xd9a326), carF: paint(0x3c7a5a), hull: paint(0xc9ced4), hullB: paint(0xb5562e),
    body: paint(0x376e76), station: paint(0x41636e), insulation: m(0xc6bfd0, { roughness: 0.65 }), upholstery: m(0x24282d, { roughness: 0.95 }), glass: m(0x86b9cb, { roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }), tyre: m(0x101012, { roughness: 0.95 }), steel: weather(m(0x6a7078, { roughness: 0.45, metalness: 0.85, bumpMap: TEX.plate, bumpScale: 0.3 }), 0.7, 0.6), dark: m(0x22262b, { roughness: 0.6, metalness: 0.6 }),
    rust: m(0x6b3f26, { roughness: 0.9, metalness: 0.3, bumpMap: TEX.plate, bumpScale: 0.9 }), burnt: m(0x14110f, { roughness: 1, bumpMap: TEX.plate, bumpScale: 0.9 }), concrete: weather(m(0xa9a294, { map: TEX.concrete, bumpMap: TEX.concrete, bumpScale: 0.5, roughness: 0.95 }), 0.9, 0),
    yellow: m(0xe0b020, { roughness: 0.6 }), red: m(0xc03020, { roughness: 0.6 }), white: weather(m(0xe8e6e0, { roughness: 0.7 }), 0.8, 0.3), green: weather(m(0x2f6a3c, { roughness: 0.7, metalness: 0.3 }), 0.8, 0.6), leaf: m(0x3f7a2e, { roughness: 0.9 }), wood: m(0x6b4a2c, { roughness: 0.9 }), sand: m(0x9c8a62, { roughness: 1 }),
    head: m(0xe8e6e0, { roughness: 0.3 }), tail: m(0x7a1810, { roughness: 0.4 }), lamp: m(0xfff0c8, { emissive: 0xffd890, emissiveIntensity: 3.2 }), lampR: m(0xff4030, { emissive: 0xff2010, emissiveIntensity: 3 }), lampG: m(0x40ff80, { emissive: 0x20e060, emissiveIntensity: 2.4 }), lampB: m(0x7fd8ff, { emissive: 0x3fb8ff, emissiveIntensity: 2.6 }), sign: m(0x1f6fb0, { emissive: 0x0f4a90, emissiveIntensity: 0.9, roughness: 0.4 }) };
}

// ---------- Prop library. Origin on the ground at the centre; long axis along z.
const DEF = {
  ...detailedProps,
  streetLight(k) { k.add('dark', cyl(0.16, 0.22, 0.6, 8), [0, 0.3, 0]).add('steel', cyl(0.07, 0.1, 7, 8), [0, 3.6, 0]).seg('steel', [0, 7.0, 0], [1.5, 7.35, 0], 0.06, 0.05, 6).add('dark', rb(0.7, 0.12, 0.32, 0.04), [1.75, 7.33, 0]).add('lamp', bx(0.56, 0.04, 0.24), [1.75, 7.26, 0]); },
  trafficLight(k) { k.add('dark', cyl(0.14, 0.2, 0.5, 8), [0, 0.25, 0]).add('steel', cyl(0.07, 0.09, 5.8, 8), [0, 2.9, 0]).seg('steel', [0, 5.6, 0], [3.6, 5.8, 0], 0.06, 0.05, 6);
    for (const x of [1.6, 3.4]) { k.add('yellow', rb(0.36, 1.05, 0.3, 0.05), [x, 5.2, 0]).add('lampR', sph(0.1, 8, 6), [x, 5.52, -0.14]).add('dark', sph(0.1, 8, 6), [x, 5.2, -0.14]).add('lampG', sph(0.1, 8, 6), [x, 4.88, -0.14]); } k.add('sign', rb(1.1, 0.3, 0.04, 0.01), [2.5, 6.05, 0]); },
  barrier(k) { k.add('concrete', rb(0.62, 0.36, 2.6, 0.06), [0, 0.18, 0]).add('concrete', rb(0.3, 0.62, 2.6, 0.06), [0, 0.64, 0]).add('yellow', bx(0.31, 0.12, 2.3), [0, 0.8, 0]); },
  dumpster(k) { k.add('green', rb(2, 1.15, 1.2, 0.05), [0, 0.75, 0]).add('dark', rb(2.06, 0.08, 1.26, 0.02), [0, 1.36, 0.05], [0.12, 0, 0]).add('dark', bx(2.04, 0.1, 0.1), [0, 1.0, -0.62]); for (const x of [-0.8, 0.8]) for (const z of [-0.45, 0.45]) k.add('tyre', cyl(0.09, 0.09, 0.08, 8), [x, 0.09, z], [0, 0, PI / 2]); },
  hydrant(k) { k.add('red', cyl(0.13, 0.16, 0.6, 10), [0, 0.3, 0]).add('red', sph(0.14, 10, 6), [0, 0.62, 0]).add('red', cyl(0.06, 0.06, 0.4, 8), [0, 0.42, 0], [0, 0, PI / 2]).add('steel', cyl(0.05, 0.05, 0.08, 6), [0, 0.74, 0]); },
  bench(k) { for (let i = 0; i < 3; i++) k.add('wood', rb(1.8, 0.05, 0.13, 0.015), [0, 0.46, -0.15 + i * 0.15]); for (let i = 0; i < 2; i++) k.add('wood', rb(1.8, 0.13, 0.05, 0.015), [0, 0.68 + i * 0.17, 0.24], [-0.15, 0, 0]); for (const x of [-0.75, 0.75]) k.add('dark', rb(0.06, 0.46, 0.5, 0.02), [x, 0.23, 0]).add('dark', rb(0.06, 0.5, 0.06, 0.02), [x, 0.7, 0.25]); },
  planter(k) { k.add('concrete', rb(1.7, 0.6, 1.7, 0.06), [0, 0.3, 0]).add('wood', bx(1.5, 0.05, 1.5), [0, 0.6, 0]); for (let i = 0; i < 6; i++) k.add('leaf', sph(0.42 - (i % 3) * 0.07, 7, 5), [Math.cos(i * 1.05) * 0.42, 0.9 + (i % 2) * 0.18, Math.sin(i * 1.05) * 0.42], null, [1, 0.85, 1]); },
  billboard(k) { for (const x of [-2.4, 2.4]) k.add('steel', cyl(0.14, 0.18, 6.4, 8), [x, 3.2, 0]); k.add('dark', rb(7.4, 3.3, 0.24, 0.04), [0, 7.9, 0]).add('poster', bx(7, 2.9, 0.05), [0, 7.9, -0.14]).add('steel', bx(7.4, 0.08, 0.9), [0, 6.2, -0.4]); for (const x of [-2.5, 0, 2.5]) k.add('lamp', bx(0.3, 0.06, 0.16), [x, 6.24, -0.78]); },
  pole(k) { k.add('wood', cyl(0.13, 0.17, 9.4, 8), [0, 4.7, 0]).add('wood', rb(2.4, 0.14, 0.14, 0.02), [0, 8.7, 0]).add('wood', rb(1.6, 0.12, 0.12, 0.02), [0, 8.0, 0]).add('steel', cyl(0.22, 0.22, 0.7, 8), [0.4, 7.2, 0.2]); for (const x of [-1.05, -0.4, 0.4, 1.05]) k.add('white', cyl(0.04, 0.05, 0.16, 6), [x, 8.85, 0]); },
  rubble(k) { const r = rng(7); for (let i = 0; i < 9; i++) k.add('concrete', rb(0.5 + r() * 1.1, 0.25 + r() * 0.5, 0.5 + r() * 0.9, 0.05), [(r() - 0.5) * 2.6, 0.15 + r() * 0.35, (r() - 0.5) * 2.2], [(r() - 0.5) * 0.9, r() * 3, (r() - 0.5) * 0.9]); for (let i = 0; i < 4; i++) k.add('rust', cyl(0.02, 0.02, 1.4 + r(), 5), [(r() - 0.5) * 2, 0.6, (r() - 0.5) * 1.6], [0.6 + r(), r() * 3, r()]); },
  sandbags(k) { for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - (row === 2 ? 1 : 0); i++) k.add('sand', rb(0.72, 0.24, 0.4, 0.11), [-1.45 + i * 0.73 + (row % 2) * 0.36 + (row === 2 ? 0.0 : 0), 0.12 + row * 0.22, (row % 2) * 0.03], [0, (i % 2) * 0.08 - 0.04, 0]); },
  cone(k) { k.add('dark', rb(0.36, 0.04, 0.36, 0.01), [0, 0.02, 0]).add('red', cone(0.14, 0.6, 10), [0, 0.34, 0]).add('white', cyl(0.075, 0.1, 0.1, 10), [0, 0.32, 0]); },
  tyres(k) { for (let i = 0; i < 4; i++) k.add('tyre', torus(0.3, 0.13), [(i % 2) * 0.06, 0.13 + i * 0.25, 0], [PI / 2, 0, 0]); k.add('tyre', torus(0.3, 0.13), [0.75, 0.3, 0.1], [0.2, 0.4, 0]); },
  crates(k) { k.add('green', rb(1.1, 0.7, 0.8, 0.04), [0, 0.35, 0]).add('green', rb(1.0, 0.6, 0.75, 0.04), [0.05, 1.0, 0.03], [0, 0.2, 0]).add('wood', rb(0.8, 0.8, 0.8, 0.03), [1.1, 0.4, 0.1], [0, -0.15, 0]).add('yellow', bx(1.12, 0.08, 0.82), [0, 0.5, 0]).add('dark', bx(0.82, 0.06, 0.82), [1.1, 0.6, 0.1], [0, -0.15, 0]); },
  tank(k) { k.add('white', cyl(1.3, 1.3, 4.4, 18), [0, 1.9, 0], [PI / 2, 0, 0]).add('white', sph(1.3, 18, 10), [0, 1.9, -2.2], null, [1, 1, 0.45]).add('white', sph(1.3, 18, 10), [0, 1.9, 2.2], null, [1, 1, 0.45]).add('red', cyl(1.32, 1.32, 0.3, 18), [0, 1.9, 0.8], [PI / 2, 0, 0]);
    for (const z of [-1.5, 1.5]) k.add('steel', rb(2.2, 0.7, 0.3, 0.04), [0, 0.35, z]).add('steel', rb(0.2, 1.2, 0.3, 0.04), [-0.9, 0.9, z]).add('steel', rb(0.2, 1.2, 0.3, 0.04), [0.9, 0.9, z]); k.add('steel', cyl(0.09, 0.09, 2.6, 8), [1.45, 1.3, 0]).seg('steel', [1.45, 2.6, 0], [0.6, 3.1, 0], 0.09, 0.09, 8).add('yellow', cyl(0.16, 0.16, 0.12, 10), [1.45, 0.8, 0]); },
  mast(k) { k.add('dark', rb(1.2, 0.3, 1.2, 0.04), [0, 0.15, 0]); for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]]) k.seg('steel', [x, 0.3, z], [x * 0.3, 13, z * 0.3], 0.05, 0.035, 5);
    for (let i = 0; i < 8; i++) { const y = 1 + i * 1.5, w = 0.34 - i * 0.03; k.add('steel', bx(w * 2, 0.04, 0.04), [0, y, w]).add('steel', bx(w * 2, 0.04, 0.04), [0, y, -w]).add('steel', bx(0.04, 0.04, w * 2), [w, y, 0]).add('steel', bx(0.04, 0.04, w * 2), [-w, y, 0]); }
    k.add('white', sph(0.7, 14, 8), [0.5, 11, 0], [0, 0, -0.9], [1, 0.3, 1]).add('steel', cyl(0.02, 0.02, 2.2, 5), [0, 14, 0]).add('lampR', sph(0.09, 8, 6), [0, 15.1, 0]).add('lamp', bx(0.5, 0.2, 0.1), [0, 9, 0.3]).add('lamp', bx(0.5, 0.2, 0.1), [0, 9, -0.3]); },
  habitat(k) { k.add('hull', cyl(2.6, 2.6, 7, 20), [0, 1.2, 0], [PI / 2, 0, 0]).add('hull', sph(2.6, 20, 10), [0, 1.2, -3.5], null, [1, 1, 0.5]).add('hull', sph(2.6, 20, 10), [0, 1.2, 3.5], null, [1, 1, 0.5]);
    for (const z of [-2.2, 0, 2.2]) k.add('steel', torus(2.63, 0.07), [0, 1.2, z]); for (const z of [-1.1, 1.1]) for (const x of [-1, 1]) k.add('glass', rb(0.1, 0.5, 0.9, 0.05), [x * 2.42, 2.2, z], [0, 0, x * -0.42]).add('lampB', bx(0.06, 0.06, 0.8), [x * 2.5, 1.75, z]);
    k.add('dark', rb(1.3, 2.0, 0.5, 0.06), [0, 1.0, -4.75]).add('lampB', bx(0.9, 0.08, 0.05), [0, 2.1, -5.01]).add('steel', rb(1.8, 0.1, 1.4, 0.02), [0, 0.05, -5.5]).add('steel', cyl(0.3, 0.3, 1.0, 10), [1.2, 3.9, 1]).add('white', sph(0.5, 12, 8), [-1, 4.0, -1], [0.5, 0, 0], [1, 0.3, 1]); },
  floodlight(k) { k.add('dark', rb(0.9, 0.2, 0.9, 0.04), [0, 0.1, 0]).add('steel', cyl(0.06, 0.08, 5, 8), [0, 2.6, 0]).add('dark', rb(1.3, 0.5, 0.2, 0.04), [0, 5.2, 0], [0.35, 0, 0]).add('lamp', bx(1.14, 0.38, 0.05), [0, 5.2, -0.12], [0.35, 0, 0]); } };
const UPRIGHT = { streetLight: 1, trafficLight: 1, billboard: 1, pole: 1, mast: 1, floodlight: 1, hydrant: 1 }, _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const BAKED = {}; const baked = name => { if (!BAKED[name]) { const k = new Kit(); DEF[name](k); BAKED[name] = k.bake(); } return BAKED[name]; };
// footprint (width, depth) used for collision and cover
const TALL = { car: 1.5, truck: 2.9, bus: 3.2, barrier: 1.1, dumpster: 1.6, container: 2.7, tank: 2.9, habitat: 3.4, rover: 1.9, crates: 1.3, sandbags: 1, rubble: 1.1, planter: 0.9 };
const SIZE = { car: [1.9, 4.4], truck: [2.2, 6], bus: [2.6, 10.6], barrier: [0.7, 2.7], dumpster: [2.1, 1.3], container: [2.5, 6.1], tank: [2.7, 5.2], habitat: [5.2, 9], rover: [2.3, 3.5], crates: [2.2, 1], sandbags: [3.6, 0.6], rubble: [2.6, 2.2], planter: [1.7, 1.7], mast: [1.2, 1.2] };

// ---------- Road surface: one shader that paints asphalt, cracks, lane lines and puddles from world position
function roadMaterial(style, wet, time) { const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); const dirt = style === 'track', deck = style === 'deck';
  mat.onBeforeCompile = sh => { sh.uniforms.uRoadTime = time || { value: 0 }; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec2 vRuv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz; vRuv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; varying vec2 vRuv; uniform float uRoadTime; float fPuddle = 0.0; float fFine = 0.0;
      float rh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rh(i), rh(i + vec2(1, 0)), f.x), mix(rh(i + vec2(0, 1)), rh(i + vec2(1, 1)), f.x), f.y); }
      float rf(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += rn(p) * a; p = p * 2.03 + 11.7; a *= 0.5; } return v; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { vec2 w = vWp.xz; float n = rf(w * 0.35); fFine = rf(w * 5.0); float grit = rh(floor(w * 60.0));
        vec3 a = ${dirt ? 'mix(vec3(0.16, 0.13, 0.12), vec3(0.3, 0.26, 0.24), fFine * 0.6 + n * 0.5)' : 'mix(vec3(0.045, 0.045, 0.05), vec3(0.13, 0.125, 0.12), fFine * 0.55 + n * 0.5) + grit * 0.02'};
        ${deck ? 'a = mix(vec3(0.14, 0.17, 0.2), vec3(0.23, 0.26, 0.3), fFine); a *= 1.0 - step(fract(vRuv.y * 0.25), 0.025) * 0.5;' : ''}
        float crack = smoothstep(0.012, 0.0, abs(rf(w * 1.7 + 7.0) - 0.5)) * smoothstep(0.4, 0.62, rf(w * 0.15 + 3.0)); a *= 1.0 - crack * 0.55;
        float patchy = smoothstep(0.62, 0.66, rf(w * 0.22 + 20.0)); a = mix(a, a * 0.6, patchy * 0.6);
        ${dirt ? 'float tr = smoothstep(0.12, 0.0, abs(abs(vRuv.x - 0.5) - 0.22)); a *= 1.0 - tr * 0.3;' : `float wear = 0.35 + 0.65 * smoothstep(0.3, 0.7, rf(w * 0.6 + 40.0));
        float dash = step(fract(vRuv.y * 0.16), 0.5) * smoothstep(0.022, 0.012, abs(vRuv.x - 0.5)); float edge = smoothstep(0.014, 0.006, abs(abs(vRuv.x - 0.5) - 0.44));
        a = mix(a, vec3(0.72, 0.56, 0.12), dash * wear); a = mix(a, vec3(0.72, 0.72, 0.7), edge * wear);`}
        fPuddle = smoothstep(0.44, 0.6, rf(w * 0.13 + 3.0)) * ${(deck ? 0 : wet || 0).toFixed(3)}; a = mix(a, a * 0.4, fPuddle); diffuseColor.rgb = a; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(' + (wet ? '0.42' : '0.9') + ' - fFine * 0.2, 0.04, fPuddle);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 p = vWp.xz * 1.3, cell = floor(p), local = fract(p) - vec2(rh(cell), rh(cell + 4.0));
        float phase = fract(uRoadTime * 0.8 + rh(cell + 13.0)); float ring = sin((length(local) - phase) * 42.0) * exp(-abs(length(local) - phase) * 22.0) * (1.0 - phase) * fPuddle;
        normal = normalize(normal + (viewMatrix * vec4(local.x, 0.0, local.y, 0.0)).xyz * ring * 0.07);`); };
  return mat; }
function ribbon(pts, width, H, lift, step) { const pos = [], uv = [], idx = [], cols = 4; let dist = 0, row = 0;
  for (let i = 0; i < pts.length - 1; i++) { const ax = pts[i][0], az = pts[i][1], bx2 = pts[i + 1][0], bz = pts[i + 1][1], len = Math.hypot(bx2 - ax, bz - az), n = Math.max(1, Math.round(len / step)), nx = -(bz - az) / len, nz = (bx2 - ax) / len;
    for (let j = (i ? 1 : 0); j <= n; j++) { const t = j / n, cx = ax + (bx2 - ax) * t, cz = az + (bz - az) * t; for (let c = 0; c <= cols; c++) { const o = (c / cols - 0.5) * width, x = cx + nx * o, z = cz + nz * o; pos.push(x, H(x, z) + lift, z); uv.push(c / cols, (dist + len * t)); } if (row > 0) for (let c = 0; c < cols; c++) { const a = (row - 1) * (cols + 1) + c, b = row * (cols + 1) + c; idx.push(a, a + 1, b, a + 1, b + 1, b); } row++; } dist += len; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }

// ---------- District layouts
const LAYOUT = {
  la: { style: 'street', roads: [[[0, 80], [0, -116]], [[-116, 25], [116, 25]], [[-116, -32], [116, -32]], [[-72, 80], [-72, -70]], [[72, 80], [72, -70]]], width: 9, walks: true },
  kepler: { style: 'track', roads: [[[0, 78], [0, 10], [-18, -40], [-10, -110]], [[-100, 34], [-30, 28], [40, 30], [104, 20]], [[-50, 65], [-50, -65]], [[54, 60], [54, -58]], [[-92, -60], [85, -60]]], width: 6.5 },
  ceres: { style: 'deck', roads: [[[0, 78], [0, -112]], [[-110, 28], [110, 28]], [[-60, 70], [-60, -70]], [[64, 70], [64, -70]], [[-106, -58], [106, -58]]], width: 7.5, walks: true } };

// Human settlements have different silhouettes on each world, while sharing the teal/gold equipment family.
function settlementBlock(world, w, d, h) {
  const k = new Kit(), kepler = world === 'kepler';
  k.add('dark', rb(w, 0.6, d, 0.06), [0, 0.3, 0]).add(kepler ? 'insulation' : 'hull', rb(w * 0.94, h * 0.76, d * 0.94, 0.15), [0, h * 0.38 + 0.5, 0]);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) { const x = w * (-0.34 + i * 0.225);
      k.add('station', bx(0.16, h * 0.8, 0.2), [x, h * 0.4 + 0.5, side * d * 0.48]);
      k.add('dark', rb(w * 0.17, 0.9, 0.14, 0.04), [x + w * 0.1, h * 0.48, side * d * 0.48]);
      k.add('lampB', bx(w * 0.13, 0.4, 0.03), [x + w * 0.1, h * 0.48, side * d * 0.49]);
    }
    k.add('steel', rb(0.22, h * 0.82, d, 0.03), [side * w * 0.48, h * 0.41 + 0.4, 0]);
    k.add('yellow', bx(0.24, 0.12, d * 0.65), [side * w * 0.48, 0.9, 0]);
  }
  k.add('dark', rb(1.9, 2.5, 0.18, 0.06), [0, 1.55, -d * 0.49]).add('station', rb(1.5, 2.2, 0.19, 0.04), [0, 1.5, -d * 0.5])
    .add('lampB', bx(1.5, 0.08, 0.05), [0, 2.65, -d * 0.52]);
  if (kepler) {
    k.add('hull', rb(w * 0.9, 0.65, d * 0.9, 0.2), [0, h * 0.8 + 0.5, 0]);
    for (const x of [-w * 0.28, w * 0.28]) k.add('station', rb(w * 0.32, 0.12, d * 0.64, 0.03), [x, h * 0.85 + 0.9, 0], [0, 0, x > 0 ? -0.18 : 0.18]);
    k.add('steel', cyl(0.04, 0.04, 2.3, 6), [w * 0.3, h + 1, d * 0.25]).add('lampB', bx(0.2, 0.15, 0.2), [w * 0.3, h + 2.2, d * 0.25]);
  } else {
    k.add('station', bx(w + 0.3, 0.35, d + 0.3), [0, h * 0.8 + 0.7, 0]);
    for (let i = 0; i < 4; i++) k.add('dark', rb(w * 0.7, 0.35, 0.3, 0.04), [0, h * 0.8 + 1, d * (-0.28 + i * 0.18)]);
    k.add('steel', cyl(0.25, 0.25, h * 0.8, 10), [w * 0.38, h * 0.4 + 0.4, d * 0.49]);
    k.add('hullB', rb(w * 0.25, 1.8, d * 0.3, 0.08), [w * 0.2, h + 0.8, d * 0.2]);
  }
  return k;
}
export function buildDistrict(group, world, H, TEX, addSolid, blocked, opts) { opts = opts || {}; const L = LAYOUT[world] || LAYOUT.la, P = propMaterials(TEX), bucket = {}, emitters = [], lights = [], placed = [], blocks = [], r = rng(world.length * 977 + 13), _o = new THREE.Object3D();
  const half = L.width / 2 + (L.walks ? 2.6 : 0.5), segs = []; for (const rd of L.roads) for (let i = 0; i < rd.length - 1; i++) segs.push([rd[i][0], rd[i][1], rd[i + 1][0], rd[i + 1][1]]);
  const paved = (x, z, pad) => { for (const s of segs) { const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)); if (Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t) < half + (pad || 0)) return true; } return false; };
  // surfaces
  const rm = roadMaterial(L.style, opts.wet, opts.time); for (const rd of L.roads) { const m = new THREE.Mesh(ribbon(rd, L.width, H, 0.09, 1.3), rm); m.receiveShadow = true; group.add(m); }
  if (L.walks) { const wm = wetSurface(new THREE.MeshStandardMaterial({ map: TEX.concrete.clone(), color: 0xb8b2a6, roughness: 0.95, bumpMap: TEX.concrete, bumpScale: 0.4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), opts.wet || 0, opts.time || { value: 0 }); wm.map.repeat.set(1, 0.25); wm.map.needsUpdate = true;
    for (const rd of L.roads) for (const sd of [-1, 1]) { const p = rd.map((q, i) => { const a = rd[Math.max(0, i - 1)], b = rd[Math.min(rd.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [q[0] - (b[1] - a[1]) / l * sd * (L.width / 2 + 1.2), q[1] + (b[0] - a[0]) / l * sd * (L.width / 2 + 1.2)]; }); const m = new THREE.Mesh(ribbon(p, 2.4, H, 0.17, 1.3), wm); m.receiveShadow = true; group.add(m); } }
  const pad = new THREE.Mesh(new THREE.CircleGeometry(14, 40), L.style === 'street' ? new THREE.MeshStandardMaterial({ map: TEX.concrete, color: 0xc4beb2, roughness: 0.9, bumpMap: TEX.concrete, bumpScale: 0.4, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }) : new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.6, metalness: 0.5, bumpMap: TEX.plate, bumpScale: 0.4, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })); pad.rotation.x = -PI / 2; pad.position.set(0, H(0, 46) + 0.2, 46); pad.receiveShadow = true; group.add(pad);
  const rim = new THREE.Mesh(new THREE.RingGeometry(13.2, 13.8, 48), new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })); rim.rotation.x = -PI / 2; rim.position.set(0, H(0, 46) + 0.22, 46); group.add(rim);
  // City blocks: buildings generated along every street, kept clear of the core, hives, caches and the landing zone
  if (opts.facades) { const painted = !!opts.facades[0].map && !opts.facades[0].isTexture, fm = opts.facades.map(t => { if (painted) { for (const q of [t.map, t.normalMap, t.glow]) if (q) q.wrapS = q.wrapT = THREE.RepeatWrapping; return weather(new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), emissiveMap: t.glow, emissive: 0xffffff, emissiveIntensity: opts.dusk ? 1.6 : 0.9, roughness: 0.82, metalness: 0.05 }), 0.5, 0); } t.wrapS = t.wrapT = THREE.RepeatWrapping; return weather(new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0.05 }), 0.7, 0); }); if (world === 'la' && !painted) for (let i = 0; i < 2; i++) fm.push(weather(new THREE.MeshStandardMaterial({ map: TEX.facade, emissiveMap: TEX.facadeGlow, emissive: 0xffffff, emissiveIntensity: opts.dusk ? 2.2 : 1.2, roughness: 0.8, metalness: 0.1 }), 0.7, 0)); const gb = fm.map(() => []), roofs = [], keep = opts.keepOut || [];
    const free = (x, z, w, d) => { for (const k of keep) if (Math.hypot(x - k[0], z - k[1]) < k[2] + Math.max(w, d) / 2) return false; for (const [px, pz] of [[0, 0], [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2], [0, d / 2], [-w / 2, 0], [w / 2, 0]]) if ((blocked && blocked(x + px, z + pz)) || paved(x + px, z + pz, 0.4)) return false; return true; };
    for (const segment of segs) for (const sd of [-1, 1]) { const ax = segment[0], az = segment[1], dx = segment[2] - ax, dz = segment[3] - az, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, nx = -uz * sd, nz = ux * sd; let t = 8 + r() * 10;
      while (t < len - 8) { const along2 = 10 + r() * 8, deep = 9 + r() * 5, h = world === 'la' ? 7 + Math.pow(r(), 1.6) * 22 : 4.5 + r() * (world === 'kepler' ? 5 : 3.5), off = half + deep / 2 + 0.8, x = ax + ux * (t + along2 / 2) + nx * off, z = az + uz * (t + along2 / 2) + nz * off, w = Math.abs(ux) > 0.5 ? along2 : deep, d = Math.abs(ux) > 0.5 ? deep : along2;
        if (Math.abs(x) < 118 && Math.abs(z) < 118 && free(x, z, w, d)) { let y0 = 1e9; for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) y0 = Math.min(y0, H(x + px, z + pz)); y0 -= 0.6; blocks.push({ world, x, z, w, d, h });
          const scan = world === 'la' && opts.building ? opts.building(along2, deep, r) : null;
          if (world !== 'la') { const kit = settlementBlock(world, w, d, h); for (const [key, g] of Object.entries(kit.bake())) { g.translate(x, y0, z); (bucket[key] = bucket[key] || []).push(g); } }
          else if (scan) { scan.obj.position.set(x, y0 + 0.5, z); scan.obj.rotation.y = Math.atan2(-nx, -nz); group.add(scan.obj); const across = Math.abs(ux) > 0.5; addSolid(x, z, across ? scan.w : scan.d, across ? scan.d : scan.w, null, scan.h + 0.3); }
          else { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(), uv = g.attributes.uv, ru = Math.max(1, Math.round(Math.max(w, d) / (painted ? 13 : 8))), rv = Math.max(1, Math.round(h / (painted ? 13 : 8))); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); g.translate(x, y0 + h / 2, z); gb[Math.floor(r() * fm.length)].push(g);
          const rf = new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6).toNonIndexed(); rf.translate(x, y0 + h + 0.25, z); roofs.push(rf); const ac = new THREE.BoxGeometry(w * 0.3, 1.2, d * 0.3).toNonIndexed(); ac.translate(x + (r() - 0.5) * w * 0.4, y0 + h + 1.1, z + (r() - 0.5) * d * 0.4); roofs.push(ac); if (r() < 0.5) { const tk = new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10).toNonIndexed(); tk.translate(x + (r() - 0.5) * w * 0.5, y0 + h + 2.2, z + (r() - 0.5) * d * 0.5); roofs.push(tk); }
 }
          if (!scan) addSolid(x, z, w, d, null, h - 0.1); } t += along2 + 2.5 + r() * 9; } }
    gb.forEach((list, i) => { if (list.length) { const m = new THREE.Mesh(mergeGeometries(list), fm[i]); m.castShadow = m.receiveShadow = true; group.add(m); } }); if (roofs.length) { const m = new THREE.Mesh(mergeGeometries(roofs), P.roof); m.castShadow = m.receiveShadow = true; group.add(m); } }
  // stamping
  const put = (name, x, z, rot, o) => { o = o || {}; if (!o.force && blocked && blocked(x, z, name)) return false; const y = H(x, z) + (o.y || 0); _o.position.set(x, y, z); _o.rotation.set(o.tiltX || 0, rot || 0, o.tiltZ || 0, 'YXZ'); if (!UPRIGHT[name]) { _n.set(H(x - 1.2, z) - H(x + 1.2, z), 2.4, H(x, z - 1.2) - H(x, z + 1.2)).normalize(); _q.setFromUnitVectors(_up, _n); _o.quaternion.premultiply(_q); } _o.scale.setScalar(o.s || 1); _o.updateMatrix(); const G = baked(name); placed.push({ name, x, z, rotation: rot || 0 });
    for (const k in G) { const g = G[k].clone().applyMatrix4(_o.matrix), key = (o.swap && o.swap[k]) || k; (bucket[key] = bucket[key] || []).push(g); }
    const baseName = name.replace(/Wreck$|Open$/, ''), sz2 = SIZE[baseName]; if (sz2 && addSolid && !o.ghost) { const c = Math.abs(Math.cos(rot || 0)), s = Math.abs(Math.sin(rot || 0)); addSolid(x, z, (sz2[0] * c + sz2[1] * s) * (o.s || 1), (sz2[0] * s + sz2[1] * c) * (o.s || 1), null, TALL[baseName] ? TALL[baseName] * (o.s || 1) : undefined); } return true; };
  const along = (rd, every, side, fn, start) => { let carry = start || 0; for (let i = 0; i < rd.length - 1; i++) { const ax = rd[i][0], az = rd[i][1], dx = rd[i + 1][0] - ax, dz = rd[i + 1][1] - az, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len; let d = carry; for (; d < len; d += every) fn(ax + dx * d / len + nx * side, az + dz * d / len + nz * side, Math.atan2(dx, dz), d); carry = d - len; } };
  const BODY = ['carA', 'carB', 'carC', 'carD', 'carE', 'carF'], wreck = () => (r() < 0.5 ? 'burnt' : 'rust');
  if (world === 'la') {
    L.roads.forEach((rd, ri) => { let n = 0; along(rd, 24, L.width / 2 + 1.3, (x, z, a) => { const sd = (n++ % 2) ? 1 : -1, dx = Math.cos(a), dz = -Math.sin(a), px = sd > 0 ? x : x - dx * (L.width + 2.6), pz = sd > 0 ? z : z - dz * (L.width + 2.6); const rot = a + (sd > 0 ? PI / 2 : -PI / 2) + PI; if (put('streetLight', px, pz, rot, { ghost: true })) lights.push([px + Math.cos(rot) * 1.75, pz - Math.sin(rot) * 1.75, 7.2]); }, 9 + ri * 5); });
    for (const [x, z] of [[0, 25], [0, -32], [-72, 25], [72, 25], [-72, -32], [72, -32]]) { put('trafficLight', x + 6.2, z + 6.2, PI, { ghost: true, force: true }); put('trafficLight', x - 6.2, z - 6.2, 0, { ghost: true, force: true }); }
    // traffic that never got out: parked, abandoned and burned vehicles make the cover north of the core
    const cars = [[-2.6, 8, 0.05], [2.4, -4, 3.2], [-2.2, -16, 0.4, 1], [3.0, -44, 2.9], [-1.5, -58, 1.2, 1], [2.6, -74, 0.1], [-2.8, -90, 3.0, 1], [-16, 22.6, 1.6], [-28, 27.6, 1.5], [-42, 22.4, 1.7, 1], [18, 27.4, 4.6], [33, 22.6, 4.7], [52, 27.8, 1.5, 1], [-20, -29.8, 1.5], [-48, -34.4, 4.8, 1], [24, -34.2, 1.6], [46, -29.6, 4.9], [-74.6, 6, 0.1], [-69.6, -14, 3.1, 1], [74.5, -6, 0.0], [69.8, 12, 3.2], [-74.5, 52, 0.05], [74.4, 58, 3.1], [-95, 27.5, 1.6], [96, 22.5, 4.7, 1]];
    for (const c of cars) { const dead = c[3], t = r(); const ok = put((t < 0.16 ? 'truck' : 'car') + (dead ? 'Wreck' : ''), c[0], c[1], c[2] + (dead ? (r() - 0.5) * 0.8 : (r() - 0.5) * 0.08), { swap: Object.assign({ body: dead ? wreck() : BODY[Math.floor(r() * BODY.length)] }, !dead && opts.dusk && r() < 0.6 ? { head: 'lamp', tail: 'lampR' } : {}), tiltZ: dead ? (r() - 0.5) * 0.12 : 0 }); if (ok && dead && emitters.length < 5) emitters.push({ x: c[0], z: c[1], y: H(c[0], c[1]) + 1.1, fire: emitters.length < 3 }); }
    put('bus', -3.2, -26, 0.5, { swap: { body: 'carE' } }); put('busWreck', 60, 24.5, 1.45, { swap: { body: 'burnt' }, tiltZ: 0.05 }); put('bus', -60, -31, 4.6, { swap: { body: 'carC' } });
    for (const x of [-3.4, -0.6, 2.2]) put('barrier', x, 14, PI / 2 + (r() - 0.5) * 0.2); for (const x of [-2.4, 1.2, 4.0]) put('barrier', x, -9, PI / 2 + (r() - 0.5) * 0.3); for (const z of [20, 23, 29]) put('barrier', -9.5, z, (r() - 0.5) * 0.2); for (const z of [20, 26, 29]) put('barrier', 10.5, z, (r() - 0.5) * 0.2);
    for (const [x, z, a] of [[-7.5, 4, 0.3], [7.5, -20, 2.8], [-8, -38, 0.2], [8, -52, 3.0], [-24, 31.5, 1.5], [30, 18.5, 1.6], [-66, 20, 0.1], [66, -20, 0.2]]) put('dumpster', x, z, a);
    for (const [x, z] of [[6.2, 20], [-6.2, -24], [6.2, -60], [-20, 19], [40, 31], [-66, 31], [66, 19]]) put('hydrant', x, z, r() * 6, { ghost: true });
    for (const [x, z, a] of [[-10.5, 44, PI / 2], [10.5, 48, -PI / 2], [-6.3, 60, PI / 2], [6.3, 66, -PI / 2]]) put('bench', x, z, a, { ghost: true }); for (const [x, z] of [[-11, 54], [11, 38], [-11, 38], [11, 56]]) put('planter', x, z, 0);
    put('billboard', -14, -6, 0.5, { ghost: true }); put('billboard', 20, -44, -0.6, { ghost: true }); put('billboard', -84, 40, 1.2, { ghost: true });
    const poles = []; along(L.roads[2], 30, -(L.width / 2 + 3.4), (x, z, a) => { if (put('pole', x, z, a, { ghost: true })) poles.push([x, z]); }, 6);
    for (let i = 0; i < poles.length - 1; i++) for (const off of [-1.05, 1.05]) { const a = poles[i], b = poles[i + 1], pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t + off * 0.0, y = (H(a[0], a[1]) + (H(b[0], b[1]) - H(a[0], a[1])) * t) + 8.85 - Math.sin(t * PI) * 0.9; pts.push(new THREE.Vector3(x, y, z + off * 0.4)); } const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x101214 })); group.add(ln); }
    for (const [x, z] of [[-16, 12], [14, 4], [-22, -18], [18, -24], [-38, -8], [44, 10], [-12, -66], [10, -84], [-50, 40], [52, 44]]) put('rubble', x, z, r() * 6);
    for (const [x, z, a] of [[-5, 19, 0.1], [6, 17, -0.15], [-14, 22, 0.5], [15, 21, -0.5]]) put('sandbags', x, z, a); for (const [x, z] of [[5, 10], [-4, -2], [3.5, -30], [-5.5, -47], [12, 26], [-13, 24]]) put('cone', x, z, 0, { ghost: true });
    put('container', 5.5, -100, 0.3, { swap: { body: 'carB' } }); put('containerOpen', -5, -104, -0.2, { swap: { body: 'rust' } }); put('containerOpen', 84, -30, 1.5, { swap: { body: 'carA' } }); put('container', -88, -34, 1.6, { swap: { body: 'carF' } });
    for (const [x, z] of [[-9, 34], [9, 52], [20, 12], [-24, -4]]) put('crates', x, z, r() * 3); for (const [x, z] of [[-7, -12], [8, -36], [-30, 31], [36, 19]]) put('tyres', x, z, r() * 3, { ghost: true });
  } else { const hull = world === 'ceres' ? 'hull' : 'hullB';
    for (const [x, z, a] of [[-24, 56, 0.3], [24, 58, -0.3], [-34, 40, 1.4]]) put('habitat', x, z, a); for (const [x, z, a] of [[20, 38, 0.2], [-18, 20, 1.3], [30, 18, 1.5]]) put('tank', x, z, a);
    for (const [x, z, a, c] of [[-10, 8, 0.1, 'carB'], [-7, 2, 0.2, 'rust'], [12, -6, 1.5, 'carE'], [-14, -26, 0.4, 'carA'], [9, -40, 1.7, 'hullB'], [16, -44, 1.6, 'carF'], [-40, 30, 1.5, 'carC'], [46, 26, 1.6, 'rust'], [-4, -70, 0.2, 'carB'], [6, -76, 2.9, 'burnt']]) put(r() < 0.5 ? 'containerOpen' : 'container', x, z, a, { swap: { body: c } });
    for (const [x, z] of [[-30, 70], [32, 70], [-58, 30], [60, 26], [0, -20], [-20, -60]]) put('mast', x, z, r() * 6); for (const [x, z, a] of [[5, 22, 0.4], [-6, -10, 2.6], [3, -56, 0.2], [-26, 30, 1.4], [28, 32, 4.6]]) { const dead = r() < 0.4; if (put(dead ? 'roverWreck' : 'rover', x, z, a, { swap: dead ? { hull: 'burnt', body: 'burnt', hullB: 'rust' } : { hull } }) && dead && emitters.length < 3) emitters.push({ x, z, y: H(x, z) + 1.4, fire: true }); }
    for (const [x, z, a] of [[-12, 34, 0.8], [12, 34, -0.8], [-6, 12, 0.3], [8, -24, 2.6], [-10, -46, 0.4], [44, 34, -1.2], [-50, 34, 1.2]]) if (put('floodlight', x, z, a, { ghost: true })) lights.push([x, z]);
    for (const [x, z] of [[-9, 30], [9, 30], [18, 6], [-20, -8], [4, -30], [-8, -62]]) put('crates', x, z, r() * 3); for (const [x, z, a] of [[-5, 19, 0.1], [6, 17, -0.15], [-14, 22, 0.5], [15, 21, -0.5]]) put('sandbags', x, z, a);
    for (const x of [-2.4, 0.8, 3.6]) put('barrier', x, 12, PI / 2 + (r() - 0.5) * 0.2); for (const [x, z] of [[-16, 14], [16, -14], [-24, -34], [22, -58]]) put('rubble', x, z, r() * 6);
  }
  if (opts.dusk && lights.length) { const cones = [], pools = []; for (const l of lights) { const gy = H(l[0], l[1]), hh = (l[2] || 5), c = new THREE.ConeGeometry(3.6, hh, 18, 4, true).toNonIndexed(), cp = c.attributes.position, cc = new Float32Array(cp.count * 3); for (let i = 0; i < cp.count; i++) { const v = Math.pow((cp.getY(i) + hh / 2) / hh, 1.6); cc[i * 3] = v; cc[i * 3 + 1] = v; cc[i * 3 + 2] = v; } c.setAttribute('color', new THREE.BufferAttribute(cc, 3)); c.translate(l[0], gy + hh / 2, l[1]); cones.push(c); const d = new THREE.CircleGeometry(4.6, 20).toNonIndexed(); d.rotateX(-PI / 2); d.translate(l[0], gy + 0.22, l[1]); pools.push(d); }
    const cm = new THREE.Mesh(mergeGeometries(cones), new THREE.MeshBasicMaterial({ color: 0xffc078, vertexColors: true, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); group.add(cm);
    const pm2 = new THREE.Mesh(mergeGeometries(pools), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 })); group.add(pm2); }
  for (const k in bucket) { const m = new THREE.Mesh(mergeGeometries(bucket[k]), P[k]); m.castShadow = !/^lamp|sign|poster|glass/.test(k); m.receiveShadow = true; group.add(m); }
  return { paved, emitters, lights, placed, blocks, tick(t) { if (opts.time) opts.time.value = t; } }; }
