# Audit UI/UX n°2 (v0.2 en cours, 31 octobre 2026)

Captures : `previews/audit/p2/<taille>/` (844×390, 932×430, 667×375). Mêmes trois regards : designer UI mobile senior, joueur qui découvre, PM.
Scènes nouvelles : `00-creation-vide`, `00b-creation-remplie`, `23-creation-modif`.

## Ce qui a changé depuis l'audit n°1

| Constat n°1 | Correction |
|---|---|
| H1 blocs muets | Blocs sur deux lignes : icône + étiquette courte (Fuite, PRC, Débit nuit…), durée « 1 h », RDV et risques ; coche quand c'est fait, « en cours » pour le bloc actif. |
| H2 cartes tronquées | Cartes de 176 px : titre sur deux lignes, adresse, pastille métier, RDV, icônes de risque, puces d'action. |
| H3 cibles < 44 px | Tous les boutons font au moins 44 px. Les puces « Gaz ? » et « Avis 48 h » gardent leur taille visuelle mais ont une zone de toucher de 44 px (`::after`). Le test Playwright vérifie ces cibles sur chaque écran, aux trois tailles. |
| H4 texte trop petit | Échelle 12/13/15/17/20/24/32 px, 12 px au minimum (vérifié par un test), texte secondaire `#6B5443` (contraste AA sur blanc). |
| H5 identité du joueur | Écran de création (prénom, homme ou femme, pelage, tenue, accessoire). Le capy du joueur apparaît dans le HUD, au briefing, à la clôture, au bilan et sur la puce de l'accueil. |
| H6 écriture inclusive | Supprimée. Les accords passent par `agree('{prêt|prête}')` selon le sexe choisi. Un test Vitest parcourt tous les textes à la recherche de « ·e », « (e) », « /e », « iel »… |
| H7 HUD cryptique | Puces libellées : « Objectifs 0/3 », « Rendement » avec jauge et repère d'objectif, « Pertes m³ », « Abonnés ». |
| H8 risque et trajet | Prolongement hachuré « +1 h ? » de la hauteur du bloc ; trajet en petit tube bleu avec une icône de fourgon. |
| H9 accueil austère | Illustration clé (Palais des Papes, pont, Rhône, l'équipe et le fourgon), voile clair à gauche, gros bouton « Jouer ». |
| H10 coach | Coach ancré en bas de la carte, avec le prénom. |
| M1 carte | Vagues sur le Rhône, remparts crénelés avec des tours, autocollants du Palais des Papes et du pont, noms qui ne se chevauchent plus. |
| M2 dépôt | Fourgon « Agence » à la place de la pastille. |
| M3 façade | Pierre de taille, chaînages d'angle, génoise, tuiles canal, persiennes, balcon en fer forgé, porte cochère avec claveaux, lanterne, pavés. La règle tient dans la colonne de droite. |
| M4 et M5 clôture et bilan | Étoiles animées, phrase du chef avec le prénom, tuiles KPI avec icônes, capydindon dessiné. |
| M6, M7 et M8 | Menu de bloc avec icônes, interrupteurs dans les réglages, rebond du bloc posé, secousse de la ligne refusée, toast rouge. |
| M9 équipe | Josette : casque blanc et casque audio rose. Momo : casquette bleue et polo marine. Lulu : casque jaune, gilet orange et clé. |
| M10 jetons | Jetons d'espacement, de typographie, de couleur (vert `#A2C617`, bleu `#77B7FC`, marine `#030F40`), de rayons et d'ombres dans `style.css`. |

## Nouveaux constats (classés)

### Haut impact

| # | Constat | Écran | Regard | Correction |
|---|---|---|---|---|
| P2-H1 | Le bouton « C'est parti ! » de la création sort de l'écran en 667×375 : impossible de valider sans défiler. Le joueur reste bloqué au premier écran. | Création | Joueur | Compacter le formulaire sous 420 px de haut : pas de surtitre, libellés de 64 px, puces plus serrées, défilement en secours. |
| P2-H2 | Le bouton OK des crédits portait le même identifiant que la validation de la création (`#cr-ok`). Après un passage par les crédits, la validation pouvait viser le mauvais bouton. | Crédits, création | PM (fiabilité) | Identifiant `#cred-ok`. Test : aucun identifiant en double, sur chaque écran. |
| P2-H3 | Sous 64 px, les blocs n'affichent que « Dé… » ou « Fui… » : encore illisible en 667. | Planning | Joueur | Étiquette sous l'icône, sur deux lignes au besoin (« Débit / nuit »). |
| P2-H4 | En 667, le coach devient une colonne étroite de 150 px qui cache la moitié de la carte. | Planning jour 1 | Joueur | Coach sur toute la largeur de la carte (420 px au plus), donc deux ou trois lignes. |

### Moyen impact

| # | Constat | Correction |
|---|---|---|
| P2-M1 | Titres de tickets coupés au milieu d'un mot (« branchemen »). | Césure française (`hyphens:auto`), `min-width:0`. |
| P2-M2 | Le pont Saint-Bénézet et son nom sortaient du cadre de départ. « Rocher des Doms » chevauchait le pont. | Pont et nom placés sous l'arche, noms masqués quand ils en chevauchent un autre (les monuments d'abord). |
| P2-M3 | La carte prend 40 % de la largeur : les heures font 40 px, trop peu pour un bloc d'une heure. | Carte à 37 % (35 % sous 760 px) et colonne des capys à 88 px. |
| P2-M4 | En 667, les tuiles de clôture passent sur trois lignes (« perdus (jour + nuit) »). | Accepté pour l'instant : c'est lisible. |

### Bas impact

- La puce « Abonnés » est masquée sous 760 px de large. La satisfaction reste visible à la clôture et au bilan.
- « Journal de la journée » reste replié : c'est voulu.
- Les épingles peuvent passer sur le nom « Palais des Papes ». Les épingles restent prioritaires.

## Les 30 premières secondes (refaites)

1. **Écran de création :** le capy se met à jour en direct, et un seul bouton est en vert. Le bouton reste grisé tant qu'il manque le prénom ou le sexe, avec une aide (« Écris ton prénom. »).
2. **Accueil :** l'illustration montre l'équipe devant le Palais des Papes. La puce en haut à droite affiche « Camille · Ordonnanceuse ».
3. **Briefing :** « Bienvenue à l'agence, Camille ! ». Le chef et le capy du joueur sont côte à côte, avec trois objectifs.
4. **Planning :** le coach donne la première action (« Camille, touche un ticket en bas… »), et les lignes compatibles s'allument.
