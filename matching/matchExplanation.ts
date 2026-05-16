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
  matchedModalities?: string[];
  practicalSummary: string[];
  styleFit: number;
  culturalLanguageFit: number;
}): MatchExplanation {
  const bullets = [
    input.matchedClinicalTags.length > 0
      ? `Works with concerns related to ${input.matchedClinicalTags.slice(0, 3).join(', ')}.`
      : 'Has a profile that may still be worth reviewing, though concern overlap is limited.',
    input.matchedModalities?.length
      ? `Offers therapy approaches that match your profile, including ${input.matchedModalities.slice(0, 3).join(', ')}.`
      : 'Therapy approach fit is worth confirming in consultation.',
    ...input.practicalSummary.slice(0, 2),
    input.culturalLanguageFit >= 0.75
      ? 'May match your language, cultural, or context preferences based on listed details.'
      : 'Language or cultural context fit may need confirmation.',
    `Their profile suggests a ${stylePhrase(input.therapist.style_vector)} conversation style.`,
  ];

  return {
    headline: 'Why this therapist may fit you',
    bullets,
    confidenceNote:
      input.therapist.style_confidence < 0.55
        ? 'Their profile gives some clues about communication style, but this should be confirmed in a consultation.'
        : undefined,
  };
}
