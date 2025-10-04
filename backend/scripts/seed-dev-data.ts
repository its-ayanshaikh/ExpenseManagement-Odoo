#!/usr/bin/env ts-node

/**
 * Development Database Seeding Script
 * 
 * This script populates the database with comprehensive sample data for development and testing.
 * It creates realistic scenarios covering all aspects of the expense management system.
 * 
 * Usage:
 *   npm run seed:dev
 *   or
 *   npx ts-node scripts/seed-dev-data.ts
 * 
 * Environment:
 *   Make sure your .env file is configured with the correct database connection details.
 */

import dotenv from 'dotenv';
import { db } from '../src/config/database';

// Load environment variables
dotenv.config();

async function seedDatabase() {
  console.log('🌱 Starting development database seeding...');
  console.log(`📍 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log('');

  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection established');

    // Run the master seed file
    const { seed } = await import('../src/seeds/000_run_all_seeds');
    await seed(db);

    console.log('');
    console.log('🚀 Development environment is ready!');
    console.log('');
    console.log('💡 What you can test now:');
    console.log('   • User authentication and role-based access');
    console.log('   • Expense submission with different currencies');
    console.log('   • Multi-level approval workflows');
    console.log('   • Conditional approval rules (percentage, specific approver, hybrid)');
    console.log('   • Manager approval actions');
    console.log('   • Admin override functionality');
    console.log('   • Expense status tracking and history');
    console.log('   • Multi-company data isolation');
    console.log('   • Currency conversion scenarios');
    console.log('');
    console.log('📋 Test scenarios available:');
    console.log('   • Pending expenses awaiting approval');
    console.log('   • Approved expenses with complete audit trail');
    console.log('   • Rejected expenses with manager comments');
    console.log('   • High-value expenses requiring multiple approvals');
    console.log('   • International expenses with currency conversion');
    console.log('   • Different approval rule types in action');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.destroy();
    console.log('');
    console.log('🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✨ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };