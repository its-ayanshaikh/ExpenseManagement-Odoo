import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create enum type for approval rule type
  await knex.raw(`
    CREATE TYPE approval_rule_type AS ENUM ('SEQUENTIAL', 'PERCENTAGE', 'SPECIFIC_APPROVER', 'HYBRID');
  `);

  return knex.schema.createTable('approval_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.specificType('rule_type', 'approval_rule_type').notNullable();
    table.integer('percentage_threshold').nullable();
    table.uuid('specific_approver_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_hybrid').notNullable().defaultTo(false);
    table.integer('priority').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('company_id');
    table.index('rule_type');
    table.index(['company_id', 'priority']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('approval_rules');
  await knex.raw('DROP TYPE IF EXISTS approval_rule_type;');
}
