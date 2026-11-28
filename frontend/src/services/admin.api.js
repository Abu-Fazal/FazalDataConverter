import { get, post, put, del, getFile } from './api.client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '' && value !== 'all') search.set(key, value);
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

async function download(endpoint, fallbackName) {
  const { blob, filename } = await getFile(endpoint);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || fallbackName;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { filename: filename || fallbackName, sizeBytes: blob.size };
}

export const adminApi = {
  getDashboard: async () => {
    const res = await get('/admin/dashboard');
    return res.data;
  },

  getSystem: async () => {
    const res = await get('/admin/system');
    return res.data;
  },

  getUsers: async (filters = {}) => await get(`/admin/users${queryString(filters)}`),

  getUser: async (userId) => {
    const res = await get(`/admin/users/${encodeURIComponent(userId)}`);
    return res.data;
  },

  suspendUser: async (userId, reason = '') => {
    const res = await post(`/admin/users/${encodeURIComponent(userId)}/suspend`, { reason });
    return res;
  },

  reactivateUser: async (userId) => {
    const res = await post(`/admin/users/${encodeURIComponent(userId)}/reactivate`, {});
    return res;
  },

  deleteUser: async (userId, confirmation) => {
    const res = await del(`/admin/users/${encodeURIComponent(userId)}`, { confirmation });
    return res;
  },

  exportUsers: (filters = {}) =>
    download(`/admin/users/export${queryString(filters)}`, 'fazal-users.csv'),

  getConversions: async (filters = {}) => await get(`/admin/conversions${queryString(filters)}`),

  getConversion: async (jobId) => {
    const res = await get(`/admin/conversions/${encodeURIComponent(jobId)}`);
    return res.data;
  },

  getFailures: async (filters = {}) => await get(`/admin/failures${queryString(filters)}`),

  exportConversions: (filters = {}) =>
    download(`/admin/conversions/export${queryString(filters)}`, 'fazal-conversions.csv'),

  getSecurityLogs: async (filters = {}) => await get(`/admin/logs/security${queryString(filters)}`),

  exportSecurityLogs: (filters = {}) =>
    download(`/admin/logs/security/export${queryString(filters)}`, 'fazal-security-logs.csv'),

  getConfig: async () => {
    const res = await get('/admin/config');
    return res.data;
  },

  saveConfig: async (settings) => {
    const res = await put('/admin/config', settings);
    return res.data;
  },

  setMaintenance: async (enabled, message) => {
    const res = await post('/admin/config/maintenance', {
      enabled,
      ...(message ? { message } : {}),
      consent: true,
    });
    return res.data;
  },

  resetConfig: async () => {
    const res = await post('/admin/config/reset', { consent: true });
    return res.data;
  },
};

export { queryString };