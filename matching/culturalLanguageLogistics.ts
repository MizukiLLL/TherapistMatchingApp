export type CulturalLanguageInput = {
  requiredLanguages?: string[];
  preferredLanguages?: string[];
  languagePriority?: 'required' | 'preferred' | 'flexible';
  culturalContextNeeds?: string[];
  identitySupportNeeds?: string[];
  culturePriority?: 'high' | 'medium' | 'low';
};

function normalize(value?: string): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function hasLanguage(languages: string[], expected: string): boolean {
  const normalized = normalize(expected);
  if (!normalized) return false;
  if (languages.some((language) => normalize(language) === normalized)) return true;
  if (/mandarin|cantonese|chinese/.test(normalized)) {
    return languages.some((language) => /mandarin|cantonese|chinese/i.test(language));
  }
  return false;
}

function textHasAny(text: string, values: string[]): boolean {
  const normalizedText = normalize(text);
  return values.some((value) => {
    const normalizedValue = normalize(value).replace(/\s*\/\s*/g, '|');
    return normalizedValue
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .some((part) => normalizedText.includes(part));
  });
}

export function requiredLanguagePass(languages: string[], input: CulturalLanguageInput): boolean {
  if (input.languagePriority !== 'required') return true;
  const required = input.requiredLanguages ?? [];
  if (required.length === 0) return true;
  return required.some((language) => hasLanguage(languages, language));
}

export function scoreCulturalLanguageFromLogistics(input: CulturalLanguageInput, therapist: { languages: string[]; sourceText: string; communities?: string[] }): number {
  const required = input.requiredLanguages ?? [];
  const preferred = input.preferredLanguages ?? [];
  const allLanguages = [...required, ...preferred];
  const exactLanguageFit =
    input.languagePriority === 'flexible' || allLanguages.length === 0
      ? 0.75
      : allLanguages.some((language) => hasLanguage(therapist.languages, language))
        ? 1
        : input.languagePriority === 'preferred'
          ? 0.35
          : 0;
  const culturalNeeds = [...(input.culturalContextNeeds ?? []), ...(input.identitySupportNeeds ?? [])].filter((need) => normalize(need) !== 'no strong preference');
  const priority = input.culturePriority ?? 'low';
  const culturalExperienceFit = culturalNeeds.length === 0 ? 0.7 : textHasAny(therapist.sourceText, culturalNeeds) ? 1 : priority === 'high' ? 0.25 : 0.45;
  const identityPopulationFit = culturalNeeds.length === 0 ? 0.7 : therapist.communities?.length ? 0.75 : 0.45;

  return Math.max(0, Math.min(1, 0.6 * exactLanguageFit + 0.25 * culturalExperienceFit + 0.15 * identityPopulationFit));
}
