import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { UserRole, ExpenseStatus } from '../../types/database';
import path from 'path';
import fs from 'fs';

describe('Expense Submission Integration Tests', () => {
  let company: any;
  let adminUser: any;
  let managerUser: any;
  let employeeUser: any;
  let employeeToken: string;
  let managerToken: string;
  let adminToken: string;

  beforeEach(async () => {
    company = await testDataFactory.createTestCompany();
    
    adminUser = await testDataFactory.createTestUser(company.id, {
      role: UserRole.ADMIN,
    });
    
    managerUser = await testDataFactory.createTestUser(company.id, {
      role: UserRole.MANAGER,
      isManagerApprover: true,
    });
    
    employeeUser = await testDataFactory.createTestUser(company.id, {
      role: UserRole.EMPLOYEE,
      managerId: managerUser.id,
    });

    // Get auth tokens
    const employeeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: employeeUser.email,
        password: 'password123',
      });
    employeeToken = employeeLogin.body.accessToken;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: managerUser.email,
        password: 'password123',
      });
    managerToken = managerLogin.body.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'password123',
      });
    adminToken = adminLogin.body.accessToken;
  });

  describe('Basic Expense Submission', () => {
    it('should allow employee to submit expense with all required fields', async () => {
      const expenseData = {
        amount: 150.75,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip to client site',
        expenseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(expenseData)
        .expect(201);

      expect(response.body.amount).toBe(expenseData.amount);
      expect(response.body.currency).toBe(expenseData.currency);
      expect(response.body.category).toBe(expenseData.category);
      expect(response.body.description).toBe(expenseData.description);
      expect(response.body.status).toBe(ExpenseStatus.PENDING);
      expect(response.body.submitterId).toBe(employeeUser.id);
      expect(response.body.companyId).toBe(company.id);

      // Verify currency conversion
      expect(response.body.convertedAmount).toBe(expenseData.amount); // USD to USD
      expect(response.body.convertedCurrency).toBe(company.defaultCurrency);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        amount: 100,
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should validate amount is positive', async () => {
      const invalidData = {
        amount: -50,
        currency: 'USD',
        category: 'Travel',
        description: 'Invalid expense',
        expenseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('amount must be positive');
    });

    it('should validate expense date is not in future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const invalidData = {
        amount: 100,
        currency: 'USD',
        category: 'Travel',
        description: 'Future expense',
        expenseDate: futureDate.toISOString().split('T')[0],
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('future date');
    });
  });

  describe('Multi-Currency Support', () => {
    it('should handle foreign currency expense with conversion', async () => {
      const expenseData = {
        amount: 100,
        currency: 'EUR',
        category: 'Travel',
        description: 'European business trip',
        expenseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(expenseData)
        .expect(201);

      expect(response.body.amount).toBe(expenseData.amount);
      expect(response.body.currency).toBe('EUR');
      expect(response.body.convertedCurrency).toBe('USD');
      expect(response.body.convertedAmount).toBeGreaterThan(0);
      expect(response.body.convertedAmount).not.toBe(expenseData.amount); // Should be converted
    });

    it('should handle same currency as company default', async () => {
      const expenseData = {
        amount: 200,
        currency: 'USD', // Same as company default
        category: 'Office Supplies',
        description: 'Office equipment',
        expenseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(expenseData)
        .expect(201);

      expect(response.body.convertedAmount).toBe(expenseData.amount);
      expect(response.body.convertedCurrency).toBe('USD');
    });
  });

  describe('OCR Receipt Scanning', () => {
    it('should process receipt upload and extract data', async () => {
      // Create a test image file (simple text file for testing)
      const testReceiptPath = path.join(__dirname, '../fixtures/test-receipt.txt');
      const testReceiptContent = 'RECEIPT\nAmount: $45.99\nDate: 2024-01-15\nMerchant: Test Store\nCategory: Office Supplies';
      
      // Ensure fixtures directory exists
      const fixturesDir = path.dirname(testReceiptPath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      
      fs.writeFileSync(testReceiptPath, testReceiptContent);

      const response = await request(app)
        .post('/api/ocr/scan')
        .set('Authorization', `Bearer ${employeeToken}`)
        .attach('receipt', testReceiptPath)
        .expect(200);

      expect(response.body).toHaveProperty('extractedData');
      expect(response.body.extractedData).toHaveProperty('amount');
      expect(response.body.extractedData).toHaveProperty('date');
      expect(response.body.extractedData).toHaveProperty('description');

      // Clean up
      fs.unlinkSync(testReceiptPath);
    });

    it('should handle OCR failure gracefully', async () => {
      // Create an invalid file
      const invalidFilePath = path.join(__dirname, '../fixtures/invalid-file.txt');
      const fixturesDir = path.dirname(invalidFilePath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      
      fs.writeFileSync(invalidFilePath, 'Invalid content that cannot be processed');

      const response = await request(app)
        .post('/api/ocr/scan')
        .set('Authorization', `Bearer ${employeeToken}`)
        .attach('receipt', invalidFilePath)
        .expect(200);

      // Should return empty or default data when OCR fails
      expect(response.body).toHaveProperty('extractedData');

      // Clean up
      fs.unlinkSync(invalidFilePath);
    });

    it('should validate file type and size', async () => {
      // Test with no file
      const response = await request(app)
        .post('/api/ocr/scan')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(response.body.message).toContain('file');
    });
  });

  describe('Expense Retrieval and Filtering', () => {
    let expense1: any;
    let expense2: any;
    let expense3: any;

    beforeEach(async () => {
      // Create test expenses
      expense1 = await testDataFactory.createTestExpense(company.id, employeeUser.id, {
        amount: 100,
        category: 'Travel',
        status: ExpenseStatus.PENDING,
      });
      
      expense2 = await testDataFactory.createTestExpense(company.id, employeeUser.id, {
        amount: 200,
        category: 'Office Supplies',
        status: ExpenseStatus.APPROVED,
      });
      
      expense3 = await testDataFactory.createTestExpense(company.id, employeeUser.id, {
        amount: 150,
        category: 'Travel',
        status: ExpenseStatus.REJECTED,
      });
    });

    it('should allow employee to view their own expenses', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      
      // All expenses should belong to the employee
      response.body.forEach((expense: any) => {
        expect(expense.submitterId).toBe(employeeUser.id);
      });
    });

    it('should allow manager to view team expenses', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should include expenses from direct reports
      const employeeExpenses = response.body.filter((expense: any) => 
        expense.submitterId === employeeUser.id
      );
      expect(employeeExpenses.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow admin to view all company expenses', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All expenses should belong to the company
      response.body.forEach((expense: any) => {
        expect(expense.companyId).toBe(company.id);
      });
    });

    it('should filter expenses by status', async () => {
      const response = await request(app)
        .get('/api/expenses?status=PENDING')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      response.body.forEach((expense: any) => {
        expect(expense.status).toBe(ExpenseStatus.PENDING);
      });
    });

    it('should get specific expense details', async () => {
      const response = await request(app)
        .get(`/api/expenses/${expense1.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.id).toBe(expense1.id);
      expect(response.body.amount).toBe(expense1.amount);
      expect(response.body.category).toBe(expense1.category);
    });
  });

  describe('Expense Modification', () => {
    let pendingExpense: any;
    let approvedExpense: any;

    beforeEach(async () => {
      pendingExpense = await testDataFactory.createTestExpense(company.id, employeeUser.id, {
        status: ExpenseStatus.PENDING,
      });
      
      approvedExpense = await testDataFactory.createTestExpense(company.id, employeeUser.id, {
        status: ExpenseStatus.APPROVED,
      });
    });

    it('should allow employee to update pending expense', async () => {
      const updateData = {
        amount: 250,
        description: 'Updated description',
        category: 'Updated Category',
      };

      const response = await request(app)
        .put(`/api/expenses/${pendingExpense.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.amount).toBe(updateData.amount);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.category).toBe(updateData.category);
    });

    it('should prevent employee from updating approved expense', async () => {
      const updateData = {
        amount: 300,
        description: 'Should not update',
      };

      const response = await request(app)
        .put(`/api/expenses/${approvedExpense.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toContain('cannot be modified');
    });

    it('should allow employee to delete pending expense', async () => {
      await request(app)
        .delete(`/api/expenses/${pendingExpense.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // Verify expense is deleted
      const response = await request(app)
        .get(`/api/expenses/${pendingExpense.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);
    });

    it('should prevent employee from deleting approved expense', async () => {
      const response = await request(app)
        .delete(`/api/expenses/${approvedExpense.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(response.body.message).toContain('cannot be deleted');
    });
  });

  describe('Authorization Checks', () => {
    let otherCompany: any;
    let otherEmployee: any;
    let otherToken: string;
    let expense: any;

    beforeEach(async () => {
      // Create another company and employee
      otherCompany = await testDataFactory.createTestCompany();
      otherEmployee = await testDataFactory.createTestUser(otherCompany.id, {
        role: UserRole.EMPLOYEE,
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: otherEmployee.email,
          password: 'password123',
        });
      otherToken = otherLogin.body.accessToken;

      // Create expense in first company
      expense = await testDataFactory.createTestExpense(company.id, employeeUser.id);
    });

    it('should prevent cross-company expense access', async () => {
      const response = await request(app)
        .get(`/api/expenses/${expense.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should prevent employee from viewing other employees expenses', async () => {
      const otherEmployeeInSameCompany = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
      });

      const otherExpense = await testDataFactory.createTestExpense(
        company.id,
        otherEmployeeInSameCompany.id
      );

      const response = await request(app)
        .get(`/api/expenses/${otherExpense.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);
    });
  });
});