import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../../models/User.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const adminLockouts = new Map();

function lockoutState(email) {
  const state = adminLockouts.get(email);
  if (!state) return { failedAttempts: 0, lockedUntil: 0 };
  if (state.lockedUntil > Date.now()) return state;
  // Failed attempts do not reset when the lockout expires (PRD §3.6).
  return state;
}

/**
 * POST /api/auth/google
 * Verifies Google ID Token credential sent from frontend GoogleLoginButton (PRD §3.3).
 */
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'MISSING_CREDENTIAL', message: 'Google credential token is required' });
  }

  try {
    let payload = null;

    // In dev mode when client id is placeholder, permit safe mock auth for development testing
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id')) {
      logger.info('Simulated Google OAuth authentication in development mode');
      payload = {
        sub: 'mock_google_id_123456789',
        email: 'user@fazaldataconverter.com',
        name: 'Demo Registered User',
        picture: 'https://ui-avatars.com/api/?name=Demo+User',
      };
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Failed to verify Google identity' });
    }

    // Find or create user in MongoDB
    let user = null;
    if (mongoose.connection.readyState !== 1) {
      // Offline dev mode: no DB connection, skip buffering and use a session-only user
      user = {
        _id: 'mock_mongo_user_id',
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
        role: 'registered',
      };
    } else {
      try {
        user = await User.findOne({ email: payload.email });
        if (!user) {
          user = await User.create({
            googleId: payload.sub,
            email: payload.email,
            name: payload.name || 'User',
            avatarUrl: payload.picture || '',
            role: 'registered',
          });
          logger.info('New registered user created via Google OAuth', { email: user.email });
        }
      } catch (dbErr) {
        // In offline/no-db dev mode, return session user object directly
        user = {
          _id: 'mock_mongo_user_id',
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.picture,
          role: 'registered',
        };
      }
    }

    // Bind authenticated user to session
    req.session.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
    req.session.authenticatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      user: req.session.user,
    });
  } catch (error) {
    logger.error('Google OAuth error', { error: error.message });
    res.status(401).json({ error: 'AUTH_FAILED', message: 'Google authentication failed' });
  }
});

/**
 * POST /api/auth/admin/login
 * Email/password login for the single Admin account (PRD §3.5, §3.6; TRD §10.7).
 * In local development without configured credentials the flow is simulated,
 * matching the mock Google flow above.
 */
router.post('/admin/login', async (req, res) => {
  const parsed = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(200),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'INVALID_CREDENTIALS',
      message: 'A valid admin email and password are required.',
    });
  }

  const { email, password } = parsed.data;
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  const isMock = !configuredEmail || !configuredHash;

  if (!isMock) {
    const state = lockoutState(configuredEmail.toLowerCase());

    if (state.lockedUntil > Date.now()) {
      const remainingMinutes = Math.max(1, Math.ceil((state.lockedUntil - Date.now()) / 60000));
      return res.status(423).json({
        error: 'ACCOUNT_LOCKED',
        message: `Too many failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`,
        retryAfterMinutes: remainingMinutes,
      });
    }

    const emailMatches = email.toLowerCase() === configuredEmail.toLowerCase();
    const passwordMatches = emailMatches && await bcrypt.compare(password, configuredHash);

    if (!passwordMatches) {
      const failedAttempts = state.failedAttempts + 1;
      const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      adminLockouts.set(configuredEmail.toLowerCase(), { failedAttempts, lockedUntil });
      logger.warn('Admin login failed', { email, failedAttempts, locked: lockedUntil > 0 });

      if (lockedUntil > 0) {
        return res.status(423).json({
          error: 'ACCOUNT_LOCKED',
          message: 'Too many failed login attempts. Try again in 15 minutes.',
          retryAfterMinutes: 15,
        });
      }
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Incorrect admin email or password.',
      });
    }

    adminLockouts.delete(configuredEmail.toLowerCase());
  } else {
    logger.info('Simulated admin authentication in development mode');
  }

  const adminUser = {
    id: 'mock_admin_id',
    email: isMock ? email : configuredEmail,
    name: 'Administrator',
    avatarUrl: '',
    role: 'admin',
  };

  req.session.user = adminUser;
  req.session.authenticatedAt = new Date().toISOString();
  return res.status(200).json({ success: true, user: adminUser });
});

/**
 * GET /api/auth/me
 * Returns currently logged-in user or guest session context.
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({
      authenticated: true,
      user: req.session.user,
    });
  }

  res.status(200).json({
    authenticated: false,
    user: {
      role: 'guest',
      sessionId: req.sessionID || 'guest_transient',
    },
  });
});

/**
 * POST /api/auth/logout
 * Destroys active user session.
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error', { error: err.message });
      return res.status(500).json({ error: 'LOGOUT_FAILED', message: 'Could not destroy session' });
    }
    res.clearCookie('fdc.sid');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
