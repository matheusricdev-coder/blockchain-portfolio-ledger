import { NormalizeEventsUseCase } from '../../../src/application/use-cases/NormalizeEventsUseCase';
import type { IRawEventRepository } from '../../../src/domain/repositories/IRawEventRepository';
import type { ILedgerEntryRepository } from '../../../src/domain/repositories/ILedgerEntryRepository';
import type { ILogger } from '../../../src/shared/utils/ILogger';
import type { RawEvent } from '../../../src/domain/entities/RawEvent';

const makeRawEvent = (overrides: Partial<RawEvent> = {}): RawEvent => ({
  id: 'event-id-1',
  chainId: 11155111,
  blockNumber: 7000000,
  txHash: '0xabc',
  logIndex: 0,
  fromAddress: '0x1000000000000000000000000000000000000001',
  toAddress: '0x2000000000000000000000000000000000000002',
  tokenAddress: '0xtoken000000000000000000000000000000000000',
  amount: 1000n,
  createdAt: new Date(),
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

describe('NormalizeEventsUseCase', () => {
  let rawEventRepo: jest.Mocked<IRawEventRepository>;
  let ledgerEntryRepo: jest.Mocked<ILedgerEntryRepository>;
  let logger: ILogger;
  let useCase: NormalizeEventsUseCase;

  beforeEach(() => {
    rawEventRepo = {
      save: jest.fn(),
      findByEventId: jest.fn(),
      findUnprocessedEvents: jest.fn(),
    };
    ledgerEntryRepo = {
      saveMany: jest.fn(),
      sumByWallet: jest.fn(),
      findByWallet: jest.fn(),
    };
    logger = makeLogger();
    useCase = new NormalizeEventsUseCase(rawEventRepo, ledgerEntryRepo, logger);
  });

  it('should create a debit and a credit entry for a normal transfer', async () => {
    const event = makeRawEvent({ amount: 500n });
    rawEventRepo.findUnprocessedEvents.mockResolvedValue([event]);
    ledgerEntryRepo.saveMany.mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(result.processed).toBe(1);
    expect(result.entriesCreated).toBe(2);

    const savedEntries = ledgerEntryRepo.saveMany.mock.calls[0]?.[0];
    const debit = savedEntries?.find((e) => e.amount < 0n);
    const credit = savedEntries?.find((e) => e.amount > 0n);

    expect(debit?.walletAddress).toBe(event.fromAddress);
    expect(debit?.amount).toBe(-500n);
    expect(credit?.walletAddress).toBe(event.toAddress);
    expect(credit?.amount).toBe(500n);
  });

  it('should skip debit for mint events (fromAddress is zero address)', async () => {
    const event = makeRawEvent({
      fromAddress: '0x0000000000000000000000000000000000000000',
      amount: 200n,
    });
    rawEventRepo.findUnprocessedEvents.mockResolvedValue([event]);
    ledgerEntryRepo.saveMany.mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(result.entriesCreated).toBe(1);

    const savedEntries = ledgerEntryRepo.saveMany.mock.calls[0]?.[0];
    expect(savedEntries?.length).toBe(1);
    expect(savedEntries?.[0]?.amount).toBe(200n);
  });

  it('should skip credit for burn events (toAddress is zero address)', async () => {
    const event = makeRawEvent({
      toAddress: '0x0000000000000000000000000000000000000000',
      amount: 300n,
    });
    rawEventRepo.findUnprocessedEvents.mockResolvedValue([event]);
    ledgerEntryRepo.saveMany.mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(result.entriesCreated).toBe(1);

    const savedEntries = ledgerEntryRepo.saveMany.mock.calls[0]?.[0];
    expect(savedEntries?.length).toBe(1);
    expect(savedEntries?.[0]?.amount).toBe(-300n);
  });

  it('should return zero processed when there are no events', async () => {
    rawEventRepo.findUnprocessedEvents.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.processed).toBe(0);
    expect(result.entriesCreated).toBe(0);
    expect(ledgerEntryRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should process multiple events', async () => {
    const events = [makeRawEvent({ id: '1' }), makeRawEvent({ id: '2' })];
    rawEventRepo.findUnprocessedEvents.mockResolvedValue(events);
    ledgerEntryRepo.saveMany.mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(result.processed).toBe(2);
    expect(result.entriesCreated).toBe(4);
    expect(ledgerEntryRepo.saveMany).toHaveBeenCalledTimes(2);
  });
});
