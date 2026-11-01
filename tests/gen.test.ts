// Generated days (design Page, section 16): built from the hand-written pieces of src/gen.ts, proven 3 ★ before being served.
import { describe, it, expect } from 'vitest';
import { playKind, type Kind } from './bot';
import * as G from '../src/game';
import { candidate, proves, stats, MIXES, CHEF, TRIOS } from '../src/gen';
import { DAYS_SPEC, DAY_CARDS, EVENTS, JOBS, RISKS, objText } from '../src/content';
import { SITES } from '../src/map';
import { agree } from '../src/player';
import { tryDay } from '../src/hindsight';

const seeds = Array.from({ length: 30 }, (_, i) => 100 + 13 * i);
const res = Object.fromEntries((['obvious', 'opt', 'random'] as Kind[]).map((k) => [k, seeds.map((s) => playKind(s, k, undefined, true))])) as Record<Kind, G.Game[]>;
const avg = (k: Kind) => res[k].reduce((s, g) => s + G.totalStars(g), 0) / seeds.length;

describe('day generator', () => {
  it('only uses the written pieces: real jobs, risks, calls, cards and objectives; the chef lines agree in both forms', () => {
    for (const s of seeds.slice(0, 10)) for (let d = 3; d < 10; d++) for (let k = 0; k < 4; k++) { const c = candidate(s, d, k);
      expect(DAY_CARDS[c.card]).toBeTruthy(); expect(c.objs.length).toBe(3); c.objs.forEach((o) => expect(objText(o)).toBeTruthy());
      for (const j of c.jobs) { expect(JOBS[j[0] as keyof typeof JOBS]).toBeTruthy(); for (const r of j.slice(1)) expect(RISKS[r as keyof typeof RISKS]).toBeTruthy(); }
      for (const [slot, id] of c.events) { expect(EVENTS[id], id).toBeTruthy(); expect(slot).toBeGreaterThanOrEqual(1); }
      expect(new Set(c.events.map((e) => e[0])).size).toBe(c.events.length); expect(c.jobs.length).toBeGreaterThanOrEqual(10);
      if (c.card === 'orage') { expect(c.jobs.some((j) => j[0] === 'fuite_bt')).toBe(true); expect(c.jobs.some((j) => j[0] === 'casse')).toBe(true); }
      expect(c.card === 'festival').toBe(DAYS_SPEC[d].card === 'festival'); }
    for (const l of Object.values(CHEF).flat()) for (const sx of ['homme', 'femme'] as const) expect(agree(l, sx).replaceAll('{nom}', '')).not.toMatch(/[{}|]/);
    expect(Object.keys(MIXES).length).toBeGreaterThanOrEqual(4); expect(Object.keys(TRIOS).length).toBe(5);
  });
  it('days 1 to 3 stay scripted; the story calls (VIP, Festival, director) still happen once each, on their day', () => {
    for (const g of res.opt) { for (let d = 0; d < 3; d++) expect(g.specs?.[d]).toBeUndefined();
      const ev = Array.from({ length: 10 }, (_, d) => G.specOf(g, d).events.map((e) => e[1])).flat();
      for (const v of ['vip_patron', 'vip_rival', 'vip_maire', 'vip_agglo', 'directeur', 'capydindon', 'prefet']) expect(ev.filter((e) => e === v).length, v).toBe(1);
      expect(Array.from({ length: 10 }, (_, d) => G.specOf(g, d).card).filter((c) => c === 'festival').length).toBe(1);
      for (const t of Object.values(g.tickets)) expect(SITES[t.site]).toBeTruthy(); } // OSM addresses only
  });
  it('every generated day served was proven 3 ★ from that very morning (else the scripted day is served)', () => {
    let checked = 0;
    for (const s of seeds.slice(0, 6)) playKind(s, 'opt', (g, at) => {
      if (at !== 'plan' || g.today!.slot || g.today!.phase !== 'briefing' || g.day < 3) return; const sp = G.specOf(g, g.day);
      if (JSON.stringify(sp) === JSON.stringify(DAYS_SPEC[g.day])) return; checked++;
      let ok = false; for (let k = 0; k < 24 && !ok; k++) ok = tryDay(g, g.seed * 7919 + g.day * 104729 + k * 31 + 5, k < 3 ? 0 : Math.min(1, (k / 24) * 1.5), k < 3 ? 0.15 * k : 0.35, k < 6 ? 0 : (k % 5) * 0.06, 1, false).today!.stars === 3;
      expect(ok, `seed ${s} day ${g.day + 1}`).toBe(true); }, true);
    expect(checked).toBeGreaterThanOrEqual(30);
    const g = G.newGame(5); G.startDay(g); g.day = 3; expect(proves(g, candidate(5, 3, 0))).toBeGreaterThanOrEqual(0); // the proof never touches the real game
    expect(g.specs).toBeUndefined();
  });
  it('balance holds on generated fortnights: random < obvious < optimised, gap ≥ 4 ★, optimiser ≥ 26, few fallbacks', () => {
    expect(avg('random')).toBeLessThan(avg('obvious')); expect(avg('opt') - avg('obvious')).toBeGreaterThanOrEqual(4); expect(avg('opt')).toBeGreaterThanOrEqual(26);
    expect(stats.fallback / (stats.made + stats.fallback)).toBeLessThan(0.2);
    for (const k of ['obvious', 'opt', 'random'] as Kind[]) for (const g of res[k]) expect(g.history.length).toBe(10);
  });
  it('a candidate is the same for everyone with the same seed (the « Tournée du jour » relies on it)', () => {
    expect(candidate(42, 5, 0)).toEqual(candidate(42, 5, 0)); expect(candidate(42, 5, 0)).not.toEqual(candidate(43, 5, 0));
  });
  it('a save keeps its generated days, and a tampered one is dropped (and generated again)', async () => {
    const { game } = await import('../src/storage'); const g = res.opt[0]; const ok = game(JSON.parse(JSON.stringify(g)))!; expect(ok.specs).toEqual(g.specs); expect(ok.gen).toBe(true);
    const bad = JSON.parse(JSON.stringify(g)); bad.specs[4].events.push([2, '<img src=x>']); expect(game(bad)!.specs).toBeUndefined();
  });
});
