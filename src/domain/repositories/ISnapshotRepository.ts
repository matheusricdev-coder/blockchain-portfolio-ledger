import type { Snapshot } from '../entities/Snapshot.js';

export interface ISnapshotRepository {
  save(snapshot: Omit<Snapshot, 'id'>): Promise<void>;
  findLatest(walletAddress: string, tokenAddress: string): Promise<Snapshot | null>;
  deleteByWalletAndToken(walletAddress: string, tokenAddress: string): Promise<void>;
}
