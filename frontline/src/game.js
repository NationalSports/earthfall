// Earthfall: Frontline. Milestone 1: greybox Los Angeles arena.
// Third-person shooter with tower defense: hold the city core against waves.
// Everything here is plain three.js built from simple shapes so it can be re-skinned later.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Setup handed over by Earthfall (or the defaults when run on its own)
  const SETUP = Object.assign({ city: 'Los Angeles', mode: 'defense', attackers: 9, defenders: 5, armor: 0, fort: 1, battery: 1, radar: 1, research: [] }, window.FRONTLINE_SETUP || {});
  const WAVES = [0.3, 0.45, 0.6].map(f => Math.max(8, Math.round(SETUP.attackers * 6 * f))); // three waves sized from the attack

  // ---------- Renderer, scene, light
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  $('#game').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x243246).convertSRGBToLinear(); scene.fog = new THREE.Fog(scene.background.getHex(), 55, 180);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0x9fc4e8, 0x2a2018, 0.9));
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.6); sun.position.set(-40, 70, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 220 }); scene.add(sun);
  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();

  // ---------- Materials and a tiny shape helper
  const mat = (c, o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.05 }, o || {})); m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear(); return m; };
  const M = { ground: mat(0x2b3440), road: mat(0x1c232c), lane: mat(0x3a2a22), bld: [mat(0x3d4856), mat(0x4a5361), mat(0x343d49)], win: mat(0x0f1a26, { emissive: 0x2b6f8a, emissiveIntensity: 0.6 }),
    teal: mat(0x2e969c), tealD: mat(0x1d5f66), skin: mat(0xc99a78), gun: mat(0x20252b, { metalness: 0.5, roughness: 0.5 }), gold: mat(0xe8be60, { emissive: 0x6b4c10, emissiveIntensity: 0.5 }),
    bug: mat(0x6a2a78), bugD: mat(0x3a153f), bugGlow: mat(0xff4a6a, { emissive: 0xff2a50, emissiveIntensity: 1.2 }), core: mat(0x46d6d0, { emissive: 0x1f8f8a, emissiveIntensity: 0.9 }), wall: mat(0x5a5348) };
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x || 0, y || 0, z || 0); b.castShadow = b.receiveShadow = true; return b; };
  const cyl = (r1, r2, h, m, x, y, z, seg) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 10), m); b.position.set(x || 0, y || 0, z || 0); b.castShadow = b.receiveShadow = true; return b; };

  // ---------- Arena: the core is at +Z (south), the swarm comes from -Z (north) down two lanes.
  const ARENA = 70, solids = []; // solids: axis-aligned boxes the player cannot walk through
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), M.ground); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
    for (const x of [-16, 16]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(11, ARENA * 2 - 16), M.lane); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, -4); l.receiveShadow = true; scene.add(l); }
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2 - 20, 9), M.road); cross.rotation.x = -Math.PI / 2; cross.position.set(0, 0.021, 8); scene.add(cross); }
  function building(x, z, w, d, h) { const b = box(w, h, d, M.bld[(Math.abs(x * 7 + z * 3) | 0) % 3], x, h / 2, z); scene.add(b);
    for (let i = 0; i < Math.floor(h / 4); i++) { const s = box(w + 0.05, 0.9, d + 0.05, M.win, x, 2.5 + i * 4, z); s.castShadow = false; scene.add(s); }
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }); }
  // city blocks: between the lanes, and along the outside edges
  for (const z of [-48, -30, -12]) { building(0, z, 12, 12, 10 + (z % 7 + 7)); building(-36, z, 14, 12, 8 + ((z * 3) % 9 + 9) % 9); building(36, z, 14, 12, 9 + ((z * 5) % 8 + 8) % 8); }
  building(-36, 26, 14, 14, 12); building(36, 26, 14, 14, 11);
  // low cover the player can shoot over
  const covers = [[-16, 14], [16, 14], [-6, 22], [6, 22], [-24, 4], [24, 4]]; for (const c of covers) { scene.add(box(4, 1.1, 0.8, M.wall, c[0], 0.55, c[1])); solids.push({ x0: c[0] - 2, x1: c[0] + 2, z0: c[1] - 0.4, z1: c[1] + 0.4 }); }
  // boundary walls
  for (const s of [[0, -ARENA, ARENA * 2, 1], [0, ARENA, ARENA * 2, 1], [-ARENA, 0, 1, ARENA * 2], [ARENA, 0, 1, ARENA * 2]]) { scene.add(box(s[2], 4, s[3], M.wall, s[0], 2, s[1])); }

  // The core: what you are defending
  const CORE = { x: 0, z: 40, hp: 100, max: 100 };
  { const g = new THREE.Group(); g.add(cyl(4, 4.6, 1, M.tealD, 0, 0.5, 0, 16)); const orb = new THREE.Mesh(new THREE.OctahedronGeometry(2.1, 0), M.core); orb.position.y = 4; orb.castShadow = true; g.add(orb); g.add(cyl(0.35, 0.35, 3, M.gun, 0, 2.2, 0));
    const pl = new THREE.PointLight(0x46d6d0, 1.2, 40); pl.position.y = 4; g.add(pl); g.position.set(CORE.x, 0, CORE.z); scene.add(g); CORE.orb = orb; CORE.light = pl; solids.push({ x0: -4, x1: 4, z0: 36, z1: 44 }); }

  // ---------- Models built from shapes
  function soldier() { const g = new THREE.Group(); const legL = box(0.28, 0.8, 0.3, M.tealD, -0.18, 0.4, 0), legR = box(0.28, 0.8, 0.3, M.tealD, 0.18, 0.4, 0);
    const torso = box(0.75, 0.75, 0.42, M.teal, 0, 1.18, 0), head = box(0.36, 0.36, 0.36, M.skin, 0, 1.78, 0), helm = box(0.42, 0.2, 0.42, M.tealD, 0, 1.94, 0), pack = box(0.5, 0.5, 0.2, M.tealD, 0, 1.2, 0.3);
    const gun = new THREE.Group(); gun.add(box(0.1, 0.14, 0.95, M.gun, 0, 0, -0.35)); gun.add(box(0.08, 0.22, 0.12, M.gun, 0, -0.14, -0.05)); gun.position.set(0.3, 1.25, -0.25);
    g.add(legL, legR, torso, head, helm, pack, gun); g.userData = { legL, legR, gun }; return g; }
  function swarmling(big) { const g = new THREE.Group(), s = big ? 1.7 : 1; const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), M.bug); body.scale.set(1, 0.7, 1.4); body.position.y = 0.7; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 6), M.bugD); head.rotation.x = Math.PI / 2; head.position.set(0, 0.75, 0.85); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), M.bugGlow); eye.position.set(0, 0.92, 0.95);
    const legs = []; for (let i = 0; i < 4; i++) { const l = box(0.1, 0.7, 0.1, M.bugD, (i % 2 ? 0.5 : -0.5), 0.35, (i < 2 ? 0.35 : -0.35)); l.rotation.z = (i % 2 ? -0.5 : 0.5); legs.push(l); g.add(l); }
    g.add(body, head, eye); g.scale.setScalar(s); g.userData = { legs }; return g; }
  function turretModel() { const g = new THREE.Group(); g.add(cyl(0.9, 1.1, 0.7, M.gun, 0, 0.35, 0, 8)); const top = new THREE.Group(); top.add(box(0.9, 0.6, 1.0, M.tealD, 0, 0, 0)); top.add(cyl(0.09, 0.09, 1.6, M.gun, -0.2, 0, -1.0, 6)).children[1].rotation.x = Math.PI / 2; const b2 = cyl(0.09, 0.09, 1.6, M.gun, 0.2, 0, -1.0, 6); b2.rotation.x = Math.PI / 2; top.add(b2);
    top.position.y = 1.05; g.add(top); g.userData = { top }; return g; }

  // ---------- Player
  const player = { x: 0, z: 30, yaw: 0, pitch: -0.12, hp: 100, max: 100, ammo: 30, mag: 30, reload: 0, fireT: 0, mesh: soldier(), walk: 0, dead: false };
  scene.add(player.mesh);

  // ---------- Turrets (what you built in Earthfall is already standing)
  const turrets = []; function addTurret(x, z) { const m = turretModel(); m.position.set(x, 0, z); scene.add(m); turrets.push({ x, z, m, t: 0, yaw: 0 }); solids.push({ x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1 }); }
  if (SETUP.battery) addTurret(-16, 20); if (SETUP.fort) addTurret(16, 20); if (SETUP.fort > 1) addTurret(0, 28);

  // ---------- Enemies and waves
  const enemies = []; let wave = 0, toSpawn = 0, spawnT = 0, between = 4, state = 'intro', kills = 0, scrap = 0;
  function spawn() { const lane = Math.random() < 0.5 ? -16 : 16, big = wave >= 2 && Math.random() < 0.18, m = swarmling(big); const e = { x: lane + rnd(-3.5, 3.5), z: -ARENA + 6 + rnd(0, 6), hp: big ? 9 : 3, max: big ? 9 : 3, sp: big ? 3.2 : rnd(4.6, 5.8), big, m, t: rnd(0, 6), bite: 0, lane };
    m.position.set(e.x, 0, e.z); scene.add(m); enemies.push(e); }
  function startWave() { wave++; toSpawn = WAVES[wave - 1]; spawnT = 0; state = 'wave'; banner('Wave ' + wave + ' of ' + WAVES.length, toSpawn + ' incoming down both lanes'); }

  // ---------- Effects: tracers and hit flashes
  const fx = []; const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true });
  function tracer(a, b, col) { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const m = tracerMat.clone(); if (col) m.color.set(col); const l = new THREE.Line(g, m); scene.add(l); fx.push({ o: l, t: 0, d: 0.07 }); }
  function puff(p, col, s) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), new THREE.MeshBasicMaterial({ color: col, transparent: true })); m.position.copy(p); scene.add(m); fx.push({ o: m, t: 0, d: 0.28, grow: s || 3 }); }

  // ---------- Input
  const keys = {}; let firing = false, locked = false;
  window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyR') reload(); if (e.code === 'Space') e.preventDefault(); });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  const cv = renderer.domElement;
  cv.addEventListener('mousedown', e => { if (state === 'intro' || state === 'over') return; if (e.button === 0) firing = true; if (!locked && cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (err) { /* some frames forbid it; mouse-move still aims */ } } });
  window.addEventListener('mouseup', () => { firing = false; });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; });
  window.addEventListener('mousemove', e => { if (state === 'intro' || state === 'over') return; player.yaw -= (e.movementX || 0) * 0.0026; player.pitch = clamp(player.pitch - (e.movementY || 0) * 0.002, -0.7, 0.45); });
  function reload() { if (player.reload > 0 || player.ammo === player.mag || player.dead) return; player.reload = 1.3; }

  // ---------- HUD
  const hud = { hp: $('#hp i'), hpT: $('#hp b'), core: $('#core i'), coreT: $('#core b'), ammo: $('#ammo'), wave: $('#wave'), msg: $('#msg'), sub: $('#sub'), over: $('#over'), hit: $('#hit') };
  let bannerT = 0; function banner(a, b) { hud.msg.textContent = a; hud.sub.textContent = b || ''; hud.msg.parentNode.classList.add('on'); bannerT = 2.6; }
  function drawHud() { hud.hp.style.width = clamp(player.hp / player.max * 100, 0, 100) + '%'; hud.hpT.textContent = Math.max(0, Math.ceil(player.hp)); hud.core.style.width = clamp(CORE.hp / CORE.max * 100, 0, 100) + '%'; hud.coreT.textContent = Math.max(0, Math.ceil(CORE.hp));
    hud.ammo.innerHTML = player.reload > 0 ? '<b>Reloading</b>' : '<b>' + player.ammo + '</b> / ' + player.mag; hud.wave.innerHTML = 'Wave <b>' + Math.max(1, wave) + '</b> of ' + WAVES.length + ' · <b>' + (enemies.length + toSpawn) + '</b> left · ' + kills + ' kills'; }
  function finish(won) { state = 'over'; firing = false; if (document.exitPointerLock) document.exitPointerLock();
    const left = Math.max(0, Math.round(SETUP.defenders * (won ? 0.5 + 0.5 * CORE.hp / CORE.max : 0)));
    const result = { won, defendersLeft: left, armorLeft: won ? SETUP.armor : 0, attackersKilled: Math.round(SETUP.attackers * Math.min(1, kills / WAVES.reduce((a, b) => a + b, 0))) };
    window.FRONTLINE_RESULT = result; try { window.parent && window.parent.postMessage({ frontline: result }, '*'); } catch (e) { /* standalone */ }
    hud.over.innerHTML = '<h1>' + (won ? SETUP.city + ' held' : SETUP.city + ' has fallen') + '</h1><p>' + (won ? 'The core survived with ' + Math.ceil(CORE.hp) + '% integrity. ' + kills + ' of the swarm destroyed.' : (player.dead ? 'You went down and the line broke.' : 'The swarm reached the core.') + ' ' + kills + ' destroyed.') + '</p><button id="again">Fight again</button>'; hud.over.classList.add('on'); $('#again').onclick = () => location.reload(); }

  // ---------- Simulation
  const v3 = new THREE.Vector3(), ray = new THREE.Raycaster(), muzzle = new THREE.Vector3(), aim = new THREE.Vector3();
  function collide(o, r) { for (const s of solids) { const cx = clamp(o.x, s.x0, s.x1), cz = clamp(o.z, s.z0, s.z1), dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz; if (d2 < r * r) { if (d2 > 1e-6) { const d = Math.sqrt(d2); o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else { o.x = s.x0 - r; } } } o.x = clamp(o.x, -ARENA + 1.5, ARENA - 1.5); o.z = clamp(o.z, -ARENA + 1.5, ARENA - 1.5); }
  function hurtEnemy(e, dmg, at) { e.hp -= dmg; puff(at || v3.set(e.x, 0.8, e.z), 0xff6a8a, 2.5); if (e.hp <= 0) { scene.remove(e.m); enemies.splice(enemies.indexOf(e), 1); kills++; scrap += e.big ? 3 : 1; puff(v3.set(e.x, 0.7, e.z), 0xb04adf, 6); } }
  function shoot() { if (player.reload > 0 || player.dead) return; if (player.ammo < 1) { reload(); return; } player.ammo--; player.fireT = 0.105;
    // aim where the camera's centre points, then fire from the gun toward that spot
    ray.setFromCamera({ x: 0, y: 0 }, camera); let best = null, bd = 140; aim.copy(ray.ray.origin).addScaledVector(ray.ray.direction, 140);
    for (const e of enemies) { v3.set(e.x, e.big ? 1.2 : 0.75, e.z); const r = e.big ? 1.25 : 0.8, d = ray.ray.distanceToPoint(v3), along = v3.clone().sub(ray.ray.origin).dot(ray.ray.direction); if (d < r && along > 2 && along < bd) { bd = along; best = e; } }
    if (best) aim.copy(ray.ray.origin).addScaledVector(ray.ray.direction, bd);
    player.mesh.userData.gun.getWorldPosition(muzzle); tracer(muzzle.clone(), aim.clone()); if (best) hurtEnemy(best, 1, aim.clone()); }

  function step(dt) {
    if (state === 'wave') { if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0) { spawn(); toSpawn--; spawnT = Math.max(0.25, 0.9 - wave * 0.15); } } else if (!enemies.length) { if (wave >= WAVES.length) return finish(true); state = 'between'; between = 7; banner('Wave cleared', 'Next wave in a few seconds. Reload with R.'); player.hp = Math.min(player.max, player.hp + 25); } }
    else if (state === 'between') { between -= dt; if (between <= 0) startWave(); }
    // player
    if (!player.dead) { const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); player.yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 2.2;
      const sp = (keys.ShiftLeft || keys.ShiftRight ? 9.5 : 6.2) * dt, sin = Math.sin(player.yaw), cos = Math.cos(player.yaw), len = Math.hypot(f, s) || 1;
      player.x += (-sin * f + cos * s) / len * sp; player.z += (-cos * f - sin * s) / len * sp; collide(player, 0.6); if (f || s) player.walk += dt * 11;
      player.fireT -= dt; if (player.reload > 0) { player.reload -= dt; if (player.reload <= 0) player.ammo = player.mag; } if (firing && player.fireT <= 0) shoot(); }
    const pm = player.mesh; pm.position.set(player.x, 0, player.z); pm.rotation.y = player.yaw; pm.userData.legL.rotation.x = Math.sin(player.walk) * 0.6; pm.userData.legR.rotation.x = -Math.sin(player.walk) * 0.6; pm.userData.gun.rotation.x = player.pitch * 0.8;
    // enemies: down the lane, then turn in on the core; bite the player if he is in the way
    for (const e of enemies.slice()) { e.t += dt; let tx = e.z < 26 ? e.lane + Math.sin(e.t * 0.7) * 2.5 : CORE.x, tz = e.z < 26 ? 30 : CORE.z; const pd = Math.hypot(player.x - e.x, player.z - e.z); if (!player.dead && pd < 9) { tx = player.x; tz = player.z; }
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1; if (d > 1.3) { e.x += dx / d * e.sp * dt; e.z += dz / d * e.sp * dt; } e.m.position.set(e.x, Math.abs(Math.sin(e.t * 9)) * 0.08, e.z); e.m.rotation.y = Math.atan2(dx, dz); e.m.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.t * 12 + i * 1.6) * 0.6; });
      e.bite -= dt; if (!player.dead && pd < 1.6 && e.bite <= 0) { e.bite = 0.8; player.hp -= e.big ? 14 : 7; hud.hit.classList.add('on'); setTimeout(() => hud.hit.classList.remove('on'), 120); if (player.hp <= 0) { player.dead = true; pm.rotation.z = Math.PI / 2; pm.position.y = 0.3; setTimeout(() => finish(false), 900); } }
      if (Math.hypot(CORE.x - e.x, CORE.z - e.z) < 5.6 && e.bite <= 0) { e.bite = 0.9; CORE.hp -= e.big ? 4 : 1.5; puff(v3.set(e.x, 1.5, e.z), 0x46d6d0, 3); if (CORE.hp <= 0 && state !== 'over') return finish(false); } }
    // turrets: nearest enemy in range
    for (const t of turrets) { t.t -= dt; let best = null, bd = 26; for (const e of enemies) { const d = Math.hypot(e.x - t.x, e.z - t.z); if (d < bd) { bd = d; best = e; } }
      if (best) { const want = Math.atan2(-(best.x - t.x), -(best.z - t.z)); let da = want - t.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); t.yaw += clamp(da, -dt * 5, dt * 5); t.m.userData.top.rotation.y = t.yaw;
        if (t.t <= 0 && Math.abs(da) < 0.2) { t.t = 0.6; tracer(new THREE.Vector3(t.x, 1.1, t.z), new THREE.Vector3(best.x, 0.8, best.z), 0x9be8e2); hurtEnemy(best, 1); } } }
    // effects
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const k = f.t / f.d; if (k >= 1) { scene.remove(f.o); fx.splice(i, 1); continue; } f.o.material.opacity = 1 - k; if (f.grow) f.o.scale.setScalar(1 + k * f.grow); }
    CORE.orb.rotation.y += dt * 0.8; CORE.orb.position.y = 4 + Math.sin(performance.now() / 600) * 0.25; CORE.light.intensity = 0.6 + 0.9 * CORE.hp / CORE.max;
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) hud.msg.parentNode.classList.remove('on'); }
  }
  function placeCamera() { // over the right shoulder, pulled in if a building is behind you
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw), back = 5.2 * Math.cos(player.pitch), up = 2.4 - player.pitch * 3.2;
    camera.position.set(player.x + sin * back + cos * 0.9, up + 0.9, player.z + cos * back - sin * 0.9);
    camera.lookAt(player.x - sin * 12 + cos * 0.9, 1.5 + player.pitch * 12, player.z - cos * 12 - sin * 0.9); }

  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (state === 'wave' || state === 'between') step(dt); placeCamera(); drawHud(); renderer.render(scene, camera); requestAnimationFrame(frame); }
  function begin() { if (state !== 'intro') return; $('#intro').classList.remove('on'); state = 'between'; between = 3; banner('Defend ' + SETUP.city, 'Hold the core. The swarm comes from the north.'); if (cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (e) { /* fine */ } } }
  $('#start').onclick = begin; placeCamera(); requestAnimationFrame(frame);
  window.__f = { player, enemies, CORE, step, begin, get state() { return state; }, get wave() { return wave; }, turrets, shoot, SETUP };
})();
