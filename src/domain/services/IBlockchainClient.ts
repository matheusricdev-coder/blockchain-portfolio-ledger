export interface IBlockchainClient {
  getBlockNumber(): Promise<bigint>;
  getErc20Logs(params: {
    fromBlock: bigint;
    toBlock: bigint;
    tokenAddress?: `0x${string}`;
  }): Promise<Erc20TransferLog[]>;
  getTokenBalance(tokenAddress: `0x${string}`, walletAddress: `0x${string}`): Promise<bigint>;
}

export interface Erc20TransferLog {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  amount: bigint;
}
