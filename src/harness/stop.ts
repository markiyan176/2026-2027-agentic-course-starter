/**
 * Шар прогону (Крок 03): умови зупинення циклу AI SDK (stopWhen) із журналюванням у docs/lab3/stop-log.jsonl.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { hasToolCall, isStepCount } from 'ai';

export interface StopLogEntry {
  readonly at: string;
  readonly taskId: string;
  readonly limit: 'isStepCount' | 'hasToolCall' | 'maxTurns' | 'timeout' | 'circuitBreaker';
  readonly n?: number;
  readonly tool?: string;
  readonly step?: number;
  readonly actionTaken: string;
}

/** Записує подію автоматичного зупинення у docs/lab3/stop-log.jsonl. */
export function appendStopLog(entry: StopLogEntry, logFile = 'docs/lab3/stop-log.jsonl'): void {
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

/**
 * Обгортка поверх канонічного isStepCount(n) із пакета 'ai'.
 * Тип беремо з самого помічника (typeof inner) — власного підпису не вигадуємо.
 */
export function stepLimit(
  n: number,
  taskId: string,
  logFile = 'docs/lab3/stop-log.jsonl',
): ReturnType<typeof isStepCount> {
  const inner = isStepCount(n);
  const wrapped: typeof inner = (...args) => {
    const r = inner(...args);
    void Promise.resolve(r).then((hit) => {
      if (!hit) return;
      const stepsCount = args[0]?.steps?.length ?? n;
      appendStopLog(
        {
          at: new Date().toISOString(),
          taskId,
          limit: 'isStepCount',
          n,
          step: stepsCount,
          actionTaken: 'stopped_loop_marked_budget_or_turns_recorded_breaker',
        },
        logFile,
      );
    });
    return r;
  };
  return wrapped;
}

/** Комбінований масив stopWhen для циклу агента: зупиняється, щойно спрацювала БУДЬ-ЯКА умова. */
export function defaultStopConditions(maxSteps: number, taskId: string, terminalTool = 'submitArtifact') {
  return [stepLimit(maxSteps, taskId), hasToolCall(terminalTool)];
}
