import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.warn('MONGODB_URI is not defined in environment variables. Database features will remain dormant.');
    return null;
  }

  if (isConnected) {
    return mongoose.connection;
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    autoIndex: process.env.NODE_ENV !== 'production',
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    isConnected = true;
    logger.info('MongoDB Atlas connected successfully', { host: conn.connection.host });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Reconnecting...');
      isConnected = false;
    });

    return conn.connection;
  } catch (error) {
    logger.error('MongoDB Atlas initial connection failed', { error: error.message });
    // In dev mode, don't crash the server so offline conversion features remain testable
    return null;
  }
}

export async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB Atlas disconnected gracefully.');
  }
}
