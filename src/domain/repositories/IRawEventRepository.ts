import type { RawEvent } from '../entities/RawEvent.js';

export interface IRawEventRepository {
  save(event: Omit<RawEvent, 'id' | 'createdAt'>): Promise<void>;
  findByEventId(eventId: string): Promise<RawEvent | null>;
  findUnprocessedEvents(limit?: number): Promise<RawEvent[]>;
}
