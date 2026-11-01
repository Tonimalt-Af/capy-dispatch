import '@fontsource/fredoka/latin-400.css'; import '@fontsource/fredoka/latin-600.css'; import '@fontsource/fredoka/latin-700.css';
import './style.css';
import { JOBS, TEAM, CAPY, RISKS, DAY_CARDS, DAYS_SPEC, WEEKDAYS, SKILL_SHORT, slotsFor, objText, type CapyId, type Skill } from './content';
import { SITES } from './map';
import { SLOTS, LUNCH_AFTER, DAYS, SAFETY_RULE, YIELD_TARGET, URGENT_TARGET, slotLabel } from './rules';
import * as G from './game';
import type { Game, Ticket } from './game';
import { load, save as persist, defaults, KEY, type Save } from './storage';
import { MapView, type Pin, type Route } from './mapview';
import { who, icon, ICONS, logoLDR, glyph, vanSvg, playerSvg, outfitThumb, headThumb, HEADS, setPlayerLook, FURS, OUTFITS, DEFAULT_LOOK, type Who, type Look } from './art';
import { cleanName, validName, setSex, agree, gx, NAME_MAX, ACCS, ACC_LABEL, FUR_LABEL, OUTFIT_LABEL, OUTFIT_SHORT, HEAD_LABEL, type Sex } from './player';
import { facade, wrongText, foundText, miniScore, meterSvg } from './facade';
import { Sound } from './audio';

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
let sel: string | null = null; let running = false; let timer = 0; let skipping = false; let speed: 1 | 2 = S.settings.speed;
const save = () => { S.game = g; persist(S); };
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const SK_COL: Record<Skill, string> = { icc: '#F39A2B', reseau: '#2FA4A9', fuite: '#E86A92' };
const pct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + '\u202F%';
const today = () => g!.today!;
const dayName = (d: number) => `${WEEKDAYS[d % 5]} · Jour ${d + 1}/${DAYS}`;
const addr = (t: Ticket) => `${t.num} ${SITES[t.site].street}`;
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
const TAG: Record<string, string> = { fuite_bt: 'Fuite', fuite_pc: 'Fuite cpt', prc: 'PRC', introuvable: 'Perdu', resilie: 'Résilié', coupure: 'Coupure', debit_nuit: 'Débit nuit', purge: 'Purge', poteau: 'Poteau' };
const range = (t: Ticket, c?: CapyId) => { const J = JOBS[t.job]; const base = c ? slotsFor(CAPY[c], J) : J.dur; if (base === null) return '—'; const mx = base + G.maxExtra(t); return mx > base ? `${base}–${mx}` : `${base}`; };

document.body.innerHTML = `<div id="app"><div class="view" id="home"></div><div class="view" id="create"></div><div class="view" id="game"></div></div>
<div class="ov" id="ov"><div class="card" id="card"></div></div><div class="toast" id="toast" role="status"></div>
<div class="rotate" id="rotate"><div class="rot-art">${who('momo')}<div class="phone"></div></div><h2>Tourne ton téléphone</h2><p>Le planning se joue à l'horizontale.</p></div>`;

let toastT = 0;
function toast(msg: string, ms = 2200, bad = false) { const t = $('#toast'); t.textContent = nb(msg); t.classList.toggle('bad', bad); t.classList.add('show'); clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove('show'), ms); }
function openOv(html: string, cls = '') { const c = $('#card'); c.className = `card ${cls}`; c.innerHTML = html; fillNames(c); $('#ov').classList.add('show'); c.scrollTop = 0; }
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
function newRun() { if (!S.player) { creator(newRun, true); return; } g = G.newGame(1 + Math.floor(Math.random() * 1e6)); if (!S.best.runs && !S.seenTuto) g.seed = 2026; G.startDay(g); save(); enterGame(); }
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
    <p class="muted">Règle de sécurité (appel gaz avant de creuser) : ${SAFETY_RULE === 'cap1' ? 'une erreur est possible, mais la journée est plafonnée à 1 étoile.' : 'la journée ne peut pas démarrer sans l’appel.'}</p>
  </div><div class="btns">${g && back === 'game' ? `<button class="btn" id="s-home">${glyph('home')}<span>Accueil</span></button>` : ''}<button class="btn primary" id="s-ok">OK</button></div>`, 'small');
  $('#s-sfx').onchange = (e) => { S.settings.sfx = snd.sfxOn = (e.target as HTMLInputElement).checked; save(); };
  $('#s-mus').onchange = (e) => { S.settings.music = (e.target as HTMLInputElement).checked; snd.setMusic(S.settings.music); save(); };
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
function render() { if (!g?.today) return; topbar(); panel(); mapUpdate(); }
function topbar() {
  const d = today(); const card = DAY_CARDS[DAYS_SPEC[d.day].card]; const y = G.yieldNow(g!); const lo = 0.65, hi = 0.9; const f = (v: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 100;
  const n = DAYS_SPEC[d.day].objs.length; const met = d.met ? d.met.filter(Boolean).length : 0;
  $('#game .top').innerHTML = `<button class="iconbtn" id="t-menu" aria-label="Menu">${glyph('menu')}</button>
    <div class="t-day"><span class="av">${me()}</span><div><b>${WEEKDAYS[d.day % 5]}</b><span>Jour ${d.day + 1}/${DAYS}</span></div>${icon(card.icon, 'ic s')}</div>
    <button class="t-obj" id="t-obj" aria-label="Objectifs du jour">${DAYS_SPEC[d.day].objs.map((_, i) => icon(d.met?.[i] ? 'star' : 'starOff', 'ic s')).join('')}<span><span class="lbl">Objectifs</span><b>${met}/${n}</b></span></button>
    <div class="t-kpis">
      <div class="kpi k-y" title="Rendement du réseau"><span class="lbl">Rendement</span><span class="kv"><span class="gauge"><i style="width:${f(y)}%"></i><em style="left:${f(YIELD_TARGET)}%"></em></span><b>${pct(y)}</b></span></div>
      <div class="kpi" title="Eau perdue aujourd'hui"><span class="lbl">Pertes</span><span class="kv">${icon('drop', 'ic xs')}<b>${Math.round(d.m3)} m³</b></span></div>
      <div class="kpi k-sat" title="Satisfaction des abonnés"><span class="lbl">Abonnés</span><span class="kv">${icon('heart', 'ic xs')}<b>${Math.round(g!.sat)}</b></span></div></div>
    <button class="t-map" id="t-map" aria-controls="mapbox" aria-expanded="${mapOpen}">${glyph('map')}<span>Carte</span></button>`;
  fillNames($('#game .top'));
  $('#t-menu').onclick = () => { pauseRun(); menu(); };
  $('#t-obj').onclick = () => { pauseRun(); objectives(); };
  $('#t-map').onclick = () => { setMap(!mapOpen); snd.play('click'); };
}
function menu() {
  openOv(`<h2>Pause</h2><p class="muted">${dayName(today().day)}</p><div class="col">
    <button class="btn primary" id="m-back">${glyph('play')}<span>Reprendre</span></button><button class="btn" id="m-set">${glyph('gear')}<span>Réglages</span></button><button class="btn" id="m-cred">Crédits &amp; licences</button><button class="btn" id="m-home">${glyph('home')}<span>Accueil</span></button></div>`, 'small');
  $('#m-back').onclick = () => { closeOv(); resumeAfterOverlay(); }; $('#m-set').onclick = settings; $('#m-cred').onclick = credits; $('#m-home').onclick = home;
}
function objectives() {
  const d = today(); const spec = DAYS_SPEC[d.day];
  openOv(`<h2>Objectifs du jour</h2><p class="muted">Chaque objectif tenu à la clôture = 1 étoile.${d.incidents ? ' <b class="red">Incident sécurité : journée plafonnée à 1 étoile.</b>' : ''}</p>
    <ul class="objs">${spec.objs.map((o) => `<li>${icon('star')}<span>${objText(o)}</span></li>`).join('')}</ul>
    <p class="muted">Rendement (fond) : chaque fuite réparée et chaque débit de nuit traité fait monter le rendement du réseau. Objectif de la quinzaine : ${pct(YIELD_TARGET)}.</p>
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
    <div class="b-right"><p class="kicker">Briefing de 7 h 30</p><h2>${dayName(d.day)}</h2>
      <div class="daycard">${icon(card.icon, 'ic big')}<div><b>${card.title}</b><span>${card.text}</span></div></div>
      ${g!.news.map((n) => `<p class="news">${icon('warn')} ${esc(n)}</p>`).join('')}
      <p class="sub">Au planning : <b>${tick.length} tickets</b>${urg ? ` · <b class="red">${urg} urgence${urg > 1 ? 's' : ''}</b>` : ''}${rdv ? ` · ${rdv} RDV` : ''}</p>
      <ul class="objs">${spec.objs.map((o) => `<li>${icon('star')}<span>${objText(o)}</span></li>`).join('')}</ul>
      <button class="btn primary big" id="b-go">Planifier la journée ${glyph('right')}</button></div></div>`, 'wide');
  $('#b-go').onclick = () => { closeOv(); d.phase = 'plan'; save(); render(); snd.play('click'); };
}

// ---------------------------------------------------------------- planning panel
const editable = () => { const d = today(); return d.phase === 'plan' || (d.phase === 'run' && !running && !d.pending.length); };
const U = SLOTS + 0.35; // timeline units: 8 slots + the lunch gap
const xs = (s: number) => ((Math.min(s, SLOTS) + (s >= LUNCH_AFTER ? 0.35 : 0)) / U) * 100; // left edge of a start slot
const xe = (e: number) => ((Math.min(e, SLOTS) + (e > LUNCH_AFTER ? 0.35 : 0)) / U) * 100; // right edge of an end slot
function panel() {
  const d = today(); const p = $('#game .panel'); const edit = editable(); const planning = d.phase === 'plan' || d.phase === 'briefing' || d.replan || (d.phase === 'run' && !running && !skipping);
  const hours = Array.from({ length: SLOTS }, (_, s) => `<span style="left:${xs(s)}%">${slotLabel(s).replace(' ', '')}</span>`).join('') + `<span class="end" style="left:100%">17h</span><i class="lunch-h" style="left:${xe(LUNCH_AFTER)}%;width:${(0.35 / U) * 100}%" title="Pause déjeuner">${icon('cup', 'ic xs')}</i>`;
  const selT = sel ? g!.tickets[sel] : null;
  const rows = TEAM.map((c) => {
    const pv = G.preview(g!, c.id); const fa = G.freeAt(g!, c.id); const cr = d.capys[c.id]; let html = '';
    for (const [id, s0, e0] of d.hist[c.id]) { const J = JOBS[g!.tickets[id].job]; html += `<div class="blk done" style="left:${xs(s0)}%;width:${xe(e0) - xs(s0)}%;--c:${SK_COL[J.skill]}"><div class="b1">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div><div class="b2"><span class="ok">${glyph('check')}</span></div></div>`; }
    if (cr.job) { const t = g!.tickets[cr.job]; const J = JOBS[t.job]; html += `<div class="blk now" style="left:${xs(cr.started)}%;width:${xe(d.slot + cr.left) - xs(cr.started)}%;--c:${SK_COL[J.skill]}"><div class="b1">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div><div class="b2"><span class="bd">en cours</span>${cr.extra ? `<i class="plus">+${cr.extra} h</i>` : ''}</div></div>`; }
    if (cr.travel && cr.target) html += `<div class="trv" style="left:${xs(d.slot)}%;width:${xe(d.slot + cr.travel) - xs(d.slot)}%" title="Trajet">${icon('van', 'ic xs')}</div>`;
    pv.forEach((s, i) => { const t = g!.tickets[s.id]; const J = JOBS[t.job]; const prev = i ? pv[i - 1].end : fa.at;
      if (s.travel && !(cr.travel && cr.target === s.id && i === 0)) html += `<div class="trv" style="left:${xs(prev)}%;width:${xe(prev + s.travel) - xs(prev)}%" title="Trajet">${icon('van', 'ic xs')}</div>`;
      if (s.start > prev + s.travel) html += `<div class="wait" style="left:${xs(prev + s.travel)}%;width:${xe(s.start) - xs(prev + s.travel)}%" title="Attente du RDV"></div>`;
      if (s.endMax > s.end) html += `<div class="maybe" style="left:${xs(s.end)}%;width:${xe(s.endMax) - xs(s.end)}%" title="Temps en plus si un risque tombe"><span>+${s.endMax - s.end} h ?</span></div>`;
      const cls = ['blk', 'q', s.late ? 'late' : '', s.overflow ? 'over' : '', J.urgent ? 'urg' : '', sel === s.id ? 'sel' : ''].join(' ');
      html += `<div class="${cls}" data-b="${s.id}" style="left:${xs(s.start)}%;width:${xe(Math.min(s.end, SLOTS)) - xs(s.start)}%;--c:${SK_COL[J.skill]}" aria-label="${J.short}, ${s.end - s.start} h"><div class="b1">${icon(J.icon, 'ic s')}<b>${TAG[J.id]}</b></div><div class="b2"><span class="bd">${s.end - s.start} h</span>${t.rdv ? icon('clock', 'ic xs') : ''}${t.risks.filter((r) => r !== 'absent').map((r) => icon(RISKS[r].icon, 'ic xs')).join('')}${J.dig ? icon(t.gas ? 'phone' : 'phoneX', 'ic xs') : ''}</div>${s.overflow ? `<i class="ovf" title="Déborde après 17 h">${glyph('right')}</i>` : ''}</div>`; });
    const can = selT ? slotsFor(c, JOBS[selT.job]) !== null : true;
    if (selT && can && edit && !pv.some((s) => s.id === sel)) { const at = Math.max(pv.length ? pv[pv.length - 1].end : fa.at, d.phase === 'run' ? d.slot : 0); const du = slotsFor(c, JOBS[selT.job])!;
      if (at < SLOTS) html += `<div class="gslot" style="left:${xs(at)}%;width:${xe(Math.min(at + du, SLOTS)) - xs(at)}%"><span class="gl-l">Toucher ici · ${slotLabel(at).replace(' ', '')}</span><span class="gl-s">Ici</span></div>`; }
    const rdvBand = selT?.rdv ? `<div class="rdvband" style="left:${xs(selT.rdv[0])}%;width:${xe(selT.rdv[1] + 1) - xs(selT.rdv[0])}%"><span>RDV</span></div>` : '';
    const now = d.phase === 'run' ? `<div class="nowl" style="left:${xs(d.slot)}%"></div>` : '';
    return `<div class="row${selT ? (can ? ' can' : ' cannot') : ''}" data-capy="${c.id}">
      <div class="who"><span class="hd">${who(c.id)}</span><div><b style="color:${c.color}">${c.name}</b><span class="sk"><i style="background:${SK_COL[c.main]}">${SKILL_SHORT[c.main]}</i>${c.second ? `<i class="s2" style="--k:${SK_COL[c.second]}" title="Métier secondaire : +1 h">${SKILL_SHORT[c.second]}</i>` : ''}</span></div></div>
      <div class="tl" data-capy="${c.id}"><div class="grid">${Array.from({ length: SLOTS }, (_, s) => `<i style="left:${xs(s)}%;width:${xe(s + 1) - xs(s)}%"${s < d.slot && d.phase === 'run' ? ' class="past"' : ''}></i>`).join('')}<em style="left:${xe(LUNCH_AFTER)}%;width:${(0.35 / U) * 100}%"></em></div>${rdvBand}${html}${now}</div></div>`;
  }).join('');
  const w = G.warnings(g!); const red = w.filter((x) => x.level === 'red').length;
  let bottom = '';
  if (planning) {
    const tr = G.tray(g!);
    bottom = `<div class="tray" id="tray">${tr.length ? tr.map(card).join('') : `<p class="empty">${d.phase === 'plan' ? 'Tous les tickets sont placés.' : 'Rien en attente.'}</p>`}</div>
      <div class="acts">${w.length ? `<button class="warnbtn ${red ? 'red' : ''}" id="p-warn">${icon('warn', 'ic s')}<span>${w.length} alerte${w.length > 1 ? 's' : ''}</span></button>` : `<span class="okmsg">${glyph('check')} Planning OK</span>`}
      <button class="btn primary go" id="p-go">${glyph('play')}<span>${d.phase === 'plan' ? 'Lancer la journée' : 'Reprendre'}</span></button></div>`;
  } else {
    bottom = `<div class="feed">${d.log.slice(-3).map((l) => `<p>${esc(l)}</p>`).join('') || '<p class="muted">La tournée commence…</p>'}</div>
      <div class="ctrl"><button class="cbtn" id="r-pause" aria-label="Pause et modifier">${glyph('pause')}</button><button class="cbtn ${speed === 1 ? 'on' : ''}" id="r-x1" aria-pressed="${speed === 1}">x1</button><button class="cbtn ${speed === 2 ? 'on' : ''}" id="r-x2" aria-pressed="${speed === 2}">x2</button><button class="cbtn wide" id="r-skip">${glyph('skip')}<span>Prochaine décision</span></button></div>`;
  }
  const main = $('#game .main'); const wasRun = main.classList.contains('run'); main.classList.toggle('run', !planning); if (wasRun !== !planning) { setMap(mapOpen); if (!planning && DRAWER.matches && !mapOpen) requestAnimationFrame(() => mv?.home()); }
  const co = coach();
  p.innerHTML = `${co}<div class="scale"><div class="who-h"></div><div class="hours">${hours}</div></div><div class="rows">${rows}</div><div class="bottom">${bottom}</div>`;
  if (co) fillNames(p);
  p.classList.toggle('editing', edit);
  bindPanel();
}
function card(id: string) {
  const t = g!.tickets[id]; const J = JOBS[t.job]; const ok = G.avail(g!, id);
  const age = g!.day - t.day; const rdv = t.rdv ? `${slotLabel(t.rdv[0]).replace(' ', '')}–${slotLabel(Math.min(t.rdv[1] + 1, SLOTS - 1)).replace(' ', '')}` : '';
  return `<div class="tk${J.urgent ? ' urg' : ''}${sel === id ? ' sel' : ''}${ok ? '' : ' wait'}" data-t="${id}" style="--c:${SK_COL[J.skill]}" role="button" tabindex="0" aria-label="${J.short}${J.urgent ? ', urgent' : ''}">
    <div class="tk-h">${icon(J.icon)}<b>${J.short}</b><span class="dur" title="Durée (1 créneau = 1 h)">${range(t)} h</span></div>
    <div class="tk-s">${J.urgent ? '<span class="chip red">Urgent</span>' : ''}${!ok && t.avail !== null ? `<span class="chip">Possible ${WEEKDAYS[t.avail % 5].toLowerCase()}</span>` : `<span class="ad">${esc(addr(t))}</span>`}</div>
    <div class="tk-r"><span class="sk-dot">${SKILL_SHORT[J.skill]}</span>${t.rdv ? `<span class="chip">${icon('clock', 'ic xs')}${rdv}</span>` : ''}${t.risks.filter((r) => r !== 'absent').map((r) => `<span class="rk" title="${RISKS[r].name}">${icon(RISKS[r].icon, 'ic xs')}</span>`).join('')}${t.risks.includes('absent') ? `<span class="rk" title="Abonné peut-être absent">${icon('clock', 'ic xs')}</span>` : ''}${age > 0 ? `<span class="chip">J+${age}</span>` : ''}
      ${J.dig ? `<button class="chip act ${t.gas ? 'green' : 'red'}" data-gas="${id}" aria-label="${t.gas ? 'Exploitant gaz appelé' : 'Appeler l’exploitant gaz'}">${icon(t.gas ? 'phone' : 'phoneX', 'ic xs')}${t.gas ? 'Gaz OK' : 'Gaz ?'}</button>` : ''}${t.avail === null ? `<button class="chip act blue" data-avis="${id}">${icon('mail', 'ic xs')}Avis 48 h</button>` : ''}</div></div>`;
}
function coach() {
  if (S.seenTuto || !g || g.day > 0) return '';
  const d = today(); let msg = '';
  if (d.phase === 'plan') { const tr = G.tray(g); msg = tr.length ? (sel ? 'Touche maintenant la ligne d’un capy qui a la bonne pastille de métier.' : (!Object.values(d.plan).flat().length ? '{nom}, touche un ticket en bas pour le choisir (ou fais-le glisser).' : 'Touche le ticket suivant, puis la ligne d’un capy.')) : 'Tout est placé ! Les bandes hachurées « +1 h ? » montrent le temps en plus si un risque tombe. Lance la journée.'; }
  else if (d.phase === 'run' && running) msg = 'La journée se joue toute seule : x2 accélère, « Prochaine décision » saute jusqu’au prochain choix.';
  return msg ? `<div class="coach" role="status">${who('chef')}<p>${say(msg)}</p></div>` : '';
}
// ---------- panel interactions: tap ticket → tap slot, drag & drop, block menu
let drag: { id: string; from: 'tray' | 'blk'; x: number; y: number; ghost: HTMLElement | null; el: HTMLElement } | null = null; let suppressClick = false;
function bindPanel() {
  const p = $('#game .panel'); const d = today();
  $('#p-go', p)?.addEventListener('click', launchDay);
  $('#p-warn', p)?.addEventListener('click', () => showWarnings(false));
  $('#r-pause', p)?.addEventListener('click', () => { stop(); render(); toast('Pause : tu peux modifier le planning des tickets pas encore commencés.'); });
  $('#r-x1', p)?.addEventListener('click', () => { speed = 1; S.settings.speed = 1; save(); render(); });
  $('#r-x2', p)?.addEventListener('click', () => { speed = 2; S.settings.speed = 2; save(); render(); });
  $('#r-skip', p)?.addEventListener('click', skipToDecision);
  p.querySelectorAll<HTMLElement>('[data-avis]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (G.sendAvis(g!, b.dataset.avis!)) { snd.play('place'); toast(`Avis de coupure envoyé : chantier possible ${WEEKDAYS[(g!.day + 2) % 5].toLowerCase()}.`); save(); render(); } }));
  p.querySelectorAll<HTMLElement>('[data-gas]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); G.toggleGas(g!, b.dataset.gas!); snd.play(g!.tickets[b.dataset.gas!].gas ? 'place' : 'click'); save(); render(); }));
  if (!editable() && !(d.phase === 'run' && d.replan)) return;
  p.querySelectorAll<HTMLElement>('.tk').forEach((el) => {
    el.addEventListener('click', () => { if (suppressClick) return; tapTicket(el.dataset.t!); });
    el.addEventListener('pointerdown', (e) => startDrag(e, el.dataset.t!, 'tray', el));
  });
  p.querySelectorAll<HTMLElement>('.blk.q').forEach((el) => {
    el.addEventListener('click', (e) => { if (suppressClick) return; e.stopPropagation(); if (sel && sel !== el.dataset.b) tapRow(el.closest<HTMLElement>('.tl')!, e.clientX); else blockMenu(el.dataset.b!, el); });
    el.addEventListener('pointerdown', (e) => startDrag(e, el.dataset.b!, 'blk', el));
  });
  p.querySelectorAll<HTMLElement>('.row').forEach((row) => row.addEventListener('click', (e) => { if (suppressClick || !sel) return; tapRow($('.tl', row), e.clientX); }));
}
function tapTicket(id: string, fromMap = false) {
  if (sel === id) { if (fromMap && mapOpen && DRAWER.matches) { setMap(false); return; } detail(id); return; }
  if (fromMap && mapOpen && DRAWER.matches) setMap(false);
  sel = id; snd.play('select'); mv?.focus(g!.tickets[id].site); render();
  const t = g!.tickets[id]; if (!G.avail(g!, id)) toast(t.avail === null ? 'Envoie d’abord l’avis de coupure 48 h.' : 'Pas encore possible aujourd’hui.');
}
function pinTap(id: string) { if (!g?.today) return; const d = today(); if (Object.values(d.plan).flat().includes(id) || !G.tray(g).includes(id)) { detail(id); return; } if (editable() || d.replan) tapTicket(id, true); else detail(id); }
function slotAt(tl: HTMLElement, clientX: number) { const r = tl.getBoundingClientRect(); const u = ((clientX - r.left) / r.width) * U; return u >= LUNCH_AFTER + 0.35 ? Math.floor(u - 0.35) : Math.floor(Math.min(u, LUNCH_AFTER - 0.01)); }
function place(c: CapyId, id: string, slot: number) {
  const t = g!.tickets[id]; const J = JOBS[t.job];
  if (!G.avail(g!, id)) { snd.play('invalid'); shake(c); toast(t.avail === null ? 'Envoie d’abord l’avis de coupure 48 h.' : 'Ce ticket n’est pas encore possible.', 2400, true); return false; }
  if (!G.canDo(c, id, g!)) { snd.play('invalid'); shake(c); toast(`${CAPY[c].name} ne sait pas faire « ${J.short} » (métier ${SKILL_SHORT[J.skill]}).`, 2600, true); return false; }
  G.unassign(g!, id); G.assign(g!, c, id, G.indexForSlot(g!, c, slot)); snd.play('place'); sel = null; save(); render();
  document.querySelector(`.blk[data-b="${id}"]`)?.classList.add('pop'); return true;
}
function shake(c: CapyId) { const r = document.querySelector(`.row[data-capy="${c}"]`); r?.classList.remove('shake'); void (r as HTMLElement | null)?.offsetWidth; r?.classList.add('shake'); }
function tapRow(tl: HTMLElement, clientX: number) { if (!sel) return; place(tl.dataset.capy as CapyId, sel, slotAt(tl, clientX)); }
function startDrag(e: PointerEvent, id: string, from: 'tray' | 'blk', el: HTMLElement) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  drag = { id, from, x: e.clientX, y: e.clientY, ghost: null, el };
  const move = (ev: PointerEvent) => {
    if (!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.ghost) { if (Math.hypot(dx, dy) < 9 || (from === 'tray' && Math.abs(dx) > Math.abs(dy) * 1.2 && ev.pointerType !== 'mouse')) { if (Math.abs(dx) > 14 && from === 'tray') cleanup(); return; }
      const gh = el.cloneNode(true) as HTMLElement; gh.classList.add('ghost'); const r = el.getBoundingClientRect(); gh.style.width = r.width + 'px'; gh.style.height = r.height + 'px'; document.body.appendChild(gh); drag.ghost = gh; sel = id; el.classList.add('dragging'); snd.play('select');
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
  const cleanup = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', upH); removeEventListener('pointercancel', cleanup as never); if (drag?.ghost) drag.ghost.remove(); drag?.el.classList.remove('dragging'); document.querySelectorAll('.row.hover').forEach((r) => r.classList.remove('hover')); drag = null; };
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
function detail(id: string) {
  const t = g!.tickets[id]; const J = JOBS[t.job]; const d = today(); const planned = Object.values(d.plan).flat().includes(id); const ed = editable() || d.replan;
  openOv(`<div class="det"><div class="det-h" style="--c:${SK_COL[J.skill]}">${icon(J.icon, 'ic big')}<div><h2>${J.name}</h2><p>${esc(addr(t))} · ${t.prefet ? esc(t.who) : 'Abonné : ' + esc(t.who)}</p></div></div>
    <p>${J.desc}</p>
    <div class="det-g"><div><h3>Durée</h3>${TEAM.map((c) => `<p>${c.name} : <b>${range(t, c.id) === '—' ? 'ne sait pas faire' : range(t, c.id) + ' h'}</b></p>`).join('')}<p class="muted">Métier ${SKILL_SHORT[J.skill]}. Métier secondaire : +1 h.</p></div>
    <div><h3>Risques annoncés</h3>${t.risks.length || J.minigame ? '' : '<p class="muted">Aucun.</p>'}${t.risks.map((r) => `<p>${icon(r === 'absent' ? 'clock' : RISKS[r].icon, 'ic s')} <b>${r === 'absent' ? 'Abonné peut-être absent' : RISKS[r].name}</b> · ${RISKS[r].tip} <i>(tu choisiras : +1 h ou autre option)</i></p>`).join('')}${J.minigame ? `<p>${icon('search', 'ic s')} <b>Compteur à trouver</b> · 0 ou +1 h selon ta recherche</p>` : ''}
    ${t.rdv ? `<p>${icon('clock', 'ic s')} <b>RDV</b> : arrivée entre ${slotLabel(t.rdv[0])} et ${slotLabel(t.rdv[1])}</p>` : ''}${J.urgent ? `<p class="red">${icon('drop', 'ic s')} <b>Urgent</b> : à commencer dans les ${URGENT_TARGET} h après l'appel. ${J.leak} m³ perdus par heure.</p>` : ''}</div></div>
    ${J.dig ? `<button class="btn ${t.gas ? 'ok' : 'danger'}" id="d-gas">${icon(t.gas ? 'phone' : 'phoneX')}<span>${t.gas ? 'Exploitant gaz appelé ✓' : 'Appeler l’exploitant gaz avant de creuser'}</span></button>` : ''}
    ${J.coupure && t.avail === null ? `<button class="btn" id="d-avis">${icon('mail')}<span>Envoyer l'avis de coupure 48 h</span></button>` : ''}
    <div class="btns">${ed && G.avail(g!, id) ? TEAM.filter((c) => G.canDo(c.id, id, g!)).map((c) => `<button class="btn" data-put="${c.id}">Donner à ${c.name}</button>`).join('') : ''}${ed && planned ? '<button class="btn" id="d-del">Retirer du planning</button>' : ''}<button class="btn primary" id="d-ok">OK</button></div></div>`, 'wide');
  $('#d-ok').onclick = () => { closeOv(); resumeAfterOverlay(); };
  $('#d-gas')?.addEventListener('click', () => { if (!ed && d.phase !== 'plan') { toast('Pendant la tournée, l’appel se fait à l’arrivée du capy.'); return; } G.toggleGas(g!, id); save(); render(); detail(id); });
  $('#d-avis')?.addEventListener('click', () => { G.sendAvis(g!, id); save(); render(); detail(id); snd.play('place'); });
  $('#d-del')?.addEventListener('click', () => { G.unassign(g!, id); save(); closeOv(); render(); });
  document.querySelectorAll<HTMLElement>('[data-put]').forEach((b) => b.addEventListener('click', () => { closeOv(); G.unassign(g!, id); G.assign(g!, b.dataset.put as CapyId, id); sel = null; snd.play('place'); save(); render(); }));
}
function showWarnings(launching: boolean) {
  const w = G.warnings(g!); const red = w.some((x) => x.level === 'red'); const block = !G.canLaunch(g!);
  openOv(`<h2>${launching ? 'Avant de lancer…' : 'Alertes du planning'}</h2><ul class="warns">${w.map((x) => `<li class="${x.level}">${icon('warn', 'ic s')} ${esc(x.text)}</li>`).join('')}</ul>
    ${block ? '<p class="red"><b>Règle de sécurité : la journée ne peut pas démarrer sans l’appel à l’exploitant gaz.</b></p>' : ''}
    <div class="btns">${block ? '<button class="btn primary" id="w-call">Appeler pour tous les chantiers</button>' : ''}<button class="btn" id="w-fix">Corriger</button>${launching && !block ? `<button class="btn ${red ? 'danger' : 'primary'}" id="w-go">Lancer quand même</button>` : ''}</div>`, 'small');
  $('#w-fix').onclick = closeOv;
  $('#w-call')?.addEventListener('click', () => { for (const c of TEAM) for (const id of today().plan[c.id]) if (JOBS[g!.tickets[id].job].dig) g!.tickets[id].gas = true; save(); closeOv(); render(); });
  $('#w-go')?.addEventListener('click', () => { closeOv(); doLaunch(); });
}
function launchDay() {
  const d = today(); sel = null;
  if (d.phase === 'run') { d.replan = false; save(); play(); return; }
  if (!Object.values(d.plan).some((q) => q.length)) { toast('Place au moins un ticket sur une ligne de capy.'); snd.play('invalid'); return; }
  const w = G.warnings(g!); if (w.some((x) => x.level === 'red') || !G.canLaunch(g!)) { showWarnings(true); return; }
  doLaunch();
}
function doLaunch() { G.launch(g!); save(); snd.play('horn'); snd.music(1); play(); }

// ---------------------------------------------------------------- resolution loop
function stop() { running = false; skipping = false; clearTimeout(timer); }
function play() { const d = g?.today; if (!d || d.phase !== 'run') return; running = true; render(); schedule(); }
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
  if (d.done.length > before.done) snd.play('match');
  if (before.slot === LUNCH_AFTER - 1 && d.slot === LUNCH_AFTER && !skipping) toast('Pause déjeuner (12 h – 13 h)', 1400);
  if (d.phase === 'close') { stop(); render(); setTimeout(closeScreen, 500); return; }
  render();
  if (d.pending.length) { stop(); showPending(); return; }
  schedule();
}
function skipToDecision() { skipping = true; running = true; render(); schedule(); }

// ---------------------------------------------------------------- cards
function showPending() {
  const d = today(); const p = d.pending[0]; if (!p) { play(); return; }
  stop(); render();
  if (p.kind === 'mini') { miniGame(p.ticket!, p.capy!); return; }
  const c = G.cardOf(p); const t = p.ticket ? g!.tickets[p.ticket] : null;
  const w: Who = c.who === 'capy' ? (p.capy ?? 'capy') : (c.who as Who);
  snd.play(p.kind === 'safety' || c.choices.some((x) => x.fx.addTicket && JOBS[x.fx.addTicket].urgent) ? 'alert' : 'card');
  const ctx = [p.capy ? CAPY[p.capy].name : '', t ? `${JOBS[t.job].short}, ${addr(t)}` : '', slotLabel(Math.min(d.slot, SLOTS - 1))].filter(Boolean).join(' · ');
  openOv(`<div class="ecard${p.kind === 'safety' ? ' safety' : ''}"><div class="e-art">${who(w)}</div><div class="e-body"><p class="kicker">${esc(ctx)}</p><h2>${c.title}</h2><p>${c.text}</p>
    <div class="choices">${c.choices.map((ch, i) => `<button class="choice" data-i="${i}"><b>${ch.label}</b><span>${ch.hint}</span></button>`).join('')}</div></div></div>`, 'wide');
  document.querySelectorAll<HTMLElement>('.choice').forEach((b) => b.addEventListener('click', () => {
    const nt = G.choose(g!, Number(b.dataset.i)); snd.play('click'); save(); closeOv();
    if (p.capy && t) { const cr = today().capys[p.capy]; if (!cr.job && !cr.travel) mv?.moveCapy(p.capy, SITES[t.site].node); }
    if (nt) { const J = JOBS[nt.job]; today().replan = true; sel = nt.id; render(); mv?.focus(nt.site); toast(`Nouveau ticket : ${J.short}. Le temps est arrêté, place-le puis « Reprendre ▶ ».`, 3600); snd.play(J.urgent ? 'alert' : 'select'); return; }
    if (today().pending.length) showPending(); else play();
  }));
}
function miniGame(id: string, capy: CapyId) {
  const t = g!.tickets[id]; const f = facade(t.num * 131 + t.site); let wrong = 0, hint = false, done = false; const missed = new Set<number>();
  const draw = () => {
    openOv(`<div class="mini-l"><div class="facade">${f.svg.replace('</svg>', (done ? meterSvg(f.spots[f.meter]) : '') + '</svg>')}${f.spots.map((s) => `<button class="spot${hint && !f.hintSpots.includes(s.id) ? ' dim' : ''}${missed.has(s.id) ? ' miss' : ''}" ${missed.has(s.id) ? 'disabled ' : ''}data-s="${s.id}" style="left:${(s.x / 400) * 100}%;top:${(s.y / 240) * 100}%;width:${((s.r * 2.2) / 400) * 100}%" aria-label="Chercher ici"></button>`).join('')}</div></div>
      <div class="mini-r"><p class="kicker">${CAPY[capy].name} · ${esc(addr(t))}</p><h2>Trouver le compteur</h2>
        <div class="say" id="say">${done ? '' : 'Touche l’endroit où tu penses trouver le compteur. Pas de chrono.'}</div>
        <div class="mini-k"><span>Fausses pistes</span><b>${wrong}</b>${hint ? '<em>indice utilisé</em>' : ''}</div>
        <p class="rule">0 ou 1 fausse piste (l’indice compte pour une) : pas de retard. Au-delà : +1 h.</p>
        <div class="col">${done ? '' : `<button class="btn" id="mg-hint" ${hint ? 'disabled' : ''}>${icon('search')}<span>Indice du SIG</span></button><button class="btn" id="mg-auto">Laisser faire ${CAPY[capy].name} <small>+1 h</small></button>`}</div></div>
`, 'wide mini');
    document.querySelectorAll<HTMLButtonElement>('.spot').forEach((b) => b.addEventListener('click', () => {
      if (done) return; const s = Number(b.dataset.s);
      if (s === f.meter) { done = true; snd.play('star'); const extra = miniScore(wrong, hint); draw(); $('#say').innerHTML = `<b>Trouvé ${foundText(f.spots[s].kind)} !</b> ${extra ? '+1 h de recherche.' : 'Aucun retard, bravo.'}`; setTimeout(() => finish(extra, `a trouvé le compteur ${foundText(f.spots[s].kind)}`), 1500); }
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
function closeScreen() {
  const d = today(); const spec = DAYS_SPEC[d.day]; const h = g!.history[g!.history.length - 1]; snd.music(0); snd.play(d.stars ? 'win' : 'lose');
  const dsat = Math.round(g!.sat - d.satStart);
  const line = ['Journée compliquée, {nom}… On repart {motivé|motivée} demain !', 'On a tenu le coup, {nom}.', 'Belle journée, {nom} !', 'Journée parfaite, {nom} ! L’équipe est ravie.'][d.stars!];
  const kpi = (ic: string, v: string, l: string) => `<div>${icon(ic, 'ic s')}<b>${v}</b><span>${l}</span></div>`;
  openOv(`<div class="close"><div class="c-left"><p class="kicker">Clôture de 17 h</p><h2>${dayName(d.day)}</h2>
      <div class="c-stars"><div class="stars">${[0, 1, 2].map((i) => `<span class="st${i < d.stars! ? ' on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">${ICONS[i < d.stars! ? 'star' : 'starOff']}</span>`).join('')}</div><div class="c-me">${me()}</div></div>
      <p class="c-line">${say(line)}</p>
      <ul class="objs">${spec.objs.map((o, i) => `<li class="${d.met![i] ? 'ok' : 'ko'}">${glyph(d.met![i] ? 'check' : 'cross')} <span>${objText(o)}</span></li>`).join('')}</ul>
      ${d.incidents ? '<p class="red"><b>Incident sécurité</b> (pas d’appel gaz avant de creuser) : journée plafonnée à 1 étoile.</p>' : ''}</div>
    <div class="c-right"><div class="kpis">
      ${kpi('van', String(d.done.length), 'tickets traités')}${kpi('clock', `${d.rdvKept.length}/${d.rdvToday.length}`, 'RDV tenus')}
      ${kpi('drop', `${Math.round(d.m3)} + ${Math.round(d.night)} m³`, 'perdus jour + nuit')}${kpi('meter', pct(h.yield), 'rendement')}
      <div>${icon('heart', 'ic s')}<b>${Math.round(g!.sat)} <small class="${dsat >= 0 ? 'green' : 'red'}">${dsat >= 0 ? '+' : ''}${dsat}</small></b><span>satisfaction</span></div>${kpi('lane', String(d.travel), 'h de trajet')}</div>
      <details><summary>Journal de la journée</summary><div class="log">${d.log.map((l) => `<p>${esc(l)}</p>`).join('')}</div></details>
      <button class="btn primary big" id="c-next">${d.day + 1 >= DAYS ? 'Bilan de la quinzaine' : 'Journée suivante'} ${glyph('right')}</button></div></div>`, 'wide');
  $('#c-next').onclick = () => { if (!S.seenTuto) { S.seenTuto = true; } G.nextDay(g!); sel = null; save(); closeOv(); if (g!.over) bilan(); else { mv?.resetCapys(); for (const c of TEAM) mv?.moveCapy(c.id, today().capys[c.id].pos); render(); briefing(); } };
}
function bilan() {
  const tot = G.totalStars(g!); const y = g!.history.length ? g!.history[g!.history.length - 1].yield : G.yieldNow(g!); const inc = g!.history.reduce((s, h) => s + h.incidents, 0);
  const rdvK = g!.history.reduce((s, h) => s + h.rdvKept, 0), rdvT = g!.history.reduce((s, h) => s + h.rdvTotal, 0);
  const tier = say(tot >= 25 ? '{nom}, {ordonnanceur|ordonnanceuse} de l’année ! Le directeur régional veut te cloner.' : tot >= 18 ? 'Très belle quinzaine, {nom}. L’équipe est fière de toi (et un peu fatiguée).' : tot >= 10 ? 'Une quinzaine honnête, {nom}. On fera mieux après un bon café.' : 'Quinzaine difficile, {nom}… Mais personne n’a dit que l’eau, c’était simple. {Prêt|Prête} pour la revanche ?');
  if (!g!.history.length) { home(); return; }
  if (!S.best.runs || tot > S.best.stars || (tot === S.best.stars && y > S.best.yield)) { S.best.stars = Math.max(S.best.stars, tot); S.best.yield = Math.max(S.best.yield, y); }
  if (!(g as Game & { counted?: boolean }).counted) { S.best.runs++; (g as Game & { counted?: boolean }).counted = true; }
  save(); snd.play('legend');
  openOv(`<div class="brief"><div class="b-left"><div class="bubble">${tier}</div><div class="duo">${who('chef', 'chef')}<div class="pl">${me('plc')}<span class="nt">${NM}</span></div></div></div><div class="b-right"><p class="kicker">Bilan avec le chef</p><h2>Fin de la quinzaine</h2>
    <div class="kpis"><div><b>${tot} ★</b><span>sur ${DAYS * 3}</span></div><div><b class="${y >= YIELD_TARGET ? 'green' : ''}">${pct(y)}</b><span>rendement (objectif ${pct(YIELD_TARGET)})</span></div>
    <div><b>${rdvK}/${rdvT}</b><span>RDV tenus</span></div><div><b>${Math.round(g!.sat)}</b><span>satisfaction</span></div><div><b class="${inc ? 'red' : 'green'}">${inc}</b><span>incident${inc > 1 ? 's' : ''} sécurité</span></div>
    <div class="${g!.stickers.includes('capydindon') ? 'got' : 'miss'}"><span class="stk">${who('capydindon')}</span><span>${g!.stickers.includes('capydindon') ? 'capydindon doré : vu !' : 'capydindon doré : pas vu'}</span></div></div>
    <div class="btns"><button class="btn" id="bi-home">${glyph('home')}<span>Accueil</span></button><button class="btn primary" id="bi-new">${glyph('play')}<span>Nouvelle quinzaine</span></button></div></div></div>`, 'wide');
  $('#bi-home').onclick = home; $('#bi-new').onclick = newRun;
}

// ---------------------------------------------------------------- audio unlock, landscape, keyboard, service worker
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
  ui: { creator: () => creator(home, false), briefing, closeScreen, bilan, detail, showPending, showWarnings, menu, settings, objectives, enterGame, home, stop, blockMenu: (id: string) => { const el = document.querySelector<HTMLElement>(`.blk[data-b="${id}"]`); if (el) blockMenu(id, el); } } };

if (!S.player) creator(home, true); else { home(); if (g && !g.over && g.today && location.hash === '#jouer') enterGame(); }
booted = true;
