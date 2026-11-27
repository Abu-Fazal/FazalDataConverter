import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

const app = express();

// Security Headers (TRD §2 & §3.3)
app.use(helmet());

// CORS configuration (Data Isolation)
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API (TRD §3.1 & Section 13)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'FazalDataConverter Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    limits: {
      maxFileSize: '50 MB',
      dataOnlyMode: true,
    },
  });
});

// Central 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Central Error handler (Structured error responses, never expose stack traces)
app.use((err, req, res, next) => {
  logger.error('Unhandled Server Error', { error: err.message });
  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: config.env === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

export default app;
