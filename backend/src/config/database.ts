import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'expense_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './src/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/seeds',
    extension: 'ts',
  },
};

export const db = knex(config);
export default config;