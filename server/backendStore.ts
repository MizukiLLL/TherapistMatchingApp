import type { TherapistMatch } from './matchingEngine.ts';
import { readDatabase, writeDatabase } from './localDatabase.ts';
import { therapistDirectory, type TherapistDirectoryRecord } from './therapistDirectory.ts';
import type { CnipConversationStyle, OnboardingFormData, SavedOnboardingState, StyleScenarioResponse, UserStyleVector } from '../onboardingTypes.ts';

export type UserRecord = {
  id: string;
  email?: string;
  preferredLanguage?: string;
  areaCode?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserPreferenceRecord = {
  userId: string;
  areaCode: string;
  preferredLanguage?: string;
  therapyFor?: OnboardingFormData['therapyFor'];
  lifeAspectsByCategory?: OnboardingFormData['lifeAspectsByCategory'];
  lifeAspectNotesByCategory?: OnboardingFormData['lifeAspectNotesByCategory'];
  lifeAspectSkippedByCategory?: OnboardingFormData['lifeAspectSkippedByCategory'];
  therapyTypes: string[];
  insuranceProvider: string;
  insurancePlan?: string;
  carePreference?: string;
  cnipConversationStyles?: CnipConversationStyle[];
  cnipPreferenceProfile?: {
    directiveness: number;
    emotionalIntensity: number;
    pastOrientation: number;
    warmSupport: number;
  };
  styleScenarioResponses?: StyleScenarioResponse[];
  userStyleVector?: UserStyleVector;
  updatedAt: string;
};

export type TmtiResponseRecord = {
  id: string;
  userId: string;
  tmtiProfileId: string;
  questionCode: string;
  responseValue: string;
  createdAt: string;
};

export type TmtiProfileRecord = {
  id: string;
  userId: string;
  tmtiType: string;
  dimensionScores: Record<string, number>;
  confidenceScore: number;
  version: string;
  createdAt: string;
  updatedAt: string;
};

type GeneratedMatchesRecord = {
  userId: string;
  matches: TherapistMatch[];
  updatedAt: string;
};

type LiveTherapistRecord = TherapistDirectoryRecord & {
  source: 'psychologytoday';
  sourceProfileUrl: string;
  ingestedAt: string;
  updatedAt: string;
};

type BackendDatabase = {
  schemaVersion: 3;
  users: UserRecord[];
  preferences: UserPreferenceRecord[];
  tmtiProfiles: TmtiProfileRecord[];
  tmtiResponses: TmtiResponseRecord[];
  generatedMatches: GeneratedMatchesRecord[];
  liveTherapists: LiveTherapistRecord[];
  updatedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

const initialDatabase: BackendDatabase = {
  schemaVersion: 3,
  users: [],
  preferences: [],
  tmtiProfiles: [],
  tmtiResponses: [],
  generatedMatches: [],
  liveTherapists: [],
  updatedAt: nowIso(),
};

const database = readDatabase(initialDatabase);
database.schemaVersion = 3;

const emptyLifeAspectsByCategory: OnboardingFormData['lifeAspectsByCategory'] = {
  symptomsAndDiagnoses: [],
  lifeStagesAndTransitions: [],
  physicalHealthRelatedIssues: [],
  selfIdentityAndSocialRelationships: [],
};

const emptyLifeAspectNotesByCategory: OnboardingFormData['lifeAspectNotesByCategory'] = {
  symptomsAndDiagnoses: '',
  lifeStagesAndTransitions: '',
  physicalHealthRelatedIssues: '',
  selfIdentityAndSocialRelationships: '',
};

const emptyLifeAspectSkippedByCategory: OnboardingFormData['lifeAspectSkippedByCategory'] = {
  symptomsAndDiagnoses: false,
  lifeStagesAndTransitions: false,
  physicalHealthRelatedIssues: false,
  selfIdentityAndSocialRelationships: false,
};

function persistDatabase(): void {
  database.updatedAt = nowIso();
  writeDatabase(database);
}

export function upsertUser(input: { id?: string; email?: string; preferredLanguage?: string; areaCode?: string }): UserRecord {
  const id = input.id?.trim() || globalThis.crypto?.randomUUID?.() || `user-${Date.now()}`;
  const existingIndex = database.users.findIndex((user) => user.id === id);
  const existing = existingIndex >= 0 ? database.users[existingIndex] : undefined;
  const timestamp = nowIso();
  const record: UserRecord = {
    id,
    email: input.email?.trim() || existing?.email,
    preferredLanguage: input.preferredLanguage?.trim() || existing?.preferredLanguage,
    areaCode: input.areaCode?.trim() || existing?.areaCode,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    database.users[existingIndex] = record;
  } else {
    database.users.push(record);
  }

  persistDatabase();
  return record;
}

export function getUser(userId: string): UserRecord | undefined {
  return database.users.find((user) => user.id === userId);
}

export function upsertUserPreferences(userId: string, input: Partial<UserPreferenceRecord> & { lifeAspects?: string[] }): UserPreferenceRecord {
  const existingIndex = database.preferences.findIndex((preference) => preference.userId === userId);
  const existing = existingIndex >= 0 ? database.preferences[existingIndex] : undefined;
  const therapyTypes = input.therapyTypes?.filter(Boolean) ?? input.lifeAspects?.filter(Boolean) ?? existing?.therapyTypes ?? [];
  const record: UserPreferenceRecord = {
    userId,
    areaCode: input.areaCode?.trim() || existing?.areaCode || '',
    preferredLanguage: input.preferredLanguage?.trim() || existing?.preferredLanguage,
    therapyFor: input.therapyFor ?? existing?.therapyFor,
    lifeAspectsByCategory: input.lifeAspectsByCategory ?? existing?.lifeAspectsByCategory,
    lifeAspectNotesByCategory: input.lifeAspectNotesByCategory ?? existing?.lifeAspectNotesByCategory,
    lifeAspectSkippedByCategory: input.lifeAspectSkippedByCategory ?? existing?.lifeAspectSkippedByCategory,
    therapyTypes,
    insuranceProvider: input.insuranceProvider?.trim() || existing?.insuranceProvider || '',
    insurancePlan: input.insurancePlan?.trim() || existing?.insurancePlan,
    carePreference: input.carePreference?.trim() || existing?.carePreference,
    cnipConversationStyles: input.cnipConversationStyles ?? existing?.cnipConversationStyles,
    cnipPreferenceProfile: input.cnipPreferenceProfile ?? existing?.cnipPreferenceProfile,
    styleScenarioResponses: input.styleScenarioResponses ?? existing?.styleScenarioResponses,
    userStyleVector: input.userStyleVector ?? existing?.userStyleVector,
    updatedAt: nowIso(),
  };

  if (existingIndex >= 0) {
    database.preferences[existingIndex] = record;
  } else {
    database.preferences.push(record);
  }

  persistDatabase();
  return record;
}

export function getUserPreferences(userId: string): UserPreferenceRecord | undefined {
  return database.preferences.find((preference) => preference.userId === userId);
}

export function saveTmtiProfileWithResponses(input: {
  userId: string;
  tmtiType: string;
  dimensionScores: Record<string, number>;
  confidenceScore: number;
  version: string;
  responses: Array<{ questionCode: string; responseValue: string }>;
}): { profile: TmtiProfileRecord; responses: TmtiResponseRecord[] } {
  const timestamp = nowIso();
  const existingIndex = database.tmtiProfiles.findIndex((profile) => profile.userId === input.userId && profile.version === input.version);
  const existing = existingIndex >= 0 ? database.tmtiProfiles[existingIndex] : undefined;
  const profile: TmtiProfileRecord = {
    id: existing?.id ?? globalThis.crypto?.randomUUID?.() ?? `tmti-profile-${Date.now()}`,
    userId: input.userId,
    tmtiType: input.tmtiType,
    dimensionScores: input.dimensionScores,
    confidenceScore: input.confidenceScore,
    version: input.version,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    database.tmtiProfiles[existingIndex] = profile;
  } else {
    database.tmtiProfiles.push(profile);
  }

  database.tmtiResponses = database.tmtiResponses.filter((response) => response.tmtiProfileId !== profile.id);
  const responses = input.responses.map((response) => ({
    id: globalThis.crypto?.randomUUID?.() ?? `tmti-response-${Date.now()}-${response.questionCode}`,
    userId: input.userId,
    tmtiProfileId: profile.id,
    questionCode: response.questionCode,
    responseValue: response.responseValue,
    createdAt: timestamp,
  }));

  database.tmtiResponses.push(...responses);
  persistDatabase();

  return { profile, responses };
}

export function getLatestTmtiProfile(userId: string): TmtiProfileRecord | undefined {
  return database.tmtiProfiles
    .filter((profile) => profile.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function getSavedOnboardingState(userId: string): SavedOnboardingState | undefined {
  const user = getUser(userId);
  const preference = getUserPreferences(userId);

  if (!user || !preference) {
    return undefined;
  }

  const lifeAspectsByCategory = {
    ...emptyLifeAspectsByCategory,
    ...preference.lifeAspectsByCategory,
  };
  const fallbackLifeAspects = preference.therapyTypes ?? [];
  const hasCategorizedLifeAspects = Object.values(lifeAspectsByCategory).some((values) => values.length > 0);
  const cnipConversationStyles = preference.cnipConversationStyles ?? [];
  const userStyleVector = preference.userStyleVector ?? {
    therapist_directive: 0.5,
    emotionally_intensive: 0.5,
    past_focused: 0.5,
    support_focused: 0.5,
  };

  return {
    userId,
    data: {
      areaCode: preference.areaCode || user.areaCode || '',
      preferredLanguage: (preference.preferredLanguage || user.preferredLanguage || 'English') as OnboardingFormData['preferredLanguage'],
      therapyFor: preference.therapyFor ?? '',
      carePreference: (preference.carePreference || '') as OnboardingFormData['carePreference'],
      lifeAspectsByCategory: hasCategorizedLifeAspects
        ? lifeAspectsByCategory
        : {
            ...emptyLifeAspectsByCategory,
            symptomsAndDiagnoses: fallbackLifeAspects,
          },
      lifeAspectNotesByCategory: {
        ...emptyLifeAspectNotesByCategory,
        ...preference.lifeAspectNotesByCategory,
      },
      lifeAspectSkippedByCategory: {
        ...emptyLifeAspectSkippedByCategory,
        ...preference.lifeAspectSkippedByCategory,
      },
      insuranceProvider: preference.insuranceProvider,
      insurancePlan: preference.insurancePlan ?? '',
      cnipConversationStyles,
      cnipPreferenceProfile: preference.cnipPreferenceProfile ?? {
        directiveness: 0,
        emotionalIntensity: 0,
        pastOrientation: 0,
        warmSupport: 0,
      },
      styleScenarioResponses: preference.styleScenarioResponses ?? [],
      userStyleVector,
    },
    updatedAt: preference.updatedAt,
  };
}

export function saveGeneratedMatches(userId: string, matches: TherapistMatch[]): TherapistMatch[] {
  const existingIndex = database.generatedMatches.findIndex((record) => record.userId === userId);
  const record: GeneratedMatchesRecord = {
    userId,
    matches,
    updatedAt: nowIso(),
  };

  if (existingIndex >= 0) {
    database.generatedMatches[existingIndex] = record;
  } else {
    database.generatedMatches.push(record);
  }

  persistDatabase();
  return matches;
}

export function getGeneratedMatches(userId: string): TherapistMatch[] {
  return database.generatedMatches.find((record) => record.userId === userId)?.matches ?? [];
}

export function upsertLiveTherapist(record: TherapistDirectoryRecord & { sourceProfileUrl: string }): TherapistDirectoryRecord {
  const timestamp = nowIso();
  const existingIndex = database.liveTherapists.findIndex((therapist) => therapist.id === record.id || therapist.sourceProfileUrl === record.sourceProfileUrl);
  const existing = existingIndex >= 0 ? database.liveTherapists[existingIndex] : undefined;
  const liveRecord: LiveTherapistRecord = {
    ...record,
    source: 'psychologytoday',
    sourceProfileUrl: record.sourceProfileUrl,
    ingestedAt: existing?.ingestedAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    database.liveTherapists[existingIndex] = liveRecord;
  } else {
    database.liveTherapists.push(liveRecord);
  }

  persistDatabase();
  return liveRecord;
}

export function getAllTherapists(): TherapistDirectoryRecord[] {
  const liveById = new Map(database.liveTherapists.map((therapist) => [therapist.id, therapist]));
  const seededTherapists = therapistDirectory.filter((therapist) => !liveById.has(therapist.id));

  return [...seededTherapists, ...database.liveTherapists];
}
