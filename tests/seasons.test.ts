// Seasons (Maxime, 1 Nov 2026: « attaque les saisons et l'hiver »). A fortnight belongs to a season; the winter one has frost
// (compteurs gelés: subscribers without water, urgent), its Grand froid story day and the thaw (casses, cracked meters).
// Same bar as every other day: a 3 ★ plan exists every day, the obvious plan stays below, random below obvious.
import { describe, it, expect } from 'vitest';
import { search } from './search';
import { playKind, type Kind } from './bot';
import * as G from '../src/game';
import { SEASONS, SEASON_LIST, seasonOfDate, seasonDays, DAY_CARDS, EVENTS, JOBS, type Season } from '../src/content';
import { candidate } from '../src/gen';
import { dailyGame, addDays } from '../src/daily';
import { game } from '../src/storage';
import { carnet } from '../src/carnet';

const seeds = Array.from({ length: 30 }, (_, i) => 100 + 13 * i);
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const camp = (s: number, kind: Kind, season: Season) => playKind(s, kind, undefined, true, undefined, season);
export const seasonStats: Record<string, Record<string, number>> = {};

describe('seasons', () => {
  it('the calendar gives the season; old saves are summer; a saved season survives, a broken one is dropped', () => {
    expect(['2026-12-01', '2027-01-15', '2027-02-28'].map(seasonOfDate)).toEqual(['hiver', 'hiver', 'hiver']);
    expect(['2027-03-01', '2027-06-21', '2026-11-01'].map(seasonOfDate)).toEqual(['printemps', 'ete', 'automne']);
    const old = G.newGame(5); G.startDay(old); expect(old.season).toBeUndefined(); expect(G.specOf(old, 6).card).toBe('festival');
    const w = G.newGame(5, 'hiver'); G.startDay(w); expect(game(JSON.parse(JSON.stringify(w)))?.season).toBe('hiver');
    expect(game(JSON.parse(JSON.stringify({ ...w, season: 'mousson' })))?.season).toBeUndefined();
    for (const s of SEASON_LIST) for (const c of SEASONS[s].cards) expect(DAY_CARDS[c], c).toBeTruthy();
  });
  it('scripted fortnights: the Festival is a summer thing; winter has the Grand froid then the thaw', () => {
    for (const s of SEASON_LIST) { const days = seasonDays(s); expect(days).toHaveLength(10);
      expect(days.filter((d) => d.card === 'festival').length).toBe(s === 'ete' ? 1 : 0);
      for (const d of days) for (const [, e] of d.events) expect(EVENTS[e], e).toBeTruthy(); }
    expect(seasonDays('hiver')[6].card).toBe('gel'); expect(seasonDays('hiver')[7].card).toBe('redoux');
    expect(seasonDays('hiver')[6].jobs.filter((j) => j[0] === 'gel_cpt').length).toBe(2); expect(JOBS.gel_cpt.urgent).toBe(true);
  });
  it('generated winter days: frost brings frozen meters, the thaw a casse and a branchement, no Festival, the Grand froid stays', () => {
    const cards = new Set<string>();
    for (const s of seeds.slice(0, 10)) for (let d = 3; d < 10; d++) for (let k = 0; k < 4; k++) { const c = candidate(s, d, k, undefined, 'hiver'); cards.add(c.card);
      expect(SEASONS.hiver.cards).toContain(c.card);
      if (c.card === 'gel') expect(c.jobs.filter((j) => j[0] === 'gel_cpt').length).toBeGreaterThanOrEqual(2);
      if (c.card === 'redoux') { expect(c.jobs.some((j) => j[0] === 'casse')).toBe(true); expect(c.jobs.some((j) => j[0] === 'fuite_bt')).toBe(true); }
      if (d === 6) { expect(c.card).toBe('gel'); expect(c.events.some((e) => e[1] === 'standard')).toBe(true); } }
    expect([...cards].sort()).toEqual(['calme', 'gel', 'mistral', 'redoux']);
  });
  for (const season of ['hiver', 'automne', 'printemps'] as Season[]) it.skipIf(!!process.env.ONLY_GEN)(`${season}: a 3-star plan exists for every day of the scripted fortnight (30 seeds)`, () => {
    for (const s of seeds) { const f = search(s, { season }); expect(f.stars, `seed ${s}`).toEqual(Array(10).fill(3)); }
  }, 600000);
  it('winter fortnights (generated, as served, each day proven 3 ★ by the generator): optimised above obvious, random below obvious every day', () => {
    const R = Object.fromEntries((['opt', 'obvious', 'random'] as Kind[]).map((k) => [k, seeds.map((s) => camp(s, k, 'hiver'))])) as Record<Kind, G.Game[]>;
    const day = (k: Kind, d: number) => mean(R[k].map((g) => g.history[d].stars));
    for (let d = 3; d < 10; d++) expect(day('random', d), `day ${d + 1}`).toBeLessThan(day('obvious', d));
    const tot = (k: Kind) => mean(R[k].map(G.totalStars)); expect(tot('obvious')).toBeLessThanOrEqual(30 - 6); expect(tot('opt')).toBeGreaterThan(tot('obvious'));
    for (const g of R.opt) { const cards = Array.from({ length: 10 }, (_, d) => G.specOf(g, d).card); expect(cards).not.toContain('festival'); expect(cards[6]).toBe('gel');
      expect(Object.values(g.tickets).some((t) => t.job === 'gel_cpt')).toBe(true); }
    seasonStats.hiver = { opt: tot('opt'), obvious: tot('obvious'), random: tot('random') };
    // the winter page of the carnet fills up with frost and thaw days held at 2 ★
    expect(R.opt.some((g) => carnet(g).find((x) => x.id === 'sai-gel')?.got)).toBe(true);
  }, 600000);
  it('Tournée du jour in winter: 30 dates from 1 December, each proven 3 ★, random < obvious < optimised', () => {
    const dates = Array.from({ length: 30 }, (_, i) => addDays('2026-12-01', i)); const runs = dates.map((k) => dailyGame(k));
    for (const [i, r] of runs.entries()) { expect(r.proven, dates[i]).toBe(true); expect(r.g.season).toBe('hiver'); }
    const st = Object.fromEntries((['opt', 'obvious', 'random'] as Kind[]).map((k) => [k, mean(dates.map((d) => G.totalStars(playKind(0, k, undefined, true, dailyGame(d).g))))])) as Record<Kind, number>;
    expect(st.random).toBeLessThan(st.obvious); expect(st.obvious).toBeLessThan(st.opt); expect(st.obvious).toBeLessThanOrEqual(2.3);
    expect(new Set(runs.map((r) => G.specOf(r.g, r.g.day).card)).has('gel')).toBe(true);
    seasonStats.daily = st; console.log('season stats', JSON.stringify(seasonStats));
  }, 600000);
});
