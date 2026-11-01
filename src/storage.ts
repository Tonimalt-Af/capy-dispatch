// Local save. Every key is prefixed 'capy-dispatch-': the github.io origin is shared with Maxime's other games
// (Mahjong Capybaras uses 'capy-mahjong-'), and the two games share nothing on purpose.
import { JOBS, RISKS, TEAM, EVENTS, VIPS, DAY_CARDS, CAPY, slotsFor, type CapyId } from './content';
import { SITES, NODE_COUNT, PREFET_SITE, RETIRED_SITES, DEPOT, MAP_V } from './map';
import { DAYS, SLOTS } from './rules';
import type { Game, Ticket, DayState, DayResult } from './game';
import { cleanPlayer, type Player } from './player';

export const KEY = 'capy-dispatch-v1';
export const BACKUP_KEY = 'capy-dispatch-v1.bak';
export const CORRUPT_KEY = 'capy-dispatch-v1.corrupt';
export interface Settings { sfx: boolean; music: boolean; speed: 1 | 2; /** « Réduire les animations » */ calm?: boolean; /** « Mode expert » : exact numbers */ expert?: boolean; /** vibrations / iOS haptic ticks (default on) */ haptics?: boolean }
export interface Save { settings: Settings; game: Game | null; best: { stars: number; yield: number; runs: number }; seenTuto: boolean; player: Player | null }
/** `player: null` = no character yet: the creation screen is shown (first launch, and once for saves made before v0.2). */
export const defaults = (): Save => ({ player: null, settings: { sfx: true, music: true, speed: 1 }, game: null, best: { stars: 0, yield: 0, runs: 0 }, seenTuto: false });

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const int = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
const num = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const str = (x: unknown, max = 200): x is string => typeof x === 'string' && x.length <= max;
const ids = (x: unknown, ok: (s: string) => boolean) => Array.isArray(x) && x.every((v) => typeof v === 'string' && ok(v));
const CAPYS = TEAM.map((c) => c.id) as CapyId[];

/** Nearest usable address to a retired slot: same map node first, else the next index (sites are sorted by node). */
function liveSite(i: number): number {
  const ok = (j: number) => j >= 0 && j < SITES.length && j !== PREFET_SITE && !RETIRED_SITES.has(j);
  const same = SITES.findIndex((s, j) => ok(j) && s.node === SITES[i].node); if (same >= 0) return same;
  for (let k = 1; k < SITES.length; k++) { if (ok(i + k)) return i + k; if (ok(i - k)) return i - k; }
  return 0;
}
function ticket(t: unknown, id: string): t is Ticket {
  if (isObj(t) && t.prefet === true) t.site = PREFET_SITE; // the residence slot moved when the address pool changed size
  if (!isObj(t) || t.id !== id || !str(t.job) || !Object.hasOwn(JOBS, t.job) || !int(t.site, 0, SITES.length - 1) || !int(t.num, 0, 999) || !str(t.who)) return false;
  if (!Array.isArray(t.risks) || !t.risks.every((r) => typeof r === 'string' && Object.hasOwn(RISKS, r))) return false;
  if (t.rdv !== null && !(Array.isArray(t.rdv) && t.rdv.length === 2 && t.rdv.every((v) => int(v, 0, SLOTS - 1)))) return false;
  if (!int(t.day, 0, DAYS) || !int(t.slot, 0, SLOTS) || typeof t.gas !== 'boolean' || !int(t.tries, 0, 99)) return false;
  for (const k of ['avis', 'avail', 'deadline'] as const) if (t[k] !== null && !int(t[k], 0, DAYS + 9)) return false;
  if (t.vip !== undefined && !(typeof t.vip === 'string' && Object.hasOwn(VIPS, t.vip))) return false;
  return ['avant', 'apres', 'na'].includes(t.side as string) && (t.habilitation === null || str(t.habilitation, 40));
}
function today(d: unknown, g: Game): d is DayState {
  if (!isObj(d) || d.day !== g.day || !int(d.slot, 0, SLOTS) || !['briefing', 'plan', 'run', 'close'].includes(d.phase as string) || !['start', 'mid'].includes(d.sub as string)) return false;
  const known = (s: string) => Object.hasOwn(g.tickets, s);
  if (!isObj(d.plan) || !CAPYS.every((c) => ids((d.plan as Record<string, unknown>)[c], known))) return false;
  // the trades were split (PRC / réseau): a planned ticket its capy can no longer do goes back to the pile
  for (const c of CAPYS) (d.plan as Record<string, string[]>)[c] = (d.plan as Record<string, string[]>)[c].filter((id) => slotsFor(CAPY[c], JOBS[g.tickets[id].job]) !== null);
  if (!isObj(d.capys) || !CAPYS.every((c) => { const r = (d.capys as Record<string, unknown>)[c]; return isObj(r) && int(r.pos, 0, NODE_COUNT - 1) && (r.job === null || (str(r.job) && known(r.job))) && (r.target === null || (str(r.target) && known(r.target))) && int(r.left, 0, 20) && int(r.travel, 0, 9) && int(r.extra, 0, 20) && int(r.started, -1, SLOTS); })) return false;
  // pending cards are kept, so reloading never skips a card (or a safety incident)
  if (!Array.isArray(d.pending) || !d.pending.every((p) => isObj(p) && ['risk', 'event', 'safety', 'mini'].includes(p.kind as string) && str(p.card, 40)
    && (p.kind !== 'risk' || Object.hasOwn(RISKS, p.card as string)) && (p.kind !== 'event' || Object.hasOwn(EVENTS, p.card as string))
    && (p.capy === null || CAPYS.includes(p.capy as CapyId)) && (p.ticket === null || (str(p.ticket) && known(p.ticket))))) return false;
  for (const k of ['done', 'postponed', 'absentOk', 'rdvToday', 'rdvKept', 'rdvMissed'] as const) if (!ids(d[k], () => true)) return false;
  if (Array.isArray(d.log)) d.log = d.log.map((s) => (typeof s === 'string' ? s.replace(/\bMomo\b/g, 'Fred').replace(/^(1[3-7]) h · /, '$1 h 30 · ') : s)); // afternoon slots moved from 13h-17h to 13h30-17h30 (same indices) // Momo was renamed Fred (id stays 'momo')
  if (!Array.isArray(d.log) || !d.log.every((s) => str(s, 300)) || !Array.isArray(d.fired) || !d.fired.every((v) => int(v, 0, SLOTS))) return false;
  if (!isObj(d.hist) || !CAPYS.every((c) => Array.isArray((d.hist as Record<string, unknown>)[c]))) d.hist = { josette: [], momo: [], lulu: [] };
  if (d.vip !== undefined && !(isObj(d.vip) && Object.entries(d.vip).every(([id, k]) => known(id) && ['fast', 'mid', 'late'].includes(k as string)))) return false;
  if (d.y0 !== undefined && !num(d.y0, 0, 1)) delete d.y0; if (d.bg0 !== undefined && !num(d.bg0, 0, 1e5)) delete d.bg0;
  if (d.leaks !== undefined && !(isObj(d.leaks) && Object.values(d.leaks).every((v) => num(v, 0, 1e6)))) delete d.leaks;
  if (d.satWhy !== undefined && !(Array.isArray(d.satWhy) && d.satWhy.every((x) => isObj(x) && str(x.text, 300) && num(x.v, -100, 100)))) delete d.satWhy;
  if (d.story !== undefined && !(Array.isArray(d.story) && d.story.every((s) => str(s, 300)))) delete d.story;
  return num(d.m3, 0, 1e6) && num(d.night, 0, 1e6) && int(d.travel, 0, 99) && int(d.incidents, 0, 99) && isObj(d.urgent) && num(d.satStart, 0, 100);
}
const result = (h: unknown): h is DayResult => isObj(h) && int(h.day, 0, DAYS - 1) && int(h.stars, 0, 3) && Array.isArray(h.met) && num(h.m3, 0, 1e7) && num(h.yield, 0, 1) && int(h.done, 0, 99) && int(h.incidents, 0, 99) && num(h.sat, 0, 100);
/** A saved campaign is trusted only if every field is well-formed; otherwise it is dropped (settings and best scores survive). */
/** A generated day (gen.ts): only known cards, jobs, risks, calls and objectives. */
function spec(x: unknown): boolean {
  if (!isObj(x) || !str(x.card) || !Object.hasOwn(DAY_CARDS, x.card) || !int(x.rdv, 0, 5) || !str(x.chef, 400) || !Array.isArray(x.jobs) || x.jobs.length > 20 || !Array.isArray(x.events) || !Array.isArray(x.objs) || x.objs.length !== 3) return false;
  if (!x.jobs.every((j) => Array.isArray(j) && j.length >= 1 && Object.hasOwn(JOBS, j[0]) && j.slice(1).every((r: unknown) => typeof r === 'string' && Object.hasOwn(RISKS, r)))) return false;
  if (!x.events.every((e) => Array.isArray(e) && e.length === 2 && int(e[0], 0, SLOTS - 1) && typeof e[1] === 'string' && Object.hasOwn(EVENTS, e[1]))) return false;
  return x.objs.every((o) => isObj(o) && ['urgent', 'rdv', 'done', 'm3', 'backlog', 'travel', 'sat', 'yield'].includes(o.id as string) && (o.n === undefined || num(o.n, 0, 99)));
}
export function game(x: unknown): Game | null {
  if (!isObj(x) || x.v !== 1 || !int(x.seed, 0, 2 ** 32) || !int(x.day, 0, DAYS) || !isObj(x.tickets) || !num(x.sat, 0, 100) || !num(x.bg, 0, 1e5) || !int(x.next, 1, 1e6) || typeof x.over !== 'boolean') return null;
  const g = x as unknown as Game;
  if (!Object.entries(g.tickets).every(([id, t]) => ticket(t, id))) return null;
  if (!ids(g.pile, (s) => Object.hasOwn(g.tickets, s)) || !Array.isArray(g.history) || !g.history.every(result) || !ids(g.stickers, (s) => s === 'capydindon')) return null;
  if (!Array.isArray(g.news) || !g.news.every((s) => str(s, 300))) g.news = [];
  if (g.daily !== undefined && !(typeof g.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.daily))) return null;
  if (g.gen !== undefined && typeof g.gen !== 'boolean') delete g.gen;
  if (g.season !== undefined && !(['automne', 'hiver', 'printemps'] as unknown[]).includes(g.season)) delete g.season; // absent = summer (saves made before the seasons)
  if (g.specs !== undefined && !(isObj(g.specs) && Object.entries(g.specs).every(([k, v]) => /^[3-9]$/.test(k) && spec(v)))) delete g.specs; // a broken generated day is generated again
  if (g.moments !== undefined && !(Array.isArray(g.moments) && g.moments.every((s) => s === null || str(s, 400)))) delete g.moments;
  // the map changed (v1 intra-muros → v2 with the quartiers outside): graph node numbers moved, site indices did not;
  // each capy is put back at the site of its current ticket (or of the trip under way), else at the depot
  if ((g.map ?? 1) !== MAP_V) { const T = g.tickets as Record<string, Ticket | undefined>; const at = (id: unknown) => (typeof id === 'string' && T[id] && int(T[id]!.site, 0, SITES.length - 1) ? SITES[T[id]!.site].node : null);
    if (isObj(g.today) && isObj(g.today.capys)) for (const r of Object.values(g.today.capys as unknown as Record<string, Record<string, unknown>>)) if (isObj(r)) r.pos = at(r.job) ?? at(r.target) ?? DEPOT;
    g.map = MAP_V; }
  if (g.today !== null && !today(g.today, g)) return null;
  // ticket numbers always come from the real address of their site (older saves had invented numbers)
  for (const t of Object.values(g.tickets)) { if (t.prefet) t.site = PREFET_SITE; else if (RETIRED_SITES.has(t.site)) t.site = liveSite(t.site); t.num = SITES[t.site].num; }
  return g;
}
export function sanitize(x: unknown): Save {
  const s = defaults(); if (!isObj(x)) return s;
  if (isObj(x.settings)) { const i = x.settings; s.settings = { sfx: typeof i.sfx === 'boolean' ? i.sfx : true, music: typeof i.music === 'boolean' ? i.music : true, speed: i.speed === 2 ? 2 : 1 }; if (i.calm === true) s.settings.calm = true; if (i.expert === true) s.settings.expert = true; if (i.haptics === false) s.settings.haptics = false; }
  if (isObj(x.best)) { s.best = { stars: int(x.best.stars, 0, DAYS * 3) ? (x.best.stars as number) : 0, yield: num(x.best.yield, 0, 1) ? (x.best.yield as number) : 0, runs: int(x.best.runs, 0, 1e6) ? (x.best.runs as number) : 0 }; }
  s.seenTuto = x.seenTuto === true;
  s.player = cleanPlayer(x.player);
  s.game = game(structuredClone(x.game));
  return s;
}
export function load(): Save {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY) ?? localStorage.getItem(BACKUP_KEY); } catch { return defaults(); }
  if (!raw) return defaults();
  try { return sanitize(JSON.parse(raw)); } catch { try { localStorage.setItem(CORRUPT_KEY, raw.slice(0, 200_000)); } catch { /* full */ } return defaults(); }
}
export function save(s: Save) {
  try { const j = JSON.stringify(s); const prev = localStorage.getItem(KEY); if (prev && prev !== j) localStorage.setItem(BACKUP_KEY, prev); localStorage.setItem(KEY, j); } catch { /* private mode or full: the game still works */ }
}
