import '@fontsource/fredoka/latin-400.css'; import '@fontsource/fredoka/latin-600.css'; import '@fontsource/fredoka/latin-700.css';
import './style.css';
import { JOBS, TEAM, CAPY, RISKS, DAY_CARDS, DAYS_SPEC, WEEKDAYS, SKILL_SHORT, slotsFor, objText, VIPS, GLOSSARY, CAPY_LINE, QUOTES, type CapyId, type Skill, type JobId } from './content';
import { SITES, QUARTERS, DEPOT, quarterOf, qTravel } from './map';
import { SLOTS, LUNCH_AFTER, DAYS, SAFETY_RULE, YIELD_TARGET, START_YIELD, URGENT_TARGET, slotLabel, slotShort, slotEnd, LUNCH_LABEL, DAY_END } from './rules';
import * as G from './game';
import type { Game, Ticket } from './game';
import { load, save as persist, defaults, KEY, type Save } from './storage';
import { carnet } from './carnet';
import { MapView, type Pin, type Route } from './mapview';
import { who, icon, ICONS, logoLDR, glyph, vanSvg, playerSvg, outfitThumb, headThumb, HEADS, setPlayerLook, FURS, OUTFITS, DEFAULT_LOOK, type Who, type Look } from './art';
import { cleanName, validName, setSex, agree, gx, NAME_MAX, ACCS, ACC_LABEL, FUR_LABEL, OUTFIT_LABEL, OUTFIT_SHORT, HEAD_LABEL, type Sex } from './player';
import { facade, wrongText, foundText, miniScore, meterSvg } from './facade';
import { Sound } from './audio';
import { haptic, installPress, setHaptics } from './feel';
import * as H from './hindsight';

// ---------------------------------------------------------------- boot guard
let booted = false;
addEventListener('error', () => rescue()); addEventListener('unhandledrejection', () => rescue());
function rescue() {
  if (booted || document.querySelector('.rescue')) return;
  const box = document.createElement('div'); box.className = 'rescue';
  const h = document.createElement('h2'); h.textContent = 'Oups, le jeu n’a pas pu démarrer';
  const again = document.createElement('button'); again.className = 'btn primary'; again.textContent = 'Recharger'; again.onclick = () => location.reload();
  const wipe = document.createElement('button'); wipe.className = 'btn'; wipe.textContent = 'Repartir de zéro'; wipe.onclick = () => { try { localStorage.removeItem(KEY); } catch { /* */ } location.reload(); };
  box.append(h, again, wipe); document.body.append(box);
}
// No install prompt, ever (Maxime's call): the browser's own mini-infobar is suppressed too.
addEventListener('beforeinstallprompt', (e) => e.preventDefault());

// ---------------------------------------------------------------- state
const S: Save = load();
let g: Game | null = S.game;
const snd = new Sound(); snd.sfxOn = S.settings.sfx; snd.musicOn = S.settings.music;
setHaptics(S.settings.haptics !== false); installPress();
snd.onCue = (n) => { if (n === 'place' || n === 'select' || n === 'drip') haptic('tap'); else if (n === 'invalid' || n === 'alert') haptic('bad'); else if (n === 'star' || n === 'win' || n === 'match') haptic('ok'); };
const calm = () => document.documentElement.classList.toggle('calm', !!S.settings.calm); calm();
const expert = () => !!S.settings.expert;
let sel: string | null = null; let running = false; let timer = 0; let skipping = false; /** « Prochaine décision » is the default way to play (5-minute sessions), except on the first day; x1/x2 switch to watching */ let autoSkip = true; let speed: 1 | 2 = S.settings.speed;
const save = () => { S.game = g; persist(S); };
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const SK_COL: Record<Skill, string> = { icc: '#F39A2B', reseau: '#2FA4A9', fuite: '#E86A92' };
const pct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + '\u202F%';
const today = () => g!.today!;
const dayName = (d: number) => `${WEEKDAYS[d % 5]} · Jour ${d + 1}/${DAYS}`;
const addr = (t: Ticket) => { const q = quarterOf(t.site); return `${t.num} ${SITES[t.site].street}${q ? ` (${QUARTERS[q].t})` : ''}`; };
/** Extra-muros tickets: the quartier, with the road time from the walls. */
const qChip = (t: Ticket) => { const q = quarterOf(t.site); if (!q) return ''; const h = qTravel(0, q); return `<span class="chip qx" title="Hors les murs : ${h} h de route depuis l’intra-muros, 0 h entre deux adresses du quartier">${icon('van', 'ic xs')}${esc(QUARTERS[q].t)} · ${h} h</span>`; };
// ---- player: name (always rendered with textContent), grammatical agreement, avatar
if (S.player) { setSex(S.player.sex); setPlayerLook(S.player.look); }
const NM = '<span class="pname"></span>';
/** Game copy addressed to the player: agreed with their sex, '{nom}' becomes a slot filled by fillNames(). */
// French typography: no line break inside « … » or before ? ! : ; (narrow no-break space).
const nb = (s: string) => s.replace(/« /g, '«\u00A0').replace(/ »/g, '\u00A0»').replace(/ ([?!:;])/g, '\u202F$1');
const say = (s: string) => esc(nb(agree(s))).replaceAll('{nom}', NM);
function fillNames(root: ParentNode = document) { const n = S.player?.name ?? ''; root.querySelectorAll('.pname').forEach((e) => { e.textContent = n; }); }
const me = (cls = '') => (S.player ? who('player', cls) : who('capy', cls));
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Very short block labels for the timeline (the full name is on the ticket card and in the details). */
const TAG: Record<JobId, string> = { fuite_bt: 'Fuite', fuite_pc: 'Fuite cpt', prc: 'PRC', introuvable: 'Perdu', resilie: 'Résilié', coupure: 'Coupure', debit_nuit: 'Débit nuit', purge: 'Purge', fontaine: 'Borne', poteau: 'Poteau' };
/** RDV = the window in which the capy must arrive: « 8h–9h » (same text on the ticket, the band and the sheet). */
const rdvText = (r: [number, number]) => (r[0] === r[1] ? `à ${slotShort(r[0])}` : `${slotShort(r[0])}–${slotShort(r[1])}`);
const THE: Record<string, string> = { fuite_bt: 'la fuite', fuite_pc: 'la fuite au compteur', prc: 'le compteur', introuvable: 'le compteur introuvable', resilie: 'le résilié', coupure: 'la coupure', debit_nuit: 'le débit de nuit', purge: 'la purge', fontaine: 'la borne-fontaine', poteau: 'le poteau incendie' };
const chipFx = (ic: string, v: string, cls = '') => `<em class="fx ${cls}">${icon(ic, 'ic xs')}${v}</em>`;
/** Card effects as icons: « +1 créneau · satisfaction +4 » → [horloge +1 h] [cœur +4]. */
/** Expert mode: every field of a choice's effect, in plain numbers. */
function exactFx(fx: import('./content').Effect) { const p: string[] = [];
  if (fx.slots) p.push(`${fx.slots > 0 ? '+' : ''}${fx.slots} créneau${Math.abs(fx.slots) > 1 ? 'x' : ''} sur ce chantier`);
  if (fx.sat) p.push(`abonnés ${fx.sat > 0 ? '+' : '−'}${Math.abs(fx.sat)} pt`);
  if (fx.postpone) p.push('ticket reporté (retour dans le bac, avis de passage)');
  if (fx.addTicket) p.push(`nouveau ticket : ${JOBS[fx.addTicket].short} (${JOBS[fx.addTicket].dur} h${JOBS[fx.addTicket].leak ? `, ${JOBS[fx.addTicket].leak} m³/h perdus tant qu’il n’est pas réparé` : ''})`);
  if (fx.addRdvSoon) p.push('RDV dans l’heure');
  if (fx.vip) p.push(`appel ${VIPS[fx.vip].tag} : ${VIPS[fx.vip].rule}`);
  if (fx.bonus) p.push('autocollant pour le carnet');
  return p.length ? `Exact : ${esc(p.join(' · '))}` : 'Exact : aucun effet chiffré'; }
function hintHtml(h: string) {
  return h.split(' · ').map((part) => { let m: RegExpMatchArray | null;
    if ((m = part.match(/^\+(\d+) créneaux?( de trajet)?$/))) return chipFx(m[2] ? 'van' : 'clock', `+${m[1]} h`, 'time');
    if ((m = part.match(/^[Ss]atisfaction ([+−-]\d+)(?: \((.+)\))?$/))) return chipFx('heart', m[1], m[1].startsWith('+') ? 'up' : 'down') + (m[2] ? `<small>${esc(m[2])}</small>` : '');
    if (part === 'Pas d’effet') return '<small>Rien ne change</small>';
    if (part === 'Ticket reporté') return chipFx('clock', 'à demain', 'time');
    if ((m = part.match(/^(.*?) : ([+−-]\d+)(.*)$/))) return `<small>${esc(cap1(m[1]))}</small>${chipFx('heart', m[2], m[2].startsWith('+') ? 'up' : 'down')}${m[3] ? `<small>${esc(m[3].replace(/^ et /, 'et '))}</small>` : ''}`;
    if ((m = part.match(/^(.*?) : (.+)$/))) return `<small>${esc(cap1(m[1]))} : ${esc(m[2])}</small>`;
    return `<small>${esc(part)}</small>`; }).join('');
}
const okMsg = (left: number) => left ? `<span class="okmsg todo">${icon('van', 'ic s')} ${left} ticket${left > 1 ? 's' : ''} t'attend${left > 1 ? 'ent' : ''}</span>` : `<span class="okmsg">${glyph('check')} Tout le monde a sa journée</span>`;
let pauseMsg = '';
const range = (t: Ticket, c?: CapyId) => { const J = JOBS[t.job]; const base = c ? slotsFor(CAPY[c], J) : J.dur; if (base === null) return '—'; const mx = base + G.maxExtra(t, c); return mx > base ? `${base}–${mx}` : `${base}`; };

document.body.innerHTML = `<div id="app"><div class="view" id="home"></div><div class="view" id="create"></div><div class="view" id="game"></div></div>
<div class="ov" id="ov"><div class="card" id="card"></div></div><div class="toast" id="toast" role="status"></div>
<div class="rotate" id="rotate"><div class="rot-art">${who('momo')}<div class="phone"></div></div><h2>Tourne ton téléphone</h2><p>Le planning se joue à l'horizontale.</p></div>`;

let toastT = 0;
function toast(msg: string, ms = 2200, bad = false) { const t = $('#toast'); t.textContent = nb(msg); t.classList.toggle('bad', bad); t.classList.add('show'); clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove('show'), ms); }
function openOv(html: string, cls = '') { $('#toast').classList.remove('show'); const c = $('#card'); c.className = `card ${cls}`; c.innerHTML = html; fillNames(c); $('#ov').classList.add('show'); c.scrollTop = 0; }
function closeOv() { $('#ov').classList.remove('show'); }
const ovOpen = () => $('#ov').classList.contains('show');

// ---------------------------------------------------------------- home
function showView(v: 'home' | 'game' | 'create') { document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === v)); }
function home() {
  stop(); closeOv(); showView('home'); snd.music(0);
  const cont = g && !g.over && g.today;
  $('#home').innerHTML = `<div class="home">
    <img class="h-bg" src="./art/home-keyart.webp" srcset="./art/home-keyart-854.webp 854w, ./art/home-keyart.webp 1280w" sizes="100vw" alt="" decoding="async" fetchpriority="high">
    <div class="h-veil"></div>
    <div class="h-scene" aria-hidden="true">${vanSvg('fourgon', 'h-van')}<div class="h-crew">${S.player ? `<span class="h-cap me">${me()}</span>` : ''}${(['josette', 'momo', 'lulu'] as const).map((c) => `<span class="h-cap ${c}">${who(c)}</span>`).join('')}</div></div>
    <div class="h-left">
      <div class="brand">${logoLDR(46)}<div><div class="b1">Lyonnaise des Robinets</div><div class="b2">Agence d'Avignon · eau potable</div></div></div>
      <h1 class="title"><span>Capy</span> Dispatch</h1>
      <p class="pitch">${say("Tout juste {arrivé|arrivée} à l'agence d'Avignon, tu rejoins l'équipe de capybaras : fuites, compteurs, rendez-vous… dans toutes les rues de la ville.")}</p>
      <div class="h-btns">
        ${cont ? `<button class="btn primary big cta" id="h-cont">${glyph('play')}<span>Continuer <small>${dayName(g!.day)}</small></span></button>` : `<button class="btn primary big cta" id="h-new">${glyph('play')}<span>Jouer</span></button>`}
        <div class="row2">${cont ? `<button class="btn small" id="h-new">Nouvelle quinzaine</button>` : ''}<button class="btn small" id="h-set">${glyph('gear')}<span>Réglages</span></button><button class="btn small" id="h-cred">Crédits</button></div>
      </div>
      ${S.best.runs ? `<p class="best">Meilleure quinzaine : ${S.best.stars} ★ sur ${DAYS * 3} · rendement ${pct(S.best.yield)}</p>` : ''}
    </div>
    ${S.player ? `<button class="h-me" id="h-me" aria-label="Modifier mon personnage"><span class="av">${me()}</span><span class="h-me-t"><b>${NM}</b><small>Agence d'Avignon</small></span>${glyph('edit')}</button>` : ''}
  </div>`;
  fillNames($('#home'));
  $('#h-cont')?.addEventListener('click', () => enterGame());
  $('#h-new').addEventListener('click', () => { if (cont) confirmBox('Nouvelle quinzaine ?', 'La quinzaine en cours sera perdue.', 'Recommencer', newRun); else newRun(); });
  $('#h-set').addEventListener('click', settings); $('#h-cred').addEventListener('click', credits);
  $('#h-me')?.addEventListener('click', () => creator(home, false));
}
// ---------------------------------------------------------------- character creation (first launch, then from the settings)
function creator(after: () => void, first: boolean) {
  stop(); closeOv(); showView('create'); snd.music(0);
  const cur = S.player; let sex: Sex | null = cur?.sex ?? null; const look: Look = { ...DEFAULT_LOOK, ...(cur?.look ?? {}) };
  const radios = (k: string, opts: string[], label: (v: string) => string, sw?: (v: string) => string) => `<div class="${sw ? 'sw' : 'chips'}" role="radiogroup" data-k="${k}">${opts.map((v) => `<button type="button" role="radio" data-v="${v}" aria-label="${label(v)}"${sw ? ` style="--sw:${sw(v)}"` : ''}>${sw ? '<i></i>' : label(v)}</button>`).join('')}</div>`;
  // outfit picker: a torso thumbnail of each outfit + its short name
  const outfits = `<div class="th" role="radiogroup" aria-labelledby="l-out" data-k="outfit">${Object.keys(OUTFITS).map((v) => `<button type="button" role="radio" data-v="${v}" aria-label="${OUTFIT_LABEL[v] ?? v}">${outfitThumb(v)}<span>${OUTFIT_SHORT[v] ?? v}</span></button>`).join('')}</div>`;
  const heads = `<div class="th th-hd" role="radiogroup" aria-labelledby="l-head" data-k="head">${Object.keys(HEADS).map((v) => `<button type="button" role="radio" data-v="${v}" aria-label="Tête ${HEAD_LABEL[v] ?? v}"><span class="hdt"></span><span>${HEAD_LABEL[v] ?? v}</span></button>`).join('')}</div>`;
  $('#create').innerHTML = `<div class="cr">
    <div class="cr-prev"><div class="cr-stage"><div class="cr-capy" id="cr-capy"></div><div class="cr-podium"></div></div><div class="cr-tag"><b id="cr-name"></b><span id="cr-title"></span></div></div>
    <form class="cr-form" id="cr-form" autocomplete="off">
      <p class="kicker">${first ? 'Avant ta première journée' : 'Réglages'}</p>
      <h1>${first ? 'Ton personnage' : 'Modifier mon personnage'}</h1>
      <div class="fld"><label class="fl" for="cr-in">Prénom</label><input id="cr-in" name="prenom" type="text" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="Ton prénom" aria-describedby="cr-hint"><div class="seg" role="radiogroup" aria-label="Je suis"><button type="button" role="radio" data-sex="homme">Un homme</button><button type="button" role="radio" data-sex="femme">Une femme</button></div></div>
      <div class="fld"><span class="fl" id="l-head">Tête</span>${heads}<span class="fl fl2">Pelage</span>${radios('fur', Object.keys(FURS), (v) => FUR_LABEL[v] ?? v, (v) => FURS[v].fur)}</div>
      <div class="fld"><span class="fl" id="l-out">Tenue</span>${outfits}</div>
      <div class="fld"><span class="fl">Accessoire</span>${radios('acc', ACCS, (v) => ACC_LABEL[v as keyof typeof ACC_LABEL])}</div>
      <div class="cr-go"><p class="cr-hint" id="cr-hint" aria-live="polite"></p>${first ? '' : '<button type="button" class="btn" id="cr-cancel">Annuler</button>'}<button type="submit" class="btn primary big" id="cr-ok">${first ? 'C’est parti !' : 'Enregistrer'}</button></div>
    </form></div>`;
  const input = $<HTMLInputElement>('#cr-in'); input.value = cur?.name ?? '';
  const upd = () => {
    $('#cr-capy').innerHTML = playerSvg(look); document.querySelectorAll<HTMLElement>('#create .th-hd [data-v]').forEach((b) => { b.querySelector('.hdt')!.innerHTML = headThumb(b.dataset.v!, look.fur); }); const n = cleanName(input.value);
    $('#cr-name').textContent = n || 'Ton prénom'; $('#cr-name').classList.toggle('ph', !n);
    $('#cr-title').textContent = sex ? gx('Nouvel arrivant', 'Nouvelle arrivante', sex) : 'Agence d’Avignon';
    document.querySelectorAll<HTMLElement>('#create [data-sex]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sex === sex)));
    document.querySelectorAll<HTMLElement>('#create [data-k]').forEach((grp) => grp.querySelectorAll<HTMLElement>('[data-v]').forEach((b) => b.setAttribute('aria-checked', String(look[grp.dataset.k as keyof Look] === b.dataset.v))));
    const ok = validName(input.value) && !!sex; $<HTMLButtonElement>('#cr-ok').disabled = !ok;
    $('#cr-hint').textContent = ok ? '' : !validName(input.value) ? 'Écris ton prénom.' : 'Choisis : un homme ou une femme.';
  };
  // live filter: only letters, spaces, apostrophes, hyphens and dots can be typed (cleanName() trims on save)
  input.addEventListener('input', () => { const v = input.value.replace(/[^\p{L}\p{M}\p{N} ’'.\-]/gu, ''); if (v !== input.value) input.value = v; upd(); });
  document.querySelectorAll<HTMLElement>('#create [data-sex]').forEach((b) => b.addEventListener('click', () => { sex = b.dataset.sex as Sex; snd.play('select'); upd(); }));
  document.querySelectorAll<HTMLElement>('#create [data-k] [data-v]').forEach((b) => b.addEventListener('click', () => { const k = b.parentElement!.dataset.k as keyof Look; (look as unknown as Record<string, string>)[k] = b.dataset.v!; snd.play('select'); upd(); }));
  $('#cr-form').addEventListener('submit', (e) => { e.preventDefault(); input.blur(); if (!validName(input.value) || !sex) { snd.play('invalid'); upd(); return; }
    S.player = { name: cleanName(input.value), sex, look: { ...look } }; setSex(sex); setPlayerLook(S.player.look); save(); snd.play('place'); after(); });
  $('#cr-cancel')?.addEventListener('click', after);
  upd(); if (first) setTimeout(() => { if (!matchMedia('(pointer:coarse)').matches) input.focus(); }, 60);
}
function newRun() { if (!S.player) { creator(newRun, true); return; } forgetMorning(); g = G.newGame(1 + Math.floor(Math.random() * 1e6)); if (!S.best.runs && !S.seenTuto) g.seed = 2026; G.startDay(g); save(); enterGame(); }
function confirmBox(title: string, text: string, ok: string, fn: () => void) {
  openOv(`<h2>${title}</h2><p>${text}</p><div class="btns"><button class="btn" id="c-no">Annuler</button><button class="btn danger" id="c-yes">${ok}</button></div>`, 'small');
  $('#c-no').onclick = closeOv; $('#c-yes').onclick = () => { closeOv(); fn(); };
}
function settings() {
  const back = view();
  openOv(`<h2>Réglages</h2><div class="set">
    ${S.player ? `<button class="me-row" id="s-me"><span class="av">${me()}</span><span><b>${NM}</b><small>Agence d'Avignon</small></span><span class="me-edit">${glyph('edit')} Modifier mon personnage</span></button>` : ''}
    <label class="tg"><span>Bruitages</span><input type="checkbox" role="switch" id="s-sfx" ${S.settings.sfx ? 'checked' : ''}></label>
    <label class="tg"><span>Musique</span><input type="checkbox" role="switch" id="s-mus" ${S.settings.music ? 'checked' : ''}></label>
    <label class="tg"><span>Vibrations</span><input type="checkbox" role="switch" id="s-hap" ${S.settings.haptics !== false ? 'checked' : ''}></label>
    <label class="tg"><span>Réduire les animations</span><input type="checkbox" role="switch" id="s-calm" ${S.settings.calm ? 'checked' : ''}></label>
    <label class="tg"><span>Mode expert <small>chiffres exacts : trajets, effets des choix</small></span><input type="checkbox" role="switch" id="s-exp" ${S.settings.expert ? 'checked' : ''}></label>
    <p class="muted">Règle de sécurité (appel gaz avant de creuser) : ${SAFETY_RULE === 'cap1' ? 'une erreur est possible, mais la journée est plafonnée à 1 étoile.' : 'la journée ne peut pas démarrer sans l’appel.'}</p>
  </div><div class="btns">${g && back === 'game' ? `<button class="btn" id="s-home">${glyph('home')}<span>Accueil</span></button>` : ''}<button class="btn primary" id="s-ok">OK</button></div>`, 'small');
  $('#s-sfx').onchange = (e) => { S.settings.sfx = snd.sfxOn = (e.target as HTMLInputElement).checked; save(); };
  $('#s-mus').onchange = (e) => { S.settings.music = (e.target as HTMLInputElement).checked; snd.setMusic(S.settings.music); save(); };
  $('#s-hap').onchange = (e) => { const v = (e.target as HTMLInputElement).checked; if (v) delete S.settings.haptics; else S.settings.haptics = false; setHaptics(v); if (v) haptic('tap'); save(); };
  $('#s-calm').onchange = (e) => { if ((e.target as HTMLInputElement).checked) S.settings.calm = true; else delete S.settings.calm; calm(); save(); };
  $('#s-exp').onchange = (e) => { if ((e.target as HTMLInputElement).checked) S.settings.expert = true; else delete S.settings.expert; save(); if (g?.today) render(); };
  $('#s-ok').onclick = () => { closeOv(); if (view() === 'game') resumeAfterOverlay(); };
  $('#s-home')?.addEventListener('click', home);
  $('#s-me')?.addEventListener('click', () => { const ret = () => (back === 'game' && g?.today ? enterGame() : home()); creator(ret, false); });
}
const view = () => (document.querySelector('.view.active')?.id ?? 'home') as 'home' | 'game' | 'create';
function credits() {
  openOv(`<h2>Crédits &amp; licences</h2><div class="cred">
    <p><b>Capy Dispatch</b> (titre de travail) · un jeu de Maxime Durand.</p>
    <p><b>Illustrations d'accueil et de partage</b> : générées par IA pour ce jeu, d'après nos propres capybaras.</p>
    <p><b>Carte</b> : données © les contributeurs d'OpenStreetMap, disponibles sous licence <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">ODbL</a>. Le style de la carte est le nôtre.</p>
    <p><b>Dessins</b> : capybaras et autocollants dessinés à la main en SVG pour ce jeu. <b>Musique et bruitages</b> : synthétisés dans le navigateur, originaux.</p>
    <p><b>Police</b> : Fredoka (SIL Open Font License).</p>
    <p><b>Parodie</b> : Lyonnaise des Robinets, Générale des Flots, SORE et la Régie sont des entreprises imaginaires. Jeu non officiel, sans lien avec un opérateur réel. Les abonnés et le préfet sont fictifs.</p>
    <p class="muted">Le métier est inspiré de vraies fiches métiers des opérateurs d'eau (PRC, débit de nuit, avis de coupure 48 h, appel à l'exploitant gaz avant de creuser…).</p>
  </div><div class="btns"><button class="btn primary" id="cred-ok">OK</button></div>`);
  $('#cred-ok').onclick = () => { closeOv(); if (view() === 'game') resumeAfterOverlay(); };
}

// ---------------------------------------------------------------- game screen
let mv: MapView | null = null;
function enterGame() {
  if (!g) return; showView('game'); closeOv();
  if (g.over) { bilan(); return; }
  const root = $('#game');
  if (!mv) {
    root.innerHTML = `<header class="top"></header><main class="main"><section class="mapbox" id="mapbox" aria-label="Carte"></section><div class="scrim" id="scrim"></div><section class="panel"></section></main>`;
    mv = new MapView($('.mapbox', root)); mv.onPin = (id) => pinTap(id);
    $('.mapbox', root).insertAdjacentHTML('beforeend', `<button class="mbtn mclose" id="m-close" aria-label="Fermer la carte">${glyph('close')}</button><button class="mbtn mexp" id="m-exp" aria-label="Agrandir la carte">${glyph('expand')}</button>`);
    $('#m-close').onclick = () => setMap(false); $('#m-exp').onclick = () => { setMap(true); snd.play('click'); }; $('#scrim').onclick = () => setMap(false);
  }
  setMap(false);
  mv.resetCapys(); const d = today(); for (const c of TEAM) mv.moveCapy(c.id, d.capys[c.id].pos);
  render();
  if (d.phase === 'briefing') briefing();
  else if (d.phase === 'close') closeScreen();
  else if (d.phase === 'run') { snd.music(1); if (d.pending.length) showPending(); else if (!d.replan) play(); }
  else snd.music(0);
}
function render() { if (!g?.today) return; topbar(); panel(); mapUpdate(); fitBlocks(); }
/** Narrow planning: a block whose name would be cut shows only its icon and duration (the name stays in aria-label and title). */
function fitBlocks() { document.querySelectorAll<HTMLElement>('#game .blk').forEach((el) => { el.classList.remove('cut'); const b = el.querySelector<HTMLElement>('.b1 b'); if (!b || b.offsetParent === null) return;
  if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) { el.classList.add('cut'); el.title = el.getAttribute('aria-label') ?? ''; } }); }
addEventListener('resize', () => { if (g?.today) fitBlocks(); });
function topbar() {
  const d = today(); const card = DAY_CARDS[DAYS_SPEC[d.day].card]; const y = G.yieldLive(g!); mv?.setDress(DAYS_SPEC[d.day].card);
  const cur = { y: Math.round(y * 1000), m3: Math.round(d.m3), sat: Math.round(g!.sat), day: d.day }; const bump = { y: '', m3: '', sat: '' };
  if (lastKpi && lastKpi.day === cur.day) { if (cur.y !== lastKpi.y) bump.y = cur.y > lastKpi.y ? ' up' : ' down'; if (cur.m3 > lastKpi.m3) bump.m3 = ' down'; if (cur.sat !== lastKpi.sat) bump.sat = cur.sat > lastKpi.sat ? ' up' : ' down'; } lastKpi = cur; const lo = 0.65, hi = 0.9; const f = (v: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 100;
  const n = DAYS_SPEC[d.day].objs.length; const met = d.met ? d.met.filter(Boolean).length : 0;
  $('#game .top').innerHTML = `<button class="iconbtn" id="t-menu" aria-label="Menu">${glyph('menu')}</button>
    <div class="t-day"><span class="av">${me()}</span><div><b>${WEEKDAYS[d.day % 5]}</b><span>Jour ${d.day + 1}/${DAYS}</span></div>${icon(card.icon, 'ic s')}</div>
    <button class="t-obj" id="t-obj" aria-label="Objectifs du jour">${DAYS_SPEC[d.day].objs.map((_, i) => icon(d.met?.[i] ? 'star' : 'starOff', 'ic s')).join('')}<span><span class="lbl">Objectifs</span><b>${met}/${n}</b></span></button>
    <div class="t-kpis">
      <button class="kpi k-y${bump.y}" id="t-y" aria-label="Rendement de réseau ${pct(y)}, but ${Math.round(YIELD_TARGET * 100)} % : qu'est-ce que c'est ?"><span class="lbl">Rendement de réseau</span><span class="kv"><b>${pct(y)}</b><span class="gauge"><i style="width:${f(y)}%"></i><em style="left:${f(YIELD_TARGET)}%"></em></span><span class="goal">but ${Math.round(YIELD_TARGET * 100)}</span></span></button>
      <button class="kpi k-m3${bump.m3}" id="t-m3" aria-label="Eau perdue aujourd'hui : ${Math.round(d.m3)} m³"><span class="lbl">Eau perdue</span><span class="kv">${icon('drop', 'ic xs')}<b>${Math.round(d.m3)} m³</b></span></button>
      <button class="kpi k-sat${bump.sat}" id="t-sat" aria-label="Abonnés : ${Math.round(g!.sat)} sur 100"><span class="lbl">Abonnés</span><span class="kv">${icon('heart', 'ic xs')}<b>${Math.round(g!.sat)}</b></span></button></div>
    <button class="t-map" id="t-map" aria-controls="mapbox" aria-expanded="${mapOpen}">${glyph('map')}<span>Carte</span></button>`;
  fillNames($('#game .top'));
  $('#t-menu').onclick = () => { pauseRun(); menu(); };
  $('#t-obj').onclick = () => { pauseRun(); objectives(); };
  $('#t-y').onclick = () => { pauseRun(); explain('y'); }; $('#t-m3').onclick = () => { pauseRun(); explain('m3'); }; $('#t-sat').onclick = () => { pauseRun(); explain('sat'); };
  $('#t-map').onclick = () => { setMap(!mapOpen); snd.play('click'); };
}
let lastKpi: { y: number; m3: number; sat: number; day: number } | null = null;
const pt1 = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')}\u202Fpt`;
const n1 = (v: number) => (v * 100).toFixed(1).replace('.', ',');
/** « C'est quoi ? » sheets for the top bar and the day close (mockup 04): what it is, the goal, why it moved today, how to make it go up. */
function explain(kind: 'y' | 'm3' | 'sat', back?: () => void) {
  const d = today(); let html = '';
  const lo = 0.6, hi = 0.9; const f = (v: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 100;
  const why = (items: { text: string; v: number; unit: string }[], empty: string) => items.length ? `<ul class="why">${items.map((x) => `<li><span>${esc(nb(x.text))}</span><b class="${x.v >= 0 ? 'green' : 'red'}">${x.unit === 'pt' ? pt1(x.v) : `${x.v >= 0 ? '+' : '−'}${Math.abs(Math.round(x.v))}${x.unit}`}</b></li>`).join('')}</ul>` : `<p class="muted">${empty}</p>`;
  const closed = d.phase === 'close'; const since = closed ? 'Aujourd’hui' : `Depuis ce matin`;
  if (kind === 'y') { const w = G.yieldWhy(g!); const y = w.y1;
    html = `<h2>Le rendement de réseau, c'est quoi ?</h2>
      <p>Sur 100 litres mis dans les tuyaux d'Avignon, <b>${n1(y)} arrivent au robinet</b>. Le reste se perd dans les fuites. Le contrat demande ${Math.round(YIELD_TARGET * 100)}.</p>
      <div class="biggauge" role="img" aria-label="Rendement ${pct(y)}, but ${Math.round(YIELD_TARGET * 100)} %, ce matin ${n1(w.y0)}"><span class="bg-end">60\u202F%</span><div class="bg-bar"><i style="width:${f(y)}%"></i><em class="goal" style="left:${f(YIELD_TARGET)}%"><span>but ${Math.round(YIELD_TARGET * 100)}\u202F%</span></em><em class="am" style="left:${f(w.y0)}%"><span>ce matin ${n1(w.y0)}</span></em></div><span class="bg-end">90\u202F%</span></div>
      <h3>${since} : <b class="${y >= w.y0 ? 'green' : 'red'}">${pt1((y - w.y0) * 100)}</b></h3>
      ${why(w.items.map((x) => ({ text: x.text, v: x.pt, unit: 'pt' })), 'Rien n’a encore bougé : la journée commence.')}
      <p class="tip"><b>Pour le faire monter :</b> réparer les fuites vite (chaque heure coûte des m³), ne pas en laisser pour la nuit, et envoyer Josette sur les débits de nuit (une fuite cachée trouvée, c'est pour de bon). Les PRC et les RDV font plaisir aux abonnés, pas au rendement.</p>`; }
  else if (kind === 'm3') { const lk = Object.entries(d.leaks ?? {}).filter(([id]) => g!.tickets[id]).sort((a, b) => b[1] - a[1]); const night = closed ? d.night : G.nightLoss(g!);
    html = `<h2>L'eau perdue, c'est quoi ?</h2>
      <p>Une fuite ouverte perd de l'eau <b>chaque heure</b>, et toute la nuit si personne ne la répare. Aujourd'hui : <b>${Math.round(d.m3)} m³</b> (1 m³ = 1 000 litres, à peu près 7 baignoires).</p>
      <h3>${since}</h3>${why(lk.map(([id, v]) => { const t = g!.tickets[id]; return { text: `${JOBS[t.job].short} ${G.rue(t.site)}${d.done.includes(id) ? ' (réparée)' : ''}`, v: -v, unit: ' m³' }; }), 'Pas une goutte perdue pour l’instant.')}
      ${night ? `<p class="warnline">${icon('warn', 'ic s')}<span>${closed ? 'Cette nuit' : 'Cette nuit, si rien ne change'} : <b>${Math.round(night)} m³</b> de plus.</span></p>` : ''}
      <p class="tip"><b>Pour en perdre moins :</b> prendre les fuites urgentes en premier, et ne pas les laisser pour demain. Chaque m³ perdu fait baisser le rendement de réseau.</p>`; }
  else { const sw = d.satWhy ?? []; const dv = Math.round(g!.sat - d.satStart);
    html = `<h2>Les abonnés, c'est quoi ?</h2>
      <p>L'humeur des habitants d'Avignon, sur 100. Ce matin <b>${Math.round(d.satStart)}</b>, maintenant <b>${Math.round(g!.sat)}</b> <b class="${dv >= 0 ? 'green' : 'red'}">(${dv >= 0 ? '+' : '−'}${Math.abs(dv)})</b>. Le but : finir la journée plus haut qu'au matin.</p>
      <h3>${since}</h3>${why(sw.map((x) => ({ text: x.text, v: x.v, unit: '' })), 'Rien de spécial pour l’instant.')}
      <p class="tip"><b>Pour les rendre contents :</b> tenir les RDV, réparer vite les urgences, et choisir les réponses gentilles quand le téléphone sonne. Un RDV raté, ça se paie.</p>${g!.sat < G.SAT_FLOOR + 5 ? `<p class="muted">Sous ${G.SAT_FLOOR}, ils sont fâchés mais pas perdus : les mauvaises nouvelles comptent moitié moins, et chaque nuit ils remontent un peu plus vite.</p>` : ''}`; }
  openOv(`<div class="explain">${html}<div class="btns">${back ? `<button class="btn" id="x-back">${glyph('left')}<span>Retour</span></button>` : ''}<button class="btn primary" id="x-ok">Compris</button></div></div>`, 'explain-ov');
  const done = () => { if (back) back(); else { closeOv(); resumeAfterOverlay(); } };
  $('#x-ok').onclick = done; $('#x-back')?.addEventListener('click', done);
}
function menu() {
  openOv(`<h2>Pause</h2><p class="muted">${dayName(today().day)}</p><div class="col">
    <button class="btn primary" id="m-back">${glyph('play')}<span>Reprendre</span></button><button class="btn" id="m-set">${glyph('gear')}<span>Réglages</span></button><button class="btn" id="m-cred">Crédits &amp; licences</button><button class="btn" id="m-home">${glyph('home')}<span>Accueil</span></button></div>`, 'small');
  $('#m-back').onclick = () => { closeOv(); resumeAfterOverlay(); }; $('#m-set').onclick = settings; $('#m-cred').onclick = credits; $('#m-home').onclick = home;
}
function objectives() {
  const d = today(); const spec = DAYS_SPEC[d.day];
  openOv(`<h2>Objectifs du jour</h2><p class="muted">Chaque objectif tenu à ${DAY_END} vaut une étoile.${d.incidents ? ' <b class="red">On a creusé sans appeler le gaz : la journée ne peut pas dépasser 1 étoile.</b>' : ''}</p>
    <ul class="objs">${spec.objs.map((o) => `<li>${icon('star')}<span>${objText(o)}</span></li>`).join('')}</ul>
    <p class="muted">Sur 100 litres mis dans les tuyaux d'Avignon, ${Math.round(G.yieldLive(g!) * 100)} arrivent au robinet. Le contrat en demande ${Math.round(YIELD_TARGET * 100)}. Chaque fuite réparée et chaque fuite cachée trouvée fait monter ce chiffre.</p>
    <div class="btns"><button class="btn primary" id="o-ok">OK</button></div>`, 'small');
  $('#o-ok').onclick = () => { closeOv(); resumeAfterOverlay(); };
}
function resumeAfterOverlay() { const d = g?.today; if (!d) return; if (d.phase === 'run' && d.pending.length) showPending(); else if (d.phase === 'run' && wasRunning) play(); wasRunning = false; }
let wasRunning = false;
function pauseRun() { if (running) { wasRunning = true; stop(); } }

// ---- phones (Option A): the map is a pull-out drawer while planning, a mini-map column while the day runs
const DRAWER = matchMedia('(max-height:560px), (max-width:899px)');
let mapOpen = false;
function setMap(open: boolean) {
  mapOpen = open; const m = document.querySelector('#game .main'); if (!m) return; m.classList.toggle('map-open', open);
  $('#t-map')?.setAttribute('aria-expanded', String(open)); $('#mapbox')?.toggleAttribute('inert', DRAWER.matches && !open && !m.classList.contains('run'));
}
DRAWER.addEventListener?.('change', () => setMap(false));

// ---------------------------------------------------------------- briefing
function briefing() {
  const d = today(); const spec = DAYS_SPEC[d.day]; const card = DAY_CARDS[spec.card]; snd.music(0);
  const tick = G.tray(g!); const urg = tick.filter((id) => JOBS[g!.tickets[id].job].urgent).length; const rdv = tick.filter((id) => g!.tickets[id].rdv && G.avail(g!, id)).length;
  openOv(`<div class="brief"><div class="b-left"><div class="bubble">${say(spec.chef)}</div><div class="duo">${who('chef', 'chef')}<div class="pl">${me('plc')}<span class="nt">${NM}</span></div></div></div>
    <div class="b-right"><p class="kicker">Le café de 7 h 30</p><h2>${dayName(d.day)}</h2>
      <div class="daycard">${icon(card.icon, 'ic big')}<div><b>${card.title}</b><span>${card.brief}</span><span class="dfx">${card.fx.map(([k, t]) => `<i>${icon(k)}${t}</i>`).join('')}</span></div></div>
      ${g!.news.map((n) => `<p class="news">${icon('warn')} ${esc(n)}</p>`).join('')}
      <p class="sub">Aujourd'hui : <b>${tick.length} ticket${tick.length > 1 ? "s" : ""}</b>${urg ? ` · <b class="red">${urg} urgence${urg > 1 ? 's' : ''}</b>` : ''}${rdv ? ` · ${rdv} RDV` : ''}</p>
      <ul class="objs">${spec.objs.map((o) => `<li>${icon('star')}<span>${objText(o)}</span></li>`).join('')}</ul>
      <button class="btn primary big" id="b-go">On prépare la journée ${glyph('right')}</button></div></div>`, 'wide');
  $('#b-go').onclick = () => { closeOv(); d.phase = 'plan'; save(); render(); snd.play('click'); };
}

// ---------------------------------------------------------------- planning panel
const editable = () => { const d = today(); return d.phase === 'plan' || (d.phase === 'run' && !running && !d.pending.length); };
const GAP = 0.5; // lunch gap, in slot widths (1 h 30 drawn a bit narrower than 1.5 slots: it is never worked)
const U = SLOTS + GAP; // timeline units: 8 slots + the lunch gap
const xs = (s: number) => ((Math.min(s, SLOTS) + (s >= LUNCH_AFTER ? GAP : 0)) / U) * 100; // left edge of a start slot
const xe = (e: number) => ((Math.min(e, SLOTS) + (e > LUNCH_AFTER ? GAP : 0)) / U) * 100; // right edge of an end slot
const NOJOB: Record<Skill, string> = { fuite: 'cherche les fuites cachées', icc: 'fait les interventions chez les abonnés', reseau: 'répare le réseau' };
/** Per-capy ghosts for a ticket: where it would go, how long, the route, and which one finishes first. */
function ghosts(id: string) {
  const spots = {} as Record<CapyId, G.Spot | null>; let best: CapyId | null = null; let bk = Infinity;
  for (const c of TEAM) { const sp = G.bestSpot(g!, c.id, id); spots[c.id] = sp; if (!sp) continue;
    const k = (sp.hurts || sp.slot.late || sp.slot.overflow ? 1000 : 0) + sp.slot.end * 10 + sp.slot.travel + (c.main === JOBS[g!.tickets[id].job].skill ? 0 : 0.5); if (k < bk) { bk = k; best = c.id; } }
  return { spots, best };
}
function ghostHtml(sp: G.Spot, best: boolean, t: Ticket) {
  const s = sp.slot; const J = JOBS[t.job]; const base = today().plan[sp.c].filter((x) => x !== t.id);
  const prev = sp.index ? G.preview(g!, sp.c, base)[sp.index - 1].end : G.freeAt(g!, sp.c).at; const dur = s.end - s.start;
  const bad = s.late ? 'trop tard pour le RDV' : s.overflow ? `déborde après ${DAY_END}` : sp.hurts ? 'met un autre RDV en retard' : '';
  const sub2 = bad || `finit à ${slotEnd(Math.min(s.end, SLOTS) - 1, true)}`;
  let h = '';
  if (s.travel) h += `<div class="gtrv" style="left:${xs(prev)}%;width:${xe(prev + s.travel) - xs(prev)}%"><span>route ${s.travel} h</span></div>`;
  h += `<div class="gh${best ? ' best' : ''}${bad ? ' bad' : ''}" data-gh="${sp.c}" data-i="${sp.index}" role="button" aria-label="Donner à ${CAPY[sp.c].name} : ${dur} heure${dur > 1 ? 's' : ''}, ${sub2}" style="left:${xs(s.start)}%;width:${xe(Math.min(s.end, SLOTS)) - xs(s.start)}%;--c:${SK_COL[J.skill]}"><b>${dur} h${s.travel ? '' : '<span class="g0"> · 0 route</span>'}${J.dig && !t.gas ? icon('phone', 'ic xs') : ''}</b><small>${sub2}</small>${best ? `<i class="gbest">${glyph('check')}</i>` : ''}</div>`;
  return h;
}
/** « Qui y va ? »: the comparison next to the chosen ticket. */
function whoGo(id: string) {
  const t = g!.tickets[id]; const J = JOBS[t.job]; const { spots, best } = ghosts(id);
  const order = [...TEAM].sort((a, b) => (a.id === best ? -1 : b.id === best ? 1 : 0) || (spots[a.id] ? 0 : 1) - (spots[b.id] ? 0 : 1)); const parts = order.map((c) => { const sp = spots[c.id]; if (!sp) return `<span class="no">${c.name} ${G.canDo(c.id, id, g!) ? '—' : 'pas son métier'}</span>`; const dur = sp.slot.end - sp.slot.start; return `<span${c.id === best ? ' class="best"' : ''}>${c.name} <b>${dur} h</b>${sp.slot.travel ? ` <i>+${sp.slot.travel} h de route</i>` : ''}</span>`; });
  const why: string[] = [];
  if (best) { const b = spots[best]!; const name = CAPY[best].name;
    why.push(`${name} ${b.slot.late ? 'serait le moins en retard' : `finit le plus tôt (${slotEnd(Math.min(b.slot.end, SLOTS) - 1, true)})`}${CAPY[best].main === J.skill ? ', c’est son métier' : ''}.`);
    const near = b.slot.travel ? TEAM.find((c) => c.id !== best && spots[c.id] && !spots[c.id]!.slot.travel) : undefined; if (near) why.push(`${near.name} est déjà à côté.`);
    const late = TEAM.filter((c) => spots[c.id]?.slot.late).map((c) => c.name); if (t.rdv) why.push(late.length ? `RDV ${rdvText(t.rdv)} : ${late.join(' et ')} arriverai${late.length > 1 ? 'ent' : 't'} trop tard.` : `RDV ${rdvText(t.rdv)} : à l’heure.`); }
  else why.push(!G.avail(g!, id) ? (G.festivalBlocked(g!, id) ? 'Arrêté Festival : pas de chantier de chaussée non urgent aujourd’hui.' : t.avail === null ? 'Il faut d’abord prévenir les voisins (avis 48 h).' : `Pas avant ${WEEKDAYS[t.avail! % 5].toLowerCase()} : les voisins sont prévenus pour ce jour-là.`) : 'Personne ne peut le faire aujourd’hui.');
  if (J.dig && !t.gas) why.push('Le gaz sera appelé en le plaçant.');
  return `<div class="whogo" role="region" aria-label="Qui y va ?"><button class="wg-x" id="wg-x" aria-label="Choisir un autre ticket">${glyph('close')}</button><p class="wg-1"><b>Qui y va ?</b> ${G.avail(g!, id) ? parts.join(' · ') : 'Pas encore.'}</p><p class="wg-2">${esc(nb(why.join(' ')))}</p><p class="wg-3">Touche la case en pointillés, ou fais glisser le ticket.</p></div>`;
}
function panel() {
  const d = today(); const p = $('#game .panel'); const edit = editable(); const planning = d.phase === 'plan' || d.phase === 'briefing' || d.replan || (d.phase === 'run' && !running && !skipping);
  const hours = Array.from({ length: SLOTS }, (_, s) => `<span style="left:${xs(s)}%">${slotShort(s)}</span>`).join('') + `<span class="end" style="left:100%" title="Fin de journée ${DAY_END}">${slotShort(SLOTS)}</span><i class="lunch-h" style="left:${xe(LUNCH_AFTER)}%;width:${(GAP / U) * 100}%" title="${LUNCH_LABEL}" aria-label="${LUNCH_LABEL}">${icon('cup', 'ic xs')}</i>`;
  const selT = sel && G.avail(g!, sel) ? g!.tickets[sel] : null; const gs = selT && edit ? ghosts(sel!) : null;
  const rows = TEAM.map((c) => {
    const pv = G.preview(g!, c.id); const fa = G.freeAt(g!, c.id); const cr = d.capys[c.id]; let html = '';
    for (const [id, s0, e0] of d.hist[c.id]) { const J = JOBS[g!.tickets[id].job]; html += `<div class="blk done" data-d="${id}" style="left:${xs(s0)}%;width:${xe(e0) - xs(s0)}%;--c:${SK_COL[J.skill]}"><div class="b1">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div><div class="b2"><span class="ok">${glyph('check')}</span></div></div>`; }
    if (cr.job) { const t = g!.tickets[cr.job]; const J = JOBS[t.job]; html += `<div class="blk now" style="left:${xs(cr.started)}%;width:${xe(d.slot + cr.left) - xs(cr.started)}%;--c:${SK_COL[J.skill]}"><div class="b1">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div><div class="b2"><span class="bd">en cours</span>${cr.extra ? `<i class="plus">+${cr.extra} h</i>` : ''}</div></div>`; }
    if (cr.travel && cr.target) html += `<div class="trv" style="left:${xs(d.slot)}%;width:${xe(d.slot + cr.travel) - xs(d.slot)}%" title="Trajet">${icon('van', 'ic xs')}</div>`;
    pv.forEach((s, i) => { const t = g!.tickets[s.id]; const J = JOBS[t.job]; const prev = i ? pv[i - 1].end : fa.at;
      if (s.travel && !(cr.travel && cr.target === s.id && i === 0)) { const why = expert() ? G.travelWhy(g!, s.from, t.site) : ''; html += `<div class="trv${why ? ' x' : ''}" style="left:${xs(prev)}%;width:${xe(prev + s.travel) - xs(prev)}%" title="${why ? esc(why) : 'Trajet'}">${icon('van', 'ic xs')}${why ? `<span>${esc(why.replace(/ :.*$/, '').replace(/ intra-muros.*$/, ''))}</span>` : ''}</div>`; }
      if (s.start > prev + s.travel) html += `<div class="wait" style="left:${xs(prev + s.travel)}%;width:${xe(s.start) - xs(prev + s.travel)}%" title="Attente du RDV"></div>`;
      if (s.endMax > s.end) html += `<div class="maybe" style="left:${xs(s.end)}%;width:${xe(s.endMax) - xs(s.end)}%" title="Temps en plus si un risque tombe"><span>+${s.endMax - s.end} h ?</span></div>`;
      const cls = ['blk', 'q', s.late ? 'late' : '', s.overflow ? 'over' : '', J.urgent ? 'urg' : '', sel === s.id ? 'sel' : ''].join(' ');
      html += `<div class="${cls}" data-b="${s.id}" style="left:${xs(s.start)}%;width:${xe(Math.min(s.end, SLOTS)) - xs(s.start)}%;--c:${SK_COL[J.skill]}" aria-label="${J.short}, ${s.end - s.start} h"><div class="b1">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div><div class="b2"><span class="bd">${s.end - s.start} h</span>${t.rdv ? icon('clock', 'ic xs') : ''}${t.risks.filter((r) => r !== 'absent').map((r) => icon(RISKS[r].icon, 'ic xs')).join('')}${J.dig ? icon(t.gas ? 'phone' : 'phoneX', 'ic xs') : ''}</div>${s.overflow ? `<i class="ovf" title="Déborde après ${DAY_END}">${glyph('right')}</i>` : ''}</div>`; });
    const can = selT ? slotsFor(c, JOBS[selT.job]) !== null : true;
    if (selT && can && edit && gs && !pv.some((s) => s.id === sel)) { const sp = gs.spots[c.id]; if (sp && sp.slot.start < SLOTS) html += ghostHtml(sp, gs.best === c.id, selT); }
    if (selT && !can) html += `<div class="nojob">Pas son métier : ${c.name} ${NOJOB[c.main]}</div>`;
    const rdvBand = selT?.rdv && can ? `<div class="rdvband" style="left:${xs(selT.rdv[0])}%;width:${xe(selT.rdv[1] + 1) - xs(selT.rdv[0])}%" aria-hidden="true"><span>RDV ${rdvText(selT.rdv)}</span></div>` : '';
    const now = d.phase === 'run' ? `<div class="nowl" style="left:${xs(d.slot)}%"></div>` : '';
    return `<div class="row${selT ? (can ? ' can' : ' cannot') : ''}" data-capy="${c.id}">
      <div class="who" data-who="${c.id}" role="button" tabindex="0" aria-label="${c.name} : qui est-ce ?"><span class="hd">${who(c.id)}</span><div><b style="color:${c.color}">${c.name}</b><span class="sk"><i style="background:${SK_COL[c.main]}">${SKILL_SHORT[c.main]}</i>${c.second ? `<i class="s2" style="--k:${SK_COL[c.second]}" title="Métier secondaire : +1 h">${SKILL_SHORT[c.second]}</i>` : ''}</span></div></div>
      <div class="tl" data-capy="${c.id}"><div class="grid">${Array.from({ length: SLOTS }, (_, s) => `<i style="left:${xs(s)}%;width:${xe(s + 1) - xs(s)}%"${s < d.slot && d.phase === 'run' ? ' class="past"' : ''}></i>`).join('')}<em style="left:${xe(LUNCH_AFTER)}%;width:${(GAP / U) * 100}%"></em></div>${rdvBand}${html}${now}</div></div>`;
  }).join('');
  const w = G.warnings(g!); const red = w.filter((x) => x.level === 'red').length;
  let bottom = '';
  if (planning) {
    const tr = G.tray(g!);
    const solo = sel && tr.includes(sel) && edit;
    bottom = `<div class="tray${solo ? ' solo' : ''}" id="tray">${solo ? card(sel!) + whoGo(sel!) : tr.length ? nudgeHtml(tr) + tr.map(card).join('') : `<p class="empty">${d.phase === 'plan' ? 'Tous les tickets sont placés.' : 'Rien en attente.'}</p>`}</div>
      <div class="acts">${w.length && Object.values(d.plan).flat().length ? `<button class="warnbtn ${red ? 'red' : ''}" id="p-warn">${icon('warn', 'ic s')}<span>${w.length} alerte${w.length > 1 ? 's' : ''}</span></button>` : okMsg(tr.filter((id) => G.avail(g!, id)).length)}
      <button class="btn primary go" id="p-go">${glyph('play')}<span>${d.phase === 'plan' ? 'Lancer la journée' : 'Reprendre'}</span></button></div>`;
  } else {
    bottom = `<div class="feed">${d.log.slice(-3).map((l) => `<p>${esc(l)}</p>`).join('') || '<p class="muted">La tournée commence…</p>'}</div>
      <div class="ctrl"><button class="cbtn" id="r-pause" aria-label="Pause et modifier">${glyph('pause')}</button><button class="cbtn ${!skipping && speed === 1 ? 'on' : ''}" id="r-x1" aria-pressed="${!skipping && speed === 1}">x1</button><button class="cbtn ${!skipping && speed === 2 ? 'on' : ''}" id="r-x2" aria-pressed="${!skipping && speed === 2}">x2</button><button class="cbtn wide ${skipping ? 'on' : ''}" id="r-skip" aria-pressed="${skipping}">${glyph('skip')}<span>Prochaine décision</span></button></div>`;
  }
  const main = $('#game .main'); const wasRun = main.classList.contains('run'); main.classList.toggle('run', !planning); if (wasRun !== !planning) { setMap(mapOpen); if (!planning && DRAWER.matches && !mapOpen) requestAnimationFrame(() => mv?.home()); }
  const co = coach() || (d.phase === 'plan' && edit && !sel ? planBand() : '');
  p.innerHTML = `${co}<div class="scale"><div class="who-h"></div><div class="hours">${hours}</div></div><div class="rows">${rows}</div><div class="bottom">${bottom}</div>`;
  if (co) fillNames(p);
  p.classList.toggle('editing', edit);
  bindPanel();
}
/** « Fred 1 h · Lulu 2 h »: who can do it and how long, the specialist first. */
const fitLine = (t: Ticket) => TEAM.filter((c) => slotsFor(c, JOBS[t.job]) !== null).sort((a, b) => slotsFor(a, JOBS[t.job])! - slotsFor(b, JOBS[t.job])!).map((c) => `${c.name} ${slotsFor(c, JOBS[t.job])} h`).join(' · ');
/** Capy chips for the ticket front: the fastest in green, the others grey, those who can't do it struck « Josette — ». */
const fitChips = (t: Ticket) => { const J = JOBS[t.job]; const cs = [...TEAM].sort((a, b) => (slotsFor(a, J) ?? 99) - (slotsFor(b, J) ?? 99)); const best = slotsFor(cs[0], J);
  return cs.map((c, i) => { const n = slotsFor(c, J); const k = n === null ? ' no' : i === 0 || n === best ? ' best' : ' oth'; return `<span class="cf${k}" title="${c.name} : ${n === null ? 'pas son métier' : `${n} h${k === ' best' ? ', le plus rapide' : ''}`}">${c.name} ${n === null ? '—' : `${n}\u202Fh`}</span>`; }).join(''); };
const quoteOf = (t: Ticket) => { const q = QUOTES[t.job]; return t.prefet ? '« Monsieur le préfet vous attend. »' : q[(t.num + t.site) % q.length]; };
const shortWho = (t: Ticket) => t.who.split(' (')[0];
function card(id: string) {
  const t = g!.tickets[id]; const J = JOBS[t.job]; const ok = G.avail(g!, id);
  const age = g!.day - t.day; const rdv = t.rdv ? rdvText(t.rdv) : '';
  const sub = J.name.replace(/\s*\(.*\)$/, '').replace(/[«»]/g, '').trim(); const subShow = sub.toLowerCase() !== J.short.toLowerCase();
  const gain = J.fix ? G.fixGain(g!, J.fix) : 0;
  const badge = J.leak ? `<span class="chip red" title="Urgent : ${J.leak} m³ perdus par heure tant que ce n’est pas réparé">Urgent · ${J.leak}\u202Fm³/h</span>` : gain >= 0.05 ? `<span class="chip gain" title="Rendement de réseau gagné une fois réparé">${pt1(gain)}</span>` : '';
  const rw = t.risks.filter((r) => r !== 'absent').map((r) => `${RISKS[r].name} (+1 h ?)`).concat(t.risks.includes('absent') ? ['Peut-être absent'] : []).concat(J.minigame ? ['Compteur à trouver (+1 h ?)'] : []);
  return `<div class="tk${J.urgent ? ' urg' : ''}${sel === id ? ' sel' : ''}${ok ? '' : ' wait'}" data-t="${id}" style="--c:${SK_COL[J.skill]}" role="button" tabindex="0" aria-label="${J.short}${J.urgent ? ', urgent' : ''}">
    <div class="tk-h">${icon(J.icon)}<b>${J.short}</b>${t.vip ? `<span class="chip vip">${VIPS[t.vip].tag}</span>` : ''}<span class="dur" title="Durée (1 créneau = 1 h)">${range(t)} h</span></div>
    ${subShow ? `<div class="tk-sub">${esc(sub)}</div>` : ''}
    <div class="tk-s">${badge}${!ok && G.festivalBlocked(g!, id) ? '<span class="chip">Arrêté Festival</span>' : !ok && t.avail !== null ? `<span class="chip">Possible ${WEEKDAYS[t.avail % 5].toLowerCase()}</span>` : `<span class="ad">${esc(addr(t))}<span class="ab"> · ${esc(shortWho(t))}</span></span>`}</div>
    <div class="tk-q">${esc(quoteOf(t))}</div>
    ${rw.length ? `<div class="tk-w">${icon('warn', 'ic xs')}${esc(rw.join(' · '))}</div>` : ''}
    <div class="tk-r"><span class="cfs">${fitChips(t)}</span>${qChip(t)}${t.rdv ? `<span class="chip" title="Arrivée entre ${slotLabel(t.rdv[0])} et ${slotLabel(t.rdv[1])}">${icon('clock', 'ic xs')}${rdv}</span>` : ''}<span class="rks">${t.risks.filter((r) => r !== 'absent').map((r) => `<span class="rk" title="${RISKS[r].name}">${icon(RISKS[r].icon, 'ic xs')}</span>`).join('')}${t.risks.includes('absent') ? `<span class="rk" title="Abonné peut-être absent">${icon('clock', 'ic xs')}</span>` : ''}</span>${age > 0 ? (G.waitCosts(t) ? `<span class="chip warn" title="${esc(shortWho(t))} attend depuis ${age + 1} jours : s’il reste encore ce soir, −1 point d’abonnés">J+${age}</span>` : `<span class="chip">J+${age}</span>`) : ''}
      ${J.dig ? `<button class="chip act ${t.gas ? 'green' : 'red'}" data-gas="${id}" aria-label="${t.gas ? 'Exploitant gaz appelé' : 'Appeler l’exploitant gaz'}">${icon(t.gas ? 'phone' : 'phoneX', 'ic xs')}${t.gas ? 'Gaz OK' : 'Gaz ?'}</button>` : ''}${t.avail === null ? `<button class="chip act blue" data-avis="${id}">${icon('mail', 'ic xs')}Avis 48 h</button>` : ''}</div></div>`;
}
/** « Le plan du jour » : RDV to keep and how much work there is for the team, so the player knows what matters before placing. */
function planBand() {
  const d = today(); const ids = [...G.tray(g!), ...Object.values(d.plan).flat()].filter((id) => G.avail(g!, id) && !d.done.includes(id));
  if (!ids.length) return '';
  const work = ids.reduce((s, id) => s + Math.min(...TEAM.map((c) => slotsFor(c, JOBS[g!.tickets[id].job]) ?? 99)), 0); const cap = TEAM.length * SLOTS;
  const rdv = ids.map((id) => g!.tickets[id]).filter((t) => t.rdv).sort((a, b) => a.rdv![0] - b.rdv![0]);
  const urg = ids.some((id) => JOBS[g!.tickets[id].job].urgent);
  const tip = urg ? 'les urgences d’abord, puis les RDV' : work > cap ? 'trop pour aujourd’hui : place le plus important d’abord' : work > cap * 0.8 ? 'ça va être serré : le plus important d’abord' : 'de la marge : pense aux trajets';
  return `<div class="planband" role="status"><b>Le plan du jour</b>${rdv.length ? `<span class="pb-r">${rdv.length} RDV à tenir ${rdv.slice(0, 3).map((t) => `<span class="pdr">${rdvText(t.rdv!)} <i>${esc(t.who.split(' (')[0])}</i></span>`).join('')}</span>` : ''}<span class="pb-w${work > cap ? ' over' : ''}"><b>${work} h</b> de travail pour ${TEAM.length} × ${SLOTS} h : ${tip}</span></div>`;
}
const tuto = () => !S.seenTuto && !!g && g.day === 0;
function coach() {
  if (g?.today?.replan && pauseMsg) return `<div class="coach pause" role="status">${icon('clock', 'ic s')}<p>${say(pauseMsg)}</p></div>`;
  if (!tuto()) return '';
  const d = today(); let msg = ''; let step = 0;
  if (d.phase === 'plan') { const tr = G.tray(g!); const placed = Object.values(d.plan).flat().length; const rdvLeft = tr.some((id) => g!.tickets[id].rdv);
    if (!tr.length) { step = 4; msg = 'Tout est placé ! Les bandes hachurées « +1 h ? » montrent le temps en plus si un risque tombe. Lance la journée.'; }
    else if (sel) { step = placed ? 3 : 2; msg = 'La pastille verte du ticket dit qui est le plus rapide. Touche la case en pointillés verts sur sa ligne.'; }
    else if (!placed) { step = 1; msg = rdvLeft ? '{nom}, touche d’abord le ticket à l’horloge : c’est un RDV à tenir.' : '{nom}, touche un ticket en bas pour le choisir (ou fais-le glisser).'; }
    else { step = 3; msg = rdvLeft ? 'Bien ! Place le RDV à son heure, puis le reste.' : 'Bien ! Enchaîne les tickets d’un même quartier : moins de route, une étoile de plus.'; } }
  else if (d.phase === 'run' && running) { step = 5; msg = 'La journée se joue toute seule : x2 accélère, « Prochaine décision » saute jusqu’au prochain appel.'; }
  if (msg) msg = `<b class="cstep">${step}/6</b> ${say(msg)}`;
  return msg ? `<div class="coach" role="status">${who('chef')}<p>${msg}</p></div>` : '';
}
// ---------- panel interactions: tap ticket → tap slot, drag & drop, block menu
let drag: { id: string; from: 'tray' | 'blk'; x: number; y: number; ghost: HTMLElement | null; el: HTMLElement } | null = null; let suppressClick = false;
function bindPanel() {
  const p = $('#game .panel'); const d = today();
  $('#p-go', p)?.addEventListener('click', launchDay);
  $('#p-nudge', p)?.addEventListener('click', nudge);
  $('#p-warn', p)?.addEventListener('click', () => showWarnings(false));
  $('#r-pause', p)?.addEventListener('click', () => { stop(); render(); toast('Pause : tu peux modifier le planning des tickets pas encore commencés.'); });
  $('#r-x1', p)?.addEventListener('click', () => { speed = 1; S.settings.speed = 1; autoSkip = skipping = false; save(); render(); schedule(); });
  $('#r-x2', p)?.addEventListener('click', () => { speed = 2; S.settings.speed = 2; autoSkip = skipping = false; save(); render(); schedule(); });
  $('#r-skip', p)?.addEventListener('click', skipToDecision);
  p.querySelectorAll<HTMLElement>('[data-avis]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (G.sendAvis(g!, b.dataset.avis!)) { snd.play('place'); toast(`Avis de coupure envoyé : chantier possible ${WEEKDAYS[(g!.day + 2) % 5].toLowerCase()}.`); save(); render(); } }));
  p.querySelectorAll<HTMLElement>('[data-gas]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); G.toggleGas(g!, b.dataset.gas!); snd.play(g!.tickets[b.dataset.gas!].gas ? 'place' : 'click'); save(); render(); }));
  p.querySelectorAll<HTMLElement>('[data-who]').forEach((w) => w.addEventListener('click', (e) => { if (sel) return; e.stopPropagation(); const c = CAPY[w.dataset.who as CapyId];
    toast(`${CAPY_LINE[c.id]} ${GLOSSARY[SKILL_SHORT[c.main]] ?? ''}`.trim(), 4200); }));
  if (!editable() && !(d.phase === 'run' && d.replan)) return;
  p.querySelectorAll<HTMLElement>('.tk').forEach((el) => {
    el.addEventListener('click', () => { if (suppressClick) return; tapTicket(el.dataset.t!); });
    el.addEventListener('pointerdown', (e) => startDrag(e, el.dataset.t!, 'tray', el));
  });
  p.querySelectorAll<HTMLElement>('.blk.q').forEach((el) => {
    el.addEventListener('click', (e) => { if (suppressClick) return; e.stopPropagation(); if (sel && sel !== el.dataset.b) tapRow(el.closest<HTMLElement>('.tl')!, e.clientX); else blockMenu(el.dataset.b!, el); });
    el.addEventListener('pointerdown', (e) => startDrag(e, el.dataset.b!, 'blk', el));
  });
  $('#wg-x', p)?.addEventListener('click', (e) => { e.stopPropagation(); sel = null; snd.play('click'); render(); });
  p.querySelectorAll<HTMLElement>('.gh').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); if (suppressClick || !sel) return; place(el.dataset.gh as CapyId, sel, -1, +el.dataset.i!); }));
  p.querySelectorAll<HTMLElement>('.row').forEach((row) => row.addEventListener('click', (e) => { if (suppressClick || !sel) return; tapRow($('.tl', row), e.clientX); }));
}
function tapTicket(id: string, fromMap = false) {
  if (sel === id) { if (fromMap && mapOpen && DRAWER.matches) { setMap(false); return; } detail(id); return; }
  if (fromMap && mapOpen && DRAWER.matches) setMap(false);
  sel = id; snd.play('select'); mv?.focus(g!.tickets[id].site); render();
  const t = g!.tickets[id]; if (!G.avail(g!, id) && !(editable() && G.tray(g!).includes(id))) toast(G.festivalBlocked(g!, id) ? 'Arrêté Festival : pas de chantier de chaussée non urgent aujourd’hui.' : t.avail === null ? 'Envoie d’abord l’avis de coupure 48 h.' : 'Pas encore possible aujourd’hui.');
}
function pinTap(id: string) { if (!g?.today) return; const d = today(); if (Object.values(d.plan).flat().includes(id) || !G.tray(g).includes(id)) { detail(id); return; } if (editable() || d.replan) tapTicket(id, true); else detail(id); }
function slotAt(tl: HTMLElement, clientX: number) { const r = tl.getBoundingClientRect(); const u = ((clientX - r.left) / r.width) * U; return u >= LUNCH_AFTER + GAP ? Math.floor(u - GAP) : Math.floor(Math.min(u, LUNCH_AFTER - 0.01)); }
/** Queue index for a tap/drop at `slot`: from the ghost's route onwards, it goes where the ghost shows. */
function indexAt(c: CapyId, id: string, slot: number) { const sp = G.bestSpot(g!, c, id); if (sp && slot >= sp.slot.start - sp.slot.travel) return sp.index; const base = today().plan[c].filter((x) => x !== id); const p = G.preview(g!, c, base); const i = p.findIndex((s) => s.start + (s.end - s.start) / 2 > slot); return i < 0 ? p.length : i; }
function place(c: CapyId, id: string, slot: number, index?: number) {
  const t = g!.tickets[id]; const J = JOBS[t.job];
  if (!G.avail(g!, id)) { snd.play('invalid'); shake(c); toast(G.festivalBlocked(g!, id) ? 'Arrêté Festival : pas de chantier de chaussée non urgent aujourd’hui.' : t.avail === null ? 'Envoie d’abord l’avis de coupure 48 h.' : 'Ce ticket n’est pas encore possible.', 2400, true); return false; }
  if (!G.canDo(c, id, g!)) { snd.play('invalid'); shake(c); toast(`${CAPY[c].name} ne sait pas faire « ${J.short} » (métier ${SKILL_SHORT[J.skill]}).`, 2600, true); return false; }
  const at = index ?? indexAt(c, id, slot); G.unassign(g!, id); G.assign(g!, c, id, at); const gas = autoGas(id); snd.play('place'); sel = null; save(); render();
  document.querySelector(`.blk[data-b="${id}"]`)?.classList.add('pop'); if (gas) toast(`Placé chez ${CAPY[c].name}, et le gaz est appelé avant de creuser ${G.rue(t.site)}.`, 2600); return true;
}
/** Placing a digging job calls the gas operator at the same time (DT-DICT): one gesture, no forgotten chore. */
function autoGas(id: string) { const t = g!.tickets[id]; if (!JOBS[t.job].dig || t.gas) return false; G.toggleGas(g!, id); return true; }
function shake(c: CapyId) { const r = document.querySelector(`.row[data-capy="${c}"]`); r?.classList.remove('shake'); void (r as HTMLElement | null)?.offsetWidth; r?.classList.add('shake'); }
function tapRow(tl: HTMLElement, clientX: number) { if (!sel) return; place(tl.dataset.capy as CapyId, sel, slotAt(tl, clientX)); }
/** Show the per-capy ghosts while dragging, without re-rendering (the dragged element must stay in place). */
function dragGhosts(id: string) { if (!G.avail(g!, id)) return; const t = g!.tickets[id]; const { spots, best } = ghosts(id); const d = today();
  document.querySelectorAll<HTMLElement>('#game .row').forEach((row) => { const c = row.dataset.capy as CapyId; const sp = spots[c]; row.classList.add(G.canDo(c, id, g!) ? 'can' : 'cannot');
    const tl = $('.tl', row); tl.querySelectorAll('.gh,.gtrv,.nojob').forEach((x) => x.remove());
    if (!G.canDo(c, id, g!)) tl.insertAdjacentHTML('beforeend', `<div class="nojob">Pas son métier : ${CAPY[c].name} ${NOJOB[CAPY[c].main]}</div>`);
    else if (sp && !d.plan[c].includes(id) && sp.slot.start < SLOTS) tl.insertAdjacentHTML('beforeend', ghostHtml(sp, best === c, t)); }); }
function startDrag(e: PointerEvent, id: string, from: 'tray' | 'blk', el: HTMLElement) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  drag = { id, from, x: e.clientX, y: e.clientY, ghost: null, el };
  const move = (ev: PointerEvent) => {
    if (!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.ghost) { if (Math.hypot(dx, dy) < 9 || (from === 'tray' && Math.abs(dx) > Math.abs(dy) * 1.2 && ev.pointerType !== 'mouse')) { if (Math.abs(dx) > 14 && from === 'tray') cleanup(); return; }
      const gh = el.cloneNode(true) as HTMLElement; gh.classList.add('ghost'); const r = el.getBoundingClientRect(); gh.style.width = r.width + 'px'; gh.style.height = r.height + 'px'; document.body.appendChild(gh); drag.ghost = gh; sel = id; el.classList.add('dragging'); snd.play('select'); dragGhosts(id);
      try { el.setPointerCapture(ev.pointerId); } catch { /* */ } }
    drag.ghost.style.transform = `translate(${ev.clientX - 30}px, ${ev.clientY - 26}px) rotate(-3deg)`;
    document.querySelectorAll('.row.hover').forEach((r) => r.classList.remove('hover'));
    const over = document.elementsFromPoint(ev.clientX, ev.clientY).find((x) => x.classList.contains('row')); over?.classList.add('hover');
  };
  const upH = (ev: PointerEvent) => {
    const dd = drag; cleanup(); if (!dd?.ghost) return;
    suppressClick = true; setTimeout(() => (suppressClick = false), 60);
    const els = document.elementsFromPoint(ev.clientX, ev.clientY); const row = els.find((x) => x.classList.contains('row')) as HTMLElement | undefined;
    if (row) place(row.dataset.capy as CapyId, dd.id, slotAt($('.tl', row), ev.clientX));
    else if (dd.from === 'blk' && els.some((x) => x.id === 'tray' || x.classList.contains('bottom'))) { G.unassign(g!, dd.id); sel = null; snd.play('click'); save(); render(); }
    else { sel = null; render(); }
  };
  const cleanup = () => { if (drag?.ghost) document.querySelectorAll('#game .row').forEach((r) => { r.classList.remove('can', 'cannot'); r.querySelectorAll('.gh,.gtrv,.nojob').forEach((x) => x.remove()); }); removeEventListener('pointermove', move); removeEventListener('pointerup', upH); removeEventListener('pointercancel', cleanup as never); if (drag?.ghost) drag.ghost.remove(); drag?.el.classList.remove('dragging'); document.querySelectorAll('.row.hover').forEach((r) => r.classList.remove('hover')); drag = null; };
  addEventListener('pointermove', move); addEventListener('pointerup', upH); addEventListener('pointercancel', cleanup as never);
}
function blockMenu(id: string, el: HTMLElement) {
  document.querySelector('.bmenu')?.remove(); const t = g!.tickets[id]; const J = JOBS[t.job];
  const m = document.createElement('div'); m.className = 'bmenu';
  m.innerHTML = `<button data-a="prev" aria-label="Plus tôt">${glyph('left')}</button><button data-a="next" aria-label="Plus tard">${glyph('right')}</button>${J.dig ? `<button data-a="gas">${icon(t.gas ? 'phone' : 'phoneX', 'ic xs')}<span>${t.gas ? 'Gaz OK' : 'Gaz ?'}</span></button>` : ''}<button data-a="info">${glyph('info')}<span>Détails</span></button><button data-a="del" class="del" aria-label="Retirer du planning">${glyph('close')}</button>`;
  document.body.appendChild(m); const r = el.getBoundingClientRect(); const mw = m.offsetWidth;
  m.style.left = Math.max(6, Math.min(innerWidth - mw - 6, r.left + r.width / 2 - mw / 2)) + 'px'; m.style.top = (r.top > 70 ? r.top - 58 : r.bottom + 6) + 'px';
  m.addEventListener('click', (e) => { const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a; if (!a) return; m.remove();
    if (a === 'prev') G.move(g!, id, -1); else if (a === 'next') G.move(g!, id, 1); else if (a === 'gas') G.toggleGas(g!, id); else if (a === 'del') G.unassign(g!, id); else if (a === 'info') { detail(id); return; }
    snd.play('place'); save(); render(); });
  setTimeout(() => addEventListener('pointerdown', function off(ev) { if (!m.contains(ev.target as Node)) { m.remove(); removeEventListener('pointerdown', off, true); } }, true), 0);
}
/** Trade words found in a job's name, with their one-line definition. */
const glossFor = (txt: string) => Object.entries(GLOSSARY).filter(([k]) => txt.toLowerCase().includes(k.toLowerCase())).map(([, v]) => v);
const whoName = (t: Ticket) => t.who.split(' (')[0].split(' · ')[0];
function capyFit(t: Ticket, c: typeof TEAM[number]) { const J = JOBS[t.job]; const r = range(t, c.id);
  if (r === '—') return `<p class="fit no">${c.name} : pas son métier</p>`;
  if (c.main === J.skill) return `<p class="fit">${c.name} : <b>${r} h</b>, c'est son métier</p>`;
  return `<p class="fit">${c.name} le fait aussi, en un peu plus long (<b>${r} h</b>)</p>`; }
function detail(id: string) {
  const t = g!.tickets[id]; const J = JOBS[t.job]; const d = today(); const planned = Object.values(d.plan).flat().includes(id); const ed = editable() || d.replan;
  const gl = glossFor(J.name);
  openOv(`<div class="det"><div class="det-h" style="--c:${SK_COL[J.skill]}">${icon(J.icon, 'ic big')}<div><h2>${J.name}</h2><p>${esc(addr(t))} · ${t.prefet || t.vip ? esc(t.who) : 'chez ' + esc(t.who)}</p></div></div>
    ${gl.map((x) => `<p class="gloss">${glyph('info')}<span>${esc(x)}</span></p>`).join('')}
    <p>${J.desc}</p>${t.vip ? `<p class="vipr">${icon('star', 'ic s')} <b>${VIPS[t.vip].tag}</b> · ${VIPS[t.vip].rule}</p>` : ''}
    <div class="det-g"><div><h3>Qui peut y aller ?</h3>${TEAM.map((c) => capyFit(t, c)).join('')}</div>
    <div><h3>À savoir</h3>${t.risks.length || J.minigame || t.rdv || J.urgent ? '' : '<p class="muted">Rien de spécial : une intervention tranquille.</p>'}
    ${t.rdv ? `<p>${icon('clock', 'ic s')} <b>RDV</b> : arrivée entre ${slotLabel(t.rdv[0])} et ${slotLabel(t.rdv[1])}${t.rdv[0] === t.rdv[1] ? '' : ''}</p>` : ''}${J.urgent ? `<p class="red">${icon('drop', 'ic s')} <b>Urgent</b> : à commencer dans les ${URGENT_TARGET} h après l'appel. Elle perd ${J.leak} m³ par heure.</p>` : ''}
    ${t.risks.map((r) => `<p>${icon(r === 'absent' ? 'clock' : RISKS[r].icon, 'ic s')} <b>${r === 'absent' ? 'Abonné peut-être absent' : RISKS[r].name}</b> · ${RISKS[r].tip} <i>(si ça arrive, tu choisiras quoi faire)</i></p>`).join('')}${J.minigame ? `<p>${icon('search', 'ic s')} <b>Compteur à trouver</b> · trouvé vite, pas de retard ; sinon +1 h</p>` : ''}</div></div>
    ${J.dig ? `<button class="btn ${t.gas ? 'ok' : 'danger'}" id="d-gas">${icon(t.gas ? 'phone' : 'phoneX')}<span>${t.gas ? 'Gaz appelé ✓' : 'Appeler le gaz avant de creuser'}</span></button>` : ''}
    ${J.coupure && t.avail === null ? `<button class="btn" id="d-avis">${icon('mail')}<span>Prévenir les voisins (avis 48 h)</span></button>` : ''}
    <div class="btns">${ed && G.avail(g!, id) ? TEAM.filter((c) => G.canDo(c.id, id, g!)).map((c) => `<button class="btn" data-put="${c.id}">Donner à ${c.name}</button>`).join('') : ''}${ed && planned ? '<button class="btn" id="d-del">Retirer du planning</button>' : ''}<button class="btn primary" id="d-ok">OK</button></div></div>`, 'wide');
  $('#d-ok').onclick = () => { closeOv(); resumeAfterOverlay(); };
  $('#d-gas')?.addEventListener('click', () => { if (!ed && d.phase !== 'plan') { toast('Pendant la tournée, le capy appelle en arrivant.'); return; } G.toggleGas(g!, id); save(); render(); detail(id); });
  $('#d-avis')?.addEventListener('click', () => { G.sendAvis(g!, id); save(); render(); detail(id); snd.play('place'); });
  $('#d-del')?.addEventListener('click', () => { G.unassign(g!, id); save(); closeOv(); render(); });
  document.querySelectorAll<HTMLElement>('[data-put]').forEach((b) => b.addEventListener('click', () => { closeOv(); G.unassign(g!, id); const sp = G.bestSpot(g!, b.dataset.put as CapyId, id); G.assign(g!, b.dataset.put as CapyId, id, sp?.index); autoGas(id); sel = null; snd.play('place'); save(); render(); }));
}
/** Make a planned block blink (alerts « Montrer »). */
function flash(id: string) { const el = document.querySelector<HTMLElement>(`.blk[data-b="${id}"], .tk[data-t="${id}"]`); if (!el) return; el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function showWarnings(launching: boolean) {
  const w = G.warnings(g!); const red = w.some((x) => x.level === 'red'); const block = !G.canLaunch(g!);
  openOv(`<h2>${launching ? 'Avant de lancer…' : 'Ce qui coince'}</h2><ul class="warns">${w.map((x, i) => `<li class="${x.level}">${icon('warn', 'ic s')}<span>${esc(nb(x.text))}</span>${x.id ? `<button class="chip act" data-show="${i}">Montrer</button>` : ''}</li>`).join('')}</ul>
    ${block ? '<p class="red"><b>Sécurité : on ne creuse jamais sans avoir appelé le gaz.</b></p>' : ''}
    <div class="btns">${block ? '<button class="btn primary" id="w-call">Appeler le gaz pour tous</button>' : ''}<button class="btn" id="w-fix">Je corrige</button>${launching && !block ? `<button class="btn ${red ? 'danger' : 'primary'}" id="w-go">Lancer quand même</button>` : ''}</div>`, 'small');
  $('#w-fix').onclick = closeOv;
  document.querySelectorAll<HTMLElement>('[data-show]').forEach((b) => b.addEventListener('click', () => { const x = w[Number(b.dataset.show)]; closeOv(); if (DRAWER.matches && mapOpen) setMap(false); requestAnimationFrame(() => flash(x.id!)); }));
  $('#w-call')?.addEventListener('click', () => { for (const c of TEAM) for (const id of today().plan[c.id]) if (JOBS[g!.tickets[id].job].dig) g!.tickets[id].gas = true; save(); closeOv(); render(); });
  $('#w-go')?.addEventListener('click', () => { closeOv(); doLaunch(); });
}
// ---------------------------------------------------------------- coup de pouce (section 14, P2): once a day, only when the planning drags on
// Sessions are capped (~5 min), so this stays a safety net: it shows up after NUDGE_MS of planning on the same day (from day 2), places ONE ticket.
const NUDGE_MS = 90_000; let planClock: { key: string; t0: number; used: boolean; timer: number } | null = null;
function nudgeReady(tr: string[]) { const d = today(); if (d.day === 0 || d.phase !== 'plan' || tuto() || !tr.some((id) => G.avail(g!, id))) return false;
  const key = `${g!.seed}:${d.day}`; if (planClock?.key !== key) { if (planClock) clearTimeout(planClock.timer); planClock = { key, t0: performance.now(), used: false, timer: window.setTimeout(() => { if (g?.today && today().phase === 'plan') render(); }, NUDGE_MS + 50) }; }
  return !planClock.used && performance.now() - planClock.t0 >= NUDGE_MS; }
const nudgeHtml = (tr: string[]) => (nudgeReady(tr) ? `<button class="nudge" id="p-nudge" title="Une fois par jour, quand la préparation traîne">${icon('star', 'ic')}<b>Coup de pouce</b><span>Je place le plus pressé pour toi</span></button>` : '');
function nudge() { const tr = G.tray(g!).filter((id) => G.avail(g!, id)); if (!tr.length || !planClock) return;
  const rank = (id: string) => { const t = g!.tickets[id]; const J = JOBS[t.job]; return (J.urgent ? 0 : t.rdv ? 10 : J.leak ? 20 : 30) - (J.leak ?? 0); };
  for (const id of [...tr].sort((a, b) => rank(a) - rank(b))) { const { spots, best } = ghosts(id); if (!best) continue; const sp = spots[best]!;
    G.assign(g!, best, id, sp.index); autoGas(id); planClock.used = true; save(); snd.play('place'); render(); document.querySelector(`.blk[data-b="${id}"]`)?.classList.add('pop');
    toast(`Coup de pouce : ${THE[g!.tickets[id].job] ?? 'le ticket'} va à ${CAPY[best].name}.`, 3000); return; }
  toast('Pas de place évidente : à toi de jouer.', 2500); }
function launchDay() {
  const d = today(); sel = null;
  if (d.phase === 'run') { d.replan = false; pauseMsg = ''; save(); play(); return; }
  if (!Object.values(d.plan).some((q) => q.length)) { toast('Place au moins un ticket sur une ligne de capy.'); snd.play('invalid'); return; }
  const w = G.warnings(g!); if (w.some((x) => x.level === 'red') || !G.canLaunch(g!)) { showWarnings(true); return; }
  doLaunch();
}
function doLaunch() { keepMorning(); autoSkip = true; G.launch(g!); save(); snd.play('horn'); snd.music(1); play(); }

// ---------------------------------------------------------------- resolution loop
function stop() { running = false; skipping = false; clearTimeout(timer); }
function play() { const d = g?.today; if (!d || d.phase !== 'run') return; running = true; skipping = autoSkip && g!.day > 0; render(); schedule(); }
function schedule() { clearTimeout(timer); if (!running) return; timer = window.setTimeout(tick, skipping ? 160 : speed === 2 ? 620 : 1300); }
function tick() {
  if (!g?.today || !running) return; const d = today(); if (d.phase !== 'run') return;
  if (d.pending.length) { showPending(); return; }
  const before = { slot: d.slot, done: d.done.length };
  G.step(g); save(); afterStep(before);
}
function afterStep(before: { slot: number; done: number }) {
  const d = g!.today!; const ms = skipping ? 140 : speed === 2 ? 520 : 1000;
  for (const c of TEAM) { const cr = d.capys[c.id]; const tgt = cr.job ?? cr.target; if (tgt && (cr.job || cr.travel === 0 || d.sub === 'mid')) mv?.moveCapy(c.id, SITES[g!.tickets[tgt].site].node, ms); }
  const fresh = d.done.slice(before.done); if (fresh.length) snd.play('match');
  if (before.slot === LUNCH_AFTER - 1 && d.slot === LUNCH_AFTER && !skipping) toast(LUNCH_LABEL, 1400);
  if (d.phase === 'close') { stop(); render(); celebrate(fresh); setTimeout(() => replayDay(), 600); return; }
  render(); celebrate(fresh);
  if (d.pending.length) { stop(); showPending(); return; }
  schedule();
}
// ---------------------------------------------------------------- game feel: « Réparé ! » stamp, the capy's bubble, a star flying to the yield gauge
const calmNow = () => !!S.settings.calm || matchMedia('(prefers-reduced-motion: reduce)').matches;
const STAMP: Record<JobId, string> = { fuite_bt: 'Réparé !', fuite_pc: 'Réparé !', poteau: 'Fermé !', fontaine: 'Réparé !', coupure: 'Réparé !', purge: 'Eau claire !', prc: 'Posé !', introuvable: 'Trouvé !', resilie: 'Réglé !', debit_nuit: 'Trouvé !' };
const QUIPS = ['Et voilà !', 'Au suivant !', 'Nickel.', 'Du travail propre.', 'Pas de souci.'], WET = ['Plus une goutte !', 'Ça ne coule plus.', 'Et voilà !'];
function fxAt(el: Element | null, cls: string, text: string, ms: number) { if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width) return null;
  const f = document.createElement('div'); f.className = `fx ${cls}`; f.textContent = text; f.style.left = `${r.left + r.width / 2}px`; f.style.top = `${r.top + r.height / 2}px`; document.body.appendChild(f); setTimeout(() => f.remove(), ms); return f; }
function flyStar(from: Element | null, to: Element | null) { if (!from || !to) return; const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(); if (!a.width || !b.width) return;
  const f = document.createElement('div'); f.className = 'fx fly'; f.innerHTML = ICONS.star; f.style.left = `${a.left + a.width / 2}px`; f.style.top = `${a.top + a.height / 2}px`; document.body.appendChild(f);
  const dx = b.left + b.width / 2 - a.left - a.width / 2, dy = b.top + b.height / 2 - a.top - a.height / 2;
  const an = f.animate([{ transform: 'translate(-50%,-50%) scale(1.2)' }, { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 40}px)) scale(1)`, offset: 0.5 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: 0.4 }], { duration: 850, easing: 'ease-in' });
  an.onfinish = () => { f.remove(); snd.play('star'); to.classList.remove('kup'); void (to as HTMLElement).offsetWidth; to.classList.add('kup'); }; }
function celebrate(ids: string[]) { if (!ids.length || calmNow() || skipping) return;
  ids.forEach((id, i) => { const t = g!.tickets[id]; const blk = document.querySelector(`#game .blk[data-d="${id}"]`); fxAt(blk, 'stamp', STAMP[t.job], 1500);
    const capy = (Object.keys(today().hist) as CapyId[]).find((k) => today().hist[k].some(([x]) => x === id));
    if (capy) fxAt(document.querySelector(`#game .row[data-capy="${capy}"] .hd`), 'say', ((JOBS[t.job].leak ? WET : QUIPS)[(t.num + i) % (JOBS[t.job].leak ? WET : QUIPS).length]), 1700);
    if (JOBS[t.job].leak || JOBS[t.job].fix) setTimeout(() => flyStar(blk, document.querySelector('#t-y')), 250 + i * 200); }); }
/** A little party when the hidden meter is found. */
function party(el: Element | null) { if (!el || calmNow()) return; const f = fxAt(el, 'confetti', '', 1300); if (!f) return; const cols = ['#F5B82E', '#E5507A', '#2BA6A0', '#7BB82E', '#3B7BD9'];
  for (let i = 0; i < 22; i++) { const c = document.createElement('i'); const a = (i / 22) * Math.PI * 2; const r = 70 + (i * 37) % 60;
    c.style.cssText = `background:${cols[i % cols.length]};--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r + 30)}px;--r:${(i * 97) % 360}deg`; f.appendChild(c); } }
function skipToDecision() { autoSkip = true; skipping = true; running = true; render(); schedule(); }

// ---------------------------------------------------------------- cards
function showPending() {
  const d = today(); const p = d.pending[0]; if (!p) { play(); return; }
  stop(); render();
  if (p.kind === 'mini') { miniGame(p.ticket!, p.capy!); return; }
  const c = G.cardOf(p); const t = p.ticket ? g!.tickets[p.ticket] : null;
  const w: Who = c.who === 'capy' ? (p.capy ?? 'capy') : (c.who as Who);
  snd.play(p.kind === 'safety' || c.choices.some((x) => x.fx.addTicket && JOBS[x.fx.addTicket].urgent) ? 'alert' : 'card');
  const ci = G.createIndex(c); if (p.kind === 'event' && ci >= 0) { whoDrops(p, c, ci); return; }
  const ctx = [p.capy ? CAPY[p.capy].name : '', t ? `${JOBS[t.job].short}, ${addr(t)}` : '', slotLabel(Math.min(d.slot, SLOTS - 1))].filter(Boolean).join(' · ');
  openOv(`<div class="ecard${p.kind === 'safety' ? ' safety' : ''}"><div class="e-art">${who(w)}</div><div class="e-body"><p class="kicker">${esc(ctx)}</p><h2>${c.title}</h2><p>${c.text}</p>
    <div class="choices">${c.choices.map((ch, i) => `<button class="choice" data-i="${i}"><b>${ch.label}</b><span class="fxs">${hintHtml(ch.hint)}</span>${expert() ? `<span class="xfx">${exactFx(ch.fx)}</span>` : ''}</button>`).join('')}</div></div></div>`, 'wide');
  document.querySelectorAll<HTMLElement>('.choice').forEach((b) => b.addEventListener('click', () => {
    const nt = G.choose(g!, Number(b.dataset.i)); snd.play('click'); save(); closeOv();
    if (p.capy && t) { const cr = today().capys[p.capy]; if (!cr.job && !cr.travel) mv?.moveCapy(p.capy, SITES[t.site].node); }
    if (nt) { const J = JOBS[nt.job]; today().replan = true; sel = nt.id; render(); mv?.focus(nt.site); pauseMsg = `Pause ! Place ${THE[J.id] ?? 'le nouveau ticket'}, puis ▶`; render(); snd.play(J.urgent ? 'alert' : 'select'); return; }
    if (today().pending.length) showPending(); else play();
  }));
}
/** « Qui lâche quoi ? » (mockup 03): a call that creates a ticket offers concrete moves, each with its cost in m³ and in mood. */
function whoDrops(p: G.Pending, c: ReturnType<typeof G.cardOf>, ci: number) {
  const d = today(); const opts = G.dispatchOptions(g!, ci); const ch = c.choices[ci]; const J = JOBS[ch.fx.addTicket!];
  // only one real way to do it: no window, the ticket is created where it goes and highlighted (section 14: a surprise is a real choice or a plain notification)
  if (opts.length + c.choices.length - 1 < 2 && !tuto()) { const o = opts[0]; const nt = o ? G.dispatch(g!, ci, o) : G.choose(g!, ci); snd.play(J.urgent ? 'alert' : 'place'); save();
    if (nt && o) { autoGas(nt.id); render(); document.querySelector(`.blk[data-b="${nt.id}"]`)?.classList.add('pop'); mv?.focus(nt.site); toast(`${c.title} : ${CAPY[o.capy].name} s'en charge, arrivée à ${slotShort(Math.min(o.start, SLOTS - 1))}.`, 3200); }
    else if (nt) { today().replan = true; sel = nt.id; render(); mv?.focus(nt.site); pauseMsg = `Pause ! Place ${THE[nt.job] ?? 'le nouveau ticket'}, puis ▶`; render(); return; }
    if (today().pending.length) showPending(); else play(); return; }
  const nm = (id: string | null) => (id ? THE[g!.tickets[id].job] ?? 'son ticket' : ''); const wn = (id: string) => whoName(g!.tickets[id]);
  const end = (e: number) => (e > SLOTS ? 'demain' : slotEnd(e - 1, true));
  const row = (o: G.Dispatch) => { const n = CAPY[o.capy].name;
    const title = o.kind === 'rush' ? (o.skip ? `${n} laisse ${nm(o.skip)} et fonce` : o.prev ? `${n} finit ${nm(o.prev)} et fonce` : `${n} fonce`)
      : o.kind === 'after' ? `${n} y va après ${nm(o.prev) || 'sa pause'}` : (d.plan[o.capy].length ? `On finit ce qu’on a, ${n} y va à ${slotShort(Math.min(o.start, SLOTS - 1))}` : `${n} y va à ${slotShort(Math.min(o.start, SLOTS - 1))}`);
    const bits = [o.start >= SLOTS ? 'Personne avant demain' : `Arrive à ${slotShort(o.start)}${o.travel ? ` (route ${o.travel} h)` : ''}${o.kind !== 'rush' ? `, finit à ${end(o.end)}` : ''}`];
    if (o.slower) bits.push(`plus lent${o.capy === 'momo' ? '' : 'e'} hors de son métier (+1 h)`);
    for (const id of o.over) bits.push(`${nm(id)} reportée à demain${g!.tickets[id].rdv ? `, ${wn(id)} râle` : ''}`);
    for (const id of o.late) bits.push(`RDV de ${wn(id)} en retard`);
    if (!o.over.length && !o.late.length && o.kind === 'end' && J.leak) bits.push(`l'eau coule jusqu'à ${end(o.end)}`);
    const m3c = J.leak ? `<span class="pill ${o.m3 <= opts[0].m3 ? 'g' : o.m3 > opts[0].m3 * 2 ? 'r' : 'o'}">${Math.round(o.m3)} m³</span>` : '';
    const satc = `<span class="pill ${o.sat < 0 ? 'r' : o.sat > 0 ? 'g' : ''}">${icon('heart', 'ic xs')}${o.sat > 0 ? '+' : o.sat < 0 ? '−' : ''}${Math.abs(o.sat)}</span>`;
    const bar = `<span class="mbar" aria-hidden="true">${o.bar.map((k) => `<i class="${k ? `k-${k}` : ''}"></i>`).join('')}</span>`;
    return `<button class="choice dch" data-c="${o.capy}" data-x="${o.index}"><span class="dc-t"><b>${esc(title)}</b><small>${esc(nb(bits.join(' · ')))}</small>${bar}</span><span class="dc-r">${m3c}${satc}</span></button>`; };
  const others = c.choices.map((x, i) => ({ x, i })).filter(({ i }) => i !== ci).map(({ x, i }) => `<button class="choice dch alt" data-i="${i}"><span class="dc-t"><b>${x.label}</b><small>${hintHtml(x.hint)}</small></span></button>`).join('');
  const can = TEAM.filter((k) => slotsFor(k, J) !== null).map((k) => k.name); const canTxt = can.length > 1 ? `${can.slice(0, -1).join(', ')} et ${can.at(-1)} savent faire.` : `${can[0]} sait faire.`;
  const lead = J.leak ? `${J.leak} m³ perdus par heure` : J.urgent ? 'urgent' : ch.fx.addRdvSoon ? 'RDV dans les 2 h' : '';
  openOv(`<div class="ecard drop"><div class="e-art">${who(c.who === 'capy' ? (p.capy ?? 'capy') : (c.who as Who))}</div><div class="e-body"><p class="kicker">${esc([slotShort(Math.min(d.slot, SLOTS - 1)), lead].filter(Boolean).join(' · '))}</p><h2>Le téléphone sonne : ${c.title.replace(/^./, (m) => m.toLowerCase())}</h2>
    <p>${c.text} ${canTxt} <b>Qui lâche quoi ?</b></p>${tuto() ? `<p class="tuto"><b class="cstep">6/6</b> Un appel en pleine journée : choisis qui lâche son ticket. La première ligne perd le moins d’eau, la barre montre la journée du capy.</p>` : ''}
    <div class="choices">${opts.map(row).join('')}${others}</div>
    <div class="dc-ft"><span>Le temps est arrêté : tu peux aussi placer le ticket à la main.</span><button class="btn" id="dc-plan">Voir le planning</button></div></div></div>`, 'wide drop-ov');
  const after = (nt: G.Ticket | null, placed: boolean) => { snd.play('place'); save(); closeOv();
    if (nt && !placed) { today().replan = true; sel = nt.id; render(); mv?.focus(nt.site); pauseMsg = `Pause ! Place ${THE[nt.job] ?? 'le nouveau ticket'}, puis ▶`; render(); return; }
    if (nt && placed) { today().replan = false; autoGas(nt.id); render(); const blk = document.querySelector(`.blk[data-b="${nt.id}"]`); blk?.classList.add('pop'); }
    if (today().pending.length) showPending(); else play(); };
  document.querySelectorAll<HTMLElement>('.dch[data-c]').forEach((b) => b.addEventListener('click', () => { const nt = G.dispatch(g!, ci, { capy: b.dataset.c as CapyId, index: +b.dataset.x! }); after(nt, true); }));
  document.querySelectorAll<HTMLElement>('.dch[data-i]').forEach((b) => b.addEventListener('click', () => { const nt = G.choose(g!, +b.dataset.i!); after(nt, false); }));
  $('#dc-plan').onclick = () => { const nt = G.choose(g!, ci); after(nt, false); };
}
function miniGame(id: string, capy: CapyId) {
  const t = g!.tickets[id]; const f = facade(t.num * 131 + t.site); let wrong = 0, hint = false, done = false; const missed = new Set<number>();
  const draw = () => {
    openOv(`<div class="mini-l"><div class="facade">${f.svg.replace('</svg>', (done ? meterSvg(f.spots[f.meter]) : '') + '</svg>')}${f.spots.map((s) => `<button class="spot${hint && !f.hintSpots.includes(s.id) ? ' dim' : ''}${missed.has(s.id) ? ' miss' : ''}" ${missed.has(s.id) ? 'disabled ' : ''}data-s="${s.id}" style="left:${(s.x / 400) * 100}%;top:${(s.y / 240) * 100}%;width:${((s.r * 2.2) / 400) * 100}%" aria-label="Chercher ici"></button>`).join('')}</div></div>
      <div class="mini-r"><p class="kicker">${CAPY[capy].name} · ${esc(addr(t))}</p><h2>Trouver le compteur</h2>
        <div class="say" id="say">${done ? '' : 'Où se cache le compteur ? Touche la façade. Pas de chrono.'}</div>
        <div class="mini-k"><span>Ratés</span><b>${wrong}</b>${hint ? '<em>plan regardé</em>' : ''}</div>
        <p class="rule">Trouve-le en deux essais et ${CAPY[capy].name} ne perd pas de temps. (Regarder le plan compte pour un essai.)</p>
        <div class="col">${done ? '' : `<button class="btn" id="mg-hint" ${hint ? 'disabled' : ''}>${icon('search')}<span>Regarder le plan</span></button><button class="btn" id="mg-auto">Laisser faire ${CAPY[capy].name} <small>+1 h</small></button>`}</div></div>
`, 'wide mini');
    document.querySelectorAll<HTMLButtonElement>('.spot').forEach((b) => b.addEventListener('click', () => {
      if (done) return; const s = Number(b.dataset.s);
      if (s === f.meter) { done = true; snd.play('win'); const extra = miniScore(wrong, hint); draw(); party(document.querySelector('.facade')); $('#say').innerHTML = `<b>Trouvé ${foundText(f.spots[s].kind)} !</b> ${extra ? 'Ça a pris un peu de temps : +1 h.' : 'Pile à l’heure, bravo !'}`; setTimeout(() => finish(extra, `a trouvé le compteur ${foundText(f.spots[s].kind)}`), 1500); }
      else { wrong++; missed.add(s); snd.play('invalid'); b.classList.add('miss'); b.disabled = true; $('#say').textContent = wrongText(f, s, t.num); const k = $('.mini-k b'); if (k) k.textContent = String(wrong); }
    }));
    $('#mg-hint')?.addEventListener('click', () => { hint = true; snd.play('hint'); draw(); $('#say').textContent = f.hint; });
    $('#mg-auto')?.addEventListener('click', () => finish(1, 'a cherché le compteur tout seul (+1 h)'));
  };
  const finish = (extra: 0 | 1, how: string) => { G.miniResult(g!, extra, how); save(); closeOv(); render(); if (today().pending.length) showPending(); else play(); };
  draw();
}

// ---------------------------------------------------------------- map
function mapUpdate() {
  if (!mv || !g?.today) return; const d = today(); const pins: Pin[] = []; const order = new Map<string, { c: CapyId; n: number }>();
  for (const c of TEAM) d.plan[c.id].forEach((id, i) => order.set(id, { c: c.id, n: i + 1 }));
  const running = new Map(TEAM.filter((c) => d.capys[c.id].job).map((c) => [d.capys[c.id].job!, c.id]));
  for (const id of g.pile) { const t = g.tickets[id]; const J = JOBS[t.job]; if (d.postponed.includes(id)) continue; const o = order.get(id); const rn = running.get(id);
    pins.push({ id, site: t.site, icon: J.icon, color: G.avail(g, id) ? SK_COL[J.skill] : '#B9AFA2', urgent: !!J.urgent, badge: o ? { color: CAPY[o.c].color, n: o.n } : rn ? { color: CAPY[rn].color, n: 0 } : undefined, state: o || rn ? 'planned' : G.avail(g, id) ? 'open' : 'wait', selected: sel === id }); }
  for (const id of d.done) { const t = g.tickets[id]; if (t) pins.push({ id, site: t.site, icon: JOBS[t.job].icon, color: '#BFD9B0', urgent: false, state: 'done', selected: false }); }
  mv.setPins(pins);
  const routes: Route[] = TEAM.map((c) => { const cr = d.capys[c.id]; const start = cr.job ? SITES[g!.tickets[cr.job].site].node : cr.pos; const nodes = [start];
    if (cr.travel && cr.target) nodes.push(SITES[g!.tickets[cr.target].site].node);
    for (const id of d.plan[c.id]) nodes.push(SITES[g!.tickets[id].site].node); return { color: c.color, nodes }; });
  mv.setRoutes(routes);
}

// ---------------------------------------------------------------- day close & campaign end
const ptText = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')}\u202Fpt`;
let closeReplay = false; const reopenClose = () => { closeReplay = true; closeScreen(); };
function closeScreen() {
  stopReplay(); startHindsight(); const d = today(); const spec = DAYS_SPEC[d.day]; snd.music(0); if (!closeReplay) snd.play(d.stars ? 'win' : 'lose');
  const dsat = Math.round(g!.sat - d.satStart); const yw = G.yieldWhy(g!); const dy = (yw.y1 - yw.y0) * 100; const lost = Math.round(d.m3 + d.night);
  const last = d.day + 1 >= DAYS; const next = last ? 'Le pot du vendredi' : `Au lit ! ${WEEKDAYS[(d.day + 1) % 5]}`;
  const tile = (id: string, v: string, l: string, cls = '') => `<button class="ctile ${cls}" id="${id}"><b>${v}</b><span>${l}</span></button>`;
  const row = (ic: string, v: string, l: string) => `<div>${icon(ic, 'ic s')}<b>${v}</b><span>${l}</span></div>`;
  openOv(`<div class="close v2"><div class="c-main"><div class="c-top">
      <div class="c-head"><div><p class="kicker">${DAY_END} · ${esc(dayName(d.day))}</p><h2>On range les fourgons</h2></div><div class="c-me">${me()}</div></div>
      <div class="stars">${[0, 1, 2].map((i) => `<span class="st${i < d.stars! ? ' on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">${ICONS[i < d.stars! ? 'star' : 'starOff']}</span>`).join('')}</div>
      <p class="c-quote">« ${esc(nb(G.dayLine(g!)))} »</p>
      </div><div class="c-side"><ul class="objs">${spec.objs.map((o, i) => { const v = G.objValue(g!, o); return `<li class="${d.met![i] ? 'ok' : 'ko'}">${glyph(d.met![i] ? 'check' : 'cross')} <span>${objText(o)}${!d.met![i] && v ? ` <em>(${v})</em>` : ''}</span></li>`; }).join('')}</ul>
      ${tuto() && G.tray(g!).length ? '<p class="tuto">Ce qui reste dans le bac attend demain : chaque soir d’attente coûte 1 point d’abonnés (pastille orange J+1).</p>' : ''}
      ${d.incidents ? '<p class="red"><b>On a creusé sans appeler le gaz</b> : pas plus d’une étoile aujourd’hui.</p>' : ''}
      <div class="ctiles">${tile('c-y', ptText(dy), 'rendement de réseau', dy >= 0 ? 'up' : 'down')}${tile('c-m3', `${lost} m³`, d.night ? 'perdus (avec la nuit)' : 'perdus aujourd’hui', 'm3')}</div>
      <div class="hs" id="c-fix" aria-live="polite">${fixHtml()}</div>
      </div>
      <div class="c-more" id="c-det" hidden><div class="kpis">${row('van', String(d.done.length), 'tickets traités')}${row('clock', `${d.rdvKept.length}/${d.rdvToday.length}`, 'RDV tenus')}
        ${row('heart', `${Math.round(g!.sat)} (${dsat >= 0 ? '+' : ''}${dsat})`, 'abonnés')}${row('lane', `${d.travel} h`, 'de route')}</div>
        <div class="log">${d.log.map((l) => `<p>${esc(nb(l))}</p>`).join('')}</div></div>
      <div class="btns">${calmNow() ? '' : `<button class="btn" id="c-film" title="Revoir le film de la journée">${icon('van', 'ic s')}<span>Le film</span></button>`}<button class="btn" id="c-more" aria-expanded="false" aria-controls="c-det"><span>Détails</span><i class="arr">${glyph('right')}</i></button><button class="btn primary" id="c-next">${next} ${glyph('right')}</button></div></div></div>`, 'wide close-ov');
  fillNames($('#card'));
  if (closeReplay) { $('#card').classList.add('noanim'); closeReplay = false; }
  bindFix(); $('#c-film')?.addEventListener('click', () => replayDay(true));
  $('#c-y').onclick = () => explain('y', reopenClose); $('#c-m3').onclick = () => explain('m3', reopenClose);
  $('#c-more').onclick = () => { const det = $('#c-det'); const open = det.hidden; det.hidden = !open; $('#c-more').setAttribute('aria-expanded', String(open)); if (open) det.scrollIntoView({ block: 'nearest' }); };
  $('#c-next').onclick = () => { clearGhost(); if (!S.seenTuto) { S.seenTuto = true; } G.nextDay(g!); sel = null; save(); closeOv(); if (g!.over) bilan(); else { mv?.resetCapys(); for (const c of TEAM) mv?.moveCapy(c.id, today().capys[c.id].pos); render(); briefing(); } };
}
// ---------------------------------------------------------------- « Le film de la journée » + « Si c'était à refaire » (end-of-day replay)
// At launch the morning is kept (memory + one localStorage write, not in the main save). At closing, a 3–4 s sweep replays the day
// on the planning (blocks, trips, what went wrong, tappable), the vans move on the map, then the close card lists at most 3 moves
// taken from a better day that the real rules played from the same morning (src/hindsight.ts), searched in small chunks meanwhile.
const M0 = KEY + '-m0'; const dkey = () => `${g!.seed}:${today().day}`;
let morning: { key: string; g: Game } | null = null;
function keepMorning() { morning = { key: dkey(), g: structuredClone(g!) }; try { localStorage.setItem(M0, JSON.stringify(morning)); } catch { /* storage full: the film still plays, without the lesson */ } }
function forgetMorning() { morning = null; hs = null; try { localStorage.removeItem(M0); } catch { /* ignore */ } }
function morningOf(): Game | null { const k = dkey(); if (morning?.key === k) return morning.g;
  try { const m = JSON.parse(localStorage.getItem(M0) ?? 'null'); if (m?.key === k && m.g?.today && m.g.today.day === today().day && m.g.today.phase !== 'close') { morning = m; return m.g; } } catch { /* ignore */ } return null; }
let hs: { key: string; res: H.Hindsight | null; busy: boolean } | null = null;
function startHindsight() { const k = dkey(); if (hs?.key === k) return; const d = today(); if (d.phase !== 'close') return;
  if (d.stars === 3) { hs = { key: k, res: { stars: 3, fixes: [], best: null }, busy: false }; return; }
  const m0 = morningOf(); if (!m0) { hs = { key: k, res: null, busy: false }; return; }
  const end = structuredClone(g!); const it = H.searchDay(m0, 48); const job: NonNullable<typeof hs> = { key: k, res: null, busy: true }; hs = job;
  const run = () => { if (hs !== job) return; const t = performance.now(); let r = it.next(); while (!r.done && performance.now() - t < 10) r = it.next();
    if (!r.done) { setTimeout(run, 20); return; } job.busy = false; job.res = H.explain(end, r.value); refreshFix(); };
  setTimeout(run, 40); }
const FIX_IC: Record<H.FixKind, string> = { rdv: 'clock', urgent: 'warn', left: 'basket', travel: 'van', leak: 'drop', yield: 'drop', sat: 'heart', gas: 'phone', vip: 'star', card: 'sticker' };
function fixHtml() { const d = today();
  if (d.stars === 3) return `<p class="hs-perfect">${icon('star', 'ic s')}<span><b>Journée parfaite !</b> Rien à rembobiner.</span></p>`;
  if (!hs || (!hs.busy && !hs.res)) return '';
  if (hs.busy) return `<p class="hs-wait"><i class="hs-spin"></i>Le chef rembobine la journée…</p>`;
  const r = hs.res!; if (!r.fixes.length) return `<p class="hs-none">On a rejoué la journée 48 fois : pas mieux. Elle était coriace !</p>`;
  return `<p class="hs-lead"><b>Si c’était à refaire</b> · une journée à ${r.stars}\u202F★ était possible :</p><ul class="hs-list">${r.fixes.map((f, i) => `<li><button class="hs-it${f.capy ? ' go' : ''}" data-fix="${i}">${icon(FIX_IC[f.kind], 'ic s')}<span>${esc(nb(f.text)).replace(/(\d+) h (\d+)/g, '$1\u00A0h\u00A0$2')}</span>${f.capy ? `<i>${glyph('right')}</i>` : ''}</button></li>`).join('')}</ul>`; }
function refreshFix() { const el = document.querySelector('#c-fix'); if (!el || !$('#ov').classList.contains('show')) return; el.innerHTML = fixHtml(); bindFix(); }
function bindFix() { document.querySelectorAll<HTMLElement>('[data-fix]').forEach((b) => b.addEventListener('click', () => { const f = hs?.res?.fixes[Number(b.dataset.fix)]; if (!f) return; snd.play('click');
  if (!f.capy || !hs?.res?.best) { toast(f.text, 4200); return; } closeOv(); showGhost(f, hs.res.best); })); }
/** Show where the better day put the job (dashed ghost on the planning), with a way back to the close card. */
function showGhost(f: H.Fix, best: Game) { clearGhost(); const tl = document.querySelector<HTMLElement>(`#game .tl[data-capy="${f.capy}"]`); if (!tl) return;
  const B = best.today!; const list = f.ticket ? [[f.ticket, f.at!, f.end!] as [string, number, number]] : B.hist[f.capy!];
  for (const [id, s0, e0] of list) { const J = JOBS[(best.tickets[id] ?? g!.tickets[id]).job];
    tl.insertAdjacentHTML('beforeend', `<div class="hs-ghost" style="left:${xs(s0)}%;width:${xe(e0) - xs(s0)}%;--c:${SK_COL[J.skill]}">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div>`); }
  tl.closest('.row')?.classList.add('hs-row'); tl.scrollIntoView({ block: 'nearest' });
  $('#game .panel').insertAdjacentHTML('beforeend', `<div class="hs-bar"><span>${esc(nb(f.text))}</span><button class="btn small primary" id="hs-back">Retour au bilan</button></div>`);
  $('#hs-back').onclick = () => { snd.play('click'); clearGhost(); reopenClose(); }; }
function clearGhost() { document.querySelectorAll('.hs-ghost,.hs-bar').forEach((x) => x.remove()); document.querySelectorAll('.hs-row').forEach((x) => x.classList.remove('hs-row')); }
interface Mark { capy: CapyId | null; at: number; label: string; text: string; ic: string }
function marks(): Mark[] { const d = today(); const out: Mark[] = []; const T = (id: string) => g!.tickets[id]; const whoT = (t: Ticket) => t.who.split(' (')[0].split(' · ')[0];
  const where = (id: string) => { for (const c of TEAM) { const h = d.hist[c.id].find((x) => x[0] === id); if (h) return { capy: c.id, at: h[1] }; } return null; };
  for (const id of new Set([...d.rdvMissed, ...d.rdvToday.filter((x) => !d.rdvKept.includes(x) && !d.absentOk.includes(x))])) { const t = T(id); const w = where(id); if (!t.rdv) continue;
    out.push({ capy: w?.capy ?? null, at: w?.at ?? t.rdv[0], label: 'RDV raté', ic: 'clock', text: w ? `RDV de ${whoT(t)} (${rdvText(t.rdv)}) : ${CAPY[w.capy].name} n’y était qu’à ${slotLabel(w.at)}.` : `RDV de ${whoT(t)} (${rdvText(t.rdv)}) : personne n’y est allé.` }); }
  for (const [id, h] of Object.entries(d.urgent)) if (h > URGENT_TARGET) { const w = where(id); out.push({ capy: w?.capy ?? null, at: w?.at ?? 0, label: 'Urgence en retard', ic: 'warn', text: `${JOBS[T(id).job].short} ${G.rue(T(id).site)} : commencée ${h} h après l’appel (le but : ${URGENT_TARGET} h).` }); }
  for (const id of g!.pile) if (JOBS[T(id).job].urgent && G.avail(g!, id) && d.urgent[id] === undefined) out.push({ capy: null, at: SLOTS, label: 'Urgence pas commencée', ic: 'warn', text: `${JOBS[T(id).job].short} ${G.rue(T(id).site)} : personne n’a commencé.` });
  for (const c of TEAM) for (const [id, s0] of d.hist[c.id]) { const t = T(id); if (JOBS[t.job].dig && !t.gas) out.push({ capy: c.id, at: s0, label: 'Sans le gaz !', ic: 'phoneX', text: `${CAPY[c.id].name} a creusé ${G.rue(t.site)} sans appeler le gaz : une étoile maximum.` }); }
  for (const [id, k] of Object.entries(d.vip ?? {})) { const v = T(id).vip; if (!v || !VIPS[v][k].star) continue; const w = where(id); out.push({ capy: w?.capy ?? null, at: w?.at ?? SLOTS, label: `${VIPS[v].tag} fâché`, ic: 'star', text: VIPS[v][k].log }); }
  const missTravel = DAYS_SPEC[d.day].objs.some((o, j) => o.id === 'travel' && !d.met![j]);
  for (const [c, s0, n, id] of d.trips ?? []) if (n >= 2 || (missTravel && n >= 1)) out.push({ capy: c, at: s0, label: `${n} h de route`, ic: 'van', text: `${CAPY[c].name} : ${n} h de route jusqu’à ${G.rue(T(id).site)}.` });
  const left = g!.pile.filter((id) => G.avail(g!, id) && G.waitCosts(T(id)) && !JOBS[T(id).job].urgent).length;
  if (left) out.push({ capy: null, at: SLOTS, label: `${left} attend${left > 1 ? 'ent' : ''} demain`, ic: 'basket', text: `${left} ticket${left > 1 ? 's' : ''} dans le bac : chaque soir d’attente coûte 1 point d’abonnés.` });
  return out; }
let rp: { timers: number[] } | null = null;
function stopReplay() { if (!rp) return; rp.timers.forEach(clearTimeout); rp = null; document.querySelectorAll('.rp-ban,.rp-sw,.rp-trip,.rp-mk').forEach((x) => x.remove()); document.querySelectorAll('#game .tl.rp').forEach((x) => x.classList.remove('rp')); document.querySelector('#game .panel')?.classList.remove('rp-on'); }
function replayDay(again = false) {
  const d = g?.today; if (!d || d.phase !== 'close') return; startHindsight(); clearGhost();
  if (calmNow() || !$('#game .panel')) { if (again) reopenClose(); else closeScreen(); return; }
  closeOv(); stopReplay(); render(); const perfect = d.stars === 3; const T = perfect ? 2600 : 3800; const at = (s: number) => Math.round((xs(Math.min(s, SLOTS)) / 100) * T);
  const ms = marks(); const timers: number[] = []; rp = { timers }; const later = (fn: () => void, t: number) => timers.push(window.setTimeout(fn, t));
  const p = $('#game .panel'); p.classList.add('rp-on');
  p.insertAdjacentHTML('beforeend', `<div class="rp-ban" role="status">${icon('van', 'ic s')}<b>${perfect ? 'Le film d’une journée parfaite' : 'Le film de la journée'}</b><span class="rp-chips"></span><button class="btn small" id="rp-skip">Passer ${glyph('right')}</button></div>`);
  document.querySelectorAll<HTMLElement>('#game .tl[data-capy]').forEach((tl) => { const c = tl.dataset.capy as CapyId; let h = '';
    for (const [cc, s0, n] of d.trips ?? []) if (cc === c && s0 < SLOTS) h += `<div class="rp-trip" style="left:${xs(s0)}%;width:${xe(Math.min(s0 + n, SLOTS)) - xs(s0)}%;animation-delay:${at(s0)}ms"></div>`;
    h += `<div class="rp-sw" style="animation-duration:${T}ms"></div>`;
    ms.forEach((m, i) => { if (m.capy === c) h += `<button class="rp-mk" data-mk="${i}" style="left:${xs(Math.min(m.at, SLOTS - 1))}%;animation-delay:${at(m.at)}ms">${icon(m.ic, 'ic xs')}<span>${esc(m.label)}</span></button>`; });
    tl.classList.add('rp'); tl.insertAdjacentHTML('beforeend', h); });
  const chips = $('.rp-chips', p); ms.forEach((m, i) => { if (!m.capy) chips.insertAdjacentHTML('beforeend', `<button class="rp-mk flat" data-mk="${i}" style="animation-delay:${T}ms">${icon(m.ic, 'ic xs')}<span>${esc(m.label)}</span></button>`); });
  p.querySelectorAll<HTMLElement>('[data-mk]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); snd.play('click'); toast(ms[Number(b.dataset.mk)].text, 3600); }));
  // the vans drive the day again, marks ping as the sweep reaches them, finished jobs pop
  mv?.resetCapys(); for (const c of TEAM) mv?.moveCapy(c.id, DEPOT);
  for (const c of TEAM) for (const [id, s0, e0] of d.hist[c.id]) { later(() => mv?.moveCapy(c.id, SITES[g!.tickets[id].site].node, 320), at(s0));
    later(() => document.querySelector(`#game .blk[data-d="${id}"]`)?.classList.add('rp-pop'), at(e0)); }
  ms.forEach((m) => { if (m.capy) later(() => snd.play('drip'), at(m.at)); });
  const finish = () => { stopReplay(); if (again) reopenClose(); else closeScreen(); };
  $('#rp-skip').onclick = () => { snd.play('click'); finish(); };
  later(() => { if (perfect) { fxAt(p, 'stamp', 'Journée parfaite !', 1800); party(p); snd.play('star'); } else if (chips.children.length) snd.play('card'); }, T + 100);
  later(finish, T + (perfect ? 1900 : ms.length ? 2600 : 1200));
}
function bilan() {
  const tot = G.totalStars(g!); const y = g!.history.length ? g!.history[g!.history.length - 1].yield : G.yieldNow(g!); const inc = g!.history.reduce((s, h) => s + h.incidents, 0);
  const tier = say(tot >= 25 ? '{nom}, {ordonnanceur|ordonnanceuse} de l’année ! Le directeur régional veut te cloner.' : tot >= 18 ? 'Très belle quinzaine, {nom}. L’équipe est fière de toi (et un peu fatiguée).' : tot >= 10 ? 'Une quinzaine honnête, {nom}. On fera mieux après un bon café.' : 'Quinzaine difficile, {nom}… Mais personne n’a dit que l’eau, c’était simple. {Prêt|Prête} pour la revanche ?');
  if (!g!.history.length) { home(); return; }
  if (!S.best.runs || tot > S.best.stars || (tot === S.best.stars && y > S.best.yield)) { S.best.stars = Math.max(S.best.stars, tot); S.best.yield = Math.max(S.best.yield, y); }
  if (!(g as Game & { counted?: boolean }).counted) { S.best.runs++; (g as Game & { counted?: boolean }).counted = true; }
  save(); snd.play('legend');
  const fixed = Object.values(g!.tickets).filter((t) => !g!.pile.includes(t.id) && (JOBS[t.job].leak || JOBS[t.job].fix)).length;
  const moments = (g!.moments ?? []).filter((m) => m && !/^Une journée calme/.test(m)); const fun = moments.length ? moments[(g!.seed + moments.length) % moments.length] : '';
  const din = g!.stickers.includes('capydindon'); const stk = carnet(g!); const got = stk.filter((x) => x.got).length; const p0 = Math.round(START_YIELD * 100), p1 = Math.round(y * 100);
  openOv(`<div class="brief pot"><div class="b-left"><div class="bubble">${tier}</div><div class="duo">${who('chef', 'chef')}<div class="pl">${me('plc')}<span class="nt">${NM}</span></div></div></div><div class="b-right"><p class="kicker">Fin de la quinzaine</p><h2>Le pot du vendredi</h2>
    <div class="pot-top"><div class="pot-stars">${icon('star')}<b>${tot}</b><span>étoiles<br>sur ${DAYS * 3}</span></div><button class="stickers" id="bi-carnet" aria-expanded="false" aria-controls="bi-nb"><span class="stk ${din ? 'got' : 'miss'}">${who('capydindon')}</span><span><b>Carnet de terrain</b><br>${got} autocollant${got > 1 ? 's' : ''} sur ${stk.length}</span></button></div>
    <div class="carnet" id="bi-nb" hidden>${stk.map((x) => `<span class="cn ${x.group} ${x.got ? 'got' : 'miss'}" title="${x.got ? x.label : x.hint}">${x.id === 'capydindon' ? who('capydindon') : icon(x.group === 'compteur' ? 'meter' : x.id === 'prefet' ? 'mail' : 'heart', 'ic')}<i>${x.got ? x.label : '?'}</i></span>`).join('')}<p class="cn-leg"><b class="rare">Rareté</b><b class="habitue">Habitués</b><b class="compteur">Compteurs rares</b></p></div>
    <ul class="pot-l"><li>${icon('drop', 'ic s')}<span><b>${fixed} fuite${fixed > 1 ? 's' : ''}</b> bouchée${fixed > 1 ? 's' : ''}</span></li>
      <li>${icon('meter', 'ic s')}<span>Avignon perd ${p1 >= p0 ? 'moins' : 'plus'} d’eau : <b>${p0}\u202F% → <em class="${y >= YIELD_TARGET ? 'green' : ''}">${p1}\u202F%</em></b>${y >= YIELD_TARGET ? ' (contrat tenu !)' : ` (le contrat demande ${Math.round(YIELD_TARGET * 100)}\u202F%)`}</span></li>
      <li>${icon('heart', 'ic s')}<span>Abonnés : <b>${Math.round(g!.sat)}</b> sur 100</span></li>
      ${inc ? `<li class="red">${icon('warn', 'ic s')}<span>${inc} chantier${inc > 1 ? 's' : ''} sans appel au gaz : à ne jamais refaire</span></li>` : ''}</ul>
    ${fun ? `<p class="c-quote">« ${esc(nb(fun))} »</p>` : ''}
    <div class="btns"><button class="btn" id="bi-home">${glyph('home')}<span>Accueil</span></button><button class="btn primary" id="bi-new">${glyph('play')}<span>Nouvelle quinzaine</span></button></div></div></div>`, 'wide');
  $('#bi-home').onclick = home; $('#bi-new').onclick = newRun;
  $('#bi-carnet').onclick = () => { const nbk = $('#bi-nb'); const open = !!nbk.hidden; nbk.hidden = !open; $('#card').classList.toggle('nb', open); $('#bi-carnet').setAttribute('aria-expanded', String(open)); snd.play(open ? 'unlock' : 'click'); };
}

let unlocked = false;
const gesture = () => { snd.ensure(); if (!unlocked && snd.ctx) { unlocked = true; snd.music(view() === 'game' && g?.today?.phase === 'run' ? 1 : 0); } };
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, gesture, { capture: true, passive: true });
let triedLand = false;
addEventListener('pointerup', async () => { if (triedLand || !matchMedia('(pointer:coarse)').matches) return; triedLand = true;
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch { /* not allowed */ }
  try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'); } catch { /* iOS: the rotate screen covers it */ } }, { passive: true });
const portrait = matchMedia('(orientation:portrait) and (pointer:coarse)');
portrait.addEventListener?.('change', () => { if (portrait.matches) pauseRun(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseRun(); });
addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (ovOpen() && $('#d-ok')) { closeOv(); resumeAfterOverlay(); } else if (!ovOpen() && mapOpen) setMap(false); });
if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => {
  let reloading = false; const hadCtl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtl && !reloading) { reloading = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const ask = (w: ServiceWorker) => { if (document.getElementById('upd')) return; const b = document.createElement('div'); b.className = 'upd'; b.id = 'upd'; b.innerHTML = '<span>Nouvelle version disponible</span><button class="btn primary">Recharger</button>'; b.querySelector('button')!.onclick = () => { save(); w.postMessage('skip'); }; document.body.appendChild(b); };
    const watch = (w: ServiceWorker | null) => w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => watch(reg.installing));
  }).catch(() => {});
});
addEventListener('resize', () => { if (view() === 'game' && g?.today) render(); });
// test hook (read-only snapshot + controls used by the Playwright suite)
(window as unknown as { __capy: object }).__capy = { state: () => g, render: () => render(), mini: (id: string, c: CapyId) => miniGame(id, c), defaults, speed: (s: 1 | 2) => { speed = s; },
  ui: { creator: () => creator(home, false), briefing, closeScreen, replayDay, hindsight: () => hs, bilan, detail, showPending, showWarnings, menu, settings, objectives, enterGame, home, stop, blockMenu: (id: string) => { const el = document.querySelector<HTMLElement>(`.blk[data-b="${id}"]`); if (el) blockMenu(id, el); } } };

if (!S.player) creator(home, true); else { home(); if (g && !g.over && g.today && location.hash === '#jouer') enterGame(); }
booted = true;
