import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create enum type for user roles
  await knex.raw(`
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
  `);

  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.specificType('role', 'user_role').notNullable().defaultTo('EMPLOYEE');
    table.uuid('manager_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_manager_approver').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint on email per company
    table.unique(['company_id', 'email']);

    // Indexes
    table.index('company_id');
    table.index('email');
    table.index('role');
    table.index('manager_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS user_role;');
}
