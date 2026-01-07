import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  paymentId: string | null;
  balance: string;
  credentialId: string | null;
  
  setWallet: (address: string, paymentId: string, credentialId: string) => void;
  setBalance: (balance: string) => void;
  logout: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      walletAddress: null,
      paymentId: null,
      balance: '0.00',
      credentialId: null,

      setWallet: (address, paymentId, credentialId) =>
        set({
          isAuthenticated: true,
          walletAddress: address,
          paymentId,
          credentialId,
        }),

      setBalance: (balance) => set({ balance }),

      logout: () =>
        set({
          isAuthenticated: false,
          walletAddress: null,
          paymentId: null,
          balance: '0.00',
          credentialId: null,
        }),
    }),
    {
      name: 'invisible-rail-wallet',
    }
  )
);
