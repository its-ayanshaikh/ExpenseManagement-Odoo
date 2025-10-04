import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // This seed file runs all other seed files in the correct order
  // Knex will automatically run seed files in alphabetical order,
  // so this file (000_) will run first and orchestrate the others
  
  console.log('🌱 Starting database seeding...');
  
  try {
    // Import and run each seed file in dependency order
    const { seed: seedCompanies } = await import('./001_sample_companies');
    await seedCompanies(knex);
    console.log('✅ Companies seeded');

    const { seed: seedUsers } = await import('./002_sample_users');
    await seedUsers(knex);
    console.log('✅ Users seeded');

    const { seed: seedApprovalRules } = await import('./003_sample_approval_rules');
    await seedApprovalRules(knex);
    console.log('✅ Approval rules seeded');

    // TODO: Fix remaining seed files with proper UUIDs
    // const { seed: seedExpenses } = await import('./004_sample_expenses');
    // await seedExpenses(knex);
    // console.log('✅ Expenses seeded');

    // const { seed: seedApprovalRequests } = await import('./005_sample_approval_requests');
    // await seedApprovalRequests(knex);
    // console.log('✅ Approval requests seeded');

    // const { seed: seedApprovalHistory } = await import('./006_sample_approval_history');
    // await seedApprovalHistory(knex);
    // console.log('✅ Approval history seeded');

    console.log('🎉 Basic database seeding completed successfully!');
    console.log('');
    console.log('📊 Seed data summary:');
    console.log('   • 3 Companies (TechCorp USA, InnovateLtd UK, StartupHub Canada)');
    console.log('   • 13 Users (3 Admins, 4 Managers, 6 Employees)');
    console.log('   • 7 Approval Rules (Sequential, Percentage, Specific Approver, Hybrid)');
    console.log('   • Note: Expenses, approval requests, and history seeds are temporarily disabled');
    console.log('');
    console.log('🔐 Test login credentials (password: "password123"):');
    console.log('   • admin@techcorp.com (Admin - TechCorp USA)');
    console.log('   • manager1@techcorp.com (Manager - TechCorp USA)');
    console.log('   • employee1@techcorp.com (Employee - TechCorp USA)');
    console.log('   • admin@innovate.co.uk (Admin - InnovateLtd UK)');
    console.log('   • admin@startuphub.ca (Admin - StartupHub Canada)');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}