import { buildTherapistSearchResponse, parseTherapistSearchFilters } from './therapistSearch';
import {
  getAllTherapists,
  getGeneratedMatches,
  getLatestTmtiProfile,
  getSavedOnboardingState,
  getUser,
  getUserPreferences,
  saveGeneratedMatches,
  saveTmtiProfileWithResponses,
  upsertLiveTherapist,
  upsertUser,
  upsertUserPreferences,
} from './backendStore';
import { buildMatchGenerationResponse, generateMatches, MatchGenerationRequest, resolveMatchPreferences } from './matchingEngine';
import { fetchPsychologyTodayDirectoryProfiles, fetchPsychologyTodayProfile, normalizePsychologyTodayProfile, PsychologyTodayProfilePayload } from './psychologyTodayProfile';
import { generateCnipConversationProfile, TmtiResponseInput } from './tmtiAdapter';

type JsonPayload = Record<string, unknown>;

const MAX_REQUEST_BYTES = 1024 * 1024;

function sendJson(response: any, statusCode: number, payload: JsonPayload): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function sendMethodNotAllowed(response: any, allowedMethods: string[]): void {
  response.setHeader('Allow', allowedMethods.join(', '));
  sendJson(response, 405, {
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Only ${allowedMethods.join(', ')} ${allowedMethods.length === 1 ? 'is' : 'are'} supported for this endpoint.`,
    },
  });
}

function readJsonBody(request: any): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    request.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString('utf8');
      if (rawBody.length > MAX_REQUEST_BYTES) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!rawBody.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    request.on('error', reject);
  });
}

function routeMatch(pathname: string, pattern: RegExp): RegExpMatchArray | null {
  return pathname.match(pattern);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function validationError(field: string, message: string) {
  return { field, message };
}

function validateUserPayload(body: Record<string, unknown>) {
  const errors = [];

  if (typeof body.id === 'string' && body.id.trim().length === 0) {
    errors.push(validationError('id', 'id cannot be blank when provided.'));
  }

  if (typeof body.email === 'string' && body.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.push(validationError('email', 'email must be a valid email address when provided.'));
  }

  if (typeof body.areaCode === 'string' && body.areaCode.trim().length > 0 && !/^\d{5}$/.test(body.areaCode.trim())) {
    errors.push(validationError('areaCode', 'areaCode must be a 5-digit U.S. ZIP code when provided.'));
  }

  return errors;
}

function validatePreferencePayload(body: Record<string, unknown>) {
  const errors = [];

  if (typeof body.areaCode === 'string' && body.areaCode.trim().length > 0 && !/^\d{5}$/.test(body.areaCode.trim())) {
    errors.push(validationError('areaCode', 'areaCode must be a 5-digit U.S. ZIP code when provided.'));
  }

  return errors;
}

function getTmtiResponses(body: Record<string, unknown>): TmtiResponseInput[] {
  if (!Array.isArray(body.responses)) return [];

  return body.responses
    .map((response) => {
      if (!response || typeof response !== 'object') return null;
      const responseRecord = response as Record<string, unknown>;
      const questionCode = typeof responseRecord.questionCode === 'string' ? responseRecord.questionCode.trim() : '';
      const responseValue = typeof responseRecord.responseValue === 'string' ? responseRecord.responseValue.trim() : String(responseRecord.responseValue ?? '').trim();

      return questionCode && responseValue ? { questionCode, responseValue } : null;
    })
    .filter((response): response is TmtiResponseInput => response !== null);
}

function mergeScrapedProfileWithRequest(
  scrapedProfile: PsychologyTodayProfilePayload,
  requestBody: PsychologyTodayProfilePayload & {
    searchFilters?: {
      areaCode?: string;
      therapyType?: string;
      insuranceProvider?: string;
      insurancePlan?: string;
    };
    profileOverrides?: PsychologyTodayProfilePayload;
  }
): PsychologyTodayProfilePayload {
  const searchFilters = requestBody.searchFilters;
  const profileOverrides = requestBody.profileOverrides ?? {};

  return {
    ...scrapedProfile,
    ...profileOverrides,
    profileUrl: profileOverrides.profileUrl ?? scrapedProfile.profileUrl ?? requestBody.profileUrl ?? requestBody.url,
    areaCodes: [
      ...(scrapedProfile.areaCodes ?? []),
      ...(scrapedProfile.areaCodesServed ?? []),
      ...(scrapedProfile.zipCodes ?? []),
      ...(searchFilters?.areaCode ? [searchFilters.areaCode] : []),
      ...(profileOverrides.areaCodes ?? []),
      ...(profileOverrides.areaCodesServed ?? []),
      ...(profileOverrides.zipCodes ?? []),
    ],
    expertise: [
      ...(scrapedProfile.expertise ?? []),
      ...(scrapedProfile.therapyTypes ?? []),
      ...(searchFilters?.therapyType ? [searchFilters.therapyType] : []),
      ...(profileOverrides.expertise ?? []),
      ...(profileOverrides.therapyTypes ?? []),
    ],
    therapyModels: [
      ...(scrapedProfile.therapyModels ?? []),
      ...(profileOverrides.therapyModels ?? []),
    ],
    insuranceProviders: [
      ...(scrapedProfile.insuranceProviders ?? []),
      ...(searchFilters?.insuranceProvider ? [searchFilters.insuranceProvider] : []),
      ...(profileOverrides.insuranceProviders ?? []),
    ],
    insurance: profileOverrides.insurance ?? scrapedProfile.insurance ?? (
      searchFilters?.insuranceProvider
        ? [{ provider: searchFilters.insuranceProvider, plan: searchFilters.insurancePlan ?? null, acceptingNewPatients: true }]
        : undefined
    ),
  };
}

function mergeScrapedProfileWithPreferences(
  scrapedProfile: PsychologyTodayProfilePayload,
  preferences: {
    areaCode: string;
    therapyTypes: string[];
    insuranceProvider: string;
    insurancePlan?: string;
  }
): PsychologyTodayProfilePayload {
  return {
    ...scrapedProfile,
    areaCodes: [
      ...(scrapedProfile.areaCodes ?? []),
      ...(scrapedProfile.areaCodesServed ?? []),
      ...(scrapedProfile.zipCodes ?? []),
      preferences.areaCode,
    ],
    expertise: [
      ...(scrapedProfile.expertise ?? []),
      ...(scrapedProfile.therapyTypes ?? []),
      ...preferences.therapyTypes,
    ],
    therapyModels: scrapedProfile.therapyModels ?? [],
    insuranceProviders: [
      ...(scrapedProfile.insuranceProviders ?? []),
      ...(preferences.insuranceProvider ? [preferences.insuranceProvider] : []),
    ],
    insurance: scrapedProfile.insurance ?? (
      preferences.insuranceProvider
        ? [{ provider: preferences.insuranceProvider, plan: preferences.insurancePlan ?? null, acceptingNewPatients: true }]
        : undefined
    ),
  };
}

async function ingestPsychologyTodayProfilesForMatch(preferences: {
  areaCode: string;
  therapyTypes: string[];
  insuranceProvider: string;
  insurancePlan?: string;
}): Promise<{
  searchUrl: string;
  fetchedProfileUrls: string[];
  ingestedTherapistIds: string[];
  skipped: Array<{ profileUrl: string; message: string }>;
}> {
  const primaryTherapyType = preferences.therapyTypes[0];
  const fetchedDirectory = await fetchPsychologyTodayDirectoryProfiles({
    areaCode: preferences.areaCode,
    therapyType: primaryTherapyType,
    limit: 5,
  });
  const ingestedTherapistIds: string[] = [];
  const skipped: Array<{ profileUrl: string; message: string }> = [...fetchedDirectory.errors];

  for (const scraped of fetchedDirectory.profiles) {
    const profile = mergeScrapedProfileWithPreferences(scraped.profile, preferences);
    const { therapist, errors } = normalizePsychologyTodayProfile(profile);

    if (!therapist || errors.length > 0) {
      skipped.push({
        profileUrl: scraped.meta.sourceUrl,
        message: errors.map((error) => `${error.field}: ${error.message}`).join('; '),
      });
      continue;
    }

    const record = upsertLiveTherapist(therapist);
    ingestedTherapistIds.push(record.id);
  }

  return {
    searchUrl: fetchedDirectory.searchUrl,
    fetchedProfileUrls: fetchedDirectory.profileUrls,
    ingestedTherapistIds,
    skipped,
  };
}

function buildMatchRequestFromBody(
  body: Record<string, unknown> & {
    searchFilters?: {
      areaCode?: string;
      therapyType?: string;
      insuranceProvider?: string;
      insurancePlan?: string;
    };
    matchPreferences?: MatchGenerationRequest;
  }
): MatchGenerationRequest | undefined {
  if (body.matchPreferences) return body.matchPreferences;

  if (body.searchFilters) {
    return {
      userId: typeof body.userId === 'string' ? body.userId : undefined,
      areaCode: body.searchFilters.areaCode,
      therapyType: body.searchFilters.therapyType,
      insuranceProvider: body.searchFilters.insuranceProvider,
      insurancePlan: body.searchFilters.insurancePlan,
      preferredLanguage: typeof body.preferredLanguage === 'string' ? body.preferredLanguage : undefined,
      carePreference: typeof body.carePreference === 'string' ? body.carePreference : undefined,
    };
  }

  if (typeof body.userId === 'string') {
    return { userId: body.userId };
  }

  return undefined;
}

function buildFetchedTherapistMatchReflection(
  therapistId: string,
  request: MatchGenerationRequest | undefined,
  directory = getAllTherapists()
) {
  if (!request) return undefined;

  const savedPreferences = request.userId ? getUserPreferences(request.userId) : undefined;
  const savedTmtiProfile = request.userId ? getLatestTmtiProfile(request.userId) : undefined;
  const { preferences, errors } = resolveMatchPreferences(
    {
      ...request,
      cnipPreferenceProfile: request.cnipPreferenceProfile ?? savedPreferences?.cnipPreferenceProfile ?? savedTmtiProfile?.dimensionScores as MatchGenerationRequest['cnipPreferenceProfile'],
    },
    savedPreferences
  );

  if (errors.length > 0) {
    return {
      error: {
        code: 'INVALID_MATCH_REFLECTION_INPUT',
        details: errors,
      },
    };
  }

  const matches = generateMatches(preferences, directory);
  const fetchedTherapistMatch = matches.find((match) => match.therapistId === therapistId);

  return {
    fetchedTherapistMatch,
    rank: fetchedTherapistMatch ? matches.findIndex((match) => match.therapistId === therapistId) + 1 : null,
    total: matches.length,
    reflection: fetchedTherapistMatch
      ? [
          `Fetched therapist scored ${fetchedTherapistMatch.final_score} overall.`,
          ...fetchedTherapistMatch.hard_constraint_reasons,
          ...fetchedTherapistMatch.explanation.tokens,
        ]
      : ['Fetched therapist did not appear in the generated match list for these preferences.'],
  };
}

export function createDevApiMiddleware() {
  return async (request: any, response: any, next: () => void) => {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    if (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
      requestUrl.pathname = requestUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
    }
    const userMatch = routeMatch(requestUrl.pathname, /^\/users\/([^/]+)$/);
    const userOnboardingMatch = routeMatch(requestUrl.pathname, /^\/users\/([^/]+)\/onboarding$/);
    const userPreferencesMatch = routeMatch(requestUrl.pathname, /^\/users\/([^/]+)\/preferences$/);
    const userMatchesMatch = routeMatch(requestUrl.pathname, /^\/users\/([^/]+)\/matches$/);
    const userTmtiProfileMatch = routeMatch(requestUrl.pathname, /^\/users\/([^/]+)\/tmti-profile$/);
    const userTmtiResponsesMatch = routeMatch(requestUrl.pathname, /^\/users\/([^/]+)\/tmti-responses$/);

    if (requestUrl.pathname === '/therapists/psychologytoday/fetch') {
      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['POST']);
        return;
      }

      try {
        const body = await readJsonBody(request) as PsychologyTodayProfilePayload & {
          searchFilters?: {
            areaCode?: string;
            therapyType?: string;
            insuranceProvider?: string;
            insurancePlan?: string;
          };
          matchPreferences?: MatchGenerationRequest;
          profileOverrides?: PsychologyTodayProfilePayload;
        };
        const profileUrl = typeof body.profileUrl === 'string' ? body.profileUrl : body.url;

        if (!profileUrl) {
          sendJson(response, 400, {
            error: {
              code: 'MISSING_PSYCHOLOGYTODAY_URL',
              message: 'POST /therapists/psychologytoday/fetch requires profileUrl or url.',
            },
          });
          return;
        }

        const scraped = await fetchPsychologyTodayProfile(profileUrl);
        const mergedProfile = mergeScrapedProfileWithRequest(scraped.profile, body);
        const { therapist, errors } = normalizePsychologyTodayProfile(mergedProfile);

        if (!therapist || errors.length > 0) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_FETCHED_PSYCHOLOGYTODAY_PROFILE',
              message: 'Fetched PsychologyToday profile needs more structured fields before it can be matched.',
              details: errors,
            },
            scraped,
          } as unknown as JsonPayload);
          return;
        }

        const data = upsertLiveTherapist(therapist);
        const searchFilters = body.searchFilters;
        const directory = getAllTherapists();
        const liveResult = searchFilters
          ? buildTherapistSearchResponse({
              areaCode: searchFilters.areaCode ?? data.areaCodesServed[0],
              therapyType: searchFilters.therapyType ?? data.therapyTypes[0],
              insuranceProvider: searchFilters.insuranceProvider ?? data.insurance[0]?.provider ?? '',
              insurancePlan: searchFilters.insurancePlan,
              limit: 20,
            }, directory)
          : undefined;
        const matchReflection = buildFetchedTherapistMatchReflection(data.id, buildMatchRequestFromBody(body), directory);

        sendJson(response, 200, {
          data,
          scraped,
          liveResult,
          matchReflection,
          meta: {
            source: 'psychologytoday',
            fetched: true,
            availableImmediately: true,
            generatedAt: new Date().toISOString(),
          },
        } as unknown as JsonPayload);
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'PSYCHOLOGYTODAY_FETCH_FAILED',
            message: error instanceof Error ? error.message : 'Could not fetch PsychologyToday profile.',
          },
        });
      }
      return;
    }

    if (requestUrl.pathname === '/therapists/psychologytoday') {
      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['POST']);
        return;
      }

      try {
        const body = await readJsonBody(request) as PsychologyTodayProfilePayload & {
          searchFilters?: {
            areaCode?: string;
            therapyType?: string;
            insuranceProvider?: string;
            insurancePlan?: string;
          };
        };
        const { therapist, errors } = normalizePsychologyTodayProfile(body);

        if (!therapist || errors.length > 0) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_PSYCHOLOGYTODAY_PROFILE',
              message: 'PsychologyToday profile payload could not be normalized.',
              details: errors,
            },
          });
          return;
        }

        const data = upsertLiveTherapist(therapist);
        const searchFilters = body.searchFilters;
        const directory = getAllTherapists();
        const liveResult = searchFilters
          ? buildTherapistSearchResponse({
              areaCode: searchFilters.areaCode ?? data.areaCodesServed[0],
              therapyType: searchFilters.therapyType ?? data.therapyTypes[0],
              insuranceProvider: searchFilters.insuranceProvider ?? data.insurance[0]?.provider ?? '',
              insurancePlan: searchFilters.insurancePlan,
              limit: 20,
            }, directory)
          : undefined;
        const matchReflection = buildFetchedTherapistMatchReflection(data.id, buildMatchRequestFromBody(body), directory);

        sendJson(response, 200, {
          data,
          liveResult,
          matchReflection,
          meta: {
            source: 'psychologytoday',
            availableImmediately: true,
            generatedAt: new Date().toISOString(),
          },
        } as unknown as JsonPayload);
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_PSYCHOLOGYTODAY_PROFILE',
            message: error instanceof Error ? error.message : 'Could not parse PsychologyToday profile payload.',
          },
        });
      }
      return;
    }

    if (requestUrl.pathname === '/therapists') {
      if (request.method === 'POST') {
        try {
          const body = await readJsonBody(request);
          const record = upsertLiveTherapist({
            id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `live-therapist-${Date.now()}`,
            fullName: typeof body.fullName === 'string' ? body.fullName : '',
            credentials: typeof body.credentials === 'string' ? body.credentials : '',
            bio: typeof body.bio === 'string' ? body.bio : '',
            languages: toStringArray(body.languages),
            licenseStates: toStringArray(body.licenseStates),
            areaCodesServed: toStringArray(body.areaCodesServed),
            therapyTypes: toStringArray(body.therapyTypes),
            therapyModels: toStringArray(body.therapyModels),
            conversationStyleProfile: {
              directiveness: 5,
              emotionalIntensity: 5,
              pastOrientation: 5,
              warmSupport: 5,
            },
            telehealthAvailable: toBoolean(body.telehealthAvailable),
            inPersonAvailable: toBoolean(body.inPersonAvailable),
            hourlyRateMin: toNullableNumber(body.hourlyRateMin),
            hourlyRateMax: toNullableNumber(body.hourlyRateMax),
            isActive: body.isActive === undefined ? true : toBoolean(body.isActive),
            profileUrl: typeof body.profileUrl === 'string' ? body.profileUrl : '',
            sourceProfileUrl: typeof body.sourceProfileUrl === 'string' ? body.sourceProfileUrl : typeof body.profileUrl === 'string' ? body.profileUrl : '',
            insurance: Array.isArray(body.insurance)
              ? body.insurance.map((insurance: any) => ({
                  provider: typeof insurance?.provider === 'string' ? insurance.provider : '',
                  plan: typeof insurance?.plan === 'string' ? insurance.plan : null,
                  acceptingNewPatients: insurance?.acceptingNewPatients === undefined ? true : toBoolean(insurance.acceptingNewPatients),
                }))
              : [],
          });

          sendJson(response, 200, { data: record } as JsonPayload);
        } catch (error) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_THERAPIST_PAYLOAD',
              message: error instanceof Error ? error.message : 'Could not parse therapist payload.',
            },
          });
        }
        return;
      }

      if (request.method !== 'GET') {
        sendMethodNotAllowed(response, ['GET', 'POST']);
        return;
      }

      const { filters, errors } = parseTherapistSearchFilters(requestUrl.searchParams);

      if (errors.length > 0) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_THERAPIST_SEARCH_QUERY',
            message: 'GET /therapists requires areaCode, therapyType, and insuranceProvider filters.',
            details: errors,
          },
        });
        return;
      }

      sendJson(response, 200, buildTherapistSearchResponse(filters, getAllTherapists()) as unknown as JsonPayload);
      return;
    }

    if (requestUrl.pathname === '/users') {
      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['POST']);
        return;
      }

      try {
        const body = await readJsonBody(request);
        const errors = validateUserPayload(body);

        if (errors.length > 0) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_USER_PAYLOAD',
              message: 'POST /users received invalid fields.',
              details: errors,
            },
          });
          return;
        }

        const user = upsertUser({
          id: typeof body.id === 'string' ? body.id : undefined,
          email: typeof body.email === 'string' ? body.email : undefined,
          preferredLanguage: typeof body.preferredLanguage === 'string' ? body.preferredLanguage : undefined,
          areaCode: typeof body.areaCode === 'string' ? body.areaCode : undefined,
        });
        sendJson(response, 200, { data: user });
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_USER_PAYLOAD',
            message: error instanceof Error ? error.message : 'Could not parse user payload.',
          },
        });
      }
      return;
    }

    if (userMatch) {
      if (request.method !== 'GET') {
        sendMethodNotAllowed(response, ['GET']);
        return;
      }

      const userId = decodeURIComponent(userMatch[1]);
      const user = getUser(userId);

      if (!user) {
        sendJson(response, 404, {
          error: {
            code: 'USER_NOT_FOUND',
            message: `No user exists for ${userId}.`,
          },
        });
        return;
      }

      sendJson(response, 200, { data: user });
      return;
    }

    if (userOnboardingMatch) {
      if (request.method !== 'GET') {
        sendMethodNotAllowed(response, ['GET']);
        return;
      }

      const userId = decodeURIComponent(userOnboardingMatch[1]);
      const savedState = getSavedOnboardingState(userId);

      if (!savedState) {
        sendJson(response, 404, {
          error: {
            code: 'ONBOARDING_STATE_NOT_FOUND',
            message: `No saved onboarding state exists for ${userId}.`,
          },
        });
        return;
      }

      sendJson(response, 200, { data: savedState });
      return;
    }

    if (userTmtiResponsesMatch) {
      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['POST']);
        return;
      }

      try {
        const userId = decodeURIComponent(userTmtiResponsesMatch[1]);
        const body = await readJsonBody(request);
        const responses = getTmtiResponses(body);

        if (responses.length === 0) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_TMTI_RESPONSE_PAYLOAD',
              message: 'POST /users/{id}/tmti-responses requires at least one response with questionCode and responseValue.',
              details: [validationError('responses', 'responses must contain at least one complete TMTI answer.')],
            },
          });
          return;
        }

        const profileResult = generateCnipConversationProfile(responses);
        const result = saveTmtiProfileWithResponses({
          userId,
          tmtiType: profileResult.tmtiType,
          dimensionScores: profileResult.dimensionScores,
          confidenceScore: profileResult.confidenceScore,
          version: profileResult.version,
          responses,
        });

        sendJson(response, 200, {
          data: result,
          meta: {
            adapter: profileResult.version,
            swappableAdapter: true,
          },
        } as JsonPayload);
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_TMTI_RESPONSE_PAYLOAD',
            message: error instanceof Error ? error.message : 'Could not parse TMTI response payload.',
          },
        });
      }
      return;
    }

    if (userTmtiProfileMatch) {
      const userId = decodeURIComponent(userTmtiProfileMatch[1]);

      if (request.method === 'GET') {
        const profile = getLatestTmtiProfile(userId);

        if (!profile) {
          sendJson(response, 404, {
            error: {
              code: 'TMTI_PROFILE_NOT_FOUND',
              message: `No TMTI profile exists for ${userId}.`,
            },
          });
          return;
        }

        sendJson(response, 200, { data: profile });
        return;
      }

      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['GET', 'POST']);
        return;
      }

      try {
        const body = await readJsonBody(request);
        const responses = getTmtiResponses(body);
        const generatedProfile = generateCnipConversationProfile(responses);
        const result = saveTmtiProfileWithResponses({
          userId,
          tmtiType: typeof body.tmtiType === 'string' ? body.tmtiType : generatedProfile.tmtiType,
          dimensionScores: typeof body.dimensionScores === 'object' && body.dimensionScores !== null ? body.dimensionScores as Record<string, number> : generatedProfile.dimensionScores,
          confidenceScore: typeof body.confidenceScore === 'number' ? body.confidenceScore : generatedProfile.confidenceScore,
          version: typeof body.version === 'string' ? body.version : generatedProfile.version,
          responses,
        });

        sendJson(response, 200, { data: result } as JsonPayload);
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_TMTI_PROFILE_PAYLOAD',
            message: error instanceof Error ? error.message : 'Could not parse TMTI profile payload.',
          },
        });
      }
      return;
    }

    if (userPreferencesMatch) {
      if (request.method === 'GET') {
        const userId = decodeURIComponent(userPreferencesMatch[1]);
        const preferences = getUserPreferences(userId);

        if (!preferences) {
          sendJson(response, 404, {
            error: {
              code: 'PREFERENCES_NOT_FOUND',
              message: `No preferences exist for ${userId}.`,
            },
          });
          return;
        }

        sendJson(response, 200, { data: preferences });
        return;
      }

      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['GET', 'POST']);
        return;
      }

      try {
        const userId = decodeURIComponent(userPreferencesMatch[1]);
        const body = await readJsonBody(request);
        const errors = validatePreferencePayload(body);

        if (errors.length > 0) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_PREFERENCE_PAYLOAD',
              message: 'POST /users/{id}/preferences received invalid fields.',
              details: errors,
            },
          });
          return;
        }

        const preferences = upsertUserPreferences(userId, {
          areaCode: typeof body.areaCode === 'string' ? body.areaCode : undefined,
          preferredLanguage: typeof body.preferredLanguage === 'string' ? body.preferredLanguage : undefined,
          therapyFor: typeof body.therapyFor === 'string' ? body.therapyFor as any : undefined,
          lifeAspectsByCategory: typeof body.lifeAspectsByCategory === 'object' && body.lifeAspectsByCategory !== null ? body.lifeAspectsByCategory as any : undefined,
          lifeAspectNotesByCategory: typeof body.lifeAspectNotesByCategory === 'object' && body.lifeAspectNotesByCategory !== null ? body.lifeAspectNotesByCategory as any : undefined,
          lifeAspectSkippedByCategory: typeof body.lifeAspectSkippedByCategory === 'object' && body.lifeAspectSkippedByCategory !== null ? body.lifeAspectSkippedByCategory as any : undefined,
          therapyTypes: Array.isArray(body.therapyTypes) ? body.therapyTypes.map(String) : undefined,
          lifeAspects: Array.isArray(body.lifeAspects) ? body.lifeAspects.map(String) : undefined,
          insuranceProvider: typeof body.insuranceProvider === 'string' ? body.insuranceProvider : undefined,
          insurancePlan: typeof body.insurancePlan === 'string' ? body.insurancePlan : undefined,
          carePreference: typeof body.carePreference === 'string' ? body.carePreference : undefined,
          cnipConversationStyles: Array.isArray(body.cnipConversationStyles) ? body.cnipConversationStyles.map(String) as any : undefined,
          cnipPreferenceProfile: typeof body.cnipPreferenceProfile === 'object' && body.cnipPreferenceProfile !== null ? body.cnipPreferenceProfile as any : undefined,
        });

        sendJson(response, 200, { data: preferences });
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_PREFERENCE_PAYLOAD',
            message: error instanceof Error ? error.message : 'Could not parse preference payload.',
          },
        });
      }
      return;
    }

    if (requestUrl.pathname === '/matches/generate') {
      if (request.method !== 'POST') {
        sendMethodNotAllowed(response, ['POST']);
        return;
      }

      try {
        const body = await readJsonBody(request) as MatchGenerationRequest & {
          fetchPsychologyToday?: boolean;
        };
        const savedPreferences = body.userId ? getUserPreferences(body.userId) : undefined;
        const savedTmtiProfile = body.userId ? getLatestTmtiProfile(body.userId) : undefined;
        const { preferences, errors } = resolveMatchPreferences(
          {
            ...body,
            cnipPreferenceProfile: body.cnipPreferenceProfile ?? savedPreferences?.cnipPreferenceProfile ?? savedTmtiProfile?.dimensionScores as MatchGenerationRequest['cnipPreferenceProfile'],
          },
          savedPreferences
        );

        if (errors.length > 0) {
          sendJson(response, 400, {
            error: {
              code: 'INVALID_MATCH_GENERATION_PAYLOAD',
              message: 'POST /matches/generate requires areaCode, or a userId with saved preferences.',
              details: errors,
            },
          });
          return;
        }

        let psychologyTodayFetch:
          | Awaited<ReturnType<typeof ingestPsychologyTodayProfilesForMatch>>
          | { error: { message: string } }
          | undefined;

        if (body.fetchPsychologyToday) {
          try {
            psychologyTodayFetch = await ingestPsychologyTodayProfilesForMatch(preferences);
          } catch (error) {
            psychologyTodayFetch = {
              error: {
                message: error instanceof Error ? error.message : 'Could not fetch PsychologyToday profiles.',
              },
            };
          }
        }

        const directory = getAllTherapists();
        const fetchedTherapistIds =
          psychologyTodayFetch && 'ingestedTherapistIds' in psychologyTodayFetch
            ? psychologyTodayFetch.ingestedTherapistIds
            : [];
        const matchDirectory = fetchedTherapistIds.length > 0
          ? directory.filter((therapist) => fetchedTherapistIds.includes(therapist.id))
          : directory;
        const startedAt = performance.now();
        const matches = saveGeneratedMatches(preferences.userId, generateMatches(preferences, matchDirectory));
        const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
        const responsePayload = buildMatchGenerationResponse(preferences, matches, elapsedMs) as unknown as JsonPayload & {
          meta: Record<string, unknown>;
        };

        if (psychologyTodayFetch) {
          responsePayload.meta.psychologyTodayFetch = psychologyTodayFetch;
        }

        sendJson(response, 200, responsePayload);
      } catch (error) {
        sendJson(response, 400, {
          error: {
            code: 'INVALID_MATCH_GENERATION_PAYLOAD',
            message: error instanceof Error ? error.message : 'Could not parse match generation payload.',
          },
        });
      }
      return;
    }

    if (userMatchesMatch) {
      if (request.method !== 'GET') {
        sendMethodNotAllowed(response, ['GET']);
        return;
      }

      const userId = decodeURIComponent(userMatchesMatch[1]);
      const data = getGeneratedMatches(userId);
      sendJson(response, 200, {
        data,
        meta: {
          userId,
          total: data.length,
          generatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}
