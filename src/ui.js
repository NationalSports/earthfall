// ---------- Interface ----------
const $ = s => document.querySelector(s);
const SAVE = 'earthfall-stage1';
let diff = 'normal', S = null, selId = null, tab = 'territory', modal = null, acc = 0, lastSave = 0, hold = false;
const ICON = { metal: '⬢', fuel: '⚡\uFE0E', research: '✦', uranium: '☢\uFE0E', intel: '◎', salvage: '⬖' };
let panelOpen = false; const compact = () => window.matchMedia('(max-width:860px),(max-height:520px)').matches;
function setPanel(v) { panelOpen = v; document.body.classList.toggle('pclosed', !v); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cost = c => Object.keys(c).filter(k => c[k]).map(k => '<span class="c ' + k + '">' + ICON[k] + ' ' + c[k] + '</span>').join(' ');
const btn = (a, label, o) => { o = o || {}; return '<button class="btn ' + (o.cls || '') + '" data-a="' + a + '"' + (o.id ? ' data-id="' + o.id + '"' : '') + (o.dis ? ' disabled' : '') + '>' + (o.art ? '<i class="art art-' + o.art + '"></i>' : '') + '<span>' + label + '</span>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</button>'; };
const pct = p => Math.round(p * 100) + '%';
function save() { try { const c = Object.assign({}, S, { ev: [], obs: {} }); localStorage.setItem(SAVE, JSON.stringify(c)); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.v === 4 && !s.over) { s.ev = []; s.speed = 0; for (const k of ['uranium', 'intel', 'salvage']) if (s.res[k] === undefined) s.res[k] = 0; L.setDiff(s.diff); L.refreshIntel(s); return s; } } catch (e) {} return null; }
function toast(msg, kind) { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; const box = $('#toasts'); box.appendChild(t); while (box.children.length > (window.innerWidth < 860 ? 2 : 4)) box.removeChild(box.firstChild); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, window.innerWidth < 860 ? 4200 : 6500); }
function setSpeed(v) { if (S.over) v = 0; S.speed = v; }

// ---------- Top bar ----------
function renderTop() {
  const own = L.owned(S).length; let boxes = ''; for (let i = 0; i < 10; i++) boxes += '<i class="' + (i < S.esc ? 'on' : '') + '"></i>';
  const h = '<div class="brand"><b>EARTHFALL</b><small>Earth Defense Coalition</small></div>' +
    '<div class="clock"><span class="day">' + L.stamp(S) + '</span><div class="speed">' + [[0, '❚❚'], [1, '▶'], [3, '▶▶']].map(s => '<button data-a="speed" data-id="' + s[0] + '" class="' + (S.speed === s[0] ? 'on' : '') + '" aria-label="speed ' + s[0] + '">' + s[1] + '</button>').join('') + '</div></div>' +
    '<div class="res">' + ['metal', 'fuel', 'research', 'uranium', 'intel', 'salvage'].map(k => '<span class="chip ' + k + '" title="' + k + '">' + ICON[k] + ' <b>' + Math.floor(S.res[k]) + '</b><small>' + k + '</small></span>').join('') +
    '<span class="chip troops" title="Reserve troops">◉ <b>' + S.pool + '</b><small>reserve</small></span><span class="chip" title="Territories held">⚑ <b>' + own + '</b><small>held</small></span></div>' +
    '<div class="meters"><div class="meter"><label>Threat</label><div class="boxes">' + boxes + '</div></div><div class="meter"><label>Harvest ' + Math.floor(S.harvest) + '%</label><div class="bar"><i style="width:' + S.harvest + '%"></i></div></div></div>';
  if (renderTop.h !== h) { renderTop.h = h; $('#top').innerHTML = h; }
}

// ---------- Panel ----------
function leaderRow(l, withOps) { const known = L.leaderKnown(S, l), dis = L.inDisarray(S, l);
  let where = !l.alive ? 'Dead' : known ? TERR[l.at].name : 'Last seen ' + TERR[l.seenAt].name + ', ' + Math.max(1, Math.round((S.t - l.seenT) / 24)) + 'd ago';
  let tags = ''; if (l.alive && l.exposed > S.t && known) tags += '<em class="tag good">exposed</em>'; if (l.alive && dis) tags += '<em class="tag">leaderless</em>';
  let h = '<div class="leader ' + l.rank + (l.alive ? '' : ' dead') + '" data-a="sel" data-id="' + (known ? l.at : l.seenAt) + '"><span class="gl">' + (l.rank === 'overlord' ? '♛' : l.rank === 'warlord' ? '★' : '▲') + '</span><div><b>' + esc(l.name) + '</b><small>' + RANKN[l.rank] + ' · ' + where + '</small></div>' + tags + '</div>';
  if (withOps && l.alive && L.teamAt(S) === l.at) h += btn('covert', 'Covert strike on ' + esc(l.name.split(' ')[0]), { id: l.id, cls: 'violet', sub: pct(L.covertOdds(S, l)) + ' success · ' + cost({ fuel: 10, intel: 2 }) });
  return h; }
function panelTerritory() { if (!selId) return '<div class="empty"><h3>Select a territory</h3><p>Tap any region on the board. Teal is yours, red is occupied. Drag to pan, pinch or scroll to zoom.</p>' + objectives() + '</div>';
  const T = S.terr[selId], D = TERR[selId], known = S.obs[selId], tm = S.team, teamHere = L.teamAt(S) === selId;
  let h = '<div class="thead ' + T.owner + '"><small>' + D.area + ', ' + REGIONS[D.region].name + ' · produces ' + ICON[D.res] + ' ' + D.res + (URANIUM.includes(selId) ? ' and ' + ICON.uranium + ' uranium' : '') + '</small><h2>' + D.name + '</h2><span class="own">' + (T.owner === 'you' ? (selId === HQ ? 'Coalition HQ' : 'Coalition held') : T.owner === 'enemy' ? 'Occupied' : 'Wasteland') + '</span></div>';
  const inc = S.parties.filter(p => p.to === selId && L.partyVisible(S, p));
  if (T.owner === 'you') {
    const st = [T.fort && 'Fortress', T.radar && 'Radar', T.battery && ('Missile battery' + ((T.reload || 0) > S.t ? ' (reloading ' + (T.reload - S.t) + 'h)' : ''))].filter(Boolean).join(', ') || 'None';
    h += '<div class="stats"><div><label>Garrison</label><b>' + T.n + '</b></div><div><label>Defense bonus</label><b>+' + Math.min(2, (T.fort ? 1 : 0) + (S.up.hardened ? 1 : 0)) + '</b></div><div class="wide"><label>Structures</label><span>' + st + '</span></div></div>';
    if (inc.length) { h += '<div class="alert"><b>⚠ Under attack</b>'; for (const p of inc) { h += '<div class="inc"><span>' + p.n + ' attackers from ' + TERR[p.from].name + ' arrive in ' + Math.max(0, p.eta - S.t) + 'h</span>';
        if (teamHere && !p.hit) h += btn('ambush', 'Ambush', { id: p.id, cls: 'sm' }); if (L.batteriesInRange(S, p.to).length || L.batteriesInRange(S, p.from).length) h += btn('salvoParty', 'Missiles', { id: p.id, cls: 'sm' }); h += '</div>'; } h += '</div>'; }
    h += '<div class="acts">' + btn('reinforce', 'Reinforce', { id: selId, art: 'deploy', cls: 'teal big', sub: 'Add 1 troop from reserve (' + S.pool + ' left)', dis: S.pool < 1 }) +
      btn('airlift', 'Airlift in', { id: selId, art: 'airlift', sub: 'Move 2 troops from your largest garrison · ' + cost({ fuel: 15 }), dis: (S.airT || 0) > S.t });
    for (const k of ['fort', 'radar', 'battery']) if (!T[k]) h += btn('build', 'Build ' + BUILD[k].name, { art: { fort: 'fortify', radar: 'radar', battery: 'missile-battery' }[k], id: selId + ':' + k, sub: BUILD[k].desc + ' ' + cost(L.costOf(S, k)), dis: !L.canPay(S, L.costOf(S, k)) });
    h += '</div>';
  } else if (T.owner === 'enemy') {
    if (known) { const g = L.guards(S, selId); h += '<div class="stats"><div><label>Strength</label><b>' + T.n + '</b></div><div><label>Leader guards</label><b>+' + g + '</b></div><div><label>Total defense</label><b>' + (T.n + g) + '</b></div></div>';
      const tg = [T.alert > S.t && 'On alert', T.disarray > S.t && 'In disarray', T.soft > S.t && 'Defenses shaken', T.emp > S.t && 'EMP blackout'].filter(Boolean); if (tg.length) h += '<p class="tags">' + tg.map(x => '<em class="tag">' + x + '</em>').join('') + '</p>';
      const ls = L.leadersAt(S, selId); if (ls.length) { h += '<h4>Command present</h4>'; for (const l of ls) h += leaderRow(l, true); }
    } else h += '<p class="note">No current intel. Last known strength ' + T.seenN + ', ' + Math.max(1, Math.round((S.t - T.seenT) / 24)) + ' days ago. Build radar nearby or send the strike team to see more.</p>';
    const av = L.assaultAvail(S, selId);
    h += '<div class="acts">' + btn('assault', 'Plan assault', { id: selId, art: 'assault', cls: 'gold big', sub: av.n + ' troops available' + (av.supplied ? '' : ' · no land border, landing under fire') });
    if (teamHere) h += btn('sabotage', 'Sabotage', { id: selId, cls: 'violet', sub: pct(L.sabOdds(S, selId)) + ' success · strength −2, Harvest −2% · ' + cost({ fuel: 10, intel: 1 }) });
    if (L.batteriesInRange(S, selId).length) h += btn('salvo', 'Missile salvo', { id: selId, art: 'missile', sub: 'Strength −1 to −2 · ' + cost(SALVO_COST) });
    if (S.up.bombers) h += btn('bomb', 'Bomber raid', { id: selId, art: 'bomber-raid', sub: (S.bombT || 0) > S.t ? 'Rearming, ' + (S.bombT - S.t) + 'h' : 'Strength −1 to −3 · ' + cost(BOMB_COST), dis: (S.bombT || 0) > S.t });
    if (S.emp.n > 0) h += btn('emp', 'EMP strike', { id: selId, art: 'drone', sub: 'Halves leader guards, stops attacks for 3 days · ' + S.emp.n + ' ready' });
    h += '</div>';
  } else h += '<p class="note">Nothing lives here. It produces nothing and belongs to no one.</p>';
  if (T.owner !== 'waste') { h += '<div class="acts">';
    if (teamHere) h += '<p class="note teamhere">◆ Your strike team is here' + (T.owner === 'you' ? ', strengthening the defense.' : ', undetected.') + '</p>';
    else if (tm.dest) h += '<p class="note">◆ Strike team in transit to ' + TERR[tm.dest].name + ', ' + Math.max(0, tm.eta - S.t) + 'h out.</p>';
    else h += btn('deploy', 'Send strike team here', { id: selId, cls: 'cyan', sub: L.travelHours(S, tm.at, selId) + 'h travel from ' + TERR[tm.at].name + ' · ' + cost({ fuel: 8 }), dis: tm.pips < 1 });
    if (S.nuke.ready > 0 && selId !== HQ) h += btn('nuke', '☢ Launch warhead', { id: selId, art: 'warhead', cls: 'danger', sub: 'Erases this territory for good. ' + S.nuke.ready + ' ready.' });
    h += '</div>'; }
  return h; }
function objectives() { const wl = L.warlordsAlive(S), ov = L.overlord(S);
  return '<div class="objs"><h4>Objectives</h4><div class="obj"><span>◎</span><div><b>Kill the Overlord</b><small>' + (wl ? wl + ' Warlord' + (wl > 1 ? 's' : '') + ' still shield him with ' + wl * 2 + ' extra guards' : 'His Warlords are gone. He is exposed.') + '</small></div></div>' +
    '<div class="obj"><span>⏳</span><div><b>Stop the Harvest</b><small>' + Math.floor(S.harvest) + '% complete. Every occupied territory speeds it up.</small></div></div>' +
    '<div class="obj"><span>⚑</span><div><b>Hold headquarters</b><small>Lose Los Angeles and the war is over.</small></div></div></div>'; }
function panelCommand() { const tm = S.team; let pips = ''; for (let i = 0; i < 4; i++) pips += '<i class="' + (i < tm.pips ? 'on' : '') + '"></i>';
  let h = '<div class="card team"><i class="art face art-' + ({ assault: 'vanguard', shadow: 'cipher', engineer: 'engineer' }[S.spec]) + '"></i><small>Your strike team · ' + SPECS[S.spec].name + '</small><h3>' + (tm.dest ? 'In transit to ' + TERR[tm.dest].name + ' (' + Math.max(0, tm.eta - S.t) + 'h)' : 'In ' + TERR[tm.at].name) + '</h3><div class="pips">' + pips + '<span>readiness</span></div><p>' + SPECS[S.spec].desc + '</p>' + (tm.dest ? '' : btn('sel', 'Show on map', { id: tm.at, cls: 'sm' })) + btn('recon', 'Deep recon', { sub: ((S.scanUntil || 0) > S.t ? 'Active for ' + (S.scanUntil - S.t) + 'h more' : 'Reveal the whole map for 3 days · ' + cost({ intel: 5 })), dis: S.res.intel < 5 || (S.scanUntil || 0) > S.t }) + '</div>';
  h += '<h4>Enemy command</h4><p class="note">Nothing is locked. Every leader you remove weakens the ones above.</p>';
  const ov = L.overlord(S); h += leaderRow(ov);
  for (const w of S.leaders.filter(l => l.rank === 'warlord')) { h += '<div class="branch">' + leaderRow(w); for (const c of S.leaders.filter(l => l.rank === 'commander' && l.boss === w.id)) h += '<div class="branch">' + leaderRow(c) + '</div>'; h += '</div>'; }
  const orphans = S.leaders.filter(l => l.rank === 'commander' && !S.leaders.some(w => w.id === l.boss && w.rank === 'warlord')); if (orphans.length) { h += '<div class="branch">'; for (const c of orphans) h += leaderRow(c); h += '</div>'; }
  return h + objectives(); }
function panelArsenal() { const nk = S.nuke, em = S.emp; let h = '<h4>Production</h4>';
  const prog = nk.building ? 1 - (nk.doneAt - S.t) / NUKE_STAGE.hours : 0;
  h += '<div class="card prod"><i class="art top art-warhead"></i><div><h3>☢ Warhead</h3><small>Stage ' + Math.min(3, nk.stage + (nk.building ? 1 : 0)) + ' of 3' + (nk.ready ? ' · <b>' + nk.ready + ' ready to launch</b>' : '') + '</small></div><div class="bar"><i style="width:' + ((nk.stage + prog) / 3 * 100) + '%"></i></div><p>Erases any territory on the map, permanently. Three stages, 60 hours each, built at HQ. The enemy will come for it.</p>' +
    btn('nukeStart', nk.building ? 'Building, ' + (nk.doneAt - S.t) + 'h left' : 'Build stage ' + (nk.stage + 1), { sub: cost(NUKE_STAGE.cost), dis: nk.building || !L.canPay(S, NUKE_STAGE.cost), cls: 'gold' }) + (nk.ready ? '<small class="hint">Select a territory, then Launch warhead.</small>' : '') + '</div>';
  h += '<div class="card prod"><div><h3>⚡ EMP warhead</h3><small>' + em.n + ' ready</small></div>' + (em.building ? '<div class="bar"><i style="width:' + (100 - (em.doneAt - S.t) / 30 * 100) + '%"></i></div>' : '') + '<p>Reaches anywhere. Halves leader guards and stops attacks from the target for 3 days, without destroying the land.</p>' +
    btn('empBuild', em.building ? 'Assembling, ' + (em.doneAt - S.t) + 'h left' : 'Build EMP', { sub: cost(EMP_COST), dis: em.building || !L.canPay(S, EMP_COST) }) + '</div>';
  h += '<h4>Research</h4><div class="ups">'; for (const k in UPGRADES) { const u = UPGRADES[k], has = S.up[k]; h += '<div class="card up' + (has ? ' has' : '') + '"><i class="art top art-' + ({ elite: 'elite-training', ghost: 'ghost-suits', transport: 'rapid-transport', hardened: 'hardened-garrisons', deepscan: 'deep-scan', bombers: 'bomber-raid', exo: 'exo', railgun: 'railgun', disruptor: 'disruptor' }[k]) + '"></i><h3>' + u.name + (has ? ' ✓' : '') + '</h3><p>' + u.desc + '</p>' + (has ? '' : btn('buy', 'Research', { id: k, sub: cost(u.cost), dis: !L.canPay(S, u.cost), cls: 'sm' })) + '</div>'; }
  return h + '</div>'; }
function panelIntel() { let h = '<h4>Recovered intel ' + S.intel + ' / ' + INTEL.length + '</h4>'; if (!S.intel) h += '<p class="note">Kill an enemy leader to recover intelligence about who they are and why they came.</p>';
  for (let i = S.intel - 1; i >= 0; i--) h += '<div class="card intel"><small>Fragment ' + (i + 1) + '</small><p>' + esc(INTEL[i]) + '</p></div>';
  h += '<h4>War log</h4><div class="log">'; for (const e of S.log.slice(0, 40)) h += '<div class="le ' + e.kind + '"><small>Day ' + (Math.floor(e.t / 24) + 1) + '</small>' + esc(e.msg) + '</div>'; return h + '</div>'; }
function renderPanel(force) { if (hold && !force) return;
  const tabs = [['territory', 'Territory'], ['command', 'Command'], ['arsenal', 'Arsenal'], ['intel', 'Intel']];
  const h = '<nav class="tabs">' + tabs.map(t => '<button data-a="tab" data-id="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '<button class="pclose" data-a="ptoggle" aria-label="Show or hide orders">' + (panelOpen ? '▾' : '▴') + '</button></nav><div class="pbody">' +
    (tab === 'territory' ? panelTerritory() : tab === 'command' ? panelCommand() : tab === 'arsenal' ? panelArsenal() : panelIntel()) + '</div>';
  if (renderPanel.h !== h) { renderPanel.h = h; const p = $('#panel'), b = p.querySelector('.pbody'), sc = b ? b.scrollTop : 0; p.innerHTML = h; const nb = p.querySelector('.pbody'); if (nb && renderPanel.tab === tab + selId) nb.scrollTop = sc; renderPanel.tab = tab + selId; } }

// ---------- Modals ----------
function showModal(html, cls) { modal = true; const m = $('#modal'); m.className = 'show ' + (cls || ''); m.innerHTML = '<div class="sheet">' + html + '</div>'; S && setSpeed(0); }
function closeModal() { modal = null; $('#modal').className = ''; $('#modal').innerHTML = ''; asl = null; renderAll(true); }
function introModal() { let h = '<div class="mhead"><small>Earth Defense Coalition</small><h1>EARTHFALL</h1></div><p class="lead">They took East Asia in three weeks. You command what is left. Hold the line, break their chain of command, and stop the Harvest before it completes.</p>' +
  '<ul class="how"><li><b>The clock runs</b> while you play. Pause any time; orders work while paused.</li><li><b>Occupied regions grow</b> every day and break out into their neighbors when overfull.</li><li><b>Nothing is locked.</b> You can strike the Overlord in Tokyo today. The odds are shown before you commit.</li><li><b>Territories produce</b> metal, fuel or research. Four also yield uranium for the warhead. Radar earns intel for covert work, and battles your strike team wins yield salvage for the best gear.</li></ul><h4>Difficulty</h4><div class="specs">' + Object.keys(DIFFS).map(k => '<button class="spec tac' + (diff === k ? ' on' : '') + '" data-a="diff" data-id="' + k + '"><b>' + DIFFS[k].name + '</b><span>' + DIFFS[k].desc + '</span></button>').join('') + '</div><h4>Choose your strike team to begin</h4><div class="specs">';
  for (const k in SPECS) h += '<button class="spec" data-a="start" data-id="' + k + '"><i class="art face art-' + ({ assault: 'vanguard', shadow: 'cipher', engineer: 'engineer' }[k]) + '"></i><b>' + SPECS[k].name + '</b><span>' + SPECS[k].desc + '</span></button>';
  showModal(h + '</div>', 'intro'); }
function overModal() { const o = S.over, own = o.own; let t, p;
  if (o.why === 'win') { if (S.nukes === 0 && own >= 14) { t = 'The loop breaks'; p = 'The Overlord is dead and the world is still whole. Across the occupied zones his soldiers stop mid-stride, look at their hands, and thin like breath on glass. The future that sent them no longer happens. Neither do they.'; }
    else if (S.nukes > 0) { t = 'Victory, by fire'; p = 'The Overlord is dead. ' + S.nukes + ' wasteland' + (S.nukes > 1 ? 's' : '') + ' will not grow back in forty generations. In a salvaged enemy archive, the date of the ruin they fled has not changed.'; }
    else { t = 'Victory'; p = 'The Overlord is dead and the invasion is breaking apart. Too much was lost to call it clean. Whether the world you kept is enough to change what comes after, no one alive will know.'; } }
  else if (o.why === 'harvest') { t = 'The Harvest completes'; p = 'They take what they came for and leave. Somewhere far ahead, a dying world begins to recover on seed stock and clean water carried out of ours.'; }
  else if (o.why === 'hq') { t = 'Headquarters has fallen'; p = 'Los Angeles has fallen and the Coalition no longer has a command. Scattered garrisons fight on without orders.'; }
  else { t = 'The Coalition collapses'; p = 'Too little of the world remains to feed a war.'; }
  showModal('<div class="mhead"><small>Day ' + L.day(S) + '</small><h1>' + t + '</h1></div><p class="lead">' + p + '</p><div class="stats"><div><label>Territories held</label><b>' + own + '</b></div><div><label>Leaders killed</label><b>' + S.kills + '</b></div><div><label>Warheads used</label><b>' + S.nukes + '</b></div><div><label>Intel recovered</label><b>' + S.intel + '/' + INTEL.length + '</b></div></div>' + btn('new', 'New campaign', { cls: 'gold big' }), 'over'); try { localStorage.removeItem(SAVE); } catch (e) {} }
// Assault planner and dice
let asl = null;
const die = (v, cls, bonus) => '<i class="die ' + cls + '">' + v + (bonus ? '<sup>+' + bonus + '</sup>' : '') + '</i>';
function assaultModal() { const a = asl, D = TERR[a.id]; let h = '<div class="mhead"><small>Launch assault</small><h1>' + D.name + '</h1></div>';
  if (!a.b) { const pl = L.assaultPlan(S, a.id, a.troops, a.o); a.troops = pl.troops;
    h += '<div class="vs"><div class="side you"><label>Coalition force</label><b>' + pl.A + '</b><small>' + pl.troops + ' troops' + (pl.teamN ? ' + strike team (' + pl.teamN + ')' : '') + '</small></div><span>VS</span><div class="side enemy"><label>Defense</label><b>' + pl.D + '</b><small>' + S.terr[a.id].n + ' strength + ' + pl.guards + ' guards</small></div></div>' +
      '<div class="slider"><label for="troops">Troops to commit: <b>' + pl.troops + '</b> of ' + pl.avail + '</label><input id="troops" type="range" min="0" max="' + pl.avail + '" value="' + pl.troops + '"></div>' +
      '<div class="est"><label>Estimated success</label><b class="' + (pl.p > 0.65 ? 'good' : pl.p > 0.35 ? 'warn' : 'bad') + '">' + pct(pl.p) + '</b><div class="bar"><i style="width:' + pl.p * 100 + '%"></i></div>' + (pl.supplied ? '' : '<small>No land border: defenders roll +1 on their best die.</small>') + '</div><div class="tactics">' +
      '<button class="tac' + (a.o.flank ? ' on' : '') + '" data-a="tac" data-id="flank"><i class="art top art-flank"></i><b>Flank</b><span>Attackers roll +1 on their best die.</span><small>' + cost({ fuel: 20 }) + '</small></button>' +
      '<button class="tac' + (a.o.missile ? ' on' : '') + '" data-a="tac" data-id="missile"' + (pl.can.missile ? '' : ' disabled') + '><i class="art top art-missile"></i><b>Missile support</b><span>' + (pl.can.missile ? 'Defense −2 before the first roll.' : 'Needs a loaded battery within 2 territories.') + '</span><small>' + cost(SALVO_COST) + '</small></button>' +
      '<button class="tac' + (a.o.air ? ' on' : '') + '" data-a="tac" data-id="air"' + (pl.can.air ? '' : ' disabled') + '><i class="art top art-strike"></i><b>Air support</b><span>' + (pl.can.air ? 'Defense −3 before the first roll.' : 'Needs Strategic Bombers, rearmed.') + '</span><small>' + cost(BOMB_COST) + '</small></button></div>' +
      '<div class="row">' + btn('closeModal', 'Cancel') + btn('commit', 'Commit attack', { cls: 'gold big', sub: 'Costs ' + cost(pl.cost), dis: pl.A < 1 || !L.canPay(S, pl.cost) }) + '</div>';
  } else { const b = a.b; h += '<div class="vs"><div class="side you"><label>Coalition force</label><b>' + Math.max(0, b.A) + '</b><small>of ' + b.A0 + '</small></div><span>VS</span><div class="side enemy"><label>Defense</label><b>' + Math.max(0, b.D) + '</b><small>of ' + b.D0 + '</small></div></div><div class="rounds">';
    for (const r of b.rounds.slice(-4)) h += '<div class="round"><span>' + r.a.map((v, i) => die(v, 'a', i === 0 && r.aBonus)).join('') + '</span><em>' + (r.dL ? 'they lose ' + r.dL : '') + (r.dL && r.aL ? ' · ' : '') + (r.aL ? 'you lose ' + r.aL : '') + '</em><span>' + r.d.map((v, i) => die(v, 'd', i === 0 && r.dBonus)).join('') + '</span></div>';
    if (!b.rounds.length) h += '<p class="note">Highest dice are compared in pairs. The defender wins ties.</p>'; h += '</div>';
    if (b.done) h += '<div class="result ' + (b.won ? 'good' : 'bad') + '"><h3>' + (b.won ? D.name + ' is liberated' : b.A <= 0 ? 'The assault failed' : 'Withdrawn') + '</h3>' + (b.notes || []).map(n => '<p>' + esc(n) + '</p>').join('') + '</div><div class="row">' + btn('closeModal', 'Continue', { cls: 'gold big' }) + '</div>';
    else h += '<div class="row">' + btn('withdraw', 'Withdraw') + btn('rollAll', 'Fight to the end') + btn('roll', 'Roll', { cls: 'gold big' }) + '</div>'; }
  showModal(h, 'assault'); const sl = $('#troops'); if (sl) sl.addEventListener('input', () => { asl.troops = +sl.value; assaultModal(); const n = $('#troops'); if (n) n.focus(); }); }
function confirmModal(title, text, act, id, label) { showModal('<div class="mhead"><small>Confirm</small><h1>' + title + '</h1></div><p class="lead">' + text + '</p><div class="row">' + btn('closeModal', 'Cancel') + btn(act, label, { id, cls: 'danger big' }) + '</div>', 'confirm'); }

// ---------- Actions ----------
function report(r) { if (r && !r.ok && r.msg) toast(r.msg, 'bad'); return r && r.ok; }
function act(a, id) { if (!S && a !== 'start' && a !== 'diff') return;
  switch (a) {
    case 'diff': diff = id; introModal(); return;
    case 'start': S = L.newGame(id, diff); selId = HQ; closeModal(); V.focus('tokyo'); toast('The clock is paused. Look around, then press ▶ to begin.', 'info'); break;
    case 'new': introModal(); break;
    case 'speed': setSpeed(+id); break;
    case 'tab': tab = id; setPanel(true); break;
    case 'ptoggle': setPanel(!panelOpen); break;
    case 'sel': selId = id; tab = 'territory'; V.focus(id, compact() && window.innerHeight > window.innerWidth); setPanel(true); break;
    case 'reinforce': report(L.reinforce(S, id)); break;
    case 'airlift': report(L.airlift(S, id)); break;
    case 'build': { const p = id.split(':'); report(L.build(S, p[0], p[1])); break; }
    case 'buy': report(L.buy(S, id)); break;
    case 'recon': report(L.deepRecon(S)); break;
    case 'deploy': report(L.deploy(S, id)); if (S.speed === 0 && S.team.dest) setSpeed(1); break;
    case 'covert': { const l = S.leaders.find(x => x.id === id), at = l.at; const r = L.covert(S, id); if (report(r)) { V.flash(at); } break; }
    case 'sabotage': if (report(L.sabotage(S, id))) V.flash(id); break;
    case 'salvo': { const bs = L.batteriesInRange(S, id); if (report(L.salvo(S, id))) V.missile(bs[0], id); break; }
    case 'salvoParty': report(L.salvoParty(S, +id)); break;
    case 'ambush': report(L.ambush(S, +id)); break;
    case 'bomb': if (report(L.bomb(S, id))) V.missile(HQ, id); break;
    case 'emp': if (report(L.empLaunch(S, id))) V.missile(HQ, id, 'emp'); break;
    case 'empBuild': report(L.empBuild(S)); break;
    case 'nukeStart': report(L.nukeStart(S)); break;
    case 'nuke': confirmModal('Launch on ' + TERR[id].name + '?', 'This erases ' + TERR[id].name + ' for the rest of the war. It will produce nothing and can never be retaken. Neighboring territories lose a unit to fallout.', 'nukeGo', id, '☢ Launch'); return;
    case 'nukeGo': closeModal(); if (report(L.nukeLaunch(S, id))) V.missile(HQ, id, 'nuke'); break;
    case 'assault': asl = { id, troops: Math.min(L.assaultAvail(S, id).n, L.enemyDefense(S, id) + 3), o: {} }; assaultModal(); return;
    case 'tac': asl.o[id] = !asl.o[id]; assaultModal(); return;
    case 'commit': { const r = L.assaultStart(S, asl.id, asl.troops, asl.o); if (report(r)) { asl.b = r.b; V.flash(asl.id); } assaultModal(); return; }
    case 'roll': L.assaultRound(S, asl.b); assaultModal(); return;
    case 'rollAll': while (!asl.b.done) L.assaultRound(S, asl.b); assaultModal(); return;
    case 'withdraw': L.assaultEnd(S, asl.b, false); assaultModal(); return;
    case 'closeModal': closeModal(); break;
    case 'globe': { const m = V.toggleMode(); const b = document.querySelector('[data-a="globe"]'); if (b) b.textContent = m === 'globe' ? 'Flat board' : 'Globe'; return; }
    case 'zoomIn': V.zoom(0.8); return; case 'zoomOut': V.zoom(1.25); return; case 'fit': V.fit(); return; case 'rotL': V.rotate(-0.3); return; case 'rotR': V.rotate(0.3); return; case 'tilt': V.tilt(); return;
  }
  drain(); renderAll(true); save(); }
function drain() { if (!S) return; const ev = S.ev.splice(0); for (const e of ev) {
    if (e.k === 'toast') toast(e.msg, e.kind); else if (e.k === 'pause') setSpeed(0);
    else if (e.k === 'arrive') { selId = e.id; tab = 'territory'; toast('Strike team has arrived in ' + TERR[e.id].name + '.', 'info'); }
    else if (e.k === 'intel' && !asl) { const i = e.i; setTimeout(() => { if (!modal && !S.over) showModal('<div class="mhead"><small>Intel recovered · fragment ' + (i + 1) + ' of ' + INTEL.length + '</small><h1>Field report</h1></div><p class="lead quote">' + esc(INTEL[i]) + '</p><div class="row">' + btn('closeModal', 'Continue', { cls: 'gold big' }) + '</div>', 'intelm'); }, 300); }
    else if (e.k === 'over') setTimeout(overModal, 600); } }
function renderAll(force) { if (!S) return; renderTop(); renderPanel(force); V.sync(S, selId); }

// ---------- Boot ----------
async function boot() {
  setPanel(!compact());
  const ld = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const art = { map: await ld(ART.map), mask: await ld(ART.mask), globe: await ld(ART.globe), infest: ART.infest ? await ld(ART.infest) : null, pieces: {} }; await Promise.all(Object.keys(PIECES).map(async k => { art.pieces[k] = await ld(PIECES[k]); }));
  { const st = document.createElement('style'); st.textContent = Object.keys(CARDS).map(k => '.art-' + k + '{background-image:url(' + CARDS[k] + ')}').join(''); document.head.appendChild(st); }
  V.init($('#map'), id => { if (!S) return; selId = id; if (id) { tab = 'territory'; setPanel(true); } else if (compact()) setPanel(false); renderAll(true); }, art);
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.id); });
  const p = $('#panel'); p.addEventListener('pointerdown', () => { hold = true; }); window.addEventListener('pointerup', () => { setTimeout(() => { hold = false; }, 60); });
  document.addEventListener('keydown', e => { if (!S || modal || e.target.tagName === 'INPUT') return; if (e.code === 'Space') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); renderTop(); } });
  S = load(); if (S) { selId = HQ; renderAll(true); toast('Campaign resumed on ' + L.stamp(S) + '. Paused.', 'info'); } else introModal();
  let last = performance.now(), rT = 0;
  function loop(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S && S.speed > 0 && !modal && !S.over) { acc += dt * (S.speed === 1 ? 1 : 4); let n = 0; while (acc >= 1 && n++ < 6) { acc -= 1; L.step(S); if (S.ev.length) drain(); if (S.speed === 0) { acc = 0; break; } } }
    V.frac = S && S.speed > 0 ? acc : 0; rT += dt; if (rT > 0.25) { rT = 0; renderAll(); if (S && now - lastSave > 8000) { lastSave = now; save(); } }
    V.frame(dt); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.__g = { get S() { return S; }, L, V, act };
}
window.addEventListener('DOMContentLoaded', boot);
