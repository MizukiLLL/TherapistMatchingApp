import type { MatchExplanation, NormalizedTherapistProfile } from './matchingTypes.ts';

function stylePhrase(vector: NormalizedTherapistProfile['style_vector']): string {
  const support = vector.support_focused >= 0.58 ? 'supportive' : 'growth-oriented';
  const direction = vector.therapist_directive >= 0.58 ? 'structured' : 'collaborative';
  const depth = vector.past_focused >= 0.58 ? 'reflective' : 'present-focused';
  return `${support}, ${direction}, and ${depth}`;
}

export function buildMatchExplanation(input: {
  therapist: NormalizedTherapistProfile;
  matchedClinicalTags: string[];
  practicalSummary: string[];
  styleFit: number;
  culturalLanguageFit: number;
}): MatchExplanation {
  const bullets = [
    ...input.practicalSummary.slice(0, 2),
    input.matchedClinicalTags.length > 0
      ? `Works with concerns related to ${input.matchedClinicalTags.slice(0, 3).join(', ')}.`
      : 'Has a profile that may still be worth reviewing, though concern overlap is limited.',
    `Their profile suggests a ${stylePhrase(input.therapist.style_vector)} conversation style.`,
  ];

  if (input.culturalLanguageFit >= 0.75) {
    bullets.push('May offer meaningful language or cultural fit based on listed profile details.');
  }

  return {
    headline: 'Why this therapist may fit you',
    bullets,
    confidenceNote:
      input.therapist.style_confidence < 0.55
        ? 'Their profile gives some clues about communication style, but this should be confirmed in a consultation.'
        : undefined,
  };
}
