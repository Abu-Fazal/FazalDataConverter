import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { requireAuth } from '../../middlewares/rbac.js';
import { jobManager } from '../../services/jobManager.js';
import { fileVault, DEFAULT_QUOTA_BYTES } from '../../services/fileVault.js';
import { User } from '../../models/User.js';
import { ConversionJob } from '../../models/ConversionJob.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REAUTH_WINDOW_MS = 5 * 60 * 1000;
const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT PERMANENTLY';
const HISTORY_LIMIT = 10;

function describeDevice(userAgent = '') {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS X/.test(userAgent)
      ? 'macOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad/.test(userAgent)
          ? 'iOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'Device';
  return `${browser} on ${os}`;
}

async function findDbUser(userId) {
  if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(userId)) return null;
  try {
    return await User.findById(userId);
  } catch (error) {
    logger.warn('Account profile lookup failed', { error: error.message });
    return null;
  }
}

/**
 * GET /api/account
 * Profile, current session, and storage usage for the signed-in registered user.
 */
router.get('/', requireAuth, async (req, res) => {
  const sessionUser = req.session.user;
  const dbUser = await findDbUser(sessionUser.id);
  const jobs = jobManager.listJobs(req.userId);
  const storage = fileVault.statsForOwner(req.userId);
  const completed = jobs.filter((job) => job.status === 'completed').length;

  res.status(200).json({
    success: true,
    profile: {
      id: sessionUser.id,
      name: sessionUser.name || 'User',
      email: sessionUser.email || '',
      avatarUrl: sessionUser.avatarUrl || '',
      role: sessionUser.role || 'registered',
      provider: sessionUser.role === 'admin' ? 'password' : 'google',
      memberSince: dbUser?.createdAt?.toISOString?.() || null,
    },
    session: {
      id: String(req.sessionID || '').slice(0, 8),
      device: describeDevice(req.headers['user-agent'] || ''),
      authenticatedAt: req.session.authenticatedAt || null,
      reauthenticatedAt: req.session.reauthenticatedAt || null,
    },
    storage: {
      ...storage,
      quotaBytes: DEFAULT_QUOTA_BYTES,
      historyCount: jobs.length,
      historyLimit: HISTORY_LIMIT,
      completedCount: completed,
    },
  });
});

/**
 * POST /api/account/reauthenticate
 * Fresh Google verification required before self-deletion (PRD §7.6).
 */
router.post('/reauthenticate', requireAuth, async (req, res) => {
  if (req.session.user.role === 'admin') {
    return res.status(403).json({
      error: 'ADMIN_ACCOUNT',
      message: 'This endpoint is only available to registered user accounts.',
    });
  }

  const parsed = z.object({
    credential: z.string().max(4096).optional(),
  }).safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Invalid re-authentication request.' });
  }

  const hasRealClient = process.env.GOOGLE_CLIENT_ID
    && !process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id');

  if (hasRealClient) {
    if (!parsed.data.credential) {
      return res.status(400).json({
        error: 'GOOGLE_CREDENTIAL_REQUIRED',
        message: 'A fresh Google credential is required.',
      });
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: parsed.data.credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email || payload.email !== req.session.user.email) {
        return res.status(401).json({
          error: 'IDENTITY_MISMATCH',
          message: 'The Google account does not match this session.',
        });
      }
    } catch (error) {
      logger.warn('Account re-authentication failed', { error: error.message });
      return res.status(401).json({
        error: 'REAUTH_FAILED',
        message: 'Google re-authentication failed. Please try again.',
      });
    }
  } else {
    logger.info('Simulated Google re-authentication in development mode');
  }

  req.session.reauthenticatedAt = new Date().toISOString();
  return res.status(200).json({
    success: true,
    verifiedAt: req.session.reauthenticatedAt,
  });
});

/**
 * DELETE /api/account
 * Permanently deletes the account, history, originals, and converted outputs
 * after fresh re-authentication and explicit phrase confirmation (PRD §7.6).
 */
router.delete('/', requireAuth, async (req, res) => {
  if (req.session.user.role === 'admin') {
    return res.status(403).json({
      error: 'ADMIN_ACCOUNT',
      message: 'Admin accounts cannot be self-deleted through this endpoint.',
    });
  }

  const parsed = z.object({
    confirmation: z.string().max(64),
    consent: z.literal(true),
  }).safeParse(req.body);

  if (!parsed.success || parsed.data.confirmation !== CONFIRMATION_PHRASE) {
    return res.status(400).json({
      error: 'CONFIRMATION_MISMATCH',
      message: `Type "${CONFIRMATION_PHRASE}" and confirm the deletion to continue.`,
    });
  }

  const verifiedAt = req.session.reauthenticatedAt
    ? new Date(req.session.reauthenticatedAt).getTime()
    : 0;
  if (!verifiedAt || Date.now() - verifiedAt > REAUTH_WINDOW_MS) {
    return res.status(403).json({
      error: 'REAUTH_REQUIRED',
      message: 'Re-authenticate with Google before deleting your account.',
    });
  }

  const userId = req.userId;
  const jobs = jobManager.listJobs(userId);

  for (const job of jobs.filter((entry) => ['pending', 'processing'].includes(entry.status))) {
    await jobManager.cancelJob(job.id);
  }
  jobManager.removeInactiveJobs(userId);
  await fileVault.purgeOwner(userId);

  if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(userId)) {
    try {
      await ConversionJob.deleteMany({ userId });
      await User.deleteOne({ _id: userId });
    } catch (error) {
      logger.error('Account data deletion failed', { error: error.message });
      return res.status(500).json({
        error: 'DELETION_FAILED',
        message: 'Account deletion could not be completed. Please retry.',
      });
    }
  }

  logger.info('Registered user self-deleted account', { userId });

  req.session.destroy((error) => {
    if (error) {
      logger.error('Session destruction failed during account deletion', { error: error.message });
      return res.status(500).json({
        error: 'DELETION_FAILED',
        message: 'Account data was deleted but the session could not be closed.',
      });
    }
    res.clearCookie('fdc.sid');
    return res.status(200).json({
      success: true,
      message: 'Your account and all stored data have been permanently deleted.',
    });
  });
});

export default router;