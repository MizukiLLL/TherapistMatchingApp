import { OnboardingFormData, SavedOnboardingState } from './onboardingTypes';
import type { TherapistRecommendation } from './utils/therapistRecommendations';

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

  if (!saved?.userId) {
    return saved;
  }

  try {
    const response = await fetch(`/users/${encodeURIComponent(saved.userId)}/onboarding`);
    if (!response.ok) {
      return saved;
    }

    const payload = (await response.json()) as { data?: SavedOnboardingState };
    if (!payload.data) {
      return saved;
    }

    writeSavedState(payload.data);
    return payload.data;
  } catch {
    return saved;
  }
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

type MatchGenerationResponse = {
  data?: Array<{
    therapistId: string;
    therapist: {
      id: string;
      fullName: string;
      credentials: string;
      bio: string;
      licenseStates: string[];
      areaCodesServed: string[];
      therapyTypes: string[];
      telehealthAvailable: boolean;
      inPersonAvailable: boolean;
      profileUrl: string;
    };
    hard_constraint_reasons: string[];
    preference_score: number;
    tmti_score: number;
    final_score: number;
    explanation: {
      tokens: string[];
      matchedTherapyTypes: string[];
      matchingInsurance: Array<{ provider: string; plan: string | null; acceptingNewPatients: boolean }>;
      scoreBreakdown: {
        expertise: number;
        language: number;
        sessionFormat: number;
        tmti: number;
      };
    };
  }>;
};

export async function generateTherapistMatches(data: OnboardingFormData, userId: string): Promise<TherapistRecommendation[]> {
  const response = await fetch('/matches/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      areaCode: data.areaCode,
      preferredLanguage: data.preferredLanguage,
      therapyTypes: [
        ...data.lifeAspectsByCategory.symptomsAndDiagnoses,
        ...data.lifeAspectsByCategory.lifeStagesAndTransitions,
        ...data.lifeAspectsByCategory.physicalHealthRelatedIssues,
        ...data.lifeAspectsByCategory.selfIdentityAndSocialRelationships,
      ],
      insuranceProvider: data.insuranceProvider,
      insurancePlan: data.insurancePlan,
      carePreference: data.carePreference,
      cnipPreferenceProfile: data.cnipPreferenceProfile,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate therapist matches');
  }

  const payload = (await response.json()) as MatchGenerationResponse;

  return (payload.data ?? []).map((match) => ({
    therapist: {
      id: match.therapistId,
      name: match.therapist.fullName,
      credentials: match.therapist.credentials,
      location: `${match.therapist.licenseStates.join(', ')} - ZIP ${match.therapist.areaCodesServed.slice(0, 3).join(', ')}`,
      areaCodes: match.therapist.areaCodesServed,
      profileUrl: match.therapist.profileUrl,
      sessionFormats: [
        ...(match.therapist.telehealthAvailable ? ['Virtual' as const] : []),
        ...(match.therapist.inPersonAvailable ? ['InPerson' as const] : []),
      ],
      insuranceProviders: match.explanation.matchingInsurance.map((insurance) => insurance.provider),
      expertise: match.therapist.therapyTypes,
      therapyModels: match.explanation.matchedTherapyTypes.slice(0, 3),
      conversationStyleProfile: data.cnipPreferenceProfile,
      bio: match.therapist.bio,
    },
    score: match.final_score,
    styleFit: match.tmti_score,
    expertiseFit: match.explanation.scoreBreakdown.expertise,
    logisticsFit: Math.round((match.explanation.scoreBreakdown.language + match.explanation.scoreBreakdown.sessionFormat) / 2),
    reasons: [...match.hard_constraint_reasons, ...match.explanation.tokens],
  }));
}
