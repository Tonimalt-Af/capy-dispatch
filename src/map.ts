// The Avignon map: OSM-derived geometry (src/data/map.json, built by scripts/build-map.mjs) + the street graph.
import M from './data/map.json';

/** A real postal address (OSM addr:housenumber + addr:street), snapped to a street-graph node. */
export interface Site { node: number; street: string; num: number; x: number; y: number; narrow: boolean }
export const MAP = M as unknown as { w: number; h: number; ring: number[]; paths: Record<string, string>; labels: { t: string; x: number; y: number; k: string }[]; bbox: number[]; depot: number; graph: { nodes: number[]; edges: number[] }; names: string[]; sites: number[]; prefet: number };
export const SITES: Site[] = [];
for (let i = 0; i < MAP.sites.length; i += 4) { const n = MAP.sites[i]; SITES.push({ node: n, street: MAP.names[MAP.sites[i + 1]], num: MAP.sites[i + 2], x: MAP.graph.nodes[n * 2], y: MAP.graph.nodes[n * 2 + 1], narrow: MAP.sites[i + 3] === 1 }); }
/** Site of the préfet surprise card: 2, place de la Préfecture (Hôtel Forbin de Sainte-Croix); never drawn at random. */
export const PREFET_SITE = MAP.prefet;
/** Random tickets: pick a street node first (even spread over the town), then one of the real addresses snapped to it. */
export const SITE_GROUPS: number[][] = [...SITES.reduce((m, s, i) => { if (i !== PREFET_SITE) { if (!m.has(s.node)) m.set(s.node, []); m.get(s.node)!.push(i); } return m; }, new Map<number, number[]>()).values()];
const N = MAP.graph.nodes.length / 2;
export const nodeXY = (n: number): [number, number] => [MAP.graph.nodes[n * 2], MAP.graph.nodes[n * 2 + 1]];
const adj: [number, number][][] = Array.from({ length: N }, () => []);
for (let i = 0; i < MAP.graph.edges.length; i += 3) { const [a, b, d] = [MAP.graph.edges[i], MAP.graph.edges[i + 1], MAP.graph.edges[i + 2]]; adj[a].push([b, d]); adj[b].push([a, d]); }
export const DEPOT = MAP.depot;

/** Dijkstra from one node (binary heap); results cached per source. */
const cache = new Map<number, { dist: Float64Array; prev: Int32Array }>();
function from(src: number) {
  let r = cache.get(src); if (r) return r;
  const dist = new Float64Array(N).fill(Infinity); const prev = new Int32Array(N).fill(-1); dist[src] = 0;
  const h: [number, number][] = [[0, src]];
  const push = (x: [number, number]) => { h.push(x); let i = h.length - 1; while (i) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const top = h[0]; const last = h.pop()!; if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (rr < h.length && h[rr][0] < h[m][0]) m = rr; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
  while (h.length) { const [d, u] = pop(); if (d > dist[u]) continue; for (const [v, w] of adj[u]) if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; push([dist[v], v]); } }
  r = { dist, prev }; if (cache.size > 64) cache.delete(cache.keys().next().value!); cache.set(src, r); return r;
}
/** Street distance in metres between two graph nodes. */
export const dist = (a: number, b: number) => (a === b ? 0 : from(a).dist[b]);
/** The street path a → b as points (for drawing routes and moving the capys). */
export function path(a: number, b: number): [number, number][] {
  const { prev } = from(a); const out: [number, number][] = []; let u = b;
  for (let guard = 0; u !== -1 && guard < N; guard++) { out.push(nodeXY(u)); if (u === a) break; u = prev[u]; }
  return out.reverse();
}
export const NODE_COUNT = N;
export const labelXY = (k: string) => MAP.labels.find((l) => l.k === k);
