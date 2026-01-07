'use client';

import { useState } from 'react';
import { registerPasskey, authenticatePasskey } from '@/lib/webauthn';
import { useWalletStore } from '@/lib/store';

export default function OnboardingFlow() {
  const [step, setStep] = useState<'welcome' | 'create' | 'login'>('welcome');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setWallet } = useWalletStore();

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await registerPasskey(username);
      setWallet(result.walletAddress, result.paymentId, result.credentialId);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await authenticatePasskey();
      setWallet(result.walletAddress, result.paymentId, result.credentialId);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6">
        <div className="text-center max-w-sm w-full">
          <div className="text-7xl mb-8">🚄</div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InvisibleRail
          </h1>
          <p className="text-text/60 mb-10 text-lg leading-relaxed">
            Pay with stablecoins as easily as UPI. No seed phrases, no gas fees.
          </p>

          <div className="space-y-4">
            <button onClick={() => setStep('create')} className="btn-primary w-full">
              Create Account
            </button>
            <button onClick={() => setStep('login')} className="btn-secondary w-full">
              I already have an account
            </button>
          </div>

          <p className="text-text/40 text-xs mt-8">
            Powered by Polygon Amoy Testnet
          </p>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="flex flex-col min-h-[100dvh] p-6">
        <button 
          onClick={() => setStep('welcome')} 
          className="text-text/50 mb-6 self-start px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10"
        >
          ← Back
        </button>

        <div className="flex-1 flex flex-col justify-center">
          <div className="card">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">👆</div>
              <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
              <p className="text-text/60">
                Your device will secure your wallet with Face ID or fingerprint.
              </p>
            </div>

            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              className="input-field mb-4 text-center text-lg"
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create with Biometrics'
              )}
            </button>

            <p className="text-text/40 text-xs mt-6 text-center leading-relaxed">
              Your private keys never leave your device. We can&apos;t access your funds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login step
  return (
    <div className="flex flex-col min-h-[100dvh] p-6">
      <button 
        onClick={() => setStep('welcome')} 
        className="text-text/50 mb-6 self-start px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10"
      >
        ← Back
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <div className="card">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-text/60">
              Authenticate with your device to access your wallet.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating...
              </span>
            ) : (
              'Login with Biometrics'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
