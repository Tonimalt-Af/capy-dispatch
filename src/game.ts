// Game state and rules: tickets, planning preview, slot-by-slot resolution, cards, day close and scoring.
// Pure TypeScript (no DOM): everything here is covered by the Vitest suite.
import { JOBS, TEAM, CAPY, slotsFor, RISK_CARDS, EVENTS, DAYS_SPEC, ABONNES, objText, type JobId, type Risk, type CapyId, type Card, type Effect, type Obj, PREFET } from './content';
import { SITES, SITE_GROUPS, PREFET_SITE, dist, DEPOT, labelXY } from './map';
import { SLOTS, TRAVEL_M, URGENT_TARGET, NIGHT_SLOTS, SECTOR_M3, START_YIELD, SAFETY_RULE, DAYS, type SafetyRule } from './rules';

export const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export interface Ticket {
  id: string; job: JobId; site: number; num: number; who: string; risks: Risk[];
  /** RDV window: the job must START in [a, b] (slot indexes) */ rdv: [number, number] | null;
  day: number; /** slot the call came in (urgent delay counts from here); 0 = at the briefing */ slot: number;
  /** day the 48 h cut notice was sent */ avis: number | null; /** first day it can be planned (null = waiting for the notice) */ avail: number | null;
  deadline: number | null; gas: boolean; tries: number; prefet?: boolean;
  /** phase 2 hooks, data only */ side: 'avant' | 'apres' | 'na'; habilitation: string | null;
}
export interface CapyRun { pos: number; job: string | null; left: number; travel: number; target: string | null; started: number; extra: number }
export interface Pending { card: string; kind: 'risk' | 'event' | 'safety' | 'mini'; capy: CapyId | null; ticket: string | null }
export interface DayState {
  day: number; slot: number; phase: 'briefing' | 'plan' | 'run' | 'close';
  /** inside a slot: 'start' = cards of this slot not yet handled */ sub: 'start' | 'mid';
  plan: Record<CapyId, string[]>; capys: Record<CapyId, CapyRun>; pending: Pending[];
  done: string[]; postponed: string[]; absentOk: string[]; m3: number; night: number; travel: number; incidents: number;
  urgent: Record<string, number>; rdvToday: string[]; rdvKept: string[]; rdvMissed: string[];
  satStart: number; fired: number[]; log: string[]; replan: boolean; stars?: number; met?: boolean[];
  /** finished work per capy, for the timeline: [ticket, start slot, end slot] */ hist: Record<CapyId, [string, number, number][]>;
}
export interface DayResult { day: number; stars: number; met: boolean[]; m3: number; yield: number; done: number; incidents: number; sat: number; rdvKept: number; rdvTotal: number }
export interface Game { v: 1; seed: number; day: number; tickets: Record<string, Ticket>; pile: string[]; sat: number; bg: number; history: DayResult[]; today: DayState | null; stickers: string[]; next: number; over: boolean; /** overnight news shown at the next briefing */ news: string[] }

export const BG0 = Math.round(SECTOR_M3 * (1 / START_YIELD - 1)); // background losses giving the real starting yield
export const newGame = (seed = 2026): Game => ({ v: 1, seed, day: 0, tickets: {}, pile: [], sat: 60, bg: BG0, history: [], today: null, stickers: [], next: 1, over: false, news: [] });
const clampSat = (s: number) => Math.max(0, Math.min(100, s));
const HALLES = labelXY('halles');
const nearHalles = (site: number) => !!HALLES && Math.hypot(SITES[site].x - HALLES.x, SITES[site].y - HALLES.y) < 230;

// ---------------------------------------------------------------- tickets
function pickSite(g: Game, r: () => number, near: number | null): number {
  // one open ticket per street node (pins never stack) and 25 m between open tickets
  const used = g.pile.map((id) => SITES[g.tickets[id].site]);
  const pick = () => { const grp = SITE_GROUPS[Math.floor(r() * SITE_GROUPS.length)]; return grp[Math.floor(r() * grp.length)]; };
  for (let k = 0; k < 200; k++) {
    const s = pick(); const S = SITES[s];
    if (used.some((u) => u.node === S.node || Math.hypot(u.x - S.x, u.y - S.y) < 25)) continue;
    if (near !== null && Math.hypot(S.x - SITES[near].x, S.y - SITES[near].y) > 380 && k < 150) continue;
    return s;
  }
  return pick();
}
export function makeTicket(g: Game, job: JobId, r: () => number, opts: { slot?: number; risks?: Risk[]; rdv?: [number, number] | null; near?: number | null } = {}): Ticket {
  const J = JOBS[job]; const site = pickSite(g, r, opts.near ?? null);
  const risks = [...(opts.risks ?? [])];
  if (J.dig && SITES[site].narrow && !risks.includes('ruelle')) risks.push('ruelle');
  const t: Ticket = { id: 't' + g.next++, job, site, num: SITES[site].num, who: ABONNES[Math.floor(r() * ABONNES.length)], risks, rdv: opts.rdv ?? null, day: g.day, slot: opts.slot ?? 0,
    avis: null, avail: J.coupure ? null : g.day, deadline: J.coupure ? g.day + 4 : null, gas: false, tries: 0, side: J.side, habilitation: J.habilitation };
  g.tickets[t.id] = t; g.pile.push(t.id); return t;
}
const RDV_WINDOWS: [number, number][] = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [3, 4]];
/** Briefing: create the scripted tickets of the day (deterministic per seed + day). */
export function startDay(g: Game) {
  const spec = DAYS_SPEC[g.day]; const r = rng(g.seed * 1000 + g.day * 977 + 13);
  const centers = [Math.floor(r() * SITES.length), Math.floor(r() * SITES.length)];
  let rdvLeft = spec.rdv; let w = Math.floor(r() * RDV_WINDOWS.length);
  for (const j of spec.jobs) {
    const [job, ...risks] = (Array.isArray(j) ? j : [j]) as [JobId, ...Risk[]];
    const wantsRdv = (job === 'prc' && rdvLeft > 0) || risks.includes('absent');
    const rdv = wantsRdv ? RDV_WINDOWS[w++ % RDV_WINDOWS.length] : null; if (wantsRdv) rdvLeft--;
    makeTicket(g, job, r, { risks, rdv, near: r() < 0.65 ? centers[Math.floor(r() * 2)] : null });
  }
  if (spec.card === 'orage') { /* the two storm leaks are in the spec */ }
  const plan = { josette: [], momo: [], lulu: [] } as Record<CapyId, string[]>;
  const capys = Object.fromEntries(TEAM.map((c) => [c.id, { pos: DEPOT, job: null, left: 0, travel: 0, target: null, started: -1, extra: 0 }])) as Record<CapyId, CapyRun>;
  const rdvToday = g.pile.filter((id) => g.tickets[id].rdv && avail(g, id));
  g.today = { day: g.day, slot: 0, phase: 'briefing', sub: 'start', plan, capys, pending: [], done: [], postponed: [], absentOk: [], m3: 0, night: 0, travel: 0, incidents: 0, urgent: {}, rdvToday, rdvKept: [], rdvMissed: [], satStart: g.sat, fired: [], log: [], replan: false, hist: { josette: [], momo: [], lulu: [] } };
}
export const avail = (g: Game, id: string) => { const t = g.tickets[id]; return t.avail !== null && t.avail <= g.day; };
/** Tickets that can be dragged onto the planning now (open, available, not planned, not running). */
export function tray(g: Game): string[] {
  const d = g.today!; const planned = new Set(Object.values(d.plan).flat()); const running = new Set(Object.values(d.capys).map((c) => c.job));
  return g.pile.filter((id) => !planned.has(id) && !running.has(id) && !d.done.includes(id) && !d.postponed.includes(id))
    .sort((a, b) => score(g, b) - score(g, a));
}
const score = (g: Game, id: string) => { const t = g.tickets[id]; const J = JOBS[t.job]; return (J.urgent ? 100 : 0) + (t.avail === null ? -50 : avail(g, id) ? 0 : -80) + (t.rdv ? 20 - t.rdv[0] : 0) + (g.day - t.day) * 3; };
export function sendAvis(g: Game, id: string) { const t = g.tickets[id]; if (!JOBS[t.job].coupure || t.avis !== null) return false; t.avis = g.day; t.avail = g.day + 2; return true; }
export function toggleGas(g: Game, id: string) { const t = g.tickets[id]; if (!JOBS[t.job].dig) return; t.gas = !t.gas; }

// ---------------------------------------------------------------- planning preview
export interface Slot { id: string; travel: number; start: number; end: number; endMax: number; late: boolean; early: boolean; overflow: boolean; noGas: boolean; cannot: boolean }
export const travelCost = (g: Game, from: number, site: number) => {
  if (from === DEPOT) return 0; // prise de poste: the drive to the first job is part of the 7h30 start
  const card = DAYS_SPEC[g.day]?.card; const m = dist(from, SITES[site].node);
  if (card === 'marche' && nearHalles(site) && !(from !== DEPOT && SITES.some((s, i) => s.node === from && nearHalles(i)))) return 1;
  return m > TRAVEL_M ? 1 : 0;
};
export const maxExtra = (t: Ticket) => t.risks.length + (JOBS[t.job].minigame ? 1 : 0);
/** Where a capy is free again and from which node, given its current run state at slot `s`. */
export function freeAt(g: Game, c: CapyId): { at: number; pos: number } {
  const d = g.today!; const cr = d.capys[c];
  if (cr.job) return { at: d.slot + cr.left, pos: SITES[g.tickets[cr.job].site].node }; // left counts the current slot
  if (cr.travel && cr.target) return { at: d.slot + cr.travel, pos: SITES[g.tickets[cr.target].site].node }; // the trip under way is committed
  return { at: d.slot + (d.sub === 'mid' ? 1 : 0), pos: cr.pos };
}
export function preview(g: Game, c: CapyId, order = g.today!.plan[c]): Slot[] {
  const cap = CAPY[c]; let { at, pos } = freeAt(g, c); const out: Slot[] = [];
  for (const id of order) {
    const t = g.tickets[id]; const J = JOBS[t.job]; const n = slotsFor(cap, J);
    const tr = travelCost(g, pos, t.site); let start = at + tr; let early = false;
    if (t.rdv && start < t.rdv[0]) { start = t.rdv[0]; early = true; }
    const dur = n ?? 1; const end = start + dur;
    out.push({ id, travel: tr, start, end, endMax: end + maxExtra(t), late: !!t.rdv && start > t.rdv[1], early, overflow: end > SLOTS, noGas: !!J.dig && !t.gas, cannot: n === null });
    at = end; pos = SITES[t.site].node;
  }
  return out;
}
export const canDo = (c: CapyId, id: string, g: Game) => slotsFor(CAPY[c], JOBS[g.tickets[id].job]) !== null;
export function assign(g: Game, c: CapyId, id: string, index?: number) {
  const d = g.today!; if (!canDo(c, id, g) || !avail(g, id)) return false;
  for (const k of TEAM) d.plan[k.id] = d.plan[k.id].filter((x) => x !== id);
  const q = d.plan[c]; q.splice(index === undefined ? q.length : Math.max(0, Math.min(index, q.length)), 0, id); return true;
}
export function unassign(g: Game, id: string) { const d = g.today!; for (const k of TEAM) d.plan[k.id] = d.plan[k.id].filter((x) => x !== id); }
export function move(g: Game, id: string, delta: number) { const d = g.today!; for (const k of TEAM) { const q = d.plan[k.id]; const i = q.indexOf(id); if (i >= 0) { const j = Math.max(0, Math.min(q.length - 1, i + delta)); q.splice(i, 1); q.splice(j, 0, id); return; } } }
/** Index in a capy's queue for a tap/drop on slot `slot` (insert before the first job that starts at or after it). */
export function indexForSlot(g: Game, c: CapyId, slot: number) { const p = preview(g, c); const i = p.findIndex((s) => s.start + (s.end - s.start) / 2 > slot); return i < 0 ? p.length : i; }
export interface Warn { level: 'red' | 'orange'; text: string }
export function warnings(g: Game, rule: SafetyRule = SAFETY_RULE): Warn[] {
  const w: Warn[] = [];
  for (const c of TEAM) for (const s of preview(g, c.id)) {
    const t = g.tickets[s.id]; const name = `${JOBS[t.job].short} (${c.name})`;
    if (s.noGas) w.push({ level: 'red', text: `${name} : pas d'appel à l'exploitant gaz avant de creuser${rule === 'cap1' ? ' → journée plafonnée à 1 étoile' : ''}` });
    if (s.late) w.push({ level: 'red', text: `${name} : RDV manqué (arrivée après ${slotH(t.rdv![1])})` });
    if (s.overflow) w.push({ level: 'orange', text: `${name} : finit après 17 h, sera reporté` });
    else if (s.endMax > SLOTS) w.push({ level: 'orange', text: `${name} : peut déborder après 17 h si un risque tombe` });
  }
  const urgent = g.pile.filter((id) => JOBS[g.tickets[id].job].urgent && avail(g, id) && !g.today!.done.includes(id) && !Object.values(g.today!.plan).flat().includes(id) && !Object.values(g.today!.capys).some((c) => c.job === id));
  for (const id of urgent) w.push({ level: 'orange', text: `${JOBS[g.tickets[id].job].short} pas encore planifiée : l'eau coule` });
  return w;
}
const slotH = (s: number) => `${s < 4 ? 8 + s : 9 + s} h`; // 8 = end of the day (17 h)
export const canLaunch = (g: Game, rule: SafetyRule = SAFETY_RULE) => rule === 'cap1' || !TEAM.some((c) => preview(g, c.id).some((s) => s.noGas));

// ---------------------------------------------------------------- resolution
const log = (d: DayState, s: string, at = d.slot) => { d.log.push(`${slotH(at)} · ${s}`); if (d.log.length > 60) d.log.shift(); };
export function launch(g: Game) { const d = g.today!; d.phase = 'run'; d.replan = false; }
/** Begin the current slot: scripted events, capys pick their next job. Returns the cards to play (also kept in d.pending). */
export function beginSlot(g: Game) {
  const d = g.today!; if (d.sub !== 'start' || d.phase !== 'run') return d.pending; const s = d.slot; const spec = DAYS_SPEC[d.day];
  for (const c of TEAM) {
    const cr = d.capys[c.id]; if (cr.job || cr.travel) continue;
    // next job in the queue: travel first, wait for the RDV window, then start
    while (d.plan[c.id].length) {
      const id = d.plan[c.id][0]; const t = g.tickets[id];
      if (!avail(g, id) || d.done.includes(id)) { d.plan[c.id].shift(); continue; }
      const tr = cr.target === id ? 0 : travelCost(g, cr.pos, t.site);
      if (tr) { cr.travel = tr; cr.target = id; d.travel += tr; break; }
      if (t.rdv && s < t.rdv[0]) { cr.target = id; break; }
      d.plan[c.id].shift(); cr.job = id; cr.target = null; cr.pos = SITES[t.site].node; cr.left = slotsFor(c, JOBS[t.job])!; cr.started = s; cr.extra = 0; t.tries++;
      const J = JOBS[t.job];
      if (J.urgent) d.urgent[id] = s - (t.day === d.day ? t.slot : 0);
      if (t.rdv) { if (s > t.rdv[1]) { d.rdvMissed.push(id); g.sat = clampSat(g.sat - 4); log(d, `${c.name} arrive en retard au RDV de ${t.who}`); } else if (!d.rdvToday.includes(id)) d.rdvToday.push(id); }
      log(d, `${c.name} commence : ${J.short}, ${t.num} ${SITES[t.site].street}`);
      if (J.dig && !t.gas) d.pending.push({ card: 'safety', kind: 'safety', capy: c.id, ticket: id });
      for (const r of t.risks) d.pending.push({ card: r, kind: 'risk', capy: c.id, ticket: id });
      if (J.minigame) d.pending.push({ card: 'compteur', kind: 'mini', capy: c.id, ticket: id });
      break;
    }
  }
  for (const [at, ev] of spec.events) {
    if (at > s || d.fired.includes(at)) continue;
    const card = EVENTS[ev]; const target = targetFor(g, card);
    if (target === undefined) { if (s >= SLOTS - 1) d.fired.push(at); continue; } // not playable yet (nobody digging...): try next slot
    d.fired.push(at); d.pending.push({ card: ev, kind: 'event', capy: target?.capy ?? null, ticket: target?.ticket ?? null });
  }
  d.sub = 'mid'; return d.pending;
}
function targetFor(g: Game, card: Card): { capy: CapyId; ticket: string } | null | undefined {
  const d = g.today!; if (card.needs === 'none') return null;
  for (const c of TEAM) { const cr = d.capys[c.id];
    if (card.needs === 'travel' && cr.travel && cr.target) return { capy: c.id, ticket: cr.target };
    if ((card.needs === 'job' || card.needs === 'dig') && cr.job && cr.left > 0 && (card.needs === 'job' || JOBS[g.tickets[cr.job].job].dig)) return { capy: c.id, ticket: cr.job }; }
  return undefined;
}
export const SAFETY_CARD: Card = { id: 'safety', title: 'Chantier arrêté : appel gaz manquant', who: 'chef', needs: 'dig', text: "Avant d'ouvrir la chaussée, on appelle l'exploitant du réseau gaz pour connaître les conduites. Personne ne l'a fait. Le chef d'équipe arrête tout, on appelle maintenant.", choices: [
  { label: 'Appeler et attendre les consignes', hint: '+1 créneau · incident sécurité : journée plafonnée à 1 étoile', fx: { slots: 1, log: "a appelé l'exploitant gaz après coup (incident sécurité)" } }] };
export function cardOf(p: Pending): Card { return p.kind === 'safety' ? SAFETY_CARD : p.kind === 'risk' ? RISK_CARDS[p.card as Risk] : EVENTS[p.card]; }
/** Apply the player's choice on the first pending card. Returns the ticket created, if any (the UI then opens the replanning). */
export function choose(g: Game, i: number): Ticket | null {
  const d = g.today!; const p = d.pending.shift(); if (!p) return null; const card = cardOf(p); const fx: Effect = (card.choices[i] ?? card.choices[0]).fx;
  const who = p.capy ? CAPY[p.capy].name + ' ' : '';
  if (p.kind === 'safety') { d.incidents++; g.tickets[p.ticket!].gas = true; }
  if (p.kind === 'risk' && p.card === 'absent' && fx.postpone) d.absentOk.push(p.ticket!);
  if (p.kind === 'risk' && p.card === 'absent' && !fx.postpone && p.ticket && !d.rdvMissed.includes(p.ticket)) { /* RDV kept after a call */ }
  if (fx.sat) g.sat = clampSat(g.sat + fx.sat);
  if (fx.bonus && !g.stickers.includes(fx.bonus)) g.stickers.push(fx.bonus);
  if (p.capy && p.ticket) { const cr = d.capys[p.capy];
    if (fx.postpone) {
      if (cr.job === p.ticket) { cr.job = null; cr.left = 0; }
      d.pending = d.pending.filter((x) => x.ticket !== p.ticket); postpone(g, p.ticket);
    } else if (fx.slots) { if (card.needs === 'travel') { cr.travel += fx.slots; d.travel += fx.slots; } else { cr.left += fx.slots; cr.extra += fx.slots; } }
  }
  log(d, (p.capy ? who : '') + fx.log);
  if (fx.addTicket) {
    const r = rng(g.seed * 31 + d.day * 101 + d.slot * 7 + g.next);
    const t = makeTicket(g, fx.addTicket, r, { slot: d.slot, rdv: fx.addRdvSoon ? [Math.min(d.slot + 1, SLOTS - 1), Math.min(d.slot + 2, SLOTS - 1)] : null });
    if (p.card === 'prefet') { t.prefet = true; t.who = PREFET; t.risks = []; t.site = PREFET_SITE; t.num = SITES[PREFET_SITE].num; } // Hôtel Forbin de Sainte-Croix; the butler is always home
    if (t.rdv) d.rdvToday.push(t.id);
    d.replan = true; return t;
  }
  return null;
}
/** Mini-game "Trouver le compteur": 0 or 1 extra slot on the job. */
export function miniResult(g: Game, extra: 0 | 1, how: string) {
  const d = g.today!; const p = d.pending.shift(); if (!p || p.kind !== 'mini') return; const cr = d.capys[p.capy!];
  if (extra) { cr.left += 1; cr.extra += 1; } log(d, `${CAPY[p.capy!].name} ${how}`);
}
function postpone(g: Game, id: string) { const d = g.today!; const t = g.tickets[id]; d.postponed.push(id); t.avail = g.day + 1;
  if (t.rdv) t.rdv = RDV_WINDOWS[(t.num + t.tries) % RDV_WINDOWS.length]; }
/** End the current slot: work, leaks, completions. Moves to the next slot (or the day close). */
export function endSlot(g: Game) {
  const d = g.today!; if (d.sub !== 'mid' || d.pending.length) return;
  for (const c of TEAM) { const cr = d.capys[c.id];
    if (cr.travel) { cr.travel--; if (!cr.travel && cr.target) cr.pos = SITES[g.tickets[cr.target].site].node; continue; }
    if (cr.job) { cr.left--; if (cr.left <= 0) complete(g, c.id); } }
  d.m3 += leakingNow(g);
  d.slot++; d.sub = 'start';
  if (d.slot >= SLOTS) closeDay(g);
}
export const leakingNow = (g: Game) => g.pile.reduce((s, id) => { const t = g.tickets[id]; const L = JOBS[t.job].leak ?? 0; if (!L || g.today!.done.includes(id)) return s; if (t.day === g.today!.day && t.slot > g.today!.slot) return s; return s + L; }, 0);
function complete(g: Game, c: CapyId) {
  const d = g.today!; const cr = d.capys[c]; const id = cr.job!; const t = g.tickets[id]; const J = JOBS[t.job];
  d.done.push(id); g.pile = g.pile.filter((x) => x !== id); d.hist[c].push([id, cr.started, d.slot + 1]); cr.job = null; cr.left = 0;
  if (J.fix) g.bg = Math.max(0, g.bg - J.fix);
  if (t.rdv && !d.rdvMissed.includes(id)) d.rdvKept.push(id);
  g.sat = clampSat(g.sat + (t.rdv && !d.rdvMissed.includes(id) ? 1 : 0) + (J.urgent ? 1 : 0));
  log(d, `${CAPY[c].name} a terminé : ${J.short} ✓`, d.slot + 1);
}
/** Run until something needs the player (a card) or the slot ends. */
export function step(g: Game) { const d = g.today!; if (d.phase !== 'run') return; if (d.sub === 'start') beginSlot(g); if (!d.pending.length) endSlot(g); }

// ---------------------------------------------------------------- day close
export function evalObj(g: Game, o: Obj): boolean {
  const d = g.today!;
  switch (o.id) {
    case 'urgent': { const ids = new Set([...Object.keys(d.urgent), ...g.pile.filter((id) => JOBS[g.tickets[id].job].urgent && avail(g, id))]); return [...ids].every((id) => d.urgent[id] !== undefined && d.urgent[id] <= URGENT_TARGET); }
    case 'rdv': return d.rdvMissed.length === 0 && d.rdvToday.every((id) => d.rdvKept.includes(id) || d.absentOk.includes(id));
    case 'done': return d.done.length >= (o.n ?? 0);
    case 'm3': return d.m3 < (o.n ?? 0);
    case 'backlog': return !g.pile.some((id) => avail(g, id) && g.day - g.tickets[id].day > 2);
    case 'travel': return d.travel <= (o.n ?? 0);
    case 'sat': return g.sat > d.satStart;
  }
}
export function closeDay(g: Game) {
  const d = g.today!; d.phase = 'close';
  for (const c of TEAM) { const cr = d.capys[c.id]; if (cr.job) log(d, `${c.name} n'a pas fini : ${JOBS[g.tickets[cr.job].job].short} revient demain`); cr.job = null; cr.travel = 0; d.plan[c.id] = []; }
  // missed RDVs: planned too late or not planned at all
  for (const id of d.rdvToday) if (!d.rdvKept.includes(id) && !d.absentOk.includes(id) && !d.rdvMissed.includes(id)) { d.rdvMissed.push(id); g.sat = clampSat(g.sat - 3); const t = g.tickets[id]; if (g.pile.includes(id)) t.rdv = RDV_WINDOWS[(t.num + t.tries + 1) % RDV_WINDOWS.length]; }
  const spec = DAYS_SPEC[d.day]; d.met = spec.objs.map((o) => evalObj(g, o));
  let stars = d.met.filter(Boolean).length; if (d.incidents > 0) stars = Math.min(stars, 1);
  d.stars = stars;
  d.night = g.pile.reduce((s, id) => s + (JOBS[g.tickets[id].job].leak ?? 0), 0) * NIGHT_SLOTS;
  const lost = g.bg + d.m3 + d.night; const y = SECTOR_M3 / (SECTOR_M3 + lost);
  g.history.push({ day: d.day, stars, met: d.met, m3: d.m3 + d.night, yield: y, done: d.done.length, incidents: d.incidents, sat: g.sat, rdvKept: d.rdvKept.length, rdvTotal: d.rdvToday.length });
}
/** Overnight: deadlines, then the next briefing (or the end of the campaign). */
export function nextDay(g: Game) {
  const d = g.today!; if (d.phase !== 'close') return;
  g.day++; g.today = null; g.news = [];
  for (const id of [...g.pile]) { const t = g.tickets[id];
    if (JOBS[t.job].coupure && t.deadline !== null && g.day > t.deadline) { // the tired valve gave up: it is now an urgent leak
      g.pile = g.pile.filter((x) => x !== id); delete g.tickets[id];
      const r = rng(g.seed + g.day * 7 + t.num); const n = makeTicket(g, 'fuite_bt', r); n.site = t.site; n.num = t.num; n.risks = n.risks.filter((k) => k !== 'ruelle'); if (SITES[t.site].narrow) n.risks.push('ruelle'); n.day = g.day; n.slot = 0; n.avail = g.day; g.sat = clampSat(g.sat - 5); g.news.push(`La vanne ${SITES[t.site].street} a lâché avant la coupure programmée : c'est maintenant une fuite urgente.`); } }
  if (g.day >= DAYS) { g.over = true; return; }
  startDay(g);
}
export const totalStars = (g: Game) => g.history.reduce((s, h) => s + h.stars, 0);
export const yieldNow = (g: Game) => SECTOR_M3 / (SECTOR_M3 + g.bg);
export const avgYield = (g: Game) => (g.history.length ? g.history.reduce((s, h) => s + h.yield, 0) / g.history.length : START_YIELD);
export const objLabels = (day: number) => DAYS_SPEC[day].objs.map(objText);
