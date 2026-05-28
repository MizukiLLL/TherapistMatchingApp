export type SupabaseInsertResult = {
  ok: boolean;
  status: number;
  message?: string;
};

function buildStyleFitSummary(record: Record<string, any>): string {
  const styles = Array.isArray(record.cnipConversationStyles) ? record.cnipConversationStyles : [];
  const vector = record.userStyleVector ?? null;
  const picked = styles.length ? `Picked styles: ${styles.join(', ')}` : 'Picked styles: none';
  const vectorLine = vector
    ? `Vector — directive: ${vector.therapist_directive}, emotional: ${vector.emotionally_intensive}, past-focused: ${vector.past_focused}, support-focused: ${vector.support_focused}`
    : 'Vector: not scored';
  return `${picked} | ${vectorLine}`;
}

function combineConcerns(record: Record<string, any>): string[] {
  const grouped = (record.lifeAspectsByCategory ?? {}) as Record<string, unknown>;
  return [
    ...((grouped.symptomsAndDiagnoses as unknown[]) ?? []),
    ...((grouped.lifeStagesAndTransitions as unknown[]) ?? []),
    ...((grouped.physicalHealthRelatedIssues as unknown[]) ?? []),
    ...((grouped.selfIdentityAndSocialRelationships as unknown[]) ?? []),
  ].map(String);
}

export function buildUserAnswersRow(record: Record<string, any>): Record<string, unknown> {
  const logistics = (record.logistics ?? {}) as Record<string, unknown>;
  const emailRaw = typeof record.email === 'string' ? record.email.trim() : '';
  return {
    user_id: record.userId ?? null,
    email: emailRaw ? emailRaw : null,
    zip_code: record.areaCode ?? null,
    preferred_language: record.preferredLanguage ?? null,
    therapy_for: record.therapyFor ?? null,
    care_preference: record.carePreference ?? null,
    payment_preference: logistics.paymentPreference ?? null,
    availability: logistics.availability ?? null,
    insurance_provider: record.insuranceProvider ?? null,
    insurance_plan: record.insurancePlan ?? null,
    budget_range: logistics.budgetRange ?? null,
    language_priority: logistics.languagePriority ?? null,
    required_languages: logistics.requiredLanguages ?? null,
    preferred_languages: logistics.preferredLanguages ?? null,
    cultural_context_needs: logistics.culturalContextNeeds ?? null,
    culture_priority: logistics.culturePriority ?? null,
    modality_preference_ids: record.modalityPreferenceIds ?? null,
    concerns: combineConcerns(record),
    life_aspects_by_category: record.lifeAspectsByCategory ?? null,
    life_aspect_notes_by_category: record.lifeAspectNotesByCategory ?? null,
    life_aspect_skipped_by_category: record.lifeAspectSkippedByCategory ?? null,
    cnip_conversation_styles: record.cnipConversationStyles ?? null,
    cnip_preference_profile: record.cnipPreferenceProfile ?? null,
    style_scenario_responses: record.styleScenarioResponses ?? null,
    user_style_vector: record.userStyleVector ?? null,
    style_fit_summary: buildStyleFitSummary(record),
    raw_payload: record,
  };
}

export async function insertUserAnswers(record: Record<string, any>): Promise<SupabaseInsertResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      ok: false,
      status: 500,
      message: 'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  const row = buildUserAnswersRow(record);

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/user_answers`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, status: response.status, message: text || `Supabase responded with ${response.status}.` };
    }

    return { ok: true, status: response.status, message: undefined };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: error instanceof Error ? error.message : 'Supabase request failed.',
    };
  }
}
