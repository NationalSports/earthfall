// Frontline tuning panel (Tweakpane). Press P in a mission to open it, drag the sliders while you play, and press
// "Copy settings" to send the numbers back. Settings are kept in this browser between visits.
import { Pane } from 'tweakpane';

export const DEFAULTS = { moveSpeed: 1, look: 1, fov: 62, dmgDealt: 1, dmgTaken: 1, enemySpeed: 1, waveSize: 1, flyers: 1, farHives: true,
  heliThrust: 1, heliSpeed: 1, heliTurn: 1, heliClimb: 1, brightness: 1, effects: 1, ao: 1 };
export const TUNE = Object.assign({}, DEFAULTS);
const KEY = 'frontline-tune-v1';

export function createTuner(onChange) {
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) for (const k in DEFAULTS) if (typeof saved[k] === typeof DEFAULTS[k]) TUNE[k] = saved[k]; } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(TUNE)); } catch (e) { /* storage unavailable */ } };
  const host = document.createElement('div'); host.id = 'tune'; host.style.cssText = 'position:fixed;top:12px;right:12px;width:300px;z-index:60;display:none;max-height:calc(100vh - 24px);overflow:auto;';
  document.body.appendChild(host);
  const pane = new Pane({ container: host, title: 'Tuning  (P to close)' }), changed = () => { save(); if (onChange) onChange(); };
  const f = (title, rows) => { const fo = pane.addFolder({ title }); for (const [k, label, min, max, step] of rows) fo.addBinding(TUNE, k, typeof DEFAULTS[k] === 'boolean' ? { label } : { label, min, max, step }); return fo; };
  f('You', [['moveSpeed', 'Move speed', 0.6, 1.8, 0.05], ['look', 'Mouse sensitivity', 0.3, 2.5, 0.05], ['fov', 'Field of view', 50, 90, 1], ['dmgDealt', 'Damage you deal', 0.3, 3, 0.05], ['dmgTaken', 'Damage you take', 0.2, 2, 0.05]]);
  f('Enemies', [['enemySpeed', 'Speed (new enemies)', 0.5, 1.8, 0.05], ['waveSize', 'Wave size (next mission)', 0.3, 2.5, 0.05], ['flyers', 'Flyers (next wave)', 0, 3, 0.1], ['farHives', 'Far hives in Expedition (next mission)']]);
  f('Goshawk', [['heliThrust', 'Acceleration', 0.4, 2.5, 0.05], ['heliSpeed', 'Top speed', 0.5, 2, 0.05], ['heliTurn', 'Turn rate', 0.4, 2.5, 0.05], ['heliClimb', 'Climb rate', 0.4, 2.5, 0.05]]);
  f('Look', [['brightness', 'Brightness', 0.5, 1.8, 0.02], ['effects', 'Particle effects', 0, 2, 0.05], ['ao', 'Contact shadows (0 = off)', 0, 2, 0.05]]);
  pane.on('change', changed);
  const out = pane.addFolder({ title: 'Share', expanded: true });
  out.addButton({ title: 'Copy settings' }).on('click', () => { const changedOnly = {}; for (const k in DEFAULTS) if (TUNE[k] !== DEFAULTS[k]) changedOnly[k] = TUNE[k]; const text = 'Frontline tuning: ' + JSON.stringify(changedOnly); try { navigator.clipboard.writeText(text); } catch (e) { /* no clipboard */ } window.prompt('Copied. Paste this to Claude:', text); });
  out.addButton({ title: 'Reset to defaults' }).on('click', () => { Object.assign(TUNE, DEFAULTS); pane.refresh(); changed(); });
  const api = { get open() { return host.style.display !== 'none'; }, toggle() { const on = host.style.display === 'none'; host.style.display = on ? 'block' : 'none'; if (on && document.exitPointerLock) document.exitPointerLock(); } };
  window.addEventListener('keydown', e => { if (e.code === 'KeyP' && !e.repeat && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) api.toggle(); });
  if (onChange) onChange();
  return api; }
