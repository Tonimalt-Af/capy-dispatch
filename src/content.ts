// Game content for v0.1: job types, the capybara team, risks, decision cards, the 10 scripted days.
// Vocabulary is the real one of drinking-water operators (sources on the design Page): PRC, poste de comptage,
// ATU, débit de nuit, avis de passage, avis de coupure 48 h, résiliés qui consomment...

export type Skill = 'icc' | 'reseau' | 'fuite';
// Two real trades (Maxime, 2026-11-01; sources on the design Page): « PRC » = the classic works at the subscriber's and on the
// branchement (compteurs, postes de comptage, branchements), « Réseau » = the big pipes under the street (conduites, vannes,
// purges, poteaux incendie, casses). The ids stay 'icc' / 'reseau' so saves keep working.
export const SKILL_NAME: Record<Skill, string> = { icc: 'PRC · compteurs et branchements', reseau: 'Réseau · conduites et vannes', fuite: 'Recherche de fuite' };
export const SKILL_SHORT: Record<Skill, string> = { icc: 'PRC', reseau: 'Réseau', fuite: 'Fuite' };

export type JobId = 'fuite_bt' | 'fuite_pc' | 'prc' | 'introuvable' | 'resilie' | 'coupure' | 'debit_nuit' | 'purge' | 'poteau' | 'fontaine' | 'casse' | 'gel_cpt';
export interface JobType {
  id: JobId; name: string; short: string; skill: Skill; /** base duration in slots */ dur: number;
  urgent?: boolean; /** digging under the road: ATU + gas call before starting */ dig?: boolean;
  /** m³ lost per slot while not repaired */ leak?: number; /** background loss removed for good once done (m³/day) */ fix?: number;
  minigame?: 'compteur'; /** needs a 48 h cut notice */ coupure?: boolean; icon: string; desc: string;
  /** day log lines: {c} capy, {who} subscriber, {rue} « rue du Roi René » */ go: string; fin: string;
  /** phase 2 hooks (data only, no UI yet) */ side: 'avant' | 'apres' | 'na'; habilitation: string | null;
}
export const JOBS: Record<JobId, JobType> = {
  fuite_bt: { id: 'fuite_bt', name: 'Fuite sur branchement', short: 'Fuite branchement', skill: 'icc', dur: 2, urgent: true, dig: true, leak: 6, icon: 'drop', side: 'avant', habilitation: 'AIPR', go: "{c} ouvre la chaussée {rue}", fin: "{c} a réparé le branchement {rue} : plus une goutte !", desc: "De l'eau sort du trottoir : c'est le branchement, le petit tuyau entre la conduite et le compteur. Petite fouille (ATU), on change le collier ou le raccord. Appel à l'exploitant gaz avant de creuser." },
  casse: { id: 'casse', name: 'Casse sur conduite (DN 150)', short: 'Casse conduite', skill: 'reseau', dur: 3, urgent: true, dig: true, leak: 8, icon: 'pipe', side: 'avant', habilitation: 'AIPR', go: "{c} ferme les vannes et ouvre la fouille {rue}", fin: "{c} a posé le manchon sur la conduite {rue}, l'eau revient", desc: "La grosse conduite sous la rue a cédé. Équipe réseau : fermer les vannes autour, signalisation, fouille à la mini-pelle, couper le tronçon abîmé et poser un manchon, puis purger avant de remettre l'eau." },
  fuite_pc: { id: 'fuite_pc', name: 'Fuite au poste de comptage', short: 'Fuite compteur', skill: 'icc', dur: 1, leak: 1, icon: 'meterdrop', side: 'avant', habilitation: null, go: "{c} file au compteur qui goutte chez {who}", fin: "{c} a changé le joint chez {who}", desc: 'Le joint du compteur goutte dans le regard. Changer les joints, contrôler le robinet avant compteur.' },
  prc: { id: 'prc', name: 'Remplacement de compteur (PRC)', short: 'PRC', skill: 'icc', dur: 1, icon: 'meter', side: 'na', habilitation: null, go: "{c} sonne chez {who}, {rue}", fin: "{c} a posé le compteur neuf chez {who}", desc: "Compteur de plus de 15 ans à remplacer. Rendez-vous pris avec l'abonné : relever l'index, poser, plomber, photo." },
  introuvable: { id: 'introuvable', name: 'Compteur introuvable', short: 'Introuvable', skill: 'icc', dur: 1, minigame: 'compteur', icon: 'search', side: 'na', habilitation: null, go: "{c} part à la chasse au compteur {rue}", fin: "{c} a mis la main sur le compteur {rue}", desc: "La télérelève ne répond plus et personne ne sait où est le compteur. Le SIG donne une piste, à toi de le trouver sur la façade." },
  resilie: { id: 'resilie', name: '« Résilié qui consomme »', short: 'Résilié', skill: 'icc', dur: 1, icon: 'ghost', side: 'na', habilitation: null, go: "{c} mène l'enquête sur le résilié {rue}", fin: "{c} a résolu le mystère du résilié {rue}", desc: "Contrat résilié mais l'index continue de tourner. Enquête : nouvel occupant, fuite, ou branchement oublié ?" },
  coupure: { id: 'coupure', name: 'Réparation programmée avec coupure', short: 'Coupure programmée', skill: 'reseau', dur: 2, dig: true, coupure: true, fix: 25, icon: 'valve', side: 'avant', habilitation: 'AIPR', go: "{c} coupe l'eau {rue} pour changer la vanne", fin: "{c} a changé la vanne {rue}, l'eau revient", desc: "Changer une vanne de sectionnement sur la conduite (chantier de l'équipe réseau, mini-pelle et signalisation). Les riverains doivent recevoir l'avis de coupure 48 h avant : envoie-le, le chantier sera possible 2 jours plus tard." },
  debit_nuit: { id: 'debit_nuit', name: 'Débit de nuit anormal', short: 'Débit de nuit', skill: 'fuite', dur: 1, fix: 55, icon: 'ear', side: 'avant', habilitation: null, go: "{c} écoute le sol {rue}, casque sur les oreilles", fin: "{c} a trouvé la fuite cachée {rue} !", desc: "La sectorisation voit un débit de nuit trop haut : une fuite invisible. Écoute au sol, prélocalisateurs, puis réparation sans ouvrir grand." },
  purge: { id: 'purge', name: 'Purge (eau colorée)', short: 'Purge', skill: 'reseau', dur: 1, icon: 'tap', side: 'avant', habilitation: null, go: "{c} ouvre la purge {rue}", fin: "{c} : l'eau est redevenue claire {rue}", desc: "Après une manœuvre de vanne sur la conduite, l'eau sort couleur thé. Ouvrir la purge du réseau jusqu'à ce qu'elle redevienne claire, contrôler le chlore." },
  fontaine: { id: 'fontaine', name: 'Borne-fontaine en panne', short: 'Borne-fontaine', skill: 'reseau', dur: 1, icon: 'tap', side: 'avant', habilitation: null, go: "{c} démonte la borne-fontaine {rue}", fin: "{c} a remis en route la borne-fontaine {rue}", desc: "La borne-fontaine publique ne donne plus qu'un filet : robinet fatigué ou filtre entartré. Démonter, nettoyer, remonter, contrôler le débit (et goûter, c'est le métier)." },
  gel_cpt: { id: 'gel_cpt', name: 'Compteur gelé (abonné sans eau)', short: 'Compteur gelé', skill: 'icc', dur: 1, urgent: true, icon: 'snowmeter', side: 'avant', habilitation: null, go: "{c} file chez {who}, plus une goutte au robinet {rue}", fin: "{c} a changé le compteur gelé chez {who} : l'eau revient !", desc: "Nuit à −6 °C : l'eau a gelé dans le compteur, le verre a éclaté, l'abonné n'a plus d'eau. Fermer le robinet avant compteur, poser un compteur neuf, puis caler du polystyrène extrudé dans la niche (pas de paille ni de laine de verre : ça garde l'humidité). Si c'est le tuyau qui a gelé, sèche-cheveux, jamais de flamme." },
  poteau: { id: 'poteau', name: 'Poteau incendie heurté', short: 'Poteau incendie', skill: 'reseau', dur: 1, urgent: true, leak: 8, icon: 'hydrant', side: 'avant', habilitation: null, go: "{c} fonce fermer le poteau incendie {rue}", fin: "{c} a fermé le poteau incendie {rue} : fin du geyser", desc: "Une camionnette de livraison a couché un poteau incendie. Fermer la vanne et sécuriser, l'eau jaillit !" },
};

export type CapyId = 'josette' | 'momo' | 'lulu';
export interface Capy { id: CapyId; name: string; job: string; main: Skill; second: Skill | null; color: string; hat: string; trait: string }
/** Secondary skill: the job takes one more slot. */
export const TEAM: Capy[] = [
  { id: 'josette', name: 'Josette', job: 'Technicienne recherche de fuite (équipe réseau)', main: 'fuite', second: 'reseau', color: '#E86A92', hat: '#FFFFFF', trait: "Oreille d'or : sur une fuite, elle trouve le point exact du premier coup. Pas d'heure en plus, même hors de son métier." },
  { id: 'momo', name: 'Fred', job: 'Technicien PRC : compteurs et branchements', main: 'icc', second: null, color: '#F39A2B', hat: '#FFFFFF', trait: 'Tout le monde l\'adore : chaque intervention chez un client fait gagner 1 point d\'abonnés. Il accepte souvent le café.' },
  { id: 'lulu', name: 'Lulu', job: 'Technicienne réseau : conduites et vannes', main: 'reseau', second: 'icc', color: '#2FA4A9', hat: '#FFFFFF', trait: 'Passe en fourgon dans les ruelles où personne ne passe : le risque « ruelle étroite » ne la gêne jamais.' },
];
export const CAPY = Object.fromEntries(TEAM.map((c) => [c.id, c])) as Record<CapyId, Capy>;
/** Slots a capy needs for a job: base, +1 on a secondary skill; null when it can't do it at all. */
export function slotsFor(c: Capy, j: JobType): number | null { if (c.main === j.skill) return j.dur; if (c.second === j.skill) return c.id === 'josette' && j.leak ? j.dur : j.dur + 1; return null; }
/** Lulu's trait: narrow streets never slow her down. */
export const ignoresRisk = (c: CapyId, r: Risk) => c === 'lulu' && r === 'ruelle';

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
  /** the new ticket is a VIP one (rules in VIPS) */ vip?: VipId;
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
  // winter (sources on the design Page: Midi Libre 10/02/2012, Gard rhodanien and Grand Avignon, 350 interventions for frozen
  // meters in a few days; Saur and RESE 17 after the 2026 frost: leaks show up at the thaw, many of them after the meter)
  gel_voisin: { id: 'gel_voisin', title: '« Chez moi non plus ! »', who: 'kevin', needs: 'none', text: "La voisine de l'abonné au compteur gelé appelle : même rue, même niche plein nord, même gel. Plus une goutte au robinet.", choices: [
    { label: 'Créer le ticket', hint: 'Nouvel abonné sans eau à placer', fx: { addTicket: 'gel_cpt', log: 'Un voisin aussi a le compteur gelé' } }] },
  standard: { id: 'standard', title: 'Le standard explose', who: 'chef', needs: 'none', text: "« Depuis 6 h, un appel par minute : des abonnés sans eau, partout. Le central peut en garder pour demain, mais il fait −8 dehors. »", choices: [
    { label: 'On en prend un de plus', hint: 'Nouvel abonné sans eau, abonnés +1', fx: { addTicket: 'gel_cpt', sat: 1, log: 'On prend un compteur gelé de plus' } },
    { label: 'Le central les garde', hint: 'Abonnés −2', fx: { sat: -2, log: 'Le central garde les compteurs gelés pour demain' } }] },
  apres_cpt: { id: 'apres_cpt', title: '« Ça coule dans mon garage ! »', who: 'kevin', needs: 'none', text: "Le compteur va bien : c'est le tuyau de l'abonnée, après le compteur, qui a éclaté avec le gel. Ça, c'est pour son plombier. Mais elle ne sait même pas où est son compteur pour fermer.", choices: [
    { label: 'Lui expliquer au téléphone', hint: 'Abonnés −1', fx: { sat: -1, log: "Kevin explique où fermer, au téléphone. Pas simple." } },
    { label: 'Envoyer un capy lui montrer', hint: 'Nouveau ticket « introuvable », abonnés +1', fx: { addTicket: 'introuvable', sat: 1, log: 'Un capy va montrer son compteur à une abonnée' } }] },
  degel_cpt: { id: 'degel_cpt', title: 'Le compteur pleure au dégel', who: 'kevin', needs: 'none', text: "Avec le redoux, la glace fond dans la niche : le compteur gelé cette semaine s'est fendu, et maintenant ça goutte.", choices: [
    { label: 'Créer le ticket', hint: 'Nouvelle fuite au compteur', fx: { addTicket: 'fuite_pc', log: 'Un compteur fendu par le gel fuit au dégel' } }] },
  manchon: { id: 'manchon', title: 'Plus de manchons !', who: 'capy', needs: 'dig', text: "Troisième casse de la semaine : il n'y a plus de manchon de DN 150 dans le fourgon.", choices: [
    { label: 'Passer au magasin de l’agence', hint: '+1 créneau', fx: { slots: 1, log: 'est passé au magasin chercher un manchon' } },
    { label: 'Collier provisoire, on reviendra', hint: 'Abonnés −2', fx: { sat: -2, log: 'a posé un collier provisoire en attendant' } }] },
  voiture: { id: 'voiture', title: 'Voiture sur le regard', who: 'capy', needs: 'job', text: 'Une voiture est garée pile sur la plaque du regard. Pas de mot sur le pare-brise.', choices: [
    { label: 'Attendre le propriétaire', hint: '+1 créneau', fx: { slots: 1, log: 'a attendu le propriétaire de la voiture' } },
    { label: 'Appeler la police municipale', hint: 'Satisfaction −2', fx: { sat: -2, log: 'a fait déplacer la voiture par la police municipale' } }] },
  vestiges: { id: 'vestiges', title: 'Des pierres taillées !', who: 'capy', needs: 'dig', text: "En creusant, la pelle bute sur des pierres taillées très anciennes. Intra-muros, ça arrive. Une découverte fortuite se déclare en mairie.", choices: [
    { label: 'Arrêter et déclarer', hint: '+1 créneau · c’est la loi', fx: { slots: 1, sat: 2, log: 'a déclaré une découverte archéologique (bravo)' } },
    { label: 'Reboucher discrètement', hint: 'Satisfaction −6 · très mal vu', fx: { sat: -6, log: 'a rebouché des vestiges sans les déclarer…' } }] },
  hydrocureur: { id: 'hydrocureur', title: 'L’hydrocureur bloque la rue', who: 'ours', needs: 'travel', text: "Le camion hydrocureur de Générale des Flots (ils gèrent les égouts) bloque la rue. Leur chef de chantier, un ours, hausse les épaules.", choices: [
    { label: 'Faire le tour par les remparts', hint: '+1 créneau de trajet', fx: { slots: 1, log: "a contourné l'hydrocureur par les remparts" } },
    { label: 'Négocier avec l’ours', hint: 'Satisfaction −1 (klaxons)', fx: { sat: -1, log: "a négocié avec l'ours de Générale des Flots, qui a avancé de 3 m" } }] },
  prefet: { id: 'prefet', title: 'Le majordome du préfet', who: 'chat', needs: 'none', text: "Hôtel Forbin de Sainte-Croix, 2 place de la Préfecture. « Monsieur le préfet souhaite que son compteur soit changé ce jour. Avant 15 heures, si possible. » Le majordome, un chat noir très digne, attend à la grille.", choices: [
    { label: 'Accepter le RDV', hint: 'Nouveau PRC, RDV dans les 2 prochains créneaux', fx: { addTicket: 'prc', addRdvSoon: true, log: "RDV accepté à l'hôtel Forbin de Sainte-Croix (sonner chez le majordome)" } },
    { label: 'Proposer demain', hint: 'Satisfaction −3', fx: { sat: -3, log: 'RDV du préfet décalé à demain (le chat a soupiré)' } }] },
  directeur: { id: 'directeur', title: 'Le chef passe à l’agence', who: 'chef', needs: 'none', text: "« Je montre le planning au directeur régional cet après-midi. Pas de panique. Enfin, un peu. »", choices: [
    { label: '« Tout va bien, chef ! »', hint: 'Satisfaction +2', fx: { sat: 2, log: 'Le chef a montré le planning au directeur' } },
    { label: '« Montrez-lui aussi ce qui coince »', hint: 'Satisfaction +1 · le directeur promet un fourgon neuf (un jour)', fx: { sat: 1, log: 'Le directeur a vu ce qui coince et promis un fourgon neuf. Un jour.' } }] },
  mistral: { id: 'mistral', title: 'Le mistral emporte les barrières', who: 'capy', needs: 'dig', text: 'Une rafale couche les barrières du chantier. Il faut les lester avant de continuer.', choices: [
    { label: 'Lester les barrières', hint: '+1 créneau', fx: { slots: 1, log: 'a lesté les barrières contre le mistral' } },
    { label: 'Continuer, un capy les tient', hint: 'Satisfaction −2', fx: { sat: -2, log: 'a travaillé avec un capy accroché aux barrières' } }] },
  avis_rate: { id: 'avis_rate', title: '« Je n’ai jamais eu d’avis ! »', who: 'kevin', needs: 'none', text: 'Un riverain de la coupure programmée affirme ne pas avoir reçu l’avis. Il prend une douche dans une heure.', choices: [
    { label: 'Lui livrer un pack d’eau', hint: 'Satisfaction +1', fx: { sat: 1, log: "Pack d'eau livré au riverain de la coupure" } },
    { label: 'Rappeler que l’avis était affiché', hint: 'Satisfaction −2', fx: { sat: -2, log: "Riverain mécontent (l'avis était bien affiché)" } }] },
  // VIP / political surprises (fictional roles, never real people). Private homes: a random real address; public buildings: their real address.
  vip_patron: { id: 'vip_patron', title: 'Fuite chez le patron !', who: 'kevin', needs: 'none', text: "« Allô Kevin ? Le directeur régional de la Lyonnaise des Robinets. J'ai une fuite au compteur, chez moi. Je ne demande aucun traitement de faveur. Mais vite. » Il a raccroché. Heureusement, son adresse est dans le SIG.", choices: [
    { label: 'Créer le ticket VIP', hint: 'Fuite compteur · commencer en 1 h : +3 · après 4 h : −4 et une étoile de moins', fx: { addTicket: 'fuite_pc', vip: 'patron', log: 'Ticket VIP : fuite chez le directeur régional' } },
    { label: 'Lui conseiller une serpillière', hint: 'Satisfaction −6 · on en reparlera', fx: { sat: -6, log: 'A conseillé une serpillière au directeur régional. Courageux.' } }] },
  vip_conseils: { id: 'vip_conseils', title: 'Le directeur regarde', who: 'capy', needs: 'job', text: "Le directeur régional est en chaussons, les bras croisés, à 30 cm du regard. « Moi, à votre place, je serrerais d'abord à gauche. J'ai fait ce métier en 1987, vous savez. »", choices: [
    { label: 'Écouter ses conseils', hint: '+1 créneau · satisfaction +1', fx: { slots: 1, sat: 1, log: 'a écouté le directeur raconter 1987 (et a serré à gauche)' } },
    { label: '« Merci, on s’en occupe ! »', hint: 'Satisfaction −1', fx: { sat: -1, log: 'a rendu poliment la clé à molette au directeur' } }] },
  vip_rival: { id: 'vip_rival', title: 'Le concurrent appelle… chez nous', who: 'kevin', needs: 'none', text: "« Bonjour, ici le directeur régional de la Générale des Flots. À la maison, l'eau, c'est vous. Mon compteur fuit, et je connais les délais du contrat par cœur. » Kevin a un tout petit sourire.", choices: [
    { label: 'Créer le ticket (délai du contrat : 4 h)', hint: 'Commencer entre 2 h et 4 h : +2 · après 4 h : plainte en mairie, −5', fx: { addTicket: 'fuite_pc', vip: 'rival', log: 'Ticket VIP : le directeur de la Générale des Flots est notre abonné' } }] },
  vip_maire: { id: 'vip_maire', title: 'Branle-bas à l’hôtel de ville', who: 'kevin', needs: 'none', text: "Le cabinet du maire appelle : l'eau des carafes de la salle du conseil sort couleur thé. Conseil municipal à 15 h, hôtel de ville, 15 place de l'Horloge.", choices: [
    { label: 'Envoyer une purge', hint: 'Commencer en 2 h : +3 · à partir de 4 h : −4', fx: { addTicket: 'purge', vip: 'maire', log: "Ticket VIP : purge à l'hôtel de ville avant le conseil municipal" } },
    { label: 'Proposer des bouteilles d’eau', hint: 'Satisfaction −2', fx: { sat: -2, log: "Le conseil municipal se tiendra à l'eau en bouteille" } }] },
  vip_agglo: { id: 'vip_agglo', title: 'Le président de l’agglo a une fuite', who: 'kevin', needs: 'none', text: "Demain, l'agglo vote l'appel d'offres de l'eau. Ce matin, son président a une fuite au compteur. Tout le monde va regarder si on le traite « comme les autres ».", choices: [
    { label: 'Le traiter comme tout le monde', hint: 'Commencer entre 2 h et 3 h : +3 · en 1 h : soupçon de passe-droit · après 4 h : −3', fx: { addTicket: 'fuite_pc', vip: 'agglo', log: "Ticket VIP : fuite chez le président de l'agglo" } }] },
  // Festival d'Avignon (real places at their real OSM address, no real people; the Off theatre is not named)
  fest_cour: { id: 'fest_cour', title: 'Fuite devant la Cour d’honneur', who: 'kevin', needs: 'none', text: "La régie du Festival appelle : de l'eau remonte entre les pavés, juste devant l'entrée de la Cour d'honneur du Palais des Papes : c'est la conduite de la place. Générale ce soir, et les techniciens son tiennent à garder les pieds secs.", choices: [
    { label: 'Créer l’urgence Festival', hint: 'Casse conduite · commencer en 2 h : +5 · à partir de 4 h : −5', fx: { addTicket: 'casse', vip: 'cour', log: "Urgence Festival : fuite devant la Cour d'honneur du Palais des Papes" } }] },
  fest_off: { id: 'fest_off', title: 'Plus d’eau dans les loges', who: 'kevin', needs: 'none', text: "Un petit théâtre du Off, 15 rue des Teinturiers : plus une goutte d'eau dans les loges, et la représentation est à 19 h. Au téléphone, le comédien est déjà en costume. Il ne sort pas de son personnage.", choices: [
    { label: 'Créer le ticket', hint: 'Fuite compteur · commencer dans les 3 h : +3 · à partir de 5 h : −3', fx: { addTicket: 'fuite_pc', vip: 'off', log: 'Ticket Festival : un théâtre du Off sans eau avant la représentation' } }] },
  fest_comedien: { id: 'fest_comedien', title: 'Il reste dans son personnage', who: 'capy', needs: 'job', text: "Le comédien ouvre en costume d'avare du XVIIᵉ siècle : « Un compteur ? Et combien coûte-t-il ? Ah ! ma cassette ! » Il ne parle qu'en alexandrins.", choices: [
    { label: 'Jouer le jeu, en alexandrins', hint: '+1 créneau · satisfaction +2', fx: { slots: 1, sat: 2, log: 'a expliqué le changement de joint en alexandrins (douze pieds, vérifié)' } },
    { label: 'Sourire et serrer le joint', hint: 'Pas d’effet', fx: { log: 'a changé le joint pendant le monologue du comédien' } }] },
  fest_artiste: { id: 'fest_artiste', title: 'Une statue vivante dans la ruelle', who: 'capy', needs: 'travel', text: "Un artiste de rue, peint en bronze des pieds à la tête, a choisi la ruelle pour son numéro de statue vivante. Il ne bouge pas. C'est le principe.", choices: [
    { label: 'Applaudir et attendre la fin du numéro', hint: '+1 créneau de trajet · satisfaction +1', fx: { slots: 1, sat: 1, log: 'a applaudi la statue vivante, qui a salué puis libéré la ruelle' } },
    { label: 'Lui demander de bouger', hint: 'Satisfaction −2 (les touristes huent)', fx: { sat: -2, log: 'a demandé à la statue vivante de bouger : les touristes ont hué' } }] },
  fest_fontaine: { id: 'fest_fontaine', title: 'Canicule : la borne-fontaine est à sec', who: 'kevin', needs: 'none', text: "38 °C à l'ombre des platanes. Place des Corps-Saints, la borne-fontaine ne donne plus qu'un filet et la file de festivaliers s'allonge, gourdes à la main.", choices: [
    { label: 'Créer le ticket', hint: 'Borne-fontaine · commencer en 1 h : +4 · à partir de 3 h : −3', fx: { addTicket: 'fontaine', vip: 'fontaine', log: 'Ticket Festival : borne-fontaine à sec, place des Corps-Saints' } }] },
  capydindon: { id: 'capydindon', title: 'Le capydindon doré !', who: 'capydindon', needs: 'none', text: "Un capydindon doré se baigne dans la fontaine de la place. C'est rarissime. Toute l'équipe a le sourire.", choices: [
    { label: 'Prendre une photo', hint: 'Satisfaction +5 · autocollant rare', fx: { sat: 5, bonus: 'capydindon', log: 'Le capydindon doré a été aperçu !' } },
    { label: 'Le laisser se baigner en paix', hint: 'Satisfaction +3', fx: { sat: 3, log: 'Le capydindon doré a fini son bain tranquille. Les touristes, eux, ont filmé.' } }] },
};

/** VIP tickets: the delay between the call and the START of the job decides how it goes (fast / mid / late).
 * Not started on the day of the call = late. Fictional roles only; who lives where is never a real person's home. */
export type VipId = 'patron' | 'rival' | 'maire' | 'agglo' | 'cour' | 'off' | 'fontaine';
export interface VipOutcome { sat: number; log: string; /** one star less for the day */ star?: boolean }
export interface Vip { who: string; tag: string; fastMax: number; lateMin: number; fast: VipOutcome; mid: VipOutcome; late: VipOutcome; rule: string; /** real public address (number, street) */ site?: [number, string]; /** card played when the job starts */ watch?: string }
export const VIPS: Record<VipId, Vip> = {
  patron: { who: 'Directeur régional de la Lyonnaise des Robinets (notre patron)', tag: 'Patron', fastMax: 1, lateMin: 4, watch: 'vip_conseils',
    fast: { sat: 3, log: 'Le directeur régional est bluffé : « Voilà une agence qui tourne ! »' },
    mid: { sat: 0, log: "Le directeur régional a noté l'heure d'arrivée dans son carnet. Sans commentaire." },
    late: { sat: -4, star: true, log: 'Le directeur régional a attendu. Il en parlera à la réunion de lundi (une étoile de moins).' },
    rule: "Commencer en 1 h ou moins : satisfaction +3. À partir de 4 h, ou pas commencé aujourd'hui : satisfaction −4 et une étoile de moins. Il donnera des conseils pendant le chantier." },
  rival: { who: 'Directeur régional de la Générale des Flots (le concurrent)', tag: 'Concurrent', fastMax: 1, lateMin: 5,
    fast: { sat: 0, log: "Le directeur de la Générale des Flots n'a même pas eu le temps de regarder sa montre. Dommage." },
    mid: { sat: 2, log: "Le directeur de la Générale des Flots a attendu juste ce qu'il faut, dans les délais du contrat. À l'agence, on sourit." },
    late: { sat: -5, log: 'Délai du contrat dépassé : le directeur de la Générale des Flots a écrit à la mairie. Ça fait mauvais genre.' },
    rule: "Délai du contrat : commencer dans les 4 h. Entre 2 h et 4 h : satisfaction +2 (et l'équipe sourit). En 1 h : rien de spécial. Au-delà, ou pas commencé aujourd'hui : plainte en mairie, satisfaction −5." },
  maire: { who: 'Cabinet du maire (conseil municipal à 15 h)', tag: 'Mairie', fastMax: 2, lateMin: 4, site: [15, "Place de l'Horloge"],
    fast: { sat: 3, log: "L'eau des carafes est limpide : le conseil municipal commence à l'heure." },
    mid: { sat: 0, log: "Purge finie de justesse, les carafes sont remplies pendant l'appel des élus." },
    late: { sat: -4, log: "Le conseil municipal s'est ouvert avec des bouteilles d'eau. Un élu a posé une question sur le service de l'eau." },
    rule: "Commencer en 2 h ou moins : satisfaction +3. À partir de 4 h, ou pas commencé aujourd'hui : satisfaction −4." },
  agglo: { who: "Président de l'agglo (vote de l'appel d'offres demain)", tag: 'Agglo', fastMax: 1, lateMin: 4,
    fast: { sat: -1, log: "Arrivés en un clin d'œil : la presse locale parle de passe-droit. Le chef soupire." },
    mid: { sat: 3, log: "Délai normal, travail impeccable : « Comme tout le monde, et bien fait. » Le président a pris des notes." },
    late: { sat: -3, log: "Le président de l'agglo a attendu. Il citera le délai pendant le vote." },
    rule: "Le traiter comme tout le monde : commencer entre 2 h et 3 h après l'appel, satisfaction +3. En 1 h : soupçon de passe-droit, −1. À partir de 4 h, ou pas commencé aujourd'hui : −3." },
  cour: { who: "Régie du Festival (Cour d'honneur, générale ce soir)", tag: 'Festival', fastMax: 2, lateMin: 4, site: [15, 'Place du Palais'],
    fast: { sat: 5, log: "Pavés secs devant la Cour d'honneur : la régie applaudit l'équipe, la générale se jouera les pieds au sec." },
    mid: { sat: 1, log: 'Fuite réparée juste à temps pour les balances son.' },
    late: { sat: -5, log: "La générale a commencé avec une flaque devant la Cour d'honneur. La presse en parle plus que de la pièce." },
    rule: "Commencer en 2 h ou moins : satisfaction +5. À partir de 4 h, ou pas commencé aujourd'hui : satisfaction −5." },
  off: { who: 'Petit théâtre du Off (représentation à 19 h)', tag: 'Off', fastMax: 3, lateMin: 5, site: [15, 'Rue des Teinturiers'], watch: 'fest_comedien',
    fast: { sat: 3, log: "L'eau revient dans les loges : le comédien salue l'équipe d'une révérence en alexandrins." },
    mid: { sat: 0, log: 'Eau rétablie dans les loges, de justesse avant le lever de rideau.' },
    late: { sat: -3, log: "La représentation de 19 h s'est jouée sans eau dans les loges. Le comédien en a fait un monologue (très applaudi, pas pour nous)." },
    rule: "Commencer dans les 3 h : satisfaction +3. À partir de 5 h, ou pas commencé aujourd'hui : satisfaction −3. Le comédien reste dans son personnage." },
  fontaine: { who: "Ville d'Avignon (borne-fontaine, place des Corps-Saints)", tag: 'Canicule', fastMax: 1, lateMin: 3, site: [1, 'Place des Corps Saints'],
    fast: { sat: 4, log: "La borne-fontaine coule à nouveau : la file de festivaliers remplit ses gourdes et applaudit le fourgon." },
    mid: { sat: 1, log: 'Borne-fontaine réparée, la file a fondu (au sens propre, il fait 38 °C).' },
    late: { sat: -3, log: "Borne-fontaine à sec tout l'après-midi : les festivaliers ont dévalisé les épiceries." },
    rule: "Canicule : commencer en 1 h ou moins, satisfaction +4. À partir de 3 h, ou pas commencé aujourd'hui : satisfaction −3." },
};
export const vipOutcome = (v: Vip, delay: number | null): 'fast' | 'mid' | 'late' => (delay === null || delay >= v.lateMin ? 'late' : delay <= v.fastMax ? 'fast' : 'mid');

/** brief: the one-sentence briefing; fx: the two effects of the day, each with its icon (section 14). */
export interface DayCard { id: string; title: string; text: string; icon: string; brief: string; fx: [string, string][] }
export const DAY_CARDS: Record<string, DayCard> = {
  calme: { id: 'calme', title: 'Ciel bleu', text: 'Journée calme annoncée. Profitons-en pour avancer.', icon: 'sun', brief: 'Journée calme annoncée : on avance.', fx: [['sun', 'Rien de spécial'], ['clock', 'Bon jour pour solder la pile']] },
  mistral: { id: 'mistral', title: 'Mistral fort', text: 'Rafales à 80 km/h. Les chantiers de chaussée peuvent prendre du retard.', icon: 'wind', brief: 'Rafales à 80 km/h : garde de la marge.', fx: [['wind', 'Chantiers de chaussée exposés'], ['phone', 'Le téléphone sonne']], },
  marche: { id: 'marche', title: 'Marché aux Halles', text: 'Place Pie et alentours très encombrés : tout trajet vers ce secteur coûte un créneau.', icon: 'basket', brief: 'Marché aux Halles : la place Pie est bouchée.', fx: [['basket', 'Trajet vers les Halles +1 créneau'], ['van', 'Évite les allers-retours']] },
  orage: { id: 'orage', title: 'Orage cette nuit', text: 'Les sols ont bougé : deux fuites urgentes au briefing.', icon: 'storm', brief: 'L’orage a fait bouger les sols cette nuit.', fx: [['storm', 'Deux fuites urgentes'], ['drop', 'Chaque heure coûte des m³']] },
  festival: { id: 'festival', title: 'Festival d’Avignon', text: 'Intra-muros noir de monde : un trajet de plus de 350 m coûte un créneau. Arrêté municipal : pas de chantier de chaussée non urgent intra-muros, les coupures programmées attendent demain.', icon: 'sun', brief: 'Festival et canicule : intra-muros noir de monde.', fx: [['van', 'Plus de 350 m = +1 créneau'], ['warn', 'Pas de coupure programmée']] },
  gel: { id: 'gel', title: 'Gel cette nuit', text: 'Sous zéro au petit matin et mistral glacial : les compteurs gèlent dans les niches, des abonnés n’ont plus d’eau. Et quand un compteur gèle, ceux de la rue suivent.', icon: 'snow', brief: 'Nuit sous zéro : compteurs gelés.', fx: [['snow', 'Abonnés sans eau : urgent'], ['phone', 'Les voisins appellent aussi']] },
  redoux: { id: 'redoux', title: 'Redoux', text: 'Le sol dégèle et les tuyaux lâchent : c’est au dégel qu’on découvre les casses et les fuites cachées. Les m³ filent.', icon: 'thaw', brief: 'Redoux : le dégel révèle les casses.', fx: [['pipe', 'Casse et fuite au dégel'], ['ear', 'Fuites cachées : débit de nuit']] },
  pluie: { id: 'pluie', title: 'Pluie fine', text: 'Pas de quoi arrêter un capybara (ils adorent l’eau).', icon: 'rain', brief: 'Pluie fine : rien qui arrête un capybara.', fx: [['rain', 'Pas d’effet sur les trajets'], ['heart', 'Abonnés à choyer']] },
};

export type ObjId = 'urgent' | 'rdv' | 'done' | 'm3' | 'backlog' | 'travel' | 'sat' | 'yield';
export interface Obj { id: ObjId; n?: number }
export const objText = (o: Obj): string => ({
  urgent: 'Urgences prises en moins de 2 h',
  rdv: 'Tous les RDV tenus',
  done: `${o.n} interventions bouclées`,
  m3: `${o.n} m³ perdus au maximum`,
  backlog: o.n === 1 ? 'Rien qui traîne depuis plus d’un jour' : 'Rien qui traîne depuis plus de 2 jours',
  travel: o.n ? `${o.n} h de route au maximum` : 'Pas une heure perdue sur la route',
  sat: o.n ? `Abonnés : +${o.n} dans la journée` : "Des abonnés plus contents qu'au matin",
  yield: `Rendement : +${String(o.n).replace('.', ',')} pt dans la journée`,
}[o.id]);
/** Acronyms and trade words, defined on tap (the tickets keep the real jargon as titles). */
export const GLOSSARY: Record<string, string> = {
  PRC: "PRC : programme de renouvellement des compteurs (plus de 15 ans, on change). C'est aussi le nom du métier « classique » : compteurs, postes de comptage, branchements. Le métier de Fred.",
  ICC: 'ICC : interventions chez le client (compteurs, joints, enquêtes). Sur le terrain, c’est le travail de l’équipe PRC.',
  Réseau: "Réseau : les grosses conduites sous la rue, leurs vannes, purges et poteaux incendie. Un autre métier que le PRC : fouille à la mini-pelle, signalisation, AIPR. Le métier de Lulu.",
  Casse: "Casse sur conduite : la conduite principale a cédé. On isole avec les vannes, on ouvre, on pose un manchon, on purge.",
  Conduite: "Conduite : le gros tuyau sous la rue (ici DN 150, 15 cm). Les branchements s'y piquent.",
  ATU: "ATU : autorisation de travaux d'urgence, pour ouvrir la chaussée.",
  SIG: "SIG : le plan informatique du réseau (tuyaux, vannes, compteurs).",
  'Débit de nuit': "Débit de nuit : la nuit, presque personne ne consomme. Si l'eau coule quand même, c'est une fuite cachée.",
  'Résilié': 'Résilié qui consomme : le contrat est fermé mais le compteur tourne. Qui boit cette eau ?',
  Branchement: "Branchement : le petit tuyau qui relie la conduite de la rue à la maison.",
  'Poste de comptage': 'Poste de comptage : le compteur et ses robinets, souvent dans une niche ou un regard.',
  Purge: "Purge : on ouvre une vanne en bout de tuyau jusqu'à ce que l'eau redevienne claire.",
  Coupure: "Coupure programmée : on prévient les voisins 48 h avant (c'est la loi), puis on coupe l'eau le temps du chantier.",
  'Compteur gelé': "Compteur gelé : sous −5 °C, l'eau gèle dans le compteur et le fait éclater. Plus d'eau chez l'abonné. On le change, et on isole la niche au polystyrène extrudé.",
  Redoux: "Redoux : le retour du doux après le gel. C'est là que les tuyaux fragilisés cassent et que les fuites apparaissent.",
  'Après compteur': "Après compteur : tout ce qui est après le compteur appartient à l'abonné. Une fuite là, c'est son plombier (et sa facture).",
  Hivernage: "Hivernage : pour une maison vide l'hiver, on ferme le robinet avant compteur et on vidange. Sur demande, le service ferme le branchement sous la rue.",
  Introuvable: 'Compteur introuvable : la télérelève ne répond plus et personne ne sait où il est.',
};
/** One-line portrait of each capy, shown on its row and in the calls. */
export const CAPY_LINE: Record<CapyId, string> = {
  josette: "Josette, c'est la recherche de fuite : débits de nuit, casque d'écoute. Elle renforce aussi l'équipe réseau : aussi vite que Lulu sur une casse, un peu plus long sinon.",
  momo: 'Fred, c’est le PRC, le métier « classique » : compteurs, postes de comptage, branchements, enquêtes chez l’abonné. Tout le monde lui offre le café.',
  lulu: 'Lulu, c’est le réseau : les grosses conduites sous la rue, vannes, purges, poteaux incendie. Mini-pelle, signalisation, AIPR. Elle dépanne aussi sur le PRC, en un peu plus long.',
};

/** Scripted days. `jobs`: tickets created at the briefing (with optional forced risks / RDV). `events`: [slot, event id]. */
export interface DaySpec { card: string; jobs: (JobId | [JobId, ...Risk[]])[]; rdv: number; events: [number, string][]; objs: Obj[]; chef: string }
export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const DAYS_SPEC: DaySpec[] = [
  { card: 'calme', jobs: [['prc'], ['fuite_pc'], ['debit_nuit'], ['resilie'], ['purge'], ['prc'], ['fontaine']], rdv: 1, events: [[2, 'riverain']], objs: [{ id: 'done', n: 6 }, { id: 'rdv' }, { id: 'travel', n: 4 }],
    chef: "{Bienvenu|Bienvenue} à l'agence, {nom} ! Sept tickets pour commencer, trois capys, huit heures chacun. Chaque capy a son métier : touche un ticket, puis la ligne du bon capy. Et garde un œil sur le téléphone." },
  { card: 'pluie', jobs: [['prc', 'cafe'], ['prc'], ['introuvable'], ['resilie'], ['fuite_pc'], ['debit_nuit'], ['purge'], ['fontaine'], ['prc']], rdv: 2, events: [], objs: [{ id: 'done', n: 8 }, { id: 'rdv' }, { id: 'm3', n: 12 }],
    chef: "Deux RDV aujourd'hui, et un compteur que personne ne trouve. Regarde les icônes de risque : elles disent ce qui peut déborder." },
  { card: 'calme', jobs: [['fuite_bt'], ['coupure'], ['prc', 'absent'], ['debit_nuit'], ['resilie'], ['fuite_pc'], ['prc'], ['purge'], ['fontaine'], ['introuvable']], rdv: 2, events: [[3, 'voiture']], objs: [{ id: 'urgent' }, { id: 'rdv' }, { id: 'yield', n: 1 }],
    chef: "Première urgence ! On ouvre la chaussée : pense à l'appel à l'exploitant gaz avant de creuser. Et il y a une coupure à annoncer 48 h avant." },
  { card: 'mistral', jobs: [['prc'], ['introuvable', 'chien'], ['debit_nuit'], ['fuite_pc'], ['resilie'], ['prc'], ['purge'], ['prc', 'cafe'], ['fontaine'], ['purge']], rdv: 2, events: [[1, 'poteau'], [3, 'vip_rival'], [5, 'mistral']], objs: [{ id: 'urgent' }, { id: 'backlog' }, { id: 'yield', n: 0.5 }],
    chef: "Mistral fort, {nom}. Garde de la place dans le planning : en général, le téléphone sonne." },
  { card: 'calme', jobs: [['prc', 'absent'], ['prc'], ['debit_nuit'], ['introuvable', 'cave'], ['resilie'], ['fuite_pc', 'ruelle'], ['purge'], ['fontaine'], ['prc'], ['resilie'], ['debit_nuit']], rdv: 2, events: [[1, 'vip_patron'], [2, 'avis_rate'], [5, 'eau_the']], objs: [{ id: 'rdv' }, { id: 'backlog', n: 1 }, { id: 'yield', n: 1 }],
    chef: "Vendredi ! Si l'avis a été envoyé mercredi, la coupure programmée est possible aujourd'hui. On solde ce qui traîne avant le week-end." },
  { card: 'marche', jobs: [['prc'], ['prc', 'cafe'], ['debit_nuit'], ['introuvable'], ['resilie', 'chien'], ['fuite_pc'], ['coupure'], ['purge'], ['prc'], ['fontaine'], ['resilie'], ['prc']], rdv: 1, events: [[2, 'prefet'], [4, 'hydrocureur']], objs: [{ id: 'rdv' }, { id: 'sat', n: 2 }, { id: 'travel', n: 5 }],
    chef: "Jour de marché aux Halles : évite les allers-retours vers la place Pie. Nouvelle coupure à annoncer." },
  { card: 'festival', jobs: [['fuite_bt', 'ruelle'], ['prc', 'absent'], ['debit_nuit'], ['introuvable'], ['resilie'], ['prc'], ['fuite_pc'], ['prc', 'cafe'], ['resilie'], ['fontaine']], rdv: 2, events: [[1, 'fest_cour'], [2, 'fest_artiste'], [3, 'fest_fontaine'], [4, 'fest_off']], objs: [{ id: 'urgent' }, { id: 'sat' }, { id: 'yield', n: 1 }],
    chef: "Le Festival commence, {nom} ! Intra-muros, ça grouille : les trajets sont plus longs, et l'arrêté interdit les chantiers de chaussée non urgents. Le téléphone va sonner : régie, théâtres, canicule…" },
  { card: 'orage', jobs: [['fuite_bt', 'ruelle'], ['casse'], ['prc'], ['debit_nuit'], ['resilie'], ['fuite_pc'], ['introuvable'], ['prc', 'absent'], ['purge'], ['debit_nuit'], ['prc'], ['fontaine'], ['resilie']], rdv: 2, events: [[2, 'vestiges'], [4, 'poteau']], objs: [{ id: 'urgent' }, { id: 'yield', n: 1.5 }, { id: 'rdv' }],
    chef: "L'orage a secoué le réseau : une casse sur conduite et une fuite sur branchement. Chaque heure, ce sont des mètres cubes perdus. Priorité aux urgences." },
  { card: 'pluie', jobs: [['prc', 'cafe'], ['prc', 'absent'], ['prc'], ['debit_nuit'], ['debit_nuit'], ['introuvable', 'chien'], ['resilie'], ['fuite_pc'], ['purge'], ['prc'], ['purge'], ['fontaine'], ['coupure'], ['prc']], rdv: 3, events: [[1, 'directeur'], [2, 'vip_maire'], [3, 'capydindon']], objs: [{ id: 'rdv' }, { id: 'sat', n: 3 }, { id: 'm3', n: 30 }],
    chef: "Le directeur régional passe. Trois RDV, des abonnés à choyer. On montre ce que l'équipe sait faire. Tu es {prêt|prête} ?" },
  { card: 'mistral', jobs: [['fuite_bt'], ['prc', 'absent'], ['prc'], ['debit_nuit'], ['introuvable', 'cave'], ['resilie'], ['fuite_pc', 'cafe'], ['purge'], ['prc'], ['debit_nuit'], ['resilie'], ['fontaine'], ['fontaine'], ['purge'], ['debit_nuit']], rdv: 1, events: [[1, 'avis_rate'], [2, 'vip_agglo'], [4, 'poteau']], objs: [{ id: 'urgent' }, { id: 'rdv' }, { id: 'yield', n: 1 }],
    chef: "Dernière journée de la quinzaine, {nom}. Après, bilan avec moi : rendement, RDV, sécurité. Tout compte !" },
];

/** Fictional subscriber names (common Provençal surnames, no real person intended). */
export const ABONNES = ['Mme Bérard', 'M. Chabaud', 'Mme Fabre', 'M. Roux', 'Mme Imbert', 'M. Arnaud', 'Mme Reynaud', 'M. Gras', 'Mme Bonnet', 'M. Michel', 'Mme Blanc', 'M. Martin', 'Mme Garcia', 'M. Meunier', 'Mme Pons', 'M. Barral', 'Mme Jullian', 'M. Sauvan', 'Mme Ricard', 'M. Truc', 'Mme Mistral', 'M. Aubert', 'Mme Durbec', 'M. Chauvet'];
export const PREFET = "Hôtel Forbin de Sainte-Croix · résidence du préfet (sonner chez le majordome)";

/** What the caller said, for the ticket front (picked by street number, so it never changes for a ticket). */

// ---------------------------------------------------------------- seasons (Maxime, 2026-11-01: « attaque les saisons et l'hiver »)
// A fortnight belongs to one season (picked when it starts, today's season by default); the « Tournée du jour » follows the
// calendar. The Festival only happens in summer; winter has its own story day (Grand froid) and the thaw the day after.
// Sources: Midi Libre 10/02/2012, Gard rhodanien and Grand Avignon, 350 interventions in a week, nights at −10 °C
// (midilibre.fr/2012/02/10/la-saur-prendra-t-elle-en-charge-le-remplacement-des-compteurs-geles,455926.php), 15 000 calls in a
// day (midilibre.fr/2012/02/05/dma-gel-des-compteurs-d-eau-jusqu-a-15-000-appels-recus-par-la-saur,453705.php), « attention au
// dégel » (midilibre.fr/2012/02/07/des-compteurs-d-eau-vraiment-frigorifies,454730.php); polystyrène, no glass wool, hair dryer,
// never a flame (eaudugrandlyon.com/actualites/comment-proteger-compteur-eau-du-gel/, rese.fr/proteger-votre-compteur-deau);
// casses on the public network after a long frost (sudouest.fr … charente-maritime-apres-le-degel-attention-aux-fuites-27348915.php);
// hivernage du branchement (agglo-sophiaantipolis.fr règlement, annexe 4).
export type Season = 'ete' | 'automne' | 'hiver' | 'printemps';
export const SEASON_LIST: Season[] = ['printemps', 'ete', 'automne', 'hiver'];
export interface SeasonInfo { id: Season; name: string; icon: string; line: string; /** day cards the generator draws from */ cards: string[] }
export const SEASONS: Record<Season, SeasonInfo> = {
  printemps: { id: 'printemps', name: 'Printemps', icon: 'sun', line: 'Les journées rallongent, le maire relit le rapport annuel.', cards: ['calme', 'pluie', 'mistral', 'marche', 'orage'] },
  ete: { id: 'ete', name: 'Été', icon: 'sun', line: 'Festival, canicule et orages.', cards: ['calme', 'mistral', 'marche', 'orage', 'pluie'] },
  automne: { id: 'automne', name: 'Automne', icon: 'rain', line: 'Pluies d’automne et épisodes cévenols.', cards: ['pluie', 'calme', 'orage', 'marche', 'mistral'] },
  hiver: { id: 'hiver', name: 'Hiver', icon: 'snow', line: 'Gel, compteurs gelés, et les casses du redoux.', cards: ['gel', 'redoux', 'mistral', 'gel', 'calme', 'redoux'] },
};
/** Meteorological seasons (déc.–févr. = hiver). */
export const seasonOfDate = (k: string): Season => { const m = +k.slice(5, 7); return m === 12 || m <= 2 ? 'hiver' : m <= 5 ? 'printemps' : m <= 8 ? 'ete' : 'automne'; };
const D6 = DAYS_SPEC[6], D7 = DAYS_SPEC[7];
const noFest = D6.jobs.map((j) => (Array.isArray(j) ? [...j] : j)) as DaySpec['jobs'];
/** The scripted fortnight of a season: the Festival day (day 7) changes outside summer, and in winter the storm becomes the thaw. */
const SEASON_DAYS: Record<Season, DaySpec[]> = {
  ete: DAYS_SPEC,
  automne: DAYS_SPEC.map((d, i) => (i === 6 ? { ...D6, card: 'pluie', jobs: noFest, events: [[2, 'riverain'], [4, 'voiture']], objs: [{ id: 'urgent' }, { id: 'sat' }, { id: 'yield', n: 1 }],
    chef: "Pluie d'automne sur Avignon, {nom}. Les feuilles bouchent les regards et le téléphone sonne : une fuite à prendre vite, et des abonnés à garder de bonne humeur." } : d)),
  printemps: DAYS_SPEC.map((d, i) => (i === 6 ? { ...D6, card: 'calme', jobs: noFest, events: [[1, 'riverain'], [3, 'avis_rate']], objs: [{ id: 'urgent' }, { id: 'sat' }, { id: 'yield', n: 1 }],
    chef: "Printemps, {nom} : le maire relit le rapport annuel de l'agence. Rendement en hausse et abonnés contents, s'il te plaît." } : d)),
  hiver: DAYS_SPEC.map((d, i) => (i === 6 ? { card: 'gel', jobs: [['gel_cpt'], ['gel_cpt'], ['prc', 'absent'], ['debit_nuit'], ['introuvable'], ['resilie'], ['prc'], ['fuite_pc'], ['prc', 'cafe'], ['resilie'], ['purge']], rdv: 2,
    events: [[1, 'standard'], [3, 'gel_voisin'], [4, 'apres_cpt']], objs: [{ id: 'urgent' }, { id: 'sat' }, { id: 'yield', n: 0.5 }],
    chef: "Grand froid, {nom} : −8 °C cette nuit avec le mistral. Les compteurs gèlent dans les niches et des abonnés n'ont plus d'eau : ce sont tes urgences du jour. Rappelle-leur : sèche-cheveux, jamais de chalumeau." }
    : i === 7 ? { ...D7, card: 'redoux', events: [[2, 'degel_cpt'], [4, 'poteau']],
      chef: "Redoux, {nom}. Le sol dégèle et la vieille fonte lâche : une casse sur conduite et une fuite sur branchement. C'est au dégel que les tuyaux cassent, chaque heure coûte des m³." } : d)),
};
export const seasonDays = (s: Season | undefined): DaySpec[] => SEASON_DAYS[s ?? 'ete'];
export const QUOTES: Record<JobId, string[]> = {
  fuite_bt: ['« Le trottoir fait des bulles, c’est normal ? »', '« Mon chat refuse de sortir, la rue est une piscine. »', '« Ça coule depuis ce matin, j’ai mis un seau, il déborde. »'],
  fuite_pc: ['« Le compteur pleure. Un peu. Beaucoup. »', '« Il y a une flaque dans le regard, et elle grandit. »', '« J’entends goutter la nuit, je ne dors plus. »'],
  prc: ['« Le vieux compteur tourne même quand tout est fermé. »', '« Je suis là toute la matinée, sonnez fort. »', '« Le chiffre est illisible depuis 1998. »'],
  introuvable: ['« Un compteur ? Ici ? Première nouvelle. »', '« Il est peut-être sous le rosier. Ou pas. »', '« Mon grand-père savait où il était. »'],
  resilie: ['« Personne n’habite là, mais l’eau coule quand même. »', '« Le logement est vide depuis mars, paraît-il. »', '« Le compteur tourne tout seul, c’est un fantôme. »'],
  coupure: ['« Prévenez-nous avant de couper, j’ai une lessive. »', '« Encore des travaux ? Bon, si c’est pour la bonne cause. »', '« Combien de temps sans eau ? J’ai des invités. »'],
  debit_nuit: ['« La nuit, le secteur boit comme un régiment. »', '« Le compteur de secteur ne dort jamais. »', '« Quelque part, une fuite se cache. »'],
  purge: ['« L’eau sort couleur sirop de grenadine. »', '« Mon café a un goût de rouille. »', '« L’eau est jaune, même mon chien n’en veut pas. »'],
  fontaine: ['« La borne ne coule plus, les pigeons font la tête. »', '« Les touristes cherchent de l’eau fraîche. »', '« Elle crachote, puis plus rien. »'],
  casse: ['« La rue est devenue une rivière, et ça monte. »', '« Le bitume a gonflé puis il a explosé. »', '« Plus d’eau dans tout l’immeuble, et un lac devant. »'],
  gel_cpt: ['« J’ouvre le robinet, il tousse, puis plus rien. »', '« Le compteur a fait crac cette nuit. »', '« Plus d’eau, et j’ai mis le sèche-cheveux sur le tuyau, c’est bien ? »'],
  poteau: ['« Un camion a embrassé le poteau. Geyser sur la place ! »', '« Les enfants adorent, la mairie un peu moins. »', '« Il y a un jet d’eau de trois mètres devant chez moi. »'],
};
