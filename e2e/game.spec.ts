import { test, expect, type Page } from '@playwright/test';
import { withPlayer, errors } from './helpers';

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
    if (await page.locator('#r-skip').isVisible()) await page.click('#r-skip');
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
  const e = errors(page); await page.goto('./'); await page.click('#h-new');
  await expect(page.locator('.objs li')).toHaveCount(3); await page.click('#b-go');
  await expect(page.locator('.osm')).toContainText("les contributeurs d'OpenStreetMap");
  await expect(page.locator('.tk')).toHaveCount(3);
  await page.locator('.tk').first().click(); await expect(page.locator('.row.can').first()).toBeVisible(); await page.locator('.row.can .tl').first().click(); await expect(page.locator('.tk')).toHaveCount(2);
  await tapAssignAll(page); await expect(page.locator('.tk')).toHaveCount(0); await expect(page.locator('.blk.q')).toHaveCount(3);
  await page.click('#p-go'); await expect(page.locator('#r-x2')).toBeVisible();
  await page.click('#r-x2'); await expect(page.locator('#r-x2')).toHaveClass(/on/);
  await page.click('#r-skip'); await playToClose(page);
  await expect(page.locator('.stars .st')).toHaveCount(3); await expect(page.locator('#card')).toContainText('tickets traités');
  await page.click('#c-next'); await expect(page.locator('#b-go')).toBeVisible(); await expect(page.locator('#card')).toContainText('Jour 2');
  expect(e).toEqual([]);
});

test('drag & drop a ticket onto a capy row', async ({ page }) => {
  await start(page); const t = page.locator('.tk').first(); const tb = (await t.boundingBox())!;
  const cls = await t.getAttribute('data-t'); expect(cls).toBeTruthy();
  const row = page.locator('.row .tl').nth(1); const rb = (await row.boundingBox())!;
  await page.mouse.move(tb.x + 20, tb.y + 20); await page.mouse.down(); await page.mouse.move(tb.x + 30, tb.y - 10, { steps: 3 });
  await page.mouse.move(rb.x + 40, rb.y + rb.height / 2, { steps: 8 }); await page.mouse.up();
  // day 1, first ticket = PRC (ICC): Fred (row 2) is the ICC capy
  const placed = await page.locator(`.blk.q[data-b="${cls}"]`).count(); const back = await page.locator(`.tk[data-t="${cls}"]`).count();
  expect(placed).toBe(1); expect(back).toBe(0);
});

test('the save survives a reload and keys are namespaced', async ({ page }) => {
  await start(page); await tapAssignAll(page); await page.waitForTimeout(300); await page.reload();
  await expect(page.locator('#h-cont')).toBeVisible(); const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0); for (const k of keys) expect(k.startsWith('capy-dispatch-')).toBe(true);
  await page.click('#h-cont'); await expect(page.locator('.blk.q')).toHaveCount(3);
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
