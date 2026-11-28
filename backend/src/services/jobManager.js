import { logger } from '../utils/logger.js';
import { purgeTempFile } from '../utils/tempCleaner.js';

/**
 * In-memory / DB-backed Job Manager (TRD §7.15)
 * Handles job progress tracking (0-100%), status polling, and user cancellations.
 */
class JobManager {
  constructor() {
    this.jobs = new Map();
  }

  createJob(jobId, details = {}) {
    const job = {
      id: jobId,
      status: 'pending', // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
      progress: 0,
      stage: 'Initiating',
      originalFileName: details.originalFileName || 'unknown',
      sourceFormat: details.sourceFormat || 'unknown',
      targetFormat: details.targetFormat || 'unknown',
      fileSizeBytes: details.fileSizeBytes || 0,
      tempFilePath: details.tempFilePath || null,
      userId: details.userId ?? null,
      request: details.request || null,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);
    logger.info('Async conversion job created', { jobId, userId: job.userId || 'guest' });
    return job;
  }

  /**
   * Returns the owner userId of a job (null for guest jobs).
   */
  getJobOwnerId(jobId) {
    const job = this.jobs.get(jobId);
    return job ? (job.userId ?? null) : null;
  }

  updateProgress(jobId, progress, stage) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'cancelled') return;

    job.status = progress >= 100 ? 'completed' : 'processing';
    job.progress = Math.min(100, Math.max(0, progress));
    if (stage) job.stage = stage;
    job.updatedAt = new Date().toISOString();
  }

  completeJob(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'cancelled') return;

    job.status = 'completed';
    job.progress = 100;
    job.stage = 'Completed';
    job.result = result;
    job.updatedAt = new Date().toISOString();
    logger.info('Async job marked complete', { jobId });
  }

  failJob(jobId, errorMessage, result = null) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = errorMessage;
    job.stage = 'Failed';
    if (result !== null) job.result = result;
    job.updatedAt = new Date().toISOString();
    logger.error('Async job failed', { jobId, error: errorMessage });
  }

  async cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = 'cancelled';
    job.stage = 'Cancelled by user';
    job.updatedAt = new Date().toISOString();

    if (job.tempFilePath) {
      await purgeTempFile(job.tempFilePath);
    }

    logger.info('Async job cancelled by user', { jobId });
    return job;
  }

  /**
   * Releases a guest job's converted output after it has been downloaded
   * (PRD §9.3: guest temporary files are removed after conversion).
   */
  async consumeOutput(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || !job.result || job.userId != null) return;

    if (job.result.outputPath) {
      await purgeTempFile(job.result.outputPath);
    }

    if (job.tempFilePath && !this.hasActiveJobForSource(job.tempFilePath)) {
      await purgeTempFile(job.tempFilePath);
    }

    job.result.payload = null;
    job.result.downloadedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  removeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    this.jobs.delete(jobId);
    return job;
  }

  removeInactiveJobs(ownerId) {
    const removed = [];
    for (const [jobId, job] of this.jobs) {
      const owned = ownerId == null
        ? job.userId == null
        : String(job.userId) === String(ownerId);
      const inactive = ['completed', 'failed', 'cancelled'].includes(job.status);
      if (owned && inactive) {
        removed.push(job);
        this.jobs.delete(jobId);
      }
    }
    return removed;
  }

  markSourceDeleted(filePath) {
    if (!filePath) return;
    const deletedAt = new Date().toISOString();
    for (const job of this.jobs.values()) {
      if (job.tempFilePath === filePath) job.originalDeletedAt = deletedAt;
    }
  }

  markOutputDeleted(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.outputDeletedAt = new Date().toISOString();
    if (job.result) {
      job.result.payload = null;
    }
    return job;
  }

  listJobs(ownerId) {
    return [...this.jobs.values()]
      .filter((job) =>
        ownerId == null ? job.userId == null : String(job.userId) === String(ownerId),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  hasActiveJobForSource(filePath) {
    return [...this.jobs.values()].some(
      (job) => job.tempFilePath === filePath && ['pending', 'processing'].includes(job.status),
    );
  }
}

export const jobManager = new JobManager();
