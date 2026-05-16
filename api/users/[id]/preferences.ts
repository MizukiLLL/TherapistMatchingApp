import { readJsonBody, sendJson } from '../../shared';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' } });
    return;
  }

  const body = await readJsonBody(request);
  sendJson(response, 200, {
    data: {
      ...body,
      userId: request.query?.id ?? 'anonymous',
      updatedAt: new Date().toISOString(),
    },
  });
}
