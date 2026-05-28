import { sendJson } from '../shared.js';

export default async function handler(_request: any, response: any) {
  const apiKey = process.env.JOTFORM_API_KEY ?? '';
  const formId = process.env.JOTFORM_FORM_ID ?? '';
  const fieldMapRaw = process.env.JOTFORM_FIELD_MAP ?? '';

  let fieldMapKeys: string[] = [];
  let fieldMapValid = false;
  if (fieldMapRaw) {
    try {
      const parsed = JSON.parse(fieldMapRaw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        fieldMapKeys = Object.keys(parsed);
        fieldMapValid = true;
      }
    } catch {
      fieldMapValid = false;
    }
  }

  sendJson(response, 200, {
    hasApiKey: apiKey.length > 0,
    hasFormId: formId.length > 0,
    hasFieldMap: fieldMapRaw.length > 0,
    fieldMapValid,
    fieldMapKeys,
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
