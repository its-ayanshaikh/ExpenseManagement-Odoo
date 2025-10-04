# Database Migrations

This directory contains Knex.js migrations for the Expense Management System database.

## Migration Order

Migrations are executed in the following order (based on timestamp prefixes):

1. `20240101000001_create_companies_table.ts` - Creates the companies table
2. `20240101000002_create_users_table.ts` - Creates the users table with role enum and manager relationship
3. `20240101000003_create_expenses_table.ts` - Creates the expenses table with multi-currency support
4. `20240101000004_create_approval_rules_table.ts` - Creates the approval_rules table
5. `20240101000005_create_approval_rule_approvers_table.ts` - Creates the approval_rule_approvers junction table
6. `20240101000006_create_approval_requests_table.ts` - Creates the approval_requests table
7. `20240101000007_create_approval_history_table.ts` - Creates the approval_history audit table

## Running Migrations

### Prerequisites

1. Ensure PostgreSQL is installed and running
2. Create a database (e.g., `expense_management`)
3. Copy `.env.example` to `.env` and configure database credentials

### Commands

```bash
# Run all pending migrations
npm run migrate:latest

# Rollback the last batch of migrations
npm run migrate:rollback

# Check migration status
npm run migrate:status

# Create a new migration
npm run migrate:make migration_name
```

## Database Schema Overview

### Tables

- **companies**: Stores company information with default currency
- **users**: Stores user accounts with roles (ADMIN, MANAGER, EMPLOYEE) and manager relationships
- **expenses**: Stores expense submissions with original and converted amounts
- **approval_rules**: Defines approval workflow rules (SEQUENTIAL, PERCENTAGE, SPECIFIC_APPROVER, HYBRID)
- **approval_rule_approvers**: Junction table for sequential approval workflows
- **approval_requests**: Tracks individual approval requests for expenses
- **approval_history**: Audit trail for all expense-related actions

### Indexes

All foreign keys are indexed for optimal query performance. Additional indexes are created on:
- Frequently queried columns (status, dates, roles)
- Composite indexes for common query patterns
- Unique constraints where appropriate

## Notes

- All tables use UUID primary keys with `gen_random_uuid()` for security
- Timestamps are automatically managed with `created_at` and `updated_at`
- Enum types are used for status fields to ensure data integrity
- Cascade deletes are configured for parent-child relationships
- Foreign key constraints ensure referential integrity
