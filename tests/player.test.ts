import { it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { cleanName, validName, cleanPlayer, agree, gx, titre, setSex, NAME_MAX } from '../src/player';
import { sanitize, defaults, load, save, KEY } from '../src/storage';
import { DAYS_SPEC } from './spec-helper';

const mem: Record<string, string> = {};
beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k];
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = String(v); }, removeItem: (k: string) => { delete mem[k]; } }; });

it('cleanName keeps real names (accents, apostrophes, hyphens) and strips markup, controls and bidi tricks', () => {
  expect(cleanName('  Zoé ')).toBe('Zoé'); expect(cleanName("Jean-Noël d'Arc")).toBe('Jean-Noël d’Arc'.replace('’', "'"));
  expect(cleanName('<img src=x onerror=alert(1)>')).not.toMatch(/[<>=()]/);
  expect(cleanName('Lé\u202Ea\u0000\n')).toBe('Léa'); expect(cleanName('   ')).toBe(''); expect(cleanName(42)).toBe('');
  expect(Array.from(cleanName('A'.repeat(50))).length).toBe(NAME_MAX); expect(cleanName("--'Max")).toBe('Max');
  expect(validName('')).toBe(false); expect(validName('Al')).toBe(true);
});
it('cleanPlayer rejects bad sexes/names and falls back to the default look', () => {
  expect(cleanPlayer(null)).toBe(null); expect(cleanPlayer({ name: 'Léa', sex: 'autre' })).toBe(null); expect(cleanPlayer({ name: '<>', sex: 'femme' })).toBe(null);
  expect(cleanPlayer({ name: 'Léa', sex: 'femme', look: { fur: 'zebre', acc: '<b>', outfit: 'rouge' } })).toEqual({ name: 'Léa', sex: 'femme', look: { fur: 'caramel', acc: 'aucun', outfit: 'polo', head: 'classique' } });
  expect(cleanPlayer({ name: 'Paul', sex: 'homme', look: { fur: 'miel', acc: 'lunettes', outfit: 'gilet', head: 'long' } })!.look).toEqual({ fur: 'miel', acc: 'lunettes', outfit: 'gilet', head: 'long' });
  expect(cleanPlayer({ name: 'Léa', sex: 'femme', look: { head: 'carrée<script>' } })!.look.head).toBe('classique');
  // v0.2 colour keys are migrated to outfit styles
  expect(['marine', 'vert', 'bleu'].map((o) => cleanPlayer({ name: 'Léa', sex: 'femme', look: { outfit: o } })!.look.outfit)).toEqual(['polo', 'veste', 'combi']);
});
it('migration: a v0.1 save (no player) keeps its game and asks for the character once', () => {
  const old = defaults() as Partial<ReturnType<typeof defaults>>; delete old.player; old.best = { stars: 12, yield: 0.8, runs: 1 };
  mem[KEY] = JSON.stringify(old); const s = load(); expect(s.player).toBe(null); expect(s.best.runs).toBe(1);
  s.player = { name: 'Camille', sex: 'femme', look: { fur: 'noisette', acc: 'lavande', outfit: 'veste' } }; save(s);
  expect(load().player).toEqual({ ...s.player, look: { ...s.player.look, head: 'classique' } }); expect(sanitize({ player: { name: 'x'.repeat(99), sex: 'homme' } }).player!.name.length).toBe(NAME_MAX);
});
it('grammatical agreement: one form, chosen from the sex', () => {
  expect(agree("{Bienvenu|Bienvenue} à l'agence", 'homme')).toBe("Bienvenu à l'agence"); expect(agree("{Bienvenu|Bienvenue} à l'agence", 'femme')).toBe("Bienvenue à l'agence");
  expect(agree('{Prêt|Prête} ? {motivé|motivée} !', 'femme')).toBe('Prête ? motivée !'); expect(titre('homme')).toBe('ordonnanceur'); expect(titre('femme')).toBe('ordonnanceuse');
  setSex('femme'); expect(gx('prêt', 'prête')).toBe('prête'); setSex('homme'); expect(gx('prêt', 'prête')).toBe('prêt');
  for (const d of DAYS_SPEC()) { const a = agree(d.chef, 'homme').replaceAll('{nom}', ''), b = agree(d.chef, 'femme').replaceAll('{nom}', ''); expect(a).not.toMatch(/[{}|]/); expect(b).not.toMatch(/[{}|]/); }
});
it('no inclusive writing anywhere in the French copy', () => {
  const bad = [/[a-zà-ÿ][·•‧∙][a-zà-ÿ]/i, /[a-zà-ÿ]\((?:e|es|ne|nes|se|ses|rice|rices|euse|euses|le|les)\)/i, /\b(?:iel|iels|ielle|ielles|celleux|toustes|froeur|lea)\b/i,
    /[a-zà-ÿ]{3,}\/(?:e|es|rice|euse|ne|le)\b/i, /[a-zà-ÿ]{3,}\.(?:e|rice|euse|ne)\.s\b/i, /[a-zà-ÿ]{3,}-(?:e|rice|euse)-s\b/i];
  for (const x of ['connecté·e', 'prêt(e)', 'iel', 'ordonnanceur/euse', 'tou.te.s'.replace('tou.te', 'connect.e'), 'motivé-e-s']) expect(bad.some((r) => r.test(x))).toBe(true);
  const files = [...readdirSync('src').filter((f) => /\.(ts|css)$/.test(f)).map((f) => `src/${f}`), 'index.html', 'README.md', 'LICENSES.md', 'public/manifest.webmanifest'];
  for (const f of files) { const raw = readFileSync(f, 'utf8'); const t = f.endsWith('.ts') ? (raw.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? []).join('\n') : raw; for (const r of bad) { const m = t.match(r); expect(m ? `${f}: ${m[0]}` : '').toBe(''); } }
});
