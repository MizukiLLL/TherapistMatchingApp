export type TherapistInsurance = {
  provider: string;
  plan: string | null;
  acceptingNewPatients: boolean;
};

export type TherapistDirectoryRecord = {
  id: string;
  fullName: string;
  credentials: string;
  bio: string;
  languages: string[];
  licenseStates: string[];
  areaCodesServed: string[];
  therapyTypes: string[];
  telehealthAvailable: boolean;
  inPersonAvailable: boolean;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  isActive: boolean;
  profileUrl: string;
  insurance: TherapistInsurance[];
};

export const therapistDirectory: TherapistDirectoryRecord[] = [
  {
    id: 'maya-chen',
    fullName: 'Maya Chen',
    credentials: 'LMFT',
    bio: 'Works with anxiety, family patterns, and relationship stress through warm, emotionally attuned sessions.',
    languages: ['Mandarin', 'English'],
    licenseStates: ['NY'],
    areaCodesServed: ['10001', '10002', '10003', '11201'],
    therapyTypes: ['Anxiety', 'Relationship conflict', 'Family boundaries', 'Communication skills', 'Career change', 'Workplace conflict', 'People-pleasing'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: 165,
    hourlyRateMax: 225,
    isActive: true,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/maya-chen-new-york-ny',
    insurance: [
      { provider: 'Aetna', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'Aetna', plan: 'Open Choice', acceptingNewPatients: true },
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
    therapyTypes: ['Depression', 'Career change', 'College / school stress', 'Sleep problems', 'Self-esteem', 'Stress and burnout', 'ADHD or focus concerns', 'Job loss', 'Substance use concerns'],
    telehealthAvailable: true,
    inPersonAvailable: false,
    hourlyRateMin: 140,
    hourlyRateMax: 190,
    isActive: true,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/jonathan-reed-new-york-ny',
    insurance: [
      { provider: 'Aetna', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'Oscar', plan: 'Circle Plus', acceptingNewPatients: true },
      { provider: 'Oxford', plan: 'Freedom', acceptingNewPatients: true },
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
    therapyTypes: ['Trauma / PTSD', 'Panic attacks', 'Identity exploration', 'Loneliness', 'Relocation', 'Grief and loss', 'Immigration or acculturation', 'Cultural identity', 'Social anxiety'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: 190,
    hourlyRateMax: 260,
    isActive: true,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/sofia-morales-los-angeles-ca',
    insurance: [
      { provider: 'Blue Shield', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'Cigna', plan: 'Open Access Plus', acceptingNewPatients: true },
      { provider: 'Kaiser', plan: 'HMO', acceptingNewPatients: false },
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
    therapyTypes: ['Anxiety', 'OCD tendencies', 'Body image concerns', 'Medication concerns', 'Chronic pain', 'Eating concerns', 'Appetite changes', 'Fatigue or low energy', 'Sexual health concerns', 'Disability adjustment', 'Serious diagnosis'],
    telehealthAvailable: true,
    inPersonAvailable: false,
    hourlyRateMin: 150,
    hourlyRateMax: 210,
    isActive: true,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/emily-wong-san-francisco-ca',
    insurance: [
      { provider: 'Aetna', plan: 'Open Choice', acceptingNewPatients: true },
      { provider: 'Blue Shield', plan: 'PPO', acceptingNewPatients: true },
      { provider: 'UnitedHealthcare', plan: 'Choice Plus', acceptingNewPatients: true },
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
    therapyTypes: ['Parenthood', 'Family boundaries', 'Relationship conflict', 'Self-esteem', 'Communication skills', 'Caregiving stress', 'Aging parents', 'Marriage or commitment', 'Dating stress', 'Pregnancy or postpartum health', 'Fertility or family planning'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: 135,
    hourlyRateMax: 185,
    isActive: true,
    profileUrl: 'https://www.psychologytoday.com/us/therapists/david-kim-seattle-wa',
    insurance: [
      { provider: 'Premera', plan: 'Heritage', acceptingNewPatients: true },
      { provider: 'Regence', plan: 'Preferred', acceptingNewPatients: true },
      { provider: 'Cigna', plan: 'Open Access Plus', acceptingNewPatients: true },
    ],
  },
  {
    id: 'inactive-directory-profile',
    fullName: 'Inactive Directory Profile',
    credentials: 'LCSW',
    bio: 'Fixture used to ensure inactive providers do not appear in search results.',
    languages: ['English'],
    licenseStates: ['NY'],
    areaCodesServed: ['10001'],
    therapyTypes: ['Anxiety'],
    telehealthAvailable: true,
    inPersonAvailable: true,
    hourlyRateMin: null,
    hourlyRateMax: null,
    isActive: false,
    profileUrl: 'https://example.com/inactive-profile',
    insurance: [{ provider: 'Aetna', plan: 'PPO', acceptingNewPatients: true }],
  },
];
