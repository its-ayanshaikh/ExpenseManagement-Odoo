import axios from 'axios';
import redisClient from '../utils/redis';

export interface CountryCurrency {
  countryName: string;
  countryCode: string;
  currencies: {
    code: string;
    name: string;
    symbol?: string;
  }[];
}

export interface RestCountriesResponse {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  currencies?: {
    [code: string]: {
      name: string;
      symbol?: string;
    };
  };
}

export interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

export interface ExchangeRates {
  base: string;
  rates: {
    [currency: string]: number;
  };
  timestamp: number;
}

export class CurrencyService {
  private static readonly REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,currencies,cca2';
  private static readonly EXCHANGE_RATE_URL = 'https://api.exchangerate-api.com/v4/latest';
  private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private static readonly CACHE_TTL = 3600; // 1 hour in seconds
  private static readonly CACHE_KEY_PREFIX = 'exchange_rates:';

  /**
   * Get cached exchange rates for a base currency
   * @param baseCurrency - Base currency code
   * @returns Promise<ExchangeRates | null> - Cached exchange rates or null if not found
   */
  public static async getCachedRates(baseCurrency: string): Promise<ExchangeRates | null> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${baseCurrency.toUpperCase()}`;
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData) as ExchangeRates;
        
        // Check if cache is still valid (within TTL)
        const now = Date.now();
        const cacheAge = (now - parsedData.timestamp) / 1000; // Convert to seconds
        
        if (cacheAge < this.CACHE_TTL) {
          return parsedData;
        } else {
          // Cache expired, remove it
          await redisClient.del(cacheKey);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting cached rates for ${baseCurrency}:`, error);
      return null;
    }
  }

  /**
   * Cache exchange rates for a base currency
   * @param baseCurrency - Base currency code
   * @param rates - Exchange rates to cache
   * @returns Promise<void>
   */
  public static async cacheRates(baseCurrency: string, rates: { [currency: string]: number }): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${baseCurrency.toUpperCase()}`;
      const exchangeRates: ExchangeRates = {
        base: baseCurrency.toUpperCase(),
        rates,
        timestamp: Date.now(),
      };
      
      const serializedData = JSON.stringify(exchangeRates);
      await redisClient.set(cacheKey, serializedData, this.CACHE_TTL);
    } catch (error) {
      console.error(`Error caching rates for ${baseCurrency}:`, error);
      // Don't throw error, caching failure shouldn't break the application
    }
  }

  /**
   * Invalidate cached exchange rates for a specific currency or all currencies
   * @param baseCurrency - Base currency code to invalidate, or undefined to invalidate all
   * @returns Promise<void>
   */
  public static async invalidateCache(baseCurrency?: string): Promise<void> {
    try {
      if (baseCurrency) {
        const cacheKey = `${this.CACHE_KEY_PREFIX}${baseCurrency.toUpperCase()}`;
        await redisClient.del(cacheKey);
      } else {
        // For simplicity, we'll just delete known common currencies
        // In a production system, you might want to use Redis SCAN to find all keys with the prefix
        const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];
        for (const currency of commonCurrencies) {
          const cacheKey = `${this.CACHE_KEY_PREFIX}${currency}`;
          await redisClient.del(cacheKey);
        }
      }
    } catch (error) {
      console.error(`Error invalidating cache for ${baseCurrency || 'all currencies'}:`, error);
    }
  }

  /**
   * Fetch countries with their currencies from REST Countries API
   * @returns Promise<CountryCurrency[]> - Array of countries with currency data
   */
  public static async getCountriesWithCurrencies(): Promise<CountryCurrency[]> {
    try {
      const response = await axios.get<RestCountriesResponse[]>(
        this.REST_COUNTRIES_URL,
        {
          timeout: this.REQUEST_TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ExpenseManagementSystem/1.0',
          },
        }
      );

      const countries: CountryCurrency[] = response.data
        .filter(country => country.currencies && Object.keys(country.currencies).length > 0)
        .map(country => ({
          countryName: country.name.common,
          countryCode: country.cca2,
          currencies: Object.entries(country.currencies!).map(([code, currency]) => ({
            code,
            name: currency.name,
            symbol: currency.symbol,
          })),
        }))
        .sort((a, b) => a.countryName.localeCompare(b.countryName));

      return countries;
    } catch (error) {
      console.error('Error fetching countries with currencies:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout while fetching country data');
        } else if (error.response) {
          throw new Error(`REST Countries API error: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error('Network error while fetching country data');
        }
      }
      
      throw new Error('Failed to fetch country currency data');
    }
  }

  /**
   * Get currency for a specific country
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Promise<string | null> - Primary currency code or null if not found
   */
  public static async getCurrencyForCountry(countryCode: string): Promise<string | null> {
    try {
      const countries = await this.getCountriesWithCurrencies();
      const country = countries.find(c => c.countryCode.toLowerCase() === countryCode.toLowerCase());
      
      if (country && country.currencies.length > 0) {
        // Return the first currency (primary currency)
        return country.currencies[0].code;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting currency for country ${countryCode}:`, error);
      return null;
    }
  }

  /**
   * Validate if a currency code exists
   * @param currencyCode - Currency code to validate
   * @returns Promise<boolean> - True if currency exists
   */
  public static async validateCurrencyCode(currencyCode: string): Promise<boolean> {
    try {
      const countries = await this.getCountriesWithCurrencies();
      return countries.some(country => 
        country.currencies.some(currency => 
          currency.code.toLowerCase() === currencyCode.toLowerCase()
        )
      );
    } catch (error) {
      console.error(`Error validating currency code ${currencyCode}:`, error);
      return false;
    }
  }

  /**
   * Get exchange rate between two currencies
   * @param fromCurrency - Source currency code
   * @param toCurrency - Target currency code
   * @returns Promise<number> - Exchange rate
   */
  public static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const fromCurrencyUpper = fromCurrency.toUpperCase();
    const toCurrencyUpper = toCurrency.toUpperCase();
    
    if (fromCurrencyUpper === toCurrencyUpper) {
      return 1;
    }

    try {
      // Try to get from cache first
      const cachedRates = await this.getCachedRates(fromCurrencyUpper);
      if (cachedRates && cachedRates.rates[toCurrencyUpper]) {
        return cachedRates.rates[toCurrencyUpper];
      }

      // If not in cache, fetch from API
      const response = await axios.get<ExchangeRateResponse>(
        `${this.EXCHANGE_RATE_URL}/${fromCurrencyUpper}`,
        {
          timeout: this.REQUEST_TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ExpenseManagementSystem/1.0',
          },
        }
      );

      const rate = response.data.rates[toCurrencyUpper];
      if (!rate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      // Cache the rates for future use
      await this.cacheRates(fromCurrencyUpper, response.data.rates);

      return rate;
    } catch (error) {
      console.error(`Error fetching exchange rate from ${fromCurrency} to ${toCurrency}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout while fetching exchange rate');
        } else if (error.response) {
          throw new Error(`Exchange Rate API error: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error('Network error while fetching exchange rate');
        }
      }
      
      throw new Error(`Failed to fetch exchange rate from ${fromCurrency} to ${toCurrency}`);
    }
  }

  /**
   * Convert amount from one currency to another
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency code
   * @param toCurrency - Target currency code
   * @returns Promise<number> - Converted amount
   */
  public static async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate;
    
    // Round to 2 decimal places for currency precision
    return Math.round(convertedAmount * 100) / 100;
  }

  /**
   * Get fallback currency data for common countries (used when API is unavailable)
   * @returns CountryCurrency[] - Array of common countries with currencies
   */
  public static getFallbackCountryCurrencies(): CountryCurrency[] {
    return [
      {
        countryName: 'United States',
        countryCode: 'US',
        currencies: [{ code: 'USD', name: 'United States Dollar', symbol: '$' }],
      },
      {
        countryName: 'United Kingdom',
        countryCode: 'GB',
        currencies: [{ code: 'GBP', name: 'British Pound Sterling', symbol: '£' }],
      },
      {
        countryName: 'Canada',
        countryCode: 'CA',
        currencies: [{ code: 'CAD', name: 'Canadian Dollar', symbol: '$' }],
      },
      {
        countryName: 'Australia',
        countryCode: 'AU',
        currencies: [{ code: 'AUD', name: 'Australian Dollar', symbol: '$' }],
      },
      {
        countryName: 'Germany',
        countryCode: 'DE',
        currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
      },
      {
        countryName: 'France',
        countryCode: 'FR',
        currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
      },
      {
        countryName: 'Japan',
        countryCode: 'JP',
        currencies: [{ code: 'JPY', name: 'Japanese Yen', symbol: '¥' }],
      },
      {
        countryName: 'India',
        countryCode: 'IN',
        currencies: [{ code: 'INR', name: 'Indian Rupee', symbol: '₹' }],
      },
    ].sort((a, b) => a.countryName.localeCompare(b.countryName));
  }
}