import type { FastifyInstance } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { WalletController } from '../controllers/WalletController.js';
import {
  walletParamsSchema,
  tokenQuerySchema,
} from '../schemas/wallet.schemas.js';

const paramsJsonSchema = zodToJsonSchema(walletParamsSchema);
const querystringJsonSchema = zodToJsonSchema(tokenQuerySchema);

export function registerWalletRoutes(
  fastify: FastifyInstance,
  controller: WalletController,
): void {
  fastify.get<{ Params: { address: string }; Querystring: { tokenAddress: string } }>(
    '/wallet/:address/statement',
    {
      schema: {
        params: paramsJsonSchema,
        querystring: querystringJsonSchema,
      },
    },
    (req, reply) => controller.getStatement(req, reply),
  );

  fastify.get<{ Params: { address: string }; Querystring: { tokenAddress: string } }>(
    '/wallet/:address/position',
    {
      schema: {
        params: paramsJsonSchema,
        querystring: querystringJsonSchema,
      },
    },
    (req, reply) => controller.getPosition(req, reply),
  );

  fastify.get<{ Params: { address: string }; Querystring: { tokenAddress: string } }>(
    '/wallet/:address/reconcile',
    {
      schema: {
        params: paramsJsonSchema,
        querystring: querystringJsonSchema,
      },
    },
    (req, reply) => controller.reconcile(req, reply),
  );
}
