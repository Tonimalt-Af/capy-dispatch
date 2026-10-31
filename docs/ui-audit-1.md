# Audit UI/UX n°1 (v0.1, 31 octobre 2026)

Captures : `previews/audit/p1/` (844x390, 932x430, 667x375, portrait). Trois regards : designer UI/UX mobile senior, joueur qui découvre le jeu, product manager.
Classement par impact (H = haut, M = moyen, B = bas).

## Haut impact

| # | Constat | Écran | Regard | Correction prévue |
|---|---|---|---|---|
| H1 | Les blocs du planning n'affichent qu'une icône : impossible de lire ce qui est planifié sans toucher chaque bloc. Le libellé disparaît sous 84 px. | Planning, tournée | Joueur | Blocs sur deux lignes (icône + libellé court + durée), lignes plus hautes, libellé jamais masqué au-dessus de 44 px. |
| H2 | Cartes de tickets tronquées (« F. », « Fuite … ») : on perd le métier et le type d'intervention. Seules 2,3 cartes visibles. | Bac à tickets | Joueur, designer | Cartes plus larges, titre sur 2 lignes max, pastille métier en couleur, durée lisible, adresse secondaire. |
| H3 | Cibles tactiles trop petites : puces « gaz » et « Avis 48 h » (≈ 18 px), boutons carte 36 px, menu 40 px, objectifs 38 px, menu de bloc 38 px, contrôles 42 px. | Partout | Designer | Minimum 44 px (zone de toucher étendue pour les puces), test Playwright automatique. |
| H4 | Texte trop petit pour un téléphone : heures 11 px à 70 % d'opacité, pastilles 10 px, puces 10,5 px, libellés KPI 11,5 px. | Planning, clôture, bilan | Designer | Échelle typographique avec 12 px minimum, contraste AA. |
| H5 | Aucune identité du joueur : on ne sait pas qui on incarne. Pas de création de personnage. | Accueil, HUD | PM | Écran de création (prénom, homme ou femme, apparence du capy), avatar dans le HUD et au briefing, accords grammaticaux. |
| H6 | Écriture inclusive (« dispatcheur·euse ») : refusée par Maxime. | Accueil, bilan | PM | Supprimée partout, accords par une fonction dédiée selon le sexe choisi. |
| H7 | La barre du haut est cryptique : 3 étoiles grises sans légende, jauge « 72,3 % » sans libellé à 390 px de haut, icônes goutte et cœur sans contexte. | HUD | Joueur | Puces lisibles : « Objectifs 0/3 », « Rendement », « m³ perdus », « Satisfaction », avec un libellé court visible. |
| H8 | La bande de risque (hachures jaunes de 7 px sous le bloc) ne se comprend pas, et le trajet (bloc rayé bleu) ressemble à un ticket. | Planning | Joueur | Le risque devient un prolongement hachuré du bloc, de la même hauteur, avec « +1 h ? ». Le trajet devient une fine bande avec un petit fourgon. Légende dans le coach du jour 1. |
| H9 | L'accueil est austère : pas d'illustration, pas d'Avignon, pas de fourgon. Rien ne donne envie dans les 5 premières secondes. | Accueil | PM | Illustration clé (Palais des Papes, pont d'Avignon, fourgon de la Lyonnaise des Robinets, capys), titre fort, un seul gros bouton « Jouer ». |
| H10 | La bulle du coach masque le haut de la carte et des épingles ; à 667 px elle devient très étroite. | Planning jour 1 | Joueur | Coach ancré en bas de la carte, avec flèche vers la zone concernée et largeur minimale. |

## Moyen impact

| # | Constat | Correction |
|---|---|---|
| M1 | Carte : les épingles chevauchent les noms (« Palais des Papes »), le palais est une tache jaune, les remparts un pointillé marron, le Rhône est plat. | Monuments dessinés (Palais des Papes, pont Saint-Bénézet), remparts crénelés avec tours, Rhône avec reflets, noms en dessous des épingles et masqués quand on dézoome. |
| M2 | Les 3 capys au dépôt sont coupés en bas de la carte. | Dépôt en fourgon « Agence », têtes en éventail. |
| M3 | Mini-jeu : la façade occupe 40 % de la carte, la règle est écrite en 11 px en haut à droite. Façade peu avignonnaise. | Façade plus grande, règle en une ligne claire, pierre de taille, volets provençaux, porte cochère, génoise, balcon en fer forgé. |
| M4 | Clôture : étoiles petites, KPI tassés, libellés minuscules, pas de célébration. | Grosses étoiles avec éclat, tuiles KPI avec icônes, phrase du chef. |
| M5 | Bilan : écran plat, emoji 🦃 pour l'autocollant, prénom absent. | Bilan avec le capy du joueur, son prénom, médaille selon le palier, autocollant dessiné. |
| M6 | Menu de bloc : flèches unicode ◀ ▶ et ✕ peu claires. | Libellés « Plus tôt », « Plus tard », « Retirer », icônes dessinées. |
| M7 | Réglages : cases à cocher natives, phrase technique sur la règle de sécurité. | Interrupteurs, lien « Modifier mon personnage ». |
| M8 | Aucun retour visuel quand on place un ticket (le bloc apparaît sec) ni quand c'est refusé (simple toast). | Petit rebond du bloc posé, secousse de la ligne refusée, toast avec icône. |
| M9 | Les capys de l'équipe se ressemblent (même casque blanc, même gilet). | Tenues distinctes : Josette casque blanc et casque audio rose, Momo casquette bleue et polo, Lulu casque orange et gilet orange. |
| M10 | Couleurs et espacements improvisés écran par écran. | Jetons de design : espacements, typographie, couleurs de marque, rayons, ombres. |

## Bas impact

- B1 Bac vide : « Tous les tickets sont placés » est terne ; ajouter une petite illustration et un rappel « Lance la journée ».
- B2 Fil de la tournée : 3 lignes en 12,5 px, la dernière tronquée.
- B3 L'image de partage a un texte trop chargé ; Maxime veut titre + mascotte + pilule « Jouer », sans slogan.
- B4 Portrait : l'écran « Tourne ton téléphone » est correct mais pourrait réutiliser la mascotte du joueur.

## Les 30 premières secondes (premier lancement)

1. Accueil : il faut comprendre « je planifie la journée d'une équipe de capys à Avignon ». Aujourd'hui, le texte le dit, mais rien ne le montre.
2. Création du personnage : 15 secondes maximum, tout est pré-rempli, seul le prénom est à saisir.
3. Briefing : le chef parle au joueur par son prénom, 3 objectifs = 3 étoiles.
4. Planning : un seul geste à apprendre (toucher un ticket, toucher une ligne). Le coach doit montrer où toucher.
