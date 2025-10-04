import { config } from '../config/environment';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required configurations
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (!config.jwt.refreshSecret || config.jwt.refreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
  }

  if (config.nodeEnv === 'production') {
    // Production-specific validations
    if (config.jwt.secret.includes('dev_') || config.jwt.secret.includes('change_in_production')) {
      errors.push('JWT_SECRET must be changed from default value in production');
    }

    if (config.jwt.refreshSecret.includes('dev_') || config.jwt.refreshSecret.includes('change_in_production')) {
      errors.push('JWT_REFRESH_SECRET must be changed from default value in production');
    }

    if (!config.database.ssl) {
      warnings.push('Database SSL is disabled in production environment');
    }

    if (!config.externalApis.exchangeRate.apiKey) {
      warnings.push('Exchange Rate API key is not configured - rate limiting may apply');
    }

    if (config.externalApis.ocr.provider !== 'tesseract' && !config.externalApis.ocr.apiKey) {
      warnings.push(`OCR provider ${config.externalApis.ocr.provider} requires API key configuration`);
    }
  }

  // Validate database configuration
  if (!config.database.host || !config.database.name || !config.database.user) {
    errors.push('Database configuration is incomplete');
  }

  // Validate Redis configuration
  if (!config.redis.host) {
    errors.push('Redis host is not configured');
  }

  // Validate file upload configuration
  if (config.fileUpload.maxFileSize > 10 * 1024 * 1024) { // 10MB
    warnings.push('File upload size limit is very high - consider security implications');
  }

  // Validate CORS configuration
  if (config.nodeEnv === 'production' && config.cors.origin === 'http://localhost:5173') {
    warnings.push('CORS origin is set to localhost in production environment');
  }

  // Validate security configuration
  if (config.security.bcryptRounds < 10) {
    warnings.push('BCrypt rounds is set below recommended minimum of 10');
  }

  if (config.security.rateLimit.maxRequests > 1000) {
    warnings.push('Rate limit is set very high - consider security implications');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();
  
  console.log('🔧 Environment Configuration Status:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`   OCR Provider: ${config.externalApis.ocr.provider}`);
  
  if (validation.errors.length > 0) {
    console.error('❌ Environment Validation Errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment Validation Warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ Environment configuration is valid');
  }
}