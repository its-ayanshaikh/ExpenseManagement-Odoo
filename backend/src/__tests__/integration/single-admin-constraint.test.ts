import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User';
import { Company } from '../../models/Company';
import { UserRole } from '../../types/database';
import { generateTokenPair } from '../../utils/jwt';

describe('Single Admin Constraint Tests', () => {
  // Helper function to create test company and admin
  async function createTestCompanyAndAdmin() {
    const company = new Company({
      name: 'Test Company Single Admin',
      country: 'United States',
      default_currency: 'USD',
    });
    const savedCompany = await db('companies')
      .insert(company.toDatabase())
      .returning('*')
      .then(rows => Company.fromDatabase(rows[0]));

    const adminUser = new User({
      company_id: savedCompany.id,
      email: 'admin@singleadmin.test',
      first_name: 'Admin',
      last_name: 'User',
      role: UserRole.ADMIN,
      manager_id: null,
      is_manager_approver: false,
    });
    await adminUser.setPassword('AdminPass123!');
    const savedAdmin = await adminUser.save();

    const tokens = generateTokenPair(savedAdmin);

    return {
      companyId: savedCompany.id,
      adminUserId: savedAdmin.id,
      adminToken: tokens.accessToken,
    };
  }

  describe('Requirement 2.8: Single Admin Constraint', () => {
    it('should validate that only one admin exists per company', async () => {
      const { companyId } = await createTestCompanyAndAdmin();
      const isValid = await UserService.validateSingleAdminConstraint(companyId);
      expect(isValid).toBe(true);
    });

    it('should detect when multiple admins exist (violation)', async () => {
      const { companyId } = await createTestCompanyAndAdmin();
      
      // Temporarily create a second admin directly in DB (bypassing validation)
      const secondAdmin = new User({
        company_id: companyId,
        email: 'admin2@singleadmin.test',
        first_name: 'Second',
        last_name: 'Admin',
        role: UserRole.ADMIN,
        manager_id: null,
        is_manager_approver: false,
      });
      await secondAdmin.setPassword('AdminPass123!');
      
      // This should fail due to database constraint
      await expect(secondAdmin.save()).rejects.toThrow();
    });
  });

  describe('Requirement 2.9 & 2.10: Prevent Admin Creation via User Creation', () => {
    it('should reject user creation with ADMIN role via API', async () => {
      const { adminToken } = await createTestCompanyAndAdmin();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newadmin@singleadmin.test',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Admin',
          role: UserRole.ADMIN,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ADMIN_CREATION_NOT_ALLOWED');
      expect(response.body.message).toContain('Cannot create admin users');
    });

    it('should reject user creation with ADMIN role via UserService', async () => {
      const { companyId } = await createTestCompanyAndAdmin();

      await expect(
        UserService.createUser({
          companyId,
          email: 'newadmin2@singleadmin.test',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Admin',
          role: UserRole.ADMIN,
        })
      ).rejects.toThrow('Cannot create admin users through user creation');
    });

    it('should allow creating EMPLOYEE users', async () => {
      const { adminToken } = await createTestCompanyAndAdmin();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'employee@singleadmin.test',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'Employee',
          role: UserRole.EMPLOYEE,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe(UserRole.EMPLOYEE);
    });

    it('should allow creating MANAGER users', async () => {
      const { adminToken } = await createTestCompanyAndAdmin();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'manager@singleadmin.test',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'Manager',
          role: UserRole.MANAGER,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe(UserRole.MANAGER);
    });
  });

  describe('Signup Flow Validation', () => {
    it('should create admin user during signup', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newcompany@singleadmin.test',
          password: 'Password123!',
          firstName: 'Company',
          lastName: 'Admin',
          companyName: 'New Test Company',
          country: 'United States',
          currencyCode: 'USD',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe(UserRole.ADMIN);

      // Verify only one admin exists for the new company
      const newCompanyId = response.body.data.company.id;
      const isValid = await UserService.validateSingleAdminConstraint(newCompanyId);
      expect(isValid).toBe(true);
    });

    it('should prevent duplicate admin creation during signup (edge case)', async () => {
      // This test verifies the transaction validation in signup
      // In practice, this should never happen, but we validate it anyway
      
      // Create a company first
      const company = new Company({
        name: 'Edge Case Company',
        country: 'United States',
        default_currency: 'USD',
      });
      const savedCompany = await db('companies')
        .insert(company.toDatabase())
        .returning('*')
        .then(rows => Company.fromDatabase(rows[0]));

      // Create an admin for this company
      const admin = new User({
        company_id: savedCompany.id,
        email: 'admin@edgecase.test',
        first_name: 'First',
        last_name: 'Admin',
        role: UserRole.ADMIN,
        manager_id: null,
        is_manager_approver: false,
      });
      await admin.setPassword('Password123!');
      await db('users')
        .insert(admin.toDatabase())
        .returning('*');

      // Try to create another admin for the same company (should fail)
      const secondAdmin = new User({
        company_id: savedCompany.id,
        email: 'admin2@edgecase.test',
        first_name: 'Second',
        last_name: 'Admin',
        role: UserRole.ADMIN,
        manager_id: null,
        is_manager_approver: false,
      });
      await secondAdmin.setPassword('Password123!');

      // This should fail due to database constraint
      await expect(
        db('users').insert(secondAdmin.toDatabase())
      ).rejects.toThrow();
    });
  });

  describe('UserService.canUserCreateUsers', () => {
    it('should return true for admin users', async () => {
      const { adminUserId } = await createTestCompanyAndAdmin();
      const canCreate = await UserService.canUserCreateUsers(adminUserId);
      expect(canCreate).toBe(true);
    });

    it('should return false for non-admin users', async () => {
      const { companyId } = await createTestCompanyAndAdmin();

      // Create a manager user using UserService to ensure proper creation
      const manager = await UserService.createUser({
        companyId,
        email: 'manager@canCreate.test',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Manager',
        role: UserRole.MANAGER,
      });

      const canCreate = await UserService.canUserCreateUsers(manager.id);
      expect(canCreate).toBe(false);
    });

    it('should return false for non-existent users', async () => {
      // Use a valid UUID format
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const canCreate = await UserService.canUserCreateUsers(fakeUuid);
      expect(canCreate).toBe(false);
    });
  });
});
