import { get, post, del } from './api.client';
import { API_BASE } from './apiBase';

function triggerDownload(url) {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const historyApi = {
  list: () => get('/jobs'),

  downloadConverted: (jobId) => triggerDownload(`${API_BASE}/jobs/download/${encodeURIComponent(jobId)}`),

  downloadOriginal: (jobId) => triggerDownload(`${API_BASE}/jobs/original/${encodeURIComponent(jobId)}`),

  deleteOriginal: (jobId) => del(`/jobs/${encodeURIComponent(jobId)}/original`),

  deleteOutput: (jobId) => del(`/jobs/${encodeURIComponent(jobId)}/output`),

  deleteEntry: (jobId) => del(`/jobs/${encodeURIComponent(jobId)}`),

  clearHistory: () => del('/jobs'),

  cancel: (jobId) => post(`/jobs/cancel/${encodeURIComponent(jobId)}`),
};