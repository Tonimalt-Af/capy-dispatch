// The player's dispatcher: name, sex (for grammatical agreement only) and capybara look.
// The name is user input: it is cleaned here and only ever rendered with textContent (see fillNames in main.ts).
import { FURS, OUTFITS, type Acc, type Look } from './art';

export type Sex = 'homme' | 'femme';
export interface Player { name: string; sex: Sex; look: Look }
export const NAME_MAX = 16;
export const ACCS: Acc[] = ['aucun', 'lunettes', 'noeud', 'meche', 'lavande'];
export const ACC_LABEL: Record<Acc, string> = { aucun: 'Rien', lunettes: 'Lunettes', noeud: 'Nœud', meche: 'Mèche', lavande: 'Lavande' };
export const FUR_LABEL: Record<string, string> = { caramel: 'Caramel', noisette: 'Noisette', miel: 'Miel' };
export const OUTFIT_LABEL: Record<string, string> = { marine: 'Marine', vert: 'Vert', bleu: 'Bleu ciel' };

/** Letters (any script), combining marks, spaces, apostrophes, hyphens and dots; no controls, no bidi tricks, no markup. */
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const s = raw.normalize('NFC').replace(/[\u2019\u02BC]/g, '’').replace(/[^\p{L}\p{M}\p{N} ’'.\-]/gu, '').replace(/\s+/g, ' ').replace(/^[\s’'.\-]+/, '').trim();
  return Array.from(s).slice(0, NAME_MAX).join('').trim();
}
export const validName = (s: string) => cleanName(s).length >= 1;
export function cleanPlayer(x: unknown): Player | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>; const l = (o.look ?? {}) as Record<string, unknown>;
  const name = cleanName(o.name); if (!name || (o.sex !== 'homme' && o.sex !== 'femme')) return null;
  return { name, sex: o.sex, look: {
    fur: typeof l.fur === 'string' && Object.hasOwn(FURS, l.fur) ? l.fur : 'caramel',
    acc: ACCS.includes(l.acc as Acc) ? (l.acc as Acc) : 'aucun',
    outfit: typeof l.outfit === 'string' && Object.hasOwn(OUTFITS, l.outfit) ? l.outfit : 'marine' } };
}

// ---- grammatical agreement (no inclusive writing: one form, chosen from the player's sex)
let SEX: Sex = 'homme';
export const setSex = (s: Sex) => { SEX = s; };
/** gx('prêt', 'prête') → the form agreeing with the player. */
export const gx = (m: string, f: string, sex: Sex = SEX) => (sex === 'femme' ? f : m);
/** Agree a template: '{Bienvenu|Bienvenue}' → one form. Only literal game copy goes through here (never the name). */
export const agree = (s: string, sex: Sex = SEX) => s.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, f: string) => (sex === 'femme' ? f : m));
/** Job title used throughout the copy. */
export const titre = (sex: Sex = SEX) => gx('ordonnanceur', 'ordonnanceuse', sex);
