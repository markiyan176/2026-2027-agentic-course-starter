# Журнал автономності — Лабораторна робота №2

- **Курс**: Agentic Engineering & Building AI Agent Systems (IT STEP University, 2026/2027)
- **Студент**: Маркіян (@markiyan176)
- **Репозиторій**: [2026-2027-agentic-course-starter](https://github.com/markiyan176/2026-2027-agentic-course-starter)
- **Базовий коміт подання Лаб. 1 (`<LAB1_SHA>`)**: `d4327f9`

---

## Сесія 1 — Крок 00: Специфікація асистента та підготовка корпусу документів

- **Дата та час**: 2026-11-01, 23:50–23:56
- **Мета сесії**: Сформувати відкритий корпус із 12 українських технічних документів (`corpus/doc-01.md`..`corpus/doc-12.md`), скласти специфікацію `docs/lab2/spec.md` із вимірюваними цілями `G1..G5`, non-goals та перевірними критеріями приймання `A1..A8`, і закомітити специфікацію **до** першого коміту програмної реалізації Лабораторної роботи №2.
- **Використані інструменти та режим**:
  - Ручне проєктування структури цілей, порогів якості та інвентарю корпусу в `docs/lab2/spec.md`.
  - Перевірка обсягу корпусу (12 файлів, 31 964 символи, UTF-8 без BOM) та відсутності персональних даних чи секретів.
- **Ключові рішення людини**:
  1. Визначено точні числові пороги цілей v1: `G1 ≥ 80%` правильних відповідей на золотому наборі з 20 запитів, `G2 ≥ 85%` валідних цитат без галюцинацій, `G3 = 3/3` правильних відмов на `unanswerable` та `2/2` нейтралізованих `injection`, `G4 ≤ 8,0 с` медіанна затримка, `G5 ≤ $0.05` на 100 запитів ($0.00 на локальному контурі).
  2. Закладено в документи корпусу специфічні для нашого проєкту технічні ідентифікатори (`SA-STOP-09`, `E-418`, `E-503-RAG`, `SEC-REFUSAL-403`, `ZOD-ERR-422`), щоб чесно відокремити роботу пошукового шару від загальних тренувальних знань моделі на кроках 01 і 06.
  3. Перевірено відсутність записів `lab2/spec.md` у `.agent-log/*.jsonl` та порядок комітів відносно `d4327f9`.

| Поле | Значення |
|---|---|
| Інструмент і модель | Ручне редагування (`spec.md` написано людиною без генерації агентом); перевірка корпусу — Antigravity IDE (`2026.10`) |
| Режим дозволів | Ручний режим (агент не викликався для редагування `docs/lab2/spec.md`) |
| Рівень довіри (L0–L5) | `L1` (людина формулює специфікацію, цілі `G1..G5` та критерії приймання `A1..A8`) |
| Задача | Крок 00 (`spec.md`, корпус `corpus/doc-01.md`..`doc-12.md`) |
| Що агент запропонував | Структурувати інвентар 12 документів корпусу з точним підрахунком символів (`31 964` символи) |
| Що агент виконав | Перевірив кодування UTF-8 без BOM і відсутність `lab2/spec.md` у `.agent-log/*.jsonl` |
| Де і чому ви втрутилися | Повністю вручну сформульовано цілі `G1..G5`, критерії `A1..A8` та закладено унікальні проєктні коди (`SA-STOP-09`, `E-418`, `SEC-REFUSAL-403`) |
| Які докази прийняли | Коміт `bb1843b`, порожній вивід `Select-String -Path .agent-log\*.jsonl -Pattern 'lab2/spec\.md'` |
| Посилання | [`bb1843b`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/bb1843b), [`docs/lab2/spec.md`](./spec.md) |

---

## Сесія 2 — Кроки 01–03: Еталонний набір, базова лінія, субагенти та міжмодельний верифікатор

| Поле | Значення |
|---|---|
| Інструмент і модель | Antigravity IDE (`2026.10`, `claude-sonnet-4-5`) + `opencode v0.2.15` (`ollama:qwen3:8b`) + верифікатор `ollama:qwen3:4b` |
| Режим дозволів | `acceptEdits` для основного агента; `plan` / `read-only` (`tools: Read, Grep, Glob`, `edit: deny, bash: deny`) для субагентів `spec-auditor` та `explorer` |
| Рівень довіри (L0–L5) | `L2` — керована делегація з ручною розміткою вердиктів базової лінії та калібруванням верифікатора на 10 кейсах |
| Задача | Закриття критеріїв `A1`, `A2`, `A3` зі `spec.md` (заморозка `queries.jsonl`, `baseline.md`, `subagents.md`, `verifier.md`) |
| Що агент запропонував | Створити 20 запитів (`10 easy`, `5 hard`, `3 unanswerable`, `2 injection`), скрипт `scripts/validate-golden.ts`, конфігурації `.claude/agents/` та `.opencode/agents/`, схему `src/verify/schema.ts` і скрипт `scripts/verify.ts` |
| Що агент виконав | Реалізував `validate-golden.ts` і 7 тестів, заморозив `queries.jsonl` окремим комітом `b5d95df`, зняв базову лінію (`5,9%` / `1/17`), делегував ревізію субагенту `spec-auditor` і зафіксував зупинений коміт верифікатора `9796c61` (`SUBMIT.total = 10` → `exit 1`) та його виправлення `eb8d884` (`SUBMIT.total = 20` → `exit 0`) |
| Де і чому ви втрутилися | 1. На калібруванні верифікатора виявлено хибне спрацювання (кейс №8): при перевірці diff без файлів `src/mcp/` модель ставила `fail` замість `unknown`. Втрутився й додав у промпт `judgeWithRetry` явну вимогу повертати `"verdict":"unknown"` за відсутності релевантних змін у diff. 2. Вручну перевірив і виставив усі 20 вердиктів у `baseline.md` |
| Які докази прийняли | Коміт заморозки `b5d95df`, ревізія `spec-auditor` у `docs/lab2/subagents.md`, зупинений коміт `9796c61` і виправлений `eb8d884`, 13/13 зелених тестів (`validate-golden.test.ts`, `verify.test.ts`) |
| Посилання | [`b5d95df`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b5d95df), [`aaaf547`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/aaaf547), [`34d8a60`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/34d8a60), [`9796c61`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/9796c61), [`eb8d884`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/eb8d884) |

---

## Сесія 3 — Кроки 04–05: Чанкінг, індексація та гібридний пошук (BM25 + RRF + цитування)

| Поле | Значення |
|---|---|
| Інструмент і модель | Antigravity IDE (`2026.10`, `claude-sonnet-4-5`) + локальний ембедер `ollama:nomic-embed-text` (`768` вимірів) |
| Режим дозволів | `acceptEdits` із ручним підтвердженням команд побудови індексу (`npm run index`) |
| Рівень довіри (L0–L5) | `L3` — автономна реалізація чистих модулів `src/rag/*.ts` під захистом інваріантних тестів `tests/chunk.test.ts`, `tests/index.test.ts`, `tests/retrieval.test.ts` |
| Задача | Закриття критеріїв `A4` та `A5` зі `spec.md` (`src/rag/chunk.ts`, `embed.ts`, `store.ts`, `bm25.ts`, `rrf.ts`, `search.ts`, `cite.ts`, `data/index.json`, `indexing.md`, `retrieval.md`) |
| Що агент запропонував | Розбити 12 документів за заголовками `#`/`##`/`###` і абзацами з `RULE = { maxChars: 1200, minChars: 200, overlapChars: 120 }`, побудувати `data/index.json` та поєднати векторний пошук із кириличним BM25 (`k1 = 1.2, b = 0.75`) через RRF (`RRF_K = 60`) |
| Що агент виконав | Створив модулі `src/rag/`, згенерував `data/index.json` (12 документів, 37 фрагментів, медіана 875 симв., min 385, max 1090), написав 18 модульних тестів (`chunk`, `index`, `retrieval`) і прогнав `scripts/search.ts --explain` на `q-12`, `q-11`, `q-19` |
| Де і чому ви втрутилися | При першій перевірці розбиття виявив, що заголовки першого рівня `# doc-NN: ...` утворюють мікро-фрагменти по ~73 символи без тексту розділу (описано як помилка класу `indexing` у `eval-report.md`). Доручив додати в `src/rag/chunk.ts` правило приклеювання короткого попереднього фрагмента (`prev.length < minChars`) до наступного підрозділу (`shortPrev && fits`) |
| Які докази прийняли | Коміти `63270c0` та `5f8fa9a`, `data/index.json` (37 чанків, 0 чанків поза діапазоном 200..1200), дослівні таблиці `--explain` у `docs/lab2/retrieval.md` |
| Посилання | [`63270c0`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/63270c0), [`5f8fa9a`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/5f8fa9a), [`docs/lab2/indexing.md`](./indexing.md), [`docs/lab2/retrieval.md`](./retrieval.md) |

---

## Сесія 4 — Кроки 06–07: Оцінювання на еталонному наборі, розбір помилок та паралельний пул із бюджетом

| Поле | Значення |
|---|---|
| Інструмент і модель | Antigravity IDE (`2026.10`, `claude-sonnet-4-5`) + `ollama:qwen3:8b` (`eval-run.ts`) + `ollama:qwen3:4b` (`parallel-eval.ts`) |
| Режим дозволів | `acceptEdits` для коду; ручна верифікація вердиктів у `docs/lab2/eval-run.json` |
| Рівень довіри (L0–L5) | `L3` для написання метрик і пулу; `L1` (виключно людина) для виставлення 20 вердиктів у `eval-run.json` |
| Задача | Закриття критеріїв `A6` та `A7` зі `spec.md` (`src/metrics.ts`, `scripts/eval-run.ts`, `docs/lab2/eval-report.md`, `scripts/parallel-eval.ts`, `docs/lab2/budget.md`) |
| Що агент запропонував | Зробити `scripts/eval-run.ts` точною копією `scripts/baseline.ts` (де єдина відмінність — додавання `<context>`), обчислити `recall@5`, `MRR@5`, `proportionCI95` і таблицю переходів `transitions`, а для кроку 07 реалізувати пул обмеженої ширини `runPool` із бюджетом `BUDGET` та ранньою зупинкою |
| Що агент виконав | Реалізував `src/metrics.ts` (13 тестів), прогнав `eval-run.ts` (точність зросла з `5,9%` до `88,2% ± 15,3 п. п.`, `recall@5 = 0,97`, `MRR@5 = 1,00`), розібрав 4 помилки за всіма 4 класами (`retrieval`, `query`, `generation`, `indexing`), реалізував `scripts/parallel-eval.ts` (3 тести) і порівняв ширину 1 (`4490 мс`) та ширину 4 (`1225 мс`, прискорення `3,67×`) |
| Де і чому ви втрутилися | Особисто перевірив кожну з 20 відповідей у `docs/lab2/eval-run.json` перед запуском `--summary`: зафіксував `partial` на `q-13` (де `doc-06` не потрапив у топ-5 через 3 чанки `doc-10`) та `partial` на `q-15` (де модель процитувала лише `doc-06#0001`, хоча `doc-04#0001` був на 4-му місці видачі), не підганяючи головне число під 100% |
| Які докази прийняли | Коміти `a3fc0bd` та `b89b309`, файли `docs/lab2/eval-run.json`, `docs/lab2/parallel-run.json`, скріншоти трас `eval-run.png`, `parallel-before.png`, `parallel-after.png` |
| Посилання | [`a3fc0bd`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/a3fc0bd), [`b89b309`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b89b309), [`docs/lab2/eval-report.md`](./eval-report.md), [`docs/lab2/budget.md`](./budget.md) |

---

## Сесія 5 — Кроки 08–10: Специфікація та реалізація MCP-сервера, двобічне підключення і пакет доказів

| Поле | Значення |
|---|---|
| Інструмент і модель | Antigravity IDE (`2026.10`, `claude-sonnet-4-5`) + `opencode v0.2.15` + `@modelcontextprotocol/server v2.4.0` / `@modelcontextprotocol/client v2.4.0` / `@modelcontextprotocol/inspector v2.13.0` |
| Режим дозволів | `acceptEdits` із контролем порядку комітів (`mcp-spec.md` перед `src/mcp/`) та перевіркою `npm run verify` |
| Рівень довіри (L0–L5) | `L3` — розробка за контрактом `docs/lab2/mcp-spec.md` із перевіркою безпеки через модульні тести, Inspector CLI та реальні виклики з двох клієнтів |
| Задача | Закриття критерію `A8` зі `spec.md` та фінальне зведення пакета доказів кроку 10 (`docs/lab2/mcp-spec.md`, `src/mcp/tools.ts`, `src/mcp/server.ts`, `tests/mcp.test.ts`, `opencode.json`, `.mcp.json`, `scripts/mcp-demo.ts`, `docs/lab2/mcp-integration.md`, `docs/lab2/README.md`) |
| Що агент запропонував | Спершу закомітити `docs/lab2/mcp-spec.md` окремим комітом (`985aa32`), далі реалізувати чисті обробники в `src/mcp/tools.ts` та `stdio`-сервер у `src/mcp/server.ts` на SDK v2 (`registerTool`, `serveStdio`), перевірити через Inspector CLI й підключити з боку `opencode` та `scripts/mcp-demo.ts` |
| Що агент виконав | Закомітив `mcp-spec.md` (`985aa32`) до появи `src/mcp/` (`0477834`), реалізував `search_corpus` і `fetch_chunk` із дворівневим захистом (`CHUNK_ID` + allowlist індексу) і таймаутом `10 000 мс`, прогнав 3 тести в `tests/mcp.test.ts` та smoke-тести Inspector, підключив обидва боки і згенерував трасу `docs/lab2/traces/mcp-calls.jsonl` (`ba79ca2`) |
| Де і чому ви втрутилися | 1. Під час першого запуску `scripts/mcp-demo.ts` на Windows виникла помилка `spawn npx ENOENT` через виклик `npx` без `.cmd` у `StdioClientTransport` — виправлено на `process.platform === 'win32' ? 'npx.cmd' : 'npx'`. 2. Під час запуску через Inspector CLI помітив, що змінна `$env:MCP_CLIENT_LABEL` із PowerShell не доходить до сервера (`source: "unknown"`), бо `getDefaultEnvironment()` фільтрує змінні оточення — передав прапорець `-e MCP_CLIENT_LABEL=opencode` та прописав `"environment"` у `opencode.json`. 3. Зафіксував розбіжність документації Inspector щодо застарілого `--method initialize` (прибраного в ревізії MCP `2026-07-28`) і використав `--protocol-era modern --method tools/list` |
| Які докази прийняли | Коміти `985aa32` (`mcp-spec.md`), `0477834` (`src/mcp/`), `ba79ca2` (інтеграція та `traces/mcp-calls.jsonl`), вивід `npm test` (43/43 тестів зелені), `npm run verify` (`exit 0`), `npm run typecheck`, `npm run lint`, `npm run build` |
| Посилання | [`985aa32`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/985aa32), [`0477834`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/0477834), [`ba79ca2`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ba79ca2), [`docs/lab2/mcp-spec.md`](./mcp-spec.md), [`docs/lab2/mcp-integration.md`](./mcp-integration.md) |

---

## Інциденти та розбіжності зовнішньої документації («Факти, що змінюються»)

| Дата | Що сталося | Що зроблено (коли відкликано ключ / як виправлено) | Рядок журналу / коміт |
|---|---|---|---|
| 2026-11-01 | Витоку секретів або ключів API за час виконання Лабораторної 2 **не відбувалося** (`0` інцидентів безпеки; усі конфігурації `.mcp.json`, `opencode.json`, `.env.example` містять лише шаблони або посилання `${VAR}`) | Додатково перевірено весь diff через `assertNoSecretsInDiff` у `scripts/verify.ts` та `Select-String` по репозиторію | [`0477834`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/0477834) |
| 2026-11-01 | Офіційна документація MCP Inspector досі наводить у прикладах прапорець `--method initialize`, хоча ревізія протоколу MCP `2026-07-28` (`@modelcontextprotocol/server v2.4.0`) зробила протокол без стану й прибрала рукостискання `initialize` (версія передається в `_meta`) | Замість застарілого `--method initialize` використано `--protocol-era modern --method tools/list --format json`; розбіжність задокументовано в `mcp-integration.md` та в цьому журналі | [`0477834`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/0477834), [`ba79ca2`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ba79ca2) |
