# Licences et sources

| Élément | Source | Licence |
|---|---|---|
| Données de la carte d'Avignon intra-muros (`src/data/map.json`, `data/osm-*.json`) | © les contributeurs d'OpenStreetMap, extraites via l'API Overpass (`scripts/fetch-osm.mjs`, adresses postales réelles des tickets : `scripts/fetch-osm-addr.mjs`), simplifiées par `scripts/build-map.mjs` | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) — attribution affichée en permanence sur la carte, lien vers https://www.openstreetmap.org/copyright |
| Style de la carte (couleurs, rendu SVG) | Dessiné pour ce jeu (`src/mapview.ts`) | Propriété du projet |
| Capybaras, chef, chat, ours, capydindon, icônes, logos parodiques, façades | Dessinés en code SVG (`src/art.ts`, `src/facade.ts`) — création originale. Aucun logo réel n'est utilisé. | Propriété du projet |
| Musique (2 boucles) et bruitages | Synthétisés en temps réel via Web Audio (`src/audio.ts`) — aucun sample | Propriété du projet |
| Icônes d'app | Rendues depuis les dessins du jeu (`scripts/icons.mjs`) | Propriété du projet |
| Illustration d'accueil (`public/art/home-keyart.webp`, `home-keyart-854.webp`, source `art-src/home-keyart-gen.jpg`) | Image générée par IA (Grok Bot, génération d'image) à partir de nos propres capybaras et de notre fourgon SVG comme références de personnages. Des photos Wikimedia Commons du pont Saint-Bénézet et du Palais des Papes ont servi uniquement de référence visuelle d'architecture ; elles ne sont ni incluses ni redistribuées. Aucun texte, aucun logo réel. Retouche le 1er novembre 2026 : le casque de Josette a été corrigé par génération d'image sur un recadrage (source `art-src/josette-headset-fix-gen.jpg`), puis fondu dans l'image. Compressée en WebP (70 Ko et 42 Ko). | Propriété du projet |
| Image de partage (`public/og-image.jpg`, 1200×630) | Composée par `scripts/icons.mjs` : l'illustration d'accueil + le titre en Fredoka + un bouton « Jouer » | Propriété du projet |
| Fourgons de la flotte (`vanSvg` dans `src/art.ts`) | Silhouettes génériques de fourgon et de ludospace, dessinées pour le jeu, sans marque de constructeur | Propriété du projet |
| Police Fredoka | @fontsource/fredoka | SIL Open Font License 1.1 |

## Parodie

« Lyonnaise des Robinets », « Générale des Flots », « SORE » et « la Régie » sont des entreprises imaginaires.
Les couleurs évoquent des opérateurs réels à titre parodique ; les logos sont nos propres dessins. Jeu non officiel,
sans lien avec un opérateur d'eau réel. Les abonnés, le préfet et les adresses de RDV sont fictifs (les rues, elles, sont vraies).

Aucune publicité, aucun traqueur, aucun appel réseau tiers (CSP `default-src 'self'`).

Adresse de l'hôtel Forbin de Sainte-Croix (carte « préfet ») : « 2, place de la Préfecture », propriété P6375 de l'élément Wikidata Q22916641 (CC0), lié au bâtiment OSM way 83783907.
