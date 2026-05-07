import { CnipConversationStyle, CnipPreferenceProfile, OnboardingFormData } from '../onboardingTypes';

export type PsychologyTodayTherapistProfile = {
  id: string;
  name: string;
  credentials: string;
  location: string;
  areaCodes: string[];
  profileUrl: string;
  sessionFormats: Array<'Virtual' | 'InPerson'>;
  insuranceProviders: string[];
  expertise: string[];
  therapyModels: string[];
  conversationStyleProfile: CnipPreferenceProfile;
  bio: string;
};

export type TherapistRecommendation = {
  therapist: PsychologyTodayTherapistProfile;
  score: number;
  styleFit: number;
  expertiseFit: number;
  logisticsFit: number;
  reasons: string[];
};

export const cnipStyleProfiles: Record<CnipConversationStyle, CnipPreferenceProfile> = {
  structuredGuide: {
    directiveness: 9,
    emotionalIntensity: 5,
    pastOrientation: 3,
    warmSupport: 5,
  },
  reflectiveCompanion: {
    directiveness: 3,
    emotionalIntensity: 5,
    pastOrientation: 5,
    warmSupport: 9,
  },
  deepExplorer: {
    directiveness: 4,
    emotionalIntensity: 9,
    pastOrientation: 9,
    warmSupport: 7,
  },
  practicalCoach: {
    directiveness: 8,
    emotionalIntensity: 4,
    pastOrientation: 2,
    warmSupport: 3,
  },
};

export const cnipStyleNames: Record<CnipConversationStyle, string> = {
  structuredGuide: 'Structured guide',
  reflectiveCompanion: 'Reflective companion',
  deepExplorer: 'Deep explorer',
  practicalCoach: 'Practical coach',
};

export const emptyCnipPreferenceProfile: CnipPreferenceProfile = {
  directiveness: 0,
  emotionalIntensity: 0,
  pastOrientation: 0,
  warmSupport: 0,
};

export const samplePsychologyTodayTherapists: PsychologyTodayTherapistProfile[] = [
  {
    id: 'maya-chen',
    name: 'Maya Chen',
    credentials: 'LMFT',
    location: 'New York, NY',
    areaCodes: ['10001', '10002', '10003', '11201'],
    profileUrl: 'https://www.psychologytoday.com/us/therapists/maya-chen-new-york-ny',
    sessionFormats: ['Virtual', 'InPerson'],
    insuranceProviders: ['Aetna', 'Cigna', 'UnitedHealthcare'],
    expertise: ['Anxiety', 'Relationship conflict', 'Family boundaries', 'Communication skills', 'Career change'],
    therapyModels: ['Emotionally Focused Therapy', 'CBT', 'Family Systems'],
    conversationStyleProfile: {
      directiveness: 6,
      emotionalIntensity: 7,
      pastOrientation: 5,
      warmSupport: 8,
    },
    bio: 'Works with anxiety, family patterns, and relationship stress through warm, emotionally attuned sessions.',
  },
  {
    id: 'jonathan-reed',
    name: 'Jonathan Reed',
    credentials: 'LCSW',
    location: 'New York, NY',
    areaCodes: ['10001', '10010', '10011', '10018'],
    profileUrl: 'https://www.psychologytoday.com/us/therapists/jonathan-reed-new-york-ny',
    sessionFormats: ['Virtual'],
    insuranceProviders: ['Aetna', 'Oscar', 'Oxford'],
    expertise: ['Depression', 'Career change', 'College / school stress', 'Sleep problems', 'Self-esteem'],
    therapyModels: ['CBT', 'Solution-Focused Therapy', 'Behavioral Activation'],
    conversationStyleProfile: {
      directiveness: 9,
      emotionalIntensity: 4,
      pastOrientation: 2,
      warmSupport: 4,
    },
    bio: 'Offers structured, skills-oriented therapy for mood, motivation, work stress, and life transitions.',
  },
  {
    id: 'sofia-morales',
    name: 'Sofia Morales',
    credentials: 'PsyD',
    location: 'Los Angeles, CA',
    areaCodes: ['90001', '90012', '90026', '90027'],
    profileUrl: 'https://www.psychologytoday.com/us/therapists/sofia-morales-los-angeles-ca',
    sessionFormats: ['Virtual', 'InPerson'],
    insuranceProviders: ['Blue Shield', 'Cigna', 'Kaiser'],
    expertise: ['Trauma / PTSD', 'Panic attacks', 'Identity exploration', 'Loneliness', 'Relocation'],
    therapyModels: ['EMDR', 'Psychodynamic Therapy', 'Somatic Therapy'],
    conversationStyleProfile: {
      directiveness: 4,
      emotionalIntensity: 9,
      pastOrientation: 9,
      warmSupport: 7,
    },
    bio: 'Specializes in trauma, identity, and migration stress with depth-oriented and body-aware therapy.',
  },
  {
    id: 'emily-wong',
    name: 'Emily Wong',
    credentials: 'LPCC',
    location: 'San Francisco, CA',
    areaCodes: ['94102', '94103', '94107', '94110'],
    profileUrl: 'https://www.psychologytoday.com/us/therapists/emily-wong-san-francisco-ca',
    sessionFormats: ['Virtual'],
    insuranceProviders: ['Aetna', 'Blue Shield', 'UnitedHealthcare'],
    expertise: ['Anxiety', 'OCD tendencies', 'Body image concerns', 'Medication concerns', 'Chronic pain'],
    therapyModels: ['ACT', 'CBT', 'Mindfulness-Based Therapy'],
    conversationStyleProfile: {
      directiveness: 7,
      emotionalIntensity: 5,
      pastOrientation: 4,
      warmSupport: 7,
    },
    bio: 'Blends practical tools with steady support for anxiety, health stress, and repetitive thought patterns.',
  },
  {
    id: 'david-kim',
    name: 'David Kim',
    credentials: 'LMHC',
    location: 'Seattle, WA',
    areaCodes: ['98101', '98102', '98103', '98109'],
    profileUrl: 'https://www.psychologytoday.com/us/therapists/david-kim-seattle-wa',
    sessionFormats: ['InPerson', 'Virtual'],
    insuranceProviders: ['Premera', 'Regence', 'Cigna'],
    expertise: ['Parenthood', 'Family boundaries', 'Relationship conflict', 'Self-esteem', 'Communication skills'],
    therapyModels: ['Internal Family Systems', 'Gottman Method', 'Narrative Therapy'],
    conversationStyleProfile: {
      directiveness: 5,
      emotionalIntensity: 6,
      pastOrientation: 6,
      warmSupport: 9,
    },
    bio: 'Supports couples, parents, and individuals who want a collaborative and affirming therapy room.',
  },
];

const profileKeys: Array<keyof CnipPreferenceProfile> = ['directiveness', 'emotionalIntensity', 'pastOrientation', 'warmSupport'];

export function buildCnipPreferenceProfile(styles: CnipConversationStyle[]): CnipPreferenceProfile {
  if (styles.length === 0) return emptyCnipPreferenceProfile;

  return profileKeys.reduce(
    (profile, key) => ({
      ...profile,
      [key]: Math.round(styles.reduce((sum, style) => sum + cnipStyleProfiles[style][key], 0) / styles.length),
    }),
    emptyCnipPreferenceProfile
  );
}

function flattenLifeAspects(data: OnboardingFormData) {
  return [
    ...data.lifeAspectsByCategory.symptomsAndDiagnoses,
    ...data.lifeAspectsByCategory.lifeStagesAndTransitions,
    ...data.lifeAspectsByCategory.physicalHealthRelatedIssues,
    ...data.lifeAspectsByCategory.selfIdentityAndSocialRelationships,
  ];
}

function calculateStyleFit(userProfile: CnipPreferenceProfile, therapistProfile: CnipPreferenceProfile) {
  if (profileKeys.every((key) => userProfile[key] === 0)) return 70;
  const totalDistance = profileKeys.reduce((sum, key) => sum + Math.abs(userProfile[key] - therapistProfile[key]), 0);
  const maxDistance = profileKeys.length * 10;
  return Math.round((1 - totalDistance / maxDistance) * 100);
}

function uniqueMatches(preferences: string[], therapistValues: string[]) {
  const therapistSet = new Set(therapistValues.map((value) => value.toLowerCase()));
  return preferences.filter((value) => therapistSet.has(value.toLowerCase()));
}

export function recommendTherapists(data: OnboardingFormData): TherapistRecommendation[] {
  const requestedAspects = flattenLifeAspects(data);
  const carePreference = data.carePreference;

  return samplePsychologyTodayTherapists
    .map((therapist) => {
      const matchingExpertise = uniqueMatches(requestedAspects, therapist.expertise);
      const styleFit = calculateStyleFit(data.cnipPreferenceProfile, therapist.conversationStyleProfile);
      const expertiseFit = requestedAspects.length === 0 ? 65 : Math.round((matchingExpertise.length / requestedAspects.length) * 100);
      const formatFit = carePreference === 'Either' || carePreference === '' || therapist.sessionFormats.includes(carePreference) ? 100 : 35;
      const zipFit = therapist.areaCodes.includes(data.areaCode) ? 100 : 45;
      const insuranceFit =
        data.insuranceProvider.trim().length === 0 || therapist.insuranceProviders.some((provider) => provider.toLowerCase() === data.insuranceProvider.trim().toLowerCase())
          ? 100
          : 35;
      const logisticsFit = Math.round(formatFit * 0.45 + zipFit * 0.35 + insuranceFit * 0.2);
      const score = Math.round(styleFit * 0.42 + expertiseFit * 0.38 + logisticsFit * 0.2);
      const modelReason = therapist.therapyModels.length > 0 ? `${therapist.therapyModels.slice(0, 2).join(' and ')} line up with the support you described.` : '';

      return {
        therapist,
        score,
        styleFit,
        expertiseFit,
        logisticsFit,
        reasons: [
          `${styleFit}% C-NIP style fit based on your conversation preferences.`,
          matchingExpertise.length > 0 ? `Matches ${matchingExpertise.slice(0, 3).join(', ')}.` : 'Broad fit for your selected concerns.',
          modelReason,
          formatFit === 100 ? `Offers your preferred ${carePreference === 'Either' ? 'session format' : carePreference.toLowerCase()} option.` : 'Session format may need confirmation.',
        ].filter(Boolean),
      };
    })
    .sort((a, b) => b.score - a.score);
}
