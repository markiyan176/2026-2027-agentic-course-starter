# Траси Langfuse — Лабораторна 1 (Крок 10)

Траси виконання `lab01-agent` на базі Next.js App Router (`app/api/agent/route.ts`), OpenTelemetry (`instrumentation.ts`, `src/otel/langfuse.ts`) та Vercel AI SDK 7.

## Траси викликів:
1. `trace-1.png` — Траса запиту «Котра зараз година?», виклик інструмента `getTime`, облік токенів та оцінка вартості.
2. `trace-2.png` — Траса запиту «Скільки хвилин лишилось до півночі?», виклик моделі та інструмента `getTime`.
3. `trace-3.png` — Траса запиту «Привітайся одним реченням», пряма текстова відповідь моделі.

## Конфігурація:
- Провайдер: Google Gemini API / `gemini-3.8-flash`
- Telemetry functionId: `lab01-agent`
- Платформа: Vercel Hobby + Langfuse Cloud Hobby
