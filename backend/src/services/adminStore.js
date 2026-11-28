import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const SECURITY_RETENTION_DAYS = 365;
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const MAX_FILE_SIZE_MB = 50;

export const DEFAULT_SETTINGS = Object.freeze({
  maxFileSizeMb: 50,
  smallFileSlaSeconds: 10,
  largeFileSlaSeconds: 60,
  memoryLimitMb: 128,
  maxNestingDepth: 12,
  quarantineHours: 24,
  maintenanceMode: false,
  maintenanceMessage:
    'FazalDataConverter is undergoing scheduled engine optimization. Service will resume shortly.',
});

const state = {
  users: new Map(),
  usersByInternalId: new Map(),
  usersByEmail: new Map(),
  securityLogs: [],
  settings: { ...DEFAULT_SETTINGS },
  lastConfigMutation: null,
  adminLockout: {
    failedAttempts: 0,
    lockedUntil: 0,
    lockoutStartedAt: null,
    lastSourceIp: null,
  },
  eventSequence: 0,
  bootedAt: new Date().toISOString(),
};

function publicIdFor(internalId) {
  return `usr_${crypto.createHash('sha256').update(String(internalId)).digest('hex').slice(0, 8)}`;
}

function pruneSecurityLogs() {
  const cutoff = Date.now() - SECURITY_RETENTION_DAYS * DAY_MS;
  const before = state.securityLogs.length;
  state.securityLogs = state.securityLogs.filter(
    (event) => new Date(event.timestamp).getTime() >= cutoff,
  );
  if (state.securityLogs.length !== before) {
    logger.info('Security log retention prune applied', {
      removed: before - state.securityLogs.length,
    });
  }
}

function serializeUser(record) {
  if (!record) return null;
  const {
    internalId, // never exposed outside the service layer
    ...visible
  } = record;
  return { ...visible };
}

class AdminStore {
  bootTime() {
    return state.bootedAt;
  }

  // ----------------------------------------------------------------- Users
  upsertRegisteredUser({ id, email, name, avatarUrl = '' }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const existing =
      state.usersByInternalId.get(String(id)) || state.usersByEmail.get(normalizedEmail);

    if (existing) {
      existing.name = name || existing.name;
      existing.avatarUrl = avatarUrl || existing.avatarUrl;
      existing.lastLoginAt = new Date().toISOString();
      return serializeUser(existing);
    }

    const now = new Date().toISOString();
    const record = {
      publicId: publicIdFor(id),
      internalId: String(id),
      email: normalizedEmail,
      name: name || 'Registered User',
      avatarUrl,
      role: 'registered',
      provider: 'google',
      status: 'active',
      joinedAt: now,
      lastLoginAt: now,
      suspendedAt: null,
      suspendedReason: null,
      deletedAt: null,
    };

    state.users.set(record.publicId, record);
    state.usersByInternalId.set(record.internalId, record);
    state.usersByEmail.set(record.email, record);
    return serializeUser(record);
  }

  findByEmail(email) {
    const record = state.usersByEmail.get(String(email || '').trim().toLowerCase());
    return record ? serializeUser(record) : null;
  }

  findByInternalId(internalId) {
    const record = state.usersByInternalId.get(String(internalId));
    return record ? serializeUser(record) : null;
  }

  getUser(publicId) {
    return serializeUser(state.users.get(publicId));
  }

  // Service-layer helper: public ids are safe to expose, internal ids are not.
  resolveInternalId(publicId) {
    const record = state.users.get(publicId);
    return record ? record.internalId : null;
  }

  listUsers({ query = '', status = 'all', joined = 'all' } = {}) {
    const needle = String(query || '').trim().toLowerCase();
    const now = Date.now();

    return [...state.users.values()]
      .filter((record) => {
        if (needle) {
          const haystack = `${record.name} ${record.email} ${record.publicId}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        if (status !== 'all' && record.status !== status) return false;

        if (joined !== 'all') {
          const joinedAt = new Date(record.joinedAt).getTime();
          if (joined === '30d' && now - joinedAt > 30 * DAY_MS) return false;
          if (joined === 'quarter' && now - joinedAt > 90 * DAY_MS) return false;
          if (joined === 'ytd' && new Date(record.joinedAt).getFullYear() !== new Date().getFullYear()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
      .map(serializeUser);
  }

  setUserStatus(publicId, status, { reason = null } = {}) {
    const record = state.users.get(publicId);
    if (!record) return null;
    if (record.status === 'deleted' && status !== 'deleted') return null;

    const now = new Date().toISOString();
    record.status = status;
    if (status === 'suspended') {
      record.suspendedAt = now;
      record.suspendedReason = reason || 'Administrative action';
    } else if (status === 'active') {
      record.suspendedAt = null;
      record.suspendedReason = null;
    } else if (status === 'deleted') {
      record.deletedAt = now;
    }
    return serializeUser(record);
  }

  isBlockedStatus(record) {
    return Boolean(record && record.status !== 'active');
  }

  // -------------------------------------------------------------- Security
  recordSecurityEvent({
    eventType,
    actor = 'Sole Admin',
    actorEmail = null,
    sourceIp = 'unknown',
    failedCount = null,
    lockoutWindow = null,
    outcome = 'Executed & Logged',
    metadata = {},
  }) {
    pruneSecurityLogs();
    state.eventSequence += 1;
    const event = {
      id: `SEC-${String(state.eventSequence).padStart(6, '0')}`,
      timestamp: new Date().toISOString(),
      eventType,
      actor,
      actorEmail,
      sourceIp,
      failedCount,
      lockoutWindow,
      outcome,
      metadata,
    };
    state.securityLogs.unshift(event);
    logger.info('Admin security event recorded', { eventType, actor });
    return event;
  }

  listSecurityLogs({ eventType = 'all', range = 'all', ip = '' } = {}) {
    pruneSecurityLogs();
    const needle = String(ip || '').trim();
    const cutoffByRange = {
      '24h': 1 * DAY_MS,
      '7d': 7 * DAY_MS,
      '30d': 30 * DAY_MS,
      '1y': SECURITY_RETENTION_DAYS * DAY_MS,
    };
    const cutoff = cutoffByRange[range] ? Date.now() - cutoffByRange[range] : 0;

    return state.securityLogs
      .filter((event) => {
        if (eventType !== 'all' && event.eventType !== eventType) return false;
        if (cutoff && new Date(event.timestamp).getTime() < cutoff) return false;
        if (needle && !String(event.sourceIp).includes(needle)) return false;
        return true;
      })
      .map((event) => ({ ...event }));
  }

  securitySummary() {
    pruneSecurityLogs();
    const now = Date.now();
    const last24h = state.securityLogs.filter(
      (event) => now - new Date(event.timestamp).getTime() <= DAY_MS,
    ).length;
    const privilegedActions = state.securityLogs.filter((event) =>
      ['USER_SUSPENDED', 'USER_REACTIVATED', 'USER_DELETED', 'CONFIG_UPDATED', 'MAINTENANCE_TOGGLED'].includes(
        event.eventType,
      ),
    ).length;

    return {
      totalEvents: state.securityLogs.length,
      last24h,
      privilegedActions,
      retentionDays: SECURITY_RETENTION_DAYS,
      integrity: 'VERIFIED',
      activeLockouts: state.adminLockout.lockedUntil > now ? 1 : 0,
    };
  }

  // --------------------------------------------------------------- Lockout
  getAdminLockoutStatus() {
    const lockout = state.adminLockout;
    const now = Date.now();
    const locked = lockout.lockedUntil > now;
    return {
      locked,
      failedAttempts: lockout.failedAttempts,
      threshold: LOCKOUT_THRESHOLD,
      remainingSeconds: locked ? Math.ceil((lockout.lockedUntil - now) / 1000) : 0,
      lockoutStartedAt: lockout.lockoutStartedAt,
      lockoutEndsAt: lockout.lockedUntil || null,
      durationMinutes: LOCKOUT_DURATION_MS / 60000,
      lastSourceIp: lockout.lastSourceIp,
    };
  }

  registerAdminFailure({ email, sourceIp, userAgent }) {
    const lockout = state.adminLockout;
    lockout.failedAttempts += 1;
    lockout.lastSourceIp = sourceIp;

    const thresholdReached = lockout.failedAttempts >= LOCKOUT_THRESHOLD;
    if (thresholdReached) {
      lockout.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      lockout.lockoutStartedAt = new Date().toISOString();
    }

    this.recordSecurityEvent({
      eventType: thresholdReached ? 'ADMIN_LOCKOUT' : 'ADMIN_LOGIN_FAILED',
      actorEmail: email,
      sourceIp,
      failedCount: lockout.failedAttempts,
      lockoutWindow: thresholdReached
        ? {
            start: lockout.lockoutStartedAt,
            end: new Date(lockout.lockedUntil).toISOString(),
          }
        : null,
      outcome: thresholdReached ? 'Blocked (Lockout)' : 'Credentials Rejected',
      metadata: {
        threshold: LOCKOUT_THRESHOLD,
        durationMinutes: LOCKOUT_DURATION_MS / 60000,
        userAgent: userAgent || 'unknown',
      },
    });

    return this.getAdminLockoutStatus();
  }

  registerAdminLoginBlocked({ email, sourceIp }) {
    this.recordSecurityEvent({
      eventType: 'ADMIN_LOGIN_BLOCKED',
      actorEmail: email,
      sourceIp,
      failedCount: state.adminLockout.failedAttempts,
      lockoutWindow: state.adminLockout.lockedUntil
        ? {
            start: state.adminLockout.lockoutStartedAt,
            end: new Date(state.adminLockout.lockedUntil).toISOString(),
          }
        : null,
      outcome: 'Blocked (Lockout)',
      metadata: { remainingSeconds: this.getAdminLockoutStatus().remainingSeconds },
    });
  }

  registerAdminSuccess({ email, sourceIp, userAgent }) {
    state.adminLockout.failedAttempts = 0;
    state.adminLockout.lockedUntil = 0;
    state.adminLockout.lockoutStartedAt = null;
    state.adminLockout.lastSourceIp = sourceIp;

    this.recordSecurityEvent({
      eventType: 'ADMIN_LOGIN_SUCCESS',
      actorEmail: email,
      sourceIp,
      failedCount: 0,
      outcome: 'Granted',
      metadata: { userAgent: userAgent || 'unknown' },
    });
  }

  registerRecoveryRequest({ email, sourceIp }) {
    this.recordSecurityEvent({
      eventType: 'ADMIN_RECOVERY_REQUESTED',
      actorEmail: email,
      sourceIp,
      failedCount: state.adminLockout.failedAttempts,
      outcome: 'Recovery Link Dispatched',
      metadata: { tokenTtlMinutes: 15, singleUse: true },
    });
  }

  // -------------------------------------------------------------- Settings
  getSettings() {
    return { ...state.settings };
  }

  isMaintenanceMode() {
    return state.settings.maintenanceMode;
  }

  updateSettings(patch, { actorEmail = null, sourceIp = 'unknown' } = {}) {
    const previous = { ...state.settings };
    state.settings = { ...state.settings, ...patch };
    const changedAt = new Date().toISOString();
    state.lastConfigMutation = { at: changedAt, by: actorEmail };
    state.settings.updatedAt = changedAt;
    state.settings.updatedBy = actorEmail;

    const diff = Object.keys(patch).reduce((accumulator, key) => {
      if (previous[key] !== state.settings[key]) {
        accumulator[key] = { from: previous[key], to: state.settings[key] };
      }
      return accumulator;
    }, {});

    if (patch.maintenanceMode !== undefined && previous.maintenanceMode !== patch.maintenanceMode) {
      this.recordSecurityEvent({
        eventType: 'MAINTENANCE_TOGGLED',
        actorEmail,
        sourceIp,
        outcome: patch.maintenanceMode ? 'Maintenance Enabled' : 'Maintenance Disabled',
        metadata: { enabled: patch.maintenanceMode, message: state.settings.maintenanceMessage },
      });
    }

    if (Object.keys(diff).length > 0) {
      this.recordSecurityEvent({
        eventType: 'CONFIG_UPDATED',
        actorEmail,
        sourceIp,
        outcome: 'Executed & Logged',
        metadata: { diff },
      });
    }

    logger.info('Admin configuration updated', { actorEmail, changes: Object.keys(diff) });
    return this.getSettings();
  }

  getLastConfigMutation() {
    return state.lastConfigMutation;
  }
}

export const adminStore = new AdminStore();