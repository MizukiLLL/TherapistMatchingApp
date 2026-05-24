export const LANGUAGE_OPTIONS = [
  'English',
  'Mandarin',
  'Cantonese',
  'Spanish',
  'Korean',
  'Japanese',
  'Vietnamese',
  'Tagalog',
  'Arabic',
  'Hindi / Urdu',
  'French',
  'Other',
] as const;

export const CULTURAL_CONTEXT_OPTIONS = [
  'Asian / Asian American experience',
  'Black / African American experience',
  'Latinx / Hispanic experience',
  'Middle Eastern / North African experience',
  'South Asian experience',
  'Southeast Asian experience',
  'Pacific Islander experience',
  'Indigenous / Native experience',
  'immigrant or bicultural experience',
  'international student experience',
  'first-generation experience',
  'interracial or multicultural family',
  'religious or spiritual background',
  'LGBTQ+ identity',
  'gender identity',
  'neurodivergence',
  'disability',
  'chronic illness',
  'no strong preference',
] as const;

export function formatBudgetRange(value: string): string {
  if (value === 'under_75') return 'Under $75';
  if (value === '75_125') return '$75-$125';
  if (value === '125_175') return '$125-$175';
  if (value === '175_250') return '$175-$250';
  if (value === 'flexible') return 'Flexible';
  return 'Not specified';
}
