# Licences et sources

| Élément | Source | Licence |
|---|---|---|
| Données de la carte d'Avignon intra-muros (`src/data/map.json`, `data/osm-*.json`) | © les contributeurs d'OpenStreetMap, extraites via l'API Overpass (`scripts/fetch-osm.mjs`), simplifiées par `scripts/build-map.mjs` | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) — attribution affichée en permanence sur la carte, lien vers https://www.openstreetmap.org/copyright |
| Style de la carte (couleurs, rendu SVG) | Dessiné pour ce jeu (`src/mapview.ts`) | Propriété du projet |
| Capybaras, chef, chat, ours, capydindon, icônes, logos parodiques, façades | Dessinés en code SVG (`src/art.ts`, `src/facade.ts`) — création originale. Aucun logo réel n'est utilisé. | Propriété du projet |
| Musique (2 boucles) et bruitages | Synthétisés en temps réel via Web Audio (`src/audio.ts`) — aucun sample | Propriété du projet |
| Icônes d'app et image de partage | Rendues depuis les dessins du jeu (`scripts/icons.mjs`) | Propriété du projet |
| Police Fredoka | @fontsource/fredoka | SIL Open Font License 1.1 |

## Parodie

« Lyonnaise des Robinets », « Générale des Flots », « SORE » et « la Régie » sont des entreprises imaginaires.
Les couleurs évoquent des opérateurs réels à titre parodique ; les logos sont nos propres dessins. Jeu non officiel,
sans lien avec un opérateur d'eau réel. Les abonnés, le préfet et les adresses de RDV sont fictifs (les rues, elles, sont vraies).

Aucune publicité, aucun traqueur, aucun appel réseau tiers (CSP `default-src 'self'`).
