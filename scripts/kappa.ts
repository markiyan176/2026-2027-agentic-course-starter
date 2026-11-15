/**
 * Розрахунок сирої згоди (raw agreement), очікуваної випадкової згоди (pe)
 * та каппи Коена (Cohen's kappa) між власною розміткою і вердиктами судді (кроки 02, 05).
 */
export type Label = 'pass' | 'fail' | 'unknown';
const LABELS: readonly Label[] = ['pass', 'fail', 'unknown'];

/** mine[i] — мій ручний вердикт, judge[i] — вердикт верифікатора. */
export function agreement(mine: readonly Label[], judge: readonly Label[]) {
  const n = mine.length;
  if (n === 0 || n !== judge.length) throw new Error('різна довжина розмітки');

  // сира згода: просто частка збігів
  const po = mine.filter((m, i) => m === judge[i]).length / n;

  // очікувана випадкова згода: сума добутків маргінальних часток
  const pe = LABELS.reduce((acc, l) => {
    const pm = mine.filter((x) => x === l).length / n;
    const pj = judge.filter((x) => x === l).length / n;
    return acc + pm * pj;
  }, 0);

  // каппа Коена; pe === 1 означає, що всі мітки однакові — каппа не визначена
  const kappa = pe === 1 ? NaN : (po - pe) / (1 - pe);
  return { n, raw: po, expected: pe, kappa };
}

// Підтримка прямого запуску: npx tsx scripts/kappa.ts
if (process.argv[1]?.endsWith('kappa.ts')) {
  // 12 власноруч розмічених випадків калібрування верифікатора (крок 02)
  const mine: Label[] = [
    'pass', 'pass', 'fail', 'fail', 'unknown', 'pass',
    'fail', 'unknown', 'pass', 'fail', 'pass', 'unknown',
  ];
  const judge: Label[] = [
    'pass', 'pass', 'fail', 'fail', 'unknown', 'pass',
    'fail', 'fail', 'pass', 'fail', 'pass', 'unknown',
  ];
  const res = agreement(mine, judge);
  console.log(
    `Випадків: ${res.n} · сира згода: ${res.raw.toFixed(3)} · очікувана випадкова: ${res.expected.toFixed(3)} · каппа Коена: ${res.kappa.toFixed(3)}`,
  );
}
