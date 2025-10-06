import { db } from '../config/database';
import redisClient from '../utils/redis';

// Global test setup
beforeAll(async () => {
  // Ensure we're using test database
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/expense_management_test';
  }
  
  // Run migrations
  await db.migrate.latest();
  
  // Connect to Redis
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('Redis connection failed in tests, continuing without cache:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all tables except migrations
  const tables = await db.raw(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename != 'knex_migrations' 
    AND tablename != 'knex_migrations_lock'
  `);
  
  for (const table of tables.rows) {
    await db.raw(`TRUNCATE TABLE "${table.tablename}" CASCADE`);
  }
  
  // Clear Redis cache if connected
  if (redisClient.isClientConnected()) {
    const client = redisClient.getClient();
    if (client) {
      await client.flushAll();
    }
  }
});

// Global test teardown
afterAll(async () => {
  await db.destroy();
  if (redisClient.isClientConnected()) {
    await redisClient.disconnect();
  }
});