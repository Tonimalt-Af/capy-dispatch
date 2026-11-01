// Downloads the real postal addresses (addr:housenumber + addr:street, nodes and building ways) of Avignon intra-muros
// from the Overpass API (run by hand, rarely: `node scripts/fetch-osm-addr.mjs`). Output: data/osm-addr.json
// (ODbL, © les contributeurs d'OpenStreetMap). scripts/build-map.mjs turns it into the ticket sites of src/data/map.json.
import { writeFileSync } from 'node:fs';
const BBOX = '43.9405,4.7945,43.9575,4.8185';
const q = `[out:json][timeout:120];
(
  node["addr:housenumber"]["addr:street"](${BBOX});
  way["addr:housenumber"]["addr:street"](${BBOX});
  nwr["name"~"Forbin|Préfecture|Hôtel de Ville|Mairie",i](${BBOX});
);
out center tags;`;
const res = await fetch(process.env.OVERPASS ?? 'https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': 'capy-dispatch-build/0.1 (github.com/Tonimalt-Af/capy-dispatch)', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
if (!res.ok) throw new Error('Overpass ' + res.status);
const j = await res.json();
const els = j.elements.map((e) => ({ t: e.type[0], id: e.id, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, tags: Object.fromEntries(Object.entries(e.tags ?? {}).filter(([k]) => k.startsWith('addr:') || ['name', 'building', 'amenity', 'office', 'heritage', 'tourism', 'historic', 'government', 'wikidata'].includes(k))) }));
writeFileSync('data/osm-addr.json', JSON.stringify({ fetched: new Date().toISOString(), bbox: BBOX, licence: 'ODbL 1.0 — © les contributeurs d\u2019OpenStreetMap — https://www.openstreetmap.org/copyright', elements: els }));
console.log(els.length, 'elements');
