// The Strider: AnyMachine's 30 m "Stilt" walker (MIT, github.com/apekshik/anymachine) cut down for the browser:
// simplified to a few tens of thousands of triangles, textures to 1024 WebP, rig and its three animations kept.
// node tools/buildstrider.mjs <stilt.glb> public/assets/models/strider.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, reorder, quantize, textureCompress, resample } from '@gltf-transform/functions';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [src, dst] = process.argv.slice(2), doc = await io.read(src);
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) if (p.getAttribute('TEXCOORD_1')) p.setAttribute('TEXCOORD_1', null); // second UV set unused in the game
await doc.transform(dedup(), prune({ keepLeaves: true, keepAttributes: true }), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.06, error: 0.03 }), resample({ tolerance: 0.001 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 78 }), // positions stay float: quantizing them moves a transform onto each node, and the walk animation then overwrites it
  reorder({ encoder: MeshoptEncoder, target: 'size' }), quantize({ pattern: /^(NORMAL|TEXCOORD)(_\d+)?$/ }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(dst, doc);
const r = doc.getRoot(); console.log('tris', r.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0), 'anims', r.listAnimations().map(a => a.getName()).join(','));
