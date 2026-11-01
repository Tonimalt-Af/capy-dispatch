// « Si c'était à refaire » (end-of-day replay): replays the day from the launch snapshot with other plans and card answers,
// keeps the best day found, and turns the differences into concrete moves. Every move it shows happened in that better day,
// played by the real game rules (same code as the day itself): it never suggests something impossible.
// The same search drives tests/search.ts (the « 3 stars every day » proof).
import { TEAM, JOBS, CAPY, VIPS, DAYS_SPEC, RISK_CARDS, objText, type CapyId } from './content';
import { tray, assign, unassign, preview, sendAvis, toggleGas, canDo, avail, launch, step, choose, miniResult, closeDay, cardOf, specOf, rng, rue, type Game, type DayState } from './game';
import { slotLabel, URGENT_TARGET } from './rules';

type R = () => number;
/** Greedy placement with noise: t = 0 is the plain greedy dispatcher. */
export function noisyPlan(g: Game, r: R, t: number, skip = 0) {
  for (const id of tray(g)) { const k = g.tickets[id]; if (JOBS[k.job].coupure && k.avis === null) sendAvis(g, id); if (JOBS[k.job].dig && !k.gas) toggleGas(g, id); }
  const pri = (id: string) => { const k = g.tickets[id]; return (JOBS[k.job].urgent ? 0 : k.vip ? 5 : k.rdv ? 10 + k.rdv[0] : 30) + k.risks.length + (r() - 0.5) * 40 * t; };
  const P = new Map(tray(g).map((id) => [id, pri(id)])); const ids = [...P.keys()].filter((id) => avail(g, id)).sort((a, b) => P.get(a)! - P.get(b)!);
  for (const id of ids) {
    if (!JOBS[g.tickets[id].job].urgent && r() < skip) continue;
    let best: { c: CapyId; i: number; cost: number } | null = null;
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
/** One try at a day from its planning phase: returns the closed day (not yet nextDay). keep = start from the plan already on the board. */
export function tryDay(g0: Game, seed: number, t: number, cardRand: number, skip: number, mini: 0 | 1 = 1, keep = false): Game {
  const g = structuredClone(g0); const r = rng(seed);
  if (!keep) for (const c of TEAM) g.today!.plan[c.id] = [];
  noisyPlan(g, r, t, skip); launch(g); let guard = 0;
  while (g.today!.phase === 'run' && guard++ < 500) { step(g); const d = g.today!;
    while (d.pending.length) { const p = d.pending[0]; if (p.kind === 'mini') { miniResult(g, mini, 'a trouvé le compteur'); continue; }
      const c = cardOf(p); let i = 0;
      if (p.kind !== 'safety' && c.choices.length > 1) { if (r() < cardRand) i = Math.floor(r() * c.choices.length); else { i = c.choices.findIndex((x) => !x.fx.postpone && (x.fx.slots ?? 0) > 0); if (i < 0) i = 0; } }
      choose(g, i); replan(g, r, t, skip); } }
  if (g.today!.phase !== 'close') closeDay(g); return g;
}

// ---------------------------------------------------------------- hindsight
export type FixKind = 'rdv' | 'urgent' | 'left' | 'travel' | 'leak' | 'yield' | 'sat' | 'gas' | 'vip' | 'card';
export interface Fix { kind: FixKind; text: string; /** where the better day did it (for the ghost on the planning) */ capy?: CapyId; at?: number; end?: number; ticket?: string }
export interface Hindsight { stars: number; fixes: Fix[]; best: Game | null }
const whoOf = (t: { who: string }) => t.who.split(' (')[0].split(' · ')[0];
const doneAt = (d: DayState, id: string) => { for (const c of TEAM) { const h = d.hist[c.id].find((x) => x[0] === id); if (h) return { capy: c.id, at: h[1], end: h[2] }; } return null; };
const capyOf = (d: DayState, id: string) => doneAt(d, id)?.capy;
/** How far the better day is from what the player did (fewer changes = an easier lesson). */
function distance(a: DayState, b: DayState) { let n = 0; for (const c of TEAM) for (const [id] of b.hist[c.id]) if (capyOf(a, id) !== c.id) n++; return n; }
/** Search budget: a few tries keep the player's own plan (smallest fix), the others start fresh. */
export function* searchDay(m0: Game, budget = 48): Generator<number, Game | null> {
  let best: Game | null = null; let bs = -Infinity; const actual = m0.today!;
  for (let k = 0; k < budget; k++) {
    const keep = k % 3 === 0; const h = tryDay(m0, m0.seed * 7919 + m0.day * 104729 + k * 31 + 5, k < 3 ? 0 : Math.min(1, (k / budget) * 1.5), k < 3 ? 0.15 * k : 0.35, k < 6 ? 0 : (k % 5) * 0.06, 1, keep);
    const d = h.today!; const s = d.stars! * 1000 + d.met!.filter(Boolean).length * 100 - distance(actual, d) * (keep ? 0.5 : 1) + h.sat * 0.1;
    if (s > bs) { bs = s; best = h; }
    if (k % 4 === 3) yield k + 1;
  }
  return best;
}
/** Turn the better day into at most 3 moves, each about one thing that cost the player a star. */
export function explain(end: Game, best: Game | null): Hindsight {
  const A = end.today!, spec = specOf(end, A.day); if (!best || best.today!.stars! <= A.stars!) return { stars: A.stars!, fixes: [], best: null };
  const B = best.today!; const T = (id: string) => best.tickets[id] ?? end.tickets[id]; const fixes: Fix[] = []; const used = new Set<string>();
  const name = (c: CapyId) => CAPY[c].name; const job = (id: string) => `${JOBS[T(id).job].short} ${rue(T(id).site)}`;
  const at = (id: string) => doneAt(B, id);
  const push = (f: Fix) => { if (f.ticket && used.has(f.ticket)) return; if (f.ticket) used.add(f.ticket); if (!fixes.some((x) => x.text === f.text)) fixes.push(f); };
  const jobFix = (kind: FixKind, id: string, tpl: (c: string, h: string) => string) => { const w = at(id); if (!w) return false; push({ kind, text: tpl(name(w.capy), slotLabel(w.at)), capy: w.capy, at: w.at, end: w.end, ticket: id }); return true; };
  if (A.incidents && !B.incidents) push({ kind: 'gas', text: 'Appeler le gaz avant de creuser (le petit téléphone sur le bloc) : sans ça, pas plus d’une étoile.' });
  for (const [id, k] of Object.entries(A.vip ?? {})) { const v = T(id).vip; if (v && VIPS[v][k].star && B.vip?.[id] && !VIPS[v][B.vip[id]].star) jobFix('vip', id, (c, h) => `${VIPS[v].tag} : ${c} pouvait commencer à ${h}, avant que ça ne coûte une étoile.`); }
  spec.objs.forEach((o, j) => { if (A.met![j] || !B.met![j]) return;
    if (o.id === 'rdv') { const missed = [...new Set([...A.rdvMissed, ...A.rdvToday.filter((id) => !A.rdvKept.includes(id) && !A.absentOk.includes(id))])]; for (const id of missed) if (B.rdvKept.includes(id) && jobFix('rdv', id, (c, h) => `RDV de ${whoOf(T(id))} : ${c} pouvait y être à ${h}.`)) break; }
    if (o.id === 'urgent') { const ids = Object.keys(A.urgent).filter((id) => A.urgent[id] > URGENT_TARGET).concat(Object.keys(B.urgent).filter((id) => A.urgent[id] === undefined)); for (const id of ids) if (B.urgent[id] !== undefined && B.urgent[id] <= URGENT_TARGET && jobFix('urgent', id, (c, h) => `${job(id)} : ${c} pouvait commencer à ${h}, ${B.urgent[id] ? `${B.urgent[id]} h après l’appel` : 'tout de suite'}.`)) break; }
    if (o.id === 'done' || o.id === 'backlog') { const old = (id: string) => o.id === 'done' || end.day - T(id).day > (o.n ?? 2);
      const more = TEAM.flatMap((c) => B.hist[c.id].map((x) => x[0])).filter((id) => !A.done.includes(id) && old(id)); for (const id of more.slice(0, 1)) jobFix('left', id, (c, h) => `${c} avait le temps pour ${job(id)}, à ${h}.`); }
    if (o.id === 'travel') { const tr = (d: DayState, c: CapyId) => (d.trips ?? []).filter((x) => x[0] === c).reduce((s, x) => s + x[2], 0);
      const c = [...TEAM].sort((a, b) => (tr(B, a.id) - tr(A, a.id)) - (tr(B, b.id) - tr(A, b.id)))[0].id; const seq = B.hist[c].map((x) => rue(T(x[0]).site));
      push({ kind: 'travel', text: `${A.travel} h de route, ${B.travel} h suffisaient : ${name(c)} pouvait enchaîner ${seq.slice(0, 3).join(', ')}${seq.length > 3 ? '…' : ''}.`, capy: c }); }
    if (o.id === 'm3' || o.id === 'yield') { const val = (id: string) => (JOBS[T(id).job].fix ?? 0) + (JOBS[T(id).job].leak ?? 0) * 15;
      const ids = TEAM.flatMap((c) => B.hist[c.id].map((x) => x[0])).filter((id) => val(id) && (!A.done.includes(id) || (doneAt(A, id)?.at ?? 99) > at(id)!.at)).sort((a, b) => val(b) - val(a));
      for (const id of ids.slice(0, 1)) jobFix(o.id === 'm3' ? 'leak' : 'yield', id, (c, h) => `${job(id)} : ${c} pouvait ${A.done.includes(id) ? 's’y mettre plus tôt' : 's’en charger'}, à ${h}${JOBS[T(id).job].fix ? ` (${JOBS[T(id).job].fix} m³ par jour en moins)` : ''}.`); }
    if (o.id === 'sat') { let ok = false; for (const [id, k] of Object.entries(B.vip ?? {})) { const v = T(id).vip!; const a = A.vip?.[id]; if (a && VIPS[v][k].sat > VIPS[v][a].sat) { ok = jobFix('sat', id, (c, h) => `${VIPS[v].tag} : ${c} à ${h}, ${VIPS[v][k].sat > 0 ? `+${VIPS[v][k].sat}` : VIPS[v][k].sat} d’abonnés au lieu de ${VIPS[v][a].sat > 0 ? '+' : ''}${VIPS[v][a].sat}.`); if (ok) break; } }
      if (!ok) { const missed = A.rdvToday.filter((id) => !A.rdvKept.includes(id) && !A.absentOk.includes(id) && B.rdvKept.includes(id)); for (const id of missed) if (jobFix('sat', id, (c, h) => `RDV de ${whoOf(T(id))} tenu (${c} à ${h}) : les abonnés comptent sur nous.`)) { ok = true; break; } } }
  });
  // one card answered differently in the better day (only when it changed the mood or the time on the job)
  if (fixes.length < 3) { const seen = new Map<string, number>(); for (const [c, i] of A.picks ?? []) if (!seen.has(c)) seen.set(c, i);
    for (const [c, i] of B.picks ?? []) { const a = seen.get(c); if (a === undefined || a === i || c === 'safety') continue; const card = cardOf({ card: c, kind: c in RISK_CARDS ? 'risk' : 'event', capy: null, ticket: null }); const ch = card.choices[i];
      if (!ch || card.choices.length < 2) continue; push({ kind: 'card', text: `Carte « ${card.title} » : « ${ch.label} ».` }); break; } }
  // nothing specific: the first job the better day placed differently (a real move of that day)
  if (!fixes.length) for (const c of TEAM) { const h = B.hist[c.id].find(([id, s0]) => { const a = doneAt(A, id); return !a || a.capy !== c.id || a.at !== s0; });
    if (h) { jobFix('left', h[0], (n, t) => `${job(h[0])} : ${n}, à ${t}.`); break; } }
  return { stars: B.stars!, fixes: fixes.slice(0, 3), best };
}
/** Synchronous helper (tests, Node): search then explain. */
export function hindsight(m0: Game, end: Game, budget = 48): Hindsight { const it = searchDay(m0, budget); let r = it.next(); while (!r.done) r = it.next(); return explain(end, r.value); }
export const objShort = (day: number, j: number, g?: Game) => objText((g ? specOf(g, day) : DAYS_SPEC[day]).objs[j]);
