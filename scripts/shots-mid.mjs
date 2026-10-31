// Dev helper: plays days 1-5 with the test bot (dev server), then shoots a busier planning and run at day 6.
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5197 }, logLevel: 'silent' }); await server.listen();
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
const pg = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
const day = +(process.env.DAY || 5);
await pg.goto('http://localhost:5197/'); await pg.evaluate(() => document.fonts.ready);
await pg.evaluate(async (day) => { const G = await import('/src/game.ts'); const bot = await import('/tests/bot.ts'); const st = await import('/src/storage.ts');
  const g = G.newGame(2026); G.startDay(g); for (let i = 0; i < day; i++) { bot.playDay(g); G.nextDay(g); }
  const s = st.defaults(); s.game = g; s.seenTuto = true; st.save(s); }, day);
await pg.reload(); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
await pg.click('#h-cont'); await pg.waitForTimeout(600); await pg.screenshot({ path: `previews/10-briefing-j${day + 1}.png` });
await pg.click('#b-go'); await pg.waitForTimeout(400);
await pg.evaluate(async () => { const bot = await import('/tests/bot.ts'); const w = window; const g = w.__capy.state(); bot.plan(g); const G = await import('/src/game.ts'); const tr = G.tray(g); if (tr.length > 1) G.unassign(g, g.today.plan.lulu[0] ?? ''); w.__capy.render(); });
await pg.waitForTimeout(300); const t = await pg.$('.tk'); if (t) await t.tap(); await pg.waitForTimeout(300);
await pg.screenshot({ path: `previews/11-planning-j${day + 1}.png` });
await pg.click('#p-go'); await pg.waitForTimeout(300); if (await pg.$('#w-go')) { await pg.screenshot({ path: `previews/12-alertes.png` }); await pg.click('#w-go'); }
for (let i = 0; i < 30; i++) { await pg.waitForTimeout(700); if (await pg.$('.choice')) { await pg.screenshot({ path: `previews/13-carte.png` }); break; } if (await pg.$('.spot')) { await pg.screenshot({ path: `previews/13-facade.png` }); break; } const sk = await pg.$('#r-skip'); if (sk && i > 2) await sk.click(); }
console.log('errors', errs); await b.close(); await server.close();
