// Earthfall: Frontline. Third-person horde shooter with tower defense and orbital call-ins.
// Hold the city core against the swarm. Built from simple three.js shapes; art from frontline/assets plugs in when present.
import * as THREE from 'three';
import { createRenderer, createComposer, makeTextures, buildSky, scatter, createParticles, createDecals } from './gfx.js';
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ASSETS = window.FRONTLINE_ASSETS || {}; // name -> data URI, filled in by build.js from frontline/assets

  // ---------- Worlds: the same battle rules on different ground
  const WORLDS = {
    la: { name: 'Los Angeles', sub: 'Earth · the edge of the city', sky: 0x6b86a3, sun: 0xffd9a8, hemi: 0x9fc4e8, g0: [0.16, 0.19, 0.23], g1: [0.02, 0.07, -0.07], hill: 1, city: true },
    kepler: { name: 'Kepler Ridge', sub: 'Off-world · crystal highlands', sky: 0x3b2450, sun: 0xffb0e0, hemi: 0xb08cff, g0: [0.22, 0.14, 0.2], g1: [0.1, -0.02, 0.06], hill: 1.7, city: false },
    ceres: { name: 'Ceres Station', sub: 'Off-world · mining flats', sky: 0x0e1420, sun: 0xcfe4ff, hemi: 0x6f8fb8, g0: [0.2, 0.2, 0.22], g1: [0.03, 0.02, 0.0], hill: 0.55, city: true } };

  // ---------- Setup handed over by Earthfall (or chosen on the menu)
  const SETUP = Object.assign({ world: 'la', city: null, mode: 'defense', attackers: 9, defenders: 5, armor: 0, fort: 1, battery: 1, radar: 1, research: [], leader: null }, window.FRONTLINE_SETUP || {});
  const has = k => SETUP.research.indexOf(k) >= 0;
  let W = WORLDS[SETUP.world] || WORLDS.la;

  // ---------- Sound: a tiny synth, no files
  const SFX = (() => { let ac = null; const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } return ac; };
    function noise(d, f, g, type) { const a = ctx(); if (!a) return; const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = a.createBufferSource(); s.buffer = b; const fl = a.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = f; const gn = a.createGain(); gn.gain.value = g; s.connect(fl); fl.connect(gn); gn.connect(a.destination); s.start(); }
    function tone(f0, f1, d, g, type) { const a = ctx(); if (!a) return; const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + d); gn.gain.setValueAtTime(g, a.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d); o.connect(gn); gn.connect(a.destination); o.start(); o.stop(a.currentTime + d); }
    return { shot: () => noise(0.09, 2600, 0.22), rail: () => { tone(1400, 120, 0.35, 0.25, 'sawtooth'); noise(0.2, 5000, 0.2, 'highpass'); }, turret: () => noise(0.06, 1800, 0.07), boom: () => { noise(0.9, 420, 0.7); tone(110, 30, 0.7, 0.5); }, hit: () => tone(240, 90, 0.12, 0.2, 'square'), call: () => tone(520, 1040, 0.25, 0.15), build: () => tone(300, 600, 0.12, 0.15, 'triangle'), deny: () => tone(160, 110, 0.15, 0.15, 'square'), wave: () => tone(220, 330, 0.5, 0.2, 'sawtooth'), win: () => tone(440, 880, 0.6, 0.2), lose: () => tone(300, 60, 1.0, 0.3, 'sawtooth'), unlock: () => { const a = ctx(); if (a && a.state === 'suspended') a.resume(); } }; })();

  // ---------- Renderer, scene, post-processing
  const renderer = createRenderer($('#game')), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900), post = createComposer(renderer, scene, camera);
  let TEX = makeTextures(SETUP.world), particles = createParticles(scene, TEX), decals = null, skyCtl = null, shake = 0, recoil = 0, hurtT = 0, gtime = 0;
  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h); post.resize(w, h); particles.setScale(h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0.08 }, o || {}));
  const metal = (c, o) => mat(c, Object.assign({ roughness: 0.55, metalness: 0.7, roughnessMap: TEX.plate, bumpMap: TEX.plate, bumpScale: 0.6 }, o || {}));
  const shell = (c, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.2, bumpMap: TEX.chitin, bumpScale: 0.8 }, o || {}));
  const tex = name => { if (!ASSETS[name]) return null; const t = new THREE.TextureLoader().load(ASSETS[name]); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const M = { win: mat(0x0f1a26, { emissive: 0x2b6f8a, emissiveIntensity: 0.6 }), crystal: mat(0x8a5cff, { emissive: 0x5a2cd0, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.2 }),
    armor: metal(0x2e969c), armorD: metal(0x17474d, { roughness: 0.6 }), ally: metal(0x4f6f8f), visor: mat(0xe8be60, { emissive: 0xffb020, emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.8 }), under: mat(0x1b2128, { roughness: 0.9 }), strip: mat(0x46d6d0, { emissive: 0x46d6d0, emissiveIntensity: 2.4 }),
    gun: metal(0x20252b, { metalness: 0.85, roughness: 0.4 }), wall: mat(0xb0a898, { map: TEX.concrete, bumpMap: TEX.concrete, bumpScale: 0.5, roughness: 0.95 }), wallD: mat(0x6a655c, { map: TEX.concrete, roughness: 0.95 }),
    bug: shell(0x6a2a78), bugD: shell(0x2e1034, { roughness: 0.4 }), bugGlow: mat(0xff4a6a, { emissive: 0xff2a50, emissiveIntensity: 3.2 }), acid: mat(0xa8ff4a, { emissive: 0x8cff30, emissiveIntensity: 2.8 }), plate: shell(0x22122a, { metalness: 0.6 }),
    core: mat(0x46d6d0, { emissive: 0x38d8d0, emissiveIntensity: 2.6 }), pod: metal(0x8a929c), crate: metal(0x3f6a4a, { metalness: 0.4 }) };
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x || 0, y || 0, z || 0); b.castShadow = b.receiveShadow = true; return b; };
  const cyl = (r1, r2, h, m, x, y, z, seg) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 10), m); b.position.set(x || 0, y || 0, z || 0); b.castShadow = b.receiveShadow = true; return b; };
  const ball = (r, m, x, y, z, sx, sy, sz) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), m); b.position.set(x || 0, y || 0, z || 0); b.scale.set(sx || 1, sy || 1, sz || 1); b.castShadow = true; return b; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- Arena (rebuilt for each battle)
  const ARENA = 125, CORE = { x: 0, z: 46, hp: 100, max: 100 }; let solids = [], world = null;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function H(x, z) { const d = Math.hypot(x - CORE.x, z - CORE.z), k = smooth(20, 52, d) * W.hill; return k * (Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05 - 0.4) * 4.2 + Math.sin(x * 0.11 + z * 0.07) * 1.5 + Math.cos(z * 0.021 + x * 0.013) * 3.2 + 2.2 * smooth(60, 110, d)); }
  function addSolid(x, z, w, d, ref) { const s = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, ref }; solids.push(s); return s; }
  function buildWorld() { if (world) scene.remove(world); world = new THREE.Group(); scene.add(world); solids = [];
    scene.environment = null; skyCtl = buildSky(renderer, scene, world, SETUP.world, post.grade); const skyT = tex('sky-' + SETUP.world) || tex('sky'); if (skyT) { skyT.mapping = THREE.EquirectangularReflectionMapping; scene.background = skyT; }
    const geo = new THREE.PlaneGeometry(ARENA * 2, ARENA * 2, 180, 180); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position, col = new Float32Array(p.count * 3), uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = H(x, z); p.setY(i, h); const t = smooth(14, 44, Math.hypot(x - CORE.x, z - CORE.z)), v = clamp(0.62 + t * 0.3 + h * 0.022, 0.4, 1.25); col[i * 3] = v * (1 - (1 - t) * 0.12); col[i * 3 + 1] = v * (1 - (1 - t) * 0.1); col[i * 3 + 2] = v; uv.setXY(i, x / 5.5, z / 5.5); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); const gt = tex('ground-' + SETUP.world) || tex('ground'); if (gt) { gt.wrapS = gt.wrapT = THREE.RepeatWrapping; }
    const g = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: gt || TEX.ground, bumpMap: TEX.groundBump, bumpScale: 1.4, roughness: 0.96, metalness: 0 })); g.receiveShadow = true; world.add(g);
    const facade = tex('facade');
    const building = (x, z, w, d, h) => { const y0 = H(x, z) - 1.5; if (W.city) { const fm = (facade || TEX.facade).clone(), fg = TEX.facadeGlow.clone(); for (const t of [fm, fg]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 9))); t.needsUpdate = true; }
        world.add(box(w, h, d, new THREE.MeshStandardMaterial({ map: fm, emissiveMap: facade ? null : fg, emissive: facade ? 0x000000 : 0xffffff, emissiveIntensity: 1.5, roughness: 0.82, metalness: 0.1 }), x, y0 + h / 2, z));
        world.add(box(w + 0.5, 0.5, d + 0.5, M.wallD, x, y0 + h + 0.25, z)); world.add(box(w * 0.28, 1.1, d * 0.3, M.gun, x - w * 0.2, y0 + h + 1.0, z + d * 0.12)); world.add(box(w * 0.16, 0.7, d * 0.2, M.wallD, x + w * 0.24, y0 + h + 0.8, z - d * 0.2)); world.add(cyl(0.05, 0.07, 4.5, M.gun, x + w * 0.3, y0 + h + 2.7, z + d * 0.3, 5)); world.add(box(1.6, 1.0, 0.5, M.wallD, x, y0 + 2.0, z - d / 2 - 0.3)); }
      else { for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * (0.5 - k * 0.09), h * (1.7 - k * 0.32), 5), M.crystal); sp.position.set(x + Math.sin(k * 2.1) * w * 0.3 * (k ? 1 : 0), y0 + h * (0.85 - k * 0.16), z + Math.cos(k * 2.1) * d * 0.3 * (k ? 1 : 0)); sp.rotation.set(Math.sin(x + k) * 0.22, x + k, Math.cos(z + k) * 0.22); sp.castShadow = true; world.add(sp); } const cl = new THREE.PointLight(0x9a6cff, 30, 26, 2); cl.position.set(x, y0 + h * 0.8, z); world.add(cl); }
      addSolid(x, z, w, d); };
    for (const x of [-52, -34, 34, 52]) { building(x, 62, 14, 12, 10 + Math.abs(x % 9)); building(x, 44 - Math.abs(x) * 0.1, 12, 12, 8 + Math.abs((x * 3) % 7)); }
    building(-16, 70, 14, 10, 14); building(16, 70, 14, 10, 12); building(-30, 6, 9, 9, 5); building(26, -4, 10, 8, 6); building(2, -22, 9, 9, 4); building(-58, -10, 8, 10, 5); building(60, 8, 9, 8, 5);
    scatter(world, SETUP.world, H, ARENA, (x, z) => Math.hypot(x - CORE.x, z - CORE.z) < 27 || solids.some(q => x > q.x0 - 1.5 && x < q.x1 + 1.5 && z > q.z0 - 1.5 && z < q.z1 + 1.5), TEX); decals = createDecals(world, TEX, H);
    const cg = new THREE.Group(); cg.add(cyl(4, 4.6, 1, M.armorD, 0, 0.5, 0, 16)); const orb = new THREE.Mesh(new THREE.OctahedronGeometry(2.1, 0), M.core); orb.position.y = 4; orb.castShadow = true; cg.add(orb); cg.add(cyl(0.35, 0.35, 3, M.gun, 0, 2.2, 0)); const pl = new THREE.PointLight(0x46d6d0, 90, 46, 2); pl.position.y = 4; cg.add(pl); cg.position.set(CORE.x, 0, CORE.z); world.add(cg); CORE.orb = orb; CORE.light = pl; addSolid(CORE.x, CORE.z, 8, 8); }

  // ---------- Models
  function soldier(main, accent) { const g = new THREE.Group(), A = main || M.armor, D = accent || M.armorD;
    const legL = new THREE.Group(), legR = new THREE.Group(); for (const pr of [[legL, -0.19], [legR, 0.19]]) { const L = pr[0]; L.add(box(0.26, 0.5, 0.3, M.under, 0, -0.25, 0)); L.add(box(0.3, 0.42, 0.34, D, 0, -0.62, 0.02)); L.add(box(0.3, 0.14, 0.44, A, 0, -0.86, -0.05)); L.position.set(pr[1], 0.93, 0); g.add(L); }
    g.add(box(0.5, 0.3, 0.34, M.under, 0, 1.05, 0)); g.add(box(0.78, 0.5, 0.46, A, 0, 1.42, 0)); g.add(box(0.5, 0.26, 0.1, D, 0, 1.46, -0.25)); g.add(box(0.3, 0.05, 0.03, M.strip, 0, 1.5, -0.31)); g.add(box(0.06, 0.3, 0.03, M.strip, 0, 1.4, 0.45)); g.add(box(0.56, 0.56, 0.24, D, 0, 1.4, 0.32));
    for (const sx of [-0.5, 0.5]) { g.add(box(0.3, 0.2, 0.42, A, sx, 1.66, 0)); g.add(box(0.2, 0.5, 0.24, M.under, sx, 1.3, 0)); }
    const head = new THREE.Group(); head.add(box(0.4, 0.4, 0.44, A, 0, 0, 0)); head.add(box(0.34, 0.16, 0.06, M.visor, 0, 0.02, -0.23)); head.add(box(0.1, 0.1, 0.5, D, 0, 0.22, 0)); head.position.y = 1.95; g.add(head);
    const gun = new THREE.Group(); gun.add(box(0.11, 0.16, 0.9, M.gun, 0, 0, -0.35)); gun.add(box(0.07, 0.07, 0.4, M.gun, 0, 0.03, -0.95)); gun.add(box(0.08, 0.24, 0.12, M.gun, 0, -0.16, -0.1)); gun.add(box(0.09, 0.05, 0.3, A, 0, 0.11, -0.3)); gun.position.set(0.32, 1.35, -0.25); g.add(gun);
    g.userData = { legL, legR, gun, head }; return g; }
  function bugModel(kind) { const g = new THREE.Group(), legs = [];
    const leg = (x, z, s) => { const l = box(0.1 * s, 0.75 * s, 0.1 * s, M.bugD, x, 0.36 * s, z); l.rotation.z = x > 0 ? -0.55 : 0.55; legs.push(l); g.add(l); };
    if (kind === 'swarm') { g.add(ball(0.55, M.bug, 0, 0.7, 0, 1, 0.7, 1.4)); const h = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 6), M.bugD); h.rotation.x = Math.PI / 2; h.position.set(0, 0.75, 0.85); g.add(h); g.add(ball(0.12, M.bugGlow, 0, 0.92, 0.95)); for (const x of [-0.5, 0.5]) for (const z of [0.35, -0.35]) leg(x, z, 1); }
    else if (kind === 'spitter') { g.add(ball(0.5, M.bug, 0, 1.5, 0, 0.9, 1.5, 0.9)); g.add(ball(0.42, M.acid, 0, 1.2, -0.45, 1, 1.1, 1)); const h = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 6), M.bugD); h.rotation.x = Math.PI / 2; h.position.set(0, 2.1, 0.5); g.add(h); g.add(ball(0.1, M.acid, 0, 2.15, 0.95)); for (const x of [-0.45, 0.45]) for (const z of [0.3, -0.3]) leg(x, z, 1.5); }
    else { g.add(ball(1.15, M.bug, 0, 1.5, -0.1, 1, 0.9, 1.25)); for (let i = 0; i < 4; i++) { const pl = box(1.7 - i * 0.25, 0.22, 0.6, M.plate, 0, 2.25 - i * 0.12, -0.9 + i * 0.55); pl.rotation.x = -0.25 + i * 0.12; g.add(pl); } g.add(box(0.8, 0.6, 0.8, M.bugD, 0, 1.25, 1.25)); g.add(ball(0.13, M.bugGlow, -0.22, 1.4, 1.66)); g.add(ball(0.13, M.bugGlow, 0.22, 1.4, 1.66));
      for (const x of [-1.05, 1.05]) for (const z of [0.6, -0.6]) leg(x, z, 2.1); if (kind === 'boss') { for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 5), M.bugGlow); sp.position.set((i - 2) * 0.35, 2.9, -0.2 + Math.abs(i - 2) * 0.12); g.add(sp); } g.scale.setScalar(1.7); } }
    g.userData = { legs }; return g; }
  function hiveModel() { const g = new THREE.Group(); g.add(ball(3, M.bugD, 0, 1.6, 0, 1.15, 0.8, 1.15)); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.7, 5 + (i % 3), 6), M.bug); sp.position.set(Math.cos(i * 1.05) * 2.1, 3.2, Math.sin(i * 1.05) * 2.1); sp.rotation.set(Math.sin(i * 1.05) * 0.35, 0, -Math.cos(i * 1.05) * 0.35); sp.castShadow = true; g.add(sp); } const glow = ball(1.1, M.bugGlow, 0, 3.4, 0); g.add(glow); const l = new THREE.PointLight(0xff3060, 110, 40, 2); l.position.y = 4; g.add(l); g.userData = { legs: [], glow }; return g; }
  function cacheModel() { const g = new THREE.Group(); g.add(box(1.3, 0.8, 0.9, M.pod, 0, 0.4, 0)); g.add(box(1.34, 0.12, 0.94, M.visor, 0, 0.62, 0)); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 26, 6), new THREE.MeshBasicMaterial({ color: 0xe8be60, transparent: true, opacity: 0.45 })); b.position.y = 13; g.add(b); return g; }
  function turretModel() { const g = new THREE.Group(); g.add(cyl(0.9, 1.15, 0.7, M.gun, 0, 0.35, 0, 8)); g.add(cyl(0.5, 0.5, 0.3, M.armorD, 0, 0.82, 0, 8)); const top = new THREE.Group(); top.add(box(0.95, 0.6, 1.05, M.armor, 0, 0, 0)); top.add(box(0.5, 0.2, 0.3, M.visor, 0, 0.12, -0.5)); for (const x of [-0.22, 0.22]) { const b = cyl(0.09, 0.09, 1.6, M.gun, x, 0, -1.0, 6); b.rotation.x = Math.PI / 2; top.add(b); } top.position.y = 1.25; g.add(top); g.userData = { top }; return g; }
  function wallModel() { const g = new THREE.Group(); g.add(box(4.2, 1.2, 0.8, M.wall, 0, 0.6, 0)); g.add(box(4.4, 0.18, 0.95, M.wallD, 0, 1.24, 0)); for (const x of [-1.6, 0, 1.6]) g.add(box(0.2, 1.3, 0.9, M.wallD, x, 0.65, 0)); return g; }
  function mineModel() { const g = new THREE.Group(); g.add(cyl(0.55, 0.65, 0.18, M.gun, 0, 0.09, 0, 10)); g.add(ball(0.14, M.bugGlow, 0, 0.24, 0)); return g; }
  function podModel() { const g = new THREE.Group(); g.add(cyl(0.9, 0.5, 3.2, M.pod, 0, 1.6, 0, 8)); g.add(cyl(0.2, 0.9, 0.9, M.armorD, 0, 3.6, 0, 8)); for (let i = 0; i < 4; i++) { const f = box(0.08, 1.2, 0.7, M.armor, Math.cos(i * 1.57) * 0.85, 2.7, Math.sin(i * 1.57) * 0.85); f.rotation.y = -i * 1.57; g.add(f); } return g; }

  // ---------- Battle state
  let player = null, turrets = [], walls = [], mines = [], allies = [], enemies = [], shots = [], fx = [], pending = [], pods = [], wave = 0, toSpawn = [], spawnT = 0, phaseT = 0, state = 'menu', kills = 0, scrap = 0, WAVES = [], bannerT = 0, actors = null;
  const ARC = 110 * Math.PI / 180;
  const WEAPONS = [{ name: 'Rifle', mag: 30, rate: 0.105, dmg: 1, reload: 1.3 }, { name: 'Rail rifle', mag: 5, rate: 0.85, dmg: 9, reload: 2.0, rail: true }];
  const KIND = { swarm: { hp: 3, sp: [5.2, 6.6], dmg: 7, core: 1.5, r: 0.8, y: 0.75, scrap: 2 }, spitter: { hp: 5, sp: [3.8, 4.6], dmg: 0, core: 0, r: 0.8, y: 1.5, scrap: 4, range: 30 }, brute: { hp: 26, sp: [3.0, 3.5], dmg: 18, core: 6, r: 1.5, y: 1.5, scrap: 10 }, boss: { hp: 150, sp: [2.4, 2.6], dmg: 30, core: 12, r: 2.4, y: 2.4, scrap: 40 }, hive: { hp: 70, sp: [0, 0], dmg: 0, core: 0, r: 3.2, y: 2.6, scrap: 40 } };
  let caches = [], research = 0, hivesDown = 0, order = 'defend', holdPt = null; const assault = () => SETUP.mode === 'assault', foes = () => enemies.filter(e => e.kind !== 'hive').length, hives = () => enemies.filter(e => e.kind === 'hive').length;
  const ORDERS = { defend: 'holding the wall', follow: 'following you', hold: 'holding the marked spot' };
  const CALLS = [
    { key: 'Digit1', name: 'Orbital strike', cd: 22, delay: 2.2, col: 0xff7040, kind: 'strike', t: 0 },
    { key: 'Digit2', name: 'Turret', cost: 40, delay: 1.8, col: 0x46d6d0, kind: 'turret', t: 0 },
    { key: 'Digit3', name: 'Wall', cost: 15, delay: 0, col: 0xcfc6b4, kind: 'wall', t: 0 },
    { key: 'Digit4', name: 'Mine', cost: 12, delay: 0, col: 0xff4a6a, kind: 'mine', t: 0 },
    { key: 'Digit5', name: 'Supply drop', cd: 40, delay: 2.0, col: 0x7fe3a0, kind: 'supply', t: 0 },
    { key: 'Digit6', name: 'Airstrike run', cd: 45, delay: 2.6, col: 0xffd060, kind: 'air', need: 'bombers', t: 0 },
    { key: 'Digit7', name: 'Squad drop', cost: 50, delay: 2.0, col: 0x7f9fc0, kind: 'squad', t: 0 }];

  function addTurret(x, z) { const m = turretModel(); m.position.set(x, H(x, z), z); actors.add(m); const t = { x, z, m, t: 0, yaw: 0, hp: has('hardened') ? 45 : 30, kind: 'turret' }; t.solid = addSolid(x, z, 2, 2, t); turrets.push(t); return t; }
  function addWall(x, z, rot) { const m = wallModel(); m.position.set(x, H(x, z), z); m.rotation.y = rot || 0; actors.add(m); const w = { x, z, m, hp: has('hardened') ? 60 : 40, kind: 'wall' }, wide = Math.abs(Math.cos(rot || 0)) > 0.7; w.solid = addSolid(x, z, wide ? 4 : 1.4, wide ? 1.4 : 4, w); walls.push(w); return w; }
  function removeStruct(s) { actors.remove(s.m); const i = solids.indexOf(s.solid); if (i >= 0) solids.splice(i, 1); const L = s.kind === 'turret' ? turrets : walls, j = L.indexOf(s); if (j >= 0) L.splice(j, 1); boom(s.x, s.z, 5, 0, 0xffa040); }
  function reset() { W = WORLDS[SETUP.world] || WORLDS.la; if (actors) scene.remove(actors); for (const f of fx) scene.remove(f.o); for (const p of pending) { scene.remove(p.beam); scene.remove(p.ring); } actors = new THREE.Group(); scene.add(actors); TEX = makeTextures(SETUP.world); particles.clear(); for (const f of flashes) { f.t = 0; f.l.intensity = 0; } buildWorld();
    CORE.hp = CORE.max = 100; turrets = []; walls = []; mines = []; allies = []; enemies = []; shots = []; fx = []; pending = []; pods = []; wave = 0; toSpawn = []; kills = 0; scrap = 60 + 20 * (SETUP.fort || 0);
    WAVES = [3, 4.5, 6, 7.5, 9].map(f => Math.max(10, Math.round(SETUP.attackers * f))); for (const c of CALLS) c.t = 0;
    const hp = has('exo') ? 150 : 100; player = { x: 7, z: 36, y: 0, yaw: 0, pitch: -0.12, hp, max: hp, w: 0, ammo: [WEAPONS[0].mag, WEAPONS[1].mag], reload: 0, fireT: 0, nadeT: 0, mesh: soldier(), walk: 0, dead: false, lives: Math.max(0, Math.min(3, Math.floor(SETUP.defenders / 3))) }; actors.add(player.mesh);
    const at = (a, r) => { const ar = a * Math.PI / 180; return [CORE.x + Math.sin(ar) * r, CORE.z - Math.cos(ar) * r, ar]; };
    const T = (a, r) => { const q = at(a, r); addTurret(q[0], q[1]); };
    if (SETUP.battery) T(-38, 14); if (SETUP.fort) T(38, 14); if (SETUP.fort > 1) T(0, 15); if (SETUP.battery > 1) T(-72, 13); for (let i = 0; i < Math.min(2, SETUP.armor || 0); i++) T(i ? 62 : -62, 20);
    for (let a = -60; a <= 60; a += 24) { const q = at(a, a % 48 === 0 ? 24 : 18); addWall(q[0], q[1], -q[2]); }
    caches = []; research = 0; hivesDown = 0; order = assault() ? 'follow' : 'defend'; holdPt = null; CORE.orb.parent.visible = !assault();
    for (const a of [-44, 9, 46]) { const ar = a * Math.PI / 180, r = 88 + Math.abs(a) * 0.1, x = clamp(CORE.x + Math.sin(ar) * r, -ARENA + 8, ARENA - 8), z = Math.max(-ARENA + 8, CORE.z - Math.cos(ar) * r), m = hiveModel(); m.position.set(x, H(x, z), z); actors.add(m); enemies.push({ kind: 'hive', k: KIND.hive, x, z, hp: KIND.hive.hp, sp: 0, m, t: 0, bite: 0, brood: rnd(2, 6) }); }
    for (const q of [[-62, 20], [48, -18], [-20, -40], [70, 34], [8, -64]]) { const m = cacheModel(); m.position.set(q[0], H(q[0], q[1]), q[1]); actors.add(m); caches.push({ x: q[0], z: q[1], m }); }
    const na = Math.min(6, SETUP.defenders || 0); for (let i = 0; i < na; i++) { const q = at(na > 1 ? -55 + i * (110 / (na - 1)) : 0, 20.5); addAlly(q[0], q[1]); } }
  // Your squad: soldiers who fight on their own and take three orders (Z follow, X hold a spot, C back to the wall).
  function addAlly(x, z) { const m = soldier(M.ally, M.armorD); m.position.set(x, H(x, z), z); actors.add(m); const a = { x, z, hx: x, hz: z, hp: has('hardened') ? 45 : 30, m, t: rnd(0, 0.5), walk: 0 }; allies.push(a); return a; }
  function setOrder(o) { if (!player || player.dead || !allies.length) return; if (o === 'hold') { const g = groundAim(120); if (!g) { banner('Squad', 'Aim at the ground to mark where they should hold.'); return; } holdPt = g; } order = o; SFX.call(); banner('Squad: ' + ORDERS[o], allies.length + ' soldiers'); }

  // ---------- Effects and damage
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, toneMapped: false });
  function tracer(a, b, col, dur) { const m = tracerMat.clone(); m.color.set(col || 0xffe9a0).multiplyScalar(3); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), m); scene.add(l); fx.push({ o: l, t: 0, d: dur || 0.07 }); }
  function puff(p, col, s) { s = s || 3; particles.emit(p.x, p.y, p.z, { n: Math.round(5 + s * 1.6), color: col, speed: 2.5 + s * 0.7, life: 0.4, size: 0.2 + s * 0.03, size1: 0.04, gravity: 7, bright: 1.4 }); }
  // A pool of flash lights for explosions and muzzle flashes.
  const flashes = []; for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xffa050, 0, 60, 2); scene.add(l); flashes.push({ l, t: 0, d: 1, i0: 0 }); } let flashI = 0;
  function flash(x, y, z, col, power, dur) { const f = flashes[flashI]; flashI = (flashI + 1) % flashes.length; f.l.color.set(col); f.l.position.set(x, y, z); f.l.distance = 20 + power * 0.25; f.i0 = power; f.t = f.d = dur; }
  function boom(x, z, r, dmg, col, selfDmg) { const y = H(x, z), c = col || 0xff6030; SFX.boom();
    particles.emit(x, y + 0.8, z, { n: Math.round(26 + r * 7), color: 0xffd9a0, speed: r * 1.5, life: 0.55, size: r * 0.34, size1: r * 0.08, gravity: 1.5, drag: 2.2, bright: 1.5, alpha: 0.7, spread: r * 0.4 });
    particles.emit(x, y + 0.6, z, { n: Math.round(22 + r * 6), color: c, speed: r * 1.1, life: 0.8, size: r * 0.4, size1: r * 0.14, gravity: -1.2, drag: 1.8, bright: 1.1, alpha: 0.55, spread: r * 0.5 });
    particles.emit(x, y + 0.5, z, { n: Math.round(30 + r * 9), color: 0xffe9b0, speed: r * 4.2, life: 0.9, size: 0.14, size1: 0.03, gravity: 16, bright: 2.5 });
    particles.emit(x, y + 1.2, z, { n: Math.round(10 + r * 3), color: 0x554a44, speed: r * 0.5, life: 2.4, size: r * 0.5, size1: r * 1.1, gravity: -1.6, drag: 0.8, alpha: 0.12, spread: r * 0.6 });
    flash(x, y + 2.5, z, c, 60 + r * 45, 0.4); if (decals) decals.add(x, z, r * 0.75); if (player) shake = Math.min(1.2, shake + r * 0.9 / Math.max(6, Math.hypot(player.x - x, player.z - z)));
    if (dmg) for (const e of enemies.slice()) { const d = Math.hypot(e.x - x, e.z - z); if (d < r) hurtEnemy(e, d < r * 0.6 ? dmg : dmg * 0.4); }
    if (selfDmg && player && !player.dead && Math.hypot(player.x - x, player.z - z) < r * 0.8) hurtPlayer(selfDmg); }
  function hurtPlayer(d) { if (player.dead || state === 'over') return; player.hp -= d; hurtT = 1; shake = Math.min(1.2, shake + 0.25); SFX.hit(); hud.hit.classList.add('on'); setTimeout(() => hud.hit.classList.remove('on'), 140);
    if (player.hp <= 0) { if (player.lives > 0) { player.lives--; player.hp = player.max; player.x = CORE.x + 6; player.z = CORE.z - 8; banner('You went down', 'A reinforcement drops in. ' + player.lives + ' left.'); dropPod(player.x, player.z, null); } else { player.dead = true; player.mesh.rotation.z = Math.PI / 2; setTimeout(() => finish(false), 900); } } }
  function hurtAlly(a, d) { a.hp -= d; puff(V(a.x, H(a.x, a.z) + 1.3, a.z), 0xffb39f, 2); if (a.hp <= 0) { actors.remove(a.m); const i = allies.indexOf(a); if (i >= 0) allies.splice(i, 1); } }
  function hurtEnemy(e, dmg, at) { if (e.hp <= 0) return; if (e.kind === 'hive') dmg = Math.min(dmg, 24); e.hp -= dmg; puff(at || V(e.x, H(e.x, e.z) + e.k.y, e.z), 0xff6a8a, 2.5); if (e.hp <= 0) { actors.remove(e.m); const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1); kills++; scrap += e.k.scrap; { const gy = H(e.x, e.z) + e.k.y * 0.7; particles.emit(e.x, gy, e.z, { n: Math.round(14 + e.k.r * 14), color: 0xb04adf, speed: 5 + e.k.r * 2, life: 0.7, size: 0.24 + e.k.r * 0.1, size1: 0.04, gravity: 14, bright: 1.4 }); particles.emit(e.x, gy, e.z, { n: 6, color: e.kind === 'spitter' ? 0xa8ff4a : 0xff4a6a, speed: 3, life: 0.5, size: 0.36, gravity: 4, bright: 1.8 }); if (decals && Math.random() < 0.3) decals.add(e.x, e.z, e.k.r * 1.1); } if (e.kind === 'boss') { boom(e.x, e.z, 9, 0, 0xb04adf); banner('The Warlord is down', 'Finish the rest.'); } if (e.kind === 'hive') { hivesDown++; boom(e.x, e.z, 11, 0, 0xb04adf); banner('Hive destroyed', assault() ? hives() + ' left.' : 'Fewer of the swarm will come. +40 scrap.'); toSpawn.splice(0, Math.floor(toSpawn.length * 0.2)); if (assault() && !hives()) setTimeout(() => finish(true), 1200); } } }
  function dropPod(x, z, then) { const m = podModel(); m.position.set(x, H(x, z) + 90, z); actors.add(m); pods.push({ m, x, z, t: 0, then }); }

  // ---------- Spawning and waves
  function spawn(kind) { const a = rnd(-ARC / 2, ARC / 2), r = rnd(96, 112), k = KIND[kind], m = bugModel(kind); const e = { kind, k, x: clamp(CORE.x + Math.sin(a) * r, -ARENA + 4, ARENA - 4), z: Math.max(-ARENA + 4, CORE.z - Math.cos(a) * r), hp: k.hp, sp: rnd(k.sp[0], k.sp[1]), m, t: rnd(0, 6), bite: 0, drift: rnd(-1, 1), fire: rnd(1, 3), brood: 4 };
    m.position.set(e.x, H(e.x, e.z), e.z); actors.add(m); enemies.push(e); if (kind === 'boss') banner('A Warlord has taken the field', 'Bring it down. It calls more of the swarm.'); return e; }
  function startWave() { if (assault()) { wave = 1; toSpawn = []; state = 'wave'; SFX.wave(); banner('Assault', 'Push out and destroy all three hives. Gold beacons mark research caches.'); return; }
    wave++; const n = Math.round(WAVES[wave - 1] * (1 - 0.12 * hivesDown)), list = []; for (let i = 0; i < n; i++) { const r = Math.random(); list.push(wave >= 3 && r < 0.05 + wave * 0.01 ? 'brute' : wave >= 2 && r < 0.2 ? 'spitter' : 'swarm'); } if (wave === WAVES.length) list.splice(Math.floor(list.length / 3), 0, 'boss');
    toSpawn = list; spawnT = 0; state = 'wave'; SFX.wave(); banner('Wave ' + wave + ' of ' + WAVES.length, n + ' coming over the hills' + (wave === WAVES.length ? ', led by a Warlord' : '')); }

  // ---------- Input
  const keys = {}; let firing = false, locked = false; const cv = renderer.domElement;
  window.addEventListener('keydown', e => { if (state === 'menu' || state === 'over') return; keys[e.code] = true; if (e.code === 'KeyZ') setOrder('follow'); if (e.code === 'KeyX') setOrder('hold'); if (e.code === 'KeyC') setOrder('defend'); if (e.code === 'KeyR') reload(); if (e.code === 'KeyQ') swap(); if (e.code === 'KeyG') grenade(); if (e.code === 'Enter' && state === 'prep') phaseT = 0; const ci = CALLS.findIndex(c => c.key === e.code); if (ci >= 0) callIn(ci); if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault(); });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  cv.addEventListener('mousedown', e => { if (state === 'menu' || state === 'over') return; SFX.unlock(); if (e.button === 0) firing = true; if (!locked && cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (err) { /* some frames forbid it; mouse-move still aims */ } } });
  window.addEventListener('mouseup', () => { firing = false; });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; });
  window.addEventListener('mousemove', e => { if (state === 'menu' || state === 'over' || !player) return; player.yaw -= (e.movementX || 0) * 0.0026; player.pitch = clamp(player.pitch - (e.movementY || 0) * 0.002, -0.7, 0.45); });
  function reload() { const w = WEAPONS[player.w]; if (player.reload > 0 || player.ammo[player.w] === w.mag || player.dead) return; player.reload = w.reload * (has('elite') ? 0.6 : 1); }
  function swap() { if (!has('railgun')) { banner('Rail rifle', 'Research Railgun Batteries in Earthfall to unlock it.'); return; } player.w = 1 - player.w; player.reload = 0; player.fireT = 0.25; }

  // ---------- Aiming, shooting, grenades
  const ray = new THREE.Raycaster(), v3 = new THREE.Vector3(), muzzle = new THREE.Vector3();
  function groundAim(maxD) { ray.setFromCamera({ x: 0, y: 0 }, camera); const o = ray.ray.origin, d = ray.ray.direction; for (let t = 3; t < (maxD || 160); t += 1.5) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= H(x, z)) return { x: clamp(x, -ARENA + 3, ARENA - 3), z: clamp(z, -ARENA + 3, ARENA - 3), t }; } return null; }
  function shoot() { const w = WEAPONS[player.w]; if (player.reload > 0 || player.dead) return; if (player.ammo[player.w] < 1) { reload(); return; } player.ammo[player.w]--; player.fireT = w.rate; (w.rail ? SFX.rail : SFX.shot)();
    const g = groundAim(170), end = g ? g.t + 1.5 : 170; ray.setFromCamera({ x: 0, y: 0 }, camera); const o = ray.ray.origin.clone(), d = ray.ray.direction.clone(), hits = [];
    for (const e of enemies) { v3.set(e.x, H(e.x, e.z) + e.k.y, e.z); const dist = ray.ray.distanceToPoint(v3), along = v3.clone().sub(o).dot(d); if (dist < e.k.r * (e.kind === 'boss' ? 1.7 : 1) + 0.15 && along > 2 && along < end) hits.push([along, e]); }
    hits.sort((a, b) => a[0] - b[0]); player.mesh.userData.gun.getWorldPosition(muzzle); muzzle.addScaledVector(d, 1.1); particles.emit(muzzle.x, muzzle.y, muzzle.z, { n: w.rail ? 16 : 5, color: w.rail ? 0x7fe9ff : 0xffd080, speed: w.rail ? 5 : 2.4, life: 0.08, size: w.rail ? 0.5 : 0.3, gravity: 0, bright: 2 }); flash(muzzle.x, muzzle.y, muzzle.z, w.rail ? 0x7fe9ff : 0xffc070, w.rail ? 40 : 10, 0.07); recoil = Math.min(0.06, recoil + (w.rail ? 0.05 : 0.012)); shake = Math.min(1.2, shake + (w.rail ? 0.25 : 0.03));
    if (w.rail) { for (const h of hits) hurtEnemy(h[1], w.dmg, o.clone().addScaledVector(d, h[0])); tracer(muzzle.clone(), o.clone().addScaledVector(d, end), 0x7fe9ff, 0.22); }
    else { const h = hits[0]; tracer(muzzle.clone(), o.clone().addScaledVector(d, h ? h[0] : end)); if (h) hurtEnemy(h[1], w.dmg, o.clone().addScaledVector(d, h[0])); } }
  function grenade() { if (player.nadeT > 0 || player.dead) return; const g = groundAim(45) || { x: player.x - Math.sin(player.yaw) * 22, z: player.z - Math.cos(player.yaw) * 22 }; player.nadeT = 6; const m = ball(0.2, M.gun, player.x, player.y + 1.5, player.z); actors.add(m); shots.push({ nade: true, m, x0: player.x, z0: player.z, y0: player.y + 1.5, x1: g.x, z1: g.z, t: 0, d: 0.9 }); }

  // ---------- Call-ins and building
  function callIn(i) { const c = CALLS[i]; if (!c || !player || player.dead || !(state === 'wave' || state === 'between' || state === 'prep')) return; if (c.need && !has(c.need)) { SFX.deny(); banner(c.name, 'Research Strategic Bombers in Earthfall to unlock it.'); return; }
    if (c.cd && c.t > 0) { SFX.deny(); return; } if (c.cost && scrap < c.cost) { SFX.deny(); banner(c.name, 'Needs ' + c.cost + ' scrap. You have ' + scrap + '.'); return; }
    const g = groundAim(c.kind === 'wall' || c.kind === 'mine' ? 40 : 160); if (!g) { SFX.deny(); banner(c.name, 'Aim at the ground to mark the spot.'); return; }
    if ((c.kind === 'wall' || c.kind === 'turret') && Math.hypot(g.x - CORE.x, g.z - CORE.z) < 6) { SFX.deny(); return; }
    if (c.cd) c.t = c.cd; if (c.cost) scrap -= c.cost; SFX.call();
    if (c.kind === 'wall') { addWall(g.x, g.z, player.yaw); SFX.build(); return; }
    if (c.kind === 'mine') { const m = mineModel(); m.position.set(g.x, H(g.x, g.z), g.z); actors.add(m); mines.push({ x: g.x, z: g.z, m }); SFX.build(); return; }
    const y = H(g.x, g.z), beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 90, 8), new THREE.MeshBasicMaterial({ color: c.col, transparent: true, opacity: 0.75 })); beam.position.set(g.x, y + 45, g.z); scene.add(beam);
    const rr = c.kind === 'strike' ? 9 : 2, ring = new THREE.Mesh(new THREE.RingGeometry(rr - 0.5, rr, 40), new THREE.MeshBasicMaterial({ color: c.col, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(g.x, y + 0.25, g.z); scene.add(ring);
    pending.push({ kind: c.kind, x: g.x, z: g.z, t: c.delay, beam, ring, yaw: player.yaw }); }
  function resolveCall(p) { scene.remove(p.beam); scene.remove(p.ring);
    if (p.kind === 'strike') boom(p.x, p.z, 10, 99, 0xff6030, 45);
    else if (p.kind === 'turret') dropPod(p.x, p.z, () => { addTurret(p.x, p.z); SFX.build(); });
    else if (p.kind === 'squad') dropPod(p.x, p.z, () => { for (let i = 0; i < 2; i++) if (allies.length < 8) addAlly(p.x + i * 1.5 - 0.7, p.z + 1); banner('Squad reinforced', allies.length + ' soldiers, ' + ORDERS[order] + '.'); });
    else if (p.kind === 'supply') dropPod(p.x, p.z, () => { const m = box(1.2, 0.9, 1.2, M.crate, p.x, H(p.x, p.z) + 0.45, p.z); actors.add(m); mines.push({ x: p.x, z: p.z, m, supply: true }); });
    else if (p.kind === 'air') { const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw); for (let i = -3; i <= 3; i++) pending.push({ kind: 'bomb', x: p.x - sin * i * 9, z: p.z - cos * i * 9, t: (i + 3) * 0.16, beam: new THREE.Object3D(), ring: new THREE.Object3D() }); }
    else if (p.kind === 'bomb') boom(p.x, p.z, 8, 60, 0xffd060, 40); }

  // ---------- HUD
  const hud = { hp: $('#hp i'), hpT: $('#hp b'), core: $('#core i'), coreT: $('#core b'), ammo: $('#ammo'), wave: $('#wave'), msg: $('#msg'), sub: $('#sub'), over: $('#over'), hit: $('#hit'), calls: $('#calls'), scrap: $('#scrap'), map: $('#map') };
  function banner(a, b) { hud.msg.textContent = a; hud.sub.textContent = b || ''; hud.msg.parentNode.classList.add('on'); bannerT = 2.8; }
  let hudT = 0; function drawHud(dt) { hudT -= dt; if (hudT > 0) return; hudT = 0.1; const w = WEAPONS[player.w];
    hud.hp.style.width = clamp(player.hp / player.max * 100, 0, 100) + '%'; hud.hpT.textContent = Math.max(0, Math.ceil(player.hp)) + (player.lives ? ' · ' + player.lives + ' ✚' : ''); hud.core.parentNode.style.display = assault() ? 'none' : ''; hud.core.style.width = clamp(CORE.hp / CORE.max * 100, 0, 100) + '%'; hud.coreT.textContent = Math.max(0, Math.ceil(CORE.hp));
    hud.ammo.innerHTML = '<small>' + w.name + (has('railgun') ? ' · Q swap' : '') + ' · G grenade' + (player.nadeT > 0 ? ' ' + Math.ceil(player.nadeT) + 's' : '') + '</small>' + (player.reload > 0 ? '<b>Reloading</b>' : '<b>' + player.ammo[player.w] + '</b> / ' + w.mag);
    hud.scrap.innerHTML = '⬢ <b>' + scrap + '</b> scrap · ✦ <b>' + research + '</b> research · ' + hives() + ' hives · ' + caches.length + ' caches<br>Squad of <b>' + allies.length + '</b>: ' + ORDERS[order] + ' · Z follow · X hold · C wall';
    hud.wave.innerHTML = state === 'drop' ? 'Dropping in' : state === 'prep' ? 'Prepare your defenses · <b>' + Math.ceil(phaseT) + 's</b> · Enter to start' : state === 'between' ? 'Wave ' + wave + ' cleared · next in <b>' + Math.ceil(phaseT) + 's</b> · build now' : (assault() ? 'Assault · <b>' + hives() + '</b> hives left' : 'Wave <b>' + Math.max(1, wave) + '</b> of ' + WAVES.length + ' · <b>' + (foes() + toSpawn.length) + '</b> left') + ' · ' + kills + ' kills';
    hud.calls.innerHTML = CALLS.map((c, i) => { const lockedC = c.need && !has(c.need), wait = lockedC || (c.cd && c.t > 0) || (c.cost && scrap < c.cost); return '<div class="call' + (wait ? ' wait' : '') + '"><kbd>' + (i + 1) + '</kbd><b>' + c.name + '</b><small>' + (lockedC ? 'locked' : c.cost ? '⬢ ' + c.cost : c.t > 0 ? Math.ceil(c.t) + 's' : 'ready') + '</small></div>'; }).join('');
    const g = hud.map.getContext('2d'), S = hud.map.width, sc = S / (ARENA * 2), px = x => (x + ARENA) * sc, pz = z => (z + ARENA) * sc; g.clearRect(0, 0, S, S); g.fillStyle = 'rgba(10,19,34,0.78)'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#e8be60'; for (const c of caches) { g.beginPath(); g.arc(px(c.x), pz(c.z), 2.6, 0, 7); g.fill(); } for (const e of enemies) { g.fillStyle = e.kind === 'hive' ? '#c05cff' : '#ff4a6a'; const r = e.kind === 'hive' ? 8 : e.kind === 'boss' ? 5 : e.kind === 'brute' ? 3.5 : 2; g.fillRect(px(e.x) - r / 2, pz(e.z) - r / 2, r, r); } g.fillStyle = '#9be8e2'; for (const t of turrets) g.fillRect(px(t.x) - 2, pz(t.z) - 2, 4, 4); g.fillStyle = '#7f9fc0'; for (const a of allies) g.fillRect(px(a.x) - 1.5, pz(a.z) - 1.5, 3, 3);
    g.fillStyle = '#46d6d0'; g.beginPath(); g.arc(px(CORE.x), pz(CORE.z), 5, 0, 7); g.fill(); g.save(); g.translate(px(player.x), pz(player.z)); g.rotate(-player.yaw); g.fillStyle = '#e8be60'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.fill(); g.restore(); }
  function finish(won) { if (state === 'over') return; state = 'over'; firing = false; if (document.exitPointerLock) document.exitPointerLock(); (won ? SFX.win : SFX.lose)();
    const extra = Math.max(0, (SETUP.defenders || 0) - 6), result = { won, defendersLeft: won ? allies.length + extra : 0, armorLeft: won ? SETUP.armor : 0, attackersKilled: Math.round(SETUP.attackers * Math.min(1, kills / WAVES.reduce((a, b) => a + b, 0))), coreLeft: Math.max(0, Math.round(CORE.hp)), research, hivesDestroyed: hivesDown };
    window.FRONTLINE_RESULT = result; try { if (window.parent && window.parent !== window) window.parent.postMessage({ frontline: result }, '*'); } catch (e) { /* standalone */ }
    hud.over.innerHTML = '<div class="card"><small>' + W.name + '</small><h1>' + (won ? (assault() ? 'Ground taken' : 'The line held') : (assault() ? 'The assault failed' : 'The city has fallen')) + '</h1><p>' + (won ? (assault() ? 'Every hive is destroyed. ' : 'Core integrity ' + Math.ceil(CORE.hp) + '%. ') + allies.length + ' of your soldiers are still standing.' : (player.dead ? 'You went down and the line broke.' : 'The swarm reached the core.')) + '</p><p><b>' + kills + '</b> of the swarm destroyed, <b>' + hivesDown + '</b> hive' + (hivesDown === 1 ? '' : 's') + ' burned out, <b>' + research + '</b> research recovered for the Lab.</p><button id="again">Back to the briefing</button></div>'; hud.over.classList.add('on'); $('#again').onclick = () => { hud.over.classList.remove('on'); menu(); }; }

  // ---------- Simulation
  function collide(o, r) { for (const s of solids) { const cx = clamp(o.x, s.x0, s.x1), cz = clamp(o.z, s.z0, s.z1), dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz; if (d2 < r * r) { if (d2 > 1e-6) { const d = Math.sqrt(d2); o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else o.x = s.x0 - r; } } o.x = clamp(o.x, -ARENA + 1.5, ARENA - 1.5); o.z = clamp(o.z, -ARENA + 1.5, ARENA - 1.5); }
  function nearest(list, x, z, max) { let best = null, bd = max; for (const o of list) { const d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; best = o; } } return best; }
  function step(dt) {
    if (state === 'drop') { phaseT -= dt; if (phaseT <= 0) { if (assault()) { startWave(); } else { state = 'prep'; phaseT = 25; banner('Prepare', 'Place walls (3), mines (4) and turrets (2). Hives and gold research caches are out in the hills. Enter starts the wave.'); } } }
    else if (state === 'prep' || state === 'between') { phaseT -= dt; if (phaseT <= 0) startWave(); }
    else if (state === 'wave') { if (toSpawn.length) { spawnT -= dt; if (spawnT <= 0) { spawn(toSpawn.shift()); spawnT = Math.max(0.1, 0.5 - wave * 0.07) * rnd(0.3, 1.6); } } else if (assault()) { /* the hives keep sending them until they are destroyed */ } else if (!foes()) { if (wave >= WAVES.length) return finish(true); state = 'between'; phaseT = 14; scrap += 25; player.hp = Math.min(player.max, player.hp + 30); banner('Wave cleared', '+25 scrap. Build before the next one.'); } }
    else return;
    // player
    if (!player.dead && state !== 'drop') { const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); player.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * dt * 2.2; player.pitch = clamp(player.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * dt * 1.2, -0.7, 0.45);
      const run = keys.ShiftLeft || keys.ShiftRight, sp = (run ? (has('elite') ? 11 : 9.5) : 6.2) * dt, sin = Math.sin(player.yaw), cos = Math.cos(player.yaw), len = Math.hypot(f, s) || 1;
      player.x += (-sin * f + cos * s) / len * sp; player.z += (-cos * f - sin * s) / len * sp; collide(player, 0.6); if (f || s) player.walk += dt * (run ? 15 : 11);
      player.fireT -= dt; player.nadeT -= dt; if (player.reload > 0) { player.reload -= dt; if (player.reload <= 0) player.ammo[player.w] = WEAPONS[player.w].mag; } if (firing && player.fireT <= 0) shoot(); }
    const pm = player.mesh; player.y = H(player.x, player.z); pm.visible = state !== 'drop'; pm.position.set(player.x, player.y + (player.dead ? 0.3 : 0), player.z); pm.rotation.y = player.yaw; pm.userData.legL.rotation.x = Math.sin(player.walk) * 0.7; pm.userData.legR.rotation.x = -Math.sin(player.walk) * 0.7; pm.userData.gun.rotation.x = player.pitch * 0.8; pm.userData.head.rotation.x = player.pitch * 0.5;
    // pods falling from orbit
    for (let i = pods.length - 1; i >= 0; i--) { const p = pods[i]; p.t += dt; p.m.position.y = H(p.x, p.z) + Math.max(0, 90 - p.t * 120); particles.emit(p.x, p.m.position.y + 3.5, p.z, { n: 3, color: 0xffb060, speed: 1.5, life: 0.5, size: 0.8, size1: 0.2, gravity: -6, bright: 1.6 }); if (p.t * 120 >= 90) { pods.splice(i, 1); actors.remove(p.m); boom(p.x, p.z, 3, 30, 0x9be8e2); if (p.then) p.then(); } }
    // enemies
    const hunt = assault();
    for (const e of enemies.slice()) { if (e.hp <= 0) continue; e.t += dt; e.bite -= dt;
      if (e.kind === 'hive') { e.m.userData.glow.scale.setScalar(1 + Math.sin(e.t * 3) * 0.12); if (state === 'wave') { e.brood -= dt; if (e.brood <= 0 && foes() < (hunt ? 55 : 140)) { e.brood = hunt ? rnd(1.6, 3.2) : rnd(7, 12); const n = spawn(hunt && Math.random() < 0.12 ? 'spitter' : 'swarm'); n.x = e.x + rnd(-4, 4); n.z = e.z + rnd(3, 6); } } continue; }
      const cd = hunt ? 999 : Math.hypot(CORE.x - e.x, CORE.z - e.z), pd = Math.hypot(player.x - e.x, player.z - e.z); let tx = hunt ? player.x : CORE.x + (cd > 30 ? Math.sin(e.t * 0.5 + e.drift * 4) * 9 * e.drift : 0), tz = hunt ? player.z : CORE.z, stop = 1.3, tgt = null;
      if (e.kind === 'spitter') { tgt = nearest(turrets, e.x, e.z, e.k.range) || nearest(allies, e.x, e.z, e.k.range) || (!player.dead && pd < e.k.range ? player : null) || (!hunt && cd < e.k.range ? CORE : null); if (tgt) { tx = tgt.x; tz = tgt.z; stop = e.k.range - 5; } }
      else if (e.kind === 'brute' || e.kind === 'boss') { const st = nearest(turrets.concat(walls), e.x, e.z, 16); if (st) { tgt = st; tx = st.x; tz = st.z; stop = e.k.r + 1.6; } else if (!player.dead && pd < 12) { tx = player.x; tz = player.z; } }
      else if (hunt) { const al = nearest(allies, e.x, e.z, 6); if (al && pd > 8) { tx = al.x; tz = al.z; } }
      else { const al = nearest(allies, e.x, e.z, 7); if (!player.dead && pd < 10) { tx = player.x; tz = player.z; } else if (al) { tx = al.x; tz = al.z; } }
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1, ox = e.x, oz = e.z; if (d > stop) { if (e.side > 0) { e.side -= dt; const sg = e.drift >= 0 ? 1 : -1; e.x += (dz / d * sg * 0.9 + dx / d * 0.3) * e.sp * dt; e.z += (-dx / d * sg * 0.9 + dz / d * 0.3) * e.sp * dt; } else { e.x += dx / d * e.sp * dt; e.z += dz / d * e.sp * dt; } collide(e, e.k.r * 0.8); }
      const blocked = d > stop && Math.hypot(e.x - ox, e.z - oz) < e.sp * dt * 0.35; if (blocked && !(e.side > 0)) e.side = 1.4; /* slide around whatever is in the way */ e.m.position.set(e.x, H(e.x, e.z) + Math.abs(Math.sin(e.t * 9)) * 0.08, e.z); e.m.rotation.y = Math.atan2(dx, dz); const lg = e.m.userData.legs; for (let i = 0; i < lg.length; i++) lg[i].rotation.x = Math.sin(e.t * 12 + i * 1.6) * 0.6;
      if (e.kind === 'spitter') { e.fire -= dt; if (tgt && d < e.k.range && e.fire <= 0) { e.fire = 2.4; const m = ball(0.28, M.acid, e.x, H(e.x, e.z) + 2.1, e.z); actors.add(m); shots.push({ m, x0: e.x, z0: e.z, y0: H(e.x, e.z) + 2.1, x1: tgt.x, z1: tgt.z, t: 0, d: Math.max(0.5, d / 24), tgt }); } continue; }
      if (!player.dead && pd < e.k.r + 0.9 && e.bite <= 0) { e.bite = 0.8; hurtPlayer(e.k.dmg); if (state === 'over') return; }
      if (e.bite <= 0) { const al = nearest(allies, e.x, e.z, e.k.r + 1); if (al) { e.bite = 0.8; hurtAlly(al, e.k.dmg); } }
      if (e.bite <= 0 && (blocked || tgt)) { const st = nearest(turrets.concat(walls), e.x, e.z, e.k.r + 2.6); if (st) { e.bite = 0.7; st.hp -= e.kind === 'swarm' ? 2 : 12; puff(V(st.x, H(st.x, st.z) + 1, st.z), 0xffa040, 2); if (st.hp <= 0) removeStruct(st); } }
      if (!hunt && cd < 6.4 + e.k.r && e.bite <= 0) { e.bite = 0.9; CORE.hp -= e.k.core; puff(V(e.x, H(e.x, e.z) + 1.5, e.z), 0x46d6d0, 3); if (CORE.hp <= 0) return finish(false); }
      if (e.kind === 'boss') { e.brood -= dt; if (e.brood <= 0) { e.brood = 4.5; for (let i = 0; i < 2; i++) { const n = spawn('swarm'); n.x = e.x + rnd(-3, 3); n.z = e.z + rnd(-3, 3); } } } }
    // mines and supply crates
    for (let i = mines.length - 1; i >= 0; i--) { const m = mines[i]; if (m.supply) { if (!player.dead && Math.hypot(player.x - m.x, player.z - m.z) < 2.4) { player.hp = player.max; player.ammo = [WEAPONS[0].mag, WEAPONS[1].mag]; player.nadeT = 0; scrap += 20; actors.remove(m.m); mines.splice(i, 1); SFX.build(); banner('Resupplied', 'Full health and ammo, +20 scrap.'); } } else if (nearest(enemies, m.x, m.z, 2.2)) { actors.remove(m.m); mines.splice(i, 1); boom(m.x, m.z, 6, 12, 0xff4a6a, 25); } }
    for (let i = caches.length - 1; i >= 0; i--) { const c = caches[i]; c.m.rotation.y += dt; if (!player.dead && Math.hypot(player.x - c.x, player.z - c.z) < 2.6) { actors.remove(c.m); caches.splice(i, 1); research += 25; scrap += 30; SFX.build(); banner('Research recovered', '+25 research for the Lab, +30 scrap. ' + caches.length + ' caches left.'); } }
    // projectiles: acid globs and grenades fly in an arc
    for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt; const k = Math.min(1, s.t / s.d); s.m.position.set(s.x0 + (s.x1 - s.x0) * k, s.y0 + (H(s.x1, s.z1) + 0.6 - s.y0) * k + Math.sin(k * Math.PI) * (s.nade ? 5 : 3), s.z0 + (s.z1 - s.z0) * k);
      if (k >= 1) { actors.remove(s.m); shots.splice(i, 1); if (s.nade) boom(s.x1, s.z1, 7, 7, 0xffa040, 30); else { puff(V(s.x1, H(s.x1, s.z1) + 0.8, s.z1), 0xa8ff4a, 5); const t = s.tgt; if (t === player || Math.hypot(player.x - s.x1, player.z - s.z1) < 2) hurtPlayer(9); else if (t === CORE) { CORE.hp -= 2; if (CORE.hp <= 0) return finish(false); } else if (t && t.kind) { if (turrets.indexOf(t) >= 0 || walls.indexOf(t) >= 0) { t.hp -= 6; if (t.hp <= 0) removeStruct(t); } } else if (t && allies.indexOf(t) >= 0) hurtAlly(t, 9); if (state === 'over') return; } } }
    // turrets and allied soldiers fire on their own
    for (const t of turrets) { t.t -= dt; const best = nearest(enemies, t.x, t.z, 30); if (best) { const want = Math.atan2(-(best.x - t.x), -(best.z - t.z)); let da = want - t.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); t.yaw += clamp(da, -dt * 5, dt * 5); t.m.userData.top.rotation.y = t.yaw; if (t.t <= 0 && Math.abs(da) < 0.2) { t.t = 0.6; SFX.turret(); flash(t.x, H(t.x, t.z) + 1.4, t.z, 0x9be8e2, 8, 0.06); tracer(V(t.x, H(t.x, t.z) + 1.3, t.z), V(best.x, H(best.x, best.z) + best.k.y, best.z), 0x9be8e2); hurtEnemy(best, 1); } } }
    for (let ai = 0; ai < allies.length; ai++) { const a = allies[ai], ring = ai * 2.4 + 0.8, ox = Math.cos(ring) * (2.6 + (ai % 3)), oz = Math.sin(ring) * (2.6 + (ai % 3)); let gx = a.hx, gz = a.hz; if (order === 'follow') { gx = player.x + ox; gz = player.z + oz + 1.5; } else if (order === 'hold' && holdPt) { gx = holdPt.x + ox; gz = holdPt.z + oz; }
      const mdx = gx - a.x, mdz = gz - a.z, md = Math.hypot(mdx, mdz); if (md > 1.2) { const sp = (md > 14 ? 9 : 5.8) * dt; a.x += mdx / md * sp; a.z += mdz / md * sp; collide(a, 0.55); a.walk += dt * 11; a.m.rotation.y = Math.atan2(-mdx, -mdz); } a.m.position.set(a.x, H(a.x, a.z), a.z); a.m.userData.legL.rotation.x = md > 1.2 ? Math.sin(a.walk) * 0.7 : 0; a.m.userData.legR.rotation.x = md > 1.2 ? -Math.sin(a.walk) * 0.7 : 0; }
    for (const a of allies) { a.t -= dt; const best = nearest(enemies, a.x, a.z, 26); if (best) { a.m.rotation.y = Math.atan2(-(best.x - a.x), -(best.z - a.z)); if (a.t <= 0) { a.t = 0.5 + Math.random() * 0.25; if (Math.random() < 0.7) { tracer(V(a.x, H(a.x, a.z) + 1.4, a.z), V(best.x, H(best.x, best.z) + best.k.y, best.z), 0xffe9a0); hurtEnemy(best, 1); } } } }
    // call-ins counting down
    for (const c of CALLS) if (c.t > 0) c.t -= dt; for (let i = pending.length - 1; i >= 0; i--) { const p = pending[i]; p.t -= dt; if (p.beam.material) { p.beam.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(p.t * 9)); p.ring.rotation.z += dt * 2; } if (p.t <= 0) { pending.splice(i, 1); resolveCall(p); } }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const k = f.t / f.d; if (k >= 1) { scene.remove(f.o); fx.splice(i, 1); continue; } f.o.material.opacity = 1 - k; }
    for (const f of flashes) { if (f.t > 0) { f.t -= dt; f.l.intensity = f.i0 * Math.max(0, f.t / f.d); } else f.l.intensity = 0; }
    for (const e of enemies) if (e.kind === 'hive' && Math.random() < dt * 6) particles.emit(e.x + rnd(-2, 2), H(e.x, e.z) + 4, e.z + rnd(-2, 2), { n: 1, color: 0xff3a70, speed: 0.6, life: 1.6, size: 0.35, size1: 0.05, gravity: -1.8, bright: 2.5 });
    CORE.orb.rotation.y += dt * 0.8; CORE.orb.position.y = 4 + Math.sin(performance.now() / 600) * 0.25; CORE.light.intensity = 30 + 70 * CORE.hp / CORE.max;
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) hud.msg.parentNode.classList.remove('on'); } }
  function placeCamera() { if (!player || state === 'menu') { const t = performance.now() / 9000; camera.position.set(Math.sin(t) * 70, 34, CORE.z + 40 + Math.cos(t) * 30); camera.lookAt(CORE.x, 4, CORE.z - 40); return; }
    if (state === 'drop') { const k = 1 - clamp(phaseT / 2.6, 0, 1); camera.position.set(player.x + 16, 24 - k * 12, player.z + 30); camera.lookAt(player.x, 34 - k * 32, player.z); return; }
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw), back = 5.4 * Math.cos(player.pitch), up = 2.4 - player.pitch * 3.2, py = player.y || 0, cx = player.x + sin * back + cos * 0.95, cz = player.z + cos * back - sin * 0.95;
    const sx = (Math.random() - 0.5) * shake * 0.5, sy = (Math.random() - 0.5) * shake * 0.5;
    camera.position.set(cx + sx, Math.max(py + up + 0.9, H(cx, cz) + 0.6) + sy, cz); camera.lookAt(player.x - sin * 12 + cos * 0.95, py + 1.6 + (player.pitch + recoil) * 12, player.z - cos * 12 - sin * 0.95); camera.updateMatrixWorld(); }

  // ---------- Menu and loop
  function menu() { state = 'menu'; $('#intro').classList.add('on'); document.body.classList.add('inmenu'); }
  function begin(opts) { Object.assign(SETUP, opts || {}); SFX.unlock(); reset(); $('#intro').classList.remove('on'); document.body.classList.remove('inmenu'); state = 'drop'; phaseT = 2.6; dropPod(player.x, player.z, null); banner('Dropping on ' + (SETUP.city || W.name), W.sub); if (cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (e) { /* fine */ } } }
  $('#start').onclick = () => { const f = $('#setup'), research = [].slice.call(f.querySelectorAll('input[name=r]:checked')).map(i => i.value); begin({ mode: f.querySelector('input[name=m]:checked').value, world: f.querySelector('input[name=w]:checked').value, attackers: +f.querySelector('input[name=d]:checked').value, research }); };
  if (ASSETS.title) $('#intro').style.backgroundImage = 'linear-gradient(#060b13cc,#060b13ee),url(' + ASSETS.title + ')';
  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; gtime += dt; if (state !== 'menu' && state !== 'over') step(dt); shake = Math.max(0, shake - dt * 2.4); recoil = Math.max(0, recoil - dt * 0.35); hurtT = Math.max(0, hurtT - dt * 1.6); particles.update(dt); placeCamera();
    if (skyCtl) { if (player && state !== 'menu') skyCtl.follow(player.x, player.y || 0, player.z); else skyCtl.follow(CORE.x, 0, CORE.z - 20); } post.grade.uniforms.uTime.value = gtime; post.grade.uniforms.uHurt.value = hurtT * 0.55;
    if (player && state !== 'menu') drawHud(dt); post.composer.render(dt); requestAnimationFrame(frame); }
  buildWorld(); if (window.FRONTLINE_SETUP) begin({}); else menu(); requestAnimationFrame(frame);
  window.__f = { boom, renderOnce() { particles.update(0.016); placeCamera(); if (skyCtl && player) skyCtl.follow(player.x, player.y || 0, player.z); post.composer.render(0.016); }, cam: placeCamera, begin, step, callIn, grenade, shoot, swap, SETUP, CALLS, WORLDS, CORE, get player() { return player; }, get enemies() { return enemies; }, get turrets() { return turrets; }, get walls() { return walls; }, get allies() { return allies; }, get state() { return state; }, get wave() { return wave; }, setOrder, get order() { return order; }, get research() { return research; }, get caches() { return caches; }, get scrap() { return scrap; }, set scrap(v) { scrap = v; }, skip() { phaseT = 0; } };
})();
