# AGENTS.md — Інструкції для ШІ-агентів

Навчальний Next.js репозиторій курсу «Агентна інженерія та побудова систем з ШІ-агентами».

## Стек

- Node.js >= 22 (v24), Next.js 16 (App Router), TypeScript (strict), Vitest.
- Менеджер пакетів: `npm`.

## Домовленості

- Моделі обираються ролями з `src/models.ts` (`MODELS.cheap`, `MODELS.flagship`), а не рядками.
- Ціни та параметри моделей звіряються за документацією вендорів, а не з пам'яті.
- Формат комітів: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
