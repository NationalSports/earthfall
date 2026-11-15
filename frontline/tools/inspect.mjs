import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer'; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) { const d = await io.read(f); const r = d.getRoot(); let geo = 0, tex = 0; const tx = r.listTextures().map(t => { const n = t.getImage().byteLength; tex += n; return t.getMimeType().split('/')[1] + ':' + Math.round(n / 1024) + 'k' + (t.getSize() ? '@' + t.getSize()[0] : ''); });
  for (const a of r.listAccessors()) geo += a.getByteLength(); const anim = r.listAnimations().length, skins = r.listSkins().length;
  console.log(f.split('/').pop(), 'geo', Math.round(geo / 1024) + 'k', 'tex', Math.round(tex / 1024) + 'k', tx.join(' '), 'anim', anim, 'skins', skins); }
