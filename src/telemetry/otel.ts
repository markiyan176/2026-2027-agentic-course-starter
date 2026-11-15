/**
 * Експорт трас у Langfuse / Jaeger через OTLP/HTTP (крок 06).
 * Звірені експортовані символи з node_modules:
 * - ai: registerTelemetry
 * - @ai-sdk/otel: OpenTelemetry (і LegacyOpenTelemetry — для нового коду не беремо)
 * - @opentelemetry/sdk-node: NodeSDK, startNodeSDK
 * - @opentelemetry/exporter-trace-otlp-http: OTLPTraceExporter
 */
import { registerTelemetry } from 'ai';
import { OpenTelemetry } from '@ai-sdk/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let initialized = false;

export const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
});

/** Реєструє OTLP/HTTP експортер та інтеграцію OpenTelemetry (gen_ai.*) рівно один раз. */
export function startHarnessTelemetry(): void {
  if (initialized) return;
  initialized = true;
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    sdk.start();
  }
  registerTelemetry(new OpenTelemetry());
}

/** Налаштування телеметрії для виклику моделі: вміст вимкнений, бо репозиторій публічний. */
export const defaultTelemetrySettings = {
  functionId: 'harness-run-task',
  recordInputs: false,
  recordOutputs: false,
} as const;
