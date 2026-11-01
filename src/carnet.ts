// The field notebook (section 14, P2): stickers collected during the fortnight, shown at the Friday pot.
// Everything is derived from the saved campaign (no new save field): a ticket counts once it is done (out of the pile).
import { VIPS, type VipId } from './content';
import { facade, type SpotKind } from './facade';
import type { Game } from './game';

export interface Sticker { id: string; group: 'rare' | 'habitue' | 'compteur'; label: string; hint: string; got: boolean }
const RARE_SPOTS: [SpotKind, string][] = [['soupirail', 'Derrière le soupirail'], ['jardiniere', 'Sous la jardinière'], ['velo', 'Derrière le vélo'], ['poubelles', 'Derrière les poubelles'], ['plaque', 'Derrière la trappe']];
const VIP_ORDER: VipId[] = ['patron', 'rival', 'maire', 'agglo', 'cour', 'off', 'fontaine'];

export function carnet(g: Game): Sticker[] {
  const done = Object.values(g.tickets).filter((t) => !g.pile.includes(t.id) && t.day <= g.day);
  const vips = new Set(done.map((t) => t.vip).filter(Boolean)); const prefet = done.some((t) => t.prefet);
  const spots = new Set(done.filter((t) => t.job === 'introuvable').map((t) => { const f = facade(t.num * 131 + t.site); return f.spots[f.meter].kind; }));
  return [
    { id: 'capydindon', group: 'rare', label: 'Capydindon', hint: 'Il paraît qu’il se cache dans un regard…', got: g.stickers.includes('capydindon') },
    ...VIP_ORDER.map((v): Sticker => ({ id: `vip-${v}`, group: 'habitue', label: VIPS[v].tag, hint: 'Un appel qui ne tombe pas tous les jours', got: vips.has(v) })),
    { id: 'prefet', group: 'habitue', label: 'Préfecture', hint: 'Le majordome est toujours là', got: prefet },
    ...RARE_SPOTS.map(([k, l]): Sticker => ({ id: `cpt-${k}`, group: 'compteur', label: l, hint: 'Un compteur introuvable bien caché', got: spots.has(k) })),
  ];
}
