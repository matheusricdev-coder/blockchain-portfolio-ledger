import type { FastifyInstance } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ReprocessController } from '../controllers/ReprocessController.js';
import { reprocessBodySchema } from '../schemas/wallet.schemas.js';

const bodyJsonSchema = zodToJsonSchema(reprocessBodySchema);

export function registerReprocessRoutes(
  fastify: FastifyInstance,
  controller: ReprocessController,
): void {
  fastify.post<{ Body: { fromBlock: number; toBlock: number; tokenAddress?: string } }>(
    '/reprocess',
    {
      schema: {
        body: bodyJsonSchema,
      },
    },
    (req, reply) => controller.reprocess(req, reply),
  );
}
