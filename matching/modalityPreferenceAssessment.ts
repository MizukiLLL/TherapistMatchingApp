import type { ModalityPreferenceId, RecommendedModality } from './matchingTypes.ts';
import { MODALITY_PREFERENCE_OPTIONS } from './modalityCheatSheet.ts';

function uniqueById(modalities: RecommendedModality[]): RecommendedModality[] {
  const seen = new Set<string>();
  return modalities.filter((modality) => {
    if (seen.has(modality.modalityId)) return false;
    seen.add(modality.modalityId);
    return true;
  });
}

export function getRecommendedModalities(preferenceIds: ModalityPreferenceId[], concernTags: string[] = []): RecommendedModality[] {
  const selected = MODALITY_PREFERENCE_OPTIONS.filter((option) => preferenceIds.includes(option.id)).flatMap((option) => option.recommendedModalities);
  const concernBased: RecommendedModality[] = [];
  const tagSet = new Set(concernTags);

  if (['anxiety', 'depression', 'stress_burnout', 'sleep', 'adhd'].some((tag) => tagSet.has(tag))) {
    concernBased.push({
      modalityId: 'cbt',
      displayName: 'CBT',
      explanation: 'May help with anxiety, stress, mood, sleep, or focus by building practical skills.',
      reason: 'Your concerns may benefit from concrete tools and patterns to practice.',
    });
  }

  if (['trauma', 'grief', 'chronic_illness', 'pain'].some((tag) => tagSet.has(tag))) {
    concernBased.push({
      modalityId: 'trauma_informed',
      displayName: 'Trauma-informed therapy',
      explanation: 'May help pace therapy carefully around painful experiences or body-based stress.',
      reason: 'Your concerns may need a steady, safety-aware approach.',
    });
  }

  if (['relationship_issues', 'family_conflict', 'identity', 'immigration_bicultural', 'lgbtq'].some((tag) => tagSet.has(tag))) {
    concernBased.push({
      modalityId: 'narrative',
      displayName: 'Narrative therapy',
      explanation: 'May help explore identity, relationships, culture, and the meanings around your experiences.',
      reason: 'Your concerns may benefit from a contextual and story-aware approach.',
    });
  }

  return uniqueById([...selected, ...concernBased]).slice(0, 6);
}
