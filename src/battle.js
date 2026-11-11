// ---------- Command the defense ----------
// A short lane battle that can replace the dice when a war party reaches one of your cities.
// Pure rules, no drawing: the same code runs in the browser and in the balance simulation.
const B = (() => {
  const W = 900, H = 420, LANES = [105, 210, 315], COLS = [470, 590, 710], WALL_X = 380, CORE_X = 850;
  const TUNE = { unitHp: 3, unitSpeed: 30, unitHit: 0.9, gunHp: 6, gunRange: 175, gunRate: 0.8, gunDmg: 1, perSquad: 4.2, wallHp: 10, missileDmg: 2, missileR: 72, acc: 0.7 };
  function create(su, rand) { rand = rand || Math.random;
    const st = { W, H, LANES, COLS, WALL_X, CORE_X, su, rand, t: 0, phase: 'place', units: [], guns: [], shots: [], blasts: [], queue: [], focus: null, focusT: 0, sel: null, result: null, uid: 1,
      missiles: su.battery ? (su.railgun ? 3 : 2) : 0, missileCd: 0, wall: (su.fort || su.perkDef) ? { hp: (su.fort ? TUNE.wallHp : 0) + (su.perkDef ? 9 : 0) } : null };
    if (st.wall) st.wall.max = st.wall.hp;
    const n = Math.min(18, su.D), extra = su.D - n; // more than 18 squads: the rest reinforce the line as extra health
    for (let i = 0; i < n; i++) { const team = i < Math.min(su.team, n), lane = i % 3, col = 2 - (Math.floor(i / 3) % 3);
      st.guns.push({ id: st.uid++, lane, col, team, hp: 0, cd: rand() * 0.5, flash: 0 }); }
    for (const g of st.guns) { g.max = (g.team ? 9 : TUNE.gunHp) + (su.hardened ? 2 : 0) + Math.ceil(extra * TUNE.gunHp / n); g.hp = g.max; }
    layout(st);
    // The size of a war party is never certain: each squad is a handful of creatures, and the whole wave runs thin or thick.
    let total = 0; const thick = 0.65 + rand() * 0.7; for (let i = 0; i < su.A; i++) total += TUNE.perSquad * (0.5 + rand()) * thick; total = Math.max(su.A * 2, Math.round(total)); const span = clamp(su.A * 1.7, 8, 26);
    for (let i = 0; i < total; i++) st.queue.push({ at: 1 + (i / total) * span + rand() * 1.2, lane: Math.floor(rand() * 3) });
    st.queue.sort((a, b) => a.at - b.at); st.total = total; return st; }
  // Guns sharing a slot stand side by side.
  function layout(st) { const by = {}; for (const g of st.guns) { const k = g.lane + ':' + g.col; (by[k] = by[k] || []).push(g); }
    for (const k in by) by[k].forEach((g, i, a) => { g.x = COLS[g.col] + (i - (a.length - 1) / 2) * 30; g.y = LANES[g.lane] + ((i % 2) ? 14 : -14) * (a.length > 1 ? 1 : 0); }); }
  function move(st, gun, lane, col) { if (st.phase !== 'place') return false; if (st.guns.filter(g => g !== gun && g.lane === lane && g.col === col).length >= 3) return false; gun.lane = lane; gun.col = col; layout(st); return true; }
  function start(st) { if (st.phase === 'place') st.phase = 'fight'; }
  function missile(st, x, y) { if (st.phase !== 'fight' || st.missiles < 1 || st.missileCd > 0) return false; st.missiles--; st.missileCd = 2.5; st.blasts.push({ x, y, t: 0.55, r: TUNE.missileR * (st.su.railgun ? 1.25 : 1), done: false }); return true; }
  function focus(st, x, y) { let best = null, bd = 40; for (const u of st.units) { const d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } } if (best) { st.focus = best.id; st.focusT = 4; } return !!best; }
  function step(st, dt) { if (st.phase !== 'fight') return; st.t += dt; const su = st.su, rand = st.rand;
    while (st.queue.length && st.queue[0].at <= st.t) { const q = st.queue.shift(); st.units.push({ id: st.uid++, lane: q.lane, x: -20 - rand() * 30, y: LANES[q.lane] + (rand() - 0.5) * 44, hp: TUNE.unitHp + su.aB, max: TUNE.unitHp + su.aB, cd: rand(), sp: TUNE.unitSpeed * (0.85 + rand() * 0.3), hit: 0 }); }
    if (st.focusT > 0) st.focusT -= dt; if (st.missileCd > 0) st.missileCd -= dt;
    for (const u of st.units) { u.hit = Math.max(0, u.hit - dt); let block = null;
      if (st.wall && st.wall.hp > 0 && u.x >= WALL_X - 16 && u.x < WALL_X + 6) block = st.wall;
      else for (const g of st.guns) if (g.hp > 0 && Math.abs(g.x - u.x) < 24 && Math.abs(g.y - u.y) < 46) { block = g; break; }
      if (block) { u.cd -= dt; if (u.cd <= 0) { u.cd = TUNE.unitHit; block.hp -= 1; block.flash = 0.15; } }
      else { u.x += u.sp * dt; if (u.x >= CORE_X) { u.hp = 0; u.through = true; const g = st.guns.filter(g => g.hp > 0).sort((a, b) => b.x - a.x)[0]; if (g) { g.hp -= 3; g.flash = 0.2; } } } }
    const range = TUNE.gunRange + (su.radar ? 30 : 0); const wallUp = st.wall && st.wall.hp > 0;
    for (const g of st.guns) { g.flash = Math.max(0, g.flash - dt); if (g.hp <= 0) continue; g.cd -= dt; if (g.cd > 0) continue; let tgt = null, bd = 1e9;
      for (const u of st.units) { if (u.hp <= 0 || u.x < 0) continue; const d = Math.hypot(u.x - g.x, u.y - g.y); if (d > range && !(wallUp && u.x >= WALL_X - 34)) continue; /* everyone can fire on creatures stuck at the wall */ const sc = (st.focusT > 0 && u.id === st.focus) ? -1 : (CORE_X - u.x) + Math.abs(u.y - g.y) * 0.4; if (sc < bd) { bd = sc; tgt = u; } }
      if (tgt) { g.cd = TUNE.gunRate * (g.team ? 0.6 : 1); const dmg = TUNE.gunDmg + (g.team && su.spec === 'assault' ? 1 : 0); if (rand() < TUNE.acc) { tgt.hp -= dmg; tgt.hit = 0.12; } st.shots.push({ x1: g.x, y1: g.y, x2: tgt.x, y2: tgt.y, t: 0.09, team: g.team }); } }
    for (const b of st.blasts) { b.t -= dt; if (b.t <= 0 && !b.done) { b.done = true; b.fade = 0.5; for (const u of st.units) if (Math.hypot(u.x - b.x, u.y - b.y) < b.r) { u.hp -= TUNE.missileDmg; u.hit = 0.2; } } if (b.done) b.fade -= dt; }
    st.blasts = st.blasts.filter(b => !b.done || b.fade > 0); for (const s of st.shots) s.t -= dt; st.shots = st.shots.filter(s => s.t > 0);
    st.killed = (st.killed || 0) + st.units.filter(u => u.hp <= 0 && !u.through).length; st.units = st.units.filter(u => u.hp > 0);
    const alive = st.guns.filter(g => g.hp > 0).length, left = st.units.length + st.queue.length;
    if (!alive) finish(st, { A: Math.max(1, Math.ceil(left / TUNE.perSquad)), D: 0 }); else if (!left) finish(st, { A: 0, D: Math.max(1, Math.min(su.D, Math.round(st.guns.reduce((n, g) => n + Math.max(0, g.hp) / g.max, 0) / st.guns.length * su.D))) }); }
  function finish(st, r) { st.phase = 'done'; st.result = r; }
  // Plays the battle with no player input except sensible missile use. Used for auto-resolve previews and for balance checks.
  function auto(st) { start(st); let n = 0; while (st.phase === 'fight' && n++ < 20000) { step(st, 0.08);
      if (st.missiles && st.missileCd <= 0) { let best = null, bc = 3; for (const u of st.units) { const c = st.units.filter(v => Math.hypot(v.x - u.x, v.y - u.y) < 60).length; if (c > bc && u.x > 120) { bc = c; best = u; } } if (best) missile(st, best.x + 12, best.y); } }
    return st.result || { A: 1, D: 0 }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  return { create, step, start, move, missile, focus, auto, TUNE, W, H };
})();
if (typeof module !== 'undefined') module.exports = { B };
