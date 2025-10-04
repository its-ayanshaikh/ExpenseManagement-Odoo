import { knex } from '../config/database';
import { redis } from '../utils/redis';

// Global test setup
beforeAll(async () => {
  // Ensure we're using test database
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/expense_management_test';
  }
  
  // Run migrations
  await knex.migrate.latest();
});

// Clean up after each test
afterEach(async () => {
  // Clear all tables except migrations
  const tables = await knex.raw(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename != 'knex_migrations' 
    AND tablename != 'knex_migrations_lock'
  `);
  
  for (const table of tables.rows) {
    await knex.raw(`TRUNCATE TABLE "${table.tablename}" CASCADE`);
  }
  
  // Clear Redis cache
  if (redis.isOpen) {
    await redis.flushall();
  }
});

// Global test teardown
afterAll(async () => {
  await knex.destroy();
  if (redis.isOpen) {
    await redis.quit();
  }
});