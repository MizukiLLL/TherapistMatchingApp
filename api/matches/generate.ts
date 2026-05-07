import { generateMatches, normalize, readJsonBody, sendJson } from '../shared.ts';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' } });
    return;
  }

  const body = await readJsonBody(request);
  const data = generateMatches(body);
  sendJson(response, 200, {
    data,
    meta: {
      userId: normalize(body.userId) || 'anonymous',
      total: data.length,
      generatedAt: new Date().toISOString(),
      productionFallback: true,
    },
  });
}
