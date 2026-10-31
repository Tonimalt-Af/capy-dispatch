import { it, expect, beforeEach } from 'vitest';
import { sanitize, load, save, defaults, KEY, BACKUP_KEY, CORRUPT_KEY } from '../src/storage';
import { playDay } from './bot';
import * as G from '../src/game';

const mem: Record<string, string> = {};
beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k];
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = String(v); }, removeItem: (k: string) => { delete mem[k]; } }; });

it('keys are namespaced capy-dispatch-* (shared github.io origin, separate from Mahjong)', () => {
  for (const k of [KEY, BACKUP_KEY, CORRUPT_KEY]) expect(k.startsWith('capy-dispatch-')).toBe(true);
});
it('a campaign round-trips through save/load, mid-day with a pending card', () => {
  const g = G.newGame(5); G.startDay(g); playDay(g); G.nextDay(g); G.startDay; const s = defaults(); s.game = g; save(s);
  const back = load(); expect(back.game).toEqual(JSON.parse(JSON.stringify(g)));
  g.today!.phase = 'run'; g.today!.pending.push({ card: 'chien', kind: 'risk', capy: 'momo', ticket: Object.keys(g.tickets)[0] }); save({ ...s, game: g });
  expect(load().game!.today!.pending.length).toBe(1);
});
it('garbage or tampered saves are dropped safely (settings kept), corrupt JSON is set aside', () => {
  expect(sanitize(null)).toEqual(defaults()); expect(sanitize({ settings: { sfx: false, speed: 9 } }).settings).toEqual({ sfx: false, music: true, speed: 1 });
  const g = G.newGame(1); G.startDay(g); const bad = JSON.parse(JSON.stringify(g)); bad.tickets[Object.keys(bad.tickets)[0]].job = '<img onerror=x>';
  expect(sanitize({ game: bad }).game).toBe(null);
  const bad2 = JSON.parse(JSON.stringify(g)); bad2.today.log.push('x'.repeat(5000)); expect(sanitize({ game: bad2 }).game).toBe(null);
  mem[KEY] = '{not json'; expect(load()).toEqual(defaults()); expect(mem[CORRUPT_KEY]).toBe('{not json');
});
it('the previous save is kept as a backup', () => { const s = defaults(); save(s); s.best.runs = 3; save(s); expect(JSON.parse(mem[BACKUP_KEY]).best.runs).toBe(0); });
