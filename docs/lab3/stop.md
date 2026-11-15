# Автоматичне зупинення: бюджет, таймаут, circuit breaker

## Три шари
| Шар | Що обмежує | Чим реалізовано | Значення | Де в коді |
|---|---|---|---|---|
| задача | ходи | `maxTurns` / `--max-turns` (лише print у `claudeRunner`), `model.maxSessionTurns` (у дії `run-gemini-cli@v0`), власний лічильник ходів та `timeout_s` | `8`–`12` ходів (`task.max_turns`), у Gemini Action — `25` | [`scripts/harness/run-task.ts`](../../scripts/harness/run-task.ts) (`claudeRunner`, `spawnAgent`) |
| задача | гроші | `maxBudgetUsd` / `--max-budget-usd` (клієнтська ОЦІНКА в `claudeRunner`) + перевірка `MAX_TASK_USD` у брейкері | `$0.25` на задачу (`task.max_budget_usd`) | [`scripts/harness/run-task.ts`](../../scripts/harness/run-task.ts), [`src/harness/breaker.ts`](../../src/harness/breaker.ts) |
| задача | токени | `taskBudget: { total }` (АЛЬФА на боці API Anthropic) + облік `tokens_in + tokens_out` у `readMeta` | `12 000` токенів на задачу | [`scripts/harness/run-task.ts`](../../scripts/harness/run-task.ts) (`readMeta`) |
| прогін | кроки цикла | `stopWhen: [stepLimit(N, taskId), hasToolCall('submitArtifact')]` поверх канонічного `isStepCount(N)` | `N = 8` у штатному режимі (`N = 3` у перевірочному стоп-прогоні `t-08`) | [`src/harness/stop.ts`](../../src/harness/stop.ts) (`stepLimit`, `defaultStopConditions`) |
| CI | час | `timeout-minutes` задачі (`5`, `10`, `15` хв замість типових `360` хв) і кроку (`8` хв на кроці `id: g`) + `concurrency` з `cancel-in-progress: true` | задачі: `5` / `10` / `15` хв; крок виклику верифікатора/агента: `8` хв | [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml) |
| харнес | повтор аварій | тристановий `circuit breaker` (`closed` / `open` / `half-open`) із персистентним станом між прогонами | `THRESHOLD = 3`, `MAX_NO_PROGRESS = 4`, `COOLDOWN_MIN = 30` хв, негайний стоп на `HTTP 429` | [`src/harness/breaker.ts`](../../src/harness/breaker.ts), [`scripts/harness/run-queue.ts`](../../scripts/harness/run-queue.ts) |

Типові значення, які діяли б без мене: `ToolLoopAgent` — `isStepCount(20)`; голий `generateText` / `streamText` — `isStepCount(1)` (жодного циклу з інструментами); `WorkflowAgent` — **без ліміту кроків** (цикл іде до вичерпання квоти); задача GitHub Actions без `timeout-minutes` — **360 хвилин (6 годин квоти)**.

## Circuit breaker
- Умови спрацювання (мої, реалізовані у [`src/harness/breaker.ts`](../../src/harness/breaker.ts)):
  - `N` однакових відмов підряд: **`THRESHOLD = 3`** послідовні задачі з `acceptance_passed === false` або ненульовим кодом виходу.
  - немає прогресу `M` задач: **`MAX_NO_PROGRESS = 4`** задачі без жодного нового зеленого прогону.
  - вартість задачі вище за бюджет: **`MAX_TASK_USD = $0.25`** — перевищення відкриває брейкер одразу після завершення задачі.
  - частка червоних брам вище за: **50%** на вікні останніх 4 задач черги.
  - відмова провайдера за квотою (`HTTP 429` / `RESOURCE_EXHAUSTED`): **так — відкриває брейкер негайно з першого разу (`fails = 1`)**, бо подальший перебір задач у черзі при вичерпаній квоті лише спалює хвилини CI та гарантовано завершується новими `429`.
- Перепочинок (`cool-down`): **`COOLDOWN_MIN = 30` хвилин** після переходу у стан `open`; якщо пробна задача у стані `half-open` знову падає, перепочинок подвоюється до **`60` хвилин**.
- `Half-open`: після завершення `cool-down` виклик `mayRun()` переводить стан у `half-open` і повертає `{ allow: true, probe: true }` для **рівно однієї пробної задачі** (поки вона виконується, наступні виклики `mayRun()` повертають `allow: false`). Якщо пробна задача зелена (`record(true, null)`) → брейкер переходить у `closed` з обнуленням лічильників; якщо червона (`record(false, ...)`) → **негайно** повертається в `open` без накопичення `THRESHOLD`.
- Де живе стан між прогонами: локально у файлі [`.harness/breaker.json`](../../.harness/breaker.json), а в GitHub Actions передається між прогонами через `actions/upload-artifact@v7` та `actions/download-artifact@v8` (артефакт `breaker` у [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml)).

## Походження патерну — чесно
Martin Fowler, «CircuitBreaker» (06.03.2014, з посиланням на книгу Michael Nygard «Release It!»): стани `closed` / `open` / `half-open` — це патерн **про виклики віддалених служб**. Первинного вендорського джерела, що застосовує circuit breaker саме до агентних циклів, немає (у дописах Anthropic за 05.02.2026 про компілятор C та 24.03.2026 про довгі прогони брейкер не описаний — там або вічна петля, або брама спринту на 5–15 ітерацій). Отже, застосування circuit breaker у [`src/harness/breaker.ts`](../../src/harness/breaker.ts) — це **моє інженерне рішення за аналогією**, а не усталена вендорська практика.

## Прогін, який зупинився сам
- Прогін: [`docs/lab3/runs/t-08-stopped-1794765000000/run.json`](./runs/t-08-stopped-1794765000000/run.json) (відтворюється командою `npx tsx scripts/harness/demo-stop.ts`), наступний зелений прогін після відновлення — [`docs/lab3/runs/t-08-recovery-1794765060000/run.json`](./runs/t-08-recovery-1794765060000/run.json).
- Який ліміт спрацював:
  1. На шарі прогону — умова `stepLimit(3, 't-08')` поверх канонічного `isStepCount(3)` у масиві `stopWhen`.
  2. На шарі харнеса — негайне спрацювання `circuitBreaker` на відповідь провайдера `HTTP 429 RESOURCE_EXHAUSTED`.
- На чому саме: задача `t-08` (перевірка traversal-захисту MCP), яка потребує 5 кроків читання й перевірки файлів, була зупинена рівно на **3-му кроці** (`step: 3`, витрачено `1620` вхідних і `340` вихідних токенів до виклику `submitArtifact`).
- Що харнес зробив далі:
  1. Обгортка `stepLimit` дописала JSON-рядок у [`docs/lab3/stop-log.jsonl`](./stop-log.jsonl) і завершила цикл.
  2. Виконавець позначив прогін у [`docs/lab3/runs/t-08-stopped-1794765000000/run.json`](./runs/t-08-stopped-1794765000000/run.json) зі статусом `"exit_status": "budget_or_turns"` та `"acceptance_passed": false`.
  3. Після отримання `HTTP 429` брейкер перейшов у стан `open` із `cooldownMinutes: 30`, а після перепочинку в стані `half-open` пропустив рівно одну пробну задачу `t-08` зі штатним лімітом `stepLimit(8, 't-08')`, яка завершилася за 5 кроків (`"exit_status": "ok"`, `"acceptance_passed": true` у [`docs/lab3/runs/t-08-recovery-1794765060000/run.json`](./runs/t-08-recovery-1794765060000/run.json)) і повернула брейкер у стан `closed`.
- Чи це те, що я планував: **так** — прогін зупинився детерміновано без висячого процесу, залишив непорожній `run.json` і запис у журналі зупинень, а брейкер коректно пройшов повний цикл `closed → open → half-open (1 пробна задача) → closed`.
- Рядок журналу ([`docs/lab3/stop-log.jsonl`](./stop-log.jsonl)):
```json
{"at":"2026-11-15T18:10:04.200Z","taskId":"t-08","limit":"isStepCount","n":3,"step":3,"actionTaken":"stopped_loop_marked_budget_or_turns_recorded_breaker"}
{"at":"2026-11-15T18:10:05.000Z","taskId":"t-08","limit":"circuitBreaker","actionTaken":"breaker_opened_immediately_on_HTTP_429_cooldown_30m"}
```

## Чого я НЕ контролюю
- `maxBudgetUsd` — це **клієнтська оцінка** вартості на боці CLI/SDK, яка рахується постфактум за тарифами моделі й може перевищити ліміт на величину останнього великого кроку; тому ми закладаємо запас **20%** (`$0.25` замість `$0.30`).
- Витрати, відновлені з продовженої сесії (`--resume`), у цей ліміт **не входять** — продовжений прогін стартує з нульовою оцінкою, тож сумарну вартість задачі має підсумовувати сам харнес за записами `run.json`.
- Витрати субагентів у ліміт **ВХОДЯТЬ**: після досягнення стелі нові субагенти не стартують із повідомленням `Budget limit reached`, а фонові зупиняються.
- Опція `taskBudget: { total }` перебуває у статусі **альфа** на боці API Anthropic.
- На моєму безкоштовному шляху (Gemini CLI `0.57.0` + OpenCode `1.18.32` з локальною моделлю Ollama) прапорців `--max-turns` та `--max-budget-usd` у самому бінарнику CLI немає (для Gemini відомий лише `model.maxSessionTurns: 25` у вхідному `settings` GitHub Action `run-gemini-cli@v0`), тому **головними реальними зупинювачами на безкоштовному шляху є власний таймаут `timeout_s` (`spawnSync` timeout у `run-task.ts`), `stopWhen: [stepLimit(N, taskId)]` у власному коді на AI SDK, явні `timeout-minutes` у CI та персистентний `circuit breaker` у `.harness/breaker.json`**.
