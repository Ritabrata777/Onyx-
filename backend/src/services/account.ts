import { createPublicClient, http, defineChain, keccak256 } from 'viem';

// Polygon Amoy Testnet
const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  testnet: true,
});

const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const SIMPLE_ACCOUNT_FACTORY = process.env.SIMPLE_ACCOUNT_FACTORY || '0xfddFeDd3DbC2a5210729406E508f383d2Ab60575';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'),
});

// Factory ABI for creating accounts
const FACTORY_ABI = [
  {
    name: 'createAccount',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'bytes' }, // WebAuthn public key
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: 'account', type: 'address' }],
  },
  {
    name: 'getAddress',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'bytes' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export async function deploySmartAccount(publicKeyHex: string): Promise<string> {
  // For demo: compute counterfactual address
  // In production, this would interact with the actual factory contract

  const salt = BigInt(0);
  const publicKeyBytes = `0x${publicKeyHex}` as `0x${string}`;

  try {
    // Try to get the counterfactual address from factory
    const address = (await publicClient.readContract({
      address: SIMPLE_ACCOUNT_FACTORY as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'getAddress',
      args: [publicKeyBytes, salt],
    })) as `0x${string}`;

    return address;
  } catch (error) {
    // Fallback: generate deterministic address from public key
    // This is a simplified version for demo purposes
    const hash = keccak256(publicKeyBytes);
    const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
    const address = (`0x${clean.slice(-40)}`) as `0x${string}`;
    console.log('Generated counterfactual address:', address);
    return address;
  }
}

export async function getAccountNonce(address: string): Promise<bigint> {
  try {
    const nonce = await publicClient.readContract({
      address: ENTRYPOINT_ADDRESS as `0x${string}`,
      abi: [
        {
          name: 'getNonce',
          type: 'function',
          inputs: [
            { name: 'sender', type: 'address' },
            { name: 'key', type: 'uint192' },
          ],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'getNonce',
      args: [address as `0x${string}`, BigInt(0)],
    });

    // Normalize return type to bigint
    if (typeof nonce === 'bigint') return nonce;
    if (typeof nonce === 'string') return BigInt(nonce);
    try {
      return BigInt(nonce as any);
    } catch {
      return BigInt(0);
    }
  } catch {
    return BigInt(0);
  }
}
