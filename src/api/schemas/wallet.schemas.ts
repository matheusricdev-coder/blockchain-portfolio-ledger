import { z } from 'zod';

export const walletParamsSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export const tokenQuerySchema = z.object({
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address'),
});

export const reprocessBodySchema = z.object({
  fromBlock: z.number().int().nonnegative(),
  toBlock: z.number().int().nonnegative(),
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
});

export type WalletParams = z.infer<typeof walletParamsSchema>;
export type TokenQuery = z.infer<typeof tokenQuerySchema>;
export type ReprocessBody = z.infer<typeof reprocessBodySchema>;
