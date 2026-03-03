import type { IRawEventRepository } from '../../domain/repositories/IRawEventRepository.js';
import type { ILedgerEntryRepository } from '../../domain/repositories/ILedgerEntryRepository.js';
import type { ILogger } from '../../shared/utils/ILogger.js';

export interface NormalizeEventsOutput {
  processed: number;
  entriesCreated: number;
}

export class NormalizeEventsUseCase {
  constructor(
    private readonly rawEventRepository: IRawEventRepository,
    private readonly ledgerEntryRepository: ILedgerEntryRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(): Promise<NormalizeEventsOutput> {
    const log = this.logger.child({ useCase: 'NormalizeEvents' });

    const events = await this.rawEventRepository.findUnprocessedEvents(500);
    log.info('Normalizing raw events', { count: events.length });

    let entriesCreated = 0;

    for (const event of events) {
      const entries = [];

      // Debit from sender (negative amount)
      if (event.fromAddress !== '0x0000000000000000000000000000000000000000') {
        entries.push({
          walletAddress: event.fromAddress,
          tokenAddress: event.tokenAddress,
          amount: -event.amount,
          referenceEventId: event.id,
        });
      }

      // Credit to receiver (positive amount)
      if (event.toAddress !== '0x0000000000000000000000000000000000000000') {
        entries.push({
          walletAddress: event.toAddress,
          tokenAddress: event.tokenAddress,
          amount: event.amount,
          referenceEventId: event.id,
        });
      }

      await this.ledgerEntryRepository.saveMany(entries);
      entriesCreated += entries.length;
    }

    log.info('Normalization complete', { processed: events.length, entriesCreated });

    return { processed: events.length, entriesCreated };
  }
}
