import express from 'express';
import cors from 'cors';
import { config } from './config/environment';
import { validateEnvironment, logEnvironmentStatus } from './utils/validateEnvironment';
import { checkDatabaseConnection, closeDatabaseConnection } from './utils/dbHealthCheck';
import redisClient from './utils/redis';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import expenseRoutes from './routes/expenses';
import approvalRuleRoutes from './routes/approval-rules';
import currencyRoutes from './routes/currencies';
import ocrRoutes from './routes/ocr';

// Validate environment configuration on startup
const validation = validateEnvironment();
if (!validation.isValid) {
  console.error('❌ Environment validation failed:');
  validation.errors.forEach(error => console.error(`   - ${error}`));
  process.exit(1);
}

const app = express();

// Configure CORS with environment settings
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));

app.use(express.json({ limit: `${config.fileUpload.maxFileSize}b` }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/approval-rules', approvalRuleRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/ocr', ocrRoutes);

app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = redisClient.isClientConnected();
  
  res.json({
    status: dbHealthy && redisHealthy ? 'ok' : 'degraded',
    message: 'Expense Management System API',
    database: dbHealthy ? 'connected' : 'disconnected',
    redis: redisHealthy ? 'connected' : 'disconnected',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await redisClient.disconnect();
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await redisClient.disconnect();
  await closeDatabaseConnection();
  process.exit(0);
});

app.listen(config.port, async () => {
  // Log environment status
  logEnvironmentStatus();
  
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  
  await checkDatabaseConnection();
  
  // Initialize Redis connection (non-blocking)
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.warn('⚠️  Redis connection failed, continuing without cache:', error);
  }
});
