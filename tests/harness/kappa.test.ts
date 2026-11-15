import { describe, expect, it } from 'vitest';

import { agreement, type Label } from '../../scripts/kappa';

describe('agreement & Cohen kappa (scripts/kappa.ts)', () => {
  it('обчислює сиру згоду, очікувану випадкову згоду та каппу Коена на різнорідному наборі', () => {
    const mine: Label[] = [
      'pass', 'pass', 'fail', 'fail', 'unknown', 'pass',
      'fail', 'unknown', 'pass', 'fail', 'pass', 'unknown',
    ];
    const judge: Label[] = [
      'pass', 'pass', 'fail', 'fail', 'unknown', 'pass',
      'fail', 'fail', 'pass', 'fail', 'pass', 'unknown',
    ];
    const r = agreement(mine, judge);
    expect(r.n).toBe(12);
    expect(r.raw).toBeCloseTo(11 / 12, 5);
    expect(r.expected).toBeGreaterThan(0.3);
    expect(r.kappa).toBeLessThan(r.raw);
    expect(r.kappa).toBeCloseTo(0.872, 2);
  });

  it('повертає NaN для каппи на однорідному наборі, де pe === 1', () => {
    const allPass: Label[] = ['pass', 'pass', 'pass', 'pass'];
    const r = agreement(allPass, allPass);
    expect(r.raw).toBe(1);
    expect(r.expected).toBe(1);
    expect(Number.isNaN(r.kappa)).toBe(true);
  });

  it('кидає помилку при порожній або різній довжині масивів розмітки', () => {
    expect(() => agreement([], [])).toThrow(/різна довжина/);
    expect(() => agreement(['pass'], ['pass', 'fail'])).toThrow(/різна довжина/);
  });
});
