// Game content for v0.1: job types, the capybara team, risks, decision cards, the 10 scripted days.
// Vocabulary is the real one of drinking-water operators (sources on the design Page): PRC, poste de comptage,
// ATU, débit de nuit, avis de passage, avis de coupure 48 h, résiliés qui consomment...

export type Skill = 'icc' | 'reseau' | 'fuite';
export const SKILL_NAME: Record<Skill, string> = { icc: 'Interventions client', reseau: 'Réseau', fuite: 'Recherche de fuite' };
export const SKILL_SHORT: Record<Skill, string> = { icc: 'ICC', reseau: 'Réseau', fuite: 'Fuite' };

export type JobId = 'fuite_bt' | 'fuite_pc' | 'prc' | 'introuvable' | 'resilie' | 'coupure' | 'debit_nuit' | 'purge' | 'poteau';
export interface JobType {
  id: JobId; name: string; short: string; skill: Skill; /** base duration in slots */ dur: number;
  urgent?: boolean; /** digging under the road: ATU + gas call before starting */ dig?: boolean;
  /** m³ lost per slot while not repaired */ leak?: number; /** background loss removed for good once done (m³/day) */ fix?: number;
  minigame?: 'compteur'; /** needs a 48 h cut notice */ coupure?: boolean; icon: string; desc: string;
  /** phase 2 hooks (data only, no UI yet) */ side: 'avant' | 'apres' | 'na'; habilitation: string | null;
}
export const JOBS: Record<JobId, JobType> = {
  fuite_bt: { id: 'fuite_bt', name: 'Fuite sur branchement', short: 'Fuite branchement', skill: 'reseau', dur: 2, urgent: true, dig: true, leak: 6, icon: 'drop', side: 'avant', habilitation: 'AIPR', desc: "De l'eau sort du trottoir. Il faut ouvrir la chaussée (ATU) et réparer le branchement. Appel à l'exploitant gaz avant de creuser." },
  fuite_pc: { id: 'fuite_pc', name: 'Fuite au poste de comptage', short: 'Fuite compteur', skill: 'icc', dur: 1, leak: 1, icon: 'meterdrop', side: 'avant', habilitation: null, desc: 'Le joint du compteur goutte dans le regard. Changer les joints, contrôler le robinet avant compteur.' },
  prc: { id: 'prc', name: 'Remplacement de compteur (PRC)', short: 'PRC', skill: 'icc', dur: 1, icon: 'meter', side: 'na', habilitation: null, desc: "Compteur de plus de 15 ans à remplacer. Rendez-vous pris avec l'abonné : relever l'index, poser, plomber, photo." },
  introuvable: { id: 'introuvable', name: 'Compteur introuvable', short: 'Introuvable', skill: 'icc', dur: 1, minigame: 'compteur', icon: 'search', side: 'na', habilitation: null, desc: "La télérelève ne répond plus et personne ne sait où est le compteur. Le SIG donne une piste, à toi de le trouver sur la façade." },
  resilie: { id: 'resilie', name: '« Résilié qui consomme »', short: 'Résilié', skill: 'icc', dur: 1, icon: 'ghost', side: 'na', habilitation: null, desc: "Contrat résilié mais l'index continue de tourner. Enquête : nouvel occupant, fuite, ou branchement oublié ?" },
  coupure: { id: 'coupure', name: 'Réparation programmée avec coupure', short: 'Coupure programmée', skill: 'reseau', dur: 2, dig: true, coupure: true, fix: 25, icon: 'valve', side: 'avant', habilitation: 'AIPR', desc: "Remplacer une vanne fatiguée. Les riverains doivent recevoir l'avis de coupure 48 h avant : envoie-le, le chantier sera possible 2 jours plus tard." },
  debit_nuit: { id: 'debit_nuit', name: 'Débit de nuit anormal', short: 'Débit de nuit', skill: 'fuite', dur: 1, fix: 55, icon: 'ear', side: 'avant', habilitation: null, desc: "La sectorisation voit un débit de nuit trop haut : une fuite invisible. Écoute au sol, prélocalisateurs, puis réparation sans ouvrir grand." },
  purge: { id: 'purge', name: 'Purge (eau colorée)', short: 'Purge', skill: 'reseau', dur: 1, icon: 'tap', side: 'avant', habilitation: null, desc: "Après une manœuvre, l'eau sort couleur thé. Ouvrir la purge jusqu'à ce qu'elle redevienne claire, contrôler le chlore." },
  poteau: { id: 'poteau', name: 'Poteau incendie heurté', short: 'Poteau incendie', skill: 'reseau', dur: 1, urgent: true, leak: 8, icon: 'hydrant', side: 'avant', habilitation: null, desc: "Une camionnette de livraison a couché un poteau incendie. Fermer la vanne et sécuriser, l'eau jaillit !" },
};

export type CapyId = 'josette' | 'momo' | 'lulu';
export interface Capy { id: CapyId; name: string; job: string; main: Skill; second: Skill | null; color: string; hat: string; trait: string }
/** Secondary skill: the job takes one more slot. */
export const TEAM: Capy[] = [
  { id: 'josette', name: 'Josette', job: 'Technicienne réseaux recherche de fuite', main: 'fuite', second: 'reseau', color: '#E86A92', hat: '#FFFFFF', trait: "Oreille d'or : elle entend une fuite à travers 1 m de bitume." },
  { id: 'momo', name: 'Momo', job: 'Technicien interventions chez le client', main: 'icc', second: null, color: '#F39A2B', hat: '#FFFFFF', trait: 'Tout le monde lui offre le café. Il accepte souvent.' },
  { id: 'lulu', name: 'Lulu', job: 'Technicienne réseau polyvalente', main: 'reseau', second: 'icc', color: '#2FA4A9', hat: '#FFFFFF', trait: 'Conduit le fourgon dans des ruelles où personne ne passe.' },
];
export const CAPY = Object.fromEntries(TEAM.map((c) => [c.id, c])) as Record<CapyId, Capy>;
/** Slots a capy needs for a job: base, +1 on a secondary skill; null when it can't do it at all. */
export function slotsFor(c: Capy, j: JobType): number | null { if (c.main === j.skill) return j.dur; if (c.second === j.skill) return j.dur + 1; return null; }

/** Risks are announced on the ticket at the briefing: each one MAY cost one extra slot, and the player chooses how it goes. No hidden randomness. */
export type Risk = 'chien' | 'cave' | 'ruelle' | 'absent' | 'cafe';
export const RISKS: Record<Risk, { name: string; icon: string; tip: string }> = {
  chien: { name: 'Chien', icon: 'dog', tip: 'Un chien garde le portail.' },
  cave: { name: 'Cave', icon: 'cave', tip: 'Compteur en cave, la porte est souvent fermée.' },
  ruelle: { name: 'Ruelle étroite', icon: 'lane', tip: 'Rue piétonne ou très étroite : le fourgon passe mal.' },
  absent: { name: 'RDV', icon: 'clock', tip: "Rendez-vous : l'abonné peut être absent." },
  cafe: { name: 'Café', icon: 'cup', tip: "Abonnée bavarde qui offre le café." },
};

export interface Effect {
  slots?: number; /** extra slots on the job concerned */ sat?: number; /** satisfaction points */
  postpone?: boolean; /** the ticket goes back to the pile with an "avis de passage" */
  addTicket?: JobId; addRdvSoon?: boolean; /** new ticket for today (urgent ones start losing water now) */
  log: string; bonus?: 'capydindon';
}
export interface Choice { label: string; hint: string; fx: Effect }
export interface Card { id: string; title: string; who: string; text: string; choices: Choice[]; /** what the card needs to be playable */ needs: 'job' | 'dig' | 'none' | 'travel' }

/** Risk cards: played when a job with that risk icon starts. */
export const RISK_CARDS: Record<Risk, Card> = {
  chien: { id: 'chien', title: 'Attention au chien', who: 'capy', needs: 'job', text: "Un gros chien très poli mais très décidé garde le portail. Le propriétaire est au fond du jardin.", choices: [
    { label: 'Attendre qu’il l’attache', hint: '+1 créneau', fx: { slots: 1, log: 'a attendu que le chien soit attaché' } },
    { label: 'Avis de passage, on repasse', hint: 'Ticket reporté · satisfaction −2', fx: { postpone: true, sat: -2, log: 'a laissé un avis de passage (chien)' } }] },
  cave: { id: 'cave', title: 'Compteur en cave', who: 'capy', needs: 'job', text: 'Le compteur est au sous-sol et la porte de cave est fermée. Le gardien a la clé… quelque part.', choices: [
    { label: 'Aller chercher le gardien', hint: '+1 créneau', fx: { slots: 1, log: 'est allé chercher la clé chez le gardien' } },
    { label: 'Avis de passage, on repasse', hint: 'Ticket reporté · satisfaction −2', fx: { postpone: true, sat: -2, log: 'a laissé un avis de passage (cave fermée)' } }] },
  ruelle: { id: 'ruelle', title: 'Ruelle trop étroite', who: 'capy', needs: 'job', text: 'Le fourgon ne passe pas entre les façades. Le chantier est à 80 m, avec tout le matériel.', choices: [
    { label: 'Tout porter à pied', hint: '+1 créneau', fx: { slots: 1, log: 'a porté le matériel à pied dans la ruelle' } },
    { label: 'Se garer devant, warnings', hint: 'Satisfaction −3 (klaxons)', fx: { sat: -3, log: 'a bloqué la rue le temps du chantier' } }] },
  absent: { id: 'absent', title: 'Client absent au RDV', who: 'capy', needs: 'job', text: "Personne ne répond. La boîte aux lettres déborde de prospectus. C'est la vraie plaie du métier.", choices: [
    { label: 'Laisser un avis de passage', hint: 'Le ticket revient demain · le créneau se libère', fx: { postpone: true, log: 'a laissé un avis de passage (abonné absent)' } },
    { label: "Appeler l'abonné et attendre", hint: '+1 créneau · RDV tenu', fx: { slots: 1, sat: 1, log: "a appelé l'abonné, qui est arrivé en courant" } }] },
  cafe: { id: 'cafe', title: 'Un petit café ?', who: 'capy', needs: 'job', text: "L'abonnée a fait du café et veut raconter la crue de 2003. Elle a aussi des calissons.", choices: [
    { label: 'Accepter, juste un', hint: '+1 créneau · satisfaction +4', fx: { slots: 1, sat: 4, log: 'a pris le café (et deux calissons)' } },
    { label: 'Décliner poliment', hint: 'Satisfaction −1', fx: { sat: -1, log: 'a décliné le café avec un grand sourire' } }] },
};

/** Day events (surprises during the resolution, at a scripted slot). */
export const EVENTS: Record<string, Card> = {
  riverain: { id: 'riverain', title: 'Appel d’un riverain', who: 'kevin', needs: 'none', text: "« Bonjour, il y a de l'eau qui sort du trottoir devant chez moi, ça fait des bulles. » Nouvelle fuite à planifier.", choices: [
    { label: 'Créer le ticket urgent', hint: 'Nouvelle urgence à placer', fx: { addTicket: 'fuite_bt', log: 'Nouvelle fuite sur branchement signalée par un riverain' } }] },
  poteau: { id: 'poteau', title: 'Poteau incendie couché', who: 'kevin', needs: 'none', text: 'Une camionnette de livraison a reculé un peu trop. Un geyser arrose la rue, les touristes filment.', choices: [
    { label: 'Créer le ticket urgent', hint: 'Nouvelle urgence à placer', fx: { addTicket: 'poteau', log: 'Poteau incendie heurté : urgence' } }] },
  eau_the: { id: 'eau_the', title: '« Mon eau est couleur thé »', who: 'kevin', needs: 'none', text: "Après la coupure d'hier, une abonnée appelle : l'eau sort marron. Rien de dangereux, mais elle est inquiète.", choices: [
    { label: 'Planifier une purge aujourd’hui', hint: 'Nouveau ticket (1 créneau)', fx: { addTicket: 'purge', sat: 1, log: 'Purge planifiée suite à une réclamation' } },
    { label: 'Rappeler demain', hint: 'Satisfaction −3', fx: { sat: -3, log: "Réclamation eau colorée : rappel prévu demain" } }] },
  voiture: { id: 'voiture', title: 'Voiture sur le regard', who: 'capy', needs: 'job', text: 'Une voiture est garée pile sur la plaque du regard. Pas de mot sur le pare-brise.', choices: [
    { label: 'Attendre le propriétaire', hint: '+1 créneau', fx: { slots: 1, log: 'a attendu le propriétaire de la voiture' } },
    { label: 'Appeler la police municipale', hint: 'Satisfaction −2', fx: { sat: -2, log: 'a fait déplacer la voiture par la police municipale' } }] },
  vestiges: { id: 'vestiges', title: 'Des pierres taillées !', who: 'capy', needs: 'dig', text: "En creusant, la pelle bute sur des pierres taillées très anciennes. Intra-muros, ça arrive. Une découverte fortuite se déclare en mairie.", choices: [
    { label: 'Arrêter et déclarer', hint: '+1 créneau · c’est la loi', fx: { slots: 1, sat: 2, log: 'a déclaré une découverte archéologique (bravo)' } },
    { label: 'Reboucher discrètement', hint: 'Satisfaction −6 · très mal vu', fx: { sat: -6, log: 'a rebouché des vestiges sans les déclarer…' } }] },
  hydrocureur: { id: 'hydrocureur', title: 'L’hydrocureur bloque la rue', who: 'ours', needs: 'travel', text: "Le camion hydrocureur de Générale des Flots (ils gèrent les égouts) bloque la rue. Leur chef de chantier, un ours, hausse les épaules.", choices: [
    { label: 'Faire le tour par les remparts', hint: '+1 créneau de trajet', fx: { slots: 1, log: "a contourné l'hydrocureur par les remparts" } },
    { label: 'Négocier avec l’ours', hint: 'Satisfaction −1 (klaxons)', fx: { sat: -1, log: "a négocié avec l'ours de Générale des Flots, qui a avancé de 3 m" } }] },
  prefet: { id: 'prefet', title: 'Le majordome du préfet', who: 'chat', needs: 'none', text: "« Monsieur le préfet souhaite que son compteur soit changé ce jour. Avant 15 heures, si possible. » Le majordome est un chat noir très digne.", choices: [
    { label: 'Accepter le RDV', hint: 'Nouveau PRC, RDV dans les 2 prochains créneaux', fx: { addTicket: 'prc', addRdvSoon: true, log: "RDV accepté à l'hôtel particulier du préfet" } },
    { label: 'Proposer demain', hint: 'Satisfaction −3', fx: { sat: -3, log: 'RDV du préfet décalé à demain (le chat a soupiré)' } }] },
  directeur: { id: 'directeur', title: 'Le chef passe à l’agence', who: 'chef', needs: 'none', text: "« Je montre le planning au directeur régional cet après-midi. Pas de panique. Enfin, un peu. »", choices: [
    { label: 'Tout va bien, chef', hint: 'Satisfaction +2', fx: { sat: 2, log: 'Le chef a montré le planning au directeur' } }] },
  mistral: { id: 'mistral', title: 'Le mistral emporte les barrières', who: 'capy', needs: 'dig', text: 'Une rafale couche les barrières du chantier. Il faut les lester avant de continuer.', choices: [
    { label: 'Lester les barrières', hint: '+1 créneau', fx: { slots: 1, log: 'a lesté les barrières contre le mistral' } },
    { label: 'Continuer, un capy les tient', hint: 'Satisfaction −2', fx: { sat: -2, log: 'a travaillé avec un capy accroché aux barrières' } }] },
  avis_rate: { id: 'avis_rate', title: '« Je n’ai jamais eu d’avis ! »', who: 'kevin', needs: 'none', text: 'Un riverain de la coupure programmée affirme ne pas avoir reçu l’avis. Il prend une douche dans une heure.', choices: [
    { label: 'Lui livrer un pack d’eau', hint: 'Satisfaction +1', fx: { sat: 1, log: "Pack d'eau livré au riverain de la coupure" } },
    { label: 'Rappeler que l’avis était affiché', hint: 'Satisfaction −2', fx: { sat: -2, log: "Riverain mécontent (l'avis était bien affiché)" } }] },
  capydindon: { id: 'capydindon', title: 'Le capydindon doré !', who: 'capydindon', needs: 'none', text: "Un capydindon doré se baigne dans la fontaine de la place. C'est rarissime. Toute l'équipe a le sourire.", choices: [
    { label: 'Prendre une photo', hint: 'Satisfaction +5 · autocollant rare', fx: { sat: 5, bonus: 'capydindon', log: 'Le capydindon doré a été aperçu !' } }] },
};

export interface DayCard { id: string; title: string; text: string; icon: string }
export const DAY_CARDS: Record<string, DayCard> = {
  calme: { id: 'calme', title: 'Ciel bleu', text: 'Journée calme annoncée. Profitons-en pour avancer.', icon: 'sun' },
  mistral: { id: 'mistral', title: 'Mistral fort', text: 'Rafales à 80 km/h. Les chantiers de chaussée peuvent prendre du retard.', icon: 'wind' },
  marche: { id: 'marche', title: 'Marché aux Halles', text: 'Place Pie et alentours très encombrés : tout trajet vers ce secteur coûte un créneau.', icon: 'basket' },
  orage: { id: 'orage', title: 'Orage cette nuit', text: 'Les sols ont bougé : deux fuites urgentes au briefing.', icon: 'storm' },
  pluie: { id: 'pluie', title: 'Pluie fine', text: 'Pas de quoi arrêter un capybara (ils adorent l’eau).', icon: 'rain' },
};

export type ObjId = 'urgent' | 'rdv' | 'done' | 'm3' | 'backlog' | 'travel' | 'sat';
export interface Obj { id: ObjId; n?: number }
export const objText = (o: Obj): string => ({
  urgent: `Urgences commencées en ${'2'} créneaux max après l'appel`,
  rdv: 'Tous les RDV du jour tenus',
  done: `Traiter au moins ${o.n} tickets`,
  m3: `Moins de ${o.n} m³ perdus par les fuites`,
  backlog: 'Aucun ticket de plus de 2 jours à la clôture',
  travel: `Pas plus de ${o.n} créneaux de trajet`,
  sat: 'Satisfaction en hausse sur la journée',
}[o.id]);

/** Scripted days. `jobs`: tickets created at the briefing (with optional forced risks / RDV). `events`: [slot, event id]. */
export interface DaySpec { card: string; jobs: (JobId | [JobId, ...Risk[]])[]; rdv: number; events: [number, string][]; objs: Obj[]; chef: string }
export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const DAYS_SPEC: DaySpec[] = [
  { card: 'calme', jobs: [['prc'], ['fuite_pc'], ['debit_nuit']], rdv: 1, events: [], objs: [{ id: 'done', n: 3 }, { id: 'rdv' }, { id: 'travel', n: 2 }],
    chef: "{Bienvenu|Bienvenue} à l'agence, {nom} ! Trois tickets pour commencer. Chaque capy a son métier : touche un ticket, puis la ligne du bon capy." },
  { card: 'pluie', jobs: [['prc', 'cafe'], ['prc'], ['introuvable'], ['resilie'], ['fuite_pc'], ['debit_nuit']], rdv: 2, events: [], objs: [{ id: 'done', n: 5 }, { id: 'rdv' }, { id: 'm3', n: 12 }],
    chef: "Deux RDV aujourd'hui, et un compteur que personne ne trouve. Regarde les icônes de risque : elles disent ce qui peut déborder." },
  { card: 'calme', jobs: [['fuite_bt'], ['coupure'], ['prc', 'absent'], ['debit_nuit'], ['resilie'], ['fuite_pc']], rdv: 1, events: [[3, 'voiture']], objs: [{ id: 'urgent' }, { id: 'rdv' }, { id: 'done', n: 4 }],
    chef: "Première urgence ! On ouvre la chaussée : pense à l'appel à l'exploitant gaz avant de creuser. Et il y a une coupure à annoncer 48 h avant." },
  { card: 'mistral', jobs: [['prc'], ['introuvable', 'chien'], ['debit_nuit'], ['fuite_pc'], ['resilie'], ['prc']], rdv: 2, events: [[1, 'riverain'], [5, 'mistral']], objs: [{ id: 'urgent' }, { id: 'm3', n: 30 }, { id: 'done', n: 5 }],
    chef: "Mistral fort, {nom}. Garde de la place dans le planning : en général, le téléphone sonne." },
  { card: 'calme', jobs: [['prc', 'absent'], ['prc'], ['debit_nuit'], ['introuvable', 'cave'], ['resilie'], ['fuite_pc', 'ruelle']], rdv: 2, events: [[2, 'avis_rate'], [5, 'eau_the']], objs: [{ id: 'rdv' }, { id: 'backlog' }, { id: 'done', n: 5 }],
    chef: "Vendredi ! Si l'avis a été envoyé mercredi, la coupure programmée est possible aujourd'hui. On solde ce qui traîne avant le week-end." },
  { card: 'marche', jobs: [['prc'], ['prc', 'cafe'], ['debit_nuit'], ['introuvable'], ['resilie', 'chien'], ['fuite_pc'], ['coupure']], rdv: 2, events: [[2, 'prefet']], objs: [{ id: 'rdv' }, { id: 'done', n: 6 }, { id: 'travel', n: 3 }],
    chef: "Jour de marché aux Halles : évite les allers-retours vers la place Pie. Nouvelle coupure à annoncer." },
  { card: 'calme', jobs: [['fuite_bt', 'ruelle'], ['prc', 'absent'], ['debit_nuit'], ['debit_nuit'], ['introuvable'], ['resilie'], ['fuite_pc']], rdv: 1, events: [[2, 'vestiges'], [3, 'hydrocureur']], objs: [{ id: 'urgent' }, { id: 'm3', n: 25 }, { id: 'done', n: 6 }],
    chef: "Intra-muros, on creuse rarement sans surprise. Et Générale des Flots cure les égouts dans le quartier : ça va bouchonner." },
  { card: 'orage', jobs: [['fuite_bt'], ['fuite_bt', 'ruelle'], ['prc'], ['debit_nuit'], ['resilie'], ['fuite_pc'], ['introuvable']], rdv: 1, events: [[4, 'poteau']], objs: [{ id: 'urgent' }, { id: 'done', n: 6 }, { id: 'backlog' }],
    chef: "L'orage a secoué le réseau : deux fuites urgentes. Chaque heure, ce sont des mètres cubes perdus. Priorité aux urgences." },
  { card: 'pluie', jobs: [['prc', 'cafe'], ['prc', 'absent'], ['prc'], ['debit_nuit'], ['debit_nuit'], ['introuvable', 'chien'], ['resilie'], ['fuite_pc']], rdv: 3, events: [[1, 'directeur'], [3, 'capydindon']], objs: [{ id: 'rdv' }, { id: 'done', n: 7 }, { id: 'sat' }],
    chef: "Le directeur régional passe. Trois RDV, des abonnés à choyer. On montre ce que l'équipe sait faire. Tu es {prêt|prête} ?" },
  { card: 'mistral', jobs: [['fuite_bt'], ['prc', 'absent'], ['prc'], ['debit_nuit'], ['introuvable', 'cave'], ['resilie'], ['fuite_pc', 'cafe'], ['purge']], rdv: 2, events: [[1, 'avis_rate'], [4, 'riverain']], objs: [{ id: 'urgent' }, { id: 'rdv' }, { id: 'done', n: 7 }],
    chef: "Dernière journée de la quinzaine, {nom}. Après, bilan avec moi : rendement, RDV, sécurité. Tout compte !" },
];

/** Fictional subscriber names (common Provençal surnames, no real person intended). */
export const ABONNES = ['Mme Bérard', 'M. Chabaud', 'Mme Fabre', 'M. Roux', 'Mme Imbert', 'M. Arnaud', 'Mme Reynaud', 'M. Gras', 'Mme Bonnet', 'M. Michel', 'Mme Blanc', 'M. Martin', 'Mme Garcia', 'M. Meunier', 'Mme Pons', 'M. Barral', 'Mme Jullian', 'M. Sauvan', 'Mme Ricard', 'M. Truc', 'Mme Mistral', 'M. Aubert', 'Mme Durbec', 'M. Chauvet'];
export const PREFET = "Hôtel particulier du préfet (fictif)";
