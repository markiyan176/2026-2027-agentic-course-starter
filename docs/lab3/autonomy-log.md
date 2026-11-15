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

