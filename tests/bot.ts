// A simple greedy dispatcher used by the balance tests (not shipped in the game).
import { TEAM, JOBS } from '../src/content';
import { tray, assign, unassign, preview, sendAvis, toggleGas, canDo, avail, launch, step, choose, miniResult, nextDay, startDay, newGame, type Game } from '../src/game';
import { SLOTS } from '../src/rules';

export function plan(g: Game, gas = true) {
  for (const id of tray(g)) { const t = g.tickets[id]; if (JOBS[t.job].coupure && t.avis === null) sendAvis(g, id); if (gas && JOBS[t.job].dig && !t.gas) toggleGas(g, id); }
  const pri = (id: string) => { const t = g.tickets[id]; return (JOBS[t.job].urgent ? 0 : t.vip ? 5 : t.rdv ? 10 + t.rdv[0] : 30) + t.risks.length; };
  const ids = tray(g).filter((id) => avail(g, id)).sort((a, b) => pri(a) - pri(b));
  for (const id of ids) {
    let best: { c: typeof TEAM[number]['id']; i: number; cost: number } | null = null;
    for (const c of TEAM) { if (!canDo(c.id, id, g)) continue; const n = g.today!.plan[c.id].length;
      for (let i = 0; i <= n; i++) { assign(g, c.id, id, i); const p = preview(g, c.id);
        const risky = p.reduce((acc, s, k) => acc + (k > 0 && g.tickets[s.id].rdv && p[k - 1].endMax > g.tickets[s.id].rdv![1] ? 1 : 0), 0);
        const bad = risky * 25 + p.filter((s) => s.late).length * 50 + p.filter((s) => s.overflow).length * 30; const end = p.length ? p[p.length - 1].end : 0;
        const me = p.find((s) => s.id === id)!; const urg = JOBS[g.tickets[id].job].urgent ? me.start * 20 : 0;
        const cost = bad + end + urg + p.reduce((s, x) => s + x.travel, 0) * 0.5; unassign(g, id);
        if (!best || cost < best.cost) best = { c: c.id, i, cost }; } }
    if (best) { assign(g, best.c, id, best.i); const p = preview(g, best.c); if (p.some((s) => s.overflow)) unassign(g, id); }
  }
}
export type Policy = (g: Game, card: string) => number;
import { cardOf } from '../src/game';
/** Diligent player: takes the option that keeps the job going (extra slot) over postponing. */
export const safe: Policy = (g) => { const c = cardOf(g.today!.pending[0]); const i = c.choices.findIndex((x) => !x.fx.postpone && (x.fx.slots ?? 0) > 0); return i < 0 ? 0 : i; };
export function playDay(g: Game, policy: Policy = safe, mini: 0 | 1 = 0, gas = true) {
  plan(g, gas); launch(g); let guard = 0;
  while (g.today!.phase === 'run' && guard++ < 500) {
    step(g); const d = g.today!;
    while (d.pending.length) { const p = d.pending[0]; if (p.kind === 'mini') miniResult(g, mini, 'a trouvé le compteur'); else if (choose(g, p.kind === 'safety' ? 0 : policy(g, p.card))) plan(g, gas); }
    if (d.slot >= SLOTS && d.phase !== 'close') break;
  }
  return g.today!;
}
export function playAll(seed = 2026, policy: Policy = safe, mini: 0 | 1 = 0) {
  const g = newGame(seed); startDay(g);
  while (!g.over) { playDay(g, policy, mini); nextDay(g); }
  return g;
}
