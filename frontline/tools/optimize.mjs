// Shrinks Frontline's GLB models: welds and reorders geometry, compresses it with meshopt (EXT_meshopt_compression)
// and re-encodes textures as WebP (alpha kept), capped at a size. Usage: node optimize.mjs <in.glb> <out.glb> [maxTex]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [src, dst, max] = process.argv.slice(2), size = +(max || 1024);
const doc = await io.read(src);
await doc.transform(dedup(), prune({ keepLeaves: true, keepAttributes: true }), weld(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 80 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(dst, doc);
