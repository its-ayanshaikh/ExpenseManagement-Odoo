#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateEnvironmentFiles() {
  console.log('🔍 Validating Environment Configuration');
  console.log('======================================\n');

  const results = {
    backend: { development: false, production: false, example: false },
    frontend: { development: false, production: false, example: false },
    errors: [],
    warnings: []
  };

  // Check backend environment files
  const backendDir = path.join(__dirname, '..', 'backend');
  const backendFiles = ['.env.development', '.env.production', '.env.example'];
  
  backendFiles.forEach(file => {
    const filePath = path.join(backendDir, file);
    const exists = fs.existsSync(filePath);
    const envType = file.replace('.env.', '').replace('.env', 'example');
    results.backend[envType] = exists;
    
    if (exists) {
      console.log(`✅ Backend ${file} exists`);
      
      // Basic validation of required variables
      const content = fs.readFileSync(filePath, 'utf8');
      const requiredVars = ['PORT', 'NODE_ENV', 'DB_HOST', 'JWT_SECRET'];
      
      requiredVars.forEach(varName => {
        if (!content.includes(varName)) {
          results.errors.push(`Backend ${file} missing required variable: ${varName}`);
        }
      });
      
      // Check for default/insecure values in production
      if (file === '.env.production') {
        if (content.includes('change_in_production')) {
          results.warnings.push('Backend .env.production contains default values that should be changed');
        }
        if (content.includes('localhost')) {
          results.warnings.push('Backend .env.production contains localhost references');
        }
      }
    } else {
      console.log(`❌ Backend ${file} missing`);
      results.errors.push(`Backend ${file} not found`);
    }
  });

  // Check frontend environment files
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const frontendFiles = ['.env.development', '.env.production', '.env.example'];
  
  frontendFiles.forEach(file => {
    const filePath = path.join(frontendDir, file);
    const exists = fs.existsSync(filePath);
    const envType = file.replace('.env.', '').replace('.env', 'example');
    results.frontend[envType] = exists;
    
    if (exists) {
      console.log(`✅ Frontend ${file} exists`);
      
      // Basic validation of required variables
      const content = fs.readFileSync(filePath, 'utf8');
      const requiredVars = ['VITE_API_BASE_URL', 'VITE_APP_NAME'];
      
      requiredVars.forEach(varName => {
        if (!content.includes(varName)) {
          results.errors.push(`Frontend ${file} missing required variable: ${varName}`);
        }
      });
      
      // Check for localhost in production
      if (file === '.env.production' && content.includes('localhost')) {
        results.warnings.push('Frontend .env.production contains localhost references');
      }
    } else {
      console.log(`❌ Frontend ${file} missing`);
      results.errors.push(`Frontend ${file} not found`);
    }
  });

  // Check for configuration utility files
  const configFiles = [
    { path: path.join(backendDir, 'src', 'config', 'environment.ts'), name: 'Backend environment config' },
    { path: path.join(frontendDir, 'src', 'config', 'environment.ts'), name: 'Frontend environment config' },
    { path: path.join(__dirname, '..', 'ENVIRONMENT_SETUP.md'), name: 'Environment setup documentation' }
  ];

  configFiles.forEach(({ path: filePath, name }) => {
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${name} exists`);
    } else {
      console.log(`❌ ${name} missing`);
      results.errors.push(`${name} not found`);
    }
  });

  // Display results
  console.log('\n📊 Validation Summary');
  console.log('====================');
  
  if (results.errors.length === 0) {
    console.log('✅ All environment files are properly configured');
  } else {
    console.log('❌ Environment validation failed:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('\n📋 Environment Files Status:');
  console.log(`Backend: Dev=${results.backend.development ? '✅' : '❌'} Prod=${results.backend.production ? '✅' : '❌'} Example=${results.backend.example ? '✅' : '❌'}`);
  console.log(`Frontend: Dev=${results.frontend.development ? '✅' : '❌'} Prod=${results.frontend.production ? '✅' : '❌'} Example=${results.frontend.example ? '✅' : '❌'}`);

  return results.errors.length === 0;
}

function showHelp() {
  console.log('Environment Validation Script');
  console.log('============================');
  console.log('');
  console.log('This script validates that all required environment files exist');
  console.log('and contain the necessary configuration variables.');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/validate-env.js     - Run validation');
  console.log('  node scripts/validate-env.js -h  - Show this help');
}

// Command line argument handling
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run validation
const isValid = validateEnvironmentFiles();
process.exit(isValid ? 0 : 1);