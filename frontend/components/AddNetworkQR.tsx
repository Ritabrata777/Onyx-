'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useWalletStore } from '@/lib/store';

// Polygon Amoy testnet config
const AMOY_NETWORK = {
  chainId: '0x13882', // 80002 in hex
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

interface Props {
  onClose: () => void;
}

export default function AddNetworkQR({ onClose }: Props) {
  const { walletAddress } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'receive' | 'network'>('receive');

  // For receiving MATIC - just show the wallet address as QR
  // MetaMask can scan a plain Ethereum address
  const walletQR = walletAddress || '';

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddNetwork = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: AMOY_NETWORK.chainId,
            chainName: AMOY_NETWORK.chainName,
            nativeCurrency: AMOY_NETWORK.nativeCurrency,
            rpcUrls: AMOY_NETWORK.rpcUrls,
            blockExplorerUrls: AMOY_NETWORK.blockExplorerUrls,
          }],
        });
        alert('✅ Polygon Amoy added to MetaMask!');
      } catch (error: any) {
        if (error.code === 4902) {
          alert('Please add the network manually');
        } else {
          alert(error.message || 'Failed to add network');
        }
      }
    } else {
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Fund Your Wallet</h3>
          <button
            onClick={onClose}
            className="text-text/50 hover:text-text p-2 -mr-2 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('receive')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${tab === 'receive'
                ? 'bg-primary text-white'
                : 'bg-background text-text/60 hover:text-text'
              }`}
          >
            Receive MATIC
          </button>
          <button
            onClick={() => setTab('network')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${tab === 'network'
                ? 'bg-primary text-white'
                : 'bg-background text-text/60 hover:text-text'
              }`}
          >
            Add Network
          </button>
        </div>

        {tab === 'receive' ? (
          <>
            <p className="text-text/60 text-sm mb-4 text-center">
              Scan this QR with MetaMask or any wallet to send MATIC to your Onyx wallet
            </p>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG
                  value={walletQR}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Wallet Address */}
            <div className="bg-background rounded-xl p-3 mb-4">
              <p className="text-text/50 text-xs mb-2 text-center">Your Wallet Address</p>
              <p className="font-mono text-xs break-all text-center select-all">
                {walletAddress}
              </p>
            </div>

            <button
              onClick={copyAddress}
              className="btn-secondary w-full mb-3"
            >
              {copied ? '✓ Copied!' : 'Copy Address'}
            </button>

            {/* Faucet link */}
            <a
              href="https://faucet.polygon.technology/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-center block"
            >
              Get Free Testnet MATIC →
            </a>

            <p className="text-text/40 text-xs mt-4 text-center">
              Make sure sender is on Polygon Amoy network (Chain ID: 80002)
            </p>
          </>
        ) : (
          <>
            <p className="text-text/60 text-sm mb-4">
              Add Polygon Amoy testnet to MetaMask to send/receive test MATIC
            </p>

            {/* Network details */}
            <div className="bg-background rounded-xl p-4 mb-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text/50">Network Name</span>
                <span className="font-medium">Polygon Amoy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text/50">Chain ID</span>
                <span className="font-mono">80002</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text/50">Currency</span>
                <span>MATIC</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text/50">RPC URL</span>
                <span className="font-mono text-xs break-all select-all">
                  https://rpc-amoy.polygon.technology
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text/50">Block Explorer</span>
                <span className="font-mono text-xs break-all select-all">
                  https://amoy.polygonscan.com
                </span>
              </div>
            </div>

            <button
              onClick={handleAddNetwork}
              className="btn-primary w-full mb-3"
            >
              🦊 Add to MetaMask
            </button>

            <p className="text-text/40 text-xs text-center">
              Click the button above if you have MetaMask installed, or add the network manually using the details above
            </p>
          </>
        )}
      </div>
    </div>
  );
}
