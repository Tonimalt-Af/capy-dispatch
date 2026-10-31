import { describe, it, expect } from 'vitest';
import * as G from '../src/game';
import { JOBS, TEAM, DAYS_SPEC, RISK_CARDS, EVENTS, type JobId } from '../src/content';
import { SLOTS, LUNCH_AFTER, slotLabel, SAFETY_RULE } from '../src/rules';
import { SITES, DEPOT } from '../src/map';

const fresh = () => { const g = G.newGame(2026); G.startDay(g); return g; };
const runUntilPending = (g: G.Game) => { let k = 0; while (g.today!.phase === 'run' && !g.today!.pending.length && k++ < 100) G.step(g); };
const addTicket = (g: G.Game, job: JobId, opts: Parameters<typeof G.makeTicket>[3] = {}) => { const t = G.makeTicket(g, job, G.rng(9), { slot: 0, ...opts }); t.avail = g.day; return t; };

describe('rules', () => {
  it('8 one-hour slots with a visible lunch break 12h-13h', () => {
    expect(SLOTS).toBe(8); expect(LUNCH_AFTER).toBe(4);
    expect([0, 3, 4, 7].map(slotLabel)).toEqual(['8 h', '11 h', '13 h', '16 h']);
  });
  it('the safety rule is configured in one place and defaults to cap1', () => { expect(SAFETY_RULE).toBe('cap1'); });
  it('9 job types, each with phase-2 data hooks (side / habilitation) and a known skill', () => {
    expect(Object.keys(JOBS).length).toBe(9);
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
