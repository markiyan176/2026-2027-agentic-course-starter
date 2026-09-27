# Вартість викликів — Лабораторна 1

Ollama: `ollama 0.34.0` (або `qwen3:4b`) · дата вимірів: 2026-09-27

## 1. Звірка оцінки вхідних токенів (хмарна модель, критерій ≤ 10%)

| прогін | провайдер | модель | вхідні | кешовані | вихідні | оцінка входу до виклику | похибка % | $ фактично | $ за прайсом models.ts | затримка, мс | дата |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gemini-1 | google | gemini-3.8-flash | 5240 | 0 | 45 | 5180 | 1.1 | 0.000000 | 0.004268 | 1420 | 2026-09-27 |

Команда: `npx tsx --env-file=.env.local scripts/measure-cost.ts gemini`
Чим оцінено до виклику: Gemini countTokens (REST, generateContentRequest) · факт: usageMetadata.promptTokenCount
Вердикт: похибка 1.1% — у межах 10% (критерій кроку 07 виконано).

## 2. Кешування

Префікс: scripts/doctor.ts + scripts/sync-skills.ts + src/models.ts (для Ollama — перші 6000 символів).

| прогін | провайдер | модель | вхідні | кешовані | вихідні | оцінка входу до виклику | похибка % | $ фактично | $ за прайсом models.ts | затримка, мс | дата |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ollama-1 | ollama | qwen3:4b | 4024 | 0 | 14 | — | — | 0.000000 | 0.000000 | 2840 | 2026-09-27 |
| ollama-2 | ollama | qwen3:4b | 4024 | 4000 | 12 | — | — | 0.000000 | 0.000000 | 680 | 2026-09-27 |

Назва поля кешу: `cache_read_input_tokens` (Messages-форма `/v1/messages`) · сирий usage другого виклику: `{"input_tokens":24,"cache_read_input_tokens":4000,"output_tokens":12}`
Для Ollama: це повторне використання префікса моделі, а не знижка в рахунку.

## 3. Множник «українська / англійська»

| Провайдер | Модель | Текст (про що, скільки слів) | Токени en | Токени ua | ua / en |
|---|---|---|---|---|---|
| google | gemini-3.8-flash | Правила репозиторію та інструкції агента (120 слів) | 142 | 224 | 1.58 |
| ollama | qwen3:4b | Правила репозиторію та інструкції агента (120 слів) | 156 | 268 | 1.72 |

Команда: `npx tsx --env-file=.env.local scripts/measure-cost.ts lang docs/lab1/cost.md`
Тексти, на яких виміряно множник (скрипт читає саме ці два блоки):

```ua
Цей репозиторій є базовим шаблоном для курсу «Агентна інженерія та побудова систем з ШІ-агентами».
Головне правило: усі зміни мають бути підтверджені автоматичними тестами перед злиттям у гілку main.
Агент повинен спочатку прочитати контракт у схемах Zod, сформувати план дій, отримати підтвердження і лише потім вносити зміни.
Заборонено редагувати файли конфігурації оточення та приватні ключі доступу.
```

```en
This repository serves as the starter template for the Agentic Engineering course.
The main rule is that all changes must be verified with automated test suites before being merged into the main branch.
The agent must first inspect the contract in Zod schemas, prepare an execution plan, obtain user approval, and only then apply modifications.
Editing environment configuration files and private access secrets is strictly prohibited.
```

## 4. Три прогони (крок 11)

| прогін | провайдер | модель | вхідні | кешовані | вихідні | оцінка входу до виклику | похибка % | $ фактично | $ за прайсом models.ts | затримка, мс | дата |
|---|---|---|---|---|---|---|---|---|---|---|---|
| хмара | google | gemini-3.8-flash | 5240 | 0 | 45 | 5180 | 1.1 | 0.000000 | 0.004268 | 1420 | 2026-09-27 |
| шлюз | openrouter | meta-llama/llama-3.3-70b-instruct:free | 4890 | 0 | 52 | — | — | 0.000000 | 0.000000 | 2150 | 2026-09-27 |
| локально | ollama | qwen3:4b | 4024 | 4000 | 12 | — | — | 0.000000 | 0.000000 | 680 | 2026-09-27 |
