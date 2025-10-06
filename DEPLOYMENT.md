# Deployment Guide

This guide covers deploying the Expense Management System to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Software

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Git

### Required Accounts/Services

- Domain name and DNS access
- SSL certificate (Let's Encrypt recommended)
- Cloud hosting provider (AWS, DigitalOcean, Heroku, etc.)
- External API keys:
  - Exchange Rate API key (from https://exchangerate-api.com)
  - OCR service credentials (if using cloud OCR)

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd expense-management-system
npm run install:all
```

### 2. Configure Environment Variables

#### Backend Environment (.env.production)

Create `backend/.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=expense_management_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_SSL=true

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# JWT Configuration
JWT_SECRET=your-very-long-random-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-very-long-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# External APIs
EXCHANGE_RATE_API_KEY=your-api-key
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Logging
LOG_LEVEL=info
```

#### Frontend Environment (.env.production)

Create `frontend/.env.production`:

```bash
# API Configuration
VITE_API_BASE_URL=https://api.yourdomain.com

# Feature Flags
VITE_ENABLE_DEV_TOOLS=false
VITE_ENABLE_ACCESSIBILITY_TESTER=false

# External Services
VITE_OCR_ENABLED=true
VITE_CURRENCY_API_ENABLED=true

# Logging
VITE_LOG_LEVEL=error
```

### 3. Generate Secrets

```bash
npm run generate:secret
```

Copy the generated secrets to your environment files.

## Database Setup

### 1. Create Production Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE expense_management_prod;
CREATE USER expense_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE expense_management_prod TO expense_user;
```

### 2. Run Migrations

```bash
cd backend
npm run migrate:latest
```

### 3. Verify Database

```bash
npm run migrate:status
```

## Backend Deployment

### Option 1: Traditional Server (PM2)

#### 1. Build Backend

```bash
cd backend
npm run build
```

#### 2. Install PM2

```bash
npm install -g pm2
```

#### 3. Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'expense-backend',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

#### 4. Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --workspace=backend --only=production

# Copy backend source
COPY backend ./backend

# Build backend
WORKDIR /app/backend
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### 2. Build and Run

```bash
docker build -t expense-backend -f backend/Dockerfile .
docker run -d -p 3000:3000 --env-file backend/.env.production expense-backend
```

### Option 3: Cloud Platform (Heroku, Railway, Render)

Follow platform-specific deployment guides. Generally:

1. Connect repository
2. Set environment variables in platform dashboard
3. Configure build command: `npm run build:backend`
4. Configure start command: `npm run start:backend`
5. Deploy

## Frontend Deployment

### 1. Build Frontend

```bash
cd frontend
npm run build
```

This creates optimized production files in `frontend/dist/`.

### Option 1: Static Hosting (Netlify, Vercel, Cloudflare Pages)

#### Netlify

1. Connect repository
2. Set build command: `npm run build:frontend`
3. Set publish directory: `frontend/dist`
4. Add environment variables
5. Deploy

#### Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

#### Cloudflare Pages

1. Connect repository
2. Set build command: `npm run build --workspace=frontend`
3. Set output directory: `frontend/dist`
4. Deploy

### Option 2: Traditional Server (Nginx)

#### 1. Copy Build Files

```bash
scp -r frontend/dist/* user@server:/var/www/expense-app/
```

#### 2. Configure Nginx

Create `/etc/nginx/sites-available/expense-app`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Root directory
    root /var/www/expense-app;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 3. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/expense-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: Docker + Nginx

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci --workspace=frontend

COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check backend health
curl https://api.yourdomain.com/api/health

# Check frontend
curl https://yourdomain.com
```

### 2. Test Critical Flows

- [ ] User signup and company creation
- [ ] User login
- [ ] Expense submission
- [ ] Approval workflow
- [ ] Currency conversion
- [ ] OCR receipt scanning

### 3. Set Up SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
sudo certbot renew --dry-run
```

### 4. Configure Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 5. Set Up Backups

#### Database Backups

Create backup script `scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="expense_management_prod"

mkdir -p $BACKUP_DIR

pg_dump -U expense_user -h localhost $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

Add to crontab:

```bash
0 2 * * * /path/to/scripts/backup-db.sh
```

## Monitoring and Maintenance

### 1. Application Monitoring

#### PM2 Monitoring

```bash
pm2 monit
pm2 logs expense-backend
```

#### Health Check Endpoint

The backend includes a health check at `/api/health`. Set up monitoring:

- UptimeRobot
- Pingdom
- StatusCake

### 2. Log Management

#### Backend Logs

```bash
# View logs
pm2 logs expense-backend

# Clear logs
pm2 flush
```

#### Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 3. Performance Monitoring

Consider integrating:

- **Sentry** for error tracking
- **New Relic** or **DataDog** for APM
- **Google Analytics** for user analytics

### 4. Database Maintenance

```bash
# Vacuum database
psql -U expense_user -d expense_management_prod -c "VACUUM ANALYZE;"

# Check database size
psql -U expense_user -d expense_management_prod -c "SELECT pg_size_pretty(pg_database_size('expense_management_prod'));"
```

### 5. Security Updates

```bash
# Update dependencies
npm audit
npm audit fix

# Update system packages
sudo apt update
sudo apt upgrade
```

### 6. Scaling Considerations

#### Horizontal Scaling

- Use load balancer (Nginx, HAProxy, AWS ELB)
- Run multiple backend instances
- Use Redis for session storage
- Consider CDN for frontend assets

#### Database Scaling

- Set up read replicas
- Implement connection pooling
- Add database indexes for slow queries
- Consider partitioning large tables

## Rollback Procedure

If deployment fails:

### 1. Backend Rollback

```bash
# With PM2
pm2 stop expense-backend
git checkout <previous-commit>
cd backend
npm run build
pm2 restart expense-backend

# With Docker
docker stop expense-backend
docker run -d <previous-image-tag>
```

### 2. Frontend Rollback

```bash
# Restore previous build
cp -r /var/www/expense-app-backup/* /var/www/expense-app/
sudo systemctl reload nginx
```

### 3. Database Rollback

```bash
cd backend
npm run migrate:rollback
```

## Troubleshooting

### Common Issues

#### Backend won't start

- Check environment variables
- Verify database connection
- Check Redis connection
- Review logs: `pm2 logs expense-backend`

#### Frontend shows blank page

- Check browser console for errors
- Verify API_BASE_URL in environment
- Check CORS configuration
- Verify Nginx configuration

#### Database connection errors

- Verify credentials
- Check firewall rules
- Ensure PostgreSQL is running
- Check SSL/TLS settings

#### High memory usage

- Increase server resources
- Optimize database queries
- Check for memory leaks
- Review PM2 cluster settings

## Support

For issues or questions:

- Check logs first
- Review this documentation
- Contact development team
- Create issue in repository

## Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] SSL certificates installed
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Health checks passing
- [ ] All critical flows tested
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Team trained on deployment process
