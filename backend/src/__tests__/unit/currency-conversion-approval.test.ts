import { ExpenseService } from '../../services/ExpenseService';
import { CurrencyService } from '../../services/CurrencyService';
import { Expense } from '../../models/Expense';
import { Company } from '../../models/Company';
import { ApprovalHistory } from '../../models/ApprovalHistory';
import { ExpenseStatus } from '../../types/database';

// Mock dependencies
jest.mock('../../models/Expense');
jest.mock('../../models/Company');
jest.mock('../../models/ApprovalHistory');
jest.mock('../../services/CurrencyService');

describe('ExpenseService - Currency Conversion at Approval', () => {
  const mockExpenseId = 'expense-123';
  const mockCompanyId = 'company-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertExpenseCurrency', () => {
    it('should convert expense from USD to EUR', async () => {
      // Mock expense in USD
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: 'user-123',
        amount: 100,
        currency: 'USD',
        convertedAmount: 0,
        convertedCurrency: '',
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Mock company with EUR as base currency
      const mockCompany = {
        id: mockCompanyId,
        defaultCurrency: 'EUR',
      } as any;

      // Mock currency service
      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      (CurrencyService.getExchangeRate as jest.Mock).mockResolvedValue(0.85);
      (CurrencyService.convertAmount as jest.Mock).mockResolvedValue(85);
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);

      // Execute conversion
      const convertedAmount = await ExpenseService.convertExpenseCurrency(mockExpenseId);

      // Verify conversion
      expect(convertedAmount).toBe(85);
      expect(mockExpense.convertedAmount).toBe(85);
      expect(mockExpense.convertedCurrency).toBe('EUR');
      expect(mockExpense.save).toHaveBeenCalled();

      // Verify currency service was called correctly
      expect(CurrencyService.getExchangeRate).toHaveBeenCalledWith('USD', 'EUR');
      expect(CurrencyService.convertAmount).toHaveBeenCalledWith(100, 'USD', 'EUR');

      // Verify logging
      expect(ApprovalHistory.logAction).toHaveBeenCalledWith(
        mockExpenseId,
        'SYSTEM',
        'CURRENCY_CONVERSION',
        expect.stringContaining('Converted 100 USD to 85 EUR'),
        expect.objectContaining({
          originalAmount: 100,
          originalCurrency: 'USD',
          convertedAmount: 85,
          convertedCurrency: 'EUR',
          exchangeRate: 0.85,
        })
      );
    });

    it('should not convert when expense is already in company currency', async () => {
      // Mock expense in EUR
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: 'user-123',
        amount: 100,
        currency: 'EUR',
        convertedAmount: 0,
        convertedCurrency: '',
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Mock company with EUR as base currency
      const mockCompany = {
        id: mockCompanyId,
        defaultCurrency: 'EUR',
      } as any;

      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);

      // Execute conversion
      const convertedAmount = await ExpenseService.convertExpenseCurrency(mockExpenseId);

      // Verify no conversion occurred
      expect(convertedAmount).toBe(100);
      expect(mockExpense.convertedAmount).toBe(100);
      expect(mockExpense.convertedCurrency).toBe('EUR');
      expect(mockExpense.save).toHaveBeenCalled();

      // Verify currency service was NOT called
      expect(CurrencyService.getExchangeRate).not.toHaveBeenCalled();
      expect(CurrencyService.convertAmount).not.toHaveBeenCalled();

      // Verify logging
      expect(ApprovalHistory.logAction).toHaveBeenCalledWith(
        mockExpenseId,
        'SYSTEM',
        'CURRENCY_CONVERSION',
        'No conversion needed - expense already in company currency',
        expect.objectContaining({
          originalAmount: 100,
          originalCurrency: 'EUR',
          convertedAmount: 100,
          convertedCurrency: 'EUR',
          exchangeRate: 1,
        })
      );
    });

    it('should handle currency conversion failure gracefully', async () => {
      // Mock expense in USD
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: 'user-123',
        amount: 100,
        currency: 'USD',
        convertedAmount: 0,
        convertedCurrency: '',
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Mock company with EUR as base currency
      const mockCompany = {
        id: mockCompanyId,
        defaultCurrency: 'EUR',
      } as any;

      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      (CurrencyService.getExchangeRate as jest.Mock).mockRejectedValue(
        new Error('Exchange rate API unavailable')
      );
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);

      // Execute conversion and expect error
      await expect(ExpenseService.convertExpenseCurrency(mockExpenseId)).rejects.toThrow(
        'Currency conversion failed: Exchange rate API unavailable'
      );

      // Verify error was logged
      expect(ApprovalHistory.logAction).toHaveBeenCalledWith(
        mockExpenseId,
        'SYSTEM',
        'CURRENCY_CONVERSION_FAILED',
        expect.stringContaining('Failed to convert currency'),
        expect.objectContaining({
          originalAmount: 100,
          originalCurrency: 'USD',
          targetCurrency: 'EUR',
          error: 'Exchange rate API unavailable',
        })
      );
    });

    it('should throw error if expense not found', async () => {
      (Expense.findById as jest.Mock).mockResolvedValue(null);

      await expect(ExpenseService.convertExpenseCurrency(mockExpenseId)).rejects.toThrow(
        'Expense not found'
      );
    });

    it('should throw error if company not found', async () => {
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        currency: 'USD',
      } as any;

      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(null);

      await expect(ExpenseService.convertExpenseCurrency(mockExpenseId)).rejects.toThrow(
        'Company not found'
      );
    });

    it('should handle case-insensitive currency comparison', async () => {
      // Mock expense in lowercase usd
      const mockExpense = {
        id: mockExpenseId,
        companyId: mockCompanyId,
        submitterId: 'user-123',
        amount: 100,
        currency: 'usd',
        convertedAmount: 0,
        convertedCurrency: '',
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Mock company with uppercase EUR
      const mockCompany = {
        id: mockCompanyId,
        defaultCurrency: 'EUR',
      } as any;

      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      (CurrencyService.getExchangeRate as jest.Mock).mockResolvedValue(0.85);
      (CurrencyService.convertAmount as jest.Mock).mockResolvedValue(85);
      (ApprovalHistory.logAction as jest.Mock).mockResolvedValue(undefined);

      // Execute conversion
      await ExpenseService.convertExpenseCurrency(mockExpenseId);

      // Verify currency service was called with original case
      expect(CurrencyService.getExchangeRate).toHaveBeenCalledWith('usd', 'EUR');
      expect(CurrencyService.convertAmount).toHaveBeenCalledWith(100, 'usd', 'EUR');
    });
  });
});
