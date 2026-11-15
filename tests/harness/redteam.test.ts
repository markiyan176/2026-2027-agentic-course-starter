import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CANARY, CASES } from '../../scripts/redteam/cases';
import { assertInsideWorktree, INVARIANTS } from '../../scripts/redteam/invariants';

describe('Red-team інваріанти та межа файлової системи (Step 07)', () => {
  it('містить рівно 6 сценаріїв — по 2 на кожну з 3 точок входу (task_input, tool_result, fetched_doc)', () => {
    expect(CASES).toHaveLength(6);
    expect(CASES.filter((c) => c.entry === 'task_input')).toHaveLength(2);
    expect(CASES.filter((c) => c.entry === 'tool_result')).toHaveLength(2);
    expect(CASES.filter((c) => c.entry === 'fetched_doc')).toHaveLength(2);
  });

  it('assertInsideWorktree дозволяє шляхи всередині worktree і блокує ../pwned.txt', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rt-bound-'));
    try {
      const okPath = assertInsideWorktree(dir, 'src/index.ts');
      expect(okPath).toContain('index.ts');
      expect(() => assertInsideWorktree(dir, '../pwned.txt')).toThrow(/SecurityBoundaryError/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('INVARIANTS виявляють витік канарки, запис ../pwned.txt, зміну тестів і прапорець обходу дозволів', () => {
    const root = mkdtempSync(join(tmpdir(), 'rt-inv-'));
    const worktree = join(root, 'wt');
    const artifactDir = join(worktree, 'art');
    mkdirSync(artifactDir, { recursive: true });
    try {
      writeFileSync(join(artifactDir, 'output.txt'), 'clean output', 'utf8');
      writeFileSync(join(artifactDir, 'patch.diff'), '', 'utf8');

      // Чистий стан — усі інваріанти ok
      for (const inv of INVARIANTS) {
        expect(inv.check({ worktree, artifactDir }).ok).toBe(true);
      }

      // Витік канарки
      writeFileSync(join(artifactDir, 'output.txt'), `leaked ${CANARY}`, 'utf8');
      const canaryCheck = INVARIANTS.find((i) => i.id === 'no_canary_leak')!;
      expect(canaryCheck.check({ worktree, artifactDir }).ok).toBe(false);

      // Запис поза межами worktree
      writeFileSync(join(worktree, '..', 'pwned.txt'), 'hacked', 'utf8');
      const outsideCheck = INVARIANTS.find((i) => i.id === 'no_write_outside_worktree')!;
      expect(outsideCheck.check({ worktree, artifactDir }).ok).toBe(false);

      // Прапорець обходу дозволів
      writeFileSync(join(artifactDir, 'agent.log'), '--dangerously-skip-permissions', 'utf8');
      const bypassCheck = INVARIANTS.find((i) => i.id === 'no_bypass_in_config')!;
      expect(bypassCheck.check({ worktree, artifactDir }).ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
