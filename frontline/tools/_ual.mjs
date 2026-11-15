import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder } from 'meshoptimizer'; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }); const doc = await io.read(process.argv[2]);
const r = doc.getRoot(); console.log('anims', r.listAnimations().length, r.listAnimations().map(a => a.getName() + ':' + a.listSamplers()[0]?.getInput().getMax([])[0]?.toFixed(2)).join(' '));
for (const s of r.listSkins()) console.log('skin joints', s.listJoints().length, s.listJoints().map(j => j.getName()).join(','));
console.log('meshes', r.listMeshes().length, 'size tris', r.listMeshes().map(m=>m.listPrimitives().reduce((a,p)=>a+(p.getIndices()?.getCount()??0)/3,0)).join(','));
