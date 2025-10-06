import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { User } from '../../models/User';
import { Company } from '../../models/Company';
import { ApprovalRule } from '../../models/ApprovalRule';
import { ApprovalRuleApprover } from '../../models/ApprovalRuleApprover';
import { UserRole } from '../../types/database';

describe('Approval Rule Endpoints', () => {
  let adminToken: string;
  let adminUser: User;
  let company: Company;
  let manager1: User;
  let manager2: User;

  beforeAll(async () => {
    // Clean up database
    await db('approval_rule_approvers').del();
    await db('approval_rules').del();
    await db('users').del();
    await db('companies').del();

    // Create test company
    company = new Company({
      name: 'Test Company',
      country: 'United States',
      default_currency: 'USD',
    });
    await company.save();

    // Create admin user
    adminUser = new User({
      company_id: company.id,
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      role: UserRole.ADMIN,
      is_manager_approver: false,
    });
    await adminUser.setPassword('password123');
    await adminUser.save();

    // Create manager users
    manager1 = new User({
      company_id: company.id,
      email: 'manager1@test.com',
      first_name: 'Manager',
      last_name: 'One',
      role: UserRole.MANAGER,
      is_manager_approver: false,
    });
    await manager1.setPassword('password123');
    await manager1.save();

    manager2 = new User({
      company_id: company.id,
      email: 'manager2@test.com',
      first_name: 'Manager',
      last_name: 'Two',
      role: UserRole.MANAGER,
      is_manager_approver: false,
    });
    await manager2.setPassword('password123');
    await manager2.save();

    // Login as admin
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123',
      });

    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await db('approval_rule_approvers').del();
    await db('approval_rules').del();
    await db('users').del();
    await db('companies').del();
    await db.destroy();
  });

  describe('POST /api/approval-rules', () => {
    it('should create an approval rule with sequential approval', async () => {
      const response = await request(app)
        .post('/api/approval-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sequential Approval Rule',
          isSequentialApproval: true,
          priority: 1,
          approvers: [
            {
              approverId: manager1.id,
              isRequired: true,
              sequence: 1,
            },
            {
              approverId: manager2.id,
              isRequired: true,
              sequence: 2,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.approvalRule).toBeDefined();
      expect(response.body.data.approvalRule.name).toBe('Sequential Approval Rule');
      expect(response.body.data.approvalRule.isSequentialApproval).toBe(true);
      expect(response.body.data.approvalRule.approvers).toHaveLength(2);
      expect(response.body.data.approvalRule.approvers[0].isRequired).toBe(true);
    });

    it('should create an approval rule with parallel approval', async () => {
      const response = await request(app)
        .post('/api/approval-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Parallel Approval Rule',
          isSequentialApproval: false,
          priority: 2,
          approvers: [
            {
              approverId: manager1.id,
              isRequired: true,
              sequence: 1,
            },
            {
              approverId: manager2.id,
              isRequired: false,
              sequence: 2,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.approvalRule.isSequentialApproval).toBe(false);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/approval-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Rule',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_FIELDS');
    });

    it('should fail with empty approvers array', async () => {
      const response = await request(app)
        .post('/api/approval-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Approvers Rule',
          isSequentialApproval: true,
          approvers: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_APPROVERS');
    });
  });

  describe('GET /api/approval-rules', () => {
    it('should retrieve all approval rules for the company', async () => {
      const response = await request(app)
        .get('/api/approval-rules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.approvalRules).toBeDefined();
      expect(response.body.data.approvalRules.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/approval-rules/:id', () => {
    let ruleId: string;

    beforeAll(async () => {
      // Create a rule to retrieve
      const rule = new ApprovalRule({
        company_id: company.id,
        name: 'Test Rule for Get',
        is_sequential_approval: true,
        priority: 3,
      });
      const savedRule = await rule.save();
      ruleId = savedRule.id;

      // Add approvers
      const approver = new ApprovalRuleApprover({
        approval_rule_id: ruleId,
        approver_id: manager1.id,
        is_required: true,
        sequence: 1,
      });
      await approver.save();
    });

    it('should retrieve a specific approval rule', async () => {
      const response = await request(app)
        .get(`/api/approval-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.approvalRule.id).toBe(ruleId);
      expect(response.body.data.approvalRule.name).toBe('Test Rule for Get');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .get('/api/approval-rules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('APPROVAL_RULE_NOT_FOUND');
    });
  });

  describe('PUT /api/approval-rules/:id', () => {
    let ruleId: string;

    beforeAll(async () => {
      // Create a rule to update
      const rule = new ApprovalRule({
        company_id: company.id,
        name: 'Test Rule for Update',
        is_sequential_approval: false,
        priority: 4,
      });
      const savedRule = await rule.save();
      ruleId = savedRule.id;

      // Add approvers
      const approver = new ApprovalRuleApprover({
        approval_rule_id: ruleId,
        approver_id: manager1.id,
        is_required: true,
        sequence: 1,
      });
      await approver.save();
    });

    it('should update an approval rule', async () => {
      const response = await request(app)
        .put(`/api/approval-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Rule Name',
          isSequentialApproval: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.approvalRule.name).toBe('Updated Rule Name');
      expect(response.body.data.approvalRule.isSequentialApproval).toBe(true);
    });

    it('should update approvers', async () => {
      const response = await request(app)
        .put(`/api/approval-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvers: [
            {
              approverId: manager1.id,
              isRequired: true,
              sequence: 1,
            },
            {
              approverId: manager2.id,
              isRequired: true,
              sequence: 2,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.approvalRule.approvers).toHaveLength(2);
    });
  });

  describe('DELETE /api/approval-rules/:id', () => {
    let ruleId: string;

    beforeAll(async () => {
      // Create a rule to delete
      const rule = new ApprovalRule({
        company_id: company.id,
        name: 'Test Rule for Delete',
        is_sequential_approval: false,
        priority: 5,
      });
      const savedRule = await rule.save();
      ruleId = savedRule.id;
    });

    it('should delete an approval rule', async () => {
      const response = await request(app)
        .delete(`/api/approval-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.deletedRuleId).toBe(ruleId);

      // Verify it's deleted
      const rule = await ApprovalRule.findById(ruleId);
      expect(rule).toBeNull();
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .delete('/api/approval-rules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('APPROVAL_RULE_NOT_FOUND');
    });
  });
});
