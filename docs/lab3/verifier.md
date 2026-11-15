# Верифікатор на іншій моделі як остання брама

Обрана пара «виконавець — верифікатор»: **Google Gemini CLI (`gemini-2.5-flash`, v0.57.0) → локальна модель в Ollama (`qwen3:4b`, Alibaba Qwen3)** з резервним детермінованим/мережевим запуском у задачі `verify` робочого процесу [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml).

## Місце в ланцюзі
- Детерміновані брами (крок 01): `types` (`npm run typecheck`) → `lint` (`npm run lint`) → `tests` (`npm test`) → `build` (`npm run build`) у [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml).
- Верифікатор запускається лише після них: задача `verify` у [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml) має пряму залежність `needs: [types, lint, tests, build]` та неявну умову `if: success()`, тому на жодному червоному прогоні детермінованих брам верифікатор не стартує.
- Економія: за час налагодження черги та CI виконано **8** прогонів детермінованих брам, з них **3** червоних (зокрема прогін GitHub Actions [`43743832769`](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions/runs/43743832769) на коміті [`2edb8a0`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/2edb8a0eff286eb7f911dde5f7b4cc6c9e6d6a9a) та 2 локальні прогони `t-02` / `t-07` до виправлення тестів) — отже, **3 прогонам верифікатора (24 запити до моделі-судді по 8 критеріях) я не заплатив часом і квотою**.

## Конфігурація
- Модель, що виконувала задачу: **Google / родина Gemini / `gemini-2.5-flash` (через `@google/gemini-cli` v0.57.0)**.
- Модель верифікатора: **Інша родина — Alibaba Qwen / `qwen3:4b` (локальний сервер Ollama `http://127.0.0.1:11434/v1/chat/completions`, temperature `0.1`)**.
- Шлях і його ціна: локальна модель в Ollama (`qwen3:4b`, 0 $ за токен, без зовнішніх API-ключів) перед злиттям у `main` через `npm run verify` + задача `verify` у CI зі збереженням артефакту `docs/lab3/verdicts/`.
- Умова блокування: **червоно (ненульовий код виходу `1`), якщо хоч один критерій у звіті має вердикт, відмінний від `pass`** — реалізовано у [`src/verify/schema.ts`](../../src/verify/schema.ts) (`export function isBlocked(report: VerifyReport): boolean { return report.results.some((r) => r.verdict !== 'pass'); }`). На відміну від Лабораторної 2, вердикт `unknown` у харнесі **також блокує злиття**, бо в автономному циклі немає людини, яка б вручну розбирала «невідомо».

## Рубрика — один запит на один критерій
Верифікатор у [`scripts/verify.ts`](../../scripts/verify.ts) формує окремий ізольований запит `judgeWithRetry(criterion, diffText, callModel)` на кожен критерій приймання та валідує відповідь строгою Zod-схемою `criterionVerdict` (з одним повторним запитом при помилці схеми і негайним падінням після другої невдачі).

| Критерій задачі | Що питаємо суддю (дослівно) | Що вважається evidence | Що означає unknown |
|---|---|---|---|
| `A1` | `Оціни ТІЛЬКИ один критерій приймання: A1 — "Усі модульні тести проходять без мережевих викликів" (перевірка: npm test).` | Конкретний тестовий файл у `tests/*.test.ts` та назва `describe`/`it` без `.skip`. | Порожній рядок `""`, якщо наданий diff узагалі не торкається `tests/*.test.ts`. |
| `A2` | `Оціни ТІЛЬКИ один критерій приймання: A2 — "Золотий набір у docs/lab2/golden/queries.jsonl проходить валідатор схеми і порогів подання (total: 20, unanswerable: 3, injection: 2)" (перевірка: npx tsx scripts/validate-golden.ts).` | Рядок у `scripts/validate-golden.ts` із `SUBMIT = { total: 20, unanswerable: 3, injection: 2 }` або записи `queries.jsonl`. | Порожній рядок `""`, якщо diff не містить змін у `validate-golden.ts` чи `queries.jsonl`. |
| `A3` | `Оціни ТІЛЬКИ один критерій приймання: A3 — "Схема вердикту src/verify/schema.ts є строгою (.strict()), підтримує unknown і fail-closed перевірку isBlocked" (перевірка: npm run verify).` | Посилання на `src/verify/schema.ts` з `z.enum(['pass', 'fail', 'unknown'])` та `r.verdict !== 'pass'`. | Порожній рядок `""`, якщо у diff немає `src/verify/schema.ts` або `scripts/verify.ts`. |
| `A4` | `Оціни ТІЛЬКИ один критерій приймання: A4 — "Побудова індексу чанків завершується детерміновано без дублікатів id" (перевірка: npm run index).` | Шлях `data/index.json` або код `src/rag/chunk.ts`. | Порожній рядок `""`, якщо в артефакті та робочому дереві немає доказів індексації. |
| `A5` | `Оціни ТІЛЬКИ один критерій приймання: A5 — "Гібридний пошук (BM25 + вектор + RRF) повертає цитовані чанки й перевіряє відсутність вигаданих посилань" (перевірка: vitest tests/cite.test.ts).` | Посилання на `src/rag/search.ts` або `src/rag/cite.ts` (`validateAnswer`). | Порожній рядок `""`, якщо в артефакті відсутні файли пошуку та цитування. |
| `A6` | `Оціни ТІЛЬКИ один критерій приймання: A6 — "Оцінювання якості містить довірчі інтервали Вілсона та 0 регресій на золотому наборі" (перевірка: docs/lab2/eval-report.md).` | Посилання на `docs/lab2/eval-report.md` або `src/eval/metrics.ts`. | Порожній рядок `""`, якщо звіт оцінювання відсутній у контексті перевірки. |
| `A7` | `Оціни ТІЛЬКИ один критерій приймання: A7 — "Паралельний пул субагентів має 3 стелі бюджету та прискорення ≥ 1.5x" (перевірка: npx tsx scripts/parallel-eval.ts).` | Посилання на `scripts/parallel-eval.ts` та параметри пулу. | Порожній рядок `""`, якщо diff не містить даних про `scripts/parallel-eval.ts`. |
| `A8` | `Оціни ТІЛЬКИ один критерій приймання: A8 — "MCP-сервер перевіряє CHUNK_ID за регулярним виразом та відхиляє спроби виходу за межі індексу (../../.env, doc-99#0000)" (перевірка: vitest tests/mcp.test.ts).` | Посилання на `src/mcp/tools.ts:21 (CHUNK_ID)` та `tests/mcp.test.ts`. | Порожній рядок `""`, якщо в артефакті немає змін або файлів `src/mcp/`. |

## Калібрування (≥ 10 власноруч розмічених випадків)
Для калібрування взято **12 справжніх артефактів із черги задач** (`t-01`..`t-08`). Спершу проставлено власний ручний вердикт (`mine`), після чого запущено верифікатор (`judge`). Сирі дані збережено в [`docs/lab3/verdicts/step02-calibration.json`](./verdicts/step02-calibration.json).

| № | Задача / артефакт | Критерій | Мій вердикт | Вердикт судді | Збіг |
|---|---|---|---|---|---|
| 1 | `t-01` (`scripts/validate-golden.ts` + тести, валідний поріг `total: 20`) | `A1` | `pass` | `pass` | Так |
| 2 | `t-01` (штучно занижений поріг `SUBMIT.total = 10`) | `A2` | `fail` | `fail` | Так |
| 3 | `t-02` (`tests/validate-golden.test.ts` із `it.skip`) | `A1` | `fail` | `fail` | Так |
| 4 | `t-02` (diff лише валідатора, оцінений за критерієм індексації `A4`) | `A4` | `unknown` | `unknown` | Так |
| 5 | `t-05` (`src/verify/schema.ts` зі строгим `unknown` та `r.verdict !== 'pass'`) | `A3` | `pass` | `pass` | Так |
| 6 | `t-05` (`src/verify/schema.ts` без `unknown` — лише `['pass', 'fail']`) | `A3` | `fail` | `fail` | Так |
| 7 | `t-04` (`queries.jsonl` із порожнім `must_cite: []` для `easy`) | `A2` | `fail` | `fail` | Так |
| 8 | `t-07` (diff лише документації без файлів `src/mcp/`, перший прогін) | `A8` | `unknown` | `fail` | **Ні** |
| 9 | `t-05` (`src/rag/cite.ts` із `validateAnswer` та перевіркою галюцинацій) | `A5` | `pass` | `pass` | Так |
| 10 | `t-08` (`src/mcp/tools.ts` із `CHUNK_ID = /^[a-z0-9_-]+#\d{4}$/i`) | `A8` | `pass` | `pass` | Так |
| 11 | `t-06` (diff лише документації без `scripts/parallel-eval.ts`) | `A7` | `unknown` | `unknown` | Так |
| 12 | `t-03` (`src/verify/schema.ts` — блокування `unknown` у `isBlocked`) | `A3` | `pass` | `pass` | Так |

- Випадків: **12**
- Сира згода ($p_o$): **0.917** (11 із 12 випадків)
- Очікувана випадкова згода ($p_e$): **0.354**
- Каппа Коена ($\kappa$): **0.871** (рахувалася скриптом [`scripts/kappa.ts`](../../scripts/kappa.ts), покритим модульними тестами у [`tests/harness/kappa.test.ts`](../../tests/harness/kappa.test.ts))
- Матриця невідповідностей (рядки — мій ручний вердикт `mine`, стовпці — вердикт судді `judge`):

| `mine` \ `judge` | `pass` | `fail` | `unknown` | Разом (`mine`) |
|---|---|---|---|---|
| **`pass`** | **5** | 0 | 0 | 5 |
| **`fail`** | 0 | **4** | 0 | 4 |
| **`unknown`** | 0 | **1** | **2** | 3 |
| **Разом (`judge`)** | 5 | 5 | 2 | **12** |

- Де розійшлися і в який бік: єдине розходження сталося у випадку **№8 (`cal-08`)** — коли у вхідному diff були лише файли документації без жодного рядка з `src/mcp/`, суддя `qwen3:4b` поставив категоричний `fail` («не знайдено перевірки `CHUNK_ID`») замість `unknown` («недостатньо даних в артефакті»). Тобто помилка судді зміщена в бік **хибного `fail` на нерелевантному артефакті**, а не хибного `pass`.
- Що змінено в рубриці після калібрування: власну розмітку (`mine`) залишено незмінною; у системний промпт [`scripts/verify.ts`](../../scripts/verify.ts) додано явне правило: *«Якщо у наданому diff немає даних щодо цього критерію, обовʼязково поверни `"verdict":"unknown"` та `"evidence":""`»*.

## Чесні обмеження
- 10–12 випадків — це мінімум курсу для інженерної перевірки працездатності рубрики, а не статистично достатня вибірка (Song та ін., arXiv:2603.11027).
- Порогу «каппа від стількох — добре» я не наводжу: первинного джерела з універсальними порогами для LLM-суддів немає, а числа з вендорських блогів не є доказовими.
- Каппа $\kappa = 0.871$ порахована на МОЇХ задачах черги `docs/lab3/tasks.jsonl`; на іншому наборі суддя може повести себе інакше (Norman та ін., arXiv:2606.19544: рейтинги суддів зсуваються до 14 позицій між бенчмарками, а висока test-retest надійність може співіснувати з позиційним зміщенням понад 0,10).
- Що суддя точно НЕ перевіряє:
  1. Чи справді компілюється TypeScript-код і чи проходять тести в рантаймі (це робота детермінованих брам кроку 01, які стоять *перед* ним).
  2. Приховані побічні ефекти поза межами наданого `diff` або недетерміновану поведінку мережевих та файлових викликів під навантаженням.

## Верифікатор зупинив зміну
- Прогін або коміт, що не пройшов: коміт [`63a4ea8161949e95e01ac7cf686f37c217cd5746`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/63a4ea8161949e95e01ac7cf686f37c217cd5746), у якому вхідний артефакт [`docs/lab3/verify-task-input.diff`](./verify-task-input.diff) мав занижений поріг `SUBMIT.total = 10` (порушення `A2`) та прапорець `FORCE_STRICT_DIFF_ONLY` без доказів для критеріїв `A4..A7`.
- Вердикт дослівно (збережений у [`docs/lab3/verdicts/stopped-verify.json`](./verdicts/stopped-verify.json)):
```json
{
  "model": "qwen3:4b",
  "input": "docs/lab3/verify-task-input.diff",
  "blocked": true,
  "results": [
    {
      "id": "A1",
      "verdict": "pass",
      "reason": "У зміні присутні модульні тести без мережевих викликів і без .skip.",
      "evidence": "tests/validate-golden.test.ts: describe(\"validateGolden\"), tests/mcp.test.ts"
    },
    {
      "id": "A2",
      "verdict": "fail",
      "reason": "Поріг SUBMIT.total знижено до 10, хоча критерій A2 вимагає ≥ 20 запитів.",
      "evidence": "scripts/validate-golden.ts: SUBMIT = { total: 10 }"
    },
    {
      "id": "A3",
      "verdict": "pass",
      "reason": "Схема містить pass/fail/unknown, а функція isBlocked працює за принципом fail-closed.",
      "evidence": "src/verify/schema.ts:10-28 (criterionVerdict, isBlocked)"
    },
    {
      "id": "A4",
      "verdict": "unknown",
      "reason": "У наданому diff немає змін, що прямо стосуються критерію A4.",
      "evidence": ""
    },
    {
      "id": "A5",
      "verdict": "unknown",
      "reason": "У наданому diff немає змін, що прямо стосуються критерію A5.",
      "evidence": ""
    },
    {
      "id": "A6",
      "verdict": "unknown",
      "reason": "У наданому diff немає змін, що прямо стосуються критерію A6.",
      "evidence": ""
    },
    {
      "id": "A7",
      "verdict": "unknown",
      "reason": "У наданому diff немає змін, що прямо стосуються критерію A7.",
      "evidence": ""
    },
    {
      "id": "A8",
      "verdict": "pass",
      "reason": "MCP-сервер перевіряє CHUNK_ID, allowlist індексу та містить тести відмови на ../../.env і doc-99#0000.",
      "evidence": "src/mcp/tools.ts:21 (CHUNK_ID), tests/mcp.test.ts:43 (doc-99#0000)"
    }
  ]
}
```
- Виправлення: відновлено поріг `SUBMIT = { total: 20, unanswerable: 3, injection: 2 }` та повний контекст перевірки у [`docs/lab3/verify-task-input.diff`](./verify-task-input.diff); повторний зелений прогін `npm run verify` записав [`docs/lab3/verdicts/latest-verify.json`](./verdicts/latest-verify.json) (`"blocked": false`, усі `A1..A8` мають `"verdict": "pass"`).
