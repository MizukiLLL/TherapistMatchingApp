import { getAllTherapists, type UserPreferenceRecord } from './backendStore';
import { TherapistDirectoryRecord, TherapistInsurance } from './therapistDirectory';

type StyleSignalProfile = {
  directiveness: number;
  emotionalIntensity: number;
  pastOrientation: number;
  warmSupport: number;
};

export type MatchGenerationRequest = {
  userId?: string;
  areaCode?: string;
  preferredLanguage?: string;
  therapyType?: string;
  therapyTypes?: string[];
  insuranceProvider?: string;
  insurancePlan?: string;
  carePreference?: string;
  cnipPreferenceProfile?: StyleSignalProfile;
  limit?: number;
};

export type MatchGenerationValidationError = {
  field: keyof MatchGenerationRequest;
  message: string;
};

export type ResolvedMatchPreferences = {
  userId: string;
  areaCode: string;
  preferredLanguage?: string;
  therapyTypes: string[];
  insuranceProvider: string;
  insurancePlan?: string;
  carePreference?: string;
  cnipPreferenceProfile?: StyleSignalProfile;
  limit: number;
};

export type TherapistMatch = {
  id: string;
  userId: string;
  therapistId: string;
  therapist: Omit<TherapistDirectoryRecord, 'insurance' | 'isActive'>;
  hard_constraints_pass: boolean;
  hard_constraint_reasons: string[];
  preference_score: number;
  tmti_score: number;
  final_score: number;
  explanation: {
    tokens: string[];
    matchedTherapyTypes: string[];
    matchingInsurance: TherapistInsurance[];
    scoreBreakdown: {
      expertise: number;
      language: number;
      sessionFormat: number;
      tmti: number;
    };
  };
  ranked_at: string;
};

export type MatchGenerationResponse = {
  data: TherapistMatch[];
  meta: {
    userId: string;
    total: number;
    filters: Pick<ResolvedMatchPreferences, 'areaCode' | 'therapyTypes' | 'insuranceProvider' | 'insurancePlan' | 'carePreference' | 'preferredLanguage'>;
    elapsedMs: number;
    generatedAt: string;
  };
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const styleKeys: Array<keyof StyleSignalProfile> = ['directiveness', 'emotionalIntensity', 'pastOrientation', 'warmSupport'];

const therapistStyleProfiles: Record<string, StyleSignalProfile> = {
  'maya-chen': { directiveness: 6, emotionalIntensity: 7, pastOrientation: 5, warmSupport: 8 },
  'jonathan-reed': { directiveness: 9, emotionalIntensity: 4, pastOrientation: 2, warmSupport: 4 },
  'sofia-morales': { directiveness: 4, emotionalIntensity: 9, pastOrientation: 9, warmSupport: 7 },
  'emily-wong': { directiveness: 7, emotionalIntensity: 5, pastOrientation: 4, warmSupport: 7 },
  'david-kim': { directiveness: 5, emotionalIntensity: 6, pastOrientation: 6, warmSupport: 9 },
};

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeForCompare(value: string | null | undefined): string {
  return normalize(value).toLocaleLowerCase();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseLimit(limit: unknown): number {
  const parsed = typeof limit === 'number' ? limit : Number.parseInt(String(limit ?? ''), 10);
  if (Number.isNaN(parsed)) return DEFAULT_LIMIT;

  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

function compactStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return values.map((value) => normalize(String(value))).filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeForCompare(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasAnyValue(values: string[], expected: string[]): boolean {
  const valueSet = new Set(values.map(normalizeForCompare));
  return expected.some((value) => valueSet.has(normalizeForCompare(value)));
}

function matchingValues(values: string[], expected: string[]): string[] {
  const valueSet = new Set(values.map(normalizeForCompare));
  return expected.filter((value) => valueSet.has(normalizeForCompare(value)));
}

function getMatchingInsurance(therapist: TherapistDirectoryRecord, preferences: ResolvedMatchPreferences): TherapistInsurance[] {
  const provider = normalizeForCompare(preferences.insuranceProvider);
  const plan = normalizeForCompare(preferences.insurancePlan);

  if (!provider) return [];

  return therapist.insurance.filter((insurance) => {
    if (!insurance.acceptingNewPatients) return false;
    if (normalizeForCompare(insurance.provider) !== provider) return false;
    if (!plan) return true;

    return normalizeForCompare(insurance.plan) === plan;
  });
}

function scoreArea(therapist: TherapistDirectoryRecord, areaCode: string): number {
  if (!areaCode) return 65;
  if (therapist.areaCodesServed.includes(areaCode)) return 100;

  const requestedPrefix = areaCode.slice(0, 3);
  if (therapist.areaCodesServed.some((servedArea) => servedArea.slice(0, 3) === requestedPrefix)) return 75;

  return 35;
}

function scoreInsurance(matchingInsurance: TherapistInsurance[], preferences: ResolvedMatchPreferences): number {
  if (!preferences.insuranceProvider) return 60;
  if (matchingInsurance.length > 0) return 100;

  return 35;
}

function scoreLanguage(therapist: TherapistDirectoryRecord, preferredLanguage?: string): number {
  if (!preferredLanguage) return 70;
  if (hasAnyValue(therapist.languages, [preferredLanguage])) return 100;
  if (hasAnyValue(therapist.languages, ['English'])) return 70;

  return 40;
}

function scoreSessionFormat(therapist: TherapistDirectoryRecord, carePreference?: string): number {
  const preference = normalizeForCompare(carePreference);
  if (!preference || preference === 'either') return 85;
  if (preference === 'virtual') return therapist.telehealthAvailable ? 100 : 0;
  if (preference === 'inperson' || preference === 'in_person') return therapist.inPersonAvailable ? 100 : 0;

  return 70;
}

function scoreStyleSignal(therapistId: string, profile?: StyleSignalProfile): number {
  if (!profile || styleKeys.every((key) => !profile[key])) return 50;

  const therapistProfile = therapistStyleProfiles[therapistId];
  if (!therapistProfile) return 50;

  const totalDistance = styleKeys.reduce((sum, key) => sum + Math.abs(profile[key] - therapistProfile[key]), 0);
  const maxDistance = styleKeys.length * 10;
  return clampScore((1 - totalDistance / maxDistance) * 100);
}

function publicTherapist(therapist: TherapistDirectoryRecord): Omit<TherapistDirectoryRecord, 'insurance' | 'isActive'> {
  const { insurance: _insurance, isActive: _isActive, ...publicRecord } = therapist;
  return publicRecord;
}

function createMatchId(userId: string, therapistId: string): string {
  return `match-${userId}-${therapistId}-${Date.now()}`;
}

export function resolveMatchPreferences(
  request: MatchGenerationRequest,
  savedPreferences?: UserPreferenceRecord
): { preferences: ResolvedMatchPreferences; errors: MatchGenerationValidationError[] } {
  const directTherapyTypes = uniqueStrings([
    ...compactStringList(request.therapyTypes),
    ...(request.therapyType ? [request.therapyType] : []),
  ]);
  const therapyTypes = directTherapyTypes.length > 0 ? directTherapyTypes : savedPreferences?.therapyTypes ?? [];
  const userId = normalize(request.userId) || savedPreferences?.userId || globalThis.crypto?.randomUUID?.() || `anonymous-${Date.now()}`;

  const preferences: ResolvedMatchPreferences = {
    userId,
    areaCode: normalize(request.areaCode) || savedPreferences?.areaCode || '',
    preferredLanguage: normalize(request.preferredLanguage) || savedPreferences?.preferredLanguage,
    therapyTypes,
    insuranceProvider: normalize(request.insuranceProvider) || savedPreferences?.insuranceProvider || '',
    insurancePlan: normalize(request.insurancePlan) || savedPreferences?.insurancePlan,
    carePreference: normalize(request.carePreference) || savedPreferences?.carePreference,
    cnipPreferenceProfile: request.cnipPreferenceProfile ?? savedPreferences?.cnipPreferenceProfile,
    limit: parseLimit(request.limit),
  };
  const errors: MatchGenerationValidationError[] = [];

  if (!/^\d{5}$/.test(preferences.areaCode)) {
    errors.push({ field: 'areaCode', message: 'areaCode must be a 5-digit U.S. ZIP code.' });
  }

  return { preferences, errors };
}

export function generateMatches(preferences: ResolvedMatchPreferences, directory = getAllTherapists()): TherapistMatch[] {
  const rankedAt = new Date().toISOString();

  return directory
    .filter((therapist) => therapist.isActive)
    .map((therapist) => {
      const matchedTherapyTypes = matchingValues(therapist.therapyTypes, preferences.therapyTypes);
      const matchingInsurance = getMatchingInsurance(therapist, preferences);
      const areaMatch = therapist.areaCodesServed.includes(preferences.areaCode);
      const passesHardConstraints = areaMatch && matchedTherapyTypes.length > 0 && matchingInsurance.length > 0;
      const expertiseScore = preferences.therapyTypes.length === 0 ? 65 : clampScore((matchedTherapyTypes.length / preferences.therapyTypes.length) * 100);
      const languageScore = scoreLanguage(therapist, preferences.preferredLanguage);
      const formatScore = scoreSessionFormat(therapist, preferences.carePreference);
      const areaScore = scoreArea(therapist, preferences.areaCode);
      const insuranceScore = scoreInsurance(matchingInsurance, preferences);
      const preferenceScore = clampScore(expertiseScore * 0.42 + languageScore * 0.2 + formatScore * 0.16 + areaScore * 0.12 + insuranceScore * 0.1);
      const tmtiScore = scoreStyleSignal(therapist.id, preferences.cnipPreferenceProfile);
      const finalScore = clampScore(preferenceScore * 0.7 + tmtiScore * 0.3);
      const insuranceLabel = preferences.insurancePlan
        ? `${preferences.insuranceProvider} ${preferences.insurancePlan}`
        : preferences.insuranceProvider;
      const topTherapyTypes = matchedTherapyTypes.length > 0 ? matchedTherapyTypes : therapist.therapyTypes.slice(0, 3);
      const reasons = [
        areaMatch ? `Serves ZIP code ${preferences.areaCode}.` : `Closest available ZIP coverage: ${therapist.areaCodesServed.slice(0, 3).join(', ')}.`,
        matchedTherapyTypes.length > 0
          ? `Supports ${matchedTherapyTypes.slice(0, 3).join(', ')}.`
          : preferences.therapyTypes.length === 0
            ? `Broad profile focus: ${therapist.therapyTypes.slice(0, 3).join(', ')}.`
            : `Related profile focus: ${therapist.therapyTypes.slice(0, 3).join(', ')}.`,
        matchingInsurance.length > 0
          ? `Accepts ${insuranceLabel}.`
          : preferences.insuranceProvider
            ? `Insurance with ${insuranceLabel} needs confirmation.`
            : 'Insurance not provided; confirm coverage with therapist.',
      ];

      return {
        id: createMatchId(preferences.userId, therapist.id),
        userId: preferences.userId,
        therapistId: therapist.id,
        therapist: publicTherapist(therapist),
        hard_constraints_pass: passesHardConstraints,
        hard_constraint_reasons: reasons,
        preference_score: preferenceScore,
        tmti_score: tmtiScore,
        final_score: finalScore,
        explanation: {
          tokens: [
            passesHardConstraints ? 'Exact match on ZIP, focus, and insurance.' : 'Best available partial match; confirm details before booking.',
            `Matched ${matchedTherapyTypes.length} therapy focus${matchedTherapyTypes.length === 1 ? '' : 'es'}.`,
            `Language fit: ${languageScore}.`,
            `Session format fit: ${formatScore}.`,
            `Location fit: ${areaScore}.`,
            `Insurance fit: ${insuranceScore}.`,
            `TMTI placeholder score: ${tmtiScore}.`,
          ],
          matchedTherapyTypes: topTherapyTypes,
          matchingInsurance,
          scoreBreakdown: {
            expertise: expertiseScore,
            language: languageScore,
            sessionFormat: formatScore,
            tmti: tmtiScore,
          },
        },
        ranked_at: rankedAt,
      };
    })
    .sort((a, b) => b.final_score - a.final_score || a.therapist.fullName.localeCompare(b.therapist.fullName))
    .slice(0, preferences.limit);
}

export function buildMatchGenerationResponse(preferences: ResolvedMatchPreferences, data: TherapistMatch[], elapsedMs: number): MatchGenerationResponse {
  return {
    data,
    meta: {
      userId: preferences.userId,
      total: data.length,
      filters: {
        areaCode: preferences.areaCode,
        therapyTypes: preferences.therapyTypes,
        insuranceProvider: preferences.insuranceProvider,
        insurancePlan: preferences.insurancePlan,
        carePreference: preferences.carePreference,
        preferredLanguage: preferences.preferredLanguage,
      },
      elapsedMs,
      generatedAt: new Date().toISOString(),
    },
  };
}
