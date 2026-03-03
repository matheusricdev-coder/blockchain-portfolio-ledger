import type { IBlockchainClient } from '../../domain/services/IBlockchainClient.js';
import type { ISnapshotRepository } from '../../domain/repositories/ISnapshotRepository.js';
import type { ILogger } from '../../shared/utils/ILogger.js';
import { ReconciliationError } from '../../shared/errors/index.js';

export interface ReconcileWalletInput {
  walletAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
}

export interface ReconcileWalletOutput {
  walletAddress: string;
  tokenAddress: string;
  snapshotBalance: bigint;
  onChainBalance: bigint;
  divergence: bigint;
  reconciled: boolean;
}

export class ReconcileWalletUseCase {
  constructor(
    private readonly blockchainClient: IBlockchainClient,
    private readonly snapshotRepository: ISnapshotRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: ReconcileWalletInput): Promise<ReconcileWalletOutput> {
    const log = this.logger.child({
      useCase: 'ReconcileWallet',
      wallet: input.walletAddress,
      token: input.tokenAddress,
    });

    log.info('Starting reconciliation');

    const snapshot = await this.snapshotRepository.findLatest(
      input.walletAddress,
      input.tokenAddress,
    );

    const snapshotBalance = snapshot?.balance ?? 0n;

    const onChainBalance = await this.blockchainClient.getTokenBalance(
      input.tokenAddress,
      input.walletAddress,
    );

    const divergence = onChainBalance - snapshotBalance;
    const reconciled = divergence === 0n;

    if (!reconciled) {
      log.warn('Reconciliation divergence detected', {
        snapshotBalance: snapshotBalance.toString(),
        onChainBalance: onChainBalance.toString(),
        divergence: divergence.toString(),
      });

      throw new ReconciliationError(
        input.walletAddress,
        input.tokenAddress,
        snapshotBalance,
        onChainBalance,
      );
    }

    log.info('Reconciliation successful', { balance: onChainBalance.toString() });

    return {
      walletAddress: input.walletAddress,
      tokenAddress: input.tokenAddress,
      snapshotBalance,
      onChainBalance,
      divergence,
      reconciled,
    };
  }
}
