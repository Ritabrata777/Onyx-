import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function registerPasskey(username: string) {
  // Get registration options from server
  const optionsRes = await fetch(`${API_URL}/api/auth/register/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!optionsRes.ok) {
    throw new Error('Failed to get registration options');
  }

  const options: PublicKeyCredentialCreationOptionsJSON = await optionsRes.json();

  // Start WebAuthn registration (triggers biometric prompt)
  const credential = await startRegistration(options);

  // Verify registration with server
  const verifyRes = await fetch(`${API_URL}/api/auth/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      credential,
    }),
  });

  if (!verifyRes.ok) {
    throw new Error('Failed to verify registration');
  }

  return verifyRes.json();
}

export async function authenticatePasskey(credentialId?: string) {
  // Get authentication options from server
  const optionsRes = await fetch(`${API_URL}/api/auth/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialId }),
  });

  if (!optionsRes.ok) {
    throw new Error('Failed to get authentication options');
  }

  const options: PublicKeyCredentialRequestOptionsJSON = await optionsRes.json();

  // Start WebAuthn authentication (triggers biometric prompt)
  const credential = await startAuthentication(options);

  // Verify authentication with server
  const verifyRes = await fetch(`${API_URL}/api/auth/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!verifyRes.ok) {
    throw new Error('Authentication failed');
  }

  return verifyRes.json();
}

export async function signTransaction(
  credentialId: string,
  userOpHash: string
) {
  // Get signing challenge from server
  const challengeRes = await fetch(`${API_URL}/api/auth/sign/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialId, userOpHash }),
  });

  if (!challengeRes.ok) {
    throw new Error('Failed to get signing challenge');
  }

  const options: PublicKeyCredentialRequestOptionsJSON = await challengeRes.json();

  // Sign with passkey (triggers biometric prompt)
  const assertion = await startAuthentication(options);

  return {
    signature: assertion.response.signature,
    authenticatorData: assertion.response.authenticatorData,
    clientDataJSON: assertion.response.clientDataJSON,
  };
}
