import { describe, expect, it } from 'vitest';

import {
  acceptanceGreen,
  grade,
  noChanges,
  testsUntouched,
  touchesOnlyListed,
  type GraderCtx,
} from '../../scripts/evals/graders';
import type { Task } from '../../scripts/harness/run-task';

const sampleTask: Task = {
  id: 't-01',
  input: 'Перевір поріг SUBMIT',
  acceptance: ['npm run typecheck'],
  budget: { max_turns: 8, max_usd: 0.15, timeout_s: 180 },
  files: ['scripts/validate-golden.ts'],
  label: { acceptance: true, touches_only_listed: true, tests_untouched: true },
  source: 'docs/lab3/runs/t-01-1794764400000',
  bucket: 'regression',
  frozen_at: '2026-11-15',
};

describe('Детерміновані оцінювачі evals (Step 04)', () => {
  it('acceptanceGreen проходить, коли всі команди повернули 0, і падає при ненульовому коді', () => {
    const okCtx: GraderCtx = {
      task: sampleTask,
      patch: '',
      output: '',
      acceptance: [{ cmd: 'npm run typecheck', exit: 0 }],
    };
    expect(acceptanceGreen(okCtx).pass).toBe(true);

    const failCtx: GraderCtx = {
      ...okCtx,
      acceptance: [
        { cmd: 'npm run typecheck', exit: 0 },
        { cmd: 'npm test', exit: 1 },
      ],
    };
    const res = acceptanceGreen(failCtx);
    expect(res.pass).toBe(false);
    expect(res.detail).toContain('npm test');
  });

  it('touchesOnlyListed ловить зміни поза переліком files задачі', () => {
    const cleanPatch = '--- a/scripts/validate-golden.ts\n+++ b/scripts/validate-golden.ts\n@@ -1 +1 @@\n';
    expect(
      touchesOnlyListed({ task: sampleTask, patch: cleanPatch, output: '', acceptance: [] }).pass,
    ).toBe(true);

    const dirtyPatch = `${cleanPatch}--- a/src/rag/search.ts\n+++ b/src/rag/search.ts\n`;
    const dirty = touchesOnlyListed({ task: sampleTask, patch: dirtyPatch, output: '', acceptance: [] });
    expect(dirty.pass).toBe(false);
    expect(dirty.detail).toContain('src/rag/search.ts');
  });

  it('testsUntouched блокує будь-яку модифікацію файлів у tests/', () => {
    const cleanPatch = '+++ b/scripts/validate-golden.ts\n';
    expect(testsUntouched({ task: sampleTask, patch: cleanPatch, output: '', acceptance: [] }).pass).toBe(
      true,
    );

    const hackedTestPatch = '+++ b/tests/validate-golden.test.ts\n';
    const hacked = testsUntouched({
      task: sampleTask,
      patch: hackedTestPatch,
      output: '',
      acceptance: [],
    });
    expect(hacked.pass).toBe(false);
    expect(hacked.detail).toContain('tests/validate-golden.test.ts');
  });

  it('noChanges вимагає порожнього diff для нерелевантного входу, а grade фільтрує за ключами label', () => {
    const edgeTask: Task = {
      ...sampleTask,
      id: 't-19',
      files: [],
      label: { acceptance: true, no_changes: true },
      bucket: 'edge',
    };
    const results = grade({
      task: edgeTask,
      patch: '',
      output: 'Нерелевантний запит, змін не внесено.',
      acceptance: [{ cmd: 'npm run typecheck', exit: 0 }],
    });
    expect(results.map((r) => r.id)).toEqual(['acceptance', 'no_changes']);
    expect(results.every((r) => r.pass)).toBe(true);
    expect(noChanges({ task: edgeTask, patch: '+++ b/foo.ts', output: '', acceptance: [] }).pass).toBe(
      false,
    );
  });
});
