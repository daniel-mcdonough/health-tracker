// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv - try multiple possible paths
const possiblePaths = [
  join(__dirname, '../.env'),           // From dist/
  join(__dirname, '../../.env'),        // From src/ (development)
  join(process.cwd(), '.env'),          // From working directory
  join(process.cwd(), 'server/.env')    // From project root
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  console.log('Trying .env path:', envPath);
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log('✓ Successfully loaded .env from:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Could not load .env file from any path');
}

// Environment loaded successfully

// NOW import everything else after environment is loaded
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { database } from './database/init.js';
import analysisRoutes from './routes/analysis.js';
import bowelMovementRoutes from './routes/bowelMovements.js';
import symptomRoutes from './routes/symptoms.js';
import authRoutes from './routes/auth.js';
import foodRoutes from './routes/food.js';
import medicationRoutes from './routes/medications.js';
import exportRoutes from './routes/export.js';
import settingsRoutes from './routes/settings.js';
import sleepRoutes from './routes/sleep.js';
import mlAnalysisRoutes from './routes/mlAnalysis.js';
import physicalActivityRoutes from './routes/physicalActivity.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/ml-analysis', mlAnalysisRoutes);
app.use('/api/physical-activity', physicalActivityRoutes);
app.use('/api/bowel-movements', bowelMovementRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/sleep', sleepRoutes);
app.use('/api', foodRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api', exportRoutes);
app.use('/api', settingsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await database.initialize();
    await database.seedDefaultData();
    console.log('Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Health Tracker API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Analysis API: http://localhost:${PORT}/api/analysis`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await database.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  try {
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();

// Extend Express Request type for TypeScript
declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}