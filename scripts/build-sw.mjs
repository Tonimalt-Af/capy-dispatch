// Post-build: writes dist/sw.js precaching every built file (offline play), versioned by content hash.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path'; import { createHash } from 'node:crypto';
const dist = 'dist'; const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(dist);
const list = files.map((f) => relative(dist, f)).filter((f) => f !== 'sw.js' && f !== 'art.html' && !/^og-image\./.test(f) && !/^screenshots\//.test(f) && !['robots.txt', 'sitemap.xml'].includes(f) && !/assets\/art-/.test(f));
const h = createHash('sha256'); list.forEach((f) => h.update(f + readFileSync(join(dist, f)).length)); const v = h.digest('hex').slice(0, 10);
// Caches are namespaced 'capy-dispatch-<hash>' and only OUR old caches are deleted: the github.io origin is shared with other sites.
// Requests outside this app's scope are left to the network.
// Pages (navigations) are network-first, so a reload always gets the latest index.html; offline, or if the network takes
// more than 4 s, the cached copy is used. Built assets are content-hashed: cache-first. A new version waits ('waiting')
// until the page asks for it (message 'skip', sent by the "Nouvelle version disponible — Recharger" toast).
writeFileSync(join(dist, 'sw.js'), `const P='capy-dispatch-',C=P+'${v}';const F=${JSON.stringify(['./', ...list])};
const ours=k=>k!==C&&k.startsWith(P);
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(ours).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const page=()=>caches.open(C).then(c=>c.match('./'));
const net=q=>new Promise((ok,ko)=>{const t=setTimeout(()=>page().then(r=>r?ok(r):0),4000);fetch(q).then(res=>{clearTimeout(t);if(res.ok){const cl=res.clone();caches.open(C).then(c=>c.put('./',cl))}ok(res)},err=>{clearTimeout(t);page().then(r=>r?ok(r):ko(err))})});
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET'||!q.url.startsWith(self.registration.scope))return;
if(q.mode==='navigate'){e.respondWith(net(q));return}
e.respondWith(caches.open(C).then(c=>c.match(q,{ignoreSearch:true,ignoreVary:true})).then(r=>r||fetch(q).then(res=>{if(res.ok){const cl=res.clone();caches.open(C).then(c=>c.put(q,cl))}return res}).catch(()=>page())))});`);
console.log(`sw.js: ${list.length + 1} files, version ${v}`);
