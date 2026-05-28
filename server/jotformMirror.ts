import type { UserPreferenceRecord } from './backendStore.ts';

function buildConcernsSummary(record: UserPreferenceRecord): string {
  const grouped = record.lifeAspectsByCategory;
  if (!grouped) return '';
  return [
    ...(grouped.symptomsAndDiagnoses ?? []),
    ...(grouped.lifeStagesAndTransitions ?? []),
    ...(grouped.physicalHealthRelatedIssues ?? []),
    ...(grouped.selfIdentityAndSocialRelationships ?? []),
  ].join(', ');
}

function buildCnipStyleSummary(record: UserPreferenceRecord): string {
  const picked = record.cnipConversationStyles?.length
    ? `Picked styles: ${record.cnipConversationStyles.join(', ')}`
    : 'Picked styles: none';
  const vector = record.userStyleVector;
  const vectorLine = vector
    ? `Vector — directive: ${vector.therapist_directive}, emotional: ${vector.emotionally_intensive}, past-focused: ${vector.past_focused}, support-focused: ${vector.support_focused}`
    : 'Vector: not scored';
  return `${picked} | ${vectorLine}`;
}

export async function pushToJotform(record: UserPreferenceRecord): Promise<void> {
  const apiKey = process.env.JOTFORM_API_KEY;
  const formId = process.env.JOTFORM_FORM_ID;
  const fieldMapJson = process.env.JOTFORM_FIELD_MAP;
  if (!apiKey || !formId || !fieldMapJson) return;

  let fieldMap: Record<string, number | string>;
  try {
    fieldMap = JSON.parse(fieldMapJson);
  } catch (error) {
    console.warn('[jotform-mirror] JOTFORM_FIELD_MAP is not valid JSON; skipping push.', error);
    return;
  }

  const body = new URLSearchParams();
  const set = (key: string, value: string) => {
    const id = fieldMap[key];
    if (id === undefined || id === null || id === '') return;
    body.set(`submission[${id}]`, value);
  };

  set('email', record.email ?? '');
  set('areaCode', record.areaCode ?? '');
  set('preferredLanguage', record.preferredLanguage ?? '');
  set('therapyFor', record.therapyFor ?? '');
  set('carePreference', record.carePreference ?? '');
  set('paymentPreference', record.logistics?.paymentPreference ?? '');
  set('availability', record.logistics?.availability ?? '');
  set('concernsSummary', buildConcernsSummary(record));
  set('cnipStyle', buildCnipStyleSummary(record));
  set('submissionJson', JSON.stringify(record));

  try {
    const response = await fetch(
      `https://api.jotform.com/form/${formId}/submissions?apiKey=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(`[jotform-mirror] HTTP ${response.status}: ${text}`);
    }
  } catch (error) {
    console.warn('[jotform-mirror] request failed:', error);
  }
}
