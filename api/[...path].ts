import { pushPreferencesToJotform } from './shared.js';

type JsonPayload = Record<string, unknown>;

type TherapistInsurance = {
  provider: string;
  plan: string | null;
  acceptingNewPatients: boolean;
};

type TherapistRecord = {
  id: string;
  fullName: string;
  credentials: string;
  bio: string;
  languages: string[];
  licenseStates: string[];
  areaCodesServed: string[];
  therapyTypes: string[];
  therapyModels: string[];
  telehealthAvailable: boolean;
  inPersonAvailable: boolean;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  profileUrl: string;
  insurance: TherapistInsurance[];
};

const therapists: TherapistRecord[] = [
  {
    id: 'maya-chen',
    fullName: 'Maya Chen',
    credentials: 'LMFT',
    bio: 'Works with anxiety, family patterns, and relationship stress through warm, emotionally attuned sessions.',
    languages: ['Mandarin', 'English'],
    licenseStates: ['NY'],
    areaCodesServed: ['10001', '10002', '10003', '11201'],
    therapyTypes: ['Anxiety', 'Relationship conflict', 'Family boundaries', 'Communication skills', 'Career change', 'Workplace conflict', 'People-pleasing'],
    therapyModels: ['Emotionally Focused Therapy', 'CBT', 'Family Systems'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: 165,
    hourlyRateMax: 225,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/maya-chen-new-york-ny',
    insurance: [
      { provider: 'Aetna', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'Cigna', plan: 'Open Access Plus', acceptingNewPatients: true },
      { provider: 'UnitedHealthcare', plan: 'Choice Plus', acceptingNewPatients: true },
    ],
  },
  {
    id: 'jonathan-reed',
    fullName: 'Jonathan Reed',
    credentials: 'LCSW',
    bio: 'Offers structured, skills-oriented therapy for mood, motivation, work stress, and life transitions.',
    languages: ['English'],
    licenseStates: ['NY'],
    areaCodesServed: ['10001', '10010', '10011', '10018'],
    therapyTypes: ['Depression', 'Career change', 'College / school stress', 'Sleep problems', 'Self-esteem', 'Stress and burnout', 'ADHD or focus concerns'],
    therapyModels: ['CBT', 'Solution-Focused Therapy', 'Behavioral Activation'],
    telehealthAvailable: true,
    inPersonAvailable: false,
    hourlyRateMin: 140,
    hourlyRateMax: 190,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/jonathan-reed-new-york-ny',
    insurance: [
      { provider: 'Aetna', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'Oscar', plan: 'Circle Plus', acceptingNewPatients: true },
      { provider: 'Oxford', plan: 'Freedom', acceptingNewPatients: true },
    ],
  },
  {
    id: 'emily-wong',
    fullName: 'Emily Wong',
    credentials: 'LPCC',
    bio: 'Blends practical tools with steady support for anxiety, health stress, and repetitive thought patterns.',
    languages: ['Cantonese', 'English'],
    licenseStates: ['CA'],
    areaCodesServed: ['94102', '94103', '94107', '94110'],
    therapyTypes: ['Anxiety', 'OCD tendencies', 'Body image concerns', 'Medication concerns', 'Chronic pain', 'Eating concerns', 'Fatigue or low energy'],
    therapyModels: ['ACT', 'CBT', 'Mindfulness-Based Therapy'],
    telehealthAvailable: true,
    inPersonAvailable: false,
    hourlyRateMin: 150,
    hourlyRateMax: 210,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/emily-wong-san-francisco-ca',
    insurance: [
      { provider: 'Aetna', plan: 'Open Choice', acceptingNewPatients: true },
      { provider: 'Blue Shield', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'UnitedHealthcare', plan: 'Choice Plus', acceptingNewPatients: true },
    ],
  },
  {
    id: 'sofia-morales',
    fullName: 'Sofia Morales',
    credentials: 'PsyD',
    bio: 'Specializes in trauma, identity, and migration stress with depth-oriented and body-aware therapy.',
    languages: ['English', 'Spanish'],
    licenseStates: ['CA'],
    areaCodesServed: ['90001', '90012', '90026', '90027'],
    therapyTypes: ['Trauma / PTSD', 'Panic attacks', 'Identity exploration', 'Loneliness', 'Relocation', 'Grief and loss', 'Social anxiety'],
    therapyModels: ['EMDR', 'Psychodynamic Therapy', 'Somatic Therapy'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: 190,
    hourlyRateMax: 260,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/sofia-morales-los-angeles-ca',
    insurance: [
      { provider: 'Blue Shield', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'Cigna', plan: 'Open Access Plus', acceptingNewPatients: true },
    ],
  },
  {
    id: 'david-kim',
    fullName: 'David Kim',
    credentials: 'LMHC',
    bio: 'Supports couples, parents, and individuals who want a collaborative and affirming therapy room.',
    languages: ['English', 'Korean'],
    licenseStates: ['WA'],
    areaCodesServed: ['98101', '98102', '98103', '98109'],
    therapyTypes: ['Parenthood', 'Family boundaries', 'Relationship conflict', 'Self-esteem', 'Communication skills', 'Caregiving stress'],
    therapyModels: ['Internal Family Systems', 'Gottman Method', 'Narrative Therapy'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: 135,
    hourlyRateMax: 185,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/david-kim-seattle-wa',
    insurance: [
      { provider: 'Premera', plan: 'Heritage', acceptingNewPatients: true },
      { provider: 'Regence', plan: 'Preferred', acceptingNewPatients: true },
      { provider: 'Cigna', plan: 'Open Access Plus', acceptingNewPatients: true },
    ],
  },
];

function sendJson(response: any, statusCode: number, payload: JsonPayload): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: any): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return request.body.trim() ? JSON.parse(request.body) : {};

  if (typeof request.on !== 'function') return {};

  return new Promise((resolve, reject) => {
    let rawBody = '';
    request.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString('utf8');
    });
    request.on('end', () => {
      try {
        resolve(rawBody.trim() ? JSON.parse(rawBody) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
}

function overlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase()));
}

function scoreMatch(therapist: TherapistRecord, body: Record<string, unknown>) {
  const areaCode = normalize(body.areaCode);
  const therapyTypes = stringList(body.therapyTypes);
  const insuranceProvider = normalize(body.insuranceProvider);
  const insurancePlan = normalize(body.insurancePlan);
  const carePreference = normalize(body.carePreference).toLowerCase();
  const preferredLanguage = normalize(body.preferredLanguage);
  const matchedTherapyTypes = overlap(therapist.therapyTypes, therapyTypes);
  const matchedTherapyModels = overlap(therapist.therapyModels, therapyTypes);
  const matchingInsurance = therapist.insurance.filter((insurance) => {
    if (!insurance.acceptingNewPatients) return false;
    if (!insuranceProvider) return false;
    if (insurance.provider.toLowerCase() !== insuranceProvider.toLowerCase()) return false;
    if (!insurancePlan) return true;
    return (insurance.plan ?? '').toLowerCase() === insurancePlan.toLowerCase();
  });
  const areaScore = areaCode && therapist.areaCodesServed.includes(areaCode) ? 100 : 45;
  const expertiseScore = therapyTypes.length === 0 ? 65 : Math.round((matchedTherapyTypes.length / therapyTypes.length) * 100);
  const languageScore = !preferredLanguage || therapist.languages.some((language) => language.toLowerCase() === preferredLanguage.toLowerCase()) ? 100 : 70;
  const sessionFormatScore =
    !carePreference || carePreference === 'either'
      ? 85
      : carePreference === 'virtual'
        ? therapist.telehealthAvailable ? 100 : 30
        : therapist.inPersonAvailable ? 100 : 30;
  const insuranceScore = !insuranceProvider ? 60 : matchingInsurance.length > 0 ? 100 : 35;
  const cnipScore = 72;
  const therapyModelScore = matchedTherapyModels.length > 0 ? 100 : 60;
  const finalScore = Math.round(expertiseScore * 0.32 + languageScore * 0.14 + sessionFormatScore * 0.14 + areaScore * 0.14 + insuranceScore * 0.1 + cnipScore * 0.1 + therapyModelScore * 0.06);

  return {
    matchedTherapyTypes,
    matchedTherapyModels,
    matchingInsurance,
    areaScore,
    expertiseScore,
    languageScore,
    sessionFormatScore,
    insuranceScore,
    cnipScore,
    therapyModelScore,
    finalScore,
  };
}

function publicTherapist(therapist: TherapistRecord) {
  const { insurance: _insurance, ...publicRecord } = therapist;
  return publicRecord;
}

function generateMatches(body: Record<string, unknown>) {
  return therapists
    .map((therapist) => {
      const score = scoreMatch(therapist, body);
      const areaCode = normalize(body.areaCode);
      const insuranceProvider = normalize(body.insuranceProvider);
      const insurancePlan = normalize(body.insurancePlan);
      const insuranceLabel = insurancePlan ? `${insuranceProvider} ${insurancePlan}` : insuranceProvider;
      return {
        id: `match-${normalize(body.userId) || 'anonymous'}-${therapist.id}-${Date.now()}`,
        userId: normalize(body.userId) || 'anonymous',
        therapistId: therapist.id,
        therapist: publicTherapist(therapist),
        hard_constraints_pass: score.areaScore === 100 && score.matchedTherapyTypes.length > 0 && (!insuranceProvider || score.matchingInsurance.length > 0),
        hard_constraint_reasons: [
          score.areaScore === 100 ? `Serves ZIP code ${areaCode}.` : `Closest available ZIP coverage: ${therapist.areaCodesServed.slice(0, 3).join(', ')}.`,
          score.matchedTherapyTypes.length > 0 ? `Supports ${score.matchedTherapyTypes.slice(0, 3).join(', ')}.` : `Related profile focus: ${therapist.therapyTypes.slice(0, 3).join(', ')}.`,
          score.matchingInsurance.length > 0 ? `Accepts ${insuranceLabel}.` : insuranceProvider ? `Insurance with ${insuranceLabel} needs confirmation.` : 'Insurance not provided; confirm coverage with therapist.',
        ],
        preference_score: score.finalScore,
        cnip_score: score.cnipScore,
        therapy_model_score: score.therapyModelScore,
        final_score: score.finalScore,
        explanation: {
          tokens: [
            'Production match generated from Vercel API.',
            score.matchedTherapyTypes.length > 0 ? `Matched ${score.matchedTherapyTypes.length} therapy focus${score.matchedTherapyTypes.length === 1 ? '' : 'es'}.` : 'Best available partial match; confirm details before booking.',
            `Language fit: ${score.languageScore}.`,
            `Session format fit: ${score.sessionFormatScore}.`,
          ],
          matchedTherapyTypes: score.matchedTherapyTypes.length > 0 ? score.matchedTherapyTypes : therapist.therapyTypes.slice(0, 3),
          matchedTherapyModels: score.matchedTherapyModels.length > 0 ? score.matchedTherapyModels : therapist.therapyModels.slice(0, 3),
          matchingInsurance: score.matchingInsurance,
          scoreBreakdown: {
            expertise: score.expertiseScore,
            therapyModel: score.therapyModelScore,
            language: score.languageScore,
            sessionFormat: score.sessionFormatScore,
            cnipStyle: score.cnipScore,
          },
        },
        ranked_at: new Date().toISOString(),
      };
    })
    .sort((a, b) => b.final_score - a.final_score || a.therapist.fullName.localeCompare(b.therapist.fullName));
}

export default async function handler(request: any, response: any) {
  try {
    const requestUrl = new URL(request.url ?? '/', 'https://bettermatchtherapist.vercel.app');
    const pathname = requestUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

    if (pathname === '/users' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const id = normalize(body.id) || `user-${Date.now()}`;
      sendJson(response, 200, {
        data: {
          id,
          preferredLanguage: normalize(body.preferredLanguage) || undefined,
          areaCode: normalize(body.areaCode) || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const preferencesMatch = pathname.match(/^\/users\/([^/]+)\/preferences$/);
    if (preferencesMatch && request.method === 'POST') {
      const body = await readJsonBody(request);
      const userId = decodeURIComponent(preferencesMatch[1]);
      await pushPreferencesToJotform({ ...body, userId });
      sendJson(response, 200, {
        data: {
          ...body,
          userId,
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const onboardingMatch = pathname.match(/^\/users\/([^/]+)\/onboarding$/);
    if (onboardingMatch && request.method === 'GET') {
      sendJson(response, 404, {
        error: {
          code: 'ONBOARDING_STATE_NOT_FOUND',
          message: `No persisted onboarding state exists for ${decodeURIComponent(onboardingMatch[1])} in this serverless prototype.`,
        },
      });
      return;
    }

    if (pathname === '/matches/generate' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const data = generateMatches(body);
      sendJson(response, 200, {
        data,
        meta: {
          userId: normalize(body.userId) || 'anonymous',
          total: data.length,
          generatedAt: new Date().toISOString(),
          productionFallback: true,
        },
      });
      return;
    }

    sendJson(response, 404, {
      error: {
        code: 'API_ROUTE_NOT_FOUND',
        message: `No API route exists for ${pathname}.`,
      },
    });
  } catch (error) {
    sendJson(response, 500, {
      error: {
        code: 'API_FUNCTION_ERROR',
        message: error instanceof Error ? error.message : 'The API function failed.',
      },
    });
  }
}
