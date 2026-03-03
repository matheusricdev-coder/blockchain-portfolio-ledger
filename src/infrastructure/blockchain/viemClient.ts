import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { env } from '../../shared/config/env.js';
import type {
  IBlockchainClient,
  Erc20TransferLog,
} from '../../domain/services/IBlockchainClient.js';

const ERC20_TRANSFER_ABI = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function createViemClient(): IBlockchainClient {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(env.ALCHEMY_RPC_URL),
  });

  return {
    async getBlockNumber(): Promise<bigint> {
      return client.getBlockNumber();
    },

    async getErc20Logs({ fromBlock, toBlock, tokenAddress }): Promise<Erc20TransferLog[]> {
      const logs = await client.getLogs({
        event: ERC20_TRANSFER_ABI,
        address: tokenAddress,
        fromBlock,
        toBlock,
      });

      return logs
        .filter(
          (log) =>
            log.args.from != null &&
            log.args.to != null &&
            log.args.value != null &&
            log.transactionHash != null &&
            log.logIndex != null,
        )
        .map((log) => ({
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash as `0x${string}`,
          logIndex: log.logIndex as number,
          fromAddress: log.args.from as `0x${string}`,
          toAddress: log.args.to as `0x${string}`,
          tokenAddress: (tokenAddress ?? log.address) as `0x${string}`,
          amount: log.args.value as bigint,
        }));
    },

    async getTokenBalance(
      tokenAddress: `0x${string}`,
      walletAddress: `0x${string}`,
    ): Promise<bigint> {
      return client.readContract({
        address: tokenAddress,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
    },
  };
}

export const blockchainClient = createViemClient();
