# Субагенти — розподіл роботи за специфікацією

Інструмент і версія: Google Antigravity (`invoke_subagent` / Claude Code `.claude/agents/`) + OpenCode (`.opencode/agents/`) · Дата: 2026-11-01

## Розподіл
| Субагент | Пункти специфікації | Інструменти | Модель | Файл конфігурації |
|---|---|---|---|---|
| `spec-auditor` | Критерії приймання `A1–A8` із розділу 6 `docs/lab2/spec.md` | `Read, Grep, Glob` (тільки читання; `edit: deny, bash: deny`) | `inherit` | [`.claude/agents/spec-auditor.md`](../../.claude/agents/spec-auditor.md), [`.opencode/agents/spec-auditor.md`](../../.opencode/agents/spec-auditor.md) |
| `explorer` | Обсяг роботи v1 (розділ 5 `spec.md`), інвентаризація точок входу в `src/`, `scripts/`, `tests/` | `Read, Grep, Glob` (тільки читання; `edit: deny, bash: deny`) | `inherit` | [`.claude/agents/explorer.md`](../../.claude/agents/explorer.md), [`.opencode/agents/explorer.md`](../../.opencode/agents/explorer.md) |

## Що субагент бачить
- Власний системний промпт (тіло файлу `.claude/agents/<name>.md` або `.opencode/agents/<name>.md`).
- Конкретне текстове формулювання задачі, передане під час виклику (`prompt`).
- Правила проєкту `AGENTS.md` / `CLAUDE.md` та поточний стан файлової системи репозиторію через дозволені інструменти читання (`Read`, `Grep`, `Glob`).

## Чого субагент НЕ бачив (доказ ізоляції)
- **Питання**: «Який файл ми щойно правили в основній розмові? І склади коротку карту точок входу в `src/` та `scripts/` (до 20 рядків).»
- **Відповідь субагента `explorer` дослівно**:
  > «Я працюю в ізольованому контекстному вікні субагента і не маю доступу до історії вашої основної розмови чи попередніх повідомлень чату, тому не можу знати, який саме файл ви щойно редагували. Нижче наведено карту наявних точок входу за результатами обходу файлової системи (`Glob` / `Read`):
  > 1. `src/env.ts` (рядки 1–35) — перевірка змінних середовища.
  > 2. `src/models.ts` (рядки 1–120) — реєстр моделей, цін та ролей.
  > 3. `src/cost.ts` (рядки 10–110) — облік `Usage`, `addUsage`, `priceUsd`.
  > 4. `src/agent/agent-loop.ts` (рядки 1–145) — власний агентний цикл.
  > 5. `src/agent/adapters.ts` (рядки 76–162) — адаптери `messagesModel` та `chatCompletionsModel`.
  > 6. `scripts/validate-golden.ts` (рядки 28–96) — валідатор `validateGolden` для `queries.jsonl`.
  > 7. `scripts/baseline.ts` (рядки 47–96) — зняття базової лінії без пошуку.»
- **Висновок**: історії батьківської розмови та пам'яті сесії в контексті субагента немає — він бачить лише переданий `prompt` і файли на диску. Крім того, порівняно з вбудованим субагентом `Explore`, наш `.claude/agents/explorer.md` додає суворе обмеження довжини звіту (`≤ 20 рядків`) та явну вимогу фіксувати межі ізоляції контексту.

## Звіт `spec-auditor` по diff коміту [`b5d95df`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/b5d95df) (Крок 01)

Субагенту `spec-auditor` передано diff заморозки еталонного набору (`git show b5d95df -- docs/lab2/golden/queries.jsonl scripts/validate-golden.ts tests/validate-golden.test.ts`). Дослівний звіт субагента:

```text
A1 | pass — модульні тести валідатора додано в tests/validate-golden.test.ts:16-48 (7/7 тестів проходять офлайн без мережі).
A2 | pass — docs/lab2/golden/queries.jsonl:1-20 містить рівно 20 запитів (10 easy, 5 hard, 3 unanswerable у рядках 16-18, 2 injection у рядках 19-20) і проходить scripts/validate-golden.ts:28-88.
A3 | unknown — у наданому diff коміту b5d95df відсутні файли src/verify/schema.ts, scripts/verify.ts та tests/verify.test.ts (реалізуються на кроці 03).
A4 | unknown — у наданому diff відсутні src/rag/chunk.ts та індекс data/index.json (реалізуються на кроці 04).
A5 | unknown — у наданому diff відсутні модулі гібридного пошуку src/rag/bm25.ts, src/rag/rrf.ts та src/rag/cite.ts (реалізуються на кроці 05).
A6 | unknown — у наданому diff відсутній фінальний звіт порівняння docs/lab2/eval-report.md (реалізується на кроці 06).
A7 | unknown — у наданому diff відсутній пул паралельного оцінювання scripts/parallel-eval.ts (реалізується на кроці 07).
A8 | unknown — у наданому diff відсутні docs/lab2/mcp-spec.md та src/mcp/server.ts (реалізуються на кроці 08).

Підсумок критеріїв зі станом fail та unknown:
- fail: немає (0)
- unknown: A3, A4, A5, A6, A7, A8 (оскільки diff b5d95df охоплює лише артефакти кроку 01).
```

## Делегування в журналі
- Записи виклику субагентів `explorer` та `spec-auditor` у журналі основної платформи: [`.agent-log/antigravity.jsonl` (рядки 52–53)](../../.agent-log/antigravity.jsonl#L52-L53)
- Записи виклику у форматі другого інструменту (OpenCode): [`.agent-log/opencode.jsonl` (рядки 18–19)](../../.agent-log/opencode.jsonl#L18-L19)

## Як зводяться результати та граф залежностей (доповнюється на кроці 07)
- Обидва субагенти (`explorer` та `spec-auditor`) працюють виключно в режимі **читання** (`Read, Grep, Glob`) і не можуть створювати стан гонитви у файловій системі.
- Рішення за звітами приймає головний агент кодування під контролем людини: спершу `explorer` повертає карту точок входу (до 20 рядків), далі виконується **однопотоковий запис** коду в основній сесії, після чого `spec-auditor` перевіряє утворений diff проти критеріїв `A1..A8`.
- Повний граф залежностей паралельних гілок та бюджет токенів при оцінюванні `20` запитів еталонного набору наведено у документі [`docs/lab2/budget.md`](./budget.md) (крок 07).
