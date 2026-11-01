// End-of-day replay (« Si c'était à refaire »): every move it suggests happened in a better day played by the real rules.
import { it, expect } from 'vitest';
import { newGame, startDay, launch, step, choose, miniResult, closeDay, nextDay, type Game } from '../src/game';
import { hindsight } from '../src/hindsight';
import { planObvious } from './bot';

function dayObvious(g: Game) { planObvious(g); const m0 = structuredClone(g); launch(g); let k = 0;
  while (g.today!.phase === 'run' && k++ < 500) { step(g); const d = g.today!; while (d.pending.length) { if (d.pending[0].kind === 'mini') miniResult(g, 1, 'a trouvé le compteur'); else choose(g, 0); if (!d.pending.length) planObvious(g); } }
  if (g.today!.phase !== 'close') closeDay(g); return m0; }
it('suggests only moves from a better day, at most 3, and nothing on a 3-star day', () => {
  let shown = 0, days = 0;
  for (const seed of [100, 113, 126, 139]) { const g = newGame(seed); startDay(g);
    while (!g.over) { const m0 = dayObvious(g); const d = g.today!; const h = hindsight(m0, g, 24); days++;
      expect(h.fixes.length).toBeLessThanOrEqual(3);
      if (d.stars === 3) expect(h.fixes).toEqual([]);
      if (h.fixes.length) { shown++; const B = h.best!.today!; expect(B.stars!).toBeGreaterThan(d.stars!); expect(B.day).toBe(d.day);
        for (const f of h.fixes) { expect(f.text).not.toMatch(/undefined|NaN/);
          if (f.ticket) { const hh = B.hist[f.capy!].find((x) => x[0] === f.ticket); expect(hh, f.text).toBeTruthy(); expect(hh![1]).toBe(f.at); } } }
      nextDay(g); } }
  expect(shown).toBeGreaterThan(days / 4); // the obvious player often has something to learn
}, 120000);
