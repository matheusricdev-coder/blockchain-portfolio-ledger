import Fastify from 'fastify';
import { env } from './shared/config/env.js';
import { logger } from './infrastructure/logger/logger.js';
import { db } from './infrastructure/database/client.js';
import { blockchainClient } from './infrastructure/blockchain/viemClient.js';

import {
  DrizzleRawEventRepository,
  DrizzleLedgerEntryRepository,
  DrizzleSnapshotRepository,
  DrizzleCheckpointRepository,
} from './infrastructure/database/repositories/index.js';

import {
  IndexBlocksUseCase,
  NormalizeEventsUseCase,
  GenerateSnapshotUseCase,
  ReconcileWalletUseCase,
} from './application/use-cases/index.js';

import { WalletController } from './api/controllers/WalletController.js';
import { ReprocessController } from './api/controllers/ReprocessController.js';
import { registerWalletRoutes } from './api/routes/wallet.routes.js';
import { registerReprocessRoutes } from './api/routes/reprocess.routes.js';

async function bootstrap(): Promise<void> {
  // Repositories
  const rawEventRepo = new DrizzleRawEventRepository(db);
  const ledgerEntryRepo = new DrizzleLedgerEntryRepository(db);
  const snapshotRepo = new DrizzleSnapshotRepository(db);
  const checkpointRepo = new DrizzleCheckpointRepository(db);

  // Use cases
  const indexBlocksUseCase = new IndexBlocksUseCase(
    blockchainClient,
    rawEventRepo,
    checkpointRepo,
    logger.child({ service: 'IndexBlocks' }),
  );
  const normalizeEventsUseCase = new NormalizeEventsUseCase(
    rawEventRepo,
    ledgerEntryRepo,
    logger.child({ service: 'NormalizeEvents' }),
  );
  const generateSnapshotUseCase = new GenerateSnapshotUseCase(
    ledgerEntryRepo,
    snapshotRepo,
    logger.child({ service: 'GenerateSnapshot' }),
  );
  const reconcileWalletUseCase = new ReconcileWalletUseCase(
    blockchainClient,
    snapshotRepo,
    logger.child({ service: 'ReconcileWallet' }),
  );

  // Controllers
  const walletController = new WalletController(
    ledgerEntryRepo,
    snapshotRepo,
    generateSnapshotUseCase,
    reconcileWalletUseCase,
  );
  const reprocessController = new ReprocessController(indexBlocksUseCase, normalizeEventsUseCase);

  // Fastify
  const app = Fastify({
    logger: false, // Using Pino directly
  });

  // Health
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  registerWalletRoutes(app, walletController);
  registerReprocessRoutes(app, reprocessController);

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  // Start
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info('Server started', { port: env.PORT, nodeEnv: env.NODE_ENV });
}

bootstrap().catch((err) => {
  logger.fatal('Failed to start server', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
