// Renders app icons, favicon and social share image from the game's own SVG art (no external assets).
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5198, hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'silent' }); await server.listen();
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
const pg = await b.newPage();
await pg.goto('http://localhost:5198/'); await pg.evaluate(() => document.fonts.ready);
async function render(out, w, h, html, type = 'png') {
  await pg.setViewportSize({ width: w, height: h });
  await pg.evaluate(async (html) => {
    const a = await import('/src/art.ts');
    document.body.innerHTML = html.replace(/CAPY\(([a-z]+)\)/g, (_, id) => a.who(id, 'x')).replace(/HEAD\(([a-z]+)\)/g, (_, id) => a.who(id, 'x').replace(/viewBox="[^"]+"/, 'viewBox="10 0 100 100"')).replace('LOGO', a.logoLDR(64));
    document.body.style.margin = '0'; document.body.style.background = 'transparent';
    document.querySelectorAll('svg.x').forEach((s) => { s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; });
  }, html);
  await pg.waitForTimeout(150); await pg.screenshot({ path: out, omitBackground: type === 'png', type, ...(type === 'jpeg' ? { quality: 88 } : {}) });
}
const bg = 'radial-gradient(circle at 50% 30%,#E7F4FB 0,#A9D6F7 55%,#77B7FC 100%)';
const icon = (s, full) => `<div style="width:${s}px;height:${s}px;background:${bg};border-radius:${full ? 0 : s * 0.22}px;display:grid;place-items:center;overflow:hidden"><div style="width:${s * 0.92}px;margin-top:${s * 0.1}px">HEAD(momo)</div></div>`;
await render('public/icons/icon-192.png', 192, 192, icon(192));
await render('public/icons/icon-512.png', 512, 512, icon(512));
await render('public/icons/apple-touch-icon.png', 180, 180, icon(180, true));
await render('public/icons/favicon-32.png', 32, 32, `<div style="width:32px;height:32px;display:grid;place-items:center"><div style="width:34px">HEAD(momo)</div></div>`);
// Share image: the AI key art (art-src/, see LICENSES.md) + title + « Jouer » pill. No tagline, by design.
await render('public/og-image.jpg', 1200, 630, `<div style="position:relative;width:1200px;height:630px;overflow:hidden;font-family:Fredoka,sans-serif;background:#BFE3F5">
 <img src="/art-src/home-keyart-gen.jpg" style="position:absolute;left:-60px;top:-45px;width:1320px;height:742px;object-fit:cover">
 <div style="position:absolute;inset:0;background:linear-gradient(90deg,#FFF8ECf0 0,#FFF8ECd8 30%,#FFF8EC55 48%,#FFF8EC00 60%)"></div>
 <div style="position:absolute;left:70px;top:120px;display:flex;flex-direction:column;align-items:flex-start;gap:44px">
  <div style="font-weight:700;font-size:136px;line-height:.98;color:#fff;-webkit-text-stroke:22px #030F40;paint-order:stroke fill;text-shadow:0 11px 0 #030F40">Capy<br><span style="color:#A2C617">Dispatch</span></div>
  <div style="display:flex;align-items:center;gap:18px;background:#A2C617;color:#030F40;font-weight:700;font-size:48px;padding:14px 46px 14px 36px;border-radius:999px;box-shadow:0 8px 0 #7A960C,0 14px 30px #0003"><svg width="40" height="40" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="#030F40" stroke="#030F40" stroke-width="2" stroke-linejoin="round"/></svg>Jouer</div></div></div>`, 'jpeg');
await b.close(); await server.close(); console.log('icons ok');
