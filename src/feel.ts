// Touch feel (polish pass): a pressed look on every tappable thing, and light haptics.
// - Pressed: iOS Safari only shows :active when a touchstart listener exists, and a quick tap is often shorter than a
//   frame; so the closest tappable element gets a `.prs` class on pointerdown, kept at least 90 ms (CSS draws it).
// - Haptics: navigator.vibrate where it exists (Android). iOS has no Vibration API; since iOS 18, toggling a native
//   <input type=checkbox switch> gives a system haptic tick, so a hidden one is clicked inside the user's gesture.
//   Outside a gesture (timers) both are silently ignored by the browser. A setting turns it all off.
const TAP = 'button,a[href],[role=button],.tk,.blk,[data-pin],[data-mk],.spot,label.tg';
let on = true; let sw: HTMLLabelElement | null = null;
export function setHaptics(v: boolean) { on = v; }
export type Buzz = 'tap' | 'ok' | 'bad';
export function haptic(k: Buzz) {
  if (!on) return; const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === 'function') { try { nav.vibrate(k === 'bad' ? [18, 60, 18] : k === 'ok' ? 22 : 10); } catch { /* blocked */ } return; }
  if (!sw) { sw = document.createElement('label'); sw.setAttribute('aria-hidden', 'true'); sw.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1; sw.appendChild(i); document.body.appendChild(sw); }
  sw.click(); if (k === 'bad') setTimeout(() => sw?.click(), 90);
}
export function installPress() {
  addEventListener('touchstart', () => {}, { passive: true }); // enables :active on iOS
  let cur: Element | null = null; let t0 = 0; let x0 = 0, y0 = 0;
  const off = () => { const el = cur; if (!el) return; cur = null; const left = 90 - (performance.now() - t0); if (left > 0) setTimeout(() => el.classList.remove('prs'), left); else el.classList.remove('prs'); };
  addEventListener('pointerdown', (e) => { const el = (e.target as Element).closest?.(TAP); if (!el || (el as HTMLButtonElement).disabled) return; off(); cur = el; t0 = performance.now(); x0 = e.clientX; y0 = e.clientY; el.classList.add('prs'); }, { capture: true, passive: true });
  addEventListener('pointermove', (e) => { if (cur && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { cur.classList.remove('prs'); cur = null; } }, { capture: true, passive: true });
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, off, { capture: true, passive: true });
}
