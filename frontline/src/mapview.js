// The tactical map (Tab, the Map button, or Back on a controller). A shaded terrain picture drawn once per mission,
// with the mission panel beside it, and live layers on top: you, the squad, survivors, objectives, points of interest
// (a "?" until someone has been near), nests, enemies the squad has seen recently, strikes on the way, and your
// waypoint. Click or tap the map to set a waypoint (it shows on the compass); right-click clears it.
// Wheel or the + and - buttons zoom; drag to pan.
// Art (chat's PR #47, frontline/assets/map): elevation ramps, aerial detail tiles, scanline grain, the bezel, the panel
// background and white icons that are tinted here. Everything falls back to plain drawing if a file is missing.

const CSS = `#tmap{position:fixed;inset:0;z-index:45;display:none;background:#05090fe8;color:#cfe3ea;font:13px system-ui;user-select:none}
#tmap.on{display:flex}#tmap .side{width:300px;padding:24px 22px;overflow:auto;border-right:1px solid #e8be6033;background:#0a131d center/cover}
#tmap .side small{letter-spacing:.16em;text-transform:uppercase;opacity:.65;font:500 11px ui-monospace,Menlo,monospace}#tmap h2{margin:4px 0 6px;font:700 22px system-ui;color:#fff}
#tmap .brief{opacity:.75;line-height:1.4;margin:0 0 14px}#tmap h4{margin:18px 0 6px;font:500 11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#e8be60}
#tmap ul{list-style:none;margin:0;padding:0}#tmap li{padding:5px 0 5px 22px;position:relative;line-height:1.3}#tmap li:before{content:'';position:absolute;left:2px;top:8px;width:10px;height:10px;border:2px solid #e8be60;border-radius:2px}
#tmap li.done{opacity:.55;text-decoration:line-through}#tmap li.done:before{background:#e8be60}#tmap li i{display:block;font-style:normal;opacity:.6;font-size:11.5px}
#tmap .key{display:grid;grid-template-columns:22px 1fr;gap:6px 8px;align-items:center;font:500 11px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.85}#tmap .key img{width:18px;height:18px;display:block}#tmap .key b{border-radius:50%;width:12px;height:12px;margin:3px;display:block}
#tmap .stage{flex:1;position:relative;overflow:hidden;cursor:crosshair}#tmap canvas{position:absolute;inset:0;width:100%;height:100%}
#tmap .btns{position:absolute;right:16px;top:16px;display:flex;gap:8px}#tmap .btns button{width:40px;height:40px;border-radius:9px;border:1px solid #ffffff2a;background:#0b1520dd;color:#fff;font:600 18px system-ui}
#tmap .hint{position:absolute;left:16px;bottom:12px;opacity:.6;font-size:12px}
@media (max-width:760px){#tmap{flex-direction:column}#tmap .side{width:auto;max-height:34%;padding:12px 14px}#tmap h2{font-size:17px}#tmap .key{display:none}}`;

const ICON = ['player', 'squad', 'survivor', 'enemy', 'brute', 'warlord', 'nest', 'outpost', 'wreck', 'cache', 'relay', 'lz', 'blackbox', 'objective', 'waypoint', 'strike', 'unknown'];
export function createMapView(opts) {
  const art = opts.art || (() => null), imgs = {}, load = n => { const u = art(n); if (!u || imgs[n]) return imgs[n]; const im = new Image(); im.src = u; imgs[n] = im; return im; }, ready = n => { const im = load(n); return im && im.complete && im.naturalWidth ? im : null; };
  for (const n of ICON) load('map-icon-' + n); for (const n of ['map-frame', 'map-grain', 'map-panel', 'map-ramp-la', 'map-ramp-kepler', 'map-ramp-ceres', 'map-detail-la', 'map-detail-kepler', 'map-detail-ceres']) load(n);
  // white icons (with a dark outline) tinted to a colour: multiply keeps the outline dark and turns the white the colour
  const tinted = {}, icon = (n, col) => { const key = n + col; if (tinted[key]) return tinted[key]; const im = ready('map-icon-' + n); if (!im) return null; const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 96, 96);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, 96, 96); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0, 96, 96); return (tinted[key] = c); };
  const rampOf = w => { const im = ready('map-ramp-' + w); if (!im) return null; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = 1; const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, 1); const d = x.getImageData(0, 0, c.width, 1).data; return t => { const i = Math.max(0, Math.min(c.width - 1, Math.round(t * (c.width - 1)))) * 4; return [d[i], d[i + 1], d[i + 2]]; }; };
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'tmap'; root.innerHTML = '<div class="side"></div><div class="stage"><canvas></canvas><div class="btns"><button data-z="1">+</button><button data-z="-1">−</button><button data-x>✕</button></div><div class="hint">Click to set a waypoint · right-click clears · wheel zooms · drag pans · Tab closes</div></div>';
  document.body.appendChild(root);
  const side = root.querySelector('.side'), stage = root.querySelector('.stage'), cv = root.querySelector('canvas'), g = cv.getContext('2d');
  let base = null, world = 'la', arena = 250, zoom = 1, cx = 0, cz = 0, open = false, drag = null, moved = 0, last = 0;
  const S = () => Math.min(cv.width, cv.height) / (arena * 2) * zoom, toScreen = (x, z) => [cv.width / 2 + (x - cx) * S(), cv.height / 2 + (z - cz) * S()], toWorld = (sx, sy) => [cx + (sx - cv.width / 2) / S(), cz + (sy - cv.height / 2) / S()];
  const fit = () => { const r = stage.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(10, r.width * d); cv.height = Math.max(10, r.height * d); };
  const clampView = () => { const lim = arena * (1 - 1 / zoom); cx = Math.max(-lim, Math.min(lim, cx)); cz = Math.max(-lim, Math.min(lim, cz)); };
  const setZoom = (z, sx, sy) => { const before = sx == null ? null : toWorld(sx, sy); zoom = Math.max(1, Math.min(5, z)); if (before) { const after = toWorld(sx, sy); cx += before[0] - after[0]; cz += before[1] - after[1]; } clampView(); last = 0; };
  const evPos = e => { const r = cv.getBoundingClientRect(), d = cv.width / r.width; return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; };
  cv.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); drag = evPos(e); moved = 0; if (e.button === 2) { opts.onPing(null); drag = null; } });
  window.addEventListener('mousemove', e => { if (!open || !drag) return; const p = evPos(e), dx = p[0] - drag[0], dy = p[1] - drag[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { cx -= dx / S(); cz -= dy / S(); clampView(); last = 0; } drag = p; });
  window.addEventListener('mouseup', e => { if (!open || !drag) return; if (moved <= 6 && e.button === 0) opts.onPing(toWorld(...drag)); drag = null; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); setZoom(zoom * (e.deltaY < 0 ? 1.25 : 0.8), ...evPos(e)); }, { passive: false });
  cv.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); const t = e.changedTouches[0]; drag = evPos(t); moved = 0; }, { passive: false });
  cv.addEventListener('touchmove', e => { e.preventDefault(); const t = e.changedTouches[0], p = evPos(t), dx = p[0] - drag[0], dy = p[1] - drag[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 10) { cx -= dx / S(); cz -= dy / S(); clampView(); last = 0; } drag = p; }, { passive: false });
  cv.addEventListener('touchend', e => { e.preventDefault(); if (drag && moved <= 10) opts.onPing(toWorld(...drag)); drag = null; }, { passive: false });
  for (const b of root.querySelectorAll('.btns button')) { const go = e => { e.preventDefault(); e.stopPropagation(); if (b.dataset.x !== undefined) api.close(); else setZoom(zoom * (b.dataset.z === '1' ? 1.4 : 0.7)); }; b.addEventListener('click', go); b.addEventListener('touchstart', go, { passive: false }); }
  for (const t of ['keydown', 'keyup']) root.addEventListener(t, e => e.stopPropagation());

  // icons
  const dot = (x, z, r, col, ring) => { const [sx, sy] = toScreen(x, z); g.beginPath(); g.arc(sx, sy, r, 0, 7); if (ring) { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); } else { g.fillStyle = col; g.fill(); } return [sx, sy]; };
  const label = (sx, sy, text, col) => { g.font = '600 ' + Math.round(12 * (cv.width / cv.clientWidth || 1)) + 'px system-ui'; g.lineWidth = 3; g.strokeStyle = '#05090f'; g.strokeText(text, sx + 10, sy + 4); g.fillStyle = col; g.fillText(text, sx + 10, sy + 4); };
  const hex = (x, z, r, col) => { const [sx, sy] = toScreen(x, z); g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.closePath(); g.fillStyle = col; g.fill(); return [sx, sy]; };
  const diamond = (x, z, r, col) => { const [sx, sy] = toScreen(x, z); g.beginPath(); g.moveTo(sx, sy - r); g.lineTo(sx + r, sy); g.lineTo(sx, sy + r); g.lineTo(sx - r, sy); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = '#05090f'; g.lineWidth = 1.5; g.stroke(); return [sx, sy]; };

  const api = {
    get open() { return open; },
    // paint the terrain once: shade(x, z) returns [r, g, b] 0..255 for a spot on the ground
    ramp(w) { return rampOf(w); },
    setBase(size, shade, w) { arena = size; world = w || world; zoom = 1; cx = cz = 0; const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const cg = c.getContext('2d'), img = cg.createImageData(N, N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -size + (i + 0.5) / N * size * 2, z = -size + (j + 0.5) / N * size * 2, col = shade(x, z), k = (j * N + i) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255; }
      cg.putImageData(img, 0, 0); base = c; last = 0; },
    toggle() { return open ? api.close() : api.open_(); },
    open_() { if (open) return; open = true; root.classList.add('on'); fit(); last = 0; if (opts.onOpen) opts.onOpen(); },
    close() { if (!open) return; open = false; root.classList.remove('on'); drag = null; if (opts.onClose) opts.onClose(); },
    // d: { title, brief, objectives:[{text, sub, done}], side:[...], stats, player:{x,z,yaw}, allies, civs, enemies, nests, pois, marks, ping, solids }
    draw(d, now) { if (!open || now - last < 66) return; last = now; if (cv.width !== Math.round(stage.clientWidth * Math.min(2, window.devicePixelRatio || 1))) fit();
      const li = a => a.map(o => '<li class="' + (o.done ? 'done' : '') + '">' + o.text + (o.sub ? '<i>' + o.sub + '</i>' : '') + '</li>').join('');
      { const p = ready('map-panel'); if (p && !side.dataset.bg) { side.dataset.bg = 1; side.style.backgroundImage = 'linear-gradient(#0a131dcc,#0a131dee),url(' + p.src + ')'; } }
      const keyIcon = (n, col, t) => { const c = icon(n, col); return (c ? '<img src="' + c.toDataURL() + '">' : '<b style="background:' + col + '"></b>') + '<span>' + t + '</span>'; };
      side.innerHTML = '<small>' + d.where + '</small><h2>' + d.title + '</h2><p class="brief">' + d.brief + '</p><h4>Objective</h4><ul>' + li(d.objectives) + '</ul>' + (d.side.length ? '<h4>Side objectives</h4><ul>' + li(d.side) + '</ul>' : '') +
        '<h4>Status</h4><p class="brief">' + d.stats + '</p><h4>Map key</h4><div class="key">' + keyIcon('player', '#e8be60', 'You') + keyIcon('squad', '#6fd3ff', 'Squad') + keyIcon('enemy', '#ff4a6a', 'Enemy contact') + keyIcon('nest', '#b04adf', 'Nest') + keyIcon('lz', '#60ff90', 'Extraction') + keyIcon('unknown', '#9aa6b2', 'Unexplored') + '</div>';
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#05090f'; g.fillRect(0, 0, cv.width, cv.height); const s = S(), [ox, oy] = toScreen(-arena, -arena);
      if (base) { g.imageSmoothingEnabled = true; g.drawImage(base, ox, oy, arena * 2 * s, arena * 2 * s); }
      // aerial detail, anchored to the ground so it pans and zooms with it (one tile is 140 m)
      { const det = ready('map-detail-' + world); if (det) { g.save(); g.beginPath(); g.rect(ox, oy, arena * 2 * s, arena * 2 * s); g.clip(); const pat = g.createPattern(det, 'repeat'); pat.setTransform(new DOMMatrix().translate(ox, oy).scale(140 * s / det.naturalWidth)); g.globalCompositeOperation = 'multiply'; g.fillStyle = pat; g.fillRect(ox, oy, arena * 2 * s, arena * 2 * s); g.restore(); } }
      g.fillStyle = 'rgba(12,16,22,0.6)'; for (const q of d.solids) { const [a, b] = toScreen(q.x0, q.z0); g.fillRect(a, b, Math.max(1, (q.x1 - q.x0) * s), Math.max(1, (q.z1 - q.z0) * s)); }
      // a 100 m grid with sector names
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.font = '600 ' + Math.round(11 * (cv.width / cv.clientWidth || 1)) + 'px system-ui'; g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let v = -arena, n = 0; v <= arena; v += 100, n++) { const [a] = toScreen(v, 0), [, b] = toScreen(0, v); g.beginPath(); g.moveTo(a, oy); g.lineTo(a, oy + arena * 2 * s); g.stroke(); g.beginPath(); g.moveTo(ox, b); g.lineTo(ox + arena * 2 * s, b); g.stroke(); if (v < arena) { g.fillText(String.fromCharCode(65 + n), a + 4, Math.max(oy, 0) + 14); g.fillText(String(n + 1), Math.max(ox, 0) + 4, b + 14); } }
      const ic = (n, col, x, z, px, rot) => { const c = icon(n, col); if (!c) return null; const [sx, sy] = toScreen(x, z), k = (cv.width / cv.clientWidth || 1) * px; g.save(); g.translate(sx, sy); if (rot) g.rotate(rot); g.drawImage(c, -k / 2, -k / 2, k, k); g.restore(); return [sx, sy]; };
      const POI = { nest: ['nest', '#b04adf'], outpost: ['outpost', '#e8be60'], wreck: ['wreck', '#e8be60'], cache: ['cache', '#e8be60'], radar: ['relay', '#7fd8ff'], depot: ['outpost', '#7fd8ff'], artillery: ['strike', '#7fd8ff'] };
      for (const m of d.marks) { dot(m.x, m.z, Math.max(5, m.r * s), m.col, true); ic('strike', '#ff4a6a', m.x, m.z, 22); }
      for (const p of d.pois) { const P = POI[p.kind]; if (!p.found ? ic('unknown', '#9aa6b2', p.x, p.z, 22) : P && (() => { const q = ic(P[0], p.done ? '#5f6b78' : P[1], p.x, p.z, 24); if (q) label(q[0] + 4, q[1], p.name + (p.done ? ' ✓' : ''), p.done ? '#8a96a2' : P[1]); return q; })()) continue; if (!p.found) { const [sx, sy] = diamond(p.x, p.z, 8, '#5f6b78'); g.fillStyle = '#fff'; g.font = '700 11px system-ui'; g.fillText('?', sx - 3, sy + 4); } else { const [sx, sy] = diamond(p.x, p.z, 8, p.done ? '#3f4a54' : p.col); label(sx, sy, p.name + (p.done ? ' ✓' : ''), p.done ? '#8a96a2' : p.col); } }
      for (const n of d.nests) { const q = ic('nest', n.side ? '#8a3bb8' : '#b04adf', n.x, n.z, n.side ? 22 : 28); if (q) { if (n.label) label(q[0] + 6, q[1], n.label, '#d79cff'); continue; } const [sx, sy] = hex(n.x, n.z, 9, n.side ? '#8a3bb8' : '#b04adf'); if (n.label) label(sx, sy, n.label, '#d79cff'); }
      for (const o of d.objectives) if (o.x != null) { if (o.r) dot(o.x, o.z, o.r * s, 'rgba(255,207,74,0.6)', true); const q = ic(o.icon || 'objective', o.done ? '#5f6b78' : '#ffcf4a', o.x, o.z, 28); if (q) { label(q[0] + 8, q[1], o.mark || o.text, '#ffcf4a'); continue; } const [sx, sy] = diamond(o.x, o.z, 11, o.done ? '#3f4a54' : '#ffcf4a'); label(sx, sy, o.mark || o.text, '#ffcf4a'); if (o.r) dot(o.x, o.z, o.r * s, 'rgba(255,207,74,0.6)', true); }
      { const q = ic('lz', d.lz.on ? '#60ff90' : '#3f9a62', d.lz.x, d.lz.z, 28); const [sx, sy] = q ? [q[0] + 6, q[1]] : dot(d.lz.x, d.lz.z, 9, d.lz.on ? '#60ff90' : 'rgba(96,255,144,0.5)', !d.lz.on); label(sx, sy, d.lz.on ? 'Extraction' : 'Landing zone', '#60ff90'); }
      for (const e of d.enemies) if (!ic(e.big ? 'brute' : 'enemy', '#ff4a6a', e.x, e.z, e.big ? 20 : 14)) dot(e.x, e.z, e.big ? 5 : 3, '#ff4a6a');
      for (const c of d.civs) if (!ic('survivor', '#ff8a3a', c.x, c.z, 16)) dot(c.x, c.z, 3.5, '#ff8a3a');
      for (const a of d.allies) if (!ic('squad', '#6fd3ff', a.x, a.z, 15)) dot(a.x, a.z, 4, '#6fd3ff');
      if (d.ping) { const q = ic('waypoint', '#ffe36a', d.ping.x, d.ping.z, 26); const [sx, sy] = q ? [q[0] + 6, q[1] - 4] : diamond(d.ping.x, d.ping.z, 9, '#ffe36a'); label(sx, sy, 'Waypoint ' + d.ping.d + ' m', '#ffe36a'); }
      if (!ic('player', '#e8be60', d.player.x, d.player.z, 26, -d.player.yaw)) { const p = d.player, [sx, sy] = toScreen(p.x, p.z), a = -p.yaw; g.save(); g.translate(sx, sy); g.rotate(a); g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fillStyle = '#ffe36a'; g.fill(); g.strokeStyle = '#05090f'; g.lineWidth = 2; g.stroke(); g.restore(); }
      { const gr = ready('map-grain'); if (gr) { g.save(); g.fillStyle = g.createPattern(gr, 'repeat'); g.fillRect(0, 0, cv.width, cv.height); g.restore(); } }
      { const fr = ready('map-frame'); if (fr) { const side = Math.min(cv.width, cv.height) * 1.02; g.drawImage(fr, (cv.width - side) / 2, (cv.height - side) / 2, side, side); } }
    } };
  window.addEventListener('resize', () => { if (open) { fit(); last = 0; } });
  return api;
}
