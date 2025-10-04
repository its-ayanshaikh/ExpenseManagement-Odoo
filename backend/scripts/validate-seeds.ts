#!/usr/bin/env ts-node

/**
 * Seed Validation Script
 * 
 * This script validates the seed files for syntax errors and proper structure
 * without requiring a database connection.
 */

import * as fs from 'fs';
import * as path from 'path';

async function validateSeeds() {
  console.log('🔍 Validating seed files...');
  
  const seedsDir = path.join(__dirname, '../src/seeds');
  const seedFiles = fs.readdirSync(seedsDir)
    .filter(file => file.endsWith('.ts') && !file.includes('README'))
    .sort();

  console.log(`📁 Found ${seedFiles.length} seed files:`);
  
  let allValid = true;
  
  for (const file of seedFiles) {
    try {
      console.log(`   • ${file}`);
      
      // Try to import the file to check for syntax errors
      const seedModule = await import(path.join(seedsDir, file));
      
      // Check if it exports a seed function
      if (typeof seedModule.seed !== 'function') {
        console.log(`     ❌ Missing or invalid seed function`);
        allValid = false;
      } else {
        console.log(`     ✅ Valid seed function`);
      }
      
    } catch (error) {
      console.log(`     ❌ Syntax error: ${error.message}`);
      allValid = false;
    }
  }
  
  console.log('');
  
  if (allValid) {
    console.log('✅ All seed files are valid!');
    console.log('');
    console.log('📋 Seed file summary:');
    console.log('   • 000_run_all_seeds.ts - Master orchestrator');
    console.log('   • 001_sample_companies.ts - 3 companies with different currencies');
    console.log('   • 002_sample_users.ts - 13 users across all roles');
    console.log('   • 003_sample_approval_rules.ts - 7 approval rules (all types)');
    console.log('   • 004_sample_expenses.ts - 15 expenses with various scenarios');
    console.log('   • 005_sample_approval_requests.ts - 20 approval requests');
    console.log('   • 006_sample_approval_history.ts - 53 audit trail records');
    console.log('');
    console.log('🚀 Ready to seed database when PostgreSQL is available!');
    console.log('');
    console.log('💡 To run seeds:');
    console.log('   1. Start PostgreSQL database');
    console.log('   2. Run migrations: npm run migrate:latest');
    console.log('   3. Run seeds: npm run seed:run');
  } else {
    console.log('❌ Some seed files have issues. Please fix them before running.');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  validateSeeds()
    .then(() => {
      console.log('✨ Validation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}

export { validateSeeds };