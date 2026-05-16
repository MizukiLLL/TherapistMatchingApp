import type { NormalizedTherapistProfile, RecommendedModality } from './matchingTypes.ts';
import { MODALITY_ALIASES } from './modalityCheatSheet.ts';

function normalize(value?: string): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function aliasesFor(modalityId: string, displayName: string): string[] {
  return MODALITY_ALIASES[modalityId] ?? [normalize(displayName)];
}

export function scoreModalityFit(therapist: NormalizedTherapistProfile, recommendedModalities: RecommendedModality[]): { score: number; matchedModalities: string[] } {
  if (recommendedModalities.length === 0) return { score: 0.65, matchedModalities: [] };

  const modalityText = [...therapist.normalized_tags.modalities, therapist.sourceText].join(' ').toLocaleLowerCase();
  const matchedModalities = recommendedModalities
    .filter((modality) => aliasesFor(modality.modalityId, modality.displayName).some((alias) => modalityText.includes(normalize(alias))))
    .map((modality) => modality.displayName);

  const score = Math.min(1, matchedModalities.length / Math.min(recommendedModalities.length, 3));
  return {
    score: Math.max(0.25, score),
    matchedModalities,
  };
}
