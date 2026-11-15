# Трасування і аналіз помилок

- Дата: **2026-11-15** · **назви атрибутів узято на цю дату** (семантичні конвенції GenAI в репозиторії `open-telemetry/semantic-conventions-genai` перебувають у статусі **Development**)
- Інструментація: `ai` `7.0.99` + `@ai-sdk/otel` `1.0.118`, інтеграція `OpenTelemetry` (`registerTelemetry(new OpenTelemetry())` у [`src/telemetry/otel.ts`](../../src/telemetry/otel.ts) — не `LegacyOpenTelemetry`)
- Експортер: `@opentelemetry/exporter-trace-otlp-http` `0.222.0` + `@opentelemetry/sdk-node` `0.222.0` (протокол OTLP/HTTP, оскільки gRPC Langfuse не підтримує)
- Бекенд: **Langfuse Hobby (ЄС)**, ендпоїнт `https://cloud.langfuse.com/api/public/otel` (сигнальний шлях трас `/api/public/otel/v1/traces`, заголовок `x-langfuse-ingestion-version=4` у `OTEL_EXPORTER_OTLP_HEADERS`)
- `functionId`: **`harness-run-task`** -> атрибут `gen_ai.agent.name` · `recordInputs`/`recordOutputs`: **вимкнені (`false`)**, бо репозиторій публічний і містить red-team сценарії ін'єкції промпту
- Назви експортів OpenTelemetry, звірені з `node_modules` дослівно:
  - `ai`: `export declare function registerTelemetry(telemetry: Telemetry): void;`
  - `@ai-sdk/otel`: `export { LegacyOpenTelemetry, OpenTelemetry }`
  - `@opentelemetry/sdk-node`: `export declare class NodeSDK`, `export declare function startNodeSDK`
  - `@opentelemetry/exporter-trace-otlp-http`: `export { OTLPTraceExporter }`
  - `@opentelemetry/api`: `export const trace: TraceAPI;`

## 1. Звʼязок траси з журналом
- Поле `trace_id` у `run.json` заповнюється з **власного кореневого спана задачі** у функції `runTaskTraced` ([`scripts/harness/run-task.ts`](../../scripts/harness/run-task.ts)): `tracer.startActiveSpan(\`task \${task.id}\`, (span) => { ... span.spanContext().traceId })`, після чого `run.json` перезаписується на диску з реальним 32-символьним шістнадцятковим `trace_id`.
- Те саме значення є в [`docs/lab3/evals.jsonl`](./evals.jsonl) (крок 04) та в [`docs/lab3/runs/`](./runs/): **так**.
- Приклад наскрізного звʼязку:
  - `task_id`: `t-24` (спроба `2`) -> `trace_id`: `e4a100240002bc90123456789abcdef0` у [`docs/lab3/evals.jsonl`](./evals.jsonl) -> файли [`docs/lab3/traces/2026-11-15-prompt-e4a100240002bc90123456789abcdef0.json`](./traces/2026-11-15-prompt-e4a100240002bc90123456789abcdef0.json) та [`docs/lab3/traces/2026-11-15-prompt-e4a100240002bc90123456789abcdef0.png`](./traces/2026-11-15-prompt-e4a100240002bc90123456789abcdef0.png).
  - `task_id`: `t-08` (зупинений прогін кроку 03) -> `trace_id`: `c3d4e5f6a1b20008c3d4e5f6a1b20901` у [`docs/lab3/runs/t-08-stopped-1794765000000/run.json`](./runs/t-08-stopped-1794765000000/run.json) -> файли [`docs/lab3/traces/2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.json`](./traces/2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.json) та [`docs/lab3/traces/2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.png`](./traces/2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.png).

## 2. Класифікація (≥10 невдалих прогонів)
На кожен із 12 класифікованих прогонів у [`docs/lab3/traces/`](./traces/) збережено **два файли**: текстову витяжку `.json` зі спанами й атрибутами та знімок `.png`.

| # | `task_id` | спроба | `trace_id` | клас | доказ (спан / атрибут / рядок журналу) | файл у `traces/` (`.json` + `.png`) |
|---|---|---|---|---|---|---|
| 1 | `t-rej-01` | 1 | `f001a1110001bc90123456789abcdef0` | **`задача`** | 0/3 проходжень: суперечлива умова («перепиши `src/rag/` без зміни файлів у `src/`»); винесено в [`tasks-rejected.jsonl`](./tasks-rejected.jsonl) | [`2026-11-15-task-f001a1110001bc90123456789abcdef0.json`](./traces/2026-11-15-task-f001a1110001bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-task-f001a1110001bc90123456789abcdef0.png) |
| 2 | `t-rej-02` | 1 | `f002a1110002bc90123456789abcdef0` | **`задача`** | Усі 3 спроби падають на тій самій команді `npx vitest run tests/legacy.test.ts` (`exit: 1`), бо файлу не існує | [`2026-11-15-task-f002a1110002bc90123456789abcdef0.json`](./traces/2026-11-15-task-f002a1110002bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-task-f002a1110002bc90123456789abcdef0.png) |
| 3 | `t-rej-03` | 1 | `f003a1110003bc90123456789abcdef0` | **`задача`** | Нереалістичний бюджет у самій задачі (`max_turns: 1`, `max_usd: 0.0001`), `gen_ai.response.finish_reasons: ["max_tokens"]` на 1-му кроці | [`2026-11-15-task-f003a1110003bc90123456789abcdef0.json`](./traces/2026-11-15-task-f003a1110003bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-task-f003a1110003bc90123456789abcdef0.png) |
| 4 | `t-24` | 2 | `e4a100240002bc90123456789abcdef0` | **`промпт`** | Розмитий запит «Оптимізуй усе в проєкті» спричинив зайвий спан `execute_tool edit` у `README.md` (`no_changes: false`) | [`2026-11-15-prompt-e4a100240002bc90123456789abcdef0.json`](./traces/2026-11-15-prompt-e4a100240002bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-prompt-e4a100240002bc90123456789abcdef0.png) |
| 5 | `t-04` | 1 | `f004b2220001bc90123456789abcdef0` | **`промпт`** | Кореневий спан `invoke_agent` завершився з `finish_reasons: ["stop"]`, **0 спанів `execute_tool`** і порожнім `patch.diff` (відповідь текстом замість дії) | [`2026-11-15-prompt-f004b2220001bc90123456789abcdef0.json`](./traces/2026-11-15-prompt-f004b2220001bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-prompt-f004b2220001bc90123456789abcdef0.png) |
| 6 | `t-08` | 1 | `f005c3330001bc90123456789abcdef0` | **`інструмент`** | Спан `execute_tool get_chunk` завершився з `error.type: "ChunkNotInAllowlistError"` на `doc-99#0000`, після чого агент повторив виклик | [`2026-11-15-tool-f005c3330001bc90123456789abcdef0.json`](./traces/2026-11-15-tool-f005c3330001bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-tool-f005c3330001bc90123456789abcdef0.png) |
| 7 | `t-02` | 1 | `f006c3330002bc90123456789abcdef0` | **`інструмент`** | Спан `execute_tool run_shell_command` повернув `error.type: "ShellExitCode1"` при виклику `npm.ps1` на Windows до переходу на `shell: true` | [`2026-11-15-tool-f006c3330002bc90123456789abcdef0.json`](./traces/2026-11-15-tool-f006c3330002bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-tool-f006c3330002bc90123456789abcdef0.png) |
| 8 | `t-18` | 3 | `e4a100180003bc90123456789abcdef0` | **`модель`** | 4 спани `chat` і виклики інструментів успішні, але на 3-й спробі модель видала `"Updated scripts/verify.ts."` без причини (`llm_summary_matches_diff: false`) | [`2026-11-15-model-e4a100180003bc90123456789abcdef0.json`](./traces/2026-11-15-model-e4a100180003bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-model-e4a100180003bc90123456789abcdef0.png) |
| 9 | `t-23` | 3 | `e4a100230003bc90123456789abcdef0` | **`модель`** | На 3-й спробі неоднозначної задачі модель викликала `execute_tool edit` на `tests/verify.test.ts` поза списком `files` (`tests_untouched: false`) | [`2026-11-15-model-e4a100230003bc90123456789abcdef0.json`](./traces/2026-11-15-model-e4a100230003bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-model-e4a100230003bc90123456789abcdef0.png) |
| 10 | `t-08` | 1 | `c3d4e5f6a1b20008c3d4e5f6a1b20901` | **`харнес`** | Зупинено на кроці 3 умовою `stopWhen: stepLimit(3, "t-08")` (див. [`stop.md`](./stop.md) і рядок 1 у [`stop-log.jsonl`](./stop-log.jsonl)); після `chat #3` спанів немає | [`2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.json`](./traces/2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.json) / [`.png`](./traces/2026-11-15-harness-c3d4e5f6a1b20008c3d4e5f6a1b20901.png) |
| 11 | `t-08` | 2 | `f007d4440001bc90123456789abcdef0` | **`харнес`** | Негайне відкриття circuit breaker на `error.type: "HTTP_429_RESOURCE_EXHAUSTED"` (див. [`stop.md`](./stop.md) і рядок 2 у [`stop-log.jsonl`](./stop-log.jsonl)) | [`2026-11-15-harness-f007d4440001bc90123456789abcdef0.json`](./traces/2026-11-15-harness-f007d4440001bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-harness-f007d4440001bc90123456789abcdef0.png) |
| 12 | `t-01` | 1 | `f008d4440002bc90123456789abcdef0` | **`харнес`** | Зупинка брамою міжмодельного верифікатора (`qwen3:4b`) на коміті `63a4ea8` через `A2=fail` та `A4..A7=unknown` ([`stopped-verify.json`](./verdicts/stopped-verify.json)) | [`2026-11-15-harness-f008d4440002bc90123456789abcdef0.json`](./traces/2026-11-15-harness-f008d4440002bc90123456789abcdef0.json) / [`.png`](./traces/2026-11-15-harness-f008d4440002bc90123456789abcdef0.png) |

Разом: **`задача` 3 · `промпт` 2 · `інструмент` 2 · `модель` 2 · `харнес` 3** (усього **12** класифікованих прогонів).

## 3. Класи, яких у мене НЕ траплялося
Усі 5 нормативних класів таблиці (`задача`, `промпт`, `інструмент`, `модель`, `харнес`) представлені реальними прогонами кроків 00–05. Водночас у межах класу `харнес` у мене **не траплялося примусового вбивства процесу за сигналом ОС `SIGTERM` (код виходу `143` із втратою поточного ходу)**, бо всі зупинення відбувалися або мʼяко через `stopWhen: isStepCount(N)` після завершення кроку, або через детерміноване блокування брейкером і брамою верифікатора. Приклади `SIGTERM` не вигадувалися.

## 4. Що з цього змінено в харнесі
| клас | що саме змінив | коміт |
|---|---|---|
| `задача` | Вилучив 3 зламані задачі (`t-rej-01`..`t-rej-03`) із робочого банку до заморозки й задокументував причини в [`docs/lab3/tasks-rejected.jsonl`](./tasks-rejected.jsonl) | [`64bce8c8401ffcd95bffc29c1e3391a0cf2206e7`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/64bce8c8401ffcd95bffc29c1e3391a0cf2206e7) |
| `промпт` | Додав у всі задачі [`docs/lab3/tasks.jsonl`](./tasks.jsonl) явні виконувані команди `acceptance` та перелік дозволених файлів `files`, а для нерелевантних запитів — мітку `no_changes: true` | [`64bce8c8401ffcd95bffc29c1e3391a0cf2206e7`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/64bce8c8401ffcd95bffc29c1e3391a0cf2206e7) |
| `інструмент` | У [`scripts/harness/run-task.ts`](../../scripts/harness/run-task.ts) перевів запуск підпроцесів на `shell: true` та ізольований `cwd` для коректної роботи CLI на Windows без помилок `.ps1` | [`74186974d59cfe0fd1f53c09ded6866b068e56f3`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/74186974d59cfe0fd1f53c09ded6866b068e56f3) |
| `модель` | Додав детермінований оцінювач `testsUntouched` у [`scripts/evals/graders.ts`](../../scripts/evals/graders.ts), щоб автоматично ловити спроби моделі правити файли у `tests/` | [`fbf7124e7a5616c5bc2427e71709b11870c840f0`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/fbf7124e7a5616c5bc2427e71709b11870c840f0) |
| `харнес` | Відділив штатні зупинення `stepLimit` та `circuitBreaker` ([`docs/lab3/stop.md`](./stop.md)) в окремий клас `харнес`, щоб вони не спотворювали статистику відмов агента | [`ca780e3ff804d2d85f6e96aaed3283bca3f702f1`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ca780e3ff804d2d85f6e96aaed3283bca3f702f1) |

## 5. Числа з тих самих трас
| `task_id` (`#`) | кроків (спанів `chat`) | вх. токени | вих. токени | час, с | оцінка вартості (`cost_usd_estimate`) |
|---|---|---|---|---|---|
| `t-rej-01` (#1) | 3 | `1840` | `410` | `5.20` | `$0.0522` |
| `t-rej-02` (#2) | 2 | `1420` | `290` | `4.10` | `$0.0387` |
| `t-rej-03` (#3) | 1 | `980` | `140` | `2.40` | `$0.0231` |
| `t-24` (#4) | 2 | `2780` | `766` | `7.90` | `$0.0877` |
| `t-04` (#5) | 1 | `1310` | `260` | `3.10` | `$0.0352` |
| `t-08` (#6) | 3 | `1920` | `430` | `5.40` | `$0.0546` |
| `t-02` (#7) | 3 | `1750` | `390` | `4.90` | `$0.0497` |
| `t-18` (#8) | 4 | `2480` | `670` | `6.80` | `$0.0774` |
| `t-23` (#9) | 4 | `2755` | `760` | `6.80` | `$0.0869` |
| `t-08` (#10, `isStepCount`) | 3 | `1620` | `340` | `4.20` | `$0.0447` |
| `t-08` (#11, `HTTP 429`) | 1 | `620` | `0` | `1.10` | `$0.0093` |
| `t-01` (#12, `verify stop`) | 8 | `2890` | `610` | `7.40` | `$0.0799` |

## 6. Чесні межі
- Конвенції GenAI в репозиторії `open-telemetry/semantic-conventions-genai` перебувають у статусі **Development**; назви спанів та атрибутів зафіксовані станом на **2026-11-15** і можуть змінитися у наступних версіях специфікації.
- Інтеграція AI SDK (`@ai-sdk/otel`) і специфікація OTel місцями розходяться: AI SDK записує `gen_ai.usage.cache_creation.input_tokens`, тоді як OTel публікує `gen_ai.usage.cache_write.input_tokens`; крім того, імена операцій `rerank` і `decide` існують лише в AI SDK і не входять до переліку OTel.
- Історія безкоштовного тарифу Langfuse Hobby становить **30 днів** із лімітом **50 000 одиниць на місяць**, тому доказовою базою є збережені у репозиторії пари `.json` + `.png` у [`docs/lab3/traces/`](./traces/), а не тимчасові зовнішні посилання на хмарний кабінет.
- Вміст промптів і відповідей у трасах вимкнений (`recordInputs: false`, `recordOutputs: false`), тому клас `промпт` (випадки #4 і #5) доводиться **структурою траси** (відсутність спанів `execute_tool` при `finish_reasons: ["stop"]` та порожній `patch.diff`, або виклик `execute_tool edit` на нецільовому файлі), а не сирим текстом промпта.
