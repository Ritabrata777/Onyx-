'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/lib/store';
import { getUSDCBalance, generateQRData } from '@/lib/wallet';
import { QRCodeSVG } from 'qrcode.react';
import SendPayment from './SendPayment';
import QRScanner from './QRScanner';
import AddNetworkQR from './AddNetworkQR';

type Tab = 'home' | 'send' | 'receive' | 'scan';

export default function Dashboard() {
  const { walletAddress, paymentId, balance, setBalance, logout } = useWalletStore();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  useEffect(() => {
    if (walletAddress) {
      getUSDCBalance(walletAddress).then(setBalance);
      const interval = setInterval(() => {
        getUSDCBalance(walletAddress).then(setBalance);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, setBalance]);

  const qrData = generateQRData(paymentId || '', receiveAmount || undefined);

  if (activeTab === 'send') {
    return <SendPayment onBack={() => setActiveTab('home')} />;
  }

  if (activeTab === 'scan') {
    return <QRScanner onBack={() => setActiveTab('home')} />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col p-4 pb-8 safe-area-inset">
      {/* Add Network Modal */}
      {showAddNetwork && <AddNetworkQR onClose={() => setShowAddNetwork(false)} />}
      
      {/* Header */}
      <div className="flex justify-between items-center py-4">
        <div>
          <p className="text-text/50 text-xs">Welcome back</p>
          <p className="font-semibold text-sm truncate max-w-[200px]">{paymentId}</p>
        </div>
        <button 
          onClick={logout} 
          className="text-text/50 text-sm px-3 py-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Balance Card */}
      <div className="card mb-5 text-center py-8">
        <p className="text-text/50 text-sm mb-2">Your Balance</p>
        <p className="text-5xl font-bold mb-2 tracking-tight">
          ${parseFloat(balance).toFixed(2)}
        </p>
        <p className="text-text/50 text-sm">MATIC • Amoy Testnet</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <button 
          onClick={() => setActiveTab('scan')} 
          className="card flex flex-col items-center py-5 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation"
        >
          <span className="text-3xl mb-2">📷</span>
          <span className="font-medium text-sm">Scan</span>
        </button>
        <button 
          onClick={() => setActiveTab('send')} 
          className="card flex flex-col items-center py-5 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation"
        >
          <span className="text-3xl mb-2">💸</span>
          <span className="font-medium text-sm">Send</span>
        </button>
        <button 
          onClick={() => setShowAddNetwork(true)} 
          className="card flex flex-col items-center py-5 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation"
        >
          <span className="text-3xl mb-2">🦊</span>
          <span className="font-medium text-sm">Add Net</span>
        </button>
      </div>

      {/* Receive Section */}
      <div className="card flex-1">
        <h3 className="font-semibold mb-4 text-center">Receive Payment</h3>
        
        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <QRCodeSVG value={qrData} size={160} level="H" />
          </div>
        </div>

        <input
          type="number"
          inputMode="decimal"
          placeholder="Amount (optional)"
          value={receiveAmount}
          onChange={(e) => setReceiveAmount(e.target.value)}
          className="input-field mb-4 text-center text-lg"
        />

        <div className="bg-background rounded-2xl p-4 text-center">
          <p className="text-text/50 text-xs mb-2">Your Payment ID</p>
          <p className="font-mono text-sm break-all select-all">{paymentId}</p>
        </div>
      </div>
    </div>
  );
}
