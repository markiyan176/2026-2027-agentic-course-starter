# Журнал автономності — Лабораторна 1

Сесія — одна цілісна робота з агентом над однією задачею: від запуску до коміту або відмови.

## Сесії

| Дата | Інструмент і модель | Режим дозволів | Рівень довіри (L0–L5) | Задача | Що запропонував / що виконав | Де і чому я втрутився | Які докази прийняв | Журнал / коміт |
|---|---|---|---|---|---|---|---|---|
| 2026-09-27 | OpenCode 1.18.32, Zen / Ollama | default | L0 | Перший запуск: «Які команди перевірки є в цьому репозиторії?» | Перелічив команди test, lint, typecheck, build; змін у файли не вносив | Втручання не знадобилося, режим лише для читання | Звірив перелік команд із package.json та scripts/doctor.ts | hooks ще немає (крок 02) |
| 2026-09-27 | Antigravity CLI / AGY, Gemini 3.7 Flash | default (plan/L0) | L0 | Ініціалізація та валідація середовища: крок 00 | Виконав клонування, npm install, doctor, test, build | Перевірив вивід doctor і статус 57 пройдених тестів | Зелений вивід npm test і коректна Next.js збірка | [e6e0bf5](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/e6e0bf5) |
| 2026-09-27 | Antigravity CLI / AGY, Gemini 3.7 Flash | default (L1) | L1 | Крок 01: Написання AGENTS.md та тест «видали 40%» | Склав лаконічний AGENTS.md (31 рядок), провів тест на задачі formatDuration у двох гілках | Підтвердив збереження правил перевірок та меж | Прогони у гілках lab1/agents-md-40-full та lab1/agents-md-40-cut, звіт agents-md-40.md | [989caa1](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/989caa1) |
| 2026-09-27 | Antigravity / OpenCode | default (L1) | L1 | Крок 02: Журнал дій агента (.agent-log/) та hooks | Створив кросплатформний хук scripts/agent-log-hook.mjs, плагін .opencode/plugins/agent-log.js, налаштував .claude/settings.json | Перевірив відсутність витоку секретів у input (лише filePath/command) | Валідація 6 полів через node-скрипт (OK для обох jsonl) | [6f4c110](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/6f4c110) |
| 2026-09-27 | Antigravity CLI, Gemini 3.7 Flash | plan → edit (L0 → L2) | L2 | Крок 03: Реалізація GET /api/health у гілці lab1/health-antigravity | Склав план без редагування файлів, після схвалення реалізував app/api/health/route.ts з Response.json та force-dynamic | Заборонив модифікувати контракт і тести; вимагав ƒ Dynamic у білді | 60 пройдених тестів, зелений typecheck, ƒ Dynamic у npm run build | [e99ddc5](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/e99ddc5) |
| 2026-09-27 | OpenCode 1.18.32, Zen / Ollama | plan → build (L0 → L2) | L2 | Крок 03: Реалізація GET /api/health у гілці lab1/health-opencode | Сформував план читанням схеми й тесту, реалізував через NextResponse.json з force-dynamic | Перевірив чистоту git status під час фази планування | Усі тести green, успішний білд Next.js, журнал opencode.jsonl | [8aa5732](https://github.com/markiyan176/2026-2027-agentic-course-starter/commit/8aa5732) |

## Мова артефактів

- Документація та журнал автономності ведуться українською мовою.
- Код, назви функцій, тестів, комітів і технічних ідентифікаторів — англійською / стандартом репозиторію.

## Інциденти

- Жодних інцидентів витоку секретів чи несанкціонованих дій агента не зафіксовано.
