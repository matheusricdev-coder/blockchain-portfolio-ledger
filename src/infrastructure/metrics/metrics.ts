import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const blocksIndexedTotal = new Counter({
  name: 'blocks_indexed_total',
  help: 'Total number of blocks indexed',
  registers: [register],
});

export const rawEventsIndexedTotal = new Counter({
  name: 'raw_events_indexed_total',
  help: 'Total number of raw events indexed',
  registers: [register],
});

export const ledgerEntriesSavedTotal = new Counter({
  name: 'ledger_entries_saved_total',
  help: 'Total number of ledger entries saved',
  registers: [register],
});

export const jobsProcessedTotal = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of BullMQ jobs processed',
  labelNames: ['queue', 'status'] as const,
  registers: [register],
});
