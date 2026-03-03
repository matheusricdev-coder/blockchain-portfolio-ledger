import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.js';
import { rawEvents } from '../schema.js';
import type { IRawEventRepository } from '../../../domain/repositories/IRawEventRepository.js';
import type { RawEvent } from '../../../domain/entities/RawEvent.js';
import { EventId } from '../../../domain/value-objects/EventId.js';

export class DrizzleRawEventRepository implements IRawEventRepository {
  constructor(private readonly db: Database) {}

  async save(event: Omit<RawEvent, 'id' | 'createdAt'>): Promise<void> {
    await this.db
      .insert(rawEvents)
      .values({
        chainId: event.chainId,
        blockNumber: event.blockNumber,
        txHash: event.txHash,
        logIndex: event.logIndex,
        fromAddress: event.fromAddress,
        toAddress: event.toAddress,
        tokenAddress: event.tokenAddress,
        amount: event.amount.toString(),
      })
      .onConflictDoNothing();
  }

  async findByEventId(eventId: string): Promise<RawEvent | null> {
    const parsed = EventId.fromString(eventId);
    const [chainId, blockNumber, txHash, logIndex] = parsed.toString().split(':') as [
      string,
      string,
      string,
      string,
    ];

    const rows = await this.db
      .select()
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.chainId, Number(chainId)),
          eq(rawEvents.blockNumber, Number(blockNumber)),
          eq(rawEvents.txHash, txHash),
          eq(rawEvents.logIndex, Number(logIndex)),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async findUnprocessedEvents(limit = 100): Promise<RawEvent[]> {
    const rows = await this.db.select().from(rawEvents).limit(limit);
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: typeof rawEvents.$inferSelect): RawEvent {
    return {
      id: row.id,
      chainId: row.chainId,
      blockNumber: row.blockNumber,
      txHash: row.txHash,
      logIndex: row.logIndex,
      fromAddress: row.fromAddress,
      toAddress: row.toAddress,
      tokenAddress: row.tokenAddress,
      amount: BigInt(row.amount),
      createdAt: row.createdAt,
    };
  }
}
