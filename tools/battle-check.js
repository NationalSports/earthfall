// Compares the "command the defense" battle (played on autopilot) with the dice it replaces.
const { L } = require('../src/logic.js'), { B } = require('../src/battle.js');
const N = 200, rows = [];
for (const [A, D, opt] of [[3, 2, {}], [4, 4, {}], [6, 5, {}], [8, 6, {}], [5, 8, {}], [6, 5, { fort: 1 }], [8, 6, { fort: 1, battery: 1 }], [10, 6, { fort: 1, battery: 1, radar: 1 }], [6, 6, { aB: 1 }]]) {
  let dice = 0, live = 0, dl = 0, ll = 0;
  for (let i = 0; i < N; i++) { const r = L.fight(A, D, opt.aB || 0, opt.fort ? 1 : 0); if (r.D > 0) { dice++; dl += D - r.D; }
    const su = Object.assign({ A, D, team: 0, spec: 'assault', fort: false, radar: false, battery: false, railgun: false, hardened: false, perkDef: false, aB: 0 }, opt);
    const q = B.auto(B.create(su)); if (q.D > 0) { live++; ll += D - q.D; } }
  rows.push({ A, D, opt: JSON.stringify(opt), diceHeld: Math.round(dice / N * 100), liveHeld: Math.round(live / N * 100), diceLoss: (dl / Math.max(1, dice)).toFixed(1), liveLoss: (ll / Math.max(1, live)).toFixed(1) }); }
console.table(rows);
