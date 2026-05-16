import React from 'react';
import { MatchingTestingPage } from './components/MatchingTestingPage';
import { OnboardingFlow } from './components/OnboardingFlow';

export default function App() {
  if (window.location.pathname === '/testing') {
    return <MatchingTestingPage />;
  }

  return <OnboardingFlow />;
}
