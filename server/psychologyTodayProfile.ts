import { TherapistDirectoryRecord, TherapistInsurance } from './therapistDirectory';

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
  sessionFormats?: string[];
  insuranceProviders?: string[];
  insurance?: Array<Partial<TherapistInsurance>>;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
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

export function normalizePsychologyTodayProfile(profile: PsychologyTodayProfilePayload): {
  therapist?: TherapistDirectoryRecord & { sourceProfileUrl: string };
  errors: PsychologyTodayProfileValidationError[];
} {
  const profileUrl = normalize(profile.profileUrl) || normalize(profile.url);
  const fullName = normalize(profile.fullName) || normalize(profile.name);
  const credentials = normalize(profile.credentials);
  const areaCodesServed = getAreaCodes(profile);
  const therapyTypes = normalizeList(profile.therapyTypes).concat(normalizeList(profile.expertise), normalizeList(profile.therapyModels))
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
