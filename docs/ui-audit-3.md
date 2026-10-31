# Audit UI/UX n°3 (v0.2, 31 octobre 2026)

Captures : `previews/audit/p3/<taille>/` (844×390, 932×430, 667×375), scènes `00` à `23`. Mêmes trois regards : designer UI mobile senior, joueur qui découvre, PM.
Paires avant/après (844×390, v0.1 à gauche, v0.2 à droite) : `previews/before-after/`.

## Suivi de l'audit n°2

| Constat n°2 | État |
|---|---|
| P2-H1 validation de la création hors écran en 667 | Corrigé : « C'est parti ! » visible sans défiler aux trois tailles. Le test d'empiètement le vérifie. |
| P2-H2 identifiant en double | Corrigé (`#cred-ok`). Le test vérifie l'absence de doublons sur chaque écran. |
| P2-H3 blocs « Dé… » en 667 | Corrigé, voir P3-H1. |
| P2-H4 coach étroit en 667 | Corrigé : le coach prend toute la largeur de la carte. |
| P2-M1 à M3 | Corrigés. |
| P2-M4 tuiles de clôture sur trois lignes | Corrigé : libellés raccourcis (« perdus jour + nuit », « rendement »). |

## Nouveaux constats

### Haut impact

| # | Constat | Correction |
|---|---|---|
| P3-H1 | En 667, la césure automatique coupait les étiquettes des blocs d'une heure au milieu du mot (« Débi / t… », « Perd / u »), et la durée « 1 h » sortait du bloc. | Trois paliers selon la largeur du bloc. Au-delà de 64 px : icône et étiquette sur une ligne. De 44 à 64 px : étiquette sur deux lignes, sans césure dans les mots. Sous 44 px : l'icône du métier seule, en 18 px. La durée reste toujours visible. |

Aucun autre problème à fort impact aux trois tailles.

### Moyen impact (corrigé)

| # | Constat | Correction |
|---|---|---|
| P3-M1 | Les pastilles de métier (« Réseau ») étaient rognées par la colonne des heures. | Colonne des capys élargie à 108 px (96 px sous 760 px). |
| P3-M2 | Le « % » partait seul à la ligne (« 80,0 / % »). Les guillemets et la ponctuation haute faisaient de même dans le coach (« +1 h ? / » »). | Espace insécable fine avant « % », « ? », « ! », « : » et « ; », et insécable à l'intérieur de « … ». C'est appliqué à tout le texte passé par `say()` et aux toasts. |
| P3-M3 | L'étiquette « Introuv. » se coupait mal. | Étiquette courte « Perdu ». |

### Bas impact (restant, accepté)

- Les épingles peuvent masquer en partie les noms « Palais des Papes » et « Les Halles » sur la carte. Les épingles restent prioritaires.
- Sous 44 px, un bloc d'une heure ne montre que l'icône. Le nom complet reste accessible au toucher (menu du bloc) et dans `aria-label`.
- Sous 760 px, la puce « Abonnés » et le libellé « Objectifs » sont masqués dans le HUD.
- La carte de ticket « Fuite compteur » est en partie cachée par le bord du bac. C'est voulu : cela montre qu'on peut faire défiler.

## Verdict

Plus aucun problème à fort impact. Les écrans de création, d'accueil, de briefing, de planning, de tournée, de cartes, de mini-jeu, de clôture, de bilan et de réglages tiennent aux trois tailles. Les cibles font 44 px ou plus, le texte 12 px ou plus, et rien ne se chevauche (vérifié par Playwright).
