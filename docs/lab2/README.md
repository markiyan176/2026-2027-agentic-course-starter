# Пакет доказів · Лабораторна 2

- **Репозиторій**: [https://github.com/markiyan176/2026-2027-agentic-course-starter](https://github.com/markiyan176/2026-2027-agentic-course-starter) (той самий, що й у Лабораторній 1; тека [`docs/lab1/`](../lab1/) збережена без змін на базовому стані `d4327f9`).
- **Живий деплой (Vercel)**: [https://2026-2027-agentic-course-starter.vercel.app/](https://2026-2027-agentic-course-starter.vercel.app/)
- **Подано**: 2026-11-01. **Останній коміт кроків 00–09 перед цим звітом**: [`ba79ca2`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ba79ca2).

---

## Висновок

На замороженому еталонному наборі [`docs/lab2/golden/queries.jsonl`](./golden/queries.jsonl) (коміт заморозки [`b5d95df`](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/b5d95df/docs/lab2/golden/queries.jsonl), `N = 20` запитів: `17` відповідних із непорожнім `must_cite` та `3` `unanswerable`) впровадження гібридного пошуку (векторний cosine similarity на `nomic-embed-text` `768 dims` + кириличний BM25 зі злиттям Reciprocal Rank Fusion `RRF_K = 60`, топ-`5` фрагментів у контексті) за незмінної моделі `qwen3:8b` і системного промпту підвищило точність відповідей із **5,9% (1 / 17)** у базовій лінії до **88,2% ± 15,3 п. п. (15 / 17, n = 17, ОБЧИСЛЕНО)** при `recall@5 = 0,97`, `MRR@5 = 1,00`, `nDCG@5 = 0,96`, **88,2% (15 / 17)** повністю точних цитат (`0` вигаданих цитат за `validateAnswer`), **3 із 3 (100%)** правильних відмовах на `unanswerable`, **2 із 2 (100%)** нейтралізованих ін'єкціях і **0 регресій**, а паралельний пул субагентів (`concurrency = 4`) прискорив оцінювання набору з **4 490 мс** до **1 225 мс** (`3,67×`).

Повні числа, таблиця переходів та розбір помилок: [`eval-report.md`](./eval-report.md).

---

## Докази (`docs/lab2/`)

| Крок | Доказ | Посилання на файл | Ключовий коміт (GitHub permalink) |
|---|---|---|---|
| **00** | Специфікація асистента (обсяг, корпус із 12 документів, цілі `G1..G5`, критерії `A1..A8`) | [`spec.md`](./spec.md) | [`bb1843b`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/bb1843b) (закомічено **до** першого рядка коду Лаб. 2) |
| **01** | Еталонний набір запитів (`20` запитів: `10 easy`, `5 hard`, `3 unanswerable`, `2 injection`) | [`eval-set.md`](./eval-set.md) · [`golden/queries.jsonl`](./golden/queries.jsonl) | [`b5d95df`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b5d95df) (SHA заморозки `queries.jsonl`, 1 коміт в історії) |
| **01** | Базова лінія без пошуку (`5,9%` / `1/17`, методика, сирий зріз `baseline-run.json`) | [`baseline.md`](./baseline.md) | [`aaaf547`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/aaaf547) |
| **02, 07** | Субагенти тільки для читання (`spec-auditor`, `explorer`), ізоляція контексту та граф залежностей | [`subagents.md`](./subagents.md) | [`34d8a60`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/34d8a60) · [`b89b309`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b89b309) |
| **03** | Міжмодельний верифікатор (`qwen3:4b`), калібрування на 10 кейсах, зупинений коміт і виправлення | [`verifier.md`](./verifier.md) · [`verify-input.diff`](./verify-input.diff) | Зупинений: [`9796c61`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/9796c61) → Виправлений: [`eb8d884`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/eb8d884) |
| **04** | Чанкінг (`max=1200, min=200, overlap=120`) та індексація (`12` документів, `37` фрагментів) | [`indexing.md`](./indexing.md) | [`63270c0`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/63270c0) |
| **05** | Гібридний пошук (BM25 + RRF `k=60`) і перевірка цитувань (`validateAnswer`) | [`retrieval.md`](./retrieval.md) | [`5f8fa9a`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/5f8fa9a) |
| **06, 10** | Оцінювання на еталонному наборі поруч із базовою лінією та розбір 4 помилок за класами | [`eval-report.md`](./eval-report.md) · [`eval-run.json`](./eval-run.json) | [`a3fc0bd`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/a3fc0bd) |
| **07** | Бюджет, паралельний пул (`width=1` vs `width=4`) та маршрутизація моделей | [`budget.md`](./budget.md) · [`parallel-run.json`](./parallel-run.json) | [`b89b309`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b89b309) |
| **08** | Специфікація MCP-сервера `lab2-corpus` (`search_corpus`, `fetch_chunk`, `LIMITS`, allowlist) | [`mcp-spec.md`](./mcp-spec.md) | [`985aa32`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/985aa32) (закомічено **до** `src/mcp/` у [`0477834`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/0477834)) |
| **09** | Підключення MCP-сервера до агента (`opencode`) і застосунку (`mcp-demo.ts`) | [`mcp-integration.md`](./mcp-integration.md) | [`ba79ca2`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ba79ca2) |
| **00–10** | Журнал автономності (5 сесій, рівні довіри `L1–L3`, втручання людини, інциденти) | [`autonomy-log.md`](./autonomy-log.md) | [`bb1843b`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/bb1843b) .. поточний коміт |
| **06, 07, 09** | Траси, скріншоти та машинний журнал викликів MCP | [`traces/`](./traces/) ([`eval-run.png`](./traces/eval-run.png), [`parallel-before.png`](./traces/parallel-before.png), [`parallel-after.png`](./traces/parallel-after.png), [`mcp-calls.jsonl`](./traces/mcp-calls.jsonl), [`mcp-agent-transcript.txt`](./traces/mcp-agent-transcript.txt)) | [`a3fc0bd`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/a3fc0bd), [`b89b309`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b89b309), [`ba79ca2`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ba79ca2) |

---

## Код та конфігурації у репозиторії

| Що | Шлях у репозиторії |
|---|---|
| Корпус документів (12 файлів Markdown, 31 964 символи) | [`corpus/doc-01.md`](../../corpus/doc-01.md) .. [`corpus/doc-12.md`](../../corpus/doc-12.md) |
| Чанкінг, ембедери (`ollama`, `gemini`, `fake`) та сховище індексу | [`src/rag/chunk.ts`](../../src/rag/chunk.ts), [`src/rag/embed.ts`](../../src/rag/embed.ts), [`src/rag/store.ts`](../../src/rag/store.ts), [`scripts/build-index.ts`](../../scripts/build-index.ts), [`data/index.json`](../../data/index.json) |
| Гібридний пошук (BM25, RRF, цитування) та CLI пошуку | [`src/rag/bm25.ts`](../../src/rag/bm25.ts), [`src/rag/rrf.ts`](../../src/rag/rrf.ts), [`src/rag/search.ts`](../../src/rag/search.ts), [`src/rag/cite.ts`](../../src/rag/cite.ts), [`scripts/search.ts`](../../scripts/search.ts) |
| Валідатор золотого набору, базова лінія, метрики та оцінювання | [`scripts/validate-golden.ts`](../../scripts/validate-golden.ts), [`scripts/baseline.ts`](../../scripts/baseline.ts), [`src/metrics.ts`](../../src/metrics.ts), [`scripts/eval-run.ts`](../../scripts/eval-run.ts) |
| Субагенти тільки для читання та паралельний пул із бюджетом | [`.claude/agents/spec-auditor.md`](../../.claude/agents/spec-auditor.md), [`.claude/agents/explorer.md`](../../.claude/agents/explorer.md), [`.opencode/agents/spec-auditor.md`](../../.opencode/agents/spec-auditor.md), [`.opencode/agents/explorer.md`](../../.opencode/agents/explorer.md), [`scripts/parallel-eval.ts`](../../scripts/parallel-eval.ts) |
| Схема та скрипт міжмодельного верифікатора | [`src/verify/schema.ts`](../../src/verify/schema.ts), [`scripts/verify.ts`](../../scripts/verify.ts), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| MCP-сервер `lab2-corpus`, конфігурації підключення та клієнт застосунку | [`src/mcp/tools.ts`](../../src/mcp/tools.ts), [`src/mcp/server.ts`](../../src/mcp/server.ts), [`opencode.json`](../../opencode.json), [`.mcp.json`](../../.mcp.json), [`scripts/mcp-demo.ts`](../../scripts/mcp-demo.ts) |
| Модульні тести Лабораторної 2 (проходять офлайн без мережі в CI) | [`tests/validate-golden.test.ts`](../../tests/validate-golden.test.ts), [`tests/verify.test.ts`](../../tests/verify.test.ts), [`tests/chunk.test.ts`](../../tests/chunk.test.ts), [`tests/index.test.ts`](../../tests/index.test.ts), [`tests/retrieval.test.ts`](../../tests/retrieval.test.ts), [`tests/metrics.test.ts`](../../tests/metrics.test.ts), [`tests/parallel-eval.test.ts`](../../tests/parallel-eval.test.ts), [`tests/mcp.test.ts`](../../tests/mcp.test.ts) |

---

## Прогони CI

- **Зелений прогін на `main` (GitHub Actions)**: [https://github.com/markiyan176/2026-2027-agentic-course-starter/actions](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions) (workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): `typecheck`, `lint`, `test`, `verify`, `build`).
- **Коміт, який зупинив верифікатор (крок 03)**: [`9796c61`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/9796c61) (`A2: fail` на `SUBMIT.total = 10`, код виходу `1`), виправлено у [`eb8d884`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/eb8d884).

---

## Інструменти й моделі

| Роль | Інструмент / модель | Версія |
|---|---|---|
| Основний агент кодування | Antigravity IDE (`claude-sonnet-4-5`) | `2026.10` |
| Другий агент кодування (MCP-клієнт та субагенти) | `opencode` + `ollama:qwen3:8b` | `v0.2.15` |
| Міжмодельний верифікатор (крок 03) | `ollama:qwen3:4b` (альтернативна родина Alibaba Qwen3, `temperature = 0.1`) | `4B Q4_K_M` |
| Генератор відповідей у базовій лінії та оцінюванні (кроки 01, 06) | `ollama:qwen3:8b` (`http://127.0.0.1:11434/v1/chat/completions`) | `8B Q4_K_M` |
| Ембедер корпусу та запитів (кроки 04, 05, 08) | `ollama:nomic-embed-text` (`768` вимірів; для CI-тестів — детермінований `fakeEmbedder` `64` виміри) | `v1.5` |
| MCP SDK та Inspector (кроки 08, 09) | `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/inspector` | `2.4.0` / `2.4.0` / `2.13.0` |
| Середовище виконання та тестовий фреймворк | Node.js / TypeScript / Vitest / Zod | `v24.20.0` / `6.0.3` / `5.0.0` / `4.5.4` |

---

## Як відтворити з нуля

Перед першим запуском переконайтеся, що залежності встановлено:
```powershell
npm install
```

1. **Перевірка еталонного набору та запуск усіх офлайн-тестів, лінтера, типізації й верифікатора (без ключів і без мережі)**:
   ```powershell
   npx tsx scripts/validate-golden.ts docs/lab2/golden/queries.jsonl
   npm test
   npm run verify
   npm run typecheck
   npm run lint
   npm run build
   ```

2. **Індексація набору документів `corpus/` (потребує запущеної `ollama serve` із моделлю `nomic-embed-text`; готовий індекс уже закомічено в `data/index.json`)**:
   ```powershell
   npm run index
   ```

3. **Гібридний пошук із діагностикою рангів кожної гілки (`vec`, `bm25`, `rrf`)**:
   ```powershell
   npx tsx scripts/search.ts "Який тариф за 1 млн вхідних і вихідних токенів встановлено для рівня standard?" --explain
   ```

4. **Підрахунок зведених метрик оцінювання (`Recall@5`, `MRR@5`, 95% ДІ та матриця переходів `transitions`)**:
   ```powershell
   npx tsx scripts/eval-run.ts --summary docs/lab2/eval-run.json
   ```

5. **Запуск MCP-сервера `lab2-corpus` та перевірка двобічного виклику (Inspector CLI і клієнт застосунку `scripts/mcp-demo.ts`)**:
   ```powershell
   npx @modelcontextprotocol/inspector --cli npx tsx src/mcp/server.ts --protocol-era modern --method tools/list --format json
   npx tsx scripts/mcp-demo.ts "код помилки E-418"
   ```
