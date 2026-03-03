import { eq } from 'drizzle-orm';
import type { Database } from '../client.js';
import { checkpoints } from '../schema.js';
import type { ICheckpointRepository } from '../../../domain/repositories/ICheckpointRepository.js';
import type { Checkpoint } from '../../../domain/entities/Checkpoint.js';

export class DrizzleCheckpointRepository implements ICheckpointRepository {
  constructor(private readonly db: Database) {}

  async getLastBlock(chainId: number): Promise<number> {
    const rows = await this.db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.chainId, chainId))
      .limit(1);

    return rows[0]?.lastProcessedBlock ?? 0;
  }

  async save(checkpoint: Omit<Checkpoint, 'id' | 'updatedAt'>): Promise<void> {
    await this.db
      .insert(checkpoints)
      .values({
        chainId: checkpoint.chainId,
        lastProcessedBlock: checkpoint.lastProcessedBlock,
      })
      .onConflictDoUpdate({
        target: checkpoints.chainId,
        set: {
          lastProcessedBlock: checkpoint.lastProcessedBlock,
          updatedAt: new Date(),
        },
      });
  }
}
