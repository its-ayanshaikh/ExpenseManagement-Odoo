import { Expense } from '../models/Expense';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { WorkflowEngine } from './WorkflowEngine';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { ExpenseStatus, ExpenseCategory, UserRole } from '../types/database';
import { db } from '../config/database';
import { CurrencyService } from './CurrencyService';

export interface CreateExpenseDTO {
  submitterId: string;
  companyId: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expenseDate: Date;
  receiptUrl?: string;
}

export interface UpdateExpenseDTO {
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  expenseDate?: Date;
  receiptUrl?: string;
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  startDate?: Date;
  endDate?: Date;
  submitterId?: string;
  category?: string;
}

export class ExpenseService {
  /**
   * Save expense as draft without submitting for approval
   * @param data - Expense creation data
   * @returns Promise<Expense> - Created draft expense
   */
  public static async saveDraftExpense(data: CreateExpenseDTO): Promise<Expense> {
    // Validate submitter exists and belongs to the company
    const submitter = await User.findById(data.submitterId);
    if (!submitter) {
      throw new Error('Submitter not found');
    }

    if (submitter.companyId !== data.companyId) {
      throw new Error('Submitter does not belong to the specified company');
    }

    // Get company's default currency for conversion
    const company = await Company.findById(data.companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Convert amount to company's default currency
    let convertedAmount = data.amount;
    const companyCurrency = company.defaultCurrency.toUpperCase();
    const expenseCurrency = data.currency.toUpperCase();

    if (expenseCurrency !== companyCurrency) {
      try {
        convertedAmount = await CurrencyService.convertAmount(
          data.amount,
          expenseCurrency,
          companyCurrency
        );
      } catch (error) {
        console.error('Currency conversion error:', error);
        // If conversion fails, use original amount as fallback
        convertedAmount = data.amount;
      }
    }

    // Create expense instance as draft
    const expense = new Expense({
      company_id: data.companyId,
      submitter_id: data.submitterId,
      amount: data.amount,
      currency: expenseCurrency,
      category: data.category,
      description: data.description,
      expense_date: data.expenseDate,
      receipt_url: data.receiptUrl || null,
      status: ExpenseStatus.DRAFT,
      converted_amount: convertedAmount,
      converted_currency: companyCurrency,
    });

    // Save to database
    const savedExpense = await expense.save();

    return savedExpense;
  }

  /**
   * Submit a draft expense for approval
   * Changes status to PENDING, category to WAITING_APPROVAL, and initiates workflow
   * @param expenseId - Expense ID to submit
   * @returns Promise<Expense> - Submitted expense
   */
  public static async submitExpense(expenseId: string): Promise<Expense> {
    // Get existing expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Check if expense is in draft status
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new Error('Only draft expenses can be submitted');
    }

    // Update status and category
    expense.status = ExpenseStatus.PENDING;
    expense.category = ExpenseCategory.WAITING_APPROVAL;

    // Save updated expense
    const updatedExpense = await expense.save();

    // Log expense submission
    await ApprovalHistory.logSubmission(updatedExpense.id, updatedExpense.submitterId);

    // Initiate approval workflow
    const workflowEngine = new WorkflowEngine();
    await workflowEngine.initiateWorkflow(updatedExpense.id);

    return updatedExpense;
  }

  /**
   * Create a new expense with currency conversion (legacy method for backward compatibility)
   * @deprecated Use saveDraftExpense and submitExpense instead
   * @param data - Expense creation data
   * @returns Promise<Expense> - Created expense
   */
  public static async createExpense(data: CreateExpenseDTO): Promise<Expense> {
    // Create as draft first
    const draftExpense = await this.saveDraftExpense(data);
    
    // Then submit it
    return await this.submitExpense(draftExpense.id);
  }

  /**
   * Get expense by ID
   * @param id - Expense ID
   * @returns Promise<Expense | null> - Expense or null if not found
   */
  public static async getExpenseById(id: string): Promise<Expense | null> {
    return await Expense.findById(id);
  }

  /**
   * Get expenses by user ID
   * @param userId - User ID
   * @param filters - Optional filters
   * @returns Promise<Expense[]> - Array of expenses
   */
  public static async getExpensesByUser(userId: string, filters?: ExpenseFilters): Promise<Expense[]> {
    let query = db('expenses').where('submitter_id', userId);

    // Apply filters
    if (filters) {
      if (filters.status) {
        query = query.where('status', filters.status);
      }
      if (filters.startDate) {
        query = query.where('expense_date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('expense_date', '<=', filters.endDate);
      }
      if (filters.category) {
        query = query.where('category', filters.category);
      }
    }

    const expenses = await query.orderBy('created_at', 'desc');
    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Get expenses by category for a user
   * Filters by AMOUNT_TO_SUBMIT, WAITING_APPROVAL, or APPROVED categories
   * @param userId - User ID
   * @param category - Expense category
   * @returns Promise<Expense[]> - Array of expenses in the specified category
   */
  public static async getExpensesByCategory(userId: string, category: ExpenseCategory): Promise<Expense[]> {
    // Map category to status for filtering
    let statusFilter: ExpenseStatus;
    
    switch (category) {
      case ExpenseCategory.AMOUNT_TO_SUBMIT:
        statusFilter = ExpenseStatus.DRAFT;
        break;
      case ExpenseCategory.WAITING_APPROVAL:
        statusFilter = ExpenseStatus.PENDING;
        break;
      case ExpenseCategory.APPROVED:
        statusFilter = ExpenseStatus.APPROVED;
        break;
      default:
        throw new Error(`Invalid category: ${category}`);
    }

    const expenses = await db('expenses')
      .where('submitter_id', userId)
      .where('status', statusFilter)
      .orderBy('created_at', 'desc');

    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Get expenses by company ID (Admin only)
   * @param companyId - Company ID
   * @param filters - Optional filters
   * @returns Promise<Expense[]> - Array of expenses
   */
  public static async getExpensesByCompany(companyId: string, filters?: ExpenseFilters): Promise<Expense[]> {
    let query = db('expenses').where('company_id', companyId);

    // Apply filters
    if (filters) {
      if (filters.status) {
        query = query.where('status', filters.status);
      }
      if (filters.startDate) {
        query = query.where('expense_date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('expense_date', '<=', filters.endDate);
      }
      if (filters.submitterId) {
        query = query.where('submitter_id', filters.submitterId);
      }
      if (filters.category) {
        query = query.where('category', filters.category);
      }
    }

    const expenses = await query.orderBy('created_at', 'desc');
    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Get pending approvals for a user (Manager)
   * This method returns expenses that are pending approval and where the user is an approver
   * @param userId - User ID of the potential approver
   * @returns Promise<Expense[]> - Array of expenses pending approval
   */
  public static async getPendingApprovalsForUser(userId: string): Promise<Expense[]> {
    // Get user to verify they are a manager
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
      throw new Error('User is not authorized to view pending approvals');
    }

    // Import ApprovalRequest here to avoid circular dependency
    const { ApprovalRequest } = await import('../models/ApprovalRequest');
    
    // Get pending approval requests for this user
    const pendingRequests = await ApprovalRequest.findPendingByApproverId(userId);
    
    if (pendingRequests.length === 0) {
      return [];
    }

    // Get the expenses for these approval requests
    const expenseIds = pendingRequests.map(request => request.expenseId);
    const expenses = await db('expenses')
      .whereIn('id', expenseIds)
      .where('status', ExpenseStatus.PENDING)
      .orderBy('created_at', 'desc');

    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Update expense (only for draft expenses)
   * @param id - Expense ID
   * @param data - Update data
   * @param userId - User ID making the update
   * @returns Promise<Expense> - Updated expense
   */
  public static async updateExpense(id: string, data: UpdateExpenseDTO, userId: string): Promise<Expense> {
    // Get existing expense
    const expense = await Expense.findById(id);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Check if user owns the expense
    if (expense.submitterId !== userId) {
      throw new Error('Access denied. You can only update your own expenses');
    }

    // Check if expense is still in draft status
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new Error('Cannot update expense that has been submitted. Only draft expenses can be updated');
    }

    // Update fields
    if (data.amount !== undefined) {
      expense.amount = data.amount;
    }
    if (data.currency !== undefined) {
      expense.currency = data.currency.toUpperCase();
    }
    if (data.category !== undefined) {
      expense.category = data.category;
    }
    if (data.description !== undefined) {
      expense.description = data.description;
    }
    if (data.expenseDate !== undefined) {
      expense.expenseDate = data.expenseDate;
    }
    if (data.receiptUrl !== undefined) {
      expense.receiptUrl = data.receiptUrl;
    }

    // Save updated expense (no currency conversion for drafts)
    return await expense.save();
  }

  /**
   * Delete expense (only for draft expenses)
   * @param id - Expense ID
   * @param userId - User ID making the deletion
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteExpense(id: string, userId: string): Promise<boolean> {
    // Get existing expense
    const expense = await Expense.findById(id);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Check if user owns the expense
    if (expense.submitterId !== userId) {
      throw new Error('Access denied. You can only delete your own expenses');
    }

    // Check if expense is still in draft status
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new Error('Cannot delete expense that has been submitted. Only draft expenses can be deleted');
    }

    // Delete expense
    return await Expense.deleteById(id);
  }

  /**
   * Get expenses by manager's direct reports
   * @param managerId - Manager's user ID
   * @param filters - Optional filters
   * @returns Promise<Expense[]> - Array of expenses from direct reports
   */
  public static async getExpensesByManagerReports(managerId: string, filters?: ExpenseFilters): Promise<Expense[]> {
    // Get manager
    const manager = await User.findById(managerId);
    if (!manager) {
      throw new Error('Manager not found');
    }

    if (manager.role !== UserRole.MANAGER && manager.role !== UserRole.ADMIN) {
      throw new Error('User is not a manager');
    }

    // Get direct reports
    const directReports = await User.findByCompanyId(manager.companyId);
    const directReportIds = directReports
      .filter(report => report.managerId === managerId)
      .map(report => report.id);

    if (directReportIds.length === 0) {
      return [];
    }

    // Build query for expenses from direct reports
    let query = db('expenses').whereIn('submitter_id', directReportIds);

    // Apply filters
    if (filters) {
      if (filters.status) {
        query = query.where('status', filters.status);
      }
      if (filters.startDate) {
        query = query.where('expense_date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('expense_date', '<=', filters.endDate);
      }
      if (filters.category) {
        query = query.where('category', filters.category);
      }
    }

    const expenses = await query.orderBy('created_at', 'desc');
    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Check if user can access expense
   * @param expenseId - Expense ID
   * @param userId - User ID
   * @returns Promise<boolean> - True if user can access the expense
   */
  public static async canUserAccessExpense(expenseId: string, userId: string): Promise<boolean> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return false;
    }

    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    // Check company isolation
    if (expense.companyId !== user.companyId) {
      return false;
    }

    // Admin can access all company expenses
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Employee can only access their own expenses
    if (user.role === UserRole.EMPLOYEE) {
      return expense.submitterId === userId;
    }

    // Manager can access their own expenses and their direct reports' expenses
    if (user.role === UserRole.MANAGER) {
      // Own expense
      if (expense.submitterId === userId) {
        return true;
      }

      // Check if expense is from a direct report
      const submitter = await User.findById(expense.submitterId);
      return submitter?.managerId === userId;
    }

    return false;
  }

  /**
   * Convert expense currency to company's base currency
   * Called during approval process to store the converted amount
   * @param expenseId - Expense ID
   * @returns Promise<number> - Converted amount in company's base currency
   */
  public static async convertExpenseCurrency(expenseId: string): Promise<number> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    const company = await Company.findById(expense.companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // If expense is already in company currency, no conversion needed
    if (expense.currency.toUpperCase() === company.defaultCurrency.toUpperCase()) {
      // Update the expense with the same amount as converted amount
      expense.convertedAmount = expense.amount;
      expense.convertedCurrency = company.defaultCurrency.toUpperCase();
      await expense.save();
      
      // Log that no conversion was needed
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'CURRENCY_CONVERSION',
        'No conversion needed - expense already in company currency',
        {
          originalAmount: expense.amount,
          originalCurrency: expense.currency,
          convertedAmount: expense.amount,
          convertedCurrency: company.defaultCurrency,
          exchangeRate: 1
        }
      );
      
      return expense.amount;
    }

    try {
      // Fetch exchange rates (with caching)
      const exchangeRate = await CurrencyService.getExchangeRate(
        expense.currency,
        company.defaultCurrency
      );

      // Convert the amount
      const convertedAmount = await CurrencyService.convertAmount(
        expense.amount,
        expense.currency,
        company.defaultCurrency
      );

      // Update the expense with converted amount
      expense.convertedAmount = convertedAmount;
      expense.convertedCurrency = company.defaultCurrency.toUpperCase();
      await expense.save();

      // Log the currency conversion
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'CURRENCY_CONVERSION',
        `Converted ${expense.amount} ${expense.currency} to ${convertedAmount} ${company.defaultCurrency}`,
        {
          originalAmount: expense.amount,
          originalCurrency: expense.currency,
          convertedAmount,
          convertedCurrency: company.defaultCurrency,
          exchangeRate
        }
      );

      return convertedAmount;
    } catch (error) {
      // Log the conversion failure
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'CURRENCY_CONVERSION_FAILED',
        `Failed to convert currency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          originalAmount: expense.amount,
          originalCurrency: expense.currency,
          targetCurrency: company.defaultCurrency,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      throw new Error(`Currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}