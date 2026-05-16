import { normalize, readJsonBody, sendJson } from './shared.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' } });
    return;
  }

  const body = await readJsonBody(request);
  const id = normalize(body.id) || `user-${Date.now()}`;
  sendJson(response, 200, {
    data: {
      id,
      preferredLanguage: normalize(body.preferredLanguage) || undefined,
      areaCode: normalize(body.areaCode) || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}
