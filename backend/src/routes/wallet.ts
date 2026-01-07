import { Router } from 'express';
import { buildUserOperation, submitUserOperation } from '../services/bundler.js';
import { credentialStore } from '../services/store.js';

const router = Router();

// Build UserOperation for a transaction
router.post('/build-userop', async (req, res) => {
  try {
    const { sender, target, callData } = req.body;

    if (!sender || !target || !callData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { userOp, userOpHash } = await buildUserOperation(sender, target, callData);

    res.json({ userOp, userOpHash });
  } catch (error: any) {
    console.error('Build UserOp error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit signed UserOperation
router.post('/submit-userop', async (req, res) => {
  try {
    const { userOp, webauthnSignature } = req.body;

    if (!userOp || !webauthnSignature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await submitUserOperation(userOp, webauthnSignature);

    res.json(result);
  } catch (error: any) {
    console.error('Submit UserOp error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get wallet info
router.get('/info/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Find credential by wallet address
    let walletInfo = null;
    for (const [, cred] of credentialStore.entries()) {
      if (cred.walletAddress === address) {
        walletInfo = {
          address: cred.walletAddress,
          paymentId: cred.paymentId,
        };
        break;
      }
    }

    if (!walletInfo) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(walletInfo);
  } catch (error: any) {
    console.error('Wallet info error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
