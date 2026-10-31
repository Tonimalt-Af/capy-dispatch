// Balance guard: a simple greedy dispatcher (tests/bot.ts) must earn stars every day; the curve gets harder at the end.
import { it, expect } from 'vitest';
import { playAll } from './bot';
import { totalStars } from '../src/game';

it('every day gives at least 1 star to a careful player, and the 10 days give >= 20 stars', () => {
  for (const seed of [2026, 7, 99]) {
    const g = playAll(seed); expect(g.over).toBe(true); expect(g.history.length).toBe(10);
    for (const h of g.history) { expect(h.stars, `seed ${seed} day ${h.day + 1}`).toBeGreaterThanOrEqual(1); expect(h.incidents).toBe(0); }
    expect(totalStars(g), `seed ${seed}`).toBeGreaterThanOrEqual(20);
  }
});
it('perfection is not free: the greedy bot does not get 30/30, the end of the fortnight is harder', () => {
  const g = playAll(2026); expect(totalStars(g)).toBeLessThan(30);
  const first = g.history.slice(0, 5).reduce((s, h) => s + h.stars, 0); const last = g.history.slice(5).reduce((s, h) => s + h.stars, 0);
  expect(first).toBeGreaterThan(last);
});
it('the network yield improves when you work well (background gauge)', () => {
  const g = playAll(2026); expect(g.history.at(-1)!.yield).toBeGreaterThan(0.75);
});
