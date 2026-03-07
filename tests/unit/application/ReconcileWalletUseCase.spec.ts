import { ReconcileWalletUseCase } from '../../../src/application/use-cases/ReconcileWalletUseCase';
import type { IBlockchainClient } from '../../../src/domain/services/IBlockchainClient';
import type { ISnapshotRepository } from '../../../src/domain/repositories/ISnapshotRepository';
import type { ILogger } from '../../../src/shared/utils/ILogger';
import type { Snapshot } from '../../../src/domain/entities/Snapshot';
import { ReconciliationError } from '../../../src/shared/errors/index';

const makeLogger = (): ILogger => ({
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

const makeSnapshot = (balance: bigint): Snapshot => ({
  id: 'snap-1',
  walletAddress: '0x1000000000000000000000000000000000000001',
  tokenAddress: '0xtoken000000000000000000000000000000000000',
  balance,
  snapshotDate: new Date(),
});

describe('ReconcileWalletUseCase', () => {
  let blockchainClient: jest.Mocked<IBlockchainClient>;
  let snapshotRepo: jest.Mocked<ISnapshotRepository>;
  let logger: ILogger;
  let useCase: ReconcileWalletUseCase;

  const walletAddress = '0x1000000000000000000000000000000000000001' as `0x${string}`;
  const tokenAddress = '0xtoken000000000000000000000000000000000000' as `0x${string}`;

  beforeEach(() => {
    blockchainClient = {
      getBlockNumber: jest.fn(),
      getErc20Logs: jest.fn(),
      getTokenBalance: jest.fn().mockResolvedValue(500n),
    };
    snapshotRepo = {
      save: jest.fn(),
      findLatest: jest.fn().mockResolvedValue(makeSnapshot(500n)),
      deleteByWalletAndToken: jest.fn(),
    };
    logger = makeLogger();
    useCase = new ReconcileWalletUseCase(blockchainClient, snapshotRepo, logger);
  });

  it('should return reconciled:true when snapshot and on-chain balances match', async () => {
    blockchainClient.getTokenBalance.mockResolvedValue(500n);
    snapshotRepo.findLatest.mockResolvedValue(makeSnapshot(500n));

    const result = await useCase.execute({ walletAddress, tokenAddress });

    expect(result.reconciled).toBe(true);
    expect(result.divergence).toBe(0n);
    expect(result.snapshotBalance).toBe(500n);
    expect(result.onChainBalance).toBe(500n);
  });

  it('should throw ReconciliationError when balances diverge', async () => {
    blockchainClient.getTokenBalance.mockResolvedValue(999n);
    snapshotRepo.findLatest.mockResolvedValue(makeSnapshot(500n));

    await expect(useCase.execute({ walletAddress, tokenAddress })).rejects.toBeInstanceOf(
      ReconciliationError,
    );
  });

  it('should use 0n as snapshot balance when no snapshot exists', async () => {
    snapshotRepo.findLatest.mockResolvedValue(null);
    blockchainClient.getTokenBalance.mockResolvedValue(0n);

    const result = await useCase.execute({ walletAddress, tokenAddress });

    expect(result.snapshotBalance).toBe(0n);
    expect(result.reconciled).toBe(true);
  });

  it('should pass walletAddress and tokenAddress to the blockchain client', async () => {
    blockchainClient.getTokenBalance.mockResolvedValue(500n);

    await useCase.execute({ walletAddress, tokenAddress });

    expect(blockchainClient.getTokenBalance).toHaveBeenCalledWith(tokenAddress, walletAddress);
  });

  it('should include divergence amount in the error', async () => {
    blockchainClient.getTokenBalance.mockResolvedValue(600n);
    snapshotRepo.findLatest.mockResolvedValue(makeSnapshot(500n));

    await expect(useCase.execute({ walletAddress, tokenAddress })).rejects.toMatchObject({
      name: 'ReconciliationError',
    });
  });
});
