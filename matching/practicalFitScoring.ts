import { PRACTICAL_FIT_WEIGHTS } from './matchingConfig.ts';
import type { NormalizedTherapistProfile } from './matchingTypes.ts';
import { anyZipWithinMiles, getStateForZip } from './zipGeo.ts';

const IN_PERSON_RADIUS_MILES = 50;

export type PracticalFitInput = {
  areaCode: string;
  preferredLanguage?: string;
  requiredLanguages?: string[];
  preferredLanguages?: string[];
  languagePriority?: 'required' | 'preferred' | 'flexible';
  culturalContextNeeds?: string[];
  identitySupportNeeds?: string[];
  culturePriority?: 'high' | 'medium' | 'low';
  insuranceProvider?: string;
  paymentPreference?: string;
  carePreference?: string;
  maxFee?: number;
  budgetRange?: string;
  therapyFor?: string;
  availability?: string;
};

export type HardFilterResult = {
  passed: boolean;
  reasons: string[];
};

export type PracticalFitResult = {
  score: number;
  languageFit: number;
  insuranceFit: number;
  locationModeFit: number;
  availabilityFit: number;
  affordabilityFit: number;
  profileQualityPenalty: number;
};

function normalize(value?: string): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function includesNormalized(values: string[], expected?: string): boolean {
  const expectedValue = normalize(expected);
  return !!expectedValue && values.some((value) => normalize(value) === expectedValue);
}

function isChineseLanguage(value?: string): boolean {
  return /mandarin|cantonese|chinese|普通|廣東|广东/i.test(value ?? '');
}

function languageFit(therapist: NormalizedTherapistProfile, input: PracticalFitInput): number {
  const languages = [...(input.requiredLanguages ?? []), ...(input.preferredLanguages ?? [])];
  const preferredLanguage = languages[0] ?? input.preferredLanguage;
  if (!preferredLanguage || input.languagePriority === 'flexible') return 0.8;
  if (includesNormalized(therapist.practical.languages, preferredLanguage)) return 1;
  if (normalize(preferredLanguage) === 'english') return therapist.practical.languages.length === 0 ? 0.5 : 0.4;
  if (isChineseLanguage(preferredLanguage) && therapist.practical.languages.some(isChineseLanguage)) return 0.7;
  return 0;
}

function insuranceFit(therapist: NormalizedTherapistProfile, insuranceProvider?: string): number {
  if (!insuranceProvider) return 0.8;
  if (includesNormalized(therapist.practical.insurance, insuranceProvider)) return 1;
  if (therapist.practical.insurance.length === 0) return 0.5;
  return 0.35;
}

function budgetToMaxFee(budgetRange?: string, maxFee?: number): number | undefined {
  if (maxFee) return maxFee;
  if (budgetRange === 'under_75') return 75;
  if (budgetRange === '75_125') return 125;
  if (budgetRange === '125_175') return 175;
  if (budgetRange === '175_250') return 250;
  return undefined;
}

function virtualLocationScore(therapist: NormalizedTherapistProfile, userZip: string): number {
  if (therapist.practical.telehealth === false) return 0;
  const userState = getStateForZip(userZip);
  if (!userState) return therapist.practical.telehealth === true ? 0.6 : 0.4;
  if (therapist.practical.states.length === 0) return therapist.practical.telehealth === true ? 0.5 : 0.3;
  const licensedHere = therapist.practical.states.some((state) => state.toUpperCase() === userState.toUpperCase());
  if (!licensedHere) return 0;
  return therapist.practical.telehealth === true ? 1 : therapist.practical.telehealth === null ? 0.6 : 0;
}

function inPersonLocationScore(therapist: NormalizedTherapistProfile, userZip: string): number {
  if (therapist.practical.in_person === false) return 0;
  if (therapist.practical.zip_codes_or_locations.length === 0) return 0;
  if (!anyZipWithinMiles(userZip, therapist.practical.zip_codes_or_locations, IN_PERSON_RADIUS_MILES)) return 0;
  return therapist.practical.in_person === true ? 1 : 0.6;
}

function locationModeFit(therapist: NormalizedTherapistProfile, input: PracticalFitInput): number {
  const preference = normalize(input.carePreference);

  if (preference === 'virtual') return virtualLocationScore(therapist, input.areaCode);
  if (preference === 'inperson' || preference === 'in_person') return inPersonLocationScore(therapist, input.areaCode);
  return Math.max(virtualLocationScore(therapist, input.areaCode), inPersonLocationScore(therapist, input.areaCode));
}

function availabilityFit(therapist: NormalizedTherapistProfile): number {
  if (therapist.practical.accepting_new_clients === true) return 1;
  if (therapist.practical.accepting_new_clients === null) return 0.5;
  return 0;
}

function affordabilityFit(therapist: NormalizedTherapistProfile, maxFee?: number): number {
  if (!maxFee) return 0.75;
  if (therapist.practical.fee_min === null && therapist.practical.fee_max === null) return 0.5;
  const fee = therapist.practical.fee_min ?? therapist.practical.fee_max ?? maxFee;
  if (fee <= maxFee) return 1;
  if (fee <= maxFee * 1.25) return 0.65;
  return 0.35;
}

export function applyHardFilters(therapist: NormalizedTherapistProfile, input: PracticalFitInput): HardFilterResult {
  const reasons: string[] = [];
  const preference = normalize(input.carePreference);

  const requiredLanguages = input.languagePriority === 'required' ? input.requiredLanguages ?? [] : [];
  if (requiredLanguages.length > 0 && requiredLanguages.every((language) => languageFit(therapist, { ...input, preferredLanguage: language }) <= 0)) {
    reasons.push(`Does not list required language: ${requiredLanguages.join(', ')}.`);
  }

  if (input.paymentPreference === 'insurance' && input.insuranceProvider && insuranceFit(therapist, input.insuranceProvider) < 1) {
    reasons.push(`Does not clearly accept ${input.insuranceProvider}.`);
  }

  const userState = getStateForZip(input.areaCode);
  const licensedInUserState =
    !!userState && therapist.practical.states.some((state) => state.toUpperCase() === userState.toUpperCase());
  const withinInPersonRadius =
    therapist.practical.in_person !== false &&
    therapist.practical.zip_codes_or_locations.length > 0 &&
    anyZipWithinMiles(input.areaCode, therapist.practical.zip_codes_or_locations, IN_PERSON_RADIUS_MILES);

  if (preference === 'virtual') {
    if (therapist.practical.telehealth === false) reasons.push('Does not list virtual sessions.');
    else if (userState && therapist.practical.states.length > 0 && !licensedInUserState) {
      reasons.push(`Not licensed in your state (${userState}) for telehealth.`);
    }
  } else if (preference === 'inperson' || preference === 'in_person') {
    if (!withinInPersonRadius) {
      reasons.push(`No in-person location within ${IN_PERSON_RADIUS_MILES} miles of ZIP ${input.areaCode}.`);
    }
  } else if (preference === 'either') {
    const virtualPath = therapist.practical.telehealth !== false && (!userState || therapist.practical.states.length === 0 || licensedInUserState);
    if (!virtualPath && !withinInPersonRadius) {
      reasons.push(`Not licensed in your state (${userState ?? 'unknown'}) for telehealth, and no in-person location within ${IN_PERSON_RADIUS_MILES} miles.`);
    }
  }

  if (therapist.practical.accepting_new_clients === false) {
    reasons.push('Does not appear to be accepting new clients.');
  }

  return { passed: reasons.length === 0, reasons };
}

export function scorePracticalFit(therapist: NormalizedTherapistProfile, input: PracticalFitInput): PracticalFitResult {
  const language = languageFit(therapist, input);
  const insurance = insuranceFit(therapist, input.insuranceProvider);
  const locationMode = locationModeFit(therapist, input);
  const availability = availabilityFit(therapist);
  const affordability = affordabilityFit(therapist, budgetToMaxFee(input.budgetRange, input.maxFee));
  const unknownFactors = [language, insurance, locationMode, availability, affordability].filter((score) => score === 0.5).length;
  const profileQualityPenalty = Math.max(0, unknownFactors * 0.04);
  const score =
    PRACTICAL_FIT_WEIGHTS.languageFit * language +
    PRACTICAL_FIT_WEIGHTS.insuranceFit * insurance +
    PRACTICAL_FIT_WEIGHTS.locationModeFit * locationMode +
    PRACTICAL_FIT_WEIGHTS.availabilityFit * availability +
    PRACTICAL_FIT_WEIGHTS.affordabilityFit * affordability -
    profileQualityPenalty;

  return {
    score: Math.max(0, Math.min(1, score)),
    languageFit: language,
    insuranceFit: insurance,
    locationModeFit: locationMode,
    availabilityFit: availability,
    affordabilityFit: affordability,
    profileQualityPenalty,
  };
}
