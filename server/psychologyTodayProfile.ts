import type { CnipConversationStyleProfile, TherapistDirectoryRecord, TherapistInsurance } from './therapistDirectory.ts';

export type PsychologyTodayProfilePayload = {
  id?: string;
  profileUrl?: string;
  url?: string;
  name?: string;
  fullName?: string;
  credentials?: string;
  bio?: string;
  location?: string;
  languages?: string[];
  licenseStates?: string[];
  areaCodes?: string[];
  areaCodesServed?: string[];
  zipCodes?: string[];
  expertise?: string[];
  therapyTypes?: string[];
  therapyModels?: string[];
  conversationStyleProfile?: CnipConversationStyleProfile;
  sessionFormats?: string[];
  insuranceProviders?: string[];
  insurance?: Array<Partial<TherapistInsurance>>;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
};

export type PsychologyTodayScrapeResult = {
  profile: PsychologyTodayProfilePayload;
  meta: {
    sourceUrl: string;
    fetchedAt: string;
    extractionSignals: string[];
  };
};

export type PsychologyTodayDirectoryFetchResult = {
  searchUrl: string;
  profileUrls: string[];
  profiles: PsychologyTodayScrapeResult[];
  errors: Array<{ profileUrl: string; message: string }>;
};

export type PsychologyTodayProfileValidationError = {
  field: keyof PsychologyTodayProfilePayload;
  message: string;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(new Set(values.map((value) => normalize(String(value))).filter(Boolean)));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function compactWhitespace(value: string): string {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getAreaCodes(profile: PsychologyTodayProfilePayload): string[] {
  return normalizeList(profile.areaCodesServed).concat(normalizeList(profile.areaCodes), normalizeList(profile.zipCodes))
    .filter((value, index, values) => /^\d{5}$/.test(value) && values.indexOf(value) === index);
}

function getInsurance(profile: PsychologyTodayProfilePayload): TherapistInsurance[] {
  const structuredInsurance = Array.isArray(profile.insurance)
    ? profile.insurance
        .map((insurance) => ({
          provider: normalize(insurance.provider),
          plan: normalize(insurance.plan) || null,
          acceptingNewPatients: insurance.acceptingNewPatients !== false,
        }))
        .filter((insurance) => insurance.provider)
    : [];

  if (structuredInsurance.length > 0) {
    return structuredInsurance;
  }

  return normalizeList(profile.insuranceProviders).map((provider) => ({
    provider,
    plan: null,
    acceptingNewPatients: true,
  }));
}

function inferConversationStyleProfile(profile: PsychologyTodayProfilePayload): CnipConversationStyleProfile {
  if (profile.conversationStyleProfile) return profile.conversationStyleProfile;

  const text = [
    profile.bio,
    ...(profile.therapyModels ?? []),
    ...(profile.therapyTypes ?? []),
    ...(profile.expertise ?? []),
  ].join(' ').toLocaleLowerCase();
  const profileScore: CnipConversationStyleProfile = {
    directiveness: 5,
    emotionalIntensity: 5,
    pastOrientation: 5,
    warmSupport: 6,
  };

  if (/cbt|act|solution-focused|behavioral|skills|coach|practical|homework/.test(text)) {
    profileScore.directiveness += 3;
    profileScore.pastOrientation -= 2;
  }

  if (/emdr|trauma|somatic|emotion|experiential|intensive/.test(text)) {
    profileScore.emotionalIntensity += 3;
    profileScore.pastOrientation += 2;
  }

  if (/psychodynamic|psychoanalytic|childhood|attachment|depth|history/.test(text)) {
    profileScore.pastOrientation += 3;
    profileScore.emotionalIntensity += 1;
  }

  if (/family systems|internal family systems|ifs|narrative|relational|gottman|emotionally focused|supportive|warm/.test(text)) {
    profileScore.warmSupport += 3;
    profileScore.directiveness -= 1;
  }

  return {
    directiveness: Math.max(0, Math.min(10, profileScore.directiveness)),
    emotionalIntensity: Math.max(0, Math.min(10, profileScore.emotionalIntensity)),
    pastOrientation: Math.max(0, Math.min(10, profileScore.pastOrientation)),
    warmSupport: Math.max(0, Math.min(10, profileScore.warmSupport)),
  };
}

function getMetaContent(html: string, propertyName: string): string {
  const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const match = html.match(pattern);

  return match ? compactWhitespace(match[1]) : '';
}

function getTitle(html: string): string {
  return compactWhitespace(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
}

function getVisibleText(html: string): string {
  return compactWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function collectJsonLd(html: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]).trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          records.push(record);
          if (Array.isArray(record['@graph'])) {
            records.push(...record['@graph'].filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object'));
          }
        }
      }
    } catch {
      // PsychologyToday pages can include non-JSON script data; ignore malformed blocks.
    }
  }

  return records;
}

function stringFromJsonLd(records: Record<string, unknown>[], names: string[]): string {
  for (const record of records) {
    for (const name of names) {
      const value = record[name];
      if (typeof value === 'string' && value.trim()) return compactWhitespace(value);
    }
  }

  return '';
}

function getNameFromTitle(title: string): string {
  const firstPart = title.split('|')[0]?.trim() ?? title;
  return compactWhitespace(firstPart.replace(/\bTherapist\b.*$/i, '').replace(/,\s*(LCSW|LMFT|LMHC|LPCC|PsyD|PhD|MD)\b.*$/i, ''));
}

function getCredentialsFromText(text: string): string {
  const credentials = ['LCSW', 'LMFT', 'LMHC', 'LPCC', 'PsyD', 'PhD', 'MD', 'LPC', 'LMFT-S', 'AMFT'];
  return credentials.filter((credential) => new RegExp(`\\b${credential.replace('-', '\\-')}\\b`, 'i').test(text)).join(', ');
}

function pickKnownValues(text: string, knownValues: string[]): string[] {
  return knownValues.filter((value) => new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

function parseRate(text: string): { hourlyRateMin: number | undefined; hourlyRateMax: number | undefined } {
  const rangeMatch = text.match(/\$(\d{2,4})\s*(?:-|to|\u2013|\u2014)\s*\$?(\d{2,4})/i);
  if (rangeMatch) {
    return { hourlyRateMin: Number(rangeMatch[1]), hourlyRateMax: Number(rangeMatch[2]) };
  }

  const singleMatch = text.match(/\$(\d{2,4})\s*(?:per session|\/ session|\/session|session)/i);
  if (singleMatch) {
    return { hourlyRateMin: Number(singleMatch[1]), hourlyRateMax: Number(singleMatch[1]) };
  }

  return { hourlyRateMin: undefined, hourlyRateMax: undefined };
}

export function extractPsychologyTodayProfileFromHtml(sourceUrl: string, html: string): PsychologyTodayScrapeResult {
  const jsonLdRecords = collectJsonLd(html);
  const title = getMetaContent(html, 'og:title') || getTitle(html);
  const description = getMetaContent(html, 'description') || getMetaContent(html, 'og:description') || stringFromJsonLd(jsonLdRecords, ['description']);
  const visibleText = getVisibleText(html);
  const searchableText = `${title} ${description} ${visibleText}`;
  const jsonLdName = stringFromJsonLd(jsonLdRecords, ['name']);
  const jsonLdUrl = stringFromJsonLd(jsonLdRecords, ['url']);
  const knownLanguages = ['Mandarin', 'Cantonese', 'English', 'Spanish', 'Korean', 'Vietnamese', 'Japanese', 'Tagalog', 'Hindi', 'Arabic', 'French'];
  const knownTherapyTypes = [
    'Anxiety',
    'Depression',
    'Trauma / PTSD',
    'Relationship conflict',
    'Family boundaries',
    'Communication skills',
    'Career change',
    'Workplace conflict',
    'People-pleasing',
    'Stress and burnout',
    'Self-esteem',
    'Social anxiety',
    'Identity exploration',
    'Grief and loss',
    'ADHD or focus concerns',
    'Chronic pain',
    'Sleep problems',
    'Eating concerns',
    'Substance use concerns',
    'Parenthood',
    'Caregiving stress',
  ];
  const knownInsurers = ['Aetna', 'Cigna', 'UnitedHealthcare', 'Oxford', 'Oscar', 'Blue Shield', 'Kaiser', 'Premera', 'Regence', 'Anthem', 'Blue Cross'];
  const knownTherapyModels = [
    'CBT',
    'ACT',
    'EMDR',
    'Somatic Therapy',
    'Psychodynamic Therapy',
    'Emotionally Focused Therapy',
    'Family Systems',
    'Internal Family Systems',
    'Gottman Method',
    'Narrative Therapy',
    'Mindfulness-Based Therapy',
    'Solution-Focused Therapy',
    'Behavioral Activation',
  ];
  const zipCodes = Array.from(new Set((searchableText.match(/\b\d{5}\b/g) ?? []).filter((value) => !/^00000$/.test(value))));
  const stateMatches = Array.from(new Set((searchableText.match(/\b[A-Z]{2}\s+\d{5}\b/g) ?? []).map((value) => value.slice(0, 2))));
  const sessionFormats = [
    /telehealth|online therapy|online sessions|virtual/i.test(searchableText) ? 'Virtual' : '',
    /in-person|in person|office visits|office sessions/i.test(searchableText) ? 'InPerson' : '',
  ].filter(Boolean);
  const rates = parseRate(searchableText);
  const fullName = jsonLdName || getNameFromTitle(title);
  const extractionSignals = [
    jsonLdRecords.length > 0 ? 'json-ld' : '',
    title ? 'title' : '',
    description ? 'meta-description' : '',
    zipCodes.length > 0 ? 'zip-codes' : '',
    sessionFormats.length > 0 ? 'session-format' : '',
  ].filter(Boolean);

  return {
    profile: {
      profileUrl: jsonLdUrl || sourceUrl,
      fullName,
      credentials: getCredentialsFromText(searchableText),
      bio: description,
      languages: pickKnownValues(searchableText, knownLanguages),
      licenseStates: stateMatches,
      areaCodes: zipCodes,
      expertise: pickKnownValues(searchableText, knownTherapyTypes),
      therapyModels: pickKnownValues(searchableText, knownTherapyModels),
      sessionFormats,
      insuranceProviders: pickKnownValues(searchableText, knownInsurers),
      hourlyRateMin: rates.hourlyRateMin,
      hourlyRateMax: rates.hourlyRateMax,
    },
    meta: {
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      extractionSignals,
    },
  };
}

export async function fetchPsychologyTodayProfile(sourceUrl: string): Promise<PsychologyTodayScrapeResult> {
  const url = new URL(sourceUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('profileUrl must be an http or https URL.');
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; TherapistMatchingApp/1.0; +https://example.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch PsychologyToday profile: HTTP ${response.status}.`);
  }

  const html = await response.text();
  return extractPsychologyTodayProfileFromHtml(url.toString(), html);
}

function slugifySearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractProfileUrlsFromDirectoryHtml(html: string): string[] {
  const urls = new Set<string>();
  const hrefPattern = /href=["']([^"']*\/us\/therapists\/[^"']+\/\d+[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(html)) !== null) {
    try {
      const url = new URL(decodeHtml(match[1]), 'https://www.psychologytoday.com');
      url.hash = '';
      urls.add(url.toString());
    } catch {
      // Ignore malformed hrefs.
    }
  }

  return Array.from(urls);
}

export async function fetchPsychologyTodayDirectoryProfiles(input: {
  areaCode: string;
  therapyType?: string;
  limit?: number;
}): Promise<PsychologyTodayDirectoryFetchResult> {
  const issueSlug = input.therapyType ? `${slugifySearchValue(input.therapyType)}/` : '';
  const searchUrl = `https://www.psychologytoday.com/us/therapists/${issueSlug}${encodeURIComponent(input.areaCode)}`;
  const response = await fetch(searchUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; TherapistMatchingApp/1.0; +https://example.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch PsychologyToday directory: HTTP ${response.status}.`);
  }

  const html = await response.text();
  const profileUrls = extractProfileUrlsFromDirectoryHtml(html).slice(0, input.limit ?? 5);
  const profiles: PsychologyTodayScrapeResult[] = [];
  const errors: Array<{ profileUrl: string; message: string }> = [];

  for (const profileUrl of profileUrls) {
    try {
      profiles.push(await fetchPsychologyTodayProfile(profileUrl));
    } catch (error) {
      errors.push({
        profileUrl,
        message: error instanceof Error ? error.message : 'Could not fetch profile.',
      });
    }
  }

  return {
    searchUrl,
    profileUrls,
    profiles,
    errors,
  };
}

export function normalizePsychologyTodayProfile(profile: PsychologyTodayProfilePayload): {
  therapist?: TherapistDirectoryRecord & { sourceProfileUrl: string };
  errors: PsychologyTodayProfileValidationError[];
} {
  const profileUrl = normalize(profile.profileUrl) || normalize(profile.url);
  const fullName = normalize(profile.fullName) || normalize(profile.name);
  const credentials = normalize(profile.credentials);
  const areaCodesServed = getAreaCodes(profile);
  const therapyModels = normalizeList(profile.therapyModels);
  const therapyTypes = normalizeList(profile.therapyTypes).concat(normalizeList(profile.expertise))
    .filter((value, index, values) => values.findIndex((candidate) => candidate.toLocaleLowerCase() === value.toLocaleLowerCase()) === index);
  const insurance = getInsurance(profile);
  const errors: PsychologyTodayProfileValidationError[] = [];

  if (!profileUrl) {
    errors.push({ field: 'profileUrl', message: 'profileUrl or url is required.' });
  }

  if (!fullName) {
    errors.push({ field: 'fullName', message: 'fullName or name is required.' });
  }

  if (areaCodesServed.length === 0) {
    errors.push({ field: 'areaCodesServed', message: 'At least one 5-digit area code or ZIP code is required.' });
  }

  if (therapyTypes.length === 0) {
    errors.push({ field: 'therapyTypes', message: 'At least one therapy type, expertise, or therapy model is required.' });
  }

  if (insurance.length === 0) {
    errors.push({ field: 'insuranceProviders', message: 'At least one insurance provider is required.' });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const sessionFormats = normalizeList(profile.sessionFormats).map((value) => value.toLocaleLowerCase());
  const id = normalize(profile.id) || `pt-${slugify(fullName)}-${slugify(areaCodesServed[0])}`;

  return {
    therapist: {
      id,
      fullName,
      credentials: credentials || 'Therapist',
      bio: normalize(profile.bio) || `PsychologyToday profile for ${fullName}.`,
      languages: normalizeList(profile.languages).length > 0 ? normalizeList(profile.languages) : ['English'],
      licenseStates: normalizeList(profile.licenseStates),
      areaCodesServed,
      therapyTypes,
      therapyModels,
      conversationStyleProfile: inferConversationStyleProfile(profile),
      telehealthAvailable: sessionFormats.length === 0 || sessionFormats.includes('virtual') || sessionFormats.includes('telehealth') || sessionFormats.includes('online'),
      inPersonAvailable: sessionFormats.length === 0 || sessionFormats.includes('inperson') || sessionFormats.includes('in-person') || sessionFormats.includes('office'),
      hourlyRateMin: typeof profile.hourlyRateMin === 'number' ? profile.hourlyRateMin : null,
      hourlyRateMax: typeof profile.hourlyRateMax === 'number' ? profile.hourlyRateMax : null,
      isActive: true,
      profileUrl,
      insurance,
      sourceProfileUrl: profileUrl,
    },
    errors,
  };
}
