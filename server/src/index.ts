import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { connectDB } from './config/database';
import { logger } from './utils/logger';

// Import routes
import leadRoutes from './routes/leads';
import eventRoutes from './routes/events';
import staffRoutes from './routes/staff';
import serviceRoutes from './routes/services';
import configRoutes from './routes/config';
import healthRoutes from './routes/health';
import leapSyncRoutes from './routes/leap-sync';
import appointmentRoutes from './routes/appointments';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:9000'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.ENABLE_CORS_CREDENTIALS === 'true',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(compression() as any);
app.use(express.json({ 
  limit: process.env.BODY_LIMIT || '10mb' 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.URL_LIMIT || '10mb' 
}));

// Logging middleware
if (process.env.ENABLE_MORGAN_LOGGING === 'true') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/config', configRoutes);
app.use('/api/leap-sync', leapSyncRoutes);
app.use('/api/appointments', appointmentRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EventCollect API Server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle nodemon restarts
process.once('SIGUSR2', () => {
  logger.info('SIGUSR2 received (nodemon restart). Shutting down gracefully...');
  mongoose.connection.close().then(() => {
    logger.info('MongoDB connection closed');
    process.kill(process.pid, 'SIGUSR2');
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 EventCollect Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
