export type StyleVector = {
  therapist_directive: number;
  emotionally_intensive: number;
  past_focused: number;
  support_focused: number;
};

export type LegacyCnipProfile = {
  directiveness: number;
  emotionalIntensity: number;
  pastOrientation: number;
  warmSupport: number;
};

export type UserStyleScenarioChoice = {
  scenarioId: string;
  bestCardId: string;
  secondCardId?: string;
  leastCardId?: string;
};

export type IdealTherapistProfile = {
  title: string;
  summary: string;
  preferredTraits: string[];
  lessHelpfulTraits: string[];
  userStyleVector: StyleVector;
};

export type NormalizedTherapistProfile = {
  therapist_id: string;
  name: string;
  normalized_tags: {
    issues: string[];
    modalities: string[];
    populations: string[];
    communities: string[];
  };
  practical: {
    languages: string[];
    states: string[];
    zip_codes_or_locations: string[];
    insurance: string[];
    fee_min: number | null;
    fee_max: number | null;
    telehealth: boolean | null;
    in_person: boolean | null;
    accepting_new_clients: boolean | null;
  };
  style_vector: StyleVector;
  style_confidence: number;
  profile_quality_trust: number;
  sourceText: string;
};

export type MatchScoreBreakdown = {
  practicalFit: number;
  clinicalFit: number;
  adjustedStyleFit: number;
  culturalLanguageFit: number;
  profileQualityTrust: number;
};

export type MatchExplanation = {
  headline: string;
  bullets: string[];
  confidenceNote?: string;
};

export type IlluminMatchResult = {
  therapistId: string;
  therapistName: string;
  finalScore: number;
  scoreBreakdown: MatchScoreBreakdown;
  styleVector: StyleVector;
  styleConfidence: number;
  explanation: MatchExplanation;
};

export type MatchingAlgorithmOutput = {
  userIdealProfile: IdealTherapistProfile;
  matches: IlluminMatchResult[];
};
