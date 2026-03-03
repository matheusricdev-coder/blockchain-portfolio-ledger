import { and, eq, desc } from 'drizzle-orm';
import type { Database } from '../client.js';
import { snapshots } from '../schema.js';
import type { ISnapshotRepository } from '../../../domain/repositories/ISnapshotRepository.js';
import type { Snapshot } from '../../../domain/entities/Snapshot.js';

export class DrizzleSnapshotRepository implements ISnapshotRepository {
  constructor(private readonly db: Database) {}

  async save(snapshot: Omit<Snapshot, 'id'>): Promise<void> {
    await this.db.insert(snapshots).values({
      walletAddress: snapshot.walletAddress,
      tokenAddress: snapshot.tokenAddress,
      balance: snapshot.balance.toString(),
      snapshotDate: snapshot.snapshotDate,
    });
  }

  async findLatest(walletAddress: string, tokenAddress: string): Promise<Snapshot | null> {
    const rows = await this.db
      .select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.walletAddress, walletAddress),
          eq(snapshots.tokenAddress, tokenAddress),
        ),
      )
      .orderBy(desc(snapshots.snapshotDate))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async deleteByWalletAndToken(walletAddress: string, tokenAddress: string): Promise<void> {
    await this.db
      .delete(snapshots)
      .where(
        and(
          eq(snapshots.walletAddress, walletAddress),
          eq(snapshots.tokenAddress, tokenAddress),
        ),
      );
  }

  private toDomain(row: typeof snapshots.$inferSelect): Snapshot {
    return {
      id: row.id,
      walletAddress: row.walletAddress,
      tokenAddress: row.tokenAddress,
      balance: BigInt(row.balance),
      snapshotDate: row.snapshotDate,
    };
  }
}
