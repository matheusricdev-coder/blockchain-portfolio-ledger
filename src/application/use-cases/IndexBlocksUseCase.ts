import type { IBlockchainClient } from '../../domain/services/IBlockchainClient.js';
import type { IRawEventRepository } from '../../domain/repositories/IRawEventRepository.js';
import type { ICheckpointRepository } from '../../domain/repositories/ICheckpointRepository.js';
import type { ILogger } from '../../shared/utils/ILogger.js';
import { EventId } from '../../domain/value-objects/EventId.js';
import { InvalidBlockRangeError } from '../../shared/errors/index.js';

export interface IndexBlocksInput {
  chainId: number;
  fromBlock?: number;
  toBlock?: number;
  tokenAddress?: `0x${string}`;
}

export interface IndexBlocksOutput {
  processedBlocks: number;
  savedEvents: number;
  skippedEvents: number;
}

export class IndexBlocksUseCase {
  constructor(
    private readonly blockchainClient: IBlockchainClient,
    private readonly rawEventRepository: IRawEventRepository,
    private readonly checkpointRepository: ICheckpointRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: IndexBlocksInput): Promise<IndexBlocksOutput> {
    const log = this.logger.child({ useCase: 'IndexBlocks', chainId: input.chainId });

    const latestBlock = Number(await this.blockchainClient.getBlockNumber());
    const fromBlock =
      input.fromBlock ?? (await this.checkpointRepository.getLastBlock(input.chainId)) + 1;
    const toBlock = input.toBlock ?? latestBlock;

    if (fromBlock > toBlock) {
      throw new InvalidBlockRangeError(fromBlock, toBlock);
    }

    log.info('Indexing blocks', { fromBlock, toBlock });

    const logs = await this.blockchainClient.getErc20Logs({
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
      ...(input.tokenAddress !== undefined ? { tokenAddress: input.tokenAddress } : {}),
    });

    log.info('Fetched ERC-20 Transfer logs', { count: logs.length });

    let savedEvents = 0;
    let skippedEvents = 0;

    for (const log_ of logs) {
      const eventId = EventId.create(
        input.chainId,
        Number(log_.blockNumber),
        log_.transactionHash,
        log_.logIndex,
      );

      const existing = await this.rawEventRepository.findByEventId(eventId.toString());
      if (existing) {
        skippedEvents++;
        continue;
      }

      await this.rawEventRepository.save({
        chainId: input.chainId,
        blockNumber: Number(log_.blockNumber),
        txHash: log_.transactionHash,
        logIndex: log_.logIndex,
        fromAddress: log_.fromAddress,
        toAddress: log_.toAddress,
        tokenAddress: log_.tokenAddress,
        amount: log_.amount,
      });

      savedEvents++;
    }

    await this.checkpointRepository.save({ chainId: input.chainId, lastProcessedBlock: toBlock });

    log.info('Indexing complete', { savedEvents, skippedEvents, processedBlocks: toBlock - fromBlock + 1 });

    return {
      processedBlocks: toBlock - fromBlock + 1,
      savedEvents,
      skippedEvents,
    };
  }
}
