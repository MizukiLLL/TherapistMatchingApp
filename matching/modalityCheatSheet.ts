import type { ModalityPreferenceId, RecommendedModality } from './matchingTypes.ts';

export type ModalityPreferenceOption = {
  id: ModalityPreferenceId;
  title: string;
  copy: string;
  recommendedModalities: RecommendedModality[];
};

export const MODALITY_PREFERENCE_OPTIONS: ModalityPreferenceOption[] = [
  {
    id: 'toolsBased',
    title: 'Practical tools for daily life',
    copy: 'I want coping skills, strategies, or steps I can actually use between sessions.',
    recommendedModalities: [
      {
        modalityId: 'cbt',
        displayName: 'CBT',
        explanation: 'May help by teaching practical ways to shift thought and behavior patterns.',
        reason: 'You asked for tools, structure, or strategies you can use between sessions.',
      },
      {
        modalityId: 'dbt_skills',
        displayName: 'DBT skills',
        explanation: 'May help with emotion regulation, distress tolerance, and relationship skills.',
        reason: 'You asked for skills that can make difficult moments feel more manageable.',
      },
      {
        modalityId: 'solution_focused',
        displayName: 'Solution-focused therapy',
        explanation: 'May help you identify concrete next steps and build on what is already working.',
        reason: 'You asked for practical movement and manageable action.',
      },
    ],
  },
  {
    id: 'insightBased',
    title: 'Understanding deeper patterns',
    copy: 'I want to understand why I feel, react, or relate to people the way I do.',
    recommendedModalities: [
      {
        modalityId: 'psychodynamic',
        displayName: 'Psychodynamic therapy',
        explanation: 'May help you understand recurring emotional or relationship patterns.',
        reason: 'You want therapy to make sense of deeper patterns.',
      },
      {
        modalityId: 'insight_oriented',
        displayName: 'Insight-oriented therapy',
        explanation: 'May help connect present struggles with emotions, beliefs, and relational patterns.',
        reason: 'You asked for understanding, not only symptom management.',
      },
      {
        modalityId: 'attachment_based',
        displayName: 'Attachment-based therapy',
        explanation: 'May help explore how past relationships shape current needs and reactions.',
        reason: 'You want support understanding relationship and emotional patterns.',
      },
    ],
  },
  {
    id: 'traumaProcessing',
    title: 'Processing trauma or painful memories',
    copy: 'I want help working through painful experiences, trauma, or memories that still affect me.',
    recommendedModalities: [
      {
        modalityId: 'emdr',
        displayName: 'EMDR',
        explanation: 'May help some people process painful memories in a structured way.',
        reason: 'You named trauma, painful memories, or past experiences as a focus.',
      },
      {
        modalityId: 'trauma_informed',
        displayName: 'Trauma-informed therapy',
        explanation: 'May help therapy move at a pace that feels safer and more grounded.',
        reason: 'You asked for support that can hold painful experiences carefully.',
      },
      {
        modalityId: 'somatic',
        displayName: 'Somatic therapy',
        explanation: 'May help notice and regulate how stress or trauma shows up in the body.',
        reason: 'You may benefit from support that includes the body and nervous system.',
      },
    ],
  },
  {
    id: 'relationshipFocused',
    title: 'Improving relationships and communication',
    copy: 'I want help with family, romantic relationships, friendships, boundaries, or communication.',
    recommendedModalities: [
      {
        modalityId: 'ipt',
        displayName: 'IPT',
        explanation: 'May help with relationship patterns, role changes, grief, and communication.',
        reason: 'You named relationships or communication as an important focus.',
      },
      {
        modalityId: 'family_systems',
        displayName: 'Family systems therapy',
        explanation: 'May help you understand how family patterns affect current relationships.',
        reason: 'You want therapy to include family dynamics or boundaries.',
      },
      {
        modalityId: 'eft',
        displayName: 'EFT',
        explanation: 'May help with emotional patterns in close relationships.',
        reason: 'You asked for relational support and clearer communication.',
      },
    ],
  },
  {
    id: 'valuesActionBased',
    title: 'Moving forward even when things feel hard',
    copy: 'I want help taking action, making decisions, and moving toward the life I want.',
    recommendedModalities: [
      {
        modalityId: 'act',
        displayName: 'ACT',
        explanation: 'May help you move toward what matters even when difficult emotions are present.',
        reason: 'You asked for support with action, values, and forward movement.',
      },
      {
        modalityId: 'behavioral_activation',
        displayName: 'Behavioral activation',
        explanation: 'May help rebuild momentum through small, meaningful actions.',
        reason: 'You want therapy to help with movement when things feel stuck.',
      },
      {
        modalityId: 'solution_focused',
        displayName: 'Solution-focused therapy',
        explanation: 'May help identify next steps and strengths you can build from.',
        reason: 'You asked for clear movement and decision support.',
      },
    ],
  },
  {
    id: 'somaticRegulation',
    title: 'Calming my body and nervous system',
    copy: 'I want help with stress, tension, panic, shutdown, or feeling overwhelmed in my body.',
    recommendedModalities: [
      {
        modalityId: 'somatic',
        displayName: 'Somatic therapy',
        explanation: 'May help you notice body signals and build steadier regulation.',
        reason: 'You named stress, panic, shutdown, tension, or body overwhelm.',
      },
      {
        modalityId: 'mindfulness_based',
        displayName: 'Mindfulness-based therapy',
        explanation: 'May help you relate differently to thoughts, emotions, and body sensations.',
        reason: 'You asked for help calming and grounding your nervous system.',
      },
      {
        modalityId: 'dbt_skills',
        displayName: 'DBT skills',
        explanation: 'May help with distress tolerance and emotion regulation skills.',
        reason: 'You want support with intense or overwhelming moments.',
      },
    ],
  },
  {
    id: 'culturallyResponsive',
    title: 'Identity, culture, or family expectations as therapy topics',
    copy: 'I want therapy to help me understand how identity, belonging, family expectations, or culture shape what I am going through.',
    recommendedModalities: [
      {
        modalityId: 'culturally_responsive',
        displayName: 'Culturally responsive therapy',
        explanation: 'May help connect therapy to identity, belonging, family expectations, and context.',
        reason: 'You want identity or culture to be part of the therapy conversation.',
      },
      {
        modalityId: 'narrative',
        displayName: 'Narrative therapy',
        explanation: 'May help you explore the stories, roles, and expectations shaping your life.',
        reason: 'You asked for support understanding identity and meaning.',
      },
      {
        modalityId: 'family_systems',
        displayName: 'Family systems therapy',
        explanation: 'May help with family roles, expectations, and intergenerational patterns.',
        reason: 'You named family expectations or cultural context as therapy topics.',
      },
    ],
  },
  {
    id: 'neurodiversityAffirming',
    title: 'Neurodivergent-affirming support',
    copy: 'I want support with ADHD, autism, masking, sensory overwhelm, executive functioning, or feeling misunderstood.',
    recommendedModalities: [
      {
        modalityId: 'neurodiversity_affirming',
        displayName: 'Neurodiversity-affirming therapy',
        explanation: 'May help you get support without framing neurodivergence as something to fix.',
        reason: 'You asked for affirming support around ADHD, autism, masking, or sensory needs.',
      },
      {
        modalityId: 'adapted_cbt',
        displayName: 'Adapted CBT',
        explanation: 'May help with practical tools when adapted to your processing style and needs.',
        reason: 'You may want concrete support that still respects neurodivergent experience.',
      },
      {
        modalityId: 'dbt_skills',
        displayName: 'DBT skills',
        explanation: 'May help with emotional overwhelm, communication, and distress tolerance.',
        reason: 'You asked for support with overwhelm or feeling misunderstood.',
      },
    ],
  },
];

export const MODALITY_ALIASES: Record<string, string[]> = {
  cbt: ['cbt', 'cognitive behavioral therapy', 'cognitive behavioural therapy'],
  dbt_skills: ['dbt', 'dialectical behavior therapy', 'dialectical behavioural therapy', 'dbt skills'],
  solution_focused: ['solution-focused', 'solution focused', 'solution-focused therapy'],
  psychodynamic: ['psychodynamic', 'psychodynamic therapy'],
  insight_oriented: ['insight-oriented', 'insight oriented', 'depth work'],
  attachment_based: ['attachment-based', 'attachment based', 'attachment'],
  emdr: ['emdr'],
  trauma_informed: ['trauma-informed', 'trauma informed', 'trauma therapy'],
  somatic: ['somatic', 'somatic therapy'],
  ipt: ['ipt', 'interpersonal therapy'],
  family_systems: ['family systems', 'family therapy'],
  eft: ['eft', 'emotionally focused therapy'],
  act: ['act', 'acceptance and commitment therapy'],
  behavioral_activation: ['behavioral activation'],
  mindfulness_based: ['mindfulness', 'mindfulness-based', 'mindfulness based therapy'],
  culturally_responsive: ['culturally responsive', 'culturally sensitive', 'multicultural'],
  narrative: ['narrative', 'narrative therapy'],
  neurodiversity_affirming: ['neurodiversity affirming', 'neurodivergent affirming', 'adhd', 'autism'],
  adapted_cbt: ['adapted cbt', 'cbt'],
};
