import type { Worker } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../../infrastructure/queue/connection.js';
import type { ReconcileWalletUseCase } from '../../application/use-cases/ReconcileWalletUseCase.js';
import type { ILogger } from '../../shared/utils/ILogger.js';
import { ReconciliationError } from '../../shared/errors/index.js';

export interface ReconcilerJobData {
  walletAddress: string;
  tokenAddress: string;
}

export function createReconcilerWorker(
  reconcileWalletUseCase: ReconcileWalletUseCase,
  logger: ILogger,
): Worker<ReconcilerJobData, void> {
  const log = logger.child({ worker: 'reconciler' });

  return createWorker<ReconcilerJobData, void>(QUEUE_NAMES.RECONCILER, async (job) => {
    const { walletAddress, tokenAddress } = job.data;

    log.info('Processing reconciler job', { jobId: job.id, walletAddress, tokenAddress });

    try {
      await reconcileWalletUseCase.execute({
        walletAddress: walletAddress as `0x${string}`,
        tokenAddress: tokenAddress as `0x${string}`,
      });
      log.info('Reconciler job completed — balances match', { jobId: job.id });
    } catch (err) {
      if (err instanceof ReconciliationError) {
        // Log divergence but do not re-throw — BullMQ would retry indefinitely;
        // instead surface the result as a failed job for monitoring
        log.warn('Reconciler job found divergence', {
          jobId: job.id,
          error: err.message,
        });
        throw err;
      }
      throw err;
    }
  });
}
