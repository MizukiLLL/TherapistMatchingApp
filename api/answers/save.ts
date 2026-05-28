import { insertUserAnswers, readJsonBody, sendJson } from '../shared.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' } });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, {
      error: {
        code: 'INVALID_PAYLOAD',
        message: error instanceof Error ? error.message : 'Could not parse JSON body.',
      },
    });
    return;
  }

  const result = await insertUserAnswers(body);
  if (result.ok) {
    sendJson(response, 200, { ok: true });
    return;
  }

  const failureMessage = result.message ?? `Supabase responded with ${result.status}.`;
  console.warn(`[supabase] insert failed status=${result.status} message=${failureMessage}`);
  sendJson(response, result.status, {
    error: { code: 'SUPABASE_INSERT_FAILED', message: failureMessage },
  });
}
