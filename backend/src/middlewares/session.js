import session from 'express-session';
import MongoStore from 'connect-mongo';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Creates Express session middleware (TRD §10.3).
 * Uses MongoStore if MONGODB_URI is available, otherwise MemoryStore for offline development.
 */
export function createSessionMiddleware() {
  const mongoUri = process.env.MONGODB_URI;
  const isProd = config.env === 'production';

  const sessionOptions = {
    name: 'fdc.sid',
    secret: process.env.SESSION_SECRET || 'fallback_development_session_secret_32_chars_long',
    resave: false,
    saveUninitialized: true, // true for guest session initialization
    cookie: {
      httpOnly: true,
      secure: isProd, // true in production HTTPS
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days session lifetime
    },
  };

  if (mongoUri && !mongoUri.includes('<username>')) {
    sessionOptions.store = MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60, // 7 days
      autoRemove: 'native',
    });
    logger.info('Session store initialized with MongoDB Atlas connect-mongo');
  } else {
    logger.info('Session store initialized with in-memory store (Local dev fallback)');
  }

  return session(sessionOptions);
}
