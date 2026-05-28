import { OnboardingFormData, SavedOnboardingState } from './onboardingTypes';
import type { TherapistRecommendation } from './utils/therapistRecommendations';

const STORAGE_KEY = 'therapist-matcher-onboarding';
const API_BASE_PATH = '/api';

function apiPath(path: string): string {
  return `${API_BASE_PATH}${path}`;
}

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
    const response = await fetch(apiPath(`/users/${encodeURIComponent(saved.userId)}/onboarding`));
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
    const userResponse = await fetch(apiPath('/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, email: data.email, preferredLanguage: data.preferredLanguage, areaCode: data.areaCode }),
    });

    if (!userResponse.ok) {
      throw new Error('Failed to save user');
    }

    const preferencesResponse = await fetch(apiPath('/preferences-save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        email: data.email,
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
        styleScenarioResponses: data.styleScenarioResponses,
        userStyleVector: data.userStyleVector,
        modalityPreferenceIds: data.modalityPreferenceIds,
        logistics: data.logistics,
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
      languages: string[];
      therapyTypes: string[];
      therapyModels: string[];
      telehealthAvailable: boolean;
      inPersonAvailable: boolean;
      hourlyRateMin: number | null;
      hourlyRateMax: number | null;
      profileUrl: string;
      source?: string;
      sourceProfileUrl?: string;
    };
    hard_constraint_reasons: string[];
    preference_score: number;
    cnip_score: number;
    therapy_model_score: number;
    final_score: number;
    scoreBreakdown?: {
      practicalFit: number;
      clinicalFit: number;
      modalityFit: number;
      adjustedStyleFit: number;
      culturalLanguageFit: number;
      profileQualityTrust: number;
    };
    explanation: {
      tokens: string[];
      matchedTherapyTypes: string[];
      matchedTherapyModels: string[];
      recommendedTherapyModels?: string[];
      matchingInsurance: Array<{ provider: string; plan: string | null; acceptingNewPatients: boolean }>;
      scoreBreakdown: {
        expertise: number;
        therapyModel: number;
        language: number;
        sessionFormat: number;
        cnipStyle: number;
      };
    };
  }>;
};

export async function generateTherapistMatches(data: OnboardingFormData, userId: string): Promise<TherapistRecommendation[]> {
  const response = await fetch(apiPath('/matches/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      areaCode: data.areaCode,
      preferredLanguage: data.preferredLanguage,
      requiredLanguages: data.logistics.requiredLanguages,
      preferredLanguages: data.logistics.preferredLanguages,
      languagePriority: data.logistics.languagePriority,
      culturalContextNeeds: data.logistics.culturalContextNeeds,
      identitySupportNeeds: data.logistics.identitySupportNeeds,
      culturePriority: data.logistics.culturePriority,
      therapyTypes: [
        ...data.lifeAspectsByCategory.symptomsAndDiagnoses,
        ...data.lifeAspectsByCategory.lifeStagesAndTransitions,
        ...data.lifeAspectsByCategory.physicalHealthRelatedIssues,
        ...data.lifeAspectsByCategory.selfIdentityAndSocialRelationships,
      ],
      insuranceProvider: data.insuranceProvider,
      insurancePlan: data.insurancePlan,
      paymentPreference: data.logistics.paymentPreference,
      budgetRange: data.logistics.budgetRange,
      availability: data.logistics.availability,
      therapyFor: data.therapyFor,
      carePreference: data.carePreference,
      cnipPreferenceProfile: data.cnipPreferenceProfile,
      styleScenarioResponses: data.styleScenarioResponses,
      userStyleVector: data.userStyleVector,
      modalityPreferenceIds: data.modalityPreferenceIds,
      fetchPsychologyToday: true,
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
      location: `Licensed in ${match.therapist.licenseStates.join(', ')} - serves ZIP ${match.therapist.areaCodesServed.slice(0, 3).join(', ')}`,
      licenseStates: match.therapist.licenseStates,
      areaCodes: match.therapist.areaCodesServed,
      profileUrl: match.therapist.profileUrl,
      source: match.therapist.source,
      sourceProfileUrl: match.therapist.sourceProfileUrl,
      sessionFormats: [
        ...(match.therapist.telehealthAvailable ? ['Virtual' as const] : []),
        ...(match.therapist.inPersonAvailable ? ['InPerson' as const] : []),
      ],
      languages: match.therapist.languages,
      insuranceProviders: match.explanation.matchingInsurance.map((insurance) => insurance.provider),
      matchingInsurance: match.explanation.matchingInsurance,
      hourlyRateMin: match.therapist.hourlyRateMin,
      hourlyRateMax: match.therapist.hourlyRateMax,
      expertise: match.therapist.therapyTypes,
      therapyModels: match.explanation.matchedTherapyModels.length > 0 ? match.explanation.matchedTherapyModels : match.therapist.therapyModels.slice(0, 3),
      conversationStyleProfile: data.cnipPreferenceProfile,
      bio: match.therapist.bio,
    },
    score: match.final_score,
    styleFit: Math.round((match.scoreBreakdown?.adjustedStyleFit ?? match.cnip_score / 100) * 100),
    expertiseFit: match.explanation.scoreBreakdown.expertise,
    logisticsFit: Math.round((match.explanation.scoreBreakdown.language + match.explanation.scoreBreakdown.sessionFormat) / 2),
    recommendedModels: (match.explanation.recommendedTherapyModels?.length ? match.explanation.recommendedTherapyModels : match.explanation.matchedTherapyModels).slice(0, 5),
    reasons: [...match.hard_constraint_reasons, ...match.explanation.tokens],
  }));
}
