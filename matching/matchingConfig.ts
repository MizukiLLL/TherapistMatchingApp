export const MATCHING_WEIGHTS = {
  practicalFit: 0.30,
  clinicalFit: 0.25,
  modalityFit: 0.23,
  culturalLanguageFit: 0.12,
  adjustedStyleFit: 0.07,
  profileQualityTrust: 0.03,
} as const;

export const PRACTICAL_FIT_WEIGHTS = {
  languageFit: 0.30,
  insuranceFit: 0.25,
  locationModeFit: 0.20,
  availabilityFit: 0.15,
  affordabilityFit: 0.10,
} as const;

export const STYLE_FIT_WEIGHTS = {
  directionFit: 0.30,
  emotionFit: 0.25,
  timeFit: 0.20,
  stanceFit: 0.25,
} as const;

export const DEFAULT_MATCH_LIMIT = 20;
export const MAX_MATCH_LIMIT = 50;
