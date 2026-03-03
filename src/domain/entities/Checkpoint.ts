export interface Checkpoint {
  readonly id: string;
  readonly chainId: number;
  readonly lastProcessedBlock: number;
  readonly updatedAt: Date;
}
