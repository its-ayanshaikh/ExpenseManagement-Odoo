import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { CurrencyService } from '../services/CurrencyService';
import { generateTokenPair } from '../utils/jwt';
import { UserRole } from '../types/database';
import { db } from '../config/database';

const router = Router();

// Validation interfaces
interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  country: string;
  currencyCode: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/signup
 * Create new company and admin user
 * Accepts country name and currency code from signup form
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, companyName, country, currencyCode }: SignupRequest = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName || !country || !currencyCode) {
      res.status(400).json({
        status: 'error',
        message: 'All fields are required',
        code: 'MISSING_FIELDS',
        required: ['email', 'password', 'firstName', 'lastName', 'companyName', 'country', 'currencyCode']
      });
      return;
    }

    // Validate currency code is provided (Requirement 1.3)
    if (!currencyCode || currencyCode.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Currency code is required',
        code: 'MISSING_CURRENCY_CODE'
      });
      return;
    }

    // Validate currency code format (should be 3 uppercase letters)
    const currencyCodeUpper = currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCodeUpper)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid currency code format. Must be 3 letters (e.g., USD, EUR, GBP)',
        code: 'INVALID_CURRENCY_FORMAT'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    // Check if user already exists (Requirement 1.10)
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
      return;
    }

    // Check if company name already exists
    const existingCompany = await Company.findByName(companyName);
    if (existingCompany) {
      res.status(409).json({
        status: 'error',
        message: 'Company with this name already exists',
        code: 'COMPANY_EXISTS'
      });
      return;
    }

    // Use database transaction to ensure atomicity (Requirements 1.6, 1.8)
    const result = await db.transaction(async (trx) => {
      // Create company with selected currency code as base currency (Requirement 1.7)
      const company = new Company({
        name: companyName.trim(),
        country: country.trim(),
        default_currency: currencyCodeUpper,
      });

      const savedCompany = await trx('companies')
        .insert(company.toDatabase())
        .returning('*')
        .then(rows => Company.fromDatabase(rows[0]));

      // Validate single admin constraint (Requirement 2.8)
      // Check if admin already exists for this company (should not happen in signup, but validate)
      const existingAdminCount = await trx('users')
        .where('company_id', savedCompany.id)
        .where('role', UserRole.ADMIN)
        .count('* as count')
        .first() as unknown as { count: string } | undefined;

      if (existingAdminCount && Number(existingAdminCount.count) > 0) {
        throw new Error('Admin user already exists for this company');
      }

      // Create admin user associated with company (Requirement 1.8)
      const user = new User({
        company_id: savedCompany.id,
        email: email.toLowerCase().trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: UserRole.ADMIN,
        manager_id: null,
        is_manager_approver: false,
      });

      // Hash password
      await user.setPassword(password);

      const savedUser = await trx('users')
        .insert(user.toDatabase())
        .returning('*')
        .then(rows => User.fromDatabase(rows[0]));

      return { company: savedCompany, user: savedUser };
    });

    // Generate JWT tokens (Requirement 1.9)
    const tokens = generateTokenPair(result.user);

    // Return success response with JWT tokens (Requirement 1.10)
    res.status(201).json({
      status: 'success',
      message: 'Company and admin user created successfully',
      data: {
        user: result.user.toSafeObject(),
        company: result.company.toDatabase(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during signup',
      code: 'SIGNUP_ERROR'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Get company information
    const company = await Company.findById(user.companyId);
    if (!company) {
      res.status(500).json({
        status: 'error',
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
      return;
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(user);

    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        company: company.toDatabase(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    // Validate refresh token is provided
    if (!refreshToken) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    // Verify refresh token
    const { verifyRefreshToken, generateTokenPair } = require('../utils/jwt');
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }

    // Fetch user from database to ensure they still exist and are valid
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Return new tokens
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during token refresh',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 */
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  try {
    // In a stateless JWT system, logout is primarily handled client-side
    // by removing tokens from storage. This endpoint exists for consistency
    // and could be extended to maintain a token blacklist if needed.
    
    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during logout',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user information
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user
    const { verifyAccessToken } = require('../utils/jwt');
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Fetch user from database
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Return user data
    res.status(200).json({
      status: 'success',
      message: 'User retrieved successfully',
      data: user.toSafeObject(),
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching user',
      code: 'GET_USER_ERROR'
    });
  }
});

/**
 * GET /api/auth/countries
 * Get list of countries with currencies for signup
 */
router.get('/countries', async (_req: Request, res: Response): Promise<void> => {
  try {
    let countries;
    
    try {
      countries = await CurrencyService.getCountriesWithCurrencies();
    } catch (error) {
      console.warn('Failed to fetch countries from API, using fallback data:', error);
      countries = CurrencyService.getFallbackCountryCurrencies();
    }

    res.status(200).json({
      status: 'success',
      message: 'Countries retrieved successfully',
      data: {
        countries,
        count: countries.length,
      },
    });

  } catch (error) {
    console.error('Countries endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching countries',
      code: 'COUNTRIES_ERROR'
    });
  }
});

export default router;