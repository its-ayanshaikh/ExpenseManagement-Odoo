interface EnvironmentConfig {
  // API Configuration
  apiBaseUrl: string;
  
  // Application Configuration
  app: {
    name: string;
    version: string;
    environment: string;
  };
  
  // File Upload Configuration
  fileUpload: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  
  // Feature Flags
  features: {
    enableOcr: boolean;
    enableMultiCurrency: boolean;
    enableNotifications: boolean;
    enableDebugMode: boolean;
  };
  
  // UI Configuration
  ui: {
    defaultCurrency: string;
    dateFormat: string;
    currencyDecimalPlaces: number;
  };
  
  // Cache Configuration
  cache: {
    ttlCountries: number;
    ttlExchangeRates: number;
  };
  
  // Development Tools
  devTools: {
    enableReactQueryDevtools: boolean;
    enableAccessibilityTesting: boolean;
  };
}

const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_APP_NAME'
];

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export const config: EnvironmentConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Expense Management System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  },
  
  fileUpload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '5242880', 10),
    allowedFileTypes: (import.meta.env.VITE_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf').split(','),
  },
  
  features: {
    enableOcr: import.meta.env.VITE_ENABLE_OCR === 'true',
    enableMultiCurrency: import.meta.env.VITE_ENABLE_MULTI_CURRENCY === 'true',
    enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
    enableDebugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  },
  
  ui: {
    defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || 'USD',
    dateFormat: import.meta.env.VITE_DATE_FORMAT || 'MM/DD/YYYY',
    currencyDecimalPlaces: parseInt(import.meta.env.VITE_CURRENCY_DECIMAL_PLACES || '2', 10),
  },
  
  cache: {
    ttlCountries: parseInt(import.meta.env.VITE_CACHE_TTL_COUNTRIES || '86400000', 10),
    ttlExchangeRates: parseInt(import.meta.env.VITE_CACHE_TTL_EXCHANGE_RATES || '3600000', 10),
  },
  
  devTools: {
    enableReactQueryDevtools: import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS === 'true',
    enableAccessibilityTesting: import.meta.env.VITE_ENABLE_ACCESSIBILITY_TESTING === 'true',
  },
};

// Helper functions for common environment checks
export const isDevelopment = () => config.app.environment === 'development';
export const isProduction = () => config.app.environment === 'production';
export const isDebugMode = () => config.features.enableDebugMode;

export default config;