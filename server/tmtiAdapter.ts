export type TmtiResponseInput = {
  questionCode: string;
  responseValue: string;
};

export type TmtiProfileResult = {
  tmtiType: string;
  dimensionScores: Record<string, number>;
  confidenceScore: number;
  version: string;
};

type Dimension = 'directiveness' | 'emotionalIntensity' | 'pastOrientation' | 'warmSupport';

const VERSION = 'placeholder-v1';
const dimensions: Dimension[] = ['directiveness', 'emotionalIntensity', 'pastOrientation', 'warmSupport'];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function scoreResponse(response: TmtiResponseInput): Partial<Record<Dimension, number>> {
  const questionCode = normalize(response.questionCode);
  const responseValue = normalize(response.responseValue);
  const numericValue = Number.parseFloat(responseValue);
  const scaledNumericValue = Number.isNaN(numericValue) ? undefined : Math.max(0, Math.min(10, numericValue));

  if (questionCode.includes('directive') || responseValue.includes('structured') || responseValue.includes('coach')) {
    return { directiveness: scaledNumericValue ?? 8 };
  }

  if (questionCode.includes('emotion') || responseValue.includes('deep') || responseValue.includes('intense')) {
    return { emotionalIntensity: scaledNumericValue ?? 8 };
  }

  if (questionCode.includes('past') || responseValue.includes('history') || responseValue.includes('childhood')) {
    return { pastOrientation: scaledNumericValue ?? 8 };
  }

  if (questionCode.includes('warm') || responseValue.includes('support') || responseValue.includes('reflective')) {
    return { warmSupport: scaledNumericValue ?? 8 };
  }

  return {};
}

function average(values: number[]): number {
  if (values.length === 0) return 5;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function generatePlaceholderTmtiProfile(responses: TmtiResponseInput[]): TmtiProfileResult {
  const scoresByDimension = dimensions.reduce<Record<Dimension, number[]>>(
    (scores, dimension) => ({ ...scores, [dimension]: [] }),
    { directiveness: [], emotionalIntensity: [], pastOrientation: [], warmSupport: [] }
  );

  for (const response of responses) {
    const scoredResponse = scoreResponse(response);
    for (const dimension of dimensions) {
      const score = scoredResponse[dimension];
      if (typeof score === 'number') {
        scoresByDimension[dimension].push(score);
      }
    }
  }

  const dimensionScores = dimensions.reduce<Record<Dimension, number>>(
    (scores, dimension) => ({ ...scores, [dimension]: average(scoresByDimension[dimension]) }),
    { directiveness: 5, emotionalIntensity: 5, pastOrientation: 5, warmSupport: 5 }
  );
  const highestDimension = dimensions.reduce((best, dimension) => (dimensionScores[dimension] > dimensionScores[best] ? dimension : best), dimensions[0]);
  const answeredDimensions = dimensions.filter((dimension) => scoresByDimension[dimension].length > 0).length;

  return {
    tmtiType: highestDimension,
    dimensionScores,
    confidenceScore: Math.round((answeredDimensions / dimensions.length) * 100) / 100,
    version: VERSION,
  };
}
