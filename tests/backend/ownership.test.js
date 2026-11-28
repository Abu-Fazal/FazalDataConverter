import { requireOwnership, identifyUser, requireJobOwnership } from '../../backend/src/middlewares/ownership.js';
import { jobManager } from '../../backend/src/services/jobManager.js';

/**
 * Unit tests for Chunk 4.3 — Server-Side Ownership Validation.
 * No database connection is required (jobManager is in-memory).
 */

function mockReq(sessionUser = null, params = {}, body = {}) {
  const isAuthenticated = !!sessionUser;
  return {
    session: sessionUser ? { user: sessionUser } : {},
    params,
    body,
    originalUrl: '/test',
    // Properties normally attached by identifyUser() middleware
    isAuthenticated,
    userId: sessionUser ? String(sessionUser.id) : null,
    userRole: sessionUser ? (sessionUser.role || 'registered') : 'guest',
  };
}

function mockRes() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  return { status, json };
}

beforeEach(() => {
  jobManager.jobs.clear();
  vi.clearAllMocks();
});

describe('identifyUser', () => {
  it('attaches registered user identity from session', () => {
    const req = mockReq({ id: 'user_123', email: 'a@b.com', role: 'registered' });
    const res = mockRes();
    const next = vi.fn();

    identifyUser(req, res, next);

    expect(req.userId).toBe('user_123');
    expect(req.userRole).toBe('registered');
    expect(req.isAuthenticated).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('defaults to guest identity when no session user exists', () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    identifyUser(req, res, next);

    expect(req.userId).toBeNull();
    expect(req.userRole).toBe('guest');
    expect(req.isAuthenticated).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireOwnership', () => {
  const ownerGetter = (req) => req.body.userId;

  it('returns 401 when not authenticated', () => {
    const req = mockReq(null, {}, { userId: 'user_123' });
    const res = mockRes();
    const next = vi.fn();

    requireOwnership(ownerGetter)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'UNAUTHORIZED' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when resource ownerId does not match session userId', () => {
    const req = mockReq({ id: 'user_a', role: 'registered' }, {}, { userId: 'user_b' });
    const res = mockRes();
    const next = vi.fn();

    requireOwnership(ownerGetter)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when ownerId matches session userId', () => {
    const req = mockReq({ id: 'user_a', role: 'registered' }, {}, { userId: 'user_a' });
    const res = mockRes();
    const next = vi.fn();

    requireOwnership(ownerGetter)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('bypasses ownership for admin role', () => {
    const req = mockReq({ id: 'admin_1', role: 'admin' }, {}, { userId: 'someone_else' });
    const res = mockRes();
    const next = vi.fn();

    requireOwnership(ownerGetter)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when owner identifier cannot be resolved', () => {
    const req = mockReq({ id: 'user_a', role: 'registered' }, {}, {});
    const res = mockRes();
    const next = vi.fn();

    requireOwnership(ownerGetter)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireJobOwnership', () => {
  it('returns 404 when job does not exist', () => {
    const req = mockReq({ id: 'user_a', role: 'registered' }, { jobId: 'missing' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows the job owner to access their job', () => {
    jobManager.createJob('job_1', { userId: 'user_a', originalFileName: 'sheet.xlsx' });
    const req = mockReq({ id: 'user_a', role: 'registered' }, { jobId: 'job_1' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a different registered user from accessing the job', () => {
    jobManager.createJob('job_1', { userId: 'user_a', originalFileName: 'sheet.xlsx' });
    const req = mockReq({ id: 'user_b', role: 'registered' }, { jobId: 'job_1' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated access to a registered user job', () => {
    jobManager.createJob('job_1', { userId: 'user_a', originalFileName: 'sheet.xlsx' });
    const req = mockReq(null, { jobId: 'job_1' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admin to access any job', () => {
    jobManager.createJob('job_1', { userId: 'user_a', originalFileName: 'sheet.xlsx' });
    const req = mockReq({ id: 'admin_1', role: 'admin' }, { jobId: 'job_1' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a guest session to access a guest-owned job', () => {
    jobManager.createJob('job_guest', { userId: null, originalFileName: 'sheet.xlsx' });
    const req = mockReq(null, { jobId: 'job_guest' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks an authenticated user from accessing a guest-owned job', () => {
    jobManager.createJob('job_guest', { userId: null, originalFileName: 'sheet.xlsx' });
    const req = mockReq({ id: 'user_a', role: 'registered' }, { jobId: 'job_guest' });
    const res = mockRes();
    const next = vi.fn();

    requireJobOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
