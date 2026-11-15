import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { COOLDOWN_MIN, load, mayRun, record } from '../../src/harness/breaker';
import { stepLimit } from '../../src/harness/stop';

describe('stopWhen stepLimit + circuit breaker (Step 03)', () => {
  it('stepLimit викликає isStepCount(n) і дописує рядок у stop-log.jsonl при досягненні стелі', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stop-test-'));
    const logPath = join(dir, 'stop-log.jsonl');
    try {
      const cond = stepLimit(3, 't-08', logPath);
      const fakeStep = {} as never;

      const hit2 = await Promise.resolve(cond({ steps: [fakeStep, fakeStep] }));
      expect(hit2).toBe(false);

      const hit3 = await Promise.resolve(cond({ steps: [fakeStep, fakeStep, fakeStep] }));
      expect(hit3).toBe(true);

      // Дочекатися асинхронного запису Promise.resolve(r).then(...)
      await new Promise((r) => setTimeout(r, 20));
      const logContent = readFileSync(logPath, 'utf8').trim();
      const parsed = JSON.parse(logContent) as { taskId: string; limit: string; n: number; step: number };
      expect(parsed.taskId).toBe('t-08');
      expect(parsed.limit).toBe('isStepCount');
      expect(parsed.n).toBe(3);
      expect(parsed.step).toBe(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('circuit breaker переходить closed -> open після 3 відмов, чекає cooldown і пускає рівно 1 пробну задачу в half-open', () => {
    const dir = mkdtempSync(join(tmpdir(), 'breaker-test-'));
    const file = join(dir, 'breaker.json');
    try {
      expect(mayRun(file)).toEqual({ allow: true, probe: false, why: 'closed' });

      record(false, 'tests_failed', { file, nowIso: '2026-11-15T18:00:00.000Z' });
      record(false, 'tests_failed', { file, nowIso: '2026-11-15T18:01:00.000Z' });
      expect(load(file).state).toBe('closed');

      record(false, 'tests_failed', { file, nowIso: '2026-11-15T18:02:00.000Z' });
      expect(load(file).state).toBe('open');

      // До завершення 30-хвилинного cooldown — не пускає
      const blocked = mayRun(file, Date.parse('2026-11-15T18:15:00.000Z'));
      expect(blocked.allow).toBe(false);
      expect(blocked.why).toContain('open');

      // Після 31 хвилини — переходить у half-open і дозволяє РІВНО одну пробну задачу
      const probe = mayRun(file, Date.parse('2026-11-15T18:33:00.000Z'));
      expect(probe).toEqual({ allow: true, probe: true, why: 'half-open: пробна задача' });

      // Поки перша пробна задача ще не завершилась — друга блокується
      const secondDuringProbe = mayRun(file, Date.parse('2026-11-15T18:33:05.000Z'));
      expect(secondDuringProbe.allow).toBe(false);

      // Якщо пробна задача падає — негайно повертається в open з подвоєним cooldown (60 хв)
      const reopened = record(false, 'probe_failed', { file, nowIso: '2026-11-15T18:34:00.000Z' });
      expect(reopened.state).toBe('open');
      expect(reopened.cooldownMinutes).toBe(COOLDOWN_MIN * 2);

      // Після успішної пробної задачі — закривається (closed)
      mayRun(file, Date.parse('2026-11-15T19:40:00.000Z'));
      const closedAgain = record(true, null, { file });
      expect(closedAgain.state).toBe('closed');
      expect(closedAgain.fails).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('негайно відкриває брейкер на HTTP 429 (вичерпання квоти провайдера) з першого разу', () => {
    const dir = mkdtempSync(join(tmpdir(), 'breaker-429-'));
    const file = join(dir, 'breaker.json');
    try {
      const b = record(false, 'HTTP 429 RESOURCE_EXHAUSTED: free tier quota reached', {
        file,
        nowIso: '2026-11-15T18:10:00.000Z',
      });
      expect(b.state).toBe('open');
      expect(b.fails).toBe(1);
      expect(b.trip).toContain('HTTP 429');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
