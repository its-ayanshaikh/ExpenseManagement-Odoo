# Expense Management System

A comprehensive expense management system with automated approval workflows, multi-level approvals, OCR receipt scanning, and multi-currency support.

## Project Structure

```
expense-management-system/
├── backend/          # Node.js/Express backend
├── frontend/         # React frontend
└── .kiro/           # Kiro specs and configuration
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

## Getting Started

### Installation

1. Install dependencies for all workspaces:
```bash
npm run install:all
```

2. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

3. Set up the database:
```bash
# Create PostgreSQL database
createdb expense_management

# Run migrations (after implementing task 2)
cd backend
npm run migrate
```

### Development

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
