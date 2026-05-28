import { pushPreferencesToJotform, readJsonBody, sendJson } from './shared.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' } });
    return;
  }

  const body = await readJsonBody(request);
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : 'anonymous';

  await pushPreferencesToJotform({ ...body, userId });

  sendJson(response, 200, {
    data: {
      ...body,
      userId,
      updatedAt: new Date().toISOString(),
    },
  });
}
