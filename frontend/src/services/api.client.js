/**
 * API client for FazalDataConverter frontend (Chunk B).
 * Unified API client per TRD §11.2 using native Fetch API.
 * All requests go through this single instance.
 */

import { API_BASE } from './apiBase';

function buildError(response, errorData) {
  const error = new Error(errorData.message || `Request failed with status ${response.status}`);
  error.status = response.status;
  error.data = errorData;
  return error;
}

async function readErrorData(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Fetch with error handling and session support
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    credentials: 'include', // Send cookies (session)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw buildError(response, await readErrorData(response));
    }
    return await response.json();
  } catch (error) {
    if (error.status) throw error;
    throw new Error(error.message || 'Network error - could not reach server');
  }
}

/**
 * GET request helper
 */
export const get = (endpoint, options = {}) => fetchApi(endpoint, { ...options, method: 'GET' });

/**
 * POST request helper
 */
export const post = (endpoint, data = {}, options = {}) => {
  return fetchApi(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * PUT request helper
 */
export const put = (endpoint, data = {}, options = {}) =>
  fetchApi(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined });

/**
 * DELETE request helper
 */
export const del = (endpoint, data = undefined, options = {}) =>
  fetchApi(endpoint, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });

/**
 * Binary download helper for CSV reports (PRD §8.4).
 * Returns the blob plus the server-provided filename.
 */
export async function getFile(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
  if (!response.ok) {
    throw buildError(response, await readErrorData(response));
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);

  return {
    blob: await response.blob(),
    filename: match ? match[1] : 'export.csv',
  };
}