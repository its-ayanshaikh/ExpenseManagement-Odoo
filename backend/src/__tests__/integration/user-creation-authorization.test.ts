import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { User } from '../../models/User';
import { UserRole } from '../../types/database';
import { UserService } from '../../services/UserService';
import { generateTokenPair } from '../../utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

describe('User Creation Authorization (Task 5.5)', () => {
  let adminUserId: string;
  let managerUserId: string;
  let employeeUserId: string;
  let companyId: string;
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    // Create test company
    const [company] = await db('companies')
      .insert({
        name: 'Test Auth Company',
        country: 'United States',
        default_currency: 'USD',
      })
      .returning('*');
    companyId = company.id;

    // Create admin user using direct DB insert
    const passwordHash = await bcrypt.hash('password123', 10);
    adminUserId = uuidv4();
    await db('users').insert({
      id: adminUserId,
      company_id: companyId,
      email: 'admin-authtest@test.com',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
      role: UserRole.ADMIN,
      manager_id: null,
      is_manager_approver: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create manager user using direct DB insert
    managerUserId = uuidv4();
    await db('users').insert({
      id: managerUserId,
      company_id: companyId,
      email: 'manager-authtest@test.com',
      password_hash: passwordHash,
      first_name: 'Manager',
      last_name: 'User',
      role: UserRole.MANAGER,
      manager_id: null,
      is_manager_approver: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create employee user using direct DB insert
    employeeUserId = uuidv4();
    await db('users').insert({
      id: employeeUserId,
      company_id: companyId,
      email: 'employee-authtest@test.com',
      password_hash: passwordHash,
      first_name: 'Employee',
      last_name: 'User',
      role: UserRole.EMPLOYEE,
      manager_id: managerUserId,
      is_manager_approver: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Fetch users and generate tokens
    const adminUser = await User.findById(adminUserId);
    const managerUser = await User.findById(managerUserId);
    const employeeUser = await User.findById(employeeUserId);

    if (adminUser && managerUser && employeeUser) {
      const adminTokens = generateTokenPair(adminUser);
      adminToken = adminTokens.accessToken;

      const managerTokens = generateTokenPair(managerUser);
      managerToken = managerTokens.accessToken;

      const employeeTokens = generateTokenPair(employeeUser);
      employeeToken = employeeTokens.accessToken;
    }
  });

  describe('POST /api/users - User Creation Authorization', () => {
    it('should allow admin to create users (Requirement 2.15)', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
          managerId: managerUserId,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('newuser@test.com');
    });

    it('should return 403 when manager attempts to create users (Requirement 2.14, 2.15)', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          email: 'unauthorized@test.com',
          password: 'password123',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('ADMIN_REQUIRED');
      expect(response.body.message).toContain('Only administrators can manage users');
    });

    it('should return 403 when employee attempts to create users (Requirement 2.14, 2.15)', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'unauthorized2@test.com',
          password: 'password123',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('ADMIN_REQUIRED');
      expect(response.body.message).toContain('Only administrators can manage users');
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'noauth@test.com',
          password: 'password123',
          firstName: 'No',
          lastName: 'Auth',
          role: UserRole.EMPLOYEE,
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });
  });

  describe('UserService.canUserCreateUsers', () => {
    it('should return true for admin users', async () => {
      const canCreate = await UserService.canUserCreateUsers(adminUserId);
      expect(canCreate).toBe(true);
    });

    it('should return false for manager users', async () => {
      const canCreate = await UserService.canUserCreateUsers(managerUserId);
      expect(canCreate).toBe(false);
    });

    it('should return false for employee users', async () => {
      const canCreate = await UserService.canUserCreateUsers(employeeUserId);
      expect(canCreate).toBe(false);
    });

    it('should return false for non-existent users', async () => {
      const nonExistentId = uuidv4(); // Generate a valid UUID
      const canCreate = await UserService.canUserCreateUsers(nonExistentId);
      expect(canCreate).toBe(false);
    });
  });
});
