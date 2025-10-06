import { api } from './api'
import {
  Expense,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ApprovalHistory
} from '../types'

export class ExpenseService {
  // Submit new expense (Employee)
  async createExpense(expenseData: CreateExpenseDTO): Promise<Expense> {
    if (expenseData.receiptFile) {
      // If there's a receipt file, use form data
      const formData = new FormData()
      formData.append('amount', expenseData.amount.toString())
      formData.append('currency', expenseData.currency)
      formData.append('category', expenseData.category)
      formData.append('description', expenseData.description)
      formData.append('expenseDate', expenseData.expenseDate)
      formData.append('receipt', expenseData.receiptFile)

      const response = await api.post<{
        status: string
        message: string
        data: { expense: Expense }
      }>('/expenses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.expense
    } else {
      // No receipt file, send as JSON
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { receiptFile, ...data } = expenseData
      const response = await api.post<{
        status: string
        message: string
        data: { expense: Expense }
      }>('/expenses', data)
      return response.data.expense
    }
  }

  // Get expenses (filtered by role)
  async getExpenses(): Promise<Expense[]> {
    const response = await api.get<{
      status: string
      message: string
      data: {
        expenses: Expense[]
        count: number
      }
    }>('/expenses')
    return response.data.expenses
  }

  // Get expense by ID
  async getExpenseById(id: string): Promise<Expense> {
    const response = await api.get<{
      status: string
      message: string
      data: {
        expense: Expense
      }
    }>(`/expenses/${id}`)
    return response.data.expense
  }

  // Update expense (Employee, before approval)
  async updateExpense(id: string, expenseData: UpdateExpenseDTO): Promise<Expense> {
    const response = await api.put<{
      status: string
      message: string
      data: { expense: Expense }
    }>(`/expenses/${id}`, expenseData)
    return response.data.expense
  }

  // Delete expense (Employee, before approval)
  async deleteExpense(id: string): Promise<void> {
    return api.delete<void>(`/expenses/${id}`)
  }

  // Approve expense (Manager/Admin)
  async approveExpense(id: string, comments?: string): Promise<void> {
    return api.post<void>(`/expenses/${id}/approve`, { comments })
  }

  // Reject expense (Manager/Admin)
  async rejectExpense(id: string, comments: string): Promise<void> {
    return api.post<void>(`/expenses/${id}/reject`, { comments })
  }

  // Get approval history for expense
  async getApprovalHistory(id: string): Promise<ApprovalHistory[]> {
    const response = await api.get<{
      status: string
      message: string
      data: {
        history: ApprovalHistory[]
        count: number
      }
    }>(`/expenses/${id}/history`)
    return response.data.history
  }

  // Get expenses pending approval for current user (Manager/Admin only)
  async getPendingApprovals(): Promise<Expense[]> {
    const response = await api.get<{
      status: string
      message: string
      data: {
        expenses: Expense[]
        count: number
      }
    }>('/expenses/pending-approvals')
    return response.data.expenses
  }

  // Get expenses from manager's direct reports
  async getTeamExpenses(filters?: { status?: string; startDate?: string; endDate?: string }): Promise<Expense[]> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)

    const queryString = params.toString()
    const response = await api.get<{
      status: string
      message: string
      data: {
        expenses: Expense[]
        count: number
      }
    }>(`/expenses${queryString ? `?${queryString}` : ''}`)
    return response.data.expenses
  }

  // Get all company expenses with filters (Admin only)
  async getAllCompanyExpenses(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    submitterId?: string
  }): Promise<Expense[]> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.submitterId) params.append('submitterId', filters.submitterId)

    const queryString = params.toString()
    const response = await api.get<{
      status: string
      message: string
      data: {
        expenses: Expense[]
        count: number
      }
    }>(`/expenses${queryString ? `?${queryString}` : ''}`)
    return response.data.expenses
  }

  // Admin override approve expense (Admin only)
  async adminOverrideApprove(id: string, comments: string): Promise<void> {
    return api.post<void>(`/expenses/${id}/override-approve`, { comments })
  }

  // Admin override reject expense (Admin only)
  async adminOverrideReject(id: string, comments: string): Promise<void> {
    return api.post<void>(`/expenses/${id}/override-reject`, { comments })
  }
}

export const expenseService = new ExpenseService()