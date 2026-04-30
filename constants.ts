import { FactorType } from './types';

// Based on the video logic:
// 8:4:4:2:2:1:1 Distribution Logic
// - Birthplace/Roots: Highest (8)
// - Parents/Bloodline: High (4)
// - Grandparents/Deep Connection: Medium (2)
// - General Emotion: Low (1)

export const WEIGHTS: Record<FactorType, number> = {
  [FactorType.TIME_SPENT]: 0, // Calculated differently
  [FactorType.BIRTHPLACE]: 8,
  [FactorType.PARENT]: 4,
  [FactorType.GRANDPARENT]: 2,
  [FactorType.PARTNER]: 2,
  [FactorType.EMOTION]: 1,
};

export const FACTOR_LABELS: Record<FactorType, string> = {
  [FactorType.TIME_SPENT]: 'I lived there (Time)',
  [FactorType.BIRTHPLACE]: 'Born & Raised (Primary Roots)',
  [FactorType.PARENT]: 'Parent\'s Heritage',
  [FactorType.GRANDPARENT]: 'Grandparent\'s Bloodline',
  [FactorType.PARTNER]: 'Spouse / Deep Connection',
  [FactorType.EMOTION]: 'Emotional Affinity / Just like it',
};

// A vibrant palette for the pie chart
export const CHART_COLORS = [
  '#2563eb', // Blue 600
  '#db2777', // Pink 600
  '#16a34a', // Green 600
  '#ea580c', // Orange 600
  '#9333ea', // Purple 600
  '#0891b2', // Cyan 600
  '#ca8a04', // Yellow 600
  '#dc2626', // Red 600
  '#475569', // Slate 600
  '#0d9488', // Teal 600
];
