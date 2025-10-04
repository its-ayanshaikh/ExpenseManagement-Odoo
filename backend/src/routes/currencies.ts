import { Router, Request, Response } from 'express';
import { CurrencyService } from '../services/CurrencyService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/currencies/countries
 * Get list of countries with their currencies
 */
router.get('/countries', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const countries = await CurrencyService.getCountriesWithCurrencies();
    
    res.json({
      success: true,
      data: countries,
    });
  } catch (error) {
    console.error('Error fetching countries with currencies:', error);
    
    // Fallback to static data if API fails
    try {
      const fallbackCountries = CurrencyService.getFallbackCountryCurrencies();
      res.json({
        success: true,
        data: fallbackCountries,
        warning: 'Using fallback data due to API unavailability',
      });
    } catch (fallbackError) {
      res.status(503).json({
        success: false,
        error: 'Currency service temporarily unavailable',
        message: 'Unable to fetch country currency data',
      });
    }
  }
});

/**
 * GET /api/currencies/convert
 * Convert amount between currencies
 * Query params: amount, from, to
 */
router.get('/convert', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, from, to } = req.query;

    // Validate required parameters
    if (!amount || !from || !to) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'amount, from, and to parameters are required',
      });
      return;
    }

    // Validate amount is a positive number
    const amountNum = parseFloat(amount as string);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be a positive number',
      });
      return;
    }

    // Validate currency codes (basic format check)
    const fromCurrency = (from as string).toUpperCase();
    const toCurrency = (to as string).toUpperCase();
    
    if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency)) {
      res.status(400).json({
        success: false,
        error: 'Invalid currency code',
        message: 'Currency codes must be 3-letter ISO codes (e.g., USD, EUR)',
      });
      return;
    }

    // Perform conversion
    const convertedAmount = await CurrencyService.convertAmount(amountNum, fromCurrency, toCurrency);
    const exchangeRate = await CurrencyService.getExchangeRate(fromCurrency, toCurrency);

    res.json({
      success: true,
      data: {
        originalAmount: amountNum,
        originalCurrency: fromCurrency,
        convertedAmount,
        convertedCurrency: toCurrency,
        exchangeRate,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('timeout')) {
        res.status(503).json({
          success: false,
          error: 'Service timeout',
          message: 'Currency conversion service is temporarily unavailable',
        });
        return;
      } else if (error.message.includes('not found')) {
        res.status(400).json({
          success: false,
          error: 'Invalid currency',
          message: error.message,
        });
        return;
      } else if (error.message.includes('Network error')) {
        res.status(503).json({
          success: false,
          error: 'Network error',
          message: 'Unable to connect to currency service',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Currency conversion failed',
      message: 'An error occurred while converting currency',
    });
  }
});

export default router;