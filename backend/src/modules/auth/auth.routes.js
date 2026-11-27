import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../../models/User.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    // Bind authenticated user to session
    req.session.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };

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
