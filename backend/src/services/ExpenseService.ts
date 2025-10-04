import { Expense } from '../models/Expense';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { CurrencyService } from './CurrencyService';
import { WorkflowEngine } from './WorkflowEngine';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { ExpenseStatus, UserRole } from '../types/database';
import { db } from '../config/database';

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
   * Create a new expense with currency conversion
   * @param data - Expense creation data
   * @returns Promise<Expense> - Created expense
   */
  public static async createExpense(data: CreateExpenseDTO): Promise<Expense> {
    // Validate submitter exists and belongs to the company
    const submitter = await User.findById(data.submitterId);
    if (!submitter) {
      throw new Error('Submitter not found');
    }

    if (submitter.companyId !== data.companyId) {
      throw new Error('Submitter does not belong to the specified company');
    }

    // Get company to determine default currency
    const company = await Company.findById(data.companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Convert amount to company default currency if different
    let convertedAmount = data.amount;
    let convertedCurrency = data.currency.toUpperCase();

    if (data.currency.toUpperCase() !== company.defaultCurrency.toUpperCase()) {
      try {
        // Validate currency codes before conversion
        const isValidFromCurrency = await CurrencyService.validateCurrencyCode(data.currency);
        const isValidToCurrency = await CurrencyService.validateCurrencyCode(company.defaultCurrency);
        
        if (!isValidFromCurrency) {
          throw new Error(`Invalid source currency code: ${data.currency}`);
        }
        
        if (!isValidToCurrency) {
          throw new Error(`Invalid target currency code: ${company.defaultCurrency}`);
        }

        convertedAmount = await CurrencyService.convertAmount(
          data.amount,
          data.currency,
          company.defaultCurrency
        );
        convertedCurrency = company.defaultCurrency.toUpperCase();
        
        console.log(`Currency conversion: ${data.amount} ${data.currency} = ${convertedAmount} ${convertedCurrency}`);
      } catch (error) {
        console.error('Currency conversion failed:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            throw new Error('Currency conversion service is temporarily unavailable. Please try again later.');
          } else if (error.message.includes('not found')) {
            throw new Error(`Exchange rate not available for ${data.currency} to ${company.defaultCurrency}. Please contact support.`);
          } else if (error.message.includes('Invalid')) {
            throw error; // Re-throw validation errors as-is
          } else {
            throw new Error(`Currency conversion failed: ${error.message}`);
          }
        } else {
          throw new Error(`Failed to convert ${data.currency} to ${company.defaultCurrency}: Unknown error`);
        }
      }
    } else {
      // Same currency, no conversion needed
      convertedAmount = data.amount;
      convertedCurrency = data.currency.toUpperCase();
    }

    // Create expense instance
    const expense = new Expense({
      company_id: data.companyId,
      submitter_id: data.submitterId,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      category: data.category,
      description: data.description,
      expense_date: data.expenseDate,
      receipt_url: data.receiptUrl || null,
      status: ExpenseStatus.PENDING,
      converted_amount: convertedAmount,
      converted_currency: convertedCurrency.toUpperCase(),
    });

    // Save to database
    const savedExpense = await expense.save();

    // Log expense submission
    await ApprovalHistory.logSubmission(savedExpense.id, data.submitterId);

    // Initiate approval workflow
    const workflowEngine = new WorkflowEngine();
    await workflowEngine.initiateWorkflow(savedExpense.id);

    return savedExpense;
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
   * Update expense (only before approval)
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

    // Check if expense is still pending
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new Error('Cannot update expense that has already been approved or rejected');
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

    // If amount or currency changed, recalculate conversion
    if (data.amount !== undefined || data.currency !== undefined) {
      const company = await Company.findById(expense.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      if (expense.currency !== company.defaultCurrency.toUpperCase()) {
        try {
          // Validate currency codes before conversion
          const isValidFromCurrency = await CurrencyService.validateCurrencyCode(expense.currency);
          const isValidToCurrency = await CurrencyService.validateCurrencyCode(company.defaultCurrency);
          
          if (!isValidFromCurrency) {
            throw new Error(`Invalid source currency code: ${expense.currency}`);
          }
          
          if (!isValidToCurrency) {
            throw new Error(`Invalid target currency code: ${company.defaultCurrency}`);
          }

          expense.convertedAmount = await CurrencyService.convertAmount(
            expense.amount,
            expense.currency,
            company.defaultCurrency
          );
          expense.convertedCurrency = company.defaultCurrency.toUpperCase();
          
          console.log(`Currency conversion on update: ${expense.amount} ${expense.currency} = ${expense.convertedAmount} ${expense.convertedCurrency}`);
        } catch (error) {
          console.error('Currency conversion failed during update:', error);
          
          // Provide more specific error messages
          if (error instanceof Error) {
            if (error.message.includes('timeout')) {
              throw new Error('Currency conversion service is temporarily unavailable. Please try again later.');
            } else if (error.message.includes('not found')) {
              throw new Error(`Exchange rate not available for ${expense.currency} to ${company.defaultCurrency}. Please contact support.`);
            } else if (error.message.includes('Invalid')) {
              throw error; // Re-throw validation errors as-is
            } else {
              throw new Error(`Currency conversion failed: ${error.message}`);
            }
          } else {
            throw new Error(`Failed to convert ${expense.currency} to ${company.defaultCurrency}: Unknown error`);
          }
        }
      } else {
        // Same currency, no conversion needed
        expense.convertedAmount = expense.amount;
        expense.convertedCurrency = expense.currency;
      }
    }

    // Save updated expense
    return await expense.save();
  }

  /**
   * Delete expense (only before approval)
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

    // Check if expense is still pending
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new Error('Cannot delete expense that has already been approved or rejected');
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
}