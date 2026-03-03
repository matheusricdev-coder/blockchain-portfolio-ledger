import type { Checkpoint } from '../entities/Checkpoint.js';

export interface ICheckpointRepository {
  getLastBlock(chainId: number): Promise<number>;
  save(checkpoint: Omit<Checkpoint, 'id' | 'updatedAt'>): Promise<void>;
}
