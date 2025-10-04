import { Knex } from 'knex';
import { SEED_COMPANY_IDS } from '../utils/seed-constants';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('companies').del();

  // Sample companies with different countries and currencies
  const companies = [
    {
      id: SEED_COMPANY_IDS.TECHCORP_USA,
      name: 'TechCorp USA',
      country: 'United States',
      default_currency: 'USD',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: SEED_COMPANY_IDS.INNOVATE_UK,
      name: 'InnovateLtd UK',
      country: 'United Kingdom',
      default_currency: 'GBP',
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
    {
      id: SEED_COMPANY_IDS.STARTUP_CANADA,
      name: 'StartupHub Canada',
      country: 'Canada',
      default_currency: 'CAD',
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-01'),
    },
  ];

  await knex('companies').insert(companies);
}