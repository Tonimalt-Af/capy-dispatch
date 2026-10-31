// « Trouver le compteur » : a procedurally drawn Avignon façade (seeded per ticket, so the same ticket always
// gives the same house). The meter hides behind one of 6–7 hotspots. No timer: every wrong tap only costs
// "a bit of time", and the SIG hint narrows the search. Result: 0 or +1 slot on the job, never a failure.
import { rng } from './game';
import { ICONS } from './art';

export type SpotKind = 'regard' | 'niche' | 'soupirail' | 'jardiniere' | 'velo' | 'poubelles' | 'porte' | 'plaque';
export interface Spot { id: number; kind: SpotKind; x: number; y: number; r: number; ground: boolean; side: 'gauche' | 'droite'; label: string }
export interface Facade { svg: string; spots: Spot[]; meter: number; hint: string; hintSpots: number[] }
const W = 400, H = 240, STREET = 196;
const STONE = ['#EBCB9B', '#F2E2C4', '#E7B9A0', '#DCD3C2', '#EFD6A8'];
const SHUTTER = ['#8FA9C9', '#9DB59A', '#B5A3CF', '#C98B5B', '#6F9AA8', '#D9C27A'];
const WRONG: Record<SpotKind, string[]> = {
  regard: ["Un regard d'eaux pluviales (pas à nous)", 'La plaque du téléphone. Rien à voir.'],
  niche: ['Le coffret gaz. On ne touche pas !', 'Le coffret électrique, avec une toile d’araignée.'],
  soupirail: ['Juste un soupirail de cave. Un chat en sort.', 'Le soupirail. Ça sent la lavande.'],
  jardiniere: ['Des géraniums. Très jolis, aucun compteur.', 'Un pot de lavande. Une abeille proteste.'],
  velo: ['Un vélo attaché. Derrière : un escargot.', 'Un vieux vélo et beaucoup de poussière.'],
  poubelles: ['Les poubelles. Un pigeon y fait sa sieste.', 'Le bac jaune. Toujours pas de compteur.'],
  porte: ['Le hall : boîtes aux lettres, pas de compteur.', 'Une porte cochère fermée à double tour.'],
  plaque: ['Une plaque de rue en céramique. Jolie !', 'Une niche à santon, vide.'],
};
const FOUND: Partial<Record<SpotKind, string>> = { regard: 'dans le regard sous le trottoir', niche: 'dans la niche du mur', soupirail: 'derrière le soupirail', jardiniere: 'sous la jardinière', velo: 'derrière le vélo', poubelles: 'derrière les poubelles', porte: 'dans le hall, derrière la porte', plaque: 'derrière une trappe dans le mur' };
export const foundText = (k: SpotKind) => FOUND[k] ?? '';
export const wrongText = (f: Facade, id: number, seed: number) => { const k = f.spots[id].kind; const a = WRONG[k]; return a[(seed + id) % a.length]; };

export function facade(seed: number): Facade {
  const r = rng(seed * 7919 + 11); const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const stone = pick(STONE); const shut = pick(SHUTTER); const floors = 2 + Math.floor(r() * 2); const doorX = [110, 200, 290][Math.floor(r() * 3)];
  const fh = (STREET - 30) / (floors + 0.6); let s = ''; const dy = STREET - 62;
  // decoration uses its own generator, so the spot layout (drawn from r) never moves when the art changes
  const d = rng(seed * 7919 + 999); const dk = (c: string, k: number) => mix(c, 0, k), lite = (c: string, k: number) => mix(c, 255, k);
  // sky, distant roofs, wall in pierre de taille
  s += `<rect width="${W}" height="${H}" fill="#CDEBF7"/><circle cx="352" cy="30" r="15" fill="#FFE08A"/><circle cx="352" cy="30" r="22" fill="#FFE08A" opacity=".25"/>`;
  s += `<rect x="18" y="22" width="364" height="${STREET - 20}" rx="4" fill="${stone}" stroke="#fff" stroke-width="5"/>`;
  let joints = '';
  for (let y = 40, row = 0; y < STREET - 4; y += 13, row++) { joints += `M22 ${y} H378`; for (let x = 22 + (row % 2) * 17 + d() * 8; x < 376; x += 34 + d() * 10) joints += `M${x.toFixed(0)} ${y} v-13`; }
  s += `<path d="${joints}" stroke="${dk(stone, 14)}" stroke-width="1" opacity=".35" fill="none"/>`;
  // corner quoins (chaînage d'angle)
  for (let y = 30, i = 0; y < STREET - 8; y += 13, i++) { const w = i % 2 ? 14 : 22; s += `<rect x="20" y="${y}" width="${w}" height="12" rx="1.5" fill="${lite(stone, 30)}"/><rect x="${380 - w}" y="${y}" width="${w}" height="12" rx="1.5" fill="${lite(stone, 30)}"/>`; }
  // weathering (keeps the original draws from r so spots stay put)
  for (let i = 0; i < 18; i++) s += `<rect x="${30 + r() * 340}" y="${40 + r() * (STREET - 60)}" width="${10 + r() * 18}" height="${5 + r() * 4}" rx="2" fill="#5A3A1C" opacity="${0.03 + r() * 0.03}"/>`;
  // canal-tile roof with a génoise (two rows of tiles under the eaves)
  s += `<path d="M8 26 H392 L378 6 H22Z" fill="#D9774E" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>`;
  let tiles = ''; for (let x = 26; x < 376; x += 9) tiles += `M${x} 8 v17`; s += `<path d="${tiles}" stroke="#B85A35" stroke-width="2.2" opacity=".55"/>`;
  s += `<path d="M14 26 H386" stroke="#C9683F" stroke-width="3"/>`;
  for (const [yy, off] of [[30, 0], [35, 4]] as const) { let g = ''; for (let x = 22 + off; x < 378; x += 8) g += `M${x} ${yy} a4 4 0 0 0 8 0`; s += `<path d="${g}" fill="${dk(stone, 8)}" stroke="#fff" stroke-width="1.2"/>`; }
  // windows: stone surround, glazing bars, louvered provençal shutters (persiennes), sill
  const slats = (x: number, y: number, w: number, h: number) => { let p = ''; for (let k = y + 4; k < y + h - 2; k += 4) p += `M${x + 2} ${k} H${x + w - 2}`; return `<path d="${p}" stroke="#000" stroke-opacity=".2" stroke-width="1.4"/>`; };
  for (let f = 0; f < floors; f++) for (const x of [110, 200, 290]) {
    const y = 45 + f * fh; const w = 30, h = fh * 0.6; if (x === doorX && y + h > dy - 10) continue;
    s += `<rect x="${x - w / 2 - 4}" y="${y - 4}" width="${w + 8}" height="${h + 6}" rx="3" fill="${lite(stone, 35)}"/><rect x="${x - w / 2 - 6}" y="${y - 7}" width="${w + 12}" height="5" rx="2" fill="${lite(stone, 45)}"/>`;
    s += `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="2" fill="#5E7F94" stroke="#fff" stroke-width="2.4"/><path d="M${x} ${y} V${y + h} M${x - w / 2} ${y + h / 3} H${x + w / 2} M${x - w / 2} ${y + (2 * h) / 3} H${x + w / 2}" stroke="#fff" stroke-width="1.5" opacity=".75"/><path d="M${x - w / 2 + 3} ${y + 3} l7 0 l-7 7z" fill="#fff" opacity=".35"/>`;
    const open = r() < 0.6;
    if (open) s += `<rect x="${x - w / 2 - 16}" y="${y}" width="15" height="${h}" rx="2" fill="${shut}" stroke="#fff" stroke-width="2"/>${slats(x - w / 2 - 16, y, 15, h)}<rect x="${x + w / 2 + 1}" y="${y}" width="15" height="${h}" rx="2" fill="${shut}" stroke="#fff" stroke-width="2"/>${slats(x + w / 2 + 1, y, 15, h)}`;
    else s += `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="2" fill="${shut}" stroke="#fff" stroke-width="2"/>${slats(x - w / 2, y, w, h)}<path d="M${x} ${y} V${y + h}" stroke="#000" stroke-opacity=".22" stroke-width="1.6"/>`;
    const bal = f === 0 && floors > 2 && x === 200 && d() < 0.7;
    if (bal) { let bars = ''; for (let k = x - w / 2 - 2; k <= x + w / 2 + 2; k += 4) bars += `M${k} ${y + h - 12} V${y + h}`;
      s += `<rect x="${x - w / 2 - 6}" y="${y + h}" width="${w + 12}" height="4" rx="1.5" fill="${lite(stone, 40)}" stroke="#fff" stroke-width="1.5"/><path d="${bars} M${x - w / 2 - 3} ${y + h - 12} H${x + w / 2 + 3}" stroke="#3B3A3A" stroke-width="1.6" fill="none"/><path d="M${x - 6} ${y + h - 7} q6 -6 12 0" stroke="#3B3A3A" stroke-width="1.4" fill="none"/>`; }
    else s += `<rect x="${x - w / 2 - 5}" y="${y + h}" width="${w + 10}" height="5" rx="2" fill="${lite(stone, 50)}" stroke="#fff" stroke-width="1.2"/>`;
  }
  // ground floor: porte cochère (the "porte" spot) with voussoirs and keystone, a lantern, street, pavement
  const dw = 24; let vou = '';
  for (let i = 0; i <= 8; i++) { const t = Math.PI * (1 - i / 8); const cx = doorX + Math.cos(t) * (dw + 4), cy = dy + 14 - Math.sin(t) * 20; vou += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${i === 4 ? 0 : 4.2}" fill="${lite(stone, 30)}"/>`; }
  s += `<path d="M${doorX - dw - 6} ${STREET} V${dy + 14} C${doorX - dw - 6} ${dy - 12} ${doorX + dw + 6} ${dy - 12} ${doorX + dw + 6} ${dy + 14} V${STREET}Z" fill="${lite(stone, 30)}"/>${vou}`;
  s += `<path d="M${doorX - dw} ${STREET} V${dy + 14} C${doorX - dw} ${dy - 6} ${doorX + dw} ${dy - 6} ${doorX + dw} ${dy + 14} V${STREET}Z" fill="#7A4E2E" stroke="#fff" stroke-width="3.5"/>`;
  s += `<path d="M${doorX - 5} ${dy - 9} h10 l-2 9 h-6z" fill="${lite(stone, 45)}" stroke="#fff" stroke-width="1.5"/>`;
  s += `<path d="M${doorX} ${dy + 2} V${STREET} M${doorX - dw + 5} ${dy + 26} h${dw - 9} v${STREET - dy - 34} h-${dw - 9}z M${doorX + 4} ${dy + 26} h${dw - 9} v${STREET - dy - 34} h-${dw - 9}z" stroke="#5C3A20" stroke-width="1.8" fill="none"/><circle cx="${doorX + 9}" cy="${STREET - 30}" r="2.6" fill="#F5B82E"/><circle cx="${doorX - 9}" cy="${STREET - 30}" r="2.6" fill="#F5B82E"/>`;
  const lx = doorX + (d() < 0.5 ? -1 : 1) * (dw + 16);
  s += `<path d="M${lx} ${dy - 14} v-6 h${lx > doorX ? -6 : 6}" stroke="#3B3A3A" stroke-width="1.8" fill="none"/><path d="M${lx - 5} ${dy - 14} h10 l-2 11 h-6z" fill="#FFE59A" stroke="#3B3A3A" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<rect x="0" y="${STREET}" width="${W}" height="12" fill="#E9E1D3"/><path d="M0 ${STREET + 6} H${W}" stroke="#D8CDB9" stroke-width="1" stroke-dasharray="18 4"/><rect x="0" y="${STREET + 12}" width="${W}" height="${H - STREET - 12}" fill="#B8B2AA"/><path d="M0 ${STREET + 12} H${W}" stroke="#fff" stroke-width="3"/>`;
  let pav = ''; for (let y = STREET + 19; y < H; y += 8) for (let x = ((y / 8) % 2) * 6; x < W; x += 12) pav += `M${x} ${y} h8`; s += `<path d="${pav}" stroke="#A8A29A" stroke-width="1.2" opacity=".6"/>`;
  // candidate positions, by kind; pick 6–7 distinct ones
  const slots: Omit<Spot, 'id' | 'label'>[] = [];
  const free = [40, 70, 150, 160, 240, 250, 330, 360].filter((x) => Math.abs(x - doorX) > 40);
  const take = () => { const i = Math.floor(r() * free.length); const x = free[i]; free.splice(i, 1); for (let k = free.length - 1; k >= 0; k--) if (Math.abs(free[k] - x) < 34) free.splice(k, 1); return x; };
  const side = (x: number): 'gauche' | 'droite' => (x < doorX ? 'gauche' : 'droite');
  slots.push({ kind: 'porte', x: doorX, y: STREET - 34, r: 26, ground: false, side: 'gauche' });
  const kinds: SpotKind[] = ['regard', 'niche', 'soupirail', 'jardiniere', 'velo', 'poubelles', 'plaque'];
  for (const k of kinds.sort(() => r() - 0.5)) { if (!free.length || slots.length >= 7) break; const x = take();
    const y = k === 'regard' ? STREET + 26 : k === 'niche' ? STREET - 44 : k === 'soupirail' ? STREET - 10 : k === 'plaque' ? STREET - 70 : STREET - 18;
    slots.push({ kind: k, x, y, r: k === 'regard' ? 20 : 22, ground: k === 'regard' || k === 'soupirail', side: side(x) }); }
  if (!slots.some((x) => x.kind === 'regard')) slots.push({ kind: 'regard', x: doorX < 200 ? 330 : 70, y: STREET + 26, r: 20, ground: true, side: doorX < 200 ? 'droite' : 'gauche' });
  const spots: Spot[] = slots.map((x, id) => ({ ...x, id, label: x.kind }));
  for (const sp of spots) s += drawSpot(sp, shut);
  // the meter is never behind the door on the first houses (too easy): seeded among the others
  const cand = spots.filter((x) => x.kind !== 'porte'); const meter = cand[Math.floor(r() * cand.length)].id; const m = spots[meter];
  const byGround = r() < 0.5;
  const hintSpots = spots.filter((x) => (byGround ? x.ground === m.ground : x.side === m.side) && x.kind !== 'porte').map((x) => x.id);
  const hint = byGround ? (m.ground ? 'Le SIG indique : compteur au niveau du sol ou dessous.' : 'Le SIG indique : compteur dans le mur, pas sous le trottoir.') : `Le SIG indique : compteur à ${m.side} de la porte.`;
  return { svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="facade-svg">${s}</svg>`, spots, meter, hint, hintSpots };
}
/** Blend a #rrggbb colour towards black (0) or white (255) by k %. */
const mix = (c: string, to: number, k: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - k / 100) + to * (k / 100)).toString(16).padStart(2, '0')).join('');
function drawSpot(sp: Spot, shut: string): string {
  const { x, y } = sp; const o = 'stroke="#fff" stroke-width="3" stroke-linejoin="round"';
  switch (sp.kind) {
    case 'regard': return `<rect x="${x - 15}" y="${y - 9}" width="30" height="18" rx="3" fill="#6B6F75" ${o}/><path d="M${x - 11} ${y - 4} H${x + 11} M${x - 11} ${y} H${x + 11} M${x - 11} ${y + 4} H${x + 11}" stroke="#4A4E54" stroke-width="1.6"/>`;
    case 'niche': return `<rect x="${x - 13}" y="${y - 14}" width="26" height="28" rx="4" fill="#C9C3B6" ${o}/><rect x="${x - 9}" y="${y - 10}" width="18" height="20" rx="2" fill="#A9A397"/><circle cx="${x + 5}" cy="${y}" r="1.8" fill="#6B6F75"/>`;
    case 'soupirail': return `<rect x="${x - 16}" y="${y - 8}" width="32" height="14" rx="3" fill="#3E342B" ${o}/>${[-9, -3, 3, 9].map((k) => `<path d="M${x + k} ${y - 7} V${y + 5}" stroke="#8A8174" stroke-width="2"/>`).join('')}`;
    case 'jardiniere': return `<path d="M${x - 17} ${y - 4} H${x + 17} L${x + 13} ${y + 14} H${x - 13}Z" fill="#C8693F" ${o}/><circle cx="${x - 8}" cy="${y - 10}" r="7" fill="#7FB069" ${o}/><circle cx="${x + 7}" cy="${y - 12}" r="8" fill="#8CC074" ${o}/><circle cx="${x - 8}" cy="${y - 13}" r="2.4" fill="#EF6F8E"/><circle cx="${x + 9}" cy="${y - 15}" r="2.4" fill="#B48EDB"/><circle cx="${x + 2}" cy="${y - 8}" r="2.2" fill="#EF6F8E"/>`;
    case 'velo': return `<g ${o} fill="none"><circle cx="${x - 12}" cy="${y + 4}" r="9" stroke="#3B2416" stroke-width="3"/><circle cx="${x + 12}" cy="${y + 4}" r="9" stroke="#3B2416" stroke-width="3"/></g><path d="M${x - 12} ${y + 4} L${x - 3} ${y - 9} L${x + 9} ${y - 9} L${x + 12} ${y + 4} M${x - 3} ${y - 9} L${x + 1} ${y + 4} L${x + 9} ${y - 9}" stroke="${shut}" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M${x - 6} ${y - 13} H${x}" stroke="#3B2416" stroke-width="3" stroke-linecap="round"/>`;
    case 'poubelles': return `<rect x="${x - 17}" y="${y - 14}" width="16" height="26" rx="3" fill="#7A8C6E" ${o}/><rect x="${x + 1}" y="${y - 14}" width="16" height="26" rx="3" fill="#F2C94C" ${o}/>`;
    case 'plaque': return `<rect x="${x - 17}" y="${y - 9}" width="34" height="18" rx="4" fill="#F6F1E6" stroke="#2D5BA8" stroke-width="2.4"/><path d="M${x - 10} ${y} H${x + 10}" stroke="#2D5BA8" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'porte': return '';
  }
}
/** Sticker of the found meter, drawn on top of the façade. */
export const meterSvg = (sp: Spot) => `<g transform="translate(${sp.x - 16} ${sp.y - 16})" class="found">${ICONS.meter.replace(/<svg[^>]*>/, '<svg width="32" height="32" viewBox="0 0 32 32">')}</g>`;
/** 0 extra slot if found with at most one wrong tap and no hint, or no wrong tap with the hint; +1 otherwise. */
export const miniScore = (wrong: number, hint: boolean) => (wrong + (hint ? 1 : 0) <= 1 ? 0 : 1) as 0 | 1;
