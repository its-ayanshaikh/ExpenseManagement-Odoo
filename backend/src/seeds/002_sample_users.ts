import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { UserRole } from '../types/database';
import { SEED_COMPANY_IDS, SEED_USER_IDS } from '../utils/seed-constants';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('users').del();

  // Hash password for all users (password: "password123")
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Sample users for TechCorp USA
  const techCorpUsers = [
    {
      id: SEED_USER_IDS.ADMIN_1,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'admin@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'Alice',
      last_name: 'Johnson',
      role: UserRole.ADMIN,
      manager_id: null,
      is_manager_approver: false,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: SEED_USER_IDS.MANAGER_1,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'manager1@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'Bob',
      last_name: 'Smith',
      role: UserRole.MANAGER,
      manager_id: null,
      is_manager_approver: true,
      created_at: new Date('2024-01-02'),
      updated_at: new Date('2024-01-02'),
    },
    {
      id: SEED_USER_IDS.MANAGER_2,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'manager2@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'Carol',
      last_name: 'Davis',
      role: UserRole.MANAGER,
      manager_id: null,
      is_manager_approver: true,
      created_at: new Date('2024-01-03'),
      updated_at: new Date('2024-01-03'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_1,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'employee1@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'David',
      last_name: 'Wilson',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_1,
      is_manager_approver: false,
      created_at: new Date('2024-01-04'),
      updated_at: new Date('2024-01-04'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_2,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'employee2@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'Emma',
      last_name: 'Brown',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_1,
      is_manager_approver: false,
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-01-05'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_3,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'employee3@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'Frank',
      last_name: 'Miller',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_2,
      is_manager_approver: false,
      created_at: new Date('2024-01-06'),
      updated_at: new Date('2024-01-06'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_4,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      email: 'employee4@techcorp.com',
      password_hash: hashedPassword,
      first_name: 'Grace',
      last_name: 'Taylor',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_2,
      is_manager_approver: false,
      created_at: new Date('2024-01-07'),
      updated_at: new Date('2024-01-07'),
    },
  ];

  // Sample users for InnovateLtd UK
  const innovateUsers = [
    {
      id: SEED_USER_IDS.ADMIN_2,
      company_id: SEED_COMPANY_IDS.INNOVATE_UK,
      email: 'admin@innovate.co.uk',
      password_hash: hashedPassword,
      first_name: 'Henry',
      last_name: 'Anderson',
      role: UserRole.ADMIN,
      manager_id: null,
      is_manager_approver: false,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
    {
      id: SEED_USER_IDS.MANAGER_3,
      company_id: SEED_COMPANY_IDS.INNOVATE_UK,
      email: 'manager@innovate.co.uk',
      password_hash: hashedPassword,
      first_name: 'Ivy',
      last_name: 'Thompson',
      role: UserRole.MANAGER,
      manager_id: null,
      is_manager_approver: true,
      created_at: new Date('2024-01-16'),
      updated_at: new Date('2024-01-16'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_5,
      company_id: SEED_COMPANY_IDS.INNOVATE_UK,
      email: 'employee1@innovate.co.uk',
      password_hash: hashedPassword,
      first_name: 'Jack',
      last_name: 'White',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_3,
      is_manager_approver: false,
      created_at: new Date('2024-01-17'),
      updated_at: new Date('2024-01-17'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_6,
      company_id: SEED_COMPANY_IDS.INNOVATE_UK,
      email: 'employee2@innovate.co.uk',
      password_hash: hashedPassword,
      first_name: 'Kate',
      last_name: 'Harris',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_3,
      is_manager_approver: false,
      created_at: new Date('2024-01-18'),
      updated_at: new Date('2024-01-18'),
    },
  ];

  // Sample users for StartupHub Canada
  const startupUsers = [
    {
      id: SEED_USER_IDS.ADMIN_3,
      company_id: SEED_COMPANY_IDS.STARTUP_CANADA,
      email: 'admin@startuphub.ca',
      password_hash: hashedPassword,
      first_name: 'Liam',
      last_name: 'Martin',
      role: UserRole.ADMIN,
      manager_id: null,
      is_manager_approver: false,
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-01'),
    },
    {
      id: SEED_USER_IDS.MANAGER_4,
      company_id: SEED_COMPANY_IDS.STARTUP_CANADA,
      email: 'manager@startuphub.ca',
      password_hash: hashedPassword,
      first_name: 'Mia',
      last_name: 'Garcia',
      role: UserRole.MANAGER,
      manager_id: null,
      is_manager_approver: true,
      created_at: new Date('2024-02-02'),
      updated_at: new Date('2024-02-02'),
    },
    {
      id: SEED_USER_IDS.EMPLOYEE_7,
      company_id: SEED_COMPANY_IDS.STARTUP_CANADA,
      email: 'employee1@startuphub.ca',
      password_hash: hashedPassword,
      first_name: 'Noah',
      last_name: 'Rodriguez',
      role: UserRole.EMPLOYEE,
      manager_id: SEED_USER_IDS.MANAGER_4,
      is_manager_approver: false,
      created_at: new Date('2024-02-03'),
      updated_at: new Date('2024-02-03'),
    },
  ];

  // Insert all users
  const allUsers = [...techCorpUsers, ...innovateUsers, ...startupUsers];
  await knex('users').insert(allUsers);
}