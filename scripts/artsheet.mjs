// Dev helper: renders every character, player variant, van and icon on one page -> previews/art-sheet.png
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5193, strictPort: true, hmr: false }, logLevel: 'silent' }); await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
await pg.goto('http://localhost:5193/');
await pg.evaluate(async () => {
  const A = await import('/src/art.ts'); const F = await import('/src/facade.ts').catch(() => null);
  document.body.innerHTML = ''; document.body.style.cssText = 'background:#FFF6E6;margin:0;padding:16px;font-family:sans-serif';
  const row = (h) => { const d = document.createElement('div'); d.style.cssText = 'display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin-bottom:14px'; d.innerHTML = h; document.body.append(d); };
  const box = (s, w = 120) => `<div style="width:${w}px">${s}</div>`;
  row(['josette', 'momo', 'lulu', 'chef', 'kevin', 'chat', 'ours', 'capydindon'].map((w) => box(A.who(w))).join(''));
  const looks = [];
  for (const fur of Object.keys(A.FURS)) for (const acc of ['aucun', 'lunettes', 'noeud', 'meche', 'lavande']) looks.push({ fur, acc, outfit: Object.keys(A.PLAYER_WEAR)[looks.length % 4] });
  row(looks.map((l) => box(A.playerSvg(l), 84)).join(''));
  row(box(A.vanSvg('fourgon'), 300) + box(A.vanSvg('ludospace'), 260) + box(A.logoLDR(90), 90));
  row(Object.keys(A.ICONS).map((k) => box(A.ICONS[k], 44)).join(''));
  document.querySelectorAll('svg').forEach((s) => { if (!s.getAttribute('width')) s.style.width = '100%'; });
});
await pg.waitForTimeout(300);
await pg.screenshot({ path: process.argv[2] || 'previews/art-sheet.png', fullPage: true });
await b.close(); await server.close();
