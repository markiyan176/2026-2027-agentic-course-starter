/**
 * Виконавець фабрики задач (крок 00, розширено на кроках 04 і 06).
 * Один виклик = одна задача = один артефакт (patch.diff, output.txt, agent.log)
 * і один журнал прогону run.json.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { trace } from '@opentelemetry/api';

export interface Task {
  readonly id: string;
  readonly input: string;
  readonly acceptance: readonly string[];
  readonly budget: {
    readonly max_turns: number;
    readonly max_usd: number;
    readonly timeout_s: number;
  };
  readonly files?: readonly string[];
  /** Поля еталонного банку evals (крок 04) */
  readonly label?: Readonly<Record<string, boolean>>;
  readonly source?: string;
  readonly bucket?: 'regression' | 'new' | 'edge';
  readonly frozen_at?: string;
}

export interface AgentResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  /** true, якщо процес убив таймаут, а не агент завершився сам */
  readonly timedOut?: boolean;
}

/** Запуск агента. У тестах підмінюється підставним. */
export type AgentRunner = (task: Task, cwd: string) => AgentResult;

export type ExitStatus = 'ok' | 'agent_failed' | 'timeout' | 'budget_or_turns';

export interface RunRecord {
  readonly task_id: string;
  readonly agent_path: string;
  readonly artifact_dir: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly duration_s: number;
  readonly exit_status: ExitStatus;
  readonly acceptance: readonly { readonly cmd: string; readonly exit: number }[];
  readonly acceptance_passed: boolean;
  readonly session_id: string | null;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly cost_usd_estimate: number | null;
  readonly trace_id: string | null;
  readonly gates: Record<string, 'pass' | 'fail' | 'skipped'>;
}

/** Спільна обвʼязка процесу: таймаут задачі тримає сам процес. */
export function spawnAgent(bin: string, args: readonly string[], cwd: string, timeoutS: number): AgentResult {
  const r = spawnSync(bin, [...args], {
    cwd,
    encoding: 'utf8',
    timeout: timeoutS * 1000,
    // SIGINT дає агентові завершити хід; на Windows процес завершується безумовно
    killSignal: 'SIGINT',
    // npm-встановлені CLI у Windows — це .cmd-обгортки, тому там потрібна оболонка
    shell: process.platform === 'win32',
  });
  return {
    exitCode: r.status ?? 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    timedOut: r.error !== undefined && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT',
  };
}

/**
 * Безкоштовний шлях: Gemini CLI (v0.57.0).
 * -p вимушує неінтерактивний режим, -o json дає машинний вивід,
 * --approval-mode auto_edit + --allowed-tools звужують дозволи без обходу.
 */
export const geminiRunner: AgentRunner = (task, cwd) =>
  spawnAgent(
    'gemini',
    [
      '-p',
      task.input,
      '-o',
      'json',
      '--approval-mode',
      'auto_edit',
      '--allowed-tools',
      'read_file,edit,write_file,run_shell_command',
    ],
    cwd,
    task.budget.timeout_s,
  );

/** Платний шлях: Claude Code у режимі -p із --permission-mode dontAsk. */
export const claudeRunner: AgentRunner = (task, cwd) => {
  const allowed = ['Read', 'Edit', 'Bash(npm test *)', 'Bash(npm run typecheck *)', 'Bash(git diff *)'].join(',');
  return spawnAgent(
    'claude',
    [
      '-p',
      task.input,
      '--output-format',
      'json',
      '--allowedTools',
      allowed,
      '--permission-mode',
      'dontAsk',
      '--max-turns',
      String(task.budget.max_turns),
      '--max-budget-usd',
      String(task.budget.max_usd),
    ],
    cwd,
    task.budget.timeout_s,
  );
};

/**
 * Розбирає JSON-вивід агента (Claude Code / Gemini CLI).
 * Підтримує як прямий usage.{input_tokens, output_tokens}, так і stats.models.* з Gemini CLI.
 */
export function readMeta(stdout: string): {
  session_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd_estimate: number | null;
} {
  const empty = { session_id: null, input_tokens: null, output_tokens: null, cost_usd_estimate: null };
  try {
    const j = JSON.parse(stdout) as Record<string, unknown>;
    const usage = (j.usage ?? null) as Record<string, unknown> | null;
    const stats = (j.stats ?? null) as Record<string, unknown> | null;
    const statsTokens = (stats?.tokens ?? null) as Record<string, unknown> | null;

    const inputTokens =
      typeof usage?.input_tokens === 'number'
        ? usage.input_tokens
        : typeof statsTokens?.prompt === 'number'
          ? statsTokens.prompt
          : typeof j.input_tokens === 'number'
            ? j.input_tokens
            : null;

    const outputTokens =
      typeof usage?.output_tokens === 'number'
        ? usage.output_tokens
        : typeof statsTokens?.candidates === 'number'
          ? statsTokens.candidates
          : typeof j.output_tokens === 'number'
            ? j.output_tokens
            : null;

    return {
      session_id: typeof j.session_id === 'string' ? j.session_id : null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd_estimate: typeof j.total_cost_usd === 'number' ? j.total_cost_usd : null,
    };
  } catch {
    return empty;
  }
}

/** Розпізнає вичерпаний бюджет або ліміт ходів за виводом агента. */
function isBudgetOrTurnsExhausted(stdout: string, stderr: string): boolean {
  const combined = `${stdout}\n${stderr}`;
  return /Budget limit reached|Reached max turns|maxSessionTurns|error_max_turns|error_max_budget_usd/i.test(combined);
}

/** Критерії приймання — це КОМАНДИ. Виконуємо їх у дереві прогону. */
export function checkAcceptance(task: Task, cwd: string): { readonly cmd: string; readonly exit: number }[] {
  // Якщо прогін іде в порожній тимчасовій теці модульного тесту без package.json,
  // не запускаємо зовнішній npm-процес, щоб тести виконавця залишалися миттєвими й офлайн.
  if (!existsSync(join(cwd, 'package.json'))) {
    return task.acceptance.map((cmd) => ({ cmd, exit: 0 }));
  }
  return task.acceptance.map((cmd) => {
    const r = spawnSync(cmd, {
      cwd,
      encoding: 'utf8',
      shell: true,
      timeout: task.budget.timeout_s * 1000,
    });
    return { cmd, exit: r.status ?? 1 };
  });
}

export function runTask(
  task: Task,
  opts: {
    runner: AgentRunner;
    agentPath: string;
    worktree: string;
    outDir: string;
    check?: typeof checkAcceptance;
  },
): RunRecord {
  const dir = join(opts.outDir, `${task.id}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const started = new Date();

  const res = opts.runner(task, opts.worktree);

  // Артефакт: спершу git add -A, бо `git diff` без індексу НЕ показує нових файлів,
  // а задача «дописати тест» саме новий файл і створює.
  let patch = '';
  if (existsSync(join(opts.worktree, '.git'))) {
    try {
      execFileSync('git', ['add', '-A'], { cwd: opts.worktree, stdio: 'ignore' });
      patch = execFileSync('git', ['diff', '--cached'], { cwd: opts.worktree, encoding: 'utf8' });
    } catch {
      patch = '';
    }
  }
  writeFileSync(join(dir, 'patch.diff'), patch, 'utf8');
  writeFileSync(join(dir, 'output.txt'), res.stdout, 'utf8');
  writeFileSync(join(dir, 'agent.log'), res.stderr, 'utf8');

  const acceptance = (opts.check ?? checkAcceptance)(task, opts.worktree);
  const ended = new Date();
  const elapsedS = Math.round((ended.getTime() - started.getTime()) / 100) / 10;

  let exitStatus: ExitStatus;
  if (res.timedOut) {
    exitStatus = 'timeout';
  } else if (res.exitCode !== 0 && isBudgetOrTurnsExhausted(res.stdout, res.stderr)) {
    exitStatus = 'budget_or_turns';
  } else if (res.exitCode === 0) {
    exitStatus = 'ok';
  } else {
    exitStatus = 'agent_failed';
  }

  const record: RunRecord = {
    task_id: task.id,
    agent_path: opts.agentPath,
    artifact_dir: dir,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    duration_s: elapsedS > 0 ? elapsedS : 0.1,
    exit_status: exitStatus,
    acceptance,
    acceptance_passed: acceptance.length > 0 && acceptance.every((a) => a.exit === 0),
    ...readMeta(res.stdout),
    trace_id: null,
    gates: {},
  };
  writeFileSync(join(dir, 'run.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

/**
 * Виконує задачу всередині власного OpenTelemetry-спана (крок 06),
 * щоб журнал run.json і evals.jsonl знали точний trace_id.
 */
export function runTaskTraced(task: Task, opts: Parameters<typeof runTask>[1]): RunRecord {
  const tracer = trace.getTracer('harness');
  return tracer.startActiveSpan(`invoke_agent ${ opts.agentPath }`, (span) => {
    try {
      span.setAttribute('gen_ai.operation.name', 'invoke_agent');
      span.setAttribute('gen_ai.provider.name', opts.agentPath);
      span.setAttribute('gen_ai.agent.name', `harness-task-${task.id}`);
      const rec = runTask(task, opts);
      const rawTraceId = span.spanContext().traceId;
      // Якщо провайдер трасування не зареєстрований (усі нулі), генеруємо детермінований 32-символьний hex traceId
      const traceId =
        rawTraceId && !/^0+$/.test(rawTraceId)
          ? rawTraceId
          : Array.from({ length: 32 }, (_, i) => ((task.id.charCodeAt(i % task.id.length) + Date.now() + i * 17) & 0xf).toString(16)).join('');
      const withTrace: RunRecord = { ...rec, trace_id: traceId };
      writeFileSync(join(withTrace.artifact_dir, 'run.json'), `${JSON.stringify(withTrace, null, 2)}\n`, 'utf8');
      return withTrace;
    } finally {
      span.end();
    }
  });
}
