// ---------- 3D board ----------
const V = (() => {
  const BW = 120, BH = 67.5, RW = 1920, RH = 1080, GW = 320, GH = 180, FLAT = 0.95;
  const MERC = d => Math.log(Math.tan(Math.PI / 4 + d * Math.PI / 360)), MT = MERC(78), MB = MERC(-60), fy = lat => (MT - MERC(clamp(lat, -89, 89))) / (MT - MB), latOf = f => (2 * Math.atan(Math.exp(MT - f * (MT - MB))) - Math.PI / 2) * 180 / Math.PI;
  const px = lon => (lon + 180) / 360 * RW, py = lat => fy(lat) * RH;
  const wx = lon => (lon + 180) / 360 * BW - BW / 2, wz = lat => fy(lat) * BH - BH / 2, AW = 1920, AH = 1080;
  const curve = (x, z) => -(z * z) / 1500; let worldRoot = null;
  let bd, cd, landF, idx2, idx2G; let renderer, scene, camera, el, labelsEl, tex, texCtx, img, idx, landA, heights, boardMesh, hp, shade, texE, ctxE, imgE, trees, treeT = [], seaTex, clouds = [], glowTex;
  let tokens, arcs, fxGroup, labels = {}, partyLabels = [], sigTok = '', sigTex = '', sel = null, onPick = () => {};
  const cam = { tx: -28, tz: -8, dist: 70, yaw: 0, pitch: 1.02 };
  const fx = []; let teamTok, time = 0, S0 = null, artData = null, INF = null;
  function setArt(image) { const c = document.createElement('canvas'); c.width = RW; c.height = RH; const g = c.getContext('2d'); g.drawImage(image, 0, 0, RW, RH); artData = g.getImageData(0, 0, RW, RH).data; if (trees) trees.visible = false; sigTex = ''; if (S0) sync(S0, sel); }
  let mode = 'board', boardRoot, globeRoot = null, globeImg = null, idxG, landG, bdG, texG, ctxG, imgG, artG, sigTexG = '', GWp = 0, GHp = 0;
  const GR = 26, gl = { lon: 125, lat: 28, dist: 96 };
  const gdir = (lat, lon) => { const ph = (lon + 180) * Math.PI / 180, la = lat * Math.PI / 180, c = Math.cos(la); return new THREE.Vector3(-Math.cos(ph) * c, Math.sin(la), Math.sin(ph) * c); };
  const P = id => { const t = TERR[id]; if (mode === 'globe') return gdir(t.lat, t.lon).multiplyScalar(GR + 0.02); const x = t.ax / AW * BW - BW / 2, z = t.ay / AH * BH - BH / 2; return new THREE.Vector3(x, hAt(x, z), z); };
  const wraps = (a, b) => Math.abs(TERR[a].ax - TERR[b].ax) > AW * 0.6;
  function vnoise(x, y) { const s = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (s(xi, yi) * (1 - u) + s(xi + 1, yi) * u) * (1 - v) + (s(xi, yi + 1) * (1 - u) + s(xi + 1, yi + 1) * u) * v; }
  const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;
  function hAt(x, z) { if (!heights) return 0.5; const gx = clamp((x + BW / 2) / BW * GW, 0, GW), gz = clamp((z + BH / 2) / BH * GH, 0, GH);
    return (heights[Math.round(gz) * (GW + 1) + Math.round(gx)] || 0) * FLAT + curve(x, z); }

  function buildRaster(maskImg) {
    const c = document.createElement('canvas'); c.width = RW; c.height = RH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(maskImg, 0, 0, RW, RH);
    const d = g.getImageData(0, 0, RW, RH).data; landA = new Uint8Array(RW * RH); idx = new Int8Array(RW * RH); idx2 = new Int8Array(RW * RH); bd = new Float32Array(RW * RH);
    const an = TIDS.map(id => [TERR[id].ax / AW * RW, TERR[id].ay / AH * RH]);
    { const N = RW * RH, din = new Float32Array(N), dout = new Float32Array(N), ch = D => { for (let y = 1; y < RH; y++) for (let x = 1; x < RW - 1; x++) { const i = y * RW + x; if (D[i]) D[i] = Math.min(D[i], D[i - 1] + 1, D[i - RW] + 1, D[i - RW - 1] + 1.414, D[i - RW + 1] + 1.414); } for (let y = RH - 2; y >= 0; y--) for (let x = RW - 2; x > 0; x--) { const i = y * RW + x; if (D[i]) D[i] = Math.min(D[i], D[i + 1] + 1, D[i + RW] + 1, D[i + RW + 1] + 1.414, D[i + RW - 1] + 1.414); } };
      for (let i = 0; i < N; i++) { const m = d[i * 4] > 100; din[i] = m ? 99 : 0; dout[i] = m ? 0 : 99; } ch(din); ch(dout);
      for (let i = 0; i < N; i++) { const o = i * 4, col = artData[o] > artData[o + 2] * 1.04; landA[i] = (din[i] > 7 || (col && dout[i] < 12)) ? 1 : 0; }
      landF = new Float32Array(N); for (let y = 2; y < RH - 2; y++) for (let x = 2; x < RW - 2; x++) { const i = y * RW + x; let sm = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) sm += landA[i + dy * RW + dx]; landF[i] = sm / 25; } }
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const i = y * RW + x; let best = 1e12, sec = 1e12, bi = 0, si2 = 0;
      for (let k = 0; k < an.length; k++) { const dx = x - an[k][0], dy = y - an[k][1], q = dx * dx + dy * dy; if (q < best) { sec = best; si2 = bi; best = q; bi = k; } else if (q < sec) { sec = q; si2 = k; } } idx[i] = bi; idx2[i] = si2; bd[i] = (Math.sqrt(sec) - Math.sqrt(best)) * 0.5; }
    cd = new Float32Array(RW * RH); for (let i = 0; i < RW * RH; i++) cd[i] = landA[i] ? 99 : 0;
    for (let y = 1; y < RH; y++) for (let x = 1; x < RW - 1; x++) { const i = y * RW + x; if (cd[i]) cd[i] = Math.min(cd[i], cd[i - 1] + 1, cd[i - RW] + 1, cd[i - RW - 1] + 1.414, cd[i - RW + 1] + 1.414); }
    for (let y = RH - 2; y >= 0; y--) for (let x = RW - 2; x > 0; x--) { const i = y * RW + x; if (cd[i]) cd[i] = Math.min(cd[i], cd[i + 1] + 1, cd[i + RW] + 1, cd[i + RW + 1] + 1.414, cd[i + RW - 1] + 1.414); }
    // heights on grid: raised slab, mountain ranges, grooves along territory borders
    heights = new Float32Array((GW + 1) * (GH + 1)); const sx = RW / GW, sy = RH / GH;
    for (let j = 0; j <= GH; j++) { for (let i = 0; i <= GW; i++) { let sum = 0, n = 0, border = 0; const cx = Math.min(RW - 1, Math.round(i * sx)), cy = Math.min(RH - 1, Math.round(j * sy)), k0 = idx[cy * RW + cx];
      for (let dy = -6; dy <= 6; dy += 3) for (let dx = -6; dx <= 6; dx += 3) { const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= RW || Y >= RH) continue; sum += landA[Y * RW + X]; n++; if (landA[Y * RW + X] && idx[Y * RW + X] !== k0) border = 1; }
      const l = n ? sum / n : 0, s = l * l * (3 - 2 * l), m = 0;
      let h = s * 0.62; if (border && s > 0.5) h = Math.max(0.3, h - 0.3);
      heights[j * (GW + 1) + i] = h; } }
    hp = new Float32Array(RW * RH); shade = new Float32Array(RW * RH);
    const hb = (x, y) => { const gx = clamp(x / sx, 0, GW - 0.001), gy = clamp(y / sy, 0, GH - 0.001), x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, w = GW + 1;
      return (heights[y0 * w + x0] * (1 - fx) + heights[y0 * w + x0 + 1] * fx) * (1 - fy) + (heights[(y0 + 1) * w + x0] * (1 - fx) + heights[(y0 + 1) * w + x0 + 1] * fx) * fy; };
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) hp[y * RW + x] = hb(x, y);
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const a = hp[Math.max(0, y - 3) * RW + Math.max(0, x - 3)], b = hp[Math.min(RH - 1, y + 3) * RW + Math.min(RW - 1, x + 3)]; shade[y * RW + x] = clamp(1 + (a - b) * 2.4, 0.5, 1.6); }
  }
  const COL = { you: [38, 178, 176], enemy: [206, 62, 40], waste: [58, 52, 48] };
  function paint(S) {
    const A = artData; const d = img.data, de = imgE.data, own = TIDS.map(id => S.terr[id].owner), obs = TIDS.map(id => S.obs[id] ? 1 : 0), si = sel ? TIDS.indexOf(sel) : -1;
    for (let y = 0; y < RH; y++) { const lat = 45;
      for (let x = 0; x < RW; x++) { const i = y * RW + x, o = i * 4; let r, g, b;
        let er = 0, eg = 0, eb = 0, lf = 0;
        if (landF[i] < 0.05) { const n = fbm(x * 0.012, y * 0.012); r = 7 + n * 9; g = 18 + n * 18; b = 38 + n * 32;
          const near = (x > 2 && landA[i - 3]) || (x < RW - 3 && landA[i + 3]) || (y > 2 && landA[i - 3 * RW]) || (y < RH - 3 && landA[i + 3 * RW]);
          if (near) { r += 18; g += 46; b += 56; }
          if (A) { r = A[o]; g = A[o + 1]; b = A[o + 2]; }
          
        } else { const k = idx[i], c = COL[own[k]], n = fbm(x * 0.03 + 11, y * 0.03 + 5), al = Math.abs(lat);
          let tr = 74, tg = 104, tb = 58; if (al > 60) { tr = 190; tg = 198; tb = 200; } else if (al > 14 && al < 33 && n > 0.42) { tr = 168; tg = 140; tb = 92; } else if (n > 0.6) { tr = 96; tg = 92; tb = 74; }
          const m = own[k] === 'waste' ? 0.85 : 0.5, sh = (0.74 + n * 0.4) * shade[i], hh = hp[i];
          if (hh > 0.95) { const t = Math.min(0.7, (hh - 0.95) / 0.4); tr += (128 - tr) * t; tg += (122 - tg) * t; tb += (114 - tb) * t; } const snow = hh > 1.22 ? Math.min(0.8, (hh - 1.22) / 0.25) : 0;
          r = (c[0] * m + tr * (1 - m)) * sh; g = (c[1] * m + tg * (1 - m)) * sh; b = (c[2] * m + tb * (1 - m)) * sh;
          if (A) { const am = own[k] === 'waste' ? 0.8 : own[k] === 'enemy' ? (obs[k] ? 0.62 : 0.5) : 0.46, lum = (A[o] + A[o + 1] + A[o + 2]) / 3 / 112; r = A[o] * (1 - am) + c[0] * lum * am; g = A[o + 1] * (1 - am) + c[1] * lum * am; b = A[o + 2] * (1 - am) + c[2] * lum * am; }
          if (snow && !A) { r += (236 * shade[i] - r) * snow; g += (240 * shade[i] - g) * snow; b += (246 * shade[i] - b) * snow; }
          if (own[k] === 'enemy') { const v = Math.abs(fbm(x * 0.08, y * 0.08) - 0.5); const bl = fbm(x * 0.018 + 50, y * 0.018 + 20); if (INF) { const io = ((y % INF.h) * INF.w + (x % INF.w)) * 4, m2 = 0.55; r = r * (1 - m2) + INF.d[io] * m2; g = g * (1 - m2) + INF.d[io + 1] * m2; b = b * (1 - m2) + INF.d[io + 2] * m2; } else { if (bl > 0.56) { const q = Math.min(1, (bl - 0.56) * 6) * 0.45; r = r * (1 - q) + 70 * q; g = g * (1 - q) + 12 * q; b = b * (1 - q) + 40 * q; } const v2 = Math.abs(fbm(x * 0.035 + 9, y * 0.035 + 4) - 0.5); if (v < 0.03 || v2 < 0.022) { const q = v2 < 0.022 ? 1 : 0.7; r += 62 * q; g += 16 * q; b += 6 * q; er = 190 * q; eg = 44 * q; eb = 14 * q; } }
            if (!obs[k]) { r *= 0.8; g *= 0.8; b *= 0.84; } }
          const front = own[idx2[i]] !== own[k] || k === si || idx2[i] === si, line = 0, gl = Math.max(Math.max(0, 1 - bd[i] / (front ? 14 : 5)) * (front ? 1 : 0.35), Math.max(0, 1 - cd[i] / 9) * 0.9); lf = landF[i];
          if (k === si) { r = r * 1.12 + 8; g = g * 1.12 + 8; b = b * 1.12 + 4; const t = Math.max(line, gl * 0.75); r += (236 - r) * t; g += (190 - g) * t; b += (90 - b) * t; er = 200 * t; eg = 150 * t; eb = 50 * t; }
          else { const q = gl * gl * 0.62; r += (c[0] * 1.15 - r) * q; g += (c[1] * 1.15 - g) * q; b += (c[2] * 1.15 - b) * q;
            if (own[k] === 'you') { er = Math.max(er, 20 * gl * gl); eg = Math.max(eg, 150 * gl * gl); eb = Math.max(eb, 150 * gl * gl); } else if (own[k] === 'enemy') { er = Math.max(er, 200 * gl * gl); eg = Math.max(eg, 40 * gl * gl); eb = Math.max(eb, 16 * gl * gl); } }
        }
        if (A && lf > 0 && lf < 1) { r = A[o] * (1 - lf) + r * lf; g = A[o + 1] * (1 - lf) + g * lf; b = A[o + 2] * (1 - lf) + b * lf; er *= lf; eg *= lf; eb *= lf; }
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
      ember: new THREE.MeshBasicMaterial({ color: 0xff6a2a }), team: std(0xf2f6ff, { emissive: 0x2aa6c8 }), arc: new THREE.MeshBasicMaterial({ color: 0xff5c3c, transparent: true, opacity: 0.9, toneMapped: false }),
      arcTeam: new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.8 }), link: new THREE.LineBasicMaterial({ color: 0xf4ead0, transparent: true, opacity: 0.6 }), node: new THREE.MeshBasicMaterial({ color: 0xfaf3df, toneMapped: false }), nodeYou: new THREE.MeshBasicMaterial({ color: 0x3fd8d2, toneMapped: false }), nodeEnemy: new THREE.MeshBasicMaterial({ color: 0xff6a4a, toneMapped: false }), nodeWaste: new THREE.MeshBasicMaterial({ color: 0x55504a, toneMapped: false }),
      bldYou: std(0x93a3b8, { emissive: 0x6b4a16, emissiveIntensity: 0.55, roughness: 0.7 }), bldEnemy: std(0x3b2422, { emissive: 0x7a1408, emissiveIntensity: 0.6 }), rifle: std(0x10161f), blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, map: null }),
      sea: new THREE.LineDashedMaterial({ color: 0xf4ead0, transparent: true, opacity: 0.55, dashSize: 0.8, gapSize: 0.55 }) };
    G = { base: new THREE.CylinderGeometry(0.34, 0.38, 0.1, 16), body: new THREE.CylinderGeometry(0.15, 0.24, 0.62, 10), head: new THREE.SphereGeometry(0.17, 12, 10),
      disc: new THREE.CylinderGeometry(0.46, 0.5, 0.17, 18), cone: new THREE.ConeGeometry(0.3, 1.5, 6), box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 20, 14),
      ring: new THREE.TorusGeometry(0.75, 0.05, 6, 28), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), circ: new THREE.CircleGeometry(1, 28), nring: new THREE.RingGeometry(0.34, 0.52, 28), ndot: new THREE.CircleGeometry(0.3, 20), dish: new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4) };
  }
  const mesh = (g, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (sx !== undefined) o.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); o.castShadow = true; return o; };
  function soldier(x, z) { const g = new THREE.Group(); g.add(mesh(G.base, M.youBase, 0, 0.05), mesh(G.body, M.you, 0, 0.41), mesh(G.head, M.you, 0, 0.83), mesh(G.sph, M.youBase, 0, 0.9, 0, 0.2, 0.13, 0.2)); const r = mesh(G.box, M.rifle, 0.2, 0.52, 0.08, 0.05, 0.05, 0.6); r.rotation.x = -0.5; g.add(r); g.position.set(x, 0, z); g.scale.setScalar(1.3); return g; }
  function city(k, mat, n) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const a = Math.sin(k * 12.9 + i * 78.2) * 43758.5, rx = (a - Math.floor(a)) - 0.5, b2 = Math.sin(k * 3.1 + i * 51.7) * 9631.3, rz = (b2 - Math.floor(b2)) - 0.5, h = 0.3 + Math.abs(Math.sin(k + i * 2.3)) * (i < 2 ? 1.5 : 0.8), w = 0.24 + Math.abs(rx) * 0.3; g.add(mesh(G.box, mat, rx * 1.9, h / 2, rz * 1.2 - 0.9, w, h, w)); } return g; }
  let camS = null, glS = null; const UP = new THREE.Vector3(0, 1, 0); const sprM = {}; let pieceImgs = {};
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
    for (const id of TIDS) { const T = S.terr[id], p = P(id), g = new THREE.Group(); g.position.copy(p); g.userData.grp = 1; if (mode === 'globe') g.quaternion.setFromUnitVectors(UP, p.clone().normalize()); tokens.add(g);
      { const nr = new THREE.Mesh(G.nring, M.node), nd = new THREE.Mesh(G.ndot, T.owner === 'you' ? M.nodeYou : T.owner === 'enemy' ? M.nodeEnemy : M.nodeWaste); nr.rotation.x = nd.rotation.x = -Math.PI / 2; nr.position.y = nd.position.y = 0.14; nr.renderOrder = nd.renderOrder = 3; g.add(nr, nd); }
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
    for (const l of S.leaders) if (l.alive && L.leaderKnown(S, l) && !S.obs[l.at]) { const p = P(l.at), sp = piece(l.rank, 0, 0, 1.8); if (mode === 'globe') sp.position.copy(p).multiplyScalar(1.02); else sp.position.set(p.x + 1.2, p.y + 0.06, p.z); tokens.add(sp); }
  }
  function curveFor(a, b, lift) { if (mode === 'globe') { const A = gdir(TERR[a].lat, TERR[a].lon), B = gdir(TERR[b].lat, TERR[b].lon), ang = A.angleTo(B), h = (lift || 1.2) * 0.8 + ang * 3.2, pts = [];
      for (let i = 0; i <= 28; i++) { const t = i / 28, v = A.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(B.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang))); pts.push(v.normalize().multiplyScalar(GR + 0.35 + Math.sin(t * Math.PI) * h)); }
      const cv = new THREE.CatmullRomCurve3(pts); return { at: f => cv.getPoint(clamp(f, 0, 1)), segs: [cv] }; }
    const A = P(a), B = P(b); const segs = [];
    const mk = (p, q) => { const m = p.clone().lerp(q, 0.5); m.y = Math.max(p.y, q.y) + (lift || 1.2) + p.distanceTo(q) * 0.16; return new THREE.QuadraticBezierCurve3(p.clone().setY(p.y + 0.5), m, q.clone().setY(q.y + 0.5)); };
    if (wraps(a, b)) { const left = A.x < B.x ? A : B, right = A.x < B.x ? B : A, zm = (A.z + B.z) / 2; const e1 = new THREE.Vector3(-BW / 2, 0.3, zm), e2 = new THREE.Vector3(BW / 2, 0.3, zm);
      if (A === left) segs.push(mk(A, e1), mk(e2, B)); else segs.push(mk(A, e2), mk(e1, B)); } else segs.push(mk(A, B));
    return { at(f) { f = clamp(f, 0, 1); if (segs.length === 1) return segs[0].getPoint(f); return f < 0.5 ? segs[0].getPoint(f * 2) : segs[1].getPoint((f - 0.5) * 2); }, segs }; }
  function buildLinks() { const g = new THREE.Group();
    for (const l of LINKS) { const c = curveFor(l[0], l[1], 0.1); for (const s of c.segs) { const pts = []; for (let i = 0; i <= 20; i++) { const p = s.getPoint(i / 20); p.y = Math.max(0.12, hAt(p.x, p.z) + 0.12) + (l[2] ? Math.sin(i / 20 * Math.PI) * 0.5 : 0); pts.push(p); }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), l[2] ? M.sea : M.link); if (l[2]) line.computeLineDistances(); g.add(line); } }
    scene.add(g); }
  function buildArcs(S) { while (arcs.children.length) { const c = arcs.children[0]; arcs.remove(c); if (c.geometry && c.userData.own) c.geometry.dispose(); }
    partyLabels.forEach(d => d.remove()); partyLabels = [];
    for (const p of S.parties) { if (!L.partyVisible(S, p)) continue; const c = curveFor(p.from, p.to);
      for (const s of c.segs) { const t = new THREE.Mesh(new THREE.TubeGeometry(s, 28, 0.2, 6), M.arc); t.userData.own = 1; arcs.add(t); }
      { const e = c.at(1), e0 = c.at(0.93), ah = new THREE.Mesh(G.cone, M.arc); ah.position.copy(e); ah.quaternion.setFromUnitVectors(UP, e.clone().sub(e0).normalize()); ah.scale.set(2.2, 1.1, 2.2); arcs.add(ah); }
      const head = piece('swarm', 0, 0, 2.2); head.userData = { party: p, curve: c }; arcs.add(head);
      const d = document.createElement('div'); d.className = 'plabel'; labelsEl.appendChild(d); d._p = p; d._head = head; partyLabels.push(d); }
    const tm = S.team; if (tm.dest) { const c = curveFor(tm.from, tm.dest); for (const s of c.segs) { const t = new THREE.Mesh(new THREE.TubeGeometry(s, 24, 0.05, 5), M.arcTeam); t.userData.own = 1; arcs.add(t); } teamTok.userData.curve = c; } else teamTok.userData.curve = null; }

  function init(container, pick, art) { el = container; onPick = pick;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; renderer.setClearColor(0x070c15); el.appendChild(renderer.domElement);
    labelsEl = document.createElement('div'); labelsEl.className = 'labels'; el.appendChild(labelsEl);
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x070c15, 120, 260); camera = new THREE.PerspectiveCamera(34, 1, 0.5, 500);
    pieceImgs = art.pieces; globeImg = art.globe; if (art.infest) { const ci = document.createElement('canvas'); ci.width = art.infest.width; ci.height = art.infest.height; const gi = ci.getContext('2d'); gi.drawImage(art.infest, 0, 0); INF = { w: ci.width, h: ci.height, d: gi.getImageData(0, 0, ci.width, ci.height).data }; } assets(); { const c0 = document.createElement('canvas'); c0.width = RW; c0.height = RH; const g0 = c0.getContext('2d'); g0.drawImage(art.map, 0, 0, RW, RH); artData = g0.getImageData(0, 0, RW, RH).data; }
    buildRaster(art.mask);
    const c = document.createElement('canvas'); c.width = RW; c.height = RH; texCtx = c.getContext('2d'); img = texCtx.createImageData(RW, RH); tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    const ce = document.createElement('canvas'); ce.width = RW; ce.height = RH; ctxE = ce.getContext('2d'); imgE = ctxE.createImageData(RW, RH); texE = new THREE.CanvasTexture(ce); texE.encoding = THREE.sRGBEncoding;
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d'), gr = gg.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(gc);
    const geo = new THREE.PlaneGeometry(BW, BH, GW, GH); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, heights[i] * FLAT + curve(pos.getX(i), pos.getZ(i))); geo.computeVertexNormals();
    boardMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0.02, emissive: 0xffffff, emissiveMap: texE, emissiveIntensity: 0.45 })); { const uv = geo.attributes.uv, u2 = new Float32Array(uv.count * 2); for (let i = 0; i < uv.count; i++) { u2[i * 2] = uv.getX(i) * 64; u2[i * 2 + 1] = uv.getY(i) * 36; } geo.setAttribute('uv2', new THREE.BufferAttribute(u2, 2));
      // Extra sharpness: the ownership paint runs at 1920 wide; the fine detail of a larger painting is added back on the graphics card.
      if (art.map.width > RW && renderer.capabilities.maxTextureSize >= art.map.width) { const hi = new THREE.Texture(art.map), cl = document.createElement('canvas'); cl.width = RW; cl.height = RH; cl.getContext('2d').drawImage(art.map, 0, 0, RW, RH); const lo = new THREE.CanvasTexture(cl);
        for (const t of [hi, lo]) { t.anisotropy = 8; if (!renderer.capabilities.isWebGL2) { t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; } t.needsUpdate = true; }
        boardMesh.material.onBeforeCompile = sh => { sh.uniforms.hiTex = { value: hi }; sh.uniforms.loTex = { value: lo }; sh.fragmentShader = 'uniform sampler2D hiTex;\nuniform sampler2D loTex;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n vec3 dH = texture2D(hiTex, vUv).rgb, dL = texture2D(loTex, vUv).rgb; diffuseColor.rgb = max(vec3(0.0), diffuseColor.rgb + (dH * dH - dL * dL) * 0.9);'); }; }
      const gc2 = document.createElement('canvas'); gc2.width = gc2.height = 256; const gg2 = gc2.getContext('2d'), gd = gg2.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const a = Math.sin(i * 12.9898) * 43758.5453, n = (a - Math.floor(a)) * 0.5 + fbm((i % 256) * 0.2, (i >> 8) * 0.2) * 0.5, v = 150 + n * 105; gd.data[i * 4] = gd.data[i * 4 + 1] = gd.data[i * 4 + 2] = v; gd.data[i * 4 + 3] = 255; } gg2.putImageData(gd, 0, 0);
      const gt = new THREE.CanvasTexture(gc2); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; boardMesh.material.aoMap = gt; boardMesh.material.aoMapIntensity = 1.6; boardMesh.material.needsUpdate = true; }
    boardMesh.receiveShadow = true; boardMesh.castShadow = true; scene.add(boardMesh);
    // moving water shimmer and drifting clouds
    { const wc = document.createElement('canvas'); wc.width = wc.height = 256; const w = wc.getContext('2d'), id2 = w.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const v = Math.pow(fbm((i % 256) * 0.06, (i >> 8) * 0.06), 3) * 255; id2.data[i * 4] = v * 0.5; id2.data[i * 4 + 1] = v * 0.85; id2.data[i * 4 + 2] = v; id2.data[i * 4 + 3] = 255; } w.putImageData(id2, 0, 0);
      seaTex = new THREE.CanvasTexture(wc); seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(9, 3.5); const sg = new THREE.PlaneGeometry(BW, BH, 48, 28); sg.rotateX(-Math.PI / 2); for (let i = 0; i < sg.attributes.position.count; i++) sg.attributes.position.setY(i, 0.07 + curve(sg.attributes.position.getX(i), sg.attributes.position.getZ(i))); const sea = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: seaTex, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(sea);
      for (let i = 0; i < 9; i++) { const c2 = new THREE.Mesh(G.circ, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xcfe0ff, transparent: true, opacity: 0.1, depthWrite: false })); c2.rotation.x = -Math.PI / 2; c2.position.set(-BW / 2 + i * 15, 7 + (i % 3), -BH / 2 + ((i * 37) % 46)); c2.scale.set(11 + i % 4 * 3, 6 + i % 3 * 2, 1); scene.add(c2); clouds.push(c2); } }
    // frame and table
    const fm = new THREE.MeshStandardMaterial({ color: 0x6d5324, metalness: 0.7, roughness: 0.35 }), tb = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.9 });
    { const wc = document.createElement('canvas'); wc.width = wc.height = 512; const wg = wc.getContext('2d'), wd = wg.createImageData(512, 512); for (let i = 0; i < 262144; i++) { const x = i % 512, y = i >> 9, n = fbm(x * 0.012, y * 0.16) * 0.7 + fbm(x * 0.05, y * 0.9) * 0.3, pl = (Math.floor(y / 128) % 2) * 0.06, v = 0.55 + n * 0.6 - pl - (y % 128 < 2 ? 0.25 : 0); wd.data[i * 4] = 92 * v; wd.data[i * 4 + 1] = 60 * v; wd.data[i * 4 + 2] = 36 * v; wd.data[i * 4 + 3] = 255; } wg.putImageData(wd, 0, 0); const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(7, 5); wt.encoding = THREE.sRGBEncoding; tb.map = wt; tb.color.set(0xffffff); tb.roughness = 0.75; }
    const table = mesh(G.box, tb, 0, -3.4, 0, 400, 0.6, 300); table.castShadow = false; table.receiveShadow = true; scene.add(table);
    scene.add(new THREE.HemisphereLight(0xa9c4ff, 0x241708, 0.42)); const rim = new THREE.DirectionalLight(0x4f78c8, 0.45); rim.position.set(50, 30, -40); scene.add(rim); const sun = new THREE.DirectionalLight(0xffd9a0, 1.3); sun.position.set(-62, 44, 34); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.mapSize.set(4096, 4096); const sc = sun.shadow.camera; sc.left = -72; sc.right = 72; sc.top = 48; sc.bottom = -48; sc.far = 220; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.06; scene.add(sun);
    tokens = new THREE.Group(); arcs = new THREE.Group(); fxGroup = new THREE.Group(); scene.add(tokens, arcs, fxGroup); buildLinks();
    teamTok = new THREE.Group(); const tc = piece('tiltrotor', 0, 0, 2.3); const tr = mesh(G.ring, M.team, 0, 0.5, 0, 0.9); tr.rotation.x = Math.PI / 2; teamTok.add(tc, tr); scene.add(teamTok);
    for (const id of TIDS) { const d = document.createElement('div'); d.className = 'tlabel'; d.innerHTML = '<span class="tn"></span><b></b><i></i>'; labelsEl.appendChild(d); labels[id] = d; }
    buildBoardBorders();
    boardRoot = new THREE.Group(); for (const c of scene.children.slice()) if (c !== tokens && c !== arcs && c !== fxGroup && c !== teamTok && !c.isLight) boardRoot.add(c); worldRoot = new THREE.Group(); worldRoot.add(boardRoot, tokens, arcs, fxGroup, teamTok); scene.add(worldRoot); renderer.autoClear = false;
    controls(); resize(); window.addEventListener('resize', resize);
    if (el.clientWidth < 700 && el.clientHeight > el.clientWidth) { cam.tx = 24; cam.tz = -2; cam.dist = 70; } else fit(); }
  // Crisp borders: straight bisector segments between neighboring cities, drawn as thin ribbons over the painting.
  let bordB = null, bordG = null;
  function pairsOf(ix, land, w, h) { const set = new Set(); for (let y = 0; y < h - 2; y += 2) for (let x = 0; x < w - 2; x += 2) { const i = y * w + x; if (!land[i]) continue; const a = ix[i], b = ix[i + 2], c = ix[i + 2 * w]; if (b !== a && land[i + 2]) set.add(a < b ? a * 64 + b : b * 64 + a); if (c !== a && land[i + 2 * w]) set.add(a < c ? a * 64 + c : c * 64 + a); } return [...set].map(v => [Math.floor(v / 64), v % 64]); }
  function ribbons(runs, parent) { const pos = [], pi = [], pj = []; for (const r of runs) { const P0 = r.pts, W = r.wid; for (let k = 0; k < P0.length - 1; k++) { const a = P0[k], b = P0[k + 1], wa = W[k], wb = W[k + 1], a0 = a.clone().add(wa), a1 = a.clone().sub(wa), b0 = b.clone().add(wb), b1 = b.clone().sub(wb);
          for (const v of [a0, a1, b0, a1, b1, b0]) { pos.push(v.x, v.y, v.z); pi.push(r.i); pj.push(r.j); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.96, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); m.renderOrder = 2; parent.add(m); return { mesh: m, pi, pj }; }
  function colorBorders(B, S) { if (!B) return; const c = B.mesh.geometry.attributes.color, si = sel ? TIDS.indexOf(sel) : -1, own = TIDS.map(id => S.terr[id].owner);
    for (let v = 0; v < B.pi.length; v++) { const i = B.pi[v], j = B.pj[v], a = own[i], b = own[j]; let r = 0.03, g = 0.05, bl = 0.08;
      if (i === si || j === si) { r = 0.97; g = 0.8; bl = 0.38; } else if (a !== b && a !== 'waste' && b !== 'waste') { r = 1; g = 0.9; bl = 0.78; } else if (a === 'you' && b === 'you') { r = 0.02; g = 0.13; bl = 0.15; } else if (a === 'enemy' && b === 'enemy') { r = 0.13; g = 0.02; bl = 0.02; }
      c.setXYZ(v, r, g, bl); } c.needsUpdate = true; }
  function buildBoardBorders() { const an = TIDS.map(id => [TERR[id].ax / AW * RW, TERR[id].ay / AH * RH]), runs = [], HW = 0.075;
    for (const [i, j] of pairsOf(idx, landA, RW, RH)) { const mx = (an[i][0] + an[j][0]) / 2, my = (an[i][1] + an[j][1]) / 2; let dx = -(an[j][1] - an[i][1]), dy = an[j][0] - an[i][0]; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl; const half2 = (dl / 2) * (dl / 2);
      let cur = null; for (let t = -1100; t <= 1100; t += 1.5) { const x = mx + dx * t, y = my + dy * t; let ok = x >= 1 && y >= 1 && x < RW - 1 && y < RH - 1 && landA[Math.round(y) * RW + Math.round(x)];
        if (ok) { const dq = half2 + t * t - 0.5; for (let k = 0; k < an.length; k++) { if (k === i || k === j) continue; const ex = x - an[k][0], ey = y - an[k][1]; if (ex * ex + ey * ey < dq) { ok = false; break; } } }
        if (ok) { if (!cur) cur = [t, t]; else cur[1] = t; } else if (cur) { if (cur[1] - cur[0] > 3) runs.push({ i, j, t0: cur[0], t1: cur[1], mx, my, dx, dy }); cur = null; } }
      if (cur && cur[1] - cur[0] > 3) runs.push({ i, j, t0: cur[0], t1: cur[1], mx, my, dx, dy }); }
    for (const r of runs) { const n = Math.max(1, Math.ceil((r.t1 - r.t0) / 24)); r.pts = []; r.wid = []; const wv = new THREE.Vector3(-r.dy, 0, r.dx).multiplyScalar(HW);
      for (let k = 0; k <= n; k++) { const t = r.t0 + (r.t1 - r.t0) * k / n, x = (r.mx + r.dx * t) / RW * BW - BW / 2, z = (r.my + r.dy * t) / RH * BH - BH / 2; r.pts.push(new THREE.Vector3(x, 0.62 * FLAT + curve(x, z) + 0.035, z)); r.wid.push(wv); } }
    bordB = ribbons(runs, scene); }
  function buildGlobeBorders() { const dirs = TIDS.map(id => gdir(TERR[id].lat, TERR[id].lon)), runs = [], HW = 0.06, step = 0.0035;
    for (const [i, j] of pairsOf(idxG, landG, GWp, GHp)) { const u = dirs[i].clone().add(dirs[j]).normalize(), nrm = dirs[i].clone().sub(dirs[j]).normalize(), w = new THREE.Vector3().crossVectors(nrm, u).normalize(), dij = u.dot(dirs[i]); let cur = null;
      for (let t = -Math.PI; t <= Math.PI; t += step) { const ct = Math.cos(t), st = Math.sin(t), x = u.x * ct + w.x * st, y = u.y * ct + w.y * st, z = u.z * ct + w.z * st, d0 = x * dirs[i].x + y * dirs[i].y + z * dirs[i].z; let ok = d0 > 0.2;
        if (ok) { const lat = Math.asin(y) * 57.2958; let lon = Math.atan2(z, -x) * 57.2958 - 180; if (lon < -180) lon += 360; const X = clamp(Math.floor((lon + 180) / 360 * GWp), 0, GWp - 1), Y = clamp(Math.floor((90 - lat) / 180 * GHp), 0, GHp - 1); ok = !!landG[Y * GWp + X]; }
        if (ok) for (let k = 0; k < dirs.length; k++) { if (k === i || k === j) continue; if (x * dirs[k].x + y * dirs[k].y + z * dirs[k].z > d0 + 1e-6) { ok = false; break; } }
        if (ok) { if (!cur) cur = { i, j, pts: [], wid: [] }; if (cur.pts.length === 0 || (cur.n = (cur.n || 0) + 1) % 4 === 0) { cur.pts.push(new THREE.Vector3(x, y, z).multiplyScalar(GR + 0.05)); cur.wid.push(nrm.clone().multiplyScalar(HW)); } cur.last = new THREE.Vector3(x, y, z).multiplyScalar(GR + 0.05); }
        else if (cur) { cur.pts.push(cur.last); cur.wid.push(nrm.clone().multiplyScalar(HW)); if (cur.pts.length > 2) runs.push(cur); cur = null; } }
      if (cur && cur.pts.length > 2) runs.push(cur); }
    bordG = ribbons(runs, globeRoot); }
  function buildGlobe() { GWp = globeImg.width; GHp = globeImg.height; const c = document.createElement('canvas'); c.width = GWp; c.height = GHp; ctxG = c.getContext('2d'); ctxG.drawImage(globeImg, 0, 0); artG = ctxG.getImageData(0, 0, GWp, GHp).data; imgG = ctxG.createImageData(GWp, GHp);
    idxG = new Int8Array(GWp * GHp); idx2G = new Int8Array(GWp * GHp); landG = new Uint8Array(GWp * GHp); bdG = new Float32Array(GWp * GHp); const dirs = TIDS.map(id => gdir(TERR[id].lat, TERR[id].lon)), ppd = GWp / 360;
    for (let y = 0; y < GHp; y++) { const lat = 90 - (y + 0.5) / GHp * 180; for (let x = 0; x < GWp; x++) { const i = y * GWp + x, o = i * 4, d = gdir(lat, (x + 0.5) / GWp * 360 - 180); let b1 = -2, b2 = -2, bi = 0, b2i = 0;
        for (let k = 0; k < dirs.length; k++) { const q = d.x * dirs[k].x + d.y * dirs[k].y + d.z * dirs[k].z; if (q > b1) { b2 = b1; b2i = bi; b1 = q; bi = k; } else if (q > b2) { b2 = q; b2i = k; } }
        idxG[i] = bi; idx2G[i] = b2i; bdG[i] = (Math.acos(Math.min(1, b2)) - Math.acos(Math.min(1, b1))) * 0.5 * 57.2958 * ppd; landG[i] = (lat > -60 && artG[o] > artG[o + 2] * 1.05) ? 1 : 0; } }
    texG = new THREE.CanvasTexture(c); texG.encoding = THREE.sRGBEncoding; texG.anisotropy = 8; globeRoot = new THREE.Group();
    const sph = new THREE.Mesh(new THREE.SphereGeometry(GR, 96, 64), new THREE.MeshBasicMaterial({ map: texG, toneMapped: false })); globeRoot.add(sph);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(GR * 1.045, 64, 40), new THREE.MeshBasicMaterial({ color: 0x3f8fe0, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); globeRoot.add(atm);
    const sp = []; for (let i = 0; i < 900; i++) { const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12543.21, u = (a - Math.floor(a)) * 2 - 1, th = (b - Math.floor(b)) * 6.2832, r = Math.sqrt(1 - u * u); sp.push(r * Math.cos(th) * 300, u * 300, r * Math.sin(th) * 300); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); globeRoot.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })));
    const lg = new THREE.Group(); for (const l of LINKS) { const cv = curveFor(l[0], l[1], 0.01).segs[0], pts = cv.getPoints(24).map(v => v.normalize().multiplyScalar(GR + 0.08)); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), l[2] ? M.sea : M.link); if (l[2]) line.computeLineDistances(); lg.add(line); } globeRoot.add(lg); scene.add(globeRoot); buildGlobeBorders(); }
  function paintGlobe(S) { const d = imgG.data, A = artG, own = TIDS.map(id => S.terr[id].owner), obs = TIDS.map(id => S.obs[id] ? 1 : 0), si = sel ? TIDS.indexOf(sel) : -1, n = GWp * GHp;
    for (let i = 0; i < n; i++) { const o = i * 4; let r = A[o], g = A[o + 1], b = A[o + 2];
      if (landG[i]) { const k = idxG[i], c = COL[own[k]], am = own[k] === 'waste' ? 0.8 : own[k] === 'enemy' ? (obs[k] ? 0.62 : 0.5) : 0.46, lum = (r + g + b) / 3 / 112; r = r * (1 - am) + c[0] * lum * am; g = g * (1 - am) + c[1] * lum * am; b = b * (1 - am) + c[2] * lum * am;
        const fr = own[idx2G[i]] !== own[k] || k === si, line = 0, gw = Math.max(0, 1 - bdG[i] / (fr ? 9 : 4)) * (fr ? 1 : 0.35);
        if (k === si) { const t = Math.max(line, gw * 0.75); r = r * 1.12 + 8; g = g * 1.12 + 8; b = b * 1.12 + 4; r += (236 - r) * t; g += (190 - g) * t; b += (90 - b) * t; }
        else { const q = gw * gw * 0.62; r += (c[0] * 1.15 - r) * q; g += (c[1] * 1.15 - g) * q; b += (c[2] * 1.15 - b) * q; } }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; }
    ctxG.putImageData(imgG, 0, 0); texG.needsUpdate = true; }
  function setMode(m) { if (m === mode) return mode; mode = m; if (m === 'globe' && !globeRoot) buildGlobe(); boardRoot.visible = m === 'board'; if (globeRoot) globeRoot.visible = m === 'globe'; scene.fog.near = m === 'globe' ? 900 : 120; scene.fog.far = m === 'globe' ? 1000 : 260;
    sigTok = ''; sigTexG = ''; sync.sa = null; teamTok.quaternion.identity(); if (m === 'globe' && sel) { gl.lon = TERR[sel].lon; gl.lat = clamp(TERR[sel].lat, -60, 70); } if (S0) sync(S0, sel); return mode; }
  function fit() { if (mode === 'globe') { gl.dist = 96; return; } const a = el.clientWidth / Math.max(1, el.clientHeight), t = Math.tan(17 * Math.PI / 180); cam.tx = 0; cam.tz = 2; cam.yaw = 0; cam.dist = clamp(Math.max((BW + 8) / (2 * t * a), (BH + 14) / (2 * t) * 0.8), 30, 190); }
  function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; if (resize.w && (w > h) !== (resize.w > resize.h)) setTimeout(() => { if (w > h) fit(); }, 50); resize.w = w; resize.h = h; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function controls() { const dom = renderer.domElement, pts = new Map(); let moved = 0, pinch = 0, down = null; dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; down = { x: e.clientX, y: e.clientY, btn: e.button }; try { dom.setPointerCapture(e.pointerId); } catch (_) {} if (pts.size === 2) { const a = [...pts.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
    dom.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2) { const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch) { if (mode === 'globe') gl.dist = clamp(gl.dist * pinch / d, 40, 150); else cam.dist = clamp(cam.dist * pinch / d, 34, 190); } pinch = d; return; }
      if (mode === 'globe') { const k = (gl.dist - GR) * 0.0029 * (700 / Math.max(300, el.clientHeight)); gl.lon -= dx * k; gl.lat = clamp(gl.lat + dy * k, -75, 80); return; }
      if (down && (down.btn === 2 || e.shiftKey)) { cam.yaw -= dx * 0.005; cam.pitch = clamp(cam.pitch + dy * 0.004, 0.45, 1.45); return; }
      const k = cam.dist * 0.00105 * (900 / Math.max(300, el.clientHeight)), c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); cam.tx -= (dx * c + dy * s) * k; cam.tz -= (-dx * s + dy * c) * k; });
    let lastPick = 0; const up = e => { pts.delete(e.pointerId); pinch = 0; if (moved < 8 && down && down.btn !== 2) { lastPick = performance.now(); pickAt(e.clientX, e.clientY); } down = null; };
    dom.addEventListener('click', e => { if (performance.now() - lastPick > 400 && moved < 8) { lastPick = performance.now(); pickAt(e.clientX, e.clientY); } });
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = 0; });
    dom.addEventListener('wheel', e => { e.preventDefault(); const f = e.deltaY > 0 ? 1.07 : 0.935; if (mode === 'globe') gl.dist = clamp(gl.dist * f, 40, 150); else cam.dist = clamp(cam.dist * f, 34, 190); }, { passive: false }); dom.addEventListener('contextmenu', e => e.preventDefault()); }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  const gsph = new THREE.Sphere(new THREE.Vector3(), GR);
  function pickAt(cx, cy) { const r = renderer.domElement.getBoundingClientRect(); ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -(cy - r.top) / r.height * 2 + 1 }, camera);
    if (mode === 'globe') { const h = new THREE.Vector3(); if (!ray.ray.intersectSphere(gsph, h)) return onPick(null); const lat = Math.asin(clamp(h.y / GR, -1, 1)) * 57.2958; let lon = Math.atan2(h.z, -h.x) * 57.2958 - 180; if (lon < -180) lon += 360;
      const X = clamp(Math.floor((lon + 180) / 360 * GWp), 0, GWp - 1), Y = clamp(Math.floor((90 - lat) / 180 * GHp), 0, GHp - 1), i = Y * GWp + X; if (landG[i]) return onPick(TIDS[idxG[i]]);
      let best = null, ba = 0.14; const hd = h.clone().normalize(); for (const id of TIDS) { const a = hd.angleTo(gdir(TERR[id].lat, TERR[id].lon)); if (a < ba) { ba = a; best = id; } } return onPick(best); }
    const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return; for (let n = 0; n < 3; n++) { plane.constant = -(0.55 * FLAT + curve(hit.x, hit.z)); if (!ray.ray.intersectPlane(plane, hit)) break; } plane.constant = -0.5; hit.x = ((hit.x + BW / 2) % BW + BW) % BW - BW / 2; let best = null, bd = 1e9; for (const id of TIDS) { const p = P(id), d = Math.hypot(p.x - hit.x, p.z - hit.z); if (d < bd) { bd = d; best = id; } }
    const X = Math.round((hit.x + BW / 2) / BW * RW), Y = Math.round((hit.z + BH / 2) / BH * RH);
    if (X >= 0 && Y >= 0 && X < RW && Y < RH && landA[Y * RW + X]) return onPick(TIDS[idx[Y * RW + X]]); if (bd < 4.5) onPick(best); else onPick(null); }
  function sync(S, selected) { S0 = S; sel = selected;
    const st = TIDS.map(id => { const T = S.terr[id]; return T.owner[0] + (S.obs[id] ? 1 : 0); }).join('') + sel; if (mode === 'globe') { if (st !== sigTexG) { sigTexG = st; paintGlobe(S); colorBorders(bordG, S); } } else if (st !== sigTex) { sigTex = st; paint(S); colorBorders(bordB, S); }
    const sk = TIDS.map(id => { const T = S.terr[id]; return T.owner[0] + (T.owner === 'you' ? (T.n >= 7 ? 3 : T.n >= 4 ? 2 : 1) : (S.obs[id] ? T.n : 'u' + T.seenN)) + (T.fort | 0) + (T.radar | 0) + (T.battery | 0); }).join('') + [S.nuke.building, S.nuke.stage, S.nuke.ready, S.emp.building, S.emp.n, S.up.bombers, S.up.railgun].map(x => +!!x).join('') + S.leaders.map(l => l.alive && L.leaderKnown(S, l) ? l.at + l.rank[0] : '-').join('');
    if (sk !== sigTok) { sigTok = sk; buildTokens(S); }
    const sa = S.parties.map(p => p.id + (L.partyVisible(S, p) ? 'v' : 'h')).join(',') + '|' + (S.team.dest || ''); if (sa !== sync.sa) { sync.sa = sa; buildArcs(S); }
    const threat = {}; for (const p of S.parties) if (L.partyVisible(S, p)) threat[p.to] = 1;
    for (const id of TIDS) { const T = S.terr[id], d = labels[id], known = S.obs[id]; d.className = 'tlabel ' + T.owner + (id === sel ? ' sel' : '') + (threat[id] ? ' threat' : '') + (id === HQ ? ' hq' : '');
      d.children[0].textContent = TERR[id].name; d.children[1].textContent = T.owner === 'waste' ? '☢' : T.owner === 'enemy' ? (known ? L.enemyDefense(S, id) : '?') : T.n;
      const ls = S.leaders.filter(l => l.alive && l.at === id && L.leaderKnown(S, l)); d.children[2].textContent = ls.map(l => l.rank === 'overlord' ? '♛' : l.rank === 'warlord' ? '★' : '▲').join(''); } }
  const v3 = new THREE.Vector3();
  function place(d, p, dy, below) { if (mode === 'globe' && p.dot(camera.position) < GR * GR * 1.02) { d.style.display = 'none'; return; } v3.copy(p); if (mode === 'globe') v3.multiplyScalar(1 + dy / GR); else { v3.y += dy; if (camS) v3.x += Math.round((camS.tx - p.x) / BW) * BW; } v3.project(camera); if (v3.z > 1) { d.style.display = 'none'; return; } d.style.display = ''; d.style.transform = (below ? 'translate(-50%,17px) translate(' : 'translate(-50%,-50%) translate(') + ((v3.x + 1) / 2 * el.clientWidth).toFixed(1) + 'px,' + ((1 - v3.y) / 2 * el.clientHeight).toFixed(1) + 'px)'; }
  function frame(dt) { time += dt; cam.tz = clamp(cam.tz, -BH / 2 + 10, BH / 2 - 8); if (camS) { if (cam.tx > BW / 2) { cam.tx -= BW; camS.tx -= BW; } else if (cam.tx < -BW / 2) { cam.tx += BW; camS.tx += BW; } }
    if (!camS) { camS = Object.assign({}, cam); glS = Object.assign({}, gl); } { const k = 1 - Math.exp(-dt * 11); for (const q in cam) camS[q] += (cam[q] - camS[q]) * k; for (const q in gl) glS[q] += (gl[q] - glS[q]) * k; }
    const G3 = mode === 'globe'; if (G3) { camera.position.copy(gdir(glS.lat, glS.lon).multiplyScalar(glS.dist)); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); } else {
    const cp = Math.cos(camS.pitch), sp = Math.sin(camS.pitch); camera.position.set(camS.tx + Math.sin(camS.yaw) * cp * camS.dist, sp * camS.dist, camS.tz + Math.cos(camS.yaw) * cp * camS.dist); camera.lookAt(camS.tx, 0, camS.tz); }
    camera.updateMatrixWorld(true);
    const vd = G3 ? (glS.dist - GR) * 1.15 : camS.dist, ppu = el.clientHeight / (2 * vd * 0.3057); labelsEl.classList.toggle('far', ppu < 7.5); labelsEl.classList.toggle('mid', ppu >= 7.5 && ppu < 13);
    if (S0) { for (const id of TIDS) place(labels[id], P(id), 0, true);
      for (const c of arcs.children) if (c.userData.party) { const p = c.userData.party, f = (S0.t + (V.frac || 0) - p.t0) / (p.eta - p.t0), q = c.userData.curve.at(f), q2 = c.userData.curve.at(f + 0.02); c.position.copy(q); }
      for (const d of partyLabels) { d.textContent = d._p.n + ' · ' + Math.max(0, d._p.eta - S0.t) + 'h'; place(d, d._head.position, 1.2); }
      const tm = S0.team; if (tm.dest && teamTok.userData.curve) teamTok.position.copy(teamTok.userData.curve.at((S0.t + (V.frac || 0) - tm.t0) / Math.max(1, tm.eta - tm.t0))); else { const p = P(tm.at); if (G3) teamTok.position.copy(p).multiplyScalar(1.03); else teamTok.position.set(p.x - 1.5, p.y + 0.2, p.z - 0.6); }
      if (G3) { teamTok.quaternion.setFromUnitVectors(UP, teamTok.position.clone().normalize()); teamTok.visible = teamTok.position.dot(camera.position) > GR * GR; } else teamTok.visible = true;
      teamTok.children[1].rotation.z = time * 1.5; teamTok.children[0].position.y = 0.9 + Math.sin(time * 2.4) * 0.1; }
    const zf = clamp(vd / 44, 1, 2.9); for (const t of tokens.children) { if (t.userData.grp) t.scale.setScalar(1.12 * zf); t.visible = !G3 || t.position.dot(camera.position) > GR * GR * 1.0; } for (const c of arcs.children) if (c.userData.party) c.visible = !G3 || c.position.dot(camera.position) > GR * GR; teamTok.scale.setScalar(zf); V.zf = zf;
    for (const t of tokens.children) { if (t.userData.pulse) t.material.opacity = 0.32 + Math.sin(time * 2.2) * 0.12; else for (const c of t.children) if (c.userData.pulse) c.material.opacity = 0.24 + Math.sin(time * 1.8 + t.position.x) * 0.1; }
    if (seaTex) { seaTex.offset.x = time * 0.006; seaTex.offset.y = time * 0.004; } for (const c of clouds) { c.position.x += dt * 0.5; if (c.position.x > BW / 2 + 16) c.position.x = -BW / 2 - 16; }
    if (boardMesh) boardMesh.material.emissiveIntensity = 0.42 + Math.sin(time * 1.4) * 0.14;
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.update(f.t) === false) { fxGroup.remove(f.obj); fx.splice(i, 1); } }
    renderer.clear(); if (G3) { worldRoot.position.x = 0; renderer.render(scene, camera); } else { for (const k of [-1, 0, 1]) { worldRoot.position.x = k * BW; renderer.render(scene, camera); } worldRoot.position.x = 0; } }
  function flash(p, size, color, dur) { const m = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })); m.position.copy(p); fxGroup.add(m);
    fx.push({ obj: m, t: 0, update(t) { const k = t / dur; if (k >= 1) return false; m.scale.setScalar(0.2 + size * Math.sqrt(k)); m.material.opacity = 0.9 * (1 - k); } }); }
  function missile(from, to, kind) { const A = P(from), B = P(to), big = kind === 'nuke', c = mode === 'globe' ? { getPoint: t => curveFor(from, to, 3).at(t) } : new THREE.QuadraticBezierCurve3(A.clone().setY(A.y + 0.6), A.clone().lerp(B, 0.5).setY(8 + A.distanceTo(B) * 0.2), B.clone().setY(B.y + 0.3));
    const m = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: kind === 'emp' ? 0x8fd8ff : big ? 0xffe9a0 : 0xffb060 })); m.scale.setScalar(big ? 0.45 : 0.25); fxGroup.add(m); const dur = big ? 2.2 : 1.1;
    fx.push({ obj: m, t: 0, update(t) { if (t >= dur) { flash(B, big ? 9 : kind === 'emp' ? 5 : 2.6, kind === 'emp' ? 0x7fd0ff : 0xffa040, big ? 2.4 : 0.8); if (big) flash(B, 4, 0xffffff, 1.2); return false; } m.position.copy(c.getPoint(t / dur)); } }); }
  function focus(id, lift) { if (mode === 'globe') { gl.lon = TERR[id].lon; gl.lat = clamp(TERR[id].lat - (lift ? 18 : 0), -60, 70); return; } const p = P(id); if (cam.dist > 70) cam.dist = 60; cam.tx = p.x + Math.round((cam.tx - p.x) / BW) * BW; cam.tz = p.z + 2 + (lift ? cam.dist * 0.3 : 0); }
  return { init, sync, frame, setArt, missile, flash: id => flash(P(id), 2.5, 0xff5030, 0.7), focus, fit, cam, resize, zoom: k => { if (mode === 'globe') gl.dist = clamp(gl.dist * k, 40, 150); else cam.dist = clamp(cam.dist * k, 34, 190); }, toggleMode: () => setMode(mode === 'board' ? 'globe' : 'board'), getMode: () => mode, rotate: a => { if (mode === 'globe') gl.lon += a * 60; else cam.yaw += a; }, tilt: () => { cam.pitch = cam.pitch > 1.2 ? 1.02 : cam.pitch > 0.9 ? 0.7 : 1.45; } };
})();
