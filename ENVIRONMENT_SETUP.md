# Environment Configuration Guide

This document provides comprehensive guidance on setting up environment variables for the Expense Management System.

## Overview

The application uses environment-specific configuration files to manage different deployment scenarios:

- **Development**: `.env.development` - Local development with debug features
- **Production**: `.env.production` - Production deployment with security optimizations
- **Examples**: `.env.example` - Template files with all available options

## Backend Environment Configuration

### Required Environment Variables

The following environment variables are **required** for the backend to function:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development|production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_management
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
```

### Optional Environment Variables

```bash
# Redis Configuration (optional, but recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# External API Configuration
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key
AWS_TEXTRACT_ACCESS_KEY=your_aws_access_key
AWS_TEXTRACT_SECRET_KEY=your_aws_secret_key

# Email Configuration (for future notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
```

### Backend Configuration Files

1. **`.env.development`** - Used when `NODE_ENV=development`
2. **`.env.production`** - Used when `NODE_ENV=production`
3. **`.env.example`** - Template file with all available options

## Frontend Environment Configuration

### Required Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Application Configuration
VITE_APP_NAME=Expense Management System
```

### Optional Environment Variables

```bash
# Feature Flags
VITE_ENABLE_OCR=true
VITE_ENABLE_MULTI_CURRENCY=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_DEBUG_MODE=true

# UI Configuration
VITE_DEFAULT_CURRENCY=USD
VITE_DATE_FORMAT=MM/DD/YYYY
VITE_CURRENCY_DECIMAL_PLACES=2

# Development Tools
VITE_ENABLE_REACT_QUERY_DEVTOOLS=true
VITE_ENABLE_ACCESSIBILITY_TESTING=true
```

### Frontend Configuration Files

1. **`.env.development`** - Development environment settings
2. **`.env.production`** - Production environment settings
3. **`.env.example`** - Template file with all available options

## Setup Instructions

### 1. Development Setup

```bash
# Backend
cd backend
cp .env.example .env.development
# Edit .env.development with your local configuration

# Frontend
cd frontend
cp .env.example .env.development
# Edit .env.development with your local configuration
```

### 2. Production Setup

```bash
# Backend
cd backend
cp .env.example .env.production
# Edit .env.production with your production configuration
# Ensure all secrets are properly set

# Frontend
cd frontend
cp .env.example .env.production
# Edit .env.production with your production configuration
```

### 3. Docker Setup

For Docker deployments, use the `docker-compose.env` file:

```bash
cp docker-compose.env .env
# Edit .env with your Docker-specific configuration
```

## External API Configuration

### Exchange Rate API

The system supports multiple exchange rate providers:

1. **Free Tier**: `https://api.exchangerate-api.com/v4/latest` (no key required, limited requests)
2. **Paid Tier**: Set `EXCHANGE_RATE_API_KEY` for higher limits

### OCR Configuration

The system supports multiple OCR providers:

1. **Tesseract.js** (default): No API key required, runs locally
2. **Google Vision API**: Set `GOOGLE_VISION_API_KEY`
3. **AWS Textract**: Set `AWS_TEXTRACT_ACCESS_KEY`, `AWS_TEXTRACT_SECRET_KEY`, `AWS_TEXTRACT_REGION`

Configure the provider using:
```bash
OCR_PROVIDER=tesseract|google-vision|aws-textract
```

## Security Considerations

### JWT Secrets

- **Development**: Use the provided development secrets
- **Production**: Generate secure, random secrets (minimum 32 characters)
- **Rotation**: Regularly rotate JWT secrets in production

```bash
# Generate secure secrets
openssl rand -base64 32
```

### Database Security

- **Development**: Basic authentication is acceptable
- **Production**: Use strong passwords and enable SSL
- **Network**: Restrict database access to application servers only

### API Keys

- Store API keys securely (environment variables, not in code)
- Use different keys for development and production
- Monitor API usage and set up alerts for unusual activity

## Environment Validation

The backend includes automatic environment validation:

```typescript
import { validateEnvironment, logEnvironmentStatus } from './utils/validateEnvironment';

// Validate configuration on startup
const validation = validateEnvironment();
if (!validation.isValid) {
  console.error('Environment validation failed:', validation.errors);
  process.exit(1);
}

// Log environment status
logEnvironmentStatus();
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check that all required variables are set
   - Verify file names match the expected pattern
   - Ensure environment files are not in `.gitignore`

2. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Ensure database exists and user has proper permissions

3. **Redis Connection Issues**
   - Verify Redis is running
   - Check Redis credentials and network settings
   - Redis is optional but recommended for production

4. **External API Issues**
   - Verify API keys are correct
   - Check API rate limits
   - Ensure network allows outbound connections

### Environment File Loading Order

The application loads environment files in this order:

1. Environment-specific file (`.env.development` or `.env.production`)
2. Default `.env` file (if exists)
3. System environment variables (highest priority)

### Debugging Environment Issues

Enable debug logging to troubleshoot environment issues:

```bash
# Backend
LOG_LEVEL=debug

# Frontend
VITE_ENABLE_DEBUG_MODE=true
```

## Best Practices

1. **Never commit sensitive data** to version control
2. **Use different secrets** for each environment
3. **Regularly rotate** API keys and secrets
4. **Monitor** external API usage and costs
5. **Validate** environment configuration on startup
6. **Document** any custom environment variables
7. **Use secure defaults** for production environments

## Environment Variables Reference

For a complete list of all available environment variables, see:
- `backend/.env.example` - Backend configuration options
- `frontend/.env.example` - Frontend configuration options
- `docker-compose.env` - Docker deployment options