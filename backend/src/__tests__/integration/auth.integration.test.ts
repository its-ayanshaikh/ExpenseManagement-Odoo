import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { db } from '../../config/database';
import { UserRole } from '../../types/database';

describe('Authentication Integration Tests', () => {
  describe('Complete Signup and Company Creation Flow', () => {
    it('should create company and admin user on first signup with country and currency code', async () => {
      const signupData = {
        email: 'admin@testcompany.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company Inc',
        country: 'United States',
        currencyCode: 'USD',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Verify response structure
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('company');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      // Verify user data
      expect(response.body.data.user.email).toBe(signupData.email);
      expect(response.body.data.user.first_name).toBe(signupData.firstName);
      expect(response.body.data.user.last_name).toBe(signupData.lastName);
      expect(response.body.data.user.role).toBe('ADMIN');

      // Verify company data with selected currency code
      expect(response.body.data.company.name).toBe(signupData.companyName);
      expect(response.body.data.company.country).toBe(signupData.country);
      expect(response.body.data.company.default_currency).toBe('USD');

      // Verify database records
      const company = await db('companies')
        .where('id', response.body.data.company.id)
        .first();
      expect(company).toBeTruthy();
      expect(company.name).toBe(signupData.companyName);
      expect(company.default_currency).toBe('USD');

      const user = await db('users')
        .where('id', response.body.data.user.id)
        .first();
      expect(user).toBeTruthy();
      expect(user.email).toBe(signupData.email);
      expect(user.role).toBe('ADMIN');
      expect(user.company_id).toBe(response.body.data.company.id);
    });

    it('should accept any valid currency code provided by user', async () => {
      const signupData = {
        email: 'admin@ukcompany.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        companyName: 'UK Test Company',
        country: 'United Kingdom',
        currencyCode: 'GBP',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body.data.company.default_currency).toBe('GBP');
    });

    it('should handle countries with multiple currencies', async () => {
      const signupData = {
        email: 'admin@cambodia.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Cambodia Company',
        country: 'Cambodia',
        currencyCode: 'USD', // User selected USD instead of KHR
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body.data.company.default_currency).toBe('USD');
    });

    it('should prevent duplicate email registration', async () => {
      const signupData = {
        email: 'duplicate@test.com',
        password: 'password123',
        firstName: 'First',
        lastName: 'User',
        companyName: 'First Company',
        country: 'United States',
        currencyCode: 'USD',
      };

      // First signup should succeed
      await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Second signup with same email should fail
      const duplicateData = {
        ...signupData,
        companyName: 'Second Company',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(duplicateData)
        .expect(409);

      expect(response.body.message).toContain('email already exists');
    });

    it('should validate required fields during signup', async () => {
      const incompleteData = {
        email: 'incomplete@test.com',
        password: 'password123',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(incompleteData)
        .expect(400);

      expect(response.body.code).toBe('MISSING_FIELDS');
      expect(response.body.required).toContain('currencyCode');
    });

    it('should require currency code to be provided', async () => {
      const signupData = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        country: 'United States',
        // Missing currencyCode
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(400);

      expect(response.body.code).toBe('MISSING_FIELDS');
    });

    it('should validate currency code format', async () => {
      const signupData = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        country: 'United States',
        currencyCode: 'INVALID',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(400);

      expect(response.body.code).toBe('INVALID_CURRENCY_FORMAT');
    });

    it('should normalize currency code to uppercase', async () => {
      const signupData = {
        email: 'test@lowercase.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Lowercase Test Company',
        country: 'United States',
        currencyCode: 'usd', // lowercase
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body.data.company.default_currency).toBe('USD');
    });
  });

  describe('Login Flow', () => {
    it('should authenticate user with valid credentials', async () => {
      // Create test company and user
      const company = await testDataFactory.createTestCompany();
      const user = await testDataFactory.createTestUser(company.id, {
        email: 'login@test.com',
        role: UserRole.ADMIN,
      });

      const loginData = {
        email: 'login@test.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.email).toBe(user.email);
    });

    it('should reject invalid credentials', async () => {
      const company = await testDataFactory.createTestCompany();
      await testDataFactory.createTestUser(company.id, {
        email: 'valid@test.com',
      });

      const loginData = {
        email: 'valid@test.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('Protected Route Access', () => {
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

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should allow access to protected routes with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.message).toContain('Access token is required');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid access token');
    });
  });
});