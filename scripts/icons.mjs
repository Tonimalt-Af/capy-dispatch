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
    document.body.innerHTML = html.replace(/CAPY\(([a-z]+)\)/g, (_, id) => a.who(id, 'x')).replace(/HEAD\(([a-z]+)\)/g, (_, id) => a.who(id, 'x').replace(/viewBox="[^"]+"/, 'viewBox="10 0 100 100"')).replace('LOGO', a.logoLDR(64)).replace('VAN', a.vanSvg('fourgon', 'van'));
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
// Share image: the home key art (art-src/, see LICENSES.md), the home's van and crew (our own SVG capys: Josette, Fred, Lulu), title + « Jouer » pill. No tagline, by design.
const cap = (id, h, z = 0) => `<div style="height:${h}px;aspect-ratio:112/106;margin:0 -34px;position:relative;z-index:${z};filter:drop-shadow(0 6px 4px #5a371930)">CAPY(${id})</div>`;
await render('public/og-image.jpg', 1200, 630, `<div style="position:relative;width:1200px;height:630px;overflow:hidden;font-family:Fredoka,sans-serif;background:#BFE3F5">
 <img src="/art/home-keyart.webp" style="position:absolute;inset:0;width:1200px;height:630px;object-fit:cover;object-position:70% 60%">
 <div style="position:absolute;inset:0;background:linear-gradient(90deg,#FFF8ECf2 0,#FFF8ECdc 30%,#FFF8EC55 50%,#FFF8EC00 62%)"></div>
 <div style="position:absolute;right:-90px;bottom:150px;width:520px">VAN</div>
 <div style="position:absolute;right:30px;bottom:-6px;display:flex;align-items:flex-end">${cap('josette', 270)}${cap('momo', 285, 1)}${cap('lulu', 270)}</div>
 <div style="position:absolute;left:70px;top:110px;display:flex;flex-direction:column;align-items:flex-start;gap:44px">
  <div style="font-weight:700;font-size:136px;line-height:.98;color:#fff;-webkit-text-stroke:22px #030F40;paint-order:stroke fill;text-shadow:0 11px 0 #030F40"><span style="color:#A2C617">Capy</span><br>Dispatch</div>
  <div style="display:flex;align-items:center;gap:18px;background:#A2C617;color:#030F40;font-weight:700;font-size:48px;padding:14px 46px 14px 36px;border-radius:999px;box-shadow:0 8px 0 #7A960C,0 14px 30px #0003"><svg width="40" height="40" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="#030F40" stroke="#030F40" stroke-width="2" stroke-linejoin="round"/></svg>Jouer</div></div></div>`, 'jpeg');
await b.close(); await server.close(); console.log('icons ok');
