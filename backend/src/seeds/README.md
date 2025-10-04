# Database Seed Data

This directory contains comprehensive seed data for the Expense Management System development environment. The seed data creates realistic scenarios that cover all aspects of the system functionality.

## Overview

The seed data includes:
- **3 Companies** with different countries and currencies
- **13 Users** across different roles and companies
- **7 Approval Rules** covering all rule types
- **15 Expenses** with various statuses and scenarios
- **20 Approval Requests** at different stages
- **53 Approval History Records** providing complete audit trails

## Seed Files

### 000_run_all_seeds.ts
Master orchestrator that runs all seed files in the correct dependency order and provides a summary of seeded data.

### 001_sample_companies.ts
Creates three sample companies:
- **TechCorp USA** (USD currency)
- **InnovateLtd UK** (GBP currency)  
- **StartupHub Canada** (CAD currency)

### 002_sample_users.ts
Creates users across all companies with different roles:
- **Admins**: Full system access, can override approvals
- **Managers**: Can approve expenses, manage team members
- **Employees**: Can submit expenses, view own expense history

### 003_sample_approval_rules.ts
Creates various approval rule configurations:
- **Sequential Rules**: Multi-step approval chains
- **Percentage Rules**: Approval based on percentage thresholds
- **Specific Approver Rules**: Auto-approval by designated users
- **Hybrid Rules**: Combination of percentage OR specific approver

### 004_sample_expenses.ts
Creates expenses with diverse scenarios:
- Different currencies (USD, GBP, EUR, CAD)
- Various categories (Travel, Office Supplies, Meals, Training, Equipment)
- Different statuses (Pending, Approved, Rejected)
- Currency conversion examples
- High-value expenses requiring multiple approvals

### 005_sample_approval_requests.ts
Creates approval requests showing:
- Pending approvals awaiting manager action
- Completed approvals with timestamps and comments
- Rejected requests with rejection reasons
- Multi-step approval sequences

### 006_sample_approval_history.ts
Creates comprehensive audit trails including:
- Expense submission events
- Workflow initiation records
- Approval and rejection actions
- Status change tracking
- System notifications
- Admin override actions

## Running Seeds

### Using Knex CLI
```bash
# Run all seeds
npm run seed:run

# Create a new seed file
npm run seed:make seed_name
```

### Using Development Script
```bash
# Run the comprehensive development seeding script
npm run seed:dev
```

### Using Knex Directly
```bash
# Run seeds with specific environment
npx knex seed:run --env development

# Run seeds with custom knexfile
npx knex seed:run --knexfile knexfile.ts
```

## Test Accounts

All users have the password: `password123`

### TechCorp USA
- **Admin**: admin@techcorp.com
- **Manager 1**: manager1@techcorp.com  
- **Manager 2**: manager2@techcorp.com
- **Employees**: employee1@techcorp.com, employee2@techcorp.com, employee3@techcorp.com, employee4@techcorp.com

### InnovateLtd UK
- **Admin**: admin@innovate.co.uk
- **Manager**: manager@innovate.co.uk
- **Employees**: employee1@innovate.co.uk, employee2@innovate.co.uk

### StartupHub Canada
- **Admin**: admin@startuphub.ca
- **Manager**: manager@startuphub.ca
- **Employee**: employee1@startuphub.ca

## Test Scenarios

### 1. Pending Approvals
- Expense #1: $125.50 taxi expense awaiting manager approval
- Expense #4: $250.00 training course awaiting manager approval
- Expense #6: $1,500.00 laptop (high-value) awaiting manager approval
- Expense #8: $120.00 software subscription (UK company, currency conversion)

### 2. Approved Expenses
- Expense #2: Office supplies approved through 2-step process
- Expense #5: Travel expense with EUR→USD conversion
- Expense #7: UK train ticket approved by manager
- Expense #10: Canadian office supplies with 2-step approval
- Expense #12: International hotel with 3-step approval and GBP→USD conversion

### 3. Rejected Expenses
- Expense #3: Meal expense rejected for missing receipt
- Expense #9: Team lunch rejected for lack of pre-approval
- Expense #14: Equipment purchase rejected for exceeding pre-approval threshold

### 4. Multi-Currency Examples
- USD expenses in US company
- GBP expenses in UK company
- EUR expense converted to USD
- USD expense converted to GBP
- USD expense converted to CAD

### 5. Approval Rule Testing
- Sequential approval chains with 2-3 approvers
- Percentage-based rules (50%, 60%, 75% thresholds)
- Specific approver rules (admin override)
- Hybrid rules (percentage OR specific approver)

### 6. Audit Trail Examples
- Complete workflow tracking from submission to final approval
- Rejection workflows with manager comments
- System-generated events and notifications
- Status change tracking
- Currency conversion metadata

## Data Relationships

The seed data maintains proper referential integrity:
- Users belong to companies
- Expenses are submitted by users within their companies
- Approval rules are company-specific
- Approval requests reference valid expenses and approvers
- Approval history tracks all actions with proper actor references
- Manager relationships are properly established

## Development Benefits

This seed data enables testing of:
- **Authentication**: Login with different user roles
- **Authorization**: Role-based access control
- **Expense Submission**: Various currencies and categories
- **Approval Workflows**: Sequential and conditional rules
- **Manager Actions**: Approve/reject with comments
- **Admin Functions**: User management, rule configuration, overrides
- **Multi-Company**: Data isolation between companies
- **Currency Conversion**: Real-world conversion scenarios
- **Audit Trails**: Complete expense lifecycle tracking
- **Error Scenarios**: Rejections, validation failures
- **Edge Cases**: High-value expenses, missing receipts

## Maintenance

When adding new seed data:
1. Follow the existing naming convention (###_description.ts)
2. Maintain referential integrity with existing data
3. Update the master seed file (000_run_all_seeds.ts) if needed
4. Update this README with new scenarios
5. Test the complete seeding process

## Cleanup

To reset the database:
```bash
# Rollback all migrations (clears all data)
npm run migrate:rollback

# Re-run migrations
npm run migrate:latest

# Re-seed data
npm run seed:dev
```