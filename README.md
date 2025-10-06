# Expense Management System

A comprehensive expense management system with automated approval workflows, multi-level approvals, OCR receipt scanning, and multi-currency support.

## Features

- 🔐 **Role-Based Access Control** - Admin, Manager, and Employee roles with specific permissions
- 📝 **Expense Submission** - Submit expenses with multi-currency support
- 🔄 **Approval Workflows** - Sequential and conditional approval rules
- 📸 **OCR Receipt Scanning** - Automatic data extraction from receipt images
- 💱 **Multi-Currency Support** - Real-time currency conversion with caching
- 📊 **Audit Trail** - Complete tracking of all expense state changes
- 🎨 **Modern UI** - Responsive React interface with accessibility features

## Project Structure

```
expense-management-system/
├── backend/          # Node.js/Express backend
│   ├── src/         # Source code
│   ├── dist/        # Compiled JavaScript (production)
│   └── uploads/     # Receipt uploads
├── frontend/         # React frontend
│   ├── src/         # Source code
│   └── dist/        # Production build
├── scripts/         # Build and deployment scripts
├── .kiro/          # Kiro specs and configuration
└── docs/           # Additional documentation
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Git

## Quick Start

### Development Setup

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Set up environment variables:**
```bash
# Backend
cp backend/.env.example backend/.env.development
# Edit backend/.env.development with your configuration

# Frontend
cp frontend/.env.example frontend/.env.development
# Edit frontend/.env.development with your configuration
```

3. **Set up the database:**
```bash
# Create PostgreSQL database
createdb expense_management

# Run migrations
cd backend
npm run migrate:latest
```

4. **Seed development data (optional):**
```bash
npm run seed:dev
```

### Running Development Servers

Start both backend and frontend:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Production Deployment

### Quick Production Build

```bash
npm run build:prod
```

This will:
- Validate environment files
- Run linters and tests
- Build backend and frontend
- Analyze bundle sizes

### Deployment Options

1. **Docker Compose** (Recommended)
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Traditional Server with PM2**
   ```bash
   npm run build:all
   pm2 start ecosystem.config.js --env production
   ```

3. **Cloud Platforms** (Heroku, Railway, Render, etc.)
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions

### Pre-Deployment Checklist

Before deploying to production, review:
- ✅ [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Complete readiness checklist
- 📚 [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide

## Development

Run backend and frontend in separate terminals:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

Backend will run on http://localhost:3000
Frontend will run on http://localhost:5173

### Building for Production

```bash
npm run build:backend
npm run build:frontend
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format all code
npm run format
```

## Technology Stack

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL with Knex.js
- Redis for caching
- JWT authentication
- Bcrypt for password hashing

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- TanStack Query for state management
- React Hook Form with Zod validation

## Features

- Multi-level approval workflows
- Conditional approval rules
- OCR receipt scanning
- Multi-currency support with real-time conversion
- Role-based access control (Admin, Manager, Employee)
- Comprehensive audit trail

## Documentation

See `.kiro/specs/expense-management-system/` for detailed:
- Requirements document
- Design document
- Implementation tasks

## License

Private - All rights reserved
