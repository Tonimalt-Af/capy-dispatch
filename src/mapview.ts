// The Avignon map: OpenStreetMap geometry (baked at build time, see LICENSES.md) drawn in our own sticker style.
// SVG with pan (one finger / mouse drag) and zoom (pinch, wheel, +/− buttons). Pins keep a constant screen size.
import { MAP, SITES, DEPOT, nodeXY, path } from './map';
import { ICONS, who, glyph, vanSvg, PALAIS_STICKER, PONT_STICKER } from './art';
import type { CapyId } from './content';

export interface Pin { id: string; site: number; icon: string; color: string; urgent: boolean; badge?: { color: string; n: number }; state: 'open' | 'planned' | 'done' | 'wait'; selected: boolean }
export interface Route { color: string; nodes: number[] }
type VB = { x: number; y: number; w: number; h: number };
const NS = 'http://www.w3.org/2000/svg';
const ringBox = () => { const r = MAP.ring; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } return { x0, y0, x1, y1 }; };
const RB = ringBox(); const [DX, DY] = nodeXY(DEPOT);
const HOME = { x: RB.x0 - 50, y: RB.y0 - 50, w: RB.x1 - RB.x0 + 100, h: Math.max(RB.y1, DY) - RB.y0 + 110 };
const iconIn = (k: string, s: number) => (ICONS[k] ?? '').replace('<svg ', `<svg x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" `);
const ringPath = () => { const r = MAP.ring; let d = `M${r[0]} ${r[1]}`; for (let i = 2; i < r.length; i += 2) d += `L${r[i]} ${r[i + 1]}`; return d + 'Z'; };

export class MapView {
  el: HTMLDivElement; svg: SVGSVGElement; private pins: SVGGElement; private routes: SVGGElement; private capys: SVGGElement; private labels: SVGGElement;
  vb: VB = { ...HOME }; onPin: (id: string) => void = () => {};
  private lastPins: Pin[] = []; private lastRoutes: Route[] = []; private capyPos: Record<string, [number, number]> = {};
  private pathCache = new Map<string, [number, number][]>();
  constructor(host: HTMLElement) {
    this.el = document.createElement('div'); this.el.className = 'map';
    this.el.innerHTML = `<svg xmlns="${NS}" class="map-svg" role="img" aria-label="Carte d'Avignon intra-muros">
      <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#BFE7F7"/><path d="M0 0 V6" stroke="#A6DBF0" stroke-width="3"/></pattern>
        <pattern id="waves" width="44" height="26" patternUnits="userSpaceOnUse"><path d="M4 8 q5 -5 10 0 t10 0 M26 21 q5 -5 10 0 t10 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/></pattern></defs>
      <rect x="-400" y="-400" width="${MAP.w + 800}" height="${MAP.h + 800}" fill="#E4F0D6"/>
      <path d="${MAP.paths.water}" fill="#8ED3EE" stroke="#fff" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>
      <path d="${MAP.paths.water}" fill="url(#waves)"/>
      <path d="${MAP.paths.parks}" fill="#B5DE95" stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/>
      <path d="${ringPath()}" fill="#FBF1DC"/>
      <path d="${MAP.paths.squares}" fill="#F4E3C3"/>
      <path d="${MAP.paths.bldg}" fill="#EFD9B4"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="${MAP.paths.s4}" stroke="#E7D3AE" stroke-width="3" stroke-dasharray="1 6"/>
        <path d="${MAP.paths.s3}" stroke="#E2CDA6" stroke-width="7"/><path d="${MAP.paths.s2}" stroke="#E2CDA6" stroke-width="9"/>
        <path d="${MAP.paths.s1}" stroke="#E2CDA6" stroke-width="13"/><path d="${MAP.paths.s0}" stroke="#DCC296" stroke-width="20"/>
        <path d="${MAP.paths.s3}" stroke="#fff" stroke-width="4"/><path d="${MAP.paths.s2}" stroke="#FFFDF6" stroke-width="6"/>
        <path d="${MAP.paths.s1}" stroke="#fff" stroke-width="9"/><path d="${MAP.paths.s0}" stroke="#FFF6E0" stroke-width="15"/>
      </g>
      <path d="${MAP.paths.walls}" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${MAP.paths.walls}" fill="none" stroke="#E3C38C" stroke-width="18" stroke-dasharray="7 6" stroke-linejoin="round"/>
      <path d="${MAP.paths.walls}" fill="none" stroke="#D2A866" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${MAP.paths.walls}" fill="none" stroke="#E9CD98" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="wall-line"/>
      <g class="towers"></g>
      <path d="${MAP.paths.palais}" fill="#F6C76E" stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke"/>
      <path d="${MAP.paths.pont}" fill="#E8C793" stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke"/>
      <g class="routes"></g><g class="labels"></g><g class="pins"></g><g class="capys"></g></svg>
      <div class="map-ui"><button class="mbtn" data-z="in" aria-label="Zoomer">${glyph('plus')}</button><button class="mbtn" data-z="out" aria-label="Dézoomer">${glyph('minus')}</button><button class="mbtn" data-z="home" aria-label="Recentrer">${glyph('target')}</button></div>
      <a class="osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener"><span class="osm-l">© les contributeurs d'OpenStreetMap</span><span class="osm-s">© OpenStreetMap</span></a>`;
    host.appendChild(this.el);
    this.svg = this.el.querySelector('svg')!;
    this.routes = this.svg.querySelector('.routes')!; this.pins = this.svg.querySelector('.pins')!; this.capys = this.svg.querySelector('.capys')!; this.labels = this.svg.querySelector('.labels')!;
    this.el.querySelectorAll<HTMLButtonElement>('.mbtn').forEach((b) => b.addEventListener('click', () => { const z = b.dataset.z; if (z === 'home') this.setVB({ ...HOME }); else this.zoom(z === 'in' ? 0.7 : 1 / 0.7); }));
    this.towers(); this.gestures(); this.applyVB();
    new ResizeObserver(() => this.applyVB()).observe(this.el);
  }
  /** px of SVG user units per screen pixel */
  private k() { const r = this.svg.getBoundingClientRect(); return r.width ? Math.max(this.vb.w / r.width, this.vb.h / r.height) : 4; }
  private setVB(v: VB) { const minW = 260, maxW = HOME.w * 1.4; const s = Math.min(maxW, Math.max(minW, v.w)) / v.w; const cx = v.x + v.w / 2, cy = v.y + v.h / 2; const w = v.w * s, h = v.h * s;
    this.vb = { x: Math.min(MAP.w + 200 - w / 2, Math.max(-200 - w / 2, cx - w / 2)), y: Math.min(MAP.h + 200 - h / 2, Math.max(-200 - h / 2, cy - h / 2)), w, h }; this.applyVB(); }
  private applyVB() { const v = this.vb; this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); this.drawPins(this.lastPins); this.drawRoutes(this.lastRoutes); this.drawLabels(); this.drawCapys(); }
  zoom(f: number, cx = this.vb.x + this.vb.w / 2, cy = this.vb.y + this.vb.h / 2) { const w = this.vb.w * f, h = this.vb.h * f; this.setVB({ x: cx - (cx - this.vb.x) * f, y: cy - (cy - this.vb.y) * f, w, h }); }
  /** Back to the whole-city view. */
  home() { this.setVB({ ...HOME }); }
  /** Centre the view on a site, zooming in a little if we are zoomed out. */
  focus(site: number) { const s = SITES[site]; if (this.vb.w > HOME.w * 0.75) return; this.setVB({ x: s.x - this.vb.w / 2, y: s.y - this.vb.h / 2, w: this.vb.w, h: this.vb.h }); }
  private toUser(cx: number, cy: number) { const r = this.svg.getBoundingClientRect(); const k = this.k(); const ox = (r.width * k - this.vb.w) / 2, oy = (r.height * k - this.vb.h) / 2; return [this.vb.x - ox + (cx - r.left) * k, this.vb.y - oy + (cy - r.top) * k]; }
  private gestures() {
    const pts = new Map<number, { x: number; y: number }>(); let moved = false; let start: { vb: VB; d: number; mx: number; my: number } | null = null;
    const s = this.svg;
    s.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; start = null; });
    s.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return; const k = this.k();
      if (pts.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; if (!moved && Math.hypot(dx, dy) < 7) return; if (!moved) { moved = true; s.setPointerCapture(e.pointerId); }
        this.vb.x -= dx * k; this.vb.y -= dy * k; p.x = e.clientX; p.y = e.clientY; this.setVB(this.vb); }
      else if (pts.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; moved = true;
        if (!start) { start = { vb: { ...this.vb }, d, mx, my }; return; }
        const f = start.d / Math.max(20, d); const [ux, uy] = this.toUser(start.mx, start.my); this.vb = { ...start.vb }; this.zoom(f, ux, uy); }
    });
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) start = null; };
    s.addEventListener('pointerup', (e) => { const wasMoved = moved; up(e); if (!wasMoved) { const g = (e.target as Element).closest?.('[data-pin]'); if (g) this.onPin(g.getAttribute('data-pin')!); } });
    s.addEventListener('pointercancel', up);
    s.addEventListener('wheel', (e) => { e.preventDefault(); const [ux, uy] = this.toUser(e.clientX, e.clientY); this.zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, ux, uy); }, { passive: false });
  }
  /** Round towers every ~140 units along the remparts (sticker style). */
  private towers() { const wl = this.svg.querySelector<SVGPathElement>('.wall-line'); const g = this.svg.querySelector('.towers'); if (!wl || !g || !wl.getTotalLength) return;
    let L = 0; try { L = wl.getTotalLength(); } catch { return; } const out: string[] = [];
    for (let d = 40; d < L; d += 140) { const p = wl.getPointAtLength(d); out.push(`<g transform="translate(${p.x.toFixed(0)} ${p.y.toFixed(0)})"><circle r="13" fill="#fff"/><circle r="10" fill="#D2A866"/><circle r="10" fill="none" stroke="#E9CD98" stroke-width="4" stroke-dasharray="4 3.85"/><circle r="4.5" fill="#B88B4C"/></g>`); }
    g.innerHTML = out.join(''); }
  private drawLabels() { const k = this.k();
    const pins = this.lastPins.map((p) => SITES[p.site]); const near = (x: number, y: number) => pins.some((s) => Math.abs(s.x - x) < 34 * k && Math.abs(s.y - 8 * k - y) < 22 * k);
    // declutter: landmarks first, then any label overlapping one already placed is skipped
    const placed: [number, number, number, number][] = []; const lm0 = (k: string) => k === 'palais' || k === 'pont';
    const shown = MAP.labels.filter((l) => l.k !== 'gare').map((l) => (l.k === 'pont' ? { ...l, y: l.y + 40 * k } : l.k === 'prefecture' ? { ...l, y: l.y + 15 * k } : l)).sort((a, b) => Number(lm0(b.k)) - Number(lm0(a.k))).filter((l) => { const w = l.t.length * 6.5 * k, h = 15 * k; const box: [number, number, number, number] = [l.x - w / 2, l.y - h, l.x + w / 2, l.y + 3 * k];
      if (placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) return false; placed.push(lm0(l.k) ? [box[0], box[1] - 36 * k, box[2], box[3]] : box); return true; });
    this.labels.innerHTML = shown.map((l) => { const lm = l.k === 'palais' ? PALAIS_STICKER : l.k === 'pont' ? PONT_STICKER : '';
      const st = lm ? `<g transform="translate(${l.x} ${l.y - 24 * k}) scale(${0.62 * k})">${lm}</g>` : '';
      const dot = l.k === 'prefecture' ? `<circle cx="${l.x}" cy="${l.y - 15 * k}" r="${4 * k}" fill="#8A4E10" stroke="#fff" stroke-width="${2 * k}"/>` : '';
      return `${st}${dot}<text x="${l.x}" y="${l.y + (lm ? 2 * k : 0)}" font-size="${(lm ? 12.5 : 12) * k}" text-anchor="middle" class="mlabel${lm ? ' big' : ''}${l.k === 'prefecture' ? ' pf' : ''}${!lm && near(l.x, l.y) ? ' dim' : ''}" stroke-width="${4 * k}">${l.t}</text>`; }).join('')
      + `<g transform="translate(${DX} ${DY}) scale(${k})">${vanSvg('fourgon').replace('<svg ', '<svg x="-26" y="-22" width="52" height="29" ')}<rect x="-24" y="8" width="48" height="16" rx="8" fill="#030F40" stroke="#fff" stroke-width="2.5"/><text x="0" y="20.5" font-size="12" text-anchor="middle" fill="#fff" class="dep">Agence</text></g>`; }
  setPins(p: Pin[]) { this.lastPins = p; this.drawPins(p); this.drawLabels(); }
  private drawPins(list: Pin[]) { const k = this.k();
    this.pins.innerHTML = [...list].sort((a, b) => Number(a.selected) - Number(b.selected)).map((p) => { const s = SITES[p.site]; const sc = (p.selected ? 1.35 : 1) * k;
      return `<g data-pin="${p.id}" class="pin ${p.state}${p.selected ? ' sel' : ''}${p.urgent ? ' urg' : ''}" transform="translate(${s.x} ${s.y}) scale(${sc})">
        ${p.urgent && p.state !== 'done' ? '<circle r="15" class="pulse"/>' : ''}<circle r="22" fill="transparent"/>
        <path d="M0 16 L-7 6 A12 12 0 1 1 7 6 Z" transform="translate(0 -14)" fill="${p.state === 'done' ? '#BFD9B0' : p.color}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
        <g transform="translate(0 -16)">${p.state === 'done' ? '<path d="M-5 0 L-1.5 4 L5.5 -4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' : iconIn(p.icon, 15)}</g>
        ${p.badge ? `<g transform="translate(9 -25)"><circle r="7" fill="${p.badge.color}" stroke="#fff" stroke-width="2"/><text y="3.5" text-anchor="middle" font-size="9.5" fill="#fff" font-weight="700">${p.badge.n}</text></g>` : ''}</g>`; }).join(''); }
  private pathPts(a: number, b: number) { const key = a + ':' + b; let p = this.pathCache.get(key); if (!p) { p = path(a, b); this.pathCache.set(key, p); if (this.pathCache.size > 300) this.pathCache.clear(); } return p; }
  setRoutes(r: Route[]) { this.lastRoutes = r; this.drawRoutes(r); }
  private drawRoutes(list: Route[]) { const k = this.k();
    this.routes.innerHTML = list.map((r) => { const pts: [number, number][] = []; for (let i = 1; i < r.nodes.length; i++) pts.push(...this.pathPts(r.nodes[i - 1], r.nodes[i]));
      if (pts.length < 2) return ''; const d = 'M' + pts.map((p) => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join('L');
      return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${7 * k}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><path d="${d}" fill="none" stroke="${r.color}" stroke-width="${3.6 * k}" stroke-dasharray="${2 * k} ${6 * k}" stroke-linecap="round" stroke-linejoin="round"/>`; }).join(''); }
  /** Capy heads: placed on a node, or animated along the street path from where they are (ms). */
  moveCapy(id: CapyId, node: number, ms = 0) {
    const to = nodeXY(node); const from = this.capyPos[id];
    if (!from || ms <= 0) { this.capyPos[id] = to; this.drawCapys(); return; }
    const near = (p: [number, number]) => { let best = 0, bd = 1e12; for (let i = 0; i < MAP.graph.nodes.length / 2; i += 1) { const dx = MAP.graph.nodes[i * 2] - p[0], dy = MAP.graph.nodes[i * 2 + 1] - p[1]; const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } } return best; };
    const pts = this.pathPts(near(from), node); if (pts.length < 2) { this.capyPos[id] = to; this.drawCapys(); return; }
    const L: number[] = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const t0 = performance.now(); const tot = L[L.length - 1] || 1;
    const tick = () => { const f = Math.min(1, (performance.now() - t0) / ms); const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2; const dd = e * tot; let i = 1; while (i < L.length - 1 && L[i] < dd) i++;
      const a = pts[i - 1], b = pts[i]; const u = (dd - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); this.capyPos[id] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; this.drawCapys(); if (f < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  private drawCapys() { const k = this.k(); const seen = new Map<string, number>();
    this.capys.innerHTML = Object.entries(this.capyPos).map(([id, [x, y]]) => { const key = Math.round(x / 12) + ':' + Math.round(y / 12); const n = seen.get(key) ?? 0; seen.set(key, n + 1);
      return `<g class="mcapy" transform="translate(${x + (n - 1) * 15 * k} ${y - 4 * k}) scale(${k})"><circle r="15" fill="#fff" opacity=".85"/>${who(id as CapyId).replace('<svg ', '<svg x="-15" y="-15" width="30" height="30" ')}</g>`; }).join(''); }
  resetCapys() { this.capyPos = {}; this.drawCapys(); }
}
