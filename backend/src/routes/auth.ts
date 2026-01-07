import { Router } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';
import { deploySmartAccount } from '../services/account.js';
import { userStore, credentialStore, User, Credential } from '../services/store.js';

const router = Router();

const RP_NAME = 'InvisibleRail';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

// Temporary challenge storage (in production, use Redis or DB)
const challengeStore = new Map<string, string>();

// Registration: Get options
router.post('/register/options', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Check if username exists
    const existingUser = await userStore.get(username);
    if (existingUser?.walletAddress) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const userId = uuidv4();

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userId,
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
    });

    // Store user and challenge
    const user: User = {
      id: userId,
      username,
      currentChallenge: options.challenge,
      createdAt: new Date(),
    };
    await userStore.set(username, user);
    challengeStore.set(username, options.challenge);

    res.json(options);
  } catch (error: any) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registration: Verify
router.post('/register/verify', async (req, res) => {
  try {
    const { username, credential } = req.body;

    const user = await userStore.get(username);
    const challenge = challengeStore.get(username);
    
    if (!user || !challenge) {
      return res.status(400).json({ error: 'Registration not initiated' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Deploy smart contract wallet
    const publicKeyHex = Buffer.from(credentialPublicKey).toString('hex');
    const walletAddress = await deploySmartAccount(publicKeyHex);

    const paymentId = `${username}@invisiblerail`;
    const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');

    // Store credential in MongoDB
    const cred: Credential = {
      id: uuidv4(),
      visibleId: credentialIdBase64,
      publicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      userId: user.id,
      walletAddress,
      paymentId,
      createdAt: new Date(),
    };
    await credentialStore.set(credentialIdBase64, cred);

    // Update user in MongoDB
    user.walletAddress = walletAddress;
    user.paymentId = paymentId;
    user.credentialId = credentialIdBase64;
    user.currentChallenge = undefined;
    await userStore.set(username, user);

    // Clean up challenge
    challengeStore.delete(username);

    res.json({
      verified: true,
      walletAddress,
      paymentId,
      credentialId: credentialIdBase64,
    });
  } catch (error: any) {
    console.error('Registration verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication: Get options
router.post('/login/options', async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'required',
    });

    // Store challenge temporarily
    challengeStore.set('auth_challenge', options.challenge);

    res.json(options);
  } catch (error: any) {
    console.error('Auth options error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication: Verify
router.post('/login/verify', async (req, res) => {
  try {
    const { credential } = req.body;

    const credentialIdBase64 = credential.id;
    const storedCredential = await credentialStore.get(credentialIdBase64);

    if (!storedCredential) {
      return res.status(400).json({ error: 'Unknown credential' });
    }

    const challenge = challengeStore.get('auth_challenge');
    if (!challenge) {
      return res.status(400).json({ error: 'No auth challenge found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(credentialIdBase64, 'base64url'),
        credentialPublicKey: Buffer.from(storedCredential.publicKey, 'base64'),
        counter: storedCredential.counter,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Authentication failed' });
    }

    // Update counter in MongoDB
    storedCredential.counter = verification.authenticationInfo.newCounter;
    await credentialStore.set(credentialIdBase64, storedCredential);

    // Clean up
    challengeStore.delete('auth_challenge');

    res.json({
      verified: true,
      walletAddress: storedCredential.walletAddress,
      paymentId: storedCredential.paymentId,
      credentialId: credentialIdBase64,
    });
  } catch (error: any) {
    console.error('Auth verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sign transaction: Get options
router.post('/sign/options', async (req, res) => {
  try {
    const { credentialId, userOpHash } = req.body;

    const storedCredential = await credentialStore.get(credentialId);
    if (!storedCredential) {
      return res.status(400).json({ error: 'Unknown credential' });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'required',
      challenge: userOpHash,
      allowCredentials: [
        {
          id: Buffer.from(credentialId, 'base64url'),
          type: 'public-key',
        },
      ],
    });

    res.json(options);
  } catch (error: any) {
    console.error('Sign options error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
