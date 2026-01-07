import { Router } from 'express';
import { isAddress } from 'viem';
import { credentialStore } from '../services/store.js';

const router = Router();

// Resolve payment ID to wallet address
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // If it's already a valid address, return it
    if (isAddress(paymentId)) {
      return res.json({ address: paymentId, paymentId });
    }

    // Look up payment ID in MongoDB
    const credential = await credentialStore.findByPaymentId(paymentId);
    
    if (credential) {
      return res.json({
        address: credential.walletAddress,
        paymentId: credential.paymentId,
      });
    }

    res.status(404).json({ error: 'Payment ID not found' });
  } catch (error: any) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
