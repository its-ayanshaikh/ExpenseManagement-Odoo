# Database Setup Guide

This guide will help you set up the PostgreSQL database for the Expense Management System.

## Prerequisites

- PostgreSQL 12 or higher installed
- Node.js 18 or higher installed
- Access to create databases

## Step 1: Install PostgreSQL

### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Step 2: Create Database

Connect to PostgreSQL and create the database:

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create database
CREATE DATABASE expense_management;

# Create a user (optional, for better security)
CREATE USER expense_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE expense_management TO expense_user;

# Exit psql
\q
```

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` and update the database configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_management
DB_USER=postgres
DB_PASSWORD=your_password_here
```

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

## Step 5: Run Migrations

Run the database migrations to create all tables:

```bash
npm run migrate:latest
```

You should see output like:
```
Batch 1 run: 7 migrations
✓ Database migration completed successfully
```

## Step 6: Verify Setup

Check the migration status:

```bash
npm run migrate:status
```

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000/health` to verify the database connection.

## Database Schema

The following tables will be created:

1. **companies** - Company information with default currency
2. **users** - User accounts with roles and manager relationships
3. **expenses** - Expense submissions with multi-currency support
4. **approval_rules** - Approval workflow configuration
5. **approval_rule_approvers** - Sequential approval workflow definitions
6. **approval_requests** - Individual approval requests
7. **approval_history** - Audit trail for all actions

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or check Services (Windows)
- Verify the port is correct (default: 5432)
- Check firewall settings

### Authentication Failed
- Verify username and password in `.env`
- Check PostgreSQL authentication settings in `pg_hba.conf`

### Migration Errors
- Ensure the database exists
- Check that the user has proper permissions
- Verify no tables exist with the same names

### Rollback Migrations
If you need to rollback migrations:

```bash
# Rollback last batch
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback --all
```

## Useful Commands

```bash
# Check current migration version
npm run migrate:status

# Create a new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate:latest

# Rollback last batch
npm run migrate:rollback
```

## Database Management Tools

Recommended tools for managing your PostgreSQL database:

- **pgAdmin** - Full-featured GUI (https://www.pgadmin.org/)
- **DBeaver** - Universal database tool (https://dbeaver.io/)
- **TablePlus** - Modern database GUI (https://tableplus.com/)
- **psql** - Command-line interface (included with PostgreSQL)

## Next Steps

After setting up the database:

1. Review the database schema in `src/migrations/`
2. Check the type definitions in `src/types/database.ts`
3. Proceed with implementing the authentication system (Task 3)
4. Create seed data for development (Task 25)
