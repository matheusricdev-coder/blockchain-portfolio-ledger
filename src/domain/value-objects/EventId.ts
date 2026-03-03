export class EventId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(chainId: number, blockNumber: number, txHash: string, logIndex: number): EventId {
    return new EventId(`${chainId}:${blockNumber}:${txHash}:${logIndex}`);
  }

  static fromString(value: string): EventId {
    const parts = value.split(':');
    if (parts.length !== 4) {
      throw new Error(
        `Invalid EventId format: "${value}". Expected chainId:blockNumber:txHash:logIndex`,
      );
    }
    return new EventId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: EventId): boolean {
    return this.value === other.value;
  }
}
