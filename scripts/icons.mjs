// Renders app icons, favicon and social share image from the game's own SVG art (no external assets).
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5198 }, logLevel: 'silent' }); await server.listen();
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
await render('public/og-image.jpg', 1200, 630, `<div style="position:relative;width:1200px;height:630px;overflow:hidden;font-family:Fredoka,sans-serif;background:radial-gradient(90% 120% at 80% 60%,#FFF3D9 0,#FBE7C2 40%,#CFE9F5 75%)">
 <div style="position:absolute;left:70px;top:150px"><div style="font-weight:700;font-size:150px;line-height:1;color:#fff;-webkit-text-stroke:22px #030F40;paint-order:stroke fill;text-shadow:0 11px 0 #030F40">Capy<br><span style="color:#A2C617">Dispatch</span></div>
 <div style="margin-top:30px;font-size:38px;font-weight:600;color:#030F40">Les fuites d'Avignon n'attendent pas.</div></div>
 <div style="position:absolute;right:20px;bottom:-10px;width:430px">CAPY(momo)</div></div>`, 'jpeg');
await b.close(); await server.close(); console.log('icons ok');
