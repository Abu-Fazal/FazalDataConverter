import { logger } from '../utils/logger.js';
import { jobManager } from '../services/jobManager.js';

/**
 * Server-Side Ownership Validation Middleware (PRD §3.1-3.4, §9.2; TRD §4.3, §9.3, §12.4)
 *
 * Ensures every protected request is scoped to the authenticated user's own resources
 * via `userId`, unless the caller is the Admin (metadata-only access).
 *
 * 1. 'guest'   : unauthenticated visitor (req.userId = null) — transient scope only
 * 2. 'registered' : Google-authenticated user — may only access own userId-scoped resources
 * 3. 'admin'   : single admin — bypasses ownership (metadata access only)
 */

/**
 * Attaches the authenticated session user's identity to the request.
 *
 * req.userId             : String | null   (null for guests)
 * req.userRole           : 'guest' | 'registered' | 'admin'
 * req.isAuthenticated    : boolean
 */
export function identifyUser(req, res, next) {
  const user = req.session?.user;

  if (user) {
    req.userId = String(user.id);
    req.userRole = user.role || 'registered';
    req.isAuthenticated = true;
  } else {
    req.userId = null;
    req.userRole = 'guest';
    req.isAuthenticated = false;
  }

  next();
}

/**
 * Factory: enforces that the requesting user owns the target resource.
 *
 * - 401 if the caller is not authenticated
 * - Admin bypass (admin sees metadata only; never file contents)
 * - 400 if the resource owner identifier cannot be resolved
 * - 403 if resolved ownerId !== req.userId
 *
 * getOwnerId(req) must return the resource-owning user's id (string) or null.
 * Example: (req) => req.body.userId  or  (req) => req.params.userId
 */
export function requireOwnership(getOwnerId) {
  return (req, res, next) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required to access this resource.',
      });
    }

    if (req.userRole === 'admin') {
      return next();
    }

    const ownerId = getOwnerId(req);

    if (ownerId == null) {
      return res.status(400).json({
        error: 'MISSING_OWNER',
        message: 'Resource owner identifier is required.',
      });
    }

    if (String(ownerId) !== req.userId) {
      logger.warn('Ownership validation failed', {
        userId: req.userId,
        resourceOwnerId: ownerId,
        path: req.originalUrl,
      });

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
}

/**
 * Ownership guard for in-memory conversion jobs (jobManager).
 *
 * - 404 if the job does not exist
 * - Admin bypass
 * - Guest jobs (job.userId === null) are only accessible to guest sessions
 * - Registered users may only access their own jobs (job.userId === req.userId)
 */
export function requireJobOwnership(req, res, next) {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({
      error: 'MISSING_JOB_ID',
      message: 'jobId is required.',
    });
  }

  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'JOB_NOT_FOUND',
      message: `No job found with ID: ${jobId}`,
    });
  }

  if (req.userRole === 'admin') {
    return next();
  }

  const jobOwnerId = job.userId == null ? null : String(job.userId);

  if (jobOwnerId === null) {
    // Guest-owned transient job: only a guest session may access it
    if (req.isAuthenticated) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this job.',
      });
    }
    return next();
  }

  if (!req.isAuthenticated || String(jobOwnerId) !== req.userId) {
    logger.warn('Job ownership validation failed', {
      userId: req.userId,
      jobId,
      jobOwnerId,
    });

    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You do not have permission to access this job.',
    });
  }

  next();
}