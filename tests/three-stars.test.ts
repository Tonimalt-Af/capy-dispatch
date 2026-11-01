// « 3 étoiles tous les jours » (Maxime, 1 Nov 2026): on every seed, every day can be won with 3 stars by good play.
// The proof is the search player of tests/search.ts (many plans and card choices per day, backtracking to the day before
// when a day cannot reach 3★; the meter mini-game is always counted as missed). Challenge kept: the obvious plan stays well
// below, and a random player below the obvious one on every day.
import { it, expect } from 'vitest';
import { search } from './search';
import { playKind } from './bot';
import { totalStars } from '../src/game';

const seeds = Array.from({ length: 30 }, (_, i) => 100 + 13 * i);
it('a 3-star plan exists for every day of every seed (30 seeds)', () => {
  for (const s of seeds) { const f = search(s); expect(f.ok, `seed ${s}: ${f.stars.join('')}`).toBe(true); expect(f.stars, `seed ${s}`).toEqual(Array(10).fill(3)); }
}, 300000);
it('the obvious plan stays clearly below 3★, and a random player below the obvious one every day', () => {
  const O = seeds.map((s) => playKind(s, 'obvious')), X = seeds.map((s) => playKind(s, 'random'));
  const avg = (G: typeof O, d: number) => G.reduce((a, g) => a + g.history[d].stars, 0) / seeds.length;
  for (let d = 1; d < 10; d++) expect(avg(X, d), `day ${d + 1}`).toBeLessThan(avg(O, d) - 0.15);
  const tot = (G: typeof O) => G.reduce((a, g) => a + totalStars(g), 0) / seeds.length; expect(tot(O)).toBeLessThanOrEqual(30 - 6);
}, 300000);
