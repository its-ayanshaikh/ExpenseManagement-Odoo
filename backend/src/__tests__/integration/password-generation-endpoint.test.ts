import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { User } from '../../models/User';
import { UserRole } from '../../types/database';
import { generateTokenPair } from '../../utils/jwt';
import { EmailService } from '../../services/EmailService';

// Mock EmailService to prevent actual email sending during tests
jest.mock('../../services/EmailService');

describe('POST /api/users/generate-password', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUser: User;
  let employeeUser: User;
  let targetUser: User;
  let companyId: string;

  beforeAll(async () => {
    // Clean up test data
    await db('users').where('email', 'like', '%@passwordtest.com').del();
    await db('companies').where('name', 'Password Test Company').del();

    // Create test company
    const [company] = await db('companies')
      .insert({
        name: 'Password Test Company',
        country: 'United States',
        default_currency: 'USD',
      })
      .returning('*');
    companyId = company.id;

    // Create admin user
    adminUser = new User({
      company_id: companyId,
      email: 'admin@passwordtest.com',
      first_name: 'Admin',
      last_name: 'User',
      role: UserRole.ADMIN,
      manager_id: null,
      is_manager_approver: false,
    });
    await adminUser.setPassword('AdminPass123!');
    await adminUser.save();

    // Create employee user
    employeeUser = new User({
      company_id: companyId,
      email: 'employee@passwordtest.com',
      first_name: 'Employee',
      last_name: 'User',
      role: UserRole.EMPLOYEE,
      manager_id: null,
      is_manager_approver: false,
    });
    await employeeUser.setPassword('EmployeePass123!');
    await employeeUser.save();

    // Create target user for password generation
    targetUser = new User({
      company_id: companyId,
      email: 'target@passwordtest.com',
      first_name: 'Target',
      last_name: 'User',
      role: UserRole.EMPLOYEE,
      manager_id: null,
      is_manager_approver: false,
    });
    await targetUser.setPassword('OldPass123!');
    await targetUser.save();

    // Generate tokens using the jwt utility
    const adminTokens = generateTokenPair(adminUser);
    adminToken = adminTokens.accessToken;

    const employeeTokens = generateTokenPair(employeeUser);
    employeeToken = employeeTokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await db('users').where('email', 'like', '%@passwordtest.com').del();
    await db('companies').where('name', 'Password Test Company').del();
  });

  beforeEach(async () => {
    // Reset email service mock
    jest.clearAllMocks();
    (EmailService.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

    // Regenerate tokens before each test to ensure they're valid
    // (in case user data was modified in previous test)
    const freshAdminUser = await User.findById(adminUser.id);
    const freshEmployeeUser = await User.findById(employeeUser.id);
    
    if (freshAdminUser) {
      const adminTokens = generateTokenPair(freshAdminUser);
      adminToken = adminTokens.accessToken;
    }
    
    if (freshEmployeeUser) {
      const employeeTokens = generateTokenPair(freshEmployeeUser);
      employeeToken = employeeTokens.accessToken;
    }
  });

  it('should generate password and send email when admin requests (Requirement 11.1, 11.3)', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUser.id })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.message).toContain('Password generated and email sent');
    expect(response.body.data.userId).toBe(targetUser.id);
    expect(response.body.data.email).toBe(targetUser.email);
    expect(response.body.data.password).toBeDefined();
    expect(response.body.data.password.length).toBeGreaterThanOrEqual(8);

    // Verify email was sent
    expect(EmailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(EmailService.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        id: targetUser.id,
        email: targetUser.email,
      }),
      expect.any(String)
    );
  });

  it('should generate password meeting security requirements (Requirement 11.2)', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUser.id })
      .expect(200);

    const password = response.body.data.password;

    // At least 8 characters
    expect(password.length).toBeGreaterThanOrEqual(8);

    // Contains uppercase
    expect(password).toMatch(/[A-Z]/);

    // Contains lowercase
    expect(password).toMatch(/[a-z]/);

    // Contains numbers
    expect(password).toMatch(/[0-9]/);

    // Contains special characters
    expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
  });

  it('should update user password in database', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUser.id })
      .expect(200);

    const newPassword = response.body.data.password;

    // Fetch updated user
    const updatedUser = await User.findById(targetUser.id);
    expect(updatedUser).not.toBeNull();

    // Verify new password works
    const isValid = await updatedUser!.verifyPassword(newPassword);
    expect(isValid).toBe(true);

    // Verify old password no longer works
    const isOldValid = await updatedUser!.verifyPassword('OldPass123!');
    expect(isOldValid).toBe(false);
  });

  it('should return 403 when non-admin tries to generate password (Requirement 11.5)', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ userId: targetUser.id })
      .expect(403);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Access denied');
  });

  it('should return 400 when userId is missing', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('User ID is required');
    expect(response.body.code).toBe('MISSING_USER_ID');
  });

  it('should return 404 when user does not exist', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('User not found');
    expect(response.body.code).toBe('USER_NOT_FOUND');
  });

  it('should return 403 when trying to generate password for user in different company', async () => {
    // Create another company and user
    const [otherCompany] = await db('companies')
      .insert({
        name: 'Other Company',
        country: 'Canada',
        default_currency: 'CAD',
      })
      .returning('*');

    const otherUser = new User({
      company_id: otherCompany.id,
      email: 'other@othercompany.com',
      first_name: 'Other',
      last_name: 'User',
      role: UserRole.EMPLOYEE,
      manager_id: null,
      is_manager_approver: false,
    });
    await otherUser.setPassword('OtherPass123!');
    await otherUser.save();

    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: otherUser.id })
      .expect(403);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('different company');
    expect(response.body.code).toBe('COMPANY_ACCESS_DENIED');

    // Clean up
    await db('users').where('id', otherUser.id).del();
    await db('companies').where('id', otherCompany.id).del();
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .send({ userId: targetUser.id })
      .expect(401);

    expect(response.body.status).toBe('error');
  });

  it('should handle email delivery failures gracefully (Requirement 11.6)', async () => {
    // Mock email service to throw error
    (EmailService.sendWelcomeEmail as jest.Mock).mockRejectedValueOnce(
      new Error('SMTP connection failed')
    );

    // Password generation should still succeed even if email fails
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUser.id })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data.password).toBeDefined();
    expect(response.body.data.note).toContain('sent to user via email');

    // Verify password was still updated in database
    const updatedUser = await User.findById(targetUser.id);
    const isValid = await updatedUser!.verifyPassword(response.body.data.password);
    expect(isValid).toBe(true);
  });

  it('should include password in response for admin reference (Requirement 11.7)', async () => {
    const response = await request(app)
      .post('/api/users/generate-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUser.id })
      .expect(200);

    expect(response.body.data.password).toBeDefined();
    expect(typeof response.body.data.password).toBe('string');
    expect(response.body.data.password.length).toBeGreaterThanOrEqual(8);
    expect(response.body.data.note).toContain('sent to user via email');
  });
});
