import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 52428800, // Strictly 50 MB
  jobTimeoutSeconds: parseInt(process.env.JOB_TIMEOUT_SECONDS, 10) || 60,
  tempStoragePath: process.env.TEMP_STORAGE_PATH || './backend/storage/temp',
};
