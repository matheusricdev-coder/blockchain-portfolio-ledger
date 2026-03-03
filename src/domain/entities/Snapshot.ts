export interface Snapshot {
  readonly id: string;
  readonly walletAddress: string;
  readonly tokenAddress: string;
  readonly balance: bigint;
  readonly snapshotDate: Date;
}
