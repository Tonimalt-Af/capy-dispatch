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
it('Momo was renamed Fred: old saves keep working (id momo) and old log lines read Fred', () => {
  const g = G.newGame(5); G.startDay(g); g.today!.log.push('9h · Momo prend un café', 'Momolito reste'); g.today!.plan.momo = [];
  const s = defaults(); s.game = g; save(s);
  const back = load().game!; expect(back.today!.log.slice(-2)).toEqual(['9h · Fred prend un café', 'Momolito reste']); expect(back.today!.plan.momo).toEqual([]);
});
it('saves from the first real-address release still load (residence + retired OSM slot)', async () => {
  const { RETIRED_SITES, PREFET_SITE, SITES } = await import('../src/map');
  const g = G.newGame(5); G.startDay(g); const [a, b] = Object.keys(g.tickets);
  const r = [...RETIRED_SITES][0]; g.tickets[a].site = r; g.tickets[b].prefet = true; g.tickets[b].site = 1505;
  const s = defaults(); s.game = g; save(s); const back = load().game!;
  expect(back.tickets[b].site).toBe(PREFET_SITE); const t = back.tickets[a]; expect(RETIRED_SITES.has(t.site)).toBe(false); expect(t.site).not.toBe(PREFET_SITE);
  expect(SITES[t.site].street).toMatch(/\p{L}{3}/u); expect(t.num).toBe(SITES[t.site].num);
});
it('old afternoon log times (13 h-17 h) read as the new 13 h 30-17 h 30 clock, once', () => {
  const g = G.newGame(5); G.startDay(g); g.today!.log.push('9 h · a', '13 h · b', '17 h · c', '13 h 30 · d');
  const s = defaults(); s.game = g; save(s); const l1 = load().game!.today!.log.slice(-4); expect(l1).toEqual(['9 h · a', '13 h 30 · b', '17 h 30 · c', '13 h 30 · d']);
  save({ ...s, game: load().game }); expect(load().game!.today!.log.slice(-4)).toEqual(l1);
});
it('a mid-day save from the v1 map (no map field, old node numbers) still loads: capys are put back on real nodes', async () => {
  const { MAP_V, NODE_COUNT, DEPOT, SITES } = await import('../src/map');
  const g = G.newGame(7); G.startDay(g); const old = JSON.parse(JSON.stringify(g)); delete old.map;
  const ids = Object.keys(old.today.capys); old.today.capys[ids[0]].pos = 2; old.today.capys[ids[1]].pos = 3;
  const tk = Object.keys(old.tickets)[0]; old.today.capys[ids[0]].job = tk;
  const s = defaults(); s.game = old; mem[KEY] = JSON.stringify(s);
  const back = load().game!; expect(back).not.toBeNull(); expect(back.map).toBe(MAP_V);
  for (const r of Object.values(back.today!.capys)) expect(r.pos >= 0 && r.pos < NODE_COUNT).toBe(true);
  expect((back.today!.capys as Record<string, { pos: number }>)[ids[0]].pos).toBe(SITES[old.tickets[tk].site].node);
  expect((back.today!.capys as Record<string, { pos: number }>)[ids[1]].pos).toBe(DEPOT);
});
