export interface RawEvent {
  readonly id: string;
  readonly chainId: number;
  readonly blockNumber: number;
  readonly txHash: string;
  readonly logIndex: number;
  readonly fromAddress: string;
  readonly toAddress: string;
  readonly tokenAddress: string;
  readonly amount: bigint;
  readonly createdAt: Date;
}
