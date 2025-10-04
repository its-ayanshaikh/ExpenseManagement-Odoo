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
  countryCode: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/signup
 * Create new company and admin user
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, companyName, countryCode }: SignupRequest = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName || !countryCode) {
      res.status(400).json({
        status: 'error',
        message: 'All fields are required',
        code: 'MISSING_FIELDS',
        required: ['email', 'password', 'firstName', 'lastName', 'companyName', 'countryCode']
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

    // Check if user already exists
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

    // Get currency for the selected country
    let defaultCurrency: string;
    try {
      const currency = await CurrencyService.getCurrencyForCountry(countryCode);
      if (!currency) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid country code or currency not found',
          code: 'INVALID_COUNTRY'
        });
        return;
      }
      defaultCurrency = currency;
    } catch (error) {
      console.error('Error fetching currency for country:', error);
      res.status(503).json({
        status: 'error',
        message: 'Unable to fetch currency data. Please try again later.',
        code: 'CURRENCY_SERVICE_ERROR'
      });
      return;
    }

    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (trx) => {
      // Create company
      const company = new Company({
        name: companyName,
        country: countryCode,
        default_currency: defaultCurrency,
      });

      const savedCompany = await trx('companies')
        .insert(company.toDatabase())
        .returning('*')
        .then(rows => Company.fromDatabase(rows[0]));

      // Create admin user
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

    // Generate JWT tokens
    const tokens = generateTokenPair(result.user);

    // Return success response
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