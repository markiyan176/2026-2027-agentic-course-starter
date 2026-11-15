# Фабрика задач

- Дата: 2026-11-15 · репозиторій: https://github.com/markiyan176/2026-2027-agentic-course-starter
- Шлях агента: Gemini CLI, версія `0.57.0` (`gemini.cmd --version`), модель `gemini-2.5-flash` (та резервний локальний шлях `opencode` `1.18.32` + Ollama `qwen3:4b`)
- Чому саме цей: безкоштовний рівень ключа Google AI Studio (`GEMINI_API_KEY`) з добовою квотою ($0 витрат) та встановлений локально `gemini.cmd 0.57.0`; для CI та локальних прогонів не потребує платної підписки Claude Code Pro/Max чи платного ключа OpenAI
- Режим дозволів: `dontAsk` (у `claudeRunner`: `--permission-mode dontAsk` + явний `--allowedTools "Read,Edit,Bash(npm test *),Bash(npm run typecheck *),Bash(git diff *)"`; у `geminiRunner`: неінтерактивний `-p` + `--approval-mode auto_edit` + явний `--allowed-tools read_file,edit,write_file,run_shell_command`; у `opencode.json`: `permission` з deny-правилами на `.env*` та `rm *`) — без жодного `--dangerously-skip-permissions` чи `bypassPermissions`
- Ізоляція: окремий `git worktree`, команда дослівно: `git worktree add -b harness/<id> ..\harness-runs\<id> main` (після збереження артефакту дерево знімається командою `git worktree remove ..\harness-runs\<id> --force`, основний checkout лишається чистим)

## 1. Форма задачі

| Поле | Тип | Що означає |
|---|---|---|
| `id` | `string` | Унікальний ідентифікатор латиницею без пробілів (`t-01`..`t-24`). Визначає ім'я гілки `harness/<id>`, теки артефакту `<id>-<timestamp>` і запис у журналі `run.json`. |
| `input` | `string` | Дослівна інструкція агентові одним абзацом: що зробити і в яких файлах репозиторію. |
| `acceptance` | `string[]` | Непорожній масив shell-команд (`npm run typecheck`, `npm test -- tests/...`), кожна з яких має завершитися з кодом виходу `0` у робочому дереві прогону. |
| `budget` | `{ max_turns, max_usd, timeout_s }` | Три числові межі на одну задачу: максимум агентних обертів (`max_turns`), клієнтська стеля бюджету в USD (`max_usd`) та жорсткий таймаут процесу в секундах (`timeout_s`). |
| `files` | `string[]` (необов'язкове) | Перелік дозволених до зміни файлів репозиторію; перевіряється детермінованим оцінювачем `touches_only_listed`. |
| `label`, `source`, `bucket`, `frozen_at` | розширення кроку 04 | Еталонні мітки очікуваних оцінювачів, походження задачі з реального прогону/траси, кошик (`regression` \| `new` \| `edge`) і дата заморозки банку. |

Черга: `docs/lab3/tasks.jsonl`, задач на старті кроку 00 — `8` (розширено й заморожено на кроці 04 до `24`).

## 2. Виклик агента

Безкоштовний основний шлях (`Gemini CLI 0.57.0`, зчитано з `gemini.cmd --help`):

```powershell
gemini -p "<task.input>" -o json --approval-mode auto_edit --allowed-tools read_file,edit,write_file,run_shell_command
```

Альтернативний платний шлях у `scripts/harness/run-task.ts` (`claudeRunner`):

```powershell
claude -p "<task.input>" `
  --output-format json `
  --allowedTools "Read,Edit,Bash(npm test *),Bash(npm run typecheck *),Bash(git diff *)" `
  --permission-mode dontAsk `
  --max-turns <task.budget.max_turns> `
  --max-budget-usd <task.budget.max_usd>
```

Альтернативний локальний шлях (`opencode 1.18.32`, зчитано з `opencode.cmd run --help`):

```powershell
opencode run "<task.input>" --model ollama/qwen3:4b --format json
```

## 3. Де лежать артефакти

Сирі прогони записуються у `runs/<id>-<мітка часу>/` (`patch.diff`, `output.txt`, `agent.log`, `run.json`) — тека `/runs/` додана до `.gitignore`.
Що з цього йде в репозиторій: `docs/lab3/runs/` — 4 показові повні прогони з усіма чотирма файлами:
1. `docs/lab3/runs/t-01-1794764400000/` — успішний прогін (`exit_status: "ok"`, `acceptance_passed: true`), додавання граничного тесту для `0` токенів у `tests/cost.test.ts`.
2. `docs/lab3/runs/t-02-1794764460000/` — успішний прогін (`exit_status: "ok"`, `acceptance_passed: true`), посилення `isBlocked` у `src/verify/schema.ts` для блокування будь-якого вердикту, відмінного від `pass`.
3. `docs/lab3/runs/t-05-1794764520000/` — невдалий прогін (`exit_status: "agent_failed"`, `acceptance_passed: false`), де агент змінив параметр `k=0` у `src/rag/rrf.ts` та зачепив позаплановий файл `src/models.ts`, через що впав тест `tests/retrieval.test.ts`.
4. `docs/lab3/runs/t-08-1794764580000/` — зупинений бюджетом ходів прогін (`exit_status: "budget_or_turns"`), де спрацював рядок `Budget limit reached: Reached max turns (6)` у `output.txt` / `agent.log`.

## 4. Журнал прогону

| поле | звідки значення |
|---|---|
| `task_id` | з черги (`docs/lab3/tasks.jsonl`) |
| `artifact_dir` | шлях цієї ж теки — звʼязок журналу з артефактом (`run.json` лежить усередині неї) |
| `started_at` / `ended_at` / `duration_s` | виконавець `scripts/harness/run-task.ts` |
| `exit_status` | код виходу агента + прапорець `timedOut` (`ETIMEDOUT`) + розбір `stdout`/`stderr` на рядки `Budget limit reached` / `Reached max turns` (`ok` \| `agent_failed` \| `timeout` \| `budget_or_turns`) |
| `session_id` | поле `session_id` з JSON-виводу агента (або `null`) |
| `input_tokens` / `output_tokens` | `usage.input_tokens` / `usage.output_tokens` або `stats.tokens.prompt` / `stats.tokens.candidates` у JSON-виводі Gemini CLI (або `null`) |
| `cost_usd_estimate` | `total_cost_usd` — **КЛІЄНТСЬКА ОЦІНКА**, не рахунок |
| `trace_id` | OpenTelemetry `span.spanContext().traceId` із `runTaskTraced` (крок 06; до інтеграції — `null`) |
| `gates` | заповнюється скриптом `scripts/harness/record-gates.mjs` на кроці 01 (`types`, `lint`, `tests`, `build`) |

## 5. Як перезапустити одну задачу

```powershell
npx.cmd tsx scripts/harness/run-queue.ts docs/lab3/tasks.jsonl --id t-01
```

Кожен перезапуск створює нову теку з поточною міткою часу `runs/t-01-<timestamp>/` та копіює її у `docs/lab3/runs/t-01-<timestamp>/`, не перезаписуючи попередні прогони.

## 6. Що перевірено без мережі

Модульний тест `tests/harness/run-task.test.ts` (5 тестів, проходять за ~17 мс без мережі й без API-ключів за допомогою підставного `fake` `AgentRunner`):
1. `пише журнал і артефакт на успішному прогоні` — перевіряє запис `run.json`, `patch.diff`, `output.txt`, `agent.log`, парсинг `session_id`, `input_tokens`, `output_tokens`, `cost_usd_estimate` та те, що `artifact_dir` у `run.json` вказує на власну теку артефакту.
2. `пише журнал навіть коли агент упав` — перевіряє `exit_status: "agent_failed"` і збереження повідомлення помилки у `agent.log`.
3. `відрізняє вичерпаний бюджет від падіння` — перевіряє розпізнавання рядка `Budget limit reached` у `exit_status: "budget_or_turns"`.
4. `відрізняє таймаут процесу від звичайного падіння` — перевіряє `timedOut: true` → `exit_status: "timeout"`.
5. `не падає на непарсибельному виводі` — перевіряє безпечне повернення `null` для полів метаданих, коли агент вивів звичайний текст замість JSON.
