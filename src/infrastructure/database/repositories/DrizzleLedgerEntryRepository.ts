import { and, count, eq, lte, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { ledgerEntries } from '../schema.js';
import type {
  ILedgerEntryRepository,
  FindByWalletOptions,
  PagedResult,
} from '../../../domain/repositories/ILedgerEntryRepository.js';
import type { LedgerEntry } from '../../../domain/entities/LedgerEntry.js';

export class DrizzleLedgerEntryRepository implements ILedgerEntryRepository {
  constructor(private readonly db: Database) {}

  async saveMany(entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<void> {
    if (entries.length === 0) return;

    await this.db.insert(ledgerEntries).values(
      entries.map((e) => ({
        walletAddress: e.walletAddress,
        tokenAddress: e.tokenAddress,
        amount: e.amount.toString(),
        referenceEventId: e.referenceEventId,
      })),
    );
  }

  async sumByWallet(walletAddress: string, tokenAddress: string, until: Date): Promise<bigint> {
    const result = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${ledgerEntries.amount}::numeric), 0)` })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.walletAddress, walletAddress),
          eq(ledgerEntries.tokenAddress, tokenAddress),
          lte(ledgerEntries.createdAt, until),
        ),
      );

    return BigInt(result[0]?.total ?? '0');
  }

  async findByWallet(
    walletAddress: string,
    tokenAddress: string,
    options: FindByWalletOptions = {},
  ): Promise<PagedResult<LedgerEntry>> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const where = and(
      eq(ledgerEntries.walletAddress, walletAddress),
      eq(ledgerEntries.tokenAddress, tokenAddress),
    );

    const [rows, totalResult] = await Promise.all([
      this.db.select().from(ledgerEntries).where(where).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(ledgerEntries).where(where),
    ]);

    return {
      items: rows.map((r) => this.toDomain(r)),
      total: totalResult[0]?.total ?? 0,
      limit,
      offset,
    };
  }

  private toDomain(row: typeof ledgerEntries.$inferSelect): LedgerEntry {
    return {
      id: row.id,
      walletAddress: row.walletAddress,
      tokenAddress: row.tokenAddress,
      amount: BigInt(row.amount),
      referenceEventId: row.referenceEventId,
      createdAt: row.createdAt,
    };
  }
}
