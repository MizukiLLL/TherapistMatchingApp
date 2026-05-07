import { getAllTherapists } from './backendStore.ts';
import type { TherapistDirectoryRecord, TherapistInsurance } from './therapistDirectory.ts';

export type TherapistSearchFilters = {
  areaCode: string;
  therapyType: string;
  insuranceProvider: string;
  insurancePlan?: string;
  limit: number;
};

export type TherapistSearchValidationError = {
  field: keyof TherapistSearchFilters;
  message: string;
};

export type TherapistSearchResult = Omit<TherapistDirectoryRecord, 'insurance' | 'isActive'> & {
  matchingInsurance: TherapistInsurance[];
  matchReasons: string[];
};

export type TherapistSearchResponse = {
  data: TherapistSearchResult[];
  meta: {
    filters: TherapistSearchFilters;
    total: number;
    elapsedMs: number;
    generatedAt: string;
  };
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeForCompare(value: string | null | undefined): string {
  return normalize(value).toLocaleLowerCase();
}

function getQueryValue(params: URLSearchParams, names: string[]): string {
  for (const name of names) {
    const value = normalize(params.get(name));
    if (value) return value;
  }

  return '';
}

function parseLimit(rawLimit: string): number {
  if (!rawLimit) return DEFAULT_LIMIT;

  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed)) return DEFAULT_LIMIT;

  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

export function parseTherapistSearchFilters(params: URLSearchParams): {
  filters: TherapistSearchFilters;
  errors: TherapistSearchValidationError[];
} {
  const filters: TherapistSearchFilters = {
    areaCode: getQueryValue(params, ['areaCode', 'zip', 'zipCode']),
    therapyType: getQueryValue(params, ['therapyType', 'type']),
    insuranceProvider: getQueryValue(params, ['insuranceProvider', 'insurance']),
    insurancePlan: getQueryValue(params, ['insurancePlan', 'plan']) || undefined,
    limit: parseLimit(getQueryValue(params, ['limit'])),
  };
  const errors: TherapistSearchValidationError[] = [];

  if (!/^\d{5}$/.test(filters.areaCode)) {
    errors.push({ field: 'areaCode', message: 'areaCode must be a 5-digit U.S. ZIP code.' });
  }

  if (!filters.therapyType) {
    errors.push({ field: 'therapyType', message: 'therapyType is required.' });
  }

  if (!filters.insuranceProvider) {
    errors.push({ field: 'insuranceProvider', message: 'insuranceProvider is required. The insurance alias is also supported.' });
  }

  return { filters, errors };
}

function hasValue(values: string[], expected: string): boolean {
  const expectedValue = normalizeForCompare(expected);
  return values.some((value) => normalizeForCompare(value) === expectedValue);
}

function getMatchingInsurance(therapist: TherapistDirectoryRecord, filters: TherapistSearchFilters): TherapistInsurance[] {
  const provider = normalizeForCompare(filters.insuranceProvider);
  const plan = normalizeForCompare(filters.insurancePlan);

  return therapist.insurance.filter((insurance) => {
    if (!insurance.acceptingNewPatients) return false;
    if (normalizeForCompare(insurance.provider) !== provider) return false;
    if (!plan) return true;

    return normalizeForCompare(insurance.plan) === plan;
  });
}

function toSearchResult(therapist: TherapistDirectoryRecord, matchingInsurance: TherapistInsurance[], filters: TherapistSearchFilters): TherapistSearchResult {
  const { insurance: _insurance, isActive: _isActive, ...publicTherapist } = therapist;

  return {
    ...publicTherapist,
    matchingInsurance,
    matchReasons: [
      `Serves ZIP code ${filters.areaCode}.`,
      `Supports ${filters.therapyType}.`,
      filters.insurancePlan
        ? `Accepts ${filters.insuranceProvider} ${filters.insurancePlan}.`
        : `Accepts ${filters.insuranceProvider}.`,
    ],
  };
}

export function searchTherapists(filters: TherapistSearchFilters, directory = getAllTherapists()): TherapistSearchResult[] {
  return directory
    .filter((therapist) => therapist.isActive)
    .map((therapist) => ({
      therapist,
      matchingInsurance: getMatchingInsurance(therapist, filters),
    }))
    .filter(({ therapist, matchingInsurance }) => {
      return (
        therapist.areaCodesServed.includes(filters.areaCode) &&
        hasValue(therapist.therapyTypes, filters.therapyType) &&
        matchingInsurance.length > 0
      );
    })
    .map(({ therapist, matchingInsurance }) => toSearchResult(therapist, matchingInsurance, filters))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .slice(0, filters.limit);
}

export function buildTherapistSearchResponse(filters: TherapistSearchFilters, directory = getAllTherapists()): TherapistSearchResponse {
  const startedAt = performance.now();
  const data = searchTherapists(filters, directory);

  return {
    data,
    meta: {
      filters,
      total: data.length,
      elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100,
      generatedAt: new Date().toISOString(),
    },
  };
}
