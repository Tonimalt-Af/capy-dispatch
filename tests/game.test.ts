import { describe, it, expect } from 'vitest';
import * as G from '../src/game';
import { JOBS, TEAM, DAYS_SPEC, RISK_CARDS, EVENTS, VIPS, vipOutcome, type JobId } from '../src/content';
import { SLOTS, LUNCH_AFTER, slotLabel, slotShort, slotEnd, LUNCH_LABEL, SAFETY_RULE } from '../src/rules';
import { SITES, DEPOT, PREFET_SITE } from '../src/map';

const fresh = () => { const g = G.newGame(2026); G.startDay(g); return g; };
const runUntilPending = (g: G.Game) => { let k = 0; while (g.today!.phase === 'run' && !g.today!.pending.length && k++ < 100) G.step(g); };
const addTicket = (g: G.Game, job: JobId, opts: Parameters<typeof G.makeTicket>[3] = {}) => { const t = G.makeTicket(g, job, G.rng(9), { slot: 0, ...opts }); t.avail = g.day; return t; };

describe('rules', () => {
  it('8 one-hour slots with a visible lunch break 12h-13h30', () => {
    expect(SLOTS).toBe(8); expect(LUNCH_AFTER).toBe(4);
    expect([0, 3, 4, 7, 8].map(slotLabel)).toEqual(['8 h', '11 h', '13 h 30', '16 h 30', '17 h 30']);
    expect([0, 4, 8].map(slotShort)).toEqual(['8h', '13h30', '17h30']); expect(slotEnd(3)).toBe('12 h'); expect(slotEnd(4, true)).toBe('14h30'); expect(LUNCH_LABEL).toBe('Pause déjeuner (12 h – 13 h 30)');
  });
  it('the safety rule is configured in one place and defaults to cap1', () => { expect(SAFETY_RULE).toBe('cap1'); });
  it('10 job types, each with phase-2 data hooks (side / habilitation) and a known skill', () => {
    expect(Object.keys(JOBS).length).toBe(10);
    for (const j of Object.values(JOBS)) { expect(['icc', 'reseau', 'fuite']).toContain(j.skill); expect(['avant', 'apres', 'na']).toContain(j.side); expect(j).toHaveProperty('habilitation'); }
  });
  it('10 days, 3 objectives each (3 stars = 3 objectives shown at the briefing)', () => {
    expect(DAYS_SPEC.length).toBe(10); for (const d of DAYS_SPEC) expect(d.objs.length).toBe(3);
  });
});

describe('planning preview', () => {
  it('the drive from the depot is free (prise de poste); long drives cost a slot', () => {
    const g = fresh(); expect(G.travelCost(g, DEPOT, 0)).toBe(0);
    const far = SITES.findIndex((s) => s.node !== SITES[0].node && G.travelCost(g, SITES[0].node, SITES.indexOf(s)) === 1);
    expect(far).toBeGreaterThan(-1);
  });
  it('day 1 is a calm tutorial: no hidden risk, every ticket fits', () => {
    const g = fresh(); const ids = G.tray(g);
    expect(ids.length).toBe(3); for (const id of ids) expect(g.tickets[id].risks).toEqual([]);
  });
  it('preview shows start, end and the worst case endMax (risk = +1 slot each, no hidden randomness)', () => {
    const g = fresh(); const t = addTicket(g, 'resilie', { risks: ['chien', 'cave'] }); g.pile.push(t.id);
    const cap = TEAM.find((c) => G.canDo(c.id, t.id, g))!; G.assign(g, cap.id, t.id);
    const s = G.preview(g, cap.id).find((x) => x.id === t.id)!;
    expect(s.endMax - s.end).toBe(2); expect(G.maxExtra(t)).toBe(2);
  });
  it('a RDV planned too late is flagged red, an early arrival waits for the window', () => {
    const g = fresh(); const cap = 'momo';
    const a = addTicket(g, 'prc', { rdv: [0, 0] }); const b = addTicket(g, 'prc', { rdv: [5, 6] }); g.pile.push(a.id, b.id);
    G.assign(g, cap, b.id); G.assign(g, cap, a.id); G.assign(g, cap, b.id); // b first -> a after
    const p = G.preview(g, cap, [b.id, a.id]); expect(p[0].early).toBe(true); expect(p[0].start).toBe(5); expect(p[1].late).toBe(true);
    g.today!.plan[cap] = [b.id, a.id];
    expect(G.warnings(g).some((w) => w.level === 'red' && w.text.includes('RDV'))).toBe(true);
  });
  it('freeAt: working capy is free after its job, a travelling one after the trip at the target', () => {
    const g = fresh(); const d = g.today!; const cr = d.capys.momo; const t = addTicket(g, 'prc'); g.pile.push(t.id);
    d.slot = 2; cr.job = t.id; cr.left = 2; expect(G.freeAt(g, 'momo')).toEqual({ at: 4, pos: SITES[t.site].node });
    cr.job = null; cr.travel = 1; cr.target = t.id; expect(G.freeAt(g, 'momo')).toEqual({ at: 3, pos: SITES[t.site].node });
    cr.travel = 0; cr.target = null; d.sub = 'mid'; expect(G.freeAt(g, 'momo').at).toBe(3);
  });
  it('capys only take jobs of their skills (main or secondary, slower)', () => {
    const g = fresh(); const t = addTicket(g, 'fuite_bt'); g.pile.push(t.id);
    const ok = TEAM.filter((c) => G.canDo(c.id, t.id, g)).map((c) => c.id); expect(ok.length).toBeGreaterThan(0); expect(ok.length).toBeLessThan(3);
  });
  it('a cut (coupure) needs the 48 h notice first: available two days later', () => {
    const g = fresh(); const t = addTicket(g, 'coupure'); t.avail = null; g.pile.push(t.id);
    expect(G.avail(g, t.id)).toBe(false); expect(G.sendAvis(g, t.id)).toBe(true); expect(t.avail).toBe(g.day + 2); expect(G.sendAvis(g, t.id)).toBe(false);
  });
});

describe('resolution and cards', () => {
  it('a full day resolves slot by slot to the close, with the log and stars', () => {
    const g = fresh(); const ids = G.tray(g);
    for (const id of ids) { const c = TEAM.find((k) => G.canDo(k.id, id, g))!; G.assign(g, c.id, id); }
    G.launch(g); let k = 0; while (g.today!.phase === 'run' && k++ < 200) { G.step(g); while (g.today!.pending.length) G.choose(g, 0); }
    const d = g.today!; expect(d.phase).toBe('close'); expect(d.done.length).toBe(3); expect(d.stars).toBeGreaterThanOrEqual(2); expect(g.history.length).toBe(1);
  });
  it('risk cards: always a +1 slot option and a no-slot option; the avis de passage postpones to tomorrow', () => {
    for (const card of Object.values(RISK_CARDS)) { expect(card.choices.length).toBeGreaterThanOrEqual(2); expect(card.choices.some((c) => !c.fx.slots)).toBe(true); expect(card.choices.some((c) => (c.fx.slots ?? 0) === 1)).toBe(true); }
    const g = fresh(); const t = addTicket(g, 'prc', { risks: ['chien'] }); g.pile.push(t.id); g.today!.plan.momo = [t.id]; G.launch(g); runUntilPending(g);
    expect(g.today!.pending[0]).toMatchObject({ kind: 'risk', card: 'chien', capy: 'momo' });
    const post = RISK_CARDS.chien.choices.findIndex((c) => c.fx.postpone); G.choose(g, post);
    expect(g.today!.postponed).toContain(t.id); expect(t.avail).toBe(g.day + 1); expect(g.today!.capys.momo.job).toBe(null);
  });
  it('« Client absent au RDV »: avis de passage, the ticket returns and the RDV objective is not lost', () => {
    const absent = RISK_CARDS.absent; expect(absent.title.toLowerCase()).toContain('absent'); const i = absent.choices.findIndex((c) => c.fx.postpone); expect(i).toBeGreaterThan(-1);
    const g = fresh(); const t = addTicket(g, 'prc', { rdv: [0, 1], risks: ['absent'] }); g.pile.push(t.id); g.today!.rdvToday = [t.id]; g.today!.plan.momo = [t.id]; G.launch(g); runUntilPending(g);
    G.choose(g, i); expect(g.today!.absentOk).toContain(t.id); expect(g.pile).toContain(t.id);
    expect(G.evalObj(g, { id: 'rdv' })).toBe(true);
  });
  it('events that create a ticket (e.g. the prefect) open a replanning, and the butler is always home', () => {
    expect(EVENTS.prefet).toBeTruthy(); const g = fresh(); g.today!.phase = 'run'; g.today!.pending.push({ card: 'prefet', kind: 'event', capy: null, ticket: null });
    const i = EVENTS.prefet.choices.findIndex((c) => c.fx.addTicket); const t = G.choose(g, i)!;
    expect(t).toBeTruthy(); expect(t.prefet).toBe(true); expect(t.risks).toEqual([]); expect(g.today!.replan).toBe(true);
    expect(t.site).toBe(PREFET_SITE); expect(`${t.num} ${SITES[t.site].street}`).toBe('2 place de la Préfecture'); expect(t.who).toContain('Hôtel Forbin de Sainte-Croix');
  });
  it('mini-game: never a blocking failure, at most +1 slot; "laisser faire" = average result (+1)', async () => {
    const { miniScore } = await import('../src/facade'); expect(miniScore(0, false)).toBe(0); expect(miniScore(1, false)).toBe(0); expect(miniScore(0, true)).toBe(0); expect(miniScore(5, true)).toBe(1);
    const g = fresh(); const t = addTicket(g, 'introuvable'); g.pile.push(t.id); g.today!.plan.momo = [t.id]; G.launch(g); runUntilPending(g);
    expect(g.today!.pending[0].kind).toBe('mini'); const before = g.today!.capys.momo.left; G.miniResult(g, 1, 'x'); expect(g.today!.capys.momo.left).toBe(before + 1);
  });
});

describe('safety rule (gas call before digging)', () => {
  const setup = () => { const g = fresh(); const t = addTicket(g, 'fuite_bt'); g.pile.push(t.id); const c = TEAM.find((k) => G.canDo(k.id, t.id, g))!; g.today!.plan[c.id] = [t.id]; return { g, t, c }; };
  it("cap1: launch allowed, flagged red, safety card, day capped at 1 star", () => {
    const { g, t } = setup(); expect(G.canLaunch(g, 'cap1')).toBe(true);
    expect(G.warnings(g, 'cap1').some((w) => w.level === 'red' && w.text.includes('1 étoile'))).toBe(true);
    G.launch(g); runUntilPending(g); expect(g.today!.pending[0].kind).toBe('safety');
    let k = 0; while (g.today!.phase === 'run' && k++ < 200) { G.step(g); while (g.today!.pending.length) G.choose(g, 0); }
    expect(t.gas).toBe(true); expect(g.today!.incidents).toBe(1); expect(g.today!.stars).toBeLessThanOrEqual(1);
  });
  it('block: the day cannot be launched until every dig has its call', () => {
    const { g, t } = setup(); expect(G.canLaunch(g, 'block')).toBe(false); G.toggleGas(g, t.id); expect(G.canLaunch(g, 'block')).toBe(true);
    expect(G.warnings(g, 'block').some((w) => w.text.includes('gaz'))).toBe(false);
  });
});

describe('real addresses', () => {
  it('tickets carry the real house number of their site, never the préfet site at random, and open tickets never share a street node', () => {
    const g = fresh(); for (let i = 0; i < 40; i++) addTicket(g, 'prc');
    const open = g.pile.map((id) => g.tickets[id]);
    for (const t of open) { expect(t.num).toBe(SITES[t.site].num); expect(t.site).not.toBe(PREFET_SITE); }
    const nodes = open.map((t) => SITES[t.site].node); expect(new Set(nodes).size).toBe(nodes.length);
  });
});
describe('real addresses overnight', () => {
  it('a valve that gives up keeps its real address (number + street) as an urgent leak', () => {
    const g = fresh(); const t = addTicket(g, 'coupure'); t.deadline = g.day; const site = t.site;
    G.launch(g); let k = 0; while (g.today!.phase === 'run' && k++ < 200) { G.step(g); while (g.today!.pending.length) G.choose(g, 0); }
    G.nextDay(g); const n = Object.values(g.tickets).find((x) => x.job === 'fuite_bt' && x.site === site)!;
    expect(n).toBeTruthy(); expect(n.num).toBe(SITES[site].num); expect(n.risks.includes('ruelle')).toBe(SITES[site].narrow);
  });
});
describe('VIP surprises', () => {
  const callVip = (g: G.Game, card: string) => { g.today!.phase = 'run'; g.today!.pending.push({ card, kind: 'event', capy: null, ticket: null }); return G.choose(g, EVENTS[card].choices.findIndex((c) => c.fx.vip))!; };
  it('event slots are unique within a day (an event is keyed by its slot) and every VIP card is scheduled once', () => {
    for (const d of DAYS_SPEC) expect(new Set(d.events.map((e) => e[0])).size).toBe(d.events.length);
    for (const v of ['vip_patron', 'vip_rival', 'vip_maire', 'vip_agglo']) expect(DAYS_SPEC.flatMap((d) => d.events).filter((e) => e[1] === v).length, v).toBe(1);
  });
  it('outcome by start delay: the boss wants it fast, the rival has a sweet spot inside the contract delay, the agglo wants no favour', () => {
    expect([0, 1, 2, 3, 4, null].map((x) => vipOutcome(VIPS.patron, x))).toEqual(['fast', 'fast', 'mid', 'mid', 'late', 'late']);
    expect([0, 1, 2, 4, 5, null].map((x) => vipOutcome(VIPS.rival, x))).toEqual(['fast', 'fast', 'mid', 'mid', 'late', 'late']);
    expect(VIPS.rival.mid.sat).toBeGreaterThan(VIPS.rival.fast.sat); expect(VIPS.rival.late.sat).toBeLessThan(0);
    expect(VIPS.agglo.mid.sat).toBeGreaterThan(VIPS.agglo.fast.sat); expect(VIPS.patron.late.star).toBe(true);
  });
  it("the boss's leak: VIP ticket at a real address, judged when the job starts, then he gives advice", () => {
    const g = fresh(); const t = callVip(g, 'vip_patron');
    expect(t.vip).toBe('patron'); expect(t.risks).toEqual([]); expect(t.who).toContain('Lyonnaise des Robinets'); expect(t.num).toBe(SITES[t.site].num);
    const d = g.today!; d.plan.momo = [t.id]; const sat = g.sat; G.step(g);
    expect(d.vip![t.id]).toBe('fast'); expect(g.sat).toBe(sat + VIPS.patron.fast.sat); expect(d.pending.some((p) => p.card === 'vip_conseils' && p.ticket === t.id)).toBe(true);
  });
  it('a VIP never started on the day of the call is judged late at the close (boss: one star less)', () => {
    const g = fresh(); const t = callVip(g, 'vip_patron'); const d = g.today!; d.pending = [];
    for (const c of TEAM) d.plan[c.id] = []; d.slot = SLOTS; G.closeDay(g);
    expect(d.vip![t.id]).toBe('late'); expect(d.stars).toBe(Math.max(0, d.met!.filter(Boolean).length - 1));
  });
  it('the rival: starting 2 to 4 h after the call is the sweet spot; the mairie card goes to the real hôtel de ville', () => {
    const g = fresh(); const t = callVip(g, 'vip_rival'); const d = g.today!; d.slot = 3; d.plan.momo = [t.id]; d.capys.momo.pos = SITES[t.site].node; const sat = g.sat; G.step(g);
    expect(d.vip![t.id]).toBe('mid'); expect(g.sat).toBe(sat + 2);
    const m = callVip(fresh(), 'vip_maire'); expect(`${m.num} ${SITES[m.site].street}`).toBe("15 Place de l'Horloge"); expect(m.who).not.toMatch(/Monsieur|Madame/);
  });
});
describe('Festival d’Avignon', () => {
  const call = (g: G.Game, card: string) => { g.today!.phase = 'run'; g.today!.pending.push({ card, kind: 'event', capy: null, ticket: null }); return G.choose(g, EVENTS[card].choices.findIndex((c) => c.fx.vip))!; };
  it('one festival day with its 4 cards; every public VIP/Festival place exists at its real OSM address', () => {
    const fd = DAYS_SPEC.filter((d) => d.card === 'festival'); expect(fd.length).toBe(1);
    expect(fd[0].events.map((e) => e[1]).sort()).toEqual(['fest_artiste', 'fest_cour', 'fest_fontaine', 'fest_off']);
    for (const v of Object.values(VIPS)) if (v.site) expect(SITES.findIndex((s) => s.num === v.site![0] && s.street === v.site![1]), v.site.join(' ')).toBeGreaterThanOrEqual(0);
    const g = fresh(); expect(`${call(g, 'fest_cour').num} ${SITES[g.tickets[g.pile.at(-1)!].site].street}`).toBe('15 Place du Palais');
    const o = call(g, 'fest_off'); expect(`${o.num} ${SITES[o.site].street}`).toBe('15 Rue des Teinturiers'); expect(VIPS.off.watch).toBe('fest_comedien');
  });
  it('festival modifier: shorter walks already cost a slot, and scheduled cuts are blocked by the municipal order', () => {
    const g = fresh(); const t = addTicket(g, 'coupure'); t.avail = g.day; expect(G.avail(g, t.id)).toBe(true);
    const a = SITES.findIndex((s) => s.node !== SITES[0].node && (() => { const x = G.travelCost(g, SITES[0].node, SITES.indexOf(s)); return x === 0; })() && Math.hypot(s.x - SITES[0].x, s.y - SITES[0].y) > 420);
    g.day = DAYS_SPEC.findIndex((d) => d.card === 'festival'); expect(G.festivalBlocked(g, t.id)).toBe(true); expect(G.avail(g, t.id)).toBe(false);
    if (a >= 0) expect(G.travelCost(g, SITES[0].node, a)).toBe(1);
  });
});

describe('boucle v2: yield explainer and day lines', () => {
  it('the per-ticket yield reasons add up to the change of the day, and the live yield equals the close', async () => {
    const { playDay } = await import('./bot');
    for (const seed of [2026, 7]) { const g = G.newGame(seed); G.startDay(g);
      for (let day = 0; day < 4; day++) { playDay(g); const w = G.yieldWhy(g); const sum = w.items.reduce((s, x) => s + x.pt, 0);
        expect(Math.abs(sum - (w.y1 - w.y0) * 100)).toBeLessThan(0.051); expect(w.y1).toBeCloseTo(g.history.at(-1)!.yield, 10);
        expect(G.dayLine(g).length).toBeGreaterThan(5); G.nextDay(g); expect(G.yieldLive(g)).toBeCloseTo(g.today!.y0!, 10); } }
  });
  it('every change of the subscribers is explained (« Abonnés » sheet)', async () => {
    const { playDay } = await import('./bot');
    for (const seed of [2026, 7, 11]) { const g = G.newGame(seed); G.startDay(g);
      for (let day = 0; day < 5; day++) { playDay(g); const d = g.today!; const sum = (d.satWhy ?? []).reduce((s, x) => s + x.v, 0);
        expect(sum).toBeCloseTo(g.sat - d.satStart, 6); for (const x of d.satWhy ?? []) expect(x.text.length).toBeGreaterThan(5); G.nextDay(g); } }
  });
  it('log lines speak like a person (« 8 h · Fred sonne chez … »)', () => {
    const g = G.newGame(2026); G.startDay(g); const t = Object.values(g.tickets)[0];
    expect(G.jobLine('{c} sonne chez {who}, {rue}', 'Fred', t)).toMatch(/^Fred sonne chez .+, [a-zé]/);
  });
});
