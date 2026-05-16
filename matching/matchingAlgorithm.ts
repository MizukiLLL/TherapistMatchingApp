import { countTagMatches, normalizeConcernTags } from './clinicalTagNormalizer.ts';
import { MATCHING_WEIGHTS, STYLE_FIT_WEIGHTS } from './matchingConfig.ts';
import { buildMatchExplanation } from './matchExplanation.ts';
import type { IlluminMatchResult, NormalizedTherapistProfile, StyleVector } from './matchingTypes.ts';
import { applyHardFilters, scorePracticalFit, type PracticalFitInput } from './practicalFitScoring.ts';

export type AlgorithmInput = PracticalFitInput & {
  userConcernTags: string[];
  rawUserConcerns: string[];
  userStyleVector: StyleVector;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function scoreClinicalFit(userTags: string[], therapist: NormalizedTherapistProfile): { score: number; matchedTags: string[] } {
  if (userTags.length === 0) return { score: 0.65, matchedTags: [] };
  const therapistTags = therapist.normalized_tags.issues;
  const matchedTags = userTags.filter((tag) => therapistTags.includes(tag));
  const exactRatio = countTagMatches(userTags, therapistTags) / userTags.length;
  return { score: clamp01(exactRatio), matchedTags };
}

export function scoreStyleFit(user: StyleVector, therapist: NormalizedTherapistProfile): { rawStyleFit: number; adjustedStyleFit: number } {
  const directionFit = 1 - Math.abs(user.therapist_directive - therapist.style_vector.therapist_directive);
  const emotionFit = 1 - Math.abs(user.emotionally_intensive - therapist.style_vector.emotionally_intensive);
  const timeFit = 1 - Math.abs(user.past_focused - therapist.style_vector.past_focused);
  const stanceFit = 1 - Math.abs(user.support_focused - therapist.style_vector.support_focused);
  const rawStyleFit =
    STYLE_FIT_WEIGHTS.directionFit * directionFit +
    STYLE_FIT_WEIGHTS.emotionFit * emotionFit +
    STYLE_FIT_WEIGHTS.timeFit * timeFit +
    STYLE_FIT_WEIGHTS.stanceFit * stanceFit;

  return {
    rawStyleFit,
    adjustedStyleFit: rawStyleFit * (0.7 + 0.3 * therapist.style_confidence),
  };
}

export function scoreCulturalLanguageFit(input: AlgorithmInput, therapist: NormalizedTherapistProfile): number {
  const preferred = (input.preferredLanguage ?? '').toLocaleLowerCase();
  const exactLanguageFit = preferred && therapist.practical.languages.some((language) => language.toLocaleLowerCase() === preferred) ? 1 : preferred ? 0 : 0.7;
  const text = therapist.sourceText.toLocaleLowerCase();
  const culturalExperienceFit = /asian|asian american|immigrant|bicultural|international students|first-generation|culturally responsive|culturally sensitive|chinese|mandarin|cantonese/.test(text) ? 1 : 0.3;
  const identityPopulationFit = therapist.normalized_tags.communities.some((tag) => ['immigration_bicultural', 'identity'].includes(tag)) ? 1 : 0.4;
  return clamp01(0.6 * exactLanguageFit + 0.25 * culturalExperienceFit + 0.15 * identityPopulationFit);
}

function practicalSummary(input: AlgorithmInput, therapist: NormalizedTherapistProfile): string[] {
  const lines: string[] = [];
  if (input.preferredLanguage && therapist.practical.languages.some((language) => language.toLocaleLowerCase() === input.preferredLanguage?.toLocaleLowerCase())) {
    lines.push(`Lists ${input.preferredLanguage} as a session language.`);
  }
  if (input.carePreference === 'Virtual' && therapist.practical.telehealth) lines.push('Offers virtual sessions.');
  if (input.carePreference === 'InPerson' && therapist.practical.zip_codes_or_locations.includes(input.areaCode)) lines.push(`Appears compatible with ZIP ${input.areaCode}.`);
  if (input.insuranceProvider && therapist.practical.insurance.some((insurance) => insurance.toLocaleLowerCase() === input.insuranceProvider?.toLocaleLowerCase())) {
    lines.push(`Lists ${input.insuranceProvider} insurance.`);
  }
  return lines.length > 0 ? lines : ['Practical details should be confirmed before booking.'];
}

export function rankTherapists(input: AlgorithmInput, therapists: NormalizedTherapistProfile[]): IlluminMatchResult[] {
  const userTags = input.userConcernTags.length > 0 ? input.userConcernTags : normalizeConcernTags(input.rawUserConcerns);

  return therapists
    .map((therapist) => ({ therapist, hardFilter: applyHardFilters(therapist, input) }))
    .filter(({ hardFilter }) => hardFilter.passed)
    .map(({ therapist }) => {
      const practicalFit = scorePracticalFit(therapist, input).score;
      const clinical = scoreClinicalFit(userTags, therapist);
      const style = scoreStyleFit(input.userStyleVector, therapist);
      const culturalLanguageFit = scoreCulturalLanguageFit(input, therapist);
      const finalScore =
        MATCHING_WEIGHTS.practicalFit * practicalFit +
        MATCHING_WEIGHTS.clinicalFit * clinical.score +
        MATCHING_WEIGHTS.adjustedStyleFit * style.adjustedStyleFit +
        MATCHING_WEIGHTS.profileQualityTrust * therapist.profile_quality_trust;

      return {
        therapistId: therapist.therapist_id,
        therapistName: therapist.name,
        finalScore: round2(finalScore),
        scoreBreakdown: {
          practicalFit: round2(practicalFit),
          clinicalFit: round2(clinical.score),
          adjustedStyleFit: round2(style.adjustedStyleFit),
          culturalLanguageFit: round2(culturalLanguageFit),
          profileQualityTrust: round2(therapist.profile_quality_trust),
        },
        styleVector: therapist.style_vector,
        styleConfidence: therapist.style_confidence,
        explanation: buildMatchExplanation({
          therapist,
          matchedClinicalTags: clinical.matchedTags,
          practicalSummary: practicalSummary(input, therapist),
          styleFit: style.adjustedStyleFit,
          culturalLanguageFit,
        }),
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore || a.therapistName.localeCompare(b.therapistName));
}
