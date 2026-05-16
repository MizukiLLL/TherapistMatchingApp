export type PreferredLanguage =
  | 'English'
  | 'Mandarin'
  | 'Cantonese'
  | 'Spanish'
  | 'Korean'
  | 'Japanese'
  | 'Vietnamese'
  | 'Tagalog'
  | 'Arabic'
  | 'Hindi / Urdu'
  | 'French'
  | 'Other';

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

export type ModalityPreferenceId =
  | 'toolsBased'
  | 'insightBased'
  | 'traumaProcessing'
  | 'relationshipFocused'
  | 'valuesActionBased'
  | 'somaticRegulation'
  | 'culturallyResponsive'
  | 'neurodiversityAffirming';

export type LogisticsDetails = {
  requiredLanguages: string[];
  preferredLanguages: string[];
  languagePriority: 'required' | 'preferred' | 'flexible';
  culturalContextNeeds: string[];
  identitySupportNeeds: string[];
  culturePriority: 'high' | 'medium' | 'low';
  state: string;
  radiusMiles: number | null;
  paymentPreference: 'insurance' | 'out_of_pocket' | 'sliding_scale' | 'not_sure' | '';
  budgetRange: 'under_75' | '75_125' | '125_175' | '175_250' | 'flexible' | '';
  availability: 'asap' | '1_2_weeks' | 'within_month' | 'exploring' | '';
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
  modalityPreferenceIds: ModalityPreferenceId[];
  logistics: LogisticsDetails;
};

export type SavedOnboardingState = {
  userId: string;
  data: OnboardingFormData;
  updatedAt: string;
};
