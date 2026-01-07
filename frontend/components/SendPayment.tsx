'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { resolvePaymentId, buildTransferUserOp, submitSignedUserOp } from '@/lib/wallet';
import { signTransaction } from '@/lib/webauthn';

interface Props {
  onBack: () => void;
  prefillPaymentId?: string;
  prefillAmount?: string;
}

type Step = 'input' | 'confirm' | 'signing' | 'success' | 'error';

export default function SendPayment({ onBack, prefillPaymentId, prefillAmount }: Props) {
  const { walletAddress, credentialId, balance } = useWalletStore();
  const [step, setStep] = useState<Step>('input');
  const [paymentId, setPaymentId] = useState(prefillPaymentId || '');
  const [amount, setAmount] = useState(prefillAmount || '');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleContinue = async () => {
    if (!paymentId || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient balance');
      return;
    }

    setError('');

    try {
      const address = await resolvePaymentId(paymentId);
      setRecipientAddress(address);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Invalid payment ID');
    }
  };

  const handleConfirm = async () => {
    if (!walletAddress || !credentialId) return;

    setStep('signing');
    setError('');

    try {
      const { userOp, userOpHash } = await buildTransferUserOp(
        walletAddress,
        recipientAddress,
        amount
      );

      const signature = await signTransaction(credentialId, userOpHash);
      const result = await submitSignedUserOp(userOp, signature);
      setTxHash(result.transactionHash);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-[100dvh] p-6 flex flex-col items-center justify-center">
        <div className="card max-w-sm w-full text-center py-10">
          <div className="text-7xl mb-6">✅</div>
          <h2 className="text-2xl font-bold mb-3">Payment Sent!</h2>
          <p className="text-text/60 mb-2 text-lg">
            ${amount} USDC
          </p>
          <p className="text-text/40 mb-6">
            to {paymentId}
          </p>
          {txHash && (
            <a 
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm mb-6 block hover:underline"
            >
              View on Explorer →
            </a>
          )}
          <button onClick={onBack} className="btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-[100dvh] p-6 flex flex-col items-center justify-center">
        <div className="card max-w-sm w-full text-center py-10">
          <div className="text-7xl mb-6">❌</div>
          <h2 className="text-2xl font-bold mb-3">Payment Failed</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button onClick={() => setStep('input')} className="btn-primary w-full">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (step === 'signing') {
    return (
      <div className="min-h-[100dvh] p-6 flex flex-col items-center justify-center">
        <div className="card max-w-sm w-full text-center py-10">
          <div className="text-7xl mb-6 animate-pulse">👆</div>
          <h2 className="text-2xl font-bold mb-3">Confirm Payment</h2>
          <p className="text-text/60">
            Use Face ID or fingerprint to authorize
          </p>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-[100dvh] p-6 flex flex-col">
        <button 
          onClick={() => setStep('input')} 
          className="text-text/50 mb-6 self-start px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10"
        >
          ← Back
        </button>

        <div className="flex-1 flex flex-col justify-center">
          <div className="card">
            <h2 className="text-xl font-bold mb-6 text-center">Confirm Payment</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-text/50">To</span>
                <span className="font-medium text-right max-w-[200px] truncate">{paymentId}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-text/50">Amount</span>
                <span className="font-bold text-2xl">${amount}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-text/50">Network Fee</span>
                <span className="text-success font-medium">Free ✨</span>
              </div>
            </div>

            <div className="bg-background rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-text/50">Total</span>
                <span className="font-bold text-2xl">${amount} USDC</span>
              </div>
            </div>

            <button onClick={handleConfirm} className="btn-primary w-full">
              Confirm & Pay
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Input step
  return (
    <div className="min-h-[100dvh] p-6 flex flex-col">
      <button 
        onClick={onBack} 
        className="text-text/50 mb-6 self-start px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold mb-6">Send Payment</h2>

      <div className="card flex-1">
        <div className="mb-5">
          <label className="text-text/50 text-sm mb-2 block">Recipient</label>
          <input
            type="text"
            placeholder="user@invisiblerail"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="input-field"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <div className="mb-5">
          <label className="text-text/50 text-sm mb-2 block">Amount (USDC)</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field text-3xl font-bold text-center"
          />
          <p className="text-text/40 text-sm mt-3 text-center">
            Available: {parseFloat(balance).toFixed(4)} MATIC
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <button onClick={handleContinue} className="btn-primary w-full mt-auto">
          Continue
        </button>
      </div>
    </div>
  );
}
