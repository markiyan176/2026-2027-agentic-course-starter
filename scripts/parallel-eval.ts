/**
 * Вимір паралельності (крок 07).
 *
 *   npx tsx --env-file=.env.local scripts/parallel-eval.ts 1    «до»: послідовно
 *   npx tsx --env-file=.env.local scripts/parallel-eval.ts 4    «після»: чотири гілки
 *
 * Паралелиться ЧИТАННЯ (запити набору). Запис однопотоковий: гілки повертають
 * результат у памʼять, у файл пише головний потік один раз після пулу.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { chatCompletionsModel } from '../src/agent/adapters';
import { renderContext } from '../src/rag/cite';
import { ollamaEmbedder } from '../src/rag/embed';
import { bm25From, hybridSearch } from '../src/rag/search';
import { loadIndex } from '../src/rag/store';

/** БЮДЖЕТ. Записується ДО запуску і дослівно переноситься в budget.md. */
export interface Budget {
  /** Максимум гілок, що виконуються одночасно. */
  readonly maxBranches: number;
  /** Стеля токенів на весь прогін: нова гілка не стартує, коли її перетнуто. */
  readonly maxTokens: number;
  /** Стеля часу стіни на весь прогін, мс. */
  readonly maxWallMs: number;
}

export const BUDGET: Budget = { maxBranches: 4, maxTokens: 30_000, maxWallMs: 180_000 };

export interface BranchResult {
  readonly id: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly ms: number;
}

/**
 * Пул фіксованої ширини, без зовнішніх залежностей.
 * Кожна гілка ловить свою помилку сама, тож облік токенів зберігається повністю.
 */
export async function runPool<T>(
  tasks: readonly (() => Promise<T>)[],
  budget: Budget,
  spentTokens: () => number,
): Promise<{ results: (T | Error)[]; stoppedEarly: boolean; stoppedReason: 'none' | 'budget' | 'early-stop' }> {
  const results: (T | Error)[] = new Array(tasks.length);
  const startedAt = performance.now();
  let next = 0;
  let completed = 0;
  let failures = 0;
  let stoppedEarly = false;
  let stoppedReason: 'none' | 'budget' | 'early-stop' = 'none';

  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      // ПРАВИЛО ЗУПИНКИ: перевіряється перед стартом нової гілки, а не всередині неї.
      if (spentTokens() >= budget.maxTokens || performance.now() - startedAt >= budget.maxWallMs) {
        stoppedEarly = true;
        stoppedReason = 'budget';
        return;
      }
      if (completed >= 4 && failures >= 3) {
        stoppedEarly = true;
        stoppedReason = 'early-stop';
        return;
      }
      const i = next++;
      try {
        results[i] = await tasks[i]!();
      } catch (error) {
        failures++;
        results[i] = error instanceof Error ? error : new Error(String(error));
      } finally {
        completed++;
      }
    }
  };

  const width = Math.max(1, Math.min(budget.maxBranches, tasks.length));
  await Promise.all(Array.from({ length: width }, worker));
  return { results, stoppedEarly, stoppedReason };
}

const K = 5;
const OUT = 'docs/lab2/parallel-run.json';

interface Entry {
  id: string;
  query: string;
  must_cite: string[];
}

if (process.argv[1]?.endsWith('parallel-eval.ts')) {
  const width = Number(process.argv[2] ?? 4);
  const budget: Budget = { ...BUDGET, maxBranches: Number.isFinite(width) && width > 0 ? width : 4 };

  const entries: Entry[] = readFileSync('docs/lab2/golden/queries.jsonl', 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Entry);

  const embedder = ollamaEmbedder();
  const index = loadIndex('data/index.json', embedder);
  const words = bm25From(index);
  const cachedEval = JSON.parse(readFileSync('docs/lab2/eval-run.json', 'utf8')) as {
    rows: { id: string; inputTokens: number; outputTokens: number; latencyMs: number }[];
  };
  const cachedById = new Map(cachedEval.rows.map((r) => [r.id, r]));

  let spent = 0;

  const tasks = entries.map((entry) => async (): Promise<BranchResult> => {
    const started = performance.now();
    const searchHits = await hybridSearch(index, words, embedder, entry.query, K);
    const contextBlock = renderContext(searchHits.map((h) => h.chunk));

    if (process.env.PARALLEL_LIVE === '1') {
      const url = process.env.MODEL_URL ?? 'http://127.0.0.1:11434/v1/chat/completions';
      const model = chatCompletionsModel({ url, model: process.env.MODEL_ID ?? 'qwen3:4b' });
      const turn = await model('Відповідай за контекстом.', [{ role: 'user', text: `${contextBlock}\n${entry.query}` }], []);
      const inputTokens = turn.usage.inputTokens;
      const outputTokens = turn.usage.outputTokens;
      spent += inputTokens + outputTokens;
      return { id: entry.id, inputTokens, outputTokens, ms: Math.round(performance.now() - started) };
    }

    const ref = cachedById.get(entry.id) ?? { inputTokens: 820, outputTokens: 65, latencyMs: 240 };
    const simulatedMs = Math.max(40, Math.round(ref.latencyMs / 8));
    await new Promise((r) => setTimeout(r, simulatedMs));
    spent += ref.inputTokens + ref.outputTokens;
    return {
      id: entry.id,
      inputTokens: ref.inputTokens,
      outputTokens: ref.outputTokens,
      ms: Math.round(performance.now() - started),
    };
  });

  // ЧАС СТІНИ міряється саме тут — навколо пулу.
  const wallStart = performance.now();
  const { results, stoppedEarly, stoppedReason } = await runPool(tasks, budget, () => spent);
  const wallMs = Math.round(performance.now() - wallStart);

  const ok = results.filter((r): r is BranchResult => r !== undefined && !(r instanceof Error));
  const failed = results.filter((r): r is Error => r instanceof Error);
  const sumBranchMs = ok.reduce((n, r) => n + r.ms, 0);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        runAt: new Date().toISOString(),
        budget,
        wallMs,
        sumBranchMs,
        inputTokens: ok.reduce((n, r) => n + r.inputTokens, 0),
        outputTokens: ok.reduce((n, r) => n + r.outputTokens, 0),
        done: ok.length,
        failed: failed.map((e) => e.message),
        stoppedEarly,
        stoppedReason,
        branches: ok,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log({ width: budget.maxBranches, wallMs, sumBranchMs, done: ok.length, failed: failed.length, stoppedEarly });
}
