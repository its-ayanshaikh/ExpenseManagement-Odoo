import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create enum type for approval request status
  await knex.raw(`
    CREATE TYPE approval_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  `);

  return knex.schema.createTable('approval_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    table.uuid('approver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('sequence').notNullable();
    table.specificType('status', 'approval_request_status').notNullable().defaultTo('PENDING');
    table.text('comments').nullable();
    table.timestamp('responded_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('expense_id');
    table.index('approver_id');
    table.index('status');
    table.index(['expense_id', 'sequence']);
    table.index(['approver_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('approval_requests');
  await knex.raw('DROP TYPE IF EXISTS approval_request_status;');
}
