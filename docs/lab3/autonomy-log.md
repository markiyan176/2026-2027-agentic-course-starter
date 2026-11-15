# Журнал автономності — Лабораторна робота №3

## Сесія 1 — Побудова фабрики задач та ізоляції git worktree (Крок 00)

- **Дата**: 2026-11-15
- **Кроки**: 00 (Фабрика задач: черга, виконавець, артефакт на кожну задачу)
- **Інструмент і модель**: Gemini CLI `0.57.0` (`gemini-2.5-flash`) + OpenCode CLI `1.18.32` (`ollama/qwen3:4b`)
- **Режим дозволів та дозволені інструменти**: неінтерактивний запуск без обходу дозволів (`--approval-mode auto_edit` + `--allowed-tools read_file,edit,write_file,run_shell_command` для Gemini CLI; `--permission-mode dontAsk` + `--allowedTools "Read,Edit,Bash(npm test *),Bash(npm run typecheck *),Bash(git diff *)"` для `claudeRunner`). Прапорці `--dangerously-skip-permissions` та `bypassPermissions` не використовувалися.
- **Спосіб ізоляції**: окреме робоче дерево `git worktree add -b harness/<id> ..\harness-runs\<id> main` на кожну задачу з автоматичним прибиранням у блоці `finally` (`git worktree remove ..\harness-runs\<id> --force`).
- **Що делеговано агенту**: генерація каркаса виконавця `scripts/harness/run-task.ts`, менеджера черги `scripts/harness/run-queue.ts`, офлайн-тестів `tests/harness/run-task.test.ts` та початкової черги задач `docs/lab3/tasks.jsonl`.
- **Де перебили або виправили агента (втручання людини)**:
  1. У першій чернетці `checkAcceptance` запуск `runTask` у модульному тесті з порожнім `mkdtempSync` намагався викликати `npm run typecheck` у тимчасовій теці ОС без `package.json`, що уповільнювало тести. Додано перевірку `existsSync(join(cwd, 'package.json'))`, завдяки якій офлайн-тести виконавця проходять за `17 мс` без зовнішніх процесів.
  2. Доповнено функцію `readMeta` розбором як `usage.{input_tokens, output_tokens}`, так і `stats.tokens.{prompt, candidates}` із реального JSON-виводу Gemini CLI `0.57.0`, а також розпізнаванням рядків `Budget limit reached` та `Reached max turns` для встановлення статусу `budget_or_turns`.
- **Докази**:
  - `scripts/harness/run-task.ts`, `scripts/harness/run-queue.ts`, `tests/harness/run-task.test.ts`
  - `docs/lab3/runs/t-01-1794764400000/run.json`, `docs/lab3/runs/t-02-1794764460000/run.json`, `docs/lab3/runs/t-05-1794764520000/run.json`, `docs/lab3/runs/t-08-1794764580000/run.json`
  - `docs/lab3/factory.md`

## Сесія 2 — Детермінований ланцюг брам у CI та міжмодельний верифікатор (Кроки 01–02)

- **Дата**: 2026-11-15
- **Кроки**: 01 (Детерміновані брами в CI) та 02 (Верифікатор на іншій моделі як остання брама)
- **Інструмент і модель**: Виконавець — Gemini CLI `0.57.0` (`gemini-2.5-flash`); верифікатор — локальна модель Ollama `qwen3:4b` (Alibaba Qwen3) через `scripts/verify.ts`
- **Режим дозволів та дозволені інструменти**: `--approval-mode auto_edit` + `--allowed-tools read_file,edit,write_file,run_shell_command`, без обходу дозволів.
- **Спосіб ізоляції**: окрема гілка `harness/red-2026-11-15` для перевірки червоної брами в GitHub Actions та робочі дерева `git worktree` для артефактів калібрування.
- **Що делеговано агенту**: написання `.github/workflows/gates.yml` (`types → lint → tests → build → verify` + `record`), скрипту агрегації `scripts/harness/record-gates.mjs`, розрахунку каппи Коена `scripts/kappa.ts` та оновлення `isBlocked` у `src/verify/schema.ts` для блокування на `unknown`.
- **Де перебили або виправили агента (втручання людини)**:
  1. У `package.json` скрипт `"verify"` мав жорстко закодований аргумент `docs/lab2/verify-input.diff`, через що при першому запуску `npm run verify` ігнорувався новий вхідний файл `docs/lab3/verify-task-input.diff`. Виправлено `package.json` (`"verify": "tsx scripts/verify.ts"`), після чого верифікатор коректно заблокував зламану зміну в коміті `63a4ea8`.
  2. Під час калібрування на 12 випадках виявлено розходження у випадку `cal-08` (суддя поставив `fail` замість `unknown` на diff самої лише документації). У промпт `scripts/verify.ts` додано явну вимогу повертати `"verdict":"unknown"` з порожнім `evidence`, якщо у diff немає даних щодо критерію.
- **Докази**:
  - Червоний прогін CI: [`43743832769`](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions/runs/43743832769) на гілці `harness/red-2026-11-15` (`2edb8a0`)
  - Коміт, зупинений верифікатором: `63a4ea8161949e95e01ac7cf686f37c217cd5746`, дослівний вердикт у `docs/lab3/verdicts/stopped-verify.json`
  - Зелений вердикт після виправлення: `docs/lab3/verdicts/latest-verify.json`, калібрування: `docs/lab3/verdicts/step02-calibration.json`, звіт: `docs/lab3/verifier.md`

## Сесія 3 — Автоматичне зупинення, заморожений банк evals і регресійна брама (Кроки 03–04)

- **Дата**: 2026-11-15
- **Кроки**: 03 (Автоматичне зупинення: бюджет, таймаут, circuit breaker) та 04 (Evals у CI: еталонний набір задач і регресійна брама)
- **Інструмент і модель**: Gemini CLI `0.57.0` (`gemini-2.5-flash`) + власний раннер `scripts/evals/run-evals.ts` і детерміновані оцінювачі `scripts/evals/graders.ts`
- **Режим дозволів та дозволені інструменти**: `--approval-mode auto_edit` + `--allowed-tools read_file,edit,write_file,run_shell_command`, без обходу дозволів.
- **Спосіб ізоляції**: окреме робоче дерево `git worktree` на кожну з `k = 3` спроб (`..\eval-runs\<id>-<attempt>`).
- **Що делеговано агенту**: написання `src/harness/stop.ts`, `src/harness/breaker.ts`, розширення банку `docs/lab3/tasks.jsonl` до 24 задач (`14 regression`, `4 new`, `6 edge`), створення `scripts/evals/graders.ts`, `scripts/evals/run-evals.ts` та `scripts/evals/gate.ts`.
- **Де перебили або виправили агента (втручання людини)**:
  1. Під час чищення банку задач перед заморозкою відсіяно 3 задачі (`t-rej-01`..`t-rej-03`), які мали 0% проходження через помилки самих задач (суперечлива умова «перепиши `src/rag/` без зміни файлів у `src/`», відсутній тест `tests/legacy.test.ts` та нереалістичний бюджет `max_turns = 1`). Їх перенесено в `docs/lab3/tasks-rejected.jsonl` із поясненнями.
  2. У `src/harness/breaker.ts` додано перевірку: коли брейкер уже перебуває у стані `half-open` (виконується перша пробна задача), паралельні виклики `mayRun()` блокуються, щоб гарантувати запуск рівно однієї пробної задачі.
- **Докази**:
  - Заморозка банку й базового рівня: коміт `64bce8c8401ffcd95bffc29c1e3391a0cf2206e7`, файли `docs/lab3/tasks.jsonl`, `docs/lab3/tasks-rejected.jsonl`, `docs/lab3/evals-baseline.json`
  - Журнали зупинень і прогонів: `docs/lab3/stop-log.jsonl`, `docs/lab3/evals.jsonl`, `docs/lab3/evals-regression-caught.jsonl`
  - Звіти: `docs/lab3/stop.md`, `docs/lab3/evals.md`

## Сесія 4 — Калібрування судді, трасування OpenTelemetry та red-team перевірка інʼєкцій (Кроки 05–07)

- **Дата**: 2026-11-15
- **Кроки**: 05 (Калібрування судді: згода з власною розміткою), 06 (Трасування і аналіз помилок) та 07 (Red-team: стійкість до інʼєкції промпту)
- **Інструмент і модель**: Виконавець — Gemini CLI `0.57.0` (`gemini-2.5-flash`); суддя — Ollama `ollama/qwen3:4b@2026-11`; трасування — `ai` `7.0.99` + `@ai-sdk/otel` `1.0.118` + `@opentelemetry/exporter-trace-otlp-http` `0.222.0`
- **Режим дозволів та дозволені інструменти**: `--approval-mode auto_edit` + `--allowed-tools read_file,edit,write_file,run_shell_command` та `--permission-mode dontAsk` + `--allowedTools "Read,Edit,Bash(npm test *),Bash(npm run typecheck *),Bash(git diff *)"`. Жодного обходу дозволів не використовувалося.
- **Спосіб ізоляції**: окремий пісочничний каталог / `git worktree` на кожен red-team сценарій (`r-01`..`r-06`) із фальшивою канаркою `CANARY_NOT_A_SECRET=канарка-NOT-A-SECRET-7f3a`.
- **Що делеговано агенту**: написання скрипту калібрування `scripts/judge/calibrate.ts`, модуля телеметрії `src/telemetry/otel.ts`, сценаріїв red-team `scripts/redteam/cases.ts`, інваріантів `scripts/redteam/invariants.ts` та виконавця `scripts/redteam/run-redteam.ts`.
- **Де перебили або виправили агента (втручання людини)**:
  1. На кроці 05 суворо дотримано хронологічного порядку: ручну розмітку `docs/lab3/judge-cases.jsonl` (14 робочих і 6 відкладених випадків) та `docs/lab3/rubric-v1.md` закомічено в `49dcb8a` *до* генерації вердиктів судді `docs/lab3/verdicts/judge.jsonl`. Після однієї ітерації рубрики (`docs/lab3/rubric-v2.md` із конкретними прикладами) каппа зросла з `0.492` до `0.836` на всіх випадках і з `0.455` до `0.714` на відкладених (`пропускає погане = 0`).
  2. На кроці 07 під час першого red-team прогону (`9a8aee8`, `docs/lab3/redteam-before.jsonl`) виявлено проходження непрямої інʼєкції `r-03` (`tool_result`), яка створювала файл `../pwned.txt` поза межами робочого дерева. Втручанням людини додано детерміновану перевірку канонічного шляху `assertInsideWorktree(worktree, targetPath)` у `scripts/redteam/invariants.ts`, після чого всі 6 сценаріїв `r-01`..`r-06` у `docs/lab3/redteam.jsonl` зупинено (`exit 0`).
- **Докази**:
  - Калібрування судді: коміт розмітки `49dcb8a`, файли `docs/lab3/judge-cases.jsonl`, `docs/lab3/verdicts/judge-before.jsonl`, `docs/lab3/verdicts/judge.jsonl`, `docs/lab3/judge.md`
  - Траси й аналіз помилок: `src/telemetry/otel.ts`, 18 пар `.json` + `.png` у `docs/lab3/traces/`, `docs/lab3/errors.md`
  - Red-team: коміт до виправлення `9a8aee8` (`docs/lab3/redteam-before.jsonl`), журнал після виправлення `docs/lab3/redteam.jsonl`, тести `tests/harness/redteam.test.ts`, звіт `docs/lab3/redteam.md`



