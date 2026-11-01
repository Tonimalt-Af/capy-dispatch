import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAP, SITES, DEPOT, dist, path, NODE_COUNT, labelXY, nodeXY, PREFET_SITE, SITE_GROUPS, RETIRED_SITES, QUARTERS, quarterOf, quarterOfNode, qTravel, GROUPS_BY_Q } from '../src/map';

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
  const ext = JSON.parse(readFileSync('data/osm-ext.json', 'utf8')) as { elements: { tags?: Record<string, string> }[] };
  raw.elements.push(...ext.elements.filter((e) => e.tags) as { tags: Record<string, string> }[]);
  const real = new Set(raw.elements.filter((e) => e.tags['addr:housenumber'] && e.tags['addr:street']).map((e) => `${e.tags['addr:housenumber'].trim()} ${e.tags['addr:street'].trim()}`));
  const pool = SITES.filter((_, i) => i !== PREFET_SITE && !RETIRED_SITES.has(i));
  expect(PREFET_SITE).toBe(1506); // frozen layout: saves store site indices; the v1 slots keep their address, extra-muros ones come after
  const v1 = JSON.parse(readFileSync('data/sites-v1.json', 'utf8')) as { sites: [string, number, number][] };
  v1.sites.forEach(([st, n], i) => { if (i !== PREFET_SITE) expect(`${SITES[i].num} ${SITES[i].street}`).toBe(`${n} ${st}`); });
  expect(SITES.length).toBeGreaterThan(2000);
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

it('extra-muros (map v2): real quartiers around the walls, the depot far south at Courtine, travel 0/1/2 h by quartier', () => {
  expect(QUARTERS[0].t).toBe('Intra-muros'); expect(QUARTERS.length).toBeGreaterThanOrEqual(4);
  expect(QUARTERS.map((q) => q.t)).toContain('Les Sources');
  expect(QUARTERS[quarterOfNode(DEPOT)].t).toBe('Courtine');
  const [, , , lat0] = MAP.bbox; const [, dy] = nodeXY(DEPOT); expect(lat0 - dy / 110574).toBeLessThan(43.93); // well south of the walls (≈ 43.94)
  for (let a = 0; a < QUARTERS.length; a++) for (let b = 0; b < QUARTERS.length; b++) { expect([0, 1, 2]).toContain(qTravel(a, b)); expect(qTravel(a, b)).toBe(qTravel(b, a)); expect(qTravel(a, b) === 0).toBe(a === b); }
  const iC = QUARTERS.findIndex((q) => q.t === 'Courtine'); expect(qTravel(0, iC)).toBe(2);
  for (let q = 1; q < QUARTERS.length; q++) expect(GROUPS_BY_Q[q].length, QUARTERS[q].t).toBeGreaterThan(5);
  expect(SITES.slice(0, 1507).every((_, i) => quarterOf(i) === 0)).toBe(true);
  expect(JSON.stringify(MAP).length).toBeLessThan(1_000_000);
});
