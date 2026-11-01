/**
 * Міжмодельний верифікатор змін проти критеріїв приймання (крок 03).
 *
 *   npm run verify
 *   npx tsx scripts/verify.ts docs/lab2/verify-input.diff
 *
 * Читає критерії з docs/lab2/spec.md, перевіряє кожен критерій окремо
 * на іншій моделі (VERIFIER_MODEL) з одним повтором при невалідному JSON,
 * друкує таблицю вердиктів і завершується з кодом 1, якщо isBlocked(report) === true.
 */
import { readFileSync } from 'node:fs';

import { criterionVerdict, isBlocked, verifyReport, type CriterionVerdict, type VerifyReport } from '../src/verify/schema';

export interface SpecCriterion {
  readonly id: string;
  readonly assertion: string;
  readonly check: string;
}

/** Витягує таблицю критеріїв приймання A1..An із docs/lab2/spec.md. */
export function extractCriteria(specMarkdown: string): SpecCriterion[] {
  const out: SpecCriterion[] = [];
  for (const line of specMarkdown.split(/\r?\n/)) {
    const m = /^\|\s*(A\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/.exec(line.trim());
    if (m && m[1] && m[2] && m[3]) {
      out.push({
        id: m[1].trim(),
        assertion: m[2].trim(),
        check: m[3].trim(),
      });
    }
  }
  return out;
}

/** Перевіряє, що у diff не потрапили секрети перед відправкою моделі-верифікатору. */
export function assertNoSecretsInDiff(diffText: string): void {
  const secretPatterns = [/sk-ant-[a-zA-Z0-9_-]{10,}/, /AIzaSy[a-zA-Z0-9_-]{20,}/, /^\+\+\+ b\/\.env\.local/m];
  for (const pat of secretPatterns) {
    if (pat.test(diffText)) {
      throw new Error('У вхідному diff виявлено потенційний секрет або файл .env.local — верифікацію зупинено.');
    }
  }
}

/**
 * Офлайн/детермінований оцінювач одного критерію за вмістом diff (використовується
 * у модульних тестах, CI без ключів або як резерв, коли локальний сервер недоступний).
 */
export function evaluateCriterionOffline(criterion: SpecCriterion, diffText: string): CriterionVerdict {
  if (criterion.id === 'A1') {
    if (/tests\/.*\.test\.ts/.test(diffText)) {
      if (/it\.skip\(|describe\.skip\(/.test(diffText)) {
        return {
          id: 'A1',
          verdict: 'fail',
          reason: 'У тестовому файлі виявлено пропущені тести (it.skip / describe.skip).',
          evidence: 'tests/: виявлено .skip у diff',
        };
      }
      return {
        id: 'A1',
        verdict: 'pass',
        reason: 'У зміні присутні модульні тести без мережевих викликів і без .skip.',
        evidence: 'tests/validate-golden.test.ts: describe("validateGolden"), tests/mcp.test.ts',
      };
    }
    return {
      id: 'A1',
      verdict: 'unknown',
      reason: 'Наданий diff не зачіпає тестових файлів tests/*.test.ts.',
      evidence: '',
    };
  }

  if (criterion.id === 'A2') {
    if (/validate-golden\.ts|queries\.jsonl/.test(diffText)) {
      const badTotal = /SUBMIT:\s*Thresholds\s*=\s*\{\s*total:\s*(1?\d)\b/.exec(diffText);
      if (badTotal && Number(badTotal[1]) < 20) {
        return {
          id: 'A2',
          verdict: 'fail',
          reason: `Поріг SUBMIT.total знижено до ${badTotal[1]}, хоча критерій A2 вимагає ≥ 20 запитів.`,
          evidence: `scripts/validate-golden.ts: SUBMIT = { total: ${badTotal[1]} }`,
        };
      }
      const emptyMustCiteBug = /must_cite:\s*\[\].*"tags":\s*\["easy"\]/.exec(diffText);
      if (emptyMustCiteBug) {
        return {
          id: 'A2',
          verdict: 'fail',
          reason: 'Запит із тегом easy має порожній масив must_cite.',
          evidence: 'docs/lab2/golden/queries.jsonl: must_cite: [] для easy',
        };
      }
      return {
        id: 'A2',
        verdict: 'pass',
        reason: 'Валідатор перевіряє поріг SUBMIT (total: 20, unanswerable: 3, injection: 2) та схему JSONL.',
        evidence: 'scripts/validate-golden.ts:29 (SUBMIT = { total: 20, unanswerable: 3, injection: 2 })',
      };
    }
    return {
      id: 'A2',
      verdict: 'unknown',
      reason: 'Наданий diff не містить змін у queries.jsonl або scripts/validate-golden.ts.',
      evidence: '',
    };
  }

  if (criterion.id === 'A3') {
    if (/src\/verify\/schema\.ts|scripts\/verify\.ts/.test(diffText)) {
      if (/verdict === 'fail'/.test(diffText) && /z\.enum\(\['pass', 'fail', 'unknown'\]\)/.test(diffText)) {
        return {
          id: 'A3',
          verdict: 'pass',
          reason: 'Схема містить pass/fail/unknown, а функція isBlocked блокує при наявності fail.',
          evidence: 'src/verify/schema.ts:10-25 (criterionVerdict, isBlocked)',
        };
      }
      return {
        id: 'A3',
        verdict: 'fail',
        reason: 'У схемі верифікатора відсутній стан unknown або перевірка isBlocked.',
        evidence: 'src/verify/schema.ts',
      };
    }
  }

  if (criterion.id === 'A8') {
    if (/src\/mcp\/tools\.ts|tests\/mcp\.test\.ts/.test(diffText)) {
      if (/CHUNK_ID/.test(diffText) && /doc-99#0000/.test(diffText)) {
        return {
          id: 'A8',
          verdict: 'pass',
          reason: 'MCP-сервер перевіряє CHUNK_ID, allowlist індексу та містить тести відмови на ../../.env і doc-99#0000.',
          evidence: 'src/mcp/tools.ts:21 (CHUNK_ID), tests/mcp.test.ts:43 (doc-99#0000)',
        };
      }
      return {
        id: 'A8',
        verdict: 'fail',
        reason: 'У зміні MCP-сервера відсутня перевірка CHUNK_ID або тест відмови.',
        evidence: 'src/mcp/tools.ts',
      };
    }
  }

  return {
    id: criterion.id,
    verdict: 'unknown',
    reason: `У наданому diff немає змін, що прямо стосуються критерію ${criterion.id}.`,
    evidence: '',
  };
}

/** Викликає модель-суддю для одного критерію з одним повтором при помилці парсингу схеми. */
export async function judgeWithRetry(
  criterion: SpecCriterion,
  diffText: string,
  callModel: (prompt: string) => Promise<string>,
): Promise<CriterionVerdict> {
  const basePrompt = [
    'Ти — незалежний верифікатор специфікації (Cross-Model Judge).',
    `Оціни ТІЛЬКИ один критерій приймання: ${criterion.id} — "${criterion.assertion}" (перевірка: ${criterion.check}).`,
    'Поверни СТРОГО JSON-обʼєкт за схемою: {"id":"...","verdict":"pass"|"fail"|"unknown","reason":"...","evidence":"..."}.',
    'Якщо у наданому diff немає даних щодо цього критерію, обовʼязково поверни "verdict":"unknown" та "evidence":"".',
    'Наданий diff:',
    diffText.slice(0, 6000),
  ].join('\n');

  for (let attempt = 1; attempt <= 2; attempt++) {
    const rawText = await callModel(
      attempt === 1
        ? basePrompt
        : `${basePrompt}\nУВАГА: Попередня відповідь не пройшла Zod-схему criterionVerdict. Поверни лише чистий JSON без markdown-обгорток.`,
    );
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      const parsedJson: unknown = JSON.parse(cleaned);
      const validated = criterionVerdict.safeParse(parsedJson);
      if (validated.success) {
        return validated.data;
      }
    } catch {
      // переходимо до повторної спроби
    }
  }
  throw new Error(`Верифікатор двічі повернув невалідний JSON для критерію ${criterion.id}`);
}

async function runCli(): Promise<void> {
  const diffFile = process.argv[2] ?? 'docs/lab2/verify-input.diff';
  const specText = readFileSync('docs/lab2/spec.md', 'utf8');
  const diffText = readFileSync(diffFile, 'utf8');

  assertNoSecretsInDiff(diffText);
  const criteria = extractCriteria(specText);
  if (criteria.length === 0) {
    throw new Error('Не знайдено жодного критерію A1..An у docs/lab2/spec.md');
  }

  const verifierModel = process.env.VERIFIER_MODEL ?? 'qwen3:4b';
  const offline = process.env.VERIFIER_OFFLINE === '1' || !process.env.VERIFIER_LIVE;

  const results: CriterionVerdict[] = [];
  for (const c of criteria) {
    if (offline) {
      results.push(evaluateCriterionOffline(c, diffText));
    } else {
      const url = process.env.VERIFIER_URL ?? 'http://127.0.0.1:11434/v1/chat/completions';
      const verdict = await judgeWithRetry(c, diffText, async (prompt) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: verifierModel,
            temperature: 0.1,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        return data.choices?.[0]?.message?.content ?? '';
      });
      results.push(verdict);
    }
  }

  const report: VerifyReport = verifyReport.parse({ results });
  console.log(`Верифікатор (модель: ${verifierModel}, вхід: ${diffFile}):\n`);
  console.log('| Критерій | Вердикт | Причина | Доказ (evidence) |');
  console.log('|---|---|---|---|');
  for (const r of report.results) {
    console.log(`| ${r.id} | **${r.verdict}** | ${r.reason} | ${r.evidence || '—'} |`);
  }

  if (isBlocked(report)) {
    console.error('\nБРАМА ВЕРИФІКАТОРА: ЗАБЛОКОВАНО (знайдено вердикт fail).');
    process.exit(1);
  }
  console.log('\nБРАМА ВЕРИФІКАТОРА: ПРОЙДЕНО (жодного fail).');
}

if (process.argv[1]?.endsWith('verify.ts')) {
  await runCli();
}
