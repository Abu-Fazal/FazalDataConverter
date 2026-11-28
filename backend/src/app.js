import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { createSessionMiddleware } from './middlewares/session.js';
import { identifyUser } from './middlewares/ownership.js';
import authRoutes from './modules/auth/auth.routes.js';
import converterRoutes from './modules/converter/converter.routes.js';
import filesRoutes from './modules/files/files.routes.js';
import jobsRoutes from './modules/jobs/jobs.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import accountRoutes from './modules/account/account.routes.js';

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

// Session Middleware (Connect-Mongo & Cookies)
app.use(createSessionMiddleware());

// Attach authenticated user identity (req.userId, req.userRole, req.isAuthenticated)
// to every request for downstream ownership validation (Chunk 4.3)
app.use(identifyUser);

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

// Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/converter', converterRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', accountRoutes);

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
