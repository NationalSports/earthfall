// Photo-scanned ground for the open map: four Poly Haven (CC0) texture sets per world, blended per pixel.
// Layer 0 = city lots, 1 = open ground, 2 = second ground (sand, patches), 3 = rock on steep slopes.
// Each set is two images (see tools/buildpbr.py): colour with baked occlusion, and normal X/Y + roughness.
// They are packed into two texture arrays, so the shader needs only two texture slots for all four layers.
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export const SETS = {
  la: ['dirty-concrete', 'grass-ground', 'gravelly-sand', 'cliff-side'],
  kepler: ['dirty-concrete', 'burned-ground-01', 'cracked-red-ground', 'dark-rock'],
  ceres: ['dirty-concrete', 'dry-ground-01', 'gravelly-sand', 'cliff-side']
};
// Metres covered by one repeat of each texture (rock is scaled up so cliffs read as big faces).
const METRES = { 'dirty-concrete': 3.2, 'grass-ground': 3, 'gravelly-sand': 3, 'cliff-side': 7, 'burned-ground-01': 2.6, 'cracked-red-ground': 3.2, 'dark-rock': 6.5, 'dry-ground-01': 4 };
const ASSETS = () => window.FRONTLINE_ASSETS || {};
export const hasPBR = world => !!SETS[world] && SETS[world].every(n => ASSETS()['pbr-' + n + '-d'] && ASSETS()['pbr-' + n + '-n']);

const cache = {}; window.__pbrCache = cache; /* read by the screenshot tests */
function placeholder(srgb) { const t = new THREE.DataArrayTexture(new Uint8Array([128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255].map((v, i) => srgb ? v : (i % 4 === 2 ? 200 : v))), 1, 1, 4); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }
async function pixels(url, size) { let img; try { img = await createImageBitmap(await (await fetch(url)).blob()); } catch (e) { img = new Image(); img.src = url; await img.decode(); } /* decoded off the main thread where the browser can */ const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, size, size); return g.getImageData(0, 0, size, size).data; }
async function buildArrays(world, size, anisotropy) {
  const names = SETS[world], d = new Uint8Array(size * size * 4 * 4), n = new Uint8Array(size * size * 4 * 4);
  await Promise.all(names.map(async (nm, i) => { const [a, b] = await Promise.all([pixels(ASSETS()['pbr-' + nm + '-d'], size), pixels(ASSETS()['pbr-' + nm + '-n'], size)]); d.set(a, i * size * size * 4); n.set(b, i * size * size * 4); }));
  const make = (data, srgb) => { const t = new THREE.DataArrayTexture(data, size, size, 4); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = anisotropy; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  return [make(d, true), make(n, false)];
}

// The ground material. The textures arrive a moment after the mission starts (decoding takes a few hundred ms);
// until then the shader shows flat grey, which the loading curtain hides.
export function terrainMaterial(world, { coarse, anisotropy, tint }) {
  const names = SETS[world], U = { uPD: { value: null }, uPN: { value: null }, uPS: { value: new THREE.Vector4(...names.map(n => 1 / METRES[n])) } };
  const c = cache[world] || (cache[world] = { d: placeholder(true), n: placeholder(false), ready: null });
  U.uPD.value = c.d; U.uPN.value = c.n;
  if (!c.ready) c.ready = buildArrays(world, coarse ? 512 : 1024, anisotropy).then(([d, n]) => { c.d = d; c.n = n; }).catch(e => console.warn('ground textures', e));
  c.ready.then(() => { U.uPD.value = c.d; U.uPN.value = c.n; });
  const mat = new THREE.MeshStandardMaterial({ color: tint, vertexColors: true, roughness: 1, metalness: 0 });
  mat.customProgramCacheKey = () => 'pbr-ground-' + (coarse ? 1 : 2);
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 splat; varying vec4 vSplat; varying vec3 vPW; varying vec3 vPN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat; vPW = (modelMatrix * vec4(position, 1.0)).xyz; vPN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      precision highp sampler2DArray;
      uniform sampler2DArray uPD, uPN; uniform vec4 uPS; varying vec4 vSplat; varying vec3 vPW; varying vec3 vPN;
      vec3 pCol; vec3 pNW; float pRough;
      float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float pNoise(vec2 p) { vec2 i = floor(p), f = smoothstep(0.0, 1.0, fract(p)); return mix(mix(pHash(i), pHash(i + vec2(1, 0)), f.x), mix(pHash(i + vec2(0, 1)), pHash(i + 1.0), f.x), f.y); }
      // One layer: two lookups at different scales and angles, mixed by a slow noise, so the repeat never shows.
      void pLayer(float L, vec2 uv, vec3 T, vec3 B, float w, float m) {
        vec4 d1 = texture(uPD, vec3(uv, L)), n1 = texture(uPN, vec3(uv, L));
        ${coarse ? 'vec4 d = d1, n = n1; vec2 t = n1.xy * 2.0 - 1.0;' : `vec2 uv2 = mat2(0.8, 0.6, -0.6, 0.8) * uv * 0.37 + 0.31;
        vec4 d2 = texture(uPD, vec3(uv2, L)), n2 = texture(uPN, vec3(uv2, L));
        vec2 t2 = mat2(0.8, -0.6, 0.6, 0.8) * (n2.xy * 2.0 - 1.0);
        vec4 d = mix(d1, d2, m); vec4 n = mix(n1, n2, m); vec2 t = mix(n1.xy * 2.0 - 1.0, t2, m);`}
        pCol += d.rgb * w; pRough += n.z * w; pNW += (T * t.x + B * t.y) * w;
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 N = normalize(vPN); vec2 xz = vPW.xz;
        vec4 nz = vec4(pNoise(xz * 0.21), pNoise(xz * 0.17 + 9.1), pNoise(xz * 0.19 - 4.3), pNoise(xz * 0.23 + 2.7)) * 0.6 + vec4(pNoise(xz * 0.9), pNoise(xz * 1.1 + 3.0), pNoise(xz * 0.8 - 7.0), pNoise(xz * 1.0 + 5.0)) * 0.4;
        vec4 w = max(vSplat + (nz - 0.5) * vec4(0.45, 0.45, 0.45, 0.25), 0.0); w = w * w; w /= max(1e-4, w.x + w.y + w.z + w.w);
        float m = max(smoothstep(0.25, 0.75, pNoise(xz * 0.043)), smoothstep(22.0, 80.0, length(vPW - cameraPosition))); /* far ground uses only the large-scale lookup, so the repeat never shows */
        pCol = vec3(0.0); pNW = vec3(0.0); pRough = 0.0;
        vec2 top = vec2(xz.x, -xz.y); vec3 T0 = vec3(1.0, 0.0, 0.0), B0 = vec3(0.0, 0.0, -1.0);
        if (w.x > 0.01) pLayer(0.0, top * uPS.x, T0, B0, w.x, m);
        if (w.y > 0.01) pLayer(1.0, top * uPS.y, T0, B0, w.y, m);
        if (w.z > 0.01) pLayer(2.0, top * uPS.z, T0, B0, w.z, m);
        if (w.w > 0.01) { vec2 bw = pow(abs(N.xz) + 0.001, vec2(4.0)); bw /= bw.x + bw.y; vec3 Y = vec3(0.0, 1.0, 0.0);
          if (bw.x > 0.02) pLayer(3.0, vec2(-sign(N.x) * vPW.z, vPW.y) * uPS.w, vec3(0.0, 0.0, -sign(N.x)), Y, w.w * bw.x, m);
          if (bw.y > 0.02) pLayer(3.0, vec2(sign(N.z) * vPW.x, vPW.y) * uPS.w, vec3(sign(N.z), 0.0, 0.0), Y, w.w * bw.y, m); }
        // Big soft patches of lighter and darker ground break up the distance.
        float macro = pNoise(xz * 0.011) * 0.6 + pNoise(xz * 0.037) * 0.4;
        pCol *= 0.82 + macro * 0.36;
        pNW = normalize(N + pNW * 0.9);
        diffuseColor.rgb *= pCol;
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(pRough * 1.05, 0.35, 1.0);')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(pNW, 0.0)).xyz);\n#include <normal_fragment_maps>');
  };
  return mat;
}

// Per-vertex layer weights: city lots inside the city, rock where the slope is steep, and a second ground in patches
// (LA's beach is sand). The shader adds fine noise on top, so the edges between layers are ragged, not smooth.
export function splatWeights(world, x, z, h, ny, city, fbm, beach) {
  const steep = Math.min(1, Math.max(0, (1 - ny - 0.24) / 0.16));
  let u = city * (0.72 + 0.28 * fbm(x * 3.1 + 11, z * 3.1 - 7)), v = Math.max(0, fbm(x * 2.3 - 40, z * 2.3 + 18) * 1.4 + 0.1);
  if (world === 'la') v = Math.max(v * 0.6, beach);
  if (world === 'ceres' && h > 6) v += 0.3;
  u = Math.max(0, u); let f = Math.max(0.05, 1 - u - v * 0.7); const s = u + f + v;
  return [u / s * (1 - steep), f / s * (1 - steep), v / s * (1 - steep), steep];
}

// A real sky photo for reflections, turned so its sun lines up with the game's sun.
const envCache = {};
export function photoEnvironment(renderer, name, sunDir) {
  const url = ASSETS()['pbr-env-' + name]; if (!url) return Promise.resolve(null);
  if (!envCache[name]) envCache[name] = new Promise((res, rej) => new HDRLoader().load(url, res, undefined, rej)).then(t => {
    // Find the brightest column (the sun) so the photo can be spun to match.
    const { data, width, height } = t.image; let best = 0, bu = 0; const get = i => t.type === THREE.HalfFloatType ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i];
    for (let y = 0; y < height >> 1; y += 2) for (let x = 0; x < width; x += 2) { const i = (y * width + x) * 4, l = get(i) + get(i + 1) + get(i + 2); if (l > best) { best = l; bu = x / width; } }
    t.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(t); pm.dispose(); t.dispose();
    return { tex: rt.texture, sunU: bu };
  });
  return envCache[name].then(e => { if (!e) return null; return { tex: e.tex, rotY: (e.sunU - 0.5) * Math.PI * 2 - Math.atan2(sunDir.z, sunDir.x) }; });
}

// Open water: a large plane whose normals ripple with a few travelling waves (fading out with distance so it never sparkles),
// so it reflects the sky and catches the sun like a real sea.
export function waterMaterial(time) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b2630, roughness: 0.07, metalness: 0, transparent: true, opacity: 0.94 });
  mat.customProgramCacheKey = () => 'pbr-water';
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWaterTime = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWW = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW; uniform float uWaterTime;\nvec2 wave(vec2 p, vec2 d, float k, float a, float s) { float ph = dot(p, d) * k - uWaterTime * s; return d * (a * k * cos(ph)); }')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 p = vWW.xz; float fade = 1.0 / (1.0 + length(vWW - cameraPosition) * 0.012);
          vec2 g = wave(p, normalize(vec2(0.3, 1.0)), 0.21, 0.32, 1.1) + wave(p, normalize(vec2(-0.7, 1.0)), 0.37, 0.16, 1.6) + wave(p, normalize(vec2(1.0, 0.4)), 0.83, 0.06, 2.3) + wave(p, normalize(vec2(-0.2, -1.0)), 1.7, 0.025, 3.1) + wave(p, normalize(vec2(0.9, -0.5)), 3.1, 0.012, 4.2);
          vec3 nw = normalize(vec3(-g.x * fade, 1.0, -g.y * fade)); normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz); }`);
  };
  return mat;
}

// Average colour of the sky photo along its horizon: distant ground and sea fade into this instead of a flat fog colour,
// so the far edge of the world melts into the sky.
export function horizonColor(url) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 64, 32); const d = g.getImageData(0, 14, 64, 3).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; res(new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace)); }; img.onerror = rej; img.src = url; });
}
