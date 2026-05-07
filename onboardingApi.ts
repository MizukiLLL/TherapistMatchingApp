import { OnboardingFormData, SavedOnboardingState } from './onboardingTypes';

const STORAGE_KEY = 'therapist-matcher-onboarding';

function readSavedState(): SavedOnboardingState | null {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SavedOnboardingState;
  } catch {
    return null;
  }
}

function writeSavedState(payload: SavedOnboardingState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadOnboardingState(): Promise<SavedOnboardingState | null> {
  const saved = readSavedState();
  return saved;
}

export async function saveOnboardingState(data: OnboardingFormData): Promise<SavedOnboardingState> {
  const existing = readSavedState();
  const userId = existing?.userId ?? crypto.randomUUID();
  const lifeAspectsByCategory = data.lifeAspectsByCategory ?? {
    symptomsAndDiagnoses: [],
    lifeStagesAndTransitions: [],
    physicalHealthRelatedIssues: [],
    selfIdentityAndSocialRelationships: [],
  };
  const lifeAspects = [
    ...lifeAspectsByCategory.symptomsAndDiagnoses,
    ...lifeAspectsByCategory.lifeStagesAndTransitions,
    ...lifeAspectsByCategory.physicalHealthRelatedIssues,
    ...lifeAspectsByCategory.selfIdentityAndSocialRelationships,
  ];

  const payload: SavedOnboardingState = {
    userId,
    data,
    updatedAt: new Date().toISOString(),
  };

  try {
    const userResponse = await fetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, preferredLanguage: data.preferredLanguage, areaCode: data.areaCode }),
    });

    if (!userResponse.ok) {
      throw new Error('Failed to save user');
    }

    const preferencesResponse = await fetch(`/users/${userId}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        areaCode: data.areaCode,
        preferredLanguage: data.preferredLanguage,
        therapyFor: data.therapyFor,
        carePreference: data.carePreference,
        lifeAspectsByCategory,
        lifeAspectNotesByCategory: data.lifeAspectNotesByCategory,
        lifeAspectSkippedByCategory: data.lifeAspectSkippedByCategory,
        lifeAspects,
        therapyTypes: lifeAspects,
        insuranceProvider: data.insuranceProvider,
        insurancePlan: data.insurancePlan,
        cnipConversationStyles: data.cnipConversationStyles,
        cnipPreferenceProfile: data.cnipPreferenceProfile,
      }),
    });

    if (!preferencesResponse.ok) {
      throw new Error('Failed to save preferences');
    }
  } catch {
    // Keep local persistence so onboarding remains usable before backend is ready.
  }

  writeSavedState(payload);
  return payload;
}
