/**
 * Калібрування судді (крок 05). Сира згода + каппа Коена + матриця
 * невідповідностей, окремо на кожен вимір і окремо на відкладених випадках.
 * agreement() — той самий, що на кроці 02: scripts/kappa.ts.
 */
import { existsSync, readFileSync } from 'node:fs';

import { agreement, type Label } from '../kappa';

const LABELS: readonly Label[] = ['pass', 'fail', 'unknown'];

interface Case {
  readonly case_id: string;
  readonly artifact: string;
  readonly dimension: string;
  readonly mine: Label;
  readonly holdout: boolean;
}

interface Verdict {
  readonly case_id: string;
  readonly dimension: string;
  readonly verdict: Label;
  readonly model: string;
  readonly order: string;
}

const jsonl = <T>(p: string): T[] =>
  readFileSync(p, 'utf8')
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as T);

const key = (c: { case_id: string; dimension: string }) => `${c.case_id}|${c.dimension}`;

/** Матриця 3x3: рядок — мій вердикт, стовпець — вердикт судді. */
export function confusion(mine: readonly Label[], judge: readonly Label[]) {
  const m: Record<Label, Record<Label, number>> = {
    pass: { pass: 0, fail: 0, unknown: 0 },
    fail: { pass: 0, fail: 0, unknown: 0 },
    unknown: { pass: 0, fail: 0, unknown: 0 },
  };
  mine.forEach((l, i) => {
    const j = judge[i];
    if (j) m[l][j] += 1;
  });
  return m;
}

function report(label: string, subset: readonly Case[], byKey: ReadonlyMap<string, Verdict>) {
  const paired = subset.filter((c) => byKey.has(key(c)));
  if (paired.length === 0) {
    console.log(`${label}: немає жодного вердикту судді`);
    return;
  }
  const mine = paired.map((c) => c.mine);
  const judge = paired.map((c) => byKey.get(key(c))!.verdict);
  const a = agreement(mine, judge);
  const m = confusion(mine, judge);
  console.log(`\n== ${label} · випадків ${a.n}`);
  console.log(
    `сира згода ${a.raw.toFixed(3)} · очікувана випадкова ${a.expected.toFixed(3)} · каппа ${Number.isNaN(a.kappa) ? 'не визначена (усі мітки однакові)' : a.kappa.toFixed(3)}`,
  );
  console.log('матриця (рядок = мій, стовпець = суддя):');
  for (const r of LABELS) {
    console.log(`  ${r.padEnd(8)} ${LABELS.map((cc) => String(m[r][cc]).padStart(4)).join('')}`);
  }
  console.log(`  пропускає погане (мій fail -> суддя pass): ${m.fail.pass}`);
  console.log(`  марна робота  (мій pass -> суддя fail): ${m.pass.fail}`);
}

function runCli(): void {
  const cases = jsonl<Case>('docs/lab3/judge-cases.jsonl');

  if (existsSync('docs/lab3/verdicts/judge-before.jsonl')) {
    const beforeVerdicts = jsonl<Verdict>('docs/lab3/verdicts/judge-before.jsonl');
    const byKeyBefore = new Map(beforeVerdicts.map((v) => [key(v), v]));
    console.log('=== ДО ІТЕРАЦІЇ РУБРИКИ (rubric-v1.md) ===');
    for (const d of [...new Set(cases.map((c) => c.dimension))]) {
      report(`[ДО] вимір ${d} · усі`, cases.filter((c) => c.dimension === d), byKeyBefore);
    }
    report('[ДО] УСІ ВИМІРИ · робочі (14)', cases.filter((c) => !c.holdout), byKeyBefore);
    report('[ДО] УСІ ВИМІРИ · ВІДКЛАДЕНІ (6)', cases.filter((c) => c.holdout), byKeyBefore);
    report('[ДО] УСІ ВИМІРИ · усі (20)', cases, byKeyBefore);
  }

  const verdicts = jsonl<Verdict>('docs/lab3/verdicts/judge.jsonl');
  const byKey = new Map(verdicts.map((v) => [key(v), v]));

  console.log('\n=== ПІСЛЯ ІТЕРАЦІЇ РУБРИКИ (rubric-v2.md) ===');
  const dims = [...new Set(cases.map((c) => c.dimension))];
  for (const d of dims) {
    report(`вимір ${d} · усі`, cases.filter((c) => c.dimension === d), byKey);
    report(`вимір ${d} · робочі`, cases.filter((c) => c.dimension === d && !c.holdout), byKey);
    report(`вимір ${d} · ВІДКЛАДЕНІ`, cases.filter((c) => c.dimension === d && c.holdout), byKey);
  }

  report('ПІДСУМОК · робочі (14)', cases.filter((c) => !c.holdout), byKey);
  report('ПІДСУМОК · ВІДКЛАДЕНІ (6)', cases.filter((c) => c.holdout), byKey);
  report('ПІДСУМОК · усі (20)', cases, byKey);

  const orders = new Set(verdicts.map((v) => v.order).filter(Boolean));
  console.log(
    `\nпорядків подання в журналі: ${orders.size} (${[...orders].join(', ') || 'порівняння не було'})`,
  );
}

if (process.argv[1]?.endsWith('calibrate.ts')) {
  runCli();
}
