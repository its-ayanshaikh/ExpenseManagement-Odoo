import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { UserRole, ExpenseStatus, ApprovalRequestStatus } from '../../types/database';

describe('Approval Workflow Integration Tests', () => {
  let company: any;
  let adminUser: any;
  let manager1: any;
  let manager2: any;
  let manager3: any;
  let employeeUser: any;
  let adminToken: string;
  let manager1Token: string;
  let manager2Token: string;
  let manager3Token: string;
  let employeeToken: string;

  beforeEach(async () => {
    company = await testDataFactory.createTestCompany();
    
    adminUser = await testDataFactory.createTestUser(company.id, {
      role: UserRole.ADMIN,
    });
    
    manager1 = await testDataFactory.createTestUser(company.id, {
      role: UserRole.MANAGER,
      firstName: 'Manager',
      lastName: 'One',
      isManagerApprover: true,
    });
    
    manager2 = await testDataFactory.createTestUser(company.id, {
      role: UserRole.MANAGER,
      firstName: 'Manager',
      lastName: 'Two',
      isManagerApprover: true,
    });
    
    manager3 = await testDataFactory.createTestUser(company.id, {
      role: UserRole.MANAGER,
      firstName: 'Manager',
      lastName: 'Three',
      isManagerApprover: true,
    });
    
    employeeUser = await testDataFactory.createTestUser(company.id, {
      role: UserRole.EMPLOYEE,
      managerId: manager1.id,
    });

    // Get auth tokens
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: adminUser.email,
      password: 'password123',
    });
    adminToken = adminLogin.body.accessToken;

    const manager1Login = await request(app).post('/api/auth/login').send({
      email: manager1.email,
      password: 'password123',
    });
    manager1Token = manager1Login.body.accessToken;

    const manager2Login = await request(app).post('/api/auth/login').send({
      email: manager2.email,
      password: 'password123',
    });
    manager2Token = manager2Login.body.accessToken;

    const manager3Login = await request(app).post('/api/auth/login').send({
      email: manager3.email,
      password: 'password123',
    });
    manager3Token = manager3Login.body.accessToken;

    const employeeLogin = await request(app).post('/api/auth/login').send({
      email: employeeUser.email,
      password: 'password123',
    });
    employeeToken = employeeLogin.body.accessToken;
  });

  describe('Sequential Approval Workflow', () => {
    it('should process sequential approval with manager first', async () => {
      // Create sequential approval rule
      await testDataFactory.createSequentialApprovalRule(
        company.id,
        [manager2.id, manager3.id] // manager1 is already the direct manager
      );

      // Submit expense
      const expenseData = {
        amount: 500,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        expenseDate: '2024-01-15',
      };

      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(expenseData)
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Check initial status
      expect(expenseResponse.body.status).toBe(ExpenseStatus.PENDING);

      // Verify approval requests were created
      const approvalRequests = await testDataFactory.getApprovalRequests(expenseId);
      expect(approvalRequests.length).toBeGreaterThan(0);

      // First approval should be from direct manager (manager1)
      const firstRequest = approvalRequests.find(r => r.sequence === 1);
      expect(firstRequest.approver_id).toBe(manager1.id);
      expect(firstRequest.status).toBe(ApprovalRequestStatus.PENDING);

      // Manager1 approves
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ comments: 'Approved by direct manager' })
        .expect(200);

      // Check that next approver gets request
      const updatedRequests = await testDataFactory.getApprovalRequests(expenseId);
      const secondRequest = updatedRequests.find(r => r.sequence === 2);
      expect(secondRequest.approver_id).toBe(manager2.id);
      expect(secondRequest.status).toBe(ApprovalRequestStatus.PENDING);

      // Manager2 approves
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager2Token}`)
        .send({ comments: 'Approved by manager 2' })
        .expect(200);

      // Manager3 approves (final approver)
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager3Token}`)
        .send({ comments: 'Final approval' })
        .expect(200);

      // Check final expense status
      const finalExpense = await testDataFactory.getExpenseById(expenseId);
      expect(finalExpense.status).toBe(ExpenseStatus.APPROVED);

      // Verify approval history
      const history = await testDataFactory.getApprovalHistory(expenseId);
      expect(history.length).toBe(3); // Three approvals
      expect(history[0].actor_id).toBe(manager1.id);
      expect(history[1].actor_id).toBe(manager2.id);
      expect(history[2].actor_id).toBe(manager3.id);
    });

    it('should halt workflow on rejection', async () => {
      // Create sequential approval rule
      await testDataFactory.createSequentialApprovalRule(
        company.id,
        [manager2.id, manager3.id]
      );

      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 300,
          currency: 'USD',
          category: 'Travel',
          description: 'Business trip',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Manager1 approves
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ comments: 'Approved by direct manager' })
        .expect(200);

      // Manager2 rejects
      await request(app)
        .post(`/api/expenses/${expenseId}/reject`)
        .set('Authorization', `Bearer ${manager2Token}`)
        .send({ comments: 'Insufficient documentation' })
        .expect(200);

      // Check expense is rejected
      const rejectedExpense = await testDataFactory.getExpenseById(expenseId);
      expect(rejectedExpense.status).toBe(ExpenseStatus.REJECTED);

      // Verify no further approval requests were created
      const requests = await testDataFactory.getApprovalRequests(expenseId);
      const pendingRequests = requests.filter(r => r.status === ApprovalRequestStatus.PENDING);
      expect(pendingRequests.length).toBe(0);

      // Verify rejection is in history
      const history = await testDataFactory.getApprovalHistory(expenseId);
      const rejectionEntry = history.find(h => h.action === 'REJECTED');
      expect(rejectionEntry).toBeTruthy();
      expect(rejectionEntry.actor_id).toBe(manager2.id);
      expect(rejectionEntry.comments).toBe('Insufficient documentation');
    });

    it('should require comments for rejection', async () => {
      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 200,
          currency: 'USD',
          category: 'Travel',
          description: 'Business trip',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Try to reject without comments
      const response = await request(app)
        .post(`/api/expenses/${expenseId}/reject`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({}) // No comments
        .expect(400);

      expect(response.body.message).toContain('comments are required');
    });
  });

  describe('Conditional Approval Rules', () => {
    describe('Percentage-based Rules', () => {
      it('should auto-approve when percentage threshold is met', async () => {
        // Create percentage rule (60% approval required)
        await testDataFactory.createPercentageApprovalRule(
          company.id,
          [manager1.id, manager2.id, manager3.id],
          60 // 60% threshold
        );

        // Submit expense
        const expenseResponse = await request(app)
          .post('/api/expenses')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            amount: 400,
            currency: 'USD',
            category: 'Travel',
            description: 'Business trip',
            expenseDate: '2024-01-15',
          })
          .expect(201);

        const expenseId = expenseResponse.body.id;

        // First manager approves (33%)
        await request(app)
          .post(`/api/expenses/${expenseId}/approve`)
          .set('Authorization', `Bearer ${manager1Token}`)
          .send({ comments: 'First approval' })
          .expect(200);

        // Check expense is still pending
        let expense = await testDataFactory.getExpenseById(expenseId);
        expect(expense.status).toBe(ExpenseStatus.PENDING);

        // Second manager approves (66% - exceeds 60% threshold)
        await request(app)
          .post(`/api/expenses/${expenseId}/approve`)
          .set('Authorization', `Bearer ${manager2Token}`)
          .send({ comments: 'Second approval' })
          .expect(200);

        // Check expense is now approved
        expense = await testDataFactory.getExpenseById(expenseId);
        expect(expense.status).toBe(ExpenseStatus.APPROVED);

        // Verify third manager doesn't need to approve
        const requests = await testDataFactory.getApprovalRequests(expenseId);
        const thirdRequest = requests.find(r => r.approver_id === manager3.id);
        expect(thirdRequest?.status).not.toBe(ApprovalRequestStatus.PENDING);
      });
    });

    describe('Specific Approver Rules', () => {
      it('should auto-approve when specific approver approves', async () => {
        // Create specific approver rule (manager2 can auto-approve)
        await testDataFactory.createSpecificApproverRule(company.id, manager2.id);

        // Submit expense
        const expenseResponse = await request(app)
          .post('/api/expenses')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            amount: 600,
            currency: 'USD',
            category: 'Travel',
            description: 'Business trip',
            expenseDate: '2024-01-15',
          })
          .expect(201);

        const expenseId = expenseResponse.body.id;

        // Direct manager approves first
        await request(app)
          .post(`/api/expenses/${expenseId}/approve`)
          .set('Authorization', `Bearer ${manager1Token}`)
          .send({ comments: 'Direct manager approval' })
          .expect(200);

        // Specific approver (manager2) approves - should auto-approve
        await request(app)
          .post(`/api/expenses/${expenseId}/approve`)
          .set('Authorization', `Bearer ${manager2Token}`)
          .send({ comments: 'Special approver approval' })
          .expect(200);

        // Check expense is approved
        const expense = await testDataFactory.getExpenseById(expenseId);
        expect(expense.status).toBe(ExpenseStatus.APPROVED);
      });
    });

    describe('Hybrid Rules', () => {
      it('should auto-approve when either percentage OR specific approver condition is met', async () => {
        // Create hybrid rule (60% OR manager3 approval)
        await testDataFactory.createHybridApprovalRule(
          company.id,
          [manager1.id, manager2.id, manager3.id],
          60, // 60% threshold
          manager3.id // OR manager3 approval
        );

        // Submit expense
        const expenseResponse = await request(app)
          .post('/api/expenses')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            amount: 800,
            currency: 'USD',
            category: 'Travel',
            description: 'Business trip',
            expenseDate: '2024-01-15',
          })
          .expect(201);

        const expenseId = expenseResponse.body.id;

        // Direct manager approves
        await request(app)
          .post(`/api/expenses/${expenseId}/approve`)
          .set('Authorization', `Bearer ${manager1Token}`)
          .send({ comments: 'Direct manager approval' })
          .expect(200);

        // Specific approver (manager3) approves - should trigger auto-approval
        await request(app)
          .post(`/api/expenses/${expenseId}/approve`)
          .set('Authorization', `Bearer ${manager3Token}`)
          .send({ comments: 'Special approver approval' })
          .expect(200);

        // Check expense is approved (even though percentage wasn't met)
        const expense = await testDataFactory.getExpenseById(expenseId);
        expect(expense.status).toBe(ExpenseStatus.APPROVED);
      });
    });
  });

  describe('Manager Approval Combined with Rules', () => {
    it('should route to manager first, then apply rules', async () => {
      // Create percentage rule
      await testDataFactory.createPercentageApprovalRule(
        company.id,
        [manager2.id, manager3.id],
        100 // Require all approvers
      );

      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 1000,
          currency: 'USD',
          category: 'Travel',
          description: 'Expensive business trip',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Verify first request goes to direct manager
      const initialRequests = await testDataFactory.getApprovalRequests(expenseId);
      const firstRequest = initialRequests.find(r => r.sequence === 1);
      expect(firstRequest.approver_id).toBe(manager1.id);

      // Manager1 (direct manager) approves
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ comments: 'Direct manager approval' })
        .expect(200);

      // Now rule-based approvals should be active
      // Manager2 approves
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager2Token}`)
        .send({ comments: 'Rule-based approval 1' })
        .expect(200);

      // Manager3 approves (final)
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager3Token}`)
        .send({ comments: 'Rule-based approval 2' })
        .expect(200);

      // Check expense is approved
      const expense = await testDataFactory.getExpenseById(expenseId);
      expect(expense.status).toBe(ExpenseStatus.APPROVED);
    });

    it('should handle rejection at manager level', async () => {
      // Create approval rule
      await testDataFactory.createSequentialApprovalRule(
        company.id,
        [manager2.id, manager3.id]
      );

      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 500,
          currency: 'USD',
          category: 'Travel',
          description: 'Business trip',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Direct manager rejects
      await request(app)
        .post(`/api/expenses/${expenseId}/reject`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ comments: 'Not approved by direct manager' })
        .expect(200);

      // Check expense is rejected
      const expense = await testDataFactory.getExpenseById(expenseId);
      expect(expense.status).toBe(ExpenseStatus.REJECTED);

      // Verify no rule-based approvals were created
      const requests = await testDataFactory.getApprovalRequests(expenseId);
      const ruleBasedRequests = requests.filter(r => 
        r.approver_id === manager2.id || r.approver_id === manager3.id
      );
      expect(ruleBasedRequests.length).toBe(0);
    });
  });

  describe('Admin Override Functionality', () => {
    it('should allow admin to override and approve expense', async () => {
      // Create sequential approval rule
      await testDataFactory.createSequentialApprovalRule(
        company.id,
        [manager2.id, manager3.id]
      );

      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 750,
          currency: 'USD',
          category: 'Emergency',
          description: 'Urgent business expense',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Admin overrides and approves directly
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          comments: 'Admin override - urgent approval needed',
          isOverride: true 
        })
        .expect(200);

      // Check expense is approved
      const expense = await testDataFactory.getExpenseById(expenseId);
      expect(expense.status).toBe(ExpenseStatus.APPROVED);

      // Verify override is logged in history
      const history = await testDataFactory.getApprovalHistory(expenseId);
      const overrideEntry = history.find(h => 
        h.actor_id === adminUser.id && h.action === 'ADMIN_OVERRIDE_APPROVED'
      );
      expect(overrideEntry).toBeTruthy();
      expect(overrideEntry.comments).toContain('Admin override');
    });

    it('should allow admin to override and reject expense', async () => {
      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 500,
          currency: 'USD',
          category: 'Travel',
          description: 'Business trip',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Admin overrides and rejects
      await request(app)
        .post(`/api/expenses/${expenseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          comments: 'Admin override - policy violation',
          isOverride: true 
        })
        .expect(200);

      // Check expense is rejected
      const expense = await testDataFactory.getExpenseById(expenseId);
      expect(expense.status).toBe(ExpenseStatus.REJECTED);

      // Verify override is logged
      const history = await testDataFactory.getApprovalHistory(expenseId);
      const overrideEntry = history.find(h => 
        h.actor_id === adminUser.id && h.action === 'ADMIN_OVERRIDE_REJECTED'
      );
      expect(overrideEntry).toBeTruthy();
    });
  });

  describe('Approval History and Audit Trail', () => {
    it('should maintain complete approval history', async () => {
      // Create sequential approval rule
      await testDataFactory.createSequentialApprovalRule(
        company.id,
        [manager2.id, manager3.id]
      );

      // Submit expense
      const expenseResponse = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 400,
          currency: 'USD',
          category: 'Travel',
          description: 'Business trip',
          expenseDate: '2024-01-15',
        })
        .expect(201);

      const expenseId = expenseResponse.body.id;

      // Complete approval workflow
      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ comments: 'Manager 1 approval' });

      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager2Token}`)
        .send({ comments: 'Manager 2 approval' });

      await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${manager3Token}`)
        .send({ comments: 'Manager 3 approval' });

      // Get approval history
      const response = await request(app)
        .get(`/api/expenses/${expenseId}/history`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      // Verify chronological order
      expect(new Date(response.body[0].createdAt).getTime())
        .toBeLessThan(new Date(response.body[1].createdAt).getTime());
      
      // Verify all approvers are recorded
      const approverIds = response.body.map((entry: any) => entry.actorId);
      expect(approverIds).toContain(manager1.id);
      expect(approverIds).toContain(manager2.id);
      expect(approverIds).toContain(manager3.id);

      // Verify comments are preserved
      const comments = response.body.map((entry: any) => entry.comments);
      expect(comments).toContain('Manager 1 approval');
      expect(comments).toContain('Manager 2 approval');
      expect(comments).toContain('Manager 3 approval');
    });
  });
});