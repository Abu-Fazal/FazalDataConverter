import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { createSessionMiddleware } from './middlewares/session.js';
import { identifyUser } from './middlewares/ownership.js';
import { enforceMaintenance } from './middlewares/maintenance.js';
import { enforceAccountStatus } from './middlewares/accountStatus.js';
import { adminStore } from './services/adminStore.js';
import { getSystemStatus } from './modules/admin/admin.service.js';
import authRoutes from './modules/auth/auth.routes.js';
import converterRoutes from './modules/converter/converter.routes.js';
import filesRoutes from './modules/files/files.routes.js';
import jobsRoutes from './modules/jobs/jobs.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import accountRoutes from './modules/account/account.routes.js';

const app = express();

// Vercel terminates TLS at its edge; trust the proxy so secure cookies and
// client IPs are handled correctly in production.
app.set('trust proxy', 1);

// Security Headers (TRD §2 & §3.3)
app.use(helmet());

// CORS configuration (Data Isolation). Supports a comma-separated origin list
// so production and Vercel preview domains can coexist.
const allowedOrigins = config.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'));
    },
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
      maxFileSize: `${adminStore.getSettings().maxFileSizeMb} MB`,
      dataOnlyMode: true,
    },
  });
});

// Public service status used by the maintenance banner (PRD §3.7).
app.get('/api/system/status', (req, res) => {
  const system = getSystemStatus();
  res.status(200).json({
    success: true,
    data: {
      status: system.status,
      maintenanceMode: system.maintenanceMode,
      maintenanceMessage: system.maintenanceMessage,
      maxFileSizeMb: system.maxFileSizeMb,
      serverTime: system.serverTime,
    },
  });
});

// Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/converter', enforceMaintenance, enforceAccountStatus, converterRoutes);
app.use('/api/files', enforceMaintenance, enforceAccountStatus, filesRoutes);
app.use('/api/jobs', enforceMaintenance, enforceAccountStatus, jobsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', enforceMaintenance, enforceAccountStatus, accountRoutes);

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
