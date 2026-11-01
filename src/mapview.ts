// The Avignon map: OpenStreetMap geometry (baked at build time, see LICENSES.md) drawn in our own sticker style.
// SVG with pan (one finger / mouse drag) and zoom (pinch, wheel, +/− buttons). Pins keep a constant screen size.
import { MAP, SITES, DEPOT, nodeXY, path, labelXY } from './map';
import { ICONS, who, glyph, vanSvg, PALAIS_STICKER, PONT_STICKER } from './art';
import type { CapyId } from './content';

export interface Pin { id: string; site: number; icon: string; color: string; urgent: boolean; badge?: { color: string; n: number }; state: 'open' | 'planned' | 'done' | 'wait'; selected: boolean }
export interface Route { color: string; nodes: number[] }
type VB = { x: number; y: number; w: number; h: number };
const NS = 'http://www.w3.org/2000/svg';
const ringBox = () => { const r = MAP.ring; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } return { x0, y0, x1, y1 }; };
const RB = ringBox(); const inRing = (x: number, y: number) => x > RB.x0 && x < RB.x1 && y > RB.y0 && y < RB.y1; const [DX, DY] = nodeXY(DEPOT);
// two zoom levels: HOME = the walls (intra-muros detail), WIDE = the whole extra-muros map down to the depot at Courtine
const HOME = { x: RB.x0 - 50, y: RB.y0 - 50, w: RB.x1 - RB.x0 + 100, h: RB.y1 - RB.y0 + 110 };
const WIDE = { x: -60, y: -60, w: MAP.w + 120, h: MAP.h + 120 };
const escT = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const iconIn = (k: string, s: number) => (ICONS[k] ?? '').replace('<svg ', `<svg x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" `);
const ringPath = () => { const r = MAP.ring; let d = `M${r[0]} ${r[1]}`; for (let i = 2; i < r.length; i += 2) d += `L${r[i]} ${r[i + 1]}`; return d + 'Z'; };

export class MapView {
  el: HTMLDivElement; svg: SVGSVGElement; private top: SVGSVGElement; private pins: SVGGElement; private routes: SVGGElement; private capys: SVGGElement; private labels: SVGGElement;
  vb: VB = { ...HOME }; onPin: (id: string) => void = () => {};
  private lastPins: Pin[] = []; private lastRoutes: Route[] = []; private capyPos: Record<string, [number, number]> = {};
  private pathCache = new Map<string, [number, number][]>();
  constructor(host: HTMLElement) {
    this.el = document.createElement('div'); this.el.className = 'map';
    this.el.innerHTML = `<svg xmlns="${NS}" class="map-svg" role="img" aria-label="Carte d'Avignon, intra-muros et extra-muros">
      <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#BFE7F7"/><path d="M0 0 V6" stroke="#A6DBF0" stroke-width="3"/></pattern>
        <pattern id="waves" width="44" height="26" patternUnits="userSpaceOnUse"><path d="M4 8 q5 -5 10 0 t10 0 M26 21 q5 -5 10 0 t10 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/></pattern></defs>
      <rect x="-400" y="-400" width="${MAP.w + 800}" height="${MAP.h + 800}" fill="#E4F0D6"/>
      <path d="${MAP.paths.water}" fill="#8ED3EE" stroke="#fff" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>
      <path d="${MAP.paths.water}" fill="url(#waves)"/>
      <path d="${MAP.paths.parks}" fill="#B5DE95" stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" class="xm">
        <path d="${MAP.paths.rail ?? ''}" stroke="#C9BFAE" stroke-width="7"/><path d="${MAP.paths.rail ?? ''}" stroke="#fff" stroke-width="3" stroke-dasharray="10 10"/>
        <path d="${MAP.paths.x2 ?? ''}" stroke="#E2CDA6" stroke-width="9"/><path d="${MAP.paths.x1 ?? ''}" stroke="#E2CDA6" stroke-width="13"/><path d="${MAP.paths.x0 ?? ''}" stroke="#DCC296" stroke-width="22"/>
        <path d="${MAP.paths.x2 ?? ''}" stroke="#FFFDF6" stroke-width="6"/><path d="${MAP.paths.x1 ?? ''}" stroke="#fff" stroke-width="9"/><path d="${MAP.paths.x0 ?? ''}" stroke="#FFF6E0" stroke-width="16"/>
      </g>
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
      <g class="dress"></g><g class="routes"></g><g class="labels"></g></svg>
      <svg xmlns="${NS}" class="map-top" aria-hidden="false"><g class="pins"></g><g class="capys"></g></svg>
      <div class="map-ui"><button class="mbtn" data-z="in" aria-label="Zoomer">${glyph('plus')}</button><button class="mbtn" data-z="out" aria-label="Dézoomer">${glyph('minus')}</button><button class="mbtn" data-z="home" aria-label="Recentrer sur l’intra-muros">${glyph('target')}</button><button class="mbtn wide" data-z="wide" aria-label="Vue large : toute la ville jusqu’au dépôt"><span>Vue large</span></button></div>
      <a class="osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener"><span class="osm-l">© les contributeurs d'OpenStreetMap</span><span class="osm-s">© OpenStreetMap</span></a>`;
    host.appendChild(this.el);
    this.svg = this.el.querySelector('svg')!; this.top = this.el.querySelector<SVGSVGElement>('.map-top')!;
    this.routes = this.svg.querySelector('.routes')!; this.pins = this.top.querySelector('.pins')!; this.capys = this.top.querySelector('.capys')!; this.labels = this.svg.querySelector('.labels')!;
    this.el.querySelectorAll<HTMLButtonElement>('.mbtn').forEach((b) => b.addEventListener('click', () => { const z = b.dataset.z; if (z === 'home') this.setVB({ ...HOME }); else if (z === 'wide') this.setVB({ ...WIDE }); else this.zoom(z === 'in' ? 0.7 : 1 / 0.7); }));
    this.towers(); this.gestures(); this.applyVB();
    new ResizeObserver((es) => { const r = es[0].contentRect; this.W = r.width; this.H = r.height; this.drawnK = 0; this.applyVB(); }).observe(this.el);
  }
  // Performance (slow phones): a drag or pinch never re-renders the SVG. The committed viewBox stays put and the
  // gesture is shown as a compositor-only CSS transform of the <svg> (one per frame, coalesced in rAF); the real
  // viewBox is committed when the finger lifts or pauses. Overlays (pins, labels, routes, capys) are only rebuilt
  // when the zoom (k) actually changed, and sizes come from the ResizeObserver, never from layout reads mid-gesture.
  // Pins and capy heads live in a light overlay <svg> that follows the pending viewBox every frame and only re-scales
  // its own few elements, so they keep their screen size during a pinch instead of growing with the map.
  private W = 0; private H = 0; private cv: VB = { ...HOME }; private drawnK = 0; private raf = 0; private idle = 0;
  /** px of SVG user units per screen pixel */
  private k(v: VB = this.vb) { if (!this.W) { const r = this.el.getBoundingClientRect(); this.W = r.width; this.H = r.height; } return this.W ? Math.max(v.w / this.W, v.h / this.H) : 4; }
  private setVB(v: VB, live = false) { const minW = 260, maxW = WIDE.w * 1.1; const s = Math.min(maxW, Math.max(minW, v.w)) / v.w; const cx = v.x + v.w / 2, cy = v.y + v.h / 2; const w = v.w * s, h = v.h * s;
    this.vb = { x: Math.min(MAP.w + 200 - w / 2, Math.max(-200 - w / 2, cx - w / 2)), y: Math.min(MAP.h + 200 - h / 2, Math.max(-200 - h / 2, cy - h / 2)), w, h }; if (live) this.live(); else this.applyVB(); }
  /** Show the pending viewBox as a transform of the committed one (no SVG re-render). */
  private live() { clearTimeout(this.idle); this.idle = window.setTimeout(() => this.applyVB(), 140); // finger paused: commit
    if (this.raf) return; this.raf = requestAnimationFrame(() => { this.raf = 0; const c = this.cv, p = this.vb, kc = this.k(c), kp = this.k(p); const a = kc / kp;
      const oc = [(this.W - c.w / kc) / 2, (this.H - c.h / kc) / 2], op = [(this.W - p.w / kp) / 2, (this.H - p.h / kp) / 2];
      const bx = (c.x - p.x) / kp + op[0] - a * oc[0], by = (c.y - p.y) / kp + op[1] - a * oc[1];
      this.svg.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px) scale(${a.toFixed(4)})`; this.topVB(); }); }
  /** The overlay shows the pending viewBox itself; on a zoom its pins and capys are re-scaled in place (no rebuild). */
  private topK = 0;
  private topVB() { const v = this.vb; this.top.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); const k = this.k(v); if (Math.abs(k - this.topK) <= k * 1e-3) return; this.topK = k;
    this.pins.querySelectorAll<SVGGElement>('[data-pin]').forEach((e) => e.setAttribute('transform', `translate(${e.dataset.x} ${e.dataset.y}) scale(${Number(e.dataset.s) * k})`)); this.drawCapys(); }
  private applyVB() { clearTimeout(this.idle); if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } const v = this.vb; this.cv = { ...v };
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); this.svg.style.transform = ''; this.topVB();
    const k = this.k(); if (Math.abs(k - this.drawnK) <= k * 1e-3) return; this.drawnK = k; // a pure pan: overlays are in map units, nothing to rebuild
    this.drawPins(this.lastPins); this.drawRoutes(this.lastRoutes); this.drawLabels(); this.drawCapys(); }
  zoom(f: number, cx = this.vb.x + this.vb.w / 2, cy = this.vb.y + this.vb.h / 2, live = false) { const w = this.vb.w * f, h = this.vb.h * f; this.setVB({ x: cx - (cx - this.vb.x) * f, y: cy - (cy - this.vb.y) * f, w, h }, live); }
  /** Back to the whole-city view. */
  home() { this.setVB({ ...HOME }); }
  /** Centre the view on a site, zooming in a little if we are zoomed out. */
  focus(site: number) { const s = SITES[site]; if (this.vb.w > HOME.w * 0.75) return; this.setVB({ x: s.x - this.vb.w / 2, y: s.y - this.vb.h / 2, w: this.vb.w, h: this.vb.h }); }
  private box: DOMRect | null = null; // container rect, read once per gesture (before any write)
  private toUser(cx: number, cy: number) { const r = this.box ?? this.el.getBoundingClientRect(); const k = this.k(); const ox = (r.width * k - this.vb.w) / 2, oy = (r.height * k - this.vb.h) / 2; return [this.vb.x - ox + (cx - r.left) * k, this.vb.y - oy + (cy - r.top) * k]; }
  private gestures() {
    const pts = new Map<number, { x: number; y: number }>(); let moved = false; let start: { vb: VB; d: number; mx: number; my: number } | null = null;
    const s = this.el; const ui = (e: Event) => !!(e.target as Element).closest?.('.map-ui, .osm');
    s.addEventListener('pointerdown', (e) => { if (ui(e)) return; if (!pts.size) this.box = this.el.getBoundingClientRect(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; start = null; });
    s.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return; const k = this.k();
      if (pts.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; if (!moved && Math.hypot(dx, dy) < 7) return; if (!moved) { moved = true; s.setPointerCapture(e.pointerId); }
        this.vb.x -= dx * k; this.vb.y -= dy * k; p.x = e.clientX; p.y = e.clientY; this.setVB(this.vb, true); }
      else if (pts.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; moved = true;
        if (!start) { start = { vb: { ...this.vb }, d, mx, my }; return; }
        const f = start.d / Math.max(20, d); const [ux, uy] = this.toUser(start.mx, start.my); this.vb = { ...start.vb }; this.zoom(f, ux, uy, true); }
    });
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) start = null; if (!pts.size) { this.box = null; if (moved) this.applyVB(); } };
    s.addEventListener('pointerup', (e) => { const wasMoved = moved; up(e); if (!wasMoved) { const g = (e.target as Element).closest?.('[data-pin]'); if (g) this.onPin(g.getAttribute('data-pin')!); } });
    s.addEventListener('pointercancel', up);
    s.addEventListener('wheel', (e) => { e.preventDefault(); const [ux, uy] = this.toUser(e.clientX, e.clientY); this.zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, ux, uy, true); }, { passive: false });
  }
  /** Round towers every ~140 units along the remparts (sticker style). */
  private towers() { const wl = this.svg.querySelector<SVGPathElement>('.wall-line'); const g = this.svg.querySelector('.towers'); if (!wl || !g || !wl.getTotalLength) return;
    let L = 0; try { L = wl.getTotalLength(); } catch { return; } const out: string[] = [];
    for (let d = 40; d < L; d += 140) { const p = wl.getPointAtLength(d); out.push(`<g transform="translate(${p.x.toFixed(0)} ${p.y.toFixed(0)})"><circle r="13" fill="#fff"/><circle r="10" fill="#D2A866"/><circle r="10" fill="none" stroke="#E9CD98" stroke-width="4" stroke-dasharray="4 3.85"/><circle r="4.5" fill="#B88B4C"/></g>`); }
    g.innerHTML = out.join(''); }
  private drawLabels() { const k = this.k(this.cv);
    const pins = this.lastPins.map((p) => SITES[p.site]); const near = (x: number, y: number) => pins.some((s) => Math.abs(s.x - x) < 34 * k && Math.abs(s.y - 8 * k - y) < 22 * k);
    // declutter: landmarks first, then any label overlapping one already placed is skipped
    const placed: [number, number, number, number][] = []; const lm0 = (k: string) => k === 'palais' || k === 'pont';
    const far = this.vb.w > HOME.w * 1.25; this.svg.classList.toggle('far', far);
    const shown = MAP.labels.filter((l) => l.k !== 'gare' && (l.k === 'quartier' ? far || !inRing(l.x, l.y) : true)).map((l) => (l.k === 'pont' ? { ...l, y: l.y + 40 * k } : l.k === 'prefecture' ? { ...l, y: l.y + 15 * k } : l)).sort((a, b) => Number(lm0(b.k)) - Number(lm0(a.k))).filter((l) => { const w = l.t.length * 5.2 * k, h = 12 * k; const box: [number, number, number, number] = [l.x - w / 2, l.y - h, l.x + w / 2, l.y + 3 * k];
      if (placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) return false; placed.push(lm0(l.k) ? [box[0], box[1] - 24 * k, box[2], box[3]] : box); return true; });
    this.labels.innerHTML = shown.map((l) => { const lm = l.k === 'palais' ? PALAIS_STICKER : l.k === 'pont' ? PONT_STICKER : '';
      // discreet: small icon + small light label; the mini-map (CSS) keeps only the icons
      const st = lm ? `<g class="mlm" transform="translate(${l.x} ${l.y - 15 * k}) scale(${0.4 * k})">${lm}</g>` : '';
      const dot = l.k === 'prefecture' ? `<circle class="mlm" cx="${l.x}" cy="${l.y - 12 * k}" r="${3 * k}" fill="#8A4E10" stroke="#fff" stroke-width="${1.5 * k}"/>` : '';
      return `${st}${dot}<text x="${l.x}" y="${l.y + (lm ? 1 * k : 0)}" font-size="${9.5 * k}" text-anchor="middle" class="mlabel${lm ? ' big' : ''}${l.k === 'quartier' ? ' q' : ''}${l.k === 'prefecture' ? ' pf' : ''}${near(l.x, l.y) ? ' dim' : ''}" stroke-width="${3 * k}">${escT(l.t)}</text>`; }).join('')
      + `<g transform="translate(${DX} ${DY}) scale(${k})">${vanSvg('fourgon').replace('<svg ', '<svg x="-26" y="-22" width="52" height="29" ')}<rect x="-24" y="8" width="48" height="16" rx="8" fill="#030F40" stroke="#fff" stroke-width="2.5"/><text x="0" y="20.5" font-size="12" text-anchor="middle" fill="#fff" class="dep">Dépôt</text></g>`; }
  setPins(p: Pin[]) { this.lastPins = p; this.drawPins(p); this.drawLabels(); }
  private drawPins(list: Pin[]) { const k = this.k(this.vb); this.topK = k;
    this.pins.innerHTML = [...list].sort((a, b) => Number(a.selected) - Number(b.selected)).map((p) => { const s = SITES[p.site]; const f = p.selected ? 1.35 : 1; const sc = f * k;
      return `<g data-pin="${p.id}" data-x="${s.x}" data-y="${s.y}" data-s="${f}" class="pin ${p.state}${p.selected ? ' sel' : ''}${p.urgent ? ' urg' : ''}" transform="translate(${s.x} ${s.y}) scale(${sc})">
        ${p.urgent && p.state !== 'done' ? '<circle r="15" class="pulse"/>' : ''}<circle r="22" fill="transparent"/>
        <path d="M0 16 L-7 6 A12 12 0 1 1 7 6 Z" transform="translate(0 -14)" fill="${p.state === 'done' ? '#BFD9B0' : p.color}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
        <g transform="translate(0 -16)">${p.state === 'done' ? '<path d="M-5 0 L-1.5 4 L5.5 -4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' : iconIn(p.icon, 15)}</g>
        ${p.badge ? `<g transform="translate(9 -25)"><circle r="7" fill="${p.badge.color}" stroke="#fff" stroke-width="2"/><text y="3.5" text-anchor="middle" font-size="9.5" fill="#fff" font-weight="700">${p.badge.n}</text></g>` : ''}</g>`; }).join(''); }
  private pathPts(a: number, b: number) { const key = a + ':' + b; let p = this.pathCache.get(key); if (!p) { p = path(a, b); this.pathCache.set(key, p); if (this.pathCache.size > 300) this.pathCache.clear(); } return p; }
  setRoutes(r: Route[]) { this.lastRoutes = r; this.drawRoutes(r); }
  private drawRoutes(list: Route[]) { const k = this.k(this.cv);
    this.routes.innerHTML = list.map((r) => { const pts: [number, number][] = []; for (let i = 1; i < r.nodes.length; i++) pts.push(...this.pathPts(r.nodes[i - 1], r.nodes[i]));
      if (pts.length < 2) return ''; const d = 'M' + pts.map((p) => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join('L');
      return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${7 * k}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><path d="${d}" fill="none" stroke="${r.color}" stroke-width="${3.6 * k}" stroke-dasharray="${2 * k} ${6 * k}" stroke-linecap="round" stroke-linejoin="round"/>`; }).join(''); }
  /** Capy heads: placed on a node, or animated along the street path from where they are (ms). */
  moveCapy(id: CapyId, node: number, ms = 0) {
    const to = nodeXY(node); const from = this.capyPos[id];
    if (document.documentElement.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches) ms = 0; // « Réduire les animations »
    if (!from || ms <= 0) { this.capyPos[id] = to; this.drawCapys(); return; }
    const near = (p: [number, number]) => { let best = 0, bd = 1e12; for (let i = 0; i < MAP.graph.nodes.length / 2; i += 1) { const dx = MAP.graph.nodes[i * 2] - p[0], dy = MAP.graph.nodes[i * 2 + 1] - p[1]; const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } } return best; };
    const pts = this.pathPts(near(from), node); if (pts.length < 2) { this.capyPos[id] = to; this.drawCapys(); return; }
    const L: number[] = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const t0 = performance.now(); const tot = L[L.length - 1] || 1; this.driving.add(id);
    const tick = () => { const f = Math.min(1, (performance.now() - t0) / ms); const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2; const dd = e * tot; let i = 1; while (i < L.length - 1 && L[i] < dd) i++;
      const a = pts[i - 1], b = pts[i]; const u = (dd - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); this.capyPos[id] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; if (f >= 1) this.driving.delete(id); this.drawCapys(); if (f < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  private driving = new Set<string>();
  private dress = '';
  /** Special-day dressing (section 14): bunting and a crowd intra-muros for the Festival, a crowd and stalls at the Halles on market day; weather tints are CSS classes on the map. */
  /** Season tint of the whole fortnight (under the day's weather). */
  setSeason(s: string | undefined) { for (const x of ['printemps', 'automne', 'hiver']) this.el.classList.toggle(`s-${x}`, s === x); }
  setDress(card: string) { if (card === this.dress) return; this.dress = card; const g = this.svg.querySelector('.dress')!; const cols = ['#E5507A', '#F5B82E', '#2BA6A0', '#3B7BD9', '#7BB82E', '#F08A3E'];
    this.el.classList.remove('d-festival', 'd-hot', 'd-storm', 'd-wind', 'd-rain', 'd-marche', 'd-frost', 'd-thaw');
    const cls: Record<string, string[]> = { festival: ['d-festival', 'd-hot'], orage: ['d-storm'], mistral: ['d-wind'], pluie: ['d-rain'], marche: ['d-marche'], gel: ['d-frost'], redoux: ['d-thaw'] }; this.el.classList.add(...(cls[card] ?? []));
    let h = ''; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const crowd = (x: number, y: number, n: number, spread: number) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * spread; h += `<circle cx="${(x + Math.cos(a) * r).toFixed(0)}" cy="${(y + Math.sin(a) * r).toFixed(0)}" r="11" fill="${cols[i % cols.length]}" stroke="#fff" stroke-width="3"/>`; } };
    const bunting = (x: number, y: number, w: number, tilt: number) => { const x0 = x - w / 2, y0 = y - tilt, x1 = x + w / 2, y1 = y + tilt; h += `<path d="M${x0} ${y0} Q${x} ${y + 30} ${x1} ${y1}" fill="none" stroke="#8A6A45" stroke-width="3"/>`;
      for (let i = 1; i < 8; i++) { const t = i / 8; const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x + t * t * x1, py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * (y + 30) + t * t * y1; h += `<path d="M${(px - 11).toFixed(0)} ${py.toFixed(0)} h22 l-11 24z" fill="${cols[i % cols.length]}" stroke="#fff" stroke-width="2.5"/>`; } };
    if (card === 'festival') { const inside = SITES.filter((st) => inRing(st.x, st.y)); const step = Math.max(1, Math.floor(inside.length / 45));
      inside.forEach((st, i) => { if (i % step === 0) crowd(st.x, st.y, 4, 34); });
      for (const k of ['palais', 'place']) { const l = MAP.labels.filter((x) => x.k === k)[0]; if (l) { crowd(l.x, l.y + 60, 30, 95); bunting(l.x, l.y - 40, 260, 10); bunting(l.x + 20, l.y + 150, 230, -8); } }
      const bs = Math.max(1, Math.floor(inside.length / 8)); inside.forEach((st, i) => { if (i % bs === bs >> 1) bunting(st.x, st.y - 20, 180, (i % 2 ? 8 : -8)); }); }
    if (card === 'marche') { const l = labelXY('halles'); if (l) { crowd(l.x, l.y + 40, 30, 110); for (let i = 0; i < 5; i++) { const x = l.x - 160 + i * 80, y = l.y + 130; h += `<path d="M${x - 34} ${y} h68 l-8 -24 h-52z" fill="${cols[i % cols.length]}" stroke="#fff" stroke-width="3"/><rect x="${x - 28}" y="${y}" width="56" height="22" fill="#F4E3C3" stroke="#fff" stroke-width="3"/>`; } } }
    g.innerHTML = h; }
  private capyEls = new Map<string, SVGGElement>();
  /** Capy heads are built once; a frame of a drive only moves a transform (no innerHTML, no re-parse of the head SVG). */
  private drawCapys() { const k = this.k(this.vb); const seen = new Map<string, number>();
    for (const [id, [x, y]] of Object.entries(this.capyPos)) { const key = Math.round(x / 12) + ':' + Math.round(y / 12); const n = seen.get(key) ?? 0; seen.set(key, n + 1);
      let el = this.capyEls.get(id); if (!el) { el = document.createElementNS(NS, 'g'); el.setAttribute('class', 'mcapy');
        el.innerHTML = `<circle r="15" fill="#fff" opacity=".85"/>${who(id as CapyId).replace('<svg ', '<svg x="-15" y="-15" width="30" height="30" ')}<g class="mvan">${ICONS.van.replace('<svg ', '<svg x="4" y="2" width="22" height="22" ')}</g>`;
        this.capys.appendChild(el); this.capyEls.set(id, el); }
      el.setAttribute('transform', `translate(${(x + (n - 1) * 15 * k).toFixed(1)} ${(y - 4 * k).toFixed(1)}) scale(${k})`); el.classList.toggle('drv', this.driving.has(id)); } }
  resetCapys() { this.capyPos = {}; this.capyEls.forEach((e) => e.remove()); this.capyEls.clear(); }
}
