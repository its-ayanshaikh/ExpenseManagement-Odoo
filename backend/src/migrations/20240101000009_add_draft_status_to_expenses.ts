import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add DRAFT to the expense_status enum
  await knex.raw(`
    ALTER TYPE expense_status ADD VALUE IF NOT EXISTS 'DRAFT';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Note: PostgreSQL doesn't support removing enum values directly
  // This would require recreating the enum type and updating all references
  // For now, we'll leave the DRAFT value in the enum
  console.log('Cannot remove enum value DRAFT from expense_status. Manual intervention required if rollback is needed.');
}
