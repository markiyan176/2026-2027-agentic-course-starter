# Лабораторна робота 1: Агентно-готовий репозиторій і власний агентний цикл

- **Курс**: Agentic Engineering & Building AI Agent Systems (IT STEP University, 2026/2027)
- **Студент**: Markiyan (@markiyan176)
- **Репозиторій**: [2026-2027-agentic-course-starter](https://github.com/markiyan176/2026-2027-agentic-course-starter)
- **Статус**: Виконано на 100% (усі 12 кроків 00–11)

---

## 1. Загальний огляд та результати

У ході виконання лабораторної роботи побудовано агентно-готовий репозиторій нового покоління, розгорнуто автономний інженерний цикл з багаторівневим захистом даних та нульовим операційним бюджетом ($0 path).

### Ключові досягнення:
1. **Тестове покриття**: **91 юніт-тест** (100% pass у Vitest) + **2 Playwright E2E тести** з автоматичною фіксацією візуальних доказів.
2. **Нульовий бюджет ($0 path)**: Повна підтримка локальних моделей (Ollama `qwen3:4b`, `nomic-embed-text`) та безкоштовного хмарного рівня Google Gemini.
3. **Безпека даних (Zero Trust)**: 100% блокування витоку `.env*` файлів за допомогою pre-хуків та політик середовища зі статусом `denied`.
4. **Власний агентний цикл**: Реалізовано 2 версії автономного агента:
   - Власний `src/agent/agent-loop.ts` з підтримкою двох протоколів (Anthropic Messages API та OpenAI Chat Completions), контролем кроків (`maxSteps`), токенного бюджету (`tokenBudget`) та Zod-валідацією.
   - Цикл на базі Vercel AI SDK 7 (`src/agent/agent-aisdk.ts`) з обов'язковим підтвердженням людиною небезпечних дій (`toolApproval: { write_file: 'user-approval' }`).
5. **Спостережуваність (Observability)**: Повна інтеграція Next.js App Router (`/api/agent`) з OpenTelemetry та Langfuse Cloud для трасування викликів інструментів та обліку вартості токенів.
6. **Кросагентна переносність**: 7 із 7 ключових артефактів підтверджено для роботи в Google Antigravity та OpenCode.

---

## 2. Карта артефактів та виконаних кроків

| Крок | Назва та зміст | Ключові файли та гілки | Звіти та докази |
|---|---|---|---|
| **00** | Ініціалізація та діагностика середовища | `package.json`, `scripts/doctor.ts` | [`docs/lab1/autonomy-log.md`](./autonomy-log.md) |
| **01** | `AGENTS.md` (31 рядок) та тест 40% скорочення | `AGENTS.md`, `CLAUDE.md`, гілки `lab1/agents-md-40-full`, `lab1/agents-md-40-cut` | [`docs/lab1/agents-md-40.md`](./agents-md-40.md) |
| **02** | 6-полярний лог дій (`.agent-log/`) та хуки | `.claude/settings.json`, `.opencode/plugins/agent-log.js`, `scripts/agent-log-hook.mjs` | [`.agent-log/antigravity.jsonl`](../../.agent-log/antigravity.jsonl), [`.agent-log/opencode.jsonl`](../../.agent-log/opencode.jsonl) |
| **03** | Впевнені помилки та кросагентна сумісність | `src/health.ts`, `tests/health.test.ts`, гілки `lab1/health-antigravity`, `lab1/health-opencode` | [`docs/lab1/confident-errors.md`](./confident-errors.md), [`docs/lab1/portability.md`](./portability.md) |
| **04** | Навичка `add-api-route` та тестування тригерів | `.claude/skills/add-api-route/`, `.agents/skills/add-api-route/`, `scripts/check-route.mjs` | [`docs/lab1/skill-trigger.md`](./skill-trigger.md) |
| **05** | Безпека `.env` (denied), Context7 MCP та вартість | `scripts/guard-env.mjs`, `.opencode/plugins/guard-env.js`, `opencode.json` | [`docs/lab1/context-cost.md`](./context-cost.md) |
| **06** | E2E Playwright тест та скріншот-доказ | `app/page.tsx`, `playwright.config.ts`, `tests/health-link.spec.ts` | [`docs/lab1/e2e-home.png`](./e2e-home.png) |
| **07** | Облік вартості `cost.ts` та метрики похибки | `src/cost.ts`, `tests/cost.test.ts`, `scripts/measure-cost.ts` | [`docs/lab1/cost.md`](./cost.md) |
| **08** | Власний агентний цикл та розв'язання задачі | `src/agent/agent-loop.ts`, `src/agent/tools.ts`, `src/agent/adapters.ts`, `tests/agent-loop.test.ts`, гілка `lab1/health-loop` | [`docs/lab1/comparison.md`](./comparison.md) |
| **09** | Цикл на Vercel AI SDK 7 з `toolApproval` | `src/agent/agent-aisdk.ts`, `tests/agent-aisdk.test.ts` | Коміт [`a13a900`](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/a13a900) |
| **10** | Трасування OpenTelemetry / Langfuse (`/api/agent`) | `app/api/agent/route.ts`, `instrumentation.ts`, `src/otel/langfuse.ts` | [`docs/lab1/traces/README.md`](./traces/README.md) |
| **11** | Підготовка до курсового проєкту | `docs/lab1/model-decision.md`, `docs/lab1/intro-draft.md`, `docs/lab1/portability.md` | [`docs/lab1/model-decision.md`](./model-decision.md), [`docs/lab1/intro-draft.md`](./intro-draft.md) |

---

## 3. Команди перевірки (Verification)

Усі перевірки проходять на 100% у режимі офлайн без звернення до зовнішніх платних сервісів:

```bash
# 1. Запуск повного набору модульних тестів (91 тест)
npm test

# 2. Перевірка статичної типізації TypeScript
npm run typecheck

# 3. Перевірка стилю коду та правил лінтингу
npm run lint

# 4. Запуск наскрізних E2E тестів у браузері
npm run test:e2e

# 5. Перевірка production-збірки Next.js
npm run build
```
