// A strong player for the « 3 stars every day » guard (not shipped in the game): randomised plans + card choices,
// many tries per day, keeps the 3★ days and backtracks to an earlier day when a later one cannot reach 3★.
import { TEAM, JOBS } from '../src/content';
import { tray, assign, unassign, preview, sendAvis, toggleGas, canDo, avail, launch, step, choose, miniResult, nextDay, startDay, newGame, closeDay, cardOf, rng, type Game } from '../src/game';

type R = () => number;
/** Greedy placement with noise: t = 0 is the plain greedy dispatcher of bot.ts. */
export function noisyPlan(g: Game, r: R, t: number, skip = 0) {
  for (const id of tray(g)) { const k = g.tickets[id]; if (JOBS[k.job].coupure && k.avis === null) sendAvis(g, id); if (JOBS[k.job].dig && !k.gas) toggleGas(g, id); }
  const pri = (id: string) => { const k = g.tickets[id]; return (JOBS[k.job].urgent ? 0 : k.vip ? 5 : k.rdv ? 10 + k.rdv[0] : 30) + k.risks.length + (r() - 0.5) * 40 * t; };
  const P = new Map(tray(g).map((id) => [id, pri(id)])); const ids = [...P.keys()].filter((id) => avail(g, id)).sort((a, b) => P.get(a)! - P.get(b)!);
  for (const id of ids) {
    if (!JOBS[g.tickets[id].job].urgent && r() < skip) continue;
    let best: { c: typeof TEAM[number]['id']; i: number; cost: number } | null = null;
    for (const c of TEAM) { if (!canDo(c.id, id, g)) continue; const n = g.today!.plan[c.id].length;
      for (let i = 0; i <= n; i++) { assign(g, c.id, id, i); const p = preview(g, c.id);
        const risky = p.reduce((acc, s, k) => acc + (k > 0 && g.tickets[s.id].rdv && p[k - 1].endMax > g.tickets[s.id].rdv![1] ? 1 : 0), 0);
        const bad = risky * 25 + p.filter((s) => s.late).length * 50 + p.filter((s) => s.overflow).length * 30; const end = p.length ? p[p.length - 1].end : 0;
        const urg = p.reduce((acc, s) => acc + (JOBS[g.tickets[s.id].job].urgent ? s.start * 20 : 0), 0);
        const cost = bad + end + urg + p.reduce((s, x) => s + x.travel, 0) * 0.5 + r() * 30 * t; unassign(g, id);
        if (!best || cost < best.cost) best = { c: c.id, i, cost }; } }
    if (best) { assign(g, best.c, id, best.i); let p = preview(g, best.c); let k = 0;
      while (p.some((s) => s.overflow) && k++ < 4) { const cand = [...p].reverse().filter((s) => s.id !== id && !JOBS[g.tickets[s.id].job].urgent && P.get(s.id)! > P.get(id)! && g.today!.plan[best!.c].includes(s.id)); const vict = cand.find((s) => !g.tickets[s.id].rdv) ?? cand[0]; if (!vict) { unassign(g, id); break; } unassign(g, vict.id); p = preview(g, best.c); } }
  }
}
const replan = (g: Game, r: R, t: number, skip: number) => { if (g.today!.phase === 'run') for (const c of TEAM) for (const s of preview(g, c.id)) if (s.late || s.overflow) unassign(g, s.id); noisyPlan(g, r, t, skip); };
/** One try at a day from its briefing: returns the closed day (not yet nextDay). */
export function tryDay(g0: Game, seed: number, t: number, cardRand: number, skip: number, mini: 0 | 1 = 1): Game {
  const g = structuredClone(g0); const r = rng(seed); noisyPlan(g, r, t, skip); launch(g); let guard = 0;
  while (g.today!.phase === 'run' && guard++ < 500) { step(g); const d = g.today!;
    while (d.pending.length) { const p = d.pending[0]; if (p.kind === 'mini') { miniResult(g, mini, 'a trouvé le compteur'); continue; }
      const c = cardOf(p); let i = 0;
      if (p.kind !== 'safety' && c.choices.length > 1) { if (r() < cardRand) i = Math.floor(r() * c.choices.length); else { i = c.choices.findIndex((x) => !x.fx.postpone && (x.fx.slots ?? 0) > 0); if (i < 0) i = 0; } }
      choose(g, i); replan(g, r, t, skip); } }
  if (g.today!.phase !== 'close') closeDay(g); return g;
}
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
