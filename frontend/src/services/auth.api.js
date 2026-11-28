import { get, post } from './api.client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isMockAuth = !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your_google_client_id');

/**
 * Auth API service.
 * Dev mode uses the backend's simulated Google flow so a real session cookie exists.
 * Real Google Identity Services wiring lands in Phase 5.
 */
export const authApi = {
  googleLogin: async () => {
    if (!isMockAuth) {
      window.location.href = '/api/auth/google';
      return { success: false };
    }
    const res = await post('/auth/google', { credential: 'dev-mock-credential' });
    if (res?.success && res.user) {
      window.sessionStorage.setItem('fdc-user', JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
    return { success: false };
  },

  adminLogin: async (email, password) => {
    const res = await post('/auth/admin/login', { email, password });
    if (res?.success && res.user) {
      window.sessionStorage.setItem('fdc-user', JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
    return { success: false };
  },

  getCurrentUser: async () => {
    try {
      const res = await get('/auth/me');
      if (res?.authenticated && res.user) {
        return { success: true, user: res.user };
      }
    } catch {
      // Backend unreachable: fall back to the cached dev session below.
    }
    const stored = window.sessionStorage.getItem('fdc-user');
    return stored
      ? { success: true, user: JSON.parse(stored) }
      : { success: false, user: null };
  },

  logout: async () => {
    window.sessionStorage.removeItem('fdc-user');
    try {
      await post('/auth/logout');
    } catch {
      // Session cookie expires on its own when the backend is unreachable.
    }
    return { success: true };
  },
};