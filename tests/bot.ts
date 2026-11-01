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
        const urg = p.reduce((acc, s) => acc + (JOBS[g.tickets[s.id].job].urgent ? s.start * 20 : 0), 0);
        const cost = bad + end + urg + p.reduce((s, x) => s + x.travel, 0) * 0.5; unassign(g, id);
        if (!best || cost < best.cost) best = { c: c.id, i, cost }; } }
    if (best) { assign(g, best.c, id, best.i); let p = preview(g, best.c); let k = 0;
      // overflow: an urgent ticket bumps the last non-urgent job of the queue to tomorrow; otherwise it waits
      while (p.some((s) => s.overflow) && k++ < 4) { const cand = [...p].reverse().filter((s) => s.id !== id && !JOBS[g.tickets[s.id].job].urgent && pri(s.id) > pri(id) && g.today!.plan[best!.c].includes(s.id)); const vict = cand.find((s) => !g.tickets[s.id].rdv) ?? cand[0]; if (!vict) { unassign(g, id); break; } unassign(g, vict.id); p = preview(g, best.c); } }
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

// ---------------------------------------------------------------- three players for the balance report (obvious / optimised / random)
import { rng, closeDay } from '../src/game';
export type Kind = 'obvious' | 'opt' | 'random';
/** The obvious plan: what the ticket colours say. Red urgent tickets first (top of the specialist's queue), then the tray in order, each to its specialist or the next capy when that row is full, at the end of the queue; first choice on every card. */
export function planObvious(g: Game) {
  for (const id of tray(g)) { const t = g.tickets[id]; if (JOBS[t.job].coupure && t.avis === null) sendAvis(g, id); if (JOBS[t.job].dig && !t.gas) toggleGas(g, id); }
  for (const id of tray(g).filter((id) => avail(g, id)).sort((a, b) => (JOBS[g.tickets[b].job].urgent ? 1 : 0) - (JOBS[g.tickets[a].job].urgent ? 1 : 0))) { const J = JOBS[g.tickets[id].job];
    // its specialist first; when that row is full, the next capy who can; else it waits
    const cs = TEAM.filter((x) => canDo(x.id, id, g)).sort((a, b) => (a.main === J.skill ? 0 : 1) - (b.main === J.skill ? 0 : 1));
    for (const c of cs) { assign(g, c.id, id, J.urgent ? 0 : undefined); if (J.urgent || !preview(g, c.id).some((s) => s.overflow)) break; unassign(g, id); } }
}
export function planRandom(g: Game, r: () => number) {
  for (const id of tray(g)) { const t = g.tickets[id]; if (JOBS[t.job].coupure && t.avis === null && r() < 0.5) sendAvis(g, id); if (JOBS[t.job].dig && !t.gas) toggleGas(g, id); }
  for (const id of tray(g).filter((id) => avail(g, id))) { if (r() < 0.15) continue; const cs = TEAM.filter((x) => canDo(x.id, id, g)); if (!cs.length) continue; const c = cs[Math.floor(r() * cs.length)]; assign(g, c.id, id, Math.floor(r() * (g.today!.plan[c.id].length + 1))); }
}
const score = (g: Game) => { const d = g.today!; return (d.stars ?? 0) * 1000 + (d.met ?? []).filter(Boolean).length * 10 + g.sat - (d.m3 + (d.night ?? 0)) * 0.3; };
function finishGreedy(g: Game) { let guard = 0; while (g.today!.phase === 'run' && guard++ < 500) { step(g); const d = g.today!; while (d.pending.length) { const p = d.pending[0]; if (p.kind === 'mini') miniResult(g, 1, 'a trouvé le compteur'); else if (choose(g, p.kind === 'safety' ? 0 : safe(g, p.card))) plan(g); } } if (g.today!.phase !== 'close') closeDay(g); return score(g); }
/** Optimised card choice: try each option on a copy of the game and finish the day greedily. */
const lookahead: Policy = (g) => { const c = cardOf(g.today!.pending[0]); if (c.choices.length < 2) return 0; let best = 0, bs = -Infinity;
  c.choices.forEach((_, i) => { const h = structuredClone(g); if (choose(h, i)) plan(h); const s = finishGreedy(h); if (s > bs) { bs = s; best = i; } }); return best; };
/** spy: called when a day is planned ('plan'), on every card answered ('card') and when it is closed ('close'). */
export function playKind(seed: number, kind: Kind, spy?: (g: Game, at: 'plan' | 'card' | 'close') => void) {
  const g = newGame(seed); startDay(g); const r = rng(seed * 31 + 7);
  const doPlan = () => { if (kind === 'opt') { if (g.today!.phase === 'run') for (const c of TEAM) for (const s of preview(g, c.id)) if (s.late || s.overflow) unassign(g, s.id); plan(g); } else if (kind === 'obvious') planObvious(g); else planRandom(g, r); };
  while (!g.over) { spy?.(g, 'plan'); doPlan(); launch(g); let guard = 0;
    while (g.today!.phase === 'run' && guard++ < 500) { step(g); const d = g.today!;
      while (d.pending.length) { const p = d.pending[0]; if (p.kind === 'mini') { miniResult(g, kind === 'random' ? (r() < 0.5 ? 1 : 0) : 1, 'a trouvé le compteur'); continue; }
        const n = cardOf(p).choices.length; const i = p.kind === 'safety' ? 0 : kind === 'opt' ? lookahead(g, p.card) : kind === 'obvious' ? 0 : Math.floor(r() * n); spy?.(g, 'card'); choose(g, i); if (kind === 'opt' || g.today!.pending.length === 0) doPlan(); } }
    if (g.today!.phase !== 'close') closeDay(g); spy?.(g, 'close'); nextDay(g); }
  return g;
}
