/// <reference types="node" />
import { it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { CSP } from '../vite.config';

it('strict CSP: self only, no eval, no third party', () => {
  expect(CSP).toContain("default-src 'self'"); expect(CSP).toContain("script-src 'self'"); expect(CSP).not.toMatch(/unsafe-eval|https?:/); expect(CSP).toContain("object-src 'none'");
});
it('no PWA install prompt: beforeinstallprompt is swallowed and never re-offered', () => {
  const main = readFileSync('src/main.ts', 'utf8'); expect(main).toMatch(/beforeinstallprompt', \(e\) => e\.preventDefault\(\)/); expect(main).not.toMatch(/\.prompt\(\)/);
});
it('untrusted text goes through esc() and the code never uses eval / new Function', () => {
  for (const f of readdirSync('src').filter((f) => f.endsWith('.ts'))) { const s = readFileSync('src/' + f, 'utf8'); expect(s, f).not.toMatch(/\beval\(|new Function/); }
});
it('the OSM attribution is in the map', () => { expect(readFileSync('src/mapview.ts', 'utf8')).toContain("les contributeurs d'OpenStreetMap"); });
