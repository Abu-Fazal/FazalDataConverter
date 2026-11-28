import { apiClient } from './api.client';

/**
 * Auth API service (Chunk C).
 * API calls for authentication endpoints.
 */
export const authApi = {
  /**
   * Google OAuth login
   */
  googleLogin: async () => {
    // In dev mode, simulate login
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id')) {
      return {
        success: true,
        user: {
          id: 'mock_google_id_123456789',
          email: 'user@fazaldataconverter.com',
          name: 'Demo Registered User',
          avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User',
          role: 'registered',
        },
        isNewUser: true,
      };
    }

    // Production: redirect to OAuth endpoint
    // The backend handles the OAuth flow
    window.location.href = '/api/auth/google';
  },

  /**
   * Check current user session
   */
  getCurrentUser: async () => {
    // In dev mode with mock
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id')) {
      return {
        success: true,
        user: {
          id: 'mock_google_id_123456789',
          email: 'user@fazaldataconverter.com',
          name: 'Demo Registered User',
          avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User',
          role: 'registered',
        },
      };
    }

    // Production: fetch from API
    // return await apiClient.get('/api/auth/me');
    return { success: false, user: null };
  },

  /**
   * Logout
   */
  logout: async () => {
    // In dev mode
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id')) {
      // Clear any mock session
      window.sessionStorage.removeItem('fdc-user');
      return { success: true };
    }

    // Production: call backend logout
    // await apiClient.post('/api/auth/logout');
    window.sessionStorage.removeItem('fdc-user');
    return { success: true };
  },
};