// ---------- Interface ----------
const $ = s => document.querySelector(s);
const SAVE = 'earthfall-stage1';
let diff = 'normal', doc = 'fortress', S = null, selId = null, tab = 'territory', modal = null, acc = 0, lastSave = 0, hold = false;
const ICON = { metal: '⬢', fuel: '⚡\uFE0E', research: '✦', uranium: '☢\uFE0E', intel: '◎', salvage: '⬖' };
let panelOpen = false; const compact = () => window.matchMedia('(max-width:860px),(max-height:520px)').matches;
function setPanel(v) { panelOpen = v; document.body.classList.toggle('pclosed', !v); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cost = c => Object.keys(c).filter(k => c[k]).map(k => '<span class="c ' + k + '">' + ICON[k] + ' ' + c[k] + '</span>').join(' ');
const btn = (a, label, o) => { o = o || {}; return '<button class="btn ' + (o.cls || '') + '" data-a="' + a + '"' + (o.id ? ' data-id="' + o.id + '"' : '') + (o.dis ? ' disabled' : '') + '>' + (o.art ? '<i class="art art-' + o.art + '"></i>' : '') + '<span>' + label + '</span>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</button>'; };
const pct = p => Math.round(p * 100) + '%';
function save() { try { const c = Object.assign({}, S, { ev: [], obs: {} }); localStorage.setItem(SAVE, JSON.stringify(c)); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.v === 4 && !s.over) { s.ev = []; if (s.cmd == null) s.cmd = true; if (s.orders == null) s.orders = 6; s.speed = 0; for (const k of ['uranium', 'intel', 'salvage']) if (s.res[k] === undefined) s.res[k] = 0; L.setDiff(s.diff); L.refreshIntel(s); return s; } } catch (e) {} return null; }
function toast(msg, kind) { if (kind === 'bad') SFX.play('alert'); const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; const box = $('#toasts'); box.appendChild(t); while (box.children.length > (window.innerWidth < 860 ? 2 : 4)) box.removeChild(box.firstChild); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, window.innerWidth < 860 ? 4200 : 6500); }
function setSpeed(v) { if (S.over) v = 0; S.speed = v; }

// ---------- Top bar ----------
function renderTop() {
  const own = L.owned(S).length; let boxes = ''; for (let i = 0; i < 10; i++) boxes += '<i class="' + (i < S.esc ? 'on' : '') + '"></i>';
  const h = '<div class="brand"><b>EARTHFALL</b><small>Earth Defense Coalition</small></div>' +
    '<div class="clock"><span class="day">' + (S.mob ? 'Mobilization' : L.stamp(S)) + '</span><div class="speed">' + [[0, '❚❚'], [1, '▶'], [3, '▶▶']].map(s => '<button data-a="speed" data-id="' + s[0] + '" class="' + (S.speed === s[0] ? 'on' : '') + '" aria-label="speed ' + s[0] + '">' + s[1] + '</button>').join('') + '</div><button class="newg" data-a="newAsk" title="Start a new game">New game</button></div>' +
    '<div class="res">' + ['metal', 'fuel', 'research', 'uranium', 'intel', 'salvage'].map(k => '<span class="chip ' + k + '" title="' + k + '">' + ICON[k] + ' <b>' + Math.floor(S.res[k]) + '</b><small>' + k + '</small></span>').join('') +
    '<span class="chip orders" title="Orders left today. Every action spends them; they refill at midnight.">❖ <b>' + (S.mob ? '–' : S.orders == null ? '∞' : S.orders) + '</b><small>orders</small></span><button class="chip troops tap" data-a="strongList" title="Reserve troops. Tap to see your strongholds, where you place them.">◉ <b>' + S.pool + '</b><small>reserve</small></button><button class="chip tap gold" data-a="strongList" title="Your strongholds">✦ <b>' + STRONG.filter(id => S.terr[id].owner === 'you').length + '</b><small>strongholds</small></button><span class="chip" title="Territories held">⚑ <b>' + own + '</b><small>held</small></span></div>' +
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
  let h = '<div class="thead ' + T.owner + '"><small>' + D.area + ', ' + REGIONS[D.region].name + ' · produces ' + ICON[D.res] + ' ' + D.res + (URANIUM.includes(selId) ? ' and ' + ICON.uranium + ' uranium' : '') + '</small><h2>' + D.name + '</h2><span class="own">' + (T.owner === 'you' ? (selId === HQ ? 'Coalition HQ · Stronghold' : L.isStrong(selId) ? 'Coalition held · Stronghold' : 'Coalition held') : T.owner === 'enemy' ? 'Occupied' : 'Wasteland') + '</span></div>';
  if (PERKS[selId] && T.owner !== 'waste') h += '<div class="perk' + (T.owner === 'you' ? ' on' : '') + '"><b>★ ' + PERKS[selId].name + '</b><span>' + PERKS[selId].desc + (T.owner === 'you' ? '' : ' · liberate to gain') + '</span></div>';
  if (T.owner !== 'waste') { const y = L.yieldOf(S, selId), rows = Object.keys(y.res).map(k => '<div><label>' + k + '</label><b class="c ' + k + '">' + ICON[k] + ' +' + y.res[k] + '</b></div>');
    if (y.uranium) rows.push('<div><label>uranium</label><b class="c uranium">' + ICON.uranium + ' +' + y.uranium + '</b></div>'); if (y.intel) rows.push('<div><label>intel</label><b class="c intel">' + ICON.intel + ' +' + y.intel + '</b></div>');
    h += '<div class="yield"><h4>' + (T.owner === 'you' ? 'Produces each day' : 'Worth each day if liberated') + (L.isStrong(selId) ? ' · stronghold, double output' : '') + '</h4><div class="stats">' + rows.join('') + '</div>' + (y.notes.length ? '<p class="note">' + y.notes.join(' · ') + '</p>' : '') + '</div>'; }
  const inc = S.parties.filter(p => p.to === selId && L.partyVisible(S, p));
  if (T.owner === 'you') {
    const st = [T.works && 'Industry ' + T.works, T.barracks && 'Barracks ' + T.barracks, T.fort && 'Fortress' + (T.fort > 1 ? ' ' + T.fort : ''), T.radar && 'Radar', T.battery && ('Missile battery' + ((T.reload || 0) > S.t ? ' (reloading ' + (T.reload - S.t) + 'h)' : ''))].filter(Boolean).join(', ') || 'None';
    h += '<div class="stats"><div><label>Garrison</label><b>' + (T.n + (T.arm || 0)) + '</b>' + (T.arm ? '<small>' + T.n + ' infantry · ' + T.arm + ' armor</small>' : '') + '</div><div><label>Defense bonus</label><b>+' + Math.min(L.isStrong(selId) ? 3 : 2, (T.fort || 0) + (S.up.hardened ? 1 : 0) + (PERKS[selId] && PERKS[selId].def || 0)) + '</b></div><div class="wide"><label>Structures</label><span>' + st + '</span></div></div>';
    if (inc.length) { h += '<div class="alert"><b>⚠ Under attack</b>'; for (const p of inc) { h += '<div class="inc"><span>' + p.n + ' attackers from ' + TERR[p.from].name + ' arrive in ' + Math.max(0, p.eta - S.t) + 'h</span>';
        if (teamHere && !p.hit) h += btn('ambush', 'Ambush', { id: p.id, cls: 'sm' }); if (L.batteriesInRange(S, p.to).length || L.batteriesInRange(S, p.from).length) h += btn('salvoParty', 'Missiles', { id: p.id, cls: 'sm' }); h += '</div>'; } h += '</div>'; }
    h += '<div class="acts">' + btn('reinforce', 'Reinforce', { id: selId, art: 'deploy', cls: 'teal big', sub: L.isStrong(selId) || S.mob ? 'Add 1 troop from reserve (' + S.pool + ' left)' : 'Reserves muster at strongholds (✦). March them here.', dis: S.pool < 1 || !(L.isStrong(selId) || S.mob) }) +
      btn('airlift', 'Airlift in', { id: selId, art: 'airlift', sub: 'Move 2 troops from your largest garrison · ' + cost({ fuel: 15 }), dis: (S.airT || 0) > S.t });
    if (T.job) h += '<p class="note job">⚒ ' + BUILD[T.job.key].name + ' under construction, ready in ' + Math.max(1, T.job.doneAt - S.t) + ' hours.</p>';
    if (T.barracks) h += btn('armAsk', 'Train armor', { id: selId, art: 'assault', sub: 'Counts double when attacking, single when defending. ' + cost(ARMOR_COST) + ' each' + (S.mob ? '' : ' · 1 Order'), dis: !L.canPay(S, ARMOR_COST) || S.orders < 1 });
    else h += '<p class="note">Build a Barracks here to train armor, which counts double on the attack.</p>';
    for (const k of T.job ? [] : ['works', 'barracks', 'post']) { const lv = T[k] || 0; if (lv < L.maxLevel(selId, k)) h += btn('build', (lv ? 'Upgrade ' : 'Build ') + BUILD[k].name + (lv ? ' to level ' + (lv + 1) : ''), { art: k === 'works' ? 'research' : k === 'post' ? 'covert-strike' : 'deploy', id: selId + ':' + k, sub: BUILD[k].desc + ' ' + cost(L.costOf(S, k, lv)), dis: !L.canPay(S, L.costOf(S, k, lv)) }); }
    for (const k of T.job ? [] : ['fort', 'radar', 'battery']) if ((T[k] || 0) < L.maxLevel(selId, k)) h += btn('build', (T[k] ? 'Upgrade ' : 'Build ') + BUILD[k].name + (T[k] ? ' to level ' + (T[k] + 1) : ''), { art: { fort: 'fortify', radar: 'radar', battery: 'missile-battery' }[k], id: selId + ':' + k, sub: BUILD[k].desc + ' ' + cost(L.costOf(S, k, T[k])), dis: !L.canPay(S, L.costOf(S, k, T[k])) });
    h += '</div>';
  } else if (T.owner === 'enemy') {
    if (known) { const g = L.guards(S, selId); h += '<div class="stats"><div><label>Strength</label><b>' + T.n + '</b></div><div><label>Leader guards</label><b>+' + g + '</b></div><div><label>Total defense</label><b>' + (T.n + g) + '</b></div></div>';
      const tg = [T.alert > S.t && 'On alert', T.disarray > S.t && 'In disarray', T.soft > S.t && 'Defenses shaken', T.emp > S.t && 'EMP blackout'].filter(Boolean); if (tg.length) h += '<p class="tags">' + tg.map(x => '<em class="tag">' + x + '</em>').join('') + '</p>';
      const ls = L.leadersAt(S, selId); if (ls.length) { h += '<h4>Command present</h4>'; for (const l of ls) h += leaderRow(l, true); }
    } else h += '<p class="note">No current intel. Last known strength ' + T.seenN + ', ' + Math.max(1, Math.round((S.t - T.seenT) / 24)) + ' days ago. Build radar nearby or send the strike team to see more.</p>';
    const av = L.assaultAvail(S, selId);
    h += '<div class="acts">' + btn('assault', 'Plan assault', { id: selId, art: 'assault', cls: 'gold big', sub: av.n + (av.n === 1 ? ' troop' : ' troops') + ' available · 2 Orders' + (av.supplied ? '' : ' · no land border, landing under fire') });
    if (teamHere) h += btn('sabotage', 'Sabotage', { id: selId, cls: 'violet', sub: pct(L.sabOdds(S, selId)) + ' success · strength −2, Harvest −2% · ' + cost({ fuel: 10, intel: 1 }) });
    if (L.batteriesInRange(S, selId).length) h += btn('salvo', 'Missile salvo', { id: selId, art: 'missile', sub: 'Strength −1 to −2 · ' + cost(SALVO_COST) });
    if (S.up.bombers) h += btn('bomb', 'Bomber raid', { id: selId, art: 'bomber-raid', sub: (S.bombT || 0) > S.t ? 'Rearming, ' + (S.bombT - S.t) + 'h' : 'Strength −1 to −3 · ' + cost(BOMB_COST), dis: (S.bombT || 0) > S.t });
    if (S.emp.n > 0) h += btn('emp', 'EMP strike', { id: selId, art: 'drone', sub: 'Halves leader guards, stops attacks for 3 days · ' + S.emp.n + ' ready' });
    h += '</div>';
  } else h += '<p class="note">Nothing lives here. It produces nothing and belongs to no one.</p>';
  if (T.owner !== 'waste') { h += '<div class="acts">';
    if (teamHere) h += '<p class="note teamhere">◆ Your strike team is here' + (T.owner === 'you' ? ', strengthening the defense.' : ', undetected.') + ' ' + btn('teamHelp', 'How the strike team works', { cls: 'sm' }) + '</p>';
    else if (tm.dest) h += '<p class="note">◆ Strike team in transit to ' + TERR[tm.dest].name + ', ' + Math.max(0, tm.eta - S.t) + 'h out. ' + btn('teamHelp', 'How it works', { cls: 'sm' }) + '</p>';
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
  if ((S.cols || []).length) { h += '<h4>On the move</h4>'; for (const c of S.cols) h += '<div class="leader" data-a="sel" data-id="' + c.to + '"><span class="gl">' + (c.air ? '✈' : '⇄') + '</span><div><b>' + (c.n + (c.arm || 0)) + ' troops' + (c.arm ? ' (' + c.arm + ' armor)' : '') + ' to ' + TERR[c.to].name + '</b><small>' + (c.air ? 'Airlift' : 'Marching') + ' from ' + TERR[c.from].name + ' · arrives in ' + Math.max(0, c.eta - S.t) + 'h</small></div></div>'; }
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
function panelArsenal() { const nk = S.nuke, em = S.emp; let h = wallet() + '</div><h4>Production</h4>';
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
function showModal(html, cls) { modal = true; setTimeout(() => { actionBar(); coach(); }, 0); const m = $('#modal'); m.className = 'show ' + (cls || ''); m.innerHTML = '<div class="sheet">' + html + '</div>'; S && setSpeed(0); }
function closeModal() { clearInterval(asTimer); modal = null; $('#modal').className = ''; $('#modal').innerHTML = ''; if (asl && S && S.tut === 1) S.tut = 2; asl = null; renderAll(true); }
function introModal() { let h = '<div class="mhead"><small>Earth Defense Coalition</small><h1>EARTHFALL</h1></div><p class="lead">They came down without warning, and never in the same place twice. You command what is left. Hold the line, break their chain of command, and stop the Harvest before it completes.</p>' +
  '<ul class="how"><li><b>The clock runs</b> while you play. Pause any time; orders work while paused.</li><li><b>Occupied regions grow</b> every day and break out into their neighbors when overfull.</li><li><b>Nothing is locked.</b> You can strike the Overlord on day one. The odds are shown before you commit.</li><li><b>You mobilize first.</b> A war chest and 20 troops to spend before the clock starts.</li><li><b>Territories produce</b> metal, fuel or research. Four also yield uranium for the warhead. Radar earns intel for covert work, and battles your strike team wins yield salvage for the best gear.</li></ul><h4>Difficulty</h4><div class="specs">' + Object.keys(DIFFS).map(k => '<button class="spec tac' + (diff === k ? ' on' : '') + '" data-a="diff" data-id="' + k + '"><b>' + DIFFS[k].name + '</b><span>' + DIFFS[k].desc + '</span></button>').join('') + '</div><h4>Doctrine · in force for the whole war</h4><div class="specs">' + Object.keys(DOCTRINES).map(k => '<button class="spec tac' + (doc === k ? ' on' : '') + '" data-a="doc" data-id="' + k + '"><b>' + DOCTRINES[k].name + '</b><span>' + DOCTRINES[k].desc + '</span></button>').join('') + '</div><h4>Choose your strike team to begin</h4><div class="specs">';
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
  if (!a.b) { const tm = S.team; if (tm.dest === a.id) h += '<p class="note teamhere">◆ Your strike team is still flying here and lands in ' + Math.max(1, Math.ceil(tm.eta - S.t)) + 'h. It will <b>not</b> be in this attack. Wait for it to land and it fights alongside your troops.</p>'; else if (L.teamAt(S) === a.id && tm.pips > 0) h += '<p class="note teamhere">◆ Your strike team is inside ' + D.name + ' and joins this attack.</p>';
  }
  if (!a.b) { const payM = L.canPay(S, SALVO_COST), payA = L.canPay(S, BOMB_COST); if (!payM) a.o.missile = false; if (!payA) a.o.air = false; // support you cannot afford is switched off, never left blocking the attack
    const pl = L.assaultPlan(S, a.id, a.troops, a.o); h += wallet() + '</div>'; a.troops = pl.troops; if (pl.from) a.o.from = Object.assign({}, pl.from);
    h += '<div class="vs"><div class="side you"><label>Coalition force</label><b>' + pl.A + '</b><small>' + (pl.arm ? pl.inf + ' infantry + ' + pl.arm + ' armor (counts double)' : pl.inf + ' troops') + (pl.teamN ? ' + strike team (' + pl.teamN + ')' : '') + '</small></div><span>VS</span><div class="side enemy"><label>Defense</label><b>' + pl.D + '</b><small>' + S.terr[a.id].n + ' strength + ' + pl.guards + ' guards' + (a.o.missile && pl.can.missile ? ' − 2 missiles' : '') + (a.o.air && pl.can.air ? ' − 3 air' : '') + '</small></div></div>' +
      (pl.supplied ? '<div class="srcs"><h4>Attacking from</h4>' + pl.by.map(b => '<div class="slider"><label><b>' + TERR[b.id].name + '</b> sends <b>' + pl.from[b.id] + '</b> of ' + b.max + (pl.armFrom[b.id] ? ' <small>(' + pl.armFrom[b.id] + ' armor)</small>' : '') + ' <small>(1 stays behind)</small></label><input type="range" data-src="' + b.id + '" min="0" max="' + b.max + '" value="' + pl.from[b.id] + '"></div>').join('') + '</div>' : '<div class="slider"><label for="troops">Reserve troops to land: <b>' + pl.troops + '</b> of ' + pl.avail + '</label><input id="troops" type="range" min="0" max="' + pl.avail + '" value="' + pl.troops + '"></div>') +
      '<div class="est"><label>Estimated success</label><b class="' + (pl.p > 0.65 ? 'good' : pl.p > 0.35 ? 'warn' : 'bad') + '">' + pct(pl.p) + '</b><div class="bar"><i style="width:' + pl.p * 100 + '%"></i></div>' + (pl.supplied ? '' : '<small>No land border: your reserve lands from the sea, and defenders roll +1 on their best die.</small>') + '</div>' +
      (pl.supplied ? '<div class="flankline ' + (pl.flank ? 'on' : '') + '"><b>' + (pl.flank ? '✓ Flanking' : 'No flank') + '</b><span>' + (pl.flank ? 'You are attacking from ' + Object.values(pl.from).filter(n => n > 0).length + ' sides, so your best die gets +1. This is automatic.' : pl.by.length > 1 ? 'Send troops from a second territory above and your best die gets +1.' : 'Only one of your territories borders this one. Hold a second bordering territory and attacks here get +1 on your best die.') + '</span></div>' : '') +
      '<h4 class="suph">Optional support</h4><div class="tactics two">' +
      '<button class="tac' + (a.o.missile ? ' on' : '') + '" data-a="tac" data-id="missile"' + (pl.can.missile && payM ? '' : ' disabled') + '><i class="art top art-missile"></i><b>Missile support</b><span>' + (!pl.can.missile ? 'Needs a loaded battery within 2 territories.' : !payM ? 'You cannot afford it: you have ' + cost({ fuel: Math.floor(S.res.fuel), metal: Math.floor(S.res.metal) }) + '.' : 'Defense −2 before the first roll.') + '</span><small>' + cost(SALVO_COST) + '</small></button>' +
      '<button class="tac' + (a.o.air ? ' on' : '') + '" data-a="tac" data-id="air"' + (pl.can.air && payA ? '' : ' disabled') + '><i class="art top art-strike"></i><b>Air support</b><span>' + (!pl.can.air ? 'Needs Strategic Bombers, rearmed.' : !payA ? 'You cannot afford it: you have ' + cost({ fuel: Math.floor(S.res.fuel) }) + '.' : 'Defense −3 before the first roll.') + '</span><small>' + cost(BOMB_COST) + '</small></button></div>' +
      '<div class="row">' + btn('closeModal', 'Cancel') + btn('commit', 'Commit attack', { cls: 'gold big', sub: pl.A < 1 ? 'No troops committed' : S.orders < 2 ? 'Not enough Orders (2 needed, ' + S.orders + ' left)' : !L.canPay(S, pl.cost) ? 'Not enough resources: needs ' + cost(pl.cost) : 'Costs 2 Orders' + (pl.cost.fuel || pl.cost.metal ? ' and ' + cost(pl.cost) : ''), dis: pl.A < 1 || S.orders < 2 || !L.canPay(S, pl.cost) }) + '</div>';
  } else { const b = a.b, last = b.rounds[b.rounds.length - 1] || { aL: 0, dL: 0 }, row = (side, alive, lost, total) => { const cap = 16, k = total > cap ? cap / total : 1, al = Math.round(Math.max(0, alive) * k), lo = Math.max(lost ? 1 : 0, Math.round(lost * k)); let u = ''; for (let i = 0; i < al; i++) u += '<i class="u ' + side + (b.done ? '' : ' fire') + '" style="animation-delay:' + (i % 5) * 70 + 'ms"></i>'; for (let i = 0; i < lo; i++) u += '<i class="u ' + side + ' dead"></i>'; return u; };
    h += '<div class="field"><div class="fside you"><div class="fcount"><b>' + Math.max(0, b.A) + '</b><small>of ' + b.A0 + ' troops</small></div><div class="units">' + row('you', b.A, last.aL, b.A0) + '</div></div><div class="fmid">' + (b.done ? '' : '<span class="tracer"></span><span class="tracer t2"></span>') + '</div><div class="fside enemy"><div class="fcount"><b>' + Math.max(0, b.D) + '</b><small>of ' + b.D0 + ' defense</small></div><div class="units">' + row('enemy', b.D, last.dL, b.D0) + '</div></div></div>';
    h += '<p class="blow">' + (b.rounds.length ? 'Round ' + b.rounds.length + ': ' + ([last.dL ? 'they lose ' + last.dL : '', last.aL ? 'you lose ' + last.aL : ''].filter(Boolean).join(', ') || 'no losses') : 'Your troops are moving in…') + '</p>';
    if (b.done) h += '<div class="result ' + (b.won ? 'good' : 'bad') + '"><h3>' + (b.won ? D.name + ' is liberated' : b.A <= 0 ? 'The assault failed' : 'Withdrawn') + '</h3>' + (b.notes || []).map(n => '<p>' + esc(n) + '</p>').join('') + '</div><div class="row">' + btn('closeModal', 'Continue', { cls: 'gold big' }) + '</div>';
    else h += '<div class="row">' + btn('withdraw', 'Withdraw') + btn('rollAll', 'Skip to the end') + '</div>'; }
  showModal(h, 'assault'); const sl = $('#troops'); if (sl) sl.addEventListener('input', () => { asl.troops = +sl.value; assaultModal(); const n = $('#troops'); if (n) n.focus(); });
  document.querySelectorAll('.srcs input').forEach(inp => inp.addEventListener('input', () => { asl.o.from[inp.dataset.src] = +inp.value; assaultModal(); const n = document.querySelector('.srcs input[data-src="' + inp.dataset.src + '"]'); if (n) n.focus(); })); }
function confirmModal(title, text, act, id, label) { showModal('<div class="mhead"><small>Confirm</small><h1>' + title + '</h1></div><p class="lead">' + text + '</p><div class="row">' + btn('closeModal', 'Cancel') + btn(act, label, { id, cls: 'danger big' }) + '</div>', 'confirm'); }

// ---------- Action bar ----------
// The few things you can do with the selected territory, as large buttons on the map itself.
function actionBar() { const el = $('#abar'); if (!el) return; let h = '';
  if (S && moveFrom && !S.over && !modal && S.terr[moveFrom].owner === 'you') { const F = S.terr[moveFrom], max = F.n - 1 + (F.arm || 0);
    if (!moveTo) h = '<div class="abh you"><b>Move from ' + TERR[moveFrom].name + '</b><span>now tap the territory to send them to</span><button data-a="moveCancel" aria-label="Cancel">✕</button></div>';
    else { const hops = S.mob ? 0 : L.marchHops(S, moveFrom, moveTo), far = hops > 3, cap = far ? Math.min(F.n - 1, L.airMax(S)) : max, nums = cap <= 5 ? Array.from({ length: cap }, (_, k) => k + 1) : [...new Set([1, 2, 3, Math.ceil(cap / 2), cap])], wait = far && (S.airT || 0) > S.t, oc = hops <= 1 ? 0 : 1, no = far ? (wait || S.res.fuel < 15 || S.orders < 2) : S.orders < oc, batOk = F.battery && !far && !S.terr[moveTo].battery && !S.terr[moveTo].job && !no;
      h = '<div class="abh you"><b>' + TERR[moveFrom].name + ' → ' + TERR[moveTo].name + '</b><span>' + (S.mob ? 'instant while mobilizing' : far ? (wait ? 'transports refueling, ' + (S.airT - S.t) + 'h' : 'too far to march · airlift, 3h · ' + cost({ fuel: 15 }) + ' · 2 ❖') : hops * L.marchHours(S) + ' hours on the road · ' + (oc ? '1 ❖' + (S.orders < 1 ? ' · out of Orders, but next door is free' : '') : 'free, no Order')) + '</span><button data-a="moveCancel" aria-label="Cancel">✕</button></div><div class="abr"><span class="abq">How many?</span>' +
        nums.map(n => '<button class="ab num' + (n === cap ? ' teal' : '') + '" data-a="' + (far ? 'airGo' : 'moveGo') + '" data-id="' + moveFrom + ':' + moveTo + ':' + n + '"' + (no ? ' disabled' : '') + '><b>' + (n === cap && cap > 1 ? 'All ' + n : n) + '</b></button>').join('') + (F.battery ? '<button class="ab num bat" data-a="batGo" data-id="' + moveFrom + ':' + moveTo + '"' + (batOk ? '' : ' disabled') + '><b>🚀 Missiles</b></button>' : '') + '</div>'; } }
  else if (S && selId && !S.over && !modal) { const T = S.terr[selId], D = TERR[selId], tm = S.team, teamHere = L.teamAt(S) === selId, a = [];
    const A = (act, icon, label, sub, o) => a.push('<button class="ab ' + ((o && o.cls) || '') + '" data-a="' + act + '" data-id="' + selId + '"' + (o && o.dis ? ' disabled' : '') + '><i>' + icon + '</i><b>' + label + '</b><small>' + sub + '</small></button>');
    let who;
    if (T.owner === 'you') { who = (selId === HQ ? 'Your headquarters' : L.isStrong(selId) ? 'Your stronghold' : 'Yours') + ' · ' + T.n + ' infantry' + (T.arm ? ', ' + T.arm + ' armor' : ''); const built = ['works', 'barracks', 'fort', 'radar', 'battery'].filter(k => T[k]).length;
      if (L.isStrong(selId) || S.mob) A('reinAsk', '✚', 'Reinforce', S.pool + ' in reserve · free', { cls: 'teal', dis: S.pool < 1 }); { const can = T.n - 1 + (T.arm || 0); A('moveFrom', '⇄', 'Move', can < 1 && !T.battery ? 'Only 1 here' : (can > 0 ? can + ' can go' : 'Missile battery') + (S.mob ? '' : ' · next door free'), { dis: can < 1 && !T.battery }); }
      if (T.barracks) A('armAsk', '▰', 'Train armor', cost(ARMOR_COST) + ' each', { dis: !L.canPay(S, ARMOR_COST) || S.orders < 1 }); A('buildMenu', '⚒', L.isStrong(selId) ? 'Build up' : 'Build', T.job ? Math.max(1, T.job.doneAt - S.t) + 'h to finish' : L.isStrong(selId) ? 'Stronghold · 1 ❖' : built + ' of 5 · 1 ❖');
      if (!teamHere && !tm.dest) A('deploy', '◆', 'Strike team', L.travelHours(S, tm.at, selId) + 'h away', { dis: tm.pips < 1 }); }
    else if (T.owner === 'enemy') { const av = L.assaultAvail(S, selId), known = S.obs[selId]; who = 'Occupied · ' + (known ? 'defense ' + (T.n + L.guards(S, selId)) : 'strength unknown');
      A('assault', '⚔', 'Attack', S.mob ? 'After you begin the war' : S.orders < 2 ? 'Needs 2 Orders' : av.n ? av.n + (av.n === 1 ? ' troop' : ' troops') + ' ready · 2 ❖' : av.supplied ? 'Neighbors need 2+ troops' : 'No reserve to land', { cls: 'gold', dis: av.n < 1 || S.orders < 2 || S.mob });
      if (L.batteriesInRange(S, selId).length) A('salvo', '➶', 'Missiles', 'Strength −1 to −2');
      if (teamHere) A('sabotage', '✸', 'Sabotage', pct(L.sabOdds(S, selId)) + ' success'); else if (!tm.dest) A('deploy', '◆', 'Strike team', L.travelHours(S, tm.at, selId) + 'h away', { dis: tm.pips < 1 });
      if (S.up.bombers) A('bomb', '✈', 'Bombers', (S.bombT || 0) > S.t ? 'Rearming' : 'Strength −1 to −3', { dis: (S.bombT || 0) > S.t }); }
    else who = 'Wasteland · nothing lives here';
    A('more', '☰', 'Details', 'Everything');
    h = '<div class="abh ' + T.owner + '"><b>' + D.name + '</b><span>' + who + '</span><button data-a="desel" aria-label="Close">✕</button></div><div class="abr">' + a.join('') + '</div>'; }
  if (actionBar.h !== h) { actionBar.h = h; el.innerHTML = h; el.className = h ? 'show' : ''; $('#map').classList.toggle('hasbar', !!h); } }
function colModal() { const c = S && S.pendingCol; if (!c || modal) return; const opts = L.colOptions(S, c); SFX.play('alert');
  showModal('<div class="mhead"><small>Column of ' + c.n + ' troops</small><h1>' + TERR[c.to].name + ' has fallen</h1></div><p class="lead">Your troops from ' + TERR[c.from].name + ' were still on the way. Where should they go?</p><div class="row">' + (opts.length ? opts.map((id, i) => btn('colGo', (id === c.from ? 'Return to ' : 'Divert to ') + TERR[id].name, { id, cls: i === 0 ? 'gold big' : '', sub: S.terr[id].n + ' troops there now' })).join('') : btn('colGo', 'Fall back into reserve', { id: '', cls: 'gold big' })) + '</div>', 'confirm'); }
function within2(id) { const d = { [id]: 0 }, q = [id]; while (q.length) { const x = q.shift(); if (d[x] >= 2) continue; for (const y of TERR[x].adj) if (d[y] === undefined) { d[y] = d[x] + 1; q.push(y); } } return Object.keys(d).filter(x => x !== id); }
// What a building would actually change in this particular city, in plain numbers.
function buildEffect(id, k) { const T = S.terr[id], lv = T[k] || 0, res = TERR[id].res, base = (L.isStrong(id) ? 12 : 6), near = within2(id).filter(x => S.terr[x].owner === 'enemy');
  if (k === 'works') return 'This city makes <b>' + ICON[res] + ' ' + (base + L.worksYield(S) * lv) + '</b> ' + res + ' a day. With this: <b>' + (base + L.worksYield(S) * (lv + 1)) + '</b>.';
  if (k === 'barracks') return (lv ? 'Raises ' + lv + ' free troop' + (lv > 1 ? 's' : '') + ' here every 3 days. With this: <b>' + (lv + 1) + '</b>.' : 'Raises <b>1 free troop</b> here every 3 days, and lets you <b>train armor</b> in this city.');
  if (k === 'post') return 'You get ' + L.ordersMax(S) + ' Orders a day. With this: <b>' + (L.ordersMax(S) + 1) + '</b>, every day.';
  if (k === 'fort') { const D = T.n + (T.arm || 0), A = D + 2, cap = L.isStrong(id) ? 3 : 2, cur = Math.min(cap, lv + (S.doc === 'fortress' ? 1 : 0)), nxt = Math.min(cap + (S.doc === 'fortress' ? 1 : 0), lv + 1 + (S.doc === 'fortress' ? 1 : 0)); return 'If ' + A + ' attackers hit the ' + D + ' troops here, the city falls about <b>' + pct(L.estimate(A, D, 0, cur)) + '</b> of the time. With this: <b>' + pct(L.estimate(A, D, 0, nxt)) + '</b>.'; }
  if (k === 'radar') return near.length ? 'Would show you the strength, leaders and attacks of <b>' + near.length + ' enemy territories</b> near here (' + near.slice(0, 3).map(x => TERR[x].name).join(', ') + (near.length > 3 ? '…' : '') + '), and adds +1 intel a day.' : 'No enemy territory is within 2 steps of here, so a radar would see nothing yet.';
  if (k === 'battery') return near.length ? 'Could fire on <b>' + near.length + ' enemy territories</b> from here (' + near.slice(0, 3).map(x => TERR[x].name).join(', ') + (near.length > 3 ? '…' : '') + '), knocking 1 to 2 strength off each time.' : 'No enemy territory is within 2 steps of here, so a battery would have no targets yet.';
  return BUILD[k].desc; }
let buildHelp = false, buildInfo = null;
// The longer story for each building: what it is, how levels work, where it belongs, what you risk.
const BUILD_INFO = {
  works: ['What it is', 'Factories, refineries or labs, depending on what this city produces.', 'What you get', 'More of this city\'s resource every day, for the rest of the war. Each level adds the same amount again.', 'Where', 'Strongholds first: they can go to level 5 and already produce double. Keep it away from the front.', 'Risk', 'Every level is lost if the city falls.'],
  barracks: ['What it is', 'A training ground and depot.', 'What you get', 'Free troops that appear in this city every 3 days, one per level. It is also the only place you can train armor, which counts double when attacking.', 'Where', 'One or two cities behind the front, close enough that the troops can march to it in a day.', 'Risk', 'Lost with the city, along with any armor parked there.'],
  post: ['What it is', 'A regional headquarters. Strongholds only.', 'What you get', 'One more Order every day. Orders are what limit how much you can do, so this is the strongest long-term building.', 'Where', 'Your safest strongholds.', 'Risk', 'Expensive, and lost if the city falls.'],
  fort: ['What it is', 'Walls, bunkers and gun lines around the city.', 'What you get', 'Your troops here roll +1 on their best die for each level whenever the city is attacked. It does nothing when you attack.', 'Where', 'On the front, in cities you cannot afford to lose, especially strongholds (up to level 3 there).', 'Risk', 'Destroyed if the city falls. It will not hold a city with almost no troops in it.'],
  radar: ['What it is', 'A long-range sensor station.', 'What you get', 'You see the real strength of every enemy territory within 2 steps, which leaders are there, and any war party heading your way, hours before it arrives. Also +1 intel a day.', 'Where', 'One on each stretch of front. Two radars covering the same area are wasted.', 'Risk', 'Lost with the city.'],
  battery: ['What it is', 'A missile launch site.', 'What you get', 'Fire on any enemy territory or war party within 2 steps: 1 to 2 strength off each time, then 24 hours to reload. Each shot costs fuel, metal and an Order.', 'Where', 'Just behind the front, so it reaches enemy land but is not the first thing attacked.', 'Risk', 'Lost with the city.'] };
function wallet() { return '<div class="wallet"><span class="wl">You have</span>' + ['metal', 'fuel', 'research'].map(k => '<span class="chip ' + k + '">' + ICON[k] + ' <b>' + Math.floor(S.res[k]) + '</b><small>' + k + '</small></span>').join('') + (S.mob ? '' : '<span class="chip orders">❖ <b>' + S.orders + '</b><small>orders</small></span>'); }
function incomePerDay() { const inc = { metal: 0, fuel: 0, research: 0 }; for (const id of L.owned(S)) { const y = L.yieldOf(S, id); for (const k in y.res) inc[k] += y.res[k]; } return inc; }
function buildMenu() { const T = S.terr[selId], inc = incomePerDay(); let h = '<div class="mhead"><small>' + TERR[selId].name + (L.isStrong(selId) ? ' · stronghold' : '') + '</small><h1>Build</h1></div>' +
  wallet() + '<button class="helpb" data-a="buildHelp">' + (buildHelp ? 'Hide' : '? What is this') + '</button></div>' +
  (buildHelp ? '<div class="bhelp"><ul class="glist">' +
    '<li><b>' + ICON.metal + ' Metal</b> pays for almost every building, and for armor. You earn about <b>' + inc.metal + ' a day</b> from the territories that produce it.</li>' +
    '<li><b>' + ICON.fuel + ' Fuel</b> pays for Industry, batteries, armor, airlifts and missiles. About <b>' + inc.fuel + ' a day</b>.</li>' +
    '<li><b>' + ICON.research + ' Research</b> pays for radar, barracks and command posts here, and for upgrades in the Arsenal tab. About <b>' + inc.research + ' a day</b>.</li>' +
    (S.mob ? '<li><b>Right now</b> you are mobilizing: these totals are your war chest. Building is instant and costs no Orders. Daily income starts once the war begins.</li>' : '<li><b>❖ Orders</b> are how many actions you have left today. Each build costs 1 and takes ' + L.buildHours(S) + ' hours. One build at a time per city.</li>') +
    '<li><b>Each level costs more.</b> Level 2 costs twice level 1, level 3 three times, and so on.</li>' +
    '<li><b>Where to build what:</b> Fortress, Radar and Battery on the front, where teal touches red. Industry, Barracks and Command Post in safe cities behind it, because everything in a city is lost if it falls.</li>' +
    '<li><b>Strongholds (✦)</b> produce double and can be built higher than ordinary cities.</li></ul></div>' : '') + (S.mob ? '<p class="note">While you mobilize, building is instant and anything can be removed again for a full refund.</p>' : T.job ? '<p class="note job">⚒ ' + BUILD[T.job.key].name + ' is under construction, ' + Math.max(1, T.job.doneAt - S.t) + ' hours left. One job at a time per city.</p>' : '') + '<div class="blist">';
  for (const k of ['works', 'barracks', 'post', 'fort', 'radar', 'battery']) { const lv = T[k] || 0, max = L.maxLevel(selId, k), done = lv >= max, c = L.costOf(S, k, lv); if (!max) continue;
    const art = { works: 'research', barracks: 'deploy', post: 'covert-strike', fort: 'fortify', radar: 'radar', battery: 'missile-battery' }[k], why = !done && !L.canPay(S, c) ? 'Not enough resources' : !done && !S.mob && S.orders < 1 ? 'Out of Orders' : !done && T.job ? 'Wait for the current build' : '';
    h += '<div class="bitem"><i class="art bimg art-' + art + '"></i><div class="btxt"><b>' + BUILD[k].name + (max > 1 ? ' <small>level ' + lv + ' of ' + max + '</small>' : lv ? ' <small>built</small>' : '') + '</b><span>' + (done ? 'Complete. ' + BUILD[k].desc : buildEffect(selId, k)) + '</span><button class="binfo" data-a="buildInfo" data-id="' + k + '">' + (buildInfo === k ? 'Hide explanation' : '? Explain') + '</button></div><div class="bact">' +
      (done ? '' : '<button class="btn gold" data-a="buildGo" data-id="' + selId + ':' + k + '"' + (why ? ' disabled' : '') + '><b>' + (lv ? 'Upgrade' : 'Build') + '</b><small>' + (why || cost(c) + (S.mob ? '' : ' · 1 ❖ · ' + L.buildHours(S) + 'h')) + '</small></button>') +
      (S.mob && lv && !(selId === HQ && (k === 'fort' || k === 'radar') && lv <= 1) ? '<button class="btn" data-a="unbuild" data-id="' + selId + ':' + k + '"><b>Remove</b><small>refund ' + cost(L.costOf(S, k, lv - 1)) + '</small></button>' : '') + '</div>' + (buildInfo === k ? '<dl class="bmore">' + BUILD_INFO[k].map((x, i) => i % 2 ? '<dd>' + x + '</dd>' : '<dt>' + x + '</dt>').join('') + '<dt>Cost</dt><dd>' + (max > 1 ? 'Level 1 is ' + cost(L.costOf(S, k, 0)) + '; each level after costs that much more again.' : cost(L.costOf(S, k, 0)) + '.') + (S.mob ? ' Instant while mobilizing.' : ' 1 Order and ' + L.buildHours(S) + ' hours.') + '</dd></dl>' : '') + '</div>'; }
  showModal(h + '</div><div class="row">' + btn('closeModal', 'Done', { cls: 'gold big' }) + '</div>', 'build'); }
// ---------- Step-by-step guides ----------
// A short illustrated walkthrough, one idea per page. Used before the war (mobilization) and once more when it begins.
let guide = null;
function guideModal() { const g = guide, p = g.pages[g.i], last = g.i === g.pages.length - 1;
  showModal('<div class="mhead"><small>' + g.title + ' · step ' + (g.i + 1) + ' of ' + g.pages.length + '</small><h1>' + p.h + '</h1></div><i class="art gimg art-' + p.art + '"></i><div class="gbody">' + p.body + '</div><div class="gdots">' + g.pages.map((_, i) => '<i class="' + (i === g.i ? 'on' : '') + '"></i>').join('') + '</div><div class="row">' + (g.i ? btn('guideBack', 'Back') : btn('closeModal', 'Skip the guide')) + (last ? g.end : btn('guideNext', 'Next', { cls: 'gold big' })) + '</div>', 'guide'); }
const gl = items => '<ul class="glist">' + items.map(x => '<li><b>' + x[0] + '</b> ' + x[1] + '</li>').join('') + '</ul>';
function mobGuide() { const m = S.land.main, b = S.land.beach, front = L.owned(S).filter(id => L.enemyNeighborsN(S, id) > 0), sf = front.filter(id => L.isStrong(id));
  guide = { title: 'Before the war', i: 0, end: btn('autoMob', 'Mobilize for me', { sub: 'Spends everything sensibly for ' + DOCTRINES[S.doc].name }) + btn('closeModal', 'I will do it myself', { cls: 'gold big' }), pages: [
    { h: 'They have landed', art: 'breakout', body: '<p>The swarm came down on <b>' + TERR[m].name + '</b> and took the territories around it. A second force landed at <b>' + TERR[b].name + '</b>.</p>' + gl([['Red', 'territories are theirs.'], ['Teal', 'territories are yours. The number on each is how many troops hold it.'], ['The front', 'is wherever teal touches red. ' + front.length + ' of your territories are on it' + (sf.length ? ', including ' + sf.map(id => TERR[id].name).join(' and ') : '') + '.'], ['You win', 'by killing their Overlord (♛). You lose if Los Angeles falls.']]) },
    { h: 'This is mobilization', art: 'deploy', body: '<p>The clock has not started. Nothing will attack you yet. You have a war chest to get ready with, and <b>everything you do now is instant and free of limits</b>.</p>' + gl([['⬢ ' + Math.floor(S.res.metal) + ' metal', 'pays for buildings and armor.'], ['⚡ ' + Math.floor(S.res.fuel) + ' fuel', 'pays for armor, airlifts and missiles.'], ['✦ ' + Math.floor(S.res.research) + ' research', 'buys upgrades in the Arsenal tab.'], ['◉ ' + S.pool + ' troops', 'waiting in reserve to be placed.']]) + '<p>Whatever you do not spend, you keep.</p>' },
    { h: 'Place your troops', art: 'airlift', body: '<p>Tap one of your teal territories, then press <b>✚ Reinforce</b> and choose how many.</p>' + gl([['Where?', 'On the front, where teal touches red. A territory with 2 troops next to an enemy with 6 will fall.'], ['Strongholds', '(marked ✦) are your ten most valuable cities. Protect the ones near the front.'], ['Changed your mind?', 'Press ⇄ Move to shift troops between your territories. It is free for now.']]) },
    { h: 'Build', art: 'fortify', body: '<p>Tap one of your territories, then press <b>⚒ Build</b>.</p>' + gl([['Fortress', 'makes a city much harder to take. Best on the front.'], ['Industry', 'makes the city produce more every day. Best in strongholds, away from the front.'], ['Barracks', 'adds a free troop every 3 days and lets you train armor.'], ['Radar', 'shows enemy strength and incoming attacks nearby.'], ['Missile battery', 'lets you strike enemy territories within 2 steps.']]) },
    { h: 'Armor and research', art: 'assault', body: gl([['Armor', 'is trained at a Barracks. It counts double when you attack. Good if you plan to push forward early.'], ['Research', 'is in the <b>Arsenal</b> tab on the right. Each upgrade is permanent: tougher garrisons, bombers, a stronger strike team.'], ['Your doctrine', 'is <b>' + DOCTRINES[S.doc].name + '</b>: ' + DOCTRINES[S.doc].desc]]) },
    { h: 'When you are ready', art: 'strike', body: '<p>The panel at the bottom left of the map lists what you can still do, with a <b>Show</b> button for each. When you are happy, press <b>Begin the war</b> there.</p><p>Not sure what to buy? <b>Mobilize for me</b> spends everything in a sensible way for your doctrine. You can look at what it did and change it before you begin.</p>' }] }; guideModal(); }
function dayGuide() { guide = { title: 'The war', i: 0, end: btn('closeModal', 'Start playing', { cls: 'gold big' }), pages: [
    { h: 'Orders', art: 'covert-strike', body: '<p>From now on, every action spends <b>Orders</b> (❖ in the top bar). You get ' + L.ordersMax(S) + ' each day at midnight and can bank up to 3 unused.</p>' + gl([['2 Orders', 'attack, airlift.'], ['1 Order', 'march, build, train armor, missiles, strike team.'], ['Free', 'placing reserve troops, playing cards, defending.']]) },
    { h: 'Attacking', art: 'flank', body: '<p>Tap a red territory that touches one of yours, then press <b>⚔ Attack</b>.</p>' + gl([['Who fights', 'the spare troops in your territories next to it. Gold arrows show them.'], ['The odds', 'are shown before you commit.'], ['Two sides', 'attacking from two territories at once unlocks Flank, a free bonus.']]) },
    { h: 'Time', art: 'rapid-transport', body: '<p>Press <b>▶</b> at the top to run the clock. A day takes about two minutes. It pauses itself when something needs you.</p>' + gl([['Marching', 'takes 6 hours per territory. Buildings take a day.'], ['New troops', 'arrive every midnight and can only be placed at strongholds (✦). March them to the front.'], ['The swarm', 'grows and attacks only while the clock runs.'], ['Lost?', 'The panel at the bottom left always lists what you can do now.']]) }] }; guideModal(); }
// ---------- Briefing ----------
function briefModal() { const m = S.land.main, b = S.land.beach, en = L.enemyT(S), front = L.owned(S).filter(id => L.enemyNeighborsN(S, id) > 0), sf = front.filter(id => L.isStrong(id));
  showModal('<div class="mhead"><small>Day 0 · Briefing</small><h1>The landing</h1></div><p class="lead">The swarm came down on <b>' + TERR[m].name + '</b> and holds ' + (en.length - 4) + ' territories around it. A second force landed at <b>' + TERR[b].name + '</b>. ' + front.length + ' of your territories now face them' + (sf.length ? ', including the strongholds ' + sf.map(id => TERR[id].name).join(', ') : '') + '.</p>' +
    '<div class="stats"><div><label>War chest</label><span>' + cost({ metal: Math.floor(S.res.metal), fuel: Math.floor(S.res.fuel), research: Math.floor(S.res.research) }) + '</span></div><div><label>Reserve</label><b>' + S.pool + ' troops</b></div><div class="wide"><label>Doctrine</label><span><b>' + DOCTRINES[S.doc].name + '</b> · ' + DOCTRINES[S.doc].desc + '</span></div></div>' +
    '<p class="lead">Before the clock starts you can spend all of it. While you mobilize, buildings finish at once, troops can be placed and moved anywhere, and nothing costs Orders.</p><div class="row">' + btn('autoMob', 'Mobilize for me', { sub: 'Spends it for ' + DOCTRINES[S.doc].name + '; you can still adjust' }) + btn('closeModal', 'I will do it myself', { cls: 'gold big' }) + '</div>', 'intel'); }
// ---------- Advisor ----------
// One line that always says what is worth doing next. Recomputed when the situation changes.
function advise() { const key = [S.t, S.orders, S.pool, S.speed, S.mob, S.parties.length, (S.cols || []).length, Math.floor(S.res.metal / 10), Math.floor(S.res.fuel / 10)].join('|'); if (advise.k === key) return advise.v; advise.k = key; const own = L.owned(S), out = [], add = (msg, id, o) => out.length < 4 && out.push(Object.assign({ msg, id }, o || {}));
  const front = own.filter(id => L.enemyNeighborsN(S, id) > 0).sort((a, b) => L.enemyNeighborsN(S, b) - L.enemyNeighborsN(S, a)), strongFront = own.filter(id => L.isStrong(id)).sort((a, b) => L.enemyNeighborsN(S, b) - L.enemyNeighborsN(S, a))[0];
  const bar = own.filter(id => S.terr[id].barracks).sort((a, b) => L.enemyNeighborsN(S, b) - L.enemyNeighborsN(S, a))[0], canArm = L.canPay(S, ARMOR_COST);
  if (S.mob) { if (S.pool > 0 && front[0]) add('<b>Place ' + S.pool + ' troops.</b> Anywhere you hold, such as ' + TERR[front[0]].name + ' on the front.', front[0]);
    const fb = front.find(id => !S.terr[id].fort && L.canPay(S, L.costOf(S, 'fort'))); if (fb) add('<b>Fortify the front.</b> A Fortress in ' + TERR[fb].name + ' is ' + cost(L.costOf(S, 'fort')) + '.', fb);
    if (bar && canArm) add('<b>Train armor</b> in ' + TERR[bar].name + ': counts double on the attack.', bar); else if (strongFront && L.canPay(S, L.costOf(S, 'barracks'))) add('<b>Build a Barracks</b> in ' + TERR[strongFront].name + ' to train armor.', strongFront);
    if (S.res.research >= 60) add('<b>Buy research</b> with your ' + Math.floor(S.res.research) + ' research.', null, { act: 'tab', aid: 'arsenal', label: 'Arsenal' });
    return advise.v = out; }
  const inc = S.parties.filter(p => S.terr[p.to].owner === 'you' && L.partyVisible(S, p)).sort((a, b) => a.eta - b.eta)[0];
  if (inc && S.terr[inc.to].n + (S.terr[inc.to].arm || 0) < inc.n + 1 && !(S.cols || []).some(c => c.to === inc.to)) add('⚠ <b>Defend ' + TERR[inc.to].name + '.</b> ' + inc.n + ' attackers arrive in ' + Math.max(0, inc.eta - S.t) + 'h; it holds ' + (S.terr[inc.to].n + (S.terr[inc.to].arm || 0)) + '. March or airlift troops in.', inc.to);
  if (S.pool > 0 && strongFront) add('<b>Place ' + S.pool + ' reserve troops</b> at a stronghold (✦), such as ' + TERR[strongFront].name + '. Free.', strongFront);
  if (S.orders >= 2) { let best = null, bp = 0.4; for (const id of L.enemyT(S)) { const av = L.assaultAvail(S, id); if (!av.supplied || av.n < 2) continue; const p = L.assaultPlan(S, id, av.n, { flank: true }).p; if (p > bp) { bp = p; best = id; } }
    if (best) add('<b>' + (bp >= 0.62 ? 'Attack ' : 'Risky attack: ') + TERR[best].name + '</b>, about ' + pct(bp) + ' success from your borders. 2 Orders.', best);
    else if (front[0]) add('<b>No attack is ready.</b> March troops to a border territory such as ' + TERR[front[0]].name + ' to set one up.', front[0]); }
  if (S.orders >= 1) { if (bar && canArm) add('<b>Train armor</b> in ' + TERR[bar].name + ': counts double on the attack. 1 Order.', bar);
    const b = own.filter(id => !S.terr[id].job && (S.terr[id].works || 0) < L.maxLevel(id, 'works') && L.canPay(S, L.costOf(S, 'works', S.terr[id].works))).sort((a, c) => L.isStrong(c) - L.isStrong(a))[0]; if (b) add('<b>Build Industry</b> in ' + TERR[b].name + ' for more income. 1 Order, ' + L.buildHours(S) + 'h.', b); }
  if (S.orders < 1) add(S.speed > 0 ? '<b>Orders spent.</b> You can still march troops one territory for free. New Orders arrive at midnight.' : '<b>Out of Orders.</b> Run the clock to midnight.', null, S.speed > 0 ? null : { act: 'speed', aid: '3', label: '▶▶ Run' });
  else if (S.speed === 0) add('<b>Or let time pass.</b> The clock is paused; the swarm only moves while it runs.', null, { act: 'speed', aid: '1', label: '▶ Run' });
  return advise.v = out; }
// ---------- First steps ----------
function coach() { const el = $('#coach'); if (!el) return; let h = '';
  const optRows = list => list.map(a => '<div class="opt"><span>' + a.msg + '</span>' + (a.id ? '<button data-a="sel" data-id="' + a.id + '">Show</button>' : a.act ? '<button data-a="' + a.act + '" data-id="' + a.aid + '">' + a.label + '</button>' : '') + '</div>').join('');
  if (S && !S.over && !modal && S.mob) h = '<div class="opth"><b>Mobilization</b><span>' + cost({ metal: Math.floor(S.res.metal), fuel: Math.floor(S.res.fuel), research: Math.floor(S.res.research) }) + ' · ' + S.pool + ' troops left · everything is instant</span><button data-a="brief">Guide</button></div>' + optRows(advise()) + '<div class="opt"><span><b>Ready?</b> Whatever you do not spend, you keep.</span><button class="go" data-a="begin">Begin the war</button></div>';
  else if (S && !S.over && !modal) { let st = S.tut == null ? 9 : S.tut; const T = selId && S.terr[selId];
    if (st === 0 && T && T.owner === 'enemy') st = S.tut = 1; else if (st === 1 && !(T && T.owner === 'enemy')) st = S.tut = 0;
    if (st === 3 && S.speed > 0) { st = S.tut = 9; toast('That is the loop: attack, reinforce, build, run the clock. Kill the Overlord before the Harvest completes.', 'good'); }
    if (st < 9) { let msg; if (st === 0) { const tg = L.enemyT(S).filter(id => L.playerNeighbors(S, id).length).sort((a, b) => S.terr[a].n - S.terr[b].n)[0]; msg = '<b>1 of 4</b> Teal is yours, red is the swarm. You have ' + S.pool + ' reserve troops to place: tap one of your strongholds (marked ✦) and press ✚ Reinforce. Then tap a red territory that touches yours' + (tg ? ', such as <b>' + TERR[tg].name + '</b>' : '') + '.'; }
      else if (st === 1) msg = '<b>2 of 4</b> Press <b>⚔ Attack</b> (2 Orders). The gold arrows show which of your territories will send troops. You choose how many from each, then watch the fight.';
      else if (st === 2) msg = '<b>3 of 4</b> Now tap one of your own territories and press <b>⚒ Build</b>, or a stronghold (✦) and <b>✚ Reinforce</b>.';
      else msg = '<b>4 of 4</b> Press <b>▶</b> at the top to run the clock. The swarm only moves while it runs, and you can pause any time.';
      h = '<span>' + msg + '</span><button data-a="tutSkip">Skip</button>'; }
    else h = '<div class="opth"><b>What you can do now</b><span>' + S.orders + ' Orders left today</span><button class="helpb" data-a="help">?</button></div>' + optRows(advise()); }
  if (coach.h !== h) { coach.h = h; el.innerHTML = h; el.className = h ? (h.indexOf('opth') > 0 ? 'show list' : 'show') : ''; } }
function helpModal() { const li = (t, d) => '<div class="obj"><span>' + t + '</span><div>' + d + '</div></div>';
  showModal('<div class="mhead"><small>Field manual</small><h1>How to play</h1></div><div class="objs">' +
    li('♛', '<b>Win</b><small>Kill the Overlord before the Harvest reaches 100%. Do not lose Los Angeles.</small>') +
    li('⚔', '<b>Attack</b><small>Tap a red territory next to one of yours, press Attack, choose how many troops, roll the dice.</small>') +
    li('⚑', '<b>Before the war</b><small>Each game the swarm lands somewhere different. You pick a doctrine that lasts all game, then mobilize: spend your war chest and place 20 troops anywhere, instantly, before pressing Begin.</small>') +
    li('❖', '<b>Orders</b><small>Every action spends Orders: attack 2, airlift 2, everything else 1. Reinforcing and playing cards are free. You get 6 at midnight, and can bank up to 3 unused.</small>') +
    li('✚', '<b>Grow</b><small>Tap your own territory to Reinforce from reserve or Build. Industry gives resources, Barracks give troops, Fortress, Radar and Battery defend.</small>') +
    li('▶', '<b>Time</b><small>The clock runs only while ▶ is on. One hour takes about 5 seconds (a day in 2 minutes), or 1 second on ▶▶. It pauses itself when a war party is spotted or a city is attacked. The swarm grows and attacks as time passes.</small>') +
    li('◆', '<b>Strike team</b><small>Send it into enemy land to sabotage or to kill leaders. Each Warlord you kill weakens the Overlord.</small>') +
    li('⌕', '<b>Look closer</b><small>Double tap or pinch to zoom into a city and see what is built there.</small>') +
    '</div><div class="row">' + btn('newAsk', 'Start a new game') + btn('closeModal', 'Got it', { cls: 'gold big' }) + '</div>', 'intel'); }

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
let asTimer = 0;
// A fight plays out over several seconds: one exchange about every second, with the losses shown as they happen.
function battlePlay() { clearInterval(asTimer); asTimer = setInterval(() => { if (!asl || !asl.b || asl.b.done) return clearInterval(asTimer); L.assaultRound(S, asl.b); SFX.play('shot'); setTimeout(() => SFX.play('shot'), 140); if (asl.b.done) { clearInterval(asTimer); SFX.play(asl.b.won ? 'good' : 'alert'); } assaultModal(); }, 1100); }
let bat = null, PIMG = {}, moveFrom = null, moveTo = null; const reports = [];
// What the enemy just did: shown every time one of your territories is attacked, so nothing happens out of sight.
function reportModal() { if (!reports.length || modal || !S || S.over) { if (reports.length && modal && S && !S.over) setTimeout(reportModal, 600); return; } const list = reports.splice(0), last = list[list.length - 1]; SFX.play(list.some(r => !r.held) ? 'alert' : 'good'); selId = last.to; V.focus(last.to);
  showModal('<div class="mhead"><small>' + L.stamp(S) + ' · the clock is paused</small><h1>' + (list.length > 1 ? 'The swarm attacked ' + list.length + ' territories' : list[0].held ? TERR[list[0].to].name + ' held' : TERR[list[0].to].name + ' has fallen') + '</h1></div><div class="rlist">' +
    list.map(r => '<div class="ritem ' + (r.held ? 'good' : 'bad') + '"><b>' + TERR[r.to].name + (r.held ? ' held' : ' fell') + '</b><span><b>' + r.n + '</b> attackers came from ' + TERR[r.from].name + ' against your <b>' + r.d + '</b>. ' + (r.held ? (r.lost ? 'You lost ' + r.lost + '; ' + r.left + ' remain.' : 'No losses; ' + r.left + ' remain.') : 'All ' + r.d + ' of your troops there were lost, with everything built in the city. ' + r.left + ' enemy now hold it.') + '</span>' +
      (r.held ? '' : '<small>Why: ' + (r.d <= 2 ? 'the city had almost no garrison. A freshly captured city holds only the survivors of the attack, so march troops in or expect it to be retaken.' : r.n >= r.d * 1.5 ? 'you were badly outnumbered. Radar nearby would have warned you hours earlier.' : 'the dice went against you. A Fortress would have tilted them.') + '</small>') + '</div>').join('') +
    '</div><div class="row">' + btn('closeModal', 'Continue', { cls: 'gold big' }) + '</div>', 'intel'); } const seenP = {};
function teamHelp() { const tm = S.team, at = L.teamAt(S), T = at && S.terr[at], enemy = T && T.owner === 'enemy', ldr = enemy && S.leaders.find(l => l.alive && l.at === at);
  const why = (f, p) => '<div class="why">' + f.map(x => '<div><span>' + x[0] + '</span><b class="' + (x[1] < 0 ? 'neg' : 'pos') + '">' + (x[1] > 0 && x[0] !== 'Base chance' ? '+' : '') + x[1] + '%</b></div>').join('') + '<div class="tot"><span>Your chance</span><b>' + pct(p) + '</b></div></div>';
  let h = '<div class="mhead"><small>One unit, ' + L.teamN(S) + ' soldiers, readiness ' + tm.pips + ' of 4</small><h1>Your strike team</h1></div><p class="lead">A small special-forces squad, separate from your armies. Flying it somewhere costs 8 fuel. It does <b>not</b> fight on arrival: it lands hidden and waits for your order.</p><div class="rlist">' +
    '<div class="ritem"><b>1 · Stealth: weaken a city before you attack</b><span><b>Sabotage</b> cuts enemy strength by 2 and sets the Harvest back 2%. <b>Covert strike</b> kills the leader, removing his guards and his bonus. Each try costs 1 Order, fuel and intel. Succeed and the team stays hidden. Fail and it is detected, flies home, loses readiness, and the city goes on alert for 3 days (all stealth there is 20% harder).</span></div>' +
    '<div class="ritem"><b>2 · Assault: fight beside your troops</b><span>If the team is inside a city when you attack it, it joins as ' + L.teamN(S) + ' extra troops' + (S.spec === 'assault' ? ' and your best die gets +1' : '') + '. Win and it recovers 2 salvage. It must already have landed: a team still in the air is not in the battle.</span></div>' +
    '<div class="ritem"><b>3 · Defense: hold your own ground</b><span>In one of your territories it adds ' + L.teamN(S) + ' defenders and can Ambush an incoming war party, destroying 1 or 2 before it arrives.</span></div>' +
    '<div class="ritem"><b>Readiness</b><span>Four pips. Failures cost 1 or 2. At zero the team cannot act. It recovers by resting in your own territory.</span></div></div>';
  if (enemy) { h += '<h4>Right now in ' + TERR[at].name + '</h4><p class="lead">Sabotage</p>' + why(L.sabWhy(S, at), L.sabOdds(S, at)); if (ldr) h += '<p class="lead">Covert strike on ' + ldr.name + '</p>' + why(L.covertWhy(S, ldr), L.covertOdds(S, ldr));
    h += '<p class="note">To raise these: wait out the alert, thin the garrison with missiles or bombers first, build Radar nearby, or research Ghost Suits.</p>'; }
  showModal(h + '<div class="row">' + btn('closeModal', 'Got it', { cls: 'gold big' }) + '</div>', 'intel'); }
function strongList() { const mine = STRONG.filter(id => S.terr[id].owner === 'you'), theirs = STRONG.filter(id => S.terr[id].owner === 'enemy');
  const row = (id, yours) => { const T = S.terr[id], pk = PERKS[id]; return '<div class="opt"><span><b>✦ ' + TERR[id].name + '</b> ' + (id === HQ ? 'headquarters · ' : '') + (yours ? T.n + ' troops' + (T.arm ? ', ' + T.arm + ' armor' : '') : 'occupied') + (pk && pk.name ? ' · ' + pk.name : '') + '</span><button data-a="' + (yours && S.pool > 0 ? 'strongPlace' : 'strongGo') + '" data-id="' + id + '">' + (yours && S.pool > 0 ? 'Place troops' : 'Show') + '</button></div>'; };
  showModal('<div class="mhead"><small>Marked ✦ in gold on the map</small><h1>Strongholds</h1></div><p class="lead">The 10 major cities. They produce double resources, can be built up further, and are the only places new reserve troops can be placed. You have <b>' + S.pool + '</b> in reserve.</p><h4>Yours (' + mine.length + ')</h4><div class="mk">' + (mine.map(id => row(id, true)).join('') || '<p class="note">None. Liberate one to place reserves.</p>') + '</div>' + (theirs.length ? '<h4>Occupied (' + theirs.length + ')</h4><div class="mk">' + theirs.map(id => row(id, false)).join('') + '</div>' : '') + '<div class="row">' + btn('closeModal', 'Close', {}) + '</div>', 'intel'); }
let dayRep = null;
function dayModal() { if (!dayRep || !S || S.over) return; if (modal) { setTimeout(dayModal, 700); return; } const d = dayRep; dayRep = null; SFX.play('good');
  const R = (cls, t, body) => '<div class="ritem ' + cls + '"><b>' + t + '</b><span>' + body + '</span></div>', names = a => a.map(id => TERR[id].name).join(', ');
  let h = '<div class="mhead"><small>Midnight · the clock is paused</small><h1>Day ' + d.day + ' report</h1></div><div class="rlist">';
  h += R('good', '❖ ' + d.orders + ' Orders to spend today', (d.kept ? d.kept + ' unused carried over from yesterday. ' : '') + 'Attack costs 2, most other actions cost 1.');
  h += R('good', 'Income collected', '<span class="gain">+' + d.inc.metal + ' metal</span> <span class="gain">+' + d.inc.fuel + ' fuel</span> <span class="gain">+' + d.inc.research + ' research</span>' + (d.intel > 0 ? ' <span class="gain">+' + d.intel + ' intel</span>' : '') + (d.uranium > 0 ? ' <span class="gain">+' + d.uranium + ' uranium</span>' : '') + '<br>You now have ' + Math.floor(S.res.metal) + ' metal, ' + Math.floor(S.res.fuel) + ' fuel, ' + Math.floor(S.res.research) + ' research.');
  h += R('good', '+' + d.pool + ' new troop' + (d.pool === 1 ? '' : 's') + ' in reserve', d.poolNow + ' waiting in reserve. They are not on the map yet: tap one of your strongholds (✦) and press Reinforce to place them. Free.' + (d.bar.length ? '<br>Barracks trained ' + d.bar.map(b => '+' + b.n + ' in ' + TERR[b.id].name).join(', ') + ', already in place.' : ''));
  if (d.built.length) h += R('good', 'Construction finished', d.built.map(b => BUILD[b.k].name + ' in ' + TERR[b.id].name).join(', ') + '.');
  if (d.won.length) h += R('good', 'Liberated yesterday', names(d.won) + '.');
  if (d.lost.length) h += R('bad', 'Lost yesterday', names(d.lost) + '.');
  h += R('bad', 'The enemy', 'Harvest +' + d.harvest.toFixed(1) + '%, now ' + Math.floor(d.harvestNow) + '%. At 100% you lose. Their total strength is ' + d.enemy + (d.enemy !== d.enemyWas ? ' (' + (d.enemy > d.enemyWas ? '+' : '') + (d.enemy - d.enemyWas) + ' since yesterday).' : ', unchanged.'));
  h += '</div><h4>What you can create today</h4><div class="mk">'; { const own = L.owned(S), fr = id => L.enemyNeighborsN(S, id), mk = (t, sub, a, id, lab) => '<div class="opt"><span><b>' + t + '</b> ' + sub + '</span><button data-a="' + a + '" data-id="' + id + '">' + lab + '</button></div>'; let any = 0;
    if (S.pool > 0) { const st = own.filter(id => L.isStrong(id)).sort((a, b) => fr(b) - fr(a))[0]; if (st) { any++; h += mk('Place ' + S.pool + ' reserve troops', 'at a stronghold · free', 'strongList', '', 'Choose'); } }
    for (const k of ['works', 'barracks', 'fort', 'battery', 'radar', 'post']) { const sites = own.filter(id => !S.terr[id].job && (S.terr[id][k] || 0) < L.maxLevel(id, k) && L.canPay(S, L.costOf(S, k, S.terr[id][k] || 0))); if (!sites.length) continue;
      const best = sites.sort((a, b) => k === 'works' || k === 'barracks' ? L.isStrong(b) - L.isStrong(a) || fr(a) - fr(b) : fr(b) - fr(a))[0]; any++; h += mk(BUILD[k].name, cost(L.costOf(S, k, S.terr[best][k] || 0)) + ' · ' + sites.length + ' possible site' + (sites.length > 1 ? 's' : '') + ' · best: ' + TERR[best].name, 'dayBuild', best, 'Build'); }
    const bar = own.filter(id => S.terr[id].barracks).sort((a, b) => fr(b) - fr(a))[0]; if (bar && L.canPay(S, ARMOR_COST)) { any++; h += mk('Armor', cost(ARMOR_COST) + ' each · counts double in attack · ' + TERR[bar].name, 'dayArm', bar, 'Train'); }
    const ups = Object.keys(UPGRADES).filter(k => !S.up[k] && L.canPay(S, UPGRADES[k].cost)); if (ups.length) { any++; h += mk('Research', ups.length + ' upgrade' + (ups.length > 1 ? 's' : '') + ' affordable: ' + ups.slice(0, 3).map(k => UPGRADES[k].name).join(', ') + (ups.length > 3 ? '…' : ''), 'dayTab', 'arsenal', 'Arsenal'); }
    if (!any) h += '<p class="note">Nothing affordable yet. Industry raises daily income.</p>'; h += '<p class="note">Picking one closes this report with the clock still paused. Each build or training costs 1 Order.</p>'; }
  showModal(h + '</div><div class="row">' + btn('dayGo', 'Start day ' + d.day, { cls: 'gold big', sub: 'Resumes the clock' }) + '</div>', 'intel'); }
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
function act(a, id) { if (!S && a !== 'start' && a !== 'diff' && a !== 'doc') return;
  switch (a) {
    case 'diff': diff = id; introModal(); return;
    case 'doc': doc = id; introModal(); return;
    case 'start': S = L.newGame(id, diff, { doc }); S.cmd = true; S.tut = 0; selId = null; closeModal(); V.focus(S.land.main); mobGuide(); return;
    case 'autoMob': closeModal(); L.autoMobilize(S); toast('Mobilized for ' + DOCTRINES[S.doc].name + '. Adjust anything you like, then begin the war.', 'good'); break;
    case 'begin': closeModal(); L.begin(S); renderAll(true); dayGuide(); return;
    case 'guideNext': guide.i = Math.min(guide.pages.length - 1, guide.i + 1); guideModal(); return;
    case 'guideBack': guide.i = Math.max(0, guide.i - 1); guideModal(); return;
    case 'brief': mobGuide(); return;
    case 'new': introModal(); break;
    case 'speed': if (S.mob && +id > 0) { toast('You are still mobilizing. Press Begin the war first.', 'info'); return; } setSpeed(+id); break;
    case 'tab': tab = id; setPanel(true); break;
    case 'ptoggle': setPanel(!panelOpen); break;
    case 'sel': selId = id; tab = 'territory'; V.focus(id, compact() && window.innerHeight > window.innerWidth); setPanel(true); break;
    case 'reinforce': if (report(L.reinforce(S, id)) && S.tut === 2) S.tut = 3; break;
    case 'airlift': report(L.airlift(S, id)); break;
    case 'build': { const p = id.split(':'); report(L.build(S, p[0], p[1])); break; }
    case 'buy': report(L.buy(S, id)); break;
    case 'card': if (report(L.playCard(S, +id))) SFX.play('good'); break;
    case 'trade': report(L.tradeCards(S)); break;
    case 'buildMenu': buildMenu(); return;
    case 'buildHelp': buildHelp = !buildHelp; buildMenu(); return;
    case 'buildInfo': buildInfo = buildInfo === id ? null : id; buildMenu(); return;
    case 'unbuild': { const q = id.split(':'); if (report(L.unbuild(S, q[0], q[1]))) SFX.play('tap'); renderAll(true); buildMenu(); return; }
    case 'armAsk': { const mx = Math.min(3, Math.floor(Math.min(S.res.metal / ARMOR_COST.metal, S.res.fuel / ARMOR_COST.fuel))); showModal('<div class="mhead"><small>' + TERR[id].name + ' · Barracks</small><h1>Train armor</h1></div>' + wallet() + '</div><p class="lead">Armor counts <b>double</b> when you attack and single when you defend. Infantry take losses first, so armor survives longest. It marches with your troops and goes in first.</p><p class="lead">' + cost(ARMOR_COST) + ' each' + (S.mob ? '' : ' · 1 Order for the batch') + '</p><div class="row">' + [1, 2, 3].map(n => btn('armGo', n + ' armor', { id: id + ':' + n, cls: n === mx ? 'gold big' : '', dis: n > mx, sub: cost({ metal: ARMOR_COST.metal * n, fuel: ARMOR_COST.fuel * n }) })).join('') + btn('closeModal', 'Cancel') + '</div>', 'confirm'); return; }
    case 'armGo': { const q = id.split(':'); closeModal(); if (report(L.trainArmor(S, q[0], +q[1]))) SFX.play('build'); break; }
    case 'reinAsk': if (S.pool < 2) { if (report(L.reinforce(S, id)) && S.tut === 2) S.tut = 3; break; } { const opts = [...new Set([1, Math.ceil(S.pool / 2), S.pool])]; showModal('<div class="mhead"><small>' + TERR[id].name + '</small><h1>Reinforce with how many?</h1></div><p class="lead">You have ' + S.pool + ' troops in reserve. Placing them is free.</p><div class="row">' + opts.map(n => btn('reinGo', n === S.pool ? 'All ' + n : String(n), { id: id + ':' + n, cls: n === S.pool ? 'gold big' : '' })).join('') + btn('closeModal', 'Cancel') + '</div>', 'confirm'); return; }
    case 'reinGo': { const q = id.split(':'); closeModal(); let ok = false; for (let i = 0; i < +q[1]; i++) ok = L.reinforce(S, q[0]).ok || ok; if (ok) { SFX.play('build'); if (S.tut === 2) S.tut = 3; } break; }
    case 'moveFrom': moveFrom = id; moveTo = null; V.moveArrow = null; break;
    case 'moveCancel': moveFrom = moveTo = null; V.moveArrow = null; break;
    case 'colGo': closeModal(); L.colResolve(S, id); break;
    case 'batGo': { const q = id.split(':'); if (report(L.moveBattery(S, q[0], q[1]))) { SFX.play('build'); selId = q[1]; } moveFrom = moveTo = null; V.moveArrow = null; break; }
    case 'dayBuild': closeModal(); selId = id; V.focus(id); renderAll(true); buildMenu(); return;
    case 'dayArm': closeModal(); selId = id; V.focus(id); renderAll(true); act('armAsk', id); return;
    case 'dayTab': closeModal(); tab = id; setPanel(true); break;
    case 'airGo': { const q = id.split(':'); if (report(L.airMove(S, q[0], q[1], +q[2]))) SFX.play('missile'); moveFrom = moveTo = null; V.moveArrow = null; break; }
    case 'moveGo': { const q = id.split(':'); if (report(L.move(S, q[0], q[1], +q[2]))) { SFX.play('build'); selId = q[1]; } moveFrom = moveTo = null; V.moveArrow = null; break; }
    case 'more': tab = 'territory'; setPanel(true); break;
    case 'desel': selId = null; break;
    case 'tutSkip': S.tut = 9; break;
    case 'help': helpModal(); return;
    case 'newAsk': showModal('<div class="mhead"><small>Day ' + L.day(S) + '</small><h1>Start over?</h1></div><p class="lead">This ends the current war and sets up a fresh one. It cannot be undone.</p><div class="row">' + btn('closeModal', 'Keep playing') + btn('new', 'New game', { cls: 'gold big' }) + '</div>', 'confirm'); return;
    case 'strongList': strongList(); return;
    case 'strongGo': closeModal(); selId = id; tab = 'territory'; V.focus(id); break;
    case 'strongPlace': closeModal(); selId = id; V.focus(id); renderAll(true); act('reinAsk', id); return;
    case 'teamHelp': teamHelp(); return;
    case 'dayGo': closeModal(); setSpeed(1); break;
    case 'cmd': S.cmd = !S.cmd; break;
    case 'mute': SFX.muted = !SFX.muted; { const b = document.querySelector('[data-a="mute"]'); if (b) b.textContent = SFX.muted ? '🔇' : '🔊'; } return;
    case 'buildGo': { const q = id.split(':'), ok = report(L.build(S, q[0], q[1])); if (ok) { SFX.play('build'); if (S.tut === 2) S.tut = 3; } if (S.mob && selId === q[0]) { renderAll(true); buildMenu(); return; } closeModal(); break; }
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
    case 'commit': { const r = L.assaultStart(S, asl.id, asl.troops, asl.o); if (report(r)) { asl.b = r.b; V.flash(asl.id); battlePlay(); } assaultModal(); return; }
    case 'roll': L.assaultRound(S, asl.b); SFX.play('dice'); assaultModal(); return;
    case 'rollAll': clearInterval(asTimer); while (!asl.b.done) L.assaultRound(S, asl.b); SFX.play(asl.b.won ? 'good' : 'alert'); assaultModal(); return;
    case 'withdraw': clearInterval(asTimer); L.assaultEnd(S, asl.b, false); assaultModal(); return;
    case 'closeModal': closeModal(); if (S.pending) L.resolveDefense(S); if (S.pendingCol) L.colResolve(S, null); break;
    case 'globe': { const m = V.toggleMode(); const b = document.querySelector('[data-a="globe"]'); if (b) b.textContent = m === 'globe' ? 'Flat board' : 'Globe'; return; }
    case 'zoomIn': V.zoom(0.8); return; case 'zoomOut': V.zoom(1.25); return; case 'fit': V.fit(); return; case 'rotL': V.rotate(-0.3); return; case 'rotR': V.rotate(0.3); return; case 'tilt': V.tilt(); return;
  }
  drain(); renderAll(true); save(); }
function drain() { if (!S) return; const ev = S.ev.splice(0); for (const e of ev) {
    if (e.k === 'toast') toast(e.msg, e.kind); else if (e.k === 'pause') setSpeed(0);
    else if (e.k === 'defend') setTimeout(defendModal, 50);
    else if (e.k === 'colStop') setTimeout(colModal, 60);
    else if (e.k === 'report') { reports.push(e); setTimeout(reportModal, 250); }
    else if (e.k === 'arrive') { selId = e.id; tab = 'territory'; V.focus(e.id); toast(S.terr[e.id].owner === 'enemy' ? 'Strike team has landed in ' + TERR[e.id].name + ', undetected. It has not fought yet: choose Sabotage or a strike on the leader.' : 'Strike team has arrived in ' + TERR[e.id].name + ' and joins its defense.', 'info'); }
    else if (e.k === 'day') { dayRep = e; setTimeout(dayModal, 300); }
    else if (e.k === 'intel' && !asl) { const i = e.i; setTimeout(() => { if (!modal && !S.over) showModal('<div class="mhead"><small>Intel recovered · fragment ' + (i + 1) + ' of ' + INTEL.length + '</small><h1>Intelligence brief</h1></div><p class="lead quote">' + esc(INTEL[i]) + '</p><p class="note">Recovered from the dead leader\'s command post. +3 intel, which pays for covert strikes and sabotage.</p><div class="row">' + btn('closeModal', 'Continue', { cls: 'gold big' }) + '</div>', 'intelm'); }, 300); }
    else if (e.k === 'over') setTimeout(overModal, 600); } }
function renderAll(force) { if (!S) return; renderTop(); renderPanel(force); actionBar(); coach(); V.sync(S, selId); }

// ---------- Boot ----------
async function boot() {
  setPanel(!compact());
  const ld = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const art = { map: await ld(ART.map), mask: await ld(ART.mask), globe: await ld(ART.globe), infest: ART.infest ? await ld(ART.infest) : null, pieces: {} }; await Promise.all(Object.keys(PIECES).map(async k => { art.pieces[k] = await ld(PIECES[k]); }));
  { const st = document.createElement('style'); st.textContent = Object.keys(CARDS).map(k => '.art-' + k + '{background-image:url(' + CARDS[k] + ')}').join(''); document.head.appendChild(st); }
  PIMG = art.pieces; { const st = document.createElement('style'); st.textContent = '.u.you{background-image:url(' + (PIMG.infantry ? PIMG.infantry.src : '') + ')}.u.enemy{background-image:url(' + (PIMG.swarm ? PIMG.swarm.src : '') + ')}'; document.head.appendChild(st); }
  V.init($('#map'), id => { if (!S) return; SFX.play('tap');
    if (moveFrom) { if (!id || id === moveFrom) { moveFrom = moveTo = null; } else if (S.terr[id].owner !== 'you') toast('You can only move into your own territory. To take this one, cancel and press Attack.', 'info'); else moveTo = id;
      V.moveArrow = moveFrom && moveTo ? { from: moveFrom, to: moveTo } : null; renderAll(true); return; }
    selId = id; if (id) { tab = 'territory'; setPanel(!compact()); } else if (compact()) setPanel(false); renderAll(true); }, art);
  V.onCity = (id, key, built) => { if (!S) return; if (built) return toast(BUILD[key].name + (L.maxLevel(id, key) > 1 ? ' is fully upgraded here.' : ' is already in place here.'), 'info'); if (S.terr[id].job) return toast(BUILD[S.terr[id].job.key].name + ' is under construction here, ' + Math.max(1, S.terr[id].job.doneAt - S.t) + ' hours left.', 'info'); const lv = S.terr[id][key] || 0, c = L.costOf(S, key, lv), can = L.canPay(S, c);
    showModal('<div class="mhead"><small>' + TERR[id].name + '</small><h1>' + (lv ? 'Upgrade ' + BUILD[key].name + ' to level ' + (lv + 1) : 'Build ' + BUILD[key].name) + '?</h1></div><p class="lead">' + BUILD[key].desc + '</p><p class="lead">' + cost(c) + ' · 1 Order · ready in ' + L.buildHours(S) + ' hours' + (can ? '' : ' · not enough resources yet') + '</p><div class="row">' + btn('closeModal', 'Cancel') + btn('buildGo', 'Build', { id: id + ':' + key, cls: 'gold big', dis: !can }) + '</div>', 'confirm'); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.id); });
  const p = $('#panel'); p.addEventListener('pointerdown', () => { hold = true; }); window.addEventListener('pointerup', () => { setTimeout(() => { hold = false; }, 60); });
  document.addEventListener('keydown', e => { if (!S || modal || e.target.tagName === 'INPUT') return; if (e.code === 'Space') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); renderTop(); } });
  S = load(); if (S && S.pending) L.resolveDefense(S); if (S && S.pendingCol) L.colResolve(S, null); if (S) { selId = HQ; renderAll(true); toast('Campaign resumed on ' + L.stamp(S) + '. Paused.', 'info'); } else introModal();
  let last = performance.now(), rT = 0;
  function loop(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S && S.speed > 0 && !modal && !S.over) { acc += dt * (S.speed === 1 ? 0.2 : 1); /* game hours per second */ let n = 0; while (acc >= 1 && n++ < 6) { acc -= 1; L.step(S); if (S.ev.length) drain(); if (S.speed === 0) { acc = 0; break; } } }
    V.frac = S && S.speed > 0 ? acc : 0; rT += dt; if (rT > 0.25) { rT = 0; actionBar(); coach();
      if (S && !S.over) { for (const p of S.parties) if (!seenP[p.id] && S.terr[p.to].owner === 'you' && L.partyVisible(S, p)) { seenP[p.id] = 1; if (S.speed > 0) { setSpeed(0); renderTop(); } toast('War party of ' + p.n + ' heading for ' + TERR[p.to].name + ', arriving in ' + Math.max(0, p.eta - S.t) + 'h. Clock paused.', 'bad'); } } if (S && V.city && V.city !== selId && !modal) { selId = V.city; tab = 'territory'; renderPanel(true); } renderAll(); if (S && now - lastSave > 8000) { lastSave = now; save(); } }
    if (bat) battleFrame(dt); V.frame(dt); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.__g = { get S() { return S; }, L, V, act };
}
window.addEventListener('DOMContentLoaded', boot);
