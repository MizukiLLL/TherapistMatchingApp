import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Heart, Loader2, Save, Send, Sparkles } from 'lucide-react';
import { generateTherapistMatches, loadOnboardingState, saveOnboardingState } from '../onboardingApi';
import { CnipConversationStyle, ModalityPreferenceId, OnboardingFormData, PreferredLanguage } from '../onboardingTypes';
import { legacyProfileToStyleVector, scoreUserStyleScenarios, STYLE_SCENARIOS, styleVectorToLegacyProfile } from '../matching/userStyleScoring';
import { generateIdealTherapistProfileFromInputs } from '../matching/idealTherapistProfile';
import { MODALITY_PREFERENCE_OPTIONS } from '../matching/modalityCheatSheet';
import { CULTURAL_CONTEXT_OPTIONS, LANGUAGE_OPTIONS, formatBudgetRange } from '../matching/logisticsQuestionnaire';
import { buildCnipPreferenceProfile } from '../utils/therapistRecommendations';
import type { PsychologyTodayTherapistProfile, TherapistRecommendation } from '../utils/therapistRecommendations';

type Step = number;
type IntroStage = 'cover' | 'lit' | 'chat';
type Locale = 'zh-CN' | 'zh-HK' | 'en';
type LifeAspectCategory = keyof OnboardingFormData['lifeAspectsByCategory'];
type LocalizedLabel = Record<Locale, string>;
type Option<T extends string = string> = { id: T; label: LocalizedLabel };
type CnipStyleOption = {
  id: CnipConversationStyle;
  therapistName: string;
  styleLabel: string;
  sampleResponse: (concerns: string) => string;
  traits: string[];
};
type SavedTherapistsById = Record<string, PsychologyTodayTherapistProfile>;

const TOTAL_STEPS = 16;
const SAVED_THERAPISTS_STORAGE_KEY = 'bettermatch-saved-therapists';

const LIFE_ASPECT_CATEGORY_BY_STEP: Record<1 | 2 | 3 | 4, LifeAspectCategory> = {
  1: 'symptomsAndDiagnoses',
  2: 'lifeStagesAndTransitions',
  3: 'physicalHealthRelatedIssues',
  4: 'selfIdentityAndSocialRelationships',
};

function readSavedTherapists(): SavedTherapistsById {
  if (typeof window === 'undefined') return {};

  const rawValue = window.localStorage.getItem(SAVED_THERAPISTS_STORAGE_KEY);
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed as SavedTherapistsById).filter(
        ([id, therapist]) =>
          id &&
          therapist &&
          typeof therapist === 'object' &&
          typeof therapist.id === 'string' &&
          typeof therapist.name === 'string' &&
          typeof therapist.credentials === 'string'
      )
    );
  } catch {
    return {};
  }
}

function writeSavedTherapists(savedTherapists: SavedTherapistsById): void {
  try {
    window.localStorage.setItem(SAVED_THERAPISTS_STORAGE_KEY, JSON.stringify(savedTherapists));
  } catch {
    // Saving a shortlist should not block match results.
  }
}

function joinOrFallback(values: string[] | undefined, fallback: string): string {
  return values?.length ? values.join(', ') : fallback;
}

function getTherapistSessionText(therapist: PsychologyTodayTherapistProfile): string {
  return therapist.sessionFormats?.length ? therapist.sessionFormats.map((format) => (format === 'InPerson' ? 'In person' : 'Virtual')).join(' + ') : 'Confirm with therapist';
}

function getTherapistInsuranceText(therapist: PsychologyTodayTherapistProfile): string {
  if (therapist.matchingInsurance?.length) {
    return therapist.matchingInsurance.map((insurance) => `${insurance.provider}${insurance.plan ? ` ${insurance.plan}` : ''}`).join(', ');
  }

  return therapist.insuranceProviders?.length ? therapist.insuranceProviders.join(', ') : 'Confirm with therapist';
}

function getTherapistRateText(therapist: PsychologyTodayTherapistProfile): string {
  if (therapist.hourlyRateMin && therapist.hourlyRateMax) return `$${therapist.hourlyRateMin}-$${therapist.hourlyRateMax}/session`;
  if (therapist.hourlyRateMin) return `From $${therapist.hourlyRateMin}/session`;
  return 'Rate not listed';
}

function getStyleFitLabel(styleFit: number): string {
  if (styleFit >= 85) return 'Strong conversation style fit';
  if (styleFit >= 70) return 'Good conversation style fit';
  return 'Possible conversation style fit';
}

const emptyLifeAspectSelections: OnboardingFormData['lifeAspectsByCategory'] = {
  symptomsAndDiagnoses: [],
  lifeStagesAndTransitions: [],
  physicalHealthRelatedIssues: [],
  selfIdentityAndSocialRelationships: [],
};

const emptyLifeAspectNotes: OnboardingFormData['lifeAspectNotesByCategory'] = {
  symptomsAndDiagnoses: '',
  lifeStagesAndTransitions: '',
  physicalHealthRelatedIssues: '',
  selfIdentityAndSocialRelationships: '',
};

const emptyLifeAspectSkipped: OnboardingFormData['lifeAspectSkippedByCategory'] = {
  symptomsAndDiagnoses: false,
  lifeStagesAndTransitions: false,
  physicalHealthRelatedIssues: false,
  selfIdentityAndSocialRelationships: false,
};

const EMPTY_FORM: OnboardingFormData = {
  email: '',
  areaCode: '',
  preferredLanguage: 'English',
  therapyFor: '',
  carePreference: '',
  lifeAspectsByCategory: emptyLifeAspectSelections,
  lifeAspectNotesByCategory: emptyLifeAspectNotes,
  lifeAspectSkippedByCategory: emptyLifeAspectSkipped,
  insuranceProvider: '',
  insurancePlan: '',
  cnipConversationStyles: [],
  cnipPreferenceProfile: buildCnipPreferenceProfile([]),
  styleScenarioResponses: [],
  userStyleVector: {
    therapist_directive: 0.5,
    emotionally_intensive: 0.5,
    past_focused: 0.5,
    support_focused: 0.5,
  },
  modalityPreferenceIds: [],
  logistics: {
    requiredLanguages: [],
    preferredLanguages: [],
    languagePriority: 'flexible',
    culturalContextNeeds: [],
    identitySupportNeeds: [],
    culturePriority: 'low',
    state: '',
    radiusMiles: null,
    paymentPreference: '',
    budgetRange: '',
    availability: '',
  },
};

const therapyForOptions: Option<Exclude<OnboardingFormData['therapyFor'], ''>>[] = [
  { id: 'Myself', label: { en: 'Myself', 'zh-CN': '我自己', 'zh-HK': '我自己' } },
  { id: 'Child', label: { en: 'My child', 'zh-CN': '我的孩子', 'zh-HK': '我的孩子' } },
  { id: 'Partner', label: { en: 'My partner', 'zh-CN': '我的伴侣', 'zh-HK': '我的伴侶' } },
  { id: 'Family', label: { en: 'My family', 'zh-CN': '我的家人', 'zh-HK': '我的家人' } },
];

const carePreferenceOptions: Option<Exclude<OnboardingFormData['carePreference'], ''>>[] = [
  { id: 'InPerson', label: { en: 'In person', 'zh-CN': '当面聊', 'zh-HK': '見面傾' } },
  { id: 'Virtual', label: { en: 'Online', 'zh-CN': '网上聊', 'zh-HK': '網上傾' } },
  { id: 'Either', label: { en: 'Either is fine', 'zh-CN': '都可以', 'zh-HK': '都可以' } },
];

const paymentPreferenceOptions = [
  { id: 'insurance', label: 'I want to use insurance' },
  { id: 'out_of_pocket', label: 'I am paying out of pocket' },
  { id: 'sliding_scale', label: 'I need affordable or sliding-scale options' },
  { id: 'not_sure', label: 'I am not sure yet' },
] as const;

const budgetOptions = [
  { id: 'under_75', label: 'Under $75' },
  { id: '75_125', label: '$75-$125' },
  { id: '125_175', label: '$125-$175' },
  { id: '175_250', label: '$175-$250' },
  { id: 'flexible', label: 'Flexible' },
] as const;

const availabilityOptions: Option<Exclude<OnboardingFormData['logistics']['availability'], ''>>[] = [
  { id: 'asap', label: { en: 'Within 1 week', 'zh-CN': '一周内', 'zh-HK': '一週內' } },
  { id: '1_2_weeks', label: { en: 'Within 1 month', 'zh-CN': '一个月内', 'zh-HK': '一個月內' } },
  { id: 'within_month', label: { en: 'Within 3 months', 'zh-CN': '三个月内', 'zh-HK': '三個月內' } },
  { id: 'exploring', label: { en: 'No specific timeline', 'zh-CN': '没有特定时间', 'zh-HK': '冇特定時間' } },
];

const commonInsuranceProviders = [
  'Kaiser Permanente',
  'Blue Shield of California',
  'Anthem Blue Cross',
  'Health Net',
  'Molina Healthcare',
  'LA Care Health Plan',
  'Sharp Health Plan',
  'Valley Health Plan',
  'Western Health Advantage',
  'Inland Empire Health Plan',
  'Balance by CCHP',
  'Aetna',
  'Cigna',
  'UnitedHealthcare',
  'Optum',
  'Medi-Cal',
  'Medicare',
];

const commonInsurancePlans = [
  'HMO',
  'PPO',
  'EPO',
  'POS',
  'Bronze 60',
  'Silver 70',
  'Enhanced Silver 73',
  'Enhanced Silver 87',
  'Enhanced Silver 94',
  'Gold 80',
  'Platinum 90',
  'Minimum Coverage',
  'Medi-Cal',
  'Medicare Advantage',
];

const lifeAspectOptions: Record<LifeAspectCategory, Option[]> = {
  symptomsAndDiagnoses: [
    { id: 'Anxiety', label: { en: 'I feel anxious', 'zh-CN': '我最近容易紧张', 'zh-HK': '我最近容易緊張' } },
    { id: 'Depression', label: { en: 'Low mood', 'zh-CN': '我最近心情低落', 'zh-HK': '我最近心情低落' } },
    { id: 'Panic attacks', label: { en: 'Panic feelings', 'zh-CN': '我会突然很慌', 'zh-HK': '我會突然好慌' } },
    { id: 'Trauma / PTSD', label: { en: 'A painful past experience', 'zh-CN': '过去的经历一直影响我', 'zh-HK': '以前嘅經歷仲影響住我' } },
    { id: 'Mood swings', label: { en: 'My mood changes a lot', 'zh-CN': '我的情绪起伏比较大', 'zh-HK': '我嘅情緒起伏比較大' } },
    { id: 'OCD tendencies', label: { en: 'Repeated thoughts or habits', 'zh-CN': '我会反复想或反复做', 'zh-HK': '我會反覆諗或反覆做' } },
  ],
  lifeStagesAndTransitions: [
    { id: 'Career change', label: { en: 'Work changes', 'zh-CN': '工作上有变化', 'zh-HK': '工作上有轉變' } },
    { id: 'Parenthood', label: { en: 'Parenting', 'zh-CN': '照顾孩子的压力', 'zh-HK': '照顧小朋友嘅壓力' } },
    { id: 'College / school stress', label: { en: 'School stress', 'zh-CN': '学习压力', 'zh-HK': '讀書壓力' } },
    { id: 'Divorce or breakup', label: { en: 'A breakup or divorce', 'zh-CN': '分手或离婚', 'zh-HK': '分手或離婚' } },
    { id: 'Relocation', label: { en: 'Moving somewhere new', 'zh-CN': '搬到新地方', 'zh-HK': '搬去新地方' } },
    { id: 'Retirement', label: { en: 'Retirement', 'zh-CN': '退休后的适应', 'zh-HK': '退休後嘅適應' } },
  ],
  physicalHealthRelatedIssues: [
    { id: 'Chronic pain', label: { en: 'Long-term pain', 'zh-CN': '长期疼痛', 'zh-HK': '長期痛症' } },
    { id: 'Sleep problems', label: { en: 'I am not sleeping well', 'zh-CN': '我最近睡不好', 'zh-HK': '我最近瞓得唔好' } },
    { id: 'Illness-related stress', label: { en: 'Stress from my health', 'zh-CN': '身体状况让我有压力', 'zh-HK': '身體狀況令我有壓力' } },
    { id: 'Medication concerns', label: { en: 'Medication worries', 'zh-CN': '我对用药有担心', 'zh-HK': '我對食藥有擔心' } },
    { id: 'Body image concerns', label: { en: 'Body image', 'zh-CN': '我会在意自己的外貌', 'zh-HK': '我會在意自己嘅外貌' } },
    { id: 'Recovery support', label: { en: 'Recovery support', 'zh-CN': '我需要康复支持', 'zh-HK': '我需要康復支援' } },
  ],
  selfIdentityAndSocialRelationships: [
    { id: 'Self-esteem', label: { en: 'Confidence', 'zh-CN': '我不太自信', 'zh-HK': '我唔太自信' } },
    { id: 'Identity exploration', label: { en: 'Understanding myself', 'zh-CN': '我想更了解自己', 'zh-HK': '我想更了解自己' } },
    { id: 'Loneliness', label: { en: 'Loneliness', 'zh-CN': '我觉得孤单', 'zh-HK': '我覺得孤單' } },
    { id: 'Relationship conflict', label: { en: 'Relationship stress', 'zh-CN': '关系里的压力', 'zh-HK': '關係入面嘅壓力' } },
    { id: 'Family boundaries', label: { en: 'Family boundaries', 'zh-CN': '和家人的界线问题', 'zh-HK': '同屋企人嘅界線問題' } },
    { id: 'Communication skills', label: { en: 'Communication', 'zh-CN': '我不太会表达', 'zh-HK': '我唔太識表達' } },
  ],
};

const additionalLifeAspectOptions: Record<LifeAspectCategory, Option[]> = {
  symptomsAndDiagnoses: [
    { id: 'Stress and burnout', label: { en: 'Stress or burnout', 'zh-CN': 'Stress or burnout', 'zh-HK': 'Stress or burnout' } },
    { id: 'Grief and loss', label: { en: 'Grief or loss', 'zh-CN': 'Grief or loss', 'zh-HK': 'Grief or loss' } },
    { id: 'Anger or irritability', label: { en: 'Anger or irritability', 'zh-CN': 'Anger or irritability', 'zh-HK': 'Anger or irritability' } },
    { id: 'ADHD or focus concerns', label: { en: 'Focus or ADHD concerns', 'zh-CN': 'Focus or ADHD concerns', 'zh-HK': 'Focus or ADHD concerns' } },
    { id: 'Eating concerns', label: { en: 'Eating concerns', 'zh-CN': 'Eating concerns', 'zh-HK': 'Eating concerns' } },
    { id: 'Substance use concerns', label: { en: 'Substance use concerns', 'zh-CN': 'Substance use concerns', 'zh-HK': 'Substance use concerns' } },
  ],
  lifeStagesAndTransitions: [
    { id: 'Immigration or acculturation', label: { en: 'Immigration or culture adjustment', 'zh-CN': 'Immigration or culture adjustment', 'zh-HK': 'Immigration or culture adjustment' } },
    { id: 'Job loss', label: { en: 'Job loss', 'zh-CN': 'Job loss', 'zh-HK': 'Job loss' } },
    { id: 'Caregiving stress', label: { en: 'Caregiving stress', 'zh-CN': 'Caregiving stress', 'zh-HK': 'Caregiving stress' } },
    { id: 'Marriage or commitment', label: { en: 'Marriage or commitment changes', 'zh-CN': 'Marriage or commitment changes', 'zh-HK': 'Marriage or commitment changes' } },
    { id: 'Fertility or family planning', label: { en: 'Fertility or family planning', 'zh-CN': 'Fertility or family planning', 'zh-HK': 'Fertility or family planning' } },
    { id: 'Aging parents', label: { en: 'Aging parents', 'zh-CN': 'Aging parents', 'zh-HK': 'Aging parents' } },
  ],
  physicalHealthRelatedIssues: [
    { id: 'Fatigue or low energy', label: { en: 'Fatigue or low energy', 'zh-CN': 'Fatigue or low energy', 'zh-HK': 'Fatigue or low energy' } },
    { id: 'Pregnancy or postpartum health', label: { en: 'Pregnancy or postpartum health', 'zh-CN': 'Pregnancy or postpartum health', 'zh-HK': 'Pregnancy or postpartum health' } },
    { id: 'Disability adjustment', label: { en: 'Disability adjustment', 'zh-CN': 'Disability adjustment', 'zh-HK': 'Disability adjustment' } },
    { id: 'Serious diagnosis', label: { en: 'A serious diagnosis', 'zh-CN': 'A serious diagnosis', 'zh-HK': 'A serious diagnosis' } },
    { id: 'Appetite changes', label: { en: 'Appetite changes', 'zh-CN': 'Appetite changes', 'zh-HK': 'Appetite changes' } },
    { id: 'Sexual health concerns', label: { en: 'Sexual health concerns', 'zh-CN': 'Sexual health concerns', 'zh-HK': 'Sexual health concerns' } },
  ],
  selfIdentityAndSocialRelationships: [
    { id: 'Social anxiety', label: { en: 'Social anxiety', 'zh-CN': 'Social anxiety', 'zh-HK': 'Social anxiety' } },
    { id: 'Cultural identity', label: { en: 'Cultural identity', 'zh-CN': 'Cultural identity', 'zh-HK': 'Cultural identity' } },
    { id: 'Dating stress', label: { en: 'Dating stress', 'zh-CN': 'Dating stress', 'zh-HK': 'Dating stress' } },
    { id: 'Workplace conflict', label: { en: 'Workplace conflict', 'zh-CN': 'Workplace conflict', 'zh-HK': 'Workplace conflict' } },
    { id: 'LGBTQ+ identity', label: { en: 'LGBTQ+ identity', 'zh-CN': 'LGBTQ+ identity', 'zh-HK': 'LGBTQ+ identity' } },
    { id: 'People-pleasing', label: { en: 'People-pleasing', 'zh-CN': 'People-pleasing', 'zh-HK': 'People-pleasing' } },
  ],
};

const expandedLifeAspectOptions: Record<LifeAspectCategory, Option[]> = {
  symptomsAndDiagnoses: [...lifeAspectOptions.symptomsAndDiagnoses, ...additionalLifeAspectOptions.symptomsAndDiagnoses],
  lifeStagesAndTransitions: [...lifeAspectOptions.lifeStagesAndTransitions, ...additionalLifeAspectOptions.lifeStagesAndTransitions],
  physicalHealthRelatedIssues: [...lifeAspectOptions.physicalHealthRelatedIssues, ...additionalLifeAspectOptions.physicalHealthRelatedIssues],
  selfIdentityAndSocialRelationships: [...lifeAspectOptions.selfIdentityAndSocialRelationships, ...additionalLifeAspectOptions.selfIdentityAndSocialRelationships],
};

const cnipStyleOptions: CnipStyleOption[] = [
  {
    id: 'structuredGuide',
    therapistName: 'Ava',
    styleLabel: 'Structured guide',
    sampleResponse: (concerns) => `We can start by mapping when ${concerns} shows up, choose one target for the first session, and leave with a clear next step.`,
    traits: ['directive', 'present-focused', 'clear plan'],
  },
  {
    id: 'reflectiveCompanion',
    therapistName: 'Nina',
    styleLabel: 'Reflective companion',
    sampleResponse: (concerns) => `I would slow down with you around ${concerns}, reflect what feels most tender, and let the pace come from what feels safe to say.`,
    traits: ['client-led', 'warm support', 'steady pace'],
  },
  {
    id: 'deepExplorer',
    therapistName: 'Leah',
    styleLabel: 'Deep explorer',
    sampleResponse: (concerns) => `I would be curious about how ${concerns} connects to earlier patterns, important relationships, and emotions that may not have had enough room.`,
    traits: ['depth work', 'emotion-focused', 'past-oriented'],
  },
  {
    id: 'practicalCoach',
    therapistName: 'Sofia',
    styleLabel: 'Practical coach',
    sampleResponse: (concerns) => `For ${concerns}, I would help you test a small skill this week, notice what works, and adjust the plan together next time.`,
    traits: ['skills-based', 'focused challenge', 'home practice'],
  },
];

const copyByLocale = {
  en: {
    brand: 'BetterMatch',
    intro: "Hi, I am your little match. I am so proud of you that you're making the first step of getting help. Don't worry! It will be easy. I will ask a few quick questions, and we can narrow this down together.",
    loading: 'Loading your saved answers...',
    back: 'Back',
    continue: 'Continue',
    save: 'Save answers',
    saveDraft: 'Save draft',
    saving: 'Saving...',
    savedSuccess: 'Saved. Your answers are stored on this device and in the local database when available.',
    savedAtLabel: 'Last saved',
    requiredHint: 'Pick at least one option, type a note, or use "No, next" to continue.',
    questionLanguage: 'What language would you like to use?',
    questionAreaCode: 'Thanks. What is your ZIP code?',
    questionTherapyFor: 'Who is this for?',
    questionCarePreference: 'Would you rather meet in person or online?',
    questionSymptoms: 'Do any of these feel true for you lately?',
    questionTransitions: 'Are you going through any of these changes?',
    questionPhysical: 'Is any of this tied to your physical health?',
    questionIdentity: 'Is any of this about yourself or your relationships?',
    questionIdealProfile: 'Here is your Ideal Therapist Profile.',
    questionLogisticsTransition: "Now let's find real therapists who match this.",
    questionModalityPreferences: 'What kind of help are you hoping therapy gives you?',
    questionCulturalContext: "Are there cultural, identity, or life experiences you'd like your therapist to understand?",
    questionCulturePriority: 'How much should that shape your matches?',
    questionPayment: 'How would you like to handle payment?',
    questionEmail: 'Would you like to stay connected? Enter your email for therapist updates.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    emailSkip: 'No thanks, skip this',
    emailInvalid: "That email doesn't look quite right. You can also skip.",
    questionTimeFrame: 'When would you like to start therapy?',
    questionConversationStyle: 'Four therapists are joining the chat. Which conversation styles would feel helpful?',
    areaCodeLabel: 'ZIP code',
    areaCodeHint: 'Please enter a 5-digit U.S. ZIP code.',
    moreToAddLabel: 'Anything else?',
    moreToAddPlaceholder: 'Write a short note...',
    insuranceProviderLabel: 'Insurance provider',
    insuranceProviderPlaceholder: 'Kaiser, Blue Shield, Aetna, Medi-Cal...',
    insurancePlanLabel: 'Plan, optional',
    insurancePlanPlaceholder: 'PPO, HMO, Silver 70...',
    insuranceQuickPickLabel: 'Common California options',
    insurancePlanQuickPickLabel: 'Common plan types',
    insuranceHint: 'Insurance helps us rank coverage, but we will still show the best available matches if you skip it.',
    styleHint: 'Choose one or more. We will use this C-NIP style profile to explain therapist fit.',
    recommendationsTitle: 'Recommended therapists',
    recommendationsSubtitle: 'Focused on conversation style fit and recommended therapy models.',
    recommendationSource: 'Backend therapist profiles',
    styleFit: 'Style fit',
    expertiseFit: 'Expertise fit',
    logisticsFit: 'Logistics fit',
    backToAnswers: 'Back to answers',
    viewProfile: 'View profile',
    matchedFocus: 'Recommended model',
    profileFocus: 'Profile focus',
    languagesLabel: 'Languages',
    sessionFormatLabel: 'Sessions',
    insuranceLabel: 'Insurance match',
    rateLabel: 'Rate',
    serviceAreaLabel: 'Service area',
    noRecommendationsTitle: 'No exact matches yet',
    noRecommendationsBody: 'No active therapist profiles are available yet. Once the directory has at least one profile, we will show the closest available matches.',
    selectedStylesLabel: 'Selected styles',
    saveTherapist: 'Save',
    savedTherapist: 'Saved',
    savedTherapistsTitle: 'Saved therapists',
    savedTherapistsEmpty: 'Save therapists from the result cards to keep a shortlist here.',
    compareTitle: 'Compare saved therapists',
    compareHint: 'Save at least two therapists to compare their key details.',
    compareColumnTherapist: 'Therapist',
    removeSaved: 'Remove',
    noAndNext: 'No, next',
    skippedReply: 'No, next',
    loadError: 'Could not load your saved answers.',
    submitError: 'Could not save right now. Please try again.',
    stepLabel: 'Question',
    languageOptions: { English: 'English', Mandarin: '普通话', Cantonese: '廣東話' },
  },
  'zh-CN': {
    brand: 'BetterMatch',
    intro: '你好。我会问几个简短的问题，帮你一步步缩小范围。',
    loading: '正在读取你之前的回答...',
    back: '返回',
    continue: '继续',
    save: '保存回答',
    saveDraft: '保存草稿',
    saving: '保存中...',
    savedSuccess: '已保存。接下来可以进入匹配。',
    savedAtLabel: '上次保存',
    requiredHint: '请至少选一个选项、写一点补充，或者点“没有，下一个”。',
    questionLanguage: '你想用哪种语言？',
    questionAreaCode: '谢谢。你的 ZIP 邮编是多少？',
    questionTherapyFor: '这次是谁想找咨询师？',
    questionCarePreference: '你想当面聊，还是网上聊？',
    questionSymptoms: '最近有没有这些感觉？',
    questionTransitions: '你最近有没有经历这些变化？',
    questionPhysical: '这些事情和身体状况有关吗？',
    questionIdentity: '这些事情和你自己、家人或关系有关吗？',
    questionEmail: '想保持联系吗？留下邮箱接收治疗师更新。',
    emailLabel: '邮箱',
    emailPlaceholder: 'you@example.com',
    emailSkip: '不用了，跳过',
    emailInvalid: '邮箱格式看起来不太对，你也可以跳过。',
    questionTimeFrame: '你希望多快开始咨询？',
    questionCulturePriority: '这一点对你的匹配有多重要？',
    questionConversationStyle: 'Four therapists are joining the chat. Which conversation styles would feel helpful?',
    areaCodeLabel: 'ZIP 邮编',
    areaCodeHint: '请输入 5 位美国 ZIP 邮编。',
    moreToAddLabel: '还想补充吗？',
    moreToAddPlaceholder: '简单写一句就好...',
    styleHint: 'Choose one or more. We will use this C-NIP style profile to explain therapist fit.',
    recommendationsTitle: 'Recommended therapists',
    recommendationsSubtitle: 'Focused on conversation style fit and recommended therapy models.',
    recommendationSource: 'Backend therapist profiles',
    styleFit: 'Style fit',
    expertiseFit: 'Expertise fit',
    logisticsFit: 'Logistics fit',
    backToAnswers: 'Back to answers',
    viewProfile: 'View profile',
    matchedFocus: 'Recommended model',
    profileFocus: 'Profile focus',
    languagesLabel: 'Languages',
    sessionFormatLabel: 'Sessions',
    insuranceLabel: 'Insurance match',
    rateLabel: 'Rate',
    serviceAreaLabel: 'Service area',
    noRecommendationsTitle: 'No exact matches yet',
    noRecommendationsBody: 'No active therapist profiles are available yet. Once the directory has at least one profile, we will show the closest available matches.',
    selectedStylesLabel: 'Selected styles',
    noAndNext: '没有，下一个',
    skippedReply: '没有，下一个',
    loadError: '没能读取之前的回答。',
    submitError: '现在保存不了，请再试一次。',
    stepLabel: '问题',
    languageOptions: { English: 'English', Mandarin: '普通话', Cantonese: '廣東話' },
  },
  'zh-HK': {
    brand: 'BetterMatch',
    intro: '你好。我會問幾條簡短問題，幫你一步步收窄範圍。',
    loading: '正在讀取你之前嘅回答...',
    back: '返回',
    continue: '繼續',
    save: '儲存回答',
    saveDraft: '儲存草稿',
    saving: '儲存中...',
    savedSuccess: '已儲存。下一步可以開始配對。',
    savedAtLabel: '上次儲存',
    requiredHint: '請至少揀一個選項、寫少少補充，或者撳「冇，下一題」。',
    questionLanguage: '你想用邊種語言？',
    questionAreaCode: '多謝。你嘅 ZIP code 係幾多？',
    questionTherapyFor: '今次係邊個想搵治療師？',
    questionCarePreference: '你想見面傾，定係網上傾？',
    questionSymptoms: '最近有冇呢啲感覺？',
    questionTransitions: '你最近有冇經歷以下轉變？',
    questionPhysical: '呢啲事同身體狀況有關嗎？',
    questionIdentity: '呢啲事同你自己、屋企人或者關係有關嗎？',
    questionEmail: '想保持聯絡嗎？留低電郵收新治療師資訊。',
    emailLabel: '電郵',
    emailPlaceholder: 'you@example.com',
    emailSkip: '唔使啦，跳過',
    emailInvalid: '電郵格式好似有啲怪，你都可以跳過。',
    questionTimeFrame: '你希望幾快開始輔導？',
    questionCulturePriority: '呢一點對你嘅配對有幾重要？',
    questionConversationStyle: 'Four therapists are joining the chat. Which conversation styles would feel helpful?',
    areaCodeLabel: 'ZIP code',
    areaCodeHint: '請輸入 5 位美國 ZIP code。',
    moreToAddLabel: '仲想補充嗎？',
    moreToAddPlaceholder: '簡單寫一句就可以...',
    styleHint: 'Choose one or more. We will use this C-NIP style profile to explain therapist fit.',
    recommendationsTitle: 'Recommended therapists',
    recommendationsSubtitle: 'Focused on conversation style fit and recommended therapy models.',
    recommendationSource: 'Backend therapist profiles',
    styleFit: 'Style fit',
    expertiseFit: 'Expertise fit',
    logisticsFit: 'Logistics fit',
    backToAnswers: 'Back to answers',
    viewProfile: 'View profile',
    matchedFocus: 'Recommended model',
    profileFocus: 'Profile focus',
    languagesLabel: 'Languages',
    sessionFormatLabel: 'Sessions',
    insuranceLabel: 'Insurance match',
    rateLabel: 'Rate',
    serviceAreaLabel: 'Service area',
    noRecommendationsTitle: 'No exact matches yet',
    noRecommendationsBody: 'No active therapist profiles are available yet. Once the directory has at least one profile, we will show the closest available matches.',
    selectedStylesLabel: 'Selected styles',
    noAndNext: '冇，下一題',
    skippedReply: '冇，下一題',
    loadError: '讀取唔到之前嘅回答。',
    submitError: '而家儲存唔到，請再試一次。',
    stepLabel: '問題',
    languageOptions: { English: 'English', Mandarin: '普通话', Cantonese: '廣東話' },
  },
} satisfies Record<Locale, Record<string, any>>;

const getLocaleFromPreferredLanguage = (value: PreferredLanguage): Locale => {
  if (value === 'Mandarin') return 'zh-CN';
  if (value === 'Cantonese') return 'zh-HK';
  return 'en';
};

const getOptionLabel = (options: Option[], id: string, locale: Locale) => options.find((option) => option.id === id)?.label[locale] ?? id;

const chipClass = (selected: boolean) =>
  [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition',
    'focus:outline-none focus:ring-4 focus:ring-[#b7c0ae]/35',
    selected
      ? 'border-[#66725d] bg-[#6e7b64] text-[#f9f5ec] shadow-sm'
      : 'border-[#d2c7b4] bg-[#fbf7ef] text-[#40382f] hover:border-[#7a866f] hover:bg-[#f1ede3]',
  ].join(' ');

const therapistBubbleThemes = [
  {
    bubble: 'border border-[#d8e4d4] bg-[#edf5ea] text-[#31412f]',
    tail: 'border-[#d8e4d4] bg-[#edf5ea]',
    tag: 'bg-[#6e7b64] text-[#f9f5ec]',
    meta: 'text-[#5e6d59]',
  },
  {
    bubble: 'border border-[#e4d3c3] bg-[#f4e8dc] text-[#4a3529]',
    tail: 'border-[#e4d3c3] bg-[#f4e8dc]',
    tag: 'bg-[#9a7458] text-[#fff8f1]',
    meta: 'text-[#7a5d49]',
  },
  {
    bubble: 'border border-[#d6deea] bg-[#ecf1f8] text-[#2f3a4d]',
    tail: 'border-[#d6deea] bg-[#ecf1f8]',
    tag: 'bg-[#63748f] text-[#f8fbff]',
    meta: 'text-[#55657d]',
  },
  {
    bubble: 'border border-[#dfd3e2] bg-[#f2eaf4] text-[#46364e]',
    tail: 'border-[#dfd3e2] bg-[#f2eaf4]',
    tag: 'bg-[#82658a] text-[#fcf8ff]',
    meta: 'text-[#6d5874]',
  },
] as const;

const assistantBubbleClass =
  'relative rounded-[22px] rounded-tl-md border border-[#e3ddd1] bg-[#fffdf8] px-5 py-4 text-[15px] leading-7 text-[#40382f] shadow-[0_10px_24px_rgba(97,86,68,0.08)]';

const assistantBubbleTailClass = 'absolute -left-1 top-4 h-3 w-3 rotate-45 border-b border-l border-[#e3ddd1] bg-[#fffdf8]';
const assistantName = 'Match';
const splashHeadline = 'Get your first match!';

function MatchAvatar({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-[#d8d0c2] bg-[#fffaf1] shadow-[0_8px_18px_rgba(97,86,68,0.12)] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-[78%] w-[78%]" fill="none">
        <path d="M15.8 22.7V13.8" stroke="#7a5b39" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13.8 24.2H18" stroke="#7a5b39" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M16 8.1C17.1 5.8 19.7 5.6 20.8 7.5C21.6 8.9 21.2 10.5 20.1 11.6L16 15.6L11.9 11.6C10.8 10.5 10.4 8.9 11.2 7.5C12.3 5.6 14.9 5.8 16 8.1Z"
          fill="#f58a4b"
          stroke="#e06f32"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M16 10.1C16.6 8.9 17.8 8.9 18.4 9.8C18.8 10.5 18.6 11.4 18 12L16 13.9L14 12C13.4 11.4 13.2 10.5 13.6 9.8C14.2 8.9 15.4 8.9 16 10.1Z"
          fill="#ffd26a"
        />
      </svg>
    </div>
  );
}

function InitialsAvatar({ name, className = 'h-8 w-8' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-[#d8d0c2] bg-[#f5efe3] text-xs font-semibold uppercase tracking-[0.08em] text-[#5f6658] shadow-[0_8px_18px_rgba(97,86,68,0.1)] ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function MatchboxScene({ lit }: { lit: boolean }) {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px]">
      <div className="absolute inset-x-[6%] bottom-[8%] top-[10%] rounded-[40px] bg-[linear-gradient(180deg,rgba(255,252,245,0.98)_0%,rgba(245,238,225,0.92)_100%)] shadow-[0_38px_80px_rgba(73,47,25,0.18)]" />
      <div className="absolute inset-x-[14%] bottom-[16%] h-[48%] rounded-[30px] bg-[linear-gradient(180deg,#7e4924_0%,#603418_100%)] shadow-[0_34px_72px_rgba(73,47,25,0.34)]">
        <div className="absolute inset-0 rounded-[30px] border border-[#74441d]/65" />
        <div
          className={[
            'absolute bottom-[10%] top-[10%] w-[72%] rounded-[22px] bg-[linear-gradient(180deg,#f5d8ae_0%,#eec48a_52%,#d99757_100%)] shadow-[inset_0_2px_0_rgba(255,248,235,0.75),inset_0_-8px_14px_rgba(127,80,33,0.18)] transition-all duration-700 ease-out',
            lit ? 'left-[23%]' : 'left-[7%]',
          ].join(' ')}
        >
          <div className="absolute inset-x-[12%] top-[16%] h-[17%] rounded-full bg-[#f8e4c5]/95 shadow-[0_3px_10px_rgba(114,74,38,0.16)]" />
          <div className="absolute inset-y-[20%] right-[6%] w-[4%] rounded-full bg-[#643b1d]/35" />
          <div className="absolute inset-x-[22%] bottom-[11%] h-[11%] rounded-full bg-[#693d1d]/18 blur-[2px]" />
          <div className="absolute left-[18%] top-[34%] h-[10%] w-[64%] rounded-full bg-white/18 blur-sm" />
        </div>
        <div className="absolute -right-[1%] bottom-[14%] top-[18%] w-[6%] rounded-r-[18px] bg-[linear-gradient(180deg,#71421f_0%,#573116_100%)] opacity-95" />
      </div>

      <div
        className={[
          'absolute bottom-[29%] left-1/2 h-[45%] w-7 -translate-x-1/2 transition-all duration-700 ease-out',
          lit ? '-translate-y-[48%] rotate-[7deg]' : 'translate-y-[11%] rotate-0',
        ].join(' ')}
      >
        <div className="absolute bottom-0 left-1/2 h-[82%] w-[4px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#8b6841_0%,#6d4d30_100%)] shadow-[0_0_0_1px_rgba(255,248,236,0.18)]" />
        <div className="absolute bottom-[76%] left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-[#2e2016] shadow-[0_2px_6px_rgba(0,0,0,0.18)]" />
        <div
          className={[
            'absolute bottom-[80%] left-1/2 -translate-x-1/2 transition-all duration-500',
            lit ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          ].join(' ')}
        >
          <div className="relative h-[74px] w-[74px]">
            <div className="absolute inset-[16%] rotate-[8deg] rounded-[56%_44%_58%_42%/62%_42%_58%_38%] bg-[#f28b41] shadow-[0_0_52px_rgba(242,139,65,0.5)]" />
            <div className="absolute inset-[33%] rounded-[52%_48%_60%_40%/62%_38%_58%_42%] bg-[#ffd978]" />
          </div>
        </div>
      </div>
      <div className="absolute left-[18%] right-[18%] bottom-[7%] h-10 rounded-full bg-[#6f4626]/14 blur-xl" />
    </div>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>(0);
  const [introStage, setIntroStage] = useState<IntroStage>('cover');
  const [formData, setFormData] = useState<OnboardingFormData>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [typedIntro, setTypedIntro] = useState('');
  const [typedQuestion, setTypedQuestion] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<TherapistRecommendation[]>([]);
  const [savedTherapists, setSavedTherapists] = useState<SavedTherapistsById>(() => readSavedTherapists());

  const locale = getLocaleFromPreferredLanguage(formData.preferredLanguage);
  const copy: typeof copyByLocale.en = useMemo(() => ({ ...copyByLocale.en, ...copyByLocale[locale] }), [locale]);
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const selectedConcernLabels = useMemo(
    () =>
      (Object.keys(formData.lifeAspectsByCategory) as LifeAspectCategory[]).flatMap((category) =>
        formData.lifeAspectsByCategory[category].map((id) => getOptionLabel(expandedLifeAspectOptions[category], id, locale))
      ),
    [formData.lifeAspectsByCategory, locale]
  );
  const selectedConcernSample = selectedConcernLabels.length > 0 ? selectedConcernLabels.slice(0, 3).join(', ') : 'what has been feeling hardest lately';
  const cnipSampleQuestion = `I want help with ${selectedConcernSample}. How would you work with me?`;
  const selectedConcernIds = useMemo(
    () => (Object.keys(formData.lifeAspectsByCategory) as LifeAspectCategory[]).flatMap((category) => formData.lifeAspectsByCategory[category]),
    [formData.lifeAspectsByCategory]
  );
  const concernNotes = useMemo(
    () => (Object.keys(formData.lifeAspectNotesByCategory) as LifeAspectCategory[]).map((category) => formData.lifeAspectNotesByCategory[category]),
    [formData.lifeAspectNotesByCategory]
  );
  const idealProfile = useMemo(
    () =>
      generateIdealTherapistProfileFromInputs({
        userStyleVector: formData.userStyleVector,
        selectedConcerns: selectedConcernIds,
        freeTextNotes: concernNotes,
        modalityPreferenceIds: formData.modalityPreferenceIds,
      }),
    [concernNotes, formData.modalityPreferenceIds, formData.userStyleVector, selectedConcernIds]
  );
  const savedTherapistList = useMemo(
    () => (Object.values(savedTherapists) as PsychologyTodayTherapistProfile[]).sort((left, right) => (left.name ?? '').localeCompare(right.name ?? '')),
    [savedTherapists]
  );
  const compareTherapists = savedTherapistList.slice(0, 3);

  const questions = useMemo(
    () => [
      copy.questionConversationStyle,
      copy.questionSymptoms,
      copy.questionTransitions,
      copy.questionPhysical,
      copy.questionIdentity,
      copy.questionModalityPreferences,
      copy.questionIdealProfile,
      copy.questionLogisticsTransition,
      copy.questionTherapyFor,
      copy.questionTimeFrame,
      copy.questionLanguage,
      copy.questionCulturalContext,
      copy.questionCulturePriority,
      copy.questionAreaCode,
      copy.questionPayment,
      copy.questionEmail,
    ],
    [copy]
  );
  const currentQuestion = questions[step];

  useEffect(() => {
    const hydrate = async () => {
      try {
        const saved = await loadOnboardingState();
        if (saved) {
          const cnipPreferenceProfile =
            saved.data.cnipPreferenceProfile ?? buildCnipPreferenceProfile(saved.data.cnipConversationStyles ?? []);
          const styleScenarioResponses = saved.data.styleScenarioResponses ?? [];
          const userStyleVector =
            saved.data.userStyleVector ??
            (styleScenarioResponses.length > 0 ? scoreUserStyleScenarios(styleScenarioResponses) : legacyProfileToStyleVector(cnipPreferenceProfile));

          setFormData({
            email: saved.data.email ?? '',
            areaCode: saved.data.areaCode ?? '',
            preferredLanguage: saved.data.preferredLanguage ?? 'English',
            therapyFor: saved.data.therapyFor ?? '',
            carePreference: saved.data.carePreference ?? '',
            lifeAspectsByCategory: { ...emptyLifeAspectSelections, ...(saved.data.lifeAspectsByCategory ?? {}) },
            lifeAspectNotesByCategory: { ...emptyLifeAspectNotes, ...(saved.data.lifeAspectNotesByCategory ?? {}) },
            lifeAspectSkippedByCategory: { ...emptyLifeAspectSkipped, ...(saved.data.lifeAspectSkippedByCategory ?? {}) },
            insuranceProvider: saved.data.insuranceProvider ?? '',
            insurancePlan: saved.data.insurancePlan ?? '',
            cnipConversationStyles: saved.data.cnipConversationStyles ?? [],
            cnipPreferenceProfile,
            styleScenarioResponses,
            userStyleVector,
            modalityPreferenceIds: saved.data.modalityPreferenceIds ?? [],
            logistics: { ...EMPTY_FORM.logistics, ...(saved.data.logistics ?? {}) },
          });
          setSavedAt(saved.updatedAt);
        }
        setStatus('idle');
      } catch {
        setStatus('error');
        setErrorMessage(copyByLocale.en.loadError);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (introStage !== 'chat') {
      setTypedIntro('');
      return;
    }

    const fullIntro = copy.intro;
    setTypedIntro('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedIntro(fullIntro.slice(0, index));
      if (index >= fullIntro.length) window.clearInterval(timer);
    }, 16);
    return () => window.clearInterval(timer);
  }, [copy.intro, introStage]);

  useEffect(() => {
    if (introStage !== 'chat') {
      setTypedQuestion('');
      return;
    }

    if (typedIntro !== copy.intro) {
      setTypedQuestion('');
      return;
    }

    const fullQuestion = currentQuestion;
    setTypedQuestion('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedQuestion(fullQuestion.slice(0, index));
      if (index >= fullQuestion.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [copy.intro, currentQuestion, introStage, typedIntro]);

  const culturePriorityIsRelevant =
    formData.logistics.culturalContextNeeds.length > 0 &&
    !formData.logistics.culturalContextNeeds.includes('no strong preference');

  const currentStepValid = useMemo(() => {
    if (step === 0) {
      return STYLE_SCENARIOS.every((scenario) => {
        const response = formData.styleScenarioResponses.find((entry) => entry.scenarioId === scenario.id);
        if (!response) return false;
        if (response.selectedCardIds && response.selectedCardIds.length > 0) return true;
        return Boolean(response.bestCardId);
      });
    }
    if (step >= 1 && step <= 4) {
      const category = LIFE_ASPECT_CATEGORY_BY_STEP[step as 1 | 2 | 3 | 4];
      return (
        formData.lifeAspectsByCategory[category].length > 0 ||
        formData.lifeAspectNotesByCategory[category].trim().length > 0 ||
        formData.lifeAspectSkippedByCategory[category]
      );
    }
    if (step === 5) return formData.modalityPreferenceIds.length > 0 && formData.modalityPreferenceIds.length <= 3;
    if (step === 6 || step === 7) return true;
    if (step === 8) return formData.therapyFor !== '';
    if (step === 9) return formData.logistics.availability !== '';
    if (step === 10) return formData.logistics.languagePriority === 'flexible' || [...formData.logistics.requiredLanguages, ...formData.logistics.preferredLanguages].length > 0;
    if (step === 11) return formData.logistics.culturalContextNeeds.length > 0;
    if (step === 12) return true;
    if (step === 13) return /^\d{5}$/.test(formData.areaCode.trim()) && formData.carePreference !== '';
    if (step === 14) {
      if (!formData.logistics.paymentPreference) return false;
      if (formData.logistics.paymentPreference === 'insurance') return formData.insuranceProvider.trim().length > 0;
      if (formData.logistics.paymentPreference === 'out_of_pocket' || formData.logistics.paymentPreference === 'sliding_scale') return formData.logistics.budgetRange !== '';
      return true;
    }
    if (step === 15) return true;
    return true;
  }, [formData, step]);

  const getAnswerForStep = (targetStep: Step) => {
    if (targetStep === 0) {
      const totalSelected = formData.styleScenarioResponses.reduce((sum, response) => {
        if (response.selectedCardIds && response.selectedCardIds.length > 0) return sum + response.selectedCardIds.length;
        return sum + (response.bestCardId ? 1 : 0);
      }, 0);
      return `${totalSelected} preferred responses across ${STYLE_SCENARIOS.length} scenarios`;
    }
    if (targetStep >= 1 && targetStep <= 4) {
      const category = LIFE_ASPECT_CATEGORY_BY_STEP[targetStep as 1 | 2 | 3 | 4];
      if (formData.lifeAspectSkippedByCategory[category]) return copy.skippedReply;
      const labels = formData.lifeAspectsByCategory[category].map((id) => getOptionLabel(expandedLifeAspectOptions[category], id, locale));
      const note = formData.lifeAspectNotesByCategory[category].trim();
      if (labels.length && note) return `${labels.join(', ')} / ${note}`;
      if (labels.length) return labels.join(', ');
      return note;
    }
    if (targetStep === 5) return formData.modalityPreferenceIds.map((id) => MODALITY_PREFERENCE_OPTIONS.find((option) => option.id === id)?.title ?? id).join(', ');
    if (targetStep === 6) return idealProfile.title;
    if (targetStep === 7) return 'Continue to matching details';
    if (targetStep === 8 && formData.therapyFor) {
      return getOptionLabel(therapyForOptions, formData.therapyFor, locale);
    }
    if (targetStep === 9 && formData.logistics.availability) {
      return getOptionLabel(availabilityOptions, formData.logistics.availability, locale);
    }
    if (targetStep === 10) {
      if (formData.logistics.languagePriority === 'flexible') return 'No strong language preference';
      return [...formData.logistics.requiredLanguages, ...formData.logistics.preferredLanguages].join(', ');
    }
    if (targetStep === 11) return formData.logistics.culturalContextNeeds.join(', ');
    if (targetStep === 12) {
      if (!culturePriorityIsRelevant) return '';
      const priorityLabels: Record<typeof formData.logistics.culturePriority, string> = {
        high: 'High - strongly shape my matches',
        medium: 'Medium - it matters',
        low: 'Low - nice to have',
      };
      return priorityLabels[formData.logistics.culturePriority];
    }
    if (targetStep === 13 && formData.carePreference) return `${formData.areaCode} / ${getOptionLabel(carePreferenceOptions, formData.carePreference, locale)}`;
    if (targetStep === 14) {
      const payment = paymentPreferenceOptions.find((option) => option.id === formData.logistics.paymentPreference)?.label ?? '';
      const insurance = formData.insuranceProvider.trim();
      const budget = formatBudgetRange(formData.logistics.budgetRange);
      return [payment, insurance && `Insurance: ${insurance}`, formData.logistics.budgetRange && `Budget: ${budget}`].filter(Boolean).join(' / ');
    }
    if (targetStep === 15) {
      return formData.email.trim() || 'Skipped — no email shared';
    }
    return '';
  };

  const completedMessages = Array.from({ length: step }, (_, index) => {
    const answer = getAnswerForStep(index as Step);
    return answer ? { step: index as Step, question: questions[index], answer } : null;
  }).filter(Boolean) as { step: Step; question: string; answer: string }[];

  const goNext = () => {
    if (!currentStepValid) return;
    setStep((prev) => {
      if (prev >= TOTAL_STEPS - 1) return prev;
      if (prev === 11 && !culturePriorityIsRelevant) return 13;
      return prev + 1;
    });
  };

  const skipLifeAspectStep = () => {
    if (step < 1 || step > 4) return;
    const category = LIFE_ASPECT_CATEGORY_BY_STEP[step as 1 | 2 | 3 | 4];
    setFormData((prev) => ({
      ...prev,
      lifeAspectsByCategory: {
        ...prev.lifeAspectsByCategory,
        [category]: [],
      },
      lifeAspectNotesByCategory: {
        ...prev.lifeAspectNotesByCategory,
        [category]: '',
      },
      lifeAspectSkippedByCategory: {
        ...prev.lifeAspectSkippedByCategory,
        [category]: true,
      },
    }));
    setStep((prev) => (prev < TOTAL_STEPS - 1 ? prev + 1 : prev));
  };

  const toggleLifeAspect = (category: LifeAspectCategory, lifeAspect: string) => {
    setFormData((prev) => {
      const list = prev.lifeAspectsByCategory[category];
      const alreadySelected = list.includes(lifeAspect);
      return {
        ...prev,
        lifeAspectsByCategory: {
          ...prev.lifeAspectsByCategory,
          [category]: alreadySelected ? list.filter((entry) => entry !== lifeAspect) : [...list, lifeAspect],
        },
        lifeAspectSkippedByCategory: {
          ...prev.lifeAspectSkippedByCategory,
          [category]: false,
        },
      };
    });
  };

  const toggleCnipStyle = (style: CnipConversationStyle) => {
    setFormData((prev) => {
      const selected = prev.cnipConversationStyles.includes(style)
        ? prev.cnipConversationStyles.filter((entry) => entry !== style)
        : [...prev.cnipConversationStyles, style];

      return {
        ...prev,
        cnipConversationStyles: selected,
        cnipPreferenceProfile: buildCnipPreferenceProfile(selected),
      };
    });
  };

  const toggleModalityPreference = (preferenceId: ModalityPreferenceId) => {
    setFormData((prev) => {
      const alreadySelected = prev.modalityPreferenceIds.includes(preferenceId);
      const next = alreadySelected
        ? prev.modalityPreferenceIds.filter((entry) => entry !== preferenceId)
        : prev.modalityPreferenceIds.length >= 3
          ? prev.modalityPreferenceIds
          : [...prev.modalityPreferenceIds, preferenceId];
      return { ...prev, modalityPreferenceIds: next };
    });
  };

  const setLanguagePriority = (priority: OnboardingFormData['logistics']['languagePriority']) => {
    setFormData((prev) => ({
      ...prev,
      logistics: {
        ...prev.logistics,
        languagePriority: priority,
        requiredLanguages: priority === 'required' ? prev.logistics.requiredLanguages : [],
        preferredLanguages: priority === 'preferred' ? prev.logistics.preferredLanguages : [],
      },
    }));
  };

  const toggleLogisticsLanguage = (language: string) => {
    setFormData((prev) => {
      const key = prev.logistics.languagePriority === 'required' ? 'requiredLanguages' : 'preferredLanguages';
      const list = prev.logistics[key];
      const alreadySelected = list.includes(language);
      return {
        ...prev,
        preferredLanguage: language as PreferredLanguage,
        logistics: {
          ...prev.logistics,
          [key]: alreadySelected ? list.filter((entry) => entry !== language) : [...list, language],
        },
      };
    });
  };

  const toggleCulturalContext = (value: string) => {
    setFormData((prev) => {
      if (value === 'no strong preference') {
        return { ...prev, logistics: { ...prev.logistics, culturalContextNeeds: ['no strong preference'], culturePriority: 'low' } };
      }
      const current = prev.logistics.culturalContextNeeds.filter((entry) => entry !== 'no strong preference');
      const alreadySelected = current.includes(value);
      return {
        ...prev,
        logistics: {
          ...prev.logistics,
          culturalContextNeeds: alreadySelected ? current.filter((entry) => entry !== value) : [...current, value],
        },
      };
    });
  };

  const toggleStyleScenarioCard = (scenarioId: string, cardId: string) => {
    setFormData((prev) => {
      const existing = prev.styleScenarioResponses.find((response) => response.scenarioId === scenarioId);
      const previousSelected = existing?.selectedCardIds ?? (existing?.bestCardId ? [existing.bestCardId] : []);
      const nextSelected = previousSelected.includes(cardId)
        ? previousSelected.filter((id) => id !== cardId)
        : [...previousSelected, cardId];
      const others = prev.styleScenarioResponses.filter((response) => response.scenarioId !== scenarioId);
      const styleScenarioResponses =
        nextSelected.length === 0
          ? others
          : [...others, { scenarioId, selectedCardIds: nextSelected, bestCardId: nextSelected[0] }];
      const userStyleVector = scoreUserStyleScenarios(styleScenarioResponses);

      return {
        ...prev,
        styleScenarioResponses,
        userStyleVector,
        cnipPreferenceProfile: styleVectorToLegacyProfile(userStyleVector),
      };
    });
  };

  const toggleSavedTherapist = (therapist: PsychologyTodayTherapistProfile) => {
    setSavedTherapists((prev) => {
      const next = { ...prev };
      if (next[therapist.id]) {
        delete next[therapist.id];
      } else {
        next[therapist.id] = therapist;
      }
      writeSavedTherapists(next);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!currentStepValid) return;
    setStatus('saving');
    setErrorMessage('');
    try {
      const saved = await saveOnboardingState(formData);
      const generatedRecommendations = await generateTherapistMatches(formData, saved.userId);
      setRecommendations(generatedRecommendations);
      setSavedAt(saved.updatedAt);
      setStatus('saved');
      setShowRecommendations(true);
    } catch {
      setStatus('error');
      setErrorMessage(copy.submitError);
    }
  };

  const handleSaveDraft = async () => {
    setStatus('saving');
    setErrorMessage('');
    try {
      const saved = await saveOnboardingState(formData);
      setSavedAt(saved.updatedAt);
      setStatus('saved');
    } catch {
      setStatus('error');
      setErrorMessage(copy.submitError);
    }
  };

  const handleIntroStart = () => {
    if (introStage !== 'cover') return;
    setIntroStage('lit');
    window.setTimeout(() => setIntroStage('chat'), 1100);
  };

  const renderAnswerControls = () => {
    if (step === 10) {
      const activeLanguageList = formData.logistics.languagePriority === 'required' ? formData.logistics.requiredLanguages : formData.logistics.preferredLanguages;
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'required', label: 'Required - I need therapy in this language' },
              { id: 'preferred', label: 'Preferred - it would help' },
              { id: 'flexible', label: 'Flexible - no major language factor' },
            ].map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => setLanguagePriority(option.id as OnboardingFormData['logistics']['languagePriority'])}
                className={chipClass(formData.logistics.languagePriority === option.id)}
              >
                {option.label}
                {formData.logistics.languagePriority === option.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>

          {formData.logistics.languagePriority !== 'flexible' && (
            <div className="flex flex-wrap gap-3">
              {LANGUAGE_OPTIONS.map((language) => (
                <button type="button" key={language} onClick={() => toggleLogisticsLanguage(language)} className={chipClass(activeLanguageList.includes(language))}>
                  {language}
                  {activeLanguageList.includes(language) && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 13) {
      const showZipError = formData.areaCode.length > 0 && !currentStepValid;
      return (
        <div className="space-y-5">
          <div className="w-full max-w-sm">
          <label className="sr-only" htmlFor="area-code">
            {copy.areaCodeLabel}
          </label>
          <input
            id="area-code"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={formData.areaCode}
            onChange={(event) => setFormData((prev) => ({ ...prev, areaCode: event.target.value.replace(/\D/g, '') }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && currentStepValid) goNext();
            }}
            placeholder="10001"
            className="h-14 w-full rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-6 text-left text-lg font-medium tracking-[0.08em] text-[#332d28] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
          />
          <p className={`mt-2 text-sm ${showZipError ? 'text-red-600' : 'text-[#746c62]'}`}>{copy.areaCodeHint}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {carePreferenceOptions.map((option) => {
              const selected = formData.carePreference === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setFormData((prev) => ({ ...prev, carePreference: option.id as OnboardingFormData['carePreference'] }))}
                  className={chipClass(selected)}
                >
                  {option.label[locale]}
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 8) {
      return (
        <div className="flex flex-wrap gap-3">
          {therapyForOptions.map((option) => {
            const selected = formData.therapyFor === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, therapyFor: option.id as OnboardingFormData['therapyFor'] }))
                }
                className={chipClass(selected)}
              >
                {option.label[locale]}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      );
    }

    if (step === 15) {
      const trimmedEmail = formData.email.trim();
      const showEmailError = trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      const skipEmail = () => {
        setFormData((prev) => ({ ...prev, email: '' }));
      };
      return (
        <div className="space-y-4">
          <label className="block" htmlFor="onboarding-email">
            <span className="mb-2 block text-sm font-medium text-[#746c62]">{copy.emailLabel}</span>
            <input
              id="onboarding-email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              placeholder={copy.emailPlaceholder}
              className="h-12 w-full max-w-md rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#332d28] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
            />
          </label>
          {showEmailError && <p className="text-sm font-medium text-red-600">{copy.emailInvalid}</p>}
          <button
            type="button"
            onClick={skipEmail}
            className={chipClass(trimmedEmail.length === 0)}
          >
            {copy.emailSkip}
            {trimmedEmail.length === 0 && <Check className="h-4 w-4" />}
          </button>
        </div>
      );
    }

    if (step === 9) {
      return (
        <div className="flex flex-wrap gap-3">
          {availabilityOptions.map((option) => {
            const selected = formData.logistics.availability === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => setFormData((prev) => ({ ...prev, logistics: { ...prev.logistics, availability: option.id } }))}
                className={chipClass(selected)}
              >
                {option.label[locale]}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      );
    }

    if (step === 0) {
      return (
        <div className="space-y-6">
          <p className="text-sm font-medium text-[#746c62]">{copy.styleHint}</p>
          {STYLE_SCENARIOS.map((scenario, scenarioIndex) => {
            const response = formData.styleScenarioResponses.find((entry) => entry.scenarioId === scenario.id);
            const selectedIds = new Set(
              response?.selectedCardIds && response.selectedCardIds.length > 0
                ? response.selectedCardIds
                : response?.bestCardId
                  ? [response.bestCardId]
                  : []
            );

            return (
              <section key={scenario.id} className="rounded-[24px] border border-[#d8d0c2] bg-[#f7f2e8] p-4 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Scenario {scenarioIndex + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#332d28]">{scenario.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#746c62]">{scenario.subtext}</p>
                  <p className="mt-2 text-xs font-medium text-[#8b8479]">Pick one or more responses that feel helpful.</p>
                </div>

                <div className="grid gap-3">
                  {scenario.cards.map((card) => {
                    const selected = selectedIds.has(card.id);

                    return (
                      <button
                        type="button"
                        key={card.id}
                        onClick={() => toggleStyleScenarioCard(scenario.id, card.id)}
                        aria-pressed={selected}
                        className={[
                          'w-full rounded-[16px] border bg-[#fffdf8] p-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-[#b7c0ae]/30',
                          selected ? 'border-[#6e7b64] ring-2 ring-[#6e7b64]/25' : 'border-[#e1d8c9] hover:border-[#7a866f]',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#40382f]">{card.title}</p>
                            {card.shortLabel && <p className="mt-1 text-sm font-medium text-[#5f6658]">{card.shortLabel}</p>}
                          </div>
                          {selected && <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#6e7b64]" />}
                        </div>
                        {card.shortCopy || card.longCopy ? (
                          <>
                            <p className="mt-3 text-sm leading-6 text-[#746c62] sm:hidden">{card.shortCopy ?? card.description}</p>
                            <p className="mt-3 hidden text-sm leading-6 text-[#746c62] sm:block">{card.longCopy ?? card.description}</p>
                          </>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-[#746c62]">{card.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="rounded-[16px] bg-[#fffdf8] p-4 text-sm leading-6 text-[#746c62]">
            Pick every response that feels helpful in each scenario. The app blends your selections to describe your preferred conversation style.
          </div>
              </div>
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-6 text-[#746c62]">You do not need to know therapy terms. Choose up to 3 that sound closest.</p>
          <div className="grid gap-3">
            {MODALITY_PREFERENCE_OPTIONS.map((option) => {
              const selected = formData.modalityPreferenceIds.includes(option.id as ModalityPreferenceId);
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => toggleModalityPreference(option.id as ModalityPreferenceId)}
                  className={[
                    'rounded-[16px] border bg-[#fffdf8] p-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-[#b7c0ae]/30',
                    selected ? 'border-[#6e7b64] ring-2 ring-[#6e7b64]/25' : 'border-[#e1d8c9] hover:border-[#7a866f]',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#40382f]">{option.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#746c62]">{option.copy}</p>
                    </div>
                    {selected && <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#6e7b64]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="space-y-5 rounded-[20px] border border-[#d8d0c2] bg-[#fffdf8] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Ideal Therapist Profile</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#332d28]">{idealProfile.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#746c62]">{idealProfile.summary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Main concerns</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {idealProfile.mainConcerns.map((concern) => (
                  <span key={concern} className="rounded-full bg-[#ede6d8] px-3 py-1 text-xs font-semibold text-[#62594f]">{concern}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Conversation style</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {idealProfile.preferredConversationStyle.map((trait) => (
                  <span key={trait} className="rounded-full bg-[#dfe7d8] px-3 py-1 text-xs font-semibold text-[#53614d]">{trait}</span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Recommended therapy approaches</p>
            <div className="mt-3 grid gap-2">
              {idealProfile.recommendedModalities.slice(0, 4).map((modality) => (
                <div key={modality.modalityId} className="rounded-[8px] bg-[#f7f2e8] p-3">
                  <p className="font-semibold text-[#40382f]">{modality.displayName}</p>
                  <p className="mt-1 text-sm leading-6 text-[#746c62]">{modality.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div className="rounded-[20px] border border-[#d8d0c2] bg-[#fffdf8] p-5">
          <h3 className="text-2xl font-semibold text-[#332d28]">Now let's find real therapists who match this.</h3>
          <p className="mt-3 text-sm leading-6 text-[#746c62]">
            Your profile shows the kind of therapy support that may fit you. Next, we will ask a few practical questions - like language,
            location, insurance, and session format - so we can match you with therapists who are actually available and accessible.
          </p>
        </div>
      );
    }

    if (step === 11) {
      return (
        <div className="flex flex-wrap gap-3">
          {CULTURAL_CONTEXT_OPTIONS.map((option) => {
            const selected = formData.logistics.culturalContextNeeds.includes(option);
            return (
              <button type="button" key={option} onClick={() => toggleCulturalContext(option)} className={chipClass(selected)}>
                {option}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      );
    }

    if (step === 12) {
      if (formData.logistics.culturalContextNeeds.includes('no strong preference')) {
        return (
          <p className="text-sm font-medium text-[#746c62]">
            You picked &ldquo;no strong preference&rdquo;, so we&apos;ll skip prioritizing this. Continue when ready.
          </p>
        );
      }
      return (
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'high', label: 'High - strongly shape my matches' },
            { id: 'medium', label: 'Medium - it matters' },
            { id: 'low', label: 'Low - nice to have' },
          ].map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => setFormData((prev) => ({ ...prev, logistics: { ...prev.logistics, culturePriority: option.id as OnboardingFormData['logistics']['culturePriority'] } }))}
              className={chipClass(formData.logistics.culturePriority === option.id)}
            >
              {option.label}
              {formData.logistics.culturePriority === option.id && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      );
    }

    if (step === 14) {
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {paymentPreferenceOptions.map((option) => {
              const selected = formData.logistics.paymentPreference === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      insuranceProvider: option.id === 'insurance' ? prev.insuranceProvider : '',
                      insurancePlan: option.id === 'insurance' ? prev.insurancePlan : '',
                      logistics: { ...prev.logistics, paymentPreference: option.id, budgetRange: option.id === 'out_of_pocket' || option.id === 'sliding_scale' ? prev.logistics.budgetRange : '' },
                    }))
                  }
                  className={chipClass(selected)}
                >
                  {option.label}
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
          {formData.logistics.paymentPreference === 'insurance' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#746c62]">{copy.insuranceProviderLabel ?? copyByLocale.en.insuranceProviderLabel}</span>
                <input
                  type="text"
                  list="insurance-provider-options"
                  value={formData.insuranceProvider}
                  onChange={(event) => setFormData((prev) => ({ ...prev, insuranceProvider: event.target.value }))}
                  placeholder={copy.insuranceProviderPlaceholder ?? copyByLocale.en.insuranceProviderPlaceholder}
                  className="h-12 w-full rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#332d28] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
                />
                <datalist id="insurance-provider-options">
                  {commonInsuranceProviders.map((provider) => <option key={provider} value={provider} />)}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#746c62]">{copy.insurancePlanLabel ?? copyByLocale.en.insurancePlanLabel}</span>
                <input
                  type="text"
                  list="insurance-plan-options"
                  value={formData.insurancePlan}
                  onChange={(event) => setFormData((prev) => ({ ...prev, insurancePlan: event.target.value }))}
                  placeholder={copy.insurancePlanPlaceholder ?? copyByLocale.en.insurancePlanPlaceholder}
                  className="h-12 w-full rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#332d28] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
                />
                <datalist id="insurance-plan-options">
                  {commonInsurancePlans.map((plan) => <option key={plan} value={plan} />)}
                </datalist>
              </label>
            </div>
          )}
          {(formData.logistics.paymentPreference === 'out_of_pocket' || formData.logistics.paymentPreference === 'sliding_scale') && (
            <div className="flex flex-wrap gap-3">
              {budgetOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setFormData((prev) => ({ ...prev, logistics: { ...prev.logistics, budgetRange: option.id } }))}
                  className={chipClass(formData.logistics.budgetRange === option.id)}
                >
                  {option.label}
                  {formData.logistics.budgetRange === option.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    const category = LIFE_ASPECT_CATEGORY_BY_STEP[step as 1 | 2 | 3 | 4];
    return (
      <div className="w-full">
        <div className="flex flex-wrap gap-3">
          {expandedLifeAspectOptions[category].map((option) => {
            const selected = formData.lifeAspectsByCategory[category].includes(option.id);
            return (
              <button type="button" key={option.id} onClick={() => toggleLifeAspect(category, option.id)} className={chipClass(selected)}>
                {option.label[locale]}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
          <button type="button" onClick={skipLifeAspectStep} className={chipClass(formData.lifeAspectSkippedByCategory[category])}>
            {copy.noAndNext}
            {formData.lifeAspectSkippedByCategory[category] && <Check className="h-4 w-4" />}
          </button>
        </div>
        <label className="mt-5 block text-sm font-medium text-[#746c62]" htmlFor={`note-${category}`}>
          {copy.moreToAddLabel}
        </label>
        <textarea
          id={`note-${category}`}
          value={formData.lifeAspectNotesByCategory[category]}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              lifeAspectNotesByCategory: { ...prev.lifeAspectNotesByCategory, [category]: event.target.value },
              lifeAspectSkippedByCategory: { ...prev.lifeAspectSkippedByCategory, [category]: false },
            }))
          }
          rows={3}
          placeholder={copy.moreToAddPlaceholder}
          className="mt-2 w-full resize-none rounded-[24px] border border-[#d2c7b4] bg-[#fbf7ef] px-4 py-4 text-sm leading-6 text-[#40382f] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
        />
      </div>
    );
  };

  if (showRecommendations) {
    return (
      <main className="min-h-screen bg-[#efe7d7] text-[#332d28]">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
          <header className="flex flex-col gap-4 border-b border-[#d8d0c2] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#8b8479]">
                <Sparkles className="h-4 w-4 text-[#6e7b64]" />
                {copy.recommendationSource}
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-[#332d28] sm:text-4xl">{copy.recommendationsTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c62]">{copy.recommendationsSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#40382f] transition hover:border-[#7a866f] hover:bg-[#f1ede3]"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backToAnswers}
            </button>
          </header>

          <section className="grid gap-4 pb-6">
            <section className="rounded-[20px] border border-[#d8d0c2] bg-[#f7f2e8] p-5 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Your ideal therapist profile</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#332d28]">{idealProfile.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#746c62]">{idealProfile.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {idealProfile.preferredConversationStyle.map((trait) => (
                  <span key={trait} className="rounded-full bg-[#dfe7d8] px-3 py-1 text-xs font-semibold text-[#53614d]">
                    {trait}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Main concerns</p>
                  <p className="mt-1 text-sm leading-6 text-[#40382f]">{idealProfile.mainConcerns.slice(0, 4).join(', ')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Recommended modalities</p>
                  <p className="mt-1 text-sm leading-6 text-[#40382f]">{idealProfile.recommendedModalities.slice(0, 3).map((modality) => modality.displayName).join(', ') || 'Confirm approach in consultation'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Style</p>
                  <p className="mt-1 text-sm leading-6 text-[#40382f]">{idealProfile.preferredConversationStyle.slice(0, 3).join(', ')}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[20px] border border-[#d8d0c2] bg-[#fffdf8] p-5 shadow-[0_16px_34px_rgba(97,86,68,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Matching details</p>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-[#40382f] sm:grid-cols-2">
                <p><span className="font-semibold">Language:</span> {formData.logistics.languagePriority === 'flexible' ? 'No strong preference' : [...formData.logistics.requiredLanguages, ...formData.logistics.preferredLanguages].join(', ')}</p>
                <p><span className="font-semibold">Location/session:</span> ZIP {formData.areaCode || 'not set'} / {formData.carePreference || 'not set'}</p>
                <p><span className="font-semibold">Payment:</span> {paymentPreferenceOptions.find((option) => option.id === formData.logistics.paymentPreference)?.label ?? 'Not sure'}{formData.insuranceProvider ? ` / ${formData.insuranceProvider}` : ''}</p>
                <p><span className="font-semibold">Context:</span> {formData.logistics.culturalContextNeeds.join(', ') || 'No strong preference'}</p>
              </div>
            </section>

            {recommendations.length === 0 && (
              <div className="rounded-[24px] border border-[#d8d0c2] bg-[#f7f2e8] p-6 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
                <h2 className="text-2xl font-semibold text-[#332d28]">{copy.noRecommendationsTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c62]">{copy.noRecommendationsBody}</p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <section className="rounded-[20px] border border-[#d8d0c2] bg-[#f7f2e8] p-4 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#332d28]">{copy.savedTherapistsTitle}</h2>
                  <span className="rounded-full bg-[#ede6d8] px-3 py-1 text-xs font-semibold text-[#62594f]">{savedTherapistList.length}</span>
                </div>

                {savedTherapistList.length === 0 ? (
                  <p className="text-sm leading-6 text-[#746c62]">{copy.savedTherapistsEmpty}</p>
                ) : (
                  <div className="grid gap-2">
                    {savedTherapistList.map((therapist) => (
                      <div key={therapist.id} className="flex items-start justify-between gap-3 rounded-[8px] bg-[#fffdf8] p-3">
                        <div>
                          <p className="font-semibold text-[#40382f]">
                            {therapist.name}, {therapist.credentials}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#746c62]">{joinOrFallback(therapist.languages, 'Not listed')} / {getTherapistSessionText(therapist)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSavedTherapist(therapist)}
                          className="shrink-0 rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-3 py-1.5 text-xs font-medium text-[#40382f] transition hover:border-[#7a866f] hover:bg-[#f1ede3]"
                        >
                          {copy.removeSaved}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[20px] border border-[#d8d0c2] bg-[#f7f2e8] p-4 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
                <h2 className="text-lg font-semibold text-[#332d28]">{copy.compareTitle}</h2>
                {compareTherapists.length < 2 ? (
                  <p className="mt-2 text-sm leading-6 text-[#746c62]">{copy.compareHint}</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                      <thead>
                        <tr>
                          {[copy.compareColumnTherapist, copy.languagesLabel, copy.sessionFormatLabel, copy.insuranceLabel, copy.rateLabel, copy.profileFocus].map((heading) => (
                            <th key={heading} className="border-b border-[#d8d0c2] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareTherapists.map((therapist) => (
                          <tr key={therapist.id} className="align-top">
                            <td className="border-b border-[#ede6d8] px-3 py-3 font-semibold text-[#40382f]">
                              {therapist.name}
                              <span className="block text-xs font-medium text-[#746c62]">{therapist.credentials}</span>
                            </td>
                            <td className="border-b border-[#ede6d8] px-3 py-3 text-[#40382f]">{joinOrFallback(therapist.languages, 'Not listed')}</td>
                            <td className="border-b border-[#ede6d8] px-3 py-3 text-[#40382f]">{getTherapistSessionText(therapist)}</td>
                            <td className="border-b border-[#ede6d8] px-3 py-3 text-[#40382f]">{getTherapistInsuranceText(therapist)}</td>
                            <td className="border-b border-[#ede6d8] px-3 py-3 text-[#40382f]">{getTherapistRateText(therapist)}</td>
                            <td className="border-b border-[#ede6d8] px-3 py-3 text-[#40382f]">{therapist.expertise.slice(0, 3).join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {recommendations.slice(0, Math.max(3, Math.min(recommendations.length, 5))).map((recommendation, index) => {
              const therapist = recommendation.therapist;
              const isSaved = Boolean(savedTherapists[therapist.id]);
              const recommendedModels = recommendation.recommendedModels.length > 0 ? recommendation.recommendedModels.slice(0, 5) : therapist.therapyModels.slice(0, 5);

              return (
                <article key={therapist.id} className="rounded-[20px] border border-[#d8d0c2] bg-[#f7f2e8] p-4 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
                  <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Match {index + 1}</p>
                          <h2 className="mt-1 text-2xl font-semibold text-[#332d28]">
                            {therapist.name}, {therapist.credentials}
                          </h2>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-[#746c62]">{therapist.location}</p>
                            {therapist.source === 'psychologytoday' && (
                              <span className="rounded-full border border-[#c7d8bf] bg-[#eef6e8] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#53614d]">
                                PsychologyToday
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 max-w-3xl text-sm leading-6 text-[#40382f]">{therapist.bio}</p>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">{copy.matchedFocus}</p>
                        <div className="flex flex-wrap gap-2">
                          {recommendedModels.map((model) => (
                            <span key={model} className="rounded-full bg-[#dfe7d8] px-3 py-1 text-xs font-semibold text-[#53614d]">
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <aside className="space-y-3 rounded-[8px] bg-[#fffdf8] p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">{copy.styleFit}</p>
                        <p className="mt-2 rounded-[8px] bg-[#eef6e8] px-3 py-2 text-sm font-semibold text-[#53614d]">{getStyleFitLabel(recommendation.styleFit)}</p>
                      </div>
                      <a
                        href={therapist.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#332d28] px-4 text-sm font-medium text-[#f9f5ec] transition hover:bg-[#4a4239]"
                      >
                        {copy.viewProfile}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleSavedTherapist(therapist)}
                        className={[
                          'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition',
                          isSaved
                            ? 'border-[#6e7b64] bg-[#eef6e8] text-[#53614d] hover:bg-[#e2efd9]'
                            : 'border-[#d2c7b4] bg-[#fbf7ef] text-[#40382f] hover:border-[#7a866f] hover:bg-[#f1ede3]',
                        ].join(' ')}
                      >
                        <Heart className={`h-4 w-4 ${isSaved ? 'fill-[#6e7b64] text-[#6e7b64]' : ''}`} />
                        {isSaved ? copy.savedTherapist : copy.saveTherapist}
                      </button>
                    </aside>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    );
  }

  if (introStage !== 'chat') {
    return (
      <main className="min-h-screen overflow-hidden bg-[#110d0b] text-[#f7efe0]">
        <div className="relative flex min-h-screen flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(39,28,20,0.65),transparent_42%),linear-gradient(180deg,#120e0c_0%,#0d0a09_100%)]" />
          <div
            className={[
              'absolute inset-0 transition-opacity duration-700',
              introStage === 'lit' ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            style={{
              background:
                'radial-gradient(circle at 62% 42%, rgba(255,190,112,0.32) 0%, rgba(255,164,74,0.18) 18%, rgba(30,18,12,0) 42%), radial-gradient(circle at 50% 68%, rgba(255,214,150,0.12) 0%, rgba(17,13,11,0) 34%)',
            }}
          />
          <div className="relative flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 sm:py-10">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MatchAvatar className="h-10 w-10" />
                <div>
                  <p
                    className={[
                      'text-xs font-semibold uppercase tracking-[0.16em] transition-colors duration-500',
                      introStage === 'lit' ? 'text-[#f6d9ac]' : 'text-[#8c7d6b]',
                    ].join(' ')}
                  >
                    {copy.brand}
                  </p>
                </div>
              </div>
            </header>

            <section className="flex flex-1 flex-col items-center justify-center">
              <div className="w-full max-w-5xl">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
                  <div className="max-w-md">
                    <h1
                      className={[
                        'text-5xl font-semibold leading-[1.02] transition-colors duration-500 sm:text-6xl',
                        introStage === 'lit' ? 'text-[#fff5e6]' : 'text-[#7d7064]',
                      ].join(' ')}
                    >
                      {splashHeadline}
                    </h1>
                  </div>

                  <div className="relative">
                    <div
                      className={[
                        'absolute inset-x-[8%] top-[8%] h-44 rounded-full blur-3xl transition-all duration-700',
                        introStage === 'lit' ? 'bg-[#ffbe71]/35 opacity-100' : 'bg-[#ffbe71]/0 opacity-0',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={handleIntroStart}
                      className="group block w-full rounded-[40px] p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-[#f0c589]/35"
                    >
                      <div
                        className={[
                          'rounded-[38px] border p-6 transition-all duration-700 sm:p-8',
                          introStage === 'lit'
                            ? 'border-[#6e5036] bg-[rgba(35,24,18,0.88)] shadow-[0_24px_70px_rgba(255,171,84,0.16)]'
                            : 'border-[#2e2119] bg-[rgba(20,15,12,0.88)] shadow-[0_24px_60px_rgba(0,0,0,0.28)]',
                        ].join(' ')}
                      >
                        <MatchboxScene lit={introStage === 'lit'} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#efe7d7] text-[#332d28]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <MatchAvatar className="h-9 w-9" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">{copy.brand}</p>
              <p className="text-sm text-[#746c62]">
                {copy.stepLabel} {step + 1} / {TOTAL_STEPS}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#d8d0c2] sm:w-40" aria-hidden="true">
            <div className="h-full rounded-full bg-[#6e7b64] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <section className="mt-4 flex flex-1 flex-col rounded-[28px] bg-[#f7f2e8] px-4 py-5 shadow-[0_18px_40px_rgba(97,86,68,0.08)] sm:px-6 sm:py-6">
          {status === 'loading' ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-[#746c62]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <MatchAvatar />
                  </div>
                  <div className={`max-w-[88%] ${assistantBubbleClass}`}>
                    <span aria-hidden="true" className={assistantBubbleTailClass} />
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8479]">{assistantName}</p>
                    {typedIntro}
                    {typedIntro !== copy.intro && <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-[#6e7b64]" aria-hidden="true" />}
                  </div>
                </div>

                {completedMessages.map((message) => (
                  <button
                    type="button"
                    key={`${message.step}-${message.answer}`}
                    onClick={() => setStep(message.step)}
                    className="block w-full rounded-[24px] p-1 text-left transition hover:bg-[#ede6d8] focus:outline-none focus:ring-4 focus:ring-[#b7c0ae]/20"
                    title="Return to this question"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        <MatchAvatar />
                      </div>
                      <div className={`max-w-[88%] ${assistantBubbleClass}`}>
                        <span aria-hidden="true" className={assistantBubbleTailClass} />
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8479]">{assistantName}</p>
                        {message.question}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="max-w-[78%] rounded-[22px] rounded-tr-md bg-[#6e7b64] px-5 py-4 text-[15px] font-medium leading-7 text-[#f9f5ec] shadow-sm">
                        {message.answer}
                      </div>
                    </div>
                  </button>
                ))}

                {typedIntro === copy.intro && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      <MatchAvatar />
                    </div>
                    <div className={`max-w-[88%] ${assistantBubbleClass} text-[22px] font-medium leading-8 text-[#332d28] sm:text-[24px]`}>
                      <span aria-hidden="true" className={assistantBubbleTailClass} />
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8479]">{assistantName}</p>
                      {typedQuestion}
                      {typedQuestion !== currentQuestion && <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-[#6e7b64]" aria-hidden="true" />}
                    </div>
                  </div>
                )}

                <div className="pl-11">
                  <div className="rounded-[24px] bg-[#f2ede3] px-4 py-4 shadow-inner shadow-[#d9d1c2]/40">{renderAnswerControls()}</div>
                </div>
              </div>

              {!currentStepValid && status !== 'saved' && <p className="mt-4 pl-11 text-sm font-medium text-red-600">{copy.requiredHint}</p>}

              {status === 'saved' && (
                <div className="mt-4 rounded-[22px] border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
                  {copy.savedSuccess}
                </div>
              )}

              {status === 'error' && (
                <div className="mt-4 rounded-[22px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                  {errorMessage || copy.submitError}
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#d8d0c2] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setStep((prev) => {
                      if (prev <= 0) return prev;
                      if (prev === 13 && !culturePriorityIsRelevant) return 11;
                      return (prev - 1) as Step;
                    })
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#40382f] transition hover:border-[#7a866f] hover:bg-[#f1ede3] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={step === 0 || status === 'saving'}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {copy.back}
                </button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={status === 'saving'}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#40382f] transition hover:border-[#7a866f] hover:bg-[#f1ede3] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === 'saving' ? copy.saving : copy.saveDraft ?? copyByLocale.en.saveDraft}
                    {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </button>

                  {step < TOTAL_STEPS - 1 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!currentStepValid || status === 'saving'}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#6e7b64] px-6 text-sm font-medium text-[#f9f5ec] transition hover:bg-[#607057] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copy.continue}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!currentStepValid || status === 'saving'}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#6e7b64] px-6 text-sm font-medium text-[#f9f5ec] transition hover:bg-[#607057] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {status === 'saving' ? copy.saving : copy.save}
                      {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {savedAt && (
                <p className="mt-3 text-center text-xs font-medium text-[#8b8479]">
                  {copy.savedAtLabel}: {new Date(savedAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
