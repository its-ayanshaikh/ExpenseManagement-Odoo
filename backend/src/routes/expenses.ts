import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  requireEmployee,
  requireAdminOrManager,
  requireAdmin,
  enforceCompanyIsolation,
  roleCheckers
} from '../middleware/authorization';
import { ExpenseStatus } from '../types/database';
import { ExpenseService, CreateExpenseDTO, UpdateExpenseDTO, ExpenseFilters } from '../services/ExpenseService';
import { ApprovalService, ApprovalDecisionDTO, RejectionDecisionDTO } from '../services/ApprovalService';

const router = Router();
const approvalService = new ApprovalService();

// Apply authentication to all expense routes
router.use(authenticateToken);

// Validation interfaces
interface CreateExpenseRequest {
  amount: number;
  currency: string;
  category: string;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
}

interface UpdateExpenseRequest {
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  expenseDate?: string;
  receiptUrl?: string;
}

interface ApprovalRequest {
  comments?: string;
}

interface RejectionRequest {
  comments: string;
}

/**
 * POST /api/expenses/draft
 * Save expense as draft without submitting (Employee role required)
 */
router.post('/draft', requireEmployee, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency, category, description, expenseDate, receiptUrl }: CreateExpenseRequest = req.body;

    // Validate required fields
    if (!amount || !currency || !category || !description || !expenseDate) {
      res.status(400).json({
        status: 'error',
        message: 'Amount, currency, category, description, and expenseDate are required',
        code: 'MISSING_FIELDS',
        required: ['amount', 'currency', 'category', 'description', 'expenseDate']
      });
      return;
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT'
      });
      return;
    }

    // Validate currency format (3-letter ISO code)
    if (!/^[A-Z]{3}$/.test(currency)) {
      res.status(400).json({
        status: 'error',
        message: 'Currency must be a 3-letter ISO code (e.g., USD, EUR)',
        code: 'INVALID_CURRENCY'
      });
      return;
    }

    // Validate expense date
    const parsedDate = new Date(expenseDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid expense date format',
        code: 'INVALID_DATE'
      });
      return;
    }

    // Check if expense date is not in the future
    if (parsedDate > new Date()) {
      res.status(400).json({
        status: 'error',
        message: 'Expense date cannot be in the future',
        code: 'FUTURE_DATE'
      });
      return;
    }

    // Create expense draft using ExpenseService
    const expenseData: CreateExpenseDTO = {
      submitterId: req.user!.id,
      companyId: req.user!.companyId,
      amount,
      currency: currency.toUpperCase(),
      category,
      description,
      expenseDate: parsedDate,
      receiptUrl
    };

    const expense = await ExpenseService.saveDraftExpense(expenseData);

    res.status(201).json({
      status: 'success',
      message: 'Expense draft saved successfully',
      data: {
        expense: {
          id: expense.id,
          submitterId: expense.submitterId,
          companyId: expense.companyId,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          receiptUrl: expense.receiptUrl,
          status: expense.status,
          convertedAmount: expense.convertedAmount,
          convertedCurrency: expense.convertedCurrency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Save draft expense error:', error);
    
    if (error instanceof Error) {
      // Handle specific ExpenseService errors
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('does not belong')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'COMPANY_MISMATCH'
        });
        return;
      } else if (error.message.includes('Invalid')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense draft creation',
      code: 'EXPENSE_DRAFT_CREATION_ERROR'
    });
  }
});

/**
 * POST /api/expenses
 * Submit new expense (Employee role required)
 */
router.post('/', requireEmployee, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency, category, description, expenseDate, receiptUrl }: CreateExpenseRequest = req.body;

    // Validate required fields
    if (!amount || !currency || !category || !description || !expenseDate) {
      res.status(400).json({
        status: 'error',
        message: 'Amount, currency, category, description, and expenseDate are required',
        code: 'MISSING_FIELDS',
        required: ['amount', 'currency', 'category', 'description', 'expenseDate']
      });
      return;
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT'
      });
      return;
    }

    // Validate currency format (3-letter ISO code)
    if (!/^[A-Z]{3}$/.test(currency)) {
      res.status(400).json({
        status: 'error',
        message: 'Currency must be a 3-letter ISO code (e.g., USD, EUR)',
        code: 'INVALID_CURRENCY'
      });
      return;
    }

    // Validate expense date
    const parsedDate = new Date(expenseDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid expense date format',
        code: 'INVALID_DATE'
      });
      return;
    }

    // Check if expense date is not in the future
    if (parsedDate > new Date()) {
      res.status(400).json({
        status: 'error',
        message: 'Expense date cannot be in the future',
        code: 'FUTURE_DATE'
      });
      return;
    }

    // Create expense using ExpenseService
    const expenseData: CreateExpenseDTO = {
      submitterId: req.user!.id,
      companyId: req.user!.companyId,
      amount,
      currency: currency.toUpperCase(),
      category,
      description,
      expenseDate: parsedDate,
      receiptUrl
    };

    const expense = await ExpenseService.createExpense(expenseData);

    res.status(201).json({
      status: 'success',
      message: 'Expense submitted successfully',
      data: {
        expense: {
          id: expense.id,
          submitterId: expense.submitterId,
          companyId: expense.companyId,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          receiptUrl: expense.receiptUrl,
          status: expense.status,
          convertedAmount: expense.convertedAmount,
          convertedCurrency: expense.convertedCurrency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Create expense error:', error);
    
    if (error instanceof Error) {
      // Handle specific ExpenseService errors
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('does not belong')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'COMPANY_MISMATCH'
        });
        return;
      } else if (error.message.includes('conversion')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'CURRENCY_CONVERSION_ERROR'
        });
        return;
      } else if (error.message.includes('Invalid')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense creation',
      code: 'EXPENSE_CREATION_ERROR'
    });
  }
});

/**
 * GET /api/expenses
 * List expenses (filtered by role)
 * - Employee: Only their own expenses
 * - Manager: Their own expenses + direct reports' expenses
 * - Admin: All company expenses
 */
router.get('/', enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate, submitterId } = req.query;

    // Build filter criteria
    const filters: ExpenseFilters = {};

    // Apply filters from query parameters
    if (status && Object.values(ExpenseStatus).includes(status as ExpenseStatus)) {
      filters.status = status as ExpenseStatus;
    }

    if (startDate) {
      const parsedStartDate = new Date(startDate as string);
      if (!isNaN(parsedStartDate.getTime())) {
        filters.startDate = parsedStartDate;
      }
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate as string);
      if (!isNaN(parsedEndDate.getTime())) {
        filters.endDate = parsedEndDate;
      }
    }

    // Admin can filter by specific submitter
    if (submitterId && roleCheckers.isAdmin(req.user!)) {
      filters.submitterId = submitterId as string;
    }

    let expenses: any[] = [];

    // Role-based expense retrieval
    if (roleCheckers.isEmployee(req.user!)) {
      // Employees can only see their own expenses
      expenses = await ExpenseService.getExpensesByUser(req.user!.id, filters);
    } else if (roleCheckers.isManager(req.user!)) {
      // Managers can see their own expenses and their direct reports' expenses
      const ownExpenses = await ExpenseService.getExpensesByUser(req.user!.id, filters);
      const teamExpenses = await ExpenseService.getExpensesByManagerReports(req.user!.id, filters);
      
      // Combine and deduplicate expenses
      const allExpenses = [...ownExpenses, ...teamExpenses];
      const uniqueExpenses = allExpenses.filter((expense, index, self) => 
        index === self.findIndex(e => e.id === expense.id)
      );
      
      // Sort by creation date (newest first)
      expenses = uniqueExpenses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (roleCheckers.isAdmin(req.user!)) {
      // Admins can see all company expenses
      expenses = await ExpenseService.getExpensesByCompany(req.user!.companyId, filters);
    } else {
      expenses = [];
    }

    res.status(200).json({
      status: 'success',
      message: 'Expenses retrieved successfully',
      data: {
        expenses: expenses.map(expense => ({
          id: expense.id,
          submitterId: expense.submitterId,
          companyId: expense.companyId,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          receiptUrl: expense.receiptUrl,
          status: expense.status,
          convertedAmount: expense.convertedAmount,
          convertedCurrency: expense.convertedCurrency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt
        })),
        count: expenses.length,
        filters
      }
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving expenses',
      code: 'GET_EXPENSES_ERROR'
    });
  }
});

/**
 * POST /api/expenses/:id/submit
 * Submit a draft expense for approval (Employee role required)
 */
router.post('/:id/submit', requireEmployee, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get the expense to verify ownership
    const expense = await ExpenseService.getExpenseById(id);
    
    if (!expense) {
      res.status(404).json({
        status: 'error',
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
      return;
    }

    // Check if user owns the expense
    if (expense.submitterId !== req.user!.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only submit your own expenses',
        code: 'EXPENSE_SUBMIT_ACCESS_DENIED'
      });
      return;
    }

    // Submit the expense using ExpenseService
    const submittedExpense = await ExpenseService.submitExpense(id);

    res.status(200).json({
      status: 'success',
      message: 'Expense submitted for approval successfully',
      data: {
        expense: {
          id: submittedExpense.id,
          submitterId: submittedExpense.submitterId,
          companyId: submittedExpense.companyId,
          amount: submittedExpense.amount,
          currency: submittedExpense.currency,
          category: submittedExpense.category,
          description: submittedExpense.description,
          expenseDate: submittedExpense.expenseDate,
          receiptUrl: submittedExpense.receiptUrl,
          status: submittedExpense.status,
          convertedAmount: submittedExpense.convertedAmount,
          convertedCurrency: submittedExpense.convertedCurrency,
          createdAt: submittedExpense.createdAt,
          updatedAt: submittedExpense.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Submit expense error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('Only draft expenses')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_DRAFT'
        });
        return;
      } else if (error.message.includes('Access denied')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_SUBMIT_ACCESS_DENIED'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense submission',
      code: 'EXPENSE_SUBMIT_ERROR'
    });
  }
});

/**
 * GET /api/expenses/category/:category
 * Get expenses by category for current user (Employee role required)
 * Categories: AMOUNT_TO_SUBMIT (drafts), WAITING_APPROVAL (pending), APPROVED
 */
router.get('/category/:category', requireEmployee, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    // Validate category
    const validCategories = ['AMOUNT_TO_SUBMIT', 'WAITING_APPROVAL', 'APPROVED'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        code: 'INVALID_CATEGORY',
        validCategories
      });
      return;
    }

    // Get expenses by category using ExpenseService
    const expenses = await ExpenseService.getExpensesByCategory(req.user!.id, category as any);

    res.status(200).json({
      status: 'success',
      message: `Expenses in category '${category}' retrieved successfully`,
      data: {
        category,
        expenses: expenses.map(expense => ({
          id: expense.id,
          submitterId: expense.submitterId,
          companyId: expense.companyId,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          receiptUrl: expense.receiptUrl,
          status: expense.status,
          convertedAmount: expense.convertedAmount,
          convertedCurrency: expense.convertedCurrency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt
        })),
        count: expenses.length
      }
    });

  } catch (error) {
    console.error('Get expenses by category error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid category')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'INVALID_CATEGORY'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving expenses by category',
      code: 'GET_EXPENSES_BY_CATEGORY_ERROR'
    });
  }
});

/**
 * GET /api/expenses/pending-approvals
 * Get expenses pending approval for current user (Manager/Admin only)
 * NOTE: This route MUST be defined before /:id route to avoid route conflicts
 */
router.get('/pending-approvals', requireAdminOrManager, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get pending approvals using ExpenseService
    const expenses = await ExpenseService.getPendingApprovalsForUser(req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Pending approvals retrieved successfully',
      data: {
        expenses: expenses.map(expense => ({
          id: expense.id,
          submitterId: expense.submitterId,
          companyId: expense.companyId,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          receiptUrl: expense.receiptUrl,
          status: expense.status,
          convertedAmount: expense.convertedAmount,
          convertedCurrency: expense.convertedCurrency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt
        })),
        count: expenses.length
      }
    });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'USER_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('not authorized')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'UNAUTHORIZED_ROLE'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving pending approvals',
      code: 'PENDING_APPROVALS_ERROR'
    });
  }
});

/**
 * GET /api/expenses/:id
 * Get expense details
 * - Employee: Only their own expenses
 * - Manager: Their own expenses + direct reports' expenses
 * - Admin: All company expenses
 */
router.get('/:id', enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get expense by ID
    const expense = await ExpenseService.getExpenseById(id);
    
    if (!expense) {
      res.status(404).json({
        status: 'error',
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
      return;
    }

    // Check access permissions using ExpenseService
    const canAccess = await ExpenseService.canUserAccessExpense(id, req.user!.id);
    
    if (!canAccess) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to view this expense',
        code: 'EXPENSE_ACCESS_DENIED'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Expense retrieved successfully',
      data: {
        expense: {
          id: expense.id,
          submitterId: expense.submitterId,
          companyId: expense.companyId,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          receiptUrl: expense.receiptUrl,
          status: expense.status,
          convertedAmount: expense.convertedAmount,
          convertedCurrency: expense.convertedCurrency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get expense error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving expense',
      code: 'GET_EXPENSE_ERROR'
    });
  }
});

/**
 * PUT /api/expenses/:id
 * Update expense (Employee only, before approval)
 */
router.put('/:id', requireEmployee, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, currency, category, description, expenseDate, receiptUrl }: UpdateExpenseRequest = req.body;

    // Validate updated fields
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Amount must be a positive number',
          code: 'INVALID_AMOUNT'
        });
        return;
      }
    }

    if (currency !== undefined) {
      if (!/^[A-Z]{3}$/.test(currency)) {
        res.status(400).json({
          status: 'error',
          message: 'Currency must be a 3-letter ISO code (e.g., USD, EUR)',
          code: 'INVALID_CURRENCY'
        });
        return;
      }
    }

    if (expenseDate !== undefined) {
      const parsedDate = new Date(expenseDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid expense date format',
          code: 'INVALID_DATE'
        });
        return;
      }

      if (parsedDate > new Date()) {
        res.status(400).json({
          status: 'error',
          message: 'Expense date cannot be in the future',
          code: 'FUTURE_DATE'
        });
        return;
      }
    }

    // Prepare update data
    const updateData: UpdateExpenseDTO = {};
    if (amount !== undefined) updateData.amount = amount;
    if (currency !== undefined) updateData.currency = currency.toUpperCase();
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;

    // Update expense using ExpenseService
    const updatedExpense = await ExpenseService.updateExpense(id, updateData, req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Expense updated successfully',
      data: {
        expense: {
          id: updatedExpense.id,
          submitterId: updatedExpense.submitterId,
          companyId: updatedExpense.companyId,
          amount: updatedExpense.amount,
          currency: updatedExpense.currency,
          category: updatedExpense.category,
          description: updatedExpense.description,
          expenseDate: updatedExpense.expenseDate,
          receiptUrl: updatedExpense.receiptUrl,
          status: updatedExpense.status,
          convertedAmount: updatedExpense.convertedAmount,
          convertedCurrency: updatedExpense.convertedCurrency,
          createdAt: updatedExpense.createdAt,
          updatedAt: updatedExpense.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update expense error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('Access denied')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_UPDATE_ACCESS_DENIED'
        });
        return;
      } else if (error.message.includes('Cannot update')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_EDITABLE'
        });
        return;
      } else if (error.message.includes('conversion')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'CURRENCY_CONVERSION_ERROR'
        });
        return;
      } else if (error.message.includes('Invalid')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense update',
      code: 'EXPENSE_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete expense (Employee only, before approval)
 */
router.delete('/:id', requireEmployee, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Delete expense using ExpenseService
    const deleted = await ExpenseService.deleteExpense(id, req.user!.id);

    if (!deleted) {
      res.status(404).json({
        status: 'error',
        message: 'Expense not found or could not be deleted',
        code: 'EXPENSE_DELETE_FAILED'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully',
      data: {
        deletedExpenseId: id
      }
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('Access denied')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_DELETE_ACCESS_DENIED'
        });
        return;
      } else if (error.message.includes('Cannot delete')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_DELETABLE'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense deletion',
      code: 'EXPENSE_DELETE_ERROR'
    });
  }
});

/**
 * POST /api/expenses/:id/approve
 * Approve expense (Manager/Admin only)
 */
router.post('/:id/approve', requireAdminOrManager, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments }: ApprovalRequest = req.body;

    // Check if user can approve this expense
    const canApprove = await approvalService.canUserApproveExpense(id, req.user!.id);
    if (!canApprove) {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to approve this expense or it is not in a state that can be approved',
        code: 'APPROVAL_NOT_PERMITTED'
      });
      return;
    }

    // Approve the expense using ApprovalService
    const approvalDecision: ApprovalDecisionDTO = {
      comments: comments?.trim() || undefined
    };

    await approvalService.approveExpense(id, req.user!.id, approvalDecision);

    res.status(200).json({
      status: 'success',
      message: 'Expense approved successfully',
      data: {
        expenseId: id,
        approverId: req.user!.id,
        comments: approvalDecision.comments,
        approvedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Approve expense error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('not in pending status')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_PENDING'
        });
        return;
      } else if (error.message.includes('does not have permission')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      } else if (error.message.includes('No approval request found')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'NO_APPROVAL_REQUEST'
        });
        return;
      } else if (error.message.includes('not in pending status')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'APPROVAL_REQUEST_NOT_PENDING'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense approval',
      code: 'EXPENSE_APPROVAL_ERROR'
    });
  }
});

/**
 * POST /api/expenses/:id/reject
 * Reject expense (Manager/Admin only)
 */
router.post('/:id/reject', requireAdminOrManager, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments }: RejectionRequest = req.body;

    // Validate required comments for rejection
    if (!comments || comments.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Comments are required when rejecting an expense',
        code: 'REJECTION_COMMENTS_REQUIRED'
      });
      return;
    }

    // Check if user can approve/reject this expense
    const canApprove = await approvalService.canUserApproveExpense(id, req.user!.id);
    if (!canApprove) {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to reject this expense or it is not in a state that can be rejected',
        code: 'REJECTION_NOT_PERMITTED'
      });
      return;
    }

    // Reject the expense using ApprovalService
    const rejectionDecision: RejectionDecisionDTO = {
      comments: comments.trim()
    };

    await approvalService.rejectExpense(id, req.user!.id, rejectionDecision);

    res.status(200).json({
      status: 'success',
      message: 'Expense rejected successfully',
      data: {
        expenseId: id,
        rejectedBy: req.user!.id,
        comments: rejectionDecision.comments,
        rejectedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Reject expense error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('not in pending status')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_PENDING'
        });
        return;
      } else if (error.message.includes('does not have permission')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      } else if (error.message.includes('No approval request found')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'NO_APPROVAL_REQUEST'
        });
        return;
      } else if (error.message.includes('Comments are required')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'REJECTION_COMMENTS_REQUIRED'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during expense rejection',
      code: 'EXPENSE_REJECTION_ERROR'
    });
  }
});

/**
 * GET /api/expenses/:id/history
 * Get approval history for expense
 */
router.get('/:id/history', enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check access permissions (same as expense detail access)
    const canAccess = await ExpenseService.canUserAccessExpense(id, req.user!.id);
    
    if (!canAccess) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to view this expense history',
        code: 'EXPENSE_HISTORY_ACCESS_DENIED'
      });
      return;
    }

    // Get approval history using ApprovalService
    const history = await approvalService.getApprovalHistory(id);

    res.status(200).json({
      status: 'success',
      message: 'Approval history retrieved successfully',
      data: {
        expenseId: id,
        history: history.map(record => ({
          id: record.id,
          expenseId: record.expenseId,
          actorId: record.actorId,
          actorName: record.actorName,
          actorRole: record.actorRole,
          action: record.action,
          comments: record.comments,
          metadata: record.metadata,
          createdAt: record.createdAt
        })),
        count: history.length
      }
    });

  } catch (error) {
    console.error('Get approval history error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving approval history',
      code: 'APPROVAL_HISTORY_ERROR'
    });
  }
});

/**
 * POST /api/expenses/:id/override-approve
 * Admin override approval for expense (Admin only)
 */
router.post('/:id/override-approve', requireAdmin, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments }: RejectionRequest = req.body;

    // Validate required comments for override
    if (!comments || comments.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Comments are required for admin override approval',
        code: 'OVERRIDE_COMMENTS_REQUIRED'
      });
      return;
    }

    // Override approve the expense using ApprovalService
    const overrideDecision: RejectionDecisionDTO = {
      comments: comments.trim()
    };

    await approvalService.adminOverrideApproval(id, req.user!.id, overrideDecision);

    res.status(200).json({
      status: 'success',
      message: 'Expense approved by admin override',
      data: {
        expenseId: id,
        overriddenBy: req.user!.id,
        comments: overrideDecision.comments,
        overriddenAt: new Date(),
        action: 'OVERRIDE_APPROVED'
      }
    });

  } catch (error) {
    console.error('Admin override approve error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('does not have admin privileges')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'ADMIN_PRIVILEGES_REQUIRED'
        });
        return;
      } else if (error.message.includes('Comments are required')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'OVERRIDE_COMMENTS_REQUIRED'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during admin override approval',
      code: 'ADMIN_OVERRIDE_APPROVE_ERROR'
    });
  }
});

/**
 * POST /api/expenses/:id/override-reject
 * Admin override rejection for expense (Admin only)
 */
router.post('/:id/override-reject', requireAdmin, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments }: RejectionRequest = req.body;

    // Validate required comments for override
    if (!comments || comments.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Comments are required for admin override rejection',
        code: 'OVERRIDE_COMMENTS_REQUIRED'
      });
      return;
    }

    // Override reject the expense using ApprovalService
    const overrideDecision: RejectionDecisionDTO = {
      comments: comments.trim()
    };

    await approvalService.adminOverrideRejection(id, req.user!.id, overrideDecision);

    res.status(200).json({
      status: 'success',
      message: 'Expense rejected by admin override',
      data: {
        expenseId: id,
        overriddenBy: req.user!.id,
        comments: overrideDecision.comments,
        overriddenAt: new Date(),
        action: 'OVERRIDE_REJECTED'
      }
    });

  } catch (error) {
    console.error('Admin override reject error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: error.message,
          code: 'EXPENSE_NOT_FOUND'
        });
        return;
      } else if (error.message.includes('does not have admin privileges')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
          code: 'ADMIN_PRIVILEGES_REQUIRED'
        });
        return;
      } else if (error.message.includes('Comments are required')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'OVERRIDE_COMMENTS_REQUIRED'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during admin override rejection',
      code: 'ADMIN_OVERRIDE_REJECT_ERROR'
    });
  }
});

export default router;