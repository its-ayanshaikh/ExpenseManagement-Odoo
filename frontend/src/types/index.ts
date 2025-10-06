// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ApprovalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ApprovalRuleType {
  SEQUENTIAL = 'SEQUENTIAL',
  PERCENTAGE = 'PERCENTAGE',
  SPECIFIC_APPROVER = 'SPECIFIC_APPROVER',
  HYBRID = 'HYBRID'
}

// Core entities
export interface Company {
  id: string
  name: string
  country: string
  defaultCurrency: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  managerId?: string
  isManagerApprover: boolean
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  companyId: string
  submitterId: string
  amount: number
  currency: string
  category: string
  description: string
  expenseDate: string
  receiptUrl?: string
  status: ExpenseStatus
  convertedAmount: number
  convertedCurrency: string
  createdAt: string
  updatedAt: string
  submitter?: User
}

export interface ApprovalRule {
  id: string
  companyId: string
  name: string
  ruleType: ApprovalRuleType
  percentageThreshold?: number
  specificApproverId?: string
  isHybrid: boolean
  priority: number
  approvers: ApprovalRuleApprover[]
  createdAt: string
  updatedAt: string
}

export interface ApprovalRuleApprover {
  id: string
  approvalRuleId: string
  approverId: string
  sequence: number
  createdAt: string
  approver?: User
}

export interface ApprovalRequest {
  id: string
  expenseId: string
  approverId: string
  sequence: number
  status: ApprovalRequestStatus
  comments?: string
  respondedAt?: string
  createdAt: string
  updatedAt: string
  approver?: User
}

export interface ApprovalHistory {
  id: string
  expenseId: string
  actorId: string
  action: string
  comments?: string
  metadata?: Record<string, any>
  createdAt: string
  actor?: User
}

// API DTOs
export interface CreateUserDTO {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  managerId?: string
  isManagerApprover?: boolean
}

export interface UpdateUserDTO {
  firstName?: string
  lastName?: string
  role?: UserRole
  managerId?: string
  isManagerApprover?: boolean
}

export interface CreateExpenseDTO {
  amount: number
  currency: string
  category: string
  description: string
  expenseDate: string
  receiptFile?: File
}

export interface UpdateExpenseDTO {
  amount?: number
  currency?: string
  category?: string
  description?: string
  expenseDate?: string
}

export interface CreateApprovalRuleDTO {
  name: string
  ruleType: ApprovalRuleType
  percentageThreshold?: number
  specificApproverId?: string
  isHybrid?: boolean
  priority: number
  approverIds: string[]
}

export interface UpdateApprovalRuleDTO {
  name?: string
  ruleType?: ApprovalRuleType
  percentageThreshold?: number
  specificApproverId?: string
  isHybrid?: boolean
  priority?: number
  approverIds?: string[]
}

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
  country: string
  currencyCode: string
}

export interface AuthResponse {
  user: User
  company: Company
  accessToken: string
  refreshToken: string
}

// Currency types
export interface CountryCurrency {
  countryName: string
  countryCode: string
  currencies: {
    code: string
    name: string
    symbol?: string
  }[]
}

export interface CurrencyConversion {
  fromCurrency: string
  toCurrency: string
  amount: number
  convertedAmount: number
  exchangeRate: number
}

// OCR types
export interface OCRResult {
  text: string
  confidence: number
}

export interface ExtractedExpenseData {
  amount?: number
  currency?: string
  date?: string
  description?: string
  vendor?: string
  category?: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined
}

// UI state types
export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: string | null
}