import { getDB } from './db.js';

// User interface
export interface User {
  id: string;
  username: string;
  currentChallenge?: string;
  walletAddress?: string;
  paymentId?: string;
  credentialId?: string;
  createdAt: Date;
}

// Credential interface
export interface Credential {
  id: string;
  visibleId: string;
  publicKey: string; // Base64 encoded
  counter: number;
  userId: string;
  walletAddress: string;
  paymentId: string;
  createdAt: Date;
}

// User operations
export const userStore = {
  async get(username: string): Promise<User | null> {
    const db = await getDB();
    return db.collection<User>('users').findOne({ username });
  },

  async set(username: string, user: User): Promise<void> {
    const db = await getDB();
    await db.collection<User>('users').updateOne(
      { username },
      { $set: { ...user, updatedAt: new Date() } },
      { upsert: true }
    );
  },

  async delete(username: string): Promise<void> {
    const db = await getDB();
    await db.collection('users').deleteOne({ username });
  }
};

// Credential operations
export const credentialStore = {
  async get(credentialId: string): Promise<Credential | null> {
    const db = await getDB();
    return db.collection<Credential>('credentials').findOne({ visibleId: credentialId });
  },

  async set(credentialId: string, credential: Credential): Promise<void> {
    const db = await getDB();
    await db.collection<Credential>('credentials').updateOne(
      { visibleId: credentialId },
      { $set: { ...credential, updatedAt: new Date() } },
      { upsert: true }
    );
  },

  async findByPaymentId(paymentId: string): Promise<Credential | null> {
    const db = await getDB();
    return db.collection<Credential>('credentials').findOne({ paymentId });
  },

  async findByWalletAddress(address: string): Promise<Credential | null> {
    const db = await getDB();
    return db.collection<Credential>('credentials').findOne({ walletAddress: address });
  },

  // For iterating (used in resolve)
  async findAll(): Promise<Credential[]> {
    const db = await getDB();
    return db.collection<Credential>('credentials').find({}).toArray();
  }
};
