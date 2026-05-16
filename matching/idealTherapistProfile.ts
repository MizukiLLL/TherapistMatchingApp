import type { IdealTherapistProfile, ModalityPreferenceId, StyleVector } from './matchingTypes.ts';
import { buildConcernAssessment } from './concernAssessment.ts';
import { getRecommendedModalities } from './modalityPreferenceAssessment.ts';

export type IdealTherapistProfileInput = {
  userStyleVector: StyleVector;
  selectedConcerns: string[];
  freeTextNotes?: string[];
  modalityPreferenceIds: ModalityPreferenceId[];
};

function styleDescriptors(vector: StyleVector): string[] {
  const directive = vector.therapist_directive >= 0.58;
  const intensive = vector.emotionally_intensive >= 0.58;
  const past = vector.past_focused >= 0.55;
  const supportive = vector.support_focused >= 0.58;

  return [
    supportive ? 'warm and validating' : 'honest and growth-oriented',
    directive ? 'gently structured' : 'collaborative and client-led',
    past ? 'open to exploring deeper patterns' : 'present-focused',
    intensive ? 'comfortable with deeper emotions' : 'emotionally steady',
  ];
}

export function generateIdealTherapistProfileFromInputs(input: IdealTherapistProfileInput): IdealTherapistProfile {
  const concernAssessment = buildConcernAssessment({
    selectedConcerns: input.selectedConcerns,
    freeTextNotes: input.freeTextNotes,
  });
  const recommendedModalities = getRecommendedModalities(input.modalityPreferenceIds, concernAssessment.concernTags);
  const preferredConversationStyle = styleDescriptors(input.userStyleVector);
  const directive = input.userStyleVector.therapist_directive >= 0.58;
  const supportive = input.userStyleVector.support_focused >= 0.58;
  const past = input.userStyleVector.past_focused >= 0.55;

  const title = `${supportive ? 'Warm' : 'Growth-oriented'}, ${directive ? 'practical' : 'collaborative'} support${past ? ' with room for deeper understanding' : ' for what is happening now'}`;
  const mainConcerns = concernAssessment.displayConcerns.length ? concernAssessment.displayConcerns : ['what has been feeling hardest lately'];
  const modalityNames = recommendedModalities.slice(0, 3).map((modality) => modality.displayName);

  return {
    title,
    summary: `Based on your answers, you may benefit from a therapist who offers ${preferredConversationStyle.slice(0, 2).join(' and ')} support while helping with ${mainConcerns.slice(0, 3).join(', ')}.`,
    mainConcerns,
    preferredConversationStyle,
    recommendedModalities,
    whatToLookFor: [
      'A therapist who explains their approach clearly',
      directive ? 'A therapist who balances listening with practical guidance' : 'A therapist who lets the pace feel collaborative',
      past ? 'A therapist who can connect emotions, patterns, and next steps' : 'A therapist who can keep the work grounded in daily life',
      modalityNames.length ? `Experience with ${modalityNames.join(', ')}` : 'A therapy approach that matches what you hope to work on',
    ],
    consultationQuestions: [
      'How do you usually support clients with my main concerns?',
      modalityNames.length ? `Do you use ${modalityNames.join(', ')}, or another approach?` : 'What therapy approaches do you tend to use?',
      'How do you balance emotional support with practical tools?',
      'What does a first session with you usually feel like?',
    ],
    userStyleVector: input.userStyleVector,
    preferredTraits: preferredConversationStyle,
    lessHelpfulTraits: [
      supportive ? 'Overly confrontational too early' : 'Only validating without helping you shift patterns',
      directive ? 'Too open-ended without structure' : 'Too directive before trust is built',
      past ? 'Staying only on surface-level tips' : 'Diving too deeply too fast',
    ],
  };
}
