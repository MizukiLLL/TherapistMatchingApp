const tagRules: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'anxiety', patterns: [/anxiety/i, /panic/i, /worr/i] },
  { tag: 'depression', patterns: [/depression/i, /low mood/i, /mood/i] },
  { tag: 'trauma', patterns: [/trauma/i, /ptsd/i, /emdr/i] },
  { tag: 'stress_burnout', patterns: [/stress/i, /burnout/i, /overwhelm/i] },
  { tag: 'grief', patterns: [/grief/i, /loss/i] },
  { tag: 'relationship_issues', patterns: [/relationship/i, /dating/i, /intimacy/i, /communication/i] },
  { tag: 'family_conflict', patterns: [/family/i, /parent/i, /boundar/i, /caregiving/i] },
  { tag: 'life_transition', patterns: [/transition/i, /relocation/i, /retirement/i, /college/i, /school/i, /job loss/i] },
  { tag: 'identity', patterns: [/identity/i, /self-discovery/i, /self understanding/i] },
  { tag: 'immigration_bicultural', patterns: [/immigration/i, /acculturation/i, /bicultural/i, /cultural/i, /international/i] },
  { tag: 'lgbtq', patterns: [/lgbt/i, /queer/i, /trans/i] },
  { tag: 'self_esteem', patterns: [/self-esteem/i, /confidence/i, /people-pleasing/i] },
  { tag: 'sleep', patterns: [/sleep/i, /insomnia/i] },
  { tag: 'chronic_illness', patterns: [/chronic illness/i, /serious diagnosis/i, /health/i, /medication/i] },
  { tag: 'pain', patterns: [/pain/i, /chronic pain/i] },
  { tag: 'pregnancy_postpartum', patterns: [/pregnancy/i, /postpartum/i, /fertility/i] },
  { tag: 'neurodivergence', patterns: [/neurodiverg/i] },
  { tag: 'adhd', patterns: [/adhd/i, /focus/i] },
  { tag: 'autism', patterns: [/autis/i] },
  { tag: 'work_career', patterns: [/career/i, /work/i, /workplace/i, /job/i] },
];

export function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.filter(Boolean)));
}

export function normalizeConcernTags(values: string[]): string[] {
  const tags: string[] = [];

  for (const value of values) {
    for (const rule of tagRules) {
      if (rule.patterns.some((pattern) => pattern.test(value))) {
        tags.push(rule.tag);
      }
    }
  }

  return uniqueTags(tags);
}

export function tagsFromText(text: string): string[] {
  return normalizeConcernTags([text]);
}

export function countTagMatches(userTags: string[], therapistTags: string[]): number {
  const therapistSet = new Set(therapistTags);
  return userTags.filter((tag) => therapistSet.has(tag)).length;
}
