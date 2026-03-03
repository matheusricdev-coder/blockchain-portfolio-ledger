import type { FastifyInstance } from 'fastify';
import type { WalletController } from '../controllers/WalletController.js';
import {
  walletParamsSchema,
  tokenQuerySchema,
} from '../schemas/wallet.schemas.js';

export function registerWalletRoutes(
  fastify: FastifyInstance,
  controller: WalletController,
): void {
  fastify.get<{ Params: { address: string }; Querystring: { tokenAddress: string } }>(
    '/wallet/:address/statement',
    {
      schema: {
        params: walletParamsSchema,
        querystring: tokenQuerySchema,
      },
    },
    (req, reply) => controller.getStatement(req, reply),
  );

  fastify.get<{ Params: { address: string }; Querystring: { tokenAddress: string } }>(
    '/wallet/:address/position',
    {
      schema: {
        params: walletParamsSchema,
        querystring: tokenQuerySchema,
      },
    },
    (req, reply) => controller.getPosition(req, reply),
  );

  fastify.get<{ Params: { address: string }; Querystring: { tokenAddress: string } }>(
    '/wallet/:address/reconcile',
    {
      schema: {
        params: walletParamsSchema,
        querystring: tokenQuerySchema,
      },
    },
    (req, reply) => controller.reconcile(req, reply),
  );
}
