import type { FastifyInstance } from 'fastify';
import type { ReprocessController } from '../controllers/ReprocessController.js';
import { reprocessBodySchema } from '../schemas/wallet.schemas.js';

export function registerReprocessRoutes(
  fastify: FastifyInstance,
  controller: ReprocessController,
): void {
  fastify.post<{ Body: { fromBlock: number; toBlock: number; tokenAddress?: string } }>(
    '/reprocess',
    {
      schema: {
        body: reprocessBodySchema,
      },
    },
    (req, reply) => controller.reprocess(req, reply),
  );
}
