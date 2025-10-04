import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('approval_rule_approvers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('approval_rule_id').notNullable().references('id').inTable('approval_rules').onDelete('CASCADE');
    table.uuid('approver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('sequence').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint to prevent duplicate approvers in same rule
    table.unique(['approval_rule_id', 'approver_id']);

    // Unique constraint to prevent duplicate sequence numbers in same rule
    table.unique(['approval_rule_id', 'sequence']);

    // Indexes
    table.index('approval_rule_id');
    table.index('approver_id');
    table.index(['approval_rule_id', 'sequence']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('approval_rule_approvers');
}
