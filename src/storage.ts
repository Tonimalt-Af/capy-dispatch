// Local save. Every key is prefixed 'capy-dispatch-': the github.io origin is shared with Maxime's other games
// (Mahjong Capybaras uses 'capy-mahjong-'), and the two games share nothing on purpose.
import { JOBS, RISKS, TEAM, EVENTS, type CapyId } from './content';
import { SITES, NODE_COUNT } from './map';
import { DAYS, SLOTS } from './rules';
import type { Game, Ticket, DayState, DayResult } from './game';
import { cleanPlayer, type Player } from './player';

export const KEY = 'capy-dispatch-v1';
export const BACKUP_KEY = 'capy-dispatch-v1.bak';
export const CORRUPT_KEY = 'capy-dispatch-v1.corrupt';
export interface Settings { sfx: boolean; music: boolean; speed: 1 | 2 }
export interface Save { settings: Settings; game: Game | null; best: { stars: number; yield: number; runs: number }; seenTuto: boolean; player: Player | null }
/** `player: null` = no character yet: the creation screen is shown (first launch, and once for saves made before v0.2). */
export const defaults = (): Save => ({ player: null, settings: { sfx: true, music: true, speed: 1 }, game: null, best: { stars: 0, yield: 0, runs: 0 }, seenTuto: false });

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const int = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
const num = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const str = (x: unknown, max = 200): x is string => typeof x === 'string' && x.length <= max;
const ids = (x: unknown, ok: (s: string) => boolean) => Array.isArray(x) && x.every((v) => typeof v === 'string' && ok(v));
const CAPYS = TEAM.map((c) => c.id) as CapyId[];

function ticket(t: unknown, id: string): t is Ticket {
  if (!isObj(t) || t.id !== id || !str(t.job) || !Object.hasOwn(JOBS, t.job) || !int(t.site, 0, SITES.length - 1) || !int(t.num, 0, 999) || !str(t.who)) return false;
  if (!Array.isArray(t.risks) || !t.risks.every((r) => typeof r === 'string' && Object.hasOwn(RISKS, r))) return false;
  if (t.rdv !== null && !(Array.isArray(t.rdv) && t.rdv.length === 2 && t.rdv.every((v) => int(v, 0, SLOTS - 1)))) return false;
  if (!int(t.day, 0, DAYS) || !int(t.slot, 0, SLOTS) || typeof t.gas !== 'boolean' || !int(t.tries, 0, 99)) return false;
  for (const k of ['avis', 'avail', 'deadline'] as const) if (t[k] !== null && !int(t[k], 0, DAYS + 9)) return false;
  return ['avant', 'apres', 'na'].includes(t.side as string) && (t.habilitation === null || str(t.habilitation, 40));
}
function today(d: unknown, g: Game): d is DayState {
  if (!isObj(d) || d.day !== g.day || !int(d.slot, 0, SLOTS) || !['briefing', 'plan', 'run', 'close'].includes(d.phase as string) || !['start', 'mid'].includes(d.sub as string)) return false;
  const known = (s: string) => Object.hasOwn(g.tickets, s);
  if (!isObj(d.plan) || !CAPYS.every((c) => ids((d.plan as Record<string, unknown>)[c], known))) return false;
  if (!isObj(d.capys) || !CAPYS.every((c) => { const r = (d.capys as Record<string, unknown>)[c]; return isObj(r) && int(r.pos, 0, NODE_COUNT - 1) && (r.job === null || (str(r.job) && known(r.job))) && (r.target === null || (str(r.target) && known(r.target))) && int(r.left, 0, 20) && int(r.travel, 0, 9) && int(r.extra, 0, 20) && int(r.started, -1, SLOTS); })) return false;
  // pending cards are kept, so reloading never skips a card (or a safety incident)
  if (!Array.isArray(d.pending) || !d.pending.every((p) => isObj(p) && ['risk', 'event', 'safety', 'mini'].includes(p.kind as string) && str(p.card, 40)
    && (p.kind !== 'risk' || Object.hasOwn(RISKS, p.card as string)) && (p.kind !== 'event' || Object.hasOwn(EVENTS, p.card as string))
    && (p.capy === null || CAPYS.includes(p.capy as CapyId)) && (p.ticket === null || (str(p.ticket) && known(p.ticket))))) return false;
  for (const k of ['done', 'postponed', 'absentOk', 'rdvToday', 'rdvKept', 'rdvMissed'] as const) if (!ids(d[k], () => true)) return false;
  if (!Array.isArray(d.log) || !d.log.every((s) => str(s, 300)) || !Array.isArray(d.fired) || !d.fired.every((v) => int(v, 0, SLOTS))) return false;
  if (!isObj(d.hist) || !CAPYS.every((c) => Array.isArray((d.hist as Record<string, unknown>)[c]))) d.hist = { josette: [], momo: [], lulu: [] };
  return num(d.m3, 0, 1e6) && num(d.night, 0, 1e6) && int(d.travel, 0, 99) && int(d.incidents, 0, 99) && isObj(d.urgent) && num(d.satStart, 0, 100);
}
const result = (h: unknown): h is DayResult => isObj(h) && int(h.day, 0, DAYS - 1) && int(h.stars, 0, 3) && Array.isArray(h.met) && num(h.m3, 0, 1e7) && num(h.yield, 0, 1) && int(h.done, 0, 99) && int(h.incidents, 0, 99) && num(h.sat, 0, 100);
/** A saved campaign is trusted only if every field is well-formed; otherwise it is dropped (settings and best scores survive). */
export function game(x: unknown): Game | null {
  if (!isObj(x) || x.v !== 1 || !int(x.seed, 0, 2 ** 32) || !int(x.day, 0, DAYS) || !isObj(x.tickets) || !num(x.sat, 0, 100) || !num(x.bg, 0, 1e5) || !int(x.next, 1, 1e6) || typeof x.over !== 'boolean') return null;
  const g = x as unknown as Game;
  if (!Object.entries(g.tickets).every(([id, t]) => ticket(t, id))) return null;
  if (!ids(g.pile, (s) => Object.hasOwn(g.tickets, s)) || !Array.isArray(g.history) || !g.history.every(result) || !ids(g.stickers, (s) => s === 'capydindon')) return null;
  if (!Array.isArray(g.news) || !g.news.every((s) => str(s, 300))) g.news = [];
  if (g.today !== null && !today(g.today, g)) return null;
  return g;
}
export function sanitize(x: unknown): Save {
  const s = defaults(); if (!isObj(x)) return s;
  if (isObj(x.settings)) { const i = x.settings; s.settings = { sfx: typeof i.sfx === 'boolean' ? i.sfx : true, music: typeof i.music === 'boolean' ? i.music : true, speed: i.speed === 2 ? 2 : 1 }; }
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
