import type { LedgerEntry } from '../entities/LedgerEntry.js';

export interface ILedgerEntryRepository {
  saveMany(entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<void>;
  sumByWallet(walletAddress: string, tokenAddress: string, until: Date): Promise<bigint>;
  findByWallet(walletAddress: string, tokenAddress: string): Promise<LedgerEntry[]>;
}
