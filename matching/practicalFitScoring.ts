import { PRACTICAL_FIT_WEIGHTS } from './matchingConfig.ts';
import type { NormalizedTherapistProfile } from './matchingTypes.ts';

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

function locationModeFit(therapist: NormalizedTherapistProfile, input: PracticalFitInput): number {
  const preference = normalize(input.carePreference);
  const zipMatch = therapist.practical.zip_codes_or_locations.includes(input.areaCode);

  if (preference === 'virtual') return therapist.practical.telehealth === true ? 1 : therapist.practical.telehealth === null ? 0.5 : 0;
  if (preference === 'inperson' || preference === 'in_person') return zipMatch && therapist.practical.in_person !== false ? 1 : 0;
  if (zipMatch) return 1;
  if (therapist.practical.telehealth) return 0.8;
  return 0.45;
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

  if (preference === 'virtual' && therapist.practical.telehealth === false) {
    reasons.push('Does not list virtual sessions.');
  }

  if ((preference === 'inperson' || preference === 'in_person') && (!therapist.practical.in_person || !therapist.practical.zip_codes_or_locations.includes(input.areaCode))) {
    reasons.push('Does not appear compatible with in-person location.');
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
