// A strong player for the « 3 stars every day » guard (not shipped in the game): randomised plans + card choices,
// many tries per day, keeps the 3★ days and backtracks to an earlier day when a later one cannot reach 3★.
import { avail, nextDay, startDay, newGame, type Game } from '../src/game';
import { tryDay } from '../src/hindsight';
export { tryDay, noisyPlan } from '../src/hindsight';

/** How good the morning after looks (tie-break between 3★ days). */
const future = (g: Game) => g.sat * 0.5 - g.pile.filter((id) => avail(g, id) || g.tickets[id].avail !== null).length * 2 - g.bg * 0.05 + g.pile.filter((id) => g.day - g.tickets[id].day >= 1).length * -1.5;
const dayScore = (g: Game) => g.today!.stars! * 1000 + g.today!.met!.filter(Boolean).length * 100 + future(g);
export interface Found { stars: number[]; ok: boolean; tries: number; g: Game }
/** Day-by-day search with backtracking: every day must reach `want` stars. budget = tries per day; keep = alternatives kept per day. */
export function search(seed: number, opts: { budget?: number; keep?: number; want?: number; maxBack?: number; mini?: 0 | 1 } = {}): Found {
  const budget = opts.budget ?? 120, keep = opts.keep ?? 3, want = opts.want ?? 3, mini = opts.mini ?? 1; let backs = opts.maxBack ?? 40; let tries = 0;
  const g0 = newGame(seed); startDay(g0); let best: Found = { stars: [], ok: false, tries: 0, g: g0 };
  const rec = (g: Game, stars: number[]): Found | null => {
    if (g.over) return { stars, ok: true, tries, g };
    const cands: Game[] = []; const seen = new Set<string>();
    for (let k = 0; k < budget; k++) { const t = k === 0 ? 0 : Math.min(1, k / budget * 1.5); const h = tryDay(g, seed * 7919 + g.day * 104729 + k, t, k === 0 ? 0 : 0.35, k < 4 ? 0 : (k % 5) * 0.06, mini); tries++;
      if (h.today!.stars! >= want) { const key = h.pile.join() + '|' + h.sat + '|' + h.bg; if (!seen.has(key)) { seen.add(key); cands.push(h); } if (cands.length >= keep * 3 && k > budget / 3) break; }
      else if (stars.length + 1 > best.stars.length || (stars.length + 1 === best.stars.length && h.today!.stars! > best.stars.at(-1)!)) best = { stars: [...stars, h.today!.stars!], ok: false, tries, g: h }; }
    cands.sort((a, b) => dayScore(b) - dayScore(a));
    for (const h of cands.slice(0, keep)) { const s = [...stars, h.today!.stars!]; nextDay(h); const f = rec(h, s); if (f) return f; if (backs-- <= 0) return null; }
    return null;
  };
  return rec(g0, []) ?? { ...best, tries };
}
