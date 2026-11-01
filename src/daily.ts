// « Tournée du jour » (design Page, section 16): the same day for everyone, from the date alone (no server).
// One ranked attempt (the first one started), then free tries. A missed day stays playable 7 days. No streaks:
// an empty day is just empty. The result is shared as spoiler-free text (stars, yield, water, driving, each capy's load).
import { newGame, startDay, yieldWhy, type Game } from './game';
import { TEAM, seasonOfDate, type DaySpec, type Obj } from './content';
import { SLOTS } from './rules';
import { stats } from './gen';
import { tryDay } from './hindsight';

export const DAILY_KEY = 'capy-dispatch-v1-daily';
export const WINDOW = 7;
export interface DailyRes { stars: number; met: boolean[]; dy: number; m3: number; travel: number; load: number[]; tries: number; best: number }
export interface DailyStore { v: 1; res: Record<string, DailyRes>; cur: { date: string; ranked: boolean; game: Game } | null }

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return dateKey(d); };
/** The last 7 days, oldest first, ending today. */
export const lastDays = (today = dateKey()) => Array.from({ length: WINDOW }, (_, i) => addDays(today, i - WINDOW + 1));
export const playable = (k: string, today = dateKey()) => lastDays(today).includes(k);
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WD = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const dateLabel = (k: string, wd = true) => { const d = parse(k); return `${wd ? WD[d.getDay()] + ' ' : ''}${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const shortDay = (k: string) => WD[parse(k).getDay()].slice(0, 3) + '.';
/** FNV-1a of the date: the same seed on every phone. */
export function seedOf(k: string) { let h = 2166136261; for (const c of 'capy-tournee:' + k) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return 1 + (h % 2147483646); }
/** Which page of the fortnight the day borrows its hand-written beats from (never the Festival, never a Friday line). */
const BASE_DAYS = [3, 5, 7];
/** Calendar winks (month-day → chef line). */
export const WINKS: Record<string, string> = {
  '11-01': 'Toussaint : tout Avignon va fleurir le cimetière Saint-Véran, les rues autour sont pleines. Les fuites, elles, ne font pas le pont.',
  '12-25': 'Noël, {nom} ! Les abonnés reçoivent la famille : pas question de couper l’eau aujourd’hui. On fait vite et bien.',
  '01-01': 'Bonne année ! Première tournée de l’année : on commence propre.',
  '07-14': '14 Juillet : feu d’artifice sur le Rhône ce soir. D’ici là, on boucle les tickets.',
};
/** The day's game, fresh and briefed (generated and proven 3 ★ from this very morning). */
const fresh = (k: string) => { const g = newGame(seedOf(k), seasonOfDate(k)); g.gen = true; g.daily = k; g.day = BASE_DAYS[seedOf(k) % BASE_DAYS.length]; return g; };
/** In a one-day tournée nothing is carried from yesterday and the drive limits of a fortnight are loose, so « rien qui traîne »
 *  and « N h de route » were free stars. They are replaced by the bar of the best 3 ★ plan the search player found on this
 *  very morning (most jobs done, then least driving; the same 48 tries as the « Et si… » replay): « N interventions bouclées » and « N h de route au maximum ».
 *  The reference try is replayed against the new bar (it is deterministic) before the day keeps it. */
export function harden(k: string, spec: DaySpec): DaySpec {
  // frost days (winter): the urgent meters are obvious, so the mood bar also comes from the best plan (at most +2 on the written one)
  const frost = spec.card === 'gel' && spec.objs.some((o) => o.id === 'sat');
  if (!frost && !spec.objs.some((o) => o.id === 'backlog' || o.id === 'travel')) return spec;
  const run = (sp: DaySpec, i: number) => { const g0 = fresh(k); g0.specs = { [g0.day]: sp }; startDay(g0);
    return tryDay(g0, g0.seed * 7919 + g0.day * 104729 + i * 31 + 5, i < 3 ? 0 : Math.min(1, (i / 48) * 1.5), i < 3 ? 0.15 * i : 0.35, i < 6 ? 0 : (i % 5) * 0.06, 1, false); };
  let ref: Game | null = null; let ri = -1; let rs = -Infinity;
  for (let i = 0; i < 48; i++) { const d = run(spec, i).today!; if (d.stars !== 3) continue; const s = d.done.length * 10 - d.travel; if (s > rs) { rs = s; ri = i; ref = run(spec, i); } }
  if (!ref) return spec; const d = ref.today!;
  const bar = (id: 'done' | 'travel'): Obj => (id === 'done' ? { id, n: d.done.length } : { id, n: d.travel });
  const ids = spec.objs.map((o) => o.id); const objs: Obj[] = [];
  for (const o of spec.objs) { const id = o.id === 'travel' ? 'travel' : o.id === 'backlog' ? (ids.includes('done') ? 'travel' : 'done') : null;
    if (frost && o.id === 'sat') objs.push({ id: 'sat', n: Math.max(o.n ?? 1, Math.min((o.n ?? 1) + 2, Math.floor(ref.sat - d.satStart))) });
    else if (!id) objs.push(o); else if (!objs.some((p) => p.id === id) && !(o.id === 'backlog' && id === 'travel' && ids.includes('travel'))) objs.push(bar(id)); }
  if (objs.length < spec.objs.length) return spec;
  const out = { ...spec, objs }; return run(out, ri).today!.stars === 3 ? out : spec;
}
export function dailyGame(k: string): { g: Game; proven: boolean } {
  const g0 = fresh(k); const f0 = stats.fallback; startDay(g0); const proven = stats.fallback === f0;
  const spec = harden(k, g0.specs![g0.day]); const g = fresh(k); g.specs = { [g.day]: spec }; startDay(g);
  const w = WINKS[k.slice(5)]; if (w) spec.chef = w;
  return { g, proven };
}
export function result(g: Game): DailyRes {
  const d = g.today!; const yw = yieldWhy(g);
  const load = TEAM.map((c) => Math.min(1, d.hist[c.id].reduce((s, h) => s + (h[2] - h[1]), 0) / SLOTS));
  return { stars: d.stars ?? 0, met: [...(d.met ?? [])], dy: Math.round((yw.y1 - yw.y0) * 1000) / 10, m3: Math.round(d.m3 + d.night), travel: d.travel, load, tries: 1, best: d.stars ?? 0 };
}
/** Records a finished day: the first one is the ranked result, the next ones only count as tries. */
export function record(st: DailyStore, k: string, r: DailyRes) { const o = st.res[k]; if (!o) st.res[k] = r; else { o.tries++; o.best = Math.max(o.best, r.stars); } return st.res[k]; }
const bar = (x: number) => '█'.repeat(Math.round(x * 8)) + '░'.repeat(8 - Math.round(x * 8));
const pt = (x: number) => `${x >= 0 ? '+' : '−'}${String(Math.abs(x)).replace('.', ',')} pt`;
/** The shareable text: no ticket, no address, no objective (nothing to spoil). */
export function shareText(k: string, r: DailyRes, names: string[], url: string) {
  const w = Math.max(...names.map((n) => n.length));
  return [`Capy Dispatch · Tournée du ${dateLabel(k, false)}`, `${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)} · rendement ${pt(r.dy)}`, `${r.m3} m³ perdus · ${r.travel} h de route`,
    ...names.map((n, i) => `${n.padEnd(w)} ${bar(r.load[i])}`), url].join('\n');
}
const ok = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isK = (k: unknown): k is string => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
/** Reads the store (results kept 60 days; a broken entry is dropped). `game` validates a saved game. */
export function readDaily(raw: string | null, game: (x: unknown) => Game | null, today = dateKey()): DailyStore {
  const st: DailyStore = { v: 1, res: {}, cur: null }; let x: unknown; try { x = JSON.parse(raw ?? 'null'); } catch { return st; }
  if (!ok(x) || x.v !== 1) return st; const old = addDays(today, -60);
  if (ok(x.res)) for (const [k, r] of Object.entries(x.res)) if (isK(k) && k >= old && ok(r) && [0, 1, 2, 3].includes(r.stars as number) && Array.isArray(r.load) && r.load.length === 3 && r.load.every((v) => typeof v === 'number' && v >= 0 && v <= 1)
    && Array.isArray(r.met) && typeof r.dy === 'number' && Number.isFinite(r.dy) && typeof r.m3 === 'number' && typeof r.travel === 'number' && Number.isInteger(r.tries) && [0, 1, 2, 3].includes(r.best as number)) st.res[k] = r as unknown as DailyRes;
  if (ok(x.cur) && isK(x.cur.date) && playable(x.cur.date, today) && typeof x.cur.ranked === 'boolean') { const g = game(x.cur.game); if (g && g.daily === x.cur.date) st.cur = { date: x.cur.date, ranked: x.cur.ranked, game: g }; }
  return st;
}
