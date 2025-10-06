import { ExpenseService } from '../../services/ExpenseService';
import { Company } from '../../models/Company';
import { User } from '../../models/User';
import { Expense } from '../../models/Expense';
import { ExpenseStatus, ExpenseCategory, UserRole } from '../../types/database';
import { db } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

// Mock WorkflowEngine to avoid workflow initiation in tests
jest.mock('../../services/WorkflowEngine', () => {
  return {
    WorkflowEngine: jest.fn().mockImplementation(() => {
      return {
        initiateWorkflow: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('ExpenseService', () => {
  let testCompany: Company;
  let testEmployee: User;
  let testManager: User;

  beforeEach(async () => {
    // Create test company
    testCompany = new Company({
      name: 'Test Company',
      country: 'United States',
      default_currency: 'USD',
    });
    await testCompany.save();

    // Create test employee
    testEmployee = new User({
      company_id: testCompany.id,
      email: 'employee@test.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'Employee',
      role: UserRole.EMPLOYEE,
      is_manager_approver: false,
    });
    await testEmployee.save();

    // Create test manager
    testManager = new User({
      company_id: testCompany.id,
      email: 'manager@test.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'Manager',
      role: UserRole.MANAGER,
      is_manager_approver: false,
    });
    await testManager.save();
  });

  describe('saveDraftExpense', () => {
    it('should create a draft expense with DRAFT status', async () => {
      const expenseData = {
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: new Date('2024-01-15'),
      };

      const expense = await ExpenseService.saveDraftExpense(expenseData);

      expect(expense).toBeDefined();
      expect(expense.status).toBe(ExpenseStatus.DRAFT);
      expect(Number(expense.amount)).toBe(100.50);
      expect(expense.currency).toBe('USD');
      expect(expense.submitterId).toBe(testEmployee.id);
      expect(Number(expense.convertedAmount)).toBe(0);
      expect(expense.convertedCurrency).toBe('');
    });

    it('should throw error if submitter not found', async () => {
      const expenseData = {
        submitterId: uuidv4(), // Use valid UUID format
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: new Date('2024-01-15'),
      };

      await expect(ExpenseService.saveDraftExpense(expenseData)).rejects.toThrow('Submitter not found');
    });

    it('should throw error if submitter does not belong to company', async () => {
      const otherCompany = new Company({
        name: 'Other Company',
        country: 'Canada',
        default_currency: 'CAD',
      });
      await otherCompany.save();

      const expenseData = {
        submitterId: testEmployee.id,
        companyId: otherCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: new Date('2024-01-15'),
      };

      await expect(ExpenseService.saveDraftExpense(expenseData)).rejects.toThrow(
        'Submitter does not belong to the specified company'
      );
    });
  });

  describe('submitExpense', () => {
    it('should submit a draft expense and change status to PENDING', async () => {
      // Create draft expense
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: new Date('2024-01-15'),
      });

      expect(draftExpense.status).toBe(ExpenseStatus.DRAFT);

      // Submit the expense
      const submittedExpense = await ExpenseService.submitExpense(draftExpense.id);

      expect(submittedExpense.status).toBe(ExpenseStatus.PENDING);
      expect(submittedExpense.category).toBe(ExpenseCategory.WAITING_APPROVAL);
    });

    it('should throw error if expense not found', async () => {
      await expect(ExpenseService.submitExpense(uuidv4())).rejects.toThrow('Expense not found');
    });

    it('should throw error if expense is not in draft status', async () => {
      // Create and submit expense
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.submitExpense(draftExpense.id);

      // Try to submit again
      await expect(ExpenseService.submitExpense(draftExpense.id)).rejects.toThrow(
        'Only draft expenses can be submitted'
      );
    });
  });

  describe('getExpenseById', () => {
    it('should retrieve an expense by ID', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: new Date('2024-01-15'),
      });

      const retrievedExpense = await ExpenseService.getExpenseById(draftExpense.id);

      expect(retrievedExpense).toBeDefined();
      expect(retrievedExpense?.id).toBe(draftExpense.id);
      expect(Number(retrievedExpense?.amount)).toBe(100.50);
    });

    it('should return null if expense not found', async () => {
      const retrievedExpense = await ExpenseService.getExpenseById(uuidv4());
      expect(retrievedExpense).toBeNull();
    });
  });

  describe('getExpensesByUser', () => {
    it('should retrieve all expenses for a user', async () => {
      // Create multiple expenses
      await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip 1',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 200.75,
        currency: 'USD',
        category: 'Meals',
        description: 'Business lunch',
        expenseDate: new Date('2024-01-16'),
      });

      const expenses = await ExpenseService.getExpensesByUser(testEmployee.id);

      expect(expenses).toHaveLength(2);
      expect(expenses[0].submitterId).toBe(testEmployee.id);
      expect(expenses[1].submitterId).toBe(testEmployee.id);
    });

    it('should filter expenses by status', async () => {
      const draft = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Draft expense',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.submitExpense(draft.id);

      await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 200.75,
        currency: 'USD',
        category: 'Meals',
        description: 'Another draft',
        expenseDate: new Date('2024-01-16'),
      });

      const draftExpenses = await ExpenseService.getExpensesByUser(testEmployee.id, {
        status: ExpenseStatus.DRAFT,
      });

      expect(draftExpenses).toHaveLength(1);
      expect(draftExpenses[0].status).toBe(ExpenseStatus.DRAFT);
    });
  });

  describe('getExpensesByCategory', () => {
    it('should retrieve expenses by AMOUNT_TO_SUBMIT category', async () => {
      await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Draft expense',
        expenseDate: new Date('2024-01-15'),
      });

      const expenses = await ExpenseService.getExpensesByCategory(
        testEmployee.id,
        ExpenseCategory.AMOUNT_TO_SUBMIT
      );

      expect(expenses).toHaveLength(1);
      expect(expenses[0].status).toBe(ExpenseStatus.DRAFT);
    });

    it('should retrieve expenses by WAITING_APPROVAL category', async () => {
      const draft = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Submitted expense',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.submitExpense(draft.id);

      const expenses = await ExpenseService.getExpensesByCategory(
        testEmployee.id,
        ExpenseCategory.WAITING_APPROVAL
      );

      expect(expenses).toHaveLength(1);
      expect(expenses[0].status).toBe(ExpenseStatus.PENDING);
    });

    it('should retrieve expenses by APPROVED category', async () => {
      const draft = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Approved expense',
        expenseDate: new Date('2024-01-15'),
      });

      // Manually update status to APPROVED for testing
      await db('expenses').where('id', draft.id).update({ status: ExpenseStatus.APPROVED });

      const expenses = await ExpenseService.getExpensesByCategory(
        testEmployee.id,
        ExpenseCategory.APPROVED
      );

      expect(expenses).toHaveLength(1);
      expect(expenses[0].status).toBe(ExpenseStatus.APPROVED);
    });
  });

  describe('getExpensesByCompany', () => {
    it('should retrieve all expenses for a company', async () => {
      await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Employee expense',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.saveDraftExpense({
        submitterId: testManager.id,
        companyId: testCompany.id,
        amount: 200.75,
        currency: 'USD',
        category: 'Meals',
        description: 'Manager expense',
        expenseDate: new Date('2024-01-16'),
      });

      const expenses = await ExpenseService.getExpensesByCompany(testCompany.id);

      expect(expenses).toHaveLength(2);
    });
  });

  describe('updateExpense', () => {
    it('should update a draft expense', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Original description',
        expenseDate: new Date('2024-01-15'),
      });

      const updatedExpense = await ExpenseService.updateExpense(
        draftExpense.id,
        {
          amount: 150.75,
          description: 'Updated description',
        },
        testEmployee.id
      );

      expect(Number(updatedExpense.amount)).toBe(150.75);
      expect(updatedExpense.description).toBe('Updated description');
    });

    it('should throw error if expense is not in draft status', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Original description',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.submitExpense(draftExpense.id);

      await expect(
        ExpenseService.updateExpense(
          draftExpense.id,
          { amount: 150.75 },
          testEmployee.id
        )
      ).rejects.toThrow('Cannot update expense that has been submitted');
    });

    it('should throw error if user does not own the expense', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'Original description',
        expenseDate: new Date('2024-01-15'),
      });

      await expect(
        ExpenseService.updateExpense(
          draftExpense.id,
          { amount: 150.75 },
          testManager.id
        )
      ).rejects.toThrow('Access denied. You can only update your own expenses');
    });
  });

  describe('deleteExpense', () => {
    it('should delete a draft expense', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'To be deleted',
        expenseDate: new Date('2024-01-15'),
      });

      const result = await ExpenseService.deleteExpense(draftExpense.id, testEmployee.id);

      expect(result).toBe(true);

      const deletedExpense = await ExpenseService.getExpenseById(draftExpense.id);
      expect(deletedExpense).toBeNull();
    });

    it('should throw error if expense is not in draft status', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'To be deleted',
        expenseDate: new Date('2024-01-15'),
      });

      await ExpenseService.submitExpense(draftExpense.id);

      await expect(
        ExpenseService.deleteExpense(draftExpense.id, testEmployee.id)
      ).rejects.toThrow('Cannot delete expense that has been submitted');
    });

    it('should throw error if user does not own the expense', async () => {
      const draftExpense = await ExpenseService.saveDraftExpense({
        submitterId: testEmployee.id,
        companyId: testCompany.id,
        amount: 100.50,
        currency: 'USD',
        category: 'Travel',
        description: 'To be deleted',
        expenseDate: new Date('2024-01-15'),
      });

      await expect(
        ExpenseService.deleteExpense(draftExpense.id, testManager.id)
      ).rejects.toThrow('Access denied. You can only delete your own expenses');
    });
  });

  describe('getPendingApprovalsForUser', () => {
    it('should throw error if user is not a manager or admin', async () => {
      await expect(
        ExpenseService.getPendingApprovalsForUser(testEmployee.id)
      ).rejects.toThrow('User is not authorized to view pending approvals');
    });

    it('should return empty array if no pending approvals', async () => {
      const expenses = await ExpenseService.getPendingApprovalsForUser(testManager.id);
      expect(expenses).toEqual([]);
    });
  });
});
