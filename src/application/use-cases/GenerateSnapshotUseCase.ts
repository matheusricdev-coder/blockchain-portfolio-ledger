import type { ILedgerEntryRepository } from '../../domain/repositories/ILedgerEntryRepository.js';
import type { ISnapshotRepository } from '../../domain/repositories/ISnapshotRepository.js';
import type { ILogger } from '../../shared/utils/ILogger.js';

export interface GenerateSnapshotInput {
  walletAddress: string;
  tokenAddress: string;
  snapshotDate?: Date;
}

export interface GenerateSnapshotOutput {
  walletAddress: string;
  tokenAddress: string;
  balance: bigint;
  snapshotDate: Date;
}

export class GenerateSnapshotUseCase {
  constructor(
    private readonly ledgerEntryRepository: ILedgerEntryRepository,
    private readonly snapshotRepository: ISnapshotRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: GenerateSnapshotInput): Promise<GenerateSnapshotOutput> {
    const log = this.logger.child({ useCase: 'GenerateSnapshot', wallet: input.walletAddress });

    const snapshotDate = input.snapshotDate ?? new Date();

    log.info('Generating snapshot', { tokenAddress: input.tokenAddress, snapshotDate });

    const balance = await this.ledgerEntryRepository.sumByWallet(
      input.walletAddress,
      input.tokenAddress,
      snapshotDate,
    );

    await this.snapshotRepository.save({
      walletAddress: input.walletAddress,
      tokenAddress: input.tokenAddress,
      balance,
      snapshotDate,
    });

    log.info('Snapshot generated', { balance: balance.toString() });

    return {
      walletAddress: input.walletAddress,
      tokenAddress: input.tokenAddress,
      balance,
      snapshotDate,
    };
  }
}
