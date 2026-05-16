import assert from 'node:assert/strict';
import { buildMatchExplanation } from '../matching/matchExplanation.ts';
import { rankTherapists } from '../matching/matchingAlgorithm.ts';
import type { NormalizedTherapistProfile } from '../matching/matchingTypes.ts';
import { applyHardFilters } from '../matching/practicalFitScoring.ts';
import { inferTherapistStyleFromText } from '../matching/therapistStyleInference.ts';
import { scoreUserStyleScenarios, STYLE_SCENARIOS } from '../matching/userStyleScoring.ts';

function therapist(overrides: Partial<NormalizedTherapistProfile>): NormalizedTherapistProfile {
  return {
    therapist_id: 'therapist-a',
    name: 'Test Therapist',
    normalized_tags: {
      issues: ['anxiety', 'stress_burnout'],
      modalities: ['cbt'],
      populations: ['adults'],
      communities: [],
    },
    practical: {
      languages: ['English'],
      states: ['CA'],
      zip_codes_or_locations: ['94105'],
      insurance: ['Aetna'],
      fee_min: 150,
      fee_max: 180,
      telehealth: true,
      in_person: true,
      accepting_new_clients: true,
    },
    style_vector: {
      therapist_directive: 0.8,
      emotionally_intensive: 0.2,
      past_focused: 0.1,
      support_focused: 0.45,
    },
    style_confidence: 0.8,
    profile_quality_trust: 0.8,
    sourceText: 'Structured CBT therapist with practical coping skills.',
    ...overrides,
  };
}

const practicalChoices = STYLE_SCENARIOS.map((scenario) => ({
  scenarioId: scenario.id,
  bestCardId: scenario.cards[1].id,
}));
const practicalVector = scoreUserStyleScenarios(practicalChoices);
assert.equal(practicalVector.therapist_directive, 1);
assert.equal(practicalVector.emotionally_intensive, 0);
assert.equal(practicalVector.past_focused, 0);

const weightedVector = scoreUserStyleScenarios([
  {
    scenarioId: STYLE_SCENARIOS[0].id,
    bestCardId: STYLE_SCENARIOS[0].cards[2].id,
    secondCardId: STYLE_SCENARIOS[0].cards[0].id,
    leastCardId: STYLE_SCENARIOS[0].cards[1].id,
  },
]);
Object.values(weightedVector).forEach((value) => {
  assert.ok(value >= 0 && value <= 1, `Expected normalized value, got ${value}`);
});

const inferred = inferTherapistStyleFromText(
  'I use structured CBT, DBT skills, coping strategies, homework, and solution-focused treatment plans.'
);
assert.ok(inferred.styleVector.therapist_directive > 0.65);
assert.ok(inferred.styleVector.emotionally_intensive < 0.5);
assert.ok(inferred.confidence > 0.3);

const hardFilter = applyHardFilters(therapist({ practical: { ...therapist({}).practical, languages: ['English'] } }), {
  areaCode: '94105',
  preferredLanguage: 'Mandarin',
  requiredLanguages: ['Mandarin'],
  languagePriority: 'required',
  insuranceProvider: 'Aetna',
  carePreference: 'Virtual',
});
assert.equal(hardFilter.passed, false);

const ranked = rankTherapists(
  {
    areaCode: '94105',
    preferredLanguage: 'English',
    insuranceProvider: 'Aetna',
    carePreference: 'Virtual',
    rawUserConcerns: ['anxiety'],
    userConcernTags: ['anxiety'],
    userStyleVector: practicalVector,
    recommendedModalities: [{ modalityId: 'cbt', displayName: 'CBT', explanation: 'test', reason: 'test' }],
  },
  [
    therapist({ therapist_id: 'strong-style', name: 'Strong Style' }),
    therapist({
      therapist_id: 'weak-style',
      name: 'Weak Style',
      style_vector: {
        therapist_directive: 0,
        emotionally_intensive: 1,
        past_focused: 1,
        support_focused: 1,
      },
    }),
  ]
);
assert.equal(ranked[0].therapistId, 'strong-style');
assert.ok(ranked[0].scoreBreakdown.adjustedStyleFit > ranked[1].scoreBreakdown.adjustedStyleFit);

const explanation = buildMatchExplanation({
  therapist: therapist({ style_confidence: 0.4 }),
  matchedClinicalTags: ['anxiety'],
  practicalSummary: ['Offers virtual sessions.'],
  styleFit: 0.8,
  culturalLanguageFit: 0.4,
});
assert.equal(explanation.headline, 'Why this therapist may fit you');
assert.ok(explanation.confidenceNote?.includes('should be confirmed'));
assert.ok(!JSON.stringify(explanation).toLocaleLowerCase().includes('perfect therapist'));

console.log('matching algorithm tests passed');
