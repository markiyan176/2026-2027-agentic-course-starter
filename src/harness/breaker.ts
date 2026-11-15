/**
 * Шар харнеса (Крок 03): тристановий circuit breaker (closed / open / half-open),
 * стан якого зберігається між прогонами у файлі .harness/breaker.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

export const breakerStateSchema = z.enum(['closed', 'open', 'half-open']);
export type State = z.infer<typeof breakerStateSchema>;

export const breakerSchema = z
  .object({
    state: breakerStateSchema,
    fails: z.number().int().min(0),
    noProgressCount: z.number().int().min(0).default(0),
    openedAt: z.string().nullable(),
    trip: z.string().nullable(),
    cooldownMinutes: z.number().positive().default(30),
  })
  .strict();

export type Breaker = z.infer<typeof breakerSchema>;

export const DEFAULT_BREAKER_FILE = '.harness/breaker.json';
export const THRESHOLD = 3;
export const MAX_NO_PROGRESS = 4;
export const MAX_TASK_USD = 0.25;
export const COOLDOWN_MIN = 30;

export function load(file = DEFAULT_BREAKER_FILE): Breaker {
  if (!existsSync(file)) {
    return {
      state: 'closed',
      fails: 0,
      noProgressCount: 0,
      openedAt: null,
      trip: null,
      cooldownMinutes: COOLDOWN_MIN,
    };
  }
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return breakerSchema.parse(parsed);
}

export function save(b: Breaker, file = DEFAULT_BREAKER_FILE): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(b, null, 2)}\n`, 'utf8');
}

/** Чи можна взяти наступну задачу з черги. */
export function mayRun(
  file = DEFAULT_BREAKER_FILE,
  nowMs = Date.now(),
): { allow: boolean; probe: boolean; why: string } {
  const b = load(file);
  if (b.state === 'closed') {
    return { allow: true, probe: false, why: 'closed' };
  }
  if (b.state === 'half-open') {
    // Якщо вже у стані half-open і пробна задача ще не завершилась — другу паралельно не пускаємо
    return { allow: false, probe: false, why: 'half-open: пробна задача вже виконується' };
  }
  const openedMs = b.openedAt ? Date.parse(b.openedAt) : nowMs;
  const waited = (nowMs - openedMs) / 60_000;
  if (waited < b.cooldownMinutes) {
    return { allow: false, probe: false, why: `open: ${b.trip ?? 'threshold'} (залишилось ${(b.cooldownMinutes - waited).toFixed(1)} хв)` };
  }
  save({ ...b, state: 'half-open' }, file);
  // half-open — РІВНО одна пробна задача
  return { allow: true, probe: true, why: 'half-open: пробна задача' };
}

/**
 * Записує результат виконання задачі.
 * Відмова провайдера за квотою (HTTP 429) або перевищення бюджету задачі ($0.25)
 * відкривають брейкер НЕГАЙНО, не чекаючи THRESHOLD = 3 відмов підряд.
 */
export function record(
  ok: boolean,
  trip: string | null,
  options?: { file?: string; costUsd?: number; nowIso?: string },
): Breaker {
  const file = options?.file ?? DEFAULT_BREAKER_FILE;
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const b = load(file);

  if (ok && (options?.costUsd ?? 0) <= MAX_TASK_USD) {
    const next: Breaker = {
      state: 'closed',
      fails: 0,
      noProgressCount: 0,
      openedAt: null,
      trip: null,
      cooldownMinutes: COOLDOWN_MIN,
    };
    save(next, file);
    return next;
  }

  const isQuota429 = trip !== null && (/429|RESOURCE_EXHAUSTED|quota/i.test(trip));
  const isOverBudget = (options?.costUsd ?? 0) > MAX_TASK_USD;
  const fails = b.fails + 1;
  const noProgressCount = b.noProgressCount + 1;
  const wasHalfOpen = b.state === 'half-open';

  const shouldOpen =
    wasHalfOpen ||
    isQuota429 ||
    isOverBudget ||
    fails >= THRESHOLD ||
    noProgressCount >= MAX_NO_PROGRESS;

  const nextCooldown = wasHalfOpen ? b.cooldownMinutes * 2 : COOLDOWN_MIN;
  const reason = isQuota429
    ? `HTTP 429 quota exhausted (${trip})`
    : isOverBudget
      ? `task cost $${options?.costUsd?.toFixed(3)} > budget $${MAX_TASK_USD}`
      : trip ?? `${fails} consecutive failures`;

  const next: Breaker = {
    state: shouldOpen ? 'open' : 'closed',
    fails,
    noProgressCount,
    openedAt: shouldOpen ? nowIso : null,
    trip: shouldOpen ? reason : null,
    cooldownMinutes: nextCooldown,
  };
  save(next, file);
  return next;
}
