import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { STYLE_SCENARIOS } from '../matching/userStyleScoring';

type TestingMatch = {
  therapistId: string;
  therapist: {
    fullName: string;
    credentials: string;
    languages: string[];
    therapyModels: string[];
  };
  final_score: number;
    scoreBreakdown?: {
      practicalFit: number;
      clinicalFit: number;
      modalityFit: number;
      adjustedStyleFit: number;
      culturalLanguageFit: number;
      profileQualityTrust: number;
  };
  styleVector?: {
    therapist_directive: number;
    emotionally_intensive: number;
    past_focused: number;
    support_focused: number;
  };
  styleConfidence?: number;
  userFacingExplanation?: {
    headline: string;
    bullets: string[];
    confidenceNote?: string;
  };
  explanation: {
    recommendedTherapyModels?: string[];
    matchedTherapyModels: string[];
  };
};

type TestingResponse = {
  data?: TestingMatch[];
  meta?: {
    userIdealProfile?: {
      title: string;
      summary: string;
      preferredTraits: string[];
      userStyleVector: TestingMatch['styleVector'];
    };
  };
};

function pct(value?: number): string {
  if (typeof value !== 'number') return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function vector(value?: TestingMatch['styleVector']): string {
  if (!value) return 'n/a';
  return Object.entries(value)
    .map(([key, score]) => `${key}: ${score.toFixed(2)}`)
    .join(' / ');
}

export function MatchingTestingPage() {
  const [payload, setPayload] = useState<TestingResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const runTest = async () => {
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/matches/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'testing-page-user',
          areaCode: '94105',
          preferredLanguage: 'English',
          requiredLanguages: [],
          preferredLanguages: ['English'],
          languagePriority: 'preferred',
          culturalContextNeeds: ['no strong preference'],
          identitySupportNeeds: [],
          culturePriority: 'low',
          therapyFor: 'Myself',
          carePreference: 'Virtual',
          paymentPreference: 'not_sure',
          insuranceProvider: 'Aetna',
          therapyTypes: ['anxiety', 'stress_burnout', 'relationship_issues'],
          modalityPreferenceIds: ['toolsBased', 'valuesActionBased'],
          styleScenarioResponses: STYLE_SCENARIOS.map((scenario) => ({
            scenarioId: scenario.id,
            bestCardId: scenario.cards[1]?.id ?? scenario.cards[0].id,
          })),
          userStyleVector: {
            therapist_directive: 0.75,
            emotionally_intensive: 0.25,
            past_focused: 0.1,
            support_focused: 0.45,
          },
          limit: 10,
        }),
      });

      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      setPayload((await response.json()) as TestingResponse);
      setStatus('idle');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Could not generate test matches.');
    }
  };

  useEffect(() => {
    void runTest();
  }, []);

  return (
    <main className="min-h-screen bg-[#f2eadc] px-4 py-8 text-[#332d28]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-[#d8d0c2] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Internal testing</p>
            <h1 className="mt-2 text-3xl font-semibold">Matching Algorithm Scores</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746c62]">
              This page exposes the score breakdown for debugging. The normal user result page keeps these scores hidden.
            </p>
          </div>
          <button
            type="button"
            onClick={runTest}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#332d28] px-5 text-sm font-medium text-[#f9f5ec] transition hover:bg-[#4a4239]"
          >
            {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run test
          </button>
        </header>

        {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {payload?.meta?.userIdealProfile && (
          <section className="mb-5 rounded-[12px] border border-[#d8d0c2] bg-[#fffdf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8479]">Generated ideal profile</p>
            <h2 className="mt-2 text-xl font-semibold">{payload.meta.userIdealProfile.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#746c62]">{payload.meta.userIdealProfile.summary}</p>
            <p className="mt-3 text-xs font-mono text-[#5f6658]">{vector(payload.meta.userIdealProfile.userStyleVector)}</p>
          </section>
        )}

        <div className="grid gap-4">
          {(payload?.data ?? []).map((match) => (
            <article key={match.therapistId} className="rounded-[12px] border border-[#d8d0c2] bg-[#fffdf8] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {match.therapist.fullName}, {match.therapist.credentials}
                  </h2>
                  <p className="mt-1 text-sm text-[#746c62]">{match.therapist.languages.join(', ') || 'Languages not listed'}</p>
                </div>
                <span className="rounded-full bg-[#6e7b64] px-4 py-2 text-sm font-semibold text-[#f9f5ec]">{match.final_score}% final</span>
              </div>

              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-5">
                <div>Practical: {pct(match.scoreBreakdown?.practicalFit)}</div>
                <div>Clinical: {pct(match.scoreBreakdown?.clinicalFit)}</div>
                <div>Modality: {pct(match.scoreBreakdown?.modalityFit)}</div>
                <div>Style: {pct(match.scoreBreakdown?.adjustedStyleFit)}</div>
                <div>Cultural: {pct(match.scoreBreakdown?.culturalLanguageFit)}</div>
                <div>Data trust: {pct(match.scoreBreakdown?.profileQualityTrust)}</div>
              </div>

              <p className="mt-3 text-xs font-mono text-[#5f6658]">Style vector: {vector(match.styleVector)}</p>
              <p className="mt-1 text-xs font-mono text-[#5f6658]">Style confidence: {pct(match.styleConfidence)}</p>
              <p className="mt-3 text-sm font-semibold">{match.userFacingExplanation?.headline ?? 'Why this therapist may fit you'}</p>
              <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#746c62]">
                {(match.userFacingExplanation?.bullets ?? []).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
