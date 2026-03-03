import { DomainError } from './DomainError.js';

export class DuplicateEventError extends DomainError {
  constructor(eventId: string) {
    super(`Event already exists: ${eventId}`, 'DuplicateEventError');
  }
}

export class EventNotFoundError extends DomainError {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`, 'EventNotFoundError');
  }
}

export class ReconciliationError extends DomainError {
  constructor(wallet: string, token: string, expected: bigint, actual: bigint) {
    super(
      `Reconciliation failed for wallet ${wallet} token ${token}: expected ${expected}, got ${actual}`,
      'ReconciliationError',
    );
  }
}

export class InvalidBlockRangeError extends DomainError {
  constructor(fromBlock: number, toBlock: number) {
    super(
      `Invalid block range: fromBlock (${fromBlock}) must be <= toBlock (${toBlock})`,
      'InvalidBlockRangeError',
    );
  }
}

export { DomainError };
