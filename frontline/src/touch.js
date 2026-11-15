import { tick } from './haptics.js';
// Frontline touch controls for phones and tablets: a move stick on the left, drag anywhere on the right to look,
// and a cluster of buttons that press the same keys as the keyboard, so the game logic is shared.
export const TOUCH = { on: false, f: 0, s: 0 };

const css = `
html,body{overflow:hidden!important;overscroll-behavior:none;max-width:100vw}
#tc{position:fixed;inset:0;z-index:40;pointer-events:none;display:none;-webkit-user-select:none;user-select:none;touch-action:none}
body.touch:not(.inmenu) #tc{display:block}
#tc .stick{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:22px;width:clamp(110px,30vmin,170px);height:clamp(110px,30vmin,170px);border-radius:50%;background:#ffffff14;border:2px solid #ffffff38;pointer-events:auto}
#tc .nub{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;background:#e8be60aa;border:2px solid #fff6}
#tc .look{position:absolute;left:40vw;right:0;top:0;bottom:0;pointer-events:auto}
#tc .btns{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:12px;width:clamp(170px,48vmin,250px);height:clamp(170px,48vmin,250px);pointer-events:none}
#tc button{position:absolute;pointer-events:auto;border-radius:50%;border:2px solid #ffffff55;background:#0c141ccc;color:#f2efe6;font:700 11px system-ui;letter-spacing:.06em;text-transform:uppercase;padding:0;touch-action:none}
#tc button.on{background:#e8be60;color:#111}
#tc button.fire{width:36%;height:36%;right:6%;bottom:6%;background:#b03a2ecc;font-size:13px}
#tc .top{position:absolute;right:max(14px,env(safe-area-inset-right));top:150px;display:flex;flex-direction:column;gap:8px;pointer-events:none}
#tc .top button{position:relative;width:52px;height:52px;font-size:10px}
@media (max-height:430px){#tc .top{top:auto;bottom:12px;right:calc(max(12px,env(safe-area-inset-right)) + clamp(170px,48vmin,250px) + 6px);flex-direction:column-reverse}}
body.touch #keys{display:none}
body.touch #ammo{bottom:auto;top:96px;right:auto;left:18px;transform:scale(.6);transform-origin:left top}
body.touch #map{width:110px;height:110px}
body.touch #calls{bottom:auto;top:66px;left:0;right:0;transform:none;justify-content:center;flex-wrap:wrap;zoom:.6;pointer-events:auto}
body.touch #bars{left:50%;bottom:8px;transform:translateX(-50%) scale(.75);transform-origin:50% 100%;width:220px}`;

// [label, key code, position as right%/bottom% inside the cluster, size %, hold?]
const PAD = [['Jump', 'Space', 44, 4, 24, true], ['Aim', 'AIM', 4, 44, 24, false], ['Reload', 'KeyR', 52, 32, 21, true], ['Dive', 'KeyF', 32, 54, 21], ['Run', 'ShiftLeft', 76, 6, 21, 'toggle'], ['Nade', 'KeyG', 14, 72, 21]];
const SIDE = [['Map', 'Tab'], ['Crouch', 'KeyC'], ['Use', 'KeyE'], ['Swap', 'KeyQ', true], ['Squad', 'ORDER'], ['Ready', 'Enter'], ['Melee', 'KeyB']];
const ORDERS = ['KeyZ', 'KeyX', 'KeyH', 'KeyV'];

export function createTouch(cv) {
  const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window; if (!coarse) return TOUCH;
  TOUCH.on = true; document.body.classList.add('touch'); { const vm = document.querySelector('meta[name=viewport]'); if (vm) vm.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'; }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'tc'; root.innerHTML = '<div class="look"></div><div class="stick"><div class="nub"></div></div><div class="btns"></div><div class="top"></div>'; document.body.appendChild(root);
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const mouse = (type, button) => (type === 'mousedown' ? cv : window).dispatchEvent(new MouseEvent(type, { button, bubbles: true }));
  const look = (dx, dy) => window.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: dy, bubbles: true }));
  const stop = e => { e.preventDefault(); e.stopPropagation(); };

  // move stick: an analogue vector the movement code adds to the keys
  const stick = root.querySelector('.stick'), nub = root.querySelector('.nub'); let sid = null;
  const moveStick = t => { const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = (t.clientX - cx) / R, dy = (t.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } TOUCH.s = Math.abs(dx) < 0.12 ? 0 : dx; TOUCH.f = Math.abs(dy) < 0.12 ? 0 : -dy; TOUCH.sprint = m > 1.15 && dy < -0.75; /* push the stick past its rim, forward, to sprint */ nub.style.transform = 'translate(' + dx * R * 0.6 + 'px,' + dy * R * 0.6 + 'px)'; };
  stick.addEventListener('touchstart', e => { stop(e); const t = e.changedTouches[0]; sid = t.identifier; moveStick(t); }, { passive: false });
  stick.addEventListener('touchmove', e => { stop(e); for (const t of e.changedTouches) if (t.identifier === sid) moveStick(t); }, { passive: false });
  const endStick = e => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; TOUCH.f = TOUCH.s = 0; TOUCH.sprint = false; nub.style.transform = ''; } };
  stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);

  // look: any drag on the right side of the screen (and on the fire button, so you can aim while shooting)
  const drags = {}; const lookStart = t => { drags[t.identifier] = [t.clientX, t.clientY]; };
  const lookMove = t => { const p = drags[t.identifier]; if (!p) return; look((t.clientX - p[0]) * 1.7, (t.clientY - p[1]) * 1.7); p[0] = t.clientX; p[1] = t.clientY; };
  const lookEnd = t => { delete drags[t.identifier]; };
  const area = root.querySelector('.look');
  area.addEventListener('touchstart', e => { stop(e); for (const t of e.changedTouches) lookStart(t); }, { passive: false });
  area.addEventListener('touchmove', e => { stop(e); for (const t of e.changedTouches) lookMove(t); }, { passive: false });
  area.addEventListener('touchend', e => { for (const t of e.changedTouches) lookEnd(t); }); area.addEventListener('touchcancel', e => { for (const t of e.changedTouches) lookEnd(t); });

  const pad = root.querySelector('.btns'), side = root.querySelector('.top'); let aimOn = false, runOn = false, order = 0;
  const fire = document.createElement('button'); fire.className = 'fire'; fire.textContent = 'Fire'; pad.appendChild(fire);
  fire.addEventListener('touchstart', e => { stop(e); tick(); fire.classList.add('on'); mouse('mousedown', 0); for (const t of e.changedTouches) lookStart(t); }, { passive: false });
  fire.addEventListener('touchmove', e => { stop(e); for (const t of e.changedTouches) lookMove(t); }, { passive: false });
  const fireEnd = e => { fire.classList.remove('on'); mouse('mouseup', 0); for (const t of e.changedTouches) lookEnd(t); }; fire.addEventListener('touchend', fireEnd); fire.addEventListener('touchcancel', fireEnd);
  const make = (parent, label, code, hold, place) => { const b = document.createElement('button'); b.textContent = label; if (place) { b.style.right = place[0] + '%'; b.style.bottom = place[1] + '%'; b.style.width = b.style.height = place[2] + '%'; } parent.appendChild(b);
    b.addEventListener('touchstart', e => { stop(e); tick();
      if (code === 'AIM') { aimOn = !aimOn; b.classList.toggle('on', aimOn); mouse(aimOn ? 'mousedown' : 'mouseup', 2); return; }
      if (code === 'ORDER') { order = (order + 1) % ORDERS.length; key(ORDERS[order], true); key(ORDERS[order], false); b.textContent = ['Follow', 'Hold', 'Defend', 'Auto'][order]; return; }
      if (hold === 'toggle') { runOn = !runOn; b.classList.toggle('on', runOn); key(code, runOn); return; }
      b.classList.add('on'); key(code, true); if (!hold) { key(code, false); setTimeout(() => b.classList.remove('on'), 120); } }, { passive: false });
    if (hold === true) { const up = e => { b.classList.remove('on'); key(code, false); }; b.addEventListener('touchend', up); b.addEventListener('touchcancel', up); } return b; };
  for (const p of PAD) make(pad, p[0], p[1], p[5], [p[2], p[3], p[4]]);
  for (const p of SIDE) make(side, p[0], p[1], p[2] || false);
  // the call-in bar becomes buttons: tap one to call it on the spot you are aiming at
  const calls = document.getElementById('calls'); if (calls) calls.addEventListener('touchstart', e => { const c = e.target.closest('.call'); if (!c) return; stop(e); const i = [].indexOf.call(calls.children, c); if (i >= 0 && i < 9) { key('Digit' + (i + 1), true); key('Digit' + (i + 1), false); } }, { passive: false });
  // stop the page itself from scrolling or zooming under a thumb
  document.addEventListener('touchmove', e => { if (!document.body.classList.contains('inmenu') && !e.target.closest('.panel')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  // a HUD line that runs wide can scroll the page sideways on a phone; keep it pinned
  setInterval(() => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); }, 500);
  return TOUCH; }
