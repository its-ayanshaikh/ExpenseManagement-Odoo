import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { generateTokenPair } from '../../utils/jwt';
import { User } from '../../models/User';
import { testDataFactory } from '../helpers/testHelpers';
import { UserRole, ExpenseStatus, ExpenseCategory, ApprovalRuleType } from '../../types/database';

describe('Expense Submission API Endpoints - Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let companyId: string;
  let adminUserId: string;
  let employeeUserId: string;
  let managerUserId: string;
  let draftExpenseId: string;

  beforeAll(async () => {
    // Create test company
    const company = await testDataFactory.createTestCompany({
      name: 'Test Expense Submission Company',
      country: 'United States',
      defaultCurrency: 'USD'
    });
    companyId = company.id;

    // Create admin user
    const adminUser = await testDataFactory.createTestUser(companyId, {
      email: 'admin-expense-submission@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN
    });
    adminUserId = adminUser.id;
    const admin = await User.findById(adminUserId);
    if (admin) {
      const tokens = generateTokenPair(admin);
      adminToken = tokens.accessToken;
    }

    // Create manager user
    const managerUser = await testDataFactory.createTestUser(companyId, {
      email: 'manager-expense-submission@test.com',
      firstName: 'Manager',
      lastName: 'User',
      role: UserRole.MANAGER
    });
    managerUserId = managerUser.id;
    const manager = await User.findById(managerUserId);
    if (manager) {
      const tokens = generateTokenPair(manager);
      managerToken = tokens.accessToken;
    }

    // Create employee user
    const employeeUser = await testDataFactory.createTestUser(companyId, {
      email: 'employee-expense-submission@test.com',
      firstName: 'Employee',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      managerId: managerUserId,
      isManagerApprover: true
    });
    employeeUserId = employeeUser.id;
    const employee = await User.findById(employeeUserId);
    if (employee) {
      const tokens = generateTokenPair(employee);
      employeeToken = tokens.accessToken;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await db('approval_history').where('expense_id', 'in', db('expenses').select('id').where('company_id', companyId)).del();
    await db('approval_requests').where('expense_id', 'in', db('expenses').select('id').where('company_id', companyId)).del();
    await db('expenses').where('company_id', companyId).del();
    await db('approval_rule_approvers').where('approval_rule_id', 'in', db('approval_rules').select('id').where('company_id', companyId)).del();
    await db('approval_rules').where('company_id', companyId).del();
    await db('users').where('company_id', companyId).del();
    await db('companies').where('id', companyId).del();
  });

  describe('POST /api/expenses/draft', () => {
    it('should save expense as draft without submitting', async () => {
      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 100.50,
          currency: 'USD',
          category: 'Travel',
          description: 'Flight ticket',
          expenseDate: '2024-01-15',
          receiptUrl: 'https://example.com/receipt.jpg'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Expense draft saved successfully');
      expect(response.body.data.expense).toMatchObject({
        currency: 'USD',
        category: 'Travel',
        description: 'Flight ticket',
        status: ExpenseStatus.DRAFT,
        submitterId: employeeUserId,
        companyId: companyId
      });
      // Check amount separately (could be string or number)
      expect(parseFloat(response.body.data.expense.amount)).toBe(100.50);

      // Save the draft expense ID for later tests
      draftExpenseId = response.body.data.expense.id;
    });

    it('should reject draft creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 100.50,
          currency: 'USD'
          // Missing category, description, expenseDate
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject draft creation with invalid amount', async () => {
      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: -50,
          currency: 'USD',
          category: 'Travel',
          description: 'Test',
          expenseDate: '2024-01-15'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_AMOUNT');
    });

    it('should reject draft creation with invalid currency format', async () => {
      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 100,
          currency: 'US', // Invalid - should be 3 letters
          category: 'Travel',
          description: 'Test',
          expenseDate: '2024-01-15'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_CURRENCY');
    });

    it('should reject draft creation with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 100,
          currency: 'USD',
          category: 'Travel',
          description: 'Test',
          expenseDate: futureDate.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('FUTURE_DATE');
    });

    it('should reject draft creation for non-employee users', async () => {
      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100,
          currency: 'USD',
          category: 'Travel',
          description: 'Test',
          expenseDate: '2024-01-15'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/expenses/:id/submit', () => {
    it('should submit a draft expense for approval', async () => {
      // Create approval rule first
      const [approvalRule] = await db('approval_rules')
        .insert({
          company_id: companyId,
          name: 'Default Rule',
          rule_type: ApprovalRuleType.SEQUENTIAL,
          is_hybrid: false,
          priority: 0
        })
        .returning('*');

      // Add manager as required approver
      await db('approval_rule_approvers').insert({
        approval_rule_id: approvalRule.id,
        approver_id: managerUserId,
        sequence: 1
      });

      const response = await request(app)
        .post(`/api/expenses/${draftExpenseId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Expense submitted for approval successfully');
      expect(response.body.data.expense).toMatchObject({
        id: draftExpenseId,
        status: ExpenseStatus.PENDING,
        category: ExpenseCategory.WAITING_APPROVAL
      });

      // Verify approval request was created
      const approvalRequests = await db('approval_requests')
        .where('expense_id', draftExpenseId);
      expect(approvalRequests.length).toBeGreaterThan(0);
    });

    it('should reject submission of non-existent expense', async () => {
      const response = await request(app)
        .post('/api/expenses/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('EXPENSE_NOT_FOUND');
    });

    it('should reject submission of already submitted expense', async () => {
      const response = await request(app)
        .post(`/api/expenses/${draftExpenseId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('EXPENSE_NOT_DRAFT');
    });

    it('should reject submission of expense owned by another user', async () => {
      // Create another draft expense for admin
      const [adminExpense] = await db('expenses')
        .insert({
          company_id: companyId,
          submitter_id: adminUserId,
          amount: 200,
          currency: 'USD',
          category: 'Office',
          description: 'Admin expense',
          expense_date: new Date('2024-01-20'),
          status: ExpenseStatus.DRAFT,
          converted_amount: 0,
          converted_currency: ''
        })
        .returning('*');

      const response = await request(app)
        .post(`/api/expenses/${adminExpense.id}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('EXPENSE_SUBMIT_ACCESS_DENIED');
    });
  });

  describe('GET /api/expenses/category/:category', () => {
    beforeAll(async () => {
      // Create expenses in different categories for testing
      // Draft expense (AMOUNT_TO_SUBMIT)
      await db('expenses').insert({
        company_id: companyId,
        submitter_id: employeeUserId,
        amount: 50,
        currency: 'USD',
        category: 'Food',
        description: 'Draft expense',
        expense_date: new Date('2024-01-10'),
        status: ExpenseStatus.DRAFT,
        converted_amount: 0,
        converted_currency: ''
      });

      // Approved expense
      await db('expenses').insert({
        company_id: companyId,
        submitter_id: employeeUserId,
        amount: 150,
        currency: 'USD',
        category: 'Travel',
        description: 'Approved expense',
        expense_date: new Date('2024-01-05'),
        status: ExpenseStatus.APPROVED,
        converted_amount: 150,
        converted_currency: 'USD'
      });
    });

    it('should get expenses in AMOUNT_TO_SUBMIT category (drafts)', async () => {
      const response = await request(app)
        .get('/api/expenses/category/AMOUNT_TO_SUBMIT')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBe('AMOUNT_TO_SUBMIT');
      expect(response.body.data.expenses).toBeInstanceOf(Array);
      expect(response.body.data.expenses.length).toBeGreaterThan(0);
      expect(response.body.data.expenses.every((e: any) => e.status === ExpenseStatus.DRAFT)).toBe(true);
    });

    it('should get expenses in WAITING_APPROVAL category', async () => {
      const response = await request(app)
        .get('/api/expenses/category/WAITING_APPROVAL')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBe('WAITING_APPROVAL');
      expect(response.body.data.expenses).toBeInstanceOf(Array);
      // Should include the submitted expense from previous test
      expect(response.body.data.expenses.some((e: any) => e.status === ExpenseStatus.PENDING)).toBe(true);
    });

    it('should get expenses in APPROVED category', async () => {
      const response = await request(app)
        .get('/api/expenses/category/APPROVED')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBe('APPROVED');
      expect(response.body.data.expenses).toBeInstanceOf(Array);
      expect(response.body.data.expenses.length).toBeGreaterThan(0);
      expect(response.body.data.expenses.every((e: any) => e.status === ExpenseStatus.APPROVED)).toBe(true);
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .get('/api/expenses/category/INVALID_CATEGORY')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_CATEGORY');
      expect(response.body.validCategories).toEqual(['AMOUNT_TO_SUBMIT', 'WAITING_APPROVAL', 'APPROVED']);
    });

    it('should reject access for non-employee users', async () => {
      const response = await request(app)
        .get('/api/expenses/category/AMOUNT_TO_SUBMIT')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
    });

    it('should only return expenses for the authenticated user', async () => {
      // Create another employee
      const [employee2] = await db('users')
        .insert({
          company_id: companyId,
          email: 'employee2@test.com',
          password_hash: 'hashed_password',
          first_name: 'Employee2',
          last_name: 'User',
          role: UserRole.EMPLOYEE,
          manager_id: managerUserId,
          is_manager_approver: false
        })
        .returning('*');

      const employee2User = await User.findById(employee2.id);
      let employee2Token = '';
      if (employee2User) {
        const tokens = generateTokenPair(employee2User);
        employee2Token = tokens.accessToken;
      }

      // Create expense for employee2
      await db('expenses').insert({
        company_id: companyId,
        submitter_id: employee2.id,
        amount: 75,
        currency: 'USD',
        category: 'Office',
        description: 'Employee2 draft',
        expense_date: new Date('2024-01-12'),
        status: ExpenseStatus.DRAFT,
        converted_amount: 0,
        converted_currency: ''
      });

      // Employee 1 should not see employee 2's expenses
      const response = await request(app)
        .get('/api/expenses/category/AMOUNT_TO_SUBMIT')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.expenses.every((e: any) => e.submitterId === employeeUserId)).toBe(true);
    });
  });

  describe('Existing endpoints verification', () => {
    it('should verify GET /api/expenses works', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.expenses).toBeInstanceOf(Array);
    });

    it('should verify GET /api/expenses/:id works', async () => {
      const response = await request(app)
        .get(`/api/expenses/${draftExpenseId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.expense.id).toBe(draftExpenseId);
    });

    it('should verify PUT /api/expenses/:id works for drafts', async () => {
      // Create a new draft to update
      const [newDraft] = await db('expenses')
        .insert({
          company_id: companyId,
          submitter_id: employeeUserId,
          amount: 80,
          currency: 'USD',
          category: 'Food',
          description: 'Original description',
          expense_date: new Date('2024-01-18'),
          status: ExpenseStatus.DRAFT,
          converted_amount: 0,
          converted_currency: ''
        })
        .returning('*');

      const response = await request(app)
        .put(`/api/expenses/${newDraft.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          description: 'Updated description',
          amount: 90
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.expense.description).toBe('Updated description');
      expect(response.body.data.expense.amount).toBe(90);
    });

    it('should verify DELETE /api/expenses/:id works for drafts', async () => {
      // Create a new draft to delete
      const [draftToDelete] = await db('expenses')
        .insert({
          company_id: companyId,
          submitter_id: employeeUserId,
          amount: 60,
          currency: 'USD',
          category: 'Office',
          description: 'To be deleted',
          expense_date: new Date('2024-01-19'),
          status: ExpenseStatus.DRAFT,
          converted_amount: 0,
          converted_currency: ''
        })
        .returning('*');

      const response = await request(app)
        .delete(`/api/expenses/${draftToDelete.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.deletedExpenseId).toBe(draftToDelete.id);

      // Verify it's actually deleted
      const deletedExpense = await db('expenses').where('id', draftToDelete.id).first();
      expect(deletedExpense).toBeUndefined();
    });
  });
});
