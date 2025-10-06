# Quick Start Guide

Get the Expense Management System up and running in minutes.

## Prerequisites Check

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check PostgreSQL (should be 14+)
psql --version

# Check Redis (should be 6+)
redis-cli --version
```

## 5-Minute Setup

### 1. Clone and Install (1 minute)

```bash
git clone <repository-url>
cd expense-management-system
npm run install:all
```

### 2. Environment Setup (2 minutes)

```bash
# Generate JWT secrets
npm run generate:secret

# Copy environment files
cp backend/.env.example backend/.env.development
cp frontend/.env.example frontend/.env.development

# Edit backend/.env.development with:
# - Database credentials
# - Generated JWT secrets
# - Redis connection (or comment out for development)
```

**Minimal backend/.env.development:**
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-refresh-secret>
CORS_ORIGIN=http://localhost:5173
```

**Minimal frontend/.env.development:**
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Database Setup (1 minute)

```bash
# Create database
createdb expense_management

# Run migrations
cd backend
npm run migrate:latest

# Seed development data (optional)
npm run seed:dev
```

### 4. Start Development Servers (1 minute)

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend  
npm run dev:frontend
```

### 5. Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/api/health

## Default Development Credentials

After running seed data:

**Admin User:**
- Email: admin@example.com
- Password: Admin123!

**Manager User:**
- Email: manager@example.com
- Password: Manager123!

**Employee User:**
- Email: employee@example.com
- Password: Employee123!

## Common Commands

### Development

```bash
# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Run linters
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database

```bash
# Run migrations
cd backend
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:make migration_name

# Seed development data
npm run seed:dev
```

### Testing

```bash
# Run backend tests
npm run test:backend

# Run tests in watch mode
cd backend
npm run test:watch

# Run integration tests only
npm run test:integration
```

### Building

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend

# Build everything
npm run build:all

# Production build with checks
npm run build:prod
```

## Troubleshooting

### Database Connection Error

**Error:** `ECONNREFUSED` or `password authentication failed`

**Solution:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check credentials in `.env.development`
3. Ensure database exists: `psql -l`
4. Create database if needed: `createdb expense_management`

### Redis Connection Error

**Error:** `Redis connection failed`

**Solution:**
1. For development, Redis is optional
2. Comment out Redis-related code or install Redis
3. On Windows: Use WSL or Docker for Redis
4. On Mac: `brew install redis && brew services start redis`
5. On Linux: `sudo apt install redis-server && sudo systemctl start redis`

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000

# Kill process or change port in .env
```

### Migration Errors

**Error:** Migration fails

**Solution:**
```bash
# Check migration status
npm run migrate:status

# Rollback and retry
npm run migrate:rollback
npm run migrate:latest

# If stuck, reset database (CAUTION: deletes all data)
dropdb expense_management
createdb expense_management
npm run migrate:latest
```

### Frontend Build Errors

**Error:** TypeScript or build errors

**Solution:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### Module Not Found

**Error:** `Cannot find module`

**Solution:**
```bash
# Reinstall dependencies
npm run install:all

# Or for specific workspace
npm install --workspace=backend
npm install --workspace=frontend
```

## Development Workflow

### 1. Starting a New Feature

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Start development servers
npm run dev:backend
npm run dev:frontend
```

### 2. Making Changes

```bash
# Make your changes
# Backend: backend/src/
# Frontend: frontend/src/

# Run linters
npm run lint

# Fix issues
npm run lint:fix
npm run format
```

### 3. Testing Changes

```bash
# Run tests
npm run test:backend

# Test manually in browser
# http://localhost:5173
```

### 4. Database Changes

```bash
# Create migration
cd backend
npm run migrate:make add_new_column

# Edit migration file in src/db/migrations/

# Run migration
npm run migrate:latest

# Test rollback
npm run migrate:rollback
npm run migrate:latest
```

### 5. Committing Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name
```

## Production Deployment

### Quick Production Deploy

```bash
# 1. Build for production
npm run build:prod

# 2. Review checklist
cat PRODUCTION_CHECKLIST.md

# 3. Deploy (choose one method)

# Option A: Docker
docker-compose -f docker-compose.prod.yml up -d

# Option B: PM2
pm2 start ecosystem.config.js --env production

# Option C: Cloud Platform
# Follow platform-specific instructions in DEPLOYMENT.md
```

### Post-Deployment Verification

```bash
# Check health
curl https://your-domain.com/api/health

# Check frontend
curl https://your-domain.com

# Monitor logs
pm2 logs expense-backend
# or
docker-compose -f docker-compose.prod.yml logs -f
```

## Getting Help

### Check Documentation

1. [README.md](./README.md) - Project overview
2. [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
3. [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Pre-deployment checklist
4. [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) - Performance tips

### Debug Mode

```bash
# Backend with debugging
npm run dev:debug

# Then attach debugger in VS Code or Chrome DevTools
```

### Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Port in use | Change PORT in .env or kill process |
| Database error | Check PostgreSQL is running |
| Redis error | Comment out Redis code for dev |
| Build fails | Clear node_modules and reinstall |
| Migration fails | Check database connection and rollback |
| Frontend blank | Check browser console and API URL |

### Support Channels

- Check existing issues in repository
- Review documentation
- Contact development team
- Create new issue with details

## Next Steps

After getting the system running:

1. ✅ Explore the application features
2. ✅ Review the codebase structure
3. ✅ Read the requirements and design docs in `.kiro/specs/`
4. ✅ Try making a small change
5. ✅ Run tests and ensure they pass
6. ✅ Review deployment documentation

## Useful Links

- [React Documentation](https://react.dev)
- [Express Documentation](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
