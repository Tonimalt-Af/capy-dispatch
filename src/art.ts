// Kawaii sticker art, all hand-written SVG (thick white outline + soft shadow), same style as Mahjong Capybaras.
// The capybara, cat, bear and capydindon bodies are reused from Mahjong Capybaras (same author); work gear is new.
import type { CapyId } from './content';
const P = { gold: '#F5B82E', red: '#EF4B5F', green: '#3FAE6A', teal: '#2FA4A9', ink: '#3B2416' };
/** Lyonnaise des Robinets (our company): exact brand hexes chosen by Maxime, our own drawn mark. */
export const LDR = { green: '#A2C617', blue: '#77B7FC', navy: '#030F40' };
/** Générale des Flots (rival, sanitation in Avignon). */
export const GDF = { red: '#FF0000', black: '#000000', white: '#FFFFFF' };
// --- drawing helpers. mode: 'c' colour, 'o' white outline, 's' shadow
type Mode = 'c' | 'o' | 's';
const OUT = 9;
function f(mode: Mode, fill: string, extra = '') {
  if (mode === 'c') return `fill="${fill}" ${extra}`;
  const col = mode === 'o' ? '#fff' : 'rgba(90,55,25,.28)';
  return `fill="${col}" stroke="${col}" stroke-width="${OUT}" stroke-linejoin="round"`;
}
const e = (m: Mode, cx: number, cy: number, rx: number, ry: number, fill: string, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${f(m, fill)} ${x}/>`;
const c = (m: Mode, cx: number, cy: number, r: number, fill: string) => e(m, cx, cy, r, r, fill);
const p = (m: Mode, d: string, fill: string) => `<path d="${d}" ${f(m, fill)}/>`;
// details only drawn in colour pass
const det = (m: Mode, s: string) => (m === 'c' ? s : '');

// Capybara palette (warm reddish-brown, research: coarse reddish-brown fur, darker snout and legs)
type Fur = { fur: string; furL: string; furH: string; furD: string; deep: string; muz: string; nose: string; ink: string; blush: string; ear: string };
let C: Fur;
const FUR_CARAMEL: Fur = { fur: '#B67A4A', furL: '#D19A66', furH: '#E7B98A', furD: '#94603A', deep: '#6E4024', muz: '#C48B5C', nose: '#4A2A18', ink: '#33200F', blush: '#F28C82', ear: '#E9957E' };
C = FUR_CARAMEL;
/** Fur tones offered for the player's capybara (and used to tell the team apart a little). */
export const FURS: Record<string, Fur> = {
  caramel: FUR_CARAMEL,
  noisette: { fur: '#8E5A36', furL: '#A9714A', furH: '#C99068', furD: '#734528', deep: '#52301A', muz: '#A06C45', nose: '#3A2012', ink: '#2A1A0D', blush: '#F28C82', ear: '#E08A74' },
  miel: { fur: '#D29A5E', furL: '#E6B67C', furH: '#F4D3A4', furD: '#B47C44', deep: '#8A5A2E', muz: '#DDA872', nose: '#4A2A18', ink: '#33200F', blush: '#F59A8E', ear: '#F0A08A' },
};
const withFur = <T,>(f: Fur, fn: () => T): T => { const keep = C; C = f; try { return fn(); } finally { C = keep; } };
const blushMarks = (x: number, y: number, rx = 5.5, ry = 3.4) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.blush}" opacity=".78"/><path d="M${x - 2.4} ${y - 1} l1.5 -1.4 M${x + .8} ${y - 1} l1.5 -1.4" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".85"/>`;

/** A · "Onsen zen": front-facing sitting capybara, brick head, sleepy half-closed eyes (the mascot). */
function capyFront(m: Mode) {
  return [
    p(m, 'M17 103 C15 86 27 74 50 74 C73 74 85 86 83 103 C82 113 70 117 50 117 C30 117 18 113 17 103Z', C.furD),
    det(m, `<path d="M24 104 C24 92 34 84 50 84 C66 84 76 92 76 104 C70 110 30 110 24 104Z" fill="${C.fur}" opacity=".55"/>
      <path d="M20 108 C30 116 70 116 80 108 C78 114 68 117 50 117 C32 117 22 114 20 108Z" fill="${C.deep}" opacity=".35"/>`),
    e(m, 33, 113, 8, 4.2, C.deep), e(m, 67, 113, 8, 4.2, C.deep),
    det(m, `<path d="M30 112.5v2.5M34 112.5v2.5M64 112.5v2.5M68 112.5v2.5" stroke="#4E2B16" stroke-width="1" stroke-linecap="round" opacity=".6"/>`),
    e(m, 31, 38, 5, 4.4, C.furD), e(m, 69, 38, 5, 4.4, C.furD),
    det(m, `<ellipse cx="31.4" cy="38.8" rx="2.4" ry="2" fill="${C.ear}"/><ellipse cx="68.6" cy="38.8" rx="2.4" ry="2" fill="${C.ear}"/>`),
    p(m, 'M26 50 C26 39 36 35 50 35 C64 35 74 39 74 50 L78 72 C80 87 68 95 50 95 C32 95 20 87 22 72 Z', C.fur),
    det(m, `
      <path d="M21.6 72 C21 86 32 94 50 94 C68 94 79 86 78.4 72 C75 84 66 89 50 89 C34 89 25 84 21.6 72Z" fill="${C.furD}" opacity=".6"/>
      <ellipse cx="50" cy="42" rx="17" ry="5.5" fill="${C.furH}" opacity=".55"/>
      <path d="M45 35.5 q2 -4 4 -.5 q2 -4.5 4 0" fill="none" stroke="${C.furD}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M26 58 l-3 1.5 M26 62 l-3.5 .6 M74 58 l3 1.5 M74 62 l3.5 .6" stroke="${C.furD}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
      <path d="M29 69 C29 60 38 57 50 57 C62 57 71 60 71 69 C71.5 82 62 89 50 89 C38 89 28.5 82 29 69Z" fill="${C.muz}"/>
      <path d="M31 75 C33 83 40 87 50 87 C60 87 67 83 69 75 C64 81 58 83 50 83 C42 83 36 81 31 75Z" fill="${C.furD}" opacity=".35"/>
      <path d="M38 61.5 C42 59.5 58 59.5 62 61.5" stroke="${C.furH}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M40 67.5 C42 62.5 58 62.5 60 67.5 C55 69.5 45 69.5 40 67.5Z" fill="${C.furD}" opacity=".45"/>
      <ellipse cx="46.4" cy="66" rx="1.3" ry="2.3" fill="${C.nose}" transform="rotate(35 46.4 66)"/><ellipse cx="53.6" cy="66" rx="1.3" ry="2.3" fill="${C.nose}" transform="rotate(-35 53.6 66)"/>
      <path d="M50 68.5 v5.7 M44.5 75 q2.8 3 5.5 -.6 q2.7 3.6 5.5 .6" stroke="${C.ink}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="36.8" cy="53.8" rx="4.1" ry="3.9" fill="${C.ink}"/>
      <ellipse cx="63.2" cy="53.8" rx="4.1" ry="3.9" fill="${C.ink}"/>
      <circle cx="38.3" cy="52.4" r="1.5" fill="#fff"/><circle cx="64.7" cy="52.4" r="1.5" fill="#fff"/><circle cx="35.2" cy="55.6" r=".7" fill="#fff" opacity=".85"/><circle cx="61.6" cy="55.6" r=".7" fill="#fff" opacity=".85"/>
      ${blushMarks(27, 70)}${blushMarks(73, 70)}`),
  ].join('');
}

/** B · "Profil": side-view capybara facing left — big brick head, tall flat blunt snout, eye and ear set high,
 *  loaf body on four short legs. Drawn in a 0-100 concept grid, fitted by the wrapper transform. */
function capyProfileRaw(m: Mode) {
  return [
    // far legs (darker, behind)
    p(m, 'M37 72 L37.4 84.5 C37.4 86.2 39 86.8 41.6 86.8 C44.2 86.8 45.6 86.2 45.6 84.5 L45.4 72Z', C.deep),
    p(m, 'M67 72 L67.4 84.5 C67.4 86.2 69 86.8 71.6 86.8 C74.2 86.8 75.6 86.2 75.6 84.5 L75.4 72Z', C.deep),
    // loaf body
    p(m, 'M33 57 C31 46 44 38.5 64 38.5 C81 38.5 90 49 89.5 62 C89 73 83 78.5 71 79 L45 79 C37 78.5 34 69 33 57Z', C.furD),
    det(m, `
      <path d="M62 41.6 C73 40.6 82 44 85.6 49" stroke="${C.furL}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>
      <path d="M86 52 C90 62 88 74 79 77.6 C70 80 54 79.6 44 79 C56 77 72 76.6 79 72 C85 68 87 60 86 52Z" fill="${C.deep}" opacity=".45"/>
      <path d="M36 60 C46 63.5 58 63 65 57.5 L65 63 C57 67 45 67 37 64Z" fill="${C.deep}" opacity=".35"/>
      <path d="M71 55 q3 -1.6 6 .2 M66 63 q3 -1.6 6 .2 M76 64 q3 -1.6 6 .2" stroke="${C.deep}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".5"/>`),
    // near legs
    p(m, 'M46.5 73 L47 85 C47 86.8 48.7 87.4 51.4 87.4 C54.1 87.4 55.6 86.8 55.6 85 L55.4 73Z', C.furD),
    p(m, 'M76.5 71 L77 85 C77 86.8 78.7 87.4 81.4 87.4 C84.1 87.4 85.6 86.8 85.6 85 L85.2 70Z', C.furD),
    det(m, `<path d="M47 83.4 C49.6 84.4 53 84.4 55.6 83.4 L55.6 85 C55.6 86.8 54.1 87.4 51.4 87.4 C48.7 87.4 47 86.8 47 85Z" fill="${C.deep}"/>
      <path d="M77 83.4 C79.6 84.4 83 84.4 85.6 83.4 L85.6 85 C85.6 86.8 84.1 87.4 81.4 87.4 C78.7 87.4 77 86.8 77 85Z" fill="${C.deep}"/>
      <path d="M38 83.2 C40 84 43.6 84 45.6 83.2" stroke="#4E2B16" stroke-width="1.6" fill="none" opacity=".6"/><path d="M68 83.2 C70 84 73.6 84 75.6 83.2" stroke="#4E2B16" stroke-width="1.6" fill="none" opacity=".6"/>`),
    // ear (back of the head, high)
    e(m, 56.6, 23.4, 3.9, 3.7, C.furD),
    det(m, `<ellipse cx="56.4" cy="23.8" rx="2.1" ry="1.9" fill="${C.ear}"/>`),
    // head: wide rounded brick, flat front
    p(m, 'M61 27 C54 21.6 36 21 23 24.4 C15.6 26.4 12 30.6 12 37 L12.2 50.5 C12.3 55.6 15.2 58.2 20.4 58.6 C34 59.8 51 60.4 59.6 56.4 C67.4 52.4 68.6 33.4 61 27Z', C.fur),
    det(m, `
      <path d="M13 52 C14 56 16.6 58 20.4 58.4 C34 59.6 51 60.2 59.6 56.2 C63.4 54.2 65.6 49.4 66.4 43.6 C63 51 55 54 44 54.6 C32 55.2 20 54.6 13 52Z" fill="${C.furD}" opacity=".55"/>
      <path d="M22 27.4 C33 24.2 47 23.8 56 26.2" stroke="${C.furH}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".75"/>
      <path d="M12.2 37 C12.4 31 16 28.6 21.2 29 C24.6 29.6 26 33 26 38 L26 50 C26 54.4 24 57.4 20.4 58.4 C15.2 58 12.3 55.6 12.2 50.5Z" fill="${C.furD}" opacity=".38"/>
      <path d="M13 34.6 C13.6 30.4 17.6 29 21.6 29.6 C25 30.4 25.6 34 24.6 36.8 C23.6 39.4 19.4 40.4 15.6 39.8 C13.6 39.4 12.8 37.6 13 34.6Z" fill="#86532F"/>
      <ellipse cx="15.4" cy="35.6" rx="1.2" ry="2.1" fill="${C.nose}" transform="rotate(25 15.4 35.6)"/><ellipse cx="20.6" cy="35" rx="1.7" ry="2.4" fill="${C.nose}" transform="rotate(-20 20.6 35)"/>
      <ellipse cx="17.4" cy="31.6" rx="2.6" ry=".9" fill="#fff" opacity=".22"/>
      <path d="M15.4 40.6 L15.4 47.6 Q15.8 52.6 21.2 52.8" stroke="${C.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="44" cy="34.6" rx="3.7" ry="3.6" fill="${C.ink}"/>
      <circle cx="45.4" cy="33.3" r="1.35" fill="#fff"/><circle cx="42.5" cy="36.3" r=".6" fill="#fff" opacity=".85"/>
      ${blushMarks(42.6, 43.4, 5, 3.1)}
      <path d="M53.4 39.6 l3.6 -.9 M54 44 l3.8 .2 M53.6 48.2 l3.6 1.2" stroke="${C.furD}" stroke-width="1.15" stroke-linecap="round" opacity=".8"/>`),
  ].join('');
}
const PROF_T = 'translate(-10 17) scale(1.15)';
const capyProfile = (m: Mode) => `<g transform="${PROF_T}">${capyProfileRaw(m)}</g>`;

// ---------- friends: black cat, bear, legendary capydindon — same layered sticker style as the mascot
const CAT = { fur: '#2E2A3A', light: '#4A4459', hi: '#5D5672', eye: '#F7D046' };
function catBody(m: Mode) {
  return [
    p(m, 'M68 106 C90 108 98 86 89 73 C86 69 80.6 70.6 82.4 75.6 C88 86 84 96 67 97Z', CAT.fur),
    p(m, 'M19 104 C17 88 29 77 50 77 C71 77 83 88 81 104 C80 113 69 117 50 117 C31 117 20 113 19 104Z', CAT.fur),
    det(m, `<path d="M28 104 C28 94 37 87 50 87 C63 87 72 94 72 104 C66 110 34 110 28 104Z" fill="${CAT.light}" opacity=".7"/>`),
    e(m, 35, 113, 7.5, 4, CAT.light), e(m, 65, 113, 7.5, 4, CAT.light),
    p(m, 'M23 60 L24.5 30 C25 28 27 27.6 28.6 29 L47 43Z', CAT.fur), p(m, 'M77 60 L75.5 30 C75 28 73 27.6 71.4 29 L53 43Z', CAT.fur),
    p(m, 'M21 66 C21 48 33 40 50 40 C67 40 79 48 79 66 C79 84 67 93 50 93 C33 93 21 84 21 66Z', CAT.fur),
    det(m, `<path d="M28.4 50 L28.8 36 L39.6 44Z" fill="#F49AB8"/><path d="M71.6 50 L71.2 36 L60.4 44Z" fill="#F49AB8"/>
      <path d="M21.6 72 C23 86 34 93 50 93 C66 93 77 86 78.4 72 C74 84 64 88 50 88 C36 88 26 84 21.6 72Z" fill="#1F1C28" opacity=".8"/>
      <ellipse cx="50" cy="46" rx="16" ry="4.6" fill="${CAT.hi}" opacity=".7"/>
      <ellipse cx="37" cy="62" rx="7.4" ry="8.4" fill="${CAT.eye}"/><ellipse cx="63" cy="62" rx="7.4" ry="8.4" fill="${CAT.eye}"/>
      <path d="M29.8 64 C31 69.6 34 70.6 37 70.6 C40 70.6 43 69.6 44.2 64 C42 67 32 67 29.8 64Z" fill="#E0A815"/><path d="M55.8 64 C57 69.6 60 70.6 63 70.6 C66 70.6 69 69.6 70.2 64 C68 67 58 67 55.8 64Z" fill="#E0A815"/>
      <ellipse cx="37" cy="63" rx="2.8" ry="6.4" fill="#15121C"/><ellipse cx="63" cy="63" rx="2.8" ry="6.4" fill="#15121C"/>
      <circle cx="39.4" cy="58.6" r="2" fill="#fff"/><circle cx="65.4" cy="58.6" r="2" fill="#fff"/><circle cx="35.4" cy="66.4" r=".9" fill="#fff" opacity=".8"/><circle cx="61.4" cy="66.4" r=".9" fill="#fff" opacity=".8"/>
      <path d="M47 73 C47 71.6 53 71.6 53 73 L50 76.4Z" fill="#F49AB8"/>
      <path d="M50 76.4 v2 M44.6 79 q2.7 2.8 5.4 -.6 q2.7 3.4 5.4 .6" fill="none" stroke="#F3E9FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 73 L16 71 M30 77 L17 79 M70 73 L84 71 M70 77 L83 79" stroke="#F3E9FF" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
      ${blushMarks(28.6, 71.6, 4.6, 2.8)}${blushMarks(71.4, 71.6, 4.6, 2.8)}`),
  ].join('');
}
const BEAR = { fur: '#8B5A3C', deep: '#6B4029', hi: '#A8754F', muzzle: '#F2D6B0' };
function bearBody(m: Mode) {
  return [
    p(m, 'M17 103 C15 86 27 75 50 75 C73 75 85 86 83 103 C82 113 70 117 50 117 C30 117 18 113 17 103Z', BEAR.deep),
    det(m, `<ellipse cx="50" cy="99" rx="17" ry="11" fill="${BEAR.hi}"/>`),
    e(m, 33, 113, 8, 4.2, '#4E2D1B'), e(m, 67, 113, 8, 4.2, '#4E2D1B'),
    c(m, 28, 43, 10, BEAR.fur), c(m, 72, 43, 10, BEAR.fur),
    p(m, 'M21 67 C21 48 33 39 50 39 C67 39 79 48 79 67 C79 84 67 93 50 93 C33 93 21 84 21 67Z', BEAR.fur),
    det(m, `<circle cx="28" cy="43" r="5" fill="${BEAR.muzzle}"/><circle cx="72" cy="43" r="5" fill="${BEAR.muzzle}"/>
      <path d="M21.6 72 C23 86 34 93 50 93 C66 93 77 86 78.4 72 C74 84 64 88 50 88 C36 88 26 84 21.6 72Z" fill="${BEAR.deep}" opacity=".6"/>
      <ellipse cx="50" cy="45.6" rx="16" ry="4.8" fill="${BEAR.hi}" opacity=".75"/>
      <ellipse cx="50" cy="75" rx="14" ry="11" fill="${BEAR.muzzle}"/><path d="M37 78 C39 84 44 86 50 86 C56 86 61 84 63 78 C59 82 41 82 37 78Z" fill="#D9B48A"/>
      <ellipse cx="50" cy="70" rx="6.2" ry="4.4" fill="#2A1A10"/><ellipse cx="48" cy="68.6" rx="2" ry="1.1" fill="#fff" opacity=".7"/>
      <path d="M50 74 V77.6 M44.6 78.6 q2.7 3 5.4 -.6 q2.7 3.6 5.4 .6" fill="none" stroke="#2A1A10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="37" cy="59" rx="4.2" ry="4.8" fill="${C.ink}"/><ellipse cx="63" cy="59" rx="4.2" ry="4.8" fill="${C.ink}"/>
      <circle cx="38.4" cy="57.4" r="1.5" fill="#fff"/><circle cx="64.4" cy="57.4" r="1.5" fill="#fff"/>
      ${blushMarks(28.6, 70)}${blushMarks(71.4, 70)}`),
  ].join('');
}
const FAN = ['#B5532A', '#F5B82E', '#E8692A', '#7A4E2E', '#EF4B5F', '#F5B82E', '#B5532A', '#E8692A', '#7A4E2E'];
function dindonBody(m: Mode) {
  let fan = '';
  for (let i = -4; i <= 4; i++) { const a = (i * 21 * Math.PI) / 180; const cx = 50 + Math.sin(a) * 33, cy = 76 - Math.cos(a) * 33;
    fan += e(m, cx, cy, 9, 21, FAN[i + 4], `transform="rotate(${i * 21} ${cx} ${cy})"`) + det(m, `<ellipse cx="${cx}" cy="${cy}" rx="4" ry="15" fill="#fff" opacity=".14" transform="rotate(${i * 21} ${cx} ${cy})"/><circle cx="${50 + Math.sin(a) * 45}" cy="${76 - Math.cos(a) * 45}" r="3" fill="#FFF3C4"/><circle cx="${50 + Math.sin(a) * 45}" cy="${76 - Math.cos(a) * 45}" r="1.5" fill="#2FA4A9"/>`); }
  return fan + capyFront(m) +
    p(m, 'M41 39 C39 29 45 27 47 33 C47 23 55 23 55 33 C57 27 63 29 61 39Z', '#E8344E') + // comb
    p(m, 'M55.6 74 C60.6 78 60.6 90 55.6 91 C51.6 90 51.6 82 53.6 76Z', '#E8344E') + // wattle
    det(m, `<path d="M44.4 69 L50 76.4 L55.6 69 Q50 66.6 44.4 69Z" fill="${P.gold}" stroke="#C9851A" stroke-width="1.2" stroke-linejoin="round"/>`);
}

// ---------- work gear (drawn in the same three passes: shadow, white outline, colour)
function helmet(m: Mode, col = '#FFFFFF', logo = true) {
  return p(m, 'M29 43 C28 24 72 24 71 43 Z', col) + e(m, 50, 43, 27, 4.6, col) +
    det(m, `<path d="M33 41 C33 30 41 26 50 26 C59 26 67 30 67 41" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="3"/><path d="M50 26 V41" stroke="#000" stroke-opacity=".1" stroke-width="3"/><ellipse cx="40" cy="31" rx="5" ry="2.6" fill="#fff" opacity=".7" transform="rotate(-25 40 31)"/>${logo ? `<path d="M50 30.5 C47.6 34 46.6 35.6 46.6 37 A3.4 3.4 0 0 0 53.4 37 C53.4 35.6 52.4 34 50 30.5Z" fill="${LDR.blue}"/><circle cx="50" cy="37.2" r="1.3" fill="${LDR.green}"/>` : ''}`);
}
function vest(m: Mode, col = '#E9F542') {
  return p(m, 'M19 103 C19 95 25 89 31 88.5 C37 94 43 96.5 50 96.5 C57 96.5 63 94 69 88.5 C75 89 81 95 81 103 C80 112.5 69 116.6 50 116.6 C31 116.6 20 112.5 19 103Z', col) +
    det(m, `<path d="M22.5 104 C31 108 69 108 77.5 104" stroke="#C9CED6" stroke-width="3.6" fill="none"/><path d="M22.5 104 C31 108 69 108 77.5 104" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/><path d="M50 97 V116" stroke="#000" stroke-opacity=".12" stroke-width="1.4"/>`) +
    e(m, 33, 113.4, 8, 4.2, C.deep) + e(m, 67, 113.4, 8, 4.2, C.deep);
}
const tie = (m: Mode) => p(m, 'M46 95 L54 95 L52 99 L55 110 L50 114 L45 110 L48 99 Z', '#3E5C9A');
const bow = (m: Mode) => p(m, 'M50 92 L39 86 C36 90 36 96 39 99 Z', '#E8344E') + p(m, 'M50 92 L61 86 C64 90 64 96 61 99 Z', '#E8344E') + c(m, 50, 92.5, 3.6, '#B71F35');
function glasses(m: Mode) { return det(m, `<circle cx="36.8" cy="54" r="7" fill="none" stroke="${P.ink}" stroke-width="2"/><circle cx="63.2" cy="54" r="7" fill="none" stroke="${P.ink}" stroke-width="2"/><path d="M43.8 53 H56.2" stroke="${P.ink}" stroke-width="2"/>`); }
const badge = (m: Mode, col: string, letter: string) => c(m, 64, 104, 6.4, col) + det(m, `<text x="64" y="107.6" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="9.5" fill="#fff">${letter}</text>`);

export type Who = CapyId | 'chef' | 'kevin' | 'chat' | 'ours' | 'capydindon' | 'capy' | 'player';
const CAPY_COL: Record<CapyId, string> = { josette: '#E86A92', momo: '#F39A2B', lulu: '#2FA4A9' };
/** Base-cap with a front visor (Momo, interventions at the customer's: no hard hat indoors). */
function cap(m: Mode, col: string) {
  return p(m, 'M29 45 C28 27 72 27 71 45 Z', col) + e(m, 50, 45.5, 23, 4.2, col) + p(m, 'M33 46 C40 52 60 52 67 46 C60 48.6 40 48.6 33 46Z', col) +
    det(m, `<path d="M33 46 C40 52 60 52 67 46 C60 48.6 40 48.6 33 46Z" fill="#000" opacity=".22"/><path d="M50 28.6 V44" stroke="#000" stroke-opacity=".12" stroke-width="2.4"/><ellipse cx="40" cy="33" rx="4.6" ry="2.2" fill="#fff" opacity=".35" transform="rotate(-25 40 33)"/><circle cx="50" cy="28.4" r="1.8" fill="#000" opacity=".2"/>
      <path d="M56.5 33.5 C55 35.8 54.2 37 54.2 38 A2.3 2.3 0 0 0 58.8 38 C58.8 37 58 35.8 56.5 33.5Z" fill="${LDR.blue}"/><circle cx="56.5" cy="38.2" r=".9" fill="${LDR.green}"/>`);
}
/** Polo in a brand colour, with collar and a reflective band (Momo and the player). */
function polo(m: Mode, col: string, band = true) {
  const dark = col === LDR.navy;
  return p(m, 'M19 103 C19 94 26 88.5 33 88 C38 92 44 94 50 94 C56 94 62 92 67 88 C74 88.5 81 94 81 103 C80 112.5 69 116.6 50 116.6 C31 116.6 20 112.5 19 103Z', col) +
    det(m, `<path d="M38 89.6 L50 99 L62 89.6 L57 89 L50 95.4 L43 89Z" fill="#fff" opacity="${dark ? '.95' : '.9'}"/><circle cx="50" cy="102.4" r="1.1" fill="${dark ? '#fff' : LDR.navy}" opacity=".7"/><circle cx="50" cy="106.2" r="1.1" fill="${dark ? '#fff' : LDR.navy}" opacity=".7"/>
      ${band ? `<path d="M21.6 109 C31 112.6 69 112.6 78.4 109" stroke="#C9CED6" stroke-width="3.2" fill="none"/><path d="M21.6 109 C31 112.6 69 112.6 78.4 109" stroke="#fff" stroke-width="1" fill="none" opacity=".85"/>` : ''}
      <path d="M33 98.6 C34.6 97 37.6 97 39 98.6 C37.6 101.6 34.4 101.6 33 98.6Z" fill="${dark ? LDR.green : LDR.navy}" opacity=".9"/>`) +
    e(m, 33, 113.4, 8, 4.2, C.deep) + e(m, 67, 113.4, 8, 4.2, C.deep);
}
function wrench(m: Mode) {
  return p(m, 'M78 84 L85 77 C83 74 84 70 87.6 68.6 L88.4 72.6 L91.6 73.4 L93.4 70.6 C95.6 73.6 94.6 78 91 79.4 L84 86.4Z', '#9AA9B8') +
    det(m, `<path d="M79.6 84.4 L86 78" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>`) + e(m, 79.4, 86.6, 5.4, 4.6, C.furD);
}
function mic(m: Mode, col: string) { return det(m, `<path d="M25.6 64 C27.6 74 35 79 43 79" stroke="${P.ink}" stroke-width="1.9" fill="none" stroke-linecap="round"/><circle cx="44" cy="79" r="2.6" fill="${col}" stroke="#fff" stroke-width="1"/>`); }
// Player accessories (appearance options on the character screen)
export type Acc = 'aucun' | 'lunettes' | 'noeud' | 'meche' | 'lavande';
function accessory(m: Mode, a: Acc) {
  switch (a) {
    case 'lunettes': return glasses(m);
    case 'noeud': return p(m, 'M33 37 L23 31 C20.6 35 21 40 24 42.6 Z', '#FF77B0') + p(m, 'M33 37 L41 29.4 C44.4 32 45 37 42.6 40.6 Z', '#FF77B0') + c(m, 33, 37, 3.4, '#E84D8A');
    case 'meche': return p(m, 'M44 37 C42 29 47 25 51 27 C50 30 52 31 55 29 C56.6 32 55 36 51 37 Z', C.furH) + det(m, `<path d="M47 34 C47 31 49 29.4 51 29.6" stroke="${C.furD}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`);
    case 'lavande': return det(m, `<path d="M70 50 C72 42 74 36 78 31" stroke="#5E8C4A" stroke-width="2" fill="none" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${77 - i * 1.6}" cy="${31 + i * 3.4}" rx="2.4" ry="1.8" fill="#9B7FD1" stroke="#fff" stroke-width=".8"/>`).join('')}`);
    default: return '';
  }
}
export interface Look { fur: string; acc: Acc; outfit: string }
export const OUTFITS: Record<string, string> = { marine: LDR.navy, vert: LDR.green, bleu: LDR.blue };
export const DEFAULT_LOOK: Look = { fur: 'caramel', acc: 'aucun', outfit: 'marine' };
let LOOK: Look = DEFAULT_LOOK;
/** The player's dispatcher capy: polo in a brand colour, headset with microphone, one accessory. */
export function setPlayerLook(l: Look) { LOOK = l; }
function playerLayer(m: Mode, l: Look) {
  const meche = l.acc === 'meche' ? accessory(m, 'meche') : '';
  return capyFront(m) + polo(m, OUTFITS[l.outfit] ?? LDR.navy, false) + headsetOn(m, LDR.navy) + meche + mic(m, LDR.green) + (l.acc !== 'meche' ? accessory(m, l.acc) : '');
}
function layer(who: Who, m: Mode) {
  switch (who) {
    case 'josette': return capyFront(m) + vest(m) + badge(m, CAPY_COL.josette, 'J') + headsetOn(m, '#E86A92', true) + helmet(m);
    case 'momo': return withFur(FURS.noisette, () => capyFront(m) + polo(m, LDR.navy) + badge(m, CAPY_COL.momo, 'M') + cap(m, LDR.blue));
    case 'lulu': return withFur(FURS.miel, () => capyFront(m) + vest(m, '#FF9A2E') + badge(m, CAPY_COL.lulu, 'L') + helmet(m, '#FFD23F') + wrench(m));
    case 'player': return withFur(FURS[LOOK.fur] ?? FUR_CARAMEL, () => playerLayer(m, LOOK));
    case 'chef': return capyFront(m) + p(m, 'M19 103 C19 94 26 88.5 33 88 C38 92 44 94 50 94 C56 94 62 92 67 88 C74 88.5 81 94 81 103 C80 112.5 69 116.6 50 116.6 C31 116.6 20 112.5 19 103Z', '#F4F1EA') + tie(m) + glasses(m) + e(m, 33, 113.4, 8, 4.2, C.deep) + e(m, 67, 113.4, 8, 4.2, C.deep);
    case 'kevin': return capyFront(m) + headsetOn(m, '#5B8DEF') + mic(m, '#5B8DEF');
    case 'chat': return catBody(m) + bow(m);
    case 'ours': return bearBody(m) + helmet(m, GDF.red, false) + det(m, `<rect x="40" y="33" width="20" height="5" rx="2.5" fill="#fff"/>`);
    case 'capydindon': return dindonBody(m);
    default: return capyFront(m);
  }
}
/** Headset: the band hugs the top of the head and passes behind the ears (ears and tuft are redrawn over it);
 *  under a hard hat only the ends of the band and the ear cups show (helmet-mounted, drawn before the helmet). */
const BAND = 'M24.4 58 C22.4 45 26.4 34.6 50 32.4 C73.6 34.6 77.6 45 75.6 58';
function headsetOn(m: Mode, col = '#E86A92', hat = false) {
  const w = 3.6;
  const band = m === 'c'
    ? `<path d="${BAND}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${BAND}" stroke="#fff" stroke-opacity=".35" stroke-width="1" fill="none" stroke-linecap="round" stroke-dasharray="0 9 30 200"/>`
    : `<path d="${BAND}" stroke="${m === 'o' ? '#fff' : 'rgba(90,55,25,.28)'}" stroke-width="${w + OUT}" fill="none" stroke-linecap="round"/>`;
  const ears = hat ? '' : det(m, `${e(m, 31, 38, 5, 4.4, C.furD)}${e(m, 69, 38, 5, 4.4, C.furD)}<ellipse cx="31.4" cy="38.8" rx="2.4" ry="2" fill="${C.ear}"/><ellipse cx="68.6" cy="38.8" rx="2.4" ry="2" fill="${C.ear}"/><path d="M45 35.5 q2 -4 4 -.5 q2 -4.5 4 0" fill="none" stroke="${C.furD}" stroke-width="1.6" stroke-linecap="round"/>`);
  const cups = e(m, 24.6, 58.5, 4.8, 6.2, col) + e(m, 75.4, 58.5, 4.8, 6.2, col) +
    det(m, `<ellipse cx="25.6" cy="58.5" rx="2.2" ry="3.8" fill="#000" opacity=".16"/><ellipse cx="74.4" cy="58.5" rx="2.2" ry="3.8" fill="#000" opacity=".16"/><ellipse cx="23.2" cy="56" rx="1.2" ry="2" fill="#fff" opacity=".55"/><ellipse cx="74" cy="56" rx="1.2" ry="2" fill="#fff" opacity=".55"/>`);
  return band + ears + cups;
}
/** Player capy for a given look (character screen preview), without touching the saved look. */
export function playerSvg(l: Look, cls = '') { const keep = LOOK; LOOK = l; try { return who('player', cls); } finally { LOOK = keep; } }
/** Standalone character sticker (viewBox fits a 100x120 drawing). */
export function who(w: Who, cls = '') {
  const inner = `<g transform="translate(2.2 3.2)">${layer(w, 's')}</g>${layer(w, 'o')}${layer(w, 'c')}`;
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="-6 ${w === 'capydindon' ? -4 : 14} 112 ${w === 'capydindon' ? 126 : 106}" aria-hidden="true">${inner}</svg>`;
}

// ---------- small sticker icons (viewBox 0 0 32 32): white outline via paint-order
const I = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g stroke="#fff" stroke-width="4.5" stroke-linejoin="round" paint-order="stroke">${body}</g></svg>`;
const drop = (x: number, y: number, s: number, col: string) => `<path d="M${x} ${y - 9 * s} C${x - 3 * s} ${y - 4.5 * s} ${x - 6.5 * s} ${y - 1 * s} ${x - 6.5 * s} ${y + 2.5 * s} A${6.5 * s} ${6.5 * s} 0 0 0 ${x + 6.5 * s} ${y + 2.5 * s} C${x + 6.5 * s} ${y - 1 * s} ${x + 3 * s} ${y - 4.5 * s} ${x} ${y - 9 * s}Z" fill="${col}"/>`;
export const ICONS: Record<string, string> = {
  drop: I(drop(16, 17, 1.25, '#2E9BE6') + '<ellipse cx="12.5" cy="17" rx="2" ry="3.2" fill="#fff" stroke="none" opacity=".7"/>'),
  meterdrop: I('<rect x="5" y="8" width="18" height="16" rx="6" fill="#8FA2B5"/><circle cx="14" cy="16" r="5" fill="#F4F7FA" stroke="none"/><path d="M14 16 l3 -2.5" stroke="#3B2416" stroke-width="1.6" stroke-linecap="round"/>' + drop(25, 22, 0.6, '#2E9BE6')),
  meter: I('<rect x="6" y="7" width="20" height="18" rx="7" fill="#5C7A99"/><circle cx="16" cy="16" r="6" fill="#F4F7FA" stroke="none"/><path d="M12.5 15h7M12.5 17.6h4.5" stroke="#3B2416" stroke-width="1.5" stroke-linecap="round"/>'),
  search: I('<circle cx="13.5" cy="13.5" r="7.5" fill="#BFE4F5"/><path d="M19 19 L26 26" stroke="#7A4E2E" stroke-width="5" stroke-linecap="round"/><path d="M19 19 L26 26" stroke="#7A4E2E" stroke-width="4" stroke-linecap="round" stroke-opacity="1"/><circle cx="11.5" cy="11.5" r="2.2" fill="#fff" stroke="none"/>'),
  ghost: I('<path d="M7 27 V14 C7 8 11 5 16 5 C21 5 25 8 25 14 V27 L21.5 24.5 L18.5 27 L16 24.5 L13.5 27 L10.5 24.5Z" fill="#EDE7FF"/><circle cx="12.5" cy="14" r="1.8" fill="#3B2416" stroke="none"/><circle cx="19.5" cy="14" r="1.8" fill="#3B2416" stroke="none"/><path d="M14 18.5 q2 1.6 4 0" stroke="#3B2416" stroke-width="1.4" fill="none"/>'),
  valve: I('<rect x="4" y="18" width="24" height="7" rx="3" fill="#5C7A99"/><rect x="13" y="11" width="6" height="9" fill="#7D93A8"/><path d="M8 9 H24" stroke="#E8344E" stroke-width="4.5" stroke-linecap="round"/><path d="M8 9 H24" stroke="#E8344E" stroke-width="4" stroke-linecap="round"/>'),
  ear: I('<path d="M11 21 C8 18 8 11 13 8 C18 5 25 8 24.5 14.5 C24 19 20 19.5 19 22.5 C18 26 14.5 27 12.5 25" fill="#F6C9A8"/><path d="M15 14 C15 11 20 11 20 14.5 C20 16.5 17.5 17 17.5 19" stroke="#B8765A" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M4 27 q3 -3 6 0 q3 3 6 0" stroke="#2E9BE6" stroke-width="2" fill="none"/>'),
  tap: I('<path d="M6 11 H18 C22 11 24 13 24 17 V19 H19 V17 C19 16 18.5 15.5 17.5 15.5 H6Z" fill="#9AA9B8"/><rect x="9" y="6" width="5" height="5" rx="1.5" fill="#E8344E"/>' + drop(21.5, 25, 0.5, '#C98B3E')),
  hydrant: I('<rect x="10" y="9" width="12" height="18" rx="3" fill="#E8344E"/><path d="M10 9 C10 4 22 4 22 9Z" fill="#E8344E"/><rect x="6" y="14" width="20" height="5" rx="2.5" fill="#C71F35"/>' + drop(27, 9, 0.45, '#2E9BE6')),
  dog: I('<ellipse cx="16" cy="18" rx="9" ry="8" fill="#C98B5B"/><ellipse cx="8.5" cy="14" rx="3.2" ry="6" fill="#8A5530" transform="rotate(20 8.5 14)"/><ellipse cx="23.5" cy="14" rx="3.2" ry="6" fill="#8A5530" transform="rotate(-20 23.5 14)"/><circle cx="12.6" cy="17" r="1.5" fill="#3B2416" stroke="none"/><circle cx="19.4" cy="17" r="1.5" fill="#3B2416" stroke="none"/><ellipse cx="16" cy="21" rx="2.4" ry="1.7" fill="#3B2416" stroke="none"/>'),
  cave: I('<path d="M5 27 V15 L16 7 L27 15 V27Z" fill="#B9A58A"/><rect x="11" y="17" width="10" height="10" rx="2" fill="#5C4632"/><path d="M14 20 h4 M14 23 h4" stroke="#8C7258" stroke-width="1.4"/>'),
  lane: I('<rect x="4" y="5" width="7" height="22" rx="2" fill="#E3C79B"/><rect x="21" y="5" width="7" height="22" rx="2" fill="#E3C79B"/><path d="M16 8 V24" stroke="#fff" stroke-width="2.2" stroke-dasharray="2.5 2.5"/><path d="M13 11 L16 7.5 L19 11 M13 21 L16 24.5 L19 21" stroke="#E8692A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  clock: I('<circle cx="16" cy="16" r="10.5" fill="#FFF3D6"/><path d="M16 9.5 V16 L20.5 18.5" stroke="#3B2416" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  cup: I('<path d="M6 12 H22 V19 C22 24 18.5 26 14 26 C9.5 26 6 24 6 19Z" fill="#F2F2F2"/><path d="M22 14 C27 14 27 21 22 21" stroke="#F2F2F2" stroke-width="3" fill="none"/><path d="M11 9 C10 7 12 6 11 4 M16 9 C15 7 17 6 16 4" stroke="#B8A99A" stroke-width="1.4" fill="none"/><ellipse cx="14" cy="13.4" rx="6" ry="1.2" fill="#7A4E2E" stroke="none"/>'),
  sun: I('<circle cx="16" cy="16" r="7.5" fill="#FFC93B"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M16 4 V7" transform="rotate(${a} 16 16)" stroke="#FFB000" stroke-width="2.6" stroke-linecap="round"/>`).join('')),
  wind: I('<path d="M4 12 H19 C23 12 23 6 19.5 6.5 M4 18 H24 C28 18 28 24 24.5 23.5 M4 24 H13" stroke="#7CC6E8" stroke-width="3.4" fill="none" stroke-linecap="round"/>'),
  basket: I('<path d="M5 14 H27 L24 26 H8Z" fill="#D9A35B"/><path d="M10 14 C10 7 22 7 22 14" stroke="#B5803A" stroke-width="2.4" fill="none"/><circle cx="12" cy="12.5" r="3" fill="#EF4B5F" stroke="none"/><circle cx="17.5" cy="11.5" r="3" fill="#3FAE6A" stroke="none"/><circle cx="22" cy="12.8" r="2.6" fill="#F5B82E" stroke="none"/>'),
  storm: I('<path d="M8 19 C3.5 19 3.5 12 8.5 12 C9.5 6 18.5 5 20.5 10.5 C25.5 9.5 28 14 25.5 17.5 C24.8 18.6 23.6 19 22.3 19Z" fill="#B5C3D1"/><path d="M15.5 17 L12 23.5 H16 L13.5 29 L20.5 21 H16.5 L19 17Z" fill="#FFC93B"/>'),
  rain: I('<path d="M8 17 C3.5 17 3.5 10 8.5 10 C9.5 4 18.5 3 20.5 8.5 C25.5 7.5 28 12 25.5 15.5 C24.8 16.6 23.6 17 22.3 17Z" fill="#D5E2EC"/>' + drop(10, 26, 0.35, '#2E9BE6') + drop(17, 28, 0.35, '#2E9BE6') + drop(23, 25.5, 0.35, '#2E9BE6')),
  phone: I('<path d="M8 5 C6 5 5 7 5.5 9.5 C7 17 15 25 22.5 26.5 C25 27 27 26 27 24 V20.5 L21.5 18.5 L19 21 C15.5 19.5 12.5 16.5 11 13 L13.5 10.5 L11.5 5Z" fill="#3FAE6A"/>'),
  phoneX: I('<path d="M8 5 C6 5 5 7 5.5 9.5 C7 17 15 25 22.5 26.5 C25 27 27 26 27 24 V20.5 L21.5 18.5 L19 21 C15.5 19.5 12.5 16.5 11 13 L13.5 10.5 L11.5 5Z" fill="#E8344E"/>'),
  mail: I('<rect x="4.5" y="8" width="23" height="16" rx="3" fill="#FFF3D6"/><path d="M5.5 9.5 L16 17.5 L26.5 9.5" stroke="#C98B3E" stroke-width="1.8" fill="none" stroke-linejoin="round"/>'),
  van: I('<path d="M3 21 V12 C3 9.5 4.5 8 7 8 H19 L25 13 C27.5 13.5 29 15 29 17.5 V21 C29 22.5 28 23 27 23 H5 C4 23 3 22.5 3 21Z" fill="#FFFFFF"/><path d="M19 9 L24.5 13.5 H19Z" fill="#9FD3F2" stroke="none"/>' + drop(11.5, 15.5, 0.36, LDR.blue) + '<circle cx="9" cy="23" r="3" fill="#3B2416"/><circle cx="23" cy="23" r="3" fill="#3B2416"/>'),
  star: I('<path d="M16 3.5 L19.6 11 L27.8 12 L21.8 17.6 L23.4 25.8 L16 21.8 L8.6 25.8 L10.2 17.6 L4.2 12 L12.4 11Z" fill="#F5B82E"/>'),
  starOff: I('<path d="M16 3.5 L19.6 11 L27.8 12 L21.8 17.6 L23.4 25.8 L16 21.8 L8.6 25.8 L10.2 17.6 L4.2 12 L12.4 11Z" fill="#E3D8C6"/>'),
  warn: I('<path d="M16 4 L29 27 H3Z" fill="#FFB020"/><path d="M16 12 V19" stroke="#3B2416" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="23" r="1.7" fill="#3B2416" stroke="none"/>'),
  heart: I('<path d="M16 27 C5 20 3 13 6.5 8.5 C9.5 5 14 6 16 9.5 C18 6 22.5 5 25.5 8.5 C29 13 27 20 16 27Z" fill="#FF77B0"/>'),
  sticker: I('<circle cx="16" cy="16" r="11" fill="#F5B82E"/><path d="M10 19.5 L9 12 L13 15 L16 9.5 L19 15 L23 12 L22 19.5Z" fill="#fff" stroke="none"/>'),
};
export const icon = (k: string, cls = 'ic') => `<span class="${cls}">${ICONS[k] ?? ''}</span>`;

/** Lyonnaise des Robinets mark: a round tap dripping one drop, three round ripples (our own drawing, never the real logo). */
export function logoLDR(size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><g stroke="#fff" stroke-width="5" paint-order="stroke" stroke-linejoin="round">
  <path d="M10 20 C10 15 14 13 18 13 H36 C44 13 49 18 49 26 V29 H40 V26 C40 23.5 38.5 22 36 22 H18 C14 22 10 21 10 20Z" fill="${LDR.navy}"/>
  <rect x="22" y="6" width="9" height="8" rx="3" fill="${LDR.green}"/><rect x="16" y="3.5" width="21" height="5" rx="2.5" fill="${LDR.green}"/>
  <path d="M44.5 33 C42 37 40 40 40 42.5 A4.5 4.5 0 0 0 49 42.5 C49 40 47 37 44.5 33Z" fill="${LDR.blue}"/></g>
  <g fill="none" stroke-linecap="round"><path d="M30 54 C36 57.5 53 57.5 59 54" stroke="${LDR.blue}" stroke-width="3"/><path d="M34 50 C38 52.4 51 52.4 55 50" stroke="${LDR.blue}" stroke-width="3" opacity=".75"/><path d="M38.5 46.5 C41 47.8 48 47.8 50.5 46.5" stroke="${LDR.green}" stroke-width="3"/></g></svg>`;
}

/** Utility van in Lyonnaise des Robinets livery (silhouettes inspired by the large and small vans of real water
 *  fleets; no maker badge, our own logo). Side view facing right. `kind`: 'fourgon' (high roof) or 'ludospace'. */
export function vanSvg(kind: 'fourgon' | 'ludospace' = 'fourgon', cls = '') {
  const big = kind === 'fourgon';
  const body = big
    ? 'M14 30 C14 22 19 18 27 18 H140 C148 18 152 21 156 27 L176 54 C184 56 190 61 190 70 V84 C190 89 187 92 182 92 H18 C15 92 12 89 12 86 Z'
    : 'M20 44 C20 36 25 32 33 32 H120 C128 32 133 35 138 41 L156 58 C166 60 172 64 172 72 V84 C172 89 169 92 164 92 H24 C21 92 18 89 18 86 Z';
  const win = big ? 'M147 30 L168 56 H147 Z' : 'M126 42 L148 60 H126 Z';
  const wx = big ? [50, 158] : [50, 142];
  const logo = `<g transform="translate(${big ? 38 : 30} ${big ? 24 : 39}) scale(${big ? .62 : .5})">${logoLDR(64).replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g>`;
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" aria-hidden="true">
    <ellipse cx="100" cy="100" rx="86" ry="6" fill="rgba(90,55,25,.22)"/>
    <path d="${body}" fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>
    ${big ? '<rect x="58" y="9" width="22" height="9" rx="4" fill="#fff" stroke="#fff" stroke-width="8"/><rect x="60" y="10" width="18" height="8" rx="3.5" fill="#FF9A2E"/><rect x="63" y="11.5" width="6" height="3" rx="1.5" fill="#FFE0A8"/>' : '<rect x="46" y="24" width="18" height="8" rx="3.5" fill="#fff" stroke="#fff" stroke-width="8"/><rect x="48" y="25" width="14" height="7" rx="3" fill="#FF9A2E"/>'}
    <path d="${body}" fill="#FDFDFB" stroke="#E2DED6" stroke-width="2"/>
    <path d="M13 ${big ? 70 : 74} C60 ${big ? 60 : 66} 120 ${big ? 82 : 82} 189 ${big ? 64 : 68} V84 C189 89 186 91.5 182 91.5 H18 C15 91.5 13 89 13 86Z" fill="${LDR.green}"/>
    <path d="M13 ${big ? 66 : 70} C60 ${big ? 56 : 62} 120 ${big ? 78 : 78} 189 ${big ? 60 : 64}" stroke="${LDR.blue}" stroke-width="4" fill="none"/>
    <path d="${win}" fill="#BFE4F5" stroke="#9FCBE3" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${big ? 141 : 120} ${big ? 26 : 38} V88" stroke="#E2DED6" stroke-width="2"/>
    
    ${logo}
    <text font-family="Fredoka, sans-serif" font-weight="700" font-size="${big ? 10.5 : 8.4}" fill="${LDR.navy}"><tspan x="${big ? 82 : 66}" y="${big ? 42 : 53}">Lyonnaise</tspan><tspan x="${big ? 82 : 66}" y="${big ? 54 : 63}">des Robinets</tspan></text>
    <rect x="${big ? 180 : 162}" y="${big ? 66 : 70}" width="9" height="7" rx="3" fill="#FFE59A" stroke="#E2DED6" stroke-width="1.5"/>
    <rect x="11" y="84" width="${big ? 180 : 162}" height="8" rx="4" fill="${LDR.navy}"/>
    ${wx.map((x) => `<circle cx="${x}" cy="90" r="15" fill="#fff"/><circle cx="${x}" cy="90" r="12" fill="#2B2D33"/><circle cx="${x}" cy="90" r="5.5" fill="#C9CED6"/><circle cx="${x}" cy="90" r="2" fill="#7D8592"/>`).join('')}
  </svg>`;
}

/** Plain UI glyphs (not stickers): rounded strokes in currentColor, for buttons. */
const GLYPH: Record<string, string> = {
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  left: '<path d="M14.5 5.5 8 12l6.5 6.5"/>', right: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>', close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  pause: '<path d="M9 6v12M15 6v12"/>', play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>', skip: '<path d="M5.5 6v12l8-6zM18 6v12" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', cross: '<path d="M7 7l10 10M17 7 7 17"/>', info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.7 1.7M16.3 16.3 18 18M6 18l1.7-1.7M16.3 7.7 18 6"/>',
  home: '<path d="M4.5 11 12 4.5 19.5 11M6.5 9.5V19h11V9.5"/>', edit: '<path d="M5 19l1-4L16 5l3 3L9 18z"/>', back: '<path d="M10 6 4 12l6 6M4.5 12H20"/>',
  bolt: '<path d="M13 3 6 13.5h5L10 21l7-10.5h-5z" fill="currentColor"/>',
};
export const glyph = (k: string, cls = 'gl') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[k] ?? ''}</svg>`;

/** Small landmark stickers for the map (Palais des Papes, pont Saint-Bénézet), centred on 0,0, ~60 units wide. */
export const PALAIS_STICKER = `<g stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke">
  <path d="M-30 18 V-6 H-22 V-12 H-16 V-6 H-6 V-14 L0 -26 L6 -14 V-6 H16 V-12 H22 V-6 H30 V18 Z" fill="#F2D49B"/>
  <path d="M-30 -6 h4 v-4 h4 v4 M22 -6 h4 v-4 h4 v4" fill="none" stroke="#D9B06A" stroke-width="2.2" paint-order="normal"/>
  <path d="M-4 18 V8 A4 4 0 0 1 4 8 V18 Z" fill="#8A5A34" stroke-width="2.5"/>
  <path d="M-21 2 v6 M-14 2 v6 M14 2 v6 M21 2 v6" stroke="#B98A52" stroke-width="2.6" stroke-linecap="round" paint-order="normal"/>
  <circle cx="0" cy="-8" r="2.6" fill="#B98A52" stroke-width="2"/>
  <path d="M-3 -29 L0 -34 L3 -29" fill="#F5B82E" stroke-width="2.5"/></g>`;
export const PONT_STICKER = `<g stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke">
  <path d="M-34 8 V-2 H34 V8 H26 A10 10 0 0 0 6 8 H2 A10 10 0 0 0 -18 8 H-22 A6 6 0 0 0 -34 8Z" fill="#EAD3A6"/>
  <path d="M-6 -2 V-12 H4 V-2" fill="#EAD3A6"/><path d="M-6 -12 L-1 -17 L4 -12" fill="#D9774E" stroke-width="3"/>
  <path d="M-34 -2 H34" stroke="#C9A66E" stroke-width="2" paint-order="normal"/></g>`;
