import { v4 as uuidv4 } from 'uuid';
import { Expense as ExpenseInterface, ExpenseStatus } from '../types/database';
import { db } from '../config/database';

export class Expense {
  public id: string;
  public companyId: string;
  public submitterId: string;
  public amount: number;
  public currency: string;
  public category: string;
  public description: string;
  public expenseDate: Date;
  public receiptUrl: string | null;
  public status: ExpenseStatus;
  public convertedAmount: number;
  public convertedCurrency: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<ExpenseInterface>) {
    this.id = data.id || uuidv4();
    this.companyId = data.company_id || '';
    this.submitterId = data.submitter_id || '';
    this.amount = data.amount || 0;
    this.currency = data.currency || '';
    this.category = data.category || '';
    this.description = data.description || '';
    this.expenseDate = data.expense_date || new Date();
    this.receiptUrl = data.receipt_url || null;
    this.status = data.status || ExpenseStatus.PENDING;
    this.convertedAmount = data.converted_amount || 0;
    this.convertedCurrency = data.converted_currency || '';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  /**
   * Convert Expense instance to database format
   * @returns ExpenseInterface - Database format object
   */
  public toDatabase(): ExpenseInterface {
    return {
      id: this.id,
      company_id: this.companyId,
      submitter_id: this.submitterId,
      amount: this.amount,
      currency: this.currency,
      category: this.category,
      description: this.description,
      expense_date: this.expenseDate,
      receipt_url: this.receiptUrl,
      status: this.status,
      converted_amount: this.convertedAmount,
      converted_currency: this.convertedCurrency,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Create Expense from database row
   * @param row - Database row
   * @returns Expense - Expense instance
   */
  public static fromDatabase(row: ExpenseInterface): Expense {
    return new Expense(row);
  }

  /**
   * Save expense to database
   * @returns Promise<Expense> - Saved expense instance
   */
  public async save(): Promise<Expense> {
    this.updatedAt = new Date();
    const expenseData = this.toDatabase();
    
    const [savedExpense] = await db('expenses')
      .insert(expenseData)
      .onConflict('id')
      .merge([
        'amount', 'currency', 'category', 'description', 'expense_date',
        'receipt_url', 'status', 'converted_amount', 'converted_currency', 'updated_at'
      ])
      .returning('*');
    
    return Expense.fromDatabase(savedExpense);
  }

  /**
   * Find expense by ID
   * @param id - Expense ID
   * @returns Promise<Expense | null> - Expense instance or null
   */
  public static async findById(id: string): Promise<Expense | null> {
    const expense = await db('expenses').where('id', id).first();
    return expense ? Expense.fromDatabase(expense) : null;
  }

  /**
   * Find expenses by submitter ID
   * @param submitterId - Submitter ID
   * @returns Promise<Expense[]> - Array of expense instances
   */
  public static async findBySubmitterId(submitterId: string): Promise<Expense[]> {
    const expenses = await db('expenses').where('submitter_id', submitterId).orderBy('created_at', 'desc');
    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Find expenses by company ID
   * @param companyId - Company ID
   * @returns Promise<Expense[]> - Array of expense instances
   */
  public static async findByCompanyId(companyId: string): Promise<Expense[]> {
    const expenses = await db('expenses').where('company_id', companyId).orderBy('created_at', 'desc');
    return expenses.map(expense => Expense.fromDatabase(expense));
  }

  /**
   * Delete expense by ID
   * @param id - Expense ID
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteById(id: string): Promise<boolean> {
    const deletedCount = await db('expenses').where('id', id).del();
    return deletedCount > 0;
  }

  /**
   * Update expense status
   * @param id - Expense ID
   * @param status - New status
   * @returns Promise<boolean> - True if updated successfully
   */
  public static async updateStatus(id: string, status: ExpenseStatus): Promise<boolean> {
    const updatedCount = await db('expenses')
      .where('id', id)
      .update({
        status,
        updated_at: new Date()
      });
    return updatedCount > 0;
  }
}