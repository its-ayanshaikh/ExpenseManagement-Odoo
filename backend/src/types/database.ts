// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ExpenseCategory {
  AMOUNT_TO_SUBMIT = 'AMOUNT_TO_SUBMIT',  // Draft expenses
  WAITING_APPROVAL = 'WAITING_APPROVAL',  // Submitted, pending approval
  APPROVED = 'APPROVED',                   // Approved expenses
}

export enum ApprovalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalRuleType {
  SEQUENTIAL = 'SEQUENTIAL',
  PERCENTAGE = 'PERCENTAGE',
  SPECIFIC_APPROVER = 'SPECIFIC_APPROVER',
  HYBRID = 'HYBRID',
}

// Database table interfaces
export interface Company {
  id: string;
  name: string;
  country: string;
  default_currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  manager_id: string | null;
  is_manager_approver: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: string;
  company_id: string;
  submitter_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expense_date: Date;
  receipt_url: string | null;
  status: ExpenseStatus;
  converted_amount: number;
  converted_currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalRule {
  id: string;
  company_id: string;
  name: string;
  rule_type: ApprovalRuleType;
  percentage_threshold: number | null;
  specific_approver_id: string | null;
  is_hybrid: boolean;
  is_sequential_approval: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalRuleApprover {
  id: string;
  approval_rule_id: string;
  approver_id: string;
  is_required: boolean;
  sequence: number;
  created_at: Date;
}

export interface ApprovalRequest {
  id: string;
  expense_id: string;
  approver_id: string;
  sequence: number;
  status: ApprovalRequestStatus;
  comments: string | null;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalHistory {
  id: string;
  expense_id: string;
  actor_id: string;
  action: string;
  comments: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

// Knex table name mapping
declare module 'knex/types/tables' {
  interface Tables {
    companies: Company;
    users: User;
    expenses: Expense;
    approval_rules: ApprovalRule;
    approval_rule_approvers: ApprovalRuleApprover;
    approval_requests: ApprovalRequest;
    approval_history: ApprovalHistory;
  }
}
