import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GenerateSnapshotUseCase } from '../../application/use-cases/GenerateSnapshotUseCase.js';
import type { ReconcileWalletUseCase } from '../../application/use-cases/ReconcileWalletUseCase.js';
import type { ILedgerEntryRepository } from '../../domain/repositories/ILedgerEntryRepository.js';
import type { ISnapshotRepository } from '../../domain/repositories/ISnapshotRepository.js';
import type { WalletParams, TokenQuery, StatementQuery } from '../schemas/wallet.schemas.js';
import { DomainError } from '../../shared/errors/index.js';

export class WalletController {
  constructor(
    private readonly ledgerEntryRepository: ILedgerEntryRepository,
    private readonly snapshotRepository: ISnapshotRepository,
    private readonly generateSnapshotUseCase: GenerateSnapshotUseCase,
    private readonly reconcileWalletUseCase: ReconcileWalletUseCase,
  ) {}

  async getStatement(
    request: FastifyRequest<{ Params: WalletParams; Querystring: StatementQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { address } = request.params;
    const { tokenAddress, limit, offset } = request.query;

    const result = await this.ledgerEntryRepository.findByWallet(address, tokenAddress, {
      limit,
      offset,
    });

    await reply.send({
      walletAddress: address,
      tokenAddress,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      entries: result.items.map((e) => ({
        id: e.id,
        amount: e.amount.toString(),
        referenceEventId: e.referenceEventId,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }

  async getPosition(
    request: FastifyRequest<{ Params: WalletParams; Querystring: TokenQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { address } = request.params;
    const { tokenAddress } = request.query;

    const snapshot = await this.snapshotRepository.findLatest(address, tokenAddress);

    if (!snapshot) {
      const generated = await this.generateSnapshotUseCase.execute({
        walletAddress: address,
        tokenAddress,
      });

      await reply.send({
        walletAddress: address,
        tokenAddress,
        balance: generated.balance.toString(),
        snapshotDate: generated.snapshotDate.toISOString(),
      });
      return;
    }

    await reply.send({
      walletAddress: snapshot.walletAddress,
      tokenAddress: snapshot.tokenAddress,
      balance: snapshot.balance.toString(),
      snapshotDate: snapshot.snapshotDate.toISOString(),
    });
  }

  async reconcile(
    request: FastifyRequest<{ Params: WalletParams; Querystring: TokenQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { address } = request.params;
    const { tokenAddress } = request.query;

    try {
      const result = await this.reconcileWalletUseCase.execute({
        walletAddress: address as `0x${string}`,
        tokenAddress: tokenAddress as `0x${string}`,
      });

      await reply.send({
        ...result,
        snapshotBalance: result.snapshotBalance.toString(),
        onChainBalance: result.onChainBalance.toString(),
        divergence: result.divergence.toString(),
      });
    } catch (err) {
      if (err instanceof DomainError) {
        await reply.status(409).send({ error: err.name, message: err.message });
        return;
      }
      throw err;
    }
  }
}
