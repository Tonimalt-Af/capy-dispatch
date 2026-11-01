// Day generator (design Page, section 16): days 4 to 10 of a campaign are assembled from hand-written pieces,
// picked by the seed. Every generated day is proven before it is served: the search player (the one behind
// « Si c'était à refaire ») must reach 3 ★ from the player's own morning, else the next candidate is tried,
// and after the last one the scripted day is served. The story beats of the fortnight (the VIP calls, the Festival,
// the director, the prefect, the capydindon) stay on their scripted day, so each one still happens once.
import { JOBS, SEASONS, seasonDays, type DaySpec, type JobId, type Risk, type Obj, type Season } from './content';
import { hooks, rng, startDay, type Game } from './game';
import { tryDay } from './hindsight';

/** Hand-written job bags (what the central sends on a typical day of each kind). */
export const MIXES: Record<string, JobId[]> = {
  compteurs: ['prc', 'introuvable', 'prc', 'resilie', 'debit_nuit', 'prc', 'fuite_pc', 'fontaine', 'resilie', 'purge', 'prc', 'debit_nuit', 'purge', 'prc', 'fontaine'],
  reseau: ['debit_nuit', 'purge', 'fuite_pc', 'fontaine', 'prc', 'debit_nuit', 'resilie', 'purge', 'introuvable', 'fontaine', 'prc', 'debit_nuit', 'purge', 'prc', 'fuite_pc'],
  abonnes: ['prc', 'resilie', 'prc', 'introuvable', 'purge', 'fuite_pc', 'prc', 'debit_nuit', 'fontaine', 'resilie', 'purge', 'prc', 'debit_nuit', 'introuvable', 'fontaine'],
  menage: ['resilie', 'prc', 'debit_nuit', 'purge', 'introuvable', 'fontaine', 'prc', 'resilie', 'fuite_pc', 'debit_nuit', 'purge', 'prc', 'fontaine', 'prc', 'fuite_pc'],
};
/** Which risk goes on which kind of job (the same pairs as in the scripted days). */
const RISK_ON: [Risk, JobId[]][] = [['cafe', ['prc', 'fuite_pc']], ['absent', ['prc']], ['chien', ['introuvable', 'resilie']], ['cave', ['introuvable']], ['ruelle', ['fuite_pc', 'fuite_bt']]];
/** Calls that can ring on a day of each kind (the story calls stay on their scripted day). */
export const FILLERS: Record<string, string[]> = {
  calme: ['riverain', 'voiture', 'avis_rate'], mistral: ['mistral', 'riverain', 'voiture'], marche: ['hydrocureur', 'riverain', 'voiture'],
  // orage: the storm already brings a casse and a fuite sur branchement, no third leak call on top
  orage: ['vestiges', 'poteau', 'voiture'], pluie: ['riverain', 'voiture', 'avis_rate'], festival: [],
  // winter: a frozen meter brings its neighbours; the thaw brings the cracked meters and the casses
  gel: ['gel_voisin', 'apres_cpt', 'voiture'], redoux: ['degel_cpt', 'manchon', 'voiture'],
};
const BEAT = /^(vip_|fest_)|^(prefet|directeur|capydindon|standard)$/;
/** Objective trios written for each kind of day. */
export const TRIOS: Record<string, Obj[][]> = {
  calme: [[{ id: 'rdv' }, { id: 'backlog', n: 1 }, { id: 'yield', n: 1 }], [{ id: 'rdv' }, { id: 'sat', n: 2 }, { id: 'travel', n: 5 }], [{ id: 'backlog' }, { id: 'rdv' }, { id: 'yield', n: 1 }]],
  mistral: [[{ id: 'urgent' }, { id: 'backlog' }, { id: 'yield', n: 0.5 }], [{ id: 'urgent' }, { id: 'rdv' }, { id: 'yield', n: 1 }], [{ id: 'rdv' }, { id: 'backlog' }, { id: 'sat', n: 2 }]],
  marche: [[{ id: 'rdv' }, { id: 'sat', n: 2 }, { id: 'travel', n: 5 }], [{ id: 'rdv' }, { id: 'travel', n: 5 }, { id: 'yield', n: 0.5 }], [{ id: 'backlog' }, { id: 'sat', n: 2 }, { id: 'travel', n: 6 }]],
  orage: [[{ id: 'urgent' }, { id: 'yield', n: 1.5 }, { id: 'rdv' }], [{ id: 'urgent' }, { id: 'backlog' }, { id: 'yield', n: 1 }], [{ id: 'urgent' }, { id: 'rdv' }, { id: 'sat', n: 2 }]],
  // frost: the urgent meters are easy to see; holding the RDV and the mood on top of them is the job
  gel: [[{ id: 'urgent' }, { id: 'rdv' }, { id: 'sat', n: 2 }], [{ id: 'urgent' }, { id: 'sat', n: 2 }, { id: 'travel', n: 4 }], [{ id: 'rdv' }, { id: 'sat', n: 2 }, { id: 'travel', n: 4 }]],
  // thaw: water runs away, the cap on m³ lost is the real test
  redoux: [[{ id: 'urgent' }, { id: 'm3', n: 30 }, { id: 'rdv' }], [{ id: 'urgent' }, { id: 'rdv' }, { id: 'travel', n: 4 }], [{ id: 'm3', n: 30 }, { id: 'backlog' }, { id: 'rdv' }]],
  pluie: [[{ id: 'rdv' }, { id: 'sat', n: 3 }, { id: 'yield', n: 0.5 }], [{ id: 'rdv' }, { id: 'backlog' }, { id: 'sat', n: 2 }], [{ id: 'backlog', n: 1 }, { id: 'sat', n: 2 }, { id: 'yield', n: 1 }]],
};
/** What the chef says at the briefing ({nom} and {masc|fém} are filled in by the UI). */
export const CHEF: Record<string, string[]> = {
  calme: ['Ciel bleu sur Avignon, {nom}. Pas d’excuse : on solde la pile et on tient les RDV.', 'Journée calme annoncée. Profites-en pour ranger ce qui traîne, les compteurs n’attendent pas.'],
  mistral: ['Mistral fort, {nom}. Garde de la place dans le planning : en général, le téléphone sonne.', 'Rafales à 80 km/h : les chantiers de chaussée prennent du retard. Laisse de la marge.'],
  marche: ['Jour de marché aux Halles : évite les allers-retours vers la place Pie.', 'Les Halles débordent sur la place Pie, {nom}. Groupe les adresses, sinon on passe la journée dans le fourgon.'],
  orage: ['L’orage a secoué le réseau : une casse sur conduite et une fuite sur branchement. Chaque heure, ce sont des mètres cubes perdus.', 'Nuit d’orage, sols qui bougent : une conduite a cassé, un branchement fuit. Lulu pour le réseau, Fred pour le branchement, {nom}.'],
  pluie: ['Pluie fine : rien qui arrête un capybara. Les abonnés, eux, aiment qu’on soit à l’heure.', 'Il pleut, les capys sont ravis. Toi, garde un œil sur les RDV et le moral des abonnés.'],
  gel: ['Gel cette nuit, {nom} : des compteurs ont éclaté dans les niches. Les abonnés sans eau passent avant tout le reste.', '−6 °C au petit matin. Compteurs gelés, abonnés sans eau, et les voisins vont appeler aussi : garde un capy PRC disponible.'],
  redoux: ['Redoux : le sol dégèle et les tuyaux lâchent. Une casse sur conduite et une fuite sur branchement, chaque heure coûte des m³.', 'Il fait doux, et c’est maintenant que la fonte casse, {nom}. Lulu sur la conduite, Fred sur le branchement, Josette à l’écoute.'],
  festival: [],
};
const FRIDAY = [' Et c’est vendredi : on solde ce qui traîne avant le week-end.', ' Dernière journée de la quinzaine : après, bilan avec moi. Tout compte !'];

/** Candidate k for a day (deterministic: seed, day, k). The Festival day keeps its card, calls and objectives. */
export function candidate(seed: number, day: number, k: number, prevCard?: string, season?: Season): DaySpec {
  const base = seasonDays(season)[day]; const r = rng(seed * 7919 + day * 131 + k * 17 + 3); const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const beats = base.events.filter(([, id]) => BEAT.test(id));
  // story days keep their card, calls and objectives: the Festival (summer), the Grand froid (winter)
  const story = base.card === 'festival' || (season === 'hiver' && day === 6);
  const card = story ? base.card : pick(SEASONS[season ?? 'ete'].cards.filter((c) => c !== prevCard));
  const n = Math.max(10, Math.min(15, base.jobs.length + Math.floor(r() * 3) - 1));
  const bag = MIXES[pick(Object.keys(MIXES))]; const off = Math.floor(r() * bag.length);
  const jobs: (JobId | [JobId, ...Risk[]])[] = [];
  if (card === 'orage' || card === 'redoux') jobs.push(['fuite_bt'], ['casse']); // the storm / the thaw: a branchement (PRC) and a conduite (réseau)
  if (card === 'redoux') jobs.push(['debit_nuit']); // the thaw also opens invisible leaks: the night flow goes up
  if (card === 'gel') jobs.push(['gel_cpt'], ['gel_cpt']); // two subscribers without water at the briefing
  const objs = story ? base.objs : pick(TRIOS[card]);
  if (objs.some((o) => o.id === 'urgent') && !['orage', 'redoux', 'gel'].includes(card) && !beats.length) jobs.push(['fuite_bt']);
  if (!story && card !== 'gel' && (base.jobs.some((j) => j[0] === 'coupure') || r() < 0.3) && day < 9) jobs.push(['coupure']);
  for (let i = 0; jobs.length < n; i++) jobs.push([bag[(off + i) % bag.length]]);
  for (let i = 0, want = 2 + Math.floor(r() * 2); i < 12 && want > 0; i++) { const [risk, on] = pick(RISK_ON); const j = jobs.find((x) => on.includes(x[0] as JobId) && x.length === 1 && r() < 0.6); if (j) { (j as JobId[]).push(risk as never); want--; } }
  const used = new Set(beats.map(([s]) => s)); const events: [number, string][] = [...beats];
  const room = Math.max(0, 3 - beats.length); const fill = [...FILLERS[card]].sort(() => r() - 0.5).slice(0, room ? 1 + Math.floor(r() * room) : 0);
  for (const id of fill) { let s = 1 + Math.floor(r() * 5); for (let t = 0; t < 5 && used.has(s); t++) s = 1 + (s % 5); if (!used.has(s)) { used.add(s); events.push([s, id]); } }
  events.sort((a, b) => a[0] - b[0]);
  const rdv = Math.max(1, Math.min(3, base.rdv + Math.floor(r() * 3) - 1));
  const chef = story ? base.chef : pick(CHEF[card]) + (day === 9 ? FRIDAY[1] : day === 4 ? FRIDAY[0] : '');
  return { card, jobs, rdv, events, objs, chef };
}

/** Proof: 3 ★ reached by the search player from this morning (the same tries as « Si c'était à refaire »). */
export function proves(g0: Game, spec: DaySpec, budget = 24): number {
  const g = structuredClone(g0); (g.specs ??= {})[g.day] = spec; startDay(g);
  for (let k = 0; k < budget; k++) { const h = tryDay(g, g.seed * 7919 + g.day * 104729 + k * 31 + 5, k < 3 ? 0 : Math.min(1, (k / budget) * 1.5), k < 3 ? 0.15 * k : 0.35, k < 6 ? 0 : (k % 5) * 0.06, 1, false); if (h.today!.stars === 3) return k + 1; }
  return 0;
}
export const stats = { made: 0, fallback: 0, cands: 0, tries: 0 };
/** Drafts tried per day (twice as many for the « Tournée du jour », which has no scripted day it would be fair to fall back on). */
export const CANDIDATES = 4;
export function generate(g: Game) {
  const prev = g.day ? (g.specs?.[g.day - 1] ?? seasonDays(g.season)[g.day - 1]).card : undefined;
  for (let k = 0, n = g.daily ? 2 * CANDIDATES : CANDIDATES; k < n; k++) { const c = candidate(g.seed, g.day, k, prev, g.season); stats.cands++; const n = proves(g, c, g.daily ? 48 : 24);
    if (n) { stats.made++; stats.tries += n; (g.specs ??= {})[g.day] = c; return c; } }
  stats.fallback++; (g.specs ??= {})[g.day] = structuredClone(seasonDays(g.season)[g.day]); return null;
}
hooks.beforeDay = generate;
/** JobIds used anywhere (for the tests: the generator never invents a job). */
export const KNOWN_JOBS = Object.keys(JOBS);
