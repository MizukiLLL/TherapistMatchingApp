import type { StyleVector } from './matchingTypes.ts';

export type TherapistStyleClassification = {
  styleVector: StyleVector;
  confidence: number;
  evidencePhrases: string[];
  signalStrength: number;
};

export class TherapistStyleClassifier {
  classify(profileText: string): TherapistStyleClassification {
    return inferTherapistStyleFromText(profileText);
  }
}

const signalGroups = {
  therapistDirective: ['practical tools', 'strategies', 'skills', 'coping skills', 'action steps', 'goal-oriented', 'structured', 'solution-focused', 'cbt', 'dbt', 'coaching', 'homework', 'evidence-based tools', 'treatment plan', 'problem-solving'],
  clientDirective: ['your pace', 'client-centered', 'collaborative', 'nonjudgmental space', 'follow your lead', 'person-centered', 'safe space', 'explore together', 'self-discovery', 'your story'],
  emotionallyIntensive: ['deep healing', 'trauma', 'inner child', 'grief', 'emotional pain', 'vulnerability', 'attachment wounds', 'relational wounds', 'process emotions', 'somatic', 'emotionally focused', 'psychodynamic', 'depth work'],
  emotionallyReserved: ['practical', 'skills-based', 'structured', 'manage symptoms', 'coping strategies', 'solution-focused', 'psychoeducation', 'measurable goals', 'brief therapy', 'problem-solving'],
  pastFocused: ['childhood', 'family of origin', 'trauma history', 'early experiences', 'attachment', 'generational patterns', 'past experiences', 'psychodynamic', 'inner child', 'long-standing patterns'],
  presentFocused: ['current stressors', 'daily life', 'coping now', 'present moment', 'mindfulness', 'here and now', 'current relationships', 'work stress', 'life transitions', 'practical changes'],
  supportFocused: ['warm', 'compassionate', 'safe', 'affirming', 'supportive', 'gentle', 'nonjudgmental', 'validating', 'culturally sensitive', 'culturally responsive', 'inclusive', 'trauma-informed'],
  challengeFocused: ['accountability', 'challenge', 'direct', 'honest feedback', 'growth', 'change patterns', 'confront avoidance', 'push through', 'motivate', 'empower', 'build resilience'],
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function countSignals(text: string, phrases: string[]): { score: number; evidence: string[] } {
  let score = 0;
  const evidence: string[] = [];
  const lowerText = text.toLocaleLowerCase();

  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = lowerText.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    if (matches?.length) {
      score += matches.length;
      evidence.push(phrase);
    }
  }

  return { score, evidence };
}

function ratio(left: number, right: number): number {
  if (left + right < 0.01) return 0.5;
  return left / (left + right);
}

export function inferTherapistStyleFromText(profileText: string): TherapistStyleClassification {
  const directive = countSignals(profileText, signalGroups.therapistDirective);
  const client = countSignals(profileText, signalGroups.clientDirective);
  const intensive = countSignals(profileText, signalGroups.emotionallyIntensive);
  const reserved = countSignals(profileText, signalGroups.emotionallyReserved);
  const past = countSignals(profileText, signalGroups.pastFocused);
  const present = countSignals(profileText, signalGroups.presentFocused);
  const support = countSignals(profileText, signalGroups.supportFocused);
  const challenge = countSignals(profileText, signalGroups.challengeFocused);
  const totalSignals = directive.score + client.score + intensive.score + reserved.score + past.score + present.score + support.score + challenge.score;
  const styleVector: StyleVector = {
    therapist_directive: round2(ratio(directive.score, client.score)),
    emotionally_intensive: round2(ratio(intensive.score, reserved.score)),
    past_focused: round2(ratio(past.score, present.score)),
    support_focused: round2(ratio(support.score, challenge.score)),
  };
  const dimensionClarity = (
    Math.abs(styleVector.therapist_directive - 0.5) +
    Math.abs(styleVector.emotionally_intensive - 0.5) +
    Math.abs(styleVector.past_focused - 0.5) +
    Math.abs(styleVector.support_focused - 0.5)
  ) / 2;
  const bioLengthScore = clamp01(profileText.length / 900);
  const styleSignalStrength = clamp01(totalSignals / 14);
  const fieldCompleteness = profileText.length > 160 ? 0.8 : 0.35;
  const confidence = round2(clamp01(0.35 * bioLengthScore + 0.35 * styleSignalStrength + 0.2 * dimensionClarity + 0.1 * fieldCompleteness));

  return {
    styleVector,
    confidence,
    evidencePhrases: Array.from(new Set([...directive.evidence, ...client.evidence, ...intensive.evidence, ...reserved.evidence, ...past.evidence, ...present.evidence, ...support.evidence, ...challenge.evidence])).slice(0, 12),
    signalStrength: round2(styleSignalStrength),
  };
}
