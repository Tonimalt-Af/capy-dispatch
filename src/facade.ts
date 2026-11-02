// « Trouver le compteur » : a procedurally drawn Avignon façade (seeded per ticket, so the same ticket always
// gives the same house). The meter hides behind one of 6–7 hotspots. No timer: every wrong tap only costs
// "a bit of time", and the SIG hint narrows the search. Result: 0 or +1 slot on the job, never a failure.
// Gameplay RNG is `r` (spot layout). Decoration RNG is `d` — art can change without moving a hotspot.
import { rng } from './game';

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
/** Spoken name of a hotspot, for the button label (« Chercher la jardinière »). */
export const spotLabel: Record<SpotKind, string> = { regard: 'le regard', niche: 'le coffret', soupirail: 'le soupirail', jardiniere: 'la jardinière', velo: 'le vélo', poubelles: 'les poubelles', porte: 'la porte', plaque: 'la plaque' };

const R = (n: number) => (Math.round(n * 10) / 10).toString();
/** Blend a #rrggbb colour towards black (0) or white (255) by k %. */
const mix = (c: string, to: number, k: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - k / 100) + to * (k / 100)).toString(16).padStart(2, '0')).join('');

export function facade(seed: number): Facade {
  const r = rng(seed * 7919 + 11); const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const stone = pick(STONE); const shut = pick(SHUTTER); const floors = 2 + Math.floor(r() * 2); const doorX = [110, 200, 290][Math.floor(r() * 3)];
  const fh = (STREET - 30) / (floors + 0.6); const dy = STREET - 62;
  const d = rng(seed * 7919 + 999);
  const dk = (c: string, k: number) => mix(c, 0, k), lite = (c: string, k: number) => mix(c, 255, k);
  const gid = `f${(seed >>> 0).toString(36)}`;
  // weathering keeps the original draws from r so the hotspot layout never moves when the picture changes
  const stains: { x: number; y: number; w: number; h: number; o: number }[] = [];
  for (let i = 0; i < 18; i++) stains.push({ x: 30 + r() * 340, y: 40 + r() * (STREET - 60), w: 10 + r() * 18, h: 5 + r() * 4, o: 0.03 + r() * 0.03 });

  const sunRight = d() < 0.5; const sunX = sunRight ? 358 : 42;
  const chimneyX = d() < 0.5 ? 72 : 312;
  const pigeon = d() < 0.62; const pigeonX = 130 + d() * 140;
  let sky = `<defs>
    <linearGradient id="${gid}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ECBF0"/><stop offset="1" stop-color="#E5F6FD"/></linearGradient>
    <linearGradient id="${gid}-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lite(stone, 16)}"/><stop offset="1" stop-color="${dk(stone, 7)}"/></linearGradient>
    <linearGradient id="${gid}-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F09A6A"/><stop offset="1" stop-color="#C85B38"/></linearGradient>
    <linearGradient id="${gid}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8FCFF"/><stop offset=".55" stop-color="#A9D0E4"/><stop offset="1" stop-color="#6E9FB4"/></linearGradient>
    <linearGradient id="${gid}-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A56B3E"/><stop offset=".5" stop-color="#8A5430"/><stop offset="1" stop-color="#6B4124"/></linearGradient>
  </defs>`;
  sky += `<rect width="${W}" height="${H}" fill="url(#${gid}-sky)"/>`;
  sky += `<circle cx="${sunX}" cy="18" r="22" fill="#FFE08A" opacity=".35"/><circle cx="${sunX}" cy="18" r="13" fill="#FFE39A" stroke="#fff" stroke-width="3" paint-order="stroke"/>`;
  const cloud = (x: number, y: number, s: number) => `<g fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${R(16 * s)}" ry="${R(6.5 * s)}"/><ellipse cx="${R(x - 9 * s)}" cy="${R(y + 2 * s)}" rx="${R(9 * s)}" ry="${R(5.5 * s)}"/><ellipse cx="${R(x + 10 * s)}" cy="${R(y + 1 * s)}" rx="${R(10 * s)}" ry="${R(5.2 * s)}"/></g>`;
  sky += cloud(sunRight ? 78 : 250, 16, 1) + cloud(sunRight ? 150 : 310, 26, 0.72);

  let house = '';
  house += `<path d="M4 44 L28 14 H372 L396 44 Z" fill="url(#${gid}-roof)" stroke="#fff" stroke-width="4" stroke-linejoin="round" paint-order="stroke"/>`;
  let tiles = '';
  for (let row = 0; row < 2; row++) for (let x = 36 + row * 9; x < 368; x += 18) tiles += `M${x} ${20 + row * 9} q8 7 0 12`;
  house += `<path d="${tiles}" fill="none" stroke="#A84830" stroke-width="1.5" stroke-linecap="round" opacity=".4"/>`;
  house += `<path d="M26 16 H374" stroke="#F3C2A4" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  house += `<rect x="${chimneyX}" y="2" width="18" height="24" rx="2" fill="${dk(stone, 14)}" stroke="#fff" stroke-width="2.6" paint-order="stroke"/>`;
  house += `<rect x="${chimneyX - 2}" y="0" width="22" height="5" rx="1.5" fill="${dk(stone, 24)}" stroke="#fff" stroke-width="2" paint-order="stroke"/>`;
  if (pigeon) house += `<g transform="translate(${R(pigeonX)} 13)"><ellipse cx="0" cy="3" rx="8" ry="4.2" fill="#8E8B97" stroke="#fff" stroke-width="2.2" paint-order="stroke"/><circle cx="6.5" cy="0.5" r="3.3" fill="#A09CAD" stroke="#fff" stroke-width="2" paint-order="stroke"/><circle cx="7.4" cy="0" r=".7" fill="#3B2416"/><path d="M9.4 .8 h3.2" stroke="#E07A4A" stroke-width="1.4" stroke-linecap="round"/></g>`;

  house += `<rect x="20" y="40" width="360" height="${STREET - 40}" rx="2" fill="url(#${gid}-wall)" stroke="#fff" stroke-width="4" paint-order="stroke"/>`;
  let genoise = '';
  for (let x = 14; x < 386; x += 12) genoise += `M${x} 42 a6 5.5 0 0 1 12 0 Z`;
  house += `<path d="${genoise}" fill="${lite(stone, 6)}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>`;
  let joints = '';
  for (let y = 56, row = 0; y < STREET - 2; y += 16, row++) { joints += `M28 ${y} H372`; const off = (row % 2) * 18; for (let x = 28 + off; x < 372; x += 36) joints += `M${x} ${y} v-16`; }
  house += `<path d="${joints}" stroke="${dk(stone, 18)}" stroke-width="1" opacity=".28" fill="none"/>`;
  for (let y = 46, i = 0; y < STREET - 10; y += 18, i++) { const w = i % 2 ? 11 : 18; house += `<rect x="22" y="${y}" width="${w}" height="15" fill="${lite(stone, 26)}"/><rect x="${378 - w}" y="${y}" width="${w}" height="15" fill="${lite(stone, 26)}"/>`; }
  for (const st of stains) house += `<ellipse cx="${R(st.x)}" cy="${R(st.y)}" rx="${R(st.w * 0.35)}" ry="${R(Math.max(1.6, st.h * 0.55))}" fill="#8A5A32" opacity="${R(st.o)}"/>`;

  const shutter = (x: number, y: number, w: number, h: number, split: boolean) => {
    const dark = dk(shut, 24);
    let p = ''; for (let k = y + 3.5; k < y + h - 2; k += 3.6) p += `M${R(x + 1.6)} ${R(k)} H${R(x + w - 1.6)}`;
    return `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" rx="2" fill="${shut}" stroke="#fff" stroke-width="2" stroke-linejoin="round" paint-order="stroke"/><path d="${p}" stroke="${dark}" stroke-width="1.15" stroke-linecap="round" opacity=".55"/>${split ? `<path d="M${R(x + w / 2)} ${R(y)} V${R(y + h)}" stroke="${dark}" stroke-width="1.3"/>` : ''}`;
  };
  for (let f = 0; f < floors; f++) for (const x of [110, 200, 290]) {
    const y = 45 + f * fh; const w = 30, h = fh * 0.6; if (x === doorX && y + h > dy - 10) continue;
    const open = r() < 0.6; const x0 = x - w / 2;
    house += `<rect x="${R(x0 - 3)}" y="${R(y - 3)}" width="${R(w + 6)}" height="${R(h + 7)}" rx="2.5" fill="${lite(stone, 34)}"/>`;
    house += `<rect x="${R(x0 - 7)}" y="${R(y - 7)}" width="${R(w + 14)}" height="5" rx="1.5" fill="${lite(stone, 42)}" stroke="#fff" stroke-width="1.4" paint-order="stroke"/>`;
    if (open) {
      house += `<rect x="${R(x0)}" y="${R(y)}" width="${w}" height="${R(h)}" rx="1.5" fill="url(#${gid}-glass)"/>`;
      house += `<path d="M${x} ${R(y)} V${R(y + h)} M${R(x0)} ${R(y + h / 2)} H${R(x0 + w)}" stroke="#fff" stroke-width="1.7" opacity=".9"/>`;
      house += `<path d="M${R(x0 + 2)} ${R(y + 2)} h5 l-5 6 z" fill="#fff" opacity=".7"/>`;
      house += shutter(x0 - 13, y, 12, h, false) + shutter(x0 + w + 1, y, 12, h, false);
    } else house += shutter(x0, y, w, h, true);
    const bal = f === 0 && floors > 2 && x === 200 && d() < 0.7;
    if (bal) {
      let bars = ''; for (let k = x0 - 2; k <= x0 + w + 2; k += 5) bars += `M${R(k)} ${R(y + h - 16)} V${R(y + h)}`;
      house += `<path d="${bars} M${R(x0 - 3)} ${R(y + h - 16)} H${R(x0 + w + 3)}" stroke="#3E3C3A" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
      house += `<path d="M${R(x - 7)} ${R(y + h - 9)} q7 -6 14 0" stroke="#3E3C3A" stroke-width="1.5" fill="none"/>`;
      house += `<rect x="${R(x0 - 8)}" y="${R(y + h)}" width="${R(w + 16)}" height="4.5" rx="1.5" fill="${lite(stone, 30)}" stroke="#fff" stroke-width="1.6" paint-order="stroke"/>`;
      house += `<circle cx="${R(x - 8)}" cy="${R(y + h - 4)}" r="2.2" fill="#EF5B7B"/><circle cx="${R(x)}" cy="${R(y + h - 6)}" r="2.3" fill="#F2C94C"/><circle cx="${R(x + 8)}" cy="${R(y + h - 4)}" r="2.1" fill="#E24B6A"/>`;
    } else house += `<rect x="${R(x0 - 6)}" y="${R(y + h)}" width="${R(w + 12)}" height="4.5" rx="1.5" fill="${lite(stone, 38)}" stroke="#fff" stroke-width="1.5" paint-order="stroke"/>`;
  }
  // a window box high on the wall (never down where the hotspots live)
  if (d() < 0.7) {
    const bx = doorX === 110 ? 290 : 110; const by = 45 + fh * 0.6 + 6;
    house += `<path d="M${bx - 16} ${R(by)} h32 l-3 7 h-26 z" fill="#C86B45" stroke="#fff" stroke-width="1.8" paint-order="stroke"/>`;
    house += `<circle cx="${bx - 8}" cy="${R(by - 3)}" r="3.2" fill="#7FBA6C"/><circle cx="${bx + 6}" cy="${R(by - 4)}" r="3.6" fill="#9ED48A"/><circle cx="${bx - 6}" cy="${R(by - 6)}" r="1.7" fill="#EF5B7B"/><circle cx="${bx + 5}" cy="${R(by - 7)}" r="1.8" fill="#F2C94C"/>`;
  }

  const dw = 18; const spring = dy + 22; const crown = dy - 30;
  // quadratic control sits above the spring line, so the arch always opens upward
  let door = `<g class="prop door" data-p="0">`;
  door += `<path d="M${doorX - dw - 6} ${STREET} V${spring} Q${doorX} ${crown} ${doorX + dw + 6} ${spring} V${STREET} Z" fill="${lite(stone, 22)}" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/>`;
  door += `<path d="M${doorX - dw + 1} ${spring} Q${doorX} ${crown + 12} ${doorX + dw - 1} ${spring} Z" fill="url(#${gid}-glass)"/>`;
  door += `<path d="M${doorX - dw + 1} ${spring - 2} Q${doorX} ${crown + 14} ${doorX + dw - 1} ${spring - 2}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".8"/>`;
  door += `<rect x="${doorX - dw}" y="${spring}" width="${dw * 2}" height="${STREET - spring - 2}" fill="url(#${gid}-wood)"/>`;
  door += `<path d="M${doorX} ${spring} V${STREET - 6}" stroke="#4A2E18" stroke-width="1.5"/>`;
  door += `<rect x="${doorX - dw + 3}" y="${spring + 6}" width="${dw - 7}" height="16" rx="1" fill="#5A341C" opacity=".38"/>`;
  door += `<rect x="${doorX + 4}" y="${spring + 6}" width="${dw - 7}" height="16" rx="1" fill="#5A341C" opacity=".38"/>`;
  door += `<circle cx="${doorX - 4}" cy="${spring + 24}" r="2.1" fill="#F5B82E" stroke="#C9851A" stroke-width=".8"/><circle cx="${doorX + 4}" cy="${spring + 24}" r="2.1" fill="#F5B82E" stroke="#C9851A" stroke-width=".8"/>`;
  door += `<rect x="${doorX - dw - 7}" y="${STREET - 4}" width="${(dw + 7) * 2}" height="6" rx="2" fill="${lite(stone, 8)}" stroke="#fff" stroke-width="1.8" paint-order="stroke"/>`;
  door += `</g>`;
  const lx = doorX + (d() < 0.5 ? -1 : 1) * 40;
  let lamp = `<g><path d="M${lx} ${R(dy + 8)} v-16" stroke="#3A3836" stroke-width="2" stroke-linecap="round"/>`;
  lamp += `<path d="M${lx - 6} ${R(dy - 8)} h12 l-2.2 13 h-7.6 z" fill="#FFE7A3" stroke="#3A3836" stroke-width="1.5" stroke-linejoin="round"/>`;
  lamp += `<circle cx="${lx}" cy="${R(dy - 2)}" r="8" fill="#FFE7A3" opacity=".35"/></g>`;

  let ground = `<rect x="0" y="${STREET}" width="${W}" height="18" fill="#EAD9C2"/>`;
  let slabs = ''; for (let x = 0; x < W; x += 28) slabs += `M${x} ${STREET} V${STREET + 18}`;
  ground += `<path d="M0 ${STREET + 9} H${W} ${slabs}" stroke="#DCC7A6" stroke-width="1.2"/>`;
  ground += `<rect x="0" y="${STREET + 18}" width="${W}" height="6" fill="#D3C0A2"/>`;
  ground += `<rect x="0" y="${STREET + 24}" width="${W}" height="${H - STREET - 24}" fill="#C9BEB2"/>`;
  let cob = '';
  for (let y = STREET + 30; y < H; y += 8) for (let x = ((y / 8) % 2) * 7; x < W; x += 14) cob += `M${x} ${y} h9`;
  ground += `<path d="${cob}" stroke="#A89888" stroke-width="1.15" opacity=".75"/>`;
  ground += `<ellipse cx="200" cy="${STREET + 1}" rx="168" ry="3.5" fill="#000" opacity=".06"/>`;

  // candidate positions, by kind; pick 6–7 distinct ones (this block is the gameplay RNG — do not reorder)
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
  let props = '';
  for (const sp of spots) if (sp.kind !== 'porte') props += `<g class="prop" data-p="${sp.id}" transform="translate(${sp.x} ${sp.y})">${drawSpot(sp.kind, shut)}</g>`;
  const cand = spots.filter((x) => x.kind !== 'porte'); const meter = cand[Math.floor(r() * cand.length)].id; const m = spots[meter];
  const byGround = r() < 0.5;
  const hintSpots = spots.filter((x) => (byGround ? x.ground === m.ground : x.side === m.side) && x.kind !== 'porte').map((x) => x.id);
  const hint = byGround ? (m.ground ? 'Le SIG indique : compteur au niveau du sol ou dessous.' : 'Le SIG indique : compteur dans le mur, pas sous le trottoir.') : `Le SIG indique : compteur à ${m.side} de la porte.`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="facade-svg" aria-hidden="true">${sky}${house}${door}${lamp}${ground}${props}</svg>`;
  return { svg, spots, meter, hint, hintSpots };
}

/** One searchable object, drawn around (0,0). White halo on the silhouette only, same sticker language as the map. */
function drawSpot(kind: SpotKind, shut: string): string {
  const halo = `stroke="#fff" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"`;
  switch (kind) {
    case 'regard': return `<ellipse cx="0" cy="1" rx="16" ry="4" fill="#000" opacity=".12"/><ellipse cx="0" cy="0" rx="15" ry="8" fill="#5C646C" ${halo}/><ellipse cx="0" cy="0" rx="10" ry="5" fill="#3C434A"/><ellipse cx="0" cy="0" rx="4.5" ry="2.3" fill="#2A3036"/><path d="M-7 -1.6 H7 M-7 1.8 H7" stroke="#22262A" stroke-width="1.3" stroke-linecap="round"/>`;
    case 'niche': return `<rect x="-13" y="-16" width="26" height="30" rx="3" fill="#D5CFC2" ${halo}/><rect x="-9" y="-12" width="18" height="22" rx="2" fill="#B7AFA0"/><path d="M-5 -8 H5 M-5 -5 H5 M-5 -2 H5" stroke="#6E675C" stroke-width="1.1" stroke-linecap="round" opacity=".8"/><circle cx="5" cy="2" r="1.6" fill="#5C564C"/><path d="M-11 -16 v4 M11 -16 v4" stroke="#8A8376" stroke-width="1.4" stroke-linecap="round"/>`;
    case 'soupirail': return `<rect x="-17" y="-8" width="34" height="16" rx="6" fill="#322820" ${halo}/><path d="M-11 -5 V6 M-4 -6 V6 M4 -6 V6 M11 -5 V6" stroke="#C9BBA6" stroke-width="2" stroke-linecap="round"/><ellipse cx="-4" cy="1" rx="1.5" ry="1.1" fill="#F6E27A"/><ellipse cx="3" cy="1" rx="1.5" ry="1.1" fill="#F6E27A"/><circle cx="-3.6" cy="1.2" r=".45" fill="#3B2416"/><circle cx="3.4" cy="1.2" r=".45" fill="#3B2416"/>`;
    case 'jardiniere': return `<ellipse cx="0" cy="13" rx="14" ry="3" fill="#000" opacity=".12"/><path d="M-16 -2 H16 L12 14 H-12 Z" fill="#D26542" ${halo}/><path d="M-17 -3 H17" stroke="#E88962" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="-7" cy="-9" rx="8" ry="6" fill="#6AAA5C" ${halo}/><ellipse cx="7" cy="-11" rx="8" ry="6.5" fill="#8BC97A" ${halo}/><circle cx="-9" cy="-13" r="2.5" fill="#EF5B7B"/><circle cx="-2" cy="-8" r="2.2" fill="#F2C94C"/><circle cx="6" cy="-15" r="2.6" fill="#E24B6A"/><circle cx="12" cy="-10" r="2.1" fill="#C9A0E8"/>`;
    case 'velo': return `<ellipse cx="0" cy="12" rx="18" ry="3" fill="#000" opacity=".1"/><g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"><circle cx="-12" cy="3" r="9"/><circle cx="12" cy="3" r="9"/></g><circle cx="-12" cy="3" r="9" fill="none" stroke="#3B2416" stroke-width="2.4"/><circle cx="12" cy="3" r="9" fill="none" stroke="#3B2416" stroke-width="2.4"/><circle cx="-12" cy="3" r="1.7" fill="#3B2416"/><circle cx="12" cy="3" r="1.7" fill="#3B2416"/><path d="M-12 3 L0 -8 L12 3 Z" fill="${shut}" stroke="#fff" stroke-width="2" stroke-linejoin="round" paint-order="stroke"/><path d="M-12 3 L0 -8 L12 3" fill="none" stroke="#3B2416" stroke-width="1.5" stroke-linejoin="round"/><path d="M-1 -8 H8" stroke="#3B2416" stroke-width="2" stroke-linecap="round"/><path d="M-5 -11 H1" stroke="#3B2416" stroke-width="2.3" stroke-linecap="round"/><circle cx="-2" cy="-11" r="1.5" fill="#3B2416"/>`;
    case 'poubelles': return `<ellipse cx="0" cy="14" rx="16" ry="3" fill="#000" opacity=".12"/><g ${halo}><rect x="-17" y="-12" width="16" height="24" rx="3.5" fill="#7D9A62"/><rect x="1" y="-13" width="16" height="25" rx="3.5" fill="#F2C94C"/></g><rect x="-16" y="-15" width="16" height="4" rx="1.5" fill="#5C7844"/><rect x="2" y="-16" width="16" height="4" rx="1.5" fill="#D4A62A"/><circle cx="-13" cy="13" r="1.7" fill="#3B2416"/><circle cx="6" cy="13" r="1.7" fill="#3B2416"/><path d="M-13 -12 v3 M9 -13 v3" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>`;
    case 'plaque': return `<rect x="-16" y="-11" width="32" height="22" rx="5" fill="#fff"/><rect x="-14" y="-9" width="28" height="18" rx="3.5" fill="#F6F1E6" stroke="#2D5BA8" stroke-width="1.8"/><circle cx="0" cy="-3.5" r="2.5" fill="#E8B98A"/><path d="M-5 6 L0 -1 L5 6 Z" fill="#E24B6A"/><circle cx="0" cy="-6.4" r="1.3" fill="#F5B82E"/>`;
    case 'porte': return '';
  }
}

/** Sticker of the found meter, drawn on top of the façade (inner group animates without moving the anchor). */
export const meterSvg = (sp: Spot) => `<g transform="translate(${sp.x} ${sp.y})"><g class="found">
  <circle r="18" fill="#F5B82E" opacity=".45"/><circle r="14" fill="#fff" stroke="#3B2416" stroke-width="1.4"/>
  <rect x="-9" y="-7" width="18" height="14" rx="3.5" fill="#2F6F8F"/>
  <rect x="-6" y="-4.2" width="12" height="8" rx="1.6" fill="#EAF6FF"/>
  <path d="M-4 -.6 H5 M-4 1.6 H2" stroke="#1B4E68" stroke-width="1.15" stroke-linecap="round"/>
  <path d="M8 -12 c-1.4 2.2 -1.4 3.6 0 5.2 c1.4 -1.6 1.4 -3 0 -5.2 z" fill="#2E9BE6" stroke="#fff" stroke-width="1" paint-order="stroke"/>
  <path d="M-16 -12 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 z" fill="#F5B82E"/>
</g></g>`;
/** 0 extra slot if found with at most one wrong tap and no hint, or no wrong tap with the hint; +1 otherwise. */
export const miniScore = (wrong: number, hint: boolean) => (wrong + (hint ? 1 : 0) <= 1 ? 0 : 1) as 0 | 1;
