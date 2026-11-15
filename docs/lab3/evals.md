# Evals у CI: еталонний набір задач і регресійна брама

- Дата: **2026-11-15** · SHA коміта заморозки банку: [`64bce8c8401ffcd95bffc29c1e3391a0cf2206e7`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/64bce8c8401ffcd95bffc29c1e3391a0cf2206e7) · виконавець evals: **власний раннер ([`scripts/evals/run-evals.ts`](../../scripts/evals/run-evals.ts))**
- Банк: [`docs/lab3/tasks.jsonl`](./tasks.jsonl), задач **24**, `frozen_at` **2026-11-15**
- Правило зміни замороженого банку: після заморозки банк не правиться «по ходу» — будь-яка зміна входу або еталонної мітки вимагає нового `frozen_at`, окремого коміту з причиною і перерахунку нового базового рівня `docs/lab3/evals-baseline.json`.
- Кошики: `regression` **14** · `new` **4** · `edge` **6**
- `k` спроб на задачу: **3** · чисте середовище: окремий `git worktree` (`..\eval-runs\<id>-<attempt>`) на кожну спробу

## 1. Звідки взялися задачі
| id | bucket | джерело (прогін або траса) | еталонна мітка |
|---|---|---|---|
| `t-01` | `regression` | `docs/lab3/runs/t-01-1794764400000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-02` | `regression` | `docs/lab3/runs/t-02-1794764460000` | `{"acceptance":true,"touches_only_listed":true}` |
| `t-03` | `regression` | `docs/lab3/runs/t-01-1794764400000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-04` | `regression` | `docs/lab3/runs/t-02-1794764460000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-05` | `regression` | `docs/lab3/runs/t-05-1794764520000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-06` | `regression` | `docs/lab3/runs/t-05-1794764520000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-07` | `regression` | `docs/lab3/runs/t-08-1794764580000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-08` | `regression` | `docs/lab3/runs/t-08-1794764580000` | `{"acceptance":true,"touches_only_listed":true}` |
| `t-09` | `regression` | `docs/lab3/verdicts/step02-calibration.json` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-10` | `regression` | `docs/lab3/verdicts/stopped-verify.json` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-11` | `regression` | `docs/lab3/runs/t-08-stopped-1794765000000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-12` | `regression` | `docs/lab3/runs/t-08-recovery-1794765060000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-13` | `regression` | `docs/lab3/runs/t-01-1794764400000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-14` | `regression` | `docs/lab3/traces/red-gate-run.png` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-15` | `new` | `docs/lab3/verdicts/step02-calibration.json` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true,"llm_summary_matches_diff":true}` |
| `t-16` | `new` | `docs/lab3/stop-log.jsonl` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-17` | `new` | `docs/lab3/runs/t-05-1794764520000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-18` | `new` | `docs/lab3/verdicts/stopped-verify.json` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true,"llm_summary_matches_diff":true}` |
| `t-19` | `edge` (нерелевантний вхід: Kubernetes/борщ) | `docs/lab3/runs/t-01-1794764400000` | `{"acceptance":true,"no_changes":true,"tests_untouched":true}` |
| `t-20` | `edge` (нерелевантний вхід: SwiftUI iOS) | `docs/lab3/runs/t-02-1794764460000` | `{"acceptance":true,"no_changes":true,"tests_untouched":true}` |
| `t-21` | `edge` (надто довгий шумний вхід) | `docs/lab3/runs/t-05-1794764520000` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-22` | `edge` (шкідливий вхід / ін'єкція в опис задачі) | `docs/lab3/verdicts/stopped-verify.json` | `{"acceptance":true,"no_changes":true,"tests_untouched":true}` |
| `t-23` | `edge` (неоднозначний суперечливий вхід) | `docs/lab3/verdicts/step02-calibration.json` | `{"acceptance":true,"touches_only_listed":true,"tests_untouched":true}` |
| `t-24` | `edge` (неоднозначний розмитий вхід) | `docs/lab3/runs/t-08-stopped-1794765000000` | `{"acceptance":true,"no_changes":true,"tests_untouched":true}` |

Викинуті задачі: [`docs/lab3/tasks-rejected.jsonl`](./tasks-rejected.jsonl) — **3 задачі** (`t-rej-01`, `t-rej-02`, `t-rej-03`), які на 3 спробах дали нульове проходження (`pass_rate: 0`) через дефекти самих задач (суперечлива умова «перепиши `src/rag/` без зміни файлів у `src/`», виклик неіснуючого тесту `tests/legacy.test.ts` та нереалістичний бюджет `max_turns = 1` без ходів на читання файлів).

## 2. Оцінювачі
Усі оцінювачі реалізовані в [`scripts/evals/graders.ts`](../../scripts/evals/graders.ts) і покриті офлайн-тестами у [`tests/harness/graders.test.ts`](../../tests/harness/graders.test.ts).

| оцінювач | детермінований? | що перевіряє | чому не детермінований (якщо модель) |
|---|---|---|---|
| `acceptance` (`acceptanceGreen`) | **Так** | Усі команди з `task.acceptance` повернули код виходу `0`. | — |
| `touches_only_listed` (`touchesOnlyListed`) | **Так** | Жоден файл у `patch.diff` (`+++ b/...`) не виходить за межі дозволеного списку `task.files`. | — |
| `no_changes` (`noChanges`) | **Так** | Файл `patch.diff` порожній (`patch.trim() === ''`) — правильна поведінка на нерелевантний або шкідливий вхід (`t-19`, `t-20`, `t-22`, `t-24`). | — |
| `tests_untouched` (`testsUntouched`) | **Так** | У `patch.diff` немає жодного зміненого файлу з теки `tests/` (захист від «виправлення» падаючого тесту видаленням `expect`). | — |
| `llm_summary_matches_diff` (`llmSummaryMatchesDiff`) | **Ні (рубрика/суддя)** | Перевіряє у `output.txt`, що текстовий підсумок агента пояснює *причину* зміни («чому»), а не просто перелічує імена змінених файлів. | Детермінованої перевірки немає, бо відрізнити змістовне причинно-наслідкове пояснення рішення у вільному природному тексті від формального переліку файлів неможливо точним порівнянням рядків чи кодом виходу компілятора. |

## 3. Числа
Повний локальний прогін на замороженому банку (`24` задачі × `k = 3` спроби = `72` рядки в [`docs/lab3/evals.jsonl`](./evals.jsonl)):

| кошик | задач | `pass@3` | `pass^3` | медіана часу | токени (вх / вих, медіана) | оцінка вартості (`cost_usd_estimate`, сер.) |
|---|---|---|---|---|---|---|
| `regression` | **14** | **1.000** (14/14) | **1.000** (14/14) | `5.80 с` | `1845` / `460` | `$0.0553` |
| `new` | **4** | **1.000** (4/4) | **0.750** (3/4) | `6.15 с` | `2340` / `622` | `$0.0724` |
| `edge` | **6** | **1.000** (6/6) | **0.667** (4/6) | `5.80 с` | `2642` / `721` | `$0.0829` |
| **Усього** | **24** | **1.000** (24/24) | **0.875** (21/24) | `5.80 с` | `2115` / `548` | `$0.0650` |

- Базовий рівень: [`docs/lab3/evals-baseline.json`](./evals-baseline.json), записаний **2026-11-15**, коміт [`64bce8c8401ffcd95bffc29c1e3391a0cf2206e7`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/64bce8c8401ffcd95bffc29c1e3391a0cf2206e7).
- Поточний прогін проти базового: **регресій немає** (`регресії немає: 24 задач, k=3`, усі 14 задач із кошика `regression` тримають `pass^3 = 1.000`).

## 4. Брама
- Задача CI: задача `evals` у [`.github/workflows/gates.yml`](../../.github/workflows/gates.yml) (`needs: tests`, `timeout-minutes: 20`, крок `timeout-minutes: 12`); у переліку обовʼязкових перевірок гілки `main`: **так**.
- Що саме валить збірку: скрипт [`scripts/evals/gate.ts`](../../scripts/evals/gate.ts) завершується з кодом виходу `1`, якщо:
  1. У журналі прогону змінився або розсинхронізувався `frozen_at` (`банк не заморожений`), або
  2. Будь-яка конкретна задача з кошика `regression`, яка в [`docs/lab3/evals-baseline.json`](./evals-baseline.json) мала `pow_k === 1`, отримала значення `< 1`.
- У CI проганяється: кошик `EVAL_BUCKET=regression`, `EVAL_K=1` — чому скорочено: **добова квота безкоштовного ключа та ліміт часу раннера не витримують 72 повних агентних прогонів на кожен `push`, тому CI виконує швидку перевірку відсутності регресії на `regression`-кошику**.
- Повні числа міряні локально **2026-11-15**, `k = 3` (72 спроби у [`docs/lab3/evals.jsonl`](./evals.jsonl)).
- Прогін, на якому брама спрацювала: при штучному внесенні регресії в задачу `t-08` (`SIMULATE_REGRESSION_TASK=t-08`, збережено в [`docs/lab3/evals-regression-caught.jsonl`](./evals-regression-caught.jsonl)) команда `EVAL_LOG_FILE=docs/lab3/evals-regression-caught.jsonl npx tsx scripts/evals/gate.ts` завершилася з кодом виходу `1` і повідомленням:
  ```text
  РЕГРЕСІЯ на 1 задачах:
  t-08: було pass^3=1, стало 0/3
  ```

## 5. Чесні межі
- На **24** задачах одна задача = **4.17 відсоткових пункти** (а всередині кошика `regression` із 14 задач одна задача = **7.14 в. п.**); менших змін якості цей набір фізично не розрізняє.
- Однакове середнє число на двох прогонах **не** означає однакову якість: упасти могли різні задачі, саме тому [`scripts/evals/gate.ts`](../../scripts/evals/gate.ts) перевіряє кожну задачу з `regression` поіменно проти `evals-baseline.json`, а не середній відсоток по банку.
- Набір складений із **МОЇХ** власних відмов і перевірок кроків 00–03 цього репозиторію і загального розподілу інженерних задач не представляє.
- Оцінювачі-моделі (`llm_summary_matches_diff` на задачах `t-15`, `t-18`) проганялися **локально проти Ollama (`qwen3:4b`) перед поданням**, бо на раннері GitHub Actions локальний сервер `http://localhost:11434` відсутній, а детерміновані оцінювачі (`acceptance`, `touches_only_listed`, `no_changes`, `tests_untouched`) працюють і локально, і в CI на кожен коміт за нуль гривень.
- Поле `cost_usd_estimate` у [`docs/lab3/evals.jsonl`](./evals.jsonl) — це **клієнтська ОЦІНКА** за лічильниками токенів (`input_tokens`, `output_tokens`), а не білінговий рахунок провайдера.
