// Dev helper for the UI audit: shoots every screen at several phone sizes into previews/audit/<PASS>/<w>x<h>/.
// Usage: PASS=p1 SIZES=844x390,932x430,667x375 node scripts/audit.mjs
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
const PASS = process.env.PASS || 'p1';
const SIZES = (process.env.SIZES || '844x390,932x430,667x375').split(',').map((s) => s.split('x').map(Number));
const PORT = Number(process.env.PORT || 5195);
const server = await createServer({ root: process.env.ROOT || process.cwd(), server: { port: PORT, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'silent' }); await server.listen();
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
const errs = [];
for (const [w, h] of SIZES) {
  const dir = `${process.env.OUT || '.'}/previews/audit/${PASS}/${w}x${h}`; mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(`${w}x${h} ${e}`)); pg.on('console', (m) => m.type() === 'error' && errs.push(`${w}x${h} ${m.text()}`));
  const shot = async (n, ms = 450) => { await pg.waitForTimeout(ms); await pg.screenshot({ path: `${dir}/${n}.png` }); };
  const base = `http://localhost:${PORT}/`;
  await pg.goto(base); await pg.evaluate(() => document.fonts.ready);
  if (await pg.locator('#cr-in').count()) {
    await shot('00-creation-vide', 900);
    await pg.fill('#cr-in', 'Camille'); await pg.click('[data-sex=femme]'); await pg.click('[data-k=acc] [data-v=lavande]'); await pg.click('[data-k=outfit] [data-v=vert]');
    await shot('00b-creation-remplie', 300); await pg.click('#cr-ok');
  }
  await shot('01-accueil', 900);
  await pg.click('#h-new'); await shot('02-briefing-j1', 700);
  await pg.click('#b-go'); await shot('03-planning-vide-coach');
  await pg.locator('.tk').first().tap(); await shot('04-ticket-choisi');
  for (let i = 0; i < 6; i++) { const t = pg.locator('.tk').first(); if (!(await t.count())) break; if (!(await t.evaluate((e) => e.classList.contains('sel')))) await t.tap(); await pg.locator('.row.can .tl').first().tap(); await pg.waitForTimeout(120); }
  await shot('05-planning-plein');
  const first = await pg.locator('.blk.q').first().getAttribute('data-b');
  await pg.evaluate((id) => window.__capy.ui.blockMenu(id), first); await shot('06-menu-bloc', 250);
  await pg.mouse.click(5, h - 5); await pg.evaluate((id) => window.__capy.ui.detail(id), first); await shot('07-fiche-ticket');
  await pg.evaluate(() => { document.querySelector('#ov').classList.remove('show'); window.__capy.ui.objectives(); }); await shot('08-objectifs');
  await pg.evaluate(() => document.querySelector('#ov').classList.remove('show'));
  await pg.click('#p-go'); await pg.waitForTimeout(2600); await shot('09-tournee-j1', 0);
  // busy day 7 (index 6): bot-played days, then a partly planned day
  await pg.evaluate(() => window.__capy.ui.stop());
  await pg.evaluate(async () => { const G = await import('/src/game.ts'); const bot = await import('/tests/bot.ts'); const st = await import('/src/storage.ts');
    const g = G.newGame(2026); G.startDay(g); for (let i = 0; i < 6; i++) { bot.playDay(g); G.nextDay(g); } const s = st.defaults(); s.game = g; s.seenTuto = true; s.player = JSON.parse(localStorage.getItem('capy-dispatch-v1') || '{}').player ?? null; st.save(s); });
  await pg.reload(); await pg.evaluate(() => document.fonts.ready);
  await shot('10-accueil-continuer', 700);
  await pg.click('#h-cont'); await shot('11-briefing-j7', 700);
  await pg.click('#b-go');
  await pg.evaluate(async () => { const bot = await import('/tests/bot.ts'); const G = await import('/src/game.ts'); const g = window.__capy.state(); bot.plan(g, false); const q = g.today.plan.lulu; if (q.length) G.unassign(g, q[q.length - 1]); const m = g.today.plan.momo; if (m.length) G.unassign(g, m[m.length - 1]); window.__capy.render(); });
  await pg.locator('.tk').first().tap(); await shot('12-planning-j7-charge');
  await pg.evaluate(() => window.__capy.ui.showWarnings(true)); await shot('13-alertes');
  await pg.evaluate(async () => { document.querySelector('#ov').classList.remove('show'); const G = await import('/src/game.ts'); const g = window.__capy.state(); for (const id of Object.values(g.today.plan).flat()) if (g.tickets[id].gas === false && (await import('/src/content.ts')).JOBS[g.tickets[id].job].dig) g.tickets[id].gas = true; G.launch(g); window.__capy.speed(1); window.__capy.ui.enterGame(); });
  await pg.waitForTimeout(3200); await shot('14-tournee-j7', 0);
  await pg.evaluate(() => { window.__capy.ui.stop(); const g = window.__capy.state(); g.today.pending = [{ card: 'prefet', kind: 'event', capy: null, ticket: null }]; window.__capy.ui.showPending(); }); await shot('15-carte-evenement');
  await pg.evaluate(() => { const g = window.__capy.state(); const id = Object.keys(g.tickets).find((k) => g.tickets[k].risks.includes('chien')) ?? Object.keys(g.tickets)[0]; g.today.pending = [{ card: 'chien', kind: 'risk', capy: 'momo', ticket: id }]; window.__capy.ui.showPending(); }); await shot('16-carte-risque');
  await pg.evaluate(() => { const g = window.__capy.state(); const id = Object.keys(g.tickets).find((k) => g.tickets[k].job === 'fuite_bt') ?? Object.keys(g.tickets)[0]; g.today.pending = [{ card: 'safety', kind: 'safety', capy: 'lulu', ticket: id }]; window.__capy.ui.showPending(); }); await shot('17-carte-securite');
  await pg.evaluate(() => { const g = window.__capy.state(); g.today.pending = []; const id = Object.keys(g.tickets).find((k) => g.tickets[k].job === 'introuvable') ?? Object.keys(g.tickets)[0]; window.__capy.mini(id, 'momo'); }); await shot('18-mini-jeu');
  await pg.locator('.spot:not(.dim)').nth(1).tap().catch(() => {}); await shot('19-mini-jeu-rate', 300);
  await pg.evaluate(async () => { document.querySelector('#ov').classList.remove('show'); const bot = await import('/tests/bot.ts'); const G = await import('/src/game.ts'); const g = window.__capy.state(); g.today.pending = []; g.today.phase = 'plan'; bot.playDay(g); window.__capy.ui.closeScreen(); }); await shot('20-cloture', 1600);
  await pg.evaluate(async () => { const bot = await import('/tests/bot.ts'); const G = await import('/src/game.ts'); const g = window.__capy.state(); G.nextDay(g); while (!g.over) { bot.playDay(g); G.nextDay(g); } window.__capy.ui.bilan(); }); await shot('21-bilan', 900);
  await pg.evaluate(() => window.__capy.ui.settings()); await shot('22-reglages');
  if (await pg.locator('#s-me').count()) { await pg.click('#s-me'); await shot('23-creation-modif', 500); }
  await ctx.close();
}
// portrait gate
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const pg = await ctx.newPage(); await pg.goto(`http://localhost:${PORT}/`); await pg.waitForTimeout(800); mkdirSync(`${process.env.OUT || '.'}/previews/audit/${PASS}`, { recursive: true }); await pg.screenshot({ path: `${process.env.OUT || '.'}/previews/audit/${PASS}/portrait.png` });
console.log('errors', errs); await b.close(); await server.close();
