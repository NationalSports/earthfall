// A landing zone is an insertion point. Expedition extraction stays at the shuttle pad.
export const zones = [
  { id: 'core', x: 7, z: 36, name: 'Core perimeter', note: 'Beside the generator and its defenses.' },
  { id: 'west', x: -42, z: 25, name: 'West approach', note: 'Forward insertion on the western approach.' },
  { id: 'south', x: 0, z: 98, name: 'Southern reserve', note: 'A longer approach from the rear of the sector.' },
];

export function clearLanding(x, z, solids, clearance = 1.2) {
  const clear = (a, b) =>
    solids.every(
      (s) => a < s.x0 - clearance || a > s.x1 + clearance || b < s.z0 - clearance || b > s.z1 + clearance,
    );
  if (clear(x, z)) return { x, z };
  for (let radius = 2; radius <= 80; radius += 2) {
    for (let i = 0; i < 24; i++) {
      const a = x + Math.cos((i * Math.PI) / 12) * radius,
        b = z + Math.sin((i * Math.PI) / 12) * radius;
      if (clear(a, b)) return { x: a, z: b };
    }
  }
  return { x: 7, z: 36 };
}

// Clip a short camera boom against nearby collision volumes, including finite roof heights.
export function boomFraction(px, py, pz, dx, dy, dz, solids, height) {
  let limit = 1;
  for (const box of solids) {
    if (
      box.x1 < Math.min(px, px + dx) - 0.22 ||
      box.x0 > Math.max(px, px + dx) + 0.22 ||
      box.z1 < Math.min(pz, pz + dz) - 0.22 ||
      box.z0 > Math.max(pz, pz + dz) + 0.22
    )
      continue;
    const floor = height((box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2);
    let near = 0,
      far = limit;
    for (const [p, d, lo, hi] of [
      [px, dx, box.x0 - 0.22, box.x1 + 0.22],
      [pz, dz, box.z0 - 0.22, box.z1 + 0.22],
      [py, dy, floor - 0.22, floor + box.h + 0.22],
    ]) {
      if (Math.abs(d) < 1e-6) {
        if (p < lo || p > hi) far = -1;
        continue;
      }
      const a = (lo - p) / d,
        b = (hi - p) / d;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
    }
    if (near <= far) limit = Math.max(0, near - 0.02);
  }
  return limit;
}

export function mountPlanner(form, layouts, setup, terrainHeight) {
  const fields = form.elements,
    map = form.querySelector('#sector'),
    pen = map.getContext('2d');
  const pick = form.querySelector('#lz'),
    gun = form.querySelector('#primary');
  for (const zone of zones) pick.add(new Option(zone.name, zone.id));
  for (const [key, src] of [
    ['w', 'world'],
    ['m', 'mode'],
    ['atmosphere', 'atmosphere'],
    ['d', 'attackers'],
  ]) {
    if (Array.from(fields[key].options).some((o) => o.value === String(setup[src])))
      fields[key].value = setup[src];
  }
  for (const box of form.querySelectorAll('[name=r]')) box.checked = (setup.research || []).includes(box.value);
  pick.value = setup.zone || (setup.mode === 'assault' ? 'south' : 'core');
  const project = (x, z) => [(x + 120) * 3, (z + 90) * 2.4];
  const charts = new Map();
  function terrainChart(world) {
    if (charts.has(world)) return charts.get(world);
    const sheet = document.createElement('canvas');
    sheet.width = 360;
    sheet.height = 252;
    const ctx = sheet.getContext('2d'),
      pixels = ctx.createImageData(sheet.width, sheet.height);
    const base = { la: [34, 57, 49], kepler: [56, 47, 69], ceres: [51, 57, 65] }[world];
    for (let row = 0; row < sheet.height; row++)
      for (let col = 0; col < sheet.width; col++) {
        const x = col / 1.5 - 120,
          z = row / 1.2 - 90,
          h = terrainHeight(world, x, z);
        const east = terrainHeight(world, x + 0.8, z) - h,
          north = terrainHeight(world, x, z - 0.8) - h;
        const slope = Math.max(-18, Math.min(18, (north - east) * 33));
        const contour = Math.abs(h - Math.round(h));
        const ink =
          Math.abs(h) > 0.12 && contour < Math.min(0.15, (Math.abs(east) + Math.abs(north)) * 0.45) ? 17 : 0;
        const at = 4 * (row * sheet.width + col);
        for (let i = 0; i < 3; i++) pixels.data[at + i] = base[i] + slope + ink + Math.min(9, h * 0.65);
        pixels.data[at + 3] = 255;
      }
    ctx.putImageData(pixels, 0, 0);
    charts.set(world, sheet);
    return sheet;
  }
  function draw() {
    const world = fields.w.value,
      mode = fields.m.value,
      selected = zones.find((v) => v.id === pick.value) || zones[0];
    const rail = form.querySelector('[value=railgun]').checked;
    gun.querySelector('[value="6"]').disabled = !rail;
    if (!rail && gun.value === '6') gun.value = '0';
    form.querySelector('#sector-name').textContent = fields.w.selectedOptions[0].text;
    form.querySelector('#lz-note').textContent = selected.note;
    form.querySelector('#mission-note').textContent = {
      defense: 'Hold the generator through five waves.',
      assault: 'Destroy the hives and return to the shuttle.',
      skirmish: 'Fight the opposing squad. First to 15 wins.',
    }[mode];
    pen.drawImage(terrainChart(world), 0, 0, map.width, map.height);
    pen.strokeStyle = '#698b8236';
    pen.lineWidth = 1;
    for (let i = 0; i < 720; i += 48) {
      pen.beginPath();
      pen.moveTo(i, 0);
      pen.lineTo(i, 504);
      pen.moveTo(0, i);
      pen.lineTo(720, i);
      pen.stroke();
    }
    for (const points of layouts[world].roads) {
      pen.beginPath();
      points.forEach(([x, z], i) => pen[i ? 'lineTo' : 'moveTo'](...project(x, z)));
      pen.lineWidth = layouts[world].width * 2.5;
      pen.strokeStyle = '#75948c55';
      pen.stroke();
      pen.lineWidth = 1;
      pen.strokeStyle = '#bbd5c75c';
      pen.stroke();
    }
    const objective = (x, z, label, ink) => {
      const [a, b] = project(x, z);
      pen.fillStyle = ink;
      pen.fillRect(a - 3, b - 3, 6, 6);
      pen.font = 'bold 13px monospace';
      pen.fillText(label, a + 9, b + 5);
    };
    if (mode === 'defense') objective(0, 46, 'GENERATOR', '#ffc874');
    if (mode === 'assault') objective(0, 100, 'EVAC', '#ffc874');
    if (mode === 'skirmish') objective(0, -62, 'HOSTILE BASE', '#fc9c7c');
    else
      for (const angle of [-44, 9, 46]) {
        const r = 88 + Math.abs(angle) * 0.1,
          a = (angle * Math.PI) / 180;
        objective(Math.sin(a) * r, 46 - Math.cos(a) * r, 'HIVE', '#ef9a81');
      }
    if (world === 'la') objective(-18, 11, 'ORPHEA', '#c9c2a3');
    for (const [i, z] of zones.entries()) {
      const [x, y] = project(z.x, z.z);
      const active = z === selected;
      pen.beginPath();
      pen.arc(x, y, active ? 16 : 11, 0, Math.PI * 2);
      pen.fillStyle = active ? '#ffcc75' : '#153937';
      pen.fill();
      pen.strokeStyle = '#f2cd87';
      pen.lineWidth = 2;
      pen.stroke();
      pen.textAlign = 'center';
      pen.fillStyle = active ? '#152423' : '#f2cd87';
      pen.font = 'bold 14px monospace';
      pen.fillText(String(i + 1), x, y + 5);
      pen.textAlign = 'left';
    }
  }
  map.onclick = (e) => {
    const box = map.getBoundingClientRect(),
      x = ((e.clientX - box.left) * 720) / box.width,
      y = ((e.clientY - box.top) * 504) / box.height;
    for (const z of zones) {
      const [a, b] = project(z.x, z.z);
      if (Math.hypot(a - x, b - y) < 32) {
        pick.value = z.id;
        draw();
        break;
      }
    }
  };
  form.addEventListener('change', draw);
  draw();
  return () => ({
    world: fields.w.value,
    mode: fields.m.value,
    zone: pick.value,
    primary: Number(gun.value),
    reserve: fields.reserve.value,
    attackers: Number(fields.d.value),
    atmosphere: fields.atmosphere.value,
    research: [...form.querySelectorAll('[name=r]:checked')].map((x) => x.value),
  });
}
