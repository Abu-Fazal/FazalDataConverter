import mongoose from 'mongoose';
import { adminStore, DEFAULT_SETTINGS } from '../../services/adminStore.js';
import { jobManager } from '../../services/jobManager.js';
import { fileVault } from '../../services/fileVault.js';
import { User } from '../../models/User.js';
import { ConversionJob } from '../../models/ConversionJob.js';
import { logger } from '../../utils/logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;
const ACTIVE_STATUSES = ['pending', 'processing'];

const DIRECTION_LABELS = {
  'excel-json': 'Excel → JSON',
  'json-excel': 'JSON → Excel',
  'excel-bson': 'Excel → BSON',
  'js-extract': 'JavaScript → JSON',
};

export const SECURITY_EVENT_TYPES = [
  { id: 'all', label: 'All Events' },
  { id: 'ADMIN_LOGIN_SUCCESS', label: 'Admin Login Success' },
  { id: 'ADMIN_LOGIN_FAILED', label: 'Admin Login Failed' },
  { id: 'ADMIN_LOGIN_BLOCKED', label: 'Blocked Login Attempt' },
  { id: 'ADMIN_LOCKOUT', label: 'Account Lockout' },
  { id: 'ADMIN_RECOVERY_REQUESTED', label: 'Password Recovery Requested' },
  { id: 'USER_SUSPENDED', label: 'User Suspended' },
  { id: 'USER_REACTIVATED', label: 'User Reactivated' },
  { id: 'USER_DELETED', label: 'User Deleted' },
  { id: 'USER_EXPORTED', label: 'User Report Exported' },
  { id: 'JOBS_EXPORTED', label: 'Conversion Report Exported' },
  { id: 'SECURITY_LOG_EXPORTED', label: 'Security Log Exported' },
  { id: 'CONFIG_UPDATED', label: 'Configuration Updated' },
  { id: 'MAINTENANCE_TOGGLED', label: 'Maintenance Toggled' },
];

function rangeCutoff(range) {
  const map = { '24h': DAY_MS, '7d': 7 * DAY_MS, '30d': 30 * DAY_MS };
  return range && map[range] ? Date.now() - map[range] : 0;
}

function directionLabel(job) {
  return (
    DIRECTION_LABELS[job.request?.direction] ||
    `${String(job.sourceFormat || '?').toUpperCase()} → ${String(job.targetFormat || '?').toUpperCase()}`
  );
}

function errorCategory(job) {
  const diagnosticText = (job.result?.diagnostics || [])
    .map((entry) => entry.message || entry.code || '')
    .join(' ');
  const text = `${job.error || ''} ${diagnosticText}`.toLowerCase();
  if (!text.trim()) return 'Unknown';
  if (/timeout|timed out|took too long/.test(text)) return 'Timeout';
  if (/memory|heap|quota|limit exceeded|too large/.test(text)) return 'Resource Limit';
  if (/unsupported|not supported|invalid file structure|header verification|signature|macro/.test(text)) {
    return 'Invalid Format';
  }
  if (/json|parse|malformed|unexpected token|syntax/.test(text)) return 'Invalid Data';
  return 'Processing Error';
}

function ownerFor(job) {
  if (job.userId == null) {
    return { publicId: null, name: 'Guest session', email: null, role: 'guest' };
  }
  const user = adminStore.findByInternalId(job.userId);
  if (!user) {
    return {
      publicId: null,
      name: 'Registered user',
      email: null,
      role: 'registered',
    };
  }
  return { publicId: user.publicId, name: user.name, email: user.email, role: user.role };
}

function outputAvailable(job) {
  if (job.outputDeletedAt || !job.result) return false;
  if (job.result.outputPath) return fileVault.has(job.result.outputPath);
  return job.result.payload != null;
}

function originalAvailable(job) {
  if (job.originalDeletedAt || !job.tempFilePath) return false;
  return fileVault.has(job.tempFilePath);
}

export function jobSummary(job) {
  return {
    id: job.id,
    fileName: job.originalFileName,
    sizeBytes: job.fileSizeBytes,
    sourceFormat: job.sourceFormat,
    targetFormat: job.targetFormat,
    direction: job.request?.direction || null,
    directionLabel: directionLabel(job),
    mode: job.request?.mode || 'normal',
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    error: job.error || null,
    errorCategory: job.status === 'failed' ? errorCategory(job) : null,
    owner: ownerFor(job),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    durationMs: job.result?.durationMs || 0,
    outputAvailable: outputAvailable(job),
    originalAvailable: originalAvailable(job),
    diagnosticsCount: job.result?.diagnostics?.length || 0,
    integrityScore: job.result?.integrityScore ?? null,
    retryable: job.status === 'failed' && originalAvailable(job),
  };
}

function weeklyCounts(jobs) {
  const now = new Date();
  const weeks = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    weeks.push({
      date: key,
      count: jobs.filter((job) => String(job.createdAt).slice(0, 10) === key).length,
    });
  }
  return weeks;
}

export function getSystemStatus() {
  const settings = adminStore.getSettings();
  const memory = process.memoryUsage();
  const usedMb = Math.round(memory.rss / MB);
  const activeJobs = jobManager.listAllJobs().filter((job) => ACTIVE_STATUSES.includes(job.status)).length;
  const storage = fileVault.totalStats();

  return {
    status: settings.maintenanceMode ? 'maintenance' : 'operational',
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    uptimeSeconds: Math.round(process.uptime()),
    bootTime: adminStore.bootTime(),
    nodeVersion: process.version,
    memory: {
      usedMb,
      limitMb: settings.memoryLimitMb,
      percent: Math.min(100, Math.round((usedMb / Math.max(1, settings.memoryLimitMb)) * 100)),
    },
    activeJobs,
    storage: {
      usedBytes: storage.usedBytes,
      objectCount: storage.objectCount,
      ownerCount: storage.ownerCount,
      quotaBytes: storage.quotaBytes,
    },
    maxFileSizeMb: settings.maxFileSizeMb,
    lastConfigMutation: adminStore.getLastConfigMutation(),
    serverTime: new Date().toISOString(),
  };
}

export function getDashboard() {
  const jobs = jobManager.listAllJobs();
  const users = adminStore.listUsers();
  const settings = adminStore.getSettings();

  const completed = jobs.filter((job) => job.status === 'completed');
  const failed = jobs.filter((job) => job.status === 'failed');
  const activeJobs = jobs.filter((job) => ACTIVE_STATUSES.includes(job.status));
  const verified = completed.filter((job) => job.result?.verification?.verified);

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

  const directionSplit = Object.keys(DIRECTION_LABELS).map((direction) => {
    const count = jobs.filter((job) => job.request?.direction === direction).length;
    return {
      direction,
      label: DIRECTION_LABELS[direction],
      count,
      share: jobs.length > 0 ? Math.round((count / jobs.length) * 1000) / 10 : 0,
    };
  });

  const system = getSystemStatus();
  const deletedUsers = users.filter((user) => user.status === 'deleted');

  return {
    metrics: {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === 'active').length,
      suspendedUsers: users.filter((user) => user.status === 'suspended').length,
      deletedUsers: deletedUsers.length,
      deletedLast30d: deletedUsers.filter(
        (user) => user.deletedAt && Date.now() - new Date(user.deletedAt).getTime() <= 30 * DAY_MS,
      ).length,
      totalConversions: jobs.length,
      completedConversions: completed.length,
      failedConversions: failed.length,
      activeJobs: activeJobs.length,
      successRate: jobs.length > 0 ? Math.round((completed.length / jobs.length) * 1000) / 10 : 0,
      verificationRate:
        completed.length > 0 ? Math.round((verified.length / completed.length) * 1000) / 10 : 100,
      todayConversions: jobs.filter((job) => String(job.createdAt).slice(0, 10) === todayKey).length,
      yesterdayConversions: jobs.filter((job) => String(job.createdAt).slice(0, 10) === yesterday).length,
      storageUsedBytes: system.storage.usedBytes,
    },
    directionSplit,
    weekly: weeklyCounts(jobs),
    recentConversions: jobs.slice(0, 6).map(jobSummary),
    recentFailures: failed.slice(0, 5).map(jobSummary),
    system: {
      ...system,
      settings: {
        maxFileSizeMb: settings.maxFileSizeMb,
        smallFileSlaSeconds: settings.smallFileSlaSeconds,
        largeFileSlaSeconds: settings.largeFileSlaSeconds,
        maxNestingDepth: settings.maxNestingDepth,
        quarantineHours: settings.quarantineHours,
      },
    },
  };
}

// ----------------------------------------------------------------- Users
function buildUserRow(user) {
  const internalId = adminStore.resolveInternalId(user.publicId);
  const jobs = internalId == null ? [] : jobManager.listJobs(internalId);
  const storage = internalId == null ? null : fileVault.statsForOwner(internalId);
  const lastJobAt = jobs[0]?.createdAt || null;
  const recentlyActive = lastJobAt && Date.now() - new Date(lastJobAt).getTime() <= 30 * DAY_MS;

  return {
    ...user,
    conversions: {
      total: jobs.length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
      active: jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).length,
    },
    storageBytes: storage?.usedBytes || 0,
    objectCount: storage?.objectCount || 0,
    originalCount: storage?.originalCount || 0,
    outputCount: storage?.outputCount || 0,
    quotaBytes: storage?.quotaBytes || 0,
    lastActiveAt: lastJobAt || user.lastLoginAt,
    activity: recentlyActive ? 'active' : 'idle',
  };
}

export function listUsers({
  query = '',
  status = 'all',
  activity = 'all',
  joined = 'all',
  sort = 'newest',
} = {}) {
  let rows = adminStore.listUsers({ query, status, joined }).map(buildUserRow);

  if (activity !== 'all') {
    rows = rows.filter((row) => row.activity === activity);
  }

  const sorters = {
    newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
    oldest: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
    name: (a, b) => a.name.localeCompare(b.name),
    conversions: (a, b) => b.conversions.total - a.conversions.total,
    storage: (a, b) => b.storageBytes - a.storageBytes,
  };
  rows.sort(sorters[sort] || sorters.newest);

  return rows;
}

export function getUserDetail(publicId) {
  const user = adminStore.getUser(publicId);
  if (!user) return null;

  const internalId = adminStore.resolveInternalId(publicId);
  const jobs = internalId == null ? [] : jobManager.listJobs(internalId);
  const storage = internalId == null ? null : fileVault.statsForOwner(internalId);
  const row = buildUserRow(user);

  return {
    user: row,
    storage: storage || {
      originalCount: 0,
      outputCount: 0,
      objectCount: 0,
      originalBytes: 0,
      outputBytes: 0,
      usedBytes: 0,
      quotaBytes: 0,
    },
    recentConversions: jobs.slice(0, 10).map(jobSummary),
    totals: {
      ...row.conversions,
      lastActiveAt: row.lastActiveAt,
    },
  };
}

function logActor(context) {
  return {
    actorEmail: context?.actorEmail || null,
    sourceIp: context?.sourceIp || 'unknown',
  };
}

export function suspendUser(publicId, { reason, ...context } = {}) {
  const existing = adminStore.getUser(publicId);
  if (!existing) return { error: 'USER_NOT_FOUND' };
  if (existing.status === 'deleted') return { error: 'USER_DELETED' };
  if (existing.status === 'suspended') return { user: existing, changed: false };

  const updated = adminStore.setUserStatus(publicId, 'suspended', {
    reason: reason || 'Administrative action',
  });
  adminStore.recordSecurityEvent({
    eventType: 'USER_SUSPENDED',
    ...logActor(context),
    outcome: 'Executed & Logged',
    metadata: { userId: publicId, email: existing.email, reason: updated.suspendedReason },
  });
  logger.info('Admin suspended user', { publicId });
  return { user: buildUserRow(updated), changed: true };
}

export function reactivateUser(publicId, context = {}) {
  const existing = adminStore.getUser(publicId);
  if (!existing) return { error: 'USER_NOT_FOUND' };
  if (existing.status === 'deleted') return { error: 'USER_DELETED' };
  if (existing.status === 'active') return { user: buildUserRow(existing), changed: false };

  const updated = adminStore.setUserStatus(publicId, 'active');
  adminStore.recordSecurityEvent({
    eventType: 'USER_REACTIVATED',
    ...logActor(context),
    outcome: 'Executed & Logged',
    metadata: { userId: publicId, email: existing.email },
  });
  logger.info('Admin reactivated user', { publicId });
  return { user: buildUserRow(updated), changed: true };
}

export async function deleteUser(publicId, context = {}) {
  const existing = adminStore.getUser(publicId);
  if (!existing) return { error: 'USER_NOT_FOUND' };
  if (existing.status === 'deleted') return { error: 'USER_DELETED' };

  const internalId = adminStore.resolveInternalId(publicId);
  const jobs = internalId == null ? [] : jobManager.listJobs(internalId);

  for (const job of jobs.filter((entry) => ACTIVE_STATUSES.includes(entry.status))) {
    await jobManager.cancelJob(job.id);
  }
  const removedCount = internalId == null ? 0 : jobManager.removeInactiveJobs(internalId).length;
  const purgedFiles = internalId == null ? 0 : await fileVault.purgeOwner(internalId);

  if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(internalId)) {
    try {
      await ConversionJob.deleteMany({ userId: internalId });
      await User.deleteOne({ _id: internalId });
    } catch (error) {
      logger.error('Admin user deletion failed in database', { publicId, error: error.message });
      return { error: 'DELETION_FAILED' };
    }
  }

  adminStore.setUserStatus(publicId, 'deleted');
  adminStore.recordSecurityEvent({
    eventType: 'USER_DELETED',
    ...logActor(context),
    outcome: 'Executed & Logged',
    metadata: {
      userId: publicId,
      email: existing.email,
      removedJobs: removedCount,
      purgedFiles,
    },
  });
  logger.info('Admin deleted user account data', { publicId, removedCount, purgedFiles });

  return {
    changed: true,
    removedJobs: removedCount,
    purgedFiles,
    user: adminStore.getUser(publicId),
  };
}

// ----------------------------------------------------------- Conversions
export function getConversionStats() {
  const jobs = jobManager.listAllJobs();
  const settings = adminStore.getSettings();
  const completed = jobs.filter((job) => job.status === 'completed');
  const failed = jobs.filter((job) => job.status === 'failed');
  const active = jobs.filter((job) => ACTIVE_STATUSES.includes(job.status));

  const slaEligible = completed.filter((job) => job.result?.durationMs);
  const slaMet = slaEligible.filter((job) => {
    const targetSeconds =
      job.fileSizeBytes <= 10 * MB ? settings.smallFileSlaSeconds : settings.largeFileSlaSeconds;
    return job.result.durationMs <= targetSeconds * 1000;
  });

  return {
    total: jobs.length,
    completed: completed.length,
    failed: failed.length,
    active: active.length,
    cancelled: jobs.filter((job) => job.status === 'cancelled').length,
    successRate: jobs.length > 0 ? Math.round((completed.length / jobs.length) * 1000) / 10 : 0,
    slaCompliance:
      slaEligible.length > 0 ? Math.round((slaMet.length / slaEligible.length) * 1000) / 10 : 100,
    slaMet: slaMet.length,
    avgDurationMs:
      slaEligible.length > 0
        ? Math.round(
            slaEligible.reduce((sum, job) => sum + job.result.durationMs, 0) / slaEligible.length,
          )
        : 0,
    targets: {
      smallFileSlaSeconds: settings.smallFileSlaSeconds,
      largeFileSlaSeconds: settings.largeFileSlaSeconds,
      maxFileSizeMb: settings.maxFileSizeMb,
    },
  };
}

export function listConversions({
  query = '',
  status = 'all',
  direction = 'all',
  range = 'all',
} = {}) {
  const needle = String(query || '').trim().toLowerCase();
  const cutoff = rangeCutoff(range);

  return jobManager
    .listAllJobs()
    .filter((job) => {
      if (status === 'active' && !ACTIVE_STATUSES.includes(job.status)) return false;
      if (status !== 'all' && status !== 'active' && job.status !== status) return false;
      if (direction !== 'all' && job.request?.direction !== direction) return false;
      if (cutoff && new Date(job.createdAt).getTime() < cutoff) return false;
      if (needle) {
        const owner = ownerFor(job);
        const haystack = `${job.id} ${job.originalFileName} ${owner.name} ${owner.email || ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .map(jobSummary);
}

export function getFailureReport({ query = '', category = 'all', range = 'all' } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  const cutoff = rangeCutoff(range);

  const failed = jobManager
    .listAllJobs()
    .filter((job) => job.status === 'failed')
    .filter((job) => {
      if (cutoff && new Date(job.createdAt).getTime() < cutoff) return false;
      if (category !== 'all' && errorCategory(job) !== category) return false;
      if (needle) {
        const owner = ownerFor(job);
        const haystack = `${job.id} ${job.originalFileName} ${owner.name} ${owner.email || ''} ${job.error || ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

  const categoryCounts = {};
  for (const job of jobManager.listAllJobs().filter((entry) => entry.status === 'failed')) {
    const label = errorCategory(job);
    categoryCounts[label] = (categoryCounts[label] || 0) + 1;
  }

  const now = Date.now();
  const allFailed = jobManager.listAllJobs().filter((job) => job.status === 'failed');

  return {
    stats: {
      totalFailed: allFailed.length,
      failed24h: allFailed.filter((job) => now - new Date(job.createdAt).getTime() <= DAY_MS).length,
      failed7d: allFailed.filter((job) => now - new Date(job.createdAt).getTime() <= 7 * DAY_MS).length,
      retryable: allFailed.filter((job) => originalAvailable(job)).length,
      topCategory:
        Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
    },
    categories: Object.entries(categoryCounts).map(([label, count]) => ({ label, count })),
    jobs: failed.map((job) => ({
      ...jobSummary(job),
      errorDetail: job.error,
      diagnostics: (job.result?.diagnostics || []).slice(0, 20),
    })),
  };
}

export function getConversionDetail(jobId) {
  const job = jobManager.getJob(jobId);
  if (!job) return null;

  return {
    ...jobSummary(job),
    request: {
      direction: job.request?.direction || null,
      mode: job.request?.mode || 'normal',
      sheets: job.request?.sheets || null,
      overrideCount: job.request?.overrides?.length || 0,
      retryOf: job.request?.retryOf || null,
      consent: job.request?.consent
        ? { version: job.request.consent.version, acceptedAt: job.request.consent.acceptedAt }
        : null,
    },
    diagnostics: (job.result?.diagnostics || []).slice(0, 50),
    counts: job.result?.counts || { fatal: 0, recoverable: 0, warnings: 0 },
    verification: job.result?.verification || null,
    integrityScore: job.result?.integrityScore ?? null,
    output: job.result
      ? {
          fileName: job.result.filename || null,
          sizeBytes: job.result.sizeBytes || 0,
          available: outputAvailable(job),
        }
      : null,
  };
}

// --------------------------------------------------------------- Security
export function getSecurityLogs(filters = {}) {
  return {
    summary: adminStore.securitySummary(),
    logs: adminStore.listSecurityLogs(filters),
    eventTypes: SECURITY_EVENT_TYPES,
  };
}

// ----------------------------------------------------------------- Config
export function getConfig() {
  return {
    settings: adminStore.getSettings(),
    defaults: { ...DEFAULT_SETTINGS },
    system: getSystemStatus(),
  };
}

export function saveConfig(patch, context = {}) {
  const settings = adminStore.updateSettings(patch, {
    actorEmail: context.actorEmail || null,
    sourceIp: context.sourceIp || 'unknown',
  });
  return { settings, system: getSystemStatus() };
}

export function resetConfig(context = {}) {
  return saveConfig({ ...DEFAULT_SETTINGS }, context);
}

export function setMaintenanceMode({ enabled, message }, context = {}) {
  const patch = { maintenanceMode: Boolean(enabled) };
  if (typeof message === 'string' && message.trim()) {
    patch.maintenanceMessage = message.trim();
  }
  return saveConfig(patch, context);
}

// --------------------------------------------------------------- Reports
export function buildUsersCsv(rows) {
  return {
    headers: [
      'User ID',
      'Name',
      'Email',
      'Status',
      'Role',
      'Joined',
      'Last Active',
      'Conversions',
      'Completed',
      'Failed',
      'Storage (MB)',
      'Quota (MB)',
    ],
    data: rows.map((row) => [
      row.publicId,
      row.name,
      row.email,
      row.status,
      row.role,
      row.joinedAt,
      row.lastActiveAt,
      row.conversions.total,
      row.conversions.completed,
      row.conversions.failed,
      (row.storageBytes / MB).toFixed(2),
      (row.quotaBytes / MB).toFixed(0),
    ]),
  };
}

export function buildConversionsCsv(rows) {
  return {
    headers: [
      'Job ID',
      'File',
      'Source',
      'Target',
      'Direction',
      'Status',
      'Size (MB)',
      'Owner',
      'Owner Email',
      'Created At',
      'Duration (ms)',
      'Error',
    ],
    data: rows.map((row) => [
      row.id,
      row.fileName,
      row.sourceFormat,
      row.targetFormat,
      row.directionLabel,
      row.status,
      (row.sizeBytes / MB).toFixed(2),
      row.owner.name,
      row.owner.email || 'N/A',
      row.createdAt,
      row.durationMs,
      row.error || '',
    ]),
  };
}

export function buildSecurityCsv(logs) {
  return {
    headers: [
      'Event ID',
      'Timestamp',
      'Event Type',
      'Actor',
      'Actor Email',
      'Source IP',
      'Failed Count',
      'Outcome',
      'Details',
    ],
    data: logs.map((log) => [
      log.id,
      log.timestamp,
      log.eventType,
      log.actor,
      log.actorEmail || 'N/A',
      log.sourceIp,
      log.failedCount ?? '',
      log.outcome,
      Object.keys(log.metadata || {}).length > 0 ? JSON.stringify(log.metadata) : '',
    ]),
  };
}

export function recordExport(eventType, metadata, context = {}) {
  adminStore.recordSecurityEvent({
    eventType,
    ...logActor(context),
    outcome: 'Executed & Logged',
    metadata,
  });
}