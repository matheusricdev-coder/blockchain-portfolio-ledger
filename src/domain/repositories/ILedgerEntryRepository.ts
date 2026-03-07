import type { LedgerEntry } from '../entities/LedgerEntry.js';

export interface FindByWalletOptions {
  limit?: number;
  offset?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ILedgerEntryRepository {
  saveMany(entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<void>;
  sumByWallet(walletAddress: string, tokenAddress: string, until: Date): Promise<bigint>;
  findByWallet(
    walletAddress: string,
    tokenAddress: string,
    options?: FindByWalletOptions,
  ): Promise<PagedResult<LedgerEntry>>;
}
