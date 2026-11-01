import { test, expect, type Page } from '@playwright/test';
import { withPlayer, errors, settle } from './helpers';

test.beforeEach(async ({ page }) => { await withPlayer(page); });
async function start(page: Page) { await page.goto('./'); await page.click('#h-new'); await expect(page.locator('#b-go')).toBeVisible(); await page.click('#b-go'); }
async function tapAssignAll(page: Page) {
  for (let i = 0; i < 8; i++) { const t = page.locator('.tk').first(); if (!(await t.count())) break; await t.click(); await page.locator('.row.can .tl').first().click(); }
}
async function playToClose(page: Page) {
  for (let i = 0; i < 80; i++) {
    if (await page.locator('#c-next').isVisible()) return;
    if (await page.locator('.choice').first().isVisible()) { await page.locator('.choice').first().click(); continue; }
    if (await page.locator('#mg-auto').isVisible()) { await page.click('#mg-auto'); await page.waitForTimeout(200); continue; }
    if (await page.locator('#w-go').isVisible()) { await page.click('#w-go'); continue; }
    if (await page.locator('#p-go').isVisible()) { await page.click('#p-go'); continue; }
    // while skipping, the button is re-rendered every step (never "stable"): only press it when it is off, and never wait on it
    const sk = page.locator('#r-skip'); if (await sk.isVisible() && (await sk.getAttribute('aria-pressed')) !== 'true') await sk.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  throw new Error('day did not close');
}

test('home: title, team, no ads, no install UI, OSM credit', async ({ page }) => {
  const e = errors(page); await page.goto('./');
  await expect(page.locator('h1.title')).toContainText('Capy'); await expect(page.locator('#h-new')).toBeVisible();
  await expect(page.getByText(/installer|install app|ajouter à l'écran/i)).toHaveCount(0);
  await page.click('#h-cred'); await expect(page.locator('#card')).toContainText('OpenStreetMap'); await expect(page.locator('#card')).toContainText(/parodie/i);
  expect(e).toEqual([]);
});

test('day 1: briefing with 3 objectives, tap-to-assign, launch, x2, skip, close with stars', async ({ page }) => {
  test.slow(); // a whole day played through the UI: ~20 s alone, more when the 4 workers share the CPU
  const e = errors(page); await page.goto('./'); await page.click('#h-new');
  await expect(page.locator('.objs li')).toHaveCount(3); await page.click('#b-go');
  await expect(page.locator('.osm')).toContainText("les contributeurs d'OpenStreetMap");
  await expect(page.locator('.tk')).toHaveCount(7);
  await page.click('#t-y'); await expect(page.locator('.explain')).toContainText('Sur 100 litres'); await expect(page.locator('.explain')).toContainText('Le contrat demande 80'); await page.click('#x-ok');
  await page.click('#t-sat'); await expect(page.locator('.explain')).toContainText('Le but : finir la journée'); await page.click('#x-ok');
  await page.locator('.tk').first().click(); await expect(page.locator('.row.can').first()).toBeVisible(); await page.locator('.row.can .tl').first().click(); await expect(page.locator('.tk')).toHaveCount(6);
  await tapAssignAll(page); await expect(page.locator('.tk')).toHaveCount(0); await expect(page.locator('.blk.q')).toHaveCount(7);
  await page.click('#p-go'); await expect(page.locator('#r-x2')).toBeVisible();
  await page.click('#r-x2'); await expect(page.locator('#r-x2')).toHaveClass(/on/);
  await page.locator('#r-skip').click({ timeout: 3000 }).catch(() => {}); await playToClose(page);
  await expect(page.locator('.stars .st')).toHaveCount(3); await expect(page.locator('#card')).toContainText('On range les fourgons'); await page.click('#c-y'); await expect(page.locator('.explain')).toContainText('Aujourd’hui'); await page.click('#x-back'); await expect(page.locator('#card')).toContainText('On range les fourgons'); await page.click('#c-more'); await expect(page.locator('#c-det')).toContainText('tickets traités');
  await page.click('#c-next'); await expect(page.locator('#b-go')).toBeVisible(); await expect(page.locator('#card')).toContainText('Jour 2');
  expect(e).toEqual([]);
});

test('drag & drop a ticket onto a capy row', async ({ page }) => {
  await start(page); const t = page.locator('.tk').first(); const tb = (await t.boundingBox())!;
  const cls = await t.getAttribute('data-t'); expect(cls).toBeTruthy();
  const row = page.locator('.row .tl').nth(1); const rb = (await row.boundingBox())!;
  await page.mouse.move(tb.x + 20, tb.y + 20); await page.mouse.down(); await page.mouse.move(tb.x + 30, tb.y - 10, { steps: 3 });
  await page.mouse.move(rb.x + 40, rb.y + rb.height / 2, { steps: 8 });
  await expect(page.locator('.gh.best')).toHaveCount(1); await expect(page.locator('.nojob').first()).toContainText('Pas son métier');
  await page.mouse.up(); await expect(page.locator('.gh')).toHaveCount(0);
  // day 1, first ticket = PRC: Fred (row 2) is the PRC capy
  const placed = await page.locator(`.blk.q[data-b="${cls}"]`).count(); const back = await page.locator(`.tk[data-t="${cls}"]`).count();
  expect(placed).toBe(1); expect(back).toBe(0);
});

test('tap a ticket: a ghost per capy, the fastest in green, « Qui y va ? », tap the ghost to place it', async ({ page }) => {
  await start(page); const n = await page.locator('.tk').count(); await page.locator('.tk').first().click();
  await expect(page.locator('.gh.best')).toHaveCount(1); await expect(page.locator('.whogo')).toContainText('Qui y va ?');
  await expect(page.locator('.tray.solo .tk')).toHaveCount(1); await page.locator('.gh.best').click();
  await expect(page.locator('.gh')).toHaveCount(0); await expect(page.locator('.tk')).toHaveCount(n - 1); await expect(page.locator('.blk.q')).toHaveCount(1);
  await page.locator('.tk').first().click(); await page.click('#wg-x'); await expect(page.locator('.tk')).toHaveCount(n - 1);
});

test('the save survives a reload and keys are namespaced', async ({ page }) => {
  await start(page); await tapAssignAll(page); await page.waitForTimeout(300); await page.reload();
  await expect(page.locator('#h-cont')).toBeVisible(); const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0); for (const k of keys) expect(k.startsWith('capy-dispatch-')).toBe(true);
  await page.click('#h-cont'); await expect(page.locator('.blk.q')).toHaveCount(7);
});

test('CSP meta is present and the service worker caches are namespaced', async ({ page }) => {
  await page.goto('./'); const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  const sw = await (await page.request.get('./sw.js')).text(); expect(sw).toContain("P='capy-dispatch-'");
});

test('short landscape (Safari toolbars): the ticket tray and launch button stay on screen, rows scroll', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 330 }); await start(page);
  for (const [w, h] of [[844, 330], [667, 320], [932, 370]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ H: innerHeight, tks: [...document.querySelectorAll('.tk')].map((t) => t.getBoundingClientRect().bottom), go: document.querySelector('#p-go')!.getBoundingClientRect().bottom }));
    expect(r.tks.length).toBeGreaterThan(0); for (const b of r.tks) expect(b).toBeLessThanOrEqual(r.H + 1); expect(r.go).toBeLessThanOrEqual(r.H + 1);
    const last = page.locator('.tk').last(); await last.scrollIntoViewIfNeeded(); const bb = (await last.boundingBox())!; expect(bb.x + bb.width).toBeLessThanOrEqual(w + 1); expect(bb.y + bb.height).toBeLessThanOrEqual(h + 1);
  }
  const t = page.locator('.tk').last(); await t.scrollIntoViewIfNeeded(); await t.click(); await expect(t).toHaveClass(/sel/); await page.locator('.row.can .tl').first().click(); await expect(page.locator('.blk').first()).toBeVisible();
});

test('coup de pouce: from day 2, only after 90 s of planning, places one ticket once', async ({ page }) => {
  test.slow(); await page.clock.install();
  await start(page); await tapAssignAll(page); await page.click('#p-go'); await page.locator('#r-skip').click({ timeout: 3000 }).catch(() => {}); await playToClose(page);
  await page.click('#c-next'); await page.click('#b-go'); await expect(page.locator('.tk').first()).toBeVisible();
  await expect(page.locator('#p-nudge')).toHaveCount(0);
  await page.clock.fastForward(91_000); await expect(page.locator('#p-nudge')).toBeVisible();
  const n = await page.locator('.tk').count(); await page.click('#p-nudge');
  await expect(page.locator('.tk')).toHaveCount(n - 1); await expect(page.locator('#p-nudge')).toHaveCount(0);
  await page.clock.fastForward(91_000); await expect(page.locator('#p-nudge')).toHaveCount(0);
});

test('end-of-day film: plays after the day, skippable, replayable, and the close card says what to rewind', async ({ page }) => {
  test.slow(); const e = errors(page); await start(page); await tapAssignAll(page); await page.click('#p-go');
  // play until the film starts (it runs before the close card)
  for (let i = 0; i < 120 && !(await page.locator('.rp-ban').isVisible()); i++) {
    if (await page.locator('.choice').first().isVisible()) await page.locator('.choice').first().click();
    else if (await page.locator('#mg-auto').isVisible()) await page.click('#mg-auto');
    else { const sk = page.locator('#r-skip'); if (await sk.isVisible() && (await sk.getAttribute('aria-pressed')) !== 'true') await sk.click({ timeout: 1500 }).catch(() => {}); }
    await page.waitForTimeout(200); }
  await expect(page.locator('.rp-ban')).toBeVisible(); await expect(page.locator('.rp-sw').first()).toBeAttached();
  await page.click('#rp-skip'); await expect(page.locator('#card')).toContainText('On range les fourgons'); await expect(page.locator('.rp-sw')).toHaveCount(0);
  await expect(page.locator('#c-fix')).toContainText(/Journée parfaite|Si c’était à refaire|pas mieux/);
  await page.click('#c-film'); await expect(page.locator('.rp-ban')).toBeVisible(); await page.click('#rp-skip'); await expect(page.locator('#c-next')).toBeVisible();
  expect(e).toEqual([]);
});

test('polish: pressed look on tap, Vibrations setting saved, map drag commits the view without re-rendering mid-gesture', async ({ page }) => {
  const e = errors(page); await start(page);
  const t = page.locator('.tk').first(); const bb = (await t.boundingBox())!;
  await page.mouse.move(bb.x + 20, bb.y + 10); await page.mouse.down(); await expect(t).toHaveClass(/prs/); await page.mouse.up(); await expect(t).not.toHaveClass(/prs/);
  await page.evaluate(() => (window as unknown as { __capy: { ui: { settings: () => void } } }).__capy.ui.settings()); await expect(page.locator('#s-hap')).toBeChecked();
  await page.locator('label.tg', { hasText: 'Vibrations' }).click(); await expect(page.locator('#s-hap')).not.toBeChecked();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('capy-dispatch-v1')!).settings.haptics)).toBe(false); await page.click('#s-ok');
  if (!(await page.locator('.map-svg').isVisible())) await page.click('#t-map');
  await settle(page); await page.waitForTimeout(200); // the drawer has stopped resizing the map (a resize commits the view)
  const m = await page.evaluate(async () => { const s = document.querySelector('.map-svg') as SVGSVGElement; const r = s.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const vb0 = s.getAttribute('viewBox'); const pins0 = document.querySelector('.map-top .pins')!.firstElementChild;
    const ev = (t: string, dx: number) => s.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: x - dx, clientY: y, bubbles: true, isPrimary: true }));
    ev('pointerdown', 0); for (let i = 1; i <= 6; i++) ev('pointermove', i * 10); await new Promise((f) => requestAnimationFrame(f)); // one frame (a slow frame > 140 ms would count as a finger pause and commit)
    const mid = { vb: s.getAttribute('viewBox'), tf: s.style.transform, samePins: document.querySelector('.map-top .pins')!.firstElementChild === pins0 }; ev('pointerup', 60); await new Promise((f) => requestAnimationFrame(f));
    return { vb0, mid, vb1: s.getAttribute('viewBox'), tf1: s.style.transform, samePins: document.querySelector('.map-top .pins')!.firstElementChild === pins0 }; });
  expect(m.mid.vb).toBe(m.vb0); expect(m.mid.tf).toContain('translate(-'); expect(m.mid.samePins).toBe(true);
  expect(m.vb1).not.toBe(m.vb0); expect(m.tf1).toBe(''); expect(m.samePins).toBe(true); // a pan keeps the pins (map units), only the viewBox moved
  // a pinch: the map grows under the fingers, the pins keep their size on screen (they used to swell until the fingers lifted)
  const z = await page.evaluate(async () => { const s = document.querySelector('.map-svg') as SVGSVGElement; const r = s.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const pin = () => (document.querySelector('.map-top [data-pin] path') as SVGPathElement).getBoundingClientRect().width; const w0 = pin(); const raf = () => new Promise((f) => requestAnimationFrame(f));
    const ev = (t: string, id: number, dx: number) => s.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x + dx, clientY: y, bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, -40); ev('pointerdown', 2, 40); for (let i = 1; i <= 6; i++) { ev('pointermove', 1, -40 - i * 12); ev('pointermove', 2, 40 + i * 12); await raf(); }
    const mid = { w: pin(), tf: s.style.transform }; ev('pointerup', 1, -112); ev('pointerup', 2, 112); await raf(); return { w0, mid, w1: pin() }; });
  expect(z.mid.tf).toContain('scale('); expect(Math.abs(z.mid.w - z.w0)).toBeLessThan(z.w0 * 0.05); expect(Math.abs(z.w1 - z.w0)).toBeLessThan(z.w0 * 0.05);
  expect(e).toEqual([]);
});

test('permanent notebook: own key, survives a new fortnight, three pages', async ({ page }) => {
  const e = errors(page); await start(page);
  await page.evaluate(() => { localStorage.setItem('capy-dispatch-v1-carnet', JSON.stringify({ v: 1, got: { 'vip-maire': '2026-10-30', 'sai-orage': '2026-10-30' } })); }); await page.reload();
  await page.evaluate(() => (window as unknown as { __capy: { ui: { home: () => void } } }).__capy.ui.home());
  await expect(page.locator('#h-nb')).toContainText('Carnet 2/22');
  page.on('dialog', (d) => d.accept()); await page.click('#h-new'); const ok = page.locator('.ov button.primary'); if (await ok.isVisible().catch(() => false)) await ok.click();
  await page.evaluate(() => (window as unknown as { __capy: { ui: { home: () => void } } }).__capy.ui.home());
  await page.click('#h-nb'); await expect(page.locator('.nb-page .cn.got')).toHaveCount(1); await page.click('[data-pg="2"]');
  await expect(page.locator('.cn-sea')).toHaveCount(4); await expect(page.locator('.cn.saison.got')).toContainText('Après l’orage');
  expect(e).toEqual([]);
});

test('Tournée du jour: one ranked attempt, spoiler-free share text, 7 days, the campaign untouched', async ({ page }) => {
  const e = errors(page); await start(page); const camp = await page.evaluate(() => localStorage.getItem('capy-dispatch-v1'));
  await page.evaluate(() => (window as unknown as { __capy: { ui: { home: () => void } } }).__capy.ui.home()); await page.click('#h-daily');
  await expect(page.locator('.d-days .d-day')).toHaveCount(7); await expect(page.locator('.d-objs li')).toHaveCount(3); await expect(page.locator('.d-facts')).toContainText('3 ★ prouvées');
  expect(await page.locator('.daily').innerText()).not.toMatch(/d’affilée|série de|streak|flamme/i); // no streak, anywhere
  await page.click('#d-play'); await expect(page.locator('#card')).toContainText('Tournée du'); await page.click('#b-go');
  await tapAssignAll(page); await page.click('#p-go'); await page.locator('#r-skip').click({ timeout: 3000 }).catch(() => {}); await playToClose(page);
  await expect(page.locator('#c-next')).toContainText('Retour à la tournée'); await page.click('#c-next');
  const txt = (await page.locator('#d-txt').textContent())!; expect(txt).toMatch(/^Capy Dispatch · Tournée du .+\n[★☆]{3} · rendement/); expect(txt.split('\n')).toHaveLength(7);
  await expect(page.locator('.d-rank')).toContainText('Partie classée'); await expect(page.locator('#d-play')).toContainText('essai libre');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('capy-dispatch-v1-daily')!)); expect(Object.keys(st.res)).toHaveLength(1);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('capy-dispatch-v1'))!).game.seed).toBe(JSON.parse(camp!).game.seed); // the campaign was not overwritten
  await page.click('#d-run'); await expect(page.locator('.t-day')).toContainText('Jour 1/10');
  expect(e).toEqual([]);
});
