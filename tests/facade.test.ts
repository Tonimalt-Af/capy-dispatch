import { it, expect } from 'vitest';
import { facade, wrongText, foundText, spotLabel } from '../src/facade';

it('procedural façades: deterministic, several spots, the meter is never the door, the SIG hint keeps it', () => {
  for (let s = 1; s < 120; s++) {
    const f = facade(s); expect(facade(s).svg).toBe(f.svg);
    expect(f.spots.length).toBeGreaterThanOrEqual(5); expect(f.spots[f.meter].kind).not.toBe('porte');
    expect(f.hintSpots).toContain(f.meter); expect(f.hintSpots.length).toBeLessThan(f.spots.length); expect(f.hint.length).toBeGreaterThan(10);
    expect(f.svg.startsWith('<svg')).toBe(true); expect(f.svg).not.toMatch(/<script|on\w+=/i);
    for (const sp of f.spots) { expect(sp.x).toBeGreaterThan(0); expect(sp.x).toBeLessThan(400); expect(sp.y).toBeGreaterThan(0); expect(sp.y).toBeLessThan(240); }
    expect(wrongText(f, (f.meter + 1) % f.spots.length, s).length).toBeGreaterThan(3); expect(foundText(f.spots[f.meter].kind).length).toBeGreaterThan(1);
  }
});
it('the façades vary', () => { expect(new Set(Array.from({ length: 30 }, (_, i) => facade(i + 1).svg)).size).toBeGreaterThan(25); });

it('the picture can change, the hiding places stay put', () => {
  const lay = (s: number) => { const f = facade(s); return { meter: f.meter, spots: f.spots.map((p) => [p.kind, p.x, p.y]) }; };
  expect(lay(1)).toEqual({ meter: 4, spots: [['porte', 200, 162], ['regard', 330, 222], ['niche', 250, 152], ['poubelles', 150, 178], ['soupirail', 70, 186]] });
  expect(lay(2026)).toEqual({ meter: 2, spots: [['porte', 200, 162], ['regard', 330, 222], ['niche', 250, 152], ['velo', 150, 178], ['jardiniere', 40, 178]] });
  const f = facade(7);
  expect(f.svg).toContain('linearGradient'); expect(f.svg).toContain('class="prop"');
  for (const sp of f.spots) expect(f.svg).toContain(`data-p="${sp.id}"`);
  expect(spotLabel[f.spots[f.meter].kind].length).toBeGreaterThan(3);
});
