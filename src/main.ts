import Fastify from 'fastify';
import { sql } from 'drizzle-orm';
import { Queue } from 'bullmq';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from './shared/config/env.js';
import {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
} from './infrastructure/metrics/metrics.js';
import { logger } from './infrastructure/logger/logger.js';
import { db } from './infrastructure/database/client.js';
import { blockchainClient } from './infrastructure/blockchain/viemClient.js';
import { redisConnection } from './infrastructure/queue/connection.js';

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
import { createIndexerWorker } from './jobs/indexer/indexer.worker.js';
import { createSnapshotWorker } from './jobs/snapshot/snapshot.worker.js';
import { createReconcilerWorker } from './jobs/reconciler/reconciler.worker.js';

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

  // Workers
  const indexerWorker = createIndexerWorker(
    indexBlocksUseCase,
    normalizeEventsUseCase,
    logger.child({ service: 'IndexerWorker' }),
  );
  const snapshotWorker = createSnapshotWorker(
    generateSnapshotUseCase,
    logger.child({ service: 'SnapshotWorker' }),
  );
  const reconcilerWorker = createReconcilerWorker(
    reconcileWalletUseCase,
    logger.child({ service: 'ReconcilerWorker' }),
  );

  // Fastify
  const app = Fastify({
    logger: false, // Using Pino directly
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Blockchain Portfolio Ledger API',
        version: '0.1.0',
        description: 'Deterministic off-chain ledger for ERC-20 events',
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  // Metrics — HTTP instrumentation
  app.addHook('onRequest', async (request) => {
    (request as { _startTime?: number })._startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const start = (request as { _startTime?: number })._startTime ?? Date.now();
    const durationSeconds = (Date.now() - start) / 1000;
    const route = request.routeOptions?.url ?? request.url;
    const labels = {
      method: request.method,
      route,
      status_code: String(reply.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  // Metrics endpoint
  app.get('/metrics', async (_, reply) => {
    const metrics = await register.metrics();
    return reply.header('Content-Type', register.contentType).send(metrics);
  });

  // Health — liveness
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Health — readiness (DB + Redis)
  app.get('/health/ready', async (_, reply) => {
    const checks: Record<string, string> = {};
    let httpStatus = 200;

    try {
      await db.execute(sql`SELECT 1`);
      checks['db'] = 'ok';
    } catch {
      checks['db'] = 'error';
      httpStatus = 503;
    }

    const healthQueue = new Queue('health-check', { connection: redisConnection });
    try {
      const client = await healthQueue.client;
      await client.ping();
      checks['redis'] = 'ok';
    } catch {
      checks['redis'] = 'error';
      httpStatus = 503;
    } finally {
      await healthQueue.close();
    }

    return reply.status(httpStatus).send({
      status: httpStatus === 200 ? 'ready' : 'not_ready',
      checks,
    });
  });

  // Routes
  registerWalletRoutes(app, walletController);
  registerReprocessRoutes(app, reprocessController);

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await Promise.all([
      app.close(),
      indexerWorker.close(),
      snapshotWorker.close(),
      reconcilerWorker.close(),
    ]);
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // Start
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info('Server started', { port: env.PORT, nodeEnv: env.NODE_ENV });
}

bootstrap().catch((err) => {
  logger.fatal('Failed to start server', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
