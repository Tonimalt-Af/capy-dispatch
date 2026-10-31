// Downloads the raw OpenStreetMap extract for Avignon intra-muros from the Overpass API (run by hand, rarely:
// `node scripts/fetch-osm.mjs`). Output: data/osm-raw.json (ODbL, © les contributeurs d'OpenStreetMap).
// The game never calls OSM servers at runtime: scripts/build-map.mjs turns this file into src/data/map.json.
import { writeFileSync } from 'node:fs';
const BBOX = '43.9405,4.7945,43.9575,4.8185';
const q = `[out:json][timeout:90];
(
  way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service|footway|steps|path)$"](${BBOX});
  way["barrier"="city_wall"](${BBOX});
  way["natural"="water"](${BBOX});
  relation["natural"="water"](${BBOX});
  way["leisure"="park"](${BBOX});
  way["leisure"="garden"](${BBOX});
  way["building"]["name"](${BBOX});
  way["place"="square"](${BBOX});
  way["man_made"="bridge"](${BBOX});
  way["bridge"="yes"]["name"](${BBOX});
  node["barrier"="city_gate"](${BBOX});
  way["barrier"="city_gate"](${BBOX});
);
out geom;`;
const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': 'capy-dispatch-build/0.1 (github.com/Tonimalt-Af/capy-dispatch)', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
if (!res.ok) throw new Error('Overpass ' + res.status);
const j = await res.json();
j.fetched = new Date().toISOString(); j.bbox = BBOX; j.licence = 'ODbL 1.0 — © les contributeurs d\u2019OpenStreetMap — https://www.openstreetmap.org/copyright';
writeFileSync('data/osm-raw.json', JSON.stringify(j));
console.log(j.elements.length, 'elements');
