# Верифікатор на іншій моделі

## Конфігурація
- **Модель, що писала код**: сімейство Google Gemini / Claude (`Antigravity Coding Agent`, основна сесія розробки)
- **Модель верифікатора**: `qwen3:4b` через локальний сервер Ollama (`VERIFIER_MODEL=qwen3:4b`, `VERIFIER_URL=http://127.0.0.1:11434/v1/chat/completions`, прописано в [`.env.example`](../../.env.example); резервний хмарний варіант з іншої родини — `claude-haiku-4-5-20251001`)
- **Чому саме ця**: належить до іншої родини моделей та іншого провайдера (локальна модель Alibaba Qwen3 замість хмарної моделі кодування), що усуває ефект самовподобання (`Self-Preference Bias`, Wataoka et al., arXiv:2410.21819), працює за температури `0.1` і коштує `$0.00`.
- **Де брама**:
  - Скрипт `npm run verify` у [`package.json`](../../package.json) (`tsx scripts/verify.ts docs/lab2/verify-input.diff`)
  - Обов'язковий крок `Брама верифікатора (Лаб. 2)` у GitHub Actions CI — [`.github/workflows/ci.yml` (рядки 35–36)](../../.github/workflows/ci.yml#L35-L36)
  - Сувора схема Zod: [`src/verify/schema.ts`](../../src/verify/schema.ts) (`criterionVerdict`, `verifyReport`, `isBlocked`)

## Рубрика
Кожен критерій приймання з `docs/lab2/spec.md` оцінюється **окремим запитом** («один вимір на суддю») за структурованою схемою `{"id","verdict":"pass"|"fail"|"unknown","reason","evidence"}`:

| Критерій зі `spec.md` | Що питаємо суддю (дослівно) | Що вважається `evidence` |
|---|---|---|
| `A1` | Оціни ТІЛЬКИ критерій `A1`: чи присутні в зміні модульні тести без мережевих викликів і без `.skip`? Якщо diff не зачіпає `tests/`, поверни `unknown`. | Шлях до тестового файлу і назва блоку `describe(...)` або рядок із `.skip` |
| `A2` | Оціни ТІЛЬКИ критерій `A2`: чи містить `queries.jsonl` ≥ 20 запитів (≥ 3 `unanswerable`, ≥ 2 `injection`) і чи не занижено поріг `SUBMIT` у `validate-golden.ts`? | Рядок `SUBMIT = { total: 20, unanswerable: 3, injection: 2 }` у `scripts/validate-golden.ts:29` |
| `A3` | Оціни ТІЛЬКИ критерій `A3`: чи містить `src/verify/schema.ts` три стани `pass \| fail \| unknown` і чи блокує `isBlocked(report)` звіт за наявності хоча б одного `fail`? | Рядки `src/verify/schema.ts:10-25` (`z.enum(['pass', 'fail', 'unknown'])`, `isBlocked`) |
| `A4` | Оціни ТІЛЬКИ критерій `A4`: чи перевіряється у зміні інваріант чанкінгу `normalize(raw).slice(start, end) === text` та цілісність `SHA-256` індексу? | Рядки у `src/rag/chunk.ts`, `src/rag/store.ts` або `tests/chunk.test.ts` |
| `A5` | Оціни ТІЛЬКИ критерій `A5`: чи реалізовано гібридний пошук (BM25 + RRF з `k = 60`) і чи відхиляє `validateAnswer` вигадані цитати? | Рядки у `src/rag/rrf.ts`, `src/rag/cite.ts` та `tests/retrieval.test.ts` |
| `A6` | Оціни ТІЛЬКИ критерій `A6`: чи зафіксовано у звіті `eval-report.md` точність ≥ 80% поруч із базовою лінією та 3/3 відмови на `unanswerable`? | Таблиця порівняння у `docs/lab2/eval-report.md` |
| `A7` | Оціни ТІЛЬКИ критерій `A7`: чи реалізує `scripts/parallel-eval.ts` обмеження бюджету (`maxBranches`, `maxTokens`, `maxWallMs`) і ранню зупинку при ≥ 3 помилках? | Константа `BUDGET` та умова `early-stop` у `scripts/parallel-eval.ts` |
| `A8` | Оціни ТІЛЬКИ критерій `A8`: чи перевіряє MCP-сервер ідентифікатор чанка регулярним виразом `CHUNK_ID` і чи повертає відмову на `../../.env` та `doc-99#0000`? | Рядки у `src/mcp/tools.ts` та тести в `tests/mcp.test.ts` |

## Калібрування (≥ 10 випадків)
Перед фіксацією промпту судді проведено калібрування на **10 контрольних кейсах** (справжні та тестові diff-фрагменти, розмічені спочатку вручну людиною):

| № | Зміна (вхідний diff / відповідь) | Мій ручний вердикт | Вердикт верифікатора | Збіг | Коментар |
|---|---|---|---|---|---|
| 1 | Валідний diff кроку 01 (`SUBMIT = { total: 20, unanswerable: 3, injection: 2 }`) по критерію `A2` | `pass` | `pass` | Так | Правильно витягнуто доказ `scripts/validate-golden.ts:29` |
| 2 | Diff із заниженим порогом `SUBMIT = { total: 10, unanswerable: 2, injection: 1 }` по критерію `A2` | `fail` | `fail` | Так | Суддя зловив спробу залишити навчальний поріг `10` замість `20` |
| 3 | Diff із пропущеним тестом `it.skip('вимагає порогів подання')` у `tests/validate-golden.test.ts` по `A1` | `fail` | `fail` | Так | Виявлено вимкнений модульний тест у diff |
| 4 | Diff кроку 01 (лише `validate-golden.ts`), оцінений за критерієм `A4` (індексація чанків) | `unknown` | `unknown` | Так | Спрацював аварійний вихід `unknown`, бо в diff немає файлів `src/rag/` |
| 5 | Diff схеми `src/verify/schema.ts` з `z.enum(['pass', 'fail', 'unknown'])` та `isBlocked` по `A3` | `pass` | `pass` | Так | Суддя підтвердив наявність стану `unknown` та fail-closed перевірки |
| 6 | Diff схеми верифікатора без значення `'unknown'` (`z.enum(['pass', 'fail'])`) по `A3` | `fail` | `fail` | Так | Суддя відхилив схему через відсутність аварійного виходу `unknown` |
| 7 | Diff із запитом `easy` у `queries.jsonl`, де залишено порожній `must_cite: []` по `A2` | `fail` | `fail` | Так | Виявлено порушення правила цитування для `easy`-запиту |
| 8 | Diff лише документації `docs/lab2/subagents.md`, оцінений за критерієм `A8` (MCP-сервер) | `unknown` | `fail` (до правки промпту) → `unknown` | Ні (1 розходження) | На першому прогоні суддя поставив `fail` через відсутність `src/mcp/` у diff замість `unknown` |
| 9 | Diff `src/rag/cite.ts` із перевіркою `hallucinated.length === 0 && cited.length > 0` по `A5` | `pass` | `pass` | Так | Точне посилання на функцію `validateAnswer` |
| 10 | Diff `src/mcp/tools.ts` із блокуванням `../../.env` через `CHUNK_ID = /^[a-z0-9_-]+#\d{4}$/i` по `A8` | `pass` | `pass` | Так | Суддя підтвердив захист від Path Traversal |

- **Випадків**: 10; **збіг на першому прогоні**: 9 із 10 (90%), після уточнення рубрики — 10 із 10 (100%); **unknown**: 2 (`№4`, `№8`).
- **Де розійшлися і в який бік**: у випадку `№8` верифікатор спочатку виявився надто суворим (хибна тривога `False Positive`): бачачи diff лише файлу `subagents.md`, він поставив `fail` за критерієм `A8`, бо не побачив у цьому diff коду MCP-сервера.
- **Що змінено після калібрування (формулювання критерію / промпт судді)**: у системну інструкцію `judgeWithRetry` у [`scripts/verify.ts`](../../scripts/verify.ts) додано явне правило: *«Якщо у наданому diff немає даних щодо цього критерію, обовʼязково поверни `"verdict":"unknown"` та `"evidence":""`»*. Після цього випадок `№8` стабільно повертає `unknown`.

## Верифікатор зупинив зміну
- **Коміт, який зупинив верифікатор**: [`9796c61`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/9796c61) (`feat(lab2): схема верифікатора, скрипт verify.ts та зупинений diff (крок 03)`)
- **Що знайшов (вердикт дослівно)**:
  ```text
  | A2 | **fail** | Поріг SUBMIT.total знижено до 10, хоча критерій A2 вимагає ≥ 20 запитів. | scripts/validate-golden.ts: SUBMIT = { total: 10 } |
  БРАМА ВЕРИФІКАТОРА: ЗАБЛОКОВАНО (знайдено вердикт fail).
  EXIT_CODE=1
  ```
- **Виправлення та повторний зелений прогін**: у наступному коміті відновлено поріг `SUBMIT: Thresholds = { total: 20, unanswerable: 3, injection: 2 }` у [`docs/lab2/verify-input.diff`](./verify-input.diff), після чого `npm run verify` повернув:
  ```text
  | A1 | **pass** | У зміні присутні модульні тести без мережевих викликів і без .skip. | tests/validate-golden.test.ts: describe("validateGolden") |
  | A2 | **pass** | Валідатор перевіряє поріг SUBMIT (total: 20, unanswerable: 3, injection: 2) та схему JSONL. | scripts/validate-golden.ts:29 (SUBMIT = { total: 20, unanswerable: 3, injection: 2 }) |
  | A3 | **pass** | Схема містить pass/fail/unknown, а функція isBlocked блокує при наявності fail. | src/verify/schema.ts:10-25 (criterionVerdict, isBlocked) |
  БРАМА ВЕРИФІКАТОРА: ПРОЙДЕНО (жодного fail).
  ```
