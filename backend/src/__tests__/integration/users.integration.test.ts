import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { db } from '../../config/database';
import { User } from '../../models/User';
import { UserRole } from '../../types/database';
import { generateTokenPair } from '../../utils/jwt';

describe('User Management API Integration Tests', () => {
  let adminToken: string;
  let adminUserId: string;
  let testCompanyId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test company
    const company = await testDataFactory.createTestCompany({
      name: 'Test User Mgmt Company',
    });
    testCompanyId = company.id;

    // Create admin user
    const adminUser = await testDataFactory.createTestUser(testCompanyId, {
      email: 'admin-test-user-mgmt@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    });
    adminUserId = adminUser.id;

    // Generate admin token
    const admin = await User.findById(adminUserId);
    if (admin) {
      const tokens = generateTokenPair(admin);
      adminToken = tokens.accessToken;
    }

    // Create test user
    const testUser = await testDataFactory.createTestUser(testCompanyId, {
      email: 'employee-test-user-mgmt@example.com',
      firstName: 'Test',
      lastName: 'Employee',
      role: UserRole.EMPLOYEE,
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db('users').where('company_id', testCompanyId).del();
    await db('companies').where('id', testCompanyId).del();
  });

  describe('POST /api/users/generate-password', () => {
    it('should generate password and send email for existing user', async () => {
      const response = await request(app)
        .post('/api/users/generate-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('password');
      expect(response.body.data.userId).toBe(testUserId);

      // Verify password was changed by trying to login with new password
      const newPassword = response.body.data.password;
      const updatedUser = await User.findById(testUserId);
      expect(updatedUser).not.toBeNull();
      
      if (updatedUser) {
        const isValid = await updatedUser.verifyPassword(newPassword);
        expect(isValid).toBe(true);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/generate-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/users/generate-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_USER_ID');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/users/generate-password')
        .send({
          userId: testUserId,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser-test-user-mgmt@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('newuser-test-user-mgmt@example.com');

      // Clean up
      await db('users').where('email', 'newuser-test-user-mgmt@example.com').del();
    });
  });

  describe('GET /api/users', () => {
    it('should list all users in company', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user details', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.id).toBe(testUserId);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user details', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.MANAGER,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe(UserRole.MANAGER);
    });
  });

  describe('PUT /api/users/:id/manager', () => {
    it('should assign manager to user', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/manager`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          managerId: adminUserId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.managerId).toBe(adminUserId);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      // Create a user to delete
      const userToDelete = await testDataFactory.createTestUser(testCompanyId, {
        email: 'todelete-test-user-mgmt@example.com',
        firstName: 'To',
        lastName: 'Delete',
        role: UserRole.EMPLOYEE,
      });

      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify user was deleted
      const deletedUser = await User.findById(userToDelete.id);
      expect(deletedUser).toBeNull();
    });
  });
});
