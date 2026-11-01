// Balance guard, with three players from tests/bot.ts on 30 seeds:
//  - the obvious plan (red urgent tickets first, then each ticket to its specialist, first choice on every card),
//  - the optimised one (greedy placement, re-planning after delays, look-ahead on cards),
//  - a random one.
// Targets of « Boucle de jeu v2 »: ≥ 4★ between optimised and obvious over 30, the obvious plan at 1–2★ from day 4,
// the optimiser near 3★, and the optimiser misses an objective at most about one time in five.
import { it, expect } from 'vitest';
import { playKind, type Kind } from './bot';
import { totalStars } from '../src/game';
import { DAYS_SPEC } from '../src/content';

const seeds = Array.from({ length: 30 }, (_, i) => 100 + 13 * i); // the same 30 seeds as tests/three-stars.test.ts
const res = Object.fromEntries((['obvious', 'opt', 'random'] as Kind[]).map((k) => [k, seeds.map((s) => playKind(s, k))])) as Record<Kind, ReturnType<typeof playKind>[]>;
const avgDay = (k: Kind, d: number) => res[k].reduce((s, g) => s + g.history[d].stars, 0) / seeds.length;
const avgTotal = (k: Kind) => res[k].reduce((s, g) => s + totalStars(g), 0) / seeds.length;

it('optimised beats obvious by at least 4 stars over 30, and obvious beats random', () => {
  for (const k of ['obvious', 'opt', 'random'] as Kind[]) for (const g of res[k]) { expect(g.over).toBe(true); expect(g.history.length).toBe(10); }
  expect(avgTotal('opt') - avgTotal('obvious')).toBeGreaterThanOrEqual(4);
  expect(avgTotal('opt')).toBeGreaterThanOrEqual(26); expect(avgTotal('random')).toBeLessThan(avgTotal('obvious'));
});
it('from day 4 the obvious plan earns about 1–2 stars a day, the optimiser close to 3', () => {
  for (let d = 3; d < 10; d++) { expect(avgDay('obvious', d), `obvious day ${d + 1}`).toBeGreaterThanOrEqual(0.8); expect(avgDay('obvious', d), `obvious day ${d + 1}`).toBeLessThanOrEqual(2.2); expect(avgDay('opt', d), `opt day ${d + 1}`).toBeGreaterThanOrEqual(2.5); }
});
it('every objective is reachable: the optimiser misses each at most about one time in four', () => {
  for (let d = 0; d < 10; d++) DAYS_SPEC[d].objs.forEach((o, j) => { const miss = res.opt.filter((g) => !g.history[d].met[j]).length; expect(miss / seeds.length, `day ${d + 1} ${o.id}`).toBeLessThanOrEqual(0.26); });
});
it('demand grows from about half the team capacity to more than it (nobody finishes everything at the end)', () => {
  const pile = res.opt.map((g) => g.pile.length); expect(Math.min(...pile)).toBeGreaterThanOrEqual(3); // the morning cap (MORNING_CAP) keeps the pile from exploding, but some work is always left
  expect(res.opt.filter((g) => g.history[0].done >= DAYS_SPEC[0].jobs.length + 1).length, String(res.opt.map((g) => g.history[0].done))).toBeGreaterThanOrEqual(seeds.length * 0.9); // day 1 fits in the day (the greedy player misses one job on a few seeds)
});
it('the network yield improves when you work well', () => { for (const g of res.opt) expect(g.history.at(-1)!.yield).toBeGreaterThan(0.8); });
it('5-minute sessions: at most MORNING_CAP tickets on the tray each morning (urgent ones aside), about 14 to handle in a day', async () => {
  const G = await import('../src/game'); const JOBS = (await import('../src/content')).JOBS;
  for (const s of seeds) { let n0 = 0, t0 = 0; playKind(s, 'opt', (g, at) => {
    if (at === 'plan') { const av = G.tray(g).filter((id) => G.avail(g, id)); n0 = g.next; t0 = av.length; expect(av.filter((id) => !JOBS[g.tickets[id].job].urgent).length).toBeLessThanOrEqual(G.MORNING_CAP); }
    else if (at === 'close') expect(t0 + g.next - n0, `day ${g.day + 1}`).toBeLessThanOrEqual(17); }); }
});
