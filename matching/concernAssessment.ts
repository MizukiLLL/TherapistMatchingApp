import { normalizeConcernTags, tagsFromText, uniqueTags } from './clinicalTagNormalizer.ts';

export type ConcernAssessmentInput = {
  selectedConcerns: string[];
  freeTextNotes?: string[];
};

function compact(values: Array<string | undefined | null>): string[] {
  return values.map((value) => value?.trim() ?? '').filter(Boolean);
}

export function buildConcernAssessment(input: ConcernAssessmentInput): { displayConcerns: string[]; concernTags: string[] } {
  const displayConcerns = compact(input.selectedConcerns ?? []);
  const freeText = compact(input.freeTextNotes ?? []).join(' ');
  const concernTags = uniqueTags([...normalizeConcernTags(displayConcerns), ...tagsFromText(freeText)]);

  return {
    displayConcerns: displayConcerns.slice(0, 6),
    concernTags,
  };
}
