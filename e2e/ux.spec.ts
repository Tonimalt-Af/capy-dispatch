import { test, expect, type Page } from '@playwright/test';
import { withPlayer, errors, smallTargets, overlaps } from './helpers';

const tinyText = (page: Page) => page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) && !e.closest('svg') && (e as HTMLElement).offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => `${e.tagName}.${e.getAttribute('class')} ${getComputedStyle(e).fontSize} «${e.textContent!.trim().slice(0, 24)}»`));
const INCLUSIVE = /[a-zà-ÿ][·•‧][a-zà-ÿ]|[a-zà-ÿ]\((?:e|es|rice|euse)\)|\biels?\b/i;
async function create(page: Page, name: string, sex: 'homme' | 'femme') {
  await page.fill('#cr-in', name); await page.click(`[data-sex=${sex}]`); await page.click('[data-k=fur] [data-v=miel]'); await page.click('[data-k=acc] [data-v=lunettes]');
  await expect(page.locator('#cr-ok')).toBeEnabled(); await page.click('#cr-ok');
}

test('first launch: character creation, then agreed copy and the name everywhere (as text)', async ({ page }) => {
  const e = errors(page); await page.goto('./');
  await expect(page.locator('#create.active')).toBeVisible(); await expect(page.locator('#cr-ok')).toBeDisabled();
  await page.fill('#cr-in', 'Zoé'); await expect(page.locator('#cr-ok')).toBeDisabled(); // sex still missing
  await page.fill('#cr-in', ''); await page.click('[data-sex=femme]'); await expect(page.locator('#cr-ok')).toBeDisabled(); // name missing
  await page.fill('#cr-in', '<img src=x onerror=alert(1)>'); expect((await page.inputValue('#cr-in')).length).toBeLessThanOrEqual(16);
  await page.fill('#cr-in', 'Zoé'); await expect(page.locator('#cr-name')).toHaveText('Zoé'); await expect(page.locator('#cr-title')).toHaveText('Nouvelle arrivante');
  await page.click('[data-k=head] [data-v=ronde]'); await expect(page.locator('[data-k=head] [data-v=ronde]')).toHaveAttribute('aria-checked', 'true'); await expect(page.locator('[data-k=head] [data-v=classique]')).toHaveAttribute('aria-checked', 'false');
  await page.click('[data-k=outfit] [data-v=combi]'); await expect(page.locator('[data-k=outfit] [data-v=combi]')).toHaveAttribute('aria-checked', 'true');
  await page.click('#cr-ok');
  await expect(page.locator('#h-me')).toContainText('Zoé'); await expect(page.locator('.pitch')).toContainText('Tout juste arrivée'); await expect(page.locator('#h-me')).not.toContainText(/ordonnanc/i); await expect(page.locator('.pitch')).not.toContainText(/ordonnanc/i); await expect(page.locator('#home')).not.toContainText(/sans pub|gratuit/i);
  await page.click('#h-new'); await expect(page.locator('.bubble')).toContainText("Bienvenue à l'agence, Zoé !"); await expect(page.locator('.duo .nt')).toHaveText('Zoé');
  await page.click('#b-go'); await expect(page.locator('.coach')).toContainText('Zoé'); await expect(page.locator('.t-day .av svg')).toHaveCount(1);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('capy-dispatch-v1')!).player); expect(save).toMatchObject({ name: 'Zoé', sex: 'femme', look: { outfit: 'combi', head: 'ronde' } });
  expect(await page.evaluate(() => document.body.innerText)).not.toMatch(INCLUSIVE);
  expect(e).toEqual([]);
});

test('a male player gets the masculine forms; the creation screen is not shown again', async ({ page }) => {
  await page.goto('./'); await create(page, 'Hugo', 'homme');
  await expect(page.locator('.pitch')).toContainText('Tout juste arrivé à'); await page.reload(); await expect(page.locator('#h-me')).toBeVisible(); await expect(page.locator('#create.active')).toHaveCount(0);
  await page.click('#h-new'); await expect(page.locator('.bubble')).toContainText("Bienvenu à l'agence, Hugo !");
});

test('a hostile name in a tampered save is rendered as plain text, never as markup', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('capy-dispatch-v1', JSON.stringify({ player: { name: 'Bob<img src=x onerror=window.__x=1>', sex: 'homme' } })));
  await page.goto('./'); await expect(page.locator('#h-me')).toBeVisible();
  expect(await page.locator('.pname img, #h-me img').count()).toBe(0); expect(await page.evaluate(() => (window as { __x?: number }).__x)).toBeUndefined();
  await expect(page.locator('#h-me b')).not.toContainText('<');
});

test('the character is editable later from the settings, and the save migrates once', async ({ page }) => {
  // a v0.1 save: no player, a game in progress
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('capy-dispatch-v1', JSON.stringify({ best: { stars: 4, yield: 0.7, runs: 1 }, seenTuto: true })); } });
  await page.goto('./'); await expect(page.locator('#create.active')).toBeVisible(); await create(page, 'Inès', 'femme');
  await page.click('#h-new'); await page.click('#b-go'); await page.click('#t-menu'); await page.click('#m-set');
  await expect(page.locator('#s-me')).toContainText('Inès'); await page.click('#s-me');
  await expect(page.locator('#cr-in')).toHaveValue('Inès'); await expect(page.locator('#cr-cancel')).toBeVisible();
  await page.fill('#cr-in', 'Inès-Lou'); await page.click('[data-sex=homme]'); await page.click('#cr-ok');
  await expect(page.locator('#game.active')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('capy-dispatch-v1')!).player.name)).toBe('Inès-Lou');
});

for (const [w, h] of [[844, 390], [667, 375], [932, 430], [667, 325], [844, 340]]) {
  test(`touch targets ≥ 44 px and no overlapping layout at ${w}×${h}`, async ({ page }) => {
    test.skip(!test.info().project.name.endsWith('landscape'), 'phone sizes only');
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./'); await page.evaluate(() => document.fonts.ready);
    expect(await smallTargets(page), 'creator').toEqual([]); expect(await tinyText(page), 'creator').toEqual([]); expect(await overlaps(page, ['.cr-prev', '.cr-form']), 'creator').toEqual([]);
    expect(await overlaps(page, ['.fld', '.cr-go']), 'creator rows').toEqual([]);
    await create(page, 'Camille', 'femme');
    expect(await smallTargets(page), 'home').toEqual([]); expect(await tinyText(page), 'home').toEqual([]); expect(await overlaps(page, ['.h-left', '.h-me']), 'home').toEqual([]);
    await page.click('#h-new'); expect(await smallTargets(page), 'briefing').toEqual([]); expect(await tinyText(page), 'briefing').toEqual([]); expect(await overlaps(page, ['#card']), 'briefing').toEqual([]);
    await page.click('#b-go'); await page.locator('.tk').first().click();
    expect(await smallTargets(page), 'planning').toEqual([]); expect(await tinyText(page), 'planning').toEqual([]);
    expect(await overlaps(page, ['.top', '.panel']), 'planning').toEqual([]);
    // Option A: full-width planning, the map is a drawer behind the « Carte » button; the tutorial never sits on the rows
    await expect(page.locator('.mapbox')).toBeHidden(); expect(await overlaps(page, ['.coach', '.scale', '.row', '.bottom']), 'coach').toEqual([]);
    await page.click('#t-map'); await expect(page.locator('.mapbox')).toBeVisible(); await expect(page.locator('#t-map')).toHaveAttribute('aria-expanded', 'true');
    expect(await smallTargets(page), 'map drawer').toEqual([]); expect(await overlaps(page, ['.mapbox']), 'map drawer').toEqual([]);
    await page.click('#m-close'); await expect(page.locator('.mapbox')).toBeHidden();
    expect(await overlaps(page, ['.t-day', '.t-obj', '.t-kpis', '#t-menu']), 'HUD').toEqual([]);
    expect(await overlaps(page, ['.row', '.bottom', '.scale']), 'panel').toEqual([]);
    expect(await overlaps(page, ['.tray', '.acts']), 'bottom bar').toEqual([]);
    for (let i = 0; i < 6; i++) { const t = page.locator('.tk').first(); if (!(await t.count())) break; if (!(await t.evaluate((x) => x.classList.contains('sel')))) await t.click(); await page.locator('.row.can .tl').first().click(); }
    await page.click('#p-go'); expect(await smallTargets(page), 'run').toEqual([]); expect(await tinyText(page), 'run').toEqual([]); expect(await overlaps(page, ['.feed', '.ctrl']), 'run').toEqual([]);
    // while the day runs: mini-map column beside the read-only planning, expandable
    await expect(page.locator('.mapbox')).toBeVisible(); expect(await overlaps(page, ['.mapbox', '.panel', '.top']), 'mini-map').toEqual([]);
    await page.click('#t-menu'); expect(await smallTargets(page), 'menu').toEqual([]); await page.click('#m-set'); expect(await smallTargets(page), 'settings').toEqual([]);
    expect(await tinyText(page), 'settings text').toEqual([]);
  });
}

test('Tournée du jour fits a short phone without scrolling, even with yesterday’s result card', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('landscape'), 'phone sizes only');
  await page.addInitScript(() => { const y = new Date(Date.now() - 864e5); const k = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    localStorage.setItem('capy-dispatch-v1', JSON.stringify({ player: { name: 'Camille', sex: 'femme', look: { fur: 'noisette', acc: 'lavande', outfit: 'veste' } } }));
    localStorage.setItem('capy-dispatch-v1-daily', JSON.stringify({ v: 1, res: { [k]: { stars: 2, met: [true, true, false], dy: 0.8, m3: 120, travel: 4, load: [1, 0.8, 0.6], tries: 2, best: 3 } }, cur: null })); });
  for (const [w, h] of [[667, 325], [844, 340], [667, 375], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h }); await page.goto('./'); await page.evaluate(() => document.fonts.ready); await page.click('#h-daily');
    await expect(page.locator('#d-share')).toBeVisible();
    const m = await page.locator('.daily').evaluate((d) => ({ sh: d.scrollHeight, ch: d.clientHeight }));
    expect(m.sh, `${w}×${h}`).toBeLessThanOrEqual(m.ch + 1); expect(await smallTargets(page), `${w}×${h}`).toEqual([]);
  }
});
