import express from 'express';
import path from 'path';
import { requireAuth } from '../../middlewares/rbac.js';
import { identifyUser, requireJobOwnership } from '../../middlewares/ownership.js';
import { jobManager } from '../../services/jobManager.js';

const router = express.Router();

function publicResult(result) {
  if (!result) return null;
  const { payload, outputPath, ...visible } = result;
  return visible;
}

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
 * Guests may poll transient jobs from their own session; job ownership is enforced server-side.
 */
router.get('/status/:jobId', identifyUser, requireJobOwnership, (req, res) => {
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
      result: publicResult(job.result),
      error: job.error,
      file: {
        name: job.originalFileName,
        sizeBytes: job.fileSizeBytes,
        sourceFormat: job.sourceFormat,
        targetFormat: job.targetFormat,
      },
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
});

/**
 * GET /api/jobs/download/:jobId
 * Streams the converted output only to the job owner (PRD §9.2, TRD §10.13).
 */
router.get('/download/:jobId', identifyUser, requireJobOwnership, async (req, res) => {
  const job = jobManager.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'The conversion job no longer exists.' });
  }
  if (job.status !== 'completed' || !job.result) {
    return res.status(409).json({
      error: 'OUTPUT_NOT_READY',
      message: 'The converted output is not available for this job.',
    });
  }

  const { payload, outputPath, filename, mimeType } = job.result;
  const safeName = path.basename(filename || 'converted-output');

  if (outputPath) {
    return res.download(outputPath, safeName, async (error) => {
      if (error && !res.headersSent) {
        res.status(500).json({ error: 'DOWNLOAD_FAILED', message: 'Could not stream the converted file.' });
      }
      await jobManager.consumeOutput(job.id);
    });
  }

  if (typeof payload === 'string') {
    res.setHeader('Content-Type', mimeType || 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.on('finish', () => {
      jobManager.consumeOutput(job.id).catch(() => {});
    });
    return res.send(payload);
  }

  return res.status(404).json({ error: 'OUTPUT_NOT_FOUND', message: 'The converted output has already been consumed.' });
});

/**
 * POST /api/jobs/cancel/:jobId
 * Cancels a queued or running job and purges its buffers (PRD §2.3, TRD §10.9).
 */
router.post('/cancel/:jobId', identifyUser, requireJobOwnership, async (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'JOB_NOT_FOUND',
      message: `Cannot cancel: job ${jobId} does not exist.`,
    });
  }

  if (!['pending', 'processing'].includes(job.status)) {
    return res.status(409).json({
      error: 'JOB_NOT_CANCELLABLE',
      message: 'Only queued or in-progress jobs can be cancelled.',
    });
  }

  const cancelledJob = await jobManager.cancelJob(jobId);

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