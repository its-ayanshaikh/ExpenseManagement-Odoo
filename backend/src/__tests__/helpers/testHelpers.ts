import { db as knex } from '../../config/database';
import { UserService } from '../../services/UserService';
import { ExpenseService } from '../../services/ExpenseService';
import { ApprovalRuleService } from '../../services/ApprovalRuleService';
import { CurrencyService } from '../../services/CurrencyService';
import { WorkflowEngine } from '../../services/WorkflowEngine';
import { ApprovalService } from '../../services/ApprovalService';
import { UserRole, ExpenseStatus, ApprovalRuleType } from '../../types/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  managerId?: string;
  isManagerApprover: boolean;
}

export interface TestCompany {
  id: string;
  name: string;
  country: string;
  defaultCurrency: string;
}

export interface TestExpense {
  id: string;
  companyId: string;
  submitterId: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expenseDate: Date;
  status: ExpenseStatus;
  convertedAmount: number;
  convertedCurrency: string;
}

export class TestDataFactory {
  private userService = new UserService();
  private expenseService = new ExpenseService();
  private approvalRuleService = new ApprovalRuleService();
  private currencyService = new CurrencyService();
  private workflowEngine = new WorkflowEngine();
  private approvalService = new ApprovalService();

  async createTestCompany(overrides: Partial<TestCompany> = {}): Promise<TestCompany> {
    const company = {
      id: uuidv4(),
      name: 'Test Company',
      country: 'United States',
      defaultCurrency: 'USD',
      ...overrides,
    };

    await knex('companies').insert({
      id: company.id,
      name: company.name,
      country: company.country,
      default_currency: company.defaultCurrency,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return company;
  }

  async createTestUser(
    companyId: string,
    overrides: Partial<Omit<TestUser, 'id' | 'companyId'>> = {}
  ): Promise<TestUser> {
    const userData = {
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      isManagerApprover: false,
      ...overrides,
    };

    const passwordHash = await bcrypt.hash('password123', 10);
    const userId = uuidv4();

    await knex('users').insert({
      id: userId,
      company_id: companyId,
      email: userData.email,
      password_hash: passwordHash,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role,
      manager_id: userData.managerId,
      is_manager_approver: userData.isManagerApprover,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      id: userId,
      companyId,
      ...userData,
    };
  }

  async createTestExpense(
    companyId: string,
    submitterId: string,
    overrides: Partial<Omit<TestExpense, 'id' | 'companyId' | 'submitterId'>> = {}
  ): Promise<TestExpense> {
    const expenseData = {
      amount: 100.00,
      currency: 'USD',
      category: 'Travel',
      description: 'Test expense',
      expenseDate: new Date(),
      status: ExpenseStatus.PENDING,
      convertedAmount: 100.00,
      convertedCurrency: 'USD',
      ...overrides,
    };

    const expenseId = uuidv4();

    await knex('expenses').insert({
      id: expenseId,
      company_id: companyId,
      submitter_id: submitterId,
      amount: expenseData.amount,
      currency: expenseData.currency,
      category: expenseData.category,
      description: expenseData.description,
      expense_date: expenseData.expenseDate,
      status: expenseData.status,
      converted_amount: expenseData.convertedAmount,
      converted_currency: expenseData.convertedCurrency,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      id: expenseId,
      companyId,
      submitterId,
      ...expenseData,
    };
  }

  async createSequentialApprovalRule(
    companyId: string,
    approverIds: string[],
    overrides: any = {}
  ) {
    const ruleId = uuidv4();
    
    await knex('approval_rules').insert({
      id: ruleId,
      company_id: companyId,
      name: 'Sequential Rule',
      rule_type: ApprovalRuleType.SEQUENTIAL,
      priority: 1,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    });

    // Add approvers in sequence
    for (let i = 0; i < approverIds.length; i++) {
      await knex('approval_rule_approvers').insert({
        id: uuidv4(),
        approval_rule_id: ruleId,
        approver_id: approverIds[i],
        sequence: i + 1,
        created_at: new Date(),
      });
    }

    return ruleId;
  }

  async createPercentageApprovalRule(
    companyId: string,
    approverIds: string[],
    percentageThreshold: number,
    overrides: any = {}
  ) {
    const ruleId = uuidv4();
    
    await knex('approval_rules').insert({
      id: ruleId,
      company_id: companyId,
      name: 'Percentage Rule',
      rule_type: ApprovalRuleType.PERCENTAGE,
      percentage_threshold: percentageThreshold,
      priority: 1,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    });

    // Add approvers
    for (let i = 0; i < approverIds.length; i++) {
      await knex('approval_rule_approvers').insert({
        id: uuidv4(),
        approval_rule_id: ruleId,
        approver_id: approverIds[i],
        sequence: i + 1,
        created_at: new Date(),
      });
    }

    return ruleId;
  }

  async createSpecificApproverRule(
    companyId: string,
    specificApproverId: string,
    overrides: any = {}
  ) {
    const ruleId = uuidv4();
    
    await knex('approval_rules').insert({
      id: ruleId,
      company_id: companyId,
      name: 'Specific Approver Rule',
      rule_type: ApprovalRuleType.SPECIFIC_APPROVER,
      specific_approver_id: specificApproverId,
      priority: 1,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    });

    return ruleId;
  }

  async createHybridApprovalRule(
    companyId: string,
    approverIds: string[],
    percentageThreshold: number,
    specificApproverId: string,
    overrides: any = {}
  ) {
    const ruleId = uuidv4();
    
    await knex('approval_rules').insert({
      id: ruleId,
      company_id: companyId,
      name: 'Hybrid Rule',
      rule_type: ApprovalRuleType.HYBRID,
      percentage_threshold: percentageThreshold,
      specific_approver_id: specificApproverId,
      is_hybrid: true,
      priority: 1,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    });

    // Add approvers
    for (let i = 0; i < approverIds.length; i++) {
      await knex('approval_rule_approvers').insert({
        id: uuidv4(),
        approval_rule_id: ruleId,
        approver_id: approverIds[i],
        sequence: i + 1,
        created_at: new Date(),
      });
    }

    return ruleId;
  }

  // Helper methods for assertions
  async getExpenseById(expenseId: string) {
    const expense = await knex('expenses').where('id', expenseId).first();
    return expense;
  }

  async getApprovalRequests(expenseId: string) {
    const requests = await knex('approval_requests')
      .where('expense_id', expenseId)
      .orderBy('sequence');
    return requests;
  }

  async getApprovalHistory(expenseId: string) {
    const history = await knex('approval_history')
      .where('expense_id', expenseId)
      .orderBy('created_at');
    return history;
  }

  async getUsersByCompany(companyId: string) {
    const users = await knex('users').where('company_id', companyId);
    return users;
  }
}

export const testDataFactory = new TestDataFactory();