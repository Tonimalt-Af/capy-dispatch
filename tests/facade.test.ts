import { it, expect } from 'vitest';
import { facade, wrongText, foundText } from '../src/facade';

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
