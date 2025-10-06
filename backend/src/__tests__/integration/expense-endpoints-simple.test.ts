import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { db } from '../../config/database';
import { User } from '../../models/User';
import { generateTokenPair } from '../../utils/jwt';
import { UserRole, ExpenseStatus, ExpenseCategory } from '../../types/database';

describe('Expense Submission Endpoints - Simple Tests', () => {
  let employeeToken: string;
  let companyId: string;
  let employeeUserId: string;
  let draftExpenseId: string;

  beforeAll(async () => {
    // Create test company
    const company = await testDataFactory.createTestCompany({
      name: 'Simple Test Company',
      country: 'United States',
      defaultCurrency: 'USD'
    });
    companyId = company.id;

    // Create employee user
    const employeeUser = await testDataFactory.createTestUser(companyId, {
      email: 'employee-simple@test.com',
      firstName: 'Employee',
      lastName: 'User',
      role: UserRole.EMPLOYEE
    });
    employeeUserId = employeeUser.id;
    const employee = await User.findById(employeeUserId);
    if (employee) {
      const tokens = generateTokenPair(employee);
      employeeToken = tokens.accessToken;
    }
  });

  afterAll(async () => {
    // Clean up
    await db('expenses').where('company_id', companyId).del();
    await db('users').where('company_id', companyId).del();
    await db('companies').where('id', companyId).del();
  });

  describe('POST /api/expenses/draft', () => {
    it('should save expense as draft', async () => {
      const response = await request(app)
        .post('/api/expenses/draft')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 100.50,
          currency: 'USD',
          category: 'Travel',
          description: 'Flight ticket',
          expenseDate: '2024-01-15'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.expense.status).toBe(ExpenseStatus.DRAFT);
      
      draftExpenseId = response.body.data.expense.id;
    });
  });

  describe('GET /api/expenses/category/:category', () => {
    it('should get expenses in AMOUNT_TO_SUBMIT category', async () => {
      const response = await request(app)
        .get('/api/expenses/category/AMOUNT_TO_SUBMIT')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBe('AMOUNT_TO_SUBMIT');
      expect(response.body.data.expenses).toBeInstanceOf(Array);
      expect(response.body.data.expenses.length).toBeGreaterThan(0);
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .get('/api/expenses/category/INVALID')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_CATEGORY');
    });
  });

  describe('POST /api/expenses/:id/submit', () => {
    it('should submit a draft expense', async () => {
      const response = await request(app)
        .post(`/api/expenses/${draftExpenseId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.expense.status).toBe(ExpenseStatus.PENDING);
      expect(response.body.data.expense.category).toBe(ExpenseCategory.WAITING_APPROVAL);
    });

    it('should reject submission of non-existent expense', async () => {
      const response = await request(app)
        .post('/api/expenses/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('EXPENSE_NOT_FOUND');
    });
  });
});
