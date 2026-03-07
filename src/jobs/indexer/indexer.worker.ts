import type { Worker } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../../infrastructure/queue/connection.js';
import type { IndexBlocksUseCase } from '../../application/use-cases/IndexBlocksUseCase.js';
import type { NormalizeEventsUseCase } from '../../application/use-cases/NormalizeEventsUseCase.js';
import type { ILogger } from '../../shared/utils/ILogger.js';

export interface IndexerJobData {
  chainId: number;
  fromBlock?: number;
  toBlock?: number;
  tokenAddress?: string;
}

export function createIndexerWorker(
  indexBlocksUseCase: IndexBlocksUseCase,
  normalizeEventsUseCase: NormalizeEventsUseCase,
  logger: ILogger,
): Worker<IndexerJobData, void> {
  const log = logger.child({ worker: 'indexer' });

  return createWorker<IndexerJobData, void>(QUEUE_NAMES.INDEXER, async (job) => {
    const { chainId, fromBlock, toBlock, tokenAddress } = job.data;

    log.info('Processing indexer job', { jobId: job.id, chainId, fromBlock, toBlock });

    await indexBlocksUseCase.execute({
      chainId,
      ...(fromBlock !== undefined ? { fromBlock } : {}),
      ...(toBlock !== undefined ? { toBlock } : {}),
      ...(tokenAddress !== undefined ? { tokenAddress: tokenAddress as `0x${string}` } : {}),
    });

    await normalizeEventsUseCase.execute();

    log.info('Indexer job completed', { jobId: job.id });
  });
}
