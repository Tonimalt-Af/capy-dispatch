# Capy Dispatch (titre de travail)

Jeu de dispatch au tour par tour : tu planifies la journée d'une équipe de capybaras techniciens de l'eau potable
dans les vraies rues d'Avignon intra-muros (données OpenStreetMap). Mobile d'abord, à l'horizontale, en français,
gratuit et sans pub. Projet séparé de Mahjong Capybaras (code, sauvegarde et caches distincts).

**Jouer :** https://tonimalt-af.github.io/capy-dispatch/

## v0.1 (phase 1)
- 10 journées (2 semaines), 3 capys (Josette, Fred, Lulu) avec métier principal et secondaire, 9 types d'intervention.
- Briefing de 7 h 30 : carte du jour, nouvelles, 3 objectifs = 3 étoiles.
- Planning : touche un ticket puis la ligne d'un capy (ou glisse-le), pause déjeuner 12 h–13 h 30 visible (créneaux 8 h–12 h puis 13 h 30–17 h 30),
  durées en fourchette, risques annoncés par icônes (pas de hasard caché), trajets > 650 m = 1 créneau.
- Tournée créneau par créneau (x1, x2, « Prochaine décision »), cartes risques et événements, mini-jeu
  « Trouver le compteur » sur façades générées (sans chrono, bouton « Laisser faire » = +1 h).
- Règle de sécurité (appel à l'exploitant gaz avant de creuser) : `src/rules.ts`, `SAFETY_RULE`
  (`'cap1'` par défaut = erreur possible mais journée plafonnée à 1 étoile ; `'block'` = lancement impossible).
- Rendement du réseau en jauge de fond (départ 72,3 %, objectif 80 %).

## Développement
```
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest (règles, équilibrage par un bot, carte, façades, sauvegarde, sécurité, service worker)
npm run e2e        # Playwright (mobile 844x390 + desktop), construit et sert dist/
npm run build      # dist/ + sw.js
```
Scripts : `scripts/fetch-osm.mjs` + `scripts/fetch-osm-addr.mjs` + `scripts/build-map.mjs` (carte et adresses réelles), `scripts/icons.mjs` (icônes),
`scripts/shots.mjs`, `scripts/shots-mid.mjs`, `scripts/playtest.mjs` (captures et partie complète dans `previews/`, ignoré par git).

Le titre « Capy Dispatch » est provisoire : il suffit de changer `index.html`, `public/manifest.webmanifest` et l'écran d'accueil.
Licences : voir [LICENSES.md](LICENSES.md).
