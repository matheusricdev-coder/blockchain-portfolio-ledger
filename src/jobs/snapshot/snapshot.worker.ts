import type { Worker } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../../infrastructure/queue/connection.js';
import type { GenerateSnapshotUseCase } from '../../application/use-cases/GenerateSnapshotUseCase.js';
import type { ILogger } from '../../shared/utils/ILogger.js';

export interface SnapshotJobData {
  walletAddress: string;
  tokenAddress: string;
  snapshotDate?: string; // ISO string
}

export function createSnapshotWorker(
  generateSnapshotUseCase: GenerateSnapshotUseCase,
  logger: ILogger,
): Worker<SnapshotJobData, void> {
  const log = logger.child({ worker: 'snapshot' });

  return createWorker<SnapshotJobData, void>(QUEUE_NAMES.SNAPSHOT, async (job) => {
    const { walletAddress, tokenAddress, snapshotDate } = job.data;

    log.info('Processing snapshot job', { jobId: job.id, walletAddress, tokenAddress });

    await generateSnapshotUseCase.execute({
      walletAddress,
      tokenAddress,
      ...(snapshotDate !== undefined ? { snapshotDate: new Date(snapshotDate) } : {}),
    });

    log.info('Snapshot job completed', { jobId: job.id });
  });
}
