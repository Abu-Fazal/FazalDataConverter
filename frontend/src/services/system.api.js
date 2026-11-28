import { get } from './api.client';
import { post } from './api.client';

export const systemApi = {
  getStatus: async () => {
    try {
      const res = await get('/system/status');
      return res.data;
    } catch {
      return null;
    }
  },

  getLockoutStatus: async () => {
    const res = await get('/auth/admin/lockout-status');
    return res;
  },

  requestAdminRecovery: async (email) => {
    const res = await post('/auth/admin/recovery', { email });
    return res;
  },
};