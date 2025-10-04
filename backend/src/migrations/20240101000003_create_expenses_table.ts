import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create enum type for expense status
  await knex.raw(`
    CREATE TYPE expense_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  `);

  return knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('submitter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).notNullable();
    table.string('category', 100).notNullable();
    table.text('description').notNullable();
    table.date('expense_date').notNullable();
    table.string('receipt_url', 500).nullable();
    table.specificType('status', 'expense_status').notNullable().defaultTo('PENDING');
    table.decimal('converted_amount', 15, 2).notNullable();
    table.string('converted_currency', 3).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('company_id');
    table.index('submitter_id');
    table.index('status');
    table.index('expense_date');
    table.index(['company_id', 'status']);
    table.index(['submitter_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expenses');
  await knex.raw('DROP TYPE IF EXISTS expense_status;');
}
