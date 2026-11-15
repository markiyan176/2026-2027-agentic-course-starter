import { describe, expect, it } from 'vitest';

import {
  assertNoSecretsInDiff,
  evaluateCriterionOffline,
  extractCriteria,
  judgeWithRetry,
  type SpecCriterion,
} from '../scripts/verify';
import { criterionVerdict, isBlocked, verifyReport } from '../src/verify/schema';

const sampleCriterion: SpecCriterion = {
  id: 'A2',
  assertion: 'docs/lab2/golden/queries.jsonl містить ≥ 20 запитів і проходить валідатор',
  check: 'npx tsx scripts/validate-golden.ts',
};

describe('src/verify/schema & scripts/verify', () => {
  it('пропускає звіт лише коли всі критерії мають вердикт pass', () => {
    const report = verifyReport.parse({
      results: [
        { id: 'A1', verdict: 'pass', reason: 'Усі тести проходять.', evidence: 'tests/validate-golden.test.ts:16' },
        { id: 'A2', verdict: 'pass', reason: 'Поріг 20 запитів виконано.', evidence: 'scripts/validate-golden.ts:29' },
      ],
    });
    expect(isBlocked(report)).toBe(false);
  });

  it('блокує звіт у харнесі, якщо є хоча б один fail або unknown', () => {
    const withFail = verifyReport.parse({
      results: [
        { id: 'A1', verdict: 'pass', reason: 'Тести є.', evidence: 'tests/validate-golden.test.ts:1' },
        {
          id: 'A2',
          verdict: 'fail',
          reason: 'Поріг зменшено до 10 запитів замість 20.',
          evidence: 'scripts/validate-golden.ts:29',
        },
      ],
    });
    expect(isBlocked(withFail)).toBe(true);

    const withUnknown = verifyReport.parse({
      results: [
        { id: 'A1', verdict: 'pass', reason: 'Тести є.', evidence: 'tests/validate-golden.test.ts:1' },
        { id: 'A3', verdict: 'unknown', reason: 'У diff немає змін верифікатора.', evidence: '' },
      ],
    });
    expect(isBlocked(withUnknown)).toBe(true);
  });

  it('відхиляє невідомі поля або порожній results через .strict()', () => {
    expect(criterionVerdict.safeParse({ id: 'A1', verdict: 'pass', reason: 'ok', evidence: '', extra: 1 }).success).toBe(
      false,
    );
    expect(verifyReport.safeParse({ results: [] }).success).toBe(false);
  });

  it('перепитує один раз при невалідному JSON від моделі і падає після двох невдач', async () => {
    let calls = 0;
    const recovered = await judgeWithRetry(sampleCriterion, '+SUBMIT = { total: 20 }', async () => {
      calls++;
      if (calls === 1) return 'не JSON взагалі';
      return JSON.stringify({
        id: 'A2',
        verdict: 'pass',
        reason: 'Поріг становить 20 запитів.',
        evidence: 'scripts/validate-golden.ts:29',
      });
    });
    expect(calls).toBe(2);
    expect(recovered.verdict).toBe('pass');

    await expect(
      judgeWithRetry(sampleCriterion, '+diff', async () => 'знову сміття'),
    ).rejects.toThrow(/двічі повернув невалідний JSON/);
  });

  it('витягує критерії з таблиці spec.md та ловить зниження порогу у diff', () => {
    const criteria = extractCriteria('| A2 | Мінімум 20 запитів | validate-golden.ts |');
    expect(criteria).toHaveLength(1);
    const badVerdict = evaluateCriterionOffline(
      sampleCriterion,
      '+++ b/scripts/validate-golden.ts\n+export const SUBMIT: Thresholds = { total: 10, unanswerable: 2, injection: 1 };',
    );
    expect(badVerdict.verdict).toBe('fail');
  });

  it('блокує diff, якщо в ньому виявлено секрет або .env.local', () => {
    expect(() => assertNoSecretsInDiff('+++ b/.env.local\n+GEMINI_API_KEY=secret')).toThrow(/потенційний секрет/);
  });
});
