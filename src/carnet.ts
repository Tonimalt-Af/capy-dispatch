// The field notebook (section 14 P2, made permanent in section 16): stickers found while playing.
// carnet(g) reads what the current campaign has found; the « livre » is the permanent copy, saved under its own key,
// so « Nouvelle quinzaine » never erases a sticker. Existing saves are migrated on first load (what the current
// campaign already found is copied in). Season pages: one sticker per special day held with at least 2 ★.
import { VIPS, seasonDays, type VipId, type DaySpec } from './content';
import { facade, type SpotKind } from './facade';
import type { Game } from './game';

export type Group = 'rare' | 'habitue' | 'compteur' | 'saison';
export interface Sticker { id: string; group: Group; label: string; hint: string; got: boolean; /** season page */ page?: string }
const RARE_SPOTS: [SpotKind, string][] = [['soupirail', 'Derrière le soupirail'], ['jardiniere', 'Sous la jardinière'], ['velo', 'Derrière le vélo'], ['poubelles', 'Derrière les poubelles'], ['plaque', 'Derrière la trappe']];
const VIP_ORDER: VipId[] = ['patron', 'rival', 'maire', 'agglo', 'cour', 'off', 'fontaine'];
/** Season pages: [day card, sticker label, page, hint]. */
export const SEASONS: [string, string, string, string][] = [
  ['festival', 'Festival tenu', 'Été', 'Une journée de Festival à 2 ★ ou plus'],
  ['orage', 'Après l’orage', 'Été', 'Un lendemain d’orage à 2 ★ ou plus'],
  ['pluie', 'Sous la pluie', 'Automne', 'Une journée de pluie à 2 ★ ou plus'],
  ['marche', 'Jour de marché', 'Automne', 'Un jour de marché aux Halles à 2 ★ ou plus'],
  ['gel', 'Grand froid', 'Hiver', 'Une journée de gel à 2 ★ ou plus'],
  ['redoux', 'Après le redoux', 'Hiver', 'Un jour de redoux à 2 ★ ou plus'],
  ['mistral', 'Mistral dompté', 'Hiver', 'Une journée de mistral à 2 ★ ou plus'],
  ['calme', 'Ciel bleu', 'Printemps', 'Une journée calme à 3 ★'],
];
const specFor = (g: Game, day: number): DaySpec | undefined => g.specs?.[day] ?? seasonDays(g.season)[day];

export function carnet(g: Game): Sticker[] {
  const done = Object.values(g.tickets).filter((t) => !g.pile.includes(t.id) && t.day <= g.day);
  const vips = new Set(done.map((t) => t.vip).filter(Boolean)); const prefet = done.some((t) => t.prefet);
  const spots = new Set(done.filter((t) => t.job === 'introuvable').map((t) => { const f = facade(t.num * 131 + t.site); return f.spots[f.meter].kind; }));
  const held = new Set(g.history.filter((h) => h.stars >= (specFor(g, h.day)?.card === 'calme' ? 3 : 2)).map((h) => specFor(g, h.day)?.card));
  return [
    { id: 'capydindon', group: 'rare', label: 'Capydindon', hint: 'Il paraît qu’il se cache dans un regard…', got: g.stickers.includes('capydindon') },
    ...VIP_ORDER.map((v): Sticker => ({ id: `vip-${v}`, group: 'habitue', label: VIPS[v].tag, hint: 'Un appel qui ne tombe pas tous les jours', got: vips.has(v) })),
    { id: 'prefet', group: 'habitue', label: 'Préfecture', hint: 'Le majordome est toujours là', got: prefet },
    ...RARE_SPOTS.map(([k, l]): Sticker => ({ id: `cpt-${k}`, group: 'compteur', label: l, hint: 'Un compteur introuvable bien caché', got: spots.has(k) })),
    ...SEASONS.map(([c, l, p, h]): Sticker => ({ id: `sai-${c}`, group: 'saison', label: l, hint: h, page: p, got: held.has(c) })),
  ];
}

// ---------------------------------------------------------------- the permanent book
export const BOOK_KEY = 'capy-dispatch-v1-carnet';
/** got: sticker id -> date it was first found (YYYY-MM-DD). */
export interface Book { v: 1; got: Record<string, string> }
const ID = /^(capydindon|prefet|vip-[a-z]+|cpt-[a-z]+|sai-[a-z]+)$/;
export function readBook(raw: string | null): Book {
  try { const x = JSON.parse(raw ?? 'null'); if (x && x.v === 1 && x.got && typeof x.got === 'object') { const got: Record<string, string> = {};
    for (const [k, v] of Object.entries(x.got)) if (ID.test(k) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) got[k] = v; return { v: 1, got }; } } catch { /* corrupt: start again */ }
  return { v: 1, got: {} };
}
/** Copy what this campaign found into the book; returns the ids that are new to the book. */
export function merge(book: Book, g: Game | null, today: string): string[] {
  if (!g) return []; const fresh: string[] = [];
  for (const s of carnet(g)) if (s.got && !book.got[s.id]) { book.got[s.id] = today; fresh.push(s.id); }
  return fresh;
}
/** The stickers as the player sees them: found in the book or in the campaign. */
export const bookView = (book: Book, g: Game | null): Sticker[] => (g ? carnet(g) : carnet({ tickets: {}, pile: [], day: 0, stickers: [], history: [] } as unknown as Game)).map((s) => ({ ...s, got: s.got || !!book.got[s.id] }));
