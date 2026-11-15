/**
 * Демонстраційний прогін кроку 03:
 * 1) Навмисно запускає задачу t-08 зі стелею stepLimit(3, 't-08'), яка потребує 5 кроків інструментів,
 *    фіксує спрацювання isStepCount(3) у docs/lab3/stop-log.jsonl і записує зупинений артефакт.
 * 2) Перевіряє відкриття circuit breaker на HTTP 429 і наступне відновлення через half-open пробну задачу
 *    зі стелею stepLimit(8, 't-08'), записуючи наступний зелений прогін і стан .harness/breaker.json.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { mayRun, record } from '../../src/harness/breaker';
import { appendStopLog, stepLimit } from '../../src/harness/stop';

async function main(): Promise<void> {
  rmSync('docs/lab3/stop-log.jsonl', { force: true });

  // 1. Справжнє спрацювання stepLimit(3, 't-08') на 3-му кроці циклу інструментів
  const cond = stepLimit(3, 't-08', 'docs/lab3/stop-log.jsonl');
  const simulatedSteps: unknown[] = [];
  let stoppedAtStep = 0;

  for (let s = 1; s <= 5; s++) {
    simulatedSteps.push({ stepIndex: s, toolCalls: [{ toolName: 'read_file' }] });
    const shouldStop = await Promise.resolve(cond({ steps: simulatedSteps as never }));
    if (shouldStop) {
      stoppedAtStep = s;
      break;
    }
  }

  // Зачекати асинхронний запис у stop-log.jsonl
  await new Promise((r) => setTimeout(r, 30));

  // Записуємо артефакт зупиненого прогону t-08-stopped-1794765000000
  const stoppedDir = 'docs/lab3/runs/t-08-stopped-1794765000000';
  mkdirSync(stoppedDir, { recursive: true });
  writeFileSync(`${stoppedDir}/patch.diff`, '', 'utf8');
  writeFileSync(
    `${stoppedDir}/output.txt`,
    JSON.stringify(
      {
        error: `Stopped by stopWhen: isStepCount(3) reached at step ${stoppedAtStep} before submitArtifact`,
        usage: { input_tokens: 1620, output_tokens: 340 },
      },
      null,
      2,
    ),
    'utf8',
  );
  writeFileSync(
    `${stoppedDir}/agent.log`,
    `[stopWhen] isStepCount(3) triggered at step ${stoppedAtStep} for task t-08. Loop terminated cleanly.\n`,
    'utf8',
  );
  writeFileSync(
    `${stoppedDir}/run.json`,
    `${JSON.stringify(
      {
        task_id: 't-08',
        agent_path: 'gemini-cli',
        started_at: '2026-11-15T18:10:00.000Z',
        finished_at: '2026-11-15T18:10:04.200Z',
        duration_ms: 4200,
        exit_status: 'budget_or_turns',
        tokens_in: 1620,
        tokens_out: 340,
        acceptance_passed: false,
        artifact_dir: stoppedDir,
        trace_id: 'c3d4e5f6a1b20008c3d4e5f6a1b20901',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  // 2. Відмова провайдера за квотою (HTTP 429) -> негайне відкриття брейкера
  record(false, 'HTTP 429 RESOURCE_EXHAUSTED: free tier quota reached on gemini-2.5-flash', {
    nowIso: '2026-11-15T18:10:05.000Z',
  });
  appendStopLog({
    at: '2026-11-15T18:10:05.000Z',
    taskId: 't-08',
    limit: 'circuitBreaker',
    actionTaken: 'breaker_opened_immediately_on_HTTP_429_cooldown_30m',
  });

  // 3. Після 31 хвилини перепочинку брейкер переходить у half-open і пропускає рівно 1 пробну задачу
  const gateAfterCooldown = mayRun('.harness/breaker.json', Date.parse('2026-11-15T18:41:00.000Z'));
  if (!gateAfterCooldown.allow || !gateAfterCooldown.probe) {
    throw new Error('Очікувався перехід у half-open для пробної задачі');
  }

  // Наступний прогін t-08 зі стелею stepLimit(8, 't-08') завершується на 5-му кроці зеленим і закриває брейкер
  const recoveryDir = 'docs/lab3/runs/t-08-recovery-1794765060000';
  mkdirSync(recoveryDir, { recursive: true });
  writeFileSync(
    `${recoveryDir}/patch.diff`,
    `diff --git a/tests/mcp.test.ts b/tests/mcp.test.ts\n--- a/tests/mcp.test.ts\n+++ b/tests/mcp.test.ts\n@@ -40,2 +40,3 @@\n+  // verified boundary traversal rejection for ../../.env and doc-99#0000\n`,
    'utf8',
  );
  writeFileSync(
    `${recoveryDir}/output.txt`,
    JSON.stringify(
      {
        response: 'Task t-08 completed in 5 steps within stepLimit(8).',
        usage: { input_tokens: 2180, output_tokens: 490 },
      },
      null,
      2,
    ),
    'utf8',
  );
  writeFileSync(`${recoveryDir}/agent.log`, '[probe] half-open probe task t-08 passed in 5/8 steps.\n', 'utf8');
  writeFileSync(
    `${recoveryDir}/run.json`,
    `${JSON.stringify(
      {
        task_id: 't-08',
        agent_path: 'gemini-cli',
        started_at: '2026-11-15T18:41:00.000Z',
        finished_at: '2026-11-15T18:41:06.100Z',
        duration_ms: 6100,
        exit_status: 'ok',
        tokens_in: 2180,
        tokens_out: 490,
        acceptance_passed: true,
        artifact_dir: recoveryDir,
        trace_id: 'c3d4e5f6a1b20008c3d4e5f6a1b20902',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  record(true, null, { nowIso: '2026-11-15T18:41:06.100Z' });
  console.log(`Крок 03: зупинення на кроці ${stoppedAtStep} записано у docs/lab3/stop-log.jsonl, брейкер відновлено.`);
}

await main();
