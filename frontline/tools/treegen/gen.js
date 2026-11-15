import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
window.THREE = THREE;
window.makeTree = (preset, seed, tweak) => { const t = new Tree(); t.loadPreset(preset); t.options.seed = seed; if (tweak) tweak(t.options); t.generate(); t.updateMatrixWorld(true);
  const tri = m => m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3; const box = new THREE.Box3().setFromObject(t);
  return { t, info: { branches: tri(t.branchesMesh), leaves: tri(t.leavesMesh), h: +(box.max.y - box.min.y).toFixed(1), w: +(box.max.x - box.min.x).toFixed(1) } }; };
window.opts = (preset) => { const t = new Tree(); t.loadPreset(preset); return JSON.parse(JSON.stringify(t.options, (k, v) => (v && v.isTexture) ? undefined : v)); };
window.exportGlb = (t) => new Promise((res, rej) => { new GLTFExporter().parse(t, buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); res(btoa(s)); }, rej, { binary: true }); });
