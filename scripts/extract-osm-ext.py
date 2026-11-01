#!/usr/bin/env python3
"""Extra-muros extract for the map (run by hand, rarely), used when the Overpass mirrors are saturated.
Input: a Geofabrik extract (provence-alpes-cote-d-azur-latest.osm.pbf, ODbL, (c) les contributeurs d'OpenStreetMap).
Output: data/osm-ext.json in the Overpass "out geom" shape (ways with nodes + geometry, nodes with lat/lon + tags),
so scripts/build-map.mjs reads it like the other data/osm-*.json files.
Usage: python3 scripts/extract-osm-ext.py paca.osm.pbf  (needs `pip install osmium`)"""
import sys, json, datetime, re, osmium
S, W, N, E = 43.914, 4.782, 43.9575, 4.836
HW = re.compile(r'^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|primary_link|secondary_link|tertiary_link)$')
inb = lambda lat, lon: S <= lat <= N and W <= lon <= E
M = 0.01  # nodes kept a little beyond the box so the roads leaving it keep their geometry up to the edge
class Nodes(osmium.SimpleHandler):  # pass 1: locations of every node near the box, plus tagged nodes inside it
    def __init__(s): super().__init__(); s.loc = {}; s.out = []
    def node(s, n):
        lat, lon = n.location.lat, n.location.lon
        if not (S - M <= lat <= N + M and W - M <= lon <= E + M): return
        s.loc[n.id] = (round(lat, 7), round(lon, 7))
        if inb(lat, lon) and len(n.tags):
            t = dict(n.tags)
            if ('addr:housenumber' in t and 'addr:street' in t) or 'place' in t:
                s.out.append({'type': 'node', 'id': n.id, 'lat': round(lat, 7), 'lon': round(lon, 7), 'tags': {k: v for k, v in t.items() if k.startswith('addr:') or k in ('name', 'place')}})
class Ways(osmium.SimpleHandler):  # pass 2: the ways we draw or route on
    def __init__(s, loc, out): super().__init__(); s.loc = loc; s.out = out
    def way(s, w):
        t = dict(w.tags)
        want = HW.match(t.get('highway', '')) or t.get('natural') == 'water' or t.get('leisure') in ('park', 'garden') or t.get('railway') == 'rail' or t.get('waterway') == 'canal' or ('addr:housenumber' in t and 'addr:street' in t)
        if not want: return
        refs = [n.ref for n in w.nodes]; pts = [(r, s.loc[r]) for r in refs if r in s.loc]
        if len(pts) < 2 or not any(inb(*p) for _, p in pts): return
        keep = {k: v for k, v in t.items() if k in ('highway', 'name', 'natural', 'leisure', 'railway', 'waterway', 'area', 'oneway', 'bridge', 'tunnel', 'building') or k.startswith('addr:')}
        e = {'type': 'way', 'id': w.id, 'tags': keep, 'nodes': [r for r, _ in pts], 'geometry': [{'lat': p[0], 'lon': p[1]} for _, p in pts]}
        if 'addr:housenumber' in t and not HW.match(t.get('highway', '')):
            e['center'] = {'lat': sum(p[0] for _, p in pts) / len(pts), 'lon': sum(p[1] for _, p in pts) / len(pts)}
        s.out.append(e)
a = Nodes(); a.apply_file(sys.argv[1]); b = Ways(a.loc, a.out); b.apply_file(sys.argv[1])
json.dump({'fetched': datetime.date.today().isoformat(), 'source': 'Geofabrik ' + sys.argv[1].split('/')[-1], 'bbox': f'{S},{W},{N},{E}', 'licence': 'ODbL 1.0 — © les contributeurs d\u2019OpenStreetMap — https://www.openstreetmap.org/copyright', 'elements': a.out}, open('data/osm-ext.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(a.out), 'elements')
