/// <reference types="node" />
// The service worker only manages this app: caches namespaced 'capy-dispatch-*', other sites' caches on the shared origin are never deleted.
import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path'; import { tmpdir } from 'node:os'; import { execFileSync } from 'node:child_process';

function buildSw() {
  const d = mkdtempSync(join(tmpdir(), 'sw-')); mkdirSync(join(d, 'dist/assets'), { recursive: true });
  writeFileSync(join(d, 'dist/index.html'), '<html></html>'); writeFileSync(join(d, 'dist/assets/a.js'), 'x');
  execFileSync('node', [resolve('scripts/build-sw.mjs')], { cwd: d });
  return readFileSync(join(d, 'dist/sw.js'), 'utf8');
}
function run(code: string, keys: string[]) {
  const h: Record<string, (e: unknown) => void> = {}; const deleted: string[] = []; let wait: Promise<unknown> = Promise.resolve();
  const self = { addEventListener: (n: string, f: (e: unknown) => void) => { h[n] = f; }, skipWaiting: () => Promise.resolve(), clients: { claim: () => Promise.resolve() }, registration: { scope: 'https://x.github.io/capy-dispatch/' } };
  const caches = { keys: async () => keys, delete: async (k: string) => { deleted.push(k); return true; }, open: async () => ({ addAll: async () => {}, match: async () => undefined, put: async () => {} }) };
  new Function('self', 'caches', code)(self, caches);
  h.activate({ waitUntil: (p: Promise<unknown>) => { wait = p; } });
  return { wait, deleted, h, self, code };
}
it('activate deletes only our own old caches', async () => {
  const code = buildSw(); const cur = /C=P\+'([0-9a-f]+)'/.exec(code)![1];
  const r = run(code, [`capy-dispatch-${cur}`, 'capy-dispatch-0000000000', 'capy-0123456789', 'other-app-v3', 'workbox-precache', 'capy-notes']);
  await r.wait;
  expect(r.deleted.sort()).toEqual(['capy-dispatch-0000000000']); // Mahjong's 'capy-*' and 'capy-mahjong-*' caches are not ours
});
it('fetches outside the app scope are not intercepted', () => {
  const code = buildSw(); const r = run(code, []); let responded = false;
  r.h.fetch({ request: { method: 'GET', url: 'https://x.github.io/other-repo/index.html' }, respondWith: () => { responded = true; } });
  expect(responded).toBe(false);
  r.h.fetch({ request: { method: 'GET', url: 'https://x.github.io/capy-dispatch/assets/a.js' }, respondWith: (p: Promise<unknown>) => { responded = true; p.catch(() => {}); } });
  expect(responded).toBe(true);
});
function harness(fetchImpl: () => Promise<unknown>, cached: Record<string, unknown>) {
  const code = buildSw(); const h: Record<string, (e: unknown) => void> = {}; let skipped = 0; const put: string[] = [];
  const self = { addEventListener: (n: string, f: (e: unknown) => void) => { h[n] = f; }, skipWaiting: () => { skipped++; return Promise.resolve(); }, clients: { claim: () => Promise.resolve() }, registration: { scope: 'https://x.github.io/capy-dispatch/' } };
  const caches = { keys: async () => [], delete: async () => true, open: async () => ({ addAll: async () => {}, match: async (k: unknown) => cached[typeof k === 'string' ? k : (k as { url: string }).url], put: async (k: string) => { put.push(k); } }) };
  new Function('self', 'caches', 'fetch', code)(self, caches, fetchImpl);
  const nav = (url: string) => new Promise((ok) => h.fetch({ request: { method: 'GET', mode: 'navigate', url }, respondWith: (p: Promise<unknown>) => ok(p) })).then((p) => p);
  return { h, nav, put, skipped: () => skipped, code };
}
it('pages are network-first: a fresh index.html is served and cached when online', async () => {
  const fresh = { ok: true, v: 'new', clone() { return this; } };
  const r = harness(async () => fresh, { './': { v: 'old' } });
  expect(await r.nav('https://x.github.io/capy-dispatch/')).toBe(fresh); expect(r.put).toEqual(['./']);
});
it('pages fall back to the cached copy offline', async () => {
  const r = harness(async () => { throw new TypeError('offline'); }, { './': { v: 'old' } });
  expect(await r.nav('https://x.github.io/capy-dispatch/?mode=zen')).toEqual({ v: 'old' });
});
it('a new version waits for the page ("Recharger") instead of taking over by itself', () => {
  const r = harness(async () => ({}), {});
  r.h.install({ waitUntil: () => {} }); expect(r.skipped()).toBe(0);
  r.h.message({ data: 'nope' }); expect(r.skipped()).toBe(0);
  r.h.message({ data: 'skip' }); expect(r.skipped()).toBe(1);
});
