import { adminStore } from '../services/adminStore.js';

/**
 * Revokes access for suspended or deleted registered accounts on their
 * next request, even if an older session cookie is still presented (PRD §8.2).
 */
export function enforceAccountStatus(req, res, next) {
  if (req.userRole !== 'registered') return next();

  const account = adminStore.findByInternalId(req.userId);
  if (!account || account.status === 'active') return next();

  req.session?.destroy(() => {});
  res.clearCookie('fdc.sid');

  return res.status(403).json({
    error: account.status === 'deleted' ? 'ACCOUNT_DELETED' : 'ACCOUNT_SUSPENDED',
    message:
      account.status === 'deleted'
        ? 'This account has been permanently removed.'
        : 'This account has been suspended by the administrator.',
    accountStatus: account.status,
  });
}