import {
  pgTable,
  uuid,
  integer,
  varchar,
  numeric,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';

export const rawEvents = pgTable(
  'raw_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chainId: integer('chain_id').notNull(),
    blockNumber: integer('block_number').notNull(),
    txHash: varchar('tx_hash', { length: 66 }).notNull(),
    logIndex: integer('log_index').notNull(),
    fromAddress: varchar('from_address', { length: 42 }).notNull(),
    toAddress: varchar('to_address', { length: 42 }).notNull(),
    tokenAddress: varchar('token_address', { length: 42 }).notNull(),
    amount: numeric('amount', { precision: 78, scale: 0 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_raw_events_event_id').on(
      table.chainId,
      table.blockNumber,
      table.txHash,
      table.logIndex,
    ),
    index('idx_raw_events_block').on(table.chainId, table.blockNumber),
  ],
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    tokenAddress: varchar('token_address', { length: 42 }).notNull(),
    /** Positive = credit, negative = debit */
    amount: numeric('amount', { precision: 78, scale: 0 }).notNull(),
    referenceEventId: uuid('reference_event_id')
      .notNull()
      .references(() => rawEvents.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_ledger_wallet_token').on(table.walletAddress, table.tokenAddress),
    index('idx_ledger_created_at').on(table.createdAt),
  ],
);

export const snapshots = pgTable(
  'snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    tokenAddress: varchar('token_address', { length: 42 }).notNull(),
    balance: numeric('balance', { precision: 78, scale: 0 }).notNull(),
    snapshotDate: timestamp('snapshot_date', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_snapshots_wallet_token_date').on(
      table.walletAddress,
      table.tokenAddress,
      table.snapshotDate,
    ),
  ],
);

export const checkpoints = pgTable('checkpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chain_id').notNull().unique(),
  lastProcessedBlock: integer('last_processed_block').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Inferred types
export type RawEventRow = typeof rawEvents.$inferSelect;
export type InsertRawEventRow = typeof rawEvents.$inferInsert;

export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntryRow = typeof ledgerEntries.$inferInsert;

export type SnapshotRow = typeof snapshots.$inferSelect;
export type InsertSnapshotRow = typeof snapshots.$inferInsert;

export type CheckpointRow = typeof checkpoints.$inferSelect;
export type InsertCheckpointRow = typeof checkpoints.$inferInsert;
