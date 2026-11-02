// Game state and rules: tickets, planning preview, slot-by-slot resolution, cards, day close and scoring.
// Pure TypeScript (no DOM): everything here is covered by the Vitest suite.
import { JOBS, TEAM, CAPY, slotsFor, ignoresRisk, RISK_CARDS, EVENTS, DAYS_SPEC, seasonDays, type Season, ABONNES, objText, type JobId, type Risk, type CapyId, type Card, type Effect, type Obj, type DaySpec, PREFET, VIPS, vipOutcome, type VipId } from './content';
import { SITES, PREFET_SITE, dist, DEPOT, labelXY, quarterOf, quarterOfNode, qTravel, GROUPS_BY_Q, MAP_V, QUARTERS } from './map';
import { SLOTS, TRAVEL_M, FESTIVAL_TRAVEL_M, URGENT_TARGET, NIGHT_SLOTS, SECTOR_M3, START_YIELD, SAFETY_RULE, DAYS, slotLabel, DAY_END, type SafetyRule } from './rules';

export const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export interface Ticket {
  id: string; job: JobId; site: number; num: number; who: string; risks: Risk[];
  /** RDV window: the job must START in [a, b] (slot indexes) */ rdv: [number, number] | null;
  day: number; /** slot the call came in (urgent delay counts from here); 0 = at the briefing */ slot: number;
  /** day the 48 h cut notice was sent */ avis: number | null; /** first day it can be planned (null = waiting for the notice) */ avail: number | null;
  deadline: number | null; gas: boolean; tries: number; prefet?: boolean; vip?: VipId;
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
  /** VIP tickets of the day already judged: outcome by ticket */ vip?: Record<string, 'fast' | 'mid' | 'late'>;
  /** network yield this morning (for « pourquoi ça a bougé ») and the background losses then */ y0?: number; bg0?: number;
  /** m³ lost today, by ticket */ leaks?: Record<string, number>;
  /** why the subscribers' mood moved today */ satWhy?: { text: string; v: number }[];
  /** the day's funny moments (card choices, VIP outcomes), for the end-of-day line */ story?: string[];
  /** end-of-day replay: trips [capy, start slot, slots, ticket] and card answers [card id, choice] */ trips?: [CapyId, number, number, string][]; picks?: [string, number][];
}
export interface DayResult { day: number; stars: number; met: boolean[]; m3: number; yield: number; done: number; incidents: number; sat: number; rdvKept: number; rdvTotal: number }
export interface Game { v: 1; /** season of the fortnight (absent in older saves = summer, the Festival fortnight) */ season?: Season; /** « Tournée du jour »: the date (YYYY-MM-DD) */ daily?: string; /** generated campaign: days 4 to 10 come from gen.ts */ gen?: boolean; /** generated day specs, by day index */ specs?: Record<number, DaySpec>; /** map layout version (graph node numbers) */ map?: number; seed: number; day: number; tickets: Record<string, Ticket>; pile: string[]; sat: number; bg: number; history: DayResult[]; today: DayState | null; stickers: string[]; next: number; over: boolean; /** overnight news shown at the next briefing */ news: string[]; /** one line per finished day (the « pot du vendredi » picks a funny one) */ moments?: string[] }

export const BG0 = Math.round(SECTOR_M3 * (1 / START_YIELD - 1)); // background losses giving the real starting yield
/** The day's spec: generated (days 4 to 10 of a generated campaign, saved in the game) or scripted. */
export const specOf = (g: Pick<Game, 'specs' | 'season'>, day: number): DaySpec => g.specs?.[day] ?? seasonDays(g.season)[day];
/** Set by gen.ts: builds (and proves) the spec of a generated day before its briefing. */
export const hooks: { beforeDay?: (g: Game) => void } = {};
export const newGame = (seed = 2026, season?: Season): Game => ({ v: 1, ...(season && season !== 'ete' ? { season } : {}), map: MAP_V, seed, day: 0, tickets: {}, pile: [], sat: 60, bg: BG0, history: [], today: null, stickers: [], next: 1, over: false, news: [] });
const clampSat = (s: number) => Math.max(0, Math.min(100, s));
/** Change the subscribers' mood and remember why (for the « Abonnés » sheet). */
/** Soft floor: below SAT_FLOOR the subscribers only lose half as much (a bad run is not a death spiral). */
export const SAT_FLOOR = 35;
export const softSat = (sat: number, v: number) => { let n = sat + v; if (v < 0 && n < SAT_FLOOR) n += (SAT_FLOOR - n - Math.max(0, SAT_FLOOR - sat)) / 2; return clampSat(Math.round(n * 2) / 2); };
function mood(g: Game, v: number, text: string) { if (!v) return; const before = g.sat; g.sat = softSat(g.sat, v); const dv = g.sat - before; if (dv && g.today) (g.today.satWhy ??= []).push({ text, v: dv }); }
const whoOf = (t: Ticket) => t.who.split(' (')[0].split(' · ')[0];
const COMMON = /^(rue|place|placette|avenue|boulevard|impasse|cours|quai|chemin|passage|square|allée|montée|traverse|route|portail|plan|carreau|rempart|parvis|cloître|petite|grande|porte|galerie|jardin|esplanade|pont)\b/i;
/** « rue du Roi René », « place Pie » (a street name as said in a sentence). */
export const rue = (site: number) => { const n = SITES[site].street; return COMMON.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n; };
/** A day log line for a job: {c} capy name, {who} subscriber, {rue} street. */
export const jobLine = (tpl: string, c: string, t: Ticket) => tpl.replace('{c}', c).replace('{who}', t.who.split(' (')[0].split(' · ')[0]).replace('{rue}', rue(t.site));
const HALLES = labelXY('halles');
const nearHalles = (site: number) => !!HALLES && Math.hypot(SITES[site].x - HALLES.x, SITES[site].y - HALLES.y) < 230;

// ---------------------------------------------------------------- tickets
function pickSite(g: Game, r: () => number, near: number | null): number {
  // one open ticket per street node (pins never stack) and 25 m between open tickets; tickets "near" a centre stay in its
  // quartier (and within 380 m of it intra-muros); the others are drawn inside the walls
  const used = g.pile.map((id) => SITES[g.tickets[id].site]); const q = near === null ? 0 : quarterOf(near); const groups = GROUPS_BY_Q[q]?.length ? GROUPS_BY_Q[q] : GROUPS_BY_Q[0];
  const pick = () => { const grp = groups[Math.floor(r() * groups.length)]; return grp[Math.floor(r() * grp.length)]; };
  for (let k = 0; k < 200; k++) {
    const s = pick(); const S = SITES[s];
    if (used.some((u) => u.node === S.node || Math.hypot(u.x - S.x, u.y - S.y) < 25)) continue;
    if (near !== null && q === 0 && Math.hypot(S.x - SITES[near].x, S.y - SITES[near].y) > 380 && k < 150) continue;
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
/** Tickets on the tray at most each morning (urgent ones always come): with the day's calls, about 14 to handle. */
export const MORNING_CAP = 12;
export function startDay(g: Game) {
  if (g.gen && g.day >= 3 && !g.specs?.[g.day]) hooks.beforeDay?.(g);
  const spec = specOf(g, g.day); const r = rng(g.seed * 1000 + g.day * 977 + 13);
  // two centres a day: one inside the walls, and from day 2 one in a quartier outside (about a third of the tickets go there)
  const anyIn = (q: number) => { const gs = GROUPS_BY_Q[q]; const grp = gs[Math.floor(r() * gs.length)]; return grp[Math.floor(r() * grp.length)]; };
  const outQ = GROUPS_BY_Q.map((gs, q) => (q && gs.length ? q : -1)).filter((q) => q > 0);
  const centers = [anyIn(0), g.day >= 1 && outQ.length ? anyIn(outQ[Math.floor(r() * outQ.length)]) : anyIn(0)];
  let rdvLeft = spec.rdv; let w = Math.floor(r() * RDV_WINDOWS.length);
  // 5-minute sessions: the morning tray is capped (carried tickets + new ones ≈ MORNING_CAP); the central keeps the non-urgent extras
  const carried = g.pile.filter((id) => avail(g, id)).length; let room = Math.max(0, MORNING_CAP - carried); let kept = 0;
  // what goes first: urgent leaks, then anything that loses water or raises the yield, then the rest in the spec order
  const jid = (j: (typeof spec.jobs)[number]) => (Array.isArray(j) ? j[0] : j) as JobId;
  const rank = (j: (typeof spec.jobs)[number]) => { const J = JOBS[jid(j)]; return J.urgent ? 0 : J.leak || J.fix ? 1 : 2; };
  const order = spec.jobs.map((j, i) => i).sort((a, b) => rank(spec.jobs[a]) - rank(spec.jobs[b]) || a - b); const keep = new Set<number>();
  for (const i of order) { if (rank(spec.jobs[i]) === 0 || room > 0) { keep.add(i); room--; } else kept++; }
  const jobs = spec.jobs.filter((_, i) => keep.has(i));
  if (kept) g.news.push(`Le central garde ${kept} ticket${kept > 1 ? 's' : ''} pour plus tard : la pile est déjà bien remplie.`);
  for (const j of jobs) {
    const [job, ...risks] = (Array.isArray(j) ? j : [j]) as [JobId, ...Risk[]];
    const wantsRdv = (job === 'prc' && rdvLeft > 0) || risks.includes('absent');
    const rdv = wantsRdv ? RDV_WINDOWS[w++ % RDV_WINDOWS.length] : null; if (wantsRdv) rdvLeft--;
    const nr = r() < 0.65 ? centers[r() < 0.4 && !rdv && !JOBS[job].urgent ? 1 : 0] : null; makeTicket(g, job, r, { risks, rdv, near: nr }); // about a quarter of the tickets outside the walls, never the RDV or urgent ones
  }
  if (spec.card === 'orage') { /* the two storm leaks are in the spec */ }
  const plan = { josette: [], momo: [], lulu: [] } as Record<CapyId, string[]>;
  const capys = Object.fromEntries(TEAM.map((c) => [c.id, { pos: DEPOT, job: null, left: 0, travel: 0, target: null, started: -1, extra: 0 }])) as Record<CapyId, CapyRun>;
  const rdvToday = g.pile.filter((id) => g.tickets[id].rdv && avail(g, id));
  g.today = { day: g.day, slot: 0, phase: 'briefing', sub: 'start', plan, capys, pending: [], done: [], postponed: [], absentOk: [], m3: 0, night: 0, travel: 0, incidents: 0, urgent: {}, rdvToday, rdvKept: [], rdvMissed: [], satStart: g.sat, fired: [], log: [], replan: false, hist: { josette: [], momo: [], lulu: [] }, leaks: {}, story: [] };
  g.today.bg0 = g.bg; g.today.y0 = yieldLive(g);
}
/** Festival day: the municipal order forbids non-urgent roadworks intra-muros (scheduled cuts wait). */
export const festivalBlocked = (g: Game, id: string) => specOf(g, g.day)?.card === 'festival' && !!JOBS[g.tickets[id].job].coupure;
export const avail = (g: Game, id: string) => { const t = g.tickets[id]; return t.avail !== null && t.avail <= g.day && !festivalBlocked(g, id); };
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
export interface Slot { id: string; /** node the capy drives from (expert mode shows the exact trip) */ from: number; travel: number; start: number; end: number; endMax: number; late: boolean; early: boolean; overflow: boolean; noGas: boolean; cannot: boolean }
export const travelCost = (g: Game, from: number, site: number) => {
  if (from === DEPOT) return 0; // prise de poste: the drive to the first job is part of the 7h30 start
  const qa = quarterOfNode(from), qb = quarterOf(site); if (qa !== qb) return qTravel(qa, qb); // between quartiers: 1 h near, 2 h far
  if (qa !== 0) return 0; // inside one quartier outside the walls
  const card = specOf(g, g.day)?.card; const m = dist(from, SITES[site].node);
  if (card === 'marche' && nearHalles(site) && !(from !== DEPOT && SITES.some((s, i) => s.node === from && nearHalles(i)))) return 1;
  return m > (card === 'festival' ? FESTIVAL_TRAVEL_M : TRAVEL_M) ? 1 : 0;
};
/** Expert mode: the exact rule behind a trip, in words (same branches as travelCost). */
export const travelWhy = (g: Game, from: number, site: number): string => {
  if (from === DEPOT) return 'Départ du dépôt : compris dans la prise de poste';
  const qa = quarterOfNode(from), qb = quarterOf(site); if (qa !== qb) return `${QUARTERS[qa].t} → ${QUARTERS[qb].t} : ${qTravel(qa, qb)} créneau${qTravel(qa, qb) > 1 ? 'x' : ''}`;
  if (qa !== 0) return `Dans le quartier ${QUARTERS[qa].t} : 0 créneau`;
  const card = specOf(g, g.day)?.card; const m = Math.round(dist(from, SITES[site].node)); const lim = card === 'festival' ? FESTIVAL_TRAVEL_M : TRAVEL_M;
  if (card === 'marche' && nearHalles(site) && !SITES.some((s, i) => s.node === from && nearHalles(i))) return `${m} m, vers les Halles un jour de marché : 1 créneau`;
  return `${m} m intra-muros (seuil ${lim} m${card === 'festival' ? ', Festival' : ''}) : ${m > lim ? 1 : 0} créneau`;
};
export const maxExtra = (t: Ticket, c?: CapyId) => t.risks.filter((r) => !c || !ignoresRisk(c, r)).length + (JOBS[t.job].minigame ? 1 : 0);
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
    out.push({ id, from: pos, travel: tr, start, end, endMax: end + maxExtra(t, c), late: !!t.rdv && start > t.rdv[1], early, overflow: end > SLOTS, noGas: !!J.dig && !t.gas, cannot: n === null });
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
/** Where a ticket would best go in a capy's day (the « ghost »): the queue position that gets it done soonest without making another job late or spill over. */
export interface Spot { c: CapyId; index: number; slot: Slot; /** jobs made late or pushed past the end of the day by this insertion */ hurts: number }
export function bestSpot(g: Game, c: CapyId, id: string): Spot | null {
  if (!canDo(c, id, g) || !avail(g, id)) return null; const base = g.today!.plan[c].filter((x) => x !== id); const p0 = preview(g, c, base);
  const urgDelay = (p: Slot[]) => p.reduce((s, x) => { const o = p0.find((y) => y.id === x.id); return s + (o && JOBS[g.tickets[x.id].job].urgent ? Math.max(0, x.start - o.start) : 0); }, 0);
  const bad = (p: Slot[]) => p.filter((s) => s.id !== id && (s.late || s.overflow)).length; const b0 = bad(p0);
  let best: Spot | null = null; let bestScore = Infinity;
  for (let i = 0; i <= base.length; i++) { const order = [...base.slice(0, i), id, ...base.slice(i)]; const p = preview(g, c, order); const me = p[i];
    const hurts = Math.max(0, bad(p) - b0); const score = hurts * 100 + urgDelay(p) * 20 + (me.late ? 50 : 0) + (me.overflow ? 40 : 0) + me.end + p[p.length - 1].end * 0.01 + i * 0.001;
    if (score < bestScore) { bestScore = score; best = { c, index: i, slot: me, hurts }; } }
  return best;
}
/** Index in a capy's queue for a tap/drop on slot `slot` (insert before the first job that starts at or after it). */
export function indexForSlot(g: Game, c: CapyId, slot: number) { const p = preview(g, c); const i = p.findIndex((s) => s.start + (s.end - s.start) / 2 > slot); return i < 0 ? p.length : i; }
export interface Warn { level: 'red' | 'orange'; text: string; /** the block to show */ id?: string; kind: 'gas' | 'late' | 'over' | 'maybe' | 'urgent' }
export function warnings(g: Game, rule: SafetyRule = SAFETY_RULE): Warn[] {
  const w: Warn[] = [];
  for (const c of TEAM) for (const s of preview(g, c.id)) {
    const t = g.tickets[s.id]; const J = JOBS[t.job]; const at = `${J.short} ${rue(t.site)}`;
    if (s.noGas) w.push({ level: 'red', kind: 'gas', id: s.id, text: `${c.name} va creuser ${rue(t.site)} sans avoir appelé le gaz${rule === 'cap1' ? ' : la journée sera plafonnée à 1 étoile' : ''}` });
    if (s.late) w.push({ level: 'red', kind: 'late', id: s.id, text: `${c.name} arrivera trop tard chez ${t.who.split(' (')[0].split(' · ')[0]} (RDV à ${slotH(t.rdv![1])} au plus tard)` });
    if (s.overflow) w.push({ level: 'orange', kind: 'over', id: s.id, text: `${c.name} n'aura pas le temps de finir (${at}) : ça attendra demain` });
    else if (s.endMax > SLOTS) w.push({ level: 'orange', kind: 'maybe', id: s.id, text: `${c.name} risque de finir après ${DAY_END} si un imprévu tombe (${at})` });
  }
  const urgent = g.pile.filter((id) => JOBS[g.tickets[id].job].urgent && avail(g, id) && !g.today!.done.includes(id) && !Object.values(g.today!.plan).flat().includes(id) && !Object.values(g.today!.capys).some((c) => c.job === id));
  for (const id of urgent) { const t = g.tickets[id]; const J = JOBS[t.job]; const why = J.leak ? `l'eau coule (${J.leak} m³ par heure)` : "l'abonné n'a plus d'eau"; w.push({ level: 'orange', kind: 'urgent', id, text: `${J.short} ${rue(t.site)} : personne n'y va encore, ${why}` }); }
  return w;
}
const slotH = slotLabel; // SLOTS = end of the day (17 h 30)
export const canLaunch = (g: Game, rule: SafetyRule = SAFETY_RULE) => rule === 'cap1' || !TEAM.some((c) => preview(g, c.id).some((s) => s.noGas));

// ---------------------------------------------------------------- resolution
const log = (d: DayState, s: string, at = d.slot) => { d.log.push(`${slotH(at)} · ${s}`); if (d.log.length > 60) d.log.shift(); };
export function launch(g: Game) { const d = g.today!; d.phase = 'run'; d.replan = false; }
/** Begin the current slot: scripted events, capys pick their next job. Returns the cards to play (also kept in d.pending). */
export function beginSlot(g: Game) {
  const d = g.today!; if (d.sub !== 'start' || d.phase !== 'run') return d.pending; const s = d.slot; const spec = specOf(g, d.day);
  for (const c of TEAM) {
    const cr = d.capys[c.id]; if (cr.job || cr.travel) continue;
    // next job in the queue: travel first, wait for the RDV window, then start
    while (d.plan[c.id].length) {
      const id = d.plan[c.id][0]; const t = g.tickets[id];
      if (!avail(g, id) || d.done.includes(id)) { d.plan[c.id].shift(); continue; }
      const tr = cr.target === id ? 0 : travelCost(g, cr.pos, t.site);
      if (tr) { cr.travel = tr; cr.target = id; d.travel += tr; (d.trips ??= []).push([c.id, s, tr, id]); break; }
      if (t.rdv && s < t.rdv[0]) { cr.target = id; break; }
      d.plan[c.id].shift(); cr.job = id; cr.target = null; cr.pos = SITES[t.site].node; cr.left = slotsFor(c, JOBS[t.job])!; cr.started = s; cr.extra = 0; t.tries++;
      const J = JOBS[t.job];
      if (J.urgent) d.urgent[id] = s - (t.day === d.day ? t.slot : 0);
      if (t.rdv) { if (s > t.rdv[1]) { d.rdvMissed.push(id); mood(g, -4, `RDV manqué chez ${whoOf(t)}`); log(d, `${c.name} arrive en retard chez ${t.who.split(' (')[0]} : RDV manqué`); } else if (!d.rdvToday.includes(id)) d.rdvToday.push(id); }
      log(d, jobLine(J.go, c.name, t));
      if (t.vip && t.day === d.day && !d.vip?.[id]) { judgeVip(g, id, s - t.slot); const w = VIPS[t.vip].watch; if (w) d.pending.push({ card: w, kind: 'event', capy: c.id, ticket: id }); }
      if (J.dig && !t.gas) d.pending.push({ card: 'safety', kind: 'safety', capy: c.id, ticket: id });
      for (const r of t.risks) if (!ignoresRisk(c.id, r)) d.pending.push({ card: r, kind: 'risk', capy: c.id, ticket: id }); else log(d, `${c.name} se faufile dans la ruelle sans ralentir`);
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
  { label: 'Appeler et attendre les consignes', hint: '+1 créneau · incident sécurité : journée plafonnée à 1 étoile', fx: { slots: 1, log: "a appelé l'exploitant gaz après coup (incident sécurité)" } },
  { label: 'Reboucher et revenir demain', hint: 'Le chantier attendra demain · incident sécurité quand même', fx: { postpone: true, log: "a rebouché le trou et reviendra demain, gaz appelé (incident sécurité)" } }] };
export function cardOf(p: Pending): Card { return p.kind === 'safety' ? SAFETY_CARD : p.kind === 'risk' ? RISK_CARDS[p.card as Risk] : EVENTS[p.card]; }
/** Apply the player's choice on the first pending card. Returns the ticket created, if any (the UI then opens the replanning). */
export function choose(g: Game, i: number): Ticket | null {
  const d = g.today!; const p = d.pending.shift(); if (!p) return null; const card = cardOf(p); const fx: Effect = (card.choices[i] ?? card.choices[0]).fx;
  const who = p.capy ? CAPY[p.capy].name + ' ' : ''; (d.picks ??= []).push([p.card, card.choices[i] ? i : 0]);
  if (p.kind === 'safety') { d.incidents++; g.tickets[p.ticket!].gas = true; }
  if (p.kind === 'risk' && p.card === 'absent' && fx.postpone) d.absentOk.push(p.ticket!);
  if (p.kind === 'risk' && p.card === 'absent' && !fx.postpone && p.ticket && !d.rdvMissed.includes(p.ticket)) { /* RDV kept after a call */ }
  if (fx.sat) mood(g, fx.sat, `${card.title} : ${(card.choices[i] ?? card.choices[0]).label.toLowerCase()}`);
  if (fx.bonus && !g.stickers.includes(fx.bonus)) g.stickers.push(fx.bonus);
  if (p.capy && p.ticket) { const cr = d.capys[p.capy];
    if (fx.postpone) {
      if (cr.job === p.ticket) { cr.job = null; cr.left = 0; }
      d.pending = d.pending.filter((x) => x.ticket !== p.ticket); postpone(g, p.ticket);
    } else if (fx.slots) { if (card.needs === 'travel') { cr.travel += fx.slots; d.travel += fx.slots; const tp = [...(d.trips ?? [])].reverse().find((x) => x[0] === p.capy); if (tp) tp[2] += fx.slots; } else { cr.left += fx.slots; cr.extra += fx.slots; } }
  }
  log(d, (p.capy ? who : '') + fx.log); if (fx.log && !fx.addTicket) (d.story ??= []).push((p.capy ? who : '') + fx.log);
  if (fx.addTicket) {
    const r = rng(g.seed * 31 + d.day * 101 + d.slot * 7 + g.next);
    // a frozen meter calls its neighbours: the new one is in the same street corner
    const cold = fx.addTicket === 'gel_cpt' ? g.pile.map((id) => g.tickets[id]).reverse().find((x) => x.job === 'gel_cpt') : undefined;
    const t = makeTicket(g, fx.addTicket, r, { near: cold ? cold.site : null, slot: d.slot, rdv: fx.addRdvSoon ? [Math.min(d.slot + 1, SLOTS - 1), Math.min(d.slot + 2, SLOTS - 1)] : null });
    if (p.card === 'prefet') { t.prefet = true; t.who = PREFET; t.risks = []; t.site = PREFET_SITE; t.num = SITES[PREFET_SITE].num; } // Hôtel Forbin de Sainte-Croix; the butler is always home
    if (fx.vip) { const V = VIPS[fx.vip]; t.vip = fx.vip; t.who = V.who; t.risks = [];
      if (V.site) { const i = SITES.findIndex((s) => s.num === V.site![0] && s.street === V.site![1]); if (i >= 0) { t.site = i; t.num = SITES[i].num; } } }
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
  d.m3 += leakingNow(g); const lk = (d.leaks ??= {});
  for (const id of g.pile) { const t = g.tickets[id]; const L = JOBS[t.job].leak ?? 0; if (L && !d.done.includes(id) && !(t.day === d.day && t.slot > d.slot)) lk[id] = (lk[id] ?? 0) + L; }
  d.slot++; d.sub = 'start';
  if (d.slot >= SLOTS) closeDay(g);
}
export const leakingNow = (g: Game) => g.pile.reduce((s, id) => { const t = g.tickets[id]; const L = JOBS[t.job].leak ?? 0; if (!L || g.today!.done.includes(id)) return s; if (t.day === g.today!.day && t.slot > g.today!.slot) return s; return s + L; }, 0);
function complete(g: Game, c: CapyId) {
  const d = g.today!; const cr = d.capys[c]; const id = cr.job!; const t = g.tickets[id]; const J = JOBS[t.job];
  d.done.push(id); g.pile = g.pile.filter((x) => x !== id); d.hist[c].push([id, cr.started, d.slot + 1]); cr.job = null; cr.left = 0;
  if (J.fix) g.bg = Math.max(0, g.bg - J.fix);
  if (t.rdv && !d.rdvMissed.includes(id)) d.rdvKept.push(id);
  if (t.rdv && !d.rdvMissed.includes(id)) mood(g, 1, `RDV tenu chez ${whoOf(t)}`); if (J.urgent) mood(g, 1, `${J.short} ${rue(t.site)} réparée`);
  if (c === 'momo' && J.skill === 'icc' && !t.prefet) mood(g, 1, `Fred est passé chez ${whoOf(t)}`);
  log(d, jobLine(J.fin, CAPY[c].name, t), d.slot + 1);
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
    case 'backlog': return !g.pile.some((id) => avail(g, id) && g.day - g.tickets[id].day > (o.n ?? 2));
    case 'travel': return d.travel <= (o.n ?? 0);
    case 'sat': return o.n ? g.sat - d.satStart >= o.n : g.sat > d.satStart;
    case 'yield': return (closeYield(g) - (d.y0 ?? START_YIELD)) * 100 >= (o.n ?? 0) - 1e-9;
  }
}
/** VIP rule: the delay between the call and the start of the job (null = not started on the day of the call). */
function judgeVip(g: Game, id: string, delay: number | null) {
  const d = g.today!; const t = g.tickets[id]; const V = VIPS[t.vip!]; const k = vipOutcome(V, delay); const o = V[k];
  (d.vip ??= {})[id] = k; mood(g, o.sat, o.log); log(d, o.log); (d.story ??= []).push(o.log);
}
/** Network jobs: no subscriber waits behind them (their cost is the yield). */
const NETWORK_JOBS: JobId[] = ['debit_nuit', 'coupure'];
/** A client waits behind this ticket: leaving it another day costs a point of subscribers. */
export const waitCosts = (t: Ticket) => !JOBS[t.job].urgent && !NETWORK_JOBS.includes(t.job);
const closeYield = (g: Game) => SECTOR_M3 / (SECTOR_M3 + g.bg + g.today!.m3 + g.pile.reduce((s, id) => s + (JOBS[g.tickets[id].job].leak ?? 0), 0) * NIGHT_SLOTS);
/** Where the subscribers' mood drifts back to overnight. */
export const SAT_HOME = 70;
export function closeDay(g: Game) {
  const d = g.today!; d.phase = 'close';
  for (const [id, t] of Object.entries(g.tickets)) if (t.vip && t.day === d.day && !d.vip?.[id]) judgeVip(g, id, null);
  for (const c of TEAM) { const cr = d.capys[c.id]; if (cr.job) log(d, `${c.name} n'a pas fini (${JOBS[g.tickets[cr.job].job].short} ${rue(g.tickets[cr.job].site)}) : on y retourne demain`); cr.job = null; cr.travel = 0; d.plan[c.id] = []; }
  // missed RDVs: planned too late or not planned at all
  for (const id of d.rdvToday) if (!d.rdvKept.includes(id) && !d.absentOk.includes(id) && !d.rdvMissed.includes(id)) { const t = g.tickets[id]; d.rdvMissed.push(id); mood(g, -3, `Personne n'est passé chez ${whoOf(t)} (RDV)`); if (g.pile.includes(id)) t.rdv = RDV_WINDOWS[(t.num + t.tries + 1) % RDV_WINDOWS.length]; }
  // the cost of postponing: clients who already waited a day call back unhappy (−1 each, −4 at most)
  const waiting = g.pile.filter((id) => { const t = g.tickets[id]; return avail(g, id) && waitCosts(t) && g.day - t.day >= 1; });
  waiting.slice(0, 4).forEach((id) => mood(g, -1, `${whoOf(g.tickets[id])} attend depuis ${g.day - g.tickets[id].day + 1} jours`));
  d.night = g.pile.reduce((s, id) => s + (JOBS[g.tickets[id].job].leak ?? 0), 0) * NIGHT_SLOTS;
  const spec = specOf(g, d.day); d.met = spec.objs.map((o) => evalObj(g, o));
  let stars = d.met.filter(Boolean).length;
  if (Object.entries(d.vip ?? {}).some(([id, k]) => { const v = g.tickets[id]?.vip; return !!v && !!VIPS[v][k].star; })) stars = Math.max(0, stars - 1); // the boss waited
  if (d.incidents > 0) stars = Math.min(stars, 1);
  d.stars = stars;
  d.night = g.pile.reduce((s, id) => s + (JOBS[g.tickets[id].job].leak ?? 0), 0) * NIGHT_SLOTS;
  const lost = g.bg + d.m3 + d.night; const y = SECTOR_M3 / (SECTOR_M3 + lost);
  (g.moments ??= [])[d.day] = dayLine(g);
  g.history.push({ day: d.day, stars, met: d.met, m3: d.m3 + d.night, yield: y, done: d.done.length, incidents: d.incidents, sat: g.sat, rdvKept: d.rdvKept.length, rdvTotal: d.rdvToday.length });
}
/** Overnight: deadlines, then the next briefing (or the end of the campaign). */
export function nextDay(g: Game) {
  const d = g.today!; if (d.phase !== 'close') return;
  g.day++; g.today = null; g.news = [];
  // overnight the subscribers' mood drifts back a quarter of the way to 70: a good day must be earned again, a bad one is not a death spiral
  // under the soft floor the catch-up is faster (40 %) and said so
  const drift = Math.round((g.sat - SAT_HOME) * (g.sat < SAT_FLOOR ? 0.4 : 0.25)); if (drift) { const low = g.sat < SAT_FLOOR; g.sat = clampSat(g.sat - drift); g.news.push(drift > 0 ? `Les abonnés oublient vite : ${drift} point${drift > 1 ? 's' : ''} d'abonnés en moins ce matin.` : low ? `Les abonnés vous laissent une chance : +${-drift} points ce matin. Une bonne journée, et ça remonte vite.` : `Une nuit de sommeil, et les abonnés se calment : +${-drift} point${-drift > 1 ? 's' : ''} ce matin.`); }
  for (const id of [...g.pile]) { const t = g.tickets[id];
    if (JOBS[t.job].coupure && t.deadline !== null && g.day > t.deadline) { // the tired valve gave up: it is now an urgent leak
      g.pile = g.pile.filter((x) => x !== id); delete g.tickets[id];
      const r = rng(g.seed + g.day * 7 + t.num); const n = makeTicket(g, 'fuite_bt', r); n.site = t.site; n.num = t.num; n.risks = n.risks.filter((k) => k !== 'ruelle'); if (SITES[t.site].narrow) n.risks.push('ruelle'); n.day = g.day; n.slot = 0; n.avail = g.day; g.sat = clampSat(g.sat - 5); g.news.push(`La vanne ${SITES[t.site].street} a lâché avant la coupure programmée : c'est maintenant une fuite urgente.`); } }
  if (g.day >= DAYS) { g.over = true; return; }
  startDay(g);
}
const cap1 = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
/** The day in one or two sentences, from what happened (card choices, VIP outcomes), else from the jobs done. */
export function dayLine(g: Game): string {
  const d = g.today!; const st = (d.story ?? []).filter(Boolean); const dot = (x: string) => { const y = cap1(x.trim()); return /[.!?…]$/.test(y) ? y : y + '.'; };
  if (st.length) return [st[0], st.length > 1 ? st[st.length - 1] : ''].filter(Boolean).map(dot).join(' ');
  const fin = d.log.map((l) => l.split(' · ').slice(1).join(' · ')).filter((l) => /a (réparé|trouvé|posé|changé|fermé|remis|résolu|mis la main)/.test(l));
  return fin.length ? dot(fin[fin.length - 1]) : 'Une journée calme. Ça arrive aussi !';
}
export const totalStars = (g: Game) => g.history.reduce((s, h) => s + h.stars, 0);
export const yieldNow = (g: Game) => SECTOR_M3 / (SECTOR_M3 + g.bg);
/** Open leaks keep flowing tonight: m³ they will lose overnight if nobody repairs them. */
export const nightLoss = (g: Game) => g.pile.reduce((s, id) => { const t = g.tickets[id]; const d = g.today; if (d && (d.done.includes(id) || (t.day === d.day && t.slot > d.slot))) return s; return s + (JOBS[t.job].leak ?? 0); }, 0) * NIGHT_SLOTS;
/** Rendement de réseau, live: background losses + water lost today + what the open leaks will lose tonight. Equals the day's result at the close. */
export function yieldLive(g: Game) { const d = g.today; if (!d) return yieldNow(g); if (d.phase === 'close') return g.history.at(-1)?.yield ?? yieldNow(g); return SECTOR_M3 / (SECTOR_M3 + g.bg + d.m3 + nightLoss(g)); }
/** This morning's yield (saves from before v2 did not store it: rebuilt from the day's fixes). */
export function yieldMorning(g: Game) { const d = g.today!; if (d.y0 !== undefined) return d.y0;
  const bg0 = d.bg0 ?? g.bg + d.done.reduce((s, id) => s + (JOBS[g.tickets[id]?.job]?.fix ?? 0), 0);
  const open0 = Object.values(g.tickets).filter((t) => (JOBS[t.job].leak ?? 0) && (t.day < d.day || t.slot === 0) && (g.pile.includes(t.id) || d.done.includes(t.id)));
  return SECTOR_M3 / (SECTOR_M3 + bg0 + open0.reduce((s, t) => s + (JOBS[t.job].leak ?? 0), 0) * NIGHT_SLOTS); }
export interface YieldWhy { text: string; pt: number }
/** Why the yield moved today, ticket by ticket (exact: the contributions add up to the change). */
export function yieldWhy(g: Game): { y0: number; y1: number; items: YieldWhy[] } {
  const d = g.today!; const y0 = yieldMorning(g); const y1 = yieldLive(g); const S = SECTOR_M3; const L0 = S / y0 - S, L1 = S / y1 - S; const k = (dL: number) => (-dL * S) / ((S + L0) * (S + L1)) * 100;
  const items: YieldWhy[] = []; const night = d.phase === 'close';
  for (const id of d.done) { const t = g.tickets[id]; if (!t) continue; const J = JOBS[t.job]; const at = rue(t.site);
    if (J.fix) items.push({ text: J.id === 'debit_nuit' ? `Fuite cachée trouvée ${at} (${J.fix} m³ par jour, pour de bon)` : `${J.short} ${at} : vanne changée (${J.fix} m³ par jour en moins)`, pt: k(-J.fix) });
    if (J.leak) { const lost = d.leaks?.[id] ?? 0; const wasOpen = t.day < d.day || t.slot === 0; const dl = lost - (wasOpen ? J.leak * NIGHT_SLOTS : 0); items.push({ text: dl > 0 ? `${J.short} ${at} réparée, mais ${Math.round(lost)} m³ perdus avant` : `${J.short} ${at} réparée${wasOpen ? ` : pas de fuite cette nuit (${J.leak * NIGHT_SLOTS} m³ sauvés)` : ''}`, pt: k(dl) }); } }
  for (const id of g.pile) { const t = g.tickets[id]; const J = JOBS[t.job]; if (!J.leak || d.done.includes(id)) continue; const lost = d.leaks?.[id] ?? 0; const isNew = !(t.day < d.day || t.slot === 0);
    const dL = lost + (isNew ? J.leak * NIGHT_SLOTS : 0); if (dL) items.push({ text: `${J.short} ${rue(t.site)} pas encore réparée (${Math.round(lost)} m³ aujourd'hui${isNew ? `, ${J.leak * NIGHT_SLOTS} m³ cette nuit` : night ? '' : ''})`, pt: k(dL) }); }
  const sum = items.reduce((s, x) => s + x.pt, 0); const rest = (y1 - y0) * 100 - sum; if (Math.abs(rest) >= 0.05) items.push({ text: 'Autres petites pertes du jour', pt: rest });
  return { y0, y1, items: items.filter((x) => Math.abs(x.pt) >= 0.005).sort((a, b) => Math.abs(b.pt) - Math.abs(a.pt)) };
}
export const avgYield = (g: Game) => (g.history.length ? g.history.reduce((s, h) => s + h.yield, 0) / g.history.length : START_YIELD);
export const objLabels = (day: number, g?: Game) => (g ? specOf(g, day) : DAYS_SPEC[day]).objs.map(objText);
/** The measured value of an objective, shown next to a missed one (« 30 m³ perdus au maximum (34) »). */
export function objValue(g: Game, o: Obj): string | null {
  const d = g.today!; switch (o.id) { case 'm3': return `${Math.round(d.m3)}`; case 'done': return `${d.done.length}`; case 'travel': return `${d.travel} h`; case 'rdv': return `${d.rdvKept.length}/${d.rdvToday.length}`; case 'sat': return `${g.sat - d.satStart >= 0 ? '+' : ''}${g.sat - d.satStart}`; case 'yield': return `${((closeYield(g) - (d.y0 ?? START_YIELD)) * 100 >= 0 ? '+' : '−')}${Math.abs((closeYield(g) - (d.y0 ?? START_YIELD)) * 100).toFixed(1).replace('.', ',')} pt`; default: return null; }
}

// ---------- « Qui lâche quoi ? »: concrete dispatch options for a mid-day call that creates a ticket
export interface Dispatch {
  capy: CapyId; index: number; kind: 'rush' | 'after' | 'end';
  /** the queued job it jumps ahead of (rush) / the job it comes after (after, end) */ skip: string | null; prev: string | null;
  start: number; end: number; travel: number; slower: boolean;
  m3: number; sat: number; late: string[]; over: string[];
  /** one cell per remaining hour of that capy: '', 'r' (route), 'w' (wait), a skill id, 'new' (the new ticket), 'x' (pushed past the end of the day) */ bar: string[];
}
/** Which card choice creates a ticket (−1 if none). */
export const createIndex = (card: Card) => card.choices.findIndex((c) => !!c.fx.addTicket);
function capyBar(g: Game, c: CapyId, id: string): string[] {
  const d = g.today!; const cr = d.capys[c]; const p = preview(g, c); const now = d.slot; const out: string[] = [];
  const at = freeAt(g, c).at;
  for (let s = now; s < Math.max(SLOTS, now + 1); s++) {
    let k = '';
    if (cr.job && s < now + cr.left) k = JOBS[g.tickets[cr.job].job].skill;
    else if (cr.travel && cr.target && s < now + cr.travel) k = 'r';
    else { let prev = at; for (const x of p) { if (s >= prev && s < prev + x.travel) { k = 'r'; break; } if (s >= prev + x.travel && s < x.start) { k = 'w'; break; } if (s >= x.start && s < x.end) { k = x.id === id ? 'new' : JOBS[g.tickets[x.id].job].skill; break; } prev = x.end; } }
    out.push(k);
  }
  const spill = p.reduce((n, x) => n + Math.max(0, x.end - Math.max(x.start, SLOTS)), 0); for (let i = 0; i < Math.min(spill, 4); i++) out.push('x');
  return out;
}
export function dispatchOptions(g: Game, choice: number): Dispatch[] {
  const g1 = structuredClone(g); const t = choose(g1, choice); if (!t) return []; const d1 = g1.today!; const J = JOBS[t.job]; const now = d1.slot;
  const all: Dispatch[] = [];
  for (const c of TEAM) {
    if (!canDo(c.id, t.id, g1)) continue; const q = d1.plan[c.id]; const base = preview(g1, c.id);
    const sp = bestSpot(g1, c.id, t.id); const idx = new Map<number, Dispatch['kind']>([[0, 'rush']]); if (sp && sp.index !== 0 && sp.index !== q.length) idx.set(sp.index, 'after'); if (!idx.has(q.length)) idx.set(q.length, 'end');
    for (const [i, kind] of idx) {
      const g2 = structuredClone(g1); assign(g2, c.id, t.id, i); const p = preview(g2, c.id); const me = p.find((x) => x.id === t.id)!;
      const late = p.filter((x) => x.id !== t.id && x.late && !base.find((y) => y.id === x.id)?.late).map((x) => x.id);
      const over = p.filter((x) => x.id !== t.id && x.overflow && !base.find((y) => y.id === x.id)?.overflow).map((x) => x.id);
      let sat = -4 * late.length - 3 * over.filter((id) => g1.tickets[id].rdv).length + (me.late ? -4 : 0);
      if (t.vip) sat += VIPS[t.vip][vipOutcome(VIPS[t.vip], me.overflow ? null : me.start - t.slot)].sat;
      const leak = J.leak ?? 0; const lossTo = (l: number, e: number, of: boolean) => l * (of ? (SLOTS - now) + NIGHT_SLOTS : e - now);
      const others = p.filter((x) => x.id !== t.id).reduce((s2, x) => { const l = JOBS[g1.tickets[x.id].job].leak ?? 0; const o = base.find((y) => y.id === x.id); return l && o ? s2 + Math.max(0, lossTo(l, x.end, x.overflow) - lossTo(l, o.end, o.overflow)) : s2; }, 0);
      const m3 = lossTo(leak, me.end, me.overflow) + others;
      all.push({ capy: c.id, index: i, kind, skip: kind === 'rush' ? q[0] ?? null : null, prev: i > 0 ? q[i - 1] : d1.capys[c.id].job, start: me.start, end: me.end, travel: me.travel, slower: (slotsFor(CAPY[c.id], J) ?? 0) > J.dur, m3, sat, late, over, bar: capyBar(g2, c.id, t.id) });
    }
  }
  const score = (o: Dispatch) => o.m3 + -o.sat * 6 + o.end * 0.5 + (o.slower ? 0.3 : 0);
  all.sort((a, b) => score(a) - score(b)); const pick: Dispatch[] = [];
  const add = (o?: Dispatch) => { if (o && !pick.some((x) => x.capy === o.capy && x.index === o.index) && pick.length < 3) pick.push(o); };
  add(all[0]); add(all.find((o) => o.capy !== pick[0]?.capy)); add(all.filter((o) => o.kind === 'end').sort((a, b) => b.start - a.start)[0]); for (const o of all) add(o);
  return pick;
}
/** Play the call's ticket-creating choice and put the new ticket where the player said. */
export function dispatch(g: Game, choice: number, o: Pick<Dispatch, 'capy' | 'index'>): Ticket | null {
  const t = choose(g, choice); if (!t) return null; assign(g, o.capy, t.id, o.index); return t;
}


/** Yield points a fix of `fix` m³/day would bring today (for the ticket front). */
export function fixGain(g: Game, fix: number) { const y = yieldLive(g); const L = SECTOR_M3 / y - SECTOR_M3; return (SECTOR_M3 / (SECTOR_M3 + Math.max(0, L - fix)) - y) * 100; }
