import { WorkflowEngine } from '../../services/WorkflowEngine';
import { ExpenseService } from '../../services/ExpenseService';
import { Expense } from '../../models/Expense';
import { User } from '../../models/User';
import { Company } from '../../models/Company';
import { ApprovalRequest } from '../../models/ApprovalRequest';
import { ApprovalHistory } from '../../models/ApprovalHistory';
import { ApprovalRule } from '../../models/ApprovalRule';
import { CurrencyService } from '../../services/CurrencyService';
import { ExpenseStatus, ApprovalRequestStatus, UserRole } from '../../types/database';

// Mock dependencies
jest.mock('../../models/Expense');
jest.mock('../../models/User');
jest.mock('../../models/Company');
jest.mock('../../models/ApprovalRequest');
jest.mock('../../models/ApprovalHistory');
jest.mock('../../models/ApprovalRule');
jest.mock('../../services/CurrencyService');

describe('WorkflowEngine - Currency Conversion Integration', () => {
  const mockExpenseId = 'expense-123';
  const mockCompanyId = 'company-123';
  const mockApproverId = 'approver-123';
  const mockSubmitterId = 'submitter-123';

  let workflowEngine: WorkflowEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    workflowEngine = new WorkflowEngine();
  });

  describe('Currency conversion on approval', () => {
    it('should convert currency when all approvers approve', async () => {
      // Mock expense in USD
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: mockSubmitterId,
        amount: 100,
        currency: 'USD',
        status: ExpenseStatus.PENDING,
        convertedAmount: 0,
        convertedCurrency: '',
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Mock company with EUR as base currency
      const mockCompany = {
        id: mockCompanyId,
        defaultCurrency: 'EUR',
      } as any;

      // Mock submitter
      const mockSubmitter = {
        id: mockSubmitterId,
        companyId: mockCompanyId,
        role: UserRole.EMPLOYEE,
        isManagerApprover: false,
      } as any;

      // Mock approval request
      const mockApprovalRequest = {
        id: 'request-123',
        expenseId: mockExpenseId,
        approverId: mockApproverId,
        status: ApprovalRequestStatus.PENDING,
        sequence: 1,
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Setup mocks
      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      (User.findById as jest.Mock).mockResolvedValue(mockSubmitter);
      (ApprovalRequest.findByExpenseAndApprover as jest.Mock).mockResolvedValue(mockApprovalRequest);
      (ApprovalRequest.findByExpenseId as jest.Mock).mockResolvedValue([mockApprovalRequest]);
      (ApprovalRequest.getNextPending as jest.Mock).mockResolvedValue(null);
      (ApprovalRule.findByCompanyId as jest.Mock).mockResolvedValue([]);
      (ApprovalHistory.logApproval as jest.Mock).mockResolvedValue(undefined);
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);
      (Expense.updateStatus as jest.Mock).mockResolvedValue(true);
      (CurrencyService.getExchangeRate as jest.Mock).mockResolvedValue(0.85);
      (CurrencyService.convertAmount as jest.Mock).mockResolvedValue(85);

      // Process approval
      await workflowEngine.processApproval(mockExpenseId, mockApproverId, {
        decision: 'APPROVED',
        comments: 'Looks good',
      });

      // Verify approval request was updated
      expect(mockApprovalRequest.status).toBe(ApprovalRequestStatus.APPROVED);
      expect(mockApprovalRequest.save).toHaveBeenCalled();

      // Verify currency conversion was called
      expect(CurrencyService.getExchangeRate).toHaveBeenCalledWith('USD', 'EUR');
      expect(CurrencyService.convertAmount).toHaveBeenCalledWith(100, 'USD', 'EUR');

      // Verify expense was updated with converted amount
      expect(mockExpense.convertedAmount).toBe(85);
      expect(mockExpense.convertedCurrency).toBe('EUR');
      expect(mockExpense.save).toHaveBeenCalled();

      // Verify expense status was updated to approved
      expect(Expense.updateStatus).toHaveBeenCalledWith(mockExpenseId, ExpenseStatus.APPROVED);

      // Verify workflow completion was logged
      expect(ApprovalHistory.logAction).toHaveBeenCalledWith(
        mockExpenseId,
        'SYSTEM',
        'WORKFLOW_COMPLETED',
        expect.stringContaining('approved and currency converted'),
        expect.objectContaining({
          finalStatus: ExpenseStatus.APPROVED,
        })
      );
    });

    it('should still approve expense if currency conversion fails', async () => {
      // Mock expense in USD
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: mockSubmitterId,
        amount: 100,
        currency: 'USD',
        status: ExpenseStatus.PENDING,
        convertedAmount: 0,
        convertedCurrency: '',
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Mock company with EUR as base currency
      const mockCompany = {
        id: mockCompanyId,
        defaultCurrency: 'EUR',
      } as any;

      // Mock submitter
      const mockSubmitter = {
        id: mockSubmitterId,
        companyId: mockCompanyId,
        role: UserRole.EMPLOYEE,
        isManagerApprover: false,
      } as any;

      // Mock approval request
      const mockApprovalRequest = {
        id: 'request-123',
        expenseId: mockExpenseId,
        approverId: mockApproverId,
        status: ApprovalRequestStatus.PENDING,
        sequence: 1,
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Setup mocks
      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      (User.findById as jest.Mock).mockResolvedValue(mockSubmitter);
      (ApprovalRequest.findByExpenseAndApprover as jest.Mock).mockResolvedValue(mockApprovalRequest);
      (ApprovalRequest.findByExpenseId as jest.Mock).mockResolvedValue([mockApprovalRequest]);
      (ApprovalRequest.getNextPending as jest.Mock).mockResolvedValue(null);
      (ApprovalRule.findByCompanyId as jest.Mock).mockResolvedValue([]);
      (ApprovalHistory.logApproval as jest.Mock).mockResolvedValue(undefined);
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);
      (Expense.updateStatus as jest.Mock).mockResolvedValue(true);
      
      // Mock currency conversion failure
      (CurrencyService.getExchangeRate as jest.Mock).mockRejectedValue(
        new Error('Exchange rate API unavailable')
      );

      // Process approval
      await workflowEngine.processApproval(mockExpenseId, mockApproverId, {
        decision: 'APPROVED',
        comments: 'Looks good',
      });

      // Verify expense was still approved despite conversion failure
      expect(Expense.updateStatus).toHaveBeenCalledWith(mockExpenseId, ExpenseStatus.APPROVED);

      // Verify warning was logged
      expect(ApprovalHistory.logAction).toHaveBeenCalledWith(
        mockExpenseId,
        'SYSTEM',
        'WORKFLOW_COMPLETED_WITH_WARNING',
        expect.stringContaining('currency conversion failed'),
        expect.objectContaining({
          finalStatus: ExpenseStatus.APPROVED,
          conversionError: expect.any(String),
        })
      );
    });

    it('should not convert currency when expense is rejected', async () => {
      // Mock expense
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: mockSubmitterId,
        amount: 100,
        currency: 'USD',
        status: ExpenseStatus.PENDING,
        convertedAmount: 0,
        convertedCurrency: '',
      } as any;

      // Mock approval request
      const mockApprovalRequest = {
        id: 'request-123',
        expenseId: mockExpenseId,
        approverId: mockApproverId,
        status: ApprovalRequestStatus.PENDING,
        sequence: 1,
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Setup mocks
      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (ApprovalRequest.findByExpenseAndApprover as jest.Mock).mockResolvedValue(mockApprovalRequest);
      (ApprovalHistory.logRejection as jest.Mock).mockResolvedValue(undefined);
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);
      (Expense.updateStatus as jest.Mock).mockResolvedValue(true);

      // Process rejection
      await workflowEngine.processApproval(mockExpenseId, mockApproverId, {
        decision: 'REJECTED',
        comments: 'Not approved',
      });

      // Verify currency conversion was NOT called
      expect(CurrencyService.getExchangeRate).not.toHaveBeenCalled();
      expect(CurrencyService.convertAmount).not.toHaveBeenCalled();

      // Verify expense was rejected
      expect(Expense.updateStatus).toHaveBeenCalledWith(mockExpenseId, ExpenseStatus.REJECTED);
    });
  });
});
