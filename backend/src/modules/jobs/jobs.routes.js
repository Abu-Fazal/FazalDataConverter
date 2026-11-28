import express from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../../middlewares/rbac.js';
import { identifyUser, requireJobOwnership } from '../../middlewares/ownership.js';
import { jobManager } from '../../services/jobManager.js';
import { fileVault } from '../../services/fileVault.js';
import { purgeTempFile } from '../../utils/tempCleaner.js';

const router = express.Router();

const ACTIVE_STATUSES = ['pending', 'processing'];

function publicResult(result) {
  if (!result) return null;
  const { payload, outputPath, ...visible } = result;
  return visible;
}

function originalAvailable(job) {
  if (job.originalDeletedAt || !job.tempFilePath) return false;
  return fileVault.has(job.tempFilePath);
}

function outputAvailable(job) {
  if (job.outputDeletedAt || !job.result) return false;
  if (job.result.outputPath) return fileVault.has(job.result.outputPath);
  return job.result.payload != null;
}

function historyEntry(job) {
  const summary = job.result || {};
  const counts = summary.counts || {};
  const verification = summary.verification || null;

  return {
    id: job.id,
    originalFileName: job.originalFileName,
    fileSizeBytes: job.fileSizeBytes,
    sourceFormat: job.sourceFormat,
    targetFormat: job.targetFormat,
    direction: job.request?.direction || null,
    mode: job.request?.mode || 'normal',
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    durationMs: summary.durationMs || 0,
    sheetCount: summary.sheetCount ?? null,
    rowCount: summary.rowCount ?? null,
    cellCount: summary.cellCount ?? null,
    outputFileName: summary.filename || null,
    outputSizeBytes: summary.sizeBytes || 0,
    originalAvailable: originalAvailable(job),
    outputAvailable: outputAvailable(job),
    verification: verification
      ? { verified: Boolean(verification.verified), coveragePct: verification.coveragePct ?? 0 }
      : null,
    integrityScore: summary.integrityScore ?? null,
    diagnosticsCount: summary.diagnostics?.length || 0,
    counts: {
      fatal: counts.fatal || 0,
      recoverable: counts.recoverable || 0,
      warnings: counts.warnings || 0,
    },
    error: job.error || null,
    retryOf: job.request?.retryOf || null,
  };
}

function buildStats(entries, ownerId) {
  const total = entries.length;
  const completed = entries.filter((entry) => entry.status === 'completed').length;
  const failed = entries.filter((entry) => entry.status === 'failed').length;
  const active = entries.filter((entry) => ACTIVE_STATUSES.includes(entry.status)).length;
  const verified = entries.filter(
    (entry) => entry.status === 'completed' && entry.verification?.verified,
  ).length;
  const vault = fileVault.statsForOwner(ownerId);

  const weekly = [];
  const now = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    weekly.push({
      date: key,
      count: entries.filter((entry) => String(entry.createdAt).slice(0, 10) === key).length,
    });
  }

  return {
    total,
    completed,
    failed,
    active,
    successRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
    verificationRate: completed > 0 ? Math.round((verified / completed) * 1000) / 10 : 100,
    weekly,
    storage: vault,
  };
}

/**
 * GET /api/jobs
 * Lists the authenticated user's own conversion history, newest first (PRD §7.3).
 */
router.get('/', identifyUser, requireAuth, (req, res) => {
  const entries = jobManager.listJobs(req.userId).map(historyEntry);
  res.status(200).json({
    success: true,
    data: entries,
    stats: buildStats(entries, req.userId),
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
      originalAvailable: originalAvailable(job),
      outputAvailable: outputAvailable(job),
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
  if (job.status !== 'completed' || !job.result || job.outputDeletedAt) {
    return res.status(409).json({
      error: 'OUTPUT_NOT_READY',
      message: 'The converted output is not available for this job.',
    });
  }

  const { payload, outputPath, filename, mimeType } = job.result;
  const safeName = path.basename(filename || 'converted-output');

  if (outputPath) {
    if (!fileVault.has(outputPath) && !fs.existsSync(outputPath)) {
      return res.status(410).json({
        error: 'OUTPUT_DELETED',
        message: 'The converted output has been deleted from storage.',
      });
    }
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
 * GET /api/jobs/original/:jobId
 * Streams the stored original upload back to its owner (PRD §7.4).
 */
router.get('/original/:jobId', identifyUser, requireJobOwnership, (req, res) => {
  const job = jobManager.getJob(req.params.jobId);

  if (!job || !job.tempFilePath) {
    return res.status(404).json({ error: 'ORIGINAL_NOT_FOUND', message: 'The original file is not stored for this entry.' });
  }
  if (job.originalDeletedAt || !fileVault.has(job.tempFilePath) || !fs.existsSync(job.tempFilePath)) {
    return res.status(410).json({
      error: 'ORIGINAL_DELETED',
      message: 'The original file has been deleted from storage.',
    });
  }

  return res.download(job.tempFilePath, path.basename(job.originalFileName), (error) => {
    if (error && !res.headersSent) {
      res.status(500).json({ error: 'DOWNLOAD_FAILED', message: 'Could not stream the original file.' });
    }
  });
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

  if (!ACTIVE_STATUSES.includes(job.status)) {
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

/**
 * DELETE /api/jobs/:jobId/original
 * Permanently deletes only the stored original file (PRD §7.4).
 */
router.delete('/:jobId/original', identifyUser, requireAuth, requireJobOwnership, async (req, res) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'The conversion entry no longer exists.' });
  }

  if (job.tempFilePath) {
    if (fileVault.has(job.tempFilePath)) {
      const result = await fileVault.remove(job.tempFilePath);
      if (!result.removed && result.reason === 'PURGE_FAILED') {
        return res.status(500).json({
          error: 'PURGE_FAILED',
          message: 'The original file could not be deleted. Please retry.',
        });
      }
    } else {
      await purgeTempFile(job.tempFilePath);
    }
    jobManager.markSourceDeleted(job.tempFilePath);
  }

  res.status(200).json({ success: true, originalAvailable: false });
});

/**
 * DELETE /api/jobs/:jobId/output
 * Permanently deletes only the converted output (PRD §7.4).
 */
router.delete('/:jobId/output', identifyUser, requireAuth, requireJobOwnership, async (req, res) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'The conversion entry no longer exists.' });
  }
  if (!outputAvailable(job)) {
    return res.status(409).json({
      error: 'OUTPUT_UNAVAILABLE',
      message: 'There is no stored converted output for this entry.',
    });
  }

  if (job.result?.outputPath) {
    const result = await fileVault.remove(job.result.outputPath);
    if (!result.removed && result.reason === 'PURGE_FAILED') {
      return res.status(500).json({
        error: 'PURGE_FAILED',
        message: 'The converted output could not be deleted. Please retry.',
      });
    }
  } else {
    await fileVault.remove(`memory:${job.id}`);
  }

  jobManager.markOutputDeleted(job.id);
  res.status(200).json({ success: true, outputAvailable: false });
});

/**
 * DELETE /api/jobs
 * Clears the user's conversion history records. Stored files stay in the vault (PRD §7.3).
 */
router.delete('/', identifyUser, requireAuth, (req, res) => {
  const removed = jobManager.removeInactiveJobs(req.userId);
  res.status(200).json({
    success: true,
    removedCount: removed.length,
    message: 'History records cleared. Stored files remain in your vault.',
  });
});

/**
 * DELETE /api/jobs/:jobId
 * Deletes one history record. Stored files stay in the vault (PRD §7.3).
 */
router.delete('/:jobId', identifyUser, requireAuth, requireJobOwnership, (req, res) => {
  const job = jobManager.getJob(req.params.jobId);

  if (ACTIVE_STATUSES.includes(job.status)) {
    return res.status(409).json({
      error: 'JOB_ACTIVE',
      message: 'Cancel the conversion before deleting this entry.',
    });
  }

  jobManager.removeJob(job.id);
  res.status(200).json({
    success: true,
    deletedId: job.id,
    message: 'History entry deleted. Stored files remain in your vault.',
  });
});

export default router;