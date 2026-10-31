// Dev helper: renders 844x390 previews of the main screens into previews/ (gitignored).
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
const pg = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; pg.on('console', (m) => m.type() === 'error' && errs.push(m.text())); pg.on('pageerror', (e) => errs.push(String(e)));
await pg.goto(base); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
const shot = (n) => pg.screenshot({ path: `previews/${n}.png` });
await shot('01-accueil');
await pg.click('#h-new'); await pg.waitForTimeout(700); await shot('02-briefing');
await pg.click('#b-go'); await pg.waitForTimeout(700); await shot('03-planning-vide');
// assign by tap: ticket then row
const tks = await pg.$$('.tk'); console.log('tickets', tks.length);
for (let i = 0; i < 6; i++) { const t = await pg.$('.tk'); if (!t) break; await t.tap(); await pg.waitForTimeout(150); const r = await pg.$('.row.can .tl'); if (!r) { console.log('no row'); break; } await r.tap(); await pg.waitForTimeout(200); }
await pg.waitForTimeout(400); await shot('04-planning');
await pg.click('#p-go'); await pg.waitForTimeout(400);
if (await pg.$('#w-go')) { await shot('04b-alertes'); await pg.click('#w-go'); }
await pg.waitForTimeout(2600); await shot('05-tournee');
for (let i = 0; i < 40; i++) {
  if (await pg.$('#c-next')) break;
  const c = await pg.$('.choice'); if (c) { await shot('06-carte-' + i); await c.click(); await pg.waitForTimeout(300); continue; }
  const sp = await pg.$('.spot:not(.dim):not([disabled])'); if (sp) { await shot('07-facade'); await pg.click('#mg-auto'); await pg.waitForTimeout(300); continue; }
  const sk = await pg.$('#r-skip'); if (sk) await sk.click(); else { const go = await pg.$('#p-go'); if (go) await go.click(); const wg = await pg.$('#w-go'); if (wg) await wg.click(); }
  await pg.waitForTimeout(600);
}
await pg.waitForTimeout(800); await shot('08-fin');
console.log('errors', errs); await b.close();
