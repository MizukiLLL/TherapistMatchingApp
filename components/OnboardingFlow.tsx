import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, HeartHandshake, Loader2, Send, Sparkles } from 'lucide-react';
import { generateTherapistMatches, loadOnboardingState, saveOnboardingState } from '../onboardingApi';
import { CnipConversationStyle, OnboardingFormData, PreferredLanguage } from '../onboardingTypes';
import { buildCnipPreferenceProfile, cnipStyleNames } from '../utils/therapistRecommendations';
import type { TherapistRecommendation } from '../utils/therapistRecommendations';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type Locale = 'zh-CN' | 'zh-HK' | 'en';
type LifeAspectCategory = keyof OnboardingFormData['lifeAspectsByCategory'];
type LocalizedLabel = Record<Locale, string>;
type Option<T extends string = string> = { id: T; label: LocalizedLabel };
type CnipStyleOption = {
  id: CnipConversationStyle;
  name: string;
  role: string;
  sampleResponse: (concerns: string) => string;
  traits: string[];
};

const TOTAL_STEPS = 9;

const LIFE_ASPECT_CATEGORY_BY_STEP: Record<4 | 5 | 6 | 7, LifeAspectCategory> = {
  4: 'symptomsAndDiagnoses',
  5: 'lifeStagesAndTransitions',
  6: 'physicalHealthRelatedIssues',
  7: 'selfIdentityAndSocialRelationships',
};

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
    name: 'Structured guide',
    role: 'Keeps the session organized',
    sampleResponse: (concerns) => `We can start by mapping when ${concerns} shows up, choose one target for the first session, and leave with a clear next step.`,
    traits: ['directive', 'present-focused', 'clear plan'],
  },
  {
    id: 'reflectiveCompanion',
    name: 'Reflective companion',
    role: 'Moves at your pace',
    sampleResponse: (concerns) => `I would slow down with you around ${concerns}, reflect what feels most tender, and let the pace come from what feels safe to say.`,
    traits: ['client-led', 'warm support', 'steady pace'],
  },
  {
    id: 'deepExplorer',
    name: 'Deep explorer',
    role: 'Connects past and present',
    sampleResponse: (concerns) => `I would be curious about how ${concerns} connects to earlier patterns, important relationships, and emotions that may not have had enough room.`,
    traits: ['depth work', 'emotion-focused', 'past-oriented'],
  },
  {
    id: 'practicalCoach',
    name: 'Practical coach',
    role: 'Turns insight into action',
    sampleResponse: (concerns) => `For ${concerns}, I would help you test a small skill this week, notice what works, and adjust the plan together next time.`,
    traits: ['skills-based', 'focused challenge', 'home practice'],
  },
];

const copyByLocale = {
  en: {
    brand: 'Care match',
    intro: 'Hi. I will ask a few quick questions so we can narrow this down together.',
    loading: 'Loading your saved answers...',
    back: 'Back',
    continue: 'Continue',
    save: 'Save answers',
    saving: 'Saving...',
    savedSuccess: 'Saved. You can move on to matching.',
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
    questionConversationStyle: 'Four therapists are joining the chat. Which conversation styles would feel helpful?',
    areaCodeLabel: 'ZIP code',
    areaCodeHint: 'Please enter a 5-digit U.S. ZIP code.',
    moreToAddLabel: 'Anything else?',
    moreToAddPlaceholder: 'Write a short note...',
    insuranceProviderLabel: 'Insurance provider',
    insuranceProviderPlaceholder: 'Aetna, Cigna, Blue Shield...',
    insurancePlanLabel: 'Plan, optional',
    insurancePlanPlaceholder: 'PPO, Open Choice...',
    insuranceHint: 'Insurance helps us rank coverage, but we will still show the best available matches if you skip it.',
    styleHint: 'Choose one or more. We will use this C-NIP style profile to explain therapist fit.',
    recommendationsTitle: 'Recommended therapists',
    recommendationsSubtitle: 'Ranked by C-NIP style fit, profile expertise, language, location, session format, and insurance match.',
    recommendationSource: 'Backend therapist profiles',
    styleFit: 'Style fit',
    expertiseFit: 'Expertise fit',
    logisticsFit: 'Logistics fit',
    backToAnswers: 'Back to answers',
    viewProfile: 'View profile',
    matchedFocus: 'Matched focus',
    profileFocus: 'Profile focus',
    languagesLabel: 'Languages',
    sessionFormatLabel: 'Sessions',
    insuranceLabel: 'Insurance match',
    rateLabel: 'Rate',
    serviceAreaLabel: 'Service area',
    noRecommendationsTitle: 'No exact matches yet',
    noRecommendationsBody: 'No active therapist profiles are available yet. Once the directory has at least one profile, we will show the closest available matches.',
    selectedStylesLabel: 'Selected styles',
    noAndNext: 'No, next',
    skippedReply: 'No, next',
    loadError: 'Could not load your saved answers.',
    submitError: 'Could not save right now. Please try again.',
    stepLabel: 'Question',
    languageOptions: { English: 'English', Mandarin: '普通话', Cantonese: '廣東話' },
  },
  'zh-CN': {
    brand: '咨询匹配',
    intro: '你好。我会问几个简短的问题，帮你一步步缩小范围。',
    loading: '正在读取你之前的回答...',
    back: '返回',
    continue: '继续',
    save: '保存回答',
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
    questionConversationStyle: 'Four therapists are joining the chat. Which conversation styles would feel helpful?',
    areaCodeLabel: 'ZIP 邮编',
    areaCodeHint: '请输入 5 位美国 ZIP 邮编。',
    moreToAddLabel: '还想补充吗？',
    moreToAddPlaceholder: '简单写一句就好...',
    styleHint: 'Choose one or more. We will use this C-NIP style profile to explain therapist fit.',
    recommendationsTitle: 'Recommended therapists',
    recommendationsSubtitle: 'Ranked by C-NIP style fit, profile expertise, language, location, session format, and insurance match.',
    recommendationSource: 'Backend therapist profiles',
    styleFit: 'Style fit',
    expertiseFit: 'Expertise fit',
    logisticsFit: 'Logistics fit',
    backToAnswers: 'Back to answers',
    viewProfile: 'View profile',
    matchedFocus: 'Matched focus',
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
    brand: '治療師配對',
    intro: '你好。我會問幾條簡短問題，幫你一步步收窄範圍。',
    loading: '正在讀取你之前嘅回答...',
    back: '返回',
    continue: '繼續',
    save: '儲存回答',
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
    questionConversationStyle: 'Four therapists are joining the chat. Which conversation styles would feel helpful?',
    areaCodeLabel: 'ZIP code',
    areaCodeHint: '請輸入 5 位美國 ZIP code。',
    moreToAddLabel: '仲想補充嗎？',
    moreToAddPlaceholder: '簡單寫一句就可以...',
    styleHint: 'Choose one or more. We will use this C-NIP style profile to explain therapist fit.',
    recommendationsTitle: 'Recommended therapists',
    recommendationsSubtitle: 'Ranked by C-NIP style fit, profile expertise, language, location, session format, and insurance match.',
    recommendationSource: 'Backend therapist profiles',
    styleFit: 'Style fit',
    expertiseFit: 'Expertise fit',
    logisticsFit: 'Logistics fit',
    backToAnswers: 'Back to answers',
    viewProfile: 'View profile',
    matchedFocus: 'Matched focus',
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

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>(0);
  const [formData, setFormData] = useState<OnboardingFormData>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [typedQuestion, setTypedQuestion] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<TherapistRecommendation[]>([]);

  const locale = getLocaleFromPreferredLanguage(formData.preferredLanguage);
  const copy = copyByLocale[locale];
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

  const questions = useMemo(
    () => [
      copy.questionLanguage,
      copy.questionAreaCode,
      copy.questionTherapyFor,
      copy.questionCarePreference,
      copy.questionSymptoms,
      copy.questionTransitions,
      copy.questionPhysical,
      copy.questionIdentity,
      copy.questionConversationStyle,
    ],
    [copy]
  );

  useEffect(() => {
    const hydrate = async () => {
      try {
        const saved = await loadOnboardingState();
        if (saved) {
          setFormData({
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
            cnipPreferenceProfile: saved.data.cnipPreferenceProfile ?? buildCnipPreferenceProfile(saved.data.cnipConversationStyles ?? []),
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
    const fullQuestion = questions[step];
    setTypedQuestion('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedQuestion(fullQuestion.slice(0, index));
      if (index >= fullQuestion.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [questions, step]);

  const currentStepValid = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return /^\d{5}$/.test(formData.areaCode.trim());
    if (step === 2) return formData.therapyFor !== '';
    if (step === 3) return formData.carePreference !== '' && formData.insuranceProvider.trim().length > 0;
    if (step >= 4 && step <= 7) {
      const category = LIFE_ASPECT_CATEGORY_BY_STEP[step as 4 | 5 | 6 | 7];
      return (
        formData.lifeAspectsByCategory[category].length > 0 ||
        formData.lifeAspectNotesByCategory[category].trim().length > 0 ||
        formData.lifeAspectSkippedByCategory[category]
      );
    }
    if (step === 8) return formData.cnipConversationStyles.length > 0;
    return true;
  }, [formData, step]);

  const getAnswerForStep = (targetStep: Step) => {
    if (targetStep === 0) return copy.languageOptions[formData.preferredLanguage];
    if (targetStep === 1) return formData.areaCode;
    if (targetStep === 2 && formData.therapyFor) return getOptionLabel(therapyForOptions, formData.therapyFor, locale);
    if (targetStep === 3 && formData.carePreference) {
      const insurance = formData.insuranceProvider.trim();
      const plan = formData.insurancePlan.trim();
      return [getOptionLabel(carePreferenceOptions, formData.carePreference, locale), insurance && `Insurance: ${insurance}${plan ? ` ${plan}` : ''}`]
        .filter(Boolean)
        .join(' / ');
    }
    if (targetStep >= 4 && targetStep <= 7) {
      const category = LIFE_ASPECT_CATEGORY_BY_STEP[targetStep as 4 | 5 | 6 | 7];
      if (formData.lifeAspectSkippedByCategory[category]) return copy.skippedReply;
      const labels = formData.lifeAspectsByCategory[category].map((id) => getOptionLabel(expandedLifeAspectOptions[category], id, locale));
      const note = formData.lifeAspectNotesByCategory[category].trim();
      if (labels.length && note) return `${labels.join(', ')} / ${note}`;
      if (labels.length) return labels.join(', ');
      return note;
    }
    if (targetStep === 8) return formData.cnipConversationStyles.map((style) => cnipStyleNames[style]).join(', ');
    return '';
  };

  const completedMessages = Array.from({ length: step }, (_, index) => {
    const answer = getAnswerForStep(index as Step);
    return answer ? { step: index as Step, question: questions[index], answer } : null;
  }).filter(Boolean) as { step: Step; question: string; answer: string }[];

  const goNext = () => {
    if (!currentStepValid) return;
    setStep((prev) => (prev < 8 ? ((prev + 1) as Step) : prev));
  };

  const skipLifeAspectStep = () => {
    if (step < 4 || step > 7) return;
    const category = LIFE_ASPECT_CATEGORY_BY_STEP[step as 4 | 5 | 6 | 7];
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
    setStep((prev) => (prev < 8 ? ((prev + 1) as Step) : prev));
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

  const renderAnswerControls = () => {
    if (step === 0) {
      return (
        <div className="flex flex-wrap gap-3">
          {(['English', 'Mandarin', 'Cantonese'] as PreferredLanguage[]).map((language) => (
            <button
              type="button"
              key={language}
              onClick={() => setFormData((prev) => ({ ...prev, preferredLanguage: language }))}
              className={chipClass(formData.preferredLanguage === language)}
            >
              {copy.languageOptions[language]}
              {formData.preferredLanguage === language && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      );
    }

    if (step === 1) {
      const showZipError = formData.areaCode.length > 0 && !currentStepValid;
      return (
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
      );
    }

    const simpleOptions = step === 2 ? therapyForOptions : step === 3 ? carePreferenceOptions : null;
    if (simpleOptions) {
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {simpleOptions.map((option) => {
              const selected = step === 2 ? formData.therapyFor === option.id : formData.carePreference === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() =>
                    setFormData((prev) =>
                      step === 2
                        ? { ...prev, therapyFor: option.id as OnboardingFormData['therapyFor'] }
                        : { ...prev, carePreference: option.id as OnboardingFormData['carePreference'] }
                    )
                  }
                  className={chipClass(selected)}
                >
                  {option.label[locale]}
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#746c62]">{copy.insuranceProviderLabel ?? copyByLocale.en.insuranceProviderLabel}</span>
                <input
                  type="text"
                  value={formData.insuranceProvider}
                  onChange={(event) => setFormData((prev) => ({ ...prev, insuranceProvider: event.target.value }))}
                  placeholder={copy.insuranceProviderPlaceholder ?? copyByLocale.en.insuranceProviderPlaceholder}
                  className="h-12 w-full rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#332d28] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#746c62]">{copy.insurancePlanLabel ?? copyByLocale.en.insurancePlanLabel}</span>
                <input
                  type="text"
                  value={formData.insurancePlan}
                  onChange={(event) => setFormData((prev) => ({ ...prev, insurancePlan: event.target.value }))}
                  placeholder={copy.insurancePlanPlaceholder ?? copyByLocale.en.insurancePlanPlaceholder}
                  className="h-12 w-full rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#332d28] shadow-sm outline-none transition placeholder:text-[#a39a8c] focus:border-[#7a866f] focus:ring-4 focus:ring-[#b7c0ae]/25"
                />
              </label>
              <p className="text-sm font-medium text-[#746c62] sm:col-span-2">{copy.insuranceHint ?? copyByLocale.en.insuranceHint}</p>
            </div>
          )}
        </div>
      );
    }

    if (step === 8) {
      const virtualTherapistStyles = cnipStyleOptions.slice(0, 4);
      const previewLines = [
        `I felt ${selectedConcernSample}.`,
        ...Object.values(formData.lifeAspectNotesByCategory)
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 1),
      ];

      return (
        <div className="space-y-4">
          <p className="text-sm font-medium text-[#746c62]">{copy.styleHint}</p>
          <div className="rounded-[24px] border border-[#d8d0c2] bg-[#f7f2e8] p-4 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
            <div className="rounded-[24px] bg-[#fffdf8] p-4 shadow-sm">
              <div className="space-y-4">
                {previewLines.map((line, index) => (
                  <div key={`${line}-${index}`} className="flex justify-end">
                    <div className="max-w-[82%]">
                      <p className="mb-1 px-2 text-xs font-semibold text-[#5f6658]">You</p>
                      <div className="rounded-[22px] rounded-tr-md bg-[#6e7b64] px-5 py-4 text-[15px] font-medium leading-7 text-[#f9f5ec] shadow-sm">
                        {line}
                      </div>
                    </div>
                  </div>
                ))}

                {virtualTherapistStyles.map((style, index) => {
                  const selected = formData.cnipConversationStyles.includes(style.id);
                  const theme = therapistBubbleThemes[index % therapistBubbleThemes.length];
                  return (
                    <button
                      type="button"
                      key={style.id}
                      onClick={() => toggleCnipStyle(style.id)}
                      className={[
                        'flex w-full justify-start rounded-[24px] border border-transparent p-0 text-left transition focus:outline-none focus:ring-4 focus:ring-[#b7c0ae]/30',
                        selected ? 'ring-2 ring-[#6e7b64]/35' : 'hover:border-[#d8d0c2]',
                      ].join(' ')}
                    >
                      <div className="max-w-[88%]">
                        <div className="mb-1 flex items-center gap-2 px-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8479]">{style.name}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${theme.tag}`}>{style.role}</span>
                          {selected && <Check className="h-4 w-4 text-[#6e7b64]" />}
                        </div>
                        <div
                          className={[
                            `relative rounded-[22px] rounded-tl-md px-5 py-4 text-[15px] leading-7 shadow-[0_10px_24px_rgba(97,86,68,0.08)] ${theme.bubble}`,
                            selected ? 'outline outline-2 outline-offset-2 outline-[#6e7b64]' : '',
                          ].join(' ')}
                        >
                          <span aria-hidden="true" className={`absolute -left-1 top-4 h-3 w-3 rotate-45 border-b border-l ${theme.tail}`} />
                          <p>{style.sampleResponse(selectedConcernSample)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const category = LIFE_ASPECT_CATEGORY_BY_STEP[step as 4 | 5 | 6 | 7];
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
    const selectedStyles = formData.cnipConversationStyles.map((style) => cnipStyleNames[style]).join(', ');

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
              {selectedStyles && (
                <p className="mt-3 text-sm font-medium text-[#5f6658]">
                  {copy.selectedStylesLabel}: {selectedStyles}
                </p>
              )}
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
            {recommendations.length === 0 && (
              <div className="rounded-[24px] border border-[#d8d0c2] bg-[#f7f2e8] p-6 shadow-[0_16px_34px_rgba(97,86,68,0.08)]">
                <h2 className="text-2xl font-semibold text-[#332d28]">{copy.noRecommendationsTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c62]">{copy.noRecommendationsBody}</p>
              </div>
            )}

            {recommendations.slice(0, 4).map((recommendation, index) => {
              const therapist = recommendation.therapist;
              const languageText = therapist.languages?.length ? therapist.languages.join(', ') : 'Not listed';
              const sessionText = therapist.sessionFormats.length ? therapist.sessionFormats.map((format) => (format === 'InPerson' ? 'In person' : 'Virtual')).join(' + ') : 'Confirm with therapist';
              const insuranceText = therapist.matchingInsurance?.length
                ? therapist.matchingInsurance.map((insurance) => `${insurance.provider}${insurance.plan ? ` ${insurance.plan}` : ''}`).join(', ')
                : therapist.insuranceProviders.length
                  ? therapist.insuranceProviders.join(', ')
                  : 'Confirm with therapist';
              const rateText =
                therapist.hourlyRateMin && therapist.hourlyRateMax
                  ? `$${therapist.hourlyRateMin}-$${therapist.hourlyRateMax}/session`
                  : therapist.hourlyRateMin
                    ? `From $${therapist.hourlyRateMin}/session`
                    : 'Rate not listed';
              const profileFocus = therapist.expertise.slice(0, 6);
              const matchedFocus = therapist.therapyModels.length ? therapist.therapyModels : profileFocus.slice(0, 3);

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
                          <p className="mt-1 text-sm font-medium text-[#746c62]">{therapist.location}</p>
                        </div>
                        <div className="rounded-full bg-[#6e7b64] px-4 py-2 text-sm font-semibold text-[#f9f5ec]">{recommendation.score}% match</div>
                      </div>

                      <p className="mt-4 max-w-3xl text-sm leading-6 text-[#40382f]">{therapist.bio}</p>

                      <div className="mt-4 grid gap-3 rounded-[18px] border border-[#ded6c8] bg-[#fffdf8] p-4 text-sm text-[#40382f] sm:grid-cols-2">
                        {[
                          [copy.languagesLabel, languageText],
                          [copy.sessionFormatLabel, sessionText],
                          [copy.insuranceLabel, insuranceText],
                          [copy.rateLabel, rateText],
                          [copy.serviceAreaLabel, therapist.areaCodes.slice(0, 5).join(', ')],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">{label}</p>
                            <p className="mt-1 font-medium text-[#40382f]">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">{copy.matchedFocus}</p>
                        <div className="flex flex-wrap gap-2">
                          {matchedFocus.map((model) => (
                            <span key={model} className="rounded-full bg-[#dfe7d8] px-3 py-1 text-xs font-semibold text-[#53614d]">
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">{copy.profileFocus}</p>
                        <div className="flex flex-wrap gap-2">
                          {profileFocus.map((focus) => (
                            <span key={focus} className="rounded-full bg-[#ede6d8] px-3 py-1 text-xs font-medium text-[#62594f]">
                              {focus}
                            </span>
                          ))}
                        </div>
                      </div>

                      <ul className="mt-5 grid gap-2 text-sm leading-6 text-[#40382f]">
                        {recommendation.reasons.map((reason) => (
                          <li key={reason} className="flex gap-2">
                            <Check className="mt-1 h-4 w-4 shrink-0 text-[#6e7b64]" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <aside className="space-y-3 rounded-[8px] bg-[#fffdf8] p-4">
                      {[
                        [copy.styleFit, recommendation.styleFit],
                        [copy.expertiseFit, recommendation.expertiseFit],
                        [copy.logisticsFit, recommendation.logisticsFit],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-[#8b8479]">
                            <span>{label}</span>
                            <span>{value}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#ede6d8]">
                            <div className="h-full rounded-full bg-[#6e7b64]" style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))}
                      <a
                        href={therapist.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#332d28] px-4 text-sm font-medium text-[#f9f5ec] transition hover:bg-[#4a4239]"
                      >
                        {copy.viewProfile}
                        <ExternalLink className="h-4 w-4" />
                      </a>
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

  return (
    <main className="min-h-screen bg-[#efe7d7] text-[#332d28]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6e7b64] text-[#f9f5ec]">
              <HeartHandshake className="h-4 w-4" />
            </div>
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
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d6d4c8] text-xs font-semibold text-[#5f6658]">
                    AI
                  </div>
                  <div className={`max-w-[88%] ${assistantBubbleClass}`}>
                    <span aria-hidden="true" className={assistantBubbleTailClass} />
                    {copy.intro}
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
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d6d4c8] text-xs font-semibold text-[#5f6658]">
                        AI
                      </div>
                      <div className={`max-w-[88%] ${assistantBubbleClass}`}>
                        <span aria-hidden="true" className={assistantBubbleTailClass} />
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

                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d6d4c8] text-xs font-semibold text-[#5f6658]">
                    AI
                  </div>
                  <div className={`max-w-[88%] ${assistantBubbleClass} text-[22px] font-medium leading-8 text-[#332d28] sm:text-[24px]`}>
                    <span aria-hidden="true" className={assistantBubbleTailClass} />
                    {typedQuestion}
                    <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-[#6e7b64]" aria-hidden="true" />
                  </div>
                </div>

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
                  onClick={() => setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d2c7b4] bg-[#fbf7ef] px-5 text-sm font-medium text-[#40382f] transition hover:border-[#7a866f] hover:bg-[#f1ede3] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={step === 0 || status === 'saving'}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {copy.back}
                </button>

                {step < 8 ? (
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
