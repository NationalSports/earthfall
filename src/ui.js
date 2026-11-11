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
function toast(msg, kind) { if (kind === 'bad') SFX.play('alert'); const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; const box = $('#toasts'); box.appendChild(t); while (box.children.length > (window.innerWidth < 860 ? 2 : 4)) box.removeChild(box.firstChild); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, window.innerWidth < 860 ? 4200 : 6500); }
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
  let tags = ''; if (l.alive && l.exposed > S.t && known) tags += '<em class="tag good">exposed</em>'; if (l.alive && dis) tags += '<em class="tag">leaderless</em>'; if (l.trait && known && TRAITS[l.trait]) tags += '<em class="tag trait" title="' + TRAITS[l.trait].desc + '">' + TRAITS[l.trait].name + '</em>';
  let h = '<div class="leader ' + l.rank + (l.alive ? '' : ' dead') + '" data-a="sel" data-id="' + (known ? l.at : l.seenAt) + '"><i class="lf art-enemy-' + l.rank + '"></i><span class="gl">' + (l.rank === 'overlord' ? '♛' : l.rank === 'warlord' ? '★' : '▲') + '</span><div><b>' + esc(l.name) + '</b><small>' + RANKN[l.rank] + ' · ' + where + (l.trait && known && l.alive && TRAITS[l.trait] ? ' · ' + TRAITS[l.trait].desc : '') + '</small></div>' + tags + '</div>';
  if (withOps && l.alive && L.teamAt(S) === l.at) h += btn('covert', 'Covert strike on ' + esc(l.name.split(' ')[0]), { id: l.id, cls: 'violet', sub: pct(L.covertOdds(S, l)) + ' success · ' + cost({ fuel: 10, intel: 2 }) });
  return h; }
function panelTerritory() { if (!selId) return '<div class="empty"><h3>Select a territory</h3><p>Tap any region on the board. Teal is yours, red is occupied. Drag to pan, pinch or scroll to zoom.</p>' + objectives() + '</div>';
  const T = S.terr[selId], D = TERR[selId], known = S.obs[selId], tm = S.team, teamHere = L.teamAt(S) === selId;
  let h = '<div class="thead ' + T.owner + '"><small>' + D.area + ', ' + REGIONS[D.region].name + ' · produces ' + ICON[D.res] + ' ' + D.res + (URANIUM.includes(selId) ? ' and ' + ICON.uranium + ' uranium' : '') + '</small><h2>' + D.name + '</h2><span class="own">' + (T.owner === 'you' ? (selId === HQ ? 'Coalition HQ' : 'Coalition held') : T.owner === 'enemy' ? 'Occupied' : 'Wasteland') + '</span></div>';
  if (PERKS[selId] && T.owner !== 'waste') h += '<div class="perk' + (T.owner === 'you' ? ' on' : '') + '"><b>★ ' + PERKS[selId].name + '</b><span>' + PERKS[selId].desc + (T.owner === 'you' ? '' : ' · liberate to gain') + '</span></div>';
  const inc = S.parties.filter(p => p.to === selId && L.partyVisible(S, p));
  if (T.owner === 'you') {
    const st = [T.works && 'Industry ' + T.works, T.barracks && 'Barracks ' + T.barracks, T.fort && 'Fortress', T.radar && 'Radar', T.battery && ('Missile battery' + ((T.reload || 0) > S.t ? ' (reloading ' + (T.reload - S.t) + 'h)' : ''))].filter(Boolean).join(', ') || 'None';
    h += '<div class="stats"><div><label>Garrison</label><b>' + T.n + '</b></div><div><label>Defense bonus</label><b>+' + Math.min(2, (T.fort ? 1 : 0) + (S.up.hardened ? 1 : 0) + (PERKS[selId] && PERKS[selId].def || 0)) + '</b></div><div class="wide"><label>Structures</label><span>' + st + '</span></div></div>';
    if (inc.length) { h += '<div class="alert"><b>⚠ Under attack</b>'; for (const p of inc) { h += '<div class="inc"><span>' + p.n + ' attackers from ' + TERR[p.from].name + ' arrive in ' + Math.max(0, p.eta - S.t) + 'h</span>';
        if (teamHere && !p.hit) h += btn('ambush', 'Ambush', { id: p.id, cls: 'sm' }); if (L.batteriesInRange(S, p.to).length || L.batteriesInRange(S, p.from).length) h += btn('salvoParty', 'Missiles', { id: p.id, cls: 'sm' }); h += '</div>'; } h += '</div>'; }
    h += '<div class="acts">' + btn('reinforce', 'Reinforce', { id: selId, art: 'deploy', cls: 'teal big', sub: 'Add 1 troop from reserve (' + S.pool + ' left)', dis: S.pool < 1 }) +
      btn('airlift', 'Airlift in', { id: selId, art: 'airlift', sub: 'Move 2 troops from your largest garrison · ' + cost({ fuel: 15 }), dis: (S.airT || 0) > S.t });
    for (const k of ['works', 'barracks']) { const lv = T[k] || 0; if (lv < BUILD[k].levels) h += btn('build', (lv ? 'Upgrade ' : 'Build ') + BUILD[k].name + (lv ? ' to level ' + (lv + 1) : ''), { art: k === 'works' ? 'research' : 'deploy', id: selId + ':' + k, sub: BUILD[k].desc + ' ' + cost(L.costOf(S, k, lv)), dis: !L.canPay(S, L.costOf(S, k, lv)) }); }
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
  { const cs = S.cards || []; h += '<h4>Command cards · ' + cs.length + ' of 6</h4>';
    if (!cs.length) h += '<p class="note">Liberate a territory or kill a leader to earn a card. Play it for its effect, or trade any three for reserves.</p>';
    else { h += '<div class="hand">' + cs.map((k, i) => '<button class="ccard" data-a="card" data-id="' + i + '"><i class="art top art-' + CARDS_DEF[k].art + '"></i><b>' + CARDS_DEF[k].name + '</b><span>' + CARDS_DEF[k].desc + '</span></button>').join('') + '</div>';
      if (cs.length >= 3) h += btn('trade', 'Trade 3 cards', { sub: '+' + L.tradeValue(S) + ' reserve troops (uses your three oldest)' }); }
    h += btn('cmd', 'Command defenses in person: ' + (S.cmd ? 'On' : 'Off'), { cls: 'sm', sub: S.cmd ? 'You fight war parties of 3 or more yourself' : 'Every attack is settled by dice' }); }
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

// ---------- Sound ----------
// Small synthesized effects, no audio files. Starts on the first tap, as browsers require.
const SFX = { muted: false, ctx: null, last: {},
  play(k) { if (this.muted) return; try { const C = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); const now = C.currentTime; if (this.last[k] && now - this.last[k] < 0.07) return; this.last[k] = now;
      const tone = (type, f0, f1, dur, vol, delay) => { const o = C.createOscillator(), g = C.createGain(), t = now + (delay || 0); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(C.destination); o.start(t); o.stop(t + dur + 0.02); };
      const noise = (dur, vol, freq) => { const n = Math.floor(C.sampleRate * dur), b = C.createBuffer(1, n, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = C.createBufferSource(), g = C.createGain(), f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; src.buffer = b; g.gain.value = vol; src.connect(f); f.connect(g); g.connect(C.destination); src.start(now); };
      if (k === 'tap') tone('sine', 520, 700, 0.06, 0.05); else if (k === 'dice') { noise(0.12, 0.12, 2400); tone('square', 180, 120, 0.05, 0.03, 0.05); }
      else if (k === 'shot') tone('square', 900, 240, 0.05, 0.018); else if (k === 'missile') { tone('sawtooth', 240, 900, 0.5, 0.04); noise(0.5, 0.05, 1200); }
      else if (k === 'boom') { noise(0.7, 0.3, 500); tone('sine', 110, 36, 0.6, 0.2); } else if (k === 'alert') { tone('square', 440, 440, 0.12, 0.035); tone('square', 330, 330, 0.16, 0.035, 0.15); }
      else if (k === 'good') { tone('sine', 520, 520, 0.12, 0.06); tone('sine', 780, 780, 0.2, 0.06, 0.1); } else if (k === 'build') { noise(0.08, 0.1, 1800); tone('triangle', 200, 320, 0.18, 0.07, 0.05); }
    } catch (e) {} } };

// ---------- Command the defense ----------
let bat = null, PIMG = {};
function defendModal() { const p = S && S.pending; if (!p || modal) return; const su = L.defenseSetup(S, p), ex = [su.fort && 'fortress wall', su.battery && (su.railgun ? '3 railgun strikes' : '2 missile strikes'), su.radar && 'radar (longer range)', su.team && 'your strike team'].filter(Boolean);
  SFX.play('alert'); selId = su.to; V.focus(su.to);
  showModal('<div class="mhead"><small>War party arriving from ' + TERR[p.from].name + '</small><h1>Defend ' + su.name + '</h1></div><p class="lead"><b>' + su.A + '</b> attackers against <b>' + su.D + '</b> defenders' + (ex.length ? ', with ' + ex.join(', ') : '') + '.' + (su.aB ? ' They are veterans and hit harder.' : '') + '</p><div class="row">' + btn('defAuto', 'Auto-resolve', { sub: 'Settle it with dice' }) + btn('defGo', 'Command the defense', { cls: 'gold big', sub: 'About a minute' }) + '</div>', 'defend'); }
function battleModal() { const su = L.defenseSetup(S, S.pending); bat = { st: B.create(su), speed: 1, shotT: 0 };
  showModal('<div class="mhead"><small>Defense of ' + su.name + '</small><h1>Hold the line</h1></div><canvas id="bcv" width="900" height="420"></canvas><div id="bui"></div>', 'battle'); battleUI();
  const cv = $('#bcv'); cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * B.W, y = (e.clientY - r.top) / r.height * B.H, st = bat.st;
    if (st.phase === 'place') { const g = st.guns.slice().sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]; if (g && Math.hypot(g.x - x, g.y - y) < 26) { st.sel = st.sel === g ? null : g; SFX.play('tap'); }
      else if (st.sel) { let lane = 0, col = 0; st.LANES.forEach((ly, i) => { if (Math.abs(ly - y) < Math.abs(st.LANES[lane] - y)) lane = i; }); st.COLS.forEach((cx, i) => { if (Math.abs(cx - x) < Math.abs(st.COLS[col] - x)) col = i; }); if (B.move(st, st.sel, lane, col)) { st.sel = null; SFX.play('build'); } } }
    else if (st.phase === 'fight') { if (B.missile(st, x, y)) SFX.play('missile'); else if (B.focus(st, x, y)) SFX.play('tap'); battleUI(); } }); }
function battleUI() { const st = bat.st, el = $('#bui'); if (!el) return; let h;
  if (st.phase === 'place') h = '<p class="note">Tap a squad, then tap a spot in any lane to move it. Squads in front take the first hits.</p><div class="row">' + btn('defStart', 'Start the battle', { cls: 'gold big' }) + '</div>';
  else if (st.phase === 'fight') h = '<p class="note">' + (st.su.battery ? 'Tap the field to call a strike (' + st.missiles + ' left). ' : '') + 'Tap an attacker to focus fire on it.</p><div class="row">' + btn('defFast', bat.speed === 1 ? 'Speed ×2.5' : 'Normal speed', { cls: 'sm' }) + '</div>';
  else { const r = st.result, held = r.D > 0; h = '<div class="result ' + (held ? 'good' : 'bad') + '"><h3>' + (held ? st.su.name + ' holds' : st.su.name + ' is overrun') + '</h3><p>' + (held ? r.D + ' of ' + st.su.D + ' defenders still standing.' : r.A + ' attackers take the city.') + '</p></div><div class="row">' + btn('defEnd', 'Continue', { cls: 'gold big' }) + '</div>'; }
  if (battleUI.h !== h) { battleUI.h = h; el.innerHTML = h; } }
function battleFrame(dt) { const st = bat.st, cv = $('#bcv'); if (!cv) return; const was = st.phase, shots = st.shots.length, blasts = st.blasts.filter(b => b.done).length;
  let left = dt * bat.speed; while (left > 0 && st.phase === 'fight') { const d = Math.min(0.04, left); B.step(st, d); left -= d; }
  if (st.shots.length > shots) SFX.play('shot'); if (st.blasts.filter(b => b.done).length > blasts) SFX.play('boom'); if (was !== st.phase) { battleUI.h = ''; battleUI(); SFX.play(st.result.D > 0 ? 'good' : 'alert'); }
  const g = cv.getContext('2d'), W = B.W, H = B.H; const bgr = g.createLinearGradient(0, 0, W, 0); bgr.addColorStop(0, '#1a0d0c'); bgr.addColorStop(0.45, '#0e1722'); bgr.addColorStop(1, '#0b2230'); g.fillStyle = bgr; g.fillRect(0, 0, W, H);
  for (const ly of st.LANES) { g.fillStyle = 'rgba(120,150,180,0.07)'; g.fillRect(0, ly - 40, W, 80); g.strokeStyle = 'rgba(140,170,200,0.12)'; g.setLineDash([10, 12]); g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke(); g.setLineDash([]); }
  g.fillStyle = 'rgba(40,190,186,0.14)'; g.fillRect(st.CORE_X - 6, 0, W - st.CORE_X + 6, H); g.fillStyle = '#123a44'; for (let i = 0; i < 9; i++) g.fillRect(st.CORE_X + 6 + (i % 2) * 18, 16 + i * 44, 14, 30 + (i * 37 % 20)); g.fillStyle = '#7fe6e0'; g.font = '600 13px sans-serif'; g.save(); g.translate(W - 8, H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(st.su.name.toUpperCase(), 0, 0); g.restore();
  if (st.wall) { const k = Math.max(0, st.wall.hp) / st.wall.max; g.fillStyle = k > 0 ? 'rgba(150,165,185,' + (0.35 + 0.55 * k) + ')' : 'rgba(90,60,50,0.4)'; g.fillRect(st.WALL_X, 20, 12, H - 40); if (PIMG.barricade && k > 0) for (const ly of st.LANES) g.drawImage(PIMG.barricade, st.WALL_X - 22, ly - 30, 56, 56); }
  if (st.phase === 'place') for (const ly of st.LANES) for (const cx of st.COLS) { g.strokeStyle = 'rgba(232,190,96,0.5)'; g.setLineDash([5, 5]); g.beginPath(); g.arc(cx, ly, 34, 0, 6.3); g.stroke(); g.setLineDash([]); }
  const img = (n, x, y, s) => { if (PIMG[n]) g.drawImage(PIMG[n], x - s / 2, y - s * 0.72, s, s); };
  for (const q of st.guns) { if (q.hp <= 0) { g.fillStyle = 'rgba(160,60,40,0.35)'; g.beginPath(); g.arc(q.x, q.y, 9, 0, 6.3); g.fill(); continue; } if (st.sel === q) { g.strokeStyle = '#f0c868'; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, 24, 0, 6.3); g.stroke(); g.lineWidth = 1; }
    if (q.flash > 0) { g.fillStyle = 'rgba(255,90,60,0.5)'; g.beginPath(); g.arc(q.x, q.y, 20, 0, 6.3); g.fill(); } img(q.team ? 'rover' : 'infantry', q.x, q.y + 10, 46); g.fillStyle = '#0a1018'; g.fillRect(q.x - 16, q.y + 16, 32, 4); g.fillStyle = q.team ? '#f0c868' : '#46d6d0'; g.fillRect(q.x - 16, q.y + 16, 32 * Math.max(0, q.hp) / q.max, 4); }
  for (const u of st.units) { if (u.hit > 0) { g.fillStyle = 'rgba(255,240,200,0.6)'; g.beginPath(); g.arc(u.x, u.y, 12, 0, 6.3); g.fill(); } img('swarm', u.x, u.y + 8, 34); if (st.focusT > 0 && st.focus === u.id) { g.strokeStyle = '#f0c868'; g.beginPath(); g.arc(u.x, u.y, 16, 0, 6.3); g.stroke(); } }
  for (const sh of st.shots) { g.strokeStyle = sh.team ? 'rgba(255,214,120,0.9)' : 'rgba(120,236,230,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(sh.x1, sh.y1 - 8); g.lineTo(sh.x2, sh.y2); g.stroke(); g.lineWidth = 1; }
  for (const b of st.blasts) { if (!b.done) { g.strokeStyle = 'rgba(255,200,120,0.8)'; g.setLineDash([6, 6]); g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.3); g.stroke(); g.setLineDash([]); } else { g.fillStyle = 'rgba(255,170,80,' + Math.max(0, b.fade) * 1.4 + ')'; g.beginPath(); g.arc(b.x, b.y, b.r * (1.1 - b.fade * 0.4), 0, 6.3); g.fill(); } }
  const alive = st.guns.filter(q => q.hp > 0).length, left2 = st.units.length + st.queue.length; g.fillStyle = 'rgba(8,14,22,0.7)'; g.fillRect(0, 0, W, 22); g.font = '600 13px sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ff8a6a'; g.fillText('Swarm left: ' + left2 + ' of ' + st.total, 10, 15); g.textAlign = 'center'; g.fillStyle = '#e8be60'; if (st.su.battery) g.fillText('Strikes: ' + st.missiles, W / 2, 15); g.textAlign = 'right'; g.fillStyle = '#7fe6e0'; g.fillText('Squads standing: ' + alive + ' of ' + st.guns.length, W - 10, 15); }

// ---------- Actions ----------
function report(r) { if (r && !r.ok && r.msg) toast(r.msg, 'bad'); return r && r.ok; }
function act(a, id) { if (!S && a !== 'start' && a !== 'diff') return;
  switch (a) {
    case 'diff': diff = id; introModal(); return;
    case 'start': S = L.newGame(id, diff); S.cmd = true; selId = HQ; closeModal(); V.focus('tokyo'); toast('The clock is paused. Look around, then press ▶ to begin.', 'info'); break;
    case 'new': introModal(); break;
    case 'speed': setSpeed(+id); break;
    case 'tab': tab = id; setPanel(true); break;
    case 'ptoggle': setPanel(!panelOpen); break;
    case 'sel': selId = id; tab = 'territory'; V.focus(id, compact() && window.innerHeight > window.innerWidth); setPanel(true); break;
    case 'reinforce': report(L.reinforce(S, id)); break;
    case 'airlift': report(L.airlift(S, id)); break;
    case 'build': { const p = id.split(':'); report(L.build(S, p[0], p[1])); break; }
    case 'buy': report(L.buy(S, id)); break;
    case 'card': if (report(L.playCard(S, +id))) SFX.play('good'); break;
    case 'trade': report(L.tradeCards(S)); break;
    case 'cmd': S.cmd = !S.cmd; break;
    case 'mute': SFX.muted = !SFX.muted; { const b = document.querySelector('[data-a="mute"]'); if (b) b.textContent = SFX.muted ? '🔇' : '🔊'; } return;
    case 'buildGo': { closeModal(); const q = id.split(':'); if (report(L.build(S, q[0], q[1]))) SFX.play('build'); break; }
    case 'defAuto': closeModal(); L.resolveDefense(S); break;
    case 'defGo': battleModal(); return;
    case 'defStart': B.start(bat.st); battleUI(); return;
    case 'defFast': bat.speed = bat.speed === 1 ? 2.5 : 1; battleUI(); return;
    case 'defEnd': { const r = bat.st.result; bat = null; closeModal(); L.resolveDefense(S, r); break; }
    case 'recon': report(L.deepRecon(S)); break;
    case 'deploy': report(L.deploy(S, id)); if (S.speed === 0 && S.team.dest) setSpeed(1); break;
    case 'covert': { const l = S.leaders.find(x => x.id === id), at = l.at; const r = L.covert(S, id); if (report(r)) { V.flash(at); } break; }
    case 'sabotage': if (report(L.sabotage(S, id))) V.flash(id); break;
    case 'salvo': { const bs = L.batteriesInRange(S, id); if (report(L.salvo(S, id))) { V.missile(bs[0], id); SFX.play('missile'); setTimeout(() => SFX.play('boom'), 1100); } break; }
    case 'salvoParty': report(L.salvoParty(S, +id)); break;
    case 'ambush': report(L.ambush(S, +id)); break;
    case 'bomb': if (report(L.bomb(S, id))) V.missile(HQ, id); break;
    case 'emp': if (report(L.empLaunch(S, id))) V.missile(HQ, id, 'emp'); break;
    case 'empBuild': report(L.empBuild(S)); break;
    case 'nukeStart': report(L.nukeStart(S)); break;
    case 'nuke': confirmModal('Launch on ' + TERR[id].name + '?', 'This erases ' + TERR[id].name + ' for the rest of the war. It will produce nothing and can never be retaken. Neighboring territories lose a unit to fallout.', 'nukeGo', id, '☢ Launch'); return;
    case 'nukeGo': closeModal(); if (report(L.nukeLaunch(S, id))) { V.missile(HQ, id, 'nuke'); SFX.play('missile'); setTimeout(() => SFX.play('boom'), 2200); } break;
    case 'assault': asl = { id, troops: Math.min(L.assaultAvail(S, id).n, L.enemyDefense(S, id) + 3), o: {} }; assaultModal(); return;
    case 'tac': asl.o[id] = !asl.o[id]; assaultModal(); return;
    case 'commit': { const r = L.assaultStart(S, asl.id, asl.troops, asl.o); if (report(r)) { asl.b = r.b; V.flash(asl.id); } assaultModal(); return; }
    case 'roll': L.assaultRound(S, asl.b); SFX.play('dice'); assaultModal(); return;
    case 'rollAll': while (!asl.b.done) L.assaultRound(S, asl.b); assaultModal(); return;
    case 'withdraw': L.assaultEnd(S, asl.b, false); assaultModal(); return;
    case 'closeModal': closeModal(); if (S.pending) L.resolveDefense(S); break;
    case 'globe': { const m = V.toggleMode(); const b = document.querySelector('[data-a="globe"]'); if (b) b.textContent = m === 'globe' ? 'Flat board' : 'Globe'; return; }
    case 'zoomIn': V.zoom(0.8); return; case 'zoomOut': V.zoom(1.25); return; case 'fit': V.fit(); return; case 'rotL': V.rotate(-0.3); return; case 'rotR': V.rotate(0.3); return; case 'tilt': V.tilt(); return;
  }
  drain(); renderAll(true); save(); }
function drain() { if (!S) return; const ev = S.ev.splice(0); for (const e of ev) {
    if (e.k === 'toast') toast(e.msg, e.kind); else if (e.k === 'pause') setSpeed(0);
    else if (e.k === 'defend') setTimeout(defendModal, 50);
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
  PIMG = art.pieces; V.init($('#map'), id => { if (!S) return; SFX.play('tap'); selId = id; if (id) { tab = 'territory'; setPanel(true); } else if (compact()) setPanel(false); renderAll(true); }, art);
  V.onCity = (id, key, built) => { if (!S) return; if (built) return toast(BUILD[key].name + (BUILD[key].levels ? ' is fully upgraded here.' : ' is already in place here.'), 'info'); const lv = S.terr[id][key] || 0, c = L.costOf(S, key, lv), can = L.canPay(S, c);
    showModal('<div class="mhead"><small>' + TERR[id].name + '</small><h1>' + (lv ? 'Upgrade ' + BUILD[key].name + ' to level ' + (lv + 1) : 'Build ' + BUILD[key].name) + '?</h1></div><p class="lead">' + BUILD[key].desc + '</p><p class="lead">' + cost(c) + (can ? '' : ' · not enough resources yet') + '</p><div class="row">' + btn('closeModal', 'Cancel') + btn('buildGo', 'Build', { id: id + ':' + key, cls: 'gold big', dis: !can }) + '</div>', 'confirm'); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.id); });
  const p = $('#panel'); p.addEventListener('pointerdown', () => { hold = true; }); window.addEventListener('pointerup', () => { setTimeout(() => { hold = false; }, 60); });
  document.addEventListener('keydown', e => { if (!S || modal || e.target.tagName === 'INPUT') return; if (e.code === 'Space') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); renderTop(); } });
  S = load(); if (S && S.pending) L.resolveDefense(S); if (S) { selId = HQ; renderAll(true); toast('Campaign resumed on ' + L.stamp(S) + '. Paused.', 'info'); } else introModal();
  let last = performance.now(), rT = 0;
  function loop(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S && S.speed > 0 && !modal && !S.over) { acc += dt * (S.speed === 1 ? 1 : 4); let n = 0; while (acc >= 1 && n++ < 6) { acc -= 1; L.step(S); if (S.ev.length) drain(); if (S.speed === 0) { acc = 0; break; } } }
    V.frac = S && S.speed > 0 ? acc : 0; rT += dt; if (rT > 0.25) { rT = 0; if (S && V.city && V.city !== selId && !modal) { selId = V.city; tab = 'territory'; renderPanel(true); } renderAll(); if (S && now - lastSave > 8000) { lastSave = now; save(); } }
    if (bat) battleFrame(dt); V.frame(dt); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.__g = { get S() { return S; }, L, V, act };
}
window.addEventListener('DOMContentLoaded', boot);
