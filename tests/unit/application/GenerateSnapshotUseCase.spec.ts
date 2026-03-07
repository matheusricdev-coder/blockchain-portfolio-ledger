import { GenerateSnapshotUseCase } from '../../../src/application/use-cases/GenerateSnapshotUseCase';
import type { ILedgerEntryRepository } from '../../../src/domain/repositories/ILedgerEntryRepository';
import type { ISnapshotRepository } from '../../../src/domain/repositories/ISnapshotRepository';
import type { ILogger } from '../../../src/shared/utils/ILogger';

const makeLogger = (): ILogger => ({
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

describe('GenerateSnapshotUseCase', () => {
  let ledgerEntryRepo: jest.Mocked<ILedgerEntryRepository>;
  let snapshotRepo: jest.Mocked<ISnapshotRepository>;
  let logger: ILogger;
  let useCase: GenerateSnapshotUseCase;

  const walletAddress = '0x1000000000000000000000000000000000000001';
  const tokenAddress = '0xtoken000000000000000000000000000000000000';

  beforeEach(() => {
    ledgerEntryRepo = {
      saveMany: jest.fn(),
      sumByWallet: jest.fn().mockResolvedValue(500n),
      findByWallet: jest.fn(),
    };
    snapshotRepo = {
      save: jest.fn(),
      findLatest: jest.fn(),
      deleteByWalletAndToken: jest.fn(),
    };
    logger = makeLogger();
    useCase = new GenerateSnapshotUseCase(ledgerEntryRepo, snapshotRepo, logger);
  });

  it('should generate a snapshot with the summed ledger balance', async () => {
    ledgerEntryRepo.sumByWallet.mockResolvedValue(1234n);

    const result = await useCase.execute({ walletAddress, tokenAddress });

    expect(result.balance).toBe(1234n);
    expect(result.walletAddress).toBe(walletAddress);
    expect(result.tokenAddress).toBe(tokenAddress);
  });

  it('should persist the snapshot via snapshotRepository', async () => {
    ledgerEntryRepo.sumByWallet.mockResolvedValue(999n);

    await useCase.execute({ walletAddress, tokenAddress });

    expect(snapshotRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddress,
        tokenAddress,
        balance: 999n,
      }),
    );
  });

  it('should use the provided snapshotDate', async () => {
    const fixedDate = new Date('2026-01-01T00:00:00.000Z');

    const result = await useCase.execute({ walletAddress, tokenAddress, snapshotDate: fixedDate });

    expect(result.snapshotDate).toBe(fixedDate);
    expect(ledgerEntryRepo.sumByWallet).toHaveBeenCalledWith(
      walletAddress,
      tokenAddress,
      fixedDate,
    );
  });

  it('should default snapshotDate to now when not provided', async () => {
    const before = new Date();
    const result = await useCase.execute({ walletAddress, tokenAddress });
    const after = new Date();

    expect(result.snapshotDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.snapshotDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle zero balance', async () => {
    ledgerEntryRepo.sumByWallet.mockResolvedValue(0n);

    const result = await useCase.execute({ walletAddress, tokenAddress });

    expect(result.balance).toBe(0n);
    expect(snapshotRepo.save).toHaveBeenCalled();
  });
});
