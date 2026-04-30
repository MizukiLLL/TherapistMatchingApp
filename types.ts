export enum FactorType {
  TIME_SPENT = 'TIME_SPENT',
  BIRTHPLACE = 'BIRTHPLACE',
  PARENT = 'PARENT',
  GRANDPARENT = 'GRANDPARENT',
  PARTNER = 'PARTNER',
  EMOTION = 'EMOTION'
}

export interface IdentityEntry {
  id: string;
  location: string;
  type: FactorType;
  years?: number; // Duration
  startYear?: number; // Timeline start (0 to Age)
  endYear?: number;   // Timeline end (0 to Age)
  designation?: string; // e.g., 'Father', 'Mother' for family tree
  rating?: number; // 1-10 Scale for emotional attachment
}

/** Per-source contribution (Time / Bloodline / Emotion) for a slice, in percentage points */
export interface SliceSourceBreakdown {
  time?: number;
  bloodline?: number;
  emotion?: number;
}

export interface CalculatedSlice {
  name: string;
  value: number; // Percentage 0-100
  fill: string; // Hex color
  /** Further breakdown by source (Time, Bloodline, Emotion) */
  sources?: SliceSourceBreakdown;
}

export interface CalculationResult {
  slices: CalculatedSlice[];
  totalTimePercentage: number;
  remainingPercentage: number;
}