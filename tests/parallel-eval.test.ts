import { describe, expect, it } from 'vitest';

import { BUDGET, runPool } from '../scripts/parallel-eval';

describe('runPool (крок 07)', () => {
  it('виконує всі задачі в межах бюджету при ширині 4', async () => {
    let spent = 0;
    const tasks = Array.from({ length: 8 }, (_, i) => async () => {
      spent += 100;
      return `ok-${i}`;
    });
    const res = await runPool(tasks, BUDGET, () => spent);
    expect(res.stoppedEarly).toBe(false);
    expect(res.results).toHaveLength(8);
  });

  it('зупиняє старт нових гілок при перевищенні стелі токенів maxTokens', async () => {
    let spent = 0;
    const tasks = Array.from({ length: 6 }, (_, i) => async () => {
      spent += 600;
      return i;
    });
    const res = await runPool(tasks, { maxBranches: 1, maxTokens: 1000, maxWallMs: 60_000 }, () => spent);
    expect(res.stoppedEarly).toBe(true);
    expect(res.stoppedReason).toBe('budget');
    expect(res.results.filter((r) => r !== undefined)).toHaveLength(2);
  });

  it('спрацьовує early-stop, якщо після >= 4 гілок є >= 3 помилок', async () => {
    const tasks = Array.from({ length: 8 }, (_, i) => async () => {
      if (i < 3) throw new Error(`fail-${i}`);
      return i;
    });
    const res = await runPool(tasks, { maxBranches: 1, maxTokens: 30_000, maxWallMs: 60_000 }, () => 0);
    expect(res.stoppedEarly).toBe(true);
    expect(res.stoppedReason).toBe('early-stop');
  });
});
