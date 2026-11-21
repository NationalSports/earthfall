// Controller support (standard mapping: Xbox, PlayStation, most others). Polled once a frame; it presses the same
// keys and mouse buttons the keyboard does, so every action works the same way.
//   Left stick move · right stick look · RT fire · LT aim · A jump pack · B dive · X reload (hold: fire mode)
//   Y next weapon (hold: weapon wheel) · LB grenade · RB melee · L3 sprint · R3 crouch
//   D-pad up use / Goshawk · D-pad left orbital strike · D-pad right supply drop · D-pad down turret
//   Start: start the wave (or the mission on the briefing) · Back: tactical map
import { TOUCH } from './touch.js';

const MAP = { 0: 'Space', 1: 'KeyF', 2: 'KeyR', 3: 'KeyQ', 4: 'KeyG', 5: 'KeyB', 10: 'ShiftLeft', 11: 'KeyC', 12: 'KeyE', 13: 'Digit2', 14: 'Digit1', 15: 'Digit5', 9: 'Enter', 8: 'Tab' };
export function createGamepad(cv) { const was = {}; let any = false, sx = false, sy = false;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const mouse = (type, button) => (type === 'mousedown' ? cv : window).dispatchEvent(new MouseEvent(type, { button, bubbles: true }));
  const dz = v => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84;
  return { get active() { return any; },
    poll(dt, inMenu) { const pads = navigator.getGamepads ? navigator.getGamepads() : []; let g = null; for (const p of pads) if (p && p.connected) { g = p; break; } if (!g) { if (any) { TOUCH.f = TOUCH.s = 0; any = false; } return; }
      const b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.4)), edge = i => { const n = b(i), o = !!was[i]; was[i] = n; return n === o ? 0 : n ? 1 : -1; };
      if (inMenu) { for (const i of [0, 9]) if (edge(i) === 1) { const s = document.querySelector('#over.on #again') || document.querySelector('#intro.on #start'); if (s) s.click(); } return; }
      any = true;
      // move: analogue, plus the keys themselves so the Goshawk flies from the stick too
      const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0); TOUCH.f = -ly; TOUCH.s = lx;
      const fx = Math.abs(lx) > 0.5, fy = Math.abs(ly) > 0.5; if (fx !== sx || fx) { key('KeyD', lx > 0.5); key('KeyA', lx < -0.5); } if (fy !== sy || fy) { key('KeyS', ly > 0.5); key('KeyW', ly < -0.5); } sx = fx; sy = fy;
      // look: a curve, so small pushes aim finely and full pushes turn fast
      const rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0); if (rx || ry) window.dispatchEvent(new MouseEvent('mousemove', { movementX: rx * Math.abs(rx) * 1050 * dt, movementY: ry * Math.abs(ry) * 700 * dt, bubbles: true }));
      for (const [i, code] of Object.entries(MAP)) { const e = edge(+i); if (e) key(code, e > 0); }
      const rt = edge(7), lt = edge(6); if (rt) mouse(rt > 0 ? 'mousedown' : 'mouseup', 0); if (lt) mouse(lt > 0 ? 'mousedown' : 'mouseup', 2);
    } };
}
