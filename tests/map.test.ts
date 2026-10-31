import { it, expect } from 'vitest';
import { MAP, SITES, DEPOT, dist, path, NODE_COUNT, labelXY, nodeXY } from '../src/map';

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
