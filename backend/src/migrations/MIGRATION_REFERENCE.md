# Migration Reference

## Table Relationships

```
companies (1) ──< (N) users
companies (1) ──< (N) expenses
companies (1) ──< (N) approval_rules

users (1) ──< (N) users (manager relationship)
users (1) ──< (N) expenses (submitter)
users (1) ──< (N) approval_requests (approver)
users (1) ──< (N) approval_history (actor)
users (1) ──< (N) approval_rule_approvers (approver)

expenses (1) ──< (N) approval_requests
expenses (1) ──< (N) approval_history

approval_rules (1) ──< (N) approval_rule_approvers
```

## Enum Types

### user_role
- `ADMIN` - Full system access, can manage users and configure rules
- `MANAGER` - Can approve expenses and view team expenses
- `EMPLOYEE` - Can submit expenses and view own expenses

### expense_status
- `PENDING` - Expense submitted, awaiting approval
- `APPROVED` - Expense approved by all required approvers
- `REJECTED` - Expense rejected by an approver

### approval_request_status
- `PENDING` - Approval request awaiting response
- `APPROVED` - Approver has approved
- `REJECTED` - Approver has rejected

### approval_rule_type
- `SEQUENTIAL` - Approvers must approve in sequence
- `PERCENTAGE` - Auto-approve when percentage threshold met
- `SPECIFIC_APPROVER` - Auto-approve when specific approver approves
- `HYBRID` - Combination of percentage OR specific approver

## Key Indexes

### Performance Indexes
- `companies.name` - For company search
- `users.email` - For login lookups
- `users.role` - For role-based queries
- `expenses.status` - For filtering by status
- `expenses.expense_date` - For date range queries

### Composite Indexes
- `users(company_id, email)` - Unique constraint and fast lookup
- `expenses(company_id, status)` - Admin view filtering
- `expenses(submitter_id, status)` - Employee view filtering
- `approval_requests(approver_id, status)` - Manager pending approvals
- `approval_requests(expense_id, sequence)` - Workflow processing

### Foreign Key Indexes
All foreign key columns are indexed for optimal join performance:
- `users.company_id`
- `users.manager_id`
- `expenses.company_id`
- `expenses.submitter_id`
- `approval_rules.company_id`
- `approval_rule_approvers.approval_rule_id`
- `approval_rule_approvers.approver_id`
- `approval_requests.expense_id`
- `approval_requests.approver_id`
- `approval_history.expense_id`
- `approval_history.actor_id`

## Cascade Behaviors

### ON DELETE CASCADE
- When a company is deleted, all related users, expenses, and approval rules are deleted
- When an expense is deleted, all related approval requests and history are deleted
- When an approval rule is deleted, all related approvers are deleted

### ON DELETE SET NULL
- When a user is deleted, their manager_id references are set to NULL
- When a user is deleted, their specific_approver_id in approval rules is set to NULL

## Data Integrity Constraints

### Unique Constraints
- `users(company_id, email)` - Email must be unique within a company
- `approval_rule_approvers(approval_rule_id, approver_id)` - No duplicate approvers in a rule
- `approval_rule_approvers(approval_rule_id, sequence)` - No duplicate sequence numbers in a rule

### Check Constraints (enforced at application level)
- `approval_rules.percentage_threshold` - Must be between 1 and 100 when rule_type is PERCENTAGE or HYBRID
- `expenses.amount` - Must be positive
- `expenses.converted_amount` - Must be positive

## Migration Best Practices

1. **Never modify existing migrations** - Create new migrations for schema changes
2. **Test rollbacks** - Ensure down() functions work correctly
3. **Use transactions** - Knex wraps migrations in transactions by default
4. **Backup before production migrations** - Always backup production data
5. **Run migrations in staging first** - Test in non-production environment

## Common Queries

### Get user with company info
```sql
SELECT u.*, c.name as company_name, c.default_currency
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.id = ?;
```

### Get expenses with submitter info
```sql
SELECT e.*, u.first_name, u.last_name, u.email
FROM expenses e
JOIN users u ON e.submitter_id = u.id
WHERE e.company_id = ?
ORDER BY e.created_at DESC;
```

### Get pending approvals for a manager
```sql
SELECT e.*, ar.*, u.first_name as submitter_first_name
FROM approval_requests ar
JOIN expenses e ON ar.expense_id = e.id
JOIN users u ON e.submitter_id = u.id
WHERE ar.approver_id = ?
AND ar.status = 'PENDING'
ORDER BY ar.created_at ASC;
```

### Get approval history for an expense
```sql
SELECT ah.*, u.first_name, u.last_name, u.role
FROM approval_history ah
JOIN users u ON ah.actor_id = u.id
WHERE ah.expense_id = ?
ORDER BY ah.created_at ASC;
```
