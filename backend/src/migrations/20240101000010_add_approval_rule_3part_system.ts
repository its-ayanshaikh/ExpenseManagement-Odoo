import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add is_sequential_approval to approval_rules table
  await knex.schema.alterTable('approval_rules', (table) => {
    table.boolean('is_sequential_approval').notNullable().defaultTo(false);
  });

  // Add is_required to approval_rule_approvers table
  await knex.schema.alterTable('approval_rule_approvers', (table) => {
    table.boolean('is_required').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove is_sequential_approval from approval_rules table
  await knex.schema.alterTable('approval_rules', (table) => {
    table.dropColumn('is_sequential_approval');
  });

  // Remove is_required from approval_rule_approvers table
  await knex.schema.alterTable('approval_rule_approvers', (table) => {
    table.dropColumn('is_required');
  });
}
