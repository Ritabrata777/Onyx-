# 💎 Onyx

A non-custodial Web3 wallet where users pay in stablecoins using just biometrics — no seed phrases, no gas fees, no blockchain complexity.

## Overview

Onyx makes blockchain payments feel like traditional mobile payments through:

- **Zero Seed Phrases** — WebAuthn passkeys stored in your device's secure enclave
- **Zero Gas Management** — Paymaster sponsors all transaction fees
- **Zero Addresses** — Human-readable payment IDs (user@onyx)
- **Full Non-Custodial** — Your smart contract wallet, your keys

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│     QR Scanner  •  Passkey Auth  •  Payment Flow Components     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                   │
│   WebAuthn Verification  •  UserOp Builder  •  ID Resolution    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER (Polygon)                    │
│  ERC-4337 EntryPoint  •  Paymaster  •  Smart Contract Wallets   │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Polygon PoS |
| Account Abstraction | ERC-4337 |
| Authorization | WebAuthn / Passkeys |
| Stablecoin | USDC |
| Frontend | Next.js 14 + TypeScript |
| Backend | Node.js + Express |
| Bundler | Pimlico |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your Polygon RPC, Pimlico API key, etc.

# Run development server
npm run dev
```

## Project Structure

```
onyx/
├── frontend/           # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── lib/           # Utilities, hooks
├── backend/           # Express API server
│   ├── routes/        # API endpoints
│   └── services/      # Business logic
└── contracts/         # Solidity smart contracts
    ├── WebAuthnAccount.sol
    ├── Paymaster.sol
    └── P256Verifier.sol
```

## User Flow

**Create Account (30 seconds)**
1. Open app → "Create Account"
2. Device prompts for passkey creation (Face ID / Touch ID)
3. Smart contract wallet deployed in background
4. Get your payment ID: `username@onyx`

**Send Payment (10 seconds)**
1. Scan recipient's QR code
2. Confirm amount
3. Authenticate with biometric
4. Done — gas paid automatically

**Receive Payment**
1. Show your QR code
2. Sender scans and pays
3. Balance updates instantly

## Environment Variables

```env
# Blockchain
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CHAIN_ID=80002

# ERC-4337 Bundler (Pimlico)
PIMLICO_API_KEY=your_api_key
BUNDLER_URL=https://api.pimlico.io/v2/polygon-amoy/rpc?apikey=YOUR_KEY

# Paymaster
PAYMASTER_URL=https://api.pimlico.io/v2/polygon-amoy/rpc?apikey=YOUR_KEY

# Backend
JWT_SECRET=your_secret
PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

**Frontend:** Deploy to Vercel with root directory set to `frontend`

**Backend:** Deploy to any Node.js host (Railway, Render, HF Spaces)

## License

MIT
