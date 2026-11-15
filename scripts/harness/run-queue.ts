/**
 * Черга фабрики задач (крок 00): одна задача (--id t-01) або всі з черги.
 * Готує ізольований git worktree на кожну задачу й прибирає після себе.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { geminiRunner, runTaskTraced, type Task } from './run-task';

const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'docs/lab3/tasks.jsonl';
const idIdx = process.argv.indexOf('--id');
const onlyId = idIdx !== -1 ? (process.argv[idIdx + 1] ?? null) : null;
const shouldPush = process.argv.includes('--push') || process.env.HARNESS_PUSH === '1';

const tasks: Task[] = readFileSync(file, 'utf8')
  .replace(/^\ufeff/, '')
  .split(/\r?\n/)
  .filter((l) => l.trim() !== '')
  .map((l) => JSON.parse(l) as Task)
  .filter((t) => onlyId === null || t.id === onlyId);

if (tasks.length === 0) {
  throw new Error(`У ${file} немає задач${onlyId ? ` з id ${onlyId}` : ''}`);
}

const git = (args: string[], cwd = '.') => execFileSync('git', args, { cwd, encoding: 'utf8' });

for (const task of tasks) {
  const branch = `harness/${task.id}`;
  const tree = join('..', 'harness-runs', task.id);

  // Якщо дерево або гілка лишилися з попереднього перезапуску за --id, прибираємо перед стартом
  try {
    git(['worktree', 'remove', tree, '--force']);
  } catch {
    if (existsSync(tree)) rmSync(tree, { recursive: true, force: true });
  }
  try {
    git(['branch', '-D', branch]);
  } catch {
    // гілки ще не було
  }

  git(['worktree', 'add', '-b', branch, tree, 'main']);
  try {
    const rec = runTaskTraced(task, {
      runner: geminiRunner,
      agentPath: 'gemini-cli',
      worktree: tree,
      outDir: 'runs',
    });

    // Відібраний артефакт — у docs/lab3/runs/; сира runs/ лишається в .gitignore
    const keep = join('docs', 'lab3', 'runs', `${task.id}-${new Date(rec.started_at).getTime()}`);
    mkdirSync(keep, { recursive: true });
    cpSync(rec.artifact_dir, keep, { recursive: true });

    if (shouldPush) {
      try {
        git(['commit', '-am', `harness: ${task.id}`], tree);
        git(['push', '-u', 'origin', branch], tree);
      } catch {
        // якщо змін немає або push вимкнено
      }
    }
    console.log(`${task.id}: ${rec.exit_status}, acceptance ${rec.acceptance_passed ? 'pass' : 'fail'} → ${keep}`);
  } finally {
    git(['worktree', 'remove', tree, '--force']);
    if (!shouldPush) {
      try {
        git(['branch', '-D', branch]);
      } catch {
        // ігноруємо
      }
    }
  }
}
