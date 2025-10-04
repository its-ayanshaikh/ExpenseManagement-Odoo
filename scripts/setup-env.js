#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🔧 Expense Management System - Environment Setup');
  console.log('================================================\n');

  const environment = await question('Select environment (development/production): ');
  
  if (!['development', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Please choose "development" or "production"');
    process.exit(1);
  }

  console.log(`\n📝 Setting up ${environment} environment...\n`);

  // Backend environment setup
  const backendEnvPath = path.join(__dirname, '..', 'backend', `.env.${environment}`);
  const backendExamplePath = path.join(__dirname, '..', 'backend', '.env.example');

  if (!fs.existsSync(backendEnvPath)) {
    if (fs.existsSync(backendExamplePath)) {
      fs.copyFileSync(backendExamplePath, backendEnvPath);
      console.log(`✅ Created backend/.env.${environment} from template`);
    } else {
      console.error('❌ Backend .env.example not found');
    }
  } else {
    console.log(`ℹ️  Backend/.env.${environment} already exists`);
  }

  // Frontend environment setup
  const frontendEnvPath = path.join(__dirname, '..', 'frontend', `.env.${environment}`);
  const frontendExamplePath = path.join(__dirname, '..', 'frontend', '.env.example');

  if (!fs.existsSync(frontendEnvPath)) {
    if (fs.existsSync(frontendExamplePath)) {
      fs.copyFileSync(frontendExamplePath, frontendEnvPath);
      console.log(`✅ Created frontend/.env.${environment} from template`);
    } else {
      console.error('❌ Frontend .env.example not found');
    }
  } else {
    console.log(`ℹ️  Frontend/.env.${environment} already exists`);
  }

  if (environment === 'production') {
    console.log('\n⚠️  IMPORTANT: Production Environment Security Checklist');
    console.log('====================================================');
    console.log('1. ✅ Change all default passwords and secrets');
    console.log('2. ✅ Set strong JWT secrets (minimum 32 characters)');
    console.log('3. ✅ Configure proper database credentials');
    console.log('4. ✅ Set up SSL/TLS for database connections');
    console.log('5. ✅ Configure external API keys');
    console.log('6. ✅ Set proper CORS origins');
    console.log('7. ✅ Review file upload limits and security');
    console.log('8. ✅ Configure email settings for notifications');
  }

  console.log('\n📚 Next Steps:');
  console.log('==============');
  console.log(`1. Edit backend/.env.${environment} with your configuration`);
  console.log(`2. Edit frontend/.env.${environment} with your configuration`);
  console.log('3. Review ENVIRONMENT_SETUP.md for detailed configuration guide');
  console.log('4. Run the application with the configured environment');

  if (environment === 'development') {
    console.log('\n🚀 Development Quick Start:');
    console.log('===========================');
    console.log('cd backend && npm run dev');
    console.log('cd frontend && npm run dev');
  }

  rl.close();
}

// Generate secure random string for secrets
function generateSecret(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Command line argument handling
const args = process.argv.slice(2);
if (args.includes('--generate-secret')) {
  const length = parseInt(args[args.indexOf('--generate-secret') + 1]) || 32;
  console.log(generateSecret(length));
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('Environment Setup Script');
  console.log('========================');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/setup-env.js                 - Interactive setup');
  console.log('  node scripts/setup-env.js --generate-secret [length] - Generate secure secret');
  console.log('  node scripts/setup-env.js --help          - Show this help');
  process.exit(0);
}

// Run interactive setup
setupEnvironment().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});