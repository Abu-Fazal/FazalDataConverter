import { adminStore } from '../services/adminStore.js';

/**
 * Maintenance gate (PRD §3.7): guests and registered users are locked out of
 * conversion, history, and file APIs while the Admin retains console access.
 */
export function enforceMaintenance(req, res, next) {
  if (!adminStore.isMaintenanceMode() || req.userRole === 'admin') {
    return next();
  }

  const settings = adminStore.getSettings();
  return res.status(503).json({
    error: 'MAINTENANCE_MODE',
    message: settings.maintenanceMessage,
    maintenance: {
      enabled: true,
      message: settings.maintenanceMessage,
    },
  });
}