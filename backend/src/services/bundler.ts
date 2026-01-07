import { createPublicClient, http, encodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters, defineChain } from 'viem';
import { getAccountNonce } from './account.js';

// Polygon Amoy Testnet
const polygonAmoy = defineChain({
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

const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const BUNDLER_URL = process.env.BUNDLER_URL || 'https://api.pimlico.io/v2/polygon-amoy/rpc';
const PAYMASTER_URL = process.env.PAYMASTER_URL || BUNDLER_URL;

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'),
});

// Simple Account execute ABI
const EXECUTE_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'func', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export async function buildUserOperation(
  sender: string,
  target: string,
  callData: string
): Promise<{ userOp: UserOperation; userOpHash: string }> {
  // Get nonce
  const nonce = await getAccountNonce(sender);

  // Encode execute call
  const executeCallData = encodeFunctionData({
    abi: EXECUTE_ABI,
    functionName: 'execute',
    args: [target as `0x${string}`, BigInt(0), callData as `0x${string}`],
  });

  // Get gas prices
  const feeData = await publicClient.estimateFeesPerGas();

  // Build UserOperation
  const userOp: UserOperation = {
    sender,
    nonce: `0x${nonce.toString(16)}`,
    initCode: '0x', // Account already deployed
    callData: executeCallData,
    callGasLimit: '0x50000', // 327680
    verificationGasLimit: '0x60000', // 393216
    preVerificationGas: '0xc000', // 49152
    maxFeePerGas: `0x${(feeData.maxFeePerGas || BigInt(50e9)).toString(16)}`,
    maxPriorityFeePerGas: `0x${(feeData.maxPriorityFeePerGas || BigInt(2e9)).toString(16)}`,
    paymasterAndData: '0x', // Will be filled by paymaster
    signature: '0x', // Placeholder
  };

  // Get paymaster sponsorship (gasless tx)
  try {
    const paymasterData = await getPaymasterData(userOp);
    userOp.paymasterAndData = paymasterData;
  } catch (error) {
    console.log('Paymaster not available, user will pay gas');
  }

  // Calculate UserOp hash
  const userOpHash = calculateUserOpHash(userOp);

  return { userOp, userOpHash };
}

async function getPaymasterData(userOp: UserOperation): Promise<string> {
  // Call Pimlico paymaster API
  const response = await fetch(PAYMASTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_sponsorUserOperation',
      params: [userOp, ENTRYPOINT_ADDRESS],
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result.paymasterAndData;
}

function calculateUserOpHash(userOp: UserOperation): string {
  // Pack UserOp for hashing (simplified)
  const packed = encodeAbiParameters(
    parseAbiParameters('address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32'),
    [
      userOp.sender as `0x${string}`,
      BigInt(userOp.nonce),
      keccak256(userOp.initCode as `0x${string}`),
      keccak256(userOp.callData as `0x${string}`),
      BigInt(userOp.callGasLimit),
      BigInt(userOp.verificationGasLimit),
      BigInt(userOp.preVerificationGas),
      BigInt(userOp.maxFeePerGas),
      BigInt(userOp.maxPriorityFeePerGas),
      keccak256(userOp.paymasterAndData as `0x${string}`),
    ]
  );

  const userOpHash = keccak256(packed);

  // Hash with entrypoint and chainId
  const finalHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters('bytes32, address, uint256'),
      [userOpHash, ENTRYPOINT_ADDRESS as `0x${string}`, BigInt(80002)] // Polygon Amoy chainId
    )
  );

  return finalHash;
}

export async function submitUserOperation(
  userOp: UserOperation,
  webauthnSignature: {
    signature: string;
    authenticatorData: string;
    clientDataJSON: string;
  }
): Promise<{ transactionHash: string; userOpHash: string }> {
  // Encode WebAuthn signature for on-chain verification
  const encodedSignature = encodeWebAuthnSignature(webauthnSignature);
  userOp.signature = encodedSignature;

  // Submit to bundler
  const response = await fetch(BUNDLER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendUserOperation',
      params: [userOp, ENTRYPOINT_ADDRESS],
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  const userOpHash = data.result;

  // Wait for transaction to be mined
  const txHash = await waitForUserOpReceipt(userOpHash);

  return { transactionHash: txHash, userOpHash };
}

function encodeWebAuthnSignature(sig: {
  signature: string;
  authenticatorData: string;
  clientDataJSON: string;
}): string {
  // Encode signature components for on-chain P-256 verification
  // Format: authenticatorData || clientDataJSON || signature
  return encodeAbiParameters(
    parseAbiParameters('bytes, bytes, bytes'),
    [
      sig.authenticatorData as `0x${string}`,
      sig.clientDataJSON as `0x${string}`,
      sig.signature as `0x${string}`,
    ]
  );
}

async function waitForUserOpReceipt(userOpHash: string): Promise<string> {
  const maxAttempts = 30;
  const delay = 2000; // 2 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(BUNDLER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getUserOperationReceipt',
        params: [userOpHash],
      }),
    });

    const data = await response.json();
    if (data.result) {
      return data.result.receipt.transactionHash;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error('Transaction not confirmed in time');
}
