import express from 'express';
import { requireAuth } from '../../middlewares/rbac.js';
import { identifyUser, requireJobOwnership } from '../../middlewares/ownership.js';
import { jobManager } from '../../services/jobManager.js';

const router = express.Router();

/**
 * GET /api/jobs
 * Lists the authenticated user's own conversion jobs, newest first.
 */
router.get('/', identifyUser, requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: jobManager.listJobs(req.userId),
  });
});

/**
 * GET /api/jobs/status/:jobId
 * Returns current progress, processing stage, and converted results when complete (TRD §7.15).
 * Server-side ownership validation: a user can only poll their own job.
 */
router.get('/status/:jobId', identifyUser, requireAuth, requireJobOwnership, (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'JOB_NOT_FOUND',
      message: `No active job found with ID: ${jobId}`,
    });
  }

  res.status(200).json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
      updatedAt: job.updatedAt,
    },
  });
});

/**
 * POST /api/jobs/cancel/:jobId
 * Allows user to safely cancel a running conversion job and clean up its buffers (PRD §2.3).
 * Server-side ownership validation: a user can only cancel their own job.
 */
router.post('/cancel/:jobId', identifyUser, requireAuth, requireJobOwnership, async (req, res) => {
  const { jobId } = req.params;
  const cancelledJob = await jobManager.cancelJob(jobId);

  if (!cancelledJob) {
    return res.status(404).json({
      error: 'JOB_NOT_FOUND',
      message: `Cannot cancel: job ${jobId} does not exist.`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Conversion job has been cancelled and temporary storage purged.',
    job: {
      id: cancelledJob.id,
      status: cancelledJob.status,
    },
  });
});

export default router;
