// Turns the raw OSM extract (data/osm-*.json, ODbL) into the compact map the game draws: src/data/map.json.
// Projection: local equirectangular in metres (x east, y south); coordinates rounded to 1 m and simplified.
// The output is a "produced work" derived from OSM data: it keeps the ODbL attribution (shown in game) — see LICENSES.md.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const raw = JSON.parse(readFileSync('data/osm-raw.json', 'utf8'));
const extra = existsSync('data/osm-buildings.json') ? JSON.parse(readFileSync('data/osm-buildings.json', 'utf8')) : { elements: [] };
const LON0 = 4.7955, LAT0 = 43.9568, LON1 = 4.8195, LAT1 = 43.9412;
const KX = Math.cos((43.949 * Math.PI) / 180) * 111320, KY = 110574;
const W = Math.round((LON1 - LON0) * KX), H = Math.round((LAT0 - LAT1) * KY);
const pr = (g) => [Math.round((g.lon - LON0) * KX), Math.round((LAT0 - g.lat) * KY)];
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
  if (fx === lx && fy === ly && pts.length > 3) { const m = pts.length >> 1; return [...dp(pts.slice(0, m + 1), eps).slice(0, -1), ...dp(pts.slice(m), eps)]; } // closed ring: two halves
  return dp(pts, eps);
}
function dp(pts, eps) { // Douglas-Peucker
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const dd = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (dd > md) { md = dd; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keep[i]);
}
const flat = (pts) => pts.flat();
const area = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
/** SVG path data with relative line commands (compact); closed polygons end with z. */
const d = (arrs, close) => arrs.map((a) => { let o = `M${a[0]} ${a[1]}`; for (let i = 2; i < a.length; i += 2) o += `l${a[i] - a[i - 2]} ${a[i + 1] - a[i - 1]}`; return o + (close ? 'z' : ''); }).join('').replace(/ -/g, '-');
const inBox = (p, m = 0) => p[0] >= -m && p[1] >= -m && p[0] <= W + m && p[1] <= H + m;
function clip(poly) { // Sutherland-Hodgman against the map rectangle
  const edges = [[(p) => p[0] >= 0, (a, b) => [0, a[1] + ((b[1] - a[1]) * (0 - a[0])) / (b[0] - a[0])]], [(p) => p[0] <= W, (a, b) => [W, a[1] + ((b[1] - a[1]) * (W - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= 0, (a, b) => [a[0] + ((b[0] - a[0]) * (0 - a[1])) / (b[1] - a[1]), 0]], [(p) => p[1] <= H, (a, b) => [a[0] + ((b[0] - a[0]) * (H - a[1])) / (b[1] - a[1]), H]]];
  let out = poly;
  for (const [ins, cut] of edges) { const inp = out; out = []; if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) { const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
      if (ins(cur)) { if (!ins(prev)) out.push(cut(prev, cur)); out.push(cur); } else if (ins(prev)) out.push(cut(prev, cur)); } }
  return out.map((p) => [Math.round(p[0]), Math.round(p[1])]);
}
function rings(members) { // join member ways end to end into rings
  const segs = members.map((m) => m.geometry.filter(Boolean).map(pr)); const out = []; const key = (p) => p.join(',');
  while (segs.length) { let ring = segs.pop();
    for (let guard = 0; guard < 2000 && key(ring[0]) !== key(ring[ring.length - 1]); guard++) {
      const end = key(ring[ring.length - 1]); const i = segs.findIndex((s) => key(s[0]) === end || key(s[s.length - 1]) === end);
      if (i < 0) break; const s = segs.splice(i, 1)[0]; ring = ring.concat(key(s[0]) === end ? s.slice(1) : s.reverse().slice(1)); }
    out.push(ring); }
  return out;
}
const seen = new Set(); const all = [...raw.elements, ...extra.elements].filter((e) => { const k = e.type + e.id; if (seen.has(k)) return false; seen.add(k); return true; });
const CLS = { primary: 0, secondary: 0, tertiary: 1, unclassified: 1, residential: 1, living_street: 2, pedestrian: 2, service: 3, footway: 4, path: 4, steps: 4 };
const names = []; const nameIdx = (n) => { if (!n) return -1; let i = names.indexOf(n); if (i < 0) { i = names.length; names.push(n); } return i; };
const landmarks = [], streets = [], walls = [], water = [], parks = [], bldg = [], squares = [], gates = [];
const nodePos = new Map(), adj = new Map(), nodeName = new Map(), nodeCls = new Map();
for (const e of all) {
  const t = e.tags ?? {};
  if (e.type === 'way' && t.highway && CLS[t.highway] !== undefined) {
    const pts = e.geometry.map(pr); if (!pts.some((p) => inBox(p, 50))) continue;
    if (t.area === 'yes') { squares.push(flat(simplify(pts, 1.5))); continue; }
    streets.push({ c: CLS[t.highway], p: flat(simplify(pts, 1.2)) });
    if (t.highway === 'steps') continue; // vans and trolleys don't take stairs
    const w = t.highway === 'footway' || t.highway === 'path' ? 1.6 : 1; // footways: on foot with the gear, slower
    e.nodes.forEach((id, i) => { nodePos.set(id, pts[i]); if (t.name && ['residential', 'living_street', 'pedestrian', 'tertiary', 'secondary', 'unclassified'].includes(t.highway)) { nodeName.set(id, t.name); nodeCls.set(id, CLS[t.highway]); } });
    for (let i = 1; i < e.nodes.length; i++) { const a = e.nodes[i - 1], b = e.nodes[i]; const dd = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * w;
      if (!adj.has(a)) adj.set(a, new Map()); if (!adj.has(b)) adj.set(b, new Map()); adj.get(a).set(b, dd); adj.get(b).set(a, dd); }
  } else if (t.barrier === 'city_wall' && e.type === 'way') walls.push(flat(simplify(e.geometry.map(pr), 1)));
  else if (t.natural === 'water' && !t.amenity) {
    const rs = e.type === 'relation' ? rings(e.members.filter((m) => m.role === 'outer' && m.geometry)) : [e.geometry.map(pr)];
    for (const r of rs) { const c = clip(simplify(r, 2)); if (c.length > 2) water.push(flat(c)); }
  } else if ((t.leisure === 'park' || t.leisure === 'garden') && e.type === 'way') { const c = clip(simplify(e.geometry.map(pr), 1.5)); if (c.length > 2) parks.push(flat(c)); }
  else if (t.place === 'square' && e.type === 'way') squares.push(flat(simplify(e.geometry.map(pr), 1.5)));
  else if (e.type === 'relation' && /^(Palais des Papes|Pont Saint-Bénézet)$/.test(t.name ?? '')) { for (const r of rings(e.members.filter((m) => m.role === 'outer' && m.geometry))) landmarks.push({ n: t.name, p: flat(simplify(r, 0.8)) }); }
  else if (t.building && e.type === 'way') { const pts = e.geometry.map(pr); if (pts.every((p) => inBox(p)) && area(pts) > 25) bldg.push({ n: nameIdx(t.name), p: flat(simplify(pts, 1)) }); }
  else if (t.barrier === 'city_gate') { const g = e.type === 'node' ? pr(e) : pr(e.geometry[0]); gates.push({ n: nameIdx(t.name), x: g[0], y: g[1] }); }
}
// intra-muros outline: wall points sorted by angle around their centroid (the walls form a convex-ish ring)
const wp = walls.flatMap((w) => { const o = []; for (let i = 0; i < w.length; i += 2) o.push([w[i], w[i + 1]]); return o; });
const cx = wp.reduce((s, p) => s + p[0], 0) / wp.length, cy = wp.reduce((s, p) => s + p[1], 0) / wp.length;
const ring = simplify(wp.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)), 6);
const inside = (p) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
// distance from a point to the wall ring (sites hugging the ramparts are skipped: the boulevard outside is not "intra-muros")
const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const wallD = (p) => Math.min(...ring.map((a, i) => segD(p, a, ring[(i + 1) % ring.length])));
// graph: keep the largest connected component
const ids = [...adj.keys()]; const comp = new Map(); let best = -1, bestN = 0;
for (const s of ids) { if (comp.has(s)) continue; const q = [s]; comp.set(s, s); let n = 0; while (q.length) { const u = q.pop(); n++; for (const v of adj.get(u).keys()) if (!comp.has(v)) { comp.set(v, s); q.push(v); } } if (n > bestN) { bestN = n; best = s; } }
const keep = ids.filter((i) => comp.get(i) === best); const idx = new Map(keep.map((id, i) => [id, i]));
const nodes = keep.flatMap((id) => nodePos.get(id)); const edges = [];
for (const a of keep) for (const [b, dd] of adj.get(a)) if (idx.has(b) && idx.get(a) < idx.get(b)) edges.push(idx.get(a), idx.get(b), Math.round(dd));
// ticket sites: REAL postal addresses (addr:housenumber + addr:street from data/osm-addr.json) inside the walls, each snapped
// to the nearest street-graph node, preferably on the street the address names; [node, street, number, narrow]
const addrRaw = JSON.parse(readFileSync('data/osm-addr.json', 'utf8'));
const norm = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\b(de|du|des|la|le|les|l|d)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const onStreet = new Map(); // graph node -> normalised names of every named highway through it
for (const e of all) { const t = e.tags ?? {}; if (e.type !== 'way' || !t.highway || !t.name) continue; for (const id of e.nodes ?? []) { if (!idx.has(id)) continue; if (!onStreet.has(id)) onStreet.set(id, new Set()); onStreet.get(id).add(norm(t.name)); } }
const clsByName = new Map(); for (const e of all) { const t = e.tags ?? {}; if (e.type === 'way' && t.highway && t.name && CLS[t.highway] !== undefined) { const k = norm(t.name); clsByName.set(k, Math.min(clsByName.get(k) ?? 9, CLS[t.highway])); } }
const sites = []; const seenAddr = new Set(); const stat = { osm: 0, outside: 0, oddNumber: 0, dup: 0, far: 0, sameStreet: 0 };
const snap = (p, want) => { let bs = -1, bd = 1e9, ba = -1, bda = 1e9; for (const id of keep) { const q = nodePos.get(id); const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bda && adj.get(id).size) { bda = dd; ba = id; } if (want && dd < bd && onStreet.get(id)?.has(want)) { bd = dd; bs = id; } } return bd <= 90 ? { id: bs, d: bd, same: true } : { id: ba, d: bda, same: false }; };
for (const e of addrRaw.elements) { const t = e.tags; if (!t['addr:housenumber'] || !t['addr:street'] || e.lat == null) continue; stat.osm++;
  const p = pr(e); if (!inside(p) || wallD(p) < 30) { stat.outside++; continue; }
  const m = /^\s*(\d{1,3})\s*$/.exec(t['addr:housenumber']); if (!m || +m[1] < 1) { stat.oddNumber++; continue; } // "2A", "1bis", "3-5": skipped (the game shows plain numbers)
  const street = t['addr:street'].trim(); const key = norm(street) + '|' + +m[1]; if (seenAddr.has(key)) { stat.dup++; continue; } seenAddr.add(key);
  const s = snap(p, norm(street)); if (s.d > 40 && !s.same) { stat.far++; continue; } if (!inside(nodePos.get(s.id))) { stat.outside++; continue; } if (s.same) stat.sameStreet++;
  const cls = clsByName.get(norm(street)); sites.push({ i: idx.get(s.id), n: nameIdx(street), num: +m[1], r: cls === 2 ? 1 : 0 }); }
sites.sort((a, b) => a.i - b.i || a.n - b.n || a.num - b.num);
// the préfet card: Hôtel Forbin de Sainte-Croix (hôtel préfectoral de Vaucluse). OSM: way 83783907 "Préfecture (site historique)",
// wikidata Q22916641, no addr:* tags; its address "2, place de la Préfecture" comes from that Wikidata item (P6375, CC0).
const forbin = addrRaw.elements.find((e) => e.t === 'w' && e.id === 83783907); // centre of the building way
if (!forbin) throw new Error('Hôtel Forbin de Sainte-Croix (OSM way 83783907) not found');
const FP = pr(forbin); const fs = snap(FP, norm('Rue Viala'));
const prefet = sites.length; sites.push({ i: idx.get(fs.id), n: nameIdx('place de la Préfecture'), num: 2, r: 0 });
console.log('addresses', stat, 'pool', sites.length - 1);
// depot (fictional agency): the graph node nearest to a point just outside Porte Saint-Michel (south)
const DEP = pr({ lon: 4.8085, lat: 43.9415 }); let depot = 0, dd0 = 1e9; keep.forEach((id, i) => { const p = nodePos.get(id); const q = Math.hypot(p[0] - DEP[0], p[1] - DEP[1]); if (q < dd0) { dd0 = q; depot = i; } });
// labels: real place names, positioned from OSM (centroid of the feature)
const cen = (a) => { let x = 0, y = 0; for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; } return [Math.round((x * 2) / a.length), Math.round((y * 2) / a.length)]; };
const labels = []; const lm = (t, arr, k) => { if (arr) { const [x, y] = cen(arr); labels.push({ t, x, y, k }); } };
const geo = (n) => all.filter((e) => e.tags?.name === n && e.geometry).map((e) => flat(e.geometry.map(pr)))[0];
lm('Palais des Papes', landmarks.find((l) => l.n === 'Palais des Papes')?.p, 'palais');
lm('Pont Saint-Bénézet', landmarks.find((l) => l.n === 'Pont Saint-Bénézet')?.p, 'pont');
lm('Les Halles', geo("Halles d'Avignon"), 'halles');
lm('Rocher des Doms', geo('Rocher des Doms'), 'parc');
lm('Place Pie', geo('Place Pie'), 'place');
lm("Place de l'Horloge", geo("Place de l'Horloge"), 'place');
lm('Gare', geo('Avignon-Centre'), 'gare');
labels.push({ t: 'Hôtel Forbin', x: FP[0], y: FP[1], k: 'prefecture' });
const usedNames = [...new Set(sites.map((s) => s.n))]; const remap = new Map(usedNames.map((n, i) => [n, i]));
const S = (c) => d(streets.filter((s) => s.c === c).map((s) => s.p), false);
const paths = { water: d(water, true), parks: d(parks, true), squares: d(squares, true), bldg: d(bldg.map((b) => b.p), true), palais: d(landmarks.filter((l) => l.n === 'Palais des Papes').map((l) => l.p), true), pont: d(landmarks.filter((l) => l.n !== 'Palais des Papes').map((l) => l.p), true), walls: d(walls, false), s0: S(0), s1: S(1), s2: S(2), s3: S(3), s4: S(4) };
const out = { w: W, h: H, bbox: [LON0, LAT1, LON1, LAT0], ring: flat(ring), paths, labels, depot, graph: { nodes, edges }, names: usedNames.map((n) => names[n]), sites: sites.flatMap((s) => [s.i, remap.get(s.n), s.num, s.r]), prefet, source: 'OpenStreetMap (ODbL 1.0), extrait du ' + (raw.fetched ?? '').slice(0, 10) + ', adresses du ' + (addrRaw.fetched ?? '').slice(0, 10) };
writeFileSync('src/data/map.json', JSON.stringify(out));
console.log({ W, H, bldg: bldg.length, nodes: keep.length, sites: sites.length, depot, labels: labels.map((l) => l.t).join(' | '), kb: Math.round(JSON.stringify(out).length / 1024) });
