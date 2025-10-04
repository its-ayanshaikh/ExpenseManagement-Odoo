import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('approval_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    table.uuid('actor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('action', 50).notNullable();
    table.text('comments').nullable();
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('expense_id');
    table.index('actor_id');
    table.index('action');
    table.index(['expense_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('approval_history');
}
