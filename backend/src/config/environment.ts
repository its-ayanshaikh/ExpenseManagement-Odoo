import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Fallback to .env if environment-specific file doesn't exist
dotenv.config();

interface EnvironmentConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  
  // Database Configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  
  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  // JWT Configuration
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  // External APIs
  externalApis: {
    restCountries: {
      url: string;
    };
    exchangeRate: {
      url: string;
      apiKey?: string;
    };
    ocr: {
      provider: 'tesseract' | 'google-vision' | 'aws-textract';
      apiKey?: string;
      googleVisionApiKey?: string;
      awsTextract?: {
        accessKey?: string;
        secretKey?: string;
        region: string;
      };
    };
  };
  
  // CORS Configuration
  cors: {
    origin: string;
    credentials: boolean;
  };
  
  // File Upload Configuration
  fileUpload: {
    maxFileSize: number;
    uploadDir: string;
    allowedFileTypes: string[];
  };
  
  // Logging Configuration
  logging: {
    level: string;
    file: string;
  };
  
  // Cache Configuration
  cache: {
    ttlExchangeRates: number;
    ttlCountries: number;
  };
  
  // Security Configuration
  security: {
    bcryptRounds: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // Email Configuration
  email: {
    smtp: {
      host: string;
      port: number;
      user?: string;
      password?: string;
    };
    from: string;
  };
}

const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: "12345678"!,
    ssl: process.env.DB_SSL === 'true',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  externalApis: {
    restCountries: {
      url: process.env.REST_COUNTRIES_API_URL || 'https://restcountries.com/v3.1/all',
    },
    exchangeRate: {
      url: process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest',
      apiKey: process.env.EXCHANGE_RATE_API_KEY,
    },
    ocr: {
      provider: (process.env.OCR_PROVIDER as 'tesseract' | 'google-vision' | 'aws-textract') || 'tesseract',
      apiKey: process.env.OCR_API_KEY,
      googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
      awsTextract: {
        accessKey: process.env.AWS_TEXTRACT_ACCESS_KEY,
        secretKey: process.env.AWS_TEXTRACT_SECRET_KEY,
        region: process.env.AWS_TEXTRACT_REGION || 'us-east-1',
      },
    },
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    uploadDir: process.env.UPLOAD_DIR || 'uploads/receipts',
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf').split(','),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  cache: {
    ttlExchangeRates: parseInt(process.env.CACHE_TTL_EXCHANGE_RATES || '3600', 10),
    ttlCountries: parseInt(process.env.CACHE_TTL_COUNTRIES || '86400', 10),
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
  },
  
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    },
    from: process.env.SMTP_FROM || 'noreply@expensemanagement.com',
  },
};

export default config;