'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import OnboardingFlow from '@/components/OnboardingFlow';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { isAuthenticated, walletAddress } = useWalletStore();

  if (!isAuthenticated || !walletAddress) {
    return <OnboardingFlow />;
  }

  return <Dashboard />;
}
