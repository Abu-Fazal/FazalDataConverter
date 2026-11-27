import { logger } from '../utils/logger.js';

/**
 * Role-Based Access Control (RBAC) Middleware (PRD §3.1-3.4 & TRD §10.4)
 * Strictly enforces access boundaries for exactly 3 roles:
 * 1. 'guest': Unauthenticated visitors with transient sessions.
 * 2. 'registered': Authenticated via Google Login.
 * 3. 'admin': Single administrative operator.
 */

// Middleware to ensure user is logged in (Registered User or Admin)
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required to access this resource.',
    });
  }
  next();
}

// Middleware to enforce specific roles (e.g. ['admin'], ['registered', 'admin'])
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // 1. If 'guest' is among allowed roles, unauthenticated sessions are accepted
    if (allowedRoles.includes('guest') && (!req.session || !req.session.user)) {
      return next();
    }

    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const userRole = req.session.user.role || 'guest';

    if (!allowedRoles.includes(userRole)) {
      logger.warn('RBAC Permission Denied', {
        userId: req.session.user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.originalUrl,
      });

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
}

// Shortcut: Admin only access
export const requireAdmin = requireRole(['admin']);

// Shortcut: Registered user or Admin access
export const requireRegistered = requireRole(['registered', 'admin']);
