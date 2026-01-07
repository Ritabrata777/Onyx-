import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData, defineChain } from 'viem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Polygon Amoy Testnet
export const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
});

// For testnet: show native MATIC balance
// For production: set to false and use USDC
const USE_NATIVE_MATIC = true;
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
const USDC_DECIMALS = 6;

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

// ERC20 ABI (minimal for transfer)
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export async function getUSDCBalance(address: string): Promise<string> {
  try {
    if (USE_NATIVE_MATIC) {
      // Get native MATIC balance for testnet
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      return formatUnits(balance, 18);
    }
    
    // USDC balance (for production)
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    }) as bigint;
    return formatUnits(balance, USDC_DECIMALS);
  } catch (error) {
    console.error('Failed to get balance:', error);
    return '0.00';
  }
}

export async function resolvePaymentId(paymentId: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/resolve/${paymentId}`);
  if (!res.ok) {
    throw new Error('Invalid payment ID');
  }
  const data = await res.json();
  return data.address;
}

export async function buildTransferUserOp(
  senderAddress: string,
  recipientAddress: string,
  amount: string
) {
  const decimals = USE_NATIVE_MATIC ? 18 : USDC_DECIMALS;
  const amountWei = parseUnits(amount, decimals);

  const callData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipientAddress as `0x${string}`, amountWei],
  });

  const res = await fetch(`${API_URL}/api/wallet/build-userop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: senderAddress,
      target: USDC_ADDRESS,
      callData,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to build UserOp');
  }

  return res.json();
}

export async function submitSignedUserOp(
  userOp: any,
  signature: {
    signature: string;
    authenticatorData: string;
    clientDataJSON: string;
  }
) {
  const res = await fetch(`${API_URL}/api/wallet/submit-userop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userOp,
      webauthnSignature: signature,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to submit transaction');
  }

  return res.json();
}

export function parseQRData(qrData: string): { paymentId: string; amount?: string } {
  try {
    const url = new URL(qrData);
    const to = url.searchParams.get('to') || '';
    const amount = url.searchParams.get('amount') || undefined;
    return { paymentId: to, amount };
  } catch {
    return { paymentId: qrData };
  }
}

export function generateQRData(paymentId: string, amount?: string): string {
  let url = `invisiblerail://pay?to=${paymentId}`;
  if (amount) {
    url += `&amount=${amount}`;
  }
  return url;
}
