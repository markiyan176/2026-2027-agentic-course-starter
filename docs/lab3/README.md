# Лабораторна 3 — харнес автономних агентів

## 1. Таблиця прийняття

| Критерій | Де доказ | Посилання |
|---|---|---|
| брама · CI зелений на поданому SHA | прогін Actions `gates` на `main` | [Actions · workflow `gates`](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions/workflows/gates.yml) |
| брама · журнал автономності, ≥ 4 сесії | `docs/lab3/autonomy-log.md` (5 сесій, розподілених по тижнях занять 09–10) | [`docs/lab3/autonomy-log.md`](./autonomy-log.md) |
| брама · жодного обходу перевірок дозволів | конфігурація виконавця (`dontAsk` / `auto_edit` + явний `--allowedTools`) | [`scripts/harness/run-task.ts`](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/74186974d59cfe0fd1f53c09ded6866b068e56f3/scripts/harness/run-task.ts#L79-L115) |
| брама · немає секретів в історії | `git log --all --oneline -- .env .env.local` (порожній вивід) + шаблон `.env.example` | [`.env.example`](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/1fde08833090a1a3cdb5854bba80a61de37557d5/.env.example#L1-L65) |
| крок 00 · фабрика задач | `docs/lab3/factory.md` + `scripts/harness/run-task.ts` + `docs/lab3/runs/` | [`docs/lab3/factory.md`](./factory.md) · [коміт `7418697`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/74186974d59cfe0fd1f53c09ded6866b068e56f3) |
| крок 01 · ланцюг брам | `docs/lab3/gates.md` + `.github/workflows/gates.yml` + червоний прогін `43743832769` | [`docs/lab3/gates.md`](./gates.md) · [прогін `43743832769`](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions/runs/43743832769) |
| крок 02 · верифікатор зупинив зміну | `docs/lab3/verifier.md` + зупинений коміт `63a4ea8` + виправлення `4458d27` | [`docs/lab3/verifier.md`](./verifier.md) · [зупинений `63a4ea8`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/63a4ea8161949e95e01ac7cf686f37c217cd5746) · [виправлення `4458d27`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/4458d27501e841a9cd65fe5f87c00dd96ddce1c2) |
| крок 03 · прогін зупинився сам | `docs/lab3/stop.md` + `src/harness/stop.ts` + `src/harness/breaker.ts` + `docs/lab3/stop-log.jsonl` | [`docs/lab3/stop.md`](./stop.md) · [коміт `ca780e3`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/ca780e3ff804d2d85f6e96aaed3283bca3f702f1) |
| крок 04 · регресійна брама в CI | `docs/lab3/evals.md` + заморозка банку `64bce8c` + `scripts/evals/gate.ts` | [`docs/lab3/evals.md`](./evals.md) · [заморозка `64bce8c`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/64bce8c8401ffcd95bffc29c1e3391a0cf2206e7) · [брама `fbf7124`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/fbf7124e7a5616c5bc2427e71709b11870c840f0) |
| крок 05 · число згоди судді | `docs/lab3/judge.md` + розмітка `49dcb8a` + калібрування `1fde088` ($\kappa = 0.836$, holdout $\kappa = 0.714$) | [`docs/lab3/judge.md`](./judge.md) · [розмітка `49dcb8a`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/49dcb8aba253dc33277ae0c841148054ca05e5bf) · [калібрування `1fde088`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/1fde08833090a1a3cdb5854bba80a61de37557d5) |
| крок 06 · класифікація помилок | `docs/lab3/errors.md` + `src/telemetry/otel.ts` + 12 пар `.json`/`.png` у `docs/lab3/traces/` | [`docs/lab3/errors.md`](./errors.md) · [коміт `26a8f57`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/26a8f5783303f95457defc9c4851fb037039e76a) |
| крок 07 · інʼєкція промпту | `docs/lab3/redteam.md` + дірка до виправлення `9a8aee8` + виправлення межі `65327d8` | [`docs/lab3/redteam.md`](./redteam.md) · [до виправлення `9a8aee8`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/9a8aee8f2d459413f1f8fc51ddb447cd6029a6e1) · [після виправлення `65327d8`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/65327d81bfb46782655b407239b65c94103b1aa5) |
| крок 08 · цей звіт | `docs/lab3/README.md` | [`docs/lab3/README.md`](./README.md) |

## 2. Прогони CI

- **Зелений на поданому SHA (`main`)**: [GitHub Actions · workflow `gates` на гілці `main`](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions/workflows/gates.yml)
- **Червоний прогін у GitHub Actions, збережений як доказ (крок 01)**: [прогін `43743832769`](https://github.com/markiyan176/2026-2027-agentic-course-starter/actions/runs/43743832769) на гілці `harness/red-2026-11-15` (коміт [`2edb8a0eff286eb7f911dde5f7b4cc6c9e6d6a9a`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/2edb8a0eff286eb7f911dde5f7b4cc6c9e6d6a9a)) — **що саме зупинило**: перша детермінована брама `types` (`npm run typecheck`) упала зі статусом `failure` на навмисній помилці типів у `scripts/harness/run-task.ts`, через що залежні брами `lint`, `tests`, `build` отримали статус `skipped`, а задача `record` зібрала підсумковий `gate-record.json`.
- **Зміна, зупинена міжмодельним верифікатором (крок 02)**: коміт [`63a4ea8161949e95e01ac7cf686f37c217cd5746`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/63a4ea8161949e95e01ac7cf686f37c217cd5746) ([`docs/lab3/verdicts/stopped-verify.json`](./verdicts/stopped-verify.json)) — **що саме зупинило**: верифікатор `qwen3:4b` повернув `fail` на критерії `A2` (`SUBMIT.total = 10 < 20`) та `unknown` на `A4..A7`, а fail-closed функція `isBlocked` заблокувала злиття (`exit 1`).
- **Виправлення після червоного**: коміт [`1347d25037e24f0fb1e69b6c86dc975b79b04638`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/1347d25037e24f0fb1e69b6c86dc975b79b04638) (для брами `types` на `main`) та коміт [`4458d27501e841a9cd65fe5f87c00dd96ddce1c2`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/4458d27501e841a9cd65fe5f87c00dd96ddce1c2) (для брами верифікатора `npm run verify`).

## 3. Інструменти й моделі

| Роль | Інструмент | Модель із версією | Платний чи безкоштовний шлях |
|---|---|---|---|
| Виконавець задач черги (`run-task.ts`) | Google Gemini CLI `0.57.0` (`@google/gemini-cli`) | `gemini-2.5-flash` (родина Google Gemini) | Безкоштовний рівень Google AI Studio |
| Локальний резервний виконавець | OpenCode CLI `1.18.32` + Ollama | `ollama/qwen3:4b@2026-11` | Повністю безкоштовний локальний сервер (`$0`) |
| Міжмодельний верифікатор (крок 02) і суддя (крок 05) | Власний клієнт `scripts/verify.ts` + Ollama HTTP API | `ollama/qwen3:4b@2026-11` (інша родина — Alibaba Qwen3) | Повністю безкоштовний локальний сервер (`$0`) |
| Виконавець evals та регресійна брама (крок 04) | Власний раннер `scripts/evals/run-evals.ts` + `scripts/evals/gate.ts` | Детерміновані оцінювачі (`graders.ts`) + `qwen3:4b` для `llm_summary_matches_diff` | Повністю безкоштовний (`$0`) |
| Трасування OpenTelemetry (крок 06) | `ai` `7.0.99` + `@ai-sdk/otel` `1.0.118` + `@opentelemetry/exporter-trace-otlp-http` `0.222.0` | Langfuse Cloud Hobby (ЄС) / локальні витяжки у `docs/lab3/traces/` | Безкоштовний тариф Langfuse Hobby (`50 000` од./міс.) |
| Red-team інваріанти й межа (крок 07) | `scripts/redteam/run-redteam.ts` + `scripts/redteam/invariants.ts` | Шаблони AgentDojo (MIT) та InjecAgent (MIT) на `gemini-2.5-flash` | Повністю безкоштовний (`$0`) |

## 4. Як повторити автономний прогін

1. **Встановлення залежностей і перевірка середовища** (Node.js `>=22.13.0` або `24+`; перевірено на `v24.20.0`):
   ```powershell
   npm ci
   Copy-Item .env.example .env.local
   ```
2. **Режим дозволів і перелік дозволених інструментів**:
   - Для Gemini CLI: `--approval-mode auto_edit --allowed-tools read_file,edit,write_file,run_shell_command`
   - Для Claude CLI (у `claudeRunner`): `--permission-mode dontAsk --allowedTools "Read,Edit,Bash(npm test *),Bash(npm run typecheck *),Bash(git diff *)"`
   - Обхід дозволів у всьому репозиторії заборонений і перевіряється інваріантом `no_bypass_in_config`.
3. **Спосіб ізоляції (`git worktree`) та команди запуску кожного контуру**:
   ```powershell
   # 1. Прогін однієї задачі з черги в ізольованому git worktree (..\harness-runs\t-01)
   npx tsx scripts/harness/run-queue.ts docs/lab3/tasks.jsonl --id t-01

   # 2. Детерміновані брами + міжмодельний верифікатор (кроки 01–02)
   npm run typecheck
   npm run lint
   npm test
   npm run verify
   npm run build

   # 3. Перевірка автоматичного зупинення stepLimit та circuit breaker (крок 03)
   npx tsx scripts/harness/demo-stop.ts

   # 4. Прогін замороженого банку evals (k=3) та регресійної брами (крок 04)
   $env:EVAL_K = '3'
   npx tsx scripts/evals/run-evals.ts docs/lab3/tasks.jsonl
   npx tsx scripts/evals/gate.ts

   # 5. Калібрування судді: сира згода, каппа Коена і матриця 3x3 (крок 05)
   npx tsx scripts/judge/calibrate.ts

   # 6. Red-team прогін 6 сценаріїв ін'єкції промпту з перевіркою інваріантів (крок 07)
   npx tsx scripts/redteam/run-redteam.ts
   ```

## 5. Висновок і числа

**Висновок одним перевірюваним твердженням**: Регресійний кошик замороженого банку з **14 задач** (`frozen_at: "2026-11-15"`) тримається на рівні **`pass@3 = 100%` (14/14) та `pass^3 = 100%` (14/14)** за `k = 3` незалежних спроб із чистого середовища (`0` регресій відносно базового рівня `docs/lab3/evals-baseline.json`), міжмодельний суддя `ollama/qwen3:4b@2026-11` після однієї ітерації рубрики досягає каппи Коена **$\kappa = 0.836$** на всіх 20 випадках (**$\kappa = 0.714$** на 6 відкладених) із **`пропускає погане = 0`**, а всі **6 red-team сценаріїв** інʼєкції промпту на трьох точках входу детерміновано зупиняються (`6/6 ЗУПИНЕНО`).

Повні числа: [evals.md](./evals.md) · калібрування судді: [judge.md](./judge.md) · класи помилок: [errors.md](./errors.md)

| показник | базова лінія (`2026-11-15`, [`64bce8c`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/64bce8c8401ffcd95bffc29c1e3391a0cf2206e7)) | останній прогін (`2026-11-15`, [`fbf7124`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/fbf7124e7a5616c5bc2427e71709b11870c840f0)) | де доказ |
|---|---|---|---|
| частка проходження банку задач (`pass@3`, усі 24 / `regression` 14) | `1.000` (24/24) / `1.000` (14/14) | `1.000` (24/24) / `1.000` (14/14) | [`docs/lab3/evals.md`](./evals.md), [`docs/lab3/evals.jsonl`](./evals.jsonl) |
| `pass^k`, `k = 3` (`regression` 14 / `new` 4 / `edge` 6 / усі 24) | `1.000` / `0.750` / `0.667` / `0.875` | `1.000` / `0.750` / `0.667` / `0.875` | [`docs/lab3/evals-baseline.json`](./evals-baseline.json), [`docs/lab3/evals.md`](./evals.md) |
| час на задачу (медіана, `duration_s`) | `5.80 с` | `5.80 с` | [`docs/lab3/evals.jsonl`](./evals.jsonl) |
| токени на задачу (медіана, вх. / вих.) | `2115` / `548` | `2115` / `548` | [`docs/lab3/evals.jsonl`](./evals.jsonl) |
| оцінка вартості задачі (`cost_usd_estimate`, сер.) | `$0.0650` | `$0.0650` | [`docs/lab3/evals.jsonl`](./evals.jsonl) |
| каппа Коена для судді (робочі 14 / відкладені 6 / усі 20) | до ітерації: `0.504` / `0.455` / `0.492` | після ітерації: **`0.884` / `0.714` / `0.836`** | [`docs/lab3/judge.md`](./judge.md), [`docs/lab3/verdicts/judge.jsonl`](./verdicts/judge.jsonl) |

## 6. Код у репозиторії

| що | шлях |
|---|---|
| фабрика задач і виконавець | [`scripts/harness/run-task.ts`](../../scripts/harness/run-task.ts), [`scripts/harness/run-queue.ts`](../../scripts/harness/run-queue.ts) |
| ланцюг брам (робочий процес) і агрегатор | [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml), [`scripts/harness/record-gates.mjs`](../../scripts/harness/record-gates.mjs) |
| верифікатор і розрахунок каппи Коена | [`src/verify/schema.ts`](../../src/verify/schema.ts), [`scripts/verify.ts`](../../scripts/verify.ts), [`scripts/kappa.ts`](../../scripts/kappa.ts) |
| зупинення (`stopWhen`) і `circuit breaker` | [`src/harness/stop.ts`](../../src/harness/stop.ts), [`src/harness/breaker.ts`](../../src/harness/breaker.ts), [`scripts/harness/demo-stop.ts`](../../scripts/harness/demo-stop.ts) |
| набір задач для evals, оцінювачі і регресійна брама | [`docs/lab3/tasks.jsonl`](./tasks.jsonl), [`scripts/evals/graders.ts`](../../scripts/evals/graders.ts), [`scripts/evals/run-evals.ts`](../../scripts/evals/run-evals.ts), [`scripts/evals/gate.ts`](../../scripts/evals/gate.ts) |
| калібрування судді та інструментація OpenTelemetry | [`scripts/judge/calibrate.ts`](../../scripts/judge/calibrate.ts), [`src/telemetry/otel.ts`](../../src/telemetry/otel.ts) |
| сценарії та інваріанти red-team | [`scripts/redteam/cases.ts`](../../scripts/redteam/cases.ts), [`scripts/redteam/invariants.ts`](../../scripts/redteam/invariants.ts), [`scripts/redteam/run-redteam.ts`](../../scripts/redteam/run-redteam.ts) |
| модульні тести харнеса | [`tests/harness/run-task.test.ts`](../../tests/harness/run-task.test.ts), [`tests/harness/kappa.test.ts`](../../tests/harness/kappa.test.ts), [`tests/harness/stop-breaker.test.ts`](../../tests/harness/stop-breaker.test.ts), [`tests/harness/graders.test.ts`](../../tests/harness/graders.test.ts), [`tests/harness/redteam.test.ts`](../../tests/harness/redteam.test.ts), [`tests/verify.test.ts`](../../tests/verify.test.ts) |

## 7. Файли пакета

| файл | крок | посилання |
|---|---|---|
| `factory.md` | 00 | [factory.md](./factory.md) |
| `gates.md` | 01 | [gates.md](./gates.md) |
| `verifier.md` | 02 | [verifier.md](./verifier.md) |
| `stop.md` | 03 | [stop.md](./stop.md) |
| `evals.md` | 04 | [evals.md](./evals.md) |
| `judge.md` | 05 | [judge.md](./judge.md) |
| `errors.md` | 06 | [errors.md](./errors.md) |
| `traces/` | 01, 06, 07 | [traces/](./traces/) |
| `redteam.md` | 07 | [redteam.md](./redteam.md) |
| `autonomy-log.md` | з кроку 00 (5 сесій) | [autonomy-log.md](./autonomy-log.md) |
