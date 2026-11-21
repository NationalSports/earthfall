// Photo-scanned rocks and plants from Poly Haven (CC0) for the open map: one variant per file, simplified for the browser,
// textures to WebP. node tools/buildnature.mjs <folder of Poly Haven 1k glTF downloads>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, reorder, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import path from 'path';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
// [output name, source asset, node to keep (null = all), target triangles (null = keep), texture size]
const LIST = [
  ['nat-rock-a', 'rock_07', null, 1400, 1024], ['nat-rock-b', 'rock_09', null, 1200, 1024], ['nat-rock-c', 'namaqualand_boulder_04', null, 1800, 1024], ['nat-cliff', 'rock_face_01', null, 2600, 1024],
  ['nat-moon-a', 'moon_rock_02', null, 900, 1024], ['nat-moon-b', 'moon_rock_03', null, 900, 1024],
  ['nat-shrub-a', 'shrub_02', 'shrub_02_a', null, 1024], ['nat-shrub-b', 'shrub_02', 'shrub_02_c', null, 1024],
  ['nat-scrub-a', 'wild_rooibos_bush', 'wild_rooibos_bush_a', null, 1024], ['nat-scrub-b', 'wild_rooibos_bush', 'wild_rooibos_bush_b', null, 1024], ['nat-weed', 'weed_plant_02', 'weed_plant_02_a_LOD0', null, 512]];
const src = process.argv[2], tris = d => d.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + p.getIndices().getCount() / 3, 0), 0);
for (const [out, asset, keep, target, size] of LIST) {
  const doc = await io.read(path.join(src, asset, asset + '_1k.gltf'));
  if (keep) for (const n of doc.getRoot().listNodes()) { if (n.getName() !== keep && n.getMesh()) n.dispose(); else if (n.getName() === keep) n.setTranslation([0, 0, 0]); }
  for (const m of doc.getRoot().listMaterials()) if (m.getAlphaMode() === 'BLEND') m.setAlphaMode('MASK').setAlphaCutoff(0.5);
  await doc.transform(prune(), dedup(), weld());
  const before = tris(doc); if (target && before > target) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: target / before, error: 0.02 }));
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 80 }), reorder({ encoder: MeshoptEncoder, target: 'size' }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write('public/assets/models/' + out + '.glb', doc); console.log(out, before, '->', tris(doc));
}
