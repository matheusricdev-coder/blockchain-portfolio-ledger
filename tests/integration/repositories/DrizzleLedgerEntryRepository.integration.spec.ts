import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../../../src/infrastructure/database/schema';
import { DrizzleLedgerEntryRepository } from '../../../src/infrastructure/database/repositories/DrizzleLedgerEntryRepository';
import { DrizzleRawEventRepository } from '../../../src/infrastructure/database/repositories/DrizzleRawEventRepository';

let container: StartedPostgreSqlContainer;
let sql: postgres.Sql;
let ledgerRepo: DrizzleLedgerEntryRepository;
let rawEventRepo: DrizzleRawEventRepository;

const TOKEN = '0xAAAA111111111111111111111111111111111111';
const WALLET_A = '0xAAAA000000000000000000000000000000000001';
const WALLET_B = '0xBBBB000000000000000000000000000000000002';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  sql = postgres(container.getConnectionUri());
  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder: './src/infrastructure/database/migrations' });
  ledgerRepo = new DrizzleLedgerEntryRepository(db);
  rawEventRepo = new DrizzleRawEventRepository(db);
}, 90000);

afterAll(async () => {
  await sql.end();
  await container.stop();
});

const insertRawEvent = async (txHash: string, logIndex = 0): Promise<string> => {
  await rawEventRepo.save({
    chainId: 11155111,
    blockNumber: 1000,
    txHash,
    logIndex,
    fromAddress: WALLET_A,
    toAddress: WALLET_B,
    tokenAddress: TOKEN,
    amount: 100n,
  });
  // fetch its id
  const event = await rawEventRepo.findByEventId(`11155111:1000:${txHash}:${logIndex}`);
  return event!.id;
};

describe('DrizzleLedgerEntryRepository (integration)', () => {
  it('should saveMany and retrieve entries via findByWallet', async () => {
    const eventId = await insertRawEvent('0xhash_integration_01');

    await ledgerRepo.saveMany([
      { walletAddress: WALLET_B, tokenAddress: TOKEN, amount: 100n, referenceEventId: eventId },
      { walletAddress: WALLET_A, tokenAddress: TOKEN, amount: -100n, referenceEventId: eventId },
    ]);

    const resultB = await ledgerRepo.findByWallet(WALLET_B, TOKEN);
    const resultA = await ledgerRepo.findByWallet(WALLET_A, TOKEN);

    expect(resultB.items.length).toBeGreaterThan(0);
    expect(resultB.items.some((e) => e.amount === 100n)).toBe(true);
    expect(resultA.items.some((e) => e.amount === -100n)).toBe(true);
  });

  it('should return empty result when wallet has no entries', async () => {
    const result = await ledgerRepo.findByWallet(
      '0x0000000000000000000000000000000000000099',
      TOKEN,
    );
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should paginate results correctly', async () => {
    const eventId1 = await insertRawEvent('0xhash_page_01', 0);
    const eventId2 = await insertRawEvent('0xhash_page_01', 1);
    const eventId3 = await insertRawEvent('0xhash_page_01', 2);

    const paginationWallet = '0xccc0000000000000000000000000000000000003';

    await ledgerRepo.saveMany([
      {
        walletAddress: paginationWallet,
        tokenAddress: TOKEN,
        amount: 10n,
        referenceEventId: eventId1,
      },
      {
        walletAddress: paginationWallet,
        tokenAddress: TOKEN,
        amount: 20n,
        referenceEventId: eventId2,
      },
      {
        walletAddress: paginationWallet,
        tokenAddress: TOKEN,
        amount: 30n,
        referenceEventId: eventId3,
      },
    ]);

    const page1 = await ledgerRepo.findByWallet(paginationWallet, TOKEN, { limit: 2, offset: 0 });
    const page2 = await ledgerRepo.findByWallet(paginationWallet, TOKEN, { limit: 2, offset: 2 });

    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(3);
    expect(page1.limit).toBe(2);
    expect(page1.offset).toBe(0);

    expect(page2.items).toHaveLength(1);
    expect(page2.total).toBe(3);
  });

  it('should sum ledger entries by wallet up to a given date', async () => {
    const eventId = await insertRawEvent('0xhash_sum_01', 0);
    const sumWallet = '0xddd0000000000000000000000000000000000004';

    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 10000);

    await ledgerRepo.saveMany([
      { walletAddress: sumWallet, tokenAddress: TOKEN, amount: 400n, referenceEventId: eventId },
      { walletAddress: sumWallet, tokenAddress: TOKEN, amount: 100n, referenceEventId: eventId },
    ]);

    const total = await ledgerRepo.sumByWallet(sumWallet, TOKEN, future);
    expect(total).toBe(500n);

    // Entries are after `past`, so sum up to past should be 0
    const totalPast = await ledgerRepo.sumByWallet(sumWallet, TOKEN, past);
    expect(totalPast).toBe(0n);
  });

  it('should return 0n for a wallet with no entries', async () => {
    const total = await ledgerRepo.sumByWallet(
      '0xeee0000000000000000000000000000000000005',
      TOKEN,
      new Date(),
    );
    expect(total).toBe(0n);
  });
});
