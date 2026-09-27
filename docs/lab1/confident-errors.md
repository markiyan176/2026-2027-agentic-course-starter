# Впевнені помилки — Лабораторна 1

## Плани: задача /api/health

| Інструмент | Режим | Файли, які збирався чіпати | Чим збирався довести | Збігається з контрактом? |
|---|---|---|---|---|
| OpenCode | Plan (`agent: plan`) | `app/api/health/route.ts` | `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` | Так (`NextResponse.json`, `force-dynamic`, без зміни контракту) |
| Antigravity | Plan | `app/api/health/route.ts` | `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` | Так (`Response.json`, `force-dynamic`, контракт `src/health.ts` незмінний) |

## Помилки

| # | Інструмент | Режим | Що запропоновано / заявлено | Що насправді (executed) | Чому це помилка | Як спіймали | Рядок журналу |
|---|---|---|---|---|---|---|---|
| 1 | Antigravity / Claude Code | default / shell | Виклик утиліти `jq` або inline-скриптів bash безпосередньо в командному рядку Windows PowerShell | Помилка виконання: `The term 'jq' is not recognized` або синтаксична помилка парсингу пайпів | У Windows PowerShell за замовчуванням відсутня утиліта `jq`. Hooks мають викликати кросплатформний Node.js-скрипт (`scripts/agent-log-hook.mjs`), що працює нативно на всіх ОС | Тестовий запуск hook / аналіз середовища (`npm run doctor`) | [antigravity.jsonl#L1](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/0c7c2d8ba93ed488debe65598bdd2f0097306633/.agent-log/antigravity.jsonl#L1) · 2026-09-27T16:11:14.000Z · run_command |
| 2 | OpenCode / npm | shell | Виклик команд `npm` та `npx` напряму через PowerShell без розширення `npm.cmd` / `npx.cmd` | PowerShell блокує запуск через політику безпеки: `npm.ps1 cannot be loaded because running scripts is disabled on this system` | На машинах Windows стандартна політика виконання забороняє необмежений запуск ps1-скриптів. Агент має використовувати бінарні обгортки `npm.cmd` або `npx.cmd` | Помилка у консолі виконання тестів / білду | [opencode.jsonl#L2](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/8aa5732/.agent-log/opencode.jsonl#L2) · 2026-09-27T16:12:32.000Z · bash |
| 3 | Antigravity / Next.js Agent | default | Генерація обробника маршруту `app/api/health/route.ts` без явної директиви `export const dynamic = 'force-dynamic'` | Next.js під час збірки (`next build`) статично пререндерить маршрут як `○ /api/health (Static)` | При статичному пререндерингу значення `timestamp` заморожується на моменті збірки замість повернення актуального часу при кожному HTTP-запиті | `npm run build` (перевірка легенди маршрутів у консолі: очікується `ƒ Dynamic`) | [antigravity.jsonl#L15](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/0c7c2d8ba93ed488debe65598bdd2f0097306633/.agent-log/antigravity.jsonl#L15) · 2026-09-27T16:41:39.000Z · run_command |
| 4 | OpenCode | Plan | Припущення, що режим Plan може записувати файли планів у `.opencode/plans/*.md` при активній політиці `"edit": "deny"` | Планувальник OpenCode не може створити файл плану на диску, коли діє заборона запису | Політика `"edit": "deny"` має найвищий пріоритет. У чистому режимі планування план слід передавати в інтерфейс розмови, а не зберігати у файли репозиторію | Перевірка журналу планувальної сесії (`git status --short` має бути чистим) | [opencode.jsonl#L3](https://github.com/markiyan176/2026-2027-agentic-course-starter/blob/8aa5732/.agent-log/opencode.jsonl#L3) · 2026-09-27T16:42:40.000Z · read |
