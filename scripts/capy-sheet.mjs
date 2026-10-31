// Renders the team and player capys large and small (art review sheet). Usage: OUT=path node scripts/capy-sheet.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const srv = await createServer({ server: { port: 5230, hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await srv.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5230/scripts/blank.html');
await p.evaluate(async () => {
  const a = await import('/src/art.ts');
  const looks = [{ fur: 'caramel', acc: 'aucun', outfit: 'marine' }, { fur: 'miel', acc: 'noeud', outfit: 'vert' }, { fur: 'noisette', acc: 'lavande', outfit: 'bleu' }];
  const big = [a.who('josette'), a.who('momo'), a.who('lulu'), ...looks.map((l) => a.playerSvg(l))];
  document.body.innerHTML = `<style>body{margin:0;background:#FFF6E8;font-family:sans-serif}.r{display:flex;gap:6px;padding:8px;align-items:end}.r svg{width:150px}.s svg{width:48px}.m svg{width:84px}</style>
  <div class="r">${big.join('')}</div><div class="r m">${big.join('')}</div><div class="r s">${big.join('')}</div>`;
});
await p.screenshot({ path: process.env.OUT, fullPage: true });
await b.close(); await srv.close();
