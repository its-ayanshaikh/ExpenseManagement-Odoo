import request from 'supertest';
import { app } from '../../index';
import { testDataFactory } from '../helpers/testHelpers';
import { knex } from '../../config/database';

describe('Authentication Integration Tests', () => {
  describe('Complete Signup and Company Creation Flow', () => {
    it('should create company and admin user on first signup', async () => {
      const signupData = {
        email: 'admin@testcompany.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company Inc',
        country: 'United States',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('company');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify user data
      expect(response.body.user.email).toBe(signupData.email);
      expect(response.body.user.firstName).toBe(signupData.firstName);
      expect(response.body.user.lastName).toBe(signupData.lastName);
      expect(response.body.user.role).toBe('ADMIN');

      // Verify company data
      expect(response.body.company.name).toBe(signupData.companyName);
      expect(response.body.company.country).toBe(signupData.country);
      expect(response.body.company.defaultCurrency).toBe('USD'); // US default currency

      // Verify database records
      const company = await knex('companies')
        .where('id', response.body.company.id)
        .first();
      expect(company).toBeTruthy();
      expect(company.name).toBe(signupData.companyName);

      const user = await knex('users')
        .where('id', response.body.user.id)
        .first();
      expect(user).toBeTruthy();
      expect(user.email).toBe(signupData.email);
      expect(user.role).toBe('ADMIN');
      expect(user.company_id).toBe(response.body.company.id);
    });

    it('should set correct currency based on selected country', async () => {
      const signupData = {
        email: 'admin@ukcompany.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        companyName: 'UK Test Company',
        country: 'United Kingdom',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body.company.defaultCurrency).toBe('GBP');
    });

    it('should prevent duplicate email registration', async () => {
      const signupData = {
        email: 'duplicate@test.com',
        password: 'password123',
        firstName: 'First',
        lastName: 'User',
        companyName: 'First Company',
        country: 'United States',
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
        .expect(400);

      expect(response.body.message).toContain('email already exists');
    });

    it('should validate required fields during signup', async () => {
      const incompleteData = {
        email: 'incomplete@test.com',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });

  describe('Login Flow', () => {
    it('should authenticate user with valid credentials', async () => {
      // Create test company and user
      const company = await testDataFactory.createTestCompany();
      const user = await testDataFactory.createTestUser(company.id, {
        email: 'login@test.com',
        role: 'ADMIN',
      });

      const loginData = {
        email: 'login@test.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
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

      expect(response.body.message).toContain('Invalid credentials');
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

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('Protected Route Access', () => {
    let authToken: string;
    let company: any;
    let adminUser: any;

    beforeEach(async () => {
      company = await testDataFactory.createTestCompany();
      adminUser = await testDataFactory.createTestUser(company.id, {
        role: 'ADMIN',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'password123',
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should allow access to protected routes with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.message).toContain('No token provided');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });
});