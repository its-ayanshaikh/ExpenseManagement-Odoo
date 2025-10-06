#!/usr/bin/env node

/**
 * Production Build Script
 * Builds both backend and frontend with production optimizations
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function exec(command, cwd = process.cwd()) {
  try {
    log(`\n▶ ${command}`, colors.blue)
    execSync(command, { cwd, stdio: 'inherit' })
    return true
  } catch (error) {
    log(`✗ Command failed: ${command}`, colors.red)
    return false
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description} exists`, colors.green)
    return true
  } else {
    log(`✗ ${description} not found at ${filePath}`, colors.red)
    return false
  }
}

async function main() {
  log('\n🚀 Starting Production Build\n', colors.green)

  // Step 1: Validate environment files
  log('\n📋 Step 1: Validating environment files', colors.yellow)
  const backendEnv = checkFile('backend/.env.production', 'Backend production env')
  const frontendEnv = checkFile('frontend/.env.production', 'Frontend production env')

  if (!backendEnv || !frontendEnv) {
    log('\n⚠️  Warning: Production environment files not found', colors.yellow)
    log('Copy .env.production.example files and configure them', colors.yellow)
  }

  // Step 2: Install dependencies
  log('\n📦 Step 2: Installing dependencies', colors.yellow)
  if (!exec('npm ci')) {
    log('\n✗ Build failed at dependency installation', colors.red)
    process.exit(1)
  }

  // Step 3: Run linting
  log('\n🔍 Step 3: Running linters', colors.yellow)
  if (!exec('npm run lint')) {
    log('\n⚠️  Linting issues found. Fix them before deploying.', colors.yellow)
  }

  // Step 4: Run tests
  log('\n🧪 Step 4: Running tests', colors.yellow)
  if (!exec('npm run test:backend -- --run')) {
    log('\n⚠️  Tests failed. Review before deploying.', colors.yellow)
  }

  // Step 5: Build backend
  log('\n🔨 Step 5: Building backend', colors.yellow)
  if (!exec('npm run build:backend')) {
    log('\n✗ Backend build failed', colors.red)
    process.exit(1)
  }

  // Verify backend build
  if (!checkFile('backend/dist/index.js', 'Backend build output')) {
    log('\n✗ Backend build verification failed', colors.red)
    process.exit(1)
  }

  // Step 6: Build frontend
  log('\n🔨 Step 6: Building frontend', colors.yellow)
  if (!exec('npm run build:frontend')) {
    log('\n✗ Frontend build failed', colors.red)
    process.exit(1)
  }

  // Verify frontend build
  if (!checkFile('frontend/dist/index.html', 'Frontend build output')) {
    log('\n✗ Frontend build verification failed', colors.red)
    process.exit(1)
  }

  // Step 7: Analyze bundle sizes
  log('\n📊 Step 7: Analyzing build output', colors.yellow)
  
  const backendSize = getDirectorySize('backend/dist')
  const frontendSize = getDirectorySize('frontend/dist')
  
  log(`Backend build size: ${formatBytes(backendSize)}`, colors.blue)
  log(`Frontend build size: ${formatBytes(frontendSize)}`, colors.blue)

  // Step 8: Success
  log('\n✓ Production build completed successfully!', colors.green)
  log('\n📦 Build artifacts:', colors.blue)
  log('  - Backend: backend/dist/', colors.blue)
  log('  - Frontend: frontend/dist/', colors.blue)
  log('\n📚 Next steps:', colors.yellow)
  log('  1. Review DEPLOYMENT.md for deployment instructions')
  log('  2. Check PRODUCTION_CHECKLIST.md before deploying')
  log('  3. Test the build locally with: npm run preview:frontend')
  log('  4. Deploy to your hosting provider')
}

function getDirectorySize(dirPath) {
  let size = 0
  
  if (!fs.existsSync(dirPath)) {
    return 0
  }

  const files = fs.readdirSync(dirPath)
  
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stats = fs.statSync(filePath)
    
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath)
    } else {
      size += stats.size
    }
  }
  
  return size
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Run the build
main().catch(error => {
  log(`\n✗ Build failed with error: ${error.message}`, colors.red)
  process.exit(1)
})
