import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IndexBlocksUseCase } from '../../application/use-cases/IndexBlocksUseCase.js';
import type { NormalizeEventsUseCase } from '../../application/use-cases/NormalizeEventsUseCase.js';
import type { ReprocessBody } from '../schemas/wallet.schemas.js';
import { env } from '../../shared/config/env.js';

export class ReprocessController {
  constructor(
    private readonly indexBlocksUseCase: IndexBlocksUseCase,
    private readonly normalizeEventsUseCase: NormalizeEventsUseCase,
  ) {}

  async reprocess(
    request: FastifyRequest<{ Body: ReprocessBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { fromBlock, toBlock, tokenAddress } = request.body;

    const indexResult = await this.indexBlocksUseCase.execute({
      chainId: env.CHAIN_ID,
      fromBlock,
      toBlock,
      tokenAddress: tokenAddress as `0x${string}` | undefined,
    });

    const normalizeResult = await this.normalizeEventsUseCase.execute();

    await reply.status(200).send({
      fromBlock,
      toBlock,
      indexing: indexResult,
      normalization: normalizeResult,
    });
  }
}
