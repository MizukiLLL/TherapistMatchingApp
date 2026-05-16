import { sendJson } from '../../shared';

export default function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' } });
    return;
  }

  sendJson(response, 404, {
    error: {
      code: 'ONBOARDING_STATE_NOT_FOUND',
      message: `No persisted onboarding state exists for ${request.query?.id ?? 'this user'} in this serverless prototype.`,
    },
  });
}
