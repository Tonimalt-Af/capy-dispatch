import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAP, SITES, DEPOT, dist, path, NODE_COUNT, labelXY, nodeXY, PREFET_SITE, SITE_GROUPS } from '../src/map';

it('OSM Avignon intra-muros map is baked with streets, ring, labels and sites', () => {
  expect(MAP.w).toBeGreaterThan(1000); expect(NODE_COUNT).toBeGreaterThan(200);
  expect(MAP.ring.length).toBeGreaterThan(10);
  for (const k of ['palais', 'pont', 'halles', 'place']) expect(labelXY(k), k).toBeTruthy();
  expect(SITES.length).toBeGreaterThan(80);
  expect(new Set(SITES.map((s) => s.street)).size).toBeGreaterThan(40);
});
it('every site is reachable from the depot by the street graph, and paths follow the streets', () => {
  for (const s of SITES) expect(Number.isFinite(dist(DEPOT, s.node))).toBe(true);
  const s = SITES[10]; const p = path(DEPOT, s.node);
  expect(p.length).toBeGreaterThan(2); expect(p[0]).toEqual(nodeXY(DEPOT)); expect(p.at(-1)).toEqual(nodeXY(s.node));
  expect(dist(s.node, s.node)).toBe(0);
  // symmetric (undirected streets) and triangle inequality on a sample
  const a = SITES[3].node, b = SITES[40].node, c = SITES[70].node;
  expect(Math.abs(dist(a, b) - dist(b, a))).toBeLessThan(1e-6);
  expect(dist(a, c)).toBeLessThanOrEqual(dist(a, b) + dist(b, c) + 1e-6);
});

it('ticket sites are real OSM addresses (number + street pairs that exist in the extract), deduplicated', () => {
  const raw = JSON.parse(readFileSync('data/osm-addr.json', 'utf8')) as { elements: { tags: Record<string, string> }[] };
  const real = new Set(raw.elements.filter((e) => e.tags['addr:housenumber'] && e.tags['addr:street']).map((e) => `${e.tags['addr:housenumber'].trim()} ${e.tags['addr:street'].trim()}`));
  const pool = SITES.filter((_, i) => i !== PREFET_SITE);
  expect(pool.length).toBeGreaterThan(1000);
  for (const s of pool) { expect(Number.isInteger(s.num) && s.num >= 1).toBe(true); expect(s.street, s.street).toMatch(/\p{L}{3}/u); expect(real.has(`${s.num} ${s.street}`), `${s.num} ${s.street}`).toBe(true); }
  expect(new Set(pool.map((s) => `${s.num} ${s.street}`)).size).toBe(pool.length);
  expect(SITE_GROUPS.flat().length).toBe(pool.length); expect(SITE_GROUPS.length).toBeGreaterThan(300);
});
it('the préfet card points at the Hôtel Forbin de Sainte-Croix, 2 place de la Préfecture, shown as a landmark', () => {
  const p = SITES[PREFET_SITE]; expect(`${p.num} ${p.street}`).toBe('2 place de la Préfecture');
  const L = labelXY('prefecture')!; expect(L.t).toBe('Hôtel Forbin'); expect(Math.hypot(L.x - p.x, L.y - p.y)).toBeLessThan(60);
  // ~43.9482 N, 4.8050 E in the map projection
  const [lon0, , , lat0] = MAP.bbox; const x = (4.8050 - lon0) * Math.cos((43.949 * Math.PI) / 180) * 111320, y = (lat0 - 43.9482) * 110574;
  expect(Math.hypot(L.x - x, L.y - y)).toBeLessThan(50);
});
