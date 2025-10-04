import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { UserRole } from '../../types/database';

describe('User Management Integration Tests', () => {
  let authToken: string;
  let company: any;
  let adminUser: any;

  beforeEach(async () => {
    company = await testDataFactory.createTestCompany();
    adminUser = await testDataFactory.createTestUser(company.id, {
      role: UserRole.ADMIN,
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'password123',
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('User Creation by Admin', () => {
    it('should allow admin to create new employee', async () => {
      const userData = {
        email: 'employee@test.com',
        firstName: 'John',
        lastName: 'Employee',
        role: UserRole.EMPLOYEE,
        isManagerApprover: false,
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.email).toBe(userData.email);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.companyId).toBe(company.id);

      // Verify in database
      const dbUser = await testDataFactory.getUsersByCompany(company.id);
      const newUser = dbUser.find(u => u.email === userData.email);
      expect(newUser).toBeTruthy();
    });

    it('should allow admin to create new manager', async () => {
      const userData = {
        email: 'manager@test.com',
        firstName: 'Jane',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        isManagerApprover: true,
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.role).toBe(UserRole.MANAGER);
      expect(response.body.isManagerApprover).toBe(true);
    });

    it('should prevent duplicate email within company', async () => {
      const userData = {
        email: 'duplicate@test.com',
        firstName: 'First',
        lastName: 'User',
        role: UserRole.EMPLOYEE,
      };

      // Create first user
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('email already exists');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'incomplete@test.com',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });

  describe('Role Assignment', () => {
    let employeeUser: any;

    beforeEach(async () => {
      employeeUser = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
      });
    });

    it('should allow admin to change user role', async () => {
      const response = await request(app)
        .put(`/api/users/${employeeUser.id}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: UserRole.MANAGER })
        .expect(200);

      expect(response.body.role).toBe(UserRole.MANAGER);

      // Verify in database
      const updatedUser = await testDataFactory.getUsersByCompany(company.id);
      const user = updatedUser.find(u => u.id === employeeUser.id);
      expect(user.role).toBe(UserRole.MANAGER);
    });

    it('should validate role values', async () => {
      const response = await request(app)
        .put(`/api/users/${employeeUser.id}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400);

      expect(response.body.message).toContain('Invalid role');
    });
  });

  describe('Manager Assignment', () => {
    let managerUser: any;
    let employeeUser: any;

    beforeEach(async () => {
      managerUser = await testDataFactory.createTestUser(company.id, {
        role: UserRole.MANAGER,
        isManagerApprover: true,
      });
      employeeUser = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
      });
    });

    it('should allow admin to assign manager to employee', async () => {
      const response = await request(app)
        .put(`/api/users/${employeeUser.id}/manager`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ managerId: managerUser.id })
        .expect(200);

      expect(response.body.managerId).toBe(managerUser.id);

      // Verify in database
      const updatedUsers = await testDataFactory.getUsersByCompany(company.id);
      const user = updatedUsers.find(u => u.id === employeeUser.id);
      expect(user.manager_id).toBe(managerUser.id);
    });

    it('should prevent circular manager relationships', async () => {
      // First assign manager to employee
      await request(app)
        .put(`/api/users/${employeeUser.id}/manager`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ managerId: managerUser.id });

      // Try to assign employee as manager to the manager (circular)
      const response = await request(app)
        .put(`/api/users/${managerUser.id}/manager`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ managerId: employeeUser.id })
        .expect(400);

      expect(response.body.message).toContain('circular');
    });

    it('should validate manager exists and is in same company', async () => {
      const otherCompany = await testDataFactory.createTestCompany();
      const otherManager = await testDataFactory.createTestUser(otherCompany.id, {
        role: UserRole.MANAGER,
      });

      const response = await request(app)
        .put(`/api/users/${employeeUser.id}/manager`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ managerId: otherManager.id })
        .expect(400);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('User Deletion', () => {
    let employeeUser: any;

    beforeEach(async () => {
      employeeUser = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
      });
    });

    it('should allow admin to delete user without pending approvals', async () => {
      await request(app)
        .delete(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify user is deleted
      const users = await testDataFactory.getUsersByCompany(company.id);
      const deletedUser = users.find(u => u.id === employeeUser.id);
      expect(deletedUser).toBeFalsy();
    });

    it('should prevent deletion of user with pending expense approvals', async () => {
      // Create expense for user
      const expense = await testDataFactory.createTestExpense(
        company.id,
        employeeUser.id,
        { status: 'PENDING' }
      );

      const response = await request(app)
        .delete(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('pending approvals');

      // Verify user still exists
      const users = await testDataFactory.getUsersByCompany(company.id);
      const user = users.find(u => u.id === employeeUser.id);
      expect(user).toBeTruthy();
    });
  });

  describe('Authorization Checks', () => {
    let managerUser: any;
    let managerToken: string;
    let employeeUser: any;
    let employeeToken: string;

    beforeEach(async () => {
      managerUser = await testDataFactory.createTestUser(company.id, {
        role: UserRole.MANAGER,
      });
      employeeUser = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
      });

      const managerLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: managerUser.email,
          password: 'password123',
        });
      managerToken = managerLogin.body.accessToken;

      const employeeLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: employeeUser.email,
          password: 'password123',
        });
      employeeToken = employeeLogin.body.accessToken;
    });

    it('should deny manager access to user management', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
        })
        .expect(403);

      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should deny employee access to user management', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('User Listing and Retrieval', () => {
    let manager: any;
    let employee1: any;
    let employee2: any;

    beforeEach(async () => {
      manager = await testDataFactory.createTestUser(company.id, {
        role: UserRole.MANAGER,
        firstName: 'Manager',
        lastName: 'User',
      });
      employee1 = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
        firstName: 'Employee',
        lastName: 'One',
        managerId: manager.id,
      });
      employee2 = await testDataFactory.createTestUser(company.id, {
        role: UserRole.EMPLOYEE,
        firstName: 'Employee',
        lastName: 'Two',
      });
    });

    it('should list all users in company for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(4); // admin + manager + 2 employees

      // Check that all users belong to the same company
      response.body.forEach((user: any) => {
        expect(user.companyId).toBe(company.id);
      });
    });

    it('should get specific user details', async () => {
      const response = await request(app)
        .get(`/api/users/${employee1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(employee1.id);
      expect(response.body.email).toBe(employee1.email);
      expect(response.body.managerId).toBe(manager.id);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });
  });
});