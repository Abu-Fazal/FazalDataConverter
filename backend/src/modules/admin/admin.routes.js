import express from 'express';
import { requireAdmin } from '../../middlewares/rbac.js';
import { User } from '../../models/User.js';
import { ConversionJob } from '../../models/ConversionJob.js';

const router = express.Router();

// Apply Admin check to all routes in this module
router.use(requireAdmin);

/**
 * GET /api/admin/metrics
 * System metrics for Admin Dashboard (PRD §3.4)
 */
router.get('/metrics', async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      systemStatus: 'healthy',
      maintenanceMode: false,
      totalUsers: 1,
      totalConversions: 0,
      activeJobs: 0,
      storageUsedMb: 0,
    },
  });
});

export default router;
