import type { HealthResponse } from '../../../src/health';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const data: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  return Response.json(data);
}
