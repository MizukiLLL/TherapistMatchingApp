export type PreferredLanguage = 'Mandarin' | 'Cantonese' | 'English';

export type CnipConversationStyle = 'structuredGuide' | 'reflectiveCompanion' | 'deepExplorer' | 'practicalCoach';

export type CnipPreferenceProfile = {
  directiveness: number;
  emotionalIntensity: number;
  pastOrientation: number;
  warmSupport: number;
};

export type UserStyleVector = {
  therapist_directive: number;
  emotionally_intensive: number;
  past_focused: number;
  support_focused: number;
};

export type StyleScenarioResponse = {
  scenarioId: string;
  bestCardId: string;
  secondCardId?: string;
  leastCardId?: string;
};

export type OnboardingFormData = {
  areaCode: string;
  preferredLanguage: PreferredLanguage;
  therapyFor: 'Myself' | 'Child' | 'Partner' | 'Family' | '';
  carePreference: 'Virtual' | 'InPerson' | 'Either' | '';
  lifeAspectsByCategory: {
    symptomsAndDiagnoses: string[];
    lifeStagesAndTransitions: string[];
    physicalHealthRelatedIssues: string[];
    selfIdentityAndSocialRelationships: string[];
  };
  lifeAspectNotesByCategory: {
    symptomsAndDiagnoses: string;
    lifeStagesAndTransitions: string;
    physicalHealthRelatedIssues: string;
    selfIdentityAndSocialRelationships: string;
  };
  lifeAspectSkippedByCategory: {
    symptomsAndDiagnoses: boolean;
    lifeStagesAndTransitions: boolean;
    physicalHealthRelatedIssues: boolean;
    selfIdentityAndSocialRelationships: boolean;
  };
  insuranceProvider: string;
  insurancePlan: string;
  cnipConversationStyles: CnipConversationStyle[];
  cnipPreferenceProfile: CnipPreferenceProfile;
  styleScenarioResponses: StyleScenarioResponse[];
  userStyleVector: UserStyleVector;
};

export type SavedOnboardingState = {
  userId: string;
  data: OnboardingFormData;
  updatedAt: string;
};
