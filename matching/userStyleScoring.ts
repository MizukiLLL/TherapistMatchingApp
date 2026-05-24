import type { IdealTherapistProfile, LegacyCnipProfile, StyleVector, UserStyleScenarioChoice } from './matchingTypes.ts';
import { generateIdealTherapistProfileFromInputs } from './idealTherapistProfile.ts';

export type StyleScenarioCard = {
  id: string;
  title: string;
  shortLabel?: string;
  description: string;
  shortCopy?: string;
  longCopy?: string;
  traits: StyleVector;
};

export type StyleScenario = {
  id: string;
  title: string;
  question: string;
  subtext: string;
  cards: StyleScenarioCard[];
};

const dimensions: Array<keyof StyleVector> = ['therapist_directive', 'emotionally_intensive', 'past_focused', 'support_focused'];

export const STYLE_SCENARIOS: StyleScenario[] = [
  {
    id: 'first-session',
    title: 'First Session',
    question: 'Imagine this is your first therapy session. You share what has been going on. Which therapist response would make you feel most comfortable continuing?',
    subtext: 'There is no right answer. Different people need different kinds of help.',
    cards: [
      {
        id: 'gentle-listener',
        title: 'The Gentle Listener',
        description: 'Take your time. We can start wherever feels safest, and I’ll stay with you as we understand what this has felt like.',
        shortCopy: 'Take your time. We can start wherever feels safest, and I’ll stay with you as we understand what this has felt like.',
        longCopy: 'Thank you for telling me. We don’t have to rush today. I want to understand what this has felt like for you, and we can start wherever feels safest.',
        traits: { therapist_directive: 0, emotionally_intensive: 1, past_focused: 0, support_focused: 1 },
      },
      {
        id: 'practical-coach',
        title: 'The Practical Coach',
        description: 'Let’s clarify what’s happening and choose one concrete next step. I’ll help you turn this into something manageable.',
        shortCopy: 'Let’s clarify what’s happening and choose one concrete next step. I’ll help you turn this into something manageable.',
        longCopy: 'I hear you. Let’s make this clearer together: what’s happening, what’s making it harder, and what we can try first. I’ll help us turn this into next steps.',
        traits: { therapist_directive: 1, emotionally_intensive: 0, past_focused: 0, support_focused: 0 },
      },
      {
        id: 'deep-explorer',
        title: 'The Deep Explorer',
        description: 'I wonder where this feeling began. We can explore the deeper patterns behind what you’re experiencing now.',
        shortCopy: 'I wonder where this feeling began. We can explore the deeper patterns behind what you’re experiencing now.',
        longCopy: 'As you say that, I wonder if this connects to older patterns or experiences. We can gently explore where this feeling comes from, not just what’s happening now.',
        traits: { therapist_directive: 0, emotionally_intensive: 1, past_focused: 1, support_focused: 1 },
      },
      {
        id: 'honest-mirror',
        title: 'The Honest Mirror',
        description: 'I’ll be honest when I notice patterns that may be holding you back — and we’ll work through them together.',
        shortCopy: 'I’ll be honest when I notice patterns that may be holding you back — and we’ll work through them together.',
        longCopy: 'I appreciate you being honest. I’ll be direct with you when I notice patterns that may be keeping you stuck — and we’ll look at them together, not with judgment.',
        traits: { therapist_directive: 1, emotionally_intensive: 1, past_focused: 0, support_focused: 0 },
      },
      {
        id: 'steady-organizer',
        title: 'The Steady Organizer',
        description: 'Let’s slow this down and organize it piece by piece, so it feels less overwhelming before we go further.',
        shortCopy: 'Let’s slow this down and organize it piece by piece, so it feels less overwhelming before we go further.',
        longCopy: 'That sounds like a lot to carry. Let’s slow it down and sort through one piece at a time, so things feel more manageable before we go deeper.',
        traits: { therapist_directive: 1, emotionally_intensive: 0, past_focused: 0, support_focused: 1 },
      },
    ],
  },
  {
    id: 'useful-therapy',
    title: 'When Therapy Feels Useful',
    question: 'When would therapy feel most useful to you?',
    subtext: 'Imagine you have been seeing a therapist for a few sessions. Which kind of session would make you feel like, "Yes, this is helping me"?',
    cards: [
      {
        id: 'understanding-space',
        title: 'The Understanding Space',
        shortLabel: 'When I feel deeply understood.',
        description: 'Therapy feels useful when my therapist really listens, understands what I am feeling, and helps me feel less alone. I want a space where I can slow down, be honest, and feel emotionally supported without being judged or rushed.',
        traits: { therapist_directive: 0, emotionally_intensive: 1, past_focused: 0, support_focused: 1 },
      },
      {
        id: 'practical-plan',
        title: 'The Practical Plan',
        shortLabel: 'When I get clear tools and direction.',
        description: 'Therapy feels useful when I leave with clear tools, next steps, or a plan I can actually use. I want my therapist to help me organize what is going on, identify patterns, and give me practical ways to handle things differently.',
        traits: { therapist_directive: 1, emotionally_intensive: 0, past_focused: 0, support_focused: 0 },
      },
      {
        id: 'deeper-pattern',
        title: 'The Deeper Pattern',
        shortLabel: 'When I understand where my patterns come from.',
        description: 'Therapy feels useful when I start understanding why I react the way I do. I want to explore how my past experiences, family patterns, or earlier relationships may still affect how I think, feel, and connect with people now.',
        traits: { therapist_directive: 0, emotionally_intensive: 1, past_focused: 1, support_focused: 1 },
      },
      {
        id: 'honest-mirror',
        title: 'The Honest Mirror',
        shortLabel: 'When someone helps me face what I avoid.',
        description: 'Therapy feels useful when my therapist helps me notice things I might avoid or not want to admit. I do not want someone to just agree with me - I want someone who can be honest, name patterns clearly, and help me grow.',
        traits: { therapist_directive: 1, emotionally_intensive: 1, past_focused: 0, support_focused: 0 },
      },
      {
        id: 'steady-reset',
        title: 'The Steady Reset',
        shortLabel: 'When life feels calmer and more manageable.',
        description: 'Therapy feels useful when things start to feel less chaotic. I want my therapist to help me slow down, sort through what matters, and make life feel more manageable without diving too deeply too fast.',
        traits: { therapist_directive: 1, emotionally_intensive: 0, past_focused: 0, support_focused: 1 },
      },
    ],
  },
  {
    id: 'feeling-stuck',
    title: 'Feeling Stuck',
    question: 'Imagine therapy feels stuck and you are not sure what is changing. Which therapist response would help you move forward?',
    subtext: 'Different people need different kinds of support when they feel stuck.',
    cards: [
      {
        id: 'reassuring-supporter',
        title: 'The Reassuring Supporter',
        description: 'Feeling stuck is completely okay. Let us slow down and understand what you need before pushing forward. We can stay with this gently and make sense of it together.',
        traits: { therapist_directive: 0, emotionally_intensive: 1, past_focused: 0, support_focused: 1 },
      },
      {
        id: 'action-planner',
        title: 'The Action Planner',
        description: 'Let us break this down. What is one thing we can try before next session? I will help you identify the obstacle, choose a strategy, and make a realistic plan.',
        traits: { therapist_directive: 1, emotionally_intensive: 0, past_focused: 0, support_focused: 0 },
      },
      {
        id: 'pattern-finder',
        title: 'The Pattern Finder',
        description: 'When you feel stuck, it may connect to older patterns or experiences. Let us explore where this familiar feeling may have shown up before.',
        traits: { therapist_directive: 0, emotionally_intensive: 1, past_focused: 1, support_focused: 1 },
      },
      {
        id: 'growth-challenger',
        title: 'The Growth Challenger',
        description: 'I hear the frustration. I also want to be honest about what might be keeping you stuck. Are you open to looking at what you may be avoiding?',
        traits: { therapist_directive: 1, emotionally_intensive: 1, past_focused: 0, support_focused: 0 },
      },
      {
        id: 'grounded-stabilizer',
        title: 'The Grounded Stabilizer',
        description: 'Let us step back and make this feel more manageable. We do not have to solve everything today. Let us organize what matters most and take one steady step.',
        traits: { therapist_directive: 1, emotionally_intensive: 0, past_focused: 0, support_focused: 1 },
      },
    ],
  },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function findCard(scenarioId: string, cardId?: string): StyleScenarioCard | undefined {
  const scenario = STYLE_SCENARIOS.find((entry) => entry.id === scenarioId);
  return scenario?.cards.find((card) => card.id === cardId);
}

export function scoreUserStyleScenarios(choices: UserStyleScenarioChoice[]): StyleVector {
  const totals = Object.fromEntries(dimensions.map((dimension) => [dimension, 0])) as StyleVector;
  let totalWeight = 0;

  for (const choice of choices) {
    const weightedCards: Array<{ card: StyleScenarioCard | undefined; weight: number }> = [];

    if (choice.selectedCardIds && choice.selectedCardIds.length > 0) {
      const perCardWeight = 1 / choice.selectedCardIds.length;
      for (const cardId of choice.selectedCardIds) {
        weightedCards.push({ card: findCard(choice.scenarioId, cardId), weight: perCardWeight });
      }
    } else {
      weightedCards.push({ card: findCard(choice.scenarioId, choice.bestCardId), weight: 1 });
      weightedCards.push({ card: findCard(choice.scenarioId, choice.secondCardId), weight: 0.5 });
      weightedCards.push({ card: findCard(choice.scenarioId, choice.leastCardId), weight: -0.5 });
    }

    for (const { card, weight } of weightedCards) {
      if (!card) continue;
      for (const dimension of dimensions) {
        totals[dimension] += card.traits[dimension] * weight;
      }
      totalWeight += Math.abs(weight);
    }
  }

  if (totalWeight === 0) {
    return { therapist_directive: 0.5, emotionally_intensive: 0.5, past_focused: 0.5, support_focused: 0.5 };
  }

  return {
    therapist_directive: round2(clamp01(totals.therapist_directive / totalWeight)),
    emotionally_intensive: round2(clamp01(totals.emotionally_intensive / totalWeight)),
    past_focused: round2(clamp01(totals.past_focused / totalWeight)),
    support_focused: round2(clamp01(totals.support_focused / totalWeight)),
  };
}

export function styleVectorToLegacyProfile(vector: StyleVector): LegacyCnipProfile {
  return {
    directiveness: Math.round(vector.therapist_directive * 10),
    emotionalIntensity: Math.round(vector.emotionally_intensive * 10),
    pastOrientation: Math.round(vector.past_focused * 10),
    warmSupport: Math.round(vector.support_focused * 10),
  };
}

export function legacyProfileToStyleVector(profile?: Partial<LegacyCnipProfile>): StyleVector {
  return {
    therapist_directive: round2(clamp01((profile?.directiveness ?? 5) / 10)),
    emotionally_intensive: round2(clamp01((profile?.emotionalIntensity ?? 5) / 10)),
    past_focused: round2(clamp01((profile?.pastOrientation ?? 5) / 10)),
    support_focused: round2(clamp01((profile?.warmSupport ?? 5) / 10)),
  };
}

export function generateIdealTherapistProfile(userStyleVector: StyleVector): IdealTherapistProfile {
  return generateIdealTherapistProfileFromInputs({
    userStyleVector,
    selectedConcerns: [],
    freeTextNotes: [],
    modalityPreferenceIds: [],
  });
}
