export interface LedgerEntry {
  readonly id: string;
  readonly walletAddress: string;
  readonly tokenAddress: string;
  /** Positive for credit (incoming), negative for debit (outgoing) */
  readonly amount: bigint;
  readonly referenceEventId: string;
  readonly createdAt: Date;
}
