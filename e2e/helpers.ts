import type { Page } from '@playwright/test';
/** Seeds a character (as if the creation screen was done) unless a save already exists. */
export async function withPlayer(page: Page, name = 'Camille', sex: 'homme' | 'femme' = 'femme') {
  await page.addInitScript(([n, s]) => { if (!localStorage.getItem('capy-dispatch-v1')) localStorage.setItem('capy-dispatch-v1', JSON.stringify({ player: { name: n, sex: s, look: { fur: 'noisette', acc: 'lavande', outfit: 'vert' } } })); }, [name, sex]);
}
export const errors = (page: Page) => { const e: string[] = []; page.on('pageerror', (x) => e.push(String(x))); page.on('console', (m) => { if (m.type() === 'error') e.push(m.text()); }); return e; };
/** Every visible interactive element must offer a ≥ 44×44 px hit area (its own box, or a ::after hit-area extension). */
export const settle = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
export const smallTargets = async (page: Page) => { await settle(page); return page.evaluate(() => {
  const out: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('button, input, [role=radio], [role=switch], a, summary, .mbtn')) {
    if (el.matches('.osm')) continue; // OSM attribution link: legal credit, also reachable from Crédits
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[hidden], .view:not(.active)') || (el.closest('.ov') && !el.closest('.ov.show'))) continue;
    let w = r.width, h = r.height; const a = getComputedStyle(el, '::after');
    if (a.content !== 'none' && a.position === 'absolute') { const n = (v: string) => (v.endsWith('px') ? -parseFloat(v) : 0); w += n(a.left) + n(a.right); h += n(a.top) + n(a.bottom); }
    if (el.matches('input[type=checkbox]')) { const l = el.closest('label'); if (l) { const lr = l.getBoundingClientRect(); w = Math.max(w, lr.width); h = Math.max(h, lr.height); } }
    if (w < 43.5 || h < 43.5) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} ${Math.round(w)}x${Math.round(h)} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}»`);
  }
  return out;
}); };
/** Pairs of the given selectors whose boxes overlap (by more than 1 px), plus anything outside the viewport. */
export const overlaps = async (page: Page, sels: string[]) => { await settle(page); return page.evaluate((sels) => {
  const out: string[] = []; const W = innerWidth, H = innerHeight;
  const boxes = sels.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length).map((e, i) => ({ s: `${s}[${i}]`, r: e.getBoundingClientRect() })));
  for (const b of boxes) if (b.r.left < -1 || b.r.top < -1 || b.r.right > W + 1 || b.r.bottom > H + 1) out.push(`${b.s} outside viewport`);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].r, b = boxes[j].r;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) out.push(`${boxes[i].s} × ${boxes[j].s}`); }
  if (document.documentElement.scrollWidth > W + 1) out.push('horizontal overflow');
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) out.push(`duplicate ids: ${dup.join(',')}`);
  return out;
}, sels); };
