import type { TherapistDirectoryRecord } from '../server/therapistDirectory.ts';
import { normalizeConcernTags, tagsFromText, uniqueTags } from './clinicalTagNormalizer.ts';
import { inferTherapistStyleFromText } from './therapistStyleInference.ts';
import type { NormalizedTherapistProfile } from './matchingTypes.ts';

function compact(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim() ?? '').filter(Boolean)));
}

function practicalCompleteness(therapist: TherapistDirectoryRecord): number {
  const factors = [
    therapist.languages.length > 0,
    therapist.licenseStates.length > 0,
    therapist.areaCodesServed.length > 0,
    therapist.insurance.length > 0,
    therapist.telehealthAvailable !== undefined || therapist.inPersonAvailable !== undefined,
    therapist.hourlyRateMin !== null || therapist.hourlyRateMax !== null,
  ];
  return factors.filter(Boolean).length / factors.length;
}

export function normalizeTherapistProfile(therapist: TherapistDirectoryRecord): NormalizedTherapistProfile {
  const sourceText = [
    therapist.bio,
    therapist.therapyModels.join(' '),
    therapist.therapyTypes.join(' '),
    therapist.languages.join(' '),
    therapist.licenseStates.join(' '),
  ].join(' ');
  const style = inferTherapistStyleFromText(sourceText);
  const completeness = practicalCompleteness(therapist);
  const availabilitySignal = therapist.telehealthAvailable || therapist.inPersonAvailable ? 1 : 0.35;
  const profileQualityTrust = Math.round(Math.min(1, 0.35 * completeness + 0.25 * style.signalStrength + 0.2 * completeness + 0.2 * availabilitySignal) * 100) / 100;

  return {
    therapist_id: therapist.id,
    name: therapist.fullName,
    normalized_tags: {
      issues: uniqueTags([...normalizeConcernTags(therapist.therapyTypes), ...tagsFromText(therapist.bio)]),
      modalities: compact(therapist.therapyModels.map((model) => model.toLocaleLowerCase())),
      populations: [],
      communities: tagsFromText(therapist.bio).filter((tag) => ['immigration_bicultural', 'lgbtq', 'identity'].includes(tag)),
    },
    practical: {
      languages: therapist.languages,
      states: therapist.licenseStates,
      zip_codes_or_locations: therapist.areaCodesServed,
      insurance: therapist.insurance.filter((insurance) => insurance.acceptingNewPatients).map((insurance) => insurance.provider),
      fee_min: therapist.hourlyRateMin,
      fee_max: therapist.hourlyRateMax,
      telehealth: therapist.telehealthAvailable,
      in_person: therapist.inPersonAvailable,
      accepting_new_clients: therapist.insurance.length > 0 ? therapist.insurance.some((insurance) => insurance.acceptingNewPatients) : null,
    },
    style_vector: style.styleVector,
    style_confidence: style.confidence,
    profile_quality_trust: profileQualityTrust,
    sourceText,
  };
}
