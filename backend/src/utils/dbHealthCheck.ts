import { db } from '../config/database';

/**
 * Check if the database connection is healthy
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

/**
 * Check if all migrations have been run
 */
export async function checkMigrationStatus(): Promise<void> {
  try {
    const [currentBatch] = await db.migrate.currentVersion();
    console.log(`✓ Current migration version: ${currentBatch}`);
  } catch (error) {
    console.error('✗ Failed to check migration status:', error);
  }
}

/**
 * Gracefully close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await db.destroy();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Failed to close database connection:', error);
  }
}
