// Dev helper: plays the 10 days through the real UI (bot planning, UI cards, mini-games by tapping), reports errors and stars.
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5196 }, logLevel: 'silent' }); await server.listen();
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
const pg = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:5196/'); await pg.click('#h-new');
const botPlan = () => pg.evaluate(async () => { const bot = await import('/tests/bot.ts'); bot.plan(window.__capy.state()); window.__capy.render(); });
let shots = 0; const seen = new Set();
for (let day = 0; day < 10; day++) {
  await pg.click('#b-go'); await botPlan(); await pg.click('#p-go'); if (await pg.locator('#w-go').isVisible()) await pg.click('#w-go');
  for (let i = 0; i < 300; i++) {
    if (await pg.locator('#c-next').isVisible()) break;
    const ch = pg.locator('.choice'); if (await ch.first().isVisible()) { const title = await pg.locator('.e-body h2').textContent(); if (!seen.has(title)) { seen.add(title); if (shots < 4) await pg.screenshot({ path: `previews/pt-card-${shots++}.png` }); } await ch.nth(i % (await ch.count())).click(); continue; }
    if (await pg.locator('#mg-auto').isVisible()) { if (!seen.has('mini')) { seen.add('mini'); await pg.waitForTimeout(400); await pg.screenshot({ path: 'previews/pt-facade.png' }); } const sp = pg.locator('.spot:not(.dim):not([disabled])'); if (day % 2) await pg.click('#mg-auto'); else { await sp.first().click(); await pg.waitForTimeout(100); if (await pg.locator('#mg-auto').isVisible()) await pg.click('#mg-auto'); } await pg.waitForTimeout(1700); continue; }
    if (await pg.locator('#ov.show').isVisible() && !(await pg.locator('#d-ok').isVisible()) && !(await pg.locator('#card .choice, #card .spot, #c-next').count())) { const btn = pg.locator('#card .btn.primary, #card #w-go, #card .btn').last(); console.log('modal:', (await pg.locator('#card').innerText()).slice(0, 160).replace(/\n/g, ' / ')); await pg.screenshot({ path: 'previews/pt-modal.png' }); await btn.click(); continue; }
    if (await pg.locator('#p-go').isVisible() && !(await pg.locator('#ov.show').count())) { await botPlan(); try { await pg.click('#p-go', { timeout: 3000 }); } catch { console.log('stuck modal:', (await pg.locator('#card').innerText()).slice(0, 300).replace(/\n/g, ' / ')); await pg.screenshot({ path: 'previews/pt-stuck.png' }); continue; } if (await pg.locator('#w-go').isVisible()) await pg.click('#w-go'); continue; }
    if (await pg.locator('#d-ok').isVisible()) await pg.click('#d-ok');
    if (await pg.locator('#r-skip').isVisible()) await pg.click('#r-skip');
    await pg.waitForTimeout(150);
  }
  const st = await pg.locator('.stars .st svg').evaluateAll((a) => a.map((s) => s.innerHTML.includes('F5B82E') ? 1 : 0).reduce((x, y) => x + y, 0));
  console.log('day', day + 1, 'stars', st); await pg.click('#c-next'); await pg.waitForTimeout(300);
}
await pg.screenshot({ path: 'previews/pt-bilan.png' }); console.log('cards seen', [...seen].join(' | ')); console.log('errors', errs);
await b.close(); await server.close();
