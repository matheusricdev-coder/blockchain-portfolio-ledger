import { IndexBlocksUseCase } from '../../../src/application/use-cases/IndexBlocksUseCase';
import type {
  IBlockchainClient,
  Erc20TransferLog,
} from '../../../src/domain/services/IBlockchainClient';
import type { IRawEventRepository } from '../../../src/domain/repositories/IRawEventRepository';
import type { ICheckpointRepository } from '../../../src/domain/repositories/ICheckpointRepository';
import type { ILogger } from '../../../src/shared/utils/ILogger';
import { InvalidBlockRangeError } from '../../../src/shared/errors/index';

const makeLog = (overrides: Partial<Erc20TransferLog> = {}): Erc20TransferLog => ({
  blockNumber: 100n,
  transactionHash: '0xaaaa',
  logIndex: 0,
  fromAddress: '0x1000000000000000000000000000000000000001',
  toAddress: '0x2000000000000000000000000000000000000002',
  tokenAddress: '0xtoken000000000000000000000000000000000000',
  amount: 1000n,
  ...overrides,
});

const makeLogger = (): ILogger => ({
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

describe('IndexBlocksUseCase', () => {
  let blockchainClient: jest.Mocked<IBlockchainClient>;
  let rawEventRepo: jest.Mocked<IRawEventRepository>;
  let checkpointRepo: jest.Mocked<ICheckpointRepository>;
  let logger: ILogger;
  let useCase: IndexBlocksUseCase;

  beforeEach(() => {
    blockchainClient = {
      getBlockNumber: jest.fn().mockResolvedValue(1000n),
      getErc20Logs: jest.fn().mockResolvedValue([]),
      getTokenBalance: jest.fn(),
    };
    rawEventRepo = {
      save: jest.fn(),
      findByEventId: jest.fn().mockResolvedValue(null),
      findUnprocessedEvents: jest.fn(),
    };
    checkpointRepo = {
      getLastBlock: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
    };
    logger = makeLogger();
    useCase = new IndexBlocksUseCase(blockchainClient, rawEventRepo, checkpointRepo, logger);
  });

  it('should throw InvalidBlockRangeError when fromBlock > toBlock', async () => {
    await expect(
      useCase.execute({ chainId: 1, fromBlock: 200, toBlock: 100 }),
    ).rejects.toBeInstanceOf(InvalidBlockRangeError);
  });

  it('should save new events and update checkpoint', async () => {
    const log = makeLog({ blockNumber: 100n, logIndex: 0 });
    blockchainClient.getErc20Logs.mockResolvedValue([log]);

    const result = await useCase.execute({ chainId: 1, fromBlock: 100, toBlock: 100 });

    expect(rawEventRepo.save).toHaveBeenCalledTimes(1);
    expect(result.savedEvents).toBe(1);
    expect(result.skippedEvents).toBe(0);
    expect(result.processedBlocks).toBe(1);
    expect(checkpointRepo.save).toHaveBeenCalledWith({ chainId: 1, lastProcessedBlock: 100 });
  });

  it('should skip duplicate events', async () => {
    const log = makeLog();
    blockchainClient.getErc20Logs.mockResolvedValue([log]);
    rawEventRepo.findByEventId.mockResolvedValue({
      id: 'existing',
      chainId: 1,
      blockNumber: 100,
      txHash: '0xaaaa',
      logIndex: 0,
      fromAddress: log.fromAddress,
      toAddress: log.toAddress,
      tokenAddress: log.tokenAddress,
      amount: log.amount,
      createdAt: new Date(),
    });

    const result = await useCase.execute({ chainId: 1, fromBlock: 100, toBlock: 100 });

    expect(rawEventRepo.save).not.toHaveBeenCalled();
    expect(result.skippedEvents).toBe(1);
    expect(result.savedEvents).toBe(0);
  });

  it('should split a large range into chunks of 10 blocks', async () => {
    // 30-block range should produce 3 calls: [0-9], [10-19], [20-29]
    const result = await useCase.execute({ chainId: 1, fromBlock: 0, toBlock: 29 });

    expect(blockchainClient.getErc20Logs).toHaveBeenCalledTimes(3);
    expect(blockchainClient.getErc20Logs).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fromBlock: 0n,
        toBlock: 9n,
      }),
    );
    expect(blockchainClient.getErc20Logs).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fromBlock: 10n,
        toBlock: 19n,
      }),
    );
    expect(blockchainClient.getErc20Logs).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        fromBlock: 20n,
        toBlock: 29n,
      }),
    );
    expect(result.processedBlocks).toBe(30);
  });

  it('should not chunk a range smaller than CHUNK_SIZE', async () => {
    await useCase.execute({ chainId: 1, fromBlock: 5, toBlock: 9 });

    expect(blockchainClient.getErc20Logs).toHaveBeenCalledTimes(1);
    expect(blockchainClient.getErc20Logs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 5n,
        toBlock: 9n,
      }),
    );
  });

  it('should use checkpoint last block + 1 when fromBlock is not provided', async () => {
    checkpointRepo.getLastBlock.mockResolvedValue(50);

    await useCase.execute({ chainId: 1, toBlock: 60 });

    expect(blockchainClient.getErc20Logs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 51n,
      }),
    );
  });

  it('should use latest chain block when toBlock is not provided', async () => {
    blockchainClient.getBlockNumber.mockResolvedValue(999n);

    await useCase.execute({ chainId: 1, fromBlock: 990 });

    expect(checkpointRepo.save).toHaveBeenCalledWith({ chainId: 1, lastProcessedBlock: 999 });
  });

  it('should accumulate saved events across multiple chunks', async () => {
    const log1 = makeLog({ blockNumber: 0n, logIndex: 0, transactionHash: '0xaaa1' });
    const log2 = makeLog({ blockNumber: 10n, logIndex: 0, transactionHash: '0xaaa2' });

    blockchainClient.getErc20Logs.mockResolvedValueOnce([log1]).mockResolvedValueOnce([log2]);

    const result = await useCase.execute({ chainId: 1, fromBlock: 0, toBlock: 19 });

    expect(result.savedEvents).toBe(2);
    expect(result.processedBlocks).toBe(20);
  });
});
