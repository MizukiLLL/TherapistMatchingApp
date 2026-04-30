import { IdentityEntry, FactorType, CalculationResult, CalculatedSlice } from '../types';
import { CHART_COLORS } from '../constants';

/**
 * Normalizes location names to avoid case sensitivity issues (e.g., "USA" vs "usa")
 */
const normalizeLocation = (loc: string): string => {
  return loc.trim().toUpperCase();
};

const displayLocation = (loc: string): string => {
  return loc.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * The "Jackie Chan Algorithm" - Revised
 * 
 * Logic Flow:
 * 1. Calculate Local Shares (0.0 to 1.0) for each bucket independently.
 *    - Time Bucket: Proportional to duration.
 *    - Bloodline Bucket: Weighted (Self=1, Parent=0.5, Grandparent=0.25).
 *    - Emotion Bucket: Proportional to 1-10 rating.
 * 
 * 2. Calculate Global Allocation (0 to 100%) for the buckets.
 *    - Ratio: Time(2) : Bloodline(2) : Emotion(1)
 *    - Dynamic: If a bucket is empty, it contributes 0 to the ratio denominator.
 * 
 * 3. Final Score = Local Share * Global Allocation
 */
export const calculateIdentity = (age: number, entries: IdentityEntry[]): CalculationResult => {
  if (!age || age <= 0) {
    return { slices: [], totalTimePercentage: 0, remainingPercentage: 100 };
  }

  // --- Step 1: Calculate Local Shares (0.0 - 1.0) per Bucket ---

  // 1. Time Bucket
  const timeShares: Record<string, number> = {}; 
  let totalDuration = 0;
  
  const timeEntries = entries.filter(e => e.type === FactorType.TIME_SPENT).map(e => {
    let duration = 0;
    if (e.years !== undefined) duration = e.years;
    else if (e.startYear !== undefined && e.endYear !== undefined) duration = e.endYear - e.startYear;
    duration = Math.max(0, duration);
    
    totalDuration += duration;
    return { location: normalizeLocation(e.location), duration };
  });

  if (totalDuration > 0) {
    timeEntries.forEach(e => {
      if (e.duration > 0) {
        timeShares[e.location] = (timeShares[e.location] || 0) + (e.duration / totalDuration);
      }
    });
  }

  // 2. Bloodline Bucket
  const bloodlineShares: Record<string, number> = {};
  const bloodlineItems: { location: string, weight: number }[] = [];

  // 2a. Self Birthplace (Weight 1.0) - inferred from Time entry starting at ~0
  const birthEntry = entries.find(e => 
    e.type === FactorType.TIME_SPENT && 
    (e.startYear === 0 || (e.startYear !== undefined && e.startYear <= 1))
  );
  if (birthEntry && birthEntry.location) {
      bloodlineItems.push({ location: normalizeLocation(birthEntry.location), weight: 1.0 });
  }

  // 2b. Ancestors (Parent=0.5, Grandparent=0.25)
  entries.forEach(e => {
      if (e.type === FactorType.PARENT) {
          bloodlineItems.push({ location: normalizeLocation(e.location), weight: 0.5 });
      } else if (e.type === FactorType.GRANDPARENT) {
          bloodlineItems.push({ location: normalizeLocation(e.location), weight: 0.25 });
      }
  });

  const totalBloodlineWeight = bloodlineItems.reduce((sum, item) => sum + item.weight, 0);

  if (totalBloodlineWeight > 0) {
      bloodlineItems.forEach(item => {
          bloodlineShares[item.location] = (bloodlineShares[item.location] || 0) + (item.weight / totalBloodlineWeight);
      });
  }

  // 3. Emotion Bucket
  const emotionShares: Record<string, number> = {};
  const emotionEntries = entries.filter(e => e.type === FactorType.EMOTION || e.type === FactorType.PARTNER);
  const totalEmotionScore = emotionEntries.reduce((sum, e) => sum + (e.rating || 0), 0);

  if (totalEmotionScore > 0) {
      emotionEntries.forEach(e => {
          const score = e.rating || 0;
          if (score > 0) {
              const loc = normalizeLocation(e.location);
              emotionShares[loc] = (emotionShares[loc] || 0) + (score / totalEmotionScore);
          }
      });
  }


  // --- Step 2: Determine Global Allocations (The Outer Loop) ---
  
  let timeWeight = 0;
  let bloodlineWeight = 0;
  let emotionWeight = 0;

  // Only allocate weight if the bucket has data
  if (totalDuration > 0) timeWeight = 2;
  if (totalBloodlineWeight > 0) bloodlineWeight = 2;
  if (totalEmotionScore > 0) emotionWeight = 1;

  const totalWeight = timeWeight + bloodlineWeight + emotionWeight;

  if (totalWeight === 0) {
       return { slices: [], totalTimePercentage: 0, remainingPercentage: 100 };
  }

  const timeGlobalPct = (timeWeight / totalWeight) * 100;
  const bloodlineGlobalPct = (bloodlineWeight / totalWeight) * 100;
  const emotionGlobalPct = (emotionWeight / totalWeight) * 100;


  // --- Step 3: Combine Local Shares with Global Allocations (and track per-source) ---
  
  const finalScores: Record<string, number> = {};
  const sourceBreakdown: Record<string, { time: number; bloodline: number; emotion: number }> = {};

  const addToFinal = (
    shares: Record<string, number>,
    globalPct: number,
    source: 'time' | 'bloodline' | 'emotion'
  ) => {
    Object.entries(shares).forEach(([loc, localFraction]) => {
      const contrib = localFraction * globalPct;
      finalScores[loc] = (finalScores[loc] || 0) + contrib;
      if (!sourceBreakdown[loc]) sourceBreakdown[loc] = { time: 0, bloodline: 0, emotion: 0 };
      sourceBreakdown[loc][source] = (sourceBreakdown[loc][source] || 0) + contrib;
    });
  };

  addToFinal(timeShares, timeGlobalPct, 'time');
  addToFinal(bloodlineShares, bloodlineGlobalPct, 'bloodline');
  addToFinal(emotionShares, emotionGlobalPct, 'emotion');


  // --- Step 4: Format Output ---
  const slices: CalculatedSlice[] = Object.keys(finalScores)
    .map((key, index) => {
      const breakdown = sourceBreakdown[key];
      const sources = breakdown && (breakdown.time > 0 || breakdown.bloodline > 0 || breakdown.emotion > 0)
        ? {
            time: breakdown.time > 0 ? parseFloat(breakdown.time.toFixed(2)) : undefined,
            bloodline: breakdown.bloodline > 0 ? parseFloat(breakdown.bloodline.toFixed(2)) : undefined,
            emotion: breakdown.emotion > 0 ? parseFloat(breakdown.emotion.toFixed(2)) : undefined,
          }
        : undefined;
      return {
        name: displayLocation(key),
        value: parseFloat(finalScores[key].toFixed(2)),
        fill: CHART_COLORS[index % CHART_COLORS.length],
        sources,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    slices,
    totalTimePercentage: timeGlobalPct,
    remainingPercentage: bloodlineGlobalPct + emotionGlobalPct
  };
};