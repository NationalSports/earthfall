// ---------- 3D board ----------
const V = (() => {
  const BW = 120, BH = 67.5, RW = 1920, RH = 1080, GW = 320, GH = 180, FLAT = 0.38;
  const MERC = d => Math.log(Math.tan(Math.PI / 4 + d * Math.PI / 360)), MT = MERC(78), MB = MERC(-60), fy = lat => (MT - MERC(clamp(lat, -89, 89))) / (MT - MB), latOf = f => (2 * Math.atan(Math.exp(MT - f * (MT - MB))) - Math.PI / 2) * 180 / Math.PI;
  const px = lon => (lon + 180) / 360 * RW, py = lat => fy(lat) * RH;
  const wx = lon => (lon + 180) / 360 * BW - BW / 2, wz = lat => fy(lat) * BH - BH / 2, AW = 1920, AH = 1080;
  const curve = (x, z) => -(x * x + z * z) / 2100;
  let bd; let renderer, scene, camera, el, labelsEl, tex, texCtx, img, idx, landA, heights, boardMesh, hp, shade, texE, ctxE, imgE, trees, treeT = [], seaTex, clouds = [], glowTex;
  let tokens, arcs, fxGroup, labels = {}, partyLabels = [], sigTok = '', sigTex = '', sel = null, onPick = () => {};
  const cam = { tx: 20, tz: 0, dist: 70, yaw: 0, pitch: 1.02 };
  const fx = []; let teamTok, time = 0, S0 = null, artData = null;
  function setArt(image) { const c = document.createElement('canvas'); c.width = RW; c.height = RH; const g = c.getContext('2d'); g.drawImage(image, 0, 0, RW, RH); artData = g.getImageData(0, 0, RW, RH).data; if (trees) trees.visible = false; sigTex = ''; if (S0) sync(S0, sel); }
  const P = id => { const t = TERR[id], x = t.ax / AW * BW - BW / 2, z = t.ay / AH * BH - BH / 2; return new THREE.Vector3(x, hAt(x, z), z); };
  const wraps = (a, b) => Math.abs(TERR[a].ax - TERR[b].ax) > AW * 0.6;
  function vnoise(x, y) { const s = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (s(xi, yi) * (1 - u) + s(xi + 1, yi) * u) * (1 - v) + (s(xi, yi + 1) * (1 - u) + s(xi + 1, yi + 1) * u) * v; }
  const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;
  function hAt(x, z) { if (!heights) return 0.5; const gx = clamp((x + BW / 2) / BW * GW, 0, GW), gz = clamp((z + BH / 2) / BH * GH, 0, GH);
    return (heights[Math.round(gz) * (GW + 1) + Math.round(gx)] || 0) * FLAT + curve(x, z); }

  function buildRaster(maskImg) {
    const c = document.createElement('canvas'); c.width = RW; c.height = RH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(maskImg, 0, 0, RW, RH);
    const d = g.getImageData(0, 0, RW, RH).data; landA = new Uint8Array(RW * RH); idx = new Int8Array(RW * RH); bd = new Float32Array(RW * RH);
    const an = TIDS.map(id => [TERR[id].ax / AW * RW, TERR[id].ay / AH * RH]);
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const i = y * RW + x; landA[i] = d[i * 4] > 100 ? 1 : 0; let best = 1e12, sec = 1e12, bi = 0;
      for (let k = 0; k < an.length; k++) { const dx = x - an[k][0], dy = y - an[k][1], q = dx * dx + dy * dy; if (q < best) { sec = best; best = q; bi = k; } else if (q < sec) sec = q; } idx[i] = bi; bd[i] = (Math.sqrt(sec) - Math.sqrt(best)) * 0.5; }
    // heights on grid: raised slab, mountain ranges, grooves along territory borders
    heights = new Float32Array((GW + 1) * (GH + 1)); const sx = RW / GW, sy = RH / GH;
    for (let j = 0; j <= GH; j++) { for (let i = 0; i <= GW; i++) { let sum = 0, n = 0, border = 0; const cx = Math.min(RW - 1, Math.round(i * sx)), cy = Math.min(RH - 1, Math.round(j * sy)), k0 = idx[cy * RW + cx];
      for (let dy = -3; dy <= 3; dy += 3) for (let dx = -3; dx <= 3; dx += 3) { const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= RW || Y >= RH) continue; sum += landA[Y * RW + X]; n++; if (landA[Y * RW + X] && idx[Y * RW + X] !== k0) border = 1; }
      const l = n ? sum / n : 0, s = l * l * (3 - 2 * l), m = 0;
      let h = s * 0.62; if (border && s > 0.5) h = Math.max(0.3, h - 0.26);
      heights[j * (GW + 1) + i] = h; } }
    hp = new Float32Array(RW * RH); shade = new Float32Array(RW * RH);
    const hb = (x, y) => { const gx = clamp(x / sx, 0, GW - 0.001), gy = clamp(y / sy, 0, GH - 0.001), x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, w = GW + 1;
      return (heights[y0 * w + x0] * (1 - fx) + heights[y0 * w + x0 + 1] * fx) * (1 - fy) + (heights[(y0 + 1) * w + x0] * (1 - fx) + heights[(y0 + 1) * w + x0 + 1] * fx) * fy; };
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) hp[y * RW + x] = hb(x, y);
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const a = hp[Math.max(0, y - 3) * RW + Math.max(0, x - 3)], b = hp[Math.min(RH - 1, y + 3) * RW + Math.min(RW - 1, x + 3)]; shade[y * RW + x] = clamp(1 + (a - b) * 2.4, 0.5, 1.6); }
  }
  const COL = { you: [46, 150, 156], enemy: [138, 36, 30], waste: [58, 52, 48] };
  function paint(S) {
    const A = artData; const d = img.data, de = imgE.data, own = TIDS.map(id => S.terr[id].owner), obs = TIDS.map(id => S.obs[id] ? 1 : 0), si = sel ? TIDS.indexOf(sel) : -1;
    for (let y = 0; y < RH; y++) { const lat = 45;
      for (let x = 0; x < RW; x++) { const i = y * RW + x, o = i * 4; let r, g, b;
        let er = 0, eg = 0, eb = 0;
        if (!landA[i]) { const n = fbm(x * 0.012, y * 0.012); r = 7 + n * 9; g = 18 + n * 18; b = 38 + n * 32;
          const near = (x > 2 && landA[i - 3]) || (x < RW - 3 && landA[i + 3]) || (y > 2 && landA[i - 3 * RW]) || (y < RH - 3 && landA[i + 3 * RW]);
          if (near) { r += 18; g += 46; b += 56; }
          if (A) { r = A[o]; g = A[o + 1]; b = A[o + 2]; }
          if (x % 133 === 0 || y % 150 === 0) { r += 8; g += 12; b += 18; }
        } else { const k = idx[i], c = COL[own[k]], n = fbm(x * 0.03 + 11, y * 0.03 + 5), al = Math.abs(lat);
          let tr = 74, tg = 104, tb = 58; if (al > 60) { tr = 190; tg = 198; tb = 200; } else if (al > 14 && al < 33 && n > 0.42) { tr = 168; tg = 140; tb = 92; } else if (n > 0.6) { tr = 96; tg = 92; tb = 74; }
          const m = own[k] === 'waste' ? 0.85 : 0.5, sh = (0.74 + n * 0.4) * shade[i], hh = hp[i];
          if (hh > 0.95) { const t = Math.min(0.7, (hh - 0.95) / 0.4); tr += (128 - tr) * t; tg += (122 - tg) * t; tb += (114 - tb) * t; } const snow = hh > 1.22 ? Math.min(0.8, (hh - 1.22) / 0.25) : 0;
          r = (c[0] * m + tr * (1 - m)) * sh; g = (c[1] * m + tg * (1 - m)) * sh; b = (c[2] * m + tb * (1 - m)) * sh;
          if (A) { const am = own[k] === 'waste' ? 0.78 : own[k] === 'enemy' ? (obs[k] ? 0.5 : 0.42) : 0.34, lum = (A[o] + A[o + 1] + A[o + 2]) / 3 / 105; r = A[o] * (1 - am) + c[0] * lum * am; g = A[o + 1] * (1 - am) + c[1] * lum * am; b = A[o + 2] * (1 - am) + c[2] * lum * am; }
          if (snow && !A) { r += (236 * shade[i] - r) * snow; g += (240 * shade[i] - g) * snow; b += (246 * shade[i] - b) * snow; }
          if (own[k] === 'enemy') { const v = Math.abs(fbm(x * 0.08, y * 0.08) - 0.5); if (v < 0.03) { r += 40; g += 6; b += 2; er = 150; eg = 22; eb = 8; } if (!obs[k]) { r *= 0.8; g *= 0.8; b *= 0.84; } }
          const line = Math.max(0, 1 - bd[i] / 1.6), gl = Math.max(0, 1 - bd[i] / 7);
          if (k === si) { r = r * 1.12 + 8; g = g * 1.12 + 8; b = b * 1.12 + 4; const t = Math.max(line, gl * 0.75); r += (236 - r) * t; g += (190 - g) * t; b += (90 - b) * t; er = 200 * t; eg = 150 * t; eb = 50 * t; }
          else { const dk = 1 - 0.6 * line; r *= dk; g *= dk; b *= dk; const q = gl * (1 - line) * 0.4; r += c[0] * q; g += c[1] * q; b += c[2] * q;
            if (own[k] === 'you') { er = Math.max(er, 16 * gl); eg = Math.max(eg, 110 * gl); eb = Math.max(eb, 108 * gl); } else if (own[k] === 'enemy') { er = Math.max(er, 150 * gl); eg = Math.max(eg, 26 * gl); eb = Math.max(eb, 12 * gl); } }
        }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; de[o] = er; de[o + 1] = eg; de[o + 2] = eb; de[o + 3] = 255; } }
    texCtx.putImageData(img, 0, 0); tex.needsUpdate = true; ctxE.putImageData(imgE, 0, 0); texE.needsUpdate = true;
    if (trees) { const col = new THREE.Color(); treeT.forEach((k, n) => { const o = own[k], v = 0.75 + (n * 7919 % 100) / 200; if (o === 'you') col.setRGB(0.06 * v, 0.26 * v, 0.17 * v); else if (o === 'enemy') col.setRGB(0.19 * v, 0.04 * v, 0.035 * v); else col.setRGB(0.09, 0.08, 0.07); trees.setColorAt(n, col); }); trees.instanceColor.needsUpdate = true; }
  }
  // shared geometry and materials
  let G, M;
  function assets() {
    const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o || {}));
    M = { you: std(0x3fc4c0), youBase: std(0x1c5f66), enemy: std(0xa8281c, { emissive: 0x2a0502 }), unknown: std(0x5a2a26, { transparent: true, opacity: 0.75 }),
      leader: std(0x9a62e0, { emissive: 0x3b1470, roughness: 0.3 }), gold: std(0xd9ae52, { metalness: 0.6, roughness: 0.3 }), stone: std(0x8b93a0), dark: std(0x1b1714, { roughness: 1 }),
      ember: new THREE.MeshBasicMaterial({ color: 0xff6a2a }), team: std(0xf2f6ff, { emissive: 0x2aa6c8 }), arc: new THREE.MeshBasicMaterial({ color: 0xff5a40, transparent: true, opacity: 0.85 }),
      arcTeam: new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.8 }), link: new THREE.LineBasicMaterial({ color: 0xd9c9a0, transparent: true, opacity: 0.28 }),
      bldYou: std(0x93a3b8, { emissive: 0x6b4a16, emissiveIntensity: 0.55, roughness: 0.7 }), bldEnemy: std(0x3b2422, { emissive: 0x7a1408, emissiveIntensity: 0.6 }), rifle: std(0x10161f), blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, map: null }),
      sea: new THREE.LineDashedMaterial({ color: 0xd9c9a0, transparent: true, opacity: 0.3, dashSize: 0.7, gapSize: 0.6 }) };
    G = { base: new THREE.CylinderGeometry(0.34, 0.38, 0.1, 16), body: new THREE.CylinderGeometry(0.15, 0.24, 0.62, 10), head: new THREE.SphereGeometry(0.17, 12, 10),
      disc: new THREE.CylinderGeometry(0.46, 0.5, 0.17, 18), cone: new THREE.ConeGeometry(0.3, 1.5, 6), box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 20, 14),
      ring: new THREE.TorusGeometry(0.75, 0.05, 6, 28), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), circ: new THREE.CircleGeometry(1, 28), dish: new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4) };
  }
  const mesh = (g, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (sx !== undefined) o.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); o.castShadow = true; return o; };
  function soldier(x, z) { const g = new THREE.Group(); g.add(mesh(G.base, M.youBase, 0, 0.05), mesh(G.body, M.you, 0, 0.41), mesh(G.head, M.you, 0, 0.83), mesh(G.sph, M.youBase, 0, 0.9, 0, 0.2, 0.13, 0.2)); const r = mesh(G.box, M.rifle, 0.2, 0.52, 0.08, 0.05, 0.05, 0.6); r.rotation.x = -0.5; g.add(r); g.position.set(x, 0, z); g.scale.setScalar(1.3); return g; }
  function city(k, mat, n) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const a = Math.sin(k * 12.9 + i * 78.2) * 43758.5, rx = (a - Math.floor(a)) - 0.5, b2 = Math.sin(k * 3.1 + i * 51.7) * 9631.3, rz = (b2 - Math.floor(b2)) - 0.5, h = 0.3 + Math.abs(Math.sin(k + i * 2.3)) * (i < 2 ? 1.5 : 0.8), w = 0.24 + Math.abs(rx) * 0.3; g.add(mesh(G.box, mat, rx * 1.9, h / 2, rz * 1.2 - 0.9, w, h, w)); } return g; }
  const sprM = {}; let pieceImgs = {};
  function piece(name, x, z, size, dim) { const key = name + (dim ? 'd' : ''); if (!sprM[key]) { const t = new THREE.Texture(pieceImgs[name]); t.needsUpdate = true; t.encoding = THREE.sRGBEncoding; sprM[key] = new THREE.SpriteMaterial({ map: t, alphaTest: 0.3, transparent: true, color: dim ? 0x6f6a80 : 0xffffff, toneMapped: false }); }
    const sp = new THREE.Sprite(sprM[key]); sp.center.set(0.5, 0.04); sp.scale.set(size, size, 1); sp.position.set(x, 0.06, z); return sp; }
  function blob(x, z, r) { const m = new THREE.Mesh(G.circ, M.blob); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); m.scale.set(r, r * 0.7, 1); return m; }
  function glow(color, size) { const m = new THREE.Mesh(G.circ, new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.16; m.scale.setScalar(size); m.userData.pulse = 1; return m; }
  function spire(rank) { const g = new THREE.Group(), s = rank === 'overlord' ? 1.9 : rank === 'warlord' ? 1.35 : 0.95;
    g.add(mesh(G.cone, M.leader, 0, 0.75)); for (let i = 0; i < (rank === 'commander' ? 3 : 5); i++) { const a = i * 1.257, c = mesh(G.cone, M.leader, Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3, 0.6); c.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(c); }
    if (rank === 'overlord') g.add(mesh(G.ring, M.gold, 0, 1.2, 0, 0.5)).children[g.children.length - 1].rotation.x = Math.PI / 2;
    g.scale.setScalar(s * 0.75); return g; }
  function buildTokens(S) {
    while (tokens.children.length) tokens.remove(tokens.children[0]);
    for (const id of TIDS) { const T = S.terr[id], p = P(id), g = new THREE.Group(); g.position.copy(p); g.userData.grp = 1; tokens.add(g);
      const put = (name, x, z, size, dim) => { g.add(blob(x, z, size * 0.36), piece(name, x, z, size, dim)); };
      if (T.owner !== 'waste') g.add(glow(T.owner === 'you' ? 0x2fd0cc : 0xff3a1c, T.owner === 'you' ? 2.2 : 2.8));
      if (T.owner === 'you') { if (id === HQ) { put('foundry', 0, -1.1, 2.5); if (S.nuke.building || S.nuke.stage || S.nuke.ready) put('silo', -2.2, -1.3, 2.3); if (S.emp.building || S.emp.n) put('emp-tower', 2.3, -1.6, 2.2); if (S.up.bombers) put('drone-bay', -2.6, 0.4, 2.0); }
        if (T.radar) put('radar-dish', 1.6, -0.7, 2.0); if (T.fort) put('barricade', -1.5, 0.1, 1.5); if (T.battery) put(S.up.railgun ? 'railgun' : 'launcher', 1.6, 0.6, 1.8);
        const c = T.n >= 7 ? 3 : T.n >= 4 ? 2 : 1; for (let i = 0; i < c; i++) put(i === 2 ? 'rover' : 'infantry', (i - (c - 1) / 2) * 1.25, 0.35 + (i % 2) * 0.25, 1.9);
      } else if (T.owner === 'enemy') { const known = S.obs[id];
        if (!known) put('spore', 0, 0.2, 1.8, true); else { const ls = L.leadersAt(S, id); if (ls.some(l => l.rank === 'overlord')) put('hive', -0.2, -1.1, 2.8); else if (ls.some(l => l.rank === 'warlord')) put('hive-spire', -0.4, -1.0, 2.3);
          if (T.n >= 7) { put('infestation-cube', -0.8, 0.2, 1.9); put('swarm', 0.7, 0.5, 1.8); } else put(T.n >= 4 ? 'infestation-cube' : 'infestation-stack', 0, 0.3, 1.9);
          ls.forEach((l, k) => put(l.rank, 1.5 + k * 1.2, -0.2 + k * 0.2, l.rank === 'overlord' ? 2.9 : l.rank === 'warlord' ? 2.5 : 2.1)); }
      } else { const cr = mesh(G.cyl, M.dark, 0, 0.03, 0, 1.5, 0.06, 1.5); cr.castShadow = false; g.add(cr); const e = mesh(G.ring, M.ember, 0, 0.08, 0, 1.6); e.rotation.x = Math.PI / 2; e.castShadow = false; g.add(e); }
    }
    for (const l of S.leaders) if (l.alive && L.leaderKnown(S, l) && !S.obs[l.at]) { const p = P(l.at), sp = piece(l.rank, p.x + 1.2, p.z, 1.8); sp.position.y = p.y + 0.06; tokens.add(sp); }
  }
  function curveFor(a, b, lift) { const A = P(a), B = P(b); const segs = [];
    const mk = (p, q) => { const m = p.clone().lerp(q, 0.5); m.y = Math.max(p.y, q.y) + (lift || 1.2) + p.distanceTo(q) * 0.16; return new THREE.QuadraticBezierCurve3(p.clone().setY(p.y + 0.5), m, q.clone().setY(q.y + 0.5)); };
    if (wraps(a, b)) { const left = A.x < B.x ? A : B, right = A.x < B.x ? B : A, zm = (A.z + B.z) / 2; const e1 = new THREE.Vector3(-BW / 2 - 3, 0.3, zm), e2 = new THREE.Vector3(BW / 2 + 3, 0.3, zm);
      if (A === left) segs.push(mk(A, e1), mk(e2, B)); else segs.push(mk(A, e2), mk(e1, B)); } else segs.push(mk(A, B));
    return { at(f) { f = clamp(f, 0, 1); if (segs.length === 1) return segs[0].getPoint(f); return f < 0.5 ? segs[0].getPoint(f * 2) : segs[1].getPoint((f - 0.5) * 2); }, segs }; }
  function buildLinks() { const g = new THREE.Group();
    for (const l of LINKS) { const c = curveFor(l[0], l[1], 0.1); for (const s of c.segs) { const pts = []; for (let i = 0; i <= 20; i++) { const p = s.getPoint(i / 20); p.y = Math.max(0.12, hAt(p.x, p.z) + 0.12) + (l[2] ? Math.sin(i / 20 * Math.PI) * 0.5 : 0); pts.push(p); }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), l[2] ? M.sea : M.link); if (l[2]) line.computeLineDistances(); g.add(line); } }
    scene.add(g); }
  function buildArcs(S) { while (arcs.children.length) { const c = arcs.children[0]; arcs.remove(c); if (c.geometry && c.userData.own) c.geometry.dispose(); }
    partyLabels.forEach(d => d.remove()); partyLabels = [];
    for (const p of S.parties) { if (!L.partyVisible(S, p)) continue; const c = curveFor(p.from, p.to);
      for (const s of c.segs) { const t = new THREE.Mesh(new THREE.TubeGeometry(s, 24, 0.07, 5), M.arc); t.userData.own = 1; arcs.add(t); }
      const head = piece('swarm', 0, 0, 2.2); head.userData = { party: p, curve: c }; arcs.add(head);
      const d = document.createElement('div'); d.className = 'plabel'; labelsEl.appendChild(d); d._p = p; d._head = head; partyLabels.push(d); }
    const tm = S.team; if (tm.dest) { const c = curveFor(tm.from, tm.dest); for (const s of c.segs) { const t = new THREE.Mesh(new THREE.TubeGeometry(s, 24, 0.05, 5), M.arcTeam); t.userData.own = 1; arcs.add(t); } teamTok.userData.curve = c; } else teamTok.userData.curve = null; }

  function init(container, pick, art) { el = container; onPick = pick;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; renderer.setClearColor(0x070c15); el.appendChild(renderer.domElement);
    labelsEl = document.createElement('div'); labelsEl.className = 'labels'; el.appendChild(labelsEl);
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x070c15, 120, 260); camera = new THREE.PerspectiveCamera(34, 1, 0.5, 500);
    pieceImgs = art.pieces; assets(); buildRaster(art.mask); { const c0 = document.createElement('canvas'); c0.width = RW; c0.height = RH; const g0 = c0.getContext('2d'); g0.drawImage(art.map, 0, 0, RW, RH); artData = g0.getImageData(0, 0, RW, RH).data; }
    const c = document.createElement('canvas'); c.width = RW; c.height = RH; texCtx = c.getContext('2d'); img = texCtx.createImageData(RW, RH); tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    const ce = document.createElement('canvas'); ce.width = RW; ce.height = RH; ctxE = ce.getContext('2d'); imgE = ctxE.createImageData(RW, RH); texE = new THREE.CanvasTexture(ce); texE.encoding = THREE.sRGBEncoding;
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d'), gr = gg.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(gc);
    const geo = new THREE.PlaneGeometry(BW, BH, GW, GH); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, heights[i] * FLAT + curve(pos.getX(i), pos.getZ(i))); geo.computeVertexNormals();
    boardMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0.02, emissive: 0xffffff, emissiveMap: texE, emissiveIntensity: 0.45 })); boardMesh.receiveShadow = true; boardMesh.castShadow = true; scene.add(boardMesh);
    // moving water shimmer and drifting clouds
    { const wc = document.createElement('canvas'); wc.width = wc.height = 256; const w = wc.getContext('2d'), id2 = w.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const v = Math.pow(fbm((i % 256) * 0.06, (i >> 8) * 0.06), 3) * 255; id2.data[i * 4] = v * 0.5; id2.data[i * 4 + 1] = v * 0.85; id2.data[i * 4 + 2] = v; id2.data[i * 4 + 3] = 255; } w.putImageData(id2, 0, 0);
      seaTex = new THREE.CanvasTexture(wc); seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(9, 3.5); const sg = new THREE.PlaneGeometry(BW, BH, 48, 28); sg.rotateX(-Math.PI / 2); for (let i = 0; i < sg.attributes.position.count; i++) sg.attributes.position.setY(i, 0.07 + curve(sg.attributes.position.getX(i), sg.attributes.position.getZ(i))); const sea = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: seaTex, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(sea);
      for (let i = 0; i < 9; i++) { const c2 = new THREE.Mesh(G.circ, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xcfe0ff, transparent: true, opacity: 0.1, depthWrite: false })); c2.rotation.x = -Math.PI / 2; c2.position.set(-BW / 2 + i * 15, 7 + (i % 3), -BH / 2 + ((i * 37) % 46)); c2.scale.set(11 + i % 4 * 3, 6 + i % 3 * 2, 1); scene.add(c2); clouds.push(c2); } }
    // frame and table
    const fm = new THREE.MeshStandardMaterial({ color: 0x6d5324, metalness: 0.7, roughness: 0.35 }), tb = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.9 });
    const table = mesh(G.box, tb, 0, -3.4, 0, 400, 0.6, 300); table.castShadow = false; table.receiveShadow = true; scene.add(table);
    scene.add(new THREE.HemisphereLight(0xa9c4ff, 0x241708, 0.42)); const rim = new THREE.DirectionalLight(0x4f78c8, 0.45); rim.position.set(50, 30, -40); scene.add(rim); const sun = new THREE.DirectionalLight(0xffd9a0, 1.3); sun.position.set(-62, 44, 34); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.mapSize.set(4096, 4096); const sc = sun.shadow.camera; sc.left = -72; sc.right = 72; sc.top = 48; sc.bottom = -48; sc.far = 220; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.06; scene.add(sun);
    tokens = new THREE.Group(); arcs = new THREE.Group(); fxGroup = new THREE.Group(); scene.add(tokens, arcs, fxGroup); buildLinks();
    teamTok = new THREE.Group(); const tc = piece('tiltrotor', 0, 0, 2.3); const tr = mesh(G.ring, M.team, 0, 0.5, 0, 0.9); tr.rotation.x = Math.PI / 2; teamTok.add(tc, tr); scene.add(teamTok);
    for (const id of TIDS) { const d = document.createElement('div'); d.className = 'tlabel'; d.innerHTML = '<span class="tn"></span><b></b><i></i>'; labelsEl.appendChild(d); labels[id] = d; }
    controls(); resize(); window.addEventListener('resize', resize);
    if (el.clientWidth < 700 && el.clientHeight > el.clientWidth) { cam.tx = 24; cam.tz = -2; cam.dist = 70; } else fit(); }
  function fit() { const a = el.clientWidth / Math.max(1, el.clientHeight), t = Math.tan(17 * Math.PI / 180); cam.tx = 0; cam.tz = 2; cam.yaw = 0; cam.dist = clamp(Math.max((BW + 8) / (2 * t * a), (BH + 14) / (2 * t) * 0.8), 30, 190); }
  function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; if (resize.w && (w > h) !== (resize.w > resize.h)) setTimeout(() => { if (w > h) fit(); }, 50); resize.w = w; resize.h = h; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function controls() { const dom = renderer.domElement, pts = new Map(); let moved = 0, pinch = 0, down = null; dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; down = { x: e.clientX, y: e.clientY, btn: e.button }; try { dom.setPointerCapture(e.pointerId); } catch (_) {} if (pts.size === 2) { const a = [...pts.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
    dom.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2) { const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 24, 190); pinch = d; return; }
      if (down && (down.btn === 2 || e.shiftKey)) { cam.yaw -= dx * 0.005; cam.pitch = clamp(cam.pitch + dy * 0.004, 0.45, 1.45); return; }
      const k = cam.dist * 0.0013 * (900 / Math.max(300, el.clientHeight)), c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); cam.tx -= (dx * c + dy * s) * k; cam.tz -= (-dx * s + dy * c) * k; });
    let lastPick = 0; const up = e => { pts.delete(e.pointerId); pinch = 0; if (moved < 8 && down && down.btn !== 2) { lastPick = performance.now(); pickAt(e.clientX, e.clientY); } down = null; };
    dom.addEventListener('click', e => { if (performance.now() - lastPick > 400 && moved < 8) { lastPick = performance.now(); pickAt(e.clientX, e.clientY); } });
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = 0; });
    dom.addEventListener('wheel', e => { e.preventDefault(); cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.12 : 0.89), 24, 190); }, { passive: false }); dom.addEventListener('contextmenu', e => e.preventDefault()); }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  function pickAt(cx, cy) { const r = renderer.domElement.getBoundingClientRect(); ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -(cy - r.top) / r.height * 2 + 1 }, camera);
    const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return; for (let n = 0; n < 3; n++) { plane.constant = -(0.3 + curve(hit.x, hit.z)); if (!ray.ray.intersectPlane(plane, hit)) break; } plane.constant = -0.5; let best = null, bd = 1e9; for (const id of TIDS) { const p = P(id), d = Math.hypot(p.x - hit.x, p.z - hit.z); if (d < bd) { bd = d; best = id; } }
    const X = Math.round((hit.x + BW / 2) / BW * RW), Y = Math.round((hit.z + BH / 2) / BH * RH);
    if (X >= 0 && Y >= 0 && X < RW && Y < RH && landA[Y * RW + X]) return onPick(TIDS[idx[Y * RW + X]]); if (bd < 4.5) onPick(best); else onPick(null); }
  function sync(S, selected) { S0 = S; sel = selected;
    const st = TIDS.map(id => { const T = S.terr[id]; return T.owner[0] + (S.obs[id] ? 1 : 0); }).join('') + sel; if (st !== sigTex) { sigTex = st; paint(S); }
    const sk = TIDS.map(id => { const T = S.terr[id]; return T.owner[0] + (T.owner === 'you' ? (T.n >= 7 ? 3 : T.n >= 4 ? 2 : 1) : (S.obs[id] ? T.n : 'u' + T.seenN)) + (T.fort | 0) + (T.radar | 0) + (T.battery | 0); }).join('') + [S.nuke.building, S.nuke.stage, S.nuke.ready, S.emp.building, S.emp.n, S.up.bombers, S.up.railgun].map(x => +!!x).join('') + S.leaders.map(l => l.alive && L.leaderKnown(S, l) ? l.at + l.rank[0] : '-').join('');
    if (sk !== sigTok) { sigTok = sk; buildTokens(S); }
    const sa = S.parties.map(p => p.id + (L.partyVisible(S, p) ? 'v' : 'h')).join(',') + '|' + (S.team.dest || ''); if (sa !== sync.sa) { sync.sa = sa; buildArcs(S); }
    const threat = {}; for (const p of S.parties) if (L.partyVisible(S, p)) threat[p.to] = 1;
    for (const id of TIDS) { const T = S.terr[id], d = labels[id], known = S.obs[id]; d.className = 'tlabel ' + T.owner + (id === sel ? ' sel' : '') + (threat[id] ? ' threat' : '') + (id === HQ ? ' hq' : '');
      d.children[0].textContent = TERR[id].name; d.children[1].textContent = T.owner === 'waste' ? '☢' : T.owner === 'enemy' ? (known ? L.enemyDefense(S, id) : '?') : T.n;
      const ls = S.leaders.filter(l => l.alive && l.at === id && L.leaderKnown(S, l)); d.children[2].textContent = ls.map(l => l.rank === 'overlord' ? '♛' : l.rank === 'warlord' ? '★' : '▲').join(''); } }
  const v3 = new THREE.Vector3();
  function place(d, p, dy, below) { v3.copy(p); v3.y += dy; v3.project(camera); if (v3.z > 1) { d.style.display = 'none'; return; } d.style.display = ''; d.style.transform = (below ? 'translate(-50%,5px) translate(' : 'translate(-50%,-50%) translate(') + ((v3.x + 1) / 2 * el.clientWidth).toFixed(1) + 'px,' + ((1 - v3.y) / 2 * el.clientHeight).toFixed(1) + 'px)'; }
  function frame(dt) { time += dt; cam.tx = clamp(cam.tx, -BW / 2, BW / 2); cam.tz = clamp(cam.tz, -BH / 2, BH / 2 + 6);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch); camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, sp * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.tx, 0, cam.tz);
    const ppu = el.clientHeight / (2 * cam.dist * 0.3057); labelsEl.classList.toggle('far', ppu < 7.5); labelsEl.classList.toggle('mid', ppu >= 7.5 && ppu < 13);
    if (S0) { for (const id of TIDS) place(labels[id], P(id), 0, true);
      for (const c of arcs.children) if (c.userData.party) { const p = c.userData.party, f = (S0.t + (V.frac || 0) - p.t0) / (p.eta - p.t0), q = c.userData.curve.at(f), q2 = c.userData.curve.at(f + 0.02); c.position.copy(q); }
      for (const d of partyLabels) { d.textContent = d._p.n + ' · ' + Math.max(0, d._p.eta - S0.t) + 'h'; place(d, d._head.position, 1.2); }
      const tm = S0.team; if (tm.dest && teamTok.userData.curve) teamTok.position.copy(teamTok.userData.curve.at((S0.t + (V.frac || 0) - tm.t0) / Math.max(1, tm.eta - tm.t0))); else { const p = P(tm.at); teamTok.position.set(p.x - 1.5, p.y + 0.2, p.z - 0.6); }
      teamTok.children[1].rotation.z = time * 1.5; teamTok.children[0].position.y = 0.9 + Math.sin(time * 2.4) * 0.1; }
    const zf = clamp(cam.dist / 46, 1, 2.5); for (const t of tokens.children) if (t.userData.grp) t.scale.setScalar(0.9 * zf); teamTok.scale.setScalar(zf); V.zf = zf;
    for (const t of tokens.children) { if (t.userData.pulse) t.material.opacity = 0.32 + Math.sin(time * 2.2) * 0.12; else for (const c of t.children) if (c.userData.pulse) c.material.opacity = 0.24 + Math.sin(time * 1.8 + t.position.x) * 0.1; }
    if (seaTex) { seaTex.offset.x = time * 0.006; seaTex.offset.y = time * 0.004; } for (const c of clouds) { c.position.x += dt * 0.5; if (c.position.x > BW / 2 + 16) c.position.x = -BW / 2 - 16; }
    if (boardMesh) boardMesh.material.emissiveIntensity = 0.42 + Math.sin(time * 1.4) * 0.14;
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.update(f.t) === false) { fxGroup.remove(f.obj); fx.splice(i, 1); } }
    renderer.render(scene, camera); }
  function flash(p, size, color, dur) { const m = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })); m.position.copy(p); fxGroup.add(m);
    fx.push({ obj: m, t: 0, update(t) { const k = t / dur; if (k >= 1) return false; m.scale.setScalar(0.2 + size * Math.sqrt(k)); m.material.opacity = 0.9 * (1 - k); } }); }
  function missile(from, to, kind) { const A = P(from), B = P(to), big = kind === 'nuke', c = new THREE.QuadraticBezierCurve3(A.clone().setY(A.y + 0.6), A.clone().lerp(B, 0.5).setY(8 + A.distanceTo(B) * 0.2), B.clone().setY(B.y + 0.3));
    const m = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: kind === 'emp' ? 0x8fd8ff : big ? 0xffe9a0 : 0xffb060 })); m.scale.setScalar(big ? 0.45 : 0.25); fxGroup.add(m); const dur = big ? 2.2 : 1.1;
    fx.push({ obj: m, t: 0, update(t) { if (t >= dur) { flash(B, big ? 9 : kind === 'emp' ? 5 : 2.6, kind === 'emp' ? 0x7fd0ff : 0xffa040, big ? 2.4 : 0.8); if (big) flash(B, 4, 0xffffff, 1.2); return false; } m.position.copy(c.getPoint(t / dur)); } }); }
  function focus(id, lift) { const p = P(id); if (cam.dist > 70) cam.dist = 60; cam.tx = p.x; cam.tz = p.z + 2 + (lift ? cam.dist * 0.3 : 0); }
  return { init, sync, frame, setArt, missile, flash: id => flash(P(id), 2.5, 0xff5030, 0.7), focus, fit, cam, resize, zoom: k => { cam.dist = clamp(cam.dist * k, 24, 190); }, rotate: a => { cam.yaw += a; }, tilt: () => { cam.pitch = cam.pitch > 1.2 ? 1.02 : cam.pitch > 0.9 ? 0.7 : 1.45; } };
})();
