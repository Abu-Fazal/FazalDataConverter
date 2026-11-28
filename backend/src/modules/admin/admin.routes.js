import express from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middlewares/rbac.js';
import { sendCsv } from '../../utils/csv.js';
import {
  SECURITY_EVENT_TYPES,
  buildConversionsCsv,
  buildSecurityCsv,
  buildUsersCsv,
  deleteUser,
  getConfig,
  getConversionDetail,
  getConversionStats,
  getDashboard,
  getFailureReport,
  getSecurityLogs,
  getUserDetail,
  getSystemStatus,
  listConversions,
  listUsers,
  reactivateUser,
  recordExport,
  resetConfig,
  saveConfig,
  setMaintenanceMode,
  suspendUser,
} from './admin.service.js';

const router = express.Router();

// Sole Admin console — every route below is admin-only (PRD §3.5).
router.use(requireAdmin);

function auditContext(req) {
  return {
    actorEmail: req.session?.user?.email || null,
    sourceIp: req.ip || req.socket?.remoteAddress || 'unknown',
  };
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

const userIdSchema = z.string().trim().min(3).max(64);

const userFiltersSchema = z.object({
  query: z.string().trim().max(120).optional().default(''),
  status: z.enum(['all', 'active', 'suspended', 'deleted']).optional().default('all'),
  activity: z.enum(['all', 'active', 'idle']).optional().default('all'),
  joined: z.enum(['all', '30d', 'quarter', 'ytd']).optional().default('all'),
  sort: z.enum(['newest', 'oldest', 'name', 'conversions', 'storage']).optional().default('newest'),
});

const conversionFiltersSchema = z.object({
  query: z.string().trim().max(120).optional().default(''),
  status: z
    .enum(['all', 'active', 'pending', 'processing', 'completed', 'failed', 'cancelled'])
    .optional()
    .default('all'),
  direction: z.enum(['all', 'excel-json', 'json-excel', 'excel-bson', 'js-extract']).optional().default('all'),
  range: z.enum(['all', '24h', '7d', '30d']).optional().default('all'),
});

const failureFiltersSchema = z.object({
  query: z.string().trim().max(120).optional().default(''),
  category: z
    .enum(['all', 'Timeout', 'Invalid Format', 'Invalid Data', 'Resource Limit', 'Processing Error', 'Unknown'])
    .optional()
    .default('all'),
  range: z.enum(['all', '24h', '7d', '30d']).optional().default('all'),
});

const securityFiltersSchema = z.object({
  eventType: z
    .enum(SECURITY_EVENT_TYPES.map((event) => event.id))
    .optional()
    .default('all'),
  range: z.enum(['all', '24h', '7d', '30d', '1y']).optional().default('all'),
  ip: z.string().trim().max(64).optional().default(''),
});

const configSchema = z
  .object({
    maxFileSizeMb: z.number().int().min(5).max(50),
    smallFileSlaSeconds: z.number().int().min(1).max(300),
    largeFileSlaSeconds: z.number().int().min(5).max(900),
    memoryLimitMb: z.number().int().min(32).max(4096),
    maxNestingDepth: z.number().int().min(1).max(64),
    quarantineHours: z.number().int().min(1).max(720),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().trim().min(1).max(500),
  })
  .strict();

function invalid(res, details) {
  return res.status(400).json({
    error: 'INVALID_REQUEST',
    message: 'The request payload is invalid.',
    details: details ?? undefined,
  });
}

/**
 * GET /api/admin/dashboard
 * Aggregated overview metrics, direction split, and recent activity (PRD §8.1).
 */
router.get('/dashboard', (req, res) => {
  res.status(200).json({ success: true, data: getDashboard() });
});

/**
 * GET /api/admin/metrics
 * Backward-compatible flat metrics summary used by earlier shells.
 */
router.get('/metrics', (req, res) => {
  const dashboard = getDashboard();
  res.status(200).json({
    success: true,
    data: {
      ...dashboard.metrics,
      systemStatus: dashboard.system.status,
      maintenanceMode: dashboard.system.maintenanceMode,
      storageUsedMb: Math.round((dashboard.metrics.storageUsedBytes / (1024 * 1024)) * 10) / 10,
    },
  });
});

/**
 * GET /api/admin/users
 * Registered user directory with search, status/activity/joined filters (PRD §8.2).
 */
router.get('/users', (req, res) => {
  const parsed = userFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const users = listUsers(parsed.data);
  res.status(200).json({
    success: true,
    data: users,
    total: users.length,
    filters: parsed.data,
  });
});

/**
 * GET /api/admin/users/export
 * CSV report of the filtered user directory (metadata only, PRD §8.4).
 */
router.get('/users/export', (req, res) => {
  const parsed = userFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const users = listUsers(parsed.data);
  const { headers, data } = buildUsersCsv(users);
  recordExport('USER_EXPORTED', { count: users.length, filters: parsed.data }, auditContext(req));
  sendCsv(res, `fazal-users-${dateStamp()}.csv`, headers, data);
});

/**
 * GET /api/admin/users/:userId
 * Metadata detail for one user — never file contents (PRD §8.2).
 */
router.get('/users/:userId', (req, res) => {
  const detail = getUserDetail(req.params.userId);
  if (!detail) {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'No user matches this identifier.' });
  }
  res.status(200).json({ success: true, data: detail });
});

/**
 * POST /api/admin/users/:userId/suspend
 * Suspends a registered user; their session is rejected on the next request.
 */
router.post('/users/:userId/suspend', (req, res) => {
  const parsed = z
    .object({ reason: z.string().trim().max(280).optional() })
    .safeParse(req.body ?? {});
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const result = suspendUser(req.params.userId, {
    reason: parsed.data.reason,
    ...auditContext(req),
  });
  if (result.error === 'USER_NOT_FOUND') {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'No user matches this identifier.' });
  }
  if (result.error === 'USER_DELETED') {
    return res.status(409).json({ error: 'USER_DELETED', message: 'Deleted accounts cannot be suspended.' });
  }

  res.status(200).json({
    success: true,
    user: result.user,
    changed: result.changed,
    message: result.changed ? 'User account suspended.' : 'User was already suspended.',
  });
});

/**
 * POST /api/admin/users/:userId/reactivate
 */
router.post('/users/:userId/reactivate', (req, res) => {
  const result = reactivateUser(req.params.userId, auditContext(req));
  if (result.error === 'USER_NOT_FOUND') {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'No user matches this identifier.' });
  }
  if (result.error === 'USER_DELETED') {
    return res.status(409).json({ error: 'USER_DELETED', message: 'Deleted accounts cannot be reactivated.' });
  }

  res.status(200).json({
    success: true,
    user: result.user,
    changed: result.changed,
    message: result.changed ? 'User account reactivated.' : 'User was already active.',
  });
});

/**
 * DELETE /api/admin/users/:userId
 * Permanently removes the account and stored data after explicit confirmation (PRD §8.2).
 */
router.delete('/users/:userId', async (req, res) => {
  const parsed = z.object({ confirmation: z.string().trim().max(32) }).safeParse(req.body ?? {});
  if (!parsed.success || parsed.data.confirmation !== 'DELETE') {
    return res.status(400).json({
      error: 'CONFIRMATION_MISMATCH',
      message: 'Type DELETE to confirm permanent account removal.',
    });
  }

  const result = await deleteUser(req.params.userId, auditContext(req));
  if (result.error === 'USER_NOT_FOUND') {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'No user matches this identifier.' });
  }
  if (result.error === 'USER_DELETED') {
    return res.status(409).json({ error: 'USER_DELETED', message: 'This account is already deleted.' });
  }
  if (result.error === 'DELETION_FAILED') {
    return res.status(500).json({ error: 'DELETION_FAILED', message: 'Account deletion could not be completed. Please retry.' });
  }

  res.status(200).json({
    success: true,
    removedJobs: result.removedJobs,
    purgedFiles: result.purgedFiles,
    user: result.user,
    message: 'User account and stored data permanently deleted.',
  });
});

/**
 * GET /api/admin/conversions
 * All conversion jobs with owner metadata, filters, and status (PRD §8.3).
 */
router.get('/conversions', (req, res) => {
  const parsed = conversionFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const jobs = listConversions(parsed.data);
  res.status(200).json({
    success: true,
    data: jobs,
    stats: getConversionStats(),
    total: jobs.length,
    filters: parsed.data,
  });
});

/**
 * GET /api/admin/conversions/export
 */
router.get('/conversions/export', (req, res) => {
  const parsed = conversionFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const jobs = listConversions(parsed.data);
  const { headers, data } = buildConversionsCsv(jobs);
  recordExport('JOBS_EXPORTED', { count: jobs.length, filters: parsed.data }, auditContext(req));
  sendCsv(res, `fazal-conversions-${dateStamp()}.csv`, headers, data);
});

/**
 * GET /api/admin/conversions/:jobId
 * Full metadata + validation diagnostics for one job.
 */
router.get('/conversions/:jobId', (req, res) => {
  const detail = getConversionDetail(req.params.jobId);
  if (!detail) {
    return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'No conversion job matches this identifier.' });
  }
  res.status(200).json({ success: true, data: detail });
});

/**
 * GET /api/admin/failures
 * Failure log with category breakdown and diagnostics (PRD §8.3).
 */
router.get('/failures', (req, res) => {
  const parsed = failureFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const report = getFailureReport(parsed.data);
  res.status(200).json({
    success: true,
    data: report.jobs,
    stats: report.stats,
    categories: report.categories,
    total: report.jobs.length,
    filters: parsed.data,
  });
});

/**
 * GET /api/admin/logs/security
 * Read-only immutable security ledger, 1-year retention (PRD §3.8).
 */
router.get('/logs/security', (req, res) => {
  const parsed = securityFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const report = getSecurityLogs(parsed.data);
  res.status(200).json({
    success: true,
    data: report.logs,
    summary: report.summary,
    eventTypes: report.eventTypes,
    total: report.logs.length,
    filters: parsed.data,
  });
});

/**
 * GET /api/admin/logs/security/export
 * CSV export of the filtered ledger; the export itself is audited (PRD §3.8).
 */
router.get('/logs/security/export', (req, res) => {
  const parsed = securityFiltersSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const report = getSecurityLogs(parsed.data);
  const { headers, data } = buildSecurityCsv(report.logs);
  recordExport('SECURITY_LOG_EXPORTED', { count: report.logs.length, filters: parsed.data }, auditContext(req));
  sendCsv(res, `fazal-security-logs-${dateStamp()}.csv`, headers, data);
});

/**
 * GET /api/admin/config
 * Current engine configuration with defaults for reset (PRD §3.4).
 */
router.get('/config', (req, res) => {
  res.status(200).json({ success: true, data: getConfig() });
});

/**
 * PUT /api/admin/config
 * Validates and applies the full configuration; maintenance is audited.
 */
router.put('/config', (req, res) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const result = saveConfig(parsed.data, auditContext(req));
  res.status(200).json({
    success: true,
    data: result,
    message: 'System configuration saved.',
  });
});

/**
 * POST /api/admin/config/maintenance
 * Toggles maintenance mode with an explicit consent flag (PRD §3.7).
 */
router.post('/config/maintenance', (req, res) => {
  const parsed = z
    .object({
      enabled: z.boolean(),
      message: z.string().trim().max(500).optional(),
      consent: z.literal(true),
    })
    .safeParse(req.body ?? {});
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const result = setMaintenanceMode(parsed.data, auditContext(req));
  res.status(200).json({
    success: true,
    data: result,
    message: parsed.data.enabled ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.',
  });
});

/**
 * POST /api/admin/config/reset
 * Restores factory defaults; audited as a configuration change.
 */
router.post('/config/reset', (req, res) => {
  const parsed = z.object({ consent: z.literal(true) }).safeParse(req.body ?? {});
  if (!parsed.success) return invalid(res, parsed.error.issues);

  const result = resetConfig(auditContext(req));
  res.status(200).json({
    success: true,
    data: result,
    message: 'Configuration restored to defaults.',
  });
});

/**
 * GET /api/admin/system
 */
router.get('/system', (req, res) => {
  res.status(200).json({ success: true, data: getSystemStatus() });
});

export default router;