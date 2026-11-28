import { get, post } from './api.client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isMockAuth = !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your_google_client_id');

const MOCK_USER = {
  id: 'mock_google_id_123456789',
  email: 'user@fazaldataconverter.com',
  name: 'Demo Registered User',
  avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User',
  role: 'registered',
};

/**
 * Auth API service.
 * Mock mode stays until Google OAuth wiring lands (Phase 5).
 */
export const authApi = {
  googleLogin: async () => {
    if (isMockAuth) {
      window.sessionStorage.setItem('fdc-user', JSON.stringify(MOCK_USER));
      return { success: true, user: MOCK_USER, isNewUser: true };
    }
    window.location.href = '/api/auth/google';
  },

  getCurrentUser: async () => {
    if (isMockAuth) {
      const stored = window.sessionStorage.getItem('fdc-user');
      return stored
        ? { success: true, user: JSON.parse(stored) }
        : { success: false, user: null };
    }
    try {
      const res = await get('/auth/me');
      return { success: true, user: res.user || null };
    } catch {
      return { success: false, user: null };
    }
  },

  logout: async () => {
    window.sessionStorage.removeItem('fdc-user');
    if (!isMockAuth) {
      await post('/auth/logout');
    }
    return { success: true };
  },
};