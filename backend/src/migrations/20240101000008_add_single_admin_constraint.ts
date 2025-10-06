import { Knex } from 'knex';

/**
 * Migration: Add unique constraint to ensure only one admin per company
 * This enforces Requirement 2.8: Only one Admin user exists per company
 */
export async function up(knex: Knex): Promise<void> {
  // Create a unique partial index that ensures only one admin per company
  // This allows multiple managers and employees but only one admin
  await knex.raw(`
    CREATE UNIQUE INDEX users_single_admin_per_company_idx 
    ON users (company_id) 
    WHERE role = 'ADMIN'
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  // Drop the unique index
  await knex.raw('DROP INDEX IF EXISTS users_single_admin_per_company_idx');
}
