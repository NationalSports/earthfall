// Feedback you can feel. A controller rumbles (and, where the browser allows, the right trigger kicks); an Android
// phone vibrates; an iPhone gives its system tick on button presses (Safari's switch control, iOS 18 and later).
// Strength comes from the tuning panel (Haptics, 0 turns it off).
import { TUNE } from './tune.js';

// [milliseconds, strong motor, weak motor]
const FEEL = { shot: [45, 0.12, 0.38], heavy: [60, 0.38, 0.55], shotgun: [110, 0.75, 0.85], rail: [160, 0.85, 0.9], flame: [60, 0.05, 0.25], rocket: [180, 0.9, 0.6],
  boom: [320, 1, 0.75], hit: [140, 0.85, 0.45], dive: [90, 0.35, 0.25], land: [120, 0.6, 0.3], reload: [35, 0.05, 0.3], select: [25, 0, 0.35], heli: [50, 0.25, 0.4] };
const TRIGGER = { shot: 0.45, heavy: 0.7, shotgun: 1, rail: 1, rocket: 1, flame: 0.25, heli: 0.5 };
let lastPhone = 0, padSeen = false;

export function padConnected() { return padSeen; }
export function buzz(kind, k = 1) { const f = FEEL[kind], s = (TUNE.haptics == null ? 1 : TUNE.haptics) * k; if (!f || s <= 0.02) return;
  const [ms, strong, weak] = f; let pad = false;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of pads) { const v = g && g.vibrationActuator; if (!v) continue; pad = padSeen = true; const fx = v.effects || ['dual-rumble'];
    try { if (fx.indexOf('dual-rumble') >= 0 || !v.effects) { const p = v.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong * s), weakMagnitude: Math.min(1, weak * s) }); if (p && p.catch) p.catch(() => {}); }
      if (TRIGGER[kind] && fx.indexOf('trigger-rumble') >= 0) { const p = v.playEffect('trigger-rumble', { startDelay: 0, duration: Math.min(ms, 90), strongMagnitude: 0, weakMagnitude: 0, leftTrigger: 0, rightTrigger: Math.min(1, TRIGGER[kind] * s) }); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* this pad cannot rumble */ } }
  if (!pad && navigator.vibrate && window.matchMedia && matchMedia('(pointer: coarse)').matches) { const now = performance.now(); if (now - lastPhone > 40) { lastPhone = now; try { navigator.vibrate(Math.max(8, Math.round(ms * 0.45 * Math.min(1, s)))); } catch (e) { /* not allowed yet */ } } }
}
// iPhone: toggling a hidden switch inside a touch handler plays the system haptic tick.
let sw = null;
export function tick() { if (TUNE.haptics === 0) return; try { if (!sw) { const l = document.createElement('label'), i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); l.appendChild(i); l.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;opacity:0;pointer-events:none'; document.body.appendChild(l); sw = l; } sw.click(); } catch (e) { /* no switch control here */ } }
