// Merges chosen Quaternius Downtown City MegaKit modules into one compressed GLB: one top-level node per module.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, meshopt, textureCompress, mergeDocuments, unpartition, flatten } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [dir, out, list] = process.argv.slice(2), names = list.split(',');
const doc = await io.read(dir + '/' + names[0] + '.gltf');
for (const n of names.slice(1)) mergeDocuments(doc, await io.read(dir + '/' + n + '.gltf'));
const root = doc.getRoot(), scene = root.listScenes()[0];
for (const s of root.listScenes().slice(1)) { for (const c of s.listChildren()) scene.addChild(c); s.dispose(); }
await doc.transform(unpartition(), dedup(), prune({ keepLeaves: true }), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.35, error: 0.006, lockBorder: false }), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 78 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
console.log('nodes', scene.listChildren().map(c => c.getName()).length, 'materials', root.listMaterials().map(m => m.getName()).join(','), 'textures', root.listTextures().length);
