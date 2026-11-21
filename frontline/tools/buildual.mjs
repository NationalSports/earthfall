// Cuts the CC0 Quaternius Universal Animation Library down to the clips Frontline uses: skeleton and animation only, no mesh.
// node tools/buildual.mjs <UAL1_Standard.glb> public/assets/models/ual.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, resample, meshopt, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const KEEP = ['A_TPose', 'Idle_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Loop', 'Death01', 'Hit_Chest', 'Hit_Head', 'Roll', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Punch_Cross', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Interact'];
const FINGER = /index|middle|pinky|ring|thumb|leaf/;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [inp, out] = process.argv.slice(2), doc = await io.read(inp), root = doc.getRoot();
for (const a of root.listAnimations()) { if (!KEEP.includes(a.getName())) { a.dispose(); continue; }
  for (const c of a.listChannels()) { const n = c.getTargetNode(); if (!n || FINGER.test(n.getName()) || (c.getTargetPath() === 'scale') || (c.getTargetPath() === 'translation' && n.getName() !== 'pelvis' && n.getName() !== 'root')) { const s = c.getSampler(); c.dispose(); if (s && !s.listParents().some(p => p.propertyType === 'AnimationChannel')) s.dispose(); } } }
for (const n of root.listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); n.setSkin(null); }
for (const s of root.listSkins()) s.dispose();
for (const t of root.listTextures()) t.dispose(); for (const m of root.listMaterials()) m.dispose();
for (const a of root.listAccessors()) if (a.listParents().every(p => p === root)) a.dispose();
await doc.transform(resample({ tolerance: 0.0005 }), prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
{ const used = new Set(); for (const a of root.listAnimations()) for (const s of a.listSamplers()) { used.add(s.getInput()); used.add(s.getOutput()); } for (const a of root.listAccessors()) if (!used.has(a)) a.dispose(); }
await io.write(out, doc);
console.log('clips', root.listAnimations().map(a => a.getName()).join(','), 'nodes', root.listNodes().length);
