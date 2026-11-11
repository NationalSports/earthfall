// ---------- Static data ----------
const TERR_RAW = [
  ['anchorage','Anchorage',61,-150,'NA','fuel','Alaska'],['vancouver','Vancouver',53,-119,'NA','metal','Western Canada'],
  ['toronto','Toronto',48,-80,'NA','metal','Eastern Canada'],['la','Los Angeles',36,-118,'NA','research','Pacific Coast'],
  ['denver','Denver',41,-103,'NA','fuel','Central US'],['ny','New York',39,-77,'NA','metal','Atlantic Coast'],
  ['mexico','Mexico City',21,-100,'NA','metal','Mexico'],
  ['bogota','Bogotá',5,-74,'SA','fuel','Colombia & Panama'],['lima','Lima',-12,-74,'SA','metal','Andes'],
  ['manaus','Manaus',-4,-58,'SA','research','Amazon'],['saopaulo','São Paulo',-20,-47,'SA','metal','Brazil'],
  ['buenosaires','Buenos Aires',-36,-63,'SA','research','Southern Cone'],
  ['london','London',53,-1,'EU','research','British Isles'],['paris','Paris',47,3,'EU','metal','France'],
  ['madrid','Madrid',40,-4,'EU','fuel','Iberia'],['berlin','Berlin',52,13,'EU','metal','Central Europe'],
  ['rome','Rome',42,13,'EU','research','Italy & Balkans'],['stockholm','Stockholm',62,16,'EU','fuel','Scandinavia'],
  ['kyiv','Kyiv',50,30,'EU','metal','Eastern Europe'],['moscow','Moscow',57,42,'EU','fuel','Western Russia'],
  ['algiers','Algiers',29,3,'AF','fuel','Maghreb'],['cairo','Cairo',26,30,'AF','fuel','Egypt & Suez'],
  ['lagos','Lagos',10,3,'AF','metal','West Africa'],['nairobi','Nairobi',1,37,'AF','research','East Africa'],
  ['kinshasa','Kinshasa',-6,21,'AF','metal','Congo Basin'],['joburg','Johannesburg',-27,26,'AF','metal','Southern Africa'],
  ['istanbul','Istanbul',39,34,'AS','metal','Anatolia'],['riyadh','Riyadh',24,45,'AS','fuel','Arabia'],
  ['tehran','Tehran',33,55,'AS','fuel','Persia'],['astana','Astana',48,68,'AS','metal','Central Asia'],
  ['novosibirsk','Novosibirsk',58,86,'AS','metal','Western Siberia'],['yakutsk','Yakutsk',63,126,'AS','fuel','Eastern Siberia'],
  ['delhi','Delhi',23,78,'AS','research','India'],['beijing','Beijing',40,110,'AS','metal','Northern China'],
  ['hongkong','Hong Kong',25,111,'AS','research','Southern China'],['seoul','Seoul',38,127,'AS','research','Korea'],
  ['tokyo','Tokyo',36,139,'AS','research','Japan'],['bangkok','Bangkok',15,101,'AS','fuel','Indochina'],
  ['jakarta','Jakarta',-3,112,'OC','fuel','Indonesia'],['manila','Manila',13,122,'OC','metal','Philippines'],
  ['perth','Perth',-26,122,'OC','metal','Western Australia'],['sydney','Sydney',-30,146,'OC','research','Eastern Australia']
];
const TERR = {}; const TIDS = [];
TERR_RAW.forEach(r => { TERR[r[0]] = { id:r[0], name:r[1], lat:r[2], lon:r[3], region:r[4], res:r[5], area:r[6], adj:[] }; TIDS.push(r[0]); });
const LINKS = [
  ['anchorage','vancouver'],['anchorage','yakutsk',1],['vancouver','toronto'],['vancouver','la'],['vancouver','denver'],['toronto','denver'],['toronto','ny'],
  ['la','denver'],['la','mexico'],['denver','ny'],['denver','mexico'],['ny','london',1],['la','tokyo',1],['mexico','bogota'],
  ['bogota','lima'],['bogota','manaus'],['lima','manaus'],['manaus','saopaulo'],['saopaulo','buenosaires'],['lima','buenosaires'],['saopaulo','lagos',1],['lima','sydney',1],
  ['london','paris',1],['london','stockholm',1],['paris','madrid'],['paris','berlin'],['paris','rome'],['madrid','algiers',1],['berlin','stockholm',1],['berlin','rome'],
  ['berlin','kyiv'],['rome','kyiv'],['rome','algiers',1],['kyiv','moscow'],['kyiv','istanbul',1],['stockholm','moscow'],['moscow','astana'],['moscow','novosibirsk'],
  ['algiers','cairo'],['algiers','lagos'],['cairo','nairobi'],['cairo','riyadh'],['cairo','istanbul'],['lagos','kinshasa'],['lagos','nairobi'],['nairobi','kinshasa'],
  ['kinshasa','joburg'],['nairobi','joburg'],['nairobi','delhi',1],
  ['istanbul','tehran'],['istanbul','riyadh'],['riyadh','tehran'],['tehran','astana'],['tehran','delhi'],['astana','novosibirsk'],['astana','delhi'],['astana','beijing'],
  ['novosibirsk','yakutsk'],['novosibirsk','beijing'],['yakutsk','beijing'],['yakutsk','tokyo',1],['delhi','beijing'],['delhi','bangkok'],['beijing','hongkong'],['beijing','seoul'],
  ['hongkong','bangkok'],['hongkong','manila',1],['seoul','tokyo',1],['tokyo','manila',1],['bangkok','jakarta',1],['jakarta','manila',1],['jakarta','perth',1],['perth','sydney']
];
if (typeof ANCHORS !== 'undefined') for (const id of TIDS) { TERR[id].ax = ANCHORS[id][0]; TERR[id].ay = ANCHORS[id][1]; }
LINKS.forEach(l => { TERR[l[0]].adj.push(l[1]); TERR[l[1]].adj.push(l[0]); });
const REGIONS = { NA:{name:'North America',bonus:2}, SA:{name:'South America',bonus:1}, EU:{name:'Europe',bonus:2},
  AF:{name:'Africa',bonus:1}, AS:{name:'Asia',bonus:3}, OC:{name:'Oceania',bonus:1} };
const HQ = 'la';
const URANIUM = ['vancouver', 'astana', 'perth', 'joburg'];
// Special cities: a standing boost for whoever on the player side holds them. The invaders know their worth and aim for them.
const PERKS = {
  london: { name: 'Signals Hub', desc: '+1 intel per day', intel: 1 },
  berlin: { name: 'Foundries', desc: '+4 metal per day', inc: { metal: 4 } },
  saopaulo: { name: 'Refineries', desc: '+4 fuel per day', inc: { fuel: 4 } },
  nairobi: { name: 'Field Labs', desc: '+3 research per day', inc: { research: 3 } },
  cairo: { name: 'Canal Zone', desc: '+2 metal and +2 fuel per day', inc: { metal: 2, fuel: 2 } },
  delhi: { name: 'Recruitment Depot', desc: '+1 reserve every second day', pool: 1 },
  denver: { name: 'Mountain Complex', desc: 'Defenders roll +1', def: 1 },
  moscow: { name: 'Winter Line', desc: 'Defenders roll +1', def: 1 },
  sydney: { name: 'Deep Space Array', desc: '+2 intel per day', intel: 2 } };
// Enemy leader traits. One per Warlord and Commander; revealed once the leader is located.
const TRAITS = {
  butcher: { name: 'Butcher', desc: 'War parties from this territory roll +1.' },
  warden: { name: 'Warden', desc: 'One extra guard.' },
  ghost: { name: 'Ghost', desc: 'Covert strikes against this leader are 12% harder.' },
  breeder: { name: 'Breeder', desc: 'This territory grows one extra strength per day.' },
  raider: { name: 'Raider', desc: 'War parties from this territory arrive 30% sooner.' } };
const SPECS = {
  assault:{ name:'Assault', desc:'Your strike team leads from the front. Attacks you join roll +1 on their best die, and the team counts as 3 troops instead of 2.' },
  shadow:{ name:'Shadow', desc:'Covert specialists. +15% on covert strikes and sabotage, and the team is never spotted while waiting in enemy territory.' },
  engineer:{ name:'Engineer', desc:'Builders and defenders. Structures cost half, and a territory the team defends rolls +1 on its best die.' }
};
const UPGRADES = {
  elite:{ name:'Elite Training', cost:{research:90,metal:40}, desc:'Strike team recovers readiness twice as fast and loses less on a failed operation.' },
  ghost:{ name:'Ghost Suits', cost:{research:110}, desc:'+15% on covert strikes and sabotage.' },
  transport:{ name:'Rapid Transport', cost:{research:70,fuel:60}, desc:'Strike team travels 40% faster.' },
  hardened:{ name:'Hardened Garrisons', cost:{research:90,metal:80}, desc:'Every garrison rolls +1 on its best defense die.' },
  deepscan:{ name:'Deep Scan', cost:{research:130}, desc:'Radar reaches one territory further and always tracks every leader.' },
  bombers:{ name:'Strategic Bombers', cost:{research:120,metal:90}, desc:'Unlocks bomber raids from HQ against any territory on the map.' },
  exo:{ name:'Exo Armor', cost:{research:60,salvage:3}, desc:'Built from recovered enemy plating. The strike team counts as one more troop in every battle.' },
  railgun:{ name:'Railgun Batteries', cost:{research:80,salvage:4}, desc:'Missile batteries hit harder (up to −3 strength) and reload in 12 hours.' },
  disruptor:{ name:'Hive Disruptor', cost:{research:120,salvage:6}, desc:'Jams the swarm signal. One fewer occupied territory grows each day.' }
};
const BUILD = {
  fort:{ name:'Fortress', cost:{metal:50}, desc:'Defenders roll +1 on their best die.' },
  radar:{ name:'Radar Station', cost:{metal:35,research:25}, desc:'Reveals enemy strength, leaders and war parties within 2 territories.' },
  battery:{ name:'Missile Battery', cost:{metal:60,fuel:40}, desc:'Fires on enemy territories or war parties within 2 territories. Reloads in 24h.' }
};
const NUKE_STAGE = { cost:{metal:110,fuel:90,research:140,uranium:6}, hours:60 };
const SALVO_COST = { fuel:20, metal:10 }, BOMB_COST = { fuel:40 };
const INTEL = [
  'Recovered sidearm. The grip is molded for a five-fingered hand. The safety catch is exactly where ours is.',
  'Their field manual uses our own infantry doctrine. The edition number is one we have not written yet.',
  'Comms decoded. It is not an alien language. It is a drifted dialect, and the linguists recognize one word in three.',
  'Autopsy complete. Human genome, heavily damaged. Radiation scarring carried across some forty generations.',
  'A prisoner speaks: "We are not taking your world. We are taking what ours no longer has." Seed stock. Clean water. Unbroken DNA.',
  'The Overlord\'s dispatches cite this war as history: dates, battles, our launches. They know our next move because they studied it.',
  'The prisoner gives the year they came from, and the name of the war that ruined it. It is this one.'
];
const FIRST = ['Vael','Maren','Osk','Tavi','Renn','Juno','Kaed','Sio','Brann','Ilse','Dax','Yara','Corv','Neth','Halo','Emer'];
const SUR = ['Okonkwo','Alvarez','Tanaka','Petrov','Singh','Moreau','Haddad','Kim','Novak','Santos','Lindqvist','Mbeki','Chen','Reyes','Walker','Rossi'];
const RANKN = { overlord:'Overlord', warlord:'Warlord', commander:'Commander' };

// ---------- Helpers ----------
const L = {}; const DIFFS = { easy: { name: 'Recruit', desc: 'Slower invasion, more reinforcements. For learning the board.', div: 11, grow: 6, escDays: 8, harv: 0.11, iq: 0.3 }, normal: { name: 'Veteran', desc: 'The intended fight. You will lose ground before you gain it.', div: 12, grow: 9, escDays: 6, harv: 0.14, iq: 0.7 }, hard: { name: 'Last Stand', desc: 'Fast growth, quick escalation, thin reserves.', div: 16, grow: 11, escDays: 5, harv: 0.17, iq: 1 } };
L.P = DIFFS.normal; L.setDiff = d => { L.P = DIFFS[d] || DIFFS.normal; };
L.rand = Math.random;
const rnd = () => L.rand();
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const d6 = () => ri(1, 6);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
L.dist = (a, b) => { const A = TERR[a], B = TERR[b], r = Math.PI / 180;
  const h = Math.sin((B.lat - A.lat) * r / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin((B.lon - A.lon) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h)); };
L.travelHours = (S, a, b) => a === b ? 0 : Math.round((4 + L.dist(a, b) / 600) * (S.up.transport ? 0.6 : 1));
L.hops = (from, max) => { const seen = { [from]: 0 }; let q = [from];
  while (q.length) { const c = q.shift(); if (seen[c] >= max) continue;
    for (const n of TERR[c].adj) if (!(n in seen)) { seen[n] = seen[c] + 1; q.push(n); } }
  return seen; };
L.day = S => Math.floor(S.t / 24) + 1;
L.stamp = S => 'Day ' + L.day(S) + ' ' + String(Math.floor(S.t % 24)).padStart(2, '0') + ':00';
L.log = (S, msg, kind) => { S.log.unshift({ t: S.t, msg, kind: kind || 'info' }); if (S.log.length > 80) S.log.pop(); S.ev.push({ k: 'toast', msg, kind: kind || 'info' }); };
L.canPay = (S, c) => Object.keys(c).every(k => S.res[k] >= c[k]);
L.pay = (S, c) => { for (const k in c) S.res[k] -= c[k]; };
L.costOf = (S, key) => { const c = Object.assign({}, BUILD[key].cost); if (S.spec === 'engineer') for (const k in c) c[k] = Math.ceil(c[k] / 2); return c; };
L.owned = S => TIDS.filter(id => S.terr[id].owner === 'you');
L.enemyT = S => TIDS.filter(id => S.terr[id].owner === 'enemy');
L.leadersAt = (S, id) => S.leaders.filter(l => l.alive && l.at === id);
L.warlordsAlive = S => S.leaders.filter(l => l.alive && l.rank === 'warlord').length;
L.overlord = S => S.leaders.find(l => l.rank === 'overlord');
L.inDisarray = (S, l) => l.rank === 'commander' && l.boss && !S.leaders.some(b => b.id === l.boss && b.alive);

L.teamAt = S => S.team.dest ? null : S.team.at;
L.teamN = S => (S.spec === 'assault' ? 3 : 2) + (S.up.exo ? 1 : 0);
L.observedSet = S => { const o = {}; const range = S.up.deepscan ? 3 : 2; if ((S.scanUntil || 0) > S.t) { for (const id of TIDS) o[id] = 1; return o; }
  for (const id of TIDS) { const T = S.terr[id];
    if (T.owner === 'you') { o[id] = 1; for (const n of TERR[id].adj) o[n] = 1;
      if (T.radar) { const h = L.hops(id, range); for (const k in h) o[k] = 1; } } }
  const ta = L.teamAt(S); if (ta) { o[ta] = 1; for (const n of TERR[ta].adj) o[n] = 1; }
  return o; };
L.refreshIntel = S => { const o = L.observedSet(S); S.obs = o;
  for (const id of TIDS) if (o[id]) { S.terr[id].seenN = S.terr[id].n; S.terr[id].seenT = S.t; }
  for (const l of S.leaders) if (l.alive && (o[l.at] || S.up.deepscan)) { l.seenAt = l.at; l.seenT = S.t; } };
L.leaderKnown = (S, l) => !!(S.obs[l.at] || S.up.deepscan || (S.scanUntil || 0) > S.t);

// Guards a leader adds to a territory's defense
L.guards = (S, id) => { let g = 0;
  for (const l of L.leadersAt(S, id)) {
    if (l.rank === 'overlord') g += 3 + 2 * L.warlordsAlive(S);
    else if (l.rank === 'warlord') g += 2;
    else if (!L.inDisarray(S, l)) g += 1;
    if (l.trait === 'warden') g += 1; }
  if (S.terr[id].soft > S.t) g = Math.max(0, g - 1);
  if (S.terr[id].emp > S.t) g = Math.floor(g / 2);
  return g; };
L.enemyDefense = (S, id) => S.terr[id].n + L.guards(S, id);

// ---------- Dice ----------
L.round = (A, D, aBonus, dBonus) => {
  const a = [], d = []; for (let i = 0; i < Math.min(3, A); i++) a.push(d6()); for (let i = 0; i < Math.min(2, D); i++) d.push(d6());
  a.sort((x, y) => y - x); d.sort((x, y) => y - x);
  const am = a.slice(), dm = d.slice(); if (aBonus) am[0] += aBonus; if (dBonus) dm[0] += dBonus;
  let aL = 0, dL = 0; for (let i = 0; i < Math.min(a.length, d.length); i++) { if (am[i] > dm[i]) dL++; else aL++; }
  return { a, d, aBonus: aBonus || 0, dBonus: dBonus || 0, aL, dL }; };
L.fight = (A, D, aBonus, dBonus) => { let n = 0; while (A > 0 && D > 0 && n++ < 200) { const r = L.round(A, D, aBonus, dBonus); A -= r.aL; D -= r.dL; } return { A, D }; };

// ---------- New game ----------
L.newGame = (spec, diff) => { L.setDiff(diff);
  const S = { v: 4, diff: diff || 'normal', t: 0, speed: 0, spec, res: { metal: 60, fuel: 60, research: 30, uranium: 0, intel: 3, salvage: 0 }, pool: 4, terr: {}, leaders: [], parties: [],
    team: { at: HQ, dest: null, from: null, t0: 0, eta: 0, pips: 4, restT: 0 }, up: {}, nuke: { stage: 0, doneAt: 0, building: false, ready: 0 },
    emp: { n: 0, building: false, doneAt: 0 }, nukes: 0, harvest: 0, esc: 0, kills: 0, intel: 0, log: [], ev: [], obs: {}, over: null, pid: 1, lid: 1,
    next: { grow: 24, attack: 30, daily: 24, move: 40, promote: [] }, stats: { won: 0, lost: 0, held: 0 } };
  const E = { tokyo: 7, beijing: 6, seoul: 4, hongkong: 4, yakutsk: 4, bangkok: 3, manila: 5, jakarta: 4, perth: 3, sydney: 4, joburg: 5, kinshasa: 4 };
  for (const id of TIDS) S.terr[id] = id in E ? { owner: 'enemy', n: E[id], seenN: E[id], seenT: 0 } : { owner: 'you', n: 2, seenN: 2, seenT: 0 };
  S.terr[HQ].n = 5; S.terr[HQ].fort = 1; S.terr[HQ].radar = 1;
  const mk = (rank, at, boss) => { const l = { id: 'L' + S.lid++, rank, at, alive: true, boss: boss || null, seenAt: at, seenT: 0, exposed: 0, trait: rank === 'overlord' ? null : pick(Object.keys(TRAITS)),
    name: pick(FIRST) + ' ' + pick(SUR) + '-' + ri(31, 47) }; S.leaders.push(l); return l; };
  mk('overlord', 'tokyo');
  const w1 = mk('warlord', 'beijing'), w2 = mk('warlord', 'manila'), w3 = mk('warlord', 'joburg');
  mk('commander', 'seoul', w1.id); mk('commander', 'hongkong', w1.id); mk('commander', 'yakutsk', w1.id); mk('commander', 'jakarta', w2.id); mk('commander', 'sydney', w2.id); mk('commander', 'kinshasa', w3.id);
  L.refreshIntel(S);
  S.log.push({ t: 0, msg: 'The invasion holds East Asia, the western Pacific and southern Africa. Hold the line and find a way to break their command.', kind: 'story' });
  return S; };

// ---------- Enemy behavior ----------
L.cap = S => 7 + Math.min(3, S.esc);
L.launchParty = (S, from, to, n, breakout, eta) => { const ls = L.leadersAt(S, from), dur = (eta || S.t + (breakout ? 24 : ri(36, 54))) - S.t;
  S.parties.push({ id: S.pid++, from, to, n, t0: S.t, eta: S.t + Math.round(dur * (ls.some(l => l.trait === 'raider') ? 0.7 : 1)), breakout: !!breakout, hit: 0, aB: ls.some(l => l.trait === 'butcher') ? 1 : 0 }); };
L.playerNeighbors = (S, id) => TERR[id].adj.filter(n => S.terr[n].owner === 'you');
L.grow = S => { const en = L.enemyT(S); if (!en.length) return;
  const k = Math.max(1, L.P.grow + Math.min(5, S.esc) - (S.up.disruptor ? 1 : 0));
  for (let i = 0; i < k; i++) { const id = pick(en), T = S.terr[id];
    if (T.n >= L.cap(S)) { // breakout, Pandemic style
      const nb = L.playerNeighbors(S, id); if (!nb.length) continue;
      T.n -= 2; for (const to of nb) L.launchParty(S, id, to, 2, true);
      L.log(S, 'Breakout from ' + TERR[id].name + ': war parties are heading for ' + nb.map(x => TERR[x].name).join(', ') + '.', 'bad');
    } else T.n++; }
  for (const l of S.leaders) if (l.alive && l.trait === 'breeder' && S.terr[l.at].owner === 'enemy' && S.terr[l.at].n < L.cap(S)) S.terr[l.at].n++; };
// ---------- Enemy strategy ----------
// How much the invaders want a given player territory.
L.targetValue = (S, to) => { const T = S.terr[to]; let v = 1 + Math.max(0, 5 - T.n) - (T.fort ? 1 : 0);
  if (to === HQ) v += (S.nuke.building || S.nuke.ready) ? 6 : 1.5;
  if (URANIUM.includes(to)) v += 2.5; if (T.battery) v += 2; if (T.radar) v += 1;
  const rg = TERR[to].region; if (TIDS.every(i => TERR[i].region !== rg || S.terr[i].owner === 'you')) v += 2.5; // breaks a region bonus
  if (PERKS[to]) v += 1.5; if (L.teamAt(S) === to) v -= 1; return Math.max(0.3, v); };
// Warlord-led offensives: choose an objective, mass troops from the rear if the front is too thin, then strike, from two sides when possible.
L.smartAttack = S => { const fronts = [];
  for (const id of L.enemyT(S)) { const T = S.terr[id]; if (T.disarray > S.t) continue; const ls = L.leadersAt(S, id); if (ls.length && ls.every(l => L.inDisarray(S, l))) continue;
    for (const to of L.playerNeighbors(S, id)) fronts.push({ id, to }); }
  if (!fronts.length) return; const ai = S.ai || (S.ai = { obj: null, until: 0, massed: 0 });
  if (!ai.obj || S.terr[ai.obj].owner !== 'you' || S.t > ai.until || !fronts.some(f => f.to === ai.obj)) { let best = null, bs = -1;
    for (const to of new Set(fronts.map(f => f.to))) { const sc = L.targetValue(S, to) * (0.75 + rnd() * 0.5); if (sc > bs) { bs = sc; best = to; } }
    ai.obj = best; ai.until = S.t + 96; ai.massed = 0; }
  const to = ai.obj, srcs = fronts.filter(f => f.to === to).map(f => f.id).sort((a, b) => S.terr[b].n - S.terr[a].n), main = srcs[0];
  const def = S.terr[to].n + (S.terr[to].fort ? 1.5 : 0), avail = srcs.slice(0, 2).reduce((n, id) => n + Math.floor(S.terr[id].n / 2), 0);
  if (avail < def * 0.9 && ai.massed < 3) { ai.massed++;
    const rear = L.enemyT(S).filter(id => !L.playerNeighbors(S, id).length && S.terr[id].n >= 3 && !L.leadersAt(S, id).length).sort((a, b) => L.dist(a, main) - L.dist(b, main))[0];
    if (rear) { const k = Math.min(2, S.terr[rear].n - 1); S.terr[rear].n -= k; S.terr[main].n = Math.min(L.cap(S) + 2, S.terr[main].n + k);
      if (S.obs[main]) L.log(S, 'The swarm is massing in ' + TERR[main].name + ', facing ' + TERR[to].name + '.', 'intel'); return; } }
  ai.massed = 0; const eta = S.t + ri(36, 54); let sent = 0;
  for (const id of srcs.slice(0, S.esc >= 2 ? 2 : 1)) { const T = S.terr[id]; if (T.n < (sent ? 4 : 2)) continue;
    const n = Math.max(2, Math.floor(T.n / 2) + (!sent && S.esc > 2 ? 1 : 0)); T.n -= Math.floor(T.n / 2); L.launchParty(S, id, to, n, false, eta); sent++; }
  if (sent) ai.until = Math.min(ai.until, S.t + 60); };
L.planAttack = S => { if (rnd() < (L.P.iq == null ? 0.7 : L.P.iq)) return L.smartAttack(S); const opts = [];
  for (const id of L.enemyT(S)) { const T = S.terr[id]; if (T.n < 3) continue;
    const ls = L.leadersAt(S, id); if (ls.length && ls.every(l => L.inDisarray(S, l))) continue;
    if (T.disarray > S.t) continue;
    for (const to of L.playerNeighbors(S, id)) { let w = 1 + Math.max(0, 5 - S.terr[to].n) + (ls.length ? 2 : 0);
      if (to === HQ && (S.nuke.building || S.nuke.ready)) w *= 3; opts.push({ id, to, w }); } }
  if (!opts.length) return; let tot = opts.reduce((s, o) => s + o.w, 0), r = rnd() * tot, c = opts[0];
  for (const o of opts) { r -= o.w; if (r <= 0) { c = o; break; } }
  const T = S.terr[c.id], n = Math.max(2, Math.floor(T.n / 2) + (S.esc > 2 ? 1 : 0)); T.n -= Math.floor(T.n / 2);
  L.launchParty(S, c.id, c.to, n, false); };
L.partyVisible = (S, p) => !!(S.obs[p.from] || p.eta - S.t <= 14 || (S.scanUntil || 0) > S.t);
L.spawnCommander = (S, at) => { if (S.leaders.filter(l => l.alive).length >= 14) return; const ws = S.leaders.filter(l => l.alive && l.rank === 'warlord'); if (!ws.length) return;
  S.leaders.push({ id: 'L' + S.lid++, rank: 'commander', trait: pick(Object.keys(TRAITS)), at, alive: true, boss: pick(ws).id, seenAt: at, seenT: S.t, exposed: S.t + 36, name: pick(FIRST) + ' ' + pick(SUR) + '-' + ri(31, 47) }); };
L.arrive = (S, p, forced) => { const T = S.terr[p.to], name = TERR[p.to].name;
  if (T.owner !== 'you') { if (T.owner === 'enemy') T.n = Math.min(L.cap(S) + 2, T.n + p.n); return; }
  const teamHere = L.teamAt(S) === p.to && S.team.pips > 0;
  let D = T.n + (teamHere ? L.teamN(S) : 0);
  let dB = (T.fort ? 1 : 0) + (S.up.hardened ? 1 : 0) + (teamHere && S.spec === 'engineer' ? 1 : 0) + (PERKS[p.to] && PERKS[p.to].def || 0);
  const aB = (S.esc >= 4 ? 1 : 0) + (p.aB || 0), D0 = D, r = forced || L.fight(p.n, D, Math.min(2, aB), Math.min(2, dB));
  if (r.D > 0) { const lost = Math.min(T.n, D0 - r.D); T.n = Math.max(teamHere ? 0 : 1, T.n - lost); if (T.n < 1) T.n = 1; S.stats.held++;
    if (teamHere) S.res.salvage++;
    L.log(S, name + ' held against ' + p.n + ' attackers' + (lost ? ', losing ' + lost + '.' : ' without loss.') + (teamHere ? ' Your strike team fought in the line.' : ''), 'good');
  } else { T.owner = 'enemy'; T.n = Math.max(1, r.A); T.fort = 0; T.radar = 0; T.battery = 0; S.stats.lost++;
    L.log(S, name + ' has fallen to the invasion.', 'bad'); S.ev.push({ k: 'pause' });
    if (teamHere) { S.team.pips = Math.max(0, S.team.pips - 2); L.teamRetreat(S, p.to); }
    if (rnd() < 0.6) L.spawnCommander(S, p.to);
    if (p.to === HQ) return L.end(S, 'hq'); } };
// Everything the "command the defense" battle needs to know about an incoming war party.
L.defenseSetup = (S, p) => { const T = S.terr[p.to], teamHere = L.teamAt(S) === p.to && S.team.pips > 0;
  return { to: p.to, name: TERR[p.to].name, A: p.n, D: T.n + (teamHere ? L.teamN(S) : 0), garrison: T.n, team: teamHere ? L.teamN(S) : 0, spec: S.spec, fort: !!T.fort, radar: !!T.radar, battery: !!T.battery, railgun: !!S.up.railgun,
    hardened: !!S.up.hardened, perkDef: !!(PERKS[p.to] && PERKS[p.to].def), aB: Math.min(2, (S.esc >= 4 ? 1 : 0) + (p.aB || 0)) }; };
L.resolveDefense = (S, forced) => { const p = S.pending; if (!p) return; S.pending = null; L.arrive(S, p, forced); };
L.teamRetreat = (S, from) => { const own = L.owned(S); if (!own.length) return; own.sort((a, b) => L.dist(from, a) - L.dist(from, b)); S.team.at = own[0]; S.team.dest = null; };
L.moveLeaders = S => { for (const l of S.leaders) { if (!l.alive) continue;
    const opts = TERR[l.at].adj.filter(n => S.terr[n].owner === 'enemy'); if (!opts.length) continue;
    const threatened = L.playerNeighbors(S, l.at).length > 0 || L.teamAt(S) === l.at;
    let p = l.rank === 'overlord' ? (threatened && S.kills >= 2 ? 0.5 : 0.05) : l.rank === 'warlord' ? 0.3 : 0.35;
    if (rnd() < p) { const to = pick(opts); l.from = l.at; l.at = to; l.moveT0 = S.t; l.exposed = S.t + 36;
      if (L.leaderKnown(S, l) || S.obs[l.from]) L.log(S, RANKN[l.rank] + ' ' + l.name + ' is relocating to ' + TERR[to].name + '. Security will be thin for 36 hours.', 'intel'); } } };
L.killLeader = (S, l, how) => { l.alive = false; S.kills++; L.drawCard(S, 'for the kill'); S.res.intel = Math.min(30, S.res.intel + 3);
  L.log(S, RANKN[l.rank] + ' ' + l.name + ' is dead' + (how ? ' (' + how + ').' : '.'), 'good');
  if (S.intel < INTEL.length) { S.ev.push({ k: 'intel', i: S.intel }); S.log.unshift({ t: S.t, msg: 'Intel recovered: ' + INTEL[S.intel], kind: 'story' }); S.intel++; }
  if (l.rank === 'warlord') { S.next.promote.push({ t: S.t + 72, boss: l.id });
    for (const id of L.enemyT(S)) if (L.leadersAt(S, id).some(c => c.boss === l.id) || id === l.at) { S.terr[id].disarray = S.t + 96; S.terr[id].n = Math.max(1, S.terr[id].n - 1); }
    L.log(S, 'His theater is in disarray. The Overlord has lost two guards.', 'good'); }
  if (l.rank === 'overlord') L.end(S, 'win'); };
L.promote = (S, pr) => { let c = S.leaders.filter(l => l.alive && l.rank === 'commander' && l.boss === pr.boss); if (!c.length) c = S.leaders.filter(l => l.alive && l.rank === 'commander');
  if (!c.length) return; const n = pick(c); n.rank = 'warlord'; const old = n.boss; n.boss = null;
  for (const l of S.leaders) if (l.boss === pr.boss || l.boss === old && false) l.boss = n.id;
  L.log(S, 'Commander ' + n.name + ' has been promoted to Warlord in ' + TERR[n.at].name + '.', 'bad'); };
L.daily = S => { const own = L.owned(S); const inc = { metal: 0, fuel: 0, research: 0 };
  for (const id of own) { inc[TERR[id].res] += 6; const pk = PERKS[id]; if (pk) { for (const k in pk.inc || {}) inc[k] += pk.inc[k]; if (pk.intel) S.res.intel = Math.min(30, S.res.intel + pk.intel); if (pk.pool && L.day(S) % 2 === 0) S.pool = Math.min(30, S.pool + 1); } }
  for (const k in inc) S.res[k] += inc[k];
  S.res.uranium += own.filter(id => URANIUM.includes(id)).length; S.res.intel = Math.min(30, S.res.intel + 1 + own.filter(id => S.terr[id].radar).length);
  let r = Math.max(1, Math.floor(own.length / L.P.div));
  for (const k in REGIONS) if (TIDS.filter(i => TERR[i].region === k).every(i => S.terr[i].owner === 'you')) r += REGIONS[k].bonus;
  S.pool = Math.min(30, S.pool + r);
  S.harvest = Math.min(100, S.harvest + L.enemyT(S).length * L.P.harv);
  if (S.harvest >= 100) return L.end(S, 'harvest');
  const e = Math.floor((L.day(S) - 1) / L.P.escDays) + S.nukes; if (e > S.esc) { S.esc = e; L.log(S, 'The invasion is escalating. Threat level ' + S.esc + '.', 'bad'); }
  if (own.length < 8) L.end(S, 'collapse'); };
L.end = (S, why) => { if (S.over) return; S.over = { why, t: S.t, own: L.owned(S).length }; S.speed = 0; S.ev.push({ k: 'over' }); };

// ---------- Clock ----------
L.step = S => { // advance one hour
  if (S.over || S.pending) return; S.t++;
  const N = S.next, tm = S.team;
  if (tm.dest && S.t >= tm.eta) { tm.at = tm.dest; tm.dest = null; tm.arrT = S.t;
    S.ev.push({ k: 'arrive', id: tm.at }); S.ev.push({ k: 'pause' }); }
  for (const p of S.parties.slice()) if (S.t >= p.eta) { S.parties.splice(S.parties.indexOf(p), 1);
    if (S.terr[p.from].owner !== 'enemy' && !p.breakout && rnd() < 0.5) { L.log(S, 'A war party bound for ' + TERR[p.to].name + ' scattered after losing its base.', 'good'); continue; }
    if (S.cmd && S.terr[p.to].owner === 'you' && p.n >= 3) { S.pending = p; S.ev.push({ k: 'defend' }); S.ev.push({ k: 'pause' }); return; }
    L.arrive(S, p); if (S.over) return; }
  if (S.t >= N.grow) { N.grow = S.t + 24; L.grow(S); }
  if (S.t >= N.attack) { N.attack = S.t + Math.max(12, 30 - S.esc * 4) + ri(-4, 4); if (S.parties.length < 4 + S.esc) L.planAttack(S); }
  if (S.t >= N.move) { N.move = S.t + ri(40, 70); L.moveLeaders(S); }
  for (const pr of N.promote.slice()) if (S.t >= pr.t) { N.promote.splice(N.promote.indexOf(pr), 1); L.promote(S, pr); }
  if (S.nuke.building && S.t >= S.nuke.doneAt) { S.nuke.building = false; S.nuke.stage++;
    if (S.nuke.stage >= 3) { S.nuke.stage = 0; S.nuke.ready++; L.log(S, 'A warhead is armed and ready to launch.', 'good'); S.ev.push({ k: 'pause' }); }
    else L.log(S, 'Warhead stage ' + S.nuke.stage + ' of 3 complete.', 'info'); }
  if (S.emp.building && S.t >= S.emp.doneAt) { S.emp.building = false; S.emp.n++; L.log(S, 'An EMP warhead is ready.', 'good'); }
  // team: rest and exposure
  const ta = L.teamAt(S);
  if (ta) { const own = S.terr[ta].owner === 'you';
    if (own && tm.pips < 4) { tm.restT++; if (tm.restT >= (S.up.elite ? 18 : 36)) { tm.pips++; tm.restT = 0; } }
    if (!own && S.terr[ta].owner === 'enemy' && S.spec !== 'shadow' && (S.t - tm.arrT) % 12 === 11 && rnd() < 0.18) {
      tm.pips = Math.max(0, tm.pips - 1); S.terr[ta].alert = S.t + 72; L.log(S, 'Your strike team was spotted in ' + TERR[ta].name + ' and had to pull out.', 'bad'); L.teamRetreat(S, ta); S.ev.push({ k: 'pause' }); } }
  if (S.t >= N.daily) { N.daily = S.t + 24; L.daily(S); }
  L.refreshIntel(S); };

// ---------- Command cards ----------
// Earned by liberating a territory (one per day) or killing a leader. Play one for its effect, or trade any three for reserves.
const CARDS_DEF = {
  airdrop: { name: 'Airdrop', art: 'deploy', desc: '+3 reserve troops, now.' },
  intercept: { name: 'Intercept', art: 'interceptor', desc: 'The largest incoming war party loses 3 strength.' },
  quiet: { name: 'Quiet Night', art: 'disruptor', desc: 'The invasion skips its next day of growth.' },
  convoy: { name: 'Supply Convoy', art: 'rapid-transport', desc: '+40 metal and +40 fuel.' },
  eyes: { name: 'Eyes Everywhere', art: 'deep-recon', desc: '+6 intel and the whole map revealed for 48 hours.' },
  rally: { name: 'Rally', art: 'elite-training', desc: 'Strike team back to full readiness.' },
  dig: { name: 'Dig In', art: 'fortify', desc: '+2 troops in every territory with a war party inbound.' } };
L.drawCard = (S, why) => { S.cards = S.cards || []; if (S.cards.length >= 6) return; const k = pick(Object.keys(CARDS_DEF)); S.cards.push(k);
  L.log(S, 'Command card earned ' + why + ': ' + CARDS_DEF[k].name + '.', 'good'); S.ev.push({ k: 'toast', msg: 'Command card: ' + CARDS_DEF[k].name, kind: 'good' }); };
L.tradeValue = S => 4 + 2 * (S.trades || 0);
L.tradeCards = S => { if (!S.cards || S.cards.length < 3) return fail('You need three cards.'); S.cards.splice(0, 3); const n = L.tradeValue(S); S.trades = (S.trades || 0) + 1; S.pool = Math.min(30, S.pool + n);
  L.log(S, 'Three command cards traded for ' + n + ' reserve troops.', 'good'); return { ok: true }; };
L.playCard = (S, i) => { const k = (S.cards || [])[i]; if (!k) return fail('No such card.');
  if (k === 'intercept') { const p = S.parties.slice().sort((a, b) => b.n - a.n)[0]; if (!p) return fail('No war party is inbound.'); p.n -= 3; if (p.n < 1) S.parties.splice(S.parties.indexOf(p), 1);
    L.log(S, 'Interceptors tore into the war party bound for ' + TERR[p.to].name + '.', 'good'); }
  else if (k === 'dig') { const ids = [...new Set(S.parties.map(p => p.to))].filter(id => S.terr[id].owner === 'you'); if (!ids.length) return fail('No territory is under threat.'); for (const id of ids) S.terr[id].n += 2; L.log(S, 'Garrisons dug in at ' + ids.map(id => TERR[id].name).join(', ') + '.', 'good'); }
  else if (k === 'airdrop') S.pool = Math.min(30, S.pool + 3);
  else if (k === 'quiet') { S.next.grow += 24; L.log(S, 'The invasion is quiet tonight.', 'good'); }
  else if (k === 'convoy') { S.res.metal += 40; S.res.fuel += 40; }
  else if (k === 'eyes') { S.res.intel = Math.min(30, S.res.intel + 6); S.scanUntil = Math.max(S.scanUntil || 0, S.t + 48); L.refreshIntel(S); }
  else if (k === 'rally') { if (S.team.pips >= 4) return fail('The team is already at full readiness.'); S.team.pips = 4; }
  S.cards.splice(i, 1); return { ok: true }; };

// ---------- Player actions ----------
const fail = msg => ({ ok: false, msg });
L.reinforce = (S, id) => { const T = S.terr[id]; if (T.owner !== 'you') return fail('Not your territory.'); if (S.pool < 1) return fail('No reinforcements available.');
  if (T.n >= 12) return fail('Garrison is at maximum.'); S.pool--; T.n++; return { ok: true }; };
L.build = (S, id, key) => { const T = S.terr[id]; if (T.owner !== 'you') return fail('Not your territory.'); if (T[key]) return fail('Already built.');
  const c = L.costOf(S, key); if (!L.canPay(S, c)) return fail('Not enough resources.'); L.pay(S, c); T[key] = 1; if (key === 'battery') T.reload = 0;
  L.log(S, BUILD[key].name + ' built in ' + TERR[id].name + '.', 'info'); L.refreshIntel(S); return { ok: true }; };
L.buy = (S, key) => { if (S.up[key]) return fail('Already owned.'); const c = UPGRADES[key].cost; if (!L.canPay(S, c)) return fail('Not enough resources.');
  L.pay(S, c); S.up[key] = 1; L.log(S, UPGRADES[key].name + ' is now in service.', 'info'); L.refreshIntel(S); return { ok: true }; };
L.deploy = (S, id) => { const tm = S.team; if (tm.dest) return fail('The team is already in transit.'); if (tm.at === id) return fail('The team is already there.');
  if (S.terr[id].owner === 'waste') return fail('Nothing survives there.'); if (tm.pips < 1) return fail('The team is out of action until it rests.');
  if (S.res.fuel < 8) return fail('Not enough fuel (8).'); S.res.fuel -= 8; tm.from = tm.at; tm.dest = id; tm.t0 = S.t; tm.eta = S.t + L.travelHours(S, tm.at, id); tm.restT = 0; return { ok: true }; };
L.covertOdds = (S, l) => { const T = S.terr[l.at]; let p = 0.52;
  if (S.spec === 'shadow') p += 0.15; if (S.up.ghost) p += 0.15; if (S.obs[l.at]) p += 0.08; if (l.exposed > S.t) p += 0.2; if (l.trait === 'ghost') p -= 0.12;
  p -= 0.045 * T.n; p -= l.rank === 'warlord' ? 0.12 : l.rank === 'overlord' ? 0.22 + 0.11 * L.warlordsAlive(S) : 0;
  if (T.alert > S.t) p -= 0.2; if (T.disarray > S.t) p += 0.1; if (T.soft > S.t) p += 0.06; p -= 0.07 * (4 - S.team.pips);
  return clamp(p, 0.02, 0.92); };
L.teamFail = S => { const loss = (rnd() < 0.3 && !S.up.elite) ? 2 : 1; S.team.pips = Math.max(0, S.team.pips - loss); return loss; };
L.covert = (S, lid) => { const l = S.leaders.find(x => x.id === lid); if (!l || !l.alive) return fail('No such target.');
  if (L.teamAt(S) !== l.at) return fail('The strike team must be in the same territory.'); if (S.team.pips < 1) return fail('The team is out of action.');
  if (S.res.fuel < 10) return fail('Not enough fuel (10).'); if (S.res.intel < 2) return fail('Not enough intel (2). Radar stations and leader kills produce it.'); S.res.fuel -= 10; S.res.intel -= 2;
  const p = L.covertOdds(S, l), at = l.at;
  if (rnd() < p) { S.res.salvage++; L.killLeader(S, l, 'covert strike in ' + TERR[at].name); return { ok: true, win: true, p }; }
  const loss = L.teamFail(S); S.terr[at].alert = S.t + 72; L.log(S, 'The strike on ' + l.name + ' failed. The team was detected and pulled out, losing ' + loss + ' readiness.', 'bad'); L.teamRetreat(S, at);
  return { ok: true, win: false, p }; };
L.sabOdds = (S, id) => { const T = S.terr[id]; let p = 0.72 + (S.spec === 'shadow' ? 0.15 : 0) + (S.up.ghost ? 0.15 : 0) - 0.04 * T.n - (T.alert > S.t ? 0.2 : 0) - 0.07 * (4 - S.team.pips); return clamp(p, 0.05, 0.95); };
L.sabotage = (S, id) => { const T = S.terr[id]; if (L.teamAt(S) !== id || T.owner !== 'enemy') return fail('The strike team must be inside that enemy territory.');
  if (S.team.pips < 1) return fail('The team is out of action.'); if (S.res.fuel < 10) return fail('Not enough fuel (10).'); if (S.res.intel < 1) return fail('Not enough intel (1).'); S.res.fuel -= 10; S.res.intel -= 1; const p = L.sabOdds(S, id);
  if (rnd() < p) { T.n = Math.max(1, T.n - 2); S.harvest = Math.max(0, S.harvest - 2); const before = S.parties.length; S.parties = S.parties.filter(x => !(x.from === id && S.t - x.t0 < 12));
    T.alert = S.t + 36; L.log(S, 'Sabotage in ' + TERR[id].name + ': depots destroyed, strength down by 2, the Harvest set back.' + (S.parties.length < before ? ' A staging war party was wiped out.' : ''), 'good'); return { ok: true, win: true, p }; }
  const loss = L.teamFail(S); T.alert = S.t + 72; L.log(S, 'Sabotage in ' + TERR[id].name + ' failed. The team pulled out, losing ' + loss + ' readiness.', 'bad'); L.teamRetreat(S, id); return { ok: true, win: false, p }; };
// Assault: troops come from the pool first, then neighboring garrisons (each keeps 1)
L.assaultAvail = (S, id) => { let n = S.pool; const nb = L.playerNeighbors(S, id); for (const x of nb) n += Math.max(0, S.terr[x].n - 1); return { n, supplied: nb.length > 0 }; };
L.estimate = (A, D, aB, dB) => { if (A < 1) return 0; let w = 0; for (let i = 0; i < 300; i++) if (L.fight(A, D, aB, dB).D <= 0) w++; return w / 300; };
L.assaultPlan = (S, id, troops, o) => { o = o || {}; const av = L.assaultAvail(S, id); troops = clamp(troops, 0, av.n); const teamHere = L.teamAt(S) === id && S.team.pips > 0;
  const teamN = teamHere ? L.teamN(S) : 0; const cost = { fuel: 15 + (o.flank ? 20 : 0) + (o.air ? BOMB_COST.fuel : 0) + (o.missile ? SALVO_COST.fuel : 0), metal: o.missile ? SALVO_COST.metal : 0 };
  const can = { missile: L.batteriesInRange(S, id).length > 0, air: !!S.up.bombers && (S.bombT || 0) <= S.t && S.terr[HQ].owner === 'you' };
  let D = L.enemyDefense(S, id) - (o.missile && can.missile ? 2 : 0) - (o.air && can.air ? 3 : 0); D = Math.max(1, D);
  const n = (teamHere && S.spec === 'assault' ? 1 : 0) + (o.flank ? 1 : 0) - (av.supplied ? 0 : 1); const aB = clamp(n, 0, 2), dB = n < 0 ? 1 : 0, A = troops + teamN;
  return { A, D, aB, dB, troops, teamN, teamHere, cost, can, avail: av.n, supplied: av.supplied, guards: L.guards(S, id), p: L.estimate(A, D, aB, dB) }; };
L.assaultStart = (S, id, troops, o) => { o = o || {}; const T = S.terr[id]; if (T.owner !== 'enemy') return fail('Not an enemy territory.');
  const pl = L.assaultPlan(S, id, troops, o); if (pl.A < 1) return fail('No troops to commit.'); if (!L.canPay(S, pl.cost)) return fail('Not enough fuel or metal for this plan.');
  L.pay(S, pl.cost);
  if (o.missile && pl.can.missile) { S.terr[L.batteriesInRange(S, id)[0]].reload = S.t + 24; T.n = Math.max(1, T.n - 2); }
  if (o.air && pl.can.air) { S.bombT = S.t + 48; T.n = Math.max(1, T.n - 3); }
  let need = pl.troops; const fromPool = Math.min(S.pool, need); S.pool -= fromPool; need -= fromPool;
  const nb = L.playerNeighbors(S, id).sort((a, b) => S.terr[b].n - S.terr[a].n);
  while (need > 0) { let took = false; for (const x of nb) if (need > 0 && S.terr[x].n > 1) { S.terr[x].n--; need--; took = true; } if (!took) break; }
  const D = Math.max(1, L.enemyDefense(S, id));
  const b = { id, A: pl.A, A0: pl.A, teamN: pl.teamN, troops: pl.troops, D, D0: D, guards: L.guards(S, id), aB: pl.aB, dB: pl.dB, rounds: [], done: false, supplied: pl.supplied, teamHere: pl.teamHere };
  return { ok: true, b }; };
L.assaultRound = (S, b) => { if (b.done) return; const r = L.round(b.A, b.D, b.aB, b.dB); b.A -= r.aL; b.D -= r.dL; b.rounds.push(r);
  if (b.A <= 0 || b.D <= 0) L.assaultEnd(S, b, b.D <= 0); return r; };
L.assaultEnd = (S, b, won) => { if (b.done) return; b.done = true; b.won = won; const T = S.terr[b.id], name = TERR[b.id].name;
  const lostFrac = 1 - Math.max(0, b.A) / b.A0; const surv = Math.max(0, Math.min(b.troops, b.A - (b.teamHere ? 0 : 0)));
  if (won) { S.stats.won++; const ls = L.leadersAt(S, b.id); T.owner = 'you'; T.n = Math.max(1, Math.min(surv, b.A)); T.alert = 0; T.disarray = 0; T.soft = 0;
    S.parties = S.parties.filter(p => !(p.from === b.id && S.t - p.t0 < 10));
    L.log(S, name + ' is liberated. ' + T.n + ' troops hold it.', 'good'); b.notes = []; if (S.cardDay !== L.day(S)) { S.cardDay = L.day(S); L.drawCard(S, 'for liberating ' + name); }
    for (const l of ls) { const esc = TERR[b.id].adj.filter(n => S.terr[n].owner === 'enemy');
      if (esc.length && rnd() < 0.45) { l.at = pick(esc); l.exposed = S.t + 48; l.from = b.id; l.moveT0 = S.t; b.notes.push(RANKN[l.rank] + ' ' + l.name + ' escaped to ' + TERR[l.at].name + ', wounded and exposed.'); L.log(S, b.notes[b.notes.length - 1], 'intel'); }
      else { b.notes.push(RANKN[l.rank] + ' ' + l.name + ' was killed in the fighting.'); L.killLeader(S, l, 'killed in the assault on ' + name); } }
    if (b.teamHere) { S.res.salvage += 2; b.notes.push('The strike team recovered 2 salvage from the battlefield.'); }
    if (b.teamHere && lostFrac > 0.6) S.team.pips = Math.max(1, S.team.pips - 1);
  } else { const back = Math.max(0, Math.min(b.troops, b.A)); S.pool = Math.min(30, S.pool + back); T.n = Math.max(1, b.D - b.guards); if (b.D <= b.guards) T.n = 1;
    if (b.A <= 0) { L.log(S, 'The assault on ' + name + ' was destroyed.', 'bad'); if (b.teamHere) { S.team.pips = Math.max(0, S.team.pips - 2); L.teamRetreat(S, b.id); } }
    else { L.log(S, 'You withdrew from ' + name + '. ' + back + ' troops returned to the reserve.', 'info'); if (b.teamHere) L.teamRetreat(S, b.id); } }
  L.refreshIntel(S); };
// Long-range fire
L.batteriesInRange = (S, id) => { const out = []; for (const x of L.owned(S)) { const T = S.terr[x]; if (T.battery && (T.reload || 0) <= S.t && (L.hops(x, 2)[id] !== undefined)) out.push(x); } return out; };
L.strikeEffect = (S, id, power, label) => { const T = S.terr[id]; if (T.owner !== 'enemy') return fail('Not an enemy territory.');
  const hit = ri(1, power); T.n = Math.max(1, T.n - hit); T.soft = S.t + 24; let extra = '';
  for (const l of L.leadersAt(S, id)) if (rnd() < 0.15) { l.exposed = S.t + 36; extra = ' ' + RANKN[l.rank] + ' ' + l.name + ' was wounded and is exposed.'; }
  L.log(S, label + ' hit ' + TERR[id].name + ': strength down by ' + hit + ', defenses shaken for 24 hours.' + extra, 'good'); L.refreshIntel(S); return { ok: true, hit }; };
L.salvo = (S, id) => { const bs = L.batteriesInRange(S, id); if (!bs.length) return fail('No loaded missile battery within 2 territories.'); if (!L.canPay(S, SALVO_COST)) return fail('Not enough resources.');
  L.pay(S, SALVO_COST); S.terr[bs[0]].reload = S.t + (S.up.railgun ? 12 : 24); return L.strikeEffect(S, id, S.up.railgun ? 3 : 2, 'Missile salvo from ' + TERR[bs[0]].name); };
L.salvoParty = (S, pid) => { const p = S.parties.find(x => x.id === pid); if (!p) return fail('That war party is gone.'); const bs = L.batteriesInRange(S, p.to).concat(L.batteriesInRange(S, p.from));
  if (!bs.length) return fail('No loaded missile battery in range.'); if (!L.canPay(S, SALVO_COST)) return fail('Not enough resources.'); L.pay(S, SALVO_COST); S.terr[bs[0]].reload = S.t + 24;
  const hit = ri(1, 2); p.n -= hit; L.log(S, 'Missiles hit the war party bound for ' + TERR[p.to].name + ', destroying ' + Math.min(hit, p.n + hit) + '.', 'good'); if (p.n <= 0) S.parties.splice(S.parties.indexOf(p), 1); return { ok: true }; };
L.bomb = (S, id) => { if (!S.up.bombers) return fail('Research Strategic Bombers first.'); if ((S.bombT || 0) > S.t) return fail('Bombers are rearming.'); if (!L.canPay(S, BOMB_COST)) return fail('Not enough fuel (40).');
  if (S.terr[HQ].owner !== 'you') return fail('No airbase.'); L.pay(S, BOMB_COST); S.bombT = S.t + 48; return L.strikeEffect(S, id, 3, 'Bomber raid'); };
L.ambush = (S, pid) => { const p = S.parties.find(x => x.id === pid); if (!p) return fail('That war party is gone.'); if (L.teamAt(S) !== p.to) return fail('The strike team must be in the territory under attack.');
  if (p.hit) return fail('Already ambushed.'); if (S.team.pips < 1) return fail('The team is out of action.'); p.hit = 1; const hit = ri(1, 2) + (S.spec === 'shadow' ? 1 : 0); p.n -= hit;
  S.res.salvage++; let m = 'Your team ambushed the war party bound for ' + TERR[p.to].name + ', destroying ' + hit + '.'; if (rnd() < 0.2) { S.team.pips = Math.max(0, S.team.pips - 1); m += ' The team took casualties.'; }
  L.log(S, m, 'good'); if (p.n <= 0) S.parties.splice(S.parties.indexOf(p), 1); return { ok: true }; };
L.deepRecon = S => { if (S.res.intel < 5) return fail('Not enough intel (5).'); S.res.intel -= 5; S.scanUntil = S.t + 72; L.refreshIntel(S); L.log(S, 'Deep recon: every territory, leader and war party is visible for 3 days.', 'intel'); return { ok: true }; };
// EMP and airlift
const EMP_COST = { metal: 60, fuel: 50, research: 40 };
L.empBuild = S => { if (S.emp.building) return fail('An EMP is already being assembled.'); if (!L.canPay(S, EMP_COST)) return fail('Not enough resources.'); L.pay(S, EMP_COST); S.emp.building = true; S.emp.doneAt = S.t + 30; return { ok: true }; };
L.empLaunch = (S, id) => { if (S.emp.n < 1) return fail('No EMP warhead ready.'); const T = S.terr[id]; if (T.owner !== 'enemy') return fail('Not an enemy territory.'); S.emp.n--; T.emp = S.t + 72; T.disarray = S.t + 72;
  S.parties = S.parties.filter(p => !(p.from === id && S.t - p.t0 < 16)); L.log(S, 'EMP burst over ' + TERR[id].name + ': leader guards halved and no attacks from there for 3 days.', 'good'); return { ok: true }; };
L.airlift = (S, id) => { const T = S.terr[id]; if (T.owner !== 'you') return fail('Not your territory.'); if ((S.airT || 0) > S.t) return fail('Transports are refueling.'); if (S.res.fuel < 15) return fail('Not enough fuel (15).');
  const src = L.owned(S).filter(x => x !== id && S.terr[x].n > 1).sort((a, b) => S.terr[b].n - S.terr[a].n)[0]; if (!src) return fail('No garrison can spare troops.');
  const n = Math.min(2, S.terr[src].n - 1); S.terr[src].n -= n; T.n += n; S.res.fuel -= 15; S.airT = S.t + 12; L.log(S, 'Airlifted ' + n + ' troops from ' + TERR[src].name + ' to ' + TERR[id].name + '.', 'info'); return { ok: true }; };
// Nuke
L.nukeStart = S => { if (S.nuke.building) return fail('A stage is already in progress.'); if (S.terr[HQ].owner !== 'you') return fail('HQ is lost.'); if (!L.canPay(S, NUKE_STAGE.cost)) return fail('Not enough resources.');
  L.pay(S, NUKE_STAGE.cost); S.nuke.building = true; S.nuke.doneAt = S.t + NUKE_STAGE.hours; L.log(S, 'Warhead stage ' + (S.nuke.stage + 1) + ' is under construction at HQ. The enemy will notice.', 'info'); return { ok: true }; };
L.nukeLaunch = (S, id) => { if (S.nuke.ready < 1) return fail('No warhead ready.'); const T = S.terr[id]; if (T.owner === 'waste') return fail('Already a wasteland.'); if (id === HQ) return fail('That is your own headquarters.');
  S.nuke.ready--; S.nukes++; const was = T.owner; T.owner = 'waste'; T.n = 0; T.fort = T.radar = T.battery = 0;
  L.log(S, TERR[id].name + ' is gone. Nothing will grow there again.', 'story');
  for (const l of L.leadersAt(S, id)) { const esc = TERR[id].adj.filter(n => S.terr[n].owner === 'enemy'); if (l.rank === 'overlord' && esc.length && rnd() < 0.5) { l.at = pick(esc); l.exposed = S.t + 48; L.log(S, 'The Overlord was not there when it hit. He has surfaced in ' + TERR[l.at].name + '.', 'bad'); } else L.killLeader(S, l, 'vaporized'); }
  for (const n of TERR[id].adj) { const N = S.terr[n]; if (N.owner !== 'waste' && N.n > 1) N.n--; }
  S.parties = S.parties.filter(p => p.from !== id && p.to !== id); if (L.teamAt(S) === id) { S.team.pips = 0; L.teamRetreat(S, id); }
  S.esc++; if (!S.over) L.log(S, 'Somewhere upstream, their world just got worse. They are coming harder. Threat level ' + S.esc + '.', 'story'); L.refreshIntel(S); return { ok: true, was }; };

if (typeof module !== 'undefined') module.exports = { PERKS, TRAITS, CARDS_DEF, URANIUM, DIFFS, EMP_COST, SALVO_COST, BOMB_COST, SPECS, L, TERR, TIDS, HQ, LINKS, REGIONS, UPGRADES, BUILD, NUKE_STAGE, INTEL };
