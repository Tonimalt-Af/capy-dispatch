// « Tournée du jour »: 30 consecutive dates, each proven 3 ★ and played by the three bots.
import { describe, it, expect } from 'vitest';
import { playKind, type Kind } from './bot';
import { dailyGame, seedOf, addDays, lastDays, playable, record, result, shareText, readDaily, dateLabel, type DailyStore } from '../src/daily';
import { tryDay } from '../src/hindsight';
import { game } from '../src/storage';
import { totalStars } from '../src/game';

const dates = Array.from({ length: 30 }, (_, i) => addDays('2026-11-01', i));
const runs = dates.map((k) => ({ k, ...dailyGame(k) }));
const stars = Object.fromEntries((['opt', 'obvious', 'random'] as Kind[]).map((kind) => [kind, runs.map(({ k }) => totalStars(playKind(0, kind, undefined, true, dailyGame(k).g)))])) as Record<Kind, number[]>;
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

describe('Tournée du jour', () => {
  it('the same date gives the same day on every phone, another date another day', () => {
    expect(JSON.stringify(dailyGame('2026-11-05').g)).toBe(JSON.stringify(dailyGame('2026-11-05').g));
    expect(new Set(dates.map(seedOf)).size).toBe(30); expect(new Set(runs.map((r) => JSON.stringify(r.g.specs))).size).toBe(30);
  });
  it('30 consecutive dates: every day is proven 3 ★ from its morning, and the bots rank random < obvious < optimised', () => {
    for (const r of runs) { expect(r.proven, r.k).toBe(true);
      let ok = false; for (let i = 0; i < 48 && !ok; i++) ok = tryDay(r.g, r.g.seed * 7919 + r.g.day * 104729 + i * 31 + 5, i < 3 ? 0 : Math.min(1, (i / 48) * 1.5), i < 3 ? 0.15 * i : 0.35, i < 6 ? 0 : (i % 5) * 0.06, 1, false).today!.stars === 3;
      expect(ok, r.k).toBe(true); }
    expect(mean(stars.random)).toBeLessThan(mean(stars.obvious)); expect(mean(stars.obvious)).toBeLessThan(mean(stars.opt));
    (globalThis as { __daily?: unknown }).__daily = { opt: mean(stars.opt), obvious: mean(stars.obvious), random: mean(stars.random) };
  });
  it('one ranked attempt, then free tries; 7 days to catch up; no streak anywhere', () => {
    const st: DailyStore = { v: 1, res: {}, cur: null }; const g = playKind(0, 'obvious', undefined, true, dailyGame('2026-11-03').g); const r1 = result(g);
    record(st, '2026-11-03', r1); const g2 = playKind(0, 'opt', undefined, true, dailyGame('2026-11-03').g); const r = record(st, '2026-11-03', result(g2));
    expect(r.stars).toBe(r1.stars); expect(r.tries).toBe(2); expect(r.best).toBeGreaterThanOrEqual(r1.stars);
    expect(lastDays('2026-11-09')).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']);
    expect(playable('2026-11-03', '2026-11-09')).toBe(true); expect(playable('2026-11-02', '2026-11-09')).toBe(false); expect(playable('2026-11-10', '2026-11-09')).toBe(false);
    expect(Object.keys(st)).toEqual(['v', 'res', 'cur']); // nothing counts consecutive days
    expect(dateLabel('2026-11-01')).toBe('dimanche 1er novembre');
  });
  it('the shared text tells the result without spoiling the day (no ticket, address or objective)', () => {
    const g = playKind(0, 'opt', undefined, true, dailyGame('2026-11-04').g); const t = shareText('2026-11-04', result(g), ['Josette', 'Fred', 'Lulu'], 'https://x/');
    expect(t.split('\n')).toHaveLength(7); expect(t).toMatch(/^Capy Dispatch · Tournée du 4 novembre\n[★☆]{3} · rendement [+−][\d,]+ pt\n\d+ m³ perdus · \d+ h de route\nJosette [█░]{8}\nFred    [█░]{8}/);
    for (const tk of Object.values(g.tickets)) { expect(t).not.toContain(tk.who); } expect(t).not.toMatch(/RDV|PRC|rue|place/i);
  });
  it('the store survives a reload, drops broken entries and days past the window', () => {
    const g = dailyGame('2026-11-08').g; const raw = JSON.stringify({ v: 1, res: { '2026-11-07': { stars: 2, met: [true, true, false], dy: 0.4, m3: 30, travel: 4, load: [0.5, 1, 0.75], tries: 1, best: 2 }, '2026-11-06': { stars: 9 }, '<x>': {} }, cur: { date: '2026-11-08', ranked: true, game: g } });
    const st = readDaily(raw, game, '2026-11-09'); expect(Object.keys(st.res)).toEqual(['2026-11-07']); expect(st.cur?.game.daily).toBe('2026-11-08');
    expect(readDaily(raw, game, '2026-11-20').cur).toBeNull(); expect(readDaily('{', game).res).toEqual({});
  });
});
